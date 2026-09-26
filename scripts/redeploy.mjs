// Triggers a Vercel redeploy via a Deploy Hook, without needing a git push.
// Usage: npm run redeploy
// Requires VERCEL_DEPLOY_HOOK_URL to be set (see .env.local / README).

const url = process.env.VERCEL_DEPLOY_HOOK_URL;

if (!url) {
  console.error(
    "Missing VERCEL_DEPLOY_HOOK_URL. Add it to .env.local, or run:\n" +
      "  VERCEL_DEPLOY_HOOK_URL=... npm run redeploy"
  );
  process.exit(1);
}

const response = await fetch(url, { method: "POST" });

if (!response.ok) {
  console.error(`Deploy hook failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const data = await response.json().catch(() => ({}));
console.log("Redeploy triggered.", data.job ? `Job id: ${data.job.id}` : "");
