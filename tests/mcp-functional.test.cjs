const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");

const BASE_URL = process.env.BASE_URL || "https://mcp.flatfrog.games";

const MCP_URLS = [
  `${BASE_URL}/sentry/sse`,
  `${BASE_URL}/github/sse`,
  `${BASE_URL}/notion/sse`
];

describe("MCP API Functional Tests", () => {
  // Give it slightly longer timeouts for external calls
  jest.setTimeout(15000);

  test.each(MCP_URLS)("should connect to %s and list tools", async (url) => {
    // 1. Setup transport
    const transport = new SSEClientTransport(new URL(url));
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      // 2. Connect
      await client.connect(transport);
      
      // 3. List tools to verify healthy JSON-RPC connection
      const tools = await client.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools.tools)).toBe(true);
      expect(tools.tools.length).toBeGreaterThan(0);

    } finally {
      // 4. Teardown
      try {
        await client.close();
      } catch (err) {
        // ignore close errors
      }
    }
  });
});
