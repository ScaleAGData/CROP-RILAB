import React, { useState, useContext, createContext} from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
} from "@mui/material";


// Sample data
const sampleParcelData = {
  "Servion - Velventou": {
        "Peach": {
            "L1": {
                "2022": [
                    270393
                ],
                "2023": [
                    269968,
                    270393
                ],
                "2024": [
                    269968,
                    270393
                ]
            }
        }
    },
    "Alexandreias": {
        "Peach": {
            "L1": {
                "2023": [
                    270194,
                    270195,
                    345638
                ],
                "2024": [
                    270195,
                    345638
                ]
            }
        }
    },
    "Kileler": {
        "Cotton": {
            "L1": {
                "2022": [
                    254626,
                    254627,
                    254816
                ],
                "2023": [
                    254626,
                    254627
                ]
            },
            "L2": {
                "2023": [
                    167617,
                    185640,
                    254645,
                    254843,
                    254850,
                    254853,
                    272473,
                    272479,
                    272501,
                    272503,
                    272504,
                    272571,
                    272590,
                    272604,
                    272609,
                    272615,
                    272620,
                    272630,
                    272650,
                    272660,
                    272663,
                    272674,
                    272686,
                    272694,
                    272698,
                    272712,
                    272714,
                    272716,
                    272720,
                    272744,
                    272745,
                    272768,
                    272783,
                    272792,
                    272805,
                    272811,
                    272825,
                    272827,
                    272828,
                    272849,
                    272908,
                    272955,
                    272970,
                    272993,
                    273009,
                    273042,
                    273045,
                    273046,
                    273048,
                    273054,
                    273055,
                    273056,
                    273057,
                    273058,
                    273062,
                    273115,
                    273122,
                    274286
                ],
                "2024": [
                    1646792
                ]
            }
        },
        "Tomato": {
            "L2": {
                "2022": [
                    233129
                ],
                "2023": [
                    273212,
                    273213,
                    273288,
                    273546,
                    273567,
                    273609,
                    273610,
                    274148
                ],
                "2024": [
                    233129,
                    274148,
                    1693068,
                    1714649,
                    1720777,
                    1720778,
                    1733409,
                    1735141,
                    1737568,
                    1737613,
                    1737632,
                    1737756,
                    1737905,
                    1737906,
                    1737973,
                    1738641,
                    1738655,
                    1738666,
                    1738827,
                    1738923,
                    1739022,
                    1739046,
                    1739090,
                    1739158,
                    1739237,
                    1739334,
                    1739344,
                    1739366,
                    1739633,
                    1741222,
                    1741223,
                    1741259,
                    1741260,
                    1741261,
                    1741262,
                    1741263,
                    1741264,
                    1741265,
                    1741333,
                    1741334,
                    1741335,
                    1741490,
                    1741491,
                    1741511,
                    1742107,
                    1742144,
                    1742193,
                    1742703,
                    1742818,
                    1743263,
                    1744349,
                    1744350,
                    1744351,
                    1744352,
                    1744353,
                    1744881,
                    1744916,
                    1745073,
                    1745338,
                    1745549,
                    1747302,
                    1747304,
                    1747305,
                    1747306,
                    1747334,
                    1754055,
                    1794784,
                    1795890,
                    1795891,
                    1805252,
                    1813103
                ]
            }
        }
    },
    "Farsalon": {
        "Cotton": {
            "L2": {
                "2022": [
                    185540,
                    185562
                ],
                "2023": [
                    185540,
                    185562,
                    274204
                ],
                "2024": [
                    185540,
                    185562,
                    276923,
                    1658665,
                    1765993
                ],
                "2025": [
                    1781803,
                    1888629,
                    2325697,
                    2325755,
                    2325779,
                    2325936,
                    2325937
                ]
            },
            "L1": {
                "2025": [
                    3895,
                    2012092,
                    2325734,
                    2325743,
                    2325774,
                    2326682
                ]
            }
        },
        "Tomato": {
            "L1": {
                "2022": [
                    254944
                ],
                "2023": [
                    271384
                ]
            },
            "L2": {
                "2023": [
                    271675,
                    272001,
                    272305,
                    272308,
                    272316,
                    272379,
                    272387,
                    272390,
                    272393,
                    273166,
                    273221,
                    273259,
                    273539,
                    273598
                ],
                "2024": [
                    37417,
                    274622,
                    1720779,
                    1726263,
                    1726264,
                    1726265,
                    1735035,
                    1735946,
                    1736010,
                    1736130,
                    1737819,
                    1737820,
                    1737838,
                    1737987,
                    1737993,
                    1741459,
                    1741460,
                    1741480,
                    1741481,
                    1742002,
                    1742067,
                    1743323,
                    1744235,
                    1744275,
                    1744317,
                    1744325,
                    1744917,
                    1744977,
                    1745015,
                    1745134,
                    1745665,
                    1745736,
                    1745892,
                    1747337,
                    1749067,
                    1754589,
                    1754600,
                    1779823,
                    1786634,
                    1788001,
                    1788002
                ]
            }
        }
    },
    "Oropediou Lasithiou": {
        "Potato": {
            "L1": {
                "2022": [
                    119700,
                    167914
                ],
                "2023": [
                    273368,
                    274471
                ]
            },
            "L2": {
                "2023": [
                    166184
                ],
                "2024": [
                    1795016,
                    1795023,
                    1795113,
                    1795115
                ],
                "2025": [
                    274629,
                    2341033,
                    2341039,
                    2341040,
                    2341041
                ]
            }
        }
    },
    "Sofadon": {
        "Tomato": {
            "L1": {
                "2022": [
                    254952
                ],
                "2023": [
                    270773
                ]
            },
            "L2": {
                "2024": [
                    1737994,
                    1737995,
                    1737996,
                    1744485,
                    1744489
                ]
            },
        }
    },
    "Domokou": {
        "Tomato": {
            "L1": {
                "2023": [
                    271208
                ]
            },
            "L2": {
                "2023": [
                    271744,
                    271752,
                    271755,
                    273216,
                    273287
                ],
                "2024": [
                    1736328,
                    1737748,
                    1737766,
                    1737779,
                    1741859,
                    1742088,
                    1742129,
                    1742142,
                    1742143,
                    1742176,
                    1742283,
                    1743541,
                    1743655,
                    1743684,
                    1743704,
                    1754289,
                    1807452
                ]
            }
        }
    },
    "Kilkis": {
        "Wheat": {
            "L1": {
                "2023": [
                    299846,
                    299860,
                    299955,
                    327660
                ],
                "2024": [
                    299846,
                    299860,
                    299955,
                    327660
                ]
            }
        }
    }
}

const SelectionContext = createContext({
    selectedRegion: "",
    selectedCropType: "",
    // selectedLevel removed
    selectedYear: "",
    selectedParcels: [], // Added
    validationErrors: {}, // Added
    isLoading: false,    // Added
    parcelData: {},
    setSelectedRegion: () => {},
    setSelectedCropType: () => {},
    // setSelectedLevel removed
    setSelectedYear: () => {},
    setSelectedParcels: () => {}, // Added
    setSelectedField: () => {}
});

export const SelectionProvider = ({ children }) => {
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedCropType, setSelectedCropType] = useState("");
    // Removed selectedLevel state
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedParcels, setSelectedParcels] = useState([]); // Added state
    const [selectedField, setSelectedField] = useState(null);
    const [parcelData] = useState(sampleParcelData);
    
    // --- FIX 1: Initialize missing states to resolve runtime error ---
    const [isLoading] = useState(false); 
    const [validationErrors] = useState({}); // Initialize to empty object

    return (
        <SelectionContext.Provider
            value={{
                selectedRegion,
                selectedCropType,
                selectedYear,
                selectedParcels, // Added
                parcelData,
                selectedField,
                validationErrors, // Added
                isLoading,      // Added
                setSelectedRegion,
                setSelectedCropType,
                setSelectedYear,
                setSelectedParcels, // Added
                setSelectedField
            }}
        >
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error("useSelection must be used within a SelectionProvider");
    }
    return context;
};

// --- END: Context Definition and Provider ---


// --- START: AdministrativeLevelsSelector (FIXED) ---

// Header Selector Component (Removed Parcels and Year)
export default function AdministrativeLevelsSelector() {
    const {
        selectedRegion,
        selectedCropType,
        selectedYear,
        // FIX: validationErrors and isLoading are now provided by useSelection
        validationErrors, 
        isLoading,
        parcelData,
        setSelectedRegion,
        setSelectedCropType,
        setSelectedYear,
        // FIX: setSelectedParcels is now available
        setSelectedParcels 
    } = useSelection();

    // Get all available regions from the data
    const regions = Object.keys(parcelData || {});

    const handleRegionChange = (event) => {
        const region = event.target.value;
        console.log("Region selected:", region);

        // Reset related fields
        setSelectedRegion(region);
        setSelectedCropType("");
        setSelectedYear("");
        setSelectedParcels([]);
    };

    const handleCropTypeChange = (event) => {
        const cropType = event.target.value;
        console.log("Crop type selected:", cropType);

        setSelectedCropType(cropType);
        setSelectedYear("");
        setSelectedParcels([]);
    };

    // Dynamically get available crop types for the selected region
    const getAvailableCropTypes = () => {
        if (!selectedRegion || !parcelData[selectedRegion]) return [];
        return Object.keys(parcelData[selectedRegion] || {});
    };

    // UPDATED: Get available years for current selection by aggregating ALL levels
    const getAvailableYears = () => {
        if (!selectedRegion || !selectedCropType) return [];
        
        const cropData = parcelData[selectedRegion][selectedCropType];
        const allYears = new Set();
        
        if (cropData) {
            // Iterate over all levels (Pilot, Adjacent, etc.) and collect all unique years
            Object.values(cropData).forEach(levelData => {
                Object.keys(levelData).forEach(year => allYears.add(year));
            });
        }
        
        const years = Array.from(allYears).sort().reverse();
        // Add the "All years" option at the top
        return ["all", ...years]; 
    };

    const handleYearChange = (event) => {
        const year = event.target.value;
        console.log("Year selected:", year);
        
        setSelectedYear(year);
        
        // When a single year is selected, aggregate parcels from all available levels for that year.
        // For "all" years, we set no specific parcel selection.
        if (selectedRegion && selectedCropType && year && year !== "all") {
            const cropData = parcelData[selectedRegion][selectedCropType];
            let availableParcels = [];

            // Aggregate parcels from all levels (Pilot, Adjacent, etc.)
            Object.values(cropData).forEach(levelData => {
                const parcelsInYear = levelData[year] || [];
                availableParcels = availableParcels.concat(parcelsInYear);
            });
            
            // Remove duplicates and set the final parcel list
            setSelectedParcels([...new Set(availableParcels)]);
        } else {
            setSelectedParcels([]); // No single parcel selection for "all" years view
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    // Default empty objects for safe destructuring in case they aren't provided by the mock provider
    const safeValidationErrors = validationErrors || {};

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "row",
                gap: 2,
                alignItems: "center",
            }}
        >
            {/* Region Selector */}
            <FormControl
                variant="outlined"
                error={!!safeValidationErrors.region} // Use safe validation errors
                sx={{
                    width: "180px",
                    minWidth: 180,
                    position: "relative",
                }}
            >
                <InputLabel id="region-label">Region</InputLabel>
                <Select
                    labelId="region-label"
                    value={selectedRegion}
                    label="Region"
                    onChange={handleRegionChange}
                    fullWidth
                >
                    {regions.map((region) => (
                        <MenuItem key={region} value={region}>
                            {region}
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText
                    sx={{
                        position: "absolute",
                        bottom: "-20px",
                        left: 0,
                        height: "20px",
                    }}
                >
                    {safeValidationErrors.region ? "Required" : ""}
                </FormHelperText>
            </FormControl>

            {/* Crop Type Selector */}
            <FormControl
                variant="outlined"
                disabled={!selectedRegion}
                error={!!safeValidationErrors.cropType} // Use safe validation errors
                sx={{
                    width: "150px",
                    minWidth: 150,
                    position: "relative",
                }}
            >
                <InputLabel id="crop-type-label">Crop Type</InputLabel>
                <Select
                    labelId="crop-type-label"
                    value={selectedCropType}
                    label="Crop Type"
                    onChange={handleCropTypeChange}
                    fullWidth
                >
                    {getAvailableCropTypes().map((cropType) => (
                        <MenuItem key={cropType} value={cropType}>
                            {cropType}
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText
                    sx={{
                        position: "absolute",
                        bottom: "-20px",
                        left: 0,
                        height: "20px",
                    }}
                >
                    {safeValidationErrors.cropType ? "Required" : ""}
                </FormHelperText>
            </FormControl>

            {/* Year Selector */}
            <FormControl
                variant="outlined"
                disabled={!selectedCropType} // Disable if no crop is selected
                error={!!safeValidationErrors.year} // Use safe validation errors
                sx={{
                    width: "100px",
                    minWidth: 100,
                    position: "relative",
                }}
            >
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                    labelId="year-label"
                    value={selectedYear}
                    label="Year"
                    onChange={handleYearChange}
                    fullWidth
                >
                    {getAvailableYears().map((year) => (
                        <MenuItem key={year} value={year}>
                            {year === "all" ? "All years" : year}
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText
                    sx={{
                        position: "absolute",
                        bottom: "-20px",
                        left: 0,
                        height: "20px",
                    }}
                >
                    {safeValidationErrors.year ? "Required" : ""}
                </FormHelperText>
            </FormControl>
        </Box>
    );
}