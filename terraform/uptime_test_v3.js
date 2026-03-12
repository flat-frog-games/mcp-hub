const apiKey = 'u3361689-70eb43d5171c14f6889360b5';

async function run() {
  const body = `api_key=${apiKey}&format=json`;
  
  // Try v3 
  console.log("Trying V3 Monitor Groups");
  try {
    const res = await fetch("https://api.uptimerobot.com/v3/monitor-groups", {
      method: "POST", // API V3 might use GET, let's try GET with token
      headers: { "Authorization": `Bearer ${apiKey}`, "content-type": "application/json" }
    });
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }

  // Let's reset the custom HTTP status via v2
  console.log("\nResetting custom HTTP statuses:");
  try {
     const statusBody = `api_key=${apiKey}&format=json&id=802530584&custom_http_statuses=` + encodeURIComponent(JSON.stringify({"200": 1}));
     const res2 = await fetch("https://api.uptimerobot.com/v2/editMonitor", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: statusBody
     });
     console.log(await res2.json());
  } catch (e) {
      console.error(e);
  }
}
run();
