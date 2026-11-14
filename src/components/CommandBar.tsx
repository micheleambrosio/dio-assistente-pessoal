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

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        {error && (
          <p role="alert" className="rounded-[10px] bg-surface px-4 py-3 text-sm">{error}</p>
        )}
        {preview && <PreviewCard preview={preview} />}
        {showingPreview && (
          <div className="flex gap-2">
            <button onClick={confirm} disabled={pending} className="rounded-full bg-lime px-5 py-2 text-sm font-semibold text-forest disabled:opacity-50">
              Confirmar
            </button>
            <button onClick={() => setCorrecting(true)} disabled={pending} className="rounded-full bg-surface px-5 py-2 text-sm font-semibold disabled:opacity-50">
              Corrigir
            </button>
            <button onClick={reset} disabled={pending} className="rounded-full px-5 py-2 text-sm font-semibold text-muted">
              Descartar
            </button>
          </div>
        )}
        {(!preview || correcting) && (
          <form onSubmit={submit} className="flex gap-2" aria-label="Comando">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
              maxLength={500}
              autoFocus={correcting}
              aria-label={correcting ? "Correção" : "Comando"}
              placeholder={correcting ? "Ex.: não, é dia 16" : "Ex.: internet Vivo, 120, todo dia 15"}
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-ink placeholder:text-muted disabled:opacity-60"
            />
            <button type="submit" disabled={pending || !text.trim()} className="rounded-full bg-lime px-5 py-2 text-sm font-semibold text-forest disabled:opacity-50">
              {pending ? "…" : "Enviar"}
            </button>
          </form>
        )}
      </div>
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
    <section aria-label="Prévia" className="rounded-[10px] border border-line bg-surface p-4 text-sm">
      <p className="mb-2 text-muted">Você escreveu: {preview.originalText}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
