import Link from 'next/link';
import type { AgentSummary } from '@m402/shared-types';
import { Panel } from './ui/Panel';

export function AgentCard({ agent }: { agent: AgentSummary }) {
  return (
    <Link href={`/agent/${agent.slug}`}>
      <Panel className="flex flex-col gap-3 p-5 transition-colors hover:border-amber/50">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-text">{agent.name}</span>
          <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase text-text-muted">
            {agent.source === 'native' ? 'M402' : '8004scan'}
          </span>
        </div>
        <p className="text-sm text-text-muted">{agent.description}</p>
        <div className="flex items-center gap-3 border-t border-line pt-3 font-mono text-[11px] text-text-muted">
          <span>chain {agent.chainId}</span>
          <span className="text-sage">A2A</span>
        </div>
      </Panel>
    </Link>
  );
}
