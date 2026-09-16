// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../../design-system/tokens.js";
import { apiGet, apiPost, apiPatch } from "../../services/api.service.js";

// ── RAPPORTS ─────────────────────────────────────────────────────

const RAPPORTS_TYPES = [
  {id:"rpt_activite",icon:"📊",label:"Rapport d'activité",desc:"Synthèse période : CA, marges, lots, tonnages, chantiers. Export Excel + PDF.",
   axes:["Période","Client","Territoire"],delai:"Immédiat",col:"#1E5B3A"},
  {id:"rpt_traçabilite",icon:"🔗",label:"Rapport de traçabilité",desc:"Chaîne complète parcelle → chantier → lot → transport → livraison pour chaque lot.",
   axes:["Lot","Période","Client"],delai:"Immédiat",col:"#0369A1"},
  {id:"rpt_qualite",icon:"🏅",label:"Rapport qualité",desc:"Humidités, granulométries, taux de conformité, refus par lot et par période.",
   axes:["Période","Chaufferie","Lot"],delai:"Immédiat",col:"#7C3AED"},
  {id:"rpt_financier",icon:"💶",label:"Rapport financier",desc:"Coûts détaillés, marges par lot/chantier/client, seuils de rentabilité.",
   axes:["Période","Client","Chantier"],delai:"Immédiat",col:"#B45309"},
  {id:"rpt_chantier",icon:"🌲",label:"Rapport de chantier",desc:"Fiche complète par chantier : surface, volumes, coûts, entreprises, photos, clôture.",
   axes:["Chantier","Période"],delai:"Immédiat",col:"#059669"},
  {id:"rpt_regl",icon:"⚖️",label:"Rapport réglementaire",desc:"Snapshot des textes par dossier, alertes actives, clauses de réserve apposées.",
   axes:["Période","Dossier"],delai:"Immédiat",col:"#5B21B6"},
  {id:"rpt_red",icon:"🌿",label:"Rapport durabilité RED II/III",desc:"Origine biomasse, critères durabilité, réduction GES — préparation audit.",
   axes:["Période","Client"],delai:"Sur demande",col:"#065F46"},
  {id:"rpt_proprietaire",icon:"👤",label:"Rapport propriétaire",desc:"Synthèse par propriétaire : parcelles, interventions, volumes, revenus, documents.",
   axes:["Propriétaire","Période"],delai:"Immédiat",col:"#92400E"},
];

const RAPPORTS_RECENTS = [
  {type:"rpt_activite", label:"Activité Mai 2026", date:"2026-06-01", format:"PDF+Excel", taille:"284 Ko"},
  {type:"rpt_financier", label:"Rentabilité T1 2026", date:"2026-04-02", format:"Excel", taille:"196 Ko"},
  {type:"rpt_traçabilite", label:"Traçabilité LOT-2026-038", date:"2026-07-17", format:"PDF", taille:"108 Ko"},
  {type:"rpt_chantier", label:"CH-2026-12 — clôture", date:"2026-07-19", format:"PDF", taille:"1.2 Mo"},
];

export const SectionRapports = () => {
  const [activeRpt, setActiveRpt] = useState(null);
  const [periode, setPeriode]     = useState("2026-05");
  const [axe, setAxe]             = useState("");
  const rpt = activeRpt ? RAPPORTS_TYPES.find(r=>r.id===activeRpt) : null;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📑 Rapports</div>
        <div style={{fontSize:13,color:C.tx2}}>Génération de rapports par période · client · territoire · lot</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start"}}>
        <div>
          {/* Catalogue */}
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>📚 Catalogue des rapports disponibles</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {RAPPORTS_TYPES.map(r=>(
              <div key={r.id} onClick={()=>setActiveRpt(activeRpt===r.id?null:r.id)}
                style={{background:"#fff",borderRadius:10,padding:"11px 13px",cursor:"pointer",
                  border:`2px solid ${activeRpt===r.id?r.col:C.bd}`,
                  boxShadow:activeRpt===r.id?`0 0 0 3px ${r.col}22`:"none"}}>
                <div style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:5}}>
                  <span style={{fontSize:20}}>{r.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:800,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:9,padding:"1px 5px",borderRadius:3,display:"inline-block",
                      background:r.col+"15",color:r.col,fontWeight:700,marginTop:2}}>{r.delai}</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:C.tx2,lineHeight:1.4}}>{r.desc}</div>
                <div style={{marginTop:6,fontSize:9,color:C.tx3}}>
                  Axes : {r.axes.join(" · ")}
                </div>
              </div>
            ))}
          </div>

          {/* Rapports récents */}
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>🕐 Rapports récents</div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
            {RAPPORTS_RECENTS.map((r,i)=>{
              const type = RAPPORTS_TYPES.find(t=>t.id===r.type);
              return (
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",
                  padding:"9px 14px",borderBottom:i<RAPPORTS_RECENTS.length-1?`1px solid ${C.bd}`:"none",
                  background:i%2===0?"#fff":"#FAFAFA"}}>
                  <span style={{fontSize:18}}>{type?.icon||"📄"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{new Date(r.date).toLocaleDateString("fr-FR")} · {r.format} · {r.taille}</div>
                  </div>
                  <button style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                    cursor:"pointer",fontFamily:"inherit",border:`1px solid ${C.bd}`,
                    background:"transparent",color:C.tx2}}>⬇️ Télécharger</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau de génération */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${rpt?rpt.col:"#E5E7EB"}`,
          padding:16,position:"sticky",top:0}}>
          {!rpt?(
            <div style={{textAlign:"center",padding:"30px 0",color:C.tx3}}>
              <div style={{fontSize:32,marginBottom:8}}>📑</div>
              <div style={{fontSize:12}}>Sélectionnez un type de rapport<br/>pour configurer la génération</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:12}}>
                <span style={{fontSize:22}}>{rpt.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{rpt.label}</div>
                  <div style={{fontSize:10,color:C.tx2,marginTop:2}}>{rpt.desc}</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Période</div>
                  <select value={periode} onChange={e=>setPeriode(e.target.value)}
                    style={{width:"100%",padding:"6px 8px",borderRadius:7,border:`1px solid ${C.bd}`,
                      fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                    <option value="2026-05">Mai 2026</option>
                    <option value="2026-04">Avril 2026</option>
                    <option value="2026-03">Mars 2026</option>
                    <option value="2026-T2">T2 2026</option>
                    <option value="2026-T1">T1 2026</option>
                    <option value="2026">Année 2026</option>
                  </select>
                </div>
                {rpt.axes.length>1&&(
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Axe d'analyse</div>
                    <select value={axe} onChange={e=>setAxe(e.target.value)}
                      style={{width:"100%",padding:"6px 8px",borderRadius:7,border:`1px solid ${C.bd}`,
                        fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                      <option value="">— Tous —</option>
                      {rpt.axes.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Format export</div>
                  <div style={{display:"flex",gap:6}}>
                    {["PDF","Excel","PDF + Excel"].map(f=>(
                      <label key={f} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,cursor:"pointer"}}>
                        <input type="radio" name="fmt" defaultChecked={f==="PDF"}/> {f}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aperçu contenu */}
              <div style={{background:"#F9FAFB",borderRadius:8,padding:10,
                border:`1px solid ${C.bd}`,marginBottom:12,fontSize:10}}>
                <div style={{fontWeight:700,color:C.tx,marginBottom:6}}>Contenu inclus :</div>
                {[
                  "En-tête ALTEGAD + logo APPLITAG",
                  `Période : ${periode}${axe?" · Axe : "+axe:""}`,
                  "Données opérationnelles consolidées",
                  "Graphiques et tableaux de synthèse",
                  "Signature et cachet opérateur",
                  "Numéro de rapport + date de génération",
                ].map((l,i)=>(
                  <div key={i} style={{display:"flex",gap:6,color:C.tx2,marginBottom:3}}>
                    <span style={{color:rpt.col}}>▸</span>{l}
                  </div>
                ))}
              </div>

              <button style={{width:"100%",padding:"9px",borderRadius:9,fontSize:12,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",background:rpt.col,border:"none",color:"#fff"}}>
                ⚡ Générer le rapport
              </button>
              <div style={{fontSize:9,color:C.tx3,textAlign:"center",marginTop:5}}>
                Archivé automatiquement dans APPLITAG Documents
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── RÉSEAU & OFFRES ──────────────────────────────────────────────

const OFFRES_DATA = [
  {id:"o001",type:"bois_dispo",auteur:"SARL Forestry Allier",secteur:"Allier (03)",
   titre:"Lot de 180 m³ chêne/hêtre — disponible immédiatement",
   desc:"Lot bord de route, humidité ~28%, non broyé. Accès PL possible. Parcelle Tronçais.",
   volume:180,unite:"m³",qualite:"BO/BE",essence:"Chêne/Hêtre",
   humidite:28,prix:68,unite_prix:"€/m³",
   commune:"Tronçais (03360)",date:"2026-07-18",contact:"L. Bonnet",tel:"06 XX XX XX XX",
   tags:["bord route","accès PL","non broyé"],statut:"actif",vues:12},
  {id:"o002",type:"besoin_bois",auteur:"Chaufferie Vichy Agglo",secteur:"Allier (03)",
   titre:"Recherche 400 t plaquettes G30-G50 livraison août 2026",
   desc:"Chaufferie 6,8 MW cherche fournisseur régulier. H ≤ 30%, granulométrie G30-G50. Contrat annuel envisageable.",
   volume:400,unite:"t",qualite:"BE",essence:"Feuillus mélangés",
   humidite:30,prix:85,unite_prix:"€/t",
   commune:"Vichy (03200)",date:"2026-07-15",contact:"M. Perrier",tel:"04 70 XX XX XX",
   tags:["contrat annuel","G30-G50","feuillus"],statut:"actif",vues:28},
  {id:"o003",type:"prestation",auteur:"Entreprise Bocage 03",secteur:"Allier (03)",
   titre:"Broyage de haies et lisières — disponibilité août",
   desc:"Broyeur Berti BL 280, rayon 40 km autour de Moulins. Devis sur demande. Disponible mi-août.",
   volume:null,unite:null,qualite:null,essence:null,
   humidite:null,prix:null,unite_prix:null,
   commune:"Moulins (03000)",date:"2026-07-12",contact:"P. Aubert",tel:"06 YY YY YY YY",
   tags:["broyage","haies","lisières","rayon 40km"],statut:"actif",vues:7},
  {id:"o004",type:"transport",auteur:"Transports Leclercq",secteur:"Allier / Creuse",
   titre:"Capacité de transport disponible — semaines 31-32",
   desc:"PL Renault T520, semi-remorque fond mouvant 90 m³. Disponible 2 rotations/jour semaines 31-32.",
   volume:90,unite:"m³/rotation",qualite:null,essence:null,
   humidite:null,prix:3.2,unite_prix:"€/km",
   commune:"Moulins (03000)",date:"2026-07-19",contact:"M. Leclercq",tel:"06 ZZ ZZ ZZ ZZ",
   tags:["fond mouvant","PL","semaines 31-32"],statut:"actif",vues:5},
  {id:"o005",type:"stockage",auteur:"Plateforme Agrofor 03",secteur:"Allier (03)",
   titre:"Mise à disposition 2 000 m² plateforme bois — court terme",
   desc:"Plateforme bétonnée, aire de retournement PL, pont-bascule 60 t sur site. Location mensuelle.",
   volume:2000,unite:"m²",qualite:null,essence:null,
   humidite:null,prix:1200,unite_prix:"€/mois",
   commune:"Vichy (03200)",date:"2026-07-10",contact:"Direction",tel:"04 70 AA AA AA",
   tags:["plateforme","pont-bascule","court terme"],statut:"actif",vues:19},
  {id:"o006",type:"bois_dispo",auteur:"GFA Ternant",secteur:"Nièvre (58)",
   titre:"Éclaircie Douglas — 195 m³ sur pied, adjudication libre",
   desc:"Peuplement Douglas 35 ans, éclaircie mécanique. Prix plancher 45 €/m³. Visite sur RDV.",
   volume:195,unite:"m³",qualite:"BO/BI",essence:"Douglas",
   humidite:null,prix:45,unite_prix:"€/m³",
   commune:"Ternant (58)",date:"2026-07-11",contact:"GFA Ternant",tel:"—",
   tags:["sur pied","adjudication","Douglas"],statut:"actif",vues:9},
];

const TYPE_OFFRE = {
  bois_dispo: {label:"Bois disponible", icon:"🪵", col:"#1E5B3A", bg:"#D1FAE5"},
  besoin_bois:{label:"Recherche bois",  icon:"🔍", col:"#0369A1", bg:"#DBEAFE"},
  prestation: {label:"Prestation",      icon:"🔧", col:"#7C3AED", bg:"#EDE9FE"},
  transport:  {label:"Transport",       icon:"🚛", col:"#B45309", bg:"#FEF3C7"},
  stockage:   {label:"Stockage",        icon:"🏗️", col:"#065F46", bg:"#CCFBF1"},
};

const CONNECT_ETAPES = ["reçu","à qualifier","qualifié","orienté","publié","archivé"] as const;
const CONNECT_ETAPE_STYLE = {
  "reçu":       {col:"#6B7280",bg:"#F3F4F6",icon:"📥"},
  "à qualifier":{col:"#92400E",bg:"#FEF3C7",icon:"🔍"},
  "qualifié":   {col:"#0369A1",bg:"#DBEAFE",icon:"✔️"},
  "orienté":    {col:"#7C3AED",bg:"#EDE9FE",icon:"🎯"},
  "publié":     {col:"#065F46",bg:"#D1FAE5",icon:"📢"},
  "archivé":    {col:"#374151",bg:"#E5E7EB",icon:"📦"},
};

export const SectionReseau = () => {
  const [onglet, setOnglet]         = useState<"annonces"|"connect"|"mise_en_relation">("annonces");
  const [typeFiltre, setTypeFiltre] = useState("tous");
  const [selected, setSelected]    = useState(null);
  const [modeNouvelle, setModeNouvelle] = useState(false);
  const [newType, setNewType]       = useState("bois_dispo");
  const [newTitre, setNewTitre]     = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [newCommune, setNewCommune] = useState("");
  const [published, setPublished]   = useState(false);
  const [connectStatuts, setConnectStatuts] = useState<Record<string,string>>({
    o001:"orienté", o002:"publié", o003:"à qualifier", o004:"reçu", o005:"archivé", o006:"qualifié",
  });

  const offres = typeFiltre==="tous" ? OFFRES_DATA
    : OFFRES_DATA.filter(o=>o.type===typeFiltre);
  const off = selected ? OFFRES_DATA.find(o=>o.id===selected) : null;

  const publish = () => {
    if(!newTitre||!newDesc) return;
    setPublished(true);
    setTimeout(()=>{ setPublished(false); setModeNouvelle(false);
      setNewTitre(""); setNewDesc(""); setNewCommune(""); }, 2500);
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🤝 Réseau & Offres</div>
        <div style={{fontSize:13,color:C.tx2}}>Annonces de la filière — bois disponible, recherches, prestations, transport, stockage</div>
      </div>

      {/* Onglets principaux */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
        {([["annonces","📋 Annonces"],["connect","🔗 Connect"],["mise_en_relation","🎯 Mise en relation"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>{setOnglet(v);setSelected(null);setModeNouvelle(false);}}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Vue Annonces ── */}
      {onglet==="annonces"&&<>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {Object.entries(TYPE_OFFRE).map(([k,t])=>{
          const n = OFFRES_DATA.filter(o=>o.type===k).length;
          return (
            <div key={k} style={{background:t.bg,borderRadius:10,padding:"10px 12px",cursor:"pointer",
              border:`2px solid ${typeFiltre===k?t.col:"transparent"}`,textAlign:"center"}}
              onClick={()=>setTypeFiltre(typeFiltre===k?"tous":k)}>
              <div style={{fontSize:18}}>{t.icon}</div>
              <div style={{fontSize:15,fontWeight:900,color:t.col}}>{n}</div>
              <div style={{fontSize:9,color:t.col,lineHeight:1.3}}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Barre actions */}
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center"}}>
        <button onClick={()=>setTypeFiltre("tous")}
          style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
            fontFamily:"inherit",border:`1px solid ${typeFiltre==="tous"?"#1E5B3A":C.bd}`,
            background:typeFiltre==="tous"?"#1E5B3A":"transparent",
            color:typeFiltre==="tous"?"#fff":C.tx2}}>
          Toutes les annonces ({OFFRES_DATA.length})
        </button>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>{setModeNouvelle(!modeNouvelle);setSelected(null);}}
            style={{padding:"6px 16px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",background:modeNouvelle?"#7C3AED":"#1E5B3A",
              border:"none",color:"#fff"}}>
            {modeNouvelle?"✕ Annuler":"+ Déposer une annonce"}
          </button>
        </div>
      </div>

      {/* Formulaire nouvelle annonce */}
      {modeNouvelle&&(
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #7C3AED",
          padding:18,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#5B21B6",marginBottom:12}}>
            📢 Déposer une nouvelle annonce
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Type d'annonce</div>
              <select value={newType} onChange={e=>setNewType(e.target.value)}
                style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                  fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                {Object.entries(TYPE_OFFRE).map(([k,t])=>
                  <option key={k} value={k}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Commune / Secteur</div>
              <input value={newCommune} onChange={e=>setNewCommune(e.target.value)}
                placeholder="Ex : Moulins (03000)"
                style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                  fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Titre de l'annonce</div>
            <input value={newTitre} onChange={e=>setNewTitre(e.target.value)}
              placeholder="Ex : Lot 150 m³ chêne disponible…"
              style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Description</div>
            <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={3}
              placeholder="Détails : volume, qualité, humidité, prix, conditions, contact…"
              style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,
                outline:"none",resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={publish}
              style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff",
                opacity:(!newTitre||!newDesc)?0.5:1}}>
              📢 Publier l'annonce
            </button>
            {published&&<span style={{fontSize:12,color:"#059669",fontWeight:700}}>
              ✅ Annonce publiée — visible par le réseau
            </span>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:off?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {offres.map(o=>{
            const t = TYPE_OFFRE[o.type]||TYPE_OFFRE.bois_dispo;
            const isSelected = selected===o.id;
            return (
              <div key={o.id} onClick={()=>setSelected(isSelected?null:o.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?t.col:C.bd}`,
                  boxShadow:isSelected?`0 0 0 3px ${t.col}22`:"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontSize:24,flexShrink:0}}>{t.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{o.titre}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:t.bg,color:t.col}}>{t.label}</span>
                    </div>
                    <div style={{fontSize:11,color:C.tx2,lineHeight:1.4,marginBottom:5}}>{o.desc}</div>
                    <div style={{display:"flex",gap:8,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📍 {o.commune}</span>
                      <span>🏢 {o.auteur}</span>
                      <span>📅 {new Date(o.date).toLocaleDateString("fr-FR")}</span>
                      <span>👁️ {o.vues} vues</span>
                      {o.volume&&<span>📦 {o.volume} {o.unite}</span>}
                      {o.prix&&<span>💶 {o.prix} {o.unite_prix}</span>}
                    </div>
                    <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {o.tags.map(tag=>(
                        <span key={tag} style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                          background:"#F3F4F6",color:"#6B7280",fontWeight:600}}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fiche détail */}
        {off&&(()=>{
          const t = TYPE_OFFRE[off.type]||TYPE_OFFRE.bois_dispo;
          return (
            <div style={{background:"#fff",borderRadius:14,border:`2px solid ${t.col}`,
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:24}}>{t.icon}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:t.bg,color:t.col}}>{t.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:6,lineHeight:1.3}}>
                {off.titre}
              </div>
              <div style={{fontSize:11,color:C.tx2,lineHeight:1.5,marginBottom:12}}>{off.desc}</div>

              <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,marginBottom:12}}>
                {[
                  ["Publiée par",off.auteur],
                  ["Secteur",off.commune],
                  ["Date",new Date(off.date).toLocaleDateString("fr-FR")],
                  ...(off.volume?[["Volume",off.volume+" "+off.unite]]:[]),
                  ...(off.qualite?[["Qualité bois",off.qualite]]:[]),
                  ...(off.essence?[["Essence",off.essence]]:[]),
                  ...(off.humidite?[["Humidité",off.humidite+"%"]]:[]),
                  ...(off.prix?[["Prix",off.prix+" "+off.unite_prix]]:[]),
                  ["Contact",off.contact],
                  ["Téléphone",off.tel],
                  ["Vues",off.vues],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:4}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:10,display:"flex",gap:4,flexWrap:"wrap"}}>
                {off.tags.map(tag=>(
                  <span key={tag} style={{fontSize:9,padding:"2px 7px",borderRadius:4,
                    background:"#F3F4F6",color:"#6B7280",fontWeight:600}}>#{tag}</span>
                ))}
              </div>

              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:t.col,border:"none",color:"#fff"}}>
                  ✉️ Contacter
                </button>
                <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  🔖 Sauvegarder
                </button>
              </div>
              <div style={{marginTop:8,fontSize:9,color:C.tx3,textAlign:"center"}}>
                Les mises en relation restent entre professionnels — APPLITAG n'est pas partie au contrat
              </div>
            </div>
          );
        })()}
      </div>
      </>}

      {/* ── Vue Connect — pipeline qualification 5 étapes ── */}
      {onglet==="connect"&&(()=>{
        const etapeIdx = (id:string) => CONNECT_ETAPES.indexOf(connectStatuts[id] as typeof CONNECT_ETAPES[number]);
        return (
          <div>
            <div style={{fontSize:13,color:C.tx2,marginBottom:14}}>
              Faites avancer chaque offre dans le pipeline de qualification APPLITAG Connect.
            </div>
            {/* Pipeline header */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:16}}>
              {CONNECT_ETAPES.map(e=>{
                const s = CONNECT_ETAPE_STYLE[e];
                const n = Object.values(connectStatuts).filter(v=>v===e).length;
                return (
                  <div key={e} style={{background:s.bg,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:18}}>{s.icon}</div>
                    <div style={{fontSize:11,fontWeight:800,color:s.col,textTransform:"capitalize"}}>{e}</div>
                    <div style={{fontSize:18,fontWeight:900,color:s.col}}>{n}</div>
                  </div>
                );
              })}
            </div>
            {/* Offres avec avancement */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {OFFRES_DATA.map(o=>{
                const t = TYPE_OFFRE[o.type]||TYPE_OFFRE.bois_dispo;
                const statut = connectStatuts[o.id]||"reçu";
                const s = CONNECT_ETAPE_STYLE[statut as keyof typeof CONNECT_ETAPE_STYLE]||CONNECT_ETAPE_STYLE["reçu"];
                const idx = etapeIdx(o.id);
                const canPrev = idx > 0;
                const canNext = idx < CONNECT_ETAPES.length - 1;
                return (
                  <div key={o.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                    border:`2px solid ${s.col}33`,display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{fontSize:22,flexShrink:0}}>{t.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{o.titre}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:t.bg,color:t.col}}>{t.label}</span>
                        <span style={{fontSize:9,color:C.tx3}}>📍 {o.commune} · {o.auteur}</span>
                      </div>
                      {/* Stepper */}
                      <div style={{display:"flex",gap:0,alignItems:"center",marginTop:4}}>
                        {CONNECT_ETAPES.map((e,i)=>{
                          const done = i <= idx;
                          const active = i === idx;
                          const es = CONNECT_ETAPE_STYLE[e];
                          return (
                            <div key={e} style={{display:"flex",alignItems:"center",flex:1}}>
                              <div style={{
                                width:28,height:28,borderRadius:"50%",flexShrink:0,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:13,
                                background:done?s.col:"#E5E7EB",
                                color:done?"#fff":"#9CA3AF",
                                border:active?`2px solid ${s.col}`:"2px solid transparent",
                                fontWeight:active?900:500,
                              }}>
                                {done?es.icon:i+1}
                              </div>
                              {i<CONNECT_ETAPES.length-1&&(
                                <div style={{flex:1,height:3,background:i<idx?s.col:"#E5E7EB",
                                  borderRadius:2,margin:"0 2px"}}/>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{marginTop:6,fontSize:10,color:s.col,fontWeight:700}}>
                        {s.icon} Statut actuel : <span style={{textTransform:"capitalize"}}>{statut}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                      <button disabled={!canPrev}
                        onClick={()=>setConnectStatuts(prev=>({...prev,[o.id]:CONNECT_ETAPES[idx-1]}))}
                        style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,cursor:canPrev?"pointer":"default",
                          fontFamily:"inherit",background:canPrev?C.bg2:"#F3F4F6",
                          border:`1px solid ${C.bd}`,color:canPrev?C.tx:"#D1D5DB"}}>
                        ← Reculer
                      </button>
                      <button disabled={!canNext}
                        onClick={()=>setConnectStatuts(prev=>({...prev,[o.id]:CONNECT_ETAPES[idx+1]}))}
                        style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,cursor:canNext?"pointer":"default",
                          fontFamily:"inherit",background:canNext?"#1E5B3A":"#F3F4F6",
                          border:"none",color:canNext?"#fff":"#D1D5DB"}}>
                        Avancer →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Vue Mise en relation — matchmaking besoin/disponible ── */}
      {onglet==="mise_en_relation"&&(()=>{
        const besoins = OFFRES_DATA.filter(o=>o.type==="besoin_bois");
        const dispos  = OFFRES_DATA.filter(o=>o.type==="bois_dispo");
        // Simple matching: same département (2 premiers chiffres du code postal ou même commune)
        const matchPairs = besoins.flatMap(b=>{
          const dpB = b.commune.match(/\d{5}/)?.[0]?.slice(0,2)||b.commune.slice(-2);
          const matches = dispos.filter(d=>{
            const dpD = d.commune.match(/\d{5}/)?.[0]?.slice(0,2)||d.commune.slice(-2);
            return dpB===dpD;
          });
          return matches.map(d=>({besoin:b,dispo:d}));
        });
        return (
          <div>
            <div style={{fontSize:13,color:C.tx2,marginBottom:14}}>
              Rapprochement automatique entre recherches de bois et disponibilités du même département.
            </div>
            {matchPairs.length===0?(
              <div style={{padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>
                Aucune correspondance trouvée dans les annonces actuelles.
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {matchPairs.map(({besoin,dispo},i)=>{
                  const tb = TYPE_OFFRE.besoin_bois;
                  const td = TYPE_OFFRE.bois_dispo;
                  return (
                    <div key={i} style={{background:"#fff",borderRadius:14,border:"2px solid #7C3AED33",
                      padding:14}}>
                      <div style={{fontSize:10,fontWeight:800,color:"#7C3AED",marginBottom:10,
                        textTransform:"uppercase",letterSpacing:"0.05em"}}>
                        🎯 Correspondance potentielle — {besoin.commune.match(/\d{5}/)?.[0]?.slice(0,2)||"??"}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                        {/* Besoin */}
                        <div style={{background:tb.bg,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,fontWeight:800,color:tb.col,marginBottom:4}}>
                            {tb.icon} {tb.label}
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:3}}>{besoin.titre}</div>
                          <div style={{fontSize:10,color:C.tx2}}>{besoin.auteur}</div>
                          <div style={{fontSize:10,color:C.tx3}}>📍 {besoin.commune}</div>
                          {besoin.volume&&<div style={{fontSize:10,fontWeight:700,color:tb.col,marginTop:4}}>
                            📦 {besoin.volume} {besoin.unite}
                          </div>}
                        </div>
                        {/* Flèche */}
                        <div style={{fontSize:24,color:"#7C3AED",fontWeight:900}}>⇄</div>
                        {/* Disponible */}
                        <div style={{background:td.bg,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,fontWeight:800,color:td.col,marginBottom:4}}>
                            {td.icon} {td.label}
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:3}}>{dispo.titre}</div>
                          <div style={{fontSize:10,color:C.tx2}}>{dispo.auteur}</div>
                          <div style={{fontSize:10,color:C.tx3}}>📍 {dispo.commune}</div>
                          {dispo.volume&&<div style={{fontSize:10,fontWeight:700,color:td.col,marginTop:4}}>
                            📦 {dispo.volume} {dispo.unite}
                          </div>}
                          {dispo.prix&&<div style={{fontSize:10,color:C.tx2}}>💶 {dispo.prix} {dispo.unite_prix}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff"}}>
                          🤝 Initier la mise en relation
                        </button>
                        <button style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,
                          cursor:"pointer",fontFamily:"inherit",background:"transparent",
                          border:`1px solid ${C.bd}`,color:C.tx2}}>
                          Ignorer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};

// ── PLAN D'APPROVISIONNEMENT AUDITABLE ──────────────────────────

const PLAN_DATA = [
  {id:"PA-2026-001",nom:"Plan Allier Nord 2026",
   periodeDebut:"2026-01-01",periodeFin:"2026-12-31",
   operateur:"ALTEGAD SAS",chaufferie:"Chaufferie Moulins",
   objectifT:1200,realiseT:847,
   lots:["LOT-2026-044","LOT-2026-041","LOT-2026-038"],
   statut:"en_cours",conformiteRED:"conforme",
   certif:"SBP",sourceForet:"Forêt de Tronçais + Bocage Nord Allier",
   ghgEconomie:87.4,note:"Plan principal chaufferie urbaine Moulins — suivi mensuel",
   // Entonnoir V2
   ressourceTheoriqueT:2100, ressourceAccessibleT:1580,
   ressourceConcurrentsT:380, ressourceSecuriseeT:920, niveauRisqueVolumeT:73,
   // RED
   installationAvant2023:true, dateMiseEnService:"2019-06-15",
   regimeRED:"RED_II_GRAND_PERE",
   certificationActuelle:"SBP", dateExpirationCertif:"2027-03-31",
   declarationStatut:"SOUMISE", dateDeclarationAnnuelle:"2026-04-30"},
  {id:"PA-2026-002",nom:"Plan Creuse Pilote",
   periodeDebut:"2026-04-01",periodeFin:"2026-09-30",
   operateur:"ForêtPro Bourbonnais",chaufferie:"Chaufferie Guéret",
   objectifT:400,realiseT:400,
   lots:["LOT-2026-033","LOT-2026-034"],
   statut:"terminé",conformiteRED:"conforme",
   certif:"SURE",sourceForet:"Massif de Châtelus",
   ghgEconomie:91.2,note:"Plan pilote finalisé — rapport RED envoyé",
   ressourceTheoriqueT:650, ressourceAccessibleT:520,
   ressourceConcurrentsT:80, ressourceSecuriseeT:430, niveauRisqueVolumeT:10,
   installationAvant2023:false, dateMiseEnService:"2024-03-01",
   regimeRED:"RED_III",
   certificationActuelle:"SURE", dateExpirationCertif:"2027-09-30",
   declarationStatut:"SOUMISE", dateDeclarationAnnuelle:"2026-04-15"},
  {id:"PA-2026-003",nom:"Plan Ternant Douglas",
   periodeDebut:"2026-06-01",periodeFin:"2026-12-31",
   operateur:"SARL Forestry Allier",chaufferie:"Chaufferie Nevers",
   objectifT:600,realiseT:195,
   lots:["LOT-2026-042"],
   statut:"en_cours",conformiteRED:"en_cours",
   certif:"SBP",sourceForet:"Parcelle Ternant GFA",
   ghgEconomie:88.9,note:"Éclaircie Douglas en cours — pesée finale juillet",
   ressourceTheoriqueT:850, ressourceAccessibleT:710,
   ressourceConcurrentsT:130, ressourceSecuriseeT:480, niveauRisqueVolumeT:55,
   installationAvant2023:true, dateMiseEnService:"2021-09-01",
   regimeRED:"RED_II_GRAND_PERE",
   certificationActuelle:"SBP", dateExpirationCertif:"2027-06-15",
   declarationStatut:"EN_COURS", dateDeclarationAnnuelle:null},
];

const STATUT_PLAN = {
  en_cours: {label:"En cours",  icon:"🔄",col:"#1E40AF",bg:"#DBEAFE"},
  terminé:  {label:"Terminé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  brouillon:{label:"Brouillon", icon:"✏️",col:"#92400E",bg:"#FEF3C7"},
  suspendu: {label:"Suspendu",  icon:"⏸",col:"#6B7280",bg:"#F3F4F6"},
};

const CONF_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  conforme:  {col:"#065F46",bg:"#D1FAE5",label:"✅ Conforme RED"},
  en_cours:  {col:"#1E40AF",bg:"#DBEAFE",label:"🔄 Vérification en cours"},
  non_conf:  {col:"#991B1B",bg:"#FEE2E2",label:"❌ Non conforme"},
};

const REGIME_RED_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  RED_II_GRAND_PERE: {col:"#92400E",bg:"#FEF3C7",label:"🏛️ RED II — clause grand-père"},
  RED_III:           {col:"#1E40AF",bg:"#DBEAFE",label:"🇪🇺 RED III"},
  NON_CONCERNE:      {col:"#6B7280",bg:"#F3F4F6",label:"➖ Non concerné"},
};

const DECL_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  SOUMISE:      {col:"#065F46",bg:"#D1FAE5",label:"✅ Déclaration soumise"},
  EN_COURS:     {col:"#B45309",bg:"#FEF3C7",label:"📝 En cours"},
  NON_REQUISE:  {col:"#6B7280",bg:"#F3F4F6",label:"➖ Non requise"},
};

const normaliserPlan = (p: any) => ({
  ...p,
  nom:          p.nom ?? `Plan ${p.annee}`,
  objectifT:    p.tonnageCibleT ?? p.objectifT ?? 0,
  realiseT:     p.realiseT ?? 0,
  lots:         p.lots ?? [],
  statut:       p.statut === "actif" ? "en_cours" : p.statut === "archive" ? "terminé" : (p.statut ?? "brouillon"),
  conformiteRED: p.conformiteRED ?? "en_cours",
  certif:       p.certif ?? p.certificationActuelle ?? "—",
  sourceForet:  p.sourceForet ?? "—",
  ghgEconomie:  p.ghgEconomie ?? 0,
  note:         p.note ?? "",
  operateur:    p.operateur ?? "",
  chaufferie:   p.chaufferie ?? "",
  periodeDebut: p.periodeDebut ?? `${p.annee}-01-01`,
  periodeFin:   p.periodeFin ?? `${p.annee}-12-31`,
  ressourceTheoriqueT:   p.ressourceTheoriqueT ?? null,
  ressourceAccessibleT:  p.ressourceAccessibleT ?? null,
  ressourceConcurrentsT: p.ressourceConcurrentsT ?? null,
  ressourceSecuriseeT:   p.ressourceSecuriseeT ?? null,
  niveauRisqueVolumeT:   p.niveauRisqueVolumeT ?? null,
  regimeRED:             p.regimeRED ?? "NON_CONCERNE",
  declarationStatut:     p.declarationStatut ?? "NON_REQUISE",
  dateMiseEnService:     p.dateMiseEnService ?? null,
  installationAvant2023: p.installationAvant2023 ??
    (p.dateMiseEnService ? new Date(p.dateMiseEnService) < new Date("2023-11-20") : false),
  certificationActuelle: p.certificationActuelle ?? p.certif ?? null,
  dateExpirationCertif:  p.dateExpirationCertif ?? null,
  dateDeclarationAnnuelle: p.dateDeclarationAnnuelle ?? null,
});

export const SectionPlanApprovisionnement = () => {
  const [plans, setPlans] = useState(PLAN_DATA);
  const [selected, setSelected] = useState<string|null>(null);
  const [onglet, setOnglet] = useState<"liste"|"entonnoir"|"red_iii"|"synthese">("liste");
  const [planEntonnoir, setPlanEntonnoir] = useState(PLAN_DATA[0].id); // resetté par useEffect après fetch
  const [conformite, setConformite] = useState<any>(null);
  const [loadingConf, setLoadingConf] = useState(false);
  const [showForm, setShowForm] = useState<"create"|"edit"|null>(null);
  const [formData, setFormData] = useState<any>({});
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => {
    (apiGet("/plans-approvisionnement") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normaliserPlan);
          setPlans(normalized);
          setPlanEntonnoir(normalized[0].id);
        }
      })
      .catch(() => { /* PLAN_DATA reste en fallback */ });
  }, []);

  useEffect(() => {
    if (!selected) { setConformite(null); return; }
    setConformite(null);
    setLoadingConf(true);
    (apiGet(`/plans-approvisionnement/${selected}/conformite`) as Promise<any>)
      .then(setConformite)
      .catch(() => setConformite(null))
      .finally(() => setLoadingConf(false));
  }, [selected]);

  const plan = selected ? plans.find(p=>p.id===selected) : null;
  const pe   = plans.find(p=>p.id===planEntonnoir) ?? plans[0];

  const totalObj  = plans.reduce((s,p)=>s+p.objectifT,0);
  const totalReal = plans.reduce((s,p)=>s+p.realiseT,0);
  const tauxGlobal = totalObj > 0 ? Math.round(totalReal/totalObj*100) : 0;

  // Entonnoir : calcule le volume contractualisé (= réalisé pour la démo)
  const contractualiseeT = pe.realiseT;
  const entonnoir = [
    {label:"Ressource théorique",   val:pe.ressourceTheoriqueT,   color:"#1E40AF",bg:"#DBEAFE",
     note:"Inventaire CRPF / CBQ / estimation terrain"},
    {label:"Ressource accessible",  val:pe.ressourceAccessibleT,  color:"#0369A1",bg:"#E0F2FE",
     note:"Propriétaires contactables, accès camion confirmé"},
    {label:"Contractualisée",       val:contractualiseeT,         color:"#065F46",bg:"#D1FAE5",
     note:"Contrats signés — volume engagé"},
    {label:"− Concurrents",         val:-(pe.ressourceConcurrentsT??0), color:"#991B1B",bg:"#FEE2E2",
     note:"Volume capté par ETF concurrents / achats directs"},
    {label:"Sécurisée nette",       val:pe.ressourceSecuriseeT,   color:"#047857",bg:"#ECFDF5",
     note:"Volume sécurisé après déduction concurrence + risques"},
    {label:"⚠ Risque volumique",   val:-(pe.niveauRisqueVolumeT??0), color:"#B45309",bg:"#FEF3C7",
     note:"Risque de non-livraison (aléas climatiques, sanitaires…)"},
  ];
  const maxAbs = Math.max(...entonnoir.map(e=>Math.abs(e.val??0)));

  const reloadPlans = () => {
    (apiGet("/plans-approvisionnement") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setPlans(data.map(normaliserPlan));
      })
      .catch(()=>{});
  };

  const openCreate = () => {
    setFormData({ annee: new Date().getFullYear(), nom:"", tonnageCibleT:"", rayonMaxKm:"",
      humiditeMaxPct:"", regimeRED:"NON_CONCERNE", declarationStatut:"NON_REQUISE",
      certificationActuelle:"AUCUNE", installationAvant2023:false,
      dateMiseEnService:"", dateExpirationCertif:"", dateDeclarationAnnuelle:"" });
    setSelected(null);
    setShowForm("create");
  };

  const openEdit = () => {
    if (!plan) return;
    setFormData({ annee: plan.annee ?? new Date().getFullYear(), nom: plan.nom ?? "",
      tonnageCibleT: plan.objectifT ?? "", rayonMaxKm: plan.rayonMaxKm ?? "",
      humiditeMaxPct: plan.humiditeMaxPct ?? "",
      ressourceTheoriqueT: plan.ressourceTheoriqueT ?? "",
      ressourceAccessibleT: plan.ressourceAccessibleT ?? "",
      ressourceConcurrentsT: plan.ressourceConcurrentsT ?? "",
      ressourceSecuriseeT: plan.ressourceSecuriseeT ?? "",
      niveauRisqueVolumeT: plan.niveauRisqueVolumeT ?? "",
      regimeRED: plan.regimeRED ?? "NON_CONCERNE",
      declarationStatut: plan.declarationStatut ?? "NON_REQUISE",
      certificationActuelle: plan.certificationActuelle ?? plan.certif ?? "AUCUNE",
      installationAvant2023: plan.installationAvant2023 ?? false,
      dateMiseEnService: plan.dateMiseEnService ?? "",
      dateExpirationCertif: plan.dateExpirationCertif ?? "",
      dateDeclarationAnnuelle: plan.dateDeclarationAnnuelle ?? "" });
    setShowForm("edit");
  };

  const submitForm = async () => {
    setSavingForm(true);
    try {
      const num = (k: string) => formData[k] !== "" ? parseFloat(formData[k]) : undefined;
      if (showForm === "create") {
        await apiPost("/plans-approvisionnement", {
          annee: parseInt(formData.annee) || new Date().getFullYear(),
          nom: formData.nom || undefined,
          tonnageCibleT: parseFloat(formData.tonnageCibleT) || 0,
          rayonMaxKm: num("rayonMaxKm"),
          humiditeMaxPct: num("humiditeMaxPct"),
        });
      } else if (showForm === "edit" && selected) {
        await apiPatch(`/plans-approvisionnement/${selected}`, {
          nom: formData.nom || undefined,
          tonnageCibleT: num("tonnageCibleT"),
          rayonMaxKm: num("rayonMaxKm"),
          humiditeMaxPct: num("humiditeMaxPct"),
          ressourceTheoriqueT: num("ressourceTheoriqueT"),
          ressourceAccessibleT: num("ressourceAccessibleT"),
          ressourceConcurrentsT: num("ressourceConcurrentsT"),
          ressourceSecuriseeT: num("ressourceSecuriseeT"),
          niveauRisqueVolumeT: num("niveauRisqueVolumeT"),
          regimeRED: formData.regimeRED || undefined,
          certificationActuelle: formData.certificationActuelle || undefined,
          declarationStatut: formData.declarationStatut || undefined,
          dateMiseEnService: formData.dateMiseEnService || undefined,
          installationAvant2023: formData.dateMiseEnService
            ? new Date(formData.dateMiseEnService) < new Date("2023-11-20")
            : formData.installationAvant2023,
          dateExpirationCertif: formData.dateExpirationCertif || undefined,
          dateDeclarationAnnuelle: formData.dateDeclarationAnnuelle || undefined,
        });
      }
      setShowForm(null);
      reloadPlans();
    } finally { setSavingForm(false); }
  };

  const Fd = (k: string, v?: any) => setFormData((f: any) => ({...f, [k]: v ?? f[k]}));

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📐 Plan d'approvisionnement V2</div>
          <div style={{fontSize:13,color:C.tx2}}>Entonnoir ressource · Conformité RED II/III · Traçabilité GES</div>
        </div>
        <button onClick={openCreate}
          style={{padding:"8px 16px",borderRadius:10,background:"#1E5B3A",color:"#fff",
            border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          ➕ Nouveau plan
        </button>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8,flexWrap:"wrap"}}>
        {([["liste","📋 Plans"],["entonnoir","📊 Entonnoir V2"],["red_iii","🇪🇺 RED II/III"],["synthese","🌿 GES"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>{setOnglet(v);setSelected(null);}}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ONGLET ENTONNOIR V2 ─────────────────────────────────────────────── */}
      {onglet==="entonnoir"&&(
        <div>
          {/* Sélecteur plan */}
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {plans.map(p=>(
              <button key={p.id} onClick={()=>setPlanEntonnoir(p.id)}
                style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",border:"none",fontFamily:"inherit",
                  background:planEntonnoir===p.id?"#1E5B3A":"#F3F4F6",
                  color:planEntonnoir===p.id?"#fff":C.tx2}}>
                {p.nom}
              </button>
            ))}
          </div>

          <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>{pe.nom}</div>
          <div style={{fontSize:11,color:C.tx3,marginBottom:14}}>
            {pe.chaufferie} · Objectif {pe.objectifT.toLocaleString("fr-FR")} t
          </div>

          {/* Barres entonnoir */}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
            {entonnoir.map((e,i)=>{
              const v = e.val ?? 0;
              const pct = maxAbs>0 ? Math.abs(v)/maxAbs*100 : 0;
              const isDeduction = v < 0;
              return (
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:3}}>
                    <div style={{fontSize:11,fontWeight:600,color:e.color}}>{e.label}</div>
                    <div style={{fontSize:12,fontWeight:800,color:e.color,
                      fontVariantNumeric:"tabular-nums"}}>
                      {isDeduction?"-":""}{Math.abs(v).toLocaleString("fr-FR")} t
                    </div>
                  </div>
                  <div style={{height:28,background:"#F3F4F6",borderRadius:6,overflow:"hidden",
                    display:"flex",alignItems:"center"}}>
                    <div style={{height:"100%",width:`${pct}%`,
                      background:e.color,borderRadius:6,minWidth:pct>0?4:0,
                      display:"flex",alignItems:"center",justifyContent:"flex-end",
                      paddingRight:6,transition:"width .4s"}}>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:2}}>{e.note}</div>
                </div>
              );
            })}
          </div>

          {/* Synthèse entonnoir */}
          <div style={{background:"#F0FDF4",borderRadius:12,padding:14,
            border:"1px solid #BBF7D0"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:8}}>
              Synthèse entonnoir
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[
                {label:"Taux de contractualisation",
                 val:pe.ressourceAccessibleT
                   ? Math.round(contractualiseeT/pe.ressourceAccessibleT*100)+"%"
                   : "—",
                 color:"#065F46"},
                {label:"Pression concurrentielle",
                 val:pe.ressourceAccessibleT
                   ? Math.round((pe.ressourceConcurrentsT??0)/pe.ressourceAccessibleT*100)+"%"
                   : "—",
                 color:"#991B1B"},
                {label:"Couverture objectif (sécurisé)",
                 val:pe.ressourceSecuriseeT
                   ? Math.round(pe.ressourceSecuriseeT/pe.objectifT*100)+"%"
                   : "—",
                 color:"#047857"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:8,padding:"10px 12px",
                  textAlign:"center",border:"1px solid #D1FAE5"}}>
                  <div style={{fontSize:18,fontWeight:900,color:k.color}}>{k.val}</div>
                  <div style={{fontSize:9,color:C.tx3,lineHeight:1.3,marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:10,color:"#6B7280",fontStyle:"italic"}}>
              Cet écart reflète les contraintes de desserte, propriété, qualité et concurrence locale — pas un manque de ressource.
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET RED II/III ─────────────────────────────────────────────────── */}
      {onglet==="red_iii"&&(
        <div>
          <div style={{background:"#FFF7ED",border:"1px solid #FDE68A",borderRadius:10,
            padding:"12px 16px",marginBottom:16,fontSize:12,color:"#92400E"}}>
            <strong>🏛️ Clause grand-père RED II / RED III</strong><br/>
            Les installations mises en service avant le <strong>20 novembre 2023</strong> et disposant
            d'une certification reconnue (SBP, SURE, PEFC, FSC…) peuvent rester sous le régime RED II
            jusqu'au <strong>31 décembre 2027</strong> — à condition que leur certification soit à jour
            et que la déclaration annuelle soit soumise avant le 30 avril de chaque année.
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {plans.map(p=>{
              const regime = REGIME_RED_STYLE[p.regimeRED]??REGIME_RED_STYLE.NON_CONCERNE;
              const decl   = DECL_STYLE[p.declarationStatut]??DECL_STYLE.NON_REQUISE;
              const certifExpire = p.dateExpirationCertif
                ? new Date(p.dateExpirationCertif) < new Date(Date.now()+90*86400000)
                : false;
              return (
                <div key={p.id} style={{background:"#fff",borderRadius:12,
                  border:`1.5px solid ${certifExpire?"#F59E0B":C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{p.nom}</div>
                      <div style={{fontSize:11,color:C.tx3}}>{p.chaufferie}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,
                        background:regime.bg,color:regime.col}}>{regime.label}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,
                        background:decl.bg,color:decl.col}}>{decl.label}</span>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:6}}>
                    {[
                      ["🏭","Mise en service",
                        p.dateMiseEnService
                          ? new Date(p.dateMiseEnService).toLocaleDateString("fr-FR")
                          : (p.installationAvant2023?"Avant 20/11/2023":"Après 20/11/2023")],
                      ["🏅","Certification actuelle",
                        p.certificationActuelle??"—"],
                      ["📅","Expiration certification",
                        p.dateExpirationCertif
                          ?new Date(p.dateExpirationCertif).toLocaleDateString("fr-FR")
                          :"—"],
                    ].map(([ico,label,val])=>(
                      <div key={label} style={{background:"#F9FAFB",borderRadius:8,
                        padding:"8px 10px",border:"1px solid #E5E7EB"}}>
                        <div style={{fontSize:9,color:C.tx3,marginBottom:2}}>{ico} {label}</div>
                        <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {certifExpire&&(
                    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",
                      borderRadius:8,padding:"6px 10px",fontSize:11,color:"#92400E",
                      display:"flex",alignItems:"center",gap:6}}>
                      ⚠️ Certification expire dans moins de 90 jours — renouvellement urgent
                    </div>
                  )}
                  {p.dateDeclarationAnnuelle&&(
                    <div style={{fontSize:10,color:C.tx3,marginTop:6}}>
                      📝 Déclaration annuelle : {new Date(p.dateDeclarationAnnuelle).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{marginTop:14,background:"#F0FDF4",borderRadius:10,padding:"10px 14px",
            fontSize:11,color:"#065F46",border:"1px solid #BBF7D0"}}>
            📌 La date limite de déclaration annuelle RED II est le <strong>30 avril</strong>.
            La déclaration 2025 est encore ouverte en septembre 2026 — vérifier auprès du
            Ministère de la Transition Écologique.
          </div>
        </div>
      )}

      {onglet==="liste"&&<>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[
            {ico:"📐",label:"Plans actifs",val:plans.filter(p=>p.statut==="en_cours").length,col:"#1E40AF",bg:"#DBEAFE"},
            {ico:"⚖️",label:"Objectif total",val:totalObj.toLocaleString("fr-FR")+" t",col:"#1E5B3A",bg:"#D1FAE5"},
            {ico:"📦",label:"Réalisé total",val:totalReal.toLocaleString("fr-FR")+" t",col:"#B45309",bg:"#FEF3C7"},
            {ico:"🎯",label:"Taux global",val:tauxGlobal+" %",col:tauxGlobal>=80?"#065F46":"#B45309",bg:tauxGlobal>=80?"#D1FAE5":"#FEF3C7"},
          ].map(k=>(
            <div key={k.label} style={{background:k.bg,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:20}}>{k.ico}</div>
              <div style={{fontSize:16,fontWeight:900,color:k.col,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
              <div style={{fontSize:9,color:k.col,fontWeight:600}}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:plan?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
          {/* Liste plans */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {plans.map(p=>{
              const st = STATUT_PLAN[p.statut as keyof typeof STATUT_PLAN]||STATUT_PLAN.brouillon;
              const conf = CONF_STYLE[p.conformiteRED]||CONF_STYLE.en_cours;
              const taux = Math.round(p.realiseT/p.objectifT*100);
              const isSelected = selected===p.id;
              return (
                <div key={p.id} onClick={()=>setSelected(isSelected?null:p.id)}
                  style={{background:"#fff",borderRadius:12,padding:"14px 16px",cursor:"pointer",
                    border:`2px solid ${isSelected?"#1E5B3A":C.bd}`}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:800,color:C.tx}}>{p.nom}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:conf.bg,color:conf.col}}>{conf.label}</span>
                      </div>
                      <div style={{fontSize:11,color:C.tx3}}>
                        {p.operateur} · {p.chaufferie} · Certif. {p.certif}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:taux>=80?"#065F46":"#B45309"}}>{taux}%</div>
                      <div style={{fontSize:9,color:C.tx3}}>{p.realiseT.toLocaleString("fr-FR")} / {p.objectifT.toLocaleString("fr-FR")} t</div>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div style={{height:6,background:"#E5E7EB",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(taux,100)}%`,
                      background:taux>=80?"#1E5B3A":"#B45309",borderRadius:3,
                      transition:"width .3s"}}/>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:6,fontSize:10,color:C.tx3}}>
                    <span>📅 {new Date(p.periodeDebut).toLocaleDateString("fr-FR")} → {new Date(p.periodeFin).toLocaleDateString("fr-FR")}</span>
                    <span>🌲 {p.lots.length} lot(s)</span>
                    <span>🌿 GES −{p.ghgEconomie}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fiche détail */}
          {plan&&(()=>{
            const st = STATUT_PLAN[plan.statut as keyof typeof STATUT_PLAN]||STATUT_PLAN.brouillon;
            const conf = CONF_STYLE[plan.conformiteRED]||CONF_STYLE.en_cours;
            const taux = Math.round(plan.realiseT/plan.objectifT*100);
            return (
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #1E5B3A",
                padding:16,position:"sticky",top:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.tx}}>{plan.nom}</span>
                  <button onClick={()=>setSelected(null)}
                    style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
                </div>

                {[
                  ["Identifiant",plan.id],
                  ["Opérateur",plan.operateur],
                  ["Chaufferie",plan.chaufferie],
                  ["Source forêt",plan.sourceForet],
                  ["Certification",plan.certif],
                  ["Période",`${new Date(plan.periodeDebut).toLocaleDateString("fr-FR")} → ${new Date(plan.periodeFin).toLocaleDateString("fr-FR")}`],
                  ["Objectif",plan.objectifT.toLocaleString("fr-FR")+" t"],
                  ["Réalisé",`${plan.realiseT.toLocaleString("fr-FR")} t (${taux}%)`],
                  ["Éco. GES","−"+plan.ghgEconomie+"% vs fossile"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,
                    paddingBottom:5,marginBottom:5,fontSize:11}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}

                <div style={{marginTop:8,marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx3,marginBottom:6}}>LOTS ASSOCIÉS</div>
                  {plan.lots.map(lid=>(
                    <div key={lid} style={{background:"#F0FDF4",borderRadius:6,padding:"5px 9px",
                      marginBottom:4,fontSize:11,fontWeight:600,color:"#065F46"}}>
                      📦 {lid}
                    </div>
                  ))}
                </div>

                {conformite ? (
                  <div style={{background:"#F0FDF4",borderRadius:8,padding:"10px 12px",
                    marginBottom:8,border:"1.5px solid #BBF7D0"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#065F46"}}>📊 Score de conformité</span>
                      <span style={{fontSize:20,fontWeight:900,color:
                        conformite.statut==="CONFORME"?"#065F46":
                        conformite.statut==="SURVEILLANCE"?"#92400E":"#991B1B"}}>
                        {conformite.scoreGlobal} %
                      </span>
                    </div>
                    {conformite.indicateurs.map((ind: any) => {
                      const col = ind.statut==="CONFORME"?"#065F46":
                        ind.statut==="SURVEILLANCE"?"#B45309":
                        ind.statut==="SANS_CIBLE"?"#6B7280":"#991B1B";
                      const ico = ind.statut==="CONFORME"?"✅":
                        ind.statut==="SURVEILLANCE"?"⚠️":
                        ind.statut==="SANS_CIBLE"?"➖":"❌";
                      return (
                        <div key={ind.critere} style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",fontSize:10,borderBottom:`1px solid ${C.bd}`,
                          paddingBottom:4,marginBottom:4}}>
                          <span style={{color:C.tx3}}>{ico} {ind.critere}</span>
                          <span style={{fontWeight:700,color:col,fontVariantNumeric:"tabular-nums"}}>
                            {ind.realise!=null
                              ? `${ind.realise} ${ind.unite}${ind.ecartPct!=null&&ind.ecartPct>0?` (+${ind.ecartPct}%)`:""}`
                              : ind.statut==="SANS_CIBLE"?"—":"N/D"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : loadingConf ? (
                  <div style={{fontSize:10,color:C.tx3,padding:"8px 0",textAlign:"center"}}>
                    ⏳ Calcul conformité…
                  </div>
                ) : (
                  <div style={{background:conf.bg,borderRadius:8,padding:"8px 10px",
                    fontSize:11,fontWeight:700,color:conf.col,marginBottom:8}}>
                    {conf.label}
                  </div>
                )}

                {plan.note&&<div style={{fontSize:11,color:C.tx2,fontStyle:"italic",lineHeight:1.5,marginBottom:8}}>
                  📝 {plan.note}
                </div>}

                <div style={{display:"flex",gap:6,marginTop:12}}>
                  <button onClick={()=>{setConformite(null);setLoadingConf(true);
                    (apiGet(`/plans-approvisionnement/${plan.id}/conformite`) as Promise<any>)
                      .then(setConformite).catch(()=>setConformite(null)).finally(()=>setLoadingConf(false));}}
                    style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                    🔄 Actualiser
                  </button>
                  <button onClick={openEdit}
                    style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"transparent",
                      border:`1px solid ${C.bd}`,color:C.tx2}}>
                    ✏️ Modifier
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </>}

      {onglet==="synthese"&&(
        <div>
          <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,
            padding:"12px 16px",marginBottom:16,fontSize:12,color:"#065F46"}}>
            🇪🇺 <strong>Directive RED III (2023/2413/UE)</strong> — Seuil d'économie GES exigé : 80% vs fossile pour installations &gt;10 MW (depuis 2026).
            Toutes les livraisons doivent être traçées et certifiées VSS reconnu.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Conformes RED",val:plans.filter(p=>p.conformiteRED==="conforme").length,col:"#065F46",bg:"#D1FAE5"},
              {label:"En vérification",val:plans.filter(p=>p.conformiteRED==="en_cours").length,col:"#1E40AF",bg:"#DBEAFE"},
              {label:"GES moyen",val:plans.length>0?(plans.reduce((s,p)=>s+(p.ghgEconomie??0),0)/plans.length).toFixed(1)+"%":"—",col:"#7C3AED",bg:"#EDE9FE"},
            ].map(k=>(
              <div key={k.label} style={{background:k.bg,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:k.col}}>{k.val}</div>
                <div style={{fontSize:10,color:k.col,fontWeight:600}}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {plans.map(p=>{
              const conf = CONF_STYLE[p.conformiteRED]||CONF_STYLE.en_cours;
              return (
                <div key={p.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
                  padding:"10px 14px",display:"grid",
                  gridTemplateColumns:"1fr auto auto auto",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{p.nom}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{p.certif} · {p.sourceForet}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:conf.bg,color:conf.col,whiteSpace:"nowrap"}}>{conf.label}</span>
                  <span style={{fontSize:12,fontWeight:800,color:"#7C3AED",whiteSpace:"nowrap"}}>
                    −{p.ghgEconomie}% GES
                  </span>
                  <span style={{fontSize:11,color:C.tx3,whiteSpace:"nowrap"}}>
                    {p.realiseT.toLocaleString("fr-FR")} t / {p.objectifT.toLocaleString("fr-FR")} t
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Formulaire création / édition ──────────────────────────────── */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
          zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",
            maxWidth:520,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontSize:15,fontWeight:800,color:C.tx}}>
                {showForm==="create"?"➕ Nouveau plan":"✏️ Modifier le plan"}
              </div>
              <button onClick={()=>setShowForm(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.tx3}}>✕</button>
            </div>

            {/* Champs de base */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Année *</div>
                <input type="number" value={formData.annee||""} min={2020} max={2100}
                  onChange={e=>Fd("annee",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Objectif (t) *</div>
                <input type="number" value={formData.tonnageCibleT||""} min={0}
                  onChange={e=>Fd("tonnageCibleT",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Nom du plan</div>
              <input value={formData.nom||""} onChange={e=>Fd("nom",e.target.value)}
                placeholder="ex : Plan Allier Nord 2027"
                style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                  border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Rayon max (km)</div>
                <input type="number" value={formData.rayonMaxKm||""} min={0}
                  onChange={e=>Fd("rayonMaxKm",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Humidité max (%)</div>
                <input type="number" value={formData.humiditeMaxPct||""} min={0} max={100}
                  onChange={e=>Fd("humiditeMaxPct",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Entonnoir V2 — uniquement en édition */}
            {showForm==="edit"&&(<>
              <div style={{fontSize:11,fontWeight:700,color:"#1E40AF",marginBottom:8,marginTop:4}}>
                📊 Entonnoir V2
              </div>
              {[
                ["ressourceTheoriqueT","Ressource théorique (t)"],
                ["ressourceAccessibleT","Ressource accessible (t)"],
                ["ressourceConcurrentsT","Concurrents (t)"],
                ["ressourceSecuriseeT","Sécurisée nette (t)"],
                ["niveauRisqueVolumeT","Risque volumique (t)"],
              ].map(([k,l])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:3,fontWeight:600}}>{l}</div>
                  <input type="number" value={formData[k]||""} min={0}
                    onChange={e=>Fd(k,e.target.value)}
                    style={{width:"100%",height:36,padding:"0 10px",borderRadius:8,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
                </div>
              ))}

              <div style={{fontSize:11,fontWeight:700,color:"#1E40AF",marginBottom:8,marginTop:8}}>
                🇪🇺 Conformité RED
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Date mise en service chaufferie</div>
                <input type="date" value={formData.dateMiseEnService||""}
                  onChange={e=>{
                    const d = e.target.value;
                    const avant2023 = d ? new Date(d) < new Date("2023-11-20") : false;
                    setFormData((f:any)=>({...f,
                      dateMiseEnService: d,
                      installationAvant2023: avant2023,
                      regimeRED: d
                        ? (avant2023 ? "RED_II_GRAND_PERE" : "RED_III")
                        : f.regimeRED,
                    }));
                  }}
                  style={{width:"100%",height:36,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
                {formData.dateMiseEnService&&(
                  <div style={{fontSize:10,marginTop:3,
                    color: formData.installationAvant2023?"#065F46":"#1E40AF",fontWeight:600}}>
                    {formData.installationAvant2023
                      ? "✅ Avant le 20/11/2023 — éligible clause grand-père RED II"
                      : "🇪🇺 Après le 20/11/2023 — régime RED III"}
                  </div>
                )}
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Régime RED</div>
                <select value={formData.regimeRED||"NON_CONCERNE"}
                  onChange={e=>Fd("regimeRED",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  <option value="RED_II_GRAND_PERE">🏛️ RED II — clause grand-père</option>
                  <option value="RED_III">🇪🇺 RED III</option>
                  <option value="NON_CONCERNE">➖ Non concerné</option>
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Certification</div>
                <select value={formData.certificationActuelle||"AUCUNE"}
                  onChange={e=>Fd("certificationActuelle",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  {["PEFC","FSC","SBP","SURE","ISCC_PLUS","AUCUNE"].map(v=>(
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Expiration certification</div>
                <input type="date" value={formData.dateExpirationCertif||""}
                  onChange={e=>Fd("dateExpirationCertif",e.target.value)}
                  style={{width:"100%",height:36,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Statut déclaration</div>
                <select value={formData.declarationStatut||"NON_REQUISE"}
                  onChange={e=>Fd("declarationStatut",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  <option value="SOUMISE">✅ Déclaration soumise</option>
                  <option value="EN_COURS">📝 En cours</option>
                  <option value="NON_REQUISE">➖ Non requise</option>
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Date déclaration annuelle</div>
                <input type="date" value={formData.dateDeclarationAnnuelle||""}
                  onChange={e=>Fd("dateDeclarationAnnuelle",e.target.value)}
                  style={{width:"100%",height:36,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </>)}

            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={submitForm} disabled={savingForm}
                style={{flex:1,height:44,borderRadius:10,background:"#1E5B3A",color:"#fff",
                  border:"none",fontSize:13,fontWeight:700,cursor:savingForm?"not-allowed":"pointer",
                  fontFamily:"inherit",opacity:savingForm?0.7:1}}>
                {savingForm?"Enregistrement…":(showForm==="create"?"Créer le plan":"Enregistrer")}
              </button>
              <button onClick={()=>setShowForm(null)}
                style={{flex:1,height:44,borderRadius:10,background:"transparent",
                  border:`1.5px solid ${C.bd}`,color:C.tx,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PARAMÈTRES ───────────────────────────────────────────────────

export const SectionParametres = () => {
  const [onglet, setOnglet] = useState("entreprise");
  const [nomEntreprise, setNomEntreprise] = useState("ALTEGAD SAS");
  const [siret, setSiret] = useState("452 198 347 00021");
  const [adresse, setAdresse] = useState("12 rue de la Forêt, 03000 Moulins");
  const [email, setEmail] = useState("contact@altegad.fr");
  const [tel, setTel] = useState("04 70 00 00 00");
  const [codeInsee, setCodeInsee] = useState("03190");
  const [codePostal, setCodePostal] = useState("03000");
  const [seuilHumi, setSeuilHumi] = useState(30);
  const [seuilStockAlerte, setSeuilStockAlerte] = useState(20);
  const [delaiRelance, setDelaiRelance] = useState(7);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>⚙️ Paramètres</div>
        <div style={{fontSize:13,color:C.tx2}}>Configuration de l'entreprise, seuils d'alerte et préférences</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
        {[["entreprise","🏢 Entreprise"],["alertes","🔔 Seuils d'alerte"],["documents","📄 Documents PDF"],["systeme","🔧 Système"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {onglet==="entreprise"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[
              ["Raison sociale",nomEntreprise,setNomEntreprise,"text"],
              ["SIRET",siret,setSiret,"text"],
              ["Adresse",adresse,setAdresse,"text"],
              ["Email",email,setEmail,"email"],
              ["Téléphone",tel,setTel,"tel"],
              ["Code postal",codePostal,setCodePostal,"text"],
            ].map(([label,val,setter,type])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <input type={type} value={val} onChange={e=>setter(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:12,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Logo</div>
              <div style={{border:`2px dashed ${C.bd}`,borderRadius:7,padding:"14px",
                textAlign:"center",color:C.tx3,fontSize:11}}>
                📷 Glisser le logo ici (PNG/SVG)
              </div>
            </div>
          </div>

          {/* Bloc SDES — code INSEE */}
          <div style={{marginTop:16,background:"#EFF6FF",borderRadius:10,
            padding:"12px 16px",border:"1px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1D4ED8",marginBottom:8}}>
              📊 Données SDES — Réseaux de chaleur
            </div>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontSize:10,fontWeight:700,color:"#1D4ED8",marginBottom:4}}>
                  Code INSEE commune (5 chiffres)
                </div>
                <input value={codeInsee} onChange={e=>setCodeInsee(e.target.value)}
                  placeholder="ex: 33063"
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,
                    border:"1.5px solid #93C5FD",fontSize:13,fontFamily:"monospace",
                    background:"#fff",color:"#1E40AF",outline:"none",letterSpacing:"0.1em"}}/>
              </div>
              <div style={{fontSize:10,color:"#3B82F6",lineHeight:1.5,flex:2,minWidth:200}}>
                Ce code permet à APPLITAG de matcher automatiquement les données SDES
                (livraisons GWh, PDL, taux CO₂) de la commune chaufferie.
                Récupérable sur <strong>geo.api.gouv.fr</strong> ou <strong>insee.fr</strong>.
              </div>
            </div>
            {codeInsee.length===5&&/^\d{5}$/.test(codeInsee)&&(
              <div style={{marginTop:8,fontSize:11,color:"#065F46",
                background:"#D1FAE5",borderRadius:6,padding:"4px 10px",display:"inline-block"}}>
                ✅ Code INSEE valide — enrichissement SDES activé
              </div>
            )}
          </div>
        </div>
      )}

      {onglet==="alertes"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {label:"Seuil humidité bois (% max)",val:seuilHumi,setter:setSeuilHumi,unit:"%",
               desc:"Alerte si une livraison dépasse ce taux",col:"#0369A1"},
              {label:"Seuil stock chaufferie (% min)",val:seuilStockAlerte,setter:setSeuilStockAlerte,unit:"%",
               desc:"Alerte si le stock d'une chaufferie passe sous ce seuil",col:"#B45309"},
              {label:"Délai relance contacts (jours)",val:delaiRelance,setter:setDelaiRelance,unit:"j",
               desc:"Relance automatique si pas de réponse après ce délai",col:"#7C3AED"},
            ].map(s=>(
              <div key={s.label} style={{padding:"12px 14px",borderRadius:10,
                border:`1px solid ${s.col}33`,background:s.col+"08"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:8}}>{s.desc}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="range" min={0} max={s.unit==="%"?100:30}
                    value={s.val} onChange={e=>s.setter(Number(e.target.value))}
                    style={{flex:1,accentColor:s.col}}/>
                  <div style={{minWidth:48,textAlign:"center",fontWeight:900,fontSize:16,color:s.col}}>
                    {s.val}{s.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="documents"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              ["Mention légale sur BL","Sous réserve de vérification qualité à réception."],
              ["Pied de page contrats","ALTEGAD SAS — RC Moulins — TVA FR 12 452 198 347"],
              ["Clause de réserve réglementaire","Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt."],
            ].map(([label,defVal])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <textarea defaultValue={defVal} rows={2}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,
                    outline:"none",resize:"vertical"}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="systeme"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {ico:"💾",label:"Sauvegarde des données",desc:"Dernière sauvegarde : aujourd'hui à 03h00",action:"Sauvegarder maintenant",col:"#1E5B3A"},
            {ico:"📤",label:"Export global",desc:"Exporter toutes les données APPLITAG en JSON/Excel",action:"Exporter",col:"#0369A1"},
            {ico:"🔄",label:"Synchronisation",desc:"État : à jour — dernière synchro il y a 4 min",action:"Forcer synchro",col:"#7C3AED"},
            {ico:"🔍",label:"Journal des erreurs",desc:"0 erreur détectée dans les 7 derniers jours",action:"Voir le journal",col:"#6B7280"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
              padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:24}}>{s.ico}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>{s.desc}</div>
              </div>
              <button style={{padding:"6px 14px",borderRadius:7,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",border:`1px solid ${s.col}`,
                background:"transparent",color:s.col}}>
                {s.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton sauvegarder */}
      {onglet!=="systeme"&&(
        <div style={{marginTop:16,display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={save}
            style={{padding:"9px 24px",borderRadius:9,fontSize:12,fontWeight:800,
              cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
            💾 Enregistrer les modifications
          </button>
          {saved&&<span style={{fontSize:12,color:"#059669",fontWeight:700}}>✅ Modifications enregistrées</span>}
        </div>
      )}
    </div>
  );
};

// ── CHANTIERS ───────────────────────────────────────────────────

