var ttp = {
    tt_re: /https?:\/\/turntable\.fm\/.*/i,
    ttRoom_re: /https?:\/\/turntable\.fm\/(?!lobby\/?|favicon.ico|static\/?|settings\/?|getfile\/?|down\/?|about\/?|terms\/?|privacy\/?|copyright\/?|jobs\/?|admin\/?).+/i,
    chatNotification_re: /$^/,
    tabId: null,
    port: null,
    msgId: 0,
    msgCallbacks: [],
    room: null,
    user: null,
    users: null,
    chatMessages: [],
    lastPopupTab: 'songtab',
    notifications: [],
    missedNotifications: 0,
    powerup: 0,
    version: '0.3.18',
    minVersion: '0.3.6',
    prefs: {
        notifications: {
            on: true,
            textOnly: false,
            sounds: true,
            idleTimeout: 1200,
            chat: {
                on: true,
                sound: "mario_coin.mp3",
                duration: 5000,
                fade: 500,
                keywords: []
            },
            pm: {
                on: true,
                sound: "",
                duration: 15000,
                fade: 500
            },
            song: {
                on: true,
                sound: "",
                duration: 10000,
                fade: 500
            },
            vote: {
                on: false,
                sound: "",
                duration: 2000,
                fade: 0
            },
            djSpot: {
                on: true,
                sound: "",
                duration: 15000,
                fade: 500
            }
        },
        searchProviders: [],
        defaultSearchProvider: 'hulkshare',
        layout: {},
        changeLayout: true,
        roomCustomizationsAllowed: ['4e091b2214169c018f008ea5'],
        version: '0.3.18'
    },
    logging: {},
    enableLogging: function (type) {
        if (typeof type !== "string" || type.length < 1) {
            return;
        }
        this.logging[type] = true;
        console.log('Enabled logging of "' + type + '"...');
    },
    disableLogging: function (type) {
        if (typeof type !== "string" || type.length < 1) {
            return;
        }
        this.logging[type] = false;
        console.log('Disabled logging of "' + type + '"...');
    },
    log: function (msg) {
        var now = new Date(),
            datetime = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds();

        if (typeof msg.command  === "string") {
            console.log(datetime + ' ' + msg.command + ': ', arguments);
        } else {
            console.log(datetime + ' - ', arguments);
        }
    },
    isActive: function (callback, returnState) {
        chrome.idle.queryState(15, function (state) {
            //seems to be a bug in current idle detection implementation (Chrome issue)
            if (ttp.logging.idle || ttp.logging.all) {
                ttp.log('queryState,15:', state);
            }
            if (state !== 'locked') {
                //chrome.idle.queryState(1200, function(state2) {
                //  if (ttp.logging.idle || ttp.logging.all) ttp.log('queryState,1200:',state2);
                if (state !== 'locked' && returnState) {
                    callback(true);
                } else if (state !== 'locked') {
                    callback();
                } else if (returnState) {
                    callback(false);
                }
                //});
            } else if (returnState) {
                callback(false);
            }
        });
    },
    getTurntableTabId: function (callback, room) {
        var regex = (room !== false) ? this.ttRoom_re : this.tt_re,
            found = false,
            tabId = false,
            i = 0,
            x = 0,
            windowsLength,
            tabsLength;

        chrome.windows.getAll({populate: true}, function (windows) {
            for (i = 0, windowsLength = windows.length; i < windowsLength; i += 1) {
                for (x = 0, tabsLength = windows[i].tabs.length; x < tabsLength; x += 1) {
                    if (regex.test(windows[i].tabs[x].url)) {
                        tabId = windows[i].tabs[x].id;
                        callback(tabId);
                        break;
                    }
                }
            }
        });
    },
    openTurntable: function () {
        this.getTurntableTabId(function (tabId) {
            if (tabId !== false) {
                chrome.tabs.update(tabId, {"selected": true});
            } else {
                chrome.tabs.getSelected(null, function (tab) {
                    chrome.tabs.create({
                        index: tab.index + 1,
                        url: "http://turntable.fm/"
                    });
                });
            }
        }, false);
    },
    injectListener: function () {
        if (typeof this.tabId !== "number") {
            return;
        }
        chrome.tabs.insertCSS(this.tabId, {file: "styles/ttp.css"});
        chrome.tabs.executeScript(this.tabId, {file: "scripts/jquery.js"});
        chrome.tabs.executeScript(this.tabId, {file: "scripts/listener.js"});
    },
    send: function (data, callback) {
        if (this.port === null) {
            return false;
        }
        if (typeof data.msgId !== "number") {
            this.msgId += 1;
            data.msgId = this.msgId;
            data.source = 'background';
        }
        if (typeof callback === "function") {
            this.msgCallbacks.push([
                this.msgId,
                callback
            ]);
        }
        this.port.postMessage(data);
        if (ttp.logging.send || ttp.logging.all) {
            ttp.log('sending:', JSON.stringify(data));
        }
        return this.msgId;
    },
    exec: function (command, callback) {
        ttp.send({command: command}, callback);
    },
    setupRoom: function (roominfo) {
        var songlog = [],
            x = 0,
            length = 0;

        if (window.setupTimeout !== undefined) {
            window.clearTimeout(window.setupTimeout);
            delete window.setupTimeout;
        }
        if (ttp.user === null || typeof ttp.user.userid !== "string") {
            ttp.setupUserInfo();
        }
        if (typeof roominfo === "object" && typeof roominfo.room !== "undefined" && typeof roominfo.users !== "undefined") {
            if (typeof roominfo.room.metadata === "object" && typeof roominfo.room.metadata.songlog === "object") {
                ttp.room = roominfo.room;
            } else {
                songlog = ttp.room.metadata.songlog;
                ttp.room = roominfo.room;
                ttp.room.metadata.songlog = songlog;
            }
            ttp.users = {};
            for (x in roominfo.users) {
                if (roominfo.users[x].hasOwnProperty('userid')) {
                    ttp.users[roominfo.users[x].userid] = roominfo.users[x];
                }
            }
            if (ttp.prefs.notifications.chat.keywords.length > 0) {
                ttp.chatNotification_re = new RegExp("(?:[^a-z0-9]|^)(?:" + ttp.prefs.notifications.chat.keywords.join("|") + ")(?:[^a-z0-9]|$)", "i");
            }
        } else if (ttp.room === null) {
            ttp.send({setup: true});
            window.setupTimeout = window.setTimeout(ttp.setupRoom, 5000);
        }
    },
    setupUserInfo: function (user) {
        if (window.userInfoTimeout !== undefined) {
            window.clearTimeout(window.userInfoTimeout);
            delete window.userInfoTimeout;
        }
        if (typeof user === "object" && typeof user.userid === "string" && typeof user.name === "string") {
            ttp.user = user;
            delete ttp.user.msgid;
            delete ttp.user.success;
            if (ttp.prefs.notifications.chat.keywords.length === 0) {
                ttp.addChatKeyword(ttp.user.name);
            }
            if (ttp.users) {
                ttp.users[ttp.user.userid] = ttp.user;
            }
        } else {
            ttp.send({getUserInfo: true});
            window.userInfoTimeout = window.setTimeout(ttp.setupUserInfo, 2500);
        }
    },
    setLayout: function (layout) {
        if (layout === undefined || layout.res === undefined || layout.left === undefined || layout.right === undefined) {
            return;
        }
        if (layout.left.top < 0) {
            layout.left.top = 0;
        }
        if (layout.left.left < 0) {
            layout.left.left = 0;
        }
        if (layout.right.top < 0) {
            layout.right.top = 0;
        }
        if (layout.right.left < 0) {
            layout.right.left = 0;
        }
        ttp.prefs.layout[layout.res] = {
            left: layout.left,
            right: layout.right
        };
        ttp.savePrefs();
    },
    changeLayout: function (resolution) {
        var layout = (ttp.prefs.layout[resolution] !== undefined) ? ttp.prefs.layout[resolution] : {};
        ttp.send({
            changeLayout: ttp.prefs.changeLayout,
            layout: layout
        });
    },
    processChatMsg: function (message) {
        var popups,
            avatar,
            chatNotification;

        if (ttp.storage.isIgnored(message.userid)) {
            return;
        }
        popups = chrome.extension.getViews({type: "popup"});
        if (this.chatMessages.length >= 50) {
            this.chatMessages.pop();
        }
        this.chatMessages.unshift(message);
        if (popups.length > 0) {
            popups[0].addMessage(message);
        }
        if (this.user.userid !== message.userid && this.chatNotification_re.test(message.text)) {
            if (popups.length > 0) {
                popups[0].buildChatlog();
            }
            avatar = (typeof this.users[message.userid] !== "undefined") ? this.users[message.userid].images.headfront : "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/5/headfront.png";
            this.storage.saveMessage({
                userid: message.userid,
                speaker: message.name,
                text: message.text,
                avatar: avatar
            });
            if (this.prefs.notifications.on && this.prefs.notifications.chat.on) {
                this.isActive(function (active) {
                    if (active) {
                        if (ttp.prefs.notifications.textOnly) {
                            chatNotification = webkitNotifications.createNotification(
                                avatar,
                                message.name,
                                message.text
                            );
                            chatNotification.show();
                            window.setTimeout(function () {
                                chatNotification.cancel();
                            }, ttp.prefs.notifications.chat.duration);
                        } else {
                            ttp.notifications.push({
                                type: "chat",
                                speaker: message.name,
                                text: message.text,
                                avatar: avatar
                            });
                            webkitNotifications.createHTMLNotification('chatNotification.html').show();
                        }
                    } else {
                        ttp.missedNotifications += 1;
                    }
                }, true);
            }
            if (typeof this.port  === null) {
                return;
            }
            var rgx = this.chatNotification_re.toString();
            rgx = rgx.substring(1, rgx.length - 2);
            ttp.send({
                highlightMessage: {
                    name: window.escape(message.name),
                    rgx: window.escape(rgx)
                }
            });
        }
        if (this.users[message.userid] && this.users[message.userid].name !== message.name) {
            this.users[message.userid].name = message.name;
        }
    },
    addChatKeyword: function (keyword) {
        var found = false,
            x = 0,
            length = 0;

        if (typeof keyword !== "string" || keyword.length < 1) {
            return;
        }
        keyword = RegExp.escape(keyword);
        for (x = 0, length = this.prefs.notifications.chat.keywords.length; x < length; x += 1) {
            if (this.prefs.notifications.chat.keywords[x] === keyword) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.prefs.notifications.chat.keywords.push(keyword);
            this.chatNotification_re = new RegExp("(?:[^a-z0-9]|^)(?:" + this.prefs.notifications.chat.keywords.join("|") + ")(?:[^a-z0-9]|$)", "i");
            this.savePrefs();
        }
    },
    removeChatKeyword: function (keyword) {
        var found = -1,
            x = 0,
            length = 0;

        if (typeof keyword !== "string" || keyword.length < 1) {
            return;
        }
        for (x = 0, length = this.prefs.notifications.chat.keywords.length; x < length; x += 1) {
            if (this.prefs.notifications.chat.keywords[x] === keyword) {
                found = x;
                break;
            }
        }
        if (found > -1) {
            this.prefs.notifications.chat.keywords.splice(found, 1);
            this.chatNotification_re = new RegExp("(?:[^a-z0-9]|^)(?:" + this.prefs.notifications.chat.keywords.join("|") + ")(?:[^a-z0-9]|$)", "i");
            this.savePrefs();
        }
    },
    getPowerup: function () {
        if (this.powerup === 4) {
            this.powerup = 0;
            return true;
        } else {
            if (typeof window.powerupTimer === "number") {
                window.clearTimeout(window.powerupTimer);
            }
            this.powerup += 1;
            window.powerupTimer = window.setTimeout(function () {
                ttp.powerup = 0;
            }, 30000);
            return false;
        }
    },
    getUserByName: function (username) {
        var x = 0,
            user = false;

        for (x in this.users) {
            if (this.users.hasOwnProperty('name')) {
                if (this.users[x].name === username) {
                    user = this.users[x];
                    break;
                }
            }
        }
        return user;
    },
    addSong: function addSong(room) {
        var popups,
            notifications,
            avatar,
            image,
            songNotification,
            x = 0,
            length = 0;

        if (typeof this.room.metadata !== "object") {
            return;
        }
        if (typeof this.room.metadata.songlog === "object") {
            this.room.metadata.songlog.push(room.metadata.current_song);
        }
        this.room.metadata.current_song = room.metadata.current_song;
        this.room.metadata.current_dj   = room.metadata.current_dj;
        this.room.metadata.djcount      = room.metadata.djcount;
        this.room.metadata.djs          = room.metadata.djs;
        this.room.metadata.listeners    = room.metadata.listeners;
        this.room.metadata.moderator_id = room.metadata.moderator_id;
        this.room.metadata.upvotes      = 0;
        this.room.metadata.downvotes    = 0;
        this.room.metadata.votelog      = [];
        popups = chrome.extension.getViews({type: "popup"});
        if (popups.length > 0) {
            popups[0].buildSonglog();
        }
        if (this.prefs.notifications.on && this.prefs.notifications.song.on) {
            notifications = chrome.extension.getViews({type: "notification"});
            for (x = 0, length = notifications.length; x < length; x += 1) {
                if (notifications[x].notificationType === "song") {
                    notifications[x].window.close();
                }
            }
            this.isActive(function isActive() {
                avatar = (typeof ttp.users[room.metadata.current_dj] !== "undefined") ? ttp.users[room.metadata.current_dj].images.headfront : "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/5/headfront.png";
                if (ttp.prefs.notifications.textOnly && ttp.users[ttp.room.metadata.current_dj] !== undefined) {
                    image = (typeof room.metadata.current_song.metadata.coverart === "string") ? room.metadata.current_song.metadata.coverart : chrome.extension.getURL('/images/ttpIcon48.png');
                    songNotification = webkitNotifications.createNotification(
                        image,
                        ttp.users[room.metadata.current_dj].name + ' started playing',
                        '"' + room.metadata.current_song.metadata.song + '" by ' + room.metadata.current_song.metadata.artist
                    );
                    songNotification.show();
                    window.setTimeout(function () {
                        songNotification.cancel();
                    }, ttp.prefs.notifications.song.duration);
                } else if (ttp.users[ttp.room.metadata.current_dj] !== undefined) {
                    ttp.notifications.push({
                        type: "song",
                        dj: ttp.users[room.metadata.current_dj].name,
                        artist: room.metadata.current_song.metadata.artist,
                        track: room.metadata.current_song.metadata.song,
                        avatar: avatar
                    });
                    webkitNotifications.createHTMLNotification('songNotification.html').show();
                }
            });
        }
    },
    queueSong: function (id) {
        var song = null,
            x = 0,
            length = 0;

        for (x = 0, length = this.room.metadata.songlog.length; x < length; x += 1) {
            if (id === this.room.metadata.songlog[x]._id) {
                song = JSON.stringify(this.room.metadata.songlog[x]);
                break;
            }
        }
        ttp.send({
            queue: true,
            song: song
        });
    },
    userMessages: {
        newUser: function (user) {
            var x = 0,
                length;

            ttp.users[user.userid] = user;
            if (typeof ttp.room.metadata === "object") {
                ttp.room.metadata.listeners += 1;
            }
        },
        remUser: function (user) {
            var wasDj = false,
                x = 0,
                length = 0,
                djNotification;

            for (x in ttp.room.metadata.djs.length) {
                if (ttp.room.metadata.djs[x] === user.userid) {
                    wasDj = true;
                    delete ttp.room.metadata.djs[x];
                    ttp.room.metadata.djs.length -= 1;
                    ttp.room.metadata.djcount -= 1;
                    break;
                }
            }
            if (ttp.prefs.notifications.on && ttp.prefs.notifications.djSpot.on && ttp.room.metadata.djs.length >= (ttp.room.metadata.max_djs - 1) && wasDj) {
                ttp.isActive(function () {
                    if (ttp.prefs.notifications.textOnly) {
                        djNotification = webkitNotifications.createNotification(
                            chrome.extension.getURL('/images/openSpotSm.png'),
                            user.name,
                            'has stepped down'
                        );
                        djNotification.show();
                        window.setTimeout(function () {
                            djNotification.cancel();
                        }, ttp.prefs.notifications.djSpot.duration);
                    } else {
                        ttp.notifications.push({
                            type: "djSpot",
                            dj: user.name
                        });
                        webkitNotifications.createHTMLNotification('djNotification.html').show();
                    }
                });
            }
            delete ttp.users[user.userid];
            if (typeof ttp.room.metadata === "object") {
                ttp.room.metadata.listeners -= 1;
            }
        },
        newMod: function (userid) {
            ttp.room.metadata.moderator_id.push(userid);
        },
        remMod: function (userid) {
            var x = 0,
                length = 0;

            for (x = 0, length = ttp.room.metadata.moderator_id.length; x < length; x += 1) {
                if (ttp.room.metadata.moderator_id[x] === userid) {
                    ttp.room.metadata.moderator_id.splice(x, 1);
                }
            }
        },
        addDj: function (user) {
            var notifyViews,
                x = 0,
                length = 0;

            if (typeof ttp.room.metadata !== "object") {
                return;
            }
            if (typeof ttp.room.metadata.djs === "object") {
                ttp.room.metadata.djs.push(user.userid);
            }
            ttp.room.metadata.djcount += 1;
            if (ttp.room.metadata.djcount > ttp.room.metadata.max_djs) {
                ttp.room.metadata.djcount = ttp.room.metadata.max_djs;
            }
            ttp.room.metadata.djs.length += 1;
            if (ttp.room.metadata.djs.length > ttp.room.metadata.max_djs) {
                ttp.room.metadata.djs.length = ttp.room.metadata.max_djs;
            }
            if (ttp.room.metadata.djs.length === ttp.room.metadata.max_djs) {
                notifyViews = chrome.extension.getViews({type: "notification"});
                for (x = 0, length = notifyViews.length; x < length; x += 1) {
                    if (notifyViews[x].notificationType === "djSpot") {
                        notifyViews[x].window.close();
                    }
                }
            }
        },
        remDj: function (user) {
            var notDj = true,
                x = 0,
                djNotification;

            for (x in ttp.room.metadata.djs) {
                if (ttp.room.metadata.djs[x] === user.userid) {
                    delete ttp.room.metadata.djs[x];
                }
                if (ttp.room.metadata.djs[x] === ttp.user.userid) {
                    notDj = false;
                }
            }
            ttp.room.metadata.djs.length -= 1;
            ttp.room.metadata.djcount -= 1;
            if (ttp.prefs.notifications.on && ttp.prefs.notifications.djSpot.on && ttp.room.metadata.djs.length >= (ttp.room.metadata.max_djs - 1) && ttp.user.userid !== user.userid && notDj) {
                ttp.isActive(function () {
                    if (ttp.prefs.notifications.textOnly) {
                        djNotification = webkitNotifications.createNotification(
                            chrome.extension.getURL('/images/openSpotSm.png'),
                            user.name,
                            'has stepped down'
                        );
                        djNotification.show();
                        window.setTimeout(function () {
                            djNotification.cancel();
                        }, ttp.prefs.notifications.djSpot.duration);
                    } else {
                        ttp.notifications.push({
                            type: "djSpot",
                            dj: user.name
                        });
                        webkitNotifications.createHTMLNotification('djNotification.html').show();
                    }
                });
            }
        },
        vote: function (metadata) {
            var x = 0,
                length = 0,
                avatar,
                name,
                voteNotification,
                popups,
                vote;

            //"metadata":{"upvotes":12,"downvotes":1,"listeners":143,"votelog":[["4e3855c2a3f75118b60f4101","up"]]}
            if (typeof ttp.room.metadata !== "object") {
                return;
            }
            ttp.room.metadata.upvotes   = metadata.upvotes;
            ttp.room.metadata.downvotes = metadata.downvotes;
            ttp.room.metadata.listeners = metadata.listeners;
            for (x = 0, length = metadata.votelog.length; x < length; x += 1) {
                vote = metadata.votelog[x];
                if (typeof ttp.room.metadata.votelog === "object") {
                    ttp.room.metadata.votelog.push(vote);
                }
                if (ttp.user.userid === vote[0] && typeof ttp.room.metadata === "object" && typeof ttp.room.metadata.current_song === "object" && typeof ttp.room.metadata.current_song._id === "string") {
                    // useless waste of storage space until the data is used
                    // ttp.storage.logVote(vote[1], ttp.room.metadata.current_song._id);
                }
                if (typeof ttp.users[vote[0]] === "object") {
                    if (ttp.prefs.notifications.on && ttp.prefs.notifications.vote.on && ttp.user.userid !== vote[0]) {
                        ttp.isActive(function () {
                            avatar = (typeof ttp.users[vote[0]] !== "undefined") ? ttp.users[vote[0]].images.headfront : "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/5/headfront.png";
                            name = (typeof ttp.users[vote[0]] !== "undefined") ? ttp.users[vote[0]].name : "unknown user";
                            if (ttp.prefs.notifications.textOnly) {
                                voteNotification = webkitNotifications.createNotification(
                                    chrome.extension.getURL('/images/' + vote[1] + 'vote.png'),
                                    name,
                                    ''
                                );
                                voteNotification.show();
                                window.setTimeout(function () {
                                    voteNotification.cancel();
                                }, ttp.prefs.notifications.vote.duration);
                            } else {
                                ttp.notifications.push({
                                    type: "vote",
                                    user: name,
                                    vote: vote[1],
                                    avatar: avatar
                                });
                                webkitNotifications.createHTMLNotification('voteNotification.html').show();
                            }
                        });
                    }
                }
            }
            popups = chrome.extension.getViews({type: "popup"});
            if (popups.length > 0) {
                popups[0].updateVotes({
                    downvotes: metadata.downvotes,
                    upvotes: metadata.upvotes
                });
            }
        },
        userBooted: function (userid) {
            var isDj = false,
                x = 0,
                djNotification;

            for (x in ttp.room.metadata.djs) {
                if (ttp.room.metadata.djs[x] === userid) {
                    isDj = true;
                    delete ttp.room.metadata.djs[x];
                    ttp.room.metadata.djs.length -= 1;
                    ttp.room.metadata.djcount -= 1;
                    break;
                }
            }
            if (ttp.prefs.notifications.on && ttp.prefs.notifications.djSpot.on && ttp.room.metadata.djs.length >= (ttp.room.metadata.max_djs - 1) && isDj) {
                ttp.isActive(function () {
                    var name = '',
                        avatar = '';
                    if (ttp.users[userid] !== undefined) {
                        name = ttp.users[userid].name;
                        avatar = ttp.users[userid].images.headfront;
                    }
                    if (ttp.prefs.notifications.textOnly) {
                        djNotification = webkitNotifications.createNotification(
                            chrome.extension.getURL('/images/openSpotSm.png'),
                            name,
                            'has stepped down'
                        );
                        djNotification.show();
                        window.setTimeout(function () {
                            djNotification.cancel();
                        }, ttp.prefs.notifications.djSpot.duration);
                    } else {
                        ttp.notifications.push({
                            type: "djSpot",
                            dj: name,
                            avatar: avatar
                        });
                        webkitNotifications.createHTMLNotification('djNotification.html').show();
                    }
                });
            }
            delete ttp.users[userid];
            if (typeof ttp.room.metadata === "object") {
                ttp.room.metadata.listeners -= 1;
            }
        }
    },
    performSearch: function (searchInfo) {
        var searchString = encodeURIComponent(searchInfo.artist) + '+' + encodeURIComponent(searchInfo.title),
            searchUrl = "http://www.google.com/";
        switch (searchInfo.provider) {
        case "hulkshare":
            searchUrl = 'http://www.google.com/search?op=find_user&sitesearch=http%3A%2F%2Fhulkshare.com&q=' + searchString + '&searchtype=files';
            break;
        case "filestube":
            searchUrl = 'http://www.filestube.com/search.html?q=' + searchString + '&select=All';
            break;
        case "youtube":
            searchUrl = 'http://www.youtube.com/results?search_query=' + searchString;
            break;
        case "soundcloud":
            searchUrl = 'http://soundcloud.com/search?q%5Bfulltext%5D=' + searchString;
            break;
        case "google":
            searchUrl = 'http://www.google.com/search?ie=UTF-8&q=' + searchString;
            break;
        default:
            searchUrl = 'http://www.google.com/search?op=find_user&sitesearch=http%3A%2F%2Fhulkshare.com&q=' + searchString + '&searchtype=files';
        }
        chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.create({
                index: tab.index + 1,
                url: searchUrl
            });
        });
    },
    vote: function (vote) {
        if (vote === "up" || vote === "down") {
            this.exec("ttp.vote('" + vote + "');");
        }
    },
    showDj: function () {
        chrome.tabs.update(this.tabId, {selected: true});
        this.exec("ttp.roommanager.toggle_listener(ttp.roominfo.currentDj)");
    },
    getNotification: function (type) {
        var x = 0,
            length = this.notifications.length,
            i = 0,
            notifyViews;

        for (; x < length; x += 1) {
            if (this.notifications[x].type === type) {
                notifyViews = chrome.extension.getViews({type: "notification"});
                i = notifyViews.length;
                if (i > 0) {
                    while (i--) {
                        if (notifyViews[i].notificationType === type && !notifyViews[i].populated) {
                            notifyViews[i].buildNotification(this.notifications.splice(x, 1)[0]);
                        }
                    }
                }
                break;
            }
        }
    },
    setNotificationSound: function (type, path) {
        this.prefs.notifications[type].sound = path;
        this.savePrefs();
    },
    savePrefs: function () {
        localStorage.ttpPrefs = JSON.stringify(this.prefs);
    },
    loadPrefs: function () {
        try {
            var prefs        = JSON.parse(localStorage.ttpPrefs),
                prefsVersion = prefs.version.split('.'),
                minVersion   = this.minVersion.split('.'),
                valid        = true,
                x            = 0,
                length       = 0;

            for (x = 0, length = minVersion.length; x < length; x += 1) {
                if (+minVersion[x] > +prefsVersion[x]) {
                    valid = false;
                }
            }
            if (!valid) {
                this.prefs = this.upgradePrefs(prefs);
                this.savePrefs();
            } else {
                this.prefs = prefs;
            }
        } catch (e) {}
    },
    upgradePrefs: function (prefs) {
        var prefsVersion = prefs.version.split('.');
        if (+prefsVersion[2] < 34) {
            prefs.notifications.textOnly = false;
            prefs.version = "0.0.34";
        }
        if (+prefsVersion[2] < 40) {
            this.storage.voteHistory = [];
            prefs.version = "0.0.40";
        }
        if (+prefsVersion[1] < 2 || (+prefsVersion[1] === 2 && +prefsVersion[2] < 12)) {
            prefs.roomCustomizationsAllowed = ['4e091b2214169c018f008ea5'];
            prefs.version = "0.2.12";
        }
        if (+prefsVersion[1] < 3 || (+prefsVersion[1] === 3 && +prefsVersion[2] < 2)) {
            prefs.layout = {};
            delete prefs.alternateLayout;
            prefs.version = "0.3.2";
        }
        if (+prefsVersion[1] < 3 || (+prefsVersion[1] === 3 && +prefsVersion[2] < 5)) {
            prefs.changeLayout = true;
            prefs.version = "0.3.5";
        }
        if (+prefsVersion[1] < 3 || (+prefsVersion[1] === 3 && +prefsVersion[2] < 6)) {
            if (prefs.layout.left.top < 0) {
                prefs.layout.left.top = 0;
            }
            if (prefs.layout.left.left < 0) {
                prefs.layout.left.left = 0;
            }
            if (prefs.layout.right.top < 0) {
                prefs.layout.right.top = 0;
            }
            if (prefs.layout.right.left < 0) {
                prefs.layout.right.left = 0;
            }
            prefs.version = "0.3.6";
        }
        return prefs;
    },
    storage: {
        messages: [],
        saveMessage: function (msg) {
            var now = new Date(),
                numMessages = 0;
            this.messages.push({
                userid: msg.userid,
                sender: msg.speaker,
                text: msg.text,
                avatar: msg.avatar,
                timestamp: now.getTime(),
                formattedTime: formatDate(now)
            });
            if (this.messages.length > 500) {
                numMessages = this.messages.length - 500;
                this.messages.splice(0, numMessages);
            }
            localStorage.ttpMessages = JSON.stringify(this.messages);
        },
        removeMessage: function (msgId) {
            if (msgId === 'all') {
                this.messages = [];
            } else {
                this.messages.splice(msgId, 1);
            }
            localStorage.ttpMessages = JSON.stringify(this.messages);
        },
        favoriteSongs: [],
        favoriteSong: function (song) {

        },
        removeSong: function (songId) {

        },
        voteHistory: [],
        logVote: function (vote, songId) {
            var x = 0,
                length = 0,
                now = new Date();

            for (x = 0, length = this.voteHistory.length; x < length; x += 1) {
                if (this.voteHistory[x].songId === songId) {
                    this.voteHistory.splice(x, 1);
                    break;
                }
            }
            this.voteHistory.push({
                songId: songId,
                vote: vote,
                timestamp: now.getTime(),
                formattedTime: formatDate(now)
            });
            localStorage.ttpVoteHistory = JSON.stringify(this.voteHistory);
        },
        getVote: function (songId) {
            var x = 0,
                length = 0;
            for (x = 0, length = this.voteHistory.length; x < length; x += 1) {
                if (this.voteHistory[x].songId === songId) {
                    return this.voteHistory[x];
                }
            }
            return false;
        },
        ignoredUsers: [],
        ignoreUser: function (userid) {
            var x = 0,
                length = 0;

            for (x = 0, length = this.ignoredUsers.length; x < length; x += 1) {
                if (this.ignoredUsers[x] === userid) {
                    return;
                }
            }
            this.ignoredUsers.push(userid);
            localStorage.ttpIgnoredUsers = JSON.stringify(this.ignoredUsers);
        },
        unignoreUser: function (userid) {
            var x = 0,
                length = 0;

            for (x = 0, length = this.ignoredUsers.length; x < length; x += 1) {
                if (this.ignoredUsers[x] === userid) {
                    this.ignoredUsers.splice(x, 1);
                }
            }
            localStorage.ttpIgnoredUsers = JSON.stringify(this.ignoredUsers);
        },
        isIgnored: function (userid) {
            var x = 0,
                length = 0;

            for (x = 0, length = this.ignoredUsers.length; x < length; x += 1) {
                if (this.ignoredUsers[x] === userid) {
                    return true;
                }
            }
            return false;
        }
    }
};

// monitor activity
chrome.idle.onStateChanged.addListener(function (state) {
    var missedNotification;

    if (ttp.logging.idle || ttp.logging.all) {
        ttp.log('stateChanged:', state);
    }
    if (state !== 'active') {
        return;
    }
    if (ttp.missedNotifications < 1) {
        return;
    }
    missedNotification = webkitNotifications.createNotification(
        chrome.extension.getURL('/images/alert.png'),
        'You missed ' + ttp.missedNotifications + ' chat notification(s)!',
        'while your machine was locked or idle'
    );
    missedNotification.show();
    window.setTimeout(function () {
        missedNotification.cancel();
    }, 20000);
    ttp.missedNotifications = 0;
});

// monitor tabs to inject listener
chrome.tabs.onCreated.addListener(function (tab) {
    if (ttp.logging.tabs || ttp.logging.all) {
        ttp.log('Chrome tab created:', tab);
    }
    if (tab.url !== "undefined" && ttp.ttRoom_re.test(tab.url)) {
        ttp.chatMessages = [];
        ttp.notifications = [];
        ttp.msgId = 0;
        ttp.tabId = tab.id;
        ttp.injectListener();
        window.setupTimeout = window.setTimeout(ttp.setupRoom, 10000, {makeRequest: true});
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (ttp.logging.tabs || ttp.logging.all) {
        ttp.log('Chrome tabs updated:', changeInfo, tab);
    }
    if (tab.url !== "undefined" && changeInfo.status === "complete") {
        if (ttp.tabId === tabId && !ttp.ttRoom_re.test(tab.url)) {
            ttp.tabId   = null;
            ttp.room    = null;
            ttp.users   = null;
        } else if (ttp.ttRoom_re.test(tab.url)) {
            if (ttp.tabId !== tabId || ttp.port === null) {
                ttp.chatMessages = [];
                ttp.notifications = [];
                ttp.msgId = 0;
                ttp.tabId = tabId;
                ttp.injectListener();
                window.setupTimeout = window.setTimeout(ttp.setupRoom, 10000, {makeRequest: true});
            }
        }
    }
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (ttp.logging.tabs || ttp.logging.all) {
        ttp.log('Chrome tab removed:', tabId, removeInfo);
    }
    if (tabId === ttp.tabId) {
        ttp.tabId   = null;
        ttp.room    = null;
        ttp.users   = null;
    }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
    if (ttp.logging.tabs || ttp.logging.all) {
        ttp.log('Chrome tab activated:', activeInfo);
    }
});

// handle requests
chrome.extension.onConnect.addListener(function (port) {
    ttp.port = port;
    if (ttp.logging.port || ttp.logging.all) {
        ttp.log('port connection established:', port);
    }

    port.onMessage.addListener(function (request) {
        var id,
            x,
            length,
            callback,
            msg;

        if (typeof ttp.tabId !== "number") {
            if (ttp.logging.all) {
                ttp.log('No tabId - fetching');
            }
            ttp.getTurntableTabId(function (tabId) {
                if (ttp.logging.all) {
                    ttp.log('Found tabId - ', tabId);
                }
                ttp.tabId = tabId;
            });
        }

        // see if it's a response to a request
        if (typeof request.msgId === "number" && request.source === 'background' && typeof request.response !== "undefined") {
            for (x = 0, length = ttp.msgCallbacks.length; x < length; x += 1) {
                if (ttp.msgCallbacks[x] !== undefined && ttp.msgCallbacks[x][0] === request.msgId) {
                    callback = ttp.msgCallbacks.splice(x, 1);
                    callback[0][1](request.response, request.msgId);
                }
            }
            return;
        } else if (typeof request.data === "string") {
            // else process data pushed by turntable
            msg = JSON.parse(window.unescape(request.data));
            if (ttp.logging.receive || ttp.logging.all) {
                ttp.log('received:', msg);
            }
            if (request.type === "ttMessage") {
                if (typeof msg === "object" && typeof msg.command === "string") {
                    if (ttp.logging[msg.command] && !ttp.logging.all) {
                        ttp.log(msg);
                    }
                    switch (msg.command) {
                    case "speak":
                        ttp.processChatMsg(msg);
                        //{"command":"speak","userid":"4e2e56564fe7d015d5030c5d","name":"Dr Tran","text":"Shut your mouth you dirty whore"}
                        break;
                    case "registered":
                        ttp.userMessages.newUser(msg.user[0]);
                        //{"command":"registered","user":[{"name":"headphone hero","created":1310568252.55,"laptop":"pc","userid":"4e1daf3ca3f75162f31453e8","acl":0,"fans":2,"points":0,"avatarid":5}],"success":true}
                        break;
                    case "deregistered":
                        ttp.userMessages.remUser(msg.user[0]);
                        //{"command":"deregistered","user":[{"name":"emcee hesher","created":1309383483.89,"laptop":"mac","userid":"4e0b9b3b4fe7d076af0a081f","acl":0,"fans":5,"points":169,"avatarid":16}],"success":true}
                        break;
                    case "update_votes":
                        ttp.userMessages.vote(msg.room.metadata);
                        //{"command":"update_votes","room":{"metadata":{"upvotes":12,"downvotes":1,"listeners":143,"votelog":[["4e3855c2a3f75118b60f4101","up"]]}},"success":true}
                        //{"command":"update_votes","room":{"metadata":{"upvotes":14,"downvotes":2,"listeners":142,"votelog":[["4e1e3942a3f75107cb02de4f","down"]]}},"success":true}
                        break;
                    //case "update_user":
                    //    if (typeof msg.fans !== "undefined") {
                    //        {"command":"update_user","fans":1,"userid":"4e3011ad4fe7d015eb0998c3"}
                    //    } else if (typeof msg.avatarid !== "undefined") {
                    //        {"command":"update_user","userid":"4e38970ea3f7517833014d03","avatarid":2}
                    //    }
                    //    break;
                    case "add_dj":
                        ttp.userMessages.addDj(msg.user[0]);
                        //{"command":"add_dj","user":[{"name":"paisthereason","created":1310516008.44,"laptop":"pc","userid":"4e1ce328a3f75162f00f93c6","acl":0,"fans":63,"points":1617,"avatarid":36}],"success":true}
                        break;
                    case "rem_dj":
                        ttp.userMessages.remDj(msg.user[0]);
                        //{"command":"rem_dj","user":[{"name":"livyisakitty<3","created":1311653775.18,"laptop":"pc","userid":"4e2e3f8f4fe7d015d202a936","acl":0,"fans":51,"points":608,"avatarid":18}],"success":true}
                        break;
                    case "newsong":
                        if (ttp.logging.songstart && !ttp.logging.all) {
                            ttp.log(msg);
                        }
                        if (ttp.room.metadata && msg.room.metadata.current_song._id !== ttp.room.metadata.songlog[ttp.room.metadata.songlog.length - 1]._id) {
                            ttp.addSong(msg.room);
                        }
                        //{"now":1312339449.93,"command":"newsong","room":{"name":"Dubstep","created":1306076897.12,"shortcut":"dubstep","name_lower":"dubstep","metadata":{"djs":["4e1f4316a3f75107c5092d48","4de9abc74fe7d013dc026ee5","4e1f64144fe7d051130ad920","4dda04ade8a6c44df50000aa","4e2e3f8f4fe7d015d202a936"],"upvotes":0,"privacy":"public","max_djs":5,"downvotes":0,"userid":"4de9abc74fe7d013dc026ee5","listeners":138,"djcount":5,"max_size":200,"moderator_id":"4e2faacea3f7512c88084123","current_song":{"_id":"4e2261e499968e0258002141","metadata":{"album":"","song":"Indica Sativa","artist":"Bare","length":249,"genre":"Dubstep","bitrate":128},"starttime":1312339449.93,"md5":"0987c8f3ce9f6da0d1f7d3fc30958381"},"current_dj":"4dda04ade8a6c44df50000aa","votelog":[]},"roomid":"4dd926e1e8a6c4198c000803","description":"The original dubstep room. Come here to listen music, not argue about it. There is no DJ Queue. http://j.mp/whatisdubstep"},"success":true}
                        break;
                    case "new_moderator":
                        ttp.userMessages.newMod(msg.userid);
                        //{"command":"new_moderator","userid":"4dee9d454fe7d0589304d644","success":true}
                        break;
                    case "rem_moderator":
                        ttp.userMessages.remMod(msg.userid);
                        //{"command":"rem_moderator","userid":"4dee9d454fe7d0589304d644","success":true}
                        break;
                    case "booted_user":
                        ttp.userMessages.userBooted(msg.userid);
                        //{"command":"booted_user","reason":null,"userid":"4e05a6fea3f75175ff091003","success":true}
                        break;
                    default:
                        //console.log(msg);
                    }
                } else if (typeof msg === "object" && typeof msg.room === "object" && typeof msg.users === "object") {
                    if (msg.roomChange) {
                        // room change (not just a refresh of room info)
                        ttp.chatMessages = [];
                        ttp.notifications = [];
                    }
                    ttp.setupRoom(msg);
                } else if (typeof msg === "object" && typeof msg.email === "string" && typeof msg.name === "string" && typeof msg.userid === "string") {
                    ttp.setupUserInfo(msg);
                }
            } else if (request.type === "get" && typeof msg.get === "string") {
                if (msg.get === "preferences") {
                    ttp.send({
                        msgId: request.msgId,
                        source: request.source,
                        response: ttp.prefs
                    });
                } else if (msg.get === "layout" && msg.res !== undefined) {
                    ttp.changeLayout(msg.res);
                }
            } else if (request.type === "save") {
                if (typeof msg.layout === "object") {
                    ttp.setLayout(msg.layout);
                } else if (typeof msg.allowRoomCustomization === "string") {
                    x = ttp.prefs.roomCustomizationsAllowed.length;
                    while (x--) {
                        if (ttp.prefs.roomCustomizationsAllowed[x] === msg.allowRoomCustomization) {
                            break;
                        }
                    }
                    if (x === -1) {
                        ttp.prefs.roomCustomizationsAllowed.push(msg.allowRoomCustomization);
                        ttp.savePrefs();
                    }
                } else if (typeof msg.disallowRoomCuztomization === "string") {
                    x = ttp.prefs.roomCustomizationsAllowed.length;
                    while (x--) {
                        if (ttp.prefs.roomCustomizationsAllowed[x] === msg.disallowRoomCuztomization) {
                            break;
                        }
                    }
                    if (x !== -1) {
                        ttp.prefs.roomCustomizationsAllowed.splice(x, 1);
                        ttp.savePrefs();
                    }
                }
            } else if (request.type === "ttpMessage") {
                if (msg === "Listener Ready") {
                    // do something
                }
            }
        }
    });
    port.onDisconnect.addListener(function () {
        ttp.port = null;
    });
});

// load data from local storage
if (localStorage.ttpPrefs !== undefined && localStorage.ttpPrefs.length > 0) {
    ttp.loadPrefs();
}
if (localStorage.ttpMessages !== undefined && localStorage.ttpMessages.length > 0) {
    ttp.storage.messages = JSON.parse(localStorage.ttpMessages);
}
if (localStorage.ttpVoteHistory !== undefined && localStorage.ttpVoteHistory.length > 0) {
    ttp.storage.voteHistory = JSON.parse(localStorage.ttpVoteHistory);
}
if (localStorage.ttpIgnoredUsers !== undefined && localStorage.ttpIgnoredUsers.length > 0) {
    ttp.storage.ignoredUsers = JSON.parse(localStorage.ttpIgnoredUsers);
}

// get this party started
ttp.getTurntableTabId(function (tabId) {
    if (tabId !== false) {
        ttp.chatMessages = [];
        ttp.notifications = [];
        ttp.msgId = 0;
        ttp.tabId = tabId;
        ttp.injectListener();
        window.setupTimeout = window.setTimeout(ttp.setupRoom, 4000, {makeRequest: true});
    }
}, true);

window.setTimeout(function () {
    // add Google Analytics
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-24876382-1']);
    _gaq.push(['_trackPageview']);
    _gaq.push(['_trackEvent', 'Version', ttp.version]);

    (function () {
        var ga = document.createElement('script'),
            s;
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();
}, 10000);

// little helper functions
RegExp.escape = function (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

String.prototype.padLeft = function (padding, char) {
    var output = '',
        x = 0,
        length = this.length;

    if (length < padding) {
        length = padding - length;
        for (x = 0; x < length; x += 1) {
            output += char;
        }
    }
    return output + this;
};

function formatDate(date, hour24) {
    var hours = date.getHours(),
        abbr = '';
    if (!hour24) {
        if (hours >= 12) {
            if (hours > 12) {
                hours -= 12;
            }
            abbr = ' PM';
        } else {
            abbr = ' AM';
        }
    }
    return date.getFullYear() + '-' + (date.getMonth() + 1).toString().padLeft(2, '0') + '-' + date.getDate().toString().padLeft(2, '0') + ' ' + hours.toString().padLeft(2, '0') + ':' + date.getMinutes().toString().padLeft(2, '0') + ':' + date.getSeconds().toString().padLeft(2, '0') + abbr;
}
