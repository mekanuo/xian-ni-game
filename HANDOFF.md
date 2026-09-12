# 最新：旧窑burn专项PASS，准备冻结完整R6

supervisor1278891已exit0，qa/evidence/kiln-burn-080-r1.json PASS/errors空；归档qa/kiln-burn-green-r1。自然烧尽185382ms推进11.8667模拟秒，HP4MP3保存恢复/重入/重开通过。源码仅kiln-check.mjs等待延长，不改游戏。当前无浏览器，下一步提交推送本阶段再启动全34命令verify R6，沿用专用TMPDIR/chrome-qa.sh。所有agents停止。0.9小样另树73c05fd（推送session2680待确认），浏览器脚本已写但未运行，优先0.8发行。下列R5历史保留，不重复已经通过的专项。

---

# 最新覆盖入口：R5整版FAIL，旧窑燃烧专项复验进行中

2026-09-12。原用户“继续，别停”，持续自主开发。0.8 HEAD e4c4887已推送，当前仅QA脚本kiln-check.mjs自然烧尽观察300秒替代60秒，游戏代码/包/dist未改。R5 supervisor1273713已退出1；qa/verify-080-r5保留原FAIL。前6命令PASS，第7 kiln-consequences burning→burned超时：60墙钟秒只走约3.77模拟秒，屏仍burning剩8秒，非火球未命中。详见design/KILN_080_BURN_WAIT_DEBUG.md。

**当前唯一浏览器supervisor1278891**，cache/xian-ni-qa/kiln-burn-080-r1.log/.exit；GAME_URL固定4204，KILN_ROUTE consequences / CASE burn / OUTPUT qa/evidence/kiln-burn-080-r1.json。从原固定旧档实际借/移/火球/自然烧尽/导出导入/离图重入。结果未预填，不另开浏览器。

若专项通过，提交推送修正，再冻结全34项R6；0.8仍未部署，公网0.7。后续发布步骤见下文。仅源码/脚本diff-check，不改原日志尾空格。所有浏览器用专用TMPDIR与chrome-qa.sh。

另树outbound-090-layout新里程碑**fb8dd79已推送**：出山看水独立Phaser小样，9模型测试/tsc/独立cache构建PASS，尚无浏览器。该树HANDOFF与OUTBOUND_090_DISCOVERY_WHITEBOX.md给精确入口，renderer手机临水构图和场景发现还待实际检查；坐姿美术未制作。不与0.8合并/部署，不重开已搁置两岩背战斗。所有agents已停止。先处理本0.8专项，不抢浏览器做小样。

---

# 《仙逆：山门之外》当前交接入口

用户最新“继续，别停”，已授权持续自主开发/测试/每阶段推送/原Pages部署。不要重复询问确认、不读旧聊天/原文、不重做全书解析、不碰封版smbb/starvein。研究在docs/research。首版Goal已完成，不推断创建新Goal。不以提交、交接或计划作为停工理由。

## 当前唯一活动：0.8完整验收R5

活动树 `.worktrees/cliff-080-space`，分支 **feat/spar-080-whitebox**，HEAD **e4c4887207560411a50430181fe1712ccbd7f4ef**。已提交并成功推送（session57940退出0，远端c671ca2→e4c4887）。

**R5 supervisor1273713正在运行，独占浏览器。** 日志 `/home/zhangjingzhou/.cache/xian-ni-qa/verify-080-r5.log`，结束同名.exit；自有preview4187。源码/资产/测试/脚本/包全部冻结e4c4887，只有非运行文档可改。顺序为模型/build→旧同行/旧窑/输入/首章/生活/旧渠→市场→练场；仍全34命令，不能拼接旧PASS。当前qa/verification.json须等最终PASS，未完成前不得部署。

包/lock **0.8.0**，contentVersion7/八图。游戏代码/美术自100d508后未改，当前dist JS **index-DwjNP5Si.js**、CSS **index-DzkGuDoj.css**。备用固定preview4204 PID1257776指向cache/xian-ni-qa/spar-production-080-r7，同游戏包；4203及更早为旧快照。没有其他浏览器/排队任务，所有agents已停写。

## 当前制作范围

局部设计 design/SPAR_080_GAME_DESIGN.md、BUILD_BRIEF_SPAR_PRODUCTION.md、docs/superpowers/plans/2026-09-11-spar-production.md；不覆盖全游戏已批准GAME_DESIGN/ART_DIRECTION。

首章归来后自愿进入驿后练场，与原创同阶闻朔约一手。三来向真实换位/绕行/让步，真实一源来袭、余弹结清、实际HP/MP；可收手/闪避/护符，无XP、刷分或资源补发。许照明确约定后留驿原位，归来不自动再同行；桌边报告已发生事实去重。不是必做主章，不授王林专属能力。主动火球/碎崖否决不重启。

45文件956模型（149严格存档专项）已多轮PASS；原样v6外层与独立checkpoint迁移、定位/起手/余弹保存、异常旧完整资源点恢复有证据。异常HP1合成边界不冒称合法HP≥2一发会死。两张imagegen母版已采用，无活动生成。美术/朝向/镜头/短窗暂停牌/桌边纸片/手机双排操作反馈已有指定修正与实际截图；详见qa/REVIEW_080_SPAR_PRODUCTION.md。

## 完整回归历史与本次修正

全部原FAIL保留；不要重做已关闭调查或删除日志尾空格。

- **R1** qa/verify-080-r1：点圈心时同阶人物尚在900971盖住900940，脚本误当空地。实际DOM捕获确认正确选中了人物；改等peer真实走离90再点地面，不改模型。专项22:37完整GREEN，a04d4a1已推送。
- **R2** qa/verify-080-r2：六练场路线/三视口/朝向PASS；旧市场缺稀疏未取出的历史入口，开浏览器前中止。两个原文件已从HEAD逐字节恢复，verify开头先检查。market-view后续独立20秒超时只推进1.2667模拟秒，门实际已开；把物理开门观察延至90秒，不改速度/状态，三视口GREEN。root发现短桌面暂停牌盖闻朔头身，指定RED→CSS仅该视口移左→GREEN目视。100d508已推送。
- **R3** qa/verify-080-r3：全部练场与市场三视口PASS；旧市场威胁场景成交时敌人比旧PASS远52单位，沈砚先开门再返摊waiting，脚本等closed直到玩家死亡。改观察敌人实际x<540/y≤725再交谈；门若提前开立即前提FAIL，不删除closed。专项23:45:29 PASS，HP4MP5/敌HP3、闭门waiting→实际退开后leading；root目视，c671ca2已推送。
- **R4** qa/verify-080-r4：956/build、所有市场威胁/三视口/两种败退恢复/桌面与手机完整往返PASS；journey桌面完整与独立暂停保存PASS，手机home→creek后点工棚出口超时。原state在298.652/372.815、HP4MP0/path空/无暂停对白，意图1640/370；原图/脚本在qa/journey-input-r4。
- 手机加DOM观测诊断全程PASS只是改变时序，不能当修复，归档qa/journey-input-diagnostic-r1。**entry-r1真实click后捕获**：模型creek、音景home、实体tao/xu、camera x1341、出口CSS254.5/223.95，证明模型/呈现瞬时脱节。原R4无事件点，不能冒认同一次重现或独立Phaser worldX。
- **本次sceneReady修正**：每页首次/换图/导入后等音景和实际实体对应当前scene，再跨两个真实rAF使相机更新，才取目标屏幕点。不暂停连续领路、不清游戏状态。entry+phone完整串行1272417两段exit0/PASS，归档qa/journey-render-green-r2（全手机00:28:39结束）；领路/归驿/重开/独立暂停存档齐全。独立审阅design/JOURNEY_080_RENDER_FIX_REVIEW.md。随后仅隔离entry/pause失败图与明确projectedWorld命名，成功路径不变。
- entry-only报告独立，不顶替全程；verify显式JOURNEY_PHASE complete/ROUTE all/默认fixture，市场移后并未删项。R5首次验证这份最终冻结脚本。

## 稀疏输入与QA环境

稀疏已加两个历史文件，内容与HEAD原字节一致：
- qa/evidence/market-2026-09-11T15-13-29-584Z/market-west-entry.json，content6，SHA4b17256c1392208760c01c9fb392d2db907e6f26ef1786874e49296132789a89。
- qa/evidence/market-2026-09-11T15-48-58-773Z/market-west-entry.json，content6，SHA1f0f5adc4d781ec048a086c8d73327cc0141a4063f3fbf6b03a352f5a0d983d4。
固定qa/fixtures/return-main-v0.7.0.json（content6）SHA6a5694a3ec238949f1eca6ea3e280a0a24ca5dcc0c912e93a5b4de1f374f4ff9不改。包已0.8，主线新导出不会覆盖0.7。稀疏add会收起pattern外已提交QA目录，Git历史仍在，不为查看文件重新跑测试。

design/VERIFY_080_INPUT_PREFLIGHT_REVIEW.md核过其他固定输入齐全，21份fixtures。tests/canal-variants先读qa/evidence/life-current-export.json（当前旧content6），后续life-check才覆盖为本轮导出；不要启动前把QA JSON全清空。R4环境只有TMPDIR/CHROME_PATH，无JOURNEY/CANAL/LIFE外部覆盖。

/tmp近满tmpfs，曾有Chrome字体ENOSPC/SIGABRT；所有QA/部署用 **TMPDIR=/home/zhangjingzhou/.cache/xian-ni-qa/tmp**。还有过偶发标题前Framebuffer Unsupported，唯一根因未证实。**CHROME_PATH=本树绝对路径/scripts/chrome-qa.sh** 显式ANGLE SwiftShader GLES，仅本机QA，不发行。慢软件渲染的墙钟不等于模拟秒，不加速模型过测。

Linux Chrome150 + DPR/触控模拟，不是真Mac/Safari/手机。音频输出/事件不冒称扬声器录音或主观听感。长任务独立Python supervisor/log/.exit，一次一个浏览器；单次等待≤60秒，持续中文进展。只对src/tests/scripts做diff-check，不把原日志尾空格叫源码错误。

## R5之后的已授权动作

1. 先检查1273713/log/.exit。若FAIL原样归档、定位修正；若PASS核完整34命令/六判据/退出0和源码dist指纹、截图，不拼旧子项。
2. QA/发行文档提交并推送；保持受测源码/包/dist一致。
3. 带TMPDIR运行node scripts/deploy-pages.mjs（强制完整PASS+同指纹+干净Git），保留实际sourceCommit/distributionCommit。
4. 公网release.json更新后，用EXPECTED_SOURCE_COMMIT=真实发行源提交、TMPDIR/CHROME_PATH运行public-check.mjs，核文件字节/真实输入/声音/旧档。
5. 串行另在GAME_URL=原公网、SPAR_DEVICE=phone、SPAR_CASE=ward、SPAR_STANCE=front运行spar-production-check.mjs，实际公开入口到归驿/再导入；输出单独保存。
6. 写真实发行/公网结果、提交推送。继续有序开发，不以交接或计划替代工作。

## 并行0.9先验已暂存，无活动进程

`.worktrees/outbound-090-layout` / feat/outbound-090-layout，基点c671ca2，**94740f4、253e079均已推送**。仅该树新增两岩背规则层测量模块/测试，未合并进0.8、无浏览器/友方弹道/美术/正式存档。

公开合成初态下普通/零MP直达3.875模拟秒、返端9.125秒均HP4；实际走到630580、等敌人首次casting再等1秒后走，也无损往返。R1近敌630480被正常145避险点击拒绝的失败保留；R2六项测量合同PASS、tsc通过不等于设计成功。R3补返端后2秒，旧弹自然结清、HP4，但敌仍casting，不称永久安全。布局暂缓，不加敌/延硬直/缩退路救案；见该树OUTBOUND_090_LAYOUT_RESULT.md及本树OUTBOUND_090_LAYOUT_REVIEW.md。

短暂同阶协作概念有条件保留，当前几何未证明友方一发有用。OUTBOUND_090_SHARED_CROSSING_REVIEW.md明确：探索、具体发现与静景可以构成目的地收益，不强求每个目的地另造可刷谜题。更早ABC尤其火情C继续暂存，不制作换皮帮工地图。0.9未批准生产，不能写已交付。

## Git和稳定公网

稀疏用git add --sparse；推送 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`，阶段及时推送，不强推或改默认分支。

公网 **https://mekanuo.github.io/xian-ni-game/** 当前仍 **0.7.0**。源码371957ee9a86983f818d06dd411d0493fa627bb3、说明25757229af10a1000b78ae16156cdadd127d18ea，gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。749测试/29命令/六判据、公网29资源及真实输入/声音/旧档/新入口完整通过，见docs/RELEASE_070.md，不重做历史已完成验证。

保留正式树 `.worktrees/market-070-production` feat/market-070 HEAD2575722 dist有效；主树feat/return-stone-v1同HEAD但ignored dist仍旧0.5，绝不部署。默认master仍legacy。
