// วางที่ /home/syaco/standalone_frontend/hrms-web/ecosystem.config.js บน 186 (ส่งโดย deploy/scripts/ship-web.sh)
// fork mode เสมอ (cluster ทำให้ Next พังบน 186) และ bind 127.0.0.1 ให้ nginx เรียกเท่านั้น
module.exports = {
  apps: [
    {
      name: "hrms-web-4001",
      cwd: "/home/syaco/standalone_frontend/hrms-web/current",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      // 186 RAM น้อย (1.7GB, ว่างราว 200MB): heap สูงสุด 256MB และ pm2 restart อัตโนมัติถ้าเกิน 300MB
      max_memory_restart: "300M",
      node_args: "--max-old-space-size=256",
      env: { NODE_ENV: "production", PORT: 4001, HOSTNAME: "127.0.0.1" },
    },
  ],
};
