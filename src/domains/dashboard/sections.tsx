// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { VSS_RECONNUS, STATUT_REGL, TEXTES_REGL } from "./sections.constants.js";
import { DEMO_LIVRAISONS } from "../../demo/demoData.js";
import { todayS, nowISO, uid } from "../../shared/utils.js";
import { MInput } from "../../shared/ui.jsx";
import { apiGet, apiPost, apiPatch } from "../../services/api.service.js";
const ROLES_DEF = [
  {id:"super_editeur",  label:"Éditeur souverain — APPLITAG", icon:"🏢", color:"#111827"},
  {id:"admin",          label:"Administrateur",        icon:"⚙️",  color:"#1E5B3A"},
  {id:"manager_region", label:"Responsable régional",  icon:"🗺️",  color:"#1D4ED8"},
  {id:"manager_dept",   label:"Responsable départemental",icon:"🏛️",color:"#0369A1"},
  {id:"mandataire",     label:"Mandataire",            icon:"📋",  color:"#7C3AED"},
  {id:"entreprise",     label:"ETF / Sous-traitant",   icon:"🪓",  color:"#92400E"},
  {id:"operateur",      label:"Opérateur terrain",     icon:"👷",  color:"#065F46"},
  {id:"dechiquetage",   label:"Déchiquetage",          icon:"🌀",  color:"#D97706"},
  {id:"plateforme",     label:"Responsable plateforme", icon:"🏭", color:"#9D174D"},
  {id:"receptionnaire", label:"Réceptionnaire",        icon:"📥",  color:"#6B21A8"},
  {id:"entreprise_transport",label:"Entreprise transport",icon:"🚚",color:"#4338CA"},
  {id:"chauffeur",      label:"Chauffeur",             icon:"🚛",  color:"#6D28D9"},
  {id:"chaufferie",     label:"Responsable chaufferie", icon:"🔥", color:"#B45309"},
  {id:"collectivite",   label:"Collectivité / EPCI",   icon:"🏛️", color:"#065F46"},
  {id:"bet",            label:"Bureau d'études",        icon:"📐", color:"#1E40AF"},
  {id:"etf",            label:"ETF (Travaux forestiers)",icon:"🪓",color:"#78350F"},
  {id:"association",    label:"Association / Interpro", icon:"🤝", color:"#0369A1"},
  {id:"institutionnel", label:"Institutionnel (DDT…)",  icon:"🏛️", color:"#1E3A5F"},
  {id:"financeur",      label:"Financeur / Partenaire", icon:"💶", color:"#134E4A"},
];

const PERMISSIONS_DEF = [
  {id:"contacts",    label:"Contacts / Propriétaires", icon:"👤"},
  {id:"lots",        label:"Fiches lots",              icon:"🌲"},
  {id:"visites",     label:"Visites terrain",          icon:"🔭"},
  {id:"exploitation",label:"Exploitation",             icon:"🪓"},
  {id:"dechiquetage",label:"Déchiquetage",             icon:"🌀"},
  {id:"transport",   label:"Transport / CMR",          icon:"🚛"},
  {id:"livraisons",  label:"Livraisons",               icon:"📦"},
  {id:"chaufferies", label:"Chaufferies",              icon:"🔥"},
  {id:"documents",   label:"Documents PDF",            icon:"📄"},
  {id:"utilisateurs",label:"Gestion utilisateurs",     icon:"👥"},
  {id:"rapports",    label:"Rapports / Analyses",      icon:"📈"},
  {id:"facturation", label:"Facturation / Coûts",      icon:"💶"},
];

const ZONES_GEO = ["National","Région","Département","Ville"];

const PERMS_PAR_ROLE = {
  admin:          ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs","rapports","facturation"],
  manager_region: ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs","rapports"],
  manager_dept:   ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs"],
  mandataire:     ["contacts","lots","visites","documents"],
  entreprise:     ["lots","exploitation","documents"],
  operateur:      ["lots","exploitation"],
  dechiquetage:   ["lots","dechiquetage"],
  plateforme:     ["livraisons","chaufferies","documents"],
  receptionnaire: ["livraisons"],
  entreprise_transport:["transport","livraisons","documents","utilisateurs"],
  chauffeur:      ["transport","livraisons"],
  chaufferie:     ["livraisons","chaufferies","rapports"],
  collectivite:   ["livraisons","chaufferies","rapports","facturation"],
  bet:            ["contacts","lots","visites","documents","rapports"],
  etf:            ["lots","exploitation","dechiquetage","documents"],
  association:    ["contacts","rapports","documents"],
  institutionnel: ["contacts","lots","documents","rapports"],
  financeur:      ["rapports","facturation","documents","chaufferies"],
};

const DEMO_HIERARCHY = [
  // ── Niveau 0 : APPLITAG — distributeur souverain des droits ──
  {id:"u-applitag", parentId:null, nom:"APPLITAG", prenom:"", role:"super_editeur",
   email:"admin@applitag.fr", telephone:"", region:"National",
   departement:"", ville:"Paris", codePostal:"75000", pin:"", actif:true, codeGenere:null,
   nomEntreprise:"APPLITAG by ALTEGAD SAS",
   badge:"Éditeur souverain — distribue les licences et droits à ses clients",
   perms:PERMS_PAR_ROLE.admin},

  // ── Niveau 1 : Jean-Christophe Letierce — Titulaire de la licence ALTEGAD ──
  {id:"u-admin", parentId:"u-applitag", nom:"Letierce", prenom:"Jean-Christophe", role:"admin",
   email:"jcletierce01@gmail.com", telephone:"0600000001", region:"National",
   departement:"", ville:"", codePostal:"", pin:"1406", actif:true, codeGenere:"ALTEGAD-2026",
   nomEntreprise:"ALTEGAD SAS — Happy Tag",
   badge:"Titulaire de la licence — distribue les droits à ses clients et collaborateurs",
   perms:PERMS_PAR_ROLE.admin},

  // Responsables régionaux
  {id:"u-rr-bfc", parentId:"u-admin", nom:"Durand", prenom:"Jean-Marc", role:"manager_region",
   email:"jm.durand@applitag.fr", telephone:"0611111101", region:"Bourgogne-Franche-Comté",
   departement:"", ville:"", codePostal:"21000", pin:"", actif:true, codeGenere:"BFC-2026",
   perms:PERMS_PAR_ROLE.manager_region},
  {id:"u-rr-cvl", parentId:"u-admin", nom:"Martin", prenom:"Sophie", role:"manager_region",
   email:"s.martin@applitag.fr", telephone:"0611111102", region:"Centre-Val de Loire",
   departement:"", ville:"", codePostal:"45000", pin:"", actif:true, codeGenere:"CVL-2026",
   perms:PERMS_PAR_ROLE.manager_region},
  {id:"u-rr-ara", parentId:"u-admin", nom:"Blanc", prenom:"Thierry", role:"manager_region",
   email:"t.blanc@applitag.fr", telephone:"0611111103", region:"Auvergne-Rhône-Alpes",
   departement:"", ville:"", codePostal:"69000", pin:"", actif:true, codeGenere:"ARA-2026",
   perms:PERMS_PAR_ROLE.manager_region},

  // Responsables départementaux (sous BFC)
  {id:"u-rd-89", parentId:"u-rr-bfc", nom:"Perrin", prenom:"Pierre", role:"manager_dept",
   email:"p.perrin@applitag.fr", telephone:"0622222201", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"", actif:true, codeGenere:"Y89-2026",
   perms:PERMS_PAR_ROLE.manager_dept},
  {id:"u-rd-21", parentId:"u-rr-bfc", nom:"Leblanc", prenom:"Marie", role:"manager_dept",
   email:"m.leblanc@applitag.fr", telephone:"0622222202", region:"Bourgogne-Franche-Comté",
   departement:"Côte-d'Or (21)", ville:"Dijon", codePostal:"21000", pin:"", actif:true, codeGenere:"CD21-2026",
   perms:PERMS_PAR_ROLE.manager_dept},

  // Mandataires (sous rd-89)
  {id:"u-mand-1", parentId:"u-rd-89", nom:"Laurent", prenom:"Claire", role:"mandataire",
   email:"c.laurent@applitag.fr", telephone:"0633333301", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Joigny", codePostal:"89300", pin:"6666", actif:true, codeGenere:"MAND-001",
   perms:PERMS_PAR_ROLE.mandataire},
  {id:"u-mand-2", parentId:"u-rd-89", nom:"Faure", prenom:"Antoine", role:"mandataire",
   email:"a.faure@applitag.fr", telephone:"0633333302", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Sens", codePostal:"89100", pin:"", actif:true, codeGenere:"MAND-002",
   perms:PERMS_PAR_ROLE.mandataire},

  // ETF sous-traitantes (sous rd-89)
  {id:"u-etf-1", parentId:"u-rd-89", nom:"Gaillard", prenom:"Henri", role:"entreprise",
   email:"etf@gaillard.fr", telephone:"0644444401", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"9999",
   nomEntreprise:"ETF Gaillard SARL", actif:true, codeGenere:"ETF-001",
   perms:PERMS_PAR_ROLE.entreprise},
  {id:"u-etf-2", parentId:"u-rd-89", nom:"Mercier", prenom:"Bruno", role:"entreprise",
   email:"bm.foret@gmail.com", telephone:"0644444402", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Sens", codePostal:"89100",
   nomEntreprise:"Mercier Forêt EURL", actif:true, codeGenere:"ETF-002",
   perms:PERMS_PAR_ROLE.entreprise},

  // Opérateurs terrain (sous ETF Gaillard)
  {id:"u-op-1", parentId:"u-etf-1", nom:"Dupont", prenom:"Martin", role:"operateur",
   email:"", telephone:"0655555501", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"1111", actif:true, codeGenere:"OP-001",
   perms:PERMS_PAR_ROLE.operateur},
  {id:"u-op-2", parentId:"u-etf-1", nom:"Renard", prenom:"Luc", role:"operateur",
   email:"", telephone:"0655555502", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"", actif:true, codeGenere:"OP-002",
   perms:PERMS_PAR_ROLE.operateur},

  // Déchiquetage (sous rd-89)
  {id:"u-dechi-1", parentId:"u-rd-89", nom:"Forestier", prenom:"François", role:"dechiquetage",
   email:"foret89@gmail.com", telephone:"0666666601", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Joigny", codePostal:"89300", pin:"4444",
   nomEntreprise:"ForestChip 89", actif:true, codeGenere:"DECHI-001",
   perms:PERMS_PAR_ROLE.dechiquetage},

  // Plateformes (sous rd-89)
  {id:"u-plat-1", parentId:"u-rd-89", nom:"Dubois", prenom:"Nathalie", role:"plateforme",
   email:"n.dubois@plateforme-auxerre.fr", telephone:"0677777701",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000",
   nomEntreprise:"Plateforme Auxerre Bois Énergie", actif:true, codeGenere:"PLAT-001",
   perms:PERMS_PAR_ROLE.plateforme},
  {id:"u-recep-1", parentId:"u-plat-1", nom:"Plateau", prenom:"Nathalie", role:"receptionnaire",
   email:"", telephone:"0677777702", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"7777", actif:true, codeGenere:"REC-001",
   perms:PERMS_PAR_ROLE.receptionnaire},

  // Transport (sous rd-89)
  {id:"u-transp-1", parentId:"u-rd-89", nom:"Auxerre Logistique", prenom:"", role:"entreprise_transport",
   email:"contact@auxerre-logistique.fr", telephone:"0688888801",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000",
   nomEntreprise:"Auxerre Logistique SAS", actif:true, codeGenere:"TRANSP-001",
   perms:PERMS_PAR_ROLE.entreprise_transport},
  {id:"u-chauf-1", parentId:"u-transp-1", nom:"Robert", prenom:"Pierre", role:"chauffeur",
   email:"", telephone:"0699999901", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"3333", actif:true, codeGenere:"CHAUF-001",
   perms:PERMS_PAR_ROLE.chauffeur},

  // Chaufferies (sous rd-89)
  {id:"u-chauf-aub", parentId:"u-rd-89", nom:"Migennes Énergie", prenom:"", role:"chaufferie",
   email:"contact@migennes-energie.fr", telephone:"0386561234",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Migennes", codePostal:"89400",
   nomEntreprise:"Chaufferie Migennes Énergie", actif:true, codeGenere:"CHAUF-ENE-001",
   perms:PERMS_PAR_ROLE.chaufferie},
  {id:"u-resp-chauf-1", parentId:"u-chauf-aub", nom:"Énergie", prenom:"Sophie", role:"chaufferie",
   email:"s.energie@migennes.fr", telephone:"0386561235",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Migennes", codePostal:"89400",
   pin:"5555", actif:true, codeGenere:"RESP-CHAUF-001",
   perms:PERMS_PAR_ROLE.chaufferie},

  // ── Acteurs filière ARA — nouveaux rôles ──
  {id:"u-coll-1", parentId:"u-rr-ara", nom:"Moulins Communauté", prenom:"", role:"collectivite",
   email:"energie@moulins-communaute.fr", telephone:"0470441234",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"CC Moulins Communauté (Allier Nord)", actif:true, codeGenere:"COLL-001",
   perms:PERMS_PAR_ROLE.collectivite},

  {id:"u-bet-1", parentId:"u-rr-ara", nom:"FORÊT CONSEIL", prenom:"Auvergne", role:"bet",
   email:"contact@foret-conseil-auvergne.fr", telephone:"0470556789",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"FORÊT CONSEIL Auvergne", actif:true, codeGenere:"BET-001",
   perms:PERMS_PAR_ROLE.bet},

  {id:"u-etf-ara-1", parentId:"u-rr-ara", nom:"BOIS SERVICE", prenom:"ETF", role:"etf",
   email:"contact@etf-bois-service.fr", telephone:"0470334455",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Vichy", codePostal:"03200",
   nomEntreprise:"ETF BOIS SERVICE Allier", actif:true, codeGenere:"ETF-ARA-001",
   perms:PERMS_PAR_ROLE.etf},

  {id:"u-asso-1", parentId:"u-rr-ara", nom:"FIBOIS Auvergne", prenom:"Délégation Allier", role:"association",
   email:"allier@fibois-aura.fr", telephone:"0470221133",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"FIBOIS Auvergne-Rhône-Alpes", actif:true, codeGenere:"ASSO-001",
   perms:PERMS_PAR_ROLE.association},

  {id:"u-instit-1", parentId:"u-rr-ara", nom:"DDT Allier", prenom:"Service Forêt", role:"institutionnel",
   email:"ddt-foret@allier.gouv.fr", telephone:"0470481234",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"DDT de l'Allier — Direction Départementale des Territoires", actif:true, codeGenere:"INSTIT-001",
   perms:PERMS_PAR_ROLE.institutionnel},

  {id:"u-fin-1", parentId:"u-rr-ara", nom:"ADEME AURA", prenom:"Fonds Bois-Énergie", role:"financeur",
   email:"biomasse@ademe.fr", telephone:"0472831234",
   region:"Auvergne-Rhône-Alpes", departement:"", ville:"Lyon", codePostal:"69000",
   nomEntreprise:"ADEME Auvergne-Rhône-Alpes", actif:true, codeGenere:"FIN-001",
   perms:PERMS_PAR_ROLE.financeur},
];

export const SectionAcces = ({_isDemo=false}) => {
  const [utilisateurs, setUtilisateurs] = useState(DEMO_HIERARCHY);
  const [vue, setVue] = useState("organigramme"); // organigramme | tableau | ajouter
  const [selectedUser, setSelectedUser] = useState(null);
  const [editPerms, setEditPerms] = useState(null);
  const [newUser, setNewUser] = useState({
    nom:"",prenom:"",role:"operateur",email:"",telephone:"",
    parentId:"u-admin",region:"",departement:"",ville:"",codePostal:"",
    zoneGeo:"Département",perms:[],nomEntreprise:"",
  });
  const [smsSimule, setSmsSimule] = useState(null);

  const rolesDef = Object.fromEntries(ROLES_DEF.map(r=>[r.id,r]));

  const getChildren = (parentId) => utilisateurs.filter(u=>u.parentId===parentId);

  const handleAjouter = () => {
    if (!newUser.nom||!newUser.telephone) return;
    const code = `${newUser.role.toUpperCase().slice(0,4)}-${Date.now().toString().slice(-4)}`;
    const u = {...newUser, id:`u-new-${Date.now()}`, actif:true, codeGenere:code,
      perms:newUser.perms.length>0?newUser.perms:PERMS_PAR_ROLE[newUser.role]||[]};
    setUtilisateurs(prev=>[...prev,u]);
    setSmsSimule({nom:u.prenom+" "+u.nom, telephone:u.telephone, code, role:rolesDef[u.role]?.label});
    setVue("organigramme");
    setNewUser({nom:"",prenom:"",role:"operateur",email:"",telephone:"",parentId:"u-admin",
      region:"",departement:"",ville:"",codePostal:"",zoneGeo:"Département",perms:[],nomEntreprise:""});
  };

  const renderOrgNode = (userId, depth=0) => {
    const u = utilisateurs.find(x=>x.id===userId);
    if (!u) return null;
    const children = getChildren(u.id);
    const rd = rolesDef[u.role]||{icon:"👤",color:C.tx3,label:u.role};
    const isSelected = selectedUser?.id===u.id;
    return (
      <div key={u.id} style={{marginLeft:depth===0?0:20}}>
        <div onClick={()=>setSelectedUser(isSelected?null:u)}
          style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
            borderRadius:8,cursor:"pointer",marginBottom:4,
            border:`1.5px solid ${isSelected?rd.color:C.bd}`,
            background:isSelected?`${rd.color}18`:"#fff",
            boxShadow:isSelected?`0 0 0 2px ${rd.color}44`:"none",
            transition:"all .12s"}}>
          {depth>0&&<div style={{width:16,height:1,background:C.bd,flexShrink:0}}/>}
          <span style={{fontSize:16,flexShrink:0}}>{rd.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {u.prenom?`${u.prenom} ${u.nom}`:u.nom||u.nomEntreprise}
            </div>
            <div style={{fontSize:10,color:rd.color,fontWeight:600}}>{rd.label}</div>
            {(u.departement||u.region)&&(
              <div style={{fontSize:9,color:C.tx3}}>{u.departement||u.region}</div>
            )}
          </div>
          {u.codeGenere&&(
            <span style={{fontSize:9,fontFamily:"monospace",background:C.bg2,
              color:C.tx3,borderRadius:4,padding:"2px 5px",flexShrink:0}}>{u.codeGenere}</span>
          )}
          {!u.actif&&<span style={{fontSize:9,color:C.red,flexShrink:0}}>⛔</span>}
        </div>
        {children.length>0&&(
          <div style={{borderLeft:`2px solid ${C.bd}`,paddingLeft:4,marginLeft:14,marginBottom:4}}>
            {children.map(c=>renderOrgNode(c.id,depth+1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:16,height:"calc(100dvh - 120px)"}}>
      {/* Panneau gauche */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
        overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* Onglets de vue */}
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.bd}`,padding:"0 16px"}}>
          {[["organigramme","🏗️ Organigramme"],["tableau","📋 Tableau"],["ajouter","➕ Ajouter"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVue(v)} style={{
              background:"none",border:"none",borderBottom:`2.5px solid ${vue===v?C.green:"transparent"}`,
              padding:"12px 14px",cursor:"pointer",fontSize:13,fontWeight:vue===v?700:400,
              color:vue===v?C.greenD:C.tx3,fontFamily:"inherit",
              transition:"all .12s"}}>
              {l}
            </button>
          ))}
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
            <span style={{fontSize:11,color:C.tx3}}>{utilisateurs.length} utilisateurs</span>
          </div>
        </div>

        {/* ── VUE ORGANIGRAMME ── */}
        {vue==="organigramme"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:16}}>
            {renderOrgNode("u-applitag")}
          </div>
        )}

        {/* ── VUE TABLEAU ── */}
        {vue==="tableau"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.greenD,color:"#fff",fontSize:11}}>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Utilisateur</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Rôle</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Zone</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Contact</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Code</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Accès</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u,i)=>{
                  const rd = rolesDef[u.role]||{icon:"👤",color:C.tx3,label:u.role};
                  return (
                    <tr key={u.id} onClick={()=>setSelectedUser(selectedUser?.id===u.id?null:u)}
                      style={{background:selectedUser?.id===u.id?`${rd.color}12`:i%2===0?"#fff":"#FAFAFA",
                        cursor:"pointer",borderBottom:`1px solid ${C.bd}`}}>
                      <td style={{padding:"8px 12px"}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.tx}}>
                          {u.prenom?`${u.prenom} ${u.nom}`:u.nom||u.nomEntreprise}
                        </div>
                        {u.nomEntreprise&&u.prenom&&<div style={{fontSize:10,color:C.tx3}}>{u.nomEntreprise}</div>}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontSize:10,color:rd.color,fontWeight:700,
                          background:`${rd.color}18`,borderRadius:4,padding:"2px 7px"}}>
                          {rd.icon} {rd.label}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontSize:11,color:C.tx3}}>
                        {u.departement||u.region||"National"}
                      </td>
                      <td style={{padding:"8px 12px",fontSize:11,color:C.tx3}}>
                        {u.telephone||"—"}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontFamily:"monospace",fontSize:10,color:C.greenD,
                          background:C.greenL,borderRadius:4,padding:"2px 6px"}}>
                          {u.codeGenere||"—"}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontSize:10,color:C.tx3}}>
                        {(u.perms||[]).length} droits
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VUE AJOUTER ── */}
        {vue==="ajouter"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <MInput label="Prénom" value={newUser.prenom} onChange={v=>setNewUser(p=>({...p,prenom:v}))} required/>
              <MInput label="Nom / Raison sociale" value={newUser.nom} onChange={v=>setNewUser(p=>({...p,nom:v}))} required/>
              <MInput label="Téléphone" value={newUser.telephone} onChange={v=>setNewUser(p=>({...p,telephone:v}))} type="tel" required/>
              <MInput label="Email" value={newUser.email} onChange={v=>setNewUser(p=>({...p,email:v}))} type="email"/>
              <MInput label="Code postal" value={newUser.codePostal} onChange={v=>setNewUser(p=>({...p,codePostal:v}))}/>
              <MInput label="Ville" value={newUser.ville} onChange={v=>setNewUser(p=>({...p,ville:v}))}/>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Rôle</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {ROLES_DEF.filter(r=>r.id!=="admin").map(r=>(
                  <div key={r.id} onClick={()=>setNewUser(p=>({...p,role:r.id,perms:PERMS_PAR_ROLE[r.id]||[]}))}
                    style={{padding:"7px 10px",borderRadius:8,cursor:"pointer",
                      border:`1.5px solid ${newUser.role===r.id?r.color:C.bd}`,
                      background:newUser.role===r.id?`${r.color}18`:"#fff",fontSize:11,
                      display:"flex",alignItems:"center",gap:6}}>
                    <span>{r.icon}</span>
                    <span style={{fontWeight:newUser.role===r.id?700:400,color:newUser.role===r.id?r.color:C.tx}}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Rattachement</div>
              <select value={newUser.parentId} onChange={e=>setNewUser(p=>({...p,parentId:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.bd}`,
                  fontSize:12,fontFamily:"inherit",background:"#fff",color:C.tx}}>
                {utilisateurs.map(u=>(
                  <option key={u.id} value={u.id}>
                    {(u.prenom?u.prenom+" ":"")+u.nom||u.nomEntreprise} — {(rolesDef[u.role]||{}).label||u.role}
                  </option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Zone géographique</div>
              <div style={{display:"flex",gap:6}}>
                {ZONES_GEO.map(z=>(
                  <div key={z} onClick={()=>setNewUser(p=>({...p,zoneGeo:z}))}
                    style={{flex:1,padding:"7px 4px",textAlign:"center",borderRadius:8,cursor:"pointer",
                      border:`1.5px solid ${newUser.zoneGeo===z?C.green:C.bd}`,fontSize:11,
                      background:newUser.zoneGeo===z?C.greenL:"#fff",
                      color:newUser.zoneGeo===z?C.greenD:C.tx,fontWeight:newUser.zoneGeo===z?700:400}}>
                    {z}
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Droits d'accès</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {PERMISSIONS_DEF.map(p=>{
                  const checked = (newUser.perms||[]).includes(p.id);
                  return (
                    <div key={p.id} onClick={()=>setNewUser(prev=>({...prev,
                      perms:checked?prev.perms.filter(x=>x!==p.id):[...prev.perms,p.id]}))}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                        borderRadius:8,cursor:"pointer",border:`1px solid ${checked?C.green:C.bd}`,
                        background:checked?C.greenL:"#fff"}}>
                      <div style={{width:14,height:14,borderRadius:3,
                        border:`2px solid ${checked?C.green:C.tx3}`,
                        background:checked?C.green:"#fff",display:"flex",alignItems:"center",
                        justifyContent:"center",flexShrink:0}}>
                        {checked&&<span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontSize:11}}>{p.icon}</span>
                      <span style={{fontSize:11,color:checked?C.greenD:C.tx}}>{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={handleAjouter}
              style={{width:"100%",padding:"12px",borderRadius:10,
                background:newUser.nom&&newUser.telephone?C.green:"#ccc",
                color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit"}}>
              ✅ Créer l'accès &amp; envoyer le code SMS
            </button>
          </div>
        )}
      </div>

      {/* Panneau droit — détail utilisateur */}
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>

        {/* Notification SMS simulée */}
        {smsSimule&&(
          <div style={{background:C.greenL,border:`1.5px solid ${C.green}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:6}}>📱 SMS envoyé</div>
            <div style={{fontSize:11,color:C.greenD,lineHeight:1.7}}>
              À : {smsSimule.telephone} ({smsSimule.nom})<br/>
              "Bonjour, votre accès APPLITAG ({smsSimule.role}) a été créé.<br/>
              Code d'accès : <strong>{smsSimule.code}</strong><br/>
              Téléchargez l'app : play.google.com/applitag"
            </div>
            <button onClick={()=>setSmsSimule(null)}
              style={{marginTop:8,background:"none",border:"none",color:C.greenD,
                fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Fermer</button>
          </div>
        )}

        {/* Fiche utilisateur sélectionné */}
        {selectedUser ? (()=>{
          const rd = rolesDef[selectedUser.role]||{icon:"👤",color:C.tx3,label:selectedUser.role};
          const parent = utilisateurs.find(u=>u.id===selectedUser.parentId);
          const children = getChildren(selectedUser.id);
          const permsUser = selectedUser.perms||[];
          return (
            <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${rd.color}`,overflow:"hidden"}}>
              {/* En-tête */}
              <div style={{background:rd.color,color:"#fff",padding:"14px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:28}}>{rd.icon}</span>
                  <div>
                    <div style={{fontSize:16,fontWeight:700}}>
                      {selectedUser.prenom?`${selectedUser.prenom} ${selectedUser.nom}`:selectedUser.nom||selectedUser.nomEntreprise}
                    </div>
                    <div style={{fontSize:11,opacity:.85}}>{rd.label}</div>
                    {selectedUser.nomEntreprise&&selectedUser.prenom&&(
                      <div style={{fontSize:10,opacity:.75}}>{selectedUser.nomEntreprise}</div>
                    )}
                  </div>
                  {selectedUser.codeGenere&&(
                    <div style={{marginLeft:"auto",textAlign:"right"}}>
                      <div style={{fontSize:9,opacity:.75}}>Code d'accès</div>
                      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:2}}>
                        {selectedUser.codeGenere}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Infos */}
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                  {selectedUser.telephone&&<div>📞 {selectedUser.telephone}</div>}
                  {selectedUser.email&&<div>📧 {selectedUser.email}</div>}
                  {selectedUser.departement&&<div>🏛️ {selectedUser.departement}</div>}
                  {selectedUser.region&&<div>🗺️ {selectedUser.region}</div>}
                  {selectedUser.ville&&<div>📍 {selectedUser.ville} {selectedUser.codePostal}</div>}
                  {selectedUser.pin&&<div>🔑 PIN: <strong>{selectedUser.pin}</strong></div>}
                </div>
                {parent&&(
                  <div style={{marginTop:8,fontSize:11,color:C.tx3}}>
                    Rattaché à : <strong style={{color:C.tx}}>{parent.prenom?`${parent.prenom} ${parent.nom}`:parent.nom}</strong>
                    {" · "}{(rolesDef[parent.role]||{}).label||parent.role}
                  </div>
                )}
              </div>
              {/* Droits d'accès */}
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2}}>
                    Droits d'accès ({permsUser.length}/{PERMISSIONS_DEF.length})
                  </div>
                  {editPerms?.id===selectedUser.id ? (
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{
                        setUtilisateurs(prev=>prev.map(u=>u.id===selectedUser.id?{...u,perms:editPerms.perms}:u));
                        setSelectedUser(prev=>({...prev,perms:editPerms.perms}));
                        setEditPerms(null);
                      }} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",
                        background:C.green,color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
                        ✓ Enregistrer
                      </button>
                      <button onClick={()=>setEditPerms(null)}
                        style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.bd}`,
                          background:"#fff",color:C.tx3,cursor:"pointer",fontFamily:"inherit"}}>
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>setEditPerms({id:selectedUser.id,perms:[...permsUser]})}
                      style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:`1px solid ${rd.color}`,
                        background:`${rd.color}18`,color:rd.color,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>
                      ✏️ Modifier
                    </button>
                  )}
                </div>

                {editPerms?.id===selectedUser.id ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {PERMISSIONS_DEF.map(p=>{
                      const checked = editPerms.perms.includes(p.id);
                      return (
                        <div key={p.id} onClick={()=>setEditPerms(prev=>({...prev,
                          perms:checked?prev.perms.filter(x=>x!==p.id):[...prev.perms,p.id]}))}
                          style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",
                            borderRadius:7,cursor:"pointer",
                            border:`1.5px solid ${checked?rd.color:C.bd}`,
                            background:checked?`${rd.color}12`:"#fff"}}>
                          <div style={{width:14,height:14,borderRadius:3,flexShrink:0,
                            border:`2px solid ${checked?rd.color:C.tx3}`,
                            background:checked?rd.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {checked&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}
                          </div>
                          <span style={{fontSize:11}}>{p.icon}</span>
                          <span style={{fontSize:11,color:checked?rd.color:C.tx,fontWeight:checked?600:400}}>
                            {p.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {PERMISSIONS_DEF.map(p=>{
                      const has = permsUser.includes(p.id);
                      return (
                        <span key={p.id} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                          background:has?rd.color+"22":C.bg2,color:has?rd.color:C.tx3,
                          fontWeight:has?600:400,border:`1px solid ${has?rd.color:C.bd}`}}>
                          {p.icon} {p.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Sous-utilisateurs */}
              {children.length>0&&(
                <div style={{padding:"12px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>
                    Utilisateurs désignés ({children.length})
                  </div>
                  {children.map(c=>{
                    const cr = rolesDef[c.role]||{icon:"👤",color:C.tx3};
                    return (
                      <div key={c.id} onClick={()=>setSelectedUser(c)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                          borderRadius:8,cursor:"pointer",marginBottom:4,
                          border:`1px solid ${C.bd}`,background:C.bg}}>
                        <span style={{fontSize:14}}>{cr.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.tx}}>
                            {c.prenom?`${c.prenom} ${c.nom}`:c.nom||c.nomEntreprise}
                          </div>
                          <div style={{fontSize:10,color:cr.color}}>{cr.label}</div>
                        </div>
                        <span style={{fontSize:9,fontFamily:"monospace",color:C.tx3}}>{c.codeGenere||""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })() : (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:32,textAlign:"center",color:C.tx3}}>
            <div style={{fontSize:32,marginBottom:10}}>👥</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Sélectionner un utilisateur</div>
            <div style={{fontSize:11}}>Cliquez sur un nœud de l'organigramme ou une ligne du tableau pour voir ses droits et ses sous-utilisateurs</div>
          </div>
        )}

        {/* Légende des rôles */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Rôles disponibles</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {ROLES_DEF.map(r=>(
              <span key={r.id} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                background:`${r.color}18`,color:r.color,fontWeight:600,border:`1px solid ${r.color}44`}}>
                {r.icon} {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SUIVI DES ABONNEMENTS ───────────────────────────────────────
const DEMO_ABONNEMENTS = [
  {id:"ab1",org:"SYLVA ENERGIE SARL",contact:"Marc Dujardin",email:"m.dujardin@sylva.fr",
   plan:"Pro",debut:"2025-09-01",fin:"2026-08-31",prix:490,statut:"actif",
   modules:["lots","transports","livraisons","documents"],users:4},
  {id:"ab2",org:"BOIS ÉNERGIE CENTRE",contact:"Sophie Marchand",email:"s.marchand@bec.fr",
   plan:"Essential",debut:"2026-01-15",fin:"2027-01-14",prix:290,statut:"actif",
   modules:["lots","documents"],users:2},
  {id:"ab3",org:"CHAUFFERIE MUNICIPALE ST-AMAND",contact:"Régie Technique",email:"regie@stamand.fr",
   plan:"Starter",debut:"2025-06-01",fin:"2026-05-31",prix:0,statut:"expire",
   modules:["lots"],users:1},
  {id:"ab4",org:"ETF DUPONT FRÈRES",contact:"Jean Dupont",email:"j.dupont@etf-dupont.fr",
   plan:"Pro",debut:"2026-04-01",fin:"2027-03-31",prix:490,statut:"actif",
   modules:["lots","transports","livraisons","documents","analyses"],users:6},
  {id:"ab5",org:"COMMUNE DE CHÂTILLON-SUR-INDRE",contact:"Service forêts",email:"forets@chatillon36.fr",
   plan:"Starter",debut:"2026-07-01",fin:"2026-09-30",prix:0,statut:"essai",
   modules:["lots"],users:1},
];

const PLANS_INFO = {
  Starter:   {color:"#6B7280",bg:"#F3F4F6"},
  Essential: {color:"#0369A1",bg:"#E0F2FE"},
  Pro:       {color:"#7C3AED",bg:"#EDE9FE"},
};

export const SectionAbonnements = () => {
  const [filtre,   setFiltre]   = useState("tous");
  const [selected, setSelected] = useState(null);
  const abos = DEMO_ABONNEMENTS.filter(a=>filtre==="tous"||a.statut===filtre);
  const now = new Date();
  const totMRR = DEMO_ABONNEMENTS.filter(a=>a.statut==="actif").reduce((s,a)=>s+Math.round(a.prix/12),0);
  const totActifs = DEMO_ABONNEMENTS.filter(a=>a.statut==="actif").length;
  const expiresBientot = DEMO_ABONNEMENTS.filter(a=>{
    const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
    return a.statut==="actif" && daysLeft<=60;
  });

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>💳 Suivi des abonnements</div>
        <div style={{fontSize:13,color:C.tx2}}>Gestion des licences et des renouvellements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"💼",label:"Abonnés actifs",val:totActifs,color:"#1E5B3A"},
          {icon:"💰",label:"MRR estimé",val:`${totMRR} €`,color:"#0369A1"},
          {icon:"⚠️",label:"Expire < 60 j",val:expiresBientot.length,color:"#B45309"},
          {icon:"🆓",label:"Essais en cours",val:DEMO_ABONNEMENTS.filter(a=>a.statut==="essai").length,color:"#7C3AED"},
        ].map(k=>(
          <div key={k.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:22}}>{k.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:k.color,lineHeight:1.2}}>{k.val}</div>
            <div style={{fontSize:10,color:C.tx2,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte expirations */}
      {expiresBientot.length>0&&(
        <div style={{background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:10,
          padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>⏰</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:4}}>Renouvellements proches</div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.5}}>
              {expiresBientot.map(a=>{
                const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
                return `${a.org} (J-${daysLeft})`;
              }).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["tous","Tous"],["actif","Actifs"],["essai","Essais"],["expire","Expirés"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)}
            style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${filtre===v?"#1E5B3A":C.bd}`,
              background:filtre===v?"#1E5B3A":"transparent",
              color:filtre===v?"#fff":C.tx2,fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`}}>
                {["Organisation","Plan","Début","Fin","J restants","Prix/an","Statut","Actions"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:C.tx2,
                    whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {abos.map((a,i)=>{
                const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
                const pi = PLANS_INFO[a.plan]||PLANS_INFO.Starter;
                const statutColor = {actif:"#065F46",essai:"#7C3AED",expire:"#991B1B"}[a.statut]||"#6B7280";
                const statutBg   = {actif:"#D1FAE5",essai:"#EDE9FE",expire:"#FEE2E2"}[a.statut]||"#F3F4F6";
                return (
                  <tr key={a.id} onClick={()=>setSelected(selected?.id===a.id?null:a)}
                    style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer",
                      background:selected?.id===a.id?"#F0FDF4":i%2===0?"#fff":"#FAFAFA"}}>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{fontWeight:700,color:C.tx}}>{a.org}</div>
                      <div style={{fontSize:10,color:C.tx2}}>{a.contact}</div>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:600,
                        background:pi.bg,color:pi.color}}>{a.plan}</span>
                    </td>
                    <td style={{padding:"10px 12px",color:C.tx2,whiteSpace:"nowrap"}}>
                      {new Date(a.debut).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{padding:"10px 12px",color:C.tx2,whiteSpace:"nowrap"}}>
                      {new Date(a.fin).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center",
                      fontWeight:700,color:daysLeft<0?"#991B1B":daysLeft<60?"#B45309":"#065F46"}}>
                      {daysLeft<0?"Expiré":`J-${daysLeft}`}
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:C.tx}}>
                      {a.prix===0?"Gratuit":`${a.prix} €`}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                        background:statutBg,color:statutColor}}>
                        {{actif:"✅ Actif",essai:"🆓 Essai",expire:"❌ Expiré"}[a.statut]}
                      </span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                          cursor:"pointer",border:`1px solid #1E5B3A`,background:"transparent",
                          color:"#1E5B3A",fontFamily:"inherit"}}
                          onClick={e=>{e.stopPropagation();}}>
                          ✉️ Contacter
                        </button>
                        {(a.statut==="expire"||a.statut==="essai")&&(
                          <button style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                            cursor:"pointer",border:`1px solid #7C3AED`,background:"transparent",
                            color:"#7C3AED",fontFamily:"inherit"}}
                            onClick={e=>{e.stopPropagation();}}>
                            🔄 Renouveler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Panneau détail */}
        {selected&&(
          <div style={{borderTop:`1px solid ${C.bd}`,padding:16,background:"#F0FDF4"}}>
            <div style={{fontWeight:700,color:"#1E5B3A",marginBottom:8,fontSize:13}}>
              📋 Détail — {selected.org}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
              {[
                ["Contact",selected.contact],
                ["Email",selected.email],
                ["Utilisateurs",`${selected.users} compte${selected.users>1?"s":""}`],
                ["Modules actifs",selected.modules.join(", ")],
              ].map(([k,v])=>(
                <div key={k} style={{background:"#fff",borderRadius:8,padding:"8px 12px",
                  border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:10,color:C.tx2,marginBottom:2}}>{k}</div>
                  <div style={{fontWeight:600,color:C.tx}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── DÉMO SCÉNARIO COMPLET ──────────────────────────────────────
const DEMO_STEPS = [
  {
    id:1, icon:"📱", label:"Signal Connect",
    who:"M. Bernard — propriétaire forestier",
    date:"08 avril 2026", heure:"08h42",
    statut:"SIGNAL_PROPRIETAIRE",
    resume:"M. Bernard signale 12 ha de bois disponibles via APPLITAG Connect depuis son téléphone.",
    detail:"M. Henri Bernard ouvre APPLITAG Connect sur son iPhone. Il localise sa parcelle sur la carte IGN, photographie l'entrée du chemin et deux arbres représentatifs, saisit l'essence principale (chêne + acacia), une estimation visuelle du volume, et valide. L'alerte arrive instantanément chez le mandataire ALTEGAD.",
    docs:["📲 Signalement numérique","📸 3 photos géolocalisées"],
    kpis:[{icon:"📐",label:"Surface signalée",val:"12 ha"},{icon:"🌲",label:"Essences",val:"Chêne + Acacia"},{icon:"⏱️",label:"Délai alerte",val:"< 30 secondes"}],
    color:"#0369A1",bg:"#E0F2FE",
    script:[
      "Nous démarrons la démonstration avec le tout nouveau point d'entrée d'APPLITAG : le signal propriétaire depuis APPLITAG Connect.",
      "M. Bernard est propriétaire de 12 ha en forêt de Tronçais. Depuis son téléphone, sans aucune connaissance technique, il localise sa parcelle sur la carte, prend trois photos et valide son signalement en moins de deux minutes.",
      "L'alerte arrive instantanément chez le mandataire ALTEGAD. Le lot LOT-2026-042 est créé automatiquement dans le système avec toutes les données saisies. Rien à ressaisir, rien à transcrire.",
      "C'est une rupture avec les pratiques habituelles : le propriétaire n'attend plus qu'on le rappelle — c'est lui qui initie, depuis son canapé, la chaîne complète de valorisation de ses bois.",
    ],
  },
  {
    id:2, icon:"🛣️", label:"Vérification desserte",
    who:"Mandataire forestier",
    date:"09 avril 2026", heure:"09h15",
    statut:"QUALIFICATION_ACCES",
    resume:"Le mandataire consulte le module Desserte avant d'engager la visite terrain.",
    detail:"Avant de se déplacer, le mandataire ouvre le module Desserte dans APPLITAG. Il vérifie le tronçon TRC-001 (Chemin des Battets), sa portance renforcée (≥ 19 t), sa largeur de 4,5 m, la disponibilité d'une place de dépôt, et la conformité DFCI de l'accès incendie. L'accès est validé pour un porteur + grumier.",
    docs:["🛣️ Fiche tronçon TRC-001","📋 Contrôle portance & accès"],
    kpis:[{icon:"⚖️",label:"Portance",val:"Renforcée ≥ 19 t"},{icon:"📐",label:"Largeur",val:"4,5 m"},{icon:"🔥",label:"Accès DFCI",val:"Conforme"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "Avant d'envoyer un mandataire sur le terrain, APPLITAG permet maintenant de vérifier la desserte depuis le bureau.",
      "Le module Desserte référence tous les tronçons forestiers avec leur portance, largeur, pente maximale, place de dépôt et conformité aux règles incendie DFCI. Ici, le tronçon Battets est renforcé, large et DFCI conforme — le porteur et le grumier pourront circuler sans restriction.",
      "Si la desserte avait été classée 'À améliorer' ou 'Légère', le mandataire aurait pu engager une procédure de travaux ou choisir un engin plus léger — tout ça décidé depuis le bureau, sans trajet inutile.",
      "C'est l'un des nouveaux modules du sprint APPLITAG : un référentiel vivant des 585 tonnes mobilisables accessibles sur ce périmètre.",
    ],
  },
  {
    id:3, icon:"🔭", label:"Visite terrain",
    who:"Mandataire + propriétaire",
    date:"14 avril 2026", heure:"10h00",
    statut:"VISITE_TERRAIN",
    resume:"Visite terrain avec formulaire 12 étapes. GPS relevé. Arbitrage SNBC 3. PV signé sur place.",
    detail:"Le mandataire ouvre le formulaire de visite guidé en 12 étapes. Il géolocalise, photographie, cube les bois (180 m³ bois d'œuvre + 320 m³ rémanents), et complète le nouveau bloc SNBC 3 : usage potentiel 'mixte BO/BE', usage retenu 'bois énergie' pour les rémanents, niveau de sécurisation 'mobilisable sous conditions'. Certification PEFC parcelle n°23-0042.",
    docs:["📄 PV de visite terrain","📄 Rapport de cubage","📊 Arbitrage SNBC 3"],
    kpis:[{icon:"🪵",label:"Bois d'œuvre",val:"180 m³"},{icon:"🌀",label:"Plaquettes",val:"320 m³ → ~128 t"},{icon:"📍",label:"GPS",val:"46.58°N / 2.77°E"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Le mandataire se rend sur place. Depuis APPLITAG mobile, il suit le formulaire de visite en 12 étapes guidées.",
      "Nouveauté SNBC 3 : APPLITAG demande maintenant l'arbitrage sur le flux de bois. Usage potentiel mixte bois-œuvre et bois-énergie — usage retenu bois-énergie pour les rémanents uniquement. Cette distinction est obligatoire pour la conformité réglementaire.",
      "Le cubage est saisi directement : 180 m³ de bois d'œuvre qui partiront en scierie, et 320 m³ de rémanents qui seront déchiquetés. La valeur carbone et le bilan GES sont déjà calculés en arrière-plan.",
      "Signature électronique du procès-verbal par les deux parties, sur le téléphone, avant même de quitter la parcelle.",
    ],
  },
  {
    id:4, icon:"📋", label:"Lot & contrat",
    who:"Admin APPLITAG",
    date:"15 avril 2026", heure:"14h30",
    statut:"EN_PREPARATION",
    resume:"Lot LOT-2026-042 créé. Contrat signé. QR Code chantier généré. Desserte validée.",
    detail:"Le lot est finalisé. Conditions de vente : bois d'œuvre à 45 €/m³, plaquettes à 38 €/t livraison chaufferie. Contrat signé électroniquement. QR Code chantier généré et imprimé pour l'ETF. La parcelle B 112–B 114 est liée au tronçon TRC-001 dans le module Desserte.",
    docs:["📄 Bon de commande BC-2026-042","📄 Contrat d'exploitation","🏷️ QR Code chantier"],
    kpis:[{icon:"🔢",label:"N° lot",val:"LOT-2026-042"},{icon:"💶",label:"Valeur estimée",val:"13 220 €"},{icon:"📅",label:"Deadline",val:"30 mai 2026"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Le lot existe déjà depuis le signal Connect. Cette étape consiste uniquement à le finaliser — les données de la visite sont déjà intégrées, rien à ressaisir.",
      "Les conditions commerciales sont fixées. Le contrat est généré en PDF et signé électroniquement. Le QR code unique du chantier est imprimé et remis à l'ETF.",
      "Nouveauté : la parcelle B 112 est désormais liée au tronçon de desserte TRC-001 dans APPLITAG. Si le tronçon change de statut — travaux, fermeture saisonnière — tous les lots associés sont alertés automatiquement.",
    ],
  },
  {
    id:5, icon:"🪓", label:"Exploitation chantier",
    who:"ETF Dupont Frères",
    date:"20 avril 2026", heure:"07h45",
    statut:"EN_EXPLOITATION",
    resume:"Abattage harvester + débardage porteur. Saisie quotidienne dans APPLITAG. QR scanné à l'arrivée.",
    detail:"ETF Dupont Frères (agrément PEFC n°2023-0156). 3 opérateurs : 1 harvester + 1 porteur. Le chef de chantier scanne le QR à l'arrivée, ce qui déclenche le statut 'En exploitation'. Saisie quotidienne des volumes. Alerte automatique si écart > 10% vs estimation visite.",
    docs:["📄 Ordre d'exploitation","📲 Scan QR arrivée chantier","📊 Suivi volumes quotidien"],
    kpis:[{icon:"🪓",label:"Abattage",val:"183 m³"},{icon:"🚜",label:"Débardage",val:"183 m³"},{icon:"⏱️",label:"Durée",val:"8 jours"}],
    color:"#1E5B3A",bg:"#DCFCE7",
    script:[
      "L'ETF reçoit l'ordre d'exploitation depuis APPLITAG. Le scan du QR code le matin du premier jour déclenche automatiquement le statut En exploitation.",
      "Chaque soir, l'opérateur saisit les volumes abattus. Le mandataire suit l'avancement en temps réel sans appel téléphonique.",
      "Si un opérateur découvre une contrainte non identifiée — une zone humide, un câble — il la signale depuis l'application avec une photo géolocalisée. Une alerte est envoyée au mandataire dans la minute.",
    ],
  },
  {
    id:6, icon:"♻️", label:"Scierie & coproduits",
    who:"Scierie Moreau — Moulins",
    date:"28 avril 2026", heure:"07h00",
    statut:"BOIS_OEUVRE_EN_SCIERIE",
    resume:"Les 183 m³ de bois d'œuvre partent en scierie. Coproduits qualifiés et tracés dans APPLITAG.",
    detail:"Le bois d'œuvre (chêne, 183 m³) est livré à la Scierie Moreau. Dans le module Coproduits, les connexes sont immédiatement qualifiés : 45 t de plaquettes P31 (humidité 30%), 12 t de sciures (humidité 45%, valorisation interne chaudière scierie), 8 t de dosses hêtre/chêne (destination panneaux). Le tout tracé lot par lot dans APPLITAG.",
    docs:["📄 Bon de livraison scierie","📊 Qualification coproduits","🔀 Fiche destination matière/énergie"],
    kpis:[{icon:"🪚",label:"Plaquettes P31",val:"45 t (hum. 30%)"},{icon:"🌫️",label:"Sciures",val:"12 t → énergie interne"},{icon:"🪜",label:"Dosses",val:"8 t → panneaux"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Nouveauté majeure : APPLITAG trace maintenant le bois d'œuvre jusqu'en scierie, et récupère la qualification des coproduits.",
      "Dès la réception en scierie, les connexes sont saisis dans le module Coproduits : plaquettes P31 à 30% d'humidité pour vente énergie, sciures pour la chaudière interne de la scierie, dosses pour la filière panneaux.",
      "Ici la distinction matière — énergie est tracée pour chaque flux. C'est ce que la SNBC 3 impose : prouver que la hiérarchie des usages est respectée. APPLITAG génère automatiquement la preuve documentaire.",
      "Les coproduits Scierie Moreau s'inscrivent également dans le cadre FEADER Grand Est — phase 2 ouverte en septembre 2026. APPLITAG prépare déjà le dossier de traçabilité.",
    ],
  },
  {
    id:7, icon:"🌀", label:"Déchiquetage rémanents",
    who:"JENZ Déchiquetage SARL",
    date:"02 mai 2026", heure:"08h00",
    statut:"EN_DECHIQUETAGE",
    resume:"320 m³ de rémanents déchiquetés sur chantier. 131 t de plaquettes PF2. Humidité 38%.",
    detail:"L'entreprise de déchiquetage intervient avec le Jenz HEM 593. Résultat : 131 t de plaquettes PF2 (humidité 38%). Chargement en camion-souffleur, livraison directe chaufferie. L'humidité 38% est enregistrée — elle sera comparée à la mesure d'arrivée. APPLITAG calcule en temps réel le coût RED à 3,3 €/t, soit 432 € de surcoût réglementaire estimé pour ce lot.",
    docs:["📄 Ordre de déchiquetage OD-2026-042","📊 Fiche humidité & granulométrie","📊 Calcul surcoût RED estimé"],
    kpis:[{icon:"🌀",label:"Volume déchiqueté",val:"320 m³"},{icon:"⚖️",label:"Tonnage",val:"131 t"},{icon:"💧",label:"Humidité",val:"38 %"},{icon:"💶",label:"Surcoût RED estimé",val:"432 €"}],
    color:"#92400E",bg:"#FEF3C7",
    script:[
      "Les rémanents sont déchiquetés sur le chantier. 131 tonnes de plaquettes PF2, humidité 38%.",
      "Nouveauté : APPLITAG calcule maintenant le surcoût RED en temps réel. Au benchmark de 3,3 euros par tonne — référence RED II pour les sites existants — ce lot représente 432 euros de surcoût réglementaire. Ce chiffre alimente le module Coût RED par tonne.",
      "L'humidité de 38% est enregistrée au départ. Elle sera comparée à la mesure à la réception. Si l'écart dépasse le seuil paramétré, une alerte est déclenchée automatiquement.",
    ],
  },
  {
    id:8, icon:"🚛", label:"Transport & CMR",
    who:"Transport Bernard SAS",
    date:"04 mai 2026", heure:"06h30",
    statut:"EN_TRANSPORT",
    resume:"3 rotations. CMR générés automatiquement. Traçabilité QR départ/arrivée.",
    detail:"3 camions semi-remorques. CMR n° CMR-2026-0831 à 0833 générés automatiquement dans APPLITAG. Chaque chauffeur scanne le QR au départ et à l'arrivée. Statut 'En route' visible en temps réel par le mandataire et la chaufferie.",
    docs:["📄 CMR Transport (×3)","📲 Scan QR chauffeur départ","📲 Scan QR chauffeur arrivée"],
    kpis:[{icon:"🚛",label:"Rotations",val:"3 camions"},{icon:"⚖️",label:"Total",val:"131 t"},{icon:"📍",label:"Distance",val:"~68 km"}],
    color:"#6D28D9",bg:"#EDE9FE",
    script:[
      "Le transport est planifié depuis le module Transports. Le chauffeur reçoit sa mission sur son téléphone : GPS, numéro de lot, destination, créneau.",
      "Au départ, scan du QR. La lettre de voiture CMR est générée automatiquement — plus de paperasse à 6h30 du matin. Le statut passe à En route, visible par le mandataire et la chaufferie.",
      "À l'arrivée, nouveau scan. La pesée à la bascule sera comparée au tonnage déclaré au départ. C'est la traçabilité physique bout en bout.",
    ],
  },
  {
    id:9, icon:"🔥", label:"Réception chaufferie",
    who:"Chaufferie Vichy Agglo — 6,8 MW",
    date:"04 mai 2026", heure:"09h10",
    statut:"LIVRE",
    resume:"Réception à la bascule. Jauge stock mise à jour. Autonomie calculée. F08 cosigné.",
    detail:"Le camion arrive à la Chaufferie Vichy Agglo (6,8 MW, 13 600 t/an). Le réceptionnaire retrouve le bon de livraison dans APPLITAG. Pesée : 43,8 t. Humidité sonde : 38,2%. Écart 150 kg — dans les tolérances. La jauge de stock passe de 312 t à 356 t. Autonomie estimée : de 8 à 10 jours. Les 3 rotations totalisent 131,2 t réceptionnées.",
    docs:["📄 Bon de livraison (×3)","📄 Réception F08 cosignée","📊 Contrôle humidité sonde"],
    kpis:[{icon:"📦",label:"Réceptionné",val:"131,2 t"},{icon:"💧",label:"Humidité mesurée",val:"38,2 %"},{icon:"🔥",label:"Stock chaufferie",val:"356 t (+131 t)"},{icon:"📅",label:"Autonomie",val:"10 jours"}],
    color:"#B45309",bg:"#FEF3C7",
    script:[
      "Le camion arrive à la Chaufferie Vichy Agglo, l'une des 29 chaufferies référencées dans APPLITAG — de Vichy à Papeete, de Bastia à Saint-Pierre-et-Miquelon.",
      "Le réceptionnaire retrouve instantanément le bon de livraison sur sa tablette. Pesée bascule, mesure humidité. Tout est saisi dans APPLITAG, les données alimentent directement la jauge de stock de la chaufferie.",
      "La jauge passe de 312 à 356 tonnes. L'autonomie remonte de 8 à 10 jours. Si le stock avait été sous le seuil d'alerte, une notification aurait déjà été envoyée au planning pour anticiper la prochaine livraison.",
      "Le bon de livraison F08 est cosigné numériquement par le chauffeur et le réceptionnaire. Archivé instantanément. En cas de litige : heure, poids, humidité, signatures — tout est là.",
    ],
  },
  {
    id:10, icon:"🧾", label:"Facturation électronique",
    who:"Admin APPLITAG",
    date:"05 mai 2026", heure:"08h30",
    statut:"FACTURE_EMISE",
    resume:"Facture FAC-2026-042 générée depuis le lot. Détection doublon. Transmission PDP.",
    detail:"APPLITAG génère la facture en un clic depuis le lot clôturé. FAC-2026-042 : 131,2 t × 38 €/t + 183 m³ × 45 €/m³. Total HT : 13 229,60 €. Le module détecte qu'une seconde facture avait été créée par erreur sur le même bon de livraison — doublon bloqué. La facture validée est transmise à la plateforme de dématérialisation partenaire (PDP) conformément à l'obligation du 1er septembre 2026.",
    docs:["🧾 FAC-2026-042 (validée)","🚫 Doublon FAC-2026-042b (bloqué)","📤 Transmission PDP"],
    kpis:[{icon:"💶",label:"Montant HT",val:"13 229,60 €"},{icon:"🔄",label:"Doublons détectés",val:"1 bloqué"},{icon:"📤",label:"Statut",val:"Transmise PDP"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "La facturation électronique est maintenant intégrée directement dans le flux APPLITAG — une obligation réglementaire à partir du 1er septembre 2026.",
      "La facture est générée en un clic depuis le lot clôturé. Montant calculé automatiquement depuis les données de livraison.",
      "APPLITAG a détecté qu'une deuxième facture avait été créée par erreur sur le même bon de livraison — doublon bloqué avant transmission. C'est le genre d'erreur qui coûtait des heures de correction manuelle, ou pire, qui passait inaperçue.",
      "La facture validée est transmise à la plateforme de dématérialisation partenaire. La piste d'audit complète — lot, livraison, facture, paiement — est archivée pour 10 ans.",
    ],
  },
  {
    id:11, icon:"🇪🇺", label:"Conformité RED & GES",
    who:"Responsable réglementaire",
    date:"06 mai 2026", heure:"10h00",
    statut:"CONTROLE_REGLEMENTAIRE",
    resume:"Vérification critères RED II. Calcul surcoût 3,3 €/t. Bilan GES lot. Arbitrage SNBC 3 validé.",
    detail:"Le module Conformité RED vérifie automatiquement les 6 critères du lot : origine géographique tracée, certification PEFC, pas de zone protégée, humidité mesurée, destination déclarée. Score : 5/6 (origine à compléter). Le module Coût RED calcule 432 € de surcoût pour ce lot. Le Bilan GES affiche 28 tCO₂eq évitées. L'arbitrage SNBC 3 — bois énergie justifié pour les rémanents — est documenté.",
    docs:["📋 Rapport conformité RED II","📊 Coût RED : 432 € (3,3 €/t)","🌡️ Bilan GES : 28 tCO₂eq évitées","📄 Arbitrage SNBC 3 validé"],
    kpis:[{icon:"🇪🇺",label:"Score RED",val:"5/6 critères"},{icon:"💶",label:"Surcoût RED",val:"432 € (3,3 €/t)"},{icon:"🌡️",label:"GES évités",val:"28 tCO₂eq"},{icon:"⚖️",label:"SNBC 3",val:"Arbitrage conforme"}],
    color:"#1E3A8A",bg:"#DBEAFE",
    script:[
      "Dernier module clé : la conformité réglementaire. APPLITAG vérifie automatiquement les critères RED II pour ce lot.",
      "5 critères sur 6 sont validés. Le sixième — justificatif d'origine géographique complémentaire — est signalé avec une action corrective à réaliser avant l'audit.",
      "Le surcoût RED calculé est de 432 euros pour ce lot, soit 3,3 euros par tonne — cohérent avec le benchmark du consortium que l'on retrouve dans le module Coût RED.",
      "Le Bilan GES affiche 28 tonnes de CO2 équivalent évitées. L'arbitrage SNBC 3 documenté lors de la visite est retrouvé et validé. Tout est cohérent, tout est traçable. APPLITAG est prêt pour l'audit.",
    ],
  },
  {
    id:12, icon:"📐", label:"Projet financé FEADER",
    who:"Porteur de projet — SCIC Tronçais",
    date:"07 mai 2026", heure:"14h00",
    statut:"DOSSIER_FEADER_EN_COURS",
    resume:"Le lot s'inscrit dans un projet financé FEADER. Desserte + traçabilité = indicateurs financeur.",
    detail:"La desserte du chantier Bernard fait l'objet d'un projet financé FEADER – Développement rural Grand Est (PRJ-2026-001). APPLITAG consolide automatiquement les indicateurs exigés : surface desservie (12 ha), tonnage mobilisé (131 t + 183 m³ bois d'œuvre), destination tracée, emplois. Les pièces encore manquantes sont signalées : attestation assurance maîtrise d'ouvrage, PV de réception travaux.",
    docs:["📐 Dossier PRJ-2026-001 (50% avancement)","📊 Indicateurs financeur FEADER","⏳ 2 pièces manquantes signalées"],
    kpis:[{icon:"💶",label:"Dépenses prévues",val:"42 000 €"},{icon:"✅",label:"Avancement",val:"50 %"},{icon:"📋",label:"Pièces manquantes",val:"2"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Ce lot s'inscrit dans un projet financé FEADER. APPLITAG dispose d'un module générique Projets financés qui couvre le parcours complet en 8 étapes, du diagnostic au bilan final.",
      "Les indicateurs financeur — surface, tonnage, destination, emplois — sont consolidés automatiquement depuis les données déjà saisies dans les autres modules. Aucune ressaisie.",
      "APPLITAG signale les deux pièces justificatives encore manquantes pour compléter le dossier. Le porteur de projet sait exactement quoi fournir, sans relance du financeur.",
      "Voilà le fil conducteur de cette démonstration : un signal propriétaire, une desserte vérifiée, un lot tracé, une scierie référencée, des coproduits qualifiés, une chaufferie servie, une facture conforme, un audit RED préparé, un projet FEADER outillé. APPLITAG est la colonne vertébrale de la filière bois-énergie.",
    ],
  },
];

export const SectionDemoScenario = () => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(playing){
      timerRef.current = setInterval(()=>{
        setStep(s=>{
          if(s>=DEMO_STEPS.length-1){ setPlaying(false); clearInterval(timerRef.current); return s; }
          return s+1;
        });
      },2800);
    } else {
      clearInterval(timerRef.current);
    }
    return ()=>clearInterval(timerRef.current);
  },[playing]);

  const cur = DEMO_STEPS[step];

  return (
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>🎬 Démo scénario complet</div>
          <div style={{fontSize:13,color:C.tx2}}>Parcours A→Z du lot LOT-2026-042 — Forêt de M. Bernard (12 ha, Tronçais)</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>{setStep(0);setPlaying(false);}}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${C.bd}`,background:"transparent",color:C.tx2,fontFamily:"inherit"}}>
            ⏮ Recommencer
          </button>
          <button onClick={()=>setPlaying(p=>!p)}
            style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
              border:"none",background:playing?"#B91C1C":"#1E5B3A",color:"#fff",fontFamily:"inherit"}}>
            {playing?"⏸ Pause":"▶ Lecture auto"}
          </button>
          <button onClick={()=>setShowScript(s=>!s)}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`2px solid ${showScript?"#7C3AED":"#D1D5DB"}`,
              background:showScript?"#EDE9FE":"transparent",
              color:showScript?"#7C3AED":C.tx2,fontFamily:"inherit"}}>
            🎤 {showScript?"Masquer script":"Script présentateur"}
          </button>
        </div>
      </div>

      {/* Timeline stepper */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:"16px 20px",marginBottom:20,overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:0,minWidth:700}}>
          {DEMO_STEPS.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
              <div onClick={()=>{setPlaying(false);setStep(i);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",
                  flex:"0 0 auto",width:60}}>
                <div style={{width:36,height:36,borderRadius:"50%",
                  background:i<=step?s.bg:"#F3F4F6",
                  border:`2px solid ${i<=step?s.color:"#D1D5DB"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,transition:"all .3s",
                  boxShadow:i===step?`0 0 0 4px ${s.bg}`:undefined}}>
                  {i<step?"✓":s.icon}
                </div>
                <div style={{fontSize:9,color:i<=step?s.color:"#9CA3AF",marginTop:4,textAlign:"center",
                  fontWeight:i===step?700:400,lineHeight:1.2,maxWidth:58}}>
                  {s.label}
                </div>
              </div>
              {i<DEMO_STEPS.length-1&&(
                <div style={{flex:1,height:2,background:i<step?cur.color:"#E5E7EB",
                  transition:"background .5s",margin:"0 2px",marginBottom:22}}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Script présentateur */}
      {showScript&&(
        <div style={{background:"linear-gradient(135deg,#FAF5FF,#F3E8FF)",borderRadius:14,
          border:"2px solid #C4B5FD",padding:"18px 20px",marginBottom:20,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:22}}>🎤</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>Script présentateur</div>
              <div style={{fontSize:11,color:"#7C3AED",opacity:.8}}>Texte à lire à voix haute — étape {cur.id}/{DEMO_STEPS.length} : {cur.label}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {cur.script.map((para,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",
                  background:"#7C3AED",color:"#fff",fontSize:10,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
                  {i+1}
                </span>
                <p style={{margin:0,fontSize:14,color:"#3B1D8A",lineHeight:1.75,
                  fontStyle:"normal",fontWeight:i===0?600:400}}>
                  {para}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carte principale */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
        {/* Détail étape */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{background:cur.bg,borderBottom:`1px solid ${cur.color}33`,
            padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:52,height:52,borderRadius:14,background:"#fff",
              border:`2px solid ${cur.color}44`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:26,flexShrink:0}}>
              {cur.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:17,fontWeight:800,color:cur.color}}>{cur.label}</div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                  background:`${cur.color}18`,color:cur.color}}>Étape {cur.id}/{DEMO_STEPS.length}</span>
              </div>
              <div style={{fontSize:12,color:C.tx2,marginTop:3}}>
                👤 {cur.who} · 📅 {cur.date} {cur.heure}
              </div>
            </div>
          </div>
          <div style={{padding:"16px 20px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:8,
              padding:"10px 12px",background:cur.bg,borderRadius:8,borderLeft:`3px solid ${cur.color}`}}>
              {cur.resume}
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.7,marginBottom:16}}>
              {cur.detail}
            </div>

            {/* Statut */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:C.tx2,fontWeight:600}}>Statut lot :</span>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:5,fontWeight:700,
                background:cur.bg,color:cur.color}}>{cur.statut}</span>
            </div>

            {/* Documents */}
            {cur.docs.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Documents générés</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {cur.docs.map((d,i)=>(
                    <span key={i} style={{fontSize:11,padding:"5px 10px",borderRadius:7,
                      background:"#F9FAFB",border:`1px solid ${C.bd}`,color:C.tx,fontWeight:500}}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 20px",
            display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:`1px solid ${C.bd}`,background:"transparent",color:step===0?"#D1D5DB":C.tx2,
                fontFamily:"inherit",opacity:step===0?.4:1}}>
              ← Précédent
            </button>
            <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>
              {step+1} / {DEMO_STEPS.length}
            </span>
            <button onClick={()=>setStep(s=>Math.min(DEMO_STEPS.length-1,s+1))} disabled={step===DEMO_STEPS.length-1}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:"none",background:step===DEMO_STEPS.length-1?"#E5E7EB":cur.color,
                color:step===DEMO_STEPS.length-1?"#9CA3AF":"#fff",fontFamily:"inherit",
                opacity:step===DEMO_STEPS.length-1?.4:1}}>
              Suivant →
            </button>
          </div>
        </div>

        {/* Panneau KPIs + progression */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* KPIs étape */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Indicateurs clés</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cur.kpis.map((k,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"8px 12px",borderRadius:8,background:cur.bg}}>
                  <span style={{fontSize:12,color:C.tx2}}>{k.icon} {k.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:cur.color}}>{k.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progression du lot */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Avancement global</div>
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:C.tx2}}>Progression</span>
                <span style={{fontSize:11,fontWeight:700,color:"#1E5B3A"}}>
                  {Math.round(((step+1)/DEMO_STEPS.length)*100)} %
                </span>
              </div>
              <div style={{height:8,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:"#1E5B3A",
                  width:`${Math.round(((step+1)/DEMO_STEPS.length)*100)}%`,
                  transition:"width .5s ease"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:10}}>
              {DEMO_STEPS.map((s,i)=>(
                <div key={s.id} onClick={()=>{setPlaying(false);setStep(i);}}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                    borderRadius:6,cursor:"pointer",
                    background:i===step?s.bg:"transparent",
                    border:`1px solid ${i===step?s.color+"44":"transparent"}`}}>
                  <span style={{fontSize:12}}>{i<step?"✅":i===step?s.icon:"⬜"}</span>
                  <span style={{fontSize:11,color:i<=step?s.color:C.tx2,fontWeight:i===step?700:400}}>
                    {s.label}
                  </span>
                  <span style={{fontSize:9,color:C.tx2,marginLeft:"auto"}}>{s.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bilan final */}
          {step===DEMO_STEPS.length-1&&(
            <div style={{background:"#D1FAE5",borderRadius:14,border:"1px solid #34D399",padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>🏆 Lot clôturé</div>
              {[["Durée totale","24 jours"],["CA réalisé","13 220 €"],["CO₂ évité","~32 tCO₂eq"],["Docs générés","12 documents"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  padding:"3px 0",borderBottom:"1px solid #A7F3D044"}}>
                  <span style={{color:"#065F46"}}>{k}</span>
                  <span style={{fontWeight:700,color:"#064E3B"}}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ARCHITECTURE FONCTIONNELLE 7 MODULES / 36 SOUS-MODULES ────
const MODULES_COMMERCIAUX = [
  {
    id:"operations",
    nom:"APPLITAG Operations",
    icon:"⚙️",
    couleur:"#1E5B3A",
    bg:"#D1FAE5",
    tagline:"Piloter les opérations terrain et forestières",
    sousMods:[
      {n:1,  nom:"Operations",  fn:"Centraliser et piloter l'ensemble des activités opérationnelles.", statut:"ok",      app:"Tableau de bord"},
      {n:2,  nom:"Commercial",  fn:"Gérer contacts, prospects, propriétaires, clients et opportunités.", statut:"ok",      app:"Lots (fiche propriétaire)"},
      {n:3,  nom:"Forest",      fn:"Recenser parcelles, peuplements, essences, accès et potentiels forestiers.", statut:"ok",   app:"Parcelles & Travaux"},
      {n:4,  nom:"Worksite",    fn:"Préparer, suivre et clôturer les chantiers forestiers.", statut:"ok",      app:"Chantiers"},
      {n:5,  nom:"Lots",        fn:"Créer et suivre chaque lot de son origine à sa destination.", statut:"ok",      app:"Lots"},
      {n:6,  nom:"Stock",       fn:"Mesurer et gérer les tas, volumes, tonnages et stocks.", statut:"roadmap", app:"—"},
      {n:7,  nom:"Production",  fn:"Suivre le broyage, les rendements et les quantités produites.", statut:"partial", app:"Transports (déchiquetage)"},
      {n:8,  nom:"Planning",    fn:"Planifier les visites, chantiers, broyages et interventions.", statut:"ok",      app:"Planning"},
      {n:9,  nom:"Equipment",   fn:"Gérer les matériels, entretiens, pannes et disponibilités.", statut:"roadmap", app:"—"},
      {n:10, nom:"Workflow",    fn:"Encadrer les opérations avec étapes, validations et règles métier.", statut:"ok",   app:"Formulaire visite 12 étapes"},
      {n:11, nom:"Mobile",      fn:"Permettre la saisie et la consultation sur smartphone ou tablette.", statut:"ok",   app:"Interface responsive terrain"},
      {n:12, nom:"Offline",     fn:"Garantir la saisie terrain sans réseau et la synchronisation.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"logistics",
    nom:"APPLITAG Logistics",
    icon:"🚛",
    couleur:"#0369A1",
    bg:"#DBEAFE",
    tagline:"Organiser les transports, livraisons et chaufferies",
    sousMods:[
      {n:13, nom:"Logistics",      fn:"Planifier les chargements, véhicules, chauffeurs, itinéraires.", statut:"ok",      app:"Transports"},
      {n:14, nom:"Delivery",       fn:"Enregistrer les pesées, livraisons, signatures, réserves et refus.", statut:"ok",   app:"Livraisons"},
      {n:15, nom:"Platforms",      fn:"Piloter les entrées, sorties, stocks et zones des plateformes.", statut:"partial", app:"Livraisons (réception)"},
      {n:16, nom:"Heating Plants", fn:"Suivre les besoins, stocks, consommations et livraisons des chaufferies.", statut:"ok", app:"Chaufferies"},
    ],
  },
  {
    id:"traceability",
    nom:"APPLITAG Traceability",
    icon:"🔍",
    couleur:"#7C3AED",
    bg:"#EDE9FE",
    tagline:"Traçabilité, qualité et conformité de la parcelle à la chaufferie",
    sousMods:[
      {n:17, nom:"Traceability", fn:"Assurer une continuité d'information de la parcelle au client final.", statut:"ok",      app:"QR code lot, statuts bout-en-bout"},
      {n:18, nom:"Quality",      fn:"Contrôler l'humidité, la granulométrie, les essences et la conformité.", statut:"partial", app:"Livraisons (humidité mesurée)"},
      {n:19, nom:"Documents",    fn:"Générer, classer et rattacher les documents aux opérations.", statut:"ok",      app:"Documents (9 types, PDF)"},
      {n:20, nom:"Compliance",   fn:"Gérer les obligations réglementaires, certifications et audits.", statut:"ok",      app:"Veille réglementaire"},
      {n:21, nom:"RED",          fn:"Collecter les données nécessaires aux exigences RED II et RED III.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"data",
    nom:"APPLITAG Data",
    icon:"📊",
    couleur:"#B45309",
    bg:"#FEF3C7",
    tagline:"Transformer les données en tableaux de bord, alertes et analyses",
    sousMods:[
      {n:22, nom:"Data",    fn:"Produire des tableaux de bord, indicateurs, analyses et prévisions.", statut:"ok",   app:"Analyses & Rapports"},
      {n:23, nom:"Map",     fn:"Cartographier les parcelles, stocks, chantiers, plateformes et chaufferies.", statut:"ok", app:"Territoire (CARTOFOB)"},
      {n:24, nom:"Alert",   fn:"Détecter les retards, anomalies, ruptures et documents manquants.", statut:"ok",   app:"Alertes"},
      {n:25, nom:"Finance", fn:"Calculer les coûts, marges, rentabilités, valeurs de stocks et écarts.", statut:"ok", app:"Analyses (marges, CA, rentabilité)"},
    ],
  },
  {
    id:"connect",
    nom:"APPLITAG Connect",
    icon:"🔗",
    couleur:"#065F46",
    bg:"#CCFBF1",
    tagline:"Connecter utilisateurs, partenaires et systèmes externes",
    sousMods:[
      {n:26, nom:"Connect",       fn:"Relier APPLITAG aux ERP, ponts-bascules, GPS, capteurs et logiciels partenaires.", statut:"roadmap", app:"—"},
      {n:27, nom:"Administration",fn:"Paramétrer les entreprises, utilisateurs, rôles, droits et modèles.", statut:"ok",      app:"Utilisateurs & Paramètres"},
      {n:28, nom:"Owner",         fn:"Offrir au propriétaire un accès à ses parcelles, chantiers et documents.", statut:"roadmap", app:"—"},
      {n:29, nom:"Client Portal", fn:"Donner aux clients une visibilité sur leurs stocks, livraisons et qualités.", statut:"roadmap", app:"—"},
      {n:30, nom:"Demo",          fn:"Présenter la plateforme à partir de scénarios et données fictives.", statut:"ok",      app:"Démo scénario"},
      {n:31, nom:"Pilot",         fn:"Préparer les déploiements pilotes et suivre les retours utilisateurs.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"network",
    nom:"APPLITAG Network",
    icon:"🤝",
    couleur:"#6D28D9",
    bg:"#EDE9FE",
    tagline:"Réseau professionnel et mise en relation de la filière",
    sousMods:[
      {n:32, nom:"Network",     fn:"Constituer un annuaire professionnel qualifié des acteurs de la filière.", statut:"ok",   app:"Réseau & Offres (annuaire)"},
      {n:33, nom:"Marketplace", fn:"Mettre en relation les offres et besoins de bois, transport et prestations.", statut:"ok", app:"Réseau & Offres (offres)"},
    ],
  },
  {
    id:"academy",
    nom:"APPLITAG Academy & Media",
    icon:"🎓",
    couleur:"#92400E",
    bg:"#FEF3C7",
    tagline:"Former, informer et valoriser les acteurs du bois-énergie",
    sousMods:[
      {n:34, nom:"Academy", fn:"Former les utilisateurs aux outils, métiers, normes et bonnes pratiques.", statut:"futur", app:"—"},
      {n:35, nom:"Radio",   fn:"Diffuser interviews, actualités, chroniques et émissions professionnelles.", statut:"futur", app:"—"},
      {n:36, nom:"TV",      fn:"Diffuser reportages, démonstrations, formations et événements de la filière.", statut:"futur", app:"—"},
    ],
  },
];

const SM_STATUT = {
  ok:      {label:"Disponible",  color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  partial: {label:"Partiel",     color:"#92400E", bg:"#FEF3C7", icon:"🔄"},
  roadmap: {label:"Roadmap",     color:"#0369A1", bg:"#DBEAFE", icon:"🔜"},
  futur:   {label:"Futur",       color:"#6D28D9", bg:"#EDE9FE", icon:"🔵"},
};

export const SectionModulesFuturs = () => {
  const [selMod, setSelMod] = useState("operations");
  const [filtre, setFiltre] = useState("all");
  const mod = MODULES_COMMERCIAUX.find(m=>m.id===selMod);

  const smFiltres = filtre==="all" ? mod.sousMods : mod.sousMods.filter(s=>s.statut===filtre);

  const totals = {
    ok:      MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="ok").length,
    partial: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="partial").length,
    roadmap: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="roadmap").length,
    futur:   MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="futur").length,
  };

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
              🗂️ Architecture fonctionnelle APPLITAG
            </div>
            <div style={{fontSize:13,color:C.tx2}}>7 modules commerciaux · 36 sous-modules · classification officielle</div>
          </div>
          {/* Légende compteurs */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.entries(SM_STATUT).map(([k,s])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:5,
                padding:"5px 10px",borderRadius:20,background:s.bg,
                border:`1px solid ${s.color}44`,fontSize:11,fontWeight:700,color:s.color}}>
                {s.icon} {totals[k]} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* 7 cartes modules */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
          {MODULES_COMMERCIAUX.map(m=>{
            const nbOk = m.sousMods.filter(s=>s.statut==="ok").length;
            const total = m.sousMods.length;
            const isActive = selMod===m.id;
            return (
              <div key={m.id} onClick={()=>setSelMod(m.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 10px",cursor:"pointer",
                  border:`2px solid ${isActive?m.couleur:C.bd}`,
                  boxShadow:isActive?`0 0 0 3px ${m.bg}`:"none",
                  transition:"all .2s",textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:6}}>{m.icon}</div>
                <div style={{fontSize:10,fontWeight:800,color:isActive?m.couleur:C.tx,lineHeight:1.2,marginBottom:6}}>
                  {m.nom.replace("APPLITAG ","")}
                </div>
                <div style={{height:4,borderRadius:2,background:"#E5E7EB",overflow:"hidden",marginBottom:5}}>
                  <div style={{height:"100%",borderRadius:2,background:m.couleur,
                    width:`${Math.round((nbOk/total)*100)}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2}}>{nbOk}/{total} dispo</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail module sélectionné */}
      {mod&&(
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          {/* Header module */}
          <div style={{background:mod.bg,borderBottom:`1px solid ${mod.couleur}22`,
            padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:30}}>{mod.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:mod.couleur}}>{mod.nom}</div>
                <div style={{fontSize:12,color:C.tx2}}>{mod.tagline}</div>
              </div>
            </div>
            {/* Filtre statut */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["all","Tous","#374151","#F3F4F6"],...Object.entries(SM_STATUT).map(([k,s])=>[k,s.label,s.color,s.bg])].map(([k,label,col,bg])=>(
                <button key={k} onClick={()=>setFiltre(k)}
                  style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"inherit",border:`1px solid ${filtre===k?col:"#E5E7EB"}`,
                    background:filtre===k?bg:"transparent",color:filtre===k?col:C.tx2}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille sous-modules */}
          <div style={{padding:"16px 20px",display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
            {smFiltres.map(sm=>{
              const ss = SM_STATUT[sm.statut];
              return (
                <div key={sm.n} style={{borderRadius:10,border:`1px solid ${ss.color}33`,
                  background:`${ss.bg}60`,padding:"12px 14px",position:"relative"}}>
                  {/* Numéro + statut */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <span style={{fontSize:9,fontWeight:800,color:ss.color,
                      background:ss.bg,border:`1px solid ${ss.color}44`,
                      padding:"2px 7px",borderRadius:10}}>
                      #{sm.n} {ss.icon} {ss.label}
                    </span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:mod.couleur,marginBottom:4}}>{sm.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,lineHeight:1.5,marginBottom:8}}>{sm.fn}</div>
                  {sm.app!=="—"&&(
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,
                      fontSize:10,fontWeight:700,color:mod.couleur,
                      background:mod.bg,border:`1px solid ${mod.couleur}33`,
                      padding:"3px 8px",borderRadius:6}}>
                      📍 {sm.app}
                    </div>
                  )}
                  {sm.app==="—"&&(
                    <div style={{fontSize:10,color:"#9CA3AF",fontStyle:"italic"}}>Non encore développé</div>
                  )}
                </div>
              );
            })}
            {smFiltres.length===0&&(
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:30,color:C.tx2,fontSize:13}}>
                Aucun sous-module dans ce filtre pour ce module.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ── FINANCEMENTS & RESTAURATION FORESTIÈRE ─────────────────────

const STATUT_REG = {
  BROUILLON:                   {label:"Brouillon",               color:"#6B7280", bg:"#F3F4F6"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {label:"Annoncé – texte attendu", color:"#92400E", bg:"#FEF3C7"},
  OUVERT:                      {label:"Ouvert",                  color:"#065F46", bg:"#D1FAE5"},
  SUSPENDU:                    {label:"Suspendu",                color:"#B45309", bg:"#FEF3C7"},
  FERME:                       {label:"Fermé",                   color:"#991B1B", bg:"#FEE2E2"},
  REMPLACE:                    {label:"Remplacé",                color:"#5B21B6", bg:"#EDE9FE"},
  EXPIRE:                      {label:"Expiré",                  color:"#374151", bg:"#E5E7EB"},
};

const FUNDING_PROGRAMS = [
  {
    id:"fff2100",
    nom:"France Forêt 2100",
    acronyme:"FFF2100",
    type:"Plateforme de mise en relation",
    organisme:"Start-up d'État — pilotage Gouvernement",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Collectivités","Gestionnaires","Établissements publics","Porteurs de projets"],
    operationsEligibles:["Restauration de massifs","Renouvellement","Adaptation climatique","Projets carbone/biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Connecteur désactivé — aucune API officielle publiée. Intermédiaire de financement, pas un guichet de subvention ouvert.",
    couleur:"#1E5B3A", bg:"#D1FAE5",
    icon:"🌳",
    fonctions:[
      "Dépôt d'un projet forestier",
      "Recherche de financeurs publics et privés",
      "Mise en relation",
      "Suivi des manifestations d'intérêt",
      "Construction d'un plan de financement combiné",
    ],
  },
  {
    id:"fonds-vert-foret-2027",
    nom:"Fonds vert – Adaptation des forêts",
    acronyme:"FV-FORET",
    type:"Subvention",
    organisme:"Ministère de la Transition écologique",
    origine:"État – Fonds vert (1 Md€ total)",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Budget 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Collectivités","Propriétaires","Gestionnaires","Établissements publics"],
    operationsEligibles:["Restauration de massifs incendiés","Adaptation climatique","Résilience forestière","Zones tampons","Prévention incendie","Réduction de la vulnérabilité"],
    tauxMin:null, tauxMax:null, plafond:null,
    montantNational:"100 000 000 €",
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Taux, plafonds et procédures non encore publiés. Budget 2027 à voter.",
    couleur:"#0369A1", bg:"#DBEAFE",
    icon:"💧",
    fonctions:[
      "Restauration massifs incendiés",
      "Renouvellement peuplements dépérissants",
      "Création zones tampons",
      "Prévention des incendies",
    ],
  },
  {
    id:"renouvellement-foret-2027",
    nom:"Renouvellement forestier 2027",
    acronyme:"RF2027",
    type:"Aide au renouvellement",
    organisme:"À préciser",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"À partir de 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires"],
    operationsEligibles:["Parcelles touchées nématode du pin","Peuplements ≥ 40 % dépérissement","Renouvellement","Enrichissement","Régénération naturelle","Plantation"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Seuil de 40 % de dépérissement annoncé. Règles non bloquantes jusqu'à publication des textes d'application.",
    couleur:"#7C3AED", bg:"#EDE9FE",
    icon:"🌱",
    fonctions:[
      "Nématode du pin – éligibilité des parcelles touchées",
      "Dépérissement ≥ 40 % – ciblage des peuplements",
      "Renouvellement et enrichissement",
      "Régénération naturelle assistée",
    ],
  },
  {
    id:"label-bas-carbone",
    nom:"Label bas-carbone forestier",
    acronyme:"LBC",
    type:"Financement carbone privé",
    organisme:"Ministère chargé de l'Écologie",
    origine:"Financeurs privés – marché carbone volontaire",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Avant fin 2026",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires","Porteurs de projets"],
    operationsEligibles:["Boisement","Reconstitution","Enrichissement","Régénération","Stockage carbone","Suivi peuplements vulnérables"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026 — Nouvelle méthode annoncée",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Nouvelle méthode permettant de financer l'enrichissement des peuplements vulnérables. Cahier des charges non encore publié.",
    couleur:"#065F46", bg:"#CCFBF1",
    icon:"🌿",
    fonctions:[
      "Unités carbone générées et vérifiées",
      "Financement par entreprises privées",
      "Suivi pluriannuel des peuplements",
      "Certification et contrôle tiers",
    ],
  },
  {
    id:"credits-biodiversite",
    nom:"Crédits biodiversité",
    acronyme:"CB",
    type:"Financement services écosystémiques",
    organisme:"À préciser",
    origine:"État – financeurs privés",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires","Collectivités","Porteurs de projets"],
    operationsEligibles:["Services écosystémiques","Habitats forestiers","Conservation","Restauration biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Calendrier non précisé. Structure générique à paramétrer à l'ouverture du dispositif.",
    couleur:"#92400E", bg:"#FEF3C7",
    icon:"🦋",
    fonctions:[
      "Services écosystémiques forestiers",
      "Habitats et indicateurs de biodiversité",
      "Engagements de conservation",
      "Contrôles et résultats pluriannuels",
    ],
  },
];

const WORKFLOW_FIN_STEPS = [
  {n:1,  label:"Projet identifié",              icon:"🔍", desc:"Identification de la parcelle et du besoin de restauration ou de renouvellement."},
  {n:2,  label:"Parcelle enregistrée",          icon:"📍", desc:"Enregistrement dans APPLITAG avec références cadastrales et coordonnées GPS."},
  {n:3,  label:"Diagnostic forestier",          icon:"🌲", desc:"Diagnostic sanitaire : essence, âge, dépérissement, nématode, risques climatiques, photos géolocalisées."},
  {n:4,  label:"Recherche des dispositifs",     icon:"🔎", desc:"Interrogation du moteur de règles pour identifier les programmes potentiellement compatibles."},
  {n:5,  label:"Pré-éligibilité",               icon:"✅", desc:"Vérification automatique des critères d'éligibilité principaux (localisation, bénéficiaire, surface, seuils)."},
  {n:6,  label:"Sélection du dispositif",       icon:"🎯", desc:"Choix du ou des programmes retenus par le porteur de projet."},
  {n:7,  label:"Construction du budget",        icon:"🧮", desc:"Saisie des postes de coûts, devis, essences, surfaces. Indicateur prévisionnel : 5 000 à 10 000 €/ha."},
  {n:8,  label:"Plan de financement",           icon:"💶", desc:"Répartition entre financeurs, calcul du reste à charge, simulation de scénarios."},
  {n:9,  label:"Collecte des pièces",           icon:"📎", desc:"Rassemblement des justificatifs requis : titre de propriété, cadastre, DGD, diagnostic, devis, RIB…"},
  {n:10, label:"Contrôle de complétude",        icon:"🔄", desc:"Vérification automatique des pièces obligatoires et signalement des manquantes."},
  {n:11, label:"Validation interne",            icon:"👁️", desc:"Contrôle par le gestionnaire forestier avant dépôt."},
  {n:12, label:"Dépôt",                         icon:"📤", desc:"Transmission du dossier à l'organisme instructeur."},
  {n:13, label:"Instruction",                   icon:"⚖️", desc:"Examen du dossier par l'instructeur. Délai en attente."},
  {n:14, label:"Demande de complément",         icon:"📬", desc:"L'instructeur demande des pièces supplémentaires ou des précisions."},
  {n:15, label:"Accord ou refus",               icon:"🏛️", desc:"Décision de l'organisme financeur. Montant accordé enregistré."},
  {n:16, label:"Autorisation de commencer",     icon:"🚦", desc:"L'autorisation de démarrer les travaux est reçue. Blocage si travaux prématurés."},
  {n:17, label:"Réalisation des travaux",       icon:"🪓", desc:"Exécution : plantation, régénération, sécurisation, préparation du sol, protection…"},
  {n:18, label:"Collecte des preuves",          icon:"📸", desc:"Photos géolocalisées avant/pendant/après, bons de livraison plants, fiches chantier."},
  {n:19, label:"Demande acompte/solde",         icon:"📄", desc:"Constitution de la demande de paiement avec dépenses présentées et justificatifs."},
  {n:20, label:"Contrôle",                      icon:"🔍", desc:"Contrôle par le financeur ou un contrôleur mandaté. Accès limité au dossier autorisé."},
  {n:21, label:"Paiement",                      icon:"💳", desc:"Versement de l'acompte ou du solde. Date et montant enregistrés dans le journal."},
  {n:22, label:"Suivi pluriannuel",             icon:"📅", desc:"Suivi de reprise, contrôle carbone ou biodiversité, obligations de conservation."},
  {n:23, label:"Clôture",                       icon:"✅", desc:"Validation de la bonne fin du projet par toutes les parties."},
  {n:24, label:"Archivage réglementaire",       icon:"🗄️", desc:"Conservation sécurisée des documents pendant la durée réglementaire. Journal d'audit non modifiable."},
];

const DEMO_DOSSIER = {
  id:"DOS-2026-001",
  programme:"France Forêt 2100 + Fonds vert",
  proprietaire:"M. Henri Bernard",
  parcelle:"Forêt de Tronçais — 12 ha — Allier (03)",
  surface:12,
  dateCreation:"22 juillet 2026",
  statut:"DIAGNOSTIC EN COURS",
  stepCurrent:3,
  montantDemande:96000,
  tauxDepVt:null,
  piecesManquantes:["Titre de propriété","Document de gestion durable","Devis entreprise"],
  piecesOk:["Diagnostic parcellaire (provisoire)","Références cadastrales","RIB"],
  alertes:[
    {type:"warning", msg:"Document de gestion durable manquant — obligatoire pour tous les programmes."},
    {type:"info",    msg:"Les programmes sélectionnés sont au statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucune demande de subvention déposable à ce jour."},
    {type:"info",    msg:"Indicateur prévisionnel : 5 000–10 000 €/ha, soit 60 000–120 000 € pour 12 ha. Modifiable."},
  ],
};

const CONTROLES_AUTO = [
  {statut:"ok",      msg:"Bénéficiaire identifié : propriétaire forestier privé — compatible tous programmes."},
  {statut:"ok",      msg:"Localisation : Forêt de Tronçais, Allier (03) — territoire national éligible."},
  {statut:"ok",      msg:"Surface : 12 ha — au-dessus du seuil minimal présumé."},
  {statut:"warning", msg:"Taux de dépérissement : non encore mesuré. Requis pour RF2027 (seuil 40 %)."},
  {statut:"warning", msg:"Nématode du pin : statut non vérifié sur cette parcelle."},
  {statut:"error",   msg:"Travaux non démarrés — autorisation préalable requise avant tout commencement (règle bloquante)."},
  {statut:"ok",      msg:"Aucun dépassement budgétaire détecté."},
  {statut:"warning", msg:"Document de gestion durable (DGD) absent — pièce obligatoire."},
  {statut:"info",    msg:"Règles réglementaires : statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Contrôles non bloquants jusqu'à publication des textes."},
];

const VEILLE_REG = [
  {
    date:"21 juillet 2026", type:"annonce", statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    titre:"Communiqué gouvernemental — Réunion Barbut / Lefèvre",
    programme:"Tous dispositifs forêt",
    contenu:"Annonce de France Forêt 2100, Fonds vert (100 M€), Renouvellement forestier, Label bas-carbone nouvelle méthode, Crédits biodiversité. Textes budgétaires et réglementaires à venir.",
    impact:"APPLITAG enregistre les 5 dispositifs en statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucun dossier ne peut être déposé.",
    icon:"📢", color:"#92400E", bg:"#FEF3C7",
  },
  {
    date:"21 juillet 2026", type:"info", statut:"info",
    titre:"Coût de restauration : indicateur prévisionnel",
    programme:"Tous dispositifs",
    contenu:"Le Gouvernement évalue le coût moyen de restauration entre 5 000 et 10 000 €/ha. Cet indicateur est intégré dans APPLITAG comme valeur modifiable, non comme barème réglementaire.",
    impact:"Indicateur prévisionnel disponible dans le module Budget. Modifiable par l'utilisateur.",
    icon:"📊", color:"#0369A1", bg:"#DBEAFE",
  },
  {
    date:"21 juillet 2026", type:"calendrier", statut:"info",
    titre:"Point d'étape gouvernemental prévu",
    programme:"Tous dispositifs",
    contenu:"Présentation des premiers engagements et résultats attendue en septembre 2026.",
    impact:"Surveillance programmée — mise à jour des dispositifs prévue à réception.",
    icon:"📅", color:"#065F46", bg:"#D1FAE5",
  },
];

/* Versionnement réglementaire — Aide au renouvellement forestier
   Décret 2025-05-02 annulé CE 15/07/2026 · Arrêté d'application survivant */
const RENOUVELLEMENT_VERSIONS = [
  {
    version:"v0.0",
    label:"Avant-décret",
    dateDebut:"2020",
    dateFin:"2025-04-30",
    statut:"EXPIRE",
    texte:"Régime antérieur — PSG / CBPS comme condition d'éligibilité",
    urlTexte:null,
    dateConsult:null,
    versionCahier:null,
    piecesCles:["PSG ou CBPS","Plan de reboisement","Devis travaux","Relevé parcellaire"],
    reservesJur:[],
    notes:"Régime de référence avant la réforme 2025.",
  },
  {
    version:"v1.0",
    label:"Décret du 2 mai 2025",
    dateDebut:"2025-05-02",
    dateFin:"2026-07-15",
    statut:"ANNULE",
    texte:"Décret n° 2025-XXX du 2 mai 2025 — annulé par le Conseil d'État le 15 juillet 2026",
    urlTexte:null,
    dateConsult:"Non réalisée — motif d'annulation",
    versionCahier:"v1.0 (2025)",
    piecesCles:["Plan de reboisement adapté au climat","Diagnostic sylvicole","Engagement de suivi 10 ans","Devis entrepreneur agréé"],
    reservesJur:[
      "Décret annulé CE 15/07/2026 faute de consultation préalable du public (art. L123-19-1 CE)",
      "L'arrêté d'application n'a pas été annulé — recours jugé tardif",
      "Les dossiers acceptés sous ce régime ne sont pas automatiquement annulés",
      "Ne pas utiliser les critères d'éligibilité de ce décret comme cadre définitif",
    ],
    notes:"ATTENTION — Ce texte a été annulé. L'arrêté d'application subsiste mais son champ d'application autonome est incertain.",
  },
  {
    version:"v1.1",
    label:"Arrêté d'application (survivant)",
    dateDebut:"2026-07-15",
    dateFin:null,
    statut:"SUSPENDU",
    texte:"Arrêté d'application du 2 mai 2025 — non annulé (recours tardif)",
    urlTexte:null,
    dateConsult:null,
    versionCahier:"v1.0 (2025) — portée à confirmer",
    piecesCles:["À confirmer par le ministère"],
    reservesJur:[
      "Portée autonome de l'arrêté sans son décret-support incertaine — avis juridique recommandé",
      "Guichet classé SUSPENDU par le ministère de l'Agriculture",
      "Aucun dépôt conseillé avant clarification officielle",
    ],
    notes:"Situation intermédiaire au 22/07/2026. En attente d'un nouveau décret de base ou d'une clarification ministérielle.",
  },
  {
    version:"v2.0",
    label:"Nouveau cadre (attendu)",
    dateDebut:null,
    dateFin:null,
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    texte:"Nouveau décret à venir — annonce SNBC 3 / Plan forêt 2026",
    urlTexte:null,
    dateConsult:"À prévoir — consultation publique obligatoire",
    versionCahier:"À publier",
    piecesCles:["À définir par le nouveau texte"],
    reservesJur:[
      "Aucune règle d'éligibilité du régime annulé ne doit être appliquée par anticipation",
      "Objectif SNBC 3 : renouveler 10 % des forêts françaises d'ici 2032",
      "Zones prioritaires : dépérissantes et DFCI",
    ],
    notes:"APPLITAG est techniquement prêt. Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre.",
  },
];

const STATUT_VERSION_COLORS = {
  EXPIRE:                      {color:"#374151",bg:"#E5E7EB",label:"Expiré"},
  ANNULE:                      {color:"#991B1B",bg:"#FEE2E2",label:"Annulé CE"},
  SUSPENDU:                    {color:"#B45309",bg:"#FEF3C7",label:"Suspendu"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {color:"#92400E",bg:"#FEF9C3",label:"Attendu"},
  OUVERT:                      {color:"#065F46",bg:"#D1FAE5",label:"Ouvert"},
};

export const SectionFinancements = () => {
  const [tab, setTab] = useState("dashboard");
  const [selProg, setSelProg] = useState(null);
  const [wfStep, setWfStep] = useState(3);
  const [selVersion, setSelVersion] = useState("v1.1");
  // Champs dossier versionnés
  const [dossDispo,      setDossDispo]      = useState("Aide au renouvellement des forêts");
  const [dossTexte,      setDossTexte]      = useState("");
  const [dossDateConsult,setDossDateConsult]= useState("");
  const [dossVersionCah, setDossVersionCah] = useState("");
  const [dossDateDepot,  setDossDateDepot]  = useState("");
  const [dossPieces,     setDossPieces]     = useState("");
  const [dossDecision,   setDossDecision]   = useState("");
  const [dossReserves,   setDossReserves]   = useState("");

  const prog = selProg ? FUNDING_PROGRAMS.find(p=>p.id===selProg) : null;

  const TABS = [
    {id:"dashboard",   label:"Tableau de bord", icon:"📊"},
    {id:"programmes",  label:"Programmes",       icon:"📋"},
    {id:"dossiers",    label:"Dossiers",          icon:"📂"},
    {id:"workflow",    label:"Workflow",          icon:"🔄"},
    {id:"veille",           label:"Veille réglementaire",  icon:"⚖️"},
    {id:"renouvellement",   label:"Renouvellement forestier", icon:"🌲"},
  ];

  const SR = (s) => STATUT_REG[s] || STATUT_REG.BROUILLON;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,
            background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:20,
            padding:"3px 12px",fontSize:10,fontWeight:800,color:"#92400E",marginBottom:8}}>
            📢 ANNONCE GOUVERNEMENTALE — 21 juillet 2026
          </div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            💶 Financements & Restauration forestière
          </div>
          <div style={{fontSize:12,color:C.tx2}}>
            5 dispositifs enregistrés · Statut : <span style={{fontWeight:700,color:"#92400E"}}>ANNONCÉ – textes attendus</span> · Aucun dossier déposable à ce jour
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
          {[["1 Md€","Fonds vert total"],["100 M€","Forêt (annoncé)"],["5–10k€/ha","Coût prévisionnel"]].map(([v,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:8,
              background:"#fff",border:`1px solid ${C.bd}`,borderRadius:10,
              padding:"5px 12px",fontSize:11}}>
              <span style={{fontWeight:800,color:"#0369A1"}}>{v}</span>
              <span style={{color:C.tx2}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerte ANNONCÉ */}
      <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:10,
        padding:"10px 16px",marginBottom:16,fontSize:12,color:"#92400E",
        display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
        <div>
          <strong>Principe réglementaire APPLITAG :</strong> Aucun taux, plafond ou règle réglementaire n'est inscrit définitivement dans l'application.
          Toutes les règles sont paramétrables, datées, versionnées et rattachées à un texte officiel.
          Les dispositifs du 21 juillet 2026 sont au statut <strong>ANNONCÉ_EN_ATTENTE_DE_TEXTE</strong> — ils seront mis à jour à la publication des décrets et cahiers des charges.
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:`2px solid ${tab===t.id?"#0369A1":C.bd}`,
              background:tab===t.id?"#0369A1":"#fff",color:tab===t.id?"#fff":C.tx2}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TABLEAU DE BORD ── */}
      {tab==="dashboard"&&(()=>{
        const alertCount = DEMO_DOSSIER.alertes.length;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {icon:"📋",label:"Programmes enregistrés",val:"5",sub:"Tous ANNONCÉ",col:"#0369A1",bg:"#DBEAFE"},
                {icon:"📂",label:"Dossiers en cours",val:"1",sub:"Diagnostic phase",col:"#1E5B3A",bg:"#D1FAE5"},
                {icon:"⚠️",label:"Alertes actives",val:String(alertCount),sub:"dont 1 bloquant",col:"#92400E",bg:"#FEF3C7"},
                {icon:"💶",label:"Investissement prév.",val:"96 k€",sub:"Indicateur 12 ha",col:"#065F46",bg:"#CCFBF1"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:k.col}}>{k.val}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:2}}>{k.label}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Contrôles automatiques */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🤖 Moteur de contrôles automatiques — Dossier DOS-2026-001</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {CONTROLES_AUTO.map((c,i)=>{
                  const cfg = c.statut==="ok"
                    ? {icon:"✅",col:"#065F46",bg:"#F0FDF4"}
                    : c.statut==="warning"
                    ? {icon:"⚠️",col:"#92400E",bg:"#FFFBEB"}
                    : c.statut==="error"
                    ? {icon:"🔴",col:"#991B1B",bg:"#FEF2F2"}
                    : {icon:"ℹ️",col:"#0369A1",bg:"#EFF6FF"};
                  return (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                      padding:"8px 12px",borderRadius:8,background:cfg.bg,
                      border:`1px solid ${cfg.col}22`}}>
                      <span style={{flexShrink:0,fontSize:13}}>{cfg.icon}</span>
                      <span style={{fontSize:11,color:cfg.col,fontWeight:c.statut==="error"?700:400}}>{c.msg}</span>
                      <span style={{marginLeft:"auto",fontSize:9,color:C.tx2,flexShrink:0,
                        background:"#fff",padding:"1px 6px",borderRadius:10,border:`1px solid ${C.bd}`}}>
                        {c.statut==="ok"?"OK":c.statut==="error"?"BLOQUANT":c.statut==="warning"?"AVERTISSEMENT":"INFO"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertes dossier */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🔔 Alertes — DOS-2026-001</div>
              {DEMO_DOSSIER.alertes.map((a,i)=>{
                const cfg = a.type==="warning"
                  ? {col:"#92400E",bg:"#FFFBEB",icon:"⚠️"}
                  : {col:"#0369A1",bg:"#EFF6FF",icon:"ℹ️"};
                return (
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                    padding:"9px 12px",borderRadius:8,background:cfg.bg,
                    border:`1px solid ${cfg.col}22`,marginBottom:6}}>
                    <span style={{flexShrink:0}}>{cfg.icon}</span>
                    <span style={{fontSize:12,color:cfg.col}}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── PROGRAMMES ── */}
      {tab==="programmes"&&(
        <div style={{display:"grid",gridTemplateColumns:selProg?"1fr 380px":"1fr",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {FUNDING_PROGRAMS.map(p=>{
              const sr = SR(p.statut);
              const isActive = selProg===p.id;
              return (
                <div key={p.id} onClick={()=>setSelProg(isActive?null:p.id)}
                  style={{background:"#fff",borderRadius:12,border:`2px solid ${isActive?p.couleur:C.bd}`,
                    padding:16,cursor:"pointer",boxShadow:isActive?`0 0 0 3px ${p.bg}`:"none",
                    transition:"all .2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                      <span style={{fontSize:28,flexShrink:0}}>{p.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:800,color:isActive?p.couleur:C.tx}}>{p.nom}</span>
                          <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:sr.bg,color:sr.color}}>{sr.label}</span>
                          <span style={{fontSize:9,color:C.tx2,background:"#F3F4F6",
                            padding:"2px 6px",borderRadius:6}}>{p.acronyme}</span>
                        </div>
                        <div style={{fontSize:11,color:C.tx2,marginBottom:6}}>{p.type} · {p.organisme}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {p.operationsEligibles.slice(0,3).map((o,i)=>(
                            <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                              background:p.bg,color:p.couleur,fontWeight:600}}>{o}</span>
                          ))}
                          {p.operationsEligibles.length>3&&(
                            <span style={{fontSize:10,color:C.tx2}}>+{p.operationsEligibles.length-3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:C.tx2}}>Annoncé le</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{p.dateAnnonce}</div>
                      <div style={{fontSize:10,color:C.tx2,marginTop:4}}>Ouverture</div>
                      <div style={{fontSize:11,fontWeight:700,color:p.dateOuverture?"#0369A1":"#9CA3AF"}}>
                        {p.dateOuverture||"Non précisée"}
                      </div>
                    </div>
                  </div>
                  {isActive&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${p.couleur}22`}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:6,textTransform:"uppercase"}}>Fonctions prévues</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                        {p.fonctions.map((f,i)=>(
                          <span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:7,
                            background:p.bg,color:p.couleur,fontWeight:500,
                            border:`1px solid ${p.couleur}33`}}>🔹 {f}</span>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:"#92400E",background:"#FEF3C7",
                        border:"1px solid #F59E0B",borderRadius:8,padding:"8px 12px"}}>
                        ⚠️ {p.notes}
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                        <div style={{fontSize:10,color:C.tx2}}>Texte de référence :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.texteRef}</div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <div style={{fontSize:10,color:C.tx2}}>Version :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.version}</div>
                        <div style={{fontSize:10,color:C.tx2,marginLeft:12}}>Vérif. :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.derniereVerif}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selProg&&prog&&(
            <div style={{position:"sticky",top:0}}>
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                <div style={{background:prog.bg,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:24,marginBottom:4}}>{prog.icon}</div>
                  <div style={{fontSize:15,fontWeight:900,color:prog.couleur}}>{prog.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{prog.type}</div>
                </div>

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Bénéficiaires</div>
                {prog.beneficiaires.map((b,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>•</span>{b}
                  </div>
                ))}

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginTop:12,marginBottom:8}}>Opérations éligibles</div>
                {prog.operationsEligibles.map((o,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>✓</span>{o}
                  </div>
                ))}

                <div style={{marginTop:14,padding:"10px 12px",borderRadius:8,
                  background:"#F9FAFB",border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Paramétrage réglementaire</div>
                  {[
                    ["Taux min/max","Non publié"],
                    ["Plafond","Non publié"],
                    ["Montant national",prog.montantNational||"Non publié"],
                    ["URL officielle","Connecteur désactivé"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",
                      fontSize:10,padding:"3px 0",borderBottom:`1px solid ${C.bd}`}}>
                      <span style={{color:C.tx2}}>{k}</span>
                      <span style={{fontWeight:700,color:v==="Non publié"?"#9CA3AF":C.tx}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSSIERS ── */}
      {tab==="dossiers"&&(
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
          {/* Liste dossiers */}
          <div>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:12,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>Dossiers actifs</div>
              <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
                border:"2px solid #0369A1",cursor:"pointer"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#0369A1",marginBottom:4}}>{DEMO_DOSSIER.id}</div>
                <div style={{fontSize:11,color:C.tx,marginBottom:3}}>{DEMO_DOSSIER.proprietaire}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:6}}>{DEMO_DOSSIER.parcelle}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#0369A1",
                    background:"#DBEAFE",padding:"2px 8px",borderRadius:10}}>
                    {DEMO_DOSSIER.statut}
                  </span>
                  <span style={{fontSize:10,fontWeight:700,color:"#1E5B3A"}}>
                    {DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} €
                  </span>
                </div>
              </div>
            </div>
            {/* Pièces */}
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>📎 Pièces justificatives</div>
              <div style={{fontSize:10,fontWeight:700,color:"#065F46",marginBottom:6}}>Fournies</div>
              {DEMO_DOSSIER.piecesOk.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#065F46",padding:"3px 0"}}>
                  <span>✅</span>{p}
                </div>
              ))}
              <div style={{fontSize:10,fontWeight:700,color:"#991B1B",marginTop:10,marginBottom:6}}>Manquantes</div>
              {DEMO_DOSSIER.piecesManquantes.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#991B1B",padding:"3px 0"}}>
                  <span>❌</span>{p}
                </div>
              ))}
            </div>
          </div>

          {/* Détail dossier */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:4}}>
                📂 {DEMO_DOSSIER.id} — {DEMO_DOSSIER.proprietaire}
              </div>
              <div style={{fontSize:12,color:C.tx2,marginBottom:12}}>{DEMO_DOSSIER.parcelle} · {DEMO_DOSSIER.surface} ha</div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  ["Programme","France Forêt 2100 + Fonds vert"],
                  ["Créé le",DEMO_DOSSIER.dateCreation],
                  ["Investissement prévi.",`${DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} € (indicateur)`],
                  ["Étape en cours",`${DEMO_DOSSIER.stepCurrent}/24 — Diagnostic forestier`],
                ].map(([k,v])=>(
                  <div key={k} style={{padding:"8px 12px",borderRadius:8,background:"#F9FAFB",
                    border:`1px solid ${C.bd}`}}>
                    <div style={{fontSize:10,color:C.tx2,marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Budget prévisionnel */}
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Budget prévisionnel par poste (indicateur 5 000–10 000 €/ha)</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {[
                  ["Diagnostic & maîtrise d'œuvre","8 400 €",8.75],
                  ["Préparation du sol","12 000 €",12.5],
                  ["Plants & plantation","36 000 €",37.5],
                  ["Protection & entretien","18 000 €",18.75],
                  ["Sécurisation & accès","9 600 €",10],
                  ["Suivi & certification","12 000 €",12.5],
                ].map(([p,v,pct])=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:10,color:C.tx2,width:160,flexShrink:0}}>{p}</div>
                    <div style={{flex:1,height:14,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:"#0369A1",width:`${pct}%`}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:"#0369A1",width:64,textAlign:"right",flexShrink:0}}>{v}</div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,
                  borderTop:`2px solid ${C.bd}`,paddingTop:6,marginTop:4}}>
                  <span style={{color:C.tx}}>Total indicatif</span>
                  <span style={{color:"#0369A1"}}>96 000 €</span>
                </div>
              </div>

              <div style={{marginTop:10,fontSize:10,color:"#92400E",
                background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:6,padding:"6px 10px"}}>
                ⚠️ Ces montants sont des indicateurs prévisionnels modifiables. Aucun taux réglementaire confirmé à ce stade.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:14,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              🔄 Workflow — 24 étapes — DOS-2026-001 (étape {wfStep}/24)
            </div>
            {/* Mini stepper horizontal */}
            <div style={{display:"flex",overflowX:"auto",gap:2,paddingBottom:8}}>
              {WORKFLOW_FIN_STEPS.map((s,_i)=>(
                <div key={s.n} onClick={()=>setWfStep(s.n)}
                  style={{flexShrink:0,width:32,height:32,borderRadius:"50%",cursor:"pointer",
                    background:s.n<wfStep?"#1E5B3A":s.n===wfStep?"#0369A1":"#E5E7EB",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:s.n===wfStep?13:10,color:s.n<=wfStep?"#fff":"#9CA3AF",
                    fontWeight:700,transition:"all .2s",
                    boxShadow:s.n===wfStep?"0 0 0 3px #BFDBFE":undefined}}>
                  {s.n<wfStep?"✓":s.n===wfStep?s.icon:s.n}
                </div>
              ))}
            </div>
          </div>

          {/* Étape courante */}
          {(()=>{
            const cur = WORKFLOW_FIN_STEPS[wfStep-1];
            const isDone = wfStep > DEMO_DOSSIER.stepCurrent;
            const isCur = wfStep === DEMO_DOSSIER.stepCurrent;
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
                  <div style={{background:isCur?"#EFF6FF":isDone?"#F0FDF4":"#F9FAFB",
                    borderBottom:`1px solid ${isCur?"#93C5FD":isDone?"#86EFAC":C.bd}`,
                    padding:"14px 18px",display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:12,
                      background:isCur?"#0369A1":isDone?"#1E5B3A":"#E5E7EB",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:22,flexShrink:0}}>
                      {cur.icon}
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:900,color:isCur?"#0369A1":isDone?"#1E5B3A":C.tx2}}>
                          Étape {cur.n} — {cur.label}
                        </span>
                        <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:isCur?"#DBEAFE":isDone?"#D1FAE5":"#E5E7EB",
                          color:isCur?"#0369A1":isDone?"#065F46":"#6B7280"}}>
                          {isCur?"EN COURS":isDone?"À VENIR":"COMPLÉTÉ"}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:3}}>DOS-2026-001 · {DEMO_DOSSIER.proprietaire}</div>
                    </div>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <div style={{fontSize:13,color:C.tx,lineHeight:1.7,marginBottom:14}}>{cur.desc}</div>
                    {isCur&&(
                      <div style={{background:"#EFF6FF",border:"1px solid #93C5FD",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#0369A1"}}>
                        📌 Cette étape est actuellement en cours pour le dossier DOS-2026-001. Toute action est datée et inscrite dans le journal d'audit.
                      </div>
                    )}
                    {!isCur&&!isDone&&(
                      <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#065F46"}}>
                        ✅ Étape complétée — inscrite dans le journal d'audit non modifiable.
                      </div>
                    )}
                    {isDone&&(
                      <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:C.tx2}}>
                        🔒 Étape non encore atteinte. Accessible après validation des étapes précédentes.
                      </div>
                    )}
                  </div>
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"10px 18px",
                    display:"flex",justifyContent:"space-between"}}>
                    <button onClick={()=>setWfStep(s=>Math.max(1,s-1))} disabled={wfStep===1}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:`1px solid ${C.bd}`,background:"transparent",
                        color:wfStep===1?"#D1D5DB":C.tx2,opacity:wfStep===1?.4:1}}>
                      ← Précédent
                    </button>
                    <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>{wfStep}/24</span>
                    <button onClick={()=>setWfStep(s=>Math.min(24,s+1))} disabled={wfStep===24}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:"none",background:"#0369A1",color:"#fff",
                        opacity:wfStep===24?.4:1}}>
                      Suivant →
                    </button>
                  </div>
                </div>

                {/* Liste des étapes */}
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
                  padding:14,maxHeight:480,overflowY:"auto"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Toutes les étapes</div>
                  {WORKFLOW_FIN_STEPS.map(s=>{
                    const done = s.n < DEMO_DOSSIER.stepCurrent;
                    const cur2 = s.n === DEMO_DOSSIER.stepCurrent;
                    return (
                      <div key={s.n} onClick={()=>setWfStep(s.n)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                          borderRadius:7,cursor:"pointer",marginBottom:2,
                          background:wfStep===s.n?"#EFF6FF":"transparent",
                          border:`1px solid ${wfStep===s.n?"#93C5FD":"transparent"}`}}>
                        <span style={{fontSize:11,flexShrink:0}}>{done?"✅":cur2?"🔵":"⬜"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontSize:10,color:done?"#065F46":cur2?"#0369A1":C.tx2,
                            fontWeight:cur2?700:400}}>
                            {s.n}. {s.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VEILLE RÉGLEMENTAIRE ── */}
      {tab==="veille"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx}}>⚖️ Veille réglementaire — Financements forestiers</div>
            <div style={{fontSize:11,color:C.tx2}}>Dernière mise à jour : 21 juillet 2026</div>
          </div>

          {VEILLE_REG.map((v,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,
              border:`1px solid ${v.color}33`,overflow:"hidden"}}>
              <div style={{background:v.bg,borderBottom:`1px solid ${v.color}22`,
                padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:24,flexShrink:0}}>{v.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:v.color}}>{v.titre}</span>
                    {v.statut!=="info"&&(
                      <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:SR(v.statut).bg,color:SR(v.statut).color}}>
                        {SR(v.statut).label}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>📅 {v.date} · {v.programme}</div>
                </div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:12,color:C.tx,lineHeight:1.7,marginBottom:10}}>{v.contenu}</div>
                <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                  padding:"8px 12px",fontSize:11,color:C.tx2}}>
                  <strong style={{color:v.color}}>Impact APPLITAG :</strong> {v.impact}
                </div>
              </div>
            </div>
          ))}

          {/* Statuts réglementaires */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Statuts réglementaires APPLITAG
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {Object.entries(STATUT_REG).map(([k,v])=>(
                <div key={k} style={{padding:"8px 12px",borderRadius:8,
                  background:v.bg,border:`1px solid ${v.color}33`,
                  display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:9,fontWeight:800,color:v.color,fontFamily:"monospace"}}>{k}</div>
                    <div style={{fontSize:10,color:C.tx2}}>{v.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RENOUVELLEMENT FORESTIER ── */}
      {tab==="renouvellement"&&(()=>{
        const vSel = RENOUVELLEMENT_VERSIONS.find(v=>v.version===selVersion)
                     || RENOUVELLEMENT_VERSIONS[2];
        const sc   = STATUT_VERSION_COLORS[vSel.statut] || STATUT_VERSION_COLORS.SUSPENDU;
        const inputSt = {
          width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
          border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
          background:C.bg,color:C.tx,boxSizing:"border-box",
        };
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière alerte juridique */}
            <div style={{background:"#FEE2E2",border:"2px solid #F87171",borderRadius:12,
              padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>⚖️</span>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:"#991B1B",marginBottom:4}}>
                  Guichet juridiquement fragilisé — Conseil d'État, 15 juillet 2026
                </div>
                <div style={{fontSize:12,color:"#991B1B",lineHeight:1.7}}>
                  Le décret du 2 mai 2025 encadrant l'aide au renouvellement des forêts privées
                  et des collectivités a été <strong>annulé</strong> faute de consultation préalable du public.
                  L'arrêté d'application subsiste (recours tardif), mais le guichet est classé
                  <strong> SUSPENDU</strong> par le ministère de l'Agriculture.
                  Un nouveau décret est attendu dans le cadre de la SNBC 3.
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:"#fff",borderRadius:8,
                  fontSize:11,color:"#7F1D1D",fontStyle:"italic",lineHeight:1.6,
                  border:"1px solid #FECACA"}}>
                  📋 <strong>Formulation recommandée dans vos propositions :</strong><br/>
                  « Projet techniquement préparé, sous réserve de l'ouverture du guichet et du cadre
                  réglementaire applicable à la date du dépôt. »
                </div>
              </div>
            </div>

            {/* Chronologie des versions */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
                📜 Historique réglementaire — Versionnement APPLITAG
              </div>
              <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
                {RENOUVELLEMENT_VERSIONS.map((v,i)=>{
                  const sc2 = STATUT_VERSION_COLORS[v.statut]||STATUT_VERSION_COLORS.SUSPENDU;
                  const sel = selVersion===v.version;
                  return (
                    <div key={v.version} style={{display:"flex",alignItems:"stretch",flexShrink:0}}>
                      {i>0&&<div style={{width:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:24,height:2,background:C.bd}}/>
                      </div>}
                      <div onClick={()=>setSelVersion(v.version)} style={{
                        borderRadius:10,border:`2px solid ${sel?sc2.color:C.bd}`,
                        background:sel?sc2.bg:"#fff",padding:"10px 14px",cursor:"pointer",
                        minWidth:140,WebkitTapHighlightColor:"transparent"}}>
                        <div style={{fontSize:9,fontWeight:800,color:sc2.color,marginBottom:3,
                          background:sc2.bg,display:"inline-block",padding:"1px 6px",
                          borderRadius:8,border:`1px solid ${sc2.color}44`}}>
                          {sc2.label}
                        </div>
                        <div style={{fontSize:12,fontWeight:800,color:sel?sc2.color:C.tx,marginTop:4}}>
                          {v.version}
                        </div>
                        <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{v.label}</div>
                        <div style={{fontSize:9,color:C.tx3,marginTop:2}}>
                          {v.dateDebut}{v.dateFin?` → ${v.dateFin}`:" → en cours"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fiche version sélectionnée */}
            <div style={{background:"#fff",borderRadius:12,border:`2px solid ${sc.color}44`,overflow:"hidden"}}>
              <div style={{background:sc.bg,padding:"12px 16px",borderBottom:`1px solid ${sc.color}22`,
                display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:sc.color}}>{vSel.label}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{vSel.texte}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:20,
                  background:sc.color,color:"#fff"}}>{sc.label}</span>
              </div>
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                {vSel.reservesJur.length>0&&(
                  <div style={{background:"#FEF2F2",borderRadius:8,padding:"10px 12px",border:"1px solid #FECACA"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>🚫 Réserves juridiques</div>
                    {vSel.reservesJur.map((r,i)=>(
                      <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"3px 0",
                        borderBottom:i<vSel.reservesJur.length-1?`1px solid #FECACA`:"none",lineHeight:1.6}}>
                        • {r}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>📋 Pièces exigées</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {vSel.piecesCles.map((p,i)=>(
                      <span key={i} style={{fontSize:10,padding:"4px 10px",borderRadius:20,
                        background:C.bg2,border:`1px solid ${C.bd}`,color:C.tx2}}>{p}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["📅 Consultation publique","dateConsult"],["📄 Version cahier","versionCahier"]]
                    .filter(([,k])=>vSel[k])
                    .map(([lbl,k])=>(
                      <div key={k} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{vSel[k]}</div>
                      </div>
                  ))}
                </div>
                {vSel.notes&&(
                  <div style={{background:"#FFFBEB",borderRadius:8,padding:"8px 12px",
                    border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
                    📝 {vSel.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Dossier — champs versionnés */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>📂 Suivi de dossier — champs versionnés</div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Rattaché à la version réglementaire {selVersion}.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Dispositif",              dossDispo,      setDossDispo,      "Aide au renouvellement…"],
                  ["Texte applicable retenu", dossTexte,      setDossTexte,      "Décret / Arrêté…"],
                  ["Date consultation publie",dossDateConsult,setDossDateConsult,"JJ/MM/AAAA"],
                  ["Version cahier des charges",dossVersionCah,setDossVersionCah,"v1.0 — 2025…"],
                  ["Date de dépôt prévu",     dossDateDepot,  setDossDateDepot,  "JJ/MM/AAAA"],
                  ["Décision obtenue",        dossDecision,   setDossDecision,   "En attente / Accordé / Refusé…"],
                ].map(([lbl,val,set,ph])=>(
                  <div key={lbl}>
                    <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{lbl}</div>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={inputSt}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pièces exigées (personnalisées)</div>
                <textarea value={dossPieces} onChange={e=>setDossPieces(e.target.value)}
                  rows={3} placeholder="Une pièce par ligne…" style={{...inputSt,resize:"vertical"}}/>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:4}}>🚫 Réserves juridiques propres à ce dossier</div>
                <textarea value={dossReserves} onChange={e=>setDossReserves(e.target.value)}
                  rows={3} placeholder="Ex : dossier déposé sous décret v1.0 — statut à confirmer…"
                  style={{...inputSt,resize:"vertical",borderColor:"#FECACA"}}/>
              </div>
            </div>

            {/* Objectifs SNBC 3 */}
            <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",borderRadius:12,
              padding:"14px",border:"1.5px solid #6EE7B7"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>🎯 Objectifs SNBC 3 — Ambition nationale</div>
              {[
                ["10 %","des forêts françaises à renouveler/adapter d'ici 2032","Zones dépérissantes et DFCI en priorité"],
                ["−39 MtCO₂e","Rôle d'absorption forêt-bois maintenu en 2030","Objectif puits de carbone SNBC 3"],
                ["2032","Échéance du plan de renouvellement","Objectif politique confirmé, guichet à sécuriser"],
              ].map(([val,lbl,det])=>(
                <div key={val} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                  borderRadius:8,background:"#fff",border:"1px solid #A7F3D0",marginBottom:6}}>
                  <div style={{fontSize:18,fontWeight:900,color:"#065F46",minWidth:100,flexShrink:0}}>{val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{det}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,padding:"10px 12px",background:"#fff",borderRadius:8,
                border:"1px solid #A7F3D0",fontSize:11,color:"#065F46",lineHeight:1.6}}>
                🛠️ <strong>Statut APPLITAG :</strong> Module techniquement prêt.
                Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre réglementaire.
              </div>
            </div>

            {/* Risques */}
            <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",border:"1.5px solid #FED7AA"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>⚠️ Risques à éviter</div>
              {[
                ["Promettre une subvention aujourd'hui indisponible",
                 "Le guichet est SUSPENDU. Ne pas indiquer un taux ou montant comme acquis."],
                ["Utiliser les critères du décret annulé",
                 "Le décret du 2 mai 2025 a été annulé. Ses critères ne font plus référence."],
                ["Engager des travaux avant décision attributive",
                 "Sans acte attributif valide, les dépenses engagées ne sont pas remboursables."],
                ["Conclure que les dossiers acceptés sont annulés",
                 "Le CE n'a pas annulé les décisions individuelles — analyser cas par cas."],
              ].map(([titre,detail])=>(
                <div key={titre} style={{display:"flex",gap:10,padding:"8px 0",
                  borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{titre}</div>
                    <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}
    </div>
  );
};

// ── CONFORMITÉ RED — DONNÉES & HELPERS ─────────────────────────
const STATUT_FOURN_RED = {
  valide:    {label:"Valide",     color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  expire:    {label:"Expiré",    color:"#991B1B", bg:"#FEE2E2", icon:"❌"},
  incomplet: {label:"Incomplet", color:"#92400E", bg:"#FEF3C7", icon:"⚠️"},
  a_auditer: {label:"À auditer", color:"#1E40AF", bg:"#DBEAFE", icon:"🔵"},
};

const PERIMETRE_RED_OPTS = [
  {id:"bois_forestier", label:"Bois forestier"},
  {id:"residus",        label:"Résidus forestiers"},
  {id:"connexes",       label:"Connexes de scierie"},
  {id:"dechets_bois",   label:"Déchets bois"},
  {id:"plaquettes",     label:"Plaquettes forestières"},
  {id:"bois_rond",      label:"Bois rond"},
];

const CHAINE_ETAPES = [
  {id:"lot_forestier",  label:"Lot forestier identifié",    icon:"🌲"},
  {id:"bord_route",     label:"Tas bord de route",           icon:"🪵"},
  {id:"broyage",        label:"Broyage / déchiquetage",      icon:"🌀"},
  {id:"entree_plat",    label:"Entrée plateforme",           icon:"🏗️"},
  {id:"stockage",       label:"Stockage",                    icon:"📦"},
  {id:"melange",        label:"Mélange éventuel",            icon:"🔀"},
  {id:"chargement",     label:"Chargement camion",           icon:"🚛"},
  {id:"transport",      label:"Transport",                   icon:"🛣️"},
  {id:"livraison",      label:"Livraison chaufferie",        icon:"🔥"},
  {id:"reception",      label:"Réception / pesée / humidité",icon:"⚖️"},
];


/* ═══════════════════════════════════════════════════════════════
   MODULE DESSERTE FORESTIÈRE
═══════════════════════════════════════════════════════════════ */
const PORTANCE_OPTS = [
  {v:"legere",  l:"Légère (< 10 t)", col:"#065F46", bg:"#D1FAE5"},
  {v:"normale", l:"Normale (10–19 t)",col:"#1E40AF", bg:"#DBEAFE"},
  {v:"renforcee",l:"Renforcée (≥ 19 t)",col:"#7C3AED",bg:"#EDE9FE"},
];
const ACCES_INCENDIE_OPTS = ["Oui — accès DFCI conforme","Oui — à améliorer","Non — hors périmètre","Non — à créer"];
const DEMO_TRONCONS = [
  {
    id:"TRC-001", nom:"Chemin des Battets — section nord",
    type:"existant", proprietaire:"Commune de Tronçais",
    parcelles:["B 112","B 113","B 114"], surface:12.5,
    portance:"renforcee", largeur:4.5, pentePct:8,
    placeDepot:true, retournement:true, accesIncendie:"Oui — accès DFCI conforme",
    tonnageMobilisable:320, volumeMobilisable:480,
    coutProjet:0, travaux:"Entretien fossés 2024",
    photos:2, statut:"operationnel",
    lat:46.51, lng:2.89,
  },
  {
    id:"TRC-002", nom:"Piste de la Corniche — prolongement",
    type:"a_creer", proprietaire:"Syndicat forestier Allier",
    parcelles:["C 218","C 219"], surface:8.2,
    portance:"normale", largeur:3.5, pentePct:14,
    placeDepot:false, retournement:false, accesIncendie:"Non — à créer",
    tonnageMobilisable:180, volumeMobilisable:270,
    coutProjet:42000, travaux:"",
    photos:0, statut:"projet",
    lat:46.49, lng:2.91,
  },
  {
    id:"TRC-003", nom:"Route de la Biche — section sud",
    type:"existant", proprietaire:"Propriétaire privé",
    parcelles:["A 034"], surface:3.8,
    portance:"legere", largeur:2.8, pentePct:6,
    placeDepot:true, retournement:false, accesIncendie:"Oui — à améliorer",
    tonnageMobilisable:85, volumeMobilisable:120,
    coutProjet:8500, travaux:"Élargissement 2025 prévu",
    photos:1, statut:"a_ameliorer",
  },
];
const STATUT_TRONCON = {
  operationnel:  {l:"Opérationnel",   col:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_ameliorer:   {l:"À améliorer",    col:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  projet:        {l:"Projet",         col:"#7C3AED", bg:"#EDE9FE", icon:"📐"},
  ferme:         {l:"Fermé / interdit",col:"#991B1B",bg:"#FEE2E2", icon:"🚫"},
};

// ── APPLITAG DATA — SIGNALEMENTS ANOMALIES DESSERTES ─────────────
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };
const signalementsSet = (arr) => { try { localStorage.setItem(SIGNALEMENTS_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

const TYPES_ANOMALIE = [
  {id:"orniere",     label:"Ornières / nids-de-poule",  icon:"🕳️", urgence:"orange"},
  {id:"ravinement",  label:"Ravinement",                icon:"🌊", urgence:"orange"},
  {id:"arbre_tombe", label:"Arbre tombé",               icon:"🌳", urgence:"rouge"},
  {id:"vegetation",  label:"Végétation envahissante",   icon:"🌿", urgence:"jaune"},
  {id:"pont_buse",   label:"Pont / buse dégradé",       icon:"🌉", urgence:"rouge"},
  {id:"largeur",     label:"Largeur insuffisante",      icon:"↔️", urgence:"orange"},
  {id:"fosse",       label:"Fossé bouché / débordement",icon:"💧", urgence:"orange"},
  {id:"affaissement",label:"Affaissement de chaussée",  icon:"⬇️", urgence:"rouge"},
  {id:"glissement",  label:"Glissement de terrain",     icon:"⛰️", urgence:"rouge"},
  {id:"barriere",    label:"Barrière bloquée / cassée", icon:"🚧", urgence:"orange"},
  {id:"signalisation",label:"Signalisation manquante",  icon:"🪧", urgence:"jaune"},
  {id:"incendie",    label:"Traces d'incendie",         icon:"🔥", urgence:"rouge"},
  {id:"autre",       label:"Autre",                     icon:"❓", urgence:"jaune"},
];
const URGENCES = {
  rouge:  {label:"Urgent — accès bloqué",   col:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  orange: {label:"Dégradation notable",     col:"#C2410C", bg:"#FFEDD5", icon:"🟠"},
  jaune:  {label:"Signalement préventif",   col:"#92400E", bg:"#FEF3C7", icon:"🟡"},
};
const SOURCES_PROFIL = [
  "Opérateur terrain","Propriétaire forestier","ETF","Expert forestier","Mandataire",
  "Conducteur de travaux","Chauffeur transport","Collectivité","Administration","Autre",
];

const DEMO_SIGNALEMENTS = [
  {id:"sg1",createdAt:"2026-08-05T07:12:00Z",auteur:"Martin Dupont",profil:"Opérateur terrain",
   tronconId:"TRC-003",tronconNom:"Route de la Biche — section sud",
   type:"arbre_tombe",urgence:"rouge",commentaire:"Chêne traversant la piste sur 50 m, passage impossible.",
   gps:{lat:46.495,lng:2.883},photos:2,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg2",createdAt:"2026-08-04T14:30:00Z",auteur:"Claire Laurent",profil:"Mandataire",
   tronconId:"TRC-001",tronconNom:"Chemin des Battets — section nord",
   type:"fosse",urgence:"orange",commentaire:"Fossé nord bouché sur 30 m après la pluie du 3 août. Eau sur chaussée.",
   gps:{lat:46.512,lng:2.891},photos:1,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg3",createdAt:"2026-07-28T09:00:00Z",auteur:"Commune de Tronçais",profil:"Collectivité",
   tronconId:"TRC-002",tronconNom:"Piste de la Corniche",
   type:"vegetation",urgence:"jaune",commentaire:"Végétation envahissante sur 200 m côté amont. Réduction de la largeur visible.",
   gps:{lat:46.491,lng:2.912},photos:0,statut:"traite",commune:"Tronçais",
   validePar:"Admin APPLITAG",traitePar:"Sylviculture Allier",dateTraitement:"2026-08-01"},
];

// Composant banque de données cartographiée
export const SectionApplitgData = ({onSignaler}) => {
  const [signalements, setSignalements] = useState(()=>{
    const d=signalementsGet(); return d.length?d:[...DEMO_SIGNALEMENTS];
  });
  const [filtre, setFiltre] = useState("tous"); // tous | ouvert | traite
  const [filtreUrgence, setFiltreUrgence] = useState("tous");

  const displayed = signalements
    .filter(s=> filtre==="tous" || s.statut===filtre)
    .filter(s=> filtreUrgence==="tous" || s.urgence===filtreUrgence)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const nbOuverts = signalements.filter(s=>s.statut==="ouvert").length;
  const nbUrgents = signalements.filter(s=>s.statut==="ouvert"&&s.urgence==="rouge").length;
  const nbParType = {};
  signalements.forEach(s=>{ nbParType[s.type]=(nbParType[s.type]||0)+1; });

  const marquerTraite = (id) => {
    const upd = signalements.map(s=>s.id===id?{...s,statut:"traite",dateTraitement:todayS(),traitePar:"Gestionnaire"}:s);
    setSignalements(upd); signalementsSet(upd);
  };

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#1E5B3A 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🗄️</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Data</div>
        <div style={{fontSize:13,opacity:.85}}>Banque de données des anomalies dessertes forestières — signalements terrain collaboratifs</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🚨 {nbUrgents} urgent{nbUrgents>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>📋 {nbOuverts} ouvert{nbOuverts>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>✅ {signalements.filter(s=>s.statut==="traite").length} traité{signalements.filter(s=>s.statut==="traite").length>1?"s":""}</span>
        </div>
      </div>

      {/* Bouton signaler rapide */}
      <button onClick={onSignaler} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginBottom:16,
        background:"#991B1B",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        🚨 Signaler une anomalie
      </button>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["ouvert","Ouverts"],["traite","Traités"]].map(([id,l])=>(
          <button key={id} onClick={()=>setFiltre(id)} style={{
            padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtre===id?700:400,
            border:`1.5px solid ${filtre===id?"#1E3A5F":C.bd}`,
            background:filtre===id?"#1E3A5F":"#fff",color:filtre===id?"#fff":C.tx2,cursor:"pointer"}}>
            {l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {["tous","rouge","orange","jaune"].map(u=>{
          const info=u==="tous"?null:URGENCES[u];
          return (
            <button key={u} onClick={()=>setFiltreUrgence(u)} style={{
              padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtreUrgence===u?700:400,
              border:`1.5px solid ${filtreUrgence===u?(info?.col||"#1E3A5F"):C.bd}`,
              background:filtreUrgence===u?(info?.bg||"#1E3A5F"):"#fff",
              color:filtreUrgence===u?(info?.col||"#fff"):C.tx2,cursor:"pointer"}}>
              {info?info.icon:"🔍"} {info?info.label.split(" ")[0]:"Tous"}
            </button>
          );
        })}
      </div>

      {/* Carte placeholder des points */}
      <div style={{background:"#F0F9FF",border:"1px solid #BFDBFE",borderRadius:12,
        padding:"12px 16px",marginBottom:12,fontSize:12,color:"#1E3A5F"}}>
        <div style={{fontWeight:700,marginBottom:6}}>🗺️ Carte APPLITAG Data — {displayed.length} signalement(s) affiché(s)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {displayed.map(s=>{
            const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
            const u=URGENCES[s.urgence]||URGENCES.jaune;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",
                borderRadius:99,fontSize:11,background:u.bg,color:u.col,fontWeight:600}}>
                {t.icon} {s.tronconNom?.split("—")[0].trim()||s.tronconId}
              </div>
            );
          })}
        </div>
        <div style={{marginTop:6,fontSize:11,opacity:.7}}>Intégration cartographique IGN/OSM prévue — les coordonnées GPS sont déjà enregistrées.</div>
      </div>

      {/* Liste des signalements */}
      {displayed.length===0?(
        <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun signalement correspondant</div>
      ):displayed.map(s=>{
        const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
        const u=URGENCES[s.urgence]||URGENCES.jaune;
        const dateS=new Date(s.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
        return (
          <div key={s.id} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${s.statut==="ouvert"?u.col+"66":C.bd}`,
            padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                <div style={{fontSize:12,color:C.tx3,marginTop:1}}>{s.tronconNom||s.tronconId} · {s.commune}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:u.bg,color:u.col}}>
                  {u.icon} {u.label}
                </span>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:600,
                  background:s.statut==="traite"?C.greenL:"#FEF3C7",
                  color:s.statut==="traite"?C.greenD:C.amber}}>
                  {s.statut==="traite"?"✅ Traité":"🔴 Ouvert"}
                </span>
              </div>
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.5,marginBottom:6,fontStyle:"italic"}}>
              "{s.commentaire}"
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div style={{fontSize:11,color:C.tx3}}>
                Par <strong>{s.auteur}</strong> ({s.profil}) · {dateS}
                {s.gps&&<span> · 📍 {s.gps.lat.toFixed(4)}, {s.gps.lng.toFixed(4)}</span>}
                {s.photos>0&&<span> · 📷 {s.photos} photo(s)</span>}
              </div>
              {s.statut==="ouvert"&&(
                <button onClick={()=>marquerTraite(s.id)} style={{
                  padding:"5px 12px",borderRadius:8,border:`1px solid ${C.green}`,
                  background:C.greenL,color:C.greenD,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ✅ Marquer traité
                </button>
              )}
              {s.statut==="traite"&&s.traitePar&&(
                <div style={{fontSize:11,color:C.tx3}}>Traité par {s.traitePar} · {s.dateTraitement}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── DFCI — Données complémentaires ──────────────────────────────
const PRATICABILITE_OPTS = [
  {id:"praticable",  label:"Praticable",            icon:"🟢", col:"#065F46", bg:"#D1FAE5"},
  {id:"conditions",  label:"Praticable sous conditions",icon:"🟡",col:"#92400E",bg:"#FEF3C7"},
  {id:"degradee",    label:"Dégradée",              icon:"🟠", col:"#C2410C", bg:"#FFEDD5"},
  {id:"impraticable",label:"Impraticable",          icon:"🔴", col:"#991B1B", bg:"#FEE2E2"},
  {id:"a_verifier",  label:"À vérifier",            icon:"⬜", col:"#475569", bg:"#F1F5F9"},
  {id:"priorite_incendie",label:"Priorité incendie",icon:"🚨", col:"#7F1D1D", bg:"#FEE2E2"},
];
const OBSTACLES_TYPES = [
  "Ornières profondes","Ravinement","Arbres tombés","Végétation envahissante",
  "Pont / buse dégradé","Largeur insuffisante","Fossé bouché","Affaissement de chaussée","Glissement de terrain",
];
const DEMO_DIAGNOSTICS = [
  {id:"d1",tronconId:"TRC-001",date:"2026-07-15",praticabilite:"praticable",
   obstacles:[],commentaire:"RAS — entretien fossés réalisé en juin.",
   photos:2,validePar:"J. Dupont",dernierPassage:"2026-07-15"},
  {id:"d2",tronconId:"TRC-003",date:"2026-07-20",praticabilite:"degradee",
   obstacles:["Ornières profondes","Végétation envahissante"],
   commentaire:"Ornières sur 80 m en sortie de coude. Passage tracteur limité.",
   photos:3,validePar:"M. Laurent",dernierPassage:"2026-07-20"},
];
const DEMO_POINTS_DFCI = [
  {id:"dfci1",type:"citerne",nom:"Citerne DFCI — Battets",tronconId:"TRC-001",
   capacite:"60 m³",gps:{lat:46.511,lng:2.892},acces:"Accès direct piste TRC-001",
   etat:"ok",dernierControle:"2026-05-10",responsable:"ONF Allier"},
  {id:"dfci2",type:"point_eau",nom:"Mare du Bois Rond",tronconId:"TRC-003",
   capacite:"Naturel",gps:{lat:46.498,lng:2.889},acces:"150 m depuis TRC-003",
   etat:"a_verifier",dernierControle:"2025-10-15",responsable:"Commune"},
  {id:"dfci3",type:"retournement",nom:"Aire de retournement Nord",tronconId:"TRC-001",
   capacite:"Camion 10 t",gps:{lat:46.513,lng:2.890},acces:"Fin de TRC-001",
   etat:"ok",dernierControle:"2026-07-15",responsable:"Commune de Tronçais"},
];
const DFCI_TYPE_INFO = {
  citerne:      {icon:"🚒",label:"Citerne DFCI",   col:"#991B1B",bg:"#FEE2E2"},
  point_eau:    {icon:"💧",label:"Point d'eau",     col:"#1E3A5F",bg:"#DBEAFE"},
  retournement: {icon:"🔄",label:"Retournement",    col:"#065F46",bg:"#D1FAE5"},
  croix:        {icon:"📍",label:"Balisage / croix",col:"#7C3AED",bg:"#EDE9FE"},
};

// Calcul priorité de rénovation (score 1-10)
const calcPriorite = (t, diag) => {
  let score = 0;
  if (t.accesIncendie?.toLowerCase().includes("non"))    score += 4;
  if (t.accesIncendie?.toLowerCase().includes("améliorer")) score += 2;
  if (diag?.praticabilite === "impraticable")             score += 3;
  if (diag?.praticabilite === "degradee")                 score += 2;
  if (!t.retournement)                                    score += 1;
  if (t.largeur < 3.5)                                    score += 1;
  if (t.tonnageMobilisable > 200)                         score += 1;
  if (diag?.obstacles?.length > 1)                        score += 1;
  return Math.min(score, 10);
};

// ── PERMIS QUOTIDIEN DE CHANTIER — INCENDIE FORÊT ───────────────
const NIVEAUX_RESTRICTION = [
  {id:"aucune",  label:"Aucune restriction",     icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
  {id:"faible",  label:"Niveau faible",          icon:"🟡", couleur:"#92400E", bg:"#FEF3C7"},
  {id:"eleve",   label:"Niveau élevé",           icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"tres_eleve",label:"Très élevé",           icon:"🔴", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"interdit",label:"Travaux interdits",      icon:"⛔", couleur:"#7F1D1D", bg:"#FEE2E2"},
];

// ── APPLITAG SCIERIE — MVP ───────────────────────────────────────

const SCIERIE_KEY_GRUMES    = "applitag_scierie_grumes";
const SCIERIE_KEY_COPRODUITS= "applitag_scierie_coproduits";
const SCIERIE_KEY_ENLEV     = "applitag_scierie_enlev";
const LOTS_SECONDAIRES_KEY  = "applitag_lots_secondaires";
const scierieGet = (key) => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
const lotsSecGet = () => { try { return JSON.parse(localStorage.getItem(LOTS_SECONDAIRES_KEY)||"[]"); } catch { return []; } };
const lotsSecSet = (arr) => { try { localStorage.setItem(LOTS_SECONDAIRES_KEY,JSON.stringify(arr)); } catch { /* noop */ } };
const scierieSet = (key,arr) => { try { localStorage.setItem(key,JSON.stringify(arr)); } catch { /* noop */ } };

const ESSENCES_GRUMES = ["Chêne","Hêtre","Douglas","Pin sylvestre","Épicéa","Sapin","Frêne","Peuplier","Châtaignier","Autres"];
const QUALITES_GRUME  = ["A (grume d'œuvre)","B (bois d'industrie)","C (bois énergie)","Déclassé"];
const TYPES_COPRODUIT = [
  {id:"sciure",    label:"Sciure",           icon:"🟡", unite:"t"},
  {id:"ecorce",    label:"Écorces",          icon:"🟤", unite:"t"},
  {id:"plaquette", label:"Plaquettes",       icon:"🟢", unite:"t"},
  {id:"dosses",    label:"Dosses / chutes",  icon:"🪵", unite:"stères"},
  {id:"connexe_be",label:"Bois énergie tronc",icon:"🔥",unite:"t"},
];
const DESTINATIONS_COPRODUIT = ["Chaufferie","Particulier","Agriculteur","Pépiniériste","Plateforme bois énergie","Compostage","Interne / non valorisé"];

const DEMO_GRUMES = [
  {id:"g1",date:"2026-07-28",fournisseur:"Forêt Bernard",essence:"Chêne",qualite:"A (grume d'œuvre)",volume:18.5,prix:95,origine:"Tronçais (03)",ref:"GR-2026-001"},
  {id:"g2",date:"2026-07-30",fournisseur:"CUMA Bois Est",essence:"Douglas",qualite:"A (grume d'œuvre)",volume:32.0,prix:68,origine:"Vosges (88)",ref:"GR-2026-002"},
  {id:"g3",date:"2026-08-01",fournisseur:"Prop. Martin",essence:"Hêtre",qualite:"B (bois d'industrie)",volume:11.2,prix:55,origine:"Haute-Marne (52)",ref:"GR-2026-003"},
];
const DEMO_COPRODUITS = [
  {id:"cp1",grumeRef:"GR-2026-001",type:"sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",grumeRef:"GR-2026-001",type:"ecorce",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",grumeRef:"GR-2026-002",type:"plaquette",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",grumeRef:"GR-2026-002",type:"dosses",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
];
const DEMO_ENLEVEMENTS = [
  {id:"e1",date:"2026-08-02",client:"Chaufferie Communale Épinal",coproduitType:"plaquette",qte:6.5,prix:28,transporteur:"Camion Rossi",statut:"livré"},
];

export const SectionScierie = () => {
  const [tab,      setTab]    = useState("grumes");
  const [grumes,   setGrumes] = useState(() => { const d=scierieGet(SCIERIE_KEY_GRUMES); return d.length?d:[...DEMO_GRUMES]; });
  const [coprods,  setCoprods]= useState(() => { const d=scierieGet(SCIERIE_KEY_COPRODUITS); return d.length?d:[...DEMO_COPRODUITS]; });
  const [enlevs,   setEnlevs] = useState(() => { const d=scierieGet(SCIERIE_KEY_ENLEV); return d.length?d:[...DEMO_ENLEVEMENTS]; });

  // ── Formulaire grume
  const [gDate,setGDate]       = useState(todayS());
  const [gFourn,setGFourn]     = useState("");
  const [gEss,setGEss]         = useState("Chêne");
  const [gQual,setGQual]       = useState("A (grume d'œuvre)");
  const [gVol,setGVol]         = useState("");
  const [gPrix,setGPrix]       = useState("");
  const [gOrig,setGOrig]       = useState("");
  const [gSaved,setGSaved]     = useState(false);

  // ── Formulaire coproduit
  const [cpGrume,setCpGrume]   = useState("");
  const [cpType,setCpType]     = useState("sciure");
  const [cpQte,setCpQte]       = useState("");
  const [cpHum,setCpHum]       = useState("");
  const [cpDest,setCpDest]     = useState("Chaufferie");
  const [cpPrix,setCpPrix]     = useState("");
  const [cpSaved,setCpSaved]   = useState(false);

  // ── Formulaire enlèvement
  const [eDate,setEDate]       = useState(todayS());
  const [eClient,setEClient]   = useState("");
  const [eCp,setECp]           = useState("");
  const [eQte,setEQte]         = useState("");
  const [ePrix,setEPrix]       = useState("");
  const [eTrans,setETrans]     = useState("");
  const [eSaved,setESaved]     = useState(false);

  const addGrume = () => {
    if (!gFourn || !gVol) return;
    const g = {id:uid(),date:gDate,fournisseur:gFourn,essence:gEss,qualite:gQual,
      volume:parseFloat(gVol),prix:parseFloat(gPrix)||0,origine:gOrig,
      ref:`GR-${gDate.replace(/-/g,"").slice(2)}-${String(grumes.length+1).padStart(3,"0")}`};
    const upd=[g,...grumes]; setGrumes(upd); scierieSet(SCIERIE_KEY_GRUMES,upd);
    setGFourn(""); setGVol(""); setGPrix(""); setGOrig("");
    setGSaved(true); setTimeout(()=>setGSaved(false),2500);
  };

  const addCoproduit = () => {
    if (!cpQte || !cpGrume) return;
    const cp = {id:uid(),grumeRef:cpGrume,type:cpType,qte:parseFloat(cpQte),
      humidite:parseFloat(cpHum)||0,destination:cpDest,prix:parseFloat(cpPrix)||0,statut:"disponible"};
    const upd=[cp,...coprods]; setCoprods(upd); scierieSet(SCIERIE_KEY_COPRODUITS,upd);
    setCpQte(""); setCpHum(""); setCpPrix(""); setCpGrume("");
    setCpSaved(true); setTimeout(()=>setCpSaved(false),2500);
  };

  const addEnlevement = () => {
    if (!eClient || !eQte) return;
    const cpSel = TYPES_COPRODUIT.find(t=>t.id===eCp)||TYPES_COPRODUIT[0];
    const annee = eDate.slice(0,4);
    const existants = lotsSecGet();
    const seq = String(existants.length+1).padStart(3,"0");
    const lotNum = `LOT-SC-${annee}-${seq}`;
    // LOT secondaire traçable
    const lotSec = {
      id: uid(), lotNumero: lotNum, type: "coproduit_scierie",
      createdAt: new Date().toISOString(), date: eDate,
      origine: "Scierie", coproduitType: eCp, coproduitLabel: cpSel.label,
      tonnage: parseFloat(eQte), prixTonne: parseFloat(ePrix)||0,
      destination: eClient, transporteur: eTrans,
      statut: "EN_LIVRAISON", source: "scierie",
    };
    lotsSecSet([lotSec,...existants]);
    const e = {id:uid(),date:eDate,client:eClient,coproduitType:eCp,
      coproduitLabel:cpSel.label,qte:parseFloat(eQte),prix:parseFloat(ePrix)||0,
      transporteur:eTrans,statut:"planifié", lotSecondaire: lotNum};
    const upd=[e,...enlevs]; setEnlevs(upd); scierieSet(SCIERIE_KEY_ENLEV,upd);
    setEClient(""); setEQte(""); setEPrix(""); setETrans("");
    setESaved(true); setTimeout(()=>setESaved(false),2500);
  };

  // ── Calculs marges
  const revenuGrumes   = grumes.reduce((s,g)=>s+g.volume*g.prix,0);
  const revenuCoprods  = coprods.filter(c=>c.statut==="vendu").reduce((s,c)=>s+c.qte*c.prix,0);
  const revenuEnlevs   = enlevs.reduce((s,e)=>s+e.qte*e.prix,0);
  const stockDispo     = coprods.filter(c=>c.statut==="disponible");
  const totalVolGrumes = grumes.reduce((s,g)=>s+g.volume,0);

  const Fld = ({label,children}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      {children}
    </div>
  );
  const inp = {height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
    padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box",width:"100%"};
  const Stat = ({icon,label,val,color}) => (
    <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",flex:1,minWidth:120}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:800,color:color||C.tx,fontVariantNumeric:"tabular-nums"}}>{val}</div>
      <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{label}</div>
    </div>
  );
  const Badge = ({s}) => {
    const map={disponible:{bg:C.greenL,c:C.greenD},vendu:{bg:C.blueL,c:C.blue},livré:{bg:C.greenL,c:C.greenD},planifié:{bg:C.amberL,c:C.amber}};
    const st=map[s]||{bg:C.bg,c:C.tx3};
    return <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>{s}</span>;
  };

  const TABS=[
    {id:"grumes",    icon:"🪵", label:"Grumes"},
    {id:"coproduits",icon:"♻️", label:"Coproduits"},
    {id:"stocks",    icon:"📦", label:"Stocks"},
    {id:"enlevements",icon:"🚛",label:"Enlèvements"},
    {id:"marges",    icon:"📈", label:"Marges"},
  ];

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>

      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,#1E3A5F 0%,#2D6A4F 100%)`,
        borderRadius:14,padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🏭</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Scierie</div>
        <div style={{fontSize:13,opacity:.8}}>Réception grumes · Coproduits · Stocks · Enlèvements · Marges</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          {[`🪵 ${grumes.length} grumes`,`♻️ ${coprods.length} coproduits`,`🚛 ${enlevs.length} enlèvements`].map(t=>(
            <span key={t} style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>{t}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",alignItems:"center",gap:5,padding:"8px 14px",
            borderRadius:10,border:`1.5px solid ${tab===t.id?"#1E3A5F":C.bd}`,
            background:tab===t.id?"#1E3A5F":"#fff",
            color:tab===t.id?"#fff":C.tx2,fontWeight:tab===t.id?700:400,
            fontSize:13,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
          }}><span>{t.icon}</span>{t.label}</button>
        ))}
      </div>

      {/* ── Onglet GRUMES ── */}
      {tab==="grumes" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Réception des grumes</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date réception"><input type="date" value={gDate} onChange={e=>setGDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Fournisseur"><input value={gFourn} onChange={e=>setGFourn(e.target.value)} placeholder="Nom propriétaire / ETF" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Essence">
                <select value={gEss} onChange={e=>setGEss(e.target.value)} style={{...inp,background:"#fff"}}>
                  {ESSENCES_GRUMES.map(e=><option key={e}>{e}</option>)}
                </select>
              </Fld>
              <Fld label="Qualité">
                <select value={gQual} onChange={e=>setGQual(e.target.value)} style={{...inp,background:"#fff"}}>
                  {QUALITES_GRUME.map(q=><option key={q}>{q}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label="Volume (m³)"><input type="number" value={gVol} onChange={e=>setGVol(e.target.value)} placeholder="0.0" style={inp}/></Fld>
              <Fld label="Prix (€/m³)"><input type="number" value={gPrix} onChange={e=>setGPrix(e.target.value)} placeholder="0" style={inp}/></Fld>
              <Fld label="Origine"><input value={gOrig} onChange={e=>setGOrig(e.target.value)} placeholder="Massif / dép." style={inp}/></Fld>
            </div>
            <button onClick={addGrume} disabled={!gFourn||!gVol} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!gFourn||!gVol)?"#ccc":"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!gFourn||!gVol)?"not-allowed":"pointer"
            }}>+ Enregistrer la réception</button>
            {gSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Réception enregistrée</div>}
          </div>

          {grumes.map(g=>(
            <div key={g.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{g.ref}</div>
                  <div style={{fontSize:13,color:C.tx2,marginTop:2}}>{g.fournisseur} · {g.essence} · {g.qualite}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{g.date} {g.origine&&`· ${g.origine}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.greenD}}>{g.volume} m³</div>
                  {g.prix>0&&<div style={{fontSize:12,color:C.tx3}}>{(g.volume*g.prix).toLocaleString("fr-FR")} €</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet COPRODUITS ── */}
      {tab==="coproduits" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Génération des coproduits</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <Fld label="Grume d'origine">
              <select value={cpGrume} onChange={e=>setCpGrume(e.target.value)} style={{...inp,background:"#fff"}}>
                <option value="">— Sélectionner —</option>
                {grumes.map(g=><option key={g.id} value={g.ref}>{g.ref} — {g.fournisseur} ({g.essence})</option>)}
              </select>
            </Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Type de coproduit">
                <select value={cpType} onChange={e=>setCpType(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Destination">
                <select value={cpDest} onChange={e=>setCpDest(e.target.value)} style={{...inp,background:"#fff"}}>
                  {DESTINATIONS_COPRODUIT.map(d=><option key={d}>{d}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label={`Qté (${TYPES_COPRODUIT.find(t=>t.id===cpType)?.unite||"t"})`}>
                <input type="number" value={cpQte} onChange={e=>setCpQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Humidité (%)">
                <input type="number" value={cpHum} onChange={e=>setCpHum(e.target.value)} placeholder="%" style={inp}/>
              </Fld>
              <Fld label="Prix (€/t)">
                <input type="number" value={cpPrix} onChange={e=>setCpPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addCoproduit} disabled={!cpGrume||!cpQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!cpGrume||!cpQte)?"#ccc":"#2D6A4F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!cpGrume||!cpQte)?"not-allowed":"pointer"
            }}>+ Enregistrer le coproduit</button>
            {cpSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Coproduit enregistré</div>}
          </div>

          {coprods.map(c=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===c.type)||TYPES_COPRODUIT[0];
            return (
              <div key={c.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>Grume {c.grumeRef} · {c.destination} {c.humidite>0?`· H ${c.humidite}%`:""}</div>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{c.qte} {t.unite}</div>
                  {c.prix>0&&<div style={{fontSize:12,color:C.green}}>{c.prix} €/{t.unite}</div>}
                  <Badge s={c.statut}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet STOCKS ── */}
      {tab==="stocks" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Stocks disponibles par catégorie</h3>
          {TYPES_COPRODUIT.map(t=>{
            const items = coprods.filter(c=>c.type===t.id&&c.statut==="disponible");
            const total = items.reduce((s,c)=>s+c.qte,0);
            const revPotentiel = items.reduce((s,c)=>s+(c.prix*c.qte),0);
            if (items.length===0) return null;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontWeight:800,fontSize:18,color:C.greenD}}>{total.toFixed(1)} {t.unite}</div>
                </div>
                {revPotentiel>0&&<div style={{fontSize:12,color:C.tx3,marginBottom:8}}>Revenu potentiel : <strong style={{color:C.green}}>{revPotentiel.toLocaleString("fr-FR")} €</strong></div>}
                {items.map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:`1px solid ${C.bd}`,fontSize:13}}>
                    <span style={{color:C.tx2}}>Grume {c.grumeRef} · {c.destination}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{c.qte} {t.unite} {c.humidite>0?`· H${c.humidite}%`:""}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {stockDispo.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun stock disponible</div>
          )}
        </div>
      )}

      {/* ── Onglet ENLÈVEMENTS ── */}
      {tab==="enlevements" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Enlèvements clients</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date"><input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Client"><input value={eClient} onChange={e=>setEClient(e.target.value)} placeholder="Chaufferie, particulier..." style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Coproduit">
                <select value={eCp} onChange={e=>setECp(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Transporteur"><input value={eTrans} onChange={e=>setETrans(e.target.value)} placeholder="Nom transporteur" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label={`Quantité (${TYPES_COPRODUIT.find(t=>t.id===eCp)?.unite||"t"})`}>
                <input type="number" value={eQte} onChange={e=>setEQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Prix facturé (€/t)">
                <input type="number" value={ePrix} onChange={e=>setEPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addEnlevement} disabled={!eClient||!eQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!eClient||!eQte)?"#ccc":"#B45309",color:"#fff",fontWeight:700,fontSize:15,cursor:(!eClient||!eQte)?"not-allowed":"pointer"
            }}>+ Enregistrer l'enlèvement</button>
            {eSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.amberL,color:C.amberD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Enlèvement planifié</div>}
          </div>

          {enlevs.map(e=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===e.coproduitType)||TYPES_COPRODUIT[0];
            return (
              <div key={e.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{e.client}</div>
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{e.date} · {t.icon} {t.label} {e.transporteur&&`· ${e.transporteur}`}</div>
                    {e.lotSecondaire&&(
                      <div style={{marginTop:4,display:"inline-flex",alignItems:"center",gap:4,
                        background:"#D1FAE5",borderRadius:6,padding:"2px 8px",fontSize:11,
                        fontWeight:700,color:"#065F46"}}>
                        🌲 {e.lotSecondaire}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{e.qte} {t.unite}</div>
                    {e.prix>0&&<div style={{fontSize:12,color:C.green}}>{(e.qte*e.prix).toLocaleString("fr-FR")} €</div>}
                    <Badge s={e.statut}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet MARGES ── */}
      {tab==="marges" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Marges & indicateurs</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="🪵" label="Volume grumes reçu" val={`${totalVolGrumes.toFixed(1)} m³`} color={C.tx}/>
            <Stat icon="♻️" label="Coproduits générés" val={`${coprods.length}`} color={C.greenD}/>
            <Stat icon="📦" label="Lots dispo en stock" val={`${stockDispo.length}`} color={C.blue}/>
            <Stat icon="🚛" label="Enlèvements réalisés" val={`${enlevs.length}`} color={C.amber}/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="💶" label="Revenu grumes estimé" val={`${revenuGrumes.toLocaleString("fr-FR")} €`} color={C.greenD}/>
            <Stat icon="💰" label="Revenu coproduits vendus" val={`${revenuCoprods.toLocaleString("fr-FR")} €`} color={C.green}/>
            <Stat icon="📤" label="CA enlèvements" val={`${revenuEnlevs.toLocaleString("fr-FR")} €`} color={C.amber}/>
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📊 Revenu par type de coproduit</div>
            {TYPES_COPRODUIT.map(t=>{
              const vendus=coprods.filter(c=>c.type===t.id&&c.statut==="vendu");
              const rev=vendus.reduce((s,c)=>s+c.qte*c.prix,0);
              const vol=coprods.filter(c=>c.type===t.id).reduce((s,c)=>s+c.qte,0);
              if(vol===0) return null;
              return (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:13,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <span style={{fontSize:12,color:C.tx3}}>{vol.toFixed(1)} {t.unite} produit</span>
                    <span style={{fontSize:13,fontWeight:700,color:rev>0?C.green:C.tx3}}>{rev>0?`${rev.toLocaleString("fr-FR")} €`:"—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{background:C.greenL,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>💡 Leviers d'amélioration</div>
            <div style={{fontSize:13,color:C.greenD,lineHeight:1.6}}>
              {stockDispo.filter(c=>c.prix===0).length>0&&<div>⚠️ {stockDispo.filter(c=>c.prix===0).length} lot(s) en stock sans prix de vente défini</div>}
              {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length>0&&<div>⚠️ {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length} lot(s) non valorisé(s) — débouché à trouver</div>}
              {stockDispo.filter(c=>c.humidite>30).length>0&&<div>⚠️ {stockDispo.filter(c=>c.humidite>30).length} lot(s) avec humidité {">"} 30 % — valorisation réduite</div>}
              {stockDispo.length===0&&<div>✅ Tous les coproduits ont été valorisés ou enlèvements planifiés</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

export const SectionDesserte = () => {
  const [tab,    setTab]    = useState("liste");
  const [sel,    setSel]    = useState(null);

  const _trc = sel ? DEMO_TRONCONS.find(t=>t.id===sel) : null;
  const totalTonnage = DEMO_TRONCONS.reduce((s,t)=>s+t.tonnageMobilisable,0);
  const totalCout    = DEMO_TRONCONS.reduce((s,t)=>s+t.coutProjet,0);

  const inp = (val,set,ph,type="text") => (
    <input type={type} value={val} onChange={e=>set(e.target.value)}
      placeholder={ph}
      style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
        background:C.bg,color:C.tx,boxSizing:"border-box"}}/>
  );

  // ─ Formulaire nouveau tronçon ─
  const [fNom,         setFNom]         = useState("");
  const [fType,        setFType]        = useState("existant");
  const [fProp,        setFProp]        = useState("");
  const [fParcelles,   setFParcelles]   = useState("");
  const [fPortance,    setFPortance]    = useState("normale");
  const [fLargeur,     setFLargeur]     = useState("");
  const [fPente,       setFPente]       = useState("");
  const [fDepot,       setFDepot]       = useState(false);
  const [fRetour,      setFRetour]      = useState(false);
  const [fIncendie,    setFIncendie]    = useState(ACCES_INCENDIE_OPTS[0]);
  const [fTonnage,     setFTonnage]     = useState("");
  const [fVolume,      setFVolume]      = useState("");
  const [fCout,        setFCout]        = useState("");
  const [fTravaux,     setFTravaux]     = useState("");

  // ── Tracé GPS du tronçon ──
  const [tracePoints,  setTracePoints]  = useState([]); // [{lat,lng,alt,t}]
  const [traceActif,   setTraceActif]   = useState(false);
  const [traceDist,    setTraceDist]    = useState(0);   // mètres
  const [traceError,   setTraceError]   = useState(null);
  const watchIdRef = useRef(null);

  // Haversine (m) entre deux coordonnées
  const haversine = (a, b) => {
    const R=6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  };

  const demarrerTrace = () => {
    if (!navigator.geolocation) { setTraceError("GPS non disponible sur cet appareil."); return; }
    setTracePoints([]); setTraceDist(0); setTraceError(null); setTraceActif(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude,
          alt:pos.coords.altitude, t:Date.now()};
        setTracePoints(prev => {
          const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
          setTraceDist(d => d + dist);
          return [...prev, pt];
        });
      },
      (err) => setTraceError("Erreur GPS : " + err.message),
      {enableHighAccuracy:true, maximumAge:0, timeout:10000}
    );
  };

  const arreterTrace = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTraceActif(false);
  };

  const ajouterPointManuel = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude, alt:pos.coords.altitude, t:Date.now()};
      setTracePoints(prev => {
        const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
        setTraceDist(d => d + dist);
        return [...prev, pt];
      });
    }, () => setTraceError("Impossible de récupérer la position."), {enableHighAccuracy:true});
  };

  const effacerTrace = () => {
    arreterTrace();
    setTracePoints([]); setTraceDist(0); setTraceError(null);
  };

  const distLabel = traceDist < 1000
    ? `${Math.round(traceDist)} m`
    : `${(traceDist/1000).toFixed(2)} km`;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🛣️ Desserte forestière
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Tronçons · Portance · Mobilisation · Coûts · Accès incendie
          </div>
        </div>
        <button onClick={()=>setTab("nouveau")} style={{
          padding:"10px 18px",borderRadius:12,background:C.green,border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau tronçon
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🛣️",l:"Tronçons",        v:DEMO_TRONCONS.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"⚖️",l:"Tonnage mobilisable",v:`${totalTonnage} t`,      col:"#065F46",bg:"#D1FAE5"},
          {ico:"📐",l:"Projets à créer",  v:DEMO_TRONCONS.filter(t=>t.type==="a_creer").length,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Coût total estimé",v:`${(totalCout/1000).toFixed(0)} k€`,col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["liste","📋","Liste des tronçons"],["carte","🗺️","Vue territoire"],
          ["nouveau","➕","Nouveau tronçon"],["contraintes","⚠️","Contraintes & règles"],
          ["diagnostic","🔍","Diagnostic terrain"],["dfci","🚒","Accès pompiers & DFCI"],
          ["priorite","📊","Priorité travaux"],["signaler","🚨","Signaler"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_TRONCONS.map(t=>{
            const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
            const po = PORTANCE_OPTS.find(p=>p.v===t.portance)||PORTANCE_OPTS[1];
            const isOpen = sel===t.id;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${st.col}44`}}>
                <div onClick={()=>setSel(isOpen?null:t.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"50":"#fff",
                    display:"flex",alignItems:"center",gap:12,
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.col}}>{st.icon} {st.l}</span>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:po.bg,color:po.col}}>{po.l}</span>
                      <span style={{fontSize:10,color:C.tx3}}>
                        {t.type==="existant"?"Existant":"À créer"}
                      </span>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{t.nom}</div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      {t.proprietaire} · {t.parcelles.join(", ")} · {t.largeur} m · pente {t.pentePct}%
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#1E40AF"}}>{t.tonnageMobilisable} t</div>
                    {t.coutProjet>0&&<div style={{fontSize:10,color:C.tx3}}>{t.coutProjet.toLocaleString("fr-FR")} €</div>}
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                    background:"#FAFAFA",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {[
                        ["🛣️ Largeur",`${t.largeur} m`],
                        ["📐 Pente max",`${t.pentePct} %`],
                        ["⚖️ Portance",po.l],
                        ["🌲 Surface desservie",`${t.surface} ha`],
                        ["📦 Tonnage mobilisable",`${t.tonnageMobilisable} t`],
                        ["🌳 Volume mobilisable",`${t.volumeMobilisable} m³`],
                      ].map(([lbl,val])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${C.bd}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["🅿️ Place de dépôt",t.placeDepot,"Disponible","Inexistante"],
                        ["🔄 Retournement",t.retournement,"Possible","Impossible"],
                      ].map(([lbl,ok,y,n])=>(
                        <div key={lbl} style={{background:ok?"#F0FDF4":"#FFF7ED",borderRadius:8,
                          padding:"8px 10px",border:`1px solid ${ok?"#86EFAC":"#FED7AA"}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:ok?"#065F46":"#B45309"}}>
                            {ok?y:n}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"8px 12px",borderRadius:8,fontSize:11,
                      background:t.accesIncendie.startsWith("Oui")?"#F0FDF4":"#FEF2F2",
                      border:`1px solid ${t.accesIncendie.startsWith("Oui")?"#86EFAC":"#FECACA"}`,
                      color:t.accesIncendie.startsWith("Oui")?"#065F46":"#991B1B",fontWeight:600}}>
                      🔥 Accès incendie : {t.accesIncendie}
                    </div>
                    {t.coutProjet>0&&(
                      <div style={{padding:"8px 12px",borderRadius:8,
                        background:"#EFF6FF",border:"1px solid #BFDBFE",fontSize:11}}>
                        💶 Coût estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong>
                        {t.travaux&&<span style={{marginLeft:8,color:C.tx3}}>· {t.travaux}</span>}
                      </div>
                    )}
                    {t.photos>0&&(
                      <div style={{fontSize:11,color:"#7C3AED",fontWeight:600}}>
                        📸 {t.photos} photo{t.photos>1?"s":""} de contrôle
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOUVEAU TRONÇON ── */}
      {tab==="nouveau"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:14}}>
            📐 Créer un nouveau tronçon
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Nom + Type */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Nom du tronçon</div>
                {inp(fNom,setFNom,"Ex : Chemin des Battets — section nord")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Type</div>
                <div style={{display:"flex",gap:6}}>
                  {[["existant","✅ Existant"],["a_creer","📐 À créer"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setFType(v)} style={{
                      flex:1,padding:"8px 10px",borderRadius:9,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",
                      border:`1.5px solid ${fType===v?"#1E40AF":C.bd}`,
                      background:fType===v?"#DBEAFE":"#fff",color:fType===v?"#1E40AF":C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Propriétaire + Parcelles */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Propriétaire</div>
                {inp(fProp,setFProp,"Commune, propriétaire privé…")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                  Parcelles desservies
                </div>
                {inp(fParcelles,setFParcelles,"B 112, B 113, C 218…")}
              </div>
            </div>
            {/* Portance */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Portance</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PORTANCE_OPTS.map(p=>(
                  <button key={p.v} onClick={()=>setFPortance(p.v)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fPortance===p.v?p.col:C.bd}`,
                    background:fPortance===p.v?p.bg:"#fff",color:fPortance===p.v?p.col:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{p.l}</button>
                ))}
              </div>
            </div>
            {/* Dimensions + Pente */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Largeur (m)</div>
                {inp(fLargeur,setFLargeur,"ex : 3.5","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pente max (%)</div>
                {inp(fPente,setFPente,"ex : 12","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Coût projet (€)</div>
                {inp(fCout,setFCout,"0 si existant","number")}
              </div>
            </div>
            {/* Tonnage / Volume */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Tonnage mobilisable (t)</div>
                {inp(fTonnage,setFTonnage,"ex : 250","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Volume mobilisable (m³)</div>
                {inp(fVolume,setFVolume,"ex : 380","number")}
              </div>
            </div>
            {/* Cases */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                [fDepot,setFDepot,"🅿️ Place de dépôt"],
                [fRetour,setFRetour,"🔄 Retournement"],
              ].map(([val,set,lbl])=>(
                <button key={lbl} onClick={()=>set(!val)} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"9px 14px",
                  borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                  border:`1.5px solid ${val?"#065F46":C.bd}`,
                  background:val?"#D1FAE5":"#fff",color:val?"#065F46":C.tx2,
                  WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:16}}>{val?"✅":"⬜"}</span>{lbl}
                </button>
              ))}
            </div>
            {/* Accès incendie */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>
                🔥 Accès incendie
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ACCES_INCENDIE_OPTS.map(o=>(
                  <button key={o} onClick={()=>setFIncendie(o)} style={{
                    padding:"8px 12px",borderRadius:9,textAlign:"left",fontSize:11,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fIncendie===o?"#065F46":C.bd}`,
                    background:fIncendie===o?"#D1FAE5":"#fff",
                    color:fIncendie===o?"#065F46":C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{o}</button>
                ))}
              </div>
            </div>
            {/* Travaux */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                Travaux réalisés / prévus
              </div>
              <textarea value={fTravaux} onChange={e=>setFTravaux(e.target.value)}
                rows={3} placeholder="Ex : Entretien fossés 2024, élargissement section…"
                style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
                  border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                  background:C.bg,color:C.tx,boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            {/* ── TRACÉ GPS ── */}
            <div style={{borderRadius:12,border:`2px solid ${traceActif?"#1E40AF":C.bd}`,
              background:traceActif?"#EFF6FF":"#fff",padding:"14px 16px",transition:"all .2s"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                📍 Tracé GPS du tronçon
                {traceActif&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#1E40AF",color:"#fff",fontWeight:700,animation:"pulse 1s infinite"}}>● EN COURS</span>}
              </div>

              {/* Compteurs temps réel */}
              {(tracePoints.length>0||traceActif)&&(
                <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  {[
                    {icon:"📍",label:"Points capturés",val:`${tracePoints.length}`},
                    {icon:"📏",label:"Distance",val:distLabel},
                    ...(tracePoints.length>0?[{icon:"🕐",label:"Dernier point",val:new Date(tracePoints[tracePoints.length-1].t).toLocaleTimeString("fr-FR")}]:[]),
                  ].map(s=>(
                    <div key={s.label} style={{background:"#DBEAFE",borderRadius:10,padding:"8px 12px",flex:1,minWidth:90,textAlign:"center"}}>
                      <div style={{fontSize:16}}>{s.icon}</div>
                      <div style={{fontWeight:800,fontSize:15,color:"#1E3A5F",fontVariantNumeric:"tabular-nums"}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#1E40AF"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mini-tracé visuel */}
              {tracePoints.length>1&&(()=>{
                const lats=tracePoints.map(p=>p.lat), lngs=tracePoints.map(p=>p.lng);
                const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
                const W=280,H=80,pad=8;
                const sx=lng=>pad+(lng-minLng)/(maxLng-minLng||1)*(W-2*pad);
                const sy=lat=>H-pad-(lat-minLat)/(maxLat-minLat||1)*(H-2*pad);
                const pts=tracePoints.map(p=>`${sx(p.lng).toFixed(1)},${sy(p.lat).toFixed(1)}`).join(" ");
                return (
                  <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",border:`1px solid #BFDBFE`,background:"#F0F9FF"}}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                      <polyline points={pts} fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Départ */}
                      <circle cx={sx(tracePoints[0].lng)} cy={sy(tracePoints[0].lat)} r="5" fill="#065F46"/>
                      <text x={sx(tracePoints[0].lng)+7} y={sy(tracePoints[0].lat)+4} fontSize="9" fill="#065F46" fontWeight="700">Départ</text>
                      {/* Arrivée */}
                      <circle cx={sx(tracePoints[tracePoints.length-1].lng)} cy={sy(tracePoints[tracePoints.length-1].lat)} r="5" fill={traceActif?"#1E40AF":"#991B1B"}/>
                      {!traceActif&&<text x={sx(tracePoints[tracePoints.length-1].lng)+7} y={sy(tracePoints[tracePoints.length-1].lat)+4} fontSize="9" fill="#991B1B" fontWeight="700">Fin</text>}
                    </svg>
                  </div>
                );
              })()}

              {traceError&&(
                <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#991B1B",marginBottom:10}}>
                  ⚠️ {traceError}
                </div>
              )}

              {/* Boutons de contrôle */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {!traceActif?(
                  <button onClick={demarrerTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#1E40AF",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ▶ Démarrer le tracé GPS
                  </button>
                ):(
                  <button onClick={arreterTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#991B1B",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ⏹ Terminer le tracé
                  </button>
                )}
                <button onClick={ajouterPointManuel} disabled={traceActif} style={{
                  flex:1,height:44,borderRadius:10,border:`1.5px solid ${C.blue}`,
                  background:traceActif?"#e5e7eb":C.blueL,color:traceActif?C.tx3:C.blue,
                  fontWeight:600,fontSize:13,cursor:traceActif?"not-allowed":"pointer"}}>
                  📍 Point manuel
                </button>
                {tracePoints.length>0&&!traceActif&&(
                  <button onClick={effacerTrace} style={{
                    height:44,padding:"0 14px",borderRadius:10,border:`1.5px solid ${C.bd}`,
                    background:"#fff",color:C.tx3,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                    🗑️
                  </button>
                )}
              </div>

              {/* Guide */}
              {tracePoints.length===0&&!traceActif&&(
                <div style={{marginTop:10,fontSize:11,color:C.tx3,lineHeight:1.6}}>
                  <strong>▶ Démarrer le tracé</strong> : conduisez ou marchez sur la piste — l'app enregistre un point toutes les 8 s.<br/>
                  <strong>📍 Point manuel</strong> : pour les zones sans signal, capturez chaque virage manuellement.
                </div>
              )}
            </div>

            <button style={{padding:"12px",borderRadius:12,background:"#1E40AF",border:"none",
              color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}
              onClick={()=>setTab("liste")}>
              ✓ Enregistrer le tronçon {tracePoints.length>0?`(tracé ${distLabel} — ${tracePoints.length} pts)`:""}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTRAINTES ── */}
      {tab==="contraintes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              ⚠️ Règles techniques de desserte forestière
            </div>
            {[
              {titre:"Pente maximale",detail:"12 % pour les engins de débardage courants. Au-delà, étude de faisabilité requise. En zone humide : 8 % recommandé.",col:"#991B1B",bg:"#FEE2E2"},
              {titre:"Largeur minimale",detail:"3,5 m de plateforme pour permettre le croisement avec une marge latérale. Voie principale : 4 m recommandé. Accès DFCI : 4 m minimum.",col:"#B45309",bg:"#FEF3C7"},
              {titre:"Portance minimale poids lourds",detail:"19 t admissibles pour un grumier. Vérifier les ouvrages d'art (ponts, buses) indépendamment de la chaussée.",col:"#1E40AF",bg:"#DBEAFE"},
              {titre:"Place de dépôt",detail:"Superficie minimale 400 m² pour un stockage bord de route opérationnel. Drainage impératif.",col:"#065F46",bg:"#D1FAE5"},
              {titre:"Retournement",detail:"Aire de retournement recommandée tous les 300 m sur voie sans issue. Rayon de giration ≥ 10 m pour grumier.",col:"#7C3AED",bg:"#EDE9FE"},
              {titre:"Accès DFCI",detail:"Pour être classé accès DFCI : largeur ≥ 4 m, pente ≤ 10 %, dégagement vertical ≥ 4 m, possibilité de demi-tour tous les 500 m.",col:"#DC2626",bg:"#FEE2E2"},
            ].map(r=>(
              <div key={r.titre} style={{padding:"10px 12px",borderRadius:10,
                background:r.bg,border:`1px solid ${r.col}33`,marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:800,color:r.col,marginBottom:3}}>{r.titre}</div>
                <div style={{fontSize:11,color:C.tx,lineHeight:1.6}}>{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DIAGNOSTIC TERRAIN ── */}
      {tab==="diagnostic"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:4}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🔍 Diagnostics terrain récents</div>
            {DEMO_DIAGNOSTICS.map(d=>{
              const trc=DEMO_TRONCONS.find(t=>t.id===d.tronconId);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===d.praticabilite)||PRATICABILITE_OPTS[4];
              return (
                <div key={d.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{trc?.nom||d.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Visité le {d.date} · {d.validePar}</div>
                    </div>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:prat.bg,color:prat.col}}>
                      {prat.icon} {prat.label}
                    </span>
                  </div>
                  {d.obstacles.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                      {d.obstacles.map(o=>(
                        <span key={o} style={{padding:"2px 8px",borderRadius:6,fontSize:11,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>
                      ))}
                    </div>
                  )}
                  {d.commentaire&&<div style={{fontSize:12,color:C.tx2,fontStyle:"italic"}}>"{d.commentaire}"</div>}
                  {d.photos>0&&<div style={{fontSize:11,color:C.tx3,marginTop:3}}>📷 {d.photos} photo(s)</div>}
                </div>
              );
            })}
          </div>

          {/* Formulaire nouveau diagnostic */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>➕ Saisir un diagnostic terrain</div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Tronçon</div>
            <select style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,padding:"0 12px",fontSize:14,marginBottom:10,background:"#fff",boxSizing:"border-box"}}>
              <option value="">— Sélectionner —</option>
              {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Praticabilité</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
              {PRATICABILITE_OPTS.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
                  borderRadius:9,border:`1.5px solid ${C.bd}`,background:"#fff",cursor:"pointer",fontSize:13}}>
                  <input type="radio" name="prat_diag" value={p.id}/>{p.icon} {p.label}
                </label>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Obstacles constatés</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {OBSTACLES_TYPES.map(o=>(
                <span key={o} style={{padding:"5px 10px",borderRadius:7,fontSize:12,border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",color:C.tx2}}>⚠️ {o}</span>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Commentaire</div>
            <textarea rows={2} placeholder="Observations terrain..." style={{width:"100%",borderRadius:10,border:`1px solid ${C.bd}`,padding:"10px 12px",fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:10}}/>
            <button style={{height:BTN_H,width:"100%",borderRadius:12,border:"none",background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              📷 Enregistrer le diagnostic
            </button>
          </div>
        </div>
      )}

      {/* ── ACCÈS POMPIERS & DFCI ── */}
      {tab==="dfci"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#FEE2E2",border:"1px solid #FCA5A5",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#7F1D1D",lineHeight:1.5}}>
            <strong>⚖️ Règle APPLITAG :</strong> APPLITAG inventorie, documente et priorise l'état des pistes. La décision réglementaire sur le classement DFCI reste humaine et appartient aux autorités compétentes (SDIS, ONF, préfecture).
          </div>

          {/* Points DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🚒 Équipements DFCI inventoriés</div>
            {DEMO_POINTS_DFCI.map(p=>{
              const ti=DFCI_TYPE_INFO[p.type]||DFCI_TYPE_INFO.citerne;
              const estOk=p.etat==="ok";
              return (
                <div key={p.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{ti.icon} {p.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Rattaché à {DEMO_TRONCONS.find(t=>t.id===p.tronconId)?.nom?.split("—")[0].trim()||p.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{p.acces} · Capacité : {p.capacite}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Dernier contrôle : {p.dernierControle} · {p.responsable}</div>
                    </div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:estOk?C.greenL:"#FEF3C7",color:estOk?C.greenD:C.amber,flexShrink:0}}>
                      {estOk?"✅ OK":"⚠️ À vérifier"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checklist accès pompier par tronçon */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📋 Checklist accès secours par tronçon</div>
            {DEMO_TRONCONS.map(t=>{
              const checks=[
                {label:"Largeur ≥ 4 m",ok:t.largeur>=4},
                {label:"Pente ≤ 10 %",ok:t.pentePct<=10},
                {label:"Zone de retournement",ok:t.retournement},
                {label:"Accès incendie déclaré",ok:!t.accesIncendie?.toLowerCase().includes("non")},
                {label:"Portance poids lourds",ok:t.portance==="renforcee"},
              ];
              const score=checks.filter(c=>c.ok).length;
              return (
                <div key={t.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{t.nom}</div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:score>=4?C.greenL:score>=2?"#FEF3C7":"#FEE2E2",
                      color:score>=4?C.greenD:score>=2?C.amber:C.red}}>
                      {score}/{checks.length} critères
                    </span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {checks.map(c=>(
                      <span key={c.label} style={{padding:"2px 8px",borderRadius:6,fontSize:11,
                        background:c.ok?C.greenL:"#FEE2E2",color:c.ok?C.greenD:"#991B1B"}}>
                        {c.ok?"✅":"❌"} {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Règles DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:8}}>📏 Critères classement accès DFCI</div>
            {[
              ["Largeur","≥ 4 m de plateforme"],
              ["Pente","≤ 10 %"],
              ["Dégagement vertical","≥ 4 m (passage engins pompiers)"],
              ["Retournement","Possible tous les 500 m maximum"],
              ["Signalétique","Balisage numéroté visible"],
              ["Clé pompier","Accès barrières avec triangle de Pompiers ou clé DFCI"],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",gap:12,padding:"5px 0",borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{l}</span>
                <span style={{color:C.tx,fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIORITÉ TRAVAUX ── */}
      {tab==="priorite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:12}}>📊 Score de priorité de rénovation</div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.5}}>
              Score calculé automatiquement à partir de : risque incendie + état de dégradation + accès secours + largeur + volume bois desservi. <strong>La décision de travaux reste humaine.</strong>
            </div>
            {[...DEMO_TRONCONS].sort((a,b)=>{
              const dA=DEMO_DIAGNOSTICS.find(d=>d.tronconId===a.id);
              const dB=DEMO_DIAGNOSTICS.find(d=>d.tronconId===b.id);
              return calcPriorite(b,dB)-calcPriorite(a,dA);
            }).map((t,i)=>{
              const diag=DEMO_DIAGNOSTICS.find(d=>d.tronconId===t.id);
              const score=calcPriorite(t,diag);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===diag?.praticabilite);
              const level=score>=7?"🔴 Priorité 1":score>=4?"🟠 Priorité 2":score>=2?"🟡 Priorité 3":"🟢 Priorité 4";
              return (
                <div key={t.id} style={{background:score>=7?"#FEE2E2":score>=4?"#FFEDD5":score>=2?"#FEF3C7":"#F0FDF4",
                  borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>#{i+1} {t.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>{t.proprietaire}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:22,color:score>=7?"#991B1B":score>=4?"#C2410C":score>=2?"#92400E":"#065F46"}}>{score}/10</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx3}}>{level}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                    <span style={{color:C.tx2}}>🚒 Accès incendie : <strong>{t.accesIncendie?.split("—")[0].trim()}</strong></span>
                    <span style={{color:C.tx2}}>↔️ Largeur : <strong>{t.largeur} m</strong></span>
                    <span style={{color:C.tx2}}>🔄 Retournement : <strong>{t.retournement?"Oui":"Non"}</strong></span>
                    <span style={{color:C.tx2}}>📦 Volume : <strong>{t.tonnageMobilisable} t</strong></span>
                    {prat&&<span style={{color:prat.col}}>🔍 État : <strong>{prat.label}</strong></span>}
                    {t.coutProjet>0&&<span style={{color:C.tx2}}>💶 Devis estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong></span>}
                  </div>
                  {diag?.obstacles?.length>0&&(
                    <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                      {diag.obstacles.map(o=><span key={o} style={{padding:"1px 7px",borderRadius:5,fontSize:10,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>)}
                    </div>
                  )}
                  {t.coutProjet>0&&(
                    <div style={{marginTop:8,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,.6)",fontSize:12,color:C.tx2}}>
                      💡 Financeurs potentiels : Fonds vert · FEADER · Région · Collectivité
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARTE placeholder ── */}
      {tab==="carte"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:40,textAlign:"center",
          border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🗺️</div>
          <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:6}}>
            Cartographie des tronçons
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.6}}>
            Visualisation des tronçons de desserte superposée aux parcelles forestières.
            <br/>Disponible dans la prochaine mise à jour avec intégration carte IGN / OpenStreetMap.
          </div>
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {DEMO_TRONCONS.map(t=>{
              const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
              return (
                <div key={t.id} style={{padding:"6px 12px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:st.bg,color:st.col}}>
                  {st.icon} {t.nom.split("—")[0].trim()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Onglet Signaler ────────────────────────────────── */}
      {tab==="signaler"&&<SignalementRapideDesserte onRetour={()=>setTab("liste")}/>}
    </div>
  );
};

// ── Formulaire de signalement rapide (inline dans Desserte) ───
const SignalementRapideDesserte = ({onRetour}) => {
  const [form, setForm] = useState({
    type:"",urgence:"orange",tronconId:"",tronconLibre:"",
    commentaire:"",profil:"Opérateur terrain",auteur:"",commune:"",
  });
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const captureGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{ setGps({lat:p.coords.latitude,lng:p.coords.longitude}); setGpsLoading(false); },
      ()=>setGpsLoading(false),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const envoyer = () => {
    if(!form.type||!form.urgence||(!form.tronconId&&!form.tronconLibre)||!form.auteur) return;
    const arr = signalementsGet();
    const nouveau = {
      id:"sg"+Date.now(), createdAt:new Date().toISOString(),
      auteur:form.auteur, profil:form.profil,
      tronconId:form.tronconId||"LIBRE", tronconNom:form.tronconLibre||form.tronconId,
      type:form.type, urgence:form.urgence,
      commentaire:form.commentaire, gps, photos:0,
      statut:"ouvert", commune:form.commune,
      validePar:null, traitePar:null, dateTraitement:null,
    };
    signalementsSet([nouveau,...arr]);
    setEnvoye(true);
  };

  if(envoye) return (
    <div style={{textAlign:"center",padding:"40px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:8}}>Signalement enregistré</div>
      <div style={{fontSize:13,color:C.tx2,marginBottom:20,lineHeight:1.6}}>
        Votre signalement a été transmis à la banque de données APPLITAG Data.<br/>
        Il sera traité par le gestionnaire du territoire.
      </div>
      <button onClick={onRetour} style={{height:BTN_H,width:"100%",maxWidth:300,borderRadius:12,border:"none",
        background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        Retour à la desserte
      </button>
    </div>
  );

  const F = ({label,children}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
  const sel = {height:INPUT_H,borderRadius:8,border:`1.5px solid ${C.bd}`,
    fontSize:FONT_INPUT,padding:"0 12px",background:"#fff",color:C.tx,width:"100%",fontFamily:"inherit"};

  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{background:"#991B1B",borderRadius:12,padding:"14px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontWeight:800,fontSize:16,marginBottom:2}}>🚨 Signaler une anomalie</div>
        <div style={{fontSize:12,opacity:.85}}>Ce signalement sera versé dans APPLITAG Data, accessible à tous les gestionnaires et collectivités.</div>
        <button onClick={captureGps} disabled={gpsLoading} style={{
          marginTop:12,height:40,borderRadius:8,border:"1.5px solid rgba(255,255,255,.4)",padding:"0 16px",
          background:gps?"rgba(0,0,0,.25)":"rgba(255,255,255,.15)",
          color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>
          {gpsLoading?"⏳ Localisation en cours…":gps?`📍 Position captée : ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </div>

      <F label="Votre nom / organisme *">
        <input value={form.auteur} onChange={e=>setForm({...form,auteur:e.target.value})}
          placeholder="Ex : Martin Dupont" style={{...sel,display:"block"}}/>
      </F>
      <F label="Profil">
        <select value={form.profil} onChange={e=>setForm({...form,profil:e.target.value})} style={sel}>
          {SOURCES_PROFIL.map(p=><option key={p}>{p}</option>)}
        </select>
      </F>
      <F label="Tronçon concerné">
        <select value={form.tronconId} onChange={e=>setForm({...form,tronconId:e.target.value,tronconLibre:""})}
          style={{...sel,marginBottom:6,display:"block"}}>
          <option value="">-- Choisir un tronçon connu --</option>
          {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.id} — {t.nom}</option>)}
        </select>
        <input value={form.tronconLibre} onChange={e=>setForm({...form,tronconLibre:e.target.value,tronconId:""})}
          placeholder="Ou saisir librement : lieu-dit, commune…" style={{...sel,display:"block"}}/>
      </F>
      <F label="Commune">
        <input value={form.commune} onChange={e=>setForm({...form,commune:e.target.value})}
          placeholder="Ex : Saint-Bonnet-Tronçais" style={{...sel,display:"block"}}/>
      </F>
      <F label="Type d'anomalie *">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {TYPES_ANOMALIE.map(a=>(
            <button key={a.id} onClick={()=>setForm({...form,type:a.id})} style={{
              padding:"8px 10px",borderRadius:8,fontSize:12,fontWeight:form.type===a.id?700:400,
              border:`1.5px solid ${form.type===a.id?"#1E3A5F":C.bd}`,cursor:"pointer",
              background:form.type===a.id?"#1E3A5F":"#fff",
              color:form.type===a.id?"#fff":C.tx,textAlign:"left"}}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Niveau d'urgence *">
        <div style={{display:"flex",gap:6}}>
          {Object.entries(URGENCES).map(([k,u])=>(
            <button key={k} onClick={()=>setForm({...form,urgence:k})} style={{
              flex:1,padding:"8px 6px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              border:`1.5px solid ${form.urgence===k?u.col:C.bd}`,
              background:form.urgence===k?u.bg:"#fff",color:form.urgence===k?u.col:C.tx2}}>
              {u.icon} {u.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Description (facultatif)">
        <textarea value={form.commentaire} onChange={e=>setForm({...form,commentaire:e.target.value})}
          placeholder="Décrivez l'anomalie, son étendue, les risques…" rows={3}
          style={{...sel,height:"auto",padding:"10px 12px",resize:"vertical",display:"block"}}/>
      </F>
      <F label="Localisation GPS">
        <button onClick={captureGps} disabled={gpsLoading} style={{
          height:42,borderRadius:8,border:`1.5px solid ${C.bd}`,padding:"0 16px",
          background:gps?"#D1FAE5":"#fff",color:gps?"#065F46":C.tx2,fontSize:13,cursor:"pointer"}}>
          {gpsLoading?"⏳ Localisation…":gps?`📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </F>

      <button onClick={envoyer} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginTop:8,
        background:(!form.type||!form.auteur||(!form.tronconId&&!form.tronconLibre))?"#9CA3AF":"#991B1B",
        color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>
        🚨 Envoyer le signalement
      </button>
      <button onClick={onRetour} style={{
        width:"100%",height:40,borderRadius:12,border:`1.5px solid ${C.bd}`,marginTop:8,
        background:"transparent",color:C.tx2,fontSize:13,cursor:"pointer"}}>
        Annuler
      </button>
    </div>
  );
};
