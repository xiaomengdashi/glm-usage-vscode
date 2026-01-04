# GLM/智谱 AI 实时用量监控

<p align="center">
  <img src="https://i.meee.com.tw/C4DxZCH.png" width="128" height="128" alt="GLM Usage Monitor Icon">
</p>

这是一个为 **智谱 AI (GLM)** 和 **Z.ai** 开发者打造的插件。它能让你在编辑器底部实时查看 API 用量、Token 消耗以及配额剩余情况，从此告别盲目调用，精准掌控开发成本。

![演示效果](https://i.meee.com.tw/R8iERCE.png)

## ✨ 核心特性

*   **📊 悬停数据看板 (Hover Dashboard)**
    *   无需点击，鼠标悬停在状态栏即可查看完整的数据大屏。
    *   **24小时流量波形图**：使用高精度 ASCII 图表绘制，直观展示今日调用起伏。
    *   **核心指标**：清晰展示今日总调用次数、Token 消耗总量。

*   **⚡ 智能配额预警**
    *   **MCP 额度监控**：实时追踪月度 MCP 调用额度。
    *   **5小时流控监测**：精准监控 Token 的 5 小时滑动窗口限制。
    *   **自动告警**：当任一配额使用率超过 **80%**，状态栏会自动变红提醒，防止超额熔断。

*   **🚀 极简状态栏集成**
    *   常驻显示最关键信息：`GLM: 20%(MCP) 15%(5h) | 802次`。
    *   **一键刷新**：点击状态栏图标即可立即同步最新数据。

*   **🌐 多平台支持**
    *   完美支持 **智谱 AI (open.bigmodel.cn)** 和 **Z.ai** 平台。

## 🛠️ 快速开始

1.  **安装插件**：在 VS Code 插件市场搜索 `GLM Usage` 并安装。
2.  **配置 Token**：
    *   点击底部状态栏的 `$(gear) 配置 GLM`。
    *   或者按 `Ctrl+Shift+P` 输入 `GLM` 选择配置命令。
    *   输入您的 API Key (支持 `sk-...` 或 `id.secret` 格式)。
3.  **开始使用**：
    *   配置完成后，状态栏会自动显示当前用量。
    *   鼠标悬停在状态栏上查看详细数据看板。

## ⚙️ 配置项

您也可以在 `settings.json` 中手动配置：

```json
{
  // 必须：您的 API Token
  "glmUsage.authToken": "your_api_key_here",

  // 可选：API 地址 (默认智谱 AI)
  // 支持: "https://open.bigmodel.cn/api/anthropic" 或 "https://api.z.ai/api/anthropic"
  "glmUsage.baseUrl": "https://open.bigmodel.cn/api/anthropic",

  // 可选：请求超时时间 (毫秒)
  "glmUsage.timeout": 30000
}
```

> **提示**：插件也支持读取系统环境变量 `ANTHROPIC_AUTH_TOKEN`，适合不在代码库中保存 Token 的场景。

## ❓ 常见问题

**Q: Token 在哪里获取？**
A: 请前往 [智谱 AI 开放平台](https://open.bigmodel.cn/) 或 Z.ai 控制台生成您的 API Key。

**Q: 状态栏为什么变红了？**
A: 这意味着您的 MCP 额度或 Token (5h) 流控使用率超过了 80%。请注意控制调用频率，以免服务被暂停。

## 📄 开源协议

MIT License &copy; 2026 Safphere
