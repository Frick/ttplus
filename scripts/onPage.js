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
    request: function (request, callback) {
        var requestString,
            deferred;
        if (request.api === "room.now") {
            if (util.now() < turntable.syncServerClockLast + 10000) {
                return false;
            }
            turntable.syncServerClockLast = util.now();
        }
        request.msgid = turntable.messageId;
        turntable.messageId += 1;
        request.clientid = turntable.clientId;
        if (turntable.user.id && !request.userid) {
            request.userid = turntable.user.id;
            request.userauth = turntable.user.auth;
        }
        requestString = JSON.stringify(request);
        if (turntable.socketVerbose) LOG(util.nowStr() + " Preparing message " + requestString);
        deferred = $.Deferred();
        turntable.whenSocketConnected(function() {
            if (turntable.socketVerbose) {
                LOG(util.nowStr() + " Sending message " + request.msgid + " to " + turntable.socket.host);
            }
            turntable.socket.send(requestString);
            turntable.socketKeepAlive(true);
            turntable.pendingCalls.push({
                msgid: request.msgid,
                handler: callback,
                deferred: deferred
            });
        });
        return deferred.promise();
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
            if (msg.command === "update_votes") {
                for (x = 0, length = msg.room.metadata.votelog.length; x < length; x += 1) {
                    user = turntable[ttp.roominfo].users[msg.room.metadata.votelog[x][0]];
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
                if (turntable[ttp.roominfo].users[msg.userid]) {
                    turntable[ttp.roominfo].users[msg.userid].lastActivity = now;
                }
                $("#user" + msg.userid).attr("ttplastactivity", now);
            } else if (msg.command === "newsong") {
                ttp.room.upvotes = 0;
                ttp.room.downvotes = 0;
                ttp.room.hearts = 0;
                ttp.room.upvoters = [];
                $("#ttpUsersList .ttpUsersList .ttpUser").removeClass("ttpUserUpVote").removeClass("ttpUserDownVote");
                $("#ttpRoomUpvotes").text("0");
                $("#ttpRoomDownvotes").text("0");
                $("#ttpRoomHearts").text("0");
                msg.room.metadata.current_dj;
            } else if (msg.command === "registered") {
                for (x = 0, length = msg.user.length; x < length; x += 1) {
                    userid = msg.user[x].userid;
                    window.setTimeout(function () {
                        if (turntable[ttp.roominfo].users[userid] !== undefined) {
                            turntable[ttp.roominfo].users[userid].lastActivity = now;
                        }
                    }, 500);
                }
            } else if (msg.command === "snagged") {
                if (ttp.room.hearts === undefined) {
                    ttp.room.hearts = 0;
                }
                ttp.room.hearts += 1;
                $("#ttpRoomHearts").text(ttp.room.hearts);
            }
        } else if (typeof msg.users === "object" && typeof msg.room === "object" && typeof msg.room.metadata === "object" && typeof msg.room.metadata.songlog === "object") {
            if (ttp.roomLocation !== window.location.pathname) {
                msg.roomChange = true;
                ttp.roomLocation = window.location.pathname;
                ttp.startTime = ttp.now();
                $("#ttpRoomHearts").text("0");
                $('#ttpUsersList .ttpUsersList .ttpUser').remove();
            }
        }
        messageDiv = document.getElementById("ttpTurntableMessage");
        messageDiv.innerText = escape(JSON.stringify(msg));
        messageDiv.dispatchEvent(ttp.event);
    },
    songStart: function (msg) {
        var room = turntable[ttp.roominfo],
            users = room.users,
            listeners = 0,
            md = {
                current_song: turntable[ttp.roominfo].currentSong,
                current_dj: room.currentDj,
                djcount: room.djIds.length,
                djs: room.djIds,
                listeners: 0,
                moderator_id: room.moderators
            },
            x = 0,
            length = users.length,
            songStartDiv;

        for (; x < length; x += 1) {
            listeners += 1;
        }
        md.listeners = listeners - 1;
        songStartDiv = document.getElementById("ttpSongStart");
        songStartDiv.innerText = escape(JSON.stringify({metadata: md}));
        songStartDiv.dispatchEvent(ttp.event);
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
    }
}
ttp.event.initEvent("ttpEvent", true, true);
ttp.enterKey.initKeyboardEvent("keypress", true, true, null, false, false, false, false, 13, 2386);
ttp.startTime = ttp.now();
ttp.idleInterval = window.setInterval(ttp.updateIdleTimes, 1000);

turntable.addEventListener("message", ttp.newMessage);
turntable.addEventListener("trackstart", ttp.songStart);

$(document).ready(function () {
    var x,
        y,
        getRoomObjects;

    getRoomObjects = function () {
        for (var x in turntable) {
            if (typeof turntable[x] === "object" && turntable[x] !== null) {
                if (turntable[x].hasOwnProperty("roomId") && turntable[x].roomId === window.TURNTABLE_ROOMID) {
                    ttp.roominfo = x;
                    break;
                }
            }
        }
        if (ttp.roominfo !== null) {
            for (var x in turntable[ttp.roominfo]) {
                if (typeof turntable[ttp.roominfo][x] === "object" && turntable[ttp.roominfo][x] !== null) {
                    if (turntable[ttp.roominfo][x].hasOwnProperty("myuserid") && turntable[ttp.roominfo][x].myuserid === turntable.user.id) {
                        ttp.roommanager = x;
                        break;
                    }
                }
            }
        }
        if (ttp.roominfo === null || ttp.roommanager === null) {
            window.setTimeout(getRoomObjects, 500);
        } else {
            ttp.ttpMessage("TT Objects Ready");
        }
    }
    getRoomObjects();
});

ttp.ttpMessage("Listener Ready");

String.prototype.padLeft = function (length, char) {
    var output = "",
        i = 0;
    if (this.length < length) {
        length = length - this.length;
        for (; i < length; i++) {
            output += char;
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
