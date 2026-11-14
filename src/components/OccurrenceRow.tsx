"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { togglePaidAction } from "@/app/actions";
import type { Occurrence } from "@/core/domain";
import { RECURRENCE_LABELS, TAG_LABELS, formatDate, formatMoney } from "@/lib/labels";
import { monthLabel } from "@/lib/month";

const ERRORS = {
  invalid_amount: "Valor inválido.",
  not_found: "Essa Conta não existe mais.",
  unavailable: "Não deu certo agora. Tente de novo.",
} as const;

/** "1.234,56" ou "120" → número; vazio → undefined; inválido → null. */
function parseAmount(text: string): number | undefined | null {
  const clean = text.replace(/[R$\s]/g, "");
  if (!clean) return undefined;
  // Sem vírgula, "1.234" é mil duzentos e trinta e quatro (pt-BR), não 1,234.
  const thousands = /^\d{1,3}(\.\d{3})+$/.test(clean);
  const value = Number(clean.includes(",") || thousands ? clean.replace(/\./g, "").replace(",", ".") : clean);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const PARTICLES = [
  [-16, -14], [0, -20], [16, -14], [20, 2], [-20, 2], [12, 16], [-12, 16],
] as const;

/**
 * Um Vencimento na lista. `highlight` marca o primeiro Pago do dia (cartão forest).
 * Dar o check num Vencimento aberto pede o valor pago (opcional); no Pago, o check desmarca.
 */
export function OccurrenceRow({ occurrence: o, highlight = false, showDate = false }: { occurrence: Occurrence; highlight?: boolean; showDate?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const late = o.isOverdue;
  const forest = o.isPaid && highlight;
  const refMonth = o.effectiveDate.slice(0, 7);

  function submit(paid: boolean, amount?: number) {
    setError(null);
    startTransition(async () => {
      const result = await togglePaidAction({ billId: o.billId, referenceMonth: o.referenceMonth, paid, ...(amount !== undefined && { amount }) });
      if (!result.ok) return setError(ERRORS[result.error]);
      setAsking(false);
      setCelebrate(paid);
      router.refresh();
    });
  }

  function onCheck() {
    if (pending) return;
    if (o.isPaid) return submit(false);
    setText(o.amount !== undefined ? String(o.amount).replace(".", ",") : "");
    setError(null);
    setAsking((value) => !value);
  }

  function confirmPaid(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseAmount(text);
    if (amount === null) return setError(ERRORS.invalid_amount);
    submit(true, amount);
  }

  const pill = (extra: string) => `rounded-full px-2 py-0.5 text-[11px] font-medium ${extra}`;
  const onDark = late || forest;
  const neutral = pill(onDark ? "bg-white/15 text-white" : "bg-surface2 text-body");
  const card = late ? "bg-late text-white" : forest ? "bg-dark text-white" : o.isPaid ? "bg-surface2" : "bg-surface";

  return (
    <li className={`rounded-[22px] p-3 pr-4 ${card}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={pending}
          aria-label={o.isPaid ? `Desmarcar ${o.title} como paga` : `Marcar ${o.title} como paga`}
          aria-expanded={o.isPaid ? undefined : asking}
          className={`relative grid size-8 shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${
            o.isPaid ? "border-lime bg-lime" : late ? "border-[#ffb3b6] hover:bg-white/10" : "border-muted/60 hover:bg-surface2"
          }`}
        >
          {o.isPaid && (
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" className={celebrate ? "check-draw" : undefined} />
            </svg>
          )}
          {celebrate && o.isPaid &&
            PARTICLES.map(([dx, dy], i) => (
              <i key={i} aria-hidden className="particle" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties} />
            ))}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`truncate text-[15px] font-semibold ${onDark ? "text-white" : "text-ink"} ${o.isPaid && !forest ? "line-through opacity-60" : ""}`}>
              {o.title}
            </span>
            {late && <span className={pill("bg-white font-semibold text-late")}>Atrasada</span>}
            {showDate && <span className={neutral}>venceu {formatDate(o.effectiveDate).slice(0, 5)}</span>}
            {o.recurrence !== "monthly" && <span className={neutral}>{RECURRENCE_LABELS[o.recurrence]}</span>}
            {o.referenceMonth !== refMonth && <span className={neutral}>ref. {monthLabel(o.referenceMonth).name}</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {o.tags.map((t) => (
              <span key={t} className={pill(late ? "bg-[#ffb3b6]/20 text-[#ffd9db]" : forest ? "bg-white/15 text-white" : "bg-soft text-softink")}>
                {TAG_LABELS[t]}
              </span>
            ))}
          </div>
        </div>
        {o.amount !== undefined ? (
          <span className={`text-[15px] font-bold tabular-nums ${onDark ? "text-white" : "text-ink"}`}>{formatMoney(o.amount)}</span>
        ) : (
          <span className={`rounded-full border border-dashed px-2 py-0.5 text-[11px] ${onDark ? "border-white/60 text-white/80" : "border-muted text-muted"}`}>
            sem valor
          </span>
        )}
      </div>
      {asking && (
        <form onSubmit={confirmPaid} className="mt-3 flex flex-wrap items-center gap-2 pl-11">
          <label className={`text-sm ${late ? "text-white" : "text-body"}`} htmlFor={`paid-${o.billId}-${o.referenceMonth}`}>
            Valor pago (opcional)
          </label>
          <input
            id={`paid-${o.billId}-${o.referenceMonth}`}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="0,00"
            className="h-9 w-32 rounded-full border border-line bg-bg px-4 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button type="submit" disabled={pending} className="h-9 rounded-full bg-lime px-4 text-sm font-semibold text-limeink disabled:opacity-50">
            {pending ? "Salvando…" : "Marcar como paga"}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={pending} className={`h-9 px-2 text-sm ${late ? "text-white/80" : "text-muted"}`}>
            Cancelar
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className={`mt-2 pl-11 text-sm ${late ? "text-white" : "text-danger"}`}>
          {error}
        </p>
      )}
    </li>
  );
}
