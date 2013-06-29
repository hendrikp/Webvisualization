/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * View implementaion
 * @module view
 */
define(["exports", "jQuery", "jQueryUi", "require", "stream", "wv/bind", "wv/propertySheet", "wv/propertyHandler", "wv/toolbox"], function(exports, $, jui, require, mStream, mBind, propertySheet, propertyHandler, toolBox) {
	
	/**
	* Create a new view
	* @param viewSelector container jQuery selection string
	* @param app for options
	*/
	exports.createView = function(viewSelector, app) {
		var self = {};
		self.app = app;
		self.viewContainer = $(viewSelector);
		self.name = "";

		// create binding
		self.currentBinding = mBind.createBinding(app, self);

		// beginn streaming
		self.currentStream = mStream.createStream(self.currentBinding);
		self.currentStream.startStreaming();

		// create edit tools 
		self.propertySheet = propertySheet.createPropertySheet(self.viewContainer, self.currentBinding);
		self.toolBox = toolBox.createToolBox(app, self, self.viewContainer);

		/**
		* load a widget into the view
		* @param widgetData from JSON-format
		*/
		self.addWidget = function(widgetData) {
			// determine widget name
			widgetData.path = self.app.widgetList[widgetData.type].path;

			// create widget container
			widgetData.widget = $("<div/>", {
				class: "wv-widget"
			}).data("wv-type", widgetData.type).appendTo(self.viewContainer);

			// load widget
			(function(rcWidget) {
				var elem = rcWidget;

				// set default css settings before widget initalization
				elem.widget.css( propertyHandler.collectInitialStyle(elem.properties) );

				// this will load the widget if not already loaded
				require([elem.path],
					function() {
						elem.widget[elem.type]();
						elem.widget[elem.type]("binding", self.currentBinding);
						elem.widget[elem.type]("properties", elem.properties);
						elem.widget[elem.type]("refresh");
						self.widgetMode(elem.widget, true); // make editable if in edit mode
					},
					function(err) {
						elem.widget.text(err.requireModules[0] + "<br/>" + err.message).error();
						self.widgetMode(elem.widget, true); // make editable if in edit mode
					}
				);
			})(widgetData);
		};

		/**
		* loads a view into the view container and resets old content
		* @param data JSON-data
		*/
		self.loadView = function(data) {
			// Clean old content
			self.closeView();

			// Set current mode
			self.switchMode(self.app.bEditMode);

			// Save name
			self.name = data.name;

			// Add all widgets
			for (var i = 0; i < data.content.length; ++i) {
				self.addWidget(data.content[i]);
			}
		};

		/**
		* close/reset the view
		*/
		self.closeView = function() {
			// TODO: Maybe remind about saving

			// Close properties
			self.propertySheet.close();
			self.toolBox.close();
			
			// Clean old content
			self.viewContainer.html("");

			// reset name
			self.name = "";
		};

		// Helpers required to make multi select Drag & Drop work
		self.msdElements = $([]);
		self.msdOffset = {
			top: 0,
			left: 0
		};

		/**
		* Handle the multi-selection click
		*/
		self.msdSelect = function(event, ui) {
			var element = $(this);

			// Handle multi selection
			if (element.is(".ui-selectee")) {
				if (!element.is(".ui-selected")) {
					if (!event.ctrlKey) {
						$(".ui-selected", self.viewContainer).removeClass("ui-selected"); // unselect all others
					}
					element.addClass("ui-selected"); // make selected
				}
			}

			// Refresh property sheet content and position
			self.propertySheet.close();
			self.msdSelectRefresh();
			self.propertySheet.open(element);
		};

		/**
		* Refresh the internal element selection list based on css-class
		*/
		self.msdSelectRefresh = function() {
			self.msdElements = $(".ui-selected", self.viewContainer);
			self.propertySheet.selection(self.msdElements);
		};

		/**
		* Handle movement/constraint/grid of selection
		*/
		self.msdAdjust = function() {
			var element = $(this);
			var parent = element.parent();

			// get current position
			var parentHeight = parent.height(),
				parentWidth = parent.width(),
				elementHeight = element.height(),
				elementWidth = element.width(),
				elementPosition = element.position();

			// constrain to parent container
			if (elementPosition.left < 0) elementPosition.left = 0;

			if (elementPosition.top < 0) elementPosition.top = 0;

			if ((elementPosition.left + elementWidth) > parentWidth) {
				elementPosition.left = parentWidth - elementWidth;
			}

			if ((elementPosition.top + elementHeight) > parentHeight) {
				elementPosition.top = parentHeight - elementHeight;
			}

			// grid align
			elementPosition.left = Math.round(elementPosition.left / self.app.nGridSize) * self.app.nGridSize;
			elementPosition.top = Math.round(elementPosition.top / self.app.nGridSize) * self.app.nGridSize;

			element.css(elementPosition);
		};

		/**
		* Serialize the widget data for POSTing it on the webserver
		*/
		self.serializeWidget = function(widg, element) {
			var widgetData = {
				type: element.data("wv-type"),
				properties: {}
			};

			// for all property groups and properties
			var propGroups = widg.call(element, "properties");
			for (var propGroup in propGroups) {
				for (var property in propGroups[propGroup]) {
					// property object
					var prop = propGroups[propGroup][property];

					// save this data
					widgetData.properties[prop.uid] = widg.call(element, "properties", prop.uid);
				}
			}

			return widgetData;
		};

		/**
		* Serialize the complete view
		* @returns view JSON-ready object
		*/
		self.serialize = function() {
			var viewData = {
				name: self.name,
				content: []
			};

			// for all widgets in view container
			self.getAllWidgets().each(function() {
				var element = $(this);
				var type = element.data("wv-type"); // widget type
				var widg = element[type];

				// append to view content
				if (widg !== undefined) {
					viewData.content.push(self.serializeWidget(widg, element));
				}
			});

			return viewData;
		};

		/**
		* Returns all widgets inside of the view container
		*/
		self.getAllWidgets = function() {
			return $(".wv-widget", self.viewContainer);
		};

		/**
		* Calls a widget functionon all widgets selected
		* @param selector jQuery selection
		* @param funcn widget function name to call
		* @param param parameter to pass to widget function
		*/
		self.callSelectorWidgets = function(selector, funcn, param) {
			$(selector).each(function() {
				try {
					var element = $(this);
					var type = element.data("wv-type");
					var widg = element[type];

					// if widget not yet defined then widget is loading or didn't load
					// that is no problem since binding/create will also initialize the stuff
					// when the widget is fully loaded
					if (widg !== undefined) {
						widg.call(element, funcn, param);
					}
				} catch(e) {}
			});
		};

		/**
		* Simpliefied version of callSelectorWidgets which will use all widgets of the view
		*/
		self.callAllWidgets = function(funcn, param) {
			self.callSelectorWidgets(self.getAllWidgets(), funcn, param);
		};

		/**
		* Refreshes widget settings
		* (used by snap mode)
		*/
		self.applySettings = function(settings) {
			var allwidgets = self.getAllWidgets();

			if (self.app.bEditMode) {
				allwidgets.draggable(settings);
			}
		};

		/**
		* Sets the current editing mode for a selection of widgets
		* @param allwidgets jQuery selection
		* @param init if widgets havent been initialized yet
		*/
		self.widgetMode = function(allwidgets, init)
		{
			// Edit mode active
			if (self.app.bEditMode) {
				// Make draggable with selection support
				allwidgets.draggable();
				allwidgets.draggable({
					containment: "parent", // parent view
					scroll: false, // dont increase parent size
					snap: self.app.bSnap ? ".wv-widget" : false, // snap

					cursor: "move", // indicate drag capability
					start: function(event, ui) {
						self.msdSelect.call(this, event, ui); // trigger multiselect click

						// refresh saved offsets in selection
						self.msdElements.each(function() {
							var element = $(this);
							element.data("offset", element.offset());
						});

						// now save offset of current selection
						self.msdOffset = $(this).offset();
					},
					drag: function(event, ui) {
						// calculate current position
						var draggedTop = ui.position.top - self.msdOffset.top,
							draggedLeft = ui.position.left - self.msdOffset.left;

						// adjust multiselection positions
						self.msdElements.not(this).each(function() {
							var element = $(this),
								off = element.data("offset");

							element.css({
								top: off.top + draggedTop,
								left: off.left + draggedLeft
							});
						});
					},
					stop: function(event, ui) {
						// apply custom ui-grid, containments...
						self.msdElements.each(self.msdAdjust);
					}
				});

				// Make selectable
				allwidgets.on("click", self.msdSelect);

				// Make selectee known in selectable
				try {
					$(self.viewContainer).selectable( "refresh" );
				} catch(err) {}

				// Make resizable
				allwidgets.resizable();
				allwidgets.resizable({
					helper: "ui-resizable-helper",
					stop: function( event, ui ) {
						self.callSelectorWidgets(ui.element, "resize", ui.size);
					}
				});
			} else if(init !== true) {

				// Remove selectable
				allwidgets.filter(".ui-selected").removeClass("ui-selected");
				allwidgets.off("click", self.msdSelect);

				// Remove draggable
				allwidgets.draggable("destroy");

				// Remove resizable
				allwidgets.resizable("destroy");
			}
		};

		/**
		* Switches the editing mode of all widgets
		* @param editMode true if widgets can be edited
		*/
		self.switchMode = function(editMode) {
			var allwidgets = self.getAllWidgets();

			// apply mode
			self.widgetMode(allwidgets);

			// Close properties
			self.propertySheet.close();
			self.toolBox.close();

			// open toolbox and set up view container selectable
			if (editMode) {
				self.toolBox.open();
				try {
					$(self.viewContainer).selectable();
				} catch(err) {}

				// apply settings
				$(self.viewContainer).selectable({
					filter: ".wv-widget",
					tolerance: "touch",
					stop: function() {
						self.msdSelectRefresh();
					}
				});

				$(self.viewContainer).selectable( "refresh" );
			} else {
				try {
					$(self.viewContainer).selectable("destroy");
				} catch(err) {}
			}
		};

		return self;
	};
});