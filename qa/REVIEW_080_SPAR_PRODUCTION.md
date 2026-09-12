# 驿后练场生产接入 · 当前证据

2026-09-11。这是生产中间里程碑，不是发行报告。公网仍0.7，继承的verification.json不适用于本批代码。

- 正式八图和contentVersion7；原样旧fixture独立外层/checkpoint迁移，保留实际HP/MP、起手、定位路线和余弹。专属149存档测试通过。
- 正式act/tick接线：近身约定，真正换位，三来向一源一手，停止后余弹真实推进，正常retry不补资源，同伴明确在驿等候，归驿事实报告。
- 根代理完整回归45文件956测试通过，日志本目录spar-production-model/full-model.log。TypeScript无报错。模型模拟/合成边界不冒称浏览器输入。
- 独立审查确认首章落笔未即时开门、桌边报告被旧渠话题遮挡；两项真实act RED→GREEN持久测试。没有改旧渠状态以让报告通过。
- 显式异常边界：合法一源HP>=2不会败退；为了验证恢复合同，在已发弹后将HP注入1，真实余弹致0时曾覆盖可用checkpoint。修复为败退时保留旧完整点，按旧点实际资源恢复；tests/spar-recovery GREEN。该注入不称正常玩家路径。
- 旧测试维护仅最终版本/地图数、新入口差异与合成历史来源剥除新字段；原fixture文件未改，原资源/世界/动作断言保留。8兼容专项434通过。

两张采用原图已目视并接线，真实浏览器专项进行中：

- R1 `spar-production-2026-09-11T20-46-20-243Z`：页面背景而非实际世界，首段行走超时；唯一原因未证实。
- R2 `spar-production-2026-09-11T20-52-31-136Z`：固定构建浏览器关闭，favicon404；已新增实际favicon文件，不过滤console错误。
- R3 `spar-production-2026-09-11T20-54-40-611Z`：Chrome字体服务明确ENOSPC→SIGABRT，详见design/SPAR_080_RENDER_DEBUG.md。
- R4 `spar-production-2026-09-11T20-56-38-302Z`：更换充足TMPDIR后，同固定JS/DPR实际渲染home/spar；完整定位导出与新context恢复、一手真实受击已断言，失败末态为home(1500,480)、HP3/MP4。脚本900,1220落在出口牌点击范围，实际已出门，等待地面坐标超时。整轮保留FAIL；脚本改为900,1160地面及意外转图快速报错，游戏出门逻辑不改。
- 根代理已目视R4 `desktop-hit-ready.png`，看到同场闻朔正侧与玩家背侧、圈线/墙体/完整身体。仅这一桌面静态构图，不冒称手机、全部朝向或全流程验收。

R5正在串行desktop/phone × hit/ward。其固定包为 index-DIvdulfV.js；源码后续暂停镜头/撑符朝向修正不在此包，需要重建另验。无完整0.8发行验证，不发布。

后续记录：cf2d2b1已成功推送。R5 desktop-hit 已完整PASS（定位保存/真实受击/归驿/报告/再次导入），其余组合仍运行；不得把单案PASS写为整轮通过。已目视R5桌边图并发现新纸位于桌沿前立面，局部移到(38,-62)桌面右上空位。修后r4 JS index-CD78guKs.js，tsc/build PASS，待实际三视口与纸片截图。

旧章12脚本仅更新迁移后的content7/八图、保留原样历史输入；market-view保留所有旧世界实体深等，仅从检查用克隆排除精确新增图/门。整版verify新接练场四案与三视口，使用本轮真实导出串接，尚未运行，不代表发行PASS。

## R5正式四组合完整通过

`spar-production-2026-09-11T21-03-32-592Z/report.json` 最终PASS、errors空，supervisor exit0。desktop/phone × hit/ward各从固定原样v6旧档经真实UI完成入场等候约定、定位/导出/新context恢复、正面单弹、实际受击或格挡、出门归驿、桌边报告和最终新context再载入。受击均HP3/MP4；格挡均HP4/MP3；同伴仍原脚点等候，旧账不改。根代理目视桌面归驿及手机入场/就位，人物全身与圈线可见。

该轮运行包仍DIvdulfV，不能覆盖之后的暂停镜头、撑符朝向、新纸片位置和手机回镜头按钮遮挡修正。手机ready截图明确显示两行dock挡住center，已局部增加spar-stop存在时的底部间距，下一构建需实际tap验证。固定修后r5包index-0pA0mHRI.js/index-D5XfOxnh.css，tsc/build PASS、preview4202；尚未实际验收。

## 朝向与镜头专项推进

- Facing r1在标题前Framebuffer Unsupported失败，不作为行为RED。r2 `spar-facing-2026-09-11T21-27-19-473Z` 实际东符/西行/停步后错误flipX=true，指定断言RED；修后 `21-29-06-445Z` 同操作PASS，root已并排目视人物与护符方位。
- Presentation r1桌面PASS、手机固定1秒未收敛FAIL；改实际收敛等待而非放宽误差。r2标题前Framebuffer Unsupported，原FAIL保留。
- Presentation r3 `21-38-59-678Z` 手机缩放已0.603333但中心894持续20秒，不能只说等得不够；依Phaser中心/滚动位置语义改用scroll+viewport/2。独立因果范围见design/SPAR_080_CAMERA_DEBUG.md，不唯一归因旧矩阵。
- Presentation r4 `21-47-51-121Z` 修后手机实际回镜头可点击、中心已899.5/870.5对目标900/870.898、就位暂停冻结通过。开始至收手间脚本几次locator调用耗时3.2秒，已发一弹；模型正确保留stopped/hurt:true、HP3/MP4、front:hit，但旧脚本强求无发弹导致FAIL。脚本减少无关往返，并按真实0/1源弹严格验证：无弹资源不变；有弹静立无障仍扣1HP并记实际hit，首停止原因保留，不删除余弹。该修订是收手合同的正确预期，不把原FAIL改PASS。
- r6固定构建CLyXa97I/D5XfOxnh，tsc/build通过。Presentation r5正在同包重新跑三视口；整版verify接入新活动正面四案、手机左右、三视口与朝向，尚未运行。

## 修后构图三视口通过（22:12 UTC）

Presentation R5标题前Framebuffer Unsupported，堆栈在Phaser WebGLRenderer.boot/createFramebuffer，尚未进入WorldScene；GL诊断为SwiftShader且8192上限。独立TMPDIR未彻底消除此启动故障，不声称唯一原因。新增仅本机QA的chrome-qa.sh采用Chromium文档显式ANGLE SwiftShader GLES参数，发行物不携带它。

R6实际启动后，零时长C按键被帧循环漏过；改真实keydown直到相机响应再keyup。R7手机相机已回身而HUD的110ms发布周期未到，改等待实际aria状态。所有原始FAIL保留。R8 `spar-presentation-2026-09-11T22-10-33-393Z/report.json` 桌面/手机/矮窗口全部PASS，errors为空：实际拖图与回身、自动构图、暂停冻结、收手实际0/1弹资源结算、原样归驿档桌面。root目视手机就位及桌面纸片、矮窗口构图：回身按钮脱离dock，新纸位于木桌上。仅Linux Chrome与触控/DPR模拟，并非真机或Safari。

固定受测r6 CLyXa97I/D5XfOxnh；接着同包手机左右ward、真实音乐post-fader与block计数核对。整版冻结34命令仍未运行，线上仍0.7。

## 手机左右完整链与声音通过

修后r6固定包上，左 `spar-production-2026-09-11T22-20-58-171Z`、右 `spar-production-2026-09-11T22-23-06-865Z` 均PASS/errors空，各从原样v6完成真实定位存档恢复、单弹格挡、HP4/MP3归驿报告及再导入。练场实际post-fader音乐RMS>0、同页面block计数增加、声音error为空；这不是扬声器录音或主观听感验收。root目视左右ready图，同场全身可见。

package与lock已升0.8.0，固定0.7来源SHA未变。独立冻结前QA复核无新确定阻断，详见design/SPAR_080_FINAL_QA_REVIEW.md。本阶段源码/画面专项准备提交，随后冻结完整34命令，不把局部PASS当发行PASS。

## 整版R1及圈心点选复现

冻结1b6d0ac的整版R1：45文件956测试/build通过，首个desktop/front/hit在走圈心时无path，120秒超时FAIL；qa/verify-080-r1保留完整报告/log。此轮没有进入其余浏览器矩阵，不部署。

只读DOM输入边界复现 `spar-production-2026-09-11T22-33-28-895Z`：点击实际世界(900.000014,939.999999)，当时peer(900,971)、40×40、phase=positioning。点在人像范围(931,971)内，entityAt命中闻朔，sparCanTalk在有run时为false，正确不发地面移动；同位置旧脚本要求path的假设错误。这次不是标题环境故障，也不是按键失灵。

脚本现在等待实际闻朔走离圈心90单位后再点地面，不改人物轨迹/模型/资源/存档，也不注入坐标；保留定位阶段跨context导出恢复。只读pointer日志记录实际输入落点和peer，为后续取证。对应desktop/hit复验正在进行，结果未预填。

修正后 `spar-production-2026-09-11T22-37-14-430Z` desktop/front/hit完整PASS，真实圈内行走path已产生，定位导出恢复、一源hit/实际HP3MP4/音乐hurt计数、归驿报告与再次导入全部通过；errors空、exit0。游戏运行包仍CLyXa97I/D5XfOxnh。接着冻结修订QA重新完整verify。

## R2整版结果、稀疏输入恢复与矮窗修正

整版R2 a04d4a1：956模型/build、正面四案、手机左右、三视口与朝向全PASS；进入market-view前缺少已提交但稀疏未检出的15:13旧入口JSON，整体FAIL。qa/verify-080-r2保留结果。已精确恢复15:13/15:48两份原历史导出并逐字节对照HEAD，两者仍content6；verify增加开测前存在检查。新练场PASS不替代旧章完成。

root审查R2短窗截图发现暂停牌遮住闻朔头身，先前脚本通过只证明原有镜头/冻结条件，不证明所有HUD无遮挡。补实际头/躯干/脚位置的elementFromPoint检查，23-07-43短窗指定RED记录暂停按钮遮头身；局部CSS将短桌面练场暂停牌移至左资源栏下。新r7 DwjNP5Si/DzkGuDoj构建通过，23-11-14同短窗检查GREEN，root目视完整身体与左侧暂停牌。此检查针对交互控件，不替代非交互文字或全部主观视觉审查。

market-view恢复输入后的23-03-31实例因20秒墙钟等门超时FAIL；错误采样中真实门已开，NPC实际速度/开门事件与checkpoint一致，详情design/MARKET_080_VIEW_DEBUG.md。不改游戏速度/条件，只将这段物理开门观察限定90秒并记录前后实际时间/位置，复验进行中。

market-view修订复验 `qa/evidence/market-view-2026-09-11T23-11-34-796Z` 全三视口PASS，真实idle/walking/物理open与冻结通过，原资源/路线/报告不增；waiting仍不在此专项，不偷改NOT_RUN。新游戏构建DwjNP5Si/DzkGuDoj，接着冻结34命令R3。

## 0.8 整轮 R3 的旧市场前提修正

R3（qa/verify-080-r3）956模型/build、新练场六路线/三视口/朝向及市场三视口通过，market-threat未建立闭门停步条件，整轮FAIL。实际成交时敌人y775.203，比0.7原PASS的723.378远；NPC先开门再返摊停步，脚本一直等closed导致站到死亡。市场规则未改。独立因果审查见design/MARKET_080_THREAT_DEBUG.md，原失败保留。

QA改为实际观察敌人绕到西侧x<540/y≤725后再交谈；门若提前开则立即前提FAIL。未改状态/资源/游戏时钟或删除closed条件。专项2026-09-11T23-45-29-811Z（qa/evidence/market-threat-080-r2.json）exit0/PASS，errors空：NPC514.567/397.827真实waiting且门closed；玩家实际退开后NPC536.850/406.740继续leading，HP4/MP5、敌HP3保留。root目视waiting-closed-door.png。普通暂停用于取景/冻结断言，不冒称连续战斗画面。

verify调整执行顺序为旧市场威胁优先、新练场最后；仍全34命令同一冻结构建，不拼接前轮PASS。接下来新冻结整轮R4，当前qa/verification.json仍FAIL且公网未部署0.8。

## R4 旧同行准备输入：呈现就绪修正

R4归档qa/verify-080-r4：956模型/build与所有市场专项/两设备完整往返PASS；journey桌面完整与独立暂停保存PASS，手机home→creek后点工棚出口超时，整轮FAIL。原玩家停在298.652/372.815，意图出口1640/370，未受伤/暂停/对白；原报告缺少该次事件坐标，不能把后续观测冒充同一次重现。

加入DOM观测的手机诊断全流程PASS（qa/journey-input-diagnostic-r1），只算复现未发生，不当修复。独立entry-r1直接捕获按钮click后模型creek、音景home、呈现tao/xu、相机view.x1341，出口仍投影254.5/223.95；证明模型先切而画面尚未刷新这一时序实际存在。对应原失败偏移是强支持，未独立取得Phaser内部worldX。

脚本sceneReady按page/scene等实际音景与实体对应，再跨两个真实rAF使相机preRender更新，才取worldTap坐标。导入清该观察缓存，不改游戏状态、规则或暂停连续领路。修后entry与phone完整串行exit0/PASS（qa/journey-render-green-r2），完整完成时间2026-09-12T00:28:39.061Z，leadership/creek/rest/home/restart及separatePauseSave全部有真实证据。DOM反投影与事件后真实path/交互共同印证，不称独立Phaser世界点测量，也不保证所有活动镜头永远静止。

审阅见design/JOURNEY_080_RENDER_FIX_REVIEW.md；随后仅将诊断失败截图按entry/pause/complete分名并明确projectedWorld命名，成功输入路径不变。完整verify明确complete/all/固定默认源，入口专项不能顶替整轮；执行顺序旧同行/旧章→市场→练场，仍34命令。下一冻结整轮尚未通过，不部署。

## R5 整轮进行中的目视记录

冻结e4c4887，游戏DwjNP5Si/DzkGuDoj。完整桌面/手机同行及各自独立暂停存档恢复已PASS；整轮尚未结束。root查看本轮journey-view-short-1280-dpr1-home-paper.png和journey-view-phone-390-dpr3-north-mark.png：矮窗桌面纸片在木桌范围，手机两个人物与路旁标记可辨，操作区与场景分开。只记录这两张图的实际所见，不扩大为所有视口均目视通过；存档载入提示为暂时覆盖层。后续全部检查与公网发布仍待实际结果。

## R5 旧窑自然烧尽的墙钟等待

R5前六命令PASS，第七kiln-consequences因60墙钟秒只推进约3.77模拟秒而超时；board仍burning/timer8，HP4MP3，不是火球失效。qa/verify-080-r5保留原整版FAIL。仅延长自然烧尽观察至300秒，记录实际时间，不改游戏。专项qa/kiln-burn-green-r1 exit0/PASS：185.382墙钟秒推进11.8667模拟秒后timer0/burned，原样保存新context恢复、不能完好归还、实际重入仍烧毁、重开均通过。root目视burned图。其余旧章时限静态风险记录design/VERIFY_080_TIMING_REVIEW.md，未复现的不改为FAIL。下一轮仍全34项冻结验收。
