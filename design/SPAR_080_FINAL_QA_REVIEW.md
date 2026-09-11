# 0.8 冻结前 QA 接线复核

2026-09-11。只读 `scripts/verify.mjs`、`spar-production-check.mjs`、`spar-presentation-check.mjs`，并核对其实际读写来源、`audio.ts` 与 fingerprint 合同。没有启动浏览器、构建或测试，没有修改源码／脚本。根代理仍独占4203左右护符验收。

**结论：除交接已安排的版本号／QA环境前置条件，未发现这次新增音频、输出或presentation断言中另一项确定会阻塞冻结整版的错误。** 这是静态接线结论，不是整版34命令已通过，也不应以它放宽真实时序或画面断言。

## 已有前置条件，勿误当本轮新发现

- 当前包版本仍0.7.0，而固定练场来源是 `qa/fixtures/return-main-v0.7.0.json`、content6。`main-route-check.mjs:54–57` 按包版本导出，因此未经升级跑整版会在后段覆盖该固定来源为content7，下次练场导入必拒绝。根代理确认 `HANDOFF.md:31` 已要求冻结前升 package／lock 到0.8.0；本审查不重复要求另外一套改法。
- `verify.mjs:7` 记录 TMPDIR／CHROME_PATH，子进程通过 `...process.env` 继承；不会自己将空TMPDIR改到专用目录。交接已明确本次应以专用TMPDIR与 `scripts/chrome-qa.sh` 启动整版。现场 `/tmp` 仍约97%使用，此已证环境限制不能因新增environment字段就视为自动解决。

## 新增verify调用与文件输出：对齐

`verify.mjs:24–46` 显式覆盖 SPAR_DEVICE／CASE／STANCE／OUTPUT，先桌面和手机front hit/ward四案，再左右手机ward各一案，然后三视口presentation与桌面facing。每个子进程等待exit后才启动下一项，未新增并行浏览器。

production四案成功后，读取其第一个desktop-hit案例**这次实际导出的** positioning-paused 与 reported-paused 路径，传给后续检查；没有将后来纸图／错误资源档当作未开局输入。各脚本支持的env名字与verify一致，固定输出所在 `qa/evidence` 已由verify先创建；runId目录独立生成，累计报告与固定汇总路径同时写。

production每次先写NOT_RUN／RUNNING，结束必须exit0且报告PASS；verify同时要求四案例PASS和实际导出存在。因此本轮正常启动后，不会仅凭旧的 `spar-production-verified.json` 沿用过去成功。左右脚本的顶层PASS也只会在所选唯一案例完成后写入。

源输入在test/build之前捕获、build后比较、全部结束再比较source+dist。`scripts/**`被纳入，qa证据／当前生成fixture不纳入，这是既定合同；新增runId截图和报告不会让指纹因合法生成证据自我失败。冻结以后修QA脚本仍会使本轮指纹不一致，须如实重新处理该轮，不能以“只是验证器”跳过。

## 新增声音断言：时序与含义成立

`spar-production-check.mjs` 在ready暂停阶段先观察实际 `audio()`：scene=spar、running、非muted、musicRms>0.0001，最多10秒；之后才开启实际一手。`Soundscape` 音乐按AudioContext时钟调度，游戏普通pause不会暂停它；真实新建页面操作会启动声音，所以不存在“暂停着必然永远RMS为0”的合同冲突。

同一个恢复后的页面内保存 effectCounts 基线，真实结算后检查 hurt或block计数增加；`audio.ts:179–185` 只有running且requested时才增加计数，对应事件也在 `WorldScene.update` 反馈阶段交给play。没有在跨fresh-context后比较本应归零的计数，也没有拿创建页面时的旧hurt当本手证据。

这些断言分别证明实际后音量级音乐样本与对应效果被调度。后者不是扬声器录音，不证明主观响度或打击舒适度；现有脚本不应被解释成真机听感通过。未发现需要降低RMS阈值、忽略声音错误或删除效果增量断言的代码理由。

## 最新presentation实际输入：已去掉两类错误前提

- 桌面C改为真实按下、等相机改变后松开；不再依赖低帧率下可能完全落在两帧间的零时长keydown/up。手机回身后等待HUD正常发布 `aria-pressed=false`，不拿即时DOM旧值误报操作失败。
- 自动构图仍要求实际zoom收敛与worldView中心误差<2，不以等固定时间替代。后续中心复核<3也没有替换掉前面的更严格等待；Phaser视域取整每轴约0.5的正常误差在现门槛内，历史6单位偏差不能因此蒙混通过。
- begin以后实际收手以当时真实按钮中心点击，不暂停模型或插入截图。`shots`按真实projectileSeq差决定0或1；若已经射出，仍须弹结清、站定无符无无敌玩家真实掉一格，并保留 stopped/hurt 与hit事实。未发射则不能扣血／授事实。这纠正了“脚本点得快，所以必然零弹”的错误假设，没有删除后果检查。
- 当前收手案例仍严格要求实际点击时尚在active、且收手获得stopped。若浏览器慢到点击前整手已被命中并结清，案例会FAIL，而不能将hit改称stopped。这是本测试还没成功完成“先收手”的事实，不应放宽结果断言；现静态代码不能保证每个未来运行的主机延迟。
- 暂停前后完整状态、camera、人物transform均对比；报表输入经真实设置导入后也保持完整相等。普通暂停车位／观察不被计成完成活动，新旧档来源明确。

## 冻结建议范围

执行交接已经指定的版本升级与专用QA环境，待当前串行专项结束后冻结同一源码／脚本／产物，再运行原完整矩阵。本审查没有提出新增浏览器方案、改关卡、扩大时间门槛或跳过旧章节。

若整版出现真实FAIL，应保留该轮runId和加载JS hash按具体输入定位；本静态复核不能替代它。报告完成后停止写入。

根代理复核：审查完成期间已将package.json及lock升0.8.0；固定历史fixture SHA保持6a5694a3ec238949f1eca6ea3e280a0a24ca5dcc0c912e93a5b4de1f374f4ff9。审查的版本观察保留其当时状态，当前该前置已处理。
