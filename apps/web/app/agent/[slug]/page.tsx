import { notFound } from 'next/navigation';
import { ActivateFlow } from '@/components/ActivateFlow';
import { Panel } from '@/components/ui/Panel';
import { ApiUnreachableError, getAgent } from '@/lib/api';

export default async function AgentDetailPage({ params }: { params: { slug: string } }) {
  let agent: Awaited<ReturnType<typeof getAgent>>['agent'] = null;
  let loadError: string | null = null;
  try {
    ({ agent } = await getAgent(params.slug));
  } catch (err) {
    loadError = err instanceof ApiUnreachableError ? err.message : 'Could not load this agent.';
  }

  if (loadError) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:px-8">
        <Panel className="p-6 text-sm text-text-muted">{loadError}</Panel>
      </main>
    );
  }

  if (!agent) return notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-2 border-b border-line pb-6">
        <span className="font-mono text-xs text-amber">{agent.category.toUpperCase()}</span>
        <h1 className="font-display text-2xl font-medium text-text">{agent.name}</h1>
        <p className="text-text-muted">{agent.description}</p>
        <p className="font-mono text-[11px] text-text-muted">
          {agent.walletAddress} · chain {agent.chainId}
        </p>
      </div>
      <ActivateFlow agent={agent} />
    </main>
  );
}
