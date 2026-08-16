# 第五轮：runner 全视口重建

从 runner 的 test-failed-1.png（1280×720 全视口）按 clip(x=0, width=976, height=631) 重建：

- y=89 时与基线均值绝对差仅 4.33/255 ≈ 1.7% 通道差 —— 说明 runner 上 tracker 页 y=89 与基线几乎重合！
- CI 失败断言 received 0.0335（3.35% 像素 diff，threshold 0.1%）。
- 需要以 pixelmatch(threshold 0.1) 方式精确计算 y=89 clip 与基线的 diff ratio。

若 y=89 clip diff < 0.001，则 runner 基线实际仍成立，失败可能由时序（transitions 未完成）引起——这符合 rc.5 时 closeGlobalSettings 时序加固的先例（e44e4b94）。
待查：测试中 light 截图前有 switchTabFromHome + expectNoRouteErrorText，无过渡等待？rc.5 时加了双 rAF（captureStableRegion 内）。
