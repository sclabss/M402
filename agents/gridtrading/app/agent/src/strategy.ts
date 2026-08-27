import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import { bscTestnet } from "viem/chains";
import { getWallet } from "@bnbagent/studio-runtime/wallet";

/**
 * Real grid-trading execution. This is the piece that was missing across
 * eight sessions of infrastructure work -- everything up to this file
 * could describe what an agent should do; nothing could make it actually
 * swap. Read AUDIT.md before touching this file if that context is missing.
 *
 * Addresses below are independently verified (BscScan-fetched source /
 * verified-contract pages this session), not carried over from training
 * data or guessed:
 *
 * - PANCAKE_V3_SMART_ROUTER: confirmed BSC-TESTNET-specific
 *   (bscscan's testnet explorer entry explicitly labels it
 *   "Bsc Testnet · opBNB Testnet"). The mainnet address is different
 *   (0x13f4EA83...) -- do not swap these between networks.
 * - PANCAKE_V3_FACTORY: found via BscScan, same address appeared on an
 *   Etherscan lookup too, consistent with PancakeSwap's known pattern of
 *   deterministic CREATE2 factory deployment across chains -- plausible,
 *   not independently confirmed testnet-specific the way the router was.
 *   Worth a direct bytecode check before trusting this with real funds.
 *
 * The swap function ABI (exactInputSingle) is the standard Uniswap-V3-
 * family interface, which PancakeSwap's own docs describe their V3
 * router as implementing -- a well-established, stable shape, but not
 * independently re-derived from PancakeSwap's own published ABI JSON
 * this session. Cross-check against developer.pancakeswap.finance before
 * this ever touches a funded wallet.
 */

export const PANCAKE_V3_SMART_ROUTER: Address = "0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86";
export const PANCAKE_V3_FACTORY: Address = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";

const EXACT_INPUT_SINGLE_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        internalType: "struct IV3SwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const FACTORY_GET_POOL_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// slot0() is a standard, stable Uniswap-V3-family pool read -- high
// confidence independent of this session's PancakeSwap-specific checks.
const POOL_SLOT0_ABI = [
  parseAbiItem(
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ),
] as const;

const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface GridConfig {
  tokenA: Address; // e.g. WBNB
  tokenB: Address; // e.g. a stable
  fee: number; // pool fee tier, e.g. 500 = 0.05%
  lowerPrice: number; // tokenB per tokenA, grid floor
  upperPrice: number; // tokenB per tokenA, grid ceiling
  gridLevels: number; // number of grid lines between floor and ceiling
  orderSizeWei: bigint; // size per grid trade, in tokenA units
}

export interface GridDecision {
  action: "buy" | "sell" | "hold";
  currentPrice: number;
  nearestLevel: number;
  reason: string;
}

function publicClient() {
  const rpcUrl = process.env.BSC_RPC_URL;
  return createPublicClient({
    chain: bscTestnet,
    transport: rpcUrl ? http(rpcUrl) : http(),
  });
}

/** sqrtPriceX96 -> a plain tokenB-per-tokenA price, assuming 18-decimal tokens on both sides. */
function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
  const Q96 = 2 ** 96;
  const ratio = Number(sqrtPriceX96) / Q96;
  return ratio * ratio;
}

export async function getCurrentPrice(config: GridConfig): Promise<number> {
  const client = publicClient();
  const pool = await client.readContract({
    address: PANCAKE_V3_FACTORY,
    abi: FACTORY_GET_POOL_ABI,
    functionName: "getPool",
    args: [config.tokenA, config.tokenB, config.fee],
  });
  if (pool === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      `No PancakeSwap V3 pool found for this token pair + fee tier (${config.fee}). Check the addresses and fee, or that liquidity exists on testnet.`
    );
  }
  const [sqrtPriceX96] = await client.readContract({
    address: pool,
    abi: POOL_SLOT0_ABI,
    functionName: "slot0",
  });
  return sqrtPriceX96ToPrice(sqrtPriceX96);
}

/**
 * Pure decision function -- given a price and the grid config, what (if
 * anything) should happen. Deliberately separate from execution so the
 * logic itself can be reasoned about / tested without touching a chain.
 *
 * Simplified on purpose for a first real pass: tracks the nearest grid
 * level and always proposes the same order size, with no in-memory or
 * persisted record of which levels are already filled. A real grid bot
 * needs that state (so it doesn't re-buy a level it's already holding) --
 * flagged here rather than silently pretended away.
 */
export function decideGridAction(config: GridConfig, currentPrice: number): GridDecision {
  if (currentPrice < config.lowerPrice || currentPrice > config.upperPrice) {
    return {
      action: "hold",
      currentPrice,
      nearestLevel: currentPrice < config.lowerPrice ? config.lowerPrice : config.upperPrice,
      reason: "Price is outside the configured grid range.",
    };
  }

  const step = (config.upperPrice - config.lowerPrice) / config.gridLevels;
  const levelIndex = Math.round((currentPrice - config.lowerPrice) / step);
  const nearestLevel = config.lowerPrice + levelIndex * step;
  const distance = currentPrice - nearestLevel;

  // Below its level: price dipped, buy the dip. Above: sell into strength.
  // A tight epsilon avoids flapping right at a grid line.
  const epsilon = step * 0.05;
  if (distance < -epsilon) {
    return { action: "buy", currentPrice, nearestLevel, reason: `Price ${currentPrice} is below grid level ${nearestLevel}.` };
  }
  if (distance > epsilon) {
    return { action: "sell", currentPrice, nearestLevel, reason: `Price ${currentPrice} is above grid level ${nearestLevel}.` };
  }
  return { action: "hold", currentPrice, nearestLevel, reason: "Price is at the grid level; nothing to do this check." };
}

/**
 * Executes one grid trade for real. Goes through the same wallet the
 * agent already holds for ERC-8183 (getWallet()), via the wallet
 * provider's own makeExecutor()/execute(Intent) seam -- the same general
 * write path the SDK uses internally for its own on-chain operations
 * (confirmed by reading @bnbagent/sdk's compiled source this session,
 * not assumed from its type declarations alone).
 */
export async function executeGridTrade(
  config: GridConfig,
  decision: GridDecision
): Promise<{ txHash: string } | null> {
  if (decision.action === "hold") return null;

  const client = publicClient();
  const wallet = getWallet();
  const executor = wallet.makeExecutor({ client, paymaster: null, receiptTimeout: null });

  const [tokenIn, tokenOut] = decision.action === "buy" ? [config.tokenB, config.tokenA] : [config.tokenA, config.tokenB];

  // Approve is its own transaction on most ERC-20s (no permit assumed
  // here) -- real cost, real step, not folded away.
  await executor.execute({
    call: { address: tokenIn, abi: ERC20_APPROVE_ABI, functionName: "approve", args: [PANCAKE_V3_SMART_ROUTER, config.orderSizeWei] },
    description: `Approve ${tokenIn} for the PancakeSwap V3 router`,
  });

  const result = await executor.execute({
    call: {
      address: PANCAKE_V3_SMART_ROUTER,
      abi: EXACT_INPUT_SINGLE_ABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          fee: config.fee,
          recipient: wallet.address,
          amountIn: config.orderSizeWei,
          amountOutMinimum: 0n, // TODO: real slippage protection before this touches real funds
          sqrtPriceLimitX96: 0n,
        },
      ],
    },
    description: `Grid ${decision.action} at level ${decision.nearestLevel}: ${decision.reason}`,
  });

  return { txHash: result.transactionHash };
}
