import { signInWithGoogle } from "./actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <h1 className="text-6xl font-black uppercase leading-none tracking-tight">Contas do mês</h1>
      <p className="text-muted">Entre com a sua conta Google para organizar o que você tem a pagar.</p>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-full bg-lime px-6 py-3 font-semibold text-forest transition hover:brightness-95"
        >
          Entrar com Google
        </button>
      </form>
    </main>
  );
}
