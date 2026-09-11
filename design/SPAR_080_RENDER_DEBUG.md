# 0.8 正式画面异常定位记录

2026-09-11。只读比较 `dd31e9f` 与当前接线，读取已有浏览器证据；本审查未启动浏览器、构建或修改运行源码。按 systematic-debugging 区分观测、原因与待验证项。

## 结论

R3 已有明确的 **Chrome 进程崩溃原因：临时文件写入失败 ENOSPC**。不能靠修改绘制代码、画风或降低 DPR 修复这一已证环境故障。R1 的“DOM 正常、世界空白”仍保留为独立未定位失败；目前不能证明它与 R3 同源，也不能归因为 HMR 或游戏规则。

## R3：已证崩溃链

- 原始日志 `/tmp/spar-production-browser-r3.log:11`：`2026-09-11T20:54:42.927Z`，Chrome `FATAL:components/services/font_data/font_data_service_impl.cc:379`，`No space left on device (28)`。
- 同日志第 16 行：`20:54:44.864Z`，进程以 `signal=SIGABRT` 退出；随后 `BROWSER DISCONNECTED`，等待“入 山”按钮报 browser/context/page closed。这不是角色移动超时。
- 本轮报告 `qa/spar-production-2026-09-11T20-54-40-611Z/report.json` 为 FAIL，不能计入玩法通过。
- 启动参数明确使用 `/tmp/playwright_chromiumdev_profile-YPSVYy`，并有 `--disable-dev-shm-usage`。根代理现场检查 `/tmp` 为 7.6G tmpfs、已用约 7.3G、可用约 288M；根盘可用约 239G，`/dev/shm` 仍有约 5.7G。这些容量为现场读数，不是永久环境保证。
- 先出现的 `GPU stall due to ReadPixels` 是性能警告，不能替代随后的明确 FATAL 原因；日志没有证明 WebGL context lost。
- 根代理决定仅将 QA 进程 `TMPDIR` 改至 `/home/zhangjingzhou/.cache/xian-ni-qa/tmp` 专用目录，重放同一独立包和同一 DPR。不删除其他资料。此处记录处理方向，**尚不宣称新运行通过**。

## R1：可缩小范围，但尚未闭合原因

证据：`qa/spar-production-2026-09-11T20-46-20-243Z/report.json` 及同目录 `desktop-hit-imported-home.png`。这是 `http://127.0.0.1:4195/` 的 dev 运行；后续独立包 `/tmp/xian-ni-spar-production-080`、`DIvdulfV` 与之不能混为同一运行证据。

- 1440×900、设备 DPR2。导入固定 `qa/fixtures/return-main-v0.7.0.json` 后 `scene=home`，HP4、MP4，玩家约 `(849.397,442.936)`，截图时正常暂停。
- 20:46:37.483 实际点继续，随后点世界 `(1500,480)`，对应屏幕约 `(1370.891,480)`；120 秒等待失败。报告缺少这次输入后的最终状态快照，不能据此断言输入没进模型或模型被暂停。
- 图片为 2880×1800；中央空白像素 `(1000,700)` 为 RGB `(170,192,177)` 即 `#aac0b1`，与 `src/style.css:2` 页面背景一致，与 `src/main.ts:12` Phaser 背景 `#a9bb9c` 不同。画面露出了页面背景，不能仅解释成相机朝向没有物件的空地。
- 脚本点击前以 `elementFromPoint` 确认目标为 CANVAS。因此不能简单断言 canvas 元素不存在；未提交有效画面、透明帧、渲染循环或上下文异常仍需真实运行数据区分。
- 只读 presentation 中，陶掌柜、许照、桌案、旧出口、新入口的世界坐标与标签均已建立，玩家子图的 `scaleY=.13`、frame、坐标为有限值。它证明显示对象建成，不证明 GPU 已绘出它们。
- R1 仅记录两条未附 URL 的 404，没有 pageerror；不能拿 404 推断关键资产缺失。R2 的 favicon 404 与 browser closed 同样不能自行定位 R1。

## 静态接线核对

- `src/game/scene.ts:64–65,82,90–93` 新增两套人物素材预载与扣底帧。素材尺寸和帧界限合法；强制资源检查在 UI 与 `__XIAN_NI__` 建立前执行。R1 已有 HUD 和 presentation，不符合资源检查提前 return 的表现。
- `scene.ts:187` 的 `replace` 清理显示缓存后调用 `refreshScene/center`；`refreshScene:353` 重建地面和实体。未发现新添的全局隐藏 canvas 或暂停 Phaser 场景操作。
- 新切磋地面与人物绘制仅 `scene==='spar'` 执行；`updateSparCamera:213` 及调用处 `:345` 同样只处理 spar，不能直接解释首次导入 home 空白。
- home 实际会涉及新增人物图集占用、每帧 `playerImage.setTexture('characters',...)`（`:335`）及桌案的 `drawSparHomeRecord`（`:657`）。后者对空 reported 立即返回；前者参数正常。它们是比较差异，不是已证故障。
- `src/main.ts`、`src/game/display.ts`、`src/style.css` 相对比较基点无此轮改动。DPR 按既有像素预算上限调整；设备 DPR 与内部渲染密度不必相等，不能以此判错。

## 下一轮最小判别与通过门槛

根代理先以专用 TMPDIR 重放原独立包。若仍空白，保留 fresh-game 与 imported-home 两张截图，同时记录 canvas 像素尺寸、CSS 边界/可见性、context lost 事件、实际输入后时间/暂停/路径/玩家坐标；这能区分创建阶段、导入阶段、输入阶段及显示循环异常，无需先改渲染。

只有真实世界绘出、原地面点击产生实际移动且浏览器不中止，才能关闭该具体失败。956 项模型测试和 tsc 通过不代替此门槛；R1、R2、R3 原 FAIL 均保留，不回写成成功。

## R4 后续实测范围（根代理回报）

`qa/spar-production-2026-09-11T20-56-38-302Z/desktop-hit-imported-home.png` 已由根代理查看，完整石驿实际绘出；真实点击世界 `(1500,480)` 后 player/path 已推进。仍用 `DIvdulfV` 游戏构建及原 DPR，未修改 game JS；环境使用专用 TMPDIR，index 另加真实 `favicon.svg` 消除缺失请求。

此结果支持先排除已证的环境故障，无需改绘制实现。它证明本次导入 home 的渲染和首次移动恢复，不代表整轮切磋、所有设备或全部回归已通过；也不足以唯一追认 R1 根因。本审查至此结束，后续实际路线由根代理继续验收。
