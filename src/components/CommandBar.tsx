"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmPreviewAction, correctPreviewAction, interpretCommandAction } from "@/app/actions";
import type { Preview } from "@/core/domain";
import { RECURRENCE_LABELS, TAG_LABELS, formatDate, formatMoney } from "@/lib/labels";

const ERRORS = {
  not_understood: "Não entendi o Comando. Tente algo como “internet Vivo, 120, todo dia 15”.",
  invalid_preview: "Essa Prévia não é mais válida. Escreva o Comando de novo.",
  unavailable: "Não consegui falar com o assistente agora. Tente de novo em instantes.",
} as const;

/** Entrada de Comando fixa no rodapé; a Prévia aparece acima dela. Nada é salvo antes de Confirmar. */
export function CommandBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show(result: Awaited<ReturnType<typeof interpretCommandAction>>) {
    if (result.ok) {
      setPreview(result.preview);
      setError(null);
    } else {
      setError(ERRORS[result.error]);
    }
  }

  function reset() {
    setPreview(null);
    setCorrecting(false);
    setError(null);
    setText("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    startTransition(async () => {
      if (preview && correcting) {
        show(await correctPreviewAction(preview, value));
        setCorrecting(false);
      } else {
        show(await interpretCommandAction(value));
      }
      setText("");
    });
  }

  function confirm() {
    if (!preview) return;
    startTransition(async () => {
      const result = await confirmPreviewAction(preview);
      if (!result.ok) return setError(ERRORS[result.error]);
      reset();
      router.refresh();
    });
  }

  const showingPreview = preview && !correcting;

  const pill = "rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      {error && (
        <p role="alert" className="pointer-events-auto w-full max-w-[640px] rounded-[22px] bg-dangersoft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {preview && (
        <div className="pointer-events-auto w-full max-w-[640px]">
          <PreviewCard preview={preview} />
          {showingPreview && (
            <div className="mt-2 flex gap-2">
              <button onClick={confirm} disabled={pending} className={`${pill} bg-lime text-limeink hover:brightness-95`}>
                Confirmar
              </button>
              <button onClick={() => setCorrecting(true)} disabled={pending} className={`${pill} bg-surface2 text-ink`}>
                Corrigir
              </button>
              <button onClick={reset} disabled={pending} className={`${pill} text-muted`}>
                Descartar
              </button>
            </div>
          )}
        </div>
      )}
      {(!preview || correcting) && (
        <form
          onSubmit={submit}
          aria-label="Comando"
          className="hairline pointer-events-auto flex w-full max-w-[640px] items-center gap-2 rounded-full bg-bg p-2 shadow-[var(--shadow-xl)]"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={pending}
            maxLength={500}
            autoFocus={correcting}
            aria-label={correcting ? "Correção" : "Comando"}
            placeholder={correcting ? "Ex.: não, é dia 16" : "Ex.: “internet Vivo, 120, todo dia 15”"}
            className="h-12 min-w-0 flex-1 rounded-full border border-line bg-bg px-5 text-ink placeholder:text-muted focus:border-brand focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Enviar Comando"
            className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
              text.trim() ? "bg-lime text-limeink" : "bg-surface2 text-muted"
            }`}
          >
            {pending ? "…" : "↑"}
          </button>
        </form>
      )}
    </div>
  );
}

function PreviewCard({ preview }: { preview: Preview }) {
  const rows: [string, string][] = [
    ["Ação", "Cadastrar Conta"],
    ["Título", preview.title],
    ["Valor", preview.amount !== undefined ? formatMoney(preview.amount) : "sem valor"],
    ["Periodicidade", RECURRENCE_LABELS[preview.recurrence] + (preview.endDate || preview.recurrence === "once" ? "" : " (Conta fixa)")],
    ["Data de vencimento", formatDate(preview.startDate)],
    ...(preview.endDate && preview.recurrence !== "once" ? [["Até", formatDate(preview.endDate)] as [string, string]] : []),
    ["Etiquetas", preview.tags.map((t) => TAG_LABELS[t]).join(", ")],
  ];
  return (
    <section aria-label="Prévia" className="rounded-[28px] bg-surface p-4 text-sm shadow-[var(--shadow-lg)]">
      <p className="mb-2 text-muted">Você escreveu: {preview.originalText}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
