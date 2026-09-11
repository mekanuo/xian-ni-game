# 当前工作入口 · 0.6 正式美术/输入验证中

工作目录 `.worktrees/kiln-060` / `feat/kiln-060`，最新已推 f04555c（玩家落屏脱困），规则基线 a381f73；主源码分支/公网保持已核验0.5（7fea179，gh-pages f7972c2）。用户要求“继续，别停”，自主设计、实施、测试、里程碑推送和既定公网部署均授权，无待确认事项。不读旧聊天/原书、不碰封版项目；已有首版Goal完成，本轮不另建推断Goal。

正式第六图、双向连接、杜芹目睹借离/完好归还、许可棚角及v5严格存档已接入；a381f73模型489/28 PASS。新屏落自己脚下会卡住的真实问题已补向外脱困，13新增回归与相关四文件64 PASS，只读审查未发现问题；当前连接落点与路牌分开后98/2 PASS。完整新版矩阵还未跑，qa/verification.json NOT_RUN，不能用旧0.5报告发布。

首轮生产构建 index-CanjsJtL.js，通过真实桌面零灵力四次换图、HP2仍存活、旧档导入、重开，qa/evidence/kiln-desktop-check.json PASS。首轮已归档；4191现服务第二轮 index-DlWvZPCK.js（TypeScript/构建通过）。新包新增西270480/东1220620到达落点，与出口牌脚分开，杜芹presentation接口补齐。美术helper第二轮地面采样收细/降对比、窄压顶加砖立面、棚脚到445使坐垫在棚内。root目视当前西院图，路牌不再被到达人物遮住，地面/墙面更清楚；三视口完整验收仍待运行，art代理已停写。

手机借还/新页面恢复/静息/重开已 PASS，PID1118008已结束；当前唯一浏览器 PID1119959 正运行 kiln-consequences-check（/tmp/xian-ni-060-consequences.log，qa/evidence/kiln-consequences.json）。首轮报告/图/v5候选导出已归档qa/evidence/kiln-initial-art，因入口到达坐标修订，这些未发布v5导出不能用于当前候选恢复，必须新构建重导。日志 /tmp/xian-ni-060-production-phone.log 保留。root另已写 kiln-check 的 consequences 选择器与wrapper（正式烧毁存读/进出保留、零灵力脚下落屏键盘和新页面点击脱困），正在运行。规则代理已完成scripts/kiln-view-check.mjs三视口脚本，未运行；save代理只读审查无新阻塞，已结束。root拥有Git/构建/所有浏览器/部署。

下一步完成手机流程，收拢art/helper后重构建，运行后果和三视口、目视修整；推送视听/交互里程碑后继续完整verify和公网发行。生产 BUILD_BRIEF_060 / ART_KILN_060 / ASSET_LOG 已记录范围和原画来源。verify和public-check正在加入第六图验收，尚未运行，不能提前记PASS。固定旧输入qa/fixtures/return-journey[-paused]-v0.5.0来自真实0.5 UI导出，不能覆盖。

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
