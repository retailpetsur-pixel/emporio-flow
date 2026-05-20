"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/emporio/sidebar";
import { createClient } from "@/lib/supabase-browser";

type Categoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

type Insumo = {
  id: string;
  nombre: string;
  familia_id: string | null;
  unidad_uso: string | null;
  costo_unitario_uso: number | null;
};

type Producto = {
  id: string;
  nombre: string;
  familia_receta_id: string | null;
  categoria: string;
  precio_venta_actual: number | null;
  costo_unitario_calculado: number | null;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function decimal(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function factorConversion(unidadReferencia: string, unidadUso: string) {
  if (unidadReferencia === "kg" && unidadUso === "grs") return 1000;
  if (unidadReferencia === "litros" && unidadUso === "ml") return 1000;
  if (unidadReferencia === unidadUso) return 1;
  throw new Error("Conversión no válida.");
}

export default function MaestrosPage() {
  const supabase = createClient();

  const [tab, setTab] = useState<"insumos" | "productos">("insumos");
  const [mensaje, setMensaje] = useState("");

  const [categoriasInsumos, setCategoriasInsumos] = useState<Categoria[]>([]);
  const [categoriasProductos, setCategoriasProductos] = useState<Categoria[]>(
    []
  );
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [nombreCatInsumo, setNombreCatInsumo] = useState("");
  const [descCatInsumo, setDescCatInsumo] = useState("");

  const [nombreCatProducto, setNombreCatProducto] = useState("");
  const [descCatProducto, setDescCatProducto] = useState("");

  const [insumoNombre, setInsumoNombre] = useState("");
  const [insumoCategoriaId, setInsumoCategoriaId] = useState("");
  const [precioReferencia, setPrecioReferencia] = useState("");
  const unidadReferencia = "kg";
  const [cantidadFormato, setCantidadFormato] = useState("1");
  const unidadFormato = "kg";
  const unidadUso = "grs";

  const [productoNombre, setProductoNombre] = useState("");
  const [productoCategoriaId, setProductoCategoriaId] = useState("");
  const [productoPrecio, setProductoPrecio] = useState("0");

  async function cargarDatos() {
    const [catInsumosRes, catProductosRes, insumosRes, productosRes] =
      await Promise.all([
        supabase
          .from("familias_productos")
          .select("id,nombre,descripcion")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("familias_recetas")
          .select("id,nombre,descripcion")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("insumos_costeo")
          .select("id,nombre,familia_id,unidad_uso,costo_unitario_uso")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("recetas")
          .select(
            "id,nombre,familia_receta_id,categoria,precio_venta_actual,costo_unitario_calculado"
          )
          .eq("activo", true)
          .order("nombre"),
      ]);

    setCategoriasInsumos((catInsumosRes.data ?? []) as Categoria[]);
    setCategoriasProductos((catProductosRes.data ?? []) as Categoria[]);
    setInsumos((insumosRes.data ?? []) as Insumo[]);
    setProductos((productosRes.data ?? []) as Producto[]);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    cargarDatos();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function crearCategoriaInsumo() {
    try {
      const { error } = await supabase.from("familias_productos").upsert(
        [
          {
            nombre: nombreCatInsumo.trim(),
            descripcion: descCatInsumo || null,
            activo: true,
          },
        ],
        { onConflict: "nombre" }
      );
      if (error) throw error;
      setNombreCatInsumo("");
      setDescCatInsumo("");
      setMensaje("✅ Categoría de insumo guardada.");
      cargarDatos();
    } catch {
      setMensaje("Error al guardar categoría.");
    }
  }

  async function crearCategoriaProducto() {
    try {
      const { error } = await supabase.from("familias_recetas").upsert(
        [
          {
            nombre: nombreCatProducto.trim(),
            descripcion: descCatProducto || null,
            activo: true,
          },
        ],
        { onConflict: "nombre" }
      );
      if (error) throw error;
      setNombreCatProducto("");
      setDescCatProducto("");
      setMensaje("✅ Categoría de producto guardada.");
      cargarDatos();
    } catch {
      setMensaje("Error al guardar categoría.");
    }
  }

  async function crearInsumo() {
    try {
      const precio = decimal(precioReferencia);
      const cantidad = decimal(cantidadFormato);
      const factor = factorConversion(unidadReferencia, unidadUso);

      const { error } = await supabase.from("insumos_costeo").insert([
        {
          nombre: insumoNombre.trim(),
          familia_id: insumoCategoriaId,
          precio_referencia: precio,
          unidad_referencia: unidadReferencia,
          cantidad_formato_compra: cantidad,
          unidad_formato_compra: unidadFormato,
          costo_total_formato: precio * cantidad,
          unidad_uso: unidadUso,
          factor_conversion_uso: factor,
          costo_unitario_uso: precio / factor,
          activo: true,
        },
      ]);

      if (error) throw error;

      setInsumoNombre("");
      setPrecioReferencia("");
      setCantidadFormato("1");
      setMensaje("✅ Insumo creado.");
      cargarDatos();
    } catch {
      setMensaje("Error al crear insumo.");
    }
  }

  async function crearProducto() {
    try {
      const categoria = categoriasProductos.find(
        (x) => x.id === productoCategoriaId
      );

      const { error } = await supabase.from("recetas").insert([
        {
          nombre: productoNombre.trim(),
          categoria: categoria?.nombre ?? "",
          familia_receta_id: productoCategoriaId,
          precio_venta_actual: decimal(productoPrecio),
          porciones: 1,
          activo: true,
        },
      ]);

      if (error) throw error;

      setProductoNombre("");
      setProductoPrecio("0");
      setMensaje("✅ Producto creado.");
      cargarDatos();
    } catch {
      setMensaje("Error al crear producto.");
    }
  }

  const insumosPorCategoria = useMemo(
    () =>
      categoriasInsumos.map((cat) => ({
        categoria: cat,
        items: insumos.filter((i) => i.familia_id === cat.id),
      })),
    [categoriasInsumos, insumos]
  );

  const productosPorCategoria = useMemo(
    () =>
      categoriasProductos.map((cat) => ({
        categoria: cat,
        items: productos.filter((p) => p.familia_receta_id === cat.id),
      })),
    [categoriasProductos, productos]
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
          <header className="border-b bg-white px-6 py-5">
            <p className="text-sm text-slate-500">Emporio Flow</p>
            <h1 className="text-3xl font-bold text-slate-900">
              Maestros / Carga base
            </h1>
          </header>

          <div className="space-y-6 p-6">
            {mensaje && (
              <div className="rounded-xl bg-white px-4 py-3 shadow text-sm">
                {mensaje}
              </div>
            )}

            <div className="rounded-2xl bg-white p-2 shadow">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTab("insumos")}
                  className={`rounded-xl py-3 font-semibold ${
                    tab === "insumos"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100"
                  }`}
                >
                  INSUMOS
                </button>

                <button
                  onClick={() => setTab("productos")}
                  className={`rounded-xl py-3 font-semibold ${
                    tab === "productos"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100"
                  }`}
                >
                  PRODUCTOS
                </button>
              </div>
            </div>

            {tab === "insumos" ? (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl bg-white p-6 shadow space-y-3">
                    <h2 className="font-bold text-xl">Nueva categoría</h2>
                    <input
                      value={nombreCatInsumo}
                      onChange={(e) => setNombreCatInsumo(e.target.value)}
                      placeholder="Carnes"
                      className="w-full rounded-xl border px-4 py-3"
                    />
                    <input
                      value={descCatInsumo}
                      onChange={(e) => setDescCatInsumo(e.target.value)}
                      placeholder="Descripción"
                      className="w-full rounded-xl border px-4 py-3"
                    />
                    <button
                      onClick={crearCategoriaInsumo}
                      className="w-full rounded-xl bg-slate-900 py-3 text-white"
                    >
                      Guardar categoría
                    </button>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow space-y-3">
                    <h2 className="font-bold text-xl">Nuevo insumo</h2>

                    <select
                      value={insumoCategoriaId}
                      onChange={(e) => setInsumoCategoriaId(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3"
                    >
                      <option value="">Categoría</option>
                      {categoriasInsumos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      value={insumoNombre}
                      onChange={(e) => setInsumoNombre(e.target.value)}
                      placeholder="Tapapecho"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <input
                      value={precioReferencia}
                      onChange={(e) => setPrecioReferencia(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      placeholder="Precio"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <button
                      onClick={crearInsumo}
                      className="w-full rounded-xl bg-emerald-600 py-3 text-white"
                    >
                      Guardar insumo
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {insumosPorCategoria.map(({ categoria, items }) => (
                    <div key={categoria.id} className="rounded-2xl bg-white p-5 shadow">
                      <h3 className="font-bold uppercase">{categoria.nombre}</h3>

                      <div className="mt-4 space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="font-semibold">{item.nombre}</p>
                            <p className="text-xs text-slate-500">
                              {money(Number(item.costo_unitario_uso ?? 0))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl bg-white p-6 shadow space-y-3">
                    <h2 className="font-bold text-xl">Nueva categoría</h2>

                    <input
                      value={nombreCatProducto}
                      onChange={(e) => setNombreCatProducto(e.target.value)}
                      placeholder="Empanadas"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <input
                      value={descCatProducto}
                      onChange={(e) => setDescCatProducto(e.target.value)}
                      placeholder="Descripción"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <button
                      onClick={crearCategoriaProducto}
                      className="w-full rounded-xl bg-slate-900 py-3 text-white"
                    >
                      Guardar categoría
                    </button>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow space-y-3">
                    <h2 className="font-bold text-xl">Nuevo producto</h2>

                    <select
                      value={productoCategoriaId}
                      onChange={(e) => setProductoCategoriaId(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3"
                    >
                      <option value="">Categoría</option>
                      {categoriasProductos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      value={productoNombre}
                      onChange={(e) => setProductoNombre(e.target.value)}
                      placeholder="Empanada mechada queso"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <input
                      value={productoPrecio}
                      onChange={(e) => setProductoPrecio(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      placeholder="Precio venta"
                      className="w-full rounded-xl border px-4 py-3"
                    />

                    <button
                      onClick={crearProducto}
                      className="w-full rounded-xl bg-emerald-600 py-3 text-white"
                    >
                      Guardar producto
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {productosPorCategoria.map(({ categoria, items }) => (
                    <div key={categoria.id} className="rounded-2xl bg-white p-5 shadow">
                      <h3 className="font-bold uppercase">{categoria.nombre}</h3>

                      <div className="mt-4 space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-slate-50 px-3 py-3 flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-semibold">{item.nombre}</p>
                              <p className="text-xs text-slate-500">
                                Venta: {money(Number(item.precio_venta_actual ?? 0))}
                              </p>
                            </div>

                            <a
                              href={`/recetas-costos?id=${item.id}`}
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white"
                            >
                              Costear
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
