import React, { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import * as XLSX from "xlsx";

Highcharts.setOptions({ time: { useUTC: false } });

const ACTION_REGEX = /^(Water spraying|Pesticide spraying.*)$/i;
const CHART_YEARS = [2024, 2025];

const parseDose = (action) => {
  const match = action.match(/(\d+(\.\d+)?)\s*ml/i);
  return match ? parseFloat(match[1]) : null;
};

const parseTimestamp = (rawValue) => {
  if (!rawValue) return null;
  const str = String(rawValue).trim();
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
};

const groupByDate = (entries) => {
  const grouped = {};

  entries.forEach(({ date, dose }) => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const timeInHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

    if (!grouped[dateKey]) grouped[dateKey] = { times: [], dose };

    grouped[dateKey].times.push(timeInHours);
    if (dose > grouped[dateKey].dose) grouped[dateKey].dose = dose;
  });

  return Object.entries(grouped).map(([dateKey, { times, dose }]) => ({
    date: new Date(dateKey).getTime(),
    time: times.reduce((a, b) => a + b, 0) / times.length,
    count: times.length,
    dose,
  }));
};

const createEmptyYearEntries = () =>
  CHART_YEARS.reduce((acc, chartYear) => {
    acc[chartYear] = {
      waterEntries: [],
      pesticideLowEntries: [],
      pesticideHighEntries: [],
    };

    return acc;
  }, {});

const createEmptyYearData = () =>
  CHART_YEARS.reduce((acc, chartYear) => {
    acc[chartYear] = {
      waterData: [],
      pesticideLowData: [],
      pesticideHighData: [],
    };

    return acc;
  }, {});

const getYearTotal = (chartData) =>
  chartData.waterData.length + chartData.pesticideLowData.length + chartData.pesticideHighData.length;

const PesticideSprayingChart = ({ excelFilePath }) => {
  const [yearlyData, setYearlyData] = useState(createEmptyYearData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!excelFilePath) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(excelFilePath);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        const entriesByYear = createEmptyYearEntries();

        jsonData.forEach((row) => {
          const action = String(row.action || row["Action"] || "").trim();
          if (!ACTION_REGEX.test(action)) return;

          const rawTs = row.created_on || row["Created On"] || row["created_on"];
          const date = parseTimestamp(rawTs);
          if (!date) return;

          const chartYear = date.getFullYear();
          if (!entriesByYear[chartYear]) return;

          if (/^water spraying/i.test(action)) {
            entriesByYear[chartYear].waterEntries.push({ date, dose: 0 });
            return;
          }

          const dose = parseDose(action) || 1;
          if (dose <= 1) {
            entriesByYear[chartYear].pesticideLowEntries.push({ date, dose });
          } else {
            entriesByYear[chartYear].pesticideHighEntries.push({ date, dose });
          }
        });

        const nextYearlyData = CHART_YEARS.reduce((acc, chartYear) => {
          const entries = entriesByYear[chartYear];

          acc[chartYear] = {
            waterData: groupByDate(entries.waterEntries),
            pesticideLowData: groupByDate(entries.pesticideLowEntries),
            pesticideHighData: groupByDate(entries.pesticideHighEntries),
          };

          return acc;
        }, {});

        setYearlyData(nextYearlyData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadFile();
  }, [excelFilePath]);

  const makeTooltip = () => ({
    formatter: function () {
      const hours = Math.floor(this.y);
      const minutes = Math.round((this.y - hours) * 60);
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const doseStr = this.point.dose > 0 ? `<br/>Dose: ${this.point.dose}ml` : "";

      return `<b>${this.series.name}</b><br/>Date: ${Highcharts.dateFormat("%Y-%m-%d", this.x)}<br/>Time: ${timeStr}${doseStr}<br/>Events: ${this.point.count}`;
    },
  });

  const makeChartOptions = (chartYear, chartData) => ({
    chart: {
      type: "scatter",
      height: 420,
      zoomType: "xy",
      spacingLeft: 20,
      spacingRight: 20,
    },
    time: { useUTC: false },
    title: {
      text: `Pesticide Sensor Events<br/> Growing Season ${chartYear}`,
      style: { fontSize: "16px" },
    },
    xAxis: {
      type: "datetime",
      title: { text: "Date" },
      labels: { format: "{value:%Y-%m-%d}", rotation: -45, style: { fontSize: "10px" } },
      tickPixelInterval: 60,
      min: new Date(chartYear, 0, 1).getTime(),
      max: new Date(chartYear, 11, 31, 23, 59, 59).getTime(),
      minPadding: 0.1,
      maxPadding: 0.1,
    },
    yAxis: {
      title: { text: "Time of Day" },
      min: 0,
      max: 24,
      tickInterval: 2,
      labels: {
        formatter: function () {
          return `${String(Math.floor(this.value)).padStart(2, "0")}:00`;
        },
      },
    },
    tooltip: makeTooltip(),
    plotOptions: {
      scatter: {
        marker: { radius: 7, symbol: "circle" },
        states: { hover: { marker: { enabled: true } } },
      },
    },
    series: [
      {
        name: "Water Spraying",
        color: "#2979ff",
        data: chartData.waterData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: 0 })),
        marker: { fillOpacity: 0.85 },
      },
      {
        name: "Pesticide Normal<br/>(dose <= 1ml)",
        color: "#2e7d32",
        data: chartData.pesticideLowData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: d.dose })),
        marker: { fillOpacity: 0.85 },
      },
      {
        name: "Pesticide Overspray<br/>(dose > 1ml)",
        color: "#d32f2f",
        data: chartData.pesticideHighData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: d.dose })),
        marker: { fillOpacity: 0.85 },
      },
    ],
    legend: { enabled: true, align: "center", verticalAlign: "bottom" },
    credits: { enabled: false },
  });

  const totalEvents = CHART_YEARS.reduce((sum, chartYear) => sum + getYearTotal(yearlyData[chartYear]), 0);

  if (loading) {
    return (
      <Box sx={{ p: 5 }}>
        <Typography>Loading data...</Typography>
      </Box>
    );
  }

  if (error) return <Typography color="error">{error}</Typography>;

  if (totalEvents === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No spraying events found</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
        gap: 0.4,
        width: "100%",
      }}
    >
      {CHART_YEARS.map((chartYear) => {
        const chartData = yearlyData[chartYear];
        const yearTotal = getYearTotal(chartData);

        return (
          <Paper key={chartYear} elevation={4}>
            {yearTotal > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={makeChartOptions(chartYear, chartData)} />
            ) : (
              <Box
                sx={{
                  minHeight: 420,
                  p: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography>No spraying events found for {chartYear}</Typography>
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );
};

export default PesticideSprayingChart;
