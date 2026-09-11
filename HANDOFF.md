# 当前工作入口 · 0.6 隔离空间白盒

本目录 `.worktrees/kiln-060` / `feat/kiln-060`。0.5已正式发行并公网核验：主源码4771041、最终证据7fea179、gh-pages f7972c2，21运行资源哈希一致，原链接 https://mekanuo.github.io/xian-ni-game/?v=0.5.0 。本分支已合入最终0.5证据文档；qa/evidence及verification中的发行PASS属于0.5基线，不代表0.6。

用户要求持续自主推进，无待批准事项，不重读旧聊天或原小说，不碰两个封版项目。0.6选定 design/ADVENTURE_060.md，当前只做独立whitebox.html，空间与物件后果已完成实测，根代理决定进入正式生产；生产计划docs/superpowers/plans/2026-09-11-kiln-production.md、美术ART_KILN_060.md，正式新图仍未实现，不发布白盒。

第三几何修订东侧扩60，真实Chrome150桌面DPR2五项PASS：留屏与暂停、牵屏合法落点及屏角拒绝、烧毁不可牵复原、零灵力实际东去西返、整局重开。返回HP3/MP0、38.015秒，两敌未退出，真实敌弹撞固定围墙；页面错误为空。qa/whitebox/kiln.json及截图，原第二修订北返失败保留在rejected-east-narrow。模型新增1秒活动决策间隔先RED后GREEN，白盒7/7；TypeScript与whitebox-Dd3FMveF.js通过。不得把脚本PASS说成完整设计全部验证：补证kiln-decisions.json已PASS：实际归屏HP4/MP4；烧前拒绝同点，烧后实际跨过并返回HP3/MP5，截图前继续受击为HP2，原观察位失去遮蔽。根代理已目视复核并决定生产。

模型燃烧保持、实体完整足迹及旧角重叠逐步脱困补丁已推4a52181/f54f9e6/a4e1b20。旧位兼容85项相关模型测试通过，证据为完整五图合成边界夹具，不是假称历史实机存档。

4192预览PID1105194仍服务.whitebox-dist，当前无浏览器运行；浏览器必须串行。root拥有Git/构建/浏览器/部署，当前scene.ts有未提交的小型石驿旧绘制占位清理，尚未正式渲染验证，不随白盒里程碑发布。三个既有Agent的存档计划、连接选址、剩余局面重放均已完成；下一步实施正式类型/新图/规则/迁移和美术；持续推进，不结束在计划。

---

# 《仙逆：山门之外》当前交接

## 0.5 同行回程 · 已发布并核验公网

本目录 `.worktrees/companion-050` / `feat/companion-050`。用户最新要求“继续，别停”，此前已授权持续自主制作、测试、里程碑Git推送和既定公网部署，无待确认事项。0.5已提交推送、合入主源码分支、部署并通过public-check；继续0.6独立白盒。

2026-09-11本候选 npm run verify exit0：342测试/21文件、21条命令、qa/verification.json六项全部PASS。最后完整运行PID1091270已结束，/tmp/xian-ni-050-verify.exit为0；日志同名.log。预览4187由验证器收尾关闭。运行包index-BJE6H6II.js / index-B8Ldhq7K.css，21运行资源。无需重复已通过的矩阵。

**公网已核验0.5.0。** 原入口 https://mekanuo.github.io/xian-ni-game/ 保持不变，可加?v=0.5.0。发行源码4771041c3e392a0c62e248764e8ceee1d6a7ad8e、gh-pages f7972c26d2d55e5f057848296892189d475d5a5e；public-check exit0，21资源哈希与已验证dist一致，桌面/手机输入与声音、生活/旧渠旧档、新同行v3→v4接约和实际进入工棚通过，errors为空。publication.json现属于本次0.5发行；public-companion.png记录真实工棚入口。

## 已实现与实测

五图首章两路归家、生活修器/采药/药囊、完整旧渠冒险全部保留。新增许照在工棚主动领回程，玩家自行跟随；落后或实际兽情会令她等候。独行、北路/南探折返、提前离开、后来同行均依真实位置结算，约定和切图不伪造共同经历。雨棚坐垫只开启一次，归驿纸签落在实际桌面，后来共同走过只补笔不重复奖励。

contentVersion4，schema/revision不变；旧1/2/3外层和checkpoint先按原清单验证再迁移，不补造见证或奖励。固定真实旧输入在qa/fixtures，不用新导出覆盖旧版本迁移夹具。

发行修复还包括：镜头拖动在DOM上松开后确实结束，下一次点击不再继续拖镜头；射弹按整段首个实际接触撞墙/挡板，短帧不穿透。DPR1/2/3实际点击、施火首板面命中和旧战斗声音均已验证。0.6分支后续燃烧/完整挡屏足迹补丁未包含在本发行。

真实浏览器证据：
- 首章山脊/主渡完整归家与重开；生活桌面机械法/留势、手机采叶和暂停档；旧渠桌面零资源/手机连续留势两法都完成归驿与重开。
- journey-check.json statusPASS/selectionall/phasecomplete：桌面与390×844 DPR3手机仿真均不暂停地连续跟随实际带路，完成出口、雨棚、桌案、重开；独立迈步暂停档在全新页面恢复。
- journey-view.json三视口各4张，共12处：1440×900 DPR2、1280×500、390×844 DPR3。脚标/避让/清晰度与实际往返输入通过，页面错误为空；根代理目视复核本轮桌面归家与手机雨棚等关键图。
- South换路、提前退出、单人先走后来同行等组合另有模型证据，不冒充全组合已实机。

目标含Mac与触屏浏览器，实际运行环境是Linux Chrome150及窗口/DPR/触屏仿真，不等于实体Mac/Safari/手机验证。人物仍为原画加状态动作，未有完整逐帧动画；趣味与自然游玩时长仍需玩家反馈。当前只做有界章节，不声称已完成全书改编。

## 后续工作入口

主源码目录 /home/zhangjingzhou/workspace/xian-ni-game，分支feat/return-stone-v1；本次合入目标明确，不碰master或封版项目。Git推送使用既有gh credential helper，不输出凭证；稀疏检出新文件git add --sparse。deploy-pages要求PASS和clean，仅发布dist到gh-pages；发布后public-check核对HTTP资源与真实输入。

0.6已在 `.worktrees/kiln-060` / `feat/kiln-060` 独立开发，已推计划b8211d5、白盒4a52181、足迹f54f9e6、旧重叠兼容a4e1b20。阅读该目录HANDOFF后继续。whitebox.html复用真实act/tick，有两墙角/两敌/一屏和普通/零灵力初态，无正式新地图/借还人物/存档迁移/生产美术。最近相关五文件85/85、TypeScript与whitebox-CzR68t1q.js通过，0.5公网核验已结束；4192白盒正在实际输入验证（PID1105420，/tmp/xian-ni-060-whitebox.log，退出码同名.exit），独立预览PID1105194。浏览器始终串行。该分支另有去除石驿旧平涂占位色块的可逆视觉改动，尚待实机复核。

用户已认可空间冒险与角色扮演方向，原交接bf4d922，设计确认3e02f78；研究资料docs/research。不要读旧聊天、重做全书研究或上传原文，不续作smbb与starvein-companion-cards。首版Goal早已完成，本轮不另建推断Goal。历史进度在docs/PROGRESS.md，设计入口design/REVIEW.md与CONTENT_ROADMAP.md。
