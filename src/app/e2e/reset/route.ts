import { NextResponse } from "next/server";
import { isE2E, resetE2EWorld } from "@/infra/runtime";

/** Só existe nos testes de ponta a ponta (`E2E_FAKES=1`): devolve o mundo falso ao estado inicial. */
export async function POST() {
  if (!isE2E()) return new NextResponse(null, { status: 404 });
  resetE2EWorld();
  return new NextResponse(null, { status: 204 });
}
