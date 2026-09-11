# 《仙逆：山门之外》当前交接入口

2026-09-11。用户最新要求“继续，别停”，已授权自主开发、测试、里程碑推送、既有Pages部署。不要等待重复确认；不用旧聊天、不重做全书分析、不碰封版smbb/starvein。研究在docs/research。首版Goal早已完成，不推断创建新Goal。历史入口已清理，必要历史看Git和docs/PROGRESS，而不是重跑已通过工作。

## 当前覆盖：正式模型与美术已接，真实浏览器验证中

活动树 `.worktrees/cliff-080-space` / `feat/spar-080-whitebox`，最新已成功推送 cf2d2b1。45文件956模型测试、149严格存档专项、tsc通过；cf2d2b1已提交并推送闻朔/玩家背向原图、spar-art、scene/ui美术镜头接线、正式浏览器脚本及R1–R4证据。当前后续为桌面纸片移位、可选市场续档、整版验收串接和QA脚本。不是0.8发布；package仍0.7.0/content7候选。

两张母版 public/assets/spar-wenshuo.png 与 spar-player-back.png 已内置imagegen生成、原样复制并目视，所有imagegen已结束。R4桌面实际入场、约定、定位存档跨context恢复、一手受击、原HP/MP归驿已发生，ready图已目视。但脚本误把出口牌当作地面，角色已归home还等待旧图坐标，整轮FAIL保留。脚本已改地面900,1160并增加意外转图明确失败。

当前R5独立supervisor1236616，串行desktop/phone × hit/ward；四案完整链全部PASS，最终报告errors空，21:24:45UTC结束，.exit=0。日志 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-browser-r5.log`，结束写同名.exit。必须先核对运行状态，一次一个浏览器。固定preview4199 PID1235521，目录 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-production-080-r2`，JS index-DIvdulfV.js。源码后续的暂停镜头/撑符朝向已进入r3 BG9BMbbu包；实际R5桌面截图又发现新记事纸在桌沿下，将它局部移至桌面(38,-62)，r4 CD78guKs包、preview4201 PID1239474，目录 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-production-080-r4`，tsc/build PASS。R5不是这些后续修正的验证。

环境：/tmp为接近满载的tmpfs，R3Chrome字体服务明确ENOSPC→SIGABRT，R4改TMPDIR后同JS同DPR恢复绘制。所有后续浏览器用 `TMPDIR=/home/zhangjingzhou/.cache/xian-ni-qa/tmp`。不要删除他人临时文件。R1空白画面唯一原因未证实，R1–R4原FAIL保留。详情 design/SPAR_080_RENDER_DEBUG.md。

局部正式合同 design/SPAR_080_GAME_DESIGN.md；生产 brief/plan 已写。新闻朔原同阶散修、一源一手/实际余弹；同伴在真实驿内脚点主动等候，练场无新许照；只有真实来向/结果事实、桌边报告去重；正常retry/retreat不可补满，异常defeated完整checkpoint按实际资源回滚。火球仍禁用。碎崖/主动火球否决不重启。

root独占Git/浏览器/源码接线。canal_art_040的scripts/spar-presentation-check.mjs已交付/root接管，canal_save_040兼容报告已交付停写；canal_rules_040目前只写scripts/spar-facing-check.mjs，实际复现东符西行停步方向（不跑浏览器）。不要重复分派或重做已过白盒；下一步R5结束后用r4包跑spar-presentation-check（三视口/C/暂停/收手/实际桌面），输入R5实际positioning-paused与reported-paused导出，须TMPDIR。随后朝向与左右正式视图、冻结整版回归，测试通过后再原Pages发布。

## 正式线上0.7（已全部完成，不重做）

公网 **https://mekanuo.github.io/xian-ni-game/**，可加?v=0.7.0。源码/整版QA371957ee9a86983f818d06dd411d0493fa627bb3、最终说明25757229af10a1000b78ae16156cdadd127d18ea已推送；gh-pages29a15fe186cb3f624308810f9de34cc38f9575ac。35文件749发行测试、29命令与六判据全PASS；公网29资源字节匹配及真实输入/声音/旧档续玩、新章实际入口通过。见docs/RELEASE_070.md。

正式保留树 `.worktrees/market-070-production` / feat/market-070，HEAD2575722，受测dist有效。主工作树feat/return-stone-v1同HEAD已推送，但其ignored dist仍旧0.5，绝不从那里部署。当前白盒分支继承qa/verification.json仅是0.7报告，不可用于任何新代码发布。默认master仍legacy，未擅自换默认分支。

## 继续工作惯例

稀疏检出用git add --sparse；Git推送用 `git -c credential.helper='!gh auth git-credential' push origin feat/spar-080-whitebox`。按实际里程碑及时推送，不强推。一次一个浏览器；长预览/套件用脱离短会话的进程和log/exit，避免五分钟会话结束杀服务。用户界面不放研究/实现细节（灰盒明确例外），开发文档分清模型、实际运行、主观体验与正式发布。

## 下一整版验证前必须处理

先将 package.json/package-lock.json 正式候选升至0.8.0，再跑完整verify。main-route/playthrough按包版本写qa/fixtures/return-*-v${version}.json；若仍0.7会覆盖本轮练场使用的固定历史return-main-v0.7.0.json。当前尚未运行完整verify，历史字节仍保留。

root已排队facing RED supervisor1240277：仅R5 .exit=0后才对旧4199包启动一个浏览器，日志 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-facing-red-r1.log`，结束同名.exit；不要与它并发浏览器。先验证其FAIL是否确实flipX，不把环境/超时当RED，再用4201修后包GREEN。

R5四案已结束，无活动production浏览器。facing RED r1未进游戏：Framebuffer Unsupported→标题超时，不能算正确RED，失败保留。当前仅facing RED r2 supervisor1241137，对旧4199，同TMPDIR、DEBUG=pw:browser；日志 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-facing-red-r2.log` 和.exit。下一步核对明确朝向断言FAIL后才能说RED。

手机R5 ready图发现center被两行练场dock覆盖，src/style.css局部spar-stop状态间距修正。最新受建candidate r5：preview4202 PID1241138，目录 `/home/zhangjingzhou/.cache/xian-ni-qa/spar-production-080-r5`，JS0pA0mHRI/CSSD5XfOxnh；tsc/build PASS，待实际QA。不要再对4201旧CSS运行手机修后验证。
