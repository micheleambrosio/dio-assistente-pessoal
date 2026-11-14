/** Indicador de carregamento. `label` é lido por leitores de tela. */
export function Spinner({ label = "Carregando", className = "size-4" }: { label?: string; className?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <span
        aria-hidden="true"
        className={`${className} animate-spin rounded-full border-2 border-current border-t-transparent`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
