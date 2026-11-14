import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Suíte de ponta a ponta da tela principal. O servidor sobe com `E2E_FAKES=1`: portas falsas,
 * Clock fixo em 12/06/2025 e os dados do protótipo (ver `src/infra/runtime.ts`).
 * Light e dark × mobile e desktop.
 */
const themes = ["light", "dark"] as const;
const viewports = {
  desktop: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
  mobile: { ...devices["Pixel 7"] },
};

export default defineConfig({
  testDir: "./e2e",
  // O servidor guarda um único mundo falso em memória: os testes rodam em série e se resetam.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, locale: "pt-BR", timezoneId: "America/Sao_Paulo", trace: "retain-on-failure" },
  projects: Object.entries(viewports).flatMap(([viewport, device]) =>
    themes.map((colorScheme) => ({ name: `${viewport}-${colorScheme}`, use: { ...device, colorScheme } })),
  ),
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      E2E_FAKES: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e", // também liga o modo falso (ver isE2E),
    },
  },
});
