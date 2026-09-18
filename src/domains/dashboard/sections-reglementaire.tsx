// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { VSS_RECONNUS } from "./sections.constants.js";
import { STATUT_FOURN_RED } from "./sections-terrain-op.js";

const DEMO_FOURNISSEURS_RED = [
  {id:"fr1", nom:"BOIS MASSIF AUVERGNE", siret:"123 456 789 00012",
   contact:"Jean-Paul Martin", tel:"06 12 34 56 78", email:"jp.martin@bma.fr",
   systeme:"sbp", numeroCertif:"SBP-COC-FR-2024-1892",
   organisme:"Bureau Veritas", dateAudit:"2024-03-15", dateExpiration:"2025-03-14",
   perimetre:["plaquettes","bois_forestier"], commune:"Riom", dep:"63",
   statut:"valide"},
  {id:"fr2", nom:"ETF FORÊT BOURBONNAIS", siret:"987 654 321 00098",
   contact:"Pierre Dubois", tel:"06 98 76 54 32", email:"p.dubois@efb.fr",
   systeme:"iscc_eu", numeroCertif:"ISCC-EU-FR-2023-4421",
   organisme:"SGS France", dateAudit:"2023-11-20", dateExpiration:"2024-11-19",
   perimetre:["bois_forestier","residus"], commune:"Moulins", dep:"03",
   statut:"expire"},
  {id:"fr3", nom:"PLATEFORME BOIS ÉNERGIE CREUSE", siret:"456 123 789 00034",
   contact:"Marie Lefort", tel:"05 55 12 34 56", email:"m.lefort@pbec.fr",
   systeme:"sure", numeroCertif:"",
   organisme:"", dateAudit:"", dateExpiration:"",
   perimetre:["plaquettes","connexes"], commune:"Guéret", dep:"23",
   statut:"a_auditer"},
  {id:"fr4", nom:"SCIERIE DES COMBRAILLES", siret:"789 012 345 00056",
   contact:"François Auclair", tel:"04 73 45 67 89", email:"f.auclair@sdc.fr",
   systeme:"2bsvs", numeroCertif:"2BSvs-FR-2024-8831",
   organisme:"ECOCERT", dateAudit:"2024-06-01", dateExpiration:"2025-05-31",
   perimetre:["connexes","dechets_bois"], commune:"Pontaumur", dep:"63",
   statut:"valide"},
];

const DEMO_NON_CONFORMITES = [
  {id:"nc1", lotNumero:"LOT-2026-06-89-004", date:"2026-05-10",
   type:"certificat_expire", gravite:"majeure",
   description:"Certificat SBP fournisseur BOIS MASSIF expiré depuis 5 jours à la date de livraison.",
   correction:"Demande de renouvellement engagée. Suspension temporaire des livraisons RED.",
   statut:"en_cours", responsable:"J.-C. Letierce"},
  {id:"nc2", lotNumero:"LOT-2026-06-89-002", date:"2026-04-22",
   type:"gps_manquant", gravite:"mineure",
   description:"Coordonnées GPS parcelle non enregistrées lors de la visite terrain.",
   correction:"GPS saisi a posteriori sur base de la fiche cadastrale. Photos géolocalisées ajoutées.",
   statut:"corrigee", responsable:"Pierre Martin"},
  {id:"nc3", lotNumero:"LOT-2026-06-89-001", date:"2026-03-15",
   type:"document_manquant", gravite:"majeure",
   description:"Autorisation de coupe non transmise avant démarrage du chantier.",
   correction:"Document reçu le 18/03. Chantier suspendu 3 jours.",
   statut:"corrigee", responsable:"J.-C. Letierce"},
];

const STATUT_NC = {
  ouverte:   {label:"Ouverte",   color:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  en_cours:  {label:"En cours",  color:"#92400E", bg:"#FEF3C7", icon:"🟡"},
  corrigee:  {label:"Corrigée", color:"#065F46", bg:"#D1FAE5", icon:"✅"},
};

const GRAVITE_NC = {
  mineure: {label:"Mineure", color:"#92400E", bg:"#FEF3C7"},
  majeure: {label:"Majeure", color:"#991B1B", bg:"#FEE2E2"},
  critique:{label:"Critique",color:"#7F1D1D", bg:"#FECACA"},
};

const exportCSVFromRows = (headers, rows, filename) => {
  const escape = v => `"${String(v||"").replace(/"/g,'""')}"`;
  const csv = [headers.map(escape).join(";"),
    ...rows.map(r=>r.map(escape).join(";"))].join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

// ── CONFORMITÉ RED — COMPOSANT ──────────────────────────────────
export const SectionConformiteRED = ({lots=[], visites=[], livraisons=[], _plateformes=[]}) => {
  const [tab, setTab] = useState("fournisseurs");

  // Fournisseurs
  const [fournisseurs, setFournisseurs] = useState(DEMO_FOURNISSEURS_RED);
  const [ficheOpen, setFicheOpen]       = useState(null);
  const [filtreStat, setFiltreStat]     = useState("tous");
  const [showNewFourn, setShowNewFourn] = useState(false);
  const [newFourn, setNewFourn]         = useState({nom:"",systeme:"sbp",statut:"a_auditer",perimetre:[]});

  // Bilan massique
  const [entreeRed,  setEntreeRed]      = useState(85);
  const [entreeNonRed,setEntreeNonRed]  = useState(40);
  const [sortieRed,  setSortieRed]      = useState(60);
  const [sortieNonRed,setSortieNonRed]  = useState(30);

  // Registre NC
  const [nonConformites, setNC]         = useState(DEMO_NON_CONFORMITES);
  const [showNewNC, setShowNewNC]       = useState(false);
  const [newNC, setNewNC]               = useState({lotNumero:"",type:"",gravite:"mineure",description:"",correction:"",statut:"ouverte",responsable:""});
  const [filtreNC, setFiltreNC]         = useState("tous");

  // Lot sélectionné (checklist, traçabilité, dossier)
  const [lotSelId, setLotSelId]         = useState(lots[0]?.id||"");
  const lotSel   = lots.find(l=>l.id===lotSelId);
  const visiteSel= visites.find(v=>v.lotId===lotSelId);

  const TABS = [
    {id:"fournisseurs", label:"1 · Fournisseurs"},
    {id:"checklist",    label:"3 · Checklist terrain"},
    {id:"tracabilite",  label:"4 · Traçabilité"},
    {id:"bilan",        label:"5 · Bilan massique"},
    {id:"dossier",      label:"6 · Dossier documentaire"},
    {id:"registre",     label:"7 · Registre audit"},
  ];

  // ── helpers ──
  const statutFourn = f => {
    if(!f.numeroCertif||!f.organisme||!f.dateExpiration) return "incomplet";
    if(f.dateExpiration && new Date(f.dateExpiration)<new Date()) return "expire";
    return f.statut||"a_auditer";
  };

  const redChecklist = v => v ? [
    {label:"Coupe autorisée",           ok:v.coupeAutorisee==="oui",      ref:"Art. 29 RED II"},
    {label:"Propriétaire identifié",    ok:!!(v.nomSignProprio||v.sigProprio), ref:"Art. 29"},
    {label:"GPS parcelle enregistré",   ok:!!(v.gps?.lat),                ref:"Traçabilité"},
    {label:"Zone protégée vérifiée",    ok:v.zoneProtegee==="non"||v.zoneProtegee==="oui",ref:"Art. 29 §3"},
    {label:"Zone humide / tourbière",   ok:!v.contraintes?.zoneHumide&&!v.contraintes?.tourbieres, ref:"Art. 29 §3"},
    {label:"Sol vulnérable pris en compte",ok:true,                        ref:"Art. 29 §4"},
    {label:"Forêt primaire exclue",     ok:v.redForetPrimaire==="confirme",ref:"Art. 29 §6"},
    {label:"Récolte souches/racines limitée",ok:v.redBoisMort?.souches,   ref:"Art. 29 §6"},
    {label:"Rétention bois mort",       ok:v.redBoisMort?.boisMort,       ref:"Art. 29 §6"},
    {label:"Coupe rase ≤ seuil",        ok:v.redBoisMort?.coupeRase,      ref:"Art. 29 §6"},
    {label:"Document de gestion forestière",ok:v.redDocGestion&&v.redDocGestion!=="aucun",ref:"Art. 29 §7"},
    {label:"Replantation prévue",       ok:v.replantation==="oui"||v.replantation==="a_definir",ref:"Art. 29 §7"},
    {label:"Photos terrain enregistrées",ok:(v.photos?.length||0)>0,      ref:"Traçabilité"},
    {label:"VSS / certification renseignée",ok:!!(v.redSysVolontaire||v.certification!=="aucune"),ref:"Art. 30"},
    {label:"GES calculé / renseigné",   ok:!!(v.redCategorie),            ref:"Art. 29 §10"},
  ] : [];

  const chaineEtapes = (lot, visite, livsLot) => CHAINE_ETAPES.map((e,i) => {
    const done = i===0 ? !!lot
      : i===1 ? lot?.statut==="bord_route"||lot?.statut==="exploitation"||lot?.statut==="livraison"||lot?.statut==="livre"
      : i===2 ? lot?.statut==="exploitation"||lot?.statut==="livraison"||lot?.statut==="livre"
      : i===3 ? lot?.statut==="livraison"||lot?.statut==="livre"
      : i<=6  ? lot?.statut==="livraison"||lot?.statut==="livre"
      : i===7 ? (livsLot?.length||0)>0
      : i===8 ? (livsLot?.length||0)>0
      : i===9 ? !!(livsLot?.some(l=>l.humiditeReception||(l.poidsNet||l.poidsBrut))) : false;
    return {...e, done:!!done};
  });

  const MAP_PAR_T = 2.5; // MAP = mètre cube apparent de plaquettes
  const bilanMix   = Math.max(0, entreeRed - sortieRed);
  const bilanNonRed= Math.max(0, entreeNonRed - sortieNonRed);
  const pctRed     = (entreeRed+entreeNonRed)>0
    ? ((entreeRed)/(entreeRed+entreeNonRed)*100).toFixed(0) : 0;

  const docsRequis = [
    {id:"certif_fourn",   label:"Certificat fournisseur VSS",      ok:!!(visiteSel?.redVssCertificat||visiteSel?.numeroCertification)},
    {id:"contrat",        label:"Contrat / bon d'achat signé",     ok:!!(lotSel?.contratSigne||visiteSel?.sigProprio)},
    {id:"autorisation",   label:"Autorisation propriétaire / coupe",ok:visiteSel?.coupeAutorisee==="oui"},
    {id:"fiche_lot",      label:"Fiche lot (visite terrain)",       ok:!!visiteSel},
    {id:"photos_gps",     label:"Photos GPS parcelle",              ok:(visiteSel?.photos?.length||0)>0},
    {id:"cmr",            label:"CMR (lettre de voiture)",          ok:!!(livraisons.find(l=>l.lotId===lotSelId)?.numeroCMR)},
    {id:"pesee",          label:"Ticket de pesée réception",        ok:!!(livraisons.find(l=>l.lotId===lotSelId)?.numTicket)},
    {id:"humidite",       label:"Analyse humidité",                  ok:!!(visiteSel?.humiditeMesure||livraisons.find(l=>l.lotId===lotSelId)?.humiditeReception)},
    {id:"attestation",    label:"Attestation de durabilité RED",    ok:visiteSel?.statutRed==="conforme"},
    {id:"ges",            label:"Rapport de calcul GES",             ok:!!(visiteSel?.redCategorie)},
  ];
  const nbDocsOk = docsRequis.filter(d=>d.ok).length;

  const checklist = redChecklist(visiteSel);
  const nbOk = checklist.filter(c=>c.ok).length;

  const ncFiltrees = filtreNC==="tous" ? nonConformites
    : nonConformites.filter(n=>n.statut===filtreNC);

  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 4px 80px"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,color:C.tx,marginBottom:4}}>
          🇪🇺 Conformité RED II — Biomasse
        </div>
        <div style={{fontSize:13,color:C.tx3,lineHeight:1.6}}>
          Gestion de la durabilité biomasse selon la directive RED II (2018/2001/UE).
          Fournisseurs, traçabilité, bilan massique, dossier documentaire et registre d'audit.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:12,fontWeight:tab===t.id?700:400,
            background:tab===t.id?"#1D4ED8":"#fff",
            color:tab===t.id?"#fff":C.tx2,
            boxShadow:tab===t.id?"0 2px 8px rgba(29,78,216,.25)":"0 1px 3px rgba(0,0,0,.08)",
            flexShrink:0,transition:"all .2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MODULE 1 : FOURNISSEURS ── */}
      {tab==="fournisseurs"&&(
        <div>
          {/* Filtre + bouton */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {["tous","valide","expire","incomplet","a_auditer"].map(s=>(
              <button key={s} onClick={()=>setFiltreStat(s)} style={{
                padding:"6px 12px",borderRadius:16,border:`1.5px solid ${filtreStat===s?"#1D4ED8":C.bd}`,
                background:filtreStat===s?"#1D4ED8":"#fff",
                color:filtreStat===s?"#fff":C.tx2,
                cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:filtreStat===s?700:400}}>
                {s==="tous"?"Tous":STATUT_FOURN_RED[s]?.label||s}
              </button>
            ))}
            <button onClick={()=>setShowNewFourn(v=>!v)} style={{
              marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"none",
              background:"#1D4ED8",color:"#fff",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:700}}>
              + Nouveau fournisseur
            </button>
          </div>

          {/* Form nouveau */}
          {showNewFourn&&(
            <div style={{background:"#EFF6FF",borderRadius:16,padding:16,
              marginBottom:14,border:"1.5px solid #93C5FD"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1D4ED8",marginBottom:12}}>
                Nouveau fournisseur RED
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Raison sociale","nom"],["SIRET","siret"],["Contact","contact"],["Téléphone","tel"],["Email","email"],["Commune","commune"]].map(([l,k])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>{l}</div>
                    <input value={newFourn[k]||""} onChange={e=>setNewFourn(p=>({...p,[k]:e.target.value}))}
                      style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Système VSS</div>
                  <select value={newFourn.systeme} onChange={e=>setNewFourn(p=>({...p,systeme:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    {["sure","sbp","iscc_eu","2bsvs","redcert_eu","autre"].map(s=>(
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>N° certificat</div>
                  <input value={newFourn.numeroCertif||""} onChange={e=>setNewFourn(p=>({...p,numeroCertif:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Organisme certificateur</div>
                  <input value={newFourn.organisme||""} onChange={e=>setNewFourn(p=>({...p,organisme:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Date d'expiration</div>
                  <input type="date" value={newFourn.dateExpiration||""} onChange={e=>setNewFourn(p=>({...p,dateExpiration:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:6}}>Périmètre</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {PERIMETRE_RED_OPTS.map(p=>{
                    const sel=(newFourn.perimetre||[]).includes(p.id);
                    return (
                      <button key={p.id} onClick={()=>setNewFourn(prev=>{
                        const arr=prev.perimetre||[];
                        return {...prev,perimetre:sel?arr.filter(x=>x!==p.id):[...arr,p.id]};
                      })} style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:sel?700:400,
                        border:`1.5px solid ${sel?"#1D4ED8":C.bd}`,
                        background:sel?"#DBEAFE":"#fff",color:sel?"#1D4ED8":C.tx2,
                        cursor:"pointer",fontFamily:"inherit"}}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button onClick={()=>{
                  const id="fr"+Date.now();
                  const stat=statutFourn({...newFourn,id});
                  setFournisseurs(p=>[...p,{...newFourn,id,statut:stat}]);
                  setShowNewFourn(false);
                  setNewFourn({nom:"",systeme:"sbp",statut:"a_auditer",perimetre:[]});
                }} style={{flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:"#1D4ED8",color:"#fff",cursor:"pointer",fontFamily:"inherit",
                  fontSize:13,fontWeight:700}}>
                  Enregistrer
                </button>
                <button onClick={()=>setShowNewFourn(false)} style={{padding:"10px 16px",
                  borderRadius:10,border:`1px solid ${C.bd}`,background:"#fff",
                  cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.tx2}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          {fournisseurs
            .filter(f=>filtreStat==="tous"||statutFourn(f)===filtreStat)
            .map(f=>{
              const s=STATUT_FOURN_RED[statutFourn(f)]||STATUT_FOURN_RED.a_auditer;
              return (
                <div key={f.id} style={{background:"#fff",borderRadius:14,padding:14,
                  marginBottom:10,border:`1px solid ${C.bd}`,cursor:"pointer",
                  boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}
                  onClick={()=>setFicheOpen(ficheOpen===f.id?null:f.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{f.nom}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {f.commune&&f.dep?`${f.commune} (${f.dep}) · `:""}{f.systeme?.toUpperCase()} · {f.organisme||"—"}
                      </div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:s.color,background:s.bg,
                      padding:"4px 10px",borderRadius:20,flexShrink:0}}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                  {ficheOpen===f.id&&(
                    <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.bd}`}}
                      onClick={e=>e.stopPropagation()}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {[
                          ["N° certificat",f.numeroCertif||"—"],
                          ["Système VSS", f.systeme?.toUpperCase()||"—"],
                          ["Organisme",   f.organisme||"—"],
                          ["Date audit",  f.dateAudit||"—"],
                          ["Expiration",  f.dateExpiration||"—"],
                          ["Contact",     f.contact||"—"],
                          ["Téléphone",   f.tel||"—"],
                          ["Email",       f.email||"—"],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{l}</div>
                            <div style={{fontSize:12,color:C.tx,fontWeight:500,marginTop:2}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {(f.perimetre?.length||0)>0&&(
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:11,color:C.tx3,fontWeight:600,marginBottom:6}}>Périmètre certifié</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {f.perimetre.map(p=>(
                              <span key={p} style={{fontSize:11,padding:"3px 8px",borderRadius:6,
                                background:"#DBEAFE",color:"#1E40AF",fontWeight:600}}>
                                {PERIMETRE_RED_OPTS.find(x=>x.id===p)?.label||p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {f.dateExpiration&&new Date(f.dateExpiration)<new Date()&&(
                        <div style={{marginTop:10,padding:"8px 12px",background:"#FEE2E2",
                          borderRadius:8,fontSize:12,color:"#991B1B",fontWeight:600}}>
                          ❌ Certificat expiré le {new Date(f.dateExpiration).toLocaleDateString("fr-FR")}
                          — renouvellement obligatoire avant toute livraison RED.
                        </div>
                      )}
                      <button onClick={()=>setFicheOpen(null)} style={{marginTop:10,
                        padding:"7px 14px",borderRadius:8,border:`1px solid ${C.bd}`,
                        background:"#fff",cursor:"pointer",fontFamily:"inherit",
                        fontSize:12,color:C.tx2}}>
                        Fermer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Export CSV fournisseurs */}
          <button onClick={()=>exportCSVFromRows(
            ["Nom","SIRET","Système VSS","N° certificat","Organisme","Date audit","Expiration","Périmètre","Statut"],
            fournisseurs.map(f=>[f.nom,f.siret||"",f.systeme||"",f.numeroCertif||"",f.organisme||"",f.dateAudit||"",f.dateExpiration||"",
              (f.perimetre||[]).join(", "),statutFourn(f)]),
            "fournisseurs_RED.csv"
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6}}>
            📥 Export CSV fournisseurs
          </button>
        </div>
      )}

      {/* ── MODULE 3 : CHECKLIST TERRAIN ── */}
      {tab==="checklist"&&(
        <div>
          {/* Sélecteur de lot */}
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
              Sélectionner un lot
            </div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option value="">Aucun lot disponible</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Score */}
          {checklist.length>0&&(
            <>
              <div style={{background: nbOk>=12
                  ?"linear-gradient(135deg,#F0FDF4,#DCFCE7)"
                  : nbOk>=8
                  ?"linear-gradient(135deg,#FFFBEB,#FEF3C7)"
                  :"linear-gradient(135deg,#FFF1F2,#FEE2E2)",
                borderRadius:16,padding:16,marginBottom:14,
                border:`2px solid ${nbOk>=12?C.green:nbOk>=8?C.amber:C.red}`}}>
                <div style={{fontSize:22,fontWeight:900,color:C.tx}}>
                  {nbOk} / {checklist.length}
                  <span style={{fontSize:13,fontWeight:500,color:C.tx3,marginLeft:8}}>critères RED conformes</span>
                </div>
                <div style={{background:"rgba(0,0,0,.08)",borderRadius:6,height:8,marginTop:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:6,
                    background:nbOk>=12?C.green:nbOk>=8?C.amber:C.red,
                    width:`${(nbOk/checklist.length)*100}%`,transition:"width .4s"}}/>
                </div>
                <div style={{fontSize:12,color:C.tx3,marginTop:8}}>
                  {nbOk>=12?"✅ Lot conforme RED II — dossier complet"
                    :nbOk>=8?"⚠️ Conformité partielle — critères manquants à compléter"
                    :"❌ Non conforme — action requise avant déclaration RED"}
                </div>
              </div>

              {checklist.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"11px 14px",background:"#fff",borderRadius:10,marginBottom:6,
                  border:`1.5px solid ${c.ok?C.green:C.red}20`,
                  boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{c.ok?"✅":"❌"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:c.ok?C.greenD:"#991B1B"}}>
                      {c.label}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{c.ref}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {checklist.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"40px 0",fontSize:13}}>
              Sélectionnez un lot ayant une visite terrain pour afficher la checklist RED.
            </div>
          )}
        </div>
      )}

      {/* ── MODULE 4 : TRAÇABILITÉ ── */}
      {tab==="tracabilite"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Lot</div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option>Aucun lot</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Timeline */}
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:16}}>
              Chaîne de transformation — {lotSel?.lotNumero||"—"}
            </div>
            {chaineEtapes(lotSel,visiteSel,livraisons.filter(l=>l.lotId===lotSelId)).map((e,i,arr)=>(
              <div key={e.id} style={{display:"flex",gap:12,marginBottom: i<arr.length-1?0:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                  <div style={{width:28,height:28,borderRadius:"50%",
                    background:e.done?"#1D4ED8":"#E5E7EB",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,flexShrink:0}}>
                    {e.done?"✓":i+1}
                  </div>
                  {i<arr.length-1&&(
                    <div style={{width:2,flex:1,minHeight:24,
                      background:e.done?"#93C5FD":"#E5E7EB",margin:"2px 0"}}/>
                  )}
                </div>
                <div style={{paddingBottom:16,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{e.icon}</span>
                    <span style={{fontSize:13,fontWeight:e.done?700:500,
                      color:e.done?"#1D4ED8":C.tx3}}>
                      {e.label}
                    </span>
                    <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,
                      background:e.done?"#DBEAFE":"#F3F4F6",
                      color:e.done?"#1E40AF":C.tx3,fontWeight:600}}>
                      {e.done?"✅ Complété":"⏳ En attente"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODULE 5 : BILAN MASSIQUE ── */}
      {tab==="bilan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:14}}>
              ⚖️ Bilan massique plateforme — ségrégation RED / non-RED
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Entrées RED certifiées (t)", entreeRed, setEntreeRed, "#1D4ED8"],
                ["Entrées non-RED (t)", entreeNonRed, setEntreeNonRed, C.tx3],
                ["Sorties RED déclarées (t)", sortieRed, setSortieRed, "#1D4ED8"],
                ["Sorties non-RED (t)", sortieNonRed, setSortieNonRed, C.tx3],
              ].map(([l,v,set,col])=>(
                <div key={l}>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="number" value={v} min={0}
                    onChange={e=>set(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${col}40`,fontFamily:"inherit",outline:"none",
                      boxSizing:"border-box",color:col,fontWeight:700}}/>
                </div>
              ))}
            </div>
            {/* Résultats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                ["Solde RED disponible", `${bilanMix.toFixed(0)} t`, bilanMix>=0?"#065F46":"#991B1B", bilanMix>=0?"#D1FAE5":"#FEE2E2"],
                ["Solde non-RED",        `${bilanNonRed.toFixed(0)} t`, C.tx, C.bg2],
                ["Part RED en stock",    `${pctRed} %`, "#1D4ED8", "#DBEAFE"],
              ].map(([l,v,col,bg])=>(
                <div key={l} style={{background:bg,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:C.tx3,fontWeight:600,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:900,color:col}}>{v}</div>
                </div>
              ))}
            </div>
            {bilanMix<0&&(
              <div style={{background:"#FEE2E2",borderRadius:10,padding:"10px 14px",
                fontSize:12,color:"#991B1B",fontWeight:600,marginBottom:10}}>
                ⚠️ Incohérence : les sorties RED ({sortieRed} t) dépassent les entrées RED ({entreeRed} t).
                Vérifier le registre des mouvements.
              </div>
            )}
            {/* Conversion MAP */}
            <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.tx3}}>
              Conversion volumique (indicative) ·
              <strong style={{color:C.tx}}> 1 t ≈ {MAP_PAR_T} MAP</strong>
              {" · "}Stock RED : <strong style={{color:"#1D4ED8"}}>{(bilanMix*MAP_PAR_T).toFixed(0)} MAP</strong>
              {" · "}Stock total : <strong>{((bilanMix+bilanNonRed)*MAP_PAR_T).toFixed(0)} MAP</strong>
            </div>
          </div>
          <button onClick={()=>exportCSVFromRows(
            ["Entrées RED","Entrées non-RED","Sorties RED","Sorties non-RED","Solde RED","Solde non-RED","Part RED %"],
            [[entreeRed,entreeNonRed,sortieRed,sortieNonRed,bilanMix,bilanNonRed,pctRed]],
            "bilan_massique_RED.csv"
          )} style={{padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export bilan massique CSV
          </button>
        </div>
      )}

      {/* ── MODULE 6 : DOSSIER DOCUMENTAIRE ── */}
      {tab==="dossier"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Lot</div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option>Aucun lot</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Score docs */}
          <div style={{background: nbDocsOk>=8?"linear-gradient(135deg,#F0FDF4,#DCFCE7)"
              :nbDocsOk>=5?"linear-gradient(135deg,#FFFBEB,#FEF3C7)"
              :"linear-gradient(135deg,#FFF1F2,#FEE2E2)",
            borderRadius:16,padding:14,marginBottom:14,
            border:`2px solid ${nbDocsOk>=8?C.green:nbDocsOk>=5?C.amber:C.red}`}}>
            <div style={{fontSize:18,fontWeight:900,color:C.tx}}>
              {nbDocsOk} / {docsRequis.length} documents présents
            </div>
            <div style={{background:"rgba(0,0,0,.08)",borderRadius:6,height:6,marginTop:8,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:6,
                background:nbDocsOk>=8?C.green:nbDocsOk>=5?C.amber:C.red,
                width:`${(nbDocsOk/docsRequis.length)*100}%`}}/>
            </div>
          </div>

          {docsRequis.map(doc=>(
            <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,
              padding:"11px 14px",background:"#fff",borderRadius:10,marginBottom:6,
              border:`1px solid ${doc.ok?C.green+"30":C.red+"30"}`,
              boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <span style={{fontSize:18,flexShrink:0}}>{doc.ok?"✅":"❌"}</span>
              <div style={{flex:1,fontSize:13,fontWeight:doc.ok?500:600,
                color:doc.ok?C.tx:"#991B1B"}}>
                {doc.label}
              </div>
              {!doc.ok&&(
                <span style={{fontSize:11,color:"#991B1B",fontWeight:600,flexShrink:0}}>
                  Manquant
                </span>
              )}
            </div>
          ))}

          {/* Export pièces manquantes */}
          <button onClick={()=>exportCSVFromRows(
            ["Document","Statut","Lot"],
            docsRequis.map(d=>[d.label,d.ok?"Présent":"Manquant",lotSel?.lotNumero||lotSelId]),
            `pieces_manquantes_${lotSel?.lotNumero||lotSelId}.csv`
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export pièces manquantes CSV
          </button>
        </div>
      )}

      {/* ── MODULE 7 : REGISTRE AUDIT ── */}
      {tab==="registre"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {["tous","ouverte","en_cours","corrigee"].map(s=>(
              <button key={s} onClick={()=>setFiltreNC(s)} style={{
                padding:"6px 12px",borderRadius:16,
                border:`1.5px solid ${filtreNC===s?"#1D4ED8":C.bd}`,
                background:filtreNC===s?"#1D4ED8":"#fff",
                color:filtreNC===s?"#fff":C.tx2,
                cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:filtreNC===s?700:400}}>
                {s==="tous"?"Toutes":STATUT_NC[s]?.label||s}
              </button>
            ))}
            <button onClick={()=>setShowNewNC(v=>!v)} style={{
              marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"none",
              background:C.red,color:"#fff",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:700}}>
              + Non-conformité
            </button>
          </div>

          {/* Form nouvelle NC */}
          {showNewNC&&(
            <div style={{background:"#FEF2F2",borderRadius:16,padding:16,
              marginBottom:14,border:"1.5px solid #FECACA"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#991B1B",marginBottom:12}}>
                Nouvelle non-conformité RED
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Lot concerné</div>
                  <input value={newNC.lotNumero} onChange={e=>setNewNC(p=>({...p,lotNumero:e.target.value}))}
                    placeholder="LOT-2026-…"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Type</div>
                  <select value={newNC.type} onChange={e=>setNewNC(p=>({...p,type:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    <option value="">— Choisir —</option>
                    {["certificat_expire","gps_manquant","document_manquant","ges_non_calcule",
                      "zone_protegee","bois_mort_non_respecte","coupe_non_autorisee","autre"].map(t=>(
                      <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Gravité</div>
                  <select value={newNC.gravite} onChange={e=>setNewNC(p=>({...p,gravite:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    <option value="mineure">Mineure</option>
                    <option value="majeure">Majeure</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Responsable</div>
                  <input value={newNC.responsable} onChange={e=>setNewNC(p=>({...p,responsable:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Description</div>
                <textarea value={newNC.description} onChange={e=>setNewNC(p=>({...p,description:e.target.value}))}
                  rows={2} placeholder="Décrire la non-conformité constatée…"
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                    resize:"vertical",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>{
                  setNC(p=>[...p,{...newNC,id:"nc"+Date.now(),date:new Date().toISOString().slice(0,10)}]);
                  setShowNewNC(false);
                  setNewNC({lotNumero:"",type:"",gravite:"mineure",description:"",correction:"",statut:"ouverte",responsable:""});
                }} style={{flex:1,padding:"9px",borderRadius:10,border:"none",
                  background:C.red,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  Enregistrer
                </button>
                <button onClick={()=>setShowNewNC(false)} style={{padding:"9px 14px",borderRadius:10,
                  border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.tx2}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste NC */}
          {ncFiltrees.map(nc=>{
            const s=STATUT_NC[nc.statut]||STATUT_NC.ouverte;
            const g=GRAVITE_NC[nc.gravite]||GRAVITE_NC.mineure;
            return (
              <div key={nc.id} style={{background:"#fff",borderRadius:14,padding:14,
                marginBottom:10,border:`1px solid ${C.bd}`,
                boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{nc.lotNumero}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{nc.date} · {nc.responsable}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,
                      color:g.color,background:g.bg}}>{g.label}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,
                      color:s.color,background:s.bg}}>{s.icon} {s.label}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:C.tx2,marginBottom:nc.correction?8:0,lineHeight:1.5}}>
                  {nc.description}
                </div>
                {nc.correction&&(
                  <div style={{fontSize:11,color:C.greenD,background:C.greenL,
                    borderRadius:8,padding:"6px 10px",lineHeight:1.5}}>
                    ✅ Correction : {nc.correction}
                  </div>
                )}
                {nc.statut!=="corrigee"&&(
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <button onClick={()=>setNC(p=>p.map(x=>x.id===nc.id?{...x,statut:"en_cours"}:x))}
                      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.amber}`,
                        background:C.amberL,color:C.amber,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>
                      En cours
                    </button>
                    <button onClick={()=>setNC(p=>p.map(x=>x.id===nc.id?{...x,statut:"corrigee"}:x))}
                      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.green}`,
                        background:C.greenL,color:C.greenD,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>
                      Marquer corrigée
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Export CSV registre */}
          <button onClick={()=>exportCSVFromRows(
            ["Lot","Date","Type","Gravité","Statut","Description","Correction","Responsable"],
            nonConformites.map(n=>[n.lotNumero,n.date,n.type,n.gravite,n.statut,n.description,n.correction||"",n.responsable]),
            "registre_NC_RED.csv"
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export registre non-conformités CSV
          </button>
        </div>
      )}
    </div>
  );
};
