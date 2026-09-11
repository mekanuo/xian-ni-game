# 最新入口 · 0.7整版PASS，准备推送与发布

正式工作树 `/home/zhangjingzhou/workspace/xian-ni-game/.worktrees/market-070-production`，分支 `feat/market-070`。受测候选574c795已推送；现在待提交完整QA/说明里程碑。npm run verify supervisor1194816已exit0，日志/tmp/xian-ni-070-verify.log和.exit；所有浏览器已结束，4187由脚本关闭，4194普通preview仍可保留。

本整轮35文件749测试、29条命令全部PASS，qa/verification.json六判据均PASS；退出后assertVerificationFingerprint再次成功，139输入文件/29个dist。包CRsUjnIh / D5r6oNWq。不要改受测输入或重建后直接用旧指纹。源码及资产冻结期间仅文档有改动。详见qa/REVIEW_070_PRODUCTION.md。

**下一动作：提交推送完整QA与说明 → 本工作树node scripts/deploy-pages.mjs → 等公网release.json来源匹配 → scripts/public-check.mjs → 同地址MARKET_CASE=view运行market-check新章入口。当前公网仍0.6，不提前宣称0.7上线。** 所有动作已有用户授权，无需询问。发布后补真实源码/发行提交/HTTP结果并推送，再继续下一段有界设计验证；不在里程碑停止，不新建推断Goal。

下一候选design/BUILD_BRIEF_CLIFF_WHITEBOX_DRAFT.md与design/CLIFF_WHITEBOX_COUNTEREXAMPLES.md均已交回/root读过，所有代理停止写入。新增docs/superpowers/plans/2026-09-11-cliff-space-preflight.md仅发布后空间先验顺序，未启动白盒、生产或正式美术。旧坐标发现直达/连接/40网格/转角/手机与home镜头特例问题，先证明空间，再决定完整危险。

以下是历史进度，活动状态已由本入口覆盖。

# 活动整版验证 · 冻结574c795候选

2026-09-11。正式 npm run verify 已启动，supervisor **1194816**；日志 /tmp/xian-ni-070-verify.log，退出码 /tmp/xian-ni-070-verify.exit。游戏/输入源码、资产、测试、scripts/config全部冻结；不得修改这些直到整轮结束。当前未有整版结果，不重复启动浏览器或额外构建。脚本拥有preview4187并串行启动所有浏览器；平常preview4194可保留。HEAD574c795 已成功推送；整版进程仍以日志/exit为准。

canal_save_040已交回design/BUILD_BRIEF_CLIFF_WHITEBOX_DRAFT.md，root已阅读；独立反例审查也已交回，全部代理停写。该稿仅候选，未开始白盒或生产，不能改冻结输入。root可整理文档与发行说明，必须等新整版PASS后才能部署。用户要求继续自主开发。

最近检查进度：本整轮市场五项、同行两项、旧窑三项、UI、三DPR拖镜头、石驿五窗口、通用交互/手机渲染、战斗与声音、实体首次遮挡已结束通过；目前 region-art-check 正在真实走图，之后仍有首章完整路线与生活/旧渠回归。未有整轮exit，切勿部署。root已目视本整轮手机集市idle及归驿截图，QA说明已补。

canal_rules_040已交回design/CLIFF_WHITEBOX_COUNTEREXAMPLES.md，root已阅读。仅纸面计算：L→E可能避开岩鼻、H合法边角到U需绕路、斜路与40网格不匹配、手机源头余量不足、home相机特例不能套用通用参数。当前坐标不可直接当可执行布局；0.7发布后先明确完整障碍/非home目标镜头，再做空间反例。没有模型/浏览器通过结论，全部代理再次停写。

# 最新覆盖 · 0.7 专项闭合，准备冻结整版验证

2026-09-11。phone R7 supervisor1193420 已exit0，qa/evidence/market-phone-r7.json PASS，run16-36-11-062Z：从真实手机R5小集入口导出续走，私巷→旧渠静息→公共巷→石渡→石驿桌边差集记事/完成档导出，全流程真实单指触控；镜头准备使用普通暂停，不称无暂停战斗。root已目视归驿截图，顶部无相叠。桌面R5从固定原样0.6旧窑导出完整PASS，run16-17-08-249Z。所有之前FAIL保留。

当前所有专项浏览器已结束，代理全部停写。下一动作提交推送后启动一次 npm run verify；此后源码/资产/测试/脚本/配置冻结，仅可改docs/design/qa说明。整版启动后以 /tmp/xian-ni-070-verify.log 与同前缀.exit 为准；新PASS之前公网仍0.6，不部署。后续记录会补真实PID与结果。正式工作树/preview4194与游戏包未变（CRsUjnIh / D5r6oNWq）。用户要求继续、不停在里程碑。

# 最新覆盖 · 0.7 桌面完整通关，手机回程迭代

2026-09-11。正式工作树 market-070-production / feat/market-070，HEAD **00ad73c 已推送**（之前 d3216b3 手机看路/顶部修正，f54c357 同行败退后果）。正式包仍 **CRsUjnIh / D5r6oNWq**，游戏源码未继续改变；后续是 QA 驱动和证据。公网仍0.6。749模型测试已PASS，当前尚无0.7整版verify，不可用继承报告发布。

**已完成，不重复专项：** 手机五幅高DPR美术/路牌/菜单/真单指看路 PASS；同行等候/重聚/保存导入与两次真实败退、重试/同行撤离 PASS；沈砚真实引敌停步、同框waiting帧、暂停冻结与撤离后继续 PASS。详情 qa/REVIEW_070_PRODUCTION.md。停步专项最终桌面DPR1，先前DPR2软件渲染超时FAIL保留；高密度图像另证，不改游戏速度。

桌面完整R5 **PASS**：qa/evidence/market-desktop-complete-r5.json，run16-17-08-249Z，从固定原样0.6旧窑导出→溪道静息→石渡→小集私巷→旧渠→小集公共巷→石驿桌边记事→实际导出。root已目视桌边新增记录。R4末段QA误点修器工位的问题已改直接点table，未改游戏交互。

手机R5从同旧档到小集后，连续活动状态拖图导致在射程内站定受击败退，整案FAIL保留；R6仅从该次真实小集入口导出续走，新增“暂停时选可见地面/镜头，恢复后真实走到再暂停”驱动，明确不是无暂停战斗证明。R6真实私巷进入旧渠HP2、歇脚恢复并返回小集；原1220,220取样点在手机HUD下且相机到边界无法再移开，FAIL保留。现手机公共回程改同一通道内可见点1220,340→1220,860→880,860→420,860，桌面原已通过路径不改。脚本还把手机拖图日志改为single-finger、运行JS哈希改取实际载入response。

**当前唯一浏览器：** phone R7 supervisor1193420，日志 /tmp/xian-ni-070-phone-r7.log，结束写同前缀.exit；输出qa/evidence/market-phone-r7.json。从实际手机R5入口 qa/evidence/market-2026-09-11T16-23-15-177Z/market-west-entry.json 续走，不是再次从0.6开始。R5整链1190881、R6 1192659均已结束。preview4194 PID1178399。所有代理已停写。

下一步R7完整记事通过→更新/推送本QA里程碑→冻结 `npm run verify`（现在已接三视口+实际停步+同行后果+桌面/手机从固定0.6开始，随后全部既有回归）→核对新PASS和fingerprint→推送→本工作树dist发布原URL→公网资源/输入/新章检查。正式verify开始后不要改src/public/tests/scripts等冻结输入。设计/资料可继续整理。下轮候选风险稿design/CLIFF_NEXT_RISK_REVIEW.md已交回，仅准生产后再决定有界白盒，不是批准新图制作。用户要求继续，不停在里程碑。

# 最新覆盖 · 0.7 手机看路与顶部间距验收中

2026-09-11。正式 worktree market-070-production / feat/market-070，HEAD 12ef0e4 已推送。公网仍 0.6。新增正式“看路”按钮与单指拖镜头、对白中纯镜头操作、帮助说明；新增界面和后果浏览器检查脚本。最新全套 **35 文件 749 测试 PASS**，tsc/build PASS；当前包 **index-CRsUjnIh.js / index-D5r6oNWq.css**。

桌面 R3（qa/evidence/market-desktop-r3.json）实际点穿已开门洞并通过私巷到旧渠；回程 1220,880 在软件 GPU 下 60 秒截止时仍正常向目标走，整案 FAIL 保留，未称通关。QA 改实际到达等待 120 秒并在败退/意外对白时及时失败，未调整游戏速度/威胁。

三视口第一轮 qa/evidence/market-view-2026-09-11T15-30-30-506Z/report.json PASS，真实 DPR 和手机单指看路/暂停成立；root 目视额外抓到手机目标提示与菜单相叠。加入实际 DOM 矩形相交断言后两次 RED 均保留（15-37-48 与 15-45-07 目录）：仅缩短目标仍不够，现同时为手机菜单/观察/暂停行增加间距。phone GREEN2 已 exit0，qa/evidence/market-view-2026-09-11T15-47-03-177Z/report.json 为 PASS；五幅图、路牌定位、目标不遮菜单、真触控拖图、idle/walking 与开门冻结成立，waiting 未强造。root 已目视手机 idle，菜单间距清晰。desktop R4 supervisor1186308 已 exit1：真实双路往返并满体力回到home，但1000,450误点修器工位触发respec，尚未桌边记事。已移除错误中转点，直接点击table；原FAIL保留。consequences R1 supervisor1188114 已 exit0，qa/evidence/market-consequences-r1.json PASS：实际等候/重聚与两类导入、两次真实败退后重试/撤离通过；实际 following 撤离脚点成立，absent-retreat NOT_RUN。root 已目视重试图。threat R1/R2分别30/120墙钟秒时敌仍沿墙移动而FAIL；R3改普通桌面DPR1后完整PASS，qa/evidence/market-threat-r3.json，run16-14-51：真引筐→waiting且门闭→同框暂停冻结→撤离后NPC继续，HP4MP5敌HP3。root目视。高DPR艺术证据独立，未改游戏规则。当前唯一串行浏览器 supervisor1190881，先desktop再phone完整R5，从固定原样0.6旧窑导出开始；各日志 /tmp/xian-ni-070-<device>-complete-r5.log，结束写各自.exit，整链结束 /tmp/xian-ni-070-complete-r5.exit。失败会停止后续设备；核查后续从未运行再启动，不重复浏览器。preview4194 PID1178399。

root 独占构建/浏览器/Git/部署；canal_rules_040 后果脚本已交回停止写入；canal_save_040 下轮风险稿已交回。代理均已交回停止写入，root 接管全部文件；新增 threat 脚本当前实测中。下一步手机实际截图通过后完整桌面/手机往返记事、market-consequences-check（真实等候重聚/两次败退与重试撤离）、正式冻结 verify、Git 推送与原 URL 部署验证。当前新版本无整版 PASS，继承 0.6 验证不可用于发布。继续开发，不停在里程碑。

# 最新覆盖 · 0.7 美术接入，修复开门后的点击拦截

2026-09-11。当前仍正式工作树market-070-production / feat/market-070，机制提交07bca74已经推送。四组实际美术已接入，BGM/门闩音、观察说明/山道小图/桌案纸签完成。许照缺席时独自整理药草与摆叶、撤回合法同行脚点、非实心物件到达包络均已修；相关RED→GREEN。最近全套35文件748测试PASS，之后新增开门点击回归10/10定点PASS；最新tsc/build PASS，包 **index-B3DLJ88D.js / index-B8Ldhq7K.css**。

实际首轮桌面view已PASS（qa/evidence/market-first-view.json，运行Cq4bbM9q，真实0.6旧窑双向导出→溪道静息→石渡→小集→交谈，非完整通关）。root已view首入/对白图；第二轮地面与灰底修整图也目视，灰框已消失。完整桌面R2 **FAIL且保留** qa/evidence/market-desktop-r2.json：BfRm4y9K下实际交换/走闩/开门声已成立，但点665410弹出旧门的inspect，原点击矩形仍占门洞。已在model交互与scene点击中排除open门，并隐藏空门洞标签；不是改QA去绕开门洞。下一轮需要用B3DLJ88D重新真实点穿验证。

preview4194 PID1178399运行，http://127.0.0.1:4194/；当前没有浏览器。firstview supervisor1178570已exit0，R2 supervisor1180216已exit1。scripts/market-check.mjs 可 MARKET_DEVICE=desktop/phone、MARKET_CASE=view、MARKET_OUTPUT定独立报告；MARKET_START可导入实际早先UI导出的market-west-entry.json继续迭代，明确不是新一轮从0.6全程。正式最终默认用新固定夹具qa/fixtures/return-kiln-through-v0.6.0.json（原实际0.6导出原样复制，sha1bceb15a3ad86f35fae5a6fc9cd5dd8f343356172c1a1566b6c778ccb461777f），不受后面旧窑QA重写evidence文件影响。

代理全已停写；root负责后续。新市场整程/手机/短屏/暂停读档重试同行实测与正式verify/public均未完成，公网仍0.6，不可部署继承PASS。继续开发、每里程碑推送。

# 当前正式制作入口 · 0.7 P1 接线已完成，P2 美术进行中

2026-09-11。实际工作树 `/home/zhangjingzhou/workspace/xian-ni-game/.worktrees/market-070-production`，分支 `feat/market-070`，从白盒生产决定 052e708 建立。公网仍 0.6，同 URL；本分支没有构建、浏览器、部署证据，禁止用继承的 PASS 发布。

已接第七图、正式双向出口、真实交换/移步/开门/穿行/差集记事、严格 v6 迁移与许照在场判断。35 文件 741 测试 PASS、tsc PASS；包括明确合成前置后的实际 act/tick 穿行、交换与 NPC 每步快照、暂停牵筐、许照等候与旧物件防重复。旧 fixture 未修改。尚需进一步只读同行/退回审查、完整生产美术合成、音效/小图、真实桌面触控与旧档续玩验收。

代理 canal_art_040 独占四张 market 资产 + market-art.ts + MARKET_070_ASSET_DELIVERY.md，已生成素材、正写渲染模块；不要提交其未交回文件。canal_rules_040 已交回规则/24测试，正在只读审查 root 同行集成；canal_save_040 已交回 save/130测试、停止写入。root 独占其它代码、Git、构建、浏览器、部署。当前无浏览器或生产预览进程；白盒旧 preview4193 可留，白盒矩阵已完成不要重跑。

下方为历史记录。持续开发，不停在本里程碑；按照 docs/superpowers/plans/2026-09-11-market-production.md 与 qa/REVIEW_070_WHITEBOX.md 继续。

# 最新覆盖 · 小集白盒已通过，转正式制作

2026-09-11。十二项代表场景已齐备，同revision3/CUicfkSa与运行源SHA；不是单次完整矩阵。详见qa/REVIEW_070_WHITEBOX.md与qa/whitebox/market-review.json。root已在用户自主续作授权内决定进入正式P1–P5，计划docs/superpowers/plans/2026-09-11-market-production.md，允许开始四组美术与独立第七图/真实双向连接/同行/严格v6迁移。公网仍0.6，不能用白盒证据部署生产。

最后phone R5 supervisor1171140已结束exit0，threat-zero/open-threat均HP2，分别MP0/6。所有白盒浏览器都已结束；preview4193 PID1156261仍可用。下一步提交推送本里程碑，从此HEAD创建正式工作树.market-070-production（实际路径/分支以随后Git结果为准）。以下旧活动状态仅历史，勿按仍RUNNING重跑。

# 当前入口 · 0.6已发布，继续0.7集口白盒

用户最新“继续，別停”，已授权持续自主设计、实施、测试、Git里程碑推送与既定公网部署；不重新询问已确认事项，不另建推断Goal。当前worktree `.worktrees/market-070`、分支`feat/market-070-whitebox`，最近运行源码db5ac65已推送。读AGENTS和本入口；研究沿docs/research，不读旧聊天/全书，不碰smbb和starvein-companion-cards。

## 已发布基线（不要重做）

0.6「背墙旧窑」公网 https://mekanuo.github.io/xian-ni-game/ （?v=0.6.0）。源码19dada6a2e4406d2b2a37b9093e06dc316f358f9，文档38bca1d，gh-pages f215b0cf3ff0039b8ffa941f7e956209ed922373；main工作树feat/return-stone-v1与kiln-060工作树/分支均38bca1d、已推送。正式包index-BTwh6Je1.js / index-B8Ldhq7K.css。

本地507测试/29文件、24命令、六检查全PASS，82runtime文件冻结一致；公网25资源哈希/source准确、真实旧档入口/键鼠/音乐/手机DPR3触控仿真均通过，root目视旧窑。Linux Chrome150，不代表实体Mac/Safari/手机。六图完整首版已发布；旧窑借还、棚角、烧屏与零灵力脱困、严格v5迁移已在0.6包含。qa/verification.json与publication.json继承的PASS只证明0.6。0.6验证/发布/公网进程全部结束，勿重跑矩阵。main忽略的dist仍旧0.5，禁止拿它部署；正确0.6dist在kiln-060。

## 0.7当前实际状态

独立白盒，正式游戏仍未加第七图/新存档/美术。设计ADVENTURE_070、MARKET_070_GEOMETRY_REVIEW、BUILD_BRIEF_070_WHITEBOX；生产候选MARKET_070_STATE_CONTRACT_DRAFT、MARKET_070_PRODUCTION_DECISIONS、ART_MARKET_070以及docs/superpowers/plans/2026-09-11-market-production.md。先完整六案两设备，再root在已授权范围收敛生产，不重复向用户确认。

唯一当前运行包 **market-whitebox-CUicfkSa.js / market-whitebox-DRyAUuGA.css**，revision **market-whitebox-3**。预览4193 PID1156261，http://127.0.0.1:4193/market-whitebox.html；独立vite config。40市场模型测试和tsc、独立build通过。沈砚原位470380→闩620440；保留北口L墙(1030,300,150,40)+(1150,300,30,180)，敌850560hp3、感知300、速度120、资源均未改。原点240760/北口1140240，货屋54080/540500、完整通道x523–797，私y397–483/公y797–903。是真实模型端口和UI动作；浏览器仅有readonly inspect/screenPoint/geometry，没有写状态接口。

### 第三布局已取得的实际PASS（不能相加当新全矩阵）

- `qa/whitebox/market-r4-core.json`，run2026-09-11T13-57-18-332Z，源码ddfd5b2：桌面pause/quiet/public-zero三案全PASS、exit0、errors=[]；私路完整返回HP2MP6。40模型与这些三案不是整版总数。原report/截图独立归档。
- `qa/whitebox/market-r5-encounters.json`，run2026-09-11T14-05-37-693Z，源码bdaab2b：桌面lure完整PASS HP1MP5，但接下来的threat-zero FAIL，因此该报告整体FAIL。实际交换→途中见敌waiting→直回180780→自主开门→原口接受→真实暂停后截图成立。
- **R7两个剩余桌面案已PASS、exit0，market-r7-threats.json/run2026-09-11T14-15-20-805Z。至此同CUicfkSa桌面六类行为齐备；手机六案尚未跑。** 所有旧geometry1/2 PASS/FAIL仅历史，不能当revision3通过。

### 浏览器接续入口

R7 supervisor PID1167787 **已结束exit0**，以下为完成证据：
- `/tmp/xian-ni-070-r7-threats.log`，结束写`.exit`
- `MARKET_CASE=threat-zero,open-threat MARKET_DEVICE=desktop MARKET_OUTPUT=qa/whitebox/market-r7-threats.json node scripts/market-whitebox-check.mjs`
- 源码db5ac65，新包仍CUicfkSa（本轮仅QA变动）。两案实际PASS，下一进程将跑手机六案，仍只一个浏览器。

上一批r4selected/r4core/r4encounters/r5encounters/r6threats/r6open都已结束。**只准一个浏览器**（软件GPU慢），不要并跑。长命令用Python detached supervisor+日志/exit文件，普通exec可能5分钟回收。root独占Git/build/browser/deploy，代理目前均停写。

## 最近QA修正与失败事实

R4新站位确实改善交易/停步，旧退路180500→180880→180780因原地观察+镜头多耗约4s败退。改直接180780后R4完成了原口接受但随后读状态倒下；去掉交换后固定2s等待，改实时观察真实waiting后响应，R5lure完整PASS。没改伤害/感知，没有清敌或回资源。

R6zero直回旁边HP1但第二次点原口前后倒下；R6open实际开门后新威胁和正确“门已开”对白/无重复exchange成立，但手动镜头停旧远处，找近身人物再找返路两次拖图，未出发即败退。完整FAIL及截图均已推送归档。最新db5ac65只改正常UI驱动：近身NPC时用已有“回身”恢复镜头；在正常对白已经冻结世界期间看原口并严格确认模拟不动；关闭对白后直接点原口自动实走+近身确认，不先点旁边再补一次入口。没有额外手动暂停通关，存活/真实威胁/实际接受仍必需。真实矩阵待检验此候选。

脚本当前六案quiet/public-zero/lure/threat-zero/open-threat/pause，支持MARKET_CASE/MARKET_DEVICE/MARKET_OUTPUT选案。部分PASS报告fullMatrixStatus仍NOT_RUN；不要伪改整矩阵PASS。phone驱动新改为实际点pan按钮+CDP单指touchStart/Move/End、finally关pan，CSS坐标不乘DPR；首测尚未跑，不再以手机环境鼠标拖图充触控。旧报告保留各自限制。

核心QA仍检查：实际碰撞/闭门NPC移动/到闩开门与侧让回摊；完整去程穿带+北口近身+真实原口返回，不把返程路标当独立反向分类；公共零资源走外侧y880可合法不惊敌；暂停待办/取消/对白后保持/途中人物与玩家路径/重开。短动作暂停提前取得真实按钮位置再鼠标/触摸点击，之后仍严查中途与冻结。截图只在实际结果后暂停，不靠截图把危险过程冻结。北返5秒读路包含真实镜头时间，不再5秒后另加拖图。

## 正式接入待办与工具

生产入口统一journey.complete（含独行），不改旧canal未接不可入/不可lastSafe。北口候选玩家1030220、同行1075260；旧1140365已经L墙否决。新图实际接旧渠高岸1100300/990350，西接石渡；目前只几何free/LOS局部探测，未真实跨图。双向方向位、实际visit/through/reported分开，同端局部探路不加永久账；exchange/door/NPC不重复存。许照在场需要集中判断，同时覆盖旧图雨棚regroup/dry、绳扣cooperate等借物件调用同伴入口，不能只藏NPC实体。门初次真实开、实际交换/出图/报告等有限checkpoint；retreat清visit不发through、retry完整恢复，内外独立严格v1–5→6迁移。详见生产计划，不提前声称已实现。

8fb7d10已加入verify/deploy输入+dist指纹，33工具测试及CLI拒绝路径通过；docs/VERIFICATION_BINDING.md。旧0.6无指纹PASS会被新deploy拒绝，不能拿它发布市场修改。未来正式整合完成才跑完整verify，一次冻结再部署，同源公网核验。

Git推送用 `git -c credential.helper='!gh auth git-credential' push origin feat/market-070-whitebox`，新稀疏文件git add --sparse；禁止强推/覆盖无关改动。接下来R7结果→手机六案→root生产决定→美术/实现/保存/正式整合验收与同URL部署。每个里程碑推送，勿在白盒或发布后停下等用户回来。
