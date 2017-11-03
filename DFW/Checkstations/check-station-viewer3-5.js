/*Written by D. Koch 11/1/2012*/
var map, layer, layerCoyote, tableidCoyote = "1pPKKABH6vB6qMJFPGYGIbwybhz74DdSx2pL9iy0", tableid = "1lfR5QYkQt1qy2ixAandCnn5unQpeCDL6EWI-bJ0";
var layerDeer, tableidDeer = "1t7ktAQaAmSYiW5t3nvW2acvc0-IAYKRcQMnLH64";
var layerSpringTurkey, tableidSpringTurkey = "1dTcukkp2yZohglqmeAyneFbMdTuMqYuhxnsh6no";
var layerFallTurkey, tableidFallTurkey = "1f06jgqNy-rYiiAYDrSQ0t3wEebBFljMVmow-hC4";
var layerBear, tableidBear = "1-gagoq6HcaXap9IbD1SqFxbYOfuxb2Zk4y7XUco";
var layerDist, tableidDist = "19oQ1w8Bm7tZI4SHpUGk92xCNnDlXAbhyD63Dx4w";
//Create global var for current map layer
var currCenter;

//api key if needed: AIzaSyA0ja-2L_VmvsFl0PHYPmt0TpIYbNEAZ_Y
function initialize() {
	//hide download as csv link - only for non-javascript users
	$('#download').hide();
	//sets up map and populates combo boxes 42.3280930282246  
	map = new google.maps.Map(document.getElementById('map_canvas'), {
		center: new google.maps.LatLng(42.0680930282246, -71.806640625),
		zoom: 8,
		scrollwheel: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
	//Create layers and add pt layer after district
	layerCoyote = new google.maps.FusionTablesLayer(tableidCoyote);
	layerDeer = new google.maps.FusionTablesLayer(tableidDeer);
	layerSpringTurkey =  new google.maps.FusionTablesLayer(tableidSpringTurkey);
	layerFallTurkey = new google.maps.FusionTablesLayer(tableidFallTurkey);
	layerBear = new google.maps.FusionTablesLayer(tableidBear);
	layerDist = new google.maps.FusionTablesLayer({
        query: {
			select: 'geometry',
            from: tableidDist
        },
        map: map,
        suppressInfoWindows: true
    });
	//should do this on initialize		
	layerDeer.setMap(map);

	//Make Default Map Turkey Map for April and May
	//layerSpringTurkey.setMap(map);
	
	//get center of map to reposition if map gets resized by switching tabs - not a problem if map tab is first
	currCenter = map.getCenter();

	//need to enable cross-domain requests for IE
	//cors = Cross-Origin Resource Sharing
	$.support.cors = true;
	//Add table
	switchTable2('DEER SEASON', 'All');
	
	//hide all info divs and then show info div for species in season
	$(".speciesInfo").hide();
	$("#deerInfo").show();
}

function changeLayer(type) {
	switch (type) {
	case 'FALL TURKEY SEASON':
		layerDeer.setMap(null);
		layerCoyote.setMap(null);
		layerSpringTurkey.setMap(null);
		layerFallTurkey.setMap(map);
		layerBear.setMap(null);
		break;
	case 'SPRING TURKEY SEASON':
		layerDeer.setMap(null);
		layerCoyote.setMap(null);
		layerSpringTurkey.setMap(map);
		layerFallTurkey.setMap(null);
		layerBear.setMap(null);
		break;
	case 'DEER SEASON':
		layerSpringTurkey.setMap(null);
		layerFallTurkey.setMap(null);
		layerDeer.setMap(map);
		layerCoyote.setMap(null);
		layerBear.setMap(null);
		break;
	case 'COYOTE SEASON':
		layerSpringTurkey.setMap(null);
		layerFallTurkey.setMap(null);
		layerDeer.setMap(null);
		layerCoyote.setMap(map);
		layerBear.setMap(null);
		break;
	case 'BEAR SEASON':
		layerDeer.setMap(null);
		layerCoyote.setMap(null);
		layerSpringTurkey.setMap(null);
		layerFallTurkey.setMap(null);
		layerBear.setMap(map);
		break;
	}
}

function changeSeason(type) {
	//$('.result').dataTable().fnDestroy();
	$(".speciesInfo").hide();
	switch (type)
		{
		case 'FALL TURKEY SEASON':
			$("#fallTurkeyInfo").show();
			break;
		case 'SPRING TURKEY SEASON':
			$("#springTurkeyInfo").show();
			break;
		case 'DEER SEASON':
			$("#deerInfo").show();
			break;
		case 'COYOTE SEASON':
			$("#coyoteInfo").show();
			break;
		case 'BEAR SEASON':
			$("#bearInfo").show();
			break;
		}
	changeLayer(type);
	//Query table based on district selected
	var district = $('#radio2 :radio:checked').attr('id');
	switchTable2(type, district);
}

function switchTable2(type, dist) {
	if(dist == 'All') {
		qClause = "https://www.googleapis.com/fusiontables/v1/query?sql=SELECT 'STATION NAME', 'ADDRESS','TOWN','PHONE','REGULAR CHECKING HOURS','FIRST WEEK SHOTGUN DEER SEASON -SPECIAL HOURS' FROM " + tableid + " WHERE '" + type + "'='YES' &key=AIzaSyA0ja-2L_VmvsFl0PHYPmt0TpIYbNEAZ_Y";
	}
	else {
	qClause = "https://www.googleapis.com/fusiontables/v1/query?sql=SELECT 'STATION NAME', 'ADDRESS','TOWN','PHONE','REGULAR CHECKING HOURS','FIRST WEEK SHOTGUN DEER SEASON -SPECIAL HOURS' FROM " + tableid + " WHERE '" + type + "'='YES' AND 'DISTRICT' = '" + dist + "' &key=AIzaSyA0ja-2L_VmvsFl0PHYPmt0TpIYbNEAZ_Y";
	}
	$.ajax({
		url: qClause,
		cache: false, 
		dataType: "jsonp",
		success: function(data){
			output = '<thead><tr><th>Station Name</th><th>Address</th><th>Town</th><th>Phone</th><th>Hours</th><th class="specialHours">First Week Shotgun Season Hours</th></thead></body>';
			for(var i = 0; i < data.rows.length; i++) { 
				output += '<tr id="colheader"><td>' + data.rows[i][0] + '</td><td>' + data.rows[i][1] + '</td><td>' + data.rows[i][2] +  '</td><td>' + data.rows[i][3] + '</td><td>' + data.rows[i][4] + '</td><td class="specialHours">' + data.rows[i][5] + '</td>';
			}
			output += '</tbody>';
			$('.result').html(output); 
			makeDataTable();

		//hide spec hours column if not deer season
		var oTable = $('.result').dataTable()
		if(type=='DEER SEASON') {
			oTable.fnSetColumnVis(5, true);
			//$('.specialHours').show();
		}
		else {
			oTable.fnSetColumnVis(5, false);
			//oTable.fnSetColumnVis(5, false);
			//$('.specialHours').hide();
		}
	}
});
}
	
function makeDataTable() {
//need to re-create data table so that text for number of records is updated
	if (typeof dTable == 'undefined') {
		dTable = $('.result').dataTable( {
			"bJQueryUI": true,
			"sPaginationType": "full_numbers"
			/*"sDom": '<"H"ifp>t<"F"l>'*/
            });
        }
    else
        {
           $('.result').dataTable({"bDestroy":true, "bJQueryUI": true, "sPaginationType": "full_numbers"});
        }

}

function resizeMap() {
	google.maps.event.trigger(map, "resize");
	map.setCenter(currCenter);
}


function selDist(dist) {
	/*query table for District Results*/
	var season = $('#radio :radio:checked').attr('id');
	if(dist=="All"){
		//switchTable2(season, 'All');
		layerDist.setOptions({
			query: {
				select: 'geometry',
				from: tableidDist
			}
		});
	}
	else
	{
		//switchTable2 (season, dist);
		layerDist.setOptions({
			query: {
				select: 'geometry',
				from: tableidDist,
				where: "DISTRICT = '"+ dist + "'"
			}
		});
	}
	switchTable2 (season, dist);
	//Add pt layer again so it can be queried
	changeLayer(season);
}
$(function() {
	initialize();
	
	//JQUERY SLIDER
	$(".btn-slide").click(function(){
		$("#panel").slideToggle("slow");
		if ($(this).text() == "Show Additional Info"){
		$(this).toggleClass("active").text("Hide Additional Info"); return false;
		$("additionalInfo").attr('aria-expanded', 'true');
		$("#btn").addClass("ui-icon ui-icon-triangle-1-n");
		}
		else
		{
		$(this).toggleClass("active").text("Show Additional Info");
		$("btn").removeClass("ui-icon-triangle-1-n");
		$("#btn").addClass("ui-icon ui-icon-triangle-1-s");
		}
	});
//radio buttons

	$("#radio").buttonset();
	$(".radio").change(function(event){
			changeSeason(this.id);
	});

	$(".radio:first").attr("checked", true).button("refresh");
	//NOT WORKING
	//$(".ui-dialog button:nth-child(3)").attr("checked", true).button("refresh");
	//	var tstID = $(".radio:nth-child(3)").id;
			//alert(tstID);
	
	$("#radio2").buttonset();
	$(".radioDist").change(function(event){
			selDist(this.id);
	});
	$(".radioDist:first").attr("checked", true).button("refresh");
	
	$("#tabs").tabs();
	//setting the first tab active is the default - However this call will allow for getting/setting of active tab
	$( "#tabs" ).tabs({ active: 0 });
	
	//If map tab is not the first tab then will need to fire resize event when switching to the map 
	/*$('#tabs').bind('tabsshow', function(event, ui) {
		if (ui.panel.id == "tabs-map") {
			resizeMap()
		}
	});*/
	
});
