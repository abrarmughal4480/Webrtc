#!/bin/bash

# Simple script to update existing webrtc-main folder on VPS
# Run this on your VPS to prepare it for CI/CD

echo "🚀 Preparing existing webrtc-main folder for CI/CD..."

# Navigate to existing directory
cd ~/webrtc-main

# Create backup directory
mkdir -p ~/backups

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📱 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies for backend
if [ -d "backend" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm ci --production
    cd ..
fi

# Install dependencies for frontend
if [ -d "webrtc-share" ]; then
    echo "🌐 Installing frontend dependencies..."
    cd webrtc-share
    npm ci --production
    cd ..
fi

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 ecosystem file..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
              name: 'videodesk-backend',
      script: './backend/index.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'webrtc-frontend',
      script: 'npm',
      args: 'start',
      cwd: './webrtc-share',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start applications with PM2
echo "🚀 Starting applications with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 startup
pm2 startup

echo "✅ VPS setup completed!"
echo ""
echo "🔧 Your applications are now running with PM2:"
pm2 list
echo ""
echo "📋 Next steps:"
echo "1. Set up GitHub Actions secrets"
echo "2. Push to main branch to trigger auto-deployment"
echo "3. Your webrtc-main folder will be automatically updated"
