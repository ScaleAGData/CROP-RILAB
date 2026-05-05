import React, { useMemo, useRef } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from "@mui/material";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import { useSelection } from "../navigation/AnalysisLevel";
import combined_data from "../../dataset/output_data.json";
import * as XLSX from "xlsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PesticideSprayingChart from "./Pesticide";
import { getBaselineMultiplier } from "../utils/dataProcessing";
import dataset from '../../dataset/pest_dataset.xlsx';

const SpraysComponent = () => {
  const { selectedRegion, selectedYear, selectedCropType, parcelData } = useSelection();

  // Refs for chart components to prevent null reference errors
  const multiYearChartRef = useRef(null);
  const pieChartRefs = useRef([]);
  const timelineChartRef = useRef(null);
  const baselineChartRef = useRef(null);

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

  // For single-year detailed view
  const displayYear = useMemo(() => {
    if (selectedYear && selectedYear !== "all") return selectedYear;
    return availableYears[0] || "";
  }, [selectedYear, availableYears]);

  const dataKey = useMemo(() => {
    return `sprays_${selectedRegion}_${selectedCropType}_Pilot_${displayYear}`;
  }, [selectedRegion, selectedCropType, displayYear]);

  // Helper function to convert units to kg
  const convertToKilogram = (dose, unit) => {
    if (!unit) return dose;
    const unitLower = unit.toLowerCase();
    
    if (unitLower === 'ml') return dose / 1000;
    if (unitLower === 'cc') return dose / 1000;
    if (unitLower === 'kg') return dose;
    if (unitLower === 'gr' || unitLower === 'g') return dose / 1000;
    if (unitLower === 'l' || unitLower === 'lt') return dose;
    
    return dose;
  };

  // Process year-specific data for charts
  const { aggregatedData, flatData } = useMemo(() => {
    const spraysData = combined_data["events_data"][dataKey] || [];
    const flatData = spraysData.flat();

    // Detailed processing for table view
    const detailed = flatData.reduce((acc, record) => {
      if (!record) return acc;

      const existingEntry = acc.find(
        (entry) =>
          entry.parcelId === record.parcelId &&
          entry.drugName === record.drugName &&
          entry.unit === record.unit
      );

      if (existingEntry) {
        existingEntry.totalDose += record.dose;
        existingEntry.applications.push({
          date: record.date,
          dose: record.dose,
        });
      } else {
        acc.push({
          parcelId: record.parcelId,
          drugName: record.drugName,
          activeSubstance: record.activeSubstance || '',
          target: record.target || '',
          remarks: record.remarks || '',
          unit: record.unit,
          totalDose: record.dose,
          applications: [
            {
              date: record.date,
              dose: record.dose,
            },
          ],
        });
      }

      return acc;
    }, []);

    // Aggregate by unit for charts
    const byUnit = detailed.reduce((acc, record) => {
      const unit = record.unit;
      if (!acc[unit]) {
        acc[unit] = {
          unit,
          drugs: {},
          totalDose: 0,
        };
      }

      const drugName = record.drugName;
      if (!acc[unit].drugs[drugName]) {
        acc[unit].drugs[drugName] = {
          total: 0,
          applications: [],
        };
      }

      acc[unit].drugs[drugName].total += record.totalDose;
      acc[unit].totalDose += record.totalDose;
      acc[unit].drugs[drugName].applications.push(...record.applications);

      return acc;
    }, {});

    return {
      processedData: detailed,
      aggregatedData: Object.values(byUnit),
      flatData: flatData,
    };
  }, [dataKey]);

  // Multi-year data processing for both Pilot and Adjacent
  const multiYearData = useMemo(() => {
    const yearsData = {};
    
    yearsToDisplay.forEach(year => {
      yearsData[year] = { Pilot: null, Adjacent: null };
      
      // Get data for both Pilot and Adjacent
      ["Pilot", "Adjacent"].forEach(level => {
        const yearDataKey = `sprays_${selectedRegion}_${selectedCropType}_${level}_${year}`;
        const spraysData = combined_data["events_data"][yearDataKey] || [];
        
        const yearFlatData = spraysData.flat();
        
        // Aggregate pesticides for this year/level
        const aggregated = yearFlatData.reduce((acc, record) => {
          if (!record) return acc;
          const drugName = record.drugName;
          const dose = parseFloat(record.dose) || 0;
          const unit = record.unit;
          const doseInKg = convertToKilogram(dose, unit);
          
          if (!acc[drugName]) {
            acc[drugName] = 0;
          }
          acc[drugName] += doseInKg;
          return acc;
        }, {});
        
        const totalDose = Object.values(aggregated).reduce((sum, val) => sum + val, 0);
        const uniqueParcelCount = new Set(yearFlatData.map(item => item.parcelId)).size;
        const avgPerParcel = uniqueParcelCount > 0 ? totalDose / uniqueParcelCount : 0;
        
        yearsData[year][level] = {
          totalDose,
          avgPerParcel,
          parcelCount: uniqueParcelCount,
          totalParcelArea: uniqueParcelCount, // Assuming 1 stremma per parcel
          pesticides: aggregated
        };
      });
    });
    
    return yearsData;
  }, [yearsToDisplay, selectedRegion, selectedCropType]);

  // Calculate baseline using ALL available years
  const averageBaseline = useMemo(() => {
    let totalDose = 0;
    let totalParcels = 0;

    availableYears.forEach(year => {
      const yearData = multiYearData[year];
      if (!yearData) return;
      
      totalDose += (yearData.Pilot?.totalDose || 0) + (yearData.Adjacent?.totalDose || 0);
      totalParcels += (yearData.Pilot?.parcelCount || 0) + (yearData.Adjacent?.parcelCount || 0);
    });

    const avgPerParcel = totalParcels > 0 ? totalDose / totalParcels : 0;

    return avgPerParcel;
  }, [availableYears, multiYearData]);

  // Calculate yearly baselines
  const yearlyBaselines = useMemo(() => {
    const baselines = {};
    
    availableYears.forEach(year => {
      const yearData = multiYearData[year];
      if (!yearData) return;
      
      const totalValue = (yearData.Pilot?.totalDose || 0) + (yearData.Adjacent?.totalDose || 0);
      const totalParcelArea = (yearData.Pilot?.totalParcelArea || 0) + (yearData.Adjacent?.totalParcelArea || 0);
      const multiplier = getBaselineMultiplier(selectedRegion, selectedCropType, year);
      
      if (totalParcelArea > 0) {
        baselines[year] = (totalValue * multiplier) / totalParcelArea;
      } else {
        baselines[year] = 0;
      }
    });
    
    return baselines;
  }, [availableYears, multiYearData, selectedRegion, selectedCropType]);

  // Calculate yearly average baselines
  const yearlyAverageBaselines = useMemo(() => {
    const baselines = {};
    
    availableYears.forEach(year => {
      const multiplier = getBaselineMultiplier(selectedRegion, selectedCropType, year);
      baselines[year] = averageBaseline * multiplier;
    });
    
    return baselines;
  }, [availableYears, averageBaseline, selectedRegion, selectedCropType]);

  // Calculate baseline (average across all years)
  const baselineData = useMemo(() => {
    return {
      avgPerParcel: averageBaseline,
      count: availableYears.reduce((sum, year) => {
        const yearData = multiYearData[year];
        return sum + (yearData?.Pilot?.parcelCount || 0) + (yearData?.Adjacent?.parcelCount || 0);
      }, 0),
    };
  }, [averageBaseline, availableYears, multiYearData]);

  // Multi-year comparison column chart
  const multiYearChartOptions = useMemo(() => {
    if (yearsToDisplay.length === 0) return null;
    
    const numCategories = yearsToDisplay.length;

    const series = [
      {
        name: "Pilot Parcels",
        data: yearsToDisplay.map(year => multiYearData[year]?.Pilot?.totalDose || 0),
        color: "#8884d8",
        type: "column",
      },
      {
        name: "Control Parcels",
        data: yearsToDisplay.map(year => multiYearData[year]?.Adjacent?.totalDose || 0),
        color: "#82ca9d",
        type: "column",
      }
    ];

    // Add baseline line when "all" years selected
    if (baselineData && baselineData.avgPerParcel > 0) {
      // For single year, extend the line across the chart width
      const baselineData_array = numCategories === 1 
        ? [
            { x: -0.4, y: baselineData.avgPerParcel },
            { x: 0.4, y: baselineData.avgPerParcel }
          ]
        : yearsToDisplay.map((year, index) => ({ x: index, y: baselineData.avgPerParcel }));
      
      series.push({
        name: "Baseline (Avg Per Parcel - All Years)",
        data: baselineData_array,
        type: "line",
        color: "#888888",
        dashStyle: "Dash",
        marker: { enabled: false },
        enableMouseTracking: true,
      });
    }
    
    return {
      chart: { type: "column", animation: false },
      credits: { enabled: false },
      title: { 
        text: selectedYear === "all" || !selectedYear 
          ? "Aggregated Pesticides: Quantitative Analysis (All Years)" 
          : `Aggregated Pesticides: Quantitative Analysis (${selectedYear})`
      },
      xAxis: {
        categories: yearsToDisplay,
        title: { text: "Year" },
        min: -0.5, 
        max: numCategories > 0 ? numCategories - 0.5 : 0,
        startOnTick: false, 
        endOnTick: false,
        showLastLabel: true,
      },
      yAxis: {
        title: { text: "Total Pesticide Dose (Kg/Stremma)" }
      },
      tooltip: {
        shared: true,
        useHTML: true,
        padding: 8,
        formatter: function() {
          if (!this.points || this.points.length === 0) return '';
          
          const year = this.x;
          const isSingleYear = numCategories === 1;
          const pointIndex = isSingleYear ? 0 : this.points[0].point.index;
          let s = `<div><b>${year}</b><br/>`;
          
          if (isSingleYear && this.points) {
            const pilotValue = multiYearData[year]?.Pilot?.totalDose || 0;
            const pilotParcels = multiYearData[year]?.Pilot?.parcelCount || 0;
            const adjacentValue = multiYearData[year]?.Adjacent?.totalDose || 0;
            const adjacentParcels = multiYearData[year]?.Adjacent?.parcelCount || 0;
            const totalParcels = pilotParcels + adjacentParcels;
            
            s += `<span style="color:#8884d8">●</span> Pilot Parcels: <b>${pilotValue.toFixed(1)} Kg/stremma</b> (${pilotParcels} parcels)<br/>`;
            s += `<span style="color:#82ca9d">●</span> Control Parcels: <b>${adjacentValue.toFixed(1)} Kg/stremma</b> (${adjacentParcels} parcels)<br/>`;
            s += `<span style="color:#888888">●</span> Baseline: <b>${baselineData.avgPerParcel.toFixed(1)} Kg/stremma</b> (avg per parcel across all years)<br/>`;
            s += `<span style="color:#333333">●</span> Total Parcels: <b>${totalParcels}</b><br/>`;
          } else {
            const year = yearsToDisplay[pointIndex];
            const pilotParcels = multiYearData[year]?.Pilot?.parcelCount || 0;
            const adjacentParcels = multiYearData[year]?.Adjacent?.parcelCount || 0;
            
            this.points.forEach(point => {
              if (point.series.name.includes('Baseline')) {
                s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${Highcharts.numberFormat(point.y, 1)} Kg/stremma</b> (avg per parcel across all years)<br/>`;
              } else {
                const parcels = point.series.name.includes('Pilot') ? pilotParcels : adjacentParcels;
                s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${Highcharts.numberFormat(point.y, 1)} Kg/stremma</b> (${parcels} parcels)<br/>`;
              }
            });
            
            const totalParcels = pilotParcels + adjacentParcels;
            s += `<span style="color:#333333">●</span> Total Parcels: <b>${totalParcels}</b>`;
          }
          
          s += '</div>';
          return s;
        }
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            format: "{point.y:.1f}"
          }
        },
        line: {
          dataLabels: {
            enabled: false,
          },
        },
      },
      series: series
    };
  }, [yearsToDisplay, multiYearData, selectedYear, baselineData]);

  // Yearly Baseline Chart
  const yearlyBaselineChartOptions = useMemo(() => {
    if (yearsToDisplay.length === 0) return null;

    const isSingleYear = yearsToDisplay.length === 1;

    return {
      chart: { animation: false },
      credits: { enabled: false },
      title: {
        text: selectedYear === "all" || !selectedYear 
          ? "Yearly Baseline Pesticide Consumption (All Years)" 
          : `Yearly Baseline Pesticide Consumption (${selectedYear})`,
      },
      xAxis: {
        categories: yearsToDisplay,
        title: { text: "Year" },
        min: isSingleYear ? -0.5 : undefined,
        max: isSingleYear ? 0.5 : undefined,
      },
      yAxis: {
        title: { text: "Baseline Pesticide Consumption (Kg/Stremma)" },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        padding: 8,
        formatter: function() {
          if (!this.points || this.points.length === 0) return '';
          
          const year = isSingleYear ? yearsToDisplay[0] : yearsToDisplay[this.points[0].point.index];
          const yearData = multiYearData[year];
          const totalValue = (yearData?.Pilot?.totalDose || 0) + (yearData?.Adjacent?.totalDose || 0);
          const totalParcelArea = (yearData?.Pilot?.totalParcelArea || 0) + (yearData?.Adjacent?.totalParcelArea || 0);
          const multiplier = getBaselineMultiplier(selectedRegion, selectedCropType, year);
          const yearlyBaseline = yearlyBaselines[year] || 0;
          const avgBaseline = yearlyAverageBaselines[year] || 0;
          
          let s = `<div><b>${year}</b><br/>`;
          s += `<span style="color:#ff7c43">●</span> Yearly Baseline: <b>${yearlyBaseline.toFixed(1)}</b><br/>`;
          s += `<span style="color:#666">Formula: (${totalValue.toFixed(1)} × ${multiplier.toFixed(1)}) / ${totalParcelArea.toFixed(1)} stremma</span><br/>`;
          s += `<span style="color:#4a90e2">●</span> Avg Baseline × Crop Area: <b>${avgBaseline.toFixed(1)}</b><br/>`;
          s += `<span style="color:#666">Formula: ${averageBaseline.toFixed(1)} × ${multiplier.toFixed(1)} stremma</span><br/>`;
          s += `<span style="color:#666">Crop Area: ${multiplier.toFixed(1)} stremma</span>`;
          s += `</div>`;
          
          return s;
        }
      },
      plotOptions: {
        line: {
          dataLabels: { 
            enabled: true, 
            format: "{point.y:.1f}",
            style: {
              fontWeight: 'bold'
            }
          },
          marker: {
            enabled: true,
            radius: 4
          }
        },
      },
      series: [
        {
          name: "Yearly Baseline",
          data: yearsToDisplay.map(year => yearlyBaselines[year] || 0),
          type: "line",
          color: "#ff7c43",
          lineWidth: 3
        },
        {
          name: "Avg Baseline × Crop Area",
          data: yearsToDisplay.map(year => yearlyAverageBaselines[year] || 0),
          type: "line",
          color: "#4a90e2",
          lineWidth: 3,
          dashStyle: "ShortDash"
        }
      ],
    };
  }, [yearsToDisplay, multiYearData, selectedYear, yearlyBaselines, yearlyAverageBaselines, averageBaseline, selectedRegion, selectedCropType]);

  const pieChartOptions = useMemo(() => {
    const uniqueParcelCount = new Set(flatData.map(item => item.parcelId)).size;

    return aggregatedData.map((unitGroup) => ({
      chart: {
        type: "pie",
        animation: false,
        reflow: true
      },
      credits: {
        enabled: false,
      },
      title: {
        text: `Pesticide Usage (${unitGroup.unit}) - Year: ${displayYear}`,
        style: { fontSize: "14px" },
      },
      subtitle: {
        text: `Total: ${unitGroup.totalDose.toFixed(1)} ${unitGroup.unit} | Avg: ${(unitGroup.totalDose / uniqueParcelCount).toFixed(1)} ${unitGroup.unit}`,
        style: { fontSize: "12px" },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
          },
        },
      },
      series: [
        {
          name: "Pesticide Usage",
          colorByPoint: true,
          data: Object.entries(unitGroup.drugs).map(([drug, data]) => ({
            name: drug,
            y: data.total,
          })),
        },
      ],
    }));
  }, [aggregatedData, flatData, displayYear]);

  // Timeline chart with log scale and all years data
  const timelineChartOptions = useMemo(() => {
    // Collect all applications across all selected years for both Pilot and Adjacent
    const allApplications = [];
    
    yearsToDisplay.forEach(year => {
      ["Pilot", "Adjacent"].forEach(level => {
        const yearDataKey = `sprays_${selectedRegion}_${selectedCropType}_${level}_${year}`;
        const spraysData = combined_data["events_data"][yearDataKey] || [];
        const yearFlatData = spraysData.flat();
        
        yearFlatData.forEach(record => {
          if (!record) return;
          
          allApplications.push({
            date: record.date,
            drugName: record.drugName,
            dose: record.dose,
            unit: record.unit,
            level,
            year
          });
        });
      });
    });
    
    if (allApplications.length === 0) return null;
    
    // Group applications by drug name
    const seriesMap = new Map();
    
    allApplications.forEach(app => {
      const seriesKey = app.drugName;
      
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, {
          name: app.drugName,
          unit: app.unit,
          data: []
        });
      }
      
      seriesMap.get(seriesKey).data.push([
        new Date(app.date).getTime(),
        app.dose
      ]);
    });
    
    const yearText = selectedYear === "all" || !selectedYear 
      ? "All Years" 
      : selectedYear;
    
    return {
      chart: {
        type: "column",
        animation: false,
        reflow: true
      },
      credits: {
        enabled: false,
      },
      title: {
        text: `Pesticide Applications Over Time (${yearText})`,
      },
      xAxis: {
        type: "datetime",
        title: { text: "Date" },
      },
      yAxis: {
        title: { text: 'Dose (log scale)' },
        type: 'logarithmic',
      },
      tooltip: {
        headerFormat: "<b>{point.x:%Y-%m-%d}</b><br>",
        pointFormatter: function() {
          return this.series.name + `: ${Highcharts.numberFormat(this.y, 1)} ${this.series.userOptions.unit}`;
        }
      },
      series: Array.from(seriesMap.values()),
    };
  }, [yearsToDisplay, selectedRegion, selectedCropType, selectedYear]);

  // Calculate grid columns based on aggregated data
  const gridColumns = useMemo(
    () => Math.max(1, aggregatedData.length),
    [aggregatedData]
  );

  // ===== TABLE ROWS =====
  const tableRows = useMemo(() => {
    return yearsToDisplay.flatMap((year) => {
      const yearData = multiYearData[year];
      if (!yearData) return [];
      
      const rows = [];
      
      if (yearData.Pilot) {
        rows.push({
          key: `${year}-Pilot`,
          year,
          level: "Pilot Parcels",
          totalDose: yearData.Pilot.totalDose,
          parcelCount: yearData.Pilot.parcelCount,
          avgPerParcel: yearData.Pilot.avgPerParcel,
        });
      }
      
      if (yearData.Adjacent) {
        rows.push({
          key: `${year}-Adjacent`,
          year,
          level: "Control Parcels",
          totalDose: yearData.Adjacent.totalDose,
          parcelCount: yearData.Adjacent.parcelCount,
          avgPerParcel: yearData.Adjacent.avgPerParcel,
        });
      }
      
      return rows;
    });
  }, [yearsToDisplay, multiYearData]);

  // ===== EXCEL EXPORT =====
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      tableRows.map(row => ({
        'Year': row.year,
        'Analysis Level': row.level,
        'Total Dose (Kg)': row.totalDose.toFixed(1),
        'Total Parcels': row.parcelCount,
        'Avg Dose per Parcel (Kg)': row.avgPerParcel.toFixed(1),
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sprays Data");
    XLSX.writeFile(wb, `sprays_data_${selectedRegion}_${selectedCropType}_${selectedYear}.xlsx`);
  };

  // ===== RENDER ===== 

  return (
    <Box
      sx={{
        width: "90%",
        mb: 3,
        mx: "auto",
        border: "1px solid",
        borderRadius: 0.5,
      }}
    >
      {/* Multi-Year Comparison Chart */}
      {multiYearChartOptions && (
        <Box sx={{ display: "flex", gap: 1}}>
          <Paper sx={{ flex: 1 }}>
            <HighchartsReact 
              highcharts={Highcharts} 
              options={multiYearChartOptions}
              ref={multiYearChartRef}
              immutable={true}
            />
          </Paper>
        </Box>
      )}

      {/* Yearly Baseline Chart */}
      {yearlyBaselineChartOptions && (selectedYear === "all" || !selectedYear) && (
        <Paper sx={{ p: 0, mb: 1, mt: 1 }}>
          <HighchartsReact 
            key={`baseline-chart-${yearsToDisplay.join('-')}`}
            highcharts={Highcharts} 
            options={yearlyBaselineChartOptions}
            ref={baselineChartRef}
          />
        </Paper>
      )}

      {/* Year-Specific Pesticide Charts Grid - Only show for specific year selection */}
      {pieChartOptions.length > 0 && selectedYear && selectedYear !== "all" && (
        <Box> 
          {/* Pie Charts Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridColumns}, ${100 / gridColumns}%)`,
              gap: 0.2,
              pt: 0.5,
              pl: 0.5,
              pr: 0.5,
              m: 0
            }}
          >
            {pieChartOptions.map((chartOptions, index) => (
              <Paper key={`pie-${index}-${dataKey}`}>
                <HighchartsReact 
                  highcharts={Highcharts} 
                  options={chartOptions}
                  ref={el => pieChartRefs.current[index] = el}
                  immutable={true}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Timeline Chart */}
      {timelineChartOptions && (
        <Paper sx={{ mb: 0.5, mt: 0.5 }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={timelineChartOptions}
            ref={timelineChartRef}
            immutable={true}
          />
        </Paper>
      )}

      {/* Year-Specific Pesticide Spraying Chart Component */}
      {selectedRegion && selectedCropType && selectedYear && selectedYear !== "all" && (
        <Paper sx={{ mb: 0.5, mt: 0.5 }}>
        <PesticideSprayingChart 
          excelFilePath={dataset}
          region={selectedRegion}        
          cropType={selectedCropType}     
          year={selectedYear}          
        />
        </Paper>
      )}

      {/* Multi-Year Summary Table */}
      <TableContainer
        component={Paper}
        sx={{
          mb: 0.5,
          mx: "auto",
          borderRadius: 0,
        }}
      >
        <Table
          stickyHeader
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            "& th, & td": {
              border: (theme) => `1px solid ${theme.palette.divider}`,
            },
            "& th": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.grey[700]
                  : theme.palette.grey[200],
              color: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.common.white
                  : theme.palette.common.black,
              fontWeight: "500",
              textTransform: "none",
              letterSpacing: "0.5px",
              padding: "12px",
            },
            "& tbody tr:hover": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.grey[700]
                  : theme.palette.grey[100],
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Year</TableCell>
              <TableCell>Analysis Level</TableCell>
              <TableCell>Total Dose (Kg)</TableCell>
              <TableCell>Total Parcels</TableCell>
              <TableCell>
                Avg Dose per Parcel (Kg)
              <Tooltip title="Export to Excel">
                <IconButton
                  size="small"
                  onClick={exportToExcel}
                  disabled={tableRows.length === 0}
                  sx={{ 
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.length > 0 ? (
              tableRows.map(row => (
                <TableRow key={row.key}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{row.level}</TableCell>
                  <TableCell>{row.totalDose.toFixed(1)}</TableCell>
                  <TableCell>{row.parcelCount}</TableCell>
                  <TableCell>{row.avgPerParcel.toFixed(1)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No spray data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SpraysComponent;