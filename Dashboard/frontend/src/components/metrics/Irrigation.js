import React from "react";
import BaseDataComponent from "./BaseFieldOperations";
import { translate, mapping } from "../utils/translations";

const IrrigationComponent = () => {
  // Value extractor for water quantity
  const valueExtractor = (record) => {
    const quantity = record.waterQuantity
      ? parseFloat(record.waterQuantity.split(" ")[0])
      : 0;
    return quantity;
  };

  // Table row data generator
  const getTableRowData = (year, yearData) => {
    const rows = [];
    
    if (yearData.Pilot) {
      const systems = [...new Set(
        yearData.Pilot.records.map(r => translate(r.irrigationSystem, mapping))
      )].join(", ");
      
      rows.push({
        Year: year,
        'Analysis Level': "Pilot Parcels",
        'Total Water Quantity': `${yearData.Pilot.totalValue.toFixed(1)} m³/stremma`,
        'Total Parcels': yearData.Pilot.parcelCount,
        'Number of Irrigations': yearData.Pilot.records.length,
        'Irrigation Systems': systems
      });
    }
    
    if (yearData.Adjacent) {
      const systems = [...new Set(
        yearData.Adjacent.records.map(r => translate(r.irrigationSystem, mapping))
      )].join(", ");
      
      rows.push({
        Year: year,
        'Analysis Level': "Control Parcels",
        'Total Water Quantity': `${yearData.Adjacent.totalValue.toFixed(1)} m³/stremma`,
        'Total Parcels': yearData.Adjacent.parcelCount,
        'Number of Irrigations': yearData.Adjacent.records.length,
        'Irrigation Systems': systems
      });
    }
    
    return rows;
  };

  return (
    <BaseDataComponent
      eventType="irrigation"
      valueExtractor={valueExtractor}
      unit="m³/stremma"
      chartTitle="Aggregated Water Usage"
      yAxisLabel="Total Water Quantity (m³/stremma)"
      baselineChartTitle="Yearly Baseline Water Consumption"
      baselineYAxisLabel="Baseline Water Consumption"
      tableColumns={[
        "Year",
        "Analysis Level",
        "Total Water Quantity",
        "Total Parcels",
        "Number of Irrigations",
        "Irrigation Systems"
      ]}
      getTableRowData={getTableRowData}
      exportFileName="irrigation_data"
    />
  );
};

export default IrrigationComponent;