# 出山看水小样执行计划

依据design/OUTBOUND_090_DISCOVERY_WHITEBOX.md；用户已授权自主执行。0.8生产树冻结，本树独立执行。

1. 模型与测试：独占src/whitebox/outbound-discovery-model.ts、tests/outbound-discovery.test.ts。先写真实移动/近身/目击/建议/暂停合同，运行`npx vitest run tests/outbound-discovery.test.ts`保留缺模块RED；实现后同命令GREEN并`npx tsc --noEmit`。不改旧章节文件。
2. root实现outbound-discovery.html、src/whitebox/outbound-discovery-main.ts及.css。Phaser同源角色/水面资产、可见岩台与水域、实际脚点、跟身相机、桌面与触控；用WebAudio循环噪声滤波形成风/水连续混合，只在用户输入解锁，暂停冻结场景不伪造观察。无API密钥/新依赖/正式schema。
3. root审查模型和界面接口，运行受影响小样测试/tsc。独立构建输出至cache中的固定目录，不能覆盖0.8dist；Git提交并推送feat/outbound-090-layout。
4. 等完整0.8及公网检查释放唯一浏览器，再实际输入检查最大风险、截图和声音状态；按事实记录通过/失败。小样不得随0.8发布，普通自动测试通过不能说风景有趣或0.9已完成。
