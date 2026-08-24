/**
 * Design tokens — charte ALTEGAD SAS / APPLITAG
 *
 * Source unique pour la palette de couleurs, la typographie et les constantes
 * d'espacement utilisées dans toute l'application.
 *
 * Toute modification ici se répercute immédiatement sur l'ensemble de l'UI.
 * Ne jamais dupliquer ces valeurs dans les composants — importer depuis ici.
 */

// ── Palette de marque ─────────────────────────────────────────────────────────
export const C = Object.freeze({
  green:    "#4CAF50", greenL:  "#E8F5E9", greenD: "#1E5B3A",
  greenPale:"#86C27D",
  blue:     "#185FA5", blueL:   "#E6F1FB", blueD:  "#042C53",
  amber:    "#BA7517", amberL:  "#FAEEDA", amberD: "#412402",
  red:      "#A32D2D", redL:    "#FCEBEB",
  purple:   "#534AB7", purpleL: "#EEEDFE", purpleD:"#26215C",
  brown:    "#A66A2E", brownL:  "#F3EBE0",
  bg:       "#F3F4F6", bg2:     "#ECEAE6",
  bd:       "#DDDBD5", bd2:     "#C8C5BE",
  tx:       "#333333", tx2:     "#5A5955", tx3: "#9A9892",
  sb:       "#1E5B3A",
});

// ── Typographie ───────────────────────────────────────────────────────────────
export const FONT_TITLE = "'Montserrat',-apple-system,sans-serif";
export const FONT_BODY  = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

// ── Espacements et dimensions UI ──────────────────────────────────────────────
export const BTN_H      = 56;
export const INPUT_H    = 52;
export const FONT_INPUT = 16;
export const PADDING    = 16;
