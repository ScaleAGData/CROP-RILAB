// components/BaseDataComponent.jsx
import React, { useMemo } from "react";
import { Box, Paper } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useSelection } from "../navigation/AnalysisLevel";
import {
  getAvailableYears,
  getYearsToDisplay,
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

/**
 * Base component for data visualization (harvest/irrigation/etc)
 */
const BaseDataComponent = ({
  eventType,
  valueExtractor,
  unit,
  chartTitle,
  yAxisLabel,
  baselineChartTitle,
  baselineYAxisLabel,
  exportFileName,
  normalizationMode = "perArea",
  totalLabel,
  averageLabel,
  eventCountLabel,
  describeRecord,
  largeUnit
}) => {
  const { selectedRegion, selectedCropType, selectedYear, parcelData } = useSelection();

  // ===== YEAR MANAGEMENT =====
  const availableYears = useMemo(
    () => getAvailableYears(selectedRegion, selectedCropType, parcelData),
    [selectedRegion, selectedCropType, parcelData]
  );

  const yearsToDisplay = useMemo(
    () => getYearsToDisplay(selectedYear, availableYears),
    [selectedYear, availableYears]
  );

  // ===== DATA PROCESSING =====
  const allYearsData = useMemo(
    () => processAllYearsData(
      availableYears,
      selectedRegion,
      selectedCropType,
      eventType,
      valueExtractor
    ),
    [availableYears, selectedRegion, selectedCropType, eventType, valueExtractor]
  );

  const displayData = useMemo(
    () => getDisplayData(yearsToDisplay, allYearsData),
    [yearsToDisplay, allYearsData]
  );

  // ===== BASELINE CALCULATION =====
  // Uses yearsToDisplay (not availableYears) so a single-year selection shows
  // that year's own rate instead of the rate pooled across all history.
  const averageBaseline = useMemo(
    () => calculateAverageBaseline(yearsToDisplay, allYearsData, normalizationMode),
    [yearsToDisplay, allYearsData, normalizationMode]
  );

  const yearlyBaselines = useMemo(
    () => calculateYearlyBaselines(availableYears, allYearsData, selectedRegion, selectedCropType, normalizationMode),
    [availableYears, allYearsData, selectedRegion, selectedCropType, normalizationMode]
  );

  const yearlyAverageBaselines = useMemo(
    () => calculateYearlyAverageBaselines(availableYears, averageBaseline, selectedRegion, selectedCropType),
    [availableYears, averageBaseline, selectedRegion, selectedCropType]
  );

  // ===== CHART CONFIGURATION =====
  const chartOptions = useMemo(
    () => createAggregatedChartOptions({
      yearsToDisplay,
      displayData,
      selectedYear,
      averageBaseline,
      unit,
      title: chartTitle,
      yAxisLabel,
      normalizationMode,
      largeUnit
    }),
    [yearsToDisplay, displayData, selectedYear, averageBaseline, unit, chartTitle, yAxisLabel, normalizationMode, largeUnit]
  );

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
      title: baselineChartTitle,
      yAxisLabel: baselineYAxisLabel,
      normalizationMode
    }),
    [yearsToDisplay, displayData, selectedYear, yearlyBaselines, yearlyAverageBaselines,
     averageBaseline, selectedRegion, selectedCropType, baselineChartTitle, baselineYAxisLabel, normalizationMode]
  );

  // ===== RENDER =====
  return (
    <Box
      sx={{
        width: "90%",
        mb: 3,
        mx: "auto",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0.5,
      }}
    >
      {/* Chart 1: Aggregated Data */}
      <Paper sx={{ p: 0.5, mb: 0.1, position: "relative" }}>
        <HighchartsReact
          key={`chart-${yearsToDisplay.join('-')}`}
          highcharts={Highcharts}
          options={chartOptions}
        />
      </Paper>

      {/* Chart 2: Yearly Baseline */}
      {yearlyBaselineChartOptions && (
        <Paper sx={{ p: 0.5, mb: 2 }}>
          <HighchartsReact 
            key={`baseline-chart-${yearsToDisplay.join('-')}`}
            highcharts={Highcharts} 
            options={yearlyBaselineChartOptions} 
          />
        </Paper>
      )}

      {/* Table */}
      <LevelParcelTable
        years={availableYears}
        displayData={displayData}
        normalizationMode={normalizationMode}
        eventCountLabel={eventCountLabel}
        describeRecord={describeRecord}
        totalLabel={totalLabel}
        averageLabel={averageLabel}
        exportFileName={`${exportFileName}_${selectedRegion}_${selectedCropType}_${selectedYear}`}
      />
    </Box>
  );
};

export default BaseDataComponent;