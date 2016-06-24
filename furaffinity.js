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

const pageWorkers = require('sdk/page-worker');
const self = require('sdk/self');

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
    pageWorkers.Page({
        contentURL: url,
        contentScriptWhen: 'ready',
        contentScriptFile: [
            self.data.url('jquery-3.0.0.min.js'),
            self.data.url('furaffinity.view.js')
        ],
        onMessage: function (message) {
            message = JSON.parse(message);
            message = cleanAllText(message);
            callback(message);
        }

    });
};
