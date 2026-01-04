const vscode = require('vscode');
const https = require('https');

/**
 * GLM Usage Monitor Extension 4.10.1
 * Feature: Chinese localization for Hover Dashboard
 */

function activate(context) {
    const service = new GLMUsageService(context);
    service.start();
}

function deactivate() { }

class GLMUsageService {
    constructor(context) {
        this.context = context;
        this.statusBarItem = null;
        this.cachedData = null;
        this.initStatusBar();
        this.registerCommands();
    }

    initStatusBar() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        this.statusBarItem.text = '$(pulse) GLM 初始化...';
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }

    registerCommands() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('glm-usage.refresh', () => this.fetchUsageData(true)),
            vscode.commands.registerCommand('glm-usage.configure', () => this.configureToken())
        );
        this.statusBarItem.command = 'glm-usage.refresh';
    }

    async start() {
        await this.fetchUsageData();
        this.startPeriodicRefresh();
    }

    async configureToken() {
        const config = vscode.workspace.getConfiguration('glmUsage');
        const token = await vscode.window.showInputBox({
            prompt: '请输入智谱 API Token',
            password: true,
            value: config.get('authToken', '')
        });
        if (token) {
            await config.update('authToken', token, vscode.ConfigurationTarget.Global);
            this.fetchUsageData(true);
        }
    }

    async fetchUsageData(force = false) {
        try {
            const config = this.loadConfig();
            if (!config.authToken) {
                this.statusBarItem.text = '$(gear) 配置 GLM';
                return;
            }
            if (force) this.statusBarItem.text = '$(sync~spin) 刷新中...';

            const data = await this.fetchFromAPI(config);
            this.cachedData = data;
            this.updateStatusBar(data);
        } catch (e) {
            console.error(e);
            this.statusBarItem.text = '$(error) GLM 错误';
        }
    }

    loadConfig() {
        const config = vscode.workspace.getConfiguration('glmUsage');
        return {
            authToken: config.get('authToken') || process.env.ANTHROPIC_AUTH_TOKEN || '',
            baseUrl: config.get('baseUrl') || 'https://open.bigmodel.cn/api/anthropic',
            timeout: config.get('timeout', 30000)
        };
    }

    async request(url, config) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const options = {
                hostname: parsedUrl.hostname, port: 443, path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET', rejectUnauthorized: false, timeout: config.timeout,
                headers: { 'Authorization': config.authToken, 'Content-Type': 'application/json' }
            };
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    async fetchFromAPI(config) {
        const base = new URL(config.baseUrl);
        const domain = `${base.protocol}//${base.host}`;
        const platform = config.baseUrl.includes('z.ai') ? 'Z.AI' : '智谱AI';

        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - 1); start.setMinutes(0);
        const end = new Date(now); end.setMinutes(59);
        const zFormat = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

        const q = `?startTime=${encodeURIComponent(zFormat(start))}&endTime=${encodeURIComponent(zFormat(end))}`;

        const [model, tool, quota] = await Promise.all([
            this.request(`${domain}/api/monitor/usage/model-usage${q}`, config),
            this.request(`${domain}/api/monitor/usage/tool-usage${q}`, config),
            this.request(`${domain}/api/monitor/usage/quota/limit`, config)
        ]);

        return this.processData({ model, tool, quota, platform, timestamp: now });
    }

    processData({ model, tool, quota, platform, timestamp }) {
        const mData = model.data || {};
        const qData = quota.data || {};

        let history = [];
        if (Array.isArray(mData.x_time)) {
            history = mData.x_time.map((time, i) => ({
                time: time.split(' ')[1] || time,
                calls: mData.modelCallCount?.[i] || 0
            }));
        }

        let quotas = { mcp: { used: 0, total: 4000, pct: 0 }, token5h: { pct: 0 } };
        (qData.limits || []).forEach(l => {
            if (l.type === 'TIME_LIMIT') quotas.mcp = { used: l.currentValue, total: l.usage, pct: Math.round(l.percentage * 100) };
            if (l.type === 'TOKENS_LIMIT') quotas.token5h = { pct: parseFloat(l.percentage || 0) };
        });

        return {
            platform, timestamp: timestamp.getTime(),
            totals: {
                calls: mData.totalUsage?.totalModelCallCount || 0,
                tokens: mData.totalUsage?.totalTokensUsage || 0
            },
            quotas, history
        };
    }

    updateStatusBar(data) {
        const mcp = data.quotas.mcp.pct;
        const t5h = data.quotas.token5h.pct;
        const calls = data.totals.calls.toLocaleString();
        const tokens = this.formatTokens(data.totals.tokens);

        this.statusBarItem.text = `$(graph) GLM: ${mcp}%(MCP) ${t5h}%(5h) | ${calls}次 ${tokens}`;
        this.statusBarItem.backgroundColor = (mcp > 80 || t5h > 80) ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
        this.statusBarItem.tooltip = this.buildDashboardTooltip(data);
    }

    buildDashboardTooltip(data) {
        const md = new vscode.MarkdownString('', true);
        md.isTrusted = true;
        md.supportHtml = true;

        const dateStr = new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
        const mcpColor = data.quotas.mcp.pct > 80 ? '#da3633' : '#58a6ff';
        const t5hColor = data.quotas.token5h.pct > 80 ? '#da3633' : '#238636';

        md.appendMarkdown(`### **GLM 数据看板** &nbsp; \`${data.platform}\`\n`);
        md.appendMarkdown(`<span style="color:#8b949e">更新时间: ${dateStr}</span>\n\n`);
        md.appendMarkdown(`---\n`);

        md.appendMarkdown(`| **Token 总量** | **今日调用 (24H)** |\n`);
        md.appendMarkdown(`| :--- | :--- |\n`);
        md.appendMarkdown(`| <span style="color:#d2a8ff;font-size:15px;font-weight:bold">${this.formatNumber(data.totals.tokens)}</span> | <span style="color:#79c0ff;font-size:15px;font-weight:bold">${this.formatNumber(data.totals.calls)}</span> |\n\n`);

        md.appendMarkdown(`**配额状态**\n\n`);

        const drawBar = (pct, color) => {
            const filled = Math.round((pct / 100) * 15);
            return `<span style="color:${color}">${'█'.repeat(filled)}</span><span style="color:#484f58">${'░'.repeat(15 - filled)}</span>`;
        };

        md.appendMarkdown(`MCP 额度 (月) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**${data.quotas.mcp.pct}%**\n\n`);
        md.appendMarkdown(`${drawBar(data.quotas.mcp.pct, mcpColor)} &nbsp; ${data.quotas.mcp.used}/${data.quotas.mcp.total}\n\n`);

        md.appendMarkdown(`Token 限流 (5小时) &nbsp;**${data.quotas.token5h.pct}%**\n\n`);
        md.appendMarkdown(`${drawBar(data.quotas.token5h.pct, t5hColor)}\n\n`);

        md.appendMarkdown(`**调用趋势 (24H)**\n\n`);
        if (data.history.length > 0) {
            const calls = data.history.map(x => x.calls);
            const max = Math.max(...calls, 1);
            const bars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            const sparkline = calls.map(c => {
                if (c === 0) return '<span style="color:#30363d">_</span>';
                const i = Math.floor((c / max) * (bars.length - 1));
                return `<span style="color:#58a6ff">${bars[i]}</span>`;
            }).join('');

            md.appendMarkdown(`${sparkline}\n`);
            const peak = data.history.reduce((a, b) => a.calls > b.calls ? a : b);
            const peakTime = peak.time.split(' ')[1] || peak.time;
            md.appendMarkdown(`<span style="color:#8b949e">峰值: **${peak.calls}** 次 (${peakTime})</span>\n\n`);
        }

        md.appendMarkdown(`---\n`);
        md.appendMarkdown(`[$(refresh) **刷新数据**](command:glm-usage.refresh) &nbsp;&nbsp; [$(settings) **配置 Token**](command:glm-usage.configure)`);

        return md;
    }

    startPeriodicRefresh() { setInterval(() => this.fetchUsageData(), 60000); }

    formatTokens(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return String(num);
    }

    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}
module.exports = { activate, deactivate };
