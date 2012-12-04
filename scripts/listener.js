var ttplus = {
    TtObjectsReady: false,
    usersListReady: false,
    event: document.createEvent("Event"),
    logging: false,
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
            if (this.logging === true) {
                console.log('listener sending (bg page):', data);
            }
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
            if (ttplus.logging === true) {
                console.log('listener received (bg page):', request);
            }
            if (request.source === "listener" && typeof request.msgId === "number" && typeof request.response !== "undefined") {
                for (x = 0, length = ttplus.msgCallbacks.length; x < length; x += 1) {
                    if (ttplus.msgCallbacks[x] !== undefined && ttplus.msgCallbacks[x][0] === request.msgId) {
                        callback = ttplus.msgCallbacks.splice(x, 1);
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
                ttplus.toggleMute();
            } else if (request.queue === true) {
                ttplus.injectScript(ttplus.queueSong, JSON.parse(request.song));
            } else if (request.setup === true) {
                ttplus.injectScript(ttplus.setupRoom);
            } else if (request.getUserInfo === true) {
                ttplus.injectScript(ttplus.getUserInfo);
            } else if (typeof request.expandChat === "boolean") {
                return;
            } else if (typeof request.changeLayout === "boolean") {
                if (request.changeLayout === true && request.layout !== undefined) {
                    ttplus.injectScript(ttplus.changeLayout, request.layout);
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
            if (ttplus.logging === true) {
                console.log('listener received (save):', $(this).text());
            }
            ttplus.send({
                type: 'save',
                data: $(this).text()
            });
        });
        $('#ttpMessage').bind('ttpEvent', function () {
            var msg = JSON.parse(unescape($(this).text()));
            if (ttplus.logging === true) {
                console.log('listener received (page):', msg);
            }
            if (msg === "Listener Ready") {
                ttplus.send({
                    type: 'ttpMessage',
                    data: $(this).text()
                });
            } else if (msg === "TT Objects Ready") {
                ttplus.TtObjectsReady = true;
            } else if (msg.command === "log") {
                console.log(eval(msg.data));
            } else if (msg.command === "enableLogging") {
                ttplus.logging = true;
            } else if (msg.command === "disableLogging") {
                ttplus.logging = false;
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
    changeLayout: function (layout) {
        ttp.ready(function () {
            ttp.changeLayout(layout);
        });
    },/*
    addSongQueueCount: function() {
        ttp.loadSongQueueCount();
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
    },
    getUsers: function () {
        return ttp.roominfo.userMap;
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
