# 第七轮：diff mask 观察

mask（d>60）覆盖几乎整个页面区域（bbox x20-975 y0-621），但 runner 上基线尺寸 631 正确（y=89 clip 精确匹配 0.03347）。典型特征：**文字行有垂直偏移 + 光栅化细微差异**——NPI 页面某处高度变化导致 trackerPage bounding box y 从 seed 时的 89 变成别的值？不对——clip y 是测试内计算出的 rect.y，若页面元素高度变化，rect.y 会变，clip 内容相对基线就会整体位移。

假设：某处元素增高 Δy，则 clip y+Δy 后截到的内容与基线在 y 方向相差 Δy，垂直方向逐行相关峰值应在 y=Δy 处。测量 runner clip vs 基线的垂直互相关峰值：
