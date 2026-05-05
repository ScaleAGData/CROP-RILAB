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
  
  const parcels = eventData
    .map((parcelRecords, index) => {
      if (!parcelRecords || parcelRecords.length === 0) return null;
      
      const totalValue = parcelRecords.reduce((total, record) => {
        return total + valueExtractor(record);
      }, 0);
      
      const parcelAgronomy = agronomyData[index];
      const parcelArea = parcelAgronomy?.computed_stremmata || 0;
      
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
    records: parcels.flatMap(p => p.records)
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
 * Calculate average baseline across all years
 */
export const calculateAverageBaseline = (availableYears, allYearsData) => {
  let totalValue = 0;
  let totalParcelArea = 0;

  availableYears.forEach(year => {
    const yearData = allYearsData[year];
    totalValue += (yearData.Pilot?.totalValue || 0) + (yearData.Adjacent?.totalValue || 0);
    totalParcelArea += (yearData.Pilot?.totalParcelArea || 0) + (yearData.Adjacent?.totalParcelArea || 0);
  });

  return totalParcelArea > 0 ? totalValue / totalParcelArea : 0;
};

/**
 * Calculate yearly baselines
 */
export const calculateYearlyBaselines = (
  availableYears,
  allYearsData,
  region,
  cropType
) => {
  const baselines = {};
  
  availableYears.forEach(year => {
    const yearData = allYearsData[year];
    const totalValue = (yearData.Pilot?.totalValue || 0) + (yearData.Adjacent?.totalValue || 0);
    const totalParcelArea = (yearData.Pilot?.totalParcelArea || 0) + (yearData.Adjacent?.totalParcelArea || 0);
    const multiplier = getBaselineMultiplier(region, cropType, year);
    
    baselines[year] = totalParcelArea > 0 ? (totalValue * multiplier) / totalParcelArea : 0;
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