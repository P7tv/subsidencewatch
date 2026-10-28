// Demo-day server: builds with this machine's LAN address baked in (for the in-app QR code),
// then serves the build to every device on the network.  npm run demo [-- --port 4173]
import { execFileSync, spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const port = process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : "4173";
const lan = Object.values(networkInterfaces())
  .flat()
  .find((a) => a && a.family === "IPv4" && !a.internal)?.address;
const url = lan ? `http://${lan}:${port}/` : "";
execFileSync("npx", ["vite", "build"], { stdio: "inherit", env: { ...process.env, VITE_PUBLIC_URL: url } });
console.log(lan ? `\nPhones on the same network: ${url}  (QR button in the app)\n` : "\nNo LAN address found; phones cannot connect.\n");
spawn("npx", ["vite", "preview", "--host", "0.0.0.0", "--port", port, "--strictPort"], { stdio: "inherit" });
