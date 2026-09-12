# 旧窑燃烧等待：R5超时取证

完整0.8 R5冻结e4c4887，956模型/build、桌面手机同行与独立暂停保存、同行三视口、旧窑三视口与桌面零灵力往返/手机借还保存全PASS；kiln-consequences烧毁阶段超时，整体FAIL。原证据qa/verify-080-r5保留；这不是整版通过。

## 观察

火球真实起手318.500000、命中319.183333，shield_board state=burning、timer=12。截图普通暂停时time319.416667；随后恢复并等待烧尽60墙钟秒，失败state time323.183333、paused=false、dialogue=null、defeated=false，board仍burning、timer7.999999999999802。HP4MP3，射弹已正常命中并扣实际灵力，未发现施术或物件状态异常。

共享model在flameEntityHit设置12秒并在实际tick逐dt扣timer，timer为0才burned。本轮约60墙钟秒只推进约3.77模拟秒，模型剩余时长与事件时间一致；不能把60秒墙钟误作12秒模拟已经结束。与先前SwiftShader低帧率下市场开门观察同类环境限制。这里只证明测试环境时钟比例，不推论真实Mac或手机帧率。

## 单一修正与复验

仅scripts/kiln-check.mjs这段自然burning→burned观察上限由60000改300000毫秒，记录前后实际time/timer/paused及墙钟耗时。仍必须真实burned，不调速、不改timer/资源/状态、不跳过烧毁再导入和实际重入。失败继续保留。300秒上限不是承诺玩家要等待300秒。

专项KILN_ROUTE=consequences、KILN_CONSEQUENCE_CASE=burn从原固定0.5导出实际准备、借屏/挪还、火球命中、自然烧尽、保存新context恢复、对话拒还与实际离图重入。固定游戏包DwjNP5Si/DzkGuDoj；supervisor1278891，cache/xian-ni-qa/kiln-burn-080-r1.log/.exit，结果尚未预填。整轮须在修后冻结源码上重新执行全部34项，不拼旧PASS。

## 专项结果

2026-09-12T01:02:04.502Z完整burn专项PASS、exit0、errors空。自然烧尽等待实际185382墙钟毫秒、11.866666666656模拟秒，timer到0才burned；新context保存恢复HP4MP3、borrowed且无棚角许可；实际离图重入仍burned并完成重开。root目视烧毁截图。归档qa/kiln-burn-green-r1。仅烧毁子项，不冒称后面的脚下压屏recovery本轮已通过，整版仍须新冻结全验收。
