// @ts-nocheck
import { useState, useRef } from "react";
import { C } from "../../design-system/tokens.js";
import { todayS, nowISO, uid } from "../../shared/utils.js";

const ACTIVITES_CONCERNEES = [
  "Exploitation forestière","Débardage","Broyage","Chargement","Déchiquetage",
  "Entretien de machines","Accès à certaines zones forestières","Brûlage dirigé",
];

const PERMIS_LOCAL_KEY = "applitag_permis_incendie";
const permisLocalGet = () => { try { return JSON.parse(localStorage.getItem(PERMIS_LOCAL_KEY)||"[]"); } catch { return []; } };
const permisLocalSave = (arr) => { try { localStorage.setItem(PERMIS_LOCAL_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

export const SectionPermisIncendie = () => {
  const [tab, setTab] = useState("nouveau"); // "nouveau" | "historique"
  const [permis, setPermis] = useState(() => permisLocalGet());

  // Formulaire
  const today = todayS();
  const [date,         setDate]         = useState(today);
  const [departement,  setDepartement]  = useState("");
  const [commune,      setCommune]      = useState("");
  const [lat,          setLat]          = useState("");
  const [lng,          setLng]          = useState("");
  const [arrete,       setArrete]       = useState("");
  const [dateConsult,  setDateConsult]  = useState(() => new Date().toISOString().slice(0,16));
  const [niveau,       setNiveau]       = useState("eleve");
  const [horaires,     setHoraires]     = useState("");
  const [activites,    setActivites]    = useState([]);
  const [extinction,   setExtinction]   = useState("");
  const [acces,        setAcces]        = useState("");
  const [responsable,  setResponsable]  = useState("");
  const [photo,        setPhoto]        = useState(null);
  const [photoUrl,     setPhotoUrl]     = useState(null);
  const [saved,        setSaved]        = useState(false);
  const fileRef = useRef();

  const _niveauInfo = NIVEAUX_RESTRICTION.find(n=>n.id===niveau) || NIVEAUX_RESTRICTION[0];

  const toggleActivite = (a) => setActivites(prev =>
    prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]
  );

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhoto(f.name);
    setPhotoUrl(url);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude.toFixed(5));
      setLng(pos.coords.longitude.toFixed(5));
    }, () => {});
  };

  const valider = () => {
    if (!departement || !responsable || !niveau) return;
    const p = {
      id: uid(),
      createdAt: nowISO(),
      date, departement, commune,
      coordGPS: lat && lng ? {lat:parseFloat(lat), lng:parseFloat(lng)} : null,
      arrete, dateConsult, niveau,
      horaires, activites, extinction, acces, responsable,
      photo,
      ref: `PERM-${date.replace(/-/g,"")}-${departement.slice(0,3).toUpperCase()}`,
    };
    const updated = [p, ...permis];
    setPermis(updated);
    permisLocalSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const supprimer = (id) => {
    const updated = permis.filter(p=>p.id!==id);
    setPermis(updated);
    permisLocalSave(updated);
  };

  const Row = ({label, val}) => val ? (
    <div style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bd}`,fontSize:13}}>
      <span style={{color:C.tx3,minWidth:150,flexShrink:0}}>{label}</span>
      <span style={{color:C.tx,fontWeight:500}}>{val}</span>
    </div>
  ) : null;

  return (
    <div style={{padding:PADDING,maxWidth:640,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{background:`linear-gradient(135deg,#7F1D1D 0%,#B91C1C 100%)`,borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🔥</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:4}}>
          Permis quotidien de chantier
        </div>
        <div style={{fontSize:13,opacity:.85}}>Incendie forêt — Validation avant intervention en zone à risque</div>
      </div>

      {/* Alerte arrêtés Pays de la Loire */}
      <div style={{background:"#FFF7ED",border:"1px solid #FB923C",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5}}>
        <div style={{fontWeight:700,color:"#C2410C",marginBottom:4}}>⚠️ Alerte active — 31 juillet 2026 à 23 h 59</div>
        <div style={{color:"#7C2D12"}}>
          Restrictions niveau élevé en vigueur : <strong>Loire-Atlantique, Mayenne, Sarthe, Vendée, Maine-et-Loire</strong>.
          L'expiration d'un arrêté ce soir ne vaut pas autorisation automatique pour lundi — vérifier si un nouvel arrêté est publié.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["nouveau","✏️ Nouveau permis"],["historique","📋 Historique"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${tab===id?"#B91C1C":C.bd}`,
            background:tab===id?"#FEE2E2":"#fff",color:tab===id?"#991B1B":C.tx2,
            fontWeight:tab===id?700:500,fontSize:14,cursor:"pointer"
          }}>{lbl}</button>
        ))}
      </div>

      {tab==="nouveau" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Date */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Date du chantier</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Localisation */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Département</div>
              <input value={departement} onChange={e=>setDepartement(e.target.value)} placeholder="ex: Sarthe (72)"
                style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Commune</div>
              <input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Nom de commune"
                style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* GPS */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Coordonnées GPS</div>
            <div style={{display:"flex",gap:8}}>
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude"
                style={{flex:1,height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude"
                style={{flex:1,height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
              <button onClick={handleGPS} style={{height:INPUT_H,padding:"0 14px",borderRadius:10,
                border:`1.5px solid ${C.blue}`,background:C.blueL,color:C.blue,cursor:"pointer",fontSize:18}}>
                📍
              </button>
            </div>
          </div>

          {/* Arrêté */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Arrêté consulté</div>
            <input value={arrete} onChange={e=>setArrete(e.target.value)}
              placeholder="Référence ou URL de l'arrêté préfectoral"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Date & heure consultation */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Date & heure de consultation de l'arrêté</div>
            <input type="datetime-local" value={dateConsult} onChange={e=>setDateConsult(e.target.value)}
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Niveau de restriction */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Niveau de restriction</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {NIVEAUX_RESTRICTION.map(n=>(
                <label key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                  borderRadius:10,border:`2px solid ${niveau===n.id?n.couleur:C.bd}`,
                  background:niveau===n.id?n.bg:"#fff",cursor:"pointer"}}>
                  <input type="radio" name="niveau" value={n.id} checked={niveau===n.id}
                    onChange={()=>setNiveau(n.id)} style={{accentColor:n.couleur}}/>
                  <span style={{fontSize:18}}>{n.icon}</span>
                  <span style={{fontSize:14,fontWeight:niveau===n.id?700:400,color:niveau===n.id?n.couleur:C.tx}}>
                    {n.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Horaires autorisés */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Horaires autorisés</div>
            <input value={horaires} onChange={e=>setHoraires(e.target.value)}
              placeholder="ex : 6 h – 11 h, reprise possible après 19 h"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Activités concernées */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Activités soumises à restriction</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ACTIVITES_CONCERNEES.map(a=>{
                const sel = activites.includes(a);
                return (
                  <button key={a} onClick={()=>toggleActivite(a)} style={{
                    padding:"6px 12px",borderRadius:8,fontSize:13,cursor:"pointer",
                    border:`1.5px solid ${sel?C.red:C.bd}`,
                    background:sel?C.redL:"#fff",color:sel?C.red:C.tx2,fontWeight:sel?700:400
                  }}>{a}</button>
                );
              })}
            </div>
          </div>

          {/* Moyens d'extinction */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Moyens d'extinction disponibles</div>
            <textarea value={extinction} onChange={e=>setExtinction(e.target.value)} rows={2}
              placeholder="ex : 2 extincteurs ABC 6 kg, citerne 500 L sur tracteur, lance incendie..."
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"12px 14px",fontSize:14,resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>

          {/* Accès secours */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Accès des secours</div>
            <textarea value={acces} onChange={e=>setAcces(e.target.value)} rows={2}
              placeholder="ex : RD 104 puis chemin forestier n°12, portail code 1234, point de ralliement..."
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"12px 14px",fontSize:14,resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>

          {/* Photo de contrôle */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Photo de contrôle</div>
            <button onClick={()=>fileRef.current?.click()} style={{
              width:"100%",height:56,borderRadius:10,border:`2px dashed ${C.bd}`,
              background:"#fafafa",color:C.tx2,fontSize:14,cursor:"pointer"
            }}>
              📷 {photo ? photo : "Prendre une photo ou importer"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhoto} style={{display:"none"}}/>
            {photoUrl && <img src={photoUrl} alt="contrôle" style={{width:"100%",borderRadius:10,marginTop:8,objectFit:"cover",maxHeight:200}}/>}
          </div>

          {/* Responsable */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Responsable validant l'intervention</div>
            <input value={responsable} onChange={e=>setResponsable(e.target.value)}
              placeholder="Nom Prénom — Fonction"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Bouton valider */}
          <button onClick={valider} disabled={!departement||!responsable} style={{
            height:BTN_H,borderRadius:12,border:"none",
            background:(!departement||!responsable)?"#ccc":"#B91C1C",
            color:"#fff",fontWeight:700,fontSize:16,cursor:(!departement||!responsable)?"not-allowed":"pointer",
            marginTop:4
          }}>
            ✅ Valider le permis de chantier
          </button>

          {saved && (
            <div style={{background:"#D1FAE5",borderRadius:10,padding:"12px 14px",
              color:"#065F46",fontWeight:600,fontSize:14,textAlign:"center"}}>
              ✅ Permis enregistré — référence {permis[0]?.ref}
            </div>
          )}
        </div>
      )}

      {tab==="historique" && (
        <div>
          {permis.length===0 ? (
            <div style={{textAlign:"center",padding:40,color:C.tx3,fontSize:15}}>
              Aucun permis enregistré
            </div>
          ) : permis.map(p=>{
            const niv = NIVEAUX_RESTRICTION.find(n=>n.id===p.niveau) || NIVEAUX_RESTRICTION[0];
            return (
              <div key={p.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
                padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{p.ref}</div>
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{p.departement} · {p.date}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,fontWeight:700,
                      background:niv.bg,color:niv.couleur}}>{niv.icon} {niv.label}</span>
                    <button onClick={()=>supprimer(p.id)} style={{background:"none",border:"none",
                      color:C.tx3,cursor:"pointer",fontSize:18,padding:0}}>🗑️</button>
                  </div>
                </div>
                <Row label="Commune" val={p.commune}/>
                <Row label="Arrêté consulté" val={p.arrete}/>
                <Row label="Consulté le" val={p.dateConsult?.replace("T"," ")}/>
                <Row label="Horaires autorisés" val={p.horaires}/>
                <Row label="Activités concernées" val={p.activites?.join(", ")}/>
                <Row label="Responsable" val={p.responsable}/>
                <Row label="GPS" val={p.coordGPS?`${p.coordGPS.lat}, ${p.coordGPS.lng}`:null}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
