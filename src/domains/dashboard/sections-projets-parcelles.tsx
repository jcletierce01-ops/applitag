// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";


// ── TABLEAU DE BORD DESKTOP (ADMIN) ────────────────────────────

// ── PARCELLES — TRAVAUX — FLUX — RÉSULTATS ─────────────────────

const QUALITES_BOIS = [
  {id:"bo",  label:"Bois d'œuvre",      icon:"🪵", couleur:"#1E5B3A", bg:"#D1FAE5", usage:"matiere",
   desc:"Sciage, déroulage, charpente, menuiserie — stockage carbone long terme"},
  {id:"bi",  label:"Bois d'industrie",  icon:"📦", couleur:"#0369A1", bg:"#DBEAFE", usage:"matiere",
   desc:"Pâte à papier, panneaux, palettes — valorisation matière intermédiaire"},
  {id:"be",  label:"Bois énergie",      icon:"🔥", couleur:"#B45309", bg:"#FEF3C7", usage:"energie",
   desc:"Plaquettes forestières, bûches, granulés — valorisation énergétique"},
];

const DEMO_PARCELLE = {
  id:"p1",
  ref:"PAR-2026-001",
  nom:"Forêt Bernard — Tronçais Nord",
  commune:"Saint-Bonnet-Tronçais",
  canton:"Allier (03)",
  surface:12.4,
  essencePrincipale:"Chêne sessile (Quercus petraea)",
  essencesSecondaires:["Charme","Acacia","Bouleau"],
  proprietaire:"M. Henri Bernard",
  mandataire:"Sylvie Moreau — Cabinet Forêt Conseil",
  coordGPS:{lat:46.5831,lng:2.7654},

  diagnostic:{
    date:"2026-03-15",
    auteur:"Sylvie Moreau",
    etatSanitaire:"moyen",
    risques:["Scolytes (Ips typographus) — foyer détecté à 800 m","Dépérissement chêne — 12% des tiges","Vent dominant O-NO — risque chablis sur parquet est"],
    notes:"Peuplement de 90 ans, densité excessive (800 tiges/ha). Régénération naturelle absente sous couvert. Intervention urgente sur zone sanitaire (2,1 ha). Reste en futaie jardinée.",
    urgence:"haute",
  },

  photos:[
    {id:"ph1",label:"Vue générale parcelle",date:"2026-03-15",lat:46.5831,lng:2.7654,tag:"diagnostic"},
    {id:"ph2",label:"Foyer scolytes — zone NE",date:"2026-03-15",lat:46.5835,lng:2.7661,tag:"sanitaire"},
    {id:"ph3",label:"Dépérissement chêne — tige n°42",date:"2026-03-15",lat:46.5829,lng:2.7650,tag:"sanitaire"},
    {id:"ph4",label:"Accès chemin forestier",date:"2026-03-15",lat:46.5820,lng:2.7645,tag:"logistique"},
    {id:"ph5",label:"Après coupe sanitaire — zone A",date:"2026-05-10",lat:46.5834,lng:2.7660,tag:"post_travaux"},
    {id:"ph6",label:"Placeau régénération n°1",date:"2026-05-10",lat:46.5828,lng:2.7648,tag:"regeneration"},
  ],

  prescriptions:[
    {type:"Coupe sanitaire",surface:2.1,essences:["Chêne","Acacia"],objectif:"Éliminer le foyer scolyte et les tiges dépérissantes",methode:"Coupe rase de la zone infectée + dessouchage partiel",urgence:"immédiate"},
    {type:"Coupe d'éclaircie",surface:7.8,essences:["Chêne","Charme"],objectif:"Réduire densité de 800 à 400 tiges/ha, favoriser la croissance des beaux brins",methode:"Éclaircie sélective par le bas — prélèvement 30% de la surface terrière",urgence:"T2 2026"},
    {type:"Plantation",surface:2.1,essences:["Chêne sessile","Merisier","Alisier torminal"],objectif:"Restauration après coupe sanitaire — diversification essence et résilience",methode:"Plant forestier 80 cm — 1 100 plants/ha — protection gibier intégrale",urgence:"automne 2026"},
  ],

  entreprises:[
    {nom:"ETF Dupont Frères",siret:"45892103400012",certif:"PEFC",numero:"2023-0156",
     role:"Abattage & débardage",materiel:["John Deere 1270G Harvester","John Deere 1210E Porteur"],
     dateIntervention:"2026-04-20",surface:9.9},
    {nom:"JENZ Déchiquetage SARL",siret:"72341098700034",certif:"ISO 9001",numero:"FR-2022-0089",
     role:"Déchiquetage rémanents",materiel:["Jenz HEM 593 DQ"],
     dateIntervention:"2026-05-02",surface:9.9},
    {nom:"Pépinières Forestières du Centre",siret:"38712045600028",certif:"",numero:"",
     role:"Fourniture plants",materiel:[],
     dateIntervention:"2026-10-15",surface:2.1},
  ],

  surfaces:{
    total:12.4,
    coupeSanitaire:2.1,
    eclaircie:7.8,
    plantation:2.1,
    nonIntervenee:0.4,
  },
  couts:{
    exploitation:8200,
    dechiquetage:1640,
    plantation:3850,
    protectionGibier:920,
    honorairesMandataire:1200,
    total:15810,
    subventions:[
      {source:"FEADER — Plan de relance forêt",montant:2310,statut:"accordé"},
      {source:"Région Auvergne-Rhône-Alpes",montant:850,statut:"en cours"},
    ],
    resteACharge:12650,
  },

  volumes:{
    bo:{prevu:180,reel:183,unite:"m³",destination:"Scierie Marchais — Moulins (03)",preuveRef:"BON-SC-2026-0441",dateLivraison:"2026-04-28"},
    bi:{prevu:0,reel:0,unite:"m³",destination:"",preuveRef:"",dateLivraison:""},
    be:{prevu:320,reel:307,unite:"m³",toTonnes:0.4,destination:"Chaufferie Municipale St-Amand",preuveRef:"BL-2026-0831",dateLivraison:"2026-05-04"},
    remanents:{utilises:307,laissesSol:45,note:"45 m³ rémanents fins laissés au sol pour biodiversité (directive PEFC)"},
  },

  controleApresTravaux:{
    date:"2026-05-20",
    auteur:"Sylvie Moreau",
    conformite:"conforme",
    observations:["Cloisonnements respectés — pas d'ornières majeures","Zone sanitaire propre — souches traitées","3 tiges abimées par le débardage hors prescription — notifiées ETF","Andains rémanents conformes"],
    noteChauffeurs:4,
    noteGlobalETF:4,
    reserves:"Légère dégradation chemin d'accès — remise en état demandée sous 30 jours",
    dateRelance:"2026-06-20",
  },

  regeneration:{
    typeRegeneration:"Artificielle — Plantation",
    essencesPlantees:[
      {essence:"Chêne sessile",plants:1540,pourcent:66,origine:"Provenances locales certifiées"},
      {essence:"Merisier",plants:462,pourcent:20,origine:"Pépinières du Centre"},
      {essence:"Alisier torminal",plants:330,pourcent:14,origine:"Pépinières du Centre"},
    ],
    densite:1100,
    datePlantation:"2026-10-15",
    protectionGibier:"Gaine individuelle biodégradable 80 cm",
    suivi:[
      {date:"2026-05-10",type:"Relevé régénération naturelle",resultat:"Absence constatée — plantation décidée"},
      {date:"2027-05-15",type:"Contrôle reprise plantation",resultat:"À planifier",statut:"prévu"},
      {date:"2028-05-15",type:"Dégagement si nécessaire",resultat:"",statut:"prévu"},
    ],
    objectifCouvert:"2035",
  },
};

const ONGLETS_PARCELLE = [
  {id:"diagnostic",    icon:"🔍", label:"Diagnostic"},
  {id:"photos",        icon:"📷", label:"Photos & GPS"},
  {id:"prescriptions", icon:"📋", label:"Prescriptions"},
  {id:"entreprises",   icon:"🏗️", label:"Entreprises"},
  {id:"surfaces",      icon:"📐", label:"Surfaces & Coûts"},
  {id:"flux",          icon:"🔀", label:"Flux bois"},
  {id:"controle",      icon:"✅", label:"Contrôle"},
  {id:"regeneration",  icon:"🌱", label:"Régénération"},
];

export const SectionParcelleTravaux = () => {
  const [onglet, setOnglet] = useState("diagnostic");
  const p = DEMO_PARCELLE;

  const _totalSubv = p.couts.subventions.reduce((s,sub)=>s+sub.montant,0);
  const volTotalReel = p.volumes.bo.reel + p.volumes.bi.reel + p.volumes.be.reel;
  const pctMatiere = volTotalReel>0 ? Math.round((p.volumes.bo.reel+p.volumes.bi.reel)/volTotalReel*100) : 0;
  const pctEnergie = 100-pctMatiere;

  const renderDiagnostic = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>🔍 Diagnostic initial</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["Date","📅 "+new Date(p.diagnostic.date).toLocaleDateString("fr-FR")],
            ["Auteur","👤 "+p.diagnostic.auteur],
            ["État sanitaire",
              {bonne:"🟢 Bon",moyen:"🟡 Moyen",mauvais:"🔴 Mauvais"}[p.diagnostic.etatSanitaire]||p.diagnostic.etatSanitaire],
            ["Urgence d'intervention",
              {haute:"🔴 Haute",moyenne:"🟡 Moyenne",faible:"🟢 Faible"}[p.diagnostic.urgence]||p.diagnostic.urgence],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",
              borderRadius:7,background:"#F9FAFB",fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",borderRadius:8,
          border:"1px solid #FCD34D",fontSize:12,color:"#78350F",lineHeight:1.6}}>
          <div style={{fontWeight:700,marginBottom:4}}>📝 Observations</div>
          {p.diagnostic.notes}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>⚠️ Risques identifiés</div>
          {p.diagnostic.risques.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,
              padding:"7px 10px",borderRadius:7,background:"#FEF2F2",border:"1px solid #FECACA"}}>
              <span>🔴</span><span style={{color:"#991B1B",lineHeight:1.4}}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌲 Peuplement</div>
          {[
            ["Essence principale",p.essencePrincipale],
            ["Essences secondaires",p.essencesSecondaires.join(", ")],
            ["Surface totale",`${p.surface} ha`],
            ["GPS",`${p.coordGPS.lat}°N / ${p.coordGPS.lng}°E`],
            ["Propriétaire",p.proprietaire],
            ["Mandataire",p.mandataire],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",
              borderRadius:5,fontSize:11,borderBottom:`1px solid ${C.bd}`}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {p.photos.map(ph=>{
          const tagColor = {diagnostic:"#0369A1",sanitaire:"#DC2626",logistique:"#92400E",
            post_travaux:"#065F46",regeneration:"#166534"}[ph.tag]||"#6B7280";
          const tagBg = {diagnostic:"#DBEAFE",sanitaire:"#FEE2E2",logistique:"#FEF3C7",
            post_travaux:"#D1FAE5",regeneration:"#DCFCE7"}[ph.tag]||"#F3F4F6";
          return (
            <div key={ph.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
              <div style={{height:100,background:`linear-gradient(135deg,${tagBg},#fff)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>
                📷
              </div>
              <div style={{padding:"8px 10px"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.tx,marginBottom:4}}>{ph.label}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                    background:tagBg,color:tagColor,fontWeight:600}}>
                    {ph.tag.replace("_"," ")}
                  </span>
                  <span style={{fontSize:9,color:C.tx2}}>
                    {new Date(ph.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:3}}>
                  📍 {ph.lat}°N / {ph.lng}°E
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#EFF6FF",borderRadius:10,border:"1px solid #BFDBFE",
        padding:"10px 14px",fontSize:11,color:"#1E40AF"}}>
        💡 Les photos sont géolocalisées automatiquement via l'app mobile APPLITAG. Elles sont horodatées et archivées avec le lot pour traçabilité PEFC.
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.prescriptions.map((pr,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:C.tx}}>{pr.type}</span>
              <span style={{fontSize:11,color:C.tx2,marginLeft:10}}>{pr.surface} ha</span>
            </div>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:pr.urgence==="immédiate"?"#FEE2E2":"#FEF3C7",
              color:pr.urgence==="immédiate"?"#991B1B":"#92400E"}}>
              ⏱ {pr.urgence}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["🎯 Objectif",pr.objectif],
              ["⚙️ Méthode",pr.methode],
              ["🌲 Essences concernées",pr.essences.join(", ")],
            ].map(([k,v])=>(
              <div key={k} style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px",
                fontSize:11,gridColumn:k.includes("Objectif")?"1/-1":undefined}}>
                <div style={{fontWeight:700,color:C.tx2,marginBottom:3}}>{k}</div>
                <div style={{color:C.tx,lineHeight:1.5}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEntreprises = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.entreprises.map((e,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{e.nom}</div>
              <div style={{fontSize:10,color:C.tx2}}>SIRET : {e.siret}</div>
            </div>
            {e.certif&&(
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                background:"#D1FAE5",color:"#065F46"}}>
                ✓ {e.certif} {e.numero}
              </span>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>🏗️ Rôle</div>
              <div style={{color:C.tx}}>{e.role}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📅 Intervention</div>
              <div style={{color:C.tx}}>{new Date(e.dateIntervention).toLocaleDateString("fr-FR")}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📐 Surface</div>
              <div style={{color:C.tx}}>{e.surface} ha</div>
            </div>
          </div>
          {e.materiel.length>0&&(
            <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
              {e.materiel.map(m=>(
                <span key={m} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                  background:"#EDE9FE",color:"#6D28D9",fontWeight:600}}>⚙️ {m}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSurfaces = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>📐 Surfaces par intervention</div>
        {[
          ["Coupe sanitaire","#DC2626","#FEE2E2",p.surfaces.coupeSanitaire],
          ["Éclaircie","#1E5B3A","#D1FAE5",p.surfaces.eclaircie],
          ["Plantation","#166534","#DCFCE7",p.surfaces.plantation],
          ["Non intervenue","#6B7280","#F3F4F6",p.surfaces.nonIntervenee],
        ].map(([label,col,_bg,val])=>(
          <div key={label} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
              <span style={{color:col,fontWeight:600}}>{label}</span>
              <span style={{fontWeight:700,color:C.tx}}>{val} ha</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:col,
                width:`${(val/p.surfaces.total)*100}%`}}/>
            </div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"8px 10px",background:"#F9FAFB",borderRadius:7,
          display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{fontWeight:700,color:C.tx2}}>Total parcelle</span>
          <span style={{fontWeight:800,color:C.tx}}>{p.surfaces.total} ha</span>
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>💶 Budget travaux</div>
        {[
          ["Exploitation forestière",p.couts.exploitation],
          ["Déchiquetage",p.couts.dechiquetage],
          ["Plantation",p.couts.plantation],
          ["Protection gibier",p.couts.protectionGibier],
          ["Honoraires mandataire",p.couts.honorairesMandataire],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
            borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
            <span style={{color:C.tx2}}>{k}</span>
            <span style={{fontWeight:600,color:C.tx}}>{v.toLocaleString("fr-FR")} €</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:13,
          fontWeight:800,color:C.tx,borderTop:`2px solid ${C.bd}`,marginTop:4}}>
          <span>Total travaux</span>
          <span>{p.couts.total.toLocaleString("fr-FR")} €</span>
        </div>
        <div style={{marginTop:8,padding:"10px 12px",background:"#D1FAE5",borderRadius:8,
          border:"1px solid #6EE7B7",fontSize:11}}>
          <div style={{fontWeight:700,color:"#065F46",marginBottom:6}}>🏦 Subventions</div>
          {p.couts.subventions.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:"#065F46"}}>{s.source}</span>
              <span style={{fontWeight:700,color:"#065F46"}}>
                -{s.montant.toLocaleString("fr-FR")} € <span style={{fontSize:9,opacity:.7}}>({s.statut})</span>
              </span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #6EE7B7",marginTop:6,paddingTop:6,
            display:"flex",justifyContent:"space-between",fontWeight:800,color:"#064E3B",fontSize:12}}>
            <span>Reste à charge</span>
            <span>{p.couts.resteACharge.toLocaleString("fr-FR")} €</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFlux = () => {
    const vols = p.volumes;
    return (
      <div>
        {/* Banner usage matière vs énergie */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>
            🔀 Répartition des flux bois mobilisés — {volTotalReel} m³ total
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{background:"#D1FAE5",borderRadius:10,padding:"12px 14px",
              border:"1px solid #6EE7B7",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#065F46"}}>{pctMatiere}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>Usage matière</div>
              <div style={{fontSize:11,color:"#047857",marginTop:2}}>
                {vols.bo.reel+vols.bi.reel} m³ — stockage carbone long terme
              </div>
            </div>
            <div style={{background:"#FEF3C7",borderRadius:10,padding:"12px 14px",
              border:"1px solid #FCD34D",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#92400E"}}>{pctEnergie}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#92400E"}}>Usage énergie</div>
              <div style={{fontSize:11,color:"#B45309",marginTop:2}}>
                {vols.be.reel} m³ — valorisation énergétique
              </div>
            </div>
          </div>

          {/* Barre de flux visuelle */}
          <div style={{height:16,borderRadius:8,overflow:"hidden",display:"flex",marginBottom:6}}>
            <div style={{width:`${Math.round(vols.bo.reel/volTotalReel*100)}%`,background:"#1E5B3A",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BO</div>
            <div style={{width:`${Math.round(vols.bi.reel/volTotalReel*100)}%`,background:"#0369A1",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BI</div>
            <div style={{width:`${Math.round(vols.be.reel/volTotalReel*100)}%`,background:"#B45309",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BE</div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:10}}>
            {[["#1E5B3A","Bois d'œuvre (BO)"],["#0369A1","Bois d'industrie (BI)"],["#B45309","Bois énergie (BE)"]].map(([col,lbl])=>(
              <span key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>
                <span style={{color:C.tx2}}>{lbl}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Détail par qualité */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {QUALITES_BOIS.map(q=>{
            const vol = vols[q.id];
            if(!vol) return null;
            return (
              <div key={q.id} style={{background:"#fff",borderRadius:12,
                border:`2px solid ${vol.reel>0?q.couleur+"44":C.bd}`,padding:16,
                opacity:vol.reel===0?.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:24}}>{q.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:q.couleur}}>{q.label}</div>
                      <div style={{fontSize:11,color:C.tx2}}>{q.desc}</div>
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                    background:q.usage==="matiere"?"#D1FAE5":"#FEF3C7",
                    color:q.usage==="matiere"?"#065F46":"#92400E"}}>
                    {q.usage==="matiere"?"♻️ Usage matière":"🔥 Usage énergie"}
                  </span>
                </div>
                {vol.reel>0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:11}}>
                    {[
                      ["Volume prévu",`${vol.prevu} ${vol.unite}`],
                      ["Volume réel",`${vol.reel} ${vol.unite}`],
                      ["Destination",vol.destination||"—"],
                      ["Preuve / BL",vol.preuveRef||"—"],
                    ].map(([k,v])=>(
                      <div key={k} style={{background:q.bg,borderRadius:7,padding:"8px 10px"}}>
                        <div style={{fontWeight:700,color:q.couleur,marginBottom:2,fontSize:10}}>{k}</div>
                        <div style={{color:C.tx,fontWeight:600}}>{v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>
                    Aucun volume de cette qualité sur ce chantier
                  </div>
                )}
              </div>
            );
          })}

          {/* Rémanents */}
          <div style={{background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.bd}`,
            padding:"10px 14px",fontSize:11}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:6}}>🍂 Rémanents & menu bois</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span style={{color:"#92400E"}}>🔥 Valorisés déchiquetage : <strong>{vols.remanents.utilises} m³</strong></span>
              <span style={{color:"#065F46"}}>🌿 Laissés au sol : <strong>{vols.remanents.laissesSol} m³</strong></span>
            </div>
            <div style={{marginTop:6,color:C.tx2,fontStyle:"italic"}}>{vols.remanents.note}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderControle = () => {
    const ctrl = p.controleApresTravaux;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>✅ Contrôle après travaux</div>
          {[
            ["Date",new Date(ctrl.date).toLocaleDateString("fr-FR")],
            ["Contrôleur",ctrl.auteur],
            ["Conformité",ctrl.conformite==="conforme"?"✅ Conforme":"⚠️ Réserves"],
            ["Note ETF","⭐".repeat(ctrl.noteGlobalETF)+" ("+ctrl.noteGlobalETF+"/5)"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
              borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}

          {ctrl.reserves&&(
            <div style={{marginTop:10,background:"#FEF3C7",borderRadius:8,border:"1px solid #FCD34D",
              padding:"8px 10px",fontSize:11,color:"#92400E"}}>
              <div style={{fontWeight:700,marginBottom:4}}>⚠️ Réserve</div>
              {ctrl.reserves}
              <div style={{marginTop:4,color:"#B45309",fontWeight:600}}>
                Relance : {new Date(ctrl.dateRelance).toLocaleDateString("fr-FR")}
              </div>
            </div>
          )}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📋 Points de contrôle</div>
          {ctrl.observations.map((o,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:11,
              padding:"6px 10px",borderRadius:7,
              background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
              <span style={{color:"#16A34A",flexShrink:0}}>✓</span>
              <span style={{color:"#065F46"}}>{o}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRegeneration = () => {
    const reg = p.regeneration;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌱 Plan de régénération</div>
            {[
              ["Type",reg.typeRegeneration],
              ["Date plantation",new Date(reg.datePlantation).toLocaleDateString("fr-FR")],
              ["Densité",reg.densite+" plants/ha"],
              ["Protection",reg.protectionGibier],
              ["Objectif couvert",reg.objectifCouvert],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
                borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx2}}>{k}</span>
                <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌿 Essences plantées</div>
            {reg.essencesPlantees.map(e=>(
              <div key={e.essence} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                  <span style={{fontWeight:600,color:C.tx}}>{e.essence}</span>
                  <span style={{color:"#1E5B3A",fontWeight:700}}>{e.plants} plants ({e.pourcent}%)</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:"#1E5B3A",
                    width:`${e.pourcent}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:2}}>{e.origine}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📅 Calendrier de suivi</div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:"#E5E7EB"}}/>
            {reg.suivi.map((s,i)=>{
              const done = s.statut!=="prévu";
              return (
                <div key={i} style={{display:"flex",gap:12,marginBottom:16,position:"relative"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,zIndex:1,
                    background:done?"#1E5B3A":"#fff",
                    border:`2px solid ${done?"#1E5B3A":"#9CA3AF"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,color:done?"#fff":"#6B7280",fontWeight:700}}>
                    {done?"✓":"○"}
                  </div>
                  <div style={{paddingTop:3}}>
                    <div style={{fontSize:10,color:C.tx2}}>{new Date(s.date).toLocaleDateString("fr-FR")}</div>
                    <div style={{fontSize:12,fontWeight:600,color:done?C.tx:"#9CA3AF"}}>{s.type}</div>
                    {s.resultat&&<div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>{s.resultat}</div>}
                    {!done&&<span style={{fontSize:9,background:"#FEF3C7",color:"#92400E",
                      padding:"1px 5px",borderRadius:3,fontWeight:600}}>À planifier</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderContenu = () => {
    switch(onglet){
      case "diagnostic":    return renderDiagnostic();
      case "photos":        return renderPhotos();
      case "prescriptions": return renderPrescriptions();
      case "entreprises":   return renderEntreprises();
      case "surfaces":      return renderSurfaces();
      case "flux":          return renderFlux();
      case "controle":      return renderControle();
      case "regeneration":  return renderRegeneration();
      default:              return null;
    }
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête parcelle */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
        padding:"14px 20px",marginBottom:16,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#D1FAE5",color:"#065F46"}}>{p.ref}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#FEE2E2",color:"#991B1B"}}>⚠️ Urgence haute</span>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:C.tx,marginTop:4}}>{p.nom}</div>
          <div style={{fontSize:12,color:C.tx2}}>
            📍 {p.commune} · {p.surface} ha · {p.essencePrincipale.split(" ")[0]} · {p.proprietaire}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
          {[
            {icon:"📊",val:`${volTotalReel} m³`,lbl:"Volume total"},
            {icon:"♻️",val:`${pctMatiere}%`,lbl:"Usage matière"},
            {icon:"🔥",val:`${pctEnergie}%`,lbl:"Usage énergie"},
          ].map(k=>(
            <div key={k.lbl} style={{background:"#F9FAFB",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:16}}>{k.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:C.tx}}>{k.val}</div>
              <div style={{fontSize:9,color:C.tx2}}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4,flexWrap:"wrap"}}>
        {ONGLETS_PARCELLE.map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id)}
            style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,
              cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",
              border:`1px solid ${onglet===o.id?"#1E5B3A":C.bd}`,
              background:onglet===o.id?"#1E5B3A":"transparent",
              color:onglet===o.id?"#fff":C.tx2}}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {renderContenu()}
    </div>
  );
};

