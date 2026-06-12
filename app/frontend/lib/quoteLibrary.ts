import AsyncStorage from "@react-native-async-storage/async-storage";
import { SEED_TEMPLATES, type QuoteItemTemplate, type QuoteUnit, type InputMode } from "./quoteTemplates";

/**
 * Repository for the reusable item library (Repository pattern). Seed templates
 * are read-only; designer-created templates persist locally via AsyncStorage.
 * (Backend sync to `/api/quotation/templates` is a later phase.)
 */
const STORAGE_KEY = "quote_custom_templates_v1";

/** Input mode is derived from the unit so the designer never has to pick it. */
export function inputModeForUnit(unit: QuoteUnit): InputMode {
  return unit === "sqft" || unit === "ftrun" ? "measure" : "count";
}

export function makeTemplateId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `custom-${slug || "item"}-${Date.now().toString(36)}`;
}

async function readCustom(): Promise<QuoteItemTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuoteItemTemplate[]) : [];
  } catch {
    return [];
  }
}

async function writeCustom(items: QuoteItemTemplate[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Custom templates carry an `isCustom` marker so the UI can offer edit/delete. */
export type LibraryTemplate = QuoteItemTemplate & { isCustom?: boolean };

/** Seed + custom, custom first so freshly-created items surface at the top. */
export async function loadTemplates(): Promise<LibraryTemplate[]> {
  const custom = await readCustom();
  return [
    ...custom.map((t) => ({ ...t, isCustom: true as const })),
    ...SEED_TEMPLATES,
  ];
}

/** Upsert a designer-created template (create or edit). */
export async function saveTemplate(template: QuoteItemTemplate): Promise<void> {
  const custom = await readCustom();
  const idx = custom.findIndex((t) => t.id === template.id);
  if (idx >= 0) custom[idx] = template;
  else custom.unshift(template);
  await writeCustom(custom);
}

export async function deleteTemplate(id: string): Promise<void> {
  const custom = await readCustom();
  await writeCustom(custom.filter((t) => t.id !== id));
}

export async function getCustomTemplate(id: string): Promise<QuoteItemTemplate | null> {
  const custom = await readCustom();
  return custom.find((t) => t.id === id) ?? null;
}
