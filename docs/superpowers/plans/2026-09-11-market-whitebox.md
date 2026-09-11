# 集口问路空间与交涉白盒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Root owns integration, browser scheduling, review and milestone pushes; parallel workers receive exclusive files.

**Goal:** 用真实现有模型验证安全现场直接交换、近敌令沈砚暂停/自主续行、实体开门与公共/私巷实际穿行，交回局部设计决定是否生产。

**Architecture:** 独立 worktree 与 `market-whitebox.html`，只在该入口安装 home 候选槽位，复用生产 act/tick/碰撞/视线/敌人规则。共享 model 仅导出已有真实端口，不导入白盒、不改正式入口；新交涉、NPC移步与出口观察由独立 market wrapper 裁决。门实体 closed/open 是唯一门事实，碰撞属性按它派生。

**Tech Stack:** 当前锁定 Phaser 3.90.0、TypeScript 5.9.3、Vite 7.3.6、Vitest 4.1.11、Playwright 1.58.2；执行时记录实际 Node/npm/Chrome 版本，不在计划里猜测。

**Spec:** [ADVENTURE_070](../../../design/ADVENTURE_070.md)，几何见 [MARKET_070_GEOMETRY_REVIEW](../../../design/MARKET_070_GEOMETRY_REVIEW.md)，继承 [GAME_DESIGN](../../../design/GAME_DESIGN.md)。本计划只实施已选定 A 的白盒；0.7 正式地图、美术与迁移未获生产决定。

## Global Constraints

- 0.6 运行源码已由 root 做冻结核对；允许在另一独立 market 工作树并行实现白盒/模型测试，不等待最终证据提交。0.6 合入与公网部署优先；0.7 浏览器必须等0.6本地及公网浏览器全部释放。本文件没有已完成步骤、PASS 或生产批准。
- `buildStage: whitebox`、`buildPath: custom`、`experienceProfile: hybrid`、`signature_command: N/A`。目标仍为简中浏览器实时二维玩法，最大风险需要 Phaser 实际输入验证。
- 一图、一名沈砚、一名 hp3 散修、一个 decoy 空筐、一个不可牵/不可烧的私门；不增加经济、巡逻系统、通用动作队列或新术法。
- 普通/零灵力与有/无可交换信息必须在开始页公开选定；信息只是白盒前提，不伪装成真实旧窑存档经历。开始后不得修改敌人/资源/位置/门/交换/通路事实来凑结果。
- 对话和手动暂停完全沿用世界冻结语义。消息已交换可与门未开并存；沈砚恢复运行后才移步、见敌停、失去可见威胁后自行继续，到闩侧实际触闩即开，不另加计时或重复请求。
- 私门不会重新上锁；敌人退出不复活。公共路不依赖成交、灵力、同伴或棚角，退路保留；不给新静息点。
- 独立白盒不读正式 save、不调用旧 retry/retreat/changeScene，不证明正式 v6 迁移或旧图连接。原来的所有场景与生产入口保持可运行。
- 单一浏览器串行归 root；失败保留证据，修订后重放受影响路径，不把独立白盒并入正式 `npm run verify` 或部署 Pages。

## 文件与责任

| 文件 | 最小职责 |
|---|---|
| modify `src/game/model.ts` | 仅导出真实 simulationPorts；不加 market 场景分支或改变旧规则 |
| create `tests/simulation-ports.test.ts` | 验证端口实际使用共同碰撞/暂停与移动，不是另一套实现 |
| create `src/whitebox/market-model.ts` | 固定几何、公开初态、交涉、NPC动作、门派生碰撞、真实路线观察 |
| create `tests/market-whitebox.test.ts` | 规则边界、真实 act/tick 路径、有限复现与重开 |
| create `market-whitebox.html`, `src/whitebox/market-main.ts`, `src/whitebox/market.css` | 独立 Phaser/DOM 输入与可读白盒反馈 |
| create `vite.market-whitebox.config.ts` | 独立构建输出到既有忽略目录 `.whitebox-dist/market`；不修改默认构建入口 |
| create `scripts/market-whitebox-check.mjs` | 单浏览器、串行真实输入与失败留证 |
| update `design/BUILD_BRIEF_070_WHITEBOX.md`; create `qa/whitebox/market.json` | root 已写简报；执行时补实际工具与结果，运行后记录证据，不能预填成功 |

## Task 1: 隔离工作树与可复用的真实端口

**Files:** `src/game/model.ts`、`tests/simulation-ports.test.ts`、`design/BUILD_BRIEF_070_WHITEBOX.md`。先由 root 持有这三个文件；端口定型后再分派独立 UI 与规则。

**Interfaces:** 从 model 导出只读对象 `simulationPorts`，包含已有 `free(s,point,pad?,ignoreId?)`、`clearLine(s,from,to,ignoreId?)`、`emit(s,type,text,entity?)`、`dialogue(s,id,speaker,text,choices?)`、`closeDialogue(s)`，以及 `moveNpc(s,npc:Entity,to:Vec,speed:number,dt:number):void`。后者只包装 `moveBody(...,npc.id)`；不要复制或改写其算法。前四项类型兼容现有 LifePorts。

- [ ] 确认 root 指定的0.6冻结源码基线，按 using-git-worktrees 建立 `.worktrees/market-070` / `feat/market-070-whitebox`，记录实际基线 SHA与冻结来源；不要求等待0.6最终证据提交。只改新工作树，不修改仍在QA的0.6源码，不对主目录清理或 reset。
- [ ] 在新树读取最新 HANDOFF/AGENTS 与本计划，核对父级正在运行的服务；依锁文件准备依赖。核对 root 已写简报并补执行信息，记录白盒形态、三术法、普通6/零0、固定信息前提、实际工具版本、命令和未覆盖正式内容；不开展美术方案。
- [ ] 写端口 RED：导出尚不存在；端口接好后还须用实体墙证明 free/clearLine 与 moveNpc 真受原碰撞约束，用原 dialogue→tick→closeDialogue 证明阅读不推进世界、原手动暂停不被关闭对白解除。
- [ ] 运行 `npx vitest run tests/simulation-ports.test.ts`，先确认缺口；导出既有函数及薄包装，再运行同命令至 GREEN。端口仅在模块内可调用，不挂到任何浏览器调试对象。
- [ ] 按风险仅运行 `tests/model.test.ts` 与 `tests/projectile-obstacles.test.ts`；若名称变化先核对实际文件，勿由导出任务扩大到完整发行矩阵。root 看 diff 确认没有旧规则分支变更，再提交/推送一个可审阅里程碑。

## Task 2: 有固定初态、真门与真行走的规则切片

**Files:** `src/whitebox/market-model.ts`、`tests/market-whitebox.test.ts`。

**Interfaces:** 下游 UI 与脚本按这组名称接入，避免各自发明完成条件。

```ts
type MarketRoute = 'public' | 'private';
interface MarketPreset { mana: 'ordinary' | 'zero'; informed: boolean }
interface MarketTransit { route: MarketRoute; from: 'west' | 'east' }
interface MarketRun {
  state: GameState;
  preset: MarketPreset;
  exchanged: boolean;
  trip: { transit: MarketTransit | null; traversed: Record<MarketRoute, boolean>; exitRoutes: MarketRoute[] | null };
  completed: Record<MarketRoute, boolean>;
  returned: Record<MarketRoute, boolean>;
}
export const MARKET_MAP: SceneDefinition; // id='home'; no production slot added
export const MARKET_POINTS: Record<'entry'|'exit'|'merchant'|'latch'|'decoy'|'enemy', Vec>;
export function installMarketMap(): () => void;
export function createMarketRun(preset: MarketPreset): MarketRun;
export function marketAct(run: MarketRun, action: GameAction): ActionResult;
export function marketTick(run: MarketRun, dt: number, input: Vec): void;
export function marketThreat(run: MarketRun): boolean;
```

### 初态与规则顺序

- [ ] 写最小 RED：未交换、门 closed、NPC 在原位、普通6/零0、只有一个正常 hp3 散修；非法 preset 拒绝；安装还原准确恢复 SCENES.home 引用。每个测试 afterEach 还原槽位，不污染其它测试。
- [ ] 复制几何审查的 1400×1000 数值作为首候选：入口(240,760)、出口(1140,240)、沈砚(470,440)、闩侧(620,440)、decoy(460,720)、敌人(850,560)；两排货屋与四界墙逐项相同。门实体中心(665,440)、30×120、type=`market-door`、state=`closed`，不另放重复固定门矩形。
- [ ] `createMarketRun` 基于 createGame 清空 home 场景的旧白盒无关实体，装入当前候选；life/canal/journey 均未接约、companion waiting，checkpoint=null，不发旧完成标记。初始化 exchanged=false、transit/exitRoutes=null，traversed/completed/returned 两路皆 false。唯一初始差别是显式 preset；不把“有消息”写入 kiln.crossed。
- [ ] 门碰撞唯一派生：在每次 marketAct/marketTick 前及门状态改变后同步 `door.solid = door.state !== 'open'`；渲染读同一个实体。solid 是现有引擎需要的碰撞属性，不是可独立编辑/保存的开门成果。无需改 rectangles 对所有实体的判定。
- [ ] marketAct 仅转发 move/cast/select/pause/release/hold/cancel；拦截本章 merchant、两个 endpoint 的 interact 和有界 market choice，拒绝 rest/retry/retreat/其它跨图动作。`leave/more` 仍走既有 act；本章选项核对当前 dialogue.id、实际存在且未禁用的 choice、free/距NPC<96/LOS，不能由任意 choice 字符串远程提交。
- [ ] 本章互动也遵守普通act的暂停待办：暂停时只排队，恢复后经marketAct重新检查近身/LOS/威胁；不要让原act内部吞掉自定义interact或变成普通inspect。模拟远处/暂停后条件变化与取消，确认没有暂停中瞬时成交。关闭对白与待办恢复均不偷推进NPC。
- [ ] `marketThreat` 只看同图 hp>0 且非 peaceful/retreated 的实际敌人，距沈砚≤300 且真实 clearLine 成立；idle 不自动免除威胁，过去见过玩家也不自动构成威胁。第一切片只证明敌人本人可见性，不额外许诺沈砚预判墙后飞弹。
- [ ] 正常首次近身：无消息允许问公共路，无威胁且有消息可立即提交 exchanged=true；门仍 closed。重复交谈不清敌、不再交换。现场有威胁只说明当前来向；不存在“先去外巷”资格检查。
- [ ] marketTick 按真实模型每步≤0.025、单次输入总量≤1秒切分；每步先同步门→调用真实 tick→确认时间真的增加且未败退/暂停→重新判断 NPC 威胁→用真实 moveNpc 移步→实际距闩侧≤8且 free/无威胁时 door.open→同步碰撞→观察玩家该步实际线段。不要一次 dt=1 让敌人先走完一秒、NPC再独走一秒。
- [ ] NPC 速度先取现有低速行走尺度 120；约150的路程体现真实等待，未实测不锁毫秒。威胁令她停在当前合法点，消退后自动继续，离图/对白/手动暂停不推进；交换与门状态不回退，不增 resume 标记或额外触闩倒计时。
- [ ] 按 root 审阅补充，开门后沈砚真实侧让并回摊，不永久占(620,440)：先(620,405)→(470,405)→(470,440)。先用真实 free/moveNpc 验每段与当前门状态；y405距离北侧扩张边界397仅8，若余量不合适只局部修候选站位。可由门open与实际坐标派生固定返位目标，不建大动作队列；受到当前可见威胁仍停/续，不瞬移、不让返位再次关门。

### 共用出口的归因（必须先 RED）

- [ ] 定义两段真实通道：private 中心通行带 x=500..820、y=397..483；public x=500..820、y=797..903。数值来自17半径后的候选净宽，不从所选话题、门状态或计划路线生成。此处按 root 接受的审阅补充：同一试走若两条都完整从西到东穿过，保留两条，不强制选“最后一条”覆盖先前实走。
- [ ] 只用正常 tick 前后身体线段观察：从通道西界进入便记临时 transit；完整保持在该通行带并从东界退出，才置对应 traversed=true。沿侧边退出/转回原侧只清未完成的 transit。反向经过不新增西到东成果，也不抹掉本次此前确已完整穿过的路线；原口明确结束本次试走后才清本次临时记录。
- [ ] 从通道中间向东走几步不得当作从西穿过；由实际西入东出历史证明。边界恰好到点和斜线穿越按连续线段处理，不能因 dt 取样遗漏或用浮点等号判断。
- [ ] 两端点互动须实际距标记≤65且 free/clearLine。上层出口实际近身 interact 且至少一项 traversed 为真，才将这些路线的 completed 写 true，并把本次集合冻结到 trip.exitRoutes；同一上层出口不读取 exchanged 或门开状态猜路线。之后亲自返回原口并 interact，才将该 exitRoutes 集合的 returned 写 true；此处仅是白盒北口近身确认与实际步行折返：不调用生产 changeScene，不证明生产跨图离场、北口实际去处或真实回驿汇报。
- [ ] 原口提前返回只结束当前试走，不发 completed/returned；保留 exchanged、实体门与NPC坐标。以后重新试另一条路，completed/returned 可各自追加，不撤前次事实、不重复奖励。上端确认后只允许返回或在原口开下一次试走，不在东岸乱走时重复结算另一条。

### 有限验证与交付

- [ ] 先跑 `npx vitest run tests/market-whitebox.test.ts` 取得行为 RED，再按上面顺序实现最小 GREEN；缺模块失败只算接口初红，不冒充规则回归证据。
- [ ] 有意义规则反例：无信息/远处/不可见近敌不能错误成交；安全首次直接交换；对白等待不开门；真实移步开门后实际侧让回摊；实际可见威胁停、消退续、已开不关；门闭玩家/射弹均被挡、门开后均可经过；手动暂停恢复与重开保持明确。
- [ ] 路线反例：门开但走公共路只能 public；交换后原口回头不算；站到上端但没穿完整带不算；私巷半途回头再走公共路只能 public；公共完整走过后回退再完整走私巷应保留两条；东侧向带内退几步又回东侧不得凭空补穿行；往返与后来补另一条分别成立。
- [ ] 几何/人物边界单测可使用明确标注的不同初始场景夹具，不能把这种初始化叫作实走。集成路径从固定公开 preset 起，全程 actual marketAct/marketTick，禁止过程中重置 HP/MP、敌人/门/NPC坐标或任何通路事实。
- [ ] 实走普通有信息直接私巷、零资源无信息公共往返，以及真实引敌后停/续；每次决策加入约0.7–1秒正常活动间隙。成功锁活着、无额外资源、实际端点、人物/门因果；时长/伤害/敌人末见点如实记录，不锁偶然毫秒/固定警觉次数。
- [ ] 若找不到真实引敌至近巷再脱离的路径，报告具体卡角/LOS/输入拒绝，局部改候选几何并重放；不扩成新 AI、不清空对手凑 GREEN。root 审查规则与路线后提交/推送模型里程碑。

## Task 3: 独立 Phaser 输入、对白与实际反馈

**Files:** `market-whitebox.html`、`src/whitebox/market-main.ts`、`src/whitebox/market.css`、`vite.market-whitebox.config.ts`。只消费 Task 2 上述接口与原 previewCast/previewPullMove，不写第二份交易或路线规则。

- [ ] 创建公开普通/零灵力、有/无信息初态控件及新开按钮；开始后改变选择只影响下一次新开，不能中途改当前 run。显示“空间与交涉白盒，非正式美术”。
- [ ] 复用旧独立入口的 Phaser 输入结构，但不直接 import 会初始化旧窑场景的模块。绘制实际墙/门/空筐、NPC真实脚点与停步、散修起手、射弹首撞和出口；显示被拒绝的具体原因，不加白色导航线。
- [ ] 接真实 WASD、鼠标/触屏、三术法、放下/留势、暂停、近身点击与对白短按钮。需要自动走近时用原 interactionPoint/act(move)，到位再向 marketAct 提交 interact；不要把点到远处NPC当作近身。
- [ ] 实际DOM对白读 state.dialogue，选择走 marketAct；阅读期间 tick 冻结。沈砚答应后视图退出对白，镜头能看到她真实移步触闩、侧让并回摊，停步原因关联当前可见来向；没有额外剧情计时器。
- [ ] 相机中心/Shift拖动与DPR按既有 display 约束接入，处理DOM松手/失焦，手机不遮住摊面/门闩。初态/暂停/重开均清按键、拖动和旧待办，避免按钮空格重复触发。
- [ ] `window.__MARKET__` 只暴露深拷贝 inspect、screenPoint、geometry；没有 act、setState、forceThreat、teleport、restore 或可改的 run 引用。观察可含白盒 preset、门/NPC、通道 transit、末见点，清楚标为调试事实。
- [ ] 独立配置使用 input=`market-whitebox.html`、outDir=`.whitebox-dist/market`，默认 vite.config/package build 不变；原 `vite.whitebox.config.ts` 当前树不存在，不假设可直接调用。
- [ ] 跑 `npx tsc --noEmit` 与 `npx vite build --config vite.market-whitebox.config.ts`；根据共享 model 导出风险运行一次 `npm run build` 证明正式入口仍能构建，不能把它称为0.7正式发布。root审查后提交/推送可运行白盒。

## Task 4: 单浏览器真实输入与设计判断

**Files:** `scripts/market-whitebox-check.mjs`、运行后 `qa/whitebox/market.json`；root 仅按实际结果更新 `design/BUILD_BRIEF_070_WHITEBOX.md`、`docs/PROGRESS.md` 与 ADVENTURE_070 的白盒状态。

- [ ] 先写脚本和语法检查 `node --check scripts/market-whitebox-check.mjs`，不得趁别人持有浏览器自行启动。脚本只通过真实DOM/键盘/鼠标/触屏操作，__MARKET__ 只观察。
- [ ] root确认唯一浏览器空闲后启动独立预览：`npx vite --host 127.0.0.1 --port 4193 --strictPort`，访问 `/market-whitebox.html`。4193若被占用，核对所属任务后换明确端口，不杀未知进程。实际执行 `GAME_URL=http://127.0.0.1:4193/market-whitebox.html node scripts/market-whitebox-check.mjs`。
- [ ] 串行桌面1440×900 DPR2与手机390×844 DPR3。至少分别完成“有信息，保持未暴露直接交换→NPC实际开门并侧让回摊→私巷→上端确认→回原口”和“无信息零灵力→公共巷→上端确认→回原口”。真实移动不暂停取景求通过，60秒条件等待只监测已请求动作，不注入下一阶段。
- [ ] 在独立新开局走 Task 2 找到的真实引敌路线：沈砚能看见才停；有资源办法与零资源脱离/退出各留结果，威胁消退自动继续。再证门开后才遇险也不重新上锁；如未完成，报告该项 FAIL/NOT_RUN，不用安静路线替代。
- [ ] 独立暂停例：对白打开时等待，模型时间/敌人/门不变；结束对白但原本手动暂停仍保持；NPC移步途中暂停、恢复后续行，不能重置到起点或瞬开门。原地重开恢复所选初态、门闭/交换未发生/通路无成果。
- [ ] 记录当前内容/规则 revision、明确 seed=N/A、实际浏览器版本、preset、输入动作/等待、NPC与敌人实际位移、门碰撞变化、穿行带与上端/返端事实、HP/MP和错误。截图最少覆盖初态、真实停步或开门、终点；可在该连续用例结束后暂停截图，并注明暂停。
- [ ] 报告初始 NOT_RUN，运行中写 RUNNING，只有覆盖项实际完成且无阻断错误才写 PASS。保留原失败报告与版本，修订重跑受影响路径及一个相邻反例；不重复生成逐点击截图，不运行整套0.6 verify冒充新风险验证。
- [ ] root按证据决定继续生产、局部改设计或否决。按已接受的审阅补充，两端当前都回同一个旧图点，只证明局部通行；生产前必须解决有效北口接点或确实可去的新地方，不能先宣称这是有用途的联络捷径。白盒通过仍不证明最终美术、正式存档/石渡连接、自然时长或趣味；不部署、不开始全图资产。更新简报实际命令/结果/限制后提交并推送白盒里程碑，再停止于设计决策边界。

## 执行记录

本文件为计划交接；当前只完成文档准备，没有实施、构建、模型运行或浏览器结果。后续按任务填写真实记录，不能复制0.6通过数或旧窑白盒报告。
