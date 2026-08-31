import { createPublicClient, http, formatUnits, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import { getWallet } from "@bnbagent/studio-runtime/wallet";

/**
 * Real health-factor monitoring against Venus Protocol (BNB Chain's
 * dominant native lending market) -- one lending venue for a first real
 * pass, not Venus + Aave V3 simultaneously. yieldoptimization is the
 * category that genuinely needs multiple venues compared at once; a
 * health-factor monitor delivers real value watching one.
 *
 * Confidence levels, stated plainly rather than uniformly:
 * - VENUS_COMPTROLLER_TESTNET: single-source verified (testnet.bscscan.com
 *   shows this as "Venus's Comptroller Contract" with real source code) --
 *   real but not cross-referenced against a second independent source the
 *   way gridtrading's SmartRouter was. Worth a second check before funds
 *   that matter depend on it.
 * - getAccountLiquidity's signature: high confidence -- this is the
 *   standard Compound-fork interface, and Venus's own docs reference this
 *   exact function name for exactly this purpose (account liquidity /
 *   liquidation risk).
 * - IVToken (repayBorrow, borrowBalanceCurrent, etc.): confirmed via TWO
 *   independent testnet.bscscan.com verified contract pages showing the
 *   identical modern interface -- higher confidence than the single-source
 *   Comptroller address above.
 */

export const VENUS_COMPTROLLER_TESTNET: Address = "0x3aB9BF48B26935136Bd5b76eD597294E35F7Fe3B";

const COMPTROLLER_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getAccountLiquidity",
    outputs: [
      { internalType: "uint256", name: "error", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "shortfall", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Confirmed via two independent testnet.bscscan.com verified contracts
// (0x34Bf4653...E6ecf and 0x6e082395...ade29681) showing this identical
// modern (solidity ^0.8.6) interface.
const VTOKEN_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "repayAmount", type: "uint256" }],
    name: "repayBorrow",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "borrowBalanceCurrent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
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

export interface HealthFactorConfig {
  monitoredAccount: Address; // the position being watched -- the agent's own wallet, or a user's, per deployment
  liquidationBufferPct: number; // e.g. 15 = act once liquidity buffer is within 15% of shortfall territory
  repayVTokenAddress: Address | null; // which market to repay into if action is needed; null = read-only monitoring
  repayUnderlyingAddress: Address | null; // the vToken's underlying ERC-20, needed to approve() before repaying
  repayAmountWei: bigint | null;
}

export interface HealthCheckResult {
  action: "safe" | "at_risk" | "shortfall" | "read_only";
  liquidityUsdScaled: string; // raw uint256 from the Comptroller, still 1e18-scaled -- see note in checkHealth()
  shortfallUsdScaled: string;
  reason: string;
}

function publicClient() {
  const rpcUrl = process.env.BSC_RPC_URL;
  return createPublicClient({ chain: bscTestnet, transport: rpcUrl ? http(rpcUrl) : http() });
}

/**
 * Reads real account liquidity from Venus. Deliberately does NOT force
 * this into an Aave-style single "health factor >= 1" number -- Venus's
 * own model is shortfall-based (you either have spare liquidity or you
 * have a shortfall), and computing a true normalized ratio needs total
 * borrowed value in USD, which getAccountLiquidity alone doesn't return
 * (would need iterating entered markets + oracle prices, a separate
 * multi-call aggregation not implemented this pass). Reporting Venus's
 * real signal honestly instead of a derived number dressed up to look
 * like Aave's.
 */
export async function checkHealth(config: HealthFactorConfig): Promise<HealthCheckResult> {
  const client = publicClient();
  const [error, liquidity, shortfall] = await client.readContract({
    address: VENUS_COMPTROLLER_TESTNET,
    abi: COMPTROLLER_ABI,
    functionName: "getAccountLiquidity",
    args: [config.monitoredAccount],
  });

  if (error !== 0n) {
    return {
      action: "read_only",
      liquidityUsdScaled: "0",
      shortfallUsdScaled: "0",
      reason: `Comptroller returned a non-zero error code (${error}) -- not treating this as a real reading.`,
    };
  }

  if (shortfall > 0n) {
    return {
      action: "shortfall",
      liquidityUsdScaled: liquidity.toString(),
      shortfallUsdScaled: shortfall.toString(),
      reason: `Account already has a shortfall of ${formatUnits(shortfall, 18)} (oracle-scaled) -- liquidatable now, not just at risk.`,
    };
  }

  // No shortfall, but is the spare liquidity buffer thin? Without total
  // borrow value this is a rough proxy (liquidity itself, not a ratio) --
  // flagged as such, not presented as a precise percentage-to-liquidation.
  const liquidityEth = Number(formatUnits(liquidity, 18));
  const thin = liquidityEth > 0 && liquidityEth < config.liquidationBufferPct;
  return {
    action: thin ? "at_risk" : "safe",
    liquidityUsdScaled: liquidity.toString(),
    shortfallUsdScaled: "0",
    reason: thin
      ? `Spare liquidity (${liquidityEth.toFixed(4)}, oracle-scaled) is below the configured buffer -- worth protective action.`
      : `Spare liquidity (${liquidityEth.toFixed(4)}, oracle-scaled) looks comfortable.`,
  };
}

/**
 * Executes a protective repay if checkHealth() found real risk and a
 * repay target is configured. Same wallet.makeExecutor()/execute(Intent)
 * seam as every other agent's strategy.ts this project has built.
 */
export async function protectIfNeeded(
  config: HealthFactorConfig,
  check: HealthCheckResult
): Promise<{ txHashes: string[] } | null> {
  if (check.action !== "at_risk" && check.action !== "shortfall") return null;
  if (!config.repayVTokenAddress || !config.repayUnderlyingAddress || config.repayAmountWei === null) {
    return null; // risk detected, but no protective action configured -- honest no-op, not a silent failure
  }

  const client = publicClient();
  const wallet = getWallet();
  const executor = wallet.makeExecutor({ client, paymaster: null, receiptTimeout: null });
  const txHashes: string[] = [];

  const approve = await executor.execute({
    call: {
      address: config.repayUnderlyingAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [config.repayVTokenAddress, config.repayAmountWei],
    },
    description: "Approve underlying for Venus repayBorrow",
  });
  txHashes.push(approve.transactionHash);

  // NOTE: repayBorrow repays the CALLER's own position. Protecting a
  // THIRD PARTY's position (the more realistic "protects lending
  // positions from liquidation" service model) needs repayBorrowBehalf --
  // a standard Compound-fork function, but not independently verified
  // against Venus's testnet contracts this session. Using the simpler,
  // verified repayBorrow here; repayBorrowBehalf is the real next step
  // before this monitors anyone's position but the agent's own.
  const repay = await executor.execute({
    call: {
      address: config.repayVTokenAddress,
      abi: VTOKEN_ABI,
      functionName: "repayBorrow",
      args: [config.repayAmountWei],
    },
    description: `Protective repay: ${check.reason}`,
  });
  txHashes.push(repay.transactionHash);

  return { txHashes };
}
