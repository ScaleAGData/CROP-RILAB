import React, { useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import * as XLSX from "xlsx";

Highcharts.setOptions({ time: { useUTC: false } });

// Regex to match only "Water spraying" or "Pesticide spraying ..."
const ACTION_REGEX = /^(Water spraying|Pesticide spraying.*)$/i;

// Extract dose number from action string e.g. "Pesticide spraying 2ml" → 2
const parseDose = (action) => {
  const match = action.match(/(\d+(\.\d+)?)\s*ml/i);
  return match ? parseFloat(match[1]) : null;
};

const parseTimestamp = (rawValue) => {
  if (!rawValue) return null;
  // Handles both "2024-09-05 11:46:46.308" and "7/12/2024 11:12"
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
    // Keep max dose for the day
    if (dose > grouped[dateKey].dose) grouped[dateKey].dose = dose;
  });

  return Object.entries(grouped).map(([dateKey, { times, dose }]) => ({
    date: new Date(dateKey).getTime(),
    time: times.reduce((a, b) => a + b, 0) / times.length,
    count: times.length,
    dose,
  }));
};

const PesticideSprayingChart = ({ excelFilePath, region, cropType, year }) => {
  // Three pesticide series: dose=1 (green), dose>1 (red), water (blue)
  const [waterData, setWaterData] = useState([]);
  const [pesticideLowData, setPesticideLowData] = useState([]);  // dose === 1 → green
  const [pesticideHighData, setPesticideHighData] = useState([]); // dose > 1  → red
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!excelFilePath) return;
      try {
        const response = await fetch(excelFilePath);
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // Only pick the two columns we need
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        const waterEntries = [];
        const pesticideLowEntries = [];
        const pesticideHighEntries = [];

        jsonData.forEach((row) => {
          const action = String(row.action || row["Action"] || "").trim();
          if (!ACTION_REGEX.test(action)) return;

          const rawTs = row.created_on || row["Created On"] || row["created_on"];
          const date = parseTimestamp(rawTs);
          if (!date) return;

          if (/^water spraying/i.test(action)) {
            waterEntries.push({ date, dose: 0 });
          } else {
            // Pesticide spraying
            const dose = parseDose(action) || 1;
            if (dose <= 1) {
              pesticideLowEntries.push({ date, dose });
            } else {
              pesticideHighEntries.push({ date, dose });
            }
          }
        });

        setWaterData(groupByDate(waterEntries));
        setPesticideLowData(groupByDate(pesticideLowEntries));
        setPesticideHighData(groupByDate(pesticideHighEntries));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadFile();
  }, [excelFilePath]);

  const totalEvents = waterData.length + pesticideLowData.length + pesticideHighData.length;

  const makeTooltip = () => ({
    formatter: function () {
      const hours = Math.floor(this.y);
      const minutes = Math.round((this.y - hours) * 60);
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const doseStr = this.point.dose > 0 ? `<br/>Dose: ${this.point.dose}ml` : "";
      return `<b>${this.series.name}</b><br/>Date: ${Highcharts.dateFormat("%Y-%m-%d", this.x)}<br/>Time: ${timeStr}${doseStr}<br/>Events: ${this.point.count}`;
    },
  });

  const chartOptions = {
    chart: { type: "scatter", height: 450, zoomType: "xy", spacingLeft: 20, spacingRight: 20 },
    time: { useUTC: false },
    title: {
      text: `Pesticide Sensor Events </br> ${"2024-2025"}`,
    },
    xAxis: {
      type: "datetime",
      title: { text: "Date" },
      labels: { format: "{value:%Y-%m-%d}", rotation: -45, style: { fontSize: "10px" } },
      tickPixelInterval: 60,
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
      }
    },
    series: [
      {
        name: "Water Spraying",
        color: "#2979ff",
        data: waterData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: 0 })),
        marker: { fillOpacity: 0.85 },
      },
      {
        name: "Pesticide Normal </br> (dose ≤ 1ml)",
        color: "#2e7d32",
        data: pesticideLowData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: d.dose })),
        marker: { fillOpacity: 0.85 },
      },
      {
        name: "Pesticide Overspray </br> (dose > 1ml)",
        color: "#d32f2f",
        data: pesticideHighData.map((d) => ({ x: d.date, y: d.time, count: d.count, dose: d.dose })),
        marker: { fillOpacity: 0.85 },
      },
    ],
    legend: { enabled: true, align: "center", verticalAlign: "bottom" },
    credits: { enabled: false },
  };

  if (loading) return <Box sx={{ p: 5 }}><Typography>Loading data…</Typography></Box>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (totalEvents === 0) return <Box sx={{ p: 3 }}><Typography>No spraying events found</Typography></Box>;

  return (
    <Box sx={{ width: "100%" }}>
      <Paper elevation={4}>
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </Paper>
    </Box>
  );
};

export default PesticideSprayingChart;