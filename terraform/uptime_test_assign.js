const apiKey = 'u3361689-70eb43d5171c14f6889360b5';
async function run() {
  const monitors = [802530584, 802539459]; // mcp.flatfrog.games and MCP - WAF Check
  const mgroup = 16266;

  for (const id of monitors) {
      console.log(`Updating monitor ${id}...`);
      
      const bodyParams = new URLSearchParams({
          api_key: apiKey,
          format: 'json',
          id: id,
          mgroup_id: mgroup
      });
      // Optionally reset custom_http_statuses for mcp.flatfrog.games if it's 802530584
      if (id === 802530584) {
          // Setting it to expect 200 explicitly 
          // passing custom_http_statuses clears if empty, but UptimeRobot rejected empty. 
          bodyParams.append("custom_http_statuses", "200-299"); // try "200-299" or JSON string
      }
      
      try {
        const res = await fetch("https://api.uptimerobot.com/v2/editMonitor", {
           method: "POST",
           headers: { "content-type": "application/x-www-form-urlencoded" },
           body: bodyParams.toString()
        });
        console.log(`Result for ${id}:`, await res.json());
      } catch(e) { console.error(e) }
  }
}
run();
