#!/bin/bash

# Start script for MapServer Docker container

echo "Starting MapServer..."

# Create necessary directories
mkdir -p /tmp/ms_tmp
mkdir -p /var/log/lighttpd

# Set proper permissions
chown -R www-data:www-data /tmp/ms_tmp /data /var/www/html /var/log/lighttpd
chmod -R 755 /tmp/ms_tmp /data/tifs /var/www/html/cgi-bin
chmod 644 "${MS_MAPFILE}"

# Check if any TIFF files exist
if [ -z "$(ls -A /data/tifs/*.tif 2>/dev/null)" ]; then
    echo "Warning: No TIFF files found in /data/tifs/"
    echo "Please mount your TIFF files to /data/tifs/"
else
    echo "Found TIFF files in /data/tifs/"
    ls -l /data/tifs/
fi

echo "MapServer configuration:"
echo "- Mapfile: ${MS_MAPFILE}"
echo "- TIFF directory: /daata/tifs/"
echo "- Server URL: http://localhost:8080/cgi-bin/mapserv"

# Ensure mapserv is executable and in the correct location
chmod 755 /var/www/html/cgi-bin/mapserv

# Configure lighttpd
cat > /etc/lighttpd/lighttpd.conf << 'EOF'
server.modules = (
    "mod_cgi",
    "mod_accesslog",
    "mod_alias",
    "mod_setenv"
)

server.document-root = "/var/www/html"
server.port = 8080
server.bind = "0.0.0.0"
server.username = "www-data"
server.groupname = "www-data"

# CORS headers
setenv.add-response-header = (
    "Access-Control-Allow-Origin" => "*",
    "Access-Control-Allow-Methods" => "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers" => "Origin, X-Requested-With, Content-Type, Accept"
)

# CGI configuration
cgi.assign = ( 
    "" => "/var/www/html/cgi-bin/mapserv"
)

alias.url = ( "/ms_tmp/" => "/tmp/ms_tmp/" )

server.errorlog = "/var/log/lighttpd/error.log"
accesslog.filename = "/var/log/lighttpd/access.log"

# MIME types
mimetype.assign = (
    ".html" => "text/html",
    ".txt" => "text/plain",
    ".jpg" => "image/jpeg",
    ".png" => "image/png",
    ".tif" => "image/tiff",
    ".xml" => "text/xml"
)
EOF

# Test MapServer
echo "Testing MapServer configuration..."
/var/www/html/cgi-bin/mapserv -v

# Start lighttpd
echo "Starting lighttpd web server..."
lighttpd -f /etc/lighttpd/lighttpd.conf -D