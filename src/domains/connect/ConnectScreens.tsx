/**
 * APPLITAG Connect — Parcours petit propriétaire forestier (1–20 ha)
 *
 * Deux composants exportés :
 *  - FormulaireConnect  : formulaire public 5 niveaux (Découverte → Passage opérationnel)
 *  - EcranPropositionsConnect : vue admin pour gérer les propositions reçues
 */

import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";

const SINISTRE_ICONE: Record<string, string> = {
  POST_INCENDIE: "🔥", CHABLIS: "🌪️", SCOLYTES: "🐛", PATHOGENE: "🦠", AUTRE: "⚠️",
};
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
