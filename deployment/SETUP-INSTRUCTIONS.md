# WebRTC CI/CD Setup Guide for Existing VPS

## 🚀 Quick Setup (3 minutes) - Nginx Safe

### 1. On Your VPS (webrtc-main folder)
```bash
# Navigate to your existing folder
cd ~/webrtc-main

# Check your current Nginx setup (optional)
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deployment/check-nginx-status.sh
chmod +x check-nginx-status.sh
./check-nginx-status.sh

# Download and run the setup script
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deployment/update-existing-vps.sh
chmod +x update-existing-vps.sh
./update-existing-vps.sh
```

### 2. On GitHub Repository
Go to your repository → Settings → Secrets and variables → Actions

Add only these 4 secrets:

#### Required Secrets:
```
HOSTINGER_HOST=your_vps_ip_address
HOSTINGER_USERNAME=your_vps_username
HOSTINGER_SSH_KEY=your_private_ssh_key
HOSTINGER_PORT=22
```

#### Required Secrets (Only these are needed):
```
HOSTINGER_HOST=your_vps_ip_address
HOSTINGER_USERNAME=your_vps_username
HOSTINGER_SSH_KEY=your_private_ssh_key
HOSTINGER_PORT=22
```

**Note:** Your existing `.env` and `.env.local` files will be preserved and not overwritten.

## 🔄 How It Works

1. **You commit and push to GitHub** (main branch)
2. **GitHub Actions automatically:**
   - Tests your code
   - Builds the application
   - Deploys to your existing `~/webrtc-main` folder
   - Restarts the applications with PM2
   - **Does NOT touch your Nginx configuration or domains**

## 📁 VPS Folder Structure
```
~/webrtc-main/
├── backend/          # Your backend code
├── webrtc-share/     # Your frontend code
├── ecosystem.config.js # PM2 configuration
└── backups/          # Automatic backups
```

## 🛠️ Useful Commands on VPS

```bash
# Check application status
pm2 list

# View logs
pm2 logs videodesk-backend
pm2 logs webrtc-frontend

# Restart applications
pm2 restart all

# Monitor resources
pm2 monit

# Check if apps are running
curl http://localhost:3000  # Frontend
curl http://localhost:4000  # Backend
```

## 🔧 Troubleshooting

### If deployment fails:
```bash
# Check PM2 status
pm2 list

# Check logs
pm2 logs

# Manual restart
pm2 restart all

# Check if ports are in use
netstat -tlnp | grep :3000
netstat -tlnp | grep :4000
```

### If you need to update manually:
```bash
cd ~/webrtc-main
git pull origin main
pm2 restart all
```

## ✅ What Happens After Setup

1. **Automatic Deployment**: Every push to main branch triggers deployment
2. **Zero Downtime**: PM2 handles restarts smoothly
3. **Automatic Backups**: Previous versions are backed up before updates
4. **Health Monitoring**: PM2 monitors and restarts crashed applications
5. **Log Management**: All logs are managed and rotated automatically
6. **Nginx Safe**: Your existing domains and Nginx config remain untouched

## 🎯 Next Steps

1. Run the setup script on your VPS
2. Add GitHub secrets
3. Push to main branch
4. Watch the magic happen! 🚀

Your `webrtc-main` folder will now automatically update every time you push to GitHub!

## 🛡️ Nginx Safety Guarantee

- ✅ **Your existing domains stay the same**
- ✅ **Your Nginx configuration is NOT modified**
- ✅ **Your SSL certificates remain untouched**
- ✅ **Only your application code gets updated**
- ✅ **PM2 manages the processes, Nginx serves the traffic**

The CI/CD pipeline only updates your application code and restarts it with PM2. Your Nginx setup, domains, and SSL certificates remain completely unchanged.
