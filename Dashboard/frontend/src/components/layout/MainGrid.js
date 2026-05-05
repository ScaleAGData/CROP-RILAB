import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { translate, mapping } from "../utils/translations";
import { useSelection } from "../navigation/AnalysisLevel";
import combined_data from "../../dataset/output_data.json";

const SummaryStatistics = ({ data, selectedCropType, selectedRegion }) => {
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        selectedRegion: selectedRegion || null,
        totalFields: 0,
        cropType: selectedCropType || null,
      };
    }

    return {
      selectedRegion: selectedRegion || null,
      totalFields: data.length || "",
      cropType: selectedCropType || null,
    };
  }, [data, selectedCropType, selectedRegion]);

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Region</Typography>
          <Typography variant="h6">{stats.selectedRegion}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Total Parcels</Typography>
          <Typography variant="h6">{stats.totalFields === 0 ? "" : stats.totalFields}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Crop Type</Typography>
          <Typography variant="h6">{stats.cropType}</Typography>
        </Box>
      </Stack>
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
  const [orderBy, setOrderBy] = useState("local_name");
  const [order, setOrder] = useState("asc");
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

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const isAsc = order === 'asc';
      if (orderBy === 'local_name') {
        if (!a.local_name && !b.local_name) return 0;
        if (!a.local_name) return isAsc ? 1 : -1;
        if (!b.local_name) return isAsc ? -1 : 1;
        return isAsc
          ? a.local_name.localeCompare(b.local_name)
          : b.local_name.localeCompare(a.local_name);
      }
      return 0;
    });
  }, [filteredData, order, orderBy]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

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

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid", borderColor: "text.secondary", borderRadius: 1, p: 2, mr: 0.2 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
        Field Dashboard Test
      </Typography>

      <SummaryStatistics data={filteredData} selectedCropType={selectedCropType} selectedRegion={selectedRegion}/>

      <TableContainer component={Paper} sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <Table 
          stickyHeader
          size="small"
          sx={{
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
            <TableCell>
              <TableSortLabel
                active={orderBy === "local_name"}
                direction={orderBy === "local_name" ? order : "asc"}
                onClick={() => handleRequestSort("local_name")}
              >
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Crop</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Year</TableCell>
          </TableRow>
        </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
                        <TableCell>{field.local_name || "Unnamed"}</TableCell>
                        <TableCell>{field.location_name || "Unknown"}</TableCell>
                        <TableCell>{translate(field.crop, mapping)}</TableCell>
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