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
  IconButton,
  Typography,
  Chip
} from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as XLSX from "xlsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useSelection } from "../navigation/AnalysisLevel";
import { formatRate } from "../utils/chartConfig";
import {
  getTwpEntries,
  getTwpYears,
  getWaterM3,
  summarizeTwpByYear,
  calculateRegionalAverageTwp
} from "../utils/twpProcessing";
import dhi_sm_data from "../../dataset/dhi_sm_data.json";

const PILOT_COLOR = "#8884d8";
const CONTROL_COLOR = "#82ca9d";
const REGIONAL_AVG_COLOR = "#d45087";
const ABOVE_COLOR = "#2e9e44";
const BELOW_COLOR = "#d62728";
const IRRIGATION_COLOR = "#2a9d8f";
// Rain in blue (water from the sky), irrigation in teal (water applied on the field)
const RAIN_COLOR = "#4a90e2";
const EFFECTIVE_RAIN_COLOR = "#1a4f8b";
const SENSOR_SM_COLOR = "#2f4b7c";
const DHI_SM_COLOR = "#ff7c43";
const DAY_MS = 24 * 3600 * 1000;

// Chart subtitles: the symbol on the left of a formula is bold
const TWP_FORMULA = "<b>TWP</b> = Y / (I + A × Peff)  [kg/m³]";
const TWP_SM_FORMULA = "<b>TWP_SM</b> = Y / (I + A × Peff − A × ΔS)";

const STATUS_COLORS = {
  ok: "success",
  incomplete: "warning",
  rainfed: "info",
  excluded: "default",
};

const tableSx = {
  borderCollapse: "separate",
  borderSpacing: 0,
  "& th, & td": {
    border: (theme) => `1px solid ${theme.palette.divider}`,
  },
  "& th": {
    backgroundColor: (theme) =>
      theme.palette.mode === "dark" ? theme.palette.grey[700] : theme.palette.grey[200],
    color: (theme) =>
      theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.common.black,
    fontWeight: "500",
    textTransform: "none",
    letterSpacing: "0.5px",
    padding: "12px",
  },
  "& tbody tr:hover": {
    backgroundColor: (theme) =>
      theme.palette.mode === "dark" ? theme.palette.grey[700] : theme.palette.grey[100],
  },
};

const formatValue = (value, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "-"
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const formatTwp = (value) => (value === null || value === undefined ? "-" : formatRate(value));

const levelLabel = (level) => (level === "Adjacent" ? "Control Parcels" : "Pilot Parcels");

const WaterProductivityComponent = () => {
  const { selectedRegion, selectedCropType, selectedYear, selectedField } = useSelection();

  // ===== DATA =====
  const entries = useMemo(
    () => getTwpEntries(selectedRegion, selectedCropType),
    [selectedRegion, selectedCropType]
  );

  const availableYears = useMemo(() => getTwpYears(entries), [entries]);

  const yearsToDisplay = useMemo(() => {
    if (selectedYear === "all" || !selectedYear) return availableYears;
    return availableYears.includes(String(selectedYear)) ? [String(selectedYear)] : [];
  }, [selectedYear, availableYears]);

  const summaries = useMemo(
    () => summarizeTwpByYear(entries, yearsToDisplay),
    [entries, yearsToDisplay]
  );

  // Avg Regional: yearly pooled Pilot + Control TWP, each year weighted by its crop classification area
  const regionalAverage = useMemo(
    () => calculateRegionalAverageTwp(summaries, yearsToDisplay, selectedRegion, selectedCropType),
    [summaries, yearsToDisplay, selectedRegion, selectedCropType]
  );

  // Selected parcel: every year of it, the selected year first in the table highlight
  const parcelEntries = useMemo(() => {
    if (!selectedField) return [];
    return entries
      .filter((entry) => entry.parcel_id === selectedField.parcel_id)
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [entries, selectedField]);

  const selectedParcelEntry = useMemo(
    () => parcelEntries.find((entry) => entry.year === String(selectedField?.year)) || null,
    [parcelEntries, selectedField]
  );

  // ===== CHART 1: TWP bars (Pilot / Control) with the Avg Regional line =====
  const twpChartOptions = useMemo(() => {
    const isSingleYear = yearsToDisplay.length === 1;
    // Each year's TWP compared with the regional average: % above (+) or below (-)
    const reference = regionalAverage.twp;
    const deviation = (twp) =>
      reference && twp !== null && twp !== undefined ? ((twp - reference) / reference) * 100 : null;
    const levelSeries = (level, color) => ({
      name: levelLabel(level),
      type: "column",
      color,
      data: yearsToDisplay.map((year) => summaries[year]?.[level].twp ?? null),
      custom: { counts: yearsToDisplay.map((year) => summaries[year]?.[level]) },
    });
    const series = [levelSeries("Pilot", PILOT_COLOR), levelSeries("Adjacent", CONTROL_COLOR)];

    if (regionalAverage.twp !== null) {
      series.push({
        name: "Avg Regional",
        type: "line",
        color: REGIONAL_AVG_COLOR,
        dashStyle: "LongDash",
        lineWidth: 2,
        marker: { enabled: false },
        dataLabels: { enabled: false },
        // With one category the line needs its own x values to span the plot
        data: isSingleYear
          ? [{ x: -0.5, y: regionalAverage.twp }, { x: 0.5, y: regionalAverage.twp }]
          : yearsToDisplay.map(() => regionalAverage.twp),
      });
    }

    return {
      chart: { animation: false },
      credits: { enabled: false },
      title: {
        text: `Total Water Productivity (${selectedYear === "all" || !selectedYear ? "All Years" : selectedYear})`,
      },
      subtitle: { text: TWP_FORMULA },
      xAxis: {
        categories: yearsToDisplay,
        title: { text: "Year" },
        min: isSingleYear ? -0.5 : undefined,
        max: isSingleYear ? 0.5 : undefined,
      },
      // Headroom so the labels of the tallest bars fit above them
      yAxis: { title: { text: "TWP (kg/m³)" }, min: 0, maxPadding: 0.15 },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
          if (!this.points?.length) return "";
          const index = Math.min(yearsToDisplay.length - 1, Math.max(0, Math.round(this.points[0].point.x)));
          let s = `<b>${yearsToDisplay[index]}</b><br/>`;
          this.points.forEach((point) => {
            if (point.series.name === "Avg Regional") {
              s += `<span style="color:${point.color}">●</span> Avg Regional: <b>${formatRate(point.y)} kg/m³</b> (yearly Pilot + Control TWP weighted by crop classification area)<br/>`;
              regionalAverage.usedYears.forEach(({ year, twp, cropArea }) => {
                s += `<span style="color:#666">${year}: ${formatRate(twp)} kg/m³ × ${formatValue(cropArea, 1)} stremma</span><br/>`;
              });
              s += `<span style="color:#666">÷ ${formatValue(regionalAverage.totalArea, 1)} stremma</span><br/>`;
              return;
            }
            const counts = point.series.options.custom?.counts?.[index];
            const parcels = counts ? ` (${counts.okParcels} of ${counts.totalParcels} parcels)` : "";
            s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${formatRate(point.y)} kg/m³</b>${parcels}<br/>`;
            const diff = point.series.name !== "Avg Regional" ? deviation(point.y) : null;
            if (diff !== null) {
              const color = diff >= 0 ? ABOVE_COLOR : BELOW_COLOR;
              s += `<span style="color:${color}">&nbsp;&nbsp;${diff >= 0 ? "+" : ""}${formatValue(diff, 1)}% ${diff >= 0 ? "above" : "below"} the regional average</span><br/>`;
            }
          });
          return s;
        },
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            // Above the bar, even on the tallest one
            inside: false,
            crop: false,
            overflow: "allow",
            style: { color: "#000000" },
            formatter: function () { return formatRate(this.y); },
          },
        },
      },
      series,
    };
  }, [yearsToDisplay, summaries, selectedYear, regionalAverage]);

  // ===== CHART 2: selected parcel monthly rain =====
  const parcelRainChartOptions = useMemo(() => {
    const months = Object.entries(selectedParcelEntry?.rain_months || {});
    if (months.length === 0) return null;

    return {
      chart: { type: "line", animation: false },
      credits: { enabled: false },
      title: { text: `Parcel ${selectedParcelEntry.parcel_id}: Rain in the Irrigation Window (${selectedParcelEntry.year})` },
      subtitle: {
        text: `${selectedParcelEntry.window.start} → ${selectedParcelEntry.window.end} · <b>Effective rain</b> = ${formatValue(selectedParcelEntry.P_eff_mm, 1)} mm`,
      },
      xAxis: { categories: months.map(([month]) => month), title: { text: "Month" } },
      yAxis: { title: { text: "Rain (mm)" }, min: 0 },
      tooltip: { shared: true, valueSuffix: " mm", valueDecimals: 1 },
      plotOptions: {
        line: {
          lineWidth: 3,
          marker: { enabled: true, radius: 4 },
          dataLabels: { enabled: true, format: "{point.y:.1f}" },
        },
      },
      series: [
        { name: "Total rain", color: RAIN_COLOR, data: months.map(([, m]) => m.P_m) },
        { name: "Effective rain", color: EFFECTIVE_RAIN_COLOR, data: months.map(([, m]) => m.P_eff_m) },
      ],
    };
  }, [selectedParcelEntry]);

  // ===== CHART 3: selected parcel soil moisture (our sensor vs DHI) with irrigation and rain below =====
  const parcelSoilMoistureChartOptions = useMemo(() => {
    const entry = selectedParcelEntry;
    const sensorDays = entry?.sm_daily || [];
    if (!entry?.window || sensorDays.length === 0) return null;

    // Same period as the sensor data: the irrigation window plus a margin on both sides
    const from = Date.parse(sensorDays[0].date);
    const to = Date.parse(sensorDays[sensorDays.length - 1].date);

    // DHI gives one value per ~10 day TIFF: drawn as a step over its interval
    const dhiIntervals = (dhi_sm_data[String(entry.parcel_id)] || []).filter(
      (interval) => Date.parse(interval.end) >= from && Date.parse(interval.start) <= to
    );
    const dhiPoint = (interval, x) => ({ x, y: interval.sm_pct, custom: interval });
    const dhiData = dhiIntervals.map((interval) => dhiPoint(interval, Date.parse(interval.start)));
    if (dhiIntervals.length > 0) {
      const last = dhiIntervals[dhiIntervals.length - 1];
      dhiData.push(dhiPoint(last, Date.parse(last.end) + DAY_MS));
    }

    const windowLine = (date, text) => ({
      value: Date.parse(date),
      color: "#888888",
      dashStyle: "Dash",
      width: 1,
      zIndex: 3,
      label: { text, rotation: 0, y: 12, style: { color: "#666", fontSize: "11px" } },
    });

    // Values used for ΔS, one marker per source on the first / last irrigation day.
    // Sensor: reading of that day. DHI: value of the ~10 day interval containing that day.
    const usedPoint = (source, color, date, y, which, interval) => ({
      x: Date.parse(date),
      y,
      color,
      custom: { source, which, date, interval },
    });
    const usedData = [
      ...(entry.delta_s_mm !== undefined
        ? [
            usedPoint("IoT sensor", SENSOR_SM_COLOR, entry.sm_start.date, entry.sm_start.sm_10, "start"),
            usedPoint("IoT sensor", SENSOR_SM_COLOR, entry.sm_end.date, entry.sm_end.sm_10, "end"),
          ]
        : []),
      ...(entry.delta_s_dhi_mm !== undefined
        ? [
            usedPoint("DHI", DHI_SM_COLOR, entry.window.start, entry.dhi_start.sm_pct, "start", entry.dhi_start),
            usedPoint("DHI", DHI_SM_COLOR, entry.window.end, entry.dhi_end.sm_pct, "end", entry.dhi_end),
          ]
        : []),
    ];

    // Subtitle: the TWP_SM formula, its numbers per source are in the table below the chart
    const subtitle = usedData.length > 0
      ? `${TWP_SM_FORMULA} · ◆ values used for ΔS`
      : "Sensor soil moisture at 10 cm and DHI satellite soil moisture";

    return {
      chart: { animation: false, height: 560 },
      credits: { enabled: false },
      title: { text: `Parcel ${entry.parcel_id}: Soil Moisture, Irrigation and Rain (${entry.year})` },
      subtitle: { text: subtitle, useHTML: true },
      xAxis: {
        type: "datetime",
        min: from,
        max: to + DAY_MS,
        plotLines: [
          windowLine(entry.window.start, "First irrigation"),
          windowLine(entry.window.end, "Last irrigation"),
        ],
      },
      yAxis: [
        { title: { text: "Soil moisture (%)" }, top: "0%", height: "62%", offset: 0 },
        // 1 mm of rain on 1 stremma is 1 m³, so irrigation and rain share this axis
        { title: { text: "Irrigation / Rain (mm)" }, top: "70%", height: "30%", offset: 0, min: 0 },
      ],
      tooltip: {
        useHTML: true,
        formatter: function () {
          const { series, point } = this;
          if (series.name === "Values used for ΔS") {
            const { source, which, date, interval } = point.custom;
            const when = interval ? `interval ${interval.start} → ${interval.end}` : date;
            return `<b>Used for ΔS (${which})</b><br/><span style="color:${point.color}">●</span> ` +
              `${source}, ${when}: <b>${formatValue(point.y, 2)} %</b>`;
          }
          if (series.name === "DHI") {
            const { start, end } = point.custom;
            return `<b>DHI ${start} → ${end}</b><br/>${formatValue(point.y, 2)} %`;
          }
          const day = Highcharts.dateFormat("%Y-%m-%d", point.x);
          const unit = { Irrigation: " m³/stremma", Rain: " mm" }[series.name] || " %";
          return `<b>${day}</b><br/><span style="color:${point.color}">●</span> ${series.name}: <b>${formatValue(point.y, 2)}${unit}</b>`;
        },
      },
      plotOptions: { series: { animation: false } },
      series: [
        {
          name: "IoT sensor (10 cm, daily mean)",
          type: "line",
          color: SENSOR_SM_COLOR,
          lineWidth: 2,
          marker: { enabled: false },
          data: sensorDays.map((d) => [Date.parse(d.date), d.sm_10]),
          yAxis: 0,
        },
        {
          name: "DHI",
          type: "line",
          step: "left",
          color: DHI_SM_COLOR,
          lineWidth: 2,
          marker: { enabled: false },
          data: dhiData,
          yAxis: 0,
          visible: dhiData.length > 0,
          showInLegend: dhiData.length > 0,
        },
        {
          name: "Values used for ΔS",
          type: "scatter",
          color: "#555555",
          marker: { symbol: "diamond", radius: 7, lineColor: "#000000", lineWidth: 1 },
          dataLabels: { enabled: true, format: "{point.y:.2f}%", style: { color: "#000000" } },
          data: usedData,
          yAxis: 0,
          zIndex: 5,
          visible: usedData.length > 0,
          showInLegend: usedData.length > 0,
        },
        {
          name: "Irrigation",
          type: "column",
          color: IRRIGATION_COLOR,
          pointWidth: 6,
          data: (entry.irrigations || []).map((i) => [Date.parse(i.date), i.m3_per_stremma]),
          yAxis: 1,
          stacking: "normal",
        },
        {
          name: "Rain",
          type: "column",
          color: RAIN_COLOR,
          pointWidth: 6,
          data: (entry.rain_daily || []).map((r) => [Date.parse(r.date), r.rain_mm]),
          yAxis: 1,
          // Stacked on irrigation when both fall on the same day
          stacking: "normal",
        },
      ],
    };
  }, [selectedParcelEntry]);

  // ===== TWP_SM comparison, IoT sensor vs DHI (below the soil moisture chart) =====
  // Same yield and same irrigation + rain for both, only the soil term differs:
  // water used = I + A × Peff − A × ΔS, TWP_SM = Y / water used
  const smComparison = useMemo(() => {
    const entry = selectedParcelEntry;
    if (!entry || entry.twp === undefined || entry.twp === null) return null;
    const baseWater = getWaterM3(entry);
    const source = (name, color, deltaS, soilM3, twpSm, start, end) =>
      deltaS === undefined
        ? null
        : {
            name, color, deltaS, soilM3, twpSm, start, end,
            water: baseWater + soilM3,
            vsTwp: twpSm ? ((twpSm - entry.twp) / entry.twp) * 100 : null,
          };
    const sources = [
      source("IoT sensor (10 cm)", SENSOR_SM_COLOR, entry.delta_s_mm, entry.soil_m3, entry.twp_sm,
        entry.sm_start?.sm_10, entry.sm_end?.sm_10),
      source("DHI", DHI_SM_COLOR, entry.delta_s_dhi_mm, entry.soil_dhi_m3, entry.twp_sm_dhi,
        entry.dhi_start?.sm_pct, entry.dhi_end?.sm_pct),
    ].filter(Boolean);
    if (sources.length === 0) return null;
    return { baseWater, twp: entry.twp, sources };
  }, [selectedParcelEntry]);

  // ===== TABLE =====
  const tableRows = useMemo(
    () => yearsToDisplay.flatMap((year) =>
      ["Pilot", "Adjacent"]
        .filter((level) => summaries[year]?.[level].totalParcels > 0)
        .map((level) => ({ key: `${year}-${level}`, year, level, ...summaries[year][level] }))
    ),
    [yearsToDisplay, summaries]
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      tableRows.map((row) => ({
        Year: row.year,
        "Analysis Level": levelLabel(row.level),
        "Parcels with TWP": `${row.okParcels} / ${row.totalParcels}`,
        "Yield (kg/stremma)": formatValue(row.yieldPerStremma, 1),
        "Irrigation (m³/stremma)": formatValue(row.irrigationPerStremma, 1),
        "Effective Rain (mm)": formatValue(row.rainPerStremma, 1),
        "TWP (kg/m³)": formatTwp(row.twp),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Water Productivity");
    XLSX.writeFile(wb, `water_productivity_${selectedRegion}_${selectedCropType}_${selectedYear}.xlsx`);
  };

  // ===== RENDER =====
  if (!selectedRegion || !selectedCropType) {
    return (
      <Typography align="center" sx={{ py: 3 }} color="text.secondary">
        Select a region and crop to view water productivity
      </Typography>
    );
  }

  if (entries.length === 0) {
    return (
      <Typography align="center" sx={{ py: 3 }} color="text.secondary">
        No water productivity data for {selectedRegion} / {selectedCropType}
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "90%", mb: 3, mx: "auto", border: "1px solid", borderColor: "divider", borderRadius: 0.5 }}>
      {/* Chart 1: TWP curves */}
      <Paper sx={{ p: 0.5, mb: 0.1 }}>
        <HighchartsReact
          key={`twp-chart-${yearsToDisplay.join("-")}`}
          highcharts={Highcharts}
          options={twpChartOptions}
        />
      </Paper>

      {/* Aggregated table */}
      <TableContainer component={Paper} sx={{ mb: 0.5, mx: "auto", borderRadius: 0 }}>
        <Table stickyHeader sx={tableSx} aria-label="water productivity table">
          <TableHead>
            <TableRow>
              <TableCell>Year</TableCell>
              <TableCell>Analysis Level</TableCell>
              <TableCell>Parcels with TWP</TableCell>
              <TableCell>Yield (kg/stremma)</TableCell>
              <TableCell>Irrigation (m³/stremma)</TableCell>
              <TableCell>Effective Rain (mm)</TableCell>
              <TableCell sx={{ position: "relative", pr: 6 }}>
                TWP (kg/m³)
                <Tooltip title="Export to Excel">
                  <IconButton
                    size="small"
                    onClick={exportToExcel}
                    disabled={tableRows.length === 0}
                    sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.length > 0 ? (
              tableRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{levelLabel(row.level)}</TableCell>
                  <TableCell>{row.okParcels} / {row.totalParcels}</TableCell>
                  <TableCell>{formatValue(row.yieldPerStremma, 1)}</TableCell>
                  <TableCell>{formatValue(row.irrigationPerStremma, 1)}</TableCell>
                  <TableCell>{formatValue(row.rainPerStremma, 1)}</TableCell>
                  <TableCell>{formatTwp(row.twp)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">No water productivity data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Selected parcel */}
      <Paper sx={{ p: 1, mt: 1, borderRadius: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {selectedField ? `Selected Parcel ${selectedField.parcel_id}` : "Selected Parcel"}
        </Typography>

        {!selectedField ? (
          <Typography color="text.secondary">
            Select a parcel in the Field Dashboard to see its water productivity.
          </Typography>
        ) : parcelEntries.length === 0 ? (
          <Typography color="text.secondary">No water productivity data for this parcel.</Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small" sx={tableSx} aria-label="selected parcel water productivity">
                <TableHead>
                  <TableRow>
                    <TableCell>Year</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Area (stremma)</TableCell>
                    <TableCell>Yield Y (kg)</TableCell>
                    <TableCell>Irrigation I (m³)</TableCell>
                    <TableCell>Effective Rain (mm)</TableCell>
                    <TableCell>Rain (m³)</TableCell>
                    <TableCell>Total Water (m³)</TableCell>
                    <TableCell>TWP (kg/m³)</TableCell>
                    <TableCell>ΔS (mm)</TableCell>
                    <TableCell>TWP_SM (kg/m³)</TableCell>
                    <TableCell>ΔS DHI (mm)</TableCell>
                    <TableCell>TWP_SM DHI (kg/m³)</TableCell>
                    <TableCell>Irrigation Window</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parcelEntries.map((entry) => (
                    <TableRow
                      key={`${entry.level}-${entry.year}`}
                      sx={{
                        backgroundColor:
                          entry.year === String(selectedField.year) ? "rgba(33, 150, 243, 0.1)" : "inherit",
                      }}
                    >
                      <TableCell>{entry.year}</TableCell>
                      <TableCell>{levelLabel(entry.level).replace(" Parcels", "")}</TableCell>
                      <TableCell>{formatValue(entry.A_stremmata, 2)}</TableCell>
                      <TableCell>{formatValue(entry.Y_kg, 0)}</TableCell>
                      <TableCell>{formatValue(entry.I_m3, 1)}</TableCell>
                      <TableCell>{formatValue(entry.P_eff_mm, 1)}</TableCell>
                      <TableCell>{formatValue(entry.rain_m3, 1)}</TableCell>
                      <TableCell>{entry.status === "ok" ? formatValue(getWaterM3(entry), 1) : "-"}</TableCell>
                      <TableCell><b>{formatTwp(entry.twp)}</b></TableCell>
                      <TableCell>{formatValue(entry.delta_s_mm, 2)}</TableCell>
                      <TableCell><b>{formatTwp(entry.twp_sm)}</b></TableCell>
                      <TableCell>{formatValue(entry.delta_s_dhi_mm, 2)}</TableCell>
                      <TableCell><b>{formatTwp(entry.twp_sm_dhi)}</b></TableCell>
                      <TableCell>
                        {entry.window
                          ? `${entry.window.start} → ${entry.window.end} (${entry.window.days} d, ${entry.window.irrigation_events} irr.)`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {parcelSoilMoistureChartOptions && (
              <Box sx={{ mt: 1 }}>
                <HighchartsReact
                  key={`twp-parcel-sm-${selectedParcelEntry.parcel_id}-${selectedParcelEntry.year}`}
                  highcharts={Highcharts}
                  options={parcelSoilMoistureChartOptions}
                />
              </Box>
            )}

            {smComparison && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  TWP_SM: IoT sensor vs DHI
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Same yield, irrigation and rain for both. Only the soil water term differs: TWP_SM goes
                  above TWP when the soil kept water, and below TWP when the crop took water from the soil.
                </Typography>
                <TableContainer>
                  <Table size="small" sx={tableSx} aria-label="TWP_SM comparison">
                    <TableHead>
                      <TableRow>
                        <TableCell>Soil moisture source</TableCell>
                        <TableCell>Soil moisture start → end (%)</TableCell>
                        <TableCell>ΔS (mm)</TableCell>
                        <TableCell>Soil water (m³)</TableCell>
                        <TableCell>Water used (m³)</TableCell>
                        <TableCell>TWP_SM (kg/m³)</TableCell>
                        <TableCell>vs TWP</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>No soil term (TWP)</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{formatValue(smComparison.baseWater, 1)}</TableCell>
                        <TableCell><b>{formatTwp(smComparison.twp)}</b></TableCell>
                        <TableCell>reference</TableCell>
                      </TableRow>
                      {smComparison.sources.map((s) => (
                        <TableRow key={s.name}>
                          <TableCell>
                            <Box component="span" sx={{ color: s.color, mr: 0.5 }}>●</Box>
                            {s.name}
                          </TableCell>
                          <TableCell>{formatValue(s.start, 2)} → {formatValue(s.end, 2)}</TableCell>
                          <TableCell>{s.deltaS >= 0 ? "+" : ""}{formatValue(s.deltaS, 2)}</TableCell>
                          <TableCell>
                            {s.soilM3 >= 0 ? "+" : ""}{formatValue(s.soilM3, 1)}
                            {" "}({s.soilM3 >= 0 ? "taken from soil" : "stored in soil"})
                          </TableCell>
                          <TableCell>{formatValue(s.water, 1)}</TableCell>
                          <TableCell><b>{formatTwp(s.twpSm)}</b></TableCell>
                          <TableCell sx={{ color: s.vsTwp >= 0 ? ABOVE_COLOR : BELOW_COLOR }}>
                            {s.vsTwp === null ? "-" : `${s.vsTwp >= 0 ? "+" : ""}${formatValue(s.vsTwp, 1)}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {parcelRainChartOptions && (
              <Box sx={{ mt: 1 }}>
                <HighchartsReact
                  key={`twp-parcel-rain-${selectedParcelEntry.parcel_id}-${selectedParcelEntry.year}`}
                  highcharts={Highcharts}
                  options={parcelRainChartOptions}
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default WaterProductivityComponent;
