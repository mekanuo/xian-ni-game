# 《山门之外》首版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 由主线程维护共用接口、集成与里程碑提交，独立输出按AGENTS委派。

**Goal:** 按用户已确认设计交付可完整游玩、可公网访问的网页首版。

**Architecture:** TypeScript确定性世界模型唯一裁决移动、施术、人物和进度；Phaser负责场景渲染与鼠标/键盘输入，DOM负责中文界面与对话。静态资源本地打包，存档全量序列化，暂停冻结逻辑时钟。

**Tech Stack:** Phaser 3.90.0, Vite 7.3.6, TypeScript 5.9.3, Vitest 4.1.11, Playwright 1.58.2。

**Spec:** design/GAME_DESIGN.md, design/ART_DIRECTION.md, design/SOURCE_SCOPE.md, design/DELIVERY.md。

## Global Constraints

- 用户2026-09-09创建Goal，明确按已确认设计完成美术、实现、测试、公网部署；不再等待整体设计审批。
- 简中、二维斜俯视、真实空间、Mac浏览器目标；测试环境事实单列。
- 1落脚处+3外景、六处境、两背景、两心愿、三术法、两引环路数、两核心NPC、两种地理收束。
- 四格体力、六格灵力；无刷怪/现实等待/在线模型；不跨境界。
- 原文不入新提交/构建；不修改封版项目；保留Git历史。
- 行动、NPC协作、通路、归来状态实际发生；不以文字或截图假装空间验证。
- 每个完成里程碑运行相应检查、提交、推送并核验；不强推master。

## 文件与公共接口

- `src/game/contracts.ts`: Vec、Profile、Entity、GameState、GameAction、SceneDefinition等序列化合同。
- `src/game/content.ts`: 四场景实体、地理/碰撞、人物与对白内容。
- `src/game/model.ts`: `createGame(profile)`, `act(state,action)`, `tick(state,dt,input)`, `snapshot(state)`, `restore(json)`，只此模块修改游戏状态。
- `src/game/scene.ts`: Phaser场景、输入、对象绘制、预览、镜头；每逻辑帧调用tick，不另算奖励。
- `src/game/ui.ts`, `src/style.css`: 标题创建、HUD、对话、行囊、记事、存读档与设置。
- `src/game/audio.ts`: 浏览器本地合成音效和简短旋律，首次交互后启动，音量/静音可控。
- `public/art/`, `design/ASSET_LOG.md`: 原创位图资产与来源；不引用本机临时绝对路径。
- `tests/model.test.ts`: 规则、完整路径、非法动作、恢复、分支未串线。
- `scripts/verify.mjs`: 实际浏览器输入、截图、控制台、一个完整结果和重开；`qa/verification.json`记录真实结果。
- `README.md`, `build/BUILD_BRIEF.md`, `docs/PROGRESS.md`: 运行、里程碑证据、限制与交接。

### Task 1 / M1：可运行空间白盒

- [x] 定义公共合同、固定依赖、Vite入口，移除旧演示入口引用。
- [x] 先写模型用例，验证越界/耗灵力/暂停/恢复与结果读取的失败，再实现确定性模型。

```ts
const s = createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});
const before = snapshot(s);
act(s,{type:'cast',spell:'pull',targetId:'missing',point:{x:0,y:0}});
expect(snapshot(s)).toBe(before);
```

- [x] 完成地面移动、碰撞、点击寻路与镜头；暂停仍能预览并只保留一个动作。
- [x] 渲染牵线、火球投射、定向护符；灯架/药筐/试环/渡口/返驿可达。
- [x] 使用浏览器真实鼠标键盘走一段并截取变化，检查主角移动与场景对象状态，记录差距。
- [x] `npm test`、`npm run build`；检查后commit/push M1。

### Task 2 / M2：完整角色扮演与六处境

- [x] 模型提供四场景完整连通、零灵力退路、敌人感知和失败恢复；世界时间与状态快照可重放。
- [x] 对话必须读取角色在场与实际经历；同伴协作/受损/补救/拒绝实际改变站位和路线。
- [x] 两种背景、两心愿、引环试用/选择/工位换法、眺台/风铃、两种渡路与归来布置全部回收。
- [x] HUD只显示体力/灵力/当前意图与术法；其余在玩家主动打开的面板。
- [x] 保存失败提示和导出、导入版本校验、失焦暂停、对话暂停、手动重开确认。

```ts
const saved = snapshot(s);
const loaded = restore(saved);
expect(snapshot(loaded)).toBe(saved);
// 同一初态和动作序列逐步tick，终态与事件顺序必须一致。
```

- [x] 跑两条不同结果规则路径，实际浏览器完整走一条，不靠测试注入状态冒称输入完成。
- [x] 按新改动检查、commit/push M2。

### Task 3 / M3：同一切片的视听

- [x] 使用imagegen生成符合已批准方向的原创人物/场景焦点位图，在运行时去除生成图集的洋红背景；先检查少量目标资产，再制作需要的变体。
- [x] Phaser在真实场景接入资产，绘制四地点固定地标、干湿材质、连续水流和实体变化；人物可辨手势/朝向。
- [x] 降动效/高对比/字级设置；1280×720与1440×900检查中文、目标与输入区域。
- [x] 音效区分施术、阻挡、受击、落物与成功；支持静音和阻止播放时继续。
- [x] 主线程查看实际运行截图，修正遮挡、模糊或焦点问题；commit/push M3。

### Task 4 / M4：公网试玩与最终验证

- [x] 构建仅打包运行资源，检查没有小说全文、凭证或研究全文进入dist。
- [x] 选择当前仓库可用的静态托管。优先GitHub Pages独立发布分支只包含dist；若使用Sites则依其项目ID和来源合同操作，不能上传旧源小说。
- [x] `npm run verify`为一次权威入口：模型测试→构建→浏览器启动→真实输入→核心循环→结果→重开，输出qa证据。
- [x] 发布候选，匿名HTTP检查入口/资源，再对公网运行一次轻量启动与输入检查。
- [x] 独立审查变更，修正真实阻断问题并重放受影响路径；记录Mac未实测/时长非实测等限制。
- [x] 更新README、HANDOFF与PROGRESS，commit/push，核对远端与实际部署版本。
- [x] 向用户交付公网链接、操作提示、验证范围和已知限制；只有首版已完整交付才标Goal完成。

## 计划自审与执行决定

- Task1提供合同/model，Task2消费并扩充，Task3只读状态表现，Task4按相同状态可观察接口验证：无平行结果裁决。
- 初始规则测试和正式验证分开；历史演示没有批准玩法，无须为其运行测试基线或保留React。
- 使用独立实施分支 `feat/return-stone-v1`；各并行任务独占文件，主线程串行集成和Git操作。
- 美术与规则可独立生产，但最终画面以已跑通白盒机位检验；不得以画面替代操作。
- 本计划覆盖设计全部九节，具体可观察限制由QA实测回填；阶段进度写docs/PROGRESS，不因压缩上下文重新派完成任务。

- 依赖安装核对发现旧版开发工具公告，实施前固定至Vite7.3.6/Vitest4.1.11；玩法与框架选择不变。
