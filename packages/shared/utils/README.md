# @repo/utils

框架无关的纯工具函数包。

```txt
src/
  date/
    format-date.ts
    format-date.test.ts
    index.ts
  number/
    format-percent.ts
    format-percent.test.ts
    index.ts
  index.ts
```

- 按数据类型或能力域划分目录，不在 `src` 根目录平铺实现文件。
- 测试和实现就近维护。
- 每个能力域通过自己的 `index.ts` 暴露 interface。
- 根 `index.ts` 只负责聚合导出。
- 保持纯函数，不依赖 Vue、React、DOM 或业务状态。

```ts
import { formatDate, formatPercent } from "@repo/utils";
import { formatDate } from "@repo/utils/date";
```
