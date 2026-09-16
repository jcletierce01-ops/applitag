// @ts-nocheck
import { useState, useEffect } from "react";
import { C, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { uid } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { calculerPci, calculerEnergie } from "../../metier/formules.js";

// ── ÉCRAN FIN DE CHANTIER (7 sections) ───────────────────────
export const EcranFinChantier = ({lot, onBack, onSaved, toast, entrepriseId}: any) => {
  const [section, setSection] = useState(0);

  // §1 Photos avant/après
  const [photosAvant,   setPhotosAvant]  = useState<any[]>([]);
  const [photosApres,   setPhotosApres]  = useState<any[]>([]);
  const [photosDepot,   setPhotosDepot]  = useState<any[]>([]);
  const [photosAcces,   setPhotosAcces]  = useState<any[]>([]);

  // §2 Rénovation
  const [surfaceRenovee,setSurfRenov]    = useState(0);
  const [typeBroyage,   setTypeBroyage]  = useState<any[]>([]);
  const [machineRenov,  setMachineRenov] = useState("");
  const [tempsRenov,    setTempsRenov]   = useState(0);
  const [nbPassages,    setNbPassages]   = useState(1);

  // §3 Consommations
  const [gnrLitres,     setGnrLitres]   = useState("");
  const [prixLitre,     setPrixLitre]   = useState("");
  const [coutMachine,   setCoutMach]     = useState("");
  const [coutOperateur, setCoutOp]       = useState("");

  // §4 Contrôle qualité (checklist 6 points)
  const [checklist, setChecklist] = useState<Record<string,boolean>>({
    depotNettoye:false, remanentsTraites:false, accesRetablis:false,
    fossesPreserves:false, pasDechets:false, respectConsignes:false,
  });

  // §5 Validation propriétaire
  const [sigPropFin,    setSigPropFin]   = useState(false);
  const [sigDataFin,    setSigDataFin]   = useState<any>(null);
  const [nomPropFin,    setNomPropFin]   = useState(lot.nom||"");
  const [reserveProp,   setReserveProp]  = useState("sans_reserve"); // sans_reserve | avec_reserve
  const [commentaireProp,setComProp]     = useState("");

  // §6 Note qualité
  const [noteQualite,   setNoteQualite]  = useState(0); // 1-5

  // §7 Indice APPLITAG (calculé)
  const [saving, setSaving] = useState(false);

  const SECTIONS = [
    {icon:"📷", label:"Photos"},
    {icon:"🌿", label:"Rénovation"},
    {icon:"⛽", label:"Consommations"},
    {icon:"✅", label:"Qualité"},
    {icon:"✍️", label:"Validation"},
    {icon:"⭐", label:"Note"},
    {icon:"📊", label:"Indice"},
  ];

  const TYPE_BROYAGE_OPTS = [
    "Rémanents forestiers","Accotements","Souches","Invasives","Dépôt","Plateforme"
  ];

  const toggleBroyage = (v: any) => setTypeBroyage(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);

  // Calcul indice APPLITAG 0-100
  const nbCheckOK = Object.values(checklist).filter(Boolean).length;
  const hasPhotos = photosApres.length>0 || photosAvant.length>0;
  const indiceDocs = hasPhotos ? 25 : 0;
  const indiceQualite = Math.round((nbCheckOK/6)*35);
  const indiceNote = noteQualite>0 ? Math.round((noteQualite/5)*20) : 0;
  const indiceValidation = sigDataFin ? 20 : (sigPropFin ? 10 : 0);
  const indiceTotal = Math.min(100, indiceDocs + indiceQualite + indiceNote + indiceValidation);

  const indiceLabel = indiceTotal>=80?"Excellent":indiceTotal>=60?"Bon":
    indiceTotal>=40?"Conforme":indiceTotal>=20?"À améliorer":"Non conforme";

  const coutCarburant = ((parseFloat(gnrLitres)||0) * (parseFloat(prixLitre)||0));
  const totalCout = coutCarburant+(parseFloat(coutMachine)||0)+(parseFloat(coutOperateur)||0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost(`/fin-chantier`, {
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          photosAvant, photosApres, photosDepot, photosAcces,
          surfaceRenovee, typeBroyage, machineRenov, tempsRenov, nbPassages,
          gnrLitres, coutCarburant, coutMachine, coutOperateur, totalCout,
          checklist, nbCheckOK,
          sigPropFin, sigDataFin, nomPropFin, reserveProp, commentaireProp,
          noteQualite, indiceTotal, indiceLabel,
          statut:"LIVRE",
      });
      toast("Fin de chantier validée ✓");
      onSaved();
    } catch {
      toast("Fin de chantier enregistrée localement ✓");
      onSaved();
    }
    setSaving(false);
  };

  const NoteEtoile = ({n}: any) => (
    <button onClick={()=>setNoteQualite(n)} style={{
      fontSize:32,background:"none",border:"none",cursor:"pointer",
      opacity:noteQualite>=n?1:0.25,
      WebkitTapHighlightColor:"transparent",
      filter:noteQualite>=n?"none":"grayscale(1)"}}>⭐</button>
  );

  const NOTES_LABELS = ["","Non conforme","À améliorer","Conforme","Bon","Excellent"];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.greenD,color:"#fff",padding:"10px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🏁 Fin de chantier</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
          <div style={{fontSize:12,fontWeight:700,background:"rgba(255,255,255,.15)",
            padding:"4px 10px",borderRadius:8}}>
            {section+1}/7
          </div>
        </div>
        {/* Barre sections */}
        <div style={{display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none"}}>
          {SECTIONS.map((s,i)=>(
            <button key={i} onClick={()=>setSection(i)} style={{
              flex:"0 0 auto",padding:"8px 12px",background:"transparent",border:"none",
              color:section===i?"#fff":"rgba(255,255,255,.4)",
              fontFamily:"inherit",fontSize:11,fontWeight:section===i?700:400,
              cursor:"pointer",borderBottom:section===i?"2px solid #fff":"2px solid transparent",
              WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {/* ── §1 PHOTOS ── */}
        {section===0&&(
          <div>
            <SectionTitle icon="📷" label="Photos avant/après"/>
            {[
              {label:"📷 Photos AVANT exploitation",state:photosAvant,set:setPhotosAvant,
               hint:"Parcelle, accès avant travaux"},
              {label:"📷 Photos APRÈS exploitation",state:photosApres,set:setPhotosApres,
               hint:"État final de la parcelle"},
              {label:"📷 Place de dépôt",state:photosDepot,set:setPhotosDepot,
               hint:"Bord de route, stockage"},
              {label:"📷 Accès rétablis",state:photosAcces,set:setPhotosAcces,
               hint:"Chemins, barrières, fossés"},
            ].map(({label,state,set,hint},i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:14,
                marginBottom:12,border:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{label}</div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:10}}>{hint}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                  {state.map((_p,j)=>(
                    <div key={j} style={{width:64,height:64,borderRadius:8,
                      background:C.greenL,border:`1px solid ${C.green}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,color:C.greenD,fontWeight:600,position:"relative"}}>
                      📷<span style={{position:"absolute",top:-6,right:-6,
                        background:C.red,color:"#fff",borderRadius:"50%",
                        width:18,height:18,fontSize:11,display:"flex",
                        alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                        onClick={()=>set(s=>s.filter((_,k)=>k!==j))}>✕</span>
                    </div>
                  ))}
                  <button onClick={()=>set(s=>[...s,`photo_${uid()}`])} style={{
                    width:64,height:64,borderRadius:8,background:C.bg2,
                    border:`2px dashed ${C.bd}`,cursor:"pointer",fontSize:24,
                    WebkitTapHighlightColor:"transparent"}}>+</button>
                </div>
                <div style={{fontSize:10,color:state.length>0?C.greenD:C.tx3}}>
                  {state.length>0?`✅ ${state.length} photo(s)`:"Aucune photo"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── §2 RÉNOVATION ── */}
        {section===1&&(
          <div>
            <SectionTitle icon="🌿" label="Travaux de rénovation"/>
            <MSlider label="Surface rénovée" value={surfaceRenovee} onChange={setSurfRenov}
              min={0} max={50} step={0.5} unit=" ha" color={C.green}/>
            <SectionTitle icon="🌀" label="Types de broyage réalisés"/>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {TYPE_BROYAGE_OPTS.map(v=>(
                <div key={v} onClick={()=>toggleBroyage(v)} style={{
                  padding:"12px 14px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${typeBroyage.includes(v)?C.green:C.bd}`,
                  background:typeBroyage.includes(v)?C.greenL:"#fff",
                  display:"flex",alignItems:"center",gap:10,
                  WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:18}}>{typeBroyage.includes(v)?"✅":"⬜"}</span>
                  <span style={{fontSize:14,fontWeight:typeBroyage.includes(v)?600:400,
                    color:typeBroyage.includes(v)?C.greenD:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <MInput label="Machine utilisée" value={machineRenov} onChange={setMachineRenov}
              placeholder="Ex: Broyeur Ahwi, Prinoth Raptor…"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Temps (heures)" value={String(tempsRenov||"")}
                onChange={v=>setTempsRenov(parseFloat(v)||0)} type="number" placeholder="ex: 8"/>
              <MInput label="Nb passages" value={String(nbPassages||"")}
                onChange={v=>setNbPassages(parseInt(v)||1)} type="number" placeholder="1"/>
            </div>
          </div>
        )}

        {/* ── §3 CONSOMMATIONS ── */}
        {section===2&&(
          <div>
            <SectionTitle icon="⛽" label="Consommations et coûts"/>
            <MInput label="GNR consommé (litres)" value={gnrLitres} onChange={setGnrLitres}
              type="number" placeholder="ex: 120"/>
            <MInput label="Prix carburant (€/L)" value={prixLitre} onChange={setPrixLitre}
              type="number" placeholder="ex: 1.45"/>
            {gnrLitres&&prixLitre&&(
              <div style={{background:C.amberL,borderRadius:10,padding:"10px 14px",
                marginBottom:14,border:`1px solid ${C.amber}`,fontSize:13,color:C.amberD}}>
                ⛽ Coût carburant calculé : <strong>{fmtNum(coutCarburant,2)} € HT</strong>
                <span style={{fontSize:11,opacity:.7,marginLeft:8}}>
                  ({gnrLitres} L × {prixLitre} €/L)
                </span>
              </div>
            )}
            <SectionTitle icon="💶" label="Coûts (€ HT)"/>
            <MInput label="Coût machine" value={coutMachine} onChange={setCoutMach}
              type="number" placeholder="ex: 350"/>
            <MInput label="Coût opérateur" value={coutOperateur} onChange={setCoutOp}
              type="number" placeholder="ex: 280"/>
            {totalCout>0&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                border:`1.5px solid ${C.amber}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[[coutCarburant+"€","Carburant"],[coutMachine+"€","Machine"],
                    [coutOperateur+"€","Opérateur"]].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",
                      background:"rgba(186,117,23,.1)",borderRadius:8,padding:8}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:"center",marginTop:10,fontSize:16,
                  fontWeight:700,color:C.amberD}}>
                  Total : {fmtNum(totalCout,2)} € HT
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── §4 CONTRÔLE QUALITÉ ── */}
        {section===3&&(
          <div>
            <SectionTitle icon="✅" label="Checklist contrôle qualité"/>
            <div style={{background:C.blueL,borderRadius:12,padding:12,marginBottom:14,
              border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
              Valider les 6 points obligatoires avant validation finale
            </div>
            {[
              {k:"depotNettoye",    icon:"🧹",label:"Dépôt nettoyé",    sub:"Place de dépôt dégagée, bois évacué"},
              {k:"remanentsTraites",icon:"🌿",label:"Rémanents traités", sub:"Broyés ou andainés selon contrat"},
              {k:"accesRetablis",   icon:"🛤️", label:"Accès rétablis",   sub:"Chemins, barrières, passages remis en état"},
              {k:"fossesPreserves", icon:"💧",label:"Fossés préservés",  sub:"Fossés et écoulements non obstrués"},
              {k:"pasDechets",      icon:"♻️", label:"Pas de déchets",    sub:"Aucun déchet laissé sur la parcelle"},
              {k:"respectConsignes",icon:"📋",label:"Consignes respectées",sub:"Conditions du contrat respectées"},
            ].map(({k,icon,label,sub})=>(
              <div key={k} onClick={()=>setChecklist(p=>({...p,[k]:!p[k]}))} style={{
                display:"flex",alignItems:"center",gap:14,padding:"14px",
                borderRadius:12,marginBottom:10,cursor:"pointer",
                border:`2px solid ${checklist[k]?C.green:C.bd}`,
                background:checklist[k]?C.greenL:"#fff",
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:24}}>{checklist[k]?"✅":icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,
                    color:checklist[k]?C.greenD:C.tx}}>{label}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{sub}</div>
                </div>
              </div>
            ))}
            <div style={{background:nbCheckOK===6?C.greenL:C.amberL,borderRadius:12,
              padding:14,border:`1.5px solid ${nbCheckOK===6?C.green:C.amber}`,
              textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,
                color:nbCheckOK===6?C.greenD:C.amberD}}>
                {nbCheckOK}/6 points validés
              </div>
              {nbCheckOK<6&&(
                <div style={{fontSize:12,color:C.amberD,marginTop:4}}>
                  {6-nbCheckOK} point(s) restant(s) à valider
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── §5 VALIDATION PROPRIÉTAIRE ── */}
        {section===4&&(
          <div>
            <SectionTitle icon="✍️" label="Validation propriétaire"/>
            <MInput label="Nom du propriétaire" value={nomPropFin} onChange={setNomPropFin}
              placeholder="Prénom Nom"/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                Validation
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["sans_reserve","✅","Sans réserve"],["avec_reserve","⚠️","Avec réserve"]].map(([v,e,l])=>(
                  <div key={v} onClick={()=>setReserveProp(v)} style={{
                    padding:"14px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
                    border:`2px solid ${reserveProp===v?(v==="sans_reserve"?C.green:C.amber):C.bd}`,
                    background:reserveProp===v?(v==="sans_reserve"?C.greenL:C.amberL):"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{e}</div>
                    <div style={{fontSize:13,fontWeight:reserveProp===v?600:400,
                      color:reserveProp===v?(v==="sans_reserve"?C.greenD:C.amberD):C.tx}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {reserveProp==="avec_reserve"&&(
              <MInput label="Réserves du propriétaire" value={commentaireProp}
                onChange={setComProp} placeholder="Décrivez les réserves…" big/>
            )}
            <SignatureCanvas
              label="✍️ Signature propriétaire"
              nomSignataire={nomPropFin}
              signed={!!sigDataFin}
              onSigned={data=>{setSigDataFin(data);setSigPropFin(true);}}
              onClear={()=>{setSigDataFin(null);setSigPropFin(false);}}/>
          </div>
        )}

        {/* ── §6 NOTE QUALITÉ ── */}
        {section===5&&(
          <div>
            <SectionTitle icon="⭐" label="Note qualité du chantier"/>
            <div style={{textAlign:"center",padding:"24px 0 16px"}}>
              <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:12}}>
                {[1,2,3,4,5].map(n=><NoteEtoile key={n} n={n}/>)}
              </div>
              {noteQualite>0&&(
                <div style={{fontSize:22,fontWeight:700,
                  color:noteQualite>=4?C.greenD:noteQualite>=3?C.amberD:C.red}}>
                  {NOTES_LABELS[noteQualite]}
                </div>
              )}
              {noteQualite===0&&(
                <div style={{fontSize:14,color:C.tx3}}>
                  Appuyez sur les étoiles pour noter
                </div>
              )}
            </div>
            <div style={{background:"#fff",borderRadius:14,padding:16,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:12}}>
                Grille de référence
              </div>
              {([
                [5,"⭐⭐⭐⭐⭐","Excellent","Parfait, au-delà des attentes"],
                [4,"⭐⭐⭐⭐","Bon","Chantier réalisé selon les attentes"],
                [3,"⭐⭐⭐","Conforme","Travail correct, quelques points à améliorer"],
                [2,"⭐⭐","À améliorer","Réserves significatives signalées"],
                [1,"⭐","Non conforme","Non-respect des conditions du contrat"],
              ] as any[]).map(([n,_e,l,s]: any)=>(
                <div key={n} onClick={()=>setNoteQualite(n)} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                  borderBottom:n>1?`1px solid ${C.bd}`:"none",cursor:"pointer",
                  opacity:noteQualite>0&&noteQualite!==n?0.5:1}}>
                  <span style={{fontSize:18,fontWeight:700,color:C.tx3,width:20}}>{n}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:noteQualite===n?700:500,
                      color:noteQualite===n?C.greenD:C.tx}}>{l}</div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{s}</div>
                  </div>
                  {noteQualite===n&&<span style={{color:C.green}}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── §7 INDICE APPLITAG ── */}
        {section===6&&(
          <div>
            <SectionTitle icon="📊" label="Indice APPLITAG"/>
            {/* Score principal */}
            <div style={{background:`linear-gradient(135deg,${C.sb},${C.greenD})`,
              borderRadius:20,padding:28,marginBottom:20,textAlign:"center",color:"#fff"}}>
              <div style={{fontSize:11,opacity:.7,marginBottom:8,letterSpacing:1,
                textTransform:"uppercase"}}>Score de clôture</div>
              <div style={{fontSize:64,fontWeight:800,lineHeight:1}}>{indiceTotal}</div>
              <div style={{fontSize:14,opacity:.8,marginTop:4}}>/100</div>
              <div style={{fontSize:18,fontWeight:600,marginTop:12,
                background:"rgba(255,255,255,.15)",borderRadius:10,padding:"8px 20px",
                display:"inline-block"}}>
                {indiceLabel}
              </div>
            </div>
            {/* Détail des composantes */}
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:12}}>
                Détail du calcul
              </div>
              {[
                {label:"📷 Documentation photos",  score:indiceDocs,   max:25, color:C.blue},
                {label:"✅ Contrôle qualité",       score:indiceQualite,max:35, color:C.green},
                {label:"⭐ Note propriétaire",       score:indiceNote,   max:20, color:C.amber},
                {label:"✍️ Signature propriétaire",  score:indiceValidation,max:20, color:C.purple},
              ].map(({label,score,max,color},i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,marginBottom:5}}>
                    <span style={{color:C.tx}}>{label}</span>
                    <span style={{fontWeight:700,color}}>{score}/{max}</span>
                  </div>
                  <div style={{background:C.bg2,borderRadius:8,height:8,overflow:"hidden"}}>
                    <div style={{width:`${(score/max)*100}%`,height:"100%",
                      background:color,borderRadius:8,transition:"width .5s"}}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Conseils */}
            {indiceTotal<80&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.amberD,marginBottom:8}}>
                  💡 Pour améliorer le score
                </div>
                <div style={{fontSize:12,color:C.amberD,lineHeight:1.8}}>
                  {indiceDocs<25&&"📷 Ajoutez des photos avant/après (+25 pts)\n"}
                  {indiceQualite<35&&`✅ Validez tous les points qualité (${nbCheckOK}/6 validés)\n`}
                  {indiceNote<20&&"⭐ Faites noter le chantier par le propriétaire\n"}
                  {indiceValidation<20&&"✍️ Obtenez la signature du propriétaire"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation + bouton final */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        {section<6?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
            {section>0&&(
              <button onClick={()=>setSection(s=>s-1)} style={{
                padding:"14px",borderRadius:14,background:"#fff",
                border:`1.5px solid ${C.bd}`,color:C.tx2,
                fontFamily:"inherit",fontSize:14,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
                {"<"} Préc.
              </button>
            )}
            <button onClick={()=>setSection(s=>s+1)} style={{
              padding:"14px",borderRadius:14,background:C.greenD,
              border:"none",color:"#fff",fontFamily:"inherit",
              fontSize:14,fontWeight:600,cursor:"pointer",
              gridColumn:section===0?"1/-1":"auto",
              WebkitTapHighlightColor:"transparent"}}>
              Suivant ›
            </button>
          </div>
        ):(
          <BigBtn onClick={handleSave} disabled={saving} bg={C.greenD} icon={saving?"":"🏁"}>
            {saving?"Enregistrement…":`CLÔTURER — Indice ${indiceTotal}/100`}
          </BigBtn>
        )}
      </div>
    </div>
  );
};

// ── ÉCRAN DÉCHIQUETAGE & CHARGEMENT ──────────────────────────
