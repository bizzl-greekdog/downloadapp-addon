const self = require('sdk/self');
const contextMenu = require('sdk/context-menu');
const ui = require('sdk/ui');
const tabs = require('sdk/tabs');
const pageWorker = require('sdk/page-worker');
const notifications = require('sdk/notifications');
const timers = require('sdk/timers');
const prefs = require('sdk/simple-prefs');

var socket = pageWorker.Page({
    contentURL: self.data.url('socket.html')
});

socket.silent = false;
socket.available = false;

function socketConnect() {
    socket.port.emit('open', prefs.prefs.socketUrl);
}

prefs.on('socketUrl', socketConnect);

socket.port.on('message', function (message) {
    message = JSON.parse(message);
    console.log(message);
    if (message.autoOpen) {
        var url = prefs.prefs.serverUrl + '/notification/' + message.id;
        tabs.open(url.replace(/([^:])\/\//g, '$1/'));
    } else {
        notifications.notify({
            title: message.title,
            text: message.text,
            data: message.id.toString(),
            onClick: function (data) {
                var url = prefs.prefs.serverUrl + '/notification/' + data;
                tabs.open(url.replace(/([^:])\/\//g, '$1/'));
            }
        });
    }
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
    socket.port.emit('send', JSON.stringify(data));
}

function DownloadImage() {
    self.on("click", function (node) {
        self.postMessage(JSON.stringify({
            url: node.href || node.src,
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
