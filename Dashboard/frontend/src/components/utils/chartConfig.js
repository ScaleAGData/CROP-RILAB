// utils/chartConfig.js
import { getBaselineMultiplier, getLevelValue, getLevelDenominator } from "./dataProcessing";

/**
 * Format a rate value (e.g. kg/stremma) with enough decimals to stay visible
 * when small, instead of a fixed 1 decimal that rounds small-but-real values
 * (like 0.0135) down to a misleading "0.0".
 */
export const formatRate = (value) => {
  const absValue = Math.abs(value);
  if (absValue === 0) return "0.0";
  if (absValue < 0.1) return value.toFixed(3);
  if (absValue < 10) return value.toFixed(2);
  return value.toFixed(1);
};

/**
 * Shorten large numbers for chart labels: 23245245 -> "23.2M", 15400 -> "15.4k"
 */
export const formatCompact = (value) => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return (value / 1e9).toFixed(1) + "B";
  if (absValue >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (absValue >= 1e3) return (value / 1e3).toFixed(1) + "k";
  return value.toFixed(1);
};

/**
 * Generate aggregated chart options
 */
export const createAggregatedChartOptions = ({
  yearsToDisplay,
  displayData,
  selectedYear,
  averageBaseline,
  unit,
  title,
  yAxisLabel,
  normalizationMode = "perArea",
  largeUnit
}) => {
  const isSingleYear = yearsToDisplay.length === 1;

  // Switch the whole chart to a larger unit (e.g. kg -> t) once any value reaches
  // largeUnit.threshold, so bars, labels, tooltip and axis all share one unit
  const rawValues = yearsToDisplay.flatMap(year => [
    getLevelValue(displayData[year]?.Pilot, normalizationMode),
    getLevelValue(displayData[year]?.Adjacent, normalizationMode)
  ]).concat(averageBaseline);
  const useLargeUnit = Boolean(largeUnit) && Math.max(...rawValues) >= largeUnit.threshold;
  const scale = useLargeUnit ? largeUnit.divisor : 1;
  if (useLargeUnit) {
    unit = largeUnit.unit;
    yAxisLabel = largeUnit.yAxisLabel;
  }
  const levelValue = (levelData) => getLevelValue(levelData, normalizationMode) / scale;
  const scaledBaseline = averageBaseline / scale;

  const columnSeries = [
    {
      name: "Pilot Parcels",
      data: yearsToDisplay.map(year => levelValue(displayData[year]?.Pilot)),
      color: "#8884d8",
      type: "column",
      custom: {
        parcelsWithData: yearsToDisplay.map(year => displayData[year]?.Pilot?.parcelCount || 0)
      },
    },
    {
      name: "Control Parcels",
      data: yearsToDisplay.map(year => levelValue(displayData[year]?.Adjacent)),
      color: "#82ca9d",
      type: "column",
      custom: {
        parcelsWithData: yearsToDisplay.map(year => displayData[year]?.Adjacent?.parcelCount || 0)
      },
    },
  ];

  const baselineData = isSingleYear 
    ? [
        { x: -0.5, y: scaledBaseline },
        { x: 0, y: scaledBaseline },
        { x: 0.5, y: scaledBaseline }
      ]
    : yearsToDisplay.map(() => scaledBaseline);

  const baselineSeries = {
    name: "Baseline",
    data: baselineData,
    type: "line",
    color: "#888888",
    dashStyle: "Dash",
    marker: { enabled: false },
    lineWidth: 2
  };

  return {
    chart: { animation: false },
    credits: { enabled: false },
    title: {
      text: selectedYear === "all" || !selectedYear 
        ? `${title} (All Years)` 
        : `${title} (${selectedYear})`,
    },
    xAxis: {
      categories: yearsToDisplay,
      title: { text: "Year" },
      min: isSingleYear ? -0.5 : undefined,
      max: isSingleYear ? 0.5 : undefined,
    },
    yAxis: {
      title: { text: yAxisLabel },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      padding: 8,
      formatter: function() {
        if (!this.points || this.points.length === 0) return '';
        
        const year = isSingleYear ? yearsToDisplay[0] : yearsToDisplay[this.points[0].point.index];
        const pointIndex = isSingleYear ? 0 : this.points[0].point.index;
        let s = `<div><b>${year}</b><br/>`;
        
        if (isSingleYear && this.points) {
          const pilotValue = levelValue(displayData[year]?.Pilot);
          const pilotParcels = displayData[year]?.Pilot?.parcelCount || 0;
          const adjacentValue = levelValue(displayData[year]?.Adjacent);
          const adjacentParcels = displayData[year]?.Adjacent?.parcelCount || 0;
          const totalParcels = pilotParcels + adjacentParcels;
          
          s += `<span style="color:#8884d8">●</span> Pilot Parcels: <b>${formatRate(pilotValue)} ${unit}</b> (${pilotParcels} parcels)<br/>`;
          s += `<span style="color:#82ca9d">●</span> Control Parcels: <b>${formatRate(adjacentValue)} ${unit}</b> (${adjacentParcels} parcels)<br/>`;
          s += `<span style="color:#888888">●</span> Baseline: <b>${formatRate(scaledBaseline)} ${unit}</b> (${isSingleYear ? year : "avg across all years"})<br/>`;
          s += `<span style="color:#333333">●</span> Total Parcels: <b>${totalParcels}</b><br/>`;
        } else {
          this.points.forEach(point => {
            if (point.series.name.includes('Baseline')) {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${formatRate(point.y)} ${unit}</b> (avg across all years)<br/>`;
            } else {
              const parcelsWithData = point.series.options.custom?.parcelsWithData?.[pointIndex] || 0;
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${formatRate(point.y)} ${unit}</b> (${parcelsWithData} parcels)<br/>`;
            }
          });
          
          const totalParcels = this.points
            .filter(p => !p.series.name.includes('Baseline'))
            .reduce((sum, p) => sum + (p.series.options.custom?.parcelsWithData?.[pointIndex] || 0), 0);
          s += `<span style="color:#333333">●</span> Total Parcels: <b>${totalParcels}</b></div>`;
        }
        
        return s;
      }
    },
    plotOptions: {
      column: {
        dataLabels: { enabled: true, formatter: function() { return formatRate(this.y); } }
      },
      line: {
        dataLabels: { enabled: false }
      },
    },
    series: [...columnSeries, baselineSeries],
  };
};

/**
 * Generate yearly baseline chart options
 */
export const createYearlyBaselineChartOptions = ({
  yearsToDisplay,
  displayData,
  selectedYear,
  yearlyBaselines,
  yearlyAverageBaselines,
  averageBaseline,
  region,
  cropType,
  title,
  yAxisLabel,
  normalizationMode = "perArea"
}) => {
  const isSingleYear = yearsToDisplay.length === 1;
  
  return {
    chart: { animation: false },
    credits: { enabled: false },
    title: {
      text: selectedYear === "all" || !selectedYear 
        ? `${title} (All Years)` 
        : `${title} (${selectedYear})`,
    },
    xAxis: {
      categories: yearsToDisplay,
      title: { text: "Year" },
      min: isSingleYear ? -0.5 : undefined,
      max: isSingleYear ? 0.5 : undefined,
    },
    yAxis: {
      title: { text: yAxisLabel },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      padding: 8,
      formatter: function() {
        if (!this.points || this.points.length === 0) return '';
        
        const year = isSingleYear ? yearsToDisplay[0] : yearsToDisplay[this.points[0].point.index];
        const yearData = displayData[year];
        const totalValue = (yearData?.Pilot?.totalValue || 0) + (yearData?.Adjacent?.totalValue || 0);
        const totalDenominator =
          getLevelDenominator(yearData?.Pilot, normalizationMode) +
          getLevelDenominator(yearData?.Adjacent, normalizationMode);
        const yearRate = totalDenominator > 0 ? totalValue / totalDenominator : 0;
        const multiplier = getBaselineMultiplier(region, cropType, year);
        const yearlyBaseline = yearlyBaselines[year] || 0;
        const avgBaseline = yearlyAverageBaselines[year] || 0;

        let s = `<div><b>${year}</b><br/>`;
        s += `<span style="color:#ff7c43">●</span> Yearly Baseline: <b>${yearlyBaseline.toFixed(1)}</b><br/>`;
        s += `<span style="color:#666">Formula: ${formatRate(yearRate)} × ${multiplier.toFixed(1)} stremma</span><br/>`;
        s += `<span style="color:#4a90e2">●</span> Avg Baseline × Crop Area: <b>${avgBaseline.toFixed(1)}</b><br/>`;
        s += `<span style="color:#666">Formula: ${formatRate(averageBaseline)} × ${multiplier.toFixed(1)} stremma</span><br/>`;
        s += `<span style="color:#666">Crop Area: ${multiplier.toFixed(1)} stremma</span>`;
        s += `</div>`;
        
        return s;
      }
    },
    plotOptions: {
      line: {
        dataLabels: { 
          enabled: true, 
          formatter: function() { return formatCompact(this.y); },
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
};