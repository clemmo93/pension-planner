import { useState, useMemo } from "react";

const formatCurrency = (val) => {
  if (val >= 1_000_000) return `£${(val / 1_000_000).toFixed(2)}m`;
  if (val >= 1_000) return `£${(val / 1_000).toFixed(1)}k`;
  return `£${Math.round(val).toLocaleString()}`;
};

const formatFull = (val) => `£${Math.round(val).toLocaleString()}`;

const SliderInput = ({ label, value, onChange, min, max, step, format, suffix, description }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#c4b08b", letterSpacing: "0.03em", fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#f0e6d2", fontFamily: "'Playfair Display', serif" }}>
        {format ? format(value) : value}{suffix || ""}
      </span>
    </div>
    {description && <div style={{ fontSize: 11, color: "#8a7e6b", marginBottom: 6 }}>{description}</div>}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: "100%", accentColor: "#c4a45a" }}
    />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b6252", marginTop: 2 }}>
      <span>{format ? format(min) : min}{suffix || ""}</span>
      <span>{format ? format(max) : max}{suffix || ""}</span>
    </div>
  </div>
);

const StatCard = ({ label, value, sub, accent }) => (
  <div style={{
    background: accent ? "linear-gradient(135deg, #2a2215 0%, #3d2e14 100%)" : "rgba(255,255,255,0.03)",
    border: accent ? "1px solid #c4a45a33" : "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "16px 14px", flex: 1, minWidth: 140,
  }}>
    <div style={{ fontSize: 11, color: "#8a7e6b", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent ? "#c4a45a" : "#f0e6d2", fontFamily: "'Playfair Display', serif" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#6b6252", marginTop: 4 }}>{sub}</div>}
  </div>
);

const PHASE_COLORS = ["#c4a45a", "#d4845a", "#8a6abf", "#5a9ac4"];
const PHASE_LABELS = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];

const MiniChart = ({ data, phases, drawdownAge, width = 500, height = 180 }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const taxFreeAge = data.find((d) => d.taxFreeEvent);
  const drawdownStart = data.find((d) => d.drawdownStart);
  const barW = Math.max(2, (width - 60) / data.length - 2);

  const getBarColor = (d) => {
    if (d.total <= 0) return "#8a4a4a";
    if (!d.drawingDown) return "#c4a45a";
    const phaseIdx = d.phaseIndex ?? -1;
    if (phaseIdx >= 0 && phaseIdx < PHASE_COLORS.length) return PHASE_COLORS[phaseIdx];
    return "#5a8a4a";
  };

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height + 40}`} style={{ width: "100%", height: "auto" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line x1="50" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x="46" y={y + 4} textAnchor="end" fill="#5a5347" fontSize="9" fontFamily="DM Sans">{formatCurrency(frac * maxVal)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = (d.total / maxVal) * height;
          const x = 55 + i * ((width - 60) / data.length);
          const y = height - barH + 10;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(barH, 0)} fill={getBarColor(d)} rx="1" opacity={0.85} />
              {d.age % 5 === 0 && (
                <text x={x + barW / 2} y={height + 24} textAnchor="middle" fill="#6b6252" fontSize="9" fontFamily="DM Sans">{d.age}</text>
              )}
            </g>
          );
        })}
        {/* Real value line overlay */}
        {(() => {
          const points = data.map((d, i) => {
            const x = 55 + i * ((width - 60) / data.length) + barW / 2;
            const y = height - (d.realValue / maxVal) * height + 10;
            return `${x},${Math.max(y, 10)}`;
          }).join(" ");
          return (
            <polyline
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
              strokeLinejoin="round"
            />
          );
        })()}
        {taxFreeAge && (() => {
          const cx = 55 + data.indexOf(taxFreeAge) * ((width - 60) / data.length) + barW / 2;
          return (
            <g>
              <line x1={cx} y1={10} x2={cx} y2={height + 10} stroke="#e8c84a" strokeWidth="1" strokeDasharray="3,3" />
              <text x={cx} y={6} textAnchor="middle" fill="#e8c84a" fontSize="8" fontFamily="DM Sans" fontWeight="600">Tax-free</text>
            </g>
          );
        })()}
        {drawdownStart && (() => {
          const cx = 55 + data.indexOf(drawdownStart) * ((width - 60) / data.length) + barW / 2;
          return (
            <g>
              <line x1={cx} y1={10} x2={cx} y2={height + 10} stroke="#5a8a4a" strokeWidth="1" strokeDasharray="3,3" />
              <text x={cx} y={6} textAnchor="middle" fill="#5a8a4a" fontSize="8" fontFamily="DM Sans" fontWeight="600">Drawdown</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default function PensionPlanner() {
  const [currentPot, setCurrentPot] = useState(100000);
  const [annualContrib, setAnnualContrib] = useState(10000);
  const [contribGrowthRate, setContribGrowthRate] = useState(2);
  const [growthRate, setGrowthRate] = useState(6);
  const [taxFreePercent, setTaxFreePercent] = useState(25);
  const [taxFreeTakeAge, setTaxFreeTakeAge] = useState(57);
  const [taxFreeYears, setTaxFreeYears] = useState(1);
  const [drawdownAge, setDrawdownAge] = useState(57);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [currentAge, setCurrentAge] = useState(35);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [drawdownPhases, setDrawdownPhases] = useState([
    { rate: 6, years: 10, label: "Active early retirement" },
    { rate: 5, years: 10, label: "Standard drawdown" },
    { rate: 4, years: 8, label: "Later retirement" },
    { rate: 3, years: 99, label: "Late stage" },
  ]);

  const updatePhase = (idx, field, value) => {
    setDrawdownPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const addPhase = () => {
    if (drawdownPhases.length < 4) {
      setDrawdownPhases((prev) => [...prev, { rate: 3, years: 99, label: "New phase" }]);
    }
  };

  const removePhase = (idx) => {
    if (drawdownPhases.length > 1) {
      setDrawdownPhases((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const projection = useMemo(() => {
    const years = [];
    let pot = currentPot;
    let contrib = annualContrib;
    let totalTaxFree = 0;
    let taxFreeComplete = false;
    let taxFreeStarted = false;
    let totalContributions = 0;
    let peakValue = currentPot;
    let annualDrawdown = 0;

    // Pre-calculate: at the start age, snapshot the pot to determine total tax-free entitlement
    // We'll calculate this on the fly when we first hit taxFreeTakeAge
    let taxFreeEntitlement = 0;
    let taxFreePerYear = 0;
    let taxFreeYearsTaken = 0;

    const drawdownMap = {};
    let phaseStartAge = drawdownAge;
    for (let pi = 0; pi < drawdownPhases.length; pi++) {
      const phase = drawdownPhases[pi];
      const isLast = pi === drawdownPhases.length - 1;
      const endAge = isLast ? 999 : phaseStartAge + phase.years;
      for (let a = phaseStartAge; a < endAge && a <= 90; a++) {
        drawdownMap[a] = { rate: phase.rate, phaseIndex: pi };
      }
      phaseStartAge = endAge;
    }

    for (let age = currentAge; age <= 90; age++) {
      const isTaxFreePhase = age >= taxFreeTakeAge && age < taxFreeTakeAge + taxFreeYears && !taxFreeComplete;
      const isDrawingDown = age >= drawdownAge && (taxFreeComplete || (taxFreeStarted && age >= taxFreeTakeAge));
      const phaseInfo = drawdownMap[age] || { rate: drawdownPhases[drawdownPhases.length - 1]?.rate || 4, phaseIndex: drawdownPhases.length - 1 };

      // Contributions (before tax-free starts and before drawdown)
      if (age > currentAge && age < Math.max(taxFreeTakeAge, drawdownAge)) {
        pot += contrib;
        totalContributions += contrib;
        contrib *= 1 + contribGrowthRate / 100;
      }

      // Growth
      if (age > currentAge) {
        pot *= 1 + growthRate / 100;
      }

      // Calculate tax-free entitlement on the first year
      if (age === taxFreeTakeAge && !taxFreeStarted) {
        taxFreeEntitlement = Math.min(pot * (taxFreePercent / 100), 268275);
        taxFreePerYear = taxFreeEntitlement / taxFreeYears;
        taxFreeStarted = true;
      }

      // Take this year's tax-free tranche
      let thisYearTaxFree = 0;
      if (isTaxFreePhase && taxFreeStarted && taxFreeYearsTaken < taxFreeYears) {
        thisYearTaxFree = Math.min(taxFreePerYear, pot);
        pot -= thisYearTaxFree;
        totalTaxFree += thisYearTaxFree;
        taxFreeYearsTaken++;
        if (taxFreeYearsTaken >= taxFreeYears) {
          taxFreeComplete = true;
        }
      }

      // Drawdown (can run alongside phased tax-free from drawdownAge)
      if (isDrawingDown && pot > 0) {
        annualDrawdown = pot * (phaseInfo.rate / 100);
        pot -= annualDrawdown;
      } else {
        annualDrawdown = 0;
      }

      if (pot > peakValue) peakValue = pot;

      const yearsFromNow = age - currentAge;
      const realValue = pot / Math.pow(1 + inflationRate / 100, yearsFromNow);
      const realDrawdown = annualDrawdown / Math.pow(1 + inflationRate / 100, yearsFromNow);

      years.push({
        age,
        total: Math.max(pot, 0),
        realValue: Math.max(realValue, 0),
        contributions: totalContributions,
        taxFreeEvent: thisYearTaxFree > 0,
        taxFreeAmount: thisYearTaxFree,
        drawdownStart: age === drawdownAge && (taxFreeComplete || taxFreeStarted),
        drawingDown: isDrawingDown,
        phaseIndex: isDrawingDown ? phaseInfo.phaseIndex : -1,
        currentRate: isDrawingDown ? phaseInfo.rate : 0,
        annualDrawdown: isDrawingDown ? annualDrawdown : 0,
        realDrawdown: isDrawingDown ? realDrawdown : 0,
        monthlyDrawdown: isDrawingDown ? annualDrawdown / 12 : 0,
        realMonthlyDrawdown: isDrawingDown ? realDrawdown / 12 : 0,
      });

      if (pot <= 0 && isDrawingDown) {
        for (let a = age + 1; a <= 90; a++) {
          years.push({
            age: a, total: 0, realValue: 0, contributions: totalContributions,
            taxFreeEvent: false, taxFreeAmount: 0, drawdownStart: false,
            drawingDown: true, phaseIndex: -1, currentRate: 0,
            annualDrawdown: 0, realDrawdown: 0, monthlyDrawdown: 0, realMonthlyDrawdown: 0,
          });
        }
        break;
      }
    }
    return { years, taxFreeAmount: totalTaxFree, peakValue, totalContributions };
  }, [currentPot, annualContrib, contribGrowthRate, growthRate, taxFreePercent, taxFreeTakeAge, taxFreeYears, drawdownAge, drawdownPhases, inflationRate, currentAge]);

  const at75 = projection.years.find((y) => y.age === 75);
  const depletionYear = projection.years.find((y) => y.drawingDown && y.total <= 0);
  const firstDrawdown = projection.years.find((y) => y.annualDrawdown > 0);
  const atRetirement = projection.years.find((y) => y.age === drawdownAge);

  const phaseSummary = useMemo(() => {
    let startAge = drawdownAge;
    return drawdownPhases.map((p, i) => {
      const isLast = i === drawdownPhases.length - 1;
      const endAge = isLast ? "90+" : startAge + p.years;
      const summary = { ...p, startAge, endAge, index: i };
      startAge = isLast ? 999 : startAge + p.years;
      return summary;
    });
  }, [drawdownPhases, drawdownAge]);

  const cardStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: 20, marginBottom: 16,
  };

  const sectionTitle = (text) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#8a7e6b", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(170deg, #0f0d09 0%, #1a1610 40%, #0f0d09 100%)",
      color: "#f0e6d2", fontFamily: "'DM Sans', sans-serif", padding: "20px 16px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#c4a45a", textTransform: "uppercase", marginBottom: 8 }}>Pension Projection</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: 0, color: "#f0e6d2", lineHeight: 1.2 }}>Retirement Planner</h1>
          <div style={{ fontSize: 12, color: "#6b6252", marginTop: 6 }}>Age {currentAge} · Current pot {formatFull(currentPot)}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <StatCard label="At Drawdown" value={atRetirement ? formatCurrency(atRetirement.total) : "—"} sub={atRetirement ? `Age ${drawdownAge} · Real: ${formatCurrency(atRetirement.realValue)}` : ""} accent />
          <StatCard label="Tax-Free Lump" value={formatCurrency(projection.taxFreeAmount)} sub={taxFreeYears > 1 ? `${taxFreePercent}% over ages ${taxFreeTakeAge}–${taxFreeTakeAge + taxFreeYears - 1}` : `${taxFreePercent}% at age ${taxFreeTakeAge}`} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard
            label="Initial Monthly"
            value={firstDrawdown ? formatCurrency(firstDrawdown.monthlyDrawdown) : "—"}
            sub={firstDrawdown ? `${firstDrawdown.currentRate}% rate · Real: ${formatCurrency(firstDrawdown.realMonthlyDrawdown)}/mo` : ""}
            accent
          />
          <StatCard
            label={depletionYear ? "Pot Depleted" : "Pot at 75"}
            value={depletionYear ? `Age ${depletionYear.age}` : at75 ? formatCurrency(at75.total) : "—"}
            sub={depletionYear ? "Consider reducing drawdown" : at75 ? `Real: ${formatCurrency(at75.realValue)}` : ""}
          />
        </div>

        <div style={{ ...cardStyle, padding: "16px 12px 8px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a7e6b", marginBottom: 8, paddingLeft: 4 }}>POT VALUE OVER TIME</div>
          <MiniChart data={projection.years} phases={drawdownPhases} drawdownAge={drawdownAge} />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, fontSize: 10, color: "#6b6252", flexWrap: "wrap" }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#c4a45a", marginRight: 4, verticalAlign: "middle" }} />Growth</span>
            {drawdownPhases.map((p, i) => (
              <span key={i}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: PHASE_COLORS[i], marginRight: 4, verticalAlign: "middle" }} />{p.label || PHASE_LABELS[i]} ({p.rate}%)</span>
            ))}
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#8a4a4a", marginRight: 4, verticalAlign: "middle" }} />Depleted</span>
            <span><span style={{ display: "inline-block", width: 14, height: 0, borderTop: "1.5px dashed rgba(255,255,255,0.45)", marginRight: 4, verticalAlign: "middle" }} />Real value</span>
          </div>
        </div>

        {/* Phase Timeline Bar */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a7e6b", marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Drawdown Phase Timeline</div>
          <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
            {phaseSummary.map((p, i) => {
              const totalYears = 90 - drawdownAge;
              const phaseYears = i === drawdownPhases.length - 1 ? 90 - p.startAge : p.years;
              const pct = (phaseYears / totalYears) * 100;
              return <div key={i} style={{ width: `${pct}%`, background: PHASE_COLORS[i], opacity: 0.7 }} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "#8a7e6b" }}>
            {phaseSummary.map((p, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: PHASE_COLORS[i] }} />
                Age {p.startAge}–{p.endAge}: {p.rate}%
              </span>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          {sectionTitle("Contributions & Growth")}
          <SliderInput label="Your Age" value={currentAge} onChange={setCurrentAge} min={18} max={54} step={1} description="Projections run from this age through to 90" />
          <SliderInput label="Current Pot Value" value={currentPot} onChange={setCurrentPot} min={0} max={1000000} step={5000} format={formatFull} />
          <SliderInput label="Annual Contributions" value={annualContrib} onChange={setAnnualContrib} min={0} max={60000} step={500} format={formatFull} description="Your + employer combined annual contributions" />
          <SliderInput label="Annual Growth Rate" value={growthRate} onChange={setGrowthRate} min={0} max={12} step={0.5} suffix="%" description="Expected annual investment return before fees" />
        </div>

        <div style={cardStyle}>
          {sectionTitle("Tax-Free Lump Sum")}
          <SliderInput label="Tax-Free %" value={taxFreePercent} onChange={setTaxFreePercent} min={0} max={25} step={1} suffix="%" description="Currently max 25% (capped at £268,275)" />
          <SliderInput label="Start Age" value={taxFreeTakeAge} onChange={setTaxFreeTakeAge} min={55} max={75} step={1} description="Minimum pension access age rises to 57 in 2028" />
          <SliderInput label="Spread Over" value={taxFreeYears} onChange={setTaxFreeYears} min={1} max={15} step={1} suffix={taxFreeYears === 1 ? " year" : " years"} description={taxFreeYears > 1 ? `Phased crystallisation: ${formatCurrency(projection.taxFreeAmount / taxFreeYears)}/yr over ages ${taxFreeTakeAge}–${taxFreeTakeAge + taxFreeYears - 1}` : "Take it all in one go, or spread over multiple years"} />
        </div>

        {/* Multi-Phase Drawdown */}
        <div style={cardStyle}>
          {sectionTitle("Drawdown Phases")}
          <SliderInput label="Drawdown Start Age" value={drawdownAge} onChange={setDrawdownAge} min={55} max={75} step={1} description="When you start taking regular income" />

          <div style={{ marginTop: 8 }}>
            {drawdownPhases.map((phase, idx) => {
              const isLast = idx === drawdownPhases.length - 1;
              return (
                <div key={idx} style={{
                  background: `${PHASE_COLORS[idx]}08`,
                  border: `1px solid ${PHASE_COLORS[idx]}22`,
                  borderRadius: 10,
                  padding: "14px 14px 6px",
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: PHASE_COLORS[idx] }} />
                      <input
                        type="text"
                        value={phase.label}
                        onChange={(e) => updatePhase(idx, "label", e.target.value)}
                        style={{
                          background: "transparent", border: "none", color: "#f0e6d2",
                          fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                          outline: "none", width: 180, padding: 0,
                        }}
                      />
                    </div>
                    {drawdownPhases.length > 1 && (
                      <button
                        onClick={() => removePhase(idx)}
                        style={{
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6, color: "#8a7e6b", fontSize: 11, padding: "3px 8px",
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}
                      >Remove</button>
                    )}
                  </div>

                  <SliderInput
                    label="Withdrawal Rate"
                    value={phase.rate}
                    onChange={(v) => updatePhase(idx, "rate", v)}
                    min={1} max={15} step={0.5} suffix="%"
                    description={phase.rate > 6 ? "High rate — pot will deplete faster" : phase.rate <= 4 ? "Conservative sustainable rate" : "Moderate withdrawal rate"}
                  />

                  {!isLast && (
                    <SliderInput
                      label="Duration"
                      value={phase.years}
                      onChange={(v) => updatePhase(idx, "years", v)}
                      min={1} max={30} step={1}
                      suffix=" yrs"
                      description={`Ages ${phaseSummary[idx]?.startAge}–${phaseSummary[idx]?.endAge}`}
                    />
                  )}

                  {isLast && (
                    <div style={{ fontSize: 11, color: "#6b6252", marginBottom: 10, paddingLeft: 2 }}>
                      Final phase — runs from age {phaseSummary[idx]?.startAge} until pot depleted or age 90
                    </div>
                  )}
                </div>
              );
            })}

            {drawdownPhases.length < 4 && (
              <button
                onClick={addPhase}
                style={{
                  width: "100%", background: "rgba(196,164,90,0.06)",
                  border: "1px dashed rgba(196,164,90,0.25)", borderRadius: 10,
                  padding: "12px", color: "#c4a45a", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.03em",
                }}
              >+ Add Drawdown Phase</button>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "14px 20px", color: "#8a7e6b", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span>Advanced Assumptions</span>
          <span style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
        </button>

        {showAdvanced && (
          <div style={cardStyle}>
            <SliderInput label="Inflation Rate" value={inflationRate} onChange={setInflationRate} min={0} max={6} step={0.5} suffix="%" description="Used to calculate 'real' values in today's money" />
            <SliderInput label="Contribution Growth Rate" value={contribGrowthRate} onChange={setContribGrowthRate} min={0} max={10} step={0.5} suffix="%" description="Annual increase in your contributions (e.g. salary rises)" />
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: 24 }}>
          {sectionTitle("Milestones")}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ textAlign: "left", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Age</th>
                  <th style={{ textAlign: "right", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Pot</th>
                  <th style={{ textAlign: "right", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Real Pot</th>
                  <th style={{ textAlign: "right", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Rate</th>
                  <th style={{ textAlign: "right", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Monthly</th>
                  <th style={{ textAlign: "right", padding: "8px 4px", color: "#6b6252", fontWeight: 600, fontSize: 11 }}>Real Mo.</th>
                </tr>
              </thead>
              <tbody>
                {[40, 50, 57, 60, 65, 67, 70, 75, 80, 85, 90].map((targetAge) => {
                  const row = projection.years.find((y) => y.age === targetAge);
                  if (!row) return null;
                  const phaseColor = row.phaseIndex >= 0 ? PHASE_COLORS[row.phaseIndex] : null;
                  return (
                    <tr key={targetAge} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 4px", color: targetAge === drawdownAge ? "#c4a45a" : "#f0e6d2", fontWeight: targetAge === drawdownAge ? 700 : 400 }}>{targetAge}</td>
                      <td style={{ textAlign: "right", padding: "8px 4px", color: "#f0e6d2" }}>{formatCurrency(row.total)}</td>
                      <td style={{ textAlign: "right", padding: "8px 4px", color: "#8a7e6b" }}>{formatCurrency(row.realValue)}</td>
                      <td style={{ textAlign: "right", padding: "8px 4px", color: phaseColor || "#3a3628" }}>
                        {row.currentRate > 0 ? `${row.currentRate}%` : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 4px", color: row.monthlyDrawdown > 0 ? (phaseColor || "#5a8a4a") : "#3a3628" }}>
                        {row.monthlyDrawdown > 0 ? formatCurrency(row.monthlyDrawdown) : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 4px", color: row.realMonthlyDrawdown > 0 ? "#8a7e6b" : "#3a3628" }}>
                        {row.realMonthlyDrawdown > 0 ? formatCurrency(row.realMonthlyDrawdown) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          background: "rgba(196,164,90,0.06)", border: "1px solid rgba(196,164,90,0.15)",
          borderRadius: 10, padding: 16, fontSize: 12, color: "#8a7e6b", lineHeight: 1.7, marginBottom: 32,
        }}>
          <div style={{ fontWeight: 700, color: "#c4a45a", marginBottom: 8, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>Key Assumptions & Notes</div>
          <div>• Growth is applied annually after contributions. Real values are adjusted for {inflationRate}% inflation.</div>
          <div>• Tax-free lump sum can be taken in one go or phased over multiple years (phased crystallisation). Each tranche crystallises 25% tax-free. Total capped at £268,275.</div>
          <div>• Drawdown phases apply sequentially. The final phase runs indefinitely until the pot is depleted or age 90.</div>
          <div>• Withdrawals beyond the tax-free portion are taxed as income — your effective rate depends on other income sources.</div>
          <div>• This model does not include State Pension (currently ~£11,500/yr from age 67), which would supplement drawdown income.</div>
          <div>• Platform fees and fund charges (typically 0.3–0.8% combined) are not deducted — reduce growth rate to account for these.</div>
          <div>• The Annual Allowance for tax-relieved contributions is currently £60,000/yr.</div>
          <div>• From April 2027, pensions will be subject to Inheritance Tax — consider estate planning implications.</div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(196,164,90,0.15)", color: "#6b6252" }}>Not financial advice. This is a simplified projection for exploring scenarios — speak to a regulated financial adviser before making decisions about your pension.</div>
        </div>
      </div>
    </div>
  );
}
