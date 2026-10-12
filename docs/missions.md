# Missions: what the campaign asks of the mission engine

The campaign (`js/campaign/meta.js`, on the `meta-game` branch) picks a
mission and hands the engine a level from `W.missionLevel`, with two things
attached. This is the contract between them; the engine side is still to
build.

## What arrives

```js
L.mission = {
  kind: "persuade" | "intel" | "job" | "crackdown" | "assassinate" | "cal" | "siege" | "story",
  threat: 1..5,      // how hard (see below)
  quiet: true|false, // can be done without a shot fired
  zoneLevel: -1..3,  // the zone's control level (-1: lost to Cal)
  step: 0..2,        // story missions only: which step of the zone's chain
  cal: true|false,   // the crew are Cal's own: his push, a siege, or a zone he holds
  hired: 0|4,        // a hired mercenary crew to field beside the squad (followers with guns)
  mindControl: bool, // the zone is under mind control: nobody there can be persuaded
};
L.mod = {            // the enemy at this threat, against the district's usual numbers
  crew: 0.35..1.7,   // multiplies theme.crew
  guards: 0..1.5,    // multiplies theme.guards
  sec: 0.6..1,       // multiplies theme.sec (local security)
  armed: 0.3..1,     // share of crew and guards carrying anything at all
  guns: [...],       // what the armed ones carry, picked from
  armour: 1..1.5,    // multiplies their hit points
};
```

The squad arrives as now (`opts.roster`), each weapon with an `mk` (1 to 3). The squad's scanner mark (0 to 3) is on the level as `L.scannerMk`.
The campaign reads the result as the debrief does today: won or lost, and for
each Watcher alive or dead, kills, and the items they carried home. It would
help if the items came home with their `mk` (today the engine drops it; the
campaign works round that).

Nothing breaks if the engine ignores all of this: every mission is then the
one it has, find and kill the target, at the district's usual strength.

## The enemy by threat

| Threat | Who's there | Armed |
|---|---|---|
| 1 | a few lookouts and minders; no bodyguards | about a third, pistols only |
| 2 | a small crew, a bodyguard or two | most, pistols and the odd shotgun |
| 3 | the district's usual crew and guards | all: pistols, shotguns, uzis |
| 4 | more of them, tougher | uzis, shotguns, a rifle |
| 5 | an army | uzis, rifles, miniguns, lasers; armoured |

An unarmed enemy should behave as one: raise the alarm, run for help, fight
hand to hand at most. A new squad of four with pistols is tier 1 and should
win threat 1 missions comfortably, and most threat 2 with care.

## The kinds

**Quiet** kinds can be done without a shot fired, and are what a new squad
starts on. Shooting is allowed, but it should make them harder (the alarm,
the target spooked) and should cost something in the result.

| Kind | On the ground | Won when | Lost when |
|---|---|---|---|
| **Persuade** (quiet) | someone (an informant, a shopkeeper, a minor boss) is talked round with the Purrsuader and walked out | they reach the exit as a follower | they die, or get away |
| **Intel** (quiet) | get to a spot (a terminal, a safe, an office) and hold it a few seconds, then get out | the data reaches the exit | the squad is wiped out, or the data carrier dies |
| **Job** | a robbery, a shakedown or a pickup: take something from somewhere and get it out | the goods reach the exit | as intel |
| **Crackdown** | break up a gang's operation: its crew put down or driven off, its stash destroyed | most of the crew down or fled | the squad is wiped out |
| **Assassination** | as today: find the target and kill them before they run | the target dies | the target escapes |
| **Hit Cal's crew** | a crackdown on Cal's people where he is pushing | as crackdown | as crackdown |
| **Siege** | the enemy dug in, in a building, behind cover; the BanHammer's job | every defender down | the squad is wiped out |
| **Story** | the zone's chain: find a lieutenant (step 1), turn their network (step 2, quiet), lock it down (step 3, a siege-like assault) | per step | per step |

"The exit" is the same for every kind: the getaway car at the pickup, one
spot near the district's edge picked with the mission, far from the mark.
Nowhere else counts. The threat also sets how busy the district is on the
way there and back (`W.ENCOUNTER_DENSITY` in `js/districts/encounters.js`).

A kill target (assassination, Cal's lieutenants, a story step's mark) can
never be persuaded, at any Purrsuader mark: Casey wants them dead. The one a
persuade mission walks out is not a kill target, and should be its own kind
of unit (or flag) that the Purrsuader can reach.

The rewards are the campaign's business; the engine only has to say won or
lost. A grade (as the debrief gives now) and whether a quiet mission stayed
quiet could later scale the reward.

## Later

- The BanHammer (researched and bought in the campaign as `banhammer`, one
  shot each): a long-range spotting laser, and a few seconds later an orbital
  blast that kills everything in a wide radius. Made for sieges.
- Weapon marks: MK2 and MK3 hitting harder and reaching further.
- The scanner's marks (the campaign's `scannerMk`): MK1 range, MK2 armed
  people marked apart from unarmed, MK3 people seen through roofs and walls,
  Cal's gang in red.
- The Purrsuader's marks: MK2 is today's Purrsuader II; MK3 a bigger
  following that fights better.
