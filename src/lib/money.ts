/** Máscara de valor em R$: os dígitos digitados entram pela direita, como centavos ("12345" → "R$ 123,45"). */
const MAX_DIGITS = 11; // numeric(12, 2) comporta até 10 dígitos inteiros; 11 dígitos = 9 inteiros + centavos

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function maskMoney(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  return brl.format(Number(digits) / 100).replace(/ /g, " ");
}

/** "R$ 1.234,56" → 1234.56; vazio → undefined. */
export function unmaskMoney(masked: string): number | undefined {
  const digits = masked.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : undefined;
}

/** Valor numérico → texto já mascarado, para preencher o campo. */
export function toMasked(value: number | undefined): string {
  return value === undefined ? "" : maskMoney(String(Math.round(value * 100)));
}
