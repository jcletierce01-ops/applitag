import { useState, useEffect } from "react";

interface GeoContext {
  commune: string | null;
  codeInsee: string | null;
  codeDept: string | null;
  nomDept: string | null;
  nomRegion: string | null;
  altitudeM: number | null;
  parcelleId: string | null;
  disponible: boolean;
}

export function GeoContextBadge({ lat, lng }: { lat: number; lng: number }) {
  const [ctx, setCtx]     = useState<GeoContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `${import.meta.env.VITE_API_URL ?? ""}/geoplateforme/context?lat=${lat}&lng=${lng}`,
      { headers: { Accept: "application/json" } },
    )
      .then(r => r.ok ? r.json() : null)
      .then((d: GeoContext | null) => { setCtx(d); setLoading(false); })
      .catch(() => { setCtx(null); setLoading(false); });
  }, [lat, lng]);

  if (loading) return (
    <div style={{borderRadius:10,padding:"8px 12px",marginBottom:10,
      background:"#F0FDF4",border:"1px solid #BBF7D0",
      fontSize:11,color:"#15803D",display:"flex",alignItems:"center",gap:6}}>
      🗺️ Contexte IGN…
    </div>
  );

  if (!ctx?.disponible) return null;

  return (
    <div style={{borderRadius:10,padding:"10px 12px",marginBottom:12,
      background:"#F0FDF4",border:"1px solid #86EFAC"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#15803D",letterSpacing:"0.05em",
        textTransform:"uppercase",marginBottom:6}}>
        🗺️ Contexte territorial — IGN Géoplateforme
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {ctx.commune && (
          <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,
            background:"#DCFCE7",border:"1px solid #86EFAC",color:"#166534",fontWeight:600}}>
            🏘️ {ctx.commune}
          </span>
        )}
        {ctx.nomDept && (
          <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,
            background:"#DCFCE7",border:"1px solid #86EFAC",color:"#166534"}}>
            {ctx.codeDept} — {ctx.nomDept}
          </span>
        )}
        {ctx.nomRegion && (
          <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,
            background:"#F0FDF4",border:"1px solid #BBF7D0",color:"#15803D"}}>
            {ctx.nomRegion}
          </span>
        )}
        {ctx.altitudeM != null && (
          <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,
            background:"#F0FDF4",border:"1px solid #BBF7D0",color:"#15803D"}}>
            ⛰️ {ctx.altitudeM} m alt.
          </span>
        )}
        {ctx.codeInsee && (
          <span style={{fontSize:9,padding:"1px 6px",borderRadius:5,
            background:"rgba(22,101,52,0.07)",color:"#166534",fontFamily:"monospace"}}>
            INSEE {ctx.codeInsee}
          </span>
        )}
        {ctx.parcelleId && (
          <span style={{fontSize:9,padding:"1px 6px",borderRadius:5,
            background:"rgba(22,101,52,0.07)",color:"#166534",fontFamily:"monospace"}}>
            Parcelle {ctx.parcelleId}
          </span>
        )}
      </div>
    </div>
  );
}
