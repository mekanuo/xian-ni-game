# 0.5 同行回程实施计划

2026-09-11。依据已审阅的 [COMPANION_050](COMPANION_050.md)：选定有界领路，**先保证北路真实可完成，南路按实际兽情止步/改约**，不修改兽行为来凑通关。本稿仅静态核对与实施计划，运行代码未改、浏览器未跑；0.4.1发行由根代理另行完成。

## 1. 静态核对及坐标修订

依据当前 `content.ts` 工棚四个固定障碍与 `model.ts` 的17单位人物碰撞半径，对直线分段按2单位间隔采样。下列结果只证明给定静态矩形没有相交，不证明实际NPC、可移动物、自动寻路、镜头或主观节奏通过。

| 项目 | 核对结果与采用位置 |
|---|---|
| 原北线 | (1440,720)→(1450,300)→(1000,230)→(320,230)→(300,700)→(220,780)，约2139单位，固定障碍不相交；但x1450竖线穿过可见`life_press`试架的画面，不能只按“非solid”就采用 |
| **制作北线** | 起点(1440,720)→(1600,720)→(1600,330)→(1450,250)→(320,250)→(300,700)→出口候点(220,780)；约2414单位，采样无固定碰撞。x1600绕开`life_press`和`trial`，北横段沿已有高路 |
| 过短的原南线 | (1440,720)直接到(1100,800)穿过`{x:1160,y:680,w:35,h:125}`墙；第一次膨胀碰撞约(1210.7,773.9)，禁止采用 |
| **南侧探路段** | (1440,720)→(1440,860)→(1250,860)，约330单位，采样无固定碰撞；y860越过墙底805+17。下一段向(1080,860)时须检查真实兽情，不能直接假定安全 |
| 雨棚到达 | 溪道入口(1570,420)→(1430,480)→坐垫(1250,550)，约345单位；无固定碰撞，坐垫与y620水线分离，不要求移雨棚导水板 |
| 出口 | `to_creek`位于(100,780)，候点(220,780)距出口120，玩家还须主动近身点击；这不是瞬移触发区。共同汇合检查玩家和许照均距候点≤75，然后才允许结算共同路段 |

沿用现有NPC速度145、玩家160：制作北线纯行走约16.6秒，不能写成已测游玩时长。无需减慢NPC制造陪伴感；只在实际分岔、危险或玩家落后时停。整个任务的旧图往返比这段更长，白盒还须检查进入工棚是否占了过多无事可做的时间。

工棚旧兽可能被玩家引到别处，静态北路不代表所有存档中永远没有兽。沿用当前安全区和兽的实际回巢规则，遇见真实威胁可等待或折返；不传送、清除、复活兽，不把零资源退路解释为NPC可无视一切当前危险。

## 2. 文件归属与最小实体

- `contracts.ts`：GameState新增JourneyState，contentVersion升4；SceneId、GameAction、能力数值不扩张。
- 新 `journey-content.ts`：导路点、分岔检测区、两处地标和休息点模板，导出`initialJourneyEntities(scene)`，内部按五个SceneId返回数组。
- 新 `journey.ts`：约定、真实经过、NPC导路意图、离场处理、归来结果，唯一规则事实在GameState。
- `model.ts`：寻路端口、规则调用顺序、统一切图与checkpoint；`save.ts`：版本迁移与严格校验。
- `scene.ts`、`encounters.ts`、`ui.ts`：只展示事实和发送现有交互；必要时新增很小的`journey-art.ts`，不牵连旧素材图集。

模板建议：工棚`journey_north_mark`(320,285)、`journey_south_mark`(1250,885)，都是非solid的小路边提示；溪道`journey_rest_shelter`(1250,550)，kind=`rest`，初始hidden。地标可接取后显示，不能靠点亮其ID推进经过。休息点不加进SCENES旧实体表，用版本追加数组，保护1/2/3版精确清单。

## 3. 最小状态类型建议

合并设计稿的attempt与guide，不同时保存两份路线或等待原因；等待原因由当前位置、距离和威胁推导。

```ts
type JourneyRoute = 'north' | 'south' | 'mixed';
type JourneyMode = 'solo' | 'together';
interface JourneyState {
  stage: 'unaccepted' | 'active' | 'ready' | 'complete';
  agreed: JourneyMode | null;
  run: null | {
    mode: JourneyMode;
    plan: 'north' | 'south';
    next: number | null; // 共同领路的下个有限路点索引；独行为null
    playerGate: boolean;
    companionGate: boolean;
    viaSouth: boolean; // 本轮确实走过南侧探路候点，非只点过选项
  };
  soloRoute: JourneyRoute | null;
  sharedRoute: JourneyRoute | null;
  restOpened: boolean;
  recordedShared: boolean;
}
```

`run`只在工棚真实出发后存在；不能把家中agreed当run。玩家在起点≤90、共同模式下许照也在≤90且既有邀请条件成立，才创建run并清空本轮经过。结束或中止run置空，历史结果不抹去。

北分岔检测区建议x850–1100、y200–320；南分岔x850–1100、y800–910，均在东西两侧之间。每tick分别检测两人的身体，记对应实际通过；禁止按path目的地或next索引提前记。开始点位于东侧、结束须在西出口，防止仅叫NPC到终点冒充共同领路。

途中改约时不清除已经成立的个人历史；本轮经过按新路线重新收集分岔证据，保留viaSouth，最终可记mixed。通过南探路候点后改北路应提示“先探南林，再绕北路”，不强制重走已安全走过的整段。shared只在同一run内两人都有分岔证据并在出口汇合才成立；solo结果不因许照当时恰好跟着就升级。

## 4. 规则函数与端口

```ts
interface JourneyPorts extends LifePorts {
  route(s: GameState, actor: Vec, to: Vec, actorId: string,
        allowed: (point: Vec) => boolean): Vec[];
  moveNpc(s: GameState, npc: Entity, to: Vec, speed: number, dt: number): void;
  safe(s: GameState, point: Vec, margin: number): boolean;
}
type JourneyChoiceResult = ActionResult & {
  checkpoint?: boolean;
  travel?: {scene: SceneId; point: Vec};
};
createJourneyState(): JourneyState;
journeyChoices(s, e): DialogueChoice[];
journeyChoose(s, id, ports): JourneyChoiceResult | undefined;
journeyInteract(s, e, ports): ActionResult | undefined;
journeyCompanionStep(s, npc, dt, ports): boolean;
journeyTick(s, dt, ports): void;
journeyExitIntent(s, exit, ports): ActionResult | undefined;
journeyBeforeExit(s, destination, ports): void;
journeyAbandonRun(s): void;
journeyObjective(s): string | undefined;
journeyDescription(s, e): string | undefined;
journeyGuideView(s): {phase:'leading'|'waiting'|'exitReady'; reason:string} | null;
```

布尔返回的`journeyCompanionStep`为true表示本步已接管许照的移动，原跟随分支必须return，防止一帧走两次。View函数只读，不缓存一份任务进度。函数参数类型在实施时补全为GameState/Entity等，上述省略处仅为缩短签名展示。

## 5. NPC寻路的实际约束

当前`pathfind`以`s.player`为起点，NPC跟随代码会临时替换player再还原；还使用“起点已受威胁时允许逃出”的规则。新领路不能把这条逃生例外当作让许照主动进兽区的许可。

优先小幅抽取模型私有`pathForActor(s,start,destination,{actorId,allowed})`，旧`pathfind`作为同规则包装，旧玩家调用结果保持回归；不在journey.ts循环替换GameState.player。allowed要同时进入目的地检查、直线采样、格点邻居和路径平滑，不能只查最终落点。用现有free(17,npc.id)逐步移动，moveNpc端口仍由model裁决。

- 北路按相邻导路段的走廊寻路，段线两侧约90单位，接点留足转弯圆角；当前段不存在安全路径就停，不能为追上玩家穿墙抄南路。地标自身不构成碰撞。
- 南路先到合法探路候点，再检查下一段；只能在约定南侧范围找路。若只绕全图北侧才能抵达，返回空路径并商量改北路，不暗中算南路成功。
- 领路安全采样不使用“起点危险就放宽全部后续段”例外；保守检查真实活兽视线与预计下一小段。初始建议停步距离220，白盒结合现有140近身警戒核对；这是NPC的谨慎程度，不改兽的300发现距离、攻击或速度。
- 玩家离NPC>180时停在当前安全点，距离回到≤120再继续，避免边缘抖动；NPC不得为等玩家倒退穿过危险。自然等待自动恢复，兽情未明或旧`sheltered/refused`则需明确安全再集合。
- 每个固定tick先处理现有兽/投射物，再给导路移动机会；暂停/对话/失焦已由tick总入口冻结。施术与行走不取消整段领路；受伤仅沿既有防护/避险规则处理。
- 路径短缓存只可作为可丢弃的运行性能数据；本段目标或危险改变即重算，每次落脚仍检查free/safe。不能把缓存当存档事实，不能每tick新增事件刷屏。

## 6. model集成顺序与离场边界

1. createGame在每场景旧实体+生活实体后追加journey实体，初始化v4状态，再统一补homeX/Y与checkpoint。
2. choose在校验“当前dialogue真有该选项”之后、canal/life之前分派`journey:*`。成功先closeDialogue，再按result.travel调用唯一changeScene，最后按checkpoint标记保存；module不直接改s.scene。
3. interact在普通NPC/桌案/雨棚旧分支前询问journeyInteract。只在相关本次交互有内容时接管；桌案已有canal_table会return，必须将journey选项显式合并或由新的桌案组合器一次呈现，不能让优先级悄悄吞掉旧渠/生活功能。
4. companionTick找到NPC后，现有稳舟协作优先；随后调用journeyCompanionStep，返回true就跳过常规跟随。只接管workshop/xu_work/current run，不干扰canal的高岸约束。
5. tick中紧随companionTick调用journeyTick，记录移动后的双方真实经过；不在scene.update写进度。到达出口还需要下一次真实interact，不自动切图或完成。
6. 出口interact在changeScene前调用journeyExitIntent。双方满足共同出口证据就继续；否则弹“回去等她/我先走，暂停这次领路”。后者清空共同run，再返回travel意图调用统一切图；不得让旧following传送算shared。
7. changeScene在改s.scene之前调用journeyBeforeExit：仅正常workshop→creek且证据齐全时结算个人/共同路段，再清空run。**retreat/retry不是正常完成出口**：撤回调用journeyAbandonRun，重试只替换快照；不得复用成功结算路径。
8. 主线ready须在溪道`shelter`近身显式展开坐垫后成立；开放rest实体、记录lastSafe仍通过现有规则，不能凭到达creek就发奖励。原shelter包扎/晾药/同行补救选项保留。
9. 回家table真正落笔才complete。后来共同完成只使recordedShared待补，需再次table操作补笔；restOpened从false到true一次，所有奖励和方法记录不可随重访叠加。

首版完成后的普通出门不自动启动专项领路。提前离场只停止本次专项记录，不清除旧拒绝、受潮、修器、旧渠和历史solo/shared结果；既有“留在原处/重新邀请”事实由明确选项改变。

## 7. 存档版本与表现接入

`save.ts`当前`if(version!==3)`把所有其他版本看作旧四图，升4时必须改成“版本1/2才补旧渠”，不能把v4误走旧迁移。validateEntities扩为1|2|3|4：v1旧四图、v2加life、v3五图加life、v4再加journey模板。先严格验原版本，再追加新默认实体与JourneyState，最后validateManifest(v4)。外层和唯一checkpoint仍共用restoreWorld，未知版本拒绝。

journey校验：非unaccepted要求canal.stage=complete；未接取无run/历史/坐垫。run仅工棚，next为该路线有限索引，共同模式才有companionGate；solo不得写共同经过。当前run需要的实体位置都有限且有效，guide目标不从存档接收任意坐标。ready/complete要求restOpened且至少个人或共同真实回程历史；recordedShared要求complete及sharedRoute；休息点idle与restOpened对应。已结束历史不能要求NPC仍站终点，避免合法重访档被拒绝。

scene已有`detail-props/rest`可画坐垫、`journey-props/stele`可作石刻基础，南标用现有绳结语法加小色布。不要向这些旧图集硬塞未存在的frame。新增地标脚点、标签沿现有display.density与visibleLabels机制；scene重绘key加入restOpened/recordedShared，桌案叠画一小段回程记号，不覆盖旧渠图。

许照复用makeCharacter及移动朝向；导路waiting用真实停步/回头表现，暂停时冻结。看不到她时提供附近路标说明与“回到身边”现有相机操作，不添加白色引路线，也不修改镜头去自动拖着玩家追NPC。encounters只显示当下距离/兽情与可改约原因；objective不能遮蔽更优先的当前危险。

## 8. 实施次序与验收

- **合约与纯规则：** 先写默认、真实经过、假共同完成拒绝、提前离场、历史不重复的失败测试，再实现journey模块；状态和签名确定后才能独立分派存档/表现，避免并行猜字段。
- **模型接通与几何白盒：** 真实act/tick证明北路双方能走、零资源可达、南探路先避墙再真实止步、玩家先走不靠切图补NPC、暂停和重试一致。移动记录与NPC位置都检查，不能只看stage。
- **存档和实机：** 原0.2/0.3/0.4真实导档迁移，途中领路导出/导入暂停；桌面和触屏真实完成北路、独行→再邀、拒绝/补救、南侧止步→改北。记录纯领路耗时、距离等待次数和相机可见性，测试不能用长暂停掩盖无聊等待。
- **表现及发行：** 只补通过白盒所需的路边标记、停步反馈与雨棚坐垫；验旧五图/生活/旧渠回归。里程碑完成由根代理提交推送，完整候选通过后公开部署，不覆盖正在发行的0.4.1工作区。

静态核对已排除原南线穿墙，但尚未证明导路路线有趣、南线有从容通行窗口、两个小地标不遮旧物件、手机镜头始终能看到许照。这些必须由运行候选解决；本计划不将其记为通过。
