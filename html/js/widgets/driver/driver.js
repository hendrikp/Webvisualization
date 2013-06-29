/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * 3D-Driver Widget
 * requires a track profile 
 * @module driver
 */
define(["jQuery", "wv/propertyHandler", "three", "widgets/driver/world", "three_collada", "three_fp_controls"], function($, propertyHandler, THREE, mWorld) {
	(function($, THREE, undefined) {
		$.widget("wv.driver", {
			options: {
				value: 0, // distance driven
				label: "",

				// Viewport resolution (resizable)
				width: 640,
				height: 480,

				// Camera
				fov: 50, // degree
				cameraFar: 5000, // m
				selectedCamera: "car", // free, car, insidecar, orbitcar
				cameraOffset: 15.0, // m
				cameraOffsetHeight: 3.0, // n
				cameraOrbitAngle: 0.0, // degree
				cameraSeatOffset: new THREE.Vector3(0.17, 0.34, 0.85), // m

				// Street
				radius: 0.5, // m
				streetHeight: 1, // m
				streetWidth: 6.5, // m

				// Path
				pathSteps: 10000, // n
				pathClosed: false, // partially supported (normals are matched)
				pathPrecision: 1, // Set >1 if n points should be generated between waypoints
				pathBrushRadius: 120, // m

				// World
				worldSeed: 2, // random seed 0-254
				treeCount: 50000, // n (~60000 is maximum, depends on tree model)

				terrainBorderOffset: 20, // m
				terrainBorder: 200, // m

				// Effects
				shadowMaps: true,

				// Debug Options
				debugShadows: false,
				debugWeights: false,
				debugWaypoints: false,
				debugFrenet: false,

				// Pseudo Simulation (required)
				speedCloud: 60, // s
				wheelRPM: 1000.0, // 1/min
				wheelAngle: 0.0, // degree (-30° - 30°)
				carLookAt: 30.0, // m (oversteering > 3 / understeering < 0)
				trackPath: "js/widgets/driver/tracks/nuerburgring_gps.json",
				// "js/widgets/driver/tracks/hockenheim_icr.json"
				// "js/widgets/driver/tracks/testbridge_steerangle.json"
				// "js/widgets/driver/tracks/nuerburgring_gps.json"

				// Wheel data
				wheelForceShow: true, // when false forces are not updated
				wheelFRx: 0.0, // front right
				wheelFRy: 0.0,
				wheelFRz: 0.0,

				wheelFLx: 0.0, // front left
				wheelFLy: 0.0,
				wheelFLz: 0.0,

				wheelRRx: 0.0, // rear right
				wheelRRy: 0.0,
				wheelRRz: 0.0,

				wheelRLx: 0.0, // rear left
				wheelRLy: 0.0,
				wheelRLz: 0.0,

				// Pseudo Simulation
				psimActive: true,
				psimSpeed: 120.0 // km/h
			},

			_properties: {
				"Value": [{
						uid: "uidValue",
						text: "Distance",
					}, {
						uid: "uidWheelRPM",
						text: "Wheel RPM",
						option: "wheelRPM",
						importance: 10
					}, {
						uid: "uidWheelAngle",
						text: "Wheel Angle",
						option: "wheelAngle",
						importance: 11
					}
				],
				"Wheel Forces": [{
						uid: "uidWheelForceShow",
						text: "Show",
						option: "wheelForceShow",
						importance: 0
					}, {
						uid: "uidFRx",
						text: "FRx",
						option: "wheelFRx",
						importance: 1
					}, {
						uid: "uidFRy",
						text: "FRy",
						option: "wheelFRy",
						importance: 2
					}, {
						uid: "uidFRz",
						text: "FRz",
						option: "wheelFRz",
						importance: 3
					}, {
						uid: "uidFLx",
						text: "FLx",
						option: "wheelFLx",
						importance: 4
					}, {
						uid: "uidFLy",
						text: "FLy",
						option: "wheelFLy",
						importance: 5
					}, {
						uid: "uidFLz",
						text: "FLz",
						option: "wheelFLz",
						importance: 6
					}, {
						uid: "uidRRx",
						text: "RRx",
						option: "wheelRRx",
						importance: 7
					}, {
						uid: "uidRRy",
						text: "RRy",
						option: "wheelRRy",
						importance: 8
					}, {
						uid: "uidRRz",
						text: "RRz",
						option: "wheelRRz",
						importance: 9
					}, {
						uid: "uidRLx",
						text: "RLx",
						option: "wheelRLx",
						importance: 10
					}, {
						uid: "uidRLy",
						text: "RLy",
						option: "wheelRLy",
						importance: 11
					}, {
						uid: "uidRLz",
						text: "RLz",
						option: "wheelRLz",
						importance: 12
					}
				],
				"Placement": [{
						uid: "uidWidth",
						def: 640
					}, {
						uid: "uidHeight",
						def: 480
					}
				],
				"Track": [{
						uid: "uidTrackPath",
						text: "Path",
						option: "trackPath",
						importance: 10
					}, {
						uid: "uidStreetWidth",
						text: "Street Width",
						option: "streetWidth",
						importance: 11
					}, {
						uid: "uidTrackFlatten Radius",
						text: "Flatten Radius",
						option: "pathBrushRadius",
						importance: 12
					}
				],
				"World": [{
						uid: "uidWorldSeed",
						text: "World Seed",
						option: "worldSeed",
						importance: 1
					}, {
						uid: "uidTreeCount",
						text: "Tree Count",
						option: "treeCount",
						importance: 10
					}
				],
				"Camera": [{
						uid: "uidCameraSelection",
						text: "Camera",
						option: "selectedCamera",
						importance: 20
					}, {
						uid: "uidCameraCarDistance",
						text: "Car Distance",
						option: "cameraOffset",
						importance: 21
					}, {
						uid: "uidCameraHeight",
						text: "Height",
						option: "cameraOffsetHeight",
						importance: 22
					}, {
						uid: "uidCameraOrbitAngle",
						text: "Orbit Angle",
						option: "cameraOrbitAngle",
						importance: 23
					}
				],
				"Debug": [{
						uid: "uidDebugSimulation",
						text: "Simulation",
						option: "psimActive",
						importance: 20
					}, {
						uid: "uidDebugShadows",
						text: "Shadow",
						option: "debugShadows",
						importance: 21
					}, {
						uid: "uidDebugWeights",
						text: "Street Position",
						option: "debugWeights",
						importance: 22
					}, {
						uid: "uidDebugWaypoints",
						text: "Waypoints",
						option: "debugWaypoints",
						importance: 23
					}, {
						uid: "uidDebugFrenet",
						text: "Frenet",
						option: "debugFrenet",
						importance: 24
					}
				]
			},

			properties: propertyHandler.propFunc,
			binding: propertyHandler.bindFunc,

			/**
			* called on creation by jQuery
			*/
			_create: function() {
				var that = this;

				that.sceneFinished = $.Deferred(); // Scene promise/deferred
				that.resourcesLoaded = false;
				that.sceneDirty = true; // scene needs to be regenerated

				// reset container
				this.element.html("");

				// create progressbar
				this.progressDisplay = $("<div/>").css({
					width: '100%',
					height: '100%',
					top: '0px',
					left: '0px',
					position: 'absolute'
				}).appendTo(this.element);

				// create an overlay based on jQuery dialog modal
				this.progressOverlay = $("<div/>", {
					class: "ui-widget-overlay ui-front"
				}).css("position", "relative").appendTo(this.progressDisplay);

				this.progressDialog = $("<div/>", {
					class: "ui-dialog ui-widget ui-widget-content ui-corner-all ui-front"
				}).css("width", "300px").appendTo(this.progressDisplay);

				this.progressDialogTitle = $("<div/>", {
					class: "ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix"
				}).appendTo(this.progressDialog);

				this.progressTitle = $("<span/>", {
					class: "ui-dialog-title"
				}).appendTo(this.progressDialogTitle)
					.text("Please wait");

				this.progressText = $("<p/>")
					.appendTo(this.progressDialog)
					.text("Loading resources");

				this.progressBar = $("<div/>").appendTo(this.progressDialog).progressbar({
					value: false
				});

				// center of element
				this.progressDialog.position({
					my: "center",
					at: "center",
					of: this.element
				});
			},

			/**
			* Widget reinitialization (after create) called by jQuery
			*/
			_init: function() {
				var that = this;

				// Setup Renderer
				that.renderer = new THREE.WebGLRenderer({
					antialias: true
				});
				that.renderer.setSize(that.element.width(), that.element.height());

				// pos relative in element
				that.renderElement = $(that.renderer.domElement)
				that.renderElement.css({
					top: '0px',
					left: '0px',
					position: 'absolute'
				});

				// add to DOM
				that.element.append(that.renderElement);

				// Look At Matrix of car
				this.matLookAt = new THREE.Matrix4();

				// Car Camera
				this.cameraCar = new THREE.PerspectiveCamera(this.options.fov, that.element.width() / that.element.height(), 0.1, this.options.cameraFar);

				// First Person Camera
				this.camera = new THREE.PerspectiveCamera(this.options.fov, that.element.width() / that.element.height(), 0.1, this.options.cameraFar);
				this.clock = new THREE.Clock();
				this.controls = new THREE.FirstPersonControls(this.camera, that.renderer.domElement, true);
				this.controls.movementSpeed = 100;
				this.controls.lookSpeed = 0.1;

				// Start loading the required data
				var staticData = {};
				that.staticData = staticData;

				/**
				* JSON model loader
				* @param target data container
				* @param nameg geometry name
				* @param namem material name
				* @param url url to load
				* @return jQuery deferred object
				*/
				function loadJSON(target, nameg, namem, url) {
					var self = {};

					if (target.countTotal === undefined) {
						target.countTotal = 0;
						target.countLoaded = 0;
					} else target.countTotal++;

					self.target = target;
					self.nameg = nameg;
					self.namem = namem;
					self.url = url;

					self.defer = $.Deferred();
					self.loader = new THREE.JSONLoader();
					self.progressLeft = 1.0;

					self.loader.load(self.url, function(geometry, materials) {
						self.target[self.nameg] = geometry;
						self.target[self.namem] = materials;
						self.target.countLoaded += 1;
						self.defer.notify();
						self.defer.resolve();
					});

					return self.defer;
				};

				/**
				* texture loader
				* @param target data container
				* @param name texture name
				* @param url url to load
				* @return jQuery deferred object
				*/
				function loadTexture(target, name, url) {
					var self = {};

					if (target.countTotal === undefined) {
						target.countTotal = 0;
						target.countLoaded = 0;
					} else target.countTotal++;

					self.target = target;
					self.name = name;
					self.url = url;

					self.defer = $.Deferred();
					self.loader = new THREE.TextureLoader();
					self.progressLeft = 1.0;

					self.loader.addEventListener('load', function(event) {
						self.target[self.name] = event.content;
						self.target.countLoaded += 1;
						self.defer.notify();
						self.defer.resolve();
					});

					self.loader.addEventListener('error', function(event) {
						self.defer.reject();
					});

					self.loader.load(self.url);

					return self.defer;
				}

				/**
				* collada loader
				* @param target data container
				* @param name object name
				* @param url url to load
				* @return jQuery deferred object
				*/
				function loadCollada(target, name, url) {
					var self = {};

					if (target.countTotal === undefined) {
						target.countTotal = 0;
						target.countLoaded = 0;
					} else target.countTotal++;

					self.target = target;
					self.name = name;
					self.url = url;

					self.defer = $.Deferred();
					self.loader = new THREE.ColladaLoader();
					self.progressLeft = 1.0;

					self.loader.load(url, function(collada) {
						self.target[self.name] = collada.scene;
						self.target.countLoaded += 1;
						self.defer.notify();
						self.defer.resolve();
					});

					return self.defer;
				};

				// Progress is dependend on all those loaders / files
				$.when(
					loadJSON(staticData, 'treeGeometry', 'treeMaterial', 'js/widgets/driver/models/tree/quercus_A_packed_v1_lod2.json'),
					loadCollada(staticData, 'car', 'js/widgets/driver/models/porsche/models/sport_car.dae'),
					loadCollada(staticData, 'wheel', 'js/widgets/driver/models/porsche/models/wheel.dae'),
					loadTexture(staticData, 'skyFront', 'js/widgets/driver/textures/field_front.jpg'),
					loadTexture(staticData, 'skyBack', 'js/widgets/driver/textures/field_back.jpg'),
					loadTexture(staticData, 'skyTop', 'js/widgets/driver/textures/field_top.jpg'),
					loadTexture(staticData, 'skyBottom', 'js/widgets/driver/textures/field_bot.jpg'),
					loadTexture(staticData, 'skyLeft', 'js/widgets/driver/textures/field_left.jpg'),
					loadTexture(staticData, 'skyRight', 'js/widgets/driver/textures/field_right.jpg'),
					loadTexture(staticData, 'roadTexture', 'js/widgets/driver/textures/road.jpg'),
					loadTexture(staticData, 'rockTexture', 'js/widgets/driver/textures/rock.jpg'),
					loadTexture(staticData, 'rock2Texture', 'js/widgets/driver/textures/rock2.jpg'),
					loadTexture(staticData, 'grassTexture', 'js/widgets/driver/textures/grass.jpg'),
					loadTexture(staticData, 'grass2Texture', 'js/widgets/driver/textures/grass2.jpg'),
					loadTexture(staticData, 'grass3Texture', 'js/widgets/driver/textures/grass3.jpg'),
					loadTexture(staticData, 'cloudShadow', 'js/widgets/driver/textures/cloud_shadow.jpg')).then(function() {
					// All data loaded
					that.resourcesLoaded = true;
				}, function() {
					// Error
					that.progressDisplay.show();
					that.progressText.text("Error while loading data");
					that.progressBar.hide();
				}, function() {
					// Progress
					that.progressDisplay.show();
					that.progressBar.show();
					that.progressBar.progressbar("option", "value", 100 * (staticData.countLoaded / staticData.countTotal));
				});
			},

			/**
			* Cleanup when widget is deleted (called by jQuery)
			* 3D-Driver is very memory intensive so clean up WebGL objects and world object this way
			*/
			_destroy: function() {
				var that = this;

				// Cleanup references to old world (so that GC can use memory)
				var scene = that.scene;
				if (scene) {
					// in webgl all scene children have no own children
					while (scene.children.length > 0) {
						// remove starting from back
						scene.remove(scene.children[scene.children.length - 1]);
					}

					// cleanup without calling render (data needs to be cleaned up before a new scene can be generated)
					that.renderer.initWebGLObjects(scene);
					that._renderFrame();
				}

				that.sceneFinished = null;
				scene = null;
				that.scene = null;
				that.renderer = null;
				that.world = null;
			},

			/**
			* Set option/values / refresh specific data
			*/
			_setOption: function(key, value) {
				var that = this;
				that.options[key] = value;

				// if resources are loaded begin processing events
				if (that.resourcesLoaded) {
					switch (key) {
						case "value": // new distance received
							if (that.sceneDirty) {
								// if settings changed scene regeneration is required
								that.sceneDirty = false;

								// wait on scene generation
								$.when(that.sceneFinished).then(function() {
									that.progressDisplay.hide();
								}, function(message) {
									that.progressText.text("Error while calcuating")
									that.progressBar.hide();
								}, function(message) {
									that.progressText.text(message)
								});

								// regenerate scene
								that._generateScene();
							}

							// render a new frame since the car moved
							that._renderFrame();
							break;

						// properties that dont cause scene regeneration
						case "psimActive":
						case "cameraOrbitAngle":
						case "psimCameraOffset":
						case "selectedCamera":
						case "cameraOffset":
						case "cameraOffsetHeight":
						case "wheelRPM":
						case "wheelAngle":
						case "wheelForceShow":
						case "wheelFRx":
						case "wheelFRy":
						case "wheelFRz":
						case "wheelFLx":
						case "wheelFLy":
						case "wheelFLz":
						case "wheelRRx":
						case "wheelRRy":
						case "wheelRRz":
						case "wheelRLx":
						case "wheelRLy":
						case "wheelRLz":
							break;

						// all other settings require scene regeneration
						default:
							if (!that.sceneDirty) {
								that.sceneDirty = true;

								// new promise object
								that.sceneFinished = $.Deferred();

								// indicate that regeneration is required
								that.progressDisplay.show();
								that.progressBar.hide();
								that.progressTitle.text("Scene property changed");
								that.progressText.text("Scene regeneration next frame");
							}

							break;
					}
				}
			},

			/**
			* Procedural generation of a scene based on current options
			*/
			_generateScene: function() {
				var that = this;

				// optional shadow light
				if (that.options.shadowMaps) {
					var shadowLight = new THREE.DirectionalLight(0xffffff);
					shadowLight.position.set(30, 30, 30);

					shadowLight.castShadow = true;
					shadowLight.onlyShadow = true;

					shadowLight.shadowDarkness = 0.7;
					shadowLight.shadowCameraVisible = that.options.debugShadows; // only for debugging
					shadowLight.shadowCameraNear = 10;
					shadowLight.shadowCameraFar = 60;
					shadowLight.shadowCameraRight = 3;
					shadowLight.shadowCameraLeft = -3;
					shadowLight.shadowCameraTop = 3;
					shadowLight.shadowCameraBottom = -3;

					that.shadowLight = shadowLight;

					// renderer options
					that.renderer.shadowMapEnabled = true;
					that.renderer.shadowMapType = THREE.PCFShadowMap;
				} else {
					that.shadowLight = null;
					that.renderer.shadowMapEnabled = false;
				}

				// directional light from top
				that.pointLight = new THREE.DirectionalLight(0xffffff, 0.8);
				that.pointLight.position.set(100, 100, 100);
				that.pointLight.target.position.set(0, 0, 0);

				// ambience
				that.ambientLight = new THREE.AmbientLight(0x505050);

				// Show progress while generating scene (not fully possible)
				that.progressDisplay.show();
				that.progressBar.show();
				that.progressBar.progressbar("option", "value", false);
				that.progressTitle.text("Please Wait");
				that.progressText.text("Generating Scene");

				// download the track and generate world around it
				mWorld.createTrackWorld(that.options.trackPath, that, that.sceneFinished);
			},

			/**
			* Refresh all displayed data
			*/
			refresh: function() {
				this.resize({
						width: this.element.width(),
						height: this.element.height()
					});
			},

			/**
			* Resize event
			*/
			resize: function(size) {
				var that = this;

				// renderer size
				that.renderer.setSize(size.width, size.height);

				// camera ARs
				that.cameraCar.setViewOffset(size.width, size.height, 0, 0, size.width, size.height);
				that.camera.setViewOffset(size.width, size.height, 0, 0, size.width, size.height);
				
				// camera controls
				that.controls.handleResize();
			},

			/**
			* Render a new frame with the current data
			*/
			_renderFrame: function() {
				var that = this;

				// Measure time passed since last frame
				that.currentTime = new Date().getTime() / 1000.0;
				that.timePassed = 0.0;
				if( that.lastTime !== undefined ) {
					that.timePassed = that.currentTime - that.lastTime;
				}
				that.lastTime = that.currentTime;

				// Everything is now loaded/generated
				if (that.sceneFinished.state() === "resolved") {

					// Shortcuts
					var street = that.world.street;
					var car = that.world.car;

					var cameraAxis = new THREE.Vector3();

					// Calculate relative distance on strack
					var trackPos = 0;
					var trackLength = 0;

					// Simulate movement
					if (that.options.psimActive) {
						// estimate pos based on time and constant speed
						trackPos = (Date.now() / 1000.0) * (that.options.psimSpeed * 0.277778);
					} else {
						// use real distance
						trackPos = that.options.value;
					}
					trackLength = street.length;

					// Animate Camera (Value between 0-1)
					var trackDistance = (trackPos % trackLength) / trackLength;

					/**
					* Determines world pos and normal on track
					* @param trackDistancePer position on track 0-1
					* @param offset vector to add to position
					* @param path street spline
					* @param frames street frenet frames
					* @param[out] normal direction
					*/
					function getPosAt(trackDistancePer, offset, path, frames, normal) {
						var binormal = new THREE.Vector3();
						var pos = path.getPointAt(trackDistancePer);

						// interpolated normal
						var segments = frames.tangents.length;
						var index = trackDistancePer * segments;
						var indexInt = Math.floor(index);
						var indexNext = (indexInt + 1) % segments;

						binormal.subVectors(frames.binormals[indexNext], frames.binormals[indexInt]);
						binormal.multiplyScalar(index - indexInt).add(frames.binormals[indexInt]);

						// offset to binormal
						var dir = path.getTangentAt(trackDistancePer);
						normal.copy(binormal).cross(dir);
						pos.sub(normal.clone().multiplyScalar(offset));

						return pos;
					}

					// Set shader time
					if (that.world.time !== undefined && that.world.time.value !== undefined) {
						that.world.time.value = (that.currentTime % that.options.speedCloud) / that.options.speedCloud;
					}

					// Set car camera position
					var carCameraDistance = trackDistance - that.options.cameraOffset / trackLength;
					if (carCameraDistance < 0.0)
						carCameraDistance = 0.0;

					that.cameraCar.position = getPosAt(carCameraDistance, that.options.radius, street.path, street.frames, cameraAxis);
					that.cameraCar.position.y += that.options.cameraOffsetHeight;

					// default camera is car
					var currentCamera = that.camera;

					if (car) {
						// Refresh wheel forces
						if(that.options.wheelForceShow)
						{
							that.world.fwheelFR.x.setLength(that.options.wheelFRx);
							that.world.fwheelFR.y.setLength(that.options.wheelFRy);
							that.world.fwheelFR.z.setLength(that.options.wheelFRz);

							that.world.fwheelFL.x.setLength(that.options.wheelFLx);
							that.world.fwheelFL.y.setLength(that.options.wheelFLy);
							that.world.fwheelFL.z.setLength(that.options.wheelFLz);

							that.world.fwheelRR.x.setLength(that.options.wheelRRx);
							that.world.fwheelRR.y.setLength(that.options.wheelRRy);
							that.world.fwheelRR.z.setLength(that.options.wheelRRz);

							that.world.fwheelRL.x.setLength(that.options.wheelRLx);
							that.world.fwheelRL.y.setLength(that.options.wheelRLy);
							that.world.fwheelRL.z.setLength(that.options.wheelRLz);
						}

						// Animate wheels

						// rotate wheels (RPM to rad/sec)
						var wheelRadSec = that.options.wheelRPM / (60 / (2*Math.PI));
						that.world.wheelRotate(that.timePassed * wheelRadSec);

						// steer wheels
						that.world.wheelSteer(that.options.wheelAngle);

						// Animate/set car position
						car.position = getPosAt(trackDistance, that.options.radius, street.path, street.frames, cameraAxis);

						// Determine Position the car should point to (understeer/oversteer)
						var lookAtDistance = trackDistance + that.options.carLookAt / trackLength;
						if (lookAtDistance <= 1.0) {
							// If data is available

							// get point ahead in path
							var lookAtPosition = street.path.getPointAt(lookAtDistance);

							// get look at matrix
							that.matLookAt.lookAt(car.position, lookAtPosition, cameraAxis);

							// correct rotated car model
							var matRot = new THREE.Matrix4();
							matRot.makeRotationFromEuler(new THREE.Vector3(-Math.PI / 2, Math.PI, Math.PI), 'XYZ');

							// Set car rotation (lookat*correction matrix)
							car.rotation.setEulerFromRotationMatrix(that.matLookAt.clone().multiply(matRot), that.cameraCar.eulerOrder);
						}

						// Set car camera rotation
						that.cameraCar.lookAt(car.position);

						// move shadow frustum with car
						if (that.options.shadowMaps) {
							that.shadowLight.position = car.position.clone().add(new THREE.Vector3(30, 30, 30));
							that.shadowLight.target.position = car.position.clone();
						}

						// Handle Cameras
						if (that.options.selectedCamera == "car") {
							currentCamera = that.cameraCar;

						} else if (that.options.selectedCamera == "insidecar") {
							var campos = that.options.cameraSeatOffset.clone();

							// refresh world matrix of car
							car.updateMatrixWorld();
							
							// local seat position to world position
							campos.applyMatrix4(car.matrixWorld);

							// set as camera position
							that.camera.position = campos;

							// now use corrected lookat matrix for direction
							var matRot = new THREE.Matrix4();
							matRot.makeRotationFromEuler(new THREE.Vector3(0, 0, Math.PI), 'XYZ');
							that.camera.rotation.setEulerFromRotationMatrix(that.matLookAt.clone().multiply(matRot), that.camera.eulerOrder);

						} else if (that.options.selectedCamera == "orbitcar") {
							var matRot = new THREE.Matrix4();

							// local offset to corrected local offset (rotated)
							var campos = new THREE.Vector3(0, that.options.cameraOffsetHeight, -that.options.cameraOffset);
							matRot.makeRotationFromEuler(new THREE.Vector3(-Math.PI / 2, Math.PI, Math.PI), 'XYZ');
							campos.applyMatrix4(matRot);

							// rotate position (,,angle)
							matRot.makeRotationFromEuler(new THREE.Vector3(0, 0, that.options.cameraOrbitAngle*(Math.PI/180)), 'XYZ');
							campos.applyMatrix4(matRot);

							// first transform offset scale for car model
							campos.multiplyScalar(1.0 / car.scale.x);
							
							// transform local to world coordinates
							car.updateMatrixWorld();

							// refresh world matrix of car
							campos.applyMatrix4(car.matrixWorld);

							// Set position
							that.camera.position = campos;

							// Set rotation
							cameraAxis.y *= -1;
							matRot.lookAt(campos, car.position, cameraAxis);
							that.camera.rotation.setEulerFromRotationMatrix(matRot, that.camera.eulerOrder);

						} else {
							// Handle controller and camera
							that.controls.update(that.clock.getDelta());
						}
					}

					// Set skybox to camera
					that.skybox.position.x = currentCamera.position.x;
					that.skybox.position.z = currentCamera.position.z;

					// Render scene (will trigger requestanimationframe)
					that.renderer.render(that.scene, currentCamera);
				}
			}
		});
	})($, THREE);
});