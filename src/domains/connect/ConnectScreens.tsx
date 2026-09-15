/**
 * APPLITAG Connect — Parcours petit propriétaire forestier (1–20 ha)
 *
 * Deux composants exportés :
 *  - FormulaireConnect  : formulaire public 5 niveaux (Découverte → Passage opérationnel)
 *  - EcranPropositionsConnect : vue admin pour gérer les propositions reçues
 */

import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { apiPostPublic, apiGet, apiPatch } from "../../services/api.service.js";
import { STATUTS_ANNONCE } from "./constants.js";
import { DEFAULT_ENTREPRISE_ID } from "./local-storage.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  // Niveau 1 — Découverte
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  commune: string;
  codePostal: string;
  surfaceHa: number;
  // Niveau 2 — Pré-diagnostic
  essences: string[];
  typeRessource: string;
  derniereIntervention: string;
  // Niveau 3 — Orientation
  accesRoutier: string;
  documentGestion: string;
  contactAnterieur: boolean | null;
  // Niveau 4 — Regroupement
  voisinsInteresses: string;
  souhaitRegroupement: string;
  motivations: string[];
  commentaire: string;
  // Sinistre (optionnel — bois brûlé ou sanitaire)
  typeSinistre: string;
  dateSinistre: string;
}

const INIT: FormState = {
  nom: "", prenom: "", telephone: "", email: "",
  commune: "", codePostal: "", surfaceHa: 5,
  essences: [], typeRessource: "", derniereIntervention: "",
  accesRoutier: "", documentGestion: "", contactAnterieur: null,
  voisinsInteresses: "", souhaitRegroupement: "",
  motivations: [], commentaire: "",
  typeSinistre: "", dateSinistre: "",
};

// ── Calcul du score ───────────────────────────────────────────────────────────

type Score =
  | "lot_potentiel" | "a_visiter" | "a_regrouper"
  | "desserte_necessaire" | "gestion_durable_a_formaliser"
  | "a_prediagnostiquer" | "a_informer";

function calculerScore(f: FormState): Score {
  if (f.accesRoutier === "non" || f.accesRoutier === "a_ameliorer") return "desserte_necessaire";
  if (f.documentGestion === "aucun") return "gestion_durable_a_formaliser";
  if (f.surfaceHa >= 5 && f.derniereIntervention === "plus_20_ans") return "lot_potentiel";
  if (f.surfaceHa >= 2 && f.accesRoutier === "ok") return "a_visiter";
  if (f.voisinsInteresses === "oui" && f.souhaitRegroupement !== "non") return "a_regrouper";
  if (f.surfaceHa >= 1) return "a_prediagnostiquer";
  return "a_informer";
}

const SCORE_INFO: Record<Score, { label: string; color: string; bg: string; desc: string }> = {
  lot_potentiel: {
    label: "🌲 Lot potentiel",
    color: C.greenD, bg: C.greenL,
    desc: "Ressource immédiatement mobilisable — visite terrain prioritaire.",
  },
  a_visiter: {
    label: "📍 À visiter",
    color: C.sb, bg: C.greenL,
    desc: "Ressource qualifiable — prise de contact et visite recommandées.",
  },
  a_regrouper: {
    label: "🤝 À regrouper",
    color: C.blue, bg: C.blueL,
    desc: "Intérêt pour le regroupement avec parcelles voisines.",
  },
  desserte_necessaire: {
    label: "🚧 Desserte nécessaire",
    color: C.brown, bg: C.brownL,
    desc: "Accès à améliorer avant mobilisation — orienter vers CRPF/DFCI.",
  },
  gestion_durable_a_formaliser: {
    label: "📋 Gestion à formaliser",
    color: C.purple, bg: C.purpleL,
    desc: "Aucun document de gestion — orienter vers CNPF/CRPF.",
  },
  a_prediagnostiquer: {
    label: "🔍 Pré-diagnostic",
    color: C.blue, bg: C.blueL,
    desc: "Première étude à réaliser pour évaluer le potentiel.",
  },
  a_informer: {
    label: "ℹ️ À informer",
    color: C.tx2, bg: C.bg2,
    desc: "Propriétaire à sensibiliser — documentation et ressources CNPF.",
  },
};

// ── Essences ──────────────────────────────────────────────────────────────────

const ESSENCES_OPTIONS = [
  "Chêne", "Hêtre", "Châtaignier", "Pin sylvestre", "Pin maritime",
  "Épicéa", "Douglas", "Bouleau", "Charme", "Aulne", "Autre",
];

const MOTIVATIONS_OPTIONS = [
  "Revenus complémentaires",
  "Gestion durable de mon patrimoine",
  "Biodiversité et environnement",
  "Réduction du risque incendie",
  "Préparer la transmission",
  "Mise en valeur d'une forêt inexploitée",
  "Autre",
];

// ── Composants partagés ───────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 6, marginTop: 16 }}>
    {children}
  </div>
);

const TxtInput = ({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", height: 48, borderRadius: 10, border: `1.5px solid ${C.bd}`,
      padding: "0 12px", fontSize: 15, fontFamily: "inherit",
      background: C.bg, color: C.tx, outline: "none", boxSizing: "border-box",
    }}
  />
);

const RadioRow = ({
  options, value, onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {options.map(o => (
      <button
        key={o.v}
        onClick={() => onChange(o.v)}
        style={{
          height: 40, padding: "0 14px", borderRadius: 20,
          border: `1.5px solid ${value === o.v ? C.green : C.bd}`,
          background: value === o.v ? C.green : "#fff",
          color: value === o.v ? "#fff" : C.tx,
          fontSize: 14, fontFamily: "inherit", cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const CheckGrid = ({
  options, value, onChange, max,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {options.map(o => {
      const checked = value.includes(o);
      return (
        <button
          key={o}
          onClick={() => {
            if (checked) onChange(value.filter(x => x !== o));
            else if (!max || value.length < max) onChange([...value, o]);
          }}
          style={{
            height: 36, padding: "0 12px", borderRadius: 18,
            border: `1.5px solid ${checked ? C.blue : C.bd}`,
            background: checked ? C.blueL : "#fff",
            color: checked ? C.blueD : C.tx,
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i < current ? 24 : 8, height: 8, borderRadius: 4,
          background: i < current ? C.green : i === current ? C.blue : C.bd,
          transition: "all 0.2s",
        }}
      />
    ))}
  </div>
);

const NextBtn = ({
  onClick, disabled = false, label = "Suivant →",
}: {
  onClick: () => void; disabled?: boolean; label?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: "100%", height: 52, borderRadius: 12, marginTop: 24,
      background: disabled ? C.bd : C.green, color: "#fff",
      border: "none", fontSize: 16, fontWeight: 700,
      fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {label}
  </button>
);

// ── Niveaux (étapes) du formulaire ────────────────────────────────────────────

const NIVEAUX = [
  { num: 1, titre: "Découverte",          icone: "🌱" },
  { num: 2, titre: "Pré-diagnostic",      icone: "🔍" },
  { num: 3, titre: "Orientation",         icone: "🧭" },
  { num: 4, titre: "Regroupement",        icone: "🤝" },
  { num: 5, titre: "Passage opérationnel", icone: "🚀" },
];

// ── FormulaireConnect ─────────────────────────────────────────────────────────

export const FormulaireConnect = ({
  cibleEntrepriseId = DEFAULT_ENTREPRISE_ID,
  onSuccess,
}: {
  cibleEntrepriseId?: string;
  onSuccess?: () => void;
}) => {
  const [niveau, setNiveau] = useState(0); // 0-indexed : 0..4 = étapes, 5 = confirmation
  const [form, setForm] = useState<FormState>(INIT);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const score = calculerScore(form);
  const scoreInfo = SCORE_INFO[score];

  // ── Validation par niveau ──────────────────────────────────────────────────

  const canNext: boolean = (() => {
    if (niveau === 0)
      return form.nom.length >= 2 && /^[\d\s+().\-]{7,20}$/.test(form.telephone)
        && form.commune.length >= 2 && form.surfaceHa >= 0.5 && form.surfaceHa <= 20;
    if (niveau === 1)
      return form.essences.length > 0 && form.typeRessource !== "" && form.derniereIntervention !== "";
    if (niveau === 2)
      return form.accesRoutier !== "" && form.documentGestion !== "" && form.contactAnterieur !== null;
    if (niveau === 3)
      return form.voisinsInteresses !== "" && form.souhaitRegroupement !== "";
    return false;
  })();

  // ── Soumission ─────────────────────────────────────────────────────────────

  const soumettre = async () => {
    setLoading(true);
    setErreur(null);
    try {
      await apiPostPublic("/connect", {
        nom:                  form.nom,
        prenom:               form.prenom || undefined,
        telephone:            form.telephone,
        email:                form.email || undefined,
        commune:              form.commune,
        codePostal:           form.codePostal || undefined,
        surfaceHa:            form.surfaceHa,
        essences:             form.essences,
        typeRessource:        form.typeRessource,
        derniereIntervention: form.derniereIntervention,
        accesRoutier:         form.accesRoutier,
        documentGestion:      form.documentGestion,
        contactAnterieur:     form.contactAnterieur ?? undefined,
        voisinsInteresses:    form.voisinsInteresses,
        souhaitRegroupement:  form.souhaitRegroupement,
        motivations:          form.motivations,
        commentaire:          form.commentaire || undefined,
        typeSinistre:         form.typeSinistre || undefined,
        dateSinistre:         form.dateSinistre || undefined,
        cibleEntrepriseId,
        score,
        niveau: 5,
      });
      setEnvoye(true);
      onSuccess?.();
    } catch (e: any) {
      setErreur(e.message ?? "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation envoyée ───────────────────────────────────────────────────

  if (envoye) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌲</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.greenD, marginBottom: 8 }}>
          Merci {form.prenom || form.nom} !
        </div>
        <div style={{ fontSize: 15, color: C.tx2, lineHeight: 1.6 }}>
          Votre proposition a bien été enregistrée.<br />
          Un conseiller APPLITAG vous contactera prochainement.
        </div>
        <div
          style={{
            margin: "24px auto", maxWidth: 320, padding: 16, borderRadius: 12,
            background: scoreInfo.bg, border: `1.5px solid ${scoreInfo.color}20`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: scoreInfo.color }}>
            {scoreInfo.label}
          </div>
          <div style={{ fontSize: 13, color: C.tx2, marginTop: 4 }}>{scoreInfo.desc}</div>
        </div>
      </div>
    );
  }

  const n = NIVEAUX[niveau];

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: PADDING }}>
      {/* En-tête */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.tx3, letterSpacing: 1, textTransform: "uppercase" }}>
          APPLITAG Connect
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.greenD, marginTop: 4 }}>
          {n.icone} {n.titre}
        </div>
        <div style={{ fontSize: 13, color: C.tx3, marginTop: 4 }}>
          Étape {n.num} / {NIVEAUX.length}
        </div>
      </div>

      <StepIndicator current={niveau} total={NIVEAUX.length} />

      {/* ── Niveau 1 : Découverte ─────────────────────────────────────────── */}
      {niveau === 0 && (
        <div>
          <div style={{ fontSize: 14, color: C.tx2, marginBottom: 16, lineHeight: 1.6, textAlign: "center" }}>
            Vous possédez une parcelle forestière entre <strong>1 et 20 ha</strong> ?<br />
            Remplissez ce formulaire — nous vous rappelons sous 48 h.
          </div>
          <Label>Nom *</Label>
          <TxtInput value={form.nom} onChange={v => set("nom", v)} placeholder="Votre nom de famille" />
          <Label>Prénom</Label>
          <TxtInput value={form.prenom} onChange={v => set("prenom", v)} placeholder="Prénom (facultatif)" />
          <Label>Téléphone *</Label>
          <TxtInput value={form.telephone} onChange={v => set("telephone", v)} placeholder="06 00 00 00 00" type="tel" />
          <Label>Email</Label>
          <TxtInput value={form.email} onChange={v => set("email", v)} placeholder="votre@email.fr" type="email" />
          <Label>Commune de la parcelle *</Label>
          <TxtInput value={form.commune} onChange={v => set("commune", v)} placeholder="Ex : Vichy" />
          <Label>Code postal</Label>
          <TxtInput value={form.codePostal} onChange={v => set("codePostal", v)} placeholder="03000" />
          <Label>Surface estimée (ha) *</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range" min={0.5} max={20} step={0.5} value={form.surfaceHa}
              onChange={e => set("surfaceHa", parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <div style={{
              minWidth: 64, textAlign: "center", height: 40, lineHeight: "40px",
              borderRadius: 10, background: C.greenL, color: C.greenD,
              fontWeight: 700, fontSize: 16,
            }}>
              {form.surfaceHa} ha
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.tx3, marginTop: 4 }}>
            Les parcelles de 1 à 20 ha représentent 95 % des propriétaires forestiers privés (IGN).
          </div>
        </div>
      )}

      {/* ── Niveau 2 : Pré-diagnostic ─────────────────────────────────────── */}
      {niveau === 1 && (
        <div>
          <Label>Essences présentes sur la parcelle *</Label>
          <CheckGrid options={ESSENCES_OPTIONS} value={form.essences} onChange={v => set("essences", v)} />
          <Label>Type de peuplement *</Label>
          <RadioRow
            value={form.typeRessource}
            onChange={v => set("typeRessource", v)}
            options={[
              { v: "taillis",  label: "🌿 Taillis"       },
              { v: "futaie",   label: "🌲 Futaie"        },
              { v: "melange",  label: "🌳 Mélange"       },
              { v: "haie",     label: "〰️ Haie bocagère" },
            ]}
          />
          <Label>Dernière intervention sylvicole *</Label>
          <RadioRow
            value={form.derniereIntervention}
            onChange={v => set("derniereIntervention", v)}
            options={[
              { v: "jamais",       label: "Jamais"       },
              { v: "moins_10_ans", label: "< 10 ans"     },
              { v: "10_20_ans",    label: "10 à 20 ans"  },
              { v: "plus_20_ans",  label: "> 20 ans"     },
            ]}
          />
          <Label>Ce bois est-il issu d'un sinistre ? (facultatif)</Label>
          <RadioRow
            value={form.typeSinistre}
            onChange={v => set("typeSinistre", v === form.typeSinistre ? "" : v)}
            options={[
              { v: "POST_INCENDIE", label: "🔥 Incendie"   },
              { v: "CHABLIS",       label: "🌪 Chablis"     },
              { v: "SCOLYTES",      label: "🐛 Scolytes"    },
              { v: "PATHOGENE",     label: "🦠 Pathogène"   },
              { v: "AUTRE",         label: "⚠️ Autre"       },
            ]}
          />
          {form.typeSinistre !== "" && (
            <div style={{ marginBottom: 12 }}>
              <Label>Date du sinistre (approximative)</Label>
              <input
                type="date"
                value={form.dateSinistre}
                onChange={e => set("dateSinistre", e.target.value)}
                style={{
                  width: "100%", height: 44, padding: "0 14px", borderRadius: 10,
                  border: `1.5px solid ${C.bd}`, fontFamily: "inherit", fontSize: 15,
                  background: C.bg, color: C.tx, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Niveau 3 : Orientation ────────────────────────────────────────── */}
      {niveau === 2 && (
        <div>
          <Label>Accès routier à la parcelle *</Label>
          <RadioRow
            value={form.accesRoutier}
            onChange={v => set("accesRoutier", v)}
            options={[
              { v: "ok",          label: "✅ Bon accès"         },
              { v: "a_ameliorer", label: "⚠️ À améliorer"       },
              { v: "non",         label: "❌ Pas d'accès"       },
            ]}
          />
          <Label>Document de gestion forestière existant *</Label>
          <RadioRow
            value={form.documentGestion}
            onChange={v => set("documentGestion", v)}
            options={[
              { v: "psg",   label: "PSG"       },
              { v: "cbps",  label: "CBPS"      },
              { v: "autre", label: "Autre"     },
              { v: "aucun", label: "Aucun"     },
            ]}
          />
          <Label>Contact antérieur avec un professionnel forestier ? *</Label>
          <RadioRow
            value={form.contactAnterieur === null ? "" : form.contactAnterieur ? "oui" : "non"}
            onChange={v => set("contactAnterieur", v === "oui")}
            options={[
              { v: "oui", label: "Oui" },
              { v: "non", label: "Non" },
            ]}
          />
        </div>
      )}

      {/* ── Niveau 4 : Regroupement ───────────────────────────────────────── */}
      {niveau === 3 && (
        <div>
          <Label>Voisins propriétaires potentiellement intéressés ? *</Label>
          <RadioRow
            value={form.voisinsInteresses}
            onChange={v => set("voisinsInteresses", v)}
            options={[
              { v: "oui",     label: "Oui"     },
              { v: "non",     label: "Non"     },
              { v: "inconnu", label: "Ne sais pas" },
            ]}
          />
          <Label>Intérêt pour un regroupement avec voisins ? *</Label>
          <RadioRow
            value={form.souhaitRegroupement}
            onChange={v => set("souhaitRegroupement", v)}
            options={[
              { v: "oui",       label: "Oui"      },
              { v: "non",       label: "Non"      },
              { v: "peut_etre", label: "Peut-être" },
            ]}
          />
          <Label>Vos motivations (plusieurs choix)</Label>
          <CheckGrid
            options={MOTIVATIONS_OPTIONS}
            value={form.motivations}
            onChange={v => set("motivations", v)}
          />
          <Label>Remarques ou informations complémentaires</Label>
          <textarea
            value={form.commentaire}
            onChange={e => set("commentaire", e.target.value)}
            placeholder="Décrivez votre situation, vos questions, vos contraintes…"
            rows={3}
            style={{
              width: "100%", borderRadius: 10, border: `1.5px solid ${C.bd}`,
              padding: 12, fontSize: 15, fontFamily: "inherit",
              background: C.bg, color: C.tx, resize: "vertical",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* ── Niveau 5 : Passage opérationnel — récapitulatif + score ──────── */}
      {niveau === 4 && (
        <div>
          {/* Score automatique */}
          <div style={{
            padding: 16, borderRadius: 12, marginBottom: 20,
            background: scoreInfo.bg, border: `2px solid ${scoreInfo.color}30`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: scoreInfo.color }}>
              {scoreInfo.label}
            </div>
            <div style={{ fontSize: 14, color: C.tx2, marginTop: 6, lineHeight: 1.5 }}>
              {scoreInfo.desc}
            </div>
          </div>

          {/* Récapitulatif */}
          <div style={{ fontSize: 14, color: C.tx2, marginBottom: 4, fontWeight: 600 }}>
            Récapitulatif de votre proposition
          </div>
          {[
            ["Propriétaire",    `${form.nom}${form.prenom ? ` ${form.prenom}` : ""}`],
            ["Téléphone",       form.telephone],
            ["Commune",         form.commune],
            ["Surface",         `${form.surfaceHa} ha`],
            ["Peuplement",      form.typeRessource],
            ["Essences",        form.essences.join(", ") || "—"],
            ["Dernière interv.", form.derniereIntervention.replace(/_/g, " ")],
            ["Accès routier",   form.accesRoutier.replace(/_/g, " ")],
            ["Document gestion", form.documentGestion.toUpperCase()],
            ...(form.typeSinistre ? [["Sinistre", `${form.typeSinistre.replace(/_/g, " ")}${form.dateSinistre ? ` · ${form.dateSinistre}` : ""}`]] : []),
          ].map(([k, v]) => (
            <div key={k} style={{
              display: "flex", justifyContent: "space-between",
              padding: "7px 0", borderBottom: `1px solid ${C.bd}`,
              fontSize: 13,
            }}>
              <span style={{ color: C.tx3 }}>{k}</span>
              <span style={{ color: C.tx, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
                {v}
              </span>
            </div>
          ))}

          {erreur && (
            <div style={{
              marginTop: 16, padding: 12, borderRadius: 10,
              background: "#FCEBEB", color: C.red, fontSize: 14,
            }}>
              ⚠️ {erreur}
            </div>
          )}

          <NextBtn
            onClick={soumettre}
            disabled={loading}
            label={loading ? "Envoi en cours…" : "✅ Envoyer ma proposition"}
          />
          <div style={{ fontSize: 12, color: C.tx3, textAlign: "center", marginTop: 12 }}>
            Vos données sont utilisées uniquement pour vous contacter.<br />
            Elles ne sont pas partagées avec des tiers.
          </div>
        </div>
      )}

      {/* Boutons navigation */}
      {niveau < 4 && (
        <>
          <NextBtn onClick={() => setNiveau(n => n + 1)} disabled={!canNext} />
          {niveau > 0 && (
            <button
              onClick={() => setNiveau(n => n - 1)}
              style={{
                width: "100%", height: 40, marginTop: 8, borderRadius: 10,
                border: "none", background: "transparent", color: C.tx3,
                fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              ← Retour
            </button>
          )}
        </>
      )}
      {niveau === 4 && (
        <button
          onClick={() => setNiveau(3)}
          style={{
            width: "100%", height: 40, marginTop: 8, borderRadius: 10,
            border: "none", background: "transparent", color: C.tx3,
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← Modifier mes réponses
        </button>
      )}
    </div>
  );
};

// ── EcranPropositionsConnect ──────────────────────────────────────────────────

const STATUTS_FILTRES = [
  { id: "TOUS",        label: "Toutes" },
  { id: "recu",        label: "Reçues" },
  { id: "a_qualifier", label: "À qualifier" },
  { id: "valide",      label: "Validées" },
  { id: "lot_cree",    label: "Lot créé" },
  { id: "archive",     label: "Archivées" },
];

export const EcranPropositionsConnect = () => {
  const [propositions, setPropositions] = useState<any[]>([]);
  const [filtre, setFiltre] = useState("TOUS");
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [noteEnCours, setNoteEnCours] = useState("");
  const [saving, setSaving] = useState(false);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const q = filtre !== "TOUS" ? `?statut=${filtre}` : "";
      const data = await apiGet(`/connect${q}`) as any[];
      setPropositions(data);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void charger(); }, [filtre]);

  const changerStatut = async (id: string, statut: string) => {
    setSaving(true);
    try {
      const updated = await apiPatch(`/connect/${id}`, { statut }) as any;
      setPropositions(ps => ps.map(p => p.id === id ? updated : p));
      if (detail?.id === id) setDetail(updated);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sauvegarderNote = async (id: string) => {
    setSaving(true);
    try {
      const updated = await apiPatch(`/connect/${id}`, { noteInterne: noteEnCours }) as any;
      setPropositions(ps => ps.map(p => p.id === id ? updated : p));
      setDetail(updated);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (detail) {
    const st = STATUTS_ANNONCE[detail.statut] ?? STATUTS_ANNONCE.recu;
    const scoreInfo = SCORE_INFO[detail.score as Score] ?? SCORE_INFO.a_informer;

    return (
      <div style={{ padding: PADDING, maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => setDetail(null)}
          style={{
            background: "none", border: "none", color: C.blue, cursor: "pointer",
            fontSize: 14, fontFamily: "inherit", marginBottom: 16,
          }}
        >
          ← Retour à la liste
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {detail.nom}{detail.prenom ? ` ${detail.prenom}` : ""}
            </div>
            <div style={{ fontSize: 14, color: C.tx2 }}>
              {detail.commune} — {detail.surfaceHa} ha
            </div>
          </div>
          <div style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600,
            color: st.color, background: st.bg,
          }}>
            {st.label}
          </div>
        </div>

        {/* Score */}
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 16,
          background: scoreInfo.bg, border: `1.5px solid ${scoreInfo.color}30`,
        }}>
          <div style={{ fontWeight: 700, color: scoreInfo.color }}>{scoreInfo.label}</div>
          <div style={{ fontSize: 13, color: C.tx2, marginTop: 4 }}>{scoreInfo.desc}</div>
        </div>

        {/* Coordonnées */}
        <div style={{ fontSize: 13, color: C.tx2, marginBottom: 16 }}>
          {detail.telephone && <div>📞 {detail.telephone}</div>}
          {detail.email && <div>✉️ {detail.email}</div>}
        </div>

        {/* Données diagnostic */}
        {[
          ["Peuplement",        detail.typeRessource],
          ["Essences",          Array.isArray(detail.essences) ? detail.essences.join(", ") : "—"],
          ["Dernière interv.",  detail.derniereIntervention?.replace(/_/g, " ")],
          ["Accès routier",     detail.accesRoutier?.replace(/_/g, " ")],
          ["Document gestion",  detail.documentGestion?.toUpperCase()],
          ["Contact antérieur", detail.contactAnterieur === true ? "Oui" : detail.contactAnterieur === false ? "Non" : "—"],
          ["Voisins intéressés", detail.voisinsInteresses],
          ["Regroupement",      detail.souhaitRegroupement],
          ["Motivations",       Array.isArray(detail.motivations) ? detail.motivations.join(", ") : "—"],
          ...(detail.typeSinistre
            ? [
                ["Sinistre", `${({ POST_INCENDIE: "🔥", CHABLIS: "🌪️", SCOLYTES: "🐛", PATHOGENE: "🦠", AUTRE: "⚠️" })[detail.typeSinistre] ?? "⚠️"} ${detail.typeSinistre.replace(/_/g, " ")}`],
                ...(detail.dateSinistre ? [["Date sinistre", new Date(detail.dateSinistre).toLocaleDateString("fr-FR")]] : []),
              ]
            : []),
        ].map(([k, v]) => (
          <div key={String(k)} style={{
            display: "flex", justifyContent: "space-between",
            padding: "7px 0", borderBottom: `1px solid ${C.bd}`, fontSize: 13,
          }}>
            <span style={{ color: C.tx3 }}>{k}</span>
            <span style={{ color: C.tx, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v || "—"}</span>
          </div>
        ))}

        {detail.commentaire && (
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 10,
            background: C.bg, border: `1px solid ${C.bd}`, fontSize: 13, color: C.tx,
          }}>
            💬 {detail.commentaire}
          </div>
        )}

        {/* Changer le statut */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 8 }}>
            Changer le statut
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(STATUTS_ANNONCE).map(([k, v]) => (
              <button
                key={k}
                disabled={saving || detail.statut === k}
                onClick={() => changerStatut(detail.id, k)}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 18,
                  border: `1.5px solid ${detail.statut === k ? v.color : C.bd}`,
                  background: detail.statut === k ? v.bg : "#fff",
                  color: detail.statut === k ? v.color : C.tx2,
                  fontSize: 13, fontFamily: "inherit", cursor: detail.statut === k ? "default" : "pointer",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note interne */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 8 }}>
            Note interne (visible équipe uniquement)
          </div>
          <textarea
            value={noteEnCours || detail.noteInterne || ""}
            onChange={e => setNoteEnCours(e.target.value)}
            placeholder="Ajouter une note de suivi…"
            rows={3}
            style={{
              width: "100%", borderRadius: 10, border: `1.5px solid ${C.bd}`,
              padding: 12, fontSize: 14, fontFamily: "inherit",
              background: C.bg, color: C.tx, resize: "vertical",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <button
            disabled={saving}
            onClick={() => sauvegarderNote(detail.id)}
            style={{
              marginTop: 8, height: 40, padding: "0 20px", borderRadius: 10,
              background: C.blue, color: "#fff", border: "none",
              fontSize: 14, fontFamily: "inherit", cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "💾 Sauvegarder la note"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filtres */}
      <div style={{
        display: "flex", gap: 6, padding: "10px 16px",
        overflowX: "auto", flexShrink: 0,
        background: "#fff", borderBottom: `1px solid ${C.bd}`,
      }}>
        {STATUTS_FILTRES.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            style={{
              height: 32, padding: "0 12px", borderRadius: 16, whiteSpace: "nowrap",
              border: `1.5px solid ${filtre === f.id ? C.green : C.bd}`,
              background: filtre === f.id ? C.green : "#fff",
              color: filtre === f.id ? "#fff" : C.tx2,
              fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer",
              WebkitTapHighlightColor: "transparent", flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {erreur && (
        <div style={{ padding: 12, margin: 16, borderRadius: 10, background: "#FCEBEB", color: C.red, fontSize: 14 }}>
          ⚠️ {erreur}
        </div>
      )}

      {/* Liste */}
      <div data-scrollable="1" style={{ flex: 1, overflowY: "auto", padding: PADDING }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.tx3 }}>Chargement…</div>
        ) : propositions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.tx3 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Aucune proposition</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Les propositions soumises via le formulaire Connect apparaissent ici.
            </div>
          </div>
        ) : propositions.map((p: any) => {
          const st = STATUTS_ANNONCE[p.statut] ?? STATUTS_ANNONCE.recu;
          const scoreInfo = SCORE_INFO[p.score as Score] ?? SCORE_INFO.a_informer;
          return (
            <div
              key={p.id}
              onClick={() => { setDetail(p); setNoteEnCours(p.noteInterne ?? ""); }}
              style={{
                background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
                border: `1px solid ${C.bd}`, cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {p.nom}{p.prenom ? ` ${p.prenom}` : ""}
                  </div>
                  <div style={{ fontSize: 13, color: C.tx2 }}>
                    {p.commune} — {p.surfaceHa} ha · {p.typeRessource}
                  </div>
                </div>
                <div style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  color: st.color, background: st.bg, flexShrink: 0,
                }}>
                  {st.label}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <div style={{ padding: "6px 10px", borderRadius: 8, background: scoreInfo.bg }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: scoreInfo.color }}>
                    {scoreInfo.label}
                  </span>
                </div>
                {p.typeSinistre && (
                  <div style={{ padding: "5px 10px", borderRadius: 8, background: "#FEF3C7" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                      {`${({ POST_INCENDIE: "🔥", CHABLIS: "🌪️", SCOLYTES: "🐛", PATHOGENE: "🦠", AUTRE: "⚠️" })[p.typeSinistre] ?? "⚠️"} ${p.typeSinistre.replace(/_/g, " ")}`}
                    </span>
                  </div>
                )}
              </div>
              {p.noteInterne && (
                <div style={{ fontSize: 12, color: C.tx3, marginTop: 8 }}>
                  📝 {p.noteInterne.length > 60 ? `${p.noteInterne.slice(0, 60)}…` : p.noteInterne}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.tx3, marginTop: 6 }}>
                {new Date(p.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
