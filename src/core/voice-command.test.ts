import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, confirmPreview, correctPreview, interpretVoiceCommand } from "./commands";
import type { AudioInput, Draft } from "./domain";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "./fakes/fake-command-interpreter";
import { FixedClock } from "./fakes/fixed-clock";
import { InMemoryRepository } from "./fakes/in-memory-repository";

const USER = "user-1";
const monthly: Draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"] };
const audio: AudioInput = { data: new Uint8Array([1, 2, 3]), mimeType: "audio/webm" };

function setup(voiceResult: { draft: Draft; transcript: string } | null = null, correctResult: Draft | null = null) {
  const repository = new InMemoryRepository();
  const interpreter = new FakeCommandInterpreter(null, correctResult, voiceResult);
  const clock = new FixedClock(new Date("2025-01-10T12:00:00-03:00"));
  return { deps: { repository, interpreter, clock, calendar: new FakeCalendarGateway(), appUrl: "https://contas.example.com" }, repository, interpreter };
}

describe("interpretVoiceCommand", () => {
  it("devolve a Prévia com a transcrição ('Você disse: …'), sem persistir nada", async () => {
    const { deps, repository, interpreter } = setup({ draft: monthly, transcript: "internet Vivo cento e vinte todo dia quinze" });

    const result = await interpretVoiceCommand(deps, USER, audio);

    expect(result).toEqual({
      ok: true,
      preview: {
        ...monthly,
        action: "create_bill",
        source: "voice",
        originalText: "internet Vivo cento e vinte todo dia quinze",
        startDate: "2025-01-15",
      },
    });
    expect(interpreter.audioCalls).toEqual([{ audio, today: "2025-01-10" }]);
    expect(await repository.listBills(USER)).toEqual([]);
  });

  it("devolve not_understood quando a IA não entende o áudio", async () => {
    const { deps } = setup(null);
    expect(await interpretVoiceCommand(deps, USER, audio)).toEqual({ ok: false, error: "not_understood" });
  });

  it("devolve not_understood quando a transcrição vem vazia", async () => {
    const { deps } = setup({ draft: monthly, transcript: "   " });
    expect(await interpretVoiceCommand(deps, USER, audio)).toEqual({ ok: false, error: "not_understood" });
  });

  it.each([
    ["vazio", { data: new Uint8Array(), mimeType: "audio/webm" }],
    ["grande demais", { data: new Uint8Array(MAX_AUDIO_BYTES + 1), mimeType: "audio/webm" }],
    ["que não é áudio", { data: new Uint8Array([1]), mimeType: "text/plain" }],
  ] as [string, AudioInput][])("recusa um áudio %s sem chamar a IA", async (_name, invalid) => {
    const { deps, interpreter } = setup({ draft: monthly, transcript: "x" });
    expect(await interpretVoiceCommand(deps, USER, invalid)).toEqual({ ok: false, error: "invalid_audio" });
    expect(interpreter.audioCalls).toEqual([]);
  });
});

describe("Prévia falada", () => {
  async function voicePreview(correctResult: Draft | null = null) {
    const ctx = setup({ draft: monthly, transcript: "internet Vivo, todo dia quinze" }, correctResult);
    const result = await interpretVoiceCommand(ctx.deps, USER, audio);
    if (!result.ok) throw new Error("esperava uma Prévia");
    return { ...ctx, preview: result.preview };
  }

  it("a correção mantém a transcrição e a origem de voz", async () => {
    const { deps, preview } = await voicePreview({ ...monthly, day: 16 });
    const result = await correctPreview(deps, USER, preview, "não, é dia 16");
    expect(result).toEqual({
      ok: true,
      preview: { ...preview, day: 16, startDate: "2025-01-16" },
    });
    expect(result.ok && result.preview.source).toBe("voice");
  });

  it("só salva a Conta na confirmação", async () => {
    const { deps, repository, preview } = await voicePreview();
    expect(await repository.listBills(USER)).toEqual([]);
    expect(await confirmPreview(deps, USER, preview)).toMatchObject({ ok: true });
    expect(await repository.listBills(USER)).toHaveLength(1);
  });
});
