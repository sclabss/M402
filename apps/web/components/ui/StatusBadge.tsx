import { cn } from '@/lib/cn';

const STATUS_STYLES: Record<string, string> = {
  quoted: 'text-amber border-amber/40',
  funded: 'text-amber border-amber/40',
  fulfilled: 'text-sage border-sage/40',
  settled: 'text-sage border-sage/40',
  failed: 'text-red-400 border-red-400/40',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide',
        STATUS_STYLES[status] ?? 'text-text-muted border-line'
      )}
    >
      {status}
    </span>
  );
}
