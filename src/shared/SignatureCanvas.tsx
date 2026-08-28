import { useState, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { C } from '../design-system/tokens.js';

interface SignatureCanvasProps {
  label?: string;
  nomSignataire?: string;
  onSigned?: (data: string) => void;
  onClear?: () => void;
  signed?: boolean;
}

type DrawEvent = ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>;

export const SignatureCanvas = ({ label, nomSignataire = "", onSigned, onClear, signed = false }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasSig,  setHasSig]  = useState(signed);
  const [showPad, setShowPad] = useState(false);

  const getPos = (e: DrawEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const src  = 'touches' in e ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width),
             y: (src.clientY - rect.top)  * (canvas.height / rect.height) };
  };

  const startDraw = (e: DrawEvent) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const draw = (e: DrawEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#1A1A18";
    ctx.lineTo(x, y); ctx.stroke();
  };

  const endDraw = () => { drawing.current = false; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSig(false);
    onClear?.();
  };

  const handleValider = () => {
    const data = canvasRef.current!.toDataURL("image/png");
    setHasSig(true); setShowPad(false);
    onSigned?.(data);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 8 }}>{label}</div>}
      <div onClick={() => !hasSig && setShowPad(true)} style={{
        border: `2px solid ${hasSig ? C.green : C.bd}`, borderRadius: 12,
        padding: hasSig ? "0" : "24px 0", background: hasSig ? C.greenL : "#fff",
        cursor: hasSig ? "default" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        WebkitTapHighlightColor: "transparent" }}>
        {hasSig ? (
          <div style={{ padding: "10px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", width: "100%" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.greenD }}>
              ✅ Signé — {nomSignataire}
            </div>
            <button onClick={e => { e.stopPropagation(); handleClear(); setShowPad(true); }}
              style={{ background: "none", border: "none", color: C.tx3, cursor: "pointer",
                fontSize: 12, padding: "2px 8px", borderRadius: 6,
                WebkitTapHighlightColor: "transparent" }}>
              ↺ Refaire
            </button>
          </div>
        ) : (
          <><span style={{ fontSize: 28 }}>✍️</span>
          <span style={{ fontSize: 13, color: C.tx3 }}>Appuyez pour signer</span></>
        )}
      </div>
      {showPad && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
          zIndex: 3000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 16 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.bd, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 4 }}>
              ✍️ {nomSignataire || label}
            </div>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 12 }}>
              Signez dans le cadre ci-dessous
            </div>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden",
              border: `2px solid ${C.bd}`, background: "#FAFAF8", marginBottom: 12 }}>
              <canvas ref={canvasRef} width={360} height={160}
                style={{ width: "100%", height: 160, display: "block", touchAction: "none" }}
                onMouseDown={(e) => startDraw(e)} onMouseMove={(e) => draw(e)}
                onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={(e) => startDraw(e)} onTouchMove={(e) => draw(e)}
                onTouchEnd={endDraw} />
              <div style={{ position: "absolute", bottom: 8, left: 0, right: 0,
                textAlign: "center", pointerEvents: "none" }}>
                <div style={{ borderTop: `1px solid ${C.bd}`, margin: "0 24px", paddingTop: 6,
                  fontSize: 10, color: C.tx3 }}>{nomSignataire || "Signataire"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <button onClick={handleClear} style={{
                padding: "12px 0", borderRadius: 10, background: C.bg2, border: `1px solid ${C.bd}`,
                color: C.tx2, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
                WebkitTapHighlightColor: "transparent" }}>🗑️ Effacer</button>
              <button onClick={handleValider} style={{
                padding: "12px 0", borderRadius: 10, background: C.green, border: "none",
                color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
                WebkitTapHighlightColor: "transparent" }}>✅ VALIDER</button>
            </div>
            <button onClick={() => setShowPad(false)} style={{
              width: "100%", marginTop: 10, padding: 10, background: "transparent",
              border: "none", color: C.tx3, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
