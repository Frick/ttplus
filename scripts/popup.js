var bgPage = chrome.extension.getBackgroundPage(),
    messageid = 0,
    msgId,
    x = 0,
    length = 0,
    searchTimeout = null,
    msgCallbacks = [],
    send = function (json, callback) {
        msgId = bgPage.ttp.send(json, process);
        if (typeof callback === "function") {
            msgCallbacks.push([
                msgId,
                callback
            ]);
        }
    },
    exec = function (request, callback) {
        send({
            command: request
        }, callback);
    },
    process = function (response, id) {
        for (x = 0, length = msgCallbacks.length; x < length; x += 1) {
            if (msgCallbacks[x][0] === id) {
                msgCallbacks[x][1](response);
            }
        }
    },
    buildPopup = function (tabId) {
        $('.roomName').html(bgPage.ttp.room.name);
        $('.controls').append('<div class="search"><form class="frmSearch" onsubmit="return false;"><input type="text" class="songSearch" placeholder="search" /></form></div>');
        if (bgPage.ttp.prefs.notifications.sounds) {
            $('.controls').append('<div class="notifySounds" title="Mute Notification Sounds"></div>');
        } else {
            $('.controls').append('<div class="notifySounds mute" title="Unmute Notification Sounds"></div>');
        }
        $('.notifySounds').click(function () {
            _gaq.push(['_trackEvent', 'Mute Buttons', 'Notification Sounds']);
            if ($(this).hasClass('mute')) {
                bgPage.ttp.prefs.notifications.sounds = true;
                bgPage.ttp.savePrefs();
                $(this).removeClass('mute').attr('title', 'Mute Notification Sounds');
            } else {
                bgPage.ttp.prefs.notifications.sounds = false;
                $(this).addClass('mute').attr('title', 'Unmute Notification Sounds');
            }
        });
        if (bgPage.ttp.prefs.notifications.on) {
            $('.controls').append('<div class="notify" title="Disable Notifications"></div>');
        } else {
            $('.controls').append('<div class="notify mute" title="Enable Notifications"></div>');
        }
        $('.notify').click(function () {
            _gaq.push(['_trackEvent', 'Mute Buttons', 'Notifications']);
            if ($(this).hasClass('mute')) {
                bgPage.ttp.prefs.notifications.on = true;
                bgPage.ttp.savePrefs();
                $(this).removeClass('mute').attr('title', 'Disable Notifications');
            } else {
                bgPage.ttp.prefs.notifications.on = false;
                $(this).addClass('mute').attr('title', 'Enable Notifications');
            }
        });
        exec("ttp.roominfo.muted ? true : false;", function (muted) {
            if (muted) {
                $('.controls').append('<div class="music mute" title="Unmute"></div>');
            } else {
                $('.controls').append('<div class="music" title="Mute"></div>');
            }
            $('.music').click(function(){
                _gaq.push(['_trackEvent', 'Mute Buttons', 'Music']);
                bgPage.ttp.send({toggleMute: true});
                if ($(this).hasClass('mute')) {
                    $(this).removeClass('mute').attr('title', 'Unmute');
                } else {
                    $(this).addClass('mute').attr('title', 'Mute');
                }
            });
        });

        buildSonglog();
        buildChat();
        buildChatlog();
        buildCalendar();

        $('.tabs').show();
        $('.tab').click(function (e) {
            $('.tab').removeClass('selected');
            $(this).addClass('selected');
            $('#main').children().hide();
            if ($(this).hasClass('songtab')) {
                bgPage.ttp.lastPopupTab = 'songtab';
                $('#songlog').show();
                $("body").prop({scrollTop: "0"});
                $('.fixedHeader .controls .search .frmSearch .songSearch').css({background: "#FAFAFA url(/images/search.png) no-repeat right"}).prop("placeholder", "search");
            } else if ($(this).hasClass('chattab')) {
                bgPage.ttp.lastPopupTab = 'chattab';
                $('#chat').show();
                $("body").prop({scrollTop: $("body").prop("scrollHeight")});
                $('.fixedHeader .controls .search .frmSearch .songSearch').css({background: "#FAFAFA"}).prop("placeholder", "enter a message");
            } else if ($(this).hasClass('chatlogtab')) {
                bgPage.ttp.lastPopupTab = 'chatlogtab';
                $('#chatlog').show();
                $("body").prop({scrollTop: "0"});
                $('.fixedHeader .controls .search .frmSearch .songSearch').css({background: "#FAFAFA url(/images/search.png) no-repeat right"}).prop("placeholder", "search");
            } else if ($(this).hasClass('calendar')) {
                bgPage.ttp.lastPopupTab = 'calendar';
                $('#calendar').show();
                $('body').prop({scrollTop: '0'});
                $('html,body').height('575px');
            }
            var height = parseInt($('.fixedHeader').height(), 10) + parseInt($('#main').height(), 10);
            if (height < 580) {
                $('html,body').height(height);
            } else {
                $('html,body').height('580px');
            }
            $('.fixedHeader .controls .search .frmSearch .songSearch').focus();
            popupSearch();
        });
        $('.options').click(function (e) {
            _gaq.push(['_trackEvent', 'Controls', 'Options']);
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.create({
                    index:tab.index + 1,
                    url: chrome.extension.getURL('settings.html')
                });
            });
            e.stopPropagation();
        });

        $('.tabs .tab.' + bgPage.ttp.lastPopupTab).click().addClass('selected');

        $('.fixedHeader .controls .search .frmSearch .songSearch').focus().keydown(function (e) {
            popupSearch(e);
        });
    },
    updateVotes = function (votes) {
        $('#num_upvotes').text(votes.upvotes);
        $('#num_downvotes').text(votes.downvotes);
    },
    buildSonglog = function () {
        var x = 1,
            i = 0,
            length = 0;

        try {
            var songHtml = '<div id="vote"><div id="downvote" class="button" title="Lame"><span id="num_downvotes" class="votes">' + bgPage.ttp.room.metadata.downvotes + '</span></div><div id="upvote" class="button" title="Awesome"><span id="num_upvotes" class="votes">' + bgPage.ttp.room.metadata.upvotes + '</span></div></div>';
        } catch (e) {
            var songHtml = '<div id="vote"><div id="downvote" class="button" title="Lame"></div><div id="upvote" class="button" title="Awesome"></div></div>';
        }
        i = bgPage.ttp.room.metadata.songlog.length;
        while (i -= 1) {
            if (i === (bgPage.ttp.room.metadata.songlog.length - 1)) {
                songHtml += '<div id="track' + x + '" class="nowPlaying track">';
                try {
                    songHtml += '<div class="dj"><span class="name">' + bgPage.ttp.users[bgPage.ttp.room.metadata.current_dj].name + '</span> is playing:</div>';
                } catch (e) {}
            } else {
                songHtml += '<div id="track' + x + '" class="track">';
            }
            songHtml += '<div class="trackNum">' + x + '</div><div class="artist">' + bgPage.ttp.room.metadata.songlog[i].metadata.artist + '</div><div class="title">' + bgPage.ttp.room.metadata.songlog[i].metadata.song + '</div><div class="providers">' +
                '<div class="hulkshare provider" title="Hulkshare"></div>' +
                '<div class="filestube provider" title="FilesTube"></div>' +
                '<div class="youtube provider" title="YouTube"></div>' +
                '<div class="soundcloud provider" title="SoundCloud"></div>' +
                '<div class="google provider" title="Google"></div>';
            if (typeof bgPage.ttp.room.metadata.songlog[i]._id === "string" && bgPage.ttp.room.metadata.songlog[i]._id.length > 0) {
                songHtml += '<div class="djQueue" id="' + bgPage.ttp.room.metadata.songlog[i]._id + '" title="Add to DJ Queue"></div>';
            }
            songHtml += '</div></div>';
            x += 1;
        }
        $('#songlog').html(songHtml);

        $('.dj .name').click(function (e) {
            bgPage.ttp.showDj();
            e.stopPropagation();
        });

        $('#songlog .track').click(function () {
            _gaq.push(['_trackEvent', 'Search', bgPage.ttp.prefs.defaultSearchProvider]);
            bgPage.ttp.performSearch({
                provider: bgPage.ttp.prefs.defaultSearchProvider,
                artist: $(this).find('.artist').text(),
                title: $(this).find('.title').text()
            });
        }).hoverIntent({
            over: function () {
                $(this).find('.providers').slideDown();
            },
            out: function () {
                $(this).find('.providers').slideUp();
            },
            timeout: 100,
            sensitivity:2
        });

        $('#songlog .provider').click(function (e) {
            _gaq.push(['_trackEvent', 'Search', $(this).attr('class').split(' ')[0]]);
            bgPage.ttp.performSearch({
                provider: $(this).attr('class').split(' ')[0],
                artist: $(this).parent().parent().find('.artist').text(),
                title: $(this).parent().parent().find('.title').text()
            });
            e.stopPropagation();
        });

        $('.djQueue').click(function (e) {
            _gaq.push(['_trackEvent', 'Add to DJ Queue', 'clicked']);
            bgPage.ttp.queueSong($(this).attr('id'));
            e.stopPropagation();
        });

        $('#vote').insertBefore($('#songlog .nowPlaying .providers'));
        $('#upvote').click(function (e) {
            _gaq.push(['_trackEvent', 'Votes', 'Awesome']);
            bgPage.ttp.vote("up");
            e.stopPropagation();
        });
        $('#downvote').click(function (e) {
            _gaq.push(['_trackEvent', 'Votes', 'Lame']);
            bgPage.ttp.vote("down");
            e.stopPropagation();
        });
    },
    buildChat = function () {
        var messages = bgPage.ttp.chatMessages;
        var chatHtml = '';
        messageid = messages.length;
        for (var i=(messageid-1); i>=0; i--) {
            chatHtml += '<div id="message' + i + '" class="message"><span class="sender">' + messages[i].name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span><span class="text">: ' + messages[i].text.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span></div>';
        }
        $('#chat').html(chatHtml);

        if ($('.tabs .chattab').hasClass('selected')) {
            var height = parseInt($('.fixedHeader').height()) + parseInt($('#main').height());
            if (height < 580) {
                $('html,body').height(height);
            } else {
                $('html,body').height('580px');
            }
        }
    },
    addMessage = function (message) {
        messageid += 1;
        $('#chat').append('<div id="message' + messageid + '" class="message"><span class="sender">' + message.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span><span class="text">: ' + message.text.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span></div>');
        if ($('.tabs .chattab').hasClass('selected')) {
            $("body").prop({scrollTop: $("body").prop("scrollHeight")});
        }
    },
    buildChatlog = function () {
        var chatHtml = '<div class="deleteall"><span id="clearMessages">clear all messages</span></div>';
        for (var i=(bgPage.ttp.storage.messages.length-1); i>=0; i--) {
            chatHtml += '<div id="logmessage' + i + '" class="message">' +
                '<span class="sender">' + bgPage.ttp.storage.messages[i].sender.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span><span class="text">: ' + bgPage.ttp.storage.messages[i].text.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>' +
                '<div class="timestamp">' + bgPage.ttp.storage.messages[i].formattedTime + '</div>' +
                '<div class="delete" title="delete message"></div>' +
                '</div>';
        }
        $('#chatlog').html(chatHtml);

        $('#chatlog .message').hover(function(){
            $(this).find('.delete').show();
        },function(){
            $(this).find('.delete').hide();
        });
        $('#chatlog .message .delete').click(function(){
            bgPage.ttp.storage.removeMessage(parseInt($(this).parent().attr('id').substr(7)));
            buildChatlog();
        });
        $('#clearMessages').click(function(){
            bgPage.ttp.storage.removeMessage('all');
            buildChatlog();
        });
        if ($('.tabs .chatlogtab').hasClass('selected')) {
            var height = parseInt($('.fixedHeader').height()) + parseInt($('#main').height());
            if (height < 580) {
                $('html,body').height(height);
            } else {
                $('html,body').height('580px');
            }
        }
    },
    buildCalendar = function () {
        $('#calendar').html('<iframe src="https://www.google.com/calendar/embed?showTitle=0&amp;showNav=0&amp;showDate=0&amp;showPrint=0&amp;showTabs=0&amp;showCalendars=0&amp;mode=AGENDA&amp;height=440&amp;wkst=1&amp;bgcolor=%230C5AA2&amp;src=r45malsboglaloqguqve4n375o%40group.calendar.google.com&amp;color=%230C5AA2&amp;ctz=America%2FNew_York" style="border-width:0;width:350px;height:440px;" width="350" height="440" frameborder="0" scrolling="no"></iframe>');
        /*
         *
         * Eventually replace with custom styling, HTTP linking, etc by using JSON feed
         *
         * $.getJSON("http://www.google.com/calendar/feeds/r45malsboglaloqguqve4n375o%40group.calendar.google.com/public/full?alt=json-in-script&max-results=25&singleevents=true&futureevents=true&sortorder=ascending&orderby=starttime&callback=?", function (json) {console.log(json);});
         *
         */
    },
    popupSearch = function (e) {
        if ($('.tabs .chattab').hasClass('selected')) {
            if (typeof(e) == "object" && e.keyCode == 13) {
                e.preventDefault();
                e.stopPropagation();
                var $input = $('.fixedHeader .controls .search .frmSearch .songSearch');
                send({speak:$input.val()});
                $input.val('');
            }
            return false;
        }

        if (typeof(e) == "object" && e.keyCode == 13) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        } else if (typeof(e) == "object") {
            if (searchTimeout != null) window.clearTimeout(searchTimeout);
            searchTimeout = window.setTimeout(popupSearch, 300);
            return;
        }

        var searchterm = $('.fixedHeader .controls .search .frmSearch .songSearch').val();
        $('#main #songlog .track').show();
        $('#main #chatlog .message').show();
        if (searchterm == '') return;
        var searchTerm = new RegExp(searchterm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\s/g,'.*'),'i');
        if ($('.tabs .songtab').hasClass('selected')) {
            $('#main #songlog .track').each(function(){
                if (!searchTerm.test($(this).find('.artist').text() + ' ' + $(this).find('.title').text())) {
                    $(this).hide();
                }
            });
        } else     if ($('.tabs .chatlogtab').hasClass('selected')) {
            $('#main #chatlog .message').each(function(){
                if (!searchTerm.test($(this).find('.sender').text() + ' ' + $(this).find('.text').text() + ' ' + $(this).find('.timestamp').text())) {
                    $(this).hide();
                }
            });
        }
        var height = parseInt($('.fixedHeader').height()) + parseInt($('#main').height());
        if (height < 580) {
            $('html,body').height(height);
        } else {
            $('html,body').height('580px');
        }
    };

$(document).ready(function () {
    $('.roomName').click(function () {
        bgPage.ttp.openTurntable();
    });
    bgPage.ttp.getTurntableTabId(function (tabId) {
        if (typeof tabId !== "number") {
            $('.header').width('350px').css('border-radius', '4px').find('.controls').height('0px');
            $('html,body').height('479px').css('margin', '0');
            buildCalendar();
        } else {
            buildPopup(tabId);
        }
    }, true);
});

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-24876382-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'),
        s;
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();
