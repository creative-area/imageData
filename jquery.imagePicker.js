
;(function(window, $, document, undefined) {

var pluginName = "imagePicker";

var idFileInput = "file_input_image_picker";

var _settings = {
	id: idFileInput
};

// picker (input file)
var $picker = false;

// HTML file picker
function createPicker() {
	var $inputFile = $("<input>", {
		"type": "file",
		"name": idFileInput,
		"id": idFileInput,
		"style": "display:none;"
	})
	.on( "click", handleClick )
	.on( "change", handlePicker );

	$( "body" ).prepend( $inputFile );

	return $inputFile;
}

function handleClick( event, callback ) {
	$picker.data( "callback", callback );
}

function handlePicker( event ) {
	event.preventDefault();
	event.stopPropagation();

	var files = document.getElementById(idFileInput).files;
	if (!files.length) {
		return;
	}
	var file = files[0];

	var cb = $picker.data( "callback" );
	cb( file );
}

$.fn[pluginName] = function( callback ) {
	$picker = $picker || createPicker();

	return this.each(function () {
		$(this).on( "click", function() {
			$picker.trigger( "click", callback );
		});
	});
};

})(window, jQuery, document);
