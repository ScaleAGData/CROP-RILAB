import React, { useMemo, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from "@mui/material";
import * as XLSX from "xlsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { getLevelValue } from "../utils/dataProcessing";
import { formatRate } from "../utils/chartConfig";

const tableSx = {
  borderCollapse: "separate",
  borderSpacing: 0,
  "& th, & td": {
    border: (theme) => `1px solid ${theme.palette.divider}`,
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
    letterSpacing: "0.5px",
    padding: "12px",
  },
  "& tbody tr:hover": {
    backgroundColor: (theme) =>
      theme.palette.mode === "dark"
        ? theme.palette.grey[700]
        : theme.palette.grey[100],
  },
};

const arrowSx = { verticalAlign: "middle", mr: 0.5 };

const LEVEL_LABELS = [
  ["Pilot", "Pilot Parcels"],
  ["Adjacent", "Control Parcels"]
];

const formatArea = (area) => (area > 0 ? area.toFixed(2) : "-");

// Up to 3 decimals without trailing zeros, so record values add up visibly (e.g. 698.75)
const formatRecordValue = (value) => String(Number(value.toFixed(3)));

/**
 * Per-parcel average, consistent with how the level average is normalized:
 * "perArea" divides the parcel's absolute total by its area, "perParcel" means the
 * value is already per stremma so the parcel's own total is its average.
 */
const formatParcelAverage = (parcel, normalizationMode) => {
  if (normalizationMode === "perParcel") return formatRate(parcel.totalValue);
  return parcel.area > 0 ? formatRate(parcel.totalValue / parcel.area) : "-";
};

const ExpandArrow = ({ expanded }) =>
  expanded
    ? <KeyboardArrowDownIcon fontSize="small" sx={arrowSx} />
    : <KeyboardArrowRightIcon fontSize="small" sx={arrowSx} />;

/**
 * One summary row per year/level (Pilot/Control), expandable into its parcels, and
 * each parcel expandable into its individual records, so the level totals and
 * averages can be validated down to every event.
 * Expects displayData in the shape produced by processAllYearsData.
 * describeRecord(record, parcelArea) returns how a record's value was derived,
 * e.g. "65 m³/stremma × 10.75 stremma".
 */
const LevelParcelTable = ({
  years,
  displayData,
  normalizationMode = "perArea",
  eventCountLabel,
  totalLabel,
  averageLabel,
  describeRecord,
  exportFileName,
  emptyMessage = "No data available"
}) => {
  const tableColumns = [
    "Year",
    "Analysis Level",
    "Parcel Id",
    "Area (Stremma)",
    eventCountLabel,
    totalLabel,
    averageLabel
  ];

  const tableGroups = useMemo(
    () => years.flatMap(year => {
      const yearData = displayData[year];
      if (!yearData) return [];
      return LEVEL_LABELS.flatMap(([level, label]) => {
        const levelData = yearData[level];
        if (!levelData) return [];
        const groupKey = `${year}_${level}`;
        return [{
          key: groupKey,
          summary: [
            year,
            label,
            `All (${levelData.parcelCount})`,
            formatArea(levelData.totalParcelArea),
            levelData.records.length,
            levelData.totalValue.toFixed(1),
            formatRate(getLevelValue(levelData, normalizationMode))
          ],
          parcels: (levelData.parcels || []).map(parcel => ({
            key: `${groupKey}_${parcel.parcelId}`,
            cells: [
              year,
              label,
              parcel.parcelId,
              formatArea(parcel.area),
              parcel.eventCount,
              parcel.totalValue.toFixed(1),
              formatParcelAverage(parcel, normalizationMode)
            ],
            records: (parcel.records || []).map(({ record, value }) => ({
              date: record.date,
              description: describeRecord ? describeRecord(record, parcel.area) : "",
              value: formatRecordValue(value)
            }))
          }))
        }];
      });
    }),
    [years, displayData, normalizationMode, describeRecord]
  );

  const [expandedRows, setExpandedRows] = useState(() => new Set());

  const toggleRow = (key) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const exportToExcel = () => {
    const rows = tableGroups.flatMap(group => [
      group.summary,
      ...group.parcels.flatMap(parcel => [
        parcel.cells,
        ...parcel.records.map(r => ["", "", `  ${r.date}`, r.description, "", r.value, ""])
      ])
    ]);
    const ws = XLSX.utils.aoa_to_sheet([tableColumns, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  const renderParcel = (parcel) => {
    const hasRecords = parcel.records.length > 0;
    const isExpanded = expandedRows.has(parcel.key);
    const cellSx = { py: 0.5, color: "text.secondary" };
    return (
      <React.Fragment key={parcel.key}>
        <TableRow
          onClick={() => hasRecords && toggleRow(parcel.key)}
          sx={{ cursor: hasRecords ? "pointer" : "default" }}
        >
          {parcel.cells.map((value, cellIdx) => (
            <TableCell key={cellIdx} sx={{ ...cellSx, ...(cellIdx < 2 && { pl: 4 }) }}>
              {cellIdx === 2 && hasRecords && <ExpandArrow expanded={isExpanded} />}
              {value}
            </TableCell>
          ))}
        </TableRow>
        {isExpanded && parcel.records.map((r, idx) => (
          <TableRow key={`${parcel.key}_${idx}`}>
            <TableCell colSpan={2} sx={{ ...cellSx, border: "none" }} />
            <TableCell sx={{ ...cellSx, pl: 5, fontSize: "0.8rem" }}>{r.date}</TableCell>
            <TableCell colSpan={2} sx={{ ...cellSx, fontSize: "0.8rem" }}>{r.description}</TableCell>
            <TableCell sx={{ ...cellSx, fontSize: "0.8rem" }}>{r.value}</TableCell>
            <TableCell sx={cellSx} />
          </TableRow>
        ))}
      </React.Fragment>
    );
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 0.5, mx: "auto", borderRadius: 0 }}>
      <Table stickyHeader sx={tableSx} aria-label="data table">
        <TableHead>
          <TableRow>
            {tableColumns.map((col, idx) => (
              <TableCell key={idx}>
                {col}
                {idx === tableColumns.length - 1 && (
                  <Tooltip title="Export to Excel">
                    <IconButton
                      size="small"
                      onClick={exportToExcel}
                      disabled={tableGroups.length === 0}
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      <FileDownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableGroups.length > 0 ? (
            tableGroups.map(group => {
              const hasParcels = group.parcels.length > 0;
              const isExpanded = expandedRows.has(group.key);
              return (
                <React.Fragment key={group.key}>
                  <TableRow
                    onClick={() => hasParcels && toggleRow(group.key)}
                    sx={{ cursor: hasParcels ? "pointer" : "default" }}
                  >
                    {group.summary.map((value, cellIdx) => (
                      <TableCell key={cellIdx} sx={{ fontWeight: 500 }}>
                        {cellIdx === 0 && hasParcels && <ExpandArrow expanded={isExpanded} />}
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && group.parcels.map(renderParcel)}
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={tableColumns.length} align="center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LevelParcelTable;
