import type { CommandInterpreter, Preview } from "../ports";

export class FakeCommandInterpreter implements CommandInterpreter {
  constructor(private readonly preview: Preview = { summary: "" }) {}

  async interpret() {
    return this.preview;
  }
}
