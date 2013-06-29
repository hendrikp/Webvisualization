/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * Utils for showing errors and highlights
 * from stackoverflow
 * based on jQuery UI css-styles
 * @module utils
 */
define(["exports", "jQuery", "jQueryUi"], function(exports, $, jui) {
	/**
	* function to create error and alert dialogs
	* @param e element selection to transform
	* @param type highlight or error
	* @param icon optional custom icon
	*/
	function errorHighlight(e, type, icon) {
		if (!icon) {
			if (type === 'highlight') {
				icon = 'ui-icon-info';
			} else {
				icon = 'ui-icon-alert';
			}
		}

		return e.each(function() {
			$(this).addClass('ui-widget');
			var alertHtml = '<div class="ui-state-' + type + ' ui-corner-all" style="padding:0 .7em;">';
			alertHtml += '<p>';
			alertHtml += '<span class="ui-icon ' + icon + '" style="float:left;margin-right: .3em;"></span>';
			alertHtml += $(this).html();
			alertHtml += '</p>';
			alertHtml += '</div>';

			$(this).html(alertHtml);
		});
	}

	/**
	* Transforms selection to error layout
	*/
	$.fn.error = function() {
		errorHighlight(this, 'error');
	};

	/**
	* Transforms selection to highlight layout
	*/
	$.fn.highlight = function() {
		errorHighlight(this, 'highlight');
	};
});