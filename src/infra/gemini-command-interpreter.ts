import { GoogleGenAI } from "@google/genai";
import { TAGS } from "@/core/domain";
import type { Draft } from "@/core/domain";
import type { CommandInterpreter } from "@/core/ports";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    understood: { type: "boolean", description: "false se o texto não for um Comando de cadastro de Conta" },
    title: { type: "string" },
    amount: { type: "number", nullable: true, description: "Valor em reais, se informado" },
    recurrence: { type: "string", enum: ["monthly", "yearly", "once"] },
    day: { type: "integer", description: "Dia do mês do vencimento (1-31)" },
    month: { type: "integer", nullable: true, description: "Mês (1-12); obrigatório em anual e avulsa" },
    year: { type: "integer", nullable: true, description: "Ano, só em conta avulsa quando dito" },
    startMonth: { type: "string", nullable: true, description: "YYYY-MM do primeiro vencimento, se dito" },
    installments: { type: "integer", nullable: true, description: "Número de parcelas, se dito" },
    endMonth: { type: "string", nullable: true, description: "YYYY-MM do último vencimento, se dito" },
    tags: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", enum: [...TAGS] } },
  },
  required: ["understood", "title", "recurrence", "day", "tags"],
} as const;

const INSTRUCTIONS = `Você interpreta Comandos em português do Brasil para cadastrar uma Conta (cobrança) a pagar.
Regras:
- "todo dia 20" é monthly. "todo 15 de agosto" é yearly. "20 de março" (sem "todo") é once.
- "10x a partir de abril" é monthly com installments=10 e startMonth em abril. Não calcule a data final.
- "desde janeiro" ou "comecei em agosto" define startMonth (use o ano mais recente que não esteja no futuro).
- "até dezembro" define endMonth.
- Escolha de 1 a 3 tags da lista fixa; use "other" se nenhuma servir.
- Não invente valor: omita amount se não foi dito.
- Se o texto não for um cadastro de Conta, devolva understood=false.`;

export class GeminiCommandInterpreter implements CommandInterpreter {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  interpret(text: string, today: string) {
    return this.generate(`Hoje é ${today}.\nComando: ${text}`);
  }

  correct(previous: Draft, correction: string, today: string) {
    return this.generate(
      `Hoje é ${today}.\nO que você entendeu antes (JSON): ${JSON.stringify(previous)}\n` +
        `Correção do Usuário: ${correction}\nDevolva o JSON completo já corrigido, mantendo o que a correção não toca.`,
    );
  }

  private async generate(contents: string): Promise<Draft | null> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: INSTRUCTIONS,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

    let raw: unknown;
    try {
      raw = JSON.parse(response.text ?? "");
    } catch {
      return null;
    }
    if (typeof raw !== "object" || raw === null || (raw as { understood?: unknown }).understood !== true) return null;

    // A IA devolve null nos campos ausentes; o núcleo valida o resto.
    const { understood: _understood, ...fields } = raw as Record<string, unknown>;
    return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)) as unknown as Draft;
  }
}
