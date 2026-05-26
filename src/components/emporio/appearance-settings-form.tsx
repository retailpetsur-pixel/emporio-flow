"use client";

import { useMemo, useState } from "react";
import {
  type AppearanceSettings,
  defaultAppearanceSettings,
} from "@/lib/appearance";
import { type DashboardCardItem } from "@/components/emporio/dashboard-card-grid";

function applyOrder(cards: DashboardCardItem[], order: string[]) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter(Boolean) as DashboardCardItem[];
  const missing = cards.filter((card) => !order.includes(card.id));

  return [...ordered, ...missing];
}

export default function AppearanceSettingsForm({
  action,
  cards,
  settings,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cards: DashboardCardItem[];
  settings: AppearanceSettings;
  disabled: boolean;
}) {
  const initialCards = useMemo(
    () => applyOrder(cards, settings.dashboardOrder),
    [cards, settings.dashboardOrder]
  );
  const [orderedCards, setOrderedCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function moveCard(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const fromIndex = orderedCards.findIndex((card) => card.id === draggingId);
    const toIndex = orderedCards.findIndex((card) => card.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...orderedCards];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedCards(next);
  }

  return (
    <form action={action} className="grid gap-5">
      <input
        type="hidden"
        name="dashboard_order"
        value={orderedCards.map((card) => card.id).join(",")}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Tamaño de cards
          <select
            name="card_size"
            defaultValue={settings.cardSize}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal disabled:bg-slate-100"
          >
            <option value="compacta">Compacta</option>
            <option value="normal">Normal</option>
            <option value="amplia">Amplia</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Tamaño de iconos
          <select
            name="icon_size"
            defaultValue={settings.iconSize}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal disabled:bg-slate-100"
          >
            <option value="normal">Normal</option>
            <option value="grande">Grande</option>
            <option value="extra">Extra grande</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Relación de texto
          <select
            name="text_density"
            defaultValue={settings.textDensity}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal disabled:bg-slate-100"
          >
            <option value="resumida">Resumida</option>
            <option value="normal">Normal</option>
            <option value="detallada">Detallada</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Relación de aspecto
          <select
            name="card_aspect"
            defaultValue={settings.cardAspect}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal disabled:bg-slate-100"
          >
            <option value="auto">Automática</option>
            <option value="cuadrada">Más cuadrada</option>
            <option value="horizontal">Más horizontal</option>
          </select>
        </label>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
              Orden global del dashboard
            </h3>
            <p className="text-sm text-slate-500">
              Arrastra una card sobre otra para definir el orden de todos.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOrderedCards(applyOrder(cards, defaultAppearanceSettings.dashboardOrder))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
          >
            Restaurar orden
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {orderedCards.map((card) => (
            <article
              key={card.id}
              draggable={!disabled}
              onDragStart={() => setDraggingId(card.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveCard(card.id)}
              className={`cursor-grab rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition active:cursor-grabbing ${
                draggingId === card.id ? "scale-[0.98] opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-slate-950">
                    {card.title}
                  </h4>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {card.description}
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">
                  {card.icon}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Guardar apariencia global
      </button>
    </form>
  );
}
