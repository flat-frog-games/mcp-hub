const apiKey = 'u3361689-70eb43d5171c14f6889360b5';
fetch("https://api.uptimerobot.com/v2/getMonitors", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `api_key=${apiKey}&format=json`
}).then(r => r.json()).then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(console.error);
