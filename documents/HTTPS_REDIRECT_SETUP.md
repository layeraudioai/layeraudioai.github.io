# HTTPS Redirect Setup Guide for layai.ca

## Summary of Changes

Your `index.html` already had an HTTP-to-HTTPS redirect, but it only works AFTER the page loads. This guide implements proper **server-side** redirects that work immediately, before any page content is downloaded.

---

## What Was Updated

### 1. **server.py** (Enhanced)
- Updated the Python development server to handle HTTPS redirects more robustly
- Added HSTS (HTTP Strict Transport Security) headers
- Added security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 2. **.htaccess** (New - Apache)
- Creates HTTP → HTTPS redirect at the server level
- Only affects non-localhost requests
- Sets HSTS header to 1 year
- Includes all security headers

### 3. **nginx-layai.conf** (New - Nginx)
- Complete production Nginx configuration
- Separate server blocks for HTTP (port 80) and HTTPS (port 443)
- HTTP automatically redirects to HTTPS
- Includes SSL/TLS configuration
- HSTS preload support

### 4. **index.html** (Improved)
- Enhanced client-side redirect for additional fallback protection
- Now explicitly checks for production domains
- Better error handling

---

## Deployment Instructions

### For Apache Web Hosting

1. **Copy `.htaccess` to your web root:**
   ```bash
   cp .htaccess /var/www/layai/.htaccess
   ```

2. **Ensure Apache modules are enabled:**
   ```bash
   sudo a2enmod rewrite
   sudo a2enmod headers
   ```

3. **Restart Apache:**
   ```bash
   sudo systemctl restart apache2
   ```

4. **Verify HTTPS certificate is installed:**
   - Certificate path: `/etc/letsencrypt/live/layai.ca/`
   - Set up with Let's Encrypt Certbot (see Certbot section below)

---

### For Nginx Web Hosting

1. **Copy Nginx config:**
   ```bash
   sudo cp nginx-layai.conf /etc/nginx/sites-available/layai
   ```

2. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/layai /etc/nginx/sites-enabled/
   ```

3. **Test Nginx config:**
   ```bash
   sudo nginx -t
   ```

4. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

5. **Set up HTTPS certificate:**
   - Use Let's Encrypt (see Certbot section below)
   - Certificate paths in config: `/etc/letsencrypt/live/layai.ca/`

---

### For Python Development Server

1. **Run the updated server:**
   ```bash
   python3 server.py
   ```

2. **Note:** The dev server cannot enforce real HTTPS redirects (no SSL cert), but it:
   - Checks for X-Forwarded-Proto header (used by reverse proxies)
   - Falls back to client-side redirect in index.html
   - Good for testing in development

---

### Setting Up SSL/TLS Certificate with Let's Encrypt (Required for HTTPS)

#### For Apache:
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-apache

# Generate and install certificate
sudo certbot --apache -d layai.ca -d www.layai.ca

# Auto-renewal (runs automatically)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### For Nginx:
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d layai.ca -d www.layai.ca

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### Manual Renewal:
```bash
sudo certbot renew
```

---

## DNS/Domain Configuration

### Point layai.ca to Your Server

1. **Log into your domain registrar** (Bitbucket, Namecheap, GoDaddy, etc.)

2. **Update DNS A Record:**
   - Type: A
   - Name: @ (or layai.ca)
   - Value: Your server's IP address
   - TTL: 3600 (1 hour)

3. **Update www subdomain (optional):**
   - Type: A
   - Name: www
   - Value: Your server's IP address
   - TTL: 3600

4. **Wait for DNS propagation** (5-30 minutes typically)

5. **Verify DNS resolution:**
   ```bash
   nslookup layai.ca
   # Should return your server's IP
   ```

---

## How HTTPS Redirect Works Now

### With Proper Server Configuration:

1. User visits: `http://layai.ca/page`
2. Server receives HTTP request on port 80
3. Server immediately responds with **301 Moved Permanently**
4. Response includes header: `Location: https://layai.ca/page`
5. Browser automatically follows redirect to HTTPS
6. User sees secure HTTPS URL

### Fallback (Client-Side):

If server-side redirect fails, the JavaScript in `index.html` will redirect after page load.

---

## Testing HTTPS Redirect

### From Command Line:

```bash
# Test HTTP redirect
curl -I http://layai.ca
# Should see: HTTP/1.1 301 Moved Permanently
# Location: https://layai.ca/

# Test HTTPS works
curl -I https://layai.ca
# Should see: HTTP/2 200 OK
```

### Browser Test:

1. Visit `http://layai.ca` in browser
2. Should automatically redirect to `https://layai.ca`
3. Check browser address bar shows HTTPS
4. Check for green padlock icon

---

## HSTS (HTTP Strict Transport Security)

Your configuration includes HSTS with preload. This tells browsers:
- "Always use HTTPS for this domain"
- "Duration: 1 year"
- "Include subdomains"
- "Preload" means it's in the browser's hardcoded HSTS preload list

**Benefits:**
- Prevents man-in-the-middle attacks
- Eliminates initial HTTP request entirely after first visit
- Browsers cache the policy for 1 year

**Preload list:**
- Included in Chrome, Firefox, Safari, Edge
- Submitted to https://hstspreload.org/
- One-time process

---

## Security Headers Included

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Force HTTPS for 1 year |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | Legacy XSS protection |
| `Content-Security-Policy` | Control resource origins |
| `Referrer-Policy` | Control referrer info |

---

## Troubleshooting

### Certificate Not Found Error

**Problem:** "Cannot find certificate at /etc/letsencrypt/live/layai.ca/"

**Solution:**
```bash
# Run Certbot to create certificate
sudo certbot certonly --standalone -d layai.ca

# Or if using Apache:
sudo certbot --apache -d layai.ca

# Or if using Nginx:
sudo certbot --nginx -d layai.ca
```

### Still getting HTTP (not redirecting)

1. **Clear browser cache:**
   ```
   Ctrl+Shift+Delete (most browsers)
   ```

2. **Check server is running:**
   ```bash
   # Apache
   sudo systemctl status apache2
   
   # Nginx
   sudo systemctl status nginx
   ```

3. **Check firewall allows ports 80 and 443:**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

4. **Verify DNS points to correct server:**
   ```bash
   nslookup layai.ca
   ```

### Mixed Content Warning

If you see "Not Secure" despite HTTPS:
- Check all resource links in HTML (styles.css, app.js)
- Ensure they use relative paths: `<link href="styles.css">`
- NOT absolute HTTP: `<link href="http://...">`

**Your HTML is already correct - all resources are relative paths!**

---

## Verification Checklist

- [ ] DNS A record points to your server IP
- [ ] Port 80 and 443 are open in firewall
- [ ] SSL certificate installed (`/etc/letsencrypt/live/layai.ca/`)
- [ ] Web server restarted after config changes
- [ ] `http://layai.ca` redirects to `https://layai.ca`
- [ ] No mixed content warnings in browser console
- [ ] HSTS header present in response
- [ ] Green padlock shows in browser

---

## Quick Test Command

Test your HTTPS redirect in one command:
```bash
curl -I http://layai.ca -L | head -20
```

This should:
1. Follow redirect (-L flag)
2. Show final HTTPS connection
3. Display 200 OK status
4. Show Strict-Transport-Security header

---

## Need More Help?

- **HTTPS Issues:** Use https://www.ssllabs.com/ssltest/
- **DNS Check:** Use https://mxtoolbox.com/
- **Headers Check:** Use https://securityheaders.com/
- **Page Speed:** Use https://pagespeed.web.dev/

---

**Last Updated:** February 4, 2026  
**Configuration Version:** 2.0  
**Status:** Production Ready
