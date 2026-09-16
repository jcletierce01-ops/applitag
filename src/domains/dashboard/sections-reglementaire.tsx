// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { VSS_RECONNUS } from "./sections.constants.js";

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

// ── SYSTÈMES VOLONTAIRES (VSS) RED II ──────────────────────────

// ── MODULE GES ─────────────────────────────────────────────────
const FACTEUR_GASOIL    = 2.68;   // kgCO2eq/L  (ADEME Base Carbone 2024)
const FACTEUR_TRANSPORT = 0.062;  // kgCO2eq/t.km  (camion routier moyen)
const PCI_SEC           = 5.18;   // MWh/t bois sec (0 % humidité)

const SEUILS_GES = {
  nouvelles_2021: {val:108, label:"Nouvelles install. > 1 MWth (depuis 2021)"},
  existantes_2026:{val:200, label:"Existantes (jusqu'en 2026)"},
  existantes_2027:{val:140, label:"Existantes (à partir de 2027)"},
};

const GES_EEC_DEFAUT = {
  bois_forestier:     {val:3.5,  label:"Bois forestier",     src:"RED II Annexe VI"},
  residus_forestiers: {val:1.2,  label:"Résidus forestiers", src:"RED II Annexe VI"},
  dechets_bois:       {val:0.5,  label:"Déchets bois",       src:"RED II Annexe VI"},
  plaquettes_fr:      {val:2.8,  label:"Plaquettes forestières FR", src:"CIBE 2024"},
  bois_bocage:        {val:3.1,  label:"Bois de bocage / haies",    src:"CIBE 2024"},
};

const MATERIEL_GES = [
  {id:"dechiqueteuse_mob",  label:"Déchiqueteuse mobile",     conso:22, unite:"l/h",     type:"h"},
  {id:"dechiqueteuse_fixe", label:"Déchiqueteuse fixe/treuil",conso:30, unite:"l/h",     type:"h"},
  {id:"broyeur",            label:"Broyeur / cribleur",       conso:18, unite:"l/h",     type:"h"},
  {id:"chargeuse",          label:"Chargeuse sur pneus",       conso:14, unite:"l/h",     type:"h"},
  {id:"pelle",              label:"Pelle / tête abatteuse",   conso:20, unite:"l/h",     type:"h"},
  {id:"tracteur",           label:"Tracteur forestier",       conso:10, unite:"l/h",     type:"h"},
  {id:"camion_benne",       label:"Camion benne 26 t",        conso:32, unite:"l/100 km",type:"km"},
  {id:"semi_bois",          label:"Semi-remorque bois 44 t",  conso:38, unite:"l/100 km",type:"km"},
];

const calcPCI = (humPct) => {
  const w = (humPct||0) / 100;
  return Math.max(0, PCI_SEC * (1 - w) - 0.68 * w);
};

/* ═══════════════════════════════════════════════════════
   SECTION COÛT RÉGLEMENTAIRE RED
   Source : consortium RED — 3,3 €/t RED II, 3,7 €/t RED III
═══════════════════════════════════════════════════════ */
const BENCH_RED = {
  redII:   { val: 3.3, label: "RED II (sites existants)", color: "#1565C0" },
  redIII:  { val: 3.7, label: "RED III (sites post-2021)", color: "#6A1B9A" },
  amont:   { val: 1.3, label: "Coût amont fournisseur moyen", color: "#2E7D32" },
};

export const SectionCoutReglementaire = ({ lots=[], livraisons=[] }) => {
  // ── Inputs coûts ──
  const [tonnageCertifie, setTonnageCertifie] = useState("");
  const [nbLots,          setNbLots]          = useState("");
  const [nbChantiers,     setNbChantiers]     = useState("");
  const [coutCertif,      setCoutCertif]      = useState("");
  const [heuresAdmin,     setHeuresAdmin]     = useState("");
  const [tauxHoraire,     setTauxHoraire]     = useState("35");
  const [heuresAudit,     setHeuresAudit]     = useState("");
  const [nbDocManquants,  setNbDocManquants]  = useState("");
  const [coutLogiciels,   setCoutLogiciels]   = useState("");
  const [autresCouts,     setAutresCouts]     = useState("");
  const [typeInstallation,setTypeInstallation]= useState("redII");
  // ── Pilote avant/après ──
  const [piloteTab,       setPiloteTab]       = useState("mesures");
  const [avantHeures,     setAvantHeures]     = useState("");
  const [apresHeures,     setApresHeures]     = useState("");
  const [coutAuditMoyen,  setCoutAuditMoyen]  = useState("");
  const [nbAudits,        setNbAudits]        = useState("");
  const [notePilote,      setNotePilote]      = useState("");

  // ── Calculs ──
  const tonnes     = parseFloat(tonnageCertifie) || 0;
  const certif     = parseFloat(coutCertif)      || 0;
  const tempAdmin  = (parseFloat(heuresAdmin)||0) * (parseFloat(tauxHoraire)||35);
  const tempAudit  = (parseFloat(heuresAudit)||0) * (parseFloat(tauxHoraire)||35);
  const logiciels  = parseFloat(coutLogiciels)   || 0;
  const autres     = parseFloat(autresCouts)      || 0;
  const total      = certif + tempAdmin + tempAudit + logiciels + autres;
  const parTonne   = tonnes > 0 ? total / tonnes : 0;
  const bench      = BENCH_RED[typeInstallation]?.val || 3.3;
  const ecartBench = parTonne > 0 ? parTonne - bench : null;

  // Pilote
  const gainHeures    = (parseFloat(avantHeures)||0) - (parseFloat(apresHeures)||0);
  const gainEuros     = gainHeures * (parseFloat(tauxHoraire)||35);
  const totalAudits   = (parseFloat(coutAuditMoyen)||0) * (parseFloat(nbAudits)||1);
  const coutConformite= tonnes > 0 ? (total + totalAudits) / tonnes : 0;

  // Données auto depuis lots/livraisons
  const lotsCount = lots.length;
  const livTotal  = livraisons.reduce((s,l)=>s+(parseFloat(l.poids)||0),0);

  const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:10, fontSize:13,
    border:`1.5px solid ${C.bd}`, fontFamily:"inherit", outline:"none",
    background:C.bg, color:C.tx, boxSizing:"border-box"
  };
  const labelStyle = { fontSize:11, fontWeight:700, color:C.tx2, marginBottom:4 };
  const cardStyle  = (col) => ({
    background:col+"18", border:`1.5px solid ${col}44`, borderRadius:12,
    padding:"12px 14px", flex:1
  });

  return (
    <div style={{padding:"0 0 40px"}}>
      <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>
        💶 Coût réglementaire RED
      </div>
      <div style={{fontSize:12,color:C.tx3,marginBottom:18,lineHeight:1.6}}>
        Source : consortium RED — surcoût moyen estimé à <strong>3,3 €/t (RED II)</strong> et
        <strong> 3,7 €/t (RED III)</strong> pour une chaîne de 2,5 intermédiaires.
        Coût amont fournisseur : 1,0–1,6 €/t.
      </div>

      {/* Onglets */}
      {(()=>{
        const tabs=[["calculateur","🧮 Calculateur"],["pilote","🔬 Pilote avant/après"],["benchmark","📊 Benchmark consortium"]];
        return(
          <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
            {tabs.map(([id,lbl])=>(
              <button key={id} onClick={()=>setPiloteTab(id===piloteTab?piloteTab:id)} style={{
                padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:`2px solid ${piloteTab===id?C.blue:C.bd}`,
                background:piloteTab===id?C.blueL:"transparent",color:piloteTab===id?C.blueD:C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
                {lbl}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── CALCULATEUR ── */}
      {piloteTab==="calculateur"&&(()=>{
        const lignes = [
          ["💳","Certification VSS / organisme",         coutCertif,      setCoutCertif],
          ["💻","Logiciels & outils (abonnements/an)",   coutLogiciels,   setCoutLogiciels],
          ["📋","Autres coûts directs",                  autresCouts,     setAutresCouts],
        ];
        return(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Type installation */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Type d'installation de référence
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {Object.entries(BENCH_RED).map(([k,b])=>(
                  <button key={k} onClick={()=>setTypeInstallation(k)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`2px solid ${typeInstallation===k?b.color:C.bd}`,
                    background:typeInstallation===k?b.color+"18":"transparent",
                    color:typeInstallation===k?b.color:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>
                    {b.label} — {b.val} €/t
                  </button>
                ))}
              </div>
            </div>

            {/* Volumes */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Volumes (données APPLITAG auto-calculées disponibles)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  ["Tonnage certifié (t/an)",tonnageCertifie,setTonnageCertifie,
                   livTotal>0?`${livTotal.toFixed(0)} t en base`:""],
                  ["Nombre de lots",nbLots,setNbLots,
                   lotsCount>0?`${lotsCount} lots en base`:""],
                  ["Nombre de chantiers",nbChantiers,setNbChantiers,""],
                ].map(([lbl,val,set,hint])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder={hint||"0"} style={inputStyle}/>
                    {hint&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>{hint}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Temps */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Temps salarié valorisé
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div>
                  <div style={labelStyle}>Taux horaire chargé (€/h)</div>
                  <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                    placeholder="35" style={inputStyle}/>
                </div>
                <div>
                  <div style={labelStyle}>Heures admin traçabilité/an</div>
                  <input type="number" value={heuresAdmin} onChange={e=>setHeuresAdmin(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAdmin&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAdmin)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
                <div>
                  <div style={labelStyle}>Heures préparation audits/an</div>
                  <input type="number" value={heuresAudit} onChange={e=>setHeuresAudit(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAudit&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAudit)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
              </div>
            </div>

            {/* Autres coûts directs */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Coûts directs (€/an)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {lignes.map(([ico,lbl,val,set])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{ico} {lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder="0" style={inputStyle}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={labelStyle}>📦 Documents manquants détectés</div>
                <input type="number" value={nbDocManquants}
                  onChange={e=>setNbDocManquants(e.target.value)}
                  placeholder="0 (coût qualitatif — non valorisé ici)" style={{...inputStyle,width:"50%"}}/>
              </div>
            </div>

            {/* Résultat */}
            {total>0&&(
              <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                borderRadius:14,padding:"16px",border:"2px solid #3B82F6"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#1E40AF",marginBottom:12}}>
                  📊 Résultat — Coût réglementaire RED
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <div style={cardStyle("#1E40AF")}>
                    <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût total annuel</div>
                    <div style={{fontSize:22,fontWeight:900,color:"#1E40AF"}}>
                      {total.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                    </div>
                  </div>
                  {tonnes>0&&(
                    <div style={cardStyle(parTonne>bench?"#991B1B":"#065F46")}>
                      <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût par tonne</div>
                      <div style={{fontSize:22,fontWeight:900,
                        color:parTonne>bench?"#991B1B":"#065F46"}}>
                        {parTonne.toFixed(2)} €/t
                      </div>
                      {ecartBench!==null&&(
                        <div style={{fontSize:11,marginTop:4,color:parTonne>bench?"#991B1B":"#065F46"}}>
                          {parTonne>bench
                            ? `+${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t)`
                            : ecartBench<0
                              ? `${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t) ✓`
                              : `= référence consortium (${bench} €/t)`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Décomposition */}
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[
                    ["Certification",          certif,    "#7C3AED"],
                    ["Temps admin valorisé",   tempAdmin, "#1565C0"],
                    ["Temps audit valorisé",   tempAudit, "#0277BD"],
                    ["Logiciels & outils",     logiciels, "#00695C"],
                    ["Autres coûts",           autres,    "#78350F"],
                  ].filter(([,v])=>v>0).map(([lbl,v,col])=>(
                    <div key={lbl} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{height:8,borderRadius:4,background:col,
                        width:`${Math.round((v/total)*100)}%`,minWidth:4,maxWidth:"60%"}}/>
                      <span style={{fontSize:11,color:C.tx2,flexShrink:0}}>
                        {lbl} — <strong>{v.toLocaleString("fr-FR",{minimumFractionDigits:0})} €</strong>
                        {total>0&&<span style={{color:C.tx3}}> ({(v/total*100).toFixed(0)} %)</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",
                  borderRadius:8,fontSize:11,color:"#78350F",lineHeight:1.6}}>
                  ⚠️ <strong>Note contractuelle :</strong> Le consortium RED rappelle qu'un supplément RED
                  ne peut pas être ajouté unilatéralement aux contrats existants.
                  La prise en compte des surcoûts doit respecter les règles contractuelles et de concurrence.
                  Ces données servent à documenter et négocier, pas à facturer automatiquement.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── PILOTE AVANT/APRÈS ── */}
      {piloteTab==="pilote"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#14532D",marginBottom:8}}>
              🔬 Mesures du pilote de démonstration
            </div>
            <div style={{fontSize:11,color:"#166534",marginBottom:14,lineHeight:1.6}}>
              Mesurez le temps administratif, le coût d'audit et le coût de conformité par tonne
              avant et après déploiement d'APPLITAG pour quantifier le retour sur investissement.
            </div>

            {/* Taux horaire partagé */}
            <div style={{marginBottom:14}}>
              <div style={labelStyle}>Taux horaire chargé (€/h) — partagé avec le calculateur</div>
              <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                placeholder="35" style={{...inputStyle,width:"160px"}}/>
            </div>

            {/* Tableau avant/après */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>
                    {["Indicateur","Avant APPLITAG","Après APPLITAG","Gain"].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",
                        background:"#DCFCE7",color:"#14532D",fontWeight:800,
                        borderBottom:"2px solid #86EFAC"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(()=>{
                    const rows = [
                      {
                        label:"Temps admin traçabilité (h/an)",
                        avant:<input type="number" value={avantHeures}
                          onChange={e=>setAvantHeures(e.target.value)}
                          placeholder="ex : 120" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<input type="number" value={apresHeures}
                          onChange={e=>setApresHeures(e.target.value)}
                          placeholder="ex : 40" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        gain: gainHeures>0
                          ? <span style={{color:"#14532D",fontWeight:700}}>
                              −{gainHeures} h → {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût moyen d'un audit (€)",
                        avant:<input type="number" value={coutAuditMoyen}
                          onChange={e=>setCoutAuditMoyen(e.target.value)}
                          placeholder="ex : 2500" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<span style={{color:C.tx3,fontSize:11,padding:"6px 0",display:"block"}}>
                          Saisir après pilote
                        </span>,
                        gain:"—"
                      },
                      {
                        label:"Nb audits/an",
                        avant:<input type="number" value={nbAudits}
                          onChange={e=>setNbAudits(e.target.value)}
                          placeholder="1" style={{...inputStyle,padding:"6px 8px",fontSize:12,width:"100px"}}/>,
                        apres:"—",
                        gain: totalAudits>0
                          ? <span style={{color:"#1E40AF",fontWeight:700}}>
                              {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût conformité/tonne",
                        avant:"—",
                        apres:"—",
                        gain: coutConformite>0
                          ? <span style={{fontWeight:800,
                              color:coutConformite<=3.3?"#14532D":"#991B1B"}}>
                              {coutConformite.toFixed(2)} €/t
                              {coutConformite<=3.3
                                ? " ✓ sous référence"
                                : ` (réf. ${BENCH_RED[typeInstallation]?.val} €/t)`}
                            </span>
                          : <span style={{color:C.tx3,fontSize:11}}>Renseigner tonnage dans calculateur</span>
                      },
                    ];
                    return rows.map((r,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"10px 12px",fontWeight:700,color:C.tx,
                          fontSize:12,minWidth:200}}>{r.label}</td>
                        <td style={{padding:"8px 12px"}}>{r.avant}</td>
                        <td style={{padding:"8px 12px"}}>{r.apres}</td>
                        <td style={{padding:"8px 12px"}}>{r.gain}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Notes pilote */}
            <div style={{marginTop:14}}>
              <div style={labelStyle}>Notes & observations du pilote</div>
              <textarea value={notePilote} onChange={e=>setNotePilote(e.target.value)}
                rows={4} placeholder="Contexte, méthode de mesure, observations terrain, nuances…"
                style={{...inputStyle,resize:"vertical"}}/>
            </div>

            {/* ROI si données suffisantes */}
            {(gainEuros>0||totalAudits>0)&&(
              <div style={{marginTop:14,background:"#DBEAFE",borderRadius:10,
                padding:"12px 14px",border:"1.5px solid #93C5FD"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:8}}>
                  💰 Retour sur investissement estimé
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {gainEuros>0&&(
                    <div style={cardStyle("#1E40AF")}>
                      <div style={{fontSize:10,color:C.tx3}}>Gain temps admin/an</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>
                        {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {totalAudits>0&&(
                    <div style={cardStyle("#7C3AED")}>
                      <div style={{fontSize:10,color:C.tx3}}>Coût audit annuel</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>
                        {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {(gainEuros+totalAudits)>0&&(
                    <div style={cardStyle("#065F46")}>
                      <div style={{fontSize:10,color:C.tx3}}>Économie potentielle identifiée</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#065F46"}}>
                        {(gainEuros).toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                      </div>
                      <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                        (gain admin — les coûts d'audit restent réels)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BENCHMARK ── */}
      {piloteTab==="benchmark"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",
            border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:4}}>
              📊 Données de référence — Consortium RED
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:14}}>
              Source : étude consortium RED, données gouvernementales françaises
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Surcoût moyen RED II (sites existants)",val:"3,3 €/t",
                 detail:"Chaîne moyenne de 2,5 intermédiaires",color:"#1565C0"},
                {label:"Surcoût moyen RED III (sites post-2021)",val:"3,7 €/t",
                 detail:"Exigences renforcées sur la traçabilité et la durabilité",color:"#6A1B9A"},
                {label:"Coût amont fournisseur",val:"1,0 – 1,6 €/t",
                 detail:"Certification, temps, outils — côté producteur/intermédiaire",color:"#2E7D32"},
                {label:"Nombre d'intermédiaires moyen",val:"2,5",
                 detail:"Pour une chaîne forêt → plateforme → chaufferie",color:"#00695C"},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 12px",borderRadius:10,background:r.color+"0D",
                  border:`1px solid ${r.color}33`}}>
                  <div style={{fontSize:20,fontWeight:900,color:r.color,
                    minWidth:100,flexShrink:0}}>{r.val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Principaux postes */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Principaux postes identifiés par le consortium
            </div>
            {[
              ["💳","Certification auprès d'un organisme VSS reconnu",
               "Obligatoire pour SURE, SBP, ISCC EU, 2BSvs, REDcert-EU"],
              ["⏱️","Temps salarié — traçabilité et audits",
               "Souvent le poste le plus lourd, difficile à externaliser"],
              ["💻","Logiciels et outils administratifs",
               "SIG, ERP, outils de déclaration, plateformes documentaires"],
              ["🔄","Saisies redondantes RED / RDUE / PEFC / SSD / ISO",
               "Informations similaires demandées dans des formats différents — surcoût de coordination"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,alignItems:"flex-start",
                padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{det}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunité APPLITAG */}
          <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",
            borderRadius:12,padding:"14px",border:"1.5px solid #6EE7B7"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>
              🎯 Opportunité APPLITAG — Mutualisation des saisies
            </div>
            <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
              Le consortium identifie que RED, RDUE, PEFC, SSD et ISO demandent des informations
              similaires dans des formats différents. APPLITAG centralise la saisie unique et
              génère les exports adaptés à chaque référentiel, réduisant directement ce surcoût.
            </div>
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              {["RED II / III","RDUE","PEFC","SSD","ISO 50001"].map(r=>(
                <span key={r} style={{padding:"4px 10px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:"#065F46",color:"#fff"}}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SectionGES = ({lots=[], visites=[], livraisons=[]}) => {
  const [tab, setTab] = useState("calculateur");
  const [methode, setMethode] = useState("defaut");
  // Biomasse
  const [typeBio,   setTypeBio]   = useState("bois_forestier");
  const [tonnage,   setTonnage]   = useState(100);
  const [humidite,  setHumidite]  = useState(30);
  // Transport
  const [distAmont, setDistAmont] = useState(20);
  const [distAval,  setDistAval]  = useState(50);
  const [nbRotations,_setNbRot]    = useState(5);
  // Matériel exploitation
  const [materielItems, setMaterielItems] = useState(
    MATERIEL_GES.slice(0,3).map(m=>({...m, qty:0}))
  );
  const [selectedMat, setSelectedMat] = useState("");
  // GES réelles (mode réel)
  const [consoCarbu,  setConsoCarbu]  = useState("");
  const [eecReelle,   setEecReelle]   = useState("");

  const pci      = calcPCI(humidite);
  const energieMWh = tonnage * pci;
  const energieMJ  = energieMWh * 3600;

  // ── Calculs ──
  const eec = methode==="reelle"
    ? (parseFloat(eecReelle)||0)
    : (GES_EEC_DEFAUT[typeBio]?.val || 3.5);

  const consoTotL = methode==="reelle"
    ? (parseFloat(consoCarbu)||0)
    : materielItems.reduce((s,m)=> s + (m.qty||0) * m.conso * (m.type==="km"?1:1), 0);

  const emissExploit_kgco2 = consoTotL * FACTEUR_GASOIL;
  const emissTransAmont_kgco2 = distAmont * tonnage * FACTEUR_TRANSPORT;
  const emissTransAval_kgco2  = distAval  * tonnage * FACTEUR_TRANSPORT * nbRotations / nbRotations; // par livraison

  const totalKgco2   = emissExploit_kgco2 + emissTransAmont_kgco2 + emissTransAval_kgco2;
  const totalGco2MJ  = energieMJ > 0 ? (totalKgco2 * 1000) / energieMJ : 0;
  const totalGco2MJavecEec = totalGco2MJ + eec;

  const seuilRef = SEUILS_GES.nouvelles_2021.val;
  const conforme = totalGco2MJavecEec <= seuilRef;
  const pctSeuil = seuilRef > 0 ? Math.min(200, (totalGco2MJavecEec / seuilRef) * 100) : 0;

  const TABS = [
    {id:"calculateur", label:"Calculateur"},
    {id:"reference",   label:"Valeurs de référence"},
    {id:"vss",         label:"Systèmes VSS"},
    {id:"bilan",       label:"Bilan lots"},
    {id:"methode",     label:"Méthode"},
  ];

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"0 4px 80px"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,color:C.tx,marginBottom:4}}>🌿 Bilan GES biomasse</div>
        <div style={{fontSize:13,color:C.tx3,lineHeight:1.6}}>
          Calcul des émissions de gaz à effet de serre selon RED II — méthode défaut, réelle ou désagrégée.
          Référentiel ADEME Base Carbone + valeurs CIBE filière bois-énergie française.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"8px 16px",borderRadius:20,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:13,fontWeight:tab===t.id?700:400,
            background:tab===t.id?C.blue:"#fff",
            color:tab===t.id?"#fff":C.tx2,
            boxShadow:tab===t.id?"0 2px 8px rgba(0,0,0,.15)":"0 1px 3px rgba(0,0,0,.08)",
            flexShrink:0,transition:"all .2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CALCULATEUR ── */}
      {tab==="calculateur"&&(()=>{
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Méthode */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                ⚙️ Méthode de calcul
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[["defaut","🔢 Valeurs par défaut","Annexes RED II — simple"],
                  ["reelle","📊 Valeurs réelles","Saisie des consommations mesurées"],
                  ["disagregee","🔬 Désagrégée","Calcul étape par étape (art. 31)"]].map(([v,l,s])=>(
                  <button key={v} onClick={()=>setMethode(v)} style={{
                    flex:1,minWidth:140,padding:"10px 14px",borderRadius:12,textAlign:"left",
                    border:`2px solid ${methode===v?C.blue:C.bd}`,
                    background:methode===v?C.blueL:"#fafafa",
                    cursor:"pointer",fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:13,fontWeight:700,color:methode===v?C.blueD:C.tx}}>{l}</div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:3}}>{s}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Biomasse */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                🪵 Biomasse
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Type de combustible</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {Object.entries(GES_EEC_DEFAUT).map(([k,d])=>(
                    <button key={k} onClick={()=>setTypeBio(k)} style={{
                      padding:"9px 12px",borderRadius:10,textAlign:"left",
                      border:`1.5px solid ${typeBio===k?C.blue:C.bd}`,
                      background:typeBio===k?C.blueL:"#fafafa",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:typeBio===k?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontWeight:600}}>{d.label}</span>
                      <span style={{color:C.tx3,marginLeft:8}}>eec = {d.val} gCO₂eq/MJ · {d.src}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Tonnage (t)</div>
                  <input type="number" value={tonnage} min={1}
                    onChange={e=>setTonnage(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Humidité (%)</div>
                  <input type="number" value={humidite} min={0} max={60}
                    onChange={e=>setHumidite(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10,padding:"10px 14px",background:C.blueL,borderRadius:10,
                display:"flex",gap:20,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:C.blueD}}>PCI calculé : <strong>{pci.toFixed(2)} MWh/t</strong></span>
                <span style={{fontSize:12,color:C.blueD}}>Énergie estimée : <strong>{energieMWh.toFixed(0)} MWh</strong></span>
                <span style={{fontSize:12,color:C.blueD}}>→ <strong>{(energieMWh*1000).toFixed(0)} GJ</strong></span>
              </div>
            </div>

            {/* Transport */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                🚛 Transport
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Chantier → plateforme (km)
                  </div>
                  <input type="number" value={distAmont} min={0}
                    onChange={e=>setDistAmont(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Plateforme → chaufferie (km)
                  </div>
                  <input type="number" value={distAval} min={0}
                    onChange={e=>setDistAval(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{padding:"10px 14px",background:C.bg2,borderRadius:10,fontSize:12,color:C.tx3}}>
                Facteur émission transport routier : {FACTEUR_TRANSPORT*1000} gCO₂eq/t.km (valeur ADEME)
              </div>
            </div>

            {/* Exploitation */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                ⚙️ Émissions d'exploitation
              </div>
              {methode==="reelle"?(
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Consommation carburant totale chantier (L)
                  </div>
                  <input type="number" value={consoCarbu} min={0}
                    onChange={e=>setConsoCarbu(e.target.value)}
                    placeholder="Ex : 450"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:C.tx3,marginTop:6}}>
                    eec réelle : saisir la valeur directement ou calculer ci-dessous
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                      Valeur eec réelle (gCO₂eq/MJ) — optionnel
                    </div>
                    <input type="number" value={eecReelle} min={0}
                      onChange={e=>setEecReelle(e.target.value)}
                      placeholder="Laisser vide pour calculer depuis la conso carburant"
                      style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:8}}>
                    Équipements utilisés sur le chantier
                  </div>
                  {materielItems.map((m,i)=>(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                      padding:"10px 12px",background:C.bg2,borderRadius:10}}>
                      <div style={{flex:1,fontSize:12,color:C.tx,fontWeight:500}}>{m.label}</div>
                      <div style={{fontSize:11,color:C.tx3,width:90,flexShrink:0}}>
                        {m.conso} {m.unite}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <span style={{fontSize:11,color:C.tx3}}>{m.type==="h"?"Durée (h)":"Distance (km)"}</span>
                        <input type="number" value={m.qty||""} min={0}
                          onChange={e=>{const v=parseFloat(e.target.value)||0;
                            setMaterielItems(p=>p.map((x,j)=>j===i?{...x,qty:v}:x));}}
                          style={{width:70,padding:"6px 8px",borderRadius:8,fontSize:13,
                            border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                            textAlign:"right"}}/>
                        <button onClick={()=>setMaterielItems(p=>p.filter((_,j)=>j!==i))}
                          style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.bd}`,
                            background:"#fff",cursor:"pointer",fontSize:12,color:C.tx3}}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <select value={selectedMat} onChange={e=>setSelectedMat(e.target.value)}
                      style={{flex:1,padding:"9px 12px",borderRadius:10,fontSize:12,
                        border:`1.5px solid ${C.bd}`,background:"#fff",color:C.tx,
                        fontFamily:"inherit",outline:"none"}}>
                      <option value="">— Ajouter un équipement —</option>
                      {MATERIEL_GES.filter(m=>!materielItems.find(x=>x.id===m.id)).map(m=>(
                        <option key={m.id} value={m.id}>{m.label} ({m.conso} {m.unite})</option>
                      ))}
                    </select>
                    <button onClick={()=>{
                      const m=MATERIEL_GES.find(x=>x.id===selectedMat);
                      if(m){setMaterielItems(p=>[...p,{...m,qty:0}]);setSelectedMat("");}
                    }} style={{padding:"9px 16px",borderRadius:10,border:"none",
                      background:C.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",
                      fontSize:13,fontWeight:600}}>
                      + Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Résultat */}
            <div style={{background: conforme
                ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)"
                : "linear-gradient(135deg,#FFF7ED,#FEE2E2)",
              borderRadius:16,padding:20,
              border:`2px solid ${conforme?C.green:C.red}`,
              boxShadow:"0 4px 16px rgba(0,0,0,.10)"}}>
              <div style={{fontSize:15,fontWeight:800,color:conforme?C.greenD:"#B91C1C",marginBottom:4}}>
                {conforme?"✅ Conforme RED II":"⚠️ Dépassement seuil RED II"}
              </div>
              <div style={{fontSize:28,fontWeight:900,color:conforme?C.greenD:"#B91C1C",
                letterSpacing:"-1px",marginBottom:12}}>
                {totalGco2MJavecEec.toFixed(1)} <span style={{fontSize:14,fontWeight:500}}>gCO₂eq/MJ</span>
              </div>
              {/* Barre de progression */}
              <div style={{background:"rgba(0,0,0,.08)",borderRadius:8,height:12,marginBottom:12,overflow:"hidden"}}>
                <div style={{
                  height:"100%",borderRadius:8,transition:"width .4s",
                  background:conforme?C.green:C.red,
                  width:`${Math.min(100,pctSeuil)}%`}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  ["🌱 eec (extraction/culture)", `${eec.toFixed(1)} gCO₂eq/MJ`],
                  ["🚛 Transport amont", `${energieMJ>0?((emissTransAmont_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                  ["🚚 Transport aval",  `${energieMJ>0?((emissTransAval_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                  ["⚙️ Exploitation",    `${energieMJ>0?((emissExploit_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                ].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.6)",borderRadius:10,
                    padding:"10px 12px"}}>
                    <div style={{fontSize:11,color:C.tx3,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(SEUILS_GES).map(([k,s])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,color:C.tx3,padding:"4px 0",
                    borderBottom:`0.5px solid rgba(0,0,0,.08)`}}>
                    <span>{s.label}</span>
                    <span style={{fontWeight:600,
                      color:totalGco2MJavecEec<=s.val?C.greenD:"#B91C1C"}}>
                      {s.val} gCO₂eq/MJ {totalGco2MJavecEec<=s.val?"✅":"❌"}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,fontSize:11,color:C.tx3,lineHeight:1.6}}>
                Émissions totales chantier : <strong>{totalKgco2.toFixed(0)} kgCO₂eq</strong>
                {" · "}Énergie produite : <strong>{energieMWh.toFixed(0)} MWh</strong>
                {" · "}PCI à {humidite}% : <strong>{pci.toFixed(2)} MWh/t</strong>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ── VALEURS DE RÉFÉRENCE ── */}
      {tab==="reference"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🌿 Valeurs eec par défaut (gCO₂eq/MJ)
            </div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.5}}>
              Source : RED II Annexe VI partie C + travaux CIBE sur la filière bois-énergie française.
              Ces valeurs comprennent l'extraction, culture et transformation en amont du transport.
            </div>
            {Object.entries(GES_EEC_DEFAUT).map(([k,d])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",
                borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{d.label}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{d.src}</div>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:C.blueD}}>{d.val}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🚛 Facteurs émission transport
            </div>
            {[
              ["Transport routier (camion 26-44 t)", "62 gCO₂eq/t.km", "ADEME Base Carbone"],
              ["Transport fluvial (barge)", "26 gCO₂eq/t.km", "ADEME Base Carbone"],
              ["Transport ferroviaire", "8 gCO₂eq/t.km", "ADEME Base Carbone"],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{l}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{s}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              ⛽ Facteurs émission carburants
            </div>
            {[
              ["Gazole (diesel)",         "2.68 kgCO₂eq/L", "ADEME 2024"],
              ["Essence SP95/SP98",        "2.28 kgCO₂eq/L", "ADEME 2024"],
              ["HVO (huile végétale)",     "0.33 kgCO₂eq/L", "ADEME 2024"],
              ["GNR (carburant agricole)", "2.68 kgCO₂eq/L", "ADEME 2024"],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{l}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{s}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🎯 Seuils RED II (gCO₂eq/MJ)
            </div>
            {Object.entries(SEUILS_GES).map(([k,s])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,flex:1,paddingRight:12}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:800,color:C.red}}>{s.val}</div>
              </div>
            ))}
            <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6,padding:"10px 0"}}>
              Les émissions fossiles de référence (comparateur) sont fixées à <strong>94 gCO₂eq/MJ</strong>.
              La réduction minimale requise varie de 65 % à 80 % selon le type d'installation.
            </div>
          </div>

          <div style={{background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",borderRadius:16,
            padding:16,border:`1px solid ${C.green}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.greenD,marginBottom:8}}>
              📚 Référence CIBE
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.7}}>
              Le CIBE (Comité Interprofessionnel du Bois-Énergie) a établi des valeurs GES
              spécifiques pour les combustibles bois non représentés dans la directive,
              notamment les plaquettes forestières françaises (2.8 gCO₂eq/MJ) et le bois de bocage
              (3.1 gCO₂eq/MJ). Ces valeurs sont utilisées par défaut dans APPLITAG pour la filière
              française en l'absence de mesures réelles.
            </div>
          </div>
        </div>
      )}

      {/* ── SYSTÈMES VSS ── */}
      {tab==="vss"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",borderRadius:16,
            padding:16,border:"1.5px solid #93C5FD"}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1D4ED8",marginBottom:6}}>
              🏅 Systèmes volontaires reconnus RED II
            </div>
            <div style={{fontSize:12,color:"#1E40AF",lineHeight:1.6}}>
              La Commission européenne publie et met à jour la liste des systèmes volontaires
              reconnus pour attester la conformité RED II. Ces systèmes permettent à un opérateur
              de démontrer que la biomasse respecte les critères de durabilité via un audit
              externe indépendant sur l'ensemble de la chaîne.
            </div>
          </div>

          {VSS_RECONNUS.map(vss=>(
            <div key={vss.id} style={{background:"#fff",borderRadius:16,padding:16,
              border:`2px solid ${vss.couleur}20`,
              boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
                gap:12,marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:18,fontWeight:900,color:vss.couleur}}>{vss.label}</span>
                    {vss.reconnu==="UE"&&!vss.vigilance&&(
                      <span style={{fontSize:11,fontWeight:700,color:"#1565C0",
                        background:"#E3F2FD",padding:"3px 8px",borderRadius:6}}>
                        ✅ Reconnu Commission UE
                      </span>
                    )}
                    {vss.vigilance&&(
                      <span style={{fontSize:11,fontWeight:700,color:"#E65100",
                        background:"#FFF3E0",padding:"3px 8px",borderRadius:6}}>
                        ⚠️ Point de vigilance
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{vss.org}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{background:vss.bg,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:vss.couleur,marginBottom:3}}>
                    Périmètre
                  </div>
                  <div style={{fontSize:12,color:C.tx2,lineHeight:1.5}}>{vss.perimetre}</div>
                </div>
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:3}}>
                    Combustibles couverts
                  </div>
                  <div style={{fontSize:12,color:C.tx2,lineHeight:1.5}}>{vss.combustibles}</div>
                </div>
                <div style={{background: vss.vigilance?"#FFF3E0":"#F0FDF4",
                  borderRadius:10,padding:"10px 12px",
                  border:`1px solid ${vss.vigilance?"#FED7AA":"#BBF7D0"}`}}>
                  <div style={{fontSize:11,color:C.tx2,lineHeight:1.6}}>{vss.note}</div>
                </div>
              </div>
            </div>
          ))}

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:10}}>
              📋 Points clés pour APPLITAG
            </div>
            {[
              ["🔄 Référentiel évolutif","La liste des systèmes reconnus est mise à jour par la Commission. APPLITAG permet de saisir tout système reconnu sans en figer un seul."],
              ["📄 Fiche certificat complète","Pour chaque lot RED : système VSS, n° de certificat, organisme certificateur, date de validité, périmètre — tout est sauvegardé dans la visite."],
              ["⏰ Alerte expiration","APPLITAG détecte les certificats expirés ou expirant dans moins de 60 jours et affiche une alerte dans le formulaire de visite."],
              ["🔗 Chaîne de contrôle","Le VSS couvre la chaîne de la forêt jusqu'au producteur de combustible. L'opérateur doit être inscrit dans le système et disposer d'un certificat actif."],
            ].map(([t,d])=>(
              <div key={t} style={{padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:3}}>{t}</div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BILAN LOTS ── */}
      {tab==="bilan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              📊 Bilan GES par lot
            </div>
            {lots.filter(l=>l.certification==="red").length===0?(
              <div style={{textAlign:"center",color:C.tx3,padding:"30px 0",fontSize:13}}>
                Aucun lot avec certification RED II trouvé.
                <br/>Les bilans s'affichent automatiquement pour les lots certifiés RED.
              </div>
            ):(
              lots.filter(l=>l.certification==="red").map(lot=>{
                const v = visites.find(x=>x.lotId===lot.id);
                const livs = livraisons.filter(x=>x.lotId===lot.id);
                const tonnageTot = livs.reduce((s,x)=>s+(x.poidsNet||x.poidsBrut||0),0);
                const distAm = v?.redDistance||0;
                const humMoy = livs.length ? livs.reduce((s,x)=>s+(x.humiditeReception||30),0)/livs.length : 30;
                const pciL = calcPCI(humMoy);
                const eMJ = tonnageTot * pciL * 3600;
                const eTransAval = livs.reduce((s,x)=>s+(x.distanceLivraison||distAval)*(x.poidsNet||x.poidsBrut||0)*FACTEUR_TRANSPORT,0);
                const eTransAmont = tonnageTot * distAm * FACTEUR_TRANSPORT;
                const eec_v = GES_EEC_DEFAUT[v?.redCategorie]?.val || 3.5;
                const total = eMJ>0 ? ((eTransAval+eTransAmont)*1000/eMJ) + eec_v : 0;
                return (
                  <div key={lot.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{lot.lotNumero||lot.id}</div>
                        <div style={{fontSize:11,color:C.tx3}}>{lot.commune||"—"} · {tonnageTot} t livré</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,
                          color:total<=seuilRef?C.greenD:"#B91C1C"}}>
                          {total.toFixed(1)} gCO₂eq/MJ
                        </div>
                        <div style={{fontSize:10,color:total<=seuilRef?C.green:C.red,fontWeight:600}}>
                          {total<=seuilRef?"✅ Conforme":"❌ Non conforme"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── MÉTHODE ── */}
      {tab==="methode"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[{
            titre:"🔢 Méthode des valeurs par défaut",
            couleur:C.blue, bg:C.blueL,
            texte:"Utilise les valeurs eec publiées dans les annexes RED II ou établies par le CIBE pour la filière française. Aucune mesure requise. Adaptée pour une première déclaration ou les petits fournisseurs. Les valeurs CIBE sont spécifiquement calibrées pour les combustibles bois non couverts par la directive."
          },{
            titre:"📊 Méthode des valeurs réelles",
            couleur:C.green, bg:C.greenL,
            texte:"Repose sur les consommations de carburant réellement mesurées sur le chantier (déchiquetage, débardage, chargement) et les distances de transport effectives. Permet de réduire significativement la valeur GES déclarée si les pratiques d'exploitation sont optimisées. Requiert un suivi terrain documenté."
          },{
            titre:"🔬 Méthode désagrégée (art. 31 RED II)",
            couleur:"#7C3AED", bg:"#EDE9FE",
            texte:"Calcul étape par étape : eec (extraction/sylviculture) + el (traitement) + esca (séquestration carbone sol) + etd (transport et distribution) + eu (usage). La composante esca peut générer un bonus négatif si les pratiques améliorent le stockage carbone des sols forestiers. Méthode avancée requérant un accompagnement technique."
          }].map(({titre,couleur,bg,texte})=>(
            <div key={titre} style={{background:bg,borderRadius:16,padding:16,
              border:`1.5px solid ${couleur}`}}>
              <div style={{fontSize:14,fontWeight:700,color:couleur,marginBottom:8}}>{titre}</div>
              <div style={{fontSize:13,color:C.tx2,lineHeight:1.7}}>{texte}</div>
            </div>
          ))}
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:10}}>
              📐 Formule GES totale (RED II)
            </div>
            <div style={{background:C.bg2,borderRadius:10,padding:"12px 14px",
              fontFamily:"monospace",fontSize:12,color:C.tx,lineHeight:2}}>
              <div><strong>E = eec + el + esca + etd + eu − eccs − eccr</strong></div>
              <div style={{color:C.tx3,fontFamily:"inherit",fontSize:11,marginTop:8,lineHeight:1.8}}>
                eec = émissions extraction et culture<br/>
                el = émissions annualisées de traitement<br/>
                esca = émissions/captures séquestration carbone sol<br/>
                etd = émissions transport et distribution<br/>
                eu = émissions d'utilisation (combustion)<br/>
                eccs = réduction par capture CO₂<br/>
                eccr = réduction par carbone renouvelable capturé
              </div>
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6}}>
              Pour la biomasse bois, <strong>eu = 0</strong> par convention (carbone biogénique).
              La valeur fossile de référence est <strong>94 gCO₂eq/MJ</strong>.
              La réduction minimale requise est de 65 % → seuil ≤ 32.9 gCO₂eq/MJ
              pour les nouvelles installations après 2026.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
