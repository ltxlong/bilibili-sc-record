// ==UserScript==
// @name         B站直播间SC记录板
// @namespace    http://tampermonkey.net/
// @homepage     https://greasyfork.org/zh-CN/scripts/484381
// @version      9.0.0
// @description  实时同步SC、同接、高能和舰长数据，可拖拽移动，可导出，可单个SC折叠，可侧折，可记忆配置，可生成图片（右键菜单），活动页可用，黑名单功能，不用登录，多种主题切换，直播全屏也在顶层显示，自动清除超过12小时的房间SC存储
// @author       ltxlong
// @match        *://live.bilibili.com/1*
// @match        *://live.bilibili.com/2*
// @match        *://live.bilibili.com/3*
// @match        *://live.bilibili.com/4*
// @match        *://live.bilibili.com/5*
// @match        *://live.bilibili.com/6*
// @match        *://live.bilibili.com/7*
// @match        *://live.bilibili.com/8*
// @match        *://live.bilibili.com/9*
// @match        *://live.bilibili.com/blanc/1*
// @match        *://live.bilibili.com/blanc/2*
// @match        *://live.bilibili.com/blanc/3*
// @match        *://live.bilibili.com/blanc/4*
// @match        *://live.bilibili.com/blanc/5*
// @match        *://live.bilibili.com/blanc/6*
// @match        *://live.bilibili.com/blanc/7*
// @match        *://live.bilibili.com/blanc/8*
// @match        *://live.bilibili.com/blanc/9*
// @icon         https://www.bilibili.com/favicon.ico
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.7.1/jquery.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

    function sc_catch_log(...msg) {
        console.log('%c[sc_catch]', 'font-weight: bold; color: white; background-color: #A7C9D3; padding: 2px; border-radius: 2px;', ...msg);
    }

    // 抓取SC ：https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=
    // 进入直播间的时候开始记录SC
    // 开始固定在屏幕左上方一侧，为圆形小图标，可以点击展开，可以拖拽移动，活动页可用，直播全屏也在顶层显示
    // 通过Hook实时抓取数据
    // 每个直播间隔离保留，用localstorage，并且自动清理时间长的数据
    // SC标明发送时间和距离当前的时间差
    // SC可折叠，可生成图片（折叠和展开都可以）
    // 黑名单功能
    // 右键菜单功能
    // 侧折模式功能
    // 记忆模式选择功能
    // 记忆模式说明：
    // 没记：没有记忆配置
    // 题记：只记忆主题，所有<题记>房间共用一个主题配置
    // 个记：独立记忆当前房间的所有配置
    // 全记：所有的房间共用的记忆配置
    // 记忆的优先级：
    // 全记 > 个记 > 题记
    // 进入直播房间的时候会依次检查优先级，来进行自动加载配置
    // 例子说明：
    // 有四个直播房间：
    // A、B、C、D
    // 已经打开：A[题记]，B[个记]
    // 现在打开C房间，会从[全记]->[个记]->[题记]依次检查，都没有则默认是[没记]。
    // 当C从[没记]切换到[题记]时，如果[题记]存在记忆的主题，C的主题会自动切换到[题记]记忆的主题，当C切换主题时候，会更新[题记]记忆的主题
    // 这个时候，虽然A和C都是[题记]模式，但是主题却不一样，其中C的主题才是[题记]记忆的最新主题，当A页面刷新后，会变为[题记]最新记忆的主题
    // 当C从[题记]切换到[个记]，[题记]的房间中剔除C，并且C会立即生成自己的独立配置，处于[个记]模式下，C的所有配置操作都会独立记忆
    // 当C从[个记]切换到[全记]，C的[个记]独立配置会立即删除，并且会将自己的所有配置生成[全记]的配置，如果这个时候，A、B页面刷新，会自动加载[全记]的配置
    // 现在打开D房间，由于已经存在[全记]的配置，所以D会自动加载[全记]的配置。
    // 如果这个时候，D从[全记]切换到[没记]，那么所有页面的[全记]都会失效，最多30秒后，其余[全记]页面的按钮会变为[没记]（因为每30秒检查一次）
    // 刷新A、B页面，A会自动加载[题记], B会自动加载[个记]，即都会恢复为被[全记]影响之前的配置模式
    // 总结：
    // [个记]的删除时机：从[个记]点击按钮，手动切换到[全记]
    // [全记]的删除时机：从[全记]点击按钮，手动切换到[没记]
    // [题记]和[全记]的区别：
    // [题记]是一个小圈子，这个圈子有自己的主题颜色，每个房间都可以加入其中，切换加入的时候，该房间会被动的染上圈子的主题颜色，并且也有权限改变圈子的颜色
    // [全记]是一个全局权限，当有一个房间切换到[全记]时，即拿到了这个全局权限，并且复制自己的所有配置附加在上面，
    // 后续每一个新进入/刷新的房间都会自动获得这个全局权限并且自动加载上面的配置，
    // 当其中一个房间从[全记]模式切换到[没记]的时候，这个全局权限就会失效，最多30秒后，其余[全记]页面的按钮会变为[没记]（因为每30秒检查一次），其余房间刷新页面会恢复被[全记]影响之前的配置模式

    let room_id = unsafeWindow.location.pathname.split('/').pop();
    let sc_url_api = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=';

    sc_catch_log('url_room_id:', room_id);

    if (!room_id) { sc_catch_log('获取room_id失败，插件已停止正确的SC存储'); }

    let sc_url = sc_url_api + room_id; // 请求sc的url

    let sc_panel_high = 400; // 显示面板的最大高度（单位是px，后面会拼接）
    let sc_rectangle_width = 302; // 默认302，右侧合适325/388/428（SC刚刚好在弹幕框内/侧折模式记录板紧贴在弹幕框右侧外/侧折模式记录板紧贴在屏幕右侧）

    let data_show_top_flag = true; // 是否在页面右侧弹幕滚动框的顶部动态显示数据
    let data_show_bottom_flag = true; // 是否在页面右侧弹幕滚动框的底部动态显示数据

    let sc_localstorage_key = 'live_' + room_id + '_sc';
    let sc_sid_localstorage_key = 'live_' + room_id + '_sc_sid';
    let sc_live_room_title = '';

    let sc_keep_time_key = 'live_' + room_id + '_sc_keep_time';
    let sc_clear_time_hour = 12; // 大于sc_clear_time_hour(默认12)小时即清除上一次的存储（会自动遍历检测所有存储的房间）
    let sc_now_time = (new Date()).getTime();
    let sc_keep_time = unsafeWindow.localStorage.getItem(sc_keep_time_key);
    let sc_keep_time_flag = 0;

    let high_energy_num = 0;
    let sc_update_date_guard_once = false;

    let sc_room_blacklist_flag = false;

    // 0-侧折模式下显示所有的按钮
    // 1-侧折模式下隐藏所有的按钮
    // 2-侧折模式下按钮的极简模式（只显示菜单和折叠按钮）
    // 3-侧折模式下只显示折叠按钮
    // 4-侧折模式下只显示菜单按钮
    let sc_func_btn_mode = 0;

    let sc_panel_allow_drag_flag = true; // 是否可以拖拽

    let sc_side_fold_custom_config = 0; // 侧折模式的自定义：0-默认，1-第一个展开，2-第一个展开时间自定义
    let sc_side_fold_custom_time = 0;
    let sc_side_fold_custom_first_class = '';
    let sc_side_fold_custom_first_timeout_id = '';

    let sc_start_time_show_flag = true; //是否显示SC发送的具体时间

    let sc_welt_hide_circle_half_flag = false; // 是否小图标贴边半隐藏

    let sc_side_fold_custom_each_same_time_flag = false; // 是否每个实时SC都有相同的展开时间
    let sc_side_fold_custom_each_same_time_class = '';
    let sc_side_fold_custom_each_same_time_timeout_id = '';
    let sc_side_fold_custom_auto_run_flag = false; // 是否在运行自动展现SC了
    let sc_side_fold_custom_stop_from_auto_flag = false; // 是否自动运行时间到的停止

    let sc_memory = 0; // 0-没记，1-题记，2-个记，3-全记
    let sc_switch = 0;
    let sc_panel_fold_mode = 0; // 0-最小化，1-侧折，2-展开
    let sc_panel_side_fold_simple = false; // 侧折的极简模式
    let sc_panel_drag_left = -1;
    let sc_panel_drag_top = -1;
    let sc_panel_side_fold_flag = false; // 侧折
    let sc_item_side_fold_touch_flag = false;
    let sc_item_side_fold_touch_oj = {};
    let sc_self_memory_config_key = 'live_' + room_id + '_sc_self_memory_config';

    let sc_isDragging = false;
    let sc_isClickAllowed = true;
    let sc_drag_start = 0; // 兼容有的时候点击触发拖拽的情况
    let sc_offsetX = 0;
    let sc_offsetY = 0;
    let sc_isListEmpty = true;
    let sc_isFullscreen = false;

    let sc_rectangle_is_slide_down = false;
    let sc_rectangle_is_slide_up = false;
    let sc_rectangle_mouse_out = true;

    let sc_live_sidebar_left_flag = false; // 是否设置直播间的右侧滑动按钮在左侧

    function sc_memory_get_store_mode_all(sc_all_memory_config_json) {
        let sc_all_memory_config = JSON.parse(sc_all_memory_config_json);
        sc_switch = sc_all_memory_config['sc_switch'] ?? 0;
        sc_panel_fold_mode = sc_all_memory_config['sc_panel_fold_mode'] ?? 0;
        sc_panel_side_fold_flag = sc_all_memory_config['sc_panel_side_fold_flag'] ?? false;
        sc_panel_side_fold_simple = sc_all_memory_config['sc_panel_side_fold_simple'] ?? false;
        sc_panel_drag_left = sc_all_memory_config['sc_panel_drag_left'] ?? -1;
        sc_panel_drag_top = sc_all_memory_config['sc_panel_drag_top'] ?? -1;
        sc_func_btn_mode = sc_all_memory_config['sc_func_btn_mode'] ?? 0;
        data_show_bottom_flag = sc_all_memory_config['data_show_bottom_flag'] ?? true;
        sc_panel_allow_drag_flag = sc_all_memory_config['sc_panel_allow_drag_flag'] ?? true;
        sc_side_fold_custom_config = sc_all_memory_config['sc_side_fold_custom_config'] ?? 0;
        sc_side_fold_custom_time = sc_all_memory_config['sc_side_fold_custom_time'] ?? 10;
        sc_start_time_show_flag = sc_all_memory_config['sc_start_time_show_flag'] ?? true;
        sc_welt_hide_circle_half_flag = sc_all_memory_config['sc_welt_hide_circle_half_flag'] ?? false;
        sc_side_fold_custom_each_same_time_flag = sc_all_memory_config['sc_side_fold_custom_each_same_time_flag'] ?? false;
        sc_rectangle_width = sc_all_memory_config['sc_rectangle_width'] ?? 302;
        sc_live_sidebar_left_flag = sc_all_memory_config['sc_live_sidebar_left_flag'] ?? false;

        if (sc_panel_fold_mode === 1 && (unsafeWindow.innerWidth - sc_panel_drag_left) < 72) {
            sc_panel_drag_left = unsafeWindow.innerWidth - 72;
        }
        if (sc_panel_fold_mode === 2 && (unsafeWindow.innerWidth - sc_panel_drag_left) < sc_rectangle_width) {
            sc_panel_drag_left = unsafeWindow.innerWidth - sc_rectangle_width;
        }

        if (sc_panel_drag_top <= 0) {
            sc_panel_drag_top = 0;
        }
        if (sc_panel_drag_top >= unsafeWindow.innerHeight) {
            sc_panel_drag_top = unsafeWindow.innerHeight - sc_panel_high;
        }
    }

    function sc_memory_get_store_mode_self(sc_self_memory_config_json) {
        let sc_self_memory_config = JSON.parse(sc_self_memory_config_json);
        sc_switch = sc_self_memory_config['sc_switch'] ?? 0;
        sc_panel_fold_mode = sc_self_memory_config['sc_panel_fold_mode'] ?? 0;
        sc_panel_side_fold_flag = sc_self_memory_config['sc_panel_side_fold_flag'] ?? false;
        sc_panel_side_fold_simple = sc_self_memory_config['sc_panel_side_fold_simple'] ?? false;
        sc_panel_drag_left = sc_self_memory_config['sc_panel_drag_left'] ?? -1;
        sc_panel_drag_top = sc_self_memory_config['sc_panel_drag_top'] ?? -1;
        sc_func_btn_mode = sc_self_memory_config['sc_func_btn_mode'] ?? 0;
        data_show_bottom_flag = sc_self_memory_config['data_show_bottom_flag'] ?? true;
        sc_panel_allow_drag_flag = sc_self_memory_config['sc_panel_allow_drag_flag'] ?? true;
        sc_side_fold_custom_config = sc_self_memory_config['sc_side_fold_custom_config'] ?? 0;
        sc_side_fold_custom_time = sc_self_memory_config['sc_side_fold_custom_time'] ?? 10;
        sc_start_time_show_flag = sc_self_memory_config['sc_start_time_show_flag'] ?? true;
        sc_welt_hide_circle_half_flag = sc_self_memory_config['sc_welt_hide_circle_half_flag'] ?? false;
        sc_side_fold_custom_each_same_time_flag = sc_self_memory_config['sc_side_fold_custom_each_same_time_flag'] ?? false;
        sc_rectangle_width = sc_self_memory_config['sc_rectangle_width'] ?? 302;
        sc_live_sidebar_left_flag = sc_self_memory_config['sc_live_sidebar_left_flag'] ?? false;

        if (sc_panel_fold_mode === 1 && (unsafeWindow.innerWidth - sc_panel_drag_left) < 72) {
            sc_panel_drag_left = unsafeWindow.innerWidth - 72;
        }
        if (sc_panel_fold_mode === 2 && (unsafeWindow.innerWidth - sc_panel_drag_left) < sc_rectangle_width) {
            sc_panel_drag_left = unsafeWindow.innerWidth - sc_rectangle_width;
        }

        if (sc_panel_drag_top <= 0) {
            sc_panel_drag_top = 0;
        }
        if (sc_panel_drag_top >= unsafeWindow.innerHeight) {
            sc_panel_drag_top = unsafeWindow.innerHeight - sc_panel_high;
        }

        sc_memory = 2;
    }

    function sc_memory_get_store_mode_switch(sc_switch_memory_rooms_json) {
        let sc_switch_memory_rooms = JSON.parse(sc_switch_memory_rooms_json);
        if (sc_switch_memory_rooms.includes(room_id)) {
            let sc_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record');
            if (sc_switch_record !== null && sc_switch_record !== 'null' && sc_switch_record !== '') {
                sc_switch = parseInt(sc_switch_record, 10);
            }

            sc_memory = 1;
        }
    }

    // 记忆配置检查
    // 优先级：3-全记 > 2-个记 > 1-题记
    let sc_memory_all_rooms_mode = unsafeWindow.localStorage.getItem('live_sc_memory_all_rooms_mode');
    if (sc_memory_all_rooms_mode !== null && sc_memory_all_rooms_mode !== 'null' && sc_memory_all_rooms_mode !== '') {
        sc_memory = parseInt(sc_memory_all_rooms_mode, 10);

        // sc_memory_all_rooms_mode的值目前只能是3-全记
        if (sc_memory !== 3) {
            sc_memory = 0;
        }

        if (sc_memory === 3) {
            // 全记
            let sc_all_memory_config_json = unsafeWindow.localStorage.getItem('live_sc_all_memory_config');
            if (sc_all_memory_config_json !== null && sc_all_memory_config_json !== 'null' && sc_all_memory_config_json !== '[]' && sc_all_memory_config_json !== '{}' && sc_all_memory_config_json !== '') {
                sc_memory_get_store_mode_all(sc_all_memory_config_json);
            }
        } else {
            // 个记
            let sc_self_memory_config_json = unsafeWindow.localStorage.getItem(sc_self_memory_config_key);
            if (sc_self_memory_config_json !== null && sc_self_memory_config_json !== 'null' && sc_self_memory_config_json !== '[]' && sc_self_memory_config_json !== '{}' && sc_self_memory_config_json !== '') {
                sc_memory_get_store_mode_self(sc_self_memory_config_json);
            } else {
                // 题记
                let sc_switch_memory_rooms_json = unsafeWindow.localStorage.getItem('live_sc_switch_memory_rooms');
                if (sc_switch_memory_rooms_json !== null && sc_switch_memory_rooms_json !== 'null' && sc_switch_memory_rooms_json !== '[]' && sc_switch_memory_rooms_json !== '') {
                    sc_memory_get_store_mode_switch(sc_switch_memory_rooms_json);
                }
            }
        }
    } else {
        // 个记
        let sc_self_memory_config_json = unsafeWindow.localStorage.getItem(sc_self_memory_config_key);
        if (sc_self_memory_config_json !== null && sc_self_memory_config_json !== 'null' && sc_self_memory_config_json !== '[]' && sc_self_memory_config_json !== '{}' && sc_self_memory_config_json !== '') {
            sc_memory_get_store_mode_self(sc_self_memory_config_json);
        } else {
            // 题记
            let sc_switch_memory_rooms_json = unsafeWindow.localStorage.getItem('live_sc_switch_memory_rooms');
            if (sc_switch_memory_rooms_json !== null && sc_switch_memory_rooms_json !== 'null' && sc_switch_memory_rooms_json !== '[]' && sc_switch_memory_rooms_json !== '') {
                sc_memory_get_store_mode_switch(sc_switch_memory_rooms_json);
            }
        }
    }

    if (sc_keep_time !== null && sc_keep_time !== 'null' && sc_keep_time !== 0 && sc_keep_time !== '') {
        sc_keep_time_flag = 1;
    }

    // 先检测并处理本房间的
    if (sc_keep_time_flag && (sc_now_time - sc_keep_time) > 1000 * 60 * 60 * sc_clear_time_hour) {
        unsafeWindow.localStorage.removeItem(sc_localstorage_key);
        unsafeWindow.localStorage.removeItem(sc_sid_localstorage_key);
    }

    function check_and_clear_all_sc_store() {
        // 遍历清除所有过期的sc存储
        let live_sc_rooms_json = unsafeWindow.localStorage.getItem('live_sc_rooms');
        if (live_sc_rooms_json !== null && live_sc_rooms_json !== 'null' && live_sc_rooms_json !== '[]' && live_sc_rooms_json !== '') {
            let live_sc_rooms = JSON.parse(live_sc_rooms_json);
            let live_sc_rooms_new = [];
            for (let m = 0; m < live_sc_rooms.length; m++) {
                let sc_keep_time_item = unsafeWindow.localStorage.getItem('live_' + live_sc_rooms[m] + '_sc_keep_time');
                if (sc_keep_time_item === null || sc_keep_time_item === 'null' || sc_keep_time_item === 0 || sc_keep_time_item === '') {
                    continue;
                } else if (sc_keep_time_item !== null && sc_keep_time_item !== 'null' && sc_keep_time_item !== 0 && sc_keep_time_item !== '' && ((sc_now_time - sc_keep_time_item) / (1000 * 60 * 60)) > sc_clear_time_hour) {
                    unsafeWindow.localStorage.removeItem('live_' + live_sc_rooms[m] + '_sc'); // 清除sc存储
                    unsafeWindow.localStorage.removeItem('live_' + live_sc_rooms[m] + '_sc_sid'); // 清除sc的sid存储
                    unsafeWindow.localStorage.removeItem('live_' + live_sc_rooms[m] + '_sc_keep_time'); //清除sc的keep time存储
                } else {
                    live_sc_rooms_new.push(live_sc_rooms[m]);
                }
            }
            // 更新live_sc_rooms
            unsafeWindow.localStorage.setItem('live_sc_rooms', JSON.stringify(live_sc_rooms_new));
        }
    }

    function check_blacklist_menu(room_id) {
        let sc_room_black_list_json = unsafeWindow.localStorage.getItem('live_sc_room_blacklist');
        if (sc_room_black_list_json === null || sc_room_black_list_json === 'null' || sc_room_black_list_json === '[]' || sc_room_black_list_json === '') {
            // 显示加入黑名单
            GM_registerMenuCommand('点击将当前直播房间加入黑名单', function() {
                unsafeWindow.localStorage.setItem('live_sc_room_blacklist', JSON.stringify([room_id]));
                sc_catch_log('直播房间id：' + room_id + ' 已加入黑名单！');
                alert("当前直播房间已加入黑名单，刷新页面生效！");
                unsafeWindow.location.reload();
            });

            return true;
        } else {
            let sc_room_black_list = JSON.parse(sc_room_black_list_json);
            if (sc_room_black_list.includes(room_id)) {
                // 显示移除黑名单
                GM_registerMenuCommand('当前直播房间已加入黑名单，点击移出黑名单', function() {
                    sc_room_black_list = sc_room_black_list.filter(item => item !== room_id);
                    unsafeWindow.localStorage.setItem('live_sc_room_blacklist', JSON.stringify(sc_room_black_list));
                    sc_catch_log('直播房间id：' + room_id + ' 已移出黑名单！');
                    alert("当前直播房间已除出黑名单，刷新页面生效！");
                    unsafeWindow.location.reload();
                });

                return false;
            } else {
                // 显示加入黑名单
                GM_registerMenuCommand('点击将当前直播房间加入黑名单', function() {
                    sc_room_black_list.push(room_id);
                    unsafeWindow.localStorage.setItem('live_sc_room_blacklist', JSON.stringify(sc_room_black_list));
                    sc_catch_log('直播房间id：' + room_id + ' 已加入黑名单！');
                    alert("当前直播房间已加入黑名单，刷新页面生效！");
                    unsafeWindow.location.reload();
                });

                return true;
            }
        }
    }

    function getTimestampConversion(timestamp) {
        let timeStamp;
        let timeStampLen = timestamp.toString().length;

        if (timeStampLen === 10) {
            timeStamp = timestamp * 1000
        } else if (timeStampLen === 13) {
            timeStamp = timestamp
        } else {
            timeStamp = timestamp
        }

        let date = new Date(timeStamp); // 时间戳为10位需*1000，时间戳为13位的话不需乘1000
        let Y = (date.getFullYear() + '-');
        let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
        let D = (date.getDate() < 10 ? '0' + date.getDate() + ' ' : date.getDate() + ' ');
        let h = (date.getHours() < 10 ? '0' + date.getHours() + ':' : date.getHours() + ':');
        let m = (date.getMinutes() < 10 ? '0' + date.getMinutes() + ':' : date.getMinutes() + ':');
        let s = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());

        return Y + M + D + h + m + s;
    }

    function getTimestampDiff(timestamp) {
        let timeStamp;
        let timeStampLen = timestamp.toString().length;

        if (timeStampLen === 10) {
            timeStamp = timestamp * 1000
        } else if (timeStampLen === 13) {
            timeStamp = timestamp
        } else {
            timeStamp = timestamp
        }

        let nowTime = (new Date()).getTime();
        let timeDiffValue = nowTime - timeStamp;;
        let resultStr = '';
        if (timeDiffValue < 0) {
            return resultStr;
        }

        var dayDiff = timeDiffValue / (1000 * 60 * 60 * 24);
        var hourDiff = timeDiffValue / (1000 * 60 * 60);
        var minDiff = timeDiffValue / (1000 * 60);

        if (dayDiff >= 1) {
            resultStr = '' + parseInt(dayDiff) + '天前';
        } else if (hourDiff >= 1) {
            resultStr = '' + parseInt(hourDiff) + '小时前';
        } else if (minDiff >= 1) {
            resultStr = '' + parseInt(minDiff) + '分钟前';
        } else {
            resultStr = '刚刚';
        }

        return resultStr;
    }

    // 更新每条SC距离当前时间
    function updateTimestampDiff() {
        let sc_timestamp_item = $(document).find('.sc_start_timestamp');
        sc_timestamp_item.each(function() {
            let new_timestamp_diff = getTimestampDiff($(this).html());
            $(this).prev().html(new_timestamp_diff);
        });
    }

    function close_and_remove_sc_modal() {
        // 关闭模态框
        $(document).find('.sc_cp_mod').hide();

        // 从 body 中移除模态框
        $(document).find('.sc_cp_mod').remove();
    }

    function open_and_close_sc_modal(show_str, show_color, e, mode = 0) {
        $(document).find('.sc_long_rectangle').css('cursor', 'grab');
        let sc_copy_modal = document.createElement('div');
        sc_copy_modal.className = 'sc_cp_mod';
        sc_copy_modal.style.position = 'fixed';
        sc_copy_modal.style.display = 'none';
        sc_copy_modal.style.color = show_color;
        sc_copy_modal.style.textAlign = 'center';
        sc_copy_modal.style.backgroundColor = '#ffffff';
        sc_copy_modal.style.border = 0;
        sc_copy_modal.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.3)';
        sc_copy_modal.innerHTML = show_str;
        sc_copy_modal.style.zIndex = 3333;

        if (mode === 0) {
            sc_copy_modal.style.width = '30px';
            sc_copy_modal.style.height = '30px';
            sc_copy_modal.style.lineHeight = '30px';
            sc_copy_modal.style.borderRadius = '50%';
            sc_copy_modal.style.left = e.clientX + 10 + 'px';
            sc_copy_modal.style.top = e.clientY - 10 + 'px';
        } else {
            sc_copy_modal.style.borderRadius = '10px';
            sc_copy_modal.style.padding = '10px';
            sc_copy_modal.style.left = e.target.getBoundingClientRect().left + 10 + 'px';
            sc_copy_modal.style.top = e.target.getBoundingClientRect().top - 30 + 'px';
        }

        if (sc_isFullscreen) {
            $(document).find('#live-player').append(sc_copy_modal);
        } else {
            document.body.appendChild(sc_copy_modal);
        }

        // 显示模态框
        sc_copy_modal.style.display = 'block';

        // 在一定时间后关闭并删除模态框
        setTimeout(() => {
            close_and_remove_sc_modal();
        }, 1500);
    }

    function check_and_join_live_sc_room() {
        if (!sc_keep_time_flag) {

            sc_keep_time_flag = 1;

            // 加入记录组
            let live_sc_rooms_json = unsafeWindow.localStorage.getItem('live_sc_rooms');
            if (live_sc_rooms_json === null || live_sc_rooms_json === 'null' || live_sc_rooms_json === '[]' || live_sc_rooms_json === '') {
                unsafeWindow.localStorage.setItem('live_sc_rooms', JSON.stringify([room_id]));
            } else {
                let live_sc_rooms = JSON.parse(live_sc_rooms_json);
                live_sc_rooms.push(room_id);
                unsafeWindow.localStorage.setItem('live_sc_rooms', JSON.stringify(live_sc_rooms));
            }
        }
    }

    function sc_sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let sc_live_sidebar_try_find = 2; // 最多再尝试2次
    function sc_live_sidebar_position_left_apply() {
        let sc_live_sidebar = $(document).find('#sidebar-vm');

        if (sc_live_sidebar.length) {
            let sc_live_sidebar_cntr = sc_live_sidebar.find('.side-bar-cntr');
            let sc_live_sidebar_popup_cntr = sc_live_sidebar.find('.side-bar-popup-cntr');

            if (sc_live_sidebar_cntr.length) {
                sc_live_sidebar_cntr.css('right', 'unset');
                sc_live_sidebar_cntr.css('left', 0);
                sc_live_sidebar_cntr.css('border-radius', '0 12px 12px 0');
            }

            if (sc_live_sidebar_popup_cntr.length) {
                sc_live_sidebar_popup_cntr.css('left', sc_live_sidebar_popup_cntr.css('right'));
                sc_live_sidebar_popup_cntr.css('right', 'unset');

                let sc_live_sidebar_popup_cntr_arrow = sc_live_sidebar_popup_cntr.find('.arrow');
                if (sc_live_sidebar_popup_cntr_arrow.length) {
                    sc_live_sidebar_popup_cntr_arrow.css('left', 'unset');
                    sc_live_sidebar_popup_cntr_arrow.css('right', '100%');
                    sc_live_sidebar_popup_cntr_arrow.css('border-color', 'transparent var(--bg1_float, "#FFFFFF") transparent transparent');
                }
            }
        } else {
            if (sc_live_sidebar_try_find) {
                setTimeout(() => { sc_live_sidebar_position_left_apply() }, 2000);
                sc_live_sidebar_try_find--;
            }
        }
    }

    function sc_live_sidebar_position_right_apply() {
        let sc_live_sidebar = $(document).find('#sidebar-vm');

        if (sc_live_sidebar.length) {
            let sc_live_sidebar_cntr = sc_live_sidebar.find('.side-bar-cntr');
            let sc_live_sidebar_popup_cntr = sc_live_sidebar.find('.side-bar-popup-cntr');

            if (sc_live_sidebar_cntr.length) {
                sc_live_sidebar_cntr.css('left', 'unset');
                sc_live_sidebar_cntr.css('right', 0);
                sc_live_sidebar_cntr.css('border-radius', '12px 0 0 12px');
            }
            if (sc_live_sidebar_popup_cntr.length) {
                sc_live_sidebar_popup_cntr.css('right', sc_live_sidebar_popup_cntr.css('left'));
                sc_live_sidebar_popup_cntr.css('left', 'unset');

                let sc_live_sidebar_popup_cntr_arrow = sc_live_sidebar_popup_cntr.find('.arrow');
                if (sc_live_sidebar_popup_cntr_arrow.length) {
                    sc_live_sidebar_popup_cntr_arrow.css('right', 'unset');
                    sc_live_sidebar_popup_cntr_arrow.css('left', '100%');
                    sc_live_sidebar_popup_cntr_arrow.css('border-color', 'transparent transparent transparent var(--bg1_float, "#FFFFFF")');
                }
            }
        }
    }

    function sc_side_fold_in_one(target_oj) {
        target_oj.css('border-radius', '8px');
        target_oj.find('.sc_msg_body').hide();
        target_oj.find('.sc_msg_head').css('border-radius', '6px');
        target_oj.find('.sc_msg_head_left').hide();
        target_oj.find('.sc_msg_head_right').hide();
    }

    function sc_side_fold_out_one(target_oj, mouse_enter_flag = false) {
        target_oj.css('border-radius', '8px 8px 6px 6px');

        let sc_item_fold_flag = target_oj.attr('data-fold');

        if (sc_item_fold_flag === '0') {
            target_oj.find('.sc_msg_body').show();
            target_oj.find('.sc_msg_head').css('border-radius', '6px 6px 0px 0px');

            if (mouse_enter_flag) {
                target_oj.attr('data-height', target_oj.outerHeight())
            }
        }

        target_oj.find('.sc_msg_head_left').show();
        target_oj.find('.sc_msg_head_right').show();
    }

    function sc_side_fold_in_all() {
        $(document).find('.sc_long_item').each(function() {
            sc_side_fold_in_one($(this));
        });
    }

    function sc_side_fold_out_all() {
        $(document).find('.sc_long_item').each(function() {
            sc_side_fold_out_one($(this));
        });
    }

    function sc_trigger_item_side_fold_in(target_oj_class) {
        let target_oj = $(document).find('.' + target_oj_class);

        target_oj.css('position', '');
        target_oj.css('top', '');
        target_oj.css('z-index', '');
        target_oj.css('width', '50px');
        target_oj.css('height', '50px');
        target_oj.css('left', '');

        sc_side_fold_in_one(target_oj);
    }

    function sc_auto_trigger_side_fold_out_next() {
        if (sc_panel_fold_mode === 1) {
            sc_side_fold_custom_auto_run_flag = true;

            let auto_target_oj = $(document).find('.' + sc_side_fold_custom_each_same_time_class);

            if (auto_target_oj.length === 0) { sc_side_fold_custom_auto_run_flag = false; return; }

            if (sc_side_fold_custom_stop_from_auto_flag) {
                let auto_target_oj_next = auto_target_oj.prev();
                if (auto_target_oj_next.length) {
                    auto_target_oj = auto_target_oj_next;
                    sc_side_fold_custom_each_same_time_class = auto_target_oj.attr('class').split(' ').find((scClassName) => { return scClassName !== 'sc_long_item'; });
                }
            }

            auto_target_oj.css('position', 'absolute');
            auto_target_oj.css('top', '10px'); // 第一个SC的位置
            auto_target_oj.css('translateY', '-100%');
            auto_target_oj.css('opacity', 0);
            auto_target_oj.css('z-index', '10');
            auto_target_oj.css('width', (sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            auto_target_oj.css('height', '');

            if ((auto_target_oj.offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                auto_target_oj.css('left', -(sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
            }

            sc_side_fold_out_one(auto_target_oj, true);

            auto_target_oj.hide();

            auto_target_oj.animate({
                'translateY': '0',
                'opacity' : 1
            }, {
                duration: 1000,
                easing: 'linear'
            });

            auto_target_oj.show();

            sc_side_fold_custom_each_same_time_timeout_id = setTimeout(function() {
                if (sc_side_fold_custom_each_same_time_class && sc_panel_fold_mode === 1) {
                    // 下一个SC
                    let prev_target_oj = auto_target_oj.prev();
                    if (prev_target_oj.length > 0) {

                        sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class);

                        sc_side_fold_custom_each_same_time_class = prev_target_oj.attr('class').split(' ').find((scClassName) => { return scClassName !== 'sc_long_item'; });

                        sc_side_fold_custom_stop_from_auto_flag = false;

                        sc_sleep(1500).then(() => { sc_auto_trigger_side_fold_out_next() });

                    } else {
                        if (sc_side_fold_custom_config === 2) {
                            sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class);
                        }

                        sc_side_fold_custom_auto_run_flag = false;

                        sc_side_fold_custom_stop_from_auto_flag = true;

                    }
                }
            }, sc_side_fold_custom_time * 1000);
        }
    }

    function sc_auto_trigger_side_fold_out_start(target_oj_class) {
        if (sc_side_fold_custom_each_same_time_class === '') {
            // 如果是刚刚开始
            sc_side_fold_custom_each_same_time_class = target_oj_class;
            sc_auto_trigger_side_fold_out_next();
        } else {
            // 如果已经暂停了
            if (!sc_side_fold_custom_auto_run_flag) {
                sc_auto_trigger_side_fold_out_next();
            }
        }
    }

    function sc_trigger_item_side_fold_out(target_oj_class) {

        let target_oj = $(document).find('.' + target_oj_class);

        if (sc_side_fold_custom_each_same_time_flag) {
            sc_auto_trigger_side_fold_out_start(target_oj_class);
        } else {
            target_oj.css('position', 'absolute');
            target_oj.css('top', '10px'); // 第一个SC的位置
            target_oj.css('z-index', '10');
            target_oj.css('width', (sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            target_oj.css('height', '');

            if ((target_oj.offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                target_oj.css('left', -(sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
            }

            sc_side_fold_out_one(target_oj, true);
        }
    }

    function sc_custom_config_start_class_by_fetch(sc_catch_new_arr) {
        if (Array.isArray(sc_catch_new_arr)) {
            let first_catch_sc = sc_catch_new_arr[0];

            if (first_catch_sc) {
                sc_side_fold_custom_each_same_time_class = 'sc_' + first_catch_sc["uid"] + '_' + first_catch_sc["start_time"];
            }
        }
    }

    function sc_custom_config_start_class_by_store(sc_store_arr) {
        if (Array.isArray(sc_store_arr)) {
            let first_store_sc = sc_store_arr.at(-1);
            if (first_store_sc) {
                sc_side_fold_custom_each_same_time_class = 'sc_' + first_store_sc["uid"] + '_' + first_store_sc["start_time"];
            }
        }
    }

    function sc_custom_config_apply(new_sc_side_fold_custom_first_class) {
        if (sc_panel_side_fold_flag) {
            if (sc_side_fold_custom_config === 1) {
                // 第一个SC保持展开
                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1 && sc_side_fold_custom_first_class !== new_sc_side_fold_custom_first_class && !sc_side_fold_custom_auto_run_flag) {
                    sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                }

                if (new_sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(new_sc_side_fold_custom_first_class);
                }
            } else if (sc_side_fold_custom_config === 2) {
                // 第一个SC不保持展开
                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1 && sc_side_fold_custom_first_class !== new_sc_side_fold_custom_first_class && !sc_side_fold_custom_auto_run_flag) {
                    sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                }
                if (sc_side_fold_custom_first_timeout_id) {
                    clearTimeout(sc_side_fold_custom_first_timeout_id);
                }

                if (new_sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(new_sc_side_fold_custom_first_class);
                }

                if (!sc_side_fold_custom_each_same_time_flag) {
                    sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                        if (new_sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                            sc_trigger_item_side_fold_in(new_sc_side_fold_custom_first_class);
                        }
                    }, sc_side_fold_custom_time * 1000);
                }

            }
        }
    }

    // 检查全记的状态
    function check_all_memory_status() {
        // 只有当前的记忆模式是全记时才检查
        if (sc_memory === 3) {
            let sc_btn_memory = $(document).find('.sc_button_memory');
            let sc_memory_all_rooms_mode = unsafeWindow.localStorage.getItem('live_sc_memory_all_rooms_mode');
            if (sc_memory_all_rooms_mode !== null && sc_memory_all_rooms_mode !== 'null' && sc_memory_all_rooms_mode !== '') {
                if (parseInt(sc_memory_all_rooms_mode, 10) !== 3) {
                    sc_memory = 0;
                    sc_btn_memory.text('没记');
                }
            } else {
                sc_memory = 0;
                sc_btn_memory.text('没记');
            }
        }
    }

    // 记忆存储
    function update_sc_memory_config(config_item_name, config_item_val, type = 'self') {
        let sc_memory_config_key = sc_self_memory_config_key
        if (type === 'all') {
            sc_memory_config_key = 'live_sc_all_memory_config';
        }

        let sc_memory_config = {};
        let sc_memory_config_json = unsafeWindow.localStorage.getItem(sc_memory_config_key);
        if (sc_memory_config_json !== null && sc_memory_config_json !== 'null' && sc_memory_config_json !== '[]' && sc_memory_config_json !== '{}' && sc_memory_config_json !== '') {
            sc_memory_config = JSON.parse(sc_memory_config_json);
        }

        if (config_item_name === 'sc_panel_drag' && Array.isArray(config_item_val)) {
            sc_memory_config['sc_panel_drag_left'] = config_item_val[0] ?? -1;
            sc_memory_config['sc_panel_drag_top'] = config_item_val[1] ?? -1;
        } else {
            sc_memory_config[config_item_name] = config_item_val;
        }

        unsafeWindow.localStorage.setItem(sc_memory_config_key, JSON.stringify(sc_memory_config));
    }

    function sc_switch_store() {
        if (sc_memory === 1) {
            // 题记
            unsafeWindow.localStorage.setItem('live_sc_switch_record', sc_switch);
        } else if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_switch', sc_switch, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_switch', sc_switch, 'all');
        }
    }

    function sc_fold_mode_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_fold_mode', sc_panel_fold_mode, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_fold_mode', sc_panel_fold_mode, 'all');
        }
    }

    function sc_panel_side_fold_flag_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_side_fold_flag', sc_panel_side_fold_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_side_fold_flag', sc_panel_side_fold_flag, 'all');
        }
    }

    function sc_side_fold_simple_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_side_fold_simple', sc_panel_side_fold_simple, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_side_fold_simple', sc_panel_side_fold_simple, 'all');
        }
    }

    function sc_panel_drag_store(sc_panel_drag_left_val, sc_panel_drag_top_val) {
        if (sc_panel_drag_left_val <= 0) {
            sc_panel_drag_left_val = 0;
        }
        if (sc_panel_drag_top_val <= 0) {
            sc_panel_drag_top_val = 0;
        }
        if (sc_panel_drag_left_val >= unsafeWindow.innerWidth) {
            if (sc_panel_fold_mode === 1) {
                sc_panel_drag_left_val = unsafeWindow.innerWidth - 72;
            } else {
                sc_panel_drag_left_val = unsafeWindow.innerWidth - sc_rectangle_width;
            }
        }
        if (sc_panel_drag_top_val >= unsafeWindow.innerHeight) {
            sc_panel_drag_top_val = unsafeWindow.innerHeight - sc_panel_high;
        }

        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_drag', [sc_panel_drag_left_val, sc_panel_drag_top_val], 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_drag', [sc_panel_drag_left_val, sc_panel_drag_top_val], 'all');
        }
    }

    function sc_func_btn_mode_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_func_btn_mode', sc_func_btn_mode, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_func_btn_mode', sc_func_btn_mode, 'all');
        }
    }

    function sc_data_show_bottom_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('data_show_bottom_flag', data_show_bottom_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('data_show_bottom_flag', data_show_bottom_flag, 'all');
        }
    }

    function sc_panel_allow_drag_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_allow_drag_flag', sc_panel_allow_drag_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_allow_drag_flag', sc_panel_allow_drag_flag, 'all');
        }
    }

    function sc_start_time_show_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_start_time_show_flag', sc_start_time_show_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_start_time_show_flag', sc_start_time_show_flag, 'all');
        }
    }

    function sc_side_fold_custom_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_side_fold_custom_config', sc_side_fold_custom_config, 'self');
            update_sc_memory_config('sc_side_fold_custom_time', sc_side_fold_custom_time, 'self');
            update_sc_memory_config('sc_side_fold_custom_each_same_time_flag', sc_side_fold_custom_each_same_time_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_side_fold_custom_config', sc_side_fold_custom_config, 'all');
            update_sc_memory_config('sc_side_fold_custom_time', sc_side_fold_custom_time, 'all');
            update_sc_memory_config('sc_side_fold_custom_each_same_time_flag', sc_side_fold_custom_each_same_time_flag, 'all');
        }
    }

    function sc_welt_hide_circle_half_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_welt_hide_circle_half_flag', sc_welt_hide_circle_half_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_welt_hide_circle_half_flag', sc_welt_hide_circle_half_flag, 'all');
        }
    }

    function sc_rectangle_width_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_rectangle_width', sc_rectangle_width, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_rectangle_width', sc_rectangle_width, 'all');
        }
    }

    function sc_live_sidebar_left_flag_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_sidebar_left_flag', sc_live_sidebar_left_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_sidebar_left_flag', sc_live_sidebar_left_flag, 'all');
        }
    }

    function update_sc_switch_rooms(type = 'add') {
        let sc_switch_memory_rooms = [];
        let sc_switch_memory_rooms_json = unsafeWindow.localStorage.getItem('live_sc_switch_memory_rooms');
        if (sc_switch_memory_rooms_json !== null && sc_switch_memory_rooms_json !== 'null' && sc_switch_memory_rooms_json !== '[]' && sc_switch_memory_rooms_json !== '') {
            sc_switch_memory_rooms = JSON.parse(sc_switch_memory_rooms_json);
        }

        if (type === 'add') {
            sc_switch_memory_rooms.push(room_id);
        } else {
            sc_switch_memory_rooms = sc_switch_memory_rooms.filter(item => item !== room_id);
        }

        unsafeWindow.localStorage.setItem('live_sc_switch_memory_rooms', JSON.stringify(sc_switch_memory_rooms));
    }

    // 显示所有按钮
    function sc_menu() {
        $(document).find('.sc_button_item').show();
        $(document).find('.sc_button_menu').hide();
    }

    // 折叠/展开单个消息
    function sc_toggle_msg_body() {
        let this_sc_item_class_arr = $(this).attr('class').split(' ');
        let this_sc_item_dynamic_className = this_sc_item_class_arr.find((scClassName) => { return scClassName !== 'sc_long_item'; });
        let this_sc_msg_body = $('.' + this_sc_item_dynamic_className).find('.sc_msg_body');
        let this_sc_item_bg_color = $('.' + this_sc_item_dynamic_className).css('background-color');
        if (this_sc_msg_body.is(":visible")) {
            this_sc_msg_body.slideUp(200);
            $('.' + this_sc_item_dynamic_className).css('border-radius', '8px');
            this_sc_msg_body.prev().css('border-radius', '6px');
            $('.' + this_sc_item_dynamic_className).find('.sc_value_font').css('color', this_sc_item_bg_color);
            $('.' + this_sc_item_dynamic_className).attr('data-fold', '1');
        } else {
            $('.' + this_sc_item_dynamic_className).css('border-radius', '8px 8px 6px 6px');
            this_sc_msg_body.prev().css('border-radius', '6px 6px 0px 0px');
            this_sc_msg_body.slideDown(200);
            $('.' + this_sc_item_dynamic_className).find('.sc_value_font').css('color', '');
            $('.' + this_sc_item_dynamic_className).attr('data-fold', '0');
        }
    }

    // 按钮模式选择
    function sc_btn_mode_apply() {

        if (sc_panel_side_fold_flag) {
            if (sc_func_btn_mode === 0) {
                // 侧折模式下显示所有的按钮
                sc_menu();
            } else if (sc_func_btn_mode === 1) {
                // 侧折模式下隐藏所有的按钮
                $(document).find('.sc_button_item').hide();
            } else if (sc_func_btn_mode === 2) {
                // 侧折模式下按钮的极简模式
                $(document).find('.sc_button_item').hide();
                $(document).find('.sc_button_menu').show();
                $(document).find('.sc_button_min').show();
            } else if (sc_func_btn_mode === 3) {
                // 侧折模式下只显示折叠按钮
                $(document).find('.sc_button_item').hide();
                $(document).find('.sc_button_min').show();
            } else if (sc_func_btn_mode === 4) {
                // 侧折模式下只显示菜单按钮
                $(document).find('.sc_button_item').hide();
                $(document).find('.sc_button_menu').show();
            }

            sc_rectangle_is_slide_down = false;
        }

    }

    // 贴边半隐藏
    function sc_circle_welt_hide_half(sc_circle_left = -10, sc_circle_top = -10) {
        let sc_circle_oj = $(document).find('.sc_long_circle');
        let rect_circle = sc_circle_oj[0].getBoundingClientRect();

        if (rect_circle.width === 0 && rect_circle.height === 0) {
            return;
        }

        if (sc_circle_left === -10 && sc_circle_top === -10) {
            sc_circle_left = sc_circle_oj.position().left;
            sc_circle_top = sc_circle_oj.position().top;
        }

        if (sc_circle_left <= 1) {
            sc_circle_oj.removeClass('sc_circle_x_left_show_animate');
            sc_circle_oj.addClass('sc_circle_x_left_hide_animate');
        } else if (sc_circle_top <= 1) {
            sc_circle_oj.removeClass('sc_circle_y_top_show_animate');
            sc_circle_oj.addClass('sc_circle_y_top_hide_animate');
        } else if (sc_circle_left >= unsafeWindow.innerWidth - 39) {
            sc_circle_oj.removeClass('sc_circle_x_right_show_animate');
            sc_circle_oj.addClass('sc_circle_x_right_hide_animate');
        } else if (sc_circle_top >= unsafeWindow.innerHeight - 39) {
            sc_circle_oj.removeClass('sc_circle_y_bottom_show_animate');
            sc_circle_oj.addClass('sc_circle_y_bottom_hide_animate');
        }
    }

    // 侧折显示板
    function sc_sidefold(flag = true) {
        $(document).find('.sc_long_rectangle').css('width', '72px');
        $(document).find('.sc_long_list').css('padding-left', '11px');
        $(document).find('.sc_long_item').css('width', '50px');
        $(document).find('.sc_long_item').css('height', '50px');
        let sc_btn_item = $(document).find('.sc_button_item');
        sc_btn_item.css('margin-top', '6px');
        sc_btn_item.css('margin-bottom', '0px');
        sc_btn_item.css('margin-right', '0px');

        let sc_btn_sidefold = $(document).find('.sc_button_sidefold');
        sc_btn_sidefold.addClass('sc_button_foldback');
        sc_btn_sidefold.removeClass('sc_button_sidefold');
        sc_btn_sidefold.text('展开');

        let sc_data_show = $(document).find('.sc_data_show');
        sc_data_show.css('margin-bottom', '15px');
        sc_data_show.css('height', '70px');

        $(document).find('.sc_label_data_br').show();

        let sc_label_high_energy_left = $(document).find('.sc_high_energy_num_left');
        let sc_label_high_energy_right = $(document).find('.sc_high_energy_num_right');
        let sc_label_captain_left = $(document).find('.sc_captain_num_left');
        let sc_label_captain_right = $(document).find('.sc_captain_num_right');
        let sc_label_num_br3 = $(document).find('.sc_label_num_br3');
        let clone_sc_label_captain_right = sc_label_captain_right.last().clone(true);
        let clone_sc_label_num_br3 = sc_label_num_br3.last().clone(true);
        clone_sc_label_captain_right.css('float', 'none');
        sc_data_show.append(clone_sc_label_num_br3);
        sc_data_show.append(clone_sc_label_captain_right);
        sc_label_captain_right.remove();
        sc_label_num_br3.remove();
        sc_label_high_energy_left.css('float', 'right');
        sc_label_high_energy_right.css('float', 'none');
        sc_label_captain_left.css('margin-top', '10px');

        let sc_long_rectangle = $(document).find('.sc_long_rectangle');
        let sc_long_buttons = $(document).find('.sc_long_buttons');
        let clone_sc_data_show = sc_data_show.last().clone(true);
        let clone_sc_long_buttons = sc_long_buttons.last().clone(true);
        clone_sc_long_buttons.hide();
        if (sc_panel_side_fold_simple) {
            clone_sc_data_show.hide();
        } else {
            sc_long_rectangle.css('border-bottom', '');
        }
        sc_long_rectangle.append(clone_sc_data_show);
        sc_long_rectangle.append(clone_sc_long_buttons);
        sc_data_show.remove();
        sc_long_buttons.remove();

        sc_side_fold_in_all();

        sc_panel_side_fold_flag = true;

        if (flag) {
            if (unsafeWindow.innerHeight - sc_long_rectangle.position().top < sc_panel_high + 280) {
                sc_long_rectangle.each(function() {
                    $(this).css('top', unsafeWindow.innerHeight - sc_panel_high - 280);
                });
            }

            sc_panel_fold_mode = 1;
            sc_fold_mode_store();
            sc_panel_side_fold_flag_store();
        }

        sc_btn_mode_apply();

        sc_side_fold_custom_auto_run_flag = false;

        sc_custom_config_apply(sc_side_fold_custom_first_class);
    }

    // 侧折后恢复展开显示板
    function sc_foldback() {
        if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        $(document).find('.sc_long_rectangle').css('width', sc_rectangle_width + 'px');
        $(document).find('.sc_long_list').css('padding-left', '10px');
        $(document).find('.sc_long_item').css('width', '');
        $(document).find('.sc_long_item').css('height', '');
        let sc_btn_item = $(document).find('.sc_button_item');
        sc_btn_item.css('margin-top', '15px');
        sc_btn_item.css('margin-bottom', '15px');
        sc_btn_item.css('margin-right', '7px');
        $(document).find('.sc_button_min').css('margin-right', '0px');

        let sc_btn_foldback = $(document).find('.sc_button_foldback');
        sc_btn_foldback.addClass('sc_button_sidefold');
        sc_btn_foldback.removeClass('sc_button_foldback');
        sc_btn_foldback.text('侧折');

        let sc_data_show = $(document).find('.sc_data_show');
        sc_data_show.css('margin-bottom', '20px');
        sc_data_show.css('height', '20px');

        $(document).find('.sc_label_data_br').hide();

        let sc_label_high_energy_left = $(document).find('.sc_high_energy_num_left');
        let sc_label_high_energy_right = $(document).find('.sc_high_energy_num_right');
        let sc_label_captain_left = $(document).find('.sc_captain_num_left');
        let sc_label_captain_right = $(document).find('.sc_captain_num_right');
        let sc_label_num_br3 = $(document).find('.sc_label_num_br3');
        let clone_sc_label_captain_left = sc_label_captain_left.last().clone(true);
        let clone_sc_label_num_br3 = sc_label_num_br3.last().clone(true);
        clone_sc_label_captain_left.css('margin-top', '0px');
        sc_data_show.append(clone_sc_label_num_br3);
        sc_data_show.append(clone_sc_label_captain_left);
        sc_label_captain_left.remove();
        sc_label_num_br3.remove();
        sc_label_high_energy_left.css('float', 'left');
        sc_label_high_energy_right.css('float', 'left');
        sc_label_captain_right.css('float', 'right');

        let sc_long_rectangle = $(document).find('.sc_long_rectangle');
        let sc_long_buttons = $(document).find('.sc_long_buttons');
        let clone_sc_data_show = sc_data_show.last().clone(true);
        let clone_sc_long_buttons = sc_long_buttons.last().clone(true);
        sc_long_rectangle.css('border-bottom', '10px solid transparent');
        sc_long_rectangle.prepend(clone_sc_data_show);
        sc_long_rectangle.prepend(clone_sc_long_buttons);
        sc_data_show.remove();
        sc_long_buttons.remove();

        if (unsafeWindow.innerWidth - sc_long_rectangle.position().left < sc_rectangle_width) {
            sc_long_rectangle.each(function() {
                $(this).css('left', unsafeWindow.innerWidth - sc_rectangle_width - 15);
            });
        }

        sc_side_fold_out_all();

        sc_panel_fold_mode = 2;
        sc_panel_side_fold_flag = false;

        sc_fold_mode_store();
        sc_panel_side_fold_flag_store();

        sc_menu();

        clone_sc_data_show.slideUp(500);
        clone_sc_long_buttons.slideUp(500);
    }

    // 折叠显示板
    function sc_minimize() {
        if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        $(document).find('.sc_long_circle').show();
        $(document).find('.sc_long_rectangle').hide();
        $(document).find('.sc_long_buttons').hide(); // 优化回弹问题

        sc_panel_fold_mode = 0;

        sc_fold_mode_store();

        if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(); }
    }

    // 切换主题
    function sc_switch_css(flag = false) {
        if (flag) {
            sc_switch++;

            // 记录主题
            sc_switch_store();
        }

        let sc_rectangle = $(document).find('.sc_long_rectangle');
        let sc_item = $(document).find('.sc_long_item');
        let sc_list = $(document).find('.sc_long_list');
        let sc_data_show = $(document).find('.sc_data_show');
        let sc_button_item = $(document).find('.sc_button_item');

        if (sc_switch === 0) {
            // 白色
            sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
            sc_rectangle.css('box-shadow', '2px 2px 5px black');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 14px 10px 11px');
            } else {
                sc_list.css('padding', '10px 13px 10px 10px');
            }
            sc_data_show.css('color', '');
            sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
            sc_button_item.css('background-size', '350%');
            sc_button_item.css('border', 0);
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.5);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
            `);
        } else if(sc_switch === 1) {
            // 透明
            sc_rectangle.css('background-color', 'rgba(255,255,255,0)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (sc_panel_side_fold_flag){
                sc_list.css('padding', '10px 12px 10px 11px');
            } else {
                sc_list.css('padding', '10px 11px 10px 10px');
            }
            sc_data_show.css('color', '#ffffff');
            sc_button_item.css('background', 'rgba(255,255,255,0)');
            sc_button_item.css('border', '1px solid #ffffff');
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0);
            }
            `);
        } else if(sc_switch === 2) {
            // 半透明（白0.1）
            sc_rectangle.css('background-color', 'rgba(255,255,255,0.1)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 14px 10px 11px');
            } else {
                sc_list.css('padding', '10px 13px 10px 10px');
            }
            sc_data_show.css('color', '#ffffff');
            sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
            sc_button_item.css('background-size', '350%');
            sc_button_item.css('border', 0);
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.2);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
            `);
        } else if(sc_switch === 3) {
            // 半透明（白0.5）
            sc_rectangle.css('background-color', 'rgba(255,255,255,0.5)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 14px 10px 11px');
            } else {
                sc_list.css('padding', '10px 13px 10px 10px');
            }
            sc_data_show.css('color', '');
            sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
            sc_button_item.css('background-size', '350%');
            sc_button_item.css('border', 0);
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.5);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
            `);
        } else if(sc_switch === 4) {
            // 半透明（黑色0.1）
            sc_rectangle.css('background-color', 'rgba(0,0,0,0.1)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 12px 10px 11px');
            } else {
                sc_list.css('padding', '10px 11px 10px 10px');
            }
            sc_data_show.css('color', '#ffffff');
            sc_button_item.css('background', 'rgba(255,255,255,0)');
            sc_button_item.css('border', '1px solid #ffffff');
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0);
            }
            `);
        } else if(sc_switch === 5) {
            // 半透明（黑色0.5）
            sc_rectangle.css('background-color', 'rgba(0,0,0,0.5)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 12px 10px 11px');
            } else {
                sc_list.css('padding', '10px 12px 10px 10px');
            }
            sc_data_show.css('color', '#ffffff');
            sc_button_item.css('background', 'rgba(255,255,255,0)');
            sc_button_item.css('border', '1px solid #ffffff');
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0);
            }
            `);
        } else {
            // 白色
            sc_switch = 0;
            sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (sc_panel_side_fold_flag) {
                sc_list.css('padding', '10px 14px 10px 11px');
            } else {
                sc_list.css('padding', '10px 13px 10px 10px');
            }

            sc_data_show.css('color', '');
            sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
            sc_button_item.css('background-size', '350%');
            sc_button_item.css('border', 0);
            $(document).find('#sc_scrollbar_style').text(`
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.5);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
            `);
        }
    }

    // 记忆模式
    function sc_memory_modify() {
        let sc_btn_memory = $(document).find('.sc_button_memory');

        if (sc_memory === 1) {
            // 从[题记]切换到其他模式时，在题记房间中剔除当前房间
            update_sc_switch_rooms('del');
        } else if (sc_memory === 2) {
            // 从[个记]切换到其他模式时，删除当前的个记配置
            unsafeWindow.localStorage.removeItem(sc_self_memory_config_key);
        } else if (sc_memory=== 3) {
            // 从[全记]切换到其他模式时，删除全记配置
            unsafeWindow.localStorage.removeItem('live_sc_memory_all_rooms_mode');
            unsafeWindow.localStorage.removeItem('live_sc_all_memory_config');
        }

        sc_memory++;
        if (sc_memory === 0) {
            sc_btn_memory.text('没记');
        } else if(sc_memory === 1) {
            sc_btn_memory.text('题记');
            update_sc_switch_rooms('add');
            // 切换到题记的配置
            let sc_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record');
            if (sc_switch_record !== null && sc_switch_record !== 'null' && sc_switch_record !== '') {
                sc_switch = parseInt(sc_switch_record, 10);
                sc_switch_css();
            }
        } else if(sc_memory === 2) {
            sc_btn_memory.text('个记');
            // 保存个记的配置
            sc_switch_store();
            sc_fold_mode_store();
            sc_panel_side_fold_flag_store();
            sc_side_fold_simple_store();

            const rect_circle = $(document).find('.sc_long_circle')[0].getBoundingClientRect();
            if (rect_circle.width === 0 && rect_circle.height === 0) {
                const rect_rectangle = $(document).find('.sc_long_rectangle')[0].getBoundingClientRect();
                sc_panel_drag_store(rect_rectangle.left, rect_rectangle.top);
            } else {
                sc_panel_drag_store(rect_circle.left, rect_circle.top);
            }
        } else if(sc_memory=== 3) {
            sc_btn_memory.text('全记');
            unsafeWindow.localStorage.setItem('live_sc_memory_all_rooms_mode', sc_memory);
            // 保存全记的配置
            sc_switch_store();
            sc_fold_mode_store();
            sc_panel_side_fold_flag_store();
            sc_side_fold_simple_store();

            const rect_circle = $(document).find('.sc_long_circle')[0].getBoundingClientRect();
            if (rect_circle.width === 0 && rect_circle.height === 0) {
                const rect_rectangle = $(document).find('.sc_long_rectangle')[0].getBoundingClientRect();
                sc_panel_drag_store(rect_rectangle.left, rect_rectangle.top);
            } else {
                sc_panel_drag_store(rect_circle.left, rect_circle.top);
            }
        } else {
            sc_memory = 0;
            sc_btn_memory.text('没记');
        }
    }

    function sc_memory_show() {
        let sc_circles = $(document).find('.sc_long_circle');
        let sc_rectangles = $(document).find('.sc_long_rectangle');

        if (sc_panel_fold_mode) {
            sc_circles.each(function() {
                if (sc_panel_drag_left >= 0) {
                    $(this).css('left', sc_panel_drag_left + 'px');
                }

                if (sc_panel_drag_top >= 0) {
                    $(this).css('top', sc_panel_drag_top + 'px');
                }

                $(this).hide();
            });

            sc_rectangles.each(function() {
                if (sc_panel_drag_left >= 0) {
                    $(this).css('left', sc_panel_drag_left + 'px');
                }

                if (sc_panel_drag_top >= 0) {
                    $(this).css('top', sc_panel_drag_top + 'px');
                }

                if (sc_panel_fold_mode === 1 && !sc_panel_side_fold_simple) {
                    $(document).find('.sc_data_show').show();
                }

                $(this).slideDown(500);
            });

            if (sc_panel_fold_mode === 1) { sc_sidefold(false); sc_btn_mode_apply(); }
        } else {
            if (sc_panel_side_fold_flag) { sc_sidefold(false); sc_btn_mode_apply(); }

            sc_circles.each(function() {
                if (sc_panel_drag_left >= 0) {
                    $(this).css('left', sc_panel_drag_left + 'px');
                }

                if (sc_panel_drag_top >= 0) {
                    $(this).css('top', sc_panel_drag_top + 'px');
                }
            });

            if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(sc_panel_drag_left, sc_panel_drag_top); }
        }

        if (sc_live_sidebar_left_flag) { setTimeout(() => { sc_live_sidebar_position_left_apply() }, 1000); }
    }

    // 导出
    function sc_export() {
        let sc_localstorage_json_export = unsafeWindow.localStorage.getItem(sc_localstorage_key);
        if (sc_localstorage_json_export === null || sc_localstorage_json_export === 'null' || sc_localstorage_json_export === '[]' || sc_localstorage_json_export === '') {
            return;
        } else {
            let sc_localstorage_export = JSON.parse(sc_localstorage_json_export);
            let sc_export_str = '';
            for (let j = 0; j < sc_localstorage_export.length; j++) {
                let sc_export_timestamp = '[' + getTimestampConversion(sc_localstorage_export[j]["start_time"]) + ']';
                let sc_export_uname = '[ ' + sc_localstorage_export[j]["user_info"]["uname"] + ' ]';
                let sc_export_uid = '[ uid: ' + sc_localstorage_export[j]["uid"] + ' ]';
                let sc_export_guard_level = sc_localstorage_export[j]["user_info"]["guard_level"];
                let sc_export_guard = '';
                if (sc_export_guard_level === 1) {
                    sc_export_guard = '[总督]'
                } else if (sc_export_guard_level === 2) {
                    sc_export_guard = '[提督]';
                } else if (sc_export_guard_level === 3) {
                    sc_export_guard = '[舰长]';
                } else {
                    sc_export_guard = '[普通]';
                }

                let sc_export_price = '[ ￥' + sc_localstorage_export[j]["price"] + ' ]';
                let sc_export_message = '[ ' + sc_localstorage_export[j]["message"] + ' ]';

                sc_export_str += sc_export_timestamp + sc_export_guard + sc_export_uid + sc_export_uname + sc_export_price + ' : ' + sc_export_message + '\n\n';
            }

            // 创建一个Blob对象，将字符串放入其中
            const sc_export_blob = new Blob([sc_export_str], { type: 'text/plain' });

            // 创建一个下载链接
            const sc_export_downloadLink = document.createElement('a');
            sc_export_downloadLink.href = URL.createObjectURL(sc_export_blob);

            // 设置文件名
            sc_export_downloadLink.download = 'B站SC记录_' + sc_live_room_title + '_' + getTimestampConversion((new Date()).getTime()) + '.txt';

            // 将链接添加到页面中，模拟点击下载
            document.body.appendChild(sc_export_downloadLink);
            sc_export_downloadLink.click();

            // 移除链接
            document.body.removeChild(sc_export_downloadLink);
        }
    }

    function sc_startDragging(e) {
        if (!sc_panel_allow_drag_flag) {
            return;
        }

        e = e || unsafeWindow.event;

        let sc_drag_target_classname = e.target.className;
        if (sc_panel_fold_mode === 1 && sc_drag_target_classname !== 'sc_long_list' && sc_drag_target_classname !== 'sc_data_show' && sc_drag_target_classname !== 'sc_long_buttons' && !sc_drag_target_classname.includes('sc_button_item')) {
            // 侧折模式下，禁止用SC拖拽
            return;
        }

        if (e.button === 0) {
            sc_isDragging = true;
            sc_isClickAllowed = true;

            const rect_circle = $(document).find('.sc_long_circle')[0].getBoundingClientRect();
            if (rect_circle.width === 0 && rect_circle.height === 0) {
                const rect_rectangle = $(document).find('.sc_long_rectangle')[0].getBoundingClientRect();
                sc_offsetX = e.clientX - rect_rectangle.left;
                sc_offsetY = e.clientY - rect_rectangle.top;
            } else {
                sc_offsetX = e.clientX - rect_circle.left;
                sc_offsetY = e.clientY - rect_circle.top;
            }

            sc_drag_start = (new Date()).getTime();
        }
    }

    function sc_stopDragging() {
        if (!sc_panel_allow_drag_flag) {
            return;
        }

        if (!sc_isClickAllowed) {
            const rect_circle = $(document).find('.sc_long_circle')[0].getBoundingClientRect();
            if (rect_circle.width === 0 && rect_circle.height === 0) {
                const rect_rectangle = $(document).find('.sc_long_rectangle')[0].getBoundingClientRect();
                sc_panel_drag_store(rect_rectangle.left, rect_rectangle.top);
                if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(rect_rectangle.left, rect_rectangle.top); }
            } else {
                sc_panel_drag_store(rect_circle.left, rect_circle.top);
                if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(rect_circle.left, rect_circle.top); }
            }
        }

        sc_isDragging = false;
    }

    function sc_drag(e) {
        if (!sc_panel_allow_drag_flag) {
            return;
        }

        e = e || unsafeWindow.event;
        if (sc_isDragging && ((new Date()).getTime() - sc_drag_start) > 30) {
            let sc_elements = $(document).find('.sc_drag_div');
            sc_elements.each(function() {
                const rect = this.getBoundingClientRect();

                const maxX = unsafeWindow.innerWidth - rect.width;
                const maxY = unsafeWindow.innerHeight - rect.height;

                let x = Math.min(maxX, Math.max(0, e.clientX - sc_offsetX)) + 0.5; // 这个0.5交给浏览器吧，至少chrome上是完美的
                let y = Math.min(maxY, Math.max(0, e.clientY - sc_offsetY));

                this.style.left = x + 'px';
                this.style.top = y + 'px';
            });

            sc_isClickAllowed = false;

            if (e.clientY < 0 || e.clientX < 0 || e.clientY >= unsafeWindow.innerHeight || e.clientX >= unsafeWindow.innerWidth - 5) {
                // 页面外时触发 mouseup 事件的逻辑
                sc_isDragging = false;
                sc_stopDragging();
            }
        }
    }

    function sc_after_click_func_btn_apply(e, animate_flag = false) {
        let click_page_x = e.clientX;
        let click_page_y = e.clientY;

        let sc_rectangle_model = document.getElementsByClassName('sc_long_rectangle');
        let sc_rect_left = $(sc_rectangle_model).position().left;
        let sc_rect_top = $(sc_rectangle_model).position().top;
        let sc_data_model = document.getElementsByClassName('sc_data_show');
        let sc_btn_model = document.getElementsByClassName('sc_long_buttons');

        if (sc_panel_side_fold_flag) {

            if (click_page_x < sc_rect_left || click_page_x - sc_rect_left > 72
                || click_page_y < sc_rect_top
                || (click_page_y > sc_rect_top && click_page_y - sc_rect_top > $(sc_rectangle_model).outerHeight())) {

                if (animate_flag && sc_panel_side_fold_simple) {
                    $(sc_data_model).slideUp(500);
                }

                $(sc_btn_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                });

                if (!sc_panel_side_fold_simple) {
                    $(sc_rectangle_model).css('border-bottom', '');
                }
            }

            if (!sc_panel_side_fold_simple && sc_func_btn_mode === 1) {
                $(sc_rectangle_model).css('border-bottom', '');
            }
        } else if (sc_panel_fold_mode == 2) {

            if (click_page_x < sc_rect_left || click_page_x - sc_rect_left > sc_rectangle_width
                || click_page_y < sc_rect_top
                || (click_page_y > sc_rect_top && click_page_y - sc_rect_top > $(sc_rectangle_model).outerHeight())) {
                $(sc_data_model).slideUp(500);
                $(sc_btn_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                });
            }
        }
    }

    function update_sc_item(sc_data) {
        // 追加SC 显示
        let sc_background_bottom_color = sc_data["background_bottom_color"];
        let sc_background_image = sc_data["background_image"];
        let sc_background_color = sc_data["background_color"];
        let sc_uid = sc_data["uid"];
        let sc_user_info_face = sc_data["user_info"]["face"];
        let sc_user_info_face_frame = sc_data["user_info"]["face_frame"];
        let sc_user_info_uname = sc_data["user_info"]["uname"];
        let sc_price = sc_data["price"];
        let sc_message = sc_data["message"];
        let sc_start_timestamp = sc_data["start_time"];

        let sc_medal_flag = false;
        let sc_medal_color = '';
        let sc_medal_name = '';
        let sc_medal_level = 0;

        if (sc_data["medal_info"] && sc_data["medal_info"]["anchor_roomid"]) {
            sc_medal_flag = true;
            sc_medal_color = sc_data["medal_info"]["medal_color"];
            sc_medal_name = sc_data["medal_info"]["medal_name"];
            sc_medal_level = sc_data["medal_info"]["medal_level"];
        }

        let sc_background_image_html = '';
        if (sc_background_image !== '') {
            sc_background_image_html = 'background-image: url('+ sc_background_image +');';
        }

        let sc_font_color = '#666666';
        let sc_font_color_data = sc_data["user_info"]["name_color"] ?? '#666666';

        let sc_start_time = getTimestampConversion(sc_start_timestamp);
        let sc_diff_time = getTimestampDiff(sc_start_timestamp);

        let sc_user_info_face_img = '<img src="'+ sc_user_info_face +'" height="40" width="40" style="border-radius: 20px; float: left; position: absolute; z-index:1;">';
        let sc_user_info_face_frame_img = '';
        if (sc_user_info_face_frame !== '') {
            sc_user_info_face_img = '<img src="'+ sc_user_info_face +'" height="35" width="35" style="border-radius: 20px; float: left; position: absolute; z-index: 1;top: 3px;left: 2px;">';
            sc_user_info_face_frame_img = '<img src="'+ sc_user_info_face_frame +'" height="40" width="40" style="float: left; position: absolute; z-index: 2;">';
        }

        let box_shadow_css = '';
        if (sc_switch === 0 || sc_switch === 2 || sc_switch === 3) {
            box_shadow_css = 'box-shadow: rgba(0, 0, 0, 0.5) 2px 2px 2px;';
        }

        let sc_start_time_display = '';
        if (!sc_start_time_show_flag) {
            sc_start_time_display = 'display: none;';
        }
        let metal_and_start_time_html = '<div class="sc_start_time" style="height: 20px; padding-left: 5px;'+ sc_start_time_display +'"><span style="color: rgba(0,0,0,0.3); font-size: 10px;">'+ sc_start_time +'</span></div>';
        if (sc_medal_flag) {
            metal_and_start_time_html = '<div style="display: inline-flex;"><div class="fans_medal_item" style="background-color: '+ sc_medal_color +';border: 1px solid '+ sc_medal_color +';"><div class="fans_medal_label"><span class="fans_medal_content">'+ sc_medal_name +'</span></div><div class="fans_medal_level">'+ sc_medal_level +'</div></div>' +
                '<div class="sc_start_time" style="height: 20px; padding-left: 5px;'+ sc_start_time_display +'"><span style="color: rgba(0,0,0,0.3); font-size: 10px;">' + sc_start_time + '</span></div></div>'
        }

        let sc_msg_item_style_width = '';
        let sc_msg_item_style_border_radius = 'border-radius: 8px 8px 6px 6px;';
        let sc_msg_body_style_display = '';
        let sc_msg_head_style_border_radius = 'border-radius: 6px 6px 0px 0px;';
        let sc_msg_head_left_style_display = '';
        let sc_msg_head_right_style_display = '';
        if (sc_panel_side_fold_flag) {
            sc_msg_item_style_width = 'width: 50px;';
            sc_msg_item_style_border_radius = 'border-radius: 8px;';
            sc_msg_body_style_display = 'display: none;';
            sc_msg_head_style_border_radius = 'border-radius: 6px;';
            sc_msg_head_left_style_display = 'display: none;';
            sc_msg_head_right_style_display = 'display: none;';
        }

        let sc_item_html = '<div class="sc_long_item sc_' + sc_uid + '_' + sc_start_timestamp + '" data-fold="0" style="'+ sc_msg_item_style_width +'background-color: '+ sc_background_bottom_color +';margin-bottom: 10px;animation: sc_fadenum 1s linear forwards;'+ sc_msg_item_style_border_radius + box_shadow_css +'">'+
            '<div class="sc_msg_head" style="' + sc_background_image_html + 'height: 40px;background-color: '+ sc_background_color +';padding:5px;background-size: cover;background-position: left center;'+ sc_msg_head_style_border_radius +'">'+
            '<div style="float: left; box-sizing: border-box; height: 40px; position: relative;"><a href="//space.bilibili.com/'+ sc_uid +'" target="_blank">'+
            sc_user_info_face_img+ sc_user_info_face_frame_img +'</a></div>'+
            '<div class="sc_msg_head_left" style="float: left; box-sizing: border-box; height: 40px; margin-left: 40px;'+ sc_msg_head_left_style_display +'">'+
            metal_and_start_time_html+
            '<div class="sc_uname_div" style="height: 20px; padding-left: 5px; white-space: nowrap; width: ' + ((sc_rectangle_width / 2) + 5) + 'px; overflow: hidden; text-overflow: ellipsis;"><span class="sc_font_color" style="color: ' + sc_font_color + ';font-size: 15px;text-decoration: none;" data-color="'+ sc_font_color_data +'">' + sc_user_info_uname + '</span></div>'+
            '</div>'+
            '<div class="sc_msg_head_right" style="float: right; box-sizing: border-box; height: 40px;'+ sc_msg_head_right_style_display +'">'+
            '<div class="sc_value_font" style="height: 20px;"><span style="font-size: 15px; float: right;">￥'+ sc_price +'</span></div>'+
            '<div style="height: 20px; color: #666666" data-html2canvas-ignore><span class="sc_diff_time" style="font-size: 15px; float: right;">'+ sc_diff_time +'</span><span class="sc_start_timestamp" style="display:none;">'+ sc_start_timestamp +'</span></div>'+
            '</div>'+
            '</div>'+
            '<div class="sc_msg_body" style="padding-left: 14px; padding-right: 10px; padding-top: 10px; padding-bottom: 10px; overflow-wrap: break-word; line-height: 2;'+ sc_msg_body_style_display +'"><span style="color: white; font-size: 14px;">'+ sc_message +'</span></div>'+
            '</div>';

        $(document).find('.sc_long_list').prepend(sc_item_html);

        sc_custom_config_apply('sc_' + sc_uid + '_' + sc_start_timestamp);

        sc_side_fold_custom_first_class = 'sc_' + sc_uid + '_' + sc_start_timestamp;

    }

    function store_sc_item(sc_data) {
        check_and_join_live_sc_room();
        // 追加SC 存储
        let sc_localstorage = [];
        let sc_sid_localstorage = [];
        let sid = String(sc_data["id"]) + '_' + String(sc_data["uid"]) + '_' + String(sc_data["price"]);
        let sc_localstorage_json = unsafeWindow.localStorage.getItem(sc_localstorage_key);

        if (sc_localstorage_json === null || sc_localstorage_json === 'null' || sc_localstorage_json === '[]' || sc_localstorage_json === '') {
            sc_localstorage.push(sc_data);
            sc_sid_localstorage.push(sid);
            // 保存/更新sc_keep_time （最后sc的时间戳）
            unsafeWindow.localStorage.setItem(sc_keep_time_key, (new Date()).getTime());

            // 追加存储
            unsafeWindow.localStorage.setItem(sc_localstorage_key, JSON.stringify(sc_localstorage));
            unsafeWindow.localStorage.setItem(sc_sid_localstorage_key, JSON.stringify(sc_sid_localstorage));

            return true;
        } else {
            sc_localstorage = JSON.parse(sc_localstorage_json);
            sc_sid_localstorage = JSON.parse(unsafeWindow.localStorage.getItem(sc_sid_localstorage_key));

            if (sc_sid_localstorage.includes(sid)) {
                return false;
            } else {
                sc_localstorage.push(sc_data);
                sc_sid_localstorage.push(sid);
                // 保存/更新sc_keep_time （最后sc的时间戳）
                unsafeWindow.localStorage.setItem(sc_keep_time_key, (new Date()).getTime());

                // 追加存储
                unsafeWindow.localStorage.setItem(sc_localstorage_key, JSON.stringify(sc_localstorage));
                unsafeWindow.localStorage.setItem(sc_sid_localstorage_key, JSON.stringify(sc_sid_localstorage));

                return true;
            }
        }
    }

    function update_rank_count(n_count, n_online_count) {
        if (n_online_count) {
            high_energy_num = n_online_count;
        } else {
            n_online_count = high_energy_num;
        }

        // SC记录板的
        if (n_count > n_online_count) {
            $(document).find('.sc_high_energy_num_left').text('高能：');
            $(document).find('.sc_high_energy_num_right').text(n_count);
            $(document).find('.sc_data_show_label').attr('title', '');

            if (!sc_update_date_guard_once) {
                const rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (rank_data_show_div.length) {
                    $(document).find('.sc_captain_num_right').text(rank_data_show_div.last().text().match(/\d+/) ?? 0);
                    sc_update_date_guard_once = true;
                }
            }
        } else {
            $(document).find('.sc_high_energy_num_left').text('同接：');
            $(document).find('.sc_high_energy_num_right').text(n_count);
            $(document).find('.sc_data_show_label').attr('title', '同接/高能('+ n_count + '/' + n_online_count +') = ' + (n_count / n_online_count * 100).toFixed(2) + '%');
        }

        // 页面的
        if (data_show_top_flag) {
            const rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (rank_data_show_div.length) {
                if (n_count > n_online_count) {
                    rank_data_show_div.first().text('高能用户(' + n_count + ')');
                    rank_data_show_div.first().attr('title', '');
                } else {
                    rank_data_show_div.first().text('高能用户(' + n_count + '/' + n_online_count + ')');
                    rank_data_show_div.first().attr('title', '同接/高能 = ' + (n_count / n_online_count * 100).toFixed(2) + '%');
                }
            }
        }

        if (data_show_bottom_flag) {
            const sc_data_show_bottom_rank_num_div = $(document).find('#sc_data_show_bottom_rank_num');
            if (sc_data_show_bottom_rank_num_div.length) {
                if (n_count > n_online_count) {
                    sc_data_show_bottom_rank_num_div.text('高能：'+ n_count);
                    sc_data_show_bottom_rank_num_div.attr('title', '');
                } else {
                    sc_data_show_bottom_rank_num_div.text('同接：'+ n_count);
                    sc_data_show_bottom_rank_num_div.attr('title', '同接/高能('+ n_count + '/' + n_online_count +') = ' + (n_count / n_online_count * 100).toFixed(2) + '%');
                }
            } else {
                const rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (rank_data_show_div.length) {
                    const guard_text = rank_data_show_div.last().text();

                    let sc_data_show_bottom_div_color = '#ffffff';
                    const chat_control_panel_vm_div = $(document).find('#chat-control-panel-vm');
                    if (chat_control_panel_vm_div.length) {
                        const chat_control_panel_vm_div_bg = chat_control_panel_vm_div.css('background-image');
                        if (!chat_control_panel_vm_div_bg || chat_control_panel_vm_div_bg === 'none') {
                            sc_data_show_bottom_div_color = '#666666';
                        }
                    }

                    if (n_count > n_online_count) {
                        $(document).find('#control-panel-ctnr-box').append('<div style="width: 50%; position: relative;color: '+ sc_data_show_bottom_div_color +';" id="sc_data_show_bottom_div"><div id="sc_data_show_bottom_rank_num" style="width: 100%;margin-bottom: 5px;">高能：'+ n_count +'</div><div id="sc_data_show_bottom_guard_num" style="width: 100%;">舰长：'+ (guard_text.match(/\d+/) ?? 0) +'</div></div>');
                    } else {
                        $(document).find('#control-panel-ctnr-box').append('<div style="width: 50%; position: relative;color: '+ sc_data_show_bottom_div_color +';" id="sc_data_show_bottom_div"><div id="sc_data_show_bottom_rank_num" title="'+ (n_count / n_online_count * 100).toFixed(2) +'%" style="width: 100%;margin-bottom: 5px;">同接：'+ n_count +'</div><div id="sc_data_show_bottom_guard_num" style="width: 100%;">舰长：'+ (guard_text.match(/\d+/) ?? 0) +'</div></div>');
                    }
                }
            }
        }
    }

    function sc_fetch_and_show() {
        // 抓取SC
        fetch(sc_url).then(response => {
            return response.json();
        }).then(ret => {
            let sc_catch = [];
            if (ret.code === 0) {
                // 高能数
                high_energy_num = ret.data.room_rank_info.user_rank_entry.user_contribution_rank_entry?.count || 0;

                // 舰长数
                let captain_num = ret.data.guard_info.count;
                $(document).find('.sc_captain_num_right').text(captain_num);

                sc_live_room_title = ret.data.anchor_info.base_info.uname + '_' + ret.data.room_info.title;

                sc_catch = ret.data.super_chat_info.message_list;
            }

            // 追加到localstorage 和 SC显示板
            let sc_localstorage = [];
            let sc_sid_localstorage = [];
            let diff_arr_new_sc = [];
            let sc_add_arr = [];
            let sc_localstorage_json = unsafeWindow.localStorage.getItem(sc_localstorage_key);
            if (sc_localstorage_json === null || sc_localstorage_json === 'null' || sc_localstorage_json === '[]' || sc_localstorage_json === '') {
                diff_arr_new_sc = sc_catch;
            } else {
                sc_localstorage = JSON.parse(sc_localstorage_json);
                sc_sid_localstorage = JSON.parse(unsafeWindow.localStorage.getItem(sc_sid_localstorage_key));
                diff_arr_new_sc = sc_catch.filter(v => {
                    let sid = String(v.id) + '_' + String(v.uid) + '_' + String(v.price);

                    return !sc_sid_localstorage.includes(sid);
                });
            }

            diff_arr_new_sc = diff_arr_new_sc.sort((a, b) => a.start_time - b.start_time);

            if (sc_isListEmpty) {
                // 一开始进入
                sc_add_arr = sc_localstorage.concat(diff_arr_new_sc);

                if (diff_arr_new_sc.length) {
                    // 有抓取到实时已经存在的
                    sc_custom_config_start_class_by_fetch(diff_arr_new_sc);
                }

                if (!diff_arr_new_sc.length && sc_localstorage.length) {
                    // 没抓取到实时已经存在的，但有存储的
                    sc_custom_config_start_class_by_store(sc_localstorage);
                }

            } else {
                // 实时
                sc_add_arr = diff_arr_new_sc;
            }

            if (sc_add_arr.length) {
                for (let i = 0; i < sc_add_arr.length; i++){
                    // 追加到SC显示板
                    update_sc_item(sc_add_arr[i]);
                }

                // 追加到localstorage（存储就不用GM_setValue了，直接localstorage，控制台就可以看到）
                if (diff_arr_new_sc.length) {
                    // 加入记录组
                    check_and_join_live_sc_room();

                    for (let d = 0; d < diff_arr_new_sc.length; d++) {
                        sc_localstorage.push(diff_arr_new_sc[d]);
                        sc_sid_localstorage.push(String(diff_arr_new_sc[d]["id"]) + '_' + String(diff_arr_new_sc[d]["uid"]) + '_' + String(diff_arr_new_sc[d]["price"]));
                    }

                    // 保存/更新sc_keep_time （最后sc的时间戳）
                    unsafeWindow.localStorage.setItem(sc_keep_time_key, (new Date()).getTime());

                    // 追加存储
                    unsafeWindow.localStorage.setItem(sc_localstorage_key, JSON.stringify(sc_localstorage));
                    unsafeWindow.localStorage.setItem(sc_sid_localstorage_key, JSON.stringify(sc_sid_localstorage));
                }

                sc_isListEmpty = false;
            }
        }).catch(error => {
            sc_catch_log('请求api失败！抓取已存在的SC失败！请刷新页面来解决~');
            let sc_localstorage_json = unsafeWindow.localStorage.getItem(sc_localstorage_key);
            if (sc_localstorage_json !== null && sc_localstorage_json !== 'null' && sc_localstorage_json !== '[]' && sc_localstorage_json !== '') {
                if (sc_isListEmpty) {
                    let sc_localstorage = JSON.parse(sc_localstorage_json);
                    if (sc_localstorage.length) {
                        sc_custom_config_start_class_by_store(sc_localstorage);

                        for (let r = 0; r < sc_localstorage.length; r++){
                            // 追加到SC显示板
                            update_sc_item(sc_localstorage[r]);
                        }

                        sc_isListEmpty = false;
                    }
                }
            }
        });
    }

    function sc_process_start() {
        // Create a container for the circle
        const sc_circleContainer = document.createElement('div');
        sc_circleContainer.classList.add('sc_long_circle', 'sc_drag_div');
        sc_circleContainer.style.width = '30px';
        sc_circleContainer.style.height = '30px';
        sc_circleContainer.style.backgroundColor = 'rgb(167,201,211,0.5)'; //#A7C9D3 （恬豆应援色）
        sc_circleContainer.style.borderRadius = '50%';
        sc_circleContainer.style.border = '2px solid #ffffff';
        sc_circleContainer.style.position = 'fixed';
        sc_circleContainer.style.left = 0;
        sc_circleContainer.style.top = 0;
        sc_circleContainer.style.color = '#ffffff';
        sc_circleContainer.style.lineHeight = '30px';
        sc_circleContainer.textContent = 'SC';
        sc_circleContainer.style.textAlign = 'center';
        sc_circleContainer.style.cursor = 'grab';
        sc_circleContainer.style.userSelect = 'none';
        sc_circleContainer.style.zIndex = '2233';

        // Create a container for the rectangle
        const sc_rectangleContainer = document.createElement('div');
        sc_rectangleContainer.classList.add('sc_long_rectangle', 'sc_drag_div');
        sc_rectangleContainer.style.width = sc_rectangle_width + 'px';
        sc_rectangleContainer.style.height = 'auto';
        sc_rectangleContainer.style.backgroundColor = 'rgba(255,255,255,1)';
        sc_rectangleContainer.style.position = 'fixed';
        sc_rectangleContainer.style.display = 'none';
        sc_rectangleContainer.style.borderBottom = '10px solid transparent';
        sc_rectangleContainer.style.cursor = 'grab';
        sc_rectangleContainer.style.userSelect = 'none';
        sc_rectangleContainer.style.zIndex = '2233';

        // Add a button to the page to trigger minimize function
        const sc_minimizeButton = document.createElement('button');
        sc_minimizeButton.textContent = '折叠';
        sc_minimizeButton.classList.add('sc_button_min', 'sc_button_item');
        sc_minimizeButton.style.cursor = 'pointer';
        sc_minimizeButton.style.marginRight = '0px';
        $(document).on('click', '.sc_button_min', sc_minimize);

        // Add a button to the page to trigger sidefold function
        const sc_sidefoldButton = document.createElement('button');
        sc_sidefoldButton.textContent = '侧折';
        sc_sidefoldButton.classList.add('sc_button_sidefold', 'sc_button_item');
        sc_sidefoldButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_sidefold', sc_sidefold);
        $(document).on('click', '.sc_button_foldback', sc_foldback);

        // Add a button to the page to trigger memory function
        let sc_memory_text_arr = ['没记', '题记', '个记', '全记'];
        const sc_memoryButton = document.createElement('button');
        sc_memoryButton.textContent = sc_memory_text_arr[sc_memory];
        sc_memoryButton.title = '[没记]-没记忆配置；[题记]-所有<题记>房间共用一个主题配置；[个记]-独立记忆当前的所有配置；[全记]-所有房间共用当前的所有配置';
        sc_memoryButton.classList.add('sc_button_memory', 'sc_button_item');
        sc_memoryButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_memory', sc_memory_modify);


        // Add a button to the page to trigger export function
        const sc_exportButton = document.createElement('button');
        sc_exportButton.textContent = '导出';
        sc_exportButton.classList.add('sc_button_export', 'sc_button_item');
        sc_exportButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_export', sc_export);

        // Add a button to the page to trigger switch function
        const sc_switchButton = document.createElement('button');
        sc_switchButton.textContent = '切换';
        sc_switchButton.title = '主题切换';
        sc_switchButton.classList.add('sc_button_switch', 'sc_button_item');
        sc_switchButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_switch', () => sc_switch_css(true));

        // Add a button to the page to trigger menu function
        const sc_menuButton = document.createElement('button');
        sc_menuButton.textContent = '菜单';
        sc_menuButton.classList.add('sc_button_menu', 'sc_button_item');
        sc_menuButton.style.cursor = 'pointer';
        sc_menuButton.style.display = 'none';
        $(document).on('click', '.sc_button_menu', sc_menu);

        // Create a container for the buttons
        const sc_buttonsContainer = document.createElement('div');
        sc_buttonsContainer.className = 'sc_long_buttons';
        sc_buttonsContainer.style.display = 'none';
        sc_buttonsContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        sc_buttonsContainer.style.textAlign = 'center';
        sc_buttonsContainer.style.position = 'sticky';
        sc_buttonsContainer.style.top = '0';
        sc_buttonsContainer.style.zIndex = '3';

        // Create a container for the dataShow
        const sc_dataShowContainer = document.createElement('div');
        sc_dataShowContainer.className = 'sc_data_show';
        sc_dataShowContainer.style.display = 'none';
        sc_dataShowContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        sc_dataShowContainer.style.textAlign = 'center';
        sc_dataShowContainer.style.position = 'sticky';
        sc_dataShowContainer.style.zIndex = '3';
        sc_dataShowContainer.style.height = '20px';
        sc_dataShowContainer.style.fontSize = '15px';
        sc_dataShowContainer.style.paddingLeft = '10px';
        sc_dataShowContainer.style.paddingRight = '10px';
        sc_dataShowContainer.style.paddingTop = '10px';
        sc_dataShowContainer.style.marginBottom = '20px';

        // Create labels for the dataShow
        const sc_label_high_energy_num_left = document.createElement('label');
        sc_label_high_energy_num_left.textContent = '同接：';
        sc_label_high_energy_num_left.classList.add('sc_data_show_label', 'sc_high_energy_num_left');
        sc_label_high_energy_num_left.style.float = 'left';

        const sc_label_high_energy_num_right = document.createElement('label');
        sc_label_high_energy_num_right.textContent = '0';
        sc_label_high_energy_num_right.classList.add('sc_data_show_label', 'sc_high_energy_num_right');
        sc_label_high_energy_num_right.style.float = 'left';

        const sc_label_captain_num_left = document.createElement('label');
        sc_label_captain_num_left.textContent = '舰长：';
        sc_label_captain_num_left.classList.add('sc_data_show_label', 'sc_captain_num_left');
        sc_label_captain_num_left.style.float = 'right';

        const sc_label_captain_num_right = document.createElement('label');
        sc_label_captain_num_right.textContent = '0';
        sc_label_captain_num_right.classList.add('sc_data_show_label', 'sc_captain_num_right');
        sc_label_captain_num_right.style.float = 'right';

        const sc_label_data_br1 = document.createElement('br');
        sc_label_data_br1.style.display = 'none';
        sc_label_data_br1.className = 'sc_label_data_br';
        const sc_label_data_br2 = document.createElement('br');
        sc_label_data_br2.style.display = 'none';
        sc_label_data_br2.className = 'sc_label_data_br';
        const sc_label_data_br3 = document.createElement('br');
        sc_label_data_br3.style.display = 'none';
        sc_label_data_br3.classList.add('sc_label_data_br', 'sc_label_num_br3');

        // Append buttons to the container
        sc_buttonsContainer.appendChild(sc_switchButton);
        sc_buttonsContainer.appendChild(sc_exportButton);
        sc_buttonsContainer.appendChild(sc_memoryButton);
        sc_buttonsContainer.appendChild(sc_sidefoldButton);
        sc_buttonsContainer.appendChild(sc_menuButton);
        sc_buttonsContainer.appendChild(sc_minimizeButton);

        // Append the container to the rectangle
        sc_rectangleContainer.appendChild(sc_buttonsContainer);

        sc_dataShowContainer.appendChild(sc_label_high_energy_num_left);
        sc_dataShowContainer.appendChild(sc_label_data_br1);
        sc_dataShowContainer.appendChild(sc_label_high_energy_num_right);
        sc_dataShowContainer.appendChild(sc_label_data_br2);
        sc_dataShowContainer.appendChild(sc_label_captain_num_right);
        sc_dataShowContainer.appendChild(sc_label_data_br3);
        sc_dataShowContainer.appendChild(sc_label_captain_num_left);
        sc_rectangleContainer.appendChild(sc_dataShowContainer);

        if (sc_panel_high < 200) { sc_panel_high = 200; }

        // Create a container for sc list
        const sc_listContainer = document.createElement('div');
        sc_listContainer.className = 'sc_long_list';
        sc_listContainer.style.minHeight = '200px';
        sc_listContainer.style.maxHeight = sc_panel_high + 'px';
        sc_listContainer.style.overflowY = 'scroll';
        sc_listContainer.style.overflowX = 'hidden';
        sc_listContainer.style.scrollbarGutter = 'stable'; // 滚动条不占位置
        sc_listContainer.style.paddingLeft = '10px';
        sc_listContainer.style.paddingTop = '10px';
        sc_listContainer.style.paddingBottom = '10px';
        sc_listContainer.style.paddingRight = '13px';
        sc_listContainer.style.marginRight = '-7px'; // 可能scrollbarGutter不是所有浏览器都支持，加多这个和设置'scroll'兼容下

        // Append the container to the rectangle
        sc_rectangleContainer.appendChild(sc_listContainer);

        // scrollbar css
        let sc_scrollbar_style = document.createElement('style');
        sc_scrollbar_style.id = 'sc_scrollbar_style';
        sc_scrollbar_style.textContent = `
            .sc_long_list::-webkit-scrollbar {
                width: 6px;
            }
            .sc_long_list:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.5);
                    border-radius: 6px;
            }
            .sc_long_list::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
        `;
        document.head.appendChild(sc_scrollbar_style);

        let sc_other_style = document.createElement('style');
        sc_other_style.textContent = `
            @keyframes sc_fadenum {
                0%{transform: translateY(-100%);opacity: 0;}
                100%{transform: translateY(0);opacity: 1;}
            }
            @keyframes sc_sun {
                100%{ background-position: -350% 0; }
            }

            .sc_button_item {
                text-decoration: none;
                width: 50px;
                padding: 5px;
                margin-top: 15px;
                margin-bottom: 15px;
                margin-right: 7px;
                background: linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3);
                background-size: 350%;
                color: #ffffff;
                border: none;
            }
            .sc_button_item:hover {
                animation: sc_sun 7s infinite;
            }

            .sc_copy_btn {
                text-decoration: none;
                width: 'auto';
                padding: 5px;
                background: linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3);
                background-size: 350%;
                color: #ffffff;
                border: none;
                box-shadow: '0 0 3px rgba(0, 0, 0, 0.3)';
            }
            .sc_copy_btn:hover {
                animation: sc_sun 7s infinite;
            }

            .sc_func_btn {
                text-decoration: none;
                width: 'auto';
                padding: 5px;
                background: linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3);
                background-size: 350%;
                color: #ffffff;
                border: none;
                box-shadow: '0 0 3px rgba(0, 0, 0, 0.3)';
            }
            .sc_func_btn:hover {
                animation: sc_sun 7s infinite;
            }

            .fans_medal_item {
                color: #ffffff;
                height: 14px;
                line-height: 14px;
                border-radius: 2px;
                display: inline-flex;
                margin-left: 5px;
                align-items: center;
                justify-content: center;
                margin-bottom: 5px;
            }
            .fans_medal_label {
                padding: 0 3px;
            }
            .fans_medal_content {
                font-size: 10px;
            }
            .fans_medal_level {
                color: #06154c;
                background-color: #ffffff;
                font-size: 10px;
                padding: 0 3px;
                border-top-right-radius: 1px;
                border-bottom-right-radius: 1px;
                align-items: center;
                justify-content: center;
            }

            @keyframes sc_circle_hide_x_left {
                0%{transform: translateX(0);}
                100%{transform: translateX(-50%);}
            }
            @keyframes sc_circle_hide_x_right {
                0%{transform: translateX(0);}
                100%{transform: translateX(50%);}
            }
            @keyframes sc_circle_hide_y_top {
                0%{transform: translateY(0);}
                100%{transform: translateY(-50%);}
            }
            @keyframes sc_circle_hide_y_bottom {
                0%{transform: translateY(0);}
                100%{transform: translateY(50%);}
            }
            .sc_circle_x_left_hide_animate {
                animation: sc_circle_hide_x_left .2s linear forwards;
            }
            .sc_circle_x_right_hide_animate {
                animation: sc_circle_hide_x_right .2s linear forwards;
            }
            .sc_circle_y_top_hide_animate {
                animation: sc_circle_hide_y_top .2s linear forwards;
            }
            .sc_circle_y_bottom_hide_animate {
                animation: sc_circle_hide_y_bottom .2s linear forwards;
            }

            @keyframes sc_circle_show_x_left {
                0%{transform: translateX(-50%);}
                100%{transform: translateX(0);}
            }
            @keyframes sc_circle_show_x_right {
                0%{transform: translateX(50%);}
                100%{transform: translateX(0);}
            }
            @keyframes sc_circle_show_y_top {
                0%{transform: translateY(-50%);}
                100%{transform: translateY(0);}
            }
            @keyframes sc_circle_show_y_bottom {
                0%{transform: translateY(50%);}
                100%{transform: translateY(0);}
            }
            .sc_circle_x_left_show_animate {
                animation: sc_circle_show_x_left .2s linear forwards;
            }
            .sc_circle_x_right_show_animate {
                animation: sc_circle_show_x_right .2s linear forwards;
            }
            .sc_circle_y_top_show_animate {
                animation: sc_circle_show_y_top .2s linear forwards;
            }
            .sc_circle_y_bottom_show_animate {
                animation: sc_circle_show_y_bottom .2s linear forwards;
            }
        `;
        document.head.appendChild(sc_other_style);

        let live_player_div = document.getElementById('live-player');
        if (!live_player_div) { return; }

        // 黑名单相关
        if (!check_blacklist_menu(room_id)) { sc_room_blacklist_flag = true; return; }

        document.body.appendChild(sc_circleContainer);
        document.body.appendChild(sc_rectangleContainer);

        // Set initial position
        sc_circleContainer.style.top = `${unsafeWindow.innerHeight / 4}px`;

        $(document).on('mousedown', '.sc_drag_div', sc_startDragging);
        $(document).on('mousemove', sc_drag);
        $(document).on('mouseup', '.sc_drag_div', sc_stopDragging);

        function sc_handleFullscreenChange() {
            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) {
                let sc_circle_clone = $(sc_circleContainer).clone(true);
                let sc_rectangle_clone = $(sc_rectangleContainer).clone(true);
                $(live_player_div).append(sc_circle_clone);
                $(live_player_div).append(sc_rectangle_clone);
                sc_isFullscreen = true;
            } else {
                $(live_player_div).find('.sc_drag_div').remove();
                sc_isFullscreen = false;

                // 判断sc_circle界限
                let xPos = 0;
                let yPos = 0;
                let sc_circles = $(document).find('.sc_long_circle');
                let sc_circles_width = sc_circles.width();
                let sc_circles_height = sc_circles.height();
                sc_circles.each(function() {
                    let rect = this.getBoundingClientRect();
                    xPos = rect.left;
                    yPos = rect.top;
                });

                if (unsafeWindow.innerWidth - xPos < sc_circles_width) {
                    xPos = unsafeWindow.innerWidth - sc_circles_width;
                    sc_circles.css('left', xPos + 'px');
                }

                if (unsafeWindow.innerHeight - yPos < sc_circles_height) {
                    yPos = unsafeWindow.innerHeight - sc_circles_height - 5;
                    sc_circles.css('top', yPos + 'px');
                }

                // 判断sc_rectangle界限
                let sc_rectangles = $(document).find('.sc_long_rectangle');
                let sc_rectangles_width = sc_rectangles.width();
                let sc_rectangles_height = sc_rectangles.height();
                sc_rectangles.each(function() {
                    let rect = this.getBoundingClientRect();
                    xPos = rect.left;
                    yPos = rect.top;
                });
                if (unsafeWindow.innerWidth - xPos < sc_rectangles_width) {
                    xPos = unsafeWindow.innerWidth - sc_rectangles_width;
                    sc_rectangles.css('left', xPos + 'px');
                }

                if (unsafeWindow.innerHeight - yPos < sc_rectangles_height) {
                    yPos = unsafeWindow.innerHeight - sc_rectangles_height - 10;
                    sc_rectangles.css('top', yPos + 'px');
                }
            }
        }

        // 让全屏直播的情况下也显示
        live_player_div.addEventListener('fullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('webkitfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('mozfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('MSFullscreenChange', sc_handleFullscreenChange);

        $(document).on('click', '.sc_long_circle', () => {
            if (sc_isClickAllowed) {
                let xPos = 0;
                let yPos = 0;
                let sc_circles = $(document).find('.sc_long_circle');

                sc_circles.removeClass('sc_circle_x_left_hide_animate');
                sc_circles.removeClass('sc_circle_x_right_hide_animate');
                sc_circles.removeClass('sc_circle_y_top_hide_animate');
                sc_circles.removeClass('sc_circle_y_bottom_hide_animate');
                sc_circles.removeClass('sc_circle_x_left_show_animate');
                sc_circles.removeClass('sc_circle_x_right_show_animate');
                sc_circles.removeClass('sc_circle_y_top_show_animate');
                sc_circles.removeClass('sc_circle_y_bottom_show_animate');

                sc_circles.each(function() {
                    let rect = this.getBoundingClientRect();
                    xPos = rect.left;
                    yPos = rect.top;
                    $(this).hide();
                });

                if (sc_panel_side_fold_flag) {
                    if (unsafeWindow.innerWidth - xPos < 72) {
                        xPos = unsafeWindow.innerWidth - 72;
                    }

                    sc_panel_fold_mode = 1;
                } else {
                    if (unsafeWindow.innerWidth - xPos < sc_rectangle_width) {
                        xPos = unsafeWindow.innerWidth - sc_rectangle_width;
                    }

                    sc_panel_fold_mode = 2;
                }

                if (unsafeWindow.innerHeight - yPos < sc_panel_high) {
                    yPos = unsafeWindow.innerHeight - sc_panel_high - 150;
                }

                let sc_rectangles = $(document).find('.sc_long_rectangle');
                sc_rectangles.each(function() {
                    $(this).css('left', xPos + 'px');
                    $(this).css('top', yPos + 'px');

                    $(document).find('.sc_long_buttons').show();
                    $(document).find('.sc_data_show').show();

                    $(this).slideDown(500);
                });

                sc_fold_mode_store();

                sc_side_fold_custom_auto_run_flag = false;

                sc_custom_config_apply(sc_side_fold_custom_first_class);
            } else {
                sc_isClickAllowed = true;
            }
        });

        $(document).on('mouseenter', '.sc_long_circle', () => {
            let sc_circles = $(document).find('.sc_long_circle');
            sc_circles.css('border', '3px solid rgba(255,255,255,0.5)');

            let sc_circles_animate_class = sc_circles.attr('class').split(' ').find((scClassName) => { return scClassName !== 'sc_long_circle' && scClassName !== 'sc_drag_div'; });
            if (sc_circles_animate_class === 'sc_circle_x_left_hide_animate') {
                sc_circles.removeClass('sc_circle_x_right_show_animate');
                sc_circles.removeClass('sc_circle_y_top_show_animate');
                sc_circles.removeClass('sc_circle_y_bottom_show_animate');
                sc_circles.addClass('sc_circle_x_left_show_animate');
            } else if (sc_circles_animate_class === 'sc_circle_x_right_hide_animate') {
                sc_circles.removeClass('sc_circle_x_left_show_animate');
                sc_circles.removeClass('sc_circle_y_top_show_animate');
                sc_circles.removeClass('sc_circle_y_bottom_show_animate');
                sc_circles.addClass('sc_circle_x_right_show_animate');
            } else if (sc_circles_animate_class === 'sc_circle_y_top_hide_animate') {
                sc_circles.removeClass('sc_circle_x_left_show_animate');
                sc_circles.removeClass('sc_circle_x_right_show_animate');
                sc_circles.removeClass('sc_circle_y_bottom_show_animate');
                sc_circles.addClass('sc_circle_y_top_show_animate');
            } else if (sc_circles_animate_class === 'sc_circle_y_bottom_hide_animate') {
                sc_circles.removeClass('sc_circle_x_left_show_animate');
                sc_circles.removeClass('sc_circle_x_right_show_animate');
                sc_circles.removeClass('sc_circle_y_top_show_animate');
                sc_circles.addClass('sc_circle_y_bottom_show_animate');
            }

            sc_circles.removeClass('sc_circle_x_left_hide_animate');
            sc_circles.removeClass('sc_circle_x_right_hide_animate');
            sc_circles.removeClass('sc_circle_y_top_hide_animate');
            sc_circles.removeClass('sc_circle_y_bottom_hide_animate');
        });

        $(document).on('mouseleave', '.sc_long_circle', () => {
            let sc_circles = $(document).find('.sc_long_circle');
            sc_circles.css('border', '2px solid #ffffff');
            sc_circles.removeClass('sc_circle_x_left_show_animate');
            sc_circles.removeClass('sc_circle_x_right_show_animate');
            sc_circles.removeClass('sc_circle_y_top_show_animate');
            sc_circles.removeClass('sc_circle_y_bottom_show_animate');

            if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(sc_circles.position().left, sc_circles.position().top); }
        });

        // 优化回弹问题
        $(document).on('mouseenter', '.sc_long_rectangle, .sc_long_buttons, .sc_data_show', () => {
            sc_rectangle_mouse_out = false;
            if (sc_rectangle_is_slide_down || sc_rectangle_is_slide_up) {
                return;
            }
            sc_rectangle_is_slide_down = true;

            let sc_btn_model = document.getElementsByClassName('sc_long_buttons');
            let sc_data_model = document.getElementsByClassName('sc_data_show');
            let sc_data_lable_model = document.getElementsByClassName('sc_data_show label');
            let sc_rectangle_model = document.getElementsByClassName('sc_long_rectangle');
            let sc_list_model = document.getElementsByClassName('sc_long_list');

            function sc_change_show() {

                if (!sc_panel_side_fold_flag || (sc_panel_side_fold_flag && sc_func_btn_mode !== 1)) {

                    $(sc_btn_model).slideDown(500, () => {
                        sc_rectangle_is_slide_down = false;
                        if (sc_rectangle_mouse_out) {
                            $(sc_btn_model).slideUp(500);
                        }
                    });
                }

                if (!sc_panel_side_fold_flag || (sc_panel_side_fold_flag && sc_panel_side_fold_simple)) {

                    $(sc_data_model).slideDown(500, () => {
                        sc_rectangle_is_slide_down = false;
                        if (sc_rectangle_mouse_out) {
                            $(sc_data_model).slideUp(500);
                        }
                    });
                    $(sc_data_lable_model).animate({opacity: 1}, 1000);
                }

                // 设置动画完成标志，用于处理鼠标的快速移入移出
                $(sc_data_model).attr('data-anime', '0');
            }

            if (sc_panel_fold_mode === 1) {

                let sc_extra_height = 0;
                let sc_enter_change = $(sc_btn_model).outerHeight() + $(sc_data_model).outerHeight() + 20;
                let sc_diff_height = unsafeWindow.innerHeight - sc_rectangle_model[0].offsetTop - $(sc_list_model).outerHeight() - $(sc_btn_model).outerHeight() - $(sc_data_model).outerHeight() - 25;

                if (!sc_panel_side_fold_simple) {
                    sc_extra_height = $(sc_data_model).outerHeight();
                    if (sc_func_btn_mode !== 1) {
                        sc_enter_change = $(sc_btn_model).outerHeight() + 10;
                    } else {
                        sc_enter_change = $(sc_btn_model).outerHeight();
                    }
                }

                if (Math.abs(unsafeWindow.innerHeight - sc_rectangle_model[0].offsetTop - $(sc_list_model).outerHeight() - sc_extra_height - 10) <= 10) {

                    // 直接计算动画后的数据，用于处理鼠标的快速移入移出
                    $(sc_data_model).attr('data-rectangleTop', sc_rectangle_model[0].offsetTop - sc_enter_change);
                    // 设置动画进行时标志，用于处理鼠标的快速移入移出
                    $(sc_data_model).attr('data-anime', '1');
                    // 优化鼠标从数据模块移入时的动画
                    $(sc_data_lable_model).show();
                    $(sc_data_model).show();
                    $(sc_btn_model).show();

                    $(sc_rectangle_model).animate({top: sc_rectangle_model[0].offsetTop - sc_enter_change}, 500, () => {
                        sc_rectangle_is_slide_down = false;

                        sc_change_show();
                    });
                } else if (sc_diff_height < 0) {

                    // 直接计算动画后的数据，用于处理鼠标的快速移入移出
                    $(sc_data_model).attr('data-rectangleTop', sc_rectangle_model[0].offsetTop + sc_diff_height);
                    // 设置动画进行时标志，用于处理鼠标的快速移入移出
                    $(sc_data_model).attr('data-anime', '1');

                    $(sc_rectangle_model).animate({top: sc_rectangle_model[0].offsetTop + sc_diff_height}, 500, () => {
                        sc_rectangle_is_slide_down = false;

                        // 设置动画完成标志，用于处理鼠标的快速移入移出
                        $(sc_data_model).attr('data-anime', '0');

                    });
                    sc_change_show();
                } else {
                    sc_change_show();
                }
            } else {
                sc_change_show();
            }

            if (sc_panel_side_fold_flag && sc_func_btn_mode !== 1) {
                $(sc_rectangle_model).css('border-bottom', '10px solid transparent');
            }

        });

        $(document).on('mouseleave', '.sc_long_rectangle', (e) => {
            sc_rectangle_mouse_out = true;
            if (sc_rectangle_is_slide_up) {
                return;
            }

            e = e || unsafeWindow.event;
            let sc_mouseleave_next_class_name = (e.relatedTarget && e.relatedTarget.className) || '';
            if (sc_mouseleave_next_class_name === 'sc_ctx_copy_menu' || sc_mouseleave_next_class_name === 'sc_ctx_func_menu') {
                return;
            }

            sc_rectangle_is_slide_up = true;

            let sc_btn_model = document.getElementsByClassName('sc_long_buttons');
            let sc_data_model = document.getElementsByClassName('sc_data_show');
            let sc_data_lable_model = document.getElementsByClassName('sc_data_show label');
            let sc_rectangle_model = document.getElementsByClassName('sc_long_rectangle');
            let sc_list_model = document.getElementsByClassName('sc_long_list');

            let sc_rectangle_top = sc_rectangle_model[0].offsetTop;

            sc_btn_mode_apply();

            $(sc_btn_model).slideUp(500, () => {
                sc_rectangle_is_slide_up = false;
                if (!sc_rectangle_mouse_out) {
                    $(sc_btn_model).slideDown(500);
                    if (sc_panel_side_fold_flag && !sc_panel_side_fold_simple) {
                        $(sc_rectangle_model).css('border-bottom', '10px solid transparent');
                    }
                }
            });

            if (sc_panel_side_fold_flag) {
                // 应对鼠标的快速移入移出时，动画进行中的情况
                let sc_edge_mouse_enter_anime = $(sc_data_model).attr('data-anime');
                if (sc_edge_mouse_enter_anime === '1') {
                    sc_rectangle_top = parseInt($(sc_data_model).attr('data-rectangleTop'), 10);
                }

                if (sc_panel_side_fold_simple) {
                    $(sc_data_lable_model).animate({opacity: 0}, 200);
                    $(sc_data_model).slideUp(500, () => {
                        sc_rectangle_is_slide_up = false;
                        if (!sc_rectangle_mouse_out) {
                            $(sc_data_model).slideDown(500);
                        }
                    });
                    $(sc_rectangle_model).css('border-bottom', '10px solid transparent');
                } else {
                    $(sc_rectangle_model).css('border-bottom', '');
                }
            } else {
                $(sc_data_lable_model).animate({opacity: 0}, 200);
                $(sc_data_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                    if (!sc_rectangle_mouse_out) {
                        $(sc_data_model).slideDown(500);
                    }
                });
            }

            let sc_change_height = $(sc_btn_model).outerHeight() + $(sc_data_model).outerHeight();
            let sc_leave_change = sc_change_height + 20;
            if (sc_panel_fold_mode === 1 && !sc_panel_side_fold_simple) {
                sc_leave_change = $(sc_btn_model).outerHeight() + 10;
            }

            if (Math.abs(unsafeWindow.innerHeight - sc_rectangle_top - $(sc_list_model).outerHeight() - sc_change_height - 30) <= 10) {
                $(sc_rectangle_model).animate({top: sc_rectangle_top + sc_leave_change}, 500, () => {
                    sc_panel_drag_store(sc_rectangle_model[0].offsetLeft, sc_rectangle_model[0].offsetTop);
                });
            }

        });

        $(document).on('mouseenter', '.sc_msg_head', function(e) {
            if (!sc_panel_side_fold_flag || sc_item_side_fold_touch_flag) { return; }

            let sc_fold_out_show_top = $(this).offset().top - $(this).parent().parent().parent().offset().top;
            $(this).parent().css('position', 'absolute');
            $(this).parent().css('top', sc_fold_out_show_top);
            $(this).parent().css('z-index', '10');
            $(this).parent().css('width', (sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            $(this).parent().css('height', '');

            if (($(this).offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                $(this).parent().css('left', -(sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
            }
            sc_side_fold_out_one($(this).parent(), true);

            sc_item_side_fold_touch_flag = true;
            sc_item_side_fold_touch_oj = $(this).parent();
        });

        $(document).on('mouseleave', '.sc_msg_head', function() {
            if (!sc_panel_side_fold_flag) { return; }

            $(this).parent().css('position', '');
            $(this).parent().css('top', '');
            $(this).parent().css('z-index', '');
            $(this).parent().css('width', '50px');
            $(this).parent().css('height', '50px');
            $(this).parent().css('left', '');
            sc_side_fold_in_one($(this).parent());

            sc_item_side_fold_touch_flag = false;
            sc_item_side_fold_touch_oj = {};
        });

        $(document).on('click', '.sc_long_item', sc_toggle_msg_body);

        $(document).on('click', '.sc_data_show', function(e) {
            if (sc_panel_side_fold_flag) {
                e = e || unsafeWindow.event;

                if (sc_panel_side_fold_simple) {
                    sc_panel_side_fold_simple = false;
                    open_and_close_sc_modal('已退出 侧折的极简模式 ✓', '#A7C9D3', e, 1);
                } else {
                    sc_panel_side_fold_simple = true;
                    open_and_close_sc_modal('已设置 侧折的极简模式 ✓', '#A7C9D3', e, 1);
                }

                sc_side_fold_simple_store();

                if (sc_func_btn_mode === 1) {
                    sc_rectangle_is_slide_down = false;
                }
            }
        });

        // 侧折状态下，展开一个SC时也可以滚动
        $(document).on('wheel', '.sc_long_list', function(e) {
            if (sc_panel_side_fold_flag && sc_item_side_fold_touch_flag) {
                e = e || unsafeWindow.event;

                let the_sc_item_mov = 60; // 60是侧折后头像框高度+间隙
                if (e.originalEvent.deltaY < 0) {
                    the_sc_item_mov = -60;
                }
                let the_sc_list = $(document).find('.sc_long_list');
                the_sc_list.scrollTop(the_sc_list.scrollTop() + the_sc_item_mov);
                if (the_sc_list.scrollTop() !== 0 || the_sc_list.scrollTop() + the_sc_list.height() !== the_sc_list[0].scrollHeight) {
                    sc_item_side_fold_touch_oj.css('top', sc_item_side_fold_touch_oj.position().top + the_sc_item_mov);
                }
            }
        });

        let sc_custom_modal_style = document.createElement('style');
        sc_custom_modal_style.textContent = `
            .sc_custom_config_modal {
                display: none;
                position: fixed;
                z-index: 3333;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.3);
            }

            .sc_custom_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_custom_modal_content p {
                color: #000;
            }

            .sc_custom_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_custom_close:hover,
            .sc_custom_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_custom_radio_group {
                display: inline-flex;
                color: #000;
            }

            .sc_custom_radio_group_fullscreen {
                display: inline-flex;
                color: #000;
            }

            .sc_custom_radio_group label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_custom_radio_group_fullscreen label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_custom_btn_div {
                margin-top: 30px;
            }

            .sc_custom_btn_div_fullscreen {
                margin-top: 30px;
            }

            .sc_custom_checkbox_div,
            .sc_custom_input_div {
                display: none;
                text-align: center;
                margin-top: 20px;
            }

            .sc_custom_checkbox_inline {
                vertical-align: middle;
                display: inline-block;
                color: #000;
            }

            .sc_custom_form {
                margin-top: 30px;
                text-align: right;
            }

            .sc_custom_input_div label {
                color: #000;
            }

            #sc_custom_confirm_btn {
                float: right;
            }

            #sc_custom_confirm_btn_fullscreen {
                float: right;
            }

            .sc_custom_modal_btn {
                padding: 5px 20px;
            }
        `;

        document.head.appendChild(sc_custom_modal_style);

        let sc_custom_modal_html = document.createElement('div');
        sc_custom_modal_html.id = 'sc_custom_config_div';
        sc_custom_modal_html.className = 'sc_custom_config_modal';
        sc_custom_modal_html.innerHTML = `
                <div class="sc_custom_modal_content">
                    <span class="sc_custom_close">&times;</span>
                    <p>侧折模式下留言显示设置：</p>
                    <form class="sc_custom_form">
                        <div class="sc_custom_radio_group">
                            <input type="radio" id="sc_custom_default_option" name="sc_custom_option" value="0" checked />
                            <label for="sc_custom_default_option">默认</label>

                            <input type="radio" id="sc_custom_open_option" name="sc_custom_option" value="1" />
                            <label for="sc_custom_open_option">第一个SC保持展开</label>

                            <input type="radio" id="sc_custom_time_option" name="sc_custom_option" value="2" />
                            <label for="sc_custom_time_option">第一个SC不保持展开</label>
                        </div>
                        <div class="sc_custom_checkbox_div sc_custom_checkbox_div_default">
                            <input type="checkbox" id="sc_custom_each_same_time_input" class="sc_custom_checkbox_inline" />
                            <label for="sc_custom_each_same_time_input" class="sc_custom_checkbox_inline" >确保每个实时SC都有相同的展开时间</label>
                        </div>
                        <div class="sc_custom_input_div sc_custom_input_div_default">
                            <label for="sc_custom_time_input">展开时间设定 (5-150/秒)：</label>
                            <input type="number" id="sc_custom_time_input" min="5" max="150" value="10" />
                        </div>
                    </form>
                    <div class="sc_custom_btn_div">
                        <button id="sc_custom_cancel_btn" class="sc_custom_modal_btn">取消</button>
                        <button id="sc_custom_confirm_btn" class="sc_custom_modal_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_custom_modal_html);

        let sc_custom_modal_html_fullscreen = document.createElement('div');
        sc_custom_modal_html_fullscreen.id = 'sc_custom_config_div_fullscreen';
        sc_custom_modal_html_fullscreen.className = 'sc_custom_config_modal';
        sc_custom_modal_html_fullscreen.innerHTML = `
                <div class="sc_custom_modal_content">
                    <span class="sc_custom_close">&times;</span>
                    <p>侧折模式下留言显示设置：</p>
                    <form class="sc_custom_form">
                        <div class="sc_custom_radio_group_fullscreen">
                            <input type="radio" id="sc_custom_default_option_fullscreen" name="sc_custom_option_fullscreen" value="0" checked />
                            <label for="sc_custom_default_option_fullscreen">默认</label>

                            <input type="radio" id="sc_custom_open_option_fullscreen" name="sc_custom_option_fullscreen" value="1" />
                            <label for="sc_custom_open_option_fullscreen">第一个SC保持展开</label>

                            <input type="radio" id="sc_custom_time_option_fullscreen" name="sc_custom_option_fullscreen" value="2" />
                            <label for="sc_custom_time_option_fullscreen">第一个SC不保持展开</label>
                        </div>
                        <div class="sc_custom_checkbox_div sc_custom_checkbox_div_fullscreen">
                            <input type="checkbox" id="sc_custom_each_same_time_input_fullscreen" class="sc_custom_checkbox_inline" />
                            <label for="sc_custom_each_same_time_input" class="sc_custom_checkbox_inline" >确保每个实时SC都有相同的展开时间</label>
                        </div>
                        <div class="sc_custom_input_div sc_custom_input_div_fullscreen">
                            <label for="sc_custom_time_input_fullscreen">展开时间设定 (5-150/秒)：</label>
                            <input type="number" id="sc_custom_time_input_fullscreen" min="5" max="150" value="10" />
                        </div>
                    </form>
                    <div class="sc_custom_btn_div_fullscreen">
                        <button id="sc_custom_cancel_btn_fullscreen" class="sc_custom_modal_btn">取消</button>
                        <button id="sc_custom_confirm_btn_fullscreen" class="sc_custom_modal_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_custom_modal_html_fullscreen);

        function sc_close_custom_modal() {
            $(document).find('.sc_custom_config_modal').hide();
        }

        $(document).on('click', '.sc_custom_close, .sc_custom_modal_btn', function() {
            sc_close_custom_modal();
        });

        $(document).on('change', '#sc_custom_each_same_time_input', function() {
            let sc_custom_select_val = $(document).find('.sc_custom_radio_group input[name="sc_custom_option"]:checked').val();
            if (sc_custom_select_val === '1') {
                if ($(this).is(':checked')) {
                    $(document).find('.sc_custom_input_div').show();
                } else {
                    $(document).find('.sc_custom_input_div').hide();
                }
            }
        });

        $(document).on('change', '#sc_custom_each_same_time_input_fullscreen', function() {
            let sc_custom_select_val = $(document).find('.sc_custom_radio_group_fullscreen input[name="sc_custom_option_fullscreen"]:checked').val();
            if (sc_custom_select_val === '1') {
                if ($(this).is(':checked')) {
                    $(document).find('.sc_custom_input_div').show();
                } else {
                    $(document).find('.sc_custom_input_div').hide();
                }
            }
        });

        $(document).on('click', '#sc_custom_confirm_btn', function(e) {
            let sc_custom_select_val = $(document).find('.sc_custom_radio_group input[name="sc_custom_option"]:checked').val();

            if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
            if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

            sc_side_fold_custom_auto_run_flag = false;

            if (sc_custom_select_val === '0') {
                sc_side_fold_custom_each_same_time_flag = false;

            } else if (sc_custom_select_val === '1') {
                sc_side_fold_custom_each_same_time_flag = $(document).find('#sc_custom_each_same_time_input').is(':checked');

                if (sc_side_fold_custom_each_same_time_flag) {
                    let sc_custom_config_time = $(document).find('#sc_custom_time_input').val();
                    sc_custom_config_time = parseInt(sc_custom_config_time, 10);

                    if (sc_custom_config_time >= 5 && sc_custom_config_time <= 150) {
                        sc_side_fold_custom_time = sc_custom_config_time;
                    } else {

                        if (sc_custom_config_time < 5) {
                            sc_side_fold_custom_time = 5;
                        } else if (sc_custom_config_time > 150) {
                            sc_side_fold_custom_time = 150;
                        } else {
                            sc_side_fold_custom_time = 10;
                        }
                    }

                    sc_side_fold_custom_time = sc_side_fold_custom_time + 1.5; // 1.5s是动画时间，补回来
                }

                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class); }

            } else if (sc_custom_select_val === '2') {
                sc_side_fold_custom_each_same_time_flag = $(document).find('#sc_custom_each_same_time_input').is(':checked');

                let sc_custom_config_time = $(document).find('#sc_custom_time_input').val();
                sc_custom_config_time = parseInt(sc_custom_config_time, 10);

                if (sc_custom_config_time >= 5 && sc_custom_config_time <= 150) {
                    sc_side_fold_custom_time = sc_custom_config_time;
                } else {

                    if (sc_custom_config_time < 5) {
                        sc_side_fold_custom_time = 5;
                    } else if (sc_custom_config_time > 150) {
                        sc_side_fold_custom_time = 150;
                    } else {
                        sc_side_fold_custom_time = 10;
                    }
                }

                sc_side_fold_custom_time = sc_side_fold_custom_time + 1.5; // 1.5s是动画时间，补回来

                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class);

                    if (!sc_side_fold_custom_each_same_time_flag) {
                        sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                            if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                                sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                            }
                        }, sc_side_fold_custom_time * 1000);
                    }

                }
            }

            sc_side_fold_custom_config = parseInt(sc_custom_select_val, 10);
            sc_side_fold_custom_config_store();

            sc_close_custom_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_custom_confirm_btn_fullscreen', function(e) {
            let sc_custom_select_val = $(document).find('.sc_custom_radio_group_fullscreen input[name="sc_custom_option_fullscreen"]:checked').val();

            if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
            if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

            sc_side_fold_custom_auto_run_flag = false;

            if (sc_custom_select_val === '0') {
                sc_side_fold_custom_each_same_time_flag = false;

            } else if (sc_custom_select_val === '1') {
                sc_side_fold_custom_each_same_time_flag = $(document).find('#sc_custom_each_same_time_input_fullscreen').is(':checked');

                if (sc_side_fold_custom_each_same_time_flag) {
                    let sc_custom_config_time = $(document).find('#sc_custom_time_input_fullscreen').val();
                    sc_custom_config_time = parseInt(sc_custom_config_time, 10);

                    if (sc_custom_config_time >= 5 && sc_custom_config_time <= 150) {
                        sc_side_fold_custom_time = sc_custom_config_time;
                    } else {

                        if (sc_custom_config_time < 5) {
                            sc_side_fold_custom_time = 5;
                        } else if (sc_custom_config_time > 150) {
                            sc_side_fold_custom_time = 150;
                        } else {
                            sc_side_fold_custom_time = 10;
                        }
                    }
                }

                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class); }

            } else if (sc_custom_select_val === '2') {
                sc_side_fold_custom_each_same_time_flag = $(document).find('#sc_custom_each_same_time_input_fullscreen').is(':checked');

                let sc_custom_config_time = $(document).find('#sc_custom_time_input_fullscreen').val();
                sc_custom_config_time = parseInt(sc_custom_config_time, 10);

                if (sc_custom_config_time >= 5 && sc_custom_config_time <= 150) {
                    sc_side_fold_custom_time = sc_custom_config_time;
                } else {

                    if (sc_custom_config_time < 5) {
                        sc_side_fold_custom_time = 5;
                    } else if (sc_custom_config_time > 150) {
                        sc_side_fold_custom_time = 150;
                    } else {
                        sc_side_fold_custom_time = 10;
                    }
                }

                if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class);

                    if (!sc_side_fold_custom_each_same_time_flag) {
                        sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                            if (sc_side_fold_custom_first_class && sc_panel_fold_mode === 1) {
                                sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                            }
                        }, sc_side_fold_custom_time * 1000);
                    }

                }
            }

            sc_side_fold_custom_config = parseInt(sc_custom_select_val, 10);
            sc_side_fold_custom_config_store();

            sc_close_custom_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('change', '.sc_custom_radio_group input[type="radio"], .sc_custom_radio_group_fullscreen input[type="radio"]', function () {
            if ($(this).val() === '1') {
                $(document).find('.sc_custom_checkbox_div').show();
                $(document).find('.sc_custom_input_div').hide();
                if ($(document).find('#sc_custom_each_same_time_input').is(':checked')) {
                    $(document).find('.sc_custom_input_div_default').show();
                }

                if ($(document).find('#sc_custom_each_same_time_input_fullscreen').is(':checked')) {
                    $(document).find('.sc_custom_input_div_fullscreen').show();
                }
            } else if ($(this).val() === '2') {
                $(document).find('.sc_custom_checkbox_div').show();
                $(document).find('.sc_custom_input_div').show();
            } else {
                $(document).find('.sc_custom_checkbox_div').hide();
                $(document).find('.sc_custom_input_div').hide();
            }
        });

        let sc_panel_width_modal_style = document.createElement('style');
        sc_panel_width_modal_style.textContent = `
            .sc_panel_width_config_modal {
                display: none;
                position: fixed;
                z-index: 3333;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.3);
            }

            .sc_panel_width_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_panel_width_modal_content p {
                color: #000;
            }

            .sc_panel_width_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_panel_width_close:hover,
            .sc_panel_width_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_panel_width_btn_div {
                text-align: center;
                margin-top: 20px;
            }

            .sc_panel_width_btn_div_fullscreen {
                text-align: center;
                margin-top: 30px;
            }

            #sc_panel_width_input_div {
                text-align: center;
                margin-top: 20px;
            }

            #sc_panel_width_input_div label {
                color: #000;
            }

            #sc_panel_width_input_div_fullscreen {
                text-align: center;
                margin-top: 20px;
            }

            #sc_panel_width_input_div_fullscreen label {
                color: #000;
            }

            #sc_panel_width_cancel_btn {
                float: left;
            }

            #sc_panel_width_cancel_btn_fullscreen {
                float: left;
            }

            #sc_panel_width_confirm_btn {
                float: right;
            }

            #sc_panel_width_confirm_btn_fullscreen {
                float: right;
            }

            .sc_panel_width_modal_btn {
                padding: 3px 10px;
            }
            .sc_panel_width_modal_width_1_btn,
            .sc_panel_width_modal_width_2_btn,
            .sc_panel_width_modal_width_3_btn{
                margin-left: 10px;
            }
        `;

        document.head.appendChild(sc_panel_width_modal_style);

        let sc_panel_width_modal_html = document.createElement('div');
        sc_panel_width_modal_html.id = 'sc_panel_width_config_div';
        sc_panel_width_modal_html.className = 'sc_panel_width_config_modal';
        sc_panel_width_modal_html.innerHTML = `
                <div class="sc_panel_width_modal_content">
                    <span class="sc_panel_width_close">&times;</span>
                    <p>醒目留言（记录板）宽度自定义设置：</p>
                    <form id="sc_panel_width_form">
                        <div id="sc_panel_width_input_div">
                            <label for="sc_panel_width_input">300-500(px)：</label>
                            <input type="number" class="sc_panel_width_input_value" id="sc_panel_width_input" min="300" max="500" value="302"/>
                        </div>
                    </form>

                    <div class="sc_panel_width_btn_div">
                        <button id="sc_panel_width_cancel_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_close_btn">取消</button>
                        <button id="sc_panel_width_default_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_default_btn">默认</button>
                        <button id="sc_panel_width_1_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_width_1_btn">宽一</button>
                        <button id="sc_panel_width_2_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_width_2_btn">宽二</button>
                        <button id="sc_panel_width_3_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_width_3_btn">宽三</button>
                        <button id="sc_panel_width_confirm_btn" class="sc_panel_width_modal_btn sc_panel_width_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_panel_width_modal_html);

        let sc_panel_width_modal_html_fullscreen = document.createElement('div');
        sc_panel_width_modal_html_fullscreen.id = 'sc_panel_width_config_div_fullscreen';
        sc_panel_width_modal_html_fullscreen.className = 'sc_panel_width_config_modal';
        sc_panel_width_modal_html_fullscreen.innerHTML = `
                <div class="sc_panel_width_modal_content">
                    <span class="sc_panel_width_close">&times;</span>
                    <p>醒目留言（记录板）宽度自定义设置：</p>
                    <form id="sc_panel_width_form_fullscreen">
                        <div id="sc_panel_width_input_div_fullscreen">
                            <label for="sc_panel_width_input_fullscreen">300-500(px)：</label>
                            <input type="number" class="sc_panel_width_input_value" id="sc_panel_width_input_fullscreen" min="300" max="500" value="302"/>
                        </div>
                    </form>

                    <div class="sc_panel_width_btn_div_fullscreen">
                        <button id="sc_panel_width_cancel_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_close_btn">取消</button>
                        <button id="sc_panel_width_default_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_default_btn">默认</button>
                        <button id="sc_panel_width_1_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_width_1_btn">宽一</button>
                        <button id="sc_panel_width_2_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_width_2_btn">宽二</button>
                        <button id="sc_panel_width_3_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_width_3_btn">宽三</button>
                        <button id="sc_panel_width_confirm_btn_fullscreen" class="sc_panel_width_modal_btn sc_panel_width_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_panel_width_modal_html_fullscreen);

        function sc_close_panel_width_modal() {
            $(document).find('.sc_panel_width_config_modal').hide();
        }

        function sc_panel_width_config_apply() {
            if (sc_panel_fold_mode === 1) {
                if (sc_side_fold_custom_first_class) { sc_side_fold_custom_auto_run_flag = false; sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class); }
            } else if (sc_panel_fold_mode === 2) {
                $(document).find('.sc_long_rectangle').width(sc_rectangle_width);
            }

            $(document).find('.sc_uname_div').width(sc_rectangle_width / 2 + 5);
        }

        $(document).on('click', '.sc_panel_width_close, .sc_panel_width_modal_close_btn', function() {
            sc_close_panel_width_modal();
        });

        $(document).on('click', '.sc_panel_width_modal_default_btn', function() {
            $(document).find('.sc_panel_width_input_value').val(302);
        });

        $(document).on('click', '.sc_panel_width_modal_width_1_btn', function() {
            $(document).find('.sc_panel_width_input_value').val(325);
        });

        $(document).on('click', '.sc_panel_width_modal_width_2_btn', function() {
            $(document).find('.sc_panel_width_input_value').val(388);
        });

        $(document).on('click', '.sc_panel_width_modal_width_3_btn', function() {
            $(document).find('.sc_panel_width_input_value').val(428);
        });

        $(document).on('click', '#sc_panel_width_confirm_btn', function(e) {
            let sc_panel_width_config = $(document).find('#sc_panel_width_input').val();
            sc_rectangle_width = parseInt(sc_panel_width_config, 10);
            sc_rectangle_width_store();
            sc_panel_width_config_apply();

            sc_close_panel_width_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_panel_width_confirm_btn_fullscreen', function(e) {
            let sc_panel_width_config = $(document).find('#sc_panel_width_input_fullscreen').val();
            sc_rectangle_width = parseInt(sc_panel_width_config, 10);
            sc_rectangle_width_store();
            sc_panel_width_config_apply();

            sc_close_panel_width_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        // 创建一个自定义右键菜单
        let sc_func_button1 = document.createElement('button');
        sc_func_button1.className = 'sc_func_btn';
        sc_func_button1.id = 'sc_func_show_btn';
        sc_func_button1.innerHTML = '侧折模式下显示所有的按钮';
        sc_func_button1.style.marginBottom = '2px';

        let sc_func_button2 = document.createElement('button');
        sc_func_button2.className = 'sc_func_btn';
        sc_func_button2.id = 'sc_func_hide_btn';
        sc_func_button2.innerHTML = '侧折模式下隐藏所有的按钮';
        sc_func_button2.style.marginBottom = '2px';

        let sc_func_button3 = document.createElement('button');
        sc_func_button3.className = 'sc_func_btn';
        sc_func_button3.id = 'sc_func_simple_btn';
        sc_func_button3.innerHTML = '侧折模式下按钮的极简模式';
        sc_func_button3.style.marginBottom = '2px';

        let sc_func_button4 = document.createElement('button');
        sc_func_button4.className = 'sc_func_btn';
        sc_func_button4.id = 'sc_func_one_min_btn';
        sc_func_button4.innerHTML = '侧折模式下只显示折叠按钮';
        sc_func_button4.style.marginBottom = '2px';

        let sc_func_button5 = document.createElement('button');
        sc_func_button5.className = 'sc_func_btn';
        sc_func_button5.id = 'sc_func_one_menu_btn';
        sc_func_button5.innerHTML = '侧折模式下只显示菜单按钮';
        sc_func_button5.style.marginBottom = '2px';

        let sc_func_button6 = document.createElement('button');
        sc_func_button6.className = 'sc_func_btn';
        sc_func_button6.id = 'sc_func_first_sc_item_config_btn';
        sc_func_button6.innerHTML = '侧折模式下留言显示自定义';
        sc_func_button6.style.marginBottom = '2px';

        let sc_func_button7 = document.createElement('button');
        sc_func_button7.className = 'sc_func_btn';
        sc_func_button7.id = 'sc_func_panel_width_config_btn';
        sc_func_button7.innerHTML = '设置记录板留言宽度自定义';
        sc_func_button7.style.marginBottom = '2px';

        let sc_func_button8 = document.createElement('button');
        sc_func_button8.className = 'sc_func_btn';
        sc_func_button8.id = 'sc_func_bottom_data_show_btn';
        sc_func_button8.innerHTML = '右侧的弹幕发送框显示数据';
        sc_func_button8.style.marginBottom = '2px';

        let sc_func_button9 = document.createElement('button');
        sc_func_button9.className = 'sc_func_btn';
        sc_func_button9.id = 'sc_func_bottom_data_hide_btn';
        sc_func_button9.innerHTML = '右侧的弹幕发送框隐藏数据';
        sc_func_button9.style.marginBottom = '2px';

        let sc_func_button10 = document.createElement('button');
        sc_func_button10.className = 'sc_func_btn';
        sc_func_button10.id = 'sc_func_panel_allow_drag_close_btn';
        sc_func_button10.innerHTML = '锁定记录板即关闭拖拽功能';
        sc_func_button10.style.marginBottom = '2px';

        let sc_func_button11 = document.createElement('button');
        sc_func_button11.className = 'sc_func_btn';
        sc_func_button11.id = 'sc_func_panel_allow_drag_open_btn';
        sc_func_button11.innerHTML = '解锁记录板即开放拖拽功能';
        sc_func_button11.style.marginBottom = '2px';

        let sc_func_button12 = document.createElement('button');
        sc_func_button12.className = 'sc_func_btn';
        sc_func_button12.id = 'sc_func_panel_switch_open_mode_btn';
        sc_func_button12.innerHTML = '展开记录板即切换展开模式';
        sc_func_button12.style.marginBottom = '2px';

        let sc_func_button13 = document.createElement('button');
        sc_func_button13.className = 'sc_func_btn';
        sc_func_button13.id = 'sc_circle_welt_hide_half_true_btn';
        sc_func_button13.innerHTML = '设置小图标在贴边后半隐藏';
        sc_func_button13.style.marginBottom = '2px';

        let sc_func_button14 = document.createElement('button');
        sc_func_button14.className = 'sc_func_btn';
        sc_func_button14.id = 'sc_circle_welt_hide_half_false_btn';
        sc_func_button14.innerHTML = '取消小图标在贴边后半隐藏';
        sc_func_button14.style.marginBottom = '2px';

        let sc_func_button15 = document.createElement('button');
        sc_func_button15.className = 'sc_func_btn';
        sc_func_button15.id = 'sc_func_item_show_time_btn';
        sc_func_button15.innerHTML = '显示醒目留言发送具体时间';
        sc_func_button15.style.marginBottom = '2px';

        let sc_func_button16 = document.createElement('button');
        sc_func_button16.className = 'sc_func_btn';
        sc_func_button16.id = 'sc_func_item_hide_time_btn';
        sc_func_button16.innerHTML = '隐藏醒目留言发送具体时间';
        sc_func_button16.style.marginBottom = '2px';

        let sc_func_button17 = document.createElement('button');
        sc_func_button17.className = 'sc_func_btn';
        sc_func_button17.id = 'sc_func_live_sidebar_left_btn';
        sc_func_button17.innerHTML = '设置直播间功能按钮在左侧';
        sc_func_button17.style.marginBottom = '2px';

        let sc_func_button18 = document.createElement('button');
        sc_func_button18.className = 'sc_func_btn';
        sc_func_button18.id = 'sc_func_live_sidebar_right_btn';
        sc_func_button18.innerHTML = '恢复直播间功能按钮在右侧';
        sc_func_button18.style.marginBottom = '2px';

        let sc_func_br1 = document.createElement('br');
        let sc_func_br2 = document.createElement('br');
        let sc_func_br3 = document.createElement('br');
        let sc_func_br4 = document.createElement('br');
        let sc_func_br5 = document.createElement('br');
        let sc_func_br6 = document.createElement('br');
        let sc_func_br7 = document.createElement('br');
        let sc_func_br8 = document.createElement('br');
        let sc_func_br9 = document.createElement('br');
        let sc_func_br10 = document.createElement('br');
        let sc_func_br11 = document.createElement('br');
        let sc_func_br12 = document.createElement('br');
        let sc_func_br13 = document.createElement('br');
        let sc_func_br14 = document.createElement('br');
        let sc_func_br15 = document.createElement('br');
        let sc_func_br16 = document.createElement('br');
        let sc_func_br17 = document.createElement('br');

        let sc_func_context_menu = document.createElement('div');
        sc_func_context_menu.id = 'sc_context_menu_func_body';
        sc_func_context_menu.className = 'sc_ctx_func_menu';
        sc_func_context_menu.style.position = 'fixed';
        sc_func_context_menu.style.display = 'none';
        sc_func_context_menu.style.backgroundColor = '#ffffff';
        sc_func_context_menu.style.border = 0;
        sc_func_context_menu.style.padding = '5px';
        sc_func_context_menu.style.zIndex = 3333;

        sc_func_context_menu.appendChild(sc_func_button1);
        sc_func_context_menu.appendChild(sc_func_br1);
        sc_func_context_menu.appendChild(sc_func_button2);
        sc_func_context_menu.appendChild(sc_func_br2);
        sc_func_context_menu.appendChild(sc_func_button3);
        sc_func_context_menu.appendChild(sc_func_br3);
        sc_func_context_menu.appendChild(sc_func_button4);
        sc_func_context_menu.appendChild(sc_func_br4);
        sc_func_context_menu.appendChild(sc_func_button5);
        sc_func_context_menu.appendChild(sc_func_br5);
        sc_func_context_menu.appendChild(sc_func_button6);
        sc_func_context_menu.appendChild(sc_func_br6);
        sc_func_context_menu.appendChild(sc_func_button7);
        sc_func_context_menu.appendChild(sc_func_br7);
        sc_func_context_menu.appendChild(sc_func_button8);
        sc_func_context_menu.appendChild(sc_func_br8);
        sc_func_context_menu.appendChild(sc_func_button9);
        sc_func_context_menu.appendChild(sc_func_br9);
        sc_func_context_menu.appendChild(sc_func_button10);
        sc_func_context_menu.appendChild(sc_func_br10);
        sc_func_context_menu.appendChild(sc_func_button11);
        sc_func_context_menu.appendChild(sc_func_br11);
        sc_func_context_menu.appendChild(sc_func_button12);
        sc_func_context_menu.appendChild(sc_func_br12);
        sc_func_context_menu.appendChild(sc_func_button13);
        sc_func_context_menu.appendChild(sc_func_br13);
        sc_func_context_menu.appendChild(sc_func_button14);
        sc_func_context_menu.appendChild(sc_func_br14);
        sc_func_context_menu.appendChild(sc_func_button15);
        sc_func_context_menu.appendChild(sc_func_br15);
        sc_func_context_menu.appendChild(sc_func_button16);
        sc_func_context_menu.appendChild(sc_func_br16);
        sc_func_context_menu.appendChild(sc_func_button17);
        sc_func_context_menu.appendChild(sc_func_br17);
        sc_func_context_menu.appendChild(sc_func_button18);

        // 将功能的右键菜单添加到body中
        document.body.appendChild(sc_func_context_menu);

        let sc_func_context_menu_fullscreen = sc_func_context_menu.cloneNode(true);
        sc_func_context_menu_fullscreen.id = 'sc_func_context_menu_fullscreen';
        $(live_player_div).append(sc_func_context_menu_fullscreen);

        $(document).on('click', '#sc_func_show_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_func_btn_mode = 0;
            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下显示所有的按钮✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_hide_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_func_btn_mode = 1;
            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下隐藏所有的按钮 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_simple_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_func_btn_mode = 2;
            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下按钮的极简模式 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_one_min_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_func_btn_mode = 3;
            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下只显示折叠按钮 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_one_menu_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_func_btn_mode = 4;
            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下只显示菜单按钮 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_first_sc_item_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_custom_config_div_id = 'sc_custom_config_div';
            if (sc_isFullscreen) {
                sc_custom_config_div_id = 'sc_custom_config_div_fullscreen';
            }
            $(document).find('#' + sc_custom_config_div_id).show();

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_panel_width_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_panel_width_config_div_id = 'sc_panel_width_config_div';
            if (sc_isFullscreen) {
                sc_panel_width_config_div_id = 'sc_panel_width_config_div_fullscreen';
            }
            $(document).find('#' + sc_panel_width_config_div_id).show();

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_bottom_data_show_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            data_show_bottom_flag = true;
            sc_data_show_bottom_store();
            $(document).find('#sc_data_show_bottom_div').show();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 右侧的弹幕发送框显示数据 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_bottom_data_hide_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            data_show_bottom_flag = false;
            sc_data_show_bottom_store();
            $(document).find('#sc_data_show_bottom_div').hide();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 右侧的弹幕发送框隐藏数据 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_panel_allow_drag_close_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_panel_allow_drag_flag = false;
            sc_panel_allow_drag_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 锁定记录板即关闭拖拽功能 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_panel_allow_drag_open_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_panel_allow_drag_flag = true;
            sc_panel_allow_drag_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 解锁记录板即开放拖拽功能 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_panel_switch_open_mode_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_long_buttons').show();
            sc_rectangle_is_slide_down = false;
            sc_foldback();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已切换到展开模式 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_circle_welt_hide_half_true_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_welt_hide_circle_half_flag = true;
            sc_welt_hide_circle_half_store();
            sc_circle_welt_hide_half();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 小图标在贴边后半隐藏 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_circle_welt_hide_half_false_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_welt_hide_circle_half_flag = false;
            sc_welt_hide_circle_half_store();

            let sc_circles = $(document).find('.sc_long_circle');
            sc_circles.removeClass('sc_circle_x_left_hide_animate');
            sc_circles.removeClass('sc_circle_x_right_hide_animate');
            sc_circles.removeClass('sc_circle_y_top_hide_animate');
            sc_circles.removeClass('sc_circle_y_bottom_hide_animate');

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 取消小图标在贴边后半隐藏 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_item_show_time_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_start_time').show();
            sc_start_time_show_flag = true;
            sc_start_time_show_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 显示醒目留言发送具体时间 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_item_hide_time_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_start_time').hide();
            sc_start_time_show_flag = false;
            sc_start_time_show_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 隐藏醒目留言发送具体时间 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_live_sidebar_left_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_live_sidebar_left_flag = true;
            sc_live_sidebar_position_left_apply();
            sc_live_sidebar_left_flag_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 直播间功能按钮在左侧 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_live_sidebar_right_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_live_sidebar_left_flag = false;
            sc_live_sidebar_position_right_apply();
            sc_live_sidebar_left_flag_store();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已恢复直播间功能按钮在右侧 ✓', '#A7C9D3', e, 1);
        });

        // 创建一个自定义右键菜单
        let sc_copy_button1 = document.createElement('button');
        sc_copy_button1.className = 'sc_copy_btn';
        sc_copy_button1.id = 'sc_copy_has_time_btn';
        sc_copy_button1.innerHTML = '点击复制为图片(有时间)';
        sc_copy_button1.style.marginBottom = '2px';

        let sc_copy_button2 = document.createElement('button');
        sc_copy_button2.className = 'sc_copy_btn';
        sc_copy_button2.id = 'sc_copy_no_time_btn';
        sc_copy_button2.innerHTML = '点击复制为图片(没时间)';
        sc_copy_button2.style.marginBottom = '2px';

        let sc_copy_button3 = document.createElement('button');
        sc_copy_button3.className = 'sc_copy_btn';
        sc_copy_button3.id = 'sc_copy_uname_color_btn';
        sc_copy_button3.innerHTML = '点击复制为图片(名颜色)';

        let sc_copy_br1 = document.createElement('br');
        let sc_copy_br2 = document.createElement('br');

        let sc_copy_context_menu = document.createElement('div');
        sc_copy_context_menu.id = 'sc_context_menu_copy_body';
        sc_copy_context_menu.className = 'sc_ctx_copy_menu';
        sc_copy_context_menu.style.position = 'fixed';
        sc_copy_context_menu.style.display = 'none';
        sc_copy_context_menu.style.backgroundColor = '#ffffff';
        sc_copy_context_menu.style.border = 0;
        sc_copy_context_menu.style.padding = '5px';
        sc_copy_context_menu.style.zIndex = 3333;

        sc_copy_context_menu.appendChild(sc_copy_button1);
        sc_copy_context_menu.appendChild(sc_copy_br1);
        sc_copy_context_menu.appendChild(sc_copy_button2);
        sc_copy_context_menu.appendChild(sc_copy_br2);
        sc_copy_context_menu.appendChild(sc_copy_button3);

        // 将复制的右键菜单添加到body中
        document.body.appendChild(sc_copy_context_menu);

        let sc_copy_context_menu_fullscreen = sc_copy_context_menu.cloneNode(true);
        sc_copy_context_menu_fullscreen.id = 'sc_copy_context_menu_fullscreen';
        $(live_player_div).append(sc_copy_context_menu_fullscreen);

        $(document).on('mouseover', '.sc_copy_btn, .sc_func_btn', function() {
            $(this).css('transform', 'translateX(-2px)');
            setTimeout(function() {
                $(document).find('.sc_copy_btn, .sc_func_btn').css('transform', 'translateY(0)');
            }, 200);

        })

        $(document).on('click', '.sc_copy_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_long_rectangle').css('cursor', 'progress');

            sc_after_click_func_btn_apply(e, true);

            function capture_gen_canvas(tmp_sc_item_div, current_sc_div) {

                return new Promise((resolve, reject) => {
                    html2canvas(tmp_sc_item_div, {
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: null,
                        logging: false,
                        width: current_sc_div.clientWidth,
                        height: current_sc_div.clientHeight,
                        scale: 8 // 数值越大，分辨率越大，越清晰，至少4倍才比较清晰
                    }).then(canvas => {

                        resolve(canvas);
                    }).catch(error => {

                        reject(error);
                    });
                });
            }

            let sc_copy_btn_id = $(this).attr('id');

            $(this).parent().fadeOut(function() {
                let current_sc_div = $(sc_copy_context_menu).data('current_sc_div');

                if (sc_panel_side_fold_flag) {
                    $(current_sc_div).css('width', (sc_rectangle_width - 22) + 'px');
                    sc_side_fold_out_one($(current_sc_div));
                    if ($(current_sc_div).attr('data-fold') === '0') {
                        $(current_sc_div).css('height', $(current_sc_div).attr('data-height') + 'px');
                    }
                }

                let tmp_sc_item = $(current_sc_div).clone(); // 为了去掉animation的影响
                tmp_sc_item.width(current_sc_div.clientWidth);
                tmp_sc_item.height(current_sc_div.clientHeight);
                tmp_sc_item.css('animation', '');
                tmp_sc_item.find('.sc_font_color').css('color', '#000000');
                tmp_sc_item.find('.sc_start_time').show();

                if (sc_copy_btn_id === 'sc_copy_no_time_btn') {
                    tmp_sc_item.find('.sc_start_time').hide();
                } else if (sc_copy_btn_id === 'sc_copy_uname_color_btn') {
                    tmp_sc_item.find('.sc_start_time').hide();
                    let this_sc_uname_data_color = tmp_sc_item.find('.sc_font_color').attr('data-color');
                    tmp_sc_item.find('.sc_font_color').css('color', this_sc_uname_data_color);
                }

                if (tmp_sc_item.find('.fans_medal_item').length) {
                    // 粉丝牌存在时，可以兼容名字过长的情况
                    tmp_sc_item.find('.sc_msg_head_left').css('width', '170px');
                    tmp_sc_item.find('.sc_uname_div').css('width', '225px');
                    tmp_sc_item.find('.sc_msg_head_right').css('height', '20px');
                }

                document.body.appendChild(tmp_sc_item[0]);

                capture_gen_canvas(tmp_sc_item[0], current_sc_div).then(canvas => {
                    canvas.toBlob(blob => {
                        navigator.clipboard.write([
                            new ClipboardItem({'image/png': blob})
                        ]).then(() => {
                            open_and_close_sc_modal('✓', '#A7C9D3', e);
                        }).catch(err => {
                            open_and_close_sc_modal('✗', 'red', e);
                            console.error('复制SC图片失败', err);
                        });
                    });
                }).catch(error => {
                    console.error('处理html2canvas方法错误', error);
                });

                document.body.removeChild(tmp_sc_item[0]);

                if (sc_panel_side_fold_flag) {
                    $(current_sc_div).css('width', '');
                    $(current_sc_div).css('height', '');
                    sc_side_fold_in_one($(current_sc_div));
                }
            });
        });

        let sc_context_copy_menu_timeout_id;
        let sc_context_func_menu_timeout_id;

        $(document).on('mouseleave', '.sc_ctx_copy_menu', function(e) {
            sc_context_copy_menu_timeout_id = setTimeout(() => {
                $(this).hide();
                sc_after_click_func_btn_apply(e, true);
            }, 1000);
        });

        $(document).on('mouseover', '.sc_ctx_copy_menu', function() {
            clearTimeout(sc_context_copy_menu_timeout_id);
        });

        $(document).on('mouseleave', '.sc_ctx_func_menu', function(e) {
            sc_context_func_menu_timeout_id = setTimeout(() => {
                $(this).hide();
                sc_after_click_func_btn_apply(e, true);
            }, 1000);
        });

        $(document).on('mouseover', '.sc_ctx_func_menu', function() {
            clearTimeout(sc_context_func_menu_timeout_id);
        });

        $(document).on('contextmenu', '.sc_long_item', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            // 存储当前右键的div
            $(document).find('.sc_ctx_copy_menu').data('current_sc_div', this);
            let the_sc_ctx_menu_id = 'sc_context_menu_copy_body';
            if (sc_isFullscreen) {
                the_sc_ctx_menu_id = 'sc_copy_context_menu_fullscreen';
            }

            if (unsafeWindow.innerWidth - e.clientX <= 200) {
                e.clientX = unsafeWindow.innerWidth - 200;
            }
            if (unsafeWindow.innerHeight - e.clientY <= 100) {
                e.clientY = unsafeWindow.innerHeight - 100;
            }
            $(document).find('#' + the_sc_ctx_menu_id).css('left', e.clientX + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).css('top', e.clientY + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).show();

            clearTimeout(sc_context_copy_menu_timeout_id);
        });

        $(document).on('contextmenu', '.sc_data_show, .sc_long_buttons', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let the_sc_ctx_menu_id = 'sc_context_menu_func_body';
            if (sc_isFullscreen) {
                the_sc_ctx_menu_id = 'sc_func_context_menu_fullscreen';
            }

            if (unsafeWindow.innerWidth - e.clientX <= 200) {
                e.clientX = unsafeWindow.innerWidth - 200;
            }
            if (unsafeWindow.innerHeight - e.clientY <= 500) {
                e.clientY = unsafeWindow.innerHeight - 500;
            }
            $(document).find('#' + the_sc_ctx_menu_id).css('left', e.clientX + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).css('top', e.clientY + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).show();

            clearTimeout(sc_context_func_menu_timeout_id);
        });

        sc_switch_css();
        sc_memory_show();
        check_and_clear_all_sc_store();
        sc_fetch_and_show();

    }

    sc_process_start();

    if (!sc_room_blacklist_flag) {
        const originalParse = JSON.parse;
        JSON.parse = function (str) {
            try {
                const parsedArr = originalParse(str);
                if (parsedArr && parsedArr.cmd !== undefined) {
                    if (parsedArr.cmd === 'ONLINE_RANK_COUNT') {
                        let n_count = parsedArr.data.count;
                        let n_online_count = parsedArr.data.online_count ?? 0;
                        update_rank_count(n_count, n_online_count);
                    } else if (parsedArr.cmd === 'SUPER_CHAT_MESSAGE') {
                        let store_flag = store_sc_item(parsedArr.data);
                        if (store_flag) {
                            update_sc_item(parsedArr.data);
                        }
                    }
                }

                return parsedArr;
            } catch (error) {
                throw error;
            }
        };

        setTimeout(() => {
            // setTimeout的时间差内先更新一下再定时
            const _rank_list_ctnr_box_li = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (_rank_list_ctnr_box_li.length) {
                const _guard_n = _rank_list_ctnr_box_li.last().text().match(/\d+/) ?? 0;

                $(document).find('.sc_captain_num_right').text(_guard_n);
                sc_update_date_guard_once = true;

                if (data_show_bottom_flag) {
                    $(document).find('#sc_data_show_bottom_guard_num').text('舰长：' + _guard_n);
                }
            }

            let rank_list_ctnr_box_interval = setInterval(() => {
                const rank_list_ctnr_box_item = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (rank_list_ctnr_box_item.length) {
                    const guard_text_target = rank_list_ctnr_box_item.last();

                    const guard_test_observer = new MutationObserver((mutationsList) => {
                        for (const mutation of mutationsList) {
                            if (mutation.type === 'characterData' || mutation.type === 'childList' || mutation.type === 'subtree') {
                                const guard_newNum = mutation.target.textContent.match(/\d+/) ?? 0;
                                // SC记录板的
                                $(document).find('.sc_captain_num_right').text(guard_newNum);

                                // 页面的
                                if (data_show_bottom_flag) {
                                    $(document).find('#sc_data_show_bottom_guard_num').text('舰长：' + guard_newNum);
                                }
                            }
                        }
                    });
                    const guard_text_watch_config = { characterData: true, childList: true, subtree: true }
                    guard_test_observer.observe(guard_text_target[0], guard_text_watch_config);

                    clearInterval(rank_list_ctnr_box_interval);
                }
            });
        }, 3000);

        setInterval(() => {
            updateTimestampDiff(); // 每30秒更新时间差
            check_all_memory_status(); // 每30秒检查全记状态
        }, 30000);

    }

})();
