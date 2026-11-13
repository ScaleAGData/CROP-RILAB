import React, { useMemo, useRef } from "react";
import {
  Box,
  Paper
} from "@mui/material";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import { useSelection } from "../navigation/AnalysisLevel";
import combined_data from "../../dataset/output_data.json";
import PesticideSprayingChart from "./Pesticide";
import {
  processAllYearsData,
  calculateAverageBaseline,
  calculateYearlyBaselines,
  calculateYearlyAverageBaselines,
  getDisplayData
} from "../utils/dataProcessing";
import {
  createAggregatedChartOptions,
  createYearlyBaselineChartOptions
} from "../utils/chartConfig";
import LevelParcelTable from "./LevelParcelTable";
import dataset from '../../dataset/pest_dataset.xlsx';

// Pesticide dose is an absolute total per spray event (no per-area reference
// field on the record, unlike fertilizer's magnReferenceDose), so it must be
// normalized by each parcel's real area to become a rate.
const NORMALIZATION_MODE = "perArea";

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

// Shown under each parcel in the table: product and recorded dose
const describeSpray = (record) =>
  `${record.drugName || "-"} · ${record.dose || 0} ${record.unit || ""}`;

const spraysValueExtractor = (record) =>
  convertToKilogram(parseFloat(record.dose) || 0, record.unit);

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

  // Multi-year data processing for both Pilot and Adjacent, using the same
  // shared utilities as Harvest/Irrigation/Fertilization (dataProcessing.js + chartConfig.js)
  const allYearsData = useMemo(
    () => processAllYearsData(
      availableYears,
      selectedRegion,
      selectedCropType,
      "sprays",
      spraysValueExtractor
    ),
    [availableYears, selectedRegion, selectedCropType]
  );

  const displayData = useMemo(
    () => getDisplayData(yearsToDisplay, allYearsData),
    [yearsToDisplay, allYearsData]
  );

  // Uses yearsToDisplay (not availableYears) so a single-year selection shows
  // that year's own rate instead of the rate pooled across all history.
  const averageBaseline = useMemo(
    () => calculateAverageBaseline(yearsToDisplay, allYearsData, NORMALIZATION_MODE),
    [yearsToDisplay, allYearsData]
  );

  const yearlyBaselines = useMemo(
    () => calculateYearlyBaselines(availableYears, allYearsData, selectedRegion, selectedCropType, NORMALIZATION_MODE),
    [availableYears, allYearsData, selectedRegion, selectedCropType]
  );

  const yearlyAverageBaselines = useMemo(
    () => calculateYearlyAverageBaselines(availableYears, averageBaseline, selectedRegion, selectedCropType),
    [availableYears, averageBaseline, selectedRegion, selectedCropType]
  );

  // Multi-year comparison column chart (Pilot vs Control avg dose)
  const multiYearChartOptions = useMemo(
    () => createAggregatedChartOptions({
      yearsToDisplay,
      displayData,
      selectedYear,
      averageBaseline,
      unit: "Kg/stremma",
      title: "Aggregated Pesticides: Quantitative Analysis",
      yAxisLabel: "Avg Pesticide Dose per Parcel (Kg/Stremma)",
      normalizationMode: NORMALIZATION_MODE
    }),
    [yearsToDisplay, displayData, selectedYear, averageBaseline]
  );

  // Yearly Baseline Chart (district-wide extrapolation)
  const yearlyBaselineChartOptions = useMemo(
    () => createYearlyBaselineChartOptions({
      yearsToDisplay,
      displayData,
      selectedYear,
      yearlyBaselines,
      yearlyAverageBaselines,
      averageBaseline,
      region: selectedRegion,
      cropType: selectedCropType,
      title: "Yearly Baseline Pesticide Consumption",
      yAxisLabel: "Baseline Pesticide Consumption (Kg)",
      normalizationMode: NORMALIZATION_MODE
    }),
    [yearsToDisplay, displayData, selectedYear, yearlyBaselines, yearlyAverageBaselines, averageBaseline, selectedRegion, selectedCropType]
  );

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
          <Paper sx={{ flex: 1, position: "relative" }}>
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
      {yearlyBaselineChartOptions && (
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

      {/* Pesticide spraying sensor charts - only for Farsalon region with Tomato crop */}
      {selectedRegion === "Farsalon" && selectedCropType === "Tomato" && (
        <Box sx={{ mb: 0.5, mt: 0.5 }}>
          <PesticideSprayingChart
            excelFilePath={dataset}
          />
        </Box>
      )}

      {/* Multi-Year Summary Table */}
      <LevelParcelTable
        years={yearsToDisplay}
        displayData={displayData}
        normalizationMode={NORMALIZATION_MODE}
        eventCountLabel="Number of Sprays"
        describeRecord={describeSpray}
        totalLabel="Total Dose (Kg)"
        averageLabel="Avg Dose per Parcel (Kg/Stremma)"
        exportFileName={`sprays_data_${selectedRegion}_${selectedCropType}_${selectedYear}`}
        emptyMessage="No spray data available"
      />
    </Box>
  );
};

export default SpraysComponent;
