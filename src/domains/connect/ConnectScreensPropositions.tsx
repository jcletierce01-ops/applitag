// @ts-nocheck
import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { apiGet, apiPatch } from "../../services/api.service.js";
import { STATUTS_ANNONCE } from "./constants.js";

// Duplique depuis ConnectScreens.tsx — utilise par EcranPropositionsConnect
const SINISTRE_ICONE = {
  POST_INCENDIE: "\uD83D\uDD25", CHABLIS: "\uD83C\uDF2A\uFE0F", SCOLYTES: "\uD83D\uDC1B", PATHOGENE: "\uD83E\uDDA0", AUTRE: "\u26A0\uFE0F",
};

type Score =
  | "lot_potentiel" | "a_visiter" | "a_regrouper"
  | "desserte_necessaire" | "gestion_durable_a_formaliser"
  | "a_prediagnostiquer" | "a_informer";

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
  const [typeSinistreEnCours, setTypeSinistreEnCours] = useState<string>("");
  const [dateSinistreEnCours, setDateSinistreEnCours] = useState<string>("");

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

  const sauvegarderSinistre = async (id: string) => {
    setSaving(true);
    try {
      const payload: any = {
        typeSinistre: typeSinistreEnCours || null,
        dateSinistre: typeSinistreEnCours && dateSinistreEnCours ? dateSinistreEnCours : null,
      };
      const updated = await apiPatch(`/connect/${id}`, payload) as any;
      setPropositions(ps => ps.map(p => p.id === id ? updated : p));
      setDetail(updated);
      setTypeSinistreEnCours(updated.typeSinistre ?? "");
      setDateSinistreEnCours(updated.dateSinistre ? String(updated.dateSinistre).slice(0, 10) : "");
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
                ["Sinistre", `${SINISTRE_ICONE[detail.typeSinistre] ?? "⚠️"} ${detail.typeSinistre.replace(/_/g, " ")}`],
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

        {/* Sinistre */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 8 }}>
            Type de sinistre
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {([
              ["", "Aucun"],
              ["POST_INCENDIE", "🔥 Incendie"],
              ["CHABLIS",       "🌪️ Chablis"],
              ["SCOLYTES",      "🐛 Scolytes"],
              ["PATHOGENE",     "🦠 Pathogène"],
              ["AUTRE",         "⚠️ Autre"],
            ] as [string, string][]).map(([val, label]) => (
              <button
                key={val}
                disabled={saving}
                onClick={() => setTypeSinistreEnCours(val)}
                style={{
                  height: 34, padding: "0 12px", borderRadius: 17,
                  border: `1.5px solid ${typeSinistreEnCours === val ? "#F59E0B" : C.bd}`,
                  background: typeSinistreEnCours === val ? "#FEF3C7" : C.bg,
                  color: typeSinistreEnCours === val ? "#92400e" : C.tx2,
                  fontSize: 13, fontFamily: "inherit",
                  cursor: saving || typeSinistreEnCours === val ? "default" : "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {typeSinistreEnCours && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>Date du sinistre (optionnel)</div>
              <input
                type="date"
                value={dateSinistreEnCours}
                onChange={e => setDateSinistreEnCours(e.target.value)}
                style={{
                  height: 38, padding: "0 10px", borderRadius: 8,
                  border: `1.5px solid ${C.bd}`, fontSize: 13,
                  fontFamily: "inherit", background: C.bg, color: C.tx,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}
          <button
            disabled={saving}
            onClick={() => sauvegarderSinistre(detail.id)}
            style={{
              height: 40, padding: "0 20px", borderRadius: 10,
              background: "#F59E0B", color: "#fff", border: "none",
              fontSize: 14, fontFamily: "inherit", cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "💾 Enregistrer le sinistre"}
          </button>
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
              onClick={() => {
                setDetail(p);
                setNoteEnCours(p.noteInterne ?? "");
                setTypeSinistreEnCours(p.typeSinistre ?? "");
                setDateSinistreEnCours(p.dateSinistre ? String(p.dateSinistre).slice(0, 10) : "");
              }}
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
                      {`${SINISTRE_ICONE[p.typeSinistre] ?? "⚠️"} ${p.typeSinistre.replace(/_/g, " ")}`}
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