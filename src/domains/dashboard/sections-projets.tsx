// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";


/* ═══════════════════════════════════════════════════════════════
   MODULE COPRODUITS DE SCIERIE
═══════════════════════════════════════════════════════════════ */
const COPRODUIT_CATS = [
  {id:"ecorces",    ico:"🪵", l:"Écorces",           col:"#7C3AED", bg:"#EDE9FE"},
  {id:"sciures",    ico:"🌫️", l:"Sciures",            col:"#B45309", bg:"#FEF3C7"},
  {id:"plaquettes", ico:"🪚", l:"Plaquettes",         col:"#1E5B3A", bg:"#D1FAE5"},
  {id:"dosses",     ico:"🪜", l:"Dosses / délignures", col:"#1E40AF", bg:"#DBEAFE"},
  {id:"chutes",     ico:"🔪", l:"Chutes bout/tête",   col:"#065F46", bg:"#CCFBF1"},
];
const DESTINATION_COPRODS = [
  {v:"energie_interne","l":"Énergie interne (chaudière scierie)"},
  {v:"vente_energie",  "l":"Vente — bois énergie tiers"},
  {v:"vente_matiere",  "l":"Vente — matière (panneaux, pâte)"},
  {v:"compostage",     "l":"Compostage / amendement"},
  {v:"stock",          "l":"Stocké — destination à définir"},
];
const DEMO_STOCKS_COPRODS = [
  {id:"SC-001-demo",scierie:"Scierie Moreau — Moulins",cat:"plaquettes",humidite:28,
   stockTonnes:145,qualite:"P31",destination:"vente_energie",
   enlevement:"2026-08-15",prixTonne:38,margeTonne:12,saisonnel:false},
  {id:"SC-002-demo",scierie:"Scierie Moreau — Moulins",cat:"sciures",humidite:45,
   stockTonnes:62,qualite:"vrac",destination:"energie_interne",
   enlevement:null,prixTonne:0,margeTonne:0,saisonnel:true},
  {id:"SC-003-demo",scierie:"Scierie du Morvan — Château-Chinon",cat:"ecorces",humidite:52,
   stockTonnes:89,qualite:"mélange",destination:"compostage",
   enlevement:"2026-09-01",prixTonne:8,margeTonne:2,saisonnel:false},
  {id:"SC-004-demo",scierie:"Scierie du Morvan — Château-Chinon",cat:"dosses",humidite:35,
   stockTonnes:34,qualite:"hêtre/chêne",destination:"vente_matiere",
   enlevement:"2026-08-01",prixTonne:55,margeTonne:18,saisonnel:false},
  {id:"SC-005-demo",scierie:"Scierie Lefebvre — Clamecy",cat:"plaquettes",humidite:30,
   stockTonnes:210,qualite:"P45",destination:"vente_energie",
   enlevement:"2026-07-30",prixTonne:42,margeTonne:15,saisonnel:false},
];

export const SectionCoproduits = () => {
  const [tab,     setTab]     = useState("stocks");
  const [filtCat, setFiltCat] = useState("tous");
  const [selId,   setSelId]   = useState(null);

  // LOTs secondaires générés depuis Scierie
  const lotsSec = lotsSecGet();

  const stocks = filtCat==="tous"
    ? DEMO_STOCKS_COPRODS
    : DEMO_STOCKS_COPRODS.filter(s=>s.cat===filtCat);

  const totalStock  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes,0);
  const totalCa     = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.prixTonne,0);
  const totalMarge  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.margeTonne,0);
  const nbEnlev     = DEMO_STOCKS_COPRODS.filter(c=>c.enlevement&&new Date(c.enlevement)<=new Date(Date.now()+30*864e5)).length;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            ♻️ Coproduits de scierie
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Écorces · Sciures · Plaquettes · Dosses · Qualification · Débouchés
          </div>
        </div>
        {/* Badge FEADER */}
        <div style={{background:"#EDE9FE",border:"1.5px solid #7C3AED",borderRadius:10,
          padding:"6px 14px",fontSize:11,fontWeight:700,color:"#5B21B6"}}>
          🇪🇺 FEADER Grand Est — phase 2 : 15/09 → 31/12/2026
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📦",l:"Stock total",     v:`${totalStock} t`,              col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"💶",l:"CA potentiel",    v:`${(totalCa/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📈",l:"Marge estimée",   v:`${(totalMarge/1000).toFixed(1)} k€`,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",l:"Enlèvements J30",  v:nbEnlev,                      col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["stocks","📦","Stocks par catégorie"],["flux","🔄","Flux & enlèvements"],
          ["lots_lies","🌲","Lots liés"],["feader","🇪🇺","FEADER Grand Est"],["risques","⚠️","Risques & règles"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── STOCKS ── */}
      {tab==="stocks"&&(
        <div>
          {/* Filtres catégorie */}
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
            <button onClick={()=>setFiltCat("tous")} style={{
              flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
              border:`1.5px solid ${filtCat==="tous"?"#374151":C.bd}`,
              background:filtCat==="tous"?"#374151":"transparent",
              color:filtCat==="tous"?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
              Tous
            </button>
            {COPRODUIT_CATS.map(c=>(
              <button key={c.id} onClick={()=>setFiltCat(c.id)} style={{
                flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${filtCat===c.id?c.col:C.bd}`,
                background:filtCat===c.id?c.bg:"transparent",
                color:filtCat===c.id?c.col:C.tx2,WebkitTapHighlightColor:"transparent"}}>
                {c.ico} {c.l}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {stocks.map(s=>{
              const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
              const dest = DESTINATION_COPRODS.find(d=>d.v===s.destination);
              const isOpen = selId===s.id;
              const enlev = s.enlevement ? new Date(s.enlevement) : null;
              const urgent = enlev && enlev <= new Date(Date.now()+14*864e5);
              return (
                <div key={s.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1.5px solid ${urgent?"#FCA5A5":cat.col+"44"}`}}>
                  <div onClick={()=>setSelId(isOpen?null:s.id)}
                    style={{padding:"12px 14px",cursor:"pointer",
                      display:"flex",alignItems:"center",gap:12,
                      background:isOpen?cat.bg+"50":"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:24,flexShrink:0}}>{cat.ico}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:cat.bg,color:cat.col}}>{cat.l}</span>
                        {urgent&&<span style={{fontSize:10,fontWeight:800,padding:"2px 7px",
                          borderRadius:10,background:"#FEE2E2",color:"#991B1B"}}>🚛 Enlèvement urgent</span>}
                        <span style={{fontSize:10,color:C.tx3}}>{s.qualite}</span>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        Humidité {s.humidite}% · {dest?.l||s.destination}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:16,fontWeight:900,color:cat.col}}>{s.stockTonnes} t</div>
                      {s.prixTonne>0&&<div style={{fontSize:10,color:C.tx3}}>{s.prixTonne} €/t</div>}
                    </div>
                    <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 14px",
                      background:"#FAFAFA",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        ["📦 Stock",`${s.stockTonnes} t`],
                        ["💧 Humidité",`${s.humidite} %`],
                        ["🏷️ Qualité",s.qualite],
                        ["💶 Prix/tonne",s.prixTonne>0?`${s.prixTonne} €/t`:"Non valorisé"],
                        ["📈 Marge/tonne",s.margeTonne>0?`${s.margeTonne} €/t`:"—"],
                        ["🚛 Enlèvement",s.enlevement?new Date(s.enlevement).toLocaleDateString("fr-FR"):"Non planifié"],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOTS LIÉS (issus de Scierie) ── */}
      {tab==="lots_lies"&&(
        <div>
          <div style={{background:"#D1FAE5",border:"1.5px solid #10B981",borderRadius:12,
            padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>🌲</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#065F46"}}>Lots secondaires — traçabilité scierie</div>
              <div style={{fontSize:12,color:"#047857",marginTop:2}}>
                Chaque enlèvement de coproduit génère automatiquement un LOT traçable (LOT-SC-AAAA-NNN).
              </div>
            </div>
            <div style={{marginLeft:"auto",fontWeight:800,fontSize:22,color:"#065F46"}}>{lotsSec.length}</div>
          </div>

          {lotsSec.length===0&&(
            <div style={{background:C.bg2,borderRadius:12,padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>
              Aucun lot secondaire encore généré.<br/>
              <span style={{fontSize:12}}>Créez un enlèvement dans le module Scierie pour générer un LOT traçable.</span>
            </div>
          )}

          {lotsSec.map(l=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===l.coproduitType)||COPRODUIT_CATS[0];
            return (
              <div key={l.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
                padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontWeight:800,fontSize:13,color:"#065F46",background:"#D1FAE5",
                        padding:"2px 10px",borderRadius:8}}>🌲 {l.lotNumero}</span>
                      <span style={{fontSize:11,background:cat.bg,color:cat.col,
                        padding:"2px 8px",borderRadius:8,fontWeight:700}}>{cat.ico} {cat.l}</span>
                    </div>
                    <div style={{fontSize:12,color:C.tx3}}>
                      Destination : <strong>{l.destination}</strong>
                      {l.transporteur&&` · Transport : ${l.transporteur}`}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      Créé le {l.date} · Origine : {l.origine}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:16,color:C.tx}}>{l.tonnage} t</div>
                    {l.prixTonne>0&&(
                      <div style={{fontSize:12,color:C.green,marginTop:2}}>
                        {(l.tonnage*l.prixTonne).toLocaleString("fr-FR")} €
                      </div>
                    )}
                    <div style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:8,marginTop:4,
                      background:"#DBEAFE",color:"#1E40AF"}}>
                      {l.statut==="EN_LIVRAISON"?"🚛 En livraison":"📦 Planifié"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEADER ── */}
      {tab==="feader"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",borderRadius:12,
            padding:"14px",border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              🇪🇺 FEADER – Région Grand Est · Première transformation
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7,marginBottom:10}}>
              Soutien aux scieries : traçabilité, adaptation à l'hétérogénéité de la ressource,
              valorisation des coproduits, circuits courts, maîtrise de l'énergie, optimisation de la production.
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                ["Phase 1","Fermée le 31/07/2026","#991B1B","#FEE2E2"],
                ["Phase 2","15/09 → 31/12/2026","#065F46","#D1FAE5"],
              ].map(([ph,d,col,bg])=>(
                <div key={ph} style={{padding:"8px 14px",borderRadius:10,
                  background:bg,border:`1px solid ${col}44`}}>
                  <div style={{fontSize:11,fontWeight:800,color:col}}>{ph}</div>
                  <div style={{fontSize:10,color:col}}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              🎯 Opportunité APPLITAG — Composante numérique
            </div>
            {[
              ["🔗","Traçabilité grume → production → coproduit","Lien lot forestier → flux scierie → stock connexe"],
              ["📦","Stock connexes par catégorie","Écorces / sciures / plaquettes / dosses / chutes"],
              ["💧","Humidité et qualité mesurées","Base facturable, RED-compatible"],
              ["🔀","Destination matière ou énergie","Distinction obligatoire SNBC 3"],
              ["🚛","Suivi des enlèvements","Planning + confirmation livraison"],
              ["📈","Coût et marge par flux","Rentabilité par coproduit et par scierie"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"10px 12px",background:"#FFFBEB",borderRadius:8,
              border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
              ⚠️ L'éligibilité d'une composante numérique doit être vérifiée dans le règlement régional
              avant tout dépôt de dossier.
            </div>
          </div>

          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:8}}>
              Action recommandée — 10 scieries Grand Est
            </div>
            <div style={{fontSize:11,color:"#7C2D12",lineHeight:1.7,marginBottom:10}}>
              Établir une liste de 10 scieries du Grand Est et leur proposer :<br/>
              <strong>« Diagnostic de valorisation et de traçabilité des coproduits de scierie »</strong>
            </div>
            {["Volumes disponibles par catégorie","Saisonnalité des flux",
              "Qualité et humidité mesurée","Capacité de stockage",
              "Débouchés actuels et potentiels","Transport et logistique",
              "Revenu potentiel par flux"].map(p=>(
              <div key={p} style={{fontSize:11,color:"#7C2D12",padding:"3px 0",
                display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#D97706"}}>▶</span> {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RISQUES ── */}
      {tab==="risques"&&(
        <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
          border:"1.5px solid #FED7AA",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:4}}>
            ⚠️ Risques à éviter
          </div>
          {[
            ["Confondre coproduit disponible et volume commercialement sécurisé",
             "Un stock ne vaut que s'il est qualifié (humidité, qualité, accessibilité) et qu'un débouché est confirmé."],
            ["Ne pas distinguer les débouchés matière et énergie",
             "Obligation SNBC 3 : la hiérarchie des usages impose de tracer matière avant énergie."],
            ["Présenter APPLITAG comme une dépense informatique isolée",
             "La composante numérique doit être intégrée à un projet de transformation — pas présentée seule."],
            ["Attendre la phase 2 sans commencer à qualifier les scieries",
             "La phase 2 ouvre le 15/09/2026. Les contacts et diagnostics peuvent commencer maintenant."],
          ].map(([t,d])=>(
            <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
              borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
              <span style={{fontSize:14,flexShrink:0}}>🚫</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FLUX placeholder ── */}
      {tab==="flux"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_STOCKS_COPRODS.filter(s=>s.enlevement).sort((a,b)=>a.enlevement.localeCompare(b.enlevement)).map(s=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
            const enlev = new Date(s.enlevement);
            const urgent = enlev <= new Date(Date.now()+14*864e5);
            return (
              <div key={s.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                border:`1.5px solid ${urgent?"#FCA5A5":C.bd}`,
                display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{cat.ico}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                    {cat.l} · {s.stockTonnes} t · Humidité {s.humidite}%
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,
                    color:urgent?"#991B1B":"#1E40AF"}}>
                    {enlev.toLocaleDateString("fr-FR")}
                  </div>
                  {s.prixTonne>0&&(
                    <div style={{fontSize:10,color:C.tx3}}>
                      {(s.stockTonnes*s.prixTonne).toLocaleString("fr-FR")} €
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODULE PROJET FINANCÉ — SOCLE GÉNÉRIQUE
═══════════════════════════════════════════════════════════════ */
const ETAPES_PROJET = [
  {id:"diagnostic",  ico:"🔍", l:"Diagnostic initial"},
  {id:"depot",       ico:"📋", l:"Dépôt dossier"},
  {id:"decision",    ico:"⚖️", l:"Décision"},
  {id:"travaux",     ico:"🪓", l:"Travaux"},
  {id:"controle",    ico:"📸", l:"Contrôle"},
  {id:"volumes",     ico:"📦", l:"Volumes produits"},
  {id:"destinations",ico:"🔀", l:"Destinations"},
  {id:"resultats",   ico:"📈", l:"Résultats"},
];
const DEMO_PROJETS_FINANCES = [
  {
    id:"PRJ-2026-001-demo",
    nom:"Desserte parcelles Battet Nord",
    dispositif:"FEADER – Développement rural Grand Est",
    dateLimite:"2026-12-31",
    porteur:"SCIC Forêt de Tronçais",
    partenaires:["Commune de Tronçais","DDT Allier"],
    etapeActuelle:"travaux",
    depensesPrev:42000, depensesReelles:18500,
    parcelle:"B 112 / B 113",
    entreprise:"SARL Travaux Forestiers Allier",
    photosAvant:2, photosApres:1,
    volumesMobilises:280, coproduits:"Plaquettes 45 t",
    debouches:"Chaufferie intercommunale Moulins",
    indicateursFinanceur:"Surface desservie (ha), Tonnage mobilisé, Emplois créés",
    statut:"en_cours",
    piecesOk:["Devis signé","Plan de situation","Extrait cadastral"],
    piecesManquantes:["Attestation assurance maîtrise d'ouvrage","PV de réception travaux"],
  },
  {
    id:"PRJ-2026-002-demo",
    nom:"Traçabilité coproduits scierie Moreau",
    dispositif:"FEADER – Première transformation Grand Est",
    dateLimite:"2026-12-31",
    porteur:"Scierie Moreau SAS",
    partenaires:["ALTEGAD SAS","Région Grand Est"],
    etapeActuelle:"diagnostic",
    depensesPrev:28000, depensesReelles:0,
    parcelle:"Site industriel Moulins",
    entreprise:"ALTEGAD SAS",
    photosAvant:0, photosApres:0,
    volumesMobilises:0, coproduits:"À qualifier",
    debouches:"À définir",
    indicateursFinanceur:"Volumes connexes tracés, Humidité mesurée, Destinations qualifiées",
    statut:"preparation",
    piecesOk:["Statuts entreprise","Bilan N-1"],
    piecesManquantes:["Devis prestataire numérique","Plan de financement","Attestation expert-comptable"],
  },
];

export const SectionProjetFinance = () => {
  const [tab,    setTab]    = useState("liste");
  const [selId,  setSelId]  = useState(null);
  const _proj = selId ? DEMO_PROJETS_FINANCES.find(p=>p.id===selId) : null;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            📐 Projets financés
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Socle générique · Dispositif → Parcelle → Travaux → Volumes → Résultats
          </div>
        </div>
        <button style={{padding:"10px 18px",borderRadius:12,background:"#7C3AED",border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau projet
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📐",l:"Projets",           v:DEMO_PROJETS_FINANCES.length,          col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Dépenses prév.",    v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesPrev,0)/1000).toFixed(0)} k€`,col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"✅",l:"Dép. réelles",      v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesReelles,0)/1000).toFixed(0)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📋",l:"Pièces manquantes", v:DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.piecesManquantes.length,0),col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["liste","📋","Projets"],["parcours","🗺️","Parcours type"],
          ["indicateurs","📊","Indicateurs financeur"],["socle","⚙️","Socle générique"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE PROJETS ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {DEMO_PROJETS_FINANCES.map(p=>{
            const etapeIdx = ETAPES_PROJET.findIndex(e=>e.id===p.etapeActuelle);
            const pctAvancement = Math.round((etapeIdx+1)/ETAPES_PROJET.length*100);
            const isOpen = selId===p.id;
            const nbManq = p.piecesManquantes.length;
            return (
              <div key={p.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${nbManq>0?"#FCA5A5":"#A5B4FC"}`}}>
                <div onClick={()=>setSelId(isOpen?null:p.id)}
                  style={{padding:"14px",cursor:"pointer",
                    display:"flex",flexDirection:"column",gap:8,
                    background:isOpen?"#F5F3FF":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#7C3AED"}}>
                          {p.id}
                        </span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:p.statut==="en_cours"?"#D1FAE5":"#DBEAFE",
                          color:p.statut==="en_cours"?"#065F46":"#1E40AF"}}>
                          {p.statut==="en_cours"?"En cours":"En préparation"}
                        </span>
                        {nbManq>0&&(
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:"#FEE2E2",color:"#991B1B"}}>
                            ⚠️ {nbManq} pièce{nbManq>1?"s":""} manquante{nbManq>1?"s":""}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:3}}>{p.nom}</div>
                      <div style={{fontSize:11,color:"#5B21B6",fontWeight:600}}>{p.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {p.porteur} · 📅 {new Date(p.dateLimite).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>{pctAvancement}%</div>
                      <div style={{fontSize:10,color:C.tx3}}>avancement</div>
                    </div>
                  </div>
                  {/* Barre progression pipeline */}
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:2,marginBottom:4}}>
                      {ETAPES_PROJET.map((e,i)=>(
                        <div key={e.id} style={{flex:1,height:5,borderRadius:3,
                          background:i<=etapeIdx?"#7C3AED":"#E5E7EB"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:"#7C3AED",fontWeight:700}}>
                      {ETAPES_PROJET[etapeIdx]?.ico} {ETAPES_PROJET[etapeIdx]?.l}
                    </div>
                  </div>
                </div>

                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA",
                    display:"flex",flexDirection:"column",gap:12}}>

                    {/* Infos générales */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["📍 Parcelle/site",p.parcelle],
                        ["🏢 Entreprise",p.entreprise],
                        ["💶 Dépenses prév.",`${p.depensesPrev.toLocaleString("fr-FR")} €`],
                        ["✅ Dépenses réelles",`${p.depensesReelles.toLocaleString("fr-FR")} €`],
                        ["📸 Photos avant",`${p.photosAvant}`],
                        ["📸 Photos après",`${p.photosApres}`],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Résultats */}
                    {(p.volumesMobilises>0||p.coproduits!=="À qualifier")&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                        {[
                          ["📦 Volumes mobilisés",p.volumesMobilises>0?`${p.volumesMobilises} m³`:"—"],
                          ["♻️ Coproduits",p.coproduits],
                          ["🔀 Débouchés",p.debouches],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:"#F0FDF4",borderRadius:8,padding:"8px 10px",
                            border:"1px solid #86EFAC"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:11,fontWeight:700,color:"#065F46"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pièces */}
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>
                        📋 Pièces justificatives
                      </div>
                      {p.piecesOk.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#065F46"}}>
                          <span>✅</span>{pc}
                        </div>
                      ))}
                      {p.piecesManquantes.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#991B1B",fontWeight:600}}>
                          <span>⏳</span>{pc}
                        </div>
                      ))}
                    </div>

                    {/* Indicateurs financeur */}
                    <div style={{background:"#EDE9FE",borderRadius:8,padding:"10px 12px",
                      border:"1px solid #C4B5FD"}}>
                      <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:4}}>
                        📊 Indicateurs exigés par le financeur
                      </div>
                      <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.6}}>
                        {p.indicateursFinanceur}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PARCOURS TYPE ── */}
      {tab==="parcours"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>
            Parcours générique — Projet financé APPLITAG
          </div>
          {ETAPES_PROJET.map((e,i)=>(
            <div key={e.id} style={{display:"flex",gap:14,alignItems:"flex-start",
              padding:"12px 14px",borderRadius:12,background:"#fff",
              border:"1.5px solid #A5B4FC"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#7C3AED",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:900,fontSize:14,flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:20,flexShrink:0,marginTop:6}}>{e.ico}</span>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>{e.l}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:3}}>
                  {[
                    "Parcelle, surface, état initial, essences, volumes estimés",
                    "Dispositif, date limite, porteur, partenaires, budget prévisionnel, pièces",
                    "Acte attributif, montant accordé, conditions",
                    "Entreprise, planning, dépenses réelles, photos en cours",
                    "Photos avant/après, mesures, PV réception",
                    "Tonnage mobilisé, essence, humidité, qualité",
                    "Matière / Énergie, clients, enlèvements, prix",
                    "Bilan économique, indicateurs financeur, rapport final",
                  ][i]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INDICATEURS ── */}
      {tab==="indicateurs"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
            Indicateurs clés exigés par les financeurs (socle commun)
          </div>
          {[
            {grp:"Foncier & territoire",items:["Surface bénéficiaire (ha)","Parcelles cadastrées","Communes concernées"]},
            {grp:"Travaux",items:["Linéaire de desserte créé/réhabilité (ml)","Entreprise et heures travaillées","Dépenses vérifiées (€ HT)"]},
            {grp:"Production",items:["Volume mobilisé (m³ et t)","Essences et qualités","Humidité mesurée (%)"]},
            {grp:"Valorisation",items:["Destination matière vs énergie","Prix de vente / tonne","Marge nette / tonne","Clients et circuits"]},
            {grp:"Impact",items:["Emplois créés ou maintenus","Réduction transport (km)","Émissions GES évitées (tCO₂eq)"]},
          ].map(g=>(
            <div key={g.grp} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:6}}>
                {g.grp}
              </div>
              {g.items.map(it=>(
                <div key={it} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                  fontSize:11,color:C.tx}}>
                  <span style={{color:"#7C3AED",flexShrink:0}}>▶</span>{it}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── SOCLE GÉNÉRIQUE ── */}
      {tab==="socle"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#EDE9FE",borderRadius:12,padding:"14px",
            border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              ⚙️ Principe — Socle générique + modèles paramétrables
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7}}>
              Construire un socle commun de gestion des projets financés, puis ajouter des
              <strong> modèles paramétrables par dispositif</strong>.
              Un module différent par aide produirait une application lourde et rapidement obsolète.
            </div>
          </div>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Impact commercial — 6 types d'utilisateurs servis par un seul module
            </div>
            {[
              ["🌲","Propriétaires forestiers","Desserte, travaux, valorisation"],
              ["🏭","Scieries",               "Traçabilité, coproduits, FEADER"],
              ["🏛️","Collectivités",           "Aménagement, DFCI, subventions"],
              ["📐","Bureaux d'études",        "Diagnostic, suivi, reporting"],
              ["💶","Financeurs",              "Indicateurs, pièces, contrôle"],
              ["🔥","Fournisseurs bois-énergie","Volumes, qualité, destinations"],
            ].map(([ico,t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{t}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
