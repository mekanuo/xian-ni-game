# 《仙逆：山门之外》当前交接入口

用户最新“继续，别停”，已授权自主开发/测试/每个里程碑推送/原Pages部署。不要重复询问确认、不读旧聊天/原文、不重做全书解析、不碰封版smbb/starvein。研究在docs/research。首版Goal已完成，不推断创建新Goal。不要以提交、交接或计划当停工理由。

## 当前唯一活动：0.8手机同行输入诊断

2026-09-12本地。活动树 `.worktrees/cliff-080-space`，分支 `feat/spar-080-whitebox`。HEAD **c671ca29bd9dbf235749027d86c27b2afaedf857** 已推送。

**R3已经FAIL/exit1**，归档qa/verify-080-r3。956模型/build、六练场路线、三视口、朝向和市场三视口PASS；market-threat实际先开门再返摊停步，脚本仍等闭门停步导致玩家站到死亡。旧PASS敌人交谈时y723，本轮y775；市场规则未改，见design/MARKET_080_THREAT_DEBUG.md。不删除closed断言、不改模型。

**R4已结束FAIL/exit1**，归档qa/verify-080-r4。956/build、所有市场威胁/三视口/败退恢复、桌面与手机完整往返PASS；journey桌面完整/独立暂停保存PASS，手机prepare从home到creek后点工棚出口超时。失败state玩家298.652/372.815、HP4MP0/path空/无暂停对白，意图却1640370，疑似换图后旧镜头投影。原文件与脚本在qa/journey-input-r4。

当前唯一浏览器属于 **supervisor1272417**，串行先entry短验再phone完整。日志cache/xian-ni-qa/journey-entry-080-r2.log/.exit，然后journey-input-080-r2.log/.exit；GAME_URL固定4204。第一项FAIL不会启动第二项。不得并发浏览器。

手机诊断1271274已exit0/PASS（只是加入记录改变时序，不称已修）；已归档qa/journey-input-diagnostic-r1。短验1272024已exit0/PASS且捕获实际click后模型/渲染脱节：creek模型、home音景、tao/xu实体、camera x1341；出口CSS254.5/223.95。归档qa/journey-entry-r1。这直接证明瞬时脱节存在，但原R4未采事件坐标，不能冒称独立取得Phaser p.worldX。

修正脚本sceneReady在每页首次、换图、导入后等实际音景/实体对应当前scene，再跨两个真实rAF更新相机矩阵，然后取坐标；不暂停连续领路、不改游戏。当前journey/verify脚本未提交。新增entry-only输出独立，完整verify强制JOURNEY_PHASE complete/ROUTE all/FIXTURE默认，顺序先旧同行/旧章、市场后、练场最后，仍34命令。

R4冻结c671ca2已成功推送；dist仍DwjNP5Si/DzkGuDoj同代码。完整verify不再运行，qa/verification.json为FAIL，当前不得部署。下一步定位手机输入，专项关闭后安排新的同候选全34命令；不能拼接R4子项充当整版PASS。

此前专项1263386已exit0/PASS，2026-09-11T23-45-29-811Z，qa/evidence/market-threat-080-r2.json；root目视闭门停步截图。敌人实际到x510.286/y723.378后正常交谈，NPC514.567/397.827闭门waiting；玩家实际退开后NPC继续leading，HP4/MP5、敌HP3保留、errors空。规则未改，不删除closed断言。

包/lock **0.8.0**，contentVersion7/八图。游戏输入保持c671ca2；上述journey诊断脚本已修改，完整冻结需下一轮。dist当前JS **index-DwjNP5Si.js**、CSS **index-DzkGuDoj.css**。固定备用preview4204 PID1257776指向cache/xian-ni-qa/spar-production-080-r7，与当前包相同；4203及更早端口是旧快照，不用其结果覆盖当前候选。

canal_rules_040已完成前置输入审查并停写：design/VERIFY_080_INPUT_PREFLIGHT_REVIEW.md，其他固定输入齐全；canal_art_040已完成design/OUTBOUND_090_PLAYER_PROMISE.md并停写，指出环网外实际目的地实践仍缺；全部agents当前停写，无浏览器权限。不要看到旧句柄就重派相同任务，不要与当前专项并发浏览器。root独占源码/Git/浏览器/部署。

## 当前内容与已有证据

局部合同 design/SPAR_080_GAME_DESIGN.md、BUILD_BRIEF_SPAR_PRODUCTION.md、docs/superpowers/plans/2026-09-11-spar-production.md。不覆盖已批准全游戏设计。自愿进入驿后练场，与原创同阶散修闻朔约一手，真实换位/三来向/余弹结清/实际资源；许照明确留在驿内原脚点等候，归来不自动重聚；桌边记录真实事实去重。非必需主章、不刷经验、不补资源、不授王林专属能力。碎崖/主动火球否决不重启。

45文件956模型（含149严格存档专项）；原样v6外层与独立checkpoint迁移、定位/起手/余弹保存、特殊败退按旧完整资源点恢复均有证据。异常HP1注入边界只称模型合成，不冒称合法一手会死。两张imagegen母版已完成采用，无活动生成。

完整源头与FAIL/修正见qa/REVIEW_080_SPAR_PRODUCTION.md。R3当前实际报告：
- qa/spar-production-2026-09-11T23-16-38-685Z：桌面/手机×front hit/ward四案PASS。
- 左qa/spar-production-2026-09-11T23-27-43-070Z、右23-29-43-531Z：手机ward各完整PASS。
- qa/spar-presentation-2026-09-11T23-31-45-729Z：桌面/手机/矮窗口全PASS；qa/spar-facing-2026-09-11T23-33-25-370Z PASS。
- 这些属于最终FAIL的R3子项，不能冒称34命令或正式发行已PASS。

## 已关闭的前置问题，不重做

- R1完整verify（qa/verify-080-r1）956/build通过，点圈心无path FAIL。实际DOM捕获复现peer(900,971)盖住点(900,940)，正确选中人物而非地面。QA现等真实peer走离90再点地面，不改游戏规则/位置；desktop完整GREEN在qa/spar-production-2026-09-11T22-37-14-430Z（详见review）。
- R2完整verify（qa/verify-080-r2）所有练场新项PASS，market-view前缺少稀疏检出未包括的已提交历史输入，整体FAIL。精确恢复两份原文件并比对HEAD字节；verify现开测前检查存在。恢复已加入当前稀疏配置：
  - qa/evidence/market-2026-09-11T15-13-29-584Z/market-west-entry.json，content6，SHA4b17256c1392208760c01c9fb392d2db907e6f26ef1786874e49296132789a89。
  - qa/evidence/market-2026-09-11T15-48-58-773Z/market-west-entry.json，content6，SHA1f0f5adc4d781ec048a086c8d73327cc0141a4063f3fbf6b03a352f5a0d983d4。
- 稀疏add会收起pattern外的已提交QA目录，Git历史完整；不是删除证据。不要为查看旧报告重跑测试。
- 原固定qa/fixtures/return-main-v0.7.0.json（content6）SHA6a5694a3ec238949f1eca6ea3e280a0a24ca5dcc0c912e93a5b4de1f374f4ff9，未改。包已升0.8，main-route新导出不会覆盖旧源。
- root截图发现短窗中央暂停牌盖闻朔头身，23:07指定RED→23:11同输入GREEN。CSS仅短桌面练场将暂停牌移左资源栏下，root目视；R3三视口包含新控件遮挡检查。
- market-view恢复后23:03独立run超时：20秒墙钟仅1.2667模拟秒，最终实际门/事件/checkpoint都已开；不是waiting姿态测试。仅物理开门观察延至90秒并记录前后实际位置/时间，不改模型速度/条件。23:11:34三视口独立GREEN。见design/MARKET_080_VIEW_DEBUG.md。
- 所有原FAIL保留；不删原日志尾空行或宣称全仓diff-check干净，源码/脚本检查可单独运行。

## QA环境与进程习惯

/tmp近满tmpfs；旧Chrome字体服务明确ENOSPC/SIGABRT，所有QA/部署用 **TMPDIR=/home/zhangjingzhou/.cache/xian-ni-qa/tmp**，勿删他人文件。之后仍有偶发标题前Framebuffer Unsupported，唯一根因未证实。当前 **CHROME_PATH=本树绝对路径/scripts/chrome-qa.sh** 用显式ANGLE SwiftShader GLES，仅本机QA、不发行；后续多轮已正常启动，不声称所有驱动故障根治。

实际环境Linux Chrome150 + DPR/触控模拟，不是真Mac/Safari/手机，不把调度音效计数说成扬声器录音或主观听感通过。长任务使用独立Python supervisor/log/.exit，一次一个浏览器，等待单次不超过60秒并保持中文进展更新。

## R3之后必须继续

1. 先检查1272417及两段log/.exit，关闭手机同行输入问题后再冻结完整矩阵。若实际FAIL，原样归档，定位具体原因/修正，不跳过旧章或把子项PASS拼成完整通过。
2. 全34命令真正PASS后核对当前源码/dist指纹、完整退出及实际截图；QA/文档里程碑提交并推送。
3. 带上述TMPDIR运行node scripts/deploy-pages.mjs（脚本要求完整PASS+指纹一致+干净Git）。用该次真实sourceCommit运行EXPECTED_SOURCE_COMMIT=... node scripts/public-check.mjs，核公网受测字节及真实基础输入/声音/旧档/触控。
4. 公网新练场另以GAME_URL=原公网、SPAR_DEVICE=phone、SPAR_CASE=ward、SPAR_STANCE=front运行spar-production-check.mjs，真实入口到归驿/再导入。串行，不改本地通过结果伪造公网结果。
5. 完成后继续有序推进。design/NEXT_CONTENT_090_CANDIDATES.md与NEXT_CONTENT_090_RISK_REVIEW.md只是候选，C火情因初态/因果/固定点击链/山外联系不足已暂存，不批准实施、不为救案加系统；下一选题要真正服务山外去路与原创修士处境。

## Git及公网稳定版

稀疏用git add --sparse；推送 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`。每阶段及时推送、不强推、不擅换默认分支。

公网 **https://mekanuo.github.io/xian-ni-game/** 当前仍 **0.7.0**（可加?v=0.7.0）。源码371957ee9a86983f818d06dd411d0493fa627bb3、说明25757229af10a1000b78ae16156cdadd127d18ea，gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。749测试/29命令/六判据与公网29资源/输入/声音/新章入口已完整通过，见docs/RELEASE_070.md，不重做历史完成。

正式保留树为 `.worktrees/market-070-production` feat/market-070 HEAD2575722 dist有效；主树feat/return-stone-v1同HEAD但ignored dist仍旧0.5，绝不部署。默认master仍legacy。

## 并行空间先验（不改变0.8冻结包）

独立 `.worktrees/outbound-090-layout` / feat/outbound-090-layout，基点c671ca2，诊断提交94740f4已推送，余弹补查253e079推送中。只有该树新增几何测量模块/测试；0.8本树src/tests/scripts diff为空。基线956测试PASS，专项R2六测量合同PASS、tsc exit0；实际普通/零MP直达与真实观察敌人casting后等待1秒再走均HP4往返。当前两岩背布局不进入友方实现，见该树design/OUTBOUND_090_LAYOUT_RESULT.md。全部是合成规则层先验，没有额外浏览器/生产存档/正式艺术或0.9发布。

本树新文档OUTBOUND_090_SHARED_CROSSING_REVIEW修正过严目的地门槛：探索、具体发现和静景可以构成目的地收益，不必另造可重复谜题。短暂同阶协作概念有条件保留，但当前几何未证明一发用途。canal_rules_040当前只写design/OUTBOUND_090_LAYOUT_REVIEW.md，倾向暂缓该布局而不纸面加难。0.8完整R4仍优先，当前已过956/build、市场威胁/三视口/两种败退恢复及桌面完整往返，手机完整往返运行中；不能称全34命令已通过。

空间R3六项测量/tsc通过，返端后2秒四案HP4、先前余弹全部自然结清，敌仍casting，不称永久安全。该树所有实现/测试暂停，无浏览器。0.8本树所有agents已停写。

最新活动：canal_art_040只写design/JOURNEY_080_INPUT_DEBUG.md；其余agents停写。空间先验253e079已成功推送，无模型/浏览器进程。

canal_art_040当前仅审阅脚本改动，独占design/JOURNEY_080_RENDER_FIX_REVIEW.md；其他agents停写。源码/美术无新改动，不造0.9生产。

1272417两段已exit0/PASS：entry短验和phone完整（00:28:39结束），归档qa/journey-render-green-r2。审查建议的诊断失败图按phase分名已处理；pointer逆算字段改为projectedWorld并明确非Phaser内部独立值。正在提交/推送准备R5，当前无浏览器。所有agents停写。
