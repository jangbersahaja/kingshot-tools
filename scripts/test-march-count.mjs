/**
 * Test: Optimal march count sweep
 *
 * Question: given a fixed troop pool, is it better to run fewer marches
 * (each one stronger) or more marches (more joiner hits but weaker each)?
 *
 * Model:
 *   - Player has up to MAX_MARCH_SLOTS march slots
 *   - Own rally always uses 1 slot (OWN_RALLY_CAP)
 *   - Remaining slots = joiner marches (each JOINER_CAP)
 *   - Each joiner march joins RALLIES_PER_JOINER rallies on average
 *   - effectiveJoinerHits = joinerCount × RALLIES_PER_JOINER
 *   - Own rally fires OWN_RALLY_FIRES times
 *   - Event score = ownRallyDmg × OWN_RALLY_FIRES
 *                 + avgJoinerDmg × (2/3) × effectiveJoinerHits
 *
 * Troops are distributed using Concept A (k²-global) only, since it proved
 * more robust across all supply scenarios.
 *
 * Run: node scripts/test-march-count.mjs
 */

// ── True attack values ────────────────────────────────────────────────────────
const TRUE_ATTACK = {
  archer: { 10: 1888 },
  cavalry: { 10: 1416 },
  infantry: { 10: 472 },
};

// ── Attack factors ────────────────────────────────────────────────────────────
const JOINER_STATS = {
  infantry: { attack: 438.7, lethality: 287.3 },
  cavalry: { attack: 374.4, lethality: 276.9 },
  archer: { attack: 376.5, lethality: 303.5 },
};
const A = {}; // combined attack × lethality factor per type
for (const [type, s] of Object.entries(JOINER_STATS)) {
  A[type] = (1 + s.attack / 100) * (1 + s.lethality / 100);
}

// ── Config ────────────────────────────────────────────────────────────────────
const OWN_RALLY_CAP = 125_000;
const JOINER_CAP = 65_000;
const MAX_MARCH_SLOTS = 6;
const OWN_RALLY_FIRES = 5;

// Troop scenarios for Part 1 (march count sweep at fixed rally rate)
const RALLIES_PER_JOINER_FIXED = 8;
const SCENARIOS = [
  { label: "150k each (tight)", arc: 150_000, cav: 150_000, inf: 150_000 },
  { label: "200k each", arc: 200_000, cav: 200_000, inf: 200_000 },
  { label: "250k each", arc: 250_000, cav: 250_000, inf: 250_000 },
  { label: "300k each (abundant)", arc: 300_000, cav: 300_000, inf: 300_000 },
];

// Rally rate sweep for Part 2 (find break-even: when does adding a march stop helping?)
const RALLY_RATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Test multiple inventory sizes to see if tight supply ever causes a flip
const SWEEP_SCENARIOS = [
  { label: "150k each (tight)", arc: 150_000, cav: 150_000, inf: 150_000 },
  { label: "200k each", arc: 200_000, cav: 200_000, inf: 200_000 },
  { label: "300k each (abundant)", arc: 300_000, cav: 300_000, inf: 300_000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function floor10(n) {
  return Math.floor(n / 10) * 10;
}

function kFor(type) {
  const ta = Object.values(TRUE_ATTACK[type])[0];
  const mult = type === "archer" ? 1.1 * 1.1 : 1.0;
  return ta * mult * A[type];
}
const kInf = kFor("infantry");
const kCav = kFor("cavalry");
const kArc = kFor("archer");
const kTotal2 = kInf ** 2 + kCav ** 2 + kArc ** 2;
const arcFrac = kArc ** 2 / kTotal2;
const cavFrac = kCav ** 2 / kTotal2;
const infFrac = kInf ** 2 / kTotal2;

function singleMarchDamage(counts) {
  let dmg = 0;
  for (const type of ["archer", "cavalry", "infantry"]) {
    const N = counts[type];
    if (N <= 0) continue;
    const ta = Object.values(TRUE_ATTACK[type])[0];
    let mult = 1.0;
    if (type === "archer") {
      mult = 1.1 * 1.1;
    }
    dmg += ((ta * mult * 1.2) / 1000) * Math.sqrt(5000 * N) * A[type] * 10;
  }
  return dmg;
}

/**
 * Concept A (k²-global): given totalArc/Cav/Inf supply and a march config,
 * compute optimal formation and event score.
 */
function computeEventScore(
  totalArc,
  totalCav,
  totalInf,
  joinerCount,
  ralliesPerJoiner,
) {
  const totalCap = OWN_RALLY_CAP + joinerCount * JOINER_CAP;

  // Global k²-optimal solve, supply-capped
  let gArc = floor10(Math.min(totalCap * arcFrac, totalArc));
  let gCav = floor10(Math.min(totalCap * cavFrac, totalCav));
  let gInf = floor10(Math.min(totalCap * infFrac, totalInf));
  let spare = totalCap - gArc - gCav - gInf;
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalArc - gArc));
    gArc += e;
    spare -= e;
  }
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalCav - gCav));
    gCav += e;
    spare -= e;
  }
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalInf - gInf));
    gInf += e;
  }

  // Own rally: proportional share by capacity
  const ownFrac = OWN_RALLY_CAP / totalCap;
  let ownArc = floor10(gArc * ownFrac);
  let ownCav = floor10(gCav * ownFrac);
  let ownInf = floor10(gInf * ownFrac);
  // Overflow guard
  const ownTotal = ownArc + ownCav + ownInf;
  if (ownTotal > OWN_RALLY_CAP) {
    ownInf = Math.max(0, ownInf - floor10(ownTotal - OWN_RALLY_CAP));
  }
  const ownRally = { archer: ownArc, cavalry: ownCav, infantry: ownInf };

  // Joiners: equal share of remainder
  let joiner = { archer: 0, cavalry: 0, infantry: 0 };
  if (joinerCount > 0) {
    const remArc = gArc - ownArc;
    const remCav = gCav - ownCav;
    const remInf = gInf - ownInf;
    joiner.archer = floor10(Math.min(remArc / joinerCount, JOINER_CAP));
    joiner.cavalry = floor10(Math.min(remCav / joinerCount, JOINER_CAP));
    joiner.infantry = floor10(Math.min(remInf / joinerCount, JOINER_CAP));
    // Fill spare in joiner
    let jSpare = JOINER_CAP - joiner.archer - joiner.cavalry - joiner.infantry;
    if (jSpare > 0) {
      const e = floor10(Math.min(jSpare, remArc / joinerCount - joiner.archer));
      joiner.archer += e;
      jSpare -= e;
    }
    if (jSpare > 0) {
      const e = floor10(
        Math.min(jSpare, remCav / joinerCount - joiner.cavalry),
      );
      joiner.cavalry += e;
      jSpare -= e;
    }
    if (jSpare > 0) {
      const e = floor10(
        Math.min(jSpare, remInf / joinerCount - joiner.infantry),
      );
      joiner.infantry += e;
    }
  }

  const ownDmg = singleMarchDamage(ownRally);
  const joinerDmg = joinerCount > 0 ? singleMarchDamage(joiner) : 0;
  const effHits = joinerCount * ralliesPerJoiner;
  const score = ownDmg * OWN_RALLY_FIRES + joinerDmg * (2 / 3) * effHits;

  return { ownRally, joiner, ownDmg, joinerDmg, effHits, score, totalCap };
}

// ── Output helpers ────────────────────────────────────────────────────────────
function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}
function fmtM(n) {
  return (n / 1_000_000).toFixed(2) + "M";
}
function pct(n, cap) {
  return cap > 0 ? ((n / cap) * 100).toFixed(0) + "%" : "—";
}

// ── Main sweep ────────────────────────────────────────────────────────────────
console.log(
  `k²-ideal: arc ${(arcFrac * 100).toFixed(1)}% | cav ${(cavFrac * 100).toFixed(1)}% | inf ${(infFrac * 100).toFixed(1)}%`,
);
console.log(
  `Own rally cap: ${fmt(OWN_RALLY_CAP)}  |  Joiner cap: ${fmt(JOINER_CAP)}  |  Max march slots: ${MAX_MARCH_SLOTS}`,
);
console.log(`Own rally fires: ${OWN_RALLY_FIRES}`);
console.log();
console.log(
  "▓▓▓ PART 1 — March count sweep (rallies/joiner = " +
    RALLIES_PER_JOINER_FIXED +
    ") ▓▓▓",
);
console.log();

for (const sc of SCENARIOS) {
  const totalInv = sc.arc + sc.cav + sc.inf;
  console.log(`${"═".repeat(62)}`);
  console.log(`  ${sc.label}  (total pool: ${fmt(totalInv)} troops)`);
  console.log(`${"═".repeat(62)}`);
  console.log(
    `  ${"Slt".padEnd(4)} ${"TotalCap".padEnd(9)} ${"── Own rally (125k) ──────────────────".padEnd(38)} ${"── Each joiner (65k) ─────────────────".padEnd(38)} ${"Hits".padEnd(5)} ${"Score".padEnd(10)} ${"vs prev"}`,
  );
  console.log(
    `  ${"".padEnd(4)} ${"".padEnd(9)} ${"arc".padStart(7)}  ${"cav".padStart(7)}  ${"inf".padStart(7)}  ${"total".padStart(7)}   ${"arc".padStart(7)}  ${"cav".padStart(7)}  ${"inf".padStart(7)}  ${"total".padStart(7)}`,
  );
  console.log(`  ${"-".repeat(115)}`);

  let bestScore = -Infinity;
  let bestSlots = 1;
  let prevScore = null;

  for (let slots = 1; slots <= MAX_MARCH_SLOTS; slots++) {
    const joinerCount = slots - 1;
    const r = computeEventScore(
      sc.arc,
      sc.cav,
      sc.inf,
      joinerCount,
      RALLIES_PER_JOINER_FIXED,
    );

    const o = r.ownRally;
    const j = r.joiner;
    const oTotal = o.archer + o.cavalry + o.infantry;
    const jTotal = j.archer + j.cavalry + j.infantry;

    const ownCols =
      `${(fmt(o.archer) + "(" + pct(o.archer, OWN_RALLY_CAP) + ")").padStart(9)}` +
      `  ${(fmt(o.cavalry) + "(" + pct(o.cavalry, OWN_RALLY_CAP) + ")").padStart(9)}` +
      `  ${(fmt(o.infantry) + "(" + pct(o.infantry, OWN_RALLY_CAP) + ")").padStart(9)}` +
      `  ${fmt(oTotal).padStart(7)}`;
    const joinCols =
      joinerCount === 0
        ? "  (no joiners)".padEnd(40)
        : `  ${(fmt(j.archer) + "(" + pct(j.archer, JOINER_CAP) + ")").padStart(9)}` +
          `  ${(fmt(j.cavalry) + "(" + pct(j.cavalry, JOINER_CAP) + ")").padStart(9)}` +
          `  ${(fmt(j.infantry) + "(" + pct(j.infantry, JOINER_CAP) + ")").padStart(9)}` +
          `  ${fmt(jTotal).padStart(7)}`;

    const vsPrev =
      prevScore === null
        ? ""
        : r.score > prevScore
          ? `+${fmtM(r.score - prevScore)}`
          : `-${fmtM(prevScore - r.score)}`;

    const star = r.score > bestScore ? " ★" : "";
    if (r.score > bestScore) {
      bestScore = r.score;
      bestSlots = slots;
    }

    console.log(
      `  ${String(slots).padEnd(4)} ${fmt(r.totalCap / 1000).padStart(6)}k   ` +
        `${ownCols}  ${joinCols}  ` +
        `${String(r.effHits).padEnd(5)} ${fmtM(r.score).padEnd(10)} ${vsPrev}${star}`,
    );

    prevScore = r.score;
  }

  console.log(
    `  → Best: ${bestSlots} march slot(s) (${bestSlots - 1} joiners, ${(bestSlots - 1) * RALLIES_PER_JOINER_FIXED} joiner hits)`,
  );
  console.log();
}

// ── PART 2: Rally rate sweep — find break-even for each added march slot ─────
console.log("▓▓▓ PART 2 — Rally rate sweep (find break-even) ▓▓▓");
console.log(
  `  Does a low-activity alliance (few rallies/joiner) ever favour fewer marches?`,
);
console.log();

for (const sw of SWEEP_SCENARIOS) {
  const totalInv = sw.arc + sw.cav + sw.inf;
  console.log(`── ${sw.label} (${fmt(totalInv)} troops) ${"─".repeat(40)}`);
  process.stdout.write(`  ${"Rate".padEnd(12)}`);
  for (let slots = 1; slots <= MAX_MARCH_SLOTS; slots++) {
    process.stdout.write(` ${(slots + "slot").padStart(10)}`);
  }
  console.log(`  Best   Marginal gains (per extra slot)`);
  console.log(`  ${"─".repeat(12 + MAX_MARCH_SLOTS * 11 + 50)}`);

  for (const rate of RALLY_RATES) {
    const scores = [];
    for (let slots = 1; slots <= MAX_MARCH_SLOTS; slots++) {
      const r = computeEventScore(sw.arc, sw.cav, sw.inf, slots - 1, rate);
      scores.push(r.score);
    }
    const bestIdx = scores.indexOf(Math.max(...scores));
    const bestSlots = bestIdx + 1;

    process.stdout.write(`  ${("rallies=" + rate).padEnd(12)}`);
    for (let i = 0; i < scores.length; i++) {
      const marker = i === bestIdx ? "★" : " ";
      process.stdout.write(` ${(fmtM(scores[i]) + marker).padStart(10)}`);
    }
    const gains = scores.map((s, i) =>
      i === 0 ? "base" : "+" + fmtM(s - scores[i - 1]),
    );
    console.log(`  ${bestSlots}slot   [${gains.join(", ")}]`);
  }
  console.log();
}

console.log(`Conclusion:`);
console.log(
  `  Even at 1 rally/joiner, more marches always wins — the extra joiner hits`,
);
console.log(
  `  outweigh any troop dilution as long as the march joins at least 1 rally.`,
);
console.log(
  `  The ONLY case where fewer marches wins: a march slot joins ZERO rallies.`,
);
console.log(
  `  → Tool recommendation: always use max march slots, but warn when rally`,
);
console.log(`    activity is very low (alliance has few event participants).`);
