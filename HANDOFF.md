# 《仙逆：山门之外》交接

## 2026-09-10：0.3 集成验证中（本节覆盖下方历史状态）

用户问“停下了？”，已如实说明此前停在集成阶段，现在继续自主完成与发布，不重复请求授权。0.3 已合并到主源码分支 feat/return-stone-v1；请使用本目录，不再在 ../xian-ni-life-030 编辑。规则、场景反馈、中文行囊与严格旧档/嵌套恢复点迁移已集成。源码包版本升为0.3.0；139项模型测试与生产构建通过，实际桌面委托、留势路线及手机工序仍在验证。公网仍是0.2.2，不得称0.3已交付。现有首版Goal已完成，不另建Goal。

入口规格 design/LIFE_030.md；新增运行规则 src/game/life.ts、美术 life-art.ts、保存 save.ts。真实0.2.2完成档保留在qa/fixtures，实际测试只能从设置导入，不注入进度。scripts/life-check.mjs覆盖机械止挡完整双委托；手机和留势脚本独立补充。完成后跑npm run verify、提交推送、deploy-pages，再跑public-check并更新本交接。

## 最新接续：0.2.2 已发布并核对公网

用户已认可石驿画面；路牌错位与其他三图粗糙已完成本次修订，规格 design/QUALITY_PATCH_022.md。新增七张原画、文字牌统一布局、连续墙段、细碎湿岸与可移动道具。0.2.2 的 npm run verify exit0：64测试、原有视口/输入/声音/战斗、三地区真实走图与手机牌面、主渡和山脊新建→结局→重开全部通过；真实设置导出旧版完成档在 qa/fixtures，供0.3升级验证。已修复审阅中的桥上水波与安楔可视状态；雨棚凳/建筑下方局部前景深度仍是非阻塞美术限制。

用户准备离开十二小时并回复“全部交给你”，已授权代理在约定范围自主设计、实现、测试和发布。0.3规格 design/LIFE_030.md，计划 docs/superpowers/plans/2026-09-09-life-030.md；修器、两叶采摘、压扣和两份药囊，不新增大地图/境界/付费。独立工作目录 ../xian-ni-life-030，分支 feat/life-030；目前只有基础状态/实体迁移与未接入规则原语，不得称0.3已实现。主目录仍为0.2.2发行候选，发布后继续0.3。0.2.2源码39e4aed已推送，gh-pages发行7349f8c，公网release.json核对 sourceCommit=39e4aedc2e65aba4816f437a7d18c48cdad834bf。public-check exit0：17运行文件hash一致，桌面新建/归灯/移动、手机DPR3护符/音乐/察看均通过且pageerror为空。当前试玩 https://mekanuo.github.io/xian-ni-game/?v=0.2.2 。以下0.2.1为上一公开版本历史。

2026-09-09。先读本文件、AGENTS.md、docs/PROGRESS.md及git status/log。用户认可0.1.2整体比此前好，细节暂时保留；后对后续路线回复“可以，交给你”。0.2.0首章玩法深化已发布；用户随后反馈Mac Mini上的石驿布局简陋且丑。当前 **0.2.1 回石驿场景修订** 已完成验证、推送及公网发布，规格见design/QUALITY_PATCH_021.md；场景修订已接入，主观品质仍待用户试玩。具体规格见[PLAYABILITY_020](design/PLAYABILITY_020.md)，后续顺序见[ROADMAP](design/ROADMAP.md)。不重读旧聊天、不重做全书研究、不续作两个封版项目。

## 交付入口

- 公网：https://mekanuo.github.io/xian-ni-game/?v=0.2.1 ，无需账号或安装。
- 工作目录/home/zhangjingzhou/workspace/xian-ni-game；源码分支feat/return-stone-v1；仓库mekanuo/xian-ni-game；master未改，gh-pages只放运行资源。
- 恢复基点bf4d922，完整设计3e02f78；用户已确认原创小修士、空间冒险与角色扮演方向。首版Goal此前已完成，本轮没有另建Goal。
- 0.2规则里程碑860bbb4、集成源码6c76f2c4d2d18bed62dab46a4da2e8c727dac085均已推送；发行提交00467b687ea03b7bd8af33dc8c39230fe9c6bf79，公网release.json核对为0.2.0及该源码SHA。
- 0.2.1代码0265aea及交接d9d033f均已推送；gh-pages发行7bc97deded737ba32d42f3768882ac76e99014b3。公网release.json为0.2.1，sourceCommit=d9d033f1ec6470b2f22b50a2555d2837406ad497。最后交付文档/证据提交不改变运行包。

## 当前实现

- 四场景、两种出身/心愿、引力术/火焰球/定向护符、长牵/留势实际训练、同行补救、主渡/山脊及归家布置、存档和重开。
- 0.1.1高清画布、DPR3手机布局、持续合成配乐、逐事件命中反馈及暂停恢复；0.1.2取消瞄准白线/大范围圈、淡青牵物与留势脱手表现均保留。
- 0.2可收起的“察看周围”（Q/触屏按钮），按附近场景与实际状态呈现方法；只读encounters.ts不给NPC制造见证、不改进度。
- 0.2牵物落点轮廓、合法性和用途标记，32世界单位内辅助对齐；实际运动与消耗仍由model.ts裁决。失败施术保留重选，手机可收术，暂停待施术可取消而不扔下留势物件。
- 点击人物/物件选择可达站位，绕障中只有canInteract成立才执行；修正恢复暂停施术后仍瞄准、同场景重开继承察看展开、安灯/修闸后提示仍要求重做等问题。
- 0.2.1新增回石驿主屋、六件家具与完整平面院落原画，替换重复小屋/占位家具/矩形地面。大屏镜头及地图覆盖修正，保持地图碰撞、交互坐标与存档。人物仍以原画翻转、摆动及状态效果呈现；其他场景仍混合图集与程序材质，完整逐帧动画未完成。quality-review/home-target.png仍是目标图而非实机。

## 验证事实

- 0.2.1最终npm run verify exit0，64项测试、五种视口（1440 DPR2、1920、1280、1920×500矮窗口、390 DPR3）、归灯与桌案真实输入、矮窗口行至院中央保持人物不被操作栏遮挡、界面存档、触控旋屏、战斗、两路归家重开均通过。独立审阅修复桌面路线图丢失主渡/山脊差异及矮窗口镜头偏移。
- qa/verification.json六项PASS。两条隔离浏览器路线都真实新建→核心动作→实际归家结局→重开：山脊证据qa/evidence/run.json，主渡证据qa/evidence/main-route.json。没有注入进度。
- 主渡新实跑包括先保护药筐再借板过桥、长牵试环、排水亲眼见证、交涉、安楔开闸和实际过河；山脊继续覆盖两种练法、同行登台与取风铃。没有穷举全部出身/失败组合，守卫/同伴边界另有模型回归。
- 0.2.1公网public-check exit0：10个运行文件SHA256与dist一致；桌面创建/牵灯/移动、手机DPR3护符、音乐输出与两端“察看周围”均通过，pageerror为空。证据qa/evidence/publication.json、public-start.png、public-mobile.png。
- 手机仅Chrome触屏/DPR仿真；Mac/Safari、iPhone/Android真机声音、自然时长与主观趣味尚未验证。流程PASS不代表用户认可所有品质。

## 后续与运行

- 用户已委托按路线继续；0.3成长和回驿生活、0.4下一段冒险尚未实施。先收敛具体成长用途与内容，再推进；不自动扩为全书大地图或境界速升。每个后续里程碑继续及时提交推送。
- 已批准首章设计在design/REVIEW.md及链接；研究已存docs/research。玩家不替代王林，不获取其天逆、独占功绩或关系。
- Node22/npm10；npm ci、npm run dev、npm run build、npm run verify。Phaser3.90、Vite7.3.6、Vitest4.1.11、Playwright1.58.2；Chrome路径/usr/bin/google-chrome。本轮临时开发/预览服务已关闭。
- 稀疏检出，新文件用git add --sparse；Git凭证助手：git -c credential.helper='!gh auth git-credential' push origin feat/return-stone-v1。不要显示凭证。
- deploy-pages要求验证PASS且工作区clean，仅发布dist到gh-pages；发布后核对release.json并运行public-check。
- __XIAN_NI__只读证据接口；模型是唯一规则入口，存档结构仍为schema1/revision return-stone-v1。取消动作不会把新的待执行类型写入旧档。
- 原文在本机../sources/仙逆.txt，不加入新提交/构建；仓库旧历史novel.txt未重写。/home/zhangjingzhou/smbb与starvein-companion-cards永久封版。
- 本轮环境已恢复danger-full-access且网络启用，0.2.1推送/部署/公网核验成功。此前自动审批拦截已解除，历史保留在PROGRESS；不要再次要求用户重复授权。
