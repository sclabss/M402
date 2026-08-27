import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AGENT_CATEGORIES, CATEGORY_AGENT_FOLDER, type AgentCategory, type AgentSummary } from '@m402/shared-types';
import { AgentCard } from '@/components/AgentCard';
import { Panel } from '@/components/ui/Panel';
import { ApiUnreachableError, listAgents, listExternalAgents } from '@/lib/api';

export function generateStaticParams() {
  return AGENT_CATEGORIES.map((c) => ({ category: c.value }));
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { sort?: string };
}) {
  const category = AGENT_CATEGORIES.find((c) => c.value === params.category);
  if (!category) return notFound();

  const sortByPerformance = searchParams.sort === 'performance';

  let agents: AgentSummary[] = [];
  let externalNote: string | undefined;
  let loadError: string | null = null;
  try {
    const [native, external] = await Promise.all([
      listAgents(category.value, sortByPerformance ? 'performance' : undefined),
      listExternalAgents(category.value).catch(() => ({ agents: [] as AgentSummary[], hasMore: false })),
    ]);
    // External (8004scan) agents have no M402-native performance stats, so
    // they always sort after ranked native ones regardless of the toggle --
    // real native track record beats an unranked external listing, not the
    // other way around.
    agents = [...native.agents, ...external.agents];
    externalNote = 'note' in external ? external.note : undefined;
  } catch (err) {
    loadError = err instanceof ApiUnreachableError ? err.message : 'Could not load agents.';
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-2 border-b border-line pb-6">
        <span className="font-mono text-xs text-amber">{category.value.toUpperCase()}</span>
        <h1 className="font-display text-3xl font-medium text-text">{category.label}</h1>
        <p className="max-w-lg text-text-muted">{category.blurb}</p>
      </div>

      {agents.length > 1 && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
          <span>sort:</span>
          <Link
            href={`/agents/${category.value}`}
            className={!sortByPerformance ? 'text-amber' : 'hover:text-text'}
          >
            newest
          </Link>
          <span>·</span>
          <Link
            href={`/agents/${category.value}?sort=performance`}
            className={sortByPerformance ? 'text-amber' : 'hover:text-text'}
          >
            best track record
          </Link>
        </div>
      )}

      {loadError && (
        <Panel className="p-6 text-sm text-text-muted">
          {loadError} Once <code className="font-mono text-text">apps/api</code> is running against
          a seeded Supabase project (<code className="font-mono text-text">supabase/seed.sql</code>),
          real listings show up here.
        </Panel>
      )}

      {!loadError && agents.length === 0 && (
        <Panel className="p-6 text-sm text-text-muted">
          No {category.label.toLowerCase()} agents live yet — seed the catalog or bring one online
          (see{' '}
          <code className="font-mono text-text">
            agents/{CATEGORY_AGENT_FOLDER[category.value as AgentCategory]}/README.md
          </code>
          ).
        </Panel>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {externalNote && <p className="font-mono text-[11px] text-text-muted">{externalNote}</p>}
    </main>
  );
}
