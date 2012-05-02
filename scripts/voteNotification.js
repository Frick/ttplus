var bgPage = chrome.extension.getBackgroundPage(),
    notificationType = "vote",
    populated = false;

window.onload = function () {
    bgPage.ttp.getNotification("vote");
    document.body.style.opacity = 1;
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.vote.duration, bgPage.ttp.prefs.notifications.vote.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.vote.duration + bgPage.ttp.prefs.notifications.vote.fade));
}

window.onmouseover = function () {
    window.clearTimeout(window.fadeTimeout);
    window.clearTimeout(window.closeTimeout);
    document.body.style.opacity = 1;
}

window.onmouseout = function () {
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.vote.duration, bgPage.ttp.prefs.notifications.vote.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.vote.duration + bgPage.ttp.prefs.notifications.vote.fade));
}

function fade(duration) {
    if (document.body.style.opacity > 0.01) {
        document.body.style.opacity = (document.body.style.opacity - 0.01);
        window.fadeTimeout = window.setTimeout(fade, (duration / 100), duration);
    }
}

function buildNotification(notification) {
    document.getElementById('name').innerText = notification.user;
    document.getElementById('vote').src = "/images/" + notification.vote + "vote.png";
    if (bgPage.ttp.prefs.notifications.sounds && bgPage.ttp.prefs.notifications.vote.sound !== "") {
        document.getElementById('sound').innerHTML = '<audio autoplay="autoplay"><source src="' + chrome.extension.getURL('sounds/' + bgPage.ttp.prefs.notifications.vote.sound) + '" /></audio>';
    }
    populated = true;
}
