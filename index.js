const self = require('sdk/self');
const contextMenu = require('sdk/context-menu');
const ui = require('sdk/ui');
const tabs = require('sdk/tabs');
const pageWorker = require('sdk/page-worker');
const notifications = require('sdk/notifications');
const timers = require('sdk/timers');
const prefs = require('sdk/simple-prefs');
const furaffinity = require('furaffinity');
const request = require('sdk/request');
const utilities = require('utilities');

var socket = pageWorker.Page({
    contentURL: self.data.url('socket.html')
});

socket.silent = false;
socket.available = false;

function getServerUrl() {
    return prefs.prefs.serverUrl.replace(/\/+$/, '');
}

function socketConnect() {
    socket.port.emit('open', prefs.prefs.socketUrl);
}

function showNotification(message) {
    if (message.autoOpen) {
        var url = getServerUrl() + '/notification/' + message.id;
        tabs.open(url.replace(/([^:])\/\//g, '$1/'));
    } else {
        notifications.notify({
            title: message.title,
            text: message.text,
            data: message.id.toString(),
            onClick: function (data) {
                var url = getServerUrl() + '/notification/' + data;
                tabs.open(url.replace(/([^:])\/\//g, '$1/'));
            }
        });
    }
}

function putDownloads(data) {
    request.Request({
        url: getServerUrl() + '/put',
        contentType: 'application/json',
        content: JSON.stringify(data),
        onComplete: function(response) {
            if (response.json) {
                showNotification(response.json);
            } else {
                utilities.stringToFile(response.text, '/tmp/downloadapp-addon.html');
                utilities.stringToFile(JSON.stringify(data), '/tmp/downloadapp-addon.json');
                tabs.open('/tmp/downloadapp-addon.html');
            }
        }
    }).post();
}

prefs.on('socketUrl', socketConnect);

socket.port.on('message', function (message) {
    showNotification(JSON.parse(message));
});

socket.port.on('closed', function () {
    if (!socket.silent) {
        notifications.notify({
            title: 'Download App disconnected'
        });
    }
    socket.available = false;
    socket.silent = true;
    timers.setTimeout(socketConnect, 5000);
});

socket.port.on('opened', function () {
    socket.available = true;
    socket.silent = false;
    notifications.notify({
        title: 'Download App connected'
    });
});

socketConnect();

function downloadUrl(data) {
    if (data.substr(0, 1) == '{') {
        data = JSON.parse(data);
    } else {
        data = {
            url: data,
            referer: data
        };
    }
    if (data.url.indexOf('furaffinity.net/view') > -1) {
        furaffinity.view(data.url, putDownloads);
    } else if (data.url.indexOf('furaffinity.net/msg') > -1) {
        furaffinity.msg('http://www.furaffinity.net/msg/submissions/', putDownloads);
    } else {
        socket.port.emit('send', JSON.stringify(data));
    }
}

function DownloadImage() {
    self.on("click", function (node) {
        var url = node.href || node.src;
        if (node.nodeName.toLowerCase() == 'img') {
            while (node.parentNode) {
                node = node.parentNode;
                if (node.href && node.nodeName.toLowerCase() == 'a') {
                    url = node.href;
                    break;
                }
            }
        }
        self.postMessage(JSON.stringify({
            url: url,
            referer: window.location.href
        }));
    });
}

contextMenu.Item({
    label: 'Download Image',
    context: contextMenu.SelectorContext('a[href], img'),
    contentScript: DownloadImage.toSource() + "\nDownloadImage();",
    onMessage: downloadUrl
});

ui.ActionButton({
    id: 'add-to-download',
    label: 'Download Image Page',
    icon: {
        16: './boxdownload16.png',
        32: './boxdownload32.png'
    },
    onClick: function () {
        downloadUrl(tabs.activeTab.url);
    }
});

ui.ActionButton({
    id: 'download-watchlists',
    label: 'Download Watchlists',
    icon: {
        16: './boxdownload16.png',
        32: './boxdownload32.png'
    },
    onClick: function () {
        downloadUrl('watchlists');
    }
});
