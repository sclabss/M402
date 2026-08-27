import { Contract, JsonRpcProvider } from 'ethers';
import { COMMERCE_ABI, POLICY_ABI } from './abi';
import { CONTRACTS } from './contracts';

/**
 * Adapted from bnb-chain/stockanalyst-agent-demo's ERC8183Buyer.getDeliverableUrl().
 * Needs a SEPARATE archive/log RPC, not the wallet's own provider -- BSC
 * testnet's standard data-seed nodes reject eth_getLogs. There's no
 * reliable public default to fall back to (the official demo doesn't ship
 * one either, for the same reason), so this requires
 * NEXT_PUBLIC_BSC_LOG_RPC_URL to be set explicitly rather than silently
 * degrading to a provider that will just fail.
 */
function getLogProvider(): JsonRpcProvider {
  const url = process.env.NEXT_PUBLIC_BSC_LOG_RPC_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_BSC_LOG_RPC_URL is not set. Standard BSC testnet data-seed nodes block eth_getLogs, so reading a deliverable back needs an archive-capable RPC (e.g. Ankr, QuickNode, dRPC) configured here.'
    );
  }
  return new JsonRpcProvider(url, { chainId: CONTRACTS.CHAIN_ID, name: 'bnb-testnet' });
}

async function findSubmitBlock(
  commerceLog: Contract,
  jobId: bigint,
  currentBlock: number,
  fromBlockHint?: number
): Promise<number | null> {
  const filter = commerceLog.filters.JobSubmitted(jobId);
  const fromBlock = fromBlockHint ?? Math.max(0, currentBlock - 5000);
  try {
    const logs = await commerceLog.queryFilter(filter, fromBlock, currentBlock);
    if (logs.length > 0) return logs[0].blockNumber;
  } catch {
    // archive RPC unavailable or query too wide -- caller decides whether to retry
  }
  return null;
}

/**
 * Returns the deliverable URL once the job has actually been submitted
 * on-chain, or null if it hasn't (not an error -- the agent may just still
 * be working). fundBlock, if you have it from fundJob()'s receipt, narrows
 * the search window considerably.
 */
export async function getDeliverableUrl(jobId: bigint, fundBlock?: number): Promise<string | null> {
  const logProvider = getLogProvider();
  const commerceLog = new Contract(CONTRACTS.COMMERCE, COMMERCE_ABI, logProvider);
  const policyLog = new Contract(CONTRACTS.POLICY, POLICY_ABI, logProvider);

  const currentBlock = await logProvider.getBlockNumber();
  const submitBlock = await findSubmitBlock(commerceLog, jobId, currentBlock, fundBlock);
  if (submitBlock === null) return null;

  const fromBlock = Math.max(0, submitBlock - 20);
  const toBlock = submitBlock + 20;

  const filter = policyLog.filters.JobInitialised(jobId);
  let logs;
  try {
    logs = await policyLog.queryFilter(filter, fromBlock, toBlock);
  } catch {
    return null;
  }
  if (logs.length === 0) return null;

  const optParamsHex = (logs[0] as any).args?.optParams as string | undefined;
  if (!optParamsHex) return null;

  try {
    const hex = optParamsHex.startsWith('0x') ? optParamsHex.slice(2) : optParamsHex;
    const bytes = Buffer.from(hex, 'hex');
    const parsed = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    const deliverableUrl = parsed['deliverable_url'];
    return typeof deliverableUrl === 'string' ? deliverableUrl : null;
  } catch {
    return null;
  }
}

/**
 * Polls every `intervalMs` up to `maxAttempts` times. The agent works in the
 * background after notify_funded -- there's no push notification, so
 * polling (bounded, not infinite) is the honest way to surface this in a UI
 * rather than a spinner that waits forever.
 */
export async function pollForDeliverable(
  jobId: bigint,
  onAttempt?: (attempt: number, maxAttempts: number) => void,
  { intervalMs = 5000, maxAttempts = 12 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt, maxAttempts);
    const url = await getDeliverableUrl(jobId);
    if (url) return url;
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
