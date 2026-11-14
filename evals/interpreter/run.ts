/**
 * Avaliação do Interpretador contra o Gemini de verdade. Sob demanda, fora do CI:
 *
 *   pnpm eval:interpreter [--intent=<intenção>] [--min=<0-1>] [--verbose]
 *
 * Precisa de `GEMINI_API_KEY` no ambiente ou em `.env.local`. Gasta chamadas reais.
 * Sai com código 1 se a taxa de acerto geral ficar abaixo de `--min` (padrão: não falha).
 */
import { GeminiCommandInterpreter } from "@/infra/gemini-command-interpreter";
import { CASES, EVAL_TODAY } from "./cases";
import { aggregate, scoreCase } from "./score";
import type { CaseScore, EvalCase } from "./score";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [key, value = "true"] = a.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

if (!process.env.GEMINI_API_KEY) {
  console.error("Defina GEMINI_API_KEY (no ambiente ou em .env.local) para rodar a avaliação.");
  process.exit(2);
}

const interpreter = new GeminiCommandInterpreter();
const run = (c: EvalCase) =>
  c.previous
    ? interpreter.correct(c.previous, c.text, c.today ?? EVAL_TODAY)
    : interpreter.interpret(c.text, c.today ?? EVAL_TODAY);

const cases = CASES.filter((c) => !args.intent || c.intent === args.intent);
if (cases.length === 0) {
  console.error(`Nenhuma frase para a intenção "${args.intent}".`);
  process.exit(2);
}

async function evaluate(c: EvalCase): Promise<CaseScore> {
  try {
    return scoreCase(c, await run(c));
  } catch (e) {
    console.error(`  ! ${c.id}: erro ao chamar o Gemini (${e instanceof Error ? e.message : e})`);
    return { ...scoreCase(c, null), fields: { understood: false }, passed: false };
  }
}

async function main() {
  // Poucas chamadas em paralelo, para não estourar a cota.
  const scores: CaseScore[] = new Array(cases.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < cases.length) {
        const i = next++;
        scores[i] = await evaluate(cases[i]);
      }
    }),
  );

  const pct = ({ passed, total }: { passed: number; total: number }) =>
    `${String(Math.round((passed / total) * 100)).padStart(3)}%  (${passed}/${total})`;

  const report = aggregate(scores);
  console.log(`\nInterpretador · ${process.env.GEMINI_MODEL ?? "modelo padrão"} · hoje = ${EVAL_TODAY}\n`);
  console.log("Por intenção");
  for (const [intent, rate] of Object.entries(report.byIntent)) console.log(`  ${intent.padEnd(16)} ${pct(rate)}`);
  console.log("\nPor campo");
  for (const [field, rate] of Object.entries(report.byField)) console.log(`  ${field.padEnd(16)} ${pct(rate)}`);
  console.log(`\nGeral            ${pct(report)}`);

  const failures = scores.map((s, i) => ({ s, c: cases[i] })).filter(({ s }) => !s.passed);
  if (failures.length) {
    console.log("\nErros");
    for (const { s, c } of failures) {
      const wrong = Object.entries(s.fields).filter(([, ok]) => !ok).map(([f]) => f).join(", ");
      console.log(`  ✗ ${c.id} — “${c.text}” — campos: ${wrong}`);
      if (args.verbose) console.log(`      esperado: ${JSON.stringify(c.expect)}\n      veio:     ${JSON.stringify(s.got)}`);
    }
  }

  const min = args.min ? Number(args.min) : 0;
  process.exitCode = report.passed / report.total < min ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
