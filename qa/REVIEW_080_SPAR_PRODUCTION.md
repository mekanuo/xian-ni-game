# 驿后练场生产接入 · 当前证据

2026-09-11。这是生产中间里程碑，不是发行报告。公网仍0.7，继承的verification.json不适用于本批代码。

- 正式八图和contentVersion7；原样旧fixture独立外层/checkpoint迁移，保留实际HP/MP、起手、定位路线和余弹。专属149存档测试通过。
- 正式act/tick接线：近身约定，真正换位，三来向一源一手，停止后余弹真实推进，正常retry不补资源，同伴明确在驿等候，归驿事实报告。
- 根代理完整回归45文件956测试通过，日志本目录spar-production-model/full-model.log。TypeScript无报错。模型模拟/合成边界不冒称浏览器输入。
- 独立审查确认首章落笔未即时开门、桌边报告被旧渠话题遮挡；两项真实act RED→GREEN持久测试。没有改旧渠状态以让报告通过。
- 显式异常边界：合法一源HP>=2不会败退；为了验证恢复合同，在已发弹后将HP注入1，真实余弹致0时曾覆盖可用checkpoint。修复为败退时保留旧完整点，按旧点实际资源恢复；tests/spar-recovery GREEN。该注入不称正常玩家路径。
- 旧测试维护仅最终版本/地图数、新入口差异与合成历史来源剥除新字段；原fixture文件未改，原资源/世界/动作断言保留。8兼容专项434通过。

两张采用原图已目视并接线，真实浏览器专项进行中：

- R1 `spar-production-2026-09-11T20-46-20-243Z`：页面背景而非实际世界，首段行走超时；唯一原因未证实。
- R2 `spar-production-2026-09-11T20-52-31-136Z`：固定构建浏览器关闭，favicon404；已新增实际favicon文件，不过滤console错误。
- R3 `spar-production-2026-09-11T20-54-40-611Z`：Chrome字体服务明确ENOSPC→SIGABRT，详见design/SPAR_080_RENDER_DEBUG.md。
- R4 `spar-production-2026-09-11T20-56-38-302Z`：更换充足TMPDIR后，同固定JS/DPR实际渲染home/spar；完整定位导出与新context恢复、一手真实受击已断言，失败末态为home(1500,480)、HP3/MP4。脚本900,1220落在出口牌点击范围，实际已出门，等待地面坐标超时。整轮保留FAIL；脚本改为900,1160地面及意外转图快速报错，游戏出门逻辑不改。
- 根代理已目视R4 `desktop-hit-ready.png`，看到同场闻朔正侧与玩家背侧、圈线/墙体/完整身体。仅这一桌面静态构图，不冒称手机、全部朝向或全流程验收。

R5正在串行desktop/phone × hit/ward。其固定包为 index-DIvdulfV.js；源码后续暂停镜头/撑符朝向修正不在此包，需要重建另验。无完整0.8发行验证，不发布。

后续记录：cf2d2b1已成功推送。R5 desktop-hit 已完整PASS（定位保存/真实受击/归驿/报告/再次导入），其余组合仍运行；不得把单案PASS写为整轮通过。已目视R5桌边图并发现新纸位于桌沿前立面，局部移到(38,-62)桌面右上空位。修后r4 JS index-CD78guKs.js，tsc/build PASS，待实际三视口与纸片截图。

旧章12脚本仅更新迁移后的content7/八图、保留原样历史输入；market-view保留所有旧世界实体深等，仅从检查用克隆排除精确新增图/门。整版verify新接练场四案与三视口，使用本轮真实导出串接，尚未运行，不代表发行PASS。

## R5正式四组合完整通过

`spar-production-2026-09-11T21-03-32-592Z/report.json` 最终PASS、errors空，supervisor exit0。desktop/phone × hit/ward各从固定原样v6旧档经真实UI完成入场等候约定、定位/导出/新context恢复、正面单弹、实际受击或格挡、出门归驿、桌边报告和最终新context再载入。受击均HP3/MP4；格挡均HP4/MP3；同伴仍原脚点等候，旧账不改。根代理目视桌面归驿及手机入场/就位，人物全身与圈线可见。

该轮运行包仍DIvdulfV，不能覆盖之后的暂停镜头、撑符朝向、新纸片位置和手机回镜头按钮遮挡修正。手机ready截图明确显示两行dock挡住center，已局部增加spar-stop存在时的底部间距，下一构建需实际tap验证。固定修后r5包index-0pA0mHRI.js/index-D5XfOxnh.css，tsc/build PASS、preview4202；尚未实际验收。
