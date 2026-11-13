import * as React from "react";
import { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Link } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AppNavbar from "./components/layout/AppNavbar";
import Header from "./components/layout/Header";
import MainGrid from "./components/layout/MainGrid";
import ParcelComponent from "./components/maps/LeafletMap";
import AnalysisTabs from "./components/navigation/AnalysisMenu";
import AppTheme from "./theme/AppTheme";
import { SelectionProvider } from "./components/navigation/AnalysisLevel";
import SignIn from "./sign-in/SignIn";

import Highcharts from "highcharts";

// Import modules
import highchartsMore from "highcharts/highcharts-more";
import exportingInit from "highcharts/modules/exporting";
import offlineExportingInit from "highcharts/modules/offline-exporting";

// Initialize modules
if (typeof highchartsMore === 'function') {
  highchartsMore(Highcharts);
}
if (typeof exportingInit === 'function') {
  exportingInit(Highcharts);
}
if (typeof offlineExportingInit === 'function') {
  offlineExportingInit(Highcharts);
}

const xThemeComponents = {};

function EuFundingEmblem() {
  const stars = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    const x = 24 + Math.cos(angle) * 8.5;
    const y = 16 + Math.sin(angle) * 8.5;

    return (
      <polygon
        key={index}
        points="0,-1.8 0.42,-0.58 1.71,-0.58 0.65,0.22 1.06,1.45 0,0.7 -1.06,1.45 -0.65,0.22 -1.71,-0.58 -0.42,-0.58"
        fill="#ffcc00"
        transform={`translate(${x} ${y}) rotate(${index * 30})`}
      />
    );
  });

  return (
    <Box
      component="svg"
      role="img"
      aria-label="European Union emblem"
      viewBox="0 0 48 32"
      sx={{
        width: 48,
        height: 32,
        flex: "0 0 auto",
        borderRadius: 0.5,
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.12)",
      }}
    >
      <title>European Union emblem</title>
      <rect width="48" height="32" rx="2" fill="#034ea2" />
      {stars}
    </Box>
  );
}

function FundingAcknowledgement() {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        maxWidth: { xs: "100%", md: "62%" },
      }}
    >
      <EuFundingEmblem />
      <Typography
        variant="caption"
        sx={{
          lineHeight: 1.25,
          textAlign: { xs: "left", md: "inherit" },
        }}
      >
        This project has received funding from the European Union's Horizon 
        research and innovation programme under grant agreement No 101086355.
      </Typography>
    </Stack>
  );
}

export default function Dashboard(props) {
  const [isSignedIn, setIsSignedIn] = useState(true);

  const handleSignIn = () => {
    setIsSignedIn(true);
  };

  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      {isSignedIn ? (
        <SelectionProvider>
          <Box sx={{ display: "flex"}}>
            <AppNavbar />
            <Box
              sx={(theme) => ({
                flexGrow: 1,
                backgroundColor: theme.vars
                  ? `rgba(${theme.vars.palette.background.default} / 1)`
                  : alpha(theme.palette.background.default, 1),
              })}
            >
              <Stack
                spacing={2}
                sx={{
                  alignItems: "center",
                  mx: 5,
                  pb: 2,
                  mt: { xs: 8, md: 0 },
                }}
              >
                <Header />
              </Stack>
              <Stack
                direction="row"
                justifyContent="center"
                spacing={2}
                sx={{
                  mx: 3,
                  height: "500px",
                  minHeight: 0,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0, height: "98%" }}>
                  <MainGrid />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, height: "110%" }}>
                  <ParcelComponent />
                </Box>
              </Stack>
              <AnalysisTabs sx={{ mx: 2, mt: 2 }} />
              <Box
                component="footer"
                sx={{
                  width: "100%",
                  mt: 4,
                  px: 1,
                  py: 0.5,
                  backgroundColor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <Divider sx={{ mb: 0.5 }} />
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={{ xs: 0.5, md: 2 }}
                  sx={{
                    alignItems: { xs: "flex-start", md: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <FundingAcknowledgement />
                  <Typography
                    variant="body2"
                    align="right"
                    sx={{ width: { xs: "100%", md: "auto" } }}
                  >
                    Copyright {"\u00a9"} 2024{" "}
                  <Link
                    href="https://scaleagdata.eu/en"
                    color="primary"
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    The ScaleAgData
                  </Link>{" "}
                  project. All rights reserved.
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
        </SelectionProvider>
      ) : (
        <SignIn onSignIn={handleSignIn} />
      )}
    </AppTheme>
  );
}
