// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../../design-system/tokens.js";
import { apiGet } from "../../services/api.service.js";

// ── LIVRAISONS ──────────────────────────────────────────────────

const LIVRAISONS_DATA = [
  {id:"LIV-2026-0234",transport:"TRP-2026-0898",lot:"LOT-2026-041",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-18",heure:"15:42",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:27100,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0234",signature:true,
   observations:"RAS — réception conforme",statut:"validé"},
  {id:"LIV-2026-0228",transport:"TRP-2026-0891",lot:"LOT-2026-038",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-16",heure:"09:35",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:24650,humidite:25,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0228",signature:true,
   observations:"Bonne qualité — taux humidité excellent",statut:"validé"},
  {id:"LIV-2026-0219",transport:"TRP-2026-0876",lot:"LOT-2026-031",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-15",heure:"08:58",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:25200,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0219",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0198",transport:"TRP-2026-0856",lot:"LOT-2026-024",
   chaufferie:"Chaufferie Moulins",date:"2026-07-08",heure:"11:12",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:23800,humidite:27,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0198",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0187",transport:"TRP-2026-0841",lot:"LOT-2026-019",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-02",heure:"14:20",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:null,humidite:36,granulometrie:"G30-G50",conformite:false,
   refus:true,motifRefus:"Humidité excessive (36%) — lot refusé, retour plateforme",
   bdl:"BL-2026-0187",signature:true,
   observations:"Litige en cours — lot retourné au stockage",statut:"refusé"},
];

const STATUT_LIV = {
  validé:  {label:"Validé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  refusé:  {label:"Refusé",   icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
  partiel: {label:"Partiel",  icon:"⚠️",col:"#92400E",bg:"#FEF3C7"},
  en_attente:{label:"En attente",icon:"⏳",col:"#6B7280",bg:"#F3F4F6"},
};

// PCI — ITEBE 2004 — plaquettes bois feuillus
// PCI(H%) = PCS_sec × (1 − H/100) − L_vap × H/100  avec PCS=5200 kWh/t, L_vap=678.6 kWh/t
const pciKWhT = (h) => Math.round(5200 - 58.8 * h);
const livMWh  = (kg, h) => Math.round(kg / 1000 * pciKWhT(h) / 100) / 10;

const normaliserLivraison = (l: any) => ({
  ...l,
  lot:       l.lot      ?? l.lotNumero ?? l.lotId ?? "—",
  chaufferie:l.chaufferie ?? l.nomDestination ?? "—",
  // API stocke en tonnes, l'UI historique travaille en kg
  poidsNet:  l.poidsNet  != null ? (l.poidsNet  < 500 ? l.poidsNet  * 1000 : l.poidsNet)  : null,
  poidsBrut: l.poidsBrut != null ? (l.poidsBrut < 500 ? l.poidsBrut * 1000 : l.poidsBrut) : null,
  tare:      l.tare      != null ? (l.tare      < 500 ? l.tare      * 1000 : l.tare)      : null,
  humidite:  l.humidite  ?? l.humiditeReception ?? null,
  conformite: l.conformite ?? (l.statut === "verifiee" || l.peseeVerifiee === true),
  refus:     l.refus ?? (l.statut === "litigieuse"),
  statut:    l.statut === "verifiee"   ? "validé"
           : l.statut === "litigieuse" ? "refusé"
           : l.statut === "declaree"   ? "déclarée"
           : (l.statut ?? "déclarée"),
});

export const SectionLivraisons = () => {
  const [allLivraisons, setAllLivraisons] = useState(LIVRAISONS_DATA);
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (apiGet("/livraisons") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0)
          setAllLivraisons(data.map(normaliserLivraison));
      })
      .catch(() => {});
  }, []);

  const livraisons = filtreStatut==="tous" ? allLivraisons
    : allLivraisons.filter(l=>l.statut===filtreStatut);
  const lv = selected ? allLivraisons.find(l=>l.id===selected) : null;

  const totalTonnes = allLivraisons.filter(l=>l.poidsNet).reduce((s,l)=>s+l.poidsNet,0);
  const nbRefus     = allLivraisons.filter(l=>l.refus).length;
  const txConformite= allLivraisons.length>0 ? Math.round(allLivraisons.filter(l=>l.conformite).length/allLivraisons.length*100) : 0;
  const humFilt     = allLivraisons.filter(l=>l.humidite);
  const humMoy      = humFilt.length>0 ? Math.round(humFilt.reduce((s,l)=>s+l.humidite,0)/humFilt.length) : 0;
  const totalMWh    = Math.round(allLivraisons.filter(l=>l.poidsNet&&l.humidite).reduce((s,l)=>s+livMWh(l.poidsNet,l.humidite),0));

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📦 Livraisons & réceptions</div>
        <div style={{fontSize:13,color:C.tx2}}>Réception chaufferie, pesée, qualité, conformité</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"⚖️",label:"Tonnes reçues",val:(totalTonnes/1000).toFixed(1)+" t",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚡",label:"Énergie livrée",val:totalMWh+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"✅",label:"Taux conformité",val:txConformite+"%",col:txConformite>=90?"#059669":"#D97706",bg:txConformite>=90?"#D1FAE5":"#FEF3C7"},
          {ico:"💧",label:"Humidité moy.",val:humMoy+"%",col:humMoy<=30?"#0369A1":"#D97706",bg:humMoy<=30?"#DBEAFE":"#FEF3C7"},
          {ico:"❌",label:"Refus",val:nbRefus+" lot"+(nbRefus>1?"s":""),col:nbRefus>0?"#991B1B":"#059669",bg:nbRefus>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Toutes"],["validé","Validées"],["déclarée","Déclarées"],["refusé","Refusées"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
          + Saisir une réception
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:lv?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {livraisons.map(l=>{
            const st = STATUT_LIV[l.statut]||STATUT_LIV.en_attente;
            const isSelected = selected===l.id;
            return (
              <div key={l.id} onClick={()=>setSelected(isSelected?null:l.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":l.refus?"#FCA5A5":C.bd}`}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{l.id}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                    </div>
                    <div style={{fontSize:11,color:C.tx2}}>{l.lot} → {l.chaufferie}</div>
                    <div style={{display:"flex",gap:10,marginTop:4,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📅 {l.date} à {l.heure}</span>
                      <span>👤 {l.chauffeur}</span>
                      <span>💧 Humidité : {l.humidite??"-"}%</span>
                      <span>📐 {l.granulometrie}</span>
                      {l.humidite&&l.poidsNet&&<span style={{color:"#7C3AED",fontWeight:700}}>⚡ {pciKWhT(l.humidite)} kWh/t · {livMWh(l.poidsNet,l.humidite)} MWh</span>}
                      {l.signature&&<span>✍️ Signé</span>}
                    </div>
                    {l.refus&&<div style={{marginTop:4,fontSize:10,color:"#991B1B",fontWeight:600}}>
                      ❌ {l.motifRefus}
                    </div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:l.poidsNet?"#1E5B3A":"#9CA3AF"}}>
                      {l.poidsNet?(l.poidsNet/1000).toFixed(2)+" t":"—"}
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>poids net</div>
                    <div style={{fontSize:10,color:"#0369A1",marginTop:4}}>{l.bdl}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {lv&&(
          <div style={{background:"#fff",borderRadius:14,
            border:`2px solid ${lv.refus?"#DC2626":"#1E5B3A"}`,padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{lv.id}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {lv.refus&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",
                marginBottom:12,fontSize:11,color:"#991B1B",border:"1px solid #FECACA",fontWeight:600}}>
                ❌ {lv.motifRefus}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Lot",lv.lot],["Chaufferie",lv.chaufferie],
                ["Date / Heure",lv.date+" à "+lv.heure],
                ["Chauffeur",lv.chauffeur],["Véhicule",lv.vehicule],
                ["Poids net",lv.poidsNet?(lv.poidsNet/1000).toFixed(2)+" t":"Non saisi"],
                ["Humidité",lv.humidite?lv.humidite+"%":"—"],
                ["PCI (ITEBE 2004)",lv.humidite?pciKWhT(lv.humidite)+" kWh/t":"—"],
                ["Énergie livrée",(lv.poidsNet&&lv.humidite)?livMWh(lv.poidsNet,lv.humidite)+" MWh":"—"],
                ["Granulométrie",lv.granulometrie],
                ["Conformité",lv.conformite?"✅ Conforme":"❌ Non conforme"],
                ["Bon de livraison",lv.bdl],
                ["Signature",lv.signature?"✍️ Apposée":"En attente"],
                ["Observations",lv.observations||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:120,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                ⬇️ Bon de livraison PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const STATUT_FACTURE = {
  brouillon:  {label:"Brouillon",        color:"#6B7280", bg:"#F3F4F6", icon:"✏️"},
  validee:    {label:"Bon validé",       color:"#1E40AF", bg:"#DBEAFE", icon:"✅"},
  emise:      {label:"Émise",            color:"#065F46", bg:"#D1FAE5", icon:"📤"},
  transmise:  {label:"Transmise plateforme",color:"#7C3AED",bg:"#EDE9FE",icon:"🔗"},
  payee:      {label:"Payée",            color:"#064E3B", bg:"#CCFBF1", icon:"💶"},
  litige:     {label:"Litige",           color:"#991B1B", bg:"#FEE2E2", icon:"⚠️"},
  doublon:    {label:"Doublon détecté",  color:"#B45309", bg:"#FEF3C7", icon:"🔄"},
};

const DEMO_FACTURES = [
  {
    id:"FAC-2026-0041", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-01", dateEcheance:"2026-07-31",
    statut:"payee",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",     qte:145, unite:"t", pu:52.00, total:7540},
      {libelle:"Broyage sur site",          cat:"prestation",  qte:145, unite:"t", pu: 8.50, total:1232.50},
      {libelle:"Transport chaufferie",      cat:"transport",   qte:145, unite:"t", pu: 6.20, total:899},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0052", lot:"LOT-2026-044", livraison:"LIV-2026-0241",
    fournisseur:"ETA Moreau Sylviculture", client:"Réseau de chaleur Vichy Sud",
    dateEmission:"2026-07-08", dateEcheance:"2026-08-07",
    statut:"transmise",
    lignes:[
      {libelle:"Bois énergie — qualité P45", cat:"matiere",    qte:89,  unite:"t", pu:48.00, total:4272},
      {libelle:"Transport",                  cat:"transport",  qte:89,  unite:"t", pu: 7.10, total:631.90},
    ],
    tonnageLivre:91, tonnageReceptionne:89, ecartTonnage:2,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0055", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-03", dateEcheance:"2026-08-02",
    statut:"doublon",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",    qte:145, unite:"t", pu:52.00, total:7540},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:true, archiveJustif:false,
    doublonDe:"FAC-2026-0041",
  },
  {
    id:"FAC-2026-0063", lot:"LOT-2026-049", livraison:null,
    fournisseur:"Groupement Forestier Allier Est", client:"Chaufferie Saint-Pourçain",
    dateEmission:null, dateEcheance:"2026-08-15",
    statut:"validee",
    lignes:[
      {libelle:"Plaquettes bord de route",  cat:"matiere",    qte:68,  unite:"t", pu:45.00, total:3060},
      {libelle:"Préparation du lot",        cat:"prestation", qte:68,  unite:"t", pu: 4.00, total:272},
      {libelle:"Transport",                 cat:"transport",  qte:68,  unite:"t", pu: 6.80, total:462.40},
    ],
    tonnageLivre:68, tonnageReceptionne:null, ecartTonnage:null,
    doublonDetecte:false, archiveJustif:false,
  },
];

export const SectionFacturationElec = () => {
  const [tab,     setTab]     = useState("suivi");
  const [selFac,  setSelFac]  = useState(null);

  const totalHT   = DEMO_FACTURES.filter(f=>f.statut!=="doublon")
                      .reduce((s,f)=>s+f.lignes.reduce((a,l)=>a+l.total,0),0);
  const nbDoublon = DEMO_FACTURES.filter(f=>f.doublonDetecte).length;
  const nbEcart   = DEMO_FACTURES.filter(f=>f.ecartTonnage&&f.ecartTonnage>0).length;

  const CAT_COLORS = {matiere:"#1E5B3A", prestation:"#1E40AF", transport:"#B45309"};
  const CAT_BG     = {matiere:"#D1FAE5", prestation:"#DBEAFE", transport:"#FEF3C7"};

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête + deadline */}
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🧾 Facturation électronique
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Lot livré → Bon validé → Quantité définitive → Ventilation → Plateforme agréée → Paiement suivi
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
          {[
            ["1er sept. 2026","Réception obligatoire — toutes entreprises","#1E40AF","#DBEAFE"],
            ["1er sept. 2027","Émission obligatoire — TPE/PME",            "#7C3AED","#EDE9FE"],
          ].map(([d,l,col,bg])=>(
            <div key={d} style={{display:"flex",alignItems:"center",gap:8,
              background:bg,border:`1px solid ${col}44`,borderRadius:10,padding:"5px 12px"}}>
              <span style={{fontSize:11,fontWeight:900,color:col}}>{d}</span>
              <span style={{fontSize:10,color:col}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bannière positionnement */}
      <div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12,
        padding:"12px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:20,flexShrink:0}}>🎯</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:3}}>
            APPLITAG — couche métier en amont de la plateforme agréée
          </div>
          <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
            APPLITAG prépare et structure les données facturables. La transmission légale est effectuée
            par la plateforme de dématérialisation partenaire (PDP) choisie par l'entreprise.
            <strong> APPLITAG n'est pas une plateforme agréée.</strong>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {icon:"🧾",label:"Factures",      val:DEMO_FACTURES.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {icon:"💶",label:"Total HT",       val:`${(totalHT/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {icon:"🔄",label:"Doublons",       val:nbDoublon, col:nbDoublon>0?"#991B1B":"#065F46",
           bg:nbDoublon>0?"#FEE2E2":"#D1FAE5"},
          {icon:"⚖️",label:"Écarts tonnage", val:nbEcart,   col:nbEcart>0?"#B45309":"#065F46",
           bg:nbEcart>0?"#FEF3C7":"#D1FAE5"},
          {icon:"📤",label:"Transmises PDP", val:DEMO_FACTURES.filter(f=>f.statut==="transmise"||f.statut==="payee").length,
           col:"#7C3AED",bg:"#EDE9FE"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          ["suivi",    "📋","Suivi des factures"],
          ["workflow", "🔄","Workflow lot → facture"],
          ["export",   "📤","Export structuré"],
          ["conformite","⚖️","Conformité & risques"],
        ].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── SUIVI DES FACTURES ── */}
      {tab==="suivi"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_FACTURES.map(f=>{
            const st  = STATUT_FACTURE[f.statut]||STATUT_FACTURE.brouillon;
            const ttl = f.lignes.reduce((s,l)=>s+l.total,0);
            const isOpen = selFac===f.id;
            return (
              <div key={f.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${f.doublonDetecte?"#F59E0B":f.ecartTonnage>0?"#FCA5A5":st.color+"44"}`,
                boxShadow:f.doublonDetecte?"0 0 0 2px #FEF3C7":undefined}}>
                {/* Header */}
                <div onClick={()=>setSelFac(isOpen?null:f.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"60":"#fff",
                    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:900,color:C.tx,fontFamily:"monospace"}}>
                        {f.id}
                      </span>
                      <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                      {f.doublonDetecte&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEF3C7",color:"#B45309"}}>
                          🔄 Doublon de {f.doublonDe}
                        </span>
                      )}
                      {f.ecartTonnage>0&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEE2E2",color:"#991B1B"}}>
                          ⚖️ Écart {f.ecartTonnage} t
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:C.tx3}}>
                      {f.fournisseur} → {f.client}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                      {f.lot} · {f.livraison||"Livraison à rattacher"} ·{" "}
                      {f.dateEmission
                        ? `Émission ${new Date(f.dateEmission).toLocaleDateString("fr-FR")}`
                        : "Non émise"}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:st.color}}>
                      {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>HT</div>
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>

                {/* Détail */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA"}}>
                    {/* Lignes de facture */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                        Lignes de facturation — ventilation matière / prestation / transport
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:C.bg2}}>
                            {["Libellé","Catégorie","Qté","Unité","PU HT","Total HT"].map(h=>(
                              <th key={h} style={{padding:"7px 10px",textAlign:"left",
                                fontSize:10,fontWeight:800,color:C.tx2,
                                borderBottom:`1px solid ${C.bd}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {f.lignes.map((l,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid ${C.bd}`}}>
                              <td style={{padding:"8px 10px",color:C.tx,fontWeight:600}}>{l.libelle}</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,
                                  fontWeight:700,background:CAT_BG[l.cat],
                                  color:CAT_COLORS[l.cat]}}>
                                  {l.cat}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px",color:C.tx}}>{l.qte}</td>
                              <td style={{padding:"8px 10px",color:C.tx3}}>{l.unite}</td>
                              <td style={{padding:"8px 10px",color:C.tx}}>
                                {l.pu.toFixed(2)} €
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:700,color:C.tx}}>
                                {l.total.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                              </td>
                            </tr>
                          ))}
                          <tr style={{background:C.bg2,borderTop:`2px solid ${C.bd}`}}>
                            <td colSpan={5} style={{padding:"8px 10px",fontWeight:800,
                              color:C.tx,textAlign:"right"}}>Total HT</td>
                            <td style={{padding:"8px 10px",fontWeight:900,fontSize:14,
                              color:"#1E40AF"}}>
                              {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Rapprochement lot-livraison */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      {[
                        ["🌲 Lot source",     f.lot,           "#1E5B3A"],
                        ["📦 Livraison",       f.livraison||"Non rattachée","#1E40AF"],
                        ["📄 Justificatifs",   f.archiveJustif?"Archivés ✓":"À compléter ⏳",
                         f.archiveJustif?"#065F46":"#B45309"],
                      ].map(([lbl,val,col])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${col}33`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:11,fontWeight:700,color:col}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Écart tonnage */}
                    {f.tonnageReceptionne!==null&&(
                      <div style={{padding:"8px 12px",borderRadius:8,marginBottom:10,
                        background:f.ecartTonnage>0?"#FEF2F2":"#F0FDF4",
                        border:`1px solid ${f.ecartTonnage>0?"#FECACA":"#86EFAC"}`}}>
                        <div style={{fontSize:11,fontWeight:700,
                          color:f.ecartTonnage>0?"#991B1B":"#065F46"}}>
                          {f.ecartTonnage>0
                            ? `⚠️ Écart tonnage : facturé ${f.tonnageLivre} t / réceptionné ${f.tonnageReceptionne} t (−${f.ecartTonnage} t)`
                            : `✅ Tonnage cohérent : ${f.tonnageLivre} t facturé = ${f.tonnageReceptionne} t réceptionné`}
                        </div>
                      </div>
                    )}

                    {/* Alerte doublon */}
                    {f.doublonDetecte&&(
                      <div style={{padding:"10px 12px",borderRadius:8,
                        background:"#FEF3C7",border:"1px solid #FCD34D"}}>
                        <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
                          🔄 Doublon détecté — action requise
                        </div>
                        <div style={{fontSize:11,color:"#78350F",lineHeight:1.6}}>
                          Cette facture concerne le même lot et la même livraison que <strong>{f.doublonDe}</strong>,
                          déjà payée. Vérifier avant toute transmission à la plateforme agréée.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:14}}>
              Chaîne de valeur APPLITAG → Plateforme agréée
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {n:1,ico:"🌲",titre:"Lot livré",          desc:"Visite terrain validée, tonnage pesé à la réception, humidité contrôlée",                  col:"#1E5B3A",bg:"#D1FAE5"},
                {n:2,ico:"✅",titre:"Bon de livraison validé",desc:"Signature numérique réception — quantité définitive arrêtée",                         col:"#065F46",bg:"#D1FAE5"},
                {n:3,ico:"⚖️",titre:"Quantité définitive",  desc:"Tonnage réceptionné = base facturable. Tout écart entre livré et réceptionné est signalé",col:"#1E40AF",bg:"#DBEAFE"},
                {n:4,ico:"📊",titre:"Ventilation des lignes",desc:"Matière / Broyage / Transport ventilés séparément avec codes produit et quantités",      col:"#7C3AED",bg:"#EDE9FE"},
                {n:5,ico:"🧾",titre:"Données préparées",    desc:"Identifiant unique, références croisées lot-livraison-facture, contrôle doublon",        col:"#B45309",bg:"#FEF3C7"},
                {n:6,ico:"🔗",titre:"→ Plateforme agréée (PDP)",desc:"Export structuré (UBL/Factur-X) transmis à la PDP choisie par l'entreprise. APPLITAG n'est pas la PDP.",col:"#6B7280",bg:"#F3F4F6"},
                {n:7,ico:"💶",titre:"Paiement suivi",        desc:"Statut de paiement rapatrié depuis la PDP ou saisi manuellement — historique conservé",  col:"#064E3B",bg:"#CCFBF1"},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"10px 12px",borderRadius:10,background:s.bg,
                  border:`1px solid ${s.col}33`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:s.col,
                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:900,fontSize:12,flexShrink:0}}>{s.n}</div>
                  <span style={{fontSize:18,flexShrink:0,marginTop:2}}>{s.ico}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:s.col}}>{s.titre}</div>
                    <div style={{fontSize:11,color:C.tx2,marginTop:2,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identifiant unique */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🔑 Identifiant unique de facture — structure APPLITAG
            </div>
            <div style={{fontFamily:"monospace",fontSize:13,color:"#1E3A8A",
              background:"#fff",borderRadius:8,padding:"10px 14px",
              border:"1px solid #BFDBFE",letterSpacing:".5px"}}>
              FAC-<span style={{color:"#7C3AED"}}>2026</span>-<span style={{color:"#065F46"}}>XXXX</span>
            </div>
            <div style={{fontSize:11,color:"#1E3A8A",marginTop:8,lineHeight:1.6}}>
              Préfixe <strong>FAC</strong> · Année · Séquence numérique.
              Chaque facture référence son lot source et sa livraison — rapprochement automatique,
              détection de doublon par triplet (lot × livraison × fournisseur).
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT STRUCTURÉ ── */}
      {tab==="export"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
              📋 Action recommandée — Export structuré d'abord, intégration API ensuite
            </div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.7}}>
              Le consortium recommande de privilégier un export structuré et un suivi des statuts
              avant de développer un connecteur API. La plateforme comptable choisie par l'entreprise
              n'est pas encore connue dans tous les cas.
            </div>
          </div>

          {/* Formats disponibles */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Formats d'export disponibles (feuille de route)
            </div>
            {[
              {fmt:"CSV structuré",       ico:"📊",stat:"disponible","desc":"Export immédiat des lignes de facture avec ventilation matière/prestation/transport",col:"#065F46",bg:"#D1FAE5"},
              {fmt:"PDF récapitulatif",   ico:"📄",stat:"disponible","desc":"Bon de livraison + lignes facturables + totaux HT — prêt à transmettre",           col:"#1E40AF",bg:"#DBEAFE"},
              {fmt:"Factur-X (PDF/A-3)", ico:"🔗",stat:"roadmap",   "desc":"Format hybride PDF + XML structuré — standard FR pour la facturation électronique", col:"#7C3AED",bg:"#EDE9FE"},
              {fmt:"UBL 2.1",             ico:"🌐",stat:"roadmap",   "desc":"Standard européen XML — requis par certaines PDP",                                  col:"#B45309",bg:"#FEF3C7"},
              {fmt:"Connecteur API PDP",  ico:"⚡",stat:"à définir", "desc":"Dépend de la PDP choisie par l'entreprise — développement après choix comptable",   col:"#6B7280",bg:"#F3F4F6"},
            ].map(f=>(
              <div key={f.fmt} style={{display:"flex",gap:12,alignItems:"center",
                padding:"10px 12px",borderRadius:10,background:f.bg,
                border:`1px solid ${f.col}33`,marginBottom:6}}>
                <span style={{fontSize:20,flexShrink:0}}>{f.ico}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:f.col}}>{f.fmt}</span>
                    <span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,
                      background:f.stat==="disponible"?"#065F46":f.stat==="roadmap"?"#7C3AED":"#6B7280",
                      color:"#fff"}}>{f.stat}</span>
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Archivage */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🗄️ Archivage des justificatifs — obligations légales
            </div>
            {[
              ["10 ans","Durée minimale d'archivage des factures électroniques"],
              ["Preuve d'intégrité","Signature ou empreinte numérique à conserver"],
              ["Piste d'audit fiable","Lien traçable lot → livraison → facture → paiement"],
            ].map(([v,l])=>(
              <div key={v} style={{display:"flex",gap:10,alignItems:"center",
                padding:"6px 0",borderBottom:`1px solid #BFDBFE`}}>
                <span style={{fontSize:11,fontWeight:900,color:"#1E40AF",minWidth:120,flexShrink:0}}>{v}</span>
                <span style={{fontSize:11,color:"#1E3A8A"}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFORMITÉ & RISQUES ── */}
      {tab==="conformite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Calendrier */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              📅 Calendrier d'application
            </div>
            {[
              {date:"1er septembre 2026",scope:"Toutes entreprises",
               oblig:"Réception des factures électroniques",col:"#1E40AF",bg:"#DBEAFE",urgent:true},
              {date:"1er septembre 2027",scope:"TPE / PME",
               oblig:"Émission des factures électroniques",col:"#7C3AED",bg:"#EDE9FE",urgent:false},
            ].map(e=>(
              <div key={e.date} style={{display:"flex",gap:12,alignItems:"flex-start",
                padding:"12px",borderRadius:10,background:e.bg,
                border:`1.5px solid ${e.col}44`,marginBottom:8}}>
                <div style={{background:e.col,borderRadius:8,padding:"6px 12px",
                  textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:900,color:"#fff",whiteSpace:"nowrap"}}>{e.date}</div>
                  {e.urgent&&<div style={{fontSize:9,color:"#fff",opacity:.8,marginTop:1}}>J−41</div>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:e.col,marginBottom:2}}>{e.oblig}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{e.scope}</div>
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.tx3,lineHeight:1.6,marginTop:4}}>
              Les entreprises doivent passer par une <strong>plateforme de dématérialisation partenaire (PDP)</strong> agréée
              pour transmettre ou recevoir leurs factures et les données réglementaires.
            </div>
          </div>

          {/* Risques */}
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>
              ⚠️ Risques à éviter
            </div>
            {[
              ["Développer un connecteur sans connaître la PDP",
               "Chaque PDP a son API propriétaire. Attendre le choix comptable avant tout développement de connecteur."],
              ["Créer un doublon avec le logiciel de comptabilité",
               "APPLITAG prépare les données — il ne remplace pas le logiciel de comptabilité. Définir clairement la frontière."],
              ["Facturer un tonnage différent du tonnage réceptionné",
               "Le tonnage facturé doit être celui réceptionné signé. APPLITAG détecte automatiquement les écarts."],
              ["Présenter APPLITAG comme une plateforme agréée",
               "APPLITAG est la couche métier amont. La PDP est un opérateur agréé par l'administration — rôles distincts."],
            ].map(([t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"9px 0",
                borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                  <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fonctions prioritaires */}
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>
              ✅ Fonctions prioritaires APPLITAG
            </div>
            {[
              ["🔑","Identifiant unique de facture",          "Généré automatiquement — FAC-AAAA-XXXX"],
              ["🔗","Rapprochement lot-livraison-facture",    "Triplet unique — détection croisée"],
              ["🔄","Détection des doublons",                 "Même lot × livraison × fournisseur → alerte"],
              ["📊","Suivi des statuts",                      "Brouillon → Validé → Émis → Transmis PDP → Payé"],
              ["📋","Ventilation matière / prestation / transport","3 catégories distinctes par ligne"],
              ["🗄️","Archivage des justificatifs",            "Lien piste d'audit — 10 ans minimum"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid #A7F3D0`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>{lbl}</div>
                  <div style={{fontSize:10,color:"#047857",marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
