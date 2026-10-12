# Rebalancing the campaign: a plan

What the campaign's balance is now, what is wrong with it, and what to change,
in order. `docs/meta.md` has the rules; this is the work to do on them.

## How it was measured

`tools/campaign.js` as a bot, outcomes rolled from its per-kind tables
(`ROLL_KIND`), 8 to 12 seeds of 200 missions, with probes that sample the board
every time the bot picks a mission (scripts kept out of the repo; step 1 folds
them into the tool). "Careful" is the bot's default (half the engine bot's
deaths); "raw" is `--harsh`.

**Caveat (since resolved, see The campaign below):** `ROLL_KIND` was measured before the missions got longer (far drop,
getaway car, encounters along the way, local alarms). Every number below uses
those old fight rates. The few real fights since (`campaign.js --fight`, 3
seeds of 14) won 33 of 34 at threat 1 and 2, so the bottom of the curve still
holds; the middle and top are unmeasured.

## Where it stands

### 1. The board is long and repetitive

| | Careful | Mind control |
|---|---|---|
| Offers on the board, average (most) | 13.1 (24) | 11.5 (26) |
| Boards with 12 or more | 61% | 56% |
| Boards with 5 or fewer | 4% | 12% |
| Most offers in one zone, average | 3.4 | 3.3 |

Day 1 of a fresh campaign has 16 offers: three identical crackdowns in the
Starport, two persuades in Maple Heights, assassinations two threat steps over
the starting squad, and a siege. At war it is 15 on average, with a story step
in every zone listed under *Can't wait*, most of which can't be run yet.

The cause: every day each zone is refilled to a quota by its level (3 at level
0, 2 at levels 1 and 2, 1 at level 3), and Cal's crew, a siege per lost zone
and a story step per zone at war come on top. Nothing limits the board as a
whole, and nothing stops the same kind turning up three times.

### 2. Difficulty follows the deployed squad, not the mission

Threat is the kind's base, plus the zone (+1 at level 0 or lost, -1 at level
3), plus 1 at war, plus Cal's step, which comes from the **power of the four
deployed** (+1 at 18, +2 at 27). The gap between threat and the squad's tier
is what kills Watchers:

| Gap (threat minus tier) | -2 | -1 | 0 | +1 | +2 |
|---|---|---|---|---|---|
| Watchers lost per mission, careful | 0 | 0.01 | 0.18 | 1.06 | |
| Watchers lost per mission, raw | 0 | 0.08 | 0.29 | 1.78 | 3.67 |

Because the step tracks whoever is deployed:

- **No mission is easy or hard in itself.** The same intel is threat 1 for
  recruits and threat 2 for veterans, so upgrades barely make anything feel
  easier, and choosing a mission isn't choosing a difficulty.
- **The curve has a trough.** At power 18 the step rises before the tier does
  (tier 4 at 19), so for that one point of power everything is a step harder.
- **Recruits sent with veterans** face the veterans' threat.
- **At war there's often nothing to rebuild on.** War adds +1 to everything,
  quiet jobs included. Four fresh recruits find no threat-1 job on 21% of
  boards (careful) and 51% (raw). The fallback fires only when nothing at all
  is within the deployed squad's tier, and adds one offer.

### 3. Rewards don't rise with risk

| Kind | Taken (of 763) | Threat, average | Pays |
|---|---|---|---|
| Intel | 127 | 1.3 | 37 RP, and Cal's next move |
| Persuade | 77 | 1.3 | +0.46 control, and Cal's next move |
| Job | 43 | 1.9 | $32,000 |
| Crackdown | 35 | 2.1 | +0.66 control, $6,700 |
| Assassination | 18 | 3.0 | $25,500, +0.35 control |
| Cal's crew | 172 | 3.5 | ends the push, +0.4 control |
| Siege | 95 | 4.1 | the zone back |
| Story | 196 | 3.4 | the next step, +0.3 control |

An assassination is a step harder than a job and pays less money, and less
control than a crackdown: nothing recommends it. A persuade in a level-3 zone
pays control into a plateau that holds itself.

### 4. Money: a glut for the careful, a drain for the rest

| Missions | 0-9 | 20-29 | 40-49 | 60-69 | 80-89 | 100-109 |
|---|---|---|---|---|---|---|
| Income a day, careful | $7,100 | $14,400 | $17,500 | $22,200 | $36,100 | $52,800 |
| Cash, careful | $103k | $200k | $653k | $1.27M | $2.02M | $2.48M |
| Cash, raw | | | $249k | $395k | $280k | $301k |
| Squad power, careful / raw | 8.1 | 12.3 | 14.1 / 10.5 | 16.4 / 12.8 | 17.0 / 11.9 | 19.1 / 12.6 |

The average Watcher lost was worth $150,000; a recruit is $45,000. Early, a
death is three weeks of income; by the end of the war, about three days. So:

- **Careful play:** losses stop mattering halfway through, and cash ends at
  $2M to $4M with nothing to buy.
- **Raw play:** replacements eat everything. Cash stays flat around $300k,
  the squad never gets past tier 2, and the war takes 60 or more missions.

Part of the glut is the bot. It never researches or buys MK2 and MK3 mods,
which come to about $690,000 a Watcher, or $2.8M for a full squad of four.

### 5. Time is cheap

The city produces while the squad is away, and *Wait a day* is free, so a
mission's days are not a cost. Their only costs are the policies frozen while
the squad is out, offers expiring, and Cal moving unanswered. Research per
mission is RP a day times days. At 8 to 17 RP a day and about 5 days a
mission, an MK1 takes under a mission, an MK2 one or two, and an MK3 two or
three; war comes around mission 60, day 300.

| Idle days after every mission | 0 | 5 | 15 |
|---|---|---|---|
| Wins, of 10 | 10 | 10 | 8 |
| War at mission | 62 | 51 | 72 |
| Won at mission | 96 | 123 | 195 |
| Cash at the end | $2.3M | $19M | $62M |

Waiting doesn't win faster, because Cal erodes the city in the meantime, but
a few idle days bring the war forward, and money stops meaning anything.

## Goals

- **A board of 4 to 7 missions**, up to about 9 with the urgent ones at war.
  Varied, each one fitting its zone, none of them twice.
- **Always a training job.** On every board, at peace and at war, a quiet job
  that four recruits with pistols can win (threat 1, or 2 at the most).
- **Difficulty belongs to the mission.** Calm zones are easy, rough zones
  hard, Cal's crew and sieges hardest. Upgrades make the squad feel stronger;
  Cal catches up over the campaign, not every time the squad changes.
- **Every kind is worth taking somewhere**, and pay rises with risk.
- **Losing a Watcher hurts all campaign long**, and money keeps a use.
- **Keep:** about 100 missions a campaign, war around mission 55 to 65, no
  clock.

## The mission game (done first)

Before the campaign's numbers, the missions themselves: a mission at a
squad's own level should be winnable whichever way it's played, harder ones
should need the right way, and there should be reasons to stay out longer.

**What changed**

- **Enemy levels 0 to 4**, the threat less one, matched to the Watchers' own
  (`W.FOE`): what they carry and drop (MK1 pistols at threat 1, MK3 rifles,
  miniguns and lasers at 5), how tough, how quick. Bodyguards a level up.
  One for one the Watchers are better; the enemy has the numbers.
- **Side jobs** on every mission, and **the sweep**, a job made of them (see
  `docs/missions.md`); **the mob**, a crowd of the gang's lowest.
- **Alt-click, the quiet way**: round the armed crew the scanner shows.
- **Persuasion holds the streets**, up to 0.4 control a mission.
- **Light veterancy**: Regular, Veteran, Elite at 3, 8, 15 missions.
- **Fixes the bench found:** a speeding car knocks a Watcher (or a persuade
  job's subject) flat instead of killing them; the police don't shoot the
  subject; quiet jobs (persuade, intel, the safe) have 60% of the
  operation's crew and half its guards round the mark, the minders further
  out; threats 4 and 5 trimmed (1.25 and 1.3 crew; level 4 at +50% hit
  points, gauss guns rare).

**The tactics bench** (`tools/bench.js`): kits for Watcher levels 0 to 4 and
a bot for each way in: assault, stealth (the quiet way), snipe, mob (talk a
following round, raid small trouble so it can pick up guns, then storm) and
the BanHammer. At the squad's own level (threat = level + 1), 4 to 6 fights
a cell over the five districts:

| Job | L0 | L1 | L2 | L3 | L4 | Best way at the top |
|---|---|---|---|---|---|---|
| Assassination | 92% / 0.17 | 88% / 0 | 95% / 0.15 | 89% / 0.58 | 90% / 0.80 | the BanHammer |
| Crackdown | 100% / 0.25 | 100% / 0.06 | 100% / 0.30 | 95% / 0.50 | 90% / 1.30 | assault, the BanHammer |
| Sweep | (not offered) | 100% / 0.06 | 100% / 0.30 | 100% / 0.60 | 100% / 0.95 | the mob, the BanHammer |
| Intel | 100% / 0.17 | 100% / 0.08 | 100% / 0.11 | 94% / 0.28 | 100% / 0.44 | stealth |
| Persuade | 100% / 0.50 | 92% / 0.08 | 100% / 0.11 | 100% / 0 | 78% / 0.28 | talking, then shooting |
| Siege | 100% / 0.25 | 100% / 0.06 | 89% / 0.63 | 100% / 0.55 | 78% / 1.39 | the BanHammer (100%, none lost) |

(won / Watchers lost a mission, over every tactic.) A step over the squad's
level costs one to two Watchers a mission unless the way in suits the job:
at level 3 against threat 5, assault won 1 in 4 where stealth, the rifles
and the BanHammer won every time. Going after the side jobs as well (3
assassination and crackdown cells a level, 6 fights each) did 2.5 of 3
instead of 0.5, for 0.27 Watchers lost a mission instead of 0.15: about
$33,000 and a little control more, against about $18,000 of Watcher lost on
average. Worth it, at a risk.

Loot rises with the level: nothing at threat 1, $2,000 to $10,000 at 2,
$20,000 to $40,000 at 3, $25,000 to $100,000 at 4 and 5 (a sweep most).
That's a lot of money late, and it goes into the campaign's numbers below.

Still open: the top threat costs about one Watcher a mission whichever way
it's played, which may be right for the hardest jobs in the game; the
bench's BanHammer bot now and then stalls (2% of fights), which the summary
counts apart.

## The campaign (done second)

Steps 1 to 5 and the money half of step 6 are in; `docs/meta.md` has the
rules as they now stand. Measured with `campaign.js --report` (12 seeds):

| Target | Result, careful | Result, raw |
|---|---|---|
| Offers on the board before Take Control: 5 to 7, at most 9 | 5.1, at most 8 | the same |
| Offers taking control: 9 or fewer | 6.6, at most 10 | the same |
| Boards with a quiet job at threat 2 or less: 100% | 100% | 100% |
| Boards a fresh squad can win something on: 100% | 100% | 100% |
| Same kind twice among the ordinary offers: under 10% | 1% | 1% |
| No kind under 5% of missions | assassination 7%, sweep 6%, job 5%, crackdown 7% | crackdown 2%, Cal's crew 3% |
| Watchers lost a mission at the squad's tier: 0.15 to 0.3 | 0.08 (0.25 overall) | 0.10 (0.26 overall) |
| Cash at the end, careful: under $1M | $678,000 | $681,000 |
| Take Control / won at mission: 55 to 65 / 90 to 110 | 57 / 90 | 57 / 110 |
| Won, raw: 8 of 12 by about mission 140 | 12 of 12 | 12 of 12 |

Where it departs from the steps below, and why:

- **Tiers** are now the Watchers' levels plus one, matched to the bench's
  kits (11.5, 18, 25 and 29 power), so a gap in the campaign is a gap on the
  bench.
- **Cal's escalation is one step** (18 upgrade points) plus the Take Control
  step, not two: with both, every fighting job and story step at the end was
  threat 5, which costs a fully kitted squad about a Watcher a mission, and
  the bot (rightly) stopped advancing the story.
- **Assassination's base threat is 2**, not 3: the bench wins it at the
  squad's level as often as a crackdown, and at 3 it sat one or two steps
  over every squad that saw it.
- **Danger money**: fighting pay ×0.6 to ×3 by threat. A Watcher in MK3 mods
  is $690,000; with a job's flat $90,000, only the risk-free jobs paid for
  the Watchers a fight costs, and the bot took intel two times in three.
- **The money glut was the bot's**, mostly: the city made six times what the
  missions did, and the bot kept half its pips on money with nothing to buy
  while research gated the purchases. A player turns the split to research;
  the bot now does, and careful cash stays at $300,000 to $450,000 until the
  end.

Decided after measuring: **waiting pays** (five idle days a mission end
with $3M, and win in as many missions), and that's fine; **deaths at the
squad's own tier under target** are the careful bot picking its fights,
which is good play, not a miss. Still open: nothing played by hand yet.

## The plan, in order

### Step 1: measure again, with a bot that plays like a player

1. **Re-measure `ROLL_KIND`** against the current engine. Grid: six fighting
   kinds × gaps -1 to +2 × 3 kits × 4 fights, about 290 fights and 4 CPU-hours
   in parallel. Store it with a date, as now.
2. **Make the bot spend like a player.** Research and fit MK2 and MK3 mods;
   choose missions by reward per risk instead of a fixed order of kinds, so
   reward balance shows up in what it takes; optional idle days.
3. **`campaign.js --report`:** board size, training-job availability (a fresh
   squad's view), threat gaps, deaths, the cash and income curve, and research
   timing (the probes behind this plan), with the targets below as pass or
   fail.

Nothing else changes until this runs: steps 2 to 6 are tuned against it.

### Step 2: difficulty belongs to the mission

`threat = kind base + zone + Take Control + Cal's escalation`, worked out when
the offer appears and fixed while it's up.

**What Cal is (decided).** Cal is not an opponent to be beaten, he is the
chaos in the system: a persistent agent who keeps the city from settling, so
the player can't pacify everything and watch the days go by. There is no real
answer to him until the endgame, when the player starts locking the city down.
What "declaring war" is today becomes **Take Control**: Casey Benton's order to
lock the city down, zone by zone, and corner Cal for good.

So his escalation follows the city, not the deployed squad:

- **Cal's escalation rises with how settled the city is and how far the
  campaign has come:** +1 at 12 upgrade points, +1 more at 24 (about missions
  25 and 47 now). It applies to the fighting kinds only: assassination,
  crackdown, Cal's crew, siege, story.
- **His pressure grows the quieter the city gets.** His push already scales
  with the zones held at level 2 or better; step 1 checks that a pacified,
  idle city still slips (the probe with idle days says it does, slowly), and
  makes it sharper if not. Idle time should never be free money.
- **Quiet jobs** (persuade, intel) in zones at level 2 or 3 take neither
  escalation nor the Take Control step. That is the training ground, and it
  stays threat 1 or 2 all campaign.
- **The zone term and the kind bases stay as they are.**

What it fixes: no trough, no rubber band, and recruits can be sent on easy
work without the veterans' threat. The risk is that a well-kitted squad finds
everything easy late on. Escalation plus the Take Control step puts Cal's crew
and assassinations at threat 5 in the endgame, and step 1's numbers check it.

### Step 3: a shorter board, with a shape

Replace refill-to-quota with offers that arrive over time:

- **One ordinary offer per zone** (two at level 0). A zone without one gets
  one on a daily roll by level: 50% at level 0, 35% at 1, 25% at 2, 15% at 3.
  Offers last 6 to 12 days.
- **A city-wide cap:** at most 5 ordinary offers before the war, 4 at war
  (story steps take the room).
- **No kind twice** among the ordinary offers, unless the board is short.
- **The urgent ones on top:**
  - Cal's crew while he pushes;
  - a siege per lost zone;
  - story steps only where the zone already meets the step's level, at most
    3 at once, the closest to done first. The rest show in the zone's dossier
    ("Turn the network: needs level 2"), not on the board.
- **Guarantees:**
  - A training job: if no quiet job at threat 2 or less is up, one appears in
    the calmest zone (the Towers while it's held).
  - A money job when cash is below a recruit plus a basic kit.

Expected: 5 to 7 offers before the war, 8 or 9 at war.

### Step 4: kinds that fit their zone

| Zone | Leans toward | Never |
|---|---|---|
| Level 3 | persuade, intel; now and then a job | crackdown, assassination |
| Level 2 | intel, persuade, job, crackdown | |
| Level 1 | job, crackdown, assassination, intel | |
| Level 0 | crackdown, assassination, job | persuade |
| Lost | siege (a fallback intel or job only when nothing else is in reach) | |
| The Towers | quiet jobs only: Benton's seat, the training ground | anything loud |

District flavour, as a nudge: the Starport and the Ranch lean to jobs
(smuggling, the grow fields) and crackdowns.

### Step 5: pay that rises with risk

- **Assassination:** a job's full money and +0.5 to 0.7 control, and it
  removes Cal's tactic in the zone if there is one (a research shortcut: the
  name on the list was running it).
- **Persuade and intel in calm zones:** add a small fee ($5,000 to $10,000),
  so training pays for itself; persuade's control only where the zone is
  below its plateau.
- **Job, crackdown, intel's research, Cal's crew, siege:** as they are,
  pending step 1.

### Step 6: Watchers stay expensive, money keeps a use

Decided: light veterancy, and no upkeep on Watchers.

- **Veterancy:** Watchers improve a little with missions survived: three
  ranks (for example at 3, 8 and 15 missions), each a few points of accuracy
  and reaction, shown on the Watcher's card. A dead veteran costs more than
  money, and training a recruit on quiet jobs means something. Ranks add to
  squad power a little, so tiers stay honest.
- **The money glut, without upkeep:** first fix the bot's spending (MK2 and
  MK3 mods are about $2.8M for a squad of four) and re-measure. If careful
  play still ends with more than $1M, Cal's chaos is the next lever: his
  tactics cost a zone money as well as control, and his pushes on a pacified
  city bite harder. Dearer late purchases come last.

### Step 7: mission length and research

Leave the days per kind and the research costs alone until step 1 reports.
Days set research per mission, so the lever is: war at mission 55 to 65 with
the new board, and the bot taking a wider mix of kinds (jobs and
assassinations run longer than intel). If the war comes too early or late,
move MK2 and MK3 research points, not mission days.

## Targets

Checked by `campaign.js --report`, 12 seeds each:

| | Target |
|---|---|
| Offers on the board, average / most, before the war | 5 to 7 / 9 |
| Offers at war, average | 9 or fewer |
| Boards with a quiet job at threat 2 or less | 100% |
| Boards a fresh squad can win something on, at war too | 100% |
| Same kind twice among the ordinary offers | under 10% of boards |
| Kinds taken by a reward-picking bot | none under 5% of missions |
| Watchers lost per mission at the squad's tier, careful | 0.15 to 0.3 |
| Cash at the end, careful | under $1M |
| War at mission / won at mission, careful | 55 to 65 / 90 to 110 |
| Campaigns won, raw | 8 of 12 or more, by about mission 140 |

## Decisions

1. **Cal** is a persistent source of chaos, not an opponent: no real answer
   to him until the endgame. His escalation follows the city and the
   campaign, not the deployed squad. "Declaring war" becomes **Take Control**.
2. **Veterancy:** yes, light.
3. **Upkeep on Watchers:** no.
4. **Board size:** 4 to 7 before Take Control.
5. **Waiting pays**, and that's valid: no idle penalty.
6. **Picking winnable fights** is valid: the at-tier death target is a
   guide, not a goal.
