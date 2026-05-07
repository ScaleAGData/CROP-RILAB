var bbox = ee.FeatureCollection('projects/ee-charvalisgeo/assets/Lasithi_ROI'); // Input the region of interest polygon.
var parcels = ee.FeatureCollection('projects/ee-charvalisgeo/assets/Lasithi_Parcels_2023');// Input the region of interest parcel polygons for the target year (2023)

// Function to mask clouds using the Sentinel-2 QA band.
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data, without the QA bands.
  return image.updateMask(mask).divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start"]);
}

// Map the function over data and take the median.
var collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') // We use Copernicus sentinel-2 harmonized product
    .filterDate('2023-05-25', '2023-07-01')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2clouds);

var composite = collection.median();

// Clip the composite to the bbox
var clippedComposite = composite.clip(bbox);

// Display the results and assets
Map.centerObject(bbox, 14);
Map.addLayer(clippedComposite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'RGB (Clipped)');
Map.addLayer(bbox, {color: 'red'}, 'Bounding Box', false);
Map.addLayer(parcels, {color: 'orange'}, 'Potato parcels');

// //////// SUPERVISED CLASSIFICATION ////////

// Define the training geometries (provided at the end of the script)
var polygons = ee.FeatureCollection([
  ee.Feature(noncrop, {'class': 0}),
  ee.Feature(crop, {'class': 1}),
]);

// Use these bands for prediction.
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

// Get the values for all pixels in each polygon for training.
var training = clippedComposite.sampleRegions({
  collection: polygons,
  properties: ['class'],
  scale: 10 
});

// Create an SVM classifier with custom parameters.
var classifier = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.5,
  cost: 10
});

// Train the classifier.
var trained = classifier.train(training, 'class', bands);

// Classify the image.
var classified = clippedComposite.classify(trained);

// Display only the "1" values (crop) in blue and make "0" values transparent.
Map.addLayer(classified.updateMask(classified.eq(1)),
             {min: 0, max: 1, palette: ['black', 'blue']},
             'Crop Presence');

// //////// GEOMETRY DEFINITIONS ////////

var crop = ee.Geometry.MultiPolygon(
        [[[[25.441926895207388, 35.17824879862025],
           [25.441733776158316, 35.17789583108084],
           [25.441782055920584, 35.17774894351656],
           [25.441926895207388, 35.177845407021536],
           [25.44212001425646, 35.17815672027947]]],
         [[[25.442774473256094, 35.17829922242936],
           [25.442994414395315, 35.178134796849655],
           [25.443302868432028, 35.17853380234734],
           [25.443053422993643, 35.17865657287566]]],
         [[[25.444534002369863, 35.17706054154412],
           [25.444802223271353, 35.17688076682062],
           [25.445000706738455, 35.17711315846115],
           [25.444689570492727, 35.1772578548074]]],
         [[[25.510167656964285, 35.173504435973506],
           [25.51032858950518, 35.17341235225888],
           [25.510634361332876, 35.17369298801615],
           [25.510462699955923, 35.17380261109572]]],
         [[[25.46567893236037, 35.17901350587955],
           [25.465720506644065, 35.17887538958656],
           [25.46575135200377, 35.178816196902616],
           [25.465825112720747, 35.178822773807426],
           [25.465802313975054, 35.1790135058795],
           [25.465775491884905, 35.179364276255605],
           [25.46567356794234, 35.17934235315143]]]]),
    noncrop = ee.Geometry.MultiPolygon(
        [[[[25.483681132007312, 35.178915027129484],
           [25.48401372592516, 35.17924825942645],
           [25.483048130679798, 35.17958149035731],
           [25.482833553958606, 35.17914302832235],
           [25.48327343623705, 35.17863440939878],
           [25.484335591006946, 35.17809947916612],
           [25.4840029970891, 35.17784516683735],
           [25.48503296535082, 35.1772926924849],
           [25.485183169055652, 35.178169634151295],
           [25.48375623385973, 35.178757179775154]]],
         [[[25.48173921268053, 35.17741546488769],
           [25.483101774860096, 35.17642451091622],
           [25.483305622745227, 35.17674021437761],
           [25.482061077762317, 35.177494389905895]]],
         [[[25.477115084338855, 35.176845448592296],
           [25.477844645190906, 35.176827909565965],
           [25.47797339122362, 35.177459312129486],
           [25.47724383037157, 35.177055916612964]]],
         [[[25.483917166400623, 35.16842628095179],
           [25.480655600238514, 35.166847589963936],
           [25.47921793620653, 35.16518116067244],
           [25.481599737811756, 35.163146316497475],
           [25.48569815318651, 35.16169031916087],
           [25.490311552692127, 35.16305860655232],
           [25.487629343677234, 35.16775972627296]]],
         [[[25.49943106334276, 35.163216484385494],
           [25.49522535960741, 35.16032200875121],
           [25.501598288226795, 35.15760286205572],
           [25.505310465503406, 35.157660750478495],
           [25.506855417895984, 35.162620055407736],
           [25.505074431110096, 35.16419882846153],
           [25.50099747340746, 35.163023522547775]]],
         [[[25.514086653400135, 35.16414620318682],
           [25.5114688174016, 35.16277793409221],
           [25.513078142810535, 35.16126930302491],
           [25.515331198383045, 35.162690223749784]]],
         [[[25.52095310847826, 35.16214641751563],
           [25.52018063228197, 35.16432162063676],
           [25.513507296252918, 35.15967293037957],
           [25.511597563434314, 35.15719936802758],
           [25.517047812152576, 35.15635728708752],
           [25.522498060870838, 35.158322129055364]]],
         [[[25.441430975604725, 35.19992352765013],
           [25.431989599872303, 35.19922216286957],
           [25.434478689838123, 35.19788955310133],
           [25.44280426662035, 35.19571524812344]]],
         [[[25.4380406634099, 35.17758208428066],
           [25.43879168193407, 35.17623158041956],
           [25.44125931422777, 35.177371617622256],
           [25.440637041736316, 35.178160864781475],
           [25.439242293048572, 35.17789778324651]]],
         [[[25.442117621112537, 35.17668759721919],
           [25.441388060260486, 35.177266384088725],
           [25.441860129047107, 35.17665251909466],
           [25.44351236980028, 35.17586325729087],
           [25.444091726947498, 35.17624911957456],
           [25.442975927997303, 35.17686298761483]]],
         [[[25.450979639697742, 35.17393391840036],
           [25.45381205241747, 35.174056695875706],
           [25.453618933368396, 35.17510906663002],
           [25.451151301074695, 35.17507398782437]]],
         [[[25.442997385669422, 35.18073901876544],
           [25.444220472980213, 35.17998487334056],
           [25.44351236980028, 35.1791079512574],
           [25.444241930652332, 35.17858179346642],
           [25.444971491504383, 35.17986210481845],
           [25.443662573505115, 35.18093193856414]]]]);
