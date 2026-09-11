# 《仙逆：山门之外》当前交接入口

2026-09-11。用户最新要求“继续，别停”，已授权自主开发、测试、里程碑推送、既有Pages部署。不要等待重复确认；不用旧聊天、不重做全书分析、不碰封版smbb/starvein。研究在docs/research。首版Goal早已完成，不推断创建新Goal。历史入口已清理，必要历史看Git和docs/PROGRESS，而不是重跑已通过工作。

## 当前覆盖：生产接线开始

03ad999 角度/换位里程碑已成功推送 origin/feat/spar-080-whitebox。28项定位几何与白盒专项、tsc 已通过；定位路径与让路判断抽入 src/game/spar-geometry.ts 供正式复用，不改数值或旧行为。正式局部合同 design/SPAR_080_GAME_DESIGN.md 已按自主授权收束，旧草案仅作跳转；生产 brief/plan 已写。不是正式新图完成或已发布。

同伴定案：入口主动约她在真实驿内位置等候，练场无新许照；历史仅九种真实来向/结果事实，回桌边报告去重；正常练习无 retry/retreat 补满，异常 defeated 仅完整 checkpoint 实际资源回滚。火球仍整场禁用，余弹必须真实结清。

活动树 .worktrees/cliff-080-space / feat/spar-080-whitebox。根代理独占 Git/浏览器/接线。canal_art_040 独占 design/SPAR_080_ART_DIRECTION.md；canal_rules_040 独占 src/game/spar-state.ts 与 tests/spar-state.test.ts；canal_save_040 评估报告已交回，尚无写入任务。

dev4195 仍指向本树白盒；preview4197 为角度固定快照 C1djUCc3/BZ_eM12M，/tmp/xian-ni-spar-angles-080。当前无活动浏览器。QA见 qa/REVIEW_080_SPAR_WHITEBOX.md；碎崖/主动火球否决不重启。下一步正式状态与八图/存档接入，艺术方向完成后制作视听。持续推进，不停在文档。

## 正式线上0.7（已全部完成，不重做）

公网 **https://mekanuo.github.io/xian-ni-game/**，可加?v=0.7.0。源码/整版QA371957ee9a86983f818d06dd411d0493fa627bb3、最终说明25757229af10a1000b78ae16156cdadd127d18ea已推送；gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。35文件749发行测试、29命令与六判据全PASS；公网29资源字节匹配及真实输入/声音/旧档续玩、新章实际入口通过。见docs/RELEASE_070.md。

正式保留树 `.worktrees/market-070-production` / feat/market-070，HEAD2575722，受测dist有效。主工作树feat/return-stone-v1同HEAD已推送，但其ignored dist仍旧0.5，绝不从那里部署。当前白盒分支继承qa/verification.json仅是0.7报告，不可用于任何新代码发布。默认master仍legacy，未擅自换默认分支。

## 继续工作惯例

稀疏检出用git add --sparse；Git推送用 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`。按实际里程碑及时推送，不强推。一次一个浏览器；长预览/套件用脱离短会话的进程和log/exit，避免五分钟会话结束杀服务。用户界面不放研究/实现细节（灰盒明确例外），开发文档分清模型、实际运行、主观体验与正式发布。
