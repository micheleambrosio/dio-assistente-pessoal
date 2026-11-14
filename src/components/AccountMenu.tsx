"use client";

import { useEffect, useRef } from "react";
import type { ThemePreference } from "@/core/theme";
import { signOut } from "@/app/login/actions";
import { useThemePreference } from "@/components/Providers";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

/** Menu da conta no cabeçalho: escolha de tema e Sair. */
export function AccountMenu() {
  const { preference, setPreference } = useThemePreference();
  const menu = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);

  // Fecha ao clicar fora ou com Esc (devolvendo o foco ao botão do menu).
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        summary.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={menu} className="group relative">
      <summary
        ref={summary}
        aria-label="Menu da conta"
        className="hairline inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-surface text-ink transition hover:bg-soft [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </summary>
      <div className="hairline absolute right-0 z-20 mt-2 flex w-60 flex-col gap-3 rounded-[22px] bg-bg p-4 shadow-[var(--shadow-xl)]">
        <div role="group" aria-labelledby="theme-label" className="flex flex-col gap-2">
          <span id="theme-label" className="text-xs font-semibold text-muted">Tema</span>
          <div className="flex rounded-full bg-surface p-1">
            {OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={preference === value}
                onClick={() => setPreference(value)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${
                  preference === value ? "bg-lime text-forest" : "text-ink hover:bg-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-full px-4 py-2 text-left text-sm font-semibold text-ink transition hover:bg-soft">
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}
