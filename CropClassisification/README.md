README - Crop Classification Example Workflow in Google Earth Engine
===================================================================

Repository context
----------------------------
This folder contains an example Google Earth Engine (GEE) crop classification workflow for the Lasithi example area. The workflow demonstrates how to:

1. Upload the required vector inputs as Earth Engine assets.
2. Load Sentinel-2 Harmonized imagery for a selected time period.
3. Apply a basic cloud mask using the Sentinel-2 QA60 band.
4. Create a median Sentinel-2 composite.
5. Train a supervised Support Vector Machine (SVM) classifier using manually defined crop and non-crop training polygons.
6. Produce a binary crop presence classification output.
7. Visualize the classification result and optionally export it as GeoTIFF.

The example is intended as a reproducible demonstration case. It can be adapted for other regions, years, crops, training samples, or input parcel datasets.


Input files
-----------
The example uses the following files:

1. Example of Crop classification method.js
   - Google Earth Engine JavaScript code.
   - Loads the ROI and parcel assets.
   - Builds a Sentinel-2 composite.
   - Trains and applies an SVM crop/non-crop classifier.

2. Lasithi_ROI.zip
   - Region of interest polygon for the Lasithi example area.
   - Contains the required shapefile components:
     - Lasithi_ROI.shp
     - Lasithi_ROI.shx
     - Lasithi_ROI.dbf
     - Lasithi_ROI.prj
     - Lasithi_ROI.cpg
     - Lasithi_ROI.fix
   - Coordinate reference system: WGS 84 / EPSG:4326.

3. Lasithi_Parcels_2023.zip
   - Parcel polygons for the target year 2023.
   - Contains the required shapefile components:
     - Lasithi_Parcels_2023.shp
     - Lasithi_Parcels_2023.shx
     - Lasithi_Parcels_2023.dbf
     - Lasithi_Parcels_2023.prj
     - Lasithi_Parcels_2023.cpg
     - Lasithi_Parcels_2023.fix
   - Coordinate reference system: WGS 84 / EPSG:4326.


Required Google Earth Engine assets
-----------------------------------
Before running the script, upload the two shapefiles as GEE table assets.

Expected asset names used in the script:

- projects/ee-charvalisgeo/assets/Lasithi_ROI
- projects/ee-charvalisgeo/assets/Lasithi_Parcels_2023

If another user runs the workflow from a different Earth Engine account or project, these asset paths must be changed in the first two lines of the script.

Example:

var bbox = ee.FeatureCollection('projects/YOUR_PROJECT/assets/Lasithi_ROI');
var parcels = ee.FeatureCollection('projects/YOUR_PROJECT/assets/Lasithi_Parcels_2023');


How to upload the shapefiles to Google Earth Engine
---------------------------------------------------
1. Open the Google Earth Engine Code Editor:
   https://code.earthengine.google.com/

2. Go to the Assets tab.

3. Select NEW / Table upload / Shape files.

4. Upload the ROI shapefile:
   - Either upload Lasithi_ROI.zip directly, or unzip and select all core shapefile components together.
   - Required files are .shp, .shx, .dbf, and .prj.
   - Set the asset name as:
     Lasithi_ROI

5. Upload the parcel shapefile:
   - Either upload Lasithi_ROI.zip directly, or unzip and select all core shapefile components together.
   - Set the asset name as:
     Lasithi_Parcels_2023

6. Wait until both upload tasks are completed.

7. Confirm that the assets exist in your GEE project and that their final asset IDs match the paths used in the JavaScript script.


How to run the script
---------------------
1. Open Google Earth Engine Code Editor.

2. Create a new script.

3. Copy the contents of:
   Example of Crop classification method.js

4. Paste the code into the new GEE script.

5. Update the first two lines if your asset paths are different:

   var bbox = ee.FeatureCollection('projects/ee-charvalisgeo/assets/Lasithi_ROI');
   var parcels = ee.FeatureCollection('projects/ee-charvalisgeo/assets/Lasithi_Parcels_2023');

6. Click Run.

7. The map should display:
   - RGB Sentinel-2 median composite clipped to the ROI.
   - ROI boundary.
   - Parcel polygons.
   - Binary crop presence classification layer.


Main workflow description
-------------------------
The script performs the following processing steps:

1. Load vector inputs
   - Loads the Lasithi ROI polygon.
   - Loads the 2023 parcel polygons.

2. Load Sentinel-2 imagery
   - Uses the COPERNICUS/S2_HARMONIZED image collection.
   - Filters images between 2023-05-25 and 2023-07-01.
   - Keeps images with less than 20% cloudy pixel percentage.

3. Apply cloud masking
   - Uses the QA60 band.
   - Masks pixels flagged as clouds or cirrus.
   - Scales Sentinel-2 reflectance values by dividing by 10000.

4. Create median composite
   - Calculates the median value for each pixel and band across the filtered Sentinel-2 collection.
   - Clips the final composite to the Lasithi ROI.

5. Define training data
   - Uses manually defined crop and non-crop training geometries inside the script.
   - Assigns class 1 to crop areas.
   - Assigns class 0 to non-crop areas.

6. Train classifier
   - Uses selected Sentinel-2 bands:
     B2, B3, B4, B5, B6, B7, B8
   - Samples pixels from the training polygons.
   - Trains an SVM classifier with RBF kernel, gamma = 0.5, and cost = 10.

7. Classify image
   - Applies the trained classifier to the clipped Sentinel-2 composite.
   - Creates a binary output where:
     - 1 = crop presence
     - 0 = non-crop / other land cover

8. Visualize result
   - Displays only crop class pixels by masking the classification output to class 1.


Optional: export classified raster to Google Drive
--------------------------------------------------
The provided script visualizes the result in GEE. To export the crop classification raster as a GeoTIFF, add the following block at the end of the script:

Export.image.toDrive({
  image: classified.toByte(),
  description: 'Lasithi_crop_classification_2023',
  folder: 'GEE_exports',
  fileNamePrefix: 'Lasithi_crop_classification_2023',
  region: bbox.geometry(),
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});

After running the script:

1. Open the Tasks tab in Google Earth Engine.
2. Find the export task named Lasithi_crop_classification_2023.
3. Click Run.
4. Confirm the export settings.
5. Wait for the GeoTIFF to be exported to the selected Google Drive folder.


Optional: export crop-only mask
-------------------------------
If only crop pixels are needed, use this export instead:

var cropOnly = classified.updateMask(classified.eq(1)).toByte();

Export.image.toDrive({
  image: cropOnly,
  description: 'Lasithi_crop_presence_mask_2023',
  folder: 'GEE_exports',
  fileNamePrefix: 'Lasithi_crop_presence_mask_2023',
  region: bbox.geometry(),
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});


Optional: export parcel layer
-----------------------------
If the parcel polygons also need to be exported from GEE, add:

Export.table.toDrive({
  collection: parcels,
  description: 'Lasithi_Parcels_2023_export',
  folder: 'GEE_exports',
  fileNamePrefix: 'Lasithi_Parcels_2023',
  fileFormat: 'SHP'
});


Expected outputs
----------------
Depending on the export block used, the expected outputs are:

1. Lasithi_crop_classification_2023.tif
   - Binary classified GeoTIFF.
   - Pixel values:
     - 0 = non-crop / other land cover
     - 1 = crop presence

2. Lasithi_crop_presence_mask_2023.tif
   - Crop-only raster mask.
   - Only pixels classified as crop are visible / valid.

3. Lasithi_Parcels_2023 shapefile export, if the optional parcel export is used.


Parameters that can be adapted
------------------------------
The workflow can be adapted by modifying the following parameters:

1. Area of interest
   - Replace Lasithi_ROI with another ROI asset.

2. Parcel dataset
   - Replace Lasithi_Parcels_2023 with another parcel layer.

3. Classification period
   - Modify:
     .filterDate('2023-05-25', '2023-07-01')

4. Cloud threshold
   - Modify:
     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

5. Training polygons
   - Replace the crop and noncrop geometry definitions.
   - Ensure crop polygons are labelled class 1.
   - Ensure non-crop polygons are labelled class 0.

6. Predictor bands
   - Current bands:
     B2, B3, B4, B5, B6, B7, B8
   - Additional bands or indices such as NDVI can be added in future versions.

7. Classifier settings
   - Current classifier:
     ee.Classifier.libsvm({
       kernelType: 'RBF',
       gamma: 0.5,
       cost: 10
     })


Important notes
---------------
1. This is an example workflow and should be treated as a reproducible demonstration case, not as a fully automated national-scale crop classification pipeline.

2. The current training data are manually defined inside the script. For operational use, the quality and representativeness of training samples should be reviewed carefully.

3. The current output is binary crop / non-crop classification. It does not distinguish multiple crop types unless the training data and class schema are extended.

4. The parcel layer is used for visualization and contextual interpretation. In the current example script, classification is performed on Sentinel-2 pixels within the ROI, not directly parcel-by-parcel.

5. The exported raster can later be post-processed or zonally summarized against the parcel dataset if parcel-level crop presence statistics are required.

6. For better validation, the workflow can be extended with independent validation samples, a confusion matrix, accuracy assessment, and parcel-level aggregation.



Minimum requirements
--------------------
- Google Earth Engine account.
- Access to the Google Earth Engine Code Editor.
- Permission to create and read assets in the selected Earth Engine project.
- The uploaded ROI and parcel shapefile assets.
- The JavaScript workflow file.


Troubleshooting
---------------
1. Asset not found
   - Check that the asset paths in the first two script lines match your own GEE project.
   - Make sure the table upload tasks have completed successfully.

2. Empty map or missing classification layer
   - Check that the ROI overlaps the Sentinel-2 imagery and selected date range.
   - Check that the cloud filter is not too restrictive.
   - Check that the crop and non-crop training geometries are inside the ROI.

3. Export fails because of too many pixels
   - Keep the export region limited to bbox.geometry().
   - Increase maxPixels if needed.
   - Use scale: 10 for Sentinel-2 native resolution.

4. Output does not look correct
   - Review training polygons.
   - Add more representative crop and non-crop samples.
   - Consider adding spectral indices such as NDVI.
   - Consider using independent validation data.


Short description 
-----------------------------------
This folder provides an example Google Earth Engine crop classification workflow for the Lasithi ScaleAgData pilot area. The workflow uses Sentinel-2 Harmonized imagery, manually defined crop and non-crop training polygons, and an SVM classifier to generate a binary crop presence raster. Required input assets include the Lasithi ROI and 2023 parcel shapefiles. The workflow is intended as a reproducible example that can be adapted to other regions, years, or crop classification use cases.
