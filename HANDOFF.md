# 《仙逆：山门之外》当前交接入口

用户最新“继续，别停”，已授权自主开发/测试/每个里程碑推送/原Pages部署。不要重复询问确认、不读旧聊天/原文、不重做全书解析、不碰封版smbb/starvein。研究在docs/research。首版Goal已完成，不推断创建新Goal。不要以提交、交接或计划当停工理由。

## 当前唯一活动：0.8旧市场威胁专项复验

2026-09-12本地。活动树 `.worktrees/cliff-080-space`，分支 `feat/spar-080-whitebox`。HEAD **100d5085623d56ab18d6abbbe9d057f10c999c38** 已推送。

**R3已经FAIL/exit1**，归档qa/verify-080-r3。956模型/build、六练场路线、三视口、朝向和市场三视口PASS；market-threat实际先开门再返摊停步，脚本仍等闭门停步导致玩家站到死亡。旧PASS敌人交谈时y723，本轮y775；市场规则未改，见design/MARKET_080_THREAT_DEBUG.md。不删除closed断言、不改模型。

当前唯一浏览器：专项supervisor **1263386**，日志cache/xian-ni-qa/market-threat-080-r2.log，结束同名.exit，固定preview4204。QA改为观察敌人实际到x<540/y≤725后再正常交谈；若门先开立即前提FAIL，不等角色死亡。结果qa/evidence/market-threat-080-r2.json。专项exit0/PASS，root已目视闭门停步图，正在提交准备R4。verify顺序改为旧市场威胁优先、练场最后，仍全34命令同轮；没有跳项或复用旧PASS。后续需新冻结R4整轮。

包/lock **0.8.0**，contentVersion7/八图。游戏代码/资产/测试/包为100d508；market-threat与verify脚本有上述未提交变更。dist当前JS **index-DwjNP5Si.js**、CSS **index-DzkGuDoj.css**。固定备用preview4204 PID1257776指向cache/xian-ni-qa/spar-production-080-r7，与当前包相同；4203及更早端口是旧快照，不用其结果覆盖当前候选。

全部agents已完成并停写，没有排队等待启动的浏览器。不要看到旧句柄就重派相同任务，不要与当前专项并发浏览器。root独占源码/Git/浏览器/部署。

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

1. 先检查1263386/log/.exit，专项GREEN后提交/推送并冻结R4完整矩阵。若实际FAIL，原样归档，定位具体原因/修正，不跳过旧章或把子项PASS拼成完整通过。
2. 全34命令真正PASS后核对当前源码/dist指纹、完整退出及实际截图；QA/文档里程碑提交并推送。
3. 带上述TMPDIR运行node scripts/deploy-pages.mjs（脚本要求完整PASS+指纹一致+干净Git）。用该次真实sourceCommit运行EXPECTED_SOURCE_COMMIT=... node scripts/public-check.mjs，核公网受测字节及真实基础输入/声音/旧档/触控。
4. 公网新练场另以GAME_URL=原公网、SPAR_DEVICE=phone、SPAR_CASE=ward、SPAR_STANCE=front运行spar-production-check.mjs，真实入口到归驿/再导入。串行，不改本地通过结果伪造公网结果。
5. 完成后继续有序推进。design/NEXT_CONTENT_090_CANDIDATES.md与NEXT_CONTENT_090_RISK_REVIEW.md只是候选，C火情因初态/因果/固定点击链/山外联系不足已暂存，不批准实施、不为救案加系统；下一选题要真正服务山外去路与原创修士处境。

## Git及公网稳定版

稀疏用git add --sparse；推送 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`。每阶段及时推送、不强推、不擅换默认分支。

公网 **https://mekanuo.github.io/xian-ni-game/** 当前仍 **0.7.0**（可加?v=0.7.0）。源码371957ee9a86983f818d06dd411d0493fa627bb3、说明25757229af10a1000b78ae16156cdadd127d18ea，gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。749测试/29命令/六判据与公网29资源/输入/声音/新章入口已完整通过，见docs/RELEASE_070.md，不重做历史完成。

正式保留树为 `.worktrees/market-070-production` feat/market-070 HEAD2575722 dist有效；主树feat/return-stone-v1同HEAD但ignored dist仍旧0.5，绝不部署。默认master仍legacy。
