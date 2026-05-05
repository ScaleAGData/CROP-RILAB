// utils/chartConfig.js
import { getBaselineMultiplier } from "./dataProcessing";

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
  yAxisLabel
}) => {
  const isSingleYear = yearsToDisplay.length === 1;
  
  const columnSeries = [
    {
      name: "Pilot Parcels",
      data: yearsToDisplay.map(year => displayData[year]?.Pilot?.totalValue || 0),
      color: "#8884d8",
      type: "column",
      custom: {
        parcelsWithData: yearsToDisplay.map(year => displayData[year]?.Pilot?.parcelCount || 0)
      },
    },
    {
      name: "Control Parcels",
      data: yearsToDisplay.map(year => displayData[year]?.Adjacent?.totalValue || 0),
      color: "#82ca9d",
      type: "column",
      custom: {
        parcelsWithData: yearsToDisplay.map(year => displayData[year]?.Adjacent?.parcelCount || 0)
      },
    },
  ];

  const baselineData = isSingleYear 
    ? [
        { x: -0.5, y: averageBaseline },
        { x: 0, y: averageBaseline },
        { x: 0.5, y: averageBaseline }
      ]
    : yearsToDisplay.map(() => averageBaseline);

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
          const pilotValue = displayData[year]?.Pilot?.totalValue || 0;
          const pilotParcels = displayData[year]?.Pilot?.parcelCount || 0;
          const adjacentValue = displayData[year]?.Adjacent?.totalValue || 0;
          const adjacentParcels = displayData[year]?.Adjacent?.parcelCount || 0;
          const totalParcels = pilotParcels + adjacentParcels;
          
          s += `<span style="color:#8884d8">●</span> Pilot Parcels: <b>${pilotValue.toFixed(1)} ${unit}</b> (${pilotParcels} parcels)<br/>`;
          s += `<span style="color:#82ca9d">●</span> Control Parcels: <b>${adjacentValue.toFixed(1)} ${unit}</b> (${adjacentParcels} parcels)<br/>`;
          s += `<span style="color:#888888">●</span> Avg Baseline: <b>${averageBaseline.toFixed(1)} ${unit}</b> (avg across all years)<br/>`;
          s += `<span style="color:#333333">●</span> Total Parcels: <b>${totalParcels}</b><br/>`;
        } else {
          this.points.forEach(point => {
            if (point.series.name.includes('Baseline')) {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toFixed(1)} ${unit}</b> (avg across all years)<br/>`;
            } else {
              const parcelsWithData = point.series.options.custom?.parcelsWithData?.[pointIndex] || 0;
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toFixed(1)} ${unit}</b> (${parcelsWithData} parcels)<br/>`;
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
        dataLabels: { enabled: true, format: "{point.y:.1f}" }
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
  yAxisLabel
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
        const totalParcelArea = (yearData?.Pilot?.totalParcelArea || 0) + (yearData?.Adjacent?.totalParcelArea || 0);
        const multiplier = getBaselineMultiplier(region, cropType, year);
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
};