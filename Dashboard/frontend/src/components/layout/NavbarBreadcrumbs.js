// import * as React from 'react';
// import { styled } from '@mui/material/styles';
// import Typography from '@mui/material/Typography';
// import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
// import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

// const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
//   margin: theme.spacing(1, 0),
//   [`& .${breadcrumbsClasses.separator}`]: {
//     color: (theme.vars || theme).palette.action.disabled,
//     margin: 1,
//   },
//   [`& .${breadcrumbsClasses.ol}`]: {
//     alignItems: 'center',
//   },
// }));

// export default function NavbarBreadcrumbs() {
//   return (
//     <StyledBreadcrumbs
//       aria-label="breadcrumb"
//       separator={<NavigateNextRoundedIcon fontSize="small" />}
//     >
//       <Typography variant="body1">Dashboard</Typography>
//       <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
//         Home
//       </Typography>
//     </StyledBreadcrumbs>
//   );
// }


/////////////////////////////////////////


import * as React from 'react';
import { styled } from '@mui/material/styles';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import Stack from '@mui/material/Stack';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

export default function NavbarBreadcrumbs() {
  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Stack direction="column" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
        <img
          src="/scaleAgData-logo.png"
          alt="ScaleAgData Logo"
          style={{ height: '28px', width: 'auto' }}
        />
        <img
          src="/np_logo.svg"
          alt="NEUROPUBLIC Logo"
          style={{ height: '14px', width: 'auto' }}
        />
      </Stack>
      {/* <Typography variant="body1">Dashboard</Typography>
      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
        Home
      </Typography> */}
    </StyledBreadcrumbs>
  );
}