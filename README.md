# frosthouse

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/salteek/frosthouse/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/salteek/frosthouse/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Frosthouse** is a curling tournament on frozen lakes, played in the browser with mouse and keyboard.

Climb the Frost Lake Open: six rival rinks, each with its own style (draw, guard, takeout, freeze, mixed), on five lakes that play differently (snow drifts, crosswind, a slush lane, glassy evening ice). Aim the skip's broom, pick the turn, set the weight, time the release on the needle, then hold to sweep your stone home. Between matches, pick kit upgrades in the clubhouse. **Win** by beating all six rinks; **lose** after two match losses.

- Real stone physics: friction, curl that grows as the stone slows, sweeping, collisions, the hog rule.
- Rival skips that read the ice: they list candidate shots, simulate each one with the same physics, and play the best for their style.
- Three difficulties, 14 kit upgrades, shot calls (Double Takeout! Freeze! On the Button!), end scoring with the hammer, and a results card with a grade.
- No libraries, no images, no network: canvas drawing and Web Audio synthesis only.

## Run it

```sh
python3 -m http.server 8080 --directory game   # then open http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # the make.fun hand-in
```

Controls: **mouse** aims the broom · **W/S or wheel** sets weight (1–5 presets) · **Q/E or right click** turns · **hold click or Space** and let go on PERFECT · **hold Space/click** to sweep · **Esc** pause · **M** mute.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
