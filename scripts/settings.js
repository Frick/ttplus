var active_pane   = 1;
var pane_count    = 1;
var menu_count    = 1;
var pane_distance = 0;
var move_distance = 0;
var container_width = 970;
var next_pane = 0;

function jumpToPane(pane_number){
    //calculate distance to next pane
    pane_distance = pane_number - active_pane;
    move_distance = (container_width+100)*pane_distance;
    //pane is to the right, we get a positive number
    if(pane_distance > 0){
        $('.container').each(function(){
            $(this).animate({left: "-="+(move_distance)+"px"}, 250);
        });
        active_pane = pane_number;
    }else if(pane_distance < 0){
        $('.container').each(function(){
            $(this).animate({left: "+="+(-move_distance)+"px"}, 250);
        });
        active_pane = pane_number;
    }else{
        //panes are the same, so do nothing
        return;
    }
}

$(window).resize(function() {
  width = $(window).width();
  margins = ((width-container_width)/2);
  $('.container[rel=1]').css({margin:'0 '+50+'px 0 '+margins+'px'});
});


$(document).ready(function(){
    var width = $(window).width();
    var container_width = $('.container').width();
    var margins = ((width-container_width)/2);

    $('.container').each(function(){
        if(pane_count == 1){
            $(this).css({margin:'0 '+50+'px 0 '+margins+'px'});
        }else{
            $(this).css({margin:'0 '+50+'px 0 '+50+'px'});
        }
        $(this).attr('rel',pane_count);
        pane_count++;
    });

    $($('nav a').get().reverse()).each(function(){
        $(this).attr('rel',menu_count);
        menu_count++;
    });

    $('nav a').click(function(){
        jumpToPane($(this).attr('rel'));
    });

    $('.container').click(function(){
        jumpToPane($(this).attr('rel'));
    });

    $('input,select').keydown(function(e) {
        if (e.keyCode == 37 || e.keyCode == 39) {
            e.stopPropagation();
        }
    });

    $(document).keydown(function(e){
        switch (e.keyCode){
            case 37:
                if(active_pane > 1){
                    next_pane = parseInt(active_pane) - 1;
                    jumpToPane(next_pane);
                }
                break;
            case 39:
                if(active_pane < pane_count - 1){
                    next_pane = parseInt(active_pane) + 1;
                    jumpToPane(next_pane);
                }
                break;
            default:
                return;
        }
    });

    $("label.cbButton").each(function() {
        $(this).next('input[type="checkbox"]').hide();
    });
    $("label.cbButton.true").live('click',function() {
        var label = $(this).text()=="Yes" ? "No" : "Off";
        $(this).removeClass('true').addClass('false').text(label);
        //$(this).find('input[type="checkbox"]').prop('checked', false);
    });
    $("label.cbButton.false").live('click',function() {
        var label = $(this).text()=="No" ? "Yes" : "On";
        $(this).removeClass('false').addClass('true').text(label);
        //$(this).find('input[type="checkbox"]').prop('checked', true);
    });


    // Misc Settings
    $('#search').val(bgPage.ttp.prefs.defaultSearchProvider).change(function(){
        bgPage.ttp.prefs.defaultSearchProvider = $(this).val();
        bgPage.ttp.savePrefs();
    });

    // Panes drag / resize ability
    // on/off toggle
    $('#toggle_pane_controls').prop('checked', bgPage.ttp.prefs.changeLayout);
    if (bgPage.ttp.prefs.changeLayout) {
        $('label[for="toggle_pane_controls"]').removeClass('false').addClass('true').text('Yes');
    } else {
        $('label[for="toggle_pane_controls"]').removeClass('true').addClass('false').text('No');
    }
    $('#toggle_pane_controls').change(function () {
        if ($('#toggle_pane_controls').prop('checked')) {
            bgPage.ttp.prefs.changeLayout = true;
        } else {
            bgPage.ttp.prefs.changeLayout = false;
        }
    });

    /*
    // reset button
    $('#reset_location').click(function () {
        bgPage.ttp.prefs.layout = {
            main: {
                top: 0,
                left: 0
            },
            chat: {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            },
            users: {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            }
        };
        if ($('#toggle_chat_pane').prop('checked')) {
            bgPage.ttp.setLayout(true);
        } else bgPage.ttp.setLayout(false);
    });
    */

    // Notifications

    // notifications toggle
    $('#toggle_notifications').prop('checked',bgPage.ttp.prefs.notifications.on);
    (bgPage.ttp.prefs.notifications.on) ? $('label[for="toggle_notifications"]').removeClass('false').addClass('true').text('On') : $('label[for="toggle_notifications"]').removeClass('true').addClass('false').text('Off');
    $('#toggle_notifications').change(function(){
        if ($('#toggle_notifications').prop('checked')) {
            bgPage.ttp.prefs.notifications.on = true;
        } else bgPage.ttp.prefs.notifications.on = false;
        bgPage.ttp.savePrefs();
    });

    // notification sounds toggle
    $('#toggle_notification_sounds').prop('checked',bgPage.ttp.prefs.notifications.sounds);
    (bgPage.ttp.prefs.notifications.sounds) ? $('label[for="toggle_notification_sounds"]').removeClass('false').addClass('true').text('On') : $('label[for="toggle_notification_sounds"]').removeClass('true').addClass('false').text('Off');
    $('#toggle_notification_sounds').change(function(){
        if ($('#toggle_notification_sounds').prop('checked')) {
            bgPage.ttp.prefs.notifications.sounds = true;
        } else bgPage.ttp.prefs.notifications.sounds = false;
        bgPage.ttp.savePrefs();
    });

    // text only notification toggle
    $('#toggle_text_notifications').prop('checked',bgPage.ttp.prefs.notifications.textOnly);
    (bgPage.ttp.prefs.notifications.textOnly) ? $('label[for="toggle_text_notifications"]').removeClass('false').addClass('true').text('On') : $('label[for="toggle_text_notifications"]').removeClass('true').addClass('false').text('Off');
    $('#toggle_text_notifications').change(function(){
        if ($('#toggle_text_notifications').prop('checked')) {
            bgPage.ttp.prefs.notifications.textOnly = true;
            // disable anything to do with sounds
            $('label[for="toggle_notification_sounds"]').removeClass('true').removeClass('false').addClass('disabled').text('N/A');
            $('#keyword_play_sound').prop('disabled',true);
            $('#keyword_fade_time').prop('disabled',true);
            $('#newsong_play_sound').prop('disabled',true);
            $('#newsong_fade_time').prop('disabled',true);
            $('#dj_play_sound').prop('disabled',true);
            $('#dj_fade_time').prop('disabled',true);
            $('#vote_play_sound').prop('disabled',true);
            $('#vote_fade_time').prop('disabled',true);
        } else {
            bgPage.ttp.prefs.notifications.textOnly = false;
            // enable anything to do with sounds
            (bgPage.ttp.prefs.notifications.sounds) ? $('label[for="toggle_notification_sounds"]').removeClass('disabled').addClass('true').text('On') : $('label[for="toggle_notification_sounds"]').removeClass('disabled').addClass('false').text('Off');
            $('#keyword_play_sound').prop('disabled',false);
            $('#keyword_fade_time').prop('disabled',false);
            $('#newsong_play_sound').prop('disabled',false);
            $('#newsong_fade_time').prop('disabled',false);
            $('#dj_play_sound').prop('disabled',false);
            $('#dj_fade_time').prop('disabled',false);
            $('#vote_play_sound').prop('disabled',false);
            $('#vote_fade_time').prop('disabled',false);
        }
        bgPage.ttp.savePrefs();
    });

    // keyword notifications
    $('#keyword_notification').prop('checked',bgPage.ttp.prefs.notifications.chat.on);
    if (bgPage.ttp.prefs.notifications.chat.on) {
        $('label[for="keyword_notification"]').removeClass('false').addClass('true').text('On');
    } else $('label[for="keyword_notification"]').removeClass('true').addClass('false').text('Off');
    $('#keyword_notification').change(function(){
        if ($(this).prop('checked')) {
            bgPage.ttp.prefs.notifications.chat.on = true;
        } else bgPage.ttp.prefs.notifications.chat.on = false;
        bgPage.ttp.savePrefs();
    });
    $('#keyword_play_sound').val(bgPage.ttp.prefs.notifications.chat.sound);
    $('#keyword_play_sound').change(function(){
        bgPage.ttp.prefs.notifications.chat.sound = $(this).val();
        bgPage.ttp.savePrefs();
    });
    $('#keyword_display_time').val(bgPage.ttp.prefs.notifications.chat.duration / 1000);
    $('#keyword_display_time').change(function(){
        bgPage.ttp.prefs.notifications.chat.duration = parseInt($(this).val() * 1000);
        bgPage.ttp.savePrefs();
    });
    $('#keyword_fade_time').val(bgPage.ttp.prefs.notifications.chat.fade);
    $('#keyword_fade_time').change(function(){
        bgPage.ttp.prefs.notifications.chat.fade = parseInt($(this).val());
        bgPage.ttp.savePrefs();
    });

    // song notifications
    $('#newsong_notification').prop('checked',bgPage.ttp.prefs.notifications.song.on);
    if (bgPage.ttp.prefs.notifications.song.on) {
        $('label[for="newsong_notification"]').removeClass('false').addClass('true').text('On');
    } else $('label[for="newsong_notification"]').removeClass('true').addClass('false').text('Off');
    $('#newsong_notification').change(function(){
        if ($(this).prop('checked')) {
            bgPage.ttp.prefs.notifications.song.on = true;
        } else bgPage.ttp.prefs.notifications.song.on = false;
        bgPage.ttp.savePrefs();
    });
    $('#newsong_play_sound').val(bgPage.ttp.prefs.notifications.song.sound);
    $('#newsong_play_sound').change(function(){
        bgPage.ttp.prefs.notifications.song.sound = $(this).val();
        bgPage.ttp.savePrefs();
    });
    $('#newsong_display_time').val(bgPage.ttp.prefs.notifications.song.duration / 1000);
    $('#newsong_display_time').change(function(){
        bgPage.ttp.prefs.notifications.song.duration = parseInt($(this).val() * 1000);
        bgPage.ttp.savePrefs();
    });
    $('#newsong_fade_time').val(bgPage.ttp.prefs.notifications.song.fade);
    $('#newsong_fade_time').change(function(){
        bgPage.ttp.prefs.notifications.song.fade = parseInt($(this).val());
        bgPage.ttp.savePrefs();
    });

    // open DJ spot notifications
    $('#dj_notification').prop('checked',bgPage.ttp.prefs.notifications.djSpot.on);
    if (bgPage.ttp.prefs.notifications.djSpot.on) {
        $('label[for="dj_notification"]').removeClass('false').addClass('true').text('On');
    } else $('label[for="dj_notification"]').removeClass('true').addClass('false').text('Off');
    $('#dj_notification').change(function(){
        if ($(this).prop('checked')) {
            bgPage.ttp.prefs.notifications.djSpot.on = true;
        } else bgPage.ttp.prefs.notifications.djSpot.on = false;
        bgPage.ttp.savePrefs();
    });
    $('#dj_play_sound').val(bgPage.ttp.prefs.notifications.djSpot.sound);
    $('#dj_play_sound').change(function(){
        bgPage.ttp.prefs.notifications.djSpot.sound = $(this).val();
        bgPage.ttp.savePrefs();
    });
    $('#dj_display_time').val(bgPage.ttp.prefs.notifications.djSpot.duration / 1000);
    $('#dj_display_time').change(function(){
        bgPage.ttp.prefs.notifications.djSpot.duration = parseInt($(this).val() * 1000);
        bgPage.ttp.savePrefs();
    });
    $('#dj_fade_time').val(bgPage.ttp.prefs.notifications.djSpot.fade);
    $('#dj_fade_time').change(function(){
        bgPage.ttp.prefs.notifications.djSpot.fade = parseInt($(this).val());
        bgPage.ttp.savePrefs();
    });

    // voting notifications
    $('#vote_notification').prop('checked',bgPage.ttp.prefs.notifications.vote.on);
    if (bgPage.ttp.prefs.notifications.vote.on) {
        $('label[for="vote_notification"]').removeClass('false').addClass('true').text('On');
    } else $('label[for="vote_notification"]').removeClass('true').addClass('false').text('Off');
    $('#vote_notification').change(function(){
        if ($(this).prop('checked')) {
            bgPage.ttp.prefs.notifications.vote.on = true;
        } else bgPage.ttp.prefs.notifications.vote.on = false;
        bgPage.ttp.savePrefs();
    });
    $('#vote_play_sound').val(bgPage.ttp.prefs.notifications.vote.sound);
    $('#vote_play_sound').change(function(){
        bgPage.ttp.prefs.notifications.vote.sound = $(this).val();
        bgPage.ttp.savePrefs();
    });
    $('#vote_display_time').val(bgPage.ttp.prefs.notifications.vote.duration / 1000);
    $('#vote_display_time').change(function(){
        bgPage.ttp.prefs.notifications.vote.duration = parseInt($(this).val() * 1000);
        bgPage.ttp.savePrefs();
    });
    $('#vote_fade_time').val(bgPage.ttp.prefs.notifications.vote.fade);
    $('#vote_fade_time').change(function(){
        bgPage.ttp.prefs.notifications.vote.fade = parseInt($(this).val());
        bgPage.ttp.savePrefs();
    });

    // Notification Keywords
    $('#keyword_text').keypress(function(e){
        if (e.keyCode == 13) {
            bgPage.ttp.addChatKeyword($(this).val().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            populateChatKeywords();
            $(this).val('');
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    });
    populateChatKeywords();

    // display version
    $('#version').text(bgPage.ttp.version);

    if (bgPage.ttp.prefs.notifications.textOnly) {
        $('label[for="toggle_notification_sounds"]').removeClass('true').removeClass('false').addClass('disabled').text('N/A');
        $('#keyword_play_sound').prop('disabled',true);
        $('#keyword_fade_time').prop('disabled',true);
        $('#newsong_play_sound').prop('disabled',true);
        $('#newsong_fade_time').prop('disabled',true);
        $('#dj_play_sound').prop('disabled',true);
        $('#dj_fade_time').prop('disabled',true);
        $('#vote_play_sound').prop('disabled',true);
        $('#vote_fade_time').prop('disabled',true);
    }
});

var bgPage = chrome.extension.getBackgroundPage();
function populateChatKeywords() {
    $('#keyword_list').html('');
    for (var x in bgPage.ttp.prefs.notifications.chat.keywords) {
        $('#keyword_list').append('<li><div class="remove" title="remove from notifications"></div><span class="keyword">'+bgPage.ttp.prefs.notifications.chat.keywords[x]+'</span></li>')
    }
    $('#keyword_list div.remove').click(function(){
        bgPage.ttp.removeChatKeyword($(this).next().html());
        populateChatKeywords();
    });
}
