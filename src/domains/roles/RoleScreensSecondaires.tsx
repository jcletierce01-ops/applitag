// @ts-nocheck
import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { apiGet } from "../../services/api.service.js";

// ── GESTIONNAIRE FORESTIER ──────────────────────────────────────────
// Vue: parcelles + chantiers liés + lots en gestion

const GESTIONNAIRE_PARCELLES = [
  {id:"PARC-001",label:"Forêt de Tronçais — Parcelle 18",commune:"Tronçais (03360)",
   surface:8.4,essence:"Chêne/Charme",proprietaire:"M. Gallet Bernard",
   dernierPassage:"2026-07-21",chantiers:["CH-2026-14"],lots:["LOT-2026-044","LOT-2026-041"],
   statut:"chantier_en_cours",notes:"Coupe de taillis — suivi contrat 2026"},
  {id:"PARC-002",label:"Bocage Nord — Haies",commune:"Cérilly (03350)",
   surface:3.1,essence:"Charme/Noisetier",proprietaire:"Mme Renard Claire",
   dernierPassage:"2026-07-18",chantiers:["CH-2026-12"],lots:["LOT-2026-038"],
   statut:"terminé",notes:"Broyage bocager terminé — reboisement à planifier 2027"},
  {id:"PARC-003",label:"Parcelle Ternant — Douglas",commune:"Ternant (58)",
   surface:5.7,essence:"Douglas",proprietaire:"GFA Ternant",
   dernierPassage:"2026-07-14",chantiers:["CH-2026-11"],lots:["LOT-2026-042"],
   statut:"chantier_en_cours",notes:"Éclaircie mécanique en cours — prochaine visite à planifier"},
  {id:"PARC-004",label:"Tronçais Sud — Pin sylvestre",commune:"Tronçais (03360)",
   surface:12.2,essence:"Pin sylvestre",proprietaire:"M. Dubois René",
   dernierPassage:"2026-06-28",chantiers:["CH-2026-09"],lots:["LOT-2026-033","LOT-2026-034"],
   statut:"terminé",notes:"Coupe rase terminée — plan de reboisement déposé DRAAF"},
];

const STATUT_PARC = {
  chantier_en_cours:{label:"Chantier en cours",icon:"🔨",col:"#B45309",bg:"#FEF3C7"},
  planifié:         {label:"Chantier planifié",icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  terminé:          {label:"Terminé",          icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  libre:            {label:"Libre",            icon:"🌿",col:"#6B7280",bg:"#F3F4F6"},
};

export const EcranRoleGestionnaire = (_props: any) => {
  const [selected, setSelected] = useState<string|null>(null);
  const [parcelles, setParcelles] = useState<any[]>(GESTIONNAIRE_PARCELLES);
  useEffect(() => {
    apiGet('/parcelles-gestionnaire').then((r: any) => { if (Array.isArray(r) && r.length>0) setParcelles(r); }).catch(() => {});
  }, []);

  const parc = selected ? parcelles.find((p: any)=>p.id===selected) : null;

  if (parc) {
    const st = STATUT_PARC[parc.statut as keyof typeof STATUT_PARC]||STATUT_PARC.libre;
    return (
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",
          color:"#1E5B3A",fontSize:13,cursor:"pointer",padding:"0 0 14px",fontFamily:"inherit",
          display:"flex",alignItems:"center",gap:6}}>
          ← Retour aux parcelles
        </button>
        <div style={{background:C.bg,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:800,color:C.tx,flex:1}}>{parc.label}</div>
            <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,
              background:st.bg,color:st.col,flexShrink:0}}>{st.icon} {st.label}</span>
          </div>
          {[
            ["Propriétaire",parc.proprietaire],
            ["Commune",parc.commune],
            ["Surface",parc.surface+" ha"],
            ["Essence(s)",parc.essence],
            ["Dernier passage",new Date(parc.dernierPassage).toLocaleDateString("fr-FR")],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,
              paddingBottom:5,marginBottom:5,fontSize:12}}>
              <span style={{color:C.tx3,minWidth:130,flexShrink:0}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}
          {parc.notes&&(
            <div style={{marginTop:8,background:"#F0FDF4",borderRadius:8,padding:10,
              fontSize:11,color:"#065F46",border:"1px solid #BBF7D0"}}>
              📝 {parc.notes}
            </div>
          )}
        </div>

        <div style={{marginBottom:10,fontSize:11,fontWeight:700,color:C.tx}}>
          🔨 Chantiers liés ({parc.chantiers.length})
        </div>
        {(parc.chantiers||[]).map((cid: any)=>(
          <div key={cid} style={{background:C.bg,borderRadius:10,padding:"9px 12px",
            marginBottom:6,fontSize:11,border:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🔨</span>
            <span style={{fontWeight:600,color:C.tx}}>{cid}</span>
          </div>
        ))}
        <div style={{marginTop:10,marginBottom:10,fontSize:11,fontWeight:700,color:C.tx}}>
          📦 Lots en gestion ({parc.lots.length})
        </div>
        {(parc.lots||[]).map((lid: any)=>(
          <div key={lid} style={{background:C.bg,borderRadius:10,padding:"9px 12px",
            marginBottom:6,fontSize:11,border:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>📦</span>
            <span style={{fontWeight:600,color:C.tx}}>{lid}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:C.tx}}>🌲 Gestionnaire forestier</div>
        <div style={{fontSize:12,color:C.tx2}}>Parcelles, chantiers et lots en gestion</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🌳",label:"Parcelles",val:parcelles.length,col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"🔨",label:"En cours",val:parcelles.filter((p: any)=>p.statut==="chantier_en_cours").length,col:"#B45309",bg:"#FEF3C7"},
          {ico:"📦",label:"Lots gérés",val:parcelles.reduce((s,p: any)=>s+(p.lots||[]).length,0),col:"#0369A1",bg:"#DBEAFE"},
        ].map(kpi=>(
          <div key={kpi.label} style={{background:kpi.bg,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:18}}>{kpi.ico}</div>
            <div style={{fontSize:18,fontWeight:900,color:kpi.col}}>{kpi.val}</div>
            <div style={{fontSize:9,color:kpi.col}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Liste parcelles */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {parcelles.map((p: any)=>{
          const st = STATUT_PARC[p.statut as keyof typeof STATUT_PARC]||STATUT_PARC.libre;
          return (
            <div key={p.id} onClick={()=>setSelected(p.id)}
              style={{background:C.bg,borderRadius:12,padding:"12px 14px",cursor:"pointer",
                border:`1px solid ${C.bd}`,display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{fontSize:22,flexShrink:0}}>🌲</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{p.label}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>
                  📍 {p.commune} · {p.surface} ha · {p.essence}
                </div>
                <div style={{fontSize:10,color:C.tx2}}>👤 {p.proprietaire}</div>
                <div style={{display:"flex",gap:8,marginTop:5,fontSize:10,color:C.tx3}}>
                  <span>🔨 {p.chantiers.length} chantier(s)</span>
                  <span>📦 {p.lots.length} lot(s)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── SCIERIE / INDUSTRIE DU BOIS ─────────────────────────────────
// Vue mobile : coproduits disponibles + enlèvements du jour

const SCIERIE_COPRODS_DEMO = [
  {id:"cp1",ref:"GR-2026-001",type:"Sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",ref:"GR-2026-001",type:"Écorces",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",ref:"GR-2026-002",type:"Plaquettes",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",ref:"GR-2026-002",type:"Dosses/chutes",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
];
const SCIERIE_ENLEVS_DEMO = [
  {id:"e1",date:"2026-09-06",client:"Chaufferie Communale Épinal",type:"Plaquettes",qte:6.5,prix:28,transporteur:"Camion Rossi",statut:"livré"},
];

const COPROD_STATUT = {
  disponible:{label:"Disponible",col:"#065F46",bg:"#D1FAE5"},
  vendu:     {label:"Vendu",     col:"#6B7280",bg:"#F3F4F6"},
  reservé:   {label:"Réservé",   col:"#1E40AF",bg:"#DBEAFE"},
};

export const EcranRoleScierie = (_props: any) => {
  const [onglet,    setOnglet]    = useState<"coprods"|"enlevements">("coprods");
  const [coprods,   setCoprods]   = useState<any[]>(SCIERIE_COPRODS_DEMO);
  const [enlevs,    setEnlevs]    = useState<any[]>(SCIERIE_ENLEVS_DEMO);

  useEffect(() => {
    apiGet('/coprods-scierie').then((r: any) => { if (Array.isArray(r) && r.length>0) setCoprods(r); }).catch(() => {});
    apiGet('/enlevements-scierie').then((r: any) => { if (Array.isArray(r) && r.length>0) setEnlevs(r); }).catch(() => {});
  }, []);

  const dispo = coprods.filter((c: any)=>c.statut==="disponible");
  const qteDispoT = dispo.reduce((s: any,c: any)=>s+c.qte,0);

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:C.tx}}>🏭 Scierie — Coproduits</div>
        <div style={{fontSize:12,color:C.tx2}}>Gestion des coproduits bois et enlèvements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        <div style={{background:"#D1FAE5",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:"#065F46"}}>{dispo.length}</div>
          <div style={{fontSize:9,color:"#065F46",fontWeight:600}}>Coproduits disponibles</div>
        </div>
        <div style={{background:"#DBEAFE",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>{qteDispoT.toFixed(1)} t</div>
          <div style={{fontSize:9,color:"#1E40AF",fontWeight:600}}>Volume disponible</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.bd}`,paddingBottom:6}}>
        {([["coprods","♻️ Coproduits"],["enlevements","🚛 Enlèvements"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {onglet==="coprods"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {coprods.map((cp: any)=>{
            const st = COPROD_STATUT[cp.statut as keyof typeof COPROD_STATUT]||COPROD_STATUT.disponible;
            return (
              <div key={cp.id} style={{background:C.bg,borderRadius:12,padding:"11px 13px",
                border:`1px solid ${C.bd}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:800,color:C.tx}}>♻️ {cp.type}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.label}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:C.tx2}}>
                  <span>📦 {cp.qte} t</span>
                  <span>💧 H = {cp.humidite}%</span>
                  <span>📬 {cp.destination}</span>
                  <span>🔗 {cp.ref}</span>
                  {cp.prix>0&&<span>💶 {cp.prix} €/t</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onglet==="enlevements"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {enlevs.map((e: any)=>(
            <div key={e.id} style={{background:C.bg,borderRadius:12,padding:"11px 13px",
              border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:800,color:C.tx}}>🚛 {e.type}</span>
                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                  background:"#D1FAE5",color:"#065F46"}}>{e.statut}</span>
              </div>
              <div style={{fontSize:10,color:C.tx2,display:"flex",flexDirection:"column",gap:2}}>
                <span>👤 {e.client}</span>
                <span>📦 {e.qte} t · {e.prix > 0 ? e.prix+" €/t" : "gratuit"}</span>
                <span>🚚 {e.transporteur}</span>
                <span>📅 {new Date(e.date).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          ))}
          {enlevs.length===0&&(
            <div style={{padding:24,textAlign:"center",color:C.tx3,fontSize:13}}>
              Aucun enlèvement enregistré aujourd'hui.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── COLLECTIVITÉ TERRITORIALE ──────────────────────────────────
const COLLECTIVITE_DEMO = {
  nom: "Moulins Communauté (CC Allier Nord)",
  territoire: "Allier (03)",
  nbCommunes: 32,
  chaufferies: [
    {id:"CF-MC-01",label:"Chaufferie Moulins Centre",puissanceMW:12,
     consoAnnuelT:1450,energieMWh:6900,certif:"SBP",ghgEco:89,coutTonne:97,statut:"en_service",
     fournisseurs:["ALTEGAD SAS","Bois Énergie Allier"]},
    {id:"CF-MC-02",label:"Chaufferie Moulins Nord",puissanceMW:6,
     consoAnnuelT:720,energieMWh:3350,certif:"SBP",ghgEco:87,coutTonne:101,statut:"en_service",
     fournisseurs:["ALTEGAD SAS"]},
    {id:"CF-MC-03",label:"Chaufferie Yzeure",puissanceMW:4,
     consoAnnuelT:480,energieMWh:2210,certif:"SURE",ghgEco:85,coutTonne:93,statut:"maintenance",
     fournisseurs:["Bois Énergie Allier"]},
  ],
};

export const EcranRoleCollectivite = (_props: any) => {
  const [onglet, setOnglet] = useState<"synthese"|"chaufferies"|"conformite">("synthese");
  const [data, setData]     = useState(COLLECTIVITE_DEMO);

  useEffect(() => {
    apiGet('/chaufferies').then((r: any) => {
      if (Array.isArray(r) && r.length > 0) setData(d => ({...d, chaufferies: r}));
    }).catch(() => {});
  }, []);

  const demo = data;
  const totalT   = demo.chaufferies.reduce((s,c: any)=>s+c.consoAnnuelT,0);
  const totalMWh = demo.chaufferies.reduce((s,c: any)=>s+c.energieMWh,0);
  const avgCout  = Math.round(demo.chaufferies.reduce((s,c: any)=>s+c.coutTonne,0)/demo.chaufferies.length);
  const avgGhg   = Math.round(demo.chaufferies.reduce((s,c: any)=>s+c.ghgEco,0)/demo.chaufferies.length);

  const KPIS = [
    {icon:"🔥",val:demo.chaufferies.length,label:"Chaufferies"},
    {icon:"🌲",val:(totalT/1000).toFixed(1)+"k t",label:"Conso annuelle"},
    {icon:"⚡",val:(totalMWh/1000).toFixed(1)+" GWh",label:"Énergie produite"},
    {icon:"💶",val:avgCout+" €/t",label:"Coût moyen"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:"inherit"}}>

      {/* Header */}
      <div style={{background:"#065F46",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🏛️ Collectivité · {demo.territoire}</div>
        <div style={{fontSize:17,fontWeight:800,lineHeight:1.2}}>{demo.nom}</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>{demo.nbCommunes} communes · {demo.chaufferies.length} chaufferies biomasse</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {KPIS.map((k,i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{k.icon}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#065F46"}}>{k.val}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["synthese","📊 Synthèse"],["chaufferies","🔥 Chaufferies"],["conformite","🌿 RED/GES"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{
            flex:1,padding:"11px 4px",border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #065F46":"3px solid transparent",
            color:onglet===k?"#065F46":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>

        {/* Synthèse */}
        {onglet==="synthese"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>📈 Bilan territorial annuel</div>
              {demo.chaufferies.map(cf=>(
                <div key={cf.id} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                    <span style={{fontWeight:600,color:C.tx}}>{cf.label}</span>
                    <span style={{color:C.tx3}}>{cf.consoAnnuelT} t</span>
                  </div>
                  <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,background:"#059669",
                      width:`${Math.round(cf.consoAnnuelT/totalT*100)}%`}}/>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:2}}>
                    {Math.round(cf.consoAnnuelT/totalT*100)}% · {cf.energieMWh} MWh · {cf.coutTonne} €/t
                  </div>
                </div>
              ))}
              <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:10,marginTop:4,
                display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700}}>
                <span>Total</span>
                <span>{totalT.toLocaleString("fr-FR")} t · {(totalMWh/1000).toFixed(1)} GWh</span>
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:8}}>🌿 Impact carbone moyen</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:28,fontWeight:900,color:"#059669"}}>{avgGhg}<span style={{fontSize:14}}>%</span></div>
                  <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>Économie GES</div>
                  <div style={{fontSize:9,color:C.tx3}}>vs. fossile</div>
                </div>
                <div style={{flex:1,fontSize:11,color:C.tx2,lineHeight:1.6}}>
                  Économie de {Math.round(totalT*avgGhg/100*0.265)} tCO₂ vs. combustible fossile. Conforme au seuil RED III (≥ 70 %).
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chaufferies */}
        {onglet==="chaufferies"&&demo.chaufferies.map(cf=>(
          <div key={cf.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${cf.statut==="en_service"?"#059669":"#D97706"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontWeight:800,fontSize:13,color:C.tx}}>{cf.label}</div>
              <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                background:cf.statut==="en_service"?"#D1FAE5":"#FEF3C7",
                color:cf.statut==="en_service"?"#065F46":"#92400E"}}>
                {cf.statut==="en_service"?"✅ En service":"⚠️ Maintenance"}
              </span>
            </div>
            {([
              ["⚡","Puissance",`${cf.puissanceMW} MW`],
              ["🌲","Conso annuelle",`${cf.consoAnnuelT.toLocaleString("fr-FR")} t`],
              ["💡","Énergie",`${cf.energieMWh.toLocaleString("fr-FR")} MWh`],
              ["💶","Coût moyen",`${cf.coutTonne} €/t`],
              ["📜","Certification",cf.certif],
            ] as [string,string,string][]).map(([ic,lb,v])=>(
              <div key={lb} style={{display:"flex",justifyContent:"space-between",
                fontSize:11,paddingBlock:4,borderBottom:`1px solid ${C.bd}`}}>
                <span style={{color:C.tx2}}>{ic} {lb}</span>
                <span style={{fontWeight:600,color:C.tx}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:10,color:C.tx3}}>
              Fournisseurs : {cf.fournisseurs.join(", ")}
            </div>
          </div>
        ))}

        {/* Conformité RED */}
        {onglet==="conformite"&&(
          <>
            <div style={{background:"#D1FAE5",borderRadius:12,padding:12,
              border:"1px solid #6EE7B7",fontSize:11,color:"#065F46",lineHeight:1.6}}>
              🇪🇺 <strong>Directive RED III</strong> — Seuil GES ≥ 70 % pour installations &gt; 5 MW.
              Toutes les chaufferies de la CC dépassent ce seuil.
            </div>
            {demo.chaufferies.map(cf=>(
              <div key={cf.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>{cf.label}</div>
                {([
                  ["🌿","Économie GES",`${cf.ghgEco} %`,"#059669"],
                  ["📜","Système certif.",cf.certif,"#0369A1"],
                  ["⚖️","Statut RED III",cf.ghgEco>=70?"✅ Conforme":"❌ Non conforme",cf.ghgEco>=70?"#059669":"#DC2626"],
                ] as [string,string,string,string][]).map(([ic,lb,v,col])=>(
                  <div key={lb} style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,paddingBlock:4,borderBottom:`1px solid ${C.bd}`}}>
                    <span style={{color:C.tx2}}>{ic} {lb}</span>
                    <span style={{fontWeight:700,color:col}}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ── BUREAU D'ÉTUDES / INGÉNIERIE FORESTIÈRE ───────────────────
const BET_ETUDES_DEMO = [
  {id:"ET-001",label:"Plan de gestion — Forêt de Tronçais (03)",client:"GFA Tronçais",
   surface:245,essence:"Chêne/Pin sylvestre",statut:"en_cours",
   dateDebut:"2026-06-01",dateFin:"2026-12-15",avancement:62,
   certifVise:"PEFC",notes:"Phase 2 — inventaires dendrométriques terminés"},
  {id:"ET-002",label:"Étude éligibilité RED — Chaufferie Moulins",client:"CC Moulins Communauté",
   surface:null,essence:null,statut:"en_cours",
   dateDebut:"2026-08-01",dateFin:"2026-09-30",avancement:85,
   certifVise:"SBP",notes:"Vérification traçabilité amont — SURE vs SBP"},
  {id:"ET-003",label:"Diagnostic bocager — Cérilly",client:"Commune de Cérilly (03)",
   surface:48,essence:"Charme/Noisetier",statut:"livré",
   dateDebut:"2026-04-01",dateFin:"2026-06-30",avancement:100,
   certifVise:null,notes:"Rapport remis — suivi plantations à prévoir 2027"},
];
const BET_RAPPORTS_DEMO = [
  {id:"R-2026-08",titre:"Plan de gestion Tronçais — Phase 1",client:"GFA Tronçais",date:"2026-07-15",pages:34,format:"PDF"},
  {id:"R-2026-07",titre:"Rapport d'éligibilité PEFC — Bocage Vichy",client:"SAFER Allier",date:"2026-06-28",pages:18,format:"PDF"},
  {id:"R-2026-05",titre:"Étude desserte — Piste forestière nord",client:"ONF Allier",date:"2026-05-10",pages:12,format:"PDF+SIG"},
];

export const EcranRoleBET = (_props: any) => {
  const [onglet,  setOnglet]  = useState<"etudes"|"rapports"|"agenda">("etudes");
  const [etudes,  setEtudes]  = useState<any[]>(BET_ETUDES_DEMO);
  const [rapports,setRapports]= useState<any[]>(BET_RAPPORTS_DEMO);

  useEffect(() => {
    apiGet('/projets-bet').then((r: any) => { if (Array.isArray(r) && r.length>0) setEtudes(r); }).catch(() => {});
    apiGet('/rapports-bet').then((r: any) => { if (Array.isArray(r) && r.length>0) setRapports(r); }).catch(() => {});
  }, []);

  const enCours = etudes.filter((e: any)=>e.statut==="en_cours");
  const haTotal = etudes.filter((e: any)=>e.surface).reduce((s,e: any)=>s+(e.surface||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#1E40AF",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>📐 Bureau d'Études · Ingénierie forestière</div>
        <div style={{fontSize:17,fontWeight:800}}>FORÊT CONSEIL Auvergne</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Allier (03) · PEFC · SBP · SURE</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📋",enCours.length,"Études en cours"],["🌲",haTotal+" ha","Ha traités"],["📄",rapports.length,"Rapports"],["👥","12","Clients actifs"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1E40AF"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["etudes","📋 Études"],["rapports","📄 Rapports"],["agenda","📅 Agenda"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #1E40AF":"3px solid transparent",
            color:onglet===k?"#1E40AF":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="etudes"&&etudes.map((et: any)=>(
          <div key={et.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${et.statut==="livré"?"#6B7280":"#1E40AF"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontWeight:800,fontSize:12,color:C.tx,flex:1,paddingRight:8}}>{et.label}</div>
              <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                background:et.statut==="livré"?"#E5E7EB":"#DBEAFE",
                color:et.statut==="livré"?"#374151":"#1E40AF"}}>
                {et.statut==="livré"?"✅ Livré":"🔧 En cours"}
              </span>
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:8}}>👤 {et.client}{et.surface?` · 🌲 ${et.surface} ha`:""}</div>
            <div style={{background:C.bg,borderRadius:4,height:6,marginBottom:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"#1E40AF",width:`${et.avancement}%`}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.tx3}}>
              <span>{et.avancement}% avancé</span>
              {et.certifVise&&<span>🎯 Certif. : {et.certifVise}</span>}
            </div>
            {et.notes&&<div style={{fontSize:10,color:C.tx2,marginTop:6,fontStyle:"italic"}}>{et.notes}</div>}
          </div>
        ))}
        {onglet==="rapports"&&rapports.map((r: any)=>(
          <div key={r.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{r.titre}</div>
            <div style={{fontSize:11,color:C.tx3,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>👤 {r.client}</span>
              <span>📅 {new Date(r.date).toLocaleDateString("fr-FR")}</span>
              <span>📄 {r.pages} p. · {r.format}</span>
            </div>
          </div>
        ))}
        {onglet==="agenda"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📅 Prochaines visites terrain</div>
            {[
              {date:"2026-09-10",label:"Inventaire dendrométrique — Tronçais Est",duree:"journée"},
              {date:"2026-09-15",label:"Réunion restitution — CC Moulins",duree:"2h"},
              {date:"2026-09-22",label:"Visite terrain — Bocage Cérilly",duree:"demi-journée"},
            ].map((ev,i)=>(
              <div key={i} style={{display:"flex",gap:10,paddingBlock:8,
                borderBottom:i<2?`1px solid ${C.bd}`:"none"}}>
                <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#1E40AF",flexShrink:0}}>
                  {new Date(ev.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx}}>{ev.label}</div>
                  <div style={{fontSize:10,color:C.tx3}}>⏱ {ev.duree}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

