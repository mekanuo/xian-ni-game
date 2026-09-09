# Development Environment

Verified locally on 2026-09-09. These observations do not select the production engine or prove a game runs.

| Component | Observed result |
| --- | --- |
| Node | v22.22.0 |
| npm | 10.9.4 |
| Google Chrome | 150.0.7871.114, version command successful |
| Godot | 4.7.1.stable.official.a13da4feb, godot4 version command successful |
| xvfb-run | /usr/bin/xvfb-run exists |
| Firefox | /usr/bin/firefox exists; launch not tested |
| Playwright cache | chromium-1223 and chromium_headless_shell-1223 directories exist; browser launch and library resolution not tested |
| GodotMaker | Local source README and installed CLI path found; no generation run started |
| NovelToGame | Installed pipeline and source-analysis skills inspected; research-to-design boundary retained |

## Decisions Not Made by This Check

- Existing package.json with latest dependency ranges is a legacy demonstration, not a validated or reproducible dependency baseline.
- Do not install or run parallel game-generation workflows merely because tools are available. Choose the engine after gameplay and target-runtime requirements are fixed.
- Verify the actual browser process, input, rendering, outcome, and restart when a candidate exists. A browser directory or a version command cannot substitute for that check.
- The target is a browser game. A Linux browser check cannot be reported as a Mac Safari/Chrome playtest.
- No public port was opened and no new cloud service or subscription was purchased by this inspection.
