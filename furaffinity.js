/*
 * Copyright (c) 2016 Benjamin Kleiner
 *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const self = require('sdk/self');
const notifications = require('sdk/notifications');
const utilities = require('utilities');
const {defer} = require('sdk/core/promise');

function cleanText(text) {
    return text
        .replace(/[\t\f\r]/g, '')
        .replace(/<br[^>]*>/g, '\n')
        .replace(/<a[^>]*iconusername[^>]*>[^<]*<img[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/g, '$1')
        .replace(/<(\/?[bisu])(?: [^>]*)?>/g, '[$1]')
        .replace(/<[^>]+>/g, '')
        .replace(/^[\t\n\f\r]*|[\t\n\f\r]*$/g, '')
        .replace(/\n\n\n+/g, '\n\n')
        .replace(/;([^ ])/g, '; $1')
        .replace(/^\n+/, '')
        .replace(/\[(\/?[bisu])]/g, '<$1>')
        .replace(/&nbsp;/g, ' ')
        .trim();
};

function cleanAllText(obj) {
    for (var k in obj) {
        if (typeof obj[k] === 'string') {
            obj[k] = cleanText(obj[k]);
        } else if (typeof obj[k] === 'object') {
            obj[k] = cleanAllText(obj[k]);
        }
    }
    return obj;
}

module.exports.view = function (url, callback) {
    utilities.fetchHTML(url).then(function (doc) {
        var fileUrl = doc.querySelector('a[href*="facdn"]').href.replace(/^\/\//, 'http://');
        var title = doc.querySelector('#page-submission td.cat b').innerHTML;
        var artist = doc.querySelector('#page-submission td.cat a[href*="user"]').innerText;
        var comment = doc.querySelector('#page-submission td.alt1[width="70%"]').innerHTML;
        var fileName = fileUrl.split('/').pop();
        var downloadItem = {
            url: fileUrl,
            filename: fileName,
            referer: url,
            comment: comment,
            metadata: {
                'Artist': artist,
                'Title': title,
                'Source': url,
                'Original Filename': fileName
            }
        };
        downloadItem = cleanAllText(downloadItem);
        callback(downloadItem);
    });
};

module.exports.msg = function (url, callback, pages) {
    if (!pages) {
        notifications.notify({
            title: 'This will take some time',
            text: 'Go away, firefox will be busy as hell...'
        });
        pages = [];
    } else {
        notifications.notify({
            title: 'This will take some time',
            text: pages.length + ' pages found so far...'
        });
    }
    utilities.fetchHTML(url).then(function (doc) {
        var count = 0;
        Array.prototype.slice.call(doc.querySelectorAll('#messages-form .t-image a')).forEach(function (a) {
            if (a.href.indexOf('/view/') > -1 && pages.indexOf(a.href) === -1) {
                pages.push(a.href);
                count++;
            }
        });

        var next = doc.querySelector('a.more');
        if (!next) {
            next = doc.querySelector('a.more-half');
        }
        if (next) {
            next = 'http://www.furaffinity.net' + next.href;
        }

        if (next && count > 0) {
            module.exports.msg(next, callback, pages);
        } else {
            var scannedPages = [];
            var total = pages.length;
            var successfulScans = 0;
            var cb = function (scannedPage) {
                if (scannedPages.length && scannedPages.length % 50 == 0) {
                    notifications.notify({
                        title: 'This will take some time',
                        text: (successfulScans + scannedPages.length) + ' of ' + total + ' scanned'
                    });
                }
                if (scannedPage) {
                    scannedPages.push(scannedPage);
                }
                if (scannedPages.length && scannedPages.length % 500 === 0) {
                    callback(scannedPages);
                    successfulScans += scannedPages.length;
                    scannedPages = [];
                }
                if (pages.length) {
                    var deferred = defer();
                    module.exports.view('http://www.furaffinity.net' + pages.shift(), deferred.resolve);
                    deferred.promise.then(cb);
                } else if (scannedPages.length) {
                    callback(scannedPages);
                    successfulScans += scannedPages.length;
                    notifications.notify({
                        title: 'This will take some time',
                        text: successfulScans + ' pages successfully scanned'
                    });
                }
            };
            cb();
        }
    });
};
