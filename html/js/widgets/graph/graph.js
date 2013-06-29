/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 2D Graph Widget 
 * @module graph
 */
define(["jQuery", "d3", "wv/propertyHandler"], function($, d3, propertyHandler) {
	(function($, d3, undefined) {
		$.widget("wv.graph", {
			options: {
				value: 0,
				label: "",
				width: 300,
				height: 100,
				dataPoints: 300,
				interpolation: "linear",
				transitionDelay: 200,
				showBorder: true
			},

			_properties: {
				"Value": [{
					uid: "uidValueInterpolation",
					text: "Interpolation",
					option: "interpolation",
					importance: 20
				}, {
					uid: "uidValuePoints",
					text: "Data Points",
					option: "dataPoints",
					importance: 21
				}]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,

			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this.element.html("");
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {
				this._data = [];
				for (var i = 0; i < this.options.dataPoints; ++i) {
					this._data[i] = 0;
				}

				this._graph = d3.select(this.element[0]).append("svg:svg").attr("width", this.options.width + "px").attr("height", this.options.height + "px").classed("wv-graph-bg", true);

				// scales
				this._x = d3.scale.linear().domain([0, this.options.dataPoints]).range([0, this.options.width]); // starting point is -5 so the first value doesn't show and slides off the edge as part of the transition
				this._y = d3.scale.linear().domain([this.options.height, 0]).range([0, this.options.height]);

				var self = this;
				// create a line object that represents the SVG line we're creating
				this._line = d3.svg.line()
				// assign the X function to plot our line as we wish
				.x(function(d, i) {

					// return the X coordinate where we want to plot this datapoint
					return self._x(i);
				})
					.y(function(d) {

					// return the Y coordinate where we want to plot this datapoint
					return self._y(d);
				})
					.interpolate(this.options.interpolation);

				// display the line by appending an svg:path element with the data line we created above
				this._path = this._graph.append("svg:path").attr("d", this._line(this._data)).classed("wv-graph-axis", true).classed("wv-graph-axis-1", true);
			},

			/**
			* Refresh all displayed data
			*/
			refresh: function(value) {},

			/**
			* Resize event
			*/
			resize: function(size) {},
			
			/**
			* Set option/values / refresh specific data
			*/
			_setOption: function(key, value) {
				this.options[key] = value;

				switch(key) {
					case "value":
						this.value();
						break;

					default:
						this.refresh();
				}
			},

			/**
			* New value received
			*/
			value: function() {
				// no value passed, act as a getter
				this._data.shift(); // remove the first element of the array
				this._data.push(this.options.value);

				// static update without animation
				//path.data([this._data]) // set the new data
				//.attr("d", line); // apply the new data values

				// update with animation
				this._path.data([this._data]) // set the new data
				.attr("transform", "translate(" + this._x(1) + ")") // set the transform to the right by x(1) pixels (6 for the scale we've set) to hide the new value
				.attr("d", this._line) // apply the new data values ... but the new value is hidden at this point off the right of the canvas
				.transition() // start a transition to bring the new value into view
				.ease("linear")
					.duration(this.options.transitionDelay) // for this demo we want a continual slide so set this to the same as the setInterval amount below
				.attr("transform", "translate(" + this._x(0) + ")"); // animate a slide to the left back to x(0) pixels to reveal the new value
			}
		});
	})($, d3);
});