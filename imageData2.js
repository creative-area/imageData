/*
* imageData()
*
* Depends on
* https://github.com/mattiasw/ExifReader
*/

/*
* - links
* http://www.html5rocks.com/en/tutorials/canvas/hidpi/ (retina)
* https://github.com/stomita/ios-imagefile-megapixel (bug ios7 iphone5)
* https://developer.mozilla.org/en-US/docs/Web/API/File
* https://github.com/gokercebeci/canvasResize
* https://github.com/jseidelin/exif-js
* https://github.com/mattiasw/ExifReader
*/

;(function(window, $, document, undefined) {
	var pluginName = "imageData";

	var idFileInput = "file_input_image_data_url";

	var _settings = {
		returnImage: false, // true return an image objet in data
		resize: false, // resize array
		complete: $.noop,
		exif: function( data ) {
			try {
				// exif data
				// https://github.com/mattiasw/ExifReader
				var exif = new ExifReader();
				exif.load( data );
				return exif.getAllTags();
			} catch (error) {
				return {};
			}
		}
	};

	// cache image data
	var _imageData = {};

	// picker (input file)
	var picker = false;


	/**
	* Detect subsampling in loaded image.
	* In iOS, larger images than 2M pixels may be subsampled in rendering.
	*/
	function detectSubsampling(img) {
		var iw = img.naturalWidth, ih = img.naturalHeight;
		if (iw * ih > 1024 * 1024) { // subsampling may happen over megapixel image
			var canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, -iw + 1, 0);
			// subsampled image becomes half smaller in rendering size.
			// check alpha channel value to confirm image is covering edge pixel or not.
			// if alpha value is 0 image is not covering, hence subsampled.
			return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
		} else {
			return false;
		}
	}

	/**
	* Detecting vertical squash in loaded image.
	* Fixes a bug which squash image vertically while drawing into canvas for some images.
	*/
	function detectVerticalSquash(img, iw, ih) {
		var canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = ih;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		var data = ctx.getImageData(0, 0, 1, ih).data;
		// search image edge pixel position in case it is squashed vertically.
		var sy = 0;
		var ey = ih;
		var py = ih;
		while (py > sy) {
			var alpha = data[(py - 1) * 4 + 3];
			if (alpha === 0) {
				ey = py;
			} else {
				sy = py;
			}
			py = (ey + sy) >> 1;
		}
		var ratio = (py / ih);
		return (ratio===0)?1:ratio;
	}

	/**
	* Transform canvas coordination according to specified frame size and orientation
	* Orientation value is from EXIF tag
	*/
	function transformOrientation(canvas, width, height, orientation) {
		switch (orientation) {
			case 5:
			case 6:
			case 7:
			case 8:
				canvas.width = height;
				canvas.height = width;
			break;
			default:
				canvas.width = width;
				canvas.height = height;
		}
		var ctx = canvas.getContext('2d');
		switch (orientation) {
			case 2:
				// horizontal flip
				ctx.translate(width, 0);
				ctx.scale(-1, 1);
			break;
			case 3:
				// 180 rotate left
				ctx.translate(width, height);
				ctx.rotate(Math.PI);
			break;
			case 4:
				// vertical flip
				ctx.translate(0, height);
				ctx.scale(1, -1);
			break;
			case 5:
				// vertical flip + 90 rotate right
				ctx.rotate(0.5 * Math.PI);
				ctx.scale(1, -1);
			break;
			case 6:
				// 90 rotate right
				ctx.rotate(0.5 * Math.PI);
				ctx.translate(0, -height);
			break;
			case 7:
				// horizontal flip + 90 rotate right
				ctx.rotate(0.5 * Math.PI);
				ctx.translate(width, -height);
				ctx.scale(-1, 1);
			break;
			case 8:
				// 90 rotate left
				ctx.rotate(-0.5 * Math.PI);
				ctx.translate(-width, 0);
			break;
			default:
			break;
		}
	}


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
			file: {
				name: file.name,
				size: file.size,
				type: file.type
			}
		};

		// loading
		methods.load( file );
		
		// loading methods
		// var _async = [];
		// for ( var m in loadMethod ) {
		// 	_async.push( methods.load( file, m ) );
		// }
		// $.when.apply( this, _async ).done(
		// 	function() {
		// 		methods.draw( _imageData.url ).done(function( data ) {
		// 			_imageData.fixed = data.url;
		// 			if ( _settings.resize ) {
		// 				// resize image
		// 				var _asyncTransform = [];
		// 				$.each(_settings.resize, function(index, val) {
		// 					val.orientation = ( _imageData.exif && _imageData.exif.Orientation && _imageData.exif.Orientation.value ) ? _imageData.exif.Orientation.value : 1;
		// 					_asyncTransform.push( methods.resize( _imageData.fixed, val ) );
		// 				});
		// 				// $.each(_settings.draw, function(index, val) {
		// 				// 	val.orientation = ( _imageData.exif && _imageData.exif.Orientation && _imageData.exif.Orientation.value ) ? _imageData.exif.Orientation.value : 1;
		// 				// 	_asyncTransform.push( methods.draw( _imageData.url, val ) );
		// 				// });
		// 				$.when.apply( this, _asyncTransform ).done(
		// 					function() {
		// 						// render image data with resized images
		// 						_imageData.resize = arguments;
		// 						_settings.complete( _imageData );
		// 					}
		// 				);
		// 			} else {
		// 				// render image data
		// 				_settings.complete( _imageData );
		// 			}

		// 		});
		// 	}
		// );
	}

	var methods = {
		type: function( dataURL ) {
			var t = dataURL.split(";");
			var t2 = t[0].split(":");
			return t2[1];
		},
		crop: function( dataURL, options, callback ) {
			var defaults = {
				type: false,
				square: 100 // false
				// force: false
			}
			var settings = $.extend( {}, defaults, options ) ;
			settings.type = settings.type || _imageData.type || methods.type( dataURL );

			var image = new Image();
			image.src = dataURL;

			return $.Deferred(function( defer ) {
				image.onload = function() {
					// Calculate new image size
					var imageWidth = image.width;
					var imageHeight = image.height;

					var sx, sy, sLargeur, sHauteur;

					if ( imageWidth > imageHeight ) {
						// landscape
						sx = ( imageWidth - imageHeight ) / 2;
						sy = 0;
						sLargeur = imageHeight;
						sHauteur = imageHeight;
					} else {
						// portrait
						sx = 0;
						sy = ( imageHeight - imageWidth ) / 2;
						sLargeur = imageWidth;
						sHauteur = imageWidth;
					}
					sx = Math.round( sx );
					sy = Math.round( sy );
					sLargeur = Math.round( sLargeur );
					sHauteur = Math.round( sHauteur );

					// Define canvas, context and image
					var canvas = document.createElement("canvas");

					canvas.width = settings.square;
					canvas.height = settings.square;

					var context = canvas.getContext("2d");
					context.drawImage(this, sx, sy, sLargeur, sHauteur, 0, 0, settings.square, settings.square)

					// Convert the resize image to a new file
					var newURL = canvas.toDataURL(settings.type);

					var data = {
						url: newURL, 
						width: settings.square,
						height: settings.square
					}

					defer.resolve( data );
					if ( callback ) callback( data );
				};
				image.onerror = function(error) {
					defer.reject( error );
				};
			}).promise();
		},
		resize: function( dataURL, options, callback ) {
			var defaults = {
				type: false,
				width: false,
				height: false
				// force: false
			}
			var settings = $.extend( {}, defaults, options ) ;
			settings.type = settings.type || _imageData.file.type || methods.type( dataURL );

			//return $.Deferred(function( defer ) {
				var image = new Image();
				image.src = dataURL;

				image.onload = function() {
					// Calculate new image size
					var imageWidth = image.width;
					var imageHeight = image.height;

					if ( settings.width != false && settings.height === false ) {
						// set width and calculate height in proportion
						imageWidth = settings.width;
						imageHeight = image.height * settings.width / image.width;
					} else if ( settings.width === false && settings.height != false ) {
						// set height and calculate width in proportion
						imageWidth = image.width * settings.height / image.height;
						imageHeight = settings.height;
					} else if ( settings.width != false && settings.height != false ) {
						// constrained resizing
						var maxWidth = settings.width;
						var maxHeight = settings.height;

						if (imageWidth > imageHeight) {
							if (imageWidth > maxWidth) {
								imageHeight *= maxWidth / imageWidth;
								imageWidth = maxWidth;
							}
						} else {
							if (imageHeight > maxHeight) {
								imageWidth *= maxHeight / imageHeight;
								imageHeight = maxHeight;
							}
						}
					}
					imageWidth = Math.round(imageWidth);
					imageHeight = Math.round(imageHeight);

					// Define canvas, context and image
					var canvas = document.createElement("canvas");

					canvas.width = imageWidth;
					canvas.height = imageHeight;
					image.width = imageWidth;
					image.height = imageHeight;

					var context = canvas.getContext("2d");
					context.drawImage(this, 0, 0, imageWidth, imageHeight);

					// Convert the resize image to a new file
					var newURL = canvas.toDataURL(settings.type);

					var data = {
						url: newURL, 
						width: imageWidth,
						height: imageHeight
					}

					//defer.resolve( data );
					if ( callback ) callback( data );
				}
			//}).promise();
		},
		canvasURL: function( callback ) {
			return $.Deferred(function( defer ) {
				// size data (width, height)
				var image = new Image();
				image.src = _imageData.url;
				if ( _settings.returnImage ) {
					_imageData.image = image;
				}
				image.onload = function() {
					_imageData.width = image.width,
					_imageData.height = image.height;

					// constrained resizing
					var maxWidth = 2048;//1024;
					var maxHeight = 2048;//1024;

					if (_imageData.width > _imageData.height) {
						if (_imageData.width > maxWidth) {
							_imageData.height *= maxWidth / _imageData.width;
							_imageData.width = maxWidth;
						}
					} else {
						if (_imageData.height > maxHeight) {
							_imageData.width *= maxHeight / _imageData.height;
							_imageData.height = maxHeight;
						}
					}
					_imageData.width = Math.round(_imageData.width);
					_imageData.height = Math.round(_imageData.height);

					// Define canvas, context and image
					var canvas = document.createElement("canvas");
					var context = canvas.getContext("2d");

					canvas.width = _imageData.width;
					canvas.height = _imageData.height;
					image.width = _imageData.width;
					image.height = _imageData.height;

					// Image natural size
					var iw = image.naturalWidth, ih = image.naturalHeight;

					// Get pixel ratio
					var devicePixelRatio = window.devicePixelRatio || 1;
					var backingStoreRatio = context.webkitBackingStorePixelRatio ||
											context.mozBackingStorePixelRatio ||
											context.msBackingStorePixelRatio ||
											context.oBackingStorePixelRatio ||
											context.backingStorePixelRatio || 1;

					var ratio = devicePixelRatio / backingStoreRatio;

					_imageData.ratio = ratio;
					
					// Subsampled fix for iphone 5 = retina ?
					var subsampled = detectSubsampling(image);
					if (subsampled) {
						iw /= ratio;
						ih /= ratio;
					}

					context.save();

					// Orientation correction (orientation lost when image set in canvas)
					transformOrientation( canvas, _imageData.width, _imageData.height, _imageData.orientation );

					var d = 1024; // size of tiling canvas
					var tmpCanvas = document.createElement('canvas');
					tmpCanvas.width = tmpCanvas.height = d;
					var tmpCtx = tmpCanvas.getContext('2d');
					var vertSquashRatio = detectVerticalSquash(image, iw, ih);
					var dw = Math.ceil(d * _imageData.width / iw);
					var dh = Math.ceil(d * _imageData.height / ih / vertSquashRatio);
					var sy = 0;
					var dy = 0;
					while (sy < ih) {
						var sx = 0;
						var dx = 0;
						while (sx < iw) {
							tmpCtx.clearRect(0, 0, d, d);
							tmpCtx.drawImage(image, -sx, -sy);
							context.drawImage(tmpCanvas, 0, 0, d, d, dx, dy, dw, dh);
							sx += d;
							dx += dw;
						}
						sy += d;
						dy += dh;
					}
					context.restore();
					tmpCanvas = tmpCtx = null;

					// Convert the resize image to a new file
					// _imageData.canvas = canvas.toDataURL( _imageData.file.type );
					_imageData.url = canvas.toDataURL( _imageData.file.type );
					
					defer.resolve( _imageData );
					if ( callback ) callback( _imageData );
				}
				image.onerror = function( error ) {
					defer.reject( error );
				};
			}).promise();
		},
		load: function( file ) {
			var readerExif = new FileReader();

			// use readAsArrayBuffer for exif data
			readerExif.onloadend = function( evt ) {
				// if we use onloadend, we need to check the readyState.
				if ( evt.target.readyState == FileReader.DONE ) { // DONE == 2
					
					// save buffer data
					_imageData.buffer = evt.target.result;

					// exif data (orientation)
					_imageData.exif = _settings.exif( _imageData.buffer );

					if ( _imageData.exif && _imageData.exif.Orientation && _imageData.exif.Orientation.value ) {
						_imageData.orientation = _imageData.exif.Orientation.value;
					} else {
						_imageData.orientation = 1;
					}

					// use readAsDataURL to trasform in canvas
					var readerURL = new FileReader();

					readerURL.onloadend = function( evt ) {
						// if we use onloadend, we need to check the readyState.
						if ( evt.target.readyState == FileReader.DONE ) { // DONE == 2
							
							// save buffer data
							_imageData.url = evt.target.result;

							// put image in a canvas
							methods.canvasURL( function() {

								methods.resize( _imageData.url, { width: 200, height: 200 }, function( data ) {
									_imageData.resize = [ data ];

									methods.crop( _imageData.url, { square: 200 }, function( data ) {
										_imageData.resize.push( data );
										_settings.complete( _imageData );
									});
								});
							});
						}
					};
					readerURL.onabort = function(error) {
						defer.reject( error );
					};
					readerURL.onerror = function(error) {
						defer.reject( error );
					};
					readerURL.readAsDataURL( file );
				}
			};
			readerExif.onabort = function(error) {
				defer.reject( error );
			};
			readerExif.onerror = function(error) {
				defer.reject( error );
			};
			readerExif.readAsArrayBuffer( file );

			// return $.Deferred(function( defer ) {
			// 	defer.resolve( data );
			// 	defer.reject( error );
			// }).promise();
		}
	}

	$.fn[pluginName] = function(options) {
		var args = arguments;

		if (options === undefined || typeof options === "object") {
			$.extend( _settings, options || {} ) ;

			picker = picker || createPicker();

			return this.each(function () {
				$(this).on( "click", function() {
					picker.trigger( "click" );
				});
			});
		} else if (typeof options === "string" && methods[options] != undefined) {
			return methods[options].apply( this, Array.prototype.slice.call( args, 1 ) );
		}
	};
})(window, jQuery, document);
