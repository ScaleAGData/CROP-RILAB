import React, { useMemo, useRef } from "react";
import {
  Box,
  Paper
} from "@mui/material";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import { useSelection } from "../navigation/AnalysisLevel";
import { translate, mapping } from "../utils/translations";
import combined_data from "../../dataset/output_data.json";
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

// Fertilizer dose (lubrDose) is already recorded per stremma - almost every
// record carries magnReferenceDose: "Στρέμμα" - same as harvest/irrigation.
// So it must be averaged across parcels (perParcel), not divided by real
// area again, which would double-normalize an already-per-stremma value.
const NORMALIZATION_MODE = "perParcel";

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

const fertilizationValueExtractor = (record) =>
  convertToKilogram(parseFloat(record.lubrDose) || 0, record.magnSymbol);

// Shown under each parcel in the table: product and recorded dose per stremma
const describeFertilization = (record) =>
  `${record.tradeName || record.lutyDescription || "-"} · ${parseFloat(record.lubrDose) || 0} ${record.magnSymbol || ""}/stremma`;

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

  // Multi-year data processing for both Pilot and Adjacent, using the same
  // shared utilities as Harvest/Irrigation (dataProcessing.js + chartConfig.js)
  const allYearsData = useMemo(
    () => processAllYearsData(
      availableYears,
      selectedRegion,
      selectedCropType,
      "fertilization",
      fertilizationValueExtractor
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
      title: "Aggregated Fertilizers: Quantitative Analysis",
      yAxisLabel: "Avg Fertilizer Dose per Parcel (Kg/Stremma)",
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
      title: "Yearly Baseline Fertilizer Consumption",
      yAxisLabel: "Baseline Fertilizer Consumption (Kg)",
      normalizationMode: NORMALIZATION_MODE
    }),
    [yearsToDisplay, displayData, selectedYear, yearlyBaselines, yearlyAverageBaselines, averageBaseline, selectedRegion, selectedCropType]
  );

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
      <LevelParcelTable
        years={yearsToDisplay}
        displayData={displayData}
        normalizationMode={NORMALIZATION_MODE}
        eventCountLabel="Number of Applications"
        describeRecord={describeFertilization}
        totalLabel="Total Dose (Kg/Stremma)"
        averageLabel="Avg Dose per Parcel (Kg/Stremma)"
        exportFileName={`fertilization_data_${selectedRegion}_${selectedCropType}_${selectedYear}`}
        emptyMessage="No fertilization data available"
      />
    </Box>
  );
};

export default FertilizationComponent;