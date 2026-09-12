# 山外出行几何先验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this bounded diagnostic. Steps use checkbox syntax for tracking.

**Goal:** 在友方弹道开发前，用既有模型证伪两岩背布局的实际价值。

**Architecture:** 独立工作树，沿已有白盒 installMap/createGame/act/tick；生产八图与规则原样不改。只创建合成初态，随后全部由真实模型动作推进，保留逐段路径和事件。

**Tech Stack:** TypeScript5.9.3 / Vitest4.1.11，复用现有Phaser3.90.0规则层；本步不启动浏览器。

**Spec:** design/OUTBOUND_090_WHITEBOX_BRIEF.md。root只接受第一步几何先验，不预批友方功能。

## Global Constraints

- 0.8 R4冻结树不改、不并发浏览器；本树不部署，不改存档版本。
- 固定1400×1000、两矩形(360,300,220,300)/(760,300,220,300)，公开玩家480660/敌670380/彼岸1100700。
- 不改敌人警觉、速度、生命；不加敌人、封下方道路或改寻路制造难度。
- 输入为act(move)与tick；中途不写玩家/敌人坐标、伤害、命中和资源。

## Task 1: 候选初态与廉价对照

**Files:** Create src/whitebox/outbound-layout.ts; tests/outbound-layout.test.ts; qa/whitebox/outbound-layout/r1.json。
**Interfaces:** installOutboundLayout():()=>void；createOutboundLayout(mana:0|6):GameState；OUTBOUND_LAYOUT为SceneDefinition。

- [x] 先写测试，检查全部身体站位与两岩的精确合同；再写两个实际走位观察：直接点彼岸，以及真实走到敌人可见面、等待其首次casting后再点彼岸。
- [x] 首次运行 npx vitest run tests/outbound-layout.test.ts，记录缺模块RED，不把它算地形反例。
- [x] 最小实现只替换本进程home场景，createGame后公开初始化敌人/玩家；不做友方AI。典型测试推进为 `act(s,{type:'move',point:{x:1100,y:700}}); tick(s,.025,{x:0,y:0})`，最多60模拟秒。
- [x] 同一个候选各对照用全新初态，输出实际路径、视线、敌人状态、HP/MP、射弹事件、抵达/返程。明确普通单位测试PASS只证明测量器/几何合同，不证明游戏设计成功。
- [x] 依据实际结果判断是否值得进入友方一发；若直达与代表扰动都由同一省事路线支配，当前布局否决且保留原结果，不调敌规则。
- [x] 跑专项与tsc，更新本树HANDOFF，提交并推送feat/outbound-090-layout（提交/推送动作以Git工具结果为准）。0.8整版验收继续。
