import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

function run(name, command, extraEnv = {}) {
  const child = spawn(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${name}] exited with ${reason}`);
    shutdown(code ?? 1);
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("server", "npm run dev:server", { PORT: "3001" });
run("client", "npm run dev");
