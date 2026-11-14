"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryRemindersAction } from "@/app/actions";

/** Aviso discreto de Lembretes pendentes, com a ação de tentar de novo na hora. */
export function PendingRemindersNotice({ count }: { count: number }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      const result = await retryRemindersAction();
      setFailed("error" in result);
      router.refresh();
    });
  }

  return (
    <p role="status" className="rounded-[22px] bg-surface px-4 py-3 text-sm text-muted">
      {count === 1 ? "1 lembrete não chegou ao Google" : `${count} lembretes não chegaram ao Google`},{" "}
      <button type="button" onClick={retry} disabled={pending} className="font-semibold text-ink underline disabled:opacity-60">
        {pending ? "tentando…" : "tentar agora"}
      </button>
      {failed && <span className="ml-2">Não deu certo agora.</span>}
    </p>
  );
}
