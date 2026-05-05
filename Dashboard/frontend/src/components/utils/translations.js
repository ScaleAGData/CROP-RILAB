  // Mapping object
  const mapping = {
    "ντομάτα": "Tomato",
    "τοματιά": "Tomato", 
    "ροδακινιά": "Peach",
    "ροδάκινο": "Peach",
    "tomato": "Tomato",
    "tomatia": "Tomato",
    "peach": "Peach",
    "βαμβάκι": "Cotton",
    "πατάτα": "Potato",
    "m³/Στρέμμα": "m³/strema",
    "tn/Στρέμμα": "tn/strema",
    "kg/Στρέμμα": "kg/strema",
    "gr/Στρέμμα": "gr/strema",
    "ml/Στρέμμα": "ml/strema",
    "Στρέμμα": "strema",
    "Κιλά": "kilograms",
    "Γραμμάρια": "grams",
    "Λίτρα": "liters",
    "Κυβικά Μέτρα": "Cubic Meters",
    "Τόνοι": "tons",
    "Κιλά/Στρέμμα": "Kilograms/strema",
    "Γραμμάρια/Στρέμμα": "Grams/strema",
    "Λίτρα/Στρέμμα": "Liters/strema",
    "Κυβικά Μέτρα/Στρέμμα": "Cubic Meters/strema",
    "Τόνοι/Στρέμμα": "Tons/strema",

    "Σταλάκτες (επιφανειακοί)": "Surface droplets",
    "Μικροεκτοξευτήρες": "Micro sprinklers",
    "Καρούλι/Ράμπα" : "Pipe Ramp",
    "21-0-0 ΘΕΙΙΚΗ ΑΜΜΩΝΙΑ": "21-0-0 Ammonium Sulfate",
    "0-0-30+10MgO ΚΑΛΙΟΜΑΓΝΗΣΙΟ": "0-0-30+10MgO POTASSIUM MAGNESIUM",
    "ΝΙΤΡΙΚΗ ΑΜΜΩΝΙΑ 34-0-0": "Ammonium Nitrate 34-0-0",

    "Πράσινο σκουλήκι": "Helicoverpa armigera",
    "Αφίδα του βαμβακιού": "Cotton aphid",
    "Αλευρώδης του καπνού": "Tobacco whitefly",
    "Ρόδινο σκουλήκι": "Pink bollworm",
    "Εμπόασκα": "Cotton leafhopper",
    "κύπερη": "Purple nutsedge",
    "Περονόσπορος": "Downy mildew (Peronospora)",
    "τετράνυχος κοινός": "Two-spotted spider mite (Tetranychus urticae)",

    // Fertilizer Names and Types
    "Νιτρική αμμωνία": "Ammonium Nitrate",
    "Υδρολίπανση": "Fertigation",
    "Μίγμα ιχνοστοιχείων": "Trace Elements Mix",
    "Nutrition BS-95 (0-8-12)+0.4B+0.2Mo": "Nutrition BS-95 (0-8-12)+0.4B+0.2Mo",
    "Ουροθειική αμμωνία": "Urea Ammonium Nitrate",
    "2-12-17": "2-12-17 Fertilizer",
    "34.5-0-0": "34.5-0-0 Fertilizer",
    "11-15-15": "11-15-15 Fertilizer",
    "Kelpack-Φύκια": "Kelpack-Seaweed",
    
    // Application Methods
    "Διασπορά": "Spreading",
    "Διαφυλλικά": "Foliar Application",
    "επιφανειακή λίπανση": "Surface Fertilization",
    "βασική λίπανση": "Basic Fertilization",
    "άλλη μέθοδος": "Other Method",
    "Ριζοπότισμα": "Root Irrigation",
    "Γραμμικά": "Linear",

    // Micronutrients and Additives
    "Υδατοδιαλυτός χαλκός": "Water-Soluble Copper",
    "Θειικός χαλκός 22%": "Copper Sulfate 22%",
    "Αμινοξέα": "Amino Acids",

    // Fertilizer Names and Types
    "Φωσφορική ουρία": "Urea Phosphate",
    "FERTILEADER/SEACTIV RAME": "Fertileader Seactiv RAME",
    "Νιτρικό κάλιο": "Potassium Nitrate",
    "Ουρία": "Urea",
    "Nutrammon solub": "Nutrammon Soluble",
    "NUTRI BS-95": "Nutri BS-95",
    "FertiCa Borz": "FertiCa Borz",
    "Ουροθειική αμμωνία 40%Ν" :	"Ammonia urosulfate 40%N",
    "Νιτρική αμμωνία 34.5-0-0": "Ammonia nitrate 34.5-0-0",
    "Νιτρικό κάλιο 13-0-45": "Potassium nitrate 13-0-45",

    "Ουρία 46-0-0": "Urea 46-0-0",
    "12-11-18": "12-11-18",
    "Οργανική κοπριά": "Organic Manure",
    "Ammonia nitrate 34.5-0-0": "Ammonium Nitrate 34.5-0-0",
    "Θειική αμμωνία 21-0-0": "Ammonium Sulfate 21-0-0",
    "Νιτρικό ασβέστιο 15.5-0-0+26.5CaO": "Calcium Nitrate 15.5-0-0+26.5CaO",

    // Fertilizer Formulations
    "15-15-15": "15-15-15 Fertilizer", 
    "0-12-24": "0-12-24 Fertilizer",
    "13-0-46": "13-0-46 Fertilizer",
    "13-0-45": "13-0-45 Fertilizer",
    "3-27-18": "3-27-18 Fertilizer",
    "21-17-0": "21-17-0 Fertilizer",
    "21-0-0": "21-0-0 Fertilizer",
    "46-0-0 UTEC": "46-0-0 UTEC Fertilizer",
    "27-0-0": "27-0-0 Fertilizer",
    "40-0-0": "40-0-0 Fertilizer",

    // Diseases
    "Βοτρύτης": "Botrytis",
    "Εξώασκος": "Peach leaf curl",
    "Ψώρα του San Jose": "San Jose Scale",
    "Πράσινη αφίδα του ροδάκινου": "Green peach aphid",
    "Σιδηροσκώληκες": "Wireworms",
    "Ανάρσια της ροδακινιάς": "Peach twig borer",
    "Τζιτζικάκι": "Leafhopper",
    "Βακτηριακό έλκος": "Bacterial canker",
    "Ανθράκνωση": "Anthracnose",
    "Ωϊδιο": "Powdery mildew",
    "Άκαρι πιπεριάς": "Pepper mite",
    
    // Pests
    "Αφίδες: Macrosiphum": "Aphids: Macrosiphum",
    "Αφίδες": "Aphids",
    "Τετράνυχοι: Tetranychus": "Spider mites: Tetranychus",
    
    // Weeds
    "Αγριοντοματιά, στύφνος": "Black nightshade",
    "μουχρίτσα": "Barnyard grass",
    "ΠΛΑΤΥΦΥΛΛΑ": "Broadleaf weeds",
    "ΑΓΡΩΣΤΩΔΗ ΕΤΗΣΙΑ": "Annual grasses",
    "Λουβουδιά": "Common lambsquarters",
    "αγριοπιπεριά": "Wild pepper",

    // Micronutrients and Additives
    "Φύκια": "Seaweed"

  };
 
  // Translation function
function translate(word, mapping) {
    if (!word) return null;
    
    const normalizedWord = word.toLowerCase().trim();
    const translation = Object.keys(mapping).find(
      key => key.toLowerCase().trim() === normalizedWord
    );
    // console.log("Translation is",translation)
    return translation ? mapping[translation] : word;
  }
  
export { mapping, translate };
