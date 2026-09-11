# 背墙旧窑空间白盒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用真实既有施术、射弹、警觉和移动规则验证两处窑墙与落地挡屏的空间取舍及零灵力往返。

**Architecture:** 独立 whitebox.html 与独立 Phaser 场景，只在此入口的模块环境把 SCENES.home 替换为候选几何。调用既有 act/tick/preview，不改生产入口、规则、存档和旧地图；白盒自身只记录真实到达的东端与返程位置，不写主线完成旗标。

**Tech Stack:** Phaser 3.90.0、TypeScript 5.9.3、Vite 7.3.6、Vitest 4.1.11、Playwright 1.58.2。

**Spec:** design/ADVENTURE_060.md，继承 design/GAME_DESIGN.md；此计划仅执行其最大空间风险切片，杜芹借还、跨图与生产美术属于验证后另一个生产计划。

## Global Constraints

- 一张候选图、两处墙角、一块轻木挡屏、两名现有远程对手；无新资源或战斗系统。
- 步行、察看、引物、施火、护符；不把 held 物件当实体遮蔽。
- 真实浏览器串行，0.5 verify 和公网核验优先；此分支模型开发可并行。
- 不加载玩家存档，不加 __XIAN_NI__ 状态写入口，不把白盒端点记为正式0.6通路。
- home 槽位避免 workshop 安全区、crossing 落石强依赖；清除初始生活道具，仅保留本切片实体。
- 基线759f8c8与正在验证的0.5运行源码一致，已通过342测试；不重复基线矩阵。

## Task 0: 可移动可燃物的既有状态组合

**Files:** modify src/game/model.ts；create tests/movable-burning.test.ts。

只读审查发现新组合缺口：牵引/放下会把burning/burned写回pulled/idle。先用真实施火、留势、放下和重新牵引写RED测试；禁止牵取燃烧中或已毁物，放下不可熄火复原，若当前牵物被点燃便断开牵引自然落地。只修此组合，不改正常轻物/资源/射弹/移动规则；在0.6分支验证，不打断正在跑的0.5候选。

```ts
// In a fixed movable+flammable fixture, use act(flame) and tick until burned.
expect(act(s,{type:'cast',spell:'pull',targetId:screen.id,point:screen}).ok).toBe(false);
expect(screen.state).toBe('burned');
```

- [ ] RED reproduction, minimum state-preserving patch, targeted GREEN and independent review before claiming the new screen is permanent after burning.

## Task 1: 可重开的规则切片

**Files:** create src/whitebox/kiln-model.ts、tests/kiln-whitebox.test.ts。

**Interfaces:**
```ts
type KilnPreset = 'ordinary' | 'zero';
interface KilnRun { state: GameState; eastReached: boolean; returned: boolean }
export const KILN_MAP: SceneDefinition; // id='home', only isolated entry installs it
export const KILN_WEST: Vec;
export const KILN_EAST: Vec;
export function installKilnMap(): () => void; // restores exact previous map reference
export function createKilnRun(preset: KilnPreset): KilnRun;
export function kilnAct(run: KilnRun, action: GameAction): ActionResult;
export function kilnTick(run: KilnRun, dt: number, input: Vec): void;
```

- [ ] Write failing tests for actual initial state, zero mana, blocked wall destination, frozen time/positions when paused, east-and-back positions through real move/tick and complete restart reset. Restore SCENES.home in afterEach so tests cannot contaminate other suites.
```ts
const run = createKilnRun('zero');
expect(run.state.player.mana).toBe(0);
expect(kilnAct(run, {type:'cast',spell:'ward',point:{x:400,y:500}}).ok).toBe(false);
expect(run.eastReached).toBe(false);
kilnAct(run,{type:'pause',value:true});
const before=JSON.stringify(run);
kilnTick(run,1,{x:1,y:0});
expect(JSON.stringify(run)).toBe(before);
```
- [ ] Run `npx vitest run tests/kiln-whitebox.test.ts` and confirm expected missing implementation failure.
- [ ] Implement fixed initial geometry, enemy home/last positions and ordinary 6/zero 0 mana. Keep shared model defaults otherwise. Only allow move/cast/select/pause/release/hold/cancel; reject inter-scene, dialogue, save retry and rest actions in this isolated wrapper.
- [ ] After actual tick and while alive/unpaused, record proximity <=65 to east; only later proximity <=65 to west records returned. Display these as whitebox evidence, not quest rewards. New run resets complete scenario, resources, enemies and screen.
- [ ] Replay retained-screen zero-resource round trip using actual act/tick. Record any health loss and enemy movement; failure changes geometry, not injected state, damage or fake enemy peace.
- [ ] Targeted tests GREEN, root review, commit/push checkpoint. No release deployment.

## Task 2: Target-engine input and readable geometry

**Files:** create whitebox.html、src/whitebox/kiln-main.ts、src/whitebox/kiln.css。

Consumes Task 1 exact exports plus shared previewCast/previewPullMove. Renderer reads run.state; commands only call kilnAct and kilnTick.

- [ ] Create standalone HTML entry with visible ordinary/zero resource start buttons, a Phaser canvas, current resource/selected action text, pause and restart. Show “空间白盒，非正式美术” so no quality claim is implied.
```html
<main id="kiln-game"></main>
<script type="module" src="/src/whitebox/kiln-main.ts"></script>
```
- [ ] Render actual wall rectangles, grounded screen footprint, enemy facing/casting/health, player, projectile positions and first-contact events. Use distinct muted material colours and readable labels; no route lines or decorative scenery masking geometry.
- [ ] Wire real WASD and click/touch ground movement; select pull/fire/ward through buttons or 1/2/3, target actual entities, destination while pulling, release, pause and restart. Use camera world projection and DPR-capped render resolution. No alternate combat model.
- [ ] Expose read-only inspect and screenPoint only; include current scenario name and whitebox endpoint facts. Never expose action/state setters.
- [ ] Run TypeScript and a separate whitebox build configuration if required; standard production build must retain its single existing entry.

## Task 3: Actual space test and decision

**Files:** create scripts/kiln-whitebox-check.mjs、qa/whitebox/kiln.json; update design/ADVENTURE_060.md and docs/PROGRESS.md with measured observations.

- [ ] After0.5 browser ownership ends, start isolated Vite server4192 and open whitebox.html. Through visible start controls and actual inputs run zero-resource round trip, screen pull/drop, fire and restart; no imported progress or scripted teleport.
- [ ] Capture one readable initial overview and one changed screen/impact position, record actual positions, mana/hp, endpoint facts, enemy last-seen positions and browser errors. Pause case proves time and projectile positions freeze.
- [ ] Separate model-only trajectory claims from browser input coverage. If the space is trivial or fails a route, revise only candidate geometry and replay the affected case.
- [ ] Root judges whether to proceed to production map/borrow/return/save/art plan. No production art before the representative encounter works. Commit/push whitebox milestone; keep public0.5 unchanged until a later production candidate passes.

## Execution ledger

2026-09-11: Preparing this isolated slice while the frozen0.5 candidate completes its long release run. This adjusts the earlier scheduling sentence “0.5发行后建立白盒”; release priority and browser serialization remain unchanged. User authorized autonomous progress and milestone pushes; no approval question is pending.
