# Fish-plugin

TRSS-Yunzai 独立钓鱼插件。整个目录放在 `plugins/Fish-plugin` 下即可。

## 这次新增

- `#鱼市 / #售鱼`：把多余鱼卖成鱼币，再购买鱼饵、额外钓鱼券和新鱼竿。
- `#鱼竿 / #换竿`：支持不同鱼竿，影响等待节奏、稳定性和稀有鱼倾向。
- `#鱼饵 / #换饵`：支持不同鱼饵，默认鱼饵也有独立名字，可随时切换。
- `#炼竿`：消耗鱼缸里的 `legendary` 鱼，炼成对应的特殊鱼竿；不同传说鱼做出来的鱼竿效果不同。
- `#鱼市购买 自定义鱼饵 文本`：根据文本现配一份随机词条鱼饵。
- `#限时鱼讯`：每天随机刷新 1 到 2 种今日高活跃鱼，命中可得额外鱼币。
- `#钓鱼成就`：支持自动补点亮已达成但之前没触发的钓鱼成就。
- `#钓鱼管理`：集中查看主人、群管理和维护命令。
- `#封竿`：主人在群内使用后，当前群不再响应本插件指令。
- `#补鱼 @某人 rare 鳗鱼 80 3.5`：主人按记录补回鱼获；也可写 `#补鱼 @某人 鳗鱼 rare`，长度和重量可省略。
- 图片面板：`#钓鱼帮助`、`#鱼市`、`#查看鱼缸`、`#钓鱼成就`、`#鱼竿`、`#鱼饵` 会优先走 TRSS 图片渲染。

## 新命令

- `#鱼市`
- `#售鱼 1`
- `#售鱼 common`
- `#售鱼 common 3`
- `#售鱼 common3`
- `#售鱼 鱼缸 1`
- `#售鱼 鱼缸3`
- `#售鱼 全部`
- `#鱼市购买 鱼饵1`
- `#鱼市购买 自定义鱼饵 桂花酒糟`
- `#鱼市购买 额外钓鱼券`
- `#鱼市购买 鱼竿1`
- `#鱼竿`
- `#换竿 1`
- `#换竿 疾风短竿`
- `#鱼饵`
- `#换饵 1`
- `#换饵 沉流鱼饵`
- `#炼竿 3`
- `#炼竿神龙`
- `#炼竿 神龙 2`
- `#限时鱼讯`
- `#钓鱼成就`
- `#钓鱼管理`
- `#封竿`
- `#补鱼 @某人 rare 鳗鱼 80 3.5`
- `#补鱼 @某人 鳗鱼 rare`

## 售鱼规则

- 默认 `#售鱼` 卖的是“本日渔获”
- `#售鱼 鱼缸 ...` 卖的是鱼缸里的鱼
- `#售鱼 common` 会卖掉今天钓到的全部 `common` 鱼
- `#售鱼 common 3` / `#售鱼common3` 会卖掉今天 `common` 列表里的第 3 条；不存在就不会卖
- `#售鱼 鱼缸3` / `#售鱼鱼缸3` 会卖掉鱼缸展示列表里的第 3 条，不会再误卖全部可售鱼
- 如果售卖的本日渔获已经加入鱼缸，会同步从鱼缸移除
- `legendary` 和彩蛋鱼 `？` 不允许售卖
- 售价由稀有度底价 + 重量价组成，参数都在 `lib/constants.js`

## 炼竿规则

- 只有鱼缸里的 `legendary` 鱼可以拿来炼竿
- 可以直接按鱼缸序号炼：`#炼竿 3` / `#炼竿3`
- 也可以按传说鱼名称炼：`#炼竿神龙`
- 如果鱼缸里有多条同名 `legendary`，可以写名字加序号：`#炼竿 神龙 2` / `#炼竿神龙2`
- 每种 `legendary` 鱼对应一种特殊鱼竿；已经拥有对应鱼竿时，不会重复炼成
- 特殊鱼竿不能在鱼市直接购买

## 自定义鱼饵规则

- 使用 `#鱼市购买 自定义鱼饵 文本内容`
- 每份自定义鱼饵由文本生成固定配方
- 同一文本再次购买时会叠加到原配方库存
- 配方库存用完后，配方记录仍保留在个人鱼饵列表中
- `#换饵` 可以通过显示名或原始文本切换

## 钓鱼券规则

- 额外钓鱼券每天最多从鱼市购买 5 张
- 批量购买超过今日剩余额度时，会自动按剩余额度购买
- 钓鱼券只在超过每日基础次数后自动消耗

## 本地背景与生成资源

- 本地背景目录：`resources/backgrounds`
- 生成面板目录：`resources/generated`

把 `.jpg` / `.jpeg` / `.png` / `.webp` 背景图放进 `resources/backgrounds` 后，图片版帮助、鱼市、鱼缸、钓鱼成就面板会自动随机使用本地背景。

## 数据文件

- `fishdata/fishData.json`：用户主数据，已扩展鱼币、鱼竿、鱼饵库存、钓鱼券、钓鱼成就、历史图鉴字段
- `fishdata/fishConfig.json`：基础每日钓鱼次数配置、封竿群配置
- `fishdata/baitData.json`：手动打窝数据
- `fishdata/lostItems.json`：失败事件掉落物记录
- `fishdata/worldState.json`：每日鱼讯状态

## 主要代码

- `Fish.js`：插件主入口
- `fishdata/fishpool.js`：鱼池、稀有度概率、随机事件
- `lib/constants.js`：玩法常量、商店、鱼竿、鱼饵、钓鱼成就定义
- `lib/custom-bait.js`：自定义鱼饵词条生成
- `lib/storage.js`：JSON 和资源目录读写
- `lib/user.js`：用户数据兼容与次数/装备处理
- `lib/economy.js`：鱼市与售鱼逻辑
- `lib/achievements.js`：钓鱼成就扫描
- `lib/signals.js`：每日鱼讯
- `lib/panel.js`：TRSS puppeteer 图片面板适配

## 可调项

- 基础上鱼率：`lib/constants.js` 里的 `BASE_CATCH_RATE`
- 彩蛋鱼加成：`lib/constants.js` 里的 `EASTER_EGG_CATCH_BONUS`
- 隐藏保底：`lib/constants.js` 里的 `HIDDEN_PITY_CATCH_BONUS`
- 鱼缸升级容量和额外竿数：`TANK_UPGRADE_SIZE`、`TANK_UPGRADE_EXTRA_CASTS`
- 售鱼定价：`RARITY_SELL_PRICE`、`RARITY_WEIGHT_PRICE`
- 鱼竿效果：`ROD_CATALOG`
- 鱼饵效果：`BAIT_CATALOG`
- 自定义鱼饵生成：`lib/custom-bait.js`
- 图片模板：`resources/panel/panel.html`
- 钓鱼成就定义：`ACHIEVEMENT_DEFS`
- 每日鱼讯奖励：`lib/signals.js` 和 `worldState.json`
