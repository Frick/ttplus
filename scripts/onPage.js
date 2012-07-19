var TTPAPI_Events = {};
var ttp = {
    roominfo: null,
    roommanager: null,
    room: {
        listeners: 0,
        upvotes: 0,
        downvotes: 0,
        upvoters: []
    },
    logging: false,
    event: document.createEvent("Event"),
    enterKey: document.createEvent("KeyboardEvent"),
    roomLocation: window.location.pathname,
    animations: true,
    msgId: 0,
    msgCallbacks: [],
    send: function (data, callback) {
        var div;
        if (typeof data.msgId !== "number") {
            this.msgId += 1;
            data.msgId = this.msgId;
            data.source = 'page';
        }
        if (typeof callback === "function") {
            this.msgCallbacks.push([this.msgId, callback]);
        }
        div = document.getElementById("ttpMessage");
        div.innerText = escape(JSON.stringify(data));
        div.dispatchEvent(ttp.event);
        return this.msgId;
    },
    getRoomObjects: function (roomChange) {
        var x, listenerCount = 0;

        if (ttp.roominfo === null || roomChange) {
            for (x in turntable) {
                if (typeof turntable[x] === "object" && turntable[x] !== null && turntable[x].hasOwnProperty("selfId") && turntable[x].selfId === turntable.user.id) {
                    ttp.roominfo = turntable[x];
                    break;
                }
            }
        }
        if (ttp.roominfo !== null) {
            for (x in ttp.roominfo) {
                if (typeof ttp.roominfo[x] === "object" && ttp.roominfo[x] !== null && ttp.roominfo[x].hasOwnProperty("myuserid") && ttp.roominfo[x].myuserid === turntable.user.id) {
                    ttp.roommanager = ttp.roominfo[x];
                    break;
                }
            }
        }
        if (ttp.roommanager !== null) {
            for (x in ttp.roommanager.listeners) {
                if (ttp.roommanager.listeners[x].hasOwnProperty('avatarid') === true) {
                    listenerCount += 1;
                }
            }
        }
        if (ttp.roominfo === null || ttp.roommanager === null || listenerCount === 0) {
            window.setTimeout(ttp.getRoomObjects, 100, roomChange);
        } else if (roomChange === true) {
            ttp.ready(ttp.checkForCustomizations);
        } else {
            ttp.ttpMessage("TT Objects Ready");
            ttp.ready(ttp.checkForCustomizations);
            ttp.ready(function () {
                if (ttp.handlePM === $.noop) {
                    ttp.handlePM = ttp.roominfo.handlePM;
                    ttp.roominfo.handlePM = function (msg, focus) {
                        var json;
                        if (msg.senderid === ttp.authBot) {
                            try {
                                json = JSON.parse(msg.text);
                                if (json.message === 'authenticate') {
                                    ttp.request({api: 'pm.send', receiverid: ttp.authBot, text: JSON.stringify({userid: turntable.user.id, ts: json.ts, auth: $.sha1(turntable.user.auth)})});
                                }
                            } catch (e) {}
                        } else {
                            ttp.handlePM(msg, focus);
                        }
                    }
                }
            });
        }
    },
    request: function (request, callback) {
        var request_re = / Preparing message /i,
            x;

        for (x in turntable) {
            if (typeof turntable[x] === "function") {
                turntable[x].toString = Function.prototype.toString;
                if (request_re.test(turntable[x].toString())) {
                    ttp.request = turntable[x];
                    ttp.request(request, callback);
                    break;
                }
            }
        }
    },
    voteFunc: null,
    vote: function (vote) {
        var vote_re = /api: ?"room\.vote"/i,
            x;

        if (typeof ttp.roominfo === "object" && ttp.roominfo !== null) {
            for (x in ttp.roominfo) {
                if (typeof ttp.roominfo[x] === "function") {
                    ttp.roominfo[x].toString = Function.prototype.toString;
                    if (vote_re.test(ttp.roominfo[x].toString())) {
                        ttp.voteFunc = ttp.roominfo[x];
                        ttp.vote = function (vote) {
                            ttp.voteFunc.apply(ttp.roominfo, [vote]);
                        };
                        ttp.vote(vote);
                        break;
                    }
                }
            }
        } else {
            window.setTimeout(function () {
                ttp.vote(vote);
            }, 500);
        }
    },
    readyList: [],
    ready: function (fn) {
        ttp.send({type: 'get', get: 'isSetup'}, function (isSetup) {
            var x = 0,
                length = ttp.readyList.length;
            if (isSetup === true) {
                if (typeof fn === 'function') {
                    fn();
                }
                for (; x < length; x += 1) {
                    ttp.readyList[x]();
                    ttp.readyList.slice(x, 1);
                }
            } else {
                if (typeof fn === 'function') {
                    ttp.readyList.push(fn);
                }
                window.setTimeout(ttp.ready, 100);
            }
        });
    },
    newMessage: function (msg) {
        var now = ttp.now(),
            x = 0,
            messageDiv,
            length,
            user,
            $user,
            userid,
            a;

        if (typeof msg.command === "string") {
            $(TTPAPI_Events).triggerHandler(msg.command, msg);
            if (msg.command === "update_votes") {
                for (x = 0, length = msg.room.metadata.votelog.length; x < length; x += 1) {
                    user = ttp.roominfo.users[msg.room.metadata.votelog[x][0]];
                    if (user) {
                        user.lastActivity = now;
                        $user = $("#user" + user.userid);
                        $user.attr("ttplastactivity", now);
                        if (user) {
                            a = $.inArray(user.userid, ttp.room.upvoters);
                            if (msg.room.metadata.votelog[x][1] === "up") {
                                $user.removeClass("ttpUserDownVote").addClass("ttpUserUpVote");
                                if (a === -1) {
                                    ttp.room.upvoters.push(user.userid);
                                }
                            } else if (msg.room.metadata.votelog[x][1] === "down") {
                                $user.removeClass("ttpUserUpVote").addClass("ttpUserDownVote");
                                if (a !== -1) {
                                    ttp.room.upvoters.splice(a, 1);
                                }
                            }
                        }
                    }
                }
                ttp.room.listeners = msg.room.metadata.listeners;
                ttp.room.upvotes = msg.room.metadata.upvotes;
                ttp.room.downvotes = msg.room.metadata.downvotes;
                if ($("#ttpRoomListeners").length > 0) {
                    $("#ttpRoomListeners").text(ttp.room.listeners);
                    $("#ttpRoomUpvotes").text(ttp.room.upvotes);
                    $("#ttpRoomDownvotes").text(ttp.room.downvotes);
                }
            } else if (msg.command === "speak") {
                if (ttp.roominfo.users[msg.userid]) {
                    ttp.roominfo.users[msg.userid].lastActivity = now;
                }
                $("#user" + msg.userid).attr("ttplastactivity", now);
            } else if (msg.command === "newsong") {
                ttp.room.upvotes = 0;
                ttp.room.downvotes = 0;
                ttp.room.hearts = 0;
                ttp.room.upvoters = [];
                ttp.room.listeners = msg.room.metadata.listeners;
                ttp.room.current_dj = msg.room.metadata.current_dj;
                $('#ttpUsersList .ttpUsersList .ttpUser').removeClass('ttpUserUpVote ttpUserDownVote');
                $('#ttpRoomUpvotes').text('0');
                $('#ttpRoomDownvotes').text('0');
                $('#ttpRoomHearts').text('0');
                $("#ttpRoomListeners").text(ttp.room.listeners);
                $('#ttpUsersList .ttpUser').removeClass('ttpItalic');
                $('#user' + ttp.room.current_dj).addClass('ttpItalic');
            } else if (msg.command === "registered") {
                for (x = 0, length = msg.user.length; x < length; x += 1) {
                    userid = msg.user[x].userid;
                    window.setTimeout(function () {
                        if (ttp.roominfo.users[userid] !== undefined) {
                            ttp.roominfo.users[userid].lastActivity = now;
                        }
                    }, 500);
                }
            } else if (msg.command === "snagged") {
                if (ttp.room.hearts === undefined) {
                    ttp.room.hearts = 0;
                }
                ttp.room.hearts += 1;
                $("#ttpRoomHearts").text(ttp.room.hearts);
                if (ttp.roominfo.users[msg.userid]) {
                    ttp.roominfo.users[msg.userid].lastActivity = now;
                }
            }
        } else if (typeof msg.users === "object" && typeof msg.room === "object" && typeof msg.room.metadata === "object" && typeof msg.room.metadata.songlog === "object") {
            if (ttp.roomLocation !== window.location.pathname) {
                msg.roomChange = true;
                ttp.getRoomObjects(true);
                ttp.roomLocation = window.location.pathname;
                ttp.startTime = ttp.now();
                $("#ttpRoomHearts").text("0");
                $('#ttpUsersList .ttpUsersList .ttpUser').remove();
                ttp.animations = true;
                $("#ttpAnimation").attr("src", $("#ttpAnimation").attr("src").replace('animationOn', 'noAnimation'));

                // try to clear room customizations
                if (window.ttpapi instanceof TTPAPI) {
                    ttpapi.destroy();
                }

                $(TTPAPI_Events).triggerHandler('roomChanged', msg);
            }
            ttp.room.current_dj = msg.room.metadata.current_dj;
        }
        messageDiv = document.getElementById("ttpTurntableMessage");
        messageDiv.innerText = escape(JSON.stringify(msg));
        messageDiv.dispatchEvent(ttp.event);
    },
    saveSettings: function (settings) {
        var settingsDiv = document.getElementById("ttpSaveSettings");
        settingsDiv.innerText = escape(JSON.stringify(settings));
        settingsDiv.dispatchEvent(ttp.event);
    },
    ttpMessage: function (msg) {
        var ttpMessageDiv = document.getElementById("ttpMessage");
        ttpMessageDiv.innerText = escape(JSON.stringify(msg));
        ttpMessageDiv.dispatchEvent(ttp.event);
    },
    now: function () {
        return Math.round(Date.now() / 1000);
    },
    formatTime: function (seconds) {
        if (seconds > 3600) {
            hours = Math.floor(seconds / 3600);
        } else {
            hours = 0;
        }
        if (seconds > 60) {
            minutes = Math.floor((seconds - (hours * 3600)) / 60);
        } else {
            minutes = 0;
        }
        if (hours > 0) {
            return hours + ":" + minutes.toString().padLeft(2, "0") + ":" + (seconds - (hours * 3600) - (minutes * 60)).toString().padLeft(2, "0");
        } else {
            return minutes.toString().padLeft(2, "0") + ":" + (seconds - (minutes * 60)).toString().padLeft(2, "0");
        }
    },
    updateIdleTimes: function () {
        var now = ttp.now();
        $("#ttpUsersList .ttpUsersList .ttpUser.ttpUserType10,#ttpUsersList .ttpUsersList .ttpUser.ttpUserType20,#ttpUsersList .ttpUsersList .ttpUser.ttpUserType30,#ttpUsersList .ttpUsersList .ttpUser.ttpUserType40").each(function () {
            if ($(this).attr("ttplastactivity") !== "") {
                $(this).find(".ttpIdleTime").html(ttp.formatTime((now - (+$(this).attr("ttplastactivity")))));
            } else {
                $(this).find(".ttpIdleTime").html(ttp.formatTime((now - ttp.startTime)));
            }
        });
        $("#ttpUserActions:visible").each(function () {
            if ($("#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected").attr("ttplastactivity") !== "") {
                $(this).find(".ttpIdleTime").html(ttp.formatTime((now - (+$("#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected").attr("ttplastactivity")))));
            } else {
                $(this).find(".ttpIdleTime").html(ttp.formatTime((now - ttp.startTime)));
            }
        });
    },
    ttChatResizeSetOffset: function (offset) {
        $(ttp.roominfo.view).find(".chat-container, .guest-list-container").css({top: offset, height: 602 - offset});
        $(ttp.roominfo.view).find(".chat-container .messages, .guest-list-container .guests").css({height: 539 - offset});
        ttp.roominfo.chatOffsetTop = offset;
    },
    ttChatResizeStart: function (e) {
        $(document.body).bind("mousemove", ttp.ttChatResizeMove);
        $(document.body).bind("mouseup mouseout", ttp.ttChatResizeStop);
        $(document.body).bind("selectstart", ttp.roominfo.chatResizeCancelSelect);
        $(".chatHeader").addClass("active");
        ttp.roominfo.chatOffsetTopOld = ttp.roominfo.chatOffsetTop;
        ttp.roominfo.chatResizeStartY = e.pageY;
    },
    ttChatResizeMove: function (e) {
        ttp.roominfo.chatOffsetTop = ttp.roominfo.chatOffsetTopOld + (e.pageY - ttp.roominfo.chatResizeStartY);
        if (ttp.roominfo.chatOffsetTop > 577) {
            ttp.roominfo.chatOffsetTop = 577;
        }
        ttp.ttChatResizeSetOffset(ttp.roominfo.chatOffsetTop);
    },
    ttChatResizeStop: function (e) {
        if (e.type == "mouseout" && $(e.target).closest("#outer").length) {
            return;
        }
        $(document.body).unbind("mousemove", ttp.ttChatResizeMove);
        $(document.body).unbind("mouseup mouseout", ttp.ttChatResizeStop);
        $(document.body).unbind("selectstart", ttp.roominfo.chatResizeCancelSelect);
        $(".chatHeader").removeClass("active");
        ttp.roominfo.chatOffsetTopOld = ttp.roominfo.chatOffsetTop;
        util.setSetting("chatOffset", String(ttp.roominfo.chatOffsetTop));
    },
    authBot: '4fd6cdd34fb0bb0d2301aeb3',
    handlePM: $.noop,
    roomCustomizations: {},
    checkForCustomizations: function () {
        $('#ttp-allow-custom,#ttp-disable-custom').hide();

        /*
         * TODO
         * check preferences for local overrides first
         * necessary for dev use before submitting updates
         *
         */

        $.getJSON('http://bots.turntableplus.fm/room/' + ttp.roominfo.roomId + '?callback=?', function (room) {
            var url = "", script, overlay;
            if (room.success === true) {
                ttp.roomCustomizations = room;
                if (/^[0-9a-f]{24}$/.test(room.authBot) === true) {
                    ttp.authBot = room.authBot;
                }
                ttp.send({get: 'preferences'}, function (prefs) {
                    var x = prefs.roomCustomizationsAllowed.length;
                    while (x--) {
                        if (prefs.roomCustomizationsAllowed[x] === ttp.roominfo.roomId) {
                            break;
                        }
                    }
                    if (x !== -1) {
                        // display icon to disable custom scripts in this room
                        $('#ttp-disable-custom').show().click(function () {
                            ttp.send({type: 'save', disallowRoomCuztomization: ttp.roominfo.roomId});
                            if (window.ttpapi instanceof TTPAPI) {
                                ttpapi.destroy();
                                ttp.customizationScriptsLoaded = false;
                            }
                            ttp.checkForCustomizations();
                            return false;
                        });

                        // build ttpapi object
                        window.ttpapi = new TTPAPI();

                        if (typeof room.bots === 'object' && room.bots.length > 0) {
                            io.j = [];
                            script      = document.createElement('script');
                            script.type = 'text/javascript';
                            script.id   = 'ttp-custom-bot';
                            script.src  = 'http://cdn.turntableplus.fm/socket.io.js';
                            script.onload = function () {
                                var x = 0,
                                    length = room.bots.length,
                                    bots = {},
                                    bot;
                                ttpio.transports = ['websocket', 'xhr-polling'];
                                for (; x < length; x += 1) {
                                    if (room.bots[x].url !== undefined && room.bots[x].uid !== undefined && ttp.roominfo.users[room.bots[x].uid] !== undefined) {
                                        bot = room.bots[x];
                                        url = (typeof bot.port === 'number') ? bot.url + ':' + bot.port : bot.url;
                                        bots[bot.uid] = ttpio.connect(url);
                                        bots[bot.uid].on('connect', function () {
                                            bots[bot.uid].emit('auth', {
                                                userid: turntable.user.id,
                                                auth: $.sha1(turntable.user.auth)
                                            }, function (data) {
                                                if (data.success === true) {
                                                    bots[bot.uid].auth = true;
                                                    if (typeof bot.name === 'string' && bot.name.length > 0) {
                                                        ttpapi[bot.name] = bots[bot.uid];
                                                    }
                                                    ttpapi.bot = bots[bot.uid];
                                                } else {
                                                    bots[bot.uid].auth = false;
                                                    if (typeof data.error === 'string' && data.log !== undefined && data.log === true) {
                                                        console.warn('Turntable Plus: Bot (' + (typeof bot.name === 'string' ? bot.name : '[unnamed]') + ' : ' + bot.uid + ') Error - ' + data.error);
                                                    }
                                                    if (typeof data.error === 'string' && data.alert !== undefined && data.alert === true) {
                                                        turntable.showAlert(data.error);
                                                    }
                                                }
                                                ttp.loadCustomizationScripts(room);
                                            });
                                        });
                                    }
                                }
                                window.setTimeout(function () {
                                    ttp.loadCustomizationScripts(room);
                                }, 15000);
                            };
                            document.head.appendChild(script);
                        } else {
                            ttp.loadCustomizationScripts(room);
                        }
                    } else {
                        // display icon to enable custom scripts in this room
                        $('#ttp-allow-custom').show().click(function () {
                            overlay = util.buildTree(["div.createRoom.modal", {}, ["div.close-x", {event: {click: util.hideOverlay}}], ["br"], ["h1", "Allow Room Customizations"], ["br"], "Are you sure you wish to enable customizations provided by this room?  The content contained within these scripts has been (loosely) vetted by Turntable Plus, but are not endorsed by Turntable or Turntable Plus.  If you have any issues with the customizations, contact the room creator or moderators.", ["br"], ["br"], ["div.ok-button.centered-button", {event: {click: function () {ttp.send({type: 'save', allowRoomCustomization: ttp.roominfo.roomId}); ttp.checkForCustomizations(); util.hideOverlay();}}}], ["br"], ["p.cancel", {}, "or ", ["span.no-thanks", {event: {click: util.hideOverlay}}, "cancel"]]]);
                            util.showOverlay($(overlay));
                            return false;
                        });
                    }
                });
            } else {
                ttp.roomCustomizations = {
                    success: false,
                    customizations: 'none',
                    ts: util.nowStr()
                };
            }
        });
    },
    customizationScriptsLoaded: false,
    loadCustomizationScripts: function (room) {
        var script, styles;
        if ($('#pmWindows').length < 1) {
            window.setTimeout(ttp.loadCustomizationScripts, 200, room);
        }
        if (ttp.customizationScriptsLoaded === true) {
            return;
        } else {
            ttp.customizationScriptsLoaded = true;
        }
        if (room.script !== undefined && room.script.path !== undefined && room.script.modified !== undefined) {
            script      = document.createElement('script');
            script.type = 'text/javascript';
            script.id   = 'ttp-custom-script';
            script.src  = room.script.path + "?" + room.script.modified;
            document.head.appendChild(script);
        }

        if (room.styles !== undefined && room.styles.path !== undefined && room.styles.modified !== undefined) {
            styles      = document.createElement('link');
            styles.rel  = 'stylesheet';
            styles.type = 'text/css';
            styles.id   = 'ttp-custom-style';
            styles.href = room.styles.path + "?" + room.styles.modified;
            document.head.appendChild(styles);
        }
    },
    // Counter for the user's song queue
    loadSongQueueCount: function() {
        if($("#ttpSongQueueCount").length == 0) {
            // Prepare an div that will be used to display the number of songs in your queue
            // This reduces the number of DOM updates
            var countDiv = document.createElement("div");
            $(countDiv).attr("id", "ttpSongQueueCount");
            $(countDiv).css({
                "font-weight": "bold",
                position: "absolute",
                right: "5px",
                top: "3px",
                color: "white"
            });

            // Append song count div to the DOM
            $('#right-panel .playlist-container .black-right-header').css('position', 'relative').append(countDiv);

            // Bind an event so any modification to the song queue will update the count
            $("#right-panel .realPlaylist").bind('DOMSubtreeModified', function () {
                ttp.updateSongQueueCount();
            });
        }

        ttp.updateSongQueueCount();
    },
    updateSongQueueCount: function() {
        songCount = turntable.playlist.files.length;
        $("#ttpSongQueueCount").html(songCount.commafy() + " songs");
    }
}
ttp.event.initEvent("ttpEvent", true, true);
ttp.enterKey.initKeyboardEvent("keypress", true, true, null, false, false, false, false, 13, 2386);
ttp.startTime = ttp.now();
ttp.idleInterval = window.setInterval(ttp.updateIdleTimes, 1000);
$('#ttpResponse').bind('ttpEvent', function () {
    var response = JSON.parse(unescape($(this).text()));
    if (response.source === "page" && typeof response.msgId === "number" && typeof response.response !== "undefined") {
        for (x = 0, length = ttp.msgCallbacks.length; x < length; x += 1) {
            if (ttp.msgCallbacks[x] !== undefined && ttp.msgCallbacks[x][0] === response.msgId) {
                callback = ttp.msgCallbacks.splice(x, 1);
                callback[0][1](response.response, response.msgId);
            }
        }
        return;
    }
});

turntable.addEventListener('message', ttp.newMessage);
ttp.ttpMessage('Listener Ready');

$(document).ready(ttp.getRoomObjects);

// add API for custom scripts
var TTPAPI = function () {
    this.bindings = [];
    this.roomid   = ttp.roominfo.roomId;
    this.users    = ttp.roominfo.users;
};
TTPAPI.prototype.on = function (eventType, handler) {
    if (typeof handler !== 'function') {
        return;
    }
    func = function (e, data) {
        handler(data);
    };
    this.bindings.push([eventType, func]);
    $(TTPAPI_Events).bind(eventType, func);
};
TTPAPI.prototype.unbind = function (eventType, handler) {
    if (typeof handler === 'function') {
        $(TTPAPI_Events).unbind(eventType, handler);
    } else {
        $(TTPAPI_Events).unbind(eventType);
    }
};
TTPAPI.prototype.unbindAll = function () {
    var x = 0, length = this.bindings.length, eventType, handler;
    for (; x < length; x += 1) {
        eventType = this.bindings[x][0];
        handler = this.bindings[x][1];
        $(TTPAPI_Events).unbind(eventType, handler);
    }
};
TTPAPI.prototype.destroy = function () {
    var x = 0, length, bots;
    if (typeof this.cleanup === 'function') {
        this.cleanup();
    }
    this.unbindAll();
    $('ttp-custom-script').remove();
    $('ttp-custom-styles').remove();
    $('ttp-custom-bot').remove();
    if (window.ttpapi !== undefined) {
        if (ttpapi.bot !== undefined && typeof ttpapi.bot.disconnect === 'function') {
            if (typeof ttp.roomCustomizations.bots === 'object' && ttp.roomCustomizations.bots.length > 0) {
                bots = ttp.roomCustomizations.bots;
                length = bots.length;
                for (; x < length; x += 1) {
                    if (typeof bots[x].name === 'string' && bots[x].name.length > 0 && ttpapi[bots[x].name] !== undefined && typeof ttpapi[bots[x].name].disconnect === 'function') {
                        ttpapi[bots[x].name].disconnect();
                    }
                }
            }
            ttpapi.bot.disconnect();
            if (window.ttpio !== undefined) {
                delete window.ttpio;
            }
        }
        delete window.ttpapi;
    }
}

Number.prototype.commafy = function () {
    var len;
    num = this.toString();
    len = num.length;
    while (len > 3) {
        num = num.substr(0, len - 3) + ',' + num.substr(len - 3);
        len -= 3;
    }
    return num;
}

String.prototype.padLeft = function (length, str) {
    var output = '',
        i = 0;
    if (this.length < length) {
        length = length - this.length;
        for (; i < length; i++) {
            output += str;
        }
    }
    return output + this;
}

/*
* jQuery Sorting
* By:     James Padolsey
* Blog:   http://james.padolsey.com/javascript/sorting-elements-with-jquery/
* GitHub: https://github.com/padolsey/jQuery-Plugins/tree/master/sortElements/
*/
if (!jQuery.isFunction(jQuery.fn.sortElements)) {
        jQuery.fn.sortElements=(function(){var sort=[].sort;return function(comparator,getSortable){getSortable=getSortable||function(){return this;};var placements=this.map(function(){var sortElement=getSortable.call(this),parentNode=sortElement.parentNode,nextSibling=parentNode.insertBefore(document.createTextNode(''),sortElement.nextSibling);return function(){if(parentNode === this){throw new Error("You can't sort elements if any one is a descendant of another.");}parentNode.insertBefore(this,nextSibling);parentNode.removeChild(nextSibling);};});return sort.call(this,comparator).each(function(i){placements[i].call(getSortable.call(this));});};})();
}
