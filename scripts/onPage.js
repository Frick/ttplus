var TTPAPI_Events = {};
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
var ttp = {
    roominfo: null,
    roommanager: null,
    isReady: false,
    resizeHandlerAdded: false,
    room: {
        listeners: 0,
        upvotes: 0,
        downvotes: 0,
        downvoters: [],
        hearts: 0,
        snaggers: []
    },
    logging: false,
    event: document.createEvent("Event"),
    enterKey: document.createEvent("KeyboardEvent"),
    roomLocation: window.location.pathname,
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
        var x, prop, listenerCount = 0;

        if (ttp.roominfo === null || roomChange) {
            for (x in turntable) {
                prop = turntable[x];
                if (typeof prop === "object" && prop !== null && typeof prop.setupRoom !== 'undefined') {
                    ttp.roominfo = prop;
                    break;
                }
            }
        }
        if (ttp.roominfo !== null) {
            for (x in ttp.roominfo) {
                prop = ttp.roominfo[x];
                if (typeof prop === "object" && prop !== null && prop.hasOwnProperty("autoCamera")) {
                    ttp.roommanager = prop;
                    break;
                }
            }
        }
        if (ttp.roommanager !== null) {
            for (x in ttp.roommanager.listenerMap) {
                if (ttp.roommanager.listenerMap[x].hasOwnProperty('height')) {
                    listenerCount += 1;
                }
            }
        }
        if (ttp.roominfo === null || ttp.roommanager === null || listenerCount === 0) {
            window.setTimeout(ttp.getRoomObjects, 100, roomChange);
        } else if (roomChange === true) {
            //ttp.ready(ttp.checkForCustomizations);
            ttp.isReady = true;
            ttp.roominfo.muted = false;
        } else {
            ttp.isReady = true;
            ttp.ttpMessage("TT Objects Ready");
            ttp.roominfo.muted = false;
            /*ttp.ready(ttp.checkForCustomizations);
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
            });*/
        }
    },
    request: function (request, callback) {
        var request_re = / Preparing message /i,
            x;

        for (x in turntable) {
            if (typeof turntable[x] !== "function") continue;
            if (request_re.test(Function.prototype.toString.apply(turntable[x]))) {
                ttp.request = turntable[x];
                ttp.request(request, callback);
                break;
            }
        }
    },
    idleTime: 0,
    updateIdleTime: function () {
        var idle_re = /\.on\("focus keydown mousemove mousedown", *\w+.rateLimit\([^.]+\.(\w+) *= *\w+\.now\(\)/,
            x,
            match;

        for (x in turntable) {
            if (typeof turntable[x] !== "function") continue;
            if ((match = idle_re.exec(Function.prototype.toString.apply(turntable[x]))) !== null) {
                ttp.idleTime = match[1];
                turntable[ttp.idleTime] = util.now();
                ttp.updateIdleTime = function () {
                    turntable[ttp.idleTime] = util.now();
                };
            }
        }
    },
    vote: function (vote) {
        if (vote === "down") {
            vote = "downvote";
            $("#lame-button").addClass("selected");
            $("#awesome-button").removeClass("selected");
        } else {
            vote = "upvote";
            $("#awesome-button").addClass("selected");
            $("#lame-button").removeClass("selected");
        }
        ttp.updateIdleTime();
        ttp.roommanager.callback(vote);
    },
    readyList: [],
    ready: function (fn) {
        var x = 0,
            length = ttp.readyList.length;
        if (ttp.isReady === true) {
            for (; x < length; x += 1) {
                ttp.readyList.shift()();
            }
            if (typeof fn === 'function') {
                fn();
            }
        } else {
            if (typeof fn === 'function') {
                ttp.readyList.push(fn);
            }
            window.setTimeout(ttp.ready, 100);
        }
    },
    getListElByName: function (name) {
        var id = ttp.roominfo.userIdFromName(name);
        return ttp.getListElById(id);
    },
    getListElById: function (id) {
        var output = null;
        $('#guest-list .guests .guest').each(function () {
            if ($(this).data('id') === id) {
                output = $(this);
                return;
            }
        });
        return output;
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
            //$(TTPAPI_Events).triggerHandler(msg.command, msg);
            if (msg.command === "update_votes") {
                for (x = 0, length = msg.room.metadata.votelog.length; x < length; x += 1) {
                    user = ttp.roominfo.userMap[msg.room.metadata.votelog[x][0]];
                    if (user) {
                        user.lastActivity = now;
                        user.lastVote = now;
                        $user = ttp.getListElByName(user.name);
                        if ($user !== null) {
                            $user.data("ttplastactivity", now);
                            $user.data("ttplastvote", now);
                            if (user) {
                                a = $.inArray(user.userid, ttp.room.downvoters);
                                if (msg.room.metadata.votelog[x][1] === "up") {
                                    $user.removeClass("downvoted").addClass("upvoted");
                                    if (a > -1) {
                                        ttp.room.downvoters.splice(a, 1);
                                    }
                                } else if (msg.room.metadata.votelog[x][1] === "down") {
                                    $user.removeClass("upvoted").addClass("downvoted");
                                    if (a === -1) {
                                        ttp.room.downvoters.push(user.userid);
                                    }
                                }
                            }
                        }
                    }
                }
                ttp.room.listeners = msg.room.metadata.listeners;
                ttp.room.upvotes = msg.room.metadata.upvotes;
                ttp.room.downvotes = msg.room.metadata.downvotes;
                $("#ttpUpvotes").text(ttp.room.upvotes);
                $("#ttpDownvotes").text(ttp.room.downvotes);
            } else if (msg.command === "speak") {
                var users = ttp.roominfo.userMap;
                if (users[msg.userid]) {
                    users[msg.userid].lastActivity = now;
                    users[msg.userid].lastChat = now;
                }
                $user = ttp.getListElById(msg.userid);
                if ($user !== null) {
                    $user.data("ttplastactivity", now);
                    $user.data("ttplastchat", now);
                }
            } else if (msg.command === "newsong") {
                ttp.room.upvotes = 0;
                ttp.room.downvotes = 0;
                ttp.room.hearts = 0;
                ttp.room.downvoters = [];
                ttp.room.snaggers = [];
                ttp.room.listeners = msg.room.metadata.listeners;
                ttp.room.current_dj = msg.room.metadata.current_dj;
                ttp.addHeader();
                $('#guest-list .guests .guest').removeClass('upvoted downvoted');
                $('#ttpUpvotes').text('0');
                $('#ttpDownvotes').text('0');
                $('#ttpHearts').text('0');
            } else if (msg.command === "deregistered") {
                for (x = 0, length = msg.user.length; x < length; x += 1) {
                    userid = msg.user[x].userid;
                    user = ttp.roominfo.users[userid];
                    if (user !== undefined) {
                        delete user.lastActivity;
                        delete user.lastChat;
                        delete user.lastVote;
                    }
                }
            } else if (msg.command === "snagged") {
                ttp.room.hearts += 1;
                $("#ttpHearts").text(ttp.room.hearts);
                ttp.room.snaggers.push(msg.userid);
                user = ttp.roominfo.userMap[msg.userid];
                if (user !== undefined) {
                    user.lastActivity = now;
                }
                $user = ttp.getListElById(msg.userid);
                if ($user !== null) {
                    $user.data("ttplastactivity", now);
                    $user.find('.icons').append('<div class="snagged icon"></div>');
                }
            }
        } else if (typeof msg.users === "object" && typeof msg.room === "object" && typeof msg.room.metadata === "object" && typeof msg.room.metadata.songlog === "object") {
            if (ttp.roomLocation !== window.location.pathname) {
                msg.roomChange = true;
                ttp.isReady = false;
                ttp.ready(ttp.replaceFunctions);
                ttp.getRoomObjects(true);
                ttp.roomLocation = window.location.pathname;
                ttp.startTime = ttp.now();
                ttp.room.hearts = 0;
                $("#ttpHearts").text("0");

                ttp.send({
                    get: 'layout',
                    res: $(window).width() + 'x' + $(window).height()
                });

                // try to clear room customizations
                /*if (window.ttpapi instanceof TTPAPI) {
                    ttpapi.destroy();
                }

                $(TTPAPI_Events).triggerHandler('roomChanged', msg);*/
            }
            ttp.room.current_dj = msg.room.metadata.current_dj;
            ttp.room.upvotes = msg.room.metadata.upvotes;
            ttp.room.downvotes = msg.room.metadata.downvotes;

            ttp.addHeader();

            $("#ttpUpvotes").text(ttp.room.upvotes);
            $("#ttpDownvotes").text(ttp.room.downvotes);
        }
        messageDiv = document.getElementById("ttpTurntableMessage");
        messageDiv.innerText = escape(JSON.stringify(msg));
        messageDiv.dispatchEvent(ttp.event);
    },
    addHeader: function () {
        var header = '';
        if ((ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible') && $('#left-panel .ttpHeader').length > 0) || (ttp.roominfo.layout === 'single' && $('#right-panel .ttpHeader').length > 0)) {
            return;
        }
        header = '<div class="ttpHeader">' +
                    '<span style="padding: 0 0 0 5px;">Votes: </span>' +
                    '<span id="ttpHearts" title="Number of Times Queued">' + ttp.room.hearts + '</span>' +
                    '<span id="ttpUpvotes" title="Awesomes">' + ttp.room.upvotes + '</span>' +
                    '<span id="ttpDownvotes" title="Lames">' + ttp.room.downvotes + '</span>' +
                '</div>';
        if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
            $('.selected #chat').attr('style', 'top: 36px !important;');
            $('.ttpHeader').remove();
            $('#left-panel').prepend(header);
        } else if (ttp.roominfo.layout === 'single') {
            $('.selected #chat').attr('style', '');
            $('.ttpHeader').remove();
            $('#right-panel').prepend(header);
        }
    },
    changeLayout: function (layout) {
        var rightHandle = '.ttpHeader',
            rightSnap   = 'body,#header,#board',
            layoutText  = $('#layout-option').attr('original-title'),
            leftPanels  = 0,
            rightPanels = 0,
            $chat       = $('#chat .messages');

        // save layout locally
        ttp.layout = layout;
        ttp.layout.res = $(window).width() + 'x' + $(window).height();

        // stop mousedown events from getting (magically) to the drag handler
        $('#playlist,#guest-list,#song-log,#room-info').on('mousedown', function (e) {e.stopPropagation();});

        // add note to those using the TT layout switch
        if (layoutText.indexOf('TT+') < 0) {
            $('#layout-option').attr('original-title', layoutText + '\n(requires refresh because of TT+)');
        }

        // ensure the header was added (after a room change, perhaps)
        ttp.addHeader();

        // return position of windows to wherever the user last placed them
        if (layout.left !== undefined && layout.right !== undefined) {
            $('#left-panel').css({top: layout.left.top + 'px', left: layout.left.left + 'px', width: layout.left.width + 'px', height: layout.left.height + 'px'});
            $('#right-panel').css({top: layout.right.top + 'px', left: layout.right.left + 'px', right: 'auto', width: layout.right.width + 'px', height: layout.right.height + 'px'});
            if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
                $('#playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(layout.left.width / 2));
                $('#song-search-input').width(layout.left.width - 89);
                $('.chat-container .floating-panel-tab').width(layout.right.width);
                $('#chat-input').width(layout.right.width - 74);
                $('#ttpLeftStyle').remove();
                $('head').append('<style type="text/css" id="ttpLeftStyle">\n' +
                    '#left-panel .guest .guestName { max-width: ' + (layout.left.width - 160) + 'px !important; }\n' +
                    '#left-panel .search-focused #song-search-input { width: ' + (layout.left.width - 45) + 'px !important; }\n' +
                    '</style>');
                $('#ttpRightStyle').remove();
                $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                    '.chat-focused #chat-input { width: ' + (layout.right.width - 30) + 'px !important; }\n' +
                    '</style>');
            } else {
                $('.chat-container .floating-panel-tab, #playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(layout.right.width / 3));
                $('#song-search-input').width(layout.right.width - 89);
                $('#chat-input').width(layout.right.width - 74);
                $('#ttpRightStyle').remove();
                $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                    '.guest .guestName { max-width: ' + (layout.right.width - 160) + 'px !important; }\n' +
                    '.search-focused #song-search-input { width: ' + (layout.right.width - 45) + 'px !important; }\n' +
                    '.chat-focused #chat-input { width: ' + (layout.right.width - 30) + 'px !important; }\n' +
                    '</style>');
            }
        }

        // if 'dual' layout is set...
        if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
            rightHandle = '.chat-container .floating-panel-tab';
            rightSnap += ',#left-panel';
            $(rightHandle).css('cursor', 'move');

            $('#left-panel').resizable({
                minWidth: 256,
                minHeight: 25,
                handles: 'n,ne,e,se,s,sw,w,nw',
                resize: function (event, ui) {
                    $('#playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(ui.size.width / 2));
                    $('#song-search-input').width(ui.size.width - 89);
                    $('#left-panel .guest .guestName').attr('style', 'max-width: ' + (ui.size.width - 160) + 'px !important;');
                },
                stop: function(event, ui) {
                    $('#ttpLeftStyle').remove();
                    $('head').append('<style type="text/css" id="ttpLeftStyle">\n' +
                        '#left-panel .guest .guestName { max-width: ' + (ui.size.width - 160) + 'px !important; }\n' +
                        '#left-panel .search-focused #song-search-input { width: ' + (ui.size.width - 45) + 'px !important; }\n' +
                        '</style>');
                    ttp.layout = {
                        res: $(window).width() + 'x' + $(window).height(),
                        left: {
                            top: ui.position.top,
                            left: ui.position.left,
                            width: ui.size.width,
                            height: ui.size.height
                        },
                        right: {
                            top: +$('#right-panel').css('top').replace('px', ''),
                            left: +$('#right-panel').css('left').replace('px', ''),
                            width: $('#right-panel').width(),
                            height: $('#right-panel').height()
                        }
                    }
                    ttp.saveSettings({ layout: ttp.layout });
                }
            }).draggable({
                handle: '#ttpHeader',
                stop: function (event, ui) {
                    ttp.layout = {
                        res: $(window).width() + 'x' + $(window).height(),
                        left: {
                            top: ui.position.top,
                            left: ui.position.left,
                            width: $('#left-panel').width(),
                            height: $('#left-panel').height()
                        },
                        right: {
                            top: +$('#right-panel').css('top').replace('px', ''),
                            left: +$('#right-panel').css('left').replace('px', ''),
                            width: $('#right-panel').width(),
                            height: $('#right-panel').height()
                        }
                    }
                    ttp.saveSettings({ layout: ttp.layout });
                },
                snap: 'body,#header,#right-panel,#board',
                snapTolerance: 10
            });
        }

        $('#right-panel').resizable({
            minWidth: 256,
            minHeight: 25,
            handles: 'n,ne,e,se,s,sw,w,nw',
            resize: function (event, ui) {
                if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
                    $('.chat-container .floating-panel-tab').width(ui.size.width);
                } else {
                    $('.chat-container .floating-panel-tab, #playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(ui.size.width / 3));
                    $('.guest .guestName').attr('style', 'max-width: ' + (ui.size.width - 160) + 'px !important;');
                }
                $('#chat-input').width(ui.size.width - 74);
            },
            stop: function (event, ui) {
                $('#ttpRightStyle').remove();
                if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
                    $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                        '.chat-focused #chat-input { width: ' + (ui.size.width - 30) + 'px !important; }\n' +
                        '</style>');
                } else {
                    $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                        '.guest .guestName { max-width: ' + (ui.size.width - 160) + 'px !important; }\n' +
                        '.search-focused #song-search-input { width: ' + (ui.size.width - 45) + 'px !important; }\n' +
                        '.chat-focused #chat-input { width: ' + (ui.size.width - 30) + 'px !important; }\n' +
                        '</style>');
                }
                ttp.layout = {
                    res: $(window).width() + 'x' + $(window).height(),
                    left: {
                        top: +$('#left-panel').css('top').replace('px', ''),
                        left: +$('#left-panel').css('left').replace('px', ''),
                        width: $('#left-panel').width(),
                        height: $('#left-panel').height()
                    },
                    right: {
                        top: ui.position.top,
                        left: ui.position.left,
                        width: ui.size.width,
                        height: ui.size.height
                    }
                }
                ttp.saveSettings({ layout: ttp.layout });
            }
        }).draggable({
            handle: rightHandle,
            stop: function (event, ui) {
                ttp.layout = {
                    res: $(window).width() + 'x' + $(window).height(),
                    left: {
                        top: +$('#left-panel').css('top').replace('px', ''),
                        left: +$('#left-panel').css('left').replace('px', ''),
                        width: $('#left-panel').width(),
                        height: $('#left-panel').height()
                    },
                    right: {
                        top: ui.position.top,
                        left: ui.position.left,
                        width: $('#right-panel').width(),
                        height: $('#right-panel').height()
                    }
                }
                ttp.saveSettings({ layout: ttp.layout });
            },
            snap: rightSnap,
            snapTolerance: 10
        });

        if (ttp.resizeHandlerAdded !== true) {
            ttp.addResizeHandler();
        }

        $chat.scrollTop($chat[0].scrollHeight);
    },
    addResizeHandler: function () {
        $(window).resize(function (e) {
            var win = {
                    width: $(this).width(),
                    height: $(this).height()
                },
                $rightPanel = $('#right-panel'),
                right = {
                    width: $rightPanel.width(),
                    height: $rightPanel.height(),
                    top: +$rightPanel.css('top').replace('px', ''),
                    left: +$rightPanel.css('left').replace('px', '')
                },
                $leftPanel = $('#left-panel'),
                left = {
                    width: $leftPanel.width(),
                    height: $leftPanel.height(),
                    top: +$leftPanel.css('top').replace('px', ''),
                    left: +$leftPanel.css('left').replace('px', '')
                };

            if (right.left + right.width > win.width) {
                if (win.width > right.width) {
                    $rightPanel.css('left', win.width - right.width + 'px');
                } else {
                    $rightPanel.css({ left: '0', width: win.width + 'px' });
                    $('#chat-input').width(win.width - 74);
                    $('#ttpRightStyle').remove();
                    if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
                        $('.chat-container .floating-panel-tab').width(win.width);
                        $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                            '.chat-focused #chat-input { width: ' + (win.width - 30) + 'px !important; }\n' +
                            '</style>');
                    } else {
                        $('.chat-container .floating-panel-tab, #playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(win.width / 3));
                        $('.guest .guestName').attr('style', 'max-width: ' + (win.width - 160) + 'px !important;');
                        $('head').append('<style type="text/css" id="ttpRightStyle">\n' +
                            '.guest .guestName { max-width: ' + (win.width - 160) + 'px !important; }\n' +
                            '.search-focused #song-search-input { width: ' + (win.width - 45) + 'px !important; }\n' +
                            '.chat-focused #chat-input { width: ' + (win.width - 30) + 'px !important; }\n' +
                            '</style>');
                    }
                }
            }

            if (right.top + right.height > win.height) {
                if (win.height > right.height) {
                    $rightPanel.css('top', win.height - right.height + 'px');
                } else {
                    $rightPanel.css({ top: '0', height: win.height + 'px' });
                }
            }

            if (ttp.roominfo.layout === 'dual' && $('#left-panel').is(':visible')) {
                if (left.left + left.width > win.width) {
                    if (win.width > left.width) {
                        $leftPanel.css('left', win.width - left.width + 'px');
                    } else {
                        $leftPanel.css({ left: '0', width: win.width + 'px' });
                        $('#playlist-container .floating-panel-tab,#room-info-container .floating-panel-tab').width(Math.round(win.width / 2));
                        $('#song-search-input').width(win.width - 89);
                        $('#left-panel .guest .guestName').attr('style', 'max-width: ' + (win.width - 160) + 'px !important;');
                        $('#ttpLeftStyle').remove();
                        $('head').append('<style type="text/css" id="ttpLeftStyle">\n' +
                            '#left-panel .guest .guestName { max-width: ' + (win.width - 160) + 'px !important; }\n' +
                            '#left-panel .search-focused #song-search-input { width: ' + (win.width - 45) + 'px !important; }\n' +
                            '</style>');
                    }
                }

                if (left.top + left.height > win.height) {
                    if (win.height > left.height) {
                        $leftPanel.css('top', win.height - left.height + 'px');
                    } else {
                        $leftPanel.css({ top: '0', height: win.height + 'px' });
                    }
                }
            }

            if (this === e.target) {
                ttp.send({
                    get: 'layout',
                    res: win.width + 'x' + win.height
                });
            }
        });
        ttp.resizeHandlerAdded = true;
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
        if (typeof seconds !== "number") {
            return "00:00";
        }
        var hours = minutes = 0;
        if (seconds > 3600) {
            hours = Math.floor(seconds / 3600);
        } else {
            hours = 0;
        }
        if (seconds >= 60) {
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
        $("#guest-list .guests .guest").each(function () {
            $(this).find(".idletime").html(ttp.formatTime((now - (+$(this).data("ttplastactivity")))));
        });
        $("#guest-list .guests .guestOptionsContainer:visible").each(function () {
            $(this).find(".lastChat").text('Last Chat: ' + ttp.formatTime((now - (+$("#guest-list .guests .guest.selected").data("ttplastchat")))));
            $(this).find(".lastVote").text('Last Vote: ' + ttp.formatTime((now - (+$("#guest-list .guests .guest.selected").data("ttplastvote")))));
        });
    },
    authBot: '4fd6cdd34fb0bb0d2301aeb3',
    handlePM: $.noop,
    roomCustomizations: {},
    checkForCustomizations: function () {
        $('#ttp-allow-custom,#ttp-disable-custom').hide();
        return;

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
                                    if (room.bots[x].url !== undefined && room.bots[x].uid !== undefined && ttp.roominfo.userMap[room.bots[x].uid] !== undefined) {
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
        return;
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
        if ($("#ttpSongQueueCount").length == 0) {
            // Prepare a div that will be used to display the number of songs in your queue
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
            $('#playlist .black-right-header').css('position', 'relative').append(countDiv);

            // Bind an event so any modification to the song queue will update the count
            $("#playlist").bind('DOMSubtreeModified', function () {
                ttp.updateSongQueueCount();
            });
        }

        ttp.updateSongQueueCount();
    },
    updateSongQueueCount: function() {
        songCount = turntable.playlist.fileids.length;
        $("#ttpSongQueueCount").html(songCount.commafy() + " songs");
    },
    replaced: {},
    replaceFunctions: function () {
        ttp.replaced.guestListName = Room.layouts.guestListName;
        Room.layouts.guestListName = function(user, room, selected, now) {
            try {
                var a = user.images.headfront,
                    guestClass = selected ? ".guest.selected" : ".guest",
                    icons = ['div.icons', {}];
                if (ttp.roominfo.upvoters.indexOf(user.userid) > -1) {
                    guestClass += ".upvoted";
                } else if (ttp.room.downvoters.indexOf(user.userid) > -1) {
                    guestClass += ".downvoted";
                }

                if (user.lastActivity === undefined) {
                    user.lastActivity = ttp.startTime;
                }
                if (user.lastChat === undefined) {
                    user.lastChat = ttp.startTime;
                }
                if (user.lastVote === undefined) {
                    user.lastVote = ttp.startTime;
                }

                if (user.acl > 0) {
                    icons.push(['div.superuser.icon', {title: 'Superuser'}]);
                } else {
                    if (ttp.roominfo.roomData.metadata.moderator_id.indexOf(user.userid) > -1) {
                        icons.push(['div.mod.icon', {title: 'Moderator'}]);
                    }
                }
                if (turntable.user.get('fanof').indexOf(user.userid) > -1) {
                    icons.push(['div.fanned.icon', {title: 'Fanned'}]);
                }
                if (ttp.room.snaggers.indexOf(user.userid) > -1) {
                    icons.push(['div.snagged.icon', {title: 'Queued Current Song'}]);
                }

                var spec = ["div" + guestClass, {event: {mouseover: function() {
                                $(this).find("div.guestArrow").show();
                            },mouseout: function() {
                                $(this).find("div.guestArrow").hide();
                            },click: function() {
                                var g = $(this).parent().find("div.guestOptionsContainer");
                                var h = $(this);
                                if (!g.length) {
                                    $.proxy(function() {
                                        this.addGuestListMenu(user, h);
                                    }, room)();
                                } else {
                                    if ($(this).hasClass("selected")) {
                                        room.removeGuestListMenu();
                                    } else {
                                        room.removeGuestListMenu($.proxy(function() {
                                            this.addGuestListMenu(user, h);
                                        }, room));
                                    }
                                }
                            },dblclick: function() { room.handlePM({ senderid: user.userid }, true); }},
                            data: {id: user.userid, ttplastactivity: user.lastActivity, ttplastchat: user.lastChat, ttplastvote: user.lastVote}},
                            ["div.guest-avatar", {style: {"background-image": "url(" + a + ")"}}],
                            ["div.guestName", {}, user.name],
                            icons,
                            ["div.guestArrow"],
                            ["div.idletime", {}, ttp.formatTime(now - user.lastActivity)]];
                if (room.roomData.metadata.currentDj === user.userid) {
                    spec.splice(3, 0, ['div.current-dj']);
                }
                return spec;
            } catch (e) {
                console.warn("Error in guestListName:", e);
                ttp.replaced.guestListName(user, room, selected);
            }
        };

        ttp.replaced.guestListUpdate = ttp.roominfo.updateGuestList;
        ttp.roominfo.updateGuestList = function() {
            try {
                var supers = [],
                    mods = [],
                    djs = [],
                    fanof = [],
                    listeners = [],
                    guests = [],
                    $list = $(".guest-list-container .guests"),
                    users = ttp.roominfo.userMap,
                    fans = turntable.user.get('fanof');

                for (var o = 0, s = ttp.roominfo.djids, q = s.length; o < q; o++) {
                    djs.push(users[s[o]]);
                }

                for (var o = 0, s = ttp.roominfo.listenerids, q = s.length; o < q; o++) {
                    var listenerid = s[o];
                    if (ttp.roominfo.djids.indexOf(listenerid) > -1) {
                        continue;
                    } else if (users[listenerid].acl > 0) {
                        supers.push(users[listenerid]);
                    } else if (ttp.roominfo.roomData.metadata !== undefined && ttp.roominfo.roomData.metadata.moderator_id.indexOf(listenerid) > -1) {
                        mods.push(users[listenerid]);
                    } else if (fans.indexOf(listenerid) > -1) {
                        fanof.push(users[listenerid]);
                    } else if (!users[listenerid].registered) {
                        guests.push(listenerid);
                    } else {
                        listeners.push(users[listenerid]);
                    }
                }

                mods = supers.sort(this.guestListSort).concat(mods.sort(this.guestListSort));
                listeners = fanof.sort(this.guestListSort).concat(listeners.sort(this.guestListSort));

                var c = $list.find(".guest.selected").data("id");
                $list.children().remove();
                var t = [djs, mods, listeners], v = ["DJs", "Moderators", "Audience"];
                var now = ttp.now();
                for (var m = 0, k = t.length; m < k; m++) {
                    var d = t[m];
                    if (!d.length && v[m] != 'Audience') {
                        continue;
                    }

                    $list.append(util.buildTree(["div.separator", ["div.text", v[m]]]));
                    for (var o = 0, q = d.length; o < q; o++) {
                        var e = (c && c == d[o].userid);
                        $list.append(util.buildTree(Room.layouts.guestListName(d[o], ttp.roominfo, e, now)));
                    }
                    if (v[m] == 'Audience' && guests.length) {
                        $list.append(util.buildTree(Room.layouts.guestRow(guests.length)));
                    }
                }
                var numUsers = mods.length + listeners.length;
                if (ttp.roominfo.section === undefined) {
                    numUsers += djs.length;
                }
                var numGuests = guests.length,
                    numHere = numUsers + numGuests,
                    numHereStr;
                if (numHere === 1) {
                    numHereStr = numHere + " person here";
                } else {
                    numHereStr = numHere + " people here";
                }

                var tipsyStr;
                if (numUsers == 1) {
                    tipsyStr = numUsers + " user";
                } else {
                    tipsyStr = numUsers + " users";
                }
                if (numGuests == 1) {
                    tipsyStr += (" + " + numGuests + " guest");
                } else {
                    tipsyStr += (" + " + numGuests + " guests");
                }
                $("#totalUsers").text(numHereStr).attr('title', tipsyStr);
                ttp.roominfo.updateGuestListMenu();
            } catch (e) {
                console.warn("Error in updateGuestList:", e);
                ttp.replaced.guestListUpdate.call(ttp.roominfo);
            }
        };
        ttp.roominfo.updateGuestList();

        ttp.replaced.addUserToMap = ttp.roominfo.addUserToMap;
        ttp.roominfo.addUserToMap = function (user) {
            try {
                var users        = ttp.roominfo.userMap,
                    now          = ttp.now(),
                    lastActivity = now,
                    lastChat     = now,
                    lastVote     = now;
                if (users[user.userid]) {
                    if (users[user.userid].lastActivity) {
                        lastActivity = users[user.userid].lastActivity;
                    }
                    if (users[user.userid].lastChat) {
                        lastChat = users[user.userid].lastChat;
                    }
                    if (users[user.userid].lastVote) {
                        lastVote = users[user.userid].lastVote;
                    }
                }
                ttp.replaced.addUserToMap.call(ttp.roominfo, user);
                users[user.userid].lastActivity = lastActivity;
                users[user.userid].lastChat = lastChat;
                users[user.userid].lastVote = lastVote;
            } catch (e) {
                console.warn("Error in addUserToMap:", e);
                ttp.replaced.addUserToMap.call(ttp.roominfo, user);
            }
        };

        ttp.replaced.setPanelLayout = ttp.roominfo.setPanelLayout;
        ttp.roominfo.setPanelLayout = function (layout) {
            try {
                ttp.replaced.setPanelLayout.call(ttp.roominfo, layout);
                ttp.addHeader();
            } catch (e) {
                console.warn("Error in setPanelLayout:", e);
                ttp.replaced.setPanelLayout.call(ttp.roominfo, layout);
            }
        };
    }
}
ttp.event.initEvent("ttpEvent", true, true);
ttp.enterKey.initKeyboardEvent("keypress", true, true, null, false, false, false, false, 13, 2386);

ttp.startTime = ttp.now();
ttp.guestOptions = Room.layouts.guestOptions;
Room.layouts.guestOptions = function (a, b) {
    var c = ttp.guestOptions(a, b), now = ttp.now();
    c[2].splice(2, 0, ['span.lastChat', {}, 'Last Chat: ' + ttp.formatTime(now - ttp.roominfo.userMap[a.userid].lastChat)]);
    c[2].splice(3, 0, ['span.lastVote', {}, 'Last Vote: ' + ttp.formatTime(now - ttp.roominfo.userMap[a.userid].lastVote)]);
    return c;
};
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
ttp.send({
    get: 'layout',
    res: $(window).width() + 'x' + $(window).height()
});
ttp.ready(function () {
    ttp.replaceFunctions();
});
$(document).ready(ttp.getRoomObjects);


// add API for custom scripts
var TTPAPI = function () {
    this.bindings = [];
    this.roomid   = ttp.roominfo.roomId;
    this.users    = ttp.roominfo.userMap;
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

/*
* jQuery Sorting
* By:     James Padolsey
* Blog:   http://james.padolsey.com/javascript/sorting-elements-with-jquery/
* GitHub: https://github.com/padolsey/jQuery-Plugins/tree/master/sortElements/
*/
if (!jQuery.isFunction(jQuery.fn.sortElements)) {
        jQuery.fn.sortElements=(function(){var sort=[].sort;return function(comparator,getSortable){getSortable=getSortable||function(){return this;};var placements=this.map(function(){var sortElement=getSortable.call(this),parentNode=sortElement.parentNode,nextSibling=parentNode.insertBefore(document.createTextNode(''),sortElement.nextSibling);return function(){if(parentNode === this){throw new Error("You can't sort elements if any one is a descendant of another.");}parentNode.insertBefore(this,nextSibling);parentNode.removeChild(nextSibling);};});return sort.call(this,comparator).each(function(i){placements[i].call(getSortable.call(this));});};})();
}
