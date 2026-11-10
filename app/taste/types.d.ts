// Smaakprofiel: datamodel en contract. Plan en eigenaars: docs/SMAAKPROFIEL.md.
// De browsercode is gewone JavaScript zonder build (zie AGENTS.md); deze declaraties zijn de
// TypeScript-bron van waarheid en worden met JSDoc in app/taste/*.js en de server gebruikt.

/** Kenmerkdimensies. Alleen velden die Nikki per stuk invult en controleert; niets afgeleid uit foto's. */
export type Dimension =
  | 'material' // data.material, bv. "Wol"
  | 'model'    // data.model, bv. "Sjaalkraag" (silhouet/kraag)
  | 'colour'   // data.colour
  | 'length'   // data.length, bv. "Knielang"
  | 'fit'      // data.fit, bv. "Getailleerd"
  | 'era'      // data.era, bv. "Jaren 70"
  | 'detail'   // data.details[], zonder conditiewoorden (Vlek, Reparatie, ...)
  | 'fur'      // data.furClass: "Ja" | "Alleen kraag of rand" | "Nee"
  | 'price';   // prijsklasse, afgeleid van data.priceMinor (zie PRICE_BANDS)

/** `${dimensie}:${genormaliseerde waarde}`, bv. "colour:zwart", "price:100-200". Max 80 tekens. */
export type FeatureKey = `${Dimension}:${string}`;

/** Geleerde voorkeur voor één kenmerk. `w` vervalt met een halveringstijd vanaf `t`. */
export interface FeatureWeight {
  w: number;      // -3 … 3, positief = meer zoals dit
  t: number;      // ms sinds epoch van de laatste wijziging; verval wordt bij lezen toegepast
  label: string;  // weergavetekst voor het profielvenster, bv. "Zwart"
}

/** Wat de bezoeker zelf heeft gekozen. Vervalt nooit; weegt het zwaarst. */
export interface ExplicitPreferences {
  include: Partial<Record<Dimension, string[]>>; // labels, bv. { colour: ["Zwart"] }
  exclude: Partial<Record<Dimension, string[]>>;
  maxPriceMinor: number | null;                  // harde grens in eurocenten; server dwingt af
}

/** Opgeslagen in localStorage onder "nikki-taste". Geen stuk-ID's, geen persoonsgegevens. */
export interface TasteProfile {
  version: 1;
  enabled: boolean;                // false: niets leren, niets personaliseren
  updatedAt: number;               // ms
  explicit: ExplicitPreferences;
  features: Record<string, FeatureWeight>; // sleutel is een FeatureKey; max MAX_FEATURES
  counts: { like: number; cart: number; more: number; less: number }; // alleen voor transparantie
}

/** Publieke velden van één stuk die het profiel gebruikt (subset van garments.data). */
export interface TasteItem {
  key?: string;
  priceMinor: number;
  material?: string | null;
  model?: string | null;
  colour?: string | null;
  length?: string | null;
  fit?: string | null;
  era?: string | null;
  details?: string[] | null;
  furClass?: string | null;
}

export type Signal =
  | { type: 'like' | 'unlike' | 'cart' | 'uncart' | 'more' | 'less'; item: TasteItem }
  | { type: 'dwell'; item: TasteItem; ms: number }  // impliciet; weegt voorlopig 0
  | { type: 'filter'; mode: 'include' | 'exclude'; dimension: Dimension; value: string; on: boolean }
  | { type: 'budget'; maxPriceMinor: number | null }
  | { type: 'forget'; key: string }                 // één kenmerk wissen, geleerd en expliciet
  | { type: 'enable'; on: boolean };

/** Compacte samenvatting die naar de server gaat. Scores -1 … 1, max 12 per lijst. */
export interface TasteSummary {
  v: 1;
  budget_max_minor: number | null;
  prefer: Record<string, number>; // FeatureKey -> 0 < score ≤ 1
  avoid: Record<string, number>;  // FeatureKey -> -1 ≤ score < 0
}

/** Wat de server na controle teruggeeft. Altijd alle kandidaten, in volgorde. */
export interface RankedItem {
  id: string;                // permanente garments.id
  photoRole: string | null;  // rol van een bestaande foto van dít stuk, of null = Nikki's hoofdfoto
  why: string | null;        // korte uitleg, alleen op verzoek
}

// In de browser hangen de drie modules aan globalThis.NikkiTaste (profile, aggregate, ranking),
// omdat de winkel zonder bundler als één klassiek script wordt gebouwd.
