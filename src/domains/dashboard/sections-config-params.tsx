// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
// ── PARAMÈTRES ───────────────────────────────────────────────────

export const SectionParametres = () => {
  const [onglet, setOnglet] = useState("entreprise");
  const [nomEntreprise, setNomEntreprise] = useState("ALTEGAD SAS");
  const [siret, setSiret] = useState("452 198 347 00021");
  const [adresse, setAdresse] = useState("12 rue de la Forêt, 03000 Moulins");
  const [email, setEmail] = useState("contact@altegad.fr");
  const [tel, setTel] = useState("04 70 00 00 00");
  const [codeInsee, setCodeInsee] = useState("03190");
  const [codePostal, setCodePostal] = useState("03000");
  const [seuilHumi, setSeuilHumi] = useState(30);
  const [seuilStockAlerte, setSeuilStockAlerte] = useState(20);
  const [delaiRelance, setDelaiRelance] = useState(7);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>⚙️ Paramètres</div>
        <div style={{fontSize:13,color:C.tx2}}>Configuration de l'entreprise, seuils d'alerte et préférences</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
        {[["entreprise","🏢 Entreprise"],["alertes","🔔 Seuils d'alerte"],["documents","📄 Documents PDF"],["systeme","🔧 Système"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {onglet==="entreprise"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[
              ["Raison sociale",nomEntreprise,setNomEntreprise,"text"],
              ["SIRET",siret,setSiret,"text"],
              ["Adresse",adresse,setAdresse,"text"],
              ["Email",email,setEmail,"email"],
              ["Téléphone",tel,setTel,"tel"],
              ["Code postal",codePostal,setCodePostal,"text"],
            ].map(([label,val,setter,type])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <input type={type} value={val} onChange={e=>setter(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:12,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Logo</div>
              <div style={{border:`2px dashed ${C.bd}`,borderRadius:7,padding:"14px",
                textAlign:"center",color:C.tx3,fontSize:11}}>
                📷 Glisser le logo ici (PNG/SVG)
              </div>
            </div>
          </div>

          {/* Bloc SDES — code INSEE */}
          <div style={{marginTop:16,background:"#EFF6FF",borderRadius:10,
            padding:"12px 16px",border:"1px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1D4ED8",marginBottom:8}}>
              📊 Données SDES — Réseaux de chaleur
            </div>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontSize:10,fontWeight:700,color:"#1D4ED8",marginBottom:4}}>
                  Code INSEE commune (5 chiffres)
                </div>
                <input value={codeInsee} onChange={e=>setCodeInsee(e.target.value)}
                  placeholder="ex: 33063"
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,
                    border:"1.5px solid #93C5FD",fontSize:13,fontFamily:"monospace",
                    background:"#fff",color:"#1E40AF",outline:"none",letterSpacing:"0.1em"}}/>
              </div>
              <div style={{fontSize:10,color:"#3B82F6",lineHeight:1.5,flex:2,minWidth:200}}>
                Ce code permet à APPLITAG de matcher automatiquement les données SDES
                (livraisons GWh, PDL, taux CO₂) de la commune chaufferie.
                Récupérable sur <strong>geo.api.gouv.fr</strong> ou <strong>insee.fr</strong>.
              </div>
            </div>
            {codeInsee.length===5&&/^\d{5}$/.test(codeInsee)&&(
              <div style={{marginTop:8,fontSize:11,color:"#065F46",
                background:"#D1FAE5",borderRadius:6,padding:"4px 10px",display:"inline-block"}}>
                ✅ Code INSEE valide — enrichissement SDES activé
              </div>
            )}
          </div>
        </div>
      )}

      {onglet==="alertes"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {label:"Seuil humidité bois (% max)",val:seuilHumi,setter:setSeuilHumi,unit:"%",
               desc:"Alerte si une livraison dépasse ce taux",col:"#0369A1"},
              {label:"Seuil stock chaufferie (% min)",val:seuilStockAlerte,setter:setSeuilStockAlerte,unit:"%",
               desc:"Alerte si le stock d'une chaufferie passe sous ce seuil",col:"#B45309"},
              {label:"Délai relance contacts (jours)",val:delaiRelance,setter:setDelaiRelance,unit:"j",
               desc:"Relance automatique si pas de réponse après ce délai",col:"#7C3AED"},
            ].map(s=>(
              <div key={s.label} style={{padding:"12px 14px",borderRadius:10,
                border:`1px solid ${s.col}33`,background:s.col+"08"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:8}}>{s.desc}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="range" min={0} max={s.unit==="%"?100:30}
                    value={s.val} onChange={e=>s.setter(Number(e.target.value))}
                    style={{flex:1,accentColor:s.col}}/>
                  <div style={{minWidth:48,textAlign:"center",fontWeight:900,fontSize:16,color:s.col}}>
                    {s.val}{s.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="documents"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              ["Mention légale sur BL","Sous réserve de vérification qualité à réception."],
              ["Pied de page contrats","ALTEGAD SAS — RC Moulins — TVA FR 12 452 198 347"],
              ["Clause de réserve réglementaire","Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt."],
            ].map(([label,defVal])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <textarea defaultValue={defVal} rows={2}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,
                    outline:"none",resize:"vertical"}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="systeme"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {ico:"💾",label:"Sauvegarde des données",desc:"Dernière sauvegarde : aujourd'hui à 03h00",action:"Sauvegarder maintenant",col:"#1E5B3A"},
            {ico:"📤",label:"Export global",desc:"Exporter toutes les données APPLITAG en JSON/Excel",action:"Exporter",col:"#0369A1"},
            {ico:"🔄",label:"Synchronisation",desc:"État : à jour — dernière synchro il y a 4 min",action:"Forcer synchro",col:"#7C3AED"},
            {ico:"🔍",label:"Journal des erreurs",desc:"0 erreur détectée dans les 7 derniers jours",action:"Voir le journal",col:"#6B7280"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
              padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:24}}>{s.ico}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>{s.desc}</div>
              </div>
              <button style={{padding:"6px 14px",borderRadius:7,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",border:`1px solid ${s.col}`,
                background:"transparent",color:s.col}}>
                {s.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton sauvegarder */}
      {onglet!=="systeme"&&(
        <div style={{marginTop:16,display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={save}
            style={{padding:"9px 24px",borderRadius:9,fontSize:12,fontWeight:800,
              cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
            💾 Enregistrer les modifications
          </button>
          {saved&&<span style={{fontSize:12,color:"#059669",fontWeight:700}}>✅ Modifications enregistrées</span>}
        </div>
      )}
    </div>
  );
};

// ── CHANTIERS ───────────────────────────────────────────────────

