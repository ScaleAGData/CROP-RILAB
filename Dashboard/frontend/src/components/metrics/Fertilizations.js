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
import { translate, mapping } from "../utils/translations";
import combined_data from "../../dataset/output_data.json";
import * as XLSX from "xlsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { getBaselineMultiplier } from "../utils/dataProcessing";

const FertilizationComponent = () => {
  const { selectedRegion, selectedYear, selectedCropType, parcelData } = useSelection(); 
  
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
  
  const displayYear = useMemo(() => {
    if (selectedYear && selectedYear !== "all") return selectedYear;
    return availableYears[0] || "";
  }, [selectedYear, availableYears]);

  const dataKey = useMemo(() => {
    return `fertilization_${selectedRegion}_${selectedCropType}_Pilot_${displayYear}`;
  }, [selectedRegion, selectedCropType, displayYear]);

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

  const { aggregatedData, flatData } = useMemo(() => {
    const fertilizationData = combined_data["events_data"][dataKey] || [];
    const flatData = fertilizationData.flat();

    const detailed = flatData.reduce((acc, record) => {
      if (!record) return acc;

      const parcelId = record.parcelId;
      const fertilizerType = record.lutyDescription;
      const applicationMethod = record.lumeDescription;

      let existingEntry = acc.find(
        (entry) =>
          entry.parcelId === parcelId &&
          entry.fertilizerType === fertilizerType &&
          entry.applicationMethod === applicationMethod
      );

      if (!existingEntry) {
        existingEntry = {
          parcelId,
          fertilizerType,
          applicationMethod,
          magnSymbol: record.magnSymbol,
          magnReferenceDose: record.magnReferenceDose,
          totalDose: 0,
          applications: [],
          workType: record.cuwoDescription,
        };
        acc.push(existingEntry);
      }

      const dose = parseFloat(record.lubrDose) || 0;
      existingEntry.totalDose += dose;
      existingEntry.applications.push({
        date: record.date,
        dose,
        ...record,
      });

      return acc;
    }, []);

    const aggregated = detailed.reduce((acc, entry) => {
      const unitKey = `${entry.magnSymbol}-${entry.magnReferenceDose}`;
      if (!acc[unitKey]) {
        acc[unitKey] = {
          unit: entry.magnSymbol,
          reference: translate(entry.magnReferenceDose, mapping),
          fertilizers: {},
        };
      }

      if (!acc[unitKey].fertilizers[entry.fertilizerType]) {
        acc[unitKey].fertilizers[entry.fertilizerType] = {
          total: 0,
          applications: [],
        };
      }

      acc[unitKey].fertilizers[entry.fertilizerType].total += entry.totalDose;
      acc[unitKey].fertilizers[entry.fertilizerType].applications.push(
        ...entry.applications.map((app) => ({
          date: app.date,
          dose: app.dose,
        }))
      );
      return acc;
    }, {});

    return {
      aggregatedData: Object.entries(aggregated).map(([key, data]) => ({
        unitKey: key,
        ...data,
      })),
      flatData: flatData
    };
  }, [dataKey]);

  // Multi-year data processing for both Pilot and Adjacent
  const multiYearData = useMemo(() => {
    const yearsData = {};
    
    yearsToDisplay.forEach(year => {
      yearsData[year] = { Pilot: null, Adjacent: null };
      
      ["Pilot", "Adjacent"].forEach(level => {
        const yearDataKey = `fertilization_${selectedRegion}_${selectedCropType}_${level}_${year}`;
        const fertilizationData = combined_data["events_data"][yearDataKey] || [];
        
        const yearFlatData = fertilizationData.flat();
        
        const aggregated = yearFlatData.reduce((acc, record) => {
          if (!record) return acc;
          const fertilizerType = record.lutyDescription;
          const dose = parseFloat(record.lubrDose) || 0;
          const unit = record.magnSymbol;
          const doseInKg = convertToKilogram(dose, unit);
          
          if (!acc[fertilizerType]) {
            acc[fertilizerType] = 0;
          }
          acc[fertilizerType] += doseInKg;
          return acc;
        }, {});
        
        const totalDose = Object.values(aggregated).reduce((sum, val) => sum + val, 0);
        const uniqueParcelCount = new Set(yearFlatData.map(item => item.parcelId)).size;
        
        // Calculate total parcel area for this level/year
        const totalParcelArea = yearFlatData.reduce((sum, record) => {
          if (!record || !record.parcelId) return sum;
          // Using a Set to avoid counting the same parcel multiple times
          return sum;
        }, 0);
        
        // For simplicity, assume each parcel contributes equally
        const avgPerParcel = uniqueParcelCount > 0 ? totalDose / uniqueParcelCount : 0;
        
        yearsData[year][level] = {
          totalDose,
          avgPerParcel,
          parcelCount: uniqueParcelCount,
          totalParcelArea: uniqueParcelCount, // Assuming 1 stremma per parcel
          fertilizers: aggregated
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
      },
    ];

    if (averageBaseline > 0) {
      const baselineData_array = numCategories === 1 
        ? [
            { x: -0.4, y: averageBaseline },
            { x: 0.4, y: averageBaseline }
          ]
        : yearsToDisplay.map((year, index) => ({ x: index, y: averageBaseline }));
      
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
          ? "Aggregated Fertilizers: Quantitative Analysis (All Years)" 
          : `Aggregated Fertilizers: Quantitative Analysis (${selectedYear})`
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
        title: { text: "Total Fertilizer Dose (Kg/Stremma)" }
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
            s += `<span style="color:#888888">●</span> Baseline: <b>${averageBaseline.toFixed(1)} Kg/stremma</b> (avg per parcel across all years)<br/>`;
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
          dataLabels: { enabled: false },
        }
      },
      series: series
    };
  }, [yearsToDisplay, multiYearData, selectedYear, averageBaseline]);

  // Yearly Baseline Chart
  const yearlyBaselineChartOptions = useMemo(() => {
    if (yearsToDisplay.length === 0) return null;

    const isSingleYear = yearsToDisplay.length === 1;

    return {
      chart: { animation: false },
      credits: { enabled: false },
      title: {
        text: selectedYear === "all" || !selectedYear 
          ? "Yearly Baseline Fertilizer Consumption (All Years)" 
          : `Yearly Baseline Fertilizer Consumption (${selectedYear})`,
      },
      xAxis: {
        categories: yearsToDisplay,
        title: { text: "Year" },
        min: isSingleYear ? -0.5 : undefined,
        max: isSingleYear ? 0.5 : undefined,
      },
      yAxis: {
        title: { text: "Baseline Fertilizer Consumption (Kg/Stremma)" },
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

  const gridColumns = useMemo(
    () => Math.max(1, aggregatedData.length),
    [aggregatedData]
  );

  const pieChartOptions = useMemo(() => {
    return aggregatedData.map((unitGroup) => {
      const totalSum = Object.values(unitGroup.fertilizers).reduce(
        (sum, data) => sum + data.total,
        0
      );
      
      const uniqueParcelCount = new Set(flatData.map(item => item.parcelId)).size;
      const avgPerParcel = uniqueParcelCount > 0 ? totalSum / uniqueParcelCount : 0;

      return {
        chart: {
          type: "pie",
          animation: false,
          reflow: true
        },
        credits: {
          enabled: false,
        },
        title: {
          text: `Fertilizers Distribution (${translate(
            unitGroup.unit + "/" + unitGroup.reference,
            mapping
          )}) - Year: ${displayYear}`,
          style: { fontSize: "14px" },
        },
        subtitle: {
          text: `Total: ${totalSum.toFixed(1)} ${unitGroup.unit} | Avg: ${avgPerParcel.toFixed(1)} ${unitGroup.unit}`,
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
            name: "Fertilizer Usage",
            colorByPoint: true,
            data: Object.entries(unitGroup.fertilizers).map(([type, data]) => ({
              name: translate(type, mapping),
              y: data.total,
            })),
          },
        ],
      };
    });
  }, [aggregatedData, flatData, displayYear]);

  const timelineChartOptions = useMemo(() => {
    const allApplications = [];
    const unitGroups = new Map();
    
    yearsToDisplay.forEach(year => {
      ["Pilot", "Adjacent"].forEach(level => {
        const yearDataKey = `fertilization_${selectedRegion}_${selectedCropType}_${level}_${year}`;
        const fertilizationData = combined_data["events_data"][yearDataKey] || [];
        const yearFlatData = fertilizationData.flat();
        
        yearFlatData.forEach(record => {
          if (!record) return;
          
          const fertilizerType = record.lutyDescription;
          const dose = parseFloat(record.lubrDose) || 0;
          const unit = record.magnSymbol;
          const reference = record.magnReferenceDose;
          const unitKey = `${unit}-${reference}`;
          
          if (!unitGroups.has(unitKey)) {
            unitGroups.set(unitKey, {
              unit,
              reference: translate(reference, mapping),
              index: unitGroups.size
            });
          }
          
          allApplications.push({
            date: record.date,
            fertilizerType,
            dose,
            unit,
            reference,
            unitKey,
            level,
            year
          });
        });
      });
    });
    
    if (allApplications.length === 0) return null;
    
    const seriesMap = new Map();
    
    allApplications.forEach(app => {
      const seriesKey = app.fertilizerType;
      
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, {
          name: app.fertilizerType,
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
        text: `Fertilizer Applications Over Time (${yearText})`,
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
          return translate(this.series.name, mapping) + `: ${Highcharts.numberFormat(this.y, 1)} ${this.series.userOptions.unit}`;
        }
      },
      series: Array.from(seriesMap.values()),
    };
  }, [yearsToDisplay, selectedRegion, selectedCropType, selectedYear]);

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

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      tableRows.map(row => ({
        'Year': row.year,
        'Analysis Level': row.level,
        'Total Dose (Kg/Stremma)': row.totalDose.toFixed(1),
        'Total Parcels': row.parcelCount,
        'Avg Dose per Parcel (Kg/Stremma)': row.avgPerParcel.toFixed(1),
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fertilization Data");
    XLSX.writeFile(wb, `fertilization_data_${selectedRegion}_${selectedCropType}_${selectedYear}.xlsx`);
  };

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

      {/* Year-Specific Fertilizer Charts Grid */}
      {pieChartOptions.length > 0 && selectedYear && selectedYear !== "all" && (          
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

      {/* Data Table */}
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
              <TableCell>Total Dose (Kg/Stremma)</TableCell>
              <TableCell>Total Parcels</TableCell>
              <TableCell>
                Avg Dose per Parcel (Kg/Stremma)
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
                  No fertilization data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FertilizationComponent;