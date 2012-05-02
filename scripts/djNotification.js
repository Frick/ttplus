var bgPage = chrome.extension.getBackgroundPage(),
    notificationType = "djSpot",
    populated = false,
    actions = [
        "has stepped out of the limelight.",
        "dove off the stage!",
        "backed off the decks.",
        "couldn't take the heat.",
        "didn't want to spin anymore.",
        "ran out of tunes."
    ]

window.onload = function () {
    bgPage.ttp.getNotification("djSpot");
    document.body.style.opacity = 1;
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.djSpot.duration, bgPage.ttp.prefs.notifications.djSpot.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.djSpot.duration + bgPage.ttp.prefs.notifications.djSpot.fade));
}

window.onmouseover = function () {
    window.clearTimeout(window.fadeTimeout);
    window.clearTimeout(window.closeTimeout);
    document.body.style.opacity = 1;
}

window.onmouseout = function () {
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.djSpot.duration, bgPage.ttp.prefs.notifications.djSpot.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.djSpot.duration + bgPage.ttp.prefs.notifications.djSpot.fade));
}

function fade(duration) {
    if (document.body.style.opacity > 0.01) {
        document.body.style.opacity = (document.body.style.opacity - 0.01);
        window.fadeTimeout = window.setTimeout(fade, (duration / 100), duration);
    }
}

function buildNotification(notification) {
    document.getElementById('dj').innerText = notification.dj;
    document.getElementById('action').innerText = actions[Math.floor(Math.random() * 6)];
    if (bgPage.ttp.prefs.notifications.sounds && bgPage.ttp.prefs.notifications.djSpot.on && bgPage.ttp.prefs.notifications.djSpot.sound !== "") {
        document.getElementById('sound').innerHTML = '<audio autoplay="autoplay"><source src="' + chrome.extension.getURL('sounds/' + bgPage.ttp.prefs.notifications.djSpot.sound) + '" /></audio>';
    }
    document.getElementsByTagName('html')[0].onclick = function () {
        chrome.tabs.update(bgPage.ttp.tabId, {selected: true});
        window.close();
    }
    populated = true;
}
