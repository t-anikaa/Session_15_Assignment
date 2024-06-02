// // Do a supervised classification by using Sentinel-2 for your upazila, export the 
// // classified image, prepare fine-tuned map

var adm3 = ee.FeatureCollection("projects/ee-atahsinhaque20/assets/BGD_adm3"),
    Settlement = /* color: #d63000 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([92.19809636639647, 21.08816387144375]),
            {
              "landcover": 0,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19835922287993, 21.08783102848974]),
            {
              "landcover": 0,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19860062169127, 21.088021224554765]),
            {
              "landcover": 0,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19745800065093, 21.088314025915796]),
            {
              "landcover": 0,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([92.1974365429788, 21.088596816426104]),
            {
              "landcover": 0,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19751969145827, 21.087963665244978]),
            {
              "landcover": 0,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19853624867491, 21.08773092519983]),
            {
              "landcover": 0,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19938650893263, 21.087725920033556]),
            {
              "landcover": 0,
              "system:index": "7"
            })]),
    Vegetation = /* color: #98ff00 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([92.19656750725798, 21.088208917801303]),
            {
              "landcover": 1,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19652995633177, 21.0878285259083]),
            {
              "landcover": 1,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19664529131941, 21.0877084019503]),
            {
              "landcover": 1,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19967886971526, 21.088359072227814]),
            {
              "landcover": 1,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([92.20004365014128, 21.08842413909884]),
            {
              "landcover": 1,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([92.20005437897734, 21.088051255490143]),
            {
              "landcover": 1,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([92.19957694577269, 21.088566785601007]),
            {
              "landcover": 1,
              "system:index": "6"
            })]),
    Waterbody = /* color: #0b4a8b */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([92.22161686759189, 21.096700234307878]),
            {
              "landcover": 2,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([92.21650994162754, 21.096349893416438]),
            {
              "landcover": 2,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([92.21522248130039, 21.097420932971495]),
            {
              "landcover": 2,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([92.22202456336215, 21.09446804820057]),
            {
              "landcover": 2,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([92.21438563208774, 21.095348914886998]),
            {
              "landcover": 2,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([92.21478389666409, 21.091756669031987]),
            {
              "landcover": 2,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([92.21837805674404, 21.091146054049254]),
            {
              "landcover": 2,
              "system:index": "6"
            })]);
// Filtering out desired upazila:
var myRegion = adm3.filter(ee.Filter.eq("NAME_3", "Teknaf"));
print(myRegion);
Map.addLayer(myRegion, {}, "Teknaf");
Map.centerObject(myRegion);

// Using Sentinel-2 data for desired region & time:
var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(myRegion)
          .filterDate("2022-01-01", "2023-01-01")
          .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10);

// Get the median image for the specified period:
var medianImage = sentinel2.median().clip(myRegion);

// Add NDVI, NDBI, MNDWI:
var ndvi = medianImage.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = medianImage.normalizedDifference(['B11', 'B8']).rename('NDBI');
var mndwi = medianImage.normalizedDifference(['B3', 'B11']).rename('MNDWI');
var image = medianImage.addBands([ndvi, ndbi, mndwi]);

// Merge the feature collections:
var trainingData = Vegetation.merge(Waterbody).merge(Settlement);
print(trainingData);

// Sample the input imagery to get a feature collection of training data:
var training = image.sampleRegions({
  collection: trainingData,
  properties: ['landcover'],
  scale: 10
});
print(training);

// Train a classifier:
var classifier = ee.Classifier.smileRandomForest(50).train({
  features: training,
  classProperty: 'landcover',
  inputProperties: image.bandNames()
});

// Classify the image:
var classified = image.classify(classifier);

// Define visualizing parameters:
var visParams = {
  min: 0,
  max: 2,
  palette: ['blue', 'gray', 'green']
};

// Add the layers to the map:
Map.centerObject(myRegion, 12);
Map.addLayer(medianImage, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Sentinel 2');
Map.addLayer(classified, visParams, 'LULC Classification');

// Export the classified image to Drive:
Export.image.toDrive({
  image: classified,
  description: 'LULC_Classification_Teknaf',
  scale: 10,
  region: myRegion.geometry().bounds(),
  fileFormat: 'GeoTIFF'
});

// Calculate area for each landcover class:
var area = ee.Image.pixelArea().addBands(classified)
            .reduceRegion({
              geometry: myRegion,
              reducer: ee.Reducer.sum().group({
                groupField: 1,
                groupName: "landcover"
              }),
              scale: 10,
              bestEffort: true
            }).get("groups");
print(area);

var classArea = ee.FeatureCollection(ee.List(area).map(function(cls){
  var cls = ee.Dictionary(cls);
  return ee.Feature(null, cls);
}));
print(classArea);
