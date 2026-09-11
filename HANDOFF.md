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
