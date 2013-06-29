/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Application/Toolbar implementaion
 * @module app
 */
define(["exports", "jQuery", "jQueryUi", "coherent", "wv/view", "wv/toolbar"], function(exports, $, jui, engine, mView, mToolbar) {

	/**
	* Create a new application object
	*/
	exports.createApp = function() {
		var self = {};
		self.currentView = null;

		// Default Edit Settings
		self.nGridSize = 16;
		self.bGridShow = false;
		self.bSnap = false;
		self.bEditMode = false;
		self.sTheme = "smoothness";

		// Data Handling options
		self.nAnimationTime = (1 / 30) * 1000;
		self.nRequestTimeout = self.nAnimationTime * 3;
		self.nSimValues = 65;

		self.bInterpolate = false;

		// deprecated atm (IPC access)
		self.bUseCoherent = false;
		self.bStandaloneSimulation = false;
		if (typeof engine !== 'undefined') {
			if (engine.IsAttached) {
				self.bUseCoherent = true;
			}
		}

		// Theme Handling (remember for later theme changes)
		self.currentStyle = $("<link/>")
			.attr("type", "text/css")
			.attr("rel", "stylesheet")
			.attr("href", "themes/" + self.sTheme + "/jquery-ui-1.10.2.custom.min.css");

		self.currentStyle.appendTo("head");

		/**
		* Change the theme setting to the current theme saved in data of element
		*/
		self.themeChanger = function() {
			var element = $(this);

			self.sTheme = element.data("wv-data");
			self.currentStyle.attr("href", "themes/" + self.sTheme + "/jquery-ui-1.10.2.custom.min.css");
		};

		/**
		* Editmode change based on checked property of element
		*/
		self.modeChanger = function() {
			var element = $(this);

			self.bEditMode = element.prop("checked");
			self.currentView.switchMode(self.bEditMode);

			if (self.bEditMode) {
				self.edittools.show();
			} else {
				self.edittools.hide();
			}

			self.bGridShow = self.bEditMode;
			self.drawGrid(self.bGridShow);
		};

		/**
		* Grid setting changes based on data of element
		*/
		self.gridChanger = function() {
			var element = $(this);

			self.nGridSize = element.data("wv-data");
			self.drawGrid(self.bGridShow);
		};

		/**
		* Snap setting changes based on checked property of element
		*/
		self.snapChanger = function() {
			var element = $(this);

			self.bSnap = element.prop("checked");
			self.currentView.applySettings({
				snap: self.bSnap ? ".wv-widget" : false
			});
		};

		/**
		* Draw a grid and use it as background image by tiling it
		* @param showGrid true if grid needs to be shown
		*/
		self.drawGrid = function(showGrid) {
			var bgdata = "";

			if (self.nGridSize > 1 && showGrid) {
				var cgrid = $("<canvas/>").attr({
					width: Number(self.nGridSize),
					height: Number(self.nGridSize)
				});

				var canvas = cgrid[0];
				var context = canvas.getContext('2d');
				context.fillStyle = 'rgba(0,0,255,0.8)';
				context.fillRect(0, 0, 1, 1);
				context.fillRect(canvas.width - 1, 0, 1, 1);
				context.fillRect(canvas.width - 1, canvas.height - 1, 1, 1);
				context.fillRect(0, canvas.height - 1, 1, 1);

				// base 64-encoded data
				bgdata = "url(" + canvas.toDataURL() + ")";
			}

			// set as background image
			self.currentView.viewContainer.css("background-image", bgdata);
		};

		self.updateRoutine = null;

		/**
		* Update routine that will be called cylic to stream data
		*/
        self.dynamicUpdateRoutine = function() {
			if(self.updateRoutine !== null)
			{
				self.updateRoutine();
			}
        };

        // Currently using setInterval, but requestAnimationFrame could also be used
        // however a network request is involved in each frame and the data is refreshed in
        // response to the data received.
		self.updateTimer = setInterval(self.dynamicUpdateRoutine, self.nAnimationTime);
        
		/**
		* Sets a new update routine / stream handler
		*/
        self.setUpdateRoutine = function(func) {
        	self.updateRoutine = func;
        };

        /**
        * Serialize and post the currently openend view to the webserver
        */
		self.saveCurrentView = function() {

			// if a view is present
			if(self.currentView !== null) {

				// serialized data as post and viewname as query var
				$.ajax({
					url: "cats/view_save?" + $.param({name: self.currentView.name}),
					cache: false,
					type: "POST",
					mimeType: "application/json",
					contentType: "application/json",
					dataType: "json",
					processData: false,
					data: JSON.stringify(self.currentView.serialize())
				});
			}
		};

		/**
		* display the view
		* @param data JSON view data
		*/		
		self.displayView = function(data) {
			
			// close previous view
			if(self.currentView !== null) {
				self.currentView.closeView();
				self.currentView = null;
			}

			// now create the view
			var view = mView.createView(".wv-view", self);
			view.viewContainer.width("100%").height("100%");
			view.loadView(data);
			self.currentView = view;

			// Set window title and url
			$(document).attr("title", self.currentView.name);
			$(window).attr("name", "#" + self.currentView.name);
		};

		/**
		* received the widget List from server
		*/
		self.receivedWidgetList = function(widgets) {
			self.widgetList = widgets;
		};

		/**
		* refresh the widget list from server
		* @param optional optional callback when widget list is refreshed
		*/
		self.refreshWidgetList = function(optional) {
			$.ajax({
				url: "js/widgets/list.json",
				cache: false,
				mimeType: "application/json",
				dataType: "json",
				success: self.receivedWidgetList
			}).done(optional);
		};

		/**
		* load a named view from server
		* @param name view name
		*/
		self.loadView = function(name) {
			self.updateRoutine = null;
			$.ajax({
				url: "view/"+name+".json",
				cache: false,
				mimeType: "application/json",
				dataType: "json",
				success: self.displayView,
				statusCode: {
					404: function() {
						// View not found -> create a new one (when saved itll be created on server)
						self.displayView({name: name, content: []});
					}
				}
			});
		};

		/**
		* Get the name of the current view based on url
		* @return view name
		*/
		self.getCurrentViewName = function() {
			var name = $(location).attr("hash").substr(1);
			if(name.length <= 0)
				name = "default";

			return name;
		};

		/**
		* Loads the current view based on url
		*/
		self.loadCurrentView = function() {
			self.loadView(self.getCurrentViewName());
		};

		// Load the correct first view of the application
		self.refreshWidgetList(self.loadCurrentView);

		// When the url changes:
		// first refresh widget list
		// secondly load new view
		$(window).on('hashchange', function() {
			self.refreshWidgetList(self.loadCurrentView);
		});

		// App Toolbar
		var toolbar = mToolbar.createToolbar();
		toolbar.addCheckbox("toolbar_mode", "Edit", "ui-icon-pencil", self.modeChanger);

		// Edit Group
		self.edittools = toolbar.pushGroup("toolbar_edit"); {

			// Save Button
			toolbar.addButton("toolbar_save", "Save", "ui-icon-disk", self.saveCurrentView);

			// Helper Group
			toolbar.pushGroup("toolbar_ghelpers", "Helper:");
			toolbar.addCheckbox("toolbar_helper_snap", "Snap", "", self.snapChanger);

			// Grid Group
			toolbar.popGroup();
			toolbar.pushGroup("toolbar_ggrid", "Grid:");

			// Grid Sizes
			var gridSet = toolbar.addButtonset("toolbar_grid");
			gridSet.addRadioButton("toolbar_grid_16", "16x16", "", self.gridChanger, "16");
			gridSet.addRadioButton("toolbar_grid_32", "32x32", "", self.gridChanger, "32");
			gridSet.addRadioButton("toolbar_grid_none", "None", "ui-icon-cancel", self.gridChanger, "1");

			// Theme Group
			toolbar.popGroup();
			toolbar.pushGroup("toolbar_gtheme", "Theme:");

			// Theme Buttonset
			var themeSet = toolbar.addButtonset("toolbar_themes");
			themeSet.addRadioButton("toolbar_theme_dark", "Dark", "", self.themeChanger, "ui-darkness");
			themeSet.addRadioButton("toolbar_theme_smooth", "Smooth", "", self.themeChanger, "smoothness");
			toolbar.popGroup();
		}
		toolbar.popGroup();
		self.edittools.hide(); // in inital state hide the edit tools

		// Grip Icon for dragging the toolbar
		toolbar.addIcon("ui-icon-grip-dotted-vertical");
		toolbar.element.appendTo($("body"));

		return self;
	};

	/**
	* Create a test view for benchmarking purposes
	*/
	function createTestView(app) {
		var view = mView.createView(".wv-view", app);
		view.viewContainer.width("100%").height("100%");

		var cols = 15;
		var temp = [];

		temp.push({
			path: "widgets/graph/graph",
			properties: {
				uidValue: "$(SR_msec)",
				uidTop: 50,
				uidLeft: 400,
				uidDepth: 3
			}
		});
		
		for (var i = 8; i < app.nSimValues * 2; ++i) {
			temp.push({
				path: "widgets/text/textlabel",
				properties: {
					uidValue: "$(SR_msec)",
					uidTop: 50 + Math.floor(i / cols) * 100,
					uidLeft: (i % cols) * 100,
					uidDepth: i
				}
			});

			++i;
			temp.push({
				path: "widgets/gauges/gauge_small_275",
				properties: {
					uidValue: "$(Moment)",
					uidTop: 50 + Math.floor(i / cols) * 100,
					uidLeft: (i % cols) * 100,
					uidDepth: i
				}
			});
		}

		// now load the test view
		view.loadView({
			name: "default",
			content: temp
		});

		return view;
	}

	// directly create application object
	exports.currentApp = exports.createApp();
});