# 《仙逆：山门之外》当前交接

## 当前开发分支 · 0.5 同行回程候选

本目录为 `.worktrees/companion-050` / `feat/companion-050`，基于0.4.1源码里程碑d7e6a36。用户要求持续自主推进。已选 `design/COMPANION_050.md`，实施计划与美术稿分别为 `COMPANION_050_IMPLEMENTATION.md`、`ART_COMPANION_050.md`；直接继续实现与验证，无待用户批准事项。

新增许照工棚领路、北路与南探折返、真实双方经过、单人先走、雨棚坐垫及归家补笔。contentVersion4，旧1/2/3外层与checkpoint迁移；新约定不补发历史成果。新规则/存档/表现已接入，316项测试/20文件与构建PASS，8项模型闭环/处境边界已证实；已实测桌面北路完整归来及手机独立PASS，双方迈步暂停档新页面恢复PASS；三视口12处截图已PASS，完整发行回归因射弹遮挡缺陷主动中止，正修复验证，未发布本候选。`qa/verification.json` NOT_RUN不得当成通过。另已修复DOM按钮上松开镜头拖动导致下一点击错位，camera-drag-check在DPR1/2/3通过；新包index-BEPc4gec.js。

0.4.1已完成17条发行检查与公网核验，源码ee17e8f、gh-pages dd82f80，21资源哈希一致，页面错误为空。公开入口 https://mekanuo.github.io/xian-ni-game/?v=0.4.1 。本分支已合入发行证据，当前0.5完整verify已主动中止（143），PID1086289及子进程已关闭。射弹连续碰撞修复相关71测试和构建index-BJE6H6II.js通过，实际施火撞板检查运行中（/tmp/xian-ni-050-projectile.log，退出码同名.exit）；临时4191预览PID1090638。完成该检查后重新运行完整verify，旧中止报告不可发行；浏览器必须串行。

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
