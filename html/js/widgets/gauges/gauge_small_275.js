/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Small Gauge Widget
 * @module gauge_small_275
 */
define(["jQuery", "d3", "wv/propertyHandler", "text!widgets/gauges/gauge_small_275.svg!strip"], function($, d3, propertyHandler, svgdata) {
	(function($, svgdata, undefined) {
		$.widget("wv.gauge_small_275", {
			_svgdata: svgdata, // downloaded by require.js text plugin

			options: {
				label: "",
				value: 0,
				min: 0,
				max: 100,
				showBorder: true,
				limitQC: "#00f",
				limitWC: "#ffaa10",
				limitAC: "#f00",
				limitGC: "#bb1550",
				limitQH: 0,
				limitQL: 0,
				limitWH: 0,
				limitWL: 0,
				limitAH: 0,
				limitAL: 0,
				limitGH: 0,
				limitGL: 0
			},

			_properties: {
				"Value": [{
						uid: "uidValueMinimum",
						text: "Minimum",
						option: "min",
						importance: 10
					}, {
						uid: "uidValueMaximum",
						text: "Maximum",
						option: "max",
						importance: 11
					}
				],
				"Limits": [{
						uid: "uidLimitGlobalColor",
						text: "Global Color",
						option: "limitGC",
						importance: 50
					}, {
						uid: "uidLimitGlobalUpper",
						text: "Global Upper",
						option: "limitGH",
						importance: 51
					}, {
						uid: "uidLimitGlobalLower",
						text: "Global Lower",
						option: "limitGL",
						importance: 52
					}, {
						uid: "uidLimitAbortColor",
						text: "Abort Color",
						option: "limitAC",
						importance: 53
					}, {
						uid: "uidLimitAbortUpper",
						text: "Abort Upper",
						option: "limitAH",
						importance: 54
					}, {
						uid: "uidLimitAbortLower",
						text: "Abort Lower",
						option: "limitAL",
						importance: 55
					}, {
						uid: "uidLimitWarnColor",
						text: "Warn Color",
						option: "limitWC",
						importance: 56
					}, {
						uid: "uidLimitWarnUpper",
						text: "Warn Upper",
						option: "limitWH",
						importance: 57
					}, {
						uid: "uidLimitWarnLower",
						text: "Warn Lower",
						option: "limitWL",
						importance: 58
					}, {
						uid: "uidLimitQualityColor",
						text: "Quality Color",
						option: "limitQC",
						importance: 59
					}, {
						uid: "uidLimitQualityUpper",
						text: "Quality Upper",
						option: "limitQH",
						importance: 60
					}, {
						uid: "uidLimitQualityLower",
						text: "Quality Lower",
						option: "limitQL",
						importance: 61
					}
				]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,

			/**
			* called on creation by jQuery
			*/
			_create: function() {
				this.element.html(this._svgdata);
				this.d3a = d3.select(this.element[0]);
				this.d3s = this.d3a.selectAll(".gaugeNeedles");
				this.d3b = this.d3a.select("#gaugeBack");

				this.limitQH = this._createZone(0, 0, this.options.limitQC, "zoneQH", 40, 37);
				this.limitQL = this._createZone(0, 0, this.options.limitQC, "zoneQL", 40, 37);

				this.limitWH = this._createZone(0, 0, this.options.limitWC, "zoneWH", 40, 37);
				this.limitWL = this._createZone(0, 0, this.options.limitWC, "zoneWL", 40, 37);

				this.limitAH = this._createZone(0, 0, this.options.limitAC, "zoneAH", 40, 37);
				this.limitAL = this._createZone(0, 0, this.options.limitAC, "zoneAL", 40, 37);

				this.limitGH = this._createZone(0, 0, this.options.limitGC, "zoneGH", 40, 37);
				this.limitGL = this._createZone(0, 0, this.options.limitGC, "zoneGL", 40, 37);

				this.refresh();
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {
				this.refresh();
			},

			/**
			* Refresh all displayed data
			*/
			refresh: function() {
				var oMin = this.options.min,
					oMax = this.options.max,
					oValue = this.options.value;

				// recalculate scales
				this.valueRange = oMax - oMin;
				this.valueScale = this._svgNeedleRange / this.valueRange;

				// 6 steps
				var valueTickStep = Math.round(this.valueRange / 5, 1);

				// Tick labels
				this.d3a.select("#major_t1").text(oMin);
				this.d3a.select("#major_t2").text(oMin + valueTickStep * 1);
				this.d3a.select("#major_t3").text(oMin + valueTickStep * 2);
				this.d3a.select("#major_t4").text(oMin + valueTickStep * 3);
				this.d3a.select("#major_t5").text(oMin + valueTickStep * 4);
				this.d3a.select("#major_t6").text(oMax);

				// Unit and Tooltip
				var bindValue = propertyHandler.getBinding.call(this, 'uidValue');
				var valueTitle = "";
				var valueUnit = "";
				if (bindValue !== undefined) {
					var valueInfo = this._binding.getStreamInfo(bindValue.name);
					valueUnit = valueInfo.u;
					valueTitle = valueInfo.n + " [" + valueInfo.u + "]: " + valueInfo.c;
				}

				this.d3a.select("#unit").text(valueUnit);
				this.d3a.attr("title", valueTitle);

				// needle value
				this.d3s.attr("transform", this._transformNeedle(oValue));

				// quality limit
				if(this.options.limitQH != this.options.limitQL)
				{
					this._updateZone(this.limitQH, this.options.limitQH, oMax, this.options.limitQC, 40, 37);
					this._updateZone(this.limitQL, oMin, this.options.limitQL, this.options.limitQC, 40, 37);
				} else {
					this._updateZone(this.limitQH, oMax, oMax, this.options.limitQC, 40, 37);
					this._updateZone(this.limitQL, oMin, oMin, this.options.limitQC, 40, 37);
				}

				// warn limit
				if(this.options.limitWH != this.options.limitWL)
				{
					this._updateZone(this.limitWH, this.options.limitWH, oMax, this.options.limitWC, 40, 37);
					this._updateZone(this.limitWL, oMin, this.options.limitWL, this.options.limitWC, 40, 37);
				} else {
					this._updateZone(this.limitWH, oMax, oMax, this.options.limitWC, 40, 37);
					this._updateZone(this.limitWL, oMin, oMin, this.options.limitWC, 40, 37);
				}

				// abort limit
				if(this.options.limitAH != this.options.limitAL)
				{
					this._updateZone(this.limitAH, this.options.limitAH, oMax, this.options.limitAC, 40, 37);
					this._updateZone(this.limitAL, oMin, this.options.limitAL, this.options.limitAC, 40, 37);
				} else {
					this._updateZone(this.limitAH, oMax, oMax, this.options.limitAC, 40, 37);
					this._updateZone(this.limitAL, oMin, oMin, this.options.limitAC, 40, 37);
				}

				// global limit
				if(this.options.limitGH != this.options.limitGL)
				{
					this._updateZone(this.limitGH, this.options.limitGH, oMax, this.options.limitGC, 40, 37);
					this._updateZone(this.limitGL, oMin, this.options.limitGL, this.options.limitGC, 40, 37);
				} else {
					this._updateZone(this.limitGH, oMax, oMax, this.options.limitGC, 40, 37);
					this._updateZone(this.limitGL, oMin, oMin, this.options.limitGC, 40, 37);
				}
			},
			
			/**
			* Resize event
			*/
			resize: function(size) {
				// TODO: adjust scale
			},

			/**
			* Set option/values / refresh specific data
			*/
			_setOption: function(key, value) {
				this.options[key] = value;

				if (key == "value") {
					this.d3s.attr("transform", this._transformNeedle(value));

					/*
					// interpolation
					this.d3s.transition()
						.duration(200)
						.ease("linear")
						.attrTween("transform",

					function(d, a) {
						return d3.interpolateString(a, "rotate(" + svgvalue + ",55,55)");
					});
					*/
				} else {
					this.refresh();
				}
			},

			_svgCenter: 55, // needle center/pivot
			_svgNeedleMax: 135, // transform rotation max
			_svgNeedleMin: -135, // transform rotation min
			_svgNeedleRange: 270, // needle range (max - min)

			/**
			* Scales the needle value into the svg range
			* @return svg transform string
			*/
			_transformNeedle: function(value) {
				var oMin = this.options.min,
					oMax = this.options.max;

				if (value > oMax) {
					value = oMax;
				}
				if (value < oMin) {
					value = oMin;
				}

				var svgvalue = (value - oMin) * this.valueScale + this._svgNeedleMin;

				return "rotate(" + svgvalue + "," + this._svgCenter + "," + this._svgCenter + ")";
			},

			/**
			* calculates circumference points for limit arcs
			* @param radius arc radius
			* @param angle angle in degrees
			* @param centerX circle center x
			* @param centerY circle center y
			*/
			_circumferencePoint: function(radius, angle, centerX, centerY) {
				var cx = centerX + (radius * Math.cos(angle * (Math.PI / 180)));
				var cy = centerY - (radius * Math.sin(angle * (Math.PI / 180)));

				return {
					x: cx,
					y: cy
				};
			},

			/**
			* update the limit zone
			* @param zone d3.js zone path element
			* @param pct1 beginning raw value
			* @param pct2 end raw value
			* @param fill fill color
			* @param r1 inner radius
			* @param r2 outer radius
			*/
			_updateZone: function(zone, pct1, pct2, fill, r1, r2) {
				var oMin = this.options.min,
					oMax = this.options.max,
					oRange = oMax - oMin;

				// rescale
				var p1 = (pct1-oMin)/oRange;
				var p2 = (pct2-oMin)/oRange;

				// wrap angles around
				var a1 = ((-this._svgNeedleRange * p1) + 225) % 360;
				var a2 = ((-this._svgNeedleRange * p2) + 225) % 360;

				// calculate arc area edges
				var c1s = this._circumferencePoint(r1, a1, this._svgCenter, this._svgCenter);
				var c1f = this._circumferencePoint(r1, a2, this._svgCenter, this._svgCenter);
				var c2s = this._circumferencePoint(r2, a2, this._svgCenter, this._svgCenter);
				var c2f = this._circumferencePoint(r2, a1, this._svgCenter, this._svgCenter);

				// create svg path data
				var d = " M " + c1s.x + "," + c1s.y +
					" A " + r1 + "," + r1 + " " + (p2 - p1 > (2 / 3) ? "0 1" : "1 0") + " 1 " + c1f.x + "," + c1f.y +
					" L " + c2s.x + "," + c2s.y +
					" A " + r2 + "," + r2 + " " + (p2 - p1 > (2 / 3) ? "0 1" : "1 0") + " 0 " + c2f.x + "," + c2f.y +
					" Z";

				zone.attr("d", d).attr("fill", fill);
			},

			/**
			* Create the zone by setting up the path
			* @param pct1 beginning raw value
			* @param pct2 end raw value
			* @param fill fill color
			* @param className css class of the zone
			* @param r1 inner radius
			* @param r2 outer radius
			* @return zone path
			*/
			_createZone: function(pct1, pct2, fill, className, r1, r2) {
				// create svg path and add classes
				var zone = this.d3b.append("svg:path").classed("wv-gauge-zone", true);
				if (className != null) zone.classed(className, true);

				// calculate arc area
				this._updateZone(zone, pct1, pct2, fill, r1, r2);

				return zone;
			}
		});
	})($, svgdata);
});