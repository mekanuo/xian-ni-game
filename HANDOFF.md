# 《仙逆：山门之外》当前交接入口

2026-09-11。用户要求“继续，别停”，授权自主开发、测试、每个里程碑推送、原Pages部署。不要等待重复确认，不读旧聊天、不重做全书解析、不碰封版smbb/starvein。研究在docs/research。首版Goal已完成，不推断创建新Goal。

## 当前工作

活动树 `.worktrees/cliff-080-space`，分支 `feat/spar-080-whitebox`，已推送HEAD be528d4。当前源码候选package已升0.8.0/content7，尚未完整发行测试。公网仍0.7.0：<https://mekanuo.github.io/xian-ni-game/>。

局部合同 design/SPAR_080_GAME_DESIGN.md、BUILD_BRIEF_SPAR_PRODUCTION.md、docs/superpowers/plans/2026-09-11-spar-production.md。自愿进入第八图驿后练场，与原创同阶散修闻朔约一手；真实换位、三来向、余弹/资源、同伴驿内实际脚点等候、归驿差集记事。不是必需主章、不刷经验。碎崖与主动火球否决不重启。

模型45文件956测试、149严格存档专项通过。cf2d2b1美术/接线已推送，be528d4正式四操作证据已推送。两张imagegen母版已采用并目视，无活动生成。后续未提交包括镜头精确中心、手机回身按钮间距、桌面纸片、QA环境/输入脚本修正及新证据。

## 最新真实验证及进程（22:25 UTC）

- R5 `qa/spar-production-2026-09-11T21-03-32-592Z/report.json` 桌面/手机各hit/ward完整四案PASS。旧固定包DIvdulfV，不覆盖之后美术镜头修正。
- 朝向指定RED `qa/spar-facing-2026-09-11T21-27-19-473Z` 与GREEN `21-29-06-445Z` 均实际东符/西行/停步输入，root并排目视。
- 修后r6固定包CLyXa97I/D5XfOxnh，preview4203 PID1244131，目录 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-production-080-r6`。tsc/build通过；后续只改脚本/包版本，当前src同该包。
- Presentation R8 `qa/spar-presentation-2026-09-11T22-10-33-393Z/report.json` 桌面/手机/矮窗口三案全部PASS，真实回身、镜头收敛、暂停冻结、收手0/1弹实际结算、归驿纸片。root已目视手机/矮窗口/纸片。先前R1–R7原FAIL保留，原因见qa/REVIEW_080_SPAR_PRODUCTION.md。
- 左侧手机ward `qa/spar-production-2026-09-11T22-20-58-171Z/report.json` 完整PASS，音乐Rms>0、block计数增加、error空，root目视左侧ready。
- **当前唯一浏览器为左右串行supervisor1248015的right阶段**。日志 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-right-r3.log`，结束同名.exit；left-r3.exit已0。先检查运行态，勿并发浏览器。
- canal_rules_040只读审查脚本，只写design/SPAR_080_FINAL_QA_REVIEW.md；其余agent已停写。root独占Git、代码、浏览器、部署。

## QA环境

/tmp为近满tmpfs，旧R3Chrome字体服务明确ENOSPC/SIGABRT。所有浏览器/部署用 `TMPDIR=/home/zhangjingzhou/.cache/xian-ni-qa/tmp`，勿删他人文件。随后仍间歇标题前Framebuffer Unsupported，完整stack在WorldScene之前，唯一原因未证实。当前用 `CHROME_PATH=本树绝对路径/scripts/chrome-qa.sh`（显式ANGLE SwiftShader GLES，仅本机QA不发行）；三視口及left已成功启动。不能声称所有环境故障根治。

长任务用独立Python supervisor/log/.exit，一次一个真实浏览器。预览均固定快照，不自动更新源码。旧4195–4202服务仍存在，不要误用。实际环境Linux Chrome150+触控/DPR模拟，不是真Mac/Safari/手机。原FAIL日志保留，不清理尾部空行以伪造全仓diff-check；仅对源码脚本检查空白。

## 紧接动作

1. 右侧结束后审阅声音/资源/截图，归档原日志，处理独立审查中的实际阻断。
2. 完成源/QA阶段提交推送。包版本已升0.8.0，保护固定历史 `qa/fixtures/return-main-v0.7.0.json` SHA6a5694a3ec238949f1eca6ea3e280a0a24ca5dcc0c912e93a5b4de1f374f4ff9；不得覆盖或改写。
3. 冻结所有src/public/tests/scripts/package，带TMPDIR+CHROME_PATH运行完整npm run verify（旧29+新5共34命令），不得跳旧章。当前qa/verification.json继承0.7，不能用于新发布。发行脚本实际检查指纹及干净Git。
4. 完整PASS后QA提交推送、node scripts/deploy-pages.mjs、公网字节/实际新入口与声音检查；再继续有序工作，不停在交接或计划。

## Git/正式旧版

稀疏检出用 `git add --sparse`；推送 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`，不强推。

0.7已完整发布：源码371957ee9a86983f818d06dd411d0493fa627bb3、说明25757229af10a1000b78ae16156cdadd127d18ea，gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。35文件749测试/29命令/六判据全部PASS，公网29资源字节和实际入口/声音/续档通过，见docs/RELEASE_070.md，不重做其历史完成。

正式保留树 `.worktrees/market-070-production` feat/market-070 HEAD2575722 dist有效；主树feat/return-stone-v1 HEAD2575722但ignored dist仍旧0.5，绝不部署。默认master仍legacy。

最新覆盖：right于22:25:07UTC完整PASS，supervisor1248015结束，无活动浏览器。左右音乐/格挡音效增量、实际资源/归驿/存档均通过；root目视ready。包0.8/旧fixture保持，独立审查已完成停写。接着提交推送并冻结完整verify。

## 最新覆盖（22:35 UTC）

1b6d0ac阶段已成功推送。完整verify R1 supervisor1249669已结束FAIL：956模型/build通过，首个桌面front走圈心无path超时；原报告/log归档qa/verify-080-r1，实际现场qa/spar-production-2026-09-11T22-27-10-754Z。旧0.7fixture未变。不能部署。

当前唯一浏览器为只读点击诊断supervisor1251280，固定4203，日志cache/xian-ni-qa/spar-front-input-debug-r1.log及.exit。假设约定后闻朔仍经过圈心，真实点击命中人物而非地面；已给production脚本加入DOM捕获只读坐标/peer状态，无改变模型。先核实证据再修QA路线，勿与之并发。0.9候选文档NEXT_CONTENT_090_CANDIDATES已由agent交付，未审核或实施，所有agent停写。

最新覆盖（22:41 UTC）：诊断R1已如期FAIL，点击peer(900,971)而非地面因果已证。QA增加等实际peer走离圈心90后再点地面，desktop/front/hit GREEN `qa/spar-production-2026-09-11T22-37-14-430Z`完整PASS/exit0，日志spar-front-input-green-r1.log。无活动浏览器/agent。准备提交推送并重启完整verify；严禁把旧FAIL verification用于部署。

## 当前运行覆盖（22:46 UTC）

修订阶段a04d4a1已成功推送。完整verify R2 supervisor1252712正在运行，日志 `/home/zhangjingzhou/.cache/xian-ni-qa/verify-080-r2.log`，结束同名.exit；自有preview4187，唯一浏览器，不得并发。45文件956测试/build再次PASS，正面desktop-hit已完整PASS，desktop-ward正在执行；其他项尚未跑。所有src/public/tests/scripts/package已冻结，除实际FAIL定位外不要改动。新0.9风险复核已交付停写，仅文档，尚未批准实施。

R2进度覆盖（22:59 UTC）：正面四案与手机左右共六条完整练场路线全部PASS，错误列表为空；三视口presentation正在跑，desktop已PASS/phone进行中。唯一浏览器仍verify-080-r2主管1252712；不得另起浏览器。实际游戏与脚本未再改，只有设计/交接文字在更新。

## 当前覆盖（2026-09-12本地00:03；UTC11日23:03）

verify R2已FAIL结束，原全报告/log在qa/verify-080-r2：956模型/build、全部六条练场路线、三视口presentation及facing均PASS；进入market-view前ENOENT历史输入，未启动该浏览器。不是游戏规则失败。两份15:13/15:48旧market-west-entry.json为HEAD已跟踪但稀疏检出未包括，已用sparse-checkout add精确恢复且与git show HEAD字节一致，content6/SHA4b17256c...与1f0f5adc...。该操作会收起不在pattern内的已提交旧QA目录，Git历史仍完整，勿称删除证据。未提交本轮目录仍存在。

scripts/verify.mjs只加这两个历史输入的开测前存在检查。当前唯一浏览器market-view恢复复验supervisor1256487，固定4203，日志cache/xian-ni-qa/market-view-080-restored-r1.log及.exit。完成后收束源码/QA提交推送，冻结重新完整verify；已通过R2子项不得冒称完整发行PASS。

最新覆盖（UTC23:12）：短窗暂停牌实际遮头身已RED（23-07-43）/GREEN（23-11-14），root目视修后左侧提示与完整人物。新r7固定preview4204 PID1257776，cache/spar-production-080-r7，JS DwjNP5Si/CSS DzkGuDoj，buildPASS。唯一QA supervisor1257777已完成short GREEN，当前market-view恢复复验r2，日志cache/xian-ni-qa/market-view-080-restored-r2.log及.exit，三个视口。market旧r1 FAIL为开门20秒墙钟仅1.2667模拟秒，门在最终采样已真实开；当前只改观察90秒和记录，不改模型。所有agent停写。接着待market专项结束，提交/推送并冻结完整verify R3；勿误用4203旧暂停CSS。

最新覆盖（UTC23:14）：supervisor1257777已结束，短窗遮挡GREEN及market-view三视口GREEN均PASS，无浏览器活动。market-view报告23-11-34（idle/walking/open，waiting不属此项）。root准备提交推送这一批证据和局部CSS/QA输入前置/观察时限，再启动完整verify R3；新运行包为4204的DwjNP5Si/DzkGuDoj。
