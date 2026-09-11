# 背墙旧窑正式生产计划

> 执行采用 subagent-driven-development 与 game-build/game-qa，根代理拥有集成、浏览器、Git、部署，独立代理只写指定文件。用户已授权自主设计、实施与里程碑推送。

## 目标与边界

按 ADVENTURE_060 和 ART_KILN_060，在既有五图上接一张完整新图：溪道北路进入西院，东端接旧渠高岸；还可反向进入，身体走至另一出口并真实切图才记跨越。核心规则与白盒一致，保留两敌、屏的位置/烧毁/退场；完成同行回程（包括独行）后开放，不补算其他章节。

新增状态只记录 visited、entry(west/east/null)、crossed{west,east}、loan(none/agreed/borrowed/returned)、shelterOpened。crossed.west表示从东进并实际西出，反之亦然；原端返回不算穿过。loan保留首次借还历史，屏物理状态权威；许可已给出后不因后续挪屏自动撤销，但杜芹能实际看见烧毁时如实回应，不称屏完好。

## 顺序和独占文件

1. 根代理收敛类型、内容与接口；读取 KILN_060_SAVE_PLAN/CONNECTION_PLAN 后敲定坐标。contentVersion=5，新增SceneId kiln，完整世界清单加入新图。新增 kiln-content.ts 复用白盒第三修订几何，仅增加不阻碍原路的NPC、静息点与双出口。已有地图只加入口牌和必要贴地路面。
2. 规则代理独占 kiln.ts、tests/kiln.test.ts：先红后绿，用实际动作与tick验证借用需要许可+目睹真实离位，归还需要完好落地原位+目睹；对白或点头不算借还。入口/跨出事实分开，不读“访问旧渠”当通路；未借也能通行。根代理接model钩子和章提示。
3. 存档代理独占 save.ts、tests/kiln-save.test.ts：严格既有版本清单后迁移v5，外层和checkpoint一致，保留资源/旧成果/旧物位置，不发奖励；非法第六图、缺失/重复实体、关系矛盾不得静默接受。固定旧版真实导出不改写。根代理整合类型编译。
4. 根代理使用美术方向/imagegen技能制作必要资产，scene渲染与audio接实际状态。至少独立杜芹、窑墙/窑口、西院晾坯组合、可搬屏与烧毁残骸；控制碰撞边界、脚点、屋檐遮挡、字贴牌、手机DPR。正式入口不显示白盒按钮。
5. 模型集成验证后运行真实游戏：旧0.5档升级，走到真实入口，跨窑至另一地区再返回；独行/不借仍可走；借屏完好归还与烧屏后果分别复测。跨图/暂停存读在新页面恢复，检查资源与实体不复原。桌面/矮窗口/手机真实场景截图，继承既有声音/输入检查。
6. 每个完成的源码里程碑测试、审查、提交推送；正式候选运行完整verify，PASS且clean再合入主源码、deploy-pages、public-check，并核对同一公网资源哈希和真实输入。未完成新图不得用0.5旧PASS冒充发行。

## 最小生产接口

kiln-content.ts：KILN_SCENE、KILN_POINTS、KILN_WORKSPACE、initialKilnEntries(scene)。实际连接点由连接审查敲定；名字各图唯一。屏沿用shield_board以继承现有实体声响规则，NPC id/type duqin，静息点 kiln_rest。

kiln.ts：createKilnState、kilnTick、kilnChoices、kilnChoose、kilnInteract、kilnBeforeTravel、kilnObjective、kilnDescription。复用LifePorts的真实free/clearLine/emit/dialogue，距离不得让NPC隔墙见证。travel钩子在离场前读取旧图/实际入口实体，切换后记录进入方向；分支不能绕过既有canInteract。恢复checkpoint不因出现visit标志获得成果。

## 验证依据和风险

空间第三修订已真实往返HP3/MP0；补证归屏HP4/MP4，烧后跨过旧屏再返回时HP3/MP5，截图前额外实际受击降到2，原观察位不再安全。模型临时探索376/25包含2临时case；永久基线应单独记录，不以探测文件充数。白盒未实现杜芹、正式双图切换或存档，不代表这些项已PASS。

杜芹站位需处于西院安全侧且能看见作业面；屏借离后不可凭魔法远视确认。美术不得收窄已验证的北路和东侧空间。新章是短段连接，不许凭测试耗时宣称10分钟内容或全书完成。
