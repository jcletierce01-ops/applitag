// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../../design-system/tokens.js";
import { apiGet } from "../../services/api.service.js";
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
