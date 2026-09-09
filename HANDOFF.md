# 《仙逆：山门之外》首版交接

2026-09-09。先读本文件、AGENTS.md、docs/PROGRESS.md及git status/log。用户最新反馈是手机有像素感、没有背景音乐及打击感；0.1.1 已上线并完成公网复查，包含高清渲染、手机布局、持续合成配乐、命中声画与暂停恢复，详情见 [0.1.1 修订](design/QUALITY_PATCH_011.md)。上轮 [改版目标图](design/QUALITY_REVISION.md)仍非实机，整套手绘资产重制未完成。不能把流程 PASS 当作用户认可品质；不重做小说研究或恢复旧发布拦截。

## 交付入口

- 公网试玩：https://mekanuo.github.io/xian-ni-game/ ，无需登录或安装。
- 工作目录 /home/zhangjingzhou/workspace/xian-ni-game；源码分支feat/return-stone-v1；mekanuo/xian-ni-game默认master未改；gh-pages只放运行资源。
- 恢复基点bf4d922，完整设计3e02f78，用户已一次确认并创建Goal批准美术、实现、测试与公网首版。
- 历史M1 4b35f5c、M2 1982250、M3 3d5d5f1均已推送。当前0.1.1源码为dd3b71f2e8354387ce9a57608c9366de5f551dce，发行分支提交49d7df9ac52c3641ccdbf220ec045f251b689da4；线上release.json已经核对为0.1.1及该源码SHA。
- 最后交付文档提交只更新记录/检查脚本，不改变运行包。以Git实际SHA核对最新说明，不把本文件自身SHA写成固定锚。

## 已完成与验证范围

- 四个相连场景、两种出身与心愿、引力术/火焰球/定向护符、长牵/留势实际训练、同行与补救、两条地理路线、风铃/地图/工位归来变化、存档和重开已实现。
- 原创标题、四位主要人物、场景焦点、散修/山兽图集已接入，PNG洋红底由运行时色键处理；动画由原画翻转、摆动和状态效果组成。来源和限制见design/ASSET_LOG.md。
- 0.1.1 npm run verify exit0，qa/verification.json六项PASS，35项模型/事件/真实Chrome WebAudio回归；手机DPR3横竖屏与旋屏触控、命中/挡击/受伤声画、菜单暂停恢复通过。完整鼠标流程亲试两种练法、同行登台、取风铃、山脊往返、共同地图、结局后继续和重开。
- 主渡及守卫/护符/同伴/补救边界有模型回归证据，不冒称主渡也已浏览器完整通关。
- node scripts/public-check.mjs exit0：匿名线上7个运行文件哈希与已验证dist一致；桌面创建/归灯/移动，手机尺寸DPR3触控护符及实际音乐输出均通过，无pageerror。证据qa/evidence/publication.json、public-start.png、public-mobile.png。
- Mac/Safari/触控板以及iPhone/Android真机扬声器均未实测；手机证据为Chrome触屏/DPR仿真。自然时长、用户主观趣味和打击感仍需试玩反馈。

## 后续工作原则

首版完成后按用户试玩反馈定位改动，不自行扩下一卷或另起研究Goal。每个后续里程碑仍及时提交推送。完整批准设计在design/REVIEW.md及其链接，研究资料在docs/research，不重复询问已锁定决定。

先前workspace-write环境的automatic approval review拒绝过对外推送。后来恢复danger-full-access后已成功发布，此条仅为历史追溯，不是当前阻碍。Pages初次创建响应为空但GET与公网实测确认创建成功，脚本现以GET确认结果。

## 本地运行与发布

- Node22/npm10，npm ci；npm run dev；npm run build；npm run verify。Phaser3.90、Vite7.3.6、Vitest4.1.11、Playwright1.58.2；Chrome默认/usr/bin/google-chrome。
- .npmrc的legacy-peer-deps规避npm10处理Vitest可选peer时的空节点错误，显式Vite版本已固定。
- 当前稀疏检出，新增目录用git add --sparse。Git凭证助手：git -c credential.helper='!gh auth git-credential' push origin feat/return-stone-v1，不显示凭证。
- scripts/deploy-pages.mjs要求验证PASS和工作区clean，仅发布dist至gh-pages。线上版本由release.json核对；发布后运行public-check。
- 规则仅由src/game/model.ts提交；scene处理输入与表现；__XIAN_NI__仅只读证据接口，不用于注入进度伪造通关。
- 原文在本机../sources/仙逆.txt，不加进新提交或构建。旧历史novel.txt未重写删除。/tmp/xian-ni-first-playable.zip为本次同构建本机备份。
- /home/zhangjingzhou/smbb与starvein-companion-cards永久封版，不读其旧历史或修改。
