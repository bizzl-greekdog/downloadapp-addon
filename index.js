const self = require('sdk/self');
const contextMenu = require('sdk/context-menu');
const ui = require('sdk/ui');
const tabs = require('sdk/tabs');

function downloadUrl(data) {
    if (data.substr(0, 1) == '{') {
        data = JSON.parse(data);
    } else {
        data = {
            url: data,
            referer: data
        };
    }
    console.log(data);
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
