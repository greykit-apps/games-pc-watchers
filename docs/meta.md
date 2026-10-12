# The meta-game: holding PumaCity

The rules, to be argued with; `js/campaign/meta.js` is the authority. The
campaign numbers come from `tools/campaign.js`, a bot that plays the real
rules (`node tools/campaign.js 200 --quiet --seed=N`, or load it as a module
and sweep). The zone tables come from `tools/metasim.js`, which keeps its own
copy of the first control model and runs one zone at a time; it predates the
balance passes and doesn't know about them.

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
when. Forewarned, you
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
| A recruit: a new Watcher, a bare chassis | $45,000 |
| A weapon from the Armoury, per Watcher (once researched) | MK1 $5,000, MK2 $15,000, MK3 $40,000 |
| A Purrsuader, per Watcher | MK1 $10,000, MK2 $25,000, MK3 $60,000 |
| The squad's scanner (all four) | MK1 $40,000, MK2 $100,000, MK3 $240,000 |
| A BanHammer strike (once researched): one shot | $250,000 |
| A mod, fitted at the clinic, per body part per Watcher | MK1 $10,000, MK2 $30,000, MK3 $75,000 |
| Stims, ammunition, the clinic's patching up | small change |

**The Armoury** is its own screen (key 5), the squad's shared stock, and kit
moves by dragging. Across the top, every Watcher's loadout: eight slots and
any BanHammer strikes. Below, **the racks**, what the squad owns, each with a
count; and **the dealer**, every researched mark of every gun at list price.
Drag from the racks onto a Watcher to give it; from a Watcher onto the racks to
put it back, or onto another Watcher to hand it over; from the dealer onto a
Watcher or the racks to buy it; anything owned onto the dealer to sell it for
half. While dragging, the places it can go light up and a label by the pointer
says what the drop will do ("Give to MANX", "Sell for $2,500") or why it
can't. Giving a gun of a kind the Watcher already carries puts the old one on
the racks. Anything that costs or fetches a lot (a buy of $40,000 or more, a
sale of $20,000 or more) asks first. A card shows the numbers of whatever is
pointed at. From the keyboard, Enter gives an item to the Watcher picked (or
returns it, from a Watcher's slot) and Delete sells it.

Harvesting the field is a strategy of its own: whatever a Watcher picked up,
a gun they weren't sent out with or medikits past the 4 they can carry, goes
onto the racks when the squad comes home, researched or not. Loot that isn't
researched can be carried or sold, but not bought.

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
| A festival | a zone gains 0.75 control over 3 days | $12,000 |
| Informants | shows where and when Cal pushes next | $30,000 |
| Bribes at City Hall | halves Cal's next push | $60,000 |
| Martial law | a zone's control can't fall for 3 days, Cal or no Cal | $60,000 |
| Hired guns | a mercenary crew fights beside the squad on its next mission (+4 squad power) | $50,000 |
| An amnesty | a lost zone comes back at level 0 without a siege; not once the city is being taken | $150,000 |

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
| **Overseers** | an overseer in every zone who, while the squad is away on a mission, moves pips onto control to hold the zone against decay, and on the wall (2.5 to 3.5) a pip more, to climb it. They don't plan for Cal: his push is still the player's to answer |
| **Propaganda**, then **mind control** | rolled out zone by zone, bought as an event once researched. Under propaganda decay can't take a zone below 1.0, and it is drawn back up (a quarter a day) when it falls below; under mind control, 2.0. The floor holds against decay only: the wall and the cliff above it stand, and Cal's pushes and failed missions still drag a zone down, as far as lost. It costs Casey too: people watching PVN spend less (a zone makes 15% less money under propaganda), and people who stop wanting anything spend nothing much (30% less under mind control), and can't be talked round by the Purrsuader. Framed for what it is, a crime against the people of the city; and it works, which is the worst of it |
| **Production** | **zone works:** +1 base pip in a zone of your choice, for good. **Requisition:** a free pip each day, placed wherever control is weakest. Both can be researched again, each time 1.5 times dearer |
| **Countermeasures** | one for each of Cal's tactics as he uses them: the research sink. However well the city is held, he keeps leaving things that need answering |

### What it costs

Sized for a campaign of about **100 missions**: weapons, mods and gear cost
little enough in research points that Take Control (open after 30 upgrade
points; see The endgame) comes around mission 60, leaving 30 to 40 missions
for the lockdowns. Upgrades come about every 2 missions, intel
missions included. Production and the overseers stay dear: they are the long
game.

| | Money to start | Research points to finish |
|---|---|---|
| MK1 | $4,000 | 30 |
| MK2 | $12,000 | 72 |
| MK3 | $30,000 | 136 |
| The BanHammer | $60,000 | 160 |
| Overseers | $40,000 | 150 |
| Propaganda | $120,000, then $50,000 a zone | 400 |
| Mind control | $250,000, then $150,000 a zone | 700 |
| Zone works | $100,000, then 1.5 times as much each time | 380, then 1.5 times as much |
| Requisition | $160,000, then 1.5 times as much | 580, then 1.5 times as much |
| A countermeasure | $5,000 | 45 |

Production is the long game. Run alone it starves everything else; the smart
play is to run it alongside one other project, half the points each, the
production upgrade grinding away underneath while weapons, mods and
countermeasures come and go above it.

## The endgame: Take Control

Cal can't be beaten while the city is only held: he is the chaos in it, not
an opponent across a table, and he keeps it from settling however well it's
run. The answer comes at the end, when Casey Benton gives the order to **Take
Control**: lock the city down, zone by zone, and corner him for good. (The
code and older notes call this "war".)

The order is the player's to give, once the squad has earned it: at 30
**upgrade points**, whatever they were spent on, Casey Benton is ready when
the player is, and the order is given from the Lab. An MK1 or MK2 is a
point; an MK3, or the BanHammer, is two. Production, the overseers and
countermeasures don't count. Thirty is enough to unlock every weapon, mod and
piece of gear and take them all to MK2. Nothing forces it: a player who gives
the order with a squad that isn't ready, or a city that can't pay for one,
has chosen to, and one who never does can hold the city as it is.

At that point the game changes from a research balancer to a fight of
attrition. Cal stops probing and commits: **decay everywhere goes up by
30%**, he rests 2 to 4 days between pushes instead of 3 to 6, pushes for 5
days instead of 4, and harder (a base of 0.6 a day, not 0.4); and each zone
locked down corners him a little more (+0.1), so his push doesn't fade as
the city closes on him.

Taking control, a zone at level 2 takes nearly everything it makes to hold:
a base-2 zone holds control 2.0 on all four pips, a base-3 zone 2.0 to 2.5 on
four or five of five, and nothing holds under a push. So the endgame is fought
on thin money, and a city that starts it already spent finds it hard.

**Propaganda and mind control** change the endgame: a zone under them can't
slip below level 1 (or 2) by decay alone; only Cal's pushes and failed
missions take it lower. It is a way to win the endgame, and it costs the
city money while it lasts.

**There is no clock.** City research (overseers, zone works, requisitions,
propaganda, mind control) doesn't count toward the 30 points, Cal's
escalation follows upgrade points, not days, and Take Control waits for the
order. A player who never gives it can hold the city as it is for as long
as they like. That is deliberate.

**Story missions** make that pushing worth doing, and they are how the game
is won. Once the order is given, every zone has a chain of three
story missions: **find the lieutenant** (any level, threat 2), **turn the
network** (level 2, threat 3, and like any persuade job it needs a
Purrsuader in the squad), and **lock it down** (control 2.5, threat 4),
each a step harder for every step of Cal's escalation (see Threat and the
squad). The lockdown of the last zone Cal holds is **his last
stand**: threat 5, his own people, and where a BanHammer strike counts most.
The last **locks the zone down**: Cal's network there is broken for good, its
control no longer decays, and it drops out of Cal's reckoning, so each
lockdown weakens his push on what's left. **When every zone is locked down,
the player wins.** A lost zone has to be taken back by siege first; a
BanHammer strike carried on a siege or a lockdown counts for 6 squad power
there. It's spent when it's called down in the field (X), and a strike not
fired comes home.

The chains are tied to the zone, and some steps can only be done at a
particular level: an informant who will only talk once the zone is
pacified; a meeting that only happens where the streets are calm; a crime
lord who can only be reached once his zone is in open war. So pacifying a
zone opens missions that can't be run there otherwise, and the endgame is
fought zone by zone. Each lockdown frees the pips that zone was spending to
hold itself, which makes the next one easier: the end gathers pace.

## Missions

**The board is short, and it changes.** Offers arrive over time rather than
being topped up: a zone holds one ordinary offer (two at level 0), and a zone
short of that gets one on a daily roll by its level (50% at level 0, 35% at
1, 25% at 2, 15% at 3). There are at most five ordinary offers across the
city (four once the order to Take Control is given, when the story steps need
the room), no kind twice while the board is three or more, and each stands 6
to 12 days. On top of them come the ones that can't wait: Cal's crew while he
pushes, a siege for each lost zone, and, once the city is being taken, up to
three story steps, where a zone is ready for its next one (the closest to
done first; the rest show in the zone's dossier, with what they wait for).

**Two guarantees.** There is always a training job: if no quiet job at
threat 2 or less is up, one turns up in the calmest zone (the Towers, while
they hold; one of Cal's zones when he holds all that's left). And when the
cash won't run to a recruit and a basic kit, a small job (threat 2 at most)
turns up for the money. Both come on top of the five.

What kind turns up depends on the zone:

| Zone | Leans toward | Never |
|---|---|---|
| Level 3 | persuade, intel; now and then a job | crackdown, assassination, sweep |
| Level 2 | intel, persuade, job, crackdown | assassination |
| Level 1 | job, crackdown, intel, assassination, sweep | |
| Level 0 | crackdown, job, assassination, sweep, intel | persuade |
| Lost | a siege | |
| The Towers | persuade and intel only: Benton's seat, the training ground | anything loud |

The Starport and the Ranch lean further to jobs and crackdowns (the
smuggling, the grow fields). The streets:

| Level | The streets |
|---|---|
| 3 | calm, policed; civilians must not be hurt |
| 2 | wary |
| 1 | tense; some civilians armed |
| 0 | most of the city hostile, if weakly armed |
| lost | the enemy entrenched |

**Rewards are research, money or control**, or a mix of them:

- **research:** the mission completes **half of what is left on the first
  project running**, up to 12 research points for each day the mission
  takes, and finishes it outright when what would be left is small. So it
  is worth most when something big is underway, and worth nothing if the labs
  are idle: start the expensive project first, then go and get the intel.
  Intel also shows where Cal will push next;
- **money:** enough to make a real purchase that is open to you now: a mark
  of mod for one Watcher, a new weapon, a recruit. Even if nobody needs it
  today, a new Watcher will need kitting out soon enough. Fighting work adds
  **danger money** by threat (×0.6 at threat 1, ×1 at 2, ×1.5, ×2.2, ×3 at
  5): a full suite of MK3 mods is $690,000 a Watcher, and the hard jobs have
  to be worth the Watchers they cost. A job pays it all;
  an assassination too, with control, and the name on the list takes Cal's
  tactic in the zone with them if one is running there; a crackdown a fifth
  of it, with more control. Persuade and intel in a calm zone (level 2 or 3)
  pay a small fee ($5,000 to $10,000), so training a new squad pays its way;
  persuade's control is small where the zone is already settled;
- **control:** in the zone the mission was run in, landing as the squad
  comes home, after the mission's days away;
- **going after Cal's gang** in the zone he is pushing ends the push;
- some change the zone for a while: more pips, a cheaper decay, a cheaper pip
  of control, or the opposite if they go badly.

Won or lost, the streets remember how it was done: each citizen talked round
and still with the squad at the end adds **0.025 control** to the zone, each
of the crew or the police turned **0.05**, up to **0.4** a mission (talk only
goes so far); each civilian the fight killed takes **0.03** off (traffic
accidents don't count). Both show on the debrief.

Each mission type is a template with ranges: its board area, its target, how
many guards and crew, their weapons, where you start and where they run, how
many days it takes, what it pays. Each mission that spawns is rolled within
those ranges, so no two are quite the same.

**Story missions** arrive once the order to Take Control is given (see The
endgame).

## Threat and the squad

A mission's **threat** (1 to 5) belongs to the mission, not to the squad
sent: its kind's base, a step harder where the zone's control is low (a step
easier at level 3), and **Cal's escalation**, which follows the campaign: he
arms his people a step at 18 upgrade points, and one more once the city is
being taken. Quiet jobs in calm zones (level 2 or 3) take
neither the escalation nor the Take Control step: that's the training ground,
threat 1 or 2 all campaign long. A story step is 2, 3 and 4 plus the
escalation (3, 4 and 5 by the time it matters); Cal's last stand is 5. It's worked out when the offer turns up,
and fixed while it stands, so the same mission is easier for veterans than
for recruits, and recruits can be sent on easy work.

The **squad's tier** is its power (each of the four's best gun, a fifth of a
point per mod mark, a quarter per rank, a hired crew, a BanHammer on a siege
or lockdown) against 11.5, 18, 25 and 29 for tiers 2 to 5. The tiers are the
Watchers' levels plus one, matched to the enemy's (W.FOE: the threat less
one): the squad Casey hands over is tier 1, a full suite of MK1 mods and guns
tier 2, MK2 tier 3, MK3 tier 4, the top of the tree tier 5. A weapon mark
counts a quarter more gun, as it does in the field (+25% damage, +15%
range). Every
researched mark of a weapon is on the racks, MK1 included, and a BanHammer
strike takes none of a Watcher's eight slots.

## Balance, measured (2026-10-12)

`tools/campaign.js --report`: twelve campaigns of up to 200 missions, the
bot rolling each fight from `tools/fights.json`, the tactics bench's grid
(seven kinds, Watcher levels 0 to 4, threat a step under the squad to two
over, every way in, 4 fights a cell, 1,700 fights). A careful player fights
as the two best ways in for the cell did; raw (`--harsh`), as the average of
every way the squad has. The bot spends like a player: mods to MK3 as
they're researched, the best gun for each Watcher, what's brought home sold,
the city turned to research when cash piles up; and it takes the mission
worth most a day for the risk, a Watcher lost counted at what was spent on
them.

| | Careful | Raw |
|---|---|---|
| Won | 12 of 12, by mission 90 (day 456) | 12 of 12, by mission 110 (day 525) |
| Take Control at mission | 57 | 57 |
| Watchers lost a mission | 0.25 | 0.26 |
| Cash at the end | $678,000 | $681,000 |
| Offers on the board (before / taking control) | 5.1 / 6.6, at most 8 / 10 | the same |
| Kinds taken | story 31%, intel 26%, persuade 10%, assassination 7%, crackdown 7%, sweep 6%, Cal's crew 5%, job 5%, siege 4% | intel 31%, story 26%, persuade 20%, assassination 6%, job 5%, sweep, siege 4% |

The other strategies (careful): Take Control as soon as it's open plays the
same; the research-heavy turtle wins 12 of 12 by mission 100 (Take Control at
44, 0.58 lost a mission); mind control everywhere 12 of 12 by 106. Every
board had a training job (a quiet one at threat 2 or less); 1% had a kind
twice.

What changed to get there, beyond the rules above: assassination's base
threat came down to 2 (the bench wins it at the squad's level as often as a
crackdown); Cal's escalation is one step (18 upgrade points) plus the Take
Control step, since two steps put the whole endgame at threat 5; and danger
money (fighting pay ×0.6 to ×3 by threat), without which only the risk-free
jobs paid for the Watchers a fight costs.

## Open questions

1. **Waiting still pays.** Five idle days after every mission end the
   campaign with $3M instead of $700,000, and win in as many missions. Cal
   is meant to keep a pacified city from being left to run itself; today he
   doesn't. Levers: his tactics cost money as well as control, his pushes
   bite harder the longer the city is left, or the city's money stops
   growing past a level.
2. **Deaths at the squad's own tier are low** (0.08 a mission against a
   target of 0.15 to 0.3): the careful bot picks its fights. Overall, 0.25.
3. **The simulation plays a bot, not a person.** The fights are measured;
   the choices between them are a reasonable bot's. Playtesting decides.
