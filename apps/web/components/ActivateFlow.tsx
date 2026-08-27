'use client';

import { useState } from 'react';
import type { AgentCategory, AgentSummary } from '@m402/shared-types';
import { CATEGORY_DEFAULT_TERMS } from '@m402/shared-types';
import { ApiUnreachableError, negotiate, notifyFunded } from '@/lib/api';
import { useWallet } from '@/lib/useWallet';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { StatusBadge } from './ui/StatusBadge';

type FlowStep = 'idle' | 'negotiating' | 'quoted' | 'needs-auth' | 'funding' | 'notifying' | 'done' | 'error';

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
  const [jobId, setJobId] = useState('');
  const [txHash, setTxHash] = useState('');

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

  async function handleNotifyFunded() {
    if (!hireId || !jobId) return;
    setStep('notifying');
    try {
      const result = await notifyFunded(hireId, Number(jobId), txHash || undefined);
      setMessage(result.note ?? result.status);
      setStep('done');
    } catch {
      setStep('error');
      setMessage('notify-funded failed to reach the API.');
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
            Next: fund this job on-chain (an ERC-8183 <code className="text-text">AgenticCommerce</code>{' '}
            transaction, signed in your wallet — see{' '}
            <code className="text-text">ON_CHAIN_FUNDING.md</code> for exactly what&apos;s verified
            about that call and what&apos;s still open). Once you have the resulting job ID and tx
            hash, enter them below to tell the agent to deliver.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded-sm border border-line bg-ink p-2 font-mono text-sm text-text"
              placeholder="job id"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            />
            <input
              className="flex-1 rounded-sm border border-line bg-ink p-2 font-mono text-sm text-text"
              placeholder="tx hash (optional)"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
            />
            <Button variant="primary" onClick={handleNotifyFunded} disabled={!jobId}>
              Notify funded
            </Button>
          </div>
        </Panel>
      )}

      {step === 'notifying' && (
        <Button variant="primary" disabled>
          Notifying the agent…
        </Button>
      )}

      {step === 'done' && (
        <Panel className="flex flex-col gap-2 p-4">
          <StatusBadge status="fulfilled" />
          <p className="text-sm text-text-muted">{message}</p>
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
