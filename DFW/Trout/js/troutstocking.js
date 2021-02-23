var store;
var map;
var defQueryString;

require([
		"esri/map",
		"esri/geometry/Extent",
		"esri/geometry/Point",
		"esri/layers/FeatureLayer",
		"esri/arcgis/utils",
		"esri/tasks/query",
		"esri/tasks/QueryTask",
		"esri/SpatialReference",
		"esri/symbols/SimpleLineSymbol",
		"esri/symbols/SimpleMarkerSymbol",
		"esri/symbols/SimpleFillSymbol",		
		"esri/symbols/PictureFillSymbol",
		"esri/symbols/TextSymbol",
		"esri/renderers/SimpleRenderer",
		"esri/renderers/ScaleDependentRenderer",
		"esri/InfoTemplate",
		"esri/layers/LabelLayer",
		"esri/dijit/Scalebar",
		"esri/dijit/Print",
		"esri/tasks/PrintTemplate",
		"esri/config",
		"esri/request",
		"dojo/_base/array",
		"dojo/_base/Color",
		"dojo/parser",
		"dojo/_base/unload",
		"dijit/form/FilteringSelect",
		"dijit/Dialog",
		"dojo/store/Memory",
		"dojo/json",
		"dojo/text!./js/towns.json",
		"dojo/_base/connect",
		"dojo/dom-style",
		"dojo/dom-class",
		"dojo/dom",
		"dojo/on",
		"dojo/promise/all",
		"dojo/query",
		"dojo/ready",
		"dijit/layout/BorderContainer",
		"dijit/layout/ContentPane",
		"dijit/TitlePane",
		"dijit/layout/AccordionContainer",
		"dojo/domReady!"
	], function (
		Map, Extent, Point, FeatureLayer, arcgisUtils, Query, queryTask, SpatialReference, SimpleLineSymbol, SimpleMarkerSymbol, SimpleFillSymbol, PictureFillSymbol, TextSymbol, SimpleRenderer, ScaleDependentRenderer, InfoTemplate, LabelLayer, Scalebar, Print, PrintTemplate, esriConfig, esriRequest, arrayUtils, Color, parser, baseUnload, FilteringSelect, Dialog, Memory, json, towns, connect, domStyle, domClass, dom, on, all, query, ready) {
	var gsURL = "https://maps.massgis.state.ma.us/arcgisserver/rest/services/Utilities/Geometry/GeometryServer"; // url to DEP geometry service
	esriConfig.defaults.io.proxyUrl = "/proxy";
	esriConfig.defaults.io.corsEnabledServers.push("https://maps.massgis.state.ma.us/arcgisserver/rest/services/");
	var townsURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/MA_towns_multipart/FeatureServer/0"; //towns layer location
	var waterbodiesURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/TroutStockingLayer/FeatureServer/0"; //Waterbodies layer
	var waterCentroidURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/TroutStockingLayer/FeatureServer/1"; //Waterbodies layer
	var nonStockedWaterCentroidURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Trout_Stocking_Waterbodies_ALL/FeatureServer/1"; 
	//Waterbodies layer
	parser.parse(); //scan DOM, instantiate nodes with dojo attributes
	
	var text = "";
	var text2 = "";
	var options = {'showRowNumber': true};
    var data,datadates;

		map = new esri.Map("mapDiv", {
			sliderOrientation : "horizontal",
			basemap : "topo",
			center : [-71.7, 42.236],
			zoom : 8,
			maxZoom : 16
		});
		
		//###############################################################################################TOWNS COMBOBOX
	// create store instance referencing data from towns.json
	var TownStore = new Memory({idProperty : "name",data : json.parse(towns)});
	// create FilteringSelect widget, populating its options from the store
	var townSelect = new FilteringSelect({
			name : "TownSelect",
			placeHolder : "Select a City/Town",
			style : "width:200px;left:1.8%;top:3.8em;position:absolute;z-Index:999;",
			required : false,
			maxHeight : 312,
			store : TownStore,
			onChange : function (val) {
				if (val != "") { //Stops the onChange from a reset from firing this again
					placeQueryAndZoom("TOWN = '" + val.toUpperCase() + "'", townsURL)
					console.log("TOWN_LINK: " + param_URL + "TOWN = '" + val.toUpperCase() + "'")
				}
			}

		}, "TownSelect");
	townSelect.startup();
	   //###############################################################################################################
	   
	 //MUST USE FIRST SHEET IN GOOGLE SHEETS - CHECK IF THIS IS TRUE
	//Test URL
	//https://docs.google.com/spreadsheets/d/1cM8_wnzcX55N0w1dbAUEfdTEm25dNHVVxLD-fyx-Lsg/edit#gid=0
	//Query For Popup Information
	var fishquery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1NNPcPjjFD8a6bIBDKlq8BpEiuQS1pnOUtmpDcrXi9To/edit#gid=0');

	var stockedQuery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1NNPcPjjFD8a6bIBDKlq8BpEiuQS1pnOUtmpDcrXi9To/edit#gid=0');
		
	//fall? Unstocked waterbodies/centroid sheet
	var unStockedQuery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1MYcQMDXbapFvdbIfiHkEf1vaqEvht9ekFbAc6CfgGTE/edit#gid=0');
	
	var showWaterbodiesQuery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1yedDqFS59PIHnOYWYy8tNnLEbHBWVQ_GZxtGOuRkDzQ/edit#gid=0');
	
	//build query task
    queryTask = new esri.tasks.QueryTask("https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/TroutStockingLayer/FeatureServer/23");
	
	

	//Google Queries
	stockedQuery.setQuery('SELECT D');
	unStockedQuery.setQuery('SELECT D');
	showWaterbodiesQuery.setQuery('SELECT D');

	//create the three definition queries
	//UNSTOCKED
	function createUnstockedDefQuery(response){
		console.log(response)
		wbc2 = response.getDataTable().getDistinctValues(0);
		wbc2 = wbc2.slice(0,wbc2.length)
		wbc2 = replaceAll(wbc2.toString(),",","','")
		//wbc2 = "96244-261"
		defUnstockedQueryString = "STK_WB_ID IN ('" + wbc2 + "')"
		//console.log(defUnstockedQueryString)
		noStockWaterbodyCentroids.setDefinitionExpression(defUnstockedQueryString)
	}
	//STOCKED
	function createDefQuery(response){
		wbc = response.getDataTable().getDistinctValues(0);
		wbc = wbc.slice(0,wbc.length)
		wbc = replaceAll(wbc.toString(),",","','")
		defQueryString = "STK_WB_ID IN ('" + wbc + "')"
		//nondefQueryString = "STK_WB_ID NOT IN ('" + wbc + "')"
		//console.log(defQueryString)
		waterbodyCentroids.setDefinitionExpression(defQueryString)
		//noStockWaterbodyCentroids.setDefinitionExpression(nondefQueryString)
	}
	
		//WATERBODIES will match stocked and to be stocked.
	function createWaterbodiesDefQuery(response){
		wbc3 = response.getDataTable().getDistinctValues(0);
		wbc3 = wbc3.slice(0,wbc3.length);
		wbc3 = replaceAll(wbc3.toString(),",","','");
		defWaterbodyQueryString = "STK_WB_ID IN ('" + wbc3 + "')";
		//console.log(defWaterbodyQueryString)
		waterbodies.setDefinitionExpression(defWaterbodyQueryString);
}
	
		map.on("click", function(evt) {
          //alert("User clicked on " + evt.mapPoint.x +", " + evt.mapPoint.y);
		 var query = new Query();
		        var centerPoint = new esri.geometry.Point
                (evt.mapPoint.x,evt.mapPoint.y,evt.mapPoint.spatialReference);
        var mapWidth = map.extent.getWidth();

        //Divide width in map units by width in pixels
        var pixelWidth = mapWidth/map.width;

        //Calculate a 10 pixel envelope width (5 pixel tolerance on each side)
        var tolerance = 20 * pixelWidth;

        //Build tolerance envelope and set it as the query geometry
        var queryExtent = new esri.geometry.Extent
                (1,1,tolerance,tolerance,evt.mapPoint.spatialReference);
        query.geometry = queryExtent.centerAt(centerPoint);
		//If Waterbodies are visible then highlight the waterbody otherwise highlight the point.

		if (waterbodies.visibleAtMapScale === true){
				waterbodies.selectFeatures(query)
				waterbodyCentroids.clearSelection()
			}
				else
			{
				waterbodyCentroids.selectFeatures(query)
				waterbodies.clearSelection()
			}
			
	    //NEEDS A TRY CATCH BLOCK
		//if (map.getScale()>200000){
				waterbodyCentroids.queryFeatures(query, makeGoogleQuery);
			  //}
			 //else
			  //{
				//waterbodies.queryFeatures(query, makeGoogleQuery);
									//}
		});
	function makeGoogleQuery(results) {
		try{
		myResult = results.features[0].attributes.STK_WB_ID
		fishquery.setQuery('SELECT A,B,C,E WHERE D = "' + myResult + '"'); 
		orderOutForFish();
						  }
		  catch(err){
			  myResult = ""
		  }
		}

    function orderOutForFish() {
        // Send the query with a callback function.
		  fishquery.send(handleQueryResponse)
    }
 
    function handleQueryResponse(response) {

        if (response.isError()) {
            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
            return;
        }

        data = response.getDataTable().getDistinctValues(3);
		dataWaterBody = response.getDataTable().getDistinctValues(1);
		dataTown = response.getDataTable().getDistinctValues(2);
		var index,index2;
		//Species
		for	(index = 0; index < data.length; index++) {
				text += data[index]
				if (index < (data.length - 1)){text += ", "}
			}
		//Date
		datadates = response.getDataTable().getDistinctValues(0);
		for	(index2 = 0; index2 < datadates.length; index2++) {
				text2 += datadates[index2].toLocaleDateString(); 
				if (index2 < (datadates.length - 1)){text2 += ", "}
			} 
		var stockingInfo = new InfoTemplate(text2, text);
		if (text.length != 0) {
		stockingDialog = new Dialog({
			title : dataWaterBody,
			content : "<div><b>"+dataTown+"</b><br /><br /><b>Stocking date(s):</b> "+text2+"<br />---<br /><b>Species:</b> "+text+"</div>",
			style : "width: 300px",
			duration: 1000
		});
		stockingDialog.show();
		}
		else{
		stockingDialog = new Dialog({
			title : "Trout Stocking",
			content : "<div><b>Coming Soon.</b></div>",
			style : "width: 300px",
			duration: 1000
		});
		stockingDialog.show();
		}
		text = "";
		text2 = "";
    }
 
    //google.setOnLoadCallback(orderOutForFish);
	var stockingDialog;
	
	//SYMBOLOGY################################################################################--------
	var waterbodySymbol = new SimpleFillSymbol().setColor(new Color([246, 230, 251, 1]));
	waterbodySymbol.outline.setStyle(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0]));
	waterbodySymbol.outline.setWidth(2);
	var waterbodyRenderer = new SimpleRenderer(waterbodySymbol)
	
		//UNSTOCKED POINTS - AKA COMING SOON! 
	              var zsymbol1 = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 6,  //STATEWIDE
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new  Color([0, 0, 0, 0.0]), 0.5),  //Outine Fill
                    new  Color([95, 5, 59, 0.7])  //Marker Fill
                  );
				  var zsymbol2 = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 10, //~WATERSHED
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new  Color([0, 0, 0, 0]), 2),  //Outine Fill
                    new  Color([95, 5, 59, 0.7])  //Marker Fill
                  );
				  var NSwaterbodyRenderer1 = new SimpleRenderer(zsymbol1)
				  zsymbol2.setSize(16)
				  var NSwaterbodyRenderer2 = new SimpleRenderer(zsymbol2)
				  
	    var params = {rendererInfos: [{
          "renderer": NSwaterbodyRenderer1,
          "minScale": 50000000,
          "maxScale": 200000
        }, {
          "renderer": NSwaterbodyRenderer2,
          "minScale": 200000,
          "maxScale": 1
        }]};

		var scaleDependentRenderer = new ScaleDependentRenderer(params);
		
		//STOCKED POINTS
        	var usymbol1 = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 8,  //STATEWIDE
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new  Color([0, 0, 0, 0.5]), 0.5),  //Outine Fill
                    new  Color([7, 229, 233, 1])  //Marker Fill
                  );
				  var usymbol2 = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, //~WATERSHED
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new  Color([0, 0, 0, 1]), 2),  //Outine Fill
                    new  Color([7, 229, 233, 1])  //Marker Fill
                  );
				  var stockedWaterbodyRenderer1 = new SimpleRenderer(usymbol1)
				  usymbol2.setSize(16)
				  var stockedWaterbodyRenderer2 = new SimpleRenderer(usymbol2)
				  
	    var params = {rendererInfos: [{
          "renderer": stockedWaterbodyRenderer1,
          "minScale": 50000000,
          "maxScale": 200000
        }, {
          "renderer": stockedWaterbodyRenderer2,
          "minScale": 200000,
          "maxScale": 1
        }]};

		var scaleDependentRenderer2 = new ScaleDependentRenderer(params);
		
//LAYERS################################################################################--------

	var waterbodies = new FeatureLayer(waterbodiesURL, {
			//infoTemplate : new InfoTemplate("<b>${NAME}</b>", "NO STOCKING OCCURED"),
			mode : 1, // 1 =.MODE_ONDEMAND,
			id : "Waterbodies",
			opacity : 0.5,
			outFields : ["STK_WB_ID"],
			minScale:200000
		});
    waterbodies.setRenderer(waterbodyRenderer);
	
		var waterbodyCentroids = new FeatureLayer(waterCentroidURL, {
			//infoTemplate : new InfoTemplate("<b>${NAME}</b>", "NO STOCKING OCCURED"),
			mode : 1, // 1 =.MODE_ONDEMAND,
			id : "Stocked Waterbodies",
			outFields : ["STK_WB_ID"],
			//maxScale : 120001,
			visible:false
		});
		//waterbodyCentroids.setRenderer(scaleDependentRenderer2);
		var noStockWaterbodyCentroids = new FeatureLayer(nonStockedWaterCentroidURL, {
			infoTemplate : new InfoTemplate("<b>${mdfw_name}</b>", "Coming Soon"),
			mode : 1, // 1 =.MODE_ONDEMAND,
			id : "Coming Soon",
			outFields : ["STK_WB_ID","mdfw_name"],
			//maxScale : 120001,
			visible:false
		});
		
	noStockWaterbodyCentroids.setRenderer(scaleDependentRenderer);
	
	var WBSymbol = new SimpleFillSymbol(
			"solid",
			new SimpleLineSymbol("solid", new Color([0, 0, 0]), 1),
			new Color([0, 255, 255, 0.6]));
	waterbodies.setSelectionSymbol(WBSymbol);

			waterbodyCentroids.queryFeatures(query, makeGoogleQuery);
		
	function placeQueryAndZoom(queryString, URL, queryOutFields) { //queryOutFields optional
		//dojo.query("#progress").style("display", "block")
		var queryTask = new esri.tasks.QueryTask(URL);
		var query = new esri.tasks.Query();
			query.where = queryString
			query.returnGeometry = true;
			query.outFields = queryOutFields
			query.outSpatialReference = {
			wkid : 102100
			};
		queryTask.execute(query, function (results) {
			var extent = esri.graphicsExtent(results.features); //console.log(results.features[0].attributes.PROJ_ID1);
			map.setExtent(extent.expand(1.5), 1);
		}, function(){alert("The location you selected can't be found.\nYou could zoom and pan to it or select another site.");dojo.query("#progress").style("display", "none");});
	}
			

//////////////////////////////ADD LAYERS//////////////////////////////////
	map.addLayers([waterbodies,noStockWaterbodyCentroids,waterbodyCentroids]);//, townsurvey
/////////////////////////////////////////////////////////////////////////


	map.on("layer-add-result", function(layerAdded, errorMsg){
		if(layerAdded.layer === waterbodyCentroids){  
         stockedQuery.send(createDefQuery)
		 waterbodyCentroids.setVisibility(true)
		 };
		if(layerAdded.layer === noStockWaterbodyCentroids){  
         unStockedQuery.send(createUnstockedDefQuery)
		 noStockWaterbodyCentroids.setVisibility(true)
		 };
		if(layerAdded.layer === waterbodies){  
         showWaterbodiesQuery.send(createWaterbodiesDefQuery)
		 waterbodies.setVisibility(true)
		 };
		
	});
	
	var scalebar = new esri.dijit.Scalebar({
			map : map,
			attachTo : "bottom-left",
			scalebarUnit : "english",
			scalebarStyle : "ruler"
		});


	//---------------------------------------------------------------UTILITY
	function replaceAll(str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}
	function escapeRegExp(str) {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}

	function handleError(err) {
		alert("Unable to get webmap from DFW's Server: ", err);
	}

});
