import { supabase } from "@/lib/supabase";

export default async function TestDbPage() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .limit(1);

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">
          Test conexión Supabase
        </h1>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">
          <pre>{JSON.stringify({ data, error }, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}