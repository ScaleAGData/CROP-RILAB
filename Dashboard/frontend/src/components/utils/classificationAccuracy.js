// utils/classificationAccuracy.js
import combined_data from "../../dataset/output_data.json";

// { region: { crop: { year: { f1, balanced } } } }, values in %
const classificationMetrics = combined_data?.classification_accuracy || {};

export const ACCURACY_METRIC_LABELS = {
  balanced: "Balanced Accuracy",
  f1: "F1 Score",
};

// One colour per level, shared by both metrics
export const ACCURACY_LEVEL_COLORS = {
  High: { bg: "#2e7d32", text: "#ffffff" },
  Moderate: { bg: "#f9a825", text: "#000000" },
  Low: { bg: "#ef6c00", text: "#ffffff" },
  "Very low": { bg: "#c62828", text: "#ffffff" },
};

// Lower bound (in %) of each level per metric, from the top down
const LEVEL_THRESHOLDS = {
  f1: [
    { level: "High", min: 80 },
    { level: "Moderate", min: 50 },
    { level: "Low", min: 20 },
    { level: "Very low", min: 0 },
  ],
  balanced: [
    { level: "High", min: 80 },
    { level: "Moderate", min: 60 },
    { level: "Low", min: 50 },
    { level: "Very low", min: 0 },
  ],
};

/** [{ level, from, to }] per metric, e.g. Moderate 60-80 */
export const getLevelRanges = (metric) =>
  LEVEL_THRESHOLDS[metric].map(({ level, min }, i, all) => ({
    level,
    from: min,
    to: i === 0 ? 100 : all[i - 1].min,
  }));

/** "60–80%" */
export const formatRange = ({ from, to }) => `${from}–${to}%`;

const normalizeLookupKey = (value) =>
  String(value || "").toLowerCase().replace(/[\s_-]+/g, "");

const findMatchingKey = (source, key) => {
  if (!source || !key) return null;
  if (Object.prototype.hasOwnProperty.call(source, key)) return key;
  const normalizedKey = normalizeLookupKey(key);
  return (
    Object.keys(source).find(
      (sourceKey) => normalizeLookupKey(sourceKey) === normalizedKey
    ) || null
  );
};

const getCropYears = (region, crop) => {
  const regionKey = findMatchingKey(classificationMetrics, region);
  if (!regionKey) return null;
  const cropKey = findMatchingKey(classificationMetrics[regionKey], crop);
  return cropKey ? classificationMetrics[regionKey][cropKey] : null;
};

const isNumber = (value) =>
  value !== null && value !== undefined && !Number.isNaN(Number(value));

/**
 * Balanced accuracy is the primary metric; F1 is the fallback when balanced
 * is missing. Returns { value, metric, level } or null when neither exists.
 */
const pickAccuracy = (values) => {
  const metric = isNumber(values?.balanced) ? "balanced" : isNumber(values?.f1) ? "f1" : null;
  if (!metric) return null;
  const value = Number(values[metric]);
  const level = (
    LEVEL_THRESHOLDS[metric].find((rule) => value >= rule.min) ||
    LEVEL_THRESHOLDS[metric][LEVEL_THRESHOLDS[metric].length - 1]
  ).level;
  return { value, metric, level };
};

/** Accuracy for one region/crop/year, or null (also for "all" years) */
export const getAccuracy = (region, crop, year) => {
  if (!region || !crop || !year || year === "all") return null;
  const years = getCropYears(region, crop);
  const yearKey = findMatchingKey(years, String(year));
  return yearKey ? pickAccuracy(years[yearKey]) : null;
};

/** [{ year, accuracy }] for every year of a region/crop, sorted by year */
export const getAccuracyByYear = (region, crop) => {
  const years = getCropYears(region, crop);
  if (!years) return [];
  return Object.entries(years)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, values]) => ({ year, accuracy: pickAccuracy(values) }));
};

export const formatAccuracyValue = (value) =>
  isNumber(value) ? `${Number(value).toFixed(2)}%` : "N/A";
