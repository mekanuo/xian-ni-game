# 《仙逆：山门之外》交接

2026-09-09。先读本文件、AGENTS.md、docs/PROGRESS.md及git status/log。用户认可0.1.2整体比此前好，细节暂时保留；后对后续路线回复“可以，交给你”。0.2.0首章玩法深化已发布；用户随后反馈Mac Mini上的石驿布局简陋且丑。当前 **0.2.1 回石驿场景修订** 已完成最终候选验证，待推送发布，规格见design/QUALITY_PATCH_021.md；不要在本次反馈修复前转去0.3。具体规格见[PLAYABILITY_020](design/PLAYABILITY_020.md)，后续顺序见[ROADMAP](design/ROADMAP.md)。不重读旧聊天、不重做全书研究、不续作两个封版项目。

## 交付入口

- 公网：https://mekanuo.github.io/xian-ni-game/?v=0.2.0 ，无需账号或安装。
- 工作目录/home/zhangjingzhou/workspace/xian-ni-game；源码分支feat/return-stone-v1；仓库mekanuo/xian-ni-game；master未改，gh-pages只放运行资源。
- 恢复基点bf4d922，完整设计3e02f78；用户已确认原创小修士、空间冒险与角色扮演方向。首版Goal此前已完成，本轮没有另建Goal。
- 0.2规则里程碑860bbb4、集成源码6c76f2c4d2d18bed62dab46a4da2e8c727dac085均已推送；发行提交00467b687ea03b7bd8af33dc8c39230fe9c6bf79，公网release.json核对为0.2.0及该源码SHA。
- 最后交接提交只改文档、发布检查与证据，不改变运行包；其最新SHA以git log为准。

## 当前实现

- 四场景、两种出身/心愿、引力术/火焰球/定向护符、长牵/留势实际训练、同行补救、主渡/山脊及归家布置、存档和重开。
- 0.1.1高清画布、DPR3手机布局、持续合成配乐、逐事件命中反馈及暂停恢复；0.1.2取消瞄准白线/大范围圈、淡青牵物与留势脱手表现均保留。
- 0.2可收起的“察看周围”（Q/触屏按钮），按附近场景与实际状态呈现方法；只读encounters.ts不给NPC制造见证、不改进度。
- 0.2牵物落点轮廓、合法性和用途标记，32世界单位内辅助对齐；实际运动与消耗仍由model.ts裁决。失败施术保留重选，手机可收术，暂停待施术可取消而不扔下留势物件。
- 点击人物/物件选择可达站位，绕障中只有canInteract成立才执行；修正恢复暂停施术后仍瞄准、同场景重开继承察看展开、安灯/修闸后提示仍要求重做等问题。
- 0.2.1候选新增回石驿主屋、六件家具与完整平面院落原画，替换重复小屋/占位家具/矩形地面。大屏镜头及地图覆盖修正，保持地图碰撞、交互坐标与存档。人物仍以原画翻转、摆动及状态效果呈现；其他场景仍混合图集与程序材质，完整逐帧动画未完成。quality-review/home-target.png仍是目标图而非实机。

## 验证事实

- 0.2.1最终npm run verify exit0，64项测试、五种视口（1440 DPR2、1920、1280、1920×500矮窗口、390 DPR3）、归灯与桌案真实输入、矮窗口行至院中央保持人物不被操作栏遮挡、界面存档、触控旋屏、战斗、两路归家重开均通过。独立审阅修复桌面路线图丢失主渡/山脊差异及矮窗口镜头偏移。
- qa/verification.json六项PASS。两条隔离浏览器路线都真实新建→核心动作→实际归家结局→重开：山脊证据qa/evidence/run.json，主渡证据qa/evidence/main-route.json。没有注入进度。
- 主渡新实跑包括先保护药筐再借板过桥、长牵试环、排水亲眼见证、交涉、安楔开闸和实际过河；山脊继续覆盖两种练法、同行登台与取风铃。没有穷举全部出身/失败组合，守卫/同伴边界另有模型回归。
- 公网public-check exit0：7个运行文件SHA256与dist一致；桌面创建/牵灯/移动、手机DPR3护符、音乐输出与两端“察看周围”均通过，pageerror为空。证据qa/evidence/publication.json、public-start.png、public-mobile.png。
- 手机仅Chrome触屏/DPR仿真；Mac/Safari、iPhone/Android真机声音、自然时长与主观趣味尚未验证。流程PASS不代表用户认可所有品质。

## 后续与运行

- 用户已委托按路线继续；0.3成长和回驿生活、0.4下一段冒险尚未实施。先收敛具体成长用途与内容，再推进；不自动扩为全书大地图或境界速升。每个后续里程碑继续及时提交推送。
- 已批准首章设计在design/REVIEW.md及链接；研究已存docs/research。玩家不替代王林，不获取其天逆、独占功绩或关系。
- Node22/npm10；npm ci、npm run dev、npm run build、npm run verify。Phaser3.90、Vite7.3.6、Vitest4.1.11、Playwright1.58.2；Chrome路径/usr/bin/google-chrome。本轮临时开发/预览服务已关闭。
- 稀疏检出，新文件用git add --sparse；Git凭证助手：git -c credential.helper='!gh auth git-credential' push origin feat/return-stone-v1。不要显示凭证。
- deploy-pages要求验证PASS且工作区clean，仅发布dist到gh-pages；发布后核对release.json并运行public-check。
- __XIAN_NI__只读证据接口；模型是唯一规则入口，存档结构仍为schema1/revision return-stone-v1。取消动作不会把新的待执行类型写入旧档。
- 原文在本机../sources/仙逆.txt，不加入新提交/构建；仓库旧历史novel.txt未重写。/home/zhangjingzhou/smbb与starvein-companion-cards永久封版。
- 先前发布审批拒绝已经解除，历史在PROGRESS；当前推送和公网发布成功，不恢复旧审批流程。
