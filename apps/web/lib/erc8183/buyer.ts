import { BrowserProvider, Contract, parseUnits, type Eip1193Provider } from 'ethers';
import { COMMERCE_ABI, ERC20_ABI, ROUTER_ABI } from './abi';
import { CONTRACTS } from './contracts';

export interface FundJobParams {
  providerAddress: string;
  description: string;
  budgetU: string; // decimal string, e.g. "0.10"
  deadlineSeconds?: number;
}

export interface FundJobResult {
  jobId: bigint;
  createTx: string;
  registerTx: string;
  setBudgetTx: string;
  approveTx: string;
  fundTx: string;
}

export type FundStep =
  | 'create-job'
  | 'register-job'
  | 'set-budget'
  | 'approve'
  | 'fund'
  | 'done';

export interface FundProgress {
  step: FundStep;
  status: 'pending' | 'confirmed';
  txHash?: string;
}

/**
 * Adapted from bnb-chain/stockanalyst-agent-demo's ERC8183Buyer.buy() --
 * same 5-step flow (createJob -> registerJob -> setBudget -> approve ->
 * fund), same contracts, same ABI calls. The one real change: that demo
 * holds a server-side private key (ethers.Wallet); this holds the buyer's
 * own connected wallet (ethers.BrowserProvider over window.ethereum), since
 * a marketplace can't and shouldn't sign on a human buyer's behalf.
 *
 * Each of these 5 calls is a separate transaction the wallet will prompt
 * for -- that's real, not a UX bug to hide. `onProgress` lets the UI show
 * "2 of 5, waiting for your wallet" instead of one opaque spinner.
 */
export async function fundJob(
  ethereum: Eip1193Provider,
  params: FundJobParams,
  onProgress?: (progress: FundProgress) => void
): Promise<FundJobResult> {
  const { providerAddress, description, budgetU, deadlineSeconds = 7200 } = params;

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  const commerce = new Contract(CONTRACTS.COMMERCE, COMMERCE_ABI, signer);
  const router = new Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
  const uToken = new Contract(CONTRACTS.U_TOKEN, ERC20_ABI, signer);

  const rawBudget = parseUnits(budgetU, 18);
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds + 24 * 60 * 60);

  // 1. createJob
  onProgress?.({ step: 'create-job', status: 'pending' });
  const createTx = await commerce.createJob(
    providerAddress,
    CONTRACTS.ROUTER,
    expiredAt,
    description,
    CONTRACTS.ROUTER
  );
  const createReceipt = await createTx.wait();
  const jobId = parseJobIdFromReceipt(createReceipt, commerce);
  onProgress?.({ step: 'create-job', status: 'confirmed', txHash: createReceipt.hash });

  // 2. registerJob (bind OptimisticPolicy on the Router)
  onProgress?.({ step: 'register-job', status: 'pending' });
  const regTx = await router.registerJob(jobId, CONTRACTS.POLICY);
  const regReceipt = await regTx.wait();
  onProgress?.({ step: 'register-job', status: 'confirmed', txHash: regReceipt.hash });

  // 3. setBudget
  onProgress?.({ step: 'set-budget', status: 'pending' });
  const budgetTx = await commerce.setBudget(jobId, rawBudget, '0x');
  const budgetReceipt = await budgetTx.wait();
  onProgress?.({ step: 'set-budget', status: 'confirmed', txHash: budgetReceipt.hash });

  // 4. ERC-20 approve (U token -> Commerce contract)
  onProgress?.({ step: 'approve', status: 'pending' });
  const approveTx = await uToken.approve(CONTRACTS.COMMERCE, rawBudget);
  const approveReceipt = await approveTx.wait();
  onProgress?.({ step: 'approve', status: 'confirmed', txHash: approveReceipt.hash });

  // 5. fund (escrow deposit)
  onProgress?.({ step: 'fund', status: 'pending' });
  const fundTx = await commerce.fund(jobId, rawBudget, '0x');
  const fundReceipt = await fundTx.wait();
  onProgress?.({ step: 'fund', status: 'confirmed', txHash: fundReceipt.hash });
  onProgress?.({ step: 'done', status: 'confirmed' });

  return {
    jobId,
    createTx: createReceipt.hash,
    registerTx: regReceipt.hash,
    setBudgetTx: budgetReceipt.hash,
    approveTx: approveReceipt.hash,
    fundTx: fundReceipt.hash,
  };
}

function parseJobIdFromReceipt(receipt: { logs: readonly unknown[] }, commerce: Contract): bigint {
  for (const log of receipt.logs as any[]) {
    if ((log.address as string).toLowerCase() !== CONTRACTS.COMMERCE.toLowerCase()) continue;
    try {
      const parsed = commerce.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'JobCreated') return parsed.args.jobId as bigint;
    } catch {
      // not this event, keep scanning
    }
  }
  throw new Error('JobCreated event not found in transaction receipt logs');
}
