// ============================================================
// APPLITAG — Offline Sync Phase 1 + Phase 2
// File d'attente persistée · Idempotence · Gestion conflits
// JSDoc TypeScript-style · Tests core intégrés
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'create_contact'|'create_opportunite'|'create_lot'|'add_tas'|
 *           'create_transport'|'validate_livraison'|'add_historique'|
 *           'update_lot_statut'|'update_opp_statut'} ActionType
 * @typedef {'pending'|'syncing'|'done'|'error'|'conflict'|'duplicate'} SyncStatus
 * @typedef {'online'|'offline'|'syncing'|'error'} NetworkStatus
 */

/**
 * @typedef {Object} PendingAction
 * @property {string} id                  - UUID local
 * @property {string} clientRequestId     - Idempotence key (stable même si retry)
 * @property {ActionType} type
 * @property {Record<string,any>} payload
 * @property {SyncStatus} status
 * @property {number} attempts
 * @property {string} [errorMessage]
 * @property {string} [conflictReason]
 * @property {string} createdAt
 * @property {string} [syncedAt]
 * @property {string} refLabel            - Label lisible (ex: "Lot LOT-2025-010")
 */

/**
 * @typedef {Object} SyncLog
 * @property {string} id
 * @property {string} actionId
 * @property {string} message
 * @property {'success'|'error'|'conflict'|'duplicate'} level
 * @property {string} at
 */

/**
 * @typedef {Object} NetworkState
 * @property {NetworkStatus} status
 * @property {boolean} isOnline
 * @property {number} pendingCount
 * @property {number} errorCount
 * @property {string} [lastSyncAt]
 */

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── CORE: SYNC ENGINE ──────────────────────────────────────────────────────────

const STORAGE_KEY = "applitag_pending_sync_v1";
const LOG_KEY     = "applitag_sync_log_v1";

/** Generate stable idempotence key from type + payload hash */
const makeRequestId = (type, payload) => {
  const str = type + JSON.stringify(payload);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return `${type}_${Math.abs(h).toString(36)}`;
};

const uid = () => crypto.randomUUID
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowISO = () => new Date().toISOString();
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

/**
 * Load queue from localStorage
 * @returns {PendingAction[]}
 */
const loadQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

/**
 * Persist queue to localStorage
 * @param {PendingAction[]} queue
 */
const saveQueue = (queue) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch {}
};

/**
 * Load sync log from localStorage
 * @returns {SyncLog[]}
 */
const loadLog = () => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLog = (log) => {
  try {
    // Keep last 100 entries
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-100)));
  } catch {}
};

// ── SIMULATED API ──────────────────────────────────────────────────────────────

// Track "server-side" applied clientRequestIds to detect duplicates
const SERVER_APPLIED = new Set();

/**
 * Simulate sending one action to the API.
 * In production: fetch('/api/sync', { method:'POST', body: JSON.stringify(action) })
 * @param {PendingAction} action
 * @param {boolean} simulateOffline
 * @returns {Promise<{ok:boolean, duplicate?:boolean, conflict?:string}>}
 */
const sendToAPI = async (action, simulateOffline = false) => {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

  if (simulateOffline) throw new Error("Network unavailable");

  // Duplicate detection
  if (SERVER_APPLIED.has(action.clientRequestId)) {
    return { ok: true, duplicate: true };
  }

  // Simulate conflict: if trying to validate_livraison on a "lot clôturé"
  if (action.type === "validate_livraison" && action.payload?.lotStatut === "CLOTURE") {
    return { ok: false, conflict: "Livraison impossible — lot déjà clôturé côté serveur" };
  }

  // Simulate random transient error (10%)
  if (Math.random() < 0.10) throw new Error("Server 503 — réessayer ultérieurement");

  SERVER_APPLIED.add(action.clientRequestId);
  return { ok: true };
};

// ── SYNC ENGINE CLASS (functional) ────────────────────────────────────────────

/**
 * @param {PendingAction[]} queue
 * @param {(q:PendingAction[])=>void} setQueue
 * @param {SyncLog[]} log
 * @param {(l:SyncLog[])=>void} setLog
 * @param {boolean} simOffline
 * @param {(s:NetworkStatus)=>void} setNetStatus
 * @returns {Promise<void>}
 */
const runSync = async (queue, setQueue, log, setLog, simOffline, setNetStatus) => {
  const pending = queue.filter(a => a.status === "pending" || a.status === "error");
  if (pending.length === 0) {
    setNetStatus("online");
    return;
  }

  setNetStatus("syncing");
  let updatedQueue = [...queue];
  const newLogEntries = [];

  for (const action of pending) {
    // Mark as syncing
    updatedQueue = updatedQueue.map(a =>
      a.id === action.id ? { ...a, status: "syncing" } : a
    );
    setQueue([...updatedQueue]);
    saveQueue(updatedQueue);

    try {
      const res = await sendToAPI(action, simOffline);

      if (res.duplicate) {
        updatedQueue = updatedQueue.map(a =>
          a.id === action.id
            ? { ...a, status: "duplicate", syncedAt: nowISO() }
            : a
        );
        newLogEntries.push({
          id: uid(), actionId: action.id, level: "duplicate",
          message: `[DOUBLON] ${action.refLabel} — déjà appliqué (clientRequestId connu)`,
          at: nowISO(),
        });
      } else if (!res.ok && res.conflict) {
        updatedQueue = updatedQueue.map(a =>
          a.id === action.id
            ? { ...a, status: "conflict", conflictReason: res.conflict, attempts: a.attempts + 1 }
            : a
        );
        newLogEntries.push({
          id: uid(), actionId: action.id, level: "conflict",
          message: `[CONFLIT] ${action.refLabel} — ${res.conflict}`,
          at: nowISO(),
        });
      } else {
        updatedQueue = updatedQueue.map(a =>
          a.id === action.id
            ? { ...a, status: "done", syncedAt: nowISO() }
            : a
        );
        newLogEntries.push({
          id: uid(), actionId: action.id, level: "success",
          message: `[OK] ${action.refLabel} envoyé`,
          at: nowISO(),
        });
      }
    } catch (err) {
      updatedQueue = updatedQueue.map(a =>
        a.id === action.id
          ? { ...a, status: "error", errorMessage: err.message, attempts: a.attempts + 1 }
          : a
      );
      newLogEntries.push({
        id: uid(), actionId: action.id, level: "error",
        message: `[ERREUR] ${action.refLabel} — ${err.message}`,
        at: nowISO(),
      });
    }

    setQueue([...updatedQueue]);
    saveQueue(updatedQueue);
  }

  const updatedLog = [...log, ...newLogEntries];
  setLog(updatedLog);
  saveLog(updatedLog);

  const stillPending = updatedQueue.filter(a => a.status === "pending" || a.status === "error" || a.status === "syncing");
  setNetStatus(simOffline ? "offline" : stillPending.length > 0 ? "error" : "online");
};

// ── UNIT TESTS ─────────────────────────────────────────────────────────────────

const UNIT_TESTS = [
  {
    name: "makeRequestId — même payload = même id",
    fn: () => {
      const id1 = makeRequestId("create_contact", {nom:"Dupont",tel:"0611223344"});
      const id2 = makeRequestId("create_contact", {nom:"Dupont",tel:"0611223344"});
      return id1 === id2;
    },
  },
  {
    name: "makeRequestId — payloads différents = ids différents",
    fn: () => {
      const id1 = makeRequestId("create_lot", {commune:"Charny"});
      const id2 = makeRequestId("create_lot", {commune:"Sens"});
      return id1 !== id2;
    },
  },
  {
    name: "Queue: une action pending a attempts=0",
    fn: () => {
      const q = buildPendingAction("create_contact", {nom:"Test"}, "Contact Test");
      return q.attempts === 0 && q.status === "pending";
    },
  },
  {
    name: "Queue: clientRequestId est stable au retry",
    fn: () => {
      const a = buildPendingAction("add_tas", {lotId:"l1"}, "Tas A");
      const retry = { ...a, attempts: a.attempts + 1 };
      return retry.clientRequestId === a.clientRequestId;
    },
  },
  {
    name: "Duplicate: SERVER_APPLIED bloque la 2e tentative",
    fn: () => {
      const reqId = "test_dup_" + uid();
      SERVER_APPLIED.add(reqId);
      return SERVER_APPLIED.has(reqId);
    },
  },
  {
    name: "Conflit: action validate_livraison sur lot CLOTURE → conflit",
    fn: async () => {
      const res = await sendToAPI(
        buildPendingAction("validate_livraison", {lotStatut:"CLOTURE"}, "BL test"),
        false
      );
      return !res.ok && typeof res.conflict === "string";
    },
  },
  {
    name: "loadQueue / saveQueue: round-trip localStorage",
    fn: () => {
      const testKey = "applitag_test_rt";
      const data = [buildPendingAction("add_historique", {msg:"test"}, "Histoire test")];
      try {
        localStorage.setItem(testKey, JSON.stringify(data));
        const back = JSON.parse(localStorage.getItem(testKey));
        localStorage.removeItem(testKey);
        return back.length === 1 && back[0].type === "add_historique";
      } catch { return false; }
    },
  },
  {
    name: "Idempotence: action done ne rejoue pas",
    fn: () => {
      const q = [
        { ...buildPendingAction("create_lot", {}, "Lot test"), status: "done" },
        buildPendingAction("add_tas", {}, "Tas test"),
      ];
      const pending = q.filter(a => a.status === "pending" || a.status === "error");
      return pending.length === 1;
    },
  },
];

/** @param {ActionType} type @param {Record<string,any>} payload @param {string} refLabel */
const buildPendingAction = (type, payload, refLabel = "") => ({
  id: uid(),
  clientRequestId: makeRequestId(type, payload),
  type, payload, refLabel,
  status: "pending",
  attempts: 0,
  createdAt: nowISO(),
});

// Run tests
const runTests = async () => {
  const results = [];
  for (const t of UNIT_TESTS) {
    try {
      const r = await Promise.resolve(t.fn());
      results.push({ name: t.name, pass: r === true });
    } catch (e) {
      results.push({ name: t.name, pass: false, err: e.message });
    }
  }
  const passed = results.filter(r => r.pass).length;
  console.log(`[APPLITAG Sync Tests] ${passed}/${UNIT_TESTS.length} passed`);
  results.forEach(r => console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}`));
  return results;
};

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({ bg, color, children, style = {} }) => (
  <span style={{
    display:"inline-block", padding:"2px 8px", borderRadius:9,
    fontSize:10, fontWeight:600, background:bg, color, whiteSpace:"nowrap", ...style,
  }}>{children}</span>
);

const Btn = ({ onClick, bg=T.bg2, color=T.tx, children, disabled, small, style={} }) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:small?"5px 10px":"8px 14px", borderRadius:8,
    fontSize:small?11:12, fontWeight:500, display:"inline-flex", alignItems:"center", gap:6,
    cursor:disabled?"not-allowed":"pointer", border:"none", fontFamily:"inherit",
    background:disabled?T.bg2:bg, color:disabled?T.tx3:color,
    opacity:disabled?0.6:1, transition:"all .1s", whiteSpace:"nowrap", ...style,
  }}>{children}</button>
);

const PBtn = ({ onClick, children, disabled, style={} }) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const Card = ({ children, style={} }) => (
  <div style={{
    background:"#fff", border:`1px solid ${T.bd}`, borderRadius:12, ...style,
  }}>{children}</div>
);

const SCard = ({ title, extra, children, accent }) => (
  <Card style={{overflow:"hidden", outline:accent?`2px solid ${accent}`:"none", outlineOffset:2}}>
    <div style={{
      padding:"9px 13px", borderBottom:`1px solid ${T.bd}`,
      background:T.bg, display:"flex", alignItems:"center", justifyContent:"space-between",
    }}>
      <div style={{fontSize:11,fontWeight:600,color:T.tx2,textTransform:"uppercase",letterSpacing:".05em"}}>
        {title}
      </div>
      {extra}
    </div>
    <div style={{padding:"10px 13px"}}>{children}</div>
  </Card>
);

// Confirm modal
const ConfirmModal = ({ msg, onConfirm, onCancel }) => (
  <div style={{
    position:"fixed",inset:0,background:"rgba(0,0,0,.4)",
    display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,
  }}>
    <div style={{background:"#fff",borderRadius:14,padding:"22px 26px",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,.2)"}}>
      <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Confirmation</div>
      <div style={{fontSize:13,color:T.tx2,marginBottom:18,lineHeight:1.6}}>{msg}</div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
        <Btn onClick={onCancel}>Annuler</Btn>
        <Btn onClick={onConfirm} bg={T.red} color="#fff">Supprimer</Btn>
      </div>
    </div>
  </div>
);

// ── NETWORK INDICATOR ──────────────────────────────────────────────────────────
/** @param {{ status: NetworkStatus, pendingCount: number, errorCount: number, onSync: ()=>void }} props */
const NetworkIndicator = ({ status, pendingCount, errorCount, onSync }) => {
  const cfg = {
    online:   { color:T.green,  bg:T.greenL,  icon:"✓", label:"En ligne" },
    offline:  { color:T.red,    bg:T.redL,    icon:"✕", label:"Hors ligne" },
    syncing:  { color:T.blue,   bg:T.blueL,   icon:"⟳", label:"Synchronisation…" },
    error:    { color:T.amber,  bg:T.amberL,  icon:"⚠", label:"Erreurs sync" },
  }[status];

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8, padding:"6px 12px",
      borderRadius:10, background:cfg.bg, border:`1px solid ${cfg.color}20`,
    }}>
      <span style={{
        fontSize:14, color:cfg.color,
        animation:status==="syncing"?"spin 1s linear infinite":undefined,
      }}>{cfg.icon}</span>
      <span style={{fontSize:11,fontWeight:600,color:cfg.color}}>{cfg.label}</span>
      {pendingCount > 0 && (
        <span style={{
          background:cfg.color, color:"#fff", fontSize:9, fontWeight:700,
          padding:"1px 5px", borderRadius:7,
        }}>{pendingCount}</span>
      )}
      {errorCount > 0 && (
        <span style={{
          background:T.red, color:"#fff", fontSize:9, fontWeight:700,
          padding:"1px 5px", borderRadius:7,
        }}>{errorCount} err</span>
      )}
      {(pendingCount > 0 || status === "error") && status !== "syncing" && (
        <button onClick={onSync} style={{
          marginLeft:4, padding:"3px 9px", borderRadius:6, border:"none",
          background:cfg.color, color:"#fff", fontSize:10, fontWeight:600,
          cursor:"pointer", fontFamily:"inherit",
        }}>Sync</button>
      )}
    </div>
  );
};

// ── ACTION STATUS BADGE ─────────────────────────────────────────────────────────
const actionStatusBadge = (s) => ({
  pending:   {bg:T.amberL, color:T.amberD, label:"En attente"},
  syncing:   {bg:T.blueL,  color:T.blueD,  label:"Envoi…"},
  done:      {bg:T.greenL, color:T.greenD, label:"Sync ✓"},
  error:     {bg:T.redL,   color:T.red,    label:"Erreur"},
  conflict:  {bg:"#FCEBEB",color:"#7A1C1C",label:"Conflit"},
  duplicate: {bg:T.bg2,    color:T.tx3,    label:"Doublon"},
}[s] ?? {bg:T.bg2, color:T.tx2, label:s});

const actionTypeLabel = (t) => ({
  create_contact:      "Nouveau contact",
  create_opportunite:  "Nouvelle opportunité",
  create_lot:          "Nouveau lot",
  add_tas:             "Ajout tas",
  create_transport:    "Nouveau transport",
  validate_livraison:  "Validation livraison",
  add_historique:      "Événement historique",
  update_lot_statut:   "Changement statut lot",
  update_opp_statut:   "Changement statut opp.",
}[t] ?? t);

// ── SYNC SCREEN ────────────────────────────────────────────────────────────────
const SyncScreen = ({
  queue, log, netStatus, simOffline, testResults,
  onSync, onRetry, onDelete, onToggleOffline, onClearDone,
}) => {
  const [confirm, setConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState("queue");

  const pending   = queue.filter(a => a.status === "pending");
  const syncing   = queue.filter(a => a.status === "syncing");
  const errors    = queue.filter(a => a.status === "error");
  const conflicts = queue.filter(a => a.status === "conflict");
  const duplicates= queue.filter(a => a.status === "duplicate");
  const done      = queue.filter(a => a.status === "done");

  const tabs = [
    {id:"queue",  label:"File d'attente", count:pending.length+errors.length+conflicts.length},
    {id:"log",    label:"Journal",        count:log.length},
    {id:"tests",  label:"Tests",          count:testResults.filter(r=>r.pass).length+"/"+UNIT_TESTS.length},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {confirm && <ConfirmModal msg={confirm.msg}
        onConfirm={()=>{confirm.fn();setConfirm(null);}}
        onCancel={()=>setConfirm(null)}/>}

      {/* Header */}
      <div style={{padding:"14px 18px",background:"#fff",borderBottom:`1px solid ${T.bd}`,
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:600}}>Synchronisation</div>
          <div style={{fontSize:11,color:T.tx3}}>
            {queue.length} actions · {done.length} synchro. · {errors.length+conflicts.length} problèmes
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <NetworkIndicator status={netStatus}
            pendingCount={pending.length} errorCount={errors.length+conflicts.length}
            onSync={onSync}/>
          <Btn onClick={onToggleOffline}
            bg={simOffline?T.redL:T.bg2} color={simOffline?T.red:T.tx} small>
            {simOffline?"Simuler hors ligne ✓":"Simuler hors ligne"}
          </Btn>
          <PBtn onClick={onSync} disabled={netStatus==="syncing"}>
            ⟳ Synchroniser
          </PBtn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,
        padding:"12px 18px",background:T.bg2,borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        {[
          {l:"En attente",n:pending.length,  c:T.amber},
          {l:"En cours",  n:syncing.length,  c:T.blue},
          {l:"Erreurs",   n:errors.length,   c:T.red},
          {l:"Conflits",  n:conflicts.length,c:"#7A1C1C"},
          {l:"Synchro.",  n:done.length,     c:T.green},
        ].map(({l,n,c})=>(
          <div key={l} style={{background:"#fff",borderRadius:10,padding:"10px",textAlign:"center",
            border:`1px solid ${T.bd}`}}>
            <div style={{fontSize:20,fontWeight:700,color:c}}>{n}</div>
            <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.bd}`,background:"#fff",flexShrink:0}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"9px 16px",fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
            fontFamily:"inherit",background:"none",
            color:activeTab===t.id?T.green:T.tx3,
            borderBottom:`2px solid ${activeTab===t.id?T.green:"transparent"}`,
            display:"flex",alignItems:"center",gap:6,
          }}>
            {t.label}
            <span style={{
              background:activeTab===t.id?T.green:T.bg2,
              color:activeTab===t.id?"#fff":T.tx3,
              padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:600,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>

        {/* QUEUE TAB */}
        {activeTab==="queue" && (
          <>
            {queue.filter(a=>a.status!=="done"&&a.status!=="duplicate").length===0 && (
              <div style={{textAlign:"center",padding:"30px 0",color:T.tx3}}>
                <div style={{fontSize:32,marginBottom:8}}>✓</div>
                <div style={{fontSize:14,fontWeight:500,color:T.green}}>Tout est synchronisé</div>
              </div>
            )}

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <SCard title={`Conflits (${conflicts.length})`} accent={T.red}
                extra={<Badge bg={T.redL} color={T.red}>{conflicts.length}</Badge>}>
                {conflicts.map(a=>(
                  <div key={a.id} style={{
                    padding:"10px 0",borderBottom:`0.5px solid ${T.bd}`,
                    display:"flex",gap:10,alignItems:"flex-start",
                  }}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:7,marginBottom:3}}>
                        <Badge bg={T.redL} color={T.red}>Conflit</Badge>
                        <span style={{fontSize:12,fontWeight:500}}>{a.refLabel}</span>
                      </div>
                      <div style={{fontSize:11,color:T.red,marginBottom:2}}>
                        {a.conflictReason}
                      </div>
                      <div style={{fontSize:10,color:T.tx3}}>
                        {actionTypeLabel(a.type)} · {fmtDateTime(a.createdAt)} · {a.attempts} tentative(s)
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <Btn onClick={()=>onRetry(a.id)} bg={T.amberL} color={T.amberD} small>Forcer</Btn>
                      <Btn onClick={()=>setConfirm({msg:`Supprimer l'action "${a.refLabel}" ? Cette donnée ne sera pas envoyée.`,fn:()=>onDelete(a.id)})}
                        bg={T.redL} color={T.red} small>Suppr.</Btn>
                    </div>
                  </div>
                ))}
              </SCard>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <SCard title={`Erreurs (${errors.length})`}
                extra={<Btn onClick={()=>errors.forEach(a=>onRetry(a.id))} bg={T.amberL} color={T.amberD} small>Tout réessayer</Btn>}>
                {errors.map(a=>(
                  <div key={a.id} style={{
                    padding:"9px 0",borderBottom:`0.5px solid ${T.bd}`,
                    display:"flex",gap:10,alignItems:"flex-start",
                  }}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:7,marginBottom:3}}>
                        <Badge bg={T.redL} color={T.red}>Erreur</Badge>
                        <span style={{fontSize:12,fontWeight:500}}>{a.refLabel}</span>
                      </div>
                      <div style={{fontSize:11,color:T.red,marginBottom:2}}>
                        {a.errorMessage}
                      </div>
                      <div style={{fontSize:10,color:T.tx3}}>
                        {actionTypeLabel(a.type)} · {a.attempts} tentative(s)
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <Btn onClick={()=>onRetry(a.id)} bg={T.amberL} color={T.amberD} small>Réessayer</Btn>
                      <Btn onClick={()=>setConfirm({msg:`Supprimer "${a.refLabel}" ?`,fn:()=>onDelete(a.id)})}
                        bg={T.redL} color={T.red} small>✕</Btn>
                    </div>
                  </div>
                ))}
              </SCard>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <SCard title={`En attente (${pending.length})`}>
                {pending.map(a=>{
                  const b = actionStatusBadge(a.status);
                  return (
                    <div key={a.id} style={{
                      display:"flex",alignItems:"center",gap:10,
                      padding:"8px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:12,
                    }}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:2}}>
                          <Badge bg={b.bg} color={b.color}>{b.label}</Badge>
                          <span style={{fontWeight:500}}>{a.refLabel}</span>
                        </div>
                        <div style={{fontSize:10,color:T.tx3}}>
                          {actionTypeLabel(a.type)} · {fmtDateTime(a.createdAt)}
                        </div>
                      </div>
                      <Btn onClick={()=>setConfirm({msg:`Supprimer "${a.refLabel}" ?`,fn:()=>onDelete(a.id)})}
                        bg={T.redL} color={T.red} small>✕</Btn>
                    </div>
                  );
                })}
              </SCard>
            )}

            {/* Done (collapsible) */}
            {done.length > 0 && (
              <SCard title={`Synchronisées (${done.length})`}
                extra={<Btn onClick={onClearDone} bg={T.bg2} color={T.tx3} small>Effacer</Btn>}>
                {done.slice(-5).map(a=>(
                  <div key={a.id} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"5px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:11,
                  }}>
                    <span style={{color:T.green}}>✓ {a.refLabel}</span>
                    <span style={{color:T.tx3}}>{fmtTime(a.syncedAt)}</span>
                  </div>
                ))}
                {done.length > 5 && (
                  <div style={{fontSize:10,color:T.tx3,textAlign:"center",marginTop:6}}>
                    … et {done.length-5} autres
                  </div>
                )}
              </SCard>
            )}
          </>
        )}

        {/* LOG TAB */}
        {activeTab==="log" && (
          <SCard title="Journal de synchronisation"
            extra={<span style={{fontSize:11,color:T.tx3}}>{log.length} entrées</span>}>
            {log.length===0 && (
              <div style={{textAlign:"center",color:T.tx3,padding:"12px 0",fontSize:12}}>
                Aucune entrée
              </div>
            )}
            {log.slice().reverse().map((l,i)=>{
              const c = {success:T.green,error:T.red,conflict:"#7A1C1C",duplicate:T.tx3}[l.level];
              const ic = {success:"✓",error:"✗",conflict:"⚡",duplicate:"≡"}[l.level];
              return (
                <div key={l.id} style={{
                  display:"flex",gap:8,padding:"6px 0",
                  borderBottom:i<log.length-1?`0.5px solid ${T.bd}`:"none",
                }}>
                  <span style={{color:c,fontSize:12,flexShrink:0,fontWeight:700}}>{ic}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:T.tx,lineHeight:1.4}}>{l.message}</div>
                    <div style={{fontSize:9,color:T.tx3,marginTop:2}}>{fmtDateTime(l.at)}</div>
                  </div>
                </div>
              );
            })}
          </SCard>
        )}

        {/* TESTS TAB */}
        {activeTab==="tests" && (
          <SCard title={`Tests unitaires — ${testResults.filter(r=>r.pass).length}/${UNIT_TESTS.length} passés`}
            accent={testResults.every(r=>r.pass)?T.green:T.amber}>
            <div style={{
              marginBottom:8,padding:"8px 10px",borderRadius:8,
              background:testResults.every(r=>r.pass)?T.greenL:T.amberL,
              fontSize:12,fontWeight:600,
              color:testResults.every(r=>r.pass)?T.greenD:T.amberD,
            }}>
              {testResults.filter(r=>r.pass).length}/{UNIT_TESTS.length} tests passés
            </div>
            {testResults.map((r,i)=>(
              <div key={i} style={{
                display:"flex",gap:8,alignItems:"flex-start",padding:"6px 0",
                borderBottom:i<testResults.length-1?`0.5px solid ${T.bd}`:"none",
              }}>
                <span style={{color:r.pass?T.green:T.red,fontWeight:700,fontSize:14,flexShrink:0}}>
                  {r.pass?"✓":"✗"}
                </span>
                <div>
                  <div style={{fontSize:12,color:r.pass?T.tx:T.red}}>{r.name}</div>
                  {r.err && <div style={{fontSize:10,color:T.red}}>{r.err}</div>}
                </div>
              </div>
            ))}
          </SCard>
        )}
      </div>
    </div>
  );
};

// ── DEMO: ADD ACTIONS PANEL ────────────────────────────────────────────────────
const AddActionsPanel = ({ onAdd }) => {
  const DEMO_ACTIONS = [
    {type:"create_contact",    payload:{nom:"Martin",tel:"0611223344"},    label:"Contact Martin"},
    {type:"create_opportunite",payload:{commune:"Auxerre",volumeT:280},    label:"Opport. Auxerre 280t"},
    {type:"create_lot",        payload:{commune:"Charny",essence:"Peuplier"},label:"LOT-2025-010 Charny"},
    {type:"add_tas",           payload:{lotId:"l1",num:"D",volumeT:45},    label:"Tas D — LOT-2025-007"},
    {type:"create_transport",  payload:{lotId:"l2",chauffeur:"P. Leroy"},  label:"Transport — D. Leroy"},
    {type:"validate_livraison",payload:{lotId:"l3",poidsNet:38.5},         label:"BL-2025-0090"},
    {type:"validate_livraison",payload:{lotStatut:"CLOTURE",lotId:"l3"},   label:"BL conflictuel (lot clôturé)"},
    {type:"add_historique",    payload:{msg:"Chantier démarré"},           label:"Historique chantier"},
  ];

  return (
    <div style={{
      background:"#fff",borderLeft:`1px solid ${T.bd}`,
      width:240,minWidth:240,padding:"14px 14px",
      display:"flex",flexDirection:"column",gap:8,overflowY:"auto",
    }}>
      <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
        letterSpacing:".06em",marginBottom:4}}>Simuler des actions</div>
      <div style={{fontSize:11,color:T.tx3,marginBottom:4}}>
        Ajoute des actions à la file, puis synchronise.
      </div>
      {DEMO_ACTIONS.map(({type,payload,label})=>(
        <button key={label} onClick={()=>onAdd(type,payload,label)} style={{
          width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.bd}`,
          background:T.bg2,cursor:"pointer",textAlign:"left",fontFamily:"inherit",
          fontSize:11,color:T.tx,
        }}>
          <div style={{fontWeight:500}}>{label}</div>
          <div style={{fontSize:9,color:T.tx3,marginTop:2}}>{actionTypeLabel(type)}</div>
        </button>
      ))}
      <div style={{height:1,background:T.bd,margin:"4px 0"}}/>
      <div style={{fontSize:10,color:T.tx3,lineHeight:1.5}}>
        💡 Le "BL conflictuel" simule un conflit de statut côté serveur.
        <br/><br/>
        Les mêmes actions ajoutées deux fois testent l'idempotence.
      </div>
    </div>
  );
};

// ── APP ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const [queue, setQueue] = useState(() => loadQueue());
  const [log, setLog] = useState(() => loadLog());
  const [netStatus, setNetStatus] = useState("online");
  const [simOffline, setSimOffline] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const syncRef = useRef(false);

  // Run tests on mount
  useEffect(() => {
    runTests().then(setTestResults);
  }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (!simOffline && netStatus !== "syncing") {
      const pending = queue.filter(a => a.status === "pending");
      if (pending.length > 0) handleSync();
    }
  }, [simOffline]);

  const handleAdd = useCallback((type, payload, refLabel) => {
    const action = buildPendingAction(type, payload, refLabel);
    // Dedup: same clientRequestId already pending → skip
    const existing = queue.find(a =>
      a.clientRequestId === action.clientRequestId &&
      (a.status === "pending" || a.status === "done")
    );
    if (existing) {
      if (existing.status === "done") {
        setLog(l => {
          const nl = [...l, {id:uid(),actionId:existing.id,level:"duplicate",
            message:`[DOUBLON LOCAL] "${refLabel}" déjà synchronisé`,at:nowISO()}];
          saveLog(nl);
          return nl;
        });
      }
      return;
    }
    const newQueue = [...queue, action];
    setQueue(newQueue);
    saveQueue(newQueue);
    if (!simOffline) setTimeout(handleSync, 100);
  }, [queue, simOffline]);

  const handleSync = useCallback(() => {
    if (syncRef.current) return;
    syncRef.current = true;
    runSync(
      loadQueue(), setQueue, loadLog(), setLog,
      simOffline, setNetStatus,
    ).finally(() => { syncRef.current = false; });
  }, [simOffline]);

  const handleRetry = useCallback((id) => {
    const newQueue = queue.map(a =>
      a.id === id ? { ...a, status: "pending", errorMessage: undefined, conflictReason: undefined } : a
    );
    setQueue(newQueue);
    saveQueue(newQueue);
    setTimeout(handleSync, 50);
  }, [queue, handleSync]);

  const handleDelete = useCallback((id) => {
    const action = queue.find(a => a.id === id);
    const newQueue = queue.filter(a => a.id !== id);
    setQueue(newQueue);
    saveQueue(newQueue);
    setLog(l => {
      const nl = [...l, {id:uid(),actionId:id,level:"error",
        message:`[SUPPRIMÉ] "${action?.refLabel}" supprimé manuellement`,at:nowISO()}];
      saveLog(nl);
      return nl;
    });
  }, [queue]);

  const handleClearDone = useCallback(() => {
    const newQueue = queue.filter(a => a.status !== "done" && a.status !== "duplicate");
    setQueue(newQueue);
    saveQueue(newQueue);
  }, [queue]);

  const pendingCount = queue.filter(a => a.status === "pending").length;
  const errorCount = queue.filter(a => a.status === "error" || a.status === "conflict").length;

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100vh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:T.bg, color:T.tx,
    }}>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>

      {/* App header */}
      <div style={{
        background:"#111", color:"#fff", padding:"10px 16px",
        display:"flex", alignItems:"center", gap:12, flexShrink:0,
      }}>
        <div style={{width:28,height:28,background:T.green,borderRadius:7,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌲</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</div>
          <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:".04em"}}>Offline Sync</div>
        </div>
        <div style={{flex:1}}/>
        <NetworkIndicator
          status={netStatus} pendingCount={pendingCount} errorCount={errorCount}
          onSync={handleSync}/>
        {/* Global badge */}
        {pendingCount + errorCount > 0 && (
          <div style={{
            background:errorCount>0?T.red:T.amber, color:"#fff",
            padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:600,
          }}>
            {pendingCount + errorCount} action{pendingCount+errorCount>1?"s":""} en attente
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <SyncScreen
            queue={queue} log={log} netStatus={netStatus}
            simOffline={simOffline} testResults={testResults}
            onSync={handleSync}
            onRetry={handleRetry}
            onDelete={handleDelete}
            onToggleOffline={()=>setSimOffline(s=>!s)}
            onClearDone={handleClearDone}
          />
        </div>
        <AddActionsPanel onAdd={handleAdd}/>
      </div>
    </div>
  );
}
