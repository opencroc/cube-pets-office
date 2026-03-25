import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();

function escapeForPowerShell(value) {
  return value.replace(/'/g, "''");
}

async function stopWindowsProjectProcesses() {
  const escapedRoot = escapeForPowerShell(projectRoot);
  const escapedPid = String(process.pid);
  const command = [
    `$root = '${escapedRoot}'`,
    `$selfPid = ${escapedPid}`,
    `$processes = Get-CimInstance Win32_Process | Where-Object {`,
    `  $_.Name -eq 'node.exe' -and`,
    `  $_.ProcessId -ne $selfPid -and`,
    `  $_.CommandLine -like "*$root*"`,
    `}`,
    `if (-not $processes) {`,
    `  Write-Output 'No project dev processes found.'`,
    `  exit 0`,
    `}`,
    `$processes | ForEach-Object {`,
    `  Stop-Process -Id $_.ProcessId -Force`,
    `  Write-Output ("Stopped PID {0}" -f $_.ProcessId)`,
    `}`,
  ].join("\n");

  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: projectRoot,
  });

  process.stdout.write(stdout);
}

async function stopUnixProjectProcesses() {
  const { stdout } = await execFileAsync("ps", ["-ax", "-o", "pid=,command="], {
    cwd: projectRoot,
  });

  const targets = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);
      if (!match) return null;
      return { pid: Number(match[1]), command: match[2] };
    })
    .filter((entry) => entry && entry.pid !== process.pid && entry.command.includes(projectRoot) && entry.command.includes("node"));

  if (!targets.length) {
    console.log("No project dev processes found.");
    return;
  }

  for (const target of targets) {
    process.kill(target.pid, "SIGTERM");
    console.log(`Stopped PID ${target.pid}`);
  }
}

if (process.platform === "win32") {
  await stopWindowsProjectProcesses();
} else {
  await stopUnixProjectProcesses();
}
