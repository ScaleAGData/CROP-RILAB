import * as React from 'react';
import Stack from '@mui/material/Stack';
import CustomDatePicker from '../common/CustomDatePicker';
import NavbarBreadcrumbs from './NavbarBreadcrumbs';
import ColorModeIconDropdown from '../../theme/ColorModeIconDropdown';

import Search from '../navigation/Search';
import AdministrativeLevelsSelector from '../navigation/AnalysisLevel';

export default function Header() {
  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: { sm: '100%'},
        pt: 1.5,
        position: 'relative',
        // backgroundColor:'red'
      }}
      spacing={2}
    >
      <NavbarBreadcrumbs />
      
      <Stack 
        direction="row" 
        // sx={{ 
        //   position: 'absolute', 
        //   left: '50%', 
        //   transform: 'translateX(-50%)',
        //   alignItems: 'center'
        // }}
      >
        <AdministrativeLevelsSelector/>
      </Stack>
      
      <Stack 
        direction="row" 
        sx={{ 
          gap: 1, 
          alignItems: 'center'
        }}
      >
        <Search />
        <CustomDatePicker />
        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}