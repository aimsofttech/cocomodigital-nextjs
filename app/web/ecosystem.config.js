module.exports = {
  apps: [
    {
      name: "cocomadigital",
      cwd: "/www/wwwroot/cocomadigital.com",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3002",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
