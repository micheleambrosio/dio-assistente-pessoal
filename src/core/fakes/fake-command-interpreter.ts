import type { AudioInput, Draft } from "../domain";
import type { CommandInterpreter } from "../ports";

export class FakeCommandInterpreter implements CommandInterpreter {
  interpretCalls: { text: string; today: string }[] = [];
  audioCalls: { audio: AudioInput; today: string }[] = [];
  correctCalls: { previous: Draft; correction: string; today: string }[] = [];

  constructor(
    public interpretResult: Draft | null = null,
    public correctResult: Draft | null = null,
    public audioResult: { draft: Draft; transcript: string } | null = null,
  ) {}

  async interpretAudio(audio: AudioInput, today: string) {
    this.audioCalls.push({ audio, today });
    return this.audioResult;
  }

  async interpret(text: string, today: string) {
    this.interpretCalls.push({ text, today });
    return this.interpretResult;
  }

  async correct(previous: Draft, correction: string, today: string) {
    this.correctCalls.push({ previous, correction, today });
    return this.correctResult;
  }
}
