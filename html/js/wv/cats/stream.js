/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define, setInterval */

/**
 * Stream implementation
 * specific for cats and mongoose cats_interface
 * @module stream
 */
define(["exports", "jQuery"], function(exports, $) {

    /**
    * create a new stream for a binding namespace
    * @param binding binding namespace
    * @class
    */
    exports.createStream = function(binding) {
        var self = {};

        // Streaming
        self.streamID = 0;
        self.idResolver = [];
        self.nameResolver = {};
        self.binding = binding;

        // Packet Ordering / Latency
        self.lastServerTimestamp = 0;
        self.lastClientTimestamp = 0;
        self.currentClientTimestamp = 0;
        self.currentClientTimeout = 0;

        // Latency Handling
        self.currentServerRoundTrip = self.binding.app.nAnimationTime;
        self.currentClientRoundTrip = self.binding.app.nAnimationTime;
        self.currentLatency = self.binding.app.nAnimationTime / 2;

        self.nLatencySamples = 1 + Math.round(2 * (1000 / self.binding.app.nAnimationTime));

        self.nMeanSum = self.currentLatency;
        self.nMeanCount = 1;
        self.meanLatency = self.nMeanSum / self.nMeanCount;

        /**
        * Offline data generation
        * generate random data
        * @deprecated
        */
        self._simulateData = function() {
            var tests = [0];

            for (var i = 0; i < nSimValues; ++i) {
                tests[i] = Math.round(Math.random() * 270) - 135;
            }

            self._processStreamData(tests);
        };

        /**
        * process received data if successfully received
        * @member
        */
        self._processStreamData = function(json) {
            if (json === null) return;
            self.binding.publishFrame(self.idResolver, json);
        };

        /**
        * handle the latency calculations by using the frame timestamps
        * @member
        */
        self._calculateLatency = function(data) {
            // calculate round trip client
            if (self.lastClientTimestamp > 0) self.currentClientRoundTrip = new Date().getTime() - self.lastClientTimestamp - self.binding.app.nAnimationTime; // Client -> Server -> Client

            // calculate round trip server
            if (self.lastServerTimestamp > 0) self.currentServerRoundTrip = data.sts - self.lastServerTimestamp - self.binding.app.nAnimationTime; // Server -> Client -> Server

            // aproximate latency based on both roundtrip times
            if (self.currentClientRoundTrip < 0) self.currentClientRoundTrip = 0;
            if (self.currentServerRoundTrip < 0) self.currentServerRoundTrip = 0;
            self.currentLatency = (self.currentServerRoundTrip + self.currentClientRoundTrip) / 4;

            // calculate moving average
            if (self.nMeanCount >= self.nLatencySamples) {
                self.nMeanSum -= self.meanLatency;
            } else {
                ++self.nMeanCount;
            }
            self.nMeanSum += self.currentLatency;
            self.meanLatency = self.nMeanSum / self.nMeanCount;
        };

        /**
        * start the stream
        * @member
        */
        self.startStreaming = function() {
            // Data Simulation [deprecated]
            if (self.binding.app.bStandaloneSimulation) {
                self.binding.app.bInterpolate = true;

                // Only when really there
                self.binding.app.setUpdateRoutine(function() {
                    self._simulateData();
                });

                // Shared Memory / IPC C++ Binding [deprecated]
            } else if (self.binding.app.bUseCoherent) {
                self.binding.app.bInterpolate = false;
                engine.on("receiveCatsData", function(data) {
                    self._processStreamData(data);
                });
                // AJAX Streaming
            } else {
                self.binding.app.bInterpolate = false;

                self.binding.app.setUpdateRoutine(function() {
                    self.loadStream();
                });
            }
        };

        /**
        * Handles the successful creation of a stream
        * will refresh binding and name/id resolvers
        * @member
        */
        self._createHandler = function(json) {
            if (json !== null) {
                self.streamID = json.sid;
                self.idResolver = json.d;
                self.nameResolver = {};
                self.autoComplete = [];

                // fill name resolver and auto complete
                for (var i = 0, iend = self.idResolver.length; i < iend; ++i) {
                    var elem = self.idResolver[i];
                    if (typeof(elem) !== 'undefined') {
                        elem.label = '$(' + elem.n + ')';
                        self.nameResolver[elem.n] = elem;
                        self.autoComplete.push(elem);
                    }
                }

                self.binding.setStream(self);
            }
        };

        /**
        * Handles errors during stream creation
        * @member
        */
        self._createErrorHandler = function(jqXHR, textStatus, errorThrown) {
            self.streamID = 0; // new stream required
        };

        /**
        * Handles specific errors during stream creation
        */
        self._createStatusCodeHandler = {
            // Service Unavailable
            503: function() {
                self.streamID = 0; // new stream required, no test program loaded
            }
        };

        /**
        * Handles receiving a data frame from the stream
        */
        self._streamHandler = function(data) {
            if (data === null) return;

            // Only process current data
            if (data.sts >= self.lastServerTimestamp) {
                // Latency
                self._calculateLatency(data);

                // store timinig information
                self.lastServerTimestamp = data.sts;
                self.lastClientTimestamp = data.lcts;

                // now process
                self._processStreamData(data.d[0]);
            }
        };

        /**
        * Handles errors during receiving a data frame
        */
        self._streamErrorHandler = function(jqXHR, textStatus, errorThrown) {

        };

        /**
        * Handles specific errors during receiving a data frame
        */
        self._streamStatusCodeHandler = {
            // Forbidden
            403: function() {
                self.streamID = 0; // new stream required
            }
        };

        /**
        * Checks if request should be send before requesting next data frame
        */
        self._streamBeforeSendHandler = function(jqXHR, settings) {
            // Only send out latest request
            if (self.currentClientTimestamp < settings.clientRequestTime) {
                self.currentClientTimestamp = settings.clientRequestTime;
                self.currentClientTimeout = self.currentClientTimestamp + self.binding.app.nRequestTimeout;
            } else return false;

            return true;
        };

        /**
        * cyclic Load/create stream callback
        */
        self.loadStream = function() {
            // Output Timings
            //console.log('Timings: Latency ', meanLatency, ' CRT ', currentClientRoundTrip, ' SRT ', currentServerRoundTrip);

            // Create Stream
            if (self.streamID === 0) {
                self.streamID = -1;
                self.idResolver = [];
                self.nameResolver = {};
                self.lastServerTimestamp = 0;
                $.ajax({
                    url: "cats/stream_create.json",
                    timeout: self.binding.app.nRequestTimeout,
                    cache: false,
                    dataType: "json",
                    mimeType: "application/json",
                    success: self._createHandler,
                    error: self._createErrorHandler,
                    statusCode: self._createStatusCodeHandler
                });
            }
            // Stream data (Order ensured and timeout handling)
            else if (self.streamID != -1) {
                var currentMS = new Date().getTime();

                // When not in editmode
                if (!self.binding.app.bEditMode) {
                    // Only do requests when a timeout happened or we received our data
                    // - First request in stream
                    // - Received at least last request
                    // - Timeout
                    if (self.currentClientTimestamp <= 0 || self.lastClientTimestamp >= self.currentClientTimestamp || currentMS > self.currentClientTimeout) {
                        $.ajax({
                            url: "cats/stream.json",
                            data: {
                                sid: self.streamID,
                                cts: currentMS,
                                lsts: self.lastServerTimestamp
                            },
                            clientRequestTime: currentMS, // custom field for abort
                            timeout: self.binding.app.nRequestTimeout,
                            cache: false,
                            dataType: "json",
                            mimeType: "application/json",
                            success: self._streamHandler,
                            error: self._streamErrorHandler,
                            beforeSend: self._streamBeforeSendHandler,
                            statusCode: self._streamStatusHandler
                        });
                    }
                }
            }
        };

        return self;
    };
});
