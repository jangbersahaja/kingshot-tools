/**
 * Test: Concept A (current k²-uniform) vs Concept B (archers-first fixed ratio)
 * for the average player formation — comparing TOTAL EVENT DAMAGE.
 *
 * Event score = ownRallyDamage × ownRallyCount
 *             + avgJoinerDmg × (2/3) × effectiveJoinedRallyCount
 *
 * Scenario (realistic average player):
 *   Own rally deploy capacity : 125,000
 *   Joiner limit              : 65,000
 *   March count               : 6  (1 own rally + 5 joiners)
 *   Own rally led             : 5
 *   Joiner hit                : 50  (effJoined = joinedRallyCount × joinerCount / marchCount)
 *                                   → joinedRallyCount = 50 × 6/5 = 60
 *
 * Concept A: global k²-optimal across all 6 slots; own rally gets proportionally
 *            more troops (larger cap), joiners all identical
 * Concept B: archers split equally across all 6 marches (capped 61% of their
 *            respective cap), 4% min inf, cavalry fills remaining
 *            — own rally and joiners CAN differ because caps differ
 *
 * Run: node scripts/test-avg-ratio.mjs
 */

// ── True attack values (from troops.ts) ──────────────────────────────────────
const TRUE_ATTACK = {
  archer: { 10: 1888 },
  cavalry: { 10: 1416 },
  infantry: { 10: 472 },
};

// ── Attack factor helpers ─────────────────────────────────────────────────────
// Default joiner stats (from calculations.ts DEFAULT_JOINER_STATS)
const JOINER_STATS = {
  infantry: { attack: 438.7, lethality: 287.3 },
  cavalry: { attack: 374.4, lethality: 276.9 },
  archer: { attack: 376.5, lethality: 303.5 },
};
// Player own stats — same battle stats as joiners for this test (average player)
const PLAYER_STATS = JOINER_STATS;

const A_joiner = {
  infantry:
    (1 + JOINER_STATS.infantry.attack / 100) *
    (1 + JOINER_STATS.infantry.lethality / 100),
  cavalry:
    (1 + JOINER_STATS.cavalry.attack / 100) *
    (1 + JOINER_STATS.cavalry.lethality / 100),
  archer:
    (1 + JOINER_STATS.archer.attack / 100) *
    (1 + JOINER_STATS.archer.lethality / 100),
};
const A_player = {
  infantry:
    (1 + PLAYER_STATS.infantry.attack / 100) *
    (1 + PLAYER_STATS.infantry.lethality / 100),
  cavalry:
    (1 + PLAYER_STATS.cavalry.attack / 100) *
    (1 + PLAYER_STATS.cavalry.lethality / 100),
  archer:
    (1 + PLAYER_STATS.archer.attack / 100) *
    (1 + PLAYER_STATS.archer.lethality / 100),
};

// ── Scenario ──────────────────────────────────────────────────────────────────
const INVENTORY = {
  archer: { 10: 300_000 },
  cavalry: { 10: 300_000 },
  infantry: { 10: 300_000 },
};

const OWN_RALLY_CAP = 125_000; // own rally deploy capacity
const JOINER_CAP = 65_000; // joiner march capacity
const MARCH_COUNT = 6; // total march slots (1 own + 5 joiners)
const OWN_RALLY_FIRES = 5; // own rally led (event multiplier)
const JOINER_COUNT = MARCH_COUNT - 1; // 5 joiner marches

// Derive joinedRallyCount so that effJoined = 50
// effJoined = round(joinedRallyCount × joinerCount / marchCount)
// 50 = joinedRallyCount × 5/6  → joinedRallyCount = 60
const JOINED_RALLY_COUNT = 60;

// effectiveJoinedRallyCount scaled by joiner fraction (as in calculations.ts)
const EFF_JOINED = Math.round(
  (JOINED_RALLY_COUNT * JOINER_COUNT) / MARCH_COUNT,
);
// Should be exactly 50: round(60 × 5/6) = round(50) = 50

// ── Helpers ───────────────────────────────────────────────────────────────────
function floor10(n) {
  return Math.floor(n / 10) * 10;
}

const totalArchers = Object.values(INVENTORY.archer).reduce((s, v) => s + v, 0);
const totalCavalry = Object.values(INVENTORY.cavalry).reduce(
  (s, v) => s + v,
  0,
);
const totalInfantry = Object.values(INVENTORY.infantry).reduce(
  (s, v) => s + v,
  0,
);

/**
 * Damage for one march.
 * @param counts  { archer, cavalry, infantry } troop counts
 * @param factors { archer, cavalry, infantry } A-factors (player or joiner)
 * @param invPool pool to draw tiers from (tracks remaining after each march)
 */
function singleMarchDamage(counts, factors) {
  let dmg = 0;
  for (const type of ["archer", "cavalry", "infantry"]) {
    const N = counts[type];
    if (N <= 0) continue;
    const taMap = TRUE_ATTACK[type];
    // All T10 here — single tier
    for (const [tStr, ta] of Object.entries(taMap)) {
      const t = +tStr;
      const proportion = 1.0; // 100% of this type is T10
      let mult = 1.0;
      if (type === "archer") {
        mult = 1.1;
        if (t >= 7) mult *= 1.1;
      }
      dmg +=
        ((ta * mult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * N) *
        factors[type] *
        10;
    }
  }
  return dmg;
}

// ── k² optimal ratio ─────────────────────────────────────────────────────────
function kFor(type, factors) {
  const ta = Object.values(TRUE_ATTACK[type])[0];
  let mult = type === "archer" ? 1.1 * 1.1 : 1.0;
  return ta * mult * factors[type];
}
// Use joiner factors for k² ratio (joiners dominate total march count)
const kInf = kFor("infantry", A_joiner);
const kCav = kFor("cavalry", A_joiner);
const kArc = kFor("archer", A_joiner);
const kTotal2 = kInf ** 2 + kCav ** 2 + kArc ** 2;

console.log("── Scenario ─────────────────────────────────────────────");
console.log(
  `  Inventory: ${(totalArchers / 1000).toFixed(0)}k arc | ${(totalCavalry / 1000).toFixed(0)}k cav | ${(totalInfantry / 1000).toFixed(0)}k inf`,
);
console.log(
  `  Own rally cap: ${(OWN_RALLY_CAP / 1000).toFixed(0)}k  |  Joiner cap: ${(JOINER_CAP / 1000).toFixed(0)}k  |  March slots: ${MARCH_COUNT} (1 own + ${JOINER_COUNT} joiners)`,
);
console.log(
  `  Own rally fires: ${OWN_RALLY_FIRES}  |  Joiner hits: ${EFF_JOINED}  (joinedRallyCount=${JOINED_RALLY_COUNT} → eff = round(${JOINED_RALLY_COUNT}×${JOINER_COUNT}/${MARCH_COUNT}) = ${EFF_JOINED})`,
);
console.log(
  `  k²-ideal ratio: arc ${((kArc ** 2 / kTotal2) * 100).toFixed(1)}% | cav ${((kCav ** 2 / kTotal2) * 100).toFixed(1)}% | inf ${((kInf ** 2 / kTotal2) * 100).toFixed(1)}%`,
);
console.log(
  `  Total troop capacity: ${(OWN_RALLY_CAP / 1000).toFixed(0)}k + ${JOINER_COUNT}×${(JOINER_CAP / 1000).toFixed(0)}k = ${((OWN_RALLY_CAP + JOINER_COUNT * JOINER_CAP) / 1000).toFixed(0)}k  |  Available: ${((totalArchers + totalCavalry + totalInfantry) / 1000).toFixed(0)}k`,
);
console.log();

// ── Concept A: global k²-optimal — own rally gets proportional share by cap ──
// Total capacity = OWN_RALLY_CAP + JOINER_COUNT × JOINER_CAP
// Global solve finds ideal totals, then distributes by capacity proportion.
function conceptA() {
  const totalCap = OWN_RALLY_CAP + JOINER_COUNT * JOINER_CAP;
  const arcFrac = kArc ** 2 / kTotal2;
  const cavFrac = kCav ** 2 / kTotal2;
  const infFrac = kInf ** 2 / kTotal2;

  // Global supply-capped solve
  let gArc = floor10(Math.min(totalCap * arcFrac, totalArchers));
  let gCav = floor10(Math.min(totalCap * cavFrac, totalCavalry));
  let gInf = floor10(Math.min(totalCap * infFrac, totalInfantry));
  let spare = totalCap - gArc - gCav - gInf;
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalArchers - gArc));
    gArc += e;
    spare -= e;
  }
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalCavalry - gCav));
    gCav += e;
    spare -= e;
  }
  if (spare > 0) {
    const e = floor10(Math.min(spare, totalInfantry - gInf));
    gInf += e;
  }

  // Own rally: proportional share by capacity
  const ownFrac = OWN_RALLY_CAP / totalCap;
  const ownRally = {
    archer: floor10(Math.min(gArc * ownFrac, OWN_RALLY_CAP)),
    cavalry: floor10(Math.min(gCav * ownFrac, OWN_RALLY_CAP)),
    infantry: floor10(Math.min(gInf * ownFrac, OWN_RALLY_CAP)),
  };
  // Cap own rally to OWN_RALLY_CAP (shouldn't overflow but guard anyway)
  const ownTotal = ownRally.archer + ownRally.cavalry + ownRally.infantry;
  if (ownTotal > OWN_RALLY_CAP) {
    const overage = ownTotal - OWN_RALLY_CAP;
    ownRally.infantry = Math.max(0, ownRally.infantry - floor10(overage));
  }

  // Remaining for joiners
  const remArc = gArc - ownRally.archer;
  const remCav = gCav - ownRally.cavalry;
  const remInf = gInf - ownRally.infantry;

  // Each joiner march gets equal per-march share (solve at per-march scale)
  const joiner = {
    archer: floor10(Math.min(remArc / JOINER_COUNT, JOINER_CAP)),
    cavalry: floor10(Math.min(remCav / JOINER_COUNT, JOINER_CAP)),
    infantry: floor10(Math.min(remInf / JOINER_COUNT, JOINER_CAP)),
  };
  // Fill any spare in joiner march (cascade)
  let jSpare = JOINER_CAP - joiner.archer - joiner.cavalry - joiner.infantry;
  if (jSpare > 0) {
    const e = floor10(Math.min(jSpare, remArc / JOINER_COUNT - joiner.archer));
    joiner.archer += e;
    jSpare -= e;
  }
  if (jSpare > 0) {
    const e = floor10(Math.min(jSpare, remCav / JOINER_COUNT - joiner.cavalry));
    joiner.cavalry += e;
    jSpare -= e;
  }

  const ownRallyDmg = singleMarchDamage(ownRally, A_player);
  const joinerDmg = singleMarchDamage(joiner, A_joiner);
  const eventScore =
    ownRallyDmg * OWN_RALLY_FIRES + joinerDmg * (2 / 3) * EFF_JOINED;

  return { ownRally, joiner, ownRallyDmg, joinerDmg, eventScore };
}

// ── Concept B: archers-first per march (61% cap each), 4% min inf, cav fills ─
// Archers split equally across all 6 marches (own rally + joiners).
// Each march's cap differs, so percentages will differ between own rally/joiners.
function conceptB() {
  const MAX_ARC_PCT = 0.61;
  const MIN_INF_PCT = 0.04;

  // ── Joiner allocation ─────────────────────────────────────────────────────
  // Archers: equal split across all 6 marches, capped at 61% of JOINER_CAP
  const joinerArc = floor10(
    Math.min(totalArchers / MARCH_COUNT, JOINER_CAP * MAX_ARC_PCT),
  );
  const joinerInf = floor10(
    Math.max(
      MIN_INF_PCT * JOINER_CAP,
      Math.min(totalInfantry / MARCH_COUNT, JOINER_CAP * MIN_INF_PCT),
    ),
  );
  const joinerCav = floor10(
    Math.min(totalCavalry / MARCH_COUNT, JOINER_CAP - joinerArc - joinerInf),
  );
  const joiner = { archer: joinerArc, cavalry: joinerCav, infantry: joinerInf };

  // ── Own rally: uses remaining troops after all 5 joiner marches take their share ─
  const remArc = totalArchers - joinerArc * JOINER_COUNT;
  const remCav = totalCavalry - joinerCav * JOINER_COUNT;
  const remInf = totalInfantry - joinerInf * JOINER_COUNT;

  // Own rally gets k²-optimal allocation from whatever's left, capped to OWN_RALLY_CAP
  let ownArc = floor10(Math.min(OWN_RALLY_CAP * (kArc ** 2 / kTotal2), remArc));
  let ownCav = floor10(Math.min(OWN_RALLY_CAP * (kCav ** 2 / kTotal2), remCav));
  let ownInf = floor10(Math.min(OWN_RALLY_CAP * (kInf ** 2 / kTotal2), remInf));
  let ownSpare = OWN_RALLY_CAP - ownArc - ownCav - ownInf;
  if (ownSpare > 0) {
    const e = floor10(Math.min(ownSpare, remArc - ownArc));
    ownArc += e;
    ownSpare -= e;
  }
  if (ownSpare > 0) {
    const e = floor10(Math.min(ownSpare, remCav - ownCav));
    ownCav += e;
    ownSpare -= e;
  }
  if (ownSpare > 0) {
    const e = floor10(Math.min(ownSpare, remInf - ownInf));
    ownInf += e;
  }

  const ownRally = { archer: ownArc, cavalry: ownCav, infantry: ownInf };

  const ownRallyDmg = singleMarchDamage(ownRally, A_player);
  const joinerDmg = singleMarchDamage(joiner, A_joiner);
  const eventScore =
    ownRallyDmg * OWN_RALLY_FIRES + joinerDmg * (2 / 3) * EFF_JOINED;

  return { ownRally, joiner, ownRallyDmg, joinerDmg, eventScore };
}

// ── Output ────────────────────────────────────────────────────────────────────
function pct(n, cap) {
  return ((n / cap) * 100).toFixed(1) + "%";
}
function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}
function fmtM(n) {
  return (n / 1_000_000).toFixed(3) + "M";
}
function marchLine(label, m, cap) {
  const total = m.archer + m.cavalry + m.infantry;
  return (
    `  ${label}  ${fmt(m.archer)} arc (${pct(m.archer, cap)})` +
    ` | ${fmt(m.cavalry)} cav (${pct(m.cavalry, cap)})` +
    ` | ${fmt(m.infantry)} inf (${pct(m.infantry, cap)})` +
    `  →  ${fmt(total)}/${fmt(cap)}`
  );
}

function totalUsed(ownRally, joiner) {
  return {
    archer: ownRally.archer + joiner.archer * JOINER_COUNT,
    cavalry: ownRally.cavalry + joiner.cavalry * JOINER_COUNT,
    infantry: ownRally.infantry + joiner.infantry * JOINER_COUNT,
  };
}

const rA = conceptA();
const rB = conceptB();

const uA = totalUsed(rA.ownRally, rA.joiner);
const uB = totalUsed(rB.ownRally, rB.joiner);

console.log("── Concept A — k²-global, proportional by cap ───────────");
console.log(marchLine("Own rally (125k):", rA.ownRally, OWN_RALLY_CAP));
console.log(marchLine("Joiner    ( 65k):", rA.joiner, JOINER_CAP));
console.log(
  `  Troops used:  arc ${fmt(uA.archer)}/${fmt(totalArchers)}` +
    `  cav ${fmt(uA.cavalry)}/${fmt(totalCavalry)}` +
    `  inf ${fmt(uA.infantry)}/${fmt(totalInfantry)}`,
);
console.log(
  `  Own rally dmg:   ${fmtM(rA.ownRallyDmg)} × ${OWN_RALLY_FIRES} = ${fmtM(rA.ownRallyDmg * OWN_RALLY_FIRES)}`,
);
console.log(
  `  Joiner dmg:      ${fmtM(rA.joinerDmg)} × 2/3 × ${EFF_JOINED} = ${fmtM(rA.joinerDmg * (2 / 3) * EFF_JOINED)}`,
);
console.log(`  EVENT SCORE:     ${fmtM(rA.eventScore)}`);
console.log();

console.log("── Concept B — archers-first (61%/4% rule per march) ────");
console.log(marchLine("Own rally (125k):", rB.ownRally, OWN_RALLY_CAP));
console.log(marchLine("Joiner    ( 65k):", rB.joiner, JOINER_CAP));
console.log(
  `  Troops used:  arc ${fmt(uB.archer)}/${fmt(totalArchers)}` +
    `  cav ${fmt(uB.cavalry)}/${fmt(totalCavalry)}` +
    `  inf ${fmt(uB.infantry)}/${fmt(totalInfantry)}`,
);
console.log(
  `  Own rally dmg:   ${fmtM(rB.ownRallyDmg)} × ${OWN_RALLY_FIRES} = ${fmtM(rB.ownRallyDmg * OWN_RALLY_FIRES)}`,
);
console.log(
  `  Joiner dmg:      ${fmtM(rB.joinerDmg)} × 2/3 × ${EFF_JOINED} = ${fmtM(rB.joinerDmg * (2 / 3) * EFF_JOINED)}`,
);
console.log(`  EVENT SCORE:     ${fmtM(rB.eventScore)}`);
console.log();

const diff = rB.eventScore - rA.eventScore;
const diffPct = ((diff / rA.eventScore) * 100).toFixed(3);
console.log("── Result (B − A) ───────────────────────────────────────");
console.log(
  `  ${diff >= 0 ? "+" : ""}${fmtM(diff)} (${diff >= 0 ? "+" : ""}${diffPct}%)`,
);
console.log(
  `  Winner: ${Math.abs(diff) < 1000 ? "tie" : diff > 0 ? "Concept B" : "Concept A"}`,
);
