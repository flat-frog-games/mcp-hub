const apiKey = 'u3361689-70eb43d5171c14f6889360b5';
async function run() {
  try {
    const res = await fetch("https://api.uptimerobot.com/v3/monitor-groups", {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    console.log("Groups:", await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
