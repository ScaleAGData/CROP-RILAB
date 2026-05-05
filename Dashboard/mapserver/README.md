# MapServer TIFF Viewer

A simple web-based viewer for TIFF files using MapServer WMS capabilities.

## Overview

This project provides a web interface to view TIFF files through MapServer's WMS service. It uses:
- MapServer (running in Docker) for TIFF processing
- Lighttpd as the web server
- Leaflet.js for the web map interface

## System Architecture

```
+-------------+     +-----------------+     +-------------+
|  Web Browser | -1-> |    Lighttpd     | -2-> |  MapServer  |
|  (Leaflet)  | <-5- |  (Web Server)   | <-4- |  (Docker)   |
+-------------+     +-----------------+     +-------------+
    ^   ^                   ^                     |
    |   |                   |                     3
    |   |           +----------------+            |
    6   7           |  HTML/JS/CSS   |     +--------------+
    |   |           |  (Web Files)   |     | mapfile.map  |
    |   +---------> |  index.html    |     | TIFF Files   |
    +------------------------------------ +--------------+
                    +----------------+    
```

### Request Flow Numbers

1. Browser sends WMS request to Lighttpd
   ```
   http://localhost:8080/cgi-bin/mapserv?map=/data/mapfile.map&SERVICE=WMS&REQUEST=GetCapabilities
   ```

2. Lighttpd forwards to MapServer binary

3. MapServer reads configuration and data
   - Reads mapfile.map for layer configuration
   - Reads requested TIFF file based on request parameters
   - Processes data according to WMS request

4. MapServer returns rendered tiles to Lighttpd

5. Lighttpd sends tiles to browser

6. Browser (Leaflet) displays tiles

7. User interacts with map

### Test URLs

1. **GetCapabilities**:
```
http://localhost:8080/cgi-bin/mapserv?map=/data/mapfile.map&SERVICE=WMS&REQUEST=GetCapabilities
```

2. **GetMap Example**:
```
http://localhost:8080/cgi-bin/mapserv?map=/data/mapfile.map&SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=tiff_layer&CRS=EPSG:4326&BBOX=51.8039560,4.9957110,51.9354693,5.4152242&WIDTH=512&HEIGHT=512&FORMAT=image/png
```

3. **Test Single TIFF**:
```
http://localhost:8080/cgi-bin/mapserv?map=/data/mapfile.map&SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=tiff_layer&CRS=EPSG:4326&BBOX=51.8039560,4.9957110,51.9354693,5.4152242&WIDTH=512&HEIGHT=512&FORMAT=image/png&TIFF_NAME=TC16_ROI.tif
```

### Component Roles

1. **Lighttpd**:
   - Serves static files (index.html, js, css)
   - Forwards WMS requests to MapServer
   - Running on port 8080

2. **MapServer**:
   - Runs in Docker container
   - Processes WMS requests
   - Reads TIFF files and generates tiles
   - Uses mapfile.map for configuration

3. **Browser/Leaflet**:
   - Makes WMS requests
   - Handles user interaction
   - Displays map tiles
   - Manages TIFF layer selection

## Setup Requirements

1. Docker installation
2. MapServer Docker image
3. Lighttpd web server
4. TIFF files in the `/data/tif` directory

## Directory Structure

```
mapserver-tiff-viewer/
├── index.html          # Web interface
├── tif/               # TIFF files directory
├── logs/              # MapServer logs
└── mapfile.map        # MapServer configuration
```

## How It Works

1. **MapServer**:
   - Runs in a Docker container
   - Uses mapfile.map to process TIFF requests
   - Serves TIFF data as WMS layers

2. **Data Flow**:
   - User selects a TIFF from the dropdown
   - Browser sends WMS requests to MapServer
   - MapServer processes the TIFF and returns map tiles
   - Leaflet displays the tiles on the map

## Configuration

1. **MapServer Docker**:
   ```bash
   docker run -p 8080:80 -v /path/to/data:/data camptocamp/mapserver:latest
   ```

2. **Mapfile Configuration**:
   - Located at `/data/mapfile.map`
   - Defines how TIFF files are processed
   - Specifies coordinate systems and rendering options

## Usage

1. Place your TIFF files in the `tif/` directory
2. Access the viewer at `http://localhost:8080`
3. Select a TIFF from the dropdown
4. Use map controls to pan and zoom

## Troubleshooting

Common issues:
- Check MapServer logs in `logs/ms_error.txt`
- Ensure TIFF files are in the correct directory
- Verify MapServer container is running
- Confirm mapfile.map permissions and paths

## Dependencies

- MapServer 8.0+
- Lighttpd 1.4+
- Leaflet.js 1.9.4
- Modern web browser with JavaScript enabled


## Note
docker-compose.yml of mapserver refers to localhost when building it

## Complete URL Example in Leaflet

The final URL Leaflet should looks like:
```
http://127.0.0.1:8080/cgi-bin/mapserv?
  map=/data/mapfile.map&
  layers=tiff_layer_2023&
  service=WMS&
  version=1.3.0&
  request=GetMap&
  crs=EPSG:3857&
  format=image/png&
  transparent=true&
  TIFF_NAME=TC1_ROI_2023.tif&
  styles=&
  width=256&
  height=256&
  bbox=1900000,5700000,2000000,5800000

Leaflet automatically adds these parameters when it requests tiles. You only need to specify the base parameters in your URL template, like:
javascriptconst wmsLayer = L.tileLayer.wms('http://127.0.0.1:8080/cgi-bin/mapserv', {
  layers: 'tiff_layer_2023',
  format: 'image/png',
  transparent: true,
  map: '/data/mapfile.map',
  TIFF_NAME: 'TC1_ROI_2023.tif'
});