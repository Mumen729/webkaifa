// pm2 process config — run with:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'atlas',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SITE_URL: 'http://154.12.39.187'
        // JWT_SECRET: 'replace-with-a-long-random-string'  (set via server env or .env)
      }
    }
  ]
};
