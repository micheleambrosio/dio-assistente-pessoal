import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export const metadata: Metadata = { title: "PROTÓTIPO · Contas do mês" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body><AntdRegistry>{children}</AntdRegistry></body>
    </html>
  );
}
