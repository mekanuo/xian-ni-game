# 0.7 小集美术素材交付

2026-09-11。生产入口为根代理确认的同包十二 case 白盒 PASS（`qa/REVIEW_070_WHITEBOX.md`），沿用用户持续自主续作授权；原 `ART_MARKET_070.md` 的“尚未生产”时间状态由本次明确授权接续。本文件记录实际交付，不替代正式场景合成验收。

## 文件与实际来源

四个最终文件均是内建 `image_gen` 生成结果的原样复制，没有用 CLI/API、Python 绘图或放大重采样冒充原画。最终三张图集为 RGB 洋红底，**没有真实 alpha 通道**；地材也是 RGB 全不透明。人物第一次要求透明时返回了画在 RGB 上的棋盘，已用同一内建工具只改背景；首次棋盘版未作为最终工程资产。

生成目录（以下 source ID 均是其下原始 PNG 文件名）：

`/home/zhangjingzhou/.codex/generated_images/01a08e74-9183-7932-87b0-10da57037ee8/`

| 工程文件 | 实际像素 / 模式 | 最终 source ID | 内容 |
|---|---|---|---|
| `public/assets/market-ground.png` | 1536×1024 RGB | `exec-8c09a83a-2a26-4424-9292-bbf8ab55a55f.png` | 平面压实浅土，无路线、建筑或抬高障碍 |
| `public/assets/market-environment.png` | 1254×1254 RGB | `exec-06bd5f07-ae01-4bb5-8c13-f85ecf7e5ab0.png` | 瓦顶、货屋立面、砖石墙面、压顶、货面、包裹六模块 |
| `public/assets/market-props.png` | 1774×887 RGB | `exec-4d4827e8-f346-4e2a-8cb3-98b6166513fa.png` | 闭门、收纳门、闩、空筐、烧毁低残片 |
| `public/assets/market-shenyan.png` | 1536×1024 RGB | `exec-04cd98c8-9059-40bf-9f6c-9eecf607af5b.png` | 沈砚同脸同衣的静立、移步、收臂停步 |
| 未交付的首次人物源图 | 1536×1024 RGB 棋盘背景 | `exec-de691b6c-809b-451b-99d8-17fde81daada.png` | 只作背景修正的输入源，未加载进游戏 |

输入前已实际查看现有 `public/assets/kiln-environment.png`、`kiln-duqin.png` 和 `public/art/characters.png`。生成时人物仅引用 characters 的比例/笔触，环境和器物仅引用 kiln-environment 的材质；没有使用旧 NPC 裁帧换色。沈砚的茶棕束袖、米色交领、暗青腰布、收束发髻、窄眼眉与腰间小包为此次新身份，未引用动漫截图或原作人物图。

## 裁帧与实际脚点

像素均为原图左上角起的 `[x,y,width,height]`。按当前 keyAtlas 的去底条件只读测量实物包围盒后各留约 2 px；helper 仅注册帧，不破坏源图。所有字段已写入 `src/game/market-art.ts`。

| 纹理 key / 帧 | 像素裁帧 | 首次接入方式 |
|---|---|---|
| market-environment / roof | [54,19,526,479] | 每货屋内宽240，北屋屋顶高224、南屋210；独立于立面 |
| / facade | [647,73,568,416] | 北屋下端立面240×79、南屋240×73，脚严格在380/780 |
| / wall | [29,532,578,291] | 取内部砖石课程局部采样，按每个真实墙矩形画朝向立面 |
| / coping | [649,623,567,105] | 小块压顶拼接；不把整个墙高平铺成地砖 |
| / counter | [33,858,574,330] | 北屋内(542,318)，75×57，最下端375，通道内无桌腿 |
| / parcels | [659,911,558,213] | 南屋内(708,750)，62×24，脚774 |
| market-props / closed | [259,18,165,448] | 30×120，局部原点(.5,1)，位置(0,60)，对应门真实x650..680/y380..500 |
| / open | [618,32,449,426] | 100×50，原点(0,1)，局部(-15,-60)，实图收于x650..750/y330..380 |
| / latch | [1250,221,380,182] | 预留细节；闭门原画已有闩，当前不重复叠一个闩 |
| / crate | [164,495,582,343] | 宽50，高约29.47；局部下沿y20，悬起只减8 |
| / burned | [943,563,667,274] | 宽50，高约20.54；局部下沿y20，无完整直立筐墙 |
| market-shenyan / idle | [112,79,381,883] | 身高82，宽约35.38，原点(.5,1)，脚下沿实体y+5 |
| / walking | [572,86,423,866] | 身高82，宽约40.05，同脚下沿，轻移步态只读真实位移 |
| / waiting | [1149,85,330,872] | 身高82，宽约31.03，同脚下沿，收臂回看来向 |

屋顶、货屋墙面和石墙都在 Canvas 内按 `MARKET_SCENE.obstacles` 实际矩形 clip；仅1–2世界单位的柔和接地影落在矩形边缘。货屋未烘焙进地面母版。门打开直接切到房屋内的收纳帧，不以动画重新判定碰撞消失时刻。路牌由既有 wayfinding 系统写字，图集没有中文。

## Helper 接入

已实现以下独立接口，根代理负责 scene 接线：

```ts
registerMarketFrames(environment: Phaser.Textures.Texture,
  props: Phaser.Textures.Texture, shenyan: Phaser.Textures.Texture): void
paintMarketLandscape(scene: Phaser.Scene,
  landscape: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics): void
createMarketVisual(scene: Phaser.Scene, e: Entity):
  Phaser.GameObjects.Container | undefined
updateMarketVisual(c: Phaser.GameObjects.Container,
  e: Entity, s: GameState, reduced: boolean): void
drawMarketHomeRecord(g: Phaser.GameObjects.Graphics, s: GameState): void
```

- 地材直接加载 `market-ground`；后三图先加载 `market-*-source`、通过现有 `scene.keyAtlas` 得到对应无 source key 后注册。
- `paintMarketLandscape` 负责所有真实墙/屋、平面地材与外围极少旧草。market 分支跳过 scene 通用障碍石块与通用外围灌木，以免重复几何或虚构散石。
- `createMarketVisual` 只处理 market_merchant / market_door / decoy；玩家、许照、散修、两路牌仍由既有显示负责。将返回子容器放在实体真x/y父容器，沿现有 lifeVisual 分派 update；这三个ID的通用 drawObject 提前返回。
- 沈砚 image 在子容器 `getData('image')` 中供只读 presentation 取实际变换。不能再让 scene 普通 NPC 的 image 设置覆写 helper 的步态/朝向；helper 用真实模型位移、s.time与leading/waiting读事实，暂停/对白/败退冻结已有姿态。垂直朝向保留上次左右面，避免脚点附近翻面抖动。
- 木门完全读实体state；exchanged不参与提前开门。不会补造闩事件或播放读档开门音。
- 空筐读取burning/burned/pulled/held与真实timer/time，复用已有火焰色和位移反馈。无诱敌循环动画或路线线条。
- 桌案纸签局部(-36,-34,26,14)，在原图下缘空处。只读 `market.reported` 四方向位；同一路只添一行笔迹，反向已报告多一个小方向末梢。through、visit、exchanged、许照可见状态均不能画出笔迹。纸面不是共同见证。scene桌案stateKey需含reported四位，才能当面报告后即时刷新。

## 透明处理、清晰度与当前限制

最终图集角像素分别为 environment=(235,10,240)、props=(239,11,240)、shenyan=(237,13,237)。它们是视觉均匀的洋红底，生成器未严格保证每像素等于#FF00FF。现有keyAtlas按 `min(r-g,b-g)>85 && r>140 && b>140` 抠除强洋红，中间带降alpha并去溢色；这些背景满足强洋红条件。未自行修改共享抠底代码，未把RGB文件误称为已透明。

全部四个工程最终路径已通过 view_image 实际查看；角色发丝/衣摆/脚未裁断、帧间互不粘连，器物开门保持立叶、烧毁态贴地，环境为六个独立对象。**尚未浏览器查看 keyAtlas 后的边缘与正式场景合成**，故不能宣称完全无粉边或手机已通过。

生成器实际返回环境1254方图而非提示词2048，主屋面有效短边475（裁帧479）低于美术候选768目标；门叶有效长边444也低于候选512目标。当前在240宽屋面与30×120门的设计显示下使用原生细节，未用简单插值写大像素数。沈砚全身约862–879 px、筐宽578 px满足原候选有效主体尺寸。是否需要进一步提高环境源细节，应以三视口实际合成的缩放清晰度为准；不能把文档目标冒充已达到。

地材仍有细土纹，helper用0.58纹理透明度与广域低对比磨损留白压到角色后；无规则网格、白色操作线、指路亮带或新增虚构障碍。立墙用窄压顶+更深立面而非全高压顶平铺；正式北口L角、门收纳帧的压缩比例、摊前人与货面的构图仍需根代理实际画面验收。

仅运行了针对 `src/game/market-art.ts` 的 TypeScript 静态核对并PASS；没有运行构建、浏览器、完整测试或Git操作。音频未在本资产任务实现，由根代理沿ART候选接入并验证。

## 完整生成提示词

下列英文为实际传入内建工具的完整字符串。没有额外隐含负向提示词。引用路径均位于本生产worktree。

### 沈砚初次生成（透明失败源）

引用 `public/art/characters.png`：

```text
Use case: stylized-concept. Production game sprite sheet, three separate full body poses of ONE identical original adult Chinese travelling merchant woman, Shen Yan, for a refined Chinese xianxia hand-painted 2D adventure. The attached characters sheet is ONLY a reference for compact adult three-head body proportions, painterly line quality and mild overhead camera; do NOT copy any existing face, costume or identity. New identity: composed observant adult face, narrower almond eyes and straight brows, black hair neatly coiled in an asymmetrical low bun with a small plain wooden hairpin, no headband, no flowers. Warm deep tea-brown fitted short jacket with tightly gathered sleeves, pale ivory crossed collar, narrow desaturated dark teal waist cloth, charcoal trousers and practical cloth ankle boots. One small tied parchment packet at waist, no backpack, no medicine basket, no pottery apron, no weapon, no glowing object. Compact THREE HEADS TALL, adult shoulders, adult hands and restrained mature expression, not toddler, not realistic human proportions. Finest clear hand-painted contour and softly brushed cloth shading matching a premium mobile game. Even neutral light upper left, no yellow filter. Exactly three equal full-height isolated figures in one horizontal row with generous separation and equal foot baseline: LEFT three-quarter front facing slightly right, relaxed attentive working stance; CENTER same woman and clothing in a restrained walking step toward the right, torso turned slightly, one foot advancing, hands empty; RIGHT same woman facing three-quarter right, stopped with feet planted, one forearm drawn close to chest and other hand lowered, head slightly turned to look back. All three identical head size and body scale, all feet completely visible. Transparent alpha background, not a drawn checkerboard, no ground plane, no detached cast shadow, no labels, no text, no extra poses. Landscape 1536x1024 sprite atlas, each figure centered in its own third, about 760 pixels tall.
```

### 沈砚最终背景编辑

仅引用首次 source `exec-de691b6c-809b-451b-99d8-17fde81daada.png`：

```text
Edit this existing production sprite sheet. Preserve the three women EXACTLY: identical faces, costume, proportions, poses, painted texture, colors, positions and complete feet. Change ONLY every part of the background, including all gray checkerboard squares and gaps around/between limbs, into one perfectly uniform solid vivid #FF00FF MAGENTA key color. This is a chroma-key production atlas, not a transparency preview. NO checkerboard, NO gray squares, NO gradients, NO floor, NO new shadows. Keep landscape 1536x1024 and all three figures uncropped. Preserve tiny edge detail cleanly.
```

### 环境母版

引用 `public/assets/kiln-environment.png`：

```text
Use case: stylized-concept. A high quality production modular environment sprite atlas for a hand-painted Chinese mountain market game, using the attached kiln atlas ONLY as a reference for delicate brush texture, muted natural materials, soft upper-left light and clean object edges. Invent market architecture, do NOT reproduce its kiln mouth, ceramics or large awning. Orthographic mildly overhead 2D adventure camera, no vanishing perspective, no isometric diamond footprint. Exactly SIX separate architectural modules on a perfectly UNIFORM SOLID #FF00FF MAGENTA key background in a tidy 2-column by 3-row atlas with generous blank gutters, each complete with no overlap. TOP LEFT: a complete rectangular blue-grey small-tile gabled ROOF ONLY, no walls or ground, viewed slightly from above, ridgeline running top-to-bottom, footprint axis-aligned, delicate overlapping curved tiles, no dramatic sweeping eaves, roughly square. TOP RIGHT: a broad pale grey plaster and timber market STORE WALL FACADE ONLY, front upright face with compact shuttered window and low stone foundation, no roof, no door opening leading into a new room, no ground. MIDDLE LEFT: upright old grey stone-and-brick WALL FACE MODULE, substantial vertical masonry with a narrow coping strip and visible end thickness, tiny localized moss, not a flat walkway, no arch or door. MIDDLE RIGHT: straight overhead COPING MODULE ONLY, a restrained row of flat old grey capstones, rectangular strip, no wall face or ground. BOTTOM LEFT: a small rectangular inset wooden GOODS COUNTER / wall niche with rolled indigo and cream cloth, several neatly tied paper parcels, twine spool, one blank paper sheet held by a wooden weight, no coins or pottery; no freestanding tall posts, no awning, no person. BOTTOM RIGHT: a compact GROUP OF TWO TIED CLOTH PARCELS and one closed shallow wooden box, calm detailed textures, for placement inside a building footprint. Hand-painted refined fantasy realism, muted stone blue, ivory plaster and weathered warm wood. All modules are detached reusable pieces, NOT a map, NOT a whole village, no paths, no text, no symbols, no decorative obstacles scattered around. Pure solid #FF00FF background behind and between every object, no transparency simulation, no checkerboard graphic, no gradient background, no floating global shadow. Square 2048x2048 atlas.
```

### 器物状态母版

引用 `public/assets/kiln-environment.png`：

```text
Use case: stylized-concept. Production isolated prop atlas for a hand-painted 2D Chinese mountain market game. Use attached kiln atlas only for soft brushed wood/stone detail and refined muted palette. Exactly FIVE separate cutout objects on a perfectly UNIFORM SOLID #FF00FF MAGENTA key background, no printed checkerboard, no map or floor, no text or labels. Arrange into a clear two-row atlas with generous empty margins: TOP LEFT a CLOSED narrow wooden yard-gate leaf seen from a mild overhead game angle, sturdy weathered brown slats, two dark iron hinges, one short horizontal wooden latch, no roof or gateway arch. Its FOOTPRINT long direction is vertical on the page (north-south), showing a narrow upright west-facing side plane rather than a broad front door; whole shape elongated vertically with about 1:3 width-to-height, refined top edge and clear front/back endpoint. TOP CENTER the SAME gate leaf in OPEN/STOWED pose, turned 90 degrees so its footprint extends horizontally rightward from its hinge; still an UPRIGHT WOODEN LEAF with a visible side face and top edge, not a board lying flat on the ground; warm matching wood grain and iron hinges, no enclosing doorway or posts. TOP RIGHT an isolated SMALL WOODEN SLIDING LATCH with two iron loops, no supporting door. BOTTOM LEFT a complete EMPTY LIGHT WOODEN CARRYING CRATE with thin slats, two small hemp rope handles, visible hollow interior, horizontal rectangular footprint about 5:4, modest low height, mildly overhead perspective, no contents. BOTTOM RIGHT the burned state of that SAME crate: a low FLAT cluster of charred broken wooden slats and rope ashes, no upright intact walls, no flames or smoke, same overall footprint and camera. Medium-high value hand-painted colors, delicate readable wood fibers, no photorealism, no pixel art, no magical ornament, no treasure chest framing. Landscape 2048x1024 sprite atlas.
```

### 地材

无引用图：

```text
Use case: stylized-concept. Flat production ground material for a premium hand-painted Chinese mountain market 2D game. Full-frame overhead texture, softly brushed warm light grey-beige compacted earth, pale mineral silt, subtle broad natural tonal variation and VERY SPARSE tiny worn flat stone chips. Quiet low contrast and large calm areas; fine detail remains secondary to characters. Soft neutral daylight with no directional cast shadows. The whole image is only one continuous ground MATERIAL, no recognizable roads or route shapes, no buildings, no walls, no doors, no steps, no curbs, no water, no vegetation clumps, no persons, no objects, no text, no icons. Do not make a gravel field or a dense repeating tile pattern. Clean refined illustrated brush quality, gently desaturated stone/earth palette matching warm stone courtyard adventure art, not photographic, not pixel art, not yellow parchment, no vignette, no border. Landscape 1536x1024, entirely opaque.
```

