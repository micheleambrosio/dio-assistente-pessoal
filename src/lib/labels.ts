/** Rótulos pt-BR da interface; o código usa os valores em inglês (ADR 0006). */
import type { Recurrence, Tag } from "@/core/domain";

export const TAG_LABELS: Record<Tag, string> = {
  housing: "Moradia",
  utilities: "Utilidades",
  transportation: "Transporte",
  health: "Saúde",
  education: "Educação",
  subscriptions: "Assinaturas",
  credit_card: "Cartão",
  taxes: "Impostos",
  insurance: "Seguros",
  leisure: "Lazer",
  other: "Outros",
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  once: "Avulsa",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatMoney = (value: number) => brl.format(value);

/** `2025-08-15` → `15/08/2025` */
export const formatDate = (date: string) => date.split("-").reverse().join("/");
