import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { THEME_STORAGE_KEY } from "@/core/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" }); // fonte variável: todos os pesos

export const metadata: Metadata = {
  title: "Contas do mês",
  description: "Organize as contas que você tem a pagar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Aplica o tema antes da hidratação, para não piscar o tema errado. Mesma regra de resolveTheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
