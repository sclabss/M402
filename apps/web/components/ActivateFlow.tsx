'use client';

import { useState } from 'react';
import type { AgentCategory, AgentSummary } from '@m402/shared-types';
import { CATEGORY_DEFAULT_TERMS } from '@m402/shared-types';
import { ApiUnreachableError, negotiate, notifyFunded } from '@/lib/api';
import { CONTRACTS } from '@/lib/erc8183/contracts';
import { fundJob, type FundProgress, type FundStep } from '@/lib/erc8183/buyer';
import { pollForDeliverable } from '@/lib/erc8183/deliverable';
import { useWallet } from '@/lib/useWallet';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { StatusBadge } from './ui/StatusBadge';

type FlowStep =
  | 'idle'
  | 'negotiating'
  | 'quoted'
  | 'needs-auth'
  | 'funding'
  | 'notifying'
  | 'polling'
  | 'delivered'
  | 'done'
  | 'error';

const FUND_STEP_LABELS: Record<FundStep, string> = {
  'create-job': 'Create job',
  'register-job': 'Register job (bind policy)',
  'set-budget': 'Set budget',
  approve: 'Approve U token',
  fund: 'Fund escrow',
  done: 'Done',
};
const FUND_STEP_ORDER: FundStep[] = ['create-job', 'register-job', 'set-budget', 'approve', 'fund'];

export function ActivateFlow({ agent }: { agent: AgentSummary }) {
  const wallet = useWallet();
  const defaults = CATEGORY_DEFAULT_TERMS[agent.category as AgentCategory];

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState(defaults.taskDescription);
  const [deliverables, setDeliverables] = useState(defaults.deliverables);
  const [qualityStandards, setQualityStandards] = useState(defaults.qualityStandards);

  const [step, setStep] = useState<FlowStep>('idle');
  const [hireId, setHireId] = useState<string | null>(null);
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fundProgress, setFundProgress] = useState<Record<FundStep, FundProgress['status'] | undefined>>(
    {} as Record<FundStep, FundProgress['status'] | undefined>
  );
  const [pollAttempt, setPollAttempt] = useState<{ n: number; max: number } | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState<string | null>(null);

  async function handleGetQuote() {
    setStep('negotiating');
    setMessage(null);
    try {
      const result = await negotiate({
        agentId: agent.id,
        hirerType: 'human',
        hirerIdentifier: wallet.address ?? undefined,
        taskDescription,
        deliverables,
        qualityStandards,
      });
      setHireId(result.hire.id);
      if (result.note?.toLowerCase().includes('oauth2')) {
        setStep('needs-auth');
        setMessage(result.note);
      } else if (result.quote) {
        setQuote(result.quote);
        setStep('quoted');
      } else {
        setStep('error');
        setMessage(result.note ?? 'Agent did not return a quote yet.');
      }
    } catch (err) {
      setStep('error');
      setMessage(err instanceof ApiUnreachableError ? err.message : 'Negotiate failed.');
    }
  }

  async function handleFundAndNotify() {
    if (!hireId || !window.ethereum) return;

    if (wallet.chainId !== '0x61') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x61' }], // BSC testnet, where CONTRACTS live
        });
      } catch {
        setStep('error');
        setMessage('Switch your wallet to BSC testnet (chain 97) to fund this job.');
        return;
      }
    }

    setStep('funding');
    setFundProgress({} as Record<FundStep, FundProgress['status']>);
    try {
      const priceRaw = quote?.price;
      const budgetU = typeof priceRaw === 'string' || typeof priceRaw === 'number' ? String(priceRaw) : '0.1';

      const result = await fundJob(
        window.ethereum,
        { providerAddress: agent.walletAddress, description: taskDescription, budgetU },
        (progress) => setFundProgress((prev) => ({ ...prev, [progress.step]: progress.status }))
      );

      setStep('notifying');
      const notifyResult = await notifyFunded(hireId, Number(result.jobId), result.fundTx);
      setMessage(notifyResult.note ?? notifyResult.status);

      setStep('polling');
      setPollAttempt({ n: 0, max: 12 });
      try {
        const url = await pollForDeliverable(result.jobId, (n, max) => setPollAttempt({ n, max }));
        if (url) {
          setDeliverableUrl(url);
          setStep('delivered');
        } else {
          setStep('done'); // agent is still working; not an error, just not ready yet
        }
      } catch (pollErr) {
        // Deliverable polling needs NEXT_PUBLIC_BSC_LOG_RPC_URL -- if it's
        // missing, don't fail the whole flow (funding + notify already
        // succeeded), just say so and stop polling.
        setMessage(pollErr instanceof Error ? pollErr.message : 'Could not poll for the deliverable.');
        setStep('done');
      }
    } catch (err) {
      setStep('error');
      setMessage(err instanceof Error ? err.message : 'Funding transaction failed or was rejected.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step 1: wallet */}
      <Panel className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-text">Wallet</p>
          <p className="font-mono text-xs text-text-muted">
            {wallet.address
              ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}${wallet.onBsc ? '' : ' — switch to BSC'}`
              : 'Not connected'}
          </p>
        </div>
        {!wallet.address && (
          <Button variant="primary" onClick={wallet.connect} disabled={wallet.connecting}>
            {wallet.connecting ? 'Connecting…' : 'Connect Wallet'}
          </Button>
        )}
      </Panel>
      {wallet.error && <p className="text-sm text-amber">{wallet.error}</p>}

      {/* Step 2: what you're hiring it to do, editable */}
      <Panel className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text">What this agent will do</p>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="font-mono text-[11px] text-text-muted hover:text-amber"
          >
            {advancedOpen ? 'hide advanced' : 'edit terms'}
          </button>
        </div>
        {advancedOpen ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Task
              <textarea
                className="rounded-sm border border-line bg-ink p-2 text-sm text-text"
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Deliverables
              <textarea
                className="rounded-sm border border-line bg-ink p-2 text-sm text-text"
                rows={2}
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Quality standards
              <textarea
                className="rounded-sm border border-line bg-ink p-2 text-sm text-text"
                rows={2}
                value={qualityStandards}
                onChange={(e) => setQualityStandards(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{taskDescription}</p>
        )}
      </Panel>

      {/* Step 3: get quote */}
      {step === 'idle' && (
        <Button variant="primary" onClick={handleGetQuote} disabled={!wallet.address}>
          Get quote
        </Button>
      )}
      {step === 'negotiating' && (
        <Button variant="primary" disabled>
          Requesting a signed quote…
        </Button>
      )}

      {step === 'needs-auth' && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="quoted" />
          <p className="text-sm text-text-muted">{message}</p>
        </Panel>
      )}

      {step === 'quoted' && quote && (
        <Panel className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">Signed quote</span>
            <StatusBadge status="quoted" />
          </div>
          <pre className="overflow-x-auto rounded-sm bg-ink p-3 font-mono text-[11px] text-text-muted">
            {JSON.stringify(quote, null, 2)}
          </pre>
          <p className="text-xs text-text-muted">
            Next: fund this job on BSC testnet — 5 transactions in your wallet against the real{' '}
            <code className="text-text">AgenticCommerce</code> contract (
            <code className="text-text">{CONTRACTS.COMMERCE.slice(0, 10)}…</code>), then notify the
            agent automatically.
          </p>
          <Button variant="primary" onClick={handleFundAndNotify}>
            Fund on-chain &amp; notify
          </Button>
        </Panel>
      )}

      {(step === 'funding' || step === 'notifying') && (
        <Panel className="flex flex-col gap-2 p-4">
          {FUND_STEP_ORDER.map((s) => (
            <div key={s} className="flex items-center justify-between font-mono text-xs">
              <span className={fundProgress[s] ? 'text-text' : 'text-text-muted'}>
                {FUND_STEP_LABELS[s]}
              </span>
              <span>
                {fundProgress[s] === 'confirmed' ? (
                  <span className="text-sage">✓ confirmed</span>
                ) : fundProgress[s] === 'pending' ? (
                  <span className="text-amber">waiting for wallet…</span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </span>
            </div>
          ))}
          {step === 'notifying' && <p className="pt-2 text-xs text-sage">Funded — notifying the agent…</p>}
        </Panel>
      )}

      {step === 'polling' && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="fulfilled" />
          <p className="text-sm text-text-muted">
            Waiting for the agent to submit its deliverable on-chain
            {pollAttempt ? ` (check ${pollAttempt.n}/${pollAttempt.max})` : ''}…
          </p>
        </Panel>
      )}

      {step === 'delivered' && deliverableUrl && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="settled" />
          <p className="text-sm text-text">Deliverable ready.</p>
          <a
            href={deliverableUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-sage hover:underline"
          >
            {deliverableUrl} →
          </a>
        </Panel>
      )}

      {step === 'done' && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="fulfilled" />
          <p className="text-sm text-text-muted">
            {message ?? 'Funded and notified. The agent is still working — deliverable not on-chain yet.'}
          </p>
        </Panel>
      )}

      {step === 'error' && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="failed" />
          <p className="text-sm text-text-muted">{message}</p>
          <Button variant="ghost" onClick={() => setStep('idle')}>
            Try again
          </Button>
        </Panel>
      )}
    </div>
  );
}

