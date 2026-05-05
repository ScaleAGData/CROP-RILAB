import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useTheme
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Download } from "lucide-react";

const MAPSERVER_BASE_URL =
  process.env.REACT_APP_MAPSERVER_URL || "http://localhost:8080/cgi-bin/mapserv";

// Utility functions
const generateWcsUrl = (fileName, year, requestType) => {
  const params = new URLSearchParams({
    map: "/data/mapfile.map",
    SERVICE: "WCS",
    VERSION: "2.0.1",
    REQUEST: requestType,
    COVERAGEID: `tiff_layer_${year}`,
    TIFF_NAME: `${fileName}.tif`,
    ...(requestType === "GetCoverage" && { FORMAT: "GEOTIFF" })
  });
  
  return `${MAPSERVER_BASE_URL}?${params.toString()}`;
};

const handleDownloadTiff = (url, fileName) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.tif`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Sub-components
const Header = () => (
  <>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
      <MapIcon color="primary" fontSize="large" />
      <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'inherit' }}>
        MapServer WCS Query Links
      </Typography>
    </Stack>
    <Typography variant="body2" sx={{ mb: 3, color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'text.secondary' }}>
      Click any link to view the XML description or use the download button to get the GeoTIFF file.
    </Typography>
  </>
);

const FileListItem = ({ file }) => {
  const xmlUrl = generateWcsUrl(file.name, file.year, "DescribeCoverage");
  const downloadUrl = generateWcsUrl(file.name, file.year, "GetCoverage");
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <ListItemButton onClick={() => window.open(xmlUrl, '_blank')} sx={{ py: 1.5, px: 4, pr: 2, bgcolor: isDark ? '#ffffff' : 'inherit', '&:hover': { bgcolor: isDark ? '#f5f5f5' : 'rgba(0, 0, 0, 0.04)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" sx={{ textDecoration: 'underline', color: '#0080ff !important', fontWeight: 600, cursor: 'pointer' }}>
            {file.name}.tif
          </Typography>
          <OpenInNewIcon fontSize="small" sx={{ color: isDark ? '#000000' : 'action.active' }} />
        </Stack>
        <Tooltip title="Download GeoTIFF">
          <span onClick={(e) => { e.stopPropagation(); handleDownloadTiff(downloadUrl, file.name); }} style={{ cursor: 'pointer', display: 'inline-flex', padding: '8px' }}>
            <Download size={22} strokeWidth={3} color={isDark ? '#000000' : '#0080ff'} style={{ display: 'block' }} />
          </span>
        </Tooltip>
      </Box>
    </ListItemButton>
  );
};

const CropSection = ({ crop, files }) => (
  <Box>
    <Box sx={{ px: 3, py: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? '#ffffff' : theme.palette.grey[100], borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle1" fontWeight="500" sx={{ color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'inherit' }}>{crop}</Typography>
    </Box>
    <List sx={{ py: 0 }}>
      {files.map((file, index) => (
        <React.Fragment key={file.name}>
          <ListItem disablePadding><FileListItem file={file} /></ListItem>
          {index < files.length - 1 && <Divider variant="inset" sx={{ ml: 4 }} />}
        </React.Fragment>
      ))}
    </List>
  </Box>
);

const RegionAccordion = ({ region, crops, expanded, onChange }) => (
  <Accordion 
    elevation={0}
    expanded={expanded === region} 
    onChange={onChange(region)} 
    sx={{ 
      mb: 2, 
      '&:before': { display: 'none' }, 
      bgcolor: (theme) => theme.palette.mode === "dark" ? '#ffffff' : 'inherit',
      border: '1px solid',
      borderColor: 'divider'
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'inherit' }} />} sx={{ bgcolor: (theme) => theme.palette.mode === "dark" ? '#f5f5f5' : theme.palette.grey[200], '&:hover': { bgcolor: (theme) => theme.palette.mode === "dark" ? '#e0e0e0' : theme.palette.grey[300] } }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <LocationOnIcon color="primary" />
        <Typography variant="h6" fontWeight="500" sx={{ color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'inherit' }}>{region}</Typography>
      </Stack>
    </AccordionSummary>
    <AccordionDetails sx={{ p: 0 }}>
      {Object.entries(crops).map(([crop, files]) => <CropSection key={crop} crop={crop} files={files} />)}
    </AccordionDetails>
  </Accordion>
);

const InfoFooter = () => (
  <Box sx={{ mt: 3, p: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? '#ffffff' : theme.palette.grey[100], borderRadius: 1, border: 1, borderColor: 'divider' }}>
    <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === "dark" ? '#000000' : 'text.secondary' }} component="div">
      <strong>Endpoint:</strong> {MAPSERVER_BASE_URL}<br />
      <strong>Services:</strong> WCS 2.0.1<br />
      <strong>Map File:</strong> /data/mapfile.map<br />
      <strong>Actions:</strong> Click filename to view XML (DescribeCoverage) | Click download icon to get GeoTIFF (GetCoverage)
    </Typography>
  </Box>
);

// Main component
const TiffMapServerLinks = () => {
  const tiffData = {
    Alexandreias: {
      Peach: [
        { name: "Alexandreias_Peach_2024", year: 2024 },
        { name: "Alexandreias_Peach_2023", year: 2023 },
      ]
    },
    Domokou: {
      Tomato: [
        { name: "Domokou_Tomato_2025", year: 2025 },
        { name: "Domokou_Tomato_2024", year: 2024 },
        { name: "Domokou_Tomato_2023", year: 2023 }
      ]
    },
    Farsalon: {
      Tomato: [
        { name: "Farsalon_Tomato_2024", year: 2024 },
        { name: "Farsalon_Tomato_2023", year: 2023 },
        { name: "Farsalon_Tomato_2022", year: 2022 }
      ],
      Cotton: [
        { name: "Farsalon_Cotton_2025", year: 2025 },
        { name: "Farsalon_Cotton_2024", year: 2024 },
        { name: "Farsalon_Cotton_2023", year: 2023 },
        { name: "Farsalon_Cotton_2022", year: 2022 }
      ]
    },
    Kileler: {
      Cotton: [  
        { name: "Kileler_Cotton_2024", year: 2024 },
        { name: "Kileler_Cotton_2023", year: 2023 },
        { name: "Kileler_Cotton_2022", year: 2022 }
      ],
      Tomato: [
        { name: "Kileler_Tomato_2024", year: 2024 },
        { name: "Kileler_Tomato_2023", year: 2023 },
        { name: "Kileler_Tomato_2022", year: 2022 },
      ]
    },
    Kilkis: {
      Wheat: [
        { name: "Kilkis_Wheat_2024", year: 2024 }, 
        { name: "Kilkis_Wheat_2023", year: 2023 },
      ]
    },
    OropediouLasithiou: {
      Potato: [
        { name: "OropediouLasithiou_Potato_2025", year: 2025 },
        { name: "OropediouLasithiou_Potato_2024", year: 2024 },
        { name: "OropediouLasithiou_Potato_2023", year: 2023 },
        { name: "OropediouLasithiou_Potato_2022", year: 2022 },
      ]
    },
    'Servion-Velventou': {
      Peach: [
        { name: "Servion-Velventou_Peach_2024", year: 2024 },
        { name: "Servion-Velventou_Peach_2023", year: 2023},
        { name: "Servion-Velventou_Peach_2022", year: 2022 }
      ]
    },
    Sofadon:{
      Tomato: [
        { name: "Sofadon_Tomato_2024", year: 2024 },
        { name: "Sofadon_Tomato_2023", year: 2023 },
        { name: "Sofadon_Tomato_2022", year: 2022 }
      ]
    }
  };

  const [expanded, setExpanded] = useState(false);
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box sx={{ width: "90%", mx: "auto"}}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: (theme) => theme.palette.mode === "dark" ? '#ffffff' : 'inherit', border: '1px solid', borderColor: 'divider' }}>
        <Header />
        {Object.entries(tiffData).map(([region, crops]) => (
          <RegionAccordion
            key={region}
            region={region}
            crops={crops}
            expanded={expanded}
            onChange={handleAccordionChange}
          />
        ))}
      </Paper>
    </Box>
  );
};

export default TiffMapServerLinks;
