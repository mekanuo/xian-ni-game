# 《仙逆：山门之外》当前交接入口

2026-09-11。用户最新要求“继续，别停”，已授权自主开发、测试、里程碑推送、既有Pages部署。不要等待重复确认；不用旧聊天、不重做全书分析、不碰封版smbb/starvein。研究在docs/research。首版Goal早已完成，不推断创建新Goal。历史入口已清理，必要历史看Git和docs/PROGRESS，而不是重跑已通过工作。

## 最新覆盖：角度与换位通过，准备构建/提交并转正式局部设计

左右手机每侧五案通过：qa/whitebox/spar-2026-09-11T20-03-49-416Z 与20-04-35-390Z。朝北错误护符手机因真实略前方来弹而blocked的原FAIL保留19-58-24目录；改明确背向而不缩旧护符形状。共享精确切线cos残差用±1e-8修正，三步长RED→GREEN，独立99组合保留实际斜向防护。25相关专项、全套38文件778测试PASS。

positioning从直穿圆心改局部外圈站位路径；接近玩家40内时停步。模型8角度/换位合同过；桌面/手机实际两轮约定、侧移后绕场、HP/MP连续保留PASS：qa/whitebox/spar-reposition-2026-09-11T20-06-36-271Z。原20-05-43桌面绕南侧时脚部约5.42CSS像素越界FAIL保留；局部镜头600×560改600×600后通过。全部浏览器已结束。

最终角度构建C1djUCc3/BZ_eM12M已成功；preview4197 PID1224876指向/tmp/xian-ni-spar-angles-080。构建手机右侧背向护符受伤PASS，qa/whitebox/spar-2026-09-11T20-12-59-891Z。源码/构建SHA与全测试日志见qa/whitebox/spar-angles-model。全部浏览器结束。下一步提交推送本里程碑，收束SPAR_080_PRODUCTION_DRAFT后写生产艺术/构建/实施计划，开始正式制作；不发布白盒。

canal_save_040已交回SPAR_080_SAVE_INTEGRATION.md，root已读；全部代理停写。报告建议唯一enemy身份局部交谈例外、整体8图v7迁移/保留真起手余弹、通用retry/retreat满资源冲突、独自练场不新造同伴。root草案部分尚待按这些风险定案（同伴、历史事实、恢复），不是批准报告中的全部建议。下面早期说明以本覆盖为准。

## 当前任务与树

- 活动工作树 `/home/zhangjingzhou/workspace/xian-ni-game/.worktrees/cliff-080-space`，分支 **feat/spar-080-whitebox**；9d0d983设计、9cc63e3模型、75e5ec0正面可玩灰盒均已推送。当前左右来向/换位实际验收全部完成，准备提交本里程碑。
- 当前一手正面守线灰盒通过：模型11项、共享全套36文件764测试，tsc、独立生产构建、桌面/手机真实11案及后续手机图像/构建检查。详见 **qa/REVIEW_080_SPAR_WHITEBOX.md**。不得称完整第八章或真人试玩通过。
- 碎崖空间r1/r2已搁置并原样归档 `qa/whitebox/cliff-space`；不要恢复当前失败布局。主动火球第二闸口也依据 `design/SPAR_080_OFFENSE_GATE.md` 否决：约0.1秒观察后反应窗，不改旧数值补救。
- **下一步执行 design/SPAR_080_ANGLE_GATE.md**：一手规则保留，实际约定正面/左侧/右侧位置，NPC亲自走过去。模型RED→实现→手机实际不同侧身/错误护符失败与镜头检查；通过后再收敛正式地点、人物回响和旧档规则，不直接发布白盒。继续推进，不停在里程碑。

## 当前进程/所有权

所有代理已交回并停写，root独占实现/Git/构建/浏览器。最近浏览器R5 supervisor1219591已exit0；R6与R7均已完成PASS，无活动浏览器。

独立Vite4195 PID1218678，dev入口 `/spar-whitebox.html`。独立已构建preview4196 PID1220674，目录 `/tmp/xian-ni-spar-guard-080`，是当前正面白盒快照；新改源码不会改变此包，若验收新改动须重建。勿混为正式发行。

## 正式线上0.7（已全部完成，不重做）

公网 **https://mekanuo.github.io/xian-ni-game/**，可加?v=0.7.0。源码/整版QA371957ee9a86983f818d06dd411d0493fa627bb3、最终说明25757229af10a1000b78ae16156cdadd127d18ea已推送；gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。35文件749发行测试、29命令与六判据全PASS；公网29资源字节匹配及真实输入/声音/旧档续玩、新章实际入口通过。见docs/RELEASE_070.md。

正式保留树 `.worktrees/market-070-production` / feat/market-070，HEAD2575722，受测dist有效。主工作树feat/return-stone-v1同HEAD已推送，但其ignored dist仍旧0.5，绝不从那里部署。当前白盒分支继承qa/verification.json仅是0.7报告，不可用于任何新代码发布。默认master仍legacy，未擅自换默认分支。

## 继续工作惯例

稀疏检出用git add --sparse；Git推送用 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`。按实际里程碑及时推送，不强推。一次一个浏览器；长预览/套件用脱离短会话的进程和log/exit，避免五分钟会话结束杀服务。用户界面不放研究/实现细节（灰盒明确例外），开发文档分清模型、实际运行、主观体验与正式发布。
