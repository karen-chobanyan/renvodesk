// PM2 definition for the RenvoDesk API (docs/API-DEPLOYMENT.md). Copy to
// /opt/renvodesk-api/ecosystem.config.cjs and start it from root's PM2 daemon.
//
// PM2's own `uid` option cannot be used on this host: the daemon is installed
// under /root/.nvm, and its fork wrapper is unreadable to other users. Instead
// PM2 runs `setpriv` as root, which drops to the unprivileged user and then
// execs Node — the PID stays the same, so PM2 signals and monitors Node.
module.exports = {
  apps: [
    {
      name: "renvodesk-api",
      // A symlink to the active release; restarts pick up a switched target.
      cwd: "/opt/renvodesk-api/current",
      script: "/usr/bin/setpriv",
      interpreter: "none",
      args: [
        "--reuid=renvodesk-api",
        "--regid=renvodesk-api",
        "--init-groups",
        "--no-new-privs",
        "--",
        "/usr/bin/node",
        // Node reads secrets itself (after dropping privileges), so they never
        // enter PM2's saved dump.
        "--env-file=/etc/renvodesk/api.env",
        "dist/server.js",
      ],
      env: { NODE_ENV: "production" },
      // Exactly one process: AI jobs run in-process (decision 030, D2).
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      // Running AI jobs stop with the process; their lease then expires and
      // owners see a retryable failure.
      kill_timeout: 30000,
      out_file: "/var/log/renvodesk-api/out.log",
      error_file: "/var/log/renvodesk-api/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
