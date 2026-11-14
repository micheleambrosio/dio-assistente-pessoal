import { SaoPauloClock } from "../clock";

export class FixedClock extends SaoPauloClock {
  constructor(instant: Date) {
    super(() => instant);
  }
}
