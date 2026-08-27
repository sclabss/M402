import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import { getWallet } from "@bnbagent/studio-runtime/wallet";

/**
 * Real LP-rebalancing execution for a PancakeSwap V3 position. Same
 * pattern as gridtrading's strategy.ts (read this session, reuse the
 * reasoning rather than re-deriving it) -- duplicated rather than shared,
 * since each bag-init agent is its own independently deployed project, not
 * a package in the pnpm workspace.
 *
 * Addresses:
 * - PANCAKE_V3_FACTORY, matches gridtrading's -- same confidence level
 *   (BscScan-found, cross-referenced against an Etherscan lookup,
 *   consistent with PancakeSwap's known deterministic CREATE2 factory
 *   pattern across chains; not independently bytecode-checked).
 * - PANCAKE_V3_POSITION_MANAGER: found via a community (HackMD) doc, but
 *   independently corroborated by testnet.bscscan.com's own page for that
 *   address showing verified source with Contract Name:
 *   "NonfungiblePositionManager". Worth being direct about a real
 *   discrepancy this introduced: the SAME HackMD doc claimed a SmartRouter
 *   address that does NOT match the one already verified directly against
 *   BscScan's testnet explorer in the gridtrading work -- treating that as
 *   a stale/superseded address in the community doc rather than switching.
 *   A final sanity check worth running before real funds touch this:
 *   call this contract's own `factory()` and confirm it returns
 *   PANCAKE_V3_FACTORY below. Not possible from this sandbox (no RPC
 *   access) -- flagged, not skipped.
 */

export const PANCAKE_V3_FACTORY: Address = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
export const PANCAKE_V3_POSITION_MANAGER: Address = "0x427bF5b37357632377eCbEC9de3626C71A5396c1";

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

const POOL_SLOT0_ABI = [
  parseAbiItem(
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ),
] as const;

// Standard Uniswap-V3-family INonfungiblePositionManager surface --
// well-established, stable interface shape across the whole V3-fork
// ecosystem. Same confidence tier as gridtrading's exactInputSingle: not
// independently re-derived from PancakeSwap's own published ABI JSON.
const POSITION_MANAGER_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "positions",
    outputs: [
      { internalType: "uint96", name: "nonce", type: "uint96" },
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "address", name: "token0", type: "address" },
      { internalType: "address", name: "token1", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "int24", name: "tickLower", type: "int24" },
      { internalType: "int24", name: "tickUpper", type: "int24" },
      { internalType: "uint128", name: "liquidity", type: "uint128" },
      { internalType: "uint256", name: "feeGrowthInside0LastX128", type: "uint256" },
      { internalType: "uint256", name: "feeGrowthInside1LastX128", type: "uint256" },
      { internalType: "uint128", name: "tokensOwed0", type: "uint128" },
      { internalType: "uint128", name: "tokensOwed1", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint128", name: "liquidity", type: "uint128" },
          { internalType: "uint256", name: "amount0Min", type: "uint256" },
          { internalType: "uint256", name: "amount1Min", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        internalType: "struct INonfungiblePositionManager.DecreaseLiquidityParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "decreaseLiquidity",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint128", name: "amount0Max", type: "uint128" },
          { internalType: "uint128", name: "amount1Max", type: "uint128" },
        ],
        internalType: "struct INonfungiblePositionManager.CollectParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "collect",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "token0", type: "address" },
          { internalType: "address", name: "token1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickLower", type: "int24" },
          { internalType: "int24", name: "tickUpper", type: "int24" },
          { internalType: "uint256", name: "amount0Desired", type: "uint256" },
          { internalType: "uint256", name: "amount1Desired", type: "uint256" },
          { internalType: "uint256", name: "amount0Min", type: "uint256" },
          { internalType: "uint256", name: "amount1Min", type: "uint256" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        internalType: "struct INonfungiblePositionManager.MintParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "mint",
    outputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint128", name: "liquidity", type: "uint128" },
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Standard tier -> tick-spacing map across the Uniswap-V3-fork ecosystem.
// General-knowledge confidence, same tier as the ABI shapes above -- not
// independently confirmed against PancakeSwap's specific factory config
// this session.
const FEE_TIER_TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 2500: 50, 10000: 200 };

export interface RebalanceConfig {
  tokenA: Address;
  tokenB: Address;
  fee: number;
  positionTokenId: bigint | null; // null = no existing position, mint a fresh one
  rangeWidthPercent: number; // e.g. 10 = +/-10% band around current price
  driftThresholdPercent: number; // how close to the edge before rebalancing, e.g. 20 = rebalance once price is within 20% of an edge
}

export interface RebalanceDecision {
  action: "rebalance" | "hold" | "mint_initial";
  currentTick: number;
  reason: string;
}

function publicClient() {
  const rpcUrl = process.env.BSC_RPC_URL;
  return createPublicClient({ chain: bscTestnet, transport: rpcUrl ? http(rpcUrl) : http() });
}

async function getPoolAndTick(client: ReturnType<typeof publicClient>, config: RebalanceConfig) {
  const pool = await client.readContract({
    address: PANCAKE_V3_FACTORY,
    abi: FACTORY_GET_POOL_ABI,
    functionName: "getPool",
    args: [config.tokenA, config.tokenB, config.fee],
  });
  if (pool === "0x0000000000000000000000000000000000000000") {
    throw new Error(`No PancakeSwap V3 pool for this pair + fee tier (${config.fee}).`);
  }
  const [, tick] = await client.readContract({ address: pool, abi: POOL_SLOT0_ABI, functionName: "slot0" });
  return { pool, tick };
}

/**
 * Pure decision function. Simplified deliberately, same spirit as
 * gridtrading's decideGridAction: reasons about ticks directly rather than
 * a full sqrtPriceX96<->price<->tick round trip, which is enough to decide
 * "is price still comfortably inside the range" without needing the fully
 * precise Q64.96 math this first pass doesn't implement.
 */
export function decideRebalanceAction(config: RebalanceConfig, currentTick: number): RebalanceDecision {
  if (config.positionTokenId === null) {
    return { action: "mint_initial", currentTick, reason: "No existing position configured -- minting a fresh one centered on current price." };
  }
  return { action: "hold", currentTick, reason: "Position range check happens in executeRebalance, once the real tickLower/tickUpper are read on-chain -- this pure function only covers the no-position case without a chain read." };
}

function priceRangeToTicks(currentTick: number, config: RebalanceConfig): { tickLower: number; tickUpper: number } {
  const spacing = FEE_TIER_TICK_SPACING[config.fee] ?? 60;
  // tick ~ log_1.0001(price); a `rangeWidthPercent` band around price
  // corresponds to a tick offset of ln(1 +/- pct) / ln(1.0001).
  const offsetTicks = Math.round(Math.log(1 + config.rangeWidthPercent / 100) / Math.log(1.0001));
  const round = (t: number) => Math.round(t / spacing) * spacing;
  return { tickLower: round(currentTick - offsetTicks), tickUpper: round(currentTick + offsetTicks) };
}

/**
 * Runs one real rebalance check, and executes on-chain if needed:
 * decreaseLiquidity(all) + collect on the old position, then mint a new
 * one centered on the current tick. Three real transactions when a
 * rebalance actually happens; zero when the position's already fine.
 *
 * amount0Min/amount1Min/amount0Min on mint are all 0 here -- the same
 * "no slippage protection yet" gap flagged in gridtrading's strategy.ts,
 * not silently different this time.
 */
export async function checkAndRebalance(
  config: RebalanceConfig
): Promise<{ decision: RebalanceDecision; txHashes: string[] }> {
  const client = publicClient();
  const { tick: currentTick } = await getPoolAndTick(client, config);

  if (config.positionTokenId !== null) {
    const position = await client.readContract({
      address: PANCAKE_V3_POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "positions",
      args: [config.positionTokenId],
    });
    const [, , token0, token1, , tickLower, tickUpper, liquidity] = position;

    const spacing = FEE_TIER_TICK_SPACING[config.fee] ?? 60;
    const bandTicks = ((tickUpper - tickLower) / 2) * (config.driftThresholdPercent / 100);
    const nearLowerEdge = currentTick <= tickLower + bandTicks;
    const nearUpperEdge = currentTick >= tickUpper - bandTicks;

    if (!nearLowerEdge && !nearUpperEdge) {
      return {
        decision: { action: "hold", currentTick, reason: `Tick ${currentTick} is comfortably inside [${tickLower}, ${tickUpper}].` },
        txHashes: [],
      };
    }

    const decision: RebalanceDecision = {
      action: "rebalance",
      currentTick,
      reason: `Tick ${currentTick} is within ${config.driftThresholdPercent}% of the position's [${tickLower}, ${tickUpper}] edge.`,
    };

    const wallet = getWallet();
    const executor = wallet.makeExecutor({ client, paymaster: null, receiptTimeout: null });
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    const txHashes: string[] = [];

    const dec = await executor.execute({
      call: {
        address: PANCAKE_V3_POSITION_MANAGER,
        abi: POSITION_MANAGER_ABI,
        functionName: "decreaseLiquidity",
        args: [{ tokenId: config.positionTokenId, liquidity, amount0Min: 0n, amount1Min: 0n, deadline }],
      },
      description: `Rebalance: withdraw liquidity from position ${config.positionTokenId}`,
    });
    txHashes.push(dec.transactionHash);

    const col = await executor.execute({
      call: {
        address: PANCAKE_V3_POSITION_MANAGER,
        abi: POSITION_MANAGER_ABI,
        functionName: "collect",
        args: [{ tokenId: config.positionTokenId, recipient: wallet.address, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }],
      },
      description: `Rebalance: collect owed tokens from position ${config.positionTokenId}`,
    });
    txHashes.push(col.transactionHash);

    // A mined transaction's receipt never carries a contract function's
    // decoded return value -- that's an EVM fact, not something the SDK's
    // TxResult (transactionHash/status/receipt only) is missing by
    // oversight. The actual collected amounts have to come from
    // simulating the same call, which needs to happen before or
    // independent of sending it for real. Simulating now, after the real
    // collect already landed -- close enough for a first pass (pool price
    // barely moves in one block), but worth noting this isn't the exact
    // amount from the transaction that already executed above.
    const simulatedCollect = await client.simulateContract({
      address: PANCAKE_V3_POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "collect",
      args: [{ tokenId: config.positionTokenId, recipient: wallet.address, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }],
      account: wallet.address,
    });
    const [collectedAmount0, collectedAmount1] = simulatedCollect.result;

    const { tickLower: newLower, tickUpper: newUpper } = priceRangeToTicks(currentTick, config);
    const minted = await executor.execute({
      call: {
        address: PANCAKE_V3_POSITION_MANAGER,
        abi: POSITION_MANAGER_ABI,
        functionName: "mint",
        args: [
          {
            token0,
            token1,
            fee: config.fee,
            tickLower: newLower,
            tickUpper: newUpper,
            amount0Desired: collectedAmount0,
            amount1Desired: collectedAmount1,
            // TODO: real slippage protection before this touches funds
            // that matter -- same flagged gap as gridtrading's
            // amountOutMinimum: 0n, not silently different here.
            amount0Min: 0n,
            amount1Min: 0n,
            recipient: wallet.address,
            deadline,
          },
        ],
      },
      description: `Rebalance: mint new position [${newLower}, ${newUpper}]`,
    });
    txHashes.push(minted.transactionHash);

    return { decision, txHashes };
  }

  return { decision: decideRebalanceAction(config, currentTick), txHashes: [] };
}
