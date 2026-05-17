import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

async function cerrarSesion(request: Request) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function GET(request: Request) {
  return cerrarSesion(request);
}

export async function POST(request: Request) {
  return cerrarSesion(request);
}
