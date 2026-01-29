# LayerAudio - Deployment Guide

## 📦 Quick Start

### Local Development

#### Option 1: Python (Recommended)
```bash
python3 server.py
# Open http://localhost:3000
```

#### Option 2: Node.js
```bash
node server.js
# Open http://localhost:3000
```

#### Option 3: Live Server (VS Code Extension)
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

#### Option 4: Simple HTTP (Python)
```bash
python3 -m http.server 3000
# Open http://localhost:3000
```

#### Option 5: Simple HTTP (PHP)
```bash
php -S localhost:3000
# Open http://localhost:3000
```

---

## 🚀 Production Deployment

### Prerequisites
- Web server (Apache, Nginx, etc.)
- Modern browser support
- HTTPS recommended
- 10 MB disk space minimum

### File Structure
```
/var/www/layeraudio/
├── index.html
├── styles.css
├── app.js
├── server.py (optional)
├── README.md
└── .htaccess (for Apache)
```

### Apache Configuration

#### .htaccess file
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Serve files as-is
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    
    # Route all other requests to index.html
    RewriteRule ^ index.html [QSA,L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Cache control
<FilesMatch "\.(js|css)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

<FilesMatch "\.(html|htm)$">
    Header set Cache-Control "max-age=3600, must-revalidate"
</FilesMatch>
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/layeraudio;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript;

    # Cache control
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(html|htm)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Route all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com

# Update Nginx config with SSL
# Add to server block:
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . .

EXPOSE 3000

CMD ["python3", "server.py"]
```

### Build & Run
```bash
# Build image
docker build -t layeraudio .

# Run container
docker run -p 3000:3000 layeraudio

# Or with docker-compose
docker-compose up
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  layeraudio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PYTHONUNBUFFERED=1
    volumes:
      - .:/app
```

---

## ☁️ Cloud Hosting

### Heroku Deployment

1. **Create Procfile**
```
web: python3 server.py
```

2. **Initialize git repo**
```bash
git init
git add .
git commit -m "Initial commit"
```

3. **Deploy**
```bash
heroku create layeraudio
git push heroku main
```

### Netlify/Vercel (Static Hosting)

1. **Build command**: (none required)
2. **Publish directory**: `/` (root)
3. **Environment variables**: None required

### AWS S3 + CloudFront

```bash
# Upload files
aws s3 cp . s3://layeraudio-bucket/ --recursive

# Create CloudFront distribution
# Point to S3 bucket origin
# Add SSL certificate
```

### Google Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy
```

### DigitalOcean App Platform

1. Create new app
2. Connect GitHub repository
3. Set build command: (none)
4. Set run command: `python3 server.py`
5. Deploy

---

## 🔒 Security Considerations

### CORS Headers
```javascript
// If backend integration needed
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};
```

### Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

### Security Headers
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 📊 Performance Optimization

### Image Compression
- No images in current version
- If adding: Use WebP format
- Optimize with TinyPNG/ImageOptim

### CSS/JS Minification
```bash
# Using cssnano
npm install cssnano

# Using terser
npm install terser
```

### Build Process
```bash
# Create build script
cssnano styles.css -o styles.min.css
terser app.js -o app.min.js
```

### Update HTML
```html
<link rel="stylesheet" href="styles.min.css">
<script src="app.min.js"></script>
```

### Lazy Loading
```javascript
// Already optimized - no external resources
// Audio files loaded on-demand
```

---

## 🧪 Testing Deployment

### Pre-deployment Checklist
- [ ] All files present (index.html, styles.css, app.js)
- [ ] No console errors
- [ ] All features work
- [ ] Responsive design tested
- [ ] Audio file upload works
- [ ] LocalStorage working
- [ ] No CORS issues
- [ ] SSL certificate valid (if HTTPS)

### Browser Testing
```bash
# Test in multiple browsers
- Chrome (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)
```

### Performance Testing
```bash
# Google PageSpeed Insights
https://pagespeed.web.dev/

# GTmetrix
https://gtmetrix.com/

# WebPageTest
https://www.webpagetest.org/
```

---

## 📈 Monitoring & Maintenance

### Error Monitoring
```javascript
// Add error tracking (optional)
window.addEventListener('error', (event) => {
    console.error('Global error:', event);
    // Send to error tracking service
});
```

### Analytics
```html
<!-- Add Google Analytics (optional) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_ID');
</script>
```

### Uptime Monitoring
- Use Pingdom, UptimeRobot, or StatusCake
- Set up alerts for downtime
- Monitor response times

---

## 🔄 Update Process

### Version Updates
1. Backup current files
2. Update files
3. Clear browser cache
4. Test all features
5. Monitor error logs

### Database Backups (Knowledge Base)
```javascript
// Export knowledge base
const kb = localStorage.getItem('layerAudio_knowledgeBase');
console.save(kb, 'knowledge-base.json');

// Import knowledge base
const importedKB = JSON.parse(jsonData);
localStorage.setItem('layerAudio_knowledgeBase', JSON.stringify(importedKB));
```

---

## 🆘 Troubleshooting

### Common Issues

#### Issue: Files not loading
**Solution**: Check MIME types in server config
```apache
AddType text/css .css
AddType application/javascript .js
AddType text/html .html
```

#### Issue: CORS errors
**Solution**: Ensure server sets proper headers or use same-origin requests

#### Issue: LocalStorage not working
**Solution**: 
- Check browser privacy settings
- Not in private/incognito mode
- Domain has permission

#### Issue: Audio files not decoding
**Solution**:
- Ensure browser supports format
- Check file is valid
- Try different format

#### Issue: Slow performance
**Solution**:
- Minify CSS/JS
- Enable gzip compression
- Use CDN for assets
- Reduce file sizes

---

## 📞 Support & Resources

### Documentation
- [Web Audio API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [File API Docs](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [localStorage Docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### Tools
- [Can I Use](https://caniuse.com/) - Browser compatibility
- [Web.dev](https://web.dev/) - Performance tips
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Auditing

---

## 📄 License & Attribution

Original work by Brendan Carell  
FFmpeg copyright holders  
Web version: Complete HTML/CSS/JS implementation

---

**Last Updated**: January 26, 2024  
**Version**: 1.0  
**Status**: Production Ready
