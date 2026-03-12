const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");

const TARGET_URL = process.argv[2] || "https://mcp.flatfrog.games/sentry/sse";
const PING_INTERVAL = 30000; // 30 seconds

console.log(`Starting soak test against ${TARGET_URL}`);
console.log("Press Ctrl+C to exit.");

(async () => {
  const transport = new SSEClientTransport(new URL(TARGET_URL));
  const client = new Client(
    { name: "soak-client", version: "1.0.0" },
    { capabilities: {} }
  );

  let connectedTime = Date.now();

  // Handlers for error/close to log stability issues
  transport.onerror = (error) => {
    console.error(`[ERROR] Transport error occurred after ${(Date.now() - connectedTime) / 1000}s:`, error);
  };
  transport.onclose = () => {
    console.error(`[CLOSED] Connection closed after ${(Date.now() - connectedTime) / 1000}s.`);
    process.exit(1);
  };

  try {
    await client.connect(transport);
    console.log("[CONNECTED] Successfully established SSE connection.");
    
    // Periodically fetch tools to simulate active traffic
    setInterval(async () => {
      try {
         await client.listTools();
         console.log(`[ALIVE] Heartbeat success. Uptime: ${(Date.now() - connectedTime) / 1000}s`);
      } catch (err) {
         console.error("[ERROR] Failed to list tools during heartbeat:", err);
      }
    }, PING_INTERVAL);

  } catch (err) {
    console.error("[FATAL] Could not connect to initial MCP server.", err);
    process.exit(1);
  }
})();
