import React, { useMemo, useState } from "react";
import { Box, Paper, Typography, Tabs, Tab } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useSelection } from "../navigation/AnalysisLevel";
import combined_data from "../../dataset/output_data.json";

const NDVIChartComponent = () => {
  const { selectedRegion, selectedYear, selectedCropType, parcelData } = useSelection();
  const [ selectedIndicator, setSelectedIndicator ] = useState('ndvi');

  // Smoothing function - now with configurable window size
  const smoothData = (data, windowSize = 14) => {
    if (data.length < windowSize || windowSize <= 1) return data;
    
    return data.map((point, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      
      const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;
      
      return {
        ...point,
        y: avgY
      };
    });
  };

  // Get all available years for current selection
  const availableYears = useMemo(() => {
    if (!selectedRegion || !selectedCropType || !parcelData) return [];
    
    const cropData = parcelData[selectedRegion]?.[selectedCropType];
    if (!cropData) return [];
    
    const allYears = new Set();
    Object.values(cropData).forEach(levelData => {
      Object.keys(levelData).forEach(year => allYears.add(year));
    });
    
    return Array.from(allYears).sort();
  }, [selectedRegion, selectedCropType, parcelData]);

  // Filter years based on selection
  const yearsToDisplay = useMemo(() => {
    if (selectedYear === "all" || !selectedYear) {
      return availableYears;
    }
    return [selectedYear];
  }, [selectedYear, availableYears]);

  const processedData = useMemo(() => {
    const yearlyData = {};

    // Process data for each year separately
    yearsToDisplay.forEach(year => {
      const pilotDataKey = `${selectedIndicator}_${selectedRegion}_${selectedCropType}_Pilot_${year}`;
      const adjacentDataKey = `${selectedIndicator}_${selectedRegion}_${selectedCropType}_Adjacent_${year}`;
        
      const pilotData = combined_data["events_data"][pilotDataKey] || [];
      const adjacentData = combined_data["events_data"][adjacentDataKey] || [];

      const processParcels = (indicatorData) => {
        return indicatorData
          .map((parcelData) => {
            // Dynamic property name based on selected indicator
            const measurementKey = `${selectedIndicator}_measurements`;
            
            if (!parcelData || !parcelData[measurementKey]) return null;
          
            // Convert date to day of year
            const measurements = parcelData[measurementKey].map((measurement) => {
              const date = new Date(measurement.date);
              const startOfYear = new Date(date.getFullYear(), 0, 0);
              const dayOfYear = Math.floor(
                (date - startOfYear) / (24 * 60 * 60 * 1000)
              );

              return {
                ...measurement,
                dayOfYear,
                originalDate: measurement.date,
              };
            });

            return {
              parcelId: parcelData.parcelId,
              cropType: parcelData.crop_type,
              measurements: measurements.sort((a, b) => a.dayOfYear - b.dayOfYear),
            };
          })
          .filter(Boolean);
      };

      yearlyData[year] = {
        pilotParcels: processParcels(pilotData),
        adjacentParcels: processParcels(adjacentData),
      };
    });

    return yearlyData;
  }, [yearsToDisplay, selectedRegion, selectedCropType, selectedIndicator]);

  const baselineData = useMemo(() => {
    const allPilotParcels = [];
    const allAdjacentParcels = [];

    // Loop through ALL available years, not just yearsToDisplay
    availableYears.forEach(year => {
      const pilotDataKey = `${selectedIndicator}_${selectedRegion}_${selectedCropType}_Pilot_${year}`;
      const adjacentDataKey = `${selectedIndicator}_${selectedRegion}_${selectedCropType}_Adjacent_${year}`;
      
      const pilotData = combined_data["events_data"][pilotDataKey] || [];
      const adjacentData = combined_data["events_data"][adjacentDataKey] || [];

      const processParcels = (ndviData) => {
        return ndviData
          .map((parcelData) => {
            const measurementKey = `${selectedIndicator}_measurements`;
            if (!parcelData || !parcelData[measurementKey]) return null;
          
            const measurements = parcelData[measurementKey].map((measurement) => {
              const date = new Date(measurement.date);
              const startOfYear = new Date(date.getFullYear(), 0, 0);
              const dayOfYear = Math.floor(
                (date - startOfYear) / (24 * 60 * 60 * 1000)
              );

              return {
                ...measurement,
                dayOfYear,
                originalDate: measurement.date,
              };
            });

            return {
              parcelId: parcelData.parcelId,
              cropType: parcelData.crop_type,
              measurements: measurements.sort((a, b) => a.dayOfYear - b.dayOfYear),
            };
          })
          .filter(Boolean);
      };

      allPilotParcels.push(...processParcels(pilotData));
      allAdjacentParcels.push(...processParcels(adjacentData));
    });

    return [...allPilotParcels, ...allAdjacentParcels];
  }, [availableYears, selectedRegion, selectedCropType, selectedIndicator]);

  // Create Highcharts options
  const chartOptions = useMemo(() => {
    // Check if we have any data
    const hasData = Object.values(processedData).some(
      yearData => yearData.pilotParcels.length > 0 || yearData.adjacentParcels.length > 0
    );

    if (!hasData) {
      return {};
    }

    // Function to aggregate measurements by day of year
    const aggregateMeasurements = (parcels) => {
      const aggregatedData = {};

      parcels.forEach((parcel) => {
        parcel.measurements.forEach((measurement) => {
          if (!aggregatedData[measurement.dayOfYear]) {
            aggregatedData[measurement.dayOfYear] = {
              dayOfYear: measurement.dayOfYear,
              originalDate: measurement.originalDate,
              means: [],
            };
          }
          aggregatedData[measurement.dayOfYear].means.push(measurement.mean);
        });
      });

      // Convert to array and sort by day of year
      return Object.values(aggregatedData).sort(
        (a, b) => a.dayOfYear - b.dayOfYear
      );
    };

    // Generate color palette for years
    const colors = [
      "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", 
      "#F44336", "#00BCD4", "#FFEB3B", "#795548"
    ];

    const allPilotParcels = [];
    const allAdjacentParcels = [];

    Object.values(processedData).forEach(yearData => {
      allPilotParcels.push(...yearData.pilotParcels);
      allAdjacentParcels.push(...yearData.adjacentParcels);
    });

    // Aggregate all pilot and adjacent data together
    const series = [];

    // Calculate baseline from currently displayed years (average of all pilot + adjacent)
    // This now properly aggregates ALL individual measurement means for each day
    const baselineAggregated = aggregateMeasurements([...allPilotParcels, ...allAdjacentParcels]);
    const baselineLineData = baselineAggregated.map(day => ({
      x: day.dayOfYear,
      y: day.means.reduce((sum, val) => sum + val, 0) / day.means.length,
      pointCount: day.means.length // Track how many measurements went into this average
    }));

    // Apply minimal or no smoothing to baseline (set to 1 for no smoothing, 3 for light smoothing)
    const smoothedBaselineData = smoothData(baselineLineData, 3); // Changed from 14 to 1 (no smoothing)

    // Add baseline series
    const baselineLabel = selectedYear === "all" || !selectedYear 
      ? 'Average (All Years)' 
      : `Average (${selectedYear})`;

    series.push({
      name: baselineLabel,
      data: smoothedBaselineData,
      type: 'spline',
      color: '#888888',
      dashStyle: 'dash',
      lineWidth: 2.5,
      zIndex: 5
    });

    // Create series for each year
    Object.entries(processedData).forEach(([year, yearData], yearIndex) => {
      const pilotColor = colors[yearIndex % colors.length];
      const adjacentColor = colors[(yearIndex + 1) % colors.length];

      // Pilot parcels for this year
      if (yearData.pilotParcels.length > 0) {
        const pilotSortedDays = aggregateMeasurements(yearData.pilotParcels);
        
        const pilotMeanLineData = pilotSortedDays.map((day) => ({
          x: day.dayOfYear,
          y: day.means.reduce((sum, val) => sum + val, 0) / day.means.length,
          pointCount: day.means.length
        }));

        // Add trend line
        series.push({
          name: `Pilot ${year} Avg`,
          data: pilotMeanLineData,
          type: "spline",
          color: pilotColor,
          zIndex: 4,
          lineWidth: 2,
          dashStyle: "Solid",
        });
      }

      // Adjacent parcels for this year
      if (yearData.adjacentParcels.length > 0) {
        const adjacentSortedDays = aggregateMeasurements(yearData.adjacentParcels);
      
        const adjacentMeanLineData = adjacentSortedDays.map((day) => ({
          x: day.dayOfYear,
          y: day.means.reduce((sum, val) => sum + val, 0) / day.means.length,
          pointCount: day.means.length
        }));

        // Add trend line
        series.push({
          name: `Control ${year} Avg`,
          data: adjacentMeanLineData,
          type: "spline",
          color: adjacentColor,
          zIndex: 4,
          lineWidth: 2,
          dashStyle: "Dash",
        });
      }
    });

    const yearText = selectedYear === "all" || !selectedYear 
      ? "All Years" 
      : selectedYear;

    return {
      chart: {
        type: "spline",
        animation: false,
        zoomType: "x",
      },
      credits: {
        enabled: false,
      },
      title: {
        text: `${selectedIndicator.toUpperCase()} Mean Values - ${yearText}`,
      },
      xAxis: {
        title: {
          text: "Day of Year",
        },
        type: "linear",
        labels: {
          formatter: function () {
            return this.value;
          },
        },
      },
      yAxis: {
        title: {
          text: `${selectedIndicator.toUpperCase()} Mean Values`,
        },
        ...(selectedIndicator === 'ndwi' ? {
          min: -1,
          max: 1
        } : selectedIndicator === 'psri' ? {
          min: -0.2,
          max: 0.8
        } : {
          min: 0,
          max: 1
        })
      },
      tooltip: {
        shared: true,
        crosshairs: true,
        formatter: function () {
          let tooltipText = `<b>Day ${this.x}</b><br/>`;
          
          // Check if points exist
          if (this.points && this.points.length > 0) {
            this.points.forEach((point) => {
              tooltipText += `${point.series.name}: <b>${point.y.toFixed(4)}</b>`;
              if (point.point.pointCount) {
                tooltipText += ` (${point.point.pointCount} measurements)`;
              }
              tooltipText += '<br/>';
            });
          } else if (this.point) {
            // Single point (not shared)
            tooltipText += `${this.series.name}: <b>${this.y.toFixed(4)}</b>`;
            if (this.point.pointCount) {
              tooltipText += ` (${this.point.pointCount} measurements)`;
            }
            tooltipText += '<br/>';
          }
          
          return tooltipText;
        },
      },
      plotOptions: {
        spline: {
          marker: {
            enabled: false,
          },
          lineWidth: 2,
        },
        scatter: {
          marker: {
            radius: 5,
            lineWidth: 1,
          },
        },
      },
      legend: {
        layout: "vertical",
        align: "right",
        verticalAlign: "middle",
      },
      series: series,
    };
  }, [processedData, selectedYear, selectedIndicator]);

  return (
    <Box
      sx={{
        width: "90%",
        mb: 3,
        mx: "auto",
        border: "1px solid",
        // borderColor: "divider",
        borderRadius: 0.5,
      }}
    >
      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={selectedIndicator}
            onChange={(e, newValue) => setSelectedIndicator(newValue)}
          >
            <Tab label="NDVI" value="ndvi" />
            <Tab label="PSRI" value="psri" />
            <Tab label="SAVI" value="savi" />
            <Tab label="NDWI" value="ndwi" />
          </Tabs>
        </Box>
        {Object.keys(chartOptions).length > 0 ? (
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography>
              No data available for the selected criteria
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default NDVIChartComponent;