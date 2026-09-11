# 背墙旧窑 · 空间风险构建简报

buildStage: whitebox
buildPath: custom

本阶段交付为独立网页白盒，验证既有实时移动、视线、落地遮挡与有限施术在新地形中的取舍。正式交付仍沿用已确认《山门之外》生产质量；白盒不替代公网正式版本，也不声称已完成新章节。

必读：GAME_DESIGN.md、ADVENTURE_060.md；研究边界沿用SOURCE_SCOPE.md，不重做拆书。`experienceProfile`: hybrid，空间行动主导，人物生活和后果支撑。

必须保真：步行依实际碰撞，敌人仅据实际视线和末见位置行动；落地屏同时截住双方射线，烧毁前仍有实体；挪屏不让旧站位继续获得遮蔽；零灵力可实际通过并撤回；暂停不推进时间。借还人物、真实跨图、迁移和正式原画留待空间结论后实施，不用白盒位置读数补发游戏进度。

最小状态沿用GameState、Entity、Projectile和现有act/tick；白盒新增eastReached/returned仅根据身体抵达固定端点，不写入游戏flags。普通/零灵力按钮分别创建固定6/0灵力初态，玩家不在运行中任意补资源。新开重置整个切片，无存档导入、剧情调试开关或完成指令。规则源继承a67c479加本分支燃烧物状态保持与solid挡屏完整足迹补丁，白盒内容修订kiln-whitebox-2（北侧围墙上移40），无随机生成；无白盒save schema。

工具链：浏览器Phaser3.90.0、TypeScript5.9.3、Vite7.3.6、Node22.22.0、npm10.9.4。已有依赖从主目录node_modules解析，无需重复安装。构建 `npx tsc --noEmit && npx vite build --config vite.whitebox.config.ts`；运行 `npx vite preview --config vite.whitebox.config.ts --host 127.0.0.1 --port 4192 --strictPort` 后访问 whitebox.html；最窄模型检查 `npx vitest run tests/kiln-whitebox.test.ts`，浏览器脚本 `node scripts/kiln-whitebox-check.mjs`。本阶段不调用完整production verify来证明灰盒趣味或画面。

目标为桌面键鼠与触屏浏览器；testedRuntime当前未运行新白盒。实际验证后记录Linux Chrome和仿真视口，实体Mac/Safari/手机仍未覆盖。中文可见控件，实时Phaser二维几何，清楚标注非正式美术；只读证据接口，首撞点/站位/实际输入记录在qa/whitebox。

设计owner由根代理承担：验证前最大风险为地形过于宽松或低资源路被两敌永久堵死。先跑留屏换角度、移屏落地、施火烧毁和零灵力往返。若不成立，修墙角/敌人初始站位或缩减对手，禁止靠新系统、加伤害或偷偷改资源弥补。
