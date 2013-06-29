/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 3D-Driver World/Scene generation
 * handles scene generation
 * @module driver_world
 */
define(["exports", "jQuery", "three", "widgets/driver/track", "widgets/driver/street", "widgets/driver/terrain", "text!widgets/driver/shaders/terrain_def.fs!strip", "text!widgets/driver/shaders/terrain.fs!strip", "text!widgets/driver/shaders/snoise2d.fs!strip"], function(exports, $, THREE, mTrack, mStreet, mTerrain, fsTerrainDef, fsTerrain, fsNoise) {
	var self = exports;

	/**
	* Begins creating a World based on a track profile
	* @param url track profile url
	* @param that driver widget context
	* @param progress deffered object
	*/
	self.createTrackWorld = function(url, that, progress) {
		mTrack.load(url, that, self.trackLoaded, progress);
	};

	/**
	* Starts generating the scene after the track has been loaded
	* @param that driver widget context
	* @param driveProfile generated street path object
	* @param progress deffered object
	*/
	self.trackLoaded = function(that, driveProfile, progress) {
		// assets
		var staticData = that.staticData;

		// Cleanup references to old world (so that GC can use memory)
		progress.notify("Cleaning up old scene");
		var scene = that.scene;
		if (scene) {
			while (scene.children.length > 0) {
				scene.remove(scene.children[scene.children.length - 1]);
			}

			progress.notify("Cleaning up renderer");
			// cleanup without calling render (data needs to be cleaned up before a new scene can be generated)
			that.renderer.initWebGLObjects(scene);
		}

		that.scene = null;
		scene = null;
		scene = new THREE.Scene();

		// Create new world
		that.world = null;
		var world = self.createWorld(driveProfile, that.options, that.staticData, progress);

		progress.notify("Setting up scene");
		scene.add(world.treeMesh);
		scene.add(world.Mesh);
		scene.add(world.street.mesh);

		// Light
		scene.add(that.ambientLight);
		scene.add(that.pointLight);
		scene.add(that.shadowLight);

		// Car
		if (staticData.car && staticData.wheel) {
			
			// Create Car group
			var pc = new THREE.Object3D();

			// Add car
			staticData.car.scale.x = staticData.car.scale.y = staticData.car.scale.z = 0.017;
			pc.add(staticData.car);

			// Add wheels
			staticData.wheel.scale.x = staticData.wheel.scale.y = staticData.wheel.scale.z = 0.0071;
			var wheelFR = new THREE.Object3D(),
				wheelRR = new THREE.Object3D(),
				wheelFL = new THREE.Object3D(),
				wheelRL = new THREE.Object3D();

			wheelFR.add(that.staticData.wheel.clone());
			wheelRR.add(that.staticData.wheel.clone());
			wheelFL.add(that.staticData.wheel.clone());
			wheelRL.add(that.staticData.wheel.clone());

			/**
			* Adds a wrapper Object3D to the passed object
			* used for handling rotations
			* @param object to be wrapped
			* @return wrapped object
			*/
			function wrapObject(object) {
				var o = new THREE.Object3D();
				o.add( object);

				return o;
			};

			/**
			* Creates AxisHelper based on ArrowHelpers
			* @param origin origin of the axis
			* @return forcehelper object
			*/
			function createForceHelper(origin) {
				var mesh = new THREE.Object3D();

			    var forceX = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), origin, 0.5, 0xffaa00);
			    var forceY = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), origin, 0.5, 0xaaff00);
			    var forceZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 0.5, 0x00aaff);

			    mesh.add(forceX);
			    mesh.add(forceY);
			    mesh.add(forceZ);

				return {
					mesh: mesh,
					x: forceX,
					y: forceY,
					z: forceZ
				};
			};

			// Create a force helper for all wheels
			world.fwheelFR = createForceHelper(new THREE.Vector3(-0.5, 0, 0.5));
			world.fwheelFL = createForceHelper(new THREE.Vector3(0.5, 0, 0.5));
			world.fwheelRR = createForceHelper(new THREE.Vector3(-0.5, 0, 0.5));
			world.fwheelRL = createForceHelper(new THREE.Vector3(0.5, 0, 0.5));

			var wheel = 0;

			// Rear right
			wheelRR.children[0].rotation.z = Math.PI;
			wheel = wrapObject(wheelRR);
			wheel.position.y = 0.925;
			wheel.position.x = -0.6;
			wheel.position.z = 0.24;
			wheel.add(world.fwheelRR.mesh);
			pc.add(wheel);

			// Rear left
			wheel = wrapObject(wheelRL);
			wheel.position.y = 0.925;
			wheel.position.x = 0.6;
			wheel.position.z = 0.24;
			wheel.add(world.fwheelRL.mesh);
			pc.add(wheel);

			// Front right (front wheels a bit smaller)
			wheelFR.children[0].scale.x = wheelFR.children[0].scale.y = wheelFR.children[0].scale.z = 0.0068;
			wheelFR.children[0].rotation.z = Math.PI;
			wheel = wrapObject(wheelFR);
			wheel.position.y = -0.925;
			wheel.position.x = -0.55;
			wheel.position.z = 0.25;
			wheel.add(world.fwheelFR.mesh);
			pc.add(wheel);
			
			// Front left
			wheelFL.children[0].scale = wheelFR.children[0].scale;
			wheel = wrapObject(wheelFL);
			wheel.position.y = -0.925;
			wheel.position.x = 0.55;
			wheel.position.z = 0.25;
			wheel.add(world.fwheelFL.mesh);
			pc.add(wheel);
			
			/**
			* Rotates all wheels (speed)
			* @param wheelRotation in radiant
			*/
			world.wheelRotate = function(wheelRotation) {
				wheelFR.children[0].rotation.x = (wheelFR.children[0].rotation.x + wheelRotation) % (2*Math.PI);
				wheelFL.children[0].rotation.x = wheelRR.children[0].rotation.x = wheelRL.children[0].rotation.x = wheelFR.children[0].rotation.x;
			};

			/**
			* Steer front wheels (Rotate z)
			* @param angle steer angle in degrees (-30° - 30°)
			*/
			world.wheelSteer = function(angle) {
				wheelFR.rotation.z = angle * (Math.PI / 180.0);
				wheelFL.rotation.z = wheelFR.rotation.z;
			};

			// Add optional shadows
			if (that.options.shadowMaps) {

				function castShadow(child) {
					child.castShadow = true;
					child.receiveShadow = false; // doesn't look good: true;
				}

				staticData.car.traverse(castShadow);
				wheelFR.traverse(castShadow);
				wheelRR.traverse(castShadow);
				wheelFL.traverse(castShadow);
				wheelRL.traverse(castShadow);
			}

			// Add complete car to scene
			scene.add(pc);

			// remember the details for animation
			world.car = pc;
			world.wheelFR = wheelFR;
			world.wheelRR = wheelRR;
			world.wheelFL = wheelFL;
			world.wheelRL = wheelRL;
		}

		// Camera
		scene.add(that.cameraCar);

		// Linear fog
		scene.fog = new THREE.Fog(0x7E87AF, 100, that.options.cameraFar * 0.9);

		// Skybox
		var materialArray = [
			new THREE.MeshBasicMaterial({
				map: staticData.skyFront,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			}),
			new THREE.MeshBasicMaterial({
				map: staticData.skyBack,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			}),
			new THREE.MeshBasicMaterial({
				map: staticData.skyTop,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			}),
			new THREE.MeshBasicMaterial({
				map: staticData.skyBottom,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			}),
			new THREE.MeshBasicMaterial({
				map: staticData.skyLeft,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			}),
			new THREE.MeshBasicMaterial({
				map: staticData.skyRight,
				fog: false,
				side: THREE.BackSide,
				depthWrite: false
			})
		];

		var skyboxMaterial = new THREE.MeshFaceMaterial(materialArray);
		var skyboxGeom = new THREE.CubeGeometry(that.options.cameraFar, that.options.cameraFar, that.options.cameraFar, 1, 1, 1);

		var skybox = new THREE.Mesh(skyboxGeom, skyboxMaterial);
		skybox.position.y = world.street.geometry.boundingBox.max.y;
		scene.add(skybox);

		// Setup Renderer + FP Camera
		that.camera.position.y = world.street.geometry.boundingBox.max.y;

		// Scene is finished and can be rendered
		that.skybox = skybox;
		that.world = world;
		that.scene = scene;

		progress.notify("Initializing renderer");
		that.renderer.initWebGLObjects(scene);
		progress.notify("Complete!");
		progress.resolve();
	};

	/**
	* Generates the trees for the world
	* @param world world in which to place the trees
	* @param options driver widget options (containing tree count)
	* @param staticData assets (the tree model)
	* @return tree mesh
	*/
	self.generateTrees = function(world, options, staticData) {
		
		// tree model
		var ctree = new THREE.Mesh(staticData.treeGeometry, new THREE.MeshFaceMaterial());
		
		// temp vars
		var placed = false;
		var x = 0, fx= 0,
			z = 0, fz= 0,
			n = 0,
			height = 0;

		// merged randomized tree models
		var allTrees = new THREE.Geometry();

		// place each tree
		for (var i = 0; i < options.treeCount; ++i) {
			placed = false;

			// find a position outside of street area
			while (!placed) {
				ctree.position.x = Math.random() * world.Width + world.WidthOffset;
				ctree.position.z = Math.random() * world.Depth + world.DepthOffset;

				// map to terrain
				fx = (ctree.position.x - world.WidthOffset) * world.WidthScale;
				fz = (ctree.position.z - world.DepthOffset) * world.DepthScale;
				x = ~~ (0.5 + fx);
				z = ~~ (0.5 + fz);

				n = z * (world.WidthS + 1) + x;

				// Trees dont grow on the street, but near it
				if (world.terrainData.weight[n] <= 0.85) {
					placed = true;

					// Biliniear Height interpolation
					var textureData = world.terrainData.data;
					var textureWidth = world.WidthS + 1;
					var textureHeight = world.DepthS;
					var sw = fx;
					var th = fz;
					var isw = sw << 0;
					var ith = th << 0;

					var isw1 = (isw+1) % textureWidth;
					var ith1 = (ith+1) % textureHeight;
					var index00 = (isw + ith * textureWidth);
					var index01 = (isw1 + ith * textureWidth);
					var index10 = (isw + ith1 * textureWidth);
					var index11 = (isw1 + ith1 * textureWidth);
					
					var wx = sw - isw;
					var wy = th - ith;
					var wx1 = 1-wx;
					var wy1 = 1-wy;

					height = (textureData[index00] * wx1 + textureData[index01] * wx) * wy1 + (textureData[index10] * wx1 + textureData[index11] * wx) * wy;
				}
			}

			// Place slightly in the ground
			ctree.position.y = height - 0.1;

			// Randomize scale and rotation
			ctree.scale.x = 0.8 + Math.random() * 0.7;
			ctree.scale.y = 0.8 + Math.random() * 0.7;
			ctree.scale.z = 0.8 + Math.random() * 0.7;

			ctree.rotation.x = 0.15 - 0.3 * Math.random();
			ctree.rotation.y = Math.PI * Math.random();
			ctree.rotation.z = 0.15 - 0.3 * Math.random();

			// merge into the tree mesh
			THREE.GeometryUtils.merge(allTrees, ctree);
		}

		// Setup tree material
		staticData.treeMaterial[0].side = THREE.DoubleSide;
		staticData.treeMaterial[0].overdraw = true;
		staticData.treeMaterial[0].alphaTest = 0.5;

		return new THREE.Mesh(allTrees, new THREE.MeshFaceMaterial(staticData.treeMaterial));
	};

	/**
	* Generate World based on track profile
	* @param driveProfile drive profile object
	* @param options driver widget options
	* @param staticData assets (textures, models)
	*/
	self.createWorld = function(driveProfile, options, staticData, progress) {
		var world = {};
		var planeSegments = 512 * 2; // maximal terrain plane segments
		var rectLength = options.streetHeight,
			rectWidth = options.streetWidth;

		progress.notify("Calculating street");
		world.street = mStreet.createStreet(mTrack.pathFromData(driveProfile, options.pathPrecision), rectLength, rectWidth, options, 0x606060, staticData);

		// get Street bounding box and create street inside of the box
		world.street.geometry.computeBoundingBox();

		// add a border area so terrain doesnt end on side of street
		world.Border = options.terrainBorder;
		world.Width = Math.floor(Math.abs(world.street.geometry.boundingBox.max.x - world.street.geometry.boundingBox.min.x)) + world.Border * 2;
		world.Depth = Math.floor(Math.abs(world.street.geometry.boundingBox.max.z - world.street.geometry.boundingBox.min.z)) + world.Border * 2;
		world.Height = Math.floor(Math.abs(world.street.geometry.boundingBox.max.y - world.street.geometry.boundingBox.min.y));

		// distribute plane segments by creating an aspect ratio for terrain planes
		var worldSum = world.Width + world.Depth;
		world.WidthS = ~~ (planeSegments * (world.Width / worldSum));
		world.WidthScale = world.WidthS / world.Width;
		world.DepthS = ~~ (planeSegments * (world.Depth / worldSum));
		world.DepthScale = world.DepthS / world.Depth;

		// Recalculate so that there is no "hole" under the street
		var minSegmentSize = rectWidth / 1.5;

		// Minimal Segment Size = Street width
		if (minSegmentSize * world.WidthScale > 1) {
			world.WidthScale = 1 / minSegmentSize;
			world.WidthS = ~~ (world.WidthScale * world.Width);
			world.WidthScale = world.WidthS / world.Width;
		}

		// Minimal Segment Size = Street width
		if (minSegmentSize * world.DepthScale > 1) {
			world.DepthScale = 1 / minSegmentSize;
			world.DepthS = ~~ (world.DepthScale * world.Depth);
			world.DepthScale = world.DepthS / world.Depth;
		}

		// Distance of the terrain form the origin
		world.WidthOffset = world.street.geometry.boundingBox.min.x - world.Border;
		world.DepthOffset = world.street.geometry.boundingBox.min.z - world.Border;
		world.HeightS = 0;

		// Create the terrain plane
		progress.notify("Creating terrain");
		world.Geo = new THREE.PlaneGeometry(world.Width, world.Depth, world.WidthS, world.DepthS);
		var worldGeo = world.Geo;

		// rotate plane so it points up
		worldGeo.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

		// Generate the terrain
		progress.notify("Generating terrain around street");
		world.terrainData = mStreet.generateTerrainForStreet(world.street.geometry.vertices,
			world.WidthS + 1,
			world.WidthOffset,
			world.WidthScale,
			world.DepthS + 1,
			world.DepthOffset,
			world.DepthScale,
			world.street.geometry.boundingBox.min.y,
			options);
		var terrainData = world.terrainData;

		// Smooth the terrain around street areas
		progress.notify("Smoothing the terrain");
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, terrainData.weight, 0.5, 2);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, terrainData.weight, 0.01, 4);

		// Generate random terrain
		progress.notify("Generating random terrain");
		var randomData = mTerrain.generateHeight(world.WidthS + 1, world.DepthS + 1, options.worldSeed);

		// Smooth the random terrain
		progress.notify("Smoothing the random terrain");
		var smoothWeight = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.weight, terrainData.weight, 0.5, 2);
		smoothWeight = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, smoothWeight, smoothWeight, 0.01, 5);
		smoothWeight = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, smoothWeight, smoothWeight, 0.01, 7);

		var arBaseHeight = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.9, 15);

		// Now combine the terrains to one and a small step into the steep areas
		progress.notify("Combining the terrains");
		terrainData.data = mTerrain.combineRandomData(terrainData.data, smoothWeight, 0.01, randomData, arBaseHeight);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.01, 3);
		terrainData.data = mTerrain.combineRandomData(terrainData.data, smoothWeight, 0.5, randomData, arBaseHeight);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.05, 3);
		terrainData.data = mTerrain.combineRandomData(terrainData.data, smoothWeight, 0.6, randomData, arBaseHeight);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.7, 4);
		terrainData.data = mTerrain.combineRandomData(terrainData.data, smoothWeight, 0.65, randomData, arBaseHeight);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.7, 1);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.65, 1);

		arBaseHeight = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.9, 10);
		terrainData.data = mTerrain.combineRandomData(terrainData.data, smoothWeight, 0.1, randomData, arBaseHeight);
		terrainData.data = mTerrain.smoothTerrain(world.WidthS + 1, world.DepthS + 1, terrainData.data, smoothWeight, 0.15, 1);

		// now place the heightmap into the plane geometry
		progress.notify("Calculating terrain data");
		for (var i = 0, l = worldGeo.vertices.length; i < l; ++i) {
			worldGeo.vertices[i].y = terrainData.data[i];
		}

		// calculate the normals for ligthining
		worldGeo.computeFaceNormals();
		worldGeo.computeVertexNormals();

		// Set Materials and create Mesh
		if (options.debugWeights) {
			// Show the debug weight texture of the terrain
			var texture = new THREE.Texture(terrainData.debugWeightsTexture, new THREE.UVMapping(), THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);
			texture.needsUpdate = true;

			world.Mesh = new THREE.Mesh(worldGeo, new THREE.MeshBasicMaterial({
				map: texture
			}));
		} else {
			// Settip the terrain shader for blended terrain textures
			var textureGrass = staticData.grassTexture;
			textureGrass.wrapS = textureGrass.wrapT = THREE.RepeatWrapping;
			textureGrass.repeat.set(world.Width * 0.15, world.Depth * 0.15);

			var textureGrass2 = staticData.grass2Texture;
			textureGrass2.wrapS = textureGrass2.wrapT = THREE.RepeatWrapping;

			var textureGrass3 = staticData.grass3Texture;
			textureGrass3.wrapS = textureGrass3.wrapT = THREE.RepeatWrapping;

			var textureRock = staticData.rockTexture;
			textureRock.wrapS = textureRock.wrapT = THREE.RepeatWrapping;

			var textureRock2 = staticData.rock2Texture;
			textureRock2.wrapS = textureRock2.wrapT = THREE.RepeatWrapping;

			var textureCloudShadow = staticData.cloudShadow;
			textureCloudShadow.wrapS = textureCloudShadow.wrapT = THREE.RepeatWrapping;
			
			// Use the lamber shader as basis and extend it
			var unis = THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms);

			// Add all textures
			unis["tGrass"] = {
						type: "t",
						value: textureGrass
			};

			unis["tGrass2"] = {
						type: "t",
						value: textureGrass2
			};

			unis["tGrass3"] = {
						type: "t",
						value: textureGrass3
			};

			unis["tRock"] = {
						type: "t",
						value: textureRock
			};

			unis["tRock2"] = {
						type: "t",
						value: textureRock2
			};

			unis["tCloudShadow"] = {
						type: "t",
						value: textureCloudShadow
			};

			// Add the texture scale (calculated based on terrain size and aspect ratio)
			unis["offsetRepeat"] = { type: "v4", value: new THREE.Vector4( 0, 0, textureGrass.repeat.x, textureGrass.repeat.y ) };
			
			// Diffuse color not used atm
			//unis["diffuse"] = { type: "c", value: new THREE.Color( 0x209920 ) };
			//unis["diffuse"] = { type: "c", value: new THREE.Color( 0x808080 ) };

			// Add a time that will be incremented later (cloud animation)
			world.time = unis["time"] = {
			    type : 'f',
			    value : 0
			};

			// Create the terrain fragment shader based on lambertian shader
			var fs = fsTerrainDef + fsNoise + THREE.ShaderLib.lambert.fragmentShader.replace(THREE.ShaderChunk.map_fragment, fsTerrain);

			// Create the terrain vertex shader based on lambertian shader but adding interpolated normals
			var vs = THREE.ShaderLib.lambert.vertexShader;
			vs = "varying vec3 vNormal;\n" + vs;
			vs = vs.replace("void main() {", "void main() {\nvNormal = normal;\n");
			
			// Create the mesh and terrain material
			world.Mesh = new THREE.Mesh(
				worldGeo,
				new THREE.ShaderMaterial({
				uniforms: unis,
				lights: true,
				fog: true,
				defines: {"USE_MAP": true}, // so that UVs will be generated
				vertexShader: vs,
				fragmentShader: fs
			}));

			/*
			// deprecated: simple lambertian with one texture
			world.Mesh = THREE.SceneUtils.createMultiMaterialObject(worldGeo, [
				new THREE.MeshLambertMaterial({
					color: 0x209920,
					map: textureGrass
				})
			]);
			*/

			// Optional add car shadow onto the terrain
			if (options.shadowMaps) {
				world.Mesh.traverse(function(child) {
					child.castShadow = false;
					child.receiveShadow = true;
				});
			}
		}

		// Now place the world mesh into the scene
		world.Mesh.position.x = (world.Width / 2) + world.street.geometry.boundingBox.min.x - world.Border;
		world.Mesh.position.z = (world.Depth / 2) + world.street.geometry.boundingBox.min.z - world.Border;

		// starts at half of street height so the street is a little bit inside of the terrain
		world.Mesh.position.y = options.streetHeight / 2;

		// Generate the trees
		progress.notify("Planting trees");
		world.treeMesh = self.generateTrees(world, options, staticData);

		return world;
	};

});