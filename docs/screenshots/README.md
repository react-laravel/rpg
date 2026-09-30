# README 截图说明

首页截图分为两类，均为实际网页画面，没有使用 AI 合成的 UI 或离线绘制的战斗画面代替截图。

## 公开入口

- 文件：[`login-2026-09-30.jpg`](login-2026-09-30.jpg)
- 来源：<https://rpg.dogeow.com/>
- 核实日期：2026-09-30（UTC）
- 内容：未登录状态下的「开始你的冒险」与 DogeOW 统一登录按钮。
- 此截图仅证明公开登录入口可访问，不代表登录后游戏流程已在该日期重新验证。

## 游戏界面

复用仓库已有的浏览器测试截图，未重新绘制或修改图片。
对应验证记录说明这些界面使用隔离 API/WebSocket 测试数据，没有操作线上玩家存档。
截图包含测试角色名、测试等级和测试数值，不能用于判断当前线上平衡或掉落结果。

| 用途 | 原始截图 | 验证记录 |
| --- | --- | --- |
| 桌面战斗 | [`desktop-1440.png`](../../output/combat-unit-layout/desktop-1440.png) | [战斗单位布局检查](../../output/combat-unit-layout/result.json) |
| 手机战斗 | [`mobile-390.png`](../../output/combat-unit-layout/mobile-390.png) | [战斗单位布局检查](../../output/combat-unit-layout/result.json) |
| 手机角色与装备 | [`female-moon-390.png`](../../output/pixel-rpg/characters/weapon-pose/validation/female-moon-390.png) | [角色与武器检查](../../output/pixel-rpg/characters/weapon-pose/validation/matrix.json) |
| 技能树 | [`tree-1440-核心.png`](../../output/pixel-rpg/validation/skills/tree-1440-核心.png) | [技能验证目录](../../output/pixel-rpg/validation/skills/) |

这些图来自 2026 年 9 月已有的前端验证工作，早于 README 的新增日期。
游戏仍在更新，截图与当前线上部分细节可能不同；它们也不用于证明最新技能特效的实际播放效果。

## 更新约定

1. 使用真实应用页面和专用测试数据，保留可复核的来源与日期。
2. 至少覆盖桌面战斗、手机布局和一个成长页面。
3. 检查图片中没有邮箱、会话、登录票据、真实聊天或其他私人信息。
4. 如果截图来自测试数据、预览页面或旧版本，应明确标注。
5. 更新 README 中的相对路径并检查 GitHub 可正常显示；不要把离线渲染或概念图称为游玩截图。
