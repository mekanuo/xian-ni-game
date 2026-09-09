# 首版美术资产记录

2026-09-09。对应已批准的 `ART_DIRECTION.md`。本轮仅负责 `public/art/*` 与本文件；地图几何、物件状态、动画和运行时渲染由游戏实现负责。

## 产物与来源

环境道具新增记录见下文“M3 环境道具补齐”。

| 文件 | 实际规格 | 用途与来源 |
|---|---|---|
| `public/art/title.png` | 1672 × 941，RGB PNG，无透明通道，约16:9 | 内置 image_gen 原创生成。回石驿标题插画：右侧暖灯驿舍、左侧浅色山景留白。 |
| `public/art/characters.png` | 1254 × 1254，RGB PNG，洋红色键控底，无透明通道 | 内置 image_gen 原创生成四人图集后，以同一工具修改背景。游戏必须在渲染时去除底色，不能按已透明PNG使用。 |

未调用CLI/API后备路径，未读取或输出API密钥；未使用第三方动漫截图、现成人物素材或小说原文。上述图像为本项目提示词生成，不主张具有排他性版权；没有额外附加第三方素材许可。图片保持生成工具输出的原始像素与来源元数据，仅复制到项目目录。

## 角色图集接入

画布由四个627 × 627等分单元组成，均为完整站姿、朝画面右下的三分之四视角。各人物互不重叠。

| 帧名 | x | y | w | h | 近似可见身体边界 x,y,w,h（图集绝对坐标） |
|---|---:|---:|---:|---:|---|
| player-m | 0 | 0 | 627 | 627 | 192,5,301,616 |
| player-f | 627 | 0 | 627 | 627 | 788,15,276,605 |
| tao | 0 | 627 | 627 | 627 | 191,632,330,617 |
| xu | 627 | 627 | 627 | 627 | 767,643,304,604 |

身体边界来自只读像素检查：排除 `r > 190 && b > 190 && g < 65` 后求包围盒，并非已经编辑或裁切的资产。背景像素存在生成误差，例如左上为RGB(239,12,239)、中心为RGB(251,3,250)，不能只匹配严格的#FF00FF。建议运行时色键容差并检查边缘；人物自身不使用洋红色。等分帧的脚底局部y分别约621、620、622、620；可用紧裁切帧与脚底锚点避免横向透明留白影响人物尺寸。首次场景接入仍须截图核对去色边缘、尺寸、脚底与遮挡。

## 实际检查与限制

- 已通过本地view_image目视检查两张最终图片，并只读核对PNG尺寸、模式及像素值。
- 标题图的灯、木桌、山路和院中大石清楚，左侧能放标题；画风比目标更细密、偏写实绘画，标题人物也偏正常成人身长，**不能把标题图当作已验证的三头身游戏场景**。
- 图集四人服色、成年人身份和携带物可分辨：石青/米白玩家、方肩棕衣陶七、背药篓绿衣许照。成人Q版接近约3–3.5头身。只有静态站姿，动作、转向、接物、拒绝与受击由实际运行时补足，不能称为完整动画图集。
- 透明请求及一次只改透明度的重试均输出RGB棋盘格，未成功提供真正alpha。最终通过内置工具把背景改为洋红，以便运行时键控；此限制已通知主线程。没有通过Python或其他脚本修改图像。
- 图集纵向边缘留白较少，人物完整且未跨单元；若需多帧扩展，不能假设当前图集包含动作帧。
- 未生成或替换完整地图；可行走区域与真实碰撞由场景代码绘制。此记录不代表可玩性、视听整合或人工体验验收通过。


## M3 环境道具补齐

`public/art/environment.png`：1254 × 1254，RGB PNG，内置 image_gen 原创生成。斜俯视木屋、竹席雨棚、湿山石和竹草灌木四组，完整轮廓、无字无人物。色彩延续石青瓦、米白墙、湿木棕和苔青。背景为洋红色，仍需运行时容差色键；实际左上RGB(237,12,240)，不是严格单一#FF00FF。没有调用API后备，没有脚本编辑像素。已通过本地view_image与只读像素检查。

虽然构图为2×2，木屋最右轮廓到x=630，略越过几何四分格边界x=627；因此**使用以下独立帧，不采用等分裁切**，避免剪掉屋檐。这些帧包含约6px边距且互不重叠：

| 帧名 | x | y | w | h |
|---|---:|---:|---:|---:|
| inn | 15 | 28 | 621 | 591 |
| shelter | 654 | 109 | 584 | 510 |
| rocks | 31 | 696 | 582 | 447 |
| shrubs | 631 | 689 | 605 | 468 |

实际非底色包围盒分别为(21,34,609,579)、(660,115,572,498)、(37,702,570,435)、(637,695,593,456)。房屋的门和台阶是绘画元素，通行入口、雨棚遮挡透明度以及山石碰撞仍须跟游戏几何一致；道具图像本身不证明这些行为已验证。竹草簇比目标“低矮”更高，可按场景比例缩放并避免遮挡输入对象。没有增加整张地图或改变真实地形。

### 环境图集提示词（生成，最终采用）

```text
Use case: stylized-concept.
Asset type: production environment prop sprite atlas for a 2D hand-painted Chinese cultivation adventure. Square canvas, exactly FOUR individual isolated props in a 2×2 equal quadrant grid.
Style: original handpainted animation game art, crisp dark colored outlines and simple readable light/shadow planes matching chibi characters; muted stone-blue, ivory, wet timber brown, moss-green. Fixed three-quarter slightly top-down camera looking toward the front and right surfaces, coherent upper-left diffuse daylight. Clearly drawable silhouettes at reduced size, no photorealism, no 3D render.
TOP LEFT quadrant: a compact section of a humble Chinese roadside inn, full complete exterior silhouette, timber beam structure, blue-grey curved tile roof, pale ivory plaster inset walls, modest front doorway and warm amber lantern, front and right side visible. Roof must remain fully inside quadrant. No written shop sign.
TOP RIGHT quadrant: a freestanding small creekside rain shelter, four sturdy rough wooden posts and a sloped bamboo-mat roof, simple visible wooden cross braces, open beneath, full complete silhouette; no scenery or ground patch under it.
BOTTOM LEFT quadrant: a single broad group of two or three damp rounded mountain rocks, blue-grey granite, chunky layered angular planes with subtle wet highlights and tiny moss patches, low enough not to hide characters.
BOTTOM RIGHT quadrant: a low irregular clump of muted green shrubs and a few short bamboo shoots and tufts of pale grasses, lush but simple graphic leaves; full isolated vegetation silhouette.
Layout: each object centered inside its exact equal quadrant with at least 8% clear gutter on all sides. Objects fill most of their individual cells but never overlap or cross cell boundaries. All four props drawn at a consistent perspective. No connecting landscape between the props, no ground planes or cast shadows outside their silhouettes.
Background: one uniform pure saturated MAGENTA #FF00FF (RGB 255,0,255) solid chroma-key backdrop across all canvas empty areas. No gradient, no texture, no checkerboard, no white. Do not put any magenta inside the props.
Constraints: no people, no characters, no text, no letters, no logos, no watermark, no grid lines, no borders, no extra props. Exactly four isolated objects, only these objects, complete uncut silhouettes.
```


## 生成提示词

### 标题（生成）

```text
Use case: stylized-concept
Asset type: finished landscape title-screen illustration for an original Chinese cultivation browser game, wide 16:9 composition.
Primary request: 回石驿, a small roadside inn after rain. Original 2D hand-painted animation background art, clean refined brushwork, stone-blue mountain rocks, ivory atmosphere, wet timber brown, restrained warm orange lantern light.
Scene: a crooked wooden lantern stand, a broad distinctive return-stone in the courtyard, two work tables beside the inn. Mountain path and mist-softened mountain silhouettes. Late rain, bright diffused daylight, readable middle to high values, only a few fine rain strokes.
Subject: one small original adult cultivator, approximately three heads tall but adult bearing, seen three-quarter rear, wearing stone-blue outer robe and ivory inner robe with a small ordinary ring at the waist, entering the courtyard. Not any existing anime character.
Composition: inn and warm lantern/window anchored on the RIGHT half; the LEFT 42 percent is spacious pale sky and soft distant landscape with low detail and low contrast reserved for title text to be added in code. Courtyard path leads rightward into warm habitation. Cinematic but welcoming and quietly lived-in.
Constraints: original design, no text, no letters, no calligraphy, no sign writing, no logos, no watermark, no UI. Do not make a yellow aged parchment painting; not photorealistic, not 3D. Wide 16:9 output.
```

### 四人图集（生成）

```text
Use case: stylized-concept
Asset type: production character sprite atlas for a 2D Chinese cultivation adventure. Square image, exact 2 by 2 equal quadrant grid, FOUR isolated full-body characters on a genuinely TRANSPARENT alpha background.
Primary request: four original CHIBI ADULT characters, each approximately THREE HEADS TALL, compact animation-game proportions, mature adult facial bearing, clear hands and shoes. Clean 2D handpainted animation cel-shaded style with crisp dark colored outlines, readable at 80 pixels height, no realism, no textured paper.
Layout: each character centered in its own exact quadrant, same scale, facing diagonally toward lower right in fixed three-quarter view with slightly visible top of head. Generous transparent gutters and outer margins; keep ALL hair, sleeves, bags and feet safely inside its own quadrant. No overlap. Four separate sprites; no contact between sprites.
TOP LEFT: original male player, dark hair short topknot, stone-blue outer robe and ivory inner robe, tied ivory waist, small simple metallic guiding ring at waist, empty hands.
TOP RIGHT: original female player, dark hair tied compactly with short loose locks, matching stone-blue outer robe and ivory inner robe, tied ivory waist, same small simple metallic guiding ring, empty hands.
BOTTOM LEFT: Tao Qi 陶七, a grown adult square-shouldered handyman, broad compact body, friendly focused mature face, dark tied hair, grey-brown coarse cloth tunic and trousers, tool roll at belt, short sturdy boots.
BOTTOM RIGHT: Xu Zhao 许照, a grown adult female herbalist, tied sleeves of muted moss-green tunic, light ivory trousers, dark hair tied back, small herbal basket worn diagonally on back visibly projecting to left silhouette, practical boots.
Lighting: identical gentle upper-left diffused daylight, controlled 2-tone shadow shapes, stone-blue/ivory/wetwood-brown/moss-green palette.
Constraints: actual transparent background, NOT white background and NOT painted checkerboard; no ground, no scenic backdrop, no floor shadow needed. No text, no labels, no dividers, no borders, no symbols, no logos, no watermark. All four are fully clothed adult characters, not children. No resemblance to existing animated Xian Ni characters.
```

### 真透明重试（编辑，未采用）

```text
Use case: background-extraction.
Edit target: the attached character atlas. Remove ONLY the baked grey checkerboard background and produce a true RGBA PNG with alpha=0 outside the four characters. This is background extraction, NOT a redesign. The checkerboard is an unwanted opaque image pattern and must be removed, not redrawn.
Preserve every character, original faces, clothing, palette, pose, position, size, and the 2×2 layout exactly. Keep the original canvas size 1254×1254. Preserve all fine hair, cloth, fingers, and basket edges. No ground, no shadow, no replacement background, no white backdrop, no grey checkerboard, no new elements. The final file must contain genuinely transparent empty pixels around and between the four isolated full-body sprites, ready to composite on a game scene.
```

### 洋红底图集（编辑，最终采用）

```text
Use case: precise-object-edit.
Edit the attached FOUR-character 2×2 game sprite atlas. Change ONLY the grey checkerboard background to one perfectly flat, solid, uniform saturated MAGENTA color #FF00FF (RGB 255,0,255), every background pixel the same flat magenta. This is a chroma-key production atlas, NOT a transparency preview. Do not leave any checkerboard, grey, white, gradients, lighting, texture, ground shadows or vignette in the background.
Keep all four characters exactly unchanged: same faces, same stone-blue player robes, same brown handyman, same moss-green herbalist, all same poses, same full bodies, same dark outlines, same positions and same 1254×1254 canvas with equal 2×2 quadrant layout. Do NOT put any magenta into the characters. Preserve crisp clean dark outlines. Only replace the background and gaps between limbs with solid #FF00FF. No text, labels, logos or new elements.
```

## M3 敌方角色补齐

`public/art/enemies.png`：1254×1254 RGB洋红底图集，延续内置 image_gen 原创生成方式。上一美术任务已生成文件；本轮读取当前文件并目视复核后接管渲染。顶部为灰衣和短褂普通散修，底部为獾形山兽及小山猪形山兽。需求摘要：斜俯视、朴素成年修士、灰褐衣物、动物约至玩家腰部、清楚轮廓、无文字。此处为需求摘要，不冒充缺失的工具逐字提示词。

只读像素检查后的独立紧裁切帧（含边距）：灰衣[120,19,428,688]，短褂[734,66,458,628]，山獾[68,774,489,396]，山猪[690,784,493,385]。渲染时使用已有容差色键，不改源PNG；散修显示约82像素高，山兽约48像素高。伤害点、朝向、蓄势倾斜与退避透明度由真实状态控制。只有静态原画，没有宣称完整逐帧动画。

## 用户试玩反馈后的质感目标（未接入游戏）

2026-09-09，内置 imagegen 生成 [home-target.png](quality-review/home-target.png)，用途为 [改版审阅](QUALITY_REVISION.md) 的材质、层次与界面参考。完整生成提示词见 [image-prompt.txt](quality-review/image-prompt.txt)，未使用 CLI/API 回退。原始生成文件保留于 Codex generated_images，项目副本已存入 design/quality-review。未修改位图，未写入 public/art 或运行包。图中明确标为“改版目标图 · 非实机”；人物占屏偏大、多余灯架等偏差在修订方案中说明。真正可移动物体、动画、镜头与文字仍需分别实现和验证。

## 0.1.1 代码绘制与声音

`src/game/terrain.ts` 是原创 Canvas2D 地面绘制：固定随机种子与实际地形裁切，未编辑或放大已有位图作为新资产。场景灯盏、受击环与光屑由原生图形绘制，源 PNG 保持原样。`src/game/audio.ts` 包含原创八小节五声音阶旋律与合成声音，使用浏览器振荡器、噪声、包络及回声，不含第三方音乐、采样或演员模仿。原人物图集仍为静态图，短退/转身/闪光是状态驱动表现，不能写成全套逐帧角色动画。详情与验收边界见 [0.1.1 修订](QUALITY_PATCH_011.md)。
