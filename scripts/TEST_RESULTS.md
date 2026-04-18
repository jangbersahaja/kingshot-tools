# Beartrap Formation Optimizer — Test Results

> Generated: 7 April 2026  
> Scripts: `test-avg-ratio.mjs` · `test-march-count.mjs` · `test-joiner-cap.mjs`

---

## Common Parameters

| Parameter                    | Value                       |
| ---------------------------- | --------------------------- |
| Own rally deploy capacity    | 125,000                     |
| Joiner march capacity        | 65,000                      |
| March slots                  | 6 (1 own rally + 5 joiners) |
| Own rally fires              | 5                           |
| Rallies per joiner (default) | 8                           |
| Troop tier                   | T10 only                    |

### Troop Stats (T10, DEFAULT_JOINER_STATS)

| Type     | True Attack | Attack% | Lethality% | Combined Factor |
| -------- | ----------- | ------- | ---------- | --------------- |
| Archer   | 1,888       | 376.5%  | 303.5%     | ~21.68          |
| Cavalry  | 1,416       | 374.4%  | 276.9%     | ~17.27          |
| Infantry | 472         | 438.7%  | 287.3%     | ~14.53          |

### Damage Formula

$$D = \frac{t_a \times mult \times 1.2}{1000} \times \sqrt{5000 \times N} \times A_{factor} \times 10$$

- **Archer mult**: $1.1 \times 1.1 = 1.21$ (ranged bonus + T7+ bonus)
- **Event score**: $D_{own} \times fires_{own} + D_{joiner} \times \frac{2}{3} \times joinerHits$

### k²-Ideal Troop Ratio

| Archer    | Cavalry   | Infantry |
| --------- | --------- | -------- |
| **72.3%** | **24.0%** | **3.6%** |

---

## Test 1 — Concept A vs Concept B (`test-avg-ratio.mjs`)

**Question:** Which distribution algorithm produces better event score?

- **Concept A** — k²-global proportional: solve globally, own rally gets proportional share by capacity, joiners split the remainder equally
- **Concept B** — Archers-first 61%/4% rule: each joiner march gets ≤61% archers, ≥4% infantry; own rally gets k²-optimal share of leftover troops

### Scenario

```
Inventory: 300k arc | 300k cav | 300k inf
March slots: 6 (1 own + 5 joiners)
Own rally fires: 5  |  Joiner hits (eff): 50
joinedRallyCount = 60  →  effJoined = round(60 × 5/6) = 50
Total capacity: 125k + 5×65k = 450k  |  Available: 900k
```

### Output

```
── Concept A — k²-global, proportional by cap ───────────
  Own rally (125k):  83,330 arc (66.7%) | 37,120 cav (29.7%) | 4,540 inf (3.6%)  →  124,990/125,000
  Joiner    ( 65k):  43,330 arc (66.7%) | 19,300 cav (29.7%) | 2,360 inf (3.6%)  →  64,990/65,000
  Troops used:  arc 299,980/300,000  cav 133,620/300,000  inf 16,340/300,000
  Own rally dmg:   15.461M × 5 = 77.304M
  Joiner dmg:      11.149M × 2/3 × 50 = 371.619M
  EVENT SCORE:     448.923M

── Concept B — archers-first (61%/4% rule per march) ────
  Own rally (125k):  90,420 arc (72.3%) | 30,040 cav (24.0%) | 4,540 inf (3.6%)  →  125,000/125,000
  Joiner    ( 65k):  39,650 arc (61.0%) | 22,750 cav (35.0%) | 2,600 inf (4.0%)  →  65,000/65,000
  Troops used:  arc 288,670/300,000  cav 143,790/300,000  inf 17,540/300,000
  Own rally dmg:   15.494M × 5 = 77.468M
  Joiner dmg:      11.088M × 2/3 × 50 = 369.592M
  EVENT SCORE:     447.060M

── Result (B − A) ───────────────────────────────────────
  -1.864M (-0.415%)
  Winner: Concept A
```

### Multi-Inventory Comparison (from prior session)

| Inventory         | Concept A | Concept B | Δ            | Winner   |
| ----------------- | --------- | --------- | ------------ | -------- |
| 150k each (tight) | —         | —         | A +4.0%      | **A**    |
| 200k each         | —         | —         | ~tie (+0.1%) | A        |
| 250k each         | —         | —         | ~tie (−0.1%) | B barely |
| 300k each         | 448.9M    | 447.1M    | A +0.4%      | **A**    |

### Conclusion

> **Concept A (k²-global) is more robust.** It never breaks at tight supply, wins or ties in all scenarios. The tool currently uses Concept A — no change needed.

---

## Test 2 — March Count Sweep (`test-march-count.mjs`)

**Question:** Is it better to run fewer, stronger marches or more, diluted marches?

### Part 1 — March Slots 1–6 at 8 Rallies/Joiner

#### 150k each (tight) — Total pool: 450,000

| Slots | Total Cap | Own Rally arc/cav/inf                       | Each Joiner arc/cav/inf                     | Hits   | Score         | vs prev     |
| ----- | --------- | ------------------------------------------- | ------------------------------------------- | ------ | ------------- | ----------- |
| 1     | 125k      | 90,420(72%) / 30,040(24%) / 4,540(4%)       | (no joiners)                                | 0      | 77.47M        | —           |
| 2     | 190k      | 90,420(72%) / 30,030(24%) / 4,530(4%)       | 47,020(72%) / 15,630(24%) / 2,370(4%)       | 8      | 137.06M       | +59.59M     |
| 3     | 255k      | 73,520(59%) / 46,920(38%) / 4,540(4%)       | 38,240(59%) / 24,400(38%) / 2,360(4%)       | 16     | 194.48M       | +57.42M     |
| 4     | 320k      | 58,590(47%) / 58,590(47%) / 7,810(6%)       | 30,470(47%) / 30,470(47%) / 4,060(6%)       | 24     | 247.41M       | +52.93M     |
| 5     | 385k      | 48,700(39%) / 48,700(39%) / 27,590(22%)     | 25,320(39%) / 25,320(39%) / 14,350(22%)     | 32     | 292.57M       | +45.16M     |
| **6** | **450k**  | **41,660(33%) / 41,660(33%) / 41,660(33%)** | **21,660(33%) / 21,660(33%) / 21,660(33%)** | **40** | **331.87M ★** | **+39.30M** |

> **Best: 6 slots** — all marginal gains are positive even at 33%/33%/33% (far from ideal ratio)

#### 200k each — Total pool: 600,000

| Slots | Score         | vs prev     |
| ----- | ------------- | ----------- |
| 1     | 77.47M        | —           |
| 2     | 137.06M       | +59.59M     |
| 3     | 196.64M       | +59.58M     |
| 4     | 254.68M       | +58.04M     |
| 5     | 308.23M       | +53.56M     |
| **6** | **359.40M ★** | **+51.16M** |

#### 250k each — Total pool: 750,000

| Slots | Score         | vs prev     |
| ----- | ------------- | ----------- |
| 1     | 77.47M        | —           |
| 2     | 137.06M       | +59.59M     |
| 3     | 196.64M       | +59.58M     |
| 4     | 256.22M       | +59.59M     |
| 5     | 314.71M       | +58.49M     |
| **6** | **369.16M ★** | **+54.45M** |

#### 300k each (abundant) — Total pool: 900,000

| Slots | Score         | vs prev     |
| ----- | ------------- | ----------- |
| 1     | 77.47M        | —           |
| 2     | 137.06M       | +59.59M     |
| 3     | 196.64M       | +59.58M     |
| 4     | 256.22M       | +59.59M     |
| 5     | 315.81M       | +59.59M     |
| **6** | **374.60M ★** | **+58.79M** |

---

### Part 2 — Rally Rate Sweep (find break-even)

**Question:** Does a low-activity alliance (few rallies/joiner) ever favour fewer marches?

#### 150k each (tight)

| Rallies/joiner | 1-slot | 2-slot  | 3-slot  | 4-slot  | 5-slot  | 6-slot        | Winner |
| -------------- | ------ | ------- | ------- | ------- | ------- | ------------- | ------ |
| 1              | 77.47M | 84.91M  | 91.34M  | 96.38M  | 99.37M  | **101.41M ★** | 6slot  |
| 2              | 77.47M | 92.36M  | 106.08M | 117.95M | 126.97M | **134.33M ★** | 6slot  |
| 3              | 77.47M | 99.81M  | 120.81M | 139.53M | 154.57M | **167.25M ★** | 6slot  |
| 4              | 77.47M | 107.26M | 135.54M | 161.11M | 182.17M | **200.18M ★** | 6slot  |
| 5              | 77.47M | 114.71M | 150.28M | 182.68M | 209.77M | **233.10M ★** | 6slot  |
| 6              | 77.47M | 122.16M | 165.01M | 204.26M | 237.37M | **266.02M ★** | 6slot  |
| 7              | 77.47M | 129.61M | 179.74M | 225.83M | 264.97M | **298.94M ★** | 6slot  |
| 8              | 77.47M | 137.06M | 194.48M | 247.41M | 292.57M | **331.87M ★** | 6slot  |
| 9              | 77.47M | 144.51M | 209.21M | 268.99M | 320.17M | **364.79M ★** | 6slot  |
| 10             | 77.47M | 151.96M | 223.94M | 290.56M | 347.77M | **397.71M ★** | 6slot  |

#### 200k each

| Rallies/joiner | 1-slot | 6-slot        | Winner | Marginal gains slot 2→6                     |
| -------------- | ------ | ------------- | ------ | ------------------------------------------- |
| 1              | 77.47M | **109.81M ★** | 6slot  | +7.44M, +7.45M, +6.85M, +5.48M, +5.13M      |
| 4              | 77.47M | **216.78M ★** | 6slot  | +29.79M, +29.79M, +28.79M, +26.08M, +24.86M |
| 8              | 77.47M | **359.40M ★** | 6slot  | +59.59M, +59.58M, +58.04M, +53.56M, +51.16M |
| 10             | 77.47M | **430.71M ★** | 6slot  | +74.49M, +74.47M, +72.66M, +67.29M, +64.32M |

#### 300k each (abundant)

| Rallies/joiner | 1-slot | 6-slot        | Winner | Marginal gains (near-flat)                  |
| -------------- | ------ | ------------- | ------ | ------------------------------------------- |
| 1              | 77.47M | **114.47M ★** | 6slot  | +7.44M, +7.45M, +7.45M, +7.45M, +7.21M      |
| 8              | 77.47M | **374.60M ★** | 6slot  | +59.59M, +59.58M, +59.59M, +59.59M, +58.79M |
| 10             | 77.47M | **448.92M ★** | 6slot  | +74.49M, +74.47M, +74.48M, +74.48M, +73.53M |

### Distribution Shift as March Count Increases (150k tight)

> Archer% drops from 72% to 33% as supply gets spread across more marches — but total score keeps rising because volume overwhelms ratio loss.

| Slots | Own Rally Arc% | Own Rally Cav% | Own Rally Inf% |
| ----- | -------------- | -------------- | -------------- |
| 1     | 72%            | 24%            | 4%             |
| 2     | 72%            | 24%            | 4%             |
| 3     | 59%            | 38%            | 4%             |
| 4     | 47%            | 47%            | 6%             |
| 5     | 39%            | 39%            | 22%            |
| 6     | 33%            | 33%            | 33%            |

### Conclusion

> **6 slots wins at every rally rate — including 1 rally/joiner.**  
> The ONLY break-even is 0 rallies (a march joins nothing). In practice: always use maximum march slots.

---

## Test 3 — Joiner Cap Sweep (`test-joiner-cap.mjs`)

**Question:** Does reducing the joiner march cap (e.g. 20k instead of 65k) improve event score by pushing troop ratio closer to the k²-ideal 72% archers?

### Setup

- Joiner caps tested: 20k, 30k, 40k, 50k, 65k
- March slots: 1–6
- Rallies/joiner: 8 (fixed)

---

### 150k each (tight)

| Joiner Cap | slot1       | slot2        | slot3        | slot4        | slot5        | slot6          | Best      |
| ---------- | ----------- | ------------ | ------------ | ------------ | ------------ | -------------- | --------- |
| 20k        | 77.468M     | 110.526M     | 143.584M     | 176.599M     | 209.611M     | 242.184M ★     | slot6     |
| 30k        | 77.468M     | 117.953M     | 158.428M     | 198.822M     | 237.551M     | 274.664M ★     | slot6     |
| 40k        | 77.468M     | 124.217M     | 170.941M     | 216.048M     | 258.480M     | 299.872M ★     | slot6     |
| 50k        | 77.468M     | 129.731M     | 181.610M     | 229.899M     | 276.079M     | 316.150M ★     | slot6     |
| **65k**    | **77.468M** | **137.058M** | **194.476M** | **247.411M** | **292.568M** | **331.867M ★** | **slot6** |

**★ GLOBAL BEST: joinerCap=65k, slots=6, score=331.867M**

Distribution detail (baseline = global best):

```
  Own rally (125k):  41,660(33%)  41,660(33%)  41,660(33%)  →  124,980
  Each joiner (65k): 21,660(33%)  21,660(33%)  21,660(33%)  →   64,980
  Score: ownDmg 13.698M×5=68.488M  joinerDmg 9.877M×2/3×40=263.379M  → 331.867M
```

---

### 200k each

| Joiner Cap | slot6          | Best      |
| ---------- | -------------- | --------- |
| 20k        | 242.644M ★     | slot6     |
| 30k        | 279.872M ★     | slot6     |
| 40k        | 308.924M ★     | slot6     |
| 50k        | 331.620M ★     | slot6     |
| **65k**    | **359.396M ★** | **slot6** |

**★ GLOBAL BEST: joinerCap=65k, slots=6, score=359.396M**

```
  Own rally (125k):  55,550(44%)  55,550(44%)  13,880(11%)  →  124,980
  Each joiner (65k): 28,890(44%)  28,890(44%)   7,220(11%)  →   65,000
  Score: ownDmg 14.832M×5=74.160M  joinerDmg 10.696M×2/3×40=285.236M  → 359.396M
```

---

### 300k each (abundant)

| Joiner Cap | slot6          | Best      |
| ---------- | -------------- | --------- |
| 20k        | 242.644M ★     | slot6     |
| 30k        | 279.872M ★     | slot6     |
| 40k        | 311.153M ★     | slot6     |
| 50k        | 338.720M ★     | slot6     |
| **65k**    | **374.599M ★** | **slot6** |

**★ GLOBAL BEST: joinerCap=65k, slots=6, score=374.599M**

```
  Own rally (125k):  83,330(67%)  37,120(30%)   4,540(4%)  →  124,990
  Each joiner (65k): 43,330(67%)  19,300(30%)   2,360(4%)  →   64,990
  Score: ownDmg 15.461M×5=77.304M  joinerDmg 11.149M×2/3×40=297.295M  → 374.599M
```

---

### Why 65k Always Wins — The √N Effect

Halving troops (65k → 20k) to achieve a better ratio is counterproductive:

$$\text{Damage} \propto \sqrt{N}$$

Cutting troops by 69% (65k → 20k) reduces damage by ~47%, while the best possible ratio improvement (from ~33% archers to 72% archers) only gains ~18% in the archer component. The net result is always negative.

| Joiner Cap | 150k score | vs 65k baseline |
| ---------- | ---------- | --------------- |
| 65k        | 331.867M   | baseline        |
| 50k        | 316.150M   | −4.7%           |
| 40k        | 299.872M   | −9.6%           |
| 30k        | 274.664M   | −17.2%          |
| 20k        | 242.184M   | **−27.0%**      |

### Conclusion

> **Always use the maximum joiner cap (65k).** Reducing march capacity in search of a better troop ratio is never beneficial — the √N troop count penalty always outweighs the ratio gain.

---

## Final Conclusions

| Question                               | Answer                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Concept A vs B?                        | **Concept A** is more robust — wins or ties all scenarios, never breaks at tight supply |
| More march slots always better?        | **YES** — 6 slots wins at every rally rate including 1 rally/joiner                     |
| Does smaller joiner cap improve score? | **NO** — 65k max always optimal; √N loss outweighs ratio gain                           |
| Optimal strategy?                      | **Max march slots + max joiner cap (65k) + fill until troops run out**                  |
| Break-even for extra march slot?       | Only when a slot joins **zero** rallies — never happens in practice                     |
| Alliance activity impact?              | 1 rally/joiner → 109M; 8 rallies/joiner → 359M (same 200k troops) — **3.3× difference** |

### Key Insight

Alliance rally activity has a **3.3× larger impact** on event score than troop count differences. Encouraging alliance participation matters more than optimizing march composition.

### Tool Implications

1. **No algorithm change needed** — the current k²-global (Concept A) is already optimal
2. **Always recommend max march slots** — the tool should not suggest fewer slots
3. **Warn on low rally activity** — if `joinedRallyCount` is very low (< 3 per joiner), surface a warning: alliance participation is the biggest lever
