import React from "react";
import BaseDataComponent from "./BaseFieldOperations";

const HarvestComponent = () => {
  // Value extractor for harvest quantity
  const valueExtractor = (record) => record.quantity || 0;

  // Table row data generator
  const getTableRowData = (year, yearData) => {
    const rows = [];
    
    if (yearData.Pilot) {
      rows.push({
        Year: year,
        'Analysis Level': "Pilot Parcels",
        'Total Harvest Quantity': `${yearData.Pilot.totalValue.toFixed(1)} kg/stremma`,
        'Total Parcels': yearData.Pilot.parcelCount,
        'Number of Harvests': yearData.Pilot.records.length,
      });
    }
    
    if (yearData.Adjacent) {
      rows.push({
        Year: year,
        'Analysis Level': "Control Parcels",
        'Total Harvest Quantity': `${yearData.Adjacent.totalValue.toFixed(1)} kg/stremma`,
        'Total Parcels': yearData.Adjacent.parcelCount,
        'Number of Harvests': yearData.Adjacent.records.length,
      });
    }
    
    return rows;
  };

  return (
    <BaseDataComponent
      eventType="harvest"
      valueExtractor={valueExtractor}
      unit="kg/stremma"
      chartTitle="Aggregated Harvest Quantity"
      yAxisLabel="Harvest Quantity (kg/stremma)"
      baselineChartTitle="Yearly Baseline Harvest Production"
      baselineYAxisLabel="Baseline Harvest Production (kg)"
      tableColumns={[
        "Year",
        "Analysis Level",
        "Total Harvest Quantity",
        "Total Parcels",
        "Number of Harvests"
      ]}
      getTableRowData={getTableRowData}
      exportFileName="harvest_data"
    />
  );
};

export default HarvestComponent;