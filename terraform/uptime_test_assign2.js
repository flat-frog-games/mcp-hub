const apiKey = 'u3361689-70eb43d5171c14f6889360b5';

async function assign() {
    try {
        console.log("Updating mcp.flatfrog.games...");
        let body = `api_key=${apiKey}&format=json&id=802530584&mgroup_id=16266`;
        let res = await fetch("https://api.uptimerobot.com/v2/editMonitor", {
           method: "POST",
           headers: { "content-type": "application/x-www-form-urlencoded" },
           body: body
        });
        console.log("Result 1:", await res.json());

        console.log("Updating MCP - WAF Check...");
        body = `api_key=${apiKey}&format=json&id=802539459&mgroup_id=16266`;
        res = await fetch("https://api.uptimerobot.com/v2/editMonitor", {
           method: "POST",
           headers: { "content-type": "application/x-www-form-urlencoded" },
           body: body
        });
        console.log("Result 2:", await res.json());
    } catch (e) { console.error(e) }
}
assign();
