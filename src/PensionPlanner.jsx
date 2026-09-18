import { useState, useMemo, useRef } from "react";
import { project, phaseSpans, incomeStartAge, TAX_FREE_CAP, ANNUAL_ALLOWANCE, END_AGE } from "./projection.js";

const STORE_KEY = "pension-planner.v3";

// Contributions default to rising with inflation: a pay rise that merely keeps
// pace leaves you contributing the same in real terms. Anything lower means
// your contributions quietly shrink every year.
const DEFAULT_INFLATION = 2.5;

const DEFAULTS = {
  currentAge: 30,
  currentPot: 100000,
  annualContrib: 10000,
  growth: 6,
  contribGrowth: DEFAULT_INFLATION,
  inflation: DEFAULT_INFLATION,
  taxFreePct: 25,
  taxFreeTakeAge: 57,
  taxFreeYears: 1,
  drawdownAge: 57,
  phases: [
    { rate: 6, years: 10, label: "Active early retirement" },
    { rate: 5, years: 10, label: "Standard drawdown" },
    { rate: 4, years: 8, label: "Later retirement" },
    { rate: 3, years: 99, label: "Late stage" },
  ],
  // Today's £ leads by default: the inflation-adjusted figure is the honest
  // answer to "what will this actually buy?".
  showToday: true,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // Private browsing, blocked storage — fall through to defaults.
  }
  return DEFAULTS;
}

function saveState(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // Nothing to do; the planner works fine without persistence.
  }
}

const money = (v) => {
  const n = Math.round(v);
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`;
  if (Math.abs(n) >= 10_000) return `£${Math.round(n / 1000)}k`;
  return `£${n.toLocaleString("en-GB")}`;
};
const full = (v) => `£${Math.round(v).toLocaleString("en-GB")}`;
const parseMoney = (str) => {
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : n;
};
const phaseVar = (i) => `var(--p${Math.min(i + 1, 4)})`;

const STEPS = [
  { n: "01", t: "You" },
  { n: "02", t: "Access" },
  { n: "03", t: "Spending" },
  { n: "04", t: "Pot value" },
  { n: "05", t: "Income" },
];

/* ------------------------------------------------------------------ control */

function Control({ id, label, value, onChange, min, max, step, fmt, note, typed, hardMax }) {
  const [draft, setDraft] = useState(null);
  const shown = draft !== null ? draft : fmt(value);

  // Steps accumulate against a shadow value rather than the rendered prop.
  // React batches state updates, so several taps (or repeat ticks) inside one
  // frame would otherwise all read the same stale number and collapse into a
  // single step. The shadow re-syncs whenever the value changes from anywhere
  // else — a slider drag, or typed entry.
  const shadow = useRef(value);
  const emitted = useRef(value);
  if (value !== emitted.current) {
    shadow.current = value;
    emitted.current = value;
  }
  const timer = useRef(null);

  const decimals = (String(step).split(".")[1] || "").length;
  const snap = (v) => parseFloat(Math.min(max, Math.max(min, v)).toFixed(decimals));

  const nudge = (dir) => {
    const next = snap(shadow.current + dir * step);
    if (next === shadow.current) return;
    shadow.current = next;
    emitted.current = next;
    onChange(next);
  };

  // Hold to repeat, accelerating — a £1,000 step across a £1m range is
  // otherwise a thousand taps.
  const hold = (dir) => {
    nudge(dir);
    let delay = 340;
    const tick = () => {
      nudge(dir);
      delay = Math.max(40, delay * 0.72);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };
  const release = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };

  const commit = () => {
    const n = parseMoney(draft);
    setDraft(null);
    if (n === null) return;
    onChange(Math.max(min, Math.min(hardMax ?? max, n)));
  };

  return (
    <div className="ctl">
      <div className="ctl-head">
        <label htmlFor={id}>{label}</label>
        <span className="ctl-val">
          {typed ? (
            <input
              type="text"
              inputMode="numeric"
              id={`${id}-text`}
              aria-label={`${label}, type a value`}
              value={shown}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <span className="ro">{fmt(value)}</span>
          )}
        </span>
      </div>
      <div className="ctl-note" id={`${id}-note`}>{note}</div>
      <div className="ctl-row">
        <button
          type="button" className="nudge" aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onPointerDown={(e) => { e.preventDefault(); hold(-1); }}
          onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
        >&minus;</button>
        <input
          type="range" id={id}
          min={min} max={max} step={step} value={value}
          aria-describedby={`${id}-note`}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <button
          type="button" className="nudge" aria-label={`Increase ${label}`}
          disabled={value >= max}
          onPointerDown={(e) => { e.preventDefault(); hold(1); }}
          onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
        >+</button>
      </div>
      <div className="ctl-ends"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
    </div>
  );
}

/* ------------------------------------------------------------- dual figures */

/** Every money cell shows both bases; the toggle decides which one leads. */
function Cell({ cash, today, showToday, fmt = money }) {
  const lead = showToday ? today : cash;
  const sub = showToday ? cash : today;
  return (
    <>
      <span className="main">{fmt(lead)}</span>
      <span className="alt">{fmt(sub)}</span>
    </>
  );
}

function basisCaption(showToday) {
  return showToday ? (
    <>Large figure is <b>today&rsquo;s £</b> &mdash; what it buys in {new Date().getFullYear()} money. Future £ beneath.</>
  ) : (
    <>Large figure is <b>future £</b> &mdash; the cash at that date. Today&rsquo;s £ beneath.</>
  );
}

/* ------------------------------------------------------------------- charts */

function Spark({ years, showToday }) {
  const W = 104, H = 38;
  const vals = years.map((y) => (showToday ? y.potToday : y.pot));
  const max = Math.max(...vals, 1);
  const bw = Math.max(W / years.length - 0.6, 0.8);
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {years.map((y, i) => {
        const v = showToday ? y.potToday : y.pot;
        const h = (v / max) * (H - 4);
        return (
          <rect
            key={y.age} x={i * (W / years.length)} y={H - h - 2}
            width={bw} height={Math.max(h, 0.6)} opacity=".85"
            style={{ fill: !y.drawing ? "var(--accent-2)" : y.phaseIndex >= 0 ? phaseVar(y.phaseIndex) : "var(--crit)" }}
          />
        );
      })}
    </svg>
  );
}

function Chart({ years, showToday }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const W = 520, H = 236, padL = 48, padR = 8, padT = 32, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = years.length;
  const vals = years.map((y) => (showToday ? y.potToday : y.pot));
  const max = Math.max(...vals, 1);
  const bw = Math.max(1.5, plotW / n - 1.5);
  const xOf = (i) => padL + i * (plotW / n);

  const pick = (clientX) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const frac = ((clientX - r.left) / r.width * W - padL) / plotW;
    const i = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    setHover(years[i].age);
  };

  const marks = [];
  const tf = years.findIndex((y) => y.taxFree > 0);
  const dd = years.findIndex((y) => y.drawing);
  if (tf >= 0) marks.push({ i: tf, color: "var(--accent)", label: "Tax-free cash", row: 0 });
  if (dd >= 0) marks.push({ i: dd, color: "var(--good)", label: "Income begins", row: 1 });

  const row = hover === null ? null : years.find((y) => y.age === hover);

  return (
    <div className="chart-wrap">
      <svg
        ref={ref} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Projected pension pot from age ${years[0]?.age} to ${END_AGE}`}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => pick(e.touches[0].clientX)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padT + plotH - f * plotH;
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} style={{ stroke: "var(--grid)" }} strokeWidth="1" />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fontFamily="DM Sans, sans-serif" style={{ fill: "var(--ink-3)" }}>
                {money(f * max)}
              </text>
            </g>
          );
        })}

        {years.map((y, i) => {
          const v = showToday ? y.potToday : y.pot;
          const h = (v / max) * plotH;
          return (
            <g key={y.age}>
              <rect
                x={xOf(i)} y={padT + plotH - h} width={bw} height={Math.max(h, 0)} rx="1"
                opacity={hover !== null && y.age !== hover ? 0.42 : 0.92}
                style={{ fill: !y.drawing ? "var(--accent-2)" : y.phaseIndex >= 0 ? phaseVar(y.phaseIndex) : "var(--crit)" }}
              />
              {y.age % 10 === 0 && (
                <text x={xOf(i) + bw / 2} y={H - 10} textAnchor="middle" fontSize="9" fontFamily="DM Sans, sans-serif" style={{ fill: "var(--ink-3)" }}>
                  {y.age}
                </text>
              )}
            </g>
          );
        })}

        {!showToday && (
          <polyline
            fill="none" strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round"
            style={{ stroke: "var(--ink-3)" }}
            points={years.map((y, i) => `${xOf(i) + bw / 2},${Math.max(padT + plotH - (y.potToday / max) * plotH, padT)}`).join(" ")}
          />
        )}

        {marks.map((m) => {
          const x = xOf(m.i) + bw / 2;
          const ly = 13 + m.row * 12;
          const anchor = x > W - 70 ? "end" : x < padL + 40 ? "start" : "middle";
          return (
            <g key={m.label}>
              <line x1={x} y1={ly + 3} x2={x} y2={padT + plotH} style={{ stroke: m.color }} strokeWidth="1" strokeDasharray="3,3" />
              <text
                x={anchor === "end" ? x - 4 : anchor === "start" ? x + 4 : x} y={ly}
                textAnchor={anchor} fontSize="8.5" fontWeight="600"
                fontFamily="DM Sans, sans-serif" style={{ fill: m.color }}
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {row && (
          <line
            x1={xOf(years.indexOf(row)) + bw / 2} y1={padT}
            x2={xOf(years.indexOf(row)) + bw / 2} y2={padT + plotH}
            style={{ stroke: "var(--ink)" }} strokeWidth="1" opacity=".5"
          />
        )}
      </svg>

      <div className="readout">
        {!row ? (
          <span>Hover or drag across the chart to read any year.</span>
        ) : (
          <>
            <span>Age <b>{row.age}</b></span>
            <span>Pot <b>{full(showToday ? row.potToday : row.pot)}</b></span>
            {row.annual > 0 ? (
              <span>Income <b>{full(showToday ? row.monthlyToday : row.monthly)}</b>/mo at {row.rate}%</span>
            ) : (
              <span className="muted">Still building</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Contributions over the saving years. The point of the chart is the gap: in
 * cash terms the payment climbs every year, but once inflation is taken out it
 * may be flat — or falling. That is invisible in a single percentage.
 */
function ContributionTrajectory({ contributions, children }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const rows = contributions;
  // Nothing to plot if there are no working years left, or nothing going in.
  if (rows.length < 2 || rows[rows.length - 1].amount <= 0) return null;

  const first = rows[0], last = rows[rows.length - 1];
  const W = 520, H = 104, padL = 46, padR = 8, padT = 8, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(...rows.map((y) => Math.max(y.amount, y.amountToday)), 1);
  const bw = Math.max(1.5, plotW / rows.length - 1.5);
  const xOf = (i) => padL + i * (plotW / rows.length);

  const flat = Math.round(first.amountToday) === Math.round(last.amountToday);
  const rising = last.amountToday > first.amountToday;

  // Which bar is under the pointer. Floor over the bar count rather than
  // rounding to centres, so the reading matches the bar you are actually on.
  const pick = (clientX) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const frac = (((clientX - box.left) / box.width) * W - padL) / plotW;
    const i = Math.max(0, Math.min(rows.length - 1, Math.floor(frac * rows.length)));
    setHover(rows[i].age);
  };
  const hovered = hover === null ? null : rows.find((r) => r.age === hover);
  const hoverIndex = hovered ? rows.indexOf(hovered) : -1;

  return (
    <div className="card">
      <h3>What you pay in each year</h3>
      <div className="chart-wrap">
        <svg
          ref={ref} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Annual contribution from age ${first.age} to ${last.age}`}
          onMouseMove={(e) => pick(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => pick(e.touches[0].clientX)}
        >
          {[0, 0.5, 1].map((f) => {
            const y = padT + plotH - f * plotH;
            return (
              <g key={f}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} style={{ stroke: "var(--grid)" }} strokeWidth="1" />
                <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="9"
                  fontFamily="DM Sans, sans-serif" style={{ fill: "var(--ink-3)" }}>{money(f * max)}</text>
              </g>
            );
          })}
          {rows.map((y, i) => {
            const h = (y.amount / max) * plotH;
            return (
              <rect key={y.age} x={xOf(i)} y={padT + plotH - h} width={bw} height={Math.max(h, 0)} rx="1"
                opacity={hover !== null && y.age !== hover ? 0.38 : 0.95}
                style={{ fill: "var(--accent-2)" }} />
            );
          })}
          <polyline fill="none" strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round"
            style={{ stroke: "var(--ink-3)" }}
            points={rows.map((y, i) => `${xOf(i) + bw / 2},${padT + plotH - (y.amountToday / max) * plotH}`).join(" ")} />
          {hovered && (
            <circle
              cx={xOf(hoverIndex) + bw / 2}
              cy={padT + plotH - (hovered.amountToday / max) * plotH}
              r="3" style={{ fill: "var(--ink)" }}
            />
          )}
          {[first, last].map((y, k) => (
            <text key={y.age} x={k === 0 ? padL : W - padR} y={H - 6} textAnchor={k === 0 ? "start" : "end"}
              fontSize="9" fontFamily="DM Sans, sans-serif" style={{ fill: "var(--ink-3)" }}>{y.age}</text>
          ))}
        </svg>
      </div>
      <div className="readout">
        {!hovered ? (
          <span>Hover or drag across the bars to read any year.</span>
        ) : (
          <>
            <span>Age <b>{hovered.age}</b></span>
            <span>Paying in <b>{full(hovered.amount)}</b></span>
            <span><b>{full(hovered.amountToday)}</b> in today&rsquo;s £</span>
          </>
        )}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--accent-2)" }} />Future £</span>
        <span><i className="dash" />Today&rsquo;s £</span>
      </div>
      <p className="tcap" style={{ margin: "10px 0 0" }}>
        <b>{full(first.amount)}</b> at {first.age} rising to <b>{full(last.amount)}</b> at {last.age}
        {" — "}
        {flat
          ? <>but <b>{full(first.amountToday)}</b> a year throughout in today&rsquo;s £, so what you pay in holds its value.</>
          : rising
            ? <>and <b>{full(first.amountToday)}</b> to <b>{full(last.amountToday)}</b> in today&rsquo;s £, so you are paying in more in real terms.</>
            : <>but only <b>{full(first.amountToday)}</b> down to <b>{full(last.amountToday)}</b> in today&rsquo;s £ — inflation is outpacing your increases.</>}
      </p>
      {children && <div className="after-chart">{children}</div>}
    </div>
  );
}

/* --------------------------------------------------------------------- app */

export default function PensionPlanner() {
  const [s, setS] = useState(loadState);
  const [step, setStep] = useState(0);

  const update = (patch) => setS((prev) => {
    const next = { ...prev, ...patch };
    saveState(next);
    return next;
  });

  const updatePhase = (i, patch) => update({
    phases: s.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)),
  });

  const P = useMemo(() => project(s), [s]);
  const spans = useMemo(() => phaseSpans(s), [s]);
  const start = incomeStartAge(s);
  const showToday = s.showToday;

  const go = (i) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const { depleted, firstIncome, atRetirement } = P;
  const chipClass = depleted ? (depleted.age < 80 ? "is-crit" : "is-warn") : "is-good";

  const incomeRows = P.years.filter((y) => y.annual > 0 || y.taxFree > 0);
  const totals = incomeRows.reduce((a, r) => ({
    cash: a.cash + r.annual, today: a.today + r.annualToday,
    tfCash: a.tfCash + r.taxFree, tfToday: a.tfToday + r.taxFreeToday,
  }), { cash: 0, today: 0, tfCash: 0, tfToday: 0 });

  const potAges = useMemo(() => {
    const ages = new Set([s.currentAge, start]);
    for (let a = Math.ceil((s.currentAge + 1) / 5) * 5; a <= END_AGE; a += 5) ages.add(a);
    return [...ages].filter((a) => a >= s.currentAge && a <= END_AGE).sort((a, b) => a - b);
  }, [s.currentAge, start]);

  return (
    <>
      <div className="verdict">
        <div className="verdict-in">
          <div className="verdict-top">
            <span className={`chip ${chipClass}`}>
              <span className="dot" />
              {depleted ? `Runs dry at ${depleted.age}` : `Lasts beyond ${END_AGE}`}
            </span>
            <div className="basis" role="group" aria-label="Measure amounts in">
              <button
                type="button" aria-pressed={!showToday}
                title="Pounds as they would appear at that future date"
                onClick={() => update({ showToday: false })}
              >Future £</button>
              <button
                type="button" aria-pressed={showToday}
                title="The same sum in today's buying power"
                onClick={() => update({ showToday: true })}
              >Today&rsquo;s £</button>
            </div>
          </div>
          <div className="verdict-figs">
            <span className="fig">
              <span className="k">Monthly income</span>
              <span className="v">{firstIncome ? full(showToday ? firstIncome.monthlyToday : firstIncome.monthly) : "—"}</span>
              <span className="s">{firstIncome ? `a month from ${firstIncome.age}, at ${firstIncome.rate}%` : "set a drawdown age"}</span>
            </span>
            <span className="fig">
              <span className="k">Pot at retirement</span>
              <span className="v">{atRetirement ? money(showToday ? atRetirement.potToday : atRetirement.pot) : "—"}</span>
              <span className="s">{atRetirement ? `at ${start}, in ${showToday ? "today’s" : "future"} £` : "—"}</span>
            </span>
            <Spark years={P.years} showToday={showToday} />
          </div>
        </div>
      </div>

      <div className="wrap">
        <nav className="steps" aria-label="Planning steps">
          {STEPS.map((st, i) => (
            <button key={st.n} type="button" aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
              <span className="n">{st.n}</span>
              <span className="t">{st.t}</span>
            </button>
          ))}
        </nav>

        {step === 0 && (
          <section aria-labelledby="h0">
            <h2 className="h" id="h0">Where you are now</h2>
            <p className="lede">
              Four numbers decide almost everything that follows. <strong>Growth matters most</strong> — a
              single percentage point, compounded over thirty years, moves the final pot more than any
              other choice on this page.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Pot at {start}</span>
                <span className="v">{atRetirement ? money(atRetirement.pot) : "—"}</span>
                <span className="s">{atRetirement ? `${money(atRetirement.potToday)} in today’s £` : ""}</span>
              </span>
              <span className="e">
                <span className="k">You will have paid in</span>
                <span className="v">{money(P.contributedTotal)}</span>
                <span className="s">over {P.contributions.length} years</span>
              </span>
            </div>

            <div className="card">
              <h3>Your position</h3>
              <Control
                id="age" label="Your age" value={s.currentAge} min={18} max={54} step={1}
                fmt={(v) => String(v)} onChange={(v) => update({ currentAge: v })}
                note={`Projection runs from ${s.currentAge} to ${END_AGE} — ${END_AGE - s.currentAge} years.`}
              />
              <Control
                id="pot" label="Current pot" value={s.currentPot} min={0} max={1000000} step={1000}
                fmt={full} typed hardMax={5000000} onChange={(v) => update({ currentPot: v })}
                note="Type an exact figure if the slider can’t reach it."
              />
              <Control
                id="contrib" label="Annual contributions" value={s.annualContrib} min={0} max={ANNUAL_ALLOWANCE} step={250}
                fmt={full} typed hardMax={ANNUAL_ALLOWANCE} onChange={(v) => update({ annualContrib: v })}
                note={s.annualContrib >= ANNUAL_ALLOWANCE
                  ? `At the ${full(ANNUAL_ALLOWANCE)} annual allowance.`
                  : "You and your employer combined, before tax relief limits."}
              />
              <Control
                id="growth" label="Growth rate" value={s.growth} min={0} max={12} step={0.25}
                fmt={(v) => `${v}%`} onChange={(v) => update({ growth: v })}
                note={s.growth >= 8
                  ? "Optimistic for a long horizon — fees are not deducted."
                  : "Before platform and fund charges of roughly 0.3–0.8%."}
              />
            </div>

            <ContributionTrajectory contributions={P.contributions}>
              <Control
                id="cgrow" label="Contribution increases" value={s.contribGrowth} min={0} max={10} step={0.5}
                fmt={(v) => `${v}%`} onChange={(v) => update({ contribGrowth: v })}
                note={s.contribGrowth === s.inflation
                  ? "Matching inflation — your contributions hold their value."
                  : s.contribGrowth < s.inflation
                    ? `Below ${s.inflation}% inflation — contributions shrink in real terms.`
                    : `Above ${s.inflation}% inflation — contributions grow in real terms.`}
              />
            </ContributionTrajectory>

            <div className="card">
              <h3>Inflation</h3>
              <Control
                id="inflation" label="Inflation" value={s.inflation} min={0} max={6} step={0.25}
                fmt={(v) => `${v}%`} onChange={(v) => update({ inflation: v })}
                note="Sets how far future £ are discounted to today’s £, and what your contributions have to beat."
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="h1">
            <h2 className="h" id="h1">Taking your money out</h2>
            <p className="lede">
              You can normally take <strong>25% tax free</strong>, capped at {full(TAX_FREE_CAP)}. Taking it in
              one lump is simplest; spreading it over several years leaves more invested for longer.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Tax-free cash</span>
                <span className="v">{money(P.taxFreeTotal)}</span>
                <span className="s">
                  {P.taxFreeTotal >= TAX_FREE_CAP - 1
                    ? `at the ${full(TAX_FREE_CAP)} cap`
                    : `${s.taxFreePct}% of the pot at ${s.taxFreeTakeAge}`}
                </span>
              </span>
              <span className="e">
                <span className="k">{s.taxFreeYears > 1 ? "Each year" : "As one lump"}</span>
                <span className="v">{money(P.taxFreeTotal / s.taxFreeYears)}</span>
                <span className="s">
                  {s.taxFreeYears > 1
                    ? `ages ${s.taxFreeTakeAge}–${s.taxFreeTakeAge + s.taxFreeYears - 1}`
                    : "tax free"}
                </span>
              </span>
            </div>

            <div className="card">
              <h3>Retirement &amp; tax-free cash</h3>
              <Control
                id="tfpct" label="Tax-free share" value={s.taxFreePct} min={0} max={25} step={1}
                fmt={(v) => `${v}%`} onChange={(v) => update({ taxFreePct: v })}
                note={s.taxFreePct === 25
                  ? `The maximum, capped at ${full(TAX_FREE_CAP)}.`
                  : "Below the 25% maximum — the rest stays invested."}
              />
              <Control
                id="tfage" label="Take it from age" value={s.taxFreeTakeAge} min={55} max={75} step={1}
                fmt={(v) => String(v)} onChange={(v) => update({ taxFreeTakeAge: v })}
                note={s.taxFreeTakeAge < 57
                  ? "Minimum access age rises to 57 in 2028."
                  : "At or above the 2028 minimum access age."}
              />
              <Control
                id="tfyears" label="Spread over" value={s.taxFreeYears} min={1} max={15} step={1}
                fmt={(v) => (v === 1 ? "1 year" : `${v} years`)} onChange={(v) => update({ taxFreeYears: v })}
                note={s.taxFreeYears === 1
                  ? "One lump sum."
                  : `Phased crystallisation — ${s.taxFreeTakeAge} to ${s.taxFreeTakeAge + s.taxFreeYears - 1}, leaving more invested.`}
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="h2t">
            <h2 className="h" id="h2t">How you&rsquo;ll spend it</h2>
            <p className="lede">
              Most people spend more in early retirement and less later. Each phase draws a
              <strong> percentage of whatever is left</strong>, so income falls as the pot does.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Starting income</span>
                <span className="v">{firstIncome ? full(showToday ? firstIncome.monthlyToday : firstIncome.monthly) : "—"}</span>
                <span className="s">a month from {start}</span>
              </span>
              <span className="e">
                <span className="k">{depleted ? "Pot exhausted" : `Still going at ${END_AGE}`}</span>
                <span className="v">{depleted ? `age ${depleted.age}` : money(P.years[P.years.length - 1].pot)}</span>
                <span className="s">{depleted ? "lower a rate to extend it" : "comfortably sustainable"}</span>
              </span>
            </div>

            <div className="card">
              <h3>Start of drawdown</h3>
              <Control
                id="ddage" label="Start drawing at" value={s.drawdownAge} min={55} max={75} step={1}
                fmt={(v) => String(v)} onChange={(v) => update({ drawdownAge: v })}
                note={s.taxFreeTakeAge > s.drawdownAge
                  ? `Income waits until ${start}, when tax-free cash is taken.`
                  : `Contributions stop at ${start}.`}
              />
            </div>

            <div className="card">
              <h3>Phases</h3>
              {s.phases.map((p, i) => {
                const isLast = i === s.phases.length - 1;
                return (
                  <div className="phase" key={i}>
                    <div className="phase-head">
                      <span className="swatch" style={{ background: phaseVar(i) }}>{i + 1}</span>
                      <input
                        className="nm" value={p.label} aria-label={`Phase ${i + 1} name`}
                        onChange={(e) => updatePhase(i, { label: e.target.value })}
                      />
                      {s.phases.length > 1 && (
                        <button
                          type="button" className="btn"
                          onClick={() => update({ phases: s.phases.filter((_, j) => j !== i) })}
                        >Remove</button>
                      )}
                    </div>
                    <div className="phase-span">
                      {isLast
                        ? `Age ${spans[i].from} onwards, until the pot runs out or ${END_AGE}.`
                        : `Age ${spans[i].from} to ${spans[i].to}.`}
                    </div>
                    <Control
                      id={`rate-${i}`} label="Withdrawal rate" value={p.rate} min={1} max={15} step={0.25}
                      fmt={(v) => `${v}%`} onChange={(v) => updatePhase(i, { rate: v })}
                      note={p.rate > 6 ? "Above a sustainable rate — the pot will drain."
                        : p.rate <= 4 ? "Conservative; likely to last." : "Moderate."}
                    />
                    {!isLast && (
                      <Control
                        id={`yrs-${i}`} label="Lasts for" value={p.years} min={1} max={30} step={1}
                        fmt={(v) => (v === 1 ? "1 year" : `${v} years`)}
                        onChange={(v) => updatePhase(i, { years: v })}
                        note="Changing this shifts every later phase."
                      />
                    )}
                  </div>
                );
              })}
              <button
                type="button" className="btn btn-add" disabled={s.phases.length >= 4}
                onClick={() => update({ phases: [...s.phases, { rate: 3, years: 99, label: "New phase" }] })}
              >Add a phase</button>

              <div className="timeline">
                {spans.map((sp, i) => (
                  <i key={i} style={{
                    width: `${((sp.to - sp.from) / Math.max(END_AGE - start, 1)) * 100}%`,
                    background: phaseVar(i), opacity: 0.7,
                  }} />
                ))}
              </div>
              <div className="tl-key">
                {spans.map((sp, i) => (
                  <span key={i}>
                    <i style={{ background: phaseVar(i) }} />
                    {sp.from}–{sp.isLast ? END_AGE : sp.to} at {sp.rate}%
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="h3t">
            <h2 className="h" id="h3t">What happens to the pot</h2>
            <p className="lede">
              Bars are the pot in <strong>future £</strong> — the cash showing in the account that year.
              The dashed line is the same pot in <strong>today&rsquo;s £</strong>. The gap between them is
              inflation quietly doing its work.
            </p>
            <div className="card">
              <h3>Pot value, age {s.currentAge} to {END_AGE}</h3>
              <Chart years={P.years} showToday={showToday} />
              <div className="legend">
                <span><i style={{ background: "var(--accent-2)" }} />Building up</span>
                {spans.map((sp, i) => (
                  <span key={i}><i style={{ background: phaseVar(i) }} />{i + 1}. {sp.label || "Phase"}</span>
                ))}
                <span><i className="dash" />Today&rsquo;s £</span>
              </div>
            </div>

            <div className="card">
              <h3>Pot at key ages</h3>
              <p className="tcap">{basisCaption(showToday)}</p>
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr><th>Age</th><th>Pot</th><th>Rate</th><th>Phase</th></tr>
                  </thead>
                  <tbody>
                    {potAges.map((a) => {
                      const r = P.years.find((y) => y.age === a);
                      if (!r) return null;
                      const col = r.phaseIndex >= 0 ? phaseVar(r.phaseIndex) : undefined;
                      const name = r.phaseIndex >= 0 && s.phases[r.phaseIndex]
                        ? `${r.phaseIndex + 1}. ${s.phases[r.phaseIndex].label || "Phase"}`
                        : r.drawing ? "Depleted" : "Building up";
                      return (
                        <tr key={a} className={a === start ? "key-row" : undefined}>
                          <td>{a}</td>
                          <td><Cell cash={r.pot} today={r.potToday} showToday={showToday} /></td>
                          <td style={col ? { color: col, fontWeight: 600 } : undefined} className={col ? undefined : "muted"}>
                            {r.rate > 0 ? `${r.rate}%` : "—"}
                          </td>
                          <td style={col ? { color: col } : undefined} className={col ? undefined : "muted"}>{name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="notes">
              <h3>What this does and doesn&rsquo;t count</h3>
              <ul>
                <li>Growth is applied each year after contributions. <strong>Today&rsquo;s £</strong> figures discount the future amount back at {s.inflation}% inflation — the same thing economists call <em>real terms</em>.</li>
                <li>Platform and fund charges are <strong>not</strong> deducted — typically 0.3–0.8% combined. Lower the growth rate to allow for them.</li>
                <li>The State Pension (around £11,500 a year from 67) is <strong>not</strong> included, and would sit on top of this.</li>
                <li>Income tax on anything above the tax-free portion is <strong>not</strong> modelled.</li>
                <li>Tax-free cash is capped at {full(TAX_FREE_CAP)}; the annual allowance is {full(ANNUAL_ALLOWANCE)}. Minimum access age rises to 57 in 2028.</li>
                <li>From April 2027 pensions fall within Inheritance Tax.</li>
              </ul>
              <div className="warnbox">
                <strong>Not financial advice.</strong> A simplified projection for exploring scenarios.
                Speak to a regulated adviser before acting on it.
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="h4t">
            <h2 className="h" id="h4t">What you actually receive</h2>
            <p className="lede">
              Every payment the plan produces, year by year — <strong>drawdown income and tax-free cash</strong>,
              each in future £ and in today&rsquo;s £. Income falls over time because each phase draws a
              percentage of a shrinking pot.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">First year&rsquo;s income</span>
                <span className="v">{firstIncome ? full(showToday ? firstIncome.annualToday : firstIncome.annual) : "—"}</span>
                <span className="s">
                  {firstIncome
                    ? `${full(showToday ? firstIncome.monthlyToday : firstIncome.monthly)} a month at ${firstIncome.age}`
                    : "no drawdown set"}
                </span>
              </span>
              <span className="e">
                <span className="k">Drawdown, lifetime</span>
                <span className="v">{money(showToday ? totals.today : totals.cash)}</span>
                <span className="s">taxable as income</span>
              </span>
              <span className="e">
                <span className="k">Tax-free, lifetime</span>
                <span className="v">{money(showToday ? totals.tfToday : totals.tfCash)}</span>
                <span className="s">{s.taxFreeYears > 1 ? `${s.taxFreeYears} tranches` : "one lump sum"}</span>
              </span>
            </div>

            <div className="card">
              <h3>Payment schedule</h3>
              <p className="tcap">{basisCaption(showToday)}</p>
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Age</th><th>Rate</th><th>Tax-free cash</th><th>Annual income</th><th>Monthly income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRows.length === 0 && (
                      <tr><td colSpan={5} className="muted">No payments yet — set a drawdown age on step 03.</td></tr>
                    )}
                    {incomeRows.map((r) => {
                      const col = r.phaseIndex >= 0 ? phaseVar(r.phaseIndex) : undefined;
                      return (
                        <tr key={r.age} className={r.taxFree > 0 ? "tf-row" : undefined}>
                          <td>{r.age}</td>
                          <td style={col ? { color: col, fontWeight: 600 } : undefined} className={col ? undefined : "muted"}>
                            {r.rate > 0 ? `${r.rate}%` : "—"}
                          </td>
                          <td>{r.taxFree > 0
                            ? <Cell cash={r.taxFree} today={r.taxFreeToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                          <td>{r.annual > 0
                            ? <Cell cash={r.annual} today={r.annualToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                          <td>{r.annual > 0
                            ? <Cell cash={r.monthly} today={r.monthlyToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total paid out</td>
                      <td><Cell cash={totals.tfCash} today={totals.tfToday} showToday={showToday} /></td>
                      <td><Cell cash={totals.cash} today={totals.today} showToday={showToday} /></td>
                      <td className="muted" style={{ fontWeight: 400 }}>over {incomeRows.length} years</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="notes">
              <h3>Before you spend it</h3>
              <ul>
                <li>Tax-free cash is genuinely tax free. <strong>Drawdown income is not</strong> — it is taxed as income at your marginal rate, so the take-home figure is lower than shown.</li>
                <li>The State Pension (around £11,500 a year from 67) would sit on top of these figures and is taxable too.</li>
                <li>Totals are the sum of every payment across the whole projection, not an amount available at any one moment.</li>
              </ul>
            </div>
          </section>
        )}

        <nav className="fnav">
          <button type="button" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
          <button type="button" className="primary" onClick={() => go(step === STEPS.length - 1 ? 0 : step + 1)}>
            {step === STEPS.length - 1 ? "Start again" : "Next"}
          </button>
        </nav>

        <p className="foot">
          Your figures stay in this browser — nothing is sent anywhere.<br />
          <a href="https://github.com/clemmo93/pension-planner">Source on GitHub</a>
        </p>
      </div>
    </>
  );
}
