const { spawn } = require("child_process");

const isDev = process.argv.includes("--dev");

console.log("==================================================");
console.log(`🚀 MEMULAI SMARTBELL LOCAL (${isDev ? "MODE PENGEMBANGAN" : "MODE PRODUKSI"})`);
console.log("==================================================");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

const webArgs = isDev ? ["run", "dev"] : ["run", "start"];
const schedulerArgs = ["tsx", "src/scheduler/worker.ts"];

const webProcess = spawn(npmCmd, webArgs, {
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

const schedulerProcess = spawn(npxCmd, schedulerArgs, {
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

let isShuttingDown = false;
function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n🛑 Mematikan semua proses SmartBell Local...");
  try {
    webProcess.kill();
  } catch {}
  try {
    schedulerProcess.kill();
  } catch {}
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

webProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.log(`[WEB] Server web berhenti dengan kode: ${code}`);
  }
  cleanup();
});

schedulerProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.log(`[SCHEDULER] Background worker berhenti dengan kode: ${code}`);
  }
  cleanup();
});
