import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useSelection } from "../navigation/AnalysisLevel";
import { getCropClassificationArea } from "../utils/dataProcessing";
import combined_data from "../../dataset/output_data.json";
import {
  ACCURACY_LEVEL_COLORS,
  ACCURACY_METRIC_LABELS,
  formatAccuracyValue,
  formatRange,
  getLevelRanges,
  getAccuracy,
  getAccuracyByYear,
} from "../utils/classificationAccuracy";

const ACCURACY_INDICATORS = [
  {
    metric: "balanced",
    name: "Balanced accuracy",
    description:
      "Correct detection of the target crop plus correct exclusion of other crops. Preferred when reference parcels for both are available.",
  },
  {
    metric: "f1",
    name: "F1 score",
    description:
      "Agreement of the classified crop area with known crop parcels, balancing missed and false detections. Used when balanced accuracy is not available.",
  },
];

// 0–100% bar split into coloured level segments, names above, cut-offs below
const LevelRangeBar = ({ metric }) => {
  const ranges = [...getLevelRanges(metric)].reverse(); // low -> high
  const ticks = [0, ...ranges.map((r) => r.to)];
  const tickShift = (v) => (v === 0 ? "0" : v === 100 ? "-100%" : "-50%");

  return (
    <Box sx={{ width: "100%", mt: 0.5 }}>
      <Box sx={{ display: "flex", gap: "2px", mb: 0.25 }}>
        {ranges.map(({ level, from, to }) => (
          <Typography
            key={level}
            component="span"
            sx={{ width: `${to - from}%`, textAlign: "center", fontSize: "0.65rem", opacity: 0.85, whiteSpace: "nowrap" }}
          >
            {level}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: "2px", height: 8 }}>
        {ranges.map(({ level, from, to }, i) => (
          <Box
            key={level}
            sx={{
              width: `${to - from}%`,
              bgcolor: ACCURACY_LEVEL_COLORS[level].bg,
              borderTopLeftRadius: i === 0 ? 4 : 0,
              borderBottomLeftRadius: i === 0 ? 4 : 0,
              borderTopRightRadius: i === ranges.length - 1 ? 4 : 0,
              borderBottomRightRadius: i === ranges.length - 1 ? 4 : 0,
            }}
          />
        ))}
      </Box>
      <Box sx={{ position: "relative", height: 14, mt: 0.25 }}>
        {ticks.map((v) => (
          <Typography
            key={v}
            component="span"
            sx={{
              position: "absolute",
              left: `${v}%`,
              transform: `translateX(${tickShift(v)})`,
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            {v}%
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const ClassificationAccuracyTooltip = () => (
  <Box sx={{ p: 0.5 }}>
    {ACCURACY_INDICATORS.map(({ metric, name, description }) => (
      <Box key={metric} sx={{ "&:not(:last-of-type)": { mb: 1.25 } }}>
        <Typography variant="caption" fontWeight={700} sx={{ display: "block" }}>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, opacity: 0.85 }}>
          {description}
        </Typography>
        <LevelRangeBar metric={metric} />
      </Box>
    ))}
  </Box>
);

const formatAreaValue = (area, emptyIfUnavailable = false) => {
  if (emptyIfUnavailable) return "";
  if (area === null || area === undefined) return "-";

  const numericArea = Number(area);
  if (Number.isNaN(numericArea)) return "-";

  return `${numericArea.toFixed(2)} ha`;
};

const getFieldAreaHectares = (field) => {
  const agronomyKey = `${field.region}_${field.crop}_${field.level}_${field.year}`;
  const agronomyData = combined_data?.agronomy_data?.[agronomyKey] || [];
  const parcelAgronomy = agronomyData.find(
    (item) => item.parcelId === field.parcel_id
  );
  return parcelAgronomy?.computed_hectars || 0;
};

// Small tag per year, e.g. (● 2022  BA 66.03%), outlined in its level colour.
// Metric name and level are in the tooltip.
const AccuracyTag = ({ year, accuracy }) => {
  const colors = accuracy ? ACCURACY_LEVEL_COLORS[accuracy.level] : null;
  const isFallback = accuracy?.metric === "f1";
  const range = accuracy
    ? getLevelRanges(accuracy.metric).find((r) => r.level === accuracy.level)
    : null;
  const tooltip = accuracy
    ? `${ACCURACY_METRIC_LABELS[accuracy.metric]}: ${accuracy.level} (${formatRange(range)})${
        isFallback ? " – balanced accuracy not available" : ""
      }`
    : "No accuracy data for this year";

  return (
    <Tooltip title={tooltip} arrow>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1,
          py: 0.25,
          borderRadius: "999px",
          border: "1px solid",
          borderColor: colors ? colors.bg : "divider",
          fontSize: "0.75rem",
          lineHeight: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        <Box
          component="span"
          sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: colors ? colors.bg : "text.disabled" }}
        />
        <Box component="span" sx={{ color: "text.secondary" }}>{year}</Box>
        {accuracy && (
          <Box component="span" sx={{ color: "text.secondary", fontSize: "0.65rem", fontWeight: 600 }}>
            {isFallback ? "F1" : "BA"}
          </Box>
        )}
        <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
          {accuracy ? formatAccuracyValue(accuracy.value) : "N/A"}
        </Box>
      </Box>
    </Tooltip>
  );
};

const ClassificationAccuracyCard = ({ selectedYear, accuracy, accuracyByYear }) => {
  if (!selectedYear) return null;

  const tags =
    selectedYear === "all"
      ? accuracyByYear
      : [{ year: selectedYear, accuracy }];

  return (
    <Paper
      elevation={1}
      sx={{
        width: "100%",
        px: 1.5,
        py: 0.75,
        mb: 1.5,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="caption" color="text.primary" fontWeight={600}>
          Classification Accuracy
        </Typography>
        <Tooltip
          title={<ClassificationAccuracyTooltip />}
          arrow
          placement="bottom"
          slotProps={{ tooltip: { sx: { width: 340, maxWidth: "90vw" } } }}
        >
          <Box
            component="span"
            tabIndex={0}
            aria-label="Classification accuracy details"
            sx={{ display: "inline-flex", alignItems: "center", color: "text.primary", cursor: "help" }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </Box>
        </Tooltip>
      </Box>
      {tags.length ? (
        tags.map(({ year, accuracy: yearAccuracy }) => (
          <AccuracyTag key={year} year={year} accuracy={yearAccuracy} />
        ))
      ) : (
        <Typography variant="caption" color="text.secondary">N/A</Typography>
      )}
    </Paper>
  );
};

const SummaryStatistics = ({
  data,
  selectedCropType,
  selectedRegion,
  selectedYear,
}) => {
  const stats = useMemo(() => {
    const cropClassificationArea = getCropClassificationArea(
      selectedRegion,
      selectedCropType,
      selectedYear
    );
    const hasSelection = Boolean(selectedRegion && selectedCropType && selectedYear);

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        selectedRegion: selectedRegion || null,
        totalFields: 0,
        cropType: selectedCropType || null,
        year: selectedYear || null,
        totalPilotArea: 0,
        totalControlArea: 0,
        cropClassificationArea,
        hasSelection,
      };
    }

    let totalPilotArea = 0;
    let totalControlArea = 0;

    data.forEach((field) => {
      const area = getFieldAreaHectares(field);
      if (field.level === "Pilot") {
        totalPilotArea += area;
      } else if (field.level === "Adjacent") {
        totalControlArea += area;
      }
    });

    return {
      selectedRegion: selectedRegion || null,
      totalFields: data.length || "",
      cropType: selectedCropType || null,
      year: selectedYear || null,
      totalPilotArea,
      totalControlArea,
      cropClassificationArea,
      hasSelection,
    };
  }, [
    data,
    selectedCropType,
    selectedRegion,
    selectedYear,
  ]);

  const items = [
    { label: "Region", value: stats.selectedRegion },
    { label: "Total Parcels", value: stats.totalFields === 0 ? "" : stats.totalFields },
    { label: "Crop Type", value: stats.cropType },
    { label: "Year", value: stats.year === "all" ? "All Years" : stats.year },
    { label: "Total Pilot Area", value: formatAreaValue(stats.totalPilotArea, !stats.hasSelection) },
    { label: "Total Control Area", value: formatAreaValue(stats.totalControlArea, !stats.hasSelection) },
    { label: "Crop Classification Area", value: formatAreaValue(stats.cropClassificationArea, !stats.hasSelection) },
  ];

  return (
    <Paper elevation={1} sx={{ width: "100%", p: 1.25, mb: 1.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
            md: "repeat(7, minmax(0, 1fr))",
          },
          alignItems: "start",
          rowGap: 1,
          width: "100%",
        }}
      >
        {items.map(({ label, value }, index) => (
          <Box
            key={label}
            sx={{
              textAlign: "center",
              px: 1,
              borderLeft: { md: index === 0 ? "none" : "1px solid" },
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
              {label}
            </Typography>
            <Typography variant="body1" fontWeight={600}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default function FieldDashboard() {
  const {
    selectedRegion,
    selectedCropType,
    selectedYear,
    setSelectedField
  } = useSelection();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [allFieldData, setAllFieldData] = useState([]);

  // Load and pre-process data
  useEffect(() => {
  if (!combined_data?.filtered_data) return;

  const allData = [];

  Object.entries(combined_data.filtered_data).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;

    const parts = key.split('_');
    if (parts.length < 4) return;

    const year = parts.at(-1);
    const level = parts.at(-2);
    const crop = parts.at(-3);
    const region = parts.slice(0, -3).join('_');

    allData.push(
      ...value.map(field => ({
        ...field,
        region,
        crop,
        level,
        year: String(year),
      }))
    );
  });

  setAllFieldData(allData); // CLEAN replace
}, []);

  const filteredData = useMemo(() => {
  if (!selectedRegion) return [];
  if (!allFieldData.length) return [];

  console.log(`\n=== FILTERING ===`);
  console.log(`Current filters:`, {
    region: selectedRegion,
    crop: selectedCropType,
    year: selectedYear,
    yearType: typeof selectedYear
  });

  const matchingFields = allFieldData.filter(field => {
    // -------- Region --------
    const regionMatch =
      field.region.toLowerCase().replace(/\s+/g, '') ===
      selectedRegion.toLowerCase().replace(/\s+/g, '');

    // -------- Crop --------
    const cropMatch =
      !selectedCropType || field.crop === selectedCropType;

    // -------- Year (FIXED FOR REAL) --------
    let yearMatch = true;

    if (
      selectedYear !== 'all' &&
      selectedYear !== '' &&
      selectedYear !== null &&
      selectedYear !== undefined
    ) {
      const fieldYear = String(field.year).trim();
      const selectedYearStr = String(selectedYear).trim();
      yearMatch = fieldYear === selectedYearStr;
    }

    // -------- Debug --------
    if (regionMatch && cropMatch) {
      console.log(
        `[YEAR FILTER] field=${field.year}, selected=${selectedYear}, match=${yearMatch}`
      );
    }

    return regionMatch && cropMatch && yearMatch;
  });

  console.log(`✓ Filtered to ${matchingFields.length} parcels`);
  
  // Log unique years in result to verify
  const uniqueYears = [...new Set(matchingFields.map(f => f.year))];
  console.log(`Years in result:`, uniqueYears);

  return matchingFields;
}, [allFieldData, selectedRegion, selectedCropType, selectedYear]);

// Also add this useEffect to log when selectedYear changes:
useEffect(() => {
  console.log(`🔵 Year selection changed to: "${selectedYear}" (type: ${typeof selectedYear})`);
}, [selectedYear]);

  // Reset page and selection when filters change
  useEffect(() => {
    setPage(0);
    setSelectedRowId(null);
    setSelectedField(null);
  }, [selectedRegion, selectedCropType, selectedYear, setSelectedField]);

  const sortedData = filteredData;

  // Row click handler - passes complete field object with region, crop, year
  const handleRowClick = (field) => {
    const uniqueKey = `${field.parcel_id}_${field.year}`;
    
    console.log("Row clicked - Field data:", {
      parcel_id: field.parcel_id,
      region: field.region,
      crop: field.crop,
      year: field.year,
      tifFileName: `${field.region}_${field.crop}_${field.year}.tif`
    });

    setSelectedRowId(selectedRowId === uniqueKey ? null : uniqueKey);
    
    // Pass the complete field object to the map
    setSelectedField(selectedRowId === uniqueKey ? null : field);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRowKey = (field) =>
    `${field.region}__${field.crop}__${field.level}__${field.parcel_id}__${field.year}`;

  const classificationAccuracy = useMemo(
    () => getAccuracy(selectedRegion, selectedCropType, selectedYear),
    [selectedRegion, selectedCropType, selectedYear]
  );

  const classificationAccuracyByYear = useMemo(
    () => getAccuracyByYear(selectedRegion, selectedCropType),
    [selectedRegion, selectedCropType]
  );

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid", borderColor: "text.secondary", borderRadius: 1, p: 2, mr: 0.2 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
        Field Dashboard
      </Typography>

      <SummaryStatistics
        data={filteredData}
        selectedCropType={selectedCropType}
        selectedRegion={selectedRegion}
        selectedYear={selectedYear}
      />

      <ClassificationAccuracyCard
        selectedYear={selectedYear}
        accuracy={classificationAccuracy}
        accuracyByYear={classificationAccuracyByYear}
      />

      <TableContainer component={Paper} sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <Table 
          stickyHeader
          size="small"
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            "& th, & td": {
              border: (theme) => `1px solid ${theme.palette.divider}`,
              textAlign: "center",
            },
            "& th": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.grey[700]
                  : theme.palette.grey[200],
              color: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.common.white
                  : theme.palette.common.black,
              fontWeight: "500",
              textTransform: "none",
              letterSpacing: "0.5px"
            },
            "& tbody tr:hover": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.grey[700]
                  : theme.palette.grey[100],
            },
          }}
        >
         <TableHead>
          <TableRow>
            <TableCell>Parcel Id</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Year</TableCell>
          </TableRow>
        </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="subtitle1">
                    {!selectedRegion
                      ? "Select a region to view fields"
                      : "No fields match the selected criteria"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sortedData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((field) => {
                    const rowKey = getRowKey(field);

                    return (
                      <TableRow
                        key={rowKey}
                        onClick={() => handleRowClick(field)}
                        sx={{
                          cursor: "pointer",
                          backgroundColor:
                            rowKey === selectedRowId
                              ? "rgba(33, 150, 243, 0.1)"
                              : "inherit",
                          "&:hover": {
                            backgroundColor: "rgba(33, 150, 243, 0.04)",
                          },
                        }}
                      >
                        <TableCell>{field.parcel_id}</TableCell>
                        <TableCell>
                          {field.level
                            ? field.level === "Adjacent"
                              ? "Control"
                              : "Pilot"
                            : "N/A"}
                        </TableCell>
                        <TableCell>{field.year}</TableCell>
                      </TableRow>
                    );
                  })}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10]}
      />
    </Box>
  );
}
