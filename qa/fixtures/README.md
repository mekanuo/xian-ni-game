# 实际通关导出档

`return-main-v0.2.2.json` 与 `return-ridge-v0.2.2.json` 均由 0.2.2 最终 `npm run verify` 中的完整浏览器实际输入路线生成。两路均新建人物、实际通行、归家桌旁结局、关闭结局，在设置点击“导出存档”后由 Playwright 保存下载。输入轨迹与结果分别在 qa/evidence/main-route.json 与 run.json。没有模型注入、传送或手写完成进度。

用途：后续版本通过实际导入入口验证旧档迁移与续章，而非绕过首章测试。字段可能包含玩家名，但此处仅使用固定测试名“行舟”，不含真实个人资料。

原始 0.2.2 生成证据固定在提交 `39e4aed` 的 `qa/evidence/main-route.json` 与 `qa/evidence/run.json`；当前分支同名证据会随新候选验证更新。两个 `v0.2.2` 文件保持原始字节，0.3 完整首章路线另导出 `v0.3.0` 文件。

0.3 委托路线通过设置导入旧完成档，再用真实输入导出 `qa/evidence/life-repair-ready-input.json`、`life-shade-ready-input.json` 与 `life-current-export.json`。手机关键工序从这些实际中途下载接续；留势路线另导出 `life-hold-paused-input.json`，验证物件悬停时保存、恢复和继续试压。是否通过以对应 `life-check.json`、`life-hold-check.json`、`life-mobile.json` 的实际结果为准。

本轮0.6候选的首章两路也按真实输入导出 `return-main-v0.6.0.json` 与 `return-ridge-v0.6.0.json`，用于当前格式回读，不能称为历史版本迁移证据。0.6新窑从固定的 `return-journey-v0.5.0.json` 开始；它和暂停同行输入 `return-journey-paused-v0.5.0.json` 都保留已发行0.5的原始实际导出字节。
