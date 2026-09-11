# 0.6 旧窑第六图与 v5 存档实施计划

> For agentic workers: 进入生产实施时使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`，按下列复选项推进。本文件只界定存档及必要模型接点，不授权跳过白盒判定。

**Goal:** 在六图生产世界中保存旧窑的实际穿行、借还与物件结果；将现有 v1／v2／v3／v4 外层和单层 checkpoint 严格升级为 contentVersion 5，保留旧成果、资源、暂停动作和物件位置。

**Architecture:** 延用 `schema:1`、`revision:'return-stone-v1'`、完整世界 JSON 和单层 checkpoint。新增独立旧窑状态与生产内容模板；每个旧版本先按它原来的清单验证，再只追加下一版本的数据。白盒的 home 替换器不进入生产存档路径。

**Tech Stack:** 现有 TypeScript 纯模型、Vitest、JSON 存档；最后由根代理串行安排浏览器导入／恢复检查。

**Spec:** [ADVENTURE_060.md](ADVENTURE_060.md)。核对入口为 [HANDOFF.md](../HANDOFF.md)、[contracts.ts](../src/game/contracts.ts)、[save.ts](../src/game/save.ts)、[model.ts](../src/game/model.ts)。

## Global Constraints

- 2026-09-11 本稿是生产实施前的计划。当前正式模型仍为五图 v4；根代理正在补白盒实际重放。本文没有实施新图、执行测试或证明生产可发行。
- 不改变既有 `life`、`canal`、`journey` 历史事实，不从同伴当前位置、现有完结档或 NPC 入图位置推导共同成果。
- 旧版本固定夹具保持原始字节。升级测试的“输出应为 v5”断言，不把输入旧档改写成 v5。
- 不添加货币、装备、敌人刷新、跨图携屏、旧窑压扣槽或旧窑药囊。`ClampSite` 仍为 home／lookout／canal；气味仍只属于 workshop／canal。
- 不借存档升级收紧全部旧物件的坐标、尺寸、附加字段或碰撞规则。已支持的旧挡屏角重叠要原样保留，由现有向外脱困规则处理，不迁坐标、不补资源。
- 生产模板中的坐标、晾坯区、归还区和安全入口由连接选址与地图实施提供单一导出；本稿不把白盒坐标复制为正式合同。

## 1. 最小数据合同

`SceneId` 追加 `kiln`，`GameState.contentVersion` 改为 `5`，新增 `kiln: KilnState`。不改变 GameAction；借用对话仍走 interact／choose，穿行仍走真实出口交互。

建议采用以下有界状态，生产规则与校验使用同一类型：

```ts
type KilnPort = 'west' | 'east';
interface KilnState {
  visited: boolean;
  entry: KilnPort | null;
  crossed: { west: boolean; east: boolean };
  loan: 'none' | 'agreed' | 'borrowed' | 'returned';
  shelterOpened: boolean;
}
```

默认状态为所有布尔值 false、entry 为 null、loan 为 'none'。`createKilnState()` 每次返回独立对象。screen 的现坐标、燃烧／烧毁、计时和敌人退出均保存在 `worlds.kiln`，不另建第二套“位置／烧毁”账。`loan` 是首次借还的历史进度，`shelterOpened` 保留已给出的棚角许可。returned 不因后来移动物件倒退；许可不自动撤销，见下文合同。

| 字段 | 唯一可写入的实际条件 | 不得用来代替该条件的事情 |
| --- | --- | --- |
| visited | 玩家实际从一个正式入口进入 kiln | 迁移已完成 0.5 的档、查看旧路牌 |
| entry | 该次真实入口的西／东侧；换图前记下 | 当前靠近哪个出口、读档时 NPC 位置 |
| crossed.east | 从 creek 入图后，在另一端实际触发 kiln → canal 出口 | 同端退出、撤回、重试、敌人全部退出 |
| crossed.west | 从 canal 入图后，在另一端实际触发 kiln → creek 出口 | 在入口院内转一圈、答应借屏 |
| loan: none → agreed | 在杜芹近处实际完成同意借用选项 | 直接修改 screen 坐标、先前章节交付 |
| loan: agreed → borrowed | 同意之后，完好屏实际离开她可见的晾坯作业面 | 原位轻挪、同意时屏早已在远处、远程目标预览 |
| loan: borrowed → returned，shelterOpened=true | 曾实际借走，后来完好屏已放下并归到工作位置，杜芹实际见证 | 仍牵着／悬停在位置上、烧毁残骸归位、隔图交谈 |

上述穿行字段两个方向互不互斥；第一次穿过任一方向即有新路成果。到另一端后，同次切图清空 entry；再从另一端进入才开始新的方向记录。已记录的方向不因再次同端退出而丢失。

借用与归位均在生产规则的实际移动／放下／见证接点发生，`restore()` 只验证，不代执行。未同意时挪开的屏不能在之后点“同意”就追认成借用，须真实回到作业面再借离。首次 borrowed／returned 历史不因重访倒退；当前是否仍在原位、是否烧毁由实体判断，重访不能用历史归还说“屏仍完好归位”。

许可后再毁按根代理定案处理：保留 loan=returned 与 shelterOpened=true，不新增撤销或驱逐机制。原设计“借后烧毁不交出棚角”限制首次授予，不追溯撤回已按约归还换来的许可。杜芹近处实际看见其屏燃烧／烧毁时必须如实责备，不能称屏仍完好；远处看不到时只能说未见屏，不凭空知道毁屏。后续挪动／烧毁不回填实体、不重发奖励，也不增加补偿资源或第二轮任务。`burned + loan=returned + shelterOpened=true` 是明确合法的历史状态。

## 2. 生产实体清单与旧模板隔离

建议 `src/game/kiln-content.ts` 导出独立 `KILN_SCENE`、`initialKilnEntities(scene)` 和位置／区域常量。正式地图在 SCENES 中追加 kiln，绝不导入 `src/whitebox/kiln-model.ts` 或调用 `installKilnMap()`。

基础最小清单如下；生产内容若确需额外可互动路牌，须在实现前加入同一精确清单，不能在 restore 时接受任意额外实体。纯画面窑墙与地标优先使用地图几何和绘制，不增加存档物件。

| 所属图 | 新 ID | 合同 |
| --- | --- | --- |
| creek | kiln_entry_creek | 到 kiln 西院的固定 exit，目标图／落点来自生产模板 |
| canal | kiln_entry_canal | 到 kiln 东端的固定 exit，目标图／落点来自生产模板 |
| kiln | kiln_exit_creek、kiln_exit_canal | 两个固定出口，分别返回真实旧图接点 |
| kiln | kiln_duqin | 唯一新办事 NPC，固定安全西院工作位；不是 xu 类型 |
| kiln | kiln_screen | 唯一可移动、实体、可燃轻木屏；独立 ID，不复用 crossing 的 shield_board |
| kiln | kiln_raider_west、kiln_raider_east | 两个既有 raider 类型敌人，保存实际位置、血量、警觉和退出状态 |
| kiln | kiln_rest_corner | 固定棚角静息点，许可前 hidden，许可后 idle |

`initialKilnEntities` 仅向旧 creek／canal 追加各自入口；kiln 本图基础实体只由 KILN_SCENE 提供，避免重复追加。每次返回新对象并补 homeX／homeY。LIFE_ENTITIES、JOURNEY_ENTITIES 的 Record 新增 `kiln:[]`，保持原五图数组原样。

两处新旧图入口不能直接塞进供旧档校验使用的 SCENES.creek／canal 基础 entities。当前 validateEntities 正在用这些模板核对历史档；直接加出口会使所有旧夹具少实体而被拒绝。沿用现有 life／journey 追加层方式：运行时 createGame 才加新入口，版本清单仅在 v5 包含它们。

入口显示是已确认进度的表现：journey.stage 为 complete 时 idle，否则 hidden。因此 v4 已完成回程档迁移后可以看到入口，同时 kiln 全新事实仍为空；独行完成与同行完成待遇相同。地图正文／出口目标依模板验证，防止把新出口改指 home 或任意落点后经正常交互传送。

## 3. 版本清单与逐层迁移

保留“无 contentVersion”作为现有 legacy v1 编码；显式 `1` 仍拒绝，不能因为文档称 v1 就悄悄扩大接受范围。

| 输入编码 | 原始世界清单 | 原始追加内容／账 | 验证后追加 |
| --- | --- | --- | --- |
| undefined（旧 v1） | home／creek／workshop／crossing | 首章基础实体，无 life／canal／journey／kiln | 生活实体与默认 life，再按下一行继续 |
| 2 | 同上四图 | 生活实体与 life；旧 scent 无 scene | scent 的既有迁移到 workshop，默认 canal 与第五图，再继续 |
| 3 | 五图，含 canal | life、canal；没有 journey | 回程实体与默认 journey，再继续 |
| 4 | 同上五图 | life、canal、journey | 默认 kiln、第六图、新旧图入口，再继续 |
| 5 | 六图，含 kiln | 全部旧内容＋旧窑内容 | 不补缺项，严格验证后原样恢复 |

实施要点：

- [ ] 保存输入的原始 version，接受值只增加数字 5。未知版本、字符串版本、null、显式 1 拒绝。
- [ ] 明确四图、五图、六图三份 manifest；不要将当前 `scenes` 直接改成六图后仍让 `version >= 3` 使用它。v3／v4 必须仍为五图。
- [ ] validateEntities 参数扩为 `1|2|3|4|5`。life 层仍 `>=2`，journey 层由当前 `version===4` 改为 `>=4`，kiln 层仅 `>=5`；canal 基础层仍从 v3 起存在。
- [ ] 把当前“version !== 4 才允许没有 journey 并迁移”的判断改成真正的“输入早于 v4”；v5 不能走旧版补 journey 分支。
- [ ] v5 以前禁止自带 kiln 账、worlds.kiln、scene／lastSafe.scene 为 kiln，或两个新入口。先按原版精确清单检查，再追加，不先删除多余字段／对象以“修好”输入。
- [ ] v4 → v5 前，调用原五图 validateEntities 与既有 life／canal／journey 校验。之后创建全新 kiln/map，按迁移后的 journey.stage 初始化两个入口显示，最后设 contentVersion=5。
- [ ] validateManifest 升为 v5，并加入 validateKiln。公共玩家／动作／对话检查继续保留；坏档失败，不输出部分迁移结果。
- [ ] snapshot 保持直接序列化；migrateSave 仍经 restore，重复升级不再追加入口／敌人，不改变已有时间、资源或历史。

`restore` 保持现有非递归结构：分别对外层与 checkpoint 调用同一 restoreWorld；checkpoint 必须为 null 或单个 JSON 字符串，解析出来的 checkpoint 必须恰为 null。外层 v5、内层 v2 等混合版本合法，只要各层各自通过原版验证。不能要求版本相同，也不能用外层的默认 kiln 覆盖内层自己的旧窑事实。任一层损坏都拒绝整个存档，保留现有 2 MB 限制及错误边界。

## 4. v5 专属校验与合法暂态

- [ ] kiln 对象、crossed 的字段类型与精确键集合受限；entry 只能为 null／west／east，loan 只能为 none／agreed／borrowed／returned；全部布尔值必须为实际 boolean。
- [ ] 有任何旧窑事实、当前在 kiln 或 lastSafe 在 kiln，都要求 journey.stage===complete。当前或 lastSafe 在 kiln 还须 visited=true。只有入口已可见而未到访时，kiln 仍允许全默认。
- [ ] loan 非 none、shelterOpened、任一 crossed 为 true 都要求 visited；shelterOpened 必须与 loan=returned 一致。burning／burned 且 loan=returned、shelterOpened=true 是合法历史，不能据当前物件损毁反向否定过去归还。entry 非空要求 visited 且当前 scene===kiln。历史不要求当前 NPC 同处，也不要求玩家仍站在旧出口。
- [ ] 棚角实体状态严格对应 shelterOpened；固定 NPC、出口、棚角的坐标／home／尺寸／能力标志使用生产模板检查。新出口 targetScene／targetSpawn 也精确匹配。
- [ ] kiln_screen 只在 kiln，不能缺失／重复／移入其他图，固定 home、尺寸和 solid／movable／flammable 能力不可篡改。当前位置允许合法搬动，使用生产地图边界验证，不能强制等于 home 或为历史返还状态回填 home。
- [ ] screen 当前状态仅允许 idle／pulled／held／burning／burned；burning 计时为大于 0 且不大于既有 12 秒，burned 为熄尽后的计时。燃烧／烧毁不能仍是 player.pullId。不要据此反向禁止“曾归还过、后来又烧掉”的历史组合。
- [ ] 新屏 pulled／held 必须与当前在 kiln 的玩家牵引状态对应；held 允许并要求现有实际形式 `hold>0, pullPoint=null`。普通牵引 `hold===0, pullPoint!=null` 保留。paused + pending release／cast 可以合法存在，restore 不提前执行它。
- [ ] 敌人保留实际 hp、timer 和 data 中既有 AI 字段，状态集合以现有 raider 状态机为准；不得用初始化替代“数据看起来复杂”的合法追击中途。新规则不强迫退出敌人回 home，也不以当前两个敌人均退出推导穿行。
- [ ] 对旧 life／canal／journey 的校验继续执行，但不要拿旧窑世界作为新的 scent 或 clamp 目标。不加新的护符、留势、气味资源上限。

存档校验只能验证历史账之间的因果一致性，无法证明任意手写 JSON 曾实际走过路线。真实借离、放下、目睹、穿出必须由模型测试与实际输入证明；不能声称 JSON 校验本身具备防作弊证明。

## 5. 必需模型接点，避免“能导入却不能续玩”

| 位置 | 最小变更与理由 |
| --- | --- |
| createGame | 生成六图与默认 kiln，追加新入口；完成所有 home 初始化后再生成初始 checkpoint。不能只改 contentVersion 而留五图。 |
| 出口 interact／changeScene | 新入口沿用距离与视线检查，再检查 journey 完成。调用旧窑结算时保留实际出口 ID、来源图与落点；先检查是否另一端真实退出，再放下物件、更新世界、建立新 checkpoint。通用 changeScene 不能仅凭目的地猜完成。 |
| 进入 kiln 的 lastSafe | 当前代码无条件选择第一个 kind=rest，未检查 hidden。新棚角未开放时不能因此成为安全点；使用该入口经过地形验证的安全落点，不冒充开放了免费静息。原五图逻辑不趁机重构。 |
| 屏移动／release／火焰 | 实际移动检测借离，实际放下且见证检测归还。释放保留坐标与 burning／burned；新 kiln_screen 接入实际落物声响，不能因旧噪音 ID 白名单只含 shield_board 而无声。读档不得调用这些带结果的回调补记历史。 |
| retry | 仍完整恢复 checkpoint 的世界与 kiln 账；不把外层已获许可叠加进去。沿用现有重试 hp／mana 恢复规则，不由迁移额外恢复伤药或复制新成果。 |
| retreat | 保留已成立的历史、屏位置和烧毁，沿用既有活敌复位规则；清 entry，不把瞬间撤回算真实穿出。即便安全落点同在 kiln，也不能用撤回跨过墙区赚方向记录；正常离开再进入可重新发起穿行。 |
| 暂停、导入／手动载入 | 沿用已修 UI：replace 前更新恢复缓存，恢复后持续暂停，显式恢复才执行 pending。不加加载 tick；射弹、屏燃烧、留势和当前 AI 状态在暂停中保持。 |

新图不复制许照 NPC 来提供共同见证；世界仍保留原五图的许照状态。旧的 following 标记不能触发借还奖励或新共同成果。跨出旧窑回到旧图时既有跟随入图表现也不能反向写旧窑历史。

## 6. 测试清单与固定输入

新建 `tests/kiln-save.test.ts`，存档无效组合可用明确标注的合成边界；需要结果成立的案例放在 `tests/kiln-model.test.ts`，通过真实 act／tick、出口交互和暂停恢复完成。不要只 object.assign 完成所有新事实后再验证自己写出的字段。

### 6.1 固定旧档，升级外层和恢复点

- [ ] `qa/fixtures/return-{main,ridge}-v0.2.2.json`：无版本字段旧四图，外层与 checkpoint 均成为六图 v5，旧玩家／资源／首章事实保持，life／canal／journey／kiln 按各代默认新增。
- [ ] 同目录 `return-{main,ridge}-v0.3.0.json`、`v0.3.1.json`：保留已交付旧版输入，不替换成新导出。
- [ ] 同目录 `return-{main,ridge}-v0.4.0.json`、`v0.4.1.json` 与 `return-canal-v0.4.0.json`、`return-canal-hold-v0.4.0.json`：旧渠事实、压扣位置及留势暂停保持；不得自动授予 journey 或 kiln 成果。
- [ ] 当前实际 v4 输入为 `qa/evidence/journey-complete-export.json`、`journey-phone-complete-export.json`、`journey-desktop-paused-input.json`。将它们另存为注明原始发行来源的 v0.5 固定夹具后使用，不能覆盖上述旧档。完成档应只开新入口；迈步暂停档保留 run.next／waiting／位置，入口仍隐藏。本计划未复制这些文件。
- [ ] 保留现有旧整体五图合成“屏角重叠”案例并升到 v5：restore 保持原坐标，实际牵物可逐步向外脱困；同时仍跑真实旧档，两者证据不得混称。
- [ ] `migrateSave(migrateSave(raw))` 与第一次输出深度一致；所有新实体只有一份；外层与 checkpoint 的新对象互不共享引用。

### 6.2 清单与层级拒绝

- [ ] 分别破坏外层／内层：未知版本、显式 1、字符串 5、缺图、额外第七图、少实体、重复 ID、把新屏塞进 crossing、新出口目的地篡改，均拒绝。
- [ ] v1／v2／v3／v4 偷带 kiln 账、kiln 世界或新入口，即使其他内容完整也拒绝；v5 少 kiln 账／实体不以默认值补齐。
- [ ] 合法 v5 外层＋旧 checkpoint 能迁移；合法旧外层＋独立合法 v5 checkpoint 可各自验证。二层以上 checkpoint、内层超限、内层非法 JSON 或缺 checkpoint:null 拒绝，外层不被当作成功恢复。
- [ ] life/canal/journey 的已有非法工序、双扣、跨图气味、非法领路索引仍拒绝；新增第六图不能让这些校验漏执行。

### 6.3 真实可续玩快照

- [ ] 同意但未移动即导出／恢复：不记 borrowed；原位轻挪再放下也不开棚角。
- [ ] 实际借离后暂停，保持 pulled 与合法落点；恢复仍暂停，放下后坐标一致，不能自动归位。另测留势剩余时间与 pullPoint=null。
- [ ] 刚点燃屏即暂停，保存实际 timer、射弹、player、敌人；全新页恢复后不消耗时间。继续到烧毁，再保存恢复，残屏不复原、不可牵、不给首次棚角许可。
- [ ] borrowed 后实际完好放回且杜芹见证，shelterOpened=true；离场、读档、再返回只保留一次许可，不改路线或旧章账。归还前 checkpoint 的 retry 要撤销外层才获得的许可。
- [ ] 已获许可后屏又被移动／点燃的合法历史快照仍可恢复，当前提示依据物件事实；许可与 loan=returned 均保持；杜芹目睹后如实责备、未见则不声称知情，不能回填屏位置、把火熄掉或重访再发奖励。
- [ ] creek 入→creek 出不记穿通；creek 入→canal 出只记 canal 方向；反向再走才记 creek。中途保存／读档保持 entry；同点撤回不记完成，并可离开重入正常完成。
- [ ] 敌人一人退出、一人警觉的中途保存恢复：不刷新已退出者，不清空合法末见位置，不因退出数量写路线。
- [ ] 无 mana／无 herbs、压扣仍在旧眺台的完成回程档可以进入；存档迁移与旧窑行为均不把压扣回袋。零资源通路由根代理的模型与实际地形重放另证，不凭档案字段宣布通关。
- [ ] 在 workshop／canal 用过药囊后进入 kiln，按既有切图规则收束 scent；在 kiln 请求 use-sachet 不能扣份数、不能新增气味实体。暂停档合法 pending use-sachet 应在恢复执行时按当前场景重新判定。
- [ ] 旧 journey 正在带路的暂停档仍可在 workshop 正常续走；恢复不会因默认 kiln 或入口更新抢写旧目标，旧生活／旧渠 active 任务仍可继续。

## 7. 实施顺序与完成证据

1. [ ] 根代理先收敛白盒剩余实际局面及生产接点；统一上文实体 ID、KilnState、区域导出和许可后毁屏仍保留历史许可、回应受实际所见限制的语义，再开始生产代码。
2. [ ] 先添加旧真实档升级与坏层级失败测试，观察预期 RED；创建 v5 模型及生产模板后接入逐版迁移，运行新 save 文件与现有三代 save 测试。
3. [ ] 添加实际借还／跨出／暂停／重试模型案例，接好 release／changeScene／retreat；测试只修新问题，不重写旧证据。
4. [ ] 根代理最后安排全新页面经真实 UI 导入旧 v4 档、新 v5 暂停燃烧／留势档及手动载入，核对恢复前后时间、实体、资源、pending 和 checkpoint 重试。浏览器串行，后续发行矩阵按根计划执行。
5. [ ] 文档记录具体输入、测试结果与剩余限制；通过模型或浏览器脚本不等于实体 Mac／Safari 已验证，更不等于新路趣味成立。生产结果完成后再由根代理提交、推送和部署。

本文仅完成范围与边界规划；上述复选项全部留待生产实施和验证，不作为已通过的证据。
