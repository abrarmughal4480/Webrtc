#!/bin/bash

# Script to check Nginx status and configuration on VPS
# Run this to verify your existing Nginx setup

echo "🔍 Checking Nginx Status and Configuration..."
echo "============================================="

# Check if Nginx is running
echo -e "\n🌐 Nginx Service Status:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

# Check Nginx configuration
echo -e "\n⚙️ Nginx Configuration Test:"
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
fi

# Show enabled sites
echo -e "\n📁 Enabled Nginx Sites:"
ls -la /etc/nginx/sites-enabled/

# Show main Nginx config
echo -e "\n📋 Main Nginx Configuration:"
echo "Main config: /etc/nginx/nginx.conf"

# Check if webrtc site exists
if [ -f "/etc/nginx/sites-available/webrtc" ]; then
    echo -e "\n🎯 WebRTC Nginx Site Found:"
    echo "✅ /etc/nginx/sites-available/webrtc exists"
    
    if [ -L "/etc/nginx/sites-enabled/webrtc" ]; then
        echo "✅ WebRTC site is enabled"
    else
        echo "⚠️  WebRTC site exists but is not enabled"
    fi
else
    echo -e "\n⚠️  No WebRTC Nginx site found"
    echo "Your existing Nginx configuration will be used"
fi

# Show current listening ports
echo -e "\n🔌 Current Listening Ports:"
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3000
netstat -tlnp | grep :4000

# Check PM2 processes
echo -e "\n⚡ PM2 Processes:"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 not installed"
fi

echo -e "\n✅ Nginx check completed!"
echo "Your existing Nginx configuration will NOT be modified by CI/CD"
