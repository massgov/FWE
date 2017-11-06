var store;
var map;
var defQueryString;

require([
		"esri/map",
		"esri/geometry/Extent",
		"esri/geometry/Point",
		"esri/layers/FeatureLayer",
		"esri/arcgis/utils",
		"esri/dijit/BasemapToggle",
		"esri/tasks/query",
		"esri/tasks/QueryTask",
		"esri/SpatialReference",
		"esri/symbols/SimpleLineSymbol",
		"esri/symbols/SimpleMarkerSymbol",
		"esri/symbols/SimpleFillSymbol",		
		"esri/symbols/PictureFillSymbol",
		"esri/symbols/TextSymbol",
		"esri/renderers/SimpleRenderer",
		"esri/renderers/UniqueValueRenderer",
		"esri/layers/ArcGISTiledMapServiceLayer",
		"esri/InfoTemplate",
		"esri/dijit/BasemapGallery",
		"esri/layers/LabelLayer",
		"esri/dijit/Scalebar",
		"esri/dijit/OverviewMap",
		"esri/dijit/Legend",
		"esri/dijit/Print",
		"esri/tasks/PrintTemplate",
		"esri/config",
		"esri/request",
		"dojo/_base/array",
		"dojo/_base/Color",
		"dojo/parser",
		"dojo/_base/unload",
		"dojo/cookie",
		"dijit/form/FilteringSelect",
		"dijit/Dialog",
		"dojo/store/Memory",
		"dojo/json",
		"dojo/text!./js/towns.json",
		"dojo/_base/connect",
		"dijit/Menu",
		"dijit/MenuItem",
		"dijit/form/ComboButton",
		"dijit/form/Button",
		"dijit/form/Form",
		"dijit/form/TextBox",
		"dijit/Tooltip",
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
		Map, Extent, Point, FeatureLayer, arcgisUtils, BasemapToggle, Query, queryTask, SpatialReference, SimpleLineSymbol, SimpleMarkerSymbol, SimpleFillSymbol, PictureFillSymbol, TextSymbol, SimpleRenderer, UniqueValueRenderer, ArcGISTiledMapServiceLayer, InfoTemplate, BasemapGallery, LabelLayer, Scalebar, OverviewMap, Legend, Print, PrintTemplate, esriConfig, esriRequest, arrayUtils, Color, parser, baseUnload, cookie, FilteringSelect, Dialog, Memory, json, towns, connect, Menu, MenuItem, ComboButton, Button, Form, TextBox, Tooltip, domStyle, domClass, dom, on, all, query, ready) {
	var gsURL = "https://maps.env.state.ma.us/arcgisserver/rest/services/Utilities/Geometry/GeometryServer"; // url to DEP geometry service
	var printURL = "https://maps.env.state.ma.us/arcgisserver/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"; // url to DEP print service
	esriConfig.defaults.io.proxyUrl = "/proxy";
	esriConfig.defaults.io.corsEnabledServers.push("https://maps.env.state.ma.us/arcgisserver/rest/services/");
	var townsURL = "https://maps.env.state.ma.us/arcgisserver/rest/services/DFG/Wildlands_Map/MapServer/4"; //towns layer location
	//var waterbodiesURL = "https://209.80.128.244/arcgis/rest/services/DFG/DFW_Fisheries_Waterbodies/MapServer/0"; //Waterbodies layer
	var waterbodiesURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/TroutStockingLayer/FeatureServer/1"; //Waterbodies layer
	var waterCentroidURL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/TroutStockingLayer/FeatureServer/0"; //Waterbodies layer
	var lite_URL = "http://10.199.4.76:8080/TroutStocking/index.html?EXTENT=" // permalink url part
	//var advanced_URL = "http://maps.env.state.ma.us/dev/dfg/lis_advanced/index.html?EXTENT=" // permalink url part
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
	var TownStore = new Memory({
			idProperty : "name",
			data : json.parse(towns)
		});
	// create FilteringSelect widget, populating its options from the store
	var townSelect = new FilteringSelect({
			name : "TownSelect",
			placeHolder : "Select a City/Town",
			style : "width:220px;right:8%;top:22px;position:absolute;z-Index:999;",
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
		 	
	var fishquery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1KK8GV-eQQjSkqpzPaPLEGGrYInGjSBLOnuBBJ6_IhhI/edit#gid=0');
	
	var stockedQuery = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1KK8GV-eQQjSkqpzPaPLEGGrYInGjSBLOnuBBJ6_IhhI/edit#gid=0');
	
	 //build query task
     queryTask = new esri.tasks.QueryTask("https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Trout_Stocking/FeatureServer/1");

	
	stockedQuery.setQuery('SELECT D');

	function createDefQuery(response){
		wbc = response.getDataTable().getDistinctValues(0);
		wbc = wbc.slice(0,wbc.length)
		wbc = replaceAll(wbc.toString(),",","','")
		defQueryString = "STK_WB_ID IN ('" + wbc + "')"
		//console.log(defQueryString)
		waterbodies.setDefinitionExpression(defQueryString)
		waterbodyCentroids.setDefinitionExpression(defQueryString)
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
        var tolerance = 10 * pixelWidth;

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
		

          //query.geometry = evt.mapPoint;  //works for a single point in a polygon but not so great for points/lines
		  //NEEDS A TRY CATCH BLOCK
	if (map.getScale()>500000){
				waterbodyCentroids.queryFeatures(query, makeGoogleQuery);
			  }
			  else
			  {
				waterbodies.queryFeatures(query, makeGoogleQuery);
									}
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
			content : "<div><b>"+dataTown+"</b><br /><br /><b>Stocking date(s):</b> "+text2 + "<br />---<br /><b>Species:</b> " + text+"</div>",
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
	
	//################################################################################--------
	var waterbodySymbol = new SimpleFillSymbol().setColor(new Color([204, 0, 204, 1]));
	waterbodySymbol.outline.setStyle(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0]));
	waterbodySymbol.outline.setWidth(2);
	var waterbodyRenderer = new SimpleRenderer(waterbodySymbol)	
	
	var waterbodies = new FeatureLayer(waterbodiesURL, {
			//infoTemplate : new InfoTemplate("<b>${NAME}</b>", "NO STOCKING OCCURED"),
			mode : 1, // 1 =.MODE_ONDEMAND,
			id : "waterbodies",
			opacity : 0.5,
			outFields : ["STK_WB_ID"],
			minScale:500000
		});
    waterbodies.setRenderer(waterbodyRenderer);
		var waterbodyCentroids = new FeatureLayer(waterCentroidURL, {
			//infoTemplate : new InfoTemplate("<b>${NAME}</b>", "NO STOCKING OCCURED"),
			mode : 1, // 1 =.MODE_ONDEMAND,
			id : "waterbodies_centroids",
			outFields : ["STK_WB_ID"],
			maxScale : 120001,
			visible:false
		});
		
	        // selection symbol used to draw
        var symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE, 
          12, 
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_NULL, 
            new Color([247, 34, 101, 1]), 
            1
          ),
          new Color([0, 255, 255, 1])
        );
        waterbodyCentroids.setSelectionSymbol(symbol);
		
	

	
	var WBSymbol = new SimpleFillSymbol(
			"solid",
			new SimpleLineSymbol("solid", new Color([0, 0, 0]), 1),
			new Color([0, 255, 255, 0.6]));

	waterbodies.setSelectionSymbol(WBSymbol);
	
	var townSymbol = new SimpleFillSymbol(
			"solid",
			new SimpleLineSymbol("dashdot", new Color([0, 0, 0]), 1),
			new Color([232, 104, 80, 0.0]));
	var townrenderer = new SimpleRenderer(townSymbol);

	var townsurvey = new FeatureLayer(townsURL, {
			mode : FeatureLayer.MODE_ONDEMAND,
			id : "towns"
		});
	townsurvey.setRenderer(townrenderer);	
	//SAMPLE QUERY URL	
//http://10.199.4.76:8080/TroutStocking/index.html?EXTENT=STK_WB_ID=%2736129-309%27  --SHARE BY WATER/TOWN CODE
//OR by extent created fom the share button.
		//Zoom and set buttons from URL parameters
	if (getUrlParam("EXTENT") !== null) { //if there is no parameter in the url don't zoom and set a value on the permalink button.
	dojo.addOnLoad(function() {//wait for the DOM to load otherwise... map undefined
		var URLparam = getUrlParam("EXTENT").slice(0, 4)
			if (URLparam === "STK_") {
				placeQueryAndZoom(getUrlParam("EXTENT"), waterbodiesURL); //Read & Use LIS Name Site Parameter
			}else
			{
				pointZoom((getUrlParam("EXTENT")).split(',')); //Read & Use Towns Site Parameter
			}
				});
	}
	
		//Zoom and set buttons from URL parameters
//Could be for a show just this property, or just one agency's land
	//if (getUrlParam("DEFQUERY") !== null) { //if there is no parameter
	//}
	//query a field from the combobox called from the two filtering selects above or a URL parameter if there is one.
	//Wildlands or Towns 
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
	
	function pointZoom(coords) {
				map.centerAndZoom(new Point(parseFloat(coords[0]), parseFloat(coords[1]), new SpatialReference({
						wkid : 102100
				})), coords[2]); //extent is a point, zoom level
		};

	//START PRINTING FORM
	var aform = new Form();
	//Title
	var titleBox = new TextBox({
			placeHolder : "Enter Map Title Here",
			id : "titleForMap",
			style : "width: 476px;margin-bottom:10px;",
			maxLength : 75,
			onKeyDown : function noEnter(e){
				if(e.keyCode == dojo.keys.ENTER){
					dojo.stopEvent(e);
					}
				}
		}).placeAt(aform.containerNode);

	//Print Format Dropdown
	var menu = new Menu({
			style : "display: none;"
		});
	var menuItem1 = new MenuItem({
			id : 'menu1',
			value : 0,
			label : "8.5 x 11 Landscape",
			onClick : function () {
				abutton.set("label", this.label);
				abutton.set("value", this.value);
			}
		});
	var menuItem2 = new MenuItem({
			id : 'menu2',
			value : 1,
			label : "8.5 x 11 Portrait",
			onClick : function () {
				abutton.set("label", this.label);
				abutton.set("value", this.value);
			}
		});
	var menuItem3 = new MenuItem({
			id : 'menu3',
			value : 2,
			label : "12 x 18 Landscape",
			onClick : function () {
				abutton.set("label", this.label);
				abutton.set("value", this.value);
			}
		});
	var menuItem4 = new MenuItem({
			id : 'menu4',
			value : 3,
			label : "12 x 18 Portrait",
			onClick : function () {
				abutton.set("label", this.label);
				abutton.set("value", this.value);
			}
		});
	menu.addChild(menuItem1);
	menu.addChild(menuItem2);
	menu.addChild(menuItem3);
	menu.addChild(menuItem4);
	menu.startup();

	var abutton = new ComboButton({
			id : "Print_Formats",
			optionsTitle : "8.5 x 11 Landscape",
			dropDown : menu
		}).placeAt(aform.containerNode);
	abutton.startup();

	document.body.appendChild(aform.domNode);
	aform.domNode.appendChild(dojo.doc.createTextNode("Print Layout:  ")); //label for button
	aform.domNode.appendChild(abutton.domNode);

	new Button({
		label : "Create PDF",
		style : "float:right",
		onClick : function () {
			dojo.query("#PDFprogress").style("display", "block");
			createPrintTemplates(titleBox.value, abutton.value);
			dia.hide();
		}
	}).placeAt(aform.containerNode);

	var dia = new Dialog({
			content : aform,
			title : "Print a Wildlands Map",
			style : "width: 500px;"
		});
	aform.startup();
//#########Print Button, Permalink Button, Permalink Dialog
	var printButton = new Button({
			label : "Print",
			style : "display:none;",
			iconClass : "dijitEditorIcon dijitEditorIconPrint",
			onClick : function () {
				abutton.set("label", "8.5 x 11 Landscape"); //by setting these here you always get a button set to 8.5x11 landscape when the dialog is opened.
				abutton.set("value", 0); //alternatively they can be set in the abutton object properties and they will default to the last selected value.
				dia.show();
			}
		}, "print_button");
		
	var permform = new Form();
	//Title
		var permalinkTextBox = new TextBox({
			id : "permaTextBox",
			style : "width: 476px;margin-bottom:10px;",
			selectOnClick : true,
			maxLength : 75
		}).placeAt(permform.containerNode);
	
		new Button({
		label : "Close",
		style : "position:relative;left:13em;",
		onClick : function () {s
			permDialog.hide();
		}
	}).placeAt(permform.containerNode);
	
/*	new Button({
		label : "Advanced",
		style : "position:relative;float:right;",
		onClick : function () {
			var AdvLink = advanced_URL + map.extent.getCenter().x + ',' + map.extent.getCenter().y + ',' + map.getZoom()
			window.open(AdvLink);
			permDialog.hide();
		}
	}).placeAt(permform.containerNode);
	
		var permDialog = new Dialog({
			content : permform,
			title : "Share this map",
			style : "width: 500px;",
			autofocus:false
		});
	permform.startup();
	
	var permaButton = new Button({
			id: "perma",
			label : "Share",
			showLabel : true,
			iconClass : "dijitPermalink",
			disabled : false,
			tooltip : true,
			onClick : function () {
			permDialog.show();
			var myLink = lite_URL + map.extent.getCenter().x + ',' + map.extent.getCenter().y + ',' + map.getZoom()
			permalinkTextBox.set({"value": myLink});
			}
		}, "perma_button");
*/

	setTimeout(function () {
		query(".hidestart").style("visibility", "visible")
	}, 2000); //makes the load look a little nicer
	//######################################################################################-----------MAP & LAYERS
	// specify proxy for request with URL lengths > 2k characters
	esriConfig.defaults.io.proxyUrl = "/proxy";

		
	dojo.connect(map, "onExtentChange", hideProgress);

	function hideProgress() {
		query("#progress").style("display", "none")
	}	


	map.addLayers([waterbodyCentroids,waterbodies]);//, townsurvey
	
	//dojo.connect(map, "layers-add-result", stockedQuery.send(createDefQuery));
	map.on("layer-add-result", function(layerAdded, errorMsg){
		if(layerAdded.layer === waterbodyCentroids){  
         stockedQuery.send(createDefQuery)
		 waterbodyCentroids.setVisibility(true)
		 };
	});
	 //DEFINITION QUERY
	

/*
	map.on("extent-change", function () { //this is a hack about 1 in 20 times none of the layers would return.
		if (isIE ()) {// is IE < 9ish
			setTimeout(function(){LIS_OpenSpace.refresh();}, 1000);//refreshing one layer seems to take care of it.
		} else {
			LIS_OpenSpace.refresh();// is IE 9 and later or not IE
		}
		
	}); 
*/
	
	  //add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
 /*     var basemapGallery = new BasemapGallery({
        showArcGISBasemaps: true,
        map: map
		
      }, "basemapGallery");
      basemapGallery.startup();
      
      basemapGallery.on("error", function(msg) {
        console.log("basemap gallery error:  ", msg);
      });
*/
	var scalebar = new esri.dijit.Scalebar({
			map : map,
			attachTo : "bottom-left",
			scalebarUnit : "english",
			scalebarStyle : "ruler"
		});

/*	var overviewMapDijit = new OverviewMap({
			id : "overview",
			map : map,
			visible : false,
			attachTo : "bottom-right",
			color : "navy",
			opacity : 0.45,
			expandFactor : 2.5,
			height : 200
		});
	overviewMapDijit.startup();
*/
	var width = (window.innerWidth > 0) ? window.innerWidth : screen.width; //hide the overview map if we are on a small screen.
	if (width < 700) {
		//overviewMapDijit.hide();
	map.setZoom(7)
	}


	//---------------------------------------------------------------UTILITY
	function replaceAll(str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}
	function escapeRegExp(str) {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}
	//----------------------------------------------------------------PRINTING RELATED
	var templates;
	function createPrintTemplates(printTitle, printFormat) {
		var layoutTemplate,
		templateNames
		// create an array of objects that will be used to create print templates
		var layouts = [{
				name : "Letter ANSI A Landscape",
				label : "8.5 X 11 Landscape (PDF)",
				format : "pdf",
				options : {
					authorText : "Made by: Executive Office of Energy and Environmental Affairss",
					copyrightText : "Openspace boundaries do not constitute a legal description.",
					legendLayers : [], // empty array means no legend
					scalebarUnit : "Miles",
					titleText : printTitle //dynamic title set on facility drop down click.
				}
			}, {
				name : "Letter ANSI A Portrait",
				label : "Letter Portrait (PDF)",
				format : "pdf",
				options : {
					authorText : "Made by: Executive Office of Energy and Environmental Affairs",
					copyrightText : "Openspace boundaries do not constitute a legal description.",
					legendLayers : [],
					scalebarUnit : "Miles",
					titleText : printTitle
				}
			}, {
				name : "Tabloid ANSI B Landscape",
				label : "Tabloid Landscape (PDF)",
				format : "pdf",
				options : {
					authorText : "Made by: Executive Office of Energy and Environmental Affairs",
					copyrightText : "Openspace boundaries do not constitute a legal description.",
					legendLayers : [],
					scalebarUnit : "Miles",
					titleText : printTitle
				}
			}, {
				name : "Tabloid ANSI B Portrait",
				label : "Tabloid Portrait (PDF)",
				format : "pdf",
				options : {
					authorText : "Made by: Executive Office of Energy and Environmental Affairs",
					copyrightText : "Openspace boundaries do not constitute a legal description.",
					legendLayers : [],
					scalebarUnit : "Miles",
					titleText : printTitle
				}
			}
		];

		// create the print templates
		var templates = arrayUtils.map(layouts, function (lo) {
				var t = new PrintTemplate();
				t.layout = lo.name;
				t.label = lo.label;
				t.format = lo.format;
				t.layoutOptions = lo.options;
				t.preserveScale = true;
				return t;
			});
		var printMap = new esri.tasks.PrintTask(printURL);
		var params = new esri.tasks.PrintParameters();
		params.map = map;
		params.template = templates[printFormat];
		printMap.execute(params, printResult);

		function printResult(result) {
			//console.log(result.url);
			dojo.query("#PDFprogress").style("display", "none");
			window.open(result.url);

		};
	};

	function handleError(err) {
		alert("Unable to get webmap from DFW's Server: ", err);
	}

	//----------------------------------Miscellaneous Functions

	function isAlpha(obj) {
		return isNaN(parseFloat(obj))
	} //test for alpha
	function isNumber(obj) {
		return !isNaN(parseFloat(obj))
	} //test for number

	//This function gets a parameter from the URL
	function getUrlParam(key, url) { // optionally pass an URL to parse
		if (!url)
			url = window.location.href; // if no parameter url is given, use the page URL
		key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]"); // instruction needed if we want to extract an array
		var results = new RegExp("[\\?&]" + key + "=([^&#]*)").exec(url);
		if (results == null)
			return null; // if the key is not found, return null
		else // decodeURIComponent doesn't recognize '+' as encoding for space
			return decodeURIComponent(results[1].replace(/\+/g, " "));
	}	
	
	//----------------------------------------------------------------
	//-------------------------------open the PDF fact sheet for a wildland

	openPDF = function (site_name) { //global = sloppy = fix = later  QED. procrastrodinary - not a word, but it should be.
		the_site_pdf = 'pdf/' + site_name.toUpperCase() + ".PDF";
		if (!isFile(the_site_pdf)) { //check to see if the PDF exists
			noDocDialog.show();
			return;
		}
		window.open(the_site_pdf, 'resizable,scrollbars');
	}

	function isFile(str) {
		var O = AJ();
		if (!O)
			return false;
		try {
			O.open("HEAD", str, false);
			O.send(null);
			return (O.status == 200) ? true : false;
		} catch (er) {
			return false;
		}
	}

	function AJ() {
		var obj;
		if (window.XMLHttpRequest) {
			obj = new XMLHttpRequest();
		} else if (window.ActiveXObject) {
			try {
				obj = new ActiveXObject('MSXML2.XMLHTTP.3.0');
			} catch (er) {
				obj = false;
			}
		}
		return obj;
	}
	
	function isIE () {
		var myNav = navigator.userAgent.toLowerCase();
		return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
	}

});
