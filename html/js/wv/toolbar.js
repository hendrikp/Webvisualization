/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Toolbar (Edit tools)
 * based on jQuery UI css-styles
 * @module toolbar
 */
define(["exports", "jQuery", "jQueryUi"], function(exports, $, jui) {
	exports.createToolbar = function() {
		var self = {};

		// Toolbar containment
		self.element = $("<div/>", {
			class: "wv-toolbar wv-edit-tools ui-widget-header ui-corner-all"
		}).draggable({
			containment: "document",
			scroll: false,
			snap: ".wv-view, .wv-edit-tools",
			snapTolerance: 50
		});

		self.currentElement = self.element;

		/**
		* Adds a button group
		* @param id unique id for later access
		* @param text optional text label
		*/
		self.pushGroup = function(id, text) {
			self.currentElement = $("<div/>", {
				id: id,
				class: "wv-toolbar-group"
			}).appendTo(self.currentElement);

			self.addIcon("ui-icon-blank"); // placeholder

			// text present?
			if (typeof text !== 'undefined' && text.length > 0) {
				self.addLabel(text);
			}

			return self.currentElement;
		};

		/**
		* go up in group hierarchy
		*/
		self.popGroup = function() {
			if (self.currentElement != self.element) self.currentElement = self.currentElement.parent();
		};

		/**
		* add a button to current group
		* @param id unique id used for events
		* @param text optional text label for button
		* @param icon icon of button
		* @param func click handler
		*/
		self.addButton = function(id, text, icon, func) {
			var button = $("<button/>", {
				id: id
			}).button({
				text: text.length > 0,
				label: text,
				icons: {
					primary: icon
				}
			}).on("click", func).appendTo(self.currentElement);
		};

		/**
		* add a text label to current group
		* @param text
		*/
		self.addLabel = function(text) {
			var button = $("<p/>", {
				text: text
			}).addClass("wv-toolbar-label").appendTo(self.currentElement);
		};

		/**
		* Add a set of buttons to the current group
		* @param id unique id
		* @return Buttonset object
		*/
		self.addButtonset = function(id) {
			var selfSet = {};

			selfSet.element = $("<span/>", {
				id: id
			}).appendTo(self.currentElement);

			/**
			* Add a radio button to the buttonset
			* @param id unique id
			* @param text optional text
			* @param icon icon for button
			* @param func function for click handler
			* @param data data for click handler
			*/
			selfSet.addRadioButton = function(id, text, icon, func, data) {
				var checkbox = $("<input/>", {
					type: "radio",
					id: id,
					name: selfSet.element.attr("id")
				}).data("wv-data", data).appendTo(selfSet.element);

				// label for input required by jQuery
				var label = $("<label/>", {
					"for": id, // assosiate the label with input id
					"text": text
				}).appendTo(selfSet.element);

				checkbox.button({
					text: text.length > 0,
					label: text,
					icons: {
						primary: icon
					}
				}).click(func);

				checkbox.appendTo(selfSet.element);

				selfSet.element.buttonset();
			};

			return selfSet;
		};

		/**
		* Add a checkbox to the group
		* @param id unique id
		* @param text optional text
		* @param icon icon for button
		* @param func function for click handler
		*/
		self.addCheckbox = function(id, text, icon, func) {
			var checkbox = $("<input/>", {
				type: "checkbox",
				id: id
			}).appendTo(self.currentElement);

			// label for input field (jQuery Checkbutton)
			var label = $("<label/>", {
				"for": id, // associate with input id
				"text": text
			}).appendTo(self.currentElement);

			checkbox.button({
				text: text.length > 0,
				label: text,
				icons: {
					primary: icon
				}
			}).click(func);

			checkbox.appendTo(self.currentElement);
		};

		/**
		* Add Icon to current group
		* @param icon Icon
		*/
		self.addIcon = function(icon) {
			var container = $("<div/>", {
				class: "wv-toolbar-spacer"
			}).appendTo(self.currentElement);

			$("<span/>", {
				class: "ui-icon"
			}).addClass(icon).appendTo(container);
		};

		return self;
	};
});