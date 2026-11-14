"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_STORAGE_KEY, parseThemePreference, resolveTheme, type ThemePreference } from "@/core/theme";

const query = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "theme-preference-change";

function subscribeSystem(callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

const subscribeNever = () => () => {};

function subscribePreference(callback: () => void) {
  window.addEventListener("storage", callback); // outra aba
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// Fallback quando o localStorage não está disponível (modo privado): vale até recarregar.
let memoryPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return memoryPreference ?? "system";
  }
}

const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void }>({
  preference: "system",
  setPreference: () => {},
});

export const useThemePreference = () => useContext(ThemeContext);

export function Providers({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribePreference, readPreference, () => "system" as const);
  const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia(query).matches, () => false);
  const effective = resolveTheme(preference, systemDark);

  const setPreference = useCallback((value: ThemePreference) => {
    memoryPreference = value;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // sem armazenamento: fica só em memória
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  // Durante a hidratação os snapshots do servidor dão "light"; não sobrescreve o tema que o script do <head> já aplicou.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  useEffect(() => {
    if (hydrated) document.documentElement.dataset.theme = effective;
  }, [hydrated, effective]);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: effective === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#9fe870",
            colorTextLightSolid: "#163300",
            borderRadius: 10,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          },
        }}
      >
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
      </ConfigProvider>
    </AntdRegistry>
  );
}
