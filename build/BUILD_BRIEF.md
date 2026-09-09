# 《山门之外》构建合同

- buildStage: whitebox
- buildPath: custom
- targetFinish: 一段可完整游玩、视听与角色反应统一的网页冒险
- experienceProfile: hybrid
- 设计已由用户2026-09-09创建Goal明确批准；阅读design/GAME_DESIGN.md及ART_DIRECTION.md。
- 目标：简中二维斜俯视静态网页，Mac Chrome/Safari键鼠/触控板，1280×720及以上横屏。
- 核心：真实移动、牵物、火焰球、定向护符、人物同行；引环long/hold新用法、四场景六处境、两种物理路线及归来回响。
- 状态唯一由src/game/model.ts裁决；输入/效果不越权改旗标；NPC只能回读见证经历。
- contentRevision: return-stone-v1；rulesRevision: 1；saveSchemaVersion: 1；seed: N/A（逻辑确定，装饰随机不进存档）。
- snapshot保存世界；事件记录帮助定位；失败恢复和重开按设计，不以读档解释原作复活。
- 验证两条代表路径：药铺/长牵/共同登台/交涉修闸/返驿；修器/留势/补救药筐/山脊/返驿。相邻反例为独行不冒称同登台、未开闸不判修路。
- 排除：联网账号、自由聊天、挂机等待、全书大地图、境界速升、继承王林专属功绩；原文不打包。
- install: npm ci；buildOrExport: npm run build；start: npm run dev -- --host 0.0.0.0；modelCheck: npm test；verify: 白盒阶段未适用，正式阶段npm run verify。
- engine: Phaser 3.90.0；runtime: Node22.22.0；packageManager: npm10.9.4；testedRuntime: Linux 6.6 / Chrome 150 headless / Playwright 1.58.2，1440×900。
- 当前限制：M1真实渲染、移动/牵灯/暂停输入已验证，模型22项通过；完整浏览器通关与正式美术尚未验证；Mac目标尚未实测；时长为设计目标，趣味须真人反馈。
