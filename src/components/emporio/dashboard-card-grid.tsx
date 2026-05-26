"use client";

import { type AppearanceSettings, defaultAppearanceSettings } from "@/lib/appearance";

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

const cardSizeStyles = {
  compacta: {
    card: "p-4",
    body: "gap-3 sm:min-h-44",
    metric: "text-2xl sm:text-3xl",
  },
  normal: {
    card: "p-4 sm:min-h-64 sm:p-5",
    body: "gap-4 sm:min-h-56 sm:gap-5",
    metric: "text-3xl sm:text-4xl",
  },
  amplia: {
    card: "p-5 sm:min-h-72 sm:p-6",
    body: "gap-5 sm:min-h-64",
    metric: "text-4xl sm:text-5xl",
  },
};

const iconSizeStyles = {
  normal: "h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl",
  grande: "h-16 w-16 text-3xl sm:h-20 sm:w-20 sm:text-4xl",
  extra: "h-20 w-20 text-4xl sm:h-24 sm:w-24 sm:text-5xl",
};

const aspectStyles = {
  auto: "",
  cuadrada: "sm:aspect-square",
  horizontal: "sm:min-h-48",
};

export default function DashboardCardGrid({
  cards,
  appearance = defaultAppearanceSettings,
}: {
  cards: DashboardCardItem[];
  appearance?: AppearanceSettings;
}) {
  const orderedCards = applySavedOrder(cards, appearance.dashboardOrder);
  const size = cardSizeStyles[appearance.cardSize];
  const showDescription = appearance.textDensity !== "resumida";
  const descriptionClass =
    appearance.textDensity === "detallada"
      ? "text-sm leading-6 text-slate-600"
      : "line-clamp-2 text-sm leading-6 text-slate-600";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {orderedCards.map((card) => {
        const styles = toneStyles[card.tone];

        return (
          <article
            key={card.id}
            className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm transition ${size.card} ${aspectStyles[appearance.cardAspect]} ${styles.ring} hover:-translate-y-0.5`}
          >
            <div className={`flex h-full flex-col justify-between ${size.body}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {card.title}
                  </h4>
                  <p className={`mt-2 break-words font-bold tracking-tight text-slate-950 sm:mt-3 ${size.metric}`}>
                    {card.metric}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center justify-center rounded-2xl ${iconSizeStyles[appearance.iconSize]} ${styles.icon}`}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
              </div>

              {showDescription ? (
                <p className={descriptionClass}>{card.description}</p>
              ) : null}

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
