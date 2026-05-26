"use client";

import { useEffect, useMemo, useState } from "react";

export type DashboardCardItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  metric: string;
  action: string;
  icon: string;
  tone: "emerald" | "amber" | "sky" | "violet" | "slate" | "rose" | "cyan";
};

const storageKey = "emporio-flow-dashboard-card-order";

const toneStyles: Record<
  DashboardCardItem["tone"],
  {
    icon: string;
    action: string;
    ring: string;
  }
> = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    action: "text-emerald-700",
    ring: "hover:border-emerald-200",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    action: "text-amber-700",
    ring: "hover:border-amber-200",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700",
    action: "text-sky-700",
    ring: "hover:border-sky-200",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    action: "text-violet-700",
    ring: "hover:border-violet-200",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    action: "text-slate-700",
    ring: "hover:border-slate-300",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    action: "text-rose-700",
    ring: "hover:border-rose-200",
  },
  cyan: {
    icon: "bg-cyan-100 text-cyan-700",
    action: "text-cyan-700",
    ring: "hover:border-cyan-200",
  },
};

function applySavedOrder(cards: DashboardCardItem[], order: string[]) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter(Boolean) as DashboardCardItem[];
  const missing = cards.filter((card) => !order.includes(card.id));

  return [...ordered, ...missing];
}

export default function DashboardCardGrid({
  cards,
}: {
  cards: DashboardCardItem[];
}) {
  const [orderedCards, setOrderedCards] = useState(cards);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const savedOrder = window.localStorage.getItem(storageKey);

    if (!savedOrder) {
      return;
    }

    try {
      const parsed = JSON.parse(savedOrder);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderedCards(Array.isArray(parsed) ? applySavedOrder(cards, parsed) : cards);
    } catch {
      setOrderedCards(cards);
    }
  }, [cards]);

  const orderIds = useMemo(
    () => orderedCards.map((card) => card.id),
    [orderedCards]
  );

  function moveCard(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const fromIndex = orderIds.indexOf(draggingId);
    const toIndex = orderIds.indexOf(targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...orderedCards];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedCards(next);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(next.map((card) => card.id))
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {orderedCards.map((card) => {
        const styles = toneStyles[card.tone];
        const isDragging = draggingId === card.id;

        return (
          <article
            key={card.id}
            draggable
            onDragStart={() => setDraggingId(card.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveCard(card.id)}
            className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition sm:min-h-64 sm:p-5 ${styles.ring} ${
              isDragging ? "scale-[0.98] opacity-60" : "hover:-translate-y-0.5"
            }`}
          >
            <div className="flex h-full cursor-grab flex-col justify-between gap-4 active:cursor-grabbing sm:min-h-56 sm:gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {card.title}
                  </h4>
                  <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:mt-3 sm:text-4xl">
                    {card.metric}
                  </p>
                </div>
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl sm:h-16 sm:w-16 sm:text-3xl ${styles.icon}`}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
              </div>

              <p className="text-sm leading-6 text-slate-600">
                {card.description}
              </p>

              <a
                href={card.href}
                className={`text-sm font-bold ${styles.action} hover:underline`}
              >
                {card.action}
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
