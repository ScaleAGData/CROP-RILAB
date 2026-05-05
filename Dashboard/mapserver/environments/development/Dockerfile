# Use the official MapServer image with CGI support
FROM camptocamp/mapserver:7.6

# Install additional tools for raster processing and web server
USER root
RUN apt-get update && apt-get install -y \
    gdal-bin \
    python3-gdal \
    lighttpd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories with proper permissions
RUN mkdir -p /etc/lighttpd \
             /var/www/html/cgi-bin \
             /data/tifs \
             /tmp/ms_tmp \
             /var/log/lighttpd && \
    chown -R www-data:www-data /var/www/html /tmp /var/log/lighttpd /data && \
    chmod -R 755 /var/www/html

# Find and set up MapServer CGI
RUN MAPSERV_PATH=$(find /usr -name mapserv -type f 2>/dev/null | head -1) && \
    if [ -z "$MAPSERV_PATH" ]; then \
        echo "MapServer binary not found, trying common locations..." && \
        MAPSERV_PATH="/usr/lib/cgi-bin/mapserv"; \
    fi && \
    echo "Using MapServer binary at: $MAPSERV_PATH" && \
    cp "$MAPSERV_PATH" /var/www/html/cgi-bin/mapserv && \
    chmod 755 /var/www/html/cgi-bin/mapserv && \
    chown www-data:www-data /var/www/html/cgi-bin/mapserv

# Copy configuration and data
WORKDIR /data

# Copy configuration and data from shared folder (using project root as build context)
COPY shared/tifs/ /data/tifs/
COPY shared/mapfile.map /data/mapfile.map
COPY environments/development/start.sh /start.sh

# Fix line endings and make start script executable (without dos2unix)
RUN sed -i 's/\r$//' /start.sh && \
    chmod +x /start.sh

# Set proper permissions for data files
RUN chown -R www-data:www-data /data && \
    chmod -R 755 /data/tifs && \
    chmod 644 /data/mapfile.map

# Expose port
EXPOSE 8080

# Set environment variables
ENV MS_MAPFILE=/data/mapfile.map \
    MS_MAP_NO_PATH=0 \
    MS_ERRORFILE=/tmp/ms_error.txt \
    MS_DEBUGLEVEL=5 \
    MS_MODE=map \
    PROJ_LIB=/usr/share/proj

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/cgi-bin/mapserv?SERVICE=WMS&REQUEST=GetCapabilities || exit 1

# Start the server
CMD ["/start.sh"]