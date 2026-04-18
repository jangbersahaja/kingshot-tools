/**
 * Test: Optimal joiner march capacity
 *
 * Question: does reducing the joiner cap per march improve event score?
 * A smaller cap means each joiner march is more archer-dense (closer to the
 * k²-ideal 72% ratio), but also means fewer total troops deployed per march.
 *
 * For each joiner cap, we also sweep march count 1–6 to find the true best
 * combination of (joiner cap × march count).
 *
 * Note: "joiner cap" here means the troop limit the player sets for each
 * joining march — NOT the game's hard cap. Players can choose to send fewer
 * troops than the max allowed (e.g. set march to 40k instead of 65k).
 *
 * Model: same as test-march-count.mjs
 *   Event score = ownRallyDmg × OWN_RALLY_FIRES
 *               + avgJoinerDmg × (2/3) × joinerCount × RALLIES_PER_JOINER
 *
 * Run: node scripts/test-joiner-cap.mjs
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
const A = {};
for (const [type, s] of Object.entries(JOINER_STATS)) {
  A[type] = (1 + s.attack / 100) * (1 + s.lethality / 100);
}

// ── Config ────────────────────────────────────────────────────────────────────
const OWN_RALLY_CAP = 125_000;
const MAX_MARCH_SLOTS = 6;
const OWN_RALLY_FIRES = 5;
const RALLIES_PER_JOINER = 8;

// Joiner caps to test (player-controlled troop limit per joiner march)
const JOINER_CAPS = [20_000, 30_000, 40_000, 50_000, 65_000];

// Inventory scenarios
const SCENARIOS = [
  { label: "150k each (tight)", arc: 150_000, cav: 150_000, inf: 150_000 },
  { label: "200k each", arc: 200_000, cav: 200_000, inf: 200_000 },
  { label: "300k each (abundant)", arc: 300_000, cav: 300_000, inf: 300_000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const floor10 = (n) => Math.floor(n / 10) * 10;

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
    const mult = type === "archer" ? 1.21 : 1.0;
    dmg += ((ta * mult * 1.2) / 1000) * Math.sqrt(5000 * N) * A[type] * 10;
  }
  return dmg;
}

function computeEventScore(
  totalArc,
  totalCav,
  totalInf,
  joinerCount,
  joinerCap,
) {
  const totalCap = OWN_RALLY_CAP + joinerCount * joinerCap;

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
  const ownTotal = ownArc + ownCav + ownInf;
  if (ownTotal > OWN_RALLY_CAP)
    ownInf = Math.max(0, ownInf - floor10(ownTotal - OWN_RALLY_CAP));
  const ownRally = { archer: ownArc, cavalry: ownCav, infantry: ownInf };

  // Joiners: equal share of remainder, capped to joinerCap
  let joiner = { archer: 0, cavalry: 0, infantry: 0 };
  if (joinerCount > 0) {
    const remArc = gArc - ownArc;
    const remCav = gCav - ownCav;
    const remInf = gInf - ownInf;
    joiner.archer = floor10(Math.min(remArc / joinerCount, joinerCap));
    joiner.cavalry = floor10(Math.min(remCav / joinerCount, joinerCap));
    joiner.infantry = floor10(Math.min(remInf / joinerCount, joinerCap));
    let jSpare = joinerCap - joiner.archer - joiner.cavalry - joiner.infantry;
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
  const effHits = joinerCount * RALLIES_PER_JOINER;
  const score = ownDmg * OWN_RALLY_FIRES + joinerDmg * (2 / 3) * effHits;
  const jTotal = joiner.archer + joiner.cavalry + joiner.infantry;
  const jArcPct =
    joinerCount > 0
      ? ((joiner.archer / joinerCap) * 100).toFixed(0) + "%"
      : "—";

  return {
    ownRally,
    joiner,
    ownDmg,
    joinerDmg,
    effHits,
    score,
    totalCap,
    jTotal,
    jArcPct,
  };
}

// ── Output helpers ────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const fmtM = (n) => (n / 1_000_000).toFixed(3) + "M";
const pct = (n, cap) => (cap > 0 ? ((n / cap) * 100).toFixed(0) + "%" : "—");

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(
  `k²-ideal: arc ${(arcFrac * 100).toFixed(1)}% | cav ${(cavFrac * 100).toFixed(1)}% | inf ${(infFrac * 100).toFixed(1)}%`,
);
console.log(
  `Own rally cap: ${fmt(OWN_RALLY_CAP)} | Own rally fires: ${OWN_RALLY_FIRES} | Rallies/joiner: ${RALLIES_PER_JOINER}`,
);
console.log();

for (const sc of SCENARIOS) {
  console.log(`${"═".repeat(70)}`);
  console.log(`  ${sc.label}`);
  console.log(`${"═".repeat(70)}`);

  // Part A: for each joiner cap, find best march count and show all options
  // Summary table: rows = joiner cap, cols = march slots
  console.log(`\n  ── Event score by (joiner cap × march slots) ──`);
  console.log(
    `  ${"JoinerCap".padEnd(12)} ${[1, 2, 3, 4, 5, 6].map((s) => ("slot" + s).padStart(10)).join("")}  Best combo`,
  );
  console.log(`  ${"─".repeat(80)}`);

  let globalBest = { score: -Infinity, jCap: 0, slots: 0 };

  for (const jCap of JOINER_CAPS) {
    const scores = [];
    for (let slots = 1; slots <= MAX_MARCH_SLOTS; slots++) {
      const r = computeEventScore(sc.arc, sc.cav, sc.inf, slots - 1, jCap);
      scores.push(r.score);
      if (r.score > globalBest.score)
        globalBest = { score: r.score, jCap, slots };
    }
    const bestIdx = scores.indexOf(Math.max(...scores));
    const row = scores
      .map((s, i) => {
        const marker = i === bestIdx ? "★" : " ";
        return (fmtM(s) + marker).padStart(10);
      })
      .join("");
    const capLabel = `${fmt(jCap / 1000)}k cap`;
    console.log(`  ${capLabel.padEnd(12)} ${row}  → best: slot${bestIdx + 1}`);
  }

  console.log(
    `\n  ★ GLOBAL BEST: joinerCap=${fmt(globalBest.jCap / 1000)}k  slots=${globalBest.slots}  score=${fmtM(globalBest.score)}`,
  );

  // Part B: drill into the global best AND the 65k/6-slot baseline, show distributions
  const baseline = computeEventScore(sc.arc, sc.cav, sc.inf, 5, 65_000); // 6 slots, 65k
  const best = computeEventScore(
    sc.arc,
    sc.cav,
    sc.inf,
    globalBest.slots - 1,
    globalBest.jCap,
  );

  console.log(`\n  ── Distribution detail ──`);
  console.log(
    `  ${"".padEnd(28)} ${"arc".padStart(12)}  ${"cav".padStart(12)}  ${"inf".padStart(10)}  ${"total".padStart(8)}`,
  );

  function printDist(label, march, cap) {
    const total = march.archer + march.cavalry + march.infantry;
    console.log(
      `  ${label.padEnd(28)}` +
        ` ${(fmt(march.archer) + "(" + pct(march.archer, cap) + ")").padStart(12)}` +
        `  ${(fmt(march.cavalry) + "(" + pct(march.cavalry, cap) + ")").padStart(12)}` +
        `  ${(fmt(march.infantry) + "(" + pct(march.infantry, cap) + ")").padStart(10)}` +
        `  ${fmt(total).padStart(8)}`,
    );
  }

  console.log(`  Baseline (65k cap, 6 slots):`);
  printDist("  Own rally (125k):", baseline.ownRally, OWN_RALLY_CAP);
  printDist("  Each joiner (65k):", baseline.joiner, 65_000);
  console.log(
    `  Score: ownDmg ${fmtM(baseline.ownDmg)}×${OWN_RALLY_FIRES}=${fmtM(baseline.ownDmg * OWN_RALLY_FIRES)}  joinerDmg ${fmtM(baseline.joinerDmg)}×2/3×${baseline.effHits}=${fmtM(baseline.joinerDmg * (2 / 3) * baseline.effHits)}  → ${fmtM(baseline.score)}`,
  );

  if (globalBest.slots !== 6 || globalBest.jCap !== 65_000) {
    console.log(
      `\n  Global best (${fmt(globalBest.jCap / 1000)}k cap, ${globalBest.slots} slots):`,
    );
    printDist("  Own rally (125k):", best.ownRally, OWN_RALLY_CAP);
    if (globalBest.slots > 1)
      printDist(
        `  Each joiner (${fmt(globalBest.jCap / 1000)}k):`,
        best.joiner,
        globalBest.jCap,
      );
    console.log(
      `  Score: ownDmg ${fmtM(best.ownDmg)}×${OWN_RALLY_FIRES}=${fmtM(best.ownDmg * OWN_RALLY_FIRES)}  joinerDmg ${fmtM(best.joinerDmg)}×2/3×${best.effHits}=${fmtM(best.joinerDmg * (2 / 3) * best.effHits)}  → ${fmtM(best.score)}`,
    );
    const delta = best.score - baseline.score;
    console.log(
      `  vs baseline: ${delta >= 0 ? "+" : ""}${fmtM(delta)} (${((delta / baseline.score) * 100).toFixed(2)}%)`,
    );
  } else {
    console.log(
      `\n  (Global best IS the baseline — 65k/6-slot is already optimal)`,
    );
  }
  console.log();
}
