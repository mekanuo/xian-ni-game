# 手机旋屏时序：0.8 R7

原整轮冻结bc67cb3在mobile-render失败：setViewportSize后固定350ms读取旧竖屏画布[1170,2532,390]。前序同行、旧窑烧尽与恢复、布局交互通过；其余未到，完整状态FAIL，原始归档qa/verify-080-r7。

专项mobile-rotation-080-r1 exit0直接复现同一边界：before performance10019.5窗口390×844；10400.5窗口844×390而画布1170×2532，resize事件列表为空；10750.7事件到达时画布已2532×1170。11005.1跨实际两帧后尺寸正确，横向触控x277.90→245.90、HP4MP6。两方向原生DPR3、无横向溢出、实际触控均PASS/errors空。root目视mobile-rotated。

只修QA：保留350ms诊断，等精确窗口/画布/CSS尺寸（15秒上限），跨两真实rAF再投影触点；补FAIL报告，避免失败沿用旧PASS。不改变游戏resize监听、密度、触点或模型。原始350ms失败证明固定墙钟截点不可靠，不证明实体手机有同样延迟；环境仅Linux Chrome SwiftShader触控模拟。

下一整轮将独立mobile-render提前到build后，其余依赖顺序不变，仍34命令、六判据和源码/发行指纹，不能拼旧PASS。
