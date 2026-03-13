import express from 'express';
import crypto from 'crypto';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

const execAsync = promisify(exec);

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 8083;
const activeSessions = new Map();

const serverConfigs = {
    github: {
        cmd: "node",
        args: ["./node_modules/@modelcontextprotocol/server-github/dist/index.js"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PAT },
        allowedTools: ['github_search_code', 'github_create_issue', 'github_create_pull_request', 'github_get_issue', 'github_add_issue_comment', 'github_get_file_contents', 'github_push_files', 'github_update_issue']
    },
    sentry: {
        cmd: "node",
        args: ["./node_modules/@sentry/mcp-server/dist/index.js"],
        env: { SENTRY_ACCESS_TOKEN: process.env.SENTRY_TOKEN }
    },
    notion: {
        cmd: "node",
        args: ["./node_modules/@notionhq/notion-mcp-server/bin/cli.mjs"],
        env: { NOTION_TOKEN: process.env.NOTION_API_TOKEN }
    },
    miro: {
        cmd: "node",
        args: ["./node_modules/@aditya.mishra/miro-mcp/build/index.js"],
        env: { MIRO_API_TOKEN: process.env.MIRO_API_TOKEN }
    }
};

const requireApiKey = (req, res, next) => {
    const apiKey = process.env.HUB_API_KEY;
    if (!apiKey) {
        logger.warn('HUB_API_KEY is not set in environment variables');
        return res.status(500).json({ error: 'Server configuration error: HUB_API_KEY missing' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (token !== apiKey) {
        return res.status(403).json({ error: 'Forbidden: Invalid API key' });
    }

    next();
};

app.get('/:server/sse', requireApiKey, async (req, res) => {
    const serverName = req.params.server;
    const config = serverConfigs[serverName];
    if (!config) {
        return res.status(404).send('Server not found');
    }

    // Create the SSE Transport attached to the HTTP response
    const sseTransport = new SSEServerTransport(`/${serverName}/messages`, res);
    const sessionId = sseTransport.sessionId;
    logger.info(`[${serverName}] New SSE proxy connection established: ${sessionId}`);
    
    // We don't overwrite start() or handlePostMessage(), just call start() to initiate SSE connection
    await sseTransport.start();

    // Setup ping interval to keep cloudflare tunnel alive
    const heartbeat = setInterval(() => {
        try {
            res.write('event: ping\ndata: ping\n\n'); 
        } catch(e) { /* ignore */ }
    }, 15000);

    // Create Stdio Client Transport to launch the actual MCP tool locally
    const childEnv = { ...process.env, ...config.env };
    const stdioTransport = new StdioClientTransport({
        command: config.cmd,
        args: config.args,
        env: childEnv
    });

    const pendingToolsListRequests = new Set();

    sseTransport.onmessage = (msg) => {
        if (msg.method === 'tools/list') {
            pendingToolsListRequests.add(msg.id);
        }
        // Forward from IDE (via SSE POST) to child process stdio
        stdioTransport.send(msg).catch(e => logger.error(`[${serverName} ERR] stdio send failed:`, e));
    };
    
    stdioTransport.onmessage = (msg) => {
        // Intercept tools/list response to curate tools and prevent bloat
        if (msg.id && pendingToolsListRequests.has(msg.id) && msg.result && msg.result.tools) {
            pendingToolsListRequests.delete(msg.id);
            if (config.allowedTools) {
                const originalCount = msg.result.tools.length;
                msg.result.tools = msg.result.tools.filter(t => config.allowedTools.includes(t.name));
                logger.info(`[${serverName}] Curated tools for session ${sessionId}: reduced from ${originalCount} to ${msg.result.tools.length}`);
            }
        }
        // Forward from child process (stdio) to IDE (via SSE)
        sseTransport.send(msg).catch(e => logger.error(`[${serverName} ERR] sse send failed:`, e));
    };

    let isCleaningUp = false;
    const cleanup = () => {
        if (isCleaningUp) return;
        isCleaningUp = true;
        logger.info(`[${serverName}] Cleaning up transports for session: ${sessionId}`);
        clearInterval(heartbeat);
        try { stdioTransport.close().catch(() => {}); } catch(e) {}
        try { sseTransport.close().catch(() => {}); } catch(e) {}
        activeSessions.delete(sessionId);
    };

    sseTransport.onclose = () => cleanup();
    stdioTransport.onclose = () => cleanup();
    sseTransport.onerror = (err) => logger.error(`[${serverName}] SSE error:`, err);
    stdioTransport.onerror = (err) => logger.error(`[${serverName}] Stdio error:`, err);
    
    // SDK StdioClientTransport explicitly parses and drops non-jsonrpc invalid lines
    // automatically making it perfectly stable.
    try {
        activeSessions.set(sessionId, sseTransport);
        await stdioTransport.start();
    } catch (e) {
        logger.error(`[${serverName}] Failed to start stdio process:`, e);
        cleanup();
    }
    
    req.on('close', () => {
        logger.info(`[${serverName}] Client disconnected, cleaning up session: ${sessionId}`);
        cleanup();
    });
});

app.post('/:server/messages', requireApiKey, async (req, res) => {
    const sessionId = req.query.sessionId;
    logger.info(`[${req.params.server}] POST received for sessionId: ${sessionId}`);
    const transport = activeSessions.get(sessionId);

    if (!transport) {
        logger.info(`[${req.params.server}] Session NOT FOUND. Active sessions:`, [...activeSessions.keys()]);
        return res.status(404).send('Session not found');
    }

    try {
        await transport.handlePostMessage(req, res, req.body);
    } catch(e) {
        logger.error("Error handling post message:", e);
        res.status(500).send("Message handling failed");
    }
});

app.get('/health', (req, res) => res.send('OK'));
app.get('/health/deep', async (req, res) => {
    const checks = {
        env: {
            GITHUB_PAT: !!process.env.GITHUB_PAT,
            SENTRY_TOKEN: !!process.env.SENTRY_TOKEN,
            NOTION_API_TOKEN: !!process.env.NOTION_API_TOKEN,
            MIRO_API_TOKEN: !!process.env.MIRO_API_TOKEN,
            HUB_API_KEY: !!process.env.HUB_API_KEY,
        },
        npx: false,
        status: 'OK'
    };

    try {
        await execAsync('npx --version', { timeout: 3000 });
        checks.npx = true;
    } catch (e) {
        checks.npx = false;
        checks.status = 'ERROR';
    }

    if (!checks.env.GITHUB_PAT || !checks.env.SENTRY_TOKEN || !checks.env.NOTION_API_TOKEN || !checks.env.MIRO_API_TOKEN || !checks.env.HUB_API_KEY) {
        checks.status = 'ERROR';
    }

    if (checks.status === 'OK') {
        res.status(200).json(checks);
    } else {
        res.status(500).json(checks);
    }
});
app.get('/', (req, res) => res.send('MCP Hub is running'));

app.listen(PORT, () => {
    logger.info(`MCP Hub listening on port ${PORT}`);
});
