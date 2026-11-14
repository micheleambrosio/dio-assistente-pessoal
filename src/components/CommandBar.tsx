"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmPreviewAction, correctPreviewAction, interpretCommandAction, interpretVoiceCommandAction } from "@/app/actions";
import type { Preview } from "@/core/domain";
import { Spinner } from "./Spinner";
import { VoiceRecorder } from "./VoiceRecorder";
import { RECURRENCE_LABELS, TAG_LABELS, formatDate } from "@/lib/labels";
import { formatMoney } from "@/lib/money";

const ERRORS = {
  not_understood: "Não entendi o Comando. Tente algo como “internet Vivo, 120, todo dia 15”.",
  invalid_preview: "Essa Prévia não é mais válida. Escreva o Comando de novo.",
  invalid_audio: "Não consegui usar essa gravação. Tente falar de novo, por até 30 segundos.",
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
  const [busyLabel, setBusyLabel] = useState("");
  const [recording, setRecording] = useState(false);

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
    setBusyLabel(preview && correcting ? "Corrigindo a Prévia…" : "Entendendo o Comando…");
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

  function sendRecording(audio: Blob) {
    setRecording(false);
    setBusyLabel("Ouvindo e entendendo o Comando…");
    const form = new FormData();
    form.set("audio", audio);
    startTransition(async () => show(await interpretVoiceCommandAction(form)));
  }

  function cancelRecording(reason?: "denied" | "unsupported") {
    setRecording(false);
    if (reason === "denied") setError("Não consegui acessar o microfone. Libere a permissão no navegador e tente de novo.");
    if (reason === "unsupported") setError("Este navegador não grava áudio. Escreva o Comando.");
  }

  function confirm() {
    if (!preview) return;
    setBusyLabel("Salvando a Conta e criando os lembretes…");
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
      {pending && (
        <p className="pointer-events-auto flex w-full max-w-[640px] items-center gap-2 rounded-[22px] bg-surface px-4 py-3 text-sm text-muted">
          <Spinner label={busyLabel} />
          <span aria-hidden="true">{busyLabel}</span>
        </p>
      )}
      {preview && (
        <div className="pointer-events-auto w-full max-w-[640px]">
          <PreviewCard preview={preview} />
          {showingPreview && (
            <div className="mt-2 flex gap-2">
              <button onClick={confirm} disabled={pending} className={`${pill} bg-lime text-limeink hover:brightness-95`}>
                {pending ? "Salvando…" : "Confirmar"}
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
      {recording && <VoiceRecorder onRecorded={sendRecording} onCancel={cancelRecording} />}
      {(!preview || correcting) && !recording && (
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
          {!correcting && !text.trim() && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRecording(true);
              }}
              disabled={pending}
              aria-label="Gravar Comando por voz"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-surface2 text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              <MicIcon />
            </button>
          )}
          {(text.trim() || correcting || pending) && (
            <button
              type="submit"
              disabled={pending || !text.trim()}
              aria-label="Enviar Comando"
              className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
                text.trim() ? "bg-lime text-limeink" : "bg-surface2 text-muted"
              }`}
            >
              {pending ? <Spinner label="Enviando" /> : "↑"}
            </button>
          )}
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
      <p className="mb-2 text-muted">
        {preview.source === "voice" ? "Você disse" : "Você escreveu"}: {preview.originalText}
      </p>
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

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
