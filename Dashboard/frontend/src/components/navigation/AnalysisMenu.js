import * as React from "react";
import { 
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider
} from "@mui/material";
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import BottomNavigation from '@mui/material/BottomNavigation';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import { 
  Sprout,
  Satellite
} from 'lucide-react';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import IrrigationComponent from "../metrics/Irrigation";
import HarvestComponent from "../metrics/Harvest";
import SpraysComponent from "../metrics/Sprays";
import NDVIComponent from "../metrics/Ndvi";
import FertilizationComponent from "../metrics/Fertilizations";
import TiffMapServerLinks from "../metrics/TiffMapServerLinks";
import OpacityIcon from '@mui/icons-material/Opacity';
import DescriptionIcon from '@mui/icons-material/Description';

export default function AnalysisTabs({ cropStats }) {
  const [value, setValue] = React.useState(0);

  const renderContent = () => {
    switch(value) {
      case 0: 
        return <IrrigationComponent/>;
      case 1: 
        return <HarvestComponent />;
      case 2: 
        return <FertilizationComponent />;
      case 3: 
        return <SpraysComponent />;
      case 4: 
        return <NDVIComponent />;
      case 5:
        return <TiffMapServerLinks />;
      default:
        return null;
    }
  };

  return (
    <Card sx={{
      overflow:"auto", 
      mx: 3, 
      mt: 0.1,
      p: 1,
      borderColor:'text.secondary'
    }}>
      <CardHeader
        title="Agricultural Indicators"
        sx={{
          textAlign: 'center'
        }}
      />
      <Divider sx={{ backgroundColor: "text.primary"}}/>
      <CardContent sx={{ flex: 1, m: 0, p: 0, ":last-child": { paddingBottom: 0 }}}>
        <Box sx={{ 
          width: '100%',
          alignItems: 'center'
        }}>
          <BottomNavigation
            showLabels
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
            sx={{
              justifyContent: 'center',
              gap: 2,
              width: '100%'
            }}
          >
            <BottomNavigationAction label="Irrigation" icon={<WaterDropIcon />} />
            <BottomNavigationAction label="Harvest" icon={<AgricultureIcon />} />
            <BottomNavigationAction label="Fertilizations" icon={<Sprout size={27} />} />
            <BottomNavigationAction label="Sprays" icon={<OpacityIcon />} />
            <BottomNavigationAction label="EO Indices" icon={<Satellite size={22} />}/>
            <BottomNavigationAction label="Tiff Links" icon={<DescriptionIcon size={27} />} />
          </BottomNavigation>
        </Box>

        {/* Render content based on selected tab */}
        <Box sx={{ mt: 2 }}>
          {renderContent()}
        </Box>
      </CardContent>
    </Card>
  );
}