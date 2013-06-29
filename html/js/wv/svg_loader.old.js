/* Webvisualization - Copyright(c) 2013 Hendrik Polczynski, All rights reserved */

/*globals define */

/**
 * SVG-Loader implementaion
 * currently deprecated, but maybe later useful
 * @todo make unique ids in definition so that svg gradient definitions are unique for each widgets
 * @module svg_loader
 */

define(["exports", "jQuery", "app", "d3"], function(exports, $, app, d3) 
{	
	/**
	* Load an svg from an url
	*/
	function loadSVG(name, url) {
		++_toLoadExternal;

		$.ajax({
			url: url,
			dataType: "xml",
			mimeType: "image/svg+xml",
			success: function(data, textStatus, jqXHR) {
				// jQuery version doesn't work on IE so use importNode...
				var importedNode = 0;
				try {
					importedNode = document.importNode(data.documentElement, true);
				} catch (e) {
					// IE case
					importedNode = importNode(data.documentElement, document);
				}

				loadedSVG[name] = importedNode;

				// Everything loaded?
				if (++_loadedExternal >= _toLoadExternal) app.loadedExternalData();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				++_loadedExternal;
			}
		});
	}

	/**
	* Manually imports node (IE9 fallback)
	* (with correct namespaces)
	*/
	function importNode(node, allChildren) {
		switch (node.nodeType) {
			case document.ELEMENT_NODE:
				var newNode = document.createElementNS(node.namespaceURI, node.nodeName);
				if (node.attributes && node.attributes.length > 0) {
					for (var i = 0, il = node.attributes.length; i < il; i++) {
						if (node.attributes[i].namespaceURI.length > 0) { // use correct namespace if attribute has one (else xlink doesn't work on ie)
							newNode.setAttributeNS(node.attributes[i].namespaceURI, node.attributes[i].nodeName, node.getAttribute(node.attributes[i].nodeName));
						} else {
							newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i].nodeName));
						}
					}
				}
				if (allChildren && node.childNodes && node.childNodes.length > 0) {
					for (var i = 0, il = node.childNodes.length; i < il; i++) {
						newNode.appendChild(importNode(node.childNodes[i], allChildren));
					}
				}

				return newNode;
				break;

			case document.TEXT_NODE:
			case document.CDATA_SECTION_NODE:
			case document.COMMENT_NODE:
				return document.createTextNode(node.nodeValue);
				break;
		}
	}
});