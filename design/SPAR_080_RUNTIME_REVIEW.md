# 驿后练场：正式运行接线独立审查

2026-09-11。范围为正式 `spar.ts`、`model.ts` 的动作／换图／交谈／每小步接线，与 `SPAR_080_GAME_DESIGN.md` 对照。只写本报告，使用临时内存脚本；无源码／测试修改，无浏览器、构建、Git 或整版测试。存档代理仍在完成迁移；下列真实导档均使用当时已经能正常恢复的原样 `qa/fixtures/return-main-v0.7.0.json`，没有把开发中的缺模块错误算作产品缺陷。

结论：找到两项正常流程阻断、一项已明确异常恢复合同的边界失效，以及一处误导性点击提示。问题均已先通知 root。root 已接手修复，正常世界响应2项已GREEN，异常恢复修复的专属测试正在核验；全部仍待整合验证。本报告保留修复前证据，不代表新候选已完成验收。

## P1：首章首次落笔没有同步显示入口

取证位置：`model.ts` 普通 `choose` 的 ending 分支及结束处（取证约312–319行）；`spar.ts:11–12` 的 `sparUnlocked / sparRefresh`。原接线只在 createGame 和 journeyChoose 成功后 refresh，新玩家刚写下 endingWish 的这一轮没有触发。

复现使用明确的**首章落笔前边界初态**：从完整归驿档复制，移除 endingWish／ended 并同步为未开放门，其他实体与资源保留；随后通过实际 `interact(table) → choose(travel)` 完成落笔。输出：

- `END_INTERACT {ok:true} ending`
- `END_CHOOSE {ok:true}`
- `END_GATE travel hidden`

不是旧档迁移不成功，而是权威动作完成后实体派生状态未更新。入口永久隐藏到另一个能触发 refresh 的动作；严格 v7 快照也可能因 endingWish 与门状态不一致拒绝。root 已决定在普通选择完成处调用 sparRefresh；审查后读取代码已看到该调用，修后完整回归由 root 接管。

## P1：旧渠未做完时，桌边记练场经历被提前返回的对白遮掉

取证位置：`model.ts` 的 table 交互优先级（约373–420行），`canal.ts:78–82` 的 `canalInteract`，以及 `spar.ts:26,34–39`。

这一项使用**原样固定0.7档后的完整真实模型动作**，没有添加练场事实或传送：走到驿后门 → 与同行许照约好留驿 → 进练场 → 近身约正面 → 双方实际就位 → 开始并被真实一发碰到 → 徒步出门 → 走到自己桌边。实际结清为 `last={front,hit,hurt:true}`、`facts=['front:hit']`、reported空。

回桌边输出 `dialogue.id='canal_table'`，选项只有 `canal:accept / leave`；实际选择 `spar:report` 返回“没有这个话题”，reported仍为空。原样档旧渠stage为unaccepted；active／ready同样会被前置 canalInteract 捕获。只有 canal.complete 的合成分支已有 sparChoices。这把新活动的归来闭环意外绑到完成旧渠之后，违反它只依赖首章归驿的范围。

root 已决定在 canal_table 构建处合并 sparChoices，保留旧渠原选项及分页；审查后已看到新增合并代码。不要以直接调用 sparChoose 成功替代桌边真实可见选项的修后回归。

## P2：异常败退时，结清自动快照会覆盖唯一有效恢复点

取证位置：`spar.ts:61–70` 的结清返回 true；`model.ts` 的 `projectileTick → sparAfterProjectiles → checkpoint`（约746行），与局部 retry 分支（约475–480行）。原逻辑在致命真实伤害后仍把本手记入 last 并请求 checkpoint，checkpoint 不排除 HP0／defeated。

这是设计明确要求支持的**异常边界**，不是声称合法HP≥2、单发一格伤害会正常打死玩家。复现先从原样档真实进场、约定、开打、发出实际敌弹，并保留入场的完整checkpoint；仅将当前HP设为1模拟异常低血，然后继续真实 tick。输出：

- 实际弹命中后 `hp=0 / defeated=true`。
- `checkpointPreserved=false / savedHp=0`；原入场完整点已被替换。
- 局部真实 `act(retry)` 返回“恢复点尚未脱离险境，请导入自己的存档。”

局部 retry 的拒绝条件本身正确，问题是结清自动快照提前损坏了它应保留的恢复来源。建议仅阻止败退／HP0局面的练场自动checkpoint，保留原完整来源；不改旧图的补满式retry、不构造部分恢复。root已持久化发射后异常的RED2，并在结清checkpoint条件添加 `!defeated && hp>0`，专属 `tests/spar-recovery.test.ts` 的GREEN正在核验；本审查没有另跑修后测试。root先前在尚未发射时设HP1只触发收手，因此其RED1不能证明致命弹覆盖checkpoint，原日志保留；不得将RED1与这里已经在途的弹混为一谈。

## P2：点击正在交手的闻朔，会提示使用被约定禁止的火球

`scene.ts` 的 `groundInput` 在 `sparCanTalk=false` 时进入普通enemy点击提示，原句含“可选火焰球打断”。实际此时 previewCast 在整个练场都拒绝 flame。它不是能力漏洞，但会在玩家点击对手时直接教错误操作。

已通知root；再次只读看到约233行已加入 spar_peer 专用的“来向／侧身／护符／收手”提示。没有由本代理运行屏幕验证，正式交互仍应随UI验收覆盖。

## 已实际核对、未发现新问题的路径

以下同样从原样固定档后执行真实动作，必要时实际 snapshot／restore，不注入本手结果：

- **暂停定位**：暂停后指定圆心 move，运行3秒，整个状态JSON不变；读档保留 positioning、pending move、paused。恢复后玩家与闻朔继续真实移动。
- **暂停后开始**：双方到位再暂停并请求 spar-begin；读档仍为 positioning／pending spar-begin，恢复才转active。不存在暂停中先发射或读档自动开打。
- **正常状态不能retry回血**：active时实际retry被拒绝，没有覆盖当前状态。异常败退恢复是上面单列的另一条合同，不能用这个拒绝证明它正确。
- **收手余弹跨读档**：真实发射后收手、暂停、保存再恢复，弹的完整记录相同、stopReason仍stopped；恢复继续飞行并实际扣血，最终 HP3、last stopped/hurt=true、仅记 front:hit。
- **近出口仍不能吞弹**：从圆心南侧合法脚点 `(900,990)` 开始，真实发射后向南走；玩家实际到 y1184，已经近出口，run为settling、弹id1仍在。点击出口被拒，scene仍spar、id1仍在；再运行让实际碰撞／寿命结清后，才可点击回home。最终记录 outside/hurt=true，没有以changeScene清弹冒充安全。
- **同行入口实际成立**：原固定档的许照为following；新门先显示约她留驿的选择，选定后进入练场。新场没有Xu实体，实际回驿仍为等候，不自动再邀。失败落点预检的源码顺序在改变等候事实之前；本次未合成堵门场景冒充完整证明。

每小步的定位／越线检查现处于真实玩家移动后、enemyTick前；首伤结清在射弹碰撞后，没有再嵌套一层总tick。清洁判定、近身确认、仅一源、禁止进攻等现有界限未发现可由本次普通动作绕过的新路径。并未据此证明全部存档组合、所有桌边旧任务组合、异常恢复或手机画面完成；这些由root整合回归与浏览器继续验证。

本报告交回后停止写入。
