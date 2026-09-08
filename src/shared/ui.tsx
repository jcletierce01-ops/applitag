import type { ReactNode, CSSProperties } from 'react';
import { C, FONT_TITLE, BTN_H, INPUT_H, FONT_INPUT } from '../design-system/tokens.js';
import { todayS } from './utils.js';

interface BigBtnProps {
  onClick?: () => void;
  bg?: string;
  color?: string;
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}

export const BigBtn = ({ onClick, bg = C.green, color = "#fff", children, disabled, icon, style = {} }: BigBtnProps) => (
  <button onClick={disabled ? undefined : onClick} style={{
    width: "100%", height: BTN_H, borderRadius: 14,
    background: disabled ? C.bg2 : bg, color: disabled ? C.tx3 : color,
    border: "none", fontFamily: "inherit", fontSize: 16, fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
    WebkitTapHighlightColor: "transparent", ...style,
  }}>
    {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
    {children}
  </button>
);

interface MInputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  big?: boolean;
  min?: string;
  bold?: boolean;
}

export const MInput = ({ label, value, onChange, placeholder, type = "text", required, error, hint, big, min, bold }: MInputProps) => {
  const inputMode = type === "number" || type === "numeric" ? "decimal" as const
    : type === "tel" ? "tel" as const
    : type === "email" ? "email" as const
    : undefined;
  const minAttr = type === "date" ? (min ?? todayS()) : undefined;
  const isEmpty = required && (!value || String(value).trim() === "" || parseFloat(String(value)) === 0 || value === "0");
  const borderColor = error ? C.red : isEmpty ? "#E24B4A" : C.bd;
  return (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: (error || isEmpty) ? C.red : bold ? C.greenD : C.tx2, marginBottom: 5,
      display: "flex", justifyContent: "space-between" }}>
      <span>{label}{required && <span style={{ color: "#E24B4A" }}> ✱</span>}</span>
      {hint && <span style={{ fontWeight: 400, color: C.tx3, fontSize: 12 }}>{hint}</span>}
    </div>
    {big ? (
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        style={{ width: "100%", padding: "14px", borderRadius: 12, resize: "none",
          border: `1.5px solid ${borderColor}`,
          fontSize: FONT_INPUT, fontFamily: "inherit", lineHeight: 1.5,
          background: "#fff", color: C.tx, outline: "none" }} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type === "number" ? "text" : type}
        inputMode={inputMode}
        min={minAttr}
        style={{ width: "100%", height: INPUT_H, padding: "0 14px", borderRadius: 12,
          border: `1.5px solid ${borderColor}`,
          fontSize: FONT_INPUT, fontFamily: "inherit",
          background: "#fff", color: C.tx, outline: "none" }} />
    )}
    {error && <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>⚠ {error}</div>}
  </div>
  );
};

interface GridSelectProps {
  options: [string, string, string][];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}

export const GridSelect = ({ options, value, onChange, cols = 3 }: GridSelectProps) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 8, marginBottom: 14 }}>
    {options.map(([v, emoji, label]) => {
      const active = value === v;
      return (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: "10px 6px", borderRadius: 12,
          border: `1.5px solid ${active ? C.green : C.bd}`,
          background: active ? C.greenL : "#fff", cursor: "pointer",
          fontFamily: "inherit", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 4, WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontSize: 10, fontWeight: active ? 600 : 400,
            color: active ? C.greenD : C.tx2, textAlign: "center", lineHeight: 1.3 }}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

interface SectionTitleProps {
  icon?: ReactNode;
  label: string;
  color?: string;
}

export const SectionTitle = ({ icon, label, color }: SectionTitleProps) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: color || C.tx2, marginBottom: 12, marginTop: 8,
    display: "flex", alignItems: "center", gap: 7, fontFamily: FONT_TITLE,
    paddingBottom: 8, borderBottom: `1px solid ${color || C.bd}` }}>
    <span style={{ fontSize: 16 }}>{icon}</span>{label}
  </div>
);

interface MiniBarChartProps {
  data: (number | null | undefined)[];
  color?: string;
  height?: number;
}

export const MiniBarChart = ({ data, color = C.green, height = 40 }: MiniBarChartProps) => {
  const max = Math.max(1, ...data.map(d => d || 0));
  const n = data.length;
  const x = (i: number) => n > 1 ? (i / (n - 1)) * 100 : 50;
  const y = (v: number) => height - (v / max) * (height - 4) - 2;
  const points = data.map((v, i) => `${x(i)},${y(v || 0)}`).join(" ");
  const areaPoints = `0,${height} ${points} 100,${height}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.6}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data.map((v, i) => v ? (
        <circle key={i} cx={x(i)} cy={y(v)} r={1.4} fill={color} />
      ) : null)}
    </svg>
  );
};

interface MSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  hint?: string;
}

export const MSlider = ({ label, value, onChange, min, max, step = 1, unit, color = C.green, hint }: MSliderProps) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between",
      fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 8 }}>
      <span>{label}{hint && <span style={{ fontWeight: 400, color: C.tx3, fontSize: 10 }}> · {hint}</span>}</span>
      <span style={{ color, fontSize: 15, fontWeight: 700 }}>{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: "100%", height: 8, accentColor: color }} />
    <div style={{ display: "flex", justifyContent: "space-between",
      fontSize: 9, color: C.tx3, marginTop: 3 }}>
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

interface CheckItemProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
  warn?: boolean;
}

export const CheckItem = ({ checked, onChange, label, sub, warn }: CheckItemProps) => (
  <div onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "flex-start",
    gap: 12, padding: "12px 0", borderBottom: `0.5px solid ${C.bd}`,
    cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
      border: `2px solid ${checked ? (warn ? C.amber : C.green) : C.bd2}`,
      background: checked ? (warn ? C.amber : C.green) : "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
      {checked && <span style={{ color: "#fff", fontSize: 16, lineHeight: 1 }}>✓</span>}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: checked ? 400 : 500, color: checked ? C.tx2 : C.tx }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: C.tx3, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);
