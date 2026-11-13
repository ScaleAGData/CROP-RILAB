// utils/dataProcessing.js
import combined_data from "../../dataset/output_data.json";
import crop_areas from "../../dataset/crop_areas";

/**
 * Get baseline multiplier from crop areas dataset
 */
export const getBaselineMultiplier = (region, cropType, year) => {
  if (!region || !cropType || !year) return 10000;
  
  const cropArea = crop_areas.find(
    area => 
      area.commune === region && 
      area.croptype === cropType && 
      area.year === year
  );
  
  return cropArea ? parseFloat(cropArea.area_stremma) : 10000;
};

/**
 * Get total classified crop area (hectares) for a region/crop/year
 */
export const getCropClassificationArea = (region, cropType, year) => {
  if (!region || !cropType || !year || year === "all") return null;

  const cropArea = crop_areas.find(
    area =>
      area.commune === region &&
      area.croptype === cropType &&
      area.year === year
  );

  return cropArea ? parseFloat(cropArea.area_ha) : null;
};

/**
 * Get available years from parcel data
 */
export const getAvailableYears = (selectedRegion, selectedCropType, parcelData) => {
  if (!selectedRegion || !selectedCropType || !parcelData) return [];
  
  const cropData = parcelData[selectedRegion]?.[selectedCropType];
  if (!cropData) return [];
  
  const allYears = new Set();
  Object.values(cropData).forEach(levelData => {
    Object.keys(levelData).forEach(year => allYears.add(year));
  });
  
  return Array.from(allYears).sort();
};

/**
 * Get years to display based on selected year
 */
export const getYearsToDisplay = (selectedYear, availableYears) => {
  if (selectedYear === "all" || !selectedYear) return availableYears;
  return [selectedYear];
};

/**
 * Generic data processor for events (harvest/irrigation)
 */
export const processYearLevelData = (
  year,
  level,
  region,
  cropType,
  eventType,
  valueExtractor
) => {
  const yearDataKey = `${eventType}_${region}_${cropType}_${level}_${year}`;
  const eventData = combined_data["events_data"][yearDataKey] || [];
  const agronomyKey = `${region}_${cropType}_${level}_${year}`;
  const agronomyData = combined_data["agronomy_data"]?.[agronomyKey] || [];

  // events_data only lists parcels that actually recorded an event that year,
  // while agronomy_data lists every parcel in the group - so the two arrays
  // can have different lengths/orders and must be matched by parcelId, not
  // by array position.
  const areaByParcelId = new Map(
    agronomyData.map(entry => [entry.parcelId, entry.computed_stremmata || 0])
  );

  const parcels = eventData
    .map((parcelRecords) => {
      if (!parcelRecords || parcelRecords.length === 0) return null;

      const parcelArea = areaByParcelId.get(parcelRecords[0]?.parcelId) || 0;

      // The parcel area is passed so extractors can turn per-stremma values
      // into absolute quantities (e.g. m3/stremma x stremmata = m3)
      const totalValue = parcelRecords.reduce((total, record) => {
        return total + valueExtractor(record, parcelArea);
      }, 0);

      return { totalValue, records: parcelRecords, area: parcelArea };
    })
    .filter(Boolean);

  const totalValue = parcels.reduce((sum, p) => sum + p.totalValue, 0);
  const totalParcelArea = parcels.reduce((sum, p) => sum + p.area, 0);
  const averageValue = parcels.length > 0 ? totalValue / parcels.length : 0;
  
  return {
    totalValue,
    averageValue,
    parcelCount: parcels.length,
    totalParcelArea,
    records: parcels.flatMap(p => p.records),
    // Per-parcel breakdown so the level totals can be validated parcel by parcel
    parcels: parcels.map(p => ({
      parcelId: p.records[0]?.parcelId,
      area: p.area,
      eventCount: p.records.length,
      totalValue: p.totalValue,
      // Each record with the value it contributed to totalValue
      records: p.records
        .map(record => ({ record, value: valueExtractor(record, p.area) }))
        .sort((a, b) => String(a.record.date).localeCompare(String(b.record.date)))
    }))
  };
};

/**
 * Process all years data
 */
export const processAllYearsData = (
  availableYears,
  region,
  cropType,
  eventType,
  valueExtractor
) => {
  const yearsData = {};
  
  availableYears.forEach(year => {
    yearsData[year] = {
      Pilot: processYearLevelData(year, "Pilot", region, cropType, eventType, valueExtractor),
      Adjacent: processYearLevelData(year, "Adjacent", region, cropType, eventType, valueExtractor)
    };
  });
  
  return yearsData;
};

/**
 * Denominator to normalize a Pilot/Adjacent level's totalValue by.
 * "perArea": divide by real parcel area (computed_stremmata) - use when the extractor
 *   returns absolute totals (e.g. harvest kg, irrigation m3 = m3/stremma x area), giving
 *   an area-weighted rate.
 * "perParcel": divide by parcel count - a plain per-parcel mean of per-stremma values.
 */
export const getLevelDenominator = (levelData, normalizationMode = "perArea") => {
  if (!levelData) return 0;
  return normalizationMode === "perParcel" ? levelData.parcelCount : levelData.totalParcelArea;
};

/**
 * Value to plot/display for a Pilot/Adjacent level, normalized per getLevelDenominator
 */
export const getLevelValue = (levelData, normalizationMode = "perArea") => {
  if (!levelData) return 0;
  const denominator = getLevelDenominator(levelData, normalizationMode);
  return denominator > 0 ? levelData.totalValue / denominator : 0;
};

/**
 * Calculate average baseline across all years
 */
export const calculateAverageBaseline = (availableYears, allYearsData, normalizationMode = "perArea") => {
  let totalValue = 0;
  let totalDenominator = 0;

  availableYears.forEach(year => {
    const yearData = allYearsData[year];
    totalValue += (yearData.Pilot?.totalValue || 0) + (yearData.Adjacent?.totalValue || 0);
    totalDenominator +=
      getLevelDenominator(yearData.Pilot, normalizationMode) +
      getLevelDenominator(yearData.Adjacent, normalizationMode);
  });

  return totalDenominator > 0 ? totalValue / totalDenominator : 0;
};

/**
 * Calculate yearly baselines
 */
export const calculateYearlyBaselines = (
  availableYears,
  allYearsData,
  region,
  cropType,
  normalizationMode = "perArea"
) => {
  const baselines = {};

  availableYears.forEach(year => {
    const yearData = allYearsData[year];
    const totalValue = (yearData.Pilot?.totalValue || 0) + (yearData.Adjacent?.totalValue || 0);
    const totalDenominator =
      getLevelDenominator(yearData.Pilot, normalizationMode) +
      getLevelDenominator(yearData.Adjacent, normalizationMode);
    const multiplier = getBaselineMultiplier(region, cropType, year);

    baselines[year] = totalDenominator > 0 ? (totalValue * multiplier) / totalDenominator : 0;
  });

  return baselines;
};

/**
 * Calculate yearly average baselines (avg baseline × crop area)
 */
export const calculateYearlyAverageBaselines = (
  availableYears,
  averageBaseline,
  region,
  cropType
) => {
  const baselines = {};
  
  availableYears.forEach(year => {
    const multiplier = getBaselineMultiplier(region, cropType, year);
    baselines[year] = averageBaseline * multiplier;
  });
  
  return baselines;
};

/**
 * Filter display data by years to display
 */
export const getDisplayData = (yearsToDisplay, allYearsData) => {
  const filtered = {};
  yearsToDisplay.forEach(year => {
    if (allYearsData[year]) {
      filtered[year] = allYearsData[year];
    }
  });
  return filtered;
};