var bgPage = chrome.extension.getBackgroundPage(),
    notificationType = "chat",
    populated = false;

window.onload = function () {
    bgPage.ttp.getNotification("chat");
    document.body.style.opacity = 1;
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.chat.duration, bgPage.ttp.prefs.notifications.chat.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.chat.duration + bgPage.ttp.prefs.notifications.chat.fade));
}

window.onmouseover = function () {
    window.clearTimeout(window.fadeTimeout);
    window.clearTimeout(window.closeTimeout);
    document.body.style.opacity = 1;
}

window.onmouseout = function () {
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.chat.duration, bgPage.ttp.prefs.notifications.chat.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.chat.duration + bgPage.ttp.prefs.notifications.chat.fade));
}

function fade(duration) {
    if (document.body.style.opacity > 0.01) {
        document.body.style.opacity = (document.body.style.opacity - 0.01);
        window.fadeTimeout = window.setTimeout(fade, (duration / 100), duration);
    }
}

function buildNotification(notification) {
    var sound;

    document.getElementById('speaker').innerText = notification.speaker;
    document.getElementById('message').innerText = notification.text;
    document.getElementById('avatar').src = "http://turntable.fm" + notification.avatar;
    if (bgPage.ttp.prefs.notifications.sounds && bgPage.ttp.prefs.notifications.chat.on && bgPage.ttp.prefs.notifications.chat.sound !== "") {
        if (bgPage.ttp.prefs.notifications.chat.sound === "mario_coin.mp3") {
            sound = (bgPage.ttp.getPowerup()) ? "mario_1up.mp3" : "mario_coin.mp3";
        } else {
            sound = bgPage.ttp.prefs.notifications.chat.sound;
        }
        document.getElementById('sound').innerHTML = '<audio autoplay="autoplay"><source src="' + chrome.extension.getURL('sounds/' + sound) + '" type="audio/mpeg" /></audio>';
    }
    document.getElementById('tt_logo').onclick = function (e) {
        chrome.tabs.update(bgPage.ttp.tabId, {selected: true});
        chrome.tabs.sendRequest(bgPage.ttp.tabId, {command: "turntable[ttp.roominfo].nodes.chatText.focus()"});
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    document.getElementsByTagName('html')[0].onclick = function () {
        if (navigator.appVersion.indexOf('Windows') !== -1) {
            document.getElementsByTagName('html')[0].onclick = null;
            document.getElementById('response').value = '@' + notification.speaker + ' - ';
            document.getElementById('chat-container').style.display = 'block';
            window.clearTimeout(window.closeTimeout);
            window.clearTimeout(window.fadeTimeout);
            document.body.style.opacity = 1;
            document.getElementById('response').onkeyup = function (e) {
                if (e.keyCode === 13) {
                    chrome.tabs.sendRequest(bgPage.ttp.tabId, {speak: this.value});
                    this.value = '';
                    fadeTimeout = window.setTimeout(fade, 500, 500);
                    closeTimeout = window.setTimeout(window.close, (1000));
                    this.disabled = 'disabled';
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            };
            document.getElementById('response').focus();
        } else {
            chrome.tabs.update(bgPage.ttp.tabId, {selected: true});
            chrome.tabs.sendRequest(bgPage.ttp.tabId, {command: "turntable[ttp.roominfo].nodes.chatText.value = '@' + " + notification.speaker + " + ' - '; turntable[ttp.roominfo].nodes.chatText.focus()"});
        }
    }
    populated = true;
}
