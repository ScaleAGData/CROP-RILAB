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
                overflow: "auto",
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
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  zIndex: 1000,
                  px: 1,
                  backgroundColor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <Divider sx={{ mb: 0.5 }} />
                <Typography variant="body2" color="palette.light" align="right">
                  Copyright © 2024{" "}
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