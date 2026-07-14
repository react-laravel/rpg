module.exports = {
  apps: [
    {
      name: 'rpg-nextjs',
      script: 'npm',
      args: 'run start',
      cwd: process.env.PM2_CWD || '/var/www/rpg/current',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
      },
      autorestart: true,
      min_uptime: '20s',
      max_restarts: 5,
      restart_delay: 3000,
      max_memory_restart: '1G',
      error_file: '/var/www/rpg/shared/pm2-error.log',
      out_file: '/var/www/rpg/shared/pm2-out.log',
      combine_logs: true,
    },
  ],
}
