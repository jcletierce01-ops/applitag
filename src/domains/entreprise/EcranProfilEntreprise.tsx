import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { apiGet, apiPatch, apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle } from "../../shared/ui.jsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntrepriseProfil {
  id: string;
  nom: string;
  siret?: string;
  email?: string;
  telephone?: string;
  typeEntreprise?: string;
  gpsLat?: number;
  gpsLng?: number;
  codeInsee?: string;
  codePostal?: string;
  createdAt: string;
}

interface SdesRecord {
  codeCommuneInsee: string;
  nomCommune: string;
  annee: number;
  livraisonsGwh: number | null;
  productionGwh: number | null;
  puissanceInstalleeKw: number | null;
  nbPointsLivraison: number | null;
  tauxCo2GCo2PerkWh: number | null;
  secteursDesservis: string | null;
}

const TYPE_OPTS: [string, string][] = [
  ["chaufferie",    "🔥 Chaufferie"],
  ["etf",           "🌲 ETF / Prestataire"],
  ["proprietaire",  "🏠 Propriétaire"],
  ["gestionnaire",  "📋 Gestionnaire"],
  ["autre",         "📌 Autre"],
];

// ── Panneau SDES ──────────────────────────────────────────────────────────────

const PanneauSdes = ({ codeInsee, toast, isAdmin }: { codeInsee: string; toast: (m: string, t?: string) => void; isAdmin: boolean }) => {
  const [records, setRecords] = useState<SdesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (apiGet(`/sdes/commune?codeInsee=${codeInsee}`) as Promise<SdesRecord[]>)
      .then(r => setRecords(Array.isArray(r) ? r : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [codeInsee]);

  const lancerImport = async () => {
    setImportLoading(true);
    try {
      const r: any = await apiPost("/sdes/import", {});
      toast(`Import SDES : ${r.importes ?? "?"} communes mises à jour`);
      // Recharge les données locales après import
      const updated = await apiGet(`/sdes/commune?codeInsee=${codeInsee}`) as SdesRecord[];
      setRecords(Array.isArray(updated) ? updated : []);
    } catch {
      toast("Erreur lors de l'import SDES", "warn");
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ fontSize: 13, color: C.tx3, padding: "12px 0" }}>
        📡 Chargement des données SDES…
      </div>
    );
  }

  const last = records[0];

  return (
    <div style={{ background: "#EFF6FF", borderRadius: 14, padding: 16, marginBottom: 14,
      border: "1.5px solid #BFDBFE" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>
          📊 Données SDES — Réseaux de chaleur
        </div>
        <div style={{ fontSize: 11, color: "#3B82F6" }}>
          data.gouv.fr
        </div>
      </div>

      {!last ? (
        <div>
          <div style={{ fontSize: 13, color: C.tx3, marginBottom: 12 }}>
            Aucune donnée SDES disponible pour le code INSEE <strong>{codeInsee}</strong>.
          </div>
          {isAdmin && (
            <button
              type="button"
              disabled={importLoading}
              onClick={lancerImport}
              style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid #3B82F6",
                background: "#EFF6FF", color: "#1D4ED8", cursor: "pointer", fontFamily: "inherit" }}>
              {importLoading ? "Import en cours…" : "🔄 Importer les données SDES"}
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
            Données {last.nomCommune} — année {last.annee}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              ["🌡️ Production", last.productionGwh != null ? `${last.productionGwh.toFixed(1)} GWh` : "—"],
              ["📦 Livraisons", last.livraisonsGwh != null ? `${last.livraisonsGwh.toFixed(1)} GWh` : "—"],
              ["⚡ Puissance", last.puissanceInstalleeKw != null ? `${(last.puissanceInstalleeKw / 1000).toFixed(1)} MWth` : "—"],
              ["🏠 Points livraison", last.nbPointsLivraison != null ? `${last.nbPointsLivraison}` : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1E3A8A" }}>{val}</div>
              </div>
            ))}
          </div>
          {last.tauxCo2GCo2PerkWh != null && (
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
              🌍 Contenu CO₂ : <strong>{last.tauxCo2GCo2PerkWh.toFixed(0)} gCO₂/kWh</strong>
            </div>
          )}
          {last.secteursDesservis && (
            <div style={{ fontSize: 12, color: "#374151" }}>
              🏭 Secteurs desservis : {last.secteursDesservis}
            </div>
          )}
          {records.length > 1 && (
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
              {records.length} années disponibles ({records[records.length - 1].annee}–{records[0].annee})
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Écran principal ───────────────────────────────────────────────────────────

export const EcranProfilEntreprise = ({ user, toast }: { user: any; toast: (m: string, t?: string) => void }) => {
  const [profil, setProfil] = useState<EntrepriseProfil | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<EntrepriseProfil>>({});

  useEffect(() => {
    (apiGet("/mon-entreprise/profil") as Promise<EntrepriseProfil>)
      .then(p => { setProfil(p); setForm(p); })
      .catch(() => toast("Impossible de charger le profil entreprise", "warn"));
  }, []);

  const set = (k: keyof EntrepriseProfil, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (user.role !== "admin") return;
    setSaving(true);
    try {
      const updated = await apiPatch("/mon-entreprise/profil", {
        typeEntreprise: form.typeEntreprise || undefined,
        codeInsee: form.codeInsee || undefined,
        codePostal: form.codePostal || undefined,
        gpsLat: form.gpsLat ? parseFloat(String(form.gpsLat)) : undefined,
        gpsLng: form.gpsLng ? parseFloat(String(form.gpsLng)) : undefined,
      }) as EntrepriseProfil;
      setProfil(updated);
      setForm(updated);
      setEditing(false);
      toast("Profil entreprise mis à jour");
    } catch {
      toast("Erreur lors de la sauvegarde", "warn");
    } finally {
      setSaving(false);
    }
  };

  if (!profil) {
    return (
      <div style={{ padding: PADDING, fontSize: 13, color: C.tx3 }}>
        Chargement du profil entreprise…
      </div>
    );
  }

  const isChaufferie = profil.typeEntreprise === "chaufferie";
  const isAdmin = user.role === "admin";

  return (
    <div style={{ padding: PADDING, paddingBottom: 80 }}>
      <SectionTitle icon="🏢" label="Mon entreprise"/>

      <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{profil.nom}</div>
        {profil.siret && (
          <div style={{ fontSize: 12, color: C.tx3, fontFamily: "monospace" }}>SIRET {profil.siret}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          {profil.email && (
            <div>
              <div style={{ fontSize: 11, color: C.tx3 }}>Email</div>
              <div style={{ fontSize: 13 }}>{profil.email}</div>
            </div>
          )}
          {profil.telephone && (
            <div>
              <div style={{ fontSize: 11, color: C.tx3 }}>Téléphone</div>
              <div style={{ fontSize: 13 }}>{profil.telephone}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: C.tx3 }}>Type</div>
            <div style={{ fontSize: 13 }}>
              {TYPE_OPTS.find(([v]) => v === profil.typeEntreprise)?.[1] ?? profil.typeEntreprise ?? "—"}
            </div>
          </div>
          {profil.codeInsee && (
            <div>
              <div style={{ fontSize: 11, color: C.tx3 }}>Code INSEE</div>
              <div style={{ fontSize: 13, fontFamily: "monospace" }}>{profil.codeInsee}</div>
            </div>
          )}
        </div>
      </div>

      {isChaufferie && profil.codeInsee && (
        <PanneauSdes codeInsee={profil.codeInsee} toast={toast} isAdmin={isAdmin}/>
      )}
      {isChaufferie && !profil.codeInsee && (
        <div style={{ fontSize: 13, color: C.amberD, background: C.amberL, borderRadius: 12,
          padding: "10px 14px", marginBottom: 14, border: `1px solid ${C.amber}` }}>
          ⚠ Renseigner le code INSEE commune pour afficher les données SDES réseaux de chaleur.
        </div>
      )}

      {isAdmin && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{ width: "100%", height: 44, borderRadius: 12, border: `1.5px solid ${C.bd}`,
            background: "#fff", color: C.tx, fontFamily: "inherit", fontSize: 14,
            cursor: "pointer", marginBottom: 12 }}>
          ✏️ Modifier les informations
        </button>
      )}

      {editing && isAdmin && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Modifier le profil</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: C.tx2, marginBottom: 6, fontWeight: 600 }}>Type d'entreprise</div>
            <select value={form.typeEntreprise ?? ""} onChange={e => set("typeEntreprise", e.target.value)}
              style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 10,
                border: `1.5px solid ${C.bd}`, fontFamily: "inherit", fontSize: 14, outline: "none" }}>
              <option value="">— Sélectionner —</option>
              {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <MInput label="Code INSEE commune" value={form.codeInsee ?? ""}
            onChange={v => set("codeInsee", v)} placeholder="ex : 03185"
            hint="5 chiffres — clé d'enrichissement SDES"/>
          <MInput label="Code postal" value={form.codePostal ?? ""}
            onChange={v => set("codePostal", v)} placeholder="ex : 03000" hint="optionnel"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MInput label="GPS Latitude" value={String(form.gpsLat ?? "")}
              onChange={v => set("gpsLat", v)} placeholder="ex : 46.345" type="number"/>
            <MInput label="GPS Longitude" value={String(form.gpsLng ?? "")}
              onChange={v => set("gpsLng", v)} placeholder="ex : 3.412" type="number"/>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <BigBtn onClick={handleSave} bg={C.green} icon={saving ? "" : "✓"}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </BigBtn>
            <button type="button" onClick={() => { setEditing(false); setForm(profil); }}
              style={{ flex: 1, height: 48, borderRadius: 12, border: `1.5px solid ${C.bd}`,
                background: "#fff", color: C.tx, fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
