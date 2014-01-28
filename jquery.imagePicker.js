
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
	}).on( "change", handlePicker );

	$( "body" ).prepend( $inputFile );

	return $inputFile;
}

function handlePicker(event) {
	event.preventDefault();
	event.stopPropagation();

	var files = document.getElementById(idFileInput).files;
	if (!files.length) {
		return;
	}
	var file = files[0];

	_imageData = {
		name: file.name,
		size: file.size,
		type: file.type
	};
}

$.fn[pluginName] = function( callbackEvent ) {
	var $element = this;

	this.data( "callback", callbackEvent );

	$picker = $picker || createPicker();

	return this.each(function () {
		$(this).on( "click", function() {
			$picker.trigger( "click" );
		});
	});
};

})(window, jQuery, document);
