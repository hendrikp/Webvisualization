/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Property Sheet handling
 * @module propertySheet
 */
define(["exports", "jQuery", "wv/propertyHandler"], function(exports, $, propertyHandler) {

	/**
	* create a property sheet for a view container and binding
	* @param container view container
	* @param binding binding namespace of the view
	*/
	exports.createPropertySheet = function(container, binding) {
		var self = {};
		self.msdElements = $([]);
		self.container = container;
		self.binding = binding;

		// create dialog
		self.propertyDialog = self.currentElement = $("<div/>", {
			class: "wv-property-dialog"
		}).appendTo(self.container).dialog({
			autoOpen: false,
			title: "Selection",
			height: "350",
			width: "330"
		});

		// for snapping with other tools
		self.propertyDialogWidget = self.propertyDialog.dialog("widget").addClass("wv-edit-tools");

		self.propertyDialogWidget.draggable({
			scroll: false,
			snap: ".wv-view, .wv-edit-tools"
		});

		/**
		* Close the property sheet
		*/
		self.close = function() {
			self.selection($([]));
			// Close properties
			self.propertyDialog.dialog("close");
		};

		/**
		* Open the property sheet and refresh data
		*/
		self.open = function(element) {
			// Calculate a good position
			if (!self.propertyDialog.dialog("isOpen")) {
				var myp_x = "left";
				var atp_x = "right";
				if (element.position().left > element.parent().width() * 0.5) {
					myp_x = "right";
					atp_x = "left";
				}

				var myp_y = "top";
				var atp_y = "top";
				if (element.position().top > element.parent().height() * 0.66) {
					atp_y = "bottom";
					myp_y = "bottom";
				} else if (element.position().top > element.parent().height() * 0.33) {
					atp_y = "center";
					myp_y = "center";
				}

				self.propertyDialog.dialog("option", "position", {
					my: myp_x + " " + myp_y,
					at: atp_x + " " + atp_y,
					of: element
				});

				// Open Dialog
				self.propertyDialog.dialog("open");
			}
		};

		/**
		* propagate a change in a property value to the widgets
		* @warning call with html tag as this context
		*/
		self.changeProperty = function() {
			var propElement = $(this);
			var prop = propElement.data("wv-prop");

			var source = prop.type == "boolean" ? "checked" : "value";
			var value = propElement.prop(source);

			// For all selected elements
			self.msdElements.each(function() {
				var element = $(this);
				var type = element.data("wv-type");
				var widg = element[type];

				if (widg !== undefined) {
					var oldvalue = widg.call(element, "properties", prop.uid);

					// Trigger changes only when there is really a change
					// (so defaults don't get set when binding is the same)
					if (value != oldvalue) {
						widg.call(element, "properties", prop.uid, value);
					}
				}
			});
		};

		// Save the property last focused
		self.formFocus = "";

		/**
		* Remember currently focused property
		*/
		self.handleFocus = function() {
			self.formFocus = $(this).data("wv-prop").uid;
		};

		/**
		* Handles the removal of a property input field
		*/
		self.handleRemove = function() {
			if (self.formFocus == $(this).data("wv-prop").uid) {
				self.changeProperty.call(this);
			}
		};

		/**
		* Do not overwrite linked input on autocomplete focus
		*/
		self._autoCompleteWidgetFocus = function(event, ui) {
			return false;
		};

		/**
		* Triggers a change in the linked input element
		*/
		self._autoCompleteWidgetSelect = function(event, ui) {
			$(event.target).val(ui.item.label).change();
			return false;
		};

		/**
		* Autocomplete activation event that creates the autocomplete list
		*/
		self._autoCompleteWidgetSource = function(acSearch, acSource) {
			var search = acSearch.term;

			//if autocomplete is already open then $ is not required
			if (!this.isNewMenu || search.indexOf('$') >= 0) {
				
				// remove control chars
				search = search.replace("$", "");
				search = search.replace("(", "");
				search = search.replace(")", "");

				// start search
				acSource($.ui.autocomplete.filter(self.binding.stream.autoComplete, search));
			}
		};

		/**
		* List all bindable values in autocomplete list
		*/
		self._autoCompleteWidgetSearch = function(event) {
			$(event.target).autocomplete("search", '$(');
		};

		/**
		* Renders a single bindable value inside the autocomplete list
		*/
		self._autoCompleteWidgetRenderItem = function(ul, item) {
			return $("<li>")
				.append("<a><strong>" + item.n + "</strong>" + (item.u.length == 0 ? "" : " ["+item.u+"]") + (item.c.length == 0 ? "" : ("<br/><small>" + item.c + "</small>")) + "</a>")
				.appendTo(ul);
		};

		/** 
		* Reusable Autocomplete options
		*/
		self._autoCompleteWidgetOptions = {
			minLength: 2,
			delay: 500,
			autoFocus: true,
			source: self._autoCompleteWidgetSource,
			focus: self._autoCompleteWidgetFocus,
			select: self._autoCompleteWidgetSelect
		};

		/**
		* adds a property to the propertysheet
		* @param prop property object
		* @param value current value
		*/
		self.addProperty = function(propTableBody, prop, value) {
			var line = self.currentElement = $("<tr/>").appendTo(propTableBody);

			self.currentElement = $("<td/>", {
				class: "wv-property-label"
			}).text(prop.text).appendTo(line);

			self.currentElement = $("<td/>", {
				class: "wv-property-value"
			}).appendTo(line);

			var autoComplete;
			switch (prop.type) {
				case "string":
					autoComplete = $("<input/>", {
						class: "wv-property-input"
					}).attr("type", "text")
						.attr("value", value)
						.data("wv-prop", prop)
						.on("change", self.changeProperty)
						.on("focus", self.handleFocus)
						.on("remove", self.handleRemove)
						.appendTo(self.currentElement);
					break;
				case "number":
					autoComplete = $("<input/>", {
						class: "wv-property-input"
					}).attr("type", "text")
						.attr("value", value)
						.data("wv-prop", prop)
						.on("change", self.changeProperty)
						.on("focus", self.handleFocus)
						.on("remove", self.handleRemove)
						.appendTo(self.currentElement);
					break;
				case "boolean":
					$("<input/>")
						.attr("type", "checkbox")
						.prop("checked", value)
						.data("wv-prop", prop)
						.on("change", self.changeProperty)
						.on("focus", self.handleFocus)
						.on("remove", self.handleRemove)
						.appendTo(self.currentElement);

					autoComplete = $("<input/>", {
						class: "wv-property-input-c"
					}).attr("type", "text")
						.attr("value", value)
						.data("wv-prop", prop)
						.on("change", self.changeProperty)
						.on("focus", self.handleFocus)
						.on("remove", self.handleRemove)
						.appendTo(self.currentElement);

					// Various = prop indeterminate
					break;
				default:
					self.currentElement.text(value);
					break;
			}

			if (autoComplete !== undefined) {
				autoComplete.autocomplete(self._autoCompleteWidgetOptions)
					.on("dblclick", self._autoCompleteWidgetSearch)
					.data("ui-autocomplete")._renderItem = self._autoCompleteWidgetRenderItem;
			}
		};

		/**
		* Get the property value of the selection
		* @param prop propert object
		*/
		self.getSelectionPropertyValue = function(prop) {
			var value = self.msdElements[self.msdElements.data("wv-type")]("properties", prop.uid);

			// TODO: Later implement <Various> by merging properties of selection
			return value;
		};

		/**
		* Selection changed handler
		* @param selection new selection
		*/
		self.selection = function(selection) {
			self.propertyDialog.empty();
			self.msdElements = selection;

			// reset padding
			self.propertyDialog.css("padding", "");

			if (selection.length <= 0) {
				$("<p>Please select an widget</p>").appendTo(self.propertyDialog);
			} else {
				$( "<button/>" ).button({
					icons: {
						primary: "ui-icon-trash"
					},
					label: "Delete selected widgets"
				}).appendTo(self.propertyDialog)
				.click(function( event ) {
					self.msdElements.remove();
					self.selection($([]));
				});

				if (selection.length > 1) {
					$("<p>Please select only one widget</p>").appendTo(self.propertyDialog);
				} else {
					// make property table fit dialog
					self.propertyDialog.css("padding", "3px 0px 0px 0px");

					self.formFocus = "";
					var propGroups = self.msdElements[self.msdElements.data("wv-type")]("properties");

					// For all property groups of this selection
					for (var propGroup in propGroups) {
						var propSheet = self.currentElement = $("<div/>", {
							class: "wv-property-accordion"
						}).appendTo(self.propertyDialog);

						self.currentElement = $("<h3/>").text(propGroup).appendTo(propSheet);

						self.currentElement = $("<div/>", {
							class: "wv-property-group"
						}).appendTo(propSheet);

						self.currentElement = $("<table/>", {
							class: "wv-property-table ui-widget ui-widget-content"
						}).appendTo(self.currentElement);

						// Add all properties of this group
						var propTableBody = self.currentElement = $("<tbody/>").appendTo(self.currentElement);

						for (var property in propGroups[propGroup]) {
							var prop = propGroups[propGroup][property];

							self.addProperty(propTableBody, prop, self.getSelectionPropertyValue(prop));
						}

						// Property groups collapsible
						var accordion = $(propSheet).accordion({
							collapsible: true,
							heightStyle: "content"
						});
					}
				}
			}

			self.propertyDialog.dialog("option", "title", "Selection (" + self.msdElements.length + ")");
		};

		return self;
	};
});