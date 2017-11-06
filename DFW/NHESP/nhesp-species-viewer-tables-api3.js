/*Written by D. Koch 2/12/2012*/
var map, layer, tableid = "1pTnqZ8vFSYJoYWJ930e6KCxO52PecZpF12jIKQ4"; 
function initialize() {
//sets up map and populates combo boxes 42.3280930282246
  
	map = new google.maps.Map(document.getElementById('map_canvas'), {
		center: new google.maps.LatLng(42.0680930282246, -71.806640625),
		zoom: 8,
		scrollwheel: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	/*layer = new google.maps.FusionTablesLayer({
		query: {
			select: 'geometry',
			from: tableid
		},
		map: map
	});*/

	// instantiating the fusion tables layer seperately and then using setoptions for tableid seems to fix initial load error where not all map tiles load
	layer = new google.maps.FusionTablesLayer();
	layer.setOptions({
		query: {
			select: 'geometry',
			from: tableid
		},
		map: map
	});
	
	// for some reason fusion tables layer is not picking up the infoWindow specs from the fusion table
	// fields to display need to be set here
	google.maps.event.addListener(layer, 'click', function (e) {
		//Change content of InfoWindow
		e.infoWindowHtml = e.row['Town'].value;	
	});
	
	//need to enable cross-domain requests for IE
	//cors = Cross-Origin Resource Sharing
	$.support.cors = true;
	popSpeciesList();
 } 

function popSpeciesList() {
//Create select options from google spreadsheet of unique Common Species Names
	var url ='https://spreadsheets.google.com/feeds/cells/0AiHJv6-StLd4dFJuZTFId0laZHQzMkpCZGdoWnBwUmc/od4/public/values?alt=json&callback=?';
	
	$.getJSON(url, function(data){
		var commonOutput, sciOutput;
		for (var i=2; i < data.feed.entry.length; i++) {
			var entry = data.feed.entry[i];
			if (entry.gs$cell.col == '1'){
				commonOutput += '<option value="' + entry.content.$t + '">' + entry.content.$t + '</option>';
			}
			if (entry.gs$cell.col == '2'){
				sciOutput += '<option value="' + entry.content.$t + '">' + entry.content.$t + '</option>';
			}
		}

		$('#selCommon').html(commonOutput);
		sortDropDownListByText('#selCommon');
		$('#selScientific').html(sciOutput);
		sortDropDownListByText('#selScientific');
	});
}

function sortDropDownListByText(selectId) {
    $(selectId).html($(selectId + " option").sort(function(a, b) {
       return a.text == b.text ? 0 : a.text < b.text ? -1 : 1;
    })); 
}
function makeDataTable (){
//need to re-create data table so that text for number of records is updated
	if (typeof dTable == 'undefined') {
		dTable = $('.result').dataTable( {
			"bJQueryUI": true,
			"sPaginationType": "full_numbers",
			"sDom": '<"H"ifp>t<"F"l>'
            });
        }
    else
        {
           $('.result').dataTable({"bDestroy":true, "bJQueryUI": true, "sPaginationType": "full_numbers"});
        }

}
function changeSpecies2(species, field) {

  //Not sure if species can be returned empty
	if(species == "") {
		layer.setOptions ({
		'query' : {
			select: 'geometry',
			from: tableid
			}
		});
		return;
	}
	//replace apostrophes
	species =  species.replace(/(['"])/g, "\\$1");

	//layer.setQuery("SELECT 'geometry' FROM " + tableid + " WHERE " + field + " = '" + species + "'");
	var strQuery = field + " = '" + species + "' ";
	layer.setOptions ({
		'query' : {
			select: 'geometry',
			from: tableid,
			where: strQuery
		},
		map: map
	});
	showSpeciesTable(species, field);
	//Clear other combo boxes
	clrComboBoxes(field);
	//To instead set to the first value
	//$('#cmbTown').parent().children('input.ui-autocomplete-input').val($('#cmbScientific option:first').text());
}
function clrComboBoxes(field) {
	//could maybe do this by seeing which combo box has focus?
	if (field == "CommonName") {
		$('#selScientific').parent().children('input.ui-autocomplete-input').val('');
		$('#selTown').parent().children('input.ui-autocomplete-input').val('');
	}
	else if (field == "ScientificName") {
		$('#selCommon').parent().children('input.ui-autocomplete-input').val('');
		$('#selTown').parent().children('input.ui-autocomplete-input').val('');
	}	
	else if (field == "Town") {
		$('#selScientific').parent().children('input.ui-autocomplete-input').val('');
		$('#selCommon').parent().children('input.ui-autocomplete-input').val('');
	}
}
function showSpeciesTable(species, field){
	qClause = "https://www.googleapis.com/fusiontables/v1/query?sql=SELECT 'Town', 'Taxonomic Group', 'ScientificName', 'CommonName', 'MESA Status', 'Most Recent Observation' FROM " + tableid + " WHERE " + field + " ='" + species+ "'&key=AIzaSyA0ja-2L_VmvsFl0PHYPmt0TpIYbNEAZ_Y";
	
	$.ajax({
		url: qClause,
		cache: false, 
		dataType: "jsonp",
		success: function(data){
			output = '<thead><tr><th>Town</th><th>Taxonomic Group</th><th>Scientific Name</th><th>Common Name</th><th>MESA Status</th><th>Most Recent Obs</th></tr></thead><tbody>'; 
		//for(var i = 0; i < data.table.rows.length; i++) { 
			for(var i = 0; i < data.rows.length; i++) { 
				output += '<tr id="colheader"><td>' + data.rows[i][0] + '</td><td>' + data.rows[i][1] + '</td><td>'+ data.rows[i][2] + '</td><td>'+ data.rows[i][3] + '</td><td>' + data.rows[i][4] + '</td><td>'+data.rows[i][5] + '</td>';
			}
	
			output += '</tbody>';

			$('.result').html(output); 
				replaceNAN();
			makeDataTable();
			}
		}); 

	}
function replaceNAN(){
	//replaces NaN for non-numerical values with the text 'historic'
	var search= 'NaN';
	$('.result td').filter(function() {
		return $(this).text() === search;
		}).html("Historic");
	}

(function( $ ) {
		$.widget( "ui.combobox", {
			_create: function() {
				var self = this,
					select = this.element.hide(),
					selected = select.children( ":selected" ),
					value = selected.val() ? selected.text() : "";
				var input = this.input = $( "<input>" )
					.insertAfter( select )
					.val( value )
					.autocomplete({
						delay: 0,
						minLength: 0,
						//source function is slightly different than from jquery UI site to increase performance
						source: function( request, response ) {
							var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
							var select_el = select.get(0); // get dom element
							var rep = new Array(); // response array
							// simple loop for the options
							for (var i = 0; i < select_el.length; i++) {
								var text = select_el.options[i].text;
								if ( select_el.options[i].value && ( !request.term || matcher.test(text) ) ){
									// add element to result array
									rep.push({
										label: text, // no more bold
										value: text,
										option: select_el.options[i]
									});
								}
							}
							// send response
							response( rep );
						},
						select: function( event, ui ) {
							ui.item.option.selected = true;
							self._trigger( "selected", event, {
								item: ui.item.option
							});
						},
						change: function( event, ui ) {
							if ( !ui.item ) {
								var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" ),
									valid = false;
								select.children( "option" ).each(function() {
									if ( $( this ).text().match( matcher ) ) {
										this.selected = valid = true;
										return false;
									}
								});
								if ( !valid ) {
									// remove invalid value, as it didn't match anything
									$( this ).val( "" );
									select.val( "" );
									input.data( "autocomplete" ).term = "";
									return false;
								}
							}
						}
					})
					.addClass( "ui-widget ui-widget-content ui-corner-left" );

				input.data( "autocomplete" )._renderItem = function( ul, item ) {
					return $( "<li></li>" )
						.data( "item.autocomplete", item )
						.append( "<a>" + item.label + "</a>" )
						.appendTo( ul );
				};

				this.button = $( "<button type='button'>&nbsp;</button>" )
					.attr( "tabIndex", -1 )
					.attr( "title", "Show All Items" )
					.insertAfter( input )
					.button({
						icons: {
							primary: "ui-icon-triangle-1-s"
						},
						text: false
					})
					.removeClass( "ui-corner-all" )
					.addClass( "ui-corner-right ui-button-icon" )
					.click(function() {
						// close if already visible
						if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
							input.autocomplete( "close" );
							return;
						}

						// work around a bug (likely same cause as #5265)
						$( this ).blur();

						// pass empty string as value to search for, displaying all results
						input.autocomplete( "search", "" );
						input.focus();
					});
			},

			destroy: function() {
				this.input.remove();
				this.button.remove();
				this.element.show();
				$.Widget.prototype.destroy.call( this );
			}
		});
	})( jQuery );

$(function() {
	initialize();
	
	$( "#selCommon" ).combobox({
		selected: function(event, ui) {
		changeSpecies2(this.value, 'CommonName');
	}
	});
	$( "#toggle" ).click(function() {
		$( ".speciesBox" ).toggle();
	});
	$('#commonDiv > input').attr('id', 'cmbCommon');	//Add id to new element so that labels correspond to controls
	
		
	$("#selScientific").combobox({
		selected: function(event, ui) {
		changeSpecies2(this.value, 'ScientificName');
	}
	});
	$( "#toggle" ).click(function() {
		$( "#selScientific" ).toggle();
	});
	$('#scientificDiv > input').attr('id', 'cmbScientific');	

	$( "#selTown" ).combobox({
		selected: function(event, ui) {
		changeSpecies2(this.value, 'Town');
	}
	});
	$( "#toggle" ).click(function() {
		$( "#selTown" ).toggle();
	});
	$('#townDiv > input').attr('id', 'cmbTown');
	
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
});