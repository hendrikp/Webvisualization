/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Checkbutton Widget 
 * @module checkbutton
 */

define(["exports", "jQuery", "d3", "wv/propertyHandler"], function(exports, $, d3, propertyHandler) {
	(function($, undefined) {
		$.widget("wv.checkbutton", {
			options: {
				value: 0,
				label: "",
				showBorder: true,
				textOn: "On",
				textOff: "Off"
			},

			_properties: {
				"Value": [{
						uid: "uidValueOnText",
						text: "On Text",
						option: "textOn",
						importance: 10
					}, {
						uid: "uidValueOffText",
						text: "Off Text",
						option: "textOff",
						importance: 11
					}
				]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,
			
			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this._htmlelem = $("<input/>", {
					type: "checkbox",
					id: "checkbutton" + this.uuid
				}).appendTo(this.element);

				this._htmllabel = $("<label/>", {
					"for": "checkbutton" + this.uuid,
					"text": this.options.textOff
				}).appendTo(this.element);

				var self = this;

				self._clickButton = function( event ) {
					self.options.value = self._htmlelem.prop("checked") ? 1 : 0;
					propertyHandler.handleSetpoint.call(self, 'uidValue');
					self.refresh.call(self, true);
				};

				this._htmlelem.button({
					label: this.options.textOff
				}).click(self._clickButton);


				this.refresh(true);
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {},

			/**
			* Refresh all displayed data
			*/
			refresh: function(force) {
				if(force || this._oldvalue === undefined || this._oldvalue !== this.options.value)
				{
					this._oldvalue = this.options.value;
					this._htmlelem.prop("checked", this.options.value == 1 ? true : false);
					var text = this.options.value == 1 ? this.options.textOn : this.options.textOff;
					this._htmlelem.button( "option", "label", text);
					this._htmlelem.button( "refresh");
				}
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

				if(key == 'value')
				{
					this.refresh();
				} else {
					this.refresh(true);
				}
			}

		});
	})($);
});