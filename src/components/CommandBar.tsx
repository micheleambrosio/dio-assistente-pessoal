/** Entrada de Comando: fixa no rodapé, sem opção de esconder. A interpretação vem nas próximas fatias. */
export function CommandBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg px-4 py-3">
      <form className="mx-auto flex max-w-5xl gap-2" aria-label="Comando">
        <input
          type="text"
          disabled
          placeholder="Ex.: internet Vivo, 120, todo dia 15"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-ink placeholder:text-muted disabled:cursor-not-allowed"
        />
      </form>
    </div>
  );
}
