# 当前活动：出山看水独立小样

2026-09-12。feat/outbound-090-layout，root已按用户自主授权选NEXT_STEP A进入独立小样。两岩背战斗原型依旧搁置，以下旧入口保留为历史，不再重复其测量。

当前新增design/OUTBOUND_090_DISCOVERY_WHITEBOX.md及docs/superpowers/plans/2026-09-12-outbound-discovery.md，src/whitebox/outbound-discovery-model.ts/main.ts/css与outbound-discovery.html。模型9项真实输入测试PASS，tsc通过；独立Vite构建cache/xian-ni-qa/outbound-discovery-r2完成，JS DeZfMjJ5 / CSS _H7KwNtj。未开浏览器、未部署、未做正式存档。renderer只复用角色站姿，坐姿帧尚无，不把model.sitting当画面坐姿已实现。

0.8另树cliff-080-space正在完整R5（supervisor1273713，cache/xian-ni-qa/verify-080-r5.log/.exit），唯一浏览器仍占用。等它完成并部署/公网验收后才可以开本小样实际浏览器，不抢占、不写其冻结代码/包/dist。两个工作树dist分开。最新0.8源码e4c4887已推送，公网仍0.7。

本小样先检上方/下湾真实视听差异、人物自主换地/建议、桌面触控和暂停/重开。手机相机已按静态审查在观察点偏向水面，真实渲染尚待检；不宣称0.9完成或可正式试玩。执行原用户“继续，别停”，阶段提交推送后继续。

---

# 0.9 山外出行空间先验工作树

本树仅做 design/OUTBOUND_090_WHITEBOX_BRIEF.md 中第一组几何反例，分支feat/outbound-090-layout，基点c671ca2。不是0.8发行工作树，不运行deploy、verify或浏览器，不修改0.8冻结输入。正式0.8整轮R4仍在../cliff-080-space，由root独占浏览器；supervisor1264196，日志cache/xian-ni-qa/verify-080-r4.log。公网仍0.7。

基线45文件956测试PASS/exit0，原日志qa/whitebox/outbound-layout/baseline.log。当前不实现友方弹道/目标扩展、正式第九章/存档/艺术。先用现行模型检查公开初态的实际直达与受扰后的返路；所有初态注入只属于明确合成白盒，不冒称旧档/UI通关。原合同数值未经验证。用户已授权持续自主开发/里程碑推送，不问重复确认，不读原文/旧聊天/封版项目。

已完成：专项R2六项测量合同PASS、tsc exit0；普通/零MP初态直达3.875秒、返9.125秒均HP4；实际起手观察后同样无损往返。当前布局未证明友方用途，暂停该布局的友方实现。见design/OUTBOUND_090_LAYOUT_RESULT.md；canal_rules_040正于0.8树只写OUTBOUND_090_LAYOUT_REVIEW.md，至多建议一次几何修订。

R3补观察返端后2秒：四案HP4、原在途弹均已自然结清，但敌仍casting，不保证永久安全。六测量测试与tsc PASS；94740f4已推送。当前布局暂停，无该树活动进程/浏览器。正式工作回0.8 R4。
