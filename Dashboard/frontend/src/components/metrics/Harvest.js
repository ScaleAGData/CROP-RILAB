import React from "react";
import BaseDataComponent from "./BaseFieldOperations";

// Harvest unit -> [factor to kg, is per stremma] (same table as data_extraction/compute_twp.py)
const HARVEST_UNITS = {
  "kg": [1, false],
  "tn": [1000, false],
  "kg/Στρέμμα": [1, true],
  "tn/Στρέμμα": [1000, true],
};

// Shown under each parcel in the table: the recorded quantity and unit
const describeHarvest = (record) => {
  const unit = (record.magnSymbol || "kg/Στρέμμα").replace("Στρέμμα", "stremma");
  return `${record.quantity || 0} ${unit}`;
};

// First chart switches from kg/stremma to t/stremma once yields reach 1000 kg/stremma
const YIELD_IN_TONS = {
  threshold: 1000,
  divisor: 1000,
  unit: "t/stremma",
  yAxisLabel: "Average Yield (t/stremma)"
};

const HarvestComponent = () => {
  // Convert each harvest record to absolute kg for the whole parcel
  const valueExtractor = (record, parcelArea) => {
    const [factor, perStremma] = HARVEST_UNITS[record.magnSymbol] || [1, true];
    const kg = (record.quantity || 0) * factor;
    return perStremma ? kg * parcelArea : kg;
  };

  return (
    <BaseDataComponent
      eventType="harvest"
      valueExtractor={valueExtractor}
      unit="kg/stremma"
      normalizationMode="perArea"
      chartTitle="Average Yield per Stremma"
      yAxisLabel="Average Yield (kg/stremma)"
      baselineChartTitle="Yearly Baseline Harvest Production"
      baselineYAxisLabel="Baseline Harvest Production (kg)"
      totalLabel="Total Harvest Quantity (Kg)"
      averageLabel="Avg Yield (Kg/Stremma)"
      eventCountLabel="Number of Harvests"
      describeRecord={describeHarvest}
      largeUnit={YIELD_IN_TONS}
      exportFileName="harvest_data"
    />
  );
};

export default HarvestComponent;
