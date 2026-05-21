# 2026-05-21 可选时间依赖支持

- 新增 `lib/time.js` 统一管理时间相关能力。
- 默认继续使用原生 `Date`、`Intl.DateTimeFormat` 和现有定时任务逻辑，不强制新增依赖。
- 新增可选时间依赖支持：如果环境中安装了 `luxon`，插件会自动启用它处理北京时间日期 key。
- 鱼获时间戳、赠鱼时间、炼竿时间、成就时间等入口统一走时间工具层，便于后续继续扩展。
- 插件目录新增 `package.json`，将 `luxon` 声明为 `optionalDependencies`。
