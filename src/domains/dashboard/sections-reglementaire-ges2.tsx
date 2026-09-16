// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { VSS_RECONNUS } from "./sections.constants.js";


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
