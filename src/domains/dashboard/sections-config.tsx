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
