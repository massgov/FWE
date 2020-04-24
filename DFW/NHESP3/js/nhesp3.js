      require([
        "esri/Map",
        "esri/Basemap",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/widgets/BasemapToggle",
        "esri/widgets/Expand",
        "esri/widgets/Home",
        "esri/tasks/support/Query",
        "esri/tasks/QueryTask",
        'dojo/_base/declare',
        'dgrid/Keyboard', 
        'dgrid/Selection',
        "dgrid/Grid",
        "dgrid/OnDemandGrid",
        "dojo/parser",
        "dijit/form/FilteringSelect",
        "dojo/store/Memory",
        "dojo/json",
        "dojo/text!./js/common.json",
        "dojo/text!./js/scientific.json",
        "dojo/text!./js/towns2.json",
        "dojo/domReady!"
      ], function(Map, Basemap, MapView, FeatureLayer, BasemapToggle, Expand, Home, Query, QueryTask, declare, Keyboard, Selection, Grid, OnDemandGrid, parser, FilteringSelect, Memory, json, common, scientific, towns2) {
		var MESATOWN_URL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Public_Town_MESA_Spp_List/FeatureServer/0"; 
		//MESA Towns layer
        var MESATABLE_URL = "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Public_Town_MESA_Spp_List/FeatureServer/1"; //Table layer
		
		parser.parse(); //scan DOM, instantiate nodes with dojo attributes
		
		const labelClass = {
		  // autocasts as new LabelClass()
		  symbol: {
			type: "text",  // autocasts as new TextSymbol()
			color: "black",
			haloColor: "white",
			font: {  // autocast as new Font()
			  family: "Playfair Display",
			  size: 12,
			  weight: "bold"
			}
		  },
		  labelPlacement: "above-center",
		  labelExpressionInfo: {
			expression: "$feature.TOWN",
		  },
		  minScale:500001
		};
		
/*		  var popupTown = {
			"title": "{TOWN}",
			"content": "<b>City:</b> {TOWN}"
		  } */
		  
        const MESAtowns = new FeatureLayer({
		  url: MESATOWN_URL,
		  title: "Massachusetts Towns",
          outFields: ["TOWN"],
		  labelingInfo: [labelClass]//,
		  //popupTemplate: popupTown
        });
 
        const map = new Map({
          layers: [MESAtowns],
		  basemap: "topo"
        });

        const view = new MapView({
          container: "viewDiv",
          map: map,
		  center: [-71.7, 42],
		  zoom: 8,
		  ui: {
            components: ["attribution"]
          },
          popup: {
            autoOpenEnabled: false
          },
            constraints: {
            rotationEnabled: false
          },
		  highlightOptions: {
            color: [0, 0, 255, 1],
			fillOpacity: 0,
			fillOpacity: 0.1
          }
        });
		 
		var toggle = new BasemapToggle({
		view: view,  // The view that provides access to the map's "streets" basemap
		nextBasemap: "hybrid"  // Allows for toggling to the "hybrid" basemap
		});
		
		view.when(disableZooming);
        /**
         * Disables all zoom gestures on the given view instance.
         * @param {esri/views/MapView} view - The MapView instance on which to
		 * disable zooming gestures.
         */
        function disableZooming(view) {
          view.popup.dockEnabled = true;

          // Removes the zoom action on the popup
          view.popup.actions = [];

          // stops propagation of default behavior when an event fires
         function stopEvtPropagation(event) {
            event.stopPropagation();
         }

          // disable the view's zoom box to prevent the Shift + drag
          // and Shift + Control + drag zoom gestures.
          view.on("drag", ["Shift"], stopEvtPropagation);
          view.on("drag", ["Shift", "Control"], stopEvtPropagation);

          // prevents zooming with the + and - keys
          view.on("key-down", function(event) {
            var prohibitedKeys = ["+", "-", "Shift", "_", "="];
            var keyPressed = event.key;
            if (prohibitedKeys.indexOf(keyPressed) !== -1) {
              event.stopPropagation();
            }
          });

          return view;
        }

        // Add widgets to the view
        view.ui.add(document.getElementById("gridDiv"), "bottom-left");
        view.ui.add(document.getElementById("instructDiv"), "top-left");
        // Initialize variables
        let highlight, grid, grid1;

        // call clearGrid method when clear is clicked
        const clearbutton = document.getElementById("clearButton");
        clearbutton.addEventListener("click", clearGrid);
		
		// call clearGrid method when clear is clicked
        const hideshowbutton = document.getElementById("hideShowButton");
        hideshowbutton.addEventListener("click", hideShow);

/*         view.on("click", function(event) {
			prepareForGrid() 
            queryFeatures(event);
        }); */
	
	    const storebutton = document.getElementById("storeButton");
        storebutton.addEventListener("click", changeStore);
	
        MESAtowns.load().then(function() {
          return createGrid().then(function(g) {
            grid = g;
          });
        });	
		
		function prepareForGrid(){ //hide the things that need hiding before displaying the grid
		//			document.getElementById("gridDiv").style.display = "inline"; //show the gridDiv
		//			document.getElementById("queryResults").style.display = "inline";
					document.getElementById("loading").style.display = "inline";
					document.getElementById("hideShowButton").style.display = "inline";
		//			document.getElementById("hideShowButton").innerHTML = "Hide Table";
		            document.getElementById("instructDiv").style.display = "none";
		}
		
			var spHolder = "";
	//###############################################################################################TOWNS COMBOBOX
	// create store instance referencing data from towns.json
	var TownStore = new Memory({idProperty : "name",data : json.parse(towns2)});
	// create FilteringSelect widget, populating its options from the store
	var townSelect = new FilteringSelect({
			name : "townSelect",
			placeHolder : "Select a City/Town",
			style : "width:200px;left:8px;top:2.0em;position:absolute;z-Index:999;",
			required : false,
			maxHeight : 312,
			store : TownStore,
			onChange : function (val) {
				if (val != "") { //Stops the onChange from a reset from firing this again
					document.getElementById("gridDiv").style.display = "inline";
					queryFeatures(val)
				}
			}

		}, "TownSelect");
	townSelect.startup();	
		
	//###############################################################################################SPECIES COMBOBOX

	var MESAStore = new Memory({idProperty : "name1", data : json.parse(scientific)});
	// create FilteringSelect widget, populating its options from the store
	var MESASelect = new FilteringSelect({
			class : "mySelect",
			name : "MESASelect",
			placeHolder : "Select a Species",
			style : "background-color:white;min-width:400px;width:auto;left:8px;top:0.3em;position:absolute;z-Index:999;",
			required : false,
			maxHeight : 312,
			store : MESAStore,
			onChange : function (val) {
				if (val != "") { //Stops the onChange from a reset from firing this again
				    spHolder = dijit.byId('MESASelect').attr('value');
					fullSpeices = dijit.byId('MESASelect').attr('displayedValue');
					makeSpeciesQuery(val);
					prepareForGrid();
					MESASelect.set('value', "");
				}

			}
		}, "MESASelect");
	MESASelect.startup();
	
	//change store for MESA dropdown scientific/common names
		function changeStore(){
	var buttonChoice = document.getElementById("storeButton").innerHTML;
		if (buttonChoice == "<b>Switch to Common Name</b>"){
		 document.getElementById("storeButton").innerHTML = "<b>Switch to Scientific Name</b>"
		 var changeStore = new Memory({idProperty : "name1", data : json.parse(common)});
		 }
		 else
		 {
		 document.getElementById("storeButton").innerHTML = "<b>Switch to Common Name</b>"
		 var changeStore = new Memory({idProperty : "name1", data : json.parse(scientific)});
		 }
		 MESASelect.set('store', changeStore)
        }

		var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		//phone?
		  if (isMobile) {
			view.scale = 3124000;
			document.getElementById("instructDiv").style.fontSize = "smaller";
			document.getElementById("gridTitle").style.fontSize = "medium";
 			document.getElementById("tablegif").style.display = "none";
		    document.getElementById("infoSpotOne").style.fontSize = "smaller";
		    document.getElementById("infoSpotTwo").style.fontSize = "smaller";
		    document.getElementById("infoSpotThree").style.fontSize = "smaller";
			labelClass.minScale = 2500000;
			MESAtowns.labelingInfo = [labelClass];
			document.getElementById("widget_MESASelect").style.minWidth = "288px";
			view.center = [-71.7, 41];
			};
			
			function shrinkTable(){ // doing this seperate grids don't exist on startup - call this after render
			 x = document.getElementsByClassName("dgrid")
			  x[0].style.fontSize = "x-small";
			  grid.resize();
			}


	function hideShow(){  //hide or show the table
	var buttonChoice = document.getElementById("hideShowButton").innerHTML;
		if (buttonChoice == "Hide Table"){
		 document.getElementById("hideShowButton").innerHTML = "Show Table"
         document.getElementById("queryResults").style.display = "none";
		 }
		 else
		 {
		 document.getElementById("hideShowButton").innerHTML = "Hide Table"
         document.getElementById("queryResults").style.display = "inline";
		 if (grid1) {
                  grid1.resize();
                }                
			if (grid) {
                  grid.resize();
                }
		 }
        }
		
// this is the query for species from MESA_Select, sets the townStore for townSelect, sets the definition query.
	function makeSpeciesQuery(val){
	
		        var QueryMESATask = new QueryTask({
					url: "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Public_Town_MESA_Spp_List/FeatureServer/1"
					});
		var params = new Query({
          returnGeometry: false,
          outFields: ["TOWN","Most_Recent_Observation","Taxonomic_Group", "MESA_Status", "OBJECTID"]
        });
        params.where ="CommonName = '"+val+"'";
			QueryMESATask            
			.execute(params)
			.then(showResults)
		   
            function showResults(response) {
                var firstResult = []; //all the towns for the definition query
				var secondResult= []; //this is an bunch of objects that hold town and observed date
				var thirdResult= []; //this is objectStore for the towns that are selected to show in the towns dropdown
				
                var resultCount = response.features.length;
                for (var i = 0; i < resultCount; i++) {
                    var featureAttributes = response.features[i].attributes;
					firstResult.push("'"+featureAttributes.Town+"'");			
					secondResult.push({town:featureAttributes.Town.toProperCase(), observed: featureAttributes.Most_Recent_Observation});
					thirdResult.push({id:featureAttributes.OBJECTID, name: featureAttributes.Town.toProperCase()});	
                }
				document.getElementById("infoSpotOne").innerHTML = "<b>Taxonomic Group:</b> " + featureAttributes.Taxonomic_Group;
				document.getElementById("infoSpotThree").innerHTML = "<br /><b>MESA Status:</b> " + MESA_Formatter(featureAttributes.MESA_Status);
				
				 var NewTownStore = new Memory({idProperty : "name", data : thirdResult});
				 townSelect.set('store', NewTownStore)
				
		        MESAtowns.definitionExpression = "TOWN IN (" +firstResult.toString()+ ")";  //first result definition expression for the map
				townsWithASpecies(secondResult); //second result to make the SpeciesInATown grid
	            } 
		}
		
	
    function townsWithASpecies(theTowns){  //query all towns with a specific speices - From MESASelect
                const gridDiv = document.createElement("div");
                const results = document.getElementById("queryResults");
				if (highlight) {
			      highlight.remove();
			    }
                results.appendChild(gridDiv)
				clearbutton.style.display = "inline"; //add the button back with the grid
				destroyGrids()//clear the Grids
				
                //deal with the reporting for the other query, clear the species/town info if it is there.
				document.getElementById("gridTitle").innerHTML = fullSpeices.replace("''","'").replace("''","'");
		        document.getElementById("infoSpotTwo").innerHTML = ""; //hides most recent observation text

				// Create a new constructor by mixing in the components
			    var CustomGrid = declare([ Grid, Keyboard, Selection ])
				grid1 = new CustomGrid({
					columns: [
						{ field: 'town', label: 'City/Town' },
						{ field: 'observed', label: 'Most Recent Observation', formatter: historicFormatter}
					],
				selectionMode: 'single', // for Selection; only select a single row at a time
				cellNavigation: false // for Keyboard; allow only row-level keyboard navigation
				}, gridDiv);
				grid1.renderArray(theTowns);

			grid1.on('dgrid-select', function (event) {
				// Report the item from the selected row to the console.
				console.log('Row selected: ', event.rows[0].data.town);
				clickTownGridHighlight(event.rows[0].data.town);
			});

			  document.getElementById("loading").style.display = "none";
              document.getElementById("gridDiv").style.display = "inline"; //show the gridDiv
			  townSelect.set('value', "");
}

	function destroyGrids(){
	         if (grid1) {
                  grid1.destroy();
                }                
			if (grid) {
                  grid.destroy();
                }
			}

// highlight features based on a query result from the grid selection
		function clickTownGridHighlight(nameOfTown){
			view.whenLayerView(MESAtowns).then(function(layerView){
			 var query = MESAtowns.createQuery();
			 query.where = "TOWN = '" + nameOfTown + "'";
			 MESAtowns.queryFeatures(query).then(function(result){
			   if (highlight) {
				highlight.remove();
			   }
			   highlight = layerView.highlight(result.features);
			 })
			});
			}

//if a species is selected in the dropdown we use that to get values for a specific town/and species
function queryFeatures(theTownName) {  //query for all species in a particular town  //towns dropdown
		  
		MESAtowns
			.queryObjectIds({
              //geometry: point,
			  where: "TOWN = '" + theTownName + "'",
              returnGeometry: false,
              outFields: ["*"]
            })
			
			
           .then(function(objectIds) {
              if (!objectIds.length) {  //clicked but not on a parcel
			  document.getElementById("loading").style.display = "none";
                return;
              }

              // Highlight the area returned from the first query
              view.whenLayerView(MESAtowns).then(function(layerView) {
                if (highlight) {
                  highlight.remove();
                }
                highlight = layerView.highlight(objectIds);
				document.getElementById("loading").style.display = "none";
				document.getElementById("instructDiv").style.display = "none";
              });

              // Query the for the related features for the features ids found
              return MESAtowns.queryRelatedFeatures({
                outFields: ["Town", "CommonName", "ScientificName", "MESA_Status", "Taxonomic_Group" ,"Most_Recent_Observation"],
                relationshipId: MESAtowns.relationships[0].id,
                objectIds: objectIds
              });
            })
			
            .then(function(relatedFeatureSetByObjectId) {
              if (!relatedFeatureSetByObjectId) {
                return;
              }
			  
              // Create a grid with the data
              Object.keys(relatedFeatureSetByObjectId).forEach(function(
                objectId
              ) {
				clearInfo();  //clear townSpecies info and reload if it exists
                // get the attributes of the FeatureSet
                const relatedFeatureSet = relatedFeatureSetByObjectId[objectId];
                const rows = relatedFeatureSet.features.map(function(feature) {
                 //have to deal with the double comma.  It breaks queries but doesn't play nice with this comparison (the double replace is for one value namely - Bayard's Green Adder's-mouth)
				 //IF this town has the selected species in it then fill out these infoSpots
                 if (feature.attributes.CommonName == spHolder.replace("''","'").replace("''","'")){
				  document.getElementById("gridTitle").innerHTML = feature.attributes.Town;
				  
			      document.getElementById("infoSpotOne").innerHTML = "<b>Current Selection:</b> " + feature.attributes.CommonName + " - " + feature.attributes.ScientificName + "<br /><b>Taxonomic Group:</b> " + feature.attributes.Taxonomic_Group +" "+ "<br /><b>MESA Status:</b> " + MESA_Formatter(feature.attributes.MESA_Status);
				  
				  document.getElementById("infoSpotTwo").innerHTML = "<br /><b>Most Recent Observation:</b> " + feature.attributes.Most_Recent_Observation;
				  //document.getElementById("infoSpotThree").innerHTML = feature.attributes.Most_Recent_Observation;

			      }
					else
					  {
						document.getElementById("gridTitle").innerHTML = feature.attributes.Town;
					  };
				  return feature.attributes;
                });

                if (!rows.length) {
                  return;
                }

                // create a new div for the grid of related features
                // append to queryResults div inside of the gridDiv
                const gridDiv = document.createElement("div");
                const results = document.getElementById("queryResults");
                results.appendChild(gridDiv);

                // destroy current grid if exists
				destroyGrids()//clear the Grids
                // create new grid to hold the results of the query
                grid = new Grid(
                  {
					  columns: [  //ID so we can call them in the dom, formatter is cool!
						{ id: "Town", field: "Town", label: "Town" },
						{ id: "CommonName", field: "CommonName", label: "Common Name" },
						{ id: "ScientificName", field: "ScientificName", label: "Scientific Name" },
						{ id: "Taxonomic_Group", field: "Taxonomic_Group", label: "Taxonomic Group" },
						{ id: "MESA_Status", field: "MESA_Status", label: "MESA Status", formatter: MESA_Formatter},
						{ id: "Most_Recent_Observation", field: "Most_Recent_Observation", label: "Most Recent Obs.", formatter: historicFormatter}
					]
                  },
                  gridDiv
                );

                //add the data to the grid
                grid.renderArray(rows);
				if (isMobile) {shrinkTable()};
				//set def query - single town
				grid.set('sort', 'CommonName');
              });
              clearbutton.style.display = "inline";
              hideshowbutton.style.display = "inline";
			  document.getElementById("loading").style.display = "none";
              //document.getElementById("gridDiv").
			  gridDiv.style.display = "inline"; //show the gridDiv
			  grid.resize();  //hack to fix the rows infrequently appearing behind the column headers
            })
            .catch(function(error) {
              console.error(error);
            });
        }
		
		function clearInfo(){		   
		   document.getElementById("gridTitle").innerHTML = "";
		   document.getElementById("infoSpotOne").innerHTML = "";
		   document.getElementById("infoSpotTwo").innerHTML = "";
		   document.getElementById("infoSpotThree").innerHTML = "";
		   }

        function clearGrid() {  //Clear out everything
		   MESASelect.set('value', "");  //clear the combobox
		   townSelect.set('store', TownStore)  //set combobox back to full list
		   townSelect.set('value', "");  //clear the combobox
		   MESAtowns.definitionExpression = "" //remove the definition expression
		   document.getElementById("instructDiv").style.display = "inline";
		   document.getElementById("gridDiv").style.display = "none";
           clearInfo();
          if (highlight) {
			  highlight.remove();
			  }
		  destroyGrids()//clear the Grids
          clearbutton.style.display = "none";
		  hideshowbutton.style.display = "none";
        }
		
 		view.ui.add(toggle, "bottom-right");
		
		 var homeBtn = new Home({
		   id: "myHome",
           view: view
         }); 

        //Add the home button to the top left corner of the view
         view.ui.add(homeBtn, "top-right");
		
//---utility functions
		 function historicFormatter(item){
                var newItem;
                if ( item == null )
                    newItem = 'Historic'
				else 
			        newItem = item;
         return newItem;
        }
		
		function MESA_Formatter(item){
                //console.log(item,typeof(item));
                var newItem;
                if ( item == 'E' ) 
                    newItem = 'Endangered'
                else if ( item == 'SC' )
                    newItem = 'Special Concern'
                 else if ( item == 'T' )
                    newItem = 'Threatened'
			else 
			newItem = item;
         return newItem;
        }
	
		 function isBlank(str) {
			return (!str || /^\s*$/.test(str));
		}
		
		String.prototype.toProperCase = function () {
			return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		};
				
      });
