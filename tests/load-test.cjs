const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");

const TARGET_URL = process.argv[2] || "https://mcp.flatfrog.games/sentry/sse";
const CONCURRENCY = parseInt(process.argv[3] || "10", 10);

console.log(`Starting load test against ${TARGET_URL} with concurrency ${CONCURRENCY}`);

async function runClient(clientId) {
  const transport = new SSEClientTransport(new URL(TARGET_URL));
  const client = new Client(
    { name: `load-client-${clientId}`, version: "1.0.0" },
    { capabilities: {} }
  );

  const startTime = Date.now();
  try {
    await client.connect(transport);
    const connectTime = Date.now() - startTime;
    
    const requestStart = Date.now();
    await client.listTools();
    const requestTime = Date.now() - requestStart;
    
    console.log(`[CLIENT ${clientId}] Success - Connect: ${connectTime}ms | listTools: ${requestTime}ms`);
  } catch (err) {
    console.error(`[CLIENT ${clientId}] Failed:`, err.message);
  } finally {
    try {
      await client.close();
    } catch(e) {}
  }
}

async function startLoadTest() {
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(runClient(i + 1));
  }
  
  await Promise.all(promises);
  console.log("Load test complete!");
}

startLoadTest();
