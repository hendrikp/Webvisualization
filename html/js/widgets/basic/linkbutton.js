/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Linkbutton Widget
 * can be used to navigate between views
 * @module linkbutton
 */
define(["exports", "jQuery", "d3", "wv/propertyHandler"], function(exports, $, d3, propertyHandler) {
	(function($, undefined) {
		$.widget("wv.linkbutton", {
			options: {
				value: "Link",
				label: "",
				showBorder: true,
				link: "#default",
				newWindow: true,
				independent: false // will supress referer and spawn a new process in chromimum based browsers
			},

			_properties: {
				"Link": [{
						uid: "uidLinkTarget",
						text: "Target",
						option: "link",
						importance: 10
					}, {
						uid: "uidLinkWindow",
						text: "New Window",
						option: "newWindow",
						importance: 11
					}, {
						uid: "uidLinkIndepedent",
						text: "Independent",
						option: "independent",
						importance: 12
					}
				]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,

			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this._htmlelem = $("<a/>").appendTo(this.element);
				this._linkbutton = this._htmlelem.button();

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
				this._linkbutton.button( "option", "label", this.options.value);
				this._htmlelem.attr("href", this.options.link);

				if(this.options.independent)
					this._htmlelem.attr("rel", "noreferrer"); // force new process e.g. for resource intensive views
				else
					this._htmlelem.removeAttr("rel");

				this._htmlelem.attr("target", this.options.newWindow ? (this.options.independent ? "_blank" : this.options.link) : "_self");
				// TODO: solve refocusing for != chrome by using WindowOpen
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

				this.refresh();
			}

		});
	})($);
});