# 0.8 手机活动镜头中心偏差定位

2026-09-11。只读当前 `scene.ts`、`be528d4:src/game/scene.ts`、本机 Phaser 3.90 源码及 R3 报告；未运行浏览器、构建、测试或修改源码。根代理正以 r6 `CLyXa97I`、4203 串行运行 R4 三视口，本报告不预判结果。

## 已证现象

`qa/spar-presentation-2026-09-11T21-38-59-678Z/report.json`：desktop PASS，phone FAIL，short NOT_RUN。手机实际脚本为 `http://127.0.0.1:4202/assets/index-0pA0mHRI.js`，SHA256 `69a366de61badbc0ea8ec590dd35246550e434e50ae734087dec0f79dc4ead41`。

手机 viewport390×844、DPR3，canvas1170×2532。真实拖图后点“回到身边”，再继续，定位已完成且无 pending 路线；镜头自动构图开始时 CSS zoom≈0.664476、worldView=(573,277,587,1270)。其后等待真实收敛20秒超时，失败采样为：

```text
zoom = 0.6033333333344149，density = 3
worldView = {x:571,y:171,width:646,height:1399}
worldView中心 = (894,870.5)，横向目标 = 900
paused=false，dialogue=null，phase=positioning
positionPath=[]，positionWaiting=false，shots=0
```

zoom 已到目标附近，横向仍差6世界单位；不能以“只等了一秒”“仍未就位”或放宽中心断言处理。报告只保留起始和失败采样，未保存逐帧原始矩阵，所以“稳定偏差”是长等待末尾与缩放收敛相结合的观测，不能虚构出完整恒定轨迹。

## Phaser 的两个不同读写接口

`node_modules/phaser/src/cameras/2d/BaseCamera.js:639–696`：

- `centerOnX(x)` 写 `scrollX=x-width/2`，Y同理；启用 bounds 时再 clamp。
- 它不通过当前显示矩阵反算 scroll，width/height 是相机 viewport 的内部像素尺寸。

`BaseCamera.js:838–888` 的 `getWorldPoint`：

- 先求 `camera.matrix` 的逆矩阵；此矩阵来自 render 阶段。
- 再使用**当前** rotation、zoomX/Y、scrollX/Y 加入滚动项，最终将输入屏幕点转换为世界坐标。
- 因此它是屏幕拾取 API，不能无条件视为相机中心存储字段的直接逆。`setZoom:1361` 只写 zoom 属性，不立即重建矩阵。

`node_modules/phaser/src/cameras/2d/Camera.js:489–601` 的 `preRender`：

1. 处理 follow／roundPixels／bounds 后写 scroll。
2. 以 `scroll+viewport/2` 更新 midPoint。
3. worldView 的宽高与左上角分别四舍五入。
4. 依据当前 zoom、rotation、origin 建立矩阵，最后叠加 shake。

旧 `updateSparCamera` 在 Scene.update 内先改变 zoom，再用 `getWorldPoint(width/2,height/2)` 反馈给 `centerOn`。这里确实可能把本次 zoom 与上次 preRender 矩阵混合；这是可证的接口／时序风险，不需要猜测 DPR 错配。

## 为何不能把全部6单位偏差直接归因于旧矩阵

在 viewport原点为0、origin=.5、rotation=0、无shake、矩阵已经对应当前zoom的条件下，`getWorldPoint(width/2,height/2)` 数学上仍会等于 `scroll+viewport/2`。仅“上一帧矩阵”可解释变焦中的误差，**不能单独证明 zoom 已收敛后仍差6单位的唯一原因**。

当前报告没有 raw scroll、camera x/y/origin、matrix、shake offset 或每次 preRender 的采样。静态项目没有主动旋转／移动 viewport，roundPixels 配置为 false；但这些不是失败运行中所有内部字段的直接证据。不得把矩阵尚未刷新、偏移来源或 renderer 状态补写成已观察事实。

worldView 本身的中心舍入误差每轴至多约0.5世界单位，不能解释横向6单位。手机1170×2532的默认半宽／半高均为整数，也不能仅凭中心取整说明这次差值。Phaser矩阵为Float32Array，存在数值舍入，但在这些量级不应不经计算就将6单位统称浮点误差。

## r6 修改的边界与判断

当前 `scene.ts:213–239` 两处分支采用 `{x:scrollX+width/2,y:scrollY+height/2}`，与后续 `centerOn` 的存储语义一致，直接去掉拾取矩阵这一不必要反馈环。active／positioning关闭bounds，故水平固定目标的迭代严格是 `C_next=.84*C+.16*900`；只要正常更新，误差按 .84 收敛，没有由该公式产生的非零固定偏差。

- settling 保留原zoom、跟随实际玩家；仅改中心读取来源，不修改余弹速度、路径、规则时钟或阶段。
- 无run探索启用bounds，centerOn仍可能被地图边界clamp；不能要求边缘玩家绝对居中。这是原约束，不是新中心公式失败。
- manual／paused／dialogue／defeated前置返回保持；真实拖图与回身不应被新公式夺回，暂停恢复仍应继续原阶段。
- 600范围、HUD可用高度、density与世界投影的计算未改变。不要顺手将画布像素width替换为CSS width，它必须与centerOn相同单位。
- 仅练场自动镜头改动。旧地图跟随、地面点选的screenPoint／getWorldPoint仍沿原接口；不能因本次中心反馈问题全局替换正常拾取API。

因此这是一项合理且更直接的有界修正，**不是已完成的根因唯一证明，也不是已通过的设备验收**。R4应继续保持原严格中心门槛、三视口、暂停冻结及真实拖图／回身。若修后仍有偏差，再在实际运行采raw scroll、viewport/origin、zoom、matrix与render前后值，不通过延长等待或改误差阈值消除FAIL。

R3 FAIL原样保留。完成本只读报告后停止写入，R4结果由根代理记录。

## 根代理后续实际结果

Presentation r4手机已通过相同严格收敛与暂停断言：worldView中心899.5/870.5、目标900/870.898，zoom0.6042645到目标0.603333范围内。整轮另因旧测试把已实际发弹的收手强求无弹而FAIL，不能记三视口全过；原报告保留。中心替换后的这一实际结果不补造旧偏差唯一根因。
