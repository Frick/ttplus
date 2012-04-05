var ttplus = {
    TtObjectsReady: false,
    usersListReady: false,
    usersQueue: [],
    port: null,
    send: function (msg) {
        try {
            ttplus.port.postMessage(msg);
        } catch (e) {
            if (ttplus.port === null || e.message === "Attempting to use a disconnected port object") {
                ttplus.port = chrome.extension.connect({name: 'ttp'});
                ttplus.port.onMessage.addListener(ttplus.handleRequest);
            } else {
                console.log('Unknown TT+ Port Error:', e.message);
                console.log(e);
            }
        }
    },
    handleRequest: function (request) {
        var response, path, room, vote;
        //try {
            if (typeof request.command === "string") {
                response = ttplus.injectScript(ttplus.exec, request.command);
                ttplus.send({
                    msgId: request.msgId,
                    response: response
                });
            } else if (typeof request.updateUserList === "string") {
                response = false;
                if (!ttplus.usersListReady) {
                    ttplus.usersQueue.push(request);
                    response = true;
                } else if (request.updateUserList === "add") {
                    room = (typeof request.room === "object") ? request.room : undefined;
                    response = ttplus.injectScript(ttplus.addUsers, request.users, room);
                } else if (request.updateUserList === "update") {
                    if (typeof request.user === "object") {
                        vote = (typeof request.vote === "string") ? request.vote : "";
                        response = ttplus.injectScript(ttplus.updateUser, request.user, vote);
                    }
                } else if (request.updateUserList === "remove") {
                    if (typeof request.userid === "string") {
                        response = ttplus.injectScript(ttplus.removeUser, request.userid);
                    }
                }
                ttplus.send({
                    msgId: request.msgId,
                    response: {
                        success: response
                    }
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
            } else if (request.setStartTime === true) {
                ttplus.injectScript(ttplus.setStartTime);
            } else if (typeof request.ignoredUsers === "object") {
                ttplus.injectScript(ttplus.ignoreUsers, request.ignoredUsers);
            } else if (request.getUserInfo === true) {
                ttplus.injectScript(ttplus.getUserInfo);
            } else if (typeof request.expandChat === "boolean") {
                if (request.expandChat && typeof request.layout === "object") {
                    response = ttplus.injectScript(ttplus.expandChat, request.layout);
                    if (response) {
                        ttplus.injectScript(ttplus.addDragNDrop, true);
                    }
                } else {
                    ttplus.injectScript(ttplus.defaultChat);
                }
            } else if (typeof request.changeLayout === "string" || typeof request.changeLayout === "boolean") {
                path = chrome.extension.getURL('/');
                ttplus.layoutChange(request.changeLayout, request.layout, path);
            }
        //} catch (e) {
        //    console.log("Error with request:", request);
        //}
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

        $('body').append('<div id="ttp-messages" style="display:none;"><div id="ttpTurntableMessage"></div><div id="ttpSaveSettings"></div><div id="ttpMessage"></div></div>');

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
                ttplus.layoutChange();
            } else if (msg.command === "log") {
                console.log(eval(msg.data));
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
    addUsersList: function (expandedChat, layout, path) {
        var attachTo = (expandedChat === true) ? ".chat-container" : "#outer",
            bodyWidth = $('body').width(),
            outerWidth = $('#outer').width(),
            outerHeight = $('#outer').height()
            usersListLeft = (expandedChat === true) ? bodyWidth - 205 : (bodyWidth - outerWidth) / 2 + outerWidth;

        if ($('#ttpUsersList').length < 1) {
            $('<div id="ttpUsersList"><div class="ttpUsersListHeader"><span style="padding: 0 0 0 5px;">Votes: </span><span id="ttpRoomHearts" title="Number of Times Queued">0</span><span id="ttpRoomUpvotes" title="Awesomes">0</span><span id="ttpRoomDownvotes" title="Lames">0</span></div><div class="ttpBanner"><a href="' + path + 'settings.html" target="_blank"><img src="' + path + 'images/banner-logo.png" width="66" height="38" style="margin-left: 1px;" /></a><img src="' + path + 'images/banner-listeners.png" width="23" height="18" style="position:absolute;top:10px;right:38px;"><span id="ttpRoomListeners">0</span></div><div class="ttpUsersList"></div><div id="ttpUserSearch"><input type="text" placeholder="search users" /></div></div>').insertAfter(attachTo);

            $('#ttpUsersList .ttpUsersList').append('<div id="ttpUserActions"><span class="ttpUserActionsIdle">Idle: <span class="ttpIdleTime"></span></span><br /><span class="icon ttpFan" title="Fan"></span><span class="icon ttpProfile" title="View Profile"></span><span class="icon ttpTtdash" title="View Turntable Dashboard Profile"></span><span class="icon ttpAddMod" title="Grant Moderator Privileges"></span><span class="icon ttpIgnore" title="Ignore User"></span><span class="icon ttpBoot" title="Boot User"></span><span class="icon ttpRemoveDj" title="Remove DJ"></span></div>');

            $(window).click(function () {
                if ($('#ttpUserActions').css('display') === 'block') {
                    $('#ttpUserActions').slideUp(200, function () {
                        $('#ttpUsersList .ttpUsersList .ttpUser').removeClass('ttpUserSelected');
                    });
                }
            });

            $('#ttpUsersList .ttpUsersList .ttpUser').live('click', function (e) {
                e.stopPropagation();
                var selected = this,
                    userid   = $(selected).attr('id').substr(4),
                    username = $(selected).attr('ttpusername');
                $('#ttpUsersList .ttpUsersList .ttpUser').removeClass('ttpUserSelected');
                if ($(selected).next().attr('id') === 'ttpUserActions' && $('#ttpUserActions').css('display') === 'block') {
                    $('#ttpUserActions').slideUp(200);
                    return;
                }
                $(selected).addClass('ttpUserSelected');
                $('#ttpUserActions').slideUp(200, function () {
                    var moderators = (ttp.roominfo.moderators.length) ? new RegExp(ttp.roominfo.moderators.join("|"), "i") : false,
                        djs = (ttp.roominfo.djIds.length) ? new RegExp(ttp.roominfo.djIds.join("|"), "i") : false,
                        fanOf = (turntable.user.fanOf.length) ? new RegExp(turntable.user.fanOf.join("|"),"i") : false,
                        ignoredUsers = (ttp.roominfo.ignoredUsers.length) ? new RegExp(ttp.roominfo.ignoredUsers.join("|"), "i") : false;

                    $(this).find('.ttpFan,.ttpUnfan').hide();
                    $(this).find('.ttpProfile').unbind('click').click(function (e) {
                        e.stopPropagation();
                        ttp.request({
                            api: "user.get_profile",
                            userid: userid
                        }, function (profile) {
                            ttp.roominfo.setupProfileOverlay(profile);
                        });
                    });
                    $(this).find('.ttpTtdash').unbind('click').click(function (e) {
                        e.stopPropagation();
                        window.open('http://ttdashboard.com/user/uid/' + userid + '/');
                    });
                    if (turntable.user.id === userid) {
                        $(this).find('.ttpBoot,.ttpRemoveDj,.ttpAddMod,.ttpRemMod,.ttpIgnore,.ttpUnignore').hide();
                        $(selected).after($(this));
                        if (e.pageX && e.pageY) {
                            $(this).slideDown(400);
                        } else {
                            $(this).show();
                        }
                        e.stopPropagation();
                        return;
                    }
                    if (moderators && moderators.test(turntable.user.id) || +turntable.user.acl > 0) {
                        if (moderators.test(userid) && ttp.roominfo.users[userid] !== undefined && +ttp.roominfo.users[userid].acl === 0) {
                            $(this).find('.ttpAddMod').removeClass('ttpAddMod').addClass('ttpRemMod').prop('title', 'Remove Moderator Privileges');
                            $(this).find('.ttpRemMod').css('display', 'inline-block').unbind('click').click(function (e) {
                                e.stopPropagation();
                                ttp.request({
                                    api: "room.rem_moderator",
                                    roomid: ttp.roominfo.roomId,
                                    target_userid: userid
                                });
                                $(selected).find('.ttpMod').remove();
                                if ($(selected).hasClass('.ttpDj')) {
                                    $(selected).attr('ttpusertype', '40').attr('ttpusersort', '40' + username.toUpperCase());
                                } else if ($(selected).hasClass('.ttpFanned')) {
                                    $(selected).attr('ttpusertype', '50').attr('ttpusersort', '50' + username.toUpperCase());
                                } else {
                                    $(selected).attr('ttpusertype', '60').attr('ttpusersort', '60' + username.toUpperCase());
                                }
                                $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
                                    return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
                                });
                                $('#ttpUserActions').hide();
                                $(selected).click();
                            });
                        } else {
                            $(this).find('.ttpRemMod').removeClass('ttpRemMod').addClass('ttpAddMod').prop('title', 'Grant Moderator Priviliges');
                            $(this).find('.ttpAddMod').css('display', 'inline-block').unbind('click').click(function (e) {
                                e.stopPropagation();
                                ttp.request({
                                    api: "room.add_moderator",
                                    roomid: ttp.roominfo.roomId,
                                    target_userid: userid
                                });
                                $(selected).prepend('<span class="ttpMod" title="Moderator"></span>').attr('ttpusertype', '30').attr('ttpusersort', '30' + username.toUpperCase());
                                $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
                                    return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
                                });
                                $('#ttpUserActions').hide();
                                $(selected).click();
                            });
                        }
                        $(this).find('.ttpBoot').css('display', 'inline-block').unbind('click').click(function (e) {
                            e.stopPropagation();
                            util.showOverlay(util.buildTree(Room.layouts.bootConfirmView(ttp.roominfo.users[userid].name, function () {
                                var request = {
                                    api: "room.boot_user",
                                    roomid: ttp.roominfo.roomId,
                                    target_userid: userid
                                },
                                reason = $.trim($(".bootReasonField").val());
                                if (reason && reason !== "(optional)") {
                                    request.reason = reason;
                                }
                                ttp.request(request);
                                window.util.hideOverlay();
                            })));
                        });
                        if (userid === ttp.roominfo.creatorId) {
                            $(this).find('.ttpAddMod,.ttpRemMod').hide().unbind('click');
                        }
                        if (ttp.roominfo.users[userid] !== undefined && ttp.roominfo.users[userid].acl > 0) {
                            $(this).find('.ttpBoot').hide().unbind('click');
                        }
                        if (djs && djs.test(userid)) {
                            $(this).find('.ttpRemoveDj').css('display', 'inline-block').unbind('click').click(function (e) {
                                e.stopPropagation();
                                ttp.request({
                                    api: "room.rem_dj",
                                    roomid: ttp.roominfo.roomId,
                                    djid: userid
                                });
                                $(this).hide();
                            });
                        } else {
                            $(this).find('.ttpRemoveDj').hide();
                        }
                    } else {
                        $(this).find('.ttpBoot,.ttpRemoveDj,.ttpAddMod,.ttpRemMod').hide();
                    }
                    if (fanOf && fanOf.test(userid)) {
                        $(this).find('.ttpFan').removeClass('ttpFan').addClass('ttpUnfan').prop('title', 'Unfan');
                        $(this).find('.ttpUnfan').show().unbind('click').click(function (e) {
                            var x = 0,
                                length = turntable.user.fanOf.length;

                            e.stopPropagation();
                            for (; x < length; x += 1) {
                                if (turntable.user.fanOf[x] === userid) {
                                    turntable.user.fanOf.splice(x, 1);
                                    break;
                                }
                            }
                            ttp.roominfo.users[userid].fanof = false;
                            ttp.request({
                                api: "user.remove_fan",
                                djid: userid
                            });
                            $(selected).find('.ttpFanned').remove();
                            if ($(selected).attr('ttpusertype') === "50") {
                                $(selected).attr('ttpusertype', '60').attr('ttpusersort', '60' + username.toUpperCase());
                            }
                            $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
                                return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
                            });
                            $('#ttpUserActions').hide();
                            $(selected).click();
                        });
                    } else {
                        $(this).find('.ttpUnfan').removeClass('ttpUnfan').addClass('ttpFan').prop('title', 'Fan');
                        $(this).find('.ttpFan').show().unbind('click').click(function (e) {
                            e.stopPropagation();
                            turntable.user.fanOf.push(userid);
                            ttp.roominfo.users[userid].fanof = true;
                            ttp.request({
                                api: "user.become_fan",
                                djid: userid
                            });
                            $(selected).append('<span class="ttpFanned" title="You\'re a fan"></span>');
                            if ($(selected).attr('ttpusertype') === "60") {
                                $(selected).attr('ttpusertype', '50').attr('ttpusersort', '50' + username.toUpperCase());
                            }
                            $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
                                return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
                            });
                            $('#ttpUserActions').hide();
                            $(selected).click();
                        });
                    }
                    if (ignoredUsers && ignoredUsers.test(userid)) {
                        $(this).find('.ttpIgnore').removeClass('ttpIgnore').addClass('ttpUnignore').prop('title', 'Unignore User');
                        $(this).find('.ttpUnignore').show().unbind('click').click(function (e) {
                            var x = 0,
                                length = ttp.roominfo.ignoredUsers.length;

                            e.stopPropagation();
                            ttp.saveSettings({
                                unignoreUser: {
                                    userid: userid
                                }
                            });
                            for (; x < length; x += 1) {
                                if (ttp.roominfo.ignoredUsers[x] === userid) {
                                    ttp.roominfo.ignoredUsers.splice(x, 1);
                                }
                                ttp.roominfo.appendChatMessage(userid, ttp.roominfo.users[userid].name, " will be ignored no more.");
                            }
                            $('#ttpUserActions').hide();
                            $(selected).click();
                        });
                    } else {
                        $(this).find('.ttpUnignore').removeClass('ttpUnignore').addClass('ttpIgnore').prop('title', 'Ignore User');
                        $(this).find('.ttpIgnore').show().unbind('click').click(function (e) {
                            e.stopPropagation();
                            ttp.saveSettings({
                                ignoreUser: {
                                    userid: userid
                                }
                            });
                            ttp.roominfo.ignoredUsers.push(userid);
                            ttp.roominfo.appendChatMessage(userid, ttp.roominfo.users[userid].name, " will be ignored.");
                            $('#ttpUserActions').hide();
                            $(selected).click();
                        });
                    }
                    $(selected).after($(this));
                    if (e.pageX && e.pageY) {
                        $(this).slideDown(400);
                    } else {
                        $(this).show();
                    }
                });
            });

            $('#ttpUsersList .ttpUsersList .ttpUser').live('dblclick', function (e) {
                var $input = $('.chat-container .input-box input');
                e.stopPropagation();
                $input.val($input.val() + '@' + $(this).attr('ttpUserName') + ' ').focus();
            });

            // add user search
            if ($('#ttpUserSearch').length > 0) {
                $('#ttpUserSearch input').keyup(function (e) {
                    if (e.keyCode === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                    } else {
                        if (window.ttpUserSearchTimeout !== undefined) {
                            window.clearTimeout(window.ttpUserSearchTimeout);
                            delete window.ttpUserSearchTimeout;
                        }
                        window.ttpUserSearchTimeout = window.setTimeout(function () {
                            var $users = $('#ttpUsersList .ttpUsersList .ttpUser'),
                                search = $('#ttpUserSearch input').val(),
                                searchTerm;

                            $users.show();
                            if ($('#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected').length > 0) {
                                $('#ttpUserActions').show();
                            }
                            if ($('#ttpUserSearch input').val() === '') {
                                return;
                            }
                            searchTerm = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\s/g, '.*'), 'i');
                            $users.each(function () {
                                if (!searchTerm.test($(this).attr('ttpusername'))) {
                                    $(this).hide();
                                    if ($(this).next().attr('id') === 'ttpUserActions') {
                                        $(this).next().hide();
                                    }
                                }
                            });
                        }, 200);
                    }
                });
            }
        }

        if (layout.users.width < 205) {
            $('#ttpUsersList').css({
                width: "200px",
                height: outerHeight + "px",
                position: "absolute",
                top: "0px",
                left: usersListLeft + "px"
            });
            $('#ttpUsersList .ttpUsersList').height(outerHeight - 99 + 'px');
        } else {
            $('#ttpUsersList').css({
                width: layout.users.width + "px",
                height: layout.users.height + "px",
                position: "absolute",
                top: layout.users.top + "px",
                left: layout.users.left + "px"
            });
            $('#ttpUsersList .ttpUsersList').height(layout.users.height - 99 + 'px');
        }

        return true;
    },
    expandChat: function (layout) {
        var bodyWidth = $('body').width(),
            outerWidth = $('#outer').width(),
            outerHeight = $('#outer').height(),
            chatContainerWidth = bodyWidth - outerWidth - 205,
            chatContainerLeft = outerWidth,
            x = $('.chat-container').length;

        // remove old chat windows
        for (; x > 1; x--) {
            $('.chat-container').last().remove();
        }

        $('.chat-container .chatHeader').unbind('mousedown').css('cursor', 'move').find('.chatResizeIcon').remove();
        $('.guest-list-container .chatHeader').unbind('mousedown').mousedown(ttp.ttChatResizeStart);
        $('#top-panel .header').css('cursor', 'move');
        if ($('#TFMPL').length > 0 || $('#tfmExtended').length > 0) {
            chatContainerWidth -= 230;
            chatContainerLeft += 230;
            $('#TFMPL').css({
                top: '0',
                left: outerWidth + 'px'
            });
            $('#tfmExtended').css({
                width: '230px',
                margin: '0',
                left: outerWidth + 'px'
            });
        }

        $('#outer').attr('style', '').css({
            margin: '0',
            position: 'absolute',
            top: layout.main.top + 'px',
            left: layout.main.left + 'px'
        });

        if (layout.chat.width < 205) {
            $('.chat-container').attr('style', '').insertAfter('#outer').css({
                width: chatContainerWidth + 'px',
                height: outerHeight + 2 + 'px',
                top: '0',
                left: chatContainerLeft + 'px'
            }).find('.messages').css({
                width: '100%',
                height: outerHeight - 63 + 'px'
            }).unbind('DOMNodeInserted').bind('DOMNodeInserted', function () {
                $(this).find('.message').last().width(chatContainerWidth - 29)
            }).find('.message').width(chatContainerWidth - 29);
        } else {
            $('.chat-container').attr('style', '').insertAfter('#outer').css({
                width: layout.chat.width + 'px',
                height: layout.chat.height + 'px',
                top: layout.chat.top + 'px',
                left: layout.chat.left + 'px'
            }).find('.messages').css({
                width: '100%',
                height: layout.chat.height - 63 + 'px'
            }).unbind('DOMNodeInserted').bind('DOMNodeInserted', function () {
                $(this).find('.message').last().width(layout.chat.width - 29)
            }).find('.message').width(layout.chat.width - 29);
        }

        $('.chat-container .chatBar').css({
            width: $('.messages').width() + 'px'
        }).find('.input-box').css({
            width: $('.messages').width() - 36 + 'px',
            height: '37px',
            backgroundImage: 'none',
            backgroundColor: '#d4d4d4',
            bottom: '0'
        }).find('input').css({
            top: '6px',
            left: '7px',
            height: '26px',
            backgroundColor: '#ffffff',
            width: $('.messages').width() - 61 + 'px',
            borderRadius: '10px',
            boxShadow: 'inset 0 0 5px #000000',
            padding: '0 5px'
        });

        $('.playlist-container').height(outerHeight - 96 + 'px').find('.mainPane').height(outerHeight - 122 + 'px');
        $('.playlist-container .queueView .songlist').height(outerHeight - 190);
        $('.playlist-container .searchView .songlist').height(outerHeight - 193 + 'px');

        // make sure chat is scrolled to bottom
		$(".chat-container .messages").prop({
            scrollTop: $(".chat-container .messages").prop("scrollHeight")
        });

        return true;
    },
    defaultChat: function () {
        var bodyWidth = $('body').width(),
            outerWidth = $('#outer').width(),
            outerHeight = $('#outer').height(),
            ttChat = ttp.roominfo.chatOffsetTop;

        $('#outer').attr('style', '');
        $('.chat-container').attr('style', '').appendTo('#right-panel').css({
            top: ttChat + 'px',
            height: outerHeight - 96 - ttChat + 'px'
        }).find('.messages').height(outerHeight - 159 - ttChat + 'px');
        $('.chat-container .input-box').attr('style', '').children('input').attr('style', '');
        $('.playlist-container').attr('style', '').height(ttChat + 'px').find('.mainPane').height(ttChat - 25 + 'px');
        $('.playlist-container .queueView .songlist').height(ttChat - 95 + 'px');
        $('.playlist-container .searchView .songlist').height(ttChat - 95 + 'px');
        $('#tfmExtended').attr('style', '');
        $('.guest-list-container').appendTo('#right-panel');

        // remove drag and drop
        $('#outer,.chat-container').removeClass('stackable');
        $('#outer').draggable('destroy');
        $('.chat-container').draggable('destroy').resizable('destroy');

        // add back default behavior
        $('.chat-container .chatHeader').unbind('mousedown').mousedown(ttp.roominfo.chatResizeStart);
        $('.guest-list-container .chatHeader').unbind('mousedown').mousedown(ttp.roominfo.chatResizeStart);

        // make sure chat is scrolled to bottom
        $(".chat-container .messages").prop({
            scrollTop: $(".chat-container .messages").prop("scrollHeight")
        }).unbind('DOMNodeInserted').find('.message').attr('style', '');
    },
    addDragNDrop: function (expandedChat) {
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
    layoutChange:  function (expandedChat, layout, path) {
        var usersListReady = false;
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
        }
    },
    highlightChatMessage: function (message) {
		$($(".message").get().reverse()).each(function () {
			if ($(this).find(".speaker").text() === unescape(message.name) && $(this).find(".text").text() === (": " + unescape(message.text))) {
				$(this).css("background-color", "#ff9");
				return;
			}
		});
	},
    toggleMute: function () {
        var volume = ttp.roommanager.volume_bars ? 0 : ttp.roommanager.last_volume_bars;
		ttp.roommanager.set_volume(volume);
		ttp.roommanager.callback("set_volume", ttp.roommanager.volume_bars);
		$("#left_speaker").mouseenter().mouseleave();
	},
    speak: function (text) {
		ttp.roominfo.nodes.chatText.value = text;
		ttp.roominfo.speak(ttp.enterKey);
	},
    queueSong: function (song) {
		ttp.roominfo.addSong("queue", song);
	},
    processUsersQueue: function () {
        var x = 0,
            length = ttplus.usersQueue.length;

        for (; x < length; x += 1) {
            if (ttplus.usersQueue[x].updateUserList === "add") {
                ttplus.injectScript(ttplus.addUsers, ttplus.usersQueue[x].users, ttplus.usersQueue[x].room);
            } else if (ttplus.usersQueue[x].updateUserList === "update") {
                ttplus.injectScript(ttplus.updateUser, ttplus.usersQueue[x].user, ttplus.usersQueue[x].vote);
            } else if (ttplus.usersQueue[x].updateUserList === "remove") {
                ttplus.injectScript(ttplus.removeUser, ttplus.usersQueue[x].userid);
            }
        }
        ttplus.usersQueue = [];
    },
    addUsers: function (users, room) {
        var userActionsOpen = false,
            now             = ttp.now(),
            djs             = (ttp.roominfo.djIds.length) ? new RegExp(ttp.roominfo.djIds.join('|')) : false,
            moderators      = (ttp.roominfo.moderators.length) ? new RegExp(ttp.roominfo.moderators.join('|')) : false,
            fanof           = (turntable.user.fanOf.length) ? new RegExp(turntable.user.fanOf.join('|')) : false,
            searchTerm      = ($('#ttpUserSearch input').val() !== '') ? new RegExp(searchTerm.replace(/\s/g,'.*'), 'i') : undefined,
            count           = 0,
            currentDj       = '',
            user,
            x,
            lastActivity,
            usertype,
            displayName,
            showIdleTime,
            idleTimeSpan,
            idDj,
            display,
            ttpBold,
            ttpItalic;

        if (ttp.roominfo.users === {}) {
            window.addUsersTimeout = window.setTimeout(ttplus.addUsers, 100, users, room);
        } else if (window.addUsersTimeout !== undefined) {
            window.clearTimeout(window.addUsersTimeout);
            delete window.addUsersTimeout;
        }

        if ($('#ttpUserActions').css('display') === 'block') {
            userActionsOpen = true;
            $('#ttpUserActions').hide();
        }

        if (room.current_dj !== undefined) {
            currentDj = room.current_dj;
        }

        for (x in users) {
            user = users[x];
            if (!user.hasOwnProperty('userid')) {
                continue;
            } else if (ttp.roominfo.users[user.userid] === undefined) {
                continue;
            }
            if ($('#user' + user.userid).length > 0) {
                lastActivity = $('#user' + user.userid).attr('ttplastactivity');
                $('#user' + user.userid).remove();
            } else {
                lastActivity = now;
            }
            if (user.userid !== turntable.user.id) {
                ttp.roominfo.users[user.userid].lastActivity = lastActivity;
            }
            usertype = "60";
            displayName = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            showIdleTime = false;
            isDj = false;
            if (moderators && moderators.test(user.userid)) {
                usertype = "30";
                displayName = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpMod" title="Moderator"></span>';
                showIdleTime = true;
            }
            if (user.userid === ttp.roominfo.creatorId) {
                usertype = "20";
                displayName = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpMod" title="Room Creator"></span>';
                showIdleTime = true;
            }
            if (user.acl > 0) {
                usertype = "10";
                displayName = user.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '<span class="ttpSuper" title="Super User"></span>';
                showIdleTime = true;
            }
            if (fanof && fanof.test(user.userid)) {
                usertype = (usertype === "60") ? "50" : usertype;
                displayName += '<span class="ttpFanned" title="You\'re a fan"></span>';
            }
            if (djs && djs.test(user.userid)) {
                if (usertype == "50" || usertype == "60") {
                    usertype = "40";
                }
                showIdleTime = true;
                isDj = true;
            }
            if (searchTerm !== undefined) {
                if (!searchTerm.test($(this).attr('ttpusername'))) {
                    display = ' style="display:none;"';
                }
            } else {
                display = '';
            }
            idleTimeSpan = (showIdleTime === true) ? '<span class="ttpIdleTime"></span>' : '';
            ttpBold = (isDj === true) ? ' ttpBold' : '';
            ttpItalic = (user.userid === currentDj) ? ' ttpItalic' : '';
            $('#ttpUsersList .ttpUsersList').append('<div class="ttpUser ttpUserType' + usertype + ttpBold + ttpItalic + '" id="user' + user.userid + '" ttpUserType="' + usertype + '" ttpUserName="' + user.name.replace(/"/g, '\"') + '" ttpUserSort="' + usertype + user.name.replace(/"/g, '\"').toUpperCase() + '" ttpLastActivity="' + lastActivity + '"' + display + '>' + idleTimeSpan + displayName + '</div>');
            count += 1;
        }

        if (typeof room === "object") {
            if (typeof room.listeners === "number" && room.listeners > 0) {
                ttp.room.listeners = room.listeners;
                $("#ttpRoomListeners").text(ttp.room.listeners);
            }
            if (typeof room.upvotes === "number" && room.upvotes >= 0) {
                ttp.room.upvotes = room.upvotes;
                $("#ttpRoomUpvotes").text(ttp.room.upvotes);
            }
            if (typeof room.downvotes === "number" && room.downvotes >= 0) {
                ttp.room.downvotes = room.downvotes;
                $("#ttpRoomDownvotes").text(ttp.room.downvotes);
            }
        } else {
            ttp.room.listeners += count;
            $("#ttpRoomListeners").text(ttp.room.listeners);
        }
        $('#ttpUsersList .ttpUsersList .ttpUser').sortElements(function (a, b) {
            return $(a).attr('ttpusersort') > $(b).attr('ttpusersort') ? 1 : -1;
        });
        if (userActionsOpen) {
            $('#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected').after($('#ttpUserActions')).click();
        }
        return true;
	},
	updateUser: function (user, vote) {
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
	},
    removeUser: function (userid) {
		if ($('#user' + userid).next().attr('id') == "ttpUserActions") {
            $('#ttpUserActions').hide();
        }
		$('#user' + userid).remove();
		$('#ttpUsersList .ttpUsersList .ttpUser.ttpUserSelected').after($('#ttpUserActions'));
        ttp.room.listeners -= 1;
        $("#ttpRoomListeners").text(ttp.room.listeners);
		return true;
	},
    updateRoomStats: function (room) {
        var hearts = 0;
		if (typeof room !== "object") {
            return;
        }
        if (ttp.room.hearts !== undefined) {
            hearts = ttp.room.hearts;
        }
		ttp.room = room;
        ttp.room.hearts = hearts;
		$('#ttpRoomListeners').text(ttp.room.listeners);
		$('#ttpRoomUpvotes').text(ttp.room.upvotes);
		$('#ttpRoomDownvotes').text(ttp.room.downvotes);
	},
    getUsers: function () {
		return ttp.roominfo.users;
	},
    ignoreUsers: function (ignoredUsers) {
		ttp.roominfo.ignoredUsers = ignoredUsers;
	},
    setStartTime: function () {
		ttp.startTime = ttp.now();
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

ttplus.init();
