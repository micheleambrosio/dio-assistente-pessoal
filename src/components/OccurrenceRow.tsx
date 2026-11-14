"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { togglePaidAction } from "@/app/actions";
import type { Occurrence } from "@/core/domain";
import { RECURRENCE_LABELS, TAG_LABELS, formatDate, formatMoney } from "@/lib/labels";
import { toMasked, maskMoney, unmaskMoney } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import { Spinner } from "./Spinner";

const ERRORS = {
  invalid_amount: "Valor inválido.",
  not_found: "Essa Conta não existe mais.",
  unavailable: "Não deu certo agora. Tente de novo.",
} as const;

/**
 * Depois de marcar/desmarcar, a linha pode trocar de lista (Atrasadas → dia) e remontar.
 * Este recado curto faz a animação seguir o Vencimento, não a instância do componente.
 */
const recentChange = new Map<string, "in" | "out">();

// 8 partículas em círculo, a ~30 px do centro (como no protótipo).
const PARTICLES = Array.from({ length: 8 }, (_, i) => [
  Math.round(Math.cos((i / 8) * Math.PI * 2) * 30),
  Math.round(Math.sin((i / 8) * Math.PI * 2) * 30),
]);

/**
 * Um Vencimento na lista. Todo Pago fica em cartão forest.
 * O check só alterna o status. O valor da Conta se edita (ou não) pelo lápis ao lado dele.
 */
export function OccurrenceRow({ occurrence: o, showDate = false }: { occurrence: Occurrence; showDate?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<"status" | "amount" | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = o.billId + o.referenceMonth;
  // "in": acabou de ser marcado (traço + partículas); "out": acabou de ser desmarcado.
  const [change, setChange] = useState<"in" | "out" | null>(() => recentChange.get(key) ?? null);

  useEffect(() => {
    if (!recentChange.has(key)) return;
    const id = setTimeout(() => recentChange.delete(key), 1500);
    return () => clearTimeout(id);
  }, [key, change]);

  const late = o.isOverdue;
  const forest = o.isPaid;
  const refMonth = o.effectiveDate.slice(0, 7);

  function submit(kind: "status" | "amount", paid: boolean, amount?: number) {
    setError(null);
    setSaving(kind);
    startTransition(async () => {
      const result = await togglePaidAction({ billId: o.billId, referenceMonth: o.referenceMonth, paid, ...(amount !== undefined && { amount }) });
      setSaving(null);
      if (!result.ok) return setError(ERRORS[result.error]);
      if (kind === "status") {
        recentChange.set(key, paid ? "in" : "out");
        setChange(paid ? "in" : "out");
      } else {
        setEditing(false);
      }
      router.refresh();
    });
  }

  function onCheck() {
    if (pending) return;
    submit("status", !o.isPaid);
  }

  function startEditing() {
    setText(toMasked(o.amount));
    setError(null);
    setEditing((value) => !value);
  }

  function onAmountKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setEditing(false);
    if (e.key !== "Enter" || pending) return;
    e.preventDefault();
    const amount = unmaskMoney(text);
    if (amount === undefined || amount === o.amount) return setEditing(false); // nada a mudar
    submit("amount", o.isPaid, amount); // mantém o status; só o valor muda
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
          aria-busy={pending}
          aria-pressed={o.isPaid}
          className={`relative grid size-8 shrink-0 place-items-center rounded-full border-2 transition duration-200 hover:scale-110 active:scale-90 ${
            o.isPaid ? "border-lime bg-lime text-limeink" : late ? "border-[#ffb3b6] text-white hover:bg-white/10" : "border-muted/60 text-ink hover:bg-surface2"
          } ${saving === "status" ? "cursor-progress" : ""} ${change === "in" && o.isPaid ? "check-pop" : ""}`}
        >
          {saving === "status" ? (
            <Spinner label={o.isPaid ? "Desmarcando" : "Marcando como paga"} className="size-4" />
          ) : o.isPaid ? (
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" className={change === "in" ? "check-draw" : undefined} />
            </svg>
          ) : change === "out" ? (
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={late ? "#ffb3b6" : "currentColor"} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="check-out opacity-0">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : null}
          {change === "in" && o.isPaid && saving !== "status" &&
            PARTICLES.map(([dx, dy], i) => (
              <i key={i} aria-hidden className="particle" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties} />
            ))}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`truncate text-[15px] font-semibold ${onDark ? "text-white" : "text-ink"} ${o.isPaid && !forest ? "line-through opacity-60" : ""}`}>
              {o.title}
            </span>
            {late && (
              <span className={`${pill("bg-white font-semibold text-[#8f2228]")} inline-flex items-center gap-1`}>
                <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 1.8 20.5h20.4L12 2.5Zm-1 7h2v5h-2v-5Zm0 6.5h2v2h-2v-2Z" /></svg>
                Atrasada
              </span>
            )}
            {o.recurrence !== "monthly" && <span className={neutral}>{RECURRENCE_LABELS[o.recurrence]}</span>}
            {o.referenceMonth !== refMonth && (
              <span className={`${neutral} inline-flex items-center gap-1`}>
                <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
                ref. {monthLabel(o.referenceMonth).name}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {o.tags.map((t) => (
              <span key={t} className={pill(late ? "bg-[#ffb3b6]/20 text-[#ffd9db]" : forest ? "bg-white/15 text-white" : "bg-soft text-softink")}>
                {TAG_LABELS[t]}
              </span>
            ))}
            {showDate && <span className={`text-[11px] ${onDark ? "text-white/70" : "text-muted"}`}>vence {formatDate(o.effectiveDate).slice(0, 5)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {editing ? (
            <input
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(maskMoney(e.target.value))}
              onKeyDown={onAmountKey}
              disabled={saving === "amount"}
              autoFocus
              aria-label={`Valor de ${o.title} (Enter salva, Esc cancela)`}
              placeholder="R$ 0,00"
              className="h-8 w-28 rounded-full border border-line bg-bg px-3 text-right text-sm font-bold tabular-nums text-ink focus:border-brand focus:outline-none disabled:opacity-60 sm:w-32"
            />
          ) : o.amount !== undefined ? (
            <span className={`text-[15px] font-bold tabular-nums ${onDark ? "text-white" : "text-ink"}`}>{formatMoney(o.amount)}</span>
          ) : (
            <span title="Sem valor: entra na contagem, não nos totais." className={`rounded-full border border-dashed px-2 py-0.5 text-[11px] ${onDark ? "border-white/60 text-white/80" : "border-muted text-muted"}`}>
              sem valor
            </span>
          )}
          <button
            type="button"
            onClick={startEditing}
            disabled={saving === "amount"}
            aria-label={editing ? `Cancelar a edição do valor de ${o.title}` : `Editar o valor de ${o.title}`}
            title={editing ? "Cancelar" : "Editar o valor"}
            className={`grid size-7 shrink-0 place-items-center rounded-full transition ${onDark ? "text-white/80 hover:bg-white/15" : "text-muted hover:bg-surface2 hover:text-ink"}`}
          >
            {saving === "amount" ? (
              <Spinner label="Salvando o valor" className="size-3.5" />
            ) : editing ? (
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className={`mt-2 pl-11 text-sm ${late ? "text-white" : "text-danger"}`}>
          {error}
        </p>
      )}
    </li>
  );
}
