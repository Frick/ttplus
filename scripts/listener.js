var ttplus = {
    TtObjectsReady: false,
    usersListReady: false,
    event: document.createEvent("Event"),
    usersQueue: [],
    port: null,
    msgId: 0,
    msgCallbacks: [],
    send: function (data, callback) {
        if (this.port === null) {
            return false;
        }
        try {
            if (typeof data.msgId !== "number") {
                this.msgId += 1;
                data.msgId = this.msgId;
                data.source = 'listener';
            }
            if (typeof callback === "function") {
                this.msgCallbacks.push([
                    this.msgId,
                    callback
                ]);
            }
            this.port.postMessage(data);
            return this.msgId;
        } catch (e) {
            if (ttplus.port === null || e.message === "Attempting to use a disconnected port object") {
                ttplus.port = chrome.extension.connect({name: 'ttp'});
                ttplus.port.onMessage.addListener(ttplus.handleRequest);
            } else {
                console.log('Unknown TT+ Port Error:', e.message);
                console.log(e);
            }
        }
        return false;
    },
    handleRequest: function (request) {
        var response, path, room, vote, div;
        try {
            if (request.source === "listener" && typeof request.msgId === "number" && typeof request.response !== "undefined") {
                for (x = 0, length = ttplus.msgCallbacks.length; x < length; x += 1) {
                    if (ttplus.msgCallbacks[x] !== undefined && ttplus.msgCallbacks[x][0] === request.msgId) {
                        callback = ttp.msgCallbacks.splice(x, 1);
                        callback[0][1](request.response, request.msgId);
                    }
                }
                return;
            } else if (request.source === "page" && typeof request.msgId === "number" && typeof request.response !== "undefined") {
                div = document.getElementById("ttpResponse");
                div.innerText = escape(JSON.stringify(request));
                div.dispatchEvent(ttplus.event);
            } else if (typeof request.command === "string") {
                response = ttplus.injectScript(ttplus.exec, request.command);
                ttplus.send({
                    msgId: request.msgId,
                    source: request.source,
                    response: response
                });
            } else if (typeof request.highlightMessage === "object") {
                ttplus.injectScript(ttplus.highlightChatMessage, request.highlightMessage);
            } else if (typeof request.speak === "string") {
                ttplus.injectScript(ttplus.speak, request.speak);
            } else if (request.toggleMute === true) {
                ttplus.injectScript(ttplus.toggleMute);
            } else if (request.queue === true) {
                ttplus.injectScript(ttplus.queueSong, JSON.parse(request.song));
            } else if (request.setup === true) {
                ttplus.injectScript(ttplus.setupRoom);
            } else if (request.getUserInfo === true) {
                ttplus.injectScript(ttplus.getUserInfo);
            } else if (typeof request.expandChat === "boolean") {
                if (request.expandChat && typeof request.layout === "object") {
                    ttplus.injectScript(ttplus.expandChat, request.layout);
                } else {
                    ttplus.injectScript(ttplus.defaultChat);
                }
            } else if (typeof request.changeLayout === "string" || typeof request.changeLayout === "boolean") {
                if (request.changeLayout) {
                    ttplus.injectScript(ttplus.expandChat, request.layout);
                } else {
                    ttplus.injectScript(ttplus.defaultChat);
                }
            }
        } catch (e) {
            console.log("Error with listener request:", request);
        }
    },
    init: function () {
        ttplus.port = chrome.extension.connect({name: 'ttp'});
        ttplus.port.onMessage.addListener(ttplus.handleRequest);

        if (ttplus.injectScript(function () {return $.isReady;}) !== true) {
            window.initTimeout = window.setTimeout(ttplus.init, 100);
            return;
        } else if (ttplus.port === null) {
            window.initTimeout = window.setTimeout(ttplus.init, 100);
            return;
        } else if ($('#ttp-messages').length > 0) {
            return;
        } else if (window.initTimeout !== undefined) {
            window.clearTimeout(window.initTimeout);
            delete window.initTimeout;
        }

        $('body').append('<div id="ttp-messages" style="display:none;">' +
                             '<div id="ttpTurntableMessage"></div>' +
                             '<div id="ttpSaveSettings"></div>' +
                             '<div id="ttpMessage"></div>' +
                             '<div id="ttpResponse"></div>' +
                         '</div>');

        $('#ttpTurntableMessage').bind('ttpEvent', function () {
            ttplus.send({
                type: 'ttMessage',
                data: $(this).text()
            });
        });
        $('#ttpSaveSettings').bind('ttpEvent', function () {
            ttplus.send({
                type: 'save',
                data: $(this).text()
            });
        });
        $('#ttpMessage').bind('ttpEvent', function () {
            var msg = JSON.parse(unescape($(this).text()));
            if (msg === "Listener Ready") {
                ttplus.send({
                    type: 'ttpMessage',
                    data: $(this).text()
                });
            } else if (msg === "TT Objects Ready") {
                ttplus.TtObjectsReady = true;
                //ttplus.layoutChange();
            } else if (msg.command === "log") {
                console.log(eval(msg.data));
            } else if (typeof msg.get === "string") {
                ttplus.send({
                    msgId:  msg.msgId,
                    source: 'page',
                    type:   'get',
                    data:   $(this).text()
                });
            } else if (typeof msg.type === "string") {
                ttplus.send({
                    msgId: msg.msgId,
                    source: 'page',
                    type: msg.type,
                    data: $(this).text()
                });
            }
        });

        ttplus.injectTtp();
    },
    injectTtp: function () {
        var script  = document.createElement('script');
        script.type = 'text/javascript';
        script.src  = chrome.extension.getURL('/scripts/onPage.js') + "?" + Date.now();
        document.head.appendChild(script);
    },
    exec: function (command) {
        return eval(command);
    },
    setupRoom: function () {
        ttp.request({api: "room.info", roomid: ttp.roominfo.roomId});
    },
    getUserInfo: function () {
        ttp.request({api: "user.info"});
    },
    expandChat: function (layout) {
        ttp.breakoutChat();

        return true;
    },
    defaultChat: function () {
        ttp.combineChat();

        return true;
    },/*
    addDragNDrop: function (expandedChat) {
        return;
        if (expandedChat) {
            $('#outer,.chat-container,#ttpUsersList').addClass('stackable');
        } else {
            $('#ttpUsersList').addClass('stackable');
        }
        if (expandedChat) {
            $('#outer').draggable({
                handle: '#top-panel .header',
                cancel: '.logo,.userauthContainer,.room-buttons,.search',
                stack: '.stackable',
                start: function() {
                    $('#room-info-tab .content').hide();
                },
                stop: function(event, ui) {
                    $('#room-info-tab .content').show();
                    ttp.saveSettings({
                        main: ui.offset
                    });
                },
                snap: 'body,.chat-container,#ttpUsersList',
                snapTolerance: 10
            });
            $('.chat-container').resizable({
                minWidth: 200,
                minHeight: 115,
                handles: 'n,ne,e,se,s,sw,w,nw',
                resize: function (event, ui) {
                    $('.chat-container .messages').height(ui.size.height - 60).unbind('DOMNodeInserted').bind('DOMNodeInserted', function () {
                        $(this).find('.message').last().width(ui.size.width - 29)
                    }).find('.message').width(ui.size.width - 29);
                    $('.chat-container .input-box').width(ui.size.width - 36);
                    $('.chat-container .input-box input').width(ui.size.width - 61);
                },
                stop: function (event, ui) {
                    ttp.saveSettings({
                        chat: {
                            top: ui.position.top,
                            left: ui.position.left,
                            width: ui.size.width,
                            height: ui.size.height
                        }
                    });
                }
            }).draggable({
                handle: '.chatHeader',
                stack: '.stackable',
                stop: function (event, ui) {
                    ttp.saveSettings({
                        chat: {
                            top: ui.offset.top,
                            left: ui.offset.left,
                            width: $('.chat-container').width(),
                            height: $('.chat-container').height()
                        }
                    });
                },
                snap: 'body,#outer,#ttpUsersList',
                snapTolerance: 10
            });
        }
        $('#ttpUsersList').resizable({
            minWidth: 200,
            minHeight: 155,
            handles: 'n,ne,e,se,s,sw,w,nw',
            resize: function (event, ui) {
                $('#ttpUsersList .ttpUsersList').height(ui.size.height - 99);
            },
            stop: function(event, ui) {
                ttp.saveSettings({
                    users: {
                        top: ui.position.top,
                        left: ui.position.left,
                        width: ui.size.width,
                        height: ui.size.height
                    }
                });
            }
        }).draggable({
            handle: '.ttpUsersListHeader',
            stack: '.stackable',
            stop: function (event, ui) {
                ttp.saveSettings({
                    users: {
                        top: ui.offset.top,
                        left: ui.offset.left,
                        width: $('#ttpUsersList').width(),
                        height: $('#ttpUsersList').height()
                    }
                });
            },
            snap: 'body,#outer,.chat-container',
            snapTolerance: 10
        });
    },
    addSongQueueCount: function() {
        ttp.loadSongQueueCount();
    },
    layoutChange:  function (expandedChat, layout, path) {
        return;
        var usersListReady = false;
        if ($('#header').length) {
            return;
        }
        if (expandedChat !== undefined) {
            ttplus.layoutChange.expandedChat = expandedChat;
        }
        if (layout !== undefined) {
            ttplus.layoutChange.layout = layout;
        }
        if (path !== undefined) {
            ttplus.layoutChange.path = path;
        }
        if (ttplus.TtObjectsReady && ttplus.layoutChange.expandedChat !== undefined && ttplus.layoutChange.layout !== undefined && ttplus.layoutChange.path !== undefined) {
            if (ttplus.layoutChange.expandedChat) {
                ttplus.injectScript(ttplus.expandChat, ttplus.layoutChange.layout);
                usersListReady = ttplus.injectScript(ttplus.addUsersList, true, ttplus.layoutChange.layout, ttplus.layoutChange.path);
            } else {
                if ($('#outer .chat-container').length === 0) {
                    ttplus.injectScript(ttplus.defaultChat);
                }
                usersListReady = ttplus.injectScript(ttplus.addUsersList, false, ttplus.layoutChange.layout, ttplus.layoutChange.path);
            }
            if (usersListReady) {
                ttplus.usersListReady = true;
                ttplus.processUsersQueue();
            }
            ttplus.injectScript(ttplus.addDragNDrop, ttplus.layoutChange.expandedChat);
            ttplus.injectScript(ttplus.addSongQueueCount);
        }
    },*/
    highlightChatMessage: function (message) {
        var name = window.unescape(message.name),
            rgx = new RegExp(window.unescape(message.rgx), 'i');
        $($("#chat .message").get().reverse()).each(function () {
            if ($(this).find(".speaker").text() === name) {
                var $msg = $(this);
                $(this).find(".text").each(function () {
                    if (rgx.test($(this).text())) {
                        $msg.addClass("mention");
                        return false;
                    }
                });
            }
        });
    },
    toggleMute: function () {
        $('#volume-button').click();
    },
    speak: function (text) {
        ttp.roominfo.nodes.chatText.value = text;
        ttp.roominfo.speak(ttp.enterKey);
    },
    queueSong: function (song) {
        ttp.roominfo.addSong("queue", song);
    },/*
    processUsersQueue: function () {
        var x = 0,
            length = ttplus.usersQueue.length;

        for (; x < length; x += 1) {
            ttplus.injectScript(ttplus.updateUser, ttplus.usersQueue[x].user, ttplus.usersQueue[x].vote);
        }
        ttplus.usersQueue = [];
    },
    updateUser: function (user, vote) {
        return;
        var $el             = $('#user' + user.userid),
            djs             = (ttp.roominfo.djIds.length) ? new RegExp(ttp.roominfo.djIds.join('|')) : false,
            moderators      = (ttp.roominfo.moderators.length) ? new RegExp(ttp.roominfo.moderators.join('|')) : false,
            fanof           = (turntable.user.fanOf.length) ? new RegExp(turntable.user.fanOf.join('|')) : false,
            now             = ttp.now(),
            idleTime        = ($el.attr('ttplastactivity') !== "") ? ttp.formatTime(now - (+$el.attr('ttplastactivity'))) : ttp.formatTime(now - ttp.startTime),
            oldUsertype     = $el.attr('ttpusertype'),
            usertype        = "60",
            oldDisplayName  = $el.attr('ttpusername'),
            displayName     = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
            showIdleTime    = false,
            userActionsOpen = false,
            isDj            = false;

        if ($el.length < 1) {
            return false;
        }
        if (typeof vote  === "string" && vote === "up") {
            $el.removeClass("ttpUserDownVote").addClass("ttpUserUpVote");
        } else if (typeof vote === "string" && vote === "down") {
            $el.removeClass("ttpUserUpVote").addClass("ttpUserDownVote");
        }
        if (moderators && moderators.test(user.userid)) {
            usertype     = "30";
            displayName  = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpMod" title="Moderator"></span>';
            showIdleTime = true;
        }
        if (user.userid === ttp.roominfo.creatorId) {
            usertype     = "20";
            displayName  = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpMod" title="Room Creator"></span>';
            showIdleTime = true;
        }
        if (user.acl > 0) {
            usertype     = "10";
            displayName  = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpSuper" title="Super User"></span>';
            showIdleTime = true;
        }
        if (fanof && fanof.test(user.userid)) {
            usertype     = (usertype === "60") ? "50" : usertype;
            displayName += '<span class="ttpFanned" title="You\'re a fan"></span>';
        }
        if (djs && djs.test(user.userid)) {
            if (usertype === "50" || usertype === "60") {
                usertype = "40";
            }
            showIdleTime = true;
            isDj = true;
        }
        $el.removeClass('ttpUserType10 ttpUserType20 ttpUserType30 ttpUserType40 ttpUserType50 ttpUserType60').addClass('ttpUserType' + usertype).attr('ttpusertype', usertype).attr('ttpusername', user.name.replace(/"/g, '\"')).attr('ttpusersort', usertype + user.name.replace(/"/g, '\"').toUpperCase()).html(displayName);
        if (isDj) {
            $el.addClass('ttpBold')
        } else {
            $el.removeClass('ttpBold');
        }
        if (showIdleTime) {
            $el.prepend('<span class="ttpIdleTime">' + idleTime + '</span>');
        }
        if (oldDisplayName !== displayName || oldUsertype !== usertype) {
            $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
                return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
            });
        }
        if ($('#ttpUserActions').css('display') === 'block') {
            userActionsOpen = true;
            $('#ttpUserActions').hide();
        }
        if (userActionsOpen) {
            $('#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected').after($('#ttpUserActions')).click();
        }
        return true;
    },*/
    getUsers: function () {
        return ttp.roominfo.users;
    },
    injectScript: function (source) {
        //////////////////////////////////////////////////////////////////////////////////////////////
        // Copyright(C) 2010 Abdullah Ali, voodooattack@hotmail.com                                 //
        //////////////////////////////////////////////////////////////////////////////////////////////
        // Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php       //
        //////////////////////////////////////////////////////////////////////////////////////////////
        var isFunction = function (arg) {
            return (Object.prototype.toString.call(arg) == "[object Function]");
        };
        var jsEscape = function (str) {
            if (!str || !str.length) return str;
            var r = /['"<>\/\\]/g, result = "", l = 0, c;
            do {
                c = r.exec(str);
                result += (c ? (str.substring(l, r.lastIndex-1) + "\\x" + c[0].charCodeAt(0).toString(16)) : (str.substring(l)));
            } while (c && ((l = r.lastIndex) > 0))
            return (result.length ? result : str);
        };
        var bFunction = isFunction(source);
        var elem = document.createElement("script");
        var script, ret, id = "";
        if (bFunction) {
            var args = [];
            for (var i = 1; i < arguments.length; i++){
                var raw = arguments[i];
                var arg;
                if (isFunction(raw))
                    arg = "eval(\"" + jsEscape("(" + raw.toString() + ")") + "\")";
                else if (Object.prototype.toString.call(raw) == '[object Date]')
                    arg = "(new Date(" + raw.getTime().toString() + "))";
                else if (Object.prototype.toString.call(raw) == '[object RegExp]')
                    arg = "(new RegExp(" + raw.toString() + "))";
                else if (typeof raw === 'string' || typeof raw === 'object')
                    arg = "JSON.parse(\"" + jsEscape(JSON.stringify(raw)) + "\")";
                else
                    arg = raw.toString();
                args.push(arg);
            }
            while (id.length < 16) id += String.fromCharCode(((!id.length || Math.random() > 0.5) ? 0x61 + Math.floor(Math.random() * 0x19) : 0x30 + Math.floor(Math.random() * 0x9 )));
            script = "(function(){var value={callResult: null, throwValue: false};try{value.callResult=(("+
                source.toString()+")("+args.join()+"));}catch(e){value.throwValue=true;value.callResult=e;};"+
                "document.getElementById('"+id+"').innerText=JSON.stringify(value);})();";
            elem.id = id;
        } else {
            script = source;
        }
        elem.type = "text/javascript";
        elem.innerHTML = script;
        document.head.appendChild(elem);
        if (bFunction) {
            ret = JSON.parse(elem.innerText);
            elem.parentNode.removeChild(elem);
            if (ret.throwValue)
                throw (ret.callResult);
            else {
                return (ret.callResult);
            }
        } else return (elem);
    }
}
ttplus.event.initEvent("ttpEvent", true, true);
ttplus.init();
