const self = require('sdk/self');
const contextMenu = require('sdk/context-menu');
const ui = require('sdk/ui');
const tabs = require('sdk/tabs');
const pageWorker = require('sdk/page-worker');
const notifications = require('sdk/notifications');
const timers = require('sdk/timers');

var socketUrl = 'ws://localhost:8888/';

var socket = pageWorker.Page({
    contentURL: self.data.url('socket.html')
});

socket.silent = false;
socket.available = false;

function socketConnect() {
    socket.port.emit('open', socketUrl);
}

socket.port.on('error', console.log);

socket.port.on('message', function(message) {
    message = JSON.parse(message);
    notifications.notify({
        title: message.title,
        text: message.text
    });
});

socket.port.on('closed', function() {
    if (!socket.silent) {
        notifications.notify({
            title: 'Download App disconnected'
        });
    }
    socket.available = false;
    socket.silent = true;
    timers.setTimeout(socketConnect, 5000);
});

socket.port.on('opened', function() {
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
    self.on("click", function(node) {
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
