# Journey 输入呈现等待：独立修正审查

2026-09-12。只读审查本轮 `scripts/journey-check.mjs`、`scripts/verify.mjs` 的当前修正，以及 `qa/journey-entry-r1/journey-entry-check.json`。未用 Git 获取差异、未运行浏览器／模型／测试／构建，未修改脚本。根代理的 entry→phone 完整复测由唯一 supervisor 1272417 负责，本文不预判其结果。

**结论：`sceneReady` 针对已直接观察到的模型／呈现不同步，修正方向成立。没有发现它清状态、注入进度、暂停连续领路或把入口专项冒充完整路线通过。** 一项具体证据隔离缺口仍在：独立 entry 模式失败截图沿用完整路线文件名。其余列为检查能力的边界，不作为未经证实的运行缺陷。

## 证据升级到哪里，尚未升级到哪里

新的 entry-r1 记录在选择按钮的 click 冒泡阶段直接捕获：

| 字段 | 实测记录 |
| --- | --- |
| 模型 scene | creek |
| 音景 scene | home |
| 实际呈现 actor ID | tao、xu，仍为石驿人物 |
| camera | zoom .85，density 3，view `(1341,107,459,993)` |
| 溪道出口 `(1640,370)` 的当时 CSS 投影 | `(254.49997869192347,223.9500227208235)`，在手机画布可接受区域内 |

这已经**直接证明**正常 DOM 选择完成后的一个可观测时间段里，模型到了溪道，实体与镜头仍是驿前视域。不是仅凭最终位置猜想存在 render gap。`sceneReady` 所等待的事件因此有具体对象。

原 R4 没有取样 CSS、真实指针或当时呈现记录；其“625ms 后点击、没有拖相机、最终停在溪道西侧”的组合与这个机制高度相符，但**原 R4 那一次触摸究竟用了哪组坐标，仍只有强支持，未被这份新记录直接重放证明**。entry-r1 自身最终为 entry-only PASS、真实进入 workshop；不能把它写成重现了原 R4 的同一个失败点击，也不能当完整手机同行通过。

## `sceneReady` 的条件与作用域

审查点为 journey 脚本的 `renderedPages`、`sceneReady`、`frame`、`importSave` 和 `run`。

1. **等待的是实际现象。** 先取得期望模型 scene，再等待当前模型仍是该 scene、`audio().scene` 一致，以及 `presentation().actors` 中至少有一个 ID 属于该图真实 world。原 render gap 的 audio=home／actors=tao,xu 不会通过 creek 条件。
2. **额外等待跨过两次真实 rAF。** 发生在 actor／音景已更新之后，目的是让随后相机 preRender 变换有机会完成；不是用固定几百毫秒赌机器速度，也不是等待敌人被脚本移走。两帧期间游戏按原规则推进，未调用 pause、setState 或任何隐藏 act。
3. **对当前路线足够局部。** WeakMap 以 Page 为键记录最近已等待的 scene；新页无缓存，换图时值不同，`importSave` 在导入前删除缓存，即使导入同名场景也会重新等待。没有因旧页已去过溪道而永久跳过本次切图。
4. **没有把连续领路拆成暂停片段。** `frame` 每次都会询问缓存，但 workshop 内连续跟随同一 scene 会直接返回；开始领路前的准备已经完成该场景等待。新增条件不调用 resume，更不会替领路中的意外对白收尾。
5. **失败仍暴露。** 呈现谓词等不到会在 30 秒上限报错，进入既有 FAIL；两帧后还检查 scene 和 audio 未换走，再记录 ready 相机／投影。没有退回忽略谓词、删失败断言或强制把输入判成成功的分支。

### 不宜夸大的范围

- “至少一个当前图 actor”是场景代际的实用旁证，不是所有纹理／标签／相机像素都已正确的全面美术检验。当前 home／creek／workshop 的人物 ID 可区分，音景又在 refresh 尾部更新，未发现这条路线会被旧 home 人物误通过。不要扩大成适用于任意空图的通用加载证明。
- 两次 rAF 不承诺自动跟随完全静止，也不把 `screenPoint` 取样与后续触摸变成原子操作。它处理已证实的切图呈现间隙；连续行走时的正常镜头变化仍靠实际点位、余量和路线断言检验。
- 后半段 rAF Promise 没有独立超时。若页面停止提供动画帧，会交给外层进程时限处理；这是可终止性局限，不会产生假 PASS，也不是当前正常可见页已发生的缺陷。
- 新增 world-input-projection 记录发生在 `frame` 返回之后；它与取样不是同一次 evaluate。DOM 捕获中的 world 又是以同一个 screenPoint 逆算，并非直接读 Phaser `p.worldX/Y`。记录很有助于比较，但名称 `actual-pointer-events` 不应被解释为已取得游戏内部的命中实体。真正进入 workshop、后续真实路径和最终结果仍是必需的消费证据。

## 发现：entry 失败截图尚未隔离

`output` 已正确分成：entry→`journey-entry-check.json`，pause→`journey-pause-check.json`，complete→`journey-check.json`。entry 只完成真实准备到 workshop 后返回，不导出完整准备档、不跑领路、不跑归驿、不跑独立暂停保存；报告也明确 `phase: entry-only`，这个 PASS 范围诚实。

但脚本尾部 catch 无论模式都写 `qa/evidence/journey-failure.png`。因此一次 entry-only 诊断失败仍可能覆盖尚未归档的完整路线失败图；新 JSON 与旧完整 JSON 分开并不意味着失败图也分开。

**建议后续小修：** 失败截图按实际 phase 分名，并把路径写入该次报告；完整失败仍保留原文件名也可以。不要在当前串行复测尚未结束时改它的源文件。此项不影响当前成功路径的玩法判定，不能据此将已记录成功改称失败；它影响的是下一次失败能否保留正确证据。

## 完整 verify 的范围与隔离

`verify.mjs` 为 journey 所在子进程组显式覆盖 `JOURNEY_PHASE:'complete'`、`JOURNEY_ROUTE:'all'`、`JOURNEY_FIXTURE:''`。空 fixture 值由脚本 `||` 回落到固定 `qa/fixtures/return-canal-v0.4.0.json`；因此父进程遗留的 entry／phone／替代 fixture 不会把完整矩阵缩成诊断。原始 fixture 字节没有在修正中被加工，导入仍由设置文件操作完成。

静态展开当前成功路径，仍是 34 条顶层命令：

| 组 | 条数 |
| --- | ---: |
| npm test、build | 2 |
| journey 完整与视口、kiln 三项 | 5 |
| ui-regression | 1 |
| 镜头／布局／输入／手机／战斗／首撞／区域美术 | 7 |
| 首版两条完整路线 | 2 |
| life 三项、presentation、canal 三项 | 7 |
| 市场威胁、视口、后果、desktop、phone | 5 |
| 练场 front 矩阵、left、right、presentation、facing | 5 |
| 合计 | 34 |

市场现在位于旧章回归后、练场前，命令未删除、未跳项；子进程仍逐个等待退出，非零就使完整报告失败。开始前记录输入指纹、模型／构建后比对、最终再次比对指纹的保护仍在；不是把早期子项 PASS 拼成一次新整轮 PASS。顺序调整会改变开始时刻，因此结果仍须由新一轮完整运行给出，不能沿用 R4 失败前的条目。

顶部注释仍提“先检查 corrected driver and new chapter”，但实际顺序已把练场放后面；这是描述小偏差，不影响上述控制流。无需为了审查文案改动正在受测的脚本。

## 交回意见

当前可以继续根代理已排程的 entry→phone 实机复测，无需为了本审查更改场景、移动速度、视口、资源或领路规则。先保留直接观察的 render gap 与修后实际投影／路径，再依据完整手机路线结果决定是否冻结修正进入下一整轮。只有那一轮的全部必需项真正通过，才能更新发行判断。

本次仅新增本文，交回后停写；没有预填当前复测或完整验收结果。
