// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle } from "../../shared/ui.jsx";
import { generatePdfFromHtml, buildRedHTML } from "../../domains/documents/pdf-templates.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── ENTREPRISE SOLLICITÉE ─────────────────────────────────────────────────────
const FONCTIONS_ETF = [
  {value:"abattage",     label:"Opérateur abattage"},
  {value:"debardage",    label:"Porteur / débardeur"},
  {value:"dechiquetage", label:"Broyeur / déchiqueteur"},
  {value:"chargement",   label:"Chargeur / grutier"},
  {value:"chauffeur",    label:"Chauffeur camion"},
  {value:"stockage",     label:"Gestionnaire plateforme"},
  {value:"controle",     label:"Contrôle / pesée"},
];

export const EcranEntrepriseSollicitee = ({user, lots=[], toast}: any) => {
  const storageKey = `applitag_etf_operateurs_${user.id}`;
  const [operateurs, setOperateurs] = useState<any[]>(()=>{
    try{const s=localStorage.getItem(storageKey);return s?JSON.parse(s):[]}catch{return[]}
  });
  const [showForm,   setShowForm]   = useState(false);
  const [ajoutSaving,setAjoutSaving]= useState(false);
  const [pinModal,   setPinModal]   = useState<{nom:string;prenom:string;pin:string}|null>(null);
  const [nom,        setNom]        = useState("");
  const [prenom,     setPrenom]     = useState("");
  const [fonction,   setFonction]   = useState("abattage");
  const [lotId,      setLotId]      = useState("");

  useEffect(() => {
    apiGet('/operateurs-etf').then((r: any) => {
      if (Array.isArray(r) && r.length > 0) {
        setOperateurs(r);
        try { localStorage.setItem(storageKey, JSON.stringify(r)); } catch { /* noop */ }
      }
    }).catch(() => {});
  }, [storageKey]);

  const lotsEtf = lots.filter((l: any)=>
    l.etfNom===(user.nomEntreprise||user.nom) ||
    l.etfId===user.id
  );

  const save = (list: any[]) => {
    setOperateurs(list);
    try{localStorage.setItem(storageKey,JSON.stringify(list))} catch { /* noop */ }
  };

  const handleAjouter = async () => {
    if(!nom.trim()||!prenom.trim()||!lotId){
      toast("Renseignez nom, prénom et lot assigné","warn"); return;
    }
    setAjoutSaving(true);
    const lotNumero = lots.find((l: any)=>l.id===lotId)?.lotNumero||lotId;
    try {
      const result: any = await apiPost('/operateurs-etf', {
        nom: nom.trim(), prenom: prenom.trim(),
        etfNom: user.nomEntreprise||user.nom||"",
        lotId,
      });
      const saved = {
        ...result, fonction, lotId, lotNumero,
        dateCreation: new Date().toLocaleDateString("fr-FR"),
      };
      save([...operateurs, saved]);
      if (result.pinClair) setPinModal({ nom: result.nom, prenom: result.prenom, pin: result.pinClair });
      else toast("Opérateur ajouté ✓");
    } catch {
      // Hors ligne : enregistrement local sans PIN ; le PIN sera généré à la reconnexion
      const nouvel = {
        id: Date.now().toString(),
        nom: nom.trim(), prenom: prenom.trim(),
        fonction, lotId, lotNumero,
        dateCreation: new Date().toLocaleDateString("fr-FR"),
      };
      save([...operateurs, nouvel]);
      toast("Opérateur ajouté localement — PIN généré à la reconnexion","warn");
    }
    setNom(""); setPrenom(""); setFonction("abattage"); setLotId("");
    setShowForm(false);
    setAjoutSaving(false);
  };

  const handleSupprimer = (id: any) => {
    save(operateurs.filter((o: any)=>o.id!==id));
    apiDelete(`/operateurs-etf/${id}`).catch(() => {});
  };

  const fonctionLabel = (v: any) => FONCTIONS_ETF.find(f=>f.value===v)?.label||v;

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40,marginBottom:8}}>🏢</div>
        <div style={{fontSize:18,fontWeight:700}}>{user.nomEntreprise||user.prenom+" "+user.nom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.6,maxWidth:300,margin:"6px auto 0"}}>
          Espace réservé aux entreprises de travaux forestiers mandatées pour intervenir sur chantier.
          Déléguez vos missions à vos opérateurs.
        </div>
      </div>

      {/* Lots attribués */}
      {lotsEtf.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>
            Lots attribués à votre entreprise
          </div>
          {lotsEtf.map((lot: any)=>(
            <div key={lot.id} style={{background:"#fff",borderRadius:12,padding:"10px 14px",
              marginBottom:8,border:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.purpleD}}>{lot.lotNumero}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:2}}>📍 {lot.commune} · {lot.surfaceHa} ha</div>
              </div>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                background:"#EDE7F6",color:C.purpleD,fontWeight:600}}>
                {operateurs.filter((o: any)=>o.lotId===lot.id).length} opér.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Liste opérateurs */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.tx2,textTransform:"uppercase",letterSpacing:".5px"}}>
          Opérateurs créés ({operateurs.length})
        </div>
        <button onClick={()=>setShowForm(s=>!s)}
          style={{padding:"6px 14px",borderRadius:20,border:"none",
            background:C.purpleD,color:"#fff",fontSize:12,fontWeight:600,
            cursor:"pointer",fontFamily:"inherit"}}>
          {showForm?"✕ Annuler":"+ Ajouter"}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm&&(
        <div style={{background:"#F3F0FF",borderRadius:14,padding:16,marginBottom:16,
          border:"1.5px solid #B39DDB"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:12}}>
            Nouvel opérateur
          </div>
          <MInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="ex : Pierre"/>
          <MInput label="Nom" value={nom} onChange={setNom} placeholder="ex : Dupont"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Fonction</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {FONCTIONS_ETF.map(f=>(
                <button key={f.value} onClick={()=>setFonction(f.value)}
                  style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${fonction===f.value?C.purpleD:C.bd}`,
                    background:fonction===f.value?"#EDE7F6":"#fff",
                    color:fonction===f.value?C.purpleD:C.tx,
                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Lot assigné</div>
            <select value={lotId} onChange={e=>setLotId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,background:"#fff",
                fontFamily:"inherit",fontSize:13,color:C.tx}}>
              <option value="">— Choisir un lot —</option>
              {lotsEtf.length>0
                ? lotsEtf.map((l: any)=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
                : lots.map((l: any)=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
              }
            </select>
          </div>
          <button onClick={handleAjouter} disabled={ajoutSaving}
            style={{width:"100%",padding:13,borderRadius:12,border:"none",
              background:ajoutSaving?"#9575CD":C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
              cursor:ajoutSaving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {ajoutSaving?"⏳ Création…":"✅ Créer l'opérateur"}
          </button>
        </div>
      )}

      {/* Modal PIN — affiché une seule fois après création */}
      {pinModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:3000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#fff",borderRadius:20,padding:24,maxWidth:320,width:"100%",
            boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:8}}>🔑</div>
              <div style={{fontSize:16,fontWeight:800}}>PIN de {pinModal.prenom} {pinModal.nom}</div>
              <div style={{fontSize:12,color:C.tx3,marginTop:6,lineHeight:1.5}}>
                Communiquez ce code à l'opérateur.<br/>
                <strong style={{color:"#B71C1C"}}>Il ne sera affiché qu'une seule fois.</strong>
              </div>
            </div>
            <div style={{background:"#F3F0FF",borderRadius:14,padding:20,textAlign:"center",
              border:"2px solid #B39DDB",marginBottom:20}}>
              <div style={{fontFamily:"monospace",fontSize:44,fontWeight:900,
                color:C.purpleD,letterSpacing:10}}>{pinModal.pin}</div>
            </div>
            <button onClick={()=>setPinModal(null)}
              style={{width:"100%",padding:14,borderRadius:12,border:"none",
                background:C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              ✓ J'ai noté le PIN
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {operateurs.length===0?(
        <div style={{background:C.bg2,borderRadius:14,padding:20,textAlign:"center",color:C.tx3,fontSize:13}}>
          Aucun opérateur créé pour l'instant.<br/>Appuyez sur "+ Ajouter" pour commencer.
        </div>
      ):operateurs.map((op: any)=>(
        <div key={op.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",
          marginBottom:10,border:`1px solid ${C.bd}`,
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#EDE7F6",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,flexShrink:0}}>
            👷
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700}}>{op.prenom} {op.nom}</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
              {fonctionLabel(op.fonction)} · {op.lotNumero}
            </div>
          </div>
          <button onClick={()=>handleSupprimer(op.id)}
            style={{background:"none",border:"none",color:"#EF9A9A",
              fontSize:18,cursor:"pointer",padding:4}}>
            ✕
          </button>
        </div>
      ))}
      <div style={{height:32}}/>
    </div>
  );
};

export const EcranRoleChaufferie = ({user, livraisons=[], toast, onRefresh}: any) => {
  const [onglet, setOnglet]   = useState<"attente"|"verifiees">("attente");
  // État local des vérifications en cours : {[id]: {numTicket, sending, done, error}}
  const [pesees, setPesees]   = useState<Record<string,any>>({});

  const enAttente  = livraisons.filter((l: any) => !l.peseeVerifiee && l.statut !== "verifiee");
  const verifiees  = livraisons.filter((l: any) => l.peseeVerifiee || l.statut === "verifiee");
  const tonnageTotal    = livraisons.reduce((s: any, l: any) => s + (l.poidsNet ?? l.poidsBrut ?? 0), 0);
  const tonnageVerifie  = verifiees.reduce((s: any, l: any) => s + (l.poidsNet ?? l.poidsBrut ?? 0), 0);

  const humBadge = (h: number | null) => {
    if (h === null || h === undefined) return {bg:C.bg2, tx:C.tx3, label:"Humidité NC"};
    if (h <= 30) return {bg:C.greenL, tx:C.greenD, label:`💧 ${h}% — Conforme`};
    if (h <= 45) return {bg:C.amberL, tx:C.amberD, label:`💧 ${h}% — Élevée`};
    return {bg:"#FEE2E2", tx:"#991B1B", label:`💧 ${h}% — Hors normes`};
  };

  const handleConfirmer = async (l: any) => {
    const ticket = pesees[l.id]?.numTicket ?? "";
    setPesees(p => ({...p, [l.id]: {...p[l.id], sending:true, error:undefined}}));
    try {
      await apiPatch(`/livraisons/${l.id}/pesee`, {peseeVerifiee: true, numTicket: ticket || undefined});
      setPesees(p => ({...p, [l.id]: {...p[l.id], sending:false, done:true}}));
      toast?.("Pesée vérifiée ✓");
      onRefresh?.();
    } catch (e: any) {
      setPesees(p => ({...p, [l.id]: {...p[l.id], sending:false, error: e?.message ?? "Erreur réseau"}}));
    }
  };

  const renderCard = (l: any) => {
    const poids  = l.poidsNet ?? (l.poidsBrut && l.tare ? l.poidsBrut - l.tare : l.poidsBrut);
    const hum    = humBadge(l.humiditeReception);
    const done   = pesees[l.id]?.done || l.peseeVerifiee || l.statut === "verifiee";
    const p      = pesees[l.id] ?? {};
    return (
      <div key={l.id} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:10,
        border:`1.5px solid ${done ? C.green : C.bd}`}}>
        {/* En-tête lot + date */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>{l.lotNumero}</div>
          <div style={{fontSize:11,color:C.tx3}}>{l.date?.slice(0,10)}</div>
        </div>
        {/* Infos livraison */}
        <div style={{fontSize:12,color:C.tx2,lineHeight:1.9,marginBottom:8}}>
          {l.nomDestination && <div>📍 {l.nomDestination}</div>}
          {l.numeroBL       && <div>📄 BL / CMR : {l.numeroBL}</div>}
          <div>⚖️ Brut {fmtNum(l.poidsBrut ?? 0)} t · Tare {fmtNum(l.tare ?? 0)} t
            {poids ? <> · <strong>Net {fmtNum(poids)} t</strong></> : ""}</div>
          {l.numTicket      && <div>🎫 Ticket : {l.numTicket}</div>}
        </div>
        {/* Badge humidité */}
        <div style={{padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:600,
          background:hum.bg, color:hum.tx, marginBottom:done ? 0 : 10}}>
          {hum.label}
        </div>
        {/* Formulaire confirmation (seulement si pas encore vérifiée) */}
        {!done && (
          <>
            <div style={{marginTop:10, marginBottom:8}}>
              <MInput label="N° ticket chaufferie (optionnel)"
                value={p.numTicket ?? ""}
                onChange={(v: string) => setPesees(prev => ({...prev, [l.id]: {...prev[l.id], numTicket:v}}))}/>
            </div>
            {p.error && (
              <div style={{fontSize:11,color:"#DC2626",marginBottom:8,padding:"6px 10px",
                background:"#FEF2F2",borderRadius:6}}>⚠ {p.error}</div>
            )}
            <button onClick={() => handleConfirmer(l)}
              disabled={p.sending}
              style={{width:"100%",padding:12,borderRadius:10,
                background:p.sending ? C.tx3 : C.green, color:"#fff", border:"none",
                fontFamily:"inherit", fontSize:13, fontWeight:600,
                cursor:p.sending ? "not-allowed" : "pointer",
                WebkitTapHighlightColor:"transparent"}}>
              {p.sending ? "Envoi…" : "✅ Confirmer la pesée"}
            </button>
          </>
        )}
        {done && (
          <div style={{marginTop:8,fontSize:12,color:C.greenD,fontWeight:600,
            background:C.greenL,borderRadius:8,padding:"6px 10px",textAlign:"center"}}>
            ✓ Pesée vérifiée
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      {/* En-tête */}
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🔥</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:6}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:3}}>Réception chaufferie</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          [enAttente.length+" lot"+(enAttente.length!==1?"s":""), "En attente", C.amberL, C.amberD],
          [fmtNum(tonnageTotal,1)+" t",   "Total reçu",    C.bg2,   C.tx2],
          [fmtNum(tonnageVerifie,1)+" t", "Vérifié",       C.greenL, C.greenD],
        ].map(([v,l,bg,tx],i)=>(
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:tx}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {([["attente","En attente",enAttente.length],["verifiees","Vérifiées",verifiees.length]] as const).map(([id,label,n])=>(
          <button key={id} onClick={()=>setOnglet(id)} style={{
            flex:1, padding:"9px 0", borderRadius:10, fontSize:12, fontWeight:onglet===id?700:400,
            background:onglet===id?"#fff":C.bg2, color:onglet===id?C.tx:C.tx3,
            border:`1.5px solid ${onglet===id?C.bd:"transparent"}`,
            cursor:"pointer", fontFamily:"inherit"}}>
            {label}{n>0?<> <span style={{background:onglet===id?C.greenL:C.bg,color:onglet===id?C.greenD:C.tx3,
              borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{n}</span></>:""}
          </button>
        ))}
      </div>

      {/* Listes */}
      {onglet==="attente" && (
        enAttente.length===0
          ? <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{marginTop:8,fontSize:13}}>Toutes les pesées sont vérifiées</div>
            </div>
          : enAttente.map(renderCard)
      )}
      {onglet==="verifiees" && (
        verifiees.length===0
          ? <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>⏳</div>
              <div style={{marginTop:8,fontSize:13}}>Aucune pesée vérifiée pour l'instant</div>
            </div>
          : verifiees.map(renderCard)
      )}
    </div>
  );
};

// ── RÉCEPTIONNAIRE PLATEFORME DE STOCKAGE ─────────────────────
export const EcranRoleReceptionnaire = ({user, livraisons=[], contacts=[], visites=[], toast, refresh}: any) => {
  const [onglet, setOnglet] = useState("attente"); // "attente" | "stock" | "historique"
  const [humidite, setHumidite] = useState<Record<string,any>>({});
  const [numTickets, setNumTickets] = useState<Record<string,string>>({});
  const [confirmes, setConfirmes] = useState<Record<string,any>>({});
  const [saving, setSaving] = useState<Record<string,boolean>>({});
  const [lotStockSelec, setLotStockSelec] = useState<any>(null); // lot contact ouvert dans "En stock"
  const [rechercheHisto, setRechercheHisto] = useState("");

  const platLivs = livraisons; // toutes les livraisons de ce réceptionnaire (filtrées par l'API)
  const enAttente = platLivs.filter((l: any)=>!l.statut||l.statut==="declaree");
  const recues    = platLivs.filter((l: any)=>l.statut==="verifiee"||confirmes[l.id]);
  const enStock   = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot));
  const tonnageStock = platLivs.filter((l: any)=>l.statut==="verifiee"||confirmes[l.id]).reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);
  const tonnageRecus = recues.reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);

  const handleConfirmer = async (l: any) => {
    const h = humidite[l.id];
    if (!h) return;
    setSaving(p=>({...p,[l.id]:true}));
    try {
      await apiPatch(`/livraisons/${l.id}/pesee`, {
        peseeVerifiee: true,
        humiditeReception: parseFloat(h),
        ...(numTickets[l.id] ? { numTicket: numTickets[l.id] } : {}),
      });
      setConfirmes(p=>({...p,[l.id]:true}));
      toast("Réception enregistrée ✓");
      if (refresh) refresh();
    } catch (e: any) {
      toast("Erreur : " + (e.message || "impossible de confirmer"));
    } finally {
      setSaving(p=>({...p,[l.id]:false}));
    }
  };

  const enAttenteVisibles = enAttente.filter((l: any)=>!confirmes[l.id]);
  const tabs = [
    {id:"attente",   label:"En attente",  badge:enAttenteVisibles.length},
    {id:"stock",     label:"En stock",    badge:enStock.length},
    {id:"historique",label:"Historique",  badge:null},
  ];

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🏗️</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:6}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:3}}>Plateforme de stockage bois énergie</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          [enAttenteVisibles.length+" lot"+(enAttenteVisibles.length>1?"s":""),"En attente","#E3F2FD","#1565C0"],
          [fmtNum(tonnageStock,1)+" t","En stock","#E8F5E9",C.greenD],
          [fmtNum(tonnageRecus,1)+" t","Reçu total",C.amberL,C.amberD],
        ].map(([v,l,bg,tc],i)=>(
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:tc}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setOnglet(t.id)} style={{
            flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:onglet===t.id?700:400,
            border:`1.5px solid ${onglet===t.id?"#1565C0":C.bd}`,
            background:onglet===t.id?"#E3F2FD":"#fff",
            color:onglet===t.id?"#1565C0":C.tx2,
            cursor:"pointer",fontFamily:"inherit",position:"relative",
            WebkitTapHighlightColor:"transparent"}}>
            {t.label}
            {t.badge>0&&<span style={{position:"absolute",top:-5,right:-5,
              background:"#1565C0",color:"#fff",fontSize:9,fontWeight:700,
              borderRadius:"50%",width:16,height:16,display:"flex",
              alignItems:"center",justifyContent:"center"}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Livraisons en attente */}
      {onglet==="attente"&&(
        <div>
          {enAttente.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{marginTop:8}}>Aucune livraison en attente</div>
            </div>
          )}
          {enAttente.filter((l: any)=>!confirmes[l.id]).map((l: any,i: any)=>{
            const h = humidite[l.id]||"";
            const visite = visites.find((v: any)=>v.lotId===l.lotId);
            const isRed = visite?.certification==="red";
            return (
              <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                marginBottom:12,border:`2px solid ${isRed?"#E65100":"#1565C0"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                      color:isRed?"#E65100":"#1565C0"}}>
                      {l.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {isRed&&(
                      <div style={{background:"#FFF3E0",color:"#E65100",padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:700,
                        border:"1px solid #E65100"}}>⚡ RED</div>
                    )}
                    {!isRed&&visite&&(
                      <div style={{background:C.bg2,color:C.tx3,padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:600}}>Hors RED</div>
                    )}
                    <div style={{background:"#E3F2FD",color:"#1565C0",padding:"3px 8px",
                      borderRadius:6,fontSize:10,fontWeight:600}}>⏳ En attente</div>
                  </div>
                </div>
                {isRed&&(
                  <div style={{background:"#FFF3E0",border:"1px solid #E65100",borderRadius:8,
                    padding:"8px 10px",marginBottom:10,fontSize:11,color:"#BF360C",lineHeight:1.5}}>
                    ⚡ <strong>Lot soumis à la directive RED</strong> — traçabilité renforcée requise.
                    Conservez le CMR et les documents de durabilité.
                    {visite?.numeroCertification&&<> · Certif. {visite.certification?.toUpperCase()} n° {visite.numeroCertification}</>}
                  </div>
                )}
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.9,marginBottom:12}}>
                  {l.nomDestination&&<>🏭 {l.nomDestination}<br/></>}
                  🚛 BL : {l.numeroBL||"—"}<br/>
                  ⚖️ Pesée transport : <strong style={{color:C.tx}}>{(l.poidsNet||l.poidsBrut||0)} t</strong><br/>
                  📅 {new Date(l.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    🎫 N° ticket chaufferie (optionnel)
                  </div>
                  <input type="text" value={numTickets[l.id]||""}
                    onChange={e=>setNumTickets(p=>({...p,[l.id]:e.target.value}))}
                    placeholder="Ex : TK-2026-001"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                      border:`1.5px solid ${numTickets[l.id]?C.green:C.bd}`,fontFamily:"inherit",
                      background:"#fff",boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    💧 Taux d'humidité à réception (%) *
                  </div>
                  <input type="number" min={0} max={100} value={h}
                    onChange={e=>setHumidite(p=>({...p,[l.id]:e.target.value}))}
                    placeholder="Ex : 28"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${h?C.green:C.bd}`,fontFamily:"inherit",
                      background:"#fff",boxSizing:"border-box"}}/>
                  {h&&(
                    <div style={{fontSize:11,marginTop:4,fontWeight:600,
                      color:h<=30?C.greenD:h<=45?C.amberD:C.red}}>
                      {h<=30?"✅ Conforme":h<=45?"⚠️ Humidité élevée":"🔴 Hors normes (>45%)"}
                    </div>
                  )}
                </div>
                <button onClick={()=>handleConfirmer(l)}
                  disabled={!h||saving[l.id]}
                  style={{width:"100%",padding:13,borderRadius:10,
                    background:h&&!saving[l.id]?"#1565C0":C.bg2,
                    color:h&&!saving[l.id]?"#fff":C.tx3,
                    border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,
                    cursor:h&&!saving[l.id]?"pointer":"not-allowed",
                    WebkitTapHighlightColor:"transparent"}}>
                  {saving[l.id]?"⏳ Enregistrement…":"✅ Confirmer la réception"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Lots en stock */}
      {onglet==="stock"&&!lotStockSelec&&(
        <div>
          {enStock.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>📦</div>
              <div style={{marginTop:8}}>Aucun lot en stock actuellement</div>
            </div>
          )}
          {enStock.map((c: any)=>{
            const entrees = platLivs.filter((l: any)=>l.lotId===c.id&&(l.statut==="verifiee"||confirmes[l.id]));
            const tonnageLot = entrees.reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);
            return (
              <div key={c.id} onClick={()=>setLotStockSelec(c)}
                style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,
                  border:`1.5px solid ${C.bd}`,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>
                      {c.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <span style={{fontSize:18,color:C.tx3}}>›</span>
                </div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                  👤 {c.prenom} {c.nom} · 📍 {c.commune}<br/>
                  📦 {entrees.length} entrée{entrees.length>1?"s":""} · ⚖️ {fmtNum(tonnageLot||c.tonnageCumul||0,1)} t stockées
                </div>
              </div>
            );
          })}
          <div style={{background:C.greenL,borderRadius:12,padding:"12px 14px",
            border:`1px solid ${C.green}`,textAlign:"center",marginTop:4}}>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD}}>{fmtNum(tonnageStock,1)} t</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Tonnage total en stock plateforme</div>
          </div>
        </div>
      )}

      {/* Détail entrées d'un lot en stock */}
      {onglet==="stock"&&lotStockSelec&&(
        <div>
          <button onClick={()=>setLotStockSelec(null)}
            style={{background:"none",border:"none",color:"#1565C0",cursor:"pointer",
              fontSize:13,fontWeight:600,padding:"0 0 12px",fontFamily:"inherit"}}>
            ← Retour au stock
          </button>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD,marginBottom:4}}>
              {lotStockSelec.lotNumero}
            </div>
            <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
              🌿 Plaquettes forestières<br/>
              👤 {lotStockSelec.prenom} {lotStockSelec.nom} · 📍 {lotStockSelec.commune}<br/>
              🌲 {lotStockSelec.surfaceHa} ha
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
            Historique des entrées
          </div>
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="verifiee"||confirmes[l.id])).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"24px 0",fontSize:13}}>
              Aucune entrée enregistrée pour ce lot
            </div>
          )}
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="verifiee"||confirmes[l.id])).map((l: any,i: any)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx}}>Entrée {i+1}</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2}}>
                    {new Date(l.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {(l.poidsNet||l.poidsBrut||0)} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}%<br/>
                📄 BL : {l.numeroBL||"—"}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD
                  :(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme"
                  :(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historique */}
      {onglet==="historique"&&(
        <div>
          <div style={{position:"relative",marginBottom:12}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
              fontSize:15,pointerEvents:"none"}}>🔍</span>
            <input
              type="text"
              value={rechercheHisto}
              onChange={e=>setRechercheHisto(e.target.value)}
              placeholder="Rechercher par n° de lot…"
              style={{width:"100%",padding:"10px 12px 10px 36px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${rechercheHisto?C.green:C.bd}`,fontFamily:"inherit",
                background:"#fff",boxSizing:"border-box",color:C.tx}}/>
            {rechercheHisto&&(
              <button onClick={()=>setRechercheHisto("")}
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",cursor:"pointer",fontSize:15,color:C.tx3,
                  padding:0,lineHeight:1}}>✕</button>
            )}
          </div>
          {recues.filter((l: any)=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>{rechercheHisto?"🔍":"📋"}</div>
              <div style={{marginTop:8}}>{rechercheHisto?"Aucun lot trouvé":"Aucune réception enregistrée"}</div>
            </div>
          )}
          {recues.filter((l: any)=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).map((l: any,i: any)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.greenD}}>
                  {l.lotNumero}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2,marginTop:1}}>
                    {new Date(l.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {(l.poidsNet||l.poidsBrut||0)} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}% · 📄 {l.numeroBL||"—"}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD:(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme":(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

