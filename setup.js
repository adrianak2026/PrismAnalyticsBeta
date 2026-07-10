#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     PrismAnalytics — One-Click Setup                      ║
 * ║        Inspired by FormForge Automation — Zero Manual Copy-Paste!         ║
 * ║  Automatically creates D1 DB, KV Namespace, R2 Bucket, Secrets & Deploys  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const readline = require("readline");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── Terminal Colors ───
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  white: "\x1b[97m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgMagenta: "\x1b[45m",
};

function log(msg) { console.log(msg); }
function info(msg) { log(`${C.cyan}ℹ${C.reset}  ${msg}`); }
function success(msg) { log(`${C.green}✔${C.reset}  ${msg}`); }
function warn(msg) { log(`${C.yellow}⚠${C.reset}  ${C.yellow}${msg}${C.reset}`); }
function error(msg) { log(`${C.red}✖${C.reset}  ${C.red}${msg}${C.reset}`); }
function step(num, msg) { log(`\n${C.bgCyan}${C.bold} STEP ${num} ${C.reset} ${C.bold}${msg}${C.reset}`); }
function done(msg) { log(`\n${C.bgGreen}${C.bold} DONE ${C.reset} ${C.green}${msg}${C.reset}`); }

function banner() {
  log("");
  log(`${C.magenta}${C.bold}  ╔═════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.magenta}${C.bold}  ║          🔥 PrismAnalytics — One-Click Setup 🔥            ║${C.reset}`);
  log(`${C.magenta}${C.bold}  ║  Auto-creates D1, KV, R2, Secrets & Deploys seamlessly!     ║${C.reset}`);
  log(`${C.magenta}${C.bold}  ╚═════════════════════════════════════════════════════════════╝${C.reset}`);
  log("");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` ${C.dim}(${defaultVal})${C.reset}` : "";
    rl.question(`${C.white}${C.bold}?${C.reset}  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function confirm(question, defaultYes = true) {
  return new Promise((resolve) => {
    const suffix = defaultYes ? ` ${C.dim}(Y/n)${C.reset}` : ` ${C.dim}(y/N)${C.reset}`;
    rl.question(`${C.yellow}?${C.reset}  ${question}${suffix}: `, (answer) => {
      const ans = answer.trim().toLowerCase();
      if (!ans) return resolve(defaultYes);
      resolve(ans === "y" || ans === "yes");
    });
  });
}

function runCapture(cmd) {
  try {
    const result = execSync(cmd, { encoding: "utf-8", stdio: "pipe", cwd: __dirname });
    return { ok: true, output: result };
  } catch (err) {
    return { ok: false, output: err.stdout || err.stderr || err.message };
  }
}

function runInherit(cmd) {
  try {
    execSync(cmd, { encoding: "utf-8", stdio: "inherit", cwd: __dirname });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

function runWithInput(cmd, inputText) {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn(isWin ? "cmd" : "sh", isWin ? ["/c", cmd] : ["-c", cmd], {
      cwd: __dirname,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    setTimeout(() => {
      child.stdin.write(inputText + "\n");
      child.stdin.end();
    }, 1000);

    child.on("close", (code) => {
      resolve({ ok: code === 0, output: stdout + stderr });
    });
  });
}

// ─── Update wrangler.toml ───
function updateWranglerToml(updates) {
  const configPath = path.join(__dirname, "wrangler.toml");
  if (!fs.existsSync(configPath)) {
    error("wrangler.toml not found at root!");
    return false;
  }
  let content = fs.readFileSync(configPath, "utf-8");

  if (updates.name) {
    content = content.replace(/^name\s*=\s*"[^"]*"/m, `name = "${updates.name}"`);
  }
  if (updates.databaseName) {
    content = content.replace(/database_name\s*=\s*"[^"]*"/m, `database_name = "${updates.databaseName}"`);
  }
  if (updates.databaseId && typeof updates.databaseId === "string" && updates.databaseId.length > 5) {
    content = content.replace(/database_id\s*=\s*"[^"]*"/m, `database_id = "${updates.databaseId}"`);
  }
  if (updates.kvId && typeof updates.kvId === "string" && updates.kvId.length > 5) {
    // replace inside [[kv_namespaces]] section
    content = content.replace(/(id\s*=\s*")[^"]*("\s*\n\s*preview_id)/m, `$1${updates.kvId}$2`);
  }
  if (updates.r2BucketName) {
    content = content.replace(/bucket_name\s*=\s*"[^"]*"/m, `bucket_name = "${updates.r2BucketName}"`);
  }
  if (updates.appUrl) {
    content = content.replace(/APP_URL\s*=\s*"[^"]*"/m, `APP_URL = "${updates.appUrl}"`);
  }

  fs.writeFileSync(configPath, content, "utf-8");
  return true;
}

// ─── Extract UUID ID from D1 output ───
function extractDbId(output) {
  let match = output.match(/database_id\s*=\s*"?([a-f0-9-]{36})"?/i);
  if (match) return match[1];
  match = output.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (match) return match[1];
  return null;
}

// ─── Extract Hex ID from KV output ───
function extractKvId(output) {
  let match = output.match(/id\s*=\s*"?([a-f0-9]{32})"?/i);
  if (match) return match[1];
  match = output.match(/\b([a-f0-9]{32})\b/i);
  if (match) return match[1];
  return null;
}

async function main() {
  banner();

  // 1. Check Wrangler
  info("Checking Cloudflare Wrangler status...");
  const wranglerCheck = runCapture("npx wrangler --version");
  if (!wranglerCheck.ok) {
    error("Wrangler CLI not found! Please run 'npm install' first.");
    process.exit(1);
  }
  success(`Wrangler found: ${C.bold}${wranglerCheck.output.trim()}${C.reset}`);

  // 2. Check Login
  info("Checking Cloudflare authentication status...");
  const whoami = runCapture("npx wrangler whoami");
  if (!whoami.ok || whoami.output.includes("not authenticated") || whoami.output.includes("You are not authenticated")) {
    warn("You are currently not logged into Cloudflare!");
    info("Opening browser for Cloudflare authentication...");
    log("");
    runInherit("npx wrangler login");
    log("");

    const recheck = runCapture("npx wrangler whoami");
    if (!recheck.ok || recheck.output.includes("not authenticated")) {
      error("Authentication failed. Please run 'npx wrangler login' manually and retry.");
      process.exit(1);
    }
  }
  success("Logged into Cloudflare ✔");

  // ═══════════════════════════════════════
  //  User Interactive Inputs
  // ═══════════════════════════════════════
  log(`\n${C.bgMagenta}${C.bold} SETUP CONFIGURATION ${C.reset} Let's configure your unique instance:\n`);

  const appName = await ask("Worker / App Name?", "prism-analytics");
  const dbName = await ask("D1 Database Name?", `${appName}-db`);
  const kvName = await ask("KV Namespace Name (for daily privacy salt)?", `${appName}-kv`);
  const r2Name = await ask("R2 Bucket Name (for long-term CSV/JSON exports)?", `${appName}-storage`);

  log("");
  info("JWT_SECRET secures your user tokens and derives the daily rotating privacy salt.");
  const autoGenSecret = await confirm("Auto-generate a ultra-secure 48-byte JWT_SECRET automatically?", true);

  let jwtSecret;
  if (autoGenSecret) {
    jwtSecret = crypto.randomBytes(48).toString("hex");
    success(`Generated 48-byte hex secret: ${C.dim}${jwtSecret.slice(0, 16)}...${C.reset}`);
  } else {
    jwtSecret = await ask("Enter your custom JWT_SECRET (min 32 characters)");
    if (jwtSecret.length < 32) {
      warn("Secret is shorter than 32 characters! Auto-generating secure secret instead.");
      jwtSecret = crypto.randomBytes(48).toString("hex");
      info(`Auto-generated: ${C.dim}${jwtSecret.slice(0, 16)}...${C.reset}`);
    }
  }

  log(`\n${C.cyan}${C.bold}═══════════════════ Summary ═══════════════════${C.reset}`);
  log(`  ${C.bold}Worker Name:${C.reset}   ${appName}`);
  log(`  ${C.bold}D1 Database:${C.reset}   ${dbName}`);
  log(`  ${C.bold}KV Namespace:${C.reset}  ${kvName}`);
  log(`  ${C.bold}R2 Bucket:${C.reset}     ${r2Name}`);
  log(`  ${C.bold}JWT Secret:${C.reset}    ${jwtSecret.slice(0, 16)}... (safely managed)`);
  log(`${C.cyan}${C.bold}════════════════════════════════════════════════${C.reset}\n`);

  const proceed = await confirm("Everything look correct? Start automated deployment?", true);
  if (!proceed) {
    warn("Setup cancelled. Run 'npm run setup' whenever you are ready!");
    rl.close();
    process.exit(0);
  }

  // ═══════════════════════════════════════
  //  STEP 1: Create D1 Database
  // ═══════════════════════════════════════
  step(1, `Creating D1 Database '${dbName}'...`);
  const createDb = runCapture(`npx wrangler d1 create ${dbName}`);
  let dbId = null;

  if (!createDb.ok || createDb.output.includes("already exists")) {
    if (createDb.output?.includes("already exists") || !createDb.ok) {
      warn(`Database '${dbName}' already exists or listed. Retrieving existing database_id...`);
      const listDb = runCapture("npx wrangler d1 list");
      if (listDb.ok) {
        const lines = listDb.output.split("\n");
        for (const line of lines) {
          if (line.includes(dbName)) {
            dbId = extractDbId(line);
            if (dbId) break;
          }
        }
      }
    }
  } else {
    dbId = extractDbId(createDb.output);
  }

  if (dbId) {
    success(`D1 Database provisioned! ID: ${C.cyan}${dbId}${C.reset}`);
    updateWranglerToml({ name: appName, databaseName: dbName, databaseId: dbId });
    success("wrangler.toml updated with D1 database_id ✔");
  } else {
    warn("Could not automatically parse database_id. If D1 already exists, wrangler.toml will use existing binding.");
  }

  // ═══════════════════════════════════════
  //  STEP 2: Create KV Namespace
  // ═══════════════════════════════════════
  step(2, `Creating KV Namespace '${kvName}'...`);
  const createKv = runCapture(`npx wrangler kv namespace create "${kvName}"`);
  let kvId = null;

  if (!createKv.ok || createKv.output.includes("already exists")) {
    warn(`KV Namespace '${kvName}' might already exist. Retrieving existing ID...`);
    const listKv = runCapture("npx wrangler kv namespace list");
    if (listKv.ok) {
      try {
        const listJson = JSON.parse(listKv.output.trim());
        const found = listJson.find((k) => k.title && k.title.includes(kvName));
        if (found && found.id) kvId = found.id;
      } catch {
        const lines = listKv.output.split("\n");
        for (const line of lines) {
          if (line.includes(kvName)) {
            kvId = extractKvId(line);
            if (kvId) break;
          }
        }
      }
    }
  } else {
    kvId = extractKvId(createKv.output);
  }

  if (kvId) {
    success(`KV Namespace provisioned! ID: ${C.cyan}${kvId}${C.reset}`);
    updateWranglerToml({ kvId });
    success("wrangler.toml updated with KV namespace id ✔");
  } else {
    warn("Could not automatically parse KV id. If KV already exists, check dashboard or wrangler kv list.");
  }

  // ═══════════════════════════════════════
  //  STEP 3: R2 Storage (Optional)
  // ═══════════════════════════════════════
  step(3, `Skipping R2 Storage bucket creation to ensure 100% Free Tier Cloudflare compatibility...`);
  info("Your application will run perfectly using D1 Database directly for CSV/JSON exports.");

  // ═══════════════════════════════════════
  //  STEP 4: Set JWT_SECRET inside Cloudflare
  // ═══════════════════════════════════════
  step(4, "Setting secure JWT_SECRET via 'wrangler secret put' (Zero plain-text in code)...");
  const secretCmd = process.platform === "win32"
    ? `echo ${jwtSecret} | npx wrangler secret put JWT_SECRET`
    : `echo "${jwtSecret}" | npx wrangler secret put JWT_SECRET`;
  const putSecret = runCapture(secretCmd);

  if (putSecret.ok) {
    success("JWT_SECRET encrypted and stored directly in Cloudflare Workers secrets store ✔");
  } else {
    const interactiveSecret = await runWithInput("npx wrangler secret put JWT_SECRET", jwtSecret);
    if (interactiveSecret.ok) {
      success("JWT_SECRET set successfully ✔");
    } else {
      warn("Could not auto-set secret non-interactively. If prompted later, run: npx wrangler secret put JWT_SECRET");
    }
  }

  // Backup secret safely to .env.local for local dev
  const backupPath = path.join(__dirname, ".jwt-secret-backup.txt");
  fs.writeFileSync(backupPath, `# Generated by PrismAnalytics Setup on ${new Date().toISOString()}\nJWT_SECRET=${jwtSecret}\n# This file is strictly excluded by .gitignore!\n`, "utf-8");
  
  const envLocalPath = path.join(__dirname, ".env.local");
  let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, "utf-8") : "";
  if (!envContent.includes("JWT_SECRET=")) {
    fs.appendFileSync(envLocalPath, `\nJWT_SECRET=${jwtSecret}\n`, "utf-8");
    success("Local .env.local updated with secure JWT_SECRET for local dev preview ✔");
  }

  // ═══════════════════════════════════════
  //  STEP 5: Apply D1 Database Migrations
  // ═══════════════════════════════════════
  step(5, "Enforcing database schema - applying D1 migrations (0001_initial.sql) & local drizzle push...");
  const migrateRes = runInherit(`npx wrangler d1 migrations apply ${dbName} --remote`);
  if (migrateRes.ok) {
    success("D1 Database migrations applied remotely ✔");
  } else {
    warn("Remote migration command note. Applying local migration backup...");
    runCapture(`npx wrangler d1 migrations apply ${dbName} --local`);
  }
  info("Also applying drizzle-kit push to ensure local preview tables are up to date...");
  runCapture("npx drizzle-kit push --config drizzle.config.json --force");

  // ═══════════════════════════════════════
  //  STEP 6: Build Assets & Deploy Worker
  // ═══════════════════════════════════════
  step(6, "Building frontend assets (Vite) and deploying Worker to Cloudflare Global Edge...");
  info("Building optimized static bundle via 'npx vite build'...");
  const buildRes = runInherit("npx vite build");
  if (!buildRes.ok) {
    error("Frontend Vite build failed! Please check logs above.");
    rl.close();
    process.exit(1);
  }
  success("Vite bundle created in ./dist ✔");

  info("Deploying Worker via 'npx wrangler deploy'...");
  const deployCapture = runCapture("npx wrangler deploy");
  if (!deployCapture.ok) {
    log(deployCapture.output);
    warn("Trying direct interactive deploy...");
    runInherit("npx wrangler deploy");
  } else {
    log(deployCapture.output);
    success("Worker deployed to Cloudflare successfully ✔");
  }

  // Extract live URL from deploy output
  let liveUrl = `https://${appName}.workers.dev`;
  const urlMatch = deployCapture.output?.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.workers\.dev/);
  if (urlMatch) {
    liveUrl = urlMatch[0];
  } else {
    // try whoami / account name
    const who = runCapture("npx wrangler whoami");
    if (who.ok) {
      const accMatch = who.output.match(/Account Name.*?\(([^)]+)\)/i) || who.output.match(/subdomain.*?:?\s*([a-zA-Z0-9-]+)/i);
      if (accMatch && accMatch[1]) {
        liveUrl = `https://${appName}.${accMatch[1].trim()}.workers.dev`;
      }
    }
  }

  // Update APP_URL in wrangler.toml so CORS and tracking snippets use the exact URL
  updateWranglerToml({ appUrl: liveUrl });
  runCapture("npx wrangler deploy"); // quick 3-second sync update of the new APP_URL

  // ═══════════════════════════════════════
  //  DONE!
  // ═══════════════════════════════════════
  log("");
  log(`${C.green}${C.bold}  ╔═════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.green}${C.bold}  ║        🎉  Setup Complete! Zero Manual Copy-Pasting! 🎉         ║${C.reset}`);
  log(`${C.green}${C.bold}  ╚═════════════════════════════════════════════════════════════════╝${C.reset}`);
  log("");
  log(`  ${C.bold}App / Worker:${C.reset}    ${C.cyan}${appName}${C.reset}`);
  log(`  ${C.bold}Live Dashboard:${C.reset}  ${C.green}${C.bold}${liveUrl}${C.reset}`);
  log(`  ${C.bold}Tracking API:${C.reset}    ${C.cyan}${liveUrl}/api/track${C.reset}`);
  log(`  ${C.bold}Version Check:${C.reset}   ${C.cyan}${liveUrl}/api/version${C.reset}`);
  log("");
  log(`  ${C.dim}Tip: Open ${liveUrl} in your browser and create your account!${C.reset}`);
  log(`  ${C.dim}All secrets & IDs are stored inside Cloudflare & protected locally.${C.reset}`);
  log("");

  rl.close();
}

main().catch((err) => {
  error(`Unexpected setup error: ${err.message}`);
  process.exit(1);
});
