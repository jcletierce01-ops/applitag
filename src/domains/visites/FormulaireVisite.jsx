import { useState, useEffect, useRef } from "react";
import { C, BTN_H, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { IS_DEMO_BUILD } from "../../config/env.js";
import { uid, nowISO, todayS } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { indicesPonderes } from "../../metier/formules.js";
import { apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider, CheckItem } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { TEXTES_REGL, CLAUSE_RESERVE, STATUT_REGL, VSS_RECONNUS } from "../../domains/dashboard/sections.constants.js";
export const MapZonesProtegees = ({gps}) => {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  useEffect(()=>{
    if(!gps||!divRef.current) return;
    if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
    const init=()=>{
      const L=window.L;
      const map=L.map(divRef.current,{zoomControl:true,attributionControl:false})
        .setView([gps.lat,gps.lng],12);
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

      // Zones protÃ©gÃ©es via Overpass
      const rad=15000, olat=gps.lat, olng=gps.lng;
      const oq=`[out:json][timeout:25];(way["natural"="wetland"](around:${rad},${olat},${olng});way["leisure"="nature_reserve"](around:${rad},${olat},${olng});way["boundary"="protected_area"](around:${rad},${olat},${olng}););out geom;`;
      const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
      const tryFetch=(urls)=>{
        if(!urls.length) return Promise.resolve(null);
        return fetch(urls[0],{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(oq)})
          .then(r=>r.text()).then(txt=>{
            try{return JSON.parse(txt);}
            catch{return tryFetch(urls.slice(1));}
          }).catch(()=>tryFetch(urls.slice(1)));
      };
      tryFetch(endpoints).then(data=>{
        if(!data?.elements||!mapRef.current) return;
        let n=0;
        data.elements.forEach(el=>{
          try{
            if(!el.geometry?.length||el.geometry.length<3) return;
            const wet=el.tags?.natural==='wetland';
            const bog=['bog','fen','marsh','swamp'].includes(el.tags?.wetland);
            const _res=el.tags?.leisure==='nature_reserve'||el.tags?.boundary==='protected_area';
            const color=bog?'#5D4037':wet?'#1565C0':'#2E7D32';
            const name=el.tags?.name||el.tags?.['name:fr']||(bog?'TourbiÃ¨re/Marais':wet?'Zone humide':'RÃ©serve naturelle');
            const label=bog?'ðŸŸ¤ TourbiÃ¨re/Marais':wet?'ðŸ”µ Zone humide':'ðŸŸ¢ Aire protÃ©gÃ©e';
            L.polygon(el.geometry.map(p=>[p.lat,p.lon]),{
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
        .bindPopup(`ðŸ“ ${gps.lat.toFixed(5)}Â°N Â· ${gps.lng.toFixed(5)}Â°E`).openPopup();
    };
    if(window.L){init();}
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
  },[gps?.lat,gps?.lng]); // plus précis que gps (objet) : re-render seulement si les coordonnées changent
  if(!gps) return null;
  return(
    <div style={{borderRadius:12,overflow:'hidden',marginTop:16,marginBottom:8,
      border:'1.5px solid #90CAF9',boxShadow:'0 2px 8px rgba(0,0,0,.1)'}}>
      <div style={{background:'#1565C0',color:'#fff',padding:'8px 14px',
        fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
        ðŸ—ºï¸ Carte â€” Zones protÃ©gÃ©es Ã  proximitÃ©
      </div>
      <div ref={divRef} style={{height:280}}/>
      <div style={{padding:'8px 14px',background:'#E3F2FD',fontSize:11,
        display:'flex',gap:14,flexWrap:'wrap',color:'#1565C0'}}>
        <span>ðŸŸ£ Natura 2000</span>
        <span>ðŸ”µ Zones humides</span>
        <span>ðŸŸ¤ TourbiÃ¨res</span>
        <span style={{marginLeft:'auto',opacity:.6}}>Source : INPN Â· IGN</span>
      </div>
    </div>
  );
};

export const GpsWidget = ({value,onChange,_required}) => {
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
            ðŸ“ {value.source==="gps"?"GPS prÃ©cis":"Position approximative"}
          </div>
          <div style={{fontFamily:"monospace",fontSize:13,color:C.greenD}}>
            {value.lat.toFixed(5)}Â°N Â· {value.lng.toFixed(5)}Â°E
          </div>
        </div>
        <button onClick={()=>onChange(null)} style={{background:"rgba(8,80,65,.15)",
          border:"none",color:C.greenD,cursor:"pointer",fontSize:20,padding:8,
          borderRadius:8,WebkitTapHighlightColor:"transparent"}}>âœ•</button>
      </div>
    </div>
  );
  return (
    <div style={{marginBottom:14}}>
      <BigBtn onClick={capture} bg={loading?C.bg2:C.greenL}
        color={loading?C.tx3:C.greenD} icon={loading?"":"ðŸ“"}>
        {loading?"Localisationâ€¦":"Capturer GPS"}
      </BigBtn>
    </div>
  );
};

// CheckItem importÃ© depuis ./shared/ui.jsx

export const PhotosWidget = ({photos,onChange,required=2}) => {
  const addPhoto = (type) => {
    const emojis = {face:"ðŸ“·",profil:"ðŸ“¸",zone:"ðŸŒ³",acces:"ðŸ›¤ï¸",autre:"ðŸ–¼ï¸"};
    onChange([...photos,{id:uid(),type,emoji:emojis[type]||"ðŸ“·",capturedAt:nowISO()}]);
  };
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        {photos.map(p=>(
          <div key={p.id} style={{position:"relative"}}>
            <div style={{width:72,height:72,borderRadius:12,background:C.greenL,
              border:`1.5px solid ${C.green}`,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",fontSize:26}}>
              {p.emoji}
              <div style={{fontSize:9,color:C.greenD,marginTop:3}}>{p.type}</div>
            </div>
            <button onClick={()=>onChange(photos.filter(x=>x.id!==p.id))}
              style={{position:"absolute",top:-6,right:-6,width:20,height:20,
                borderRadius:"50%",background:C.red,color:"#fff",border:"2px solid #fff",
                cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",
                justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>âœ•</button>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
        {[["face","ðŸ“· Face"],["profil","ðŸ“¸ Profil"],["zone","ðŸŒ³ Zone"],
          ["acces","ðŸ›¤ï¸ AccÃ¨s"],["autre","ðŸ–¼ï¸ Autre"]].map(([type,label])=>(
          <button key={type} onClick={()=>addPhoto(type)} style={{height:44,borderRadius:10,
            border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",
            fontFamily:"inherit",fontSize:11,color:C.tx2,display:"flex",
            alignItems:"center",justifyContent:"center",gap:4,
            WebkitTapHighlightColor:"transparent"}}>{label}</button>
        ))}
      </div>
      <BigBtn onClick={()=>addPhoto("face")} bg="#111" color="#fff" icon="ðŸ“·">
        Prendre une photo
      </BigBtn>
      <div style={{fontSize:12,color:photos.length>=required?C.greenD:C.amber,
        textAlign:"center",marginTop:6}}>
        {photos.length}/{required} photos{photos.length>=required?" âœ“":""}
      </div>
    </div>
  );
};

// RÃ©pertoire des essences (source ITEBE 2004) â€” feuillus + rÃ©sineux
const LISTE_ESSENCES_ITEBE = [
  ["chene","ðŸŒ³","ChÃªne"],["charme","ðŸŒ¿","Charme"],["hetre","ðŸŒ²","HÃªtre"],
  ["frene","ðŸƒ","FrÃªne"],["orme","ðŸŒ¿","Orme"],["acacia","ðŸŒ¿","Acacia"],
  ["bouleau","ðŸªµ","Bouleau"],["chataignier","ðŸŒ°","ChÃ¢taignier"],
  ["fruitiers","ðŸ’","Fruitiers"],["erables","ðŸ","Ã‰rables"],
  ["tilleul","ðŸŒ¿","Tilleul"],["aulne","ðŸŒ¿","Aulne"],
  ["peupliers","ðŸŒ¾","Peupliers"],["saule","ðŸŒ¿","Saule"],
  ["pin_sylvestre","ðŸŒ²","Pin sylvestre"],["pin_maritime","ðŸŒ²","Pin maritime"],
  ["sapin","ðŸŒ²","Sapin"],["epicea","ðŸŒ²","Ã‰picÃ©a"],["meleze","ðŸŒ²","MÃ©lÃ¨ze"],
  ["douglas","ðŸŒ²","Douglas"],["melange","ðŸŒ³","MÃ©lange"],
];

// Indices ITEBE importÃ©s depuis src/metier/formules.js (source unique ITEBE 2004)

// indicesPonderes et poidsAjusteHumidite importÃ©s depuis src/metier/formules.js

export const EssenceEditor = ({essences,onChange}) => {
  const LISTE = LISTE_ESSENCES_ITEBE;
  const total = essences.reduce((s,e)=>s+e.pct,0);
  const addEssence = () => {
    if (total>=100) return;
    const used = new Set(essences.map(e=>e.id));
    const next = LISTE.find(([v])=>!used.has(v));
    if (!next) return;
    onChange([...essences,{id:next[0],emoji:next[1],label:next[2],pct:Math.max(0,100-total)}]);
  };
  const setPct = (i,val) => {
    const autresTotal = essences.reduce((s,e,j)=>j===i?s:s+e.pct,0);
    const maxAutorise = Math.max(0,100-autresTotal);
    const clamped = Math.min(parseInt(val)||0, maxAutorise);
    onChange(essences.map((x,j)=>j===i?{...x,pct:clamped}:x));
  };
  return (
    <div>
      {essences.map((e,i)=>(
        <div key={e.id} style={{background:C.bg2,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:22}}>{e.emoji}</span>
            <select value={e.id} onChange={ev=>{
              const found=LISTE.find(([v])=>v===ev.target.value);
              onChange(essences.map((x,j)=>j===i?{...x,id:ev.target.value,
                emoji:found?.[1]||"ðŸŒ³",label:found?.[2]||""}:x));
            }} style={{flex:1,height:44,padding:"0 10px",borderRadius:9,
              border:`1px solid ${C.bd}`,fontSize:14,fontFamily:"inherit",
              background:"#fff",outline:"none"}}>
              {LISTE.map(([v,em,l])=><option key={v} value={v}>{em} {l}</option>)}
            </select>
            <button onClick={()=>onChange(essences.filter((_,j)=>j!==i))}
              style={{width:36,height:36,borderRadius:8,background:C.redL,
                color:C.red,border:"none",cursor:"pointer",fontSize:18,
                WebkitTapHighlightColor:"transparent"}}>âœ•</button>
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
          Î£ {total}% {Math.abs(total-100)>1&&"âš "}
        </div>
      </div>
    </div>
  );
};

// â”€â”€ CHECK-LIST CHANTIER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHECKLIST_ITEMS = [
  {
    cat:"ðŸ¦º SÃ©curitÃ© & EPI",
    color:"#B71C1C", bg:"#FFEBEE", border:"#EF9A9A",
    items:[
      "EPI complets disponibles (casque, gants, chaussures de sÃ©curitÃ©, gilet)",
      "Trousse de premiers secours Ã  bord du vÃ©hicule",
      "NumÃ©ros d'urgence affichÃ©s (15 Â· 18 Â· 112)",
      "Zone de travail balisÃ©e (rubalise ou panneaux)",
      "VÃ©rification mÃ©tÃ©o : pas de vent fort prÃ©vu > 60 km/h",
    ]
  },
  {
    cat:"ðŸ“‹ Documents & autorisations",
    color:"#1565C0", bg:"#E3F2FD", border:"#90CAF9",
    items:[
      "Contrat ou bon de commande signÃ© en possession",
      "Plan de chantier / carte de la parcelle disponible",
      "Autorisation d'exploitation (coupe) validÃ©e",
      "DÃ©claration de travaux transmise si > 5 ha",
      "Fiche de visite APPLITAG complÃ¨te et validÃ©e",
    ]
  },
  {
    cat:"ðŸš› Logistique & accÃ¨s",
    color:"#4E342E", bg:"#EFEBE9", border:"#BCAAA4",
    items:[
      "AccÃ¨s engin vÃ©rifiÃ© (largeur, hauteur, portance sol)",
      "PropriÃ©taire/gestionnaire informÃ© de la date de dÃ©marrage",
      "Riverains prÃ©venus si risque de perturbation",
      "Aire de retournement et stockage bois repÃ©rÃ©e",
      "ClÃ©s / codes d'accÃ¨s barriÃ¨re rÃ©cupÃ©rÃ©s",
      "Modification temporaire de la circulation valide en possession",
    ]
  },
  {
    cat:"ðŸŒ² Parcelle & marquage",
    color:"#2E7D32", bg:"#E8F5E9", border:"#A5D6A7",
    items:[
      "Arbres Ã  abattre marquÃ©s (peinture ou ruban)",
      "Arbres Ã  conserver / semenciers identifiÃ©s",
      "Limites parcellaires vÃ©rifiÃ©es sur le terrain",
      "Cours d'eau et zones humides repÃ©rÃ©s (â‰¥ 5 m de recul)",
      "Arbres dangereux ou en Ã©quilibre instable signalÃ©s",
    ]
  },
  {
    cat:"ðŸª“ MatÃ©riel & engins",
    color:"#6A1B9A", bg:"#F3E5F5", border:"#CE93D8",
    operateur:true,
    items:[
      "Engins vÃ©rifiÃ©s et en bon Ã©tat de marche",
      "Niveaux huile / carburant faits",
      "Kit anti-pollution (absorbant) Ã  bord en cas de fuite",
      "Outillage de coupe affÃ»tÃ© et fonctionnel",
      "CÃ¢bles / sangles de dÃ©bardage vÃ©rifiÃ©s",
    ]
  },
  {
    cat:"â™»ï¸ Environnement",
    color:"#00695C", bg:"#E0F2F1", border:"#80CBC4",
    items:[
      "Saison de coupe respectÃ©e (hors nidification marsâ€“aoÃ»t si possible)",
      "Pas d'espÃ¨ces protÃ©gÃ©es identifiÃ©es sur la parcelle",
      "Cloisonnements sylvicoles dÃ©finis pour limiter le tassement",
      "Branchages / rÃ©manents destinÃ©s au maintien de la biodiversitÃ©",
      "Plan de replantation prÃ©vu et enregistrÃ©",
    ]
  },
];

export const ChecklistChantier = ({showOperateur=false}) => {
  const [checked, setChecked] = useState(()=>{
    const saved = sessionStorage.getItem("checklist_chantier");
    return saved ? JSON.parse(saved) : {};
  });
  const toggle = (key) => {
    setChecked(prev=>{
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
      <SectionTitle icon="â˜‘ï¸" label="Check-list avant dÃ©marrage chantier"/>
      <div style={{marginBottom:16,padding:"12px 14px",borderRadius:12,
        background: pct===100?"#E8F5E9":"#FFF8E1",
        border:`1.5px solid ${pct===100?"#A5D6A7":"#FFE082"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700,color:pct===100?"#2E7D32":"#F57F17"}}>
            {pct===100?"âœ… Chantier prÃªt Ã  dÃ©marrer !":"âš ï¸ VÃ©rifications en coursâ€¦"}
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
          <span style={{fontSize:16}}>ðŸ‘·</span>
          <div style={{fontSize:12,color:"#4A148C",lineHeight:1.5}}>
            La section <b>MatÃ©riel & engins</b> est Ã  complÃ©ter par l'opÃ©rateur depuis son interface.
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
                ðŸ‘· OpÃ©rateur
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
                    {ok&&<span style={{color:"#fff",fontSize:13,fontWeight:900,lineHeight:1}}>âœ“</span>}
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
  {id:"admin",         label:"Rens. Admin.",    icon:"ðŸ“‹", color:C.blue},
  {id:"gps",           label:"GPS",           icon:"ðŸ“", color:C.green},
  {id:"photos",        label:"Photos",        icon:"ðŸ“·", color:C.purple},
  {id:"biomasse",      label:"Type biomasse",  icon:"ðŸƒ", color:"#558B2F"},
  {id:"finance",       label:"Finance",       icon:"ðŸ’¶", color:C.amber},
  {id:"contraintes",   label:"Contraintes terrain", icon:"âš ï¸", color:C.red},
  {id:"acces",         label:"AccÃ¨s logistique", icon:"ðŸš›", color:C.brown},
  {id:"plateforme",    label:"Plateforme stockage", icon:"ðŸ—ï¸", color:C.purple},
  {id:"replantation",  label:"Replantation",  icon:"ðŸŒ±", color:C.green},
  {id:"certification", label:"Certif.",       icon:"ðŸ…", color:C.blue},
  {id:"reglementation",label:"RÃ©glmt.",       icon:"âš–ï¸", color:"#7C3AED"},
  {id:"checklist",     label:"Check-list",    icon:"â˜‘ï¸", color:"#00695C"},
];

const DRAFT_KEY = "applitag_visite_draft";

// âš  NON_VALIDEE (formules.js:FORMULE_CUBAGE_CYLINDRE) â€” formule cylindrique sans coefficient de forme Vf ;
// surestime le volume rÃ©el de 40-150%. Utiliser tarifs de cubage INRAE pour usage probant.
const calcVolumeParHa = (popParHa, diametreMoyenCm, surfaceHa, indices) => {
  const nbTigesHa = parseFloat(popParHa)||0;
  const dM = (parseFloat(diametreMoyenCm)||0)/100;
  const volUnitaireM3 = (Math.PI/4) * dM*dM * (indices?.hauteurMoy||20);
  const volTotalM3 = volUnitaireM3 * nbTigesHa * (parseFloat(surfaceHa)||0);
  const poidsTonnes = volTotalM3 * (indices?.densite||950) / 1000;
  return Math.round(poidsTonnes*100)/100;
};

export const FormulaireVisite = ({lot, onBack, onSaved, toast, entrepriseId, user}) => {
  const [step,     setStep]    = useState(0);
  const [returnStep, setReturnStep] = useState(null); // retour direct au rÃ©capitulatif aprÃ¨s "ComplÃ©ter"
  const [gps,      setGps]     = useState(null);
  const [photos,   setPhotos]  = useState([]);
  const [typeBiomasse, setTypeBiomasse] = useState("");
  const [essences, setEssences]= useState([{id:"peuplier",emoji:"ðŸŒ¾",label:"Peuplier",pct:100}]);
  const [volumeT,  setVolumeT] = useState(0);
  const [modeVolume, setModeVolume] = useState("manuel"); // manuel | slider | parha
  const [popParHa, setPopParHa] = useState("");
  const [diametreMoyen, setDiametreMoyen] = useState(""); // diamÃ¨tre moyen Ã  1,20 m, en cm
  const [surfaceHa,setSurface] = useState(String(lot.surfaceHa||5));
  const [dateLimite,setDateL]  = useState("");
  const [observations,setObs]  = useState("");
  // Prix & conditions commerciales
  const [prixTonne,     setPrixTonne]    = useState("");
  const [tauxTVA,       setTauxTVA]      = useState("20");
  const [acompte,       setAcompte]      = useState("");
  const [delaiSolde,    setDelaiSolde]   = useState("comptant");
  const [modeReglement, setModeReglement]= useState("virement");
  const [iban,          setIban]         = useState("");
  const [swift,         setSwift]        = useState("");
  const [nomBanque,     setNomBanque]    = useState("");
  const [villeBanque,   setVilleBanque]  = useState("");
  // Signatures terrain
  const [sigProprio,  setSigProprio] = useState(false);
  const [sigExploit,  setSigExploit] = useState(false);
  const [sigDataProprio, setSigDataProprio] = useState(null);
  const [sigDataExploit, setSigDataExploit] = useState(null);
  const [nomSignProprio,_setNomSigPr] = useState(lot.nomSignataire||lot.nom||"");
  const [nomSignExploit,_setNomSigEx] = useState("");
  const [coupeAutorisee,        setCoupeAutorisee]        = useState("");   // "oui"|"non"
  const [dateAutorisationPrevue,setDateAutorisationPrevue] = useState("");
  const [nomGestionnaire,       setNomGestionnaire]        = useState("");
  const [personneEnCharge,      setPersonneEnCharge]        = useState("");
  const [cpGestionnaire,        setCpGestionnaire]          = useState("");
  const [villeGestionnaire,     setVilleGestionnaire]       = useState("");
  const [zoneProtegee,          setZoneProtegee]           = useState("");   // "oui"|"non"
  const [contraintes,setCont]  = useState({
    ligneEDF:false, lignesTelecom:false, penteForte:false,
    zoneHumide:false, tourbieres:false, solsVulnerables:false,
    voisinage:false, accesDifficile:false,
    routeLimitee:false, natura2000:false, remanents:false,
    autorisationVoirie:false, prevenir_mairie:false, prevenir_voisinage:false,
  });
  // DÃ©tails contraintes avec responsable
  const [detailsContraintes, setDetailsCont] = useState({});
  const [accesCamion,setAcces] = useState("praticable");
  const [largeurAcces,setLarg] = useState(4);
  const [distancePlateforme,setDist] = useState(500);
  const [saving, setSaving]    = useState(false);

  // Essence principale (affichage) + indices pondÃ©rÃ©s par la composition rÃ©elle (%) â€” source ITEBE 2004
  const essencePrincipale = [...essences].sort((a,b)=>b.pct-a.pct)[0]?.id || "melange";
  const indices = indicesPonderes(essences);

  // Persistance brouillon
  useEffect(()=>{
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY+lot.id)||"null");
      if (draft) {
        if (draft.gps) setGps(draft.gps);
        if (draft.essences) setEssences(draft.essences);
        if (draft.volumeT) setVolumeT(draft.volumeT);
        if (draft.surfaceHa) setSurface(draft.surfaceHa);
        if (draft.dateLimite) setDateL(draft.dateLimite);
        if (draft.observations) setObs(draft.observations);
        if (draft.prixTonne) setPrixTonne(draft.prixTonne);
        if (draft.diametreMoyen) setDiametreMoyen(draft.diametreMoyen);
        if (draft.popParHa) setPopParHa(draft.popParHa);
        if (draft.modeVolume) setModeVolume(draft.modeVolume);
        if (draft.contraintes) setCont(draft.contraintes);
        if (draft.accesCamion) setAcces(draft.accesCamion);
      }
    } catch { /* noop */ }
  },[lot.id]);

  // Sauvegarde automatique brouillon
  useEffect(()=>{
    try {
      localStorage.setItem(DRAFT_KEY+lot.id, JSON.stringify({
        gps, essences, volumeT, surfaceHa, dateLimite, observations,
        prixTonne, diametreMoyen, popParHa, modeVolume, tauxTVA, acompte, delaiSolde, modeReglement,
        iban, swift, nomBanque, villeBanque,
        contraintes, accesCamion, step,
      }));
    } catch { /* noop */ }
  },[lot.id, gps, essences, volumeT, surfaceHa, dateLimite, observations,
     prixTonne, diametreMoyen, popParHa, modeVolume, tauxTVA, acompte, delaiSolde, modeReglement,
     iban, swift, nomBanque, villeBanque, contraintes, accesCamion, step]);

  // Recalcul du volume estimÃ© si la surface ou l'essence change en mode "par ha"
  useEffect(()=>{
    if (modeVolume==="parha") {
      setVolumeT(calcVolumeParHa(popParHa, diametreMoyen, surfaceHa, indices));
    }
  },[surfaceHa, modeVolume, essencePrincipale, diametreMoyen, indices, popParHa]);


  // Plateforme
  const [platLargeur,    setPlatLarg]   = useState(10);
  const [platLongueur,   setPlatLong]   = useState(20);
  const [platRevetement, setPlatRev]    = useState("terre");
  const [platBordee,     setPlatBord]   = useState("chemin_public");
  const [platAccesCam,   setPlatAccCam] = useState("direct");
  const [platPosBroyeur, setPlatPosBr]  = useState("devant");
  const [platGps,        setPlatGps]    = useState(null);
  const [platGpsLoading, setPlatGpsL]   = useState(false);
  const [platAutorisation,setPlatAutor] = useState(false);
  const [platQuiAutoris, setPlatQui]    = useState("");
  const [platPhoto,      setPlatPhoto]  = useState(false);

  // Replantation
  const [replantation,    setReplantation]   = useState("non"); // non | oui | a_definir
  const [essenceReplanT,  setEssenceReplant] = useState("");
  const [surfaceReplant,  setSurfaceReplant] = useState(0);
  const [dateReplant,     setDateReplant]    = useState("");
  const [respReplant,     setRespReplant]    = useState("proprietaire");
  const [replantNomEntreprise, setReplantNomEntreprise] = useState("");
  const [replantPersonne,      setReplantPersonne]      = useState("");
  const [replantCp,            setReplantCp]            = useState("");
  const [replantVille,         setReplantVille]         = useState("");
  const [replantTel,           setReplantTel]           = useState("");
  const [replantEmail,         setReplantEmail]         = useState("");

  // PrÃ©-positionne la surface Ã  replanter sur la surface exploitÃ©e saisie en Ã©tape "Volumes"
  useEffect(()=>{
    if (replantation==="oui" && surfaceReplant===0) setSurfaceReplant(parseFloat(surfaceHa)||0);
  },[replantation, surfaceHa, surfaceReplant]);

  // Scroll en haut Ã  chaque changement d'Ã©tape
  const scrollRef = useRef(null);
  useEffect(()=>{
    if(scrollRef.current) scrollRef.current.scrollTop = 0;
  },[step]);

  // Certification
  const [certification,   setCertification]  = useState("aucune");
  const [numeroCertification, setNumeroCert] = useState("");
  const [organismeCertif,  setOrganismeCertif] = useState("");
  const [dateAudit,        setDateAudit]       = useState("");
  const [dateExpiration,   setDateExpiration]  = useState("");
  const [redCategorie,    setRedCategorie]   = useState("bois_forestier");
  const [redDistance,     setRedDistance]    = useState(100);
  const [redPays,         setRedPays]        = useState("France");
  const [redMassif,       setRedMassif]      = useState("");
  const [redPointCollecte,setRedPointCollecte] = useState("");
  const [redSysVolontaire,setRedSysVolontaire] = useState("");
  const [redPerimetreCertif,setRedPerimetreCertif] = useState("");
  const [redVssCertificat,  setRedVssCertificat]  = useState("");
  const [redVssDateValidite,setRedVssDateValidite] = useState("");
  const [redVssOrganisme,   setRedVssOrganisme]   = useState("");
  const [redDestination,  setRedDestination] = useState("");
  const [redForetPrimaire,setRedForetPrimaire] = useState("");  // confirmÃ©|a_verifier|non_concerne
  const [redDocGestion,   setRedDocGestion]   = useState("");  // psg|cbps|amenagement|aucun
  const [redBoisMort,     setRedBoisMort]     = useState({souches:false,boisMort:false,coupeRase:false});
  const [statutRed,       setStatutRed]       = useState("");

  // Arbitrage SNBC 3
  const [usagePotentiel,    setUsagePotentiel]    = useState("bois_energie");
  const [usageRetenu,       setUsageRetenu]       = useState("bois_energie");
  const [motifArbitrage,    setMotifArbitrage]    = useState("");
  const [motifArbitrageLib, setMotifArbitrageLib] = useState("");
  const [niveauSecurisation,setNiveauSecurisation]= useState("mobilisable_cond");
  const [preuveDestFin,     setPreuveDestFin]     = useState("");

  // Flux bois â€” usage et destination par qualitÃ©
  const [usagePrevu,      setUsagePrevu]     = useState(""); // bo|bi|be|mixte
  const [volBO,           setVolBO]          = useState("");
  const [volBI,           setVolBI]          = useState("");
  const [volBE,           setVolBE]          = useState("");
  const [destBO,          setDestBO]         = useState("");
  const [destBE,          setDestBE]         = useState("");
  const [preuveDestBO,    setPreuveDestBO]   = useState("");
  const [preuveDestBE,    setPreuveDestBE]   = useState("");
  const [dateControleFlux,setDateControle]   = useState("");

  // RÃ©glementation â€” snapshot dossier
  const [dispositifAide,  setDispositifAide] = useState("");
  const [dateDepotPrevu,  setDateDepotPrevu] = useState("");
  const [clauseReserveOk, setClauseReserve] = useState(false);
  const [reserveManuelle, setReserveManuelle]= useState("");
  const [decisionAttributive, setDecisionAttr] = useState("");

  const isDemo = !!(user?.id?.startsWith("demo-"));
  const stepValid = {
    0:true, 1:isDemo||!!gps, 2:isDemo||photos.length>=2,
    3:!!typeBiomasse&&essences.length>0&&Math.abs(essences.reduce((s,e)=>s+e.pct,0)-100)<=1&&volumeT>0,
    4:parseFloat(prixTonne)>0, 5:true, 6:true, 7:true, 8:true, 9:true, 10:clauseReserveOk||isDemo, 11:true,
  };
  const allValid = Object.values(stepValid).every(Boolean);

  const handleSave = async () => {
    if (!allValid) { toast("ComplÃ©ter toutes les Ã©tapes","warn"); return; }
    setSaving(true);
    const visite = {
      lotId: lot.id, lotNumero: lot.lotNumero||lot.numero,
      coupeAutorisee, dateAutorisationPrevue, nomGestionnaire, personneEnCharge,
      cpGestionnaire, villeGestionnaire, zoneProtegee,
      date: todayS(), gps, photos, typeBiomasse, essences,
      volumeEstimeT: volumeT, surfaceHa, dateLimite, observations,
      diametreMoyen, popParHa,
      prixTonne, tauxTVA, acompte, delaiSolde, modeReglement,
      iban, swift, nomBanque, villeBanque,
      sigProprio, sigExploit, nomSignProprio, nomSignExploit,
      sigDataProprio, sigDataExploit,
      contraintes, detailsContraintes, accesCamion, largeurAcces, distancePlateforme,
      plateforme:{ largeur:platLargeur, longueur:platLongueur,
        revetement:platRevetement, bordee:platBordee,
        accesCamion:platAccesCam, positionBroyeur:platPosBroyeur,
        gps:platGps, autorisation:platAutorisation,
        quiAutorise:platQuiAutoris, photo:platPhoto },
      replantation, essenceReplanT, surfaceReplant, dateReplant, respReplant,
      certification, organismeCertif, dateAudit, dateExpiration, numeroCertification,
      redCategorie, redDistance, redPays, redMassif, redPointCollecte,
      redSysVolontaire, redVssCertificat, redVssDateValidite, redVssOrganisme, redPerimetreCertif,
      redDestination, redForetPrimaire, redDocGestion, redBoisMort,
      // Flux bois â€” usage et destination
      usagePrevu, volBO:parseFloat(volBO)||0, volBI:parseFloat(volBI)||0, volBE:parseFloat(volBE)||0,
      destBO, destBE, preuveDestBO, preuveDestBE, dateControleFlux,
      usagePotentiel, usageRetenu, motifArbitrage, motifArbitrageLib, niveauSecurisation, preuveDestFin,
      // Snapshot rÃ©glementaire â€” figÃ© Ã  la date de la visite
      reglementaireSnapshot:{
        dateSnapshot: todayS(),
        auteur: user ? `${user.prenom||""} ${user.nom||""}`.trim() : "Mandataire",
        dispositifAide, dateDepotPrevu, decisionAttributive,
        clauseReserveApposee: clauseReserveOk,
        clauseReserveTexte: CLAUSE_RESERVE,
        reserveManuelle,
        textesEnVigueur: TEXTES_REGL.map(t=>({
          id:t.id, texteRef:t.texteRef, statut:t.statut,
          versionCriteres:t.versionCriteres, dateConsultation:t.dateConsultation,
          alerteActive:t.alerteActive,
        })),
        alertesActives: TEXTES_REGL.filter(t=>t.alerteActive).map(t=>t.texteRef),
      },
      indicesCalcul: indices,
      statut:"validee", entrepriseId,
    };
    try {
      const saved = await apiPost(`/visites`, visite);
      localStorage.removeItem(DRAFT_KEY+lot.id);
      if (coupeAutorisee==="non"&&dateAutorisationPrevue) {
        const dateAlerte = new Date(new Date(dateAutorisationPrevue).getTime()-2*86400000).toISOString().slice(0,10);
        const msgAlerte = {
          type:"alerte_autorisation_coupe",
          lotId: lot.id, lotNumero: lot.lotNumero||lot.numero,
          commune: lot.commune||"",
          missionne: `${user?.prenom||""} ${user?.nom||""}`.trim(),
          dateAutorisationPrevue,
          dateAlerte,
          message:`âš ï¸ Rappel autorisation coupe â€” lot ${lot.lotNumero||lot.numero} (${lot.commune||""}) : l'autorisation de coupe est attendue le ${new Date(dateAutorisationPrevue).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}. VÃ©rifiez l'obtention de l'autorisation.`,
        };
        apiPost(`/messages-admin`, msgAlerte).catch(()=>{});
        apiPost(`/notifications`, {...msgAlerte,destinataire:"missionne"}).catch(()=>{});
      }
      toast("Visite validÃ©e âœ“");
      onSaved(saved);
    } catch {
      localStorage.removeItem(DRAFT_KEY+lot.id);
      toast("Visite enregistrÃ©e localement âœ“");
      onSaved({...visite, id:uid()});
    }
    setSaving(false);
  };

  const currentStep = STEPS[step];
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:currentStep.color,color:"#fff",padding:"12px 16px 10px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",border:"none",
            color:"#fff",width:36,height:36,borderRadius:9,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center",
            WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:600}}>{currentStep.icon} {currentStep.label}</div>
            <div style={{fontSize:11,opacity:.7}}>{lot.lotNumero||lot.numero} Â· {lot.commune}</div>
          </div>
          <div style={{fontSize:12,opacity:.75}}>{step+1}/{STEPS.length}</div>
        </div>
        <div style={{display:"flex",gap:4,paddingBottom:10}}>
          {STEPS.map((s,i)=>(
            <div key={s.id} onClick={()=>i<step&&setStep(i)}
              style={{flex:1,cursor:i<step?"pointer":"default"}}>
              <div style={{height:4,borderRadius:2,
                background:i<=step?"rgba(255,255,255,.9)":"rgba(255,255,255,.25)"}}/>
              <div style={{height:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {i<step&&!stepValid[i]&&(
                  <span style={{fontSize:11,color:"#ff4444",fontWeight:900,lineHeight:1}}>âœ±</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>
        {returnStep!==null&&(
          <div style={{background:C.amberL,border:`1px solid ${C.amber}`,borderRadius:10,
            padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>â†©ï¸</span>
            <span style={{fontSize:12,color:C.amberD,fontWeight:600}}>
              Mode complÃ©ment â€” validez puis revenez au rÃ©capitulatif
            </span>
          </div>
        )}
        {step===0&&(
          <div>
            <SectionTitle icon="âœ…" label="Validation rÃ©glementaire"/>
            {[
              {key:"coupeAutorisee", val:coupeAutorisee, set:setCoupeAutorisee,
               label:"Coupe autorisÃ©e ?", sub:"Autorisation administrative en cours de validitÃ©"},
              {key:"zoneProtegee",   val:zoneProtegee,   set:setZoneProtegee,
               label:"Zone protÃ©gÃ©e ?",   sub:"Natura 2000, ZNIEFF, arrÃªtÃ© biotopeâ€¦"},
            ].map(({key,val,set,label,sub})=>(
              <div key={key} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:6}}>{label}</div>
                <div style={{fontSize:12,color:C.tx3,marginBottom:8}}>{sub}</div>
                <div style={{display:"flex",gap:8}}>
                  {[["oui","âœ… Oui",C.green,C.greenL,C.greenD],["non","âŒ Non",C.red,"#fdecea","#b71c1c"]].map(([v,l,border,bg,tc])=>(
                    <button key={v} onClick={()=>set(val===v?"":v)} style={{
                      flex:1,padding:"11px 0",borderRadius:10,fontSize:13,fontWeight:val===v?700:400,
                      border:`2px solid ${val===v?border:C.bd}`,
                      background:val===v?bg:"#fff",color:val===v?tc:C.tx2,
                      cursor:"pointer",fontFamily:"inherit",
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {coupeAutorisee==="non"&&(
              <div style={{background:"#fdecea",border:"2px solid #e53935",borderRadius:12,
                padding:14,marginBottom:14}}>
                <div style={{fontWeight:700,color:"#b71c1c",fontSize:14,marginBottom:4}}>
                  â›” Coupe non autorisÃ©e
                </div>
                <div style={{fontSize:12,color:"#b71c1c",marginBottom:12,lineHeight:1.5}}>
                  Saisissez la date prÃ©vue d'obtention de l'autorisation. Un rappel sera
                  envoyÃ© automatiquement 2 jours avant Ã  la personne missionnÃ©e et Ã  l'administrateur.
                </div>
                <div style={{fontSize:13,fontWeight:600,color:"#b71c1c",marginBottom:6}}>
                  Date prÃ©vue d'obtention
                </div>
                <input type="date" value={dateAutorisationPrevue}
                  onChange={e=>setDateAutorisationPrevue(e.target.value)}
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                    border:"1.5px solid #e53935",fontFamily:"inherit",
                    background:"#fff",color:"#b71c1c",boxSizing:"border-box"}}/>
                {dateAutorisationPrevue&&(
                  <div style={{fontSize:11,color:"#b71c1c",marginTop:8,opacity:.8}}>
                    ðŸ”” Alerte prÃ©vue le {new Date(new Date(dateAutorisationPrevue).getTime()-2*86400000).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                  </div>
                )}
              </div>
            )}
            <MInput label="Nom du gestionnaire forestier" value={nomGestionnaire} onChange={setNomGestionnaire}
              placeholder="Ex : ONF, CRPF, gestionnaire privÃ©â€¦"/>
            <MInput label="Personne en charge" value={personneEnCharge} onChange={setPersonneEnCharge}
              placeholder="PrÃ©nom Nom du rÃ©fÃ©rent"/>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:"0 0 110px"}}>
                <MInput label="Code postal" value={cpGestionnaire} onChange={setCpGestionnaire}
                  placeholder="89000" type="number"/>
              </div>
              <div style={{flex:1}}>
                <MInput label="Ville" value={villeGestionnaire} onChange={setVilleGestionnaire}
                  placeholder="Auxerre"/>
              </div>
            </div>
          </div>
        )}
        {step===1&&(
          <div>
            <SectionTitle icon="ðŸ“" label="Position GPS de la parcelle"/>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16,lineHeight:1.6}}>
              Capturez la position GPS de la parcelle.
            </div>
            <GpsWidget value={gps} onChange={setGps} required/>
            <MapZonesProtegees gps={gps}/>
            <div style={{marginTop:16}}>
              <MInput label="Lot" value={lot.lotNumero||lot.numero} onChange={()=>{}} hint="auto"/>
              <MInput label="Date" value={todayS()} onChange={()=>{}} hint="auto"/>
            </div>
          </div>
        )}
        {step===2&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16}}>2 photos minimum.</div>
            <PhotosWidget photos={photos} onChange={setPhotos} required={2}/>
          </div>
        )}
        {step===3&&(
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:C.tx,marginBottom:4}}>
                ðŸƒ Quel type de biomasse selon RED ?
              </div>
              <div style={{fontSize:13,color:C.tx3,display:"flex",alignItems:"center",gap:4}}>
                Appuyez sur le menu ci-dessous pour sÃ©lectionner
                <span style={{fontSize:16}}>ðŸ‘‡</span>
              </div>
            </div>
            <select value={typeBiomasse} onChange={e=>setTypeBiomasse(e.target.value)}
              style={{width:"100%",padding:"14px 12px",borderRadius:12,
                border:`2px solid ${typeBiomasse?C.green:C.bd}`,
                background:"#fff",fontFamily:"inherit",fontSize:16,
                color:typeBiomasse?C.tx:C.tx3,cursor:"pointer",outline:"none",
                appearance:"none",WebkitAppearance:"none",
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",
                marginBottom:24}}>
              <option value="">â€” SÃ©lectionner â€”</option>
              <option value="bois_forestier">Bois forestier</option>
              <option value="remanents">RÃ©manents</option>
              <option value="connexe_scierie">Connexe de Scierie</option>
              <option value="dechets_bois">DÃ©chets bois</option>
              <option value="biomasse_agricole">Biomasse agricole</option>
              <option value="csr_biogenique">CSR avec fraction biogÃ©nique</option>
            </select>
            {typeBiomasse&&(
              <div style={{marginTop:24,marginBottom:24,padding:12,borderRadius:10,
                background:"#E8F5E9",border:"1px solid #A5D6A7",
                fontSize:13,color:"#2E7D32",fontWeight:500}}>
                âœ… {typeBiomasse==="bois_forestier"?"Bois forestier"
                  :typeBiomasse==="remanents"?"RÃ©manents"
                  :typeBiomasse==="connexe_scierie"?"Connexe de Scierie"
                  :typeBiomasse==="dechets_bois"?"DÃ©chets bois"
                  :typeBiomasse==="biomasse_agricole"?"Biomasse agricole"
                  :"CSR avec fraction biogÃ©nique"} sÃ©lectionnÃ©
              </div>
            )}
            <SectionTitle icon="ðŸŒ¿" label="Essences prÃ©sentes"/>
            <div style={{fontSize:13,color:C.tx2,marginBottom:12}}>SÃ©lectionnez les essences prÃ©sentes. Total = 100%.</div>
            <EssenceEditor essences={essences} onChange={setEssences}/>
            <SectionTitle icon="ðŸ“" label="Surface & Volume"/>
            <MInput label="Surface (ha)" value={surfaceHa}
              onChange={setSurface}
              type="number" placeholder="ex : 12.5" hint="hectares"/>

            {/* Toggle saisie manuelle vs slider vs population/ha */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["slider","ðŸŽšï¸ Slider"],["manuel","âŒ¨ï¸ Saisie manuelle"],["parha","ðŸ“ Par ha"]].map(([v,l])=>(
                <button key={v} onClick={()=>setModeVolume(v)} style={{
                  flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:modeVolume===v?600:400,
                  border:`1.5px solid ${modeVolume===v?C.amber:C.bd}`,
                  background:modeVolume===v?C.amberL:"#fff",
                  cursor:"pointer",fontFamily:"inherit",color:modeVolume===v?C.amberD:C.tx2,
                  WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            {modeVolume==="manuel" && (
              <MInput label="Volume estimÃ© (tonnes)" value={volumeT===0?"":String(volumeT)}
                onChange={v=>setVolumeT(parseFloat(v)||0)}
                type="number" placeholder="Saisir le tonnage estimÃ©" hint="saisie directe"
                required/>
            )}
            {modeVolume==="slider" && (
              <MSlider label="Volume estimÃ©" value={volumeT} onChange={setVolumeT}
                min={10} max={2000} step={10} unit=" t" color={C.amber}/>
            )}
            {modeVolume==="parha" && (
              <>
                <MInput label="Population estimÃ©e (tiges/ha)" value={popParHa}
                  onChange={v=>{
                    setPopParHa(v);
                    setVolumeT(calcVolumeParHa(v, diametreMoyen, surfaceHa, indices));
                  }}
                  type="number" placeholder="ex: 300"/>
                <MInput label="DiamÃ¨tre moyen Ã  1,20 m (cm)" value={diametreMoyen}
                  onChange={v=>{
                    setDiametreMoyen(v);
                    setVolumeT(calcVolumeParHa(popParHa, v, surfaceHa, indices));
                  }}
                  type="number" placeholder="ex: 35" hint="saisie en centimÃ¨tres"/>
                <div style={{fontSize:12,color:C.tx3,marginBottom:14,marginTop:-6}}>
                  = {volumeT>0?`${fmtNum(volumeT)} t`:"â€”"} volume estimÃ© total
                </div>
              </>
            )}

            {/* Estimation calculÃ©e â€” affichÃ©e seulement si volume > 0 */}
            {volumeT>0&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:8}}>
                  ðŸ“Š Estimations â€” composition pondÃ©rÃ©e ({essences.map(e=>`${e.label} ${e.pct}%`).join(", ")||essencePrincipale})
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    [fmtNum(volumeT)+" t","Tonnage estimÃ©"],
                    [fmtNum(volumeT/indices.foisonnement)+" mÂ³","Volume bois"],
                    [fmtNum(volumeT*indices.pci/1000,1)+" MWh","Ã‰nergie PCI"],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",background:"rgba(186,117,23,.1)",
                      borderRadius:8,padding:8}}>
                      <div style={{fontSize:16,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:8}}>
                  DensitÃ© verte : {Math.round(indices.densite)} kg/mÂ³ Â· Foisonnement : {indices.foisonnement.toFixed(2)}
                </div>
              </div>
            )}

          </div>
        )}
        {step===4&&(
          <div>
            <SectionTitle icon="ðŸ’¶" label="Prix & Conditions commerciales"/>

            {/* Prix HT + TVA */}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
              <MInput label="Prix Ã  la tonne (â‚¬ HT)" value={prixTonne} onChange={setPrixTonne}
                type="number" placeholder="ex: 42.50" required/>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:5}}>
                  TVA (%)
                </div>
                <select value={tauxTVA||"20"} onChange={e=>setTauxTVA(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 10px",borderRadius:12,
                    fontSize:FONT_INPUT,border:`1.5px solid ${C.bd}`,
                    fontFamily:"inherit",background:"#fff",color:C.tx,appearance:"auto"}}>
                  <option value="0">0 %</option>
                  <option value="5.5">5,5 %</option>
                  <option value="10">10 %</option>
                  <option value="20">20 %</option>
                </select>
              </div>
            </div>

            {/* RÃ©cap HT / TVA / TTC */}
            {prixTonne&&volumeT>0&&(()=>{
              const ht = volumeT*parseFloat(prixTonne);
              const tva = ht*(parseFloat(tauxTVA||20)/100);
              const ttc = ht+tva;
              return (
                <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1.5px solid ${C.green}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:8}}>
                    ðŸ’° Valeur estimÃ©e du lot
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      [fmtNum(ht,2)+" â‚¬","Total HT"],
                      [fmtNum(tva,2)+" â‚¬",`TVA ${tauxTVA||20}%`],
                      [fmtNum(ttc,2)+" â‚¬","Total TTC"],
                    ].map(([v,l],i)=>(
                      <div key={i} style={{textAlign:"center",
                        background:"rgba(29,158,117,.1)",borderRadius:8,padding:8}}>
                        <div style={{fontSize:i===2?16:13,fontWeight:i===2?700:500,
                          color:C.greenD}}>{v}</div>
                        <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Conditions de rÃ¨glement */}
            <SectionTitle icon="ðŸ“…" label="Conditions de rÃ¨glement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <MInput label="Acompte Ã  la commande (â‚¬)" value={acompte} onChange={setAcompte}
                type="number" placeholder="ex: 500"/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:5}}>
                  Solde
                </div>
                <select value={delaiSolde} onChange={e=>setDelaiSolde(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 10px",borderRadius:12,
                    fontSize:FONT_INPUT,border:`1.5px solid ${C.bd}`,
                    fontFamily:"inherit",background:"#fff",color:C.tx,appearance:"auto"}}>
                  <option value="comptant">Comptant</option>
                  <option value="30j">30 jours</option>
                  <option value="60j">60 jours</option>
                  <option value="90j">90 jours</option>
                </select>
              </div>
            </div>
            {acompte&&prixTonne&&volumeT>0&&(
              <div style={{background:C.blueL,borderRadius:10,padding:12,marginBottom:14,
                border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
                Acompte : {fmtNum(acompte,2)} â‚¬ Â· Solde : {fmtNum(Math.max(0,volumeT*parseFloat(prixTonne)*(1+parseFloat(tauxTVA||20)/100)-parseFloat(acompte)),2)} â‚¬ ({delaiSolde})
              </div>
            )}

            {/* Mode de rÃ¨glement */}
            <SectionTitle icon="ðŸ’³" label="Mode de rÃ¨glement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["cheque","ðŸ“ ChÃ¨que"],["virement","ðŸ¦ Virement"],
                ["sepa","ðŸ”„ PrÃ©lÃ¨vement SEPA"],["cb","ðŸ’³ Carte bancaire"]].map(([v,l])=>(
                <div key={v} onClick={()=>setModeReglement(v)} style={{
                  padding:"12px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${modeReglement===v?C.green:C.bd}`,
                  background:modeReglement===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:13,fontWeight:modeReglement===v?600:400,
                    color:modeReglement===v?C.greenD:C.tx}}>{l}</div>
                </div>
              ))}
            </div>

            {/* CoordonnÃ©es bancaires */}
            {(modeReglement==="virement"||modeReglement==="sepa")&&(
              <>
                <SectionTitle icon="ðŸ¦" label="CoordonnÃ©es bancaires"/>
                <MInput label="IBAN" value={iban} hint="format IBAN"
                  placeholder="Ex : FR76 3000 4028 3798 7654 3210 943"
                  onChange={v=>{
                    const raw = v.replace(/\s/g,"").toUpperCase();
                    if(raw.length===0){setIban("");return;}
                    // 2 lettres pays puis uniquement chiffres, max 34 chars
                    const letters = raw.slice(0,2);
                    const digits  = raw.slice(2).replace(/\D/g,"");
                    const combined = (letters+digits).slice(0,34);
                    if(!/^[A-Z]{0,2}$/.test(letters)) return;
                    const fmt = combined.replace(/(.{4})/g,"$1 ").trim();
                    setIban(fmt);
                  }}/>
                <MInput label="BIC / SWIFT" value={swift} hint="8 ou 11 caractÃ¨res"
                  placeholder="Ex : BNPAFRPPXXX"
                  onChange={v=>{
                    const raw = v.replace(/\s/g,"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,11);
                    if(raw.length>=2 && !/^[A-Z]{2}/.test(raw)) return;
                    setSwift(raw);
                  }}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <MInput label="Nom de la banque" value={nomBanque} onChange={setNomBanque}
                    placeholder="ex: BNP Paribas"/>
                  <MInput label="Ville de l'agence" value={villeBanque} onChange={setVilleBanque}
                    placeholder="ex: Paris"/>
                </div>
              </>
            )}

            <SectionTitle icon="âœï¸" label="Signatures terrain"/>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.6}}>
              Signatures recueillies sur le terrain â€” reportÃ©es sur le bon de commande.
            </div>
            <SignatureCanvas
              label="ðŸ  PropriÃ©taire / Vendeur"
              nomSignataire={nomSignProprio||lot.nom||"PropriÃ©taire"}
              signed={sigProprio}
              onSigned={data=>{ setSigProprio(true); setSigDataProprio(data); }}
              onClear={()=>{ setSigProprio(false); setSigDataProprio(null); }}/>
            <SignatureCanvas
              label="ðŸ¢ Exploitant / Acheteur"
              nomSignataire={nomSignExploit||"Donneur d'ordre"}
              signed={sigExploit}
              onSigned={data=>{ setSigExploit(true); setSigDataExploit(data); }}
              onClear={()=>{ setSigExploit(false); setSigDataExploit(null); }}/>

            <MInput label="Date limite exploitation" value={dateLimite} onChange={setDateL}
              type="date" hint="optionnel"/>
            <MInput label="Observations" value={observations} onChange={setObs}
              placeholder="Notesâ€¦" big hint="optionnel"/>
          </div>
        )}
        {step===5&&(
          <div>
            <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:14,
              padding:"0 14px"}}>
              {[
                {k:"ligneEDF",      l:"Ligne Ã©lectrique HT/BT", s:"Risque abattage â€” signaler ERDF"},
                {k:"lignesTelecom", l:"CÃ¢bles tÃ©lÃ©com",          s:"VÃ©rifier avant travaux"},
                {k:"penteForte",    l:"Pente forte >30%",        s:"DÃ©bardage difficile"},
                {k:"zoneHumide",      l:"Zone humide",               s:"Passage restreint"},
                {k:"tourbieres",      l:"TourbiÃ¨res",                s:"Milieu protÃ©gÃ© â€” accÃ¨s trÃ¨s limitÃ©"},
                {k:"solsVulnerables", l:"Sols vulnÃ©rables",          s:"Risque de compactage ou d'Ã©rosion"},
                {k:"natura2000",    l:"Natura 2000",             s:"Contraintes rÃ©glementaires"},
                {k:"routeLimitee",  l:"Route limitÃ©e tonnage",   s:"VÃ©rifier gabarit camion"},
                {k:"accesDifficile",l:"AccÃ¨s difficile",         s:"Chemin dÃ©gradÃ©"},
                {k:"remanents",     l:"RÃ©manents importants",    s:"Broyage nÃ©cessaire"},
                {k:"autorisationVoirie",l:"Autorisation de voirie nÃ©cessaire",s:"ArrÃªtÃ© ou permission de voirie"},
                {k:"prevenir_mairie",l:"Mairie Ã  prÃ©venir",      s:"Information prÃ©alable obligatoire"},
                {k:"prevenir_voisinage",l:"Voisinage Ã  prÃ©venir",s:"Bruit, horaires, poussiÃ¨re"},
                {k:"voisinage",     l:"Voisinage sensible",      s:"PrÃ©cautions particuliÃ¨res"},
              ].map(({k,l,s})=>(
                <div key={k}>
                  <CheckItem checked={contraintes[k]||false}
                    onChange={v=>setCont({...contraintes,[k]:v})} label={l} sub={s} warn/>
                  {contraintes[k]&&["autorisationVoirie","prevenir_mairie","prevenir_voisinage"].includes(k)&&(
                    <div style={{marginLeft:16,marginBottom:8,padding:"10px 12px",
                      background:C.amberL,borderRadius:10,border:`1px solid ${C.amber}`}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                        Qui se charge de la dÃ©marche ?
                      </div>
                      <select value={detailsContraintes[k]?.responsable||""}
                        onChange={e=>setDetailsCont(p=>({...p,[k]:{...p[k],responsable:e.target.value}}))}
                        style={{width:"100%",padding:"10px 12px",borderRadius:8,
                          fontSize:14,border:`1.5px solid ${C.amber}`,
                          fontFamily:"inherit",background:"#fff",color:C.tx,
                          marginBottom:8,appearance:"auto"}}>
                        <option value="">â€” SÃ©lectionner â€”</option>
                        <option value="proprietaire">ðŸ  PropriÃ©taire</option>
                        <option value="etf">ðŸª“ ETF / Exploitant</option>
                        <option value="donneurOrdre">ðŸ¢ Donneur d'ordre</option>
                        <option value="geometre">ðŸ“ GÃ©omÃ¨tre</option>
                        <option value="commune">ðŸ›ï¸ Commune / Mairie</option>
                        <option value="autre">ðŸ‘¤ Autre</option>
                      </select>
                      <MInput label="CoordonnÃ©es / qualitÃ©" value={detailsContraintes[k]?.contact||""}
                        onChange={v=>setDetailsCont(p=>({...p,[k]:{...p[k],contact:v}}))}
                        placeholder="TÃ©lÃ©phone, emailâ€¦" hint="optionnel"/>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{marginTop:10,padding:"10px 14px",background:C.bg2,
              borderRadius:10,fontSize:12,color:C.tx3}}>
              {Object.values(contraintes).filter(Boolean).length} contrainte(s) identifiÃ©e(s)
            </div>
          </div>
        )}
        {step===6&&(
          <div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {[["praticable","âœ… Praticable","AccÃ¨s normal"],
                ["difficile","âš ï¸ Difficile","Conditions dÃ©gradÃ©es"],
                ["impossible","ðŸš« Impossible","AccÃ¨s interdit"]].map(([v,l,s])=>(
                <div key={v} onClick={()=>setAcces(v)} style={{padding:"14px",
                  borderRadius:12,cursor:"pointer",
                  border:`2px solid ${accesCamion===v?C.green:C.bd}`,
                  background:accesCamion===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:accesCamion===v?C.greenD:C.tx}}>{l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            <MSlider label="Largeur" value={largeurAcces} onChange={setLarg}
              min={2} max={8} step={0.5} unit="m" color={C.brown}/>
            <MSlider label="Distance plateforme" value={distancePlateforme} onChange={setDist}
              min={100} max={5000} step={100} unit="m" color={C.blue}/>
            <div style={{background:allValid?C.greenL:C.amberL,borderRadius:14,
              padding:16,marginTop:8,border:`1.5px solid ${allValid?C.green:C.amber}`}}>
              <div style={{fontSize:13,fontWeight:700,
                color:allValid?C.greenD:C.amberD,marginBottom:10}}>
                {allValid?"âœ… Visite complÃ¨te":"âš  Ã‰tapes incomplÃ¨tes"}
              </div>
              {STEPS.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",
                  gap:8,padding:"4px 0",fontSize:12,color:stepValid[i]?C.greenD:C.red}}>
                  <span>{stepValid[i]?"âœ“":"âœ—"}</span>
                  <span>{s.icon} {s.label}</span>
                  {!stepValid[i]&&(
                    <button onClick={()=>{ setReturnStep(step); setStep(i); }} style={{marginLeft:"auto",
                      background:"none",border:"none",color:C.red,cursor:"pointer",
                      fontSize:11,textDecoration:"underline",fontFamily:"inherit"}}>
                      ComplÃ©ter
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step===7&&(
          <div>
            <SectionTitle icon="ðŸ“" label="Dimensions approximatives"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
              <MInput label="Largeur (m)" value={platLargeur} onChange={v=>setPlatLarg(parseFloat(v)||0)}
                type="number" placeholder="ex: 10"/>
              <MInput label="Longueur (m)" value={platLongueur} onChange={v=>setPlatLong(parseFloat(v)||0)}
                type="number" placeholder="ex: 20"/>
            </div>
            <div style={{background:C.purpleL,borderRadius:10,padding:10,marginBottom:14,
              textAlign:"center",border:`1px solid ${C.purple}`}}>
              <span style={{fontSize:13,fontWeight:600,color:C.purpleD}}>
                Surface : {fmtNum(platLargeur*platLongueur)} mÂ²
              </span>
            </div>

            <SectionTitle icon="ðŸ›£ï¸" label="RevÃªtement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["terre","ðŸŸ¤ Terre"],["gravier","â¬œ Gravier"],["beton","ðŸ”² BÃ©ton"],["enrobe","â¬› EnrobÃ©"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPlatRev(v)} style={{
                  padding:"10px 8px",borderRadius:10,fontSize:12,cursor:"pointer",
                  border:`1.5px solid ${platRevetement===v?C.purple:C.bd}`,
                  background:platRevetement===v?C.purpleL:"#fff",
                  color:platRevetement===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            <SectionTitle icon="ðŸ›¤ï¸" label="BordÃ©e par"/>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {["route_departementale","route_communale","chemin_public","chemin_prive"].map(v=>{
              const labels = {
                route_departementale:"ðŸ›£ï¸ Route dÃ©partementale",
                route_communale:"ðŸ˜ï¸ Route communale",
                chemin_public:"ðŸŒ¿ Chemin public",
                chemin_prive:"ðŸ”’ Chemin privÃ©",
              };
              return (
                <div key={v} onClick={()=>setPlatBord(v)} style={{
                  padding:"12px 14px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${platBordee===v?C.purple:C.bd}`,
                  background:platBordee===v?C.purpleL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:14,fontWeight:platBordee===v?600:400,
                    color:platBordee===v?C.purpleD:C.tx}}>{labels[v]}</div>
                </div>
              );
            })}
            </div>

            <SectionTitle icon="ðŸš›" label="AccÃ¨s camion sur plateforme"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["direct","âž¡ï¸","Direct"],["marche_arriere","â†©ï¸","Marche AR"],["retournement","ðŸ”„","Retournement"]].map(([v,e,l])=>(
                <button key={v} onClick={()=>setPlatAccCam(v)} style={{
                  padding:"10px 4px",borderRadius:10,fontSize:11,cursor:"pointer",
                  border:`1.5px solid ${platAccesCam===v?C.purple:C.bd}`,
                  background:platAccesCam===v?C.purpleL:"#fff",
                  color:platAccesCam===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:18}}>{e}</span>{l}
                </button>
              ))}
            </div>

            <SectionTitle icon="âš™ï¸" label="Position du broyeur"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["devant","â¬†ï¸","Devant"],["derriere","â¬‡ï¸","DerriÃ¨re"],["cote","âž¡ï¸","Ã€ cÃ´tÃ©"]].map(([v,e,l])=>(
                <button key={v} onClick={()=>setPlatPosBr(v)} style={{
                  padding:"10px 4px",borderRadius:10,fontSize:11,cursor:"pointer",
                  border:`1.5px solid ${platPosBroyeur===v?C.purple:C.bd}`,
                  background:platPosBroyeur===v?C.purpleL:"#fff",
                  color:platPosBroyeur===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:18}}>{e}</span>{l}
                </button>
              ))}
            </div>

            <SectionTitle icon="ðŸ“" label="GPS emplacement"/>
            {!platGps?(
              <button onClick={()=>{
                setPlatGpsL(true);
                navigator.geolocation?.getCurrentPosition(
                  p=>{setPlatGps({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});setPlatGpsL(false);},
                  ()=>{setPlatGps({lat:47.98,lng:3.09,source:"sim"});setPlatGpsL(false);},
                  {enableHighAccuracy:true,timeout:8000}
                )??setPlatGpsL(false);
              }} style={{width:"100%",padding:"14px",borderRadius:12,marginBottom:14,
                background:platGpsLoading?C.bg2:C.purpleL,
                border:`1.5px solid ${C.purple}`,color:C.purpleD,
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
                {platGpsLoading?"ðŸ“¡ Localisationâ€¦":"ðŸ“ Capturer GPS plateforme"}
              </button>
            ):(
              <div style={{background:C.purpleL,borderRadius:10,padding:12,marginBottom:14,
                border:`1px solid ${C.purple}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.purpleD}}>ðŸ“ Position capturÃ©e</div>
                  <div style={{fontFamily:"monospace",fontSize:11,color:C.purpleD,marginTop:2}}>
                    {platGps.lat.toFixed(5)}Â°N Â· {platGps.lng.toFixed(5)}Â°E
                  </div>
                </div>
                <button onClick={()=>setPlatGps(null)} style={{background:"none",border:"none",
                  color:C.tx3,cursor:"pointer",fontSize:18}}>âœ•</button>
              </div>
            )}

            <SectionTitle icon="ðŸ”‘" label="Autorisation nÃ©cessaire"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[[false,"âœ… Non","Aucune autorisation"],[true,"âš ï¸ Oui","DÃ©marche requise"]].map(([v,l,s])=>(
                <div key={String(v)} onClick={()=>setPlatAutor(v)} style={{
                  padding:"12px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${platAutorisation===v?(v?C.amber:C.green):C.bd}`,
                  background:platAutorisation===v?(v?C.amberL:C.greenL):"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:platAutorisation===v?(v?C.amberD:C.greenD):C.tx}}>{l}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{s}</div>
                </div>
              ))}
            </div>
            {platAutorisation&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                  Qui se charge de la dÃ©marche ?
                </div>
                <select value={platQuiAutoris} onChange={e=>setPlatQui(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                    border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                    background:"#fff",color:C.tx,outline:"none"}}>
                  <option value="">â€” SÃ©lectionner â€”</option>
                  <option value="proprietaire">PropriÃ©taire</option>
                  <option value="etf">ETF</option>
                  <option value="exploitant">Exploitant</option>
                  <option value="applitag">APPLITAG</option>
                  <option value="mairie">Mairie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            )}

            <div onClick={()=>setPlatPhoto(!platPhoto)} style={{
              display:"flex",alignItems:"center",gap:14,padding:14,borderRadius:12,
              cursor:"pointer",marginBottom:14,
              background:platPhoto?C.purpleL:"#fff",
              border:`2px solid ${platPhoto?C.purple:C.bd}`,
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:28}}>{platPhoto?"âœ…":"ðŸ“·"}</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:platPhoto?C.purpleD:C.tx}}>
                  Photo emplacement
                </div>
                <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                  {platPhoto?"âœ“ Photo confirmÃ©e":"Photographier la plateforme"}
                </div>
              </div>
            </div>
          </div>
        )}

        {step===8&&(
          <div>
            <SectionTitle icon="ðŸŒ±" label="Replantation prÃ©vue ?"/>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {[["non","âŒ","Non","Pas de replantation prÃ©vue"],
                ["oui","âœ…","Oui","Replantation planifiÃ©e"],
                ["a_definir","â“","Ã€ dÃ©finir","DÃ©cision ultÃ©rieure"]].map(([v,e,l,s])=>(
                <div key={v} onClick={()=>setReplantation(v)} style={{
                  padding:14,borderRadius:12,cursor:"pointer",
                  border:`2px solid ${replantation===v?C.green:C.bd}`,
                  background:replantation===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:replantation===v?C.greenD:C.tx}}>{e} {l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            {replantation==="oui"&&(
              <div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Essence(s) Ã  replanter
                  </div>
                  <select value={essenceReplanT} onChange={e=>setEssenceReplant(e.target.value)}
                    style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",
                      background:"#fff",color:C.tx,appearance:"auto"}}>
                    <option value="">â€” SÃ©lectionner une essence â€”</option>
                    <optgroup label="Feuillus">
                      <option value="chene">ðŸŒ³ ChÃªne</option>
                      <option value="charme">ðŸŒ¿ Charme</option>
                      <option value="hetre">ðŸŒ² HÃªtre</option>
                      <option value="frene">ðŸŒ¿ FrÃªne</option>
                      <option value="orme">ðŸŒ¿ Orme</option>
                      <option value="acacia">ðŸŒ¿ Acacia</option>
                      <option value="bouleau">ðŸŒ¿ Bouleau</option>
                      <option value="chataignier">ðŸŒ° ChÃ¢taignier</option>
                      <option value="fruitiers">ðŸ’ Fruitiers</option>
                      <option value="erables">ðŸ Ã‰rables</option>
                      <option value="tilleul">ðŸŒ¿ Tilleul</option>
                      <option value="aulne">ðŸŒ¿ Aulne</option>
                      <option value="peupliers">ðŸŒ¾ Peupliers</option>
                      <option value="saule">ðŸŒ¿ Saule</option>
                    </optgroup>
                    <optgroup label="RÃ©sineux">
                      <option value="pin_sylvestre">ðŸŒ² Pin sylvestre</option>
                      <option value="pin_maritime">ðŸŒ² Pin maritime</option>
                      <option value="sapin">ðŸŒ² Sapin</option>
                      <option value="epicea">ðŸŒ² Ã‰picÃ©a</option>
                      <option value="meleze">ðŸŒ² MÃ©lÃ¨ze</option>
                      <option value="douglas">ðŸŒ² Douglas</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="rdv_proprietaire">ðŸ“‹ Ã€ dÃ©finir avec le propriÃ©taire</option>
                    </optgroup>
                  </select>
                </div>
                <MSlider label="Surface Ã  replanter" value={surfaceReplant}
                  onChange={setSurfaceReplant} min={0.1} max={50} step={0.1}
                  unit=" ha" color={C.green}/>
                <MInput label="PÃ©riode prÃ©vue" value={dateReplant}
                  onChange={setDateReplant} type="month"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    ChargÃ© de cette mission
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[["proprietaire","ðŸ  PropriÃ©taire"],["etf","ðŸª“ ETF"],["autre","ðŸ‘¤ Autre"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setRespReplant(v)} style={{
                        flex:1,padding:"10px 4px",borderRadius:10,fontSize:12,
                        border:`1.5px solid ${respReplant===v?C.green:C.bd}`,
                        background:respReplant===v?C.greenL:"#fff",cursor:"pointer",
                        fontFamily:"inherit",color:respReplant===v?C.greenD:C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {(respReplant==="etf"||respReplant==="autre")&&(
                  <div style={{background:C.greenL,borderRadius:12,padding:14,marginTop:4,
                    border:`1px solid ${C.green}`}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.greenD,marginBottom:12}}>
                      {respReplant==="etf"?"ðŸª“ CoordonnÃ©es ETF":"ðŸ‘¤ CoordonnÃ©es du responsable"}
                    </div>
                    <MInput label="Nom de l'entreprise" value={replantNomEntreprise}
                      onChange={setReplantNomEntreprise} placeholder="Raison sociale"/>
                    <MInput label="Personne en charge" value={replantPersonne}
                      onChange={setReplantPersonne} placeholder="PrÃ©nom Nom du rÃ©fÃ©rent"/>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{flex:"0 0 110px"}}>
                        <MInput label="Code postal" value={replantCp}
                          onChange={setReplantCp} placeholder="89000" type="number"/>
                      </div>
                      <div style={{flex:1}}>
                        <MInput label="Ville" value={replantVille}
                          onChange={setReplantVille} placeholder="Auxerre"/>
                      </div>
                    </div>
                    <MInput label="TÃ©lÃ©phone" value={replantTel}
                      onChange={setReplantTel} placeholder="06 00 00 00 00" type="tel"/>
                    <MInput label="Email" value={replantEmail}
                      onChange={setReplantEmail} placeholder="contact@entreprise.fr" type="email"/>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step===9&&(
          <div>
            <SectionTitle icon="ðŸ…" label="Certification"/>
            <div style={{fontSize:12,color:C.tx3,marginBottom:14,lineHeight:1.6}}>
              Optionnel â€” sÃ©lectionnez si ce lot est soumis Ã  une certification forestiÃ¨re ou Ã©nergÃ©tique.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {[["aucune","â¬œ","Aucune","Pas de certification requise"],
                ["pefc","ðŸŒ¿","PEFC","Programme de reconnaissance des certifications forestiÃ¨res"],
                ["fsc","ðŸŒ³","FSC","Forest Stewardship Council"],
                ["red","âš¡","RED","Renewable Energy Directive (directive europÃ©enne)"]].map(([v,e,l,s])=>(
                <div key={v} onClick={()=>setCertification(v)} style={{
                  padding:14,borderRadius:12,cursor:"pointer",
                  border:`2px solid ${certification===v?C.blue:C.bd}`,
                  background:certification===v?C.blueL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:certification===v?C.blueD:C.tx}}>{e} {l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            {certification!=="aucune"&&(
              <>
                <MInput label="Organisme certificateur"
                  value={organismeCertif} onChange={setOrganismeCertif}
                  placeholder="Ex : Bureau Veritas, SGS, ECOCERTâ€¦"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Date de l'audit</div>
                    <input type="date" value={dateAudit} onChange={e=>setDateAudit(e.target.value)}
                      style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                        border:`1.5px solid ${C.bd}`,background:"#fff",
                        color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Date d'expiration</div>
                    <input type="date" value={dateExpiration} onChange={e=>setDateExpiration(e.target.value)}
                      style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                        border:`1.5px solid ${C.bd}`,background:"#fff",
                        color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
                  </div>
                </div>
                <MInput label={`NÂ° de certification ${certification.toUpperCase()}`}
                  value={numeroCertification} onChange={setNumeroCert}
                  placeholder="Ex: PEFC/10-31-1234 ou FSC-C012345"
                  hint="Obligatoire si certification validÃ©e"/>
                {certification==="red"&&(
                  <>
                    {/* â”€â”€ SÃ©lecteur VSS enrichi â”€â”€ */}
                    <div style={{marginBottom:6,marginTop:4}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>
                        SystÃ¨me volontaire de certification (VSS)
                      </div>
                      <div style={{fontSize:11,color:C.tx3,marginBottom:10,lineHeight:1.5}}>
                        SystÃ¨mes reconnus par la Commission europÃ©enne pour RED II.
                        SÃ©lectionnez le systÃ¨me utilisÃ© pour ce lot.
                      </div>
                      {VSS_RECONNUS.map(vss=>{
                        const sel = redSysVolontaire===vss.id;
                        return (
                          <div key={vss.id} onClick={()=>setRedSysVolontaire(vss.id)}
                            style={{marginBottom:8,borderRadius:12,cursor:"pointer",
                              border:`2px solid ${sel?vss.couleur:C.bd}`,
                              background:sel?vss.bg:"#fff",
                              padding:"10px 14px",
                              WebkitTapHighlightColor:"transparent"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div>
                                <span style={{fontSize:14,fontWeight:700,
                                  color:sel?vss.couleur:C.tx}}>{vss.label}</span>
                                {vss.vigilance&&(
                                  <span style={{marginLeft:8,fontSize:10,fontWeight:700,
                                    color:"#E65100",background:"#FFF3E0",
                                    padding:"2px 6px",borderRadius:4}}>âš ï¸ Vigilance</span>
                                )}
                                {vss.reconnu==="UE"&&!vss.vigilance&&(
                                  <span style={{marginLeft:8,fontSize:10,fontWeight:600,
                                    color:"#1565C0",background:"#E3F2FD",
                                    padding:"2px 6px",borderRadius:4}}>âœ… Reconnu UE</span>
                                )}
                              </div>
                              {sel&&<span style={{color:vss.couleur,fontSize:16}}>â—</span>}
                            </div>
                            <div style={{fontSize:11,color:C.tx3,marginTop:3}}>{vss.org}</div>
                            {sel&&(
                              <div style={{fontSize:11,color:C.tx2,marginTop:6,
                                lineHeight:1.5,padding:"8px 10px",
                                background:"rgba(255,255,255,.7)",borderRadius:8}}>
                                <div style={{marginBottom:3}}>
                                  <strong>PÃ©rimÃ¨tre :</strong> {vss.perimetre}
                                </div>
                                <div style={{color:C.tx3}}>{vss.note}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Fiche certificat complÃ¨te */}
                    {redSysVolontaire&&(
                      <div style={{background:"rgba(255,255,255,.8)",borderRadius:12,
                        padding:"12px 14px",marginBottom:8,
                        border:`1px solid ${C.bd}`}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
                          ðŸ“„ DÃ©tails du certificat VSS
                        </div>
                        <MInput label="NÂ° de certificat VSS"
                          value={redVssCertificat} onChange={setRedVssCertificat}
                          placeholder="Ex : SBP-COC-FR-123456 / SURE-FR-2026-â€¦"
                          hint="NumÃ©ro attribuÃ© par l'organisme certificateur"/>
                        <MInput label="Organisme certificateur"
                          value={redVssOrganisme} onChange={setRedVssOrganisme}
                          placeholder="Ex : Bureau Veritas, SGS, DNV, ECOCERTâ€¦"
                          hint="Organisme ayant rÃ©alisÃ© l'audit de certification"/>
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                            Date de validitÃ© du certificat
                          </div>
                          <input type="date" value={redVssDateValidite}
                            onChange={e=>setRedVssDateValidite(e.target.value)}
                            style={{width:"100%",padding:"10px 12px",borderRadius:10,
                              fontSize:14,border:`1.5px solid ${C.bd}`,
                              fontFamily:"inherit",outline:"none",boxSizing:"border-box",
                              background:"#fff",color:C.tx}}/>
                          {redVssDateValidite&&new Date(redVssDateValidite)<new Date()&&(
                            <div style={{fontSize:11,color:"#B91C1C",marginTop:4,fontWeight:600}}>
                              âš ï¸ Ce certificat est expirÃ© â€” mettre Ã  jour avant dÃ©claration RED
                            </div>
                          )}
                          {redVssDateValidite&&new Date(redVssDateValidite)>=new Date()&&
                           new Date(redVssDateValidite)<new Date(Date.now()+60*86400000)&&(
                            <div style={{fontSize:11,color:"#E65100",marginTop:4,fontWeight:600}}>
                              ðŸ”” Certificat expirant dans moins de 60 jours
                            </div>
                          )}
                        </div>
                        <MInput label="PÃ©rimÃ¨tre certifiÃ©"
                          value={redPerimetreCertif} onChange={setRedPerimetreCertif}
                          placeholder="Ex : rÃ©gion, massif, entitÃ© certifiÃ©e, rayon gÃ©ographiqueâ€¦"
                          hint="Zone ou entitÃ© couverte par le certificat VSS"/>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {certification==="red"&&(
              <div style={{background:C.blueL,borderRadius:12,padding:14,
                border:`1px solid ${C.blue}`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD,marginBottom:12}}>
                  âš¡ Informations RED obligatoires
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    CatÃ©gorie biomasse
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["bois_forestier","ðŸŒ² Bois forestier"],
                      ["residus","â™»ï¸ RÃ©sidus forestiers"],
                      ["dechets_bois","ðŸ—‘ï¸ DÃ©chets bois"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setRedCategorie(v)} style={{
                        padding:"10px 14px",borderRadius:10,textAlign:"left",
                        border:`1.5px solid ${redCategorie===v?C.blue:C.bd}`,
                        background:redCategorie===v?"#fff":C.bg,
                        cursor:"pointer",fontFamily:"inherit",fontSize:13,
                        color:redCategorie===v?C.blueD:C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <MSlider label="Distance chaufferie estimÃ©e" value={redDistance}
                  onChange={setRedDistance} min={10} max={500} step={10}
                  unit=" km" color={C.blue}/>
                <MInput label="Pays d&apos;origine" value={redPays}
                  onChange={setRedPays} placeholder="France"/>
                <MInput label="Massif / zone d&apos;approvisionnement"
                  value={redMassif} onChange={setRedMassif}
                  placeholder="Ex : ForÃªt de TronÃ§ais, massif des Vosgesâ€¦"
                  hint="Nom du massif forestier ou zone d'approvisionnement identifiÃ©e"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Premier point de collecte
                  </div>
                  {[["foret","ðŸŒ² Bord de route forÃªt"],["plateforme","ðŸ—ï¸ Plateforme de stockage"],["depot","ðŸ“¦ DÃ©pÃ´t intermÃ©diaire"],["broyage","ðŸŒ€ Site de broyage/dÃ©chiquetage"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedPointCollecte(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redPointCollecte===v?C.blue:C.bd}`,
                      background:redPointCollecte===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:13,
                      color:redPointCollecte===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Destination finale
                  </div>
                  {[["chaufferie","ðŸ”¥ Chaufferie / installation de combustion"],["reseau_chaleur","â™¨ï¸ RÃ©seau de chaleur"],["industrie","ðŸ­ Usage industriel"],["plateforme_transit","ðŸ—ï¸ Plateforme de transit"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedDestination(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redDestination===v?C.blue:C.bd}`,
                      background:redDestination===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:13,
                      color:redDestination===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:11,color:C.blueD,marginTop:8,padding:8,
                  background:"rgba(255,255,255,.6)",borderRadius:8}}>
                  â„¹ï¸ Le GPS de la parcelle et les tonnages serviront Ã  gÃ©nÃ©rer l&apos;auto-dÃ©claration RED lors de la livraison.
                </div>
                {/* â”€â”€ CritÃ¨re RED : forÃªts primaires / anciennes â”€â”€ */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    ForÃªts primaires / anciennes
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    La biomasse ne provient pas d'une forÃªt primaire ni d'une zone dont le statut a changÃ© aprÃ¨s janvier 2008 (art. 29 RED II).
                  </div>
                  {[["confirme","âœ… ConfirmÃ© â€” aucune forÃªt primaire ou ancienne concernÃ©e"],
                    ["a_verifier","ðŸ” Ã€ vÃ©rifier â€” origine Ã  documenter"],
                    ["non_concerne","âž– Non applicable Ã  ce lot"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedForetPrimaire(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redForetPrimaire===v?C.blue:C.bd}`,
                      background:redForetPrimaire===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:redForetPrimaire===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* â”€â”€ CritÃ¨re RED : maintien capacitÃ© productive â”€â”€ */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    Document de gestion forestiÃ¨re
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    Preuve du maintien de la capacitÃ© productive de la forÃªt (art. 29 RED II).
                  </div>
                  {[["psg","ðŸ“„ PSG â€” Plan Simple de Gestion (validÃ© ONF/CRPF)"],
                    ["cbps","ðŸ“‹ CBPS â€” Code de Bonnes Pratiques Sylvicoles"],
                    ["amenagement","ðŸ—‚ï¸ AmÃ©nagement forestier (forÃªt publique)"],
                    ["aucun","â¬œ Aucun document â€” dÃ©claration sur l'honneur"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedDocGestion(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redDocGestion===v?C.blue:C.bd}`,
                      background:redDocGestion===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:redDocGestion===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* â”€â”€ CritÃ¨re RED : limitation souches / bois mort â”€â”€ */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    Pratiques d'exploitation durables
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    Cochez les engagements respectÃ©s sur ce chantier (art. 29 RED II).
                  </div>
                  {[["souches","RÃ©colte de souches et racines limitÃ©e ou absente"],
                    ["boisMort","RÃ©tention de bois mort respectÃ©e (arbres sÃ©nescents maintenus)"],
                    ["coupeRase","Coupe rase dans les limites rÃ©glementaires (seuil surface)"]].map(([k,l])=>(
                    <div key={k} onClick={()=>setRedBoisMort(p=>({...p,[k]:!p[k]}))}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                        borderRadius:10,marginBottom:5,cursor:"pointer",
                        border:`1.5px solid ${redBoisMort[k]?C.green:C.bd}`,
                        background:redBoisMort[k]?C.greenL:"#fff",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                        border:`2px solid ${redBoisMort[k]?C.green:C.bd}`,
                        background:redBoisMort[k]?C.green:"#fff",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        color:"#fff",fontSize:12,fontWeight:800}}>
                        {redBoisMort[k]?"âœ“":""}
                      </div>
                      <span style={{fontSize:12,color:redBoisMort[k]?C.greenD:C.tx2,lineHeight:1.4}}>{l}</span>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Statut conformitÃ© RED
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[
                      ["conforme",    "âœ…","Conforme",    C.green,  C.greenL,  C.greenD],
                      ["a_verifier",  "ðŸ”","Ã€ vÃ©rifier",  C.amber,  C.amberL,  C.amber],
                      ["incomplet",   "âš ï¸","Incomplet",   C.orange||"#E65100", "#FFF3E0","#E65100"],
                      ["non_conforme","âŒ","Non conforme", C.red,    "#FFEBEE",  "#B71C1C"],
                    ].map(([v,e,l,border,bg,col])=>(
                      <button key={v} onClick={()=>setStatutRed(v)} style={{
                        padding:"10px 14px",borderRadius:10,textAlign:"left",
                        border:`2px solid ${statutRed===v?border:C.bd}`,
                        background:statutRed===v?bg:"#fff",
                        cursor:"pointer",fontFamily:"inherit",fontSize:13,
                        color:statutRed===v?col:C.tx2,fontWeight:statutRed===v?700:400,
                        WebkitTapHighlightColor:"transparent"}}>
                        {e} {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {step===10&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Alerte si textes annulÃ©s */}
            {TEXTES_REGL.some(t=>t.alerteActive)&&(
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,
                padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#991B1B",marginBottom:6}}>
                  ðŸš¨ Alerte rÃ©glementaire â€” textes impactant ce dossier
                </div>
                {TEXTES_REGL.filter(t=>t.alerteActive).map(t=>(
                  <div key={t.id} style={{marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#7F1D1D"}}>{t.texteRef}</div>
                    <div style={{fontSize:10,color:"#991B1B",marginTop:2}}>{t.motifStatut}</div>
                    {t.reservesJuridiques.slice(0,2).map((r,i)=>(
                      <div key={i} style={{fontSize:10,color:"#7F1D1D",marginTop:3,
                        padding:"4px 8px",background:"#FFF1F2",borderRadius:5}}>â€¢ {r}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Clause de rÃ©serve â€” obligatoire */}
            <div style={{background:"#F5F3FF",border:`2px solid ${clauseReserveOk?"#7C3AED":"#C4B5FD"}`,
              borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6D28D9",marginBottom:8,
                textTransform:"uppercase",letterSpacing:".5px"}}>Clause de rÃ©serve obligatoire</div>
              <div style={{fontSize:12,color:"#4C1D95",fontStyle:"italic",
                lineHeight:1.6,marginBottom:12,padding:"8px 10px",
                background:"rgba(124,58,237,.08)",borderRadius:8}}>
                Â« {CLAUSE_RESERVE} Â»
              </div>
              <div onClick={()=>setClauseReserve(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                  border:`2px solid ${clauseReserveOk?"#7C3AED":"#9CA3AF"}`,
                  background:clauseReserveOk?"#7C3AED":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {clauseReserveOk&&<span style={{color:"#fff",fontWeight:900,fontSize:13}}>âœ“</span>}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:clauseReserveOk?"#6D28D9":"#374151"}}>
                  Je confirme que cette clause est apposÃ©e sur tous les documents prÃ©paratoires *
                </span>
              </div>
            </div>

            {/* Dispositif d'aide visÃ© */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                Dispositif d'aide visÃ© (si applicable)
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  ["","Aucune aide publique visÃ©e"],
                  ...TEXTES_REGL.filter(t=>t.statut==="applicable").map(t=>[t.id,t.dispositif]),
                ].map(([val,lbl])=>(
                  <div key={val} onClick={()=>setDispositifAide(val)}
                    style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",
                      borderRadius:10,cursor:"pointer",WebkitTapHighlightColor:"transparent",
                      border:`1px solid ${dispositifAide===val?"#7C3AED":C.bd}`,
                      background:dispositifAide===val?"#F5F3FF":"#fff"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,marginTop:2,
                      border:`2px solid ${dispositifAide===val?"#7C3AED":"#D1D5DB"}`,
                      background:dispositifAide===val?"#7C3AED":"transparent"}}/>
                    <span style={{fontSize:12,color:dispositifAide===val?"#4C1D95":C.tx,
                      fontWeight:dispositifAide===val?600:400,lineHeight:1.4}}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flux bois â€” usage prÃ©vu */}
            <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:10}}>
                ðŸ”€ Usage prÃ©vu du bois mobilisÃ©
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  ["bo","ðŸªµ","Bois d'Å“uvre","Sciage, charpente"],
                  ["bi","ðŸ“¦","Bois d'industrie","PÃ¢te, panneaux"],
                  ["be","ðŸ”¥","Bois Ã©nergie","Plaquettes, granulÃ©s"],
                  ["mixte","ðŸ”€","Mixte","Plusieurs usages"],
                ].map(([v,ico,lbl,sub])=>(
                  <div key={v} onClick={()=>setUsagePrevu(v)}
                    style={{padding:"10px 10px",borderRadius:10,cursor:"pointer",
                      border:`2px solid ${usagePrevu===v?(v==="be"?"#B45309":v==="bo"?"#1E5B3A":"#0369A1"):C.bd}`,
                      background:usagePrevu===v?(v==="be"?"#FEF3C7":v==="bo"?"#D1FAE5":"#DBEAFE"):"#F9FAFB",
                      WebkitTapHighlightColor:"transparent",textAlign:"center"}}>
                    <div style={{fontSize:20}}>{ico}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:C.tx2}}>{sub}</div>
                  </div>
                ))}
              </div>
              {(usagePrevu==="bo"||usagePrevu==="mixte")&&(
                <div style={{marginBottom:8}}>
                  <MInput label="Volume bois d'Å“uvre prÃ©vu (mÂ³)" value={volBO} onChange={setVolBO}
                    placeholder="ex: 180" hint="Usage matiÃ¨re â€” stockage carbone long terme"/>
                  <MInput label="Destination BO" value={destBO} onChange={setDestBO}
                    placeholder="ex: Scierie Marchais â€” Moulins (03)"/>
                  <MInput label="RÃ©fÃ©rence preuve / bon" value={preuveDestBO} onChange={setPreuveDestBO}
                    placeholder="ex: BON-SC-2026-0441"/>
                </div>
              )}
              {(usagePrevu==="be"||usagePrevu==="mixte")&&(
                <div style={{marginBottom:8}}>
                  <MInput label="Volume bois Ã©nergie prÃ©vu (mÂ³)" value={volBE} onChange={setVolBE}
                    placeholder="ex: 320"/>
                  <MInput label="Destination BE" value={destBE} onChange={setDestBE}
                    placeholder="ex: Chaufferie Municipale St-Amand"/>
                  <MInput label="RÃ©fÃ©rence preuve / BL" value={preuveDestBE} onChange={setPreuveDestBE}
                    placeholder="ex: BL-2026-0831"/>
                </div>
              )}
              {usagePrevu==="bi"&&(
                <MInput label="Volume bois d'industrie prÃ©vu (mÂ³)" value={volBI} onChange={setVolBI}
                  placeholder="ex: 50"/>
              )}
              {usagePrevu&&<MInput label="Date de contrÃ´le prÃ©vue" value={dateControleFlux}
                onChange={setDateControle} placeholder="JJ/MM/AAAA" hint="VÃ©rification aprÃ¨s travaux"/>}
            </div>

            {/* â”€â”€ Arbitrage SNBC 3 â”€â”€ */}
            <div style={{background:"linear-gradient(135deg,#FFFBEB,#FEF3C7)",borderRadius:14,
              padding:"14px",border:"1.5px solid #F59E0B",marginTop:4}}>
              <div style={{fontSize:13,fontWeight:800,color:"#78350F",marginBottom:4}}>
                âš–ï¸ Arbitrage de la ressource â€” SNBC 3
              </div>
              <div style={{fontSize:11,color:"#92400E",marginBottom:12,lineHeight:1.5}}>
                La biomasse doit Ãªtre qualifiÃ©e selon son usage potentiel et l'usage effectivement retenu,
                conformÃ©ment Ã  la hiÃ©rarchie des usages SNBC 3 (matiÃ¨re prioritaire sur Ã©nergie).
              </div>

              {/* Usage potentiel */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Usage potentiel de cette ressource
                </div>
                {[["bois_oeuvre","ðŸªµ","Bois d'Å“uvre (BO)","Sciage, grumes â€” valorisation matiÃ¨re haute"],
                  ["bois_industrie","ðŸ“¦","Bois d'industrie (BI)","Panneaux, pÃ¢te, trituration"],
                  ["bois_energie","ðŸ”¥","Bois-Ã©nergie exclusif (BE)","QualitÃ© ou dimension hors marchÃ© matiÃ¨re"],
                  ["mixte_bo_be","ðŸŒ²","Mixte BO + BE","Lot hÃ©tÃ©rogÃ¨ne â€” partie valorisable matiÃ¨re"],
                  ["mixte_bi_be","ðŸŒ¿","Mixte BI + BE","Lot partiellement valorisable industrie"],
                ].map(([v,ico,l,s])=>(
                  <div key={v} onClick={()=>setUsagePotentiel(v)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                    borderRadius:10,marginBottom:5,cursor:"pointer",
                    border:`1.5px solid ${usagePotentiel===v?"#F59E0B":C.bd}`,
                    background:usagePotentiel===v?"#FEF3C7":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{ico}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:usagePotentiel===v?"#78350F":C.tx}}>{l}</div>
                      <div style={{fontSize:10,color:C.tx3}}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Usage retenu */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Usage effectivement retenu
                </div>
                {[["bois_oeuvre","ðŸªµ","Bois d'Å“uvre"],
                  ["bois_industrie","ðŸ“¦","Bois d'industrie"],
                  ["bois_energie","ðŸ”¥","Bois-Ã©nergie"],
                ].map(([v,ico,l])=>(
                  <button key={v} onClick={()=>setUsageRetenu(v)} style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    padding:"8px 14px",borderRadius:10,marginRight:6,marginBottom:6,
                    border:`2px solid ${usageRetenu===v?"#F59E0B":C.bd}`,
                    background:usageRetenu===v?"#FEF3C7":"#fff",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
                    color:usageRetenu===v?"#78350F":C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>
                    {ico} {l}
                  </button>
                ))}
              </div>

              {/* Alerte dÃ©classement */}
              {usagePotentiel!=="bois_energie"&&usageRetenu==="bois_energie"&&(
                <div style={{background:"#FEE2E2",borderRadius:10,padding:"10px 12px",
                  marginBottom:12,border:"1px solid #FECACA"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#991B1B",marginBottom:8}}>
                    âš ï¸ DÃ©classement vers l'Ã©nergie dÃ©tectÃ© â€” motif obligatoire
                  </div>
                  <div style={{fontSize:12,color:"#991B1B",marginBottom:10,lineHeight:1.5}}>
                    Ce lot prÃ©sente un potentiel matiÃ¨re mais est orientÃ© vers l'Ã©nergie.
                    ConformÃ©ment Ã  la hiÃ©rarchie des usages SNBC 3, un motif doit Ãªtre documentÃ©.
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {[["qualite_insuffisante","QualitÃ© insuffisante pour la valorisation matiÃ¨re"],
                      ["pas_de_client_matiere","Absence de client matiÃ¨re Ã  distance acceptable"],
                      ["couts_logistiques","CoÃ»ts logistiques prohibitifs vers scierie/industrie"],
                      ["essence_non_valorisable","Essence ou dimension hors marchÃ© matiÃ¨re local"],
                      ["degradation_acces","DÃ©gradation lors du transport, orientation Ã©nergie contrainte"],
                      ["urgence_exploitation","Contrainte calendaire â€” chablis, tempÃªte, urgence sanitaire"],
                      ["choix_proprietaire","Choix documentÃ© du propriÃ©taire"],
                      ["autre","Autre motif â€” prÃ©ciser ci-dessous"],
                    ].map(([v,l])=>(
                      <button key={v} onClick={()=>setMotifArbitrage(v)} style={{
                        padding:"8px 12px",borderRadius:8,textAlign:"left",
                        border:`1.5px solid ${motifArbitrage===v?"#991B1B":C.bd}`,
                        background:motifArbitrage===v?"#FEE2E2":"#fff",
                        cursor:"pointer",fontFamily:"inherit",fontSize:12,
                        color:motifArbitrage===v?"#991B1B":C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {motifArbitrage==="autre"&&(
                    <div style={{marginTop:8}}>
                      <textarea value={motifArbitrageLib}
                        onChange={e=>setMotifArbitrageLib(e.target.value)}
                        rows={2} placeholder="DÃ©crire le motif de dÃ©classementâ€¦"
                        style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:12,
                          border:"1.5px solid #FECACA",fontFamily:"inherit",
                          outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                    </div>
                  )}
                </div>
              )}

              {/* Niveau de sÃ©curisation */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Niveau de sÃ©curisation du volume
                </div>
                {[["securise","âœ…","SÃ©curisÃ©","Contrat signÃ©, preuve de destination disponible","#065F46","#D1FAE5"],
                  ["mobilisable_cond","âš ï¸","Mobilisable sous conditions","Accord propriÃ©taire, certification ou accÃ¨s Ã  confirmer","#92400E","#FEF3C7"],
                  ["theorique","ðŸ”µ","ThÃ©orique","Estimation statistique ou territoriale â€” non sÃ©curisÃ©e","#1E40AF","#DBEAFE"],
                ].map(([v,ico,l,s,col,bg])=>(
                  <div key={v} onClick={()=>setNiveauSecurisation(v)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                    borderRadius:10,marginBottom:5,cursor:"pointer",
                    border:`1.5px solid ${niveauSecurisation===v?col:C.bd}`,
                    background:niveauSecurisation===v?bg:"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:niveauSecurisation===v?col:C.tx}}>{l}</div>
                      <div style={{fontSize:10,color:C.tx3}}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preuve de destination finale */}
              <MInput label="Preuve de destination finale"
                value={preuveDestFin} onChange={setPreuveDestFin}
                placeholder="RÃ©f. contrat, BL, attestation clientâ€¦"
                hint="Lien ou rÃ©fÃ©rence documentaire prouvant l'usage effectif"/>
            </div>

            {/* Date de dÃ©pÃ´t et dÃ©cision */}
            {dispositifAide&&dispositifAide!==""&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <MInput label="Date de dÃ©pÃ´t prÃ©vue" value={dateDepotPrevu}
                  onChange={setDateDepotPrevu} placeholder="JJ/MM/AAAA"/>
                <MInput label="DÃ©cision attributive (si dÃ©jÃ  obtenue)" value={decisionAttributive}
                  onChange={setDecisionAttr} placeholder="ex: DÃ©cision nÂ° 2026-XXX du ..."/>
                <MInput label="RÃ©serves spÃ©cifiques Ã  ce dossier" value={reserveManuelle}
                  onChange={setReserveManuelle} placeholder="Observations juridiques particuliÃ¨res"/>
              </div>
            )}

            {/* Snapshot â€” aperÃ§u */}
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
              padding:"10px 12px",fontSize:11,color:"#1E40AF"}}>
              <div style={{fontWeight:700,marginBottom:6}}>
                ðŸ’¾ Snapshot rÃ©glementaire â€” sera figÃ© Ã  la date d'aujourd'hui
              </div>
              <div style={{color:"#1D4ED8",lineHeight:1.6}}>
                {TEXTES_REGL.map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                    padding:"2px 0",borderBottom:"1px solid #DBEAFE"}}>
                    <span>{t.texteRef}</span>
                    <span style={{fontWeight:700,
                      color:t.statut==="annule"?"#DC2626":t.statut==="applicable"?"#065F46":"#92400E"}}>
                      {STATUT_REGL[t.statut]?.icon} {STATUT_REGL[t.statut]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step===11&&(
          <ChecklistChantier/>
        )}

        {step<STEPS.length-1 ? (
          <BigBtn onClick={()=>{ if(returnStep!==null){setStep(returnStep);setReturnStep(null);}else{setStep(s=>s+1);} }}
            bg={step<10?C.green:stepValid[step]?currentStep.color:C.amber} style={{flex:1}}>
            {returnStep!==null?`â†© Retour au rÃ©capitulatif`
              :step<11?`Valider`
              :`${STEPS[step+1].icon} ${STEPS[step+1].label}`}
          </BigBtn>
        ) : (
          <BigBtn onClick={handleSave} bg={allValid?C.green:C.bg2}
            disabled={saving} style={{flex:1}} icon={saving?"":"âœ…"}>
            {saving?"Enregistrementâ€¦":"VALIDER LA VISITE"}
          </BigBtn>
        )}
        {step>0&&(
          <button onClick={()=>{ if(returnStep!==null){setStep(returnStep);setReturnStep(null);}else{setStep(s=>s-1);} }}
            style={{height:BTN_H,padding:"0 20px",
            borderRadius:14,background:C.bg2,color:C.tx2,border:"none",
            fontFamily:"inherit",fontSize:15,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            {returnStep!==null?"â†© RÃ©cap.":"< Retour"}
          </button>
        )}
      </div>
    </div>
  );
};

export const ListeVisites = ({visites}) => (
  <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
    {visites.length===0 ? (
      <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
        <div style={{fontSize:40,marginBottom:12}}>ðŸ”­</div>
        <div style={{fontSize:16,fontWeight:500}}>Aucune visite</div>
        <div style={{fontSize:13,marginTop:6}}>Lancez une visite depuis une fiche contact</div>
      </div>
    ) : visites.map(v=>(
      <div key={v.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
        borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:600}}>{v.lotNumero}</div>
          <div style={{fontSize:11,padding:"3px 8px",borderRadius:6,
            background:C.greenL,color:C.greenD,fontWeight:500}}>âœ… ValidÃ©e</div>
        </div>
        <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
          ðŸ“… {v.date} Â· ðŸ“¦ {fmtNum(v.volumeEstimeT)}t Â· {v.surfaceHa}ha<br/>
          ðŸš› AccÃ¨s {v.accesCamion}
          {Array.isArray(v.photos)&&v.photos.length>0&&
            <span> Â· ðŸ“· {v.photos.length} photo{v.photos.length>1?"s":""}</span>}
        </div>
      </div>
    ))}
  </div>
);

// â”€â”€ APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Ã‰CRAN RELEVÃ‰S â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
