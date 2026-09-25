import { Fragment, useState, useMemo, useRef, useEffect } from "react";
import { project, solveContribution, TAX_FREE_RATE, phaseSpans, incomeStartAge, firstAccessAge, sustainableRate, resolvedStatePensionAge, statePensionAge,
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

// PLSA Retirement Living Standards 2025 (single person, housing excluded) — the
// benchmark every UK retirement-income thread reaches for. Offered as a place
// to start, never as a target: picking one only moves the slider, which stays
// free to land anywhere. Figures are yearly, in today's money.
const PLSA_YEAR = 2025;
const PLSA = [
  { key: "min", label: "Minimum", amount: 13400 },
  { key: "mod", label: "Moderate", amount: 31700 },
  { key: "comf", label: "Comfortable", amount: 43900 },
];

const DEFAULTS = {
  currentAge: 30,
  currentPot: 100000,
  annualContrib: 10000,
  // Which direction step 02 runs. "manual" sets a contribution and shows the
  // income it builds; "target" sets the income wanted in early retirement and
  // solves the contribution backwards. Defaults to manual so the forward path
  // and its documented figures are untouched on first load.
  contribMode: "manual",
  // The yearly income wanted from the pot in early retirement, today's £.
  // Only read in target mode. Defaults to the PLSA moderate standard.
  targetIncome: 31700,
  growth: 6,
  contribGrowth: DEFAULT_INFLATION,
  inflation: DEFAULT_INFLATION,
  // The cap is frozen in cash terms today. Holding it level in real terms is
  // the friendlier assumption and the one most people expect, so it leads.
  taxFreeCapUprated: true,
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

/* Shared by every sheet: focus moves in, Escape and a backdrop click close,
   Tab cycles inside, the page behind stops scrolling, and focus returns to
   whatever opened it. */
function useSheet(onClose, panel) {
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
  }, [onClose, panel]);
}

function Sheet({ id, title, onClose, children }) {
  const panel = useRef(null);
  useSheet(onClose, panel);
  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
        ref={panel} tabIndex={-1}
      >
        <div className="sheet-head">
          <h2 id={`${id}-title`}>{title}</h2>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* One sheet for every term on a step, rather than a dot beside each of them.
   Six popovers meant six taps to read six sentences, each one closing the
   last, and none of them readable side by side. */
function Terms({ title, lede, terms, onClose }) {
  return (
    <Sheet id="terms" title={title} onClose={onClose}>
      {lede && <p className="sheet-lede">{lede}</p>}
      <dl className="terms">
        {terms.map((t) => (
          <div key={t.term}>
            <dt>{t.term}</dt>
            <dd>{t.body}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

/* Every figure in the app rests on these, so they belong to the whole app
   rather than to a step. Values that have a control of their own are stated
   and point at it; the ones with nowhere else to live are editable here. */
function Assumptions({ s, update, onClose }) {
  /* What the setting is actually worth, run through the same model rather than
     written down once. Below the cap it changes nothing at all, and saying so
     is more useful than quoting a difference of zero. */
  const capEffect = useMemo(() => {
    const at = (uprated) => {
      const P = project({ ...s, taxFreeCapUprated: uprated });
      return {
        tf: P.taxFreeTotalToday,
        mo: P.years.find((y) => y.incomeMonthlyToday > 0)?.incomeMonthlyToday ?? 0,
      };
    };
    const up = at(true), fixed = at(false);
    const gap = up.tf - fixed.tf;
    if (gap < 1) {
      return (
        <>
          Your pot is what limits the tax-free cash here, not the cap, so this
          setting makes no difference to your plan.
        </>
      );
    }
    const income = up.mo - fixed.mo;
    const now = s.taxFreeCapUprated ? up : fixed;
    return (
      <>
        {/* Which of the two is actually limiting you depends on the pot, so
            the sentence has to check rather than assert. It said "never binds"
            while reporting the cap to the pound. */}
        {s.taxFreeCapUprated
          ? (now.tf >= TAX_FREE_CAP - 1
              ? <>The cap holds its value and you reach it: the full <b>{full(TAX_FREE_CAP)}</b>, tax free, in today&rsquo;s money.</>
              : <>The cap holds its value, so your pot is what limits you here: <b>{full(now.tf)}</b> tax free in today&rsquo;s money.</>)
          : <>Today&rsquo;s policy. You take <b>{full(now.tf)}</b> tax free in today&rsquo;s money.</>}
        {" "}
        {s.taxFreeCapUprated
          ? <>That is <b>{full(gap)}</b> more than if it stayed fixed</>
          : <>Letting it rise would pay <b>{full(gap)}</b> more</>}
        {/* The trade, not just the gain: cash taken up front has left the pot,
            so it is no longer paying income. Both branches compare the same
            pair, so both take the same sign. */}
        {income < -1 && <>, and <b>{full(-income)}</b> a month less income</>}.
      </>
    );
  }, [s]);

  const row = (term, value, body, control) => ({ term, value, body, control });
  const items = [
    row("Investment growth", `${s.growth}% a year`,
      "The average yearly return before charges, and the figure that moves the final pot more than anything else here.",
      /* The same control as step 01, not a second implementation: the steppers
         accumulate against a shadow ref, and a simpler copy here would drop
         several taps in one frame. */
      <Control
        id="asm-growth" label="Growth rate" value={s.growth} min={0} max={12} step={0.25}
        fmt={(v) => `${v}%`} onChange={(v) => update({ growth: v })}
        note={s.growth >= 8
          ? "Optimistic for a long horizon \u2014 fees are not deducted."
          : "Before platform and fund charges of roughly 0.3\u20130.8%."}
      />),
    row("Inflation", `${s.inflation}% a year`,
      "What decides the difference between future \u00a3 and today\u2019s \u00a3, and what your contributions have to beat.",
      <Control
        id="asm-inflation" label="Inflation" value={s.inflation} min={0} max={6} step={0.25}
        fmt={(v) => `${v}%`} onChange={(v) => update({ inflation: v })}
        note={`The pot only holds its value at ${sustainableRate(s).toFixed(1)}% a year or less at these two rates.`}
      />),
    row("Tax-free cash", `${TAX_FREE_RATE * 100}%, capped at ${full(TAX_FREE_CAP)}`,
      <>
        A quarter of whatever you move into drawdown comes to you tax free, up to{" "}
        {full(TAX_FREE_CAP)} across all your pensions. The share is not something you pick:
        take less than a quarter of a crystallisation and the difference is forfeited, not
        carried over. What you choose is how much to move and when.
      </>,
      <>
        <div className="seg asm-seg" role="radiogroup" aria-label="The cap over time">
          <button type="button" role="radio" aria-checked={s.taxFreeCapUprated}
            onClick={() => update({ taxFreeCapUprated: true })}>
            Rises with inflation
          </button>
          <button type="button" role="radio" aria-checked={!s.taxFreeCapUprated}
            onClick={() => update({ taxFreeCapUprated: false })}>
            Stays at {full(TAX_FREE_CAP)}
          </button>
        </div>
        <p className="conseq">{capEffect}</p>
      </>),
    row("State Pension", s.statePension ? `${full(STATE_PENSION_ANNUAL)} a year` : "Switched off",
      "Assumed paid at the full rate and held level in today\u2019s money, from the age you reach it. It is taxable. Switch it on or off on step 04.",
      null),
  ];
  return (
    <Sheet id="asm" title="Assumptions" onClose={onClose}>
      <p className="sheet-lede">
        Every figure in this planner is built on these. Change one and everything recalculates.
      </p>
      <dl className="terms asm">
        {items.map((it) => (
          <div key={it.term}>
            <dt>{it.term}<span>{it.value}</span></dt>
            <dd>{it.body}{it.control}</dd>
          </div>
        ))}
      </dl>
      <div className="notes" style={{ marginTop: 14 }}>
        <h3>Not modelled at all</h3>
        <ul>
          <li><strong>Income tax.</strong> Every income figure is before it. From State Pension age almost every pound drawn from the pot is taxable, because the State Pension uses nearly all of the Personal Allowance.</li>
          <li><strong>Platform and fund charges</strong>, usually 0.3&ndash;0.8% a year. Lower the growth rate to allow for them.</li>
        </ul>
      </div>
    </Sheet>
  );
}

function HowItWorks({ onClose }) {
  return (
    <Sheet id="hiw" title="How it works" onClose={onClose}>
      <>
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
      </>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ control */

function Control({ id, label, value, onChange, min, max, step, fmt, note, typed, hardMax, mark }) {
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

/* ------------------------------------------------------------ income chart */

/* Horizontal, because age is the vertical axis everywhere in this app and a
   taller row would read as a longer year. One row per year, stacked by where
   the money comes from.

   The scale is set by the largest RECURRING year, not the largest year. A
   tax-free lump sum is 5.1x the biggest income year on the defaults, so a
   shared scale would leave every other bar under a fifth of the width. The
   lump overflows instead and says so. */
function IncomeChart({ rows, spans, showToday, monthly, spStarts, selected, onSelect }) {
  const val = (r, k) => {
    const cash = showToday ? r[`${k}Today`] : r[k];
    return monthly && k !== "taxFree" ? cash / 12 : cash;
  };
  const parts = (r) => {
    const state = r.statePension > 0 ? val(r, "statePension") : 0;
    const pot = val(r, "incomeAnnual") - state;
    // A one-off lump is not income you get every month, so it never divides.
    const tf = (showToday ? r.taxFreeToday : r.taxFree) / (monthly ? 12 : 1);
    return { pot, state, tf, recurring: pot + state };
  };
  const scale = incomeScale(rows.map(parts));

  let lastPhase = -1;
  const out = [];
  rows.forEach((r) => {
    if (r.phaseIndex !== lastPhase) {
      lastPhase = r.phaseIndex;
      const sp = spans[r.phaseIndex];
      out.push(
        <li key={`ph-${r.phaseIndex}`} className="ic-div">
          {r.phaseIndex < 0 ? (
            <>Before drawdown<em> &middot; tax-free cash only</em></>
          ) : (
            <>
              Phase {String(r.phaseIndex + 1).padStart(2, "0")}
              <em> &middot; {sp?.rate}% of the remaining pot each year</em>
            </>
          )}
        </li>
      );
    }
    if (spStarts === r.age) {
      out.push(
        <li key="sp-div" className="ic-div is-sp">
          State Pension starts at {r.age}
          <em> &middot; counted in every bar below</em>
        </li>
      );
    }
    const { pot, state, tf, recurring } = parts(r);
    const pc = (n) => (n / scale) * 100;
    const room = Math.max(0, 100 - pc(recurring));
    const tfPc = pc(tf);
    const clipped = tfPc > room;
    out.push(
      <li key={r.age}>
        <button
          type="button" className="ic-row" aria-pressed={selected === r.age}
          onClick={() => onSelect(r.age)}
          aria-label={`Age ${r.age}, ${money(recurring + tf)}`}
        >
          <span className="ic-age">{r.age}</span>
          <span className="ic-track">
            {pot > 0 && <i className="s-pot" style={{ width: `${pc(pot)}%` }} />}
            {state > 0 && <i className="s-state" style={{ width: `${pc(state)}%` }} />}
            {tf > 0 && (
              <i
                className={`s-tf${clipped ? " is-clipped" : ""}`}
                style={{ width: `${clipped ? room : tfPc}%` }}
              />
            )}
            {tf > 0 && <span className="ic-tfval">{money(tf)} tax free</span>}
          </span>
        </button>
      </li>
    );
  });
  return <ul className="ic">{out}</ul>;
}

/* Vertical bars, scrolling sideways — the same data as IncomeChart with age on
   the horizontal axis, which is what most projection charts do and what makes
   the shape of a retirement legible at a glance. Phases run as a rail beneath
   the axis, where a span has room to carry its own label. */
const ICV_COL = 14, ICV_GAP = 3;

/* A tax-free lump can be several times the largest income year, and scaling to
   it leaves every other bar a stub. Scaling to the recurring maximum instead
   cuts the tops off the lump years, which reads as a rendering fault rather
   than as a value running past the edge.
   So: use the true maximum whenever it costs the recurring bars little, and
   only fall back to the recurring maximum — with a visible break — when the
   lump would genuinely crush them. */
function incomeScale(parts) {
  const total = Math.max(...parts.map((p) => p.recurring + p.tf), 1);
  const rec = Math.max(...parts.map((p) => p.recurring), 1);
  return total <= rec * 1.6 ? total : rec;
}

function IncomeColumns({ rows, spans, showToday, monthly, spStarts, selected, onSelect }) {
  const parts = (r) => {
    const raw = (k) => (showToday ? r[`${k}Today`] : r[k]);
    const d = monthly ? 12 : 1;
    const state = r.statePension > 0 ? raw("statePension") / d : 0;
    const pot = raw("incomeAnnual") / d - state;
    const tf = raw("taxFree") / d;
    return { pot, state, tf, recurring: raw("incomeAnnual") / d };
  };
  const scale = incomeScale(rows.map(parts));
  const h = (n) => `${Math.min(100, (n / scale) * 100)}%`;

  // The rail is a second flex row under the columns, so each span has to be as
  // wide as the columns it covers, gaps included.
  const rail = [];
  rows.forEach((r) => {
    const last = rail[rail.length - 1];
    if (last && last.i === r.phaseIndex) last.n += 1;
    else rail.push({ i: r.phaseIndex, n: 1 });
  });

  return (
    <div className="icv">
      <div className="icv-scale" aria-hidden="true">
        <span>{money(scale)}</span>
        <span>{money(scale / 2)}</span>
      </div>
      <div className="icv-scroll">
        <div className="icv-inner">
          <div className="icv-cols">
            {rows.map((r) => {
              const { pot, state, tf, recurring } = parts(r);
              return (
                <button
                  key={r.age} type="button"
                  className={`icv-col${spStarts === r.age ? " is-sp" : ""}`}
                  aria-pressed={selected === r.age}
                  onClick={() => onSelect(r.age)}
                  aria-label={`Age ${r.age}, ${money(recurring + tf)}`}
                  style={{ width: ICV_COL }}
                >
                  <span className="icv-stack">
                    {tf > 0 && (
                      <i
                        className={`s-tf${recurring + tf > scale ? " is-clipped" : ""}`}
                        style={{ height: h(Math.min(tf, Math.max(0, scale - recurring))) }}
                      />
                    )}
                    {state > 0 && <i className="s-state" style={{ height: h(state) }} />}
                    {pot > 0 && <i className="s-pot" style={{ height: h(pot) }} />}
                  </span>
                  <span className="icv-age">{r.age}</span>
                </button>
              );
            })}
          </div>
          <div className="icv-rail">
            {rail.map((sp, k) => (
              <span
                key={k} className={`icv-span${sp.i < 0 ? " is-pre" : ""}`}
                style={{ width: sp.n * ICV_COL + (sp.n - 1) * ICV_GAP }}
              >
                <i />
                <em>{sp.i < 0
                  ? "Tax-free only"
                  : `${String(sp.i + 1).padStart(2, "0")} \u00b7 ${spans[sp.i]?.rate}%`}</em>
              </span>
            ))}
          </div>
        </div>
      </div>
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
          const mark = y.age === start ? "Drawdown begins"
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
  const [termsOpen, setTermsOpen] = useState(false);
  const [asmOpen, setAsmOpen] = useState(false);
  const [incomeView, setIncomeView] = useState("columns");
  const [incomeMonthly, setIncomeMonthly] = useState(false);
  // Whether step 02's manual contribution is shown per month or per year. A
  // display choice like incomeMonthly, so it lives in component state, not in s.
  // The model always stores the annual figure; monthly is just annual / 12.
  const [contribMonthly, setContribMonthly] = useState(false);
  const [selectedAge, setSelectedAge] = useState(null);
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

  // In target mode the contribution is derived, not typed: solve it backwards
  // from the wanted income, then run the projection on that figure so every
  // downstream step and the verdict bar reflect it exactly as if it had been
  // entered by hand. Manual mode leaves annualContrib alone, so the forward
  // path is byte-for-byte what it was.
  const solved = useMemo(
    () => (s.contribMode === "target" ? solveContribution(s, s.targetIncome) : null),
    [s]
  );
  const effContrib = solved ? solved.contrib : s.annualContrib;
  const P = useMemo(() => project({ ...s, annualContrib: effContrib }), [s, effContrib]);
  const spans = useMemo(() => phaseSpans(s), [s]);

  const start = incomeStartAge(s);
  // Where paying in stops: first access, which can be the tax-free age, before
  // income starts. Usually the same as `start`; they differ only in a
  // phased-lump plan with a gap before income.
  const accessAge = firstAccessAge(s);
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

  /* Every step carried a dot beside each term it used. Each popover closed the
     last, so the explanations could never be read beside each other, and the
     one that measured itself on open was the source of two separate layout
     bugs. One sheet per step instead, listing that step's terms in the order
     the step uses them. */
  const BASIS_TERM = {
    term: "Future \u00a3 and today\u2019s \u00a3",
    body: `Two ways of measuring the same sum. Future \u00a3 is the cash that would actually show in the account that year; today\u2019s \u00a3 is what that sum would buy at current prices. The toggle at the top decides which one is the large figure. Today\u2019s \u00a3 leads by default, because it is the honest answer to what a sum will actually buy \u2014 at ${s.inflation}% inflation over ${END_AGE - s.currentAge} years the two drift a long way apart.`,
  };

  const stepTerms = useMemo(() => {
    const lump = s.taxFreeMode === "lump";
    return [
      [
        { term: "Current pot", body: "The total across all your pensions today. If you have several, add them up. Old workplace pensions are easy to forget." },
        { term: "Growth rate", body: "The average yearly return on your investments, before charges. Most platforms and funds take 0.3\u20130.8% a year, so lower this figure to allow for them. This has a bigger effect than anything else on the page." },
        { term: "Inflation", body: "How fast prices rise. It decides what a future pound is worth today. The Bank of England targets 2%. Over thirty years, 2.5% roughly halves what a pound buys." },
        BASIS_TERM,
      ],
      s.contribMode === "target"
        ? [
            { term: "Target income", body: "The yearly income you want your pot to pay in early retirement \u2014 your first, most active phase. The planner works backwards from it to the contribution needed. It is income from the pot only, before the State Pension starts and before any tax." },
            { term: "Retirement Living Standards", body: `The PLSA\u2019s benchmarks for a single person\u2019s yearly spending in retirement \u2014 minimum, moderate and comfortable. They are the figures UK retirement discussions reach for most. They exclude housing costs and assume the money is spent rather than preserved. A starting point, not a recommendation: the slider is free to land anywhere.` },
            { term: "What you need to pay in", body: "The yearly contribution that makes your pot deliver the target in its first phase, found by running the projection backwards. It is a starting figure paid this year, which then rises by your contribution increases each year after." },
            { term: "Contribution increases", body: "How much more you pay in each year, usually because your salary went up. If this is lower than inflation, you are paying in less every year in real terms without noticing." },
          ]
        : [
            { term: "Annual contributions", body: `Everything going in each year: your own payments, your employer\u2019s, and the tax relief. The most you can pay in with tax relief is ${full(ANNUAL_ALLOWANCE)} a year.` },
            { term: "Contribution increases", body: "How much more you pay in each year, usually because your salary went up. If this is lower than inflation, you are paying in less every year in real terms without noticing." },
          ],
      [
        { term: "How much comes to you tax free", body: `A quarter of whatever you move into drawdown, up to ${full(TAX_FREE_CAP)} across your lifetime. The other three quarters stay invested and are taxed only when you withdraw them. The share is not a choice — taking less than a quarter of a crystallisation forfeits the difference, so what you decide is how much to move, not what share of it to take.` },
        { term: "Take it from age", body: "The earliest you can touch a pension is 55 today, rising to 57 in 2028. Waiting longer leaves the pot invested, so there is usually more to take." },
        { term: "Spread over", body: "You do not have to move the whole pot into drawdown at once. Take it in slices and the part you have not touched keeps growing, so later slices release more tax-free cash. Providers call this phased crystallisation. It makes no difference once you reach the lifetime cap." },
      ],
      [
        { term: "Start drawing at", body: "The age you start taking a regular income. Paying in stops when you first take money out — here, or earlier if you take tax-free cash first — so retiring later means both a bigger pot and fewer years to fund." },
        { term: "Withdrawal rate", body: "The share of the remaining pot you take each year, so the amount changes as the pot does. Drawing more than the sustainable rate shrinks the pot in real terms; drawing less grows it." },
        { term: "Sustainable rate", body: "Draw this much each year and the pot holds its value in today\u2019s money. It is set by your growth and inflation rates, not by the size of your pot. Draw more and the pot shrinks in real terms; draw less and it grows. Most people spend their pot down across retirement and vary what they take year to year, so treat it as a reference point, not a target." },
        { term: "You receive it from", body: "State Pension age is 66, rising to 67 by 2028 and to 68 between 2044 and 2046. Which one applies depends on when you were born. A government review could bring the rise forward, which is why this is adjustable." },
      ],
      [
        { term: "Reading the bars", body: `Each bar is one year. The solid part is what the pot buys in today\u2019s prices; the pale tail is the larger number that will actually show in the account. The gap between them is ${s.inflation}% inflation, compounding over ${END_AGE - s.currentAge} years.` },
        BASIS_TERM,
      ],
      [
        { term: "Monthly income", body: `The year\u2019s income divided by twelve${s.statePension ? `, State Pension included from ${spAge}` : ""}. Tax-free cash is divided the same way and kept in its own column, so you can see what a year paid without reading a lump sum as money you get every month \u2014 it only lands in the years you take it.` },
        { term: lump ? "Annual income" : "Taxable part",
          body: lump
            ? `What you draw from the pot that year${s.statePension ? `, plus the State Pension once it starts at ${spAge} \u2014 which is why the figure steps up that year` : ""}. Taxable in full. It does not include the tax-free cash in the same row.`
            : `The taxable share of each payment${s.statePension ? `, plus the State Pension from ${spAge}` : ""}. Taxable in full. It does not include the tax-free cash in the same row.` },
        { term: lump ? "Tax-free cash" : "Tax-free part",
          body: lump
            ? "Paid when you move part of the pot into drawdown. It is not taxable income and does not use your Personal Allowance."
            : `The ${TAX_FREE_RATE * 100}% of each payment that is free of tax. It does not use your Personal Allowance.` },
        { term: `The ${full(TAX_FREE_CAP)} cap`, body: "A lifetime limit on tax-free cash across all your pensions. Once you reach it, every further payment is taxable, however large the pot." },
        { term: "Phase \u00b7 annual drawdown rate", body: `The coloured edge on each row is the phase it falls in, and the legend gives the percentage of the remaining pot that phase draws each year. Because it is a percentage of what is left, the payment shrinks as the pot does \u2014 the pot never reaches zero, it erodes. Holding its value in real terms needs ${rStarText} a year or less at your growth and inflation.` },
        { term: "Marginal rate", body: "The rate on your top slice of income \u2014 20%, 40% or 45%. Every figure here is before any tax, so what you keep is lower." },
        { term: "The Total row", body: "Every payment added up across the whole projection. It is not money available at any one moment." },
      ],
    ];
  }, [s.taxFreeMode, s.statePension, s.inflation, s.currentAge, spAge, rStarText, s.contribMode]);

  // A year paying only the State Pension is still a year you are paid, so it
  // earns a row once the State Pension is switched on.
  const incomeRows = P.years.filter((y) => y.annual > 0 || y.taxFree > 0 || y.statePension > 0);
  const totals = incomeRows.reduce((a, r) => ({
    tfCash: a.tfCash + r.taxFree, tfToday: a.tfToday + r.taxFreeToday,
    incCash: a.incCash + r.incomeAnnual, incToday: a.incToday + r.incomeAnnualToday,
  }), { tfCash: 0, tfToday: 0, incCash: 0, incToday: 0 });

  /* The chart opens on a real year rather than empty: the first payment, until
     a row is picked. Falls back if the selected age drops out of range when
     the drawdown age moves. */
  const pickedAge = incomeRows.some((r) => r.age === selectedAge)
    ? selectedAge : incomeRows[0]?.age ?? null;
  const picked = incomeRows.find((r) => r.age === pickedAge) ?? null;
  const pickedParts = (() => {
    if (!picked) return { pot: 0, state: 0, tf: 0 };
    const raw = (k) => (showToday ? picked[`${k}Today`] : picked[k]);
    const state = picked.statePension > 0 ? raw("statePension") : 0;
    const pot = raw("incomeAnnual") - state;
    const d = incomeMonthly ? 12 : 1;
    return { pot: pot / d, state: state / d, tf: raw("taxFree") / d };
  })();

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

  /* The bar carries the answer, so it cannot go away — but at 157px it was a
     fifth of a phone screen. Past the threshold it drops to one row: the
     verdict, the headline figure, and the basis toggle. 40px of hysteresis
     stops it flickering when a tap lands mid-boundary. */
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCondensed((was) => (was ? y > 40 : y > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {helpOpen && <HowItWorks onClose={() => setHelpOpen(false)} />}
      {asmOpen && <Assumptions s={s} update={update} onClose={() => setAsmOpen(false)} />}
      {termsOpen && (
        <Terms
          title="What these terms mean"
          lede="Every term on this step, in one place. Definition first, then what follows from it."
          terms={stepTerms[step]}
          onClose={() => setTermsOpen(false)}
        />
      )}

      <div className={`verdict${condensed ? " is-condensed" : ""}`}>
        <div className="verdict-in">
          <div className="verdict-top">
            <span className={`chip ${chipClass}`}>
              <span className="dot" />
              {`Lasts beyond ${END_AGE}`}
            </span>
            <button type="button" className="hiw-btn" onClick={() => setHelpOpen(true)}>
              <span aria-hidden="true">i</span> How it works
            </button>
            {/* Only drawn once the bar has collapsed, so the headline figure
                never leaves the screen even when the tiles below it do. */}
            <span className="vnow" aria-hidden={!condensed}>
              {firstIncome ? full(showToday ? firstIncome.monthlyToday : firstIncome.monthly) : "—"}
              <i>a month</i>
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
            <button
              key={st.n} type="button"
              aria-current={i === step ? "step" : undefined}
              aria-label={`Step ${st.n}, ${st.t}`}
              onClick={() => go(i)}
            >
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
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>
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
              />
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
            <h2 className="h" id="h1">What you pay in</h2>
            <p className="lede">
              Two ways to plan what goes in: <strong>set the amount yourself</strong>, or name the
              income you want and let the planner work back to it. Contributions stop once you first
              take money out.
            </p>
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>

            {/* The fork, in Monzo's own shape: one model, two directions, both
                offered up front. The novice who cannot pick a contribution out
                of the air states an income instead; the expert who knows the
                figure sets it directly. Either way the answer flows into the
                same steps 03–06. */}
            <div className="card">
              <h3>How do you want to work this out?</h3>
              {/* A segmented control, not two radio cards: the same component the
                  income views use, because this is the same kind of choice — one
                  of two mutually exclusive modes, switched often. The active
                  mode's description sits below rather than on each segment, so a
                  segment carries a label and nothing else. */}
              <div className="seg seg-full" role="group" aria-label="How to work out contributions">
                <button
                  type="button" aria-pressed={s.contribMode === "manual"}
                  onClick={() => update({ contribMode: "manual" })}
                >
                  I&rsquo;ll set the amount
                </button>
                <button
                  type="button" aria-pressed={s.contribMode === "target"}
                  onClick={() => update({ contribMode: "target" })}
                >
                  Work it out for me
                </button>
              </div>
              <p className="tcap" style={{ margin: "12px 0 0" }}>
                {s.contribMode === "target"
                  ? "Set the income you want in early retirement, and the planner finds the contribution that gets you there."
                  : "Enter a yearly contribution and see the income it builds."}
              </p>
            </div>

            {s.contribMode === "manual" ? (
              <>
                <div className="echo">
                  {/* Always the annual figure, even when the input below is set
                      to monthly — the echo is the running total you are
                      committing to, and showing it alongside the monthly input
                      gives both views at once. */}
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
                  {/* Annual/Monthly is a period view, so it takes the same .seg
                      toggle step 06 uses for income — not a mode choice. The
                      model keeps the annual figure; monthly is annual / 12 in
                      and out. */}
                  <div className="card-head">
                    <h3>Your contributions</h3>
                    <div className="seg" role="group" aria-label="Show contribution as">
                      <button type="button" aria-pressed={!contribMonthly}
                        onClick={() => setContribMonthly(false)}>Annual</button>
                      <button type="button" aria-pressed={contribMonthly}
                        onClick={() => setContribMonthly(true)}>Monthly</button>
                    </div>
                  </div>
                  <Control
                    id="contrib"
                    label={contribMonthly ? "Monthly contributions" : "Annual contributions"}
                    value={contribMonthly ? s.annualContrib / 12 : s.annualContrib}
                    min={0}
                    max={contribMonthly ? ANNUAL_ALLOWANCE / 12 : ANNUAL_ALLOWANCE}
                    step={contribMonthly ? 25 : 250}
                    fmt={full} typed
                    hardMax={contribMonthly ? ANNUAL_ALLOWANCE / 12 : ANNUAL_ALLOWANCE}
                    onChange={(v) => update({ annualContrib: contribMonthly ? Math.round(v * 12) : v })}
                    note={s.annualContrib >= ANNUAL_ALLOWANCE
                      ? (contribMonthly
                          ? `At the ${full(ANNUAL_ALLOWANCE / 12)} a month (${full(ANNUAL_ALLOWANCE)} a year) allowance.`
                          : `At the ${full(ANNUAL_ALLOWANCE)} annual allowance.`)
                      : "You and your employer combined, before tax relief limits."}
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
              </>
            ) : (
              <>
                <div className="echo">
                  <span className="e">
                    <span className="k">Pot at {start}</span>
                    <span className="v">{atRetirement ? money(showToday ? atRetirement.potGrossToday : atRetirement.potGross) : "—"}</span>
                    <span className="s">before any withdrawal</span>
                  </span>
                  <span className="e">
                    <span className="k">Total paid in by {start}</span>
                    <span className="v">{money(showToday ? P.contributedTotalToday : P.contributedTotal)}</span>
                    <span className="s">over {P.contributions.length} years</span>
                  </span>
                </div>

                <div className="card">
                  <h3>The income you want</h3>
                  <p className="tcap">
                    The yearly income you&rsquo;d want from your pot in <strong>early, active retirement</strong> —
                    your first phase. The later years ease down on the phases you set next.
                  </p>
                  {/* Presets that snap the free slider — the PLSA standards for
                      someone who has no figure of their own, without taking the
                      slider away from someone who does. Picking one only moves
                      the slider; dragging clears the selection. */}
                  <div className="chips" role="group" aria-label="Retirement Living Standards">
                    {PLSA.map((p) => (
                      <button
                        key={p.key} type="button" aria-pressed={s.targetIncome === p.amount}
                        onClick={() => update({ targetIncome: p.amount })}
                      >
                        <span className="cl">{p.label}</span>
                        <span className="cv">{full(p.amount)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="chips-cap">
                    PLSA Retirement Living Standards {PLSA_YEAR}, single person, housing excluded.
                    A reference, not a target — set any figure below.
                  </p>
                  <Control
                    id="target" label="Target yearly income" value={s.targetIncome} min={5000} max={80000} step={500}
                    fmt={full} typed hardMax={200000} onChange={(v) => update({ targetIncome: v })}
                    note={`${full(s.targetIncome / 12)} a month, in today’s money, before tax.`}
                  />
                </div>

                {/* The answer owns the contribution figure; the verdict bar owns
                    the resulting income; the echo owns the pot. Nothing states
                    the same number twice. A starting contribution is paid now,
                    so its deflator is 1 and it needs no basis pairing. */}
                {solved && solved.status === "ok" && (
                  <div className="solved">
                    <span className="k">To get there, pay in</span>
                    <span className="v">{full(solved.contrib / 12)}<small> a month</small></span>
                    <span className="s">
                      {full(solved.contrib)} a year to start, rising {s.contribGrowth}% a year.
                      In today&rsquo;s money, before tax.
                    </span>
                  </div>
                )}
                {solved && solved.status === "already" && (
                  <div className="solved">
                    <span className="k">You&rsquo;re on track already</span>
                    <span className="v">£0<small> more needed</small></span>
                    <span className="s">
                      Your current pot alone reaches about {full(solved.achieved)} a year from {start},
                      before you add another penny. Aim higher, or keep paying in to build a cushion.
                    </span>
                  </div>
                )}
                {solved && solved.status === "capped" && (
                  <div className="solved">
                    <span className="k">Beyond what you can pay in</span>
                    <span className="v">{full(ANNUAL_ALLOWANCE)}<small> a year, the most with tax relief</small></span>
                    <span className="s">
                      Even the full {full(ANNUAL_ALLOWANCE)} a year reaches about {full(solved.achieved)},
                      short of {full(s.targetIncome)}. Retire later, assume higher growth, or aim lower.
                    </span>
                  </div>
                )}

                <div className="notes">
                  <h3>What this figure includes</h3>
                  <ul>
                    <li>This is the income your <strong>pot</strong> pays in its first phase. Until the State Pension starts at {spAge}, it is your whole retirement income.</li>
                    <li>{s.statePension
                      ? <>From {spAge} the State Pension adds {full(STATE_PENSION_ANNUAL)} a year on top, so your total income rises then — the pot does not have to fund everything forever.</>
                      : <>The State Pension is <strong>switched off</strong>. At the full rate it would add {full(STATE_PENSION_ANNUAL)} a year from {spAge} on top of this. Turn it on at step 04.</>}</li>
                    <li>Later phases draw less as the pot shrinks. Set their rates, and when income starts, on the next steps.</li>
                    <li>Every figure is <strong>before income tax</strong>. Tax-free cash is separate.</li>
                  </ul>
                </div>

                <ContributionTrajectory contributions={P.contributions}>
                  <Control
                    id="cgrow-t" label="Contribution increases" value={s.contribGrowth} min={0} max={10} step={0.5}
                    fmt={(v) => `${v}%`} onChange={(v) => update({ contribGrowth: v })}
                    note={s.contribGrowth === s.inflation
                      ? "Matching inflation — what you pay in holds its value, and so does the target."
                      : s.contribGrowth < s.inflation
                        ? `Below ${s.inflation}% inflation — contributions shrink in real terms, so the starting figure has to be higher.`
                        : `Above ${s.inflation}% inflation — contributions grow in real terms, so the starting figure can be lower.`}
                  />
                </ContributionTrajectory>
              </>
            )}
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="h2t">
            <h2 className="h" id="h2t">Taking your money out</h2>
            <p className="lede">
              You get <strong>25% tax free</strong>, capped at {full(TAX_FREE_CAP)} over your lifetime. Take it
              as cash up front, or let a quarter of every payment come to you tax free instead.
            </p>
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>
            <div className="echo">
              <span className="e">
                <span className="k">Tax-free cash</span>
                <span className="v">{money(taxFreeShown)}</span>
                <span className="s">
                  {P.taxFreeTotal >= TAX_FREE_CAP - 1
                    ? `at the ${full(TAX_FREE_CAP)} cap`
                    : `${TAX_FREE_RATE * 100}% of the pot at ${s.taxFreeTakeAge}`}
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
                      const capped = P.years.find((y) => y.withdrawal > 0 && y.taxFree < y.withdrawal * TAX_FREE_RATE - 0.01);
                      return capped ? `age ${capped.age}` : "age 90";
                    })()}
                  </span>
                  <span className="s">then payments are fully taxable</span>
                </span>
              )}
            </div>

            <div className="card">
              <h3>How you take it</h3>
              {/* Segmented control, matching the assumptions cap choice and the
                  step-02 fork: two mutually exclusive modes, so radiogroup with
                  aria-checked. The description of the chosen mode sits below in
                  .conseq rather than on each segment. */}
              <div className="seg seg-full" role="radiogroup" aria-label="How to take tax-free cash">
                <button
                  type="button" role="radio" aria-checked={s.taxFreeMode === "lump"}
                  onClick={() => update({ taxFreeMode: "lump" })}
                >
                  As a lump sum
                </button>
                <button
                  type="button" role="radio" aria-checked={s.taxFreeMode === "ufpls"}
                  onClick={() => update({ taxFreeMode: "ufpls" })}
                >
                  25% of each payment
                </button>
              </div>
              <p className="conseq">
                {s.taxFreeMode === "lump"
                  ? "Take the tax-free cash up front, in one go or over a few years. Income is taxable after that."
                  : "Take nothing up front. A quarter of each withdrawal is tax free until the lifetime cap is used up."}
              </p>
            </div>

            <div className="card">
              <h3>{s.taxFreeMode === "lump" ? "Tax-free cash" : "Tax-free share"}</h3>
              {s.taxFreeMode === "ufpls" && (
                <p className="tcap" style={{ margin: "10px 0 0" }}>
                  Nothing is taken up front. Each withdrawal is {TAX_FREE_RATE * 100}% tax free until
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
              />
              <Control
                id="tfyears" label="Spread over" value={s.taxFreeYears} min={1} max={15} step={1}
                fmt={(v) => (v === 1 ? "1 year" : `${v} years`)} onChange={(v) => update({ taxFreeYears: v })}
                note={s.taxFreeYears === 1
                  ? "One lump sum."
                  : P.taxFreePayments.length
                    ? `Phased over ${P.taxFreePayments[0].age}–${P.taxFreePayments[P.taxFreePayments.length - 1].age}. Each slice is taken from a pot that has had longer to grow.`
                    : "Nothing to take — set a tax-free share above 0%."}
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
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>
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
                    : accessAge < start
                      ? `Contributions stop at ${accessAge}, when you take tax-free cash.`
                      : `Contributions stop at ${start}.`}
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
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>
            <div className="card">
              <h3>
                Pot value, age {s.currentAge} to {END_AGE}
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
            <div className="helprow">
              <button type="button" className="termsbtn" onClick={() => setTermsOpen(true)}>
                <span aria-hidden="true">i</span>
                What these terms mean
              </button>
              <button type="button" className="termsbtn" onClick={() => setAsmOpen(true)}>
                <span aria-hidden="true">%</span>
                Assumptions
              </button>
            </div>
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
                </span>
                <span className="v">{money(showToday ? totals.incToday : totals.incCash)}</span>
                <span className="s">
                  {s.statePension ? "drawdown and State Pension, before tax" : "taxed at your marginal rate"}
                </span>
              </span>
              <span className="e">
                <span className="k">
                  Tax-free, lifetime
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
                  : `Each payment splits ${TAX_FREE_RATE * 100}/${100 - TAX_FREE_RATE * 100} between tax free and taxable, until the lifetime cap runs out.`}
                {s.statePension && ` The State Pension is counted in both income columns from ${spAge}.`}
                {" "}{basisCaption(showToday)}
              </p>
              {/* The rate had a column of its own, which repeated one of four
                  values down thirty-four rows and cost 38px the table did not
                  have. It is a property of the phase, so the phase carries it:
                  a coloured edge on each row, named once here. The heading
                  says what both values are — "01 · 6%" alone never said 6% of
                  what, over what. */}
              <div className="ic-ctl">
                <div className="seg" role="group" aria-label="View as">
                  <button type="button" aria-pressed={incomeView === "columns"}
                    onClick={() => setIncomeView("columns")}>Columns</button>
                  <button type="button" aria-pressed={incomeView === "rows"}
                    onClick={() => setIncomeView("rows")}>Rows</button>
                  <button type="button" aria-pressed={incomeView === "table"}
                    onClick={() => setIncomeView("table")}>Table</button>
                </div>
                <div className="seg" role="group" aria-label="Show amounts as">
                  <button type="button" aria-pressed={!incomeMonthly}
                    onClick={() => setIncomeMonthly(false)}>Annual</button>
                  <button type="button" aria-pressed={incomeMonthly}
                    onClick={() => setIncomeMonthly(true)}>Monthly</button>
                </div>
              </div>
              {incomeView !== "table" ? (
                <>
                  {picked && (
                    <div className="ic-read">
                      <span className="ic-read-age">Age {picked.age}</span>
                      <span className="ic-read-parts">
                        <b><i className="s-pot" />{full(pickedParts.pot)}</b> from your pot
                        {pickedParts.state > 0 && <>, <b><i className="s-state" />{full(pickedParts.state)}</b> State Pension</>}
                        {pickedParts.tf > 0 && <>, <b><i className="s-tf" />{full(pickedParts.tf)}</b> tax free</>}
                      </span>
                      <span className="ic-read-total">
                        {full(pickedParts.pot + pickedParts.state + pickedParts.tf)}
                        <em>{incomeMonthly ? "a month" : "that year"}</em>
                      </span>
                    </div>
                  )}
                  {incomeView === "columns" ? (
                    <IncomeColumns
                      rows={incomeRows} spans={spans} showToday={showToday}
                      monthly={incomeMonthly} spStarts={spStarts}
                      selected={pickedAge} onSelect={setSelectedAge}
                    />
                  ) : (
                    <IncomeChart
                      rows={incomeRows} spans={spans} showToday={showToday}
                      monthly={incomeMonthly} spStarts={spStarts}
                      selected={pickedAge} onSelect={setSelectedAge}
                    />
                  )}
                  <div className="legend">
                    <span><i className="s-pot" />From your pot</span>
                    {s.statePension && <span><i className="s-state" />State Pension</span>}
                    <span><i className="s-tf" />{lumpMode ? "Tax-free cash" : "Tax-free part"}</span>
                  </div>
                </>
              ) : (
                <>
              <div className="plegend">
                <span className="plegend-h">Phase &middot; annual drawdown rate</span>
                <span className="plegend-row">
                  {spans.map((sp, i) => (
                    <span key={i}>
                      <i style={{ background: phaseVar(i) }} />
                      {String(i + 1).padStart(2, "0")} &middot; {sp.rate}%
                    </span>
                  ))}
                </span>
              </div>
              <div className="tbl-scroll">
                <table className="edge">
                  <thead>
                    <tr>
                      {/* What you live on comes first — the monthly figure —
                          because that is what a phone shows without scrolling.
                          The annual breakdown follows. */}
                      <th>Age</th>
                      <th>Monthly income</th>
                      <th>{s.taxFreeMode === "lump" ? "Tax-free cash" : "Tax-free part"}{incomeMonthly && " a month"}</th>
                      <th>{s.taxFreeMode === "lump" ? "Annual income" : "Taxable part"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRows.length === 0 && (
                      <tr><td colSpan={4} className="muted">No payments yet — set a drawdown age on step 04.</td></tr>
                    )}
                    {incomeRows.map((r) => {
                      const col = r.phaseIndex >= 0 ? phaseVar(r.phaseIndex) : undefined;
                      return (
                        <Fragment key={r.age}>
                          {/* Income jumps the year the State Pension starts, and folded
                              into the columns that step has no explanation. The edge
                              cannot carry it — an edge repeats on every row and this
                              happens once — so it gets a row of its own, spanning the
                              table because it is an event rather than a value. Neutral,
                              not the good colour: it is a change, not a verdict. */}
                          {spStarts === r.age && (
                            <tr className="sp-div">
                              <td colSpan={4}>
                                State Pension starts at {r.age}
                                <em> — {full(STATE_PENSION_ANNUAL)} a year, counted in the columns below</em>
                              </td>
                            </tr>
                          )}
                        <tr
                          className={r.taxFree > 0 ? "tf-row" : undefined}
                          style={col ? { "--pc": col } : undefined}
                        >
                          <td>{r.age}</td>
                          <td>{r.incomeMonthly > 0
                            ? <Cell cash={r.incomeMonthly} today={r.incomeMonthlyToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                          <td>{r.taxFree > 0
                            ? <Cell
                                cash={r.taxFree / (incomeMonthly ? 12 : 1)}
                                today={r.taxFreeToday / (incomeMonthly ? 12 : 1)}
                                showToday={showToday} fmt={full}
                              />
                            : <span className="muted">—</span>}</td>
                          <td>{r.incomeAnnual > 0
                            ? <Cell cash={r.incomeAnnual} today={r.incomeAnnualToday} showToday={showToday} fmt={full} />
                            : <span className="muted">—</span>}</td>
                        </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="muted" style={{ fontWeight: 400 }}>over {incomeRows.length} years</td>
                      <td><Cell cash={totals.tfCash} today={totals.tfToday} showToday={showToday} /></td>
                      <td><Cell cash={totals.incCash} today={totals.incToday} showToday={showToday} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
                </>
              )}
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
