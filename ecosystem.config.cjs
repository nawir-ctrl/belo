module.exports = {
  apps: [
    {
      name: "smartbell-web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "smartbell-scheduler",
      script: "node_modules/.bin/tsx",
      args: "src/scheduler/worker.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
