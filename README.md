# Emporio Flow

Sistema operativo interno para inventario, compras, recetas, producción,
personal y dashboard diario.

## Comandos

```bash
npm run dev
npm run lint
npm test -- --run
npm run build
npm run check:schema
npm run check
```

`npm run check:schema` compara las consultas principales de la app contra el
esquema real de Supabase configurado en `.env.local`. Úsalo antes de desplegar
cuando cambien tablas, columnas o relaciones.

## Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Opcionalmente se puede usar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Validación De Producción

Antes de subir cambios:

```bash
npm run lint
npm test -- --run
npm run build
npm run check:schema
```

## Base De Datos

Los SQL operativos viven en `sql/`. El archivo
`sql/2026-05-19_schema_alignment.sql` deja documentadas las columnas y tabla
pendientes para activar historial de compras y campos extendidos del cuaderno
semanal.

No apliques cambios en Supabase sin correr luego:

```bash
npm run check:schema
```
