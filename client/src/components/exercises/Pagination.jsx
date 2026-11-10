import { memo } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

/* Page numbers around the current one: 1 … 4 5 [6] 7 8 … 29 */
export function pageWindow(page, totalPages, span = 1) {
  const pages = new Set([1, totalPages]);
  for (let p = page - span; p <= page + span; p++) if (p >= 1 && p <= totalPages) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(p - sorted[i - 1] === 2 ? p - 1 : '…');
    out.push(p);
  });
  return out;
}

const btn = 'min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1';

function Pagination({ page, totalPages, total, limit, onChange, label = 'ejercicios' }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3" aria-label="Paginación">
      <p className="text-xs text-zinc-400 font-mono">
        Mostrando <strong className="text-white">{from}–{to}</strong> de <strong className="text-white">{total}</strong> {label}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className={`${btn} border-white/10 bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none`} aria-label="Página anterior">
            <LuChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Anterior</span>
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap${i}`} className="px-1 text-zinc-600 text-xs">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${p === page ? 'bg-lime-400 text-zinc-950 border-lime-400' : 'border-white/10 bg-zinc-900 text-zinc-300 hover:text-white'}`}
              >
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={`${btn} border-white/10 bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none`} aria-label="Página siguiente">
            <span className="hidden sm:inline">Siguiente</span> <LuChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

export default memo(Pagination);
