// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C } from "../../design-system/tokens.js";
import { IS_DEMO_BUILD } from "../../config/env.js";
import { uid, nowISO } from "../../shared/utils.js";
import { indicesPonderes } from "../../metier/formules.js";
import { BigBtn, SectionTitle, CheckItem } from "../../shared/ui.jsx";

export const MapZonesProtegees = ({gps}: any) => {
  const divRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  useEffect(()=>{
    if(!gps||!divRef.current) return;
    if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
    const init=()=>{
      const L=(window as any).L;
      const map=L.map(divRef.current,{zoomControl:true,attributionControl:false})
        .setView([gps.lat,gps.lng],12);
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

      // Zones protégées via Overpass
      const rad=15000, olat=gps.lat, olng=gps.lng;
      const oq=`[out:json][timeout:25];(way["natural"="wetland"](around:${rad},${olat},${olng});way["leisure"="nature_reserve"](around:${rad},${olat},${olng});way["boundary"="protected_area"](around:${rad},${olat},${olng}););out geom;`;
      const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
      const tryFetch=(urls: any): any =>{
        if(!urls.length) return Promise.resolve(null);
        return fetch(urls[0],{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(oq)})
          .then(r=>r.text()).then(txt=>{
            try{return JSON.parse(txt);}
            catch{return tryFetch(urls.slice(1));}
          }).catch(()=>tryFetch(urls.slice(1)));
      };
      tryFetch(endpoints).then((data: any)=>{
        if(!data?.elements||!mapRef.current) return;
        let n=0;
        data.elements.forEach((el: any)=>{
          try{
            if(!el.geometry?.length||el.geometry.length<3) return;
            const wet=el.tags?.natural==='wetland';
            const bog=['bog','fen','marsh','swamp'].includes(el.tags?.wetland);
            const color=bog?'#5D4037':wet?'#1565C0':'#2E7D32';
            const name=el.tags?.name||el.tags?.['name:fr']||(bog?'Tourbière/Marais':wet?'Zone humide':'Réserve naturelle');
            const label=bog?'🟤 Tourbière/Marais':wet?'🔵 Zone humide':'🟢 Aire protégée';
            L.polygon(el.geometry.map((p: any)=>[p.lat,p.lon]),{
              color,weight:2,fillColor:color,fillOpacity:0.22,opacity:0.85
            }).bindPopup(`<b>${name}</b><br/>${label}`).addTo(mapRef.current);
            n++;
          } catch { /* noop */ }
        });
        if(n===0&&mapRef.current){
          L.control.scale().addTo(mapRef.current);
        }
      });
      const icon=L.divIcon({
        html:'<div style="background:#E53935;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>',
        iconSize:[20,20],iconAnchor:[10,10],className:''
      });
      L.marker([gps.lat,gps.lng],{icon}).addTo(map)
        .bindPopup(`📍 ${gps.lat.toFixed(5)}°N · ${gps.lng.toFixed(5)}°E`).openPopup();
    };
    if((window as any).L){init();}
    else{
      const lk=document.createElement('link');
      lk.rel='stylesheet';lk.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(lk);
      const sc=document.createElement('script');
      sc.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      sc.onload=init;document.head.appendChild(sc);
    }
    return()=>{if(mapRef.current){mapRef.current.remove();mapRef.current=null;}};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gps?.lat,gps?.lng]); // plus pr�cis que gps (objet) : re-render seulement si les coordonn�es changent
  if(!gps) return null;
  return(
    <div style={{borderRadius:12,overflow:'hidden',marginTop:16,marginBottom:8,
      border:'1.5px solid #90CAF9',boxShadow:'0 2px 8px rgba(0,0,0,.1)'}}>
      <div style={{background:'#1565C0',color:'#fff',padding:'8px 14px',
        fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
        🗺️ Carte — Zones protégées à proximité
      </div>
      <div ref={divRef} style={{height:280}}/>
      <div style={{padding:'8px 14px',background:'#E3F2FD',fontSize:11,
        display:'flex',gap:14,flexWrap:'wrap',color:'#1565C0'}}>
        <span>🟣 Natura 2000</span>
        <span>🔵 Zones humides</span>
        <span>🟤 Tourbières</span>
        <span style={{marginLeft:'auto',opacity:.6}}>Source : INPN · IGN</span>
      </div>
    </div>
  );
};

export const GpsWidget = ({value,onChange}: any) => {
  const [loading,setLoading] = useState(false);
  const capture = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { onChange({lat:pos.coords.latitude,lng:pos.coords.longitude,
          accuracy:pos.coords.accuracy,source:"gps"}); setLoading(false); },
        () => {
          if (IS_DEMO_BUILD) {
            onChange({lat:47.98+(Math.random()-.5)*.02,lng:3.09+(Math.random()-.5)*.02,source:"sim"});
          }
          setLoading(false);
        },
        {enableHighAccuracy:true,timeout:10000}
      );
    } else {
      if (IS_DEMO_BUILD) onChange({lat:47.98,lng:3.09,source:"sim"});
      setLoading(false);
    }
  };
  if (value) return (
    <div style={{background:C.greenL,borderRadius:12,padding:"14px",
      marginBottom:14,border:`1.5px solid ${C.green}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,color:C.greenD,fontWeight:600,marginBottom:3}}>
            📍 {value.source==="gps"?"GPS précis":"Position approximative"}
          </div>
          <div style={{fontFamily:"monospace",fontSize:13,color:C.greenD}}>
            {value.lat.toFixed(5)}°N · {value.lng.toFixed(5)}°E
          </div>
        </div>
        <button onClick={()=>onChange(null)} style={{background:"rgba(8,80,65,.15)",
          border:"none",color:C.greenD,cursor:"pointer",fontSize:20,padding:8,
          borderRadius:8,WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    </div>
  );
  return (
    <div style={{marginBottom:14}}>
      <BigBtn onClick={capture} bg={loading?C.bg2:C.greenL}
        color={loading?C.tx3:C.greenD} icon={loading?"":"📍"}>
        {loading?"Localisation…":"Capturer GPS"}
      </BigBtn>
    </div>
  );
};

// CheckItem importé depuis ./shared/ui.jsx

export const PhotosWidget = ({photos,onChange,required=2}: any) => {
  const fileRef = useRef<any>(null);
  const [pendingType, setPendingType] = useState<string|null>(null);
  const EMOJIS: Record<string,string> = {face:"📷",profil:"📸",zone:"🌳",acces:"🛤️",autre:"🖼️"};

  const capturePhoto = (type: string) => {
    if (IS_DEMO_BUILD) {
      onChange([...photos,{id:uid(),type,emoji:EMOJIS[type]||"📷",capturedAt:nowISO()}]);
    } else {
      setPendingType(type);
      fileRef.current?.click();
    }
  };

  const onFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !pendingType) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange([...photos,{
        id:uid(), type:pendingType,
        emoji:EMOJIS[pendingType]||"📷",
        capturedAt:nowISO(),
        dataUrl: ev.target?.result as string,
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setPendingType(null);
  };

  return (
    <div>
      {/* Input caméra natif — déclenche la permission sur mobile */}
      {!IS_DEMO_BUILD && (
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={onFileChange}
          style={{display:"none"}} />
      )}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        {photos.map((p: any)=>(
          <div key={p.id} style={{position:"relative"}}>
            <div style={{width:72,height:72,borderRadius:12,overflow:"hidden",
              background:C.greenL, border:`1.5px solid ${C.green}`,
              display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",fontSize:26}}>
              {p.dataUrl
                ? <img src={p.dataUrl} alt={p.type}
                    style={{width:"100%",height:"100%",objectFit:"cover"}} />
                : <>{p.emoji}<div style={{fontSize:9,color:C.greenD,marginTop:3}}>{p.type}</div></>
              }
            </div>
            <button onClick={()=>onChange(photos.filter((x: any)=>x.id!==p.id))}
              style={{position:"absolute",top:-6,right:-6,width:20,height:20,
                borderRadius:"50%",background:C.red,color:"#fff",border:"2px solid #fff",
                cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",
                justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
        {[["face","📷 Face"],["profil","📸 Profil"],["zone","🌳 Zone"],
          ["acces","🛤️ Accès"],["autre","🖼️ Autre"]].map(([type,label])=>(
          <button key={type} onClick={()=>capturePhoto(type)} style={{height:44,borderRadius:10,
            border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",
            fontFamily:"inherit",fontSize:11,color:C.tx2,display:"flex",
            alignItems:"center",justifyContent:"center",gap:4,
            WebkitTapHighlightColor:"transparent"}}>{label}</button>
        ))}
      </div>
      <BigBtn onClick={()=>capturePhoto("face")} bg="#111" color="#fff" icon="📷">
        Prendre une photo
      </BigBtn>
      <div style={{fontSize:12,color:photos.length>=required?C.greenD:C.amber,
        textAlign:"center",marginTop:6}}>
        {photos.length}/{required} photos{photos.length>=required?" ✓":""}
      </div>
    </div>
  );
};

// Répertoire des essences (source ITEBE 2004) — feuillus + résineux
const LISTE_ESSENCES_ITEBE = [
  ["chene","🌳","Chêne"],["charme","🌿","Charme"],["hetre","🌲","Hêtre"],
  ["frene","🍃","Frêne"],["orme","🌿","Orme"],["acacia","🌿","Acacia"],
  ["bouleau","🪵","Bouleau"],["chataignier","🌰","Châtaignier"],
  ["fruitiers","🍒","Fruitiers"],["erables","🍁","Érables"],
  ["tilleul","🌿","Tilleul"],["aulne","🌿","Aulne"],
  ["peupliers","🌾","Peupliers"],["saule","🌿","Saule"],
  ["pin_sylvestre","🌲","Pin sylvestre"],["pin_maritime","🌲","Pin maritime"],
  ["sapin","🌲","Sapin"],["epicea","🌲","Épicéa"],["meleze","🌲","Mélèze"],
  ["douglas","🌲","Douglas"],["melange","🌳","Mélange"],
];

// Indices ITEBE importés depuis src/metier/formules.js (source unique ITEBE 2004)

// indicesPonderes et poidsAjusteHumidite importés depuis src/metier/formules.js

export const EssenceEditor = ({essences,onChange}: any) => {
  const LISTE = LISTE_ESSENCES_ITEBE;
  const total = essences.reduce((s: any,e: any)=>s+e.pct,0);
  const addEssence = () => {
    if (total>=100) return;
    const used = new Set(essences.map((e: any)=>e.id));
    const next = LISTE.find(([v])=>!used.has(v));
    if (!next) return;
    onChange([...essences,{id:next[0],emoji:next[1],label:next[2],pct:Math.max(0,100-total)}]);
  };
  const setPct = (i: any,val: any) => {
    const autresTotal = essences.reduce((s: any,e: any,j: any)=>j===i?s:s+e.pct,0);
    const maxAutorise = Math.max(0,100-autresTotal);
    const clamped = Math.min(parseInt(val)||0, maxAutorise);
    onChange(essences.map((x: any,j: any)=>j===i?{...x,pct:clamped}:x));
  };
  return (
    <div>
      {essences.map((e: any,i: any)=>(
        <div key={e.id} style={{background:C.bg2,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:22}}>{e.emoji}</span>
            <select value={e.id} onChange={(ev: any)=>{
              const found=LISTE.find(([v])=>v===ev.target.value);
              onChange(essences.map((x: any,j: any)=>j===i?{...x,id:ev.target.value,
                emoji:found?.[1]||"🌳",label:found?.[2]||""}:x));
            }} style={{flex:1,height:44,padding:"0 10px",borderRadius:9,
              border:`1px solid ${C.bd}`,fontSize:14,fontFamily:"inherit",
              background:"#fff",outline:"none"}}>
              {LISTE.map(([v,em,l])=><option key={v} value={v}>{em} {l}</option>)}
            </select>
            <button onClick={()=>onChange(essences.filter((_: any,j: any)=>j!==i))}
              style={{width:36,height:36,borderRadius:8,background:C.redL,
                color:C.red,border:"none",cursor:"pointer",fontSize:18,
                WebkitTapHighlightColor:"transparent"}}>✕</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="range" min={0} max={100} value={e.pct}
              onChange={ev=>setPct(i,ev.target.value)}
              style={{flex:1,accentColor:C.green}}/>
            <div style={{width:48,textAlign:"center",fontWeight:700,fontSize:16,color:C.green}}>
              {e.pct}%
            </div>
          </div>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <button onClick={addEssence} disabled={total>=100} style={{height:44,padding:"0 16px",borderRadius:10,
          background:total>=100?C.bg2:C.greenL,color:total>=100?C.tx3:C.greenD,
          border:"none",cursor:total>=100?"default":"pointer",
          fontFamily:"inherit",fontSize:14,fontWeight:500,
          WebkitTapHighlightColor:"transparent"}}>+ Ajouter</button>
        <div style={{fontSize:20,fontWeight:800,padding:"6px 14px",borderRadius:10,
          background:Math.abs(total-100)<=1?C.greenL:C.redL,
          color:Math.abs(total-100)<=1?C.greenD:C.red}}>
          Σ {total}% {Math.abs(total-100)>1&&"⚠"}
        </div>
      </div>
    </div>
  );
};

// ── CHECK-LIST CHANTIER ───────────────────────────────────────
const CHECKLIST_ITEMS = [
  {
    cat:"🦺 Sécurité & EPI",
    color:"#B71C1C", bg:"#FFEBEE", border:"#EF9A9A",
    items:[
      "EPI complets disponibles (casque, gants, chaussures de sécurité, gilet)",
      "Trousse de premiers secours à bord du véhicule",
      "Numéros d'urgence affichés (15 · 18 · 112)",
      "Zone de travail balisée (rubalise ou panneaux)",
      "Vérification météo : pas de vent fort prévu > 60 km/h",
    ]
  },
  {
    cat:"📋 Documents & autorisations",
    color:"#1565C0", bg:"#E3F2FD", border:"#90CAF9",
    items:[
      "Contrat ou bon de commande signé en possession",
      "Plan de chantier / carte de la parcelle disponible",
      "Autorisation d'exploitation (coupe) validée",
      "Déclaration de travaux transmise si > 5 ha",
      "Fiche de visite APPLITAG complète et validée",
    ]
  },
  {
    cat:"🚛 Logistique & accès",
    color:"#4E342E", bg:"#EFEBE9", border:"#BCAAA4",
    items:[
      "Accès engin vérifié (largeur, hauteur, portance sol)",
      "Propriétaire/gestionnaire informé de la date de démarrage",
      "Riverains prévenus si risque de perturbation",
      "Aire de retournement et stockage bois repérée",
      "Clés / codes d'accès barrière récupérés",
      "Modification temporaire de la circulation valide en possession",
    ]
  },
  {
    cat:"🌲 Parcelle & marquage",
    color:"#2E7D32", bg:"#E8F5E9", border:"#A5D6A7",
    items:[
      "Arbres à abattre marqués (peinture ou ruban)",
      "Arbres à conserver / semenciers identifiés",
      "Limites parcellaires vérifiées sur le terrain",
      "Cours d'eau et zones humides repérés (≥ 5 m de recul)",
      "Arbres dangereux ou en équilibre instable signalés",
    ]
  },
  {
    cat:"🪓 Matériel & engins",
    color:"#6A1B9A", bg:"#F3E5F5", border:"#CE93D8",
    operateur:true,
    items:[
      "Engins vérifiés et en bon état de marche",
      "Niveaux huile / carburant faits",
      "Kit anti-pollution (absorbant) à bord en cas de fuite",
      "Outillage de coupe affûté et fonctionnel",
      "Câbles / sangles de débardage vérifiés",
    ]
  },
  {
    cat:"♻️ Environnement",
    color:"#00695C", bg:"#E0F2F1", border:"#80CBC4",
    items:[
      "Saison de coupe respectée (hors nidification mars–août si possible)",
      "Pas d'espèces protégées identifiées sur la parcelle",
      "Cloisonnements sylvicoles définis pour limiter le tassement",
      "Branchages / rémanents destinés au maintien de la biodiversité",
      "Plan de replantation prévu et enregistré",
    ]
  },
];

export const ChecklistChantier = ({showOperateur=false}) => {
  const [checked, setChecked] = useState(()=>{
    const saved = sessionStorage.getItem("checklist_chantier");
    return saved ? JSON.parse(saved) : {};
  });
  const toggle = (key: any) => {
    setChecked((prev: any)=>{
      const next = {...prev, [key]:!prev[key]};
      sessionStorage.setItem("checklist_chantier", JSON.stringify(next));
      return next;
    });
  };
  const visibleCats = CHECKLIST_ITEMS.filter(c=>showOperateur?true:!c.operateur);
  const total = visibleCats.reduce((s,c)=>s+c.items.length, 0);
  const done  = Object.values(checked).filter(Boolean).length;
  const pct   = Math.round(done/total*100);
  return (
    <div>
      <SectionTitle icon="☑️" label="Check-list avant démarrage chantier"/>
      <div style={{marginBottom:16,padding:"12px 14px",borderRadius:12,
        background: pct===100?"#E8F5E9":"#FFF8E1",
        border:`1.5px solid ${pct===100?"#A5D6A7":"#FFE082"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700,color:pct===100?"#2E7D32":"#F57F17"}}>
            {pct===100?"✅ Chantier prêt à démarrer !":"⚠️ Vérifications en cours…"}
          </div>
          <div style={{fontSize:14,fontWeight:800,color:pct===100?"#2E7D32":"#E65100"}}>
            {done} / {total}
          </div>
        </div>
        <div style={{height:8,borderRadius:4,background:"rgba(0,0,0,.08)"}}>
          <div style={{height:8,borderRadius:4,
            background:pct===100?"#43A047":"#FFA000",
            width:`${pct}%`,transition:"width .3s"}}/>
        </div>
      </div>
      {!showOperateur&&(
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:14,
          padding:"10px 12px",borderRadius:10,
          background:"#EDE7F6",border:"1px solid #CE93D8"}}>
          <span style={{fontSize:16}}>👷</span>
          <div style={{fontSize:12,color:"#4A148C",lineHeight:1.5}}>
            La section <b>Matériel & engins</b> est à compléter par l'opérateur depuis son interface.
          </div>
        </div>
      )}
      {visibleCats.map((cat)=>(
        <div key={cat.cat} style={{marginBottom:14,borderRadius:12,overflow:"hidden",
          border:`1px solid ${cat.border}`}}>
          <div style={{padding:"10px 14px",background:cat.bg,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:700,color:cat.color}}>{cat.cat}</span>
            {cat.operateur&&(
              <span style={{fontSize:11,fontWeight:700,
                background:"#6A1B9A",color:"#fff",
                padding:"2px 8px",borderRadius:10,letterSpacing:.3}}>
                👷 Opérateur
              </span>
            )}
          </div>
          <div style={{background:"#fff"}}>
            {cat.items.map((item,i)=>{
              const key=`${cat.cat}__${i}`;
              const ok=!!checked[key];
              return (
                <div key={key} onClick={()=>toggle(key)}
                  style={{display:"flex",alignItems:"flex-start",gap:12,
                    padding:"11px 14px",cursor:"pointer",
                    borderTop:i>0?`1px solid ${C.bd}`:"none",
                    background:ok?"rgba(232,245,233,.5)":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flexShrink:0,marginTop:1,width:22,height:22,borderRadius:6,
                    border:`2px solid ${ok?cat.color:C.bd}`,
                    background:ok?cat.color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {ok&&<span style={{color:"#fff",fontSize:13,fontWeight:900,lineHeight:1}}>✓</span>}
                  </div>
                  <div style={{fontSize:13,lineHeight:1.5,color:ok?C.tx3:C.tx,
                    textDecoration:ok?"line-through":"none",flex:1}}>
                    {item}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const STEPS = [
  {id:"admin",         label:"Rens. Admin.",    icon:"📋", color:C.blue},
  {id:"gps",           label:"GPS",           icon:"📍", color:C.green},
  {id:"photos",        label:"Photos",        icon:"📷", color:C.purple},
  {id:"biomasse",      label:"Type biomasse",  icon:"🍃", color:"#558B2F"},
  {id:"contraintes",   label:"Contraintes terrain", icon:"⚠️", color:C.red},
  {id:"acces",         label:"Accès logistique", icon:"🚛", color:C.brown},
  {id:"plateforme",    label:"Plateforme stockage", icon:"🏗️", color:C.purple},
  {id:"replantation",  label:"Replantation",  icon:"🌱", color:C.green},
  {id:"certification", label:"Certif.",       icon:"🏅", color:C.blue},
  {id:"reglementation",label:"Réglmt.",       icon:"⚖️", color:"#7C3AED"},
  {id:"finance",       label:"Finance",       icon:"💶", color:C.amber},
];

const DRAFT_KEY = "applitag_visite_draft";

// ⚠ NON_VALIDEE (formules.js:FORMULE_CUBAGE_CYLINDRE) — formule cylindrique sans coefficient de forme Vf ;
// surestime le volume réel de 40-150%. Utiliser tarifs de cubage INRAE pour usage probant.
const calcVolumeParHa = (popParHa: any, diametreMoyenCm: any, surfaceHa: any, indices: any) => {
  const nbTigesHa = parseFloat(popParHa)||0;
  const dM = (parseFloat(diametreMoyenCm)||0)/100;
  const volUnitaireM3 = (Math.PI/4) * dM*dM * (indices?.hauteurMoy||20);
  const volTotalM3 = volUnitaireM3 * nbTigesHa * (parseFloat(surfaceHa)||0);
  const poidsTonnes = volTotalM3 * (indices?.densite||950) / 1000;
  return Math.round(poidsTonnes*100)/100;
};

