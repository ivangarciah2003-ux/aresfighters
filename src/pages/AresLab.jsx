import { useState, useEffect, useCallback, useRef } from "react";

const SHEET_ID = "1YVVhsxu-K_1fDCAk9gd4iSgCM4swtw1CTL-B5YSknYQ";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

const C = {
  bg: "#07080d", surface: "#0f1018", card: "#13151f", cardHover: "#191c2a",
  border: "#1e2130", borderBright: "#2a2f45",
  red: "#e63946", redDim: "#3d1218", gold: "#f4a261", cyan: "#00c9ff",
  green: "#00e676", greenDim: "#003d1e", yellow: "#ffd60a", yellowDim: "#3d3000",
  muted: "#5a6080", text: "#dde1f0", textDim: "#8890aa",
};

const HERO_DATA = {
  Superman:     { color: C.cyan,   icon: "⚡", desc: "Fuerza + Velocidad. Mantenimiento integrado.", prio: { dom: "Mantenimiento integrado", mant: "Fast Force", sop: "High Force / Long Force" } },
  Hulk:         { color: C.red,    icon: "💥", desc: "Fuerza alta, velocidad baja. Fast Force dominante.", prio: { dom: "Fast Force", mant: "High Force", sop: "Long Force" } },
  Flash:        { color: C.yellow, icon: "🏃", desc: "Velocidad alta, fuerza baja. High Force dominante.", prio: { dom: "High Force", mant: "Fast Force", sop: "Long Force" } },
  "Viuda Negra":{ color: C.muted,  icon: "🕷", desc: "Sin base aún. Slow + High primero.", prio: { dom: "Slow Force + High Force", mant: "Long Force", sop: "Fast Force (mínimo)" } },
};

const VEHICLE_DATA = {
  Ferrari:         { color: C.red,   icon: "🏎", desc: "Pico alto, cae rápido. FI alto." },
  Tractor:         { color: C.gold,  icon: "🚜", desc: "Repite bien, no acelera. W1 bajo." },
  Híbrido:         { color: C.green, icon: "🔋", desc: "Equilibrado. Buena repetibilidad." },
  "Híbrido Rápido":{ color: C.cyan,  icon: "⚡", desc: "Rápido y bastante repetible." },
};

// ── UTILS ──────────────────────────────────────────────────────────────────────
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
const clasificarVehicle = (w1, w2, fi) => {
  if (!w1||!w2) return null;
  const rep = (parseFloat(w2)/parseFloat(w1))*100;
  const fiN = parseFloat(fi)||0;
  if (rep>=90&&fiN<=15) return "Híbrido";
  if (rep>=90)          return "Tractor";
  if (fiN<=15)          return "Híbrido Rápido";
  return "Ferrari";
};
const fmtDate = (d) => { if(!d) return "–"; const dt=new Date(d); return isNaN(dt)?d:dt.toLocaleDateString("es-ES",{day:"2-digit",month:"short"}); };
const getWeekKey = (d) => { const dt=new Date(d); if(isNaN(dt)) return null; const jan1=new Date(dt.getFullYear(),0,1); return `${dt.getFullYear()}-W${Math.ceil(((dt-jan1)/86400000+jan1.getDay()+1)/7)}`; };

// ACWR: Aguda (7d) / Crónica (28d)
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

// ── BASE COMPONENTS ────────────────────────────────────────────────────────────
const Badge = ({ label, color, small }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding: small?"2px 8px":"4px 12px", background:color+"22", border:`1px solid ${color}`, color, fontSize:small?"10px":"11px", letterSpacing:"1.5px", textTransform:"uppercase", borderRadius:"2px", fontFamily:"'DM Mono',monospace", fontWeight:"600" }}>{label}</span>
);

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"14px 16px", flex:1, minWidth:"80px" }}>
    <div style={{ fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{label}</div>
    <div style={{ fontSize:"22px", fontWeight:"700", color:color||C.text }}>{value}</div>
    {sub && <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>{sub}</div>}
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

// ── CUADRANTE SVG ──────────────────────────────────────────────────────────────
const Cuadrante = ({ athletes, profiles }) => {
  const [hovered, setHovered] = useState(null);
  const W = 440, H = 380, PAD = 48;
  const plotW = W - PAD*2, plotH = H - PAD*2;

  // FR eje X (0→2.5), CMJ eje Y (0→60)
  const toX = (fr) => PAD + (Math.min(parseFloat(fr)||0, 2.5)/2.5)*plotW;
  const toY = (cmj) => PAD + plotH - (Math.min(parseFloat(cmj)||0, 60)/60)*plotH;

  const athletes_with_data = athletes.filter(name => {
    const p = profiles[name]||{};
    return p.fr && p.cmj;
  });

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"12px", textTransform:"uppercase" }}>Cuadrante Fuerza — Velocidad</div>
      <div style={{ position:"relative", display:"inline-block" }}>
        <svg width={W} height={H} style={{ display:"block" }}>
          {/* Fondo cuadrantes */}
          <rect x={PAD} y={PAD} width={plotW/2} height={plotH/2} fill={C.yellow+"08"} />
          <rect x={PAD+plotW/2} y={PAD} width={plotW/2} height={plotH/2} fill={C.cyan+"08"} />
          <rect x={PAD} y={PAD+plotH/2} width={plotW/2} height={plotH/2} fill={C.muted+"08"} />
          <rect x={PAD+plotW/2} y={PAD+plotH/2} width={plotW/2} height={plotH/2} fill={C.red+"08"} />

          {/* Labels cuadrantes */}
          <text x={PAD+8} y={PAD+18} fill={C.yellow} fontSize="10" fontFamily="DM Mono" opacity="0.7">FLASH</text>
          <text x={PAD+plotW/2+8} y={PAD+18} fill={C.cyan} fontSize="10" fontFamily="DM Mono" opacity="0.7">SUPERMAN</text>
          <text x={PAD+8} y={PAD+plotH/2+18} fill={C.muted} fontSize="10" fontFamily="DM Mono" opacity="0.7">VIUDA NEGRA</text>
          <text x={PAD+plotW/2+8} y={PAD+plotH/2+18} fill={C.red} fontSize="10" fontFamily="DM Mono" opacity="0.7">HULK</text>

          {/* Ejes */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={PAD+plotH} stroke={C.border} strokeWidth="1"/>
          <line x1={PAD} y1={PAD+plotH} x2={PAD+plotW} y2={PAD+plotH} stroke={C.border} strokeWidth="1"/>

          {/* Líneas de umbral */}
          <line x1={toX(1.5)} y1={PAD} x2={toX(1.5)} y2={PAD+plotH} stroke={C.gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
          <line x1={PAD} y1={toY(35)} x2={PAD+plotW} y2={toY(35)} stroke={C.gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>

          {/* Labels ejes */}
          <text x={PAD+plotW/2} y={H-6} fill={C.muted} fontSize="10" fontFamily="DM Mono" textAnchor="middle">Fuerza Relativa (xBW)</text>
          <text x={10} y={PAD+plotH/2} fill={C.muted} fontSize="10" fontFamily="DM Mono" textAnchor="middle" transform={`rotate(-90,10,${PAD+plotH/2})`}>CMJ (cm)</text>

          {/* Ticks eje X */}
          {[0,0.5,1.0,1.5,2.0,2.5].map(v=>(
            <g key={v}>
              <line x1={toX(v)} y1={PAD+plotH} x2={toX(v)} y2={PAD+plotH+4} stroke={C.border} strokeWidth="1"/>
              <text x={toX(v)} y={PAD+plotH+14} fill={C.muted} fontSize="9" fontFamily="DM Mono" textAnchor="middle">{v}</text>
            </g>
          ))}
          {/* Ticks eje Y */}
          {[0,15,30,45,60].map(v=>(
            <g key={v}>
              <line x1={PAD-4} y1={toY(v)} x2={PAD} y2={toY(v)} stroke={C.border} strokeWidth="1"/>
              <text x={PAD-8} y={toY(v)+4} fill={C.muted} fontSize="9" fontFamily="DM Mono" textAnchor="end">{v}</text>
            </g>
          ))}

          {/* Puntos atletas */}
          {athletes_with_data.map(name => {
            const p = profiles[name]||{};
            const hero = clasificarHero(p.fr, p.cmj);
            const hInfo = HERO_DATA[hero];
            const x = toX(p.fr), y = toY(p.cmj);
            const isH = hovered === name;
            return (
              <g key={name} onMouseEnter={()=>setHovered(name)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
                <circle cx={x} cy={y} r={isH?10:7} fill={(hInfo?.color||C.muted)+"44"} stroke={hInfo?.color||C.muted} strokeWidth={isH?2:1.5}/>
                {isH && (
                  <text x={x} y={y-14} fill={C.text} fontSize="10" fontFamily="DM Mono" textAnchor="middle" fontWeight="600">{name.split(" ")[0]}</text>
                )}
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

// ── PANEL COMPETICIONES GLOBAL ─────────────────────────────────────────────────
const CompeticionesGlobal = ({ allAthleteNames, profiles, onSelectAthlete }) => {
  const today = new Date();
  const allComps = [];
  allAthleteNames.forEach(name => {
    const comps = profiles[name]?.competiciones || [];
    comps.forEach(c => {
      if (c.date) allComps.push({ ...c, athlete: name });
    });
  });
  allComps.sort((a,b) => new Date(a.date) - new Date(b.date));
  const upcoming = allComps.filter(c => new Date(c.date) >= today);
  const past = allComps.filter(c => new Date(c.date) < today).slice(-5).reverse();

  const daysUntil = (ds) => {
    const diff = Math.ceil((new Date(ds)-today)/86400000);
    if (diff===0) return "¡HOY!";
    if (diff===1) return "Mañana";
    return `${diff}d`;
  };

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"16px", textTransform:"uppercase" }}>Panel de Competiciones</div>
      {upcoming.length === 0 && <div style={{ fontSize:"12px", color:C.muted, marginBottom:"16px" }}>No hay competiciones próximas registradas.</div>}
      {upcoming.map((c, i) => {
        const days = Math.ceil((new Date(c.date)-today)/86400000);
        const urgent = days <= 14;
        const hInfo = HERO_DATA[clasificarHero(profiles[c.athlete]?.fr, profiles[c.athlete]?.cmj)];
        return (
          <div key={i} onClick={() => onSelectAthlete(c.athlete)} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 12px", marginBottom:"6px", background: urgent ? C.redDim : C.surface, border:`1px solid ${urgent ? C.red : C.border}`, cursor:"pointer" }}>
            <div style={{ fontSize:"18px" }}>🥊</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", fontWeight:"600", color:C.text }}>{c.athlete}</div>
              <div style={{ fontSize:"11px", color:C.muted }}>{c.evento} · {c.categoria}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"13px", fontWeight:"700", color: urgent ? C.red : C.yellow }}>{daysUntil(c.date)}</div>
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

// ── GENERADOR IA ───────────────────────────────────────────────────────────────
const GeneradorIA = ({ name, prof }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [dias, setDias] = useState("4");
  const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
  const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2, prof.fi);
  const fase = prof.fase || "off-camp";

  const generar = async () => {
    setLoading(true); setPlan(null);
    const prompt = `Eres el Sistema ARES de entrenamiento para peleadores de deportes de combate.

PERFIL DEL ATLETA: ${name}
- Perfil neuromuscular: ${hero || "Sin clasificar"}
- Perfil energético: ${vehicle || "Sin datos"}
- Fase: ${fase}
- Deporte: ${prof.deporte || "MMA"}
- Días disponibles: ${dias}

REGLAS ARES:
- Hulk → Fast Force dominante, High mantenimiento
- Flash → High Force dominante, Fast mantenimiento  
- Viuda Negra → Slow + High antes de transferencia
- Superman → Mantenimiento integrado
- Estructura sesión: Prep → Saltos/Lanzamientos → Velocidad → Fuerza → Energético
- Jumps SIEMPRE antes de fatiga
- Semáforo: LOW verde (<200 UA), MODERATE amarillo (200-450), HIGH rojo (>450)
- No encadenar días rojos
- AITR: Acumulación=Slow, Intensificación=High, Transformación=Fast, Realización=bajo volumen

Genera un microciclo de ${dias} días. Responde SOLO JSON sin markdown:
{"resumen":"lógica del bloque","bloque_dominante":"nombre","dias":[{"dia":"Lunes","color":"amarillo","tipo":"Fast Force","estructura":[{"bloque":"Prep","ejercicios":["Respiración 4-4-4","Movilidad cadera"],"duracion":"10 min"},{"bloque":"Saltos","ejercicios":["Squat Jump 4x4"],"duracion":"10 min"},{"bloque":"Velocidad","ejercicios":["Aceleración 10m x5"],"duracion":"8 min"},{"bloque":"Fuerza","ejercicios":["Trap Bar Jump 4x3 @40%"],"duracion":"20 min"},{"bloque":"Energético","ejercicios":["Aláctico 6x8s/90s"],"duracion":"10 min"}],"notas":"Calidad neural sobre todo","ua_estimada":320}],"frase_maestra":"frase del sistema"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3000,
          system:"Eres el Sistema ARES. Responde SOLO JSON válido sin markdown ni backticks.",
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
            <button onClick={generar} disabled={loading} style={{ padding:"8px 20px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>
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
            <div style={{ marginTop:"8px" }}><Badge label={plan.bloque_dominante} color={C.red} /></div>
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
            <div style={{ textAlign:"center", padding:"16px", borderTop:`2px solid ${C.red}`, marginTop:"4px" }}>
              <div style={{ fontSize:"11px", color:C.muted, letterSpacing:"3px", marginBottom:"6px" }}>FRASE MAESTRA</div>
              <div style={{ fontSize:"15px", color:C.red, fontStyle:"italic" }}>"{plan.frase_maestra}"</div>
            </div>
          )}
        </div>
      )}
      {plan?.error && <div style={{ padding:"16px", background:C.redDim, border:`1px solid ${C.red}`, color:C.red, fontSize:"12px" }}>{plan.error}</div>}
    </div>
  );
};

// ── MAIN APP ───────────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchData(); }, [fetchData]);

  // Agrupar rows por atleta
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

  const updateProfile = (name, data) => setProfiles(prev => ({ ...prev, [name]: { ...prev[name], ...data } }));

  const exportPDF = (name) => {
    const rows = athleteRows[name] || [];
    const prof = profiles[name] || {};
    const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
    const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2, prof.fi);
    const acwr = calcACWR(rows);
    const last7 = rows.slice(-7);
    const avgW = last7.map(r=>parseFloat(calcWellness(r))||0).filter(v=>v>0);
    const avgWellness = avgW.length ? (avgW.reduce((a,b)=>a+b,0)/avgW.length).toFixed(1) : "–";
    const totalUA = rows.reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0);
    const prio = hero ? HERO_DATA[hero]?.prio : null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe ${name}</title>
    <style>body{font-family:monospace;background:#fff;color:#111;padding:32px;max-width:800px;margin:0 auto}
    h1{font-size:24px;letter-spacing:4px;color:#e63946;margin-bottom:4px}
    h2{font-size:13px;letter-spacing:3px;color:#888;text-transform:uppercase;margin:20px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px}
    .stat{background:#f8f8f8;padding:12px;border-left:3px solid #e63946}
    .stat-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px}
    .stat-val{font-size:20px;font-weight:700;color:#111}
    .badge{display:inline-block;padding:3px 10px;border:1px solid;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-right:6px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#f0f0f0;padding:6px 8px;text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase}
    td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
    .prio{padding:10px 14px;border-left:3px solid #e63946;background:#fff8f8;margin:4px 0;font-size:12px}
    @media print{body{padding:16px}}</style></head><body>
    <h1>ARES LAB</h1>
    <div style="font-size:13px;color:#888;margin-bottom:20px">Informe de atleta — ${name} — ${new Date().toLocaleDateString("es-ES")}</div>
    <div style="margin-bottom:16px">
      ${hero ? `<span class="badge" style="color:${HERO_DATA[hero]?.color};border-color:${HERO_DATA[hero]?.color}">${HERO_DATA[hero]?.icon} ${hero}</span>` : ""}
      ${vehicle ? `<span class="badge" style="color:${VEHICLE_DATA[vehicle]?.color};border-color:${VEHICLE_DATA[vehicle]?.color}">${VEHICLE_DATA[vehicle]?.icon} ${vehicle}</span>` : ""}
      ${prof.deporte ? `<span class="badge" style="color:#888;border-color:#ccc">${prof.deporte}</span>` : ""}
      ${prof.fase ? `<span class="badge" style="color:#888;border-color:#ccc">${prof.fase}</span>` : ""}
    </div>
    <div class="grid">
      <div class="stat"><div class="stat-label">Total Registros</div><div class="stat-val">${rows.length}</div></div>
      <div class="stat"><div class="stat-label">UA Total</div><div class="stat-val">${totalUA.toLocaleString()}</div></div>
      <div class="stat"><div class="stat-label">Wellness Med.</div><div class="stat-val">${avgWellness}/5</div></div>
      <div class="stat"><div class="stat-label">ACWR</div><div class="stat-val">${acwr.ratio || "–"}</div></div>
    </div>
    ${prio ? `<h2>Prioridades ARES</h2>
    <div class="prio"><strong>Dominante:</strong> ${prio.dom}</div>
    <div class="prio"><strong>Mantenimiento:</strong> ${prio.mant}</div>
    <div class="prio"><strong>Soporte:</strong> ${prio.sop}</div>` : ""}
    <h2>Tests registrados</h2>
    ${(prof.tests||[]).length > 0 ? `<table><tr><th>Fecha</th><th>CMJ</th><th>SJ</th><th>F.Rel</th><th>W1</th><th>W2</th><th>FI%</th><th>Perfil</th></tr>
    ${(prof.tests||[]).map(t=>`<tr><td>${t.date}</td><td>${t.cmj||"–"}</td><td>${t.sj||"–"}</td><td>${t.fr||"–"}</td><td>${t.w1||"–"}</td><td>${t.w2||"–"}</td><td>${t.fi||"–"}</td><td>${t.hero||"–"}</td></tr>`).join("")}
    </table>` : "<p style='color:#888;font-size:12px'>Sin tests registrados</p>"}
    <h2>Últimas 20 sesiones</h2>
    <table><tr><th>Fecha</th><th>Tipo</th><th>Min</th><th>RPE</th><th>UA</th><th>Wellness</th><th>Notas</th></tr>
    ${rows.slice(-20).reverse().map(r=>{
      const ua=calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]);
      const w=calcWellness(r);
      return `<tr><td>${fmtDate(r["Marca temporal"])}</td><td>${(r["Tipo de día de entrenamiento"]||"–").split("/")[0]}</td><td>${r["Minutos totales entrenados hoy"]||"–"}</td><td>${r["RPE del día (Esfuerzo)"]||"–"}</td><td><strong>${ua||"–"}</strong></td><td>${w||"–"}</td><td style="color:#888">${r["Notas / molestias (opcional)"]||""}</td></tr>`;
    }).join("")}
    </table>
    <script>window.onload=()=>{window.print()}</script></body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
  };

  // ── NAV ────────────────────────────────────────────────────────────────────
  const navItems = [
    { id:"dashboard", label:"Dashboard" },
    { id:"cuadrante", label:"Cuadrante" },
    { id:"competiciones", label:"Competiciones" },
  ];

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const DashboardView = () => (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"24px" }}>
        <StatBox label="Atletas" value={allAthleteNames.length} color={C.cyan} />
        <StatBox label="Registros hoy" value={`${registeredToday.length}/${allAthleteNames.length}`} color={C.green} />
        <StatBox label="Total registros" value={allRows.length} color={C.gold} />
        <StatBox label="Última sync" value={lastSync ? lastSync.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "–"} color={C.muted} />
      </div>

      {/* Alertas */}
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
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

      {/* Grid atletas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"10px" }}>
        {allAthleteNames.map(name => {
          const rows = athleteRows[name]||[];
          const last = rows[rows.length-1];
          const prof = profiles[name]||{};
          const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
          const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2, prof.fi);
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
              style={{ background:C.card, border:`1px solid ${hasToday?C.green+"44":C.border}`, borderLeft:`3px solid ${hInfo?.color||C.borderBright}`, padding:"14px", cursor:"pointer", position:"relative", transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
              onMouseLeave={e=>e.currentTarget.style.background=C.card}
            >
              {hasToday && <div style={{ position:"absolute", top:"10px", right:"10px", width:"7px", height:"7px", borderRadius:"50%", background:C.green, boxShadow:`0 0 5px ${C.green}` }}/>}
              <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"9px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:(hInfo?.color||C.muted)+"22", border:`2px solid ${hInfo?.color||C.muted}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>{hInfo?.icon||"👤"}</div>
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
              {nextComp && (
                <div style={{ fontSize:"10px", color:C.yellow, marginTop:"4px" }}>🥊 {nextComp.evento} — {Math.ceil((new Date(nextComp.date)-new Date())/86400000)}d</div>
              )}
              <div style={{ marginTop:"6px", fontSize:"10px", color:C.muted }}>{rows.length} registros</div>
            </div>
          );
        })}
      </div>
      {allAthleteNames.length === 0 && !loading && (
        <div style={{ textAlign:"center", padding:"60px", color:C.muted }}>
          <div style={{ fontSize:"28px", marginBottom:"10px" }}>📋</div>
          <div style={{ fontSize:"13px", letterSpacing:"2px" }}>{error || "Conecta el Google Sheet para ver los atletas"}</div>
          <button onClick={fetchData} style={{ marginTop:"16px", padding:"10px 24px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"12px", letterSpacing:"2px", fontFamily:"inherit" }}>REINTENTAR</button>
        </div>
      )}
    </div>
  );

  // ── ATHLETE VIEW ───────────────────────────────────────────────────────────
  const AthleteView = () => {
    const name = selected;
    const rows = (athleteRows[name]||[]).slice().sort((a,b)=>new Date(a["Marca temporal"])-new Date(b["Marca temporal"]));
    const prof = profiles[name]||{};
    const hero = prof.hero || clasificarHero(prof.fr, prof.cmj);
    const vehicle = prof.vehicle || clasificarVehicle(prof.w1, prof.w2, prof.fi);
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

    const tabs = [["overview","RESUMEN"],["carga","CARGA"],["acwr","ACWR"],["tests","TESTS"],["comp","COMPETICIÓN"],["ia","IA 🤖"]];

    return (
      <div>
        {/* Header atleta */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
          <button onClick={()=>setMainView("dashboard")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"7px 14px", cursor:"pointer", fontSize:"11px", fontFamily:"inherit" }}>← VOLVER</button>
          <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:(hInfo?.color||C.muted)+"22", border:`2px solid ${hInfo?.color||C.muted}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>{hInfo?.icon||"👤"}</div>
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

        {/* Tabs */}
        <div style={{ display:"flex", gap:"4px", marginBottom:"20px", flexWrap:"wrap" }}>
          {tabs.map(([t,l]) => (
            <button key={t} onClick={()=>setAthleteTab(t)} style={{ padding:"7px 14px", background:athleteTab===t?C.red:"transparent", border:`1px solid ${athleteTab===t?C.red:C.border}`, color:athleteTab===t?"#fff":C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {athleteTab === "overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
              <StatBox label="Registros" value={rows.length} color={C.cyan} />
              <StatBox label="UA Hoy" value={todayUA||"–"} color={sem.color} sub={sem.label} />
              <StatBox label="UA Total" value={totalUA.toLocaleString()} color={C.gold} />
              <StatBox label="Wellness med." value={avgW} color={parseFloat(avgW)>=3.5?C.green:parseFloat(avgW)>=2.5?C.yellow:C.red} sub="/ 5.0" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
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
                        {[["Dominante", prio.dom, C.red],["Mantenimiento", prio.mant, C.yellow],["Soporte", prio.sop, C.green]].map(([l,v,c]) => (
                          <div key={l} style={{ fontSize:"12px", marginBottom:"4px" }}><span style={{ color:c }}>●</span> <span style={{ color:C.muted }}>{l}:</span> <span style={{ color:C.text }}>{v}</span></div>
                        ))}
                      </div>
                    )}
                    {vehicle && (
                      <div style={{ marginTop:"14px", paddingTop:"14px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"8px" }}>
                        <span style={{ fontSize:"20px" }}>{vInfo?.icon}</span>
                        <div>
                          <div style={{ fontSize:"13px", fontWeight:"600", color:vInfo?.color }}>{vehicle}</div>
                          <div style={{ fontSize:"11px", color:C.muted }}>{vInfo?.desc}</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize:"12px", color:C.muted }}>Sin clasificar. Añade CMJ y Fuerza Relativa en "Editar perfil".</div>
                )}
              </div>
              {/* Últimas sesiones */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Últimas 7 sesiones</div>
                {last7.length === 0 ? <div style={{ fontSize:"12px", color:C.muted }}>Sin datos</div> :
                  last7.slice().reverse().map((r,i) => {
                    const ua = calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
                    const w = calcWellness(r);
                    const s = semaforo(ua);
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"7px", padding:"7px 10px", background:C.surface }}>
                        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:s.color, flexShrink:0 }}/>
                        <div style={{ flex:1, fontSize:"11px", color:C.text }}>{(r["Tipo de día de entrenamiento"]||"–").split("/")[0]}</div>
                        <div style={{ fontSize:"11px", color:s.color, fontWeight:"600" }}>{ua} UA</div>
                        {w && <div style={{ fontSize:"11px", color:C.muted }}>W:{w}</div>}
                        <div style={{ fontSize:"10px", color:C.muted }}>{fmtDate(r["Marca temporal"])}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
            {/* Wellness grid 7d */}
            {last7.length > 0 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Wellness & Carga — Últimos 7 días</div>
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${last7.length},1fr)`, gap:"8px" }}>
                  {last7.map((r,i) => {
                    const ua = calcUA(r["Minutos totales entrenados hoy"], r["RPE del día (Esfuerzo)"]);
                    const w = parseFloat(calcWellness(r))||0;
                    const s = semaforo(ua);
                    return (
                      <div key={i} style={{ background:C.surface, padding:"10px 8px", textAlign:"center" }}>
                        <div style={{ fontSize:"9px", color:C.muted, marginBottom:"5px" }}>{fmtDate(r["Marca temporal"])}</div>
                        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:s.color, margin:"0 auto 5px" }}/>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:s.color }}>{ua}</div>
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
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Historial de Carga</div>
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
              <StatBox label="Carga Aguda (7d)" value={acwr.acute} color={C.cyan} sub="UA / día" />
              <StatBox label="Carga Crónica (28d)" value={acwr.chronic} color={C.gold} sub="UA / día" />
              <StatBox label="ACWR" value={acwr.ratio||"–"} color={acwr.ratio ? (parseFloat(acwr.ratio)>1.3?C.red:parseFloat(acwr.ratio)<0.8?C.yellow:C.green) : C.muted} sub={acwr.ratio ? (parseFloat(acwr.ratio)>1.3?"⚠ Alto":parseFloat(acwr.ratio)<0.8?"↓ Bajo":"✓ Óptimo") : "Min. 7 días"} />
              <StatBox label="UA Semana actual" value={rows.filter(r=>{try{const d=new Date(r["Marca temporal"]);const now=new Date();return d>=new Date(now-7*86400000);}catch{return false;}}).reduce((s,r)=>s+calcUA(r["Minutos totales entrenados hoy"],r["RPE del día (Esfuerzo)"]),0)} color={C.text} />
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"8px", textTransform:"uppercase" }}>Interpretación ACWR</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
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
                    {entries.map(([week, ua], i) => {
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
          <TestsTab name={name} prof={prof} onSave={(data)=>updateProfile(name, data)} />
        )}

        {/* ── COMP ── */}
        {athleteTab === "comp" && (
          <CompTab name={name} prof={prof} onSave={(data)=>updateProfile(name, data)} />
        )}

        {/* ── IA ── */}
        {athleteTab === "ia" && (
          <GeneradorIA name={name} prof={prof} />
        )}
      </div>
    );
  };

  // ── TESTS TAB ──────────────────────────────────────────────────────────────
  const TestsTab = ({ name, prof, onSave }) => {
    const [nt, setNt] = useState({ date:"", cmj:"", sj:"", fr:"", w1:"", w2:"", fi:"", notas:"" });
    const tests = prof.tests || [];
    const addTest = () => {
      if (!nt.date) return;
      const hero = clasificarHero(nt.fr, nt.cmj);
      const vehicle = clasificarVehicle(nt.w1, nt.w2, nt.fi);
      onSave({ tests:[...tests,{...nt,hero,vehicle}], hero, vehicle, fr:nt.fr, cmj:nt.cmj, w1:nt.w1, w2:nt.w2, fi:nt.fi });
      setNt({ date:"", cmj:"", sj:"", fr:"", w1:"", w2:"", fi:"", notas:"" });
    };
    return (
      <div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Nuevo Test</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px" }}>
            {[["date","Fecha","date"],["cmj","CMJ (cm)","number"],["sj","SJ (cm)","number"],["fr","Fuerza Rel. (xBW)","number"],["w1","W1 (W)","number"],["w2","W2 (W)","number"],["fi","FI (%)","number"],["notas","Notas","text"]].map(([k,l,t])=>(
              <div key={k} style={{ gridColumn:k==="notas"?"span 2":"span 1" }}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type={t} value={nt[k]} onChange={e=>setNt(p=>({...p,[k]:e.target.value}))} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'DM Mono',monospace", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          {nt.fr || nt.cmj ? (() => {
            const h = clasificarHero(nt.fr, nt.cmj);
            const v = clasificarVehicle(nt.w1, nt.w2, nt.fi);
            return h ? (
              <div style={{ marginTop:"12px", padding:"10px", background:C.surface, display:"flex", gap:"8px" }}>
                <span style={{ fontSize:"11px", color:C.muted, letterSpacing:"2px" }}>CLASIFICACIÓN:</span>
                {h && <Badge label={`${HERO_DATA[h]?.icon} ${h}`} color={HERO_DATA[h]?.color||C.muted} small />}
                {v && <Badge label={`${VEHICLE_DATA[v]?.icon} ${v}`} color={VEHICLE_DATA[v]?.color||C.muted} small />}
              </div>
            ) : null;
          })() : null}
          <button onClick={addTest} style={{ marginTop:"14px", padding:"9px 22px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>+ GUARDAR TEST</button>
        </div>
        {tests.length > 0 && (
          <>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Historial</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{["Fecha","CMJ","SJ","F.Rel","W1","W2","FI%","Perfil","Vehículo"].map(h=><th key={h} style={{ padding:"7px 9px", textAlign:"left", color:C.muted, fontSize:"10px", letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {tests.map((t,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}20` }}>
                        <td style={{ padding:"7px 9px", color:C.textDim }}>{t.date}</td>
                        {["cmj","sj","fr","w1","w2","fi"].map(k=><td key={k} style={{ padding:"7px 9px", color:k==="cmj"?C.cyan:C.text }}>{t[k]||"–"}</td>)}
                        <td style={{ padding:"7px 9px" }}>{t.hero?<Badge label={t.hero} color={HERO_DATA[t.hero]?.color||C.muted} small />:"–"}</td>
                        <td style={{ padding:"7px 9px" }}>{t.vehicle?<Badge label={t.vehicle} color={VEHICLE_DATA[t.vehicle]?.color||C.muted} small />:"–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {tests.length > 1 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px" }}>
                <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Evolución</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" }}>
                  {[["CMJ (cm)","cmj",C.cyan],["SJ (cm)","sj",C.green],["Fuerza Relativa","fr",C.red]].map(([label,key,color])=>{
                    const vals = tests.map(t=>parseFloat(t[key])).filter(v=>!isNaN(v));
                    if (vals.length < 2) return null;
                    const delta = vals[vals.length-1] - vals[0];
                    return (
                      <div key={key} style={{ background:C.surface, padding:"14px" }}>
                        <div style={{ fontSize:"11px", color:C.muted, marginBottom:"6px" }}>{label}</div>
                        <div style={{ display:"flex", alignItems:"baseline", gap:"8px", marginBottom:"8px" }}>
                          <div style={{ fontSize:"22px", fontWeight:"700", color }}>{vals[vals.length-1]}</div>
                          <div style={{ fontSize:"12px", color:delta>=0?C.green:C.red }}>{delta>=0?"+":""}{delta.toFixed(1)}</div>
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

  // ── COMP TAB ───────────────────────────────────────────────────────────────
  const CompTab = ({ name, prof, onSave }) => {
    const [nc, setNc] = useState({ date:"", evento:"", categoria:"", resultado:"", notas:"" });
    const comps = prof.competiciones || [];
    const addComp = () => { if (!nc.date||!nc.evento) return; onSave({ competiciones:[...comps,nc] }); setNc({ date:"", evento:"", categoria:"", resultado:"", notas:"" }); };
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
                <div style={{ fontSize:"13px", fontWeight:"700", color:urg?C.red:C.yellow }}>{dU(c.date)}</div>
                {urg && <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>{d<=7?"PEAKING":"CAMP"}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"20px", marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:C.gold, marginBottom:"14px", textTransform:"uppercase" }}>Añadir Competición</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
            {[["date","Fecha","date"],["evento","Evento","text"],["categoria","Categoría","text"],["resultado","Resultado","text"],["notas","Notas","text"]].map(([k,l,t])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type={t} value={nc[k]} onChange={e=>setNc(p=>({...p,[k]:e.target.value}))} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'DM Mono',monospace", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          <button onClick={addComp} style={{ marginTop:"14px", padding:"9px 22px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>+ AÑADIR</button>
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

  // ── EDIT MODAL ─────────────────────────────────────────────────────────────
  const EditModal = () => {
    const name = editingAthlete;
    const [form, setForm] = useState({ deporte:"MMA", fase:"off-camp", ...(profiles[name]||{}) });
    const setF = (k,v) => setForm(p=>({...p,[k]:v}));
    const save = () => {
      const hero = clasificarHero(form.fr, form.cmj);
      const vehicle = clasificarVehicle(form.w1, form.w2, form.fi);
      setProfiles(prev=>({...prev,[name]:{...form,hero,vehicle}}));
      setShowEditModal(false);
    };
    return (
      <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, width:"560px", maxHeight:"85vh", overflowY:"auto", padding:"28px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ fontSize:"13px", letterSpacing:"3px", color:C.gold, textTransform:"uppercase" }}>Perfil — {name}</div>
            <button onClick={()=>setShowEditModal(false)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"20px" }}>×</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            {[["deporte","Deporte",["MMA","Boxeo","Muay Thai","BJJ","Lucha","K1","Kickboxing"]],["fase","Fase",["off-camp","camp corto","2 semanas para pelear"]]].map(([k,l,opts])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <select value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'DM Mono',monospace", outline:"none" }}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.red, textTransform:"uppercase", margin:"14px 0 8px" }}>Test Neuromuscular</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
            {[["fr","Fuerza Rel. (xBW)"],["cmj","CMJ (cm)"],["sj","SJ (cm)"]].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type="number" value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'DM Mono',monospace", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"11px", letterSpacing:"2px", color:C.cyan, textTransform:"uppercase", margin:"14px 0 8px" }}>Doble Wingate</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
            {[["w1","W1 (W)"],["w2","W2 (W)"],["fi","FI (%)"]].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:"10px", letterSpacing:"2px", color:C.muted, textTransform:"uppercase", marginBottom:"4px" }}>{l}</label>
                <input type="number" value={form[k]||""} onChange={e=>setF(k,e.target.value)} style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"8px 10px", fontSize:"13px", fontFamily:"'DM Mono',monospace", boxSizing:"border-box", outline:"none" }}/>
              </div>
            ))}
          </div>
          {(form.fr||form.cmj) && (() => {
            const h=clasificarHero(form.fr,form.cmj); const v=clasificarVehicle(form.w1,form.w2,form.fi);
            return h ? (
              <div style={{ padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, display:"flex", gap:"8px", marginBottom:"14px" }}>
                <span style={{ fontSize:"11px", color:C.muted, letterSpacing:"2px" }}>CLASIF.:</span>
                {h && <Badge label={`${HERO_DATA[h]?.icon} ${h}`} color={HERO_DATA[h]?.color||C.muted} small />}
                {v && <Badge label={`${VEHICLE_DATA[v]?.icon} ${v}`} color={VEHICLE_DATA[v]?.color||C.muted} small />}
              </div>
            ) : null;
          })()}
          <button onClick={save} style={{ width:"100%", padding:"11px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"12px", letterSpacing:"3px", fontFamily:"inherit", textTransform:"uppercase" }}>GUARDAR PERFIL</button>
        </div>
      </div>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", background:C.bg, color:C.text, minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:"54px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <button onClick={()=>setMainView("dashboard")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"17px", fontWeight:"700", letterSpacing:"6px", color:C.red }}>ARES</span>
            <span style={{ fontSize:"10px", letterSpacing:"3px", color:C.muted }}>LAB</span>
          </button>
          <span style={{ color:C.border, margin:"0 4px" }}>|</span>
          {mainView !== "athlete" && navItems.map(({id,label}) => (
            <button key={id} onClick={()=>setMainView(id)} style={{ padding:"5px 12px", background:mainView===id?C.red+"22":"transparent", border:`1px solid ${mainView===id?C.red:C.border}`, color:mainView===id?C.red:C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit", textTransform:"uppercase" }}>{label}</button>
          ))}
          {mainView === "athlete" && selected && (
            <span style={{ fontSize:"13px", color:C.text, marginLeft:"4px" }}>› {selected}</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {lastSync && <span style={{ fontSize:"11px", color:C.muted }}>{lastSync.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</span>}
          {loading && <span style={{ fontSize:"13px", color:C.muted, animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span>}
          <button onClick={fetchData} disabled={loading} style={{ padding:"5px 14px", background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit" }}>↻ SYNC</button>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdrnCRWIyhCq3YNZJHea4X7hjuWwat_k8X1eoRmJWhAeiZdUg/viewform" target="_blank" rel="noreferrer" style={{ padding:"5px 14px", background:C.red, color:"#fff", fontSize:"11px", letterSpacing:"2px", textDecoration:"none" }}>+ FORM</a>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ padding:"28px", maxWidth:"1400px", margin:"0 auto" }}>
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
            <button onClick={fetchData} style={{ padding:"10px 28px", background:C.red, border:"none", color:"#fff", cursor:"pointer", fontSize:"12px", letterSpacing:"2px", fontFamily:"inherit" }}>REINTENTAR</button>
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
        ::-webkit-scrollbar-thumb { background:${C.border}; }
        button:hover { opacity: 0.85; }
        @media (max-width: 768px) {
          body { overflow-x: hidden; }
        }
      `}</style>
    </div>
  );
}
