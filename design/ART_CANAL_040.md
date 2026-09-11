# 雾岭旧渠：0.4 美术生产与接入规格

2026-09-11。沿用已认可的石驿与 0.2.2 地区精修质量；新增地图与水工器物均为原创改编。本文记录已生成并目视检查的资产与接入要求，**不代表已接入、已通过实机审阅或已发布**。玩法依据 [ADVENTURE_040](ADVENTURE_040.md)，既有风格依据 [ART_DIRECTION](ART_DIRECTION.md) 与 [QUALITY_PATCH_022](QUALITY_PATCH_022.md)。

## 画面与状态原则

- 石青灰石、苔绿、暖旧木为主体，中高明度日光；微小裂纹、木纹和草叶提供近看层次。不可叠黄纸旧化、黑幕或浓雾使手机失读。
- 下游瓦檐是入场识别点，中央水尺是察看焦点，上游低横架与双槽分水槽靠形状区分；道具比邻近地面具有更深的实线轮廓。
- 画面只显示模型裁决的水面、板位置、堵塞、余时和通水。底图不预画水、活动机关或堵塞，以免复水或移板后留下第二份状态。
- 渠底与高岸以低石唇、台阶及湿线区分；石唇不高于人物脚踝。固定水域只在真实矩形内绘制，台阶开放位置和安全岸点一致，装饰不另造碰撞墙。
- 人物和手边可操作物保持在屋檐前可读；屋檐不压过玩家，渠边不依赖悬浮文字解释可站区域。原白线瞄准问题不得回归。

## 三张最终资产

| 文件 | 实际尺寸 / 文件体积 | 用途与限制 |
|---|---|---|
| `public/art/canal-ground.png` | 1536×1024 RGB / 3,946,075 字节 | 整张映射到 1800×1200 世界；细绘平地、宽石路与低草。不是 4K 原画，不靠放大宣称增加细节。 |
| `public/art/canal-architecture.png` | 1536×1024 RGB / 2,228,134 字节 | 4 件独立建筑组件，品红背景供现有 `keyAtlas` 去底。 |
| `public/art/canal-props.png` | 1254×1254 RGB / 1,870,320 字节 | 8 件道具/状态及 1 位独立人物，共 9 帧，品红去底。 |

两张图集沿用现有 `region-architecture` / `life-props` 的色键规范，不声称源 PNG 已有透明 alpha。应先对整张源图执行现有 `keyAtlas`，再注册裁帧；直接加载显示源图会看到品红背景。图集留有独立轮廓与内孔，水轮辐条、筛框缝隙、瓦棚柱间都需去底。所有裁框坐标为源图像素 `[x,y,w,h]`，已逐区域读取材质像素包围盒并向外预留 4px。

### 建筑裁帧与世界摆放

| 帧名 | 裁框 | 建议世界基点 | 显示宽×高 | 说明 |
|---|---|---|---|---|
| `shelter` | `[26,23,734,480]` | `(355,930)` | `410×268` | `origin(.5,1)`，底缘落在取水处；邵禾 `(260,960)`、石槽 `(350,930)`作为独立前景。人物走到檐内时需层级处理，不以屋檐图块遮住其身体。 |
| `stopFrame` | `[835,186,645,308]` | `(1240,350)` | `155×74` | `origin(.5,1)`，两槽端支持横滑；活动板在其前层按模型坐标移动。不可把大横梁拉成长墙横封安全操作点。 |
| `diversion` | `[52,615,628,311]` | `(640,365)` | `186×92` | `origin(.5,1)`，左右双槽分别邻近板 `(600,350)` / `(680,350)`；槽身为低座，活动板独立。 |
| `steps` | `[822,664,664,265]` | `(1130,465)` | `84×34` | `origin(.5,1)`，北侧落脚连到渠底北缘 `y460`，不得伸入截水架安全站位。西侧开放口可由同材质低石块表达，不强行旋转立面台阶。 |

以上是美术接入建议，不修改碰撞或互动坐标；最终依真实输入、遮挡和世界脚点复核尺寸。固定架绘在活动板之后，木板不随背景刷新出现第二份。现有真实障碍可按碰撞范围绘石堆/边坡，底图已经去掉不符合规则的高石壁和台阶。

### 道具裁帧与显示尺度

除水轮外，器物默认 `origin(.5,1)`、本地脚点 `(0,5)`；位置跟随实体真实世界坐标。人物可沿用脚下固定接触影，动作不能挪动规则坐标。

| 帧名 | 裁框 | 建议显示宽×高 | 绑定 |
|---|---|---|---|
| `diverter` | `[38,125,346,136]` | `70×28` | `canal_diverter`，一个提环，实体近地板轮廓 |
| `stop` | `[441,68,374,228]` | `70×43` | `canal_stop`，双提环、较高板面，移动/留势/固定都只画同一物件 |
| `screenBlocked` | `[872,44,350,291]` | `76×63` | `canal_screen` 清理前，卡斜筛框与枝叶 |
| `screenClean` | `[31,416,351,291]` | `76×63` | 同一筛框清理后，保持机位、大小和轮廓，露出筛条缝隙 |
| `tub` | `[430,438,395,246]` | `108×67` | `canal_tub`，干石槽；实际通水时才在内膛叠水光，不能给整槽套透明蓝矩形 |
| `wheel` | `[872,401,351,352]` | `65×65` | 下游小水轮，建议中心 `(439,898)`、`origin(.5,.5)`；依实际水流旋转，低动效静帧加水痕 |
| `gauge` | `[121,797,146,404]` | `24×66` | `canal_inspect`，红褐木尺，刻痕无伪文字；水位标记从真实模型读数生成 |
| `keeper` | `[501,726,209,488]` | `36×84` | `canal_keeper` 邵禾；灰蓝短褂、卷袖、褐裤、发带、竹勺，独立人物帧，不复用许照 |
| `bucket` | `[923,828,239,354]` | `30×44` | 瓦檐前单只空桶；由真实验水结果挪开，不作为新交互任务 |

邵禾本帧为成年动画化人物，衣着与竹勺区分于许照的药篓。仍是单张静态人物原画，允许翻转/轻摆/交谈朝向，不应称为完整逐帧动画。筛框前后两帧相同朝向，清理只替换内含枝叶，不换成另一种物件。

## 精确渠体与表现分层

底图第一次生成曾把矩形凹池画偏且添加高石壁，故已定向修图，删除这些几何构件。最终底图只承担平地材质；以下必须由渲染按规则共享常量构造，不能按背景猜边界：

- 主渠底：`CANAL_CHANNEL = {x:1030,y:460,w:190,h:160}`；旁渠：`CANAL_SIDE = {x:700,y:450,w:110,h:180}`。
- 干态从底图或现有石面材质取低对比纹理，渠床略冷、低石唇略亮；湿态在精确矩形内部叠青灰流纹，不能越界涂上安全岸。岸唇只占数个世界单位，不让渠底变成深坑。
- 常通西高岸、东外岸要以连续浅路保持可读。低草可走；确实不可走的四处石坡须按 `canal-content.ts` 障碍边界独立绘制，禁止靠底图造第五处无形墙。
- 干渠台阶 → 柜架安全点之间留下清楚可步行面。复水预告先显示移动湿锋/岸边短刻痕，再发生规则中的来水推回；不得用固定大圈或白线代替空间变化。
- 场景次序建议：地面 → 精确渠体/水 → 固定低槽架 → 器物与角色按脚点排序 → 只在外缘的植被/雾。水尺和板的提示永远不烘进原画。

## 关键时刻、声音与验收

| 时刻 | 画面实际改变 | 声音 / 静音替代 |
|---|---|---|
| 抵达取水处 | 瓦檐下空槽、静止小轮，视线沿干路向上游 | 上游水声与檐滴；木尺旧水痕辅助理解 |
| 推分水板 | 板沿真实导槽移动，旁渠湿、主渠退水，西高岸不变 | 木擦声落槽轻碰，水声换位；低动效仍读湿线 |
| 留势下渠 | 板停在止水槽、短计时随真实余量收缩；人沿台阶进出 | 木架轻绷与临近到期短提醒；暂停冻结声音与动作时间 |
| 亲手清堵 | 人朝筛框操作两息，枝叶消失、同一筛条露出 | 草木摩擦/少量碎叶；中断不得播完成音 |
| 归到瓦檐验水 | 实际恢复主流后小轮转动，槽内有水；玩家验水才移开空桶 | 细水入石槽与小轮吱声，强度低于术法/危险反馈 |

交付前需在真实桌面、矮窗口及手机 DPR3 检查：没有品红边；各器物脚点和碰撞相符；瓦檐不遮互动；水轮围绕轴心转；两帧筛框切换不跳位；湿线与可通行边界一致；邵禾没有变成许照；旧地图加载与存档不回归。资产目视检查不能替代这些实机检查。

## 来源、生成方式与最终提示词

使用内置 `image_gen`，没有调用 API/CLI 或引入外部画作。初稿与修图原件留在工具生成目录；只有上述三张最终图复制入项目。以现有资产实际目视结果确认材质、镜头与密度，不复制动漫造型或原文。

最终提示词组的生产内容如下（英文调用，保留关键约束供再生成）：

1. **Ground** — “Production top-down orthographic 2D RPG ground plate, 3:2. Refined ancient Chinese mountain canal, meticulous pale gray-green paving, worn warm earth, low moss, ferns and tiny white flowers, clean daylight. Broad southwest court, continuous west and eastern outer safe roads, central inspection terrace. No characters, water, buildings or movable devices.” 定向修图追加：“Preserve texture and loop-road composition; remove every tall outcrop, wall, stair and both misplaced basins. Replace with flat freely traversable low stone and moss. Exact channels are rendered in the game; no depicted obstacles, pits, elevation changes, blur or pixel art.”
2. **Architecture** — “Four isolated sprite cells, 2×2, 1536×1024: empty blue-gray tiled collection shelter; horizontal sliding sluice support with two rails and no movable blade; low dry dual-slot stone-and-wood diversion trough; short worn low bank with three shallow steps. Hand-painted warm timber, sage moss, gray stone, elevated frontal view, no people, text or water.” 最终背景修图：“Keep every subject and placement; replace all backdrop, holes between posts/rails and exterior shadows with perfectly flat saturated #FF00FF. Preserve stone interior, crisp silhouettes, no gradient or halo.”
3. **Props** — “Nine isolated cells, 3×3: light single-ring diversion board; wider two-ring stop board; twig-jammed wood sieve; identical clean sieve; empty stone water trough; circular paddle wheel with open spokes; reddish notched depth gauge without readable text; original adult female keeper in indigo-gray short rolled-sleeve work jacket, brown trousers, rust hair tie and bamboo dipper; empty rope-handled wooden bucket. Refined hand-painted ancient Chinese RPG, no scenery, labels or pixel art.” 最终背景修图：“Keep nine subjects and character identity; replace all background and anomalous exterior red/yellow fringe with solid #FF00FF, including sieve and wheel holes. Preserve genuine rust cloth and autumn leaves, no glow or shadows outside.”

未声称任意角度立体模型、逐帧角色动画、实体手机体验或全部小说场景制作完成。

## 首轮实机精修

入口实机发现浅绿连续线与等距砖过于平整。现从建筑原画的真实石面取样，将暗渠盖板、渠床和岸唇一次烘焙为局部高清纹理；石块长短、接缝和苔痕有细微差异，湿面保留石床深浅，不改变通行矩形。每次景观刷新替换纹理，不逐帧取样。

长条石坡改为自然比例的叠石组覆盖实际障碍范围，避免把单块原画纵向拉成高柱。所有旧地图仍沿用既有绘制。最终视口截图与根代理目视复核另记于 qa/evidence/canal-view.json。
