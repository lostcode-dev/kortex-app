module.exports = {
  apps: [
    {
      name: 'second-brain-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/dev/null',
      out_file: '/dev/null',
      merge_logs: true,
    },
  ],
}
