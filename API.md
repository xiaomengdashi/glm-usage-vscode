# GLM/智谱 AI 用量监控 API 文档

本文档描述了 GLM/智谱 AI 平台的用量监控相关 API。

## 基础信息

- **Base URL**: `https://open.bigmodel.cn/api/anthropic`
- **认证方式**: Header `Authorization: <your_token>`
- **Content-Type**: `application/json`

## API 端点

### 1. 模型使用量查询

获取指定时间范围内的模型调用统计。

**端点**: `GET /api/monitor/usage/model-usage`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startTime | string | 是 | 开始时间，格式：`YYYY-MM-DD HH:mm:ss` |
| endTime | string | 是 | 结束时间，格式：`YYYY-MM-DD HH:mm:ss` |

**请求示例**:
```bash
curl -k "https://open.bigmodel.cn/api/monitor/usage/model-usage?startTime=2026-02-08%2000:00:01&endTime=2026-02-08%2001:30:00" \
  -H "Authorization: YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "x_time": ["2026-02-08 00:00", "2026-02-08 01:00"],
    "modelCallCount": [106, 26],
    "tokensUsage": [3053838, 776993],
    "totalUsage": {
      "totalModelCallCount": 132,
      "totalTokensUsage": 3830831
    }
  },
  "success": true
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| x_time | string[] | 时间点数组（按小时） |
| modelCallCount | number[] | 每个时间点的调用次数 |
| tokensUsage | number[] | 每个时间点的 token 用量 |
| totalUsage.totalModelCallCount | number | 总调用次数 |
| totalUsage.totalTokensUsage | number | 总 token 用量 |

---

### 2. 工具使用量查询

获取指定时间范围内的工具调用统计。

**端点**: `GET /api/monitor/usage/tool-usage`

**请求参数**: 与模型使用量查询相同

**请求示例**:
```bash
curl -k "https://open.bigmodel.cn/api/monitor/usage/tool-usage?startTime=2026-02-08%2000:00:01&endTime=2026-02-08%2001:30:00" \
  -H "Authorization: YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "x_time": ["2026-02-08 00:00"],
    "toolCallCount": [5],
    "totalUsage": {
      "totalToolCallCount": 5
    }
  },
  "success": true
}
```

---

### 3. 配额限制查询

获取当前的配额使用情况和限制。

**端点**: `GET /api/monitor/usage/quota/limit`

**请求参数**: 无

**请求示例**:
```bash
curl -k "https://open.bigmodel.cn/api/monitor/usage/quota/limit" \
  -H "Authorization: YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "limits": [
      {
        "type": "TIME_LIMIT",
        "usage": 100,
        "currentValue": 27
      },
      {
        "type": "TOKENS_LIMIT",
        "usage": 40000000,
        "currentValue": 635100
      }
    ]
  },
  "success": true
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| limits | array[] | 配额限制数组 |
| limits[].type | string | 限制类型：`TIME_LIMIT`(月度MCP) 或 `TOKENS_LIMIT`(5小时token) |
| limits[].usage | number | 限制总额 |
| limits[].currentValue | number | 当前已用值 |

---

## 时间计算说明

查询过去 24 小时数据的时间计算：

**当前时间**: `2026-02-08 14:30:00`

| 参数 | 值 | 说明 |
|------|-----|------|
| startTime | `2026-02-07 14:30:01` | 当前时间往前推 24 小时 + 1 秒 |
| endTime | `2026-02-08 14:30:00` | 当前时间 |

**JavaScript 示例**:
```javascript
const now = new Date();
const end = new Date(now);
const start = new Date(now.getTime() - 24 * 60 * 60 * 1000 + 1000);
```

**Python 示例**:
```python
from datetime import datetime, timedelta

now = datetime.now()
end = now
start = now - timedelta(seconds=24 * 60 * 60 - 1)
```

---

## 代理设置

如果需要通过代理访问：

**环境变量方式**:
```bash
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
```

**curl 使用代理**:
```bash
curl -k -x http://127.0.0.1:7890 "https://open.bigmodel.cn/..."
```

**Node.js (https-proxy-agent)**:
```javascript
const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

https.request({
  ...options,
  agent: agent
}, callback);
```

---

## 注意事项

1. 所有 API 请求都需要在 Header 中携带有效的 Authorization Token
2. 时间参数需要 URL 编码（空格编码为 `%20`）
3. 使用 `-k` 参数跳过 SSL 证书验证（仅开发环境）
4. 建议通过环境变量或配置文件管理 Token，避免硬编码
