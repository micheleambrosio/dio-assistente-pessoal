"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition } from "react";
import { Spinner } from "./Spinner";

const NavigationContext = createContext<(href: string, scroll: boolean) => void>(() => {});

/** Navega em transição e cobre a página inteira com um loading até a nova tela chegar. */
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = (href: string, scroll: boolean) => startTransition(() => router.push(href, { scroll }));

  return (
    <NavigationContext.Provider value={navigate}>
      {children}
      {pending && (
        <div
          aria-busy="true"
          className="fixed inset-0 z-50 grid cursor-progress place-items-center bg-bg/60 backdrop-blur-[2px]"
        >
          <div className="flex items-center gap-3 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-ink shadow-[var(--shadow-lg)]">
            <Spinner label="Carregando a página" className="size-5" />
            <span aria-hidden="true">Carregando…</span>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  );
}

type NavLinkProps = Omit<React.ComponentProps<typeof Link>, "href" | "onClick"> & { href: string };

/** Link que aciona o loading de página inteira; cliques com Ctrl/Cmd/Shift seguem o comportamento do navegador. */
export function NavLink({ href, scroll = true, ...props }: NavLinkProps) {
  const navigate = useContext(NavigationContext);
  return (
    <Link
      href={href}
      scroll={scroll}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href, scroll);
      }}
      {...props}
    />
  );
}
