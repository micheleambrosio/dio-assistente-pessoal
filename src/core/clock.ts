import { monthOf } from "@/lib/month";
import type { Clock } from "./ports";

const TIME_ZONE = "America/Sao_Paulo";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class SaoPauloClock implements Clock {
  constructor(private readonly source: () => Date = () => new Date()) {}

  now() {
    return this.source();
  }

  today() {
    return formatter.format(this.now());
  }

  currentMonth() {
    return monthOf(this.today());
  }
}
