/** Máscara de valor em R$: os dígitos digitados entram pela direita, como centavos ("12345" → "R$ 123,45"). */
const MAX_DIGITS = 11; // numeric(12, 2) comporta até 10 dígitos inteiros; 11 dígitos = 9 inteiros + centavos

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** `1234.5` → `R$ 1.234,50`, com espaço não separável entre o símbolo e o número (para a tela). */
export const formatMoney = (value: number) => brl.format(value);

/** Igual a `formatMoney`, mas com espaço comum: para campos de texto e para o evento do Calendar. */
export const formatMoneyText = (value: number) => formatMoney(value).replace(/\u00a0/g, " ");

export function maskMoney(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  return formatMoneyText(Number(digits) / 100);
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
