FROM camptocamp/mapserver:8.6

ENV MS_MAPFILE=/etc/mapserver/mapserver.map

COPY --chown=www-data:www-data shared/tifs/ /data/tifs/
COPY --chown=www-data:www-data shared/mapfile.map /etc/mapserver/mapserver.map

USER www-data
