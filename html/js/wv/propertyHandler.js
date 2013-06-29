/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Property and Binding Helpers
 * @module propertyHandler
 */
define(["exports", "jQuery"], function(exports, $) {

	var self = this;

	// propertis that will be present in all widgets
	self.defaultProperties = {
		"Value": [{
				uid: "uidValue",
				text: "Value",
				option: "value",
				importance: 0,
				hidden: false
			}
		], /* // Not used atm
		"Misc": [{
				uid: "uidLabel",
				text: "Label",
				option: "label",
				def: "",
				importance: 1,
				hidden: false
			}, {
				uid: "uidBorder",
				text: "Border",
				option: "showBorder",
				def: false,
				importance: 30,
				hidden: false
			}
		], */
		"Placement": [{
				uid: "uidTop",
				text: "Top",
				css: "top",
				def: 100,
				importance: 20,
				hidden: false
			}, {
				uid: "uidLeft",
				text: "Left",
				css: "left",
				def: 100,
				importance: 21,
				hidden: false
			}, {
				uid: "uidWidth",
				text: "Width",
				css: "width",
				def: 100,
				importance: 22,
				advanced: true,
				hidden: false
			}, {
				uid: "uidHeight",
				text: "Height",
				css: "height",
				def: 100,
				importance: 23,
				advanced: true,
				hidden: false
			}, {
				uid: "uidDepth",
				text: "Depth",
				css: "zIndex",
				def: 0,
				importance: 24,
				advanced: true,
				hidden: false
			}
		]
	};

	/**
	* Compares two properties by importance
	* used for sorted display in Property sheet
	*/
	self.compareProperties = function(a, b) {
		if (typeof(a.importance) === 'undefined') return 1;
		else if (typeof(b.importance) === 'undefined') return -1;

		return a.importance - b.importance;
	};

	/**
	* Sorts the property of all groups by importance
	*/
	self.sortProperties = function(properties) {
		for (var propGroup in properties) {
			properties[propGroup].sort(self.compareProperties);
		}
	};

	/**
	* Returns the current Binding for a property uid
	* @warning use only with widget as this context
	* @return Bound Name or undefined
	*/
	self.getBinding = function(propUid) {
		if (typeof(this._propBindings) !== 'undefined') {
			if (this._propBindings[propUid] !== undefined) {
				return this._propBindings[propUid]; // this property is bound
			}
		}

		return undefined;
	};

	/**
	* Async sends the bound property uid value of the widget
	* @param propUid unique property id
	* @warning use only with widget as this context
	*/
	self.handleSetpoint = function(propUid)
	{
		var prop = this._propuidResolver[propUid];
		var value = this.options[prop.option];
		var bindValue = self.getBinding.call(this, propUid);
		if (bindValue !== undefined) {
			var valueInfo = this._binding.getStreamInfo(bindValue.name);

			// Send the request but enforce usage of Query String instead Content
			// because mongoose hasn't a POST var parser.
			$.ajax({
				url: "cats/stream_set?" + $.param({
                    sid: this._binding.stream.streamID,
                    cts: new Date().getTime(),
					var: valueInfo.id,
					val: value
				}),
				cache: false,
				type: "POST"
			});
		}
	};

	/**
	* Returns datatype of option property
	* @param context widget
	* @param prop property object
	* @return type of property
	*/
	self.getOptionType = function(context, prop) {
		return prop.type !== undefined ? prop.type : (prop.option !== undefined ? typeof(context.option(prop.option)) : "string");
	};

	/**
	* Used internally to register a binding
	* @param prop property object
	* @param name bound name
	* @param prefix to prepend before value (string only)
	* @param postfix to append after value (string only)
	* @warning use only with widget as this context
	* @return BoundValue object
	*/
	self.setBinding = function(prop, name, prefix, postfix) {
		if (typeof(this._propBindings) === 'undefined') {
			this._propBindings = {};
		}

		if (name.length > 0) {
			this._propBindings[prop.uid] = {
				name: name,
				prefix: prefix !== undefined ? prefix : '',
				postfix: postfix !== undefined ? postfix : '',
				type: self.getOptionType(this, prop)
			};

			// Determine type conversion function
			this._propBindings[prop.uid].typef = self.valueTo[this._propBindings[prop.uid].type];
		} else {
			this._propBindings[prop.uid] = undefined;
		}

		return this._propBindings[prop.uid];
	};

	/**
	* Handles the binding part of property value changes
	* @param prop property object
	* @param value value to set / binding string
	* @return true if boundvalue, false if static value
	*/
	self.handleBinding = function(prop, value) {
		if (this._binding !== undefined) {
			// remove old binding
			var oldBinding = self.getBinding.call(this, prop.uid);
			if (oldBinding !== undefined) {
				self.setBinding.call(this, prop, "");
				this._binding.unsubscribeValue(oldBinding.name, this, prop);
				this.refresh();
			}

			// check for new binding
			var bindingMatch = null;
			if (typeof(value) === "string") {
				bindingMatch = value.match(/(.*?)\$\((.*?)\)(.*)/);
			}

			// add new binding if not raw value
			if (bindingMatch) {
				var newBinding = $.trim(bindingMatch[2]);

				// If the binding is not empty
				if (newBinding.length > 0) {
					var bind = self.setBinding.call(this, prop, newBinding, bindingMatch[1], bindingMatch[3]);
					this._binding.subscribeValue(newBinding, this, self.valueBoundFunc, prop, bind);
					this.refresh();
					return true;
				}
			}
		}

		return false;
	};

	/**
	* Handles property changes
	* @param prop property object
	* @param value static value or binding string (if undefined returns the value)
	*/
	self.valueFunc = function(prop, value) {
		if (prop !== undefined) {
			if (value === undefined) {
				// return current value
				var binding = self.getBinding.call(this, prop.uid);
				if (binding !== undefined) {
					return binding.prefix + '$(' + binding.name + ')' + binding.postfix;
				}

				if (prop.css !== undefined) {
					return this.element.css(prop.css);
				}

				return this.option(prop.option);
			} else {
				// Check if handled by binding or raw value
				if (!self.handleBinding.call(this, prop, value)) {
					if (prop.css !== undefined) {
						this.element.css(prop.css, value);
					} else if (prop.option !== undefined) {
						this.option(prop.option, self.valueTo[self.getOptionType(this, prop)](value));
					}

					return true;
				}
			}
		}
	};

	// Value conversion routines
	self.valueTo = {};
	self.valueTo["boolean"] = function(value) {
		if (value === "false" || value === "0" || value === "")
			return false;

		return !!value;
	};
	self.valueTo["string"] = String;
	self.valueTo["number"] = Number;

	/**
	* helper used to broadcast value with correct type
	* @param context widget
	* @param value value as received from the stream
	*/
	self.valueBoundFunc = function(context, value) {
		// Add prefix + postfix and convert to correct type
		value = context.bind.typef(context.bind.prefix + value + context.bind.postfix);

		// Now set it where it belongs
		if (context.prop.css !== undefined) {
			this.element.css(context.prop.css, value);
		} else if (context.prop.option !== undefined) {
			this._setOption(context.prop.option, value);
		}
	};

	/**
	* Collects initial css style from defaults and serialized file
	* @param valuelist (propuid-value pair)
	*/
	self.collectInitialStyle = function(valuelist) {
		var style = {};
		for (var propGroup in self.defaultProperties) {
			for (var property in self.defaultProperties[propGroup]) {
				var propDefault = self.defaultProperties[propGroup][property];

				if(propDefault.css !== undefined) {
					var val = valuelist[propDefault.uid];

					// set default if not saved in file
					if(val === undefined) val = propDefault.def;

					// set in style object
					if(val !== undefined) style[propDefault.css] = val;
				}
			}
		}
		return style;
	};

	/**
	* Adds the default property list to the widget property list
	* pre-existing properties are only extended not overwritten.
	* @param[out] properties widget properties
	*/
	self.addDefaultProperties = function(properties) {
		for (var propGroup in self.defaultProperties) {
			for (var property in self.defaultProperties[propGroup]) {
				var propDefault = self.defaultProperties[propGroup][property];

				// create group
				if (typeof(properties[propGroup]) === 'undefined') {
					properties[propGroup] = [];
				}

				// search if property exists
				var alreadyExists = false;
				var propWidgetIndex = 0;
				for (var i = 0, iend = properties[propGroup].length; i < iend; ++i) {
					if (properties[propGroup][i].uid === propDefault.uid) {
						alreadyExists = true;
						propWidgetIndex = i;
						break;
					}
				}

				if (alreadyExists) {
					// Extend default propertied by specific
					properties[propGroup][propWidgetIndex] = $.extend(true, {}, propDefault, properties[propGroup][propWidgetIndex]);
				} else {
					// Deep copy default
					properties[propGroup].push( $.extend(true, {}, propDefault) );
				}
			}
		}
	};

	/**
	* Sets and Returns one or more properties
	* @note On the first call this function will initialize the property list and resolver
	* @param uidProp uid of the property (if undefined returns all properties, if object uid-value pairs)
	* @param value to set (if undefined get)
	* @return value, nothing or all properties
	* @warning use only with widget as this context
	*/
	self.propFunc = function(uidProp, value) {
		if (this._propuidResolver === undefined) {
			// initialize property resolver and property list
			this._propuidResolver = {};
			self.addDefaultProperties(this._properties);
			self.sortProperties(this._properties);

			for (var propGroup in this._properties) {
				for (var property in this._properties[propGroup]) {
					var prop = this._properties[propGroup][property];
					this._propuidResolver[prop.uid] = prop;

					if(prop.def === undefined) {
						prop.def = self.valueFunc.call(this, prop);
					}

					if (prop.type === undefined) {
						prop.type = typeof prop.def;
					}
				}
			}
		}

		// Return all properties?
		if (uidProp === undefined) {
			return this._properties;
		} else {
			// Set multiple values or just one
			if (typeof(uidProp) === 'object') {
				// mutliple values
				for (var pi in uidProp) {
					try {
						self.valueFunc.call(this, this._propuidResolver[pi], uidProp[pi]);
					} catch(err) {};
				}
			} else {
				// one value
				return self.valueFunc.call(this, this._propuidResolver[uidProp], value);
			}
		}
	};

	/**
	* Sets the binding of the widget
	* @warning use only with widget as this context
	*/
	self.bindFunc = function(binding) {
		this._binding = binding;
	};

	exports = self;
});