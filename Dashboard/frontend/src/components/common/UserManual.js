// src/components/common/UserManual.js
import { Box, Button, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PDF_URL = `${process.env.PUBLIC_URL}/user-manual.pdf`;

export default function UserManual() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">User Manual</Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<OpenInNewIcon />} href={PDF_URL} target="_blank" rel="noopener">
            Open in new tab
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />} href={PDF_URL} download="ScaleAgData-User-Manual.pdf">
            Download
          </Button>
        </Stack>
      </Stack>

      <Box
        component="iframe"
        src={`${PDF_URL}#view=FitH`}
        title="User Manual"
        sx={{ flex: 1, width: '100%', border: 1, borderColor: 'divider', borderRadius: 1 }}
      />
    </Box>
  );
}
