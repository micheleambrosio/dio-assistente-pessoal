"use client";

import { useEffect, useRef, useState } from "react";

/** Limite da gravação: ao chegar nele, a gravação para sozinha e o áudio é enviado. */
export const MAX_RECORDING_SECONDS = 30;

type Props = {
  /** Gravação concluída (parou no botão ou no limite de 30 s). */
  onRecorded: (audio: Blob) => void;
  /** Cancelada pelo Usuário, ou o microfone não está disponível: nada é enviado. */
  onCancel: (reason?: "denied" | "unsupported") => void;
};

/** Painel de gravação: anéis pulsantes, ondas, contagem regressiva, parar/enviar e cancelar. */
export function VoiceRecorder({ onRecorded, onCancel }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const stopRef = useRef<(send: boolean) => void>(() => {});
  const callbacks = useRef({ onRecorded, onCancel });
  callbacks.current = { onRecorded, onCancel };

  useEffect(() => {
    let finished = false;
    let send = false;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    const chunks: Blob[] = [];

    function stop(shouldSend: boolean) {
      if (finished) return;
      finished = true;
      send = shouldSend;
      clearInterval(timer);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      else stream?.getTracks().forEach((t) => t.stop());
    }
    stopRef.current = stop;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      callbacks.current.onCancel("unsupported");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((media) => {
        stream = media;
        if (finished) return media.getTracks().forEach((t) => t.stop());
        recorder = new MediaRecorder(media);
        recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        recorder.onstop = () => {
          media.getTracks().forEach((t) => t.stop());
          if (send && chunks.length) callbacks.current.onRecorded(new Blob(chunks, { type: recorder?.mimeType || "audio/webm" }));
          else if (send) callbacks.current.onCancel();
        };
        recorder.start();
        const startedAt = Date.now();
        timer = setInterval(() => {
          const left = MAX_RECORDING_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
          setSecondsLeft(Math.max(left, 0));
          if (left <= 0) stop(true);
        }, 250);
      })
      .catch(() => {
        finished = true;
        callbacks.current.onCancel("denied");
      });

    // Sair da tela (ou desmontar) equivale a cancelar.
    return () => stop(false);
  }, []);

  const clock = `0:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <div
      role="group"
      aria-label="Gravando o Comando"
      className="hairline pointer-events-auto flex w-full max-w-[640px] items-center gap-3 rounded-full bg-bg p-2 shadow-[var(--shadow-xl)]"
    >
      <button
        type="button"
        onClick={() => {
          stopRef.current(false);
          callbacks.current.onCancel();
        }}
        aria-label="Cancelar gravação"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface2 text-muted transition hover:text-ink"
      >
        ✕
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center" aria-hidden="true">
          <span className="voice-ring absolute inset-0 rounded-full bg-lime/60" />
          <span className="voice-ring absolute inset-0 rounded-full bg-lime/60 [animation-delay:0.6s]" />
          <span className="relative size-4 rounded-full bg-danger" />
        </span>
        <span className="flex h-8 flex-1 items-center justify-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="voice-wave w-[3px] rounded-full bg-brand" style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </span>
        <span role="timer" aria-label={`${secondsLeft} segundos restantes`} className="w-10 shrink-0 text-right font-semibold tabular-nums text-ink">
          {clock}
        </span>
      </div>
      <button
        type="button"
        onClick={() => stopRef.current(true)}
        aria-label="Parar e enviar"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-limeink transition hover:brightness-95"
      >
        ↑
      </button>
    </div>
  );
}
