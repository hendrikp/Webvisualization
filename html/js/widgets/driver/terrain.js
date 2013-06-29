/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 3D-Driver Terrain module
 * Handles terrain generation
 * @module driver_terrain
 */
define(["exports", "three", "three_noise"], function(exports, THREE, ImprovedNoise) {
	var self = exports;

	/**
	* Generate Height noise by using 3d-perlin
	* using three.js sample
	* @param width width pos on terrain
	* @param height height pos on terrain
	* @param z random seed of terrain
	* @return height float array
	*/
	self.generateHeight = function(width, height, z) {
		var size = width * height,
			data = new Float32Array(size),
			perlin = new ImprovedNoise(),
			quality = 1;

		// reset height
		for (var i = 0; i < size; i++) {
			data[i] = 0;
		}

		// create height noise
		for (var j = 0; j < 4; j++) {
			// for each quality step

			for (var i = 0; i < size; i++) {
				var x = i % width,
					y = ~~ (i / width);

				// add to previous height
				data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
			}

			quality *= 5;
		}

		return data;
	};

	/**
	* combines the perlin noise with street scanlines
	* the weight data is used to protect the street areas
	* @param data height data (interpolated street scanlines)
	* @param protectData weight data (from street scanlines)
	* @param randomData perlin-3d noise that will be used
	* @param baseHeight Base heightline of the street
	* @return combined heightmap data
	*/
	self.combineRandomData = function(data, protectData, protectLimit, randomData, baseHeight) {
		var cdata = new Float32Array(data.length);

		var maxRandom = 155; // Math.max.apply(Math, randomData);
		var minRandom = 0.5; // Math.min.apply(Math, randomData);
		var deltaRandom = maxRandom - minRandom;

		for (var n = 0; n < cdata.length; ++n) {
			// add also a bit randomnes (max 1meter height)
			if (protectData[n] <= protectLimit) {
				// Combine perlin noise data with street scanline data
				var ndata = data[n] - baseHeight[n];
				cdata[n] = (Math.random() - 0.5) + baseHeight[n] + (ndata + (randomData[n] - 40) * 0.4) / 1.4;
			} else if (protectData[n] <= 0.85) {
				// Only use street scanline data with a bit of randomness
				cdata[n] = (Math.random() - 0.5) + data[n];
			} else {
				// Directly on street
				cdata[n] = data[n];
			}
		}

		return cdata;
	};

	/**
	* Box Smooth Filter for terrain
	* based on http://danielbeard.wordpress.com/2010/08/07/smoothing-terrain/
	* @param xSize terrain width
	* @param ySize terrain depth
	* @param data data to smooth (heightmap)
	* @param protectData street weigth to supress smoothing (array of floats between 0 and 1)
	* @param protectLimit limit where smooth supression stops (0-1)
	* @param filterSize smoothing box size (n^2+1)
	* @return smoothed data
	*/
	self.smoothTerrain = function(xSize, ySize, data, protectData, protectLimit, filterSize) {
		var count = 0;
		var total = 0;

		var size = xSize * ySize,
			smoothData = new Float32Array(size);

		// loop through all the values
		for (var x = 0; x < xSize; ++x) {
			for (var y = 0; y < ySize; ++y) {

				// count keeps track of how many points contribute to the total value at this point
				// total stores the summation of points around this point
				// Reset the count
				count = 0;
				total = 0;

				// is this an protected area?
				if (protectData[x + y * xSize] <= protectLimit) {
					// loop through the points around this one (contained in the filter)
					for (var x0 = x - filterSize, x0end = x + filterSize; x0 <= x0end; ++x0) {
						// if the point is outside the data set, ignore it
						if (x0 < 0 || x0 >= xSize) continue;
						for (var y0 = y - filterSize, y0end = y + filterSize; y0 <= y0end; ++y0) {
							if (y0 < 0 || y0 >= ySize) continue;

							// add the contribution from the filter to the total for this point
							total += data[x0 + y0 * xSize];
							++count;
						}
					}
				}

				// Store the averaged value
				if (count > 0) smoothData[x + y * xSize] = total / count;
				else smoothData[x + y * xSize] = data[x + y * xSize];
			}
		}

		return smoothData;
	};

});