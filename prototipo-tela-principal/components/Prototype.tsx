"use client";
// PROTÓTIPO DESCARTÁVEL — "Tela principal" do Contas do mês.
// Pergunta: qual disposição calendário × lista × entrada de Comando funciona melhor no desktop e no mobile?
// 3 variantes na mesma rota, via ?variant=A|B|C. Dados mockados em lib/data.ts (hoje simulado = 12/06/2025).
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfigProvider, theme as antTheme } from "antd";
import { MotionConfig } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { MES_VAZIO } from "@/lib/data";
import { useApp } from "@/lib/useApp";
import { Toast } from "./shared";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";

dayjs.locale("pt-br");
const VARIANTS = [
  { key: "A", name: "Painel: calendário ← → lista, Comando fixo no rodapé", short: "Painel", C: VariantA },
  { key: "B", name: "Agenda: lista abaixo do calendário, Comando flutuante", short: "Agenda", C: VariantB },
  { key: "C", name: "Resumo primeiro: Comando no topo, calendário compacto", short: "Resumo", C: VariantC },
] as const;

export default function Prototype() {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const key = (sp.get("variant") ?? "A").toUpperCase();
  const idx = Math.max(0, VARIANTS.findIndex((v) => v.key === key));
  const app = useApp();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  const toggle = () => { const n = !dark; setDark(n); document.documentElement.dataset.theme = n ? "dark" : "light"; try { localStorage.setItem("theme", n ? "dark" : "light"); } catch {} };
  const go = (d: number) => router.replace(`${path}?variant=${VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length].key}`, { scroll: false });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/input|textarea/i.test(el.tagName) || el.isContentEditable) return;
      if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1);
    };
    addEventListener("keydown", h); return () => removeEventListener("keydown", h);
  });

  const V = VARIANTS[idx].C;
  return (
    <ConfigProvider theme={{
      algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      token: { colorPrimary: dark ? "#9fe870" : "#163300", borderRadius: 10, fontFamily: "'Inter Variable', sans-serif", colorBgContainer: dark ? "#121a0c" : "#fff" },
    }}>
      <MotionConfig reducedMotion="user">
        <V app={app} />
        <Toast app={app} />
        {process.env.NODE_ENV !== "production" && (
          <div className="fixed left-1/2 top-2 z-[70] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 rounded-full bg-[#0e0f0c] p-1 text-white shadow-xl ring-1 ring-white/20">
            <button aria-label="Variante anterior" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" onClick={() => go(-1)}><ChevronLeft size={16} /></button>
            <div className="whitespace-nowrap px-1 text-center text-xs font-semibold sm:max-w-none"><span className="text-[#9fe870]">{VARIANTS[idx].key}</span> <span className="sm:hidden">{VARIANTS[idx].short}</span><span className="hidden sm:inline">({VARIANTS[idx].name})</span></div>
            <button aria-label="Próxima variante" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" onClick={() => go(1)}><ChevronRight size={16} /></button>
            <span className="mx-1 h-4 w-px bg-white/25" />
            <button className="whitespace-nowrap rounded-full px-2 py-1 text-[11px] hover:bg-white/15" onClick={() => app.irPara(MES_VAZIO)}>mês vazio</button>
            <button className="whitespace-nowrap rounded-full px-2 py-1 text-[11px] hover:bg-white/15" onClick={() => app.irPara(app.HOJE.slice(0, 7), app.HOJE)}>hoje</button>
            <button aria-label="Alternar tema" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" onClick={toggle}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          </div>
        )}
      </MotionConfig>
    </ConfigProvider>
  );
}
