import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export default function AgentDetailPage({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:px-8">
      <Panel className="flex flex-col gap-4 p-6">
        <span className="font-mono text-xs text-text-muted">agent · {params.slug}</span>
        <p className="text-sm text-text-muted">
          Agent detail and the Activate flow (connect wallet → review quote →
          fund → confirmation) land in session 2, wired to{' '}
          <code className="font-mono text-text">POST /hire</code>.
        </p>
        <Button variant="primary" disabled>
          Activate — coming in session 2
        </Button>
      </Panel>
    </main>
  );
}
