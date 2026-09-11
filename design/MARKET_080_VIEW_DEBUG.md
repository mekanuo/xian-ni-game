# 0.8 小集画面复验超时定位

2026-09-12。仅读取脚本、模型与既有运行证据；没有浏览器、模型测试、构建或源码修改。

**判断：本轮失败是“等待物理开门”的20秒墙钟超时，不是等待姿态未出现，也没有证据表明沈砚被新模型卡住。** 错误处理采样时，真实门已经打开，开门事件与checkpoint均已提交。该事实不能将整项FAIL改写为PASS，但足以排除“始终未开门／未兑现承诺”的初始判断。

## 原始证据与实际断言

- 正确报告路径：`qa/evidence/market-view-2026-09-11T23-03-31-318Z/report.json`。
- 原日志：`/home/zhangjingzhou/.cache/xian-ni-qa/market-view-080-restored-r1.log`。
- 实际JS：4203的 `index-CLyXa97I.js`，SHA256 `b5f579e098722bc27888d1cb87e55007f32dc079de24f1da0517f89e896d4d34`。
- 已采desktop west-sign、merchant-idle、merchant-dialogue、merchant-walking；idle和walking为PASS，waiting为NOT_RUN。短窗口和手机未进入本轮。
- 日志指向 `scripts/market-view-check.mjs:154:24`：恢复后等 `!defeated && market_door.state==='open'`，默认timeout来自`:47`的20000ms。
- 此脚本开头明确声明waiting不在本画面检查中，也没有引敌或等待waiting的输入。不能把“waiting:NOT_RUN”误读为失败条件。

## 真实状态链

| 采样 | 模拟时间 | 沈砚实际状态／位置 | 门 |
|---|---:|---|---|
| merchant-dialogue | 407.150000 | idle，(470,380)，对白market_talk | closed |
| merchant-walking | 407.166667 | leading，(471.856953,380.742781)，普通暂停取证 | closed |
| 超时后的failureState | 408.433333 | leading，(612.985410,437.194164)，未暂停 | open、solid=false |

最终玩家 `(420.208337,459.479495)`，HP4／MP6、无路径、无对白、未败退。散修仍 `(850,560)`、HP3、idle，seen=0、attack=0。market.exchanged=true，through／reported／passed全未新增。

实际事件seq94在407.15记下当面交换；seq95在408.433333记下“沈砚到闩边解开木门，随即侧身让出巷道”。嵌套checkpoint也是408.433333，门为open；没有通过恢复档注入开门。

从walking截图到失败采样只推进 **1.266667模拟秒**。沈砚移动约152单位，与120单位／秒完全相符；最后距闩点 `(620,440)` 约7.554944，满足模型开门的≤8条件。人物停在leading是刚到开门帧的合理状态，不表示她该在这一帧同时回到摊前。

## 对照模型：不是敌情停步或开门条件变更

`src/game/market.ts` 的npcTick仅在已交换后向闩移动，真实近敌可见才waiting，实际到闩且free才置open，并立即去掉solid。当前最终位置、事件和实体状态与这条链一致。

`src/game/model.ts` 在marketTick返回首次开门时调用checkpoint；失败档的checkpoint与开门时间一致，说明这一权威动作已经完成。checkpoint文本约30KB，没有证据证明序列化在本轮耗尽20秒，不能先把它作为性能根因。

玩家与敌距离超过其300感知距离，报告敌人一直idle且没有新alert／waiting事件；没有实际引敌前提。即使沈砚走近后与敌在300内，货屋仍可能遮挡视线，不能只按距离推断必须waiting。本轮无需修改NPC威胁半径、路径、开门距离或敌人状态。

## 超时含义与证据限制

`WorldScene.update` 将每显示帧的delta截在100ms，再以1/60推进模型。严重低帧率时，20秒墙钟不保证有20秒模拟时间。本轮末端只推进1.266667秒，恰好到开门条件，是固定墙钟等待预算与实际模拟进度不匹配的直接迹象。

但报告没有逐帧耗时、resume精确墙钟和开门事件墙钟；failureState是在超时捕获后另读的，所以不能声称Playwright“漏掉了超时前早已为真的条件”。更窄的解释是：条件在截止附近或截止后最后一次推进才成立，错误处理读到了新状态。也不能从这一报告唯一定位GPU、GC或其他具体主机负载源。

## 最小下一步，不放宽结果

仍保留真实门open、solid=false、exchanged、存活、原资源与后续画面／冻结断言。不能直接将failureState门开当作已采到open-door画面，也不删除物理开门检查或伪造waiting。

重验只需在恢复时和等待过程中记录实际模拟时间、沈砚坐标／状态及门状态，按这一段实际行程的推进量设置有硬上限的等待观察；若模拟时间已足够而门仍未开，应继续FAIL并检查真实威胁／碰撞。如果墙钟先到而模拟尚未走够，应报告运行速度／等待预算问题，不能称模型停止。

这是对等待条件实际含义的纠正，不是主观放宽玩法要求；本审查不替根代理改脚本或选择新预算。原FAIL与截图保留，后续新运行仍须从原历史fixture实际导入并完成全部所选视口。完成报告后停止写入。
