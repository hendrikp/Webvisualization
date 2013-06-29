/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Textlabel Widget
 * @module textlabel
 */
define(["exports", "jQuery", "d3", "wv/propertyHandler"], function(exports, $, d3, propertyHandler) {
	(function($, undefined) {
		$.widget("wv.textlabel", {
			options: {
				value: "Text",
				label: "",
				showBorder: true
			},

			_properties: {},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,
			
			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this._htmlelem = $("<p/>", {
					class: "wv-value"
				}).appendTo(this.element);

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
				this._htmlelem.text(this.options.value);
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
					this._htmlelem.text(value);
				} else {
					this.refresh();
				}
			}
		});
	})($);
});