/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals require, requirejs */
/*jslint white: false */

/**
 * Application / Project module and dependency listing
 * @module main
 */

requirejs.config({
   // urlArgs: "bust=" + new Date().getTime(), // enforces disabled cache for modules
    paths: {
        'jQuery': 'lib/jquery/jquery',
        'jQueryUi': 'lib/jquery/jquery-ui-1.10.3.custom',
        'd3': 'lib/d3/d3',
        'three': 'lib/three/three',
        'three_collada': 'lib/three/ColladaLoader',
        'three_fp_controls': 'lib/three/FirstPersonControls',
        'three_noise': 'lib/three/ImprovedNoise',
        'coherent': 'lib/coherent/coherent', // currently not in use
        'stream': 'wv/cats/stream'
    },
    shim: {
        'jQuery': {
            exports: 'jQuery'
        },
        'jQueryUi': {
            deps: ['jQuery']
        },
        'd3': {
            exports: 'd3'
        },
        'three': {
            exports: 'THREE'
        },
        'three_collada': {
            deps: ['three']
        },
        'three_fp_controls': {
            deps: ['three']
        },
        'three_noise': {
            exports: 'ImprovedNoise'
        },
        'coherent': {
            exports: 'engine'
        }
    }
});

// this will load the application and all dependencies
require(["app"], function() {});