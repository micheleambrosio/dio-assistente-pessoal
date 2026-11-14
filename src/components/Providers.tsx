"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import { useSyncExternalStore, type ReactNode } from "react";

const query = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function Providers({ children }: { children: ReactNode }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#9fe870",
            colorTextLightSolid: "#163300",
            borderRadius: 10,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
