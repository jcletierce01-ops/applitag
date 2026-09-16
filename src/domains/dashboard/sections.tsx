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

/* ═══════════════════════════════════════════════════════════════
   MODULE COPRODUITS DE SCIERIE
═══════════════════════════════════════════════════════════════ */
const COPRODUIT_CATS = [
  {id:"ecorces",    ico:"🪵", l:"Écorces",           col:"#7C3AED", bg:"#EDE9FE"},
  {id:"sciures",    ico:"🌫️", l:"Sciures",            col:"#B45309", bg:"#FEF3C7"},
  {id:"plaquettes", ico:"🪚", l:"Plaquettes",         col:"#1E5B3A", bg:"#D1FAE5"},
  {id:"dosses",     ico:"🪜", l:"Dosses / délignures", col:"#1E40AF", bg:"#DBEAFE"},
  {id:"chutes",     ico:"🔪", l:"Chutes bout/tête",   col:"#065F46", bg:"#CCFBF1"},
];
const DESTINATION_COPRODS = [
  {v:"energie_interne","l":"Énergie interne (chaudière scierie)"},
  {v:"vente_energie",  "l":"Vente — bois énergie tiers"},
  {v:"vente_matiere",  "l":"Vente — matière (panneaux, pâte)"},
  {v:"compostage",     "l":"Compostage / amendement"},
  {v:"stock",          "l":"Stocké — destination à définir"},
];
const DEMO_STOCKS_COPRODS = [
  {id:"SC-001",scierie:"Scierie Moreau — Moulins",cat:"plaquettes",humidite:28,
   stockTonnes:145,qualite:"P31",destination:"vente_energie",
   enlevement:"2026-08-15",prixTonne:38,margeTonne:12,saisonnel:false},
  {id:"SC-002",scierie:"Scierie Moreau — Moulins",cat:"sciures",humidite:45,
   stockTonnes:62,qualite:"vrac",destination:"energie_interne",
   enlevement:null,prixTonne:0,margeTonne:0,saisonnel:true},
  {id:"SC-003",scierie:"Scierie du Morvan — Château-Chinon",cat:"ecorces",humidite:52,
   stockTonnes:89,qualite:"mélange",destination:"compostage",
   enlevement:"2026-09-01",prixTonne:8,margeTonne:2,saisonnel:false},
  {id:"SC-004",scierie:"Scierie du Morvan — Château-Chinon",cat:"dosses",humidite:35,
   stockTonnes:34,qualite:"hêtre/chêne",destination:"vente_matiere",
   enlevement:"2026-08-01",prixTonne:55,margeTonne:18,saisonnel:false},
  {id:"SC-005",scierie:"Scierie Lefebvre — Clamecy",cat:"plaquettes",humidite:30,
   stockTonnes:210,qualite:"P45",destination:"vente_energie",
   enlevement:"2026-07-30",prixTonne:42,margeTonne:15,saisonnel:false},
];

export const SectionCoproduits = () => {
  const [tab,     setTab]     = useState("stocks");
  const [filtCat, setFiltCat] = useState("tous");
  const [selId,   setSelId]   = useState(null);

  // LOTs secondaires générés depuis Scierie
  const lotsSec = lotsSecGet();

  const stocks = filtCat==="tous"
    ? DEMO_STOCKS_COPRODS
    : DEMO_STOCKS_COPRODS.filter(s=>s.cat===filtCat);

  const totalStock  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes,0);
  const totalCa     = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.prixTonne,0);
  const totalMarge  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.margeTonne,0);
  const nbEnlev     = DEMO_STOCKS_COPRODS.filter(c=>c.enlevement&&new Date(c.enlevement)<=new Date(Date.now()+30*864e5)).length;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            ♻️ Coproduits de scierie
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Écorces · Sciures · Plaquettes · Dosses · Qualification · Débouchés
          </div>
        </div>
        {/* Badge FEADER */}
        <div style={{background:"#EDE9FE",border:"1.5px solid #7C3AED",borderRadius:10,
          padding:"6px 14px",fontSize:11,fontWeight:700,color:"#5B21B6"}}>
          🇪🇺 FEADER Grand Est — phase 2 : 15/09 → 31/12/2026
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📦",l:"Stock total",     v:`${totalStock} t`,              col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"💶",l:"CA potentiel",    v:`${(totalCa/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📈",l:"Marge estimée",   v:`${(totalMarge/1000).toFixed(1)} k€`,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",l:"Enlèvements J30",  v:nbEnlev,                      col:"#B45309",bg:"#FEF3C7"},
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
        {[["stocks","📦","Stocks par catégorie"],["flux","🔄","Flux & enlèvements"],
          ["lots_lies","🌲","Lots liés"],["feader","🇪🇺","FEADER Grand Est"],["risques","⚠️","Risques & règles"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── STOCKS ── */}
      {tab==="stocks"&&(
        <div>
          {/* Filtres catégorie */}
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
            <button onClick={()=>setFiltCat("tous")} style={{
              flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
              border:`1.5px solid ${filtCat==="tous"?"#374151":C.bd}`,
              background:filtCat==="tous"?"#374151":"transparent",
              color:filtCat==="tous"?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
              Tous
            </button>
            {COPRODUIT_CATS.map(c=>(
              <button key={c.id} onClick={()=>setFiltCat(c.id)} style={{
                flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${filtCat===c.id?c.col:C.bd}`,
                background:filtCat===c.id?c.bg:"transparent",
                color:filtCat===c.id?c.col:C.tx2,WebkitTapHighlightColor:"transparent"}}>
                {c.ico} {c.l}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {stocks.map(s=>{
              const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
              const dest = DESTINATION_COPRODS.find(d=>d.v===s.destination);
              const isOpen = selId===s.id;
              const enlev = s.enlevement ? new Date(s.enlevement) : null;
              const urgent = enlev && enlev <= new Date(Date.now()+14*864e5);
              return (
                <div key={s.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1.5px solid ${urgent?"#FCA5A5":cat.col+"44"}`}}>
                  <div onClick={()=>setSelId(isOpen?null:s.id)}
                    style={{padding:"12px 14px",cursor:"pointer",
                      display:"flex",alignItems:"center",gap:12,
                      background:isOpen?cat.bg+"50":"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:24,flexShrink:0}}>{cat.ico}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:cat.bg,color:cat.col}}>{cat.l}</span>
                        {urgent&&<span style={{fontSize:10,fontWeight:800,padding:"2px 7px",
                          borderRadius:10,background:"#FEE2E2",color:"#991B1B"}}>🚛 Enlèvement urgent</span>}
                        <span style={{fontSize:10,color:C.tx3}}>{s.qualite}</span>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        Humidité {s.humidite}% · {dest?.l||s.destination}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:16,fontWeight:900,color:cat.col}}>{s.stockTonnes} t</div>
                      {s.prixTonne>0&&<div style={{fontSize:10,color:C.tx3}}>{s.prixTonne} €/t</div>}
                    </div>
                    <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 14px",
                      background:"#FAFAFA",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        ["📦 Stock",`${s.stockTonnes} t`],
                        ["💧 Humidité",`${s.humidite} %`],
                        ["🏷️ Qualité",s.qualite],
                        ["💶 Prix/tonne",s.prixTonne>0?`${s.prixTonne} €/t`:"Non valorisé"],
                        ["📈 Marge/tonne",s.margeTonne>0?`${s.margeTonne} €/t`:"—"],
                        ["🚛 Enlèvement",s.enlevement?new Date(s.enlevement).toLocaleDateString("fr-FR"):"Non planifié"],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOTS LIÉS (issus de Scierie) ── */}
      {tab==="lots_lies"&&(
        <div>
          <div style={{background:"#D1FAE5",border:"1.5px solid #10B981",borderRadius:12,
            padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>🌲</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#065F46"}}>Lots secondaires — traçabilité scierie</div>
              <div style={{fontSize:12,color:"#047857",marginTop:2}}>
                Chaque enlèvement de coproduit génère automatiquement un LOT traçable (LOT-SC-AAAA-NNN).
              </div>
            </div>
            <div style={{marginLeft:"auto",fontWeight:800,fontSize:22,color:"#065F46"}}>{lotsSec.length}</div>
          </div>

          {lotsSec.length===0&&(
            <div style={{background:C.bg2,borderRadius:12,padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>
              Aucun lot secondaire encore généré.<br/>
              <span style={{fontSize:12}}>Créez un enlèvement dans le module Scierie pour générer un LOT traçable.</span>
            </div>
          )}

          {lotsSec.map(l=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===l.coproduitType)||COPRODUIT_CATS[0];
            return (
              <div key={l.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
                padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontWeight:800,fontSize:13,color:"#065F46",background:"#D1FAE5",
                        padding:"2px 10px",borderRadius:8}}>🌲 {l.lotNumero}</span>
                      <span style={{fontSize:11,background:cat.bg,color:cat.col,
                        padding:"2px 8px",borderRadius:8,fontWeight:700}}>{cat.ico} {cat.l}</span>
                    </div>
                    <div style={{fontSize:12,color:C.tx3}}>
                      Destination : <strong>{l.destination}</strong>
                      {l.transporteur&&` · Transport : ${l.transporteur}`}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      Créé le {l.date} · Origine : {l.origine}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:16,color:C.tx}}>{l.tonnage} t</div>
                    {l.prixTonne>0&&(
                      <div style={{fontSize:12,color:C.green,marginTop:2}}>
                        {(l.tonnage*l.prixTonne).toLocaleString("fr-FR")} €
                      </div>
                    )}
                    <div style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:8,marginTop:4,
                      background:"#DBEAFE",color:"#1E40AF"}}>
                      {l.statut==="EN_LIVRAISON"?"🚛 En livraison":"📦 Planifié"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEADER ── */}
      {tab==="feader"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",borderRadius:12,
            padding:"14px",border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              🇪🇺 FEADER – Région Grand Est · Première transformation
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7,marginBottom:10}}>
              Soutien aux scieries : traçabilité, adaptation à l'hétérogénéité de la ressource,
              valorisation des coproduits, circuits courts, maîtrise de l'énergie, optimisation de la production.
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                ["Phase 1","Fermée le 31/07/2026","#991B1B","#FEE2E2"],
                ["Phase 2","15/09 → 31/12/2026","#065F46","#D1FAE5"],
              ].map(([ph,d,col,bg])=>(
                <div key={ph} style={{padding:"8px 14px",borderRadius:10,
                  background:bg,border:`1px solid ${col}44`}}>
                  <div style={{fontSize:11,fontWeight:800,color:col}}>{ph}</div>
                  <div style={{fontSize:10,color:col}}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              🎯 Opportunité APPLITAG — Composante numérique
            </div>
            {[
              ["🔗","Traçabilité grume → production → coproduit","Lien lot forestier → flux scierie → stock connexe"],
              ["📦","Stock connexes par catégorie","Écorces / sciures / plaquettes / dosses / chutes"],
              ["💧","Humidité et qualité mesurées","Base facturable, RED-compatible"],
              ["🔀","Destination matière ou énergie","Distinction obligatoire SNBC 3"],
              ["🚛","Suivi des enlèvements","Planning + confirmation livraison"],
              ["📈","Coût et marge par flux","Rentabilité par coproduit et par scierie"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"10px 12px",background:"#FFFBEB",borderRadius:8,
              border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
              ⚠️ L'éligibilité d'une composante numérique doit être vérifiée dans le règlement régional
              avant tout dépôt de dossier.
            </div>
          </div>

          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:8}}>
              Action recommandée — 10 scieries Grand Est
            </div>
            <div style={{fontSize:11,color:"#7C2D12",lineHeight:1.7,marginBottom:10}}>
              Établir une liste de 10 scieries du Grand Est et leur proposer :<br/>
              <strong>« Diagnostic de valorisation et de traçabilité des coproduits de scierie »</strong>
            </div>
            {["Volumes disponibles par catégorie","Saisonnalité des flux",
              "Qualité et humidité mesurée","Capacité de stockage",
              "Débouchés actuels et potentiels","Transport et logistique",
              "Revenu potentiel par flux"].map(p=>(
              <div key={p} style={{fontSize:11,color:"#7C2D12",padding:"3px 0",
                display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#D97706"}}>▶</span> {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RISQUES ── */}
      {tab==="risques"&&(
        <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
          border:"1.5px solid #FED7AA",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:4}}>
            ⚠️ Risques à éviter
          </div>
          {[
            ["Confondre coproduit disponible et volume commercialement sécurisé",
             "Un stock ne vaut que s'il est qualifié (humidité, qualité, accessibilité) et qu'un débouché est confirmé."],
            ["Ne pas distinguer les débouchés matière et énergie",
             "Obligation SNBC 3 : la hiérarchie des usages impose de tracer matière avant énergie."],
            ["Présenter APPLITAG comme une dépense informatique isolée",
             "La composante numérique doit être intégrée à un projet de transformation — pas présentée seule."],
            ["Attendre la phase 2 sans commencer à qualifier les scieries",
             "La phase 2 ouvre le 15/09/2026. Les contacts et diagnostics peuvent commencer maintenant."],
          ].map(([t,d])=>(
            <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
              borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
              <span style={{fontSize:14,flexShrink:0}}>🚫</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FLUX placeholder ── */}
      {tab==="flux"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_STOCKS_COPRODS.filter(s=>s.enlevement).sort((a,b)=>a.enlevement.localeCompare(b.enlevement)).map(s=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
            const enlev = new Date(s.enlevement);
            const urgent = enlev <= new Date(Date.now()+14*864e5);
            return (
              <div key={s.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                border:`1.5px solid ${urgent?"#FCA5A5":C.bd}`,
                display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{cat.ico}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                    {cat.l} · {s.stockTonnes} t · Humidité {s.humidite}%
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,
                    color:urgent?"#991B1B":"#1E40AF"}}>
                    {enlev.toLocaleDateString("fr-FR")}
                  </div>
                  {s.prixTonne>0&&(
                    <div style={{fontSize:10,color:C.tx3}}>
                      {(s.stockTonnes*s.prixTonne).toLocaleString("fr-FR")} €
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODULE PROJET FINANCÉ — SOCLE GÉNÉRIQUE
═══════════════════════════════════════════════════════════════ */
const ETAPES_PROJET = [
  {id:"diagnostic",  ico:"🔍", l:"Diagnostic initial"},
  {id:"depot",       ico:"📋", l:"Dépôt dossier"},
  {id:"decision",    ico:"⚖️", l:"Décision"},
  {id:"travaux",     ico:"🪓", l:"Travaux"},
  {id:"controle",    ico:"📸", l:"Contrôle"},
  {id:"volumes",     ico:"📦", l:"Volumes produits"},
  {id:"destinations",ico:"🔀", l:"Destinations"},
  {id:"resultats",   ico:"📈", l:"Résultats"},
];
const DEMO_PROJETS_FINANCES = [
  {
    id:"PRJ-2026-001",
    nom:"Desserte parcelles Battet Nord",
    dispositif:"FEADER – Développement rural Grand Est",
    dateLimite:"2026-12-31",
    porteur:"SCIC Forêt de Tronçais",
    partenaires:["Commune de Tronçais","DDT Allier"],
    etapeActuelle:"travaux",
    depensesPrev:42000, depensesReelles:18500,
    parcelle:"B 112 / B 113",
    entreprise:"SARL Travaux Forestiers Allier",
    photosAvant:2, photosApres:1,
    volumesMobilises:280, coproduits:"Plaquettes 45 t",
    debouches:"Chaufferie intercommunale Moulins",
    indicateursFinanceur:"Surface desservie (ha), Tonnage mobilisé, Emplois créés",
    statut:"en_cours",
    piecesOk:["Devis signé","Plan de situation","Extrait cadastral"],
    piecesManquantes:["Attestation assurance maîtrise d'ouvrage","PV de réception travaux"],
  },
  {
    id:"PRJ-2026-002",
    nom:"Traçabilité coproduits scierie Moreau",
    dispositif:"FEADER – Première transformation Grand Est",
    dateLimite:"2026-12-31",
    porteur:"Scierie Moreau SAS",
    partenaires:["ALTEGAD SAS","Région Grand Est"],
    etapeActuelle:"diagnostic",
    depensesPrev:28000, depensesReelles:0,
    parcelle:"Site industriel Moulins",
    entreprise:"ALTEGAD SAS",
    photosAvant:0, photosApres:0,
    volumesMobilises:0, coproduits:"À qualifier",
    debouches:"À définir",
    indicateursFinanceur:"Volumes connexes tracés, Humidité mesurée, Destinations qualifiées",
    statut:"preparation",
    piecesOk:["Statuts entreprise","Bilan N-1"],
    piecesManquantes:["Devis prestataire numérique","Plan de financement","Attestation expert-comptable"],
  },
];

export const SectionProjetFinance = () => {
  const [tab,    setTab]    = useState("liste");
  const [selId,  setSelId]  = useState(null);
  const _proj = selId ? DEMO_PROJETS_FINANCES.find(p=>p.id===selId) : null;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            📐 Projets financés
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Socle générique · Dispositif → Parcelle → Travaux → Volumes → Résultats
          </div>
        </div>
        <button style={{padding:"10px 18px",borderRadius:12,background:"#7C3AED",border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau projet
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📐",l:"Projets",           v:DEMO_PROJETS_FINANCES.length,          col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Dépenses prév.",    v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesPrev,0)/1000).toFixed(0)} k€`,col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"✅",l:"Dép. réelles",      v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesReelles,0)/1000).toFixed(0)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📋",l:"Pièces manquantes", v:DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.piecesManquantes.length,0),col:"#B45309",bg:"#FEF3C7"},
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
        {[["liste","📋","Projets"],["parcours","🗺️","Parcours type"],
          ["indicateurs","📊","Indicateurs financeur"],["socle","⚙️","Socle générique"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE PROJETS ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {DEMO_PROJETS_FINANCES.map(p=>{
            const etapeIdx = ETAPES_PROJET.findIndex(e=>e.id===p.etapeActuelle);
            const pctAvancement = Math.round((etapeIdx+1)/ETAPES_PROJET.length*100);
            const isOpen = selId===p.id;
            const nbManq = p.piecesManquantes.length;
            return (
              <div key={p.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${nbManq>0?"#FCA5A5":"#A5B4FC"}`}}>
                <div onClick={()=>setSelId(isOpen?null:p.id)}
                  style={{padding:"14px",cursor:"pointer",
                    display:"flex",flexDirection:"column",gap:8,
                    background:isOpen?"#F5F3FF":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#7C3AED"}}>
                          {p.id}
                        </span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:p.statut==="en_cours"?"#D1FAE5":"#DBEAFE",
                          color:p.statut==="en_cours"?"#065F46":"#1E40AF"}}>
                          {p.statut==="en_cours"?"En cours":"En préparation"}
                        </span>
                        {nbManq>0&&(
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:"#FEE2E2",color:"#991B1B"}}>
                            ⚠️ {nbManq} pièce{nbManq>1?"s":""} manquante{nbManq>1?"s":""}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:3}}>{p.nom}</div>
                      <div style={{fontSize:11,color:"#5B21B6",fontWeight:600}}>{p.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {p.porteur} · 📅 {new Date(p.dateLimite).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>{pctAvancement}%</div>
                      <div style={{fontSize:10,color:C.tx3}}>avancement</div>
                    </div>
                  </div>
                  {/* Barre progression pipeline */}
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:2,marginBottom:4}}>
                      {ETAPES_PROJET.map((e,i)=>(
                        <div key={e.id} style={{flex:1,height:5,borderRadius:3,
                          background:i<=etapeIdx?"#7C3AED":"#E5E7EB"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:"#7C3AED",fontWeight:700}}>
                      {ETAPES_PROJET[etapeIdx]?.ico} {ETAPES_PROJET[etapeIdx]?.l}
                    </div>
                  </div>
                </div>

                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA",
                    display:"flex",flexDirection:"column",gap:12}}>

                    {/* Infos générales */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["📍 Parcelle/site",p.parcelle],
                        ["🏢 Entreprise",p.entreprise],
                        ["💶 Dépenses prév.",`${p.depensesPrev.toLocaleString("fr-FR")} €`],
                        ["✅ Dépenses réelles",`${p.depensesReelles.toLocaleString("fr-FR")} €`],
                        ["📸 Photos avant",`${p.photosAvant}`],
                        ["📸 Photos après",`${p.photosApres}`],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Résultats */}
                    {(p.volumesMobilises>0||p.coproduits!=="À qualifier")&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                        {[
                          ["📦 Volumes mobilisés",p.volumesMobilises>0?`${p.volumesMobilises} m³`:"—"],
                          ["♻️ Coproduits",p.coproduits],
                          ["🔀 Débouchés",p.debouches],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:"#F0FDF4",borderRadius:8,padding:"8px 10px",
                            border:"1px solid #86EFAC"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:11,fontWeight:700,color:"#065F46"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pièces */}
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>
                        📋 Pièces justificatives
                      </div>
                      {p.piecesOk.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#065F46"}}>
                          <span>✅</span>{pc}
                        </div>
                      ))}
                      {p.piecesManquantes.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#991B1B",fontWeight:600}}>
                          <span>⏳</span>{pc}
                        </div>
                      ))}
                    </div>

                    {/* Indicateurs financeur */}
                    <div style={{background:"#EDE9FE",borderRadius:8,padding:"10px 12px",
                      border:"1px solid #C4B5FD"}}>
                      <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:4}}>
                        📊 Indicateurs exigés par le financeur
                      </div>
                      <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.6}}>
                        {p.indicateursFinanceur}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PARCOURS TYPE ── */}
      {tab==="parcours"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>
            Parcours générique — Projet financé APPLITAG
          </div>
          {ETAPES_PROJET.map((e,i)=>(
            <div key={e.id} style={{display:"flex",gap:14,alignItems:"flex-start",
              padding:"12px 14px",borderRadius:12,background:"#fff",
              border:"1.5px solid #A5B4FC"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#7C3AED",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:900,fontSize:14,flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:20,flexShrink:0,marginTop:6}}>{e.ico}</span>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>{e.l}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:3}}>
                  {[
                    "Parcelle, surface, état initial, essences, volumes estimés",
                    "Dispositif, date limite, porteur, partenaires, budget prévisionnel, pièces",
                    "Acte attributif, montant accordé, conditions",
                    "Entreprise, planning, dépenses réelles, photos en cours",
                    "Photos avant/après, mesures, PV réception",
                    "Tonnage mobilisé, essence, humidité, qualité",
                    "Matière / Énergie, clients, enlèvements, prix",
                    "Bilan économique, indicateurs financeur, rapport final",
                  ][i]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INDICATEURS ── */}
      {tab==="indicateurs"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
            Indicateurs clés exigés par les financeurs (socle commun)
          </div>
          {[
            {grp:"Foncier & territoire",items:["Surface bénéficiaire (ha)","Parcelles cadastrées","Communes concernées"]},
            {grp:"Travaux",items:["Linéaire de desserte créé/réhabilité (ml)","Entreprise et heures travaillées","Dépenses vérifiées (€ HT)"]},
            {grp:"Production",items:["Volume mobilisé (m³ et t)","Essences et qualités","Humidité mesurée (%)"]},
            {grp:"Valorisation",items:["Destination matière vs énergie","Prix de vente / tonne","Marge nette / tonne","Clients et circuits"]},
            {grp:"Impact",items:["Emplois créés ou maintenus","Réduction transport (km)","Émissions GES évitées (tCO₂eq)"]},
          ].map(g=>(
            <div key={g.grp} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:6}}>
                {g.grp}
              </div>
              {g.items.map(it=>(
                <div key={it} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                  fontSize:11,color:C.tx}}>
                  <span style={{color:"#7C3AED",flexShrink:0}}>▶</span>{it}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── SOCLE GÉNÉRIQUE ── */}
      {tab==="socle"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#EDE9FE",borderRadius:12,padding:"14px",
            border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              ⚙️ Principe — Socle générique + modèles paramétrables
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7}}>
              Construire un socle commun de gestion des projets financés, puis ajouter des
              <strong> modèles paramétrables par dispositif</strong>.
              Un module différent par aide produirait une application lourde et rapidement obsolète.
            </div>
          </div>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Impact commercial — 6 types d'utilisateurs servis par un seul module
            </div>
            {[
              ["🌲","Propriétaires forestiers","Desserte, travaux, valorisation"],
              ["🏭","Scieries",               "Traçabilité, coproduits, FEADER"],
              ["🏛️","Collectivités",           "Aménagement, DFCI, subventions"],
              ["📐","Bureaux d'études",        "Diagnostic, suivi, reporting"],
              ["💶","Financeurs",              "Indicateurs, pièces, contrôle"],
              ["🔥","Fournisseurs bois-énergie","Volumes, qualité, destinations"],
            ].map(([ico,t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{t}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── TABLEAU DE BORD DESKTOP (ADMIN) ────────────────────────────

// ── PARCELLES — TRAVAUX — FLUX — RÉSULTATS ─────────────────────

const QUALITES_BOIS = [
  {id:"bo",  label:"Bois d'œuvre",      icon:"🪵", couleur:"#1E5B3A", bg:"#D1FAE5", usage:"matiere",
   desc:"Sciage, déroulage, charpente, menuiserie — stockage carbone long terme"},
  {id:"bi",  label:"Bois d'industrie",  icon:"📦", couleur:"#0369A1", bg:"#DBEAFE", usage:"matiere",
   desc:"Pâte à papier, panneaux, palettes — valorisation matière intermédiaire"},
  {id:"be",  label:"Bois énergie",      icon:"🔥", couleur:"#B45309", bg:"#FEF3C7", usage:"energie",
   desc:"Plaquettes forestières, bûches, granulés — valorisation énergétique"},
];

const DEMO_PARCELLE = {
  id:"p1",
  ref:"PAR-2026-001",
  nom:"Forêt Bernard — Tronçais Nord",
  commune:"Saint-Bonnet-Tronçais",
  canton:"Allier (03)",
  surface:12.4,
  essencePrincipale:"Chêne sessile (Quercus petraea)",
  essencesSecondaires:["Charme","Acacia","Bouleau"],
  proprietaire:"M. Henri Bernard",
  mandataire:"Sylvie Moreau — Cabinet Forêt Conseil",
  coordGPS:{lat:46.5831,lng:2.7654},

  diagnostic:{
    date:"2026-03-15",
    auteur:"Sylvie Moreau",
    etatSanitaire:"moyen",
    risques:["Scolytes (Ips typographus) — foyer détecté à 800 m","Dépérissement chêne — 12% des tiges","Vent dominant O-NO — risque chablis sur parquet est"],
    notes:"Peuplement de 90 ans, densité excessive (800 tiges/ha). Régénération naturelle absente sous couvert. Intervention urgente sur zone sanitaire (2,1 ha). Reste en futaie jardinée.",
    urgence:"haute",
  },

  photos:[
    {id:"ph1",label:"Vue générale parcelle",date:"2026-03-15",lat:46.5831,lng:2.7654,tag:"diagnostic"},
    {id:"ph2",label:"Foyer scolytes — zone NE",date:"2026-03-15",lat:46.5835,lng:2.7661,tag:"sanitaire"},
    {id:"ph3",label:"Dépérissement chêne — tige n°42",date:"2026-03-15",lat:46.5829,lng:2.7650,tag:"sanitaire"},
    {id:"ph4",label:"Accès chemin forestier",date:"2026-03-15",lat:46.5820,lng:2.7645,tag:"logistique"},
    {id:"ph5",label:"Après coupe sanitaire — zone A",date:"2026-05-10",lat:46.5834,lng:2.7660,tag:"post_travaux"},
    {id:"ph6",label:"Placeau régénération n°1",date:"2026-05-10",lat:46.5828,lng:2.7648,tag:"regeneration"},
  ],

  prescriptions:[
    {type:"Coupe sanitaire",surface:2.1,essences:["Chêne","Acacia"],objectif:"Éliminer le foyer scolyte et les tiges dépérissantes",methode:"Coupe rase de la zone infectée + dessouchage partiel",urgence:"immédiate"},
    {type:"Coupe d'éclaircie",surface:7.8,essences:["Chêne","Charme"],objectif:"Réduire densité de 800 à 400 tiges/ha, favoriser la croissance des beaux brins",methode:"Éclaircie sélective par le bas — prélèvement 30% de la surface terrière",urgence:"T2 2026"},
    {type:"Plantation",surface:2.1,essences:["Chêne sessile","Merisier","Alisier torminal"],objectif:"Restauration après coupe sanitaire — diversification essence et résilience",methode:"Plant forestier 80 cm — 1 100 plants/ha — protection gibier intégrale",urgence:"automne 2026"},
  ],

  entreprises:[
    {nom:"ETF Dupont Frères",siret:"45892103400012",certif:"PEFC",numero:"2023-0156",
     role:"Abattage & débardage",materiel:["John Deere 1270G Harvester","John Deere 1210E Porteur"],
     dateIntervention:"2026-04-20",surface:9.9},
    {nom:"JENZ Déchiquetage SARL",siret:"72341098700034",certif:"ISO 9001",numero:"FR-2022-0089",
     role:"Déchiquetage rémanents",materiel:["Jenz HEM 593 DQ"],
     dateIntervention:"2026-05-02",surface:9.9},
    {nom:"Pépinières Forestières du Centre",siret:"38712045600028",certif:"",numero:"",
     role:"Fourniture plants",materiel:[],
     dateIntervention:"2026-10-15",surface:2.1},
  ],

  surfaces:{
    total:12.4,
    coupeSanitaire:2.1,
    eclaircie:7.8,
    plantation:2.1,
    nonIntervenee:0.4,
  },
  couts:{
    exploitation:8200,
    dechiquetage:1640,
    plantation:3850,
    protectionGibier:920,
    honorairesMandataire:1200,
    total:15810,
    subventions:[
      {source:"FEADER — Plan de relance forêt",montant:2310,statut:"accordé"},
      {source:"Région Auvergne-Rhône-Alpes",montant:850,statut:"en cours"},
    ],
    resteACharge:12650,
  },

  volumes:{
    bo:{prevu:180,reel:183,unite:"m³",destination:"Scierie Marchais — Moulins (03)",preuveRef:"BON-SC-2026-0441",dateLivraison:"2026-04-28"},
    bi:{prevu:0,reel:0,unite:"m³",destination:"",preuveRef:"",dateLivraison:""},
    be:{prevu:320,reel:307,unite:"m³",toTonnes:0.4,destination:"Chaufferie Municipale St-Amand",preuveRef:"BL-2026-0831",dateLivraison:"2026-05-04"},
    remanents:{utilises:307,laissesSol:45,note:"45 m³ rémanents fins laissés au sol pour biodiversité (directive PEFC)"},
  },

  controleApresTravaux:{
    date:"2026-05-20",
    auteur:"Sylvie Moreau",
    conformite:"conforme",
    observations:["Cloisonnements respectés — pas d'ornières majeures","Zone sanitaire propre — souches traitées","3 tiges abimées par le débardage hors prescription — notifiées ETF","Andains rémanents conformes"],
    noteChauffeurs:4,
    noteGlobalETF:4,
    reserves:"Légère dégradation chemin d'accès — remise en état demandée sous 30 jours",
    dateRelance:"2026-06-20",
  },

  regeneration:{
    typeRegeneration:"Artificielle — Plantation",
    essencesPlantees:[
      {essence:"Chêne sessile",plants:1540,pourcent:66,origine:"Provenances locales certifiées"},
      {essence:"Merisier",plants:462,pourcent:20,origine:"Pépinières du Centre"},
      {essence:"Alisier torminal",plants:330,pourcent:14,origine:"Pépinières du Centre"},
    ],
    densite:1100,
    datePlantation:"2026-10-15",
    protectionGibier:"Gaine individuelle biodégradable 80 cm",
    suivi:[
      {date:"2026-05-10",type:"Relevé régénération naturelle",resultat:"Absence constatée — plantation décidée"},
      {date:"2027-05-15",type:"Contrôle reprise plantation",resultat:"À planifier",statut:"prévu"},
      {date:"2028-05-15",type:"Dégagement si nécessaire",resultat:"",statut:"prévu"},
    ],
    objectifCouvert:"2035",
  },
};

const ONGLETS_PARCELLE = [
  {id:"diagnostic",    icon:"🔍", label:"Diagnostic"},
  {id:"photos",        icon:"📷", label:"Photos & GPS"},
  {id:"prescriptions", icon:"📋", label:"Prescriptions"},
  {id:"entreprises",   icon:"🏗️", label:"Entreprises"},
  {id:"surfaces",      icon:"📐", label:"Surfaces & Coûts"},
  {id:"flux",          icon:"🔀", label:"Flux bois"},
  {id:"controle",      icon:"✅", label:"Contrôle"},
  {id:"regeneration",  icon:"🌱", label:"Régénération"},
];

export const SectionParcelleTravaux = () => {
  const [onglet, setOnglet] = useState("diagnostic");
  const p = DEMO_PARCELLE;

  const _totalSubv = p.couts.subventions.reduce((s,sub)=>s+sub.montant,0);
  const volTotalReel = p.volumes.bo.reel + p.volumes.bi.reel + p.volumes.be.reel;
  const pctMatiere = volTotalReel>0 ? Math.round((p.volumes.bo.reel+p.volumes.bi.reel)/volTotalReel*100) : 0;
  const pctEnergie = 100-pctMatiere;

  const renderDiagnostic = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>🔍 Diagnostic initial</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["Date","📅 "+new Date(p.diagnostic.date).toLocaleDateString("fr-FR")],
            ["Auteur","👤 "+p.diagnostic.auteur],
            ["État sanitaire",
              {bonne:"🟢 Bon",moyen:"🟡 Moyen",mauvais:"🔴 Mauvais"}[p.diagnostic.etatSanitaire]||p.diagnostic.etatSanitaire],
            ["Urgence d'intervention",
              {haute:"🔴 Haute",moyenne:"🟡 Moyenne",faible:"🟢 Faible"}[p.diagnostic.urgence]||p.diagnostic.urgence],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",
              borderRadius:7,background:"#F9FAFB",fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",borderRadius:8,
          border:"1px solid #FCD34D",fontSize:12,color:"#78350F",lineHeight:1.6}}>
          <div style={{fontWeight:700,marginBottom:4}}>📝 Observations</div>
          {p.diagnostic.notes}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>⚠️ Risques identifiés</div>
          {p.diagnostic.risques.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,
              padding:"7px 10px",borderRadius:7,background:"#FEF2F2",border:"1px solid #FECACA"}}>
              <span>🔴</span><span style={{color:"#991B1B",lineHeight:1.4}}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌲 Peuplement</div>
          {[
            ["Essence principale",p.essencePrincipale],
            ["Essences secondaires",p.essencesSecondaires.join(", ")],
            ["Surface totale",`${p.surface} ha`],
            ["GPS",`${p.coordGPS.lat}°N / ${p.coordGPS.lng}°E`],
            ["Propriétaire",p.proprietaire],
            ["Mandataire",p.mandataire],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",
              borderRadius:5,fontSize:11,borderBottom:`1px solid ${C.bd}`}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {p.photos.map(ph=>{
          const tagColor = {diagnostic:"#0369A1",sanitaire:"#DC2626",logistique:"#92400E",
            post_travaux:"#065F46",regeneration:"#166534"}[ph.tag]||"#6B7280";
          const tagBg = {diagnostic:"#DBEAFE",sanitaire:"#FEE2E2",logistique:"#FEF3C7",
            post_travaux:"#D1FAE5",regeneration:"#DCFCE7"}[ph.tag]||"#F3F4F6";
          return (
            <div key={ph.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
              <div style={{height:100,background:`linear-gradient(135deg,${tagBg},#fff)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>
                📷
              </div>
              <div style={{padding:"8px 10px"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.tx,marginBottom:4}}>{ph.label}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                    background:tagBg,color:tagColor,fontWeight:600}}>
                    {ph.tag.replace("_"," ")}
                  </span>
                  <span style={{fontSize:9,color:C.tx2}}>
                    {new Date(ph.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:3}}>
                  📍 {ph.lat}°N / {ph.lng}°E
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#EFF6FF",borderRadius:10,border:"1px solid #BFDBFE",
        padding:"10px 14px",fontSize:11,color:"#1E40AF"}}>
        💡 Les photos sont géolocalisées automatiquement via l'app mobile APPLITAG. Elles sont horodatées et archivées avec le lot pour traçabilité PEFC.
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.prescriptions.map((pr,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:C.tx}}>{pr.type}</span>
              <span style={{fontSize:11,color:C.tx2,marginLeft:10}}>{pr.surface} ha</span>
            </div>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:pr.urgence==="immédiate"?"#FEE2E2":"#FEF3C7",
              color:pr.urgence==="immédiate"?"#991B1B":"#92400E"}}>
              ⏱ {pr.urgence}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["🎯 Objectif",pr.objectif],
              ["⚙️ Méthode",pr.methode],
              ["🌲 Essences concernées",pr.essences.join(", ")],
            ].map(([k,v])=>(
              <div key={k} style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px",
                fontSize:11,gridColumn:k.includes("Objectif")?"1/-1":undefined}}>
                <div style={{fontWeight:700,color:C.tx2,marginBottom:3}}>{k}</div>
                <div style={{color:C.tx,lineHeight:1.5}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEntreprises = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.entreprises.map((e,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{e.nom}</div>
              <div style={{fontSize:10,color:C.tx2}}>SIRET : {e.siret}</div>
            </div>
            {e.certif&&(
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                background:"#D1FAE5",color:"#065F46"}}>
                ✓ {e.certif} {e.numero}
              </span>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>🏗️ Rôle</div>
              <div style={{color:C.tx}}>{e.role}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📅 Intervention</div>
              <div style={{color:C.tx}}>{new Date(e.dateIntervention).toLocaleDateString("fr-FR")}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📐 Surface</div>
              <div style={{color:C.tx}}>{e.surface} ha</div>
            </div>
          </div>
          {e.materiel.length>0&&(
            <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
              {e.materiel.map(m=>(
                <span key={m} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                  background:"#EDE9FE",color:"#6D28D9",fontWeight:600}}>⚙️ {m}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSurfaces = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>📐 Surfaces par intervention</div>
        {[
          ["Coupe sanitaire","#DC2626","#FEE2E2",p.surfaces.coupeSanitaire],
          ["Éclaircie","#1E5B3A","#D1FAE5",p.surfaces.eclaircie],
          ["Plantation","#166534","#DCFCE7",p.surfaces.plantation],
          ["Non intervenue","#6B7280","#F3F4F6",p.surfaces.nonIntervenee],
        ].map(([label,col,_bg,val])=>(
          <div key={label} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
              <span style={{color:col,fontWeight:600}}>{label}</span>
              <span style={{fontWeight:700,color:C.tx}}>{val} ha</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:col,
                width:`${(val/p.surfaces.total)*100}%`}}/>
            </div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"8px 10px",background:"#F9FAFB",borderRadius:7,
          display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{fontWeight:700,color:C.tx2}}>Total parcelle</span>
          <span style={{fontWeight:800,color:C.tx}}>{p.surfaces.total} ha</span>
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>💶 Budget travaux</div>
        {[
          ["Exploitation forestière",p.couts.exploitation],
          ["Déchiquetage",p.couts.dechiquetage],
          ["Plantation",p.couts.plantation],
          ["Protection gibier",p.couts.protectionGibier],
          ["Honoraires mandataire",p.couts.honorairesMandataire],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
            borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
            <span style={{color:C.tx2}}>{k}</span>
            <span style={{fontWeight:600,color:C.tx}}>{v.toLocaleString("fr-FR")} €</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:13,
          fontWeight:800,color:C.tx,borderTop:`2px solid ${C.bd}`,marginTop:4}}>
          <span>Total travaux</span>
          <span>{p.couts.total.toLocaleString("fr-FR")} €</span>
        </div>
        <div style={{marginTop:8,padding:"10px 12px",background:"#D1FAE5",borderRadius:8,
          border:"1px solid #6EE7B7",fontSize:11}}>
          <div style={{fontWeight:700,color:"#065F46",marginBottom:6}}>🏦 Subventions</div>
          {p.couts.subventions.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:"#065F46"}}>{s.source}</span>
              <span style={{fontWeight:700,color:"#065F46"}}>
                -{s.montant.toLocaleString("fr-FR")} € <span style={{fontSize:9,opacity:.7}}>({s.statut})</span>
              </span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #6EE7B7",marginTop:6,paddingTop:6,
            display:"flex",justifyContent:"space-between",fontWeight:800,color:"#064E3B",fontSize:12}}>
            <span>Reste à charge</span>
            <span>{p.couts.resteACharge.toLocaleString("fr-FR")} €</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFlux = () => {
    const vols = p.volumes;
    return (
      <div>
        {/* Banner usage matière vs énergie */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>
            🔀 Répartition des flux bois mobilisés — {volTotalReel} m³ total
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{background:"#D1FAE5",borderRadius:10,padding:"12px 14px",
              border:"1px solid #6EE7B7",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#065F46"}}>{pctMatiere}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>Usage matière</div>
              <div style={{fontSize:11,color:"#047857",marginTop:2}}>
                {vols.bo.reel+vols.bi.reel} m³ — stockage carbone long terme
              </div>
            </div>
            <div style={{background:"#FEF3C7",borderRadius:10,padding:"12px 14px",
              border:"1px solid #FCD34D",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#92400E"}}>{pctEnergie}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#92400E"}}>Usage énergie</div>
              <div style={{fontSize:11,color:"#B45309",marginTop:2}}>
                {vols.be.reel} m³ — valorisation énergétique
              </div>
            </div>
          </div>

          {/* Barre de flux visuelle */}
          <div style={{height:16,borderRadius:8,overflow:"hidden",display:"flex",marginBottom:6}}>
            <div style={{width:`${Math.round(vols.bo.reel/volTotalReel*100)}%`,background:"#1E5B3A",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BO</div>
            <div style={{width:`${Math.round(vols.bi.reel/volTotalReel*100)}%`,background:"#0369A1",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BI</div>
            <div style={{width:`${Math.round(vols.be.reel/volTotalReel*100)}%`,background:"#B45309",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BE</div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:10}}>
            {[["#1E5B3A","Bois d'œuvre (BO)"],["#0369A1","Bois d'industrie (BI)"],["#B45309","Bois énergie (BE)"]].map(([col,lbl])=>(
              <span key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>
                <span style={{color:C.tx2}}>{lbl}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Détail par qualité */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {QUALITES_BOIS.map(q=>{
            const vol = vols[q.id];
            if(!vol) return null;
            return (
              <div key={q.id} style={{background:"#fff",borderRadius:12,
                border:`2px solid ${vol.reel>0?q.couleur+"44":C.bd}`,padding:16,
                opacity:vol.reel===0?.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:24}}>{q.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:q.couleur}}>{q.label}</div>
                      <div style={{fontSize:11,color:C.tx2}}>{q.desc}</div>
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                    background:q.usage==="matiere"?"#D1FAE5":"#FEF3C7",
                    color:q.usage==="matiere"?"#065F46":"#92400E"}}>
                    {q.usage==="matiere"?"♻️ Usage matière":"🔥 Usage énergie"}
                  </span>
                </div>
                {vol.reel>0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:11}}>
                    {[
                      ["Volume prévu",`${vol.prevu} ${vol.unite}`],
                      ["Volume réel",`${vol.reel} ${vol.unite}`],
                      ["Destination",vol.destination||"—"],
                      ["Preuve / BL",vol.preuveRef||"—"],
                    ].map(([k,v])=>(
                      <div key={k} style={{background:q.bg,borderRadius:7,padding:"8px 10px"}}>
                        <div style={{fontWeight:700,color:q.couleur,marginBottom:2,fontSize:10}}>{k}</div>
                        <div style={{color:C.tx,fontWeight:600}}>{v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>
                    Aucun volume de cette qualité sur ce chantier
                  </div>
                )}
              </div>
            );
          })}

          {/* Rémanents */}
          <div style={{background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.bd}`,
            padding:"10px 14px",fontSize:11}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:6}}>🍂 Rémanents & menu bois</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span style={{color:"#92400E"}}>🔥 Valorisés déchiquetage : <strong>{vols.remanents.utilises} m³</strong></span>
              <span style={{color:"#065F46"}}>🌿 Laissés au sol : <strong>{vols.remanents.laissesSol} m³</strong></span>
            </div>
            <div style={{marginTop:6,color:C.tx2,fontStyle:"italic"}}>{vols.remanents.note}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderControle = () => {
    const ctrl = p.controleApresTravaux;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>✅ Contrôle après travaux</div>
          {[
            ["Date",new Date(ctrl.date).toLocaleDateString("fr-FR")],
            ["Contrôleur",ctrl.auteur],
            ["Conformité",ctrl.conformite==="conforme"?"✅ Conforme":"⚠️ Réserves"],
            ["Note ETF","⭐".repeat(ctrl.noteGlobalETF)+" ("+ctrl.noteGlobalETF+"/5)"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
              borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}

          {ctrl.reserves&&(
            <div style={{marginTop:10,background:"#FEF3C7",borderRadius:8,border:"1px solid #FCD34D",
              padding:"8px 10px",fontSize:11,color:"#92400E"}}>
              <div style={{fontWeight:700,marginBottom:4}}>⚠️ Réserve</div>
              {ctrl.reserves}
              <div style={{marginTop:4,color:"#B45309",fontWeight:600}}>
                Relance : {new Date(ctrl.dateRelance).toLocaleDateString("fr-FR")}
              </div>
            </div>
          )}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📋 Points de contrôle</div>
          {ctrl.observations.map((o,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:11,
              padding:"6px 10px",borderRadius:7,
              background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
              <span style={{color:"#16A34A",flexShrink:0}}>✓</span>
              <span style={{color:"#065F46"}}>{o}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRegeneration = () => {
    const reg = p.regeneration;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌱 Plan de régénération</div>
            {[
              ["Type",reg.typeRegeneration],
              ["Date plantation",new Date(reg.datePlantation).toLocaleDateString("fr-FR")],
              ["Densité",reg.densite+" plants/ha"],
              ["Protection",reg.protectionGibier],
              ["Objectif couvert",reg.objectifCouvert],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
                borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx2}}>{k}</span>
                <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌿 Essences plantées</div>
            {reg.essencesPlantees.map(e=>(
              <div key={e.essence} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                  <span style={{fontWeight:600,color:C.tx}}>{e.essence}</span>
                  <span style={{color:"#1E5B3A",fontWeight:700}}>{e.plants} plants ({e.pourcent}%)</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:"#1E5B3A",
                    width:`${e.pourcent}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:2}}>{e.origine}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📅 Calendrier de suivi</div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:"#E5E7EB"}}/>
            {reg.suivi.map((s,i)=>{
              const done = s.statut!=="prévu";
              return (
                <div key={i} style={{display:"flex",gap:12,marginBottom:16,position:"relative"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,zIndex:1,
                    background:done?"#1E5B3A":"#fff",
                    border:`2px solid ${done?"#1E5B3A":"#9CA3AF"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,color:done?"#fff":"#6B7280",fontWeight:700}}>
                    {done?"✓":"○"}
                  </div>
                  <div style={{paddingTop:3}}>
                    <div style={{fontSize:10,color:C.tx2}}>{new Date(s.date).toLocaleDateString("fr-FR")}</div>
                    <div style={{fontSize:12,fontWeight:600,color:done?C.tx:"#9CA3AF"}}>{s.type}</div>
                    {s.resultat&&<div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>{s.resultat}</div>}
                    {!done&&<span style={{fontSize:9,background:"#FEF3C7",color:"#92400E",
                      padding:"1px 5px",borderRadius:3,fontWeight:600}}>À planifier</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderContenu = () => {
    switch(onglet){
      case "diagnostic":    return renderDiagnostic();
      case "photos":        return renderPhotos();
      case "prescriptions": return renderPrescriptions();
      case "entreprises":   return renderEntreprises();
      case "surfaces":      return renderSurfaces();
      case "flux":          return renderFlux();
      case "controle":      return renderControle();
      case "regeneration":  return renderRegeneration();
      default:              return null;
    }
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête parcelle */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
        padding:"14px 20px",marginBottom:16,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#D1FAE5",color:"#065F46"}}>{p.ref}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#FEE2E2",color:"#991B1B"}}>⚠️ Urgence haute</span>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:C.tx,marginTop:4}}>{p.nom}</div>
          <div style={{fontSize:12,color:C.tx2}}>
            📍 {p.commune} · {p.surface} ha · {p.essencePrincipale.split(" ")[0]} · {p.proprietaire}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
          {[
            {icon:"📊",val:`${volTotalReel} m³`,lbl:"Volume total"},
            {icon:"♻️",val:`${pctMatiere}%`,lbl:"Usage matière"},
            {icon:"🔥",val:`${pctEnergie}%`,lbl:"Usage énergie"},
          ].map(k=>(
            <div key={k.lbl} style={{background:"#F9FAFB",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:16}}>{k.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:C.tx}}>{k.val}</div>
              <div style={{fontSize:9,color:C.tx2}}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4,flexWrap:"wrap"}}>
        {ONGLETS_PARCELLE.map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id)}
            style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,
              cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",
              border:`1px solid ${onglet===o.id?"#1E5B3A":C.bd}`,
              background:onglet===o.id?"#1E5B3A":"transparent",
              color:onglet===o.id?"#fff":C.tx2}}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {renderContenu()}
    </div>
  );
};

// ── VEILLE RÉGLEMENTAIRE ───────────────────────────────────────

export const CLAUSE_RESERVE = "Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt.";


const SNAPSHOTS_DOSSIER = [
  {
    id:"snap1",
    dossierId:"PAR-2026-001",
    dossierNom:"Forêt Bernard — Tronçais Nord",
    datePreparation:"2026-04-15",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"Arrêté du 2 mai 2025",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
      {ref:"FEADER PDR AuRA",version:"v2023",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — dossier préparé sous texte désormais annulé",
    statut:"alerte",
  },
  {
    id:"snap2",
    dossierId:"PAR-2025-047",
    dossierNom:"Bois de la Croix — Montluçon",
    datePreparation:"2025-09-10",
    auteur:"Jean-Paul Faure",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — analyser impact sur dossier accordé",
    statut:"alerte",
  },
  {
    id:"snap3",
    dossierId:"PAR-2025-061",
    dossierNom:"Pinède de Commentry",
    datePreparation:"2025-11-20",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:false,
    alerteDetail:"",
    statut:"conforme",
  },
];

/* ── IA TRANSPARENCE — Art. 50 Règlement IA — applicable 02/08/2026 ── */
const IA_STATUT = {
  conforme:   {label:"Conforme",         color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_adapter:  {label:"À adapter avant le 2 août", color:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  non_conforme:{label:"Non conforme",    color:"#991B1B", bg:"#FEE2E2", icon:"🚫"},
  hors_scope: {label:"Hors scope art.50",color:"#6B7280", bg:"#F3F4F6", icon:"ℹ️"},
};

const INVENTAIRE_IA = [
  {
    id:"assistant",
    nom:"Assistant métier APPLITAG",
    type:"Système interactif",
    scope50:"Oui — interaction directe utilisateur",
    statut:"a_adapter",
    mentions:[
      {texte:"🤖 Assistant IA — réponses générées automatiquement", fait:false},
      {texte:"Distinction donnée mesurée / estimation IA", fait:false},
      {texte:"Validation humaine avant transmission contractuelle", fait:false},
    ],
    controlHumain:"À formaliser",
    donneesTransmises:"Données de chantier, essences, volumes → LLM externe",
    prestataire:"À identifier et encadrer (DPA)",
    journalDecisions:false,
    risques:["IA bloquant seule un lot ou un chantier","Donnée contractuelle transmise sans encadrement"],
  },
  {
    id:"rapports",
    nom:"Génération de rapports",
    type:"Contenu généré par IA",
    scope50:"Oui — contenu produit automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Suggestion générée automatiquement »", fait:false},
      {texte:"Validation humaine obligatoire avant diffusion", fait:false},
      {texte:"Horodatage et auteur de la validation", fait:false},
    ],
    controlHumain:"Validation avant export PDF / envoi",
    donneesTransmises:"Données de visite, lots, GES",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Rapport transmis sans relecture","Estimation présentée comme mesure"],
  },
  {
    id:"synthese",
    nom:"Synthèses de chantiers",
    type:"Résumé automatique",
    scope50:"Oui — texte généré automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Synthèse générée automatiquement »", fait:false},
      {texte:"Sources des données citées", fait:true},
    ],
    controlHumain:"Relecture recommandée",
    donneesTransmises:"Données terrain APPLITAG",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Synthèse erronée diffusée comme compte-rendu officiel"],
  },
  {
    id:"anomalies",
    nom:"Détection d'anomalies",
    type:"Décision automatisée (aide à la décision)",
    scope50:"Partiel — décision finale humaine obligatoire",
    statut:"a_adapter",
    mentions:[
      {texte:"« Anomalie détectée par l'algorithme — à confirmer »", fait:false},
      {texte:"L'IA ne bloque aucune action sans validation humaine", fait:false},
    ],
    controlHumain:"OBLIGATOIRE — l'IA ne peut pas refuser seule un lot",
    donneesTransmises:"Données de livraison, humidité, pesées",
    prestataire:"Interne",
    journalDecisions:true,
    risques:["IA refusant automatiquement un lot sans action humaine"],
  },
  {
    id:"radio_tv",
    nom:"APPLITAG Radio & TV",
    type:"Voix et images synthétiques",
    scope50:"Oui — obligation de signalement explicite",
    statut:"a_adapter",
    mentions:[
      {texte:"« Voix / image générée par intelligence artificielle »", fait:false},
      {texte:"Aucune fausse interview ou deepfake non signalé", fait:false},
      {texte:"Règle éditoriale formalisée avant diffusion", fait:false},
    ],
    controlHumain:"Validation éditoriale avant toute diffusion",
    donneesTransmises:"Voix synthétique générée localement ou via API",
    prestataire:"À formaliser dans la règle éditoriale",
    journalDecisions:false,
    risques:["Voix artificielle non identifiée","Fausse interview diffusée"],
  },
  {
    id:"textes_info",
    nom:"Textes d'information automatiques",
    type:"Contenu généré par IA",
    scope50:"Oui — diffusion publique ou contractuelle",
    statut:"a_adapter",
    mentions:[
      {texte:"« Texte généré automatiquement — vérifier avant utilisation »", fait:false},
      {texte:"Distinction claire donnée source / texte produit", fait:false},
    ],
    controlHumain:"Recommandé pour toute diffusion externe",
    donneesTransmises:"Données APPLITAG → modèle de langage",
    prestataire:"À encadrer",
    journalDecisions:false,
    risques:["Données personnelles transmises à prestataire non encadré"],
  },
];

const JOURNAL_IA_DEMO = [
  {date:"2026-07-15",fonction:"Rapports",action:"Rapport GES lot LOT-2026-004",
   suggestion:"GES estimé à 18,4 kgCO₂eq/MJ — seuil RED II respecté",
   validation:"Validé par J. Lefèvre",decisionFinale:"Rapport transmis au maître d'ouvrage",
   corrigé:false},
  {date:"2026-07-18",fonction:"Anomalies",action:"Détection humidité élevée livraison LIV-007",
   suggestion:"Humidité 42 % — lot suspendu par l'algorithme",
   validation:"Confirmé par opérateur plateforme",decisionFinale:"Lot refusé, contre-mesure en cours",
   corrigé:false},
  {date:"2026-07-20",fonction:"Synthèses",action:"Synthèse chantier CHT-2026-012",
   suggestion:"3 essences identifiées, volume estimé 145 m³",
   validation:"Corrigé : volume réel 138 m³",decisionFinale:"Synthèse corrigée archivée",
   corrigé:true},
];

// ── EU AI ACT ART. 50 — REGISTRE IA ────────────────────────────
// Mentions obligatoires applicables dès le 2 août 2026

const AI_BADGE = ({label="Assistant IA"}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",
    borderRadius:99,background:"#EDE9FE",color:"#5B21B6",fontSize:11,fontWeight:700,
    border:"1px solid #C4B5FD"}}>🤖 {label}</span>
);

const DATA_SOURCE_TAG = ({type}) => {
  const map = {
    mesuree:   {label:"Donnée mesurée",    bg:"#D1FAE5",c:"#065F46"},
    declaree:  {label:"Déclarée fournisseur",bg:"#DBEAFE",c:"#1E3A5F"},
    calculee:  {label:"Calculée",          bg:"#FEF3C7",c:"#92400E"},
    estimee:   {label:"Estimée IA",        bg:"#EDE9FE",c:"#5B21B6"},
  };
  const s=map[type]||map.declaree;
  return <span style={{padding:"1px 7px",borderRadius:99,fontSize:10,fontWeight:700,background:s.bg,color:s.c}}>{s.label}</span>;
};

const REGISTRE_IA_FONCTIONS = [
  {id:"r1", module:"Analyses & Rapports", fonction:"Suggestion de synthèse lot", type:"generatif",
   mention:"Le texte proposé est généré automatiquement à partir des données saisies. Aucune décision ne doit s'appuyer sur ce texte sans vérification humaine.",
   decision:"Humain obligatoire", actif:true},
  {id:"r2", module:"Bilan GES", fonction:"Estimation du facteur d'émission transport", type:"calcul_ia",
   mention:"Le facteur d'émission est estimé à partir des données de distance et de type de véhicule. La valeur affichée est une estimation — non une mesure certifiée.",
   decision:"Validation opérateur", actif:true},
  {id:"r3", module:"Veille marchés", fonction:"Classement de l'intérêt commercial", type:"recommandation",
   mention:"Le score d'intérêt commercial est calculé automatiquement. Il n'engage pas ALTEGAD et doit être confirmé par le chargé d'affaires.",
   decision:"Humain obligatoire", actif:true},
  {id:"r4", module:"Conformité RED", fonction:"Contrôle de conformité RED III par lot", type:"calcul_ia",
   mention:"La vérification est réalisée par comparaison des données déclarées aux seuils réglementaires. Elle ne remplace pas un audit certifié.",
   decision:"Validation opérateur", actif:true},
  {id:"r5", module:"Scierie", fonction:"Indicateurs de marge par coproduit", type:"calcul_ia",
   mention:"Les marges affichées sont calculées à partir des données saisies. Elles ne constituent pas un document comptable.",
   decision:"Information", actif:true},
];

export const SectionRegistreIA = () => {
  const _inp={height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,
    padding:"0 14px",fontSize:14,boxSizing:"border-box",width:"100%"};

  return (
    <div style={{padding:PADDING,maxWidth:660,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#3730A3 0%,#5B21B6 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🤖</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:4}}>Registre IA — EU AI Act Art. 50</div>
        <div style={{fontSize:13,opacity:.85}}>Obligations de transparence applicables dès le <strong>2 août 2026</strong></div>
      </div>

      <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5,color:"#92400E"}}>
        <strong>⏳ Échéance : demain 2 août 2026.</strong> Les systèmes interactifs, recommandations automatiques et contenus générés par IA doivent être clairement identifiés. Une recommandation automatique ne peut pas être présentée comme une mesure terrain, une validation juridique ou une décision de conformité.
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:12}}>📋 Fonctions IA déclarées dans APPLITAG</div>
        {REGISTRE_IA_FONCTIONS.map(f=>(
          <div key={f.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
              <div>
                <span style={{fontWeight:700,fontSize:13,color:C.tx}}>{f.module}</span>
                <span style={{fontSize:12,color:C.tx3,marginLeft:8}}>— {f.fonction}</span>
              </div>
              <AI_BADGE label={f.type==="generatif"?"Génératif":f.type==="recommandation"?"Recommandation":"Calcul IA"}/>
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.5,marginBottom:4,fontStyle:"italic"}}>"{f.mention}"</div>
            <div style={{fontSize:11,color:f.decision==="Humain obligatoire"?C.red:C.amber,fontWeight:700}}>
              👤 {f.decision}
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🏷️ Sources de données — légende obligatoire</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <DATA_SOURCE_TAG type="mesuree"/>
          <DATA_SOURCE_TAG type="declaree"/>
          <DATA_SOURCE_TAG type="calculee"/>
          <DATA_SOURCE_TAG type="estimee"/>
        </div>
        <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6}}>
          Chaque donnée affichée dans les rapports et fiches de conformité doit indiquer son origine.
          Une donnée <strong>estimée par IA</strong> ne peut jamais être présentée comme une mesure terrain.
        </div>
      </div>

      <div style={{background:"#EDE9FE",borderRadius:12,padding:"14px 16px",border:"1px solid #C4B5FD"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>✅ Checklist mise en conformité Art. 50</div>
        {[
          ["✅","Badge « Assistant IA » affiché sur chaque recommandation automatique","done"],
          ["✅","Distinction mesurée / déclarée / calculée / estimée dans les rapports","done"],
          ["✅","Validation humaine obligatoire pour les décisions sensibles (conformité RED, GES)","done"],
          ["⬜","Deepfakes : non applicable (pas de contenu vidéo/audio dans APPLITAG)","pending"],
          ["⬜","Conservation des sources et corrections dans l'historique","pending"],
          ["⬜","Publication du registre IA accessible aux utilisateurs","pending"],
        ].map(([icon,label,status])=>(
          <div key={label} style={{display:"flex",gap:8,padding:"5px 0",fontSize:13,
            color:status==="done"?"#5B21B6":"#7C3AED",borderBottom:`1px solid #DDD6FE`}}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── BOIS DE CRISE — TRAÇABILITÉ LOTS SINISTRÉS ──────────────────
const TYPES_SINISTRE = ["Incendie","Tempête","Sécheresse / dépérissement","Inondation","Attaque parasitaire","Autre"];
const ETATS_BOIS_SINISTRE = [
  {id:"brule",  label:"Brûlé",         icon:"🔥", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"echauffe",label:"Échauffé",     icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"bleuissant",label:"Bleuissant", icon:"🔵", couleur:"#1E3A5F", bg:"#DBEAFE"},
  {id:"intact",  label:"Intact",       icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
];
const DESTINATIONS_CRISE = [
  "Sciage (bois intact)","Panneau / déroulage","Pâte à papier","Bois énergie","Trituration","Élimination",
];
const CRISE_KEY = "applitag_bois_crise";
const criseGet = () => { try { return JSON.parse(localStorage.getItem(CRISE_KEY)||"[]"); } catch { return []; } };
const criseSet = (arr) => { try { localStorage.setItem(CRISE_KEY,JSON.stringify(arr)); } catch { /* noop */ } };

const DEMO_LOTS_CRISE = [
  {id:"lc1",ref:"CRISE-2026-001",proprietaire:"M. Dupont Henri",mandataire:"Cabinet Forêt Sud",
   parcelle:"BD-103-A",commune:"Lanton (33)",gps:{lat:44.7122,lng:-1.0433},
   sinistre:"Incendie",dateSinistre:"2026-07-18",essence:"Pin maritime",
   volumeEstime:380,volumeMesure:null,etat:"brule",
   destination:"Bois énergie",prix:null,transporteur:null,
   statut:"constat",photos:1,createdAt:"2026-07-28T09:00:00Z"},
  {id:"lc2",ref:"CRISE-2026-002",proprietaire:"GAEC Les Pins",mandataire:"Coopérative GIPLAIT",
   parcelle:"BD-89-C",commune:"Lacanau (33)",gps:{lat:44.9831,lng:-1.0874},
   sinistre:"Incendie",dateSinistre:"2026-07-18",essence:"Pin maritime",
   volumeEstime:1200,volumeMesure:1150,etat:"bleuissant",
   destination:"Pâte à papier",prix:18,transporteur:"Camion Morin",
   statut:"en_transit",photos:3,createdAt:"2026-07-30T14:00:00Z"},
];

export const SectionBoisCrise = () => {
  const [tab, setTab] = useState("liste");
  const [lots, setLots] = useState(()=>{ const d=criseGet(); return d.length?d:[...DEMO_LOTS_CRISE]; });

  // Formulaire
  const [prop,    setProp]    = useState("");
  const [mand,    setMand]    = useState("");
  const [parcelle,setParcelle]= useState("");
  const [commune, setCommune] = useState("");
  const [lat,     setLat]     = useState("");
  const [lng,     setLng]     = useState("");
  const [sin,     setSin]     = useState("Incendie");
  const [dateSin, setDateSin] = useState(todayS());
  const [essence, setEssence] = useState("Pin maritime");
  const [volEst,  setVolEst]  = useState("");
  const [volMes,  setVolMes]  = useState("");
  const [etat,    setEtat]    = useState("brule");
  const [dest,    setDest]    = useState("Bois énergie");
  const [saved,   setSaved]   = useState(false);

  const gps = () => navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude.toFixed(5));setLng(p.coords.longitude.toFixed(5));});

  const ajouter = () => {
    if (!prop || !parcelle || !volEst) return;
    const lot = {id:uid(),ref:`CRISE-${todayS().replace(/-/g,"").slice(2)}-${String(lots.length+1).padStart(3,"0")}`,
      proprietaire:prop,mandataire:mand,parcelle,commune,
      gps:lat&&lng?{lat:parseFloat(lat),lng:parseFloat(lng)}:null,
      sinistre:sin,dateSinistre:dateSin,essence,
      volumeEstime:parseFloat(volEst),volumeMesure:volMes?parseFloat(volMes):null,
      etat,destination:dest,prix:null,transporteur:null,statut:"constat",photos:0,
      createdAt:nowISO()};
    const upd=[lot,...lots]; setLots(upd); criseSet(upd);
    setProp(""); setMand(""); setParcelle(""); setCommune(""); setVolEst(""); setVolMes(""); setLat(""); setLng("");
    setSaved(true); setTimeout(()=>setSaved(false),2500);
  };

  const inp={height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,padding:"0 14px",fontSize:14,boxSizing:"border-box",width:"100%"};
  const Fld=({label,children})=>(
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:700,color:C.tx3,marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      {children}
    </div>
  );

  const totalVol = lots.reduce((s,l)=>s+(l.volumeEstime||0),0);
  const lotsEnTransit = lots.filter(l=>l.statut==="en_transit").length;

  const STATUTS={constat:{l:"Constat",bg:"#FEF3C7",c:"#92400E"},en_transit:{l:"En transit",bg:"#DBEAFE",c:"#1E3A5F"},livre:{l:"Livré",bg:"#D1FAE5",c:"#065F46"},archive:{l:"Archivé",bg:C.bg,c:C.tx3}};

  const [alertesUrgentes, setAlertesUrgentes] = useState<any[]>([]);
  useEffect(() => {
    (apiGet("/lots-sanitaires/urgents?scoreMin=3") as Promise<any[]>)
      .then(data => { if (Array.isArray(data)) setAlertesUrgentes(data); })
      .catch(() => {});
  }, []);

  return (
    <div style={{padding:PADDING,maxWidth:660,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#7F1D1D 0%,#92400E 100%)",borderRadius:14,padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🌲🔥</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>Bois de crise</div>
        <div style={{fontSize:13,opacity:.85}}>Traçabilité des lots sinistrés — propriétaire · parcelle · état · destination</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🌲 {lots.length} lots</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>📦 {totalVol.toLocaleString("fr-FR")} m³ estimés</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🚛 {lotsEnTransit} en transit</span>
        </div>
      </div>

      <div style={{background:"#FFF7ED",border:"1px solid #FB923C",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5,color:"#7C2D12"}}>
        <strong>⚠️ Principe éthique fondamental :</strong> Ne pas prospecter directement auprès des propriétaires sinistrés. Passer par les interprofessions, coopératives, experts forestiers et assureurs. Tout mouvement de bois exige un <strong>mandat incontestable</strong>.
      </div>

      {alertesUrgentes.length > 0 && (
        <div style={{background:"#FFF1F2",border:"1.5px solid #FDA4AF",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:14,fontWeight:700,color:"#881337"}}>🚨 Alertes sanitaires urgentes</span>
            <span style={{padding:"2px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:"#881337",color:"#fff"}}>{alertesUrgentes.length}</span>
          </div>
          {alertesUrgentes.map(a => {
            const typIco = a.typeSinistre==="POST_INCENDIE"?"🔥":a.typeSinistre==="CHABLIS"?"🌪":a.typeSinistre==="SCOLYTES"?"🐛":a.typeSinistre==="PATHOGENE"?"🦠":"⚠️";
            const scoreCol = a.scoreUrgence>=5?"#7F1D1D":a.scoreUrgence>=4?"#92400E":"#78350F";
            const scoreBg  = a.scoreUrgence>=5?"#FEE2E2":a.scoreUrgence>=4?"#FEF3C7":"#FEF9C3";
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"7px 10px",borderRadius:8,background:"#fff",border:"1px solid #FCA5A5",marginBottom:5}}>
                <div style={{fontSize:12}}>
                  <span style={{marginRight:6}}>{typIco}</span>
                  <strong>{a.contact?.nom ?? a.id.slice(0,8)}</strong>
                  {a.contact?.commune && <span style={{color:C.tx3}}> · {a.contact.commune}</span>}
                  {a.surfaceAffecteeHa && <span style={{color:C.tx3}}> · {a.surfaceAffecteeHa} ha</span>}
                </div>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:scoreBg,color:scoreCol,flexShrink:0}}>
                  Score {a.scoreUrgence}/5
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["liste","📋 Lots"],["nouveau","➕ Nouveau lot"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px 0",borderRadius:10,
            border:`1.5px solid ${tab===id?"#991B1B":C.bd}`,background:tab===id?"#FEE2E2":"#fff",
            color:tab===id?"#991B1B":C.tx2,fontWeight:tab===id?700:500,fontSize:14,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="nouveau" && (
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Propriétaire"><input value={prop} onChange={e=>setProp(e.target.value)} placeholder="Nom propriétaire" style={inp}/></Fld>
            <Fld label="Mandataire / Expert"><input value={mand} onChange={e=>setMand(e.target.value)} placeholder="Expert, coopérative..." style={inp}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="N° Parcelle cadastrale"><input value={parcelle} onChange={e=>setParcelle(e.target.value)} placeholder="Ex: BD-103-A" style={inp}/></Fld>
            <Fld label="Commune"><input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Commune (dép.)" style={inp}/></Fld>
          </div>
          <Fld label="Coordonnées GPS">
            <div style={{display:"flex",gap:8}}>
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude" style={{...inp,flex:1}}/>
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude" style={{...inp,flex:1}}/>
              <button onClick={gps} style={{height:INPUT_H,padding:"0 14px",borderRadius:10,border:`1px solid ${C.blue}`,background:C.blueL,color:C.blue,cursor:"pointer",fontSize:18}}>📍</button>
            </div>
          </Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Fld label="Type sinistre">
              <select value={sin} onChange={e=>setSin(e.target.value)} style={{...inp,background:"#fff"}}>
                {TYPES_SINISTRE.map(s=><option key={s}>{s}</option>)}
              </select>
            </Fld>
            <Fld label="Date sinistre"><input type="date" value={dateSin} onChange={e=>setDateSin(e.target.value)} style={inp}/></Fld>
            <Fld label="Essence"><input value={essence} onChange={e=>setEssence(e.target.value)} placeholder="Essence" style={inp}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Volume estimé (m³)"><input type="number" value={volEst} onChange={e=>setVolEst(e.target.value)} placeholder="0" style={inp}/></Fld>
            <Fld label="Volume mesuré (m³)"><input type="number" value={volMes} onChange={e=>setVolMes(e.target.value)} placeholder="si cubé" style={inp}/></Fld>
          </div>
          <Fld label="État du bois">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ETATS_BOIS_SINISTRE.map(e=>(
                <label key={e.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",
                  borderRadius:10,border:`2px solid ${etat===e.id?e.couleur:C.bd}`,
                  background:etat===e.id?e.bg:"#fff",cursor:"pointer",fontSize:13}}>
                  <input type="radio" name="etat_bois" value={e.id} checked={etat===e.id} onChange={()=>setEtat(e.id)} style={{accentColor:e.couleur}}/>
                  {e.icon} {e.label}
                </label>
              ))}
            </div>
          </Fld>
          <Fld label="Destination autorisée">
            <select value={dest} onChange={e=>setDest(e.target.value)} style={{...inp,background:"#fff"}}>
              {DESTINATIONS_CRISE.map(d=><option key={d}>{d}</option>)}
            </select>
          </Fld>
          <button onClick={ajouter} disabled={!prop||!parcelle||!volEst} style={{
            height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:8,
            background:(!prop||!parcelle||!volEst)?"#ccc":"#991B1B",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            + Enregistrer le lot sinistré
          </button>
          {saved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Lot enregistré</div>}
        </div>
      )}

      {tab==="liste" && lots.map(l=>{
        const etInfo=ETATS_BOIS_SINISTRE.find(e=>e.id===l.etat)||ETATS_BOIS_SINISTRE[0];
        const st=STATUTS[l.statut]||STATUTS.constat;
        return (
          <div key={l.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{l.ref}</div>
                <div style={{fontSize:12,color:C.tx3}}>{l.proprietaire} {l.mandataire&&`· ${l.mandataire}`}</div>
              </div>
              <div style={{display:"flex",gap:6,flexDirection:"column",alignItems:"flex-end"}}>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:etInfo.bg,color:etInfo.couleur}}>{etInfo.icon} {etInfo.label}</span>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>{st.l}</span>
              </div>
            </div>
            <div style={{fontSize:13,color:C.tx2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              <span>📍 {l.commune||"—"} {l.parcelle&&`· ${l.parcelle}`}</span>
              <span>🌲 {l.essence}</span>
              <span>📏 Estimé : <strong>{l.volumeEstime} m³</strong></span>
              <span>{l.volumeMesure?`✅ Mesuré : ${l.volumeMesure} m³`:"⬜ Non cubé"}</span>
              <span>🎯 {l.destination}</span>
              <span>⚡ {l.sinistre} · {l.dateSinistre}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── FICHE COMBUSTIBLE CONTRACTUELLE ─────────────────────────────
const FICHE_COMB_KEY = "applitag_fiches_combustible";
const ficheCombGet = () => { try { return JSON.parse(localStorage.getItem(FICHE_COMB_KEY)||"[]"); } catch { return []; } };

const DEMO_FICHES_COMB = [
  {id:"fc1",chaufferie:"Chaufferie Communale — Saint-Julien-de-Concelles",version:"v1.0",dateVersion:"2026-07-12",
   produit:"Plaquettes forestières",norme:"NF EN ISO 17225-4",
   humiditeMax:35,cendresMax:2,poussiereMax:4,pcRef:3.1,rayonMax:100,
   controleFreq:"À chaque livraison",echantillonnage:"Méthode EN 14778",
   conservationEchantillon:"3 mois après livraison",
   docsObligatoires:["Bon de pesée","Attestation conformité","Fiche traçabilité lot","CMR"],
   stockMinimal:"15 jours de consommation",delaiExceptionnel:"48 h",
   seuils_decision:{accept:"Toutes valeurs dans les bornes",reserve:"Humidité entre 35 et 40 %",refus:"Au-delà des seuils ou traçabilité manquante"},
   responsableDecision:"Chef de chauffe — validation manuelle obligatoire",
   ao:"Consultation fermée le 12 août 2026 à 10 h",statut:"actif"},
  {id:"fc2",chaufferie:"Chaufferie Intercommunale — Pontcharra",version:"v1.0",dateVersion:"2026-07-24",
   produit:"Plaquettes forestières P45",norme:"NF EN ISO 17225-4",
   humiditeMax:35,cendresMax:null,poussiereMax:null,pcRef:null,rayonMax:null,
   controleFreq:"Périodique (cahier des charges)",echantillonnage:"Conservation d'échantillons obligatoire",
   conservationEchantillon:"Durée contractuelle",
   docsObligatoires:["Preuve de pesée","Fiche traçabilité","Preuve de conformité","BL signé"],
   stockMinimal:"Garantie de stock",delaiExceptionnel:"Procédure de refus définie",
   seuils_decision:{accept:"Conforme humidité + traçabilité",reserve:"Contrôle approfondi requis",refus:"Procédure de refus contractuelle"},
   responsableDecision:"Responsable exploitation — validation manuelle obligatoire",
   ao:"Consultation fermée le 24 août 2026 à 11 h — 405 t/an lot 1",statut:"actif"},
];

export const SectionFicheCombustible = () => {
  const [fiches, _setFiches] = useState(()=>{ const d=ficheCombGet(); return d.length?d:[...DEMO_FICHES_COMB]; });
  const [sel, setSel] = useState(fiches[0]?.id||null);
  const [tabF, setTabF] = useState("fiche");
  const fiche = fiches.find(f=>f.id===sel);

  // Livraisons liées à cette chaufferie (démo + localStorage)
  const livraisonsLiees = useMemo(()=>{
    if (!fiche) return [];
    const all = [...DEMO_LIVRAISONS];
    const nomChauff = fiche.chaufferie.toLowerCase();
    return all.filter(l=>{
      const dest = (l.nomDestination||"").toLowerCase();
      return dest.includes(nomChauff.split("—")[0].trim().toLowerCase()) ||
             nomChauff.includes(dest.split(" ")[0].toLowerCase());
    }).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  }, [fiche]);

  // Contrôle conformité livraison vs fiche
  const conformiteLiv = (l) => {
    if (!fiche) return null;
    const hum = parseFloat(l.humiditeReception);
    if (isNaN(hum)) return {statut:"nd", label:"Non mesuré", col:"#475569", bg:"#F1F5F9"};
    if (fiche.humiditeMax && hum > fiche.humiditeMax + 5)
      return {statut:"refus",  label:"⛔ Refus — hors seuil", col:"#991B1B", bg:"#FEE2E2"};
    if (fiche.humiditeMax && hum > fiche.humiditeMax)
      return {statut:"reserve",label:"⚠️ Réserve", col:"#92400E", bg:"#FEF3C7"};
    return {statut:"accept",label:"✅ Accepté", col:"#065F46", bg:"#D1FAE5"};
  };

  const Row=({label,val,source})=>val!=null?(
    <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.bd}`,alignItems:"center"}}>
      <span style={{fontSize:12,color:C.tx3}}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:600,color:C.tx}}>{val}</span>
        {source&&<DATA_SOURCE_TAG type={source}/>}
      </div>
    </div>
  ):null;

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#065F46 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>📋</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>Fiche combustible contractuelle</div>
        <div style={{fontSize:13,opacity:.85}}>Spécifications versionnées par chaufferie — seuils, contrôles, décisions</div>
      </div>

      <div style={{background:"#EDE9FE",border:"1px solid #C4B5FD",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,color:"#5B21B6",lineHeight:1.5}}>
        <AI_BADGE label="Règle importante"/> APPLITAG compare les données collectées aux clauses du contrat, mais <strong>la décision finale (accepté / réserve / refusé) est validée par un humain habilité</strong>. APPLITAG ne certifie pas automatiquement le combustible.
      </div>

      {/* Sélecteur chaufferie */}
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {fiches.map(f=>(
          <button key={f.id} onClick={()=>setSel(f.id)} style={{
            padding:"8px 14px",borderRadius:10,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${sel===f.id?"#1E3A5F":C.bd}`,
            background:sel===f.id?"#1E3A5F":"#fff",
            color:sel===f.id?"#fff":C.tx2,fontWeight:sel===f.id?700:400,
            fontSize:12,cursor:"pointer"
          }}>🔥 {f.chaufferie.split("—")[0].trim()}</button>
        ))}
      </div>

      {fiche&&(
        <div>
          {/* Onglets Fiche / Livraisons */}
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[["fiche","📋","Fiche contractuelle"],["livraisons","📦","Livraisons liées"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setTabF(id)} style={{
                padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:`2px solid ${tabF===id?"#1E3A5F":C.bd}`,
                background:tabF===id?"#1E3A5F":"transparent",
                color:tabF===id?"#fff":C.tx2}}>
                {ico} {lbl}{id==="livraisons"&&livraisonsLiees.length>0?` (${livraisonsLiees.length})`:""}
              </button>
            ))}
          </div>

          {/* ── Onglet Livraisons liées ── */}
          {tabF==="livraisons"&&(
            <div>
              {livraisonsLiees.length===0&&(
                <div style={{background:C.bg2,borderRadius:12,padding:28,textAlign:"center",color:C.tx3,fontSize:13}}>
                  Aucune livraison enregistrée vers cette chaufferie.<br/>
                  <span style={{fontSize:12}}>Les livraisons apparaîtront ici avec leur statut de conformité.</span>
                </div>
              )}
              {livraisonsLiees.map(l=>{
                const conf = conformiteLiv(l);
                const dateStr = l.date?.slice(0,10)||"";
                return (
                  <div key={l.id} style={{background:"#fff",border:`1.5px solid ${conf?.col||C.bd}33`,
                    borderRadius:12,padding:"12px 16px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:3}}>
                          📦 {l.numeroCMR||l.numeroBL||"BL"} · {l.lotNumero||""}
                        </div>
                        <div style={{fontSize:12,color:C.tx3}}>
                          {dateStr} · {l.nomReceptionnaire||""}
                        </div>
                        <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,fontWeight:600,color:C.tx}}>
                            💧 Humidité : {l.humiditeReception!=null?`${l.humiditeReception}%`:"—"}
                          </span>
                          {fiche.humiditeMax&&(
                            <span style={{fontSize:11,color:C.tx3}}>
                              (seuil ≤ {fiche.humiditeMax}%)
                            </span>
                          )}
                          <span style={{fontSize:12,fontWeight:600,color:C.tx}}>
                            ⚖️ {(l.poidsNet||l.poidsBrut||"—")} t
                          </span>
                        </div>
                      </div>
                      <div style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                        background:conf?.bg,color:conf?.col}}>
                        {conf?.label}
                      </div>
                    </div>
                    {conf?.statut==="reserve"&&(
                      <div style={{marginTop:8,background:"#FEF3C7",borderRadius:8,padding:"8px 12px",
                        fontSize:12,color:"#92400E"}}>
                        {fiche.seuils_decision.reserve} — {fiche.responsableDecision}
                      </div>
                    )}
                    {conf?.statut==="refus"&&(
                      <div style={{marginTop:8,background:"#FEE2E2",borderRadius:8,padding:"8px 12px",
                        fontSize:12,color:"#991B1B"}}>
                        {fiche.seuils_decision.refus} — {fiche.responsableDecision}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{background:"#EDE9FE",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#5B21B6",marginTop:4}}>
                <AI_BADGE/> Contrôle automatique humidité vs seuil contractuel. <strong>La décision de refus reste une prérogative humaine.</strong>
              </div>
            </div>
          )}

          {/* ── Onglet Fiche contractuelle ── */}
          {tabF==="fiche"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{fiche.chaufferie}</div>
                <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{fiche.produit} · {fiche.norme} · {fiche.version}</div>
              </div>
              <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:C.greenL,color:C.greenD}}>
                {fiche.statut==="actif"?"✅ Actif":"⬜ Inactif"}
              </span>
            </div>
            {fiche.ao&&<div style={{background:"#FEF3C7",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400E",fontWeight:600,marginBottom:10}}>⏰ {fiche.ao}</div>}

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"10px 0 4px"}}>📏 Seuils contractuels</div>
            <Row label="Humidité maximale" val={fiche.humiditeMax!=null?`≤ ${fiche.humiditeMax} %`:null} source="declaree"/>
            <Row label="Taux de cendres max" val={fiche.cendresMax!=null?`≤ ${fiche.cendresMax} %`:null} source="declaree"/>
            <Row label="Taux de poussières max" val={fiche.poussiereMax!=null?`≤ ${fiche.poussiereMax} %`:null} source="declaree"/>
            <Row label="PCI de référence" val={fiche.pcRef!=null?`${fiche.pcRef} MWh/t`:null} source="declaree"/>
            <Row label="Rayon d'approvisionnement" val={fiche.rayonMax!=null?`≤ ${fiche.rayonMax} km`:null} source="declaree"/>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 4px"}}>🔬 Contrôle qualité</div>
            <Row label="Fréquence contrôle" val={fiche.controleFreq}/>
            <Row label="Échantillonnage" val={fiche.echantillonnage}/>
            <Row label="Conservation échantillon" val={fiche.conservationEchantillon}/>
            <Row label="Stock minimal" val={fiche.stockMinimal}/>
            <Row label="Délai exceptionnel" val={fiche.delaiExceptionnel}/>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 6px"}}>📂 Documents obligatoires par livraison</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {fiche.docsObligatoires.map(d=><span key={d} style={{padding:"3px 10px",borderRadius:7,fontSize:12,background:C.blueL,color:C.blue,fontWeight:500}}>📄 {d}</span>)}
            </div>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 6px"}}>⚖️ Grille de décision</div>
            {[["✅ Accepté",fiche.seuils_decision.accept,C.greenL,C.greenD],
              ["⚠️ Accepté avec réserve",fiche.seuils_decision.reserve,C.amberL,C.amber],
              ["❌ Refusé",fiche.seuils_decision.refus,C.redL,C.red],
            ].map(([label,val,bg,col])=>(
              <div key={label} style={{background:bg,borderRadius:8,padding:"8px 12px",marginBottom:6,fontSize:13}}>
                <span style={{fontWeight:700,color:col}}>{label}</span>
                <span style={{color:col,marginLeft:8}}>{val}</span>
              </div>
            ))}

            <div style={{marginTop:10,background:"#EDE9FE",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#5B21B6"}}>
              <AI_BADGE/> <strong style={{marginLeft:6}}>{fiche.responsableDecision}</strong>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SectionVeilleReglementaire = () => {
  const [vue, setVue] = useState("registre");
  const [selectedTexte, setSelectedTexte] = useState(null);
  const [selFonction, setSelFonction] = useState(null);
  const [selectedSnap, setSelectedSnap] = useState(null);

  const nbAlertes = TEXTES_REGL.filter(t=>t.alerteActive).length;
  const nbDossiersAlerte = SNAPSHOTS_DOSSIER.filter(s=>s.alerteReglPostDepot).length;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>⚖️ Veille réglementaire</div>
          <div style={{fontSize:13,color:C.tx2}}>Versionnement des textes · Snapshots par dossier · Alertes de conformité</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            ["registre",       "#7C3AED","📋 Registre textes"],
            ["snapshots",      "#7C3AED","🗃️ Snapshots dossiers"],
            ["ia_transparence","#1E40AF","🤖 IA Transparence"],
          ].map(([v,col,lbl])=>(
            <button key={v} onClick={()=>setVue(v)}
              style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1.5px solid ${vue===v?col:C.bd}`,
                background:vue===v?col:"transparent",color:vue===v?"#fff":C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
              {lbl}{v==="ia_transparence"&&<span style={{
                fontSize:9,background:"#EF4444",color:"#fff",borderRadius:20,
                padding:"1px 5px",marginLeft:5,fontWeight:800}}>2 août</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Alerte générale */}
      {nbAlertes>0&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,
          padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>🚨</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#991B1B",marginBottom:4}}>
              {nbAlertes} texte{nbAlertes>1?"s":""} avec alerte active — {nbDossiersAlerte} dossier{nbDossiersAlerte>1?"s":""} concerné{nbDossiersAlerte>1?"s":""}
            </div>
            <div style={{fontSize:12,color:"#7F1D1D",lineHeight:1.6,marginBottom:6}}>
              <strong>Décret n° 2025-401 annulé</strong> par le Conseil d'État le 15 juillet 2026 (procédure irrégulière — défaut de consultation du public). L'arrêté du 2 mai 2025 reste en vigueur mais sa base légale est fragilisée.
            </div>
            <div style={{background:"#FFF1F2",border:"1px solid #FDA4AF",borderRadius:8,
              padding:"8px 12px",fontSize:11,color:"#881337",fontStyle:"italic",fontWeight:600}}>
              ⚠️ Ne pas garantir l'éligibilité ni le maintien d'une aide individuelle sans analyse juridique au cas par cas.
            </div>
          </div>
        </div>
      )}

      {/* Clause de réserve */}
      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:10,
        padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:16,flexShrink:0}}>📌</span>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#6D28D9",marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"}}>
            Clause de réserve standard — à apposer sur tout document préparatoire
          </div>
          <div style={{fontSize:12,color:"#4C1D95",fontStyle:"italic",fontWeight:600}}>
            « {CLAUSE_RESERVE} »
          </div>
        </div>
      </div>

      {vue==="registre" && (
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {Object.entries(STATUT_REGL).map(([k,s])=>{
              const n = TEXTES_REGL.filter(t=>t.statut===k).length;
              return (
                <div key={k} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
                  padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{n}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Liste textes */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {TEXTES_REGL.map(t=>{
              const st = STATUT_REGL[t.statut]||STATUT_REGL.applicable;
              const isOpen = selectedTexte===t.id;
              return (
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  border:`1px solid ${t.alerteActive?"#FECACA":C.bd}`,overflow:"hidden",
                  boxShadow:t.alerteActive?"0 0 0 2px #FEE2E2":undefined}}>
                  {/* Header */}
                  <div onClick={()=>setSelectedTexte(isOpen?null:t.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                      background:t.alerteActive?"#FFF5F5":"#fff"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:700,
                          background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                        {t.alerteActive&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,
                          background:"#FEE2E2",color:"#991B1B",fontWeight:700}}>🚨 Alerte</span>}
                        <span style={{fontSize:10,color:C.tx2}}>Mis à jour {new Date(t.dateStatut).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{t.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{t.texteRef}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,color:C.tx2}}>
                        {t.dossiersImpactes.length} dossier{t.dossiersImpactes.length>1?"s":""}
                      </span>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {/* Détail */}
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Informations</div>
                          {[
                            ["Source décision",t.sourceStatut],
                            ["Motif",t.motifStatut],
                            ["Consultation",new Date(t.dateConsultation).toLocaleDateString("fr-FR")],
                            ["Version critères",t.versionCriteres],
                            t.remplacePar&&["Remplacé par",t.remplacePar],
                          ].filter(Boolean).map(([k,v])=>(
                            <div key={k} style={{display:"flex",gap:8,padding:"5px 8px",
                              borderBottom:`1px solid ${C.bd}`,fontSize:11}}>
                              <span style={{color:C.tx2,minWidth:120,flexShrink:0}}>{k}</span>
                              <span style={{color:C.tx,fontWeight:500}}>{v}</span>
                            </div>
                          ))}
                        </div>

                        <div>
                          {t.reservesJuridiques.length>0&&(
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:6}}>
                                ⚠️ Réserves juridiques ({t.reservesJuridiques.length})
                              </div>
                              {t.reservesJuridiques.map((r,i)=>(
                                <div key={i} style={{display:"flex",gap:6,marginBottom:6,fontSize:11,
                                  padding:"6px 8px",borderRadius:6,background:"#FEF2F2",
                                  border:"1px solid #FECACA"}}>
                                  <span style={{color:"#991B1B",flexShrink:0}}>•</span>
                                  <span style={{color:"#7F1D1D",lineHeight:1.4}}>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Dossiers concernés</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {t.dossiersImpactes.map(d=>(
                                <span key={d} style={{fontSize:10,padding:"2px 8px",borderRadius:4,
                                  background:"#EDE9FE",color:"#7C3AED",fontWeight:600}}>{d}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Télécharger snapshot PDF
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          🔗 Source officielle (Légifrance)
                        </button>
                        {t.alerteActive&&(
                          <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                            cursor:"pointer",border:"1px solid #DC2626",background:"#FEF2F2",
                            color:"#991B1B",fontFamily:"inherit"}}>
                            📋 Générer note d'impact dossiers
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vue==="snapshots" && (
        <div>
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
            padding:"10px 14px",marginBottom:14,fontSize:11,color:"#1E40AF",lineHeight:1.6}}>
            💾 <strong>Principe de l'archivage :</strong> APPLITAG conserve une copie datée des règles et documents en vigueur au moment de la préparation de chaque dossier. Cette copie est immuable et sert de preuve en cas de contestation réglementaire ultérieure.
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SNAPSHOTS_DOSSIER.map(snap=>{
              const isOpen = selectedSnap===snap.id;
              const statutSnap = snap.statut==="alerte"
                ? {color:"#991B1B",bg:"#FEE2E2",icon:"🚨",label:"Alerte post-dépôt"}
                : {color:"#065F46",bg:"#D1FAE5",icon:"✅",label:"Conforme"};
              return (
                <div key={snap.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1px solid ${snap.alerteReglPostDepot?"#FECACA":C.bd}`,
                  boxShadow:snap.alerteReglPostDepot?"0 0 0 2px #FEE2E2":undefined}}>
                  <div onClick={()=>setSelectedSnap(isOpen?null:snap.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                      background:snap.alerteReglPostDepot?"#FFF5F5":"#fff"}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,
                          background:statutSnap.bg,color:statutSnap.color}}>
                          {statutSnap.icon} {statutSnap.label}
                        </span>
                        <span style={{fontSize:10,color:C.tx2,fontFamily:"monospace"}}>{snap.dossierId}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{snap.dossierNom}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>
                        Préparé le {new Date(snap.datePreparation).toLocaleDateString("fr-FR")} par {snap.auteur}
                        {snap.clauseReserveApposee&&<span style={{marginLeft:8,color:"#7C3AED",fontWeight:600}}>· ✓ Clause réserve apposée</span>}
                      </div>
                    </div>
                    <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>

                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      {snap.alerteReglPostDepot&&(
                        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,
                          padding:"10px 12px",marginBottom:12,fontSize:11,color:"#7F1D1D"}}>
                          <div style={{fontWeight:700,marginBottom:4}}>🚨 Alerte réglementaire post-dépôt</div>
                          {snap.alerteDetail}
                          <div style={{marginTop:6,fontWeight:700,color:"#991B1B"}}>
                            Action requise : analyser l'impact sur ce dossier au cas par cas.
                          </div>
                        </div>
                      )}

                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>
                          📸 Snapshot des textes au {new Date(snap.datePreparation).toLocaleDateString("fr-FR")}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {snap.textesSnapshot.map((ts,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",
                              alignItems:"center",padding:"7px 10px",borderRadius:7,
                              background:"#fff",border:`1px solid ${C.bd}`,fontSize:11}}>
                              <div>
                                <span style={{fontWeight:600,color:C.tx}}>{ts.ref}</span>
                                <span style={{color:C.tx2,marginLeft:8}}>{ts.version}</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,color:C.tx2}}>Statut au dépôt :</span>
                                <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700,
                                  background:STATUT_REGL[ts.statut_au_depot]?.bg||"#F3F4F6",
                                  color:STATUT_REGL[ts.statut_au_depot]?.color||"#6B7280"}}>
                                  {STATUT_REGL[ts.statut_au_depot]?.label||ts.statut_au_depot}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Clause réserve */}
                      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:8,
                        padding:"8px 12px",fontSize:11,color:"#4C1D95",fontStyle:"italic",marginBottom:10}}>
                        « {CLAUSE_RESERVE} »
                      </div>

                      <div style={{display:"flex",gap:8}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Exporter snapshot certifié
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📄 Ouvrir dossier parcelle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── IA TRANSPARENCE — Art. 50 Règlement IA ── */}
      {vue==="ia_transparence"&&(()=>{
        const nbAdapt = INVENTAIRE_IA.filter(f=>f.statut==="a_adapter").length;
        const _sel = selFonction ? INVENTAIRE_IA.find(f=>f.id===selFonction) : null;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière deadline */}
            <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
              border:"2px solid #3B82F6",borderRadius:12,padding:"14px 16px",
              display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>🤖</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#1E40AF"}}>
                    Règlement IA — Article 50 : obligations de transparence
                  </div>
                  <span style={{fontSize:10,background:"#EF4444",color:"#fff",
                    borderRadius:20,padding:"2px 8px",fontWeight:800}}>
                    Applicable le 2 août 2026
                  </span>
                </div>
                <div style={{fontSize:12,color:"#1E3A8A",lineHeight:1.7}}>
                  Lignes directrices définitives publiées le 20 juillet 2026 par la Commission européenne.
                  Concernent les systèmes interactifs, les contenus générés ou modifiés par IA et les deepfakes.
                  <strong> {nbAdapt} fonction{nbAdapt>1?"s":""} APPLITAG à adapter avant la date limite.</strong>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {Object.entries(IA_STATUT).map(([k,s])=>{
                const n = INVENTAIRE_IA.filter(f=>f.statut===k).length;
                return (
                  <div key={k} style={{background:s.bg,borderRadius:10,
                    border:`1.5px solid ${s.color}44`,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:18}}>{s.icon}</div>
                    <div style={{fontSize:20,fontWeight:900,color:s.color}}>{n}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:700,marginTop:2}}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Inventaire fonctions IA */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:2}}>
                Inventaire des fonctions IA — 6 périmètres identifiés
              </div>
              {INVENTAIRE_IA.map(f=>{
                const st = IA_STATUT[f.statut]||IA_STATUT.a_adapter;
                const isOpen = selFonction===f.id;
                const nbFait = f.mentions.filter(m=>m.fait).length;
                const pct    = Math.round(nbFait/f.mentions.length*100);
                return (
                  <div key={f.id} style={{background:"#fff",borderRadius:12,
                    border:`1.5px solid ${st.color}44`,overflow:"hidden"}}>
                    {/* Header */}
                    <div onClick={()=>setSelFonction(isOpen?null:f.id)}
                      style={{padding:"12px 14px",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:12,
                        background:isOpen?st.bg+"80":"#fff",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",
                            borderRadius:10,background:st.bg,color:st.color}}>
                            {st.icon} {st.label}
                          </span>
                          <span style={{fontSize:10,color:C.tx3}}>{f.type}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{f.nom}</div>
                        <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{f.scope50}</div>
                      </div>
                      {/* Progress mentions */}
                      <div style={{textAlign:"center",flexShrink:0,minWidth:52}}>
                        <div style={{fontSize:16,fontWeight:900,
                          color:pct===100?"#065F46":pct>0?"#B45309":"#991B1B"}}>{pct}%</div>
                        <div style={{fontSize:9,color:C.tx3}}>mentions</div>
                      </div>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>

                    {/* Détail */}
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                        background:"#FAFAFA",display:"flex",flexDirection:"column",gap:12}}>

                        {/* Checklist mentions */}
                        <div>
                          <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                            Mentions de transparence obligatoires
                          </div>
                          {f.mentions.map((m,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                              padding:"8px 10px",borderRadius:8,marginBottom:4,
                              background:m.fait?"#F0FDF4":"#FFF7ED",
                              border:`1px solid ${m.fait?"#86EFAC":"#FED7AA"}`}}>
                              <span style={{fontSize:16,flexShrink:0}}>{m.fait?"✅":"⏳"}</span>
                              <span style={{fontSize:12,color:m.fait?"#065F46":"#92400E"}}>{m.texte}</span>
                              <span style={{marginLeft:"auto",fontSize:9,flexShrink:0,
                                fontWeight:700,color:m.fait?"#065F46":"#92400E"}}>
                                {m.fait?"FAIT":"À FAIRE"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Contrôle humain */}
                        <div style={{background:"#EFF6FF",borderRadius:8,padding:"10px 12px",
                          border:"1px solid #BFDBFE"}}>
                          <div style={{fontSize:11,fontWeight:800,color:"#1E40AF",marginBottom:4}}>
                            👤 Contrôle humain défini
                          </div>
                          <div style={{fontSize:12,color:"#1E3A8A"}}>{f.controlHumain}</div>
                        </div>

                        {/* Données & prestataire */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>📤 Données transmises</div>
                            <div style={{fontSize:11,color:C.tx}}>{f.donneesTransmises}</div>
                          </div>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                            border:f.prestataire.includes("À")?"1px solid #FED7AA":undefined}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>🏢 Prestataire IA</div>
                            <div style={{fontSize:11,fontWeight:f.prestataire.includes("À")?700:400,
                              color:f.prestataire.includes("À")?"#92400E":C.tx}}>{f.prestataire}</div>
                          </div>
                        </div>

                        {/* Risques */}
                        {f.risques.length>0&&(
                          <div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 12px",
                            border:"1px solid #FECACA"}}>
                            <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>
                              🚫 Risques à éviter
                            </div>
                            {f.risques.map((r,i)=>(
                              <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"2px 0",lineHeight:1.5}}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Journal */}
                        <div style={{display:"flex",alignItems:"center",gap:8,
                          padding:"8px 10px",borderRadius:8,
                          background:f.journalDecisions?"#F0FDF4":"#FFF7ED",
                          border:`1px solid ${f.journalDecisions?"#86EFAC":"#FED7AA"}`}}>
                          <span>{f.journalDecisions?"✅":"⏳"}</span>
                          <span style={{fontSize:11,
                            color:f.journalDecisions?"#065F46":"#92400E"}}>
                            Journal des suggestions ayant influencé une décision
                            {f.journalDecisions?" — activé":" — à mettre en place"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Journal des décisions IA */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                📔 Journal des suggestions IA ayant influencé une décision
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr>
                      {["Date","Fonction","Action","Suggestion IA","Validation humaine","Décision finale","Corrigé"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",
                          background:"#EFF6FF",color:"#1E40AF",fontWeight:800,
                          borderBottom:"2px solid #BFDBFE",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JOURNAL_IA_DEMO.map((j,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"8px 10px",whiteSpace:"nowrap",color:C.tx3}}>
                          {new Date(j.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td style={{padding:"8px 10px",fontWeight:700,color:"#1E40AF"}}>{j.fonction}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.action}</td>
                        <td style={{padding:"8px 10px",color:C.tx2,fontStyle:"italic"}}>{j.suggestion}</td>
                        <td style={{padding:"8px 10px",color:"#065F46",fontWeight:600}}>{j.validation}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.decisionFinale}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          {j.corrigé
                            ? <span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>Corrigé</span>
                            : <span style={{fontSize:10,background:"#D1FAE5",color:"#065F46",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6 actions avant le 2 août */}
            <div style={{background:"linear-gradient(135deg,#FFF7ED,#FEF3C7)",
              borderRadius:12,padding:"14px",border:"1.5px solid #FCD34D"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:10}}>
                ✅ Plan d'actions — avant le 2 août 2026
              </div>
              {[
                ["1","Inventorier toutes les fonctions IA",   "Fait — 6 fonctions identifiées ci-dessus","#065F46","#D1FAE5"],
                ["2","Identifier les données transmises à chaque prestataire","À compléter — prestataires LLM à confirmer","#B45309","#FEF3C7"],
                ["3","Définir le contrôle humain pour chaque fonction",        "Partiellement défini — détail par fonction","#B45309","#FEF3C7"],
                ["4","Ajouter les mentions de transparence dans l'interface",  "À implémenter dans les vues concernées","#B45309","#FEF3C7"],
                ["5","Formaliser la règle éditoriale Radio & TV",              "À rédiger avant toute diffusion synthétique","#991B1B","#FEE2E2"],
                ["6","Conserver l'historique des suggestions décisionnelles",  "Journal démo actif — à connecter en production","#B45309","#FEF3C7"],
              ].map(([n,lbl,statut,col,bg])=>(
                <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"9px 10px",borderRadius:8,marginBottom:6,
                  background:bg,border:`1px solid ${col}33`}}>
                  <span style={{fontSize:14,fontWeight:900,color:col,
                    width:22,textAlign:"center",flexShrink:0}}>{n}.</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:col,marginTop:2,fontWeight:600}}>{statut}</div>
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

// ── LIVRAISONS ──────────────────────────────────────────────────

const LIVRAISONS_DATA = [
  {id:"LIV-2026-0234",transport:"TRP-2026-0898",lot:"LOT-2026-041",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-18",heure:"15:42",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:27100,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0234",signature:true,
   observations:"RAS — réception conforme",statut:"validé"},
  {id:"LIV-2026-0228",transport:"TRP-2026-0891",lot:"LOT-2026-038",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-16",heure:"09:35",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:24650,humidite:25,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0228",signature:true,
   observations:"Bonne qualité — taux humidité excellent",statut:"validé"},
  {id:"LIV-2026-0219",transport:"TRP-2026-0876",lot:"LOT-2026-031",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-15",heure:"08:58",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:25200,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0219",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0198",transport:"TRP-2026-0856",lot:"LOT-2026-024",
   chaufferie:"Chaufferie Moulins",date:"2026-07-08",heure:"11:12",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:23800,humidite:27,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0198",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0187",transport:"TRP-2026-0841",lot:"LOT-2026-019",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-02",heure:"14:20",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:null,humidite:36,granulometrie:"G30-G50",conformite:false,
   refus:true,motifRefus:"Humidité excessive (36%) — lot refusé, retour plateforme",
   bdl:"BL-2026-0187",signature:true,
   observations:"Litige en cours — lot retourné au stockage",statut:"refusé"},
];

const STATUT_LIV = {
  validé:  {label:"Validé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  refusé:  {label:"Refusé",   icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
  partiel: {label:"Partiel",  icon:"⚠️",col:"#92400E",bg:"#FEF3C7"},
  en_attente:{label:"En attente",icon:"⏳",col:"#6B7280",bg:"#F3F4F6"},
};

// PCI — ITEBE 2004 — plaquettes bois feuillus
// PCI(H%) = PCS_sec × (1 − H/100) − L_vap × H/100  avec PCS=5200 kWh/t, L_vap=678.6 kWh/t
const pciKWhT = (h) => Math.round(5200 - 58.8 * h);
const livMWh  = (kg, h) => Math.round(kg / 1000 * pciKWhT(h) / 100) / 10;

const normaliserLivraison = (l: any) => ({
  ...l,
  lot:       l.lot      ?? l.lotNumero ?? l.lotId ?? "—",
  chaufferie:l.chaufferie ?? l.nomDestination ?? "—",
  // API stocke en tonnes, l'UI historique travaille en kg
  poidsNet:  l.poidsNet  != null ? (l.poidsNet  < 500 ? l.poidsNet  * 1000 : l.poidsNet)  : null,
  poidsBrut: l.poidsBrut != null ? (l.poidsBrut < 500 ? l.poidsBrut * 1000 : l.poidsBrut) : null,
  tare:      l.tare      != null ? (l.tare      < 500 ? l.tare      * 1000 : l.tare)      : null,
  humidite:  l.humidite  ?? l.humiditeReception ?? null,
  conformite: l.conformite ?? (l.statut === "verifiee" || l.peseeVerifiee === true),
  refus:     l.refus ?? (l.statut === "litigieuse"),
  statut:    l.statut === "verifiee"   ? "validé"
           : l.statut === "litigieuse" ? "refusé"
           : l.statut === "declaree"   ? "déclarée"
           : (l.statut ?? "déclarée"),
});

export const SectionLivraisons = () => {
  const [allLivraisons, setAllLivraisons] = useState(LIVRAISONS_DATA);
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (apiGet("/livraisons") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0)
          setAllLivraisons(data.map(normaliserLivraison));
      })
      .catch(() => {});
  }, []);

  const livraisons = filtreStatut==="tous" ? allLivraisons
    : allLivraisons.filter(l=>l.statut===filtreStatut);
  const lv = selected ? allLivraisons.find(l=>l.id===selected) : null;

  const totalTonnes = allLivraisons.filter(l=>l.poidsNet).reduce((s,l)=>s+l.poidsNet,0);
  const nbRefus     = allLivraisons.filter(l=>l.refus).length;
  const txConformite= allLivraisons.length>0 ? Math.round(allLivraisons.filter(l=>l.conformite).length/allLivraisons.length*100) : 0;
  const humFilt     = allLivraisons.filter(l=>l.humidite);
  const humMoy      = humFilt.length>0 ? Math.round(humFilt.reduce((s,l)=>s+l.humidite,0)/humFilt.length) : 0;
  const totalMWh    = Math.round(allLivraisons.filter(l=>l.poidsNet&&l.humidite).reduce((s,l)=>s+livMWh(l.poidsNet,l.humidite),0));

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📦 Livraisons & réceptions</div>
        <div style={{fontSize:13,color:C.tx2}}>Réception chaufferie, pesée, qualité, conformité</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"⚖️",label:"Tonnes reçues",val:(totalTonnes/1000).toFixed(1)+" t",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚡",label:"Énergie livrée",val:totalMWh+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"✅",label:"Taux conformité",val:txConformite+"%",col:txConformite>=90?"#059669":"#D97706",bg:txConformite>=90?"#D1FAE5":"#FEF3C7"},
          {ico:"💧",label:"Humidité moy.",val:humMoy+"%",col:humMoy<=30?"#0369A1":"#D97706",bg:humMoy<=30?"#DBEAFE":"#FEF3C7"},
          {ico:"❌",label:"Refus",val:nbRefus+" lot"+(nbRefus>1?"s":""),col:nbRefus>0?"#991B1B":"#059669",bg:nbRefus>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Toutes"],["validé","Validées"],["déclarée","Déclarées"],["refusé","Refusées"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
          + Saisir une réception
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:lv?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {livraisons.map(l=>{
            const st = STATUT_LIV[l.statut]||STATUT_LIV.en_attente;
            const isSelected = selected===l.id;
            return (
              <div key={l.id} onClick={()=>setSelected(isSelected?null:l.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":l.refus?"#FCA5A5":C.bd}`}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{l.id}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                    </div>
                    <div style={{fontSize:11,color:C.tx2}}>{l.lot} → {l.chaufferie}</div>
                    <div style={{display:"flex",gap:10,marginTop:4,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📅 {l.date} à {l.heure}</span>
                      <span>👤 {l.chauffeur}</span>
                      <span>💧 Humidité : {l.humidite??"-"}%</span>
                      <span>📐 {l.granulometrie}</span>
                      {l.humidite&&l.poidsNet&&<span style={{color:"#7C3AED",fontWeight:700}}>⚡ {pciKWhT(l.humidite)} kWh/t · {livMWh(l.poidsNet,l.humidite)} MWh</span>}
                      {l.signature&&<span>✍️ Signé</span>}
                    </div>
                    {l.refus&&<div style={{marginTop:4,fontSize:10,color:"#991B1B",fontWeight:600}}>
                      ❌ {l.motifRefus}
                    </div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:l.poidsNet?"#1E5B3A":"#9CA3AF"}}>
                      {l.poidsNet?(l.poidsNet/1000).toFixed(2)+" t":"—"}
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>poids net</div>
                    <div style={{fontSize:10,color:"#0369A1",marginTop:4}}>{l.bdl}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {lv&&(
          <div style={{background:"#fff",borderRadius:14,
            border:`2px solid ${lv.refus?"#DC2626":"#1E5B3A"}`,padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{lv.id}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {lv.refus&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",
                marginBottom:12,fontSize:11,color:"#991B1B",border:"1px solid #FECACA",fontWeight:600}}>
                ❌ {lv.motifRefus}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Lot",lv.lot],["Chaufferie",lv.chaufferie],
                ["Date / Heure",lv.date+" à "+lv.heure],
                ["Chauffeur",lv.chauffeur],["Véhicule",lv.vehicule],
                ["Poids net",lv.poidsNet?(lv.poidsNet/1000).toFixed(2)+" t":"Non saisi"],
                ["Humidité",lv.humidite?lv.humidite+"%":"—"],
                ["PCI (ITEBE 2004)",lv.humidite?pciKWhT(lv.humidite)+" kWh/t":"—"],
                ["Énergie livrée",(lv.poidsNet&&lv.humidite)?livMWh(lv.poidsNet,lv.humidite)+" MWh":"—"],
                ["Granulométrie",lv.granulometrie],
                ["Conformité",lv.conformite?"✅ Conforme":"❌ Non conforme"],
                ["Bon de livraison",lv.bdl],
                ["Signature",lv.signature?"✍️ Apposée":"En attente"],
                ["Observations",lv.observations||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:120,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                ⬇️ Bon de livraison PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CHAUFFERIES ──────────────────────────────────────────────────

const CHAUFFERIES_DATA = [
  // ── Auvergne-Rhône-Alpes ──────────────────────────────────────
  {id:"ch1",nom:"Réseau chaleur Vichy Agglo",commune:"Vichy (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:6.8,consoAnnT:13600,stockCapaT:800,stockActuelT:312,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Perrier — 04 70 32 11 00",
   acces:"ZI de Vichy — accès PL 24h/24 sauf dimanche",
   horairesReception:"Lun–Ven 07h–17h / Sam 07h–12h",
   prochaineLivraison:"2026-07-28",volumePrevu:24,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  {id:"ch2",nom:"Chaufferie Moulins Énergie",commune:"Moulins (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:4.2,consoAnnT:8400,stockCapaT:500,stockActuelT:89,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Girard — 04 70 46 22 00",
   acces:"Rue des Châtaigniers — réservation obligatoire",
   horairesReception:"Lun–Ven 08h–16h",
   prochaineLivraison:"2026-07-24",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:1,statut:"alerte"},
  {id:"ch3",nom:"Chaufferie Saint-Étienne Métropole",commune:"Saint-Étienne (42)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:12.5,consoAnnT:25000,stockCapaT:1500,stockActuelT:820,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Deschamps — 04 77 43 00 11",
   acces:"ZI Molina-la-Chazotte — accès PL dédié",
   horairesReception:"Lun–Sam 06h–18h",
   prochaineLivraison:"2026-07-30",volumePrevu:45,
   livraisons:14,livraisonsConformes:13,alertes:0,statut:"ok"},
  {id:"ch4",nom:"Réseau bois Annecy Montagne",commune:"Annecy (74)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:430,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Favre — 04 50 51 20 00",
   acces:"ZA des Glaisins — quai de réception couvert",
   horairesReception:"Lun–Ven 07h–17h30",
   prochaineLivraison:"2026-08-04",volumePrevu:32,
   livraisons:10,livraisonsConformes:10,alertes:0,statut:"ok"},
  // ── Bourgogne-Franche-Comté ───────────────────────────────────
  {id:"ch5",nom:"Chaufferie bois Dijon Métropole",commune:"Dijon (21)",region:"Bourgogne-Franche-Comté",
   puissanceMW:10.2,consoAnnT:20400,stockCapaT:1200,stockActuelT:156,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Renard — 03 80 74 52 00",
   acces:"ZI Cap Nord — portail automatique camion",
   horairesReception:"Lun–Ven 07h–19h / Sam 07h–12h",
   prochaineLivraison:"2026-07-25",volumePrevu:55,
   livraisons:12,livraisonsConformes:11,alertes:1,statut:"alerte"},
  {id:"ch6",nom:"Réseau chaleur Besançon Est",commune:"Besançon (25)",region:"Bourgogne-Franche-Comté",
   puissanceMW:5.6,consoAnnT:11200,stockCapaT:700,stockActuelT:390,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Pernet — 03 81 87 40 00",
   acces:"Rue de la Malcombe — pont-bascule sur site",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:28,
   livraisons:7,livraisonsConformes:7,alertes:0,statut:"ok"},
  // ── Grand Est ────────────────────────────────────────────────
  {id:"ch7",nom:"Chaufferie bois Strasbourg Nord",commune:"Strasbourg (67)",region:"Grand Est",
   puissanceMW:22.0,consoAnnT:44000,stockCapaT:2500,stockActuelT:1100,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Schneider — 03 88 60 90 90",
   acces:"Port du Rhin — accès fluvial + PL",
   horairesReception:"Lun–Ven 06h–20h / Sam 06h–14h",
   prochaineLivraison:"2026-07-26",volumePrevu:80,
   livraisons:22,livraisonsConformes:21,alertes:0,statut:"ok"},
  {id:"ch8",nom:"Réseau de chaleur Nancy Plateau de Haye",commune:"Nancy (54)",region:"Grand Est",
   puissanceMW:7.5,consoAnnT:15000,stockCapaT:850,stockActuelT:62,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Mathieu — 03 83 32 00 00",
   acces:"Plateau de Haye — voie réservée bois-énergie",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-07-23",volumePrevu:35,
   livraisons:9,livraisonsConformes:9,alertes:1,statut:"alerte"},
  // ── Occitanie ────────────────────────────────────────────────
  {id:"ch9",nom:"Chaufferie bois Toulouse Lardenne",commune:"Toulouse (31)",region:"Occitanie",
   puissanceMW:9.0,consoAnnT:18000,stockCapaT:1000,stockActuelT:520,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Lacombe — 05 61 22 29 22",
   acces:"Route de Bayonne — déchargement automatisé",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-01",volumePrevu:40,
   livraisons:11,livraisonsConformes:10,alertes:0,statut:"ok"},
  {id:"ch10",nom:"Réseau chaleur Montpellier Ovalie",commune:"Montpellier (34)",region:"Occitanie",
   puissanceMW:6.0,consoAnnT:12000,stockCapaT:720,stockActuelT:280,
   humiMax:32,granuAccepte:"G30-G50 / P31",
   contact:"Mme Vidal — 04 67 34 70 00",
   acces:"ZA Ovalie — accès par chemin rural (18t maxi)",
   horairesReception:"Lun–Ven 08h–16h30",
   prochaineLivraison:"2026-08-06",volumePrevu:30,
   livraisons:6,livraisonsConformes:6,alertes:0,statut:"ok"},
  // ── Bretagne ─────────────────────────────────────────────────
  {id:"ch11",nom:"Chaufferie bois Rennes Beaulieu",commune:"Rennes (35)",region:"Bretagne",
   puissanceMW:5.5,consoAnnT:11000,stockCapaT:650,stockActuelT:195,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Le Goff — 02 99 87 41 00",
   acces:"Campus de Beaulieu — livraisons hors cours",
   horairesReception:"Lun–Ven 08h–17h (hors vacances scolaires)",
   prochaineLivraison:"2026-07-29",volumePrevu:25,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
  {id:"ch12",nom:"Réseau chaleur Brest Kergaradec",commune:"Brest (29)",region:"Bretagne",
   puissanceMW:3.8,consoAnnT:7600,stockCapaT:450,stockActuelT:180,
   humiMax:32,granuAccepte:"G30-G50 / G50",
   contact:"Mme Riou — 02 98 00 80 80",
   acces:"ZI Kergaradec — portail téléguidé",
   horairesReception:"Lun–Ven 07h30–17h30",
   prochaineLivraison:"2026-08-12",volumePrevu:20,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Normandie ────────────────────────────────────────────────
  {id:"ch13",nom:"Chaufferie bois Rouen Rive Gauche",commune:"Rouen (76)",region:"Normandie",
   puissanceMW:8.4,consoAnnT:16800,stockCapaT:1000,stockActuelT:410,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Duplessis — 02 35 72 20 00",
   acces:"Zone de l'Aubette — quai à camion couvert",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-02",volumePrevu:38,
   livraisons:9,livraisonsConformes:9,alertes:0,statut:"ok"},
  // ── Nouvelle-Aquitaine ───────────────────────────────────────
  {id:"ch14",nom:"Réseau de chaleur Bordeaux Mérignac",commune:"Mérignac (33)",region:"Nouvelle-Aquitaine",
   puissanceMW:11.0,consoAnnT:22000,stockCapaT:1300,stockActuelT:750,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Aubert — 05 56 12 00 00",
   acces:"ZA du Phare — pont-bascule + déchargement pneumatique",
   horairesReception:"Lun–Sam 06h–19h",
   prochaineLivraison:"2026-07-27",volumePrevu:50,
   livraisons:15,livraisonsConformes:14,alertes:0,statut:"ok"},
  {id:"ch15",nom:"Chaufferie bois Limoges Beffroi",commune:"Limoges (87)",region:"Nouvelle-Aquitaine",
   puissanceMW:6.2,consoAnnT:12400,stockCapaT:750,stockActuelT:340,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Delmas — 05 55 45 20 00",
   acces:"Rue Beffroi — camion max 10 t sur voie locale",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-08",volumePrevu:22,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Pays de la Loire ─────────────────────────────────────────
  {id:"ch16",nom:"Réseau chaleur Nantes Nord",commune:"Nantes (44)",region:"Pays de la Loire",
   puissanceMW:14.0,consoAnnT:28000,stockCapaT:1600,stockActuelT:700,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Guérin — 02 40 41 90 00",
   acces:"ZI de Carquefou — silo automatique + pont-bascule",
   horairesReception:"Lun–Ven 06h–20h",
   prochaineLivraison:"2026-07-28",volumePrevu:65,
   livraisons:18,livraisonsConformes:17,alertes:0,statut:"ok"},
  // ── Hauts-de-France ──────────────────────────────────────────
  {id:"ch17",nom:"Chaufferie bois Lille Hellemmes",commune:"Hellemmes (59)",region:"Hauts-de-France",
   puissanceMW:16.5,consoAnnT:33000,stockCapaT:2000,stockActuelT:890,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Leroy — 03 20 14 50 50",
   acces:"ZI Hellemmes — portique de contrôle + pont-bascule",
   horairesReception:"Lun–Sam 06h–20h",
   prochaineLivraison:"2026-07-26",volumePrevu:75,
   livraisons:20,livraisonsConformes:19,alertes:0,statut:"ok"},
  // ── Île-de-France ────────────────────────────────────────────
  {id:"ch18",nom:"Réseau bois Saclay — CEA",commune:"Saclay (91)",region:"Île-de-France",
   puissanceMW:20.0,consoAnnT:40000,stockCapaT:2200,stockActuelT:980,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Marchand — 01 69 08 50 00",
   acces:"Plateau de Saclay — badge sécurité requis + escorte",
   horairesReception:"Lun–Ven 07h–17h (badge obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:90,
   livraisons:25,livraisonsConformes:24,alertes:0,statut:"ok"},
  // ── Provence-Alpes-Côte d'Azur ───────────────────────────────
  {id:"ch19",nom:"Chaufferie bois Aix-en-Provence ZAC",commune:"Aix-en-Provence (13)",region:"Provence-Alpes-Côte d'Azur",
   puissanceMW:7.2,consoAnnT:14400,stockCapaT:850,stockActuelT:290,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"Mme Bonnet — 04 42 91 90 00",
   acces:"ZAC Les Milles — entrée P2, 2e portail",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-05",volumePrevu:33,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Corse ────────────────────────────────────────────────────
  {id:"ch20",nom:"Chaufferie bois Ajaccio Cannes-Échelle",commune:"Ajaccio (2A)",region:"Corse",
   puissanceMW:2.4,consoAnnT:4800,stockCapaT:280,stockActuelT:95,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"M. Colonna — 04 95 23 40 00",
   acces:"ZI de Mezzavia — route étroite (12 t maxi), croisement difficile",
   horairesReception:"Lun–Ven 08h–16h (approvisionnement maritime août)",
   prochaineLivraison:"2026-08-03",volumePrevu:15,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  {id:"ch21",nom:"Réseau chaleur Bastia Toga",commune:"Bastia (2B)",region:"Corse",
   puissanceMW:1.8,consoAnnT:3600,stockCapaT:200,stockActuelT:38,
   humiMax:34,granuAccepte:"G30-G50 / P45",
   contact:"Mme Santoni — 04 95 32 11 00",
   acces:"ZI de Toga — quai côté mer, accès PL limité port",
   horairesReception:"Lun–Ven 08h–12h uniquement",
   prochaineLivraison:"2026-07-25",volumePrevu:10,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Guadeloupe (971) ─────────────────────────────────────────
  {id:"ch22",nom:"Chaufferie bagasse-bois Gardel",commune:"Le Moule — Guadeloupe (971)",region:"Guadeloupe",
   puissanceMW:4.0,consoAnnT:8000,stockCapaT:400,stockActuelT:180,
   humiMax:40,granuAccepte:"G30-G50 / résidus canne",
   contact:"M. Céleste — 05 90 23 00 00",
   acces:"Route de l'Usine Gardel — pesée obligatoire à l'entrée",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Martinique (972) ─────────────────────────────────────────
  {id:"ch23",nom:"Chaufferie biomasse CHU Martinique",commune:"Fort-de-France (972)",region:"Martinique",
   puissanceMW:1.5,consoAnnT:3000,stockCapaT:150,stockActuelT:55,
   humiMax:38,granuAccepte:"G30-G50",
   contact:"Service énergie CHU — 05 96 55 20 00",
   acces:"Route de Châteaubœuf — livraisons sur RDV médical zone",
   horairesReception:"Mar et Jeu 07h30–11h30 uniquement",
   prochaineLivraison:"2026-08-04",volumePrevu:8,
   livraisons:2,livraisonsConformes:2,alertes:0,statut:"ok"},
  // ── La Réunion (974) ─────────────────────────────────────────
  {id:"ch24",nom:"Centrale biomasse Albioma Le Gol",commune:"Saint-Louis (974)",region:"La Réunion",
   puissanceMW:35.0,consoAnnT:70000,stockCapaT:3500,stockActuelT:1600,
   humiMax:45,granuAccepte:"G50 / bagasse / résidus canne",
   contact:"M. Payet — 02 62 49 40 00",
   acces:"Port du Gol — accès par convoi maritime + route littorale",
   horairesReception:"7j/7 06h–20h (consigne port obligatoire)",
   prochaineLivraison:"2026-07-27",volumePrevu:200,
   livraisons:30,livraisonsConformes:29,alertes:0,statut:"ok"},
  // ── Guyane (973) ─────────────────────────────────────────────
  {id:"ch25",nom:"Centrale biomasse EDF Dégrad-des-Cannes",commune:"Rémire-Montjoly (973)",region:"Guyane",
   puissanceMW:18.0,consoAnnT:36000,stockCapaT:2000,stockActuelT:820,
   humiMax:50,granuAccepte:"G50 / résidus forêt tropicale",
   contact:"M. Léonce — 05 94 27 00 00",
   acces:"Zone industrielle DDC — accès fluvial + route nationale",
   horairesReception:"Lun–Ven 07h–17h30 (contrôle phytosanitaire obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:120,
   livraisons:12,livraisonsConformes:12,alertes:0,statut:"ok"},
  // ── Mayotte (976) ────────────────────────────────────────────
  {id:"ch26",nom:"Chaufferie biomasse Longoni",commune:"Bandraboua (976)",region:"Mayotte",
   puissanceMW:2.0,consoAnnT:4000,stockCapaT:200,stockActuelT:42,
   humiMax:45,granuAccepte:"G30-G50 / résidus végétaux locaux",
   contact:"M. Madi — 02 69 61 00 00",
   acces:"Port de Longoni — accès containerisé uniquement",
   horairesReception:"Lun–Ven 08h–15h (selon marée port Longoni)",
   prochaineLivraison:"2026-08-15",volumePrevu:10,
   livraisons:1,livraisonsConformes:1,alertes:1,statut:"alerte"},
  // ── Saint-Pierre-et-Miquelon (975) ───────────────────────────
  {id:"ch27",nom:"Réseau chaleur Saint-Pierre Ville",commune:"Saint-Pierre (975)",region:"Saint-Pierre-et-Miquelon",
   puissanceMW:1.0,consoAnnT:2000,stockCapaT:120,stockActuelT:28,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Claireaux — 05 08 41 10 00",
   acces:"Port de Saint-Pierre — importation Canada/Métropole par cargo",
   horairesReception:"Selon arrivée cargo (planning trimestriel)",
   prochaineLivraison:"2026-09-10",volumePrevu:50,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Polynésie française (987) ─────────────────────────────────
  {id:"ch28",nom:"Centrale biomasse EDT — Fare Ute",commune:"Papeete — Polynésie française (987)",region:"Polynésie française",
   puissanceMW:5.0,consoAnnT:10000,stockCapaT:500,stockActuelT:210,
   humiMax:45,granuAccepte:"G50 / copeaux locaux",
   contact:"M. Tetuanui — +689 40 86 60 00",
   acces:"Zone portuaire Fare Ute — livraison par barge inter-îles",
   horairesReception:"Lun–Ven 07h–16h (heure locale Tahiti)",
   prochaineLivraison:"2026-08-20",volumePrevu:30,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  // ── Nouvelle-Calédonie (988) ──────────────────────────────────
  {id:"ch29",nom:"Centrale biomasse Prony Energies",commune:"Prony (988)",region:"Nouvelle-Calédonie",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:380,
   humiMax:48,granuAccepte:"G50 / résidus mine/bois locaux",
   contact:"M. Wamytan — +687 35 10 00",
   acces:"Route de Prony — accès industriel mine + port",
   horairesReception:"Lun–Ven 07h–17h (heure locale NC)",
   prochaineLivraison:"2026-08-18",volumePrevu:45,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
];

/* ═══════════════════════════════════════════════════════
   SECTION FACTURATION ÉLECTRONIQUE
   Obligations à partir du 01/09/2026 (réception) et 01/09/2027 (émission TPE/PME)
═══════════════════════════════════════════════════════ */
const STATUT_FACTURE = {
  brouillon:  {label:"Brouillon",        color:"#6B7280", bg:"#F3F4F6", icon:"✏️"},
  validee:    {label:"Bon validé",       color:"#1E40AF", bg:"#DBEAFE", icon:"✅"},
  emise:      {label:"Émise",            color:"#065F46", bg:"#D1FAE5", icon:"📤"},
  transmise:  {label:"Transmise plateforme",color:"#7C3AED",bg:"#EDE9FE",icon:"🔗"},
  payee:      {label:"Payée",            color:"#064E3B", bg:"#CCFBF1", icon:"💶"},
  litige:     {label:"Litige",           color:"#991B1B", bg:"#FEE2E2", icon:"⚠️"},
  doublon:    {label:"Doublon détecté",  color:"#B45309", bg:"#FEF3C7", icon:"🔄"},
};

const DEMO_FACTURES = [
  {
    id:"FAC-2026-0041", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-01", dateEcheance:"2026-07-31",
    statut:"payee",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",     qte:145, unite:"t", pu:52.00, total:7540},
      {libelle:"Broyage sur site",          cat:"prestation",  qte:145, unite:"t", pu: 8.50, total:1232.50},
      {libelle:"Transport chaufferie",      cat:"transport",   qte:145, unite:"t", pu: 6.20, total:899},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0052", lot:"LOT-2026-044", livraison:"LIV-2026-0241",
    fournisseur:"ETA Moreau Sylviculture", client:"Réseau de chaleur Vichy Sud",
    dateEmission:"2026-07-08", dateEcheance:"2026-08-07",
    statut:"transmise",
    lignes:[
      {libelle:"Bois énergie — qualité P45", cat:"matiere",    qte:89,  unite:"t", pu:48.00, total:4272},
      {libelle:"Transport",                  cat:"transport",  qte:89,  unite:"t", pu: 7.10, total:631.90},
    ],
    tonnageLivre:91, tonnageReceptionne:89, ecartTonnage:2,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0055", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-03", dateEcheance:"2026-08-02",
    statut:"doublon",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",    qte:145, unite:"t", pu:52.00, total:7540},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:true, archiveJustif:false,
    doublonDe:"FAC-2026-0041",
  },
  {
    id:"FAC-2026-0063", lot:"LOT-2026-049", livraison:null,
    fournisseur:"Groupement Forestier Allier Est", client:"Chaufferie Saint-Pourçain",
    dateEmission:null, dateEcheance:"2026-08-15",
    statut:"validee",
    lignes:[
      {libelle:"Plaquettes bord de route",  cat:"matiere",    qte:68,  unite:"t", pu:45.00, total:3060},
      {libelle:"Préparation du lot",        cat:"prestation", qte:68,  unite:"t", pu: 4.00, total:272},
      {libelle:"Transport",                 cat:"transport",  qte:68,  unite:"t", pu: 6.80, total:462.40},
    ],
    tonnageLivre:68, tonnageReceptionne:null, ecartTonnage:null,
    doublonDetecte:false, archiveJustif:false,
  },
];

export const SectionFacturationElec = () => {
  const [tab,     setTab]     = useState("suivi");
  const [selFac,  setSelFac]  = useState(null);

  const totalHT   = DEMO_FACTURES.filter(f=>f.statut!=="doublon")
                      .reduce((s,f)=>s+f.lignes.reduce((a,l)=>a+l.total,0),0);
  const nbDoublon = DEMO_FACTURES.filter(f=>f.doublonDetecte).length;
  const nbEcart   = DEMO_FACTURES.filter(f=>f.ecartTonnage&&f.ecartTonnage>0).length;

  const CAT_COLORS = {matiere:"#1E5B3A", prestation:"#1E40AF", transport:"#B45309"};
  const CAT_BG     = {matiere:"#D1FAE5", prestation:"#DBEAFE", transport:"#FEF3C7"};

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête + deadline */}
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🧾 Facturation électronique
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Lot livré → Bon validé → Quantité définitive → Ventilation → Plateforme agréée → Paiement suivi
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
          {[
            ["1er sept. 2026","Réception obligatoire — toutes entreprises","#1E40AF","#DBEAFE"],
            ["1er sept. 2027","Émission obligatoire — TPE/PME",            "#7C3AED","#EDE9FE"],
          ].map(([d,l,col,bg])=>(
            <div key={d} style={{display:"flex",alignItems:"center",gap:8,
              background:bg,border:`1px solid ${col}44`,borderRadius:10,padding:"5px 12px"}}>
              <span style={{fontSize:11,fontWeight:900,color:col}}>{d}</span>
              <span style={{fontSize:10,color:col}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bannière positionnement */}
      <div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12,
        padding:"12px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:20,flexShrink:0}}>🎯</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:3}}>
            APPLITAG — couche métier en amont de la plateforme agréée
          </div>
          <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
            APPLITAG prépare et structure les données facturables. La transmission légale est effectuée
            par la plateforme de dématérialisation partenaire (PDP) choisie par l'entreprise.
            <strong> APPLITAG n'est pas une plateforme agréée.</strong>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {icon:"🧾",label:"Factures",      val:DEMO_FACTURES.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {icon:"💶",label:"Total HT",       val:`${(totalHT/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {icon:"🔄",label:"Doublons",       val:nbDoublon, col:nbDoublon>0?"#991B1B":"#065F46",
           bg:nbDoublon>0?"#FEE2E2":"#D1FAE5"},
          {icon:"⚖️",label:"Écarts tonnage", val:nbEcart,   col:nbEcart>0?"#B45309":"#065F46",
           bg:nbEcart>0?"#FEF3C7":"#D1FAE5"},
          {icon:"📤",label:"Transmises PDP", val:DEMO_FACTURES.filter(f=>f.statut==="transmise"||f.statut==="payee").length,
           col:"#7C3AED",bg:"#EDE9FE"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          ["suivi",    "📋","Suivi des factures"],
          ["workflow", "🔄","Workflow lot → facture"],
          ["export",   "📤","Export structuré"],
          ["conformite","⚖️","Conformité & risques"],
        ].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── SUIVI DES FACTURES ── */}
      {tab==="suivi"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_FACTURES.map(f=>{
            const st  = STATUT_FACTURE[f.statut]||STATUT_FACTURE.brouillon;
            const ttl = f.lignes.reduce((s,l)=>s+l.total,0);
            const isOpen = selFac===f.id;
            return (
              <div key={f.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${f.doublonDetecte?"#F59E0B":f.ecartTonnage>0?"#FCA5A5":st.color+"44"}`,
                boxShadow:f.doublonDetecte?"0 0 0 2px #FEF3C7":undefined}}>
                {/* Header */}
                <div onClick={()=>setSelFac(isOpen?null:f.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"60":"#fff",
                    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:900,color:C.tx,fontFamily:"monospace"}}>
                        {f.id}
                      </span>
                      <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                      {f.doublonDetecte&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEF3C7",color:"#B45309"}}>
                          🔄 Doublon de {f.doublonDe}
                        </span>
                      )}
                      {f.ecartTonnage>0&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEE2E2",color:"#991B1B"}}>
                          ⚖️ Écart {f.ecartTonnage} t
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:C.tx3}}>
                      {f.fournisseur} → {f.client}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                      {f.lot} · {f.livraison||"Livraison à rattacher"} ·{" "}
                      {f.dateEmission
                        ? `Émission ${new Date(f.dateEmission).toLocaleDateString("fr-FR")}`
                        : "Non émise"}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:st.color}}>
                      {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>HT</div>
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>

                {/* Détail */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA"}}>
                    {/* Lignes de facture */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                        Lignes de facturation — ventilation matière / prestation / transport
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:C.bg2}}>
                            {["Libellé","Catégorie","Qté","Unité","PU HT","Total HT"].map(h=>(
                              <th key={h} style={{padding:"7px 10px",textAlign:"left",
                                fontSize:10,fontWeight:800,color:C.tx2,
                                borderBottom:`1px solid ${C.bd}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {f.lignes.map((l,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid ${C.bd}`}}>
                              <td style={{padding:"8px 10px",color:C.tx,fontWeight:600}}>{l.libelle}</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,
                                  fontWeight:700,background:CAT_BG[l.cat],
                                  color:CAT_COLORS[l.cat]}}>
                                  {l.cat}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px",color:C.tx}}>{l.qte}</td>
                              <td style={{padding:"8px 10px",color:C.tx3}}>{l.unite}</td>
                              <td style={{padding:"8px 10px",color:C.tx}}>
                                {l.pu.toFixed(2)} €
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:700,color:C.tx}}>
                                {l.total.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                              </td>
                            </tr>
                          ))}
                          <tr style={{background:C.bg2,borderTop:`2px solid ${C.bd}`}}>
                            <td colSpan={5} style={{padding:"8px 10px",fontWeight:800,
                              color:C.tx,textAlign:"right"}}>Total HT</td>
                            <td style={{padding:"8px 10px",fontWeight:900,fontSize:14,
                              color:"#1E40AF"}}>
                              {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Rapprochement lot-livraison */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      {[
                        ["🌲 Lot source",     f.lot,           "#1E5B3A"],
                        ["📦 Livraison",       f.livraison||"Non rattachée","#1E40AF"],
                        ["📄 Justificatifs",   f.archiveJustif?"Archivés ✓":"À compléter ⏳",
                         f.archiveJustif?"#065F46":"#B45309"],
                      ].map(([lbl,val,col])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${col}33`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:11,fontWeight:700,color:col}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Écart tonnage */}
                    {f.tonnageReceptionne!==null&&(
                      <div style={{padding:"8px 12px",borderRadius:8,marginBottom:10,
                        background:f.ecartTonnage>0?"#FEF2F2":"#F0FDF4",
                        border:`1px solid ${f.ecartTonnage>0?"#FECACA":"#86EFAC"}`}}>
                        <div style={{fontSize:11,fontWeight:700,
                          color:f.ecartTonnage>0?"#991B1B":"#065F46"}}>
                          {f.ecartTonnage>0
                            ? `⚠️ Écart tonnage : facturé ${f.tonnageLivre} t / réceptionné ${f.tonnageReceptionne} t (−${f.ecartTonnage} t)`
                            : `✅ Tonnage cohérent : ${f.tonnageLivre} t facturé = ${f.tonnageReceptionne} t réceptionné`}
                        </div>
                      </div>
                    )}

                    {/* Alerte doublon */}
                    {f.doublonDetecte&&(
                      <div style={{padding:"10px 12px",borderRadius:8,
                        background:"#FEF3C7",border:"1px solid #FCD34D"}}>
                        <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
                          🔄 Doublon détecté — action requise
                        </div>
                        <div style={{fontSize:11,color:"#78350F",lineHeight:1.6}}>
                          Cette facture concerne le même lot et la même livraison que <strong>{f.doublonDe}</strong>,
                          déjà payée. Vérifier avant toute transmission à la plateforme agréée.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:14}}>
              Chaîne de valeur APPLITAG → Plateforme agréée
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {n:1,ico:"🌲",titre:"Lot livré",          desc:"Visite terrain validée, tonnage pesé à la réception, humidité contrôlée",                  col:"#1E5B3A",bg:"#D1FAE5"},
                {n:2,ico:"✅",titre:"Bon de livraison validé",desc:"Signature numérique réception — quantité définitive arrêtée",                         col:"#065F46",bg:"#D1FAE5"},
                {n:3,ico:"⚖️",titre:"Quantité définitive",  desc:"Tonnage réceptionné = base facturable. Tout écart entre livré et réceptionné est signalé",col:"#1E40AF",bg:"#DBEAFE"},
                {n:4,ico:"📊",titre:"Ventilation des lignes",desc:"Matière / Broyage / Transport ventilés séparément avec codes produit et quantités",      col:"#7C3AED",bg:"#EDE9FE"},
                {n:5,ico:"🧾",titre:"Données préparées",    desc:"Identifiant unique, références croisées lot-livraison-facture, contrôle doublon",        col:"#B45309",bg:"#FEF3C7"},
                {n:6,ico:"🔗",titre:"→ Plateforme agréée (PDP)",desc:"Export structuré (UBL/Factur-X) transmis à la PDP choisie par l'entreprise. APPLITAG n'est pas la PDP.",col:"#6B7280",bg:"#F3F4F6"},
                {n:7,ico:"💶",titre:"Paiement suivi",        desc:"Statut de paiement rapatrié depuis la PDP ou saisi manuellement — historique conservé",  col:"#064E3B",bg:"#CCFBF1"},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"10px 12px",borderRadius:10,background:s.bg,
                  border:`1px solid ${s.col}33`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:s.col,
                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:900,fontSize:12,flexShrink:0}}>{s.n}</div>
                  <span style={{fontSize:18,flexShrink:0,marginTop:2}}>{s.ico}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:s.col}}>{s.titre}</div>
                    <div style={{fontSize:11,color:C.tx2,marginTop:2,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identifiant unique */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🔑 Identifiant unique de facture — structure APPLITAG
            </div>
            <div style={{fontFamily:"monospace",fontSize:13,color:"#1E3A8A",
              background:"#fff",borderRadius:8,padding:"10px 14px",
              border:"1px solid #BFDBFE",letterSpacing:".5px"}}>
              FAC-<span style={{color:"#7C3AED"}}>2026</span>-<span style={{color:"#065F46"}}>XXXX</span>
            </div>
            <div style={{fontSize:11,color:"#1E3A8A",marginTop:8,lineHeight:1.6}}>
              Préfixe <strong>FAC</strong> · Année · Séquence numérique.
              Chaque facture référence son lot source et sa livraison — rapprochement automatique,
              détection de doublon par triplet (lot × livraison × fournisseur).
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT STRUCTURÉ ── */}
      {tab==="export"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
              📋 Action recommandée — Export structuré d'abord, intégration API ensuite
            </div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.7}}>
              Le consortium recommande de privilégier un export structuré et un suivi des statuts
              avant de développer un connecteur API. La plateforme comptable choisie par l'entreprise
              n'est pas encore connue dans tous les cas.
            </div>
          </div>

          {/* Formats disponibles */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Formats d'export disponibles (feuille de route)
            </div>
            {[
              {fmt:"CSV structuré",       ico:"📊",stat:"disponible","desc":"Export immédiat des lignes de facture avec ventilation matière/prestation/transport",col:"#065F46",bg:"#D1FAE5"},
              {fmt:"PDF récapitulatif",   ico:"📄",stat:"disponible","desc":"Bon de livraison + lignes facturables + totaux HT — prêt à transmettre",           col:"#1E40AF",bg:"#DBEAFE"},
              {fmt:"Factur-X (PDF/A-3)", ico:"🔗",stat:"roadmap",   "desc":"Format hybride PDF + XML structuré — standard FR pour la facturation électronique", col:"#7C3AED",bg:"#EDE9FE"},
              {fmt:"UBL 2.1",             ico:"🌐",stat:"roadmap",   "desc":"Standard européen XML — requis par certaines PDP",                                  col:"#B45309",bg:"#FEF3C7"},
              {fmt:"Connecteur API PDP",  ico:"⚡",stat:"à définir", "desc":"Dépend de la PDP choisie par l'entreprise — développement après choix comptable",   col:"#6B7280",bg:"#F3F4F6"},
            ].map(f=>(
              <div key={f.fmt} style={{display:"flex",gap:12,alignItems:"center",
                padding:"10px 12px",borderRadius:10,background:f.bg,
                border:`1px solid ${f.col}33`,marginBottom:6}}>
                <span style={{fontSize:20,flexShrink:0}}>{f.ico}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:f.col}}>{f.fmt}</span>
                    <span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,
                      background:f.stat==="disponible"?"#065F46":f.stat==="roadmap"?"#7C3AED":"#6B7280",
                      color:"#fff"}}>{f.stat}</span>
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Archivage */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🗄️ Archivage des justificatifs — obligations légales
            </div>
            {[
              ["10 ans","Durée minimale d'archivage des factures électroniques"],
              ["Preuve d'intégrité","Signature ou empreinte numérique à conserver"],
              ["Piste d'audit fiable","Lien traçable lot → livraison → facture → paiement"],
            ].map(([v,l])=>(
              <div key={v} style={{display:"flex",gap:10,alignItems:"center",
                padding:"6px 0",borderBottom:`1px solid #BFDBFE`}}>
                <span style={{fontSize:11,fontWeight:900,color:"#1E40AF",minWidth:120,flexShrink:0}}>{v}</span>
                <span style={{fontSize:11,color:"#1E3A8A"}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFORMITÉ & RISQUES ── */}
      {tab==="conformite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Calendrier */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              📅 Calendrier d'application
            </div>
            {[
              {date:"1er septembre 2026",scope:"Toutes entreprises",
               oblig:"Réception des factures électroniques",col:"#1E40AF",bg:"#DBEAFE",urgent:true},
              {date:"1er septembre 2027",scope:"TPE / PME",
               oblig:"Émission des factures électroniques",col:"#7C3AED",bg:"#EDE9FE",urgent:false},
            ].map(e=>(
              <div key={e.date} style={{display:"flex",gap:12,alignItems:"flex-start",
                padding:"12px",borderRadius:10,background:e.bg,
                border:`1.5px solid ${e.col}44`,marginBottom:8}}>
                <div style={{background:e.col,borderRadius:8,padding:"6px 12px",
                  textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:900,color:"#fff",whiteSpace:"nowrap"}}>{e.date}</div>
                  {e.urgent&&<div style={{fontSize:9,color:"#fff",opacity:.8,marginTop:1}}>J−41</div>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:e.col,marginBottom:2}}>{e.oblig}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{e.scope}</div>
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.tx3,lineHeight:1.6,marginTop:4}}>
              Les entreprises doivent passer par une <strong>plateforme de dématérialisation partenaire (PDP)</strong> agréée
              pour transmettre ou recevoir leurs factures et les données réglementaires.
            </div>
          </div>

          {/* Risques */}
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>
              ⚠️ Risques à éviter
            </div>
            {[
              ["Développer un connecteur sans connaître la PDP",
               "Chaque PDP a son API propriétaire. Attendre le choix comptable avant tout développement de connecteur."],
              ["Créer un doublon avec le logiciel de comptabilité",
               "APPLITAG prépare les données — il ne remplace pas le logiciel de comptabilité. Définir clairement la frontière."],
              ["Facturer un tonnage différent du tonnage réceptionné",
               "Le tonnage facturé doit être celui réceptionné signé. APPLITAG détecte automatiquement les écarts."],
              ["Présenter APPLITAG comme une plateforme agréée",
               "APPLITAG est la couche métier amont. La PDP est un opérateur agréé par l'administration — rôles distincts."],
            ].map(([t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"9px 0",
                borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                  <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fonctions prioritaires */}
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>
              ✅ Fonctions prioritaires APPLITAG
            </div>
            {[
              ["🔑","Identifiant unique de facture",          "Généré automatiquement — FAC-AAAA-XXXX"],
              ["🔗","Rapprochement lot-livraison-facture",    "Triplet unique — détection croisée"],
              ["🔄","Détection des doublons",                 "Même lot × livraison × fournisseur → alerte"],
              ["📊","Suivi des statuts",                      "Brouillon → Validé → Émis → Transmis PDP → Payé"],
              ["📋","Ventilation matière / prestation / transport","3 catégories distinctes par ligne"],
              ["🗄️","Archivage des justificatifs",            "Lien piste d'audit — 10 ans minimum"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid #A7F3D0`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>{lbl}</div>
                  <div style={{fontSize:10,color:"#047857",marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SectionChaufferies = () => {
  const [selected,  setSelected]  = useState(null);
  const [filtRegion,setFiltRegion] = useState("Toutes");

  const ch = selected ? CHAUFFERIES_DATA.find(c=>c.id===selected) : null;

  const stockMoyPct = d => Math.round(d.stockActuelT/d.stockCapaT*100);
  const autonomieJ  = d => Math.round(d.stockActuelT/(d.consoAnnT/365));

  const REGIONS = ["Toutes", ...Array.from(new Set(CHAUFFERIES_DATA.map(d=>d.region))).sort()];
  const filtered = filtRegion==="Toutes" ? CHAUFFERIES_DATA : CHAUFFERIES_DATA.filter(d=>d.region===filtRegion);

  // Icônes par région
  const regionIco = r => ({
    "Auvergne-Rhône-Alpes":"⛰️","Bourgogne-Franche-Comté":"🍇","Grand Est":"🥨",
    "Occitanie":"☀️","Bretagne":"⚓","Normandie":"🌊","Nouvelle-Aquitaine":"🌲",
    "Pays de la Loire":"🏰","Hauts-de-France":"🌾","Île-de-France":"🗼",
    "Provence-Alpes-Côte d'Azur":"🌻","Corse":"🏔️",
    "Guadeloupe":"🌺","Martinique":"🌴","La Réunion":"🌋","Guyane":"🌿",
    "Mayotte":"🏝️","Saint-Pierre-et-Miquelon":"🧊",
    "Polynésie française":"🌺","Nouvelle-Calédonie":"🪸",
  }[r]||"📍");

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🔥 Chaufferies</div>
        <div style={{fontSize:13,color:C.tx2}}>Suivi des stocks, livraisons et consommations — France métropolitaine, Corse & Outre-mer</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🔥",label:"Chaufferies actives",val:CHAUFFERIES_DATA.length,col:"#B45309",bg:"#FEF3C7"},
          {ico:"📦",label:"Stock moyen",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+stockMoyPct(d),0)/CHAUFFERIES_DATA.length)+"%",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚡",label:"Énergie en stock",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+d.stockActuelT*pciKWhT(d.humiMax)/1000,0))+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",label:"Livraisons totales",val:CHAUFFERIES_DATA.reduce((s,d)=>s+d.livraisons,0),col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚠️",label:"En alerte stock",val:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length,col:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#991B1B":"#059669",bg:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre région */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",
        scrollbarWidth:"none",paddingBottom:4}}>
        {REGIONS.map(r=>(
          <button key={r} onClick={()=>{setFiltRegion(r);setSelected(null);}} style={{
            flex:"0 0 auto",padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
            border:`1.5px solid ${filtRegion===r?"#B45309":C.bd}`,
            background:filtRegion===r?"#FEF3C7":"transparent",
            color:filtRegion===r?"#B45309":C.tx2,
            WebkitTapHighlightColor:"transparent"}}>
            {r==="Toutes"?"🗺️ Toutes régions":`${regionIco(r)} ${r}`}
          </button>
        ))}
      </div>

      <div style={{marginBottom:8,fontSize:11,color:C.tx3}}>
        {filtered.length} chaufferie{filtered.length>1?"s":""}{filtRegion!=="Toutes"?` en ${filtRegion}`:" — France entière"}
        {" · "}{filtered.filter(d=>d.alertes>0).length>0&&(
          <span style={{color:"#991B1B",fontWeight:700}}>
            ⚠️ {filtered.filter(d=>d.alertes>0).length} en alerte
          </span>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:ch?"1fr 360px":"repeat(2,1fr)",gap:12,alignItems:"start"}}>
        {filtered.map(d=>{
          const pct = stockMoyPct(d);
          const auto = autonomieJ(d);
          const isSelected = selected===d.id;
          const stockCol = pct>=40?"#059669":pct>=20?"#D97706":"#DC2626";
          const stockBg  = pct>=40?"#D1FAE5":pct>=20?"#FEF3C7":"#FEE2E2";
          return (
            <div key={d.id} onClick={()=>setSelected(isSelected?null:d.id)}
              style={{background:"#fff",borderRadius:12,padding:"14px 16px",cursor:"pointer",
                border:`2px solid ${isSelected?"#B45309":d.alertes>0?"#FCA5A5":C.bd}`}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                <div style={{fontSize:24}}>🔥</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{d.nom}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{d.commune} · {d.puissanceMW} MW</div>
                </div>
                {d.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                  borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ alerte</span>}
              </div>

              {/* Jauge stock */}
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                  <span style={{color:C.tx3}}>Stock actuel</span>
                  <span style={{fontWeight:700,color:stockCol}}>{d.stockActuelT} / {d.stockCapaT} t · {pct}%</span>
                </div>
                <div style={{height:10,borderRadius:5,background:"#F3F4F6",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:stockCol,borderRadius:5}}/>
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:3}}>Autonomie estimée : {auto} jours</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,color:C.tx2}}>
                <div style={{background:stockBg,borderRadius:6,padding:"5px 8px"}}>
                  📅 Prochaine livraison :<br/>
                  <span style={{fontWeight:700,color:stockCol}}>{new Date(d.prochaineLivraison).toLocaleDateString("fr-FR")} · {d.volumePrevu} t</span>
                </div>
                <div style={{background:"#F9FAFB",borderRadius:6,padding:"5px 8px"}}>
                  ✅ Conformité :<br/>
                  <span style={{fontWeight:700,color:"#059669"}}>{d.livraisons>0?Math.round(d.livraisonsConformes/d.livraisons*100):0}% ({d.livraisonsConformes}/{d.livraisons})</span>
                </div>
                <div style={{background:"#EDE9FE",borderRadius:6,padding:"5px 8px"}}>
                  ⚡ Stock énergie :<br/>
                  <span style={{fontWeight:700,color:"#7C3AED"}}>{Math.round(d.stockActuelT*pciKWhT(d.humiMax)/1000)} MWh</span>
                </div>
              </div>
            </div>
          );
        })}

        {ch&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #B45309",
            padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{ch.nom}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {ch.alertes>0&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"7px 10px",
                marginBottom:10,fontSize:11,color:"#991B1B",border:"1px solid #FECACA"}}>
                ⚠️ Stock bas — livraison urgente à planifier
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Commune",ch.commune],
                ["Puissance",ch.puissanceMW+" MW"],
                ["Consommation annuelle",ch.consoAnnT.toLocaleString("fr-FR")+" t/an · "+Math.round(ch.consoAnnT*pciKWhT(ch.humiMax)/1000).toLocaleString("fr-FR")+" MWh/an"],
                ["Capacité de stockage",ch.stockCapaT+" t"],
                ["Stock actuel",ch.stockActuelT+" t ("+stockMoyPct(ch)+"%)"],
                ["Énergie en stock",Math.round(ch.stockActuelT*pciKWhT(ch.humiMax)/1000)+" MWh (PCI ITEBE 2004, H="+ch.humiMax+"%)"],
                ["Autonomie estimée",autonomieJ(ch)+" jours"],
                ["Humidité max acceptée",ch.humiMax+"%"],
                ["Granulométrie acceptée",ch.granuAccepte],
                ["Contact",ch.contact],
                ["Accès",ch.acces],
                ["Horaires réception",ch.horairesReception],
                ["Prochaine livraison",new Date(ch.prochaineLivraison).toLocaleDateString("fr-FR")+" · "+ch.volumePrevu+" t"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#B45309",border:"none",color:"#fff"}}>
                🚛 Planifier livraison
              </button>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"transparent",
                border:`1px solid ${C.bd}`,color:C.tx2}}>
                📊 Historique
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

