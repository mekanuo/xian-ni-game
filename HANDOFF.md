# 《仙逆：山门之外》当前交接

2026-09-09。先读本文件、AGENTS.md、docs/PROGRESS.md、git status/log。不要读取旧聊天、重做全书解析或接续封版项目。

## 已批准范围

用户已确认design/REVIEW.md链接的完整设计，并明确创建Goal完成美术、游戏实现、测试和公网首版；每个里程碑及时推送Git。发布授权已经给过，不需要再次确认设计。目标是中文桌面网页、Mac浏览器优先、原创修士与回石驿切片；用户体验是空间冒险和角色扮演，不替代王林的独有功绩。

## 当前实际状态

- 工作目录 /home/zhangjingzhou/workspace/xian-ni-game，分支feat/return-stone-v1，沿用https://github.com/mekanuo/xian-ni-game.git，默认master未改。
- 恢复基点bf4d922；设计提交3e02f78，文档分支docs/return-stone-design已推送，用户已批准实施。
- M1 4b35f5c与M2 1982250已成功推送。M3美术、角色回应和完整流程收尾本地提交3d5d5f1，推送被新的自动审批拦截，不能说远端已有该提交。
- 最新qa/verification.json为PASS，npm run verify exit0；28项模型测试；Linux Chrome150中真实创建、移动施术、两种练法均用鼠标亲试、同行登台、取风铃、山脊来回、返驿共同地图、结局后继续与重开。证据qa/evidence/run.json与截图。
- 主渡及守卫/护符/同伴/补救边界有模型回归证据，不冒称主渡也已浏览器完整通关。Mac/Safari/触控板、自然时长和主观趣味未实测。
- 原创标题、四位主要人物、场景焦点和敌方图集已接入；图源洋红底由运行时色键透明处理。美术来源与实际限制见design/ASSET_LOG.md。
- 运行包dist只有页面、代码和4张图，不含小说全文。/tmp/xian-ni-first-playable.zip与release-manifest.json可供本机审阅。

## 当前唯一交付阻碍

环境切换为网络沙箱后，本地端口启动先遇EPERM，提升运行测试已经通过。GitHub只读权限核对也通过，仓库仍有admin/push权限。

但Git推送提升调用被automatic approval review明确拒绝，理由为对外发布操作违反其安全策略，尽管它承认用户已要求里程碑推送；同时禁止绕道发布。不能改经node脚本、其他服务/账号绕过。本次还未启用Pages或推送gh-pages，没有已验证的公网链接。

Goal保持active，本轮是首次明确发布拦截，未达到三轮blocked条件。权限恢复后仅继续发布：推送当前分支→node scripts/deploy-pages.mjs（仅dist至gh-pages）→匿名HTTP与真实浏览器启动/移动复查→更新README/PROGRESS链接及版本→核对远端→交付并完成Goal。计划URL https://mekanuo.github.io/xian-ni-game/ 尚不能当可用链接。

## 执行与保存

- npm ci、npm run dev、npm run build、npm run verify；Node22/npm10，Phaser3.90、Vite7.3.6、Vitest4.1.11、Playwright1.58.2。Chrome默认/usr/bin/google-chrome。
- .npmrc使用legacy-peer-deps规避npm10的Vitest可选peer递归空节点错误；显式Vite依赖已固定。
- 仍为稀疏检出，新增目录用git add --sparse。推送凭证助手为git -c credential.helper='!gh auth git-credential' push origin feat/return-stone-v1，不显示凭证。
- 唯一规则器src/game/model.ts；scene只处理输入与表现；__XIAN_NI__仅只读证据接口。QA不可注入进度伪造通关。
- 原研究资料在docs/research；来源边界在design/SOURCE_SCOPE.md，原文在本机../sources/仙逆.txt，不添加到新提交或运行包。旧历史中的novel.txt未重写删除。
- /home/zhangjingzhou/smbb与starvein-companion-cards封版，永不修改或重读其历史。
