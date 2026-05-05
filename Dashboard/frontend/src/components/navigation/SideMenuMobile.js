import * as React from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import AdministrativeLevelsSelector from './AnalysisLevel';

function SideMenuMobile({ open, toggleDrawer }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: 'none',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Stack
        sx={{
          maxWidth: '90dvw',
          height: '100%',
        }}
      >
          <Box sx={{ p: 2 }}>
            <AdministrativeLevelsSelector sx={{
              '& > .MuiBox-root': {
                flexDirection: 'column',
                '& .MuiFormControl-root': {
                  width: '100% !important',
                  minWidth: '100% !important',
                  marginBottom: '24px',
                }
              }
            }} />
          </Box>
          <Divider />
          <Stack sx={{ flexGrow: 1, p: 2 }}>
            <List dense>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon><SettingsRoundedIcon /></ListItemIcon>
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon><InfoRoundedIcon /></ListItemIcon>
                  <ListItemText primary="About" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon><HelpRoundedIcon /></ListItemIcon>
                  <ListItemText primary="Feedback" />
                </ListItemButton>
              </ListItem>
            </List>
          </Stack>
          <Divider />
          <Stack sx={{ p: 2 }}>
            <Button variant="outlined" fullWidth startIcon={<LogoutRoundedIcon />}>
              Logout
            </Button>
          </Stack>
      </Stack>
    </Drawer>
  );
}

SideMenuMobile.propTypes = {
  open: PropTypes.bool,
  toggleDrawer: PropTypes.func.isRequired,
};

export default SideMenuMobile;