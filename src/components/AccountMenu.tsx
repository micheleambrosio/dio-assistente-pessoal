"use client";

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

  return (
    <details className="group relative">
      <summary
        aria-label="Menu da conta"
        className="hairline inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-surface text-ink transition hover:bg-soft [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </summary>
      <div className="hairline absolute right-0 z-20 mt-2 flex w-60 flex-col gap-3 rounded-[22px] bg-bg p-4 shadow-[var(--shadow-xl)]">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold text-muted">Tema</legend>
          <div role="radiogroup" aria-label="Tema" className="flex rounded-full bg-surface p-1">
            {OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={preference === value}
                onClick={() => setPreference(value)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${
                  preference === value ? "bg-lime text-forest" : "text-ink hover:bg-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-full px-4 py-2 text-left text-sm font-semibold text-ink transition hover:bg-soft">
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}
