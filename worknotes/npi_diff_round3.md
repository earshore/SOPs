# NPI diff 第三轮分析

## 结论：垂直位移，非内容变化

头图对比（上=基线，下=当前，同裁区 y50-120）：两者文字内容、GROWTH 徽章颜色完全一致，仅文字在垂直方向有约 8-10px 的偏移。diff 热力区集中在 y63-95，行均值峰值 63/66/92-95，典型"整页垂直偏移"特征。

这说明 `captureStableRegion` 的 `rect?.y`（trackerPage bounding box 的 y）在两次运行间有差异——即 NPI 页面头部（sop 描述区）的高度在 main 下与 9724bbbf seed 时不同，或本地沙箱浏览器与 runner 的渲染差异。

关键疑问：CI 的 79a8feb9 run 也失败（received 0.03347），说明 runner 上基线也不成立。但 rc.5 时（9724bbbf 后 run）该测试通过（smoke 93/93）。因此是 9724bbbf 之后的 rc.6 提交改变了页面垂直几何。

候选：ce25633b（badge 深色收敛，动过 cards.css 84 行）最可疑——NPI 页卡片样式可能受影响。需二分定位。

## 二分定位方案
在 CI runner 语义下（viewport 1280x720），本地已复现（diff 3.06%）。逐提交 checkout rc.6 区间提交，构建+复现，找到让 diff 从 0→3% 的提交。
