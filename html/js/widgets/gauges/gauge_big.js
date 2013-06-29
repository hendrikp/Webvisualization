/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Big Gauge / Speedometer Widget
 * @module gauge_big
 */

define(["exports", "jQuery", "app", "text!widgets/gauges/gauge_big.svg!strip"], function(exports, $, app, svgdata) {
	(function($, svgdata, undefined) {
		$.widget("wv.gauge_big", {
			_svgdata: svgdata,
			options: {
				value: 0
			},

			_properties: {},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,
			
			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this.element.html(this._svgdata);
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {},

			/**
			* Refresh all displayed data
			*/
			refresh: function() {},

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
	})($, svgdata);
});