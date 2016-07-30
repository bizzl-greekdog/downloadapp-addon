// utilities.js - Art Site Download Helper's module
// author: bizzl

const {Cc, Ci} = require('chrome');
const file = require('sdk/io/file');
const {defer} = require('sdk/core/promise');
const xhr = require('sdk/net/xhr');

exports.parseHTML = function(htmlStr) {
    var parser = Cc['@mozilla.org/xmlextras/domparser;1'].createInstance(Ci.nsIDOMParser);
    return parser.parseFromString(htmlStr, 'text/html');
};

function saveFetchHTML(url, deferred) {
    var request = new xhr.XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = function(evt) {
        if (request.readyState == 4) {
            if (request.status == 200) {
                deferred.resolve(exports.parseHTML(request.responseText));
            } else {
                deferred.reject(request.responseText);
            }
        }
    };
    request.send('');
}

exports.fetchHTML = function(url) {
    var deferred = defer();
    if (url.then)
        url.then(function(url) { saveFetchHTML(url, deferred); });
    else
        saveFetchHTML(url, deferred);
    return deferred.promise;
};

exports.fetchJSON = function(url) {
    var deferred = defer();
    var request = new xhr.XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = function(evt) {
        if (request.readyState == 4) {
            if(request.status == 200) {
                try {
                    deferred.resolve(JSON.parse(request.responseText));
                } catch(e) {
                    deferred.reject(request.responseText);
                    console.error(e, request.responseText);
                }
            } else {
                deferred.reject(request.responseText);
            }
        }
    };
    request.send('');
    return deferred.promise;
};

exports.anyNode = function(dom, selectors) {
    if (typeof selectors === 'string')
        selectors = [selectors];
    for (var selector of selectors) {
        var n = dom.querySelector(selector);
        if (n)
            return n;
    }
};

exports.cleanText = function(text) {
    try {
        text = text.replace(/[\t\f\r]/g, '');
		text = text.replace(/<br[^>]*>/g, '\n');
		text = text.replace(/<(\/?[bisu])(?: [^>]*)?>/g, '[$1]');
		text = text.replace(/<[^>]+>/g, '');
		text = text.replace(/^[\t\n\f\r]*|[\t\n\f\r]*$/g, '');
		text = text.replace(/\n\n\n+/g, '\n\n')
		text = text.replace(/;([^ ])/g, '; $1');
		text = text.split('\n');
		while(text[0] == '') text.shift();
		text = text.join('\n');
		text = text.replace(/\[(\/?[bisu])]/g, '<$1>');
        text = text.trim();
	} catch (e) {
		throw 'cleanText: ' + e;
	}
	return text;
};

exports.cleanUrl = function(url) {
    return url
        .replace(/\/+/g, '/')
        .replace(/^([^:]+):\//, '$1://');
};

exports.cleanFilename = function(filename) {
    return filename
        .replace(/\/|\?|<|>|\\|:|\*|\|"/g, ' ')
        .replace(/ +/g, '_')
        .toLowerCase();
};

exports.stringToFile = function(str, filename) {
    //if (file.exists(filename))
    //    throw 'File ' + filename + ' already exists';
    var f = file.open(filename, 'w');
    f.write(str);
    f.flush();
    f.close();
};
