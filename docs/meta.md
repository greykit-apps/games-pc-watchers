# The meta-game: holding PumaCity

A draft of the rules, to be argued with. The numbers in it come from
`tools/metasim.js`: `node tools/metasim.js` runs one zone through the control
model, `node tools/metasim.js --board` plays whole campaigns with a simple
policy. Change the numbers there and rerun it.

## The premise

**Casey Benton** rules PumaCity. She is something of a totalitarian, but a
practical one: she would rather her people were alive, working and spending
than dead. The **Watchers** are her enforcer squads, and the player runs one
of them, out of the clinic under PVN Tower, answering to Watch-Captain
Joyeuse.

**Cal** is the rival. He never shows himself if he can help it: he works
through the city's smaller gangs and crimelords (the Thornback gang at the
Ranch, the Bay 13 smugglers at the Starport, the Expo mob, the Cul-de-Sac
Kings), funding them, arming them and pointing them at whatever Benton has
let slip. He can't be beaten, only fought: however well the city is held,
there is always a zone he is working on.

## The board

Eight zones, each a part of one of the existing district maps. A mission in a
zone is played on that district's map, centred on that zone's part of it.

| Zone | Map | Base pips | Starts at | Held against |
|---|---|---|---|---|
| The Towers (PVN Tower, City Hall, the hospital) | Downtown | 3 | level 3 | (Benton's seat) |
| Old Town and the Market | Downtown | 3 | level 1 | street crews |
| Lantern Row, Pounce Park, Central Station | Downtown | 2 | level 1 | street crews |
| Maple Heights and the College | Suburbs | 2 | level 2 | the Cul-de-Sac Kings |
| Juniper Hills, Main Street, Whisker Hill | Suburbs | 2 | level 1 | the Cul-de-Sac Kings |
| The Expo, the Arena, Neon Street | Convention Center | 3 | level 0 | the Expo mob |
| The Starport | Starport | 3 | level 0 | the Bay 13 smugglers |
| The Ranch | Ranch | 2 | lost | the Thornback gang |

## A turn is a day

Each zone has a **policy**: how its pips are split, in whole pips, between
**research**, **money** and **control**. A **mission takes 3 to 8 days**,
depending on how complex it is (getting there, the operation, getting out);
the policies set before the squad goes out stand unchanged until it is back.
So every mission is several days of production, sometimes a lot of them, run
on whatever was set when the squad left.

Each day, in every zone that is not lost:

1. it makes its pips: base pips, plus its control level (0 to 3);
2. pips on money and research each yield more the calmer the zone: 1 at
   level 0 or 1, 1.25 at level 2, 1.5 at level 3. Money banks; research
   goes to the labs (see Research);
3. control gains the pips put into it, each worth less the higher the level,
   and loses its decay (more while Cal is pushing the zone).

## Control

Control is a number from 0 to 3.95. Its whole part is the zone's **level**,
and each level adds a pip. There is no level above 3; the space between 3 and
3.95 is a bank.

A pip on control buys 1, 0.6, 0.35 or 0.3 control by level, as people push
back against a tightening grip. Decay is shaped in three parts:

- **the wall**, just under 3: decay climbs to 1.55, so the last level takes
  everything a zone has, or a mission to push it over;
- **the cliff**, from 3 to 3.5: decay stays high (1.5 to 1.35), so a zone
  only just over 3 is fragile;
- **the plateau**, from 3.5 up: decay drops to 0.5 and 0.4. A contented zone
  holds itself, on very little.

For a base-3 zone (3 pips at level 0, 6 at level 3), from `tools/metasim.js`:

| | Climb | Hold | Made a day while holding |
|---|---|---|---|
| Level 0 | to 1: 9 days on 1 pip, 1 day on 2 | 1 of 3 pips | 2 |
| Level 1 | to 2: 4 days on 2 pips, 2 days on 3 | 2 of 4 | 2 |
| Level 2 | to 3: only on all 5 pips, 2 days; 4 stall | 4 of 5 near the top | 1.3 |
| Level 3, on the cliff | to the plateau: all 6 pips, 2 days | 5 of 6 | 1.5 |
| Level 3, on the plateau | | 2 of 6 | 6 |

So a pacified zone is three times as productive as a level 1 one, and the
climb is the price of it. Left alone, a full plateau **coasts**: with nothing
on control it makes 9 a day for 3 days, then goes off the cliff and lands at
level 1; with 1 pip on control, 7.5 a day for 5 days, landing at level 2.

**When control reaches 0 the zone is lost.** It makes nothing, and it is only
taken back with a **siege** mission against an entrenched enemy.

## Cal

Cal **rests between pushes**, 3 to 6 days, then works one zone for about 4
days, then rests again. He never pushes the same zone twice running, and he
favours zones with low control and zones worth a lot to you.

**His resources scale with yours.** His push adds 0.4 decay a day to the
zone, and 0.15 more for every zone you hold at level 2 or better. Early on a
push costs a zone a pip or two of production to hold. Once the city is
pacified a push is 1.6 a day, more than a plateau zone can hold on all its
pips: the only answer is to go there and fight him (a mission in the zone he
is pushing ends the push).

**His tactics stick.** When a push ends there is a chance (40%) that he leaves
something behind in the zone (a new drug on the streets, a corrupted
official, an informer network), and control pips there buy a quarter less
until it is countered by research (see Research).

**Intel tells you where he is going next.** Intel missions pay research
points, and they also reveal Cal's plans: which zone he will push next, and
when. The more intel you hold, the further ahead you can see. Forewarned, you
can bank control in that zone before he arrives, or go after his gang there
first.

Across eight simulated 240-day campaigns, with a simple policy: Cal pushed
about 31 times; about 4 zones were lost and retaken by siege; zones spent
about 80% of their days at level 3, the rest mostly at level 2.

## Money

**Money banks**, and it is spent hard. Casey Benton is the squad's employer,
not its landlord: she takes no cut. But the Watchers are state-of-the-art
cyborgs, and they cost like it. A pip of money is $1,000 at yield 1; a held
city makes something like $10,000 a day at its best, if half of it goes to
money.

| What | Price (a first guess) |
|---|---|
| A recruit: a new Watcher, a bare chassis | $60,000 |
| A weapon from the Armoury, per Watcher (once researched) | MK1 $5,000, MK2 $15,000, MK3 $40,000 |
| A scanner or a Purrsuader, per Watcher | MK1 $10,000, MK2 $25,000, MK3 $60,000 |
| A BanHammer strike (once researched): one shot | $250,000 |
| A mod, fitted at the clinic, per body part per Watcher | MK1 $10,000, MK2 $30,000, MK3 $75,000 |
| Stims, ammunition, the clinic's patching up | small change |

So a Watcher brought all the way to MK3 in everything has had about $850,000
spent on them: the chassis, six body parts through three marks each, a MK3
weapon and MK3 gear. Losing one is most of three months of the city's money.
That is the point: a squad of veterans is the most valuable thing on the
board, and it can die in an afternoon.

**The squad is up to 8 Watchers**: the reserve the player draws on, up to
four of them sent out on any one mission. Each is recruited, armed, equipped
and upgraded on their own, so the money goes into whoever needs it: the
veterans who carry the hard missions, or the new recruits who will replace
them.

**Special events** are bought with money, when the board needs a nudge that
production can't give:

| Event | Effect | Price (a first guess) |
|---|---|---|
| A festival | a zone gains 0.5 control over 3 days | $40,000 |
| Informants | shows Cal's next two pushes, where and when | $30,000 |
| Bribes at City Hall | halves Cal's next push | $60,000 |
| Martial law | a zone's control can't fall for 3 days, then decays at double for 3 | $80,000 |
| Hired guns | a mercenary crew fights beside the squad on one mission | $50,000 |
| An amnesty | a lost zone comes back at level 0 without a siege | $150,000 |

## Research

**Research costs money to start and research points to finish.** Research
points cannot be banked: each day's points go into the projects that are
running, and if none are running they are wasted. Several can run at once,
but the day's points are split evenly between them, so starting everything
you can afford means nothing finishes for a long time.

### What there is to research

Everything but production and countermeasures comes in three marks: MK1
unlocks a thing (or replaces what the squad starts with), MK2 and MK3
improve it, and each needs the one before.

| Line | What it covers |
|---|---|
| **Weapons** | each weapon: pistol, uzi, shotgun, Longwhisker rifle, minigun, laser, gauss gun. MK1 unlocks it for the Armoury; MK2 and MK3 add damage, range, magazine or rate |
| **Mods** | legs, arms, chest, heart, eyes, brain, as the v1, v2, v3 parts are now |
| **Scanner** | MK1 its range; MK2 shows armed people apart from unarmed; MK3 shows people through roofs and walls, and Cal's gang in red |
| **Purrsuader** | MK1 its range and power; MK2 persuades armed people; MK3 holds a bigger following, and they fight better |
| **BanHammer Orbital Platform** | late-game equipment, one item (needs the scanner at MK2). A Watcher carries the spotter: it fires like a long-range laser, marking a spot, and a few seconds later an orbital energy blast lands there and kills everything in a wide radius. One shot per strike bought, and very dear: a money sink and a siege breaker, made for cracking entrenched positions |
| **Overseers** | an overseer in every zone who, while the squad is away on a mission, moves pips onto control to stop the zone slipping below its level. They can't stop Cal: a push still takes a zone down |
| **Propaganda**, then **mind control** | rolled out zone by zone, bought as an event once researched. Under propaganda a zone's control decays to 1.0, not 0, and is drawn back up to it (a quarter a day) when it falls below; under mind control, to 2.0. Cal's pushes and failed missions still drag it down, as far as lost. Framed for what it is, a crime against the people of the city; and it works, which is the worst of it |
| **Production** | **zone works:** +1 base pip in a zone of your choice, for good. **Requisition:** a free pip each day, placed wherever control is weakest. Both can be researched again, each time 1.5 times dearer |
| **Countermeasures** | one for each of Cal's tactics as he uses them: the research sink. However well the city is held, he keeps leaving things that need answering |

### What it costs

Sized for a campaign of about **100 missions**: weapons, mods and gear cost
little enough in research points that the war (which comes after 30 upgrade
points; see The endgame) arrives around mission 60, leaving 30 to 40 missions
for the war and its lockdowns. Upgrades come about every 2 missions, intel
missions included. Production and the overseers stay dear: they are the long
game.

| | Money to start | Research points to finish |
|---|---|---|
| MK1 | $4,000 | 30 |
| MK2 | $12,000 | 72 |
| MK3 | $30,000 | 136 |
| The BanHammer | $60,000 | 160 |
| Overseers | $80,000 | 290 |
| Propaganda | $120,000, then $50,000 a zone | 400 |
| Mind control | $250,000, then $150,000 a zone | 700 |
| Zone works | $100,000, then 1.5 times as much each time | 380, then 1.5 times as much |
| Requisition | $160,000, then 1.5 times as much | 580, then 1.5 times as much |
| A countermeasure | $5,000 | 45 |

Production is the long game. Run alone it starves everything else; the smart
play is to run it alongside one other project, half the points each, the
production upgrade grinding away underneath while weapons, mods and
countermeasures come and go above it.

## The endgame: war footing

War comes after a fixed number of **upgrade points**, whatever they were
spent on. An MK1 or MK2 is a point; an MK3, or the BanHammer, is two.
Production, the overseers and countermeasures don't count. **War comes at 30
points**: enough to unlock every weapon, mod and piece of gear and take them
all to MK2. By then a player has either brought the whole squad's kit up to
MK2, or has a few specialists at MK3 and other lines still at MK1. Either is
a way to go to war.

In the simulated campaigns, war came about mission 75 (day 410) for a player
who also researches production upgrades, mission 59 (day 319) for one who
doesn't, and mission 48 (day 258) for one who doesn't and puts 70% of
production into research. With 30 to 40 missions of war and lockdowns after
it, a campaign comes to about 100 missions: a little more for the player
building production for the long haul, a little less for one who rushes.

Research costs only go so far as a lever: halving them brings war about a
quarter sooner, and cutting them further barely moves it, because by then the
rest of the game sets the pace (the countermeasures Cal keeps demanding,
production upgrades, the money to start projects).

At that point the game changes from a research balancer to a war of
attrition. Cal stops probing and commits: **decay everywhere goes up by
half**, and the city is on war footing.

On war footing a zone can only be held weakly or strongly; the middle is
gone. For a base-3 zone, from `node tools/metasim.js --war`:

| | Pips to hold | Made a day |
|---|---|---|
| Level 0 | 2 of 3 | 1 |
| Level 1 | 3 of 4 | 1 |
| Level 2, or level 3 below the plateau | can't be held | |
| Level 3, on the plateau | 3 of 6 | 4.5 |

A zone either sits weak, making next to nothing, or sits on the plateau making
plenty; getting it from one to the other means crossing levels that can't be
held, on everything it has plus missions to push it over, while Cal knocks
plateau zones back down wherever the squad isn't. So the player chooses:
hold everything weakly with a zone always in rebellion somewhere, or hold half
the city strongly and let the rest go, for a stalemate. **Winning takes
pushing into more zones, which necessarily weakens others.**

**Propaganda and mind control** change the war: a zone under them can't
slip below level 1 (or 2) by decay alone, so it needs no pips to hold and puts
everything into production; only Cal's pushes and failed missions take it
lower. Rolling them out across the city is the cheap way to win the war, and
the game should make the player feel what it costs.

**There is no clock.** City research (overseers, zone works, requisitions,
propaganda, mind control) doesn't count toward the war's 30 points, and Cal and
mission threat scale with the player's upgrades and holdings, not with days. So
a methodical player chooses when the war comes: pacify the board, roll out the
propaganda, and only then take the squad's gear past 30 points. A player who
never does can hold the city as it is for as long as they like. That is
deliberate.

**Story missions** make that pushing worth doing, and they are how the game
is won. Once the city is on war footing, every zone has a short chain of
story missions (several each), and the last of them **locks the zone down**:
Cal's network there is broken for good, and its control no longer decays.
**When every zone is locked down, the player wins.**

The chains are tied to the zone, and some steps can only be done at a
particular level: an informant who will only talk once the zone is
pacified; a meeting that only happens where the streets are calm; a crime
lord who can only be reached once his zone is in open war. So pacifying a
zone opens missions that can't be run there otherwise, and the war is fought
zone by zone. Each lockdown frees the pips that zone was spending to hold
itself, which makes the next one easier: the end of the war gathers pace.

## Missions

Missions spawn in zones; the lower a zone's control, the more of them. What
kind depends on the level:

| Level | Missions lean toward | The streets |
|---|---|---|
| 3 | persuading people, intel, small pockets of violence; civilians must not be hurt | calm, policed |
| 2 | intel, arrests, breaking up a gang's operation | wary |
| 1 | assaulting targets, interceptions in public | tense; some civilians armed |
| 0 | street warfare | most of the city hostile, if weakly armed |
| lost | a siege: the enemy entrenched | hostile |

**Rewards are research, money or control**, or a mix of them:

- **research:** the mission completes **half of whatever is left** on each
  project running. So it is worth most when something big is underway, and
  worth nothing if the labs are idle: start the expensive project first,
  then go and get the intel. Intel also shows where Cal will push next;
- **money:** enough to make a real purchase that is open to you now: a mark
  of mod for one Watcher, a new weapon, a recruit. Even if nobody needs it
  today, a new Watcher will need kitting out soon enough;
- **control:** in the zone the mission was run in;
- **going after Cal's gang** in the zone he is pushing ends the push;
- some change the zone for a while: more pips, a cheaper decay, a cheaper pip
  of control, or the opposite if they go badly.

Each mission type is a template with ranges: its board area, its target, how
many guards and crew, their weapons, where you start and where they run, how
many days it takes, what it pays. Each mission that spawns is rolled within
those ranges, so no two are quite the same.

**Story missions** arrive with war footing (see The endgame).

## Open questions

1. **How long is the war?** Eight lockdowns at several story missions each is
   24 to 40 missions, plus the fighting to hold zones and reach the levels
   the story steps need. That is a guess until the story chains are written.
2. **The simulation doesn't spend money yet** on recruits, gear, mods or
   events, so it can't yet say whether those prices are right. In it the
   money piles up into the millions; that is about what four Watchers kitted
   out to MK3 would cost, which suggests the prices are in the right range.
3. **The simulation plays badly.** Its policy is crude (it climbs everything
   to level 3 and holds it), so it can't show what overseers are worth, for
   instance. The numbers here are a starting point for playtesting, not a
   result.
