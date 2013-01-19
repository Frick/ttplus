var bgPage = chrome.extension.getBackgroundPage(),
    notificationType = "song",
    populated = false;

window.onload = function () {
    bgPage.ttp.getNotification("song");
    document.body.style.opacity = 1;
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.song.duration, bgPage.ttp.prefs.notifications.song.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.song.duration + bgPage.ttp.prefs.notifications.song.fade));
}

window.onmouseover = function () {
    window.clearTimeout(window.fadeTimeout);
    window.clearTimeout(window.closeTimeout);
    document.body.style.opacity = 1;
}

window.onmouseout = function () {
    window.fadeTimeout = window.setTimeout(fade, bgPage.ttp.prefs.notifications.song.duration, bgPage.ttp.prefs.notifications.song.fade);
    window.closeTimeout = window.setTimeout(window.close, (bgPage.ttp.prefs.notifications.song.duration + bgPage.ttp.prefs.notifications.song.fade));
}

function fade(duration) {
    if (document.body.style.opacity > 0.01) {
        document.body.style.opacity = (document.body.style.opacity - 0.01);
        window.fadeTimeout = window.setTimeout(fade, (duration / 100), duration);
    }
}

function buildNotification(notification) {
    var artist,
        marq,
        track;

    document.getElementById('dj').innerText = notification.dj;
    artist = document.getElementById('artist');
    artist.innerText = notification.artist;
    if (artist.offsetHeight > 20) {
        document.getElementById('trackInfo').removeChild(artist);
        marq = document.createElement('marquee');
        marq.id = 'artist';
        marq.style.height = '18px';
        marq.scrollAmount = 10;
        marq.scrollDelay = 200;
        marq.innerText = notification.artist;
        document.getElementById('trackInfo').insertBefore(marq, document.getElementById('track'));
    } else {
        artist.style.height = '18px';
    }

    track = document.getElementById('track');
    track.innerText = notification.track;
    if (track.offsetHeight > 20) {
        document.getElementById('trackInfo').removeChild(track);
        marq = document.createElement('marquee');
        marq.id = 'track';
        marq.style.height = '18px';
        marq.align = 'left';
        marq.scrollAmount = 10;
        marq.scrollDelay = 200;
        marq.innerText = notification.track;
        document.getElementById('trackInfo').appendChild(marq);
    } else {
        track.style.height = '18px';
    }

    document.getElementById('avatar').src = "http://turntable.fm" + notification.avatar;
    if (bgPage.ttp.prefs.notifications.sounds && bgPage.ttp.prefs.notifications.song.on && bgPage.ttp.prefs.notifications.song.sound !== "") {
        document.getElementById('sound').innerHTML = '<audio autoplay="autoplay"><source src="' + chrome.extension.getURL('sounds/' + bgPage.ttp.prefs.notifications.song.sound) + '" /></audio>';
    }
    document.getElementById('upvote').onclick = function () {
        bgPage.ttp.vote("up");
        window.close();
    }
    document.getElementById('downvote').onclick = function () {
        bgPage.ttp.vote("down");
        window.close();
    }
    populated = true;
}
