import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { project, phaseSpans, incomeStartAge, sustainableRate, resolvedStatePensionAge, statePensionAge,
  TAX_FREE_CAP, ANNUAL_ALLOWANCE, STATE_PENSION_ANNUAL, END_AGE } from "./projection.js";

const STORE_KEY = "pension-planner.v3";

// Contributions default to rising with inflation: a pay rise that merely keeps
// pace leaves you contributing the same in real terms. Anything lower means
// your contributions quietly shrink every year.
const DEFAULT_INFLATION = 2.5;

// The withdrawal-rate slider's bounds. Named because the copy quotes the floor
// when the sustainable rate falls below it, and a note that contradicts the
// slider it sits under would be worse than no note.
const RATE_MIN = 1;
const RATE_MAX = 15;

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
  // "lump" crystallises slices and pays the tax-free cash up front.
  // "ufpls" leaves the pot alone and makes every payment 25% tax free.
  taxFreeMode: "lump",
  drawdownFollowsTaxFree: false,
  // On by default: leaving it out understates almost everyone's retirement
  // income, and by 90 it is the larger half of it. null age means "work it out
  // from my age"; moving the slider pins an explicit one.
  statePension: true,
  statePensionAge: null,
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
  { n: "02", t: "Contributions" },
  { n: "03", t: "Tax-free cash" },
  { n: "04", t: "Drawdown" },
  { n: "05", t: "Pot value" },
  { n: "06", t: "Income" },
];

/* --------------------------------------------------------- contextual help */

/**
 * A tap-to-open explainer beside a label. Tap rather than hover: a hover-only
 * tooltip is unreachable on a phone, which is where most of these get read.
 */
function Info({ title, children }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(null);
  const wrap = useRef(null);
  const pop = useRef(null);

  // Placed with position: fixed and measured here, rather than anchored in the
  // flow. An absolutely positioned popover next to a control on the right of
  // the screen adds scrollable overflow, and under mobile emulation that
  // widens the layout viewport — so clamping it against window.innerWidth
  // chases a number the popover itself has already moved. Taking it out of
  // flow removes the feedback loop, and clientWidth then stays put.
  useLayoutEffect(() => {
    if (!open) { setAt(null); return; }
    const btn = wrap.current?.querySelector(".info-btn");
    const el = pop.current;
    if (!btn || !el) return;
    const b = btn.getBoundingClientRect();
    const gutter = 12;
    const room = document.documentElement.clientWidth - gutter - el.offsetWidth;
    // Flip above the button when there is no room beneath it. Opening below
    // the fold would be unreadable, and scrolling to it closes it.
    const below = b.bottom + 7;
    const fits = below + el.offsetHeight <= document.documentElement.clientHeight - gutter;
    setAt({
      top: fits ? below : Math.max(gutter, b.top - 7 - el.offsetHeight),
      left: Math.max(gutter, Math.min(b.left - 8, room)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    // Fixed position cannot follow the page, so close rather than drift.
    const scrolled = () => setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, true);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scrolled, true);
    };
  }, [open]);

  return (
    <span className="info" ref={wrap}>
      <button
        type="button" className="info-btn" aria-expanded={open}
        aria-label={open ? `Hide help for ${title}` : `What is ${title}?`}
        onClick={() => setOpen((o) => !o)}
      >i</button>
      {open && (
        <span
          className="info-pop" role="tooltip" ref={pop}
          style={at ? { top: at.top, left: at.left } : { visibility: "hidden" }}
        >
          <b>{title}</b>
          {children}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------- how it works */

const WALKTHROUGH = [
  {
    icon: "①",
    title: "You",
    body: "Your age today, what you have saved so far, and the two assumptions everything else rests on: investment growth and inflation.",
    why: "Growth has the largest effect of anything here. One percentage point over thirty years changes the final pot more than any other single choice.",
  },
  {
    icon: "②",
    title: "Contributions",
    body: "What you and your employer pay in each year, and how much that rises annually.",
    why: "If your contributions rise more slowly than inflation, you are quietly paying in less every year without changing anything.",
  },
  {
    icon: "③",
    title: "Tax-free cash",
    body: `A quarter of whatever you move into drawdown is tax free, up to ${full(TAX_FREE_CAP)} in total. Take it in one go or in slices over several years.`,
    why: "Money you have not moved yet keeps growing, so slices taken later release more tax-free cash. Below the cap, spreading can be worth tens of thousands.",
  },
  {
    icon: "④",
    title: "Drawdown",
    body: "When you start taking an income, and what percentage of the remaining pot you take each year. You can set up to four phases with different rates.",
    why: "Most people spend more in early retirement than later. Phases let you plan for that instead of assuming one flat rate forever.",
  },
  {
    icon: "⑤",
    title: "Pot value",
    body: "What happens to the pot year by year, in cash and in today's money.",
    why: "The gap between the two lines is inflation. A pot that looks like it is growing can be standing still in real terms.",
  },
  {
    icon: "⑥",
    title: "Income",
    body: "Every payment the plan produces: drawdown income and tax-free cash, year by year.",
    why: "This is the part you actually live on. The pot is only a means to it.",
  },
];

function HowItWorks({ onClose }) {
  const panel = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      // Keep tabbing inside the panel while it is open.
      const items = panel.current?.querySelectorAll("button, [href]");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="sheet" role="dialog" aria-modal="true" aria-labelledby="hiw-title"
        ref={panel} tabIndex={-1}
      >
        <div className="sheet-head">
          <h2 id="hiw-title">How it works</h2>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="sheet-body">
          <p className="sheet-lede">
            Six steps, from what you have now to what you will actually receive. Change anything at
            any point — the summary at the top updates as you go.
          </p>
          {WALKTHROUGH.map((w) => (
            <div className="hiw" key={w.title}>
              <span className="hiw-icon" aria-hidden="true">{w.icon}</span>
              <div>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
                <p className="hiw-why"><b>Why it matters.</b> {w.why}</p>
              </div>
            </div>
          ))}
          <div className="notes">
            <h3>What this leaves out</h3>
            <ul>
              <li>Income tax. Drawdown income is taxable, so your take-home is lower than the figures shown. Tax-free cash is not.</li>
              <li>The State Pension, {full(STATE_PENSION_ANNUAL)} a year at the full rate. Switch it on at step 04 and it is added from the age you reach it.</li>
              <li>Platform and fund charges, usually 0.3–0.8% a year. Lower the growth rate to allow for them.</li>
            </ul>
            <div className="warnbox">
              <strong>Not financial advice.</strong> A simplified projection for exploring scenarios.
              Speak to a regulated adviser before acting on it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ control */

function Control({ id, label, value, onChange, min, max, step, fmt, note, typed, hardMax, info, mark }) {
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
        <label htmlFor={id}>
          {label}
          {info && <Info title={label}>{info}</Info>}
        </label>
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
        <span className="ctl-slider">
          <input
            type="range" id={id}
            min={min} max={max} step={step} value={value}
            aria-describedby={`${id}-note`}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
          {/* A reference point on the track. Offset by half a thumb at each end
              because that is the travel a range input actually has. Skipped
              when it falls outside the range, where there is nothing to point
              at and the note says so instead. */}
          {mark != null && mark >= min && mark <= max && (
            <i
              className="ctl-mark" aria-hidden="true"
              style={{ "--mark": (mark - min) / (max - min) }}
            />
          )}
        </span>
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

/**
 * The pot year by year, as a vertical ladder.
 *
 * Age runs down the page, so the time axis gets the scroll direction and about
 * four times the room it had lying on its side — every year is a real row
 * instead of a 3.6px bar you cannot tap. It replaces both the horizontal chart
 * and the separate key-ages table, which were two readings of one dataset in
 * two cards. The at-a-glance silhouette stays with the sparkline in the header.
 *
 * Each bar carries both bases at once: the pale tail is future £, the solid
 * fill is today's £, and the gap between them is inflation. Every row is a real
 * table row, so the figures are finally reachable by a screen reader — the old
 * chart was a single role="img" with the data locked inside it.
 */
function PotLadder({ years, showToday, keyAges, start, taxFreeAge, statePensionAge: spAge }) {
  const max = Math.max(...years.map((y) => y.pot), 1);
  const keys = new Set(keyAges);

  return (
    <table className="ladder">
      <caption className="vh">
        Projected pension pot for each year from age {years[0]?.age} to {END_AGE}
      </caption>
      <thead>
        <tr>
          <th scope="col">Age</th>
          <th scope="col" className="vh">Pot, relative size</th>
          <th scope="col">{showToday ? "Today\u2019s \u00a3" : "Future \u00a3"}</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y) => {
          const isKey = keys.has(y.age);
          // Accumulation and drawdown are only a hue apart, and phase 1's gold
          // sits right next to the building-up gold. A rule at the boundary is
          // what actually tells you where your working life ends.
          const isStart = y.age === start;
          const mark = y.age === start ? "Income begins"
            : y.age === taxFreeAge ? "Tax-free cash"
            : y.age === spAge ? "State Pension" : null;
          const colour = !y.drawing
            ? "var(--accent-2)"
            : y.phaseIndex >= 0 ? phaseVar(y.phaseIndex) : "var(--crit)";
          return (
            <tr
              key={y.age}
              className={`lrow${isKey ? " is-key" : ""}${mark ? " is-mark" : ""}${isStart ? " is-start" : ""}`}
            >
              <th scope="row" className="lage">{y.age}</th>
              <td className="lbar">
                <span className="track">
                  <i className="tail" style={{ width: `${(y.pot / max) * 100}%`, background: colour }} />
                  <i className="fill" style={{ width: `${(y.potToday / max) * 100}%`, background: colour }} />
                </span>
                {/* Floated over the bar rather than stacked under the figure:
                    a marker that adds a line would make its row taller than
                    every other year, and bend the age axis at exactly the
                    point people look hardest. */}
                {mark && <span className="lmark">{mark}</span>}
              </td>
              <td className="lval">{money(showToday ? y.potToday : y.pot)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
  const [helpOpen, setHelpOpen] = useState(false);
  // One phase editor open at a time. Four expanded editors were most of step
  // 04's length, and nobody tunes four withdrawal rates at once.
  const [openPhase, setOpenPhase] = useState(null);

  const update = (patch) => setS((prev) => {
    const next = { ...prev, ...patch };
    // Keep the linked drawdown age in step with the tax-free settings, wherever
    // the change came from — the age slider, the phasing, or the mode.
    if (next.drawdownFollowsTaxFree && next.taxFreeMode === "lump") {
      next.drawdownAge = Math.min(75, Math.max(55, next.taxFreeTakeAge + next.taxFreeYears));
    }
    saveState(next);
    return next;
  });

  const updatePhase = (i, patch) => update({
    phases: s.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)),
  });

  // The last phase carries a sentinel length because it always runs to the end.
  // Appending after it makes that length real, so hand it half of what is left
  // — otherwise the new phase is born spanning 90 to 90 with nothing in it.
  // Open it straight away: adding a phase and seeing nothing editable appear
  // reads as a bug.
  const addPhase = () => {
    const last = s.phases.length - 1;
    const room = Math.max(END_AGE - spans[last].from, 2);
    const keep = Math.max(1, Math.min(30, Math.round(room / 2)));
    const kept = s.phases.map((p, i) => (i === last ? { ...p, years: keep } : p));
    update({ phases: [...kept, { rate: 3, years: 99, label: "New phase" }] });
    setOpenPhase(s.phases.length);
  };

  // Remove only appears inside the open phase's own editor, so the phase being
  // removed is always the open one — there is no later index to shift down.
  const removePhase = (i) => {
    update({ phases: s.phases.filter((_, j) => j !== i) });
    setOpenPhase(null);
  };

  const P = useMemo(() => project(s), [s]);
  const spans = useMemo(() => phaseSpans(s), [s]);
  const start = incomeStartAge(s);
  const showToday = s.showToday;
  const lumpMode = s.taxFreeMode === "lump";

  const go = (i) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const { firstIncome, atRetirement } = P;
  // A percentage of whatever is left cannot reach zero, so the pot always
  // outlasts the projection. TODO in TODO.md: this chip should describe the
  // real-terms trajectory instead of restating something always true.
  const chipClass = "is-good";

  // One number for the whole plan: the rate that holds the pot level in real
  // terms. Below the slider's floor, or at or under zero, there is no rate
  // worth pointing at and the copy has to say that rather than print it.
  const spAge = resolvedStatePensionAge(s);
  const derivedSpAge = statePensionAge(s.currentAge);

  const rStar = sustainableRate(s);
  const rStarText = `${rStar.toFixed(1)}%`;
  const rStarUsable = rStar > 0;

  // A year paying only the State Pension is still a year you are paid, so it
  // earns a row once the State Pension is switched on.
  const incomeRows = P.years.filter((y) => y.annual > 0 || y.taxFree > 0 || y.statePension > 0);
  const totals = incomeRows.reduce((a, r) => ({
    tfCash: a.tfCash + r.taxFree, tfToday: a.tfToday + r.taxFreeToday,
    incCash: a.incCash + r.incomeAnnual, incToday: a.incToday + r.incomeAnnualToday,
  }), { tfCash: 0, tfToday: 0, incCash: 0, incToday: 0 });

  // The single year the income columns step up, when there is one to flag.
  const spStarts = s.statePension && P.years.some((y) => y.age === spAge && y.incomeAnnual > 0)
    ? spAge : null;

  // Step 03's tiles were the only money figures ignoring the basis toggle.
  const taxFreeTotalToday = P.taxFreePayments.reduce((a, y) => a + y.taxFreeToday, 0);
  const taxFreeShown = showToday ? taxFreeTotalToday : P.taxFreeTotal;

  const potAges = useMemo(() => {
    const ages = new Set([s.currentAge, start]);
    for (let a = Math.ceil((s.currentAge + 1) / 5) * 5; a <= END_AGE; a += 5) ages.add(a);
    return [...ages].filter((a) => a >= s.currentAge && a <= END_AGE).sort((a, b) => a - b);
  }, [s.currentAge, start]);

  return (
    <>
      {helpOpen && <HowItWorks onClose={() => setHelpOpen(false)} />}

      <div className="verdict">
        <div className="verdict-in">
          <div className="verdict-top">
            <span className={`chip ${chipClass}`}>
              <span className="dot" />
              {`Lasts beyond ${END_AGE}`}
            </span>
            <button type="button" className="hiw-btn" onClick={() => setHelpOpen(true)}>
              <span aria-hidden="true">i</span> How it works
            </button>
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
              {/* Normally the first year of drawdown is a decade before the
                  State Pension, so the label needs no qualifier. It only earns
                  one in the rare case where both are paid that year. */}
              <span className="k">
                Monthly Income, Year 1
                {s.statePension && firstIncome && firstIncome.age >= spAge && " (from your pot)"}
              </span>
              <span className="v">{firstIncome ? full(showToday ? firstIncome.monthlyToday : firstIncome.monthly) : "—"}</span>
              <span className="s">
                {firstIncome
                  ? `Retiring at ${firstIncome.age}, drawing ${firstIncome.rate}%.`
                  : "set a drawdown age"}
              </span>
            </span>
            <span className="fig">
              <span className="k">Pot at Retirement</span>
              <span className="v">{atRetirement ? money(showToday ? atRetirement.potGrossToday : atRetirement.potGross) : "—"}</span>
              <span className="s">at {start}, before any withdrawal</span>
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
              Your starting point, and the two rates everything else is built on.
              <strong> Growth matters most</strong> — a single percentage point, compounded over
              thirty years, moves the final pot more than any other choice here.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Pot at {start}</span>
                <span className="v">
                  {atRetirement ? money(showToday ? atRetirement.potGrossToday : atRetirement.potGross) : "—"}
                </span>
                {/* The second line carries whichever basis the big figure is not,
                    so both numbers stay on screen either way round. */}
                <span className="s">
                  {atRetirement
                    ? showToday
                      ? `${money(atRetirement.potGross)} in future £`
                      : `${money(atRetirement.potGrossToday)} in today’s £`
                    : ""}
                </span>
              </span>
              <span className="e">
                <span className="k">You will have paid in</span>
                <span className="v">{money(showToday ? P.contributedTotalToday : P.contributedTotal)}</span>
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
                info="The total across all your pensions today. If you have several, add them up. Old workplace pensions are easy to forget."
              />
            </div>

            <div className="card">
              <h3>Assumptions</h3>
              <Control
                id="growth" label="Growth rate" value={s.growth} min={0} max={12} step={0.25}
                fmt={(v) => `${v}%`} onChange={(v) => update({ growth: v })}
                note={s.growth >= 8
                  ? "Optimistic for a long horizon — fees are not deducted."
                  : "Before platform and fund charges of roughly 0.3–0.8%."}
                info="The average yearly return on your investments, before charges. Most platforms and funds take 0.3–0.8% a year, so lower this figure to allow for them. This has a bigger effect than anything else on the page."
              />
              <Control
                id="inflation" label="Inflation" value={s.inflation} min={0} max={6} step={0.25}
                fmt={(v) => `${v}%`} onChange={(v) => update({ inflation: v })}
                note="Sets how far future £ are discounted to today’s £, and what your contributions have to beat."
                info="How fast prices rise. It decides what a future pound is worth today. The Bank of England targets 2%. Over thirty years, 2.5% roughly halves what a pound buys."
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="h1">
            <h2 className="h" id="h1">What you pay in</h2>
            <p className="lede">
              What goes into the pot each year while you are working, and how fast that rises.
              Contributions stop the year you start drawing an income.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Paying in now</span>
                <span className="v">{full(s.annualContrib)}</span>
                <span className="s">a year, from age {s.currentAge}</span>
              </span>
              <span className="e">
                <span className="k">Total by {start}</span>
                <span className="v">{money(showToday ? P.contributedTotalToday : P.contributedTotal)}</span>
                <span className="s">over {P.contributions.length} years</span>
              </span>
            </div>

            <div className="card">
              <h3>Your contributions</h3>
              <Control
                id="contrib" label="Annual contributions" value={s.annualContrib} min={0} max={ANNUAL_ALLOWANCE} step={250}
                fmt={full} typed hardMax={ANNUAL_ALLOWANCE} onChange={(v) => update({ annualContrib: v })}
                note={s.annualContrib >= ANNUAL_ALLOWANCE
                  ? `At the ${full(ANNUAL_ALLOWANCE)} annual allowance.`
                  : "You and your employer combined, before tax relief limits."}
                info={`Everything going in each year: your own payments, your employer's, and the tax relief. The most you can pay in with tax relief is ${full(ANNUAL_ALLOWANCE)} a year.`}
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
                info="How much more you pay in each year, usually because your salary went up. If this is lower than inflation, you are paying in less every year in real terms without noticing."
              />
            </ContributionTrajectory>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="h2t">
            <h2 className="h" id="h2t">Taking your money out</h2>
            <p className="lede">
              You get <strong>25% tax free</strong>, capped at {full(TAX_FREE_CAP)} over your lifetime. Take it
              as cash up front, or let a quarter of every payment come to you tax free instead.
            </p>
            <div className="echo">
              <span className="e">
                <span className="k">Tax-free cash</span>
                <span className="v">{money(taxFreeShown)}</span>
                <span className="s">
                  {P.taxFreeTotal >= TAX_FREE_CAP - 1
                    ? `at the ${full(TAX_FREE_CAP)} cap`
                    : `${s.taxFreePct}% of the pot at ${s.taxFreeTakeAge}`}
                </span>
              </span>
              {s.taxFreeMode === "lump" ? (
                <span className="e">
                  <span className="k">{P.taxFreePayments.length > 1 ? "Each year" : "As one lump"}</span>
                  <span className="v">
                    {P.taxFreePayments.length
                      ? money(taxFreeShown / P.taxFreePayments.length)
                      : "—"}
                  </span>
                  <span className="s">
                    {P.taxFreePayments.length > 1
                      ? `ages ${P.taxFreePayments[0].age}–${P.taxFreePayments[P.taxFreePayments.length - 1].age}`
                      : "tax free"}
                  </span>
                </span>
              ) : (
                <span className="e">
                  <span className="k">Tax free until</span>
                  <span className="v">
                    {(() => {
                      const capped = P.years.find((y) => y.withdrawal > 0 && y.taxFree < y.withdrawal * (s.taxFreePct / 100) - 0.01);
                      return capped ? `age ${capped.age}` : "age 90";
                    })()}
                  </span>
                  <span className="s">then payments are fully taxable</span>
                </span>
              )}
            </div>

            <div className="card">
              <h3>How you take it</h3>
              <div className="modes" role="radiogroup" aria-label="How to take tax-free cash">
                <button
                  type="button" role="radio" aria-checked={s.taxFreeMode === "lump"}
                  onClick={() => update({ taxFreeMode: "lump" })}
                >
                  <b>As a lump sum</b>
                  <span>Take the tax-free cash up front, in one go or over a few years. Income is taxable after that.</span>
                </button>
                <button
                  type="button" role="radio" aria-checked={s.taxFreeMode === "ufpls"}
                  onClick={() => update({ taxFreeMode: "ufpls" })}
                >
                  <b>25% of every payment</b>
                  <span>Take nothing up front. A quarter of each withdrawal is tax free until the lifetime cap is used up.</span>
                </button>
              </div>
            </div>

            <div className="card">
              <h3>{s.taxFreeMode === "lump" ? "Tax-free cash" : "Tax-free share"}</h3>
              <Control
                id="tfpct" label="Tax-free share" value={s.taxFreePct} min={0} max={25} step={1}
                fmt={(v) => `${v}%`} onChange={(v) => update({ taxFreePct: v })}
                note={s.taxFreePct === 25
                  ? `The maximum, capped at ${full(TAX_FREE_CAP)}.`
                  : "Below the 25% maximum — the rest stays invested."}
                info={`A quarter of whatever you move into drawdown comes to you tax free, up to ${full(TAX_FREE_CAP)} across your lifetime. The other three quarters stay invested and are taxed only when you withdraw them.`}
              />
              {s.taxFreeMode === "ufpls" && (
                <p className="tcap" style={{ margin: "10px 0 0" }}>
                  Nothing is taken up front. Each withdrawal is {s.taxFreePct}% tax free until
                  you have had {full(TAX_FREE_CAP)} in total, after which payments are fully taxable.
                </p>
              )}
              {s.taxFreeMode === "lump" && <>
              <Control
                id="tfage" label="Take it from age" value={s.taxFreeTakeAge} min={55} max={75} step={1}
                fmt={(v) => String(v)} onChange={(v) => update({ taxFreeTakeAge: v })}
                note={s.taxFreeTakeAge < 57
                  ? "Minimum access age rises to 57 in 2028."
                  : "At or above the 2028 minimum access age."}
                info="The earliest you can touch a pension is 55 today, rising to 57 in 2028. Waiting longer leaves the pot invested, so there is usually more to take."
              />
              <Control
                id="tfyears" label="Spread over" value={s.taxFreeYears} min={1} max={15} step={1}
                fmt={(v) => (v === 1 ? "1 year" : `${v} years`)} onChange={(v) => update({ taxFreeYears: v })}
                note={s.taxFreeYears === 1
                  ? "One lump sum."
                  : P.taxFreePayments.length
                    ? `Phased over ${P.taxFreePayments[0].age}–${P.taxFreePayments[P.taxFreePayments.length - 1].age}. Each slice is taken from a pot that has had longer to grow.`
                    : "Nothing to take — set a tax-free share above 0%."}
                info="You do not have to move the whole pot into drawdown at once. Take it in slices and the part you have not touched keeps growing, so later slices release more tax-free cash. Providers call this phased crystallisation. It makes no difference once you reach the lifetime cap."
              />
              </>}
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="h3t">
            <h2 className="h" id="h3t">How you&rsquo;ll spend it</h2>
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
                <span className="k">Pot at {END_AGE}</span>
                <span className="v">
                  {money(showToday
                    ? P.years[P.years.length - 1].potToday
                    : P.years[P.years.length - 1].pot)}
                </span>
                <span className="s">{showToday ? "in today\u2019s \u00a3" : "in future \u00a3"}</span>
              </span>
              <span className="e">
                <span className="k">
                  Sustainable rate
                  <Info title="Sustainable rate">
                    Draw this much each year and the pot holds its value in today&rsquo;s money. It
                    is set by your growth and inflation rates, not by the size of your pot. Draw
                    more and the pot shrinks in real terms; draw less and it grows. Most people
                    spend their pot down across retirement and vary what they take year to year,
                    so treat it as a reference point, not a target.
                  </Info>
                </span>
                <span className="v">{rStarUsable ? rStarText : "—"}</span>
                <span className="s">
                  {!rStarUsable
                    ? "growth does not beat inflation"
                    : rStar < 1
                      ? "below the lowest rate you can set"
                      : "holds the pot level in today\u2019s £"}
                </span>
              </span>
            </div>

            <div className="card">
              <h3>Start of drawdown</h3>
              {s.taxFreeMode === "lump" && (
                <label className="linked">
                  <input
                    type="checkbox" checked={s.drawdownFollowsTaxFree}
                    onChange={(e) => update({ drawdownFollowsTaxFree: e.target.checked })}
                  />
                  <span>
                    <b>Start when the tax-free cash ends</b>
                    Income begins at {Math.min(75, Math.max(55, s.taxFreeTakeAge + s.taxFreeYears))}, the
                    year after the last tax-free payment. Those years are then entirely tax free.
                  </span>
                </label>
              )}
              <Control
                id="ddage" label="Start drawing at" value={s.drawdownAge} min={55} max={75} step={1}
                fmt={(v) => String(v)} onChange={(v) => update({ drawdownAge: v, drawdownFollowsTaxFree: false })}
                note={s.drawdownFollowsTaxFree && s.taxFreeMode === "lump"
                  ? "Following the tax-free settings. Move this slider to unlink it."
                  : s.taxFreeTakeAge > s.drawdownAge && s.taxFreeMode === "lump"
                    ? `Income waits until ${start}, when tax-free cash is taken.`
                    : `Contributions stop at ${start}.`}
                info="The age you start taking a regular income. Contributions stop at the same point, so retiring later means both a bigger pot and fewer years to fund."
              />
            </div>

            {/* The State Pension belongs on this screen rather than with the
                results: knowing it arrives at 68 is what makes it worth drawing
                harder from the pot before then and easing off after. */}
            <div className="card">
              <h3>State Pension</h3>
              <label className="linked">
                <input
                  type="checkbox" checked={s.statePension}
                  onChange={(e) => update({ statePension: e.target.checked })}
                />
                <span>
                  <b>Include the State Pension</b>
                  {full(STATE_PENSION_ANNUAL)} a year at today&rsquo;s full rate, on top of anything
                  you take from the pot. It rises with inflation here, so it holds its value.
                </span>
              </label>
              {s.statePension && (
                <Control
                  id="spage" label="You receive it from" value={spAge} min={60} max={75} step={1}
                  fmt={(v) => String(v)}
                  onChange={(v) => update({ statePensionAge: v })}
                  note={s.statePensionAge === null
                    ? `${derivedSpAge} under the law as it stands, going by your age. Move this to test a change.`
                    : `Set by you. ${derivedSpAge} is what the current timetable gives someone aged ${s.currentAge}.`}
                  info="State Pension age is 66, rising to 67 by 2028 and to 68 between 2044 and 2046. Which one applies depends on when you were born. A government review could bring the rise forward, which is why this is adjustable."
                />
              )}
            </div>

            <div className="card">
              <h3>Phases</h3>
              <p className="tcap">
                The bar is your whole retirement, split by rate. Tap a phase to change it.
              </p>

              <div className="timeline">
                {spans.map((sp, i) => (
                  <i key={i} style={{
                    width: `${((sp.to - sp.from) / Math.max(END_AGE - start, 1)) * 100}%`,
                    background: phaseVar(i),
                    opacity: openPhase === null || openPhase === i ? 0.85 : 0.28,
                  }} />
                ))}
              </div>

              {/* Collapsed rows carry the two things people scan for — the age
                  span and the rate — so the editor only opens when there is
                  something to change. The rows double as the timeline's key. */}
              <ul className="ph-list">
                {s.phases.map((p, i) => {
                  const sp = spans[i];
                  const open = openPhase === i;
                  const to = sp.isLast ? END_AGE : sp.to;
                  const name = p.label || `Phase ${i + 1}`;
                  return (
                    <li className={`ph-item${open ? " is-open" : ""}`} key={i}>
                      <button
                        type="button" className="ph-row"
                        aria-expanded={open} aria-controls={`ph-body-${i}`}
                        aria-label={`${name}, age ${sp.from} to ${to}, ${p.rate}%`}
                        onClick={() => setOpenPhase(open ? null : i)}
                      >
                        <span className="swatch" style={{ background: phaseVar(i) }} aria-hidden="true">{i + 1}</span>
                        <span className="ph-name">{name}</span>
                        <span className="ph-span">{sp.from}&ndash;{to}</span>
                        <span className="ph-rate" style={{ color: phaseVar(i) }}>{p.rate}%</span>
                        <span className="ph-chev" aria-hidden="true" />
                      </button>
                      {open && (
                        <div className="ph-body" id={`ph-body-${i}`}>
                          <label className="ph-field">
                            <span>Name</span>
                            <input
                              className="nm" value={p.label}
                              onChange={(e) => updatePhase(i, { label: e.target.value })}
                            />
                          </label>
                          <div className="phase-span">
                            {sp.isLast
                              ? `Age ${sp.from} onwards, until the pot runs out or ${END_AGE}.`
                              : `Age ${sp.from} to ${sp.to}.`}
                          </div>
                          {/* The note used to hard-code 6% and 4%, and the tooltip
                              a third figure of 5%, none of which moved when growth
                              or inflation changed. At 3% growth and 2.5% inflation
                              it called a plan that loses 69% in real terms
                              "conservative". Both now come from the rate that
                              actually holds the pot level. */}
                          <Control
                            id={`rate-${i}`} label="Withdrawal rate" value={p.rate}
                            min={RATE_MIN} max={RATE_MAX} step={0.25}
                            fmt={(v) => `${v}%`} onChange={(v) => updatePhase(i, { rate: v })}
                            mark={rStarUsable ? rStar : null}
                            note={!rStarUsable
                              ? "Growth does not beat inflation, so every rate shrinks the pot."
                              : rStar < RATE_MIN
                                ? `The pot only holds its value at ${rStarText} a year or less. The lowest you can set is ${RATE_MIN}%, so every rate here shrinks it.`
                                : p.rate > rStar
                                  ? `Above ${rStarText} a year — the pot shrinks in today\u2019s money.`
                                  : `At or below ${rStarText} a year — the pot keeps its value.`}
                            info="The share of the remaining pot you take each year, so the amount changes as the pot does. Drawing more than the sustainable rate shrinks the pot in real terms; drawing less grows it."
                          />
                          {!sp.isLast && (
                            <Control
                              id={`yrs-${i}`} label="Lasts for" value={p.years} min={1} max={30} step={1}
                              fmt={(v) => (v === 1 ? "1 year" : `${v} years`)}
                              onChange={(v) => updatePhase(i, { years: v })}
                              note="Changing this shifts every later phase."
                            />
                          )}
                          {s.phases.length > 1 && (
                            <button type="button" className="btn ph-remove" onClick={() => removePhase(i)}>
                              Remove this phase
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button" className="btn btn-add" disabled={s.phases.length >= 4}
                onClick={addPhase}
              >Add a phase</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="h4t">
            <h2 className="h" id="h4t">What happens to the pot</h2>
            <p className="lede">
              One bar for every year of your life from {s.currentAge} to {END_AGE}. The solid part is
              what the pot buys in <strong>today&rsquo;s £</strong>; the pale tail is the bigger number
              that will show in the account. The gap between them is inflation quietly doing its work.
            </p>
            <div className="card">
              <h3>
                Pot value, age {s.currentAge} to {END_AGE}
                <Info title="Reading the bars">
                  Each bar is one year. The solid part is what the pot buys in today&rsquo;s prices;
                  the pale tail is the larger number that will actually show in the account. The gap
                  between them is {s.inflation}% inflation, compounding over {END_AGE - s.currentAge} years.
                </Info>
              </h3>
              <p className="tcap">
                Balance at the end of each year, after anything taken that year.
              </p>
              <PotLadder
                years={P.years} showToday={showToday} keyAges={potAges} start={start}
                taxFreeAge={P.taxFreePayments[0]?.age}
                statePensionAge={s.statePension ? spAge : undefined}
              />
              <div className="legend">
                <span><i style={{ background: "var(--accent-2)" }} />Building up</span>
                {spans.map((sp, i) => (
                  <span key={i}>
                    <i style={{ background: phaseVar(i) }} />
                    {i + 1}. {sp.label || "Phase"} &middot; {sp.rate}%
                  </span>
                ))}
                {/* Keyed off the bars themselves: only worth a key when there
                    are red bars on screen to explain. */}
                {P.years.some((y) => y.drawing && y.phaseIndex < 0) && (
                  <span><i style={{ background: "var(--crit)" }} />Pot empty &middot; nothing paid</span>
                )}
              </div>
            </div>

            <div className="notes">
              <h3>What this does and doesn&rsquo;t count</h3>
              <ul>
                <li>Growth is applied each year after contributions. <strong>Today&rsquo;s £</strong> figures discount the future amount back at {s.inflation}% inflation — the same thing economists call <em>real terms</em>.</li>
                <li>Platform and fund charges are <strong>not</strong> deducted — typically 0.3–0.8% combined. Lower the growth rate to allow for them.</li>
                <li>The State Pension does <strong>not</strong> touch the pot — it is paid separately, so none of these bars include it. It shows on the income step.</li>
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

        {step === 5 && (
          <section aria-labelledby="h5t">
            <h2 className="h" id="h5t">What you actually receive</h2>
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
                <span className="k">
                  Taxable, lifetime
                  <Info title="Marginal rate">
                    The rate on your top slice of income &mdash; 20%, 40% or 45%. This total is before
                    any tax, so what you keep is lower.
                  </Info>
                </span>
                <span className="v">{money(showToday ? totals.incToday : totals.incCash)}</span>
                <span className="s">
                  {s.statePension ? "drawdown and State Pension, before tax" : "taxed at your marginal rate"}
                </span>
              </span>
              <span className="e">
                <span className="k">
                  Tax-free, lifetime
                  <Info title={`The ${full(TAX_FREE_CAP)} cap`}>
                    A lifetime limit on tax-free cash across all your pensions. Once you reach it,
                    every further payment is taxable, however large the pot.
                  </Info>
                </span>
                <span className="v">{money(showToday ? totals.tfToday : totals.tfCash)}</span>
                <span className="s">
                  {s.taxFreeMode === "ufpls"
                    ? "spread across every payment"
                    : P.taxFreePayments.length > 1
                      ? `${P.taxFreePayments.length} tranches`
                      : "one lump sum"}
                </span>
              </span>
            </div>

            <div className="card">
              <h3>Payment schedule</h3>
              <p className="tcap">
                {s.taxFreeMode === "lump"
                  ? "Tax-free cash is a separate payment; the income column is taxable in full."
                  : `Each payment splits ${s.taxFreePct}/${100 - s.taxFreePct} between tax free and taxable, until the lifetime cap runs out.`}
                {s.statePension && ` The State Pension is counted in both income columns from ${spAge}.`}
                {" "}{basisCaption(showToday)}
              </p>
              <div className="tkey">
                <span>
                  {lumpMode ? "Tax-free cash" : "Tax-free part"}
                  <Info title={lumpMode ? "Tax-free cash" : "Tax-free part"}>
                    {lumpMode
                      ? "Paid when you move part of the pot into drawdown. It is not taxable income and does not use your Personal Allowance."
                      : `The ${s.taxFreePct}% of each payment that is free of tax. It does not use your Personal Allowance.`}
                  </Info>
                </span>
                <span>
                  {lumpMode ? "Annual income" : "Taxable part"}
                  <Info title={lumpMode ? "Annual income" : "Taxable part"}>
                    {lumpMode
                      ? "What you draw from the pot that year"
                      : "The taxable share of each payment"}
                    {s.statePension
                      ? <>, plus the State Pension once it starts at {spAge} — which is why the figure
                        steps up that year. Taxable in full. It does not include the tax-free cash in
                        the same row.</>
                      : <>. Taxable in full. It does not include the tax-free cash in the same row.</>}
                  </Info>
                </span>
                <span>
                  Monthly income
                  <Info title="Monthly income">
                    The year&rsquo;s income divided by twelve
                    {s.statePension && <>, State Pension included from {spAge}</>}. A one-off
                    tax-free lump sum is left out — it has its own column, and spreading it over
                    twelve months would suggest an income you do not get every year.
                  </Info>
                </span>
                <span>
                  Total row
                  <Info title="The Total row">
                    Every payment added up across the whole projection. It is not money available at
                    any one moment.
                  </Info>
                </span>
              </div>
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      {/* What you live on comes first — the monthly figure and the
                          rate behind it — because that is what a phone shows
                          without scrolling. The annual breakdown follows. */}
                      <th>Age</th>
                      <th>Rate</th>
                      <th>Monthly income</th>
                      <th>{s.taxFreeMode === "lump" ? "Tax-free cash" : "Tax-free part"}</th>
                      <th>{s.taxFreeMode === "lump" ? "Annual income" : "Taxable part"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRows.length === 0 && (
                      <tr><td colSpan={5} className="muted">No payments yet — set a drawdown age on step 04.</td></tr>
                    )}
                    {incomeRows.map((r) => {
                      const col = r.phaseIndex >= 0 ? phaseVar(r.phaseIndex) : undefined;
                      return (
                        <tr
                          key={r.age}
                          className={[r.taxFree > 0 ? "tf-row" : "", spStarts === r.age ? "sp-row" : ""]
                            .filter(Boolean).join(" ") || undefined}
                        >
                          <td>
                            {r.age}
                            {/* Income jumps the year the State Pension starts. Folded
                                into the columns it would be an unexplained step, so
                                the one row that causes it says so. */}
                            {spStarts === r.age && <span className="rowmark">+ State Pension</span>}
                          </td>
                          <td style={col ? { color: col, fontWeight: 600 } : undefined} className={col ? undefined : "muted"}>
                            {r.rate > 0 ? `${r.rate}%` : "—"}
                          </td>
                          <td>{r.incomeMonthly > 0
                            ? <Cell cash={r.incomeMonthly} today={r.incomeMonthlyToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                          <td>{r.taxFree > 0
                            ? <Cell cash={r.taxFree} today={r.taxFreeToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                          <td>{r.incomeAnnual > 0
                            ? <Cell cash={r.incomeAnnual} today={r.incomeAnnualToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td className="muted" style={{ fontWeight: 400 }}>over {incomeRows.length} years</td>
                      <td><Cell cash={totals.tfCash} today={totals.tfToday} showToday={showToday} /></td>
                      <td><Cell cash={totals.incCash} today={totals.incToday} showToday={showToday} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="notes">
              <h3>Before you spend it</h3>
              <ul>
                <li>Tax-free cash is genuinely tax free. <strong>Drawdown income is not</strong> — it is taxed as income at your marginal rate, so the take-home figure is lower than shown.</li>
                <li>{s.statePension
                  ? <>The State Pension is included from {spAge} at {full(STATE_PENSION_ANNUAL)} a year, held level in today&rsquo;s money. It is taxable, and it uses up nearly all of your Personal Allowance — so from that age almost every pound taken from the pot is taxed.</>
                  : <>The State Pension is <strong>switched off</strong>. At the full rate it would add {full(STATE_PENSION_ANNUAL)} a year from {spAge}. Turn it on at step 04.</>}</li>
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
