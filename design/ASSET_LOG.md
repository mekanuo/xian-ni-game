# 首版美术资产记录

2026-09-09。对应已批准的 `ART_DIRECTION.md`。本轮仅负责 `public/art/*` 与本文件；地图几何、物件状态、动画和运行时渲染由游戏实现负责。

## 产物与来源

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

