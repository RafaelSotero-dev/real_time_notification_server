module.exports = {
  apps: [
    {
      name: 'real-time-notification',
      script: 'index.js',
      interpreter: 'node',
      args: 'run start',
      out_file: '/var/log/realtime/out.log',
      error_file: '/var/log/realtime/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
      env: {
        PORT: 3000,
        FRONTENDURL: process.env.FRONTENDURL || 'http://localhost:5500',
      },
    },
  ],
}
