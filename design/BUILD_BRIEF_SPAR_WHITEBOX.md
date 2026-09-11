# 划线切磋 · 最小构建合同

依据 SPAR_080_DESIGN.md，root批准仅一手守线验证。独立入口spar-whitebox.html、src/whitebox，使用真实model act/tick；不导入正式入口、不改contentVersion、不部署Pages。唯一合成地图临时使用home槽，显式安装/还原；独立镜头不继承石驿镜头。

实现最小回合状态：idle→positioning→active→settling→result。逐≤.025秒实际tick，在下一小步前停发。以projectileSeq实际发射、hurt/block事件、身体位置决定结果，不由计时器给胜利。所有移动通过现有act/tick或simulationPorts.moveNpc。保留在途弹，不把peaceful当免伤。仅movement/ward/pause为本切片动作。

验证：tests/spar-whitebox.test.ts先RED再最小实现；专项通过后tsc与全模型回归。真实浏览器脚本单实例，日志、截图、输入与结果单独记录；不用继承0.7 verification.json作为本轮PASS。产物可被新页面真实操作，合成起点/无正式保存等限制可见。每个里程碑提交推送，正式0.7不变。
