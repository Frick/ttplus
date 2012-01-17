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
    getRoomObjects: function (roomChange) {
        var x;

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
        if (ttp.roominfo === null || ttp.roommanager === null) {
            window.setTimeout(ttp.getRoomObjects, 100, roomChange);
        } else if (roomChange !== true) {
            ttp.ttpMessage("TT Objects Ready");
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
                ttp.room.current_dj = msg.room.metadata.current_dj;
                $("#ttpUsersList .ttpUsersList .ttpUser").removeClass("ttpUserUpVote").removeClass("ttpUserDownVote");
                $("#ttpRoomUpvotes").text("0");
                $("#ttpRoomDownvotes").text("0");
                $("#ttpRoomHearts").text("0");
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
            }
        } else if (typeof msg.users === "object" && typeof msg.room === "object" && typeof msg.room.metadata === "object" && typeof msg.room.metadata.songlog === "object") {
            if (ttp.roomLocation !== window.location.pathname) {
                msg.roomChange = true;
                ttp.getRoomObjects(true);
                ttp.roomLocation = window.location.pathname;
                ttp.startTime = ttp.now();
                $("#ttpRoomHearts").text("0");
                $('#ttpUsersList .ttpUsersList .ttpUser').remove();
            }
            ttp.room.current_dj = msg.room.metadata.current_dj;
        }
        messageDiv = document.getElementById("ttpTurntableMessage");
        messageDiv.innerText = escape(JSON.stringify(msg));
        messageDiv.dispatchEvent(ttp.event);
    },
    songStart: function (msg) {
        var room = ttp.roominfo,
            users = room.users,
            listeners = 0,
            md = {
                current_song: ttp.roominfo.currentSong,
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
    }
}
ttp.event.initEvent("ttpEvent", true, true);
ttp.enterKey.initKeyboardEvent("keypress", true, true, null, false, false, false, false, 13, 2386);
ttp.startTime = ttp.now();
ttp.idleInterval = window.setInterval(ttp.updateIdleTimes, 1000);

turntable.addEventListener("message", ttp.newMessage);
turntable.addEventListener("trackstart", ttp.songStart);

ttp.ttpMessage("Listener Ready");

$(document).ready(ttp.getRoomObjects);

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
