module.exports = {
  apps: [
    {
      name: 'real-time-notification',
      script: 'npm',
      args: 'start',
      out_file: '/var/log/realtime/out.log',
      error_file: '/var/log/realtime/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
    },
  ],
}
