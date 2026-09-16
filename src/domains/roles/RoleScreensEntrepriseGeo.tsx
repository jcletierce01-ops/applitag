// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { fmtNum } from "../../shared/format.js";
import { BigBtn, SectionTitle } from "../../shared/ui.jsx";
import { generatePdfFromHtml, buildRedHTML } from "../../domains/documents/pdf-templates.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export const EcranAutoDeclarationRED = ({lot, visites, transports=[], livraisons=[], onBack, toast}: any) => {
  const visite    = visites.find((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const transport = transports.find((t: any)=>t.lotId===lot.id||t.lotNumero===lot.lotNumero);
  const livraison = livraisons.find((l: any)=>l.lotId===lot.id||l.lotNumero===lot.lotNumero);

  const tonnage = parseFloat((livraison?.poidsNet||livraison?.poidsBrut||visite?.volumeEstimeT||0) as any);
  // Seuil 500 t/an → auto-déclaration, sinon déclaration durabilité
  const typeAuto = tonnage<=500 ? "auto" : "durabilite";
  const [typeDecl, setTypeDecl] = useState(typeAuto);
  const [generating, setGen]    = useState(false);

  const handleGenerer = () => {
    setGen(true);
    const html = buildRedHTML(lot, visite, transport, livraison, typeDecl);
    generatePdfFromHtml(html, `AutoDeclarationRED_${lot.lotNumero||"APPLITAG"}.pdf`, toast, ()=>setGen(false));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#185FA5",color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🇪🇺 Déclaration RED</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · Biomasse bois-énergie</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {/* Seuil tonnage */}
        <div style={{background:C.blueL,borderRadius:14,padding:16,marginBottom:16,
          border:`1.5px solid ${C.blue}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.blueD,marginBottom:8}}>
            📊 Données du lot
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.9}}>
            🌲 Lot : {lot.lotNumero} · {lot.commune}<br/>
            📍 GPS : {visite?.gps?`${visite.gps.lat.toFixed(4)}°N`:"Non renseigné"}<br/>
            ⚖️ Tonnage : {tonnage>0?tonnage+" t":"Non renseigné"}<br/>
            🏭 Destination : {livraison?.nomDestination||"Non renseignée"}<br/>
            📏 Distance : {visite?.redDistance||"—"} km
          </div>
        </div>

        {/* Sélection type */}
        <SectionTitle icon="📋" label="Type de déclaration RED"/>
        <div style={{background:C.amberL,borderRadius:12,padding:12,marginBottom:14,
          border:`1px solid ${C.amber}`,fontSize:11,color:C.amberD,lineHeight:1.6}}>
          ℹ️ Seuil légal : &lt;500 t/an → Auto-déclaration · ≥500 t/an → Déclaration durabilité (audit tiers requis).<br/>
          Tonnage actuel : <strong>{tonnage>0?tonnage+" t":"non renseigné"}</strong>
          {tonnage>0&&` → ${tonnage<=500?"Auto-déclaration applicable":"Déclaration durabilité recommandée"}`}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {[
            ["auto","📝","Auto-déclaration","Lots < 500 t/an · Déclaration sur l'honneur",tonnage<=500||tonnage===0],
            ["durabilite","🔍","Déclaration de durabilité","Lots ≥ 500 t/an · Audit tiers requis",tonnage>=500],
            ["pos","🔗","Preuve de durabilité (PoS)","Transfert entre opérateurs de la chaîne",false],
          ].map(([v,e,l,s,recommande]: any)=>(
            <div key={v as any} onClick={()=>setTypeDecl(v as any)} style={{
              padding:14,borderRadius:14,cursor:"pointer",
              border:`2px solid ${typeDecl===v?C.blue:C.bd}`,
              background:typeDecl===v?C.blueL:"#fff",
              WebkitTapHighlightColor:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{e}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:typeDecl===v?700:500,
                    color:typeDecl===v?C.blueD:C.tx}}>
                    {l}
                    {recommande&&<span style={{fontSize:10,marginLeft:8,
                      background:C.green,color:"#fff",padding:"1px 6px",
                      borderRadius:4,fontWeight:600}}>Recommandé</span>}
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{s}</div>
                </div>
                {typeDecl===v&&<span style={{color:C.blue,fontSize:20}}>●</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Checklist avant génération */}
        <SectionTitle icon="✅" label="Données requises"/>
        {[
          [!!visite?.gps,        "GPS parcelle capturé"],
          [!!visite?.essences?.length,"Essences renseignées"],
          [!!(visite?.volumeEstimeT||livraison?.poidsNet||livraison?.poidsBrut),"Tonnage renseigné"],
          [!!lot.commune,        "Commune renseignée"],
          [!!(visite?.redDistance||visite?.certification==="red"),"Données RED (certification visite)"],
          [!!livraison,          "Livraison enregistrée"],
        ].map(([ok,label],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,
            padding:"8px 0",borderBottom:`0.5px solid ${C.bd}`,
            color:ok?C.greenD:C.tx3}}>
            <span style={{fontSize:18,width:22}}>{ok?"✅":"⬜"}</span>
            <span style={{fontSize:13,fontWeight:ok?500:400}}>{label}</span>
          </div>
        ))}

        <div style={{background:C.blueL,borderRadius:12,padding:14,marginTop:14,
          border:`1px solid ${C.blue}`}}>
          <div style={{fontSize:12,color:C.blueD,lineHeight:1.7}}>
            ℹ️ Le document s'ouvrira dans un nouvel onglet.<br/>
            Utilisez <strong>Imprimer → Enregistrer en PDF</strong> pour archiver.
          </div>
        </div>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleGenerer} disabled={generating} bg="#185FA5" icon={generating?"":"🇪🇺"}>
          {generating?"Génération…":"GÉNÉRER LA DÉCLARATION RED"}
        </BigBtn>
      </div>
    </div>
  );
};

// Centroïdes département (fallback carte sans GPS visite)
const DEPT_CENTROIDS = {
  "01":[46.20,5.23],"02":[49.55,3.63],"03":[46.34,3.08],"04":[44.09,6.24],
  "05":[44.66,6.46],"06":[43.93,7.10],"07":[44.75,4.54],"08":[49.69,4.73],
  "09":[42.95,1.60],"10":[48.30,4.08],"11":[43.12,2.35],"12":[44.35,2.57],
  "13":[43.53,5.45],"14":[49.09,-0.37],"15":[45.05,2.63],"16":[45.69,0.16],
  "17":[45.75,-0.74],"18":[47.07,2.40],"19":[45.27,1.77],"21":[47.32,5.04],
  "22":[48.45,-2.90],"23":[46.00,2.02],"24":[45.15,0.72],"25":[47.24,6.02],
  "26":[44.72,5.05],"27":[49.03,1.15],"28":[48.44,1.49],"29":[48.23,-4.10],
  "2A":[41.86,9.01],"2B":[42.37,9.28],"30":[43.96,4.18],"31":[43.60,1.44],
  "32":[43.67,0.59],"33":[44.84,-0.58],"34":[43.61,3.88],"35":[48.11,-1.68],
  "36":[46.81,1.69],"37":[47.24,0.69],"38":[45.19,5.72],"39":[46.67,5.56],
  "40":[44.00,-0.75],"41":[47.59,1.33],"42":[45.44,4.39],"43":[45.04,3.89],
  "44":[47.24,-1.56],"45":[47.90,2.06],"46":[44.62,1.67],"47":[44.35,0.46],
  "48":[44.50,3.50],"49":[47.47,-0.55],"50":[49.11,-1.31],"51":[49.04,4.36],
  "52":[48.11,5.14],"53":[48.07,-0.77],"54":[48.69,6.18],"55":[48.99,5.38],
  "56":[47.83,-2.75],"57":[49.04,6.46],"58":[47.07,3.66],"59":[50.52,3.08],
  "60":[49.40,2.44],"61":[48.43,0.08],"62":[50.52,2.63],"63":[45.77,3.08],
  "64":[43.29,-0.37],"65":[43.23,0.08],"66":[42.70,2.89],"67":[48.58,7.75],
  "68":[47.75,7.34],"69":[45.76,4.83],"70":[47.63,6.16],"71":[46.64,4.52],
  "72":[47.99,0.19],"73":[45.48,6.56],"74":[46.06,6.39],"75":[48.86,2.35],
  "76":[49.44,1.09],"77":[48.62,2.99],"78":[48.80,1.98],"79":[46.65,-0.41],
  "80":[49.92,2.30],"81":[43.93,2.15],"82":[44.01,1.35],"83":[43.47,6.15],
  "84":[43.95,5.05],"85":[46.67,-1.43],"86":[46.58,0.34],"87":[45.83,1.26],
  "88":[48.17,6.46],"89":[47.80,3.56],"90":[47.64,6.85],"91":[48.63,2.26],
  "92":[48.86,2.25],"93":[48.92,2.46],"94":[48.78,2.46],"95":[49.05,2.10],
};
const gpsByDept = (cp: any) => {
  if (!cp) return null;
  const dept = String(cp).slice(0,2).toUpperCase();
  const c = (DEPT_CENTROIDS as Record<string,any>)[dept];
  return c ? {lat:c[0],lng:c[1]} : null;
};

// ── DONNÉES DÉMO CARTE ──────────────────────────────────────
const CHAUFFERIES_CARTE = [
  {id:"CF-001",label:"Chaufferie Moulins Urbaine",lat:46.5657,lng:3.3340,puissanceMW:12,statut:"en_service"},
  {id:"CF-002",label:"Chaufferie Vichy Réseau",lat:46.1290,lng:3.4267,puissanceMW:6,statut:"en_service"},
  {id:"CF-003",label:"Chaufferie Montluçon Bois",lat:46.3438,lng:2.6036,puissanceMW:8,statut:"maintenance"},
  {id:"CF-004",label:"Chaufferie Clermont-Ferrand Centre",lat:45.7766,lng:3.0870,puissanceMW:15,statut:"en_service"},
  {id:"CF-005",label:"Chaufferie Nevers Est",lat:46.9872,lng:3.1591,puissanceMW:4,statut:"en_service"},
];
const CHANTIERS_CARTE = [
  {id:"CH-2026-14",label:"Tronçais Est — Chêne/Charme",lat:46.6234,lng:2.7101,essence:"Chêne",statut:"en_cours",volumeT:95},
  {id:"CH-2026-12",label:"Bocage Nord — Haies Charme",lat:46.6812,lng:2.8934,essence:"Charme/Noisetier",statut:"terminé",volumeT:42},
  {id:"CH-2026-11",label:"Ternant — Douglas Éclaircie",lat:47.0341,lng:3.5821,essence:"Douglas",statut:"en_cours",volumeT:60},
  {id:"CH-2026-09",label:"Tronçais Sud — Pin sylvestre",lat:46.5912,lng:2.6892,essence:"Pin sylvestre",statut:"terminé",volumeT:185},
];
const TAS_INTER_CARTE = [
  {id:"TAS-001",label:"Tas Tronçais — Bord RD2144",lat:46.6112,lng:2.7298,
   commune:"Tronçais (03360)",essences:"Chêne/Charme",volumeT:78,humidite:34,
   dateConstitution:"2026-07-08",statut:"en_sechage",lots:["LOT-2026-044"],etf:"ETF BOIS SERVICE"},
  {id:"TAS-002",label:"Tas Cérilly — Route Forêt",lat:46.6543,lng:2.8701,
   commune:"Cérilly (03350)",essences:"Charme/Noisetier",volumeT:42,humidite:22,
   dateConstitution:"2026-06-29",statut:"pret",lots:["LOT-2026-038"],etf:"ETF BOIS SERVICE"},
  {id:"TAS-003",label:"Tas Ternant — Douglas",lat:47.0201,lng:3.5634,
   commune:"Ternant (58250)",essences:"Douglas",volumeT:55,humidite:28,
   dateConstitution:"2026-07-15",statut:"pret",lots:["LOT-2026-051"],etf:"Bois Val d'Allier"},
  {id:"TAS-004",label:"Tas Villefranche — Pin",lat:46.5788,lng:2.6645,
   commune:"Villefranche-d'Allier (03430)",essences:"Pin sylvestre",volumeT:120,humidite:18,
   dateConstitution:"2026-06-10",statut:"livre",lots:["LOT-2026-031"],etf:"ETF BOIS SERVICE"},
];

// ── ÉCRAN CARTE (Leaflet / OpenStreetMap) ────────────────────
export const EcranCarte = ({contacts, visites, onOpenLot}: any) => {
  const mapRef     = useRef<any>(null);
  const mapInst    = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const cfMarkersRef = useRef<any[]>([]);
  const chMarkersRef = useRef<any[]>([]);
  const tasMarkersRef = useRef<any[]>([]);
  const effisLayerRef  = useRef<any>(null);
  const tileLayerRef   = useRef<any>(null);
  const [filtre,       setFiltre]     = useState("TOUS");
  const [nbLots,       setNbLots]     = useState(0);
  const [couches,      setCouches]    = useState({lots:true,chaufferies:true,chantiers:true,tas:true,effis:false});
  const [effisCouche,  setEffisCouche] = useState<"fires"|"danger"|"perimeters">("fires");
  const [fondCarte,    setFondCarte]  = useState<"plan"|"satellite">("plan");
  const [tilesErreur,  setTilesErreur] = useState(false);

  const FONDS: Record<string,{url:string,attr:string,maxZoom:number}> = {
    plan: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributeurs',
      maxZoom: 19,
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attr: "© Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    },
  };

  // ── Init carte ──
  useEffect(()=>{
    if (!mapRef.current || mapInst.current) return;
    // Fix icônes Leaflet en prod (Vite supprime _getIconUrl)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
      iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
      shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
    });
    const map = L.map(mapRef.current,{
      center:[46.8,2.5], zoom:6,
      zoomControl:true,
    });
    map.attributionControl.setPrefix('');
    const fond = FONDS.plan;
    const tl = L.tileLayer(fond.url,{
      attribution: fond.attr,
      maxZoom: fond.maxZoom,
    });
    tl.on("tileerror", ()=>setTilesErreur(true));
    tl.on("tileload",  ()=>setTilesErreur(false));
    tileLayerRef.current = tl;
    tl.addTo(map);
    mapInst.current = map;
    return ()=>{ map.remove(); mapInst.current=null; tileLayerRef.current=null; };
  },[]);

  // ── Permutation fond de carte ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const fond = FONDS[fondCarte];
    setTilesErreur(false);
    const tl = L.tileLayer(fond.url,{
      attribution: fond.attr,
      maxZoom: fond.maxZoom,
    });
    tl.on("tileerror", ()=>setTilesErreur(true));
    tl.on("tileload",  ()=>setTilesErreur(false));
    tileLayerRef.current = tl;
    tl.addTo(map);
  },[fondCarte]);

  // ── Callback popup → fiche lot ──
  useEffect(()=>{
    (window as any).__aplt_open = (id: any)=>{
      const lot = contacts.find((c: any)=>c.id===id);
      if (lot) onOpenLot(lot);
    };
    return ()=>{ delete (window as any).__aplt_open; };
  },[contacts, onOpenLot]);


  // ── Mise à jour des markers ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;

    // Supprimer anciens markers
    markersRef.current.forEach(m=>map.removeLayer(m));
    markersRef.current = [];

    if (!couches.lots) { setNbLots(0); return; }

    const bounds: any[] = [];
    let count = 0;

    contacts.forEach((lot: any)=>{
      if (!lot.lotNumero) return;
      if (filtre!=="TOUS" && lot.statutLot!==filtre) return;
      const v = visites.find((vi: any)=>vi.lotId===lot.id||vi.lotNumero===lot.lotNumero);
      const gpsExact = lot.gps?.lat ? lot.gps : (v?.gps?.lat ? v.gps : null);
      const gps = gpsExact || gpsByDept(lot.codePostal);
      if (!gps?.lat) return;
      const approx = !gpsExact;

      const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;

      const icon = L.divIcon({
        className:"",
        iconSize:[32,32],
        iconAnchor:[16,16],
        popupAnchor:[0,-16],
        html:`<div style="width:32px;height:32px;border-radius:50%;background:${st.color};border:3px solid ${approx?"rgba(255,255,255,.5)":"#fff"};opacity:${approx?0.75:1};box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;">${approx?"📍":"🌲"}</div>`,
      });

      const popup = `
        <div style="font-family:-apple-system,sans-serif;min-width:200px;padding:2px">
          <div style="font-family:monospace;font-size:14px;font-weight:700;
            color:#1E5B3A;margin-bottom:4px">${lot.lotNumero}</div>
          <div style="font-size:13px;color:#1A1A18;font-weight:500">
            ${lot.nom}${lot.prenom?" "+lot.prenom:""}</div>
          <div style="font-size:12px;color:#5A5955;margin-top:2px">📍 ${lot.commune}</div>
          <div style="margin-top:6px">
            <span style="font-size:10px;padding:3px 8px;border-radius:12px;
              background:${st.bg};color:${st.color};font-weight:600">
              ${st.label}
            </span>
          </div>
          ${lot.surfaceHa?`<div style="font-size:11px;color:#9A9892;margin-top:6px">
            🌲 ${lot.surfaceHa} ha${v?.volumeEstimeT?" · 📦 "+fmtNum(v.volumeEstimeT)+" t":""}</div>`:""}
          ${v?.essences?.length?`<div style="font-size:11px;color:#9A9892;margin-top:2px">
            🌿 ${v.essences.map((e: any)=>e.label).join(", ")}</div>`:""}
          <button onclick="window.__aplt_open('${lot.id}')"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;
              background:#4CAF50;color:#fff;border:none;cursor:pointer;
              font-size:12px;font-weight:600;font-family:inherit;">
            Ouvrir la fiche →
          </button>
        </div>`;

      const marker = L.marker([gps.lat, gps.lng],{icon})
        .addTo(map)
        .bindPopup(popup,{maxWidth:240,className:"aplt-popup"});

      markersRef.current.push(marker);
      bounds.push([gps.lat, gps.lng]);
      count++;
    });

    setNbLots(count);
    if (bounds.length>0) {
      map.fitBounds(bounds,{padding:[40,40],maxZoom:13});
    }
  },[contacts, visites, filtre, couches.lots]);

  // ── Couche Chaufferies ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    cfMarkersRef.current.forEach(m=>map.removeLayer(m));
    cfMarkersRef.current = [];
    if (!couches.chaufferies) return;
    CHAUFFERIES_CARTE.forEach(cf=>{
      const icon = L.divIcon({
        className:"",iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-18],
        html:`<div style="width:34px;height:34px;border-radius:50%;background:#DC2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">🔥</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:180px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#DC2626;margin-bottom:4px">🔥 Chaufferie</div>
        <div style="font-weight:600;font-size:13px">${cf.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Puissance : <strong>${cf.puissanceMW} MW</strong></div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${cf.statut==="en_service"?"#D1FAE5":"#FEF3C7"};color:${cf.statut==="en_service"?"#065F46":"#92400E"};font-weight:600">${cf.statut==="en_service"?"✅ En service":"⚠️ Maintenance"}</span></div>
      </div>`;
      cfMarkersRef.current.push(L.marker([cf.lat,cf.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.chaufferies]);

  // ── Couche Chantiers ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    chMarkersRef.current.forEach(m=>map.removeLayer(m));
    chMarkersRef.current = [];
    if (!couches.chantiers) return;
    CHANTIERS_CARTE.forEach(ch=>{
      const enCours = ch.statut==="en_cours";
      const icon = L.divIcon({
        className:"",iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-18],
        html:`<div style="width:32px;height:32px;border-radius:8px;background:${enCours?"#92400E":"#6B7280"};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;">🪓</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:180px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:4px">🪓 Chantier</div>
        <div style="font-weight:600;font-size:13px">${ch.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">🌿 ${ch.essence} · 📦 ${ch.volumeT} t</div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${enCours?"#FEF3C7":"#E5E7EB"};color:${enCours?"#92400E":"#374151"};font-weight:600">${enCours?"🔧 En cours":"✅ Terminé"}</span></div>
      </div>`;
      chMarkersRef.current.push(L.marker([ch.lat,ch.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.chantiers]);

  // ── Couche Tas intermédiaires ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    tasMarkersRef.current.forEach(m=>map.removeLayer(m));
    tasMarkersRef.current = [];
    if (!couches.tas) return;
    const STATUT_TAS: Record<string,{bg:string,col:string,label:string,dot:string}> = {
      en_sechage:{bg:"#FEF3C7",col:"#92400E",label:"🌬️ En séchage",dot:"#F59E0B"},
      pret:       {bg:"#D1FAE5",col:"#065F46",label:"✅ Prêt",dot:"#10B981"},
      livre:      {bg:"#E5E7EB",col:"#374151",label:"📬 Livré",dot:"#6B7280"},
    };
    TAS_INTER_CARTE.forEach(tas=>{
      const st = STATUT_TAS[tas.statut]||STATUT_TAS.en_sechage;
      const icon = L.divIcon({
        className:"",iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-18],
        html:`<div style="width:30px;height:30px;border-radius:4px;background:${st.dot};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">📦</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:190px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:4px">📦 Tas intermédiaire</div>
        <div style="font-weight:600;font-size:13px">${tas.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">📍 ${tas.commune}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">🌿 ${tas.essences} · ⚖️ ${tas.volumeT} t</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">💧 Humidité : <strong>${tas.humidite}%</strong> · 🏭 ${tas.etf}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">📅 Constitué : ${new Date(tas.dateConstitution).toLocaleDateString("fr-FR")}</div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${st.bg};color:${st.col};font-weight:600">${st.label}</span></div>
      </div>`;
      tasMarkersRef.current.push(L.marker([tas.lat,tas.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.tas]);

  // ── Couche EFFIS WMS (feux actifs / danger / périmètres) ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    // Retire l'ancienne couche WMS quelle qu'elle soit
    if (effisLayerRef.current) {
      map.removeLayer(effisLayerRef.current);
      effisLayerRef.current = null;
    }
    if (!couches.effis) return;
    // URLs Copernicus GWIS (remplace l'ancien endpoint JRC ies-ows.jrc.ec.europa.eu)
    const EFFIS_ENDPOINTS: Record<string,{url:string,layer:string}> = {
      fires:      { url:"https://maps.effis.emergency.copernicus.eu/gwis",
                    layer:"activefires.viirs.fire" },
      danger:     { url:"https://maps.effis.emergency.copernicus.eu/gwis",
                    layer:"ecmwf.fwi" },
      perimeters: { url:"https://maps.effis.emergency.copernicus.eu/effis",
                    layer:"fireperimeters.recent" },
    };
    const ep = EFFIS_ENDPOINTS[effisCouche];
    const wms = L.tileLayer.wms(ep.url, {
      layers:      ep.layer,
      format:      "image/png",
      transparent: true,
      opacity:     0.70,
      version:     "1.3.0",
      attribution: "© <a href='https://effis.emergency.copernicus.eu/'>EFFIS / Copernicus</a>",
    });
    wms.addTo(map);
    effisLayerRef.current = wms;
  },[couches.effis, effisCouche]);

  const FILTRES = [
    ["TOUS","Tous"],
    ["VISITE_PREVUE","À visiter"],
    ["EN_COURS_EXPLOITATION","Exploitation"],
    ["BORD_ROUTE","Bord route"],
    ["EN_LIVRAISON","Transport"],
    ["LIVRE_CHAUFFERIE","Livré"],
  ];

  const LEGENDE = [
    ["NOUVEAU","#9A9892"],
    ["VISITE_PREVUE","#BA7517"],
    ["EN_COURS_EXPLOITATION","#185FA5"],
    ["BORD_ROUTE","#A66A2E"],
    ["EN_LIVRAISON","#534AB7"],
    ["LIVRE_CHAUFFERIE","#4CAF50"],
    ["ALERTE","#A32D2D"],
  ];
  const LEGENDE_TAS = [
    {color:"#F59E0B",label:"Tas en séchage",shape:"4px"},
    {color:"#10B981",label:"Tas prêt",shape:"4px"},
    {color:"#6B7280",label:"Tas livré",shape:"4px"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      {/* Couches */}
      <div style={{display:"flex",gap:5,padding:"5px 12px",overflowX:"auto",
        flexShrink:0,background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`,
        alignItems:"center",scrollbarWidth:"none"}}>
        <span style={{fontSize:9,color:C.tx3,flexShrink:0,fontWeight:700,
          textTransform:"uppercase",letterSpacing:"0.06em"}}>Couches</span>
        {([ ["lots","🌲","Lots"],["chaufferies","🔥","Chaufferies"],["chantiers","🪓","Chantiers"],["tas","📦","Tas"] ] as [keyof typeof couches,string,string][]).map(([k,icon,label])=>(
          <button key={k} onClick={()=>setCouches(c=>({...c,[k]:!c[k]}))} style={{
            height:24,padding:"0 9px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${couches[k]?C.green:C.bd}`,
            background:couches[k]?"#D1FAE5":"#fff",
            color:couches[k]?"#065F46":C.tx3,
            fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",
            display:"flex",alignItems:"center",gap:3,
            WebkitTapHighlightColor:"transparent"}}>
            <span>{icon}</span>{label}
          </button>
        ))}
        {/* Séparateur */}
        <div style={{width:1,height:18,background:C.bd,flexShrink:0,alignSelf:"center"}}/>
        {/* Toggle Plan / Satellite */}
        <div style={{display:"flex",borderRadius:12,overflow:"hidden",
          border:`1.5px solid ${C.bd}`,flexShrink:0}}>
          {([ ["plan","🗺️","Plan"], ["satellite","🛰️","Satellite"] ] as ["plan"|"satellite",string,string][]).map(([k,icon,label])=>(
            <button key={k} onClick={()=>setFondCarte(k)} style={{
              height:24,padding:"0 8px",whiteSpace:"nowrap",border:"none",
              background:fondCarte===k?"#1A3A5C":"#fff",
              color:fondCarte===k?"#fff":C.tx3,
              fontFamily:"inherit",fontSize:10,fontWeight:fondCarte===k?700:500,
              cursor:"pointer",display:"flex",alignItems:"center",gap:3,
              WebkitTapHighlightColor:"transparent"}}>
              {icon} {label}
            </button>
          ))}
        </div>
        {/* Séparateur */}
        <div style={{width:1,height:18,background:C.bd,flexShrink:0,alignSelf:"center"}}/>
        {/* Toggle EFFIS */}
        <button onClick={()=>setCouches(c=>({...c,effis:!c.effis}))} style={{
          height:24,padding:"0 9px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
          border:`1.5px solid ${couches.effis?"#EF4444":C.bd}`,
          background:couches.effis?"#FEE2E2":"#fff",
          color:couches.effis?"#B91C1C":C.tx3,
          fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",gap:3,
          WebkitTapHighlightColor:"transparent"}}>
          🔥 EFFIS
        </button>
        {/* Sous-sélecteur couche EFFIS */}
        {couches.effis&&([
          ["fires","🔴","Feux actifs"],
          ["danger","⚠️","Danger"],
          ["perimeters","📐","Périmètres"],
        ] as ["fires"|"danger"|"perimeters",string,string][]).map(([k,icon,label])=>(
          <button key={k} onClick={()=>setEffisCouche(k)} style={{
            height:24,padding:"0 8px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${effisCouche===k?"#EF4444":"#FECACA"}`,
            background:effisCouche===k?"#DC2626":"#FEF2F2",
            color:effisCouche===k?"#fff":"#B91C1C",
            fontFamily:"inherit",fontSize:10,fontWeight:effisCouche===k?700:500,
            cursor:"pointer",display:"flex",alignItems:"center",gap:3,
            WebkitTapHighlightColor:"transparent"}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Filtres statut lots */}
      <div style={{display:"flex",gap:6,padding:"8px 12px",overflowX:"auto",
        flexShrink:0,background:"#fff",borderBottom:`1px solid ${C.bd}`,
        scrollbarWidth:"none"}}>
        {FILTRES.map(([id,label])=>(
          <button key={id} onClick={()=>setFiltre(id)} style={{
            height:32,padding:"0 12px",borderRadius:16,whiteSpace:"nowrap",
            border:`1.5px solid ${filtre===id?C.green:C.bd}`,
            background:filtre===id?C.green:"#fff",
            color:filtre===id?"#fff":C.tx2,
            fontFamily:"inherit",fontSize:12,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",flexShrink:0}}>
            {label}
          </button>
        ))}
      </div>

      {/* Carte */}
      <div style={{flex:1,position:"relative"}}>
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>

        {/* Badge nb lots */}
        <div style={{position:"absolute",top:10,right:10,zIndex:1000,
          background:"#fff",borderRadius:20,padding:"5px 12px",
          boxShadow:"0 2px 8px rgba(0,0,0,.2)",fontSize:12,fontWeight:600,
          color:C.tx,border:`1px solid ${C.bd}`}}>
          {nbLots} lot{nbLots!==1?"s":""} {filtre!=="TOUS"?"filtré"+(nbLots>1?"s":""):""}
        </div>
        {/* Alerte fond de carte inaccessible */}
        {tilesErreur&&(
          <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
            zIndex:1000,background:"rgba(0,0,0,.7)",borderRadius:12,padding:"6px 14px",
            fontSize:11,color:"#fff",whiteSpace:"nowrap",pointerEvents:"none"}}>
            ⚠️ Fond de carte inaccessible (réseau)
          </div>
        )}
        {/* Badge EFFIS actif */}
        {couches.effis&&(
          <div style={{position:"absolute",top:10,left:10,zIndex:1000,
            background:"#DC2626",borderRadius:20,padding:"5px 12px",
            boxShadow:"0 2px 8px rgba(0,0,0,.3)",fontSize:11,fontWeight:700,
            color:"#fff",display:"flex",alignItems:"center",gap:5}}>
            🔥 EFFIS —&nbsp;
            {effisCouche==="fires"?"Feux actifs (VIIRS)":
             effisCouche==="danger"?"Danger incendie":
             "Périmètres récents"}
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{background:"#fff",borderTop:`1px solid ${C.bd}`,
        padding:"8px 12px",display:"flex",gap:10,flexShrink:0,
        overflowX:"auto",scrollbarWidth:"none"}}>
          {LEGENDE.map(([k,color])=>(
            <div key={k} style={{display:"flex",alignItems:"center",
              gap:5,flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:"50%",
                background:color,border:"1.5px solid #fff",
                boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              <span style={{fontSize:10,color:C.tx3,whiteSpace:"nowrap"}}>
                {STATUT_LOT[k]?.label||k}
              </span>
            </div>
          ))}
          {couches.tas&&<>
            <div style={{width:1,background:C.bd,flexShrink:0,margin:"0 2px"}}/>
            {LEGENDE_TAS.map(t=>(
              <div key={t.label} style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:t.shape,background:t.color,
                  border:"1.5px solid #fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                <span style={{fontSize:10,color:C.tx3,whiteSpace:"nowrap"}}>{t.label}</span>
              </div>
            ))}
          </>}
        </div>
    </div>
  );
};

