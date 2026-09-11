# 《仙逆：山门之外》当前交接

## 当前发行 · 0.4.1

0.4.1 重访提示修正已完成 npm run verify，exit0，243 项测试、17 条命令、六项运行时检查全部 PASS。桌面与手机实际完成历史桌案、重新分水、复位验水和归驿回访；报告 qa/evidence/canal-revisit-check.json。包 index-COg2LfF-.js，CSS index-B8Ldhq7K.css。根代理复核了当前桌面、矮窗口与 DPR3 手机旧渠截图。规则、资源与存档版本均未改。已上线并通过 public-check exit0：源码 ee17e8f0f957d76586fe3ae6a507dd5128755314，gh-pages dd82f80e3d19efd0b436b6cdb7f85dc0c59aca88；21 个资源哈希一致，输入与声音、旧档延续均通过，页面错误为空。试玩 https://mekanuo.github.io/xian-ni-game/?v=0.4.1 。

实施目录 .worktrees/revisit-041 / feat/revisit-041；下一候选 .worktrees/companion-050 / feat/companion-050 已推至 aabe351，316 项测试与构建通过，真实浏览器验证未运行。本修正已发布，继续验证 0.5，不因已通过模型测试就声称新内容已上线。

## 发行状态 · 2026-09-11

0.4.0“雾岭旧渠”已上线并核对公网：源码 f5063db5234f500f9955935a636d69db5dc23c90，gh-pages 086d63c6177c5a1f27f8aa19b0ac2885bed3d6bb。public-check exit0，21个运行资源哈希一致；桌面/手机输入、声音、旧档迁移与接信进入旧渠通过，页面错误为空。试玩 https://mekanuo.github.io/xian-ni-game/?v=0.4.0 。0.3.1 精修也已包含在内。

本轮用户授权外出约十小时期间自主有序推进、保持质量。无需重复确认日常设计、实现、测试、Git推送或既定公网部署。首版 Goal 此前已完成，本轮未创建新 Goal。已确认原创低阶修士、空间冒险与角色扮演方向，原恢复基点 bf4d922，完整设计 3e02f78。

## 工作入口

- 主目录 /home/zhangjingzhou/workspace/xian-ni-game，源码分支 feat/return-stone-v1，仓库 mekanuo/xian-ni-game。master 未改，gh-pages 只发布运行资源。
- 0.4 实施目录 .worktrees/canal-040，分支 feat/canal-040，已推里程碑 28b4826、13790ae/d6427af、205fe3c、f5063db。已快进合入主源码分支并推送。后续继续主目录，隔离目录仅保留该阶段记录，勿在两处同时改同一内容。
- 原试玩链接 https://mekanuo.github.io/xian-ni-game/ 保持不变。
- 先读本文件、AGENTS.md、docs/PROGRESS.md、Git状态；不读取旧聊天，不重做全书解析。已存资料 docs/research。/home/zhangjingzhou/smbb 与 /home/zhangjingzhou/starvein-companion-cards 永久封版。

## 当前已实现

五图、首章两路归家、三术法、长牵/留势、修器/采药/压扣/两份药囊，以及新章完整清渠事件。首章桌边安顿后接邵禾口信，从既有驿前出口选择雾岭旧渠；不要求完成生活委托。

旧渠可徒手分水零资源通关，或留势截水后实际下渠清框；可选唯一压扣承托。复位器物、亲眼验水、向邵禾说明，再步行归驿添图。同行见证只记实际在场，渠底来水预告与安全退岸按真实水路裁决。

三张新增原画、独立邵禾、石盖板/渠床、水位/水轮反馈和新地区配乐已接入。保留0.3.1姿态、贴地阴影、标签避让与手机暂停布局。首次牵物抓真实器物锚点，避免手机触点微差被窄轨拒绝；后续落点仍严格校验。

存档 schema/revision 不变，contentVersion=3；旧版外层与checkpoint严格迁移，不补发资源。UI先规范新档暂停及缓存再replace/act，不恢复旧菜单运行状态、不重复首章结局。施术起手与推板工序互斥，放下截水板立即打断清理。

## 验证证据与限制

- 最终 npm run verify exit0，236项测试、16条命令全部通过；qa/verification.json 六项PASS。最终包 index-D8kZN3eh.js / index-B8Ldhq7K.css。
- 真实新建到结局/重开：山脊、主渡；生活机械法/留势法、采叶、手机药囊与暂停读档；旧渠桌面零资源和手机不暂停留势都实际归驿并重开。qa/evidence/canal-check.json 为两法完整结果，手机退岸剩约3.1秒。
- 九张新图视口证据：1440×900 DPR2、1280×500、390×844 DPR3；qa/evidence/canal-view.json，名字锚点/避让、画布清晰度、载入冻结、实际走图均PASS，根代理已目视复核关键截图。
- 手机是Linux Chrome触屏仿真，镜头检查含Shift鼠标拖动；没有实体手机、Mac或Safari验证。特定路线余量不代表新玩家自然操作时长。压扣/药囊归属/同行缺席/来水边界另有模型测试，不冒称所有组合已实机。
- 人物仍为原画与程序动作，完整逐帧动画未完成；趣味和最终品质仍需用户试玩。0.4仅一张新增图和一个完整事件，不代表全书改编完成。

## 下一步与运行

本次源码集成、推送、deploy-pages与public-check均已完成。qa/evidence/publication.json和public-canal.png记录公开入口。后续按 design/CONTENT_ROADMAP.md 有序推进；已通过且无新问题的项目不重复开工。具体本章规格 design/ADVENTURE_040.md，美术 design/ART_CANAL_040.md，实施记录 docs/superpowers/plans/2026-09-11-canal-040.md。

本轮临时本地预览服务已关闭，公网由GitHub Pages提供，无需保持本地进程。

Node22/npm10；npm ci、npm run dev、npm run build、npm run verify。真实浏览器必须串行。长完整检查应以独立后台进程运行、保留退出码和日志，不能据中止记录宣称通过。Vitest限制tests/**/*.test.ts，防止扫描.worktrees。

Git稀疏检出，新文件用git add --sparse；推送使用既有gh credential helper，不输出凭证。deploy-pages要求PASS和clean，仅发布dist；发布后运行public-check。原文不加入新提交/构建，旧历史novel.txt未重写。__XIAN_NI__仅只读证据接口，禁止注入进度伪造通关。
