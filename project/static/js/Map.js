//*******************************************************************************************************************************************************
//Init Map
//*******************************************************************************************************************************************************
var lat = 19.432608;
var lng = -99.133209;
var zoom = 12;

// add an OpenStreetMap tile layer
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
	'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="http://mapbox.com">Mapbox</a>',
	mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';


var grayscale = L.tileLayer(mbUrl, {
	id: 'mapbox.light',
	attribution: mbAttr
}),
	streets = L.tileLayer(mbUrl, {
		id: 'mapbox.streets',
		attribution: mbAttr
	});


var map = L.map('map', {
	center: [lat, lng], // Mexico
	zoom: zoom,
	layers: [streets],
	zoomControl: true,
	fullscreenControl: true,
	fullscreenControlOptions: { // optional
		title: "Show me the fullscreen !",
		titleCancel: "Exit fullscreen mode",
		position: 'bottomright'
	}
});

var baseLayers = {
	"Grayscale": grayscale, // Grayscale tile layer
	"Streets": streets, // Streets tile layer
};

layerControl = L.control.layers(baseLayers, null, {
	position: 'bottomleft'
}).addTo(map);

// Initialise the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var featureGroup = L.featureGroup();

var shownLayer, polygon;

var parseTime = d3.timeParse("%m/%d/%Y %H:%M");
function DrawOnMap() {
	d3.json("/mexicotaxi/taxis", function (error, data) {
		if (!error) {
			data.forEach(function (d) {
				d["pickup_datetime"] = parseTime(d["pickup_datetime"]);
			});

			//Get data for specified time
			var startTime = parseInt(document.getElementById("startTime").value);
			var endTime = parseInt(document.getElementById("endTime").value);

			//Filter Trips
			var selectedTrips = [];
			for (var i = 0; i < data.length; ++i) {
				var hours = data[i].pickup_datetime.getHours();
				var minutes = data[i].pickup_datetime.getMinutes();
				if (startTime <= hours && endTime >= hours) {
					if (endTime == hours && minutes > 0) {
					}
					else {
						selectedTrips.push(data[i]);
					}
				}
			}

			DrawClusters(selectedTrips);
			DrawTextbox(selectedTrips);
			DrawBarchart(selectedTrips);
		}
		else {
			console.log('Could not load data...');
		}
	});

}

//*****************************************************************************************************************************************
// DrawClusters
//*****************************************************************************************************************************************
function DrawClusters(trips) {
	//Clear Map
	clearMap();

	//Create Cluster groups
	var markerClusters = L.markerClusterGroup({
		polygonOptions: {
			fillColor: 'rgb(8, 40, 83)',
			color: 'rgb(8, 40, 83)',
			weight: 0.4,
			opacity: 1,
			fillOpacity: 0.5
		},
		showCoverageOnHover: false,
		zoomToBoundsOnClick: false
	});

	//var time;
	for (var i = 0; i < trips.length; ++i) {

		var popup = trips[i].vendor_id + '<br/>' + trips[i].pickup_datetime;

		var m = L.marker([trips[i].pickup_latitude, trips[i].pickup_longitude]).bindPopup(popup);
		markerClusters.addLayer(m);
	}

	markerClusters.addTo(drawnItems);
	drawnItems.addLayer(markerClusters);


	markerClusters.on('clustermouseover', function (a) {
		removePolygon();

		a.layer.setOpacity(0.2);
		shownLayer = a.layer;
		polygon = L.polygon(a.layer.getConvexHull());
		map.addLayer(polygon);
	});
	markerClusters.on('clustermouseout', removePolygon);
}

//*****************************************************************************************************************************************
// DrawTextbox
//*****************************************************************************************************************************************
function DrawTextbox(trips) {
	var count = trips.length;

	//Width and height
	var svgWidth = 380;
	var svgHeight = 50;

	//Create SVG
	d3.select("#textbox > *").remove();
	var svg = d3.select("#textbox").append("svg")
		.attr("width", svgWidth)
		.attr("height", svgHeight)
		.attr("transform", "translate(40, 40)");

	//Add the SVG Text Element to the svgContainer
	svg.append("rect")
		.attr("width", svgWidth)
		.attr("height", svgHeight)
		.attr("class", "rect");

	svg.append("text")
		.text("Total Trips: " + count)
		.attr("class", "text")
		.attr("transform", "translate(85, 20)");
}

//*****************************************************************************************************************************************
// DrawBarchart
//*****************************************************************************************************************************************
function DrawBarchart(trips) {
	//Width and height
	var margin = { top: 40, right: 60, bottom: 30, left: 40 };
	var svgWidth = 380 - margin.left - margin.right;
	var svgHeight = 350 - margin.top - margin.bottom;

	//Create Scales
	var xScale = d3.scaleBand()
		.rangeRound([0, svgWidth])
		.paddingInner(0.05)
		.align(0.1);

	var yScale = d3.scaleLinear()
		.rangeRound([svgHeight, 0]);

	//Set Colors
	var colors = ['#000033', '#003333', '#003366', '#006633', '#006666', '#006699', '#009999'];
	var venders = ["Mexico DF Taxi de Sitio", "Mexico DF Radio Taxi", "Mexico DF UberX", "Mexico DF Taxi Libre", "Mexico DF UberXL", "Mexico DF UberBlack", "Mexico DF UberSUV"];

	var colorScale = d3.scaleOrdinal()
		.domain(origin)
		.range(colors);

	//Group by vender_Id to create bars
	var data = d3.nest()
		.key(function (d) {
			return d.vendor_id;
		})
		.rollup(function (v) {
			return v.length;
		})
		.entries(trips);

	//Create SVG
	d3.select("#barchart > *").remove();
	var svg = d3.select("#barchart").append("svg")
		.attr("width", svgWidth + margin.left + margin.right)
		.attr("height", svgHeight + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var tooltip = d3.select("body").append("div").attr("class", "toolTip");

	//Update Scales
	xScale.domain(data.map(function (d) {
		return d.key;
	}));
	yScale.domain([0, d3.max(data, function (d) {
		return d.value;
	})]);

	//Create barchart
	svg.selectAll("rect")
		.data(data)
		.enter().append("rect")
		.attr("x", function (d) {
			return xScale(d.key);
		})
		.attr("width", xScale.bandwidth)
		.attr("y", function (d) {
			return yScale(d.value);
		})
		.attr("height", function (d) {
			return svgHeight - yScale(d.value);
		})
		.attr("fill", function (d) {
			return colorScale(d.key);
		})
		.on("mousemove", function (d) {
			tooltip
				.style("left", d3.event.pageX - 50 + "px")
				.style("top", d3.event.pageY - 70 + "px")
				.style("display", "inline-block")
				.html((d.key) + "<br>" + "Trips: " + (d.value));
		})
		.on("mouseout", function (d) { tooltip.style("display", "none"); });

	//Add text to bars
	svg.selectAll("text")
		.data(data)
		.enter()
		.append("text")
		.text(function (d) {
			return d.value;
		})
		.attr("text-anchor", "middle")
		.attr("x", function (d, i) {
			return xScale(d.key) + 20;
		})
		.attr("y", function (d) {
			return yScale(d.value);
		})
		.attr("font-family", "sans-serif")
		.attr("font-size", "11px")
		.attr("fill", "black");

	//Create legend
	var legend = svg.append("g")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.attr("text-anchor", "end")
		.selectAll("g")
		.data(data)
		.enter().append("g")
		.attr("transform", function (d, i) {
			return "translate(50," + i * 20 + ")";
		});

	legend.append("rect")
		.attr("x", svgWidth - 19)
		.attr("width", 19)
		.attr("height", 19)
		.attr("fill", function (d) {
			return colorScale(d.key);
		});

	legend.append("text")
		.attr("x", svgWidth - 24)
		.attr("y", 9.5)
		.attr("dy", "0.32em")
		.text(function (d) {
			return d.key;
		});
}

//*****************************************************************************************************************************************
// Clear the Map
//***************************************************************************************************************************************** 
function clearMap() {
	for (i in map._layers) {
		if (map._layers[i]._markers != undefined) {
			try {
				map.removeLayer(map._layers[i]);
			} catch (e) {
				console.log("problem with " + e + map._layers[i]);
			}
		}
	}
}

//*****************************************************************************************************************************************
// Remove Polygon
//***************************************************************************************************************************************** 
function removePolygon() {
	if (shownLayer) {
		shownLayer.setOpacity(1);
		shownLayer = null;
	}
	if (polygon) {
		map.removeLayer(polygon);
		polygon = null;
	}
};
