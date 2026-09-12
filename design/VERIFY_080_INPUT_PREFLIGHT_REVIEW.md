# 0.8 完整验证磁盘输入前置核对

2026-09-12；工作树 `.worktrees/cliff-080-space`。仅静态读取 `scripts/verify.mjs`、实际被调用的脚本、测试导入和磁盘 JSON；没有运行测试、浏览器、构建或 Git 操作。

结论：**未发现另一个缺失历史输入，当前资料不阻断 R4 启动。** 两份已恢复的 market 历史入口及固定 `return-main-v0.7.0.json` 沿用 HANDOFF 的确认，不重新做恢复或来源鉴定。以下“存在”只说明本次检查时当前工作树文件可读取、JSON 可解析，不等于重新完成迁移或真实游玩验收。

## 启动前必须存在的历史输入

| 完整验证中的读取者 | 实际路径 | 本次磁盘结果；前序覆盖风险 |
| --- | --- | --- |
| `market-check.mjs` 默认起点 | `qa/fixtures/return-kiln-through-v0.6.0.json` | 存在，content 5；无前序同名写入 |
| `journey-check.mjs:12,176` | `qa/fixtures/return-canal-v0.4.0.json` | 存在，content 3、home；无前序同名写入 |
| `kiln-view-check.mjs:9,19`、`kiln-check.mjs`、`kiln-consequences-check.mjs` 间接调用 | `qa/fixtures/return-journey-v0.5.0.json` | 存在，content 4、home；无前序同名写入 |
| `projectile-cover-check.mjs:29` | `qa/fixtures/return-ridge-v0.4.1.json` | 存在，content 3；无前序同名写入 |
| `life-check.mjs:11,107` | `qa/fixtures/return-main-v0.2.2.json` | 存在，旧式无 contentVersion；无前序同名写入 |
| `life-hold-check.mjs:11,106` | `qa/fixtures/return-ridge-v0.2.2.json` | 存在，旧式无 contentVersion；无前序同名写入 |
| `canal-check.mjs:13,162` | `qa/fixtures/return-main-v0.3.0.json` | 存在，content 2；无前序同名写入 |

`life-check` 和 `canal-check` 有缺文件时读取 `git show HEAD:path` 的既有后备分支，本次文件均存在，不依赖该后备；本审查也未调用它。`canal-revisit-check.mjs:13` 虽声明同名旧夹具变量，实际入口在第 87 行读取本轮渠线完成导出，不能误列为另一个旧档读取。

`npm run test` 位于所有浏览器之前，也有必须预先存在的文件：

- `tests/canal-variants.test.ts:3` 直接导入 **`qa/evidence/life-current-export.json`**。当前 content 6、workshop、`life.clamp='bag'`，满足其 `lifeHome()` 的明确起点字段；SHA-256 为 `1902baf5606e009ae32bb02f0181d5d29277a9d06af6502caaba44c10d2a9ef8`。本轮稍后的 `life-check` 会重写此路径，不能声称启动模型测试读的是尚未生成的本轮 content 7 导出。当前无缺失阻断，但此文件不能当作可在启动前全部清空的普通截图证据。
- 测试额外显式导入 `qa/fixtures/return-journey-paused-v0.5.0.json`、`return-ridge-v0.3.0.json`、`return-ridge-v0.3.1.json`、`return-main-v0.4.0.json`、`return-canal-hold-v0.4.0.json`、`return-main-v0.6.0.json`；这些均存在且可解析。其余显式导入与上表、已确认的固定 0.7 档重合。
- `tests/kiln-save.test.ts:9`、`market-save.test.ts:8`、`spar-save.test.ts:7` 使用 eager glob 读取 **当前存在的全部 `qa/fixtures/*.json`**。本次目录共 21 份，下表列清范围；显式反例测试所需旧式无版本、content 2/3/4/5/6 均有来源。glob 不会证明稀疏工作树之外没有别的历史文件，本结论只针对实际调用会读到的目录。

| 当前 glob 中的文件（均位于 `qa/fixtures/`） | contentVersion |
| --- | --- |
| `return-main-v0.2.2.json`、`return-ridge-v0.2.2.json` | 旧式无字段 |
| `return-main-v0.3.0.json`、`return-ridge-v0.3.0.json`、`return-main-v0.3.1.json`、`return-ridge-v0.3.1.json` | 2 |
| `return-main-v0.4.0.json`、`return-ridge-v0.4.0.json`、`return-main-v0.4.1.json`、`return-ridge-v0.4.1.json`、`return-canal-v0.4.0.json`、`return-canal-hold-v0.4.0.json` | 3 |
| `return-main-v0.5.0.json`、`return-ridge-v0.5.0.json`、`return-journey-v0.5.0.json`、`return-journey-paused-v0.5.0.json` | 4 |
| `return-main-v0.6.0.json`、`return-ridge-v0.6.0.json`、`return-kiln-through-v0.6.0.json` | 5 |
| `return-main-v0.7.0.json`、`return-ridge-v0.7.0.json` | 6；固定 main 来源确认沿用 HANDOFF |

## 本轮先生成、后读取的输入

这些不必在启动前有旧副本。正常默认完整调用顺序中，生产者成功退出后才启动消费者；不能把现存上一轮文件作为跳过生产者的理由。

| 先运行的真实导出者 | 后续磁盘读取与用途 |
| --- | --- |
| `journey-check.mjs:96,147,165` | `journey-view-check.mjs:9,19` 读取 `qa/evidence/journey-ready-input.json`、`journey-complete-export.json`、`journey-desktop-paused-input.json`；检查 content 7/八图。默认同行脚本先完成桌面与手机，再进入画面脚本 |
| `life-check.mjs:150,180` | `life-mobile-check.mjs:6,7` 读取 `qa/evidence/life-shade-ready-input.json`、`life-current-export.json`；`presentation-check.mjs:18` 也读取 shade 文件 |
| `life-hold-check.mjs:127` | 自身保存再读取，随后 `presentation-check.mjs:23` 导入 `qa/evidence/life-hold-paused-input.json` |
| `canal-check.mjs:96,98,121` | `canal-view-check.mjs:9` 读取 `qa/evidence/canal-ready-input.json`、`canal-phone-hold-verified-input.json`；之后 `canal-revisit-check.mjs:87` 读取 `canal-desktop-diversion-complete-export.json` |
| `spar-production-check.mjs` 的本轮桌面 front 案 | `verify.mjs:80,90,95` 从本轮报告挑选 runId 目录内 `positioning-paused.json`、`reported-paused.json`，显式传给 presentation/facing；没有依赖上次 runId 的默认入口 |
| `playthrough.mjs`、`main-route-check.mjs` | `verify.mjs:61,64` 读取当轮 `qa/evidence/playthrough-draft.json`、`main-route.json`；当前包 0.8.0，另导出 `qa/fixtures/return-ridge-v0.8.0.json`、`return-main-v0.8.0.json`。版本保护问题已由主线处理，不另立阻断 |

`kiln-check` 的 `kiln-phone-returned-export.json`、`kiln-burned-export.json`、`kiln-player-overlap-export.json`，以及 market、spar、life-mobile 的存读对照，均为当前脚本实际下载后再读回文件/字节；它们不是未准备的历史前置。`kiln-view` 仍直接读取固定 0.5 完成档，运行顺序在 kiln-check 前也不缺中段文件。`kiln-consequences-check.mjs` 只是将 route 改为 consequences 后导入同一 kiln-check，未隐藏引入另一份旧档。

没有找到会在后续旧档读取之前，被前序脚本同路径写成新版本的其他固定输入。`life-current-export.json` 是明确的例外：模型测试先读旧内容，life-check 后写当前内容，随后手机读新内容；这是当前真实依赖顺序，不是资料缺失。

## 适用边界

- 以上以 verify 默认完整分支为准。`verify` 没有清空 `JOURNEY_ROUTE/JOURNEY_PHASE/JOURNEY_FIXTURE`、`CANAL_ROUTE/CANAL_FIXTURE`、`LIFE_FIXTURE/LIFE_SHADE_EXPORT/LIFE_CURRENT_EXPORT`；外部显式覆盖会改变来源或跳过某些生成者。例如 `JOURNEY_PHASE=pause` 会先读现存 ready，`CANAL_ROUTE=desktop` 不产生随后 view 所需 phone verified。检查时本审查进程没有这些覆盖变量；不代替主线启动环境记录，也不据此声称 R4 受污染。
- SHA 指纹模块目前绑定源码/工具/构建产物，不绑定整个 QA 输入目录。这次核对补充的是实际磁盘前置清单，不自动证明每份 JSON 的历史真实性或本轮运行结果。两项已确认 market 输入与固定 0.7 main 来源继续以 HANDOFF 为准。
- 报告完成即停止写入；没有更改稀疏设置、输入 JSON 或任何受测文件。
