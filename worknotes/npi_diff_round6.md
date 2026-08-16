# 第六轮：定量锁定

runner 全视口重建 y=89 clip 与基线的 pixelmatch diff = **0.03347048660725884**，与 CI 断言 received 0.03347048660725884 逐位一致。

结论：clip 几何（976×631 @ y=89）完全正确，基线尺寸未漂移；差异是 runner 上 3.35% 的像素内容变化。需要找出是哪些像素变了——用 pixelmatch 输出 diff buffer 可视化。
