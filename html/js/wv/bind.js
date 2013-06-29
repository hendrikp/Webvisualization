/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Binding implemention / Binding Namespace
 * @module bind
 */

define(["exports", "jQuery"], function(exports, $) {
    
    /**
    * Creates a Binding Namespace for a view
    * @param app application
    * @param view current view
    */
    exports.createBinding = function(app, view) {
        var self = {};
        self.app = app;
        self.view = view;
        self.nameResolver = {};
        self.stream = {};

        /**
        * Set the stream for this binding namespace
        */
        self.setStream = function(stream) {
            self.stream = stream;
            view.callAllWidgets("refresh");
        };

        /**
        * Get information about a BoundValue
        * if value is not bound this will return an dummy object
        */
        self.getStreamInfo = function(name) {
            var bindInfo;
            try {
                bindInfo = self.stream.nameResolver[name];
            } catch (e) {}

            if (bindInfo !== undefined) {
                return bindInfo;
            } else {
                return {
                    n: name,
                    c: "n.A.",
                    u: "n.A."
                };
            }
        };

        /**
        * Subscribe a value (used internally by propertyHandler)
        * @param name bound name
        * @param context widget
        * @param callback function to call
        * @param prop property object
        * @param bind boundvalue object
        */
        self.subscribeValue = function(name, context, callback, prop, bind) {
            if (typeof(self.nameResolver[name]) === 'undefined') {
                self.nameResolver[name] = [];
            }

            var celem = {
                context: context,
                callback: callback,
                prop: prop,
                bind: bind
            };

            self.nameResolver[name].push(celem);

            // send default
            callback.call(context, celem, prop.def);
        };

        /**
        * Unsubscribes a subscribed value
        * @param name bound name
        * @param context widget
        * @param prop property object
        */
        self.unsubscribeValue = function(name, context, prop) {
            if (typeof(self.nameResolver[name]) !== 'undefined') {
                var elem = self.nameResolver[name];
                for (var i = 0; i < elem.length; ++i) {
                    var celem = elem[i];
                    if (celem.context.uuid === context.uuid && celem.prop.uid === prop.uid) {
                        // send default
                        celem.callback.call(celem.context, celem, celem.prop.def);

                        // remove
                        elem.splice(i, 1);
                    }
                }
            }
        };

        /**
        * publishes the current data frame to a binding namespace/view
        * @param idresolver of the binding namespace
        * @param jsonframe data/changeset received
        */
        self.publishFrame = function(idResolver, jsonFrame) {
            var nameResolver = self.nameResolver;
            var values = jsonFrame.v;
            var indexes = jsonFrame.i;
            var max = indexes.length;

            // All indexes in this packet
            for (var ni = 0; ni < max; ++ni) {
                var name = idResolver[indexes[ni]].n;

                // If subscribers present
                if (name in nameResolver) {
                    var elem = nameResolver[name];
                    var elemmax = elem.length;

                    // Publish to all subscribers
                    for (var ne = 0; ne < elemmax; ++ne) {
                        var celem = elem[ne];
                        celem.callback.call(celem.context, celem, values[ni]);
                    }
                }
            }
        };

        return self;
    };
});