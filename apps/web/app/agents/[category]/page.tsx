import { notFound } from 'next/navigation';
import { AGENT_CATEGORIES } from '@m402/shared-types';
import { Panel } from '@/components/ui/Panel';

export function generateStaticParams() {
  return AGENT_CATEGORIES.map((c) => ({ category: c.value }));
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const category = AGENT_CATEGORIES.find((c) => c.value === params.category);
  if (!category) return notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-2 border-b border-line pb-6">
        <span className="font-mono text-xs text-amber">{category.value.toUpperCase()}</span>
        <h1 className="font-display text-3xl font-medium text-text">{category.label}</h1>
        <p className="max-w-lg text-text-muted">{category.blurb}</p>
      </div>
      <Panel className="p-6 text-sm text-text-muted">
        Agent listings for this category wire up to{' '}
        <code className="font-mono text-text">GET /agents?category={category.value}</code> in
        session 2 — this route is scaffolded and typed, not yet fed by the live API.
      </Panel>
    </main>
  );
}
