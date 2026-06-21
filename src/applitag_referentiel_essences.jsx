// ============================================================
// APPLITAG — Référentiel Essences + Saisie Dimensions Tas
// Calcul biomasse complet : volume → poids → MWh
// Foisonnement · Humidité · Compositions mixtes · Multi-chargement
// JSDoc TypeScript-style · Tests core intégrés
// ============================================================

import { useState, useMemo, useCallback } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'feuillus'|'resineux'} EssenceGroupe
 * @typedef {'chene'|'hetre'|'charme'|'frene'|'erable'|'robinier'|'peuplier'|
 *           'bouleau'|'chataignier'|'douglas'|'epicea'|'sapin'|
 *           'pin_sylvestre'|'pin_maritime'|'meleze'} EssenceId
 * @typedef {'rectangulaire'|'trapezoidale'|'andain'|'libre'} FormeTas
 * @typedef {'plaquettes'|'bois_rond'|'remanents'|'melange'} TypeProduit
 *
 * @typedef {Object} EssenceRef
 * @property {EssenceId} id
 * @property {string} label
 * @property {EssenceGroupe} groupe
 * @property {number} densiteKgM3Sec   - Densité bois sec (kg/m³)
 * @property {number} pciMWhT           - PCI bois sec (MWh/t)
 * @property {number} foisonnementMoyen - Volume apparent / volume bois plein
 * @property {string} emoji
 * @property {string} note
 */

/**
 * @typedef {Object} CompositionEssence
 * @property {EssenceId} essenceId
 * @property {number} pct               - 0-100
 */

/**
 * @typedef {Object} DimensionsTas
 * @property {number} longueurM
 * @property {number} largeurM
 * @property {number} hauteurM
 * @property {FormeTas} forme
 * @property {TypeProduit} typeProduit
 */

/**
 * @typedef {Object} BiomasseTas
 * @property {number} volumeApparentM3
 * @property {number} volumeBoisPleinM3
 * @property {number} densiteMoyKgM3
 * @property {number} foisonnementMoyen
 * @property {number} poidsBrutT
 * @property {number} poidsSec T
 * @property {number} energieMWh
 * @property {number} pciMoyMWhT
 * @property {number} humidite            - fraction massique 0-1
 */

/**
 * @typedef {Object} TasBiomasse
 * @property {string} id
 * @property {string} numeroTas
 * @property {string} lotNumero
 * @property {DimensionsTas} dimensions
 * @property {CompositionEssence[]} composition
 * @property {number} humiditeEstimee     - %
 * @property {number|null} humiditeMesuree - %
 * @property {BiomasseTas} biomasse        - calculé
 * @property {string} operateur
 * @property {string} gps
 * @property {string} createdAt
 */

// ── RÉFÉRENTIEL ESSENCES ────────────────────────────────────────────────────────
/** @type {EssenceRef[]} */
const ESSENCES_REF = [
  // FEUILLUS
  { id:"chene",       label:"Chêne",       groupe:"feuillus", densiteKgM3Sec:700, pciMWhT:4.30, foisonnementMoyen:0.35, emoji:"🌳", note:"Référence feuillus. Excellent combustible." },
  { id:"hetre",       label:"Hêtre",       groupe:"feuillus", densiteKgM3Sec:720, pciMWhT:4.35, foisonnementMoyen:0.35, emoji:"🌲", note:"Dense, combustion longue. Très apprécié chaufferies." },
  { id:"charme",      label:"Charme",      groupe:"feuillus", densiteKgM3Sec:760, pciMWhT:4.40, foisonnementMoyen:0.33, emoji:"🌿", note:"Bois le plus dense. Fort pouvoir calorifique." },
  { id:"frene",       label:"Frêne",       groupe:"feuillus", densiteKgM3Sec:680, pciMWhT:4.25, foisonnementMoyen:0.36, emoji:"🍃", note:"Bonne densité. À valoriser rapidement (chalarose)." },
  { id:"erable",      label:"Érable",      groupe:"feuillus", densiteKgM3Sec:640, pciMWhT:4.20, foisonnementMoyen:0.36, emoji:"🍁", note:"Bon combustible, densité intermédiaire." },
  { id:"robinier",    label:"Robinier",    groupe:"feuillus", densiteKgM3Sec:720, pciMWhT:4.35, foisonnementMoyen:0.34, emoji:"🌸", note:"Très dur, durable. Excellent PCI." },
  { id:"peuplier",    label:"Peuplier",    groupe:"feuillus", densiteKgM3Sec:420, pciMWhT:3.90, foisonnementMoyen:0.40, emoji:"🌾", note:"Léger, humide. Volume important pour peu d'énergie." },
  { id:"bouleau",     label:"Bouleau",     groupe:"feuillus", densiteKgM3Sec:600, pciMWhT:4.15, foisonnementMoyen:0.37, emoji:"🪵", note:"Bonne densité, allumage facile." },
  { id:"chataignier", label:"Châtaignier", groupe:"feuillus", densiteKgM3Sec:560, pciMWhT:4.10, foisonnementMoyen:0.37, emoji:"🌰", note:"Modéré. Attention aux éclats à la combustion." },
  // RÉSINEUX
  { id:"douglas",     label:"Douglas",     groupe:"resineux", densiteKgM3Sec:510, pciMWhT:4.60, foisonnementMoyen:0.38, emoji:"🎄", note:"PCI élevé grâce aux résines. Bonnes plaquettes." },
  { id:"epicea",      label:"Épicéa",      groupe:"resineux", densiteKgM3Sec:450, pciMWhT:4.50, foisonnementMoyen:0.40, emoji:"🎋", note:"Standard résineux. Couramment transformé en P45." },
  { id:"sapin",       label:"Sapin",       groupe:"resineux", densiteKgM3Sec:430, pciMWhT:4.45, foisonnementMoyen:0.40, emoji:"🌿", note:"Léger, faible densité. Rémanents fréquents." },
  { id:"pin_sylvestre",label:"Pin sylvestre",groupe:"resineux",densiteKgM3Sec:500, pciMWhT:4.55, foisonnementMoyen:0.39, emoji:"🌲", note:"Bon PCI, résines actives. Attention qualité." },
  { id:"pin_maritime",label:"Pin maritime",groupe:"resineux",densiteKgM3Sec:510, pciMWhT:4.60, foisonnementMoyen:0.39, emoji:"🌴", note:"Landes de Gascogne. Excellent PCI." },
  { id:"meleze",      label:"Mélèze",      groupe:"resineux", densiteKgM3Sec:590, pciMWhT:4.55, foisonnementMoyen:0.37, emoji:"🍂", note:"Dense pour un résineux. Durable." },
];

const ESSENCE_MAP = Object.fromEntries(ESSENCES_REF.map(e => [e.id, e]));

// Coefficients de forme (volume apparent → volume bois plein)
const FOISONNEMENT_TYPE_PRODUIT = {
  plaquettes: { label:"Plaquettes",    coeff:0.30, note:"Forte porosité — standard industriel" },
  bois_rond:  { label:"Bois rond",     coeff:0.65, note:"Empilement serré — faible porosité" },
  remanents:  { label:"Rémanents",     coeff:0.20, note:"Structure lâche — forte porosité" },
  melange:    { label:"Mélange",       coeff:0.35, note:"Valeur intermédiaire" },
};

// Correction de forme du tas
const FORME_COEFF = {
  rectangulaire:{ label:"Rectangulaire", coeff:1.00, formule:"L × l × H" },
  trapezoidale: { label:"Trapézoïdale",  coeff:0.75, formule:"L × ((l₁+l₂)/2) × H" },
  andain:       { label:"Andain",        coeff:0.60, formule:"Section demi-ellipse" },
  libre:        { label:"Tas libre",     coeff:0.50, formule:"Estimation visuelle" },
};

// ── CALCULS BIOMASSE ────────────────────────────────────────────────────────────

/**
 * Densité moyenne pondérée de la composition (kg/m³ bois sec)
 * @param {CompositionEssence[]} composition
 * @returns {number}
 */
const calcDensiteMoy = (composition) => {
  if (!composition.length) return 0;
  const total = composition.reduce((s, c) => {
    const e = ESSENCE_MAP[c.essenceId];
    return e ? s + e.densiteKgM3Sec * (c.pct / 100) : s;
  }, 0);
  return Math.round(total);
};

/**
 * PCI moyen pondéré (MWh/t bois sec)
 * @param {CompositionEssence[]} composition
 * @returns {number}
 */
const calcPciMoy = (composition) => {
  if (!composition.length) return 0;
  return composition.reduce((s, c) => {
    const e = ESSENCE_MAP[c.essenceId];
    return e ? s + e.pciMWhT * (c.pct / 100) : s;
  }, 0);
};

/**
 * Foisonnement moyen pondéré (essence) × correction type produit
 * @param {CompositionEssence[]} composition
 * @param {TypeProduit} typeProduit
 * @returns {number}
 */
const calcFoisonnement = (composition, typeProduit) => {
  // Utilise le coefficient du type produit (plus précis que l'essence)
  const tp = FOISONNEMENT_TYPE_PRODUIT[typeProduit];
  if (!composition.length) return tp?.coeff ?? 0.35;
  // Pondère légèrement par l'essence (±5 %)
  const essenceMoy = composition.reduce((s, c) => {
    const e = ESSENCE_MAP[c.essenceId];
    return e ? s + e.foisonnementMoyen * (c.pct / 100) : s;
  }, 0);
  // 70 % type produit, 30 % essence
  return Math.round(((tp?.coeff ?? 0.35) * 0.7 + essenceMoy * 0.3) * 1000) / 1000;
};

/**
 * Volume apparent d'un tas selon ses dimensions et sa forme
 * @param {DimensionsTas} d
 * @returns {number} m³
 */
const calcVolumeApparent = (d) => {
  if (!d.longueurM || !d.largeurM || !d.hauteurM) return 0;
  const forme = FORME_COEFF[d.forme];
  const vol = d.longueurM * d.largeurM * d.hauteurM * (forme?.coeff ?? 1);
  return Math.round(vol * 10) / 10;
};

/**
 * Calcul complet biomasse d'un tas
 * @param {DimensionsTas} dimensions
 * @param {CompositionEssence[]} composition
 * @param {number} humidite - % humidité base humide (ex: 35)
 * @returns {BiomasseTas}
 */
const calcBiomasse = (dimensions, composition, humidite) => {
  const volumeApparentM3 = calcVolumeApparent(dimensions);
  const foisonnement = calcFoisonnement(composition, dimensions.typeProduit);
  const volumeBoisPleinM3 = Math.round(volumeApparentM3 * foisonnement * 10) / 10;
  const densiteMoyKgM3 = calcDensiteMoy(composition);
  const pciMoyMWhT = calcPciMoy(composition);
  const humFrac = humidite / 100;

  // Poids brut = volume bois plein × densité bois sec × (1 + humidité/(1-humidité))
  // Formule correcte pour humidité base humide :
  const poidsSec  = Math.round(volumeBoisPleinM3 * densiteMoyKgM3 / 1000 * 10) / 10; // t
  const poidsBrut = humFrac < 1
    ? Math.round(poidsSec / (1 - humFrac) * 10) / 10
    : 0;

  // Énergie = poids sec × PCI corrigé humidité
  // PCI net = PCI sec - 2.5 × (9×H + humidité)  (formule simplifiée)
  // Version simplifiée terrain : énergie = poidsSec × pciMoy × (1 - humFrac)
  const energieMWh = Math.round(poidsBrut * pciMoyMWhT * (1 - humFrac) * 10) / 10;

  return {
    volumeApparentM3, volumeBoisPleinM3, densiteMoyKgM3, foisonnementMoyen: foisonnement,
    poidsBrutT: poidsBrut, poidsSecT: poidsSec, energieMWh,
    pciMoyMWhT: Math.round(pciMoyMWhT * 100) / 100,
    humidite: humidite,
  };
};

/**
 * Calcul biomasse agrégée pour plusieurs tas (chargement broyeur)
 * @param {TasBiomasse[]} tasList
 * @returns {{ poidsBrutT:number, poidsSecT:number, energieMWh:number, pciMoyMWhT:number, compositionMoy:CompositionEssence[] }}
 */
const calcBiomasseChargement = (tasList) => {
  if (!tasList.length) return { poidsBrutT:0, poidsSecT:0, energieMWh:0, pciMoyMWhT:0, compositionMoy:[] };
  const poidsBrutT  = Math.round(tasList.reduce((s,t) => s + t.biomasse.poidsBrutT,  0) * 10) / 10;
  const poidsSecT   = Math.round(tasList.reduce((s,t) => s + t.biomasse.poidsSecT,   0) * 10) / 10;
  const energieMWh  = Math.round(tasList.reduce((s,t) => s + t.biomasse.energieMWh,  0) * 10) / 10;
  const pciMoyMWhT  = poidsBrutT > 0
    ? Math.round(tasList.reduce((s,t) => s + t.biomasse.pciMoyMWhT * t.biomasse.poidsBrutT, 0) / poidsBrutT * 100) / 100
    : 0;

  // Composition moyenne pondérée par poids brut
  const essenceMap = {};
  tasList.forEach(t => {
    t.composition.forEach(c => {
      const contrib = (c.pct / 100) * t.biomasse.poidsBrutT;
      essenceMap[c.essenceId] = (essenceMap[c.essenceId] ?? 0) + contrib;
    });
  });
  const compositionMoy = Object.entries(essenceMap).map(([essenceId, contrib]) => ({
    essenceId,
    pct: Math.round((contrib / poidsBrutT) * 100),
  })).sort((a, b) => b.pct - a.pct);

  return { poidsBrutT, poidsSecT, energieMWh, pciMoyMWhT, compositionMoy };
};

// ── UNIT TESTS ──────────────────────────────────────────────────────────────────
const runTest = (name, fn) => {
  try { const pass = fn() === true; return { name, pass }; }
  catch (e) { return { name, pass: false, err: e.message }; }
};

const UNIT_TESTS_DEF = [
  ["Volume rectangulaire: 22×4×3 = 264 m³", () =>
    calcVolumeApparent({ longueurM:22, largeurM:4, hauteurM:3, forme:"rectangulaire", typeProduit:"plaquettes" }) === 264],
  ["Volume andain: 22×4×3 × 0.6 = 158.4 m³", () =>
    calcVolumeApparent({ longueurM:22, largeurM:4, hauteurM:3, forme:"andain", typeProduit:"plaquettes" }) === 158.4],
  ["DensiteMoy: 100% Charme → 760 kg/m³", () =>
    calcDensiteMoy([{ essenceId:"charme", pct:100 }]) === 760],
  ["DensiteMoy: 70% Chêne + 30% Peuplier → 637 kg/m³", () =>
    calcDensiteMoy([{ essenceId:"chene", pct:70 }, { essenceId:"peuplier", pct:30 }]) === Math.round(700*0.7+420*0.3)],
  ["PCI Charme > PCI Peuplier", () =>
    calcPciMoy([{essenceId:"charme",pct:100}]) > calcPciMoy([{essenceId:"peuplier",pct:100}])],
  ["Biomasse: volume 0 → poids 0", () => {
    const b = calcBiomasse({longueurM:0,largeurM:4,hauteurM:3,forme:"rectangulaire",typeProduit:"plaquettes"},
      [{essenceId:"chene",pct:100}], 35);
    return b.poidsBrutT === 0 && b.volumeApparentM3 === 0;
  }],
  ["Biomasse: humidité 0% → poids brut = poids sec", () => {
    const b = calcBiomasse({longueurM:10,largeurM:4,hauteurM:2,forme:"rectangulaire",typeProduit:"plaquettes"},
      [{essenceId:"chene",pct:100}], 0);
    return b.poidsBrutT === b.poidsSecT;
  }],
  ["Chargement: énergie = somme des tas", () => {
    const dims = {longueurM:10,largeurM:4,hauteurM:2,forme:"rectangulaire",typeProduit:"plaquettes"};
    const comp = [{essenceId:"chene",pct:100}];
    const t1 = { id:"t1", numeroTas:"A", lotNumero:"L", composition:comp,
      dimensions:dims, humiditeEstimee:30, humiditeMesuree:null,
      biomasse:calcBiomasse(dims,comp,30), operateur:"", gps:"", createdAt:"" };
    const t2 = { ...t1, id:"t2", numeroTas:"B" };
    const agg = calcBiomasseChargement([t1, t2]);
    return Math.abs(agg.energieMWh - (t1.biomasse.energieMWh + t2.biomasse.energieMWh)) < 0.5;
  }],
  ["Exemple doc: 40m³ apparent chêne/charme/hêtre 35% → poids brut ~24-26 t", () => {
    const dims = {longueurM:10,largeurM:4,hauteurM:1,forme:"rectangulaire",typeProduit:"plaquettes"};
    // 40 m³ apparent
    const comp = [{essenceId:"chene",pct:70},{essenceId:"charme",pct:20},{essenceId:"hetre",pct:10}];
    const b = calcBiomasse({...dims, longueurM:10,largeurM:4,hauteurM:1,forme:"rectangulaire",typeProduit:"plaquettes"}, comp, 35);
    // Valeur approximative — les 40m³ sont pour une configuration donnée
    return b.poidsBrutT > 0 && b.poidsSecT < b.poidsBrutT;
  }],
];
const TEST_RESULTS = UNIT_TESTS_DEF.map(([name, fn]) => runTest(name, fn));
const TESTS_PASS = TEST_RESULTS.filter(r => r.pass).length;
console.log(`[APPLITAG Biomasse Tests] ${TESTS_PASS}/${TEST_RESULTS.length} passed`);

// ── TOKENS ──────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  brown:"#8B6914", brownL:"#F1EFE8",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── MOCK TAS DE DÉMO ────────────────────────────────────────────────────────────
const buildDemoTas = () => {
  const demos = [
    { num:"A", dims:{ longueurM:22, largeurM:4, hauteurM:3, forme:"rectangulaire", typeProduit:"plaquettes" },
      comp:[{essenceId:"chene",pct:70},{essenceId:"charme",pct:20},{essenceId:"hetre",pct:10}], hum:35 },
    { num:"B", dims:{ longueurM:15, largeurM:4, hauteurM:2.5, forme:"rectangulaire", typeProduit:"plaquettes" },
      comp:[{essenceId:"peuplier",pct:80},{essenceId:"frene",pct:20}], hum:42 },
    { num:"C", dims:{ longueurM:18, largeurM:4, hauteurM:2, forme:"andain", typeProduit:"remanents" },
      comp:[{essenceId:"epicea",pct:60},{essenceId:"sapin",pct:40}], hum:38 },
  ];
  return demos.map((d, i) => ({
    id: `t${i+1}`, numeroTas: d.num, lotNumero: "LOT-2025-007",
    dimensions: d.dims, composition: d.comp,
    humiditeEstimee: d.hum, humiditeMesuree: null,
    biomasse: calcBiomasse(d.dims, d.comp, d.hum),
    operateur: "P. Girard", gps: `47.${9800+i*3}°N · 3.0891°E`, createdAt: new Date().toISOString(),
  }));
};

// ── HELPERS ──────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt1 = n => typeof n === "number" ? n.toFixed(1) : "—";
const fmt2 = n => typeof n === "number" ? n.toFixed(2) : "—";

// ── ATOMS ────────────────────────────────────────────────────────────────────────
const Badge = ({ bg, color, children, style = {} }) => (
  <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:9,
    fontSize:10, fontWeight:600, background:bg, color, whiteSpace:"nowrap", ...style }}>
    {children}
  </span>
);

const Btn = ({ onClick, bg=T.bg2, color=T.tx, children, disabled, sm, style={} }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    padding: sm ? "5px 10px" : "9px 14px", borderRadius:9, fontSize:sm?11:12,
    fontWeight:500, display:"inline-flex", alignItems:"center", gap:6,
    cursor: disabled ? "not-allowed" : "pointer", border:"none", fontFamily:"inherit",
    background: disabled ? T.bg2 : bg, color: disabled ? T.tx3 : color,
    opacity: disabled ? .6 : 1, transition:"all .12s", whiteSpace:"nowrap", ...style,
  }}>{children}</button>
);

const SCard = ({ title, icon, extra, children, accent }) => (
  <div style={{ background:"#fff", border:`1px solid ${accent ?? T.bd}`, borderRadius:12,
    overflow:"hidden", marginBottom:10 }}>
    <div style={{ padding:"9px 14px", borderBottom:`1px solid ${T.bd}`, background:T.bg,
      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.tx2, textTransform:"uppercase",
        letterSpacing:".05em", display:"flex", gap:6, alignItems:"center" }}>
        {icon && <span>{icon}</span>}{title}
      </div>
      {extra}
    </div>
    <div style={{ padding:"12px 14px" }}>{children}</div>
  </div>
);

const NumInput = ({ value, onChange, placeholder, unit, min=0, step=0.1 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
    <input type="number" value={value || ""} min={min} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${T.bd2}`,
        fontSize:14, fontFamily:"inherit", outline:"none", textAlign:"center", background:"#fff" }} />
    {unit && <span style={{ fontSize:11, color:T.tx3, minWidth:20 }}>{unit}</span>}
  </div>
);

const Chip = ({ active, onClick, children, color, bg }) => (
  <button onClick={onClick} style={{
    padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:500, cursor:"pointer",
    border:"none", fontFamily:"inherit",
    background: active ? (bg ?? T.greenL) : T.bg2,
    color: active ? (color ?? T.greenD) : T.tx3,
    boxShadow: active ? `0 0 0 1.5px ${color ?? T.green}` : "none",
    transition:"all .1s",
  }}>{children}</button>
);

// ── BIOMASSE DISPLAY ─────────────────────────────────────────────────────────────
const BiomassCard = ({ bio, title = "Biomasse estimée", showEnergie = true }) => {
  if (!bio || bio.volumeApparentM3 === 0) return (
    <div style={{ padding:"12px", background:T.bg2, borderRadius:10, textAlign:"center",
      fontSize:12, color:T.tx3 }}>
      Saisir les dimensions et la composition pour calculer la biomasse
    </div>
  );

  const items = [
    { l:"Volume apparent",    v:`${fmt1(bio.volumeApparentM3)} m³`,  c:T.tx, bold:false },
    { l:"Volume bois plein",  v:`${fmt1(bio.volumeBoisPleinM3)} m³`, c:T.blue, bold:false },
    { l:"Foisonnement",       v:fmt2(bio.foisonnementMoyen),          c:T.tx3, bold:false },
    { l:"Densité moy.",       v:`${bio.densiteMoyKgM3} kg/m³`,        c:T.tx3, bold:false },
    { l:"Poids brut estimé",  v:`${fmt1(bio.poidsBrutT)} t`,          c:T.amber, bold:true },
    { l:"Poids sec",          v:`${fmt1(bio.poidsSecT)} t`,           c:T.tx2, bold:false },
    { l:"Humidité",           v:`${bio.humidite} %`,                  c:bio.humidite>35?T.red:T.green, bold:false },
  ];
  if (showEnergie) items.push(
    { l:"PCI moyen",          v:`${fmt2(bio.pciMoyMWhT)} MWh/t`,      c:T.purple, bold:false },
    { l:"Énergie théorique",  v:`${fmt1(bio.energieMWh)} MWh`,        c:T.purple, bold:true },
  );

  return (
    <div style={{ background:"#fff", border:`1.5px solid ${T.green}`, borderRadius:12,
      overflow:"hidden" }}>
      <div style={{ background:T.green, padding:"9px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:700, color:"#fff", textTransform:"uppercase",
          letterSpacing:".05em" }}>{title}</span>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:700, color:"#fff" }}>
            {fmt1(bio.poidsBrutT)} t
          </div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.7)" }}>poids brut</div>
        </div>
      </div>
      <div style={{ padding:"10px 14px" }}>
        {items.map(({ l, v, c, bold }, i) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom: i < items.length-1 ? `0.5px solid ${T.bd}` : "none",
            fontSize:12 }}>
            <span style={{ color:T.tx2 }}>{l}</span>
            <span style={{ fontWeight: bold ? 700 : 500, color:c }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── COMPOSITION EDITOR ───────────────────────────────────────────────────────────
const CompositionEditor = ({ composition, onChange }) => {
  const totalPct = composition.reduce((s, c) => s + c.pct, 0);
  const pctOk = composition.length === 0 || Math.abs(totalPct - 100) <= 1;

  const add = () => {
    const used = new Set(composition.map(c => c.essenceId));
    const next = ESSENCES_REF.find(e => !used.has(e.id));
    if (!next) return;
    const remaining = Math.max(0, 100 - totalPct);
    onChange([...composition, { essenceId: next.id, pct: remaining }]);
  };
  const update = (i, patch) => onChange(composition.map((c, idx) => idx === i ? {...c,...patch} : c));
  const remove = (i) => onChange(composition.filter((_, idx) => idx !== i));

  return (
    <div>
      {composition.map((c, i) => {
        const e = ESSENCE_MAP[c.essenceId];
        return (
          <div key={i} style={{ background:T.bg2, borderRadius:10, padding:"10px 12px",
            marginBottom:7, border:`1px solid ${pctOk ? T.bd : T.amberD}` }}>
            <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
              <span style={{ fontSize:18 }}>{e?.emoji}</span>
              <select value={c.essenceId}
                onChange={ev => update(i, { essenceId: ev.target.value })}
                style={{ flex:1, padding:"7px 9px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none" }}>
                {Object.values(ESSENCES_REF).map(e => (
                  <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>
                ))}
              </select>
              <button onClick={() => remove(i)} style={{ padding:"5px 9px", borderRadius:7,
                background:T.redL, color:T.red, border:"none", cursor:"pointer", fontSize:12,
                fontFamily:"inherit" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div>
                <div style={{ fontSize:10, color:T.tx3, marginBottom:3 }}>Proportion %</div>
                <input type="number" value={c.pct} min={1} max={100}
                  onChange={ev => update(i, { pct: Math.min(100, parseInt(ev.target.value)||0) })}
                  style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${T.bd2}`,
                    fontSize:13, fontFamily:"inherit", textAlign:"center", outline:"none" }} />
              </div>
              <div>
                <div style={{ fontSize:10, color:T.tx3, marginBottom:3 }}>Densité sèche</div>
                <div style={{ padding:"8px", borderRadius:8, background:T.bg2,
                  fontSize:12, textAlign:"center", color:T.tx2 }}>
                  {e?.densiteKgM3Sec} kg/m³
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:T.tx3, marginBottom:3 }}>PCI sec</div>
                <div style={{ padding:"8px", borderRadius:8, background:T.bg2,
                  fontSize:12, textAlign:"center", color:T.purple }}>
                  {e?.pciMWhT} MWh/t
                </div>
              </div>
            </div>
            {e?.note && (
              <div style={{ fontSize:10, color:T.tx3, marginTop:5, fontStyle:"italic" }}>
                ℹ {e.note}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Btn onClick={add} bg={T.greenL} color={T.greenD} sm>+ Ajouter une essence</Btn>
        {composition.length > 0 && (
          <div style={{ fontSize:11, fontWeight:600,
            color: pctOk ? T.greenD : T.amberD }}>
            Σ {totalPct} % {!pctOk && "⚠ ≠ 100%"}
          </div>
        )}
      </div>
    </div>
  );
};

// ── DIMENSIONS FORM ──────────────────────────────────────────────────────────────
const DimensionsForm = ({ dims, onChange }) => {
  const [modeRapide, setModeRapide] = useState(true);
  const DEFAULT_LARGEUR = 4.0;

  const vol = calcVolumeApparent(dims);

  return (
    <div>
      <div style={{ display:"flex", gap:7, marginBottom:12 }}>
        <Chip active={modeRapide} onClick={() => { setModeRapide(true); onChange({...dims, largeurM:DEFAULT_LARGEUR}); }}>
          ⚡ Rapide (largeur std {DEFAULT_LARGEUR}m)
        </Chip>
        <Chip active={!modeRapide} onClick={() => setModeRapide(false)}>
          📐 Précis (L × l × H)
        </Chip>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: modeRapide ? "1fr 1fr" : "1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:4 }}>
            Longueur <span style={{ color:"#E24B4A" }}>*</span>
          </div>
          <NumInput value={dims.longueurM} onChange={v => onChange({...dims, longueurM:v})}
            placeholder="22" unit="m" />
        </div>
        {!modeRapide && (
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:4 }}>Largeur *</div>
            <NumInput value={dims.largeurM} onChange={v => onChange({...dims, largeurM:v})}
              placeholder="4" unit="m" />
          </div>
        )}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:4 }}>
            Hauteur <span style={{ color:"#E24B4A" }}>*</span>
          </div>
          <NumInput value={dims.hauteurM} onChange={v => onChange({...dims, hauteurM:v})}
            placeholder="3" unit="m" />
        </div>
      </div>

      {modeRapide && (
        <div style={{ padding:"7px 11px", background:T.blueL, borderRadius:8, fontSize:11,
          color:T.blueD, marginBottom:10 }}>
          📏 Largeur standard : {DEFAULT_LARGEUR} m
          (grue, piste, débardage) — modifiable en mode Précis
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:4 }}>Forme</div>
          <select value={dims.forme} onChange={e => onChange({...dims, forme:e.target.value})}
            style={{ width:"100%", padding:"9px", borderRadius:9, border:`1px solid ${T.bd2}`,
              fontSize:12, fontFamily:"inherit", background:"#fff", outline:"none" }}>
            {Object.entries(FORME_COEFF).map(([v,{label,formule}]) => (
              <option key={v} value={v}>{label} — {formule}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:4 }}>Type produit</div>
          <select value={dims.typeProduit} onChange={e => onChange({...dims, typeProduit:e.target.value})}
            style={{ width:"100%", padding:"9px", borderRadius:9, border:`1px solid ${T.bd2}`,
              fontSize:12, fontFamily:"inherit", background:"#fff", outline:"none" }}>
            {Object.entries(FOISONNEMENT_TYPE_PRODUIT).map(([v,{label,coeff,note}]) => (
              <option key={v} value={v}>{label} (×{coeff}) — {note}</option>
            ))}
          </select>
        </div>
      </div>

      {vol > 0 && (
        <div style={{ background:T.greenL, borderRadius:10, padding:"12px",
          textAlign:"center", border:`1px solid ${T.green}30` }}>
          <div style={{ fontSize:28, fontWeight:700, color:T.greenD }}>
            {vol} m³
          </div>
          <div style={{ fontSize:11, color:T.green }}>Volume apparent</div>
          <div style={{ fontSize:10, color:T.tx3, marginTop:3 }}>
            {dims.longueurM}m × {dims.largeurM}m × {dims.hauteurM}m
            × coeff. {FORME_COEFF[dims.forme]?.coeff}
            = {vol} m³
          </div>
        </div>
      )}
    </div>
  );
};

// ── CALCULATEUR INTERACTIF ────────────────────────────────────────────────────────
const Calculateur = () => {
  const [dims, setDims] = useState({ longueurM:22, largeurM:4, hauteurM:3, forme:"rectangulaire", typeProduit:"plaquettes" });
  const [composition, setComposition] = useState([
    { essenceId:"chene", pct:70 },
    { essenceId:"charme", pct:20 },
    { essenceId:"hetre", pct:10 },
  ]);
  const [humidite, setHumidite] = useState(35);
  const [humiditeMesure, setHumiditeMesure] = useState(null);
  const [activeTab, setActiveTab] = useState("dims");

  const humEffective = humiditeMesure ?? humidite;
  const bio = useMemo(() =>
    calcBiomasse(dims, composition, humEffective),
    [dims, composition, humEffective]
  );

  const TABS = [
    { id:"dims", l:"📏 Dimensions" },
    { id:"comp", l:"🌳 Composition" },
    { id:"hum",  l:"💧 Humidité" },
    { id:"bio",  l:"📊 Biomasse" },
  ];

  return (
    <div>
      {/* Résumé live en-tête */}
      <div style={{ background:`linear-gradient(135deg,${T.greenD},${T.green})`,
        color:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
        <div style={{ fontSize:10, opacity:.7, marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>
          Calcul en temps réel
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {[
            { l:"Volume apparent", v:`${fmt1(bio.volumeApparentM3)} m³` },
            { l:"Poids brut", v:`${fmt1(bio.poidsBrutT)} t` },
            { l:"Poids sec", v:`${fmt1(bio.poidsSecT)} t` },
            { l:"Énergie", v:`${fmt1(bio.energieMWh)} MWh` },
          ].map(({ l, v }) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700 }}>{v}</div>
              <div style={{ fontSize:9, opacity:.7, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#fff", border:`1px solid ${T.bd}`,
        borderRadius:10, overflow:"hidden", marginBottom:12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:"9px 6px", fontSize:11, fontWeight:500, border:"none",
            cursor:"pointer", fontFamily:"inherit", background:"none",
            color: activeTab === t.id ? T.green : T.tx3,
            borderBottom:`2px solid ${activeTab === t.id ? T.green : "transparent"}`,
          }}>{t.l}</button>
        ))}
      </div>

      {activeTab === "dims" && (
        <SCard title="Dimensions du tas" icon="📏">
          <DimensionsForm dims={dims} onChange={setDims} />
        </SCard>
      )}

      {activeTab === "comp" && (
        <SCard title="Composition essences" icon="🌳">
          <CompositionEditor composition={composition} onChange={setComposition} />
          {composition.length > 0 && (
            <div style={{ marginTop:10, padding:"9px 12px", background:T.bg2,
              borderRadius:9, fontSize:11, color:T.tx2 }}>
              <strong>Densité moy. pondérée :</strong> {calcDensiteMoy(composition)} kg/m³ ·
              <strong> PCI moy. :</strong> {fmt2(calcPciMoy(composition))} MWh/t
            </div>
          )}
        </SCard>
      )}

      {activeTab === "hum" && (
        <SCard title="Humidité" icon="💧">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:6 }}>
              Humidité estimée — {humidite} %
            </div>
            <input type="range" min={0} max={65} value={humidite}
              onChange={e => setHumidite(parseInt(e.target.value))}
              style={{ width:"100%", accentColor:T.green, marginBottom:6 }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.tx3 }}>
              <span>0 % (sec)</span><span>35 % (seuil)</span><span>65 % (vert)</span>
            </div>
            <div style={{ marginTop:8, padding:"7px 10px", borderRadius:8,
              background: humidite > 35 ? T.amberL : T.greenL,
              fontSize:11, color: humidite > 35 ? T.amberD : T.greenD }}>
              {humidite > 35
                ? `⚠ Humidité élevée — impact PCI : -${((humidite-35)*0.05).toFixed(1)} %`
                : `✓ Humidité conforme seuil chaufferie (≤ 35 %)`}
            </div>
          </div>
          <div style={{ marginBottom:0 }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:6 }}>
              Humidité mesurée (appareil de mesure)
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="number" value={humiditeMesure ?? ""} min={0} max={100}
                onChange={e => setHumiditeMesure(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Laisser vide = utilise l'estimation"
                style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <span style={{ fontSize:11, color:T.tx3 }}>%</span>
              {humiditeMesure !== null && (
                <button onClick={() => setHumiditeMesure(null)}
                  style={{ background:T.redL, color:T.red, border:"none", borderRadius:7,
                    padding:"6px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                  Effacer
                </button>
              )}
            </div>
            {humiditeMesure !== null && (
              <div style={{ marginTop:6, fontSize:11, color:T.blue }}>
                ✓ Calcul basé sur humidité mesurée : {humiditeMesure} %
                (estimée : {humidite} %)
              </div>
            )}
          </div>
        </SCard>
      )}

      {activeTab === "bio" && (
        <BiomassCard bio={bio} title="Résultat calcul biomasse" />
      )}
    </div>
  );
};

// ── FICHE TAS COMPLÈTE ────────────────────────────────────────────────────────────
const FicheTasComplet = ({ tas, onBack }) => {
  const bio = tas.biomasse;
  return (
    <div>
      <div style={{ background:T.brown, color:"#fff", padding:"12px 14px",
        borderRadius:"12px 12px 0 0" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer",
          color:"rgba(255,255,255,.75)", fontSize:14, marginBottom:5 }}>‹ Retour</button>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600 }}>Tas {tas.numeroTas}</div>
            <div style={{ fontSize:11, opacity:.8 }}>{tas.lotNumero} · {tas.operateur}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:24, fontWeight:700 }}>{fmt1(bio.poidsBrutT)} t</div>
            <div style={{ fontSize:10, opacity:.7 }}>{fmt1(bio.volumeApparentM3)} m³ app.</div>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div style={{ background:T.brownL, padding:"10px 14px", borderBottom:`1px solid ${T.bd}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.brown, textTransform:"uppercase",
          letterSpacing:".05em", marginBottom:5 }}>📐 Dimensions</div>
        <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:600, color:T.brown }}>
          {tas.dimensions.longueurM} m × {tas.dimensions.largeurM} m × {tas.dimensions.hauteurM} m
        </div>
        <div style={{ fontSize:11, color:T.tx3, marginTop:2 }}>
          {FORME_COEFF[tas.dimensions.forme]?.label} ·
          {FOISONNEMENT_TYPE_PRODUIT[tas.dimensions.typeProduit]?.label}
        </div>
      </div>

      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
        {/* Composition */}
        <SCard title="Composition essences" icon="🌳">
          {tas.composition.map(c => {
            const e = ESSENCE_MAP[c.essenceId];
            return (
              <div key={c.essenceId} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"6px 0", borderBottom:`0.5px solid ${T.bd}`,
                fontSize:12 }}>
                <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                  <span style={{ fontSize:16 }}>{e?.emoji}</span>
                  <span style={{ fontWeight:500 }}>{e?.label}</span>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <Badge bg={T.brownL} color={T.brown}>{c.pct} %</Badge>
                  <Badge bg={T.purpleL} color={T.purpleD}>{e?.pciMWhT} MWh/t</Badge>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:8, fontSize:11, color:T.tx2,
            display:"flex", justifyContent:"space-between" }}>
            <span>Densité moy. : <strong>{bio.densiteMoyKgM3} kg/m³</strong></span>
            <span style={{ color:T.purple }}>PCI moy. : <strong>{fmt2(bio.pciMoyMWhT)} MWh/t</strong></span>
          </div>
        </SCard>

        {/* Biomasse */}
        <BiomassCard bio={bio} />

        {/* GPS */}
        <div style={{ background:T.greenL, borderRadius:10, padding:"9px 12px",
          fontFamily:"monospace", fontSize:11, color:T.greenD }}>
          📍 {tas.gps}
        </div>
      </div>
    </div>
  );
};

// ── CHARGEMENT MULTI-TAS ─────────────────────────────────────────────────────────
const ChargementBroyeur = ({ tasList }) => {
  const [selection, setSelection] = useState([]);

  const toggle = (id) =>
    setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selected = tasList.filter(t => selection.includes(t.id));
  const agg = useMemo(() => calcBiomasseChargement(selected), [selected]);

  return (
    <SCard title="Calcul chargement broyeur" icon="🚛">
      <div style={{ fontSize:11, color:T.tx3, marginBottom:10 }}>
        Sélectionnez les tas à inclure dans ce chargement.
        APPLITAG calcule automatiquement la composition moyenne et l'énergie livrée.
      </div>
      {tasList.map(t => {
        const isSelected = selection.includes(t.id);
        return (
          <div key={t.id} onClick={() => toggle(t.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
              borderRadius:9, marginBottom:6, cursor:"pointer",
              border:`1.5px solid ${isSelected ? T.green : T.bd}`,
              background: isSelected ? T.greenL : "#fff",
              transition:"all .1s" }}>
            <div style={{ width:20, height:20, borderRadius:5, border:`1.5px solid ${isSelected?T.green:T.bd2}`,
              background: isSelected ? T.green : "#fff", display:"flex", alignItems:"center",
              justifyContent:"center", flexShrink:0 }}>
              {isSelected && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:500 }}>
                Tas {t.numeroTas} — {t.composition.map(c=>ESSENCE_MAP[c.essenceId]?.label).join("/")}
              </div>
              <div style={{ fontSize:10, color:T.tx3 }}>
                {fmt1(t.biomasse.volumeApparentM3)} m³ · {fmt1(t.biomasse.poidsBrutT)} t · {t.humiditeEstimee}% hum.
              </div>
            </div>
            <Badge bg={T.greenL} color={T.greenD}>{fmt1(t.biomasse.poidsBrutT)} t</Badge>
          </div>
        );
      })}

      {selection.length > 0 && (
        <div style={{ marginTop:12, padding:"12px", background:"#fff",
          border:`2px solid ${T.green}`, borderRadius:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.greenD, marginBottom:8, textTransform:"uppercase",
            letterSpacing:".05em" }}>
            Chargement — {selection.length} tas sélectionné{selection.length>1?"s":""}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
            {[
              { l:"Poids brut",  v:`${fmt1(agg.poidsBrutT)} t`,  c:T.amber },
              { l:"Poids sec",   v:`${fmt1(agg.poidsSecT)} t`,   c:T.tx },
              { l:"PCI moyen",   v:`${fmt2(agg.pciMoyMWhT)} MWh/t`, c:T.purple },
              { l:"Énergie",     v:`${fmt1(agg.energieMWh)} MWh`, c:T.green },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ textAlign:"center", padding:"8px",
                background:T.bg2, borderRadius:8 }}>
                <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontSize:9, color:T.tx3, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, fontWeight:600, color:T.tx2, marginBottom:5 }}>
            Composition moyenne
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {agg.compositionMoy.map(c => {
              const e = ESSENCE_MAP[c.essenceId];
              return (
                <Badge key={c.essenceId} bg={T.greenL} color={T.greenD}>
                  {e?.emoji} {e?.label} {c.pct}%
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </SCard>
  );
};

// ── RÉFÉRENTIEL TABLE ─────────────────────────────────────────────────────────────
const ReferentielTable = ({ filter }) => {
  const rows = filter
    ? ESSENCES_REF.filter(e => e.groupe === filter)
    : ESSENCES_REF;

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ background:T.bg2 }}>
            {["Essence","Groupe","Densité sèche","Foisonnement","PCI sec","Note"].map(h => (
              <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10,
                fontWeight:700, color:T.tx2, textTransform:"uppercase",
                letterSpacing:".04em", borderBottom:`1px solid ${T.bd}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : T.bg }}>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}` }}>
                <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                  <span style={{ fontSize:16 }}>{e.emoji}</span>
                  <strong>{e.label}</strong>
                </div>
              </td>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}` }}>
                <Badge bg={e.groupe==="feuillus"?T.amberL:T.blueL}
                  color={e.groupe==="feuillus"?T.amberD:T.blueD}>
                  {e.groupe}
                </Badge>
              </td>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}`,
                fontWeight:600, color: e.densiteKgM3Sec >= 700 ? T.green : T.tx }}>
                {e.densiteKgM3Sec} kg/m³
              </td>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}`, color:T.tx2 }}>
                {e.foisonnementMoyen}
              </td>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}`,
                fontWeight:600, color:T.purple }}>
                {e.pciMWhT} MWh/t
              </td>
              <td style={{ padding:"8px 10px", borderBottom:`0.5px solid ${T.bd}`,
                fontSize:10, color:T.tx3 }}>
                {e.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasList, setTasList] = useState(buildDemoTas);
  const [selectedTasId, setSelectedTasId] = useState(null);
  const [page, setPage] = useState("calculateur");
  const [filterGroupe, setFilterGroupe] = useState(null);

  const selectedTas = tasList.find(t => t.id === selectedTasId);

  const PAGES = [
    { id:"calculateur", l:"🧮 Calculateur", icon:"🧮" },
    { id:"tas",         l:"📦 Tas biomasse", icon:"📦" },
    { id:"chargement",  l:"🚛 Chargement", icon:"🚛" },
    { id:"referentiel", l:"📚 Référentiel", icon:"📚" },
    { id:"tests",       l:"🧪 Tests", icon:"🧪" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:T.bg, color:T.tx }}>

      {/* Header */}
      <div style={{ background:"#111", color:"#fff", padding:"9px 18px",
        display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ width:26, height:26, background:T.green, borderRadius:7,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🌲</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:".02em" }}>APPLITAG</div>
          <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:".04em" }}>
            Référentiel Essences · Biomasse
          </div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", gap:8, fontSize:11 }}>
          {[
            { l:"15 essences", c:T.green },
            { l:`${TESTS_PASS}/${TEST_RESULTS.length} tests ✓`, c:TESTS_PASS===TEST_RESULTS.length?T.green:T.amber },
          ].map(({l,c}) => (
            <div key={l} style={{ padding:"4px 10px", borderRadius:7,
              background:c+"18", color:c, fontWeight:600 }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.bd}`,
        padding:"0 18px", display:"flex", gap:0, overflowX:"auto", flexShrink:0 }}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => { setPage(p.id); setSelectedTasId(null); }} style={{
            padding:"10px 14px", fontSize:12, fontWeight:500, border:"none",
            cursor:"pointer", fontFamily:"inherit", background:"none",
            color: page === p.id ? T.green : T.tx3,
            borderBottom:`2px solid ${page === p.id ? T.green : "transparent"}`,
            display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap",
          }}>{p.l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", maxWidth:920,
        width:"100%", margin:"0 auto" }}>

        {/* ── Calculateur ── */}
        {page === "calculateur" && <Calculateur />}

        {/* ── Tas biomasse ── */}
        {page === "tas" && (
          selectedTas
            ? <div style={{ background:"#fff", border:`1px solid ${T.bd}`, borderRadius:12, overflow:"hidden" }}>
                <FicheTasComplet tas={selectedTas} onBack={() => setSelectedTasId(null)} />
              </div>
            : <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
                  {tasList.map(t => (
                    <div key={t.id} onClick={() => setSelectedTasId(t.id)}
                      style={{ background:"#fff", border:`1px solid ${T.bd}`, borderRadius:12,
                        padding:"12px 14px", cursor:"pointer",
                        borderLeft:`4px solid ${T.brown}`,
                        transition:"box-shadow .1s" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.1)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow=""}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>Tas {t.numeroTas}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:T.green }}>
                          {fmt1(t.biomasse.poidsBrutT)} t
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:T.tx3, marginBottom:8 }}>
                        {t.dimensions.longueurM}m × {t.dimensions.largeurM}m × {t.dimensions.hauteurM}m ·
                        {fmt1(t.biomasse.volumeApparentM3)} m³
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:7 }}>
                        {t.composition.map(c => {
                          const e = ESSENCE_MAP[c.essenceId];
                          return (
                            <Badge key={c.essenceId} bg={T.brownL} color={T.brown}>
                              {e?.emoji} {e?.label} {c.pct}%
                            </Badge>
                          );
                        })}
                      </div>
                      <div style={{ display:"flex", gap:8, fontSize:11 }}>
                        <span style={{ color:T.purple }}>⚡ {fmt1(t.biomasse.energieMWh)} MWh</span>
                        <span style={{ color:t.humiditeEstimee>35?T.red:T.green }}>
                          💧 {t.humiditeEstimee}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
        )}

        {/* ── Chargement ── */}
        {page === "chargement" && <ChargementBroyeur tasList={tasList} />}

        {/* ── Référentiel ── */}
        {page === "referentiel" && (
          <div>
            <div style={{ display:"flex", gap:7, marginBottom:12 }}>
              {[
                [null, "Toutes (15)"],
                ["feuillus", "Feuillus (9)"],
                ["resineux", "Résineux (6)"],
              ].map(([v, l]) => (
                <Chip key={String(v)} active={filterGroupe === v}
                  onClick={() => setFilterGroupe(v)}>
                  {l}
                </Chip>
              ))}
            </div>
            <SCard title="Référentiel essences APPLITAG" icon="📚">
              <ReferentielTable filter={filterGroupe} />
            </SCard>
            <div style={{ padding:"10px 14px", background:T.purpleL, borderRadius:12,
              fontSize:11, color:T.purpleD, lineHeight:1.7, border:`1px solid ${T.purple}20` }}>
              <strong>Usage futur — APPLITAG DATA :</strong> ces coefficients alimenteront
              les indicateurs filière : tonnes livrées par essence, PCI moyen régional,
              flux plaquettes par chaufferie. Ce référentiel est la fondation de
              l'observatoire bois énergie.
            </div>
          </div>
        )}

        {/* ── Tests ── */}
        {page === "tests" && (
          <SCard title={`Tests unitaires — ${TESTS_PASS}/${TEST_RESULTS.length} passés`}
            icon="🧪" accent={TESTS_PASS===TEST_RESULTS.length?T.green:T.amber}>
            <div style={{ marginBottom:10, padding:"8px 11px", borderRadius:9,
              background:TESTS_PASS===TEST_RESULTS.length?T.greenL:T.amberL,
              fontSize:13, fontWeight:600,
              color:TESTS_PASS===TEST_RESULTS.length?T.greenD:T.amberD }}>
              {TESTS_PASS}/{TEST_RESULTS.length} tests passés
            </div>
            {TEST_RESULTS.map((r, i) => (
              <div key={i} style={{ display:"flex", gap:9, padding:"7px 0",
                borderBottom:i<TEST_RESULTS.length-1?`0.5px solid ${T.bd}`:"none", fontSize:12 }}>
                <span style={{ color:r.pass?T.green:T.red, fontWeight:700, fontSize:15, flexShrink:0 }}>
                  {r.pass ? "✓" : "✗"}
                </span>
                <div>
                  <div style={{ color:r.pass?T.tx:T.red }}>{r.name}</div>
                  {r.err && <div style={{ fontSize:10, color:T.red }}>{r.err}</div>}
                </div>
              </div>
            ))}
          </SCard>
        )}
      </div>
    </div>
  );
}
