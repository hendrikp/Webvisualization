/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Toolbox (Edit tools, Widget Drag & Drop)
 * based on jQuery UI css-styles
 * @module toolbox
 */
define(["exports", "jQuery", "jQueryUi"], function(exports, $, jui) {
	/**
	* Create a new toolbox object
	* @param app the application for options
	* @param view the view for drag&drop operations
	* @param container the container for drag&drop operations
	*/
	exports.createToolBox = function(app, view, container) {
		var self = {};
		self.app = app;
		self.view = view;
		self.container = container;

		// Edittools Snap support
		self.toolBoxDialog = self.currentElement = $("<div/>", {
			class: "wv-toolbox-dialog"
		}).appendTo(self.container).dialog({
			autoOpen: false,
			title: "Toolbox",
			height: "350",
			width: "200",
			position: { my: "right top", at: "right top", of: self.container }
		});

		self.toolBoxDialogWidget = self.toolBoxDialog.dialog("widget").addClass("wv-edit-tools");

		self.toolBoxDialogWidget.draggable({
			scroll: false,
			snap: ".wv-view, .wv-edit-tools"
		});

		/**
		* Closes the toolbox
		*/
		self.close = function() {
			// Close
			self.toolBoxDialog.dialog("close");
		};

		/**
		* Opens the toolbox with current widgets
		*/
		self.open = function(element) {
			// Calculate a good position
			if (!self.toolBoxDialog.dialog("isOpen")) {

				// Open Dialog
				self.toolBoxDialog.dialog("open");
			}
		};

		/**
		* Adds a Widget to the list
		* @param list list to extend
		* @param widget widget object to add (from JSON listing)
		*/
		self.addWidget = function(list, widget) {
			var item = $("<div/>", {class: "wv-toolbox-item ui-state-default"}).appendTo(list);

			// small plus icon // TODO: Later maybe different Icons for the Widgets
			item.html(widget.name);
			$("<span/>", {class: "ui-icon ui-icon-plus"}).prependTo(item);

			item.draggable({
				appendTo: self.container, // place helpers inside the view container
				containment: self.container, // draggable inside the view container
				helper: "clone", // make a copy instead of moving the orginal
				stack: ".wv-widget",
				zIndex: 9999999999, // always on top
				stop: function( event, ui ) {
					// add widget to view (this will load the widget type)
					self.view.addWidget({type: widget.type, properties: {uidTop: ui.position.top, uidLeft: ui.position.left}});
				}
			});
		};

		/**
		* Initialize the Toolbox with all current widgets
		*/
		self.init = function() {
			self.toolBoxDialog.html("");

			var list = $("<div/>", {class: "wv-toolbox-list"}).appendTo(self.toolBoxDialog);

			for(var widget in self.app.widgetList)
			{
				self.addWidget(list, self.app.widgetList[widget]);
			}
		};

		// intialize the toolbox right away
		self.init();

		return self;
	};
});