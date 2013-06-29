/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 3D-Driver Track module
 * handles track profile generation (track to point path)
 * @module driver_track
 */
define(["exports", "jQuery", "three"], function(exports, $, THREE) {
	var self = exports;

	/**
	* Calculate track from a inverse corner radius based track profile
	* @param length data points
	* @param data track profile
	* @param precision set to > 0 if interpolated points should be inserted
	* @param path[out] point path to generate
	* @param point beginning
	* @param lastpoint last generated point
	* @return track length
	*/
	self.pathICR = function(length, data, precision, path, point, lastpoint) {
		var totalLength = 0.0;

		// prepare arrays for additional data
		if (data.steerAngleRad === undefined) data.steerAngleRad = [];
		if (data.cornerRadius === undefined) data.cornerRadius = [];
		if (data.distanceLine === undefined) data.distanceLine = [];
		if (data.slopeAngleRad === undefined) data.slopeAngleRad = [];

		// current steer angle in radiant
		var steerAngleRad = 0;
		var lastDistance = 0;

		for (var i = 0; i < length - 1; ++i) {
			data.cornerRadius[i] = 1.0 / data.inverseCornerRadius[i];

			// Make relative
			var currentDistance = data.distance[i + 1] - lastDistance;
			lastDistance = data.distance[i + 1];
			data.distance[i] = currentDistance;

			// add length
			totalLength += data.distance[i];
			
			if (data.inverseCornerRadius[i] == 0) {
				// driving straigth ahead
				data.steerAngleRad[i] = 0;
				data.distanceLine[i] = data.distance[i];
			} else {
				// b / r (Angle at side of street)
				var alpha = data.distance[i] / Math.abs(data.cornerRadius[i]);

				// 90 - (180 - alpha) / 2
				data.steerAngleRad[i] = (Math.PI / 2) - ((Math.PI - alpha) / 2);

				// chord length (as straight line)
				data.distanceLine[i] = 2 * Math.abs(data.cornerRadius[i]) * Math.sin(alpha / 2);

				// turning right is positive ICR
				if (data.inverseCornerRadius[i] < 0) {
					data.steerAngleRad[i] *= -1;
				}
			}
			data.slopeAngleRad[i] = 0; // reset for now (too noisy) // TODO

			steerAngleRad += data.steerAngleRad[i]; // Steer angle is relative so add last point

			// for each precision produce a point
			for (var p = 0; p < precision; ++p) {
				lastpoint = point;

				// create point
				point = new THREE.Vector3(
					Math.sin(steerAngleRad) * (data.distanceLine[i] / precision),
					Math.sin(data.slopeAngleRad[i]) * (data.distanceLine[i] / precision),
					Math.cos(steerAngleRad) * (data.distanceLine[i] / precision));
				point.add(lastpoint); // point calculation relative

				// add to path
				path.push(point);
			}
		}

		return totalLength;
	};

	/**
	* Calculate track from a curve radius based track profile
	* @param length data points
	* @param data track profile
	* @param precision set to > 0 if interpolated points should be inserted
	* @param path[out] point path to generate
	* @param point beginning
	* @param lastpoint last generated point
	* @return track length
	*/
	self.pathCR = function(length, data, precision, path, point, lastpoint) {
		var totalLength = 0.0;

		if (data.steerAngleRad === undefined) data.steerAngleRad = [];
		if (data.cornerRadius === undefined) data.cornerRadius = [];
		if (data.distanceLine === undefined) data.distanceLine = [];
		if (data.slopeAngleRad === undefined) data.slopeAngleRad = [];

		// current steer angle in radiant
		var steerAngleRad = 0;
		var lastDistance = 0;

		for (var i = 0; i < length - 1; ++i) {
			// Make relative
			var currentDistance = data.distance[i + 1] - lastDistance;
			lastDistance = data.distance[i + 1];
			data.distance[i] = currentDistance;

			// add length
			totalLength += data.distance[i];

			if (Math.abs(data.cornerRadius[i]) > 900000) {
				// driving in a straight line
				data.steerAngleRad[i] = 0;
				data.distanceLine[i] = data.distance[i];
			} else {
				// b/r (Angle at side of the street)
				var alpha = data.distance[i] / Math.abs(data.cornerRadius[i]);

				// 90 - (180 - alpha) / 2
				data.steerAngleRad[i] = (Math.PI / 2) - ((Math.PI - alpha) / 2);

				// chord length (as straight line)
				data.distanceLine[i] = 2 * Math.abs(data.cornerRadius[i]) * Math.sin(alpha / 2);

				// turning right is positive ICR
				if (data.cornerRadius[i] > 0) {
					data.steerAngleRad[i] *= -1;
				}
			}
			data.slopeAngleRad[i] = 0;

			steerAngleRad += data.steerAngleRad[i]; // Steer angle relative

			// for each precision point
			for (var p = 0; p < precision; ++p) {
				lastpoint = point;

				// create point
				point = new THREE.Vector3(
					Math.sin(steerAngleRad) * (data.distanceLine[i] / precision),
					Math.sin(data.slopeAngleRad[i]) * (data.distanceLine[i] / precision),
					Math.cos(steerAngleRad) * (data.distanceLine[i] / precision));
				point.add(lastpoint); // point calculation relative

				// add point
				path.push(point);
			}
		}

		return totalLength;
	};

	/**
	* Calculate track from steer angle based track profile
	* @param length data points
	* @param data track profile
	* @param precision set to > 0 if interpolated points should be inserted
	* @param path[out] point path to generate
	* @param point beginning
	* @param lastpoint last generated point
	* @return track length
	*/
	self.pathSteerAngle = function(length, data, precision, path, point, lastpoint) {
		var totalLength = 0.0;

		// current steer angle in radiant
		var steerAngleRad = 0;

		for (var i = 0; i < length; ++i) {
			steerAngleRad += data.steerAngleRad[i]; // Steer angle relative

			for (var p = 0; p < precision; ++p) {
				lastpoint = point;

				// add length
				totalLength += data.distance[i];
				
				// add point
				point = new THREE.Vector3(
					Math.sin(steerAngleRad) * (data.distance[i] / precision),
					Math.sin(data.slopeAngleRad[i]) * (data.distance[i] / precision),
					Math.cos(steerAngleRad) * (data.distance[i] / precision));
				point.add(lastpoint); // point calculation relative

				// add point to path
				path.push(point);
			}
		}

		return totalLength;
	};

	/**
	* Calculate track from GPS based track profile
	* using FCC 47 CFR 73.208 // Ok for distance between points < 400 km
	* @param length data points
	* @param data track profile
	* @param precision set to > 0 if interpolated points should be inserted
	* @param path[out] point path to generate
	* @param point beginning
	* @param lastpoint last generated point
	* @return track length
	*/
	self.pathGPS = function(length, data, precision, path, point, lastpoint) {
		var totalLength = 0.0;

		if (data.distance === undefined) data.distance = [];
		if (data.steerAngleRad === undefined) data.steerAngleRad = [];
		if (data.slopeAngleRad === undefined) data.slopeAngleRad = [];

		var i2 = 1;

		for (var i = 0; i < length - 1; ++i, ++i2) {
			lastpoint = point;

			// for more details please see:
			// http://en.wikipedia.org/wiki/Geographical_distance#cite_note-2
			// Orthodrome: http://de.wikipedia.org/wiki/Orthodrome

			var meanLatitudeRad = (data.latitudeRad[i] + data.latitudeRad[i2]) / 2;
			var deltaLatitude = data.latitude[i2] - data.latitude[i];
			var deltaLongitude = data.longitude[i2] - data.longitude[i];

			var k1 = 111.13209 - 0.56605 * Math.cos(2 * meanLatitudeRad) + 0.00120 * Math.cos(4 * meanLatitudeRad);
			var k2 = 111.41513 * Math.cos(meanLatitudeRad) - 0.09455 * Math.cos(3 * meanLatitudeRad) + 0.00012 * Math.cos(5 * meanLatitudeRad);

			// longitude, latitude deltas relative
			// create point
			point = new THREE.Vector3(
				1000 * (k1 * deltaLatitude),
				0,
				1000 * (k2 * deltaLongitude));
			point.add(lastpoint); // point calculation relative
			point.y = data.elevation[i2]; // elevation absolute

			// calculate distance
			data.distance[i] = point.distanceTo(lastpoint);

			// add length
			totalLength += data.distance[i];

			// add to path
			path.push(point);
		}

		return totalLength;
	};

	/**
	* converts the JSON-format of gpsies.com to a more suited format
	*/
	self.convertGPSTrackData2DriveProfile = function(gpsData) {
		var driveProfileGPS = {
			latitude: [0],
			longitude: [0],
			elevation: [0]
		};

		// for each data point
		var gpsar = gpsData.data.trackData[0];
		for (var i = 0; i < gpsar.length; ++i) {
			var elem = gpsar[i];
			driveProfileGPS.longitude[i] = elem.lon;
			driveProfileGPS.latitude[i] = elem.lat;
			driveProfileGPS.elevation[i] = elem.ele;
		}

		return driveProfileGPS;
	};

	/**
	* converts an array with angles in degrees to a array of radiants
	* @param data[out] in radiant
	* @param angles in degrees
	*/
	self.convertAngles2Rad = function(data, angles) {
		var PI2 = Math.PI / 180;
		for (var aind = 0; aind < angles.length; ++aind) {
			var atype = angles[aind];
			var rtype = atype + "Rad";

			if (data[atype] !== undefined && data[rtype] === undefined) {
				var darray = data[atype];
				var dlen = darray.length;

				var rarray = [];
				for (var i = 0; i < dlen; ++i) {
					rarray[i] = darray[i] * PI2;
				}
				data[rtype] = rarray;
			}
		}
	};

	/**
	* Generates a path from a track profile of unknown type
	* @param data track profile object
	* @param precision if > 0 then interpolated points are inserted
	* @return path object with track length
	*/
	self.pathFromData = function(data, precision) {
		var point = new THREE.Vector3(0, 0, 0);
		var lastpoint = point;
		var path = [point];

		// GPS JSON Format // http://www.gpsies.com/createTrack.do
		if (data.data !== undefined) {
			data = self.convertGPSTrackData2DriveProfile(data);
		}

		// determine data point count
		var length = data.distance !== undefined ? data.distance.length : data.elevation.length;
		
		// init track length
		var totalLength = 0.0;

		// Convert degrees to radians
		self.convertAngles2Rad(data, ["steerAngle", "slopeAngle", "longitude", "latitude"]);
		if (data.longitude !== undefined) {
			// GPS based
			totalLength = self.pathGPS(length, data, precision, path, point, lastpoint);
		} else if (data.inverseCornerRadius !== undefined) {
			// Inverse Curve Radius based
			totalLength = self.pathICR(length, data, precision, path, point, lastpoint);
		} else if (data.cornerRadius !== undefined) {
			// Curve Radius based
			totalLength = self.pathCR(length, data, precision, path, point, lastpoint);
		} else if (data.steerAngle !== undefined) {
			// Steering Angle based
			totalLength = self.pathSteerAngle(length, data, precision, path, point, lastpoint);
		}

		return {
			path: new THREE.SplineCurve3(path),
			length: totalLength
		};
	};

	/**
	* Loads a track profile
	* @param trackUrl url of the track profile file
	* @param that driver widget context
	* @param trackLoaded callback to call when loading finished
	* @param progress progress deferred object to signal progress/errors
	*/
	self.load = function(trackUrl, that, trackLoaded, progress) {
		progress.notify("Loading Track Data");
		$.ajax({
			url: trackUrl,
			dataType: "json",
			mimeType: "application/json",
			success: function(data) {
				if (data === null) return;

				// Only process current data
				trackLoaded.call(that, that, data, progress);
			},
			error: function() {
				progress.notify("Track couldn't be loaded");
				progress.reject();
			}
		});
	};
});