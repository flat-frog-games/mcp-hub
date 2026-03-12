import express from 'express';
import crypto from 'crypto';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 8083;
const activeSessions = new Map();

const serverConfigs = {
    github: {
        cmd: "npx",
        args: ["--no-install", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PAT }
    },
    sentry: {
        cmd: "npx",
        args: ["--no-install", "@sentry/mcp-server"],
        env: { SENTRY_ACCESS_TOKEN: process.env.SENTRY_TOKEN }
    },
    notion: {
        cmd: "npx",
        args: ["--no-install", "@notionhq/notion-mcp-server"],
        env: {
            NOTION_TOKEN: process.env.NOTION_API_TOKEN
        }
    }
};

app.get('/:server/sse', async (req, res) => {
    const serverName = req.params.server;
    const config = serverConfigs[serverName];
    if (!config) {
        return res.status(404).send('Server not found');
    }

    const sessionId = crypto.randomUUID();
    console.log(`[${serverName}] New SSE proxy connection established: ${sessionId}`);

    // Create the SSE Transport attached to the HTTP response
    const sseTransport = new SSEServerTransport(`/${serverName}/messages?sessionId=${sessionId}`, res);
    
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

    sseTransport.onmessage = (msg) => {
        // Forward from IDE (via SSE POST) to child process stdio
        stdioTransport.send(msg).catch(e => console.error(`[${serverName} ERR] stdio send failed:`, e));
    };
    
    stdioTransport.onmessage = (msg) => {
        // Forward from child process (stdio) to IDE (via SSE)
        sseTransport.send(msg).catch(e => console.error(`[${serverName} ERR] sse send failed:`, e));
    };

    const cleanup = () => {
        console.log(`[${serverName}] Cleaning up transports for session: ${sessionId}`);
        clearInterval(heartbeat);
        try { stdioTransport.close().catch(() => {}); } catch(e) {}
        try { sseTransport.close().catch(() => {}); } catch(e) {}
        activeSessions.delete(sessionId);
    };

    sseTransport.onclose = () => cleanup();
    stdioTransport.onclose = () => cleanup();
    sseTransport.onerror = (err) => console.log(`[${serverName}] SSE error:`, err);
    stdioTransport.onerror = (err) => console.log(`[${serverName}] Stdio error:`, err);
    
    // SDK StdioClientTransport explicitly parses and drops non-jsonrpc invalid lines
    // automatically making it perfectly stable.
    try {
        await stdioTransport.start();
        activeSessions.set(sessionId, sseTransport);
    } catch (e) {
        console.error(`[${serverName}] Failed to start stdio process:`, e);
        cleanup();
    }
    
    req.on('close', () => {
        console.log(`[${serverName}] Client disconnected, cleaning up session: ${sessionId}`);
        cleanup();
    });
});

app.post('/:server/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = activeSessions.get(sessionId);

    if (!transport) {
        return res.status(404).send('Session not found');
    }

    try {
        await transport.handlePostMessage(req, res);
    } catch(e) {
        console.error("Error handling post message:", e);
        res.status(500).send("Message handling failed");
    }
});

app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('MCP Hub is running'));

app.listen(PORT, () => {
    console.log(`MCP Hub listening on port ${PORT}`);
});
