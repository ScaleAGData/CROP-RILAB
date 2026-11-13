import React from "react";
import BaseDataComponent from "./BaseFieldOperations";

// Shown under each parcel in the table: the recorded quantity per stremma
const describeIrrigation = (record) => {
  const quantity = record.waterQuantity ? parseFloat(record.waterQuantity.split(" ")[0]) : 0;
  return `${quantity} m³/stremma`;
};

const IrrigationComponent = () => {
  // waterQuantity is recorded per stremma ("30.0 m3/Στρέμμα"), so multiply by
  // the parcel area to get the actual m³ applied to the parcel
  const valueExtractor = (record, parcelArea) => {
    const quantity = record.waterQuantity
      ? parseFloat(record.waterQuantity.split(" ")[0])
      : 0;
    return quantity * parcelArea;
  };

  return (
    <BaseDataComponent
      eventType="irrigation"
      valueExtractor={valueExtractor}
      unit="m³/stremma"
      normalizationMode="perArea"
      chartTitle="Average Water Usage per Stremma"
      yAxisLabel="Average Water Quantity (m³/stremma)"
      baselineChartTitle="Yearly Baseline Water Consumption"
      baselineYAxisLabel="Baseline Water Consumption (m³)"
      totalLabel="Total Water Quantity (m³)"
      averageLabel="Avg Water Quantity (m³/Stremma)"
      eventCountLabel="Number of Irrigations"
      describeRecord={describeIrrigation}
      exportFileName="irrigation_data"
    />
  );
};

export default IrrigationComponent;
