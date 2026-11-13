// utils/twpProcessing.js
// Helpers for twp_data.json, written by data_extraction/compute_twp.py
import twp_data from "../../dataset/twp_data.json";
import { getCropClassificationArea } from "./dataProcessing";

// compute_twp.py keeps the API level names, the rest of the UI uses Pilot/Adjacent
const LEVEL_NAMES = { L1: "Pilot", L2: "Adjacent" };

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

/**
 * All TWP entries of a region/crop as a flat list with region, crop, level, year
 */
export const getTwpEntries = (region, cropType) => {
  if (!region || !cropType) return [];

  const regionKey = Object.keys(twp_data).find((key) => normalize(key) === normalize(region));
  const levels = regionKey ? twp_data[regionKey]?.[cropType] : null;
  if (!levels) return [];

  return Object.entries(levels).flatMap(([level, years]) =>
    Object.entries(years).flatMap(([year, entries]) =>
      entries.map((entry) => ({
        ...entry,
        region: regionKey,
        crop: cropType,
        level: LEVEL_NAMES[level] || level,
        year: String(year),
      }))
    )
  );
};

export const getTwpYears = (entries) =>
  [...new Set(entries.map((entry) => entry.year))].sort();

/**
 * Water that reached the parcel in the window (m3): irrigation + effective rain.
 * 1 mm of rain on 1 stremma (1000 m2) is 1 m3.
 */
export const getWaterM3 = (entry) => (entry.I_m3 || 0) + (entry.rain_m3 || 0);

/**
 * Pooled values of a group of entries. Only "ok" entries count.
 * TWP is pooled (sum Y / sum water), so big parcels weigh more than small ones,
 * same as dividing a total by a total in the other indicators.
 */
export const summarizeTwp = (entries) => {
  const ok = entries.filter((entry) => entry.status === "ok");
  const area = ok.reduce((sum, e) => sum + (e.A_stremmata || 0), 0);
  const yieldKg = ok.reduce((sum, e) => sum + (e.Y_kg || 0), 0);
  const irrigationM3 = ok.reduce((sum, e) => sum + (e.I_m3 || 0), 0);
  const rainM3 = ok.reduce((sum, e) => sum + (e.rain_m3 || 0), 0);
  const waterM3 = irrigationM3 + rainM3;

  return {
    totalParcels: entries.length,
    okParcels: ok.length,
    area,
    twp: waterM3 > 0 ? yieldKg / waterM3 : null,
    yieldPerStremma: area > 0 ? yieldKg / area : null,
    irrigationPerStremma: area > 0 ? irrigationM3 / area : null,
    rainPerStremma: area > 0 ? rainM3 / area : null,
  };
};

/**
 * Per year and level summaries: { [year]: { Pilot, Adjacent, All } }
 */
export const summarizeTwpByYear = (entries, years) => {
  const result = {};
  years.forEach((year) => {
    const yearEntries = entries.filter((entry) => entry.year === year);
    result[year] = {
      Pilot: summarizeTwp(yearEntries.filter((entry) => entry.level === "Pilot")),
      Adjacent: summarizeTwp(yearEntries.filter((entry) => entry.level === "Adjacent")),
      All: summarizeTwp(yearEntries),
    };
  });
  return result;
};

/**
 * Average regional TWP: the yearly "All Parcels" TWP (Pilot + Control) averaged with each
 * year weighted by its crop classification area (crop_areas.json):
 * sum(TWP_year × crop area_year) / sum(crop area_year).
 * Years without "ok" parcels or without a classified crop area are left out
 * (no 10000 stremma fallback, a made up area would give a made up weight).
 */
export const calculateRegionalAverageTwp = (summaries, years, region, cropType) => {
  let weightedSum = 0;
  let totalArea = 0;
  const usedYears = [];
  years.forEach((year) => {
    const twp = summaries[year]?.All.twp;
    const areaHa = getCropClassificationArea(region, cropType, year);
    if (twp === null || twp === undefined || !areaHa) return;
    const cropArea = areaHa * 10; // stremma
    weightedSum += twp * cropArea;
    totalArea += cropArea;
    usedYears.push({ year, twp, cropArea });
  });
  return { usedYears, totalArea, twp: totalArea > 0 ? weightedSum / totalArea : null };
};
