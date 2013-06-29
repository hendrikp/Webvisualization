/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 3D-Driver Street module
 * handles street generation and street weight/height terrain mask generation
 * @module driver_street
 */

define(["exports", "three"], function(exports, THREE) {
	var self = exports;

	var invalidValue = -99999.0;

	/**
	* Generates uvs on start (not really needed)
	*/
	self.generateTopUV = function(geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
		return [new THREE.Vector2(0, 1),
			new THREE.Vector2(1, 1),
			new THREE.Vector2(1, 0)];
	};

	/**
	* Generates uvs on end (not really needed)
	*/
	self.generateBottomUV = function(geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
		return [new THREE.Vector2(0, 1),
			new THREE.Vector2(1, 1),
			new THREE.Vector2(1, 0)];
	};

	/**
	* Create the street object/mesh
	* @param track track profile
	* @param rectLength street height
	* @param rectWidth street width
	* @param options driver widget options
	* @param color fallback color
	* @param staticData assets
	* @return street object
	*/
	self.createStreet = function(track, rectLength, rectWidth, options, color, staticData) {
		var selfs = {};

		// street shape is a rectangular
		selfs.shape = new THREE.Shape([new THREE.Vector2(-rectLength / 2, rectWidth / 2),
			new THREE.Vector2(rectLength / 2, rectWidth / 2),
			new THREE.Vector2(rectLength / 2, -rectWidth / 2),
			new THREE.Vector2(-rectLength / 2, -rectWidth / 2)
		]);

		// remember track length and path
		selfs.length = track.length;
		selfs.path = track.path;

		// generate frenet frames
		selfs.frames = new THREE.TubeGeometry.FrenetFrames(selfs.path, options.pathSteps, options.pathClosed);

		// make the normals more street like
		// the frenet algorithm will else produce a more rollercoaster like mesh
		for (var i = 0; i < selfs.frames.normals.length; ++i) {
			// Normal should always point up
			selfs.frames.normals[i].x = 0;
			selfs.frames.normals[i].y = -1;
			selfs.frames.normals[i].z = 0;
			selfs.frames.normals[i].normalize();

			// Binormal y should not rotate
			selfs.frames.binormals[i].y = 0;
			selfs.frames.binormals[i].normalize();
		}

		/**
		* Generates the street UVs
		*/
		selfs.generateSideWallUV = function(geometry, extrudedShape, wallContour, extrudeOptions, indexA, indexB, indexC, indexD, stepIndex, stepsLength, contourIndex1, contourIndex2) {
			
			// UV needs to be scaled depending on segment count and track length
			var len = stepsLength;
			var repeat = (len / selfs.length ) * 25;

			// wrap UVs around
			var n = stepIndex % repeat;
			var top = n / repeat;
			var bottom = (n - 1) / repeat;

			// return UVs
			return [new THREE.Vector2(0, bottom),
				new THREE.Vector2(1, bottom),
				new THREE.Vector2(1, top),
				new THREE.Vector2(0, top)];
		};

		// Settings for extruding the street mesh from the street shape
		selfs.extrudeSettings = {
			steps: options.pathSteps,
			frames: selfs.frames,
			extrudePath: selfs.path,

			// read more on this topic here:
			// - http://paulyg.f2s.com/uv.htm
			// - http://stackoverflow.com/questions/14622087/texture-mapping-on-extrude-geometry-threejs
			UVGenerator: {
				generateTopUV: self.generateTopUV,
				generateBottomUV: self.generateBottomUV,
				generateSideWallUV: selfs.generateSideWallUV
			}
		};

		// extrude the street mesh
		selfs.geometry = selfs.shape.extrude(selfs.extrudeSettings);

		// add Street Material
		selfs.mesh = THREE.SceneUtils.createMultiMaterialObject(selfs.geometry, [
			new THREE.MeshLambertMaterial({
				color: color,
				map: staticData.roadTexture,
				wireframe: options.debugFrenet
			}),
			new THREE.MeshLambertMaterial({
				color: color,
				map: staticData.roadTexture,
				wireframe: options.debugFrenet
			})
		]);

		// Set scale to 1
		selfs.mesh.scale.x = selfs.mesh.scale.y = selfs.mesh.scale.z = 1;

		// optional shadow on street
		if (options.shadowMaps) {
			selfs.mesh.traverse(function(child) {
				child.castShadow = false;
				child.receiveShadow = true;
			});
		}

		return selfs;
	};

	/**
	* Generate a terrain for street mesh vertices
	* @param verts vertices of the street mesh
	* @param width terrain width
	* @param widthOffset offset of terrain from origin
	* @param widthScale scale of width pixels
	* @param depth terrain depth
	* @param depthOffset offset of terrain from origin
	* @param depthScale scale of depth pixels
	* @param baseHeight base heightline of the terrain
	* @param options options of driver widget
	* @return terrain data
	*/
	self.generateTerrainForStreet = function(verts, width, widthOffset, widthScale, depth, depthOffset, depthScale, baseHeight, options) {
		var size = width * depth, // area in m²
			data = new Float32Array(size),
			dataWScan = new Float32Array(size),
			dataDScan = new Float32Array(size),
			weightStreet = new Float32Array(size),
			weightWScan = new Float32Array(size),
			weightDScan = new Float32Array(size);

		// Reset Heights
		for (var i = 0; i < size; ++i) {
			data[i] = invalidValue;
			dataWScan[i] = invalidValue;
			dataDScan[i] = invalidValue;
			weightStreet[i] = 0;
			weightWScan[i] = 0;
			weightDScan[i] = 0;
		}

		// prepare scanlines
		var widthScan = self.initScan(depth);
		var depthScan = self.initScan(width);

		// scan for street using the terrain grid
		var sizev = verts.length;
		for (i = 0; i < sizev; ++i) {

			// map street verts to terrain
			var x = ~~ (0.5 + (verts[i].x - widthOffset) * widthScale),
				z = ~~ (0.5 + (verts[i].z - depthOffset) * depthScale);

			var n = z * width + x;

			// save height
			if (data[n] == invalidValue) {
				data[n] = verts[i].y;
			} else if (data[n] > verts[i].y) {
				data[n] = verts[i].y;
			}

			// save street weight as 1 since point is directly on street
			weightStreet[n] = 1.0;

			// save scanpoints for later sorting and interpolation
			self.saveScanPoint(widthScan, z, x, data[n]);
			self.saveScanPoint(depthScan, x, z, data[n]);
		}

		// sort scanlines
		self.prepareInterpolation(widthScan, depth, width, options.terrainBorderOffset, baseHeight);
		self.prepareInterpolation(depthScan, width, depth, options.terrainBorderOffset, baseHeight);

		// now interpolate scanline data
		self.interpolateScan(widthScan, depth, dataWScan, weightWScan, options.pathBrushRadius, width, 1, 1 / widthScale);
		self.interpolateScan(depthScan, width, dataDScan, weightDScan, options.pathBrushRadius, 1, width, 1 / depthScale);

		// generate debug weight texture
		var debugWeightsTexture = self.generateWeightTexture(weightStreet, weightWScan, weightDScan, width, depth);

		// combine the result of both scanlines
		self.combineResult(data, weightStreet, dataWScan, weightWScan, dataDScan, weightDScan);

		return {
			data: data,
			weight: weightStreet,
			debugWeightsTexture: debugWeightsTexture
		};
	};

	/**
	* Reset Scanline data
	*/
	self.initScan = function(count) {
		var scan = [];
		for (var i = 0; i < count; ++i) {
			scan[i] = {
				exists: {},
				data: []
			};
		}
		return scan;
	};

	/**
	* Remember found street points on scans
	* @param[out] scan array for scan info
	* @param ind index in scan array
	* @param val position for sorting
	* @param height street height at this point
	*/
	self.saveScanPoint = function(scan, ind, val, height) {
		// Save for interpolations
		if (scan[ind].exists[val] === undefined) {
			scan[ind].exists[val] = scan[ind].data.push({
				val: val,
				height: height
			}) - 1;
		} else {
			// Already there only update
			scan[ind].data[scan[ind].exists[val]].height = height;
		}
	};

	/**
	* Sort scanline streetpoints
	*/
	self.sortVal = function(a, b) {
		// Sort lines for interpolations
		return (a.val - b.val);
	};

	/**
	* Prepares the scanlines for processing
	* @param scan scanline array
	* @param count scaline array count
	* @param max maximal position in array (for border generation)
	* @param borderOffset border size
	* @param baseHeight terrain base heightline
	*/
	self.prepareInterpolation = function(scan, count, max, borderOffset, baseHeight) {
		for (var i = 0; i < count; ++i) {
			var scanElem = scan[i].data;
			scanElem.sort(self.sortVal);

			if (scanElem.length > 0) {
				// add border based on nearest point
				scanElem.push({
					val: max,
					height: scanElem[scanElem.length - 1].height + borderOffset
				});
				scanElem.unshift({
					val: 0,
					height: scanElem[scanElem.length - 1].height + borderOffset
				});
			} else {
				// no data avaible use only base height
				scanElem.push({
					val: max,
					height: baseHeight + borderOffset
				});
				scanElem.unshift({
					val: 0,
					height: baseHeight + borderOffset
				});
			}
		}
	};

	/**
	* Interpolates the scanline data to produce a heightmap
	* @param radius street weight radius
	*/
	self.interpolateScan = function(scan, count, data, weight, radius, cols, rows, rowScale) {
		for (var i = 0; i < count; ++i) {
			var scanElem = scan[i].data;
			var scanLen = scanElem.length - 1;
			for (var si = 0, si2 = 1; si < scanLen; ++si, ++si2) {

				// linear interpolation
				var icur = scanElem[si].height;
				var istep = (scanElem[si2].height - icur) / (scanElem[si2].val - scanElem[si].val);
				var istart = scanElem[si].val + 1;
				var iend = scanElem[si2].val;
				var diff = 0;
				for (var x = istart; x < iend; ++x) {
					var n = i * cols + x * rows;

					data[n] = (icur += istep);

					// weight decreases with distance
					if (si > 0) { // border doesnt count
						diff = radius - (1 + x - istart) * rowScale;

						if (diff > 0) {
							weight[n] += diff / radius;
						}
					}

					if (si2 < scanLen) { // border doesnt count
						diff = radius - (iend - x) * rowScale;

						if (diff > 0) {
							weight[n] += diff / radius;
						}
					}

					// weight is limited between 0 and 1
					if (weight[n] > 1.0) {
						weight[n] = 1.0;
					} else if (weight[n] < 0.0) {
						weight[n] = 0.0;
					}
				}
			}
		}
	};

	/**
	* Combines the data from depth and width scan to one height/weight map
	*/
	self.combineResult = function(data, weightStreet, dataWScan, weightWScan, dataDScan, weightDScan) {
		var count = data.length;
		for (var i = 0; i < count; ++i) {
			if (data[i] == invalidValue) {
				if (dataWScan[i] == invalidValue) {
					// only depth scanline
					data[i] = dataDScan[i];
					weightStreet[i] = weightDScan[i];
				} else if (dataDScan[i] == invalidValue) {
					// only width scanline
					data[i] = dataWScan[i];
					weightStreet[i] = weightWScan[i];
				} else {
					// both scanlines need to be used
					var weightSum = weightWScan[i] + weightDScan[i];

					if (weightSum <= 0.01) {
						data[i] = (dataWScan[i] + dataDScan[i]) / 2;
					} else {
						weightWScan[i] = weightWScan[i] / weightSum;
						weightDScan[i] = weightDScan[i] / weightSum;

						// interpolated heigth
						data[i] = dataWScan[i] * weightWScan[i] + dataDScan[i] * weightDScan[i];

						// make some predefined adjustments to produce good result for curves
						if (weightWScan[i] > 0.1 && weightDScan[i] > 0.1) {

							if (weightWScan[i] > 0.45 && weightDScan[i] > 0.45) {
								weightSum *= 0.5;
							} else if (weightWScan[i] > 0.4 && weightDScan[i] > 0.4) {
								weightSum *= 0.65;
							} else if (weightWScan[i] > 0.3 && weightDScan[i] > 0.3) {
								weightSum *= 0.7;
							} else if (weightWScan[i] > 0.2 && weightDScan[i] > 0.2) {
								weightSum *= 0.75;
							} else if (weightWScan[i] > 0.15 && weightDScan[i] > 0.15) {
								weightSum *= 0.8;
							} else {
								weightSum *= 0.9;
							}
						}

						// limit
						if (weightSum > 1.0) {
							weightSum = 1.0;
						}
					}

					// result
					weightStreet[i] = weightSum;
				}
			}
		}
	};

	/**
	* generate a weight texture for debugging purposes based on interpolated weight data
	* @return canvas to be used as texture
	*/
	self.generateWeightTexture = function(dataR, dataG, dataB, width, height) {
		var canvas, context, image, imageData;

		// create a canvas
		canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		// back bg
		context = canvas.getContext('2d');
		context.fillStyle = '#000';
		context.fillRect(0, 0, width, height);

		// get image pointer
		image = context.getImageData(0, 0, canvas.width, canvas.height);
		imageData = image.data;

		// write pixels
		for (var i = 0, j = 0, l = imageData.length; i < l; i += 4, j++)
		{
			imageData[i] = 255 * dataR[j];
			imageData[i + 1] = 255 * dataG[j];
			imageData[i + 2] = 255 * dataB[j];
		}

		// save
		context.putImageData(image, 0, 0);

		return canvas;
	};
});