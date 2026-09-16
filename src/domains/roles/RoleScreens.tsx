// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { todayS } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost, apiPostPublic, apiPatch, apiDelete } from "../../services/api.service.js";
import { BigBtn, MInput } from "../../shared/ui.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
export const EcranRoleMandataire = ({user, contacts, onSelectLot}: any) => {
  const mesLots = contacts.filter((c: any)=>c.mandataireId===user.id);
  const [selLot, setSelLot] = useState<any>(null);

  if (selLot) {
    const st = STATUT_LOT[selLot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
    return (
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
        <button onClick={()=>setSelLot(null)} style={{background:"none",border:"none",
          color:C.greenD,fontSize:13,cursor:"pointer",padding:"0 0 16px",fontFamily:"inherit",
          display:"flex",alignItems:"center",gap:6}}>
          ← Retour à mes lots
        </button>
        <div style={{background:"#fff",borderRadius:16,padding:20,border:`1px solid ${C.bd}`,
          borderLeft:`4px solid ${st.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.greenD}}>
              {selLot.lotNumero}
            </div>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
              background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
          </div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>
            👤 {selLot.nom} {selLot.prenom}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📞 {selLot.telephone}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📍 {selLot.commune}{selLot.adresseParcelle?` — ${selLot.adresseParcelle}`:""}
          </div>
          {selLot.refCadastrale&&(
            <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
              📋 Réf. cadastrale : {selLot.refCadastrale}
            </div>
          )}
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            🌲 Surface : {selLot.surfaceHa} ha
          </div>
          {selLot.dateVisite&&(
            <div style={{background:C.amberL,borderRadius:10,padding:"10px 14px",
              marginTop:12,border:`1px solid ${C.amber}`,fontSize:13,color:C.amberD,fontWeight:600}}>
              📅 Visite prévue le {new Date(selLot.dateVisite).toLocaleDateString("fr-FR")}
            </div>
          )}
          <div style={{marginTop:16}}>
            <button onClick={()=>onSelectLot&&onSelectLot(selLot)} style={{
              width:"100%",height:50,borderRadius:12,
              background:C.green,border:"none",color:"#fff",
              fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              ✏️ Saisir la visite terrain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 20px"}}>
        <div style={{fontSize:40}}>🔭</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Lots à visiter qui vous sont attribués</div>
      </div>
      {mesLots.length===0 ? (
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>📋</div>
          <div style={{marginTop:8}}>Aucun lot attribué pour le moment</div>
        </div>
      ) : mesLots.map((lot: any)=>{
        const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        return (
          <div key={lot.id} onClick={()=>setSelLot(lot)}
            style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,
              border:`1px solid ${C.bd}`,borderLeft:`4px solid ${st.color}`,
              cursor:"pointer",WebkitTapHighlightColor:"transparent",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                color:C.greenD,marginBottom:4}}>{lot.lotNumero}</div>
              <div style={{fontSize:14,fontWeight:600,color:C.tx,marginBottom:2}}>
                👤 {lot.nom} {lot.prenom}
              </div>
              <div style={{fontSize:12,color:C.tx2}}>
                📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
              </div>
              {lot.dateVisite&&(
                <div style={{fontSize:11,color:C.amberD,marginTop:4,fontWeight:600}}>
                  📅 Visite le {new Date(lot.dateVisite).toLocaleDateString("fr-FR")}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600,whiteSpace:"nowrap"}}>
                {st.label}
              </span>
              <span style={{fontSize:18,color:C.tx3}}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const EcranRoleProprietaire = ({user, contacts, visites, reportings=[], livraisons=[], dechiquetages=[]}: any) => {
  const mesSLots = contacts.filter((c: any)=>c.nom?.toLowerCase()===user.nom?.toLowerCase());

  const today = todayS();

  const dateDebutOperation = (lot: any, typeMatch: any) => {
    const dates = reportings
      .filter((r: any)=>(r.lotId===lot.id||r.lotNumero===lot.lotNumero)&&typeMatch(r.typeOperationJour||""))
      .map((r: any)=>r.dateJour).filter(Boolean).sort();
    return dates[0]||null;
  };

  const suiviJour = (lot: any) => {
    const rToday = reportings.filter((r: any)=>
      (r.lotId===lot.id||r.lotNumero===lot.lotNumero) && (r.dateJour||"").startsWith(today));
    const abattageM3 = rToday
      .filter((r: any)=>["abattage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s: any,r: any)=>s+(parseFloat(r.volumeJour)||0), 0);
    const debardageM3 = rToday
      .filter((r: any)=>["debardage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s: any,r: any)=>s+(parseFloat(r.volumeJour)||0), 0);
    const dToday = dechiquetages.filter((d: any)=>
      (d.lotId===lot.id||d.lotNumero===lot.lotNumero) &&
      ((d.dateJour||d.createdAt||"").startsWith(today)));
    const dechiqT  = dToday.reduce((s: any,d: any)=>s+(parseFloat(d.tonnageCharge)||0), 0);
    const dechiqM3 = dToday.reduce((s: any,d: any)=>s+(parseFloat(d.cubageCharge)||0), 0);
    return {abattageM3, debardageM3, dechiqT, dechiqM3, hasData: abattageM3>0||debardageM3>0||dechiqT>0||dechiqM3>0};
  };

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🏠</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Suivi de vos parcelles forestières</div>
      </div>
      {mesSLots.length===0?(
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>🌲</div>
          <div style={{marginTop:8}}>Aucune parcelle assignée</div>
        </div>
      ):mesSLots.map((lot: any)=>{
        const st=STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        const visite=visites.find((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);

        const livraisonsChaufferie = livraisons
          .filter((l: any)=>l.lotId===lot.id||l.lotNumero===lot.lotNumero)
          .sort((a: any,b: any)=>(a.date||"").localeCompare(b.date||""));
        const poidsNet = (l: any) => l.poidsNet ?? Math.max(0, (l.poidsBrut??0)-(l.tare??0));
        const poidsCumule = livraisonsChaufferie.reduce((s: any,l: any)=>s+poidsNet(l),0);
        const prixTonne = parseFloat(visite?.prixTonne)||0;
        const sommeDue = poidsCumule*prixTonne;

        // Niveau de traçabilité APPLITAG (1/2/3)
        const hasVisite = !!visite;
        const hasLivraisons = livraisonsChaufferie.length > 0;
        const hasPeseeVerifiee = livraisonsChaufferie.some((l: any)=>!!l.peseeVerifiee);
        const niveauTracabilite = hasPeseeVerifiee ? 3 : hasLivraisons ? 2 : hasVisite ? 1 : 0;
        const NIVEAUX_TRACABILITE = [
          null,
          {label:"Niveau 1 — Suivi chantier",       color:"#1E5B3A", bg:"#D1FAE5", desc:"Visite, opérations et clôture documentées par l'ETF"},
          {label:"Niveau 2 — Traçabilité aval",      color:"#1D4ED8", bg:"#DBEAFE", desc:"Chargements, CMR et destination déclarés par les opérateurs"},
          {label:"Niveau 3 — Pesées vérifiées",      color:"#7C3AED", bg:"#EDE9FE", desc:"Justificatifs de pesée reçus et rapprochés avec le lot"},
        ];
        const niv = NIVEAUX_TRACABILITE[niveauTracabilite];

        // Statut de preuve par opération
        const statutPreuve = (hasData: boolean, hasJustif: boolean, hasVerif: boolean) =>
          hasVerif ? "✓✓" : hasJustif ? "✓" : hasData ? "◐" : "○";

        const MODELE_LABEL: Record<string,string> = {
          forfaitaire:      "🤝 Vente forfaitaire",
          poids_bord_route: "🌲 Au poids bord de route",
          poids_livre:      "🔥 Au poids livré (destination)",
          prestation:       "🛠️ Prestation de travaux",
        };

        const dateAbattage = dateDebutOperation(lot, (t: any)=>t.startsWith("abattage"));
        const dateDebardage = dateDebutOperation(lot, (t: any)=>t.includes("debardage"));
        const dechiq = dechiquetages.find((d: any)=>d.lotId===lot.id||d.lotNumero===lot.lotNumero);
        const dateDechiquetage = dechiq?.dateJour||dechiq?.date||null;

        return (
          <div key={lot.id} style={{background:"#fff",borderRadius:16,padding:20,
            marginBottom:14,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${st.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD}}>
                {lot.lotNumero}
              </div>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
            </div>
            {/* Badge niveau de traçabilité APPLITAG */}
            {niv&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,
                padding:"7px 12px",borderRadius:10,
                background:niv.bg,border:`1px solid ${niv.color}22`}}>
                <span style={{fontSize:16}}>
                  {niveauTracabilite===3?"🔐":niveauTracabilite===2?"🔗":"📋"}
                </span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:niv.color}}>{niv.label}</div>
                  <div style={{fontSize:10,color:niv.color,opacity:.8,marginTop:1}}>{niv.desc}</div>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:niv.color}}>
                  {niveauTracabilite}/3
                </div>
              </div>
            )}
            <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>
              📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
            </div>

            {/* Informations recueillies lors de la visite terrain */}
            {visite&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,marginBottom:10,
                fontSize:12,color:C.tx,lineHeight:1.8}}>
                <div style={{fontWeight:700,color:C.greenD,marginBottom:4}}>🔭 Visite terrain — {visite.date}</div>
                {visite.essences?.length>0&&<>🌿 {visite.essences.map((e: any)=>`${e.label} (${e.pct}%)`).join(", ")}<br/></>}
                ⚖️ Volume estimé : {fmtNum(visite.volumeEstimeT||0)} t<br/>
                {visite.gps?.lat&&<>🛰️ GPS : {visite.gps.lat.toFixed(5)}°N · {visite.gps.lng.toFixed(5)}°E<br/></>}
                🚛 Accès : {visite.accesCamion==="praticable"?"Praticable":visite.accesCamion==="difficile"?"Difficile":visite.accesCamion||"—"}
              </div>
            )}

            {/* Contrat signé — non modifiable */}
            {(visite?.sigDataProprio||visite?.nomSignProprio)&&(
              <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>
                  📄 Contrat signé {prixTonne?`— ${fmtNum(prixTonne,2)} €/t HT`:""}
                </div>
                {visite.modeleContractuel&&(
                  <div style={{fontSize:11,fontWeight:600,color:C.amber,
                    background:"#FFFBEB",borderRadius:6,padding:"4px 8px",marginBottom:6,
                    border:`1px solid #F59E0B44`}}>
                    {MODELE_LABEL[visite.modeleContractuel]||visite.modeleContractuel}
                  </div>
                )}
                {visite.sigDataProprio&&(
                  <img src={visite.sigDataProprio} style={{width:120,height:40,objectFit:"contain",
                    background:"#fff",border:`1px solid ${C.bd}`,borderRadius:6}}/>
                )}
                <div style={{fontSize:11,color:C.tx3,marginTop:4}}>
                  Signataire : {visite.nomSignProprio||lot.nom+" "+(lot.prenom||"")}
                </div>
              </div>
            )}

            {/* Dates de début par opération */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>📅 Démarrage des opérations</div>
              {[
                ["🪓 Abattage",dateAbattage],
                ["🚜 Débardage",dateDebardage],
                ["🌀 Déchiquetage",dateDechiquetage],
              ].map(([l,d])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}>
                  <span style={{color:C.tx2}}>{l}</span>
                  <span style={{fontWeight:600,color:d?C.tx:C.tx3}}>
                    {d?new Date(d).toLocaleDateString("fr-FR"):"Non démarré"}
                  </span>
                </div>
              ))}
            </div>

            {/* Suivi des opérations du jour */}
            {(()=>{
              const s = suiviJour(lot);
              return (
                <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:2}}>
                    ⚙️ Suivi des opérations du jour
                  </div>
                  <div style={{fontSize:10,color:C.tx3,fontStyle:"italic",marginBottom:8}}>
                    * Toutes les valeurs sont des estimations
                  </div>
                  {[
                    {icon:"🪓",label:"Abattage",    val:s.abattageM3>0?`${s.abattageM3.toFixed(1)} m³ *`:null, sub:"Volume abattu estimé"},
                    {icon:"🚜",label:"Débardage",   val:s.debardageM3>0?`${s.debardageM3.toFixed(1)} m³ *`:null, sub:"Volume sorti estimé"},
                    {icon:"⚙️",label:"Déchiquetage",
                      val:(s.dechiqT>0||s.dechiqM3>0)
                        ? [s.dechiqT>0&&`${s.dechiqT.toFixed(1)} t`,s.dechiqM3>0&&`${s.dechiqM3.toFixed(1)} m³`].filter(Boolean).join(" · ")+" *"
                        : null,
                      sub:"Tonnage & cubage chargés estimés"},
                  ].map(({icon,label,val,sub})=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,padding:"5px 0",
                      borderBottom:`1px solid ${C.bd}`}}>
                      <div>
                        <span style={{color:C.tx2}}>{icon} {label}</span>
                        <div style={{fontSize:10,color:C.tx3}}>{sub}</div>
                      </div>
                      <span style={{fontWeight:600,color:val?C.greenD:C.tx3}}>{val||"—"}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Timeline statut */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              {[
                {label:"Visite terrain",done:!!visite,icon:"🔭"},
                {label:"Validation exploitation",done:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"✅"},
                {label:"Exploitation en cours",done:["EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🪓"},
                {label:"Bord de route",done:["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🌲"},
                {label:"Lot entièrement livré",done:["LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🔥"},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"5px 0",fontSize:12,
                  color:s.done?C.greenD:C.tx3,
                  borderBottom:i<4?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:16}}>{s.done?"✅":"⬜"}</span>
                  <span style={{fontWeight:s.done?600:400}}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Suivi des poids livrés en chaufferie */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:4}}>
                🔥 Poids livrés en chaufferie
              </div>
              <div style={{fontSize:10,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                Légende : ○ prévue · ◐ déclarée · ✓ justificatif reçu · ✓✓ vérifiée par rapprochement · ! preuve manquante
              </div>
              {livraisonsChaufferie.length===0?(
                <div style={{fontSize:12,color:C.tx3}}>Aucune livraison enregistrée à ce jour</div>
              ):livraisonsChaufferie.map((l: any,i: any)=>{
                const pn      = poidsNet(l);
                const verifiee = !!l.peseeVerifiee;
                const statut  = statutPreuve(pn>0, !!l.numTicket||verifiee, verifiee);
                const isManquante = pn===0 && !verifiee;
                const dateAff = l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—";
                return (
                  <div key={l.id||i} style={{padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,color:isManquante?"#DC2626":verifiee?"#7C3AED":pn>0?"#1E5B3A":C.tx3}}>
                          {isManquante?"!":statut}
                        </span>
                        <span style={{color:C.tx2}}>{dateAff}</span>
                        {l.nomDestination&&<span style={{color:C.tx3,fontSize:10}}> · {l.nomDestination}</span>}
                      </div>
                      <span style={{fontWeight:700,color:isManquante?"#DC2626":verifiee?"#7C3AED":C.tx}}>
                        {pn>0?fmtNum(pn)+" t":"—"}
                      </span>
                    </div>
                    {(l.poidsBrut>0||l.tare>0)&&(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20}}>
                        Brut : {fmtNum(l.poidsBrut??0)} t · Tare : {fmtNum(l.tare??0)} t
                      </div>
                    )}
                    {l.humiditeReception&&(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20}}>
                        Humidité mesurée : {l.humiditeReception} %
                      </div>
                    )}
                    {verifiee?(
                      <div style={{fontSize:10,color:"#7C3AED",paddingLeft:20,fontWeight:600}}>
                        Pesée enregistrée sur justificatif transmis par la destination
                      </div>
                    ):pn>0?(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20,fontStyle:"italic"}}>
                        Pesée déclarée par l'opérateur — justificatif non encore reçu
                      </div>
                    ):null}
                  </div>
                );
              })}
            </div>

            {/* Total cumulé et somme due */}
            {(poidsCumule>0||prixTonne>0)&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,
                fontSize:12,color:C.greenD}}>
                {/* Modèle contractuel — détermine la base de calcul */}
                {visite?.modeleContractuel&&(
                  <div style={{fontSize:10,color:C.greenD,opacity:.75,marginBottom:6,
                    fontStyle:"italic"}}>
                    Base de calcul : {MODELE_LABEL[visite.modeleContractuel]||visite.modeleContractuel}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Poids cumulé livré</span>
                  <strong>{fmtNum(poidsCumule)} t</strong>
                </div>
                {livraisonsChaufferie.some((l: any)=>l.peseeVerifiee)&&(
                  <div style={{fontSize:10,color:C.greenD,opacity:.7,marginBottom:4,paddingLeft:4}}>
                    dont ✓✓ {fmtNum(livraisonsChaufferie.filter((l: any)=>l.peseeVerifiee).reduce((s: any,l: any)=>s+poidsNet(l),0))} t vérifiées par justificatif
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Prix d'achat</span>
                  <strong>{prixTonne?fmtNum(prixTonne,2)+" €/t HT":"—"}</strong>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,
                  borderTop:`1px solid ${C.green}`,fontSize:14,fontWeight:700}}>
                  <span>Total dû à ce jour</span>
                  <span>{fmtNum(sommeDue,2)} €</span>
                </div>
                {visite?.modeleContractuel==="poids_livre"&&!livraisonsChaufferie.some((l: any)=>l.peseeVerifiee)&&(
                  <div style={{fontSize:10,color:"#92400E",background:"#FEF3C7",
                    borderRadius:6,padding:"6px 8px",marginTop:8,lineHeight:1.5}}>
                    ⚠️ Contrat au poids livré : les justificatifs de pesée de la destination ne sont pas encore reçus. Ce total est provisoire.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

