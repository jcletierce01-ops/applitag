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

// ── ETF — ENTREPRENEUR DE TRAVAUX FORESTIERS ──────────────────
const ETF_CHANTIERS_DEMO = [
  {id:"ETF-CH-01",label:"Abattage mécanique — Tronçais Est",commune:"Tronçais (03)",
   dateDebut:"2026-09-08",dateFin:"2026-09-19",machines:["Abatteuse Komatsu 931XC","Débardeur Ponsse"],
   essence:"Chêne",surfaceHa:12,volumeEstimeM3:380,statut:"en_cours",avancement:35,
   chef:"M. Bernard R.",contact:"06 12 34 56 78"},
  {id:"ETF-CH-02",label:"Broyage bocager — Cérilly Nord",commune:"Cérilly (03)",
   dateDebut:"2026-09-06",dateFin:"2026-09-10",machines:["Broyeur forestier Seppi M500"],
   essence:"Charme/Noisetier",surfaceHa:4.5,volumeEstimeM3:90,statut:"en_cours",avancement:70,
   chef:"Mme Dupont L.",contact:"06 98 76 54 32"},
];
const ETF_MATERIEL_DEMO = [
  {id:"M-01",label:"Abatteuse Komatsu 931XC",type:"Abattage",statut:"actif",chantier:"ETF-CH-01"},
  {id:"M-02",label:"Débardeur Ponsse Buffalo King",type:"Débardage",statut:"actif",chantier:"ETF-CH-01"},
  {id:"M-03",label:"Broyeur forestier Seppi M500",type:"Broyage",statut:"actif",chantier:"ETF-CH-02"},
  {id:"M-04",label:"Tracteur John Deere 6175R",type:"Polyvalent",statut:"disponible",chantier:null},
];

export const EcranRoleETF = (_props: any) => {
  const [onglet, setOnglet] = useState<"chantiers"|"planning"|"materiel">("chantiers");
  const [chantiers, setChantiers] = useState<any[]>(ETF_CHANTIERS_DEMO);
  const [materiel, setMateriel]   = useState<any[]>(ETF_MATERIEL_DEMO);
  useEffect(() => {
    apiGet('/chantiers-etf').then((r: any) => { if (Array.isArray(r) && r.length>0) setChantiers(r); }).catch(() => {});
    apiGet('/materiel-etf').then((r: any)  => { if (Array.isArray(r) && r.length>0) setMateriel(r);  }).catch(() => {});
  }, []);
  const totalM3 = chantiers.reduce((s,c: any)=>s+Math.round((c.volumeEstimeM3||0)*(c.avancement||0)/100),0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#78350F",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🌲 ETF · Travaux forestiers</div>
        <div style={{fontSize:17,fontWeight:800}}>ETF BOIS SERVICE Allier</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Abattage · Débardage · Broyage bocager</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["🪓",chantiers.length,"Chantiers actifs"],["📦",totalM3+" m³","Produits (estim.)"],["👥","6","Équipe"],["🚜",materiel.length,"Machines"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#78350F"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["chantiers","🪓 Chantiers"],["planning","📅 Planning"],["materiel","🚜 Matériel"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #78350F":"3px solid transparent",
            color:onglet===k?"#78350F":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="chantiers"&&chantiers.map((ch: any)=>(
          <div key={ch.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:"4px solid #78350F",padding:14}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:4,color:C.tx}}>{ch.label}</div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:8}}>📍 {ch.commune} · 🌿 {ch.essence} · {ch.surfaceHa} ha</div>
            <div style={{background:C.bg,borderRadius:4,height:6,marginBottom:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"#78350F",width:`${ch.avancement}%`}}/>
            </div>
            <div style={{fontSize:9,color:C.tx3,marginBottom:8}}>{ch.avancement}% · ~{ch.volumeEstimeM3} m³ estimés</div>
            <div style={{fontSize:10,color:C.tx2,display:"flex",flexDirection:"column",gap:2}}>
              <span>👤 Chef : {ch.chef} · 📞 {ch.contact}</span>
              <span>🚜 {ch.machines.join(" · ")}</span>
              <span>📅 {new Date(ch.dateDebut).toLocaleDateString("fr-FR")} → {new Date(ch.dateFin).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        ))}
        {onglet==="planning"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📅 Semaine S36 — sept. 2026</div>
            {chantiers.map((ch: any)=>(
              <div key={ch.id} style={{paddingBlock:8,borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,marginBottom:2}}>{ch.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>📅 Fin prévue : {new Date(ch.dateFin).toLocaleDateString("fr-FR")} · {ch.avancement}% ✓</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>🚜 {(ch.machines||[])[0]}</div>
              </div>
            ))}
            <div style={{paddingTop:10,fontSize:11,color:"#1E40AF",fontWeight:600}}>
              📋 Prochain chantier : Ternant (58) — démarrage 22 sept.
            </div>
          </div>
        )}
        {onglet==="materiel"&&materiel.map((m: any)=>(
          <div key={m.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${m.statut==="actif"?"#059669":"#6B7280"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:C.tx}}>{m.label}</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>🔧 {m.type}</div>
              </div>
              <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                background:m.statut==="actif"?"#D1FAE5":"#F3F4F6",
                color:m.statut==="actif"?"#065F46":"#6B7280"}}>
                {m.statut==="actif"?"⚙️ En chantier":"✅ Disponible"}
              </span>
            </div>
            {m.chantier&&<div style={{fontSize:10,color:C.tx2,marginTop:6}}>Sur : {(chantiers.find((c: any)=>c.id===m.chantier) as any)?.label||m.chantier}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ASSOCIATION / INTERPROFESSION ─────────────────────────────
const ASSO_MEMBRES_DEMO = [
  {id:"M-01",nom:"ALTEGAD SAS",type:"Négociant-gestionnaire",lots:48,statut:"adhérent"},
  {id:"M-02",nom:"Bois Énergie Allier",type:"Négociant",lots:31,statut:"adhérent"},
  {id:"M-03",nom:"ETF BOIS SERVICE",type:"ETF",lots:0,statut:"adhérent"},
  {id:"M-04",nom:"CC Moulins Communauté",type:"Collectivité",lots:0,statut:"adhérent"},
  {id:"M-05",nom:"Chaufferie Clermont-Ferrand",type:"Chaufferie",lots:0,statut:"adhérent"},
  {id:"M-06",nom:"GFA Tronçais",type:"Propriétaire forestier",lots:22,statut:"observateur"},
];

export const EcranRoleAssociation = (_props: any) => {
  const [onglet, setOnglet] = useState<"membres"|"ressources"|"activite">("membres");
  const [membres, setMembres] = useState<any[]>(ASSO_MEMBRES_DEMO);
  useEffect(() => {
    apiGet('/membres-asso').then((r: any) => { if (Array.isArray(r) && r.length>0) setMembres(r); }).catch(() => {});
  }, []);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#0369A1",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🤝 Interprofession filière bois-énergie</div>
        <div style={{fontSize:17,fontWeight:800}}>FIBOIS Auvergne — Délégation Allier</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>{membres.length} membres · Allier (03) · AURA</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["🤝",membres.length,"Membres"],["🌲","28.4k t","Tonnage suivi"],["🗺️","186k ha","Forêt territoire"],["📅","6","Événements 2026"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#0369A1"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["membres","🤝 Membres"],["ressources","📋 Ressources"],["activite","📈 Activité"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #0369A1":"3px solid transparent",
            color:onglet===k?"#0369A1":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {onglet==="membres"&&membres.map((m: any)=>(
          <div key={m.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:C.tx}}>{m.nom}</div>
              <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{m.type}{m.lots>0?` · ${m.lots} lots`:""}</div>
            </div>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
              background:m.statut==="adhérent"?"#DBEAFE":"#F3F4F6",
              color:m.statut==="adhérent"?"#1E40AF":"#6B7280"}}>
              {m.statut}
            </span>
          </div>
        ))}
        {onglet==="ressources"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📋 Ressources partagées</div>
            {[
              {ic:"📊",titre:"Tableau de bord filière Allier 2026",type:"Rapport",date:"2026-07-01"},
              {ic:"⚖️","titre":"Guide conformité RED III — biomasse forestière",type:"Guide",date:"2026-05-15"},
              {ic:"🗺️",titre:"Cartographie ressources bois-énergie 03",type:"SIG",date:"2026-03-20"},
              {ic:"📋",titre:"Modèle plan d'approvisionnement SBP",type:"Template",date:"2026-01-10"},
            ].map((r,i)=>(
              <div key={i} style={{paddingBlock:8,borderBottom:i<3?`1px solid ${C.bd}`:"none",
                display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>{r.ic}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx}}>{r.titre}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{r.type} · {new Date(r.date).toLocaleDateString("fr-FR",{month:"short",year:"numeric"})}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {onglet==="activite"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📈 Statistiques filière 2026</div>
              {[
                ["🌲","Tonnage mobilisé","28 420 t"],
                ["⚡","Énergie produite","132 GWh"],
                ["🌿","Économie GES","87 %"],
                ["💶","Prix moyen","96 €/t"],
                ["🪓","ETF actifs","12 entreprises"],
                ["🔥","Chaufferies suivies","18 sites"],
              ].map(([ic,lb,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  paddingBlock:5,borderBottom:i<5?`1px solid ${C.bd}`:"none"}}>
                  <span style={{color:C.tx2}}>{ic} {lb}</span>
                  <span style={{fontWeight:700,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#DBEAFE",borderRadius:12,padding:12,
              border:"1px solid #93C5FD",fontSize:11,color:"#1E40AF",lineHeight:1.6}}>
              📅 <strong>Prochain événement</strong> — Journée filière bois-énergie Allier<br/>
              18 septembre 2026 · Moulins · 9h–17h
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── INSTITUTIONNEL — DDT / DRAAF / COLLECTIVITÉ PUBLIQUE ──────
const INSTIT_DOSSIERS_DEMO = [
  {id:"DOS-2026-041",titre:"Déclaration coupe rase — GFA Tronçais",surface:24,commune:"Tronçais (03)",
   statut:"instruit",dateDepot:"2026-07-12",essence:"Chêne",type:"coupe_rase",délai:"30j"},
  {id:"DOS-2026-038",titre:"PSG validé — Forêt communale Cérilly",surface:145,commune:"Cérilly (03)",
   statut:"validé",dateDepot:"2026-06-28",essence:"Mixte",type:"psg",délai:null},
  {id:"DOS-2026-035",titre:"Défrichement — Projet éolien Ternant",surface:4.2,commune:"Ternant (58)",
   statut:"refusé",dateDepot:"2026-05-15",essence:"Pin sylvestre",type:"defrichement",délai:null},
  {id:"DOS-2026-029",titre:"Boisement compensateur — Voie ferrée",surface:8,commune:"Moulins (03)",
   statut:"en_instruction",dateDepot:"2026-04-03",essence:"Feuillus",type:"boisement",délai:"60j"},
];
const STATUT_INSTIT_COLOR: Record<string,{bg:string,tx:string,lbl:string}> = {
  instruit:      {bg:"#FEF9C3",tx:"#92400E",lbl:"📋 En instruction"},
  validé:        {bg:"#D1FAE5",tx:"#065F46",lbl:"✅ Validé"},
  refusé:        {bg:"#FEE2E2",tx:"#991B1B",lbl:"❌ Refusé"},
  en_instruction:{bg:"#DBEAFE",tx:"#1E40AF",lbl:"🔍 À instruire"},
};

export const EcranRoleInstitutionnel = (_props: any) => {
  const [onglet, setOnglet] = useState<"dossiers"|"territoire"|"controles">("dossiers");
  const [dossiers, setDossiers] = useState<any[]>(INSTIT_DOSSIERS_DEMO);
  useEffect(() => {
    apiGet('/dossiers-instit').then((r: any) => { if (Array.isArray(r) && r.length>0) setDossiers(r); }).catch(() => {});
  }, []);
  const enCours = dossiers.filter((d: any)=>d.statut==="instruit"||d.statut==="en_instruction");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#1E3A5F",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🏛️ Organisme institutionnel · DDT / DRAAF</div>
        <div style={{fontSize:17,fontWeight:800}}>DDT de l'Allier — Service Forêt</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Allier (03) · Direction Départementale des Territoires</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📂",dossiers.length,"Dossiers"],["⏳",enCours.length,"En cours"],["🌲","186k ha","Forêt 03"],["🏘️","320","Communes"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1E3A5F"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["dossiers","📂 Dossiers"],["territoire","🗺️ Territoire"],["controles","🔍 Contrôles"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #1E3A5F":"3px solid transparent",
            color:onglet===k?"#1E3A5F":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="dossiers"&&dossiers.map((d: any)=>{
          const s = STATUT_INSTIT_COLOR[d.statut]||{bg:C.bg,tx:C.tx3,lbl:d.statut};
          return (
            <div key={d.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{d.titre}</div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                  flexShrink:0,background:s.bg,color:s.tx}}>{s.lbl}</span>
              </div>
              <div style={{fontSize:10,color:C.tx3,display:"flex",gap:10,flexWrap:"wrap"}}>
                <span>📍 {d.commune}</span>
                <span>🌲 {d.surface} ha · {d.essence}</span>
                <span>📅 {new Date(d.dateDepot).toLocaleDateString("fr-FR")}</span>
                {d.délai&&<span style={{color:"#92400E",fontWeight:600}}>⏱ Délai : {d.délai}</span>}
              </div>
              <div style={{fontSize:9,color:C.tx3,marginTop:6,fontFamily:"monospace"}}>{d.id}</div>
            </div>
          );
        })}
        {onglet==="territoire"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>🗺️ Bilan territorial Allier</div>
            {[
              ["🌲","Surface forestière totale","186 000 ha"],
              ["📊","Taux de boisement","31 %"],
              ["🌿","Forêts publiques","28 400 ha"],
              ["🏘️","Forêts communales","14 200 ha"],
              ["⚡","Bois-énergie mobilisé","28 420 t/an"],
              ["🎯","PSG en vigueur","342 plans"],
              ["📋","Dossiers traités (2026)","41 dossiers"],
            ].map(([ic,lb,v],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                paddingBlock:5,borderBottom:i<6?`1px solid ${C.bd}`:"none"}}>
                <span style={{color:C.tx2}}>{ic} {lb}</span>
                <span style={{fontWeight:700,color:C.tx}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {onglet==="controles"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>🔍 Contrôles planifiés S37–S40</div>
              {[
                {date:"2026-09-09",label:"Vérification coupe DOS-2026-041 — Tronçais",statut:"planifié"},
                {date:"2026-09-17",label:"Suivi reboisement compensation A719",statut:"planifié"},
                {date:"2026-09-24",label:"Contrôle inopiné ETF BOIS SERVICE",statut:"à confirmer"},
                {date:"2026-10-02",label:"Bilan annuel chaufferies SBP/SURE",statut:"planifié"},
              ].map((c,i)=>(
                <div key={i} style={{display:"flex",gap:10,paddingBlock:8,
                  borderBottom:i<3?`1px solid ${C.bd}`:"none"}}>
                  <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#1E3A5F",flexShrink:0}}>
                    {new Date(c.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.tx,fontWeight:600}}>{c.label}</div>
                    <div style={{fontSize:9,marginTop:2,color:c.statut==="planifié"?"#065F46":"#92400E",fontWeight:700}}>
                      {c.statut==="planifié"?"✅ Planifié":"⚠️ À confirmer"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"#FEF9C3",borderRadius:12,padding:12,
              border:"1px solid #FDE68A",fontSize:11,color:"#92400E",lineHeight:1.6}}>
              ⚠️ <strong>Délai réglementaire</strong> — 2 dossiers coupe rase atteignent leur délai d'instruction avant le 30 sept.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── FINANCEUR — ADEME / RÉGION / PARTENAIRE BANCAIRE ──────────
const FINANCEUR_PROJETS_DEMO = [
  {id:"FIN-2026-012",label:"Modernisation chaufferie Moulins Centre",porteur:"CC Moulins Communauté",
   montantTotalK:480,montantEngagéK:192,tauxAide:40,type:"ADEME",statut:"en_cours",
   livrableAttendu:"2026-12-31",thematique:"Efficacité énergétique"},
  {id:"FIN-2026-009",label:"Structuration filière bois bocager Allier",porteur:"FIBOIS Auvergne",
   montantTotalK:125,montantEngagéK:125,tauxAide:100,type:"Région AURA",statut:"soldé",
   livrableAttendu:"2026-06-30",thematique:"Filière / structuration"},
  {id:"FIN-2026-007",label:"Certification SBP — ALTEGAD SAS",porteur:"ALTEGAD SAS",
   montantTotalK:38,montantEngagéK:18,tauxAide:47,type:"ADEME",statut:"en_cours",
   livrableAttendu:"2026-10-15",thematique:"Certification / traçabilité"},
  {id:"FIN-2026-003",label:"Prêt matériel abattage — ETF BOIS SERVICE",porteur:"ETF BOIS SERVICE",
   montantTotalK:220,montantEngagéK:220,tauxAide:0,type:"Banque",statut:"remboursement",
   livrableAttendu:"2028-03-01",thematique:"Investissement matériel"},
];

export const EcranRoleFinanceur = (_props: any) => {
  const [onglet, setOnglet] = useState<"projets"|"dossiers"|"indicateurs">("projets");
  const [projets, setProjets] = useState<any[]>(FINANCEUR_PROJETS_DEMO);
  useEffect(() => {
    apiGet('/projets-financeur').then((r: any) => { if (Array.isArray(r) && r.length>0) setProjets(r); }).catch(() => {});
  }, []);
  const enCours = projets.filter((p: any)=>p.statut==="en_cours");
  const totalEngagéK = projets.reduce((s,p: any)=>s+(p.montantEngagéK||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#134E4A",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>💶 Financeur · Partenaire institutionnel</div>
        <div style={{fontSize:17,fontWeight:800}}>ADEME Auvergne-Rhône-Alpes</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Délégation régionale · Fonds bois-énergie</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📁",projets.length,"Projets"],["⚙️",enCours.length,"En cours"],[
          "💶",`${totalEngagéK}k€`,"Engagés"],["📊","43 %","Taux moyen"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#134E4A"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["projets","📁 Projets"],["dossiers","📋 Dossiers"],["indicateurs","📊 Indicateurs"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #134E4A":"3px solid transparent",
            color:onglet===k?"#134E4A":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="projets"&&projets.map((p: any)=>{
          const pct = Math.round(p.montantEngagéK/p.montantTotalK*100);
          const scol = p.statut==="soldé"?"#6B7280":p.statut==="remboursement"?"#7C3AED":"#134E4A";
          return (
            <div key={p.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
              borderLeft:`4px solid ${scol}`,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{p.label}</div>
                <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                  background:p.statut==="soldé"?"#F3F4F6":p.statut==="remboursement"?"#EDE9FE":"#D1FAE5",
                  color:scol}}>
                  {p.statut==="soldé"?"✅ Soldé":p.statut==="remboursement"?"🔄 Remboursement":"⚙️ En cours"}
                </span>
              </div>
              <div style={{fontSize:10,color:C.tx3,marginBottom:8,display:"flex",gap:10,flexWrap:"wrap"}}>
                <span>👤 {p.porteur}</span>
                <span>🏷 {p.type}</span>
                <span>🎯 {p.thematique}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}>
                <span style={{color:C.tx2}}>💶 {p.montantEngagéK}k€ / {p.montantTotalK}k€</span>
                {p.tauxAide>0&&<span style={{color:C.tx2}}>Aide : {p.tauxAide}%</span>}
              </div>
              <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:scol,width:`${pct}%`}}/>
              </div>
              <div style={{fontSize:9,color:C.tx3,marginTop:4}}>
                {pct}% consommé · échéance {new Date(p.livrableAttendu).toLocaleDateString("fr-FR")}
              </div>
            </div>
          );
        })}
        {onglet==="dossiers"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📋 Pièces justificatives en attente</div>
            {[
              {id:"FIN-2026-007",doc:"Rapport d'audit certification SBP",délai:"2026-09-15",statut:"en_attente"},
              {id:"FIN-2026-012",doc:"Bilan intermédiaire travaux chaufferie",délai:"2026-09-30",statut:"reçu"},
              {id:"FIN-2026-012",doc:"Factures équipements — lot 2",délai:"2026-10-15",statut:"en_attente"},
            ].map((d,i)=>(
              <div key={i} style={{paddingBlock:8,borderBottom:i<2?`1px solid ${C.bd}`:"none",
                display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx}}>{d.doc}</div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{d.id} · ⏱ {new Date(d.délai).toLocaleDateString("fr-FR")}</div>
                </div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,flexShrink:0,
                  background:d.statut==="reçu"?"#D1FAE5":"#FEF9C3",
                  color:d.statut==="reçu"?"#065F46":"#92400E"}}>
                  {d.statut==="reçu"?"✅ Reçu":"⏳ Attendu"}
                </span>
              </div>
            ))}
          </div>
        )}
        {onglet==="indicateurs"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📊 Impact portefeuille 2026</div>
              {[
                ["🌿","Émissions GES évitées","2 840 tCO₂eq"],
                ["⚡","Énergie renouvelable soutenue","132 GWh"],
                ["💶","Levier financier","1 : 3.2"],
                ["🌲","Biomasse mobilisée","28 420 t"],
                ["🏗️","Emplois filière soutenus","~48 ETP"],
              ].map(([ic,lb,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  paddingBlock:5,borderBottom:i<4?`1px solid ${C.bd}`:"none"}}>
                  <span style={{color:C.tx2}}>{ic} {lb}</span>
                  <span style={{fontWeight:700,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#D1FAE5",borderRadius:12,padding:12,
              border:"1px solid #6EE7B7",fontSize:11,color:"#065F46",lineHeight:1.6}}>
              🎯 <strong>Objectif 2027</strong> — Doublement du soutien bois-énergie prévu<br/>
              Appel à projets ADEME biomasse forestière · ouverture T1 2027
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── LOGISTIQUE / AFFRÈTEMENT ──────────────────────────────────────────────────
const LOGISTIQUE_TRANSPORTS_DEMO = [
  {id:"tr1",date:"2026-09-11",lot:"LOT-2026-034",origine:"Chantier Combrailles",destination:"Chaufferie Moulins Centre",transporteur:"Camion Rossi",poidsT:14.2,statut:"en_cours"},
  {id:"tr2",date:"2026-09-11",lot:"LOT-2026-031",origine:"Plateforme Vichy",destination:"Industrie Lapeyre SA",transporteur:"Trans-Allier SARL",poidsT:22.0,statut:"planifé"},
  {id:"tr3",date:"2026-09-10",lot:"LOT-2026-029",origine:"Chantier Thiers",destination:"Chaufferie Clermont-Fd",transporteur:"Camion Rossi",poidsT:18.4,statut:"livré"},
  {id:"tr4",date:"2026-09-13",lot:"LOT-2026-036",origine:"Forêt Domaniale Tronçais",destination:"Scierie Auvergne",transporteur:"Non affecté",poidsT:31.5,statut:"à_affrêter"},
];
const LOGISTIQUE_BESOINS_DEMO = [
  {id:"b1",lot:"LOT-2026-036",volume:"31.5 t",essence:"Chêne",date:"2026-09-13",priorite:"haute",contact:"M. Dupont (ETF Boisiers du Centre)"},
  {id:"b2",lot:"LOT-2026-038",volume:"18.0 t",essence:"Hêtre",date:"2026-09-18",priorite:"normale",contact:"Mme Vidal (Prop. Lapalisse)"},
];

export const EcranRoleLogistique = (_props: any) => {
  const [onglet,     setOnglet]     = useState<"transports"|"besoins"|"contacts">("transports");
  const [transports, setTransports] = useState<any[]>(LOGISTIQUE_TRANSPORTS_DEMO);
  const [besoins,    setBesoins]    = useState<any[]>(LOGISTIQUE_BESOINS_DEMO);

  useEffect(() => {
    apiGet('/transports').then((r: any) => { if (Array.isArray(r) && r.length>0) setTransports(r); }).catch(() => {});
    apiGet('/livraisons').then((r: any) => { if (Array.isArray(r) && r.length>0) setBesoins(r); }).catch(() => {});
  }, []);

  const enCours   = transports.filter((t: any)=>t.statut==="en_cours");
  const aAffreter = transports.filter((t: any)=>t.statut==="à_affrêter");
  const totalT    = transports.reduce((s: any,t: any)=>s+(t.poidsT||0), 0);

  const statutColor = (s: string) => s==="livré"?"#065F46":s==="en_cours"?"#1D4ED8":s==="planifé"?"#92400E":"#7C3AED";
  const statutBg    = (s: string) => s==="livré"?"#D1FAE5":s==="en_cours"?"#DBEAFE":s==="planifé"?"#FEF9C3":"#EDE9FE";
  const statutLabel = (s: string) => s==="livré"?"✅ Livré":s==="en_cours"?"🚛 En cours":s==="planifé"?"📅 Planifié":"🔴 À affrêter";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#1E3A5F",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🚛 Logistique · Affrètement</div>
        <div style={{fontSize:17,fontWeight:800}}>Coordination transport bois</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Planification · Suivi · Affrètement filière</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([
          ["🚛", enCours.length,        "En cours"],
          ["🔴", aAffreter.length,      "À affrêter"],
          ["📦", transports.length,     "Total"],
          ["⚖️", `${totalT.toFixed(0)} t`, "Tonnage"],
        ] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1E3A5F"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["transports","🚛 Transports"],["besoins","📋 À affrêter"],["contacts","📞 Contacts"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #1E3A5F":"3px solid transparent",
            color:onglet===k?"#1E3A5F":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="transports"&&transports.map((t: any)=>(
          <div key={t.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${statutColor(t.statut)}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
              <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{t.lot}</div>
              <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                background:statutBg(t.statut),color:statutColor(t.statut)}}>
                {statutLabel(t.statut)}
              </span>
            </div>
            <div style={{fontSize:10,color:C.tx3,marginBottom:6,display:"flex",flexDirection:"column",gap:2}}>
              <span>📍 {t.origine} → {t.destination}</span>
              <span>🚛 {t.transporteur} · <strong style={{color:C.tx}}>{t.poidsT} t</strong></span>
              <span>📅 {new Date(t.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
            </div>
          </div>
        ))}
        {onglet==="besoins"&&(
          besoins.length===0
            ? <div style={{textAlign:"center",padding:40,color:C.tx3,fontSize:12}}>Aucun besoin en attente</div>
            : besoins.map((b: any)=>(
              <div key={b.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
                borderLeft:"4px solid #7C3AED",padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                  <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{b.lot}</div>
                  <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                    background:"#EDE9FE",color:"#7C3AED"}}>
                    {b.priorite==="haute"?"🔴 Urgent":"📋 Normal"}
                  </span>
                </div>
                <div style={{fontSize:10,color:C.tx3,display:"flex",flexDirection:"column",gap:2}}>
                  <span>🌲 {b.volume} · {b.essence}</span>
                  <span>📅 Enlèvement souhaité : {new Date(b.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
                  <span>👤 {b.contact}</span>
                </div>
              </div>
            ))
        )}
        {onglet==="contacts"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📞 Contacts filière</div>
            {[
              {role:"🚛 Transporteur",nom:"Camion Rossi",tel:"06 12 34 56 78",zone:"Allier / PdD"},
              {role:"🚛 Transporteur",nom:"Trans-Allier SARL",tel:"06 23 45 67 89",zone:"Allier"},
              {role:"🏗️ Plateforme",nom:"Plateforme Vichy",tel:"04 70 11 22 33",zone:"Vichy"},
              {role:"🔥 Chaufferie",nom:"Chaufferie Moulins Centre",tel:"04 70 44 55 66",zone:"Moulins"},
            ].map((c,i)=>(
              <div key={i} style={{paddingBlock:9,borderBottom:i<3?`1px solid ${C.bd}`:"none"}}>
                <div style={{fontSize:10,color:C.tx3,fontWeight:600,marginBottom:2}}>{c.role} · {c.zone}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.tx}}>{c.nom}</span>
                  <a href={`tel:${c.tel.replace(/\s/g,"")}`} style={{fontSize:11,color:"#1E3A5F",fontWeight:600,textDecoration:"none"}}>
                    📞 {c.tel}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
