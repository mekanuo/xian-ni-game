# 当前工作入口 · 0.7 集口白盒并行开发，0.6发行优先

本工作树 `.worktrees/market-070` / `feat/market-070-whitebox`，基线 a167f79（0.6冻结runtime加下一章设计，尚不是0.6最终发行）。计划 docs/superpowers/plans/2026-09-11-market-whitebox.md；设计 design/ADVENTURE_070.md 和 BUILD_BRIEF_070_WHITEBOX.md。用户授权继续自主开发和里程碑推送，无待确认事项，不另建Goal。

**0.6仍在 `.worktrees/kiln-060` / feat/kiln-060 跑完整r2，root必须继续监控并优先完成合入/部署/公网核验。** supervisor1134667，/tmp/xian-ni-060-verify-r2.log，exit同名.exit，拥有4187与唯一浏览器；0.7浏览器等0.6本地及公网验证全部释放后再开，不触动该树runtime/dist。当前正式公网仍0.5，不把这里package0.6.0当作0.7发布。

已完成共享 simulationPorts：仅导出真实free/clearLine/emit/dialogue/closeDialogue与moveBody薄包装moveNpc（暂停/败退/非法dt不动）；不接入生产剧情或浏览器写接口。3新边界先RED后GREEN，ports/model/projectile三文件57测试PASS，tsc通过。

规则代理 canal_rules_040 独占 src/whitebox/market-model.ts 和 tests/market-whitebox.test.ts；美术代理 canal_art_040 此次仅做白盒UI，独占market-whitebox.html、market-main.ts、market.css、vite.market-whitebox.config.ts；不生成生产美术。root拥有共享model、Git/构建/浏览器/后续QA脚本。所有实现仅在本树，0.6源码冻结。

下一步收敛真实模型路径，独立构建；0.6发行完成后串行跑白盒实际输入。白盒北口只近身确认和实际折返，不证明生产跨图或联络路用途。正式生产需设计决定，不能提前补全图/迁移或部署白盒。保留旧研究和封版项目边界；无需重读下面历史全文。

---

# 当前工作入口 · 0.6 正式整版验证运行中

工作目录 `.worktrees/kiln-060` / `feat/kiln-060`。最新已推 59e746b（public-check核对预期sourceCommit）、b624481（同行驱动）；47b6bd2（新窑完整专项证据与下章草案）；dfa0264为烧屏对话与真实零灵力恢复，之前 b19174c 美术/音乐、f04555c 脱困、a381f73 正式规则。主源码分支和公网仍为已核验0.5（7fea179，gh-pages f7972c2）。用户“继续，别停”，自主设计/实施/测试/推送和既定公网部署授权，无待确认事项。不要重读聊天/原书或碰封版项目；不另建推断Goal。

**唯一浏览器由完整verify持有。** 当前r2 supervisor PID1134667，日志 `/tmp/xian-ni-060-verify-r2.log`，最终退出码 `/tmp/xian-ni-060-verify-r2.exit`，拥有4187预览。先检查进程/日志/报告再接手，不同时开浏览器。r2模型507测试/29文件已全PASS（首轮首章实际导出的两个v0.6夹具被既有glob纳入；未改测试或历史夹具）；当前新包index-BTwh6Je1.js。新窑三视口18图、两路和all物件后果都已PASS；旧界面/镜头/石驿五视口/触控已PASS，首轮后续战斗、首章两路、生活、旧渠与重访也通过，但最后手机同行在会合位置的驱动断言超时（真实游戏gate均已true）。详见qa/evidence/journey-camera-meeting-rejected，原完整FAIL已归档。现将驱动改为实际75范围/路径结束/双gate/不暂停无对话，游戏代码未改；r2完整24条检查重新运行，先同行再其余，全部完结前不能称0.6发行通过。独立4191预览还在，4192只服务历史白盒。

正式第六图/双向连接/杜芹借还/许可棚角/v5严格迁移已接；新窑西到达270480、东1220620，出口牌脚仍180480/1220540，避免人物挡字。四张独立原画和稀疏陶音已接，第二轮地面纹理收细降对比、砖立面加强、棚脚445使坐垫在棚内。root已目视第二轮西院/烧毁/脱困图，无粉底重图，路牌可读；最终三视口18图全部PASS，root另目视手机许可静息，坐垫在棚腿间。

首轮桌面零资源双向往返与手机真实借还/新页面恢复/静息/重开PASS归档qa/evidence/kiln-initial-art。该目录未发布v5候选导出保留修订前targetSpawn，不能作为当前继续档，最终verify会重导。固定真实0.5输入qa/fixtures/return-journey[-paused]-v0.5.0不变。

物件后果复测发现两点并保留原FAIL：kiln-burn-dialogue-rejected记录杜芹看见烧毁却仍邀请归还，已修为只按现场可见损毁去掉不可能借还项，3回归先RED后GREEN；未见损毁/已获许可不改。kiln-pointer-tolerance-rejected记录鼠标亚像素误差不足1单位，屏已覆盖人物但驱动要求<0.6超时；改3单位内且明确实体重叠断言，不放松碰撞规则。此轮烧毁、独立页面恢复、杜芹新回应、出入后残片保持已真实走过；当前verify已重新生成kiln-consequences.json status PASS / consequenceCase all，烧毁和脱困均已跑全。

独立恢复补证qa/evidence/kiln-recovery-check.json PASS（case recovery）：正常五次护符+一次牵屏用尽灵力，真落到脚下，键盘走到x323；实际导出→新页面→点击走到x269，均HP4/MP0、未移动屏/未退款，重开正常。root已目视。原13模型回归也覆盖留势到期落屏/存读及其他障碍。

当前所有代理已完成停写；root拥有Git/构建/浏览器/部署。接下去检查三视口失败则按实际证据修正，整版verify全部通过并clean后合入feat/return-stone-v1、既定deploy-pages和public-check；保持同一公网入口，核对新版本与资源哈希。设计/执行入口design/BUILD_BRIEF_060.md、ART_KILN_060.md和docs/superpowers/plans/2026-09-11-kiln-production.md。不要在阶段推送后停下。

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

0.7已选A进入隔离白盒准备：design/ADVENTURE_070.md、MARKET_070_GEOMETRY_REVIEW.md、BUILD_BRIEF_070_WHITEBOX.md和docs/superpowers/plans/2026-09-11-market-whitebox.md。可在另一个market工作树并行源码/模型，0.6发行优先，0.7浏览器等0.6本地及公网验证结束；尚无生产批准/实现，不改变本发行。qa/REVIEW_060.md记录当前视听目视与非阻断限制。
