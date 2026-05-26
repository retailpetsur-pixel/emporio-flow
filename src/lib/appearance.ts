export type CardSize = "compacta" | "normal" | "amplia";
export type IconSize = "normal" | "grande" | "extra";
export type TextDensity = "resumida" | "normal" | "detallada";
export type CardAspect = "auto" | "cuadrada" | "horizontal";

export type AppearanceSettings = {
  dashboardOrder: string[];
  cardSize: CardSize;
  iconSize: IconSize;
  textDensity: TextDensity;
  cardAspect: CardAspect;
};

export const defaultAppearanceSettings: AppearanceSettings = {
  dashboardOrder: [],
  cardSize: "normal",
  iconSize: "normal",
  textDensity: "normal",
  cardAspect: "auto",
};

const cardSizes: CardSize[] = ["compacta", "normal", "amplia"];
const iconSizes: IconSize[] = ["normal", "grande", "extra"];
const textDensities: TextDensity[] = ["resumida", "normal", "detallada"];
const cardAspects: CardAspect[] = ["auto", "cuadrada", "horizontal"];

function pickOption<T extends string>(value: unknown, options: T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : fallback;
}

export function parseAppearanceSettings(value: unknown): AppearanceSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAppearanceSettings;
  }

  const raw = value as Partial<Record<keyof AppearanceSettings, unknown>>;

  return {
    dashboardOrder: Array.isArray(raw.dashboardOrder)
      ? raw.dashboardOrder.filter((item): item is string => typeof item === "string")
      : defaultAppearanceSettings.dashboardOrder,
    cardSize: pickOption(
      raw.cardSize,
      cardSizes,
      defaultAppearanceSettings.cardSize
    ),
    iconSize: pickOption(
      raw.iconSize,
      iconSizes,
      defaultAppearanceSettings.iconSize
    ),
    textDensity: pickOption(
      raw.textDensity,
      textDensities,
      defaultAppearanceSettings.textDensity
    ),
    cardAspect: pickOption(
      raw.cardAspect,
      cardAspects,
      defaultAppearanceSettings.cardAspect
    ),
  };
}
