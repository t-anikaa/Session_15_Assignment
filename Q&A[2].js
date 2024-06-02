// Do a unsupervised classification by using Landsat-9 for your upazila, export the 
// classified image, prepare fine-tuned map


var adm3 = ee.FeatureCollection("projects/ee-atahsinhaque20/assets/BGD_adm3");
// Filtering out desired upazila:
var myRegion = adm3.filter(ee.Filter.eq("NAME_3", "Teknaf"));
print(myRegion);
Map.addLayer(myRegion, {}, "Teknaf");
Map.centerObject(myRegion);

// Using Landsat 9 data for desired region & time:
var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_TOA")
          .filterBounds(myRegion)
          .filterDate("2022-01-01", "2023-01-01")
          .filterMetadata('CLOUD_COVER', 'less_than', 10) 
          .select(["B2", "B3", "B4", "B5"]);

var l9_mean = l9.mean().clip(myRegion);
print(l9_mean);

// Visualizing on the map: 
Map.addLayer(l9_mean, {}, 'Landsat 9 Mean');

// Select bands for clustering:
var bands = ["B2", "B3", "B4", "B5"];
var image = l9_mean.select(bands);
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Landsat 9 RGB');

// Sample the image:
var training = image.sample({
  region: myRegion,
  scale: 30, 
  numPixels: 5000
});

// Printing the training data:
print(training);

// Instantiating the cluster & training it:
var clusterer = ee.Clusterer.wekaKMeans(5).train(training);

// Clustering the image:
var result = image.cluster(clusterer);
print(result);

// Adding the cluster result to the map:
Map.addLayer(result.randomVisualizer(), {}, 'K-Means Clusters');

// Exporting the clustered image:
Export.image.toDrive({
  image: result,
  description: 'K-Means_Cluster',
  scale: 30, 
  region: myRegion.geometry().bounds(),
  maxPixels: 1e13,
  folder: "Class 14 of GEE"
});

