# 仙逆：山门之外

一段关于修行与归处的中文网页冒险。你是在回石驿住了半年的原创修士：扶好灯盏，取回自己修好的控物环，亲手试术，走过渡口，再回到灯下的桌边。

五处场景、两种出身、长牵与留势两种练法；人物是否同行、药筐是否淋雨、道路是否真正修通，都由你在地图中的行动决定。首章归来后，可修器采药，或接下雾岭旧渠的口信，亲手改水路、下渠清堵、验水归驿。

当前公开版本为 **0.5.0：许照带一段回程**，已完成整套发行检查与公网核验；记录见 `qa/evidence/publication.json`。

## 游玩

**公网试玩：https://mekanuo.github.io/xian-ni-game/**

无需登录或安装。支持桌面键鼠和手机触控；桌面建议横屏 1280×720 以上。

- WASD／方向键或点击地面行走；点击近处人、物，或按 E 互动。
- 1／2／3 选择引力术、火焰球、护符；再点击目标。
- 牵起物件后点击地面指定落点；放下／Esc／右键结束。学会留势后按 R 暂时腾出手。
- 空格暂停观察，可以预先指定一个动作；再按空格恢复。
- C 回到角色镜头；Shift＋拖动查看周围；J／I／M 打开记事、行囊、山道图。手机使用对应屏幕按钮。
- 歇脚处静息恢复气息并自动保存。设置中可分别读取手动档、自动档，或导出备份；载入后保持暂停，点继续即可。

旧渠在首章桌边安顿完成后开放：回驿点击自己的桌案接信，再到出发路牌选择“雾岭旧渠”。不需要先做完修器或采药委托；没有灵力和压扣也能徒手分水完成。旧版本完成档可直接迁移，已有物件和资源保留。

完成旧渠并归驿记录后，可在桌边约许照认一段回程，再到旧工棚商量由她领路。玩家仍需亲自行走；落后或前方不安全时，她会停下等候。共同走过分岔、在出口会合后，可回溪道雨棚歇脚，再归驿补上记号。也可以先独自认路，后来再一起走，不会重复领取歇脚成果。

## 本地运行与验证

需要 Node.js 22、npm，以及浏览器。依赖版本与安装选项固定在锁文件和 `.npmrc`。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run verify
```

`verify` 在 Linux Chrome 中运行真实鼠标键盘流程，覆盖启动、渲染、输入、核心循环、设计结果和重开；结果在 `qa/verification.json`，同一轮观察记录在 `qa/evidence/run.json`。Chrome 默认路径为 `/usr/bin/google-chrome`；可用 `CHROME_PATH` 指定执行文件。

`node scripts/public-check.mjs` 另行核对公网资源哈希、匿名桌面/手机输入、声音、旧档导入与新章节入口；发布证据在 `qa/evidence/publication.json`。新章两法真实流程见 `qa/evidence/canal-check.json`，三视口见 `qa/evidence/canal-view.json`。

同行连续带路与独立暂停读档见 `qa/evidence/journey-check.json`，三视口十二处观察见 `qa/evidence/journey-view.json`。模型边界另含独行后再同行、换路和提前离队，不把约定或切图当成共同经历。

Mac Chrome／Safari 是目标环境，但 Linux Chrome 的窗口/DPR/触屏仿真不能代替 Mac 或手机真机实测。人物使用原画加状态动作，尚无完整逐帧动画；自然游玩时长与趣味仍需玩家反馈。

## 资料与发布

- `HANDOFF.md`、`docs/PROGRESS.md`：继续开发入口与里程碑。
- `design/REVIEW.md`：用户已确认的详细设计入口。
- `design/ADVENTURE_040.md`、`design/CONTENT_ROADMAP.md`：旧渠范围与后续制作顺序。
- `design/ASSET_LOG.md`：原创生成美术、运行时透明处理与来源记录。
- `docs/research`：既有研究资料；不需要重新拆书。
- `scripts/deploy-pages.mjs`：验证通过且源码已提交后，仅发布 `dist` 至独立 `gh-pages` 分支。

本作的修士、回石驿与局部遭遇属于改编创作，来源边界见 `design/SOURCE_SCOPE.md`。运行包不含小说全文。仓库早期历史中已有的 `novel.txt` 未在本次工作中重新发布到试玩包，也未重写历史。
