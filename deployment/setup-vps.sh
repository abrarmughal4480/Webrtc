#!/bin/bash

# WebRTC VPS Setup Script for Hostinger
# Run this script as root or with sudo privileges

set -e

echo "🚀 Starting WebRTC VPS setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 20.x
echo "📱 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
echo "⚡ Installing PM2..."
npm install -g pm2

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
echo "🔒 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Install Redis (if needed)
echo "🔴 Installing Redis..."
apt install -y redis-server

# Install MongoDB (if hosting locally)
echo "🍃 Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod

# Start and enable Redis
systemctl start redis-server
systemctl enable redis-server

# Create application directories
echo "📁 Creating application directories..."
mkdir -p ~/webrtc-backend
mkdir -p ~/webrtc-frontend
mkdir -p ~/backups
mkdir -p ~/logs

# Set up Nginx configuration
echo "⚙️ Setting up Nginx configuration..."
cp nginx.conf /etc/nginx/sites-available/webrtc

# Enable the site
ln -sf /etc/nginx/sites-available/webrtc /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 4000
ufw --force enable

# Set up PM2 startup script
echo "🚀 Setting up PM2 startup..."
pm2 startup

# Create environment file template
echo "📝 Creating environment file template..."
cat > ~/webrtc-backend/.env.template << EOF
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://localhost:27017/webrtc
JWT_SECRET=your_jwt_secret_here
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
FRONTEND_URL=https://your-domain.com
EOF

# Create deployment script
echo "📜 Creating deployment script..."
cat > ~/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for WebRTC application

echo "🚀 Starting deployment..."

# Check if deployment package exists
if [ ! -f "~/webrtc-backend/backend-deploy.tar.gz" ] && [ ! -f "~/webrtc-frontend/frontend-deploy.tar.gz" ]; then
    echo "❌ No deployment package found!"
    exit 1
fi

# Deploy backend if package exists
if [ -f "~/webrtc-backend/backend-deploy.tar.gz" ]; then
    echo "📦 Deploying backend..."
    cd ~/webrtc-backend
    
    # Stop current process
            if pm2 list | grep -q "videodesk-backend"; then
            pm2 stop videodesk-backend
            pm2 delete videodesk-backend
        fi
    
    # Extract and setup
    tar -xzf backend-deploy.tar.gz
    rm backend-deploy.tar.gz
    npm ci --production
    
            # Start with PM2
        pm2 start index.js --name "videodesk-backend" --max-memory-restart 512M
        pm2 save
fi

# Deploy frontend if package exists
if [ -f "~/webrtc-frontend/frontend-deploy.tar.gz" ]; then
    echo "🌐 Deploying frontend..."
    cd ~/webrtc-frontend
    
    # Stop current process
    if pm2 list | grep -q "webrtc-frontend"; then
        pm2 stop webrtc-frontend
        pm2 delete webrtc-frontend
    fi
    
    # Extract and setup
    tar -xzf frontend-deploy.tar.gz
    rm frontend-deploy.tar.gz
    npm ci --production
    
    # Start with PM2
    pm2 start npm --name "webrtc-frontend" -- start
    pm2 save
fi

echo "✅ Deployment completed successfully!"
pm2 list
EOF

chmod +x ~/deploy.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > ~/monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for WebRTC application

echo "📊 WebRTC Application Status"
echo "============================"

echo -e "\n🔧 PM2 Processes:"
pm2 list

echo -e "\n🌐 Nginx Status:"
systemctl status nginx --no-pager -l

echo -e "\n🍃 MongoDB Status:"
systemctl status mongod --no-pager -l

echo -e "\n🔴 Redis Status:"
systemctl status redis-server --no-pager -l

echo -e "\n💾 Disk Usage:"
df -h

echo -e "\n🧠 Memory Usage:"
free -h

echo -e "\n🔥 System Load:"
uptime
EOF

chmod +x ~/monitor.sh

# Create backup script
echo "💾 Creating backup script..."
cat > ~/backup.sh << 'EOF'
#!/bin/bash

# Backup script for WebRTC application

BACKUP_DIR=~/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "💾 Creating backup in $BACKUP_DIR..."

# Backup backend
if [ -d ~/webrtc-backend ]; then
    cp -r ~/webrtc-backend $BACKUP_DIR/
    echo "✅ Backend backed up"
fi

# Backup frontend
if [ -d ~/webrtc-frontend ]; then
    cp -r ~/webrtc-frontend $BACKUP_DIR/
    echo "✅ Frontend backed up"
fi

# Backup MongoDB
if command -v mongodump &> /dev/null; then
    mongodump --out $BACKUP_DIR/mongodb
    echo "✅ MongoDB backed up"
fi

# Clean old backups (keep last 10)
cd ~/backups
ls -t | tail -n +11 | xargs -r rm -rf

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR"
EOF

chmod +x ~/backup.sh

# Set up log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/webrtc << EOF
~/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo "🎉 VPS setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your domain DNS to point to this server"
echo "2. Run: sudo certbot --nginx -d your-domain.com"
echo "3. Update the .env files with your actual credentials"
echo "4. Set up GitHub Actions secrets"
echo "5. Push to main branch to trigger deployment"
echo ""
echo "🔧 Useful commands:"
echo "- Monitor: ~/monitor.sh"
echo "- Backup: ~/backup.sh"
echo "- Deploy: ~/deploy.sh"
echo "- PM2 status: pm2 list"
echo "- Nginx status: systemctl status nginx"
