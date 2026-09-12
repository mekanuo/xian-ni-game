# 0.8 R4：同行准备阶段手机点击偏离的只读定位

2026-09-12。只读审查 `qa/evidence/journey-check.json` 的原 R4 失败、`journey-check.mjs` 的输入准备，以及 scene 的切图／镜头／指针代码；对照 `market-check.mjs` 的 `preparedTap`。没有运行浏览器、模型、测试、构建或 Git，没有修改实现或脚本。根代理正在独立采集真实指针证据；其新增诊断日志不能倒填为原 R4 已有证据。

**当前最强假设：模型已切到溪道，取屏幕坐标时相机仍处于驿前旧视域或切图刷新中；实际触摸到达时镜头已切换，原 CSS 坐标落成溪道西侧普通地面。** 这是需要实机证伪的时序假设，不是已定位根因。现有报告没有记录当时 CSS 坐标、实际 Phaser 世界点和渲染场景，不能据此宣布镜头、DPR 或寻路故障已经确证。

## 原失败能确认的事实

| 记录 | 实际内容 |
| --- | --- |
| 桌面路线 | 本报告 `desktop.status=PASS`，手机在 `prepare` 内失败；尚未进入手机连续领路 |
| 前一选择 | `canal:depart:creek`，`wallMs=126786` |
| 下一交互意图 | `to_workshop`，模型场景 `creek`，目标世界坐标 `(1640,370)`，`wallMs=127411`；两条日志相隔 625ms |
| 下一交互的镜头操作 | 两条日志之间及此后没有 `camera-shift-drag`；不等于画面已经正确或手动镜头已归位 |
| 失败 | `page.waitForFunction` 等待 60000ms 超时，`errors=[]` 仅表示现有 pageerror 监听未记录异常 |
| 最终玩家 | 溪道 `(298.6524483090405,372.8145824748909)`，HP4／MP0，path 空，paused=false，dialogue=null，defeated=false |
| 任务状态 | journey active，但 run=null；没有开启领路，不能归因于许照领路 AI |
| 最后场景事件 | `雨后溪道`，模拟时间 `214.0333333333958`；失败模拟时间 `266.6333333334195` |

超时前约 52.6 模拟秒已经过去，不能把整段等待描述为游戏一直冻结。最终 path 空也不能单独证明寻路失败：错误地面点击正常走完，同样会留下空 path。当前证据既没留下点击后的初始 path，也没有最终目标 ID。

## 代码中的具体时间窗口

### 1. `prepare` 等待的是模型场景，不是新场景已画出

原失败脚本 `prepare` 的顺序为：`interact(to_creek)` → `choose(canal:depart:creek)` → 等待 `inspect().scene==='creek'` → `interact(to_workshop)`。

- `model.ts` 的 `choose(canal:depart:creek)` 同步调用 `changeScene`，把 `s.scene` 改成 creek，把玩家放到 `(170,760)`，清路径与待办。
- `scene.ts` 的 `dispatch` 普通 choose 不立即执行 `refreshScene`；`refreshScene` 在后续 `update` 看到 `renderedScene!==state.scene` 才发生。
- `refreshScene` 才按新图设置相机 bounds／zoom、重画场景与实体、设置 soundscape 场景并 `center()`。`center()` 清手动镜头状态并将相机移回新玩家位置。

因此 `inspect().scene==='creek'` 可先于实体、音景与镜头切换成立。625ms 是两次脚本日志的墙钟差，不是已观测到多少个一致的新场景渲染帧；不能凭这段时间排除此窗口，也不能据此断言一定发生了它。

### 2. `frame` 的“在 canvas 内”不是“目标在当前画面上”

原 `journey-check.mjs` 的 `frame` 读取 `screenPoint(x,y)`，只检验该 CSS 点在视口范围内且 `elementFromPoint` 是 CANVAS；满足即返回，没有记录返回点或重新核对目标的实际呈现。`worldTap` 随后直接触摸这个已取样的坐标。

`screenPoint` 从 camera 的 `getWorldPoint(0,0)`、当前 zoom 和 density 反算 CSS 点。Phaser 本地实现的 `getWorldPoint` 同时读取相机矩阵和当时 scroll／zoom；它并不验证这些状态已经对应本次新地图。若镜头仍在驿前东侧，世界 x1640 可能正在手机屏内；同一个数字恰好也是溪道工棚出口 x 坐标。此时 DOM 检查通过完全合理，但语义是错的。

触摸真正到达 `pointerDown` 时，游戏读取的是该事件的 `p.worldX/p.worldY`，再做 `entityAt`；没有命中实体就提交普通 `move`。如果相机在取样与事件之间归位，玩家便会走向旧 CSS 点在新视域中的地面位置。

最终 x 与目标差约 1341 世界单位，y 只差约 2.8。这个量级更值得先查横向切图／手动视域重置，而不是先给角色碰撞半径或触控容差加几十像素。只是量级判断，不能反推缺失的原 tap 坐标。

### 3. 普通镜头跟随也会使取样过期，暂停模型不自动证明镜头稳定

`scene.ts` 的非 spar 自动跟随分支在 `!cameraManual` 时持续插值 scroll，没有 paused／dialogue 的停止条件。spar 的专用暂停冻结修正不会自动作用于溪道。`inspect` 完全不变时，相机仍可能收敛到玩家位置。

这提供第二种可能：新场景已刷新，但 `frame` 取样后，相机仍在归位或跟随。必须比较取样时与实际事件时相机／投影，不能把所有偏差统称为 DPR，也不能仅加一次 pause 断言就认定修复。

本次同为 home／creek 手机视口，正常 worldScale 均为 .85；单纯“旧 preRender 矩阵”不足以自动解释全部巨大 x 位移。优先观测模型／渲染场景脱节和 scroll 变化，再判断是否还有矩阵更新时间问题。

## 与已通过市场输入方式的差别

`market-check.mjs` 的 `preparedTap` 在手机上先 pause，确认无对白／未败退，随后 frame 并断言完整 inspect 不变，再 resume 后 tap。手机相机拖动也改用真实看路按钮＋单指拖动。journey 的准备阶段则先 resume，再直接 frame／tap，始终没有模型暂停或渲染一致性的观察。

市场流程提供一个有用对照：准备操作多出一次真实 UI 周期，也避免玩家在构图时继续走路；因此可能避开此窗口。**它不是已经证明安全的原子投影方案**：仍在恢复前取 CSS 点，恢复后触摸，且 inspect 不包含相机。市场历史通过不能排除同类时序风险，也不能作为盲复制后不必复查的理由。

本失败的 to_workshop 前没有实际拖镜头，故鼠标 Shift 与触控混用不是该次点击的直接已知触发；前一张图的手动视域是否直到新图 refresh 才清掉，仍值得记录。

## 根代理最需要采集的字段

采集以正常点击、只读观察为限，不注入玩家状态，不用更改物理坐标证明脚本成功。保存源包／脚本指纹，原 R4 报告保留。

| 时点 | 字段 | 用来区分什么 |
| --- | --- | --- |
| 选择离驿前后 | 模型 scene/time/player/path/paused/dialogue；presentation 的实际实体 ID／标签；audio.scene；camera view/zoom/density；若已有只读渠道则 renderedScene | 是仅模型先切，还是实体／镜头也已切；audio／实体只能作旁证，不能单独代替矩阵一致性 |
| `frame` 取样时 | intended 世界点、返回 CSS 点、该 CSS 点的 DOM 元素；同一次 evaluate 读取当前 camera、scene 与目标呈现 | 把“意图日志”补成真正投影记录，避免多次 evaluate 中间发生更新 |
| 真实 pointerdown／touchstart 时 | clientX/Y、pointerType、shift/buttons、DOM target；当时相机与模型；真实 Phaser p.x/y/worldX/worldY／接收相机（若可观察） | CSS 到画布、画布到世界哪一层发生偏移；是否进入 pan／blocked／dialogue 分支 |
| 事件后一个实际更新 | 玩家 path 首末点、queuedInteract 或对应通知／可观测事件、玩家位置／场景 | 是点中了普通地面、误选另一个实体、正确选出口但寻路拒绝，还是根本未被消费 |
| 再后一个渲染时点 | 同一世界点的 screenPoint、camera、实际截图 | 投影是否在事件前后跳变；截图要包括目标区域或明确标出目标已在屏外 |

特别注意：DOM 捕获监听里用 `screenPoint(0,0)` 与 `screenPoint(1,0)` 反算出的 world 是**同一只读投影的逆算值**，不是独立取得的 Phaser `p.worldX/Y`。它能证明投影在两个 DOM 时刻间变化，却不能单独证明 Phaser 实际使用了这个世界点；需要与事件后 path／交互结果、必要时真正的 Phaser 只读观测互相印证。DOM 捕获早于游戏输入处理，两个时点也要标清。

## 怎样据结果收束，而不提前改游戏

- 若取样时 scene=creek，但实际渲染实体／音景还在 home，随后投影跳到溪道：优先定位准备阶段缺少新场景呈现就绪条件；不能改出口、出生点或寻路来迎合过期坐标。
- 若始终已呈现 creek，但相机取样与事件间变化，且事件后 path 对应新的反投影：属于活动镜头下旧 CSS 坐标失效；再决定准备阶段如何稳定并重新核对实际输入。此结论不授权在连续领路主案中偷偷加暂停。
- 若镜头稳定而实际 Phaser 世界点与 CSS／density 换算不一致：再查真实 canvas 尺寸、CSS 尺寸和输入变换；目前不足以指认 DPR。
- 若事件实际世界点命中 to_workshop 且已经提交正确交互／路径：转查路径被取消、替换或交互失效的实际原因，不继续用“镜头问题”解释所有失败。

只读诊断到此。当前可以确定的是原报告缺少关键输入证据，脚本的模型场景等待与 canvas 命中检查不能保证新图目标投影有效；具体触发仍以根代理接下来的真实 DOM／Phaser／路径证据为准。
