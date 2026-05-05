import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  WMSTileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as wellknown from "wellknown";
import { translate, mapping } from "../utils/translations";
import { useSelection } from "../navigation/AnalysisLevel";
import combined_data from "../../dataset/output_data.json";
import communesData from "../../dataset/communes_geojson.json"; 
import L from "leaflet";

const MAP_SERVER_URL =
  process.env.REACT_APP_MAPSERVER_URL || "http://localhost:8080/cgi-bin/mapserv";

// TIF Layer Component
const TifLayer = ({ layerName }) => {
  if (!layerName) return null;

  const fullTifName = layerName.endsWith(".tif") ? layerName : `${layerName}.tif`;

  const layerType = fullTifName.includes("_2022") 
    ? "tiff_layer_2022" 
    : fullTifName.includes("_2023") 
      ? "tiff_layer_2023" 
      : fullTifName.includes("_2024")
        ? "tiff_layer_2024"
        : fullTifName.includes("_2025")
          ? "tiff_layer_2025"
          : "tiff_layer_2024";

  const params = {
    map: "/data/mapfile.map",
    layers: layerType,
    format: "image/png",
    transparent: true,
    version: "1.3.0",
    TIFF_NAME: fullTifName,
    styles: "",
  };

  return (
    <WMSTileLayer
      key={`${fullTifName}-${layerType}`}
      url={MAP_SERVER_URL}
      params={params}
      opacity={0.8}
    />
  );
};

const MapFocusHandler = ({ selectedField, selectedRegion }) => {
  const map = useMap();
  const { selectedCropType, selectedLevel, selectedYear } = useSelection();
  const defaultCenter = [39.18, 24.29];
  const defaultZoom = 6.2;
  const previousSelectionRef = useRef({});
  const currentPopupRef = useRef(null);

  const selectionKey = `${selectedRegion}_${selectedCropType}_${selectedLevel}_${selectedYear}`;

  useEffect(() => {
    if (selectedRegion) {
      console.log("Selected Region:", selectedRegion);
      
      const normalizeString = (str) => {
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
      };
      
      const normalizedSelectedRegion = normalizeString(selectedRegion);
      
      const matchingCommune = communesData.features.find(feature => {
        const props = feature.properties;
        
        if (communesData.features.indexOf(feature) === 0) {
          console.log("Sample properties:", props);
        }
        
        if (props.NAME_LATN === selectedRegion || 
            props.COMM_NAME === selectedRegion ||
            props.NAME3_LATN === selectedRegion ||
            props.NUTS3_NAME === selectedRegion) {
          return true;
        }
        
        const propertiesToCheck = [
          props.NAME_LATN,
          props.COMM_NAME,
          props.NAME3_LATN,
          props.NUTS3_NAME,
          props.NUTS3_ID,
          props.NAME2_LATN,
          props.NUTS2_NAME
        ];
        
        return propertiesToCheck.some(prop => {
          if (!prop) return false;
          return normalizeString(prop) === normalizedSelectedRegion;
        });
      });

      console.log("Matching commune found:", matchingCommune ? "Yes" : "No");

      if (matchingCommune) {
        try {
          const tempLayer = L.geoJSON(matchingCommune);
          const bounds = tempLayer.getBounds();
          
          if (bounds.isValid()) {
            map.fitBounds(bounds, { 
              padding: [50, 50],
              animate: true,
              duration: 1,
              maxZoom: 10
            });
          }
        } catch (error) {
          console.error("Error zooming to region:", error);
        }
      } else {
        console.log("No matching commune found, available regions:");
        communesData.features.slice(0, 5).forEach(f => {
          console.log("- NAME_LATN:", f.properties.NAME_LATN);
          console.log("- NAME3_LATN:", f.properties.NAME3_LATN);
        });
      }
    }
  }, [selectedRegion, map, defaultCenter, defaultZoom]);

  useEffect(() => {
    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
      currentPopupRef.current = null;
    }

    const prevSelectionKey = `${previousSelectionRef.current.selectedRegion}_${previousSelectionRef.current.selectedCropType}_${previousSelectionRef.current.selectedLevel}_${previousSelectionRef.current.selectedYear}`;

    if (prevSelectionKey !== selectionKey && selectionKey !== `${selectedRegion}_undefined_undefined_undefined`) {
      previousSelectionRef.current = { selectedRegion, selectedCropType, selectedLevel, selectedYear };
    }
  }, [selectionKey, selectedRegion, selectedCropType, selectedLevel, selectedYear, map]);

  useEffect(() => {
    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
      currentPopupRef.current = null;
    }

    if (selectedField && selectedField.polygon) {
      try {
        const geojson = wellknown.parse(selectedField.polygon);
        const tempLayer = L.geoJSON(geojson);
        const bounds = tempLayer.getBounds();

        if (bounds.isValid()) {
          const center = bounds.getCenter();

          const popupContent = `
            <div style="max-width: 250px;">
              <h3>Parcel Details</h3>
              <strong>Parcel ID:</strong> ${selectedField.parcel_id || "N/A"}<br/>
              <strong>Toponym:</strong> ${selectedField.local_name || "N/A"}<br/>
              <strong>Crop:</strong> ${translate(selectedField.crop, mapping) || "N/A"}<br/>
              <strong>Year:</strong> ${selectedField.year || "N/A"}<br/>
              <strong>Coordinates:</strong> ${selectedField.lat?.toFixed(4) || "N/A"},${selectedField.lon?.toFixed(4) || "N/A"}<br/>
            </div>
          `;

          currentPopupRef.current = L.popup()
            .setLatLng(center)
            .setContent(popupContent);

          setTimeout(() => {
            if (currentPopupRef.current) {
              currentPopupRef.current.openOn(map);
            }
          }, 300);
        }
      } catch (error) {
        console.error("Error processing selected field polygon:", error);
      }
    }

    return () => {
      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }
    };
  }, [selectedField, map]);

  useEffect(() => {
    return () => {
      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }
    };
  }, []);

  return null;
};

export default function ParcelMap() {
  const { selectedRegion, selectedLevel, selectedYear, selectedCropType, selectedField } = useSelection();
  const defaultCenter = [39.18, 24.29];
  const defaultZoom = 6;

  const dataKey = useMemo(() => {
    return `${selectedRegion}_${selectedCropType}_${selectedLevel}_${selectedYear}`;
  }, [selectedRegion, selectedCropType, selectedLevel, selectedYear]);

  const geoJsonLayerRef = useRef(null);

  // Get the selected region boundary
  const selectedRegionBoundary = useMemo(() => {
    if (!selectedRegion) return null;

    const normalizeString = (str) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    };
    
    const normalizedSelectedRegion = normalizeString(selectedRegion);
    
    const matchingCommune = communesData.features.find(feature => {
      const props = feature.properties;
      
      if (props.NAME_LATN === selectedRegion || 
          props.COMM_NAME === selectedRegion ||
          props.NAME3_LATN === selectedRegion ||
          props.NUTS3_NAME === selectedRegion) {
        return true;
      }
      
      const propertiesToCheck = [
        props.NAME_LATN,
        props.COMM_NAME,
        props.NAME3_LATN,
        props.NUTS3_NAME,
        props.NUTS3_ID,
        props.NAME2_LATN,
        props.NUTS2_NAME
      ];
      
      return propertiesToCheck.some(prop => {
        if (!prop) return false;
        return normalizeString(prop) === normalizedSelectedRegion;
      });
    });

    return matchingCommune || null;
  }, [selectedRegion]);

  const availableTifLayers = useMemo(() => {
    if (!selectedRegion || !selectedCropType) {
      return [];
    }

    const tifLayers = [];
    const years = ['2022', '2023', '2024', '2025'];
    const levels = ['L1', 'L2', 'L3', 'Pilot', 'Adjacent'];
    
    years.forEach(year => {
      let foundDataForYear = false;
      
      for (const level of levels) {
        const dataKey = `${selectedRegion}_${selectedCropType}_${level}_${year}`;
        
        if (combined_data["filtered_data"][dataKey]) {
          const parcels = combined_data["filtered_data"][dataKey];
          
          if (Array.isArray(parcels) && parcels.length > 0) {
            const firstParcel = parcels[0];
            if (firstParcel && !foundDataForYear) {
              const regionName = selectedRegion.replace(/ /g, '');
              const cropName = (firstParcel.crop || selectedCropType).replace(/ /g, '');
              const tifFileName = `${regionName}_${cropName}_${year}`;
              
              tifLayers.push({
                name: tifFileName,
                displayName: `${year}`,
                year: year,
                level: level
              });
              
              foundDataForYear = true;
              break;
            }
          }
        }
      }
    });
    
    return tifLayers;
  }, [selectedRegion, selectedCropType]);

  const geoJsonData = useMemo(() => {
    const payload = combined_data["filtered_data"][dataKey] || [];
    
    if (!payload || !Array.isArray(payload)) {
      return null;
    }

    try {
      const features = payload.flatMap((parcel) => {
        if (!parcel.polygon) {
          return [];
        }

        try {
          const geojson = wellknown.parse(parcel.polygon);
          return [{
            type: "Feature",
            geometry: geojson,
            properties: {
              ...parcel,
            },
          }];
        } catch (error) {
          console.error("Error parsing polygon for parcel:", parcel.parcel_id, error);
          return [];
        }
      });

      return features.length > 0
        ? {
            type: "FeatureCollection",
            features: features,
          }
        : null;
    } catch (error) {
      console.error("Error processing features:", error);
      return null;
    }
  }, [dataKey]);

  const geoJsonStyle = (feature) => {
    const isSelectedField =
      selectedField &&
      feature.properties &&
      feature.properties.parcel_id === selectedField.parcel_id &&
      feature.properties.year === selectedField.year;

    if (isSelectedField) {
      return {
        fillColor: "transparent",
        color: "transparent",
        weight: 0,
        fillOpacity: 0,
        opacity: 0,
      };
    }

    return {
      fillColor: "#FF4500",
      color: "#8B0000",
      weight: 2,
      fillOpacity: 0.7,
      opacity: 1,
    };
  };

  // Style for the region boundary
  const regionBoundaryStyle = {
    fillColor: "transparent",
    fillOpacity: 0,
    color: "#0066FF",
    weight: 2,
    opacity: 1,
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      const popupContent = `
        <div style="max-width: 250px;">
          <h3>Parcel Details</h3>
          <strong>Parcel ID:</strong> ${props.parcel_id || "N/A"}<br/>
          <strong>Toponym:</strong> ${props.local_name || "N/A"}<br/>
          <strong>Crop:</strong> ${translate(props.crop, mapping) || "N/A"}<br/>
          <strong>Year:</strong> ${props.year || "N/A"}<br/>
          <strong>Coordinates:</strong> ${props.lat?.toFixed(4) || "N/A"},${props.lon?.toFixed(4) || "N/A"}<br/>
        </div>
      `;
      
      layer.bindPopup(popupContent, {
        closeOnClick: false,
        autoClose: false,
        closeButton: true
      });
      
      layer.on({
        mouseover: function(e) {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            opacity: 0.9,
            fillOpacity: 0.8
          });
        },
        mouseout: function(e) {
          const layer = e.target;
          layer.setStyle(geoJsonStyle(feature));
        },
        click: function(e) {
          layer.openPopup();
        }
      });
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "490px",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <MapFocusHandler selectedField={selectedField} selectedRegion={selectedRegion} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"
              attribution='&copy; <a href="https://www.google.com/maps" target=_blank>Google Satellite</a>'
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Open Street Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target=_blank>Open Street Map</a>'
            />
          </LayersControl.BaseLayer>
          
          {availableTifLayers.length > 0 && availableTifLayers.map((tifLayer) => (
            <LayersControl.Overlay 
              key={tifLayer.name}
              name={`Pilot ${tifLayer.displayName}`}
              checked
            >
              <TifLayer layerName={tifLayer.name} />
            </LayersControl.Overlay>
          ))}

          {selectedRegionBoundary && (
            <LayersControl.Overlay checked name="Region Boundary">
              <GeoJSON 
                key={`region-${selectedRegion}`}
                data={selectedRegionBoundary}
                style={regionBoundaryStyle}
              />
            </LayersControl.Overlay>
          )}

          {geoJsonData && (
            <LayersControl.Overlay checked name="Parcels">
              <GeoJSON 
                key={dataKey}
                data={geoJsonData} 
                style={geoJsonStyle}
                onEachFeature={onEachFeature}
                ref={geoJsonLayerRef}
              />
            </LayersControl.Overlay>
          )}
        </LayersControl>
      </MapContainer>
    </Box>
  );
}
