# 0.8 发行脚本存档兼容静态审查

2026-09-11；活动树 `cliff-080-space` / `feat/spar-080-whitebox`。本报告只审查 `scripts/*.mjs` 的版本、场景清单及相关发行接线，未改脚本、源码或夹具，未运行浏览器、测试、构建或发布。行号对应本次读取的工作树，后续修改可能移动。

初次读取结论：**旧章发行脚本有确定的 v7 兼容阻断，不能原样跑完整发行矩阵。** 问题是检查仍要求 v6，不是据此证明游戏迁移失败。原 `verify.mjs` 首项 `market-view-check.mjs` 就会在成功导入后等待错误版本而超时。另有两项当前导出消费检查、可选续跑入口及新活动发行覆盖接线需要区分处理。

交回前更新：根代理已修改下表 12 个脚本的当前版本/八图检查，本代理只读复查已见变更；下表保留原问题定位，**不表示这些硬码仍待修**。根代理同时修复下述历史全世界比较。浏览器与完整矩阵尚未由本审查验证；可选 `MARKET_START` 和发行覆盖接线仍按后文单列。

## 判定依据

- `src/game/contracts.ts:64`、`model.ts:49` 当前正式状态为 contentVersion 7；`save.ts:107` 最终状态检查也要求 7。
- `save.ts:304–372` 保留缺省版本、2、3、4、5、6 的历史输入验证，再迁移成 7；checkpoint 独立递归迁移，不能把源文件版本和恢复结果混为一谈。
- 当前八图精确排序应为 `['canal','creek','crossing','home','kiln','market','spar','workshop']`。只在检查**当前状态或本轮当前导出**时添加 `spar`，不修改历史七图输入。
- `schemaVersion` 是 QA 报告/指纹格式；`package.json.version` 是发行版本；二者都不是 contentVersion，不能全局替换数字。

## P1：当前状态硬码 v6，成功迁移仍失败

以下最小修改都只替换当前版本期望与当前八图清单；原有任务阶段、资源、暂停、时间、位置、夹具来源断言须保留。无需改路线或放宽等待。

| 文件与行 | 当前失败条件 | 最小修改 |
| --- | --- | --- |
| `scripts/market-view-check.mjs:136` | UI 导入固定 v6 输入后，等待 `contentVersion===6` | 等待 7；第 29、31 行的源版本 6 保留 |
| `scripts/market-consequences-check.mjs:78` | 首次导入及后续真实当前导出重导入均等待 6 | 等待 7；第 127 行固定源文件版本 6 保留 |
| `scripts/market-check.mjs:81–82` | 当前恢复结果等待 6，并要求七图 | 等待 7，清单加入 `spar` |
| `scripts/journey-check.mjs:77–78,87` | 当前导入/续读等待 6、七图；checkpoint 要求 6 | 当前外层、checkpoint 均要求 7；清单加入 `spar` |
| `scripts/kiln-check.mjs:70–71` | 当前导入/续读等待 6、七图 | 当前版本改 7，清单加入 `spar` |
| `scripts/kiln-view-check.mjs:103–104` | 固定 v4 导入后等待 6、要求七图，迁移结果标签也写 6 | 当前版本及 `resultVersion` 改 7，清单加入 `spar`；`sourceVersion:4` 保留 |
| `scripts/projectile-cover-check.mjs:30` | 首章旧档成功恢复后，等待 contentVersion 6 | 等待 7，保留首章完成条件 |
| `scripts/life-check.mjs:123–124` | 当前外层和 checkpoint 均断言 6 | 二者改 7，保留旧任务初态及资源检查 |
| `scripts/canal-check.mjs:83` | 当前外层、checkpoint 要求 6，并要求七图 | 二者改 7，清单加入 `spar`，保留旧渠未接及资源检查 |
| `scripts/public-check.mjs:34,79,97,109` | 公网四组历史导入成功后仍等待 6 | 四处当前状态改 7；历史文件内容不变 |

`verify.mjs:23` 首先启动市场视口脚本；因此第一个上述阻断会出现在任何旧章后续矩阵之前。修好首项不代表其余已兼容。

## P1：本轮导出的消费者误要求旧格式

这两处输入虽叫 fixture，却不是永久历史夹具，而是上游脚本本轮通过真实设置导出的状态。

| 文件与行 | 输入及生产者 | 最小修改 |
| --- | --- | --- |
| `scripts/canal-view-check.mjs:20` | 第 9 行 `canal-ready-input.json` / `canal-phone-hold-verified-input.json`，第 6、23 行明确来自 `canal-check.mjs` | 版本断言及错误文字改成 7，精确八图；不得手动改 JSON 来满足断言 |
| `scripts/journey-view-check.mjs:19` | 第 9 行 `journey-ready-input.json` / `journey-complete-export.json` / `journey-desktop-paused-input.json`，第 6、22 行明确来自 `journey-check.mjs` | 版本改 7，精确八图；保持实际任务、共同成果、带势/定位状态检查 |

`verify.mjs:33,51` 已按生产者先于消费者串行安排。保持此顺序；单独启动视口脚本时，应先取得本候选真实导出，不能让旧证据冒充当前导出。

## 历史源文件版本必须保留

以下原始字节来自固定已交付历史状态。升级运行时不应重写它们或其来源说明。

| 检查位置 | 应保留的源版本 | 说明 |
| --- | --- | --- |
| `canal-check.mjs:166` | 2 | 真实 0.3 首章归来档 |
| `journey-check.mjs:176` | 3 | 固定 `return-canal-v0.4.0.json` |
| `kiln-check.mjs:143`；`kiln-view-check.mjs:20–21` | 4 | 固定真实 0.5 同行完成档；视口 metadata 的来源也是 4 |
| `market-check.mjs:89` 默认分支 | 5 | 第 11 行固定 `return-kiln-through-v0.6.0.json` |
| `market-view-check.mjs:29,31` | 6 | 固定时间戳 `market-2026-09-11T15-13-29-584Z/market-west-entry.json`；`BfRm4y9K` 是历史运行来源，不是当前包要求 |
| `market-consequences-check.mjs:127` | 6 | 第 9 行同一固定历史市场入口 |
| `market-threat-view-check.mjs:90` 默认分支 | 6 | 第 9 行固定 `market-2026-09-11T15-48-58-773Z/market-west-entry.json` |
| `spar-production-check.mjs:34` | 6 | 固定 `return-main-v0.7.0.json`；第 108–121 行的当前 7、八图和完整 v7 导出比较已经正确 |

更早没有 `contentVersion` 的输入仍保持缺省，不能补显式 1。此次 `scripts/*.mjs` 搜索未发现需要补删 `spar` 的合成降版逻辑；不要为了省事把当前导出删几个字段伪装成这些历史档。

## P1：历史全世界比较（根代理发现并已修）

原 `market-view-check.mjs:137` 将 `worlds` 与固定 v6 原档全量深等；即使改对版本，也必然因新增 `worlds.spar` 与 `home_to_spar` 失败。交回前已读到根代理第 137–141 行修正：先检查八图、练场角色与唯一新家门，再仅从检查用的克隆移除精确新增图/门，剩余所有旧图旧实体与原档深等。没有修改送进 UI 的字节，不是合成存档，也没有放宽旧实体一致性。

补查全部脚本的整体/字段深等与 checkpoint 比较后，未发现第二处同类跨版本全量比较阻断：

- `spar-production-check.mjs:110–114` 仅在源本来为 7 时全量深等；历史源逐项检查原字段及旧实体，当前新账独立初态检查，可保留。
- `market-consequences-check.mjs:82–83,143–147` 的 checkpoint 字符串比较来自同次已迁移后实际游玩、导出和死亡处理；两端都是当前格式，不能为了历史来源而放松。
- `ui-regression.mjs:21–26` 从同次当前新局自动槽取出 checkpoint 后再载入比较，双方是当前格式。
- `market-view-check.mjs:104,123–124`、`market-threat-view-check.mjs:117` 的整体深等比较暂停前后同一当前世界，仍应严格。
- `journey-check.mjs:164–168`、`journey-view-check.mjs:57,89`、`life-check.mjs:184`、`canal-view-check.mjs:42–43` 比较本轮状态或应保持的旧子账/NPC，不包含新增世界导致的结构差。

本段只判定跨版本比较是否必然不等；未声称实际浏览器暂停与死亡回退已在新候选通过。

## P2：可选 MARKET_START 当前续跑受限

- `market-check.mjs:11–12,89`：设置 `MARKET_START` 后固定要求源版本 6。传入本候选真实导出的 v7 市场入口，会在导入前被拒。默认完整 verify 在第 26 行明确清空 `MARKET_START`，因此这不是默认矩阵的额外阻断。
- `market-threat-view-check.mjs:9,90`：同样支持 `MARKET_START`，但统一只认 6；默认历史输入合法，传 v7 当前输入被拒。

最小处理：默认固定来源继续精确校验其历史版本；仅在明确指定续跑文件时接纳合法 6 或 7，记录实际源版本、路径、哈希，导入后统一要求 7。保留原入口、HP/MP、NPC、门及未交换条件，不能接受任意市场局面冒充同一用例。若暂不支持 v7 续跑，应明确参数仅接受历史 v6，不能用批量把源期望改成 7 的方式破坏历史重放。

## 发行接线与说明待办

1. **新活动未进入完整验证入口。** `verify.mjs:22–54` 的全部串行调用没有 `spar-production-check.mjs`，第 63–66 行也没有练场结果。修完旧章硬码后，现有 `verify` 可以在未跑练场浏览器的情况下产生 PASS；`deploy-pages.mjs:8–10` 只读取该 PASS 与指纹，不另检查练场案例。最终发行前应将定案的练场桌面/手机、受击/护符组合串入冻结包验证并记录选择与报告路径；不能仅以脚本存在或当前 R5 单独运行替代最终包接线。此项是覆盖缺口，不是声称 R5 已失败。
2. `verify.mjs:64` 的同行来源写着 `content 4 migration`，在本候选会误述当前恢复结果。保留 `content 3` 历史来源，结果改为当前 content 7，或明确“历史 v3 经当前运行时迁移”。
3. `market-threat-view-check.mjs:100–101` 默认历史导入后只断言场景/旧市场事实，不要求当前版本/八图。它不会因为 v7 自动失败；可补当前 7/八图断言，避免单独用它作为迁移证明时缺少结果格式证据。
4. `public-check.mjs` 当前最后一个新区域入口证据止于旧窑（第 106–123 行）；它不是练场公网入口覆盖。第 15 行递归检查整个 `dist` 字节，新增练场资源会自然纳入，不需要把资源数硬写成某个新数字。若发行声明包括练场公网可进入，须另有实际入口证据，不能把“资源都返回 200”称作该玩法已验证。

## 本次未发现该类阻断的范围

- `deploy-pages.mjs:21–24` 与 `public-check.mjs:7–15` 动态读取包版本、明确 sourceCommit、递归比对 dist；未见固定七图或 29 资源数量要求。
- `verification-fingerprint.mjs:14–16,57–74` 动态覆盖 src/public/tests/scripts 与 dist；新增 spar 文件在这些树中，不需因 contentVersion 改其指纹 schema。既有 QA 夹具不纳入指纹的限制仍保持，不扩展另一个夹具系统。
- `ui-regression.mjs`、`canal-revisit-check.mjs`、`kiln-consequences-check.mjs`、`life-hold-check.mjs`、`life-mobile-check.mjs`、`presentation-check.mjs` 等未见当前版本或全地图清单的过时精确断言。`market-consequences-check.mjs:82–83` 的完整 checkpoint 比较是同次当前导出往返，可保留，无需因为原始输入来自 v6 而放松。
- 独立 `kiln-whitebox` / `kiln-decisions` / `market-whitebox` / `spar-whitebox` / `spar-reposition` 脚本使用其隔离运行合同，不应强行加生产八图要求。旧地图实体数、敌人数、Canvas DPR、任务事实、资源量也不应被通用数字替换误改。

本报告不是游戏行为全审查，也不证明上述未发现版本阻断的脚本在新镜头、UI 或浏览器中已通过。最终应在根代理选定冻结构建后执行兼容修正后的矩阵；本次只交静态定位与最小修改建议。
