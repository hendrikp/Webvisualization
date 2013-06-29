/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Slider Widget
 * @module valueslider
 */

define(["exports", "jQuery", "d3", "wv/propertyHandler"], function(exports, $, d3, propertyHandler) {
	(function($, undefined) {
		$.widget("wv.valueslider", {
			options: {
				value: 0,
				min: 0,
				max: 100,
				label: "",
				showBorder: true,
				orientation: "horizontal"
			},

			_properties: {
				"Value": [{
						uid: "uidValueMinimum",
						text: "Minimum",
						option: "min",
						importance: 10
					}, {
						uid: "uidValueMaximum",
						text: "Maximum",
						option: "max",
						importance: 11
					}
				],
				"Placement": [{
					uid: "uidOrientation",
					text: "Orientation",
					option: "orientation",
					importance: 10
				}]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,

			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this._htmlelem = $("<div/>").appendTo(this.element);
				var self = this;

				// Slide events should trigger setpoint requests
				self._valueSlide = function( event, ui ) {
					self.options.value = ui.value;
					propertyHandler.handleSetpoint.call(self, 'uidValue');
				};

				this._htmlelem.slider({
					slide: this._valueSlide,
					stop: this._valueSlide
				});

				this.refresh();
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {},

			/**
			* Refresh all displayed data
			*/
			refresh: function() {
				this._htmlelem.slider( "option", "max", this.options.max );
				this._htmlelem.slider( "option", "min", this.options.min );
				this._htmlelem.slider( "option", "orientation", this.options.orientation );
			},

			/**
			* Resize event
			*/
			resize: function(size) {},

			/**
			* Set option/values / refresh specific data
			*/
			_setOption: function(key, value) {
				this.options[key] = value;

				if (key == "value") {
					// only refresh value
					this._htmlelem.slider("option", "value", this.options.value);
				} else {
					this.refresh();
				}
			}

		});
	})($);
});