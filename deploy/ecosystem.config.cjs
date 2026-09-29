// PM2 definition for the RenvoDesk API (docs/API-DEPLOYMENT.md). Copy to
// /opt/renvodesk-api/ecosystem.config.cjs and start it from root's PM2 daemon.
module.exports = {
  apps: [
    {
      name: "renvodesk-api",
      // A symlink to the active release; restarts pick up a switched target.
      cwd: "/opt/renvodesk-api/current",
      script: "dist/server.js",
      interpreter: "/usr/bin/node",
      // Node loads the secrets itself, so they never enter PM2's saved dump.
      node_args: ["--env-file=/etc/renvodesk/api.env"],
      env: { NODE_ENV: "production" },
      // Root's daemon starts the process as this unprivileged user.
      uid: "renvodesk-api",
      gid: "renvodesk-api",
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
