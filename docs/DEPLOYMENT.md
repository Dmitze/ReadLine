# 🚀 ReadLine Deployment Guide

**Production deployment instructions for ReadLine Telegram Bot**

---

## 📋 Deployment Options

1. [Docker](#docker-deployment)
2. [PM2](#pm2-deployment)
3. [Systemd](#systemd-deployment)
4. [Cloud Platforms](#cloud-platforms)

---

## 🐳 Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (if using REST API)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start bot
CMD ["npm", "start"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  bot:
    build: .
    environment:
      BOT_TOKEN: ${BOT_TOKEN}
      ADMIN_ID: ${ADMIN_ID}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:
```

### Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop
docker-compose down
```

---

## ⚙️ PM2 Deployment

### Install PM2

```bash
npm install -g pm2
```

### Create ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'readline-bot',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    max_memory_restart: '500M',
    watch: false
  }]
};
```

### Deploy

```bash
# Start
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs readline-bot

# Restart
pm2 restart readline-bot

# Stop
pm2 stop readline-bot

# Save startup config
pm2 startup
pm2 save
```

---

## 🔧 Systemd Deployment

### Create Service File

`/etc/systemd/system/readline-bot.service`:

```ini
[Unit]
Description=ReadLine Telegram Bot
After=network.target redis.service

[Service]
Type=simple
User=readline
WorkingDirectory=/opt/readline
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=readline-bot

Environment=NODE_ENV=production
EnvironmentFile=/opt/readline/.env

[Install]
WantedBy=multi-user.target
```

### Deploy

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start readline-bot

# Enable auto-start
sudo systemctl enable readline-bot

# Check status
sudo systemctl status readline-bot

# View logs
sudo journalctl -u readline-bot -f
```

---

## ☁️ Cloud Platforms

### Heroku

1. Create `Procfile`:
```
web: npm start
```

2. Deploy:
```bash
heroku create readline-bot
heroku config:set BOT_TOKEN=your_token
heroku config:set ADMIN_ID=your_id
git push heroku main
```

### Railway

1. Connect GitHub repo
2. Add environment variables
3. Deploy automatically

### DigitalOcean

1. Create Droplet (Ubuntu 22.04)
2. Install dependencies
3. Use PM2 or Docker
4. Configure firewall

### AWS

1. **EC2:** Use Ubuntu + PM2
2. **ECS:** Use Docker container
3. **Lambda:** Use serverless framework

---

## 📊 Monitoring

### Prometheus + Grafana

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'readline-bot'
    static_configs:
      - targets: ['localhost:3000']
```

### Logs

Use **Winston** or **Pino**:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 🔒 Security Checklist

Before deployment:

- [ ] Change all default passwords
- [ ] Enable HTTPS for REST API
- [ ] Configure firewall (allow only 443, 80, 22)
- [ ] Set up automatic backups
- [ ] Enable rate limiting
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Test disaster recovery

---

*Last updated: 2025-11-15*
