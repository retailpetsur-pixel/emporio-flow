import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("LOGIN TRY:", email);
  console.log("LOGIN DATA:", JSON.stringify(data));
  console.log("LOGIN ERROR:", error?.message ?? "sin error");

  if (error) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}