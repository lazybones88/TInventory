import { NextResponse } from "next/server";
import { usingPostgres } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    database: usingPostgres() ? "postgres" : "local-file",
  });
}
