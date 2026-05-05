// components/BaseDataComponent.jsx
import React, { useMemo } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as XLSX from "xlsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
  tableColumns,
  getTableRowData,
  exportFileName
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
  const averageBaseline = useMemo(
    () => calculateAverageBaseline(availableYears, allYearsData),
    [availableYears, allYearsData]
  );

  const yearlyBaselines = useMemo(
    () => calculateYearlyBaselines(availableYears, allYearsData, selectedRegion, selectedCropType),
    [availableYears, allYearsData, selectedRegion, selectedCropType]
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
      yAxisLabel
    }),
    [yearsToDisplay, displayData, selectedYear, averageBaseline, unit, chartTitle, yAxisLabel]
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
      yAxisLabel: baselineYAxisLabel
    }),
    [yearsToDisplay, displayData, selectedYear, yearlyBaselines, yearlyAverageBaselines, 
     averageBaseline, selectedRegion, selectedCropType, baselineChartTitle, baselineYAxisLabel]
  );

  // ===== TABLE DATA =====
  const tableRows = useMemo(
    () => availableYears.flatMap(year => {
      const yearData = displayData[year];
      if (!yearData) return [];
      return getTableRowData(year, yearData);
    }),
    [availableYears, displayData, getTableRowData]
  );

  // ===== EXCEL EXPORT =====
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tableRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${exportFileName}_${selectedRegion}_${selectedCropType}_${selectedYear}.xlsx`);
  };

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
      <Paper sx={{ p: 0.5, mb: 0.1 }}>
        <HighchartsReact 
          key={`chart-${yearsToDisplay.join('-')}`}
          highcharts={Highcharts} 
          options={chartOptions} 
        />
      </Paper>

      {/* Chart 2: Yearly Baseline */}
      {(selectedYear === "all" || !selectedYear) && (
        <Paper sx={{ p: 0.5, mb: 2 }}>
          <HighchartsReact 
            key={`baseline-chart-${yearsToDisplay.join('-')}`}
            highcharts={Highcharts} 
            options={yearlyBaselineChartOptions} 
          />
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ mb: 0.5, mx: "auto", borderRadius: 0 }}>
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
          aria-label="data table"
        >
          <TableHead>
            <TableRow>
              {tableColumns.map((col, idx) => (
                <TableCell key={idx}>
                  {col}
                  {idx === tableColumns.length - 1 && (
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
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.length > 0 ? (
              tableRows.map((row, idx) => (
                <TableRow key={idx}>
                  {Object.values(row).map((value, cellIdx) => (
                    <TableCell key={cellIdx}>{value}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BaseDataComponent;