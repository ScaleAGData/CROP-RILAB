#!/bin/bash

echo "Starting MapServer..."

# Create necessary directories
mkdir -p /tmp/ms_tmp /var/log/lighttpd
chown -R www-data:www-data /tmp/ms_tmp /data /var/www/html /var/log/lighttpd
chmod -R 755 /tmp/ms_tmp /data/tifs /var/www/html/cgi-bin
chmod 644 "${MS_MAPFILE}"
chmod 755 /var/www/html/cgi-bin/mapserv

# Check SSL certificates
SSL_ENABLED=false
if [ -f "/etc/ssl/ssl.cert" ] && [ -f "/etc/ssl/ssl.key" ]; then
    echo "SSL certificates found - enabling HTTPS"
    SSL_ENABLED=true
else
    echo "SSL certificates not found - running HTTP only"
fi

# Set CORS origin (default to * if not set)
CORS_ORIGIN_VALUE="${CORS_ORIGIN:-*}"

# Create minimal lighttpd configuration
LIGHTTPD_CONF="/tmp/lighttpd.conf"

cat > "$LIGHTTPD_CONF" << EOF
server.modules = ( "mod_cgi", "mod_accesslog", "mod_setenv" )
server.document-root = "/var/www/html"
server.port = 8080
server.bind = "0.0.0.0"
server.pid-file = "/tmp/lighttpd.pid"

cgi.assign = ( "/cgi-bin/mapserv" => "/var/www/html/cgi-bin/mapserv" )

server.errorlog = "/var/log/lighttpd/error.log"
accesslog.filename = "/var/log/lighttpd/access.log"

# CORS headers for all requests
setenv.add-response-header = (
    "Access-Control-Allow-Origin" => "$CORS_ORIGIN_VALUE",
    "Access-Control-Allow-Methods" => "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers" => "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age" => "86400"
)

# Handle preflight OPTIONS requests
\$HTTP["request-method"] == "OPTIONS" {
    url.access-deny = ( "" )
}

mimetype.assign = (
    ".html" => "text/html",
    ".xml" => "text/xml",
    ".png" => "image/png",
    ".jpg" => "image/jpeg",
    ".gif" => "image/gif",
    ".css" => "text/css",
    ".js" => "application/javascript"
)
EOF

# Add SSL if certificates exist
if [ "$SSL_ENABLED" = true ]; then
    cat >> "$LIGHTTPD_CONF" << EOF

\$SERVER["socket"] == ":8080" {
    ssl.engine = "enable"
    ssl.pemfile = "/etc/ssl/ssl.cert"
    ssl.privkey = "/etc/ssl/ssl.key"
}
EOF
    echo "HTTPS enabled on port 8080"
else
    echo "HTTP only on port 8080"
fi

# Test and start lighttpd
echo "Testing configuration..."
lighttpd -t -f "$LIGHTTPD_CONF"

if [ $? -ne 0 ]; then
    echo "Configuration test failed!"
    exit 1
fi

echo "Starting lighttpd..."
exec lighttpd -f "$LIGHTTPD_CONF" -D