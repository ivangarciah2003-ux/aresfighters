import { useState, useEffect, useCallback, useRef } from "react";
import aresLogo from "@/assets/ares-logo.jpg";
import { supabase } from "@/integrations/supabase/client";

const SHEET_ID = "1QKD_Oxaf-a7hukGtK5o-bsRzzzZbDvvgVh7semvO4wo";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// ── ARES BRAND COLORS ──
const C = {
  bg: "#0a0a0a", surface: "#111111", card: "#161616", cardHover: "#1c1c1c",
  border: "#2a2a2a", borderBright: "#3a3a3a",
  gold: "#d4a843", goldDim: "#d4a84322", goldBright: "#e8c35a",
  red: "#c0392b", redDim: "#3d1218",
  cyan: "#5dade2", green: "#27ae60", greenDim: "#003d1e",
  yellow: "#f1c40f", yellowDim: "#3d3000",
  muted: "#6b6b6b", text: "#e8e8e8", textDim: "#999999",
};

const HERO_DATA = {
  Superman:     { color: C.gold,   icon: "⚡", desc: "Fuerza + Velocidad. Mantenimiento integrado.", prio: { dom: "Mantenimiento integrado", mant: "Fast Force", sop: "High Force / Long Force" } },
  Hulk:         { color: C.red,    icon: "💥", desc: "Fuerza alta, velocidad baja. Fast Force dominante.", prio: { dom: "Fast Force", mant: "High Force", sop: "Long Force" } },
  Flash:        { color: C.yellow, icon: "🏃", desc: "Velocidad alta, fuerza baja. High Force dominante.", prio: { dom: "High Force", mant: "Fast Force", sop: "Long Force" } },
  "Viuda Negra":{ color: C.muted,  icon: "🕷", desc: "Sin base aún. Slow + High primero.", prio: { dom: "Slow Force + High Force", mant: "Long Force", sop: "Fast Force (mínimo)" } },
};

// ── NEW VEHICLE SYSTEM ──
const VEHICLE_DATA = {
  Velero:  { color: C.green, icon: "⛵", desc: "Explosivo y consistente. Potencia alta + mantiene." },
  Lancha:  { color: C.red,   icon: "🚤", desc: "Sale fuerte pero se hunde. Potencia alta, caída importante." },
  Barco:   { color: C.cyan,  icon: "🛳", desc: "No muy explosivo, pero aguanta muy bien. Repeatability alta." },
  Moto:    { color: C.yellow, icon: "🏍", desc: "Ni potencia ni capacidad de repetir. Necesita trabajo global." },
};

const THRESHOLD_POTENCIA = 10; // W/kg reference

// ── 1RM Calculation (Brzycki formula) ──
const calc1RM = (kg, reps) => {
  const k = parseFloat(kg), r = parseFloat(reps);
  if (isNaN(k)||isNaN(r)||k<=0||r<=0) return null;
  if (r === 1) return k;
  return Math.round(k * (36 / (37 - r)));
};
const calcFR = (oneRM, bw) => {
  const o = parseFloat(oneRM), b = parseFloat(bw);
  if (isNaN(o)||isNaN(b)||b<=0) return null;
  return (o / b).toFixed(2);
};

// ── ATR PROGRAMMING DATA ──
const ATR_DATA = {
  Acumulación: {
    color: "#5dade2", icon: "🔵", tagline: "Construir la base",
    dominante: ["Slow Force", "Long Force"],
    objetivo: "Mejorar eficiencia, tolerancia al volumen, preparar tejidos",
    bloques: {
      Prep: { desc: "Respiración, movilidad controlada, estabilidad", ejercicios: ["Dead bug", "Bird dog", "Respiración 90/90", "Movilidad cadera/torácica", "Trabajo ocular"] },
      "Saltos/Lanzamientos": { desc: "Baja intensidad", ejercicios: ["Pogo jumps", "Bonnie hops laterales", "Saltos en el sitio", "Lanzamientos suaves balón medicinal"] },
      Fuerza: { desc: "Slow + High controlado + Excéntrico + Isométrico", ejercicios: ["Zercher squat", "Goblet squat", "Split squat", "RDL", "Hip thrust", "Tempo squat 3-4s (excéntrico)", "Nordic hamstring (excéntrico)", "Split squat iso hold", "Wall sit (isométrico)"] },
      Rotación: { desc: "Anti-rotación controlada", ejercicios: ["Pallof press", "Anti-rotación cable", "Chops lentos"] },
      "Speed/Sistemas": { desc: "Long Force (oxidativo)", ejercicios: ["Zona 2 continuo", "Aeróbico continuo", "Circuitos largos baja intensidad"] },
    }
  },
  Transformación: {
    color: "#c0392b", icon: "🔴", tagline: "Convertir fuerza en rendimiento",
    dominante: ["High Force", "Fast Force"],
    objetivo: "Aumentar producción de fuerza, mejorar RFD, tolerar esfuerzos tipo round",
    bloques: {
      Prep: { desc: "Activación neural + movilidad dinámica", ejercicios: ["Activación glúteo rápida", "Movilidad dinámica", "Priming neural"] },
      "Saltos/Lanzamientos": { desc: "Más intensidad", ejercicios: ["CMJ", "Bounding", "Hurdle jumps", "Med ball throws explosivos"] },
      Fuerza: { desc: "Pesada + potencia + contrastes", ejercicios: ["Front squat pesado", "Trap bar deadlift", "Step-up pesado", "Squat + jump (contraste)", "Press + lanzamiento (contraste)", "Drop jump (braking)", "Drop squat (deceleración)", "Isometric mid-thigh pull"] },
      Rotación: { desc: "Explosiva", ejercicios: ["Lanzamientos rotacionales", "Golpes con balón", "Cable high velocity"] },
      "Speed/Sistemas": { desc: "Glucolítico", ejercicios: ["Intervalos 20-60s", "Circuitos tipo round", "AirBike intervals"] },
    }
  },
  Realización: {
    color: "#27ae60", icon: "🟢", tagline: "Puesta a punto",
    dominante: ["Fast Force", "ATP-PC"],
    objetivo: "Maximizar rendimiento, reducir fatiga, peak performance",
    bloques: {
      Prep: { desc: "Activación rápida, baja fatiga", ejercicios: ["Activación neural breve", "Movilidad mínima necesaria"] },
      "Saltos/Lanzamientos": { desc: "Explosivos, bajo volumen", ejercicios: ["Depth jumps", "Reactive jumps", "Throws máximos"] },
      Fuerza: { desc: "Microdosis, 1-3 reps pesadas", ejercicios: ["1-3 reps pesadas (mantenimiento)", "Contrastes ligeros"] },
      Rotación: { desc: "Máxima velocidad, bajo volumen", ejercicios: ["Rotaciones máxima velocidad", "Bajo volumen"] },
      "Speed/Sistemas": { desc: "Aláctico", ejercicios: ["Sprints 5-10s", "Descansos largos (>2 min)", "Activación neural pura"] },
    }
  },
};

// ── UTILS ──
const parseGVizDate = (v) => {
  if (typeof v === "string") {
    const m = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
    if (m) return new Date(+m[1], +m[2], +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0)).toISOString();
  }
  return v;
};
const parseGViz = (raw) => {
  const json = JSON.parse(raw.replace(/^[^(]+\(|\);?$/g, ""));
  const cols = json.table.cols.map(c => c.label);
  return json.table.rows.map(r => Object.fromEntries(cols.map((c, i) => [c, parseGVizDate(r.c[i]?.v) ?? ""])));
};
const calcUA = (min, rpe) => Math.round((parseFloat(min)||0) * (parseFloat(rpe)||0));
const calcWellness = (row) => {
  const vals = ["Sueño","Fatiga","Estrés","Dolor muscular","Estado de ánimo"].map(f => parseFloat(row[f])||0).filter(v=>v>0);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
};
const semaforo = (ua) => {
  if (!ua) return { color: C.muted, label: "Descanso" };
  if (ua < 200) return { color: C.green, label: "Verde" };
  if (ua < 450) return { color: C.yellow, label: "Amarillo" };
  return { color: C.red, label: "Rojo" };
};
const clasificarHero = (fr, cmj) => {
  const f = parseFloat(fr), c = parseFloat(cmj);
  if (isNaN(f)||isNaN(c)) return null;
  if (f>=1.5&&c>=35) return "Superman";
  if (f>=1.5&&c<35)  return "Hulk";
  if (f<1.5&&c>=35)  return "Flash";
  return "Viuda Negra";
};

// NEW: Vehicle classification based on Sprint1/Sprint2
const clasificarVehicle = (w1, w2) => {
  const s1 = parseFloat(w1), s2 = parseFloat(w2);
  if (isNaN(s1)||isNaN(s2)||s1<=0) return null;
  const ratio = s2 / s1;
  const potenciaAlta = s1 >= THRESHOLD_POTENCIA;
  const repeatAlta = ratio >= 0.9;
  if (potenciaAlta && repeatAlta) return "Velero";
  if (potenciaAlta && !repeatAlta) return "Lancha";
  if (!potenciaAlta && repeatAlta) return "Barco";
  return "Moto";
};

const calcWingateStats = (w1, w2) => {
  const s1 = parseFloat(w1), s2 = parseFloat(w2);
  if (isNaN(s1)||isNaN(s2)||s1<=0) return null;
  const ratio = (s2/s1);
  const fi = ((s1-s2)/s1)*100;
  return { ratio: ratio.toFixed(2), ratioPercent: (ratio*100).toFixed(1), fi: fi.toFixed(1) };
};

const getVehicleInterpretation = (vehicle) => {
  const interps = {
    Velero: "Potencia alta y mantiene muy bien en el segundo sprint. Perfil ideal para competición.",
    Lancha: "Potencia alta pero caída importante en el segundo sprint. Mejorar repeatability y conditioning.",
    Barco: "No es muy explosivo, pero aguanta muy bien. Mejorar potencia de salida.",
    Moto: "Ni potencia ni capacidad de repetir. Necesita trabajo global: potencia + conditioning.",
  };
  return interps[vehicle] || "";
};

const fmtDate = (d) => { if(!d) return "–"; const dt=new Date(d); return isNaN(dt)?d:dt.toLocaleDateString("es-ES",{day:"2-digit",month:"short"}); };
const getWeekKey = (d) => { const dt=new Date(d); if(isNaN(dt)) return null; const jan1=new Date(dt.getFullYear(),0,1); return `${dt.getFullYear()}-W${Math.ceil(((dt-jan1)/86400000+jan1.getDay()+1)/7)}`; };

const calcACWR = (rows) => {
  const sorted = rows.slice().sort((a,b)=>new Date(a["Marca temporal"])-new Date(b["Marca temporal"]));
  const now = new Date();
  const day7 = new Date(now - 7*86400000);
  const day28 = new Date(now - 28*86400000);
  const acute = sorted.filter(r=>new Date(r["Marca temporal"])>=day7).reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0)/7;
  const chronic = sorted.filter(r=>new Date(r["Marca temporal"])>=day28).reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0)/28;
  const ratio = chronic > 0 ? (acute/chronic).toFixed(2) : null;
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio };
};

// ── BASE COMPONENTS ──
const Badge = ({ label, color, small }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding: small?"2px 8px":"4px 12px", background:color+"22", border:`1px solid ${color}`, color, fontSize:small?"10px":"11px", letterSpacing:"1.5px", textTransform:"uppercase", borderRadius:"2px", fontFamily:"'Inter',sans-serif", fontWeight:"600" }}>{label}</span>
);

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:`2px solid ${color||C.gold}`, padding:"16px 18px", flex:1, minWidth:"80px" }}>
    <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"6px" }}>{label}</div>
    <div style={{ fontSize:"24px", fontWeight:"700", color:color||C.text }}>{value}</div>
    {sub && <div style={{ fontSize:"11px", color:C.muted, marginTop:"4px" }}>{sub}</div>}
  </div>
);

const Sparkline = ({ data, color, h=32, w=100 }) => {
  if (!data||data.length<2) return null;
  const mn=Math.min(...data), mx=Math.max(...data), range=mx-mn||1;
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx={(data.length-1)/(data.length-1)*w} cy={h-((data[data.length-1]-mn)/range)*h} r="3" fill={color}/>
    </svg>
  );
};

// ── WINGATE RESULT CARD ──
const WingateCard = ({ w1, w2 }) => {
  const stats = calcWingateStats(w1, w2);
  const vehicle = clasificarVehicle(w1, w2);
  if (!stats || !vehicle) return null;
  const vInfo = VEHICLE_DATA[vehicle];
  return (
    <div style={{ background:C.card, border:`1px solid ${vInfo.color}44`, borderLeft:`4px solid ${vInfo.color}`, padding:"20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"16px" }}>
        <div style={{ fontSize:"36px" }}>{vInfo.icon}</div>
        <div>
          <div style={{ fontSize:"20px", fontWeight:"700", color:vInfo.color }}>{vehicle}</div>
          <div style={{ fontSize:"12px", color:C.textDim, marginTop:"2px" }}>{vInfo.desc}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"12px", marginBottom:"16px" }}>
        <div style={{ background:C.surface, padding:"12px", textAlign:"center" }}>
          <div style={{ fontSize:"9px", color:C.muted, letterSpacing:"2px", marginBottom:"4px" }}>SPRINT 1</div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:C.text }}>{w1}<span style={{fontSize:"11px",color:C.muted}}>W/kg</span></div>
        </div>
        <div style={{ background:C.surface, padding:"12px", textAlign:"center" }}>
          <div style={{ fontSize:"9px", color:C.muted, letterSpacing:"2px", marginBottom:"4px" }}>SPRINT 2</div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:C.text }}>{w2}<span style={{fontSize:"11px",color:C.muted}}>W/kg</span></div>
        </div>
        <div style={{ background:C.surface, padding:"12px", textAlign:"center" }}>
          <div style={{ fontSize:"9px", color:C.muted, letterSpacing:"2px", marginBottom:"4px" }}>RATIO</div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:parseFloat(stats.ratio)>=0.9?C.green:parseFloat(stats.ratio)>=0.75?C.yellow:C.red }}>{stats.ratioPercent}%</div>
        </div>
        <div style={{ background:C.surface, padding:"12px", textAlign:"center" }}>
          <div style={{ fontSize:"9px", color:C.muted, letterSpacing:"2px", marginBottom:"4px" }}>FI</div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:parseFloat(stats.fi)<=10?C.green:parseFloat(stats.fi)<=25?C.yellow:C.red }}>{stats.fi}%</div>
        </div>
      </div>
      <div style={{ background:C.surface, padding:"12px 16px", borderLeft:`3px solid ${vInfo.color}`, fontSize:"12px", color:C.textDim }}>
        {getVehicleInterpretation(vehicle)}
      </div>
    </div>
  );
};

// ── CUADRANTE SVG ──
const Cuadrante = ({ athletes, profiles }) => {
  const [hovered, setHovered] = useState(null);
  const W = 440, H = 380, PAD = 48;
  const plotW = W - PAD*2, plotH = H - PAD*2;
  const toX = (fr) => PAD + (Math.min(parseFloat(fr)||0, 2.5)/2.5)*plotW;
  const toY = (cmj) => PAD + plotH - (Math.min(parseFloat(cmj)||0, 60)/60)*plotH;
  const athletes_with_data = athletes.filter(name => { const p = profiles[name]||{}; return p.fr && p.cmj; });

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"12px", textTransform:"uppercase" }}>Cuadrante Fuerza — Velocidad</div>
      <div style={{ position:"relative", display:"inline-block" }}>
        <svg width={W} height={H} style={{ display:"block" }}>
          <rect x={PAD} y={PAD} width={plotW/2} height={plotH/2} fill={C.yellow+"08"} />
          <rect x={PAD+plotW/2} y={PAD} width={plotW/2} height={plotH/2} fill={C.gold+"08"} />
          <rect x={PAD} y={PAD+plotH/2} width={plotW/2} height={plotH/2} fill={C.muted+"08"} />
          <rect x={PAD+plotW/2} y={PAD+plotH/2} width={plotW/2} height={plotH/2} fill={C.red+"08"} />
          <text x={PAD+8} y={PAD+18} fill={C.yellow} fontSize="10" fontFamily="Inter" opacity="0.7">FLASH</text>
          <text x={PAD+plotW/2+8} y={PAD+18} fill={C.gold} fontSize="10" fontFamily="Inter" opacity="0.7">SUPERMAN</text>
          <text x={PAD+8} y={PAD+plotH/2+18} fill={C.muted} fontSize="10" fontFamily="Inter" opacity="0.7">VIUDA NEGRA</text>
          <text x={PAD+plotW/2+8} y={PAD+plotH/2+18} fill={C.red} fontSize="10" fontFamily="Inter" opacity="0.7">HULK</text>
          <line x1={PAD} y1={PAD} x2={PAD} y2={PAD+plotH} stroke={C.border} strokeWidth="1"/>
          <line x1={PAD} y1={PAD+plotH} x2={PAD+plotW} y2={PAD+plotH} stroke={C.border} strokeWidth="1"/>
          <line x1={toX(1.5)} y1={PAD} x2={toX(1.5)} y2={PAD+plotH} stroke={C.gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
          <line x1={PAD} y1={toY(35)} x2={PAD+plotW} y2={toY(35)} stroke={C.gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
          <text x={PAD+plotW/2} y={H-6} fill={C.muted} fontSize="10" fontFamily="Inter" textAnchor="middle">Fuerza Relativa (xBW)</text>
          <text x={10} y={PAD+plotH/2} fill={C.muted} fontSize="10" fontFamily="Inter" textAnchor="middle" transform={`rotate(-90,10,${PAD+plotH/2})`}>CMJ (cm)</text>
          {[0,0.5,1.0,1.5,2.0,2.5].map(v=>(
            <g key={v}>
              <line x1={toX(v)} y1={PAD+plotH} x2={toX(v)} y2={PAD+plotH+4} stroke={C.border} strokeWidth="1"/>
              <text x={toX(v)} y={PAD+plotH+14} fill={C.muted} fontSize="9" fontFamily="Inter" textAnchor="middle">{v}</text>
            </g>
          ))}
          {[0,15,30,45,60].map(v=>(
            <g key={v}>
              <line x1={PAD-4} y1={toY(v)} x2={PAD} y2={toY(v)} stroke={C.border} strokeWidth="1"/>
              <text x={PAD-8} y={toY(v)+4} fill={C.muted} fontSize="9" fontFamily="Inter" textAnchor="end">{v}</text>
            </g>
          ))}
          {athletes_with_data.map(name => {
            const p = profiles[name]||{};
            const hero = clasificarHero(p.fr, p.cmj);
            const hInfo = HERO_DATA[hero];
            const x = toX(p.fr), y = toY(p.cmj);
            const isH = hovered === name;
            return (
              <g key={name} onMouseEnter={()=>setHovered(name)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
                <circle cx={x} cy={y} r={isH?10:7} fill={(hInfo?.color||C.muted)+"44"} stroke={hInfo?.color||C.muted} strokeWidth={isH?2:1.5}/>
                {isH && <text x={x} y={y-14} fill={C.text} fontSize="10" fontFamily="Inter" textAnchor="middle" fontWeight="600">{name.split(" ")[0]}</text>}
              </g>
            );
          })}
        </svg>
        {hovered && (() => {
          const p = profiles[hovered]||{};
          const hero = clasificarHero(p.fr, p.cmj);
          const hInfo = HERO_DATA[hero];
          return (
            <div style={{ position:"absolute", bottom:"8px", right:"8px", background:C.surface, border:`1px solid ${hInfo?.color||C.border}`, padding:"10px 14px", fontSize:"12px", pointerEvents:"none" }}>
              <div style={{ fontWeight:"700", color:C.text, marginBottom:"4px" }}>{hovered}</div>
              <div style={{ color:C.muted }}>FR: {p.fr} × BW · CMJ: {p.cmj} cm</div>
              {hero && <div style={{ color:hInfo?.color, marginTop:"4px" }}>{hInfo?.icon} {hero}</div>}
            </div>
          );
        })()}
      </div>
      {athletes_with_data.length === 0 && (
        <div style={{ fontSize:"12px", color:C.muted, marginTop:"8px" }}>Añade CMJ y Fuerza Relativa en los perfiles para ver los atletas en el cuadrante.</div>
      )}
    </div>
  );
};

// ── PANEL COMPETICIONES GLOBAL ──
const CompeticionesGlobal = ({ allAthleteNames, profiles, onSelectAthlete }) => {
  const today = new Date();
  const allComps = [];
  allAthleteNames.forEach(name => {
    const comps = profiles[name]?.competiciones || [];
    comps.forEach(c => { if (c.date) allComps.push({ ...c, athlete: name }); });
  });
  allComps.sort((a,b) => new Date(a.date) - new Date(b.date));
  const upcoming = allComps.filter(c => new Date(c.date) >= today);
  const past = allComps.filter(c => new Date(c.date) < today).slice(-5).reverse();
  const daysUntil = (ds) => { const diff = Math.ceil((new Date(ds)-today)/86400000); if (diff===0) return "¡HOY!"; if (diff===1) return "Mañana"; return `${diff}d`; };

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"16px", textTransform:"uppercase" }}>Panel de Competiciones</div>
      {upcoming.length === 0 && <div style={{ fontSize:"12px", color:C.muted, marginBottom:"16px" }}>No hay competiciones próximas registradas.</div>}
      {upcoming.map((c, i) => {
        const days = Math.ceil((new Date(c.date)-today)/86400000); const urgent = days <= 14;
        return (
          <div key={i} onClick={() => onSelectAthlete(c.athlete)} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 12px", marginBottom:"6px", background: urgent ? C.redDim : C.surface, border:`1px solid ${urgent ? C.red : C.border}`, cursor:"pointer" }}>
            <div style={{ fontSize:"18px" }}>🥊</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", fontWeight:"600", color:C.text }}>{c.athlete}</div>
              <div style={{ fontSize:"11px", color:C.muted }}>{c.evento} · {c.categoria}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"13px", fontWeight:"700", color: urgent ? C.red : C.gold }}>{daysUntil(c.date)}</div>
              <div style={{ fontSize:"10px", color:C.muted }}>{c.date}</div>
            </div>
            {urgent && <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.red, textTransform:"uppercase" }}>{days<=7?"PEAKING":"CAMP"}</div>}
          </div>
        );
      })}
      {past.length > 0 && (
        <>
          <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", margin:"14px 0 8px" }}>Recientes</div>
          {past.map((c,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 0", borderBottom:`1px solid ${C.border}20`, fontSize:"12px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background: c.resultado?.toLowerCase().includes("vic")||c.resultado?.toLowerCase().includes("win") ? C.green : C.muted }} />
              <div style={{ flex:1, color:C.textDim }}>{c.athlete} · {c.evento}</div>
              <div style={{ color:C.muted }}>{fmtDate(c.date)}</div>
              {c.resultado && <div style={{ color:C.textDim }}>{c.resultado}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// ── GENERADOR IA ──
const GeneradorIA = ({ name, prof }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [dias, setDias] = useState("4");
  const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
  const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2);
  const fase = prof.fase || "off-camp";

  const ARES_SYSTEM = `Eres el asistente del sistema ARES, creado por Human Ability para el entrenamiento de peleadores de deportes de combate. Tu misión no es proponer ejercicios bonitos, sino tomar decisiones correctas basadas en el perfil real de cada atleta.

FILOSOFÍA CENTRAL: El entrenamiento es un problema de toma de decisiones, no de creatividad. ARES = Evaluar → Clasificar → Priorizar → Programar → Controlar → Re-evaluar. Nunca propones lo mismo para todos. Cada decisión parte del déficit real del atleta.

RENDIMIENTO = Fuerza + Velocidad + Energía + Mecánica

PERFILES NEUROMUSCULARES (CMJ vs Fuerza Relativa):
- Hulk: FR≥1.5 + CMJ<35 → Fast Force dominante
- Flash: FR<1.5 + CMJ≥35 → High Force dominante
- Viuda Negra: FR<1.5 + CMJ<35 → Slow + High primero
- Superman: FR≥1.5 + CMJ≥35 → Mantenimiento integrado

PERFILES ENERGÉTICOS (Doble Wingate):
- Velero ⛵: Potencia alta + repeatability alta → explosivo y consistente
- Lancha 🚤: Potencia alta + repeatability baja → sale fuerte pero se hunde
- Barco 🛳: Potencia baja + repeatability alta → no es muy explosivo pero aguanta
- Moto 🏍: Potencia baja + repeatability baja → ni potencia ni capacidad de repetir

SISTEMA DE FUERZAS:
- Slow Force: control, tejido, base estructural
- High Force: fuerza máxima, techo de producción. Estímulo ROJO
- Fast Force: RFD, transferencia, potencia. Siempre presente
- Long Force: zona 2, base oxidativa, recuperación

ESTRUCTURA DE SESIÓN: 5+1 Prep → Saltos/Lanzamientos → Velocidad → Fuerza → Energético → Recuperación. Los jumps SIEMPRE antes de la fatiga, nunca al final.

SEMÁFORO DE CARGA: Verde: UA < 200 | Amarillo: UA 200–450 | Rojo: UA > 450. No encadenar días rojos.

PERIODIZACIÓN ATR:
- Acumulación: Slow dominante (fase general)
- Transformación: Fast dominante (fase específica)
- Realización: bajo volumen, alta velocidad (pre-pelea)

REGLAS ABSOLUTAS:
- Sin absorción, la reactividad es ficción
- No destruir días Fast con glucolítico mal colocado
- No programar por moda, programar por perfil
- La transferencia no se decide por parecido visual sino por lógica de fuerzas
- No gana el que más entrena, sino el que recibe el estímulo que necesitaba

Responde SOLO JSON válido sin markdown ni backticks.`;

  const generar = async () => {
    setLoading(true); setPlan(null);
    const prompt = `PERFIL DEL ATLETA: ${name}
- Perfil neuromuscular: ${hero || "Sin clasificar"}
- Perfil energético: ${vehicle || "Sin datos"}
- Fase ATR: ${fase}
- Deporte: ${prof.deporte || "MMA"}
- Días disponibles: ${dias}
${prof.rsi ? `- RSI: ${prof.rsi}` : ""}

Genera un microciclo de ${dias} días. Responde SOLO JSON:
{"resumen":"lógica del bloque","bloque_dominante":"nombre","dias":[{"dia":"Lunes","color":"amarillo","tipo":"Fast Force","estructura":[{"bloque":"Prep","ejercicios":["Respiración 4-4-4","Movilidad cadera"],"duracion":"10 min"},{"bloque":"Saltos","ejercicios":["Squat Jump 4x4"],"duracion":"10 min"},{"bloque":"Velocidad","ejercicios":["Aceleración 10m x5"],"duracion":"8 min"},{"bloque":"Fuerza","ejercicios":["Trap Bar Jump 4x3 @40%"],"duracion":"20 min"},{"bloque":"Energético","ejercicios":["Aláctico 6x8s/90s"],"duracion":"10 min"}],"notas":"Calidad neural sobre todo","ua_estimada":320}],"frase_maestra":"frase del sistema"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3000,
          system: ARES_SYSTEM,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data = await res.json();
      let text = data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      setPlan(JSON.parse(text));
    } catch(e) { setPlan({error:"Error generando plan."}); }
    setLoading(false);
  };

  const semColors = { verde:C.green, amarillo:C.yellow, rojo:C.red };

  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
        <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"16px", textTransform:"uppercase" }}>Generador de Sesión IA — {name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
          {hero && <Badge label={`${HERO_DATA[hero]?.icon} ${hero}`} color={HERO_DATA[hero]?.color||C.muted} />}
          {vehicle && <Badge label={`${VEHICLE_DATA[vehicle]?.icon} ${vehicle}`} color={VEHICLE_DATA[vehicle]?.color||C.muted} />}
          <Badge label={fase} color={C.muted} />
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"10px" }}>
            <label style={{ fontSize:"11px", color:C.muted, letterSpacing:"2px" }}>DÍAS</label>
            <select value={dias} onChange={e=>setDias(e.target.value)} style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"7px 12px", fontFamily:"inherit", fontSize:"13px", outline:"none" }}>
              {["3","4","5","6"].map(d=><option key={d}>{d}</option>)}
            </select>
            <button onClick={generar} disabled={loading} style={{ padding:"8px 20px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit", fontWeight:"700" }}>
              {loading ? "⟳ GENERANDO..." : "▶ GENERAR PLAN"}
            </button>
          </div>
        </div>
      </div>

      {plan && !plan.error && (
        <div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"16px", marginBottom:"16px", borderLeft:`3px solid ${C.gold}` }}>
            <div style={{ fontSize:"11px", color:C.gold, letterSpacing:"2px", marginBottom:"4px" }}>LÓGICA DEL BLOQUE</div>
            <div style={{ fontSize:"13px", color:C.text }}>{plan.resumen}</div>
            <div style={{ marginTop:"8px" }}><Badge label={plan.bloque_dominante} color={C.gold} /></div>
          </div>
          {plan.dias?.map((dia,i) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${semColors[dia.color]||C.border}`, padding:"16px", marginBottom:"10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                <div>
                  <span style={{ fontSize:"16px", fontWeight:"700", color:C.text }}>{dia.dia}</span>
                  <span style={{ marginLeft:"12px", fontSize:"12px", color:C.muted }}>{dia.tipo}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  {dia.ua_estimada && <span style={{ fontSize:"12px", color:semColors[dia.color]||C.muted, fontWeight:"600" }}>{dia.ua_estimada} UA est.</span>}
                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:semColors[dia.color]||C.muted, boxShadow:`0 0 6px ${semColors[dia.color]||C.muted}` }}/>
                  <span style={{ fontSize:"11px", color:semColors[dia.color]||C.muted, letterSpacing:"2px", textTransform:"uppercase" }}>{dia.color}</span>
                </div>
              </div>
              {dia.estructura?.map((bloque,j) => (
                <div key={j} style={{ marginBottom:"10px", paddingLeft:"12px", borderLeft:`2px solid ${C.border}` }}>
                  <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", marginBottom:"4px" }}>{bloque.bloque} <span style={{ color:C.muted }}>— {bloque.duracion}</span></div>
                  {bloque.ejercicios?.map((ej,k) => <div key={k} style={{ fontSize:"12px", color:C.text, paddingLeft:"10px", marginBottom:"2px" }}>› {ej}</div>)}
                </div>
              ))}
              {dia.notas && <div style={{ fontSize:"11px", color:C.muted, marginTop:"10px", paddingTop:"10px", borderTop:`1px solid ${C.border}` }}>{dia.notas}</div>}
            </div>
          ))}
          {plan.frase_maestra && (
            <div style={{ textAlign:"center", padding:"16px", borderTop:`2px solid ${C.gold}`, marginTop:"4px" }}>
              <div style={{ fontSize:"11px", color:C.muted, letterSpacing:"3px", marginBottom:"6px" }}>FRASE MAESTRA</div>
              <div style={{ fontSize:"15px", color:C.gold, fontStyle:"italic" }}>"{plan.frase_maestra}"</div>
            </div>
          )}
        </div>
      )}
      {plan?.error && <div style={{ padding:"16px", background:C.redDim, border:`1px solid ${C.red}`, color:C.red, fontSize:"12px" }}>{plan.error}</div>}
    </div>
  );
};

// ── MAIN APP ──
export default function App() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [selected, setSelected] = useState(null);
  const [mainView, setMainView] = useState("dashboard");
  const [athleteTab, setAthleteTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const printRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(SHEET_URL + "&cb=" + Date.now());
      const text = await res.text();
      setAllRows(parseGViz(text));
      setLastSync(new Date());
    } catch(e) { setError("No se pudo conectar con Google Sheets."); }
    finally { setLoading(false); }
  }, []);

  // Load profiles, tests, competitions from Supabase
  const loadFromDB = useCallback(async () => {
    try {
      const [profRes, testRes, compRes] = await Promise.all([
        supabase.from("athlete_profiles").select("*"),
        supabase.from("athlete_tests").select("*").order("test_date", { ascending: true }),
        supabase.from("athlete_competitions").select("*"),
      ]);
      const dbProfiles = {};
      (profRes.data || []).forEach(p => {
        dbProfiles[p.name] = {
          deporte: p.deporte, fase: p.fase, peso: p.peso, cmj: p.cmj, sj: p.sj, rsi: p.rsi, fr: p.fr,
          w1: p.w1, w2: p.w2, fi: p.fi, hero: p.hero, vehicle: p.vehicle,
          pesoMuerto: p.peso_muerto, pressBanca: p.press_banca,
          dominadaLastrada: p.dominada_lastrada, sentadillaBulgara: p.sentadilla_bulgara,
          colgarse: p.colgarse,
          tests: [],
          competiciones: [],
        };
      });
      (testRes.data || []).forEach(t => {
        const name = t.athlete_name;
        if (!dbProfiles[name]) dbProfiles[name] = { tests: [], competiciones: [] };
        dbProfiles[name].tests.push({
          date: t.test_date, cmj: t.cmj, sj: t.sj, rsi: t.rsi, peso: t.peso, fr: t.fr,
          w1: t.w1, w2: t.w2, fi: t.fi, hero: t.hero, vehicle: t.vehicle,
          pesoMuertoKg: t.peso_muerto_kg, pesoMuertoReps: t.peso_muerto_reps, pm1RM: t.peso_muerto_1rm,
          pressBancaKg: t.press_banca_kg, pressBancaReps: t.press_banca_reps, pb1RM: t.press_banca_1rm,
          dominadaLastradaKg: t.dominada_lastrada_kg, dominadaLastradaReps: t.dominada_lastrada_reps, dl1RM: t.dominada_lastrada_1rm,
          sentadillaBulgaraKg: t.sentadilla_bulgara_kg, sentadillaBulgaraReps: t.sentadilla_bulgara_reps, sb1RM: t.sentadilla_bulgara_1rm,
          colgarseSegs: t.colgarse_segs, notas: t.notas,
        });
      });
      (compRes.data || []).forEach(c => {
        const name = c.athlete_name;
        if (!dbProfiles[name]) dbProfiles[name] = { tests: [], competiciones: [] };
        if (!dbProfiles[name].competiciones) dbProfiles[name].competiciones = [];
        dbProfiles[name].competiciones.push({
          id: c.id, date: c.fecha, evento: c.evento, categoria: c.rival, resultado: c.resultado, notas: c.notas,
        });
      });
      setProfiles(dbProfiles);
    } catch (e) { console.error("Error loading from DB:", e); }
  }, []);

  useEffect(() => { fetchData(); loadFromDB(); }, [fetchData, loadFromDB]);

  const athleteRows = {};
  allRows.forEach(row => {
    const name = row["Nombre del atleta"] || "";
    if (!name) return;
    if (!athleteRows[name]) athleteRows[name] = [];
    athleteRows[name].push(row);
  });
  const allAthleteNames = Object.keys(athleteRows).sort();

  const today = new Date().toLocaleDateString("es-ES");
  const registeredToday = [...new Set(allRows.filter(r => {
    try { return new Date(r["Marca temporal"]).toLocaleDateString("es-ES") === today; } catch { return false; }
  }).map(r => r["Nombre del atleta"]))].filter(Boolean);

  const updateProfile = async (name, data) => {
    setProfiles(prev => ({ ...prev, [name]: { ...prev[name], ...data } }));
    // Upsert profile to DB
    try {
      await supabase.from("athlete_profiles").upsert({
        name,
        deporte: data.deporte || profiles[name]?.deporte,
        fase: data.fase || profiles[name]?.fase,
        peso: data.peso || profiles[name]?.peso,
        cmj: data.cmj || profiles[name]?.cmj,
        sj: data.sj || profiles[name]?.sj,
        rsi: data.rsi || profiles[name]?.rsi,
        fr: data.fr || profiles[name]?.fr,
        w1: data.w1 || profiles[name]?.w1,
        w2: data.w2 || profiles[name]?.w2,
        fi: data.fi || profiles[name]?.fi,
        hero: data.hero || profiles[name]?.hero,
        vehicle: data.vehicle || profiles[name]?.vehicle,
        peso_muerto: data.pesoMuerto || profiles[name]?.pesoMuerto,
        press_banca: data.pressBanca || profiles[name]?.pressBanca,
        dominada_lastrada: data.dominadaLastrada || profiles[name]?.dominadaLastrada,
        sentadilla_bulgara: data.sentadillaBulgara || profiles[name]?.sentadillaBulgara,
        colgarse: data.colgarse || profiles[name]?.colgarse,
      }, { onConflict: "name" });
    } catch (e) { console.error("Error saving profile:", e); }
  };

  const exportPDF = (name) => {
    const rows = athleteRows[name] || [];
    const prof = profiles[name] || {};
    const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
    const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2);
    const acwr = calcACWR(rows);
    const last7 = rows.slice(-7);
    const avgW = last7.map(r=>parseFloat(calcWellness(r))||0).filter(v=>v>0);
    const avgWellness = avgW.length ? (avgW.reduce((a,b)=>a+b,0)/avgW.length).toFixed(1) : "–";
    const totalUA = rows.reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0);
    const prio = hero ? HERO_DATA[hero]?.prio : null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe ${name}</title>
    <style>body{font-family:sans-serif;background:#fff;color:#111;padding:32px;max-width:800px;margin:0 auto}
    h1{font-size:24px;letter-spacing:4px;color:#d4a843;margin-bottom:4px}
    h2{font-size:13px;letter-spacing:3px;color:#888;text-transform:uppercase;margin:20px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px}
    .stat{background:#f8f8f8;padding:12px;border-left:3px solid #d4a843}
    .stat-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px}
    .stat-val{font-size:20px;font-weight:700;color:#111}
    .badge{display:inline-block;padding:3px 10px;border:1px solid;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-right:6px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#f0f0f0;padding:6px 8px;text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase}
    td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
    .prio{padding:10px 14px;border-left:3px solid #d4a843;background:#fffbf0;margin:4px 0;font-size:12px}
    @media print{body{padding:16px}}</style></head><body>
    <h1>ARES LAB</h1>
    <div style="font-size:13px;color:#888;margin-bottom:20px">Informe de atleta — ${name} — ${new Date().toLocaleDateString("es-ES")}</div>
    <div class="grid">
      <div class="stat"><div class="stat-label">Total Registros</div><div class="stat-val">${rows.length}</div></div>
      <div class="stat"><div class="stat-label">UA Total</div><div class="stat-val">${totalUA.toLocaleString()}</div></div>
      <div class="stat"><div class="stat-label">Wellness Med.</div><div class="stat-val">${avgWellness}/5</div></div>
      <div class="stat"><div class="stat-label">ACWR</div><div class="stat-val">${acwr.ratio || "–"}</div></div>
    </div>
    <script>window.onload=()=>{window.print()}</script></body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
  };

  const navItems = [
    { id:"dashboard", label:"Dashboard" },
    { id:"cuadrante", label:"Cuadrante" },
    { id:"competiciones", label:"Competiciones" },
  ];

  // ── DASHBOARD ──
  const DashboardView = () => (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:"12px", marginBottom:"24px" }}>
        <StatBox label="Atletas" value={allAthleteNames.length} color={C.gold} />
        <StatBox label="Registros hoy" value={`${registeredToday.length}/${allAthleteNames.length}`} color={C.green} />
        <StatBox label="Total registros" value={allRows.length} color={C.goldBright} />
        <StatBox label="Última sync" value={lastSync ? lastSync.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "–"} color={C.muted} />
      </div>

      {(() => {
        const sin = allAthleteNames.filter(n => !registeredToday.includes(n));
        const urgComps = [];
        allAthleteNames.forEach(name => {
          (profiles[name]?.competiciones||[]).forEach(c => {
            const d = Math.ceil((new Date(c.date)-new Date())/86400000);
            if (d>=0&&d<=7) urgComps.push({ name, evento:c.evento, d });
          });
        });
        return (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
            {sin.length > 0 && (
              <div style={{ background:C.redDim, border:`1px solid ${C.red}`, padding:"12px 16px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.red, textTransform:"uppercase", marginBottom:"4px" }}>⚠ Sin registro hoy ({sin.length})</div>
                <div style={{ fontSize:"12px", color:C.textDim }}>{sin.slice(0,4).join(", ")}{sin.length>4?` +${sin.length-4}`:""}</div>
              </div>
            )}
            {urgComps.length > 0 && (
              <div style={{ background:C.yellowDim, border:`1px solid ${C.yellow}`, padding:"12px 16px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.yellow, textTransform:"uppercase", marginBottom:"4px" }}>🥊 Competiciones esta semana</div>
                {urgComps.map((c,i)=><div key={i} style={{ fontSize:"12px", color:C.text }}>{c.name} — {c.evento} — {c.d===0?"HOY":`en ${c.d}d`}</div>)}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"10px" }}>
        {allAthleteNames.map(name => {
          const rows = athleteRows[name]||[];
          const last = rows[rows.length-1];
          const prof = profiles[name]||{};
          const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
          const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2);
          const hInfo = HERO_DATA[hero];
          const vInfo = VEHICLE_DATA[vehicle];
          const ua = last ? calcUA(last["Minutos totales entrenados hoy"], last["RPE del día (Esfuerzo)"]) : 0;
          const w = last ? calcWellness(last) : null;
          const sem = semaforo(ua);
          const hasToday = registeredToday.includes(name);
          const acwr = calcACWR(rows);
          const nextComp = (prof.competiciones||[]).filter(c=>new Date(c.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];

          return (
            <div key={name} onClick={()=>{setSelected(name);setMainView("athlete");setAthleteTab("overview");}}
              style={{ background:C.card, border:`1px solid ${hasToday?C.gold+"44":C.border}`, borderLeft:`3px solid ${hInfo?.color||C.gold}`, padding:"14px", cursor:"pointer", position:"relative", transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
              onMouseLeave={e=>e.currentTarget.style.background=C.card}
            >
              {hasToday && <div style={{ position:"absolute", top:"10px", right:"10px", width:"7px", height:"7px", borderRadius:"50%", background:C.green, boxShadow:`0 0 5px ${C.green}` }}/>}
              <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"9px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:(hInfo?.color||C.gold)+"22", border:`2px solid ${hInfo?.color||C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>{hInfo?.icon||"👤"}</div>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:C.text }}>{name}</div>
                  <div style={{ fontSize:"10px", color:C.muted }}>{prof.deporte||"–"} · {prof.fase||"off-camp"}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
                {hero && <Badge label={hero} color={hInfo?.color||C.muted} small />}
                {vehicle && <Badge label={`${vInfo?.icon} ${vehicle}`} color={vInfo?.color||C.muted} small />}
              </div>
              <div style={{ display:"flex", gap:"10px", marginBottom:"6px" }}>
                <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>UA HOY</div><div style={{ fontSize:"16px", fontWeight:"700", color:sem.color }}>{ua||"–"}</div></div>
                {w && <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>WELLNESS</div><div style={{ fontSize:"16px", fontWeight:"700", color:parseFloat(w)>=3.5?C.green:parseFloat(w)>=2.5?C.yellow:C.red }}>{w}</div></div>}
                {acwr.ratio && <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>ACWR</div><div style={{ fontSize:"16px", fontWeight:"700", color:parseFloat(acwr.ratio)>1.3?C.red:parseFloat(acwr.ratio)<0.8?C.yellow:C.green }}>{acwr.ratio}</div></div>}
              </div>
              {nextComp && <div style={{ fontSize:"10px", color:C.gold, marginTop:"4px" }}>🥊 {nextComp.evento} — {Math.ceil((new Date(nextComp.date)-new Date())/86400000)}d</div>}
              <div style={{ marginTop:"6px", fontSize:"10px", color:C.muted }}>{rows.length} registros</div>
            </div>
          );
        })}
      </div>
      {allAthleteNames.length === 0 && !loading && (
        <div style={{ textAlign:"center", padding:"60px", color:C.muted }}>
          <div style={{ fontSize:"28px", marginBottom:"10px" }}>📋</div>
          <div style={{ fontSize:"13px", letterSpacing:"2px" }}>{error || "Conecta el Google Sheet para ver los atletas"}</div>
          <button onClick={fetchData} style={{ marginTop:"16px", padding:"10px 24px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"12px", letterSpacing:"2px", fontFamily:"inherit", fontWeight:"700" }}>REINTENTAR</button>
        </div>
      )}
    </div>
  );

  // ── ATHLETE VIEW ──
  const AthleteView = () => {
    const name = selected;
    const rows = (athleteRows[name]||[]).slice().sort((a,b)=>new Date(a["Marca temporal"])-new Date(b["Marca temporal"]));
    const prof = profiles[name]||{};
    const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
    const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2);
    const hInfo = HERO_DATA[hero];
    const vInfo = VEHICLE_DATA[vehicle];
    const last7 = rows.slice(-7);
    const acwr = calcACWR(rows);
    const totalUA = rows.reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0);
    const wVals = rows.map(r=>parseFloat(calcWellness(r))||0).filter(v=>v>0);
    const avgW = wVals.length ? (wVals.reduce((a,b)=>a+b,0)/wVals.length).toFixed(1) : "–";
    const lastRow = rows[rows.length-1];
    const todayUA = lastRow ? calcUA(lastRow["Minutos totales entrenados hoy"], lastRow["RPE del día (Esfuerzo)"]) : 0;
    const sem = semaforo(todayUA);
    const prio = hero ? HERO_DATA[hero]?.prio : null;

    const tabs = [["overview","RESUMEN"],["carga","CARGA"],["acwr","ACWR"],["tests","TESTS"],["atr","ATR"],["comp","COMPETICIÓN"],["ia","IA 🤖"]];

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px", flexWrap:"wrap" }}>
          <button onClick={()=>setMainView("dashboard")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", cursor:"pointer", fontSize:"11px", fontFamily:"inherit" }}>← VOLVER</button>
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:(hInfo?.color||C.gold)+"22", border:`2px solid ${hInfo?.color||C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>{hInfo?.icon||"👤"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"18px", fontWeight:"700", color:C.text }}>{name}</div>
            <div style={{ display:"flex", gap:"6px", marginTop:"4px" }}>
              {hero && <Badge label={`${hInfo?.icon} ${hero}`} color={hInfo?.color||C.muted} small />}
              {vehicle && <Badge label={`${vInfo?.icon} ${vehicle}`} color={vInfo?.color||C.muted} small />}
              {prof.deporte && <Badge label={prof.deporte} color={C.muted} small />}
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={()=>{setEditingAthlete(name);setShowEditModal(true);}} style={{ padding:"7px 14px", background:"transparent", border:`1px solid ${C.gold}`, color:C.gold, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>✏ PERFIL</button>
            <button onClick={()=>exportPDF(name)} style={{ padding:"7px 14px", background:"transparent", border:`1px solid ${C.cyan}`, color:C.cyan, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>⬇ PDF</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:"4px", marginBottom:"20px", flexWrap:"wrap" }}>
          {tabs.map(([t,l]) => (
            <button key={t} onClick={()=>setAthleteTab(t)} style={{ padding:"7px 14px", background:athleteTab===t?C.gold:"transparent", border:`1px solid ${athleteTab===t?C.gold:C.border}`, color:athleteTab===t?"#000":C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"inherit", fontWeight:athleteTab===t?"700":"400" }}>{l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {athleteTab === "overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
              <StatBox label="Registros" value={rows.length} color={C.gold} />
              <StatBox label="UA Hoy" value={todayUA||"–"} color={sem.color} sub={sem.label} />
              <StatBox label="UA Total" value={totalUA.toLocaleString()} color={C.goldBright} />
              <StatBox label="Wellness med." value={avgW} color={parseFloat(avgW)>=3.5?C.green:parseFloat(avgW)>=2.5?C.yellow:C.red} sub="/ 5.0" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
              {/* Perfil ARES */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Perfil ARES</div>
                {hero ? (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                      <span style={{ fontSize:"28px" }}>{hInfo?.icon}</span>
                      <div>
                        <div style={{ fontSize:"18px", fontWeight:"700", color:hInfo?.color }}>{hero}</div>
                        <div style={{ fontSize:"12px", color:C.muted }}>{hInfo?.desc}</div>
                      </div>
                    </div>
                    {prio && (
                      <div>
                        {[["Dominante",prio.dom,C.gold],["Mantenimiento",prio.mant,C.text],["Soporte",prio.sop,C.muted]].map(([l,v,c])=>(
                          <div key={l} style={{ borderLeft:`3px solid ${c}`, padding:"8px 14px", marginBottom:"4px", background:C.surface }}>
                            <span style={{ fontSize:"10px", color:C.muted, letterSpacing:"2px" }}>{l}: </span>
                            <span style={{ fontSize:"12px", color:c }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : <div style={{ color:C.muted, fontSize:"12px" }}>Añade CMJ y FR para clasificar el perfil neuromuscular.</div>}
              </div>
              {/* Perfil Energético */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Perfil Energético</div>
                {vehicle ? (
                  <WingateCard w1={prof.w1} w2={prof.w2} />
                ) : <div style={{ color:C.muted, fontSize:"12px" }}>Añade W1 y W2 del Doble Wingate para ver el perfil energético.</div>}
              </div>
            </div>
            {/* Wellness grid 7d */}
            {last7.length > 0 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Wellness & Carga — Últimos 7 días</div>
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(last7.length,7)},1fr)`, gap:"8px" }}>
                  {last7.map((r,i) => {
                    const ua = calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
                    const w = parseFloat(calcWellness(r))||0;
                    const s = semaforo(ua);
                    return (
                      <div key={i} style={{ background:C.surface, padding:"10px 8px", textAlign:"center", borderTop:`2px solid ${s.color}` }}>
                        <div style={{ fontSize:"9px", color:C.muted, marginBottom:"5px" }}>{fmtDate(r["Marca temporal"])}</div>
                        <div style={{ fontSize:"15px", fontWeight:"700", color:s.color }}>{ua}</div>
                        <div style={{ fontSize:"9px", color:C.muted }}>UA</div>
                        {w>0 && <>
                          <div style={{ height:"1px", background:C.border, margin:"5px 0" }}/>
                          <div style={{ fontSize:"13px", fontWeight:"700", color:w>=3.5?C.green:w>=2.5?C.yellow:C.red }}>{w.toFixed(1)}</div>
                          <div style={{ fontSize:"9px", color:C.muted }}>W</div>
                        </>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CARGA ── */}
        {athleteTab === "carga" && (
          <div>
            {/* Weekly summary cards */}
            {(() => {
              const weeks = {};
              rows.forEach(r => {
                const k = getWeekKey(r["Marca temporal"]);
                if (!k) return;
                if (!weeks[k]) weeks[k] = { ua: 0, sessions: 0, wellnessSum: 0, wellnessCount: 0, days: [] };
                const ua = calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
                const w = parseFloat(calcWellness(r))||0;
                weeks[k].ua += ua;
                weeks[k].sessions++;
                if (w>0) { weeks[k].wellnessSum += w; weeks[k].wellnessCount++; }
                weeks[k].days.push({ date: r["Marca temporal"], ua, wellness: w, tipo: (r["Tipo de día de entrenamiento"]||"").split("/")[0] });
              });
              const entries = Object.entries(weeks).slice(-8);
              const maxUA = Math.max(...entries.map(([,v])=>v.ua), 1);
              return (
                <>
                  <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"16px", textTransform:"uppercase" }}>Carga Semanal</div>
                  <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
                    {entries.reverse().map(([week, data]) => {
                      const avgW = data.wellnessCount > 0 ? (data.wellnessSum/data.wellnessCount).toFixed(1) : "–";
                      const avgUA = Math.round(data.ua / (data.sessions||1));
                      const s = semaforo(avgUA);
                      const barWidth = (data.ua/maxUA)*100;
                      return (
                        <div key={week} style={{ background:C.card, border:`1px solid ${C.border}`, padding:"16px", borderLeft:`3px solid ${s.color}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                            <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>
                              {week.split("-W")[1] ? `Semana ${week.split("-W")[1]}` : week}
                            </div>
                            <Badge label={s.label} color={s.color} small />
                          </div>
                          <div style={{ display:"flex", gap:"16px", marginBottom:"10px" }}>
                            <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>UA TOTAL</div><div style={{ fontSize:"20px", fontWeight:"700", color:s.color }}>{data.ua}</div></div>
                            <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>SESIONES</div><div style={{ fontSize:"20px", fontWeight:"700", color:C.text }}>{data.sessions}</div></div>
                            <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>UA/DÍA</div><div style={{ fontSize:"20px", fontWeight:"700", color:C.textDim }}>{avgUA}</div></div>
                            <div><div style={{ fontSize:"9px", color:C.muted, letterSpacing:"1px" }}>WELLNESS</div><div style={{ fontSize:"20px", fontWeight:"700", color:parseFloat(avgW)>=3.5?C.green:parseFloat(avgW)>=2.5?C.yellow:C.red }}>{avgW}</div></div>
                          </div>
                          {/* Mini bar */}
                          <div style={{ background:C.surface, height:"6px", borderRadius:"3px", overflow:"hidden" }}>
                            <div style={{ width:`${barWidth}%`, height:"100%", background:s.color, borderRadius:"3px", transition:"width 0.4s" }}/>
                          </div>
                          {/* Mini daily dots */}
                          <div style={{ display:"flex", gap:"4px", marginTop:"8px" }}>
                            {data.days.map((d,i) => {
                              const ds = semaforo(d.ua);
                              return <div key={i} title={`${fmtDate(d.date)} - ${d.ua}UA`} style={{ width:"12px", height:"12px", borderRadius:"2px", background:ds.color+"66", border:`1px solid ${ds.color}` }}/>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Daily table */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Historial Diario</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {["Fecha","Tipo","Min","RPE","UA","Sueño","Fatiga","Estrés","Dolor","Ánimo","Wellness","Notas"].map(h=>(
                        <th key={h} style={{ padding:"7px 9px", textAlign:"left", color:C.muted, fontSize:"10px", letterSpacing:"1px", textTransform:"uppercase", fontWeight:"600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice().reverse().map((r,i) => {
                      const ua = calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
                      const w = calcWellness(r);
                      const s = semaforo(ua);
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.border}20`, background:i%2===0?C.surface+"50":"transparent" }}>
                          <td style={{ padding:"7px 9px", color:C.textDim }}>{fmtDate(r["Marca temporal"])}</td>
                          <td style={{ padding:"7px 9px", color:C.text }}>{(r["Tipo de día de entrenamiento"]||"–").split("/")[0]}</td>
                          <td style={{ padding:"7px 9px", color:C.text }}>{r["Minutos totales entrenados hoy"]||"–"}</td>
                          <td style={{ padding:"7px 9px", color:C.text }}>{r["RPE del día (Esfuerzo)"]||"–"}</td>
                          <td style={{ padding:"7px 9px", color:s.color, fontWeight:"700" }}>{ua||"–"}</td>
                          {["Sueño","Fatiga","Estrés","Dolor muscular","Estado de ánimo"].map(f=>(
                            <td key={f} style={{ padding:"7px 9px", color:C.text }}>{r[f]||"–"}</td>
                          ))}
                          <td style={{ padding:"7px 9px", color:parseFloat(w)>=3.5?C.green:parseFloat(w)>=2.5?C.yellow:C.red, fontWeight:"600" }}>{w||"–"}</td>
                          <td style={{ padding:"7px 9px", color:C.muted, maxWidth:"120px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r["Notas / molestias (opcional)"]||""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ACWR ── */}
        {athleteTab === "acwr" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
              <StatBox label="Carga Aguda (7d)" value={acwr.acute} color={C.cyan} sub="UA / día" />
              <StatBox label="Carga Crónica (28d)" value={acwr.chronic} color={C.gold} sub="UA / día" />
              <StatBox label="ACWR" value={acwr.ratio||"–"} color={acwr.ratio ? (parseFloat(acwr.ratio)>1.3?C.red:parseFloat(acwr.ratio)<0.8?C.yellow:C.green) : C.muted} sub={acwr.ratio ? (parseFloat(acwr.ratio)>1.3?"⚠ Alto":parseFloat(acwr.ratio)<0.8?"↓ Bajo":"✓ Óptimo") : "Min. 7 días"} />
              <StatBox label="UA Semana actual" value={rows.filter(r=>{try{const d=new Date(r["Marca temporal"]);const now=new Date();return d>=new Date(now-7*86400000);}catch{return false;}}).reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0)} color={C.text} />
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"8px", textTransform:"uppercase" }}>Interpretación ACWR</div>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:"10px" }}>
                {[["< 0.8", "Carga baja", "Puede aumentarse con seguridad", C.yellow],["0.8 – 1.3","Zona óptima","Riesgo de lesión bajo. Mantener.",C.green],["> 1.3","Zona de riesgo","Reducir carga aguda. Riesgo elevado.",C.red]].map(([r,l,d,c])=>(
                  <div key={r} style={{ padding:"12px", background:C.surface, borderLeft:`3px solid ${c}` }}>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:c }}>{r}</div>
                    <div style={{ fontSize:"12px", color:C.text, margin:"4px 0" }}>{l}</div>
                    <div style={{ fontSize:"11px", color:C.muted }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Gráfica UA semanal */}
            {(() => {
              const weeks = {};
              rows.forEach(r => {
                const k = getWeekKey(r["Marca temporal"]);
                if (!k) return;
                if (!weeks[k]) weeks[k] = 0;
                weeks[k] += calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
              });
              const entries = Object.entries(weeks).slice(-10);
              const maxUA = Math.max(...entries.map(([,v])=>v), 1);
              return (
                <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                  <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"16px", textTransform:"uppercase" }}>Carga Semanal (UA total)</div>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", height:"120px" }}>
                    {entries.map(([week, ua]) => {
                      const h = (ua/maxUA)*100;
                      const s = semaforo(ua/7);
                      return (
                        <div key={week} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                          <div style={{ fontSize:"10px", color:s.color }}>{ua}</div>
                          <div style={{ width:"100%", height:`${h}%`, background:s.color+"66", border:`1px solid ${s.color}`, minHeight:"4px", transition:"height 0.4s" }}/>
                          <div style={{ fontSize:"9px", color:C.muted, textAlign:"center", transform:"rotate(-30deg)", transformOrigin:"center", marginTop:"4px" }}>{week.split("-W")[1] ? `W${week.split("-W")[1]}` : week}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── TESTS ── */}
        {athleteTab === "tests" && (
          <TestsTab name={name} prof={prof} onSave={(data)=>updateProfile(name, data)} isMobile={isMobile} />
        )}

        {/* ── ATR ── */}
        {athleteTab === "atr" && (
          <ATRTab name={name} prof={prof} isMobile={isMobile} />
        )}

        {/* ── COMP ── */}
        {athleteTab === "comp" && (
          <CompTab name={name} prof={prof} onSave={(data)=>updateProfile(name, data)} isMobile={isMobile} />
        )}

        {/* ── IA ── */}
        {athleteTab === "ia" && (
          <GeneradorIA name={name} prof={prof} />
        )}
      </div>
    );
  };

  // ── TESTS TAB ──
  const TestsTab = ({ name, prof, onSave, isMobile }) => {
    const [nt, setNt] = useState({ date:"", cmj:"", sj:"", rsi:"", peso:"", w1:"", w2:"",
      pesoMuertoKg:"", pesoMuertoReps:"", pressBancaKg:"", pressBancaReps:"",
      dominadaLastradaKg:"", dominadaLastradaReps:"", sentadillaBulgaraKg:"", sentadillaBulgaraReps:"",
      colgarseSegs:"", notas:"" });
    const tests = prof.tests || [];

    // Auto-calculate 1RM and FR
    const pm1RM = calc1RM(nt.pesoMuertoKg, nt.pesoMuertoReps);
    const pb1RM = calc1RM(nt.pressBancaKg, nt.pressBancaReps);
    const dl1RM = calc1RM(nt.dominadaLastradaKg, nt.dominadaLastradaReps);
    const sb1RM = calc1RM(nt.sentadillaBulgaraKg, nt.sentadillaBulgaraReps);
    // FR = best lower body 1RM / bodyweight (use peso muerto or sent. búlgara)
    const best1RM = Math.max(pm1RM||0, sb1RM||0);
    const autoFR = calcFR(best1RM, nt.peso);

    const addTest = () => {
      if (!nt.date) return;
      const fr = autoFR || nt.fr;
      const hero = clasificarHero(fr, nt.cmj);
      const vehicle = clasificarVehicle(nt.w1, nt.w2);
      const wingateStats = calcWingateStats(nt.w1, nt.w2);
      const fi = wingateStats ? wingateStats.fi : "";
      const testData = {
        ...nt, fi, hero, vehicle, fr,
        pm1RM, pb1RM, dl1RM, sb1RM,
      };
      onSave({
        tests:[...tests, testData],
        hero, vehicle, fr, cmj:nt.cmj, rsi:nt.rsi, peso:nt.peso,
        w1:nt.w1, w2:nt.w2, fi,
        pesoMuerto:pm1RM, pressBanca:pb1RM,
        dominadaLastrada:dl1RM, sentadillaBulgara:sb1RM,
        colgarse:nt.colgarseSegs,
      });
      // Save test to DB
      try {
        // Ensure profile exists first
        await supabase.from("athlete_profiles").upsert({ name }, { onConflict: "name" });
        await supabase.from("athlete_tests").insert({
          athlete_name: name, test_date: nt.date,
          cmj: nt.cmj||null, sj: nt.sj||null, rsi: nt.rsi||null, peso: nt.peso||null,
          fr: fr||null, w1: nt.w1||null, w2: nt.w2||null, fi: fi||null,
          hero, vehicle,
          peso_muerto_kg: nt.pesoMuertoKg||null, peso_muerto_reps: nt.pesoMuertoReps||null, peso_muerto_1rm: pm1RM||null,
          press_banca_kg: nt.pressBancaKg||null, press_banca_reps: nt.pressBancaReps||null, press_banca_1rm: pb1RM||null,
          dominada_lastrada_kg: nt.dominadaLastradaKg||null, dominada_lastrada_reps: nt.dominadaLastradaReps||null, dominada_lastrada_1rm: dl1RM||null,
          sentadilla_bulgara_kg: nt.sentadillaBulgaraKg||null, sentadilla_bulgara_reps: nt.sentadillaBulgaraReps||null, sentadilla_bulgara_1rm: sb1RM||null,
          colgarse_segs: nt.colgarseSegs||null, notas: nt.notas||null,
        });
      } catch (e) { console.error("Error saving test:", e); }
      setNt({ date:"", cmj:"", sj:"", rsi:"", peso:"", w1:"", w2:"",
        pesoMuertoKg:"", pesoMuertoReps:"", pressBancaKg:"", pressBancaReps:"",
        dominadaLastradaKg:"", dominadaLastradaReps:"", sentadillaBulgaraKg:"", sentadillaBulgaraReps:"",
        colgarseSegs:"", notas:"" });
    };

    const renderField = (k, l, t="number") => (
      <div key={k}>
        <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
        <input type={t} value={nt[k]} onChange={e=>setNt(p=>({...p,[k]:e.target.value}))} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
      </div>
    );

    return (
      <div>
        {/* New Test Form */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Nuevo Test</div>

          <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", marginBottom:"8px" }}>Datos Básicos</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:"10px", marginBottom:"16px" }}>
            {renderField("date","Fecha","date")}
            {renderField("peso","Peso Corporal (kg)")}
            {renderField("cmj","CMJ (cm)")}
            {renderField("sj","SJ (cm)")}
            {renderField("rsi","RSI")}
          </div>

          <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", marginBottom:"8px" }}>Doble Wingate</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:"10px", marginBottom:"16px" }}>
            {renderField("w1","Sprint 1 (W/kg)")}
            {renderField("w2","Sprint 2 (W/kg)")}
          </div>

          <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", marginBottom:"8px" }}>Fuerza — Kg × Reps → 1RM Auto</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)", gap:"10px", marginBottom:"8px" }}>
            {renderField("pesoMuertoKg","P. Muerto (kg)")}
            {renderField("pesoMuertoReps","P. Muerto (reps)")}
            {renderField("pressBancaKg","Banca (kg)")}
            {renderField("pressBancaReps","Banca (reps)")}
            {renderField("dominadaLastradaKg","Dom. Lastr. (kg)")}
            {renderField("dominadaLastradaReps","Dom. Lastr. (reps)")}
            {renderField("sentadillaBulgaraKg","S. Búlg. (kg×2)")}
            {renderField("sentadillaBulgaraReps","S. Búlg. (reps)")}
            {renderField("colgarseSegs","Colgarse Barra (seg)")}
          </div>

          {/* Auto 1RM display */}
          {(pm1RM || pb1RM || dl1RM || sb1RM) && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"12px 16px", marginBottom:"12px" }}>
              <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.gold, marginBottom:"8px" }}>1RM ESTIMADO (BRZYCKI)</div>
              <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", fontSize:"13px" }}>
                {pm1RM && <span style={{color:C.text}}>P.Muerto: <strong style={{color:C.gold}}>{pm1RM}kg</strong></span>}
                {pb1RM && <span style={{color:C.text}}>Banca: <strong style={{color:C.gold}}>{pb1RM}kg</strong></span>}
                {dl1RM && <span style={{color:C.text}}>Dom.Last: <strong style={{color:C.gold}}>{dl1RM}kg</strong></span>}
                {sb1RM && <span style={{color:C.text}}>S.Búlg: <strong style={{color:C.gold}}>{sb1RM}kg</strong></span>}
              </div>
              {autoFR && (
                <div style={{ marginTop:"8px", fontSize:"13px", color:C.text }}>
                  Fuerza Relativa Auto: <strong style={{color:C.gold}}>{autoFR} × BW</strong>
                  <span style={{ fontSize:"11px", color:C.muted, marginLeft:"8px" }}>(mejor 1RM tren inf. / peso corporal)</span>
                </div>
              )}
            </div>
          )}

          {/* Live preview */}
          {(() => {
            const fr = autoFR;
            const h = clasificarHero(fr, nt.cmj);
            const v = clasificarVehicle(nt.w1, nt.w2);
            const ws = calcWingateStats(nt.w1, nt.w2);
            return (h||v) ? (
              <div style={{ padding:"12px", background:C.surface, border:`1px solid ${C.border}`, display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center", marginBottom:"12px" }}>
                <span style={{ fontSize:"10px", letterSpacing:"2px", color:C.muted }}>PREVIEW:</span>
                {h && <Badge label={`${HERO_DATA[h]?.icon} ${h}`} color={HERO_DATA[h]?.color||C.muted} small />}
                {v && <Badge label={`${VEHICLE_DATA[v]?.icon} ${v}`} color={VEHICLE_DATA[v]?.color||C.muted} small />}
                {ws && <span style={{ fontSize:"11px", color:C.textDim }}>Ratio: {ws.ratioPercent}% · FI: {ws.fi}%</span>}
                {nt.rsi && <span style={{ fontSize:"11px", color:C.cyan }}>RSI: {nt.rsi}</span>}
              </div>
            ) : null;
          })()}

          <div style={{ marginBottom:"12px" }}>
            <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>Notas</label>
            <input type="text" value={nt.notas} onChange={e=>setNt(p=>({...p,notas:e.target.value}))} placeholder="Observaciones..." style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
          </div>

          <button onClick={addTest} style={{ padding:"9px 22px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit", fontWeight:"700" }}>+ GUARDAR TEST</button>
        </div>

        {/* Wingate result if data exists */}
        {prof.w1 && prof.w2 && (
          <div style={{ marginBottom:"16px" }}>
            <WingateCard w1={prof.w1} w2={prof.w2} />
          </div>
        )}

        {/* Test history */}
        {tests.length > 0 && (
          <>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Historial de Tests</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px" }}>
                  <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {["Fecha","CMJ","SJ","RSI","FR","S1","S2","FI%","PM 1RM","PB 1RM","DL 1RM","SB 1RM","Barra(s)","Perfil","Vehículo"].map(h=>
                      <th key={h} style={{ padding:"6px 7px", textAlign:"left", color:C.muted, fontSize:"9px", letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {tests.map((t,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}20` }}>
                        <td style={{ padding:"6px 7px", color:C.textDim }}>{t.date}</td>
                        {["cmj","sj","rsi","fr","w1","w2","fi"].map(k=>
                          <td key={k} style={{ padding:"6px 7px", color:C.text }}>{t[k]||"–"}</td>
                        )}
                        <td style={{ padding:"6px 7px", color:C.text }}>{t.pm1RM||t.pesoMuerto||"–"}</td>
                        <td style={{ padding:"6px 7px", color:C.text }}>{t.pb1RM||t.pressBanca||"–"}</td>
                        <td style={{ padding:"6px 7px", color:C.text }}>{t.dl1RM||t.dominadaLastrada||"–"}</td>
                        <td style={{ padding:"6px 7px", color:C.text }}>{t.sb1RM||t.sentadillaBulgara||"–"}</td>
                        <td style={{ padding:"6px 7px", color:C.text }}>{t.colgarseSegs||t.colgarse||"–"}</td>
                        <td style={{ padding:"6px 7px" }}>{t.hero?<Badge label={t.hero} color={HERO_DATA[t.hero]?.color||C.muted} small />:"–"}</td>
                        <td style={{ padding:"6px 7px" }}>{t.vehicle?<Badge label={`${VEHICLE_DATA[t.vehicle]?.icon} ${t.vehicle}`} color={VEHICLE_DATA[t.vehicle]?.color||C.muted} small />:"–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evolution sparklines */}
            {tests.length > 1 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Evolución</div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr", gap:"12px" }}>
                  {[["CMJ","cmj",C.gold],["SJ","sj",C.goldBright],["RSI","rsi",C.cyan],["F.Rel","fr",C.red],["PM 1RM","pm1RM",C.green],["PB 1RM","pb1RM",C.yellow],["DL 1RM","dl1RM",C.cyan],["SB 1RM","sb1RM",C.gold]].map(([label,key,color])=>{
                    const vals = tests.map(t=>parseFloat(t[key])).filter(v=>!isNaN(v));
                    if (vals.length < 2) return null;
                    const delta = vals[vals.length-1] - vals[0];
                    return (
                      <div key={key} style={{ background:C.surface, padding:"12px" }}>
                        <div style={{ fontSize:"10px", color:C.muted, marginBottom:"4px" }}>{label}</div>
                        <div style={{ display:"flex", alignItems:"baseline", gap:"6px", marginBottom:"6px" }}>
                          <div style={{ fontSize:"18px", fontWeight:"700", color }}>{vals[vals.length-1]}</div>
                          <div style={{ fontSize:"11px", color:delta>=0?C.green:C.red }}>{delta>=0?"+":""}{delta.toFixed(1)}</div>
                        </div>
                        <Sparkline data={vals} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── ATR TAB ──
  const ATRTab = ({ name, prof, isMobile }) => {
    const [selectedPhase, setSelectedPhase] = useState(prof.fase && ATR_DATA[prof.fase] ? prof.fase : "Acumulación");
    const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
    const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2);
    const phase = ATR_DATA[selectedPhase];

    const getProfileTip = () => {
      if (!hero && !vehicle) return "Completa los tests para recibir recomendaciones personalizadas.";
      const tips = [];
      if (hero === "Hulk") tips.push("Priorizar Fast Force y velocidad. El atleta ya tiene fuerza.");
      if (hero === "Flash") tips.push("Priorizar High Force. Necesita más techo de producción de fuerza.");
      if (hero === "Viuda Negra") tips.push("Construir base: Slow Force + High Force antes de trabajar velocidad.");
      if (hero === "Superman") tips.push("Mantenimiento integrado. Equilibrar estímulos.");
      if (vehicle === "Lancha") tips.push("Mejorar repeatability y conditioning. No solo potencia.");
      if (vehicle === "Barco") tips.push("Mejorar potencia de salida. Trabajo explosivo prioritario.");
      if (vehicle === "Moto") tips.push("Trabajo global: potencia + conditioning desde la base.");
      if (vehicle === "Velero") tips.push("Perfil energético ideal. Mantener y potenciar.");
      return tips.join(" ");
    };

    return (
      <div>
        {/* Phase selector */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
          {Object.entries(ATR_DATA).map(([key, data]) => (
            <button key={key} onClick={()=>setSelectedPhase(key)} style={{
              padding:"10px 20px", cursor:"pointer", fontSize:"12px", letterSpacing:"2px",
              fontFamily:"inherit", fontWeight: selectedPhase===key?"700":"400",
              background: selectedPhase===key ? data.color+"22" : "transparent",
              border: `2px solid ${selectedPhase===key ? data.color : C.border}`,
              color: selectedPhase===key ? data.color : C.muted,
              transition:"all 0.2s",
            }}>
              {data.icon} {key.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Phase header */}
        <div style={{ background:C.card, border:`1px solid ${phase.color}44`, borderLeft:`4px solid ${phase.color}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
            <div style={{ fontSize:"32px" }}>{phase.icon}</div>
            <div>
              <div style={{ fontSize:"20px", fontWeight:"700", color:phase.color }}>{selectedPhase}</div>
              <div style={{ fontSize:"13px", color:C.textDim }}>{phase.tagline}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"10px" }}>
            {phase.dominante.map(d => <Badge key={d} label={d} color={phase.color} small />)}
          </div>
          <div style={{ fontSize:"12px", color:C.text, padding:"10px 14px", background:C.surface, borderLeft:`3px solid ${phase.color}` }}>
            <strong>Objetivo:</strong> {phase.objetivo}
          </div>
        </div>

        {/* Profile-specific recommendation */}
        {(hero || vehicle) && (
          <div style={{ background:C.card, border:`1px solid ${C.gold}44`, padding:"16px", marginBottom:"16px" }}>
            <div style={{ fontSize:"10px", letterSpacing:"3px", color:C.gold, marginBottom:"8px", textTransform:"uppercase" }}>Recomendación según perfil</div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"10px", flexWrap:"wrap" }}>
              {hero && <Badge label={`${HERO_DATA[hero]?.icon} ${hero}`} color={HERO_DATA[hero]?.color} small />}
              {vehicle && <Badge label={`${VEHICLE_DATA[vehicle]?.icon} ${vehicle}`} color={VEHICLE_DATA[vehicle]?.color} small />}
            </div>
            <div style={{ fontSize:"12px", color:C.textDim, lineHeight:"1.6" }}>{getProfileTip()}</div>
            <div style={{ marginTop:"10px", fontSize:"11px", color:C.gold, fontStyle:"italic" }}>
              "El bloque determina qué entrenas. El perfil determina cómo lo entrenas."
            </div>
          </div>
        )}

        {/* Exercise blocks */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:"12px" }}>
          {Object.entries(phase.bloques).map(([bloqueKey, bloque]) => (
            <div key={bloqueKey} style={{ background:C.card, border:`1px solid ${C.border}`, padding:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:phase.color, marginBottom:"6px", textTransform:"uppercase" }}>{bloqueKey}</div>
              <div style={{ fontSize:"11px", color:C.muted, marginBottom:"10px" }}>{bloque.desc}</div>
              {bloque.ejercicios.map((ej, i) => (
                <div key={i} style={{ fontSize:"12px", color:C.text, padding:"4px 0 4px 12px", borderLeft:`2px solid ${phase.color}33`, marginBottom:"2px" }}>
                  › {ej}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── COMP TAB ──
  const CompTab = ({ name, prof, onSave, isMobile }) => {
    const [nc, setNc] = useState({ date:"", evento:"", categoria:"", resultado:"", notas:"" });
    const comps = prof.competiciones || [];
    const addComp = async () => {
      if (!nc.date||!nc.evento) return;
      onSave({ competiciones:[...comps,nc] });
      try {
        await supabase.from("athlete_profiles").upsert({ name }, { onConflict: "name" });
        await supabase.from("athlete_competitions").insert({
          athlete_name: name, evento: nc.evento, fecha: nc.date,
          rival: nc.categoria||null, resultado: nc.resultado||null, notas: nc.notas||null,
        });
      } catch (e) { console.error("Error saving competition:", e); }
      setNc({ date:"", evento:"", categoria:"", resultado:"", notas:"" });
    };
    const today = new Date();
    const upcoming = comps.filter(c=>new Date(c.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const past = comps.filter(c=>new Date(c.date)<today).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const dU = (ds) => { const d=Math.ceil((new Date(ds)-today)/86400000); if(d===0) return "¡HOY!"; if(d===1) return "Mañana"; return `En ${d} días`; };
    return (
      <div>
        {upcoming.map((c,i)=>{
          const d=Math.ceil((new Date(c.date)-today)/86400000); const urg=d<=14;
          return (
            <div key={i} style={{ background:urg?C.redDim:C.card, border:`1px solid ${urg?C.red:C.border}`, padding:"14px 16px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"14px" }}>
              <div style={{ fontSize:"22px" }}>🥊</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"14px", fontWeight:"600", color:C.text }}>{c.evento}</div>
                <div style={{ fontSize:"11px", color:C.muted }}>{c.categoria} · {c.date}</div>
                {c.notas && <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>{c.notas}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:urg?C.red:C.gold }}>{dU(c.date)}</div>
                {urg && <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>{d<=7?"PEAKING":"CAMP"}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Añadir Competición</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:"10px" }}>
            {[["date","Fecha","date"],["evento","Evento","text"],["categoria","Categoría","text"],["resultado","Resultado","text"],["notas","Notas","text"]].map(([k,l,t])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type={t} value={nc[k]} onChange={e=>setNc(p=>({...p,[k]:e.target.value}))} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          <button onClick={addComp} style={{ marginTop:"14px", padding:"9px 22px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit", fontWeight:"700" }}>+ AÑADIR</button>
        </div>
        {past.length > 0 && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
            <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"12px", textTransform:"uppercase" }}>Historial</div>
            {past.map((c,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:c.resultado?.toLowerCase().includes("vic")||c.resultado?.toLowerCase().includes("win")?C.green:C.muted }}/>
                <div style={{ flex:1, fontSize:"12px", color:C.text }}>{c.evento}</div>
                <div style={{ fontSize:"11px", color:C.muted }}>{c.categoria}</div>
                <div style={{ fontSize:"11px", color:C.textDim }}>{fmtDate(c.date)}</div>
                {c.resultado && <div style={{ fontSize:"11px", color:C.muted }}>{c.resultado}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── EDIT MODAL ──
  const EditModal = () => {
    const name = editingAthlete;
    const [form, setForm] = useState({ deporte:"MMA", fase:"off-camp", ...(profiles[name]||{}) });
    const setF = (k,v) => setForm(p=>({...p,[k]:v}));
    const save = async () => {
      const hero = clasificarHero(form.fr, form.cmj);
      const vehicle = clasificarVehicle(form.w1, form.w2);
      const ws = calcWingateStats(form.w1, form.w2);
      const updatedProfile = {...form, hero, vehicle, fi: ws?.fi||form.fi};
      setProfiles(prev=>({...prev,[name]:{...prev[name], ...updatedProfile}}));
      setShowEditModal(false);
      try {
        await supabase.from("athlete_profiles").upsert({
          name,
          deporte: form.deporte, fase: form.fase, peso: form.peso,
          cmj: form.cmj, sj: form.sj, rsi: form.rsi, fr: form.fr,
          w1: form.w1, w2: form.w2, fi: ws?.fi||form.fi,
          hero, vehicle,
          peso_muerto: form.pesoMuerto, press_banca: form.pressBanca,
          dominada_lastrada: form.dominadaLastrada, sentadilla_bulgara: form.sentadillaBulgara,
          colgarse: form.colgarse,
        }, { onConflict: "name" });
      } catch (e) { console.error("Error saving profile:", e); }
    };
    return (
      <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:C.card, border:`1px solid ${C.gold}44`, width:isMobile?"95vw":"600px", maxHeight:"85vh", overflowY:"auto", padding:"28px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ fontSize:"13px", letterSpacing:"3px", color:C.gold, textTransform:"uppercase" }}>Perfil — {name}</div>
            <button onClick={()=>setShowEditModal(false)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"20px" }}>×</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            {[["deporte","Deporte",["MMA","Boxeo","Muay Thai","BJJ","Lucha","K1","Kickboxing"]],["fase","Fase ATR",["Acumulación","Transformación","Realización","off-camp","camp corto","2 semanas para pelear"]]].map(([k,l,opts])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <select value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", outline:"none" }}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", margin:"14px 0 8px" }}>Test Neuromuscular</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
            {[["fr","Fuerza Rel. (xBW)"],["cmj","CMJ (cm)"],["sj","SJ (cm)"],["rsi","RSI"]].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type="number" value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", margin:"14px 0 8px" }}>Doble Wingate (W/kg)</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
            {[["w1","Sprint 1 (W/kg)"],["w2","Sprint 2 (W/kg)"]].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type="number" value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          {form.w1 && form.w2 && (() => {
            const ws = calcWingateStats(form.w1, form.w2);
            if (!ws) return null;
            return (
              <div style={{ padding:"10px", background:C.surface, marginBottom:"14px", fontSize:"12px", color:C.textDim }}>
                Ratio: <strong style={{color:C.text}}>{ws.ratioPercent}%</strong> · FI: <strong style={{color:C.text}}>{ws.fi}%</strong>
              </div>
            );
          })()}
          <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.gold, textTransform:"uppercase", margin:"14px 0 8px" }}>Tests de Fuerza</div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
            {[["pesoMuerto","Peso Muerto (kg)"],["pressBanca","Press Banca (kg)"],["dominadaLastrada","Dominada Lastrada (kg)"],["sentadillaBulgara","Sent. Búlgara (kg×2)"],["colgarse","Colgarse Barra (seg)"]].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type="number" value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          {(form.fr||form.cmj||form.w1) && (() => {
            const h=clasificarHero(form.fr,form.cmj); const v=clasificarVehicle(form.w1,form.w2);
            return (h||v) ? (
              <div style={{ padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"11px", color:C.muted, letterSpacing:"2px" }}>CLASIF.:</span>
                {h && <Badge label={`${HERO_DATA[h]?.icon} ${h}`} color={HERO_DATA[h]?.color||C.muted} small />}
                {v && <Badge label={`${VEHICLE_DATA[v]?.icon} ${v}`} color={VEHICLE_DATA[v]?.color||C.muted} small />}
              </div>
            ) : null;
          })()}
          <button onClick={save} style={{ width:"100%", padding:"11px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"12px", letterSpacing:"3px", fontFamily:"inherit", textTransform:"uppercase", fontWeight:"700" }}>GUARDAR PERFIL</button>
        </div>
      </div>
    );
  };

  // ── RENDER ──
  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", background:C.bg, color:C.text, minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.gold}33`, padding:isMobile?"8px 12px":"0 28px", display:"flex", alignItems:isMobile?"flex-start":"center", justifyContent:"space-between", minHeight:"54px", flexWrap:"wrap", gap:"6px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <button onClick={()=>setMainView("dashboard")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}>
            <img src={aresLogo} alt="Ares Fighters" style={{ height:"36px", borderRadius:"4px" }} />
            <div>
              <span style={{ fontSize:"15px", fontWeight:"700", letterSpacing:"4px", color:C.gold }}>ARES</span>
              <span style={{ fontSize:"10px", letterSpacing:"2px", color:C.muted, marginLeft:"4px" }}>LAB</span>
            </div>
          </button>
          <span style={{ color:C.border, margin:"0 4px" }}>|</span>
          {mainView !== "athlete" && navItems.map(({id,label}) => (
            <button key={id} onClick={()=>setMainView(id)} style={{ padding:"5px 12px", background:mainView===id?C.gold+"22":"transparent", border:`1px solid ${mainView===id?C.gold:C.border}`, color:mainView===id?C.gold:C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit", textTransform:"uppercase" }}>{label}</button>
          ))}
          {mainView === "athlete" && selected && (
            <span style={{ fontSize:"13px", color:C.gold, marginLeft:"4px" }}>› {selected}</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {lastSync && <span style={{ fontSize:"11px", color:C.muted }}>{lastSync.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</span>}
          {loading && <span style={{ fontSize:"13px", color:C.gold, animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span>}
          <button onClick={fetchData} disabled={loading} style={{ padding:"5px 14px", background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>↻ SYNC</button>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdrnCRWIyhCq3YNZJHea4X7hjuWwat_k8X1eoRmJWhAeiZdUg/viewform" target="_blank" rel="noreferrer" style={{ padding:"5px 14px", background:C.gold, color:"#000", fontSize:"11px", letterSpacing:"2px", textDecoration:"none", fontWeight:"700" }}>+ FORM</a>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ padding:isMobile?"12px":"28px", maxWidth:"1400px", margin:"0 auto" }}>
        {loading && allRows.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px", color:C.muted }}>
            <div style={{ fontSize:"30px", marginBottom:"12px", animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</div>
            <div style={{ letterSpacing:"3px", fontSize:"12px" }}>CONECTANDO CON GOOGLE SHEETS...</div>
          </div>
        ) : error && allRows.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px" }}>
            <div style={{ fontSize:"30px", marginBottom:"10px" }}>⚠</div>
            <div style={{ color:C.red, letterSpacing:"2px", fontSize:"13px", marginBottom:"12px" }}>{error}</div>
            <div style={{ color:C.muted, fontSize:"12px", marginBottom:"20px" }}>Compartir → Cualquier persona con el enlace → Lector</div>
            <button onClick={fetchData} style={{ padding:"10px 28px", background:C.gold, border:"none", color:"#000", cursor:"pointer", fontSize:"12px", letterSpacing:"2px", fontFamily:"inherit", fontWeight:"700" }}>REINTENTAR</button>
          </div>
        ) : (
          <>
            {mainView === "dashboard" && <DashboardView />}
            {mainView === "cuadrante" && <Cuadrante athletes={allAthleteNames} profiles={profiles} />}
            {mainView === "competiciones" && <CompeticionesGlobal allAthleteNames={allAthleteNames} profiles={profiles} onSelectAthlete={(name)=>{setSelected(name);setMainView("athlete");setAthleteTab("comp");}} />}
            {mainView === "athlete" && selected && <AthleteView />}
          </>
        )}
      </div>

      {showEditModal && editingAthlete && <EditModal />}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.gold}44; }
        button:hover { opacity: 0.85; }
        @media (max-width: 768px) {
          body { overflow-x: hidden; }
        }
      `}</style>
    </div>
  );
}
