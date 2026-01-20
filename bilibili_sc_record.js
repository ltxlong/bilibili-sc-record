// ==UserScript==
// @name         B站直播间SC记录板
// @namespace    http://tampermonkey.net/
// @homepage     https://greasyfork.org/zh-CN/scripts/484381
// @version      13.1.0
// @description  实时同步SC、同接、高能和舰长数据，可拖拽移动，可导出，可单个SC折叠，可侧折，可搜索，可记忆配置，可生成图片（右键菜单），活动页可用，直播全屏可用，黑名单功能，不用登录，多种主题切换，自动清除超过12小时的房间SC存储，可自定义SC过期时间，可指定用户进入直播间提示、弹幕高亮和SC转弹幕，可让所有的实时SC以弹幕方式展现，可自动点击天选，可自动跟风发送combo弹幕
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
// @require      https://unpkg.com/jquery@3.7.1/dist/jquery.js
// @require      https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.js
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// @downloadURL https://update.greasyfork.org/scripts/484381/B%E7%AB%99%E7%9B%B4%E6%92%AD%E9%97%B4SC%E8%AE%B0%E5%BD%95%E6%9D%BF.user.js
// @updateURL https://update.greasyfork.org/scripts/484381/B%E7%AB%99%E7%9B%B4%E6%92%AD%E9%97%B4SC%E8%AE%B0%E5%BD%95%E6%9D%BF.meta.js
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
    // SC可折叠，可生成图片（折叠和展开都可以），可搜索
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

    let room_id_str_arr = unsafeWindow.location.pathname.split('/');
    let room_id = room_id_str_arr.pop();
    let sc_url_api = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=';

    sc_catch_log('url_room_id:', room_id);

    if (!room_id) {
        if (room_id_str_arr[1]) {
            room_id = room_id_str_arr[1];
        } else {
            sc_catch_log('获取room_id失败，插件已停止正确的SC存储');
        }
    }

    let sc_url = sc_url_api + room_id; // 请求sc的url（请求是为了获取进入直播间时已经存在的SC）

    let real_room_id = room_id;

    let sc_panel_list_height = 400; // 显示面板的最大高度（单位是px，后面会拼接）
    let sc_rectangle_width = 302; // 默认302，右侧合适325/388/428（SC刚刚好在弹幕框内/侧折模式记录板紧贴在弹幕框右侧外/侧折模式记录板紧贴在屏幕右侧）（单位是px，后面会拼接）

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

    let sc_live_all_font_size_add = 0; // 记录板字体增量
    let sc_live_font_size_only_message_flag = true; // 是否只调整SC内容字体大小

    let high_energy_num = 0; // 高能数
    let high_energy_contribute_num = 0; // 同接数
    let sc_guard_num = 0; // 舰长数
    let sc_update_date_guard_once = false;
    let sc_nesting_live_room_flag = false;
    let sc_date_num_nesting_judge_n = 0;
    let this_view_high_energy_num_est = 0; // 本次观看期间的最大高能数
    let this_view_high_energy_contribute_num_est = 0; // 本次观看期间的最大同接数
    let this_view_high_energy_num_est_time = 0; // 对应的时间
    let this_view_high_energy_contribute_num_est_time = 0; //对应的时间

    let sc_room_blacklist_flag = false;

    let sc_follow_api = 'https://api.bilibili.com/x/relation?fid=';
    let sc_live_room_up_uid = 0; // 主播的uid，查询关注关系用

    let sc_dm_send_api = 'https://api.live.bilibili.com/msg/send';
    let sc_u_frsc = (document.cookie.split(';').map(c=>c.trim()).find(c => c.startsWith('bili_jct=')) || '').split('bili_jct=')[1] || ''; // 发送弹幕用
    let sc_combo_dm_recent_send_arr = []; // 已经跟风发送的combo弹幕，发送后，30秒剔除
    let sc_auto_dm_send_last_rnd = 0; // 上一次跟风发送combo弹幕的时间s，用于判断至少间隔20秒才再次查询关注
    let sc_last_follow_check_flag = false; // 上一次查询关注结果
    let sc_combo_dm_send_fail_arr = []; // 发送失败的combo弹幕，用于再次发送判断，失败10秒后或者发送成功后剔除

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

    let sc_start_time_simple_flag = false; // 是否设置SC发送的时间显示为简单的时分
    let sc_start_time_show_flag = true; // 是否显示SC发送的具体时间

    let sc_welt_hide_circle_half_flag = false; // 是否小图标贴边半隐藏

    let sc_side_fold_custom_each_same_time_flag = false; // 是否每个实时SC都有相同的展开时间
    let sc_side_fold_custom_each_same_time_class = '';
    let sc_side_fold_custom_each_same_time_timeout_id = '';
    let sc_side_fold_custom_auto_run_flag = false; // 是否在运行自动展现SC了
    let sc_side_fold_custom_stop_from_auto_flag = false; // 是否自动运行时间到的停止

    let sc_panel_show_time_mode = 0; // 展开模式下，SC的显示模式：0-默认一直显示，1-停留30秒，2-停留1~120分钟，3-依照SC的时间停留，4-依照SC的时间，同时最多停留1~120分钟，5-停留30~300秒
    let sc_panel_show_time_each_same = 0.5; // 模式1和2、4、5，所有SC停留多少分钟，默认半分钟，即30秒
    let sc_live_panel_show_time_click_stop_flag = false; // 是否点击【不记忆地显示醒目留言列表】后，过期检查暂停；点击【不记忆地隐藏过期醒目留言】后，过期检查继续
    let sc_live_panel_not_show_now_time_sc_flag = false; // 进入直播间的时候，不显示直播间正在挂着的SC
    let sc_live_panel_not_show_local_sc_flag = false; // 进入直播间的时候，不显示保存在本地的往期SC

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

    let sc_item_order_up_flag = false; // 是否设置SC的排列顺序是从下往上（最新的在底部）

    let sc_data_show_high_energy_num_flag = false; // 是否设置数据模块显示高能（默认显示同接）

    let sc_side_fold_fullscreen_auto_hide_list_flag = false; // 是否设置侧折模式下，切换全屏时，自动隐藏醒目留言列表

    let sc_side_fold_hide_list_ing_flag = false; // 是否已经不记忆的隐藏醒目留言列表

    let sc_live_fullscreen_config_separate_memory_flag = false; // 是否设置全屏状态下一些功能设置分开单独记忆

    let sc_live_special_tip_location = 0; // 0-显示在顶部，1-显示在中间，2-显示在底部
    let sc_live_special_tip_uid_arr = []; // 特定用户进入直播间进行提示的用户id数组
    let sc_live_special_tip_remark_arr = []; // 特定用户进入直播间进行提示的用户id:备注映射数组
    let sc_live_special_tip_await_arr = []; // 正待展示的用户id数组
    let sc_live_special_msg_await_arr = []; // 正待展示的用户id数组
    let sc_live_special_sc_await_arr = []; // 正待展示的用户id数组
    let sc_live_special_tip_str = ''; // 设置提示的原始字符串

    let sc_live_special_msg_flag = false; // 特定用户的弹幕高亮
    let sc_live_special_sc_flag = false; // 特定用户的SC以高亮弹幕出现（记录板还是会显示）
    let sc_live_special_sc_no_remain_flag = false; // 是否SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）
    let sc_live_special_danmu_mode = 0; // 0-半透明 [样式较大]，1-半透明 [样式较小]，2-不透明 [样式较大]，3-不透明 [样式较小]
    let sc_live_sc_to_danmu_show_mode = 0; // 0-半透明 [样式较大]，1-半透明 [样式较小]，2-不透明 [样式较大]，3-不透明 [样式较小]
    let sc_live_sc_to_danmu_show_location = 0; // 0-显示在顶部，1-显示在中间，2-显示在底部
    let sc_live_sc_to_danmu_show_flag = false; // 是否设置醒目留言以弹幕来展现（侧折模式不再将SC自动展现）
    let sc_live_sc_to_danmu_no_remain_flag = false; // 是否SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）
    let sc_live_sc_routine_price_arr = [30, 50, 100, 500, 1000, 2000]; // 常规电池价格数组，如果SC2弹幕的价格不在里面就显示

    let sc_live_special_danmu_show_index_arr = [0, 0, 0, 0, 0, 0]; // 将屏幕分为6个弹幕道：顶部,top 17%,top 34%,top 51%,top 68%,底部。0-没弹幕存在，1-有弹幕存在
    let sc_live_special_tip_danmu_cache_arr = []; // 特定用户进入直播间的缓存弹幕
    let sc_live_special_msg_danmu_cache_arr = []; // 特定用户的弹幕缓存
    let sc_live_sc_to_danmu_cache_arr = []; // 所有用户SC的缓存弹幕
    let sc_live_tip_danmu_show_n = 0; // -1-所有在等待，0-解锁，1-上锁
    let sc_live_msg_danmu_show_n = 0; // -1-所有在等待，0-解锁，1-上锁
    let sc_live_sc_danmu_show_n = 0; // -1-所有在等待，0-解锁，1-上锁
    let sc_live_middle_danmu_index_arr = [1, 2, 3, 4];
    let sc_live_last_middle_danmu_index = 0; // 记录最后一个中间弹幕的index，1~4，0-还没初始化，则先随机一个
    let sc_live_middle_danmu_index_crash_handle_arr = [[3, 1, 4, 2], [4, 3, 2], [3, 4, 1], [1, 2, 4], [2, 1, 3]];
    // 弹道冲突后的选择优先级，这样选择观感比较好
    // 0: 3->1->4->2
    // 1: 4->3->2
    // 2: 3->4->1
    // 3: 1->2->4
    // 4: 2->1->3

    // fullscreen var 全屏的变量
    let sc_panel_list_height_fullscreen = 400; // 高
    let sc_rectangle_width_fullscreen = 302; // 宽
    let sc_func_btn_mode_fullscreen = 0; // 侧折的按钮模式
    let sc_switch_fullscreen = 0; // 主题
    let sc_panel_fold_mode_fullscreen = 0; // 折叠模式
    let sc_panel_side_fold_simple_fullscreen = false; // 侧折的极简模式
    let sc_panel_drag_left_fullscreen = -1; // 位置left
    let sc_panel_drag_top_fullscreen = -1; // 位置top
    let sc_panel_side_fold_flag_fullscreen = false; // 侧折
    let sc_data_show_high_energy_num_flag_fullscreen = false; // 是否设置数据模块显示高能（默认显示同接）

    // 屏幕分辨率和位置相关的变量
    let sc_screen_resolution_change_flag = false; // 屏幕分辨率是否改变
    let sc_panel_drag_left_percent = 0;
    let sc_panel_drag_top_percent = 0;
    let sc_panel_drag_left_fullscreen_percent = 0;
    let sc_panel_drag_top_fullscreen_percent = 0;

    // SC搜索相关变量
    let sc_list_search_result_time = 0; // 同一个弹窗的上一次搜索结果的时间戳
    let sc_list_search_str = ''; // 同一个弹窗的上一次的搜索关键字符串

    let sc_list_search_shortkey_flag = true; // 是否开启SC搜索快捷键 ctrl + f，默认开启

    let sc_last_item_timestamp = 0; // 精确到s的
    let sc_last_item_sort = 0; // 区分相同时间s的发送

    let sc_list_search_div_bg_opacity_range = 90; // 搜索弹窗的透明度0~100

    // 自动天选的变量
    let sc_live_auto_tianxuan_flag = false; // 开启自动点击天选（当前直播间，并且已经关注主播）, 默认关闭

    // 跟风发送combo弹幕的变量
    let sc_live_send_dm_combo_flag = false; // 开启跟风发送combo弹幕（当前直播间，并且已经关注主播），默认关闭

    let sc_live_side_fold_head_border_bg_opacity_flag = false; // 是否设置侧折模式下，SC显示的头像边框为透明
    let sc_live_item_bg_opacity_val = 1; // SC卡片背景的透明度
    let sc_live_item_suspend_bg_opacity_one_flag = false; // 是否设置鼠标悬浮在SC卡片上方的时候，卡片背景的透明度变为1

    let sc_live_hide_value_font_flag = false; // 是否隐藏SC的价格
    let sc_live_hide_diff_time_flag = false; // 是否隐藏SC的时间距离

    function sc_screen_resolution_change_check() {
        let the_sc_screen_resolution_change_flag = sc_screen_resolution_change_flag;
        let live_sc_screen_resolution_str = unsafeWindow.localStorage.getItem('live_sc_screen_resolution_str');
        let the_now_screen_resolution_str = unsafeWindow.top.document.documentElement.clientWidth + '_' + unsafeWindow.top.document.documentElement.clientHeight;
        if (live_sc_screen_resolution_str !== null && live_sc_screen_resolution_str !== 'null' && live_sc_screen_resolution_str !== '') {

            the_sc_screen_resolution_change_flag = the_now_screen_resolution_str !== live_sc_screen_resolution_str;

            if (the_sc_screen_resolution_change_flag) {
                unsafeWindow.localStorage.setItem('live_sc_screen_resolution_str', the_now_screen_resolution_str);
            }
        } else {
            unsafeWindow.localStorage.setItem('live_sc_screen_resolution_str', the_now_screen_resolution_str);
        }

        return the_sc_screen_resolution_change_flag;
    }

    sc_screen_resolution_change_flag = sc_screen_resolution_change_check();

    function sc_live_special_tip_str_to_arr() {
        let sc_special_tip_arr = [];
        if (sc_live_special_tip_str) {
            sc_special_tip_arr = sc_live_special_tip_str.split(",");

            for (let t = 0; t < sc_special_tip_arr.length; t++) {
                let sc_special_tip_item_str = sc_special_tip_arr[t].replace(/\n/g, '');
                let sc_special_tip_item_arr = sc_special_tip_item_str.split("-");
                let sc_special_tip_uid = sc_special_tip_item_arr[0];
                if (!isNaN(sc_special_tip_uid)) {
                    sc_live_special_tip_uid_arr.push(sc_special_tip_uid)

                    if (sc_special_tip_item_arr.length > 1 && sc_special_tip_item_arr[1] !== '') {
                        sc_live_special_tip_remark_arr['"' + sc_special_tip_uid + '"'] = sc_special_tip_item_arr[1] ?? '';
                    }
                }
            }

            sc_live_special_tip_uid_arr = sc_live_special_tip_uid_arr.filter((value, index, self) => {
                return self.indexOf(value) === index;
            });

        } else {
            sc_live_special_tip_uid_arr = [];
            sc_live_special_tip_remark_arr = [];
        }
    }

    function sc_config_get_live_special_tip_location() {
        let sc_live_special_tip_location_get = unsafeWindow.localStorage.getItem('live_sc_special_tip_location');
        if (sc_live_special_tip_location_get !== null && sc_live_special_tip_location_get !== 'null' && sc_live_special_tip_location_get !== '') {
            sc_live_special_tip_location = parseInt(sc_live_special_tip_location_get, 10);
        }
    }

    function sc_config_get_live_special_tip_str() {
        let sc_live_special_tip_str_get = unsafeWindow.localStorage.getItem('live_sc_special_tip_str');
        if (sc_live_special_tip_str_get !== null && sc_live_special_tip_str_get !== 'null' && sc_live_special_tip_str_get !== '') {
            sc_live_special_tip_str = sc_live_special_tip_str_get;
        }
    }

    function sc_config_get_live_special_msg_flag() {
        let sc_live_special_msg_flag_get = unsafeWindow.localStorage.getItem('live_sc_special_msg_flag');
        if (sc_live_special_msg_flag_get !== null && sc_live_special_msg_flag_get !== 'null' && sc_live_special_msg_flag_get !== '') {
            sc_live_special_msg_flag = sc_live_special_msg_flag_get === 'true';
        }
    }

    function sc_config_get_live_special_sc_flag() {
        let sc_live_special_sc_flag_get = unsafeWindow.localStorage.getItem('live_sc_special_sc_flag');
        if (sc_live_special_sc_flag_get !== null && sc_live_special_sc_flag_get !== 'null' && sc_live_special_sc_flag_get !== '') {
            sc_live_special_sc_flag = sc_live_special_sc_flag_get === 'true';
        }
    }

    function sc_config_get_live_special_danmu_mode() {
        let sc_live_special_danmu_mode_get = unsafeWindow.localStorage.getItem('live_sc_special_danmu_mode');
        if (sc_live_special_danmu_mode_get !== null && sc_live_special_danmu_mode_get !== 'null' && sc_live_special_danmu_mode_get !== '') {
            sc_live_special_danmu_mode = parseInt(sc_live_special_danmu_mode_get, 10);
        }
    }

    function sc_config_get_live_sc_to_danmu_show_flag() {
        let sc_live_sc_to_danmu_show_flag_get = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_flag');
        if (sc_live_sc_to_danmu_show_flag_get !== null && sc_live_sc_to_danmu_show_flag_get !== 'null' && sc_live_sc_to_danmu_show_flag_get !== '') {
            sc_live_sc_to_danmu_show_flag = sc_live_sc_to_danmu_show_flag_get === 'true';
        }
    }

    function sc_config_get_live_sc_to_danmu_show_location() {
        let sc_live_sc_to_danmu_show_location_get = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_location');
        if (sc_live_sc_to_danmu_show_location_get !== null && sc_live_sc_to_danmu_show_location_get !== 'null' && sc_live_sc_to_danmu_show_location_get !== '') {
            sc_live_sc_to_danmu_show_location = parseInt(sc_live_sc_to_danmu_show_location_get, 10);
        }
    }

    function sc_config_get_live_sc_to_danmu_show_mode() {
        let sc_live_sc_to_danmu_show_mode_get = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_mode');
        if (sc_live_sc_to_danmu_show_mode_get !== null && sc_live_sc_to_danmu_show_mode_get !== 'null' && sc_live_sc_to_danmu_show_mode_get !== '') {
            sc_live_sc_to_danmu_show_mode = parseInt(sc_live_sc_to_danmu_show_mode_get, 10);
        }
    }

    function sc_config_get_live_special_sc_no_remain_flag() {
        let sc_live_special_sc_no_remain_flag_get = unsafeWindow.localStorage.getItem('live_special_sc_no_remain_flag');
        if (sc_live_special_sc_no_remain_flag_get !== null && sc_live_special_sc_no_remain_flag_get !== 'null' && sc_live_special_sc_no_remain_flag_get !== '') {
            sc_live_special_sc_no_remain_flag = sc_live_special_sc_no_remain_flag_get === 'true';
        }
    }

    function sc_config_get_live_sc_to_danmu_no_remain_flag() {
        let sc_live_sc_to_danmu_no_remain_flag_get = unsafeWindow.localStorage.getItem('live_sc_to_danmu_no_remain_flag');
        if (sc_live_sc_to_danmu_no_remain_flag_get !== null && sc_live_sc_to_danmu_no_remain_flag_get !== 'null' && sc_live_sc_to_danmu_no_remain_flag_get !== '') {
            sc_live_sc_to_danmu_no_remain_flag = sc_live_sc_to_danmu_no_remain_flag_get === 'true';
        }
    }

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
        sc_start_time_simple_flag = sc_all_memory_config['sc_start_time_simple_flag'] ?? false;
        sc_start_time_show_flag = sc_all_memory_config['sc_start_time_show_flag'] ?? true;
        sc_welt_hide_circle_half_flag = sc_all_memory_config['sc_welt_hide_circle_half_flag'] ?? false;
        sc_side_fold_custom_each_same_time_flag = sc_all_memory_config['sc_side_fold_custom_each_same_time_flag'] ?? false;
        sc_rectangle_width = sc_all_memory_config['sc_rectangle_width'] ?? 302;
        sc_panel_list_height = sc_all_memory_config['sc_panel_list_height'] ?? 400;
        sc_live_sidebar_left_flag = sc_all_memory_config['sc_live_sidebar_left_flag'] ?? false;
        sc_item_order_up_flag = sc_all_memory_config['sc_item_order_up_flag'] ?? false;
        sc_data_show_high_energy_num_flag = sc_all_memory_config['sc_data_show_high_energy_num_flag'] ?? false;
        sc_side_fold_fullscreen_auto_hide_list_flag = sc_all_memory_config['sc_side_fold_fullscreen_auto_hide_list_flag'] ?? false;
        sc_live_all_font_size_add = sc_all_memory_config['sc_live_all_font_size_add'] ?? 0;
        sc_live_font_size_only_message_flag = sc_all_memory_config['sc_live_font_size_only_message_flag'] ?? true;
        sc_live_side_fold_head_border_bg_opacity_flag = sc_all_memory_config['sc_live_side_fold_head_border_bg_opacity_flag'] ?? false;
        sc_live_item_bg_opacity_val = sc_all_memory_config['sc_live_item_bg_opacity_val'] ?? 1;
        sc_live_item_suspend_bg_opacity_one_flag = sc_all_memory_config['sc_live_item_suspend_bg_opacity_one_flag'] ?? false;
        sc_live_hide_value_font_flag = sc_all_memory_config['sc_live_hide_value_font_flag'] ?? false;
        sc_live_hide_diff_time_flag = sc_all_memory_config['sc_live_hide_diff_time_flag'] ?? false;
        sc_live_fullscreen_config_separate_memory_flag = sc_all_memory_config['sc_live_fullscreen_config_separate_memory_flag'] ?? false;
        sc_panel_show_time_mode = sc_all_memory_config['sc_panel_show_time_mode'] ?? 0;
        sc_panel_show_time_each_same = sc_all_memory_config['sc_panel_show_time_each_same'] ?? 0.5;
        sc_live_panel_show_time_click_stop_flag = sc_all_memory_config['sc_live_panel_show_time_click_stop_flag'] ?? false;
        sc_live_panel_not_show_now_time_sc_flag = sc_all_memory_config['sc_live_panel_not_show_now_time_sc_flag'] ?? false;
        sc_live_panel_not_show_local_sc_flag = sc_all_memory_config['sc_live_panel_not_show_local_sc_flag'] ?? false;
        sc_list_search_shortkey_flag = sc_all_memory_config['sc_list_search_shortkey_flag'] ?? true;
        sc_list_search_div_bg_opacity_range = sc_all_memory_config['sc_list_search_div_bg_opacity_range'] ?? 90;
        sc_live_auto_tianxuan_flag = sc_all_memory_config['sc_live_auto_tianxuan_flag'] ?? false;
        sc_live_send_dm_combo_flag = sc_all_memory_config['sc_live_send_dm_combo_flag'] ?? false;

        sc_panel_drag_left_percent = sc_all_memory_config['sc_panel_drag_left_percent'] ?? 0;
        sc_panel_drag_top_percent = sc_all_memory_config['sc_panel_drag_top_percent'] ?? 0;

        if (sc_panel_drag_left_percent) { sc_panel_drag_left = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_percent); }
        if (sc_panel_drag_top_percent) { sc_panel_drag_top = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_percent); }

        sc_config_get_live_special_tip_location();
        sc_config_get_live_special_tip_str();
        sc_live_special_tip_str_to_arr();
        sc_config_get_live_special_msg_flag();
        sc_config_get_live_special_sc_flag();
        sc_config_get_live_special_danmu_mode();
        sc_config_get_live_sc_to_danmu_show_flag();
        sc_config_get_live_sc_to_danmu_show_location();
        sc_config_get_live_sc_to_danmu_show_mode();
        sc_config_get_live_special_sc_no_remain_flag();
        sc_config_get_live_sc_to_danmu_no_remain_flag();

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
            sc_panel_drag_top = unsafeWindow.innerHeight - sc_panel_list_height;
        }

        // fullscreen var
        sc_panel_list_height_fullscreen = sc_all_memory_config['sc_panel_list_height_fullscreen'] ?? 400;
        sc_rectangle_width_fullscreen = sc_all_memory_config['sc_rectangle_width_fullscreen'] ?? 302;
        sc_func_btn_mode_fullscreen = sc_all_memory_config['sc_func_btn_mode_fullscreen'] ?? 0;
        sc_switch_fullscreen = sc_all_memory_config['sc_switch_fullscreen'] ?? 0;
        sc_panel_fold_mode_fullscreen = sc_all_memory_config['sc_panel_fold_mode_fullscreen'] ?? 0;
        sc_panel_side_fold_simple_fullscreen = sc_all_memory_config['sc_panel_side_fold_simple_fullscreen'] ?? false;
        sc_panel_drag_left_fullscreen = sc_all_memory_config['sc_panel_drag_left_fullscreen'] ?? -1;
        sc_panel_drag_top_fullscreen = sc_all_memory_config['sc_panel_drag_top_fullscreen'] ?? -1;
        sc_panel_side_fold_flag_fullscreen = sc_all_memory_config['sc_panel_side_fold_flag_fullscreen'] ?? false;
        sc_data_show_high_energy_num_flag_fullscreen = sc_all_memory_config['sc_data_show_high_energy_num_flag_fullscreen'] ?? false;

        sc_panel_drag_left_fullscreen_percent = sc_all_memory_config['sc_panel_drag_left_fullscreen_percent'] ?? 0;
        sc_panel_drag_top_fullscreen_percent = sc_all_memory_config['sc_panel_drag_top_fullscreen_percent'] ?? 0;

        if (sc_panel_drag_left_fullscreen_percent) { sc_panel_drag_left_fullscreen = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_fullscreen_percent); }
        if (sc_panel_drag_top_fullscreen_percent) { sc_panel_drag_top_fullscreen = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_fullscreen_percent); }

        if (sc_panel_fold_mode_fullscreen === 1 && (unsafeWindow.innerWidth - sc_panel_drag_left_fullscreen) < 72) {
            sc_panel_drag_left_fullscreen = unsafeWindow.innerWidth - 72;
        }
        if (sc_panel_fold_mode_fullscreen === 2 && (unsafeWindow.innerWidth - sc_panel_drag_left_fullscreen) < sc_rectangle_width_fullscreen) {
            sc_panel_drag_left_fullscreen = unsafeWindow.innerWidth - sc_rectangle_width_fullscreen;
        }

        if (sc_panel_drag_top_fullscreen <= 0) {
            sc_panel_drag_top_fullscreen = 0;
        }
        if (sc_panel_drag_top_fullscreen >= unsafeWindow.innerHeight) {
            sc_panel_drag_top_fullscreen = unsafeWindow.innerHeight - sc_panel_list_height_fullscreen;
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
        sc_start_time_simple_flag = sc_self_memory_config['sc_start_time_simple_flag'] ?? false;
        sc_start_time_show_flag = sc_self_memory_config['sc_start_time_show_flag'] ?? true;
        sc_welt_hide_circle_half_flag = sc_self_memory_config['sc_welt_hide_circle_half_flag'] ?? false;
        sc_side_fold_custom_each_same_time_flag = sc_self_memory_config['sc_side_fold_custom_each_same_time_flag'] ?? false;
        sc_rectangle_width = sc_self_memory_config['sc_rectangle_width'] ?? 302;
        sc_panel_list_height = sc_self_memory_config['sc_panel_list_height'] ?? 400;
        sc_live_sidebar_left_flag = sc_self_memory_config['sc_live_sidebar_left_flag'] ?? false;
        sc_item_order_up_flag = sc_self_memory_config['sc_item_order_up_flag'] ?? false;
        sc_data_show_high_energy_num_flag = sc_self_memory_config['sc_data_show_high_energy_num_flag'] ?? false;
        sc_side_fold_fullscreen_auto_hide_list_flag = sc_self_memory_config['sc_side_fold_fullscreen_auto_hide_list_flag'] ?? false;
        sc_live_all_font_size_add = sc_self_memory_config['sc_live_all_font_size_add'] ?? 0;
        sc_live_font_size_only_message_flag = sc_self_memory_config['sc_live_font_size_only_message_flag'] ?? true;
        sc_live_side_fold_head_border_bg_opacity_flag = sc_self_memory_config['sc_live_side_fold_head_border_bg_opacity_flag'] ?? false;
        sc_live_item_bg_opacity_val = sc_self_memory_config['sc_live_item_bg_opacity_val'] ?? 1;
        sc_live_item_suspend_bg_opacity_one_flag = sc_self_memory_config['sc_live_item_suspend_bg_opacity_one_flag'] ?? false;
        sc_live_hide_value_font_flag = sc_self_memory_config['sc_live_hide_value_font_flag'] ?? false;
        sc_live_hide_diff_time_flag = sc_self_memory_config['sc_live_hide_diff_time_flag'] ?? false;
        sc_live_fullscreen_config_separate_memory_flag = sc_self_memory_config['sc_live_fullscreen_config_separate_memory_flag'] ?? false;
        sc_panel_show_time_mode = sc_self_memory_config['sc_panel_show_time_mode'] ?? 0;
        sc_panel_show_time_each_same = sc_self_memory_config['sc_panel_show_time_each_same'] ?? 0.5;
        sc_live_panel_show_time_click_stop_flag = sc_self_memory_config['sc_live_panel_show_time_click_stop_flag'] ?? false;
        sc_live_panel_not_show_now_time_sc_flag = sc_self_memory_config['sc_live_panel_not_show_now_time_sc_flag'] ?? false;
        sc_live_panel_not_show_local_sc_flag = sc_self_memory_config['sc_live_panel_not_show_local_sc_flag'] ?? false;
        sc_list_search_shortkey_flag = sc_self_memory_config['sc_list_search_shortkey_flag'] ?? true;
        sc_list_search_div_bg_opacity_range = sc_self_memory_config['sc_list_search_div_bg_opacity_range'] ?? 90;
        sc_live_auto_tianxuan_flag = sc_self_memory_config['sc_live_auto_tianxuan_flag'] ?? false;
        sc_live_send_dm_combo_flag = sc_self_memory_config['sc_live_send_dm_combo_flag'] ?? false;

        sc_panel_drag_left_percent = sc_self_memory_config['sc_panel_drag_left_percent'] ?? 0;
        sc_panel_drag_top_percent = sc_self_memory_config['sc_panel_drag_top_percent'] ?? 0;

        if (sc_panel_drag_left_percent) { sc_panel_drag_left = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_percent); }
        if (sc_panel_drag_top_percent) { sc_panel_drag_top = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_percent); }

        sc_config_get_live_special_tip_location();
        sc_config_get_live_special_tip_str();
        sc_live_special_tip_str_to_arr();
        sc_config_get_live_special_msg_flag();
        sc_config_get_live_special_sc_flag();
        sc_config_get_live_special_danmu_mode();
        sc_config_get_live_sc_to_danmu_show_flag();
        sc_config_get_live_sc_to_danmu_show_location();
        sc_config_get_live_sc_to_danmu_show_mode();
        sc_config_get_live_special_sc_no_remain_flag();
        sc_config_get_live_sc_to_danmu_no_remain_flag();

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
            sc_panel_drag_top = unsafeWindow.innerHeight - sc_panel_list_height;
        }

        sc_memory = 2;

        // fullscreen var
        sc_panel_list_height_fullscreen = sc_self_memory_config['sc_panel_list_height_fullscreen'] ?? 400;
        sc_rectangle_width_fullscreen = sc_self_memory_config['sc_rectangle_width_fullscreen'] ?? 302;
        sc_func_btn_mode_fullscreen = sc_self_memory_config['sc_func_btn_mode_fullscreen'] ?? 0;
        sc_switch_fullscreen = sc_self_memory_config['sc_switch_fullscreen'] ?? 0;
        sc_panel_fold_mode_fullscreen = sc_self_memory_config['sc_panel_fold_mode_fullscreen'] ?? 0;
        sc_panel_side_fold_simple_fullscreen = sc_self_memory_config['sc_panel_side_fold_simple_fullscreen'] ?? false;
        sc_panel_drag_left_fullscreen = sc_self_memory_config['sc_panel_drag_left_fullscreen'] ?? -1;
        sc_panel_drag_top_fullscreen = sc_self_memory_config['sc_panel_drag_top_fullscreen'] ?? -1;
        sc_panel_side_fold_flag_fullscreen = sc_self_memory_config['sc_panel_side_fold_flag_fullscreen'] ?? false;
        sc_data_show_high_energy_num_flag_fullscreen = sc_self_memory_config['sc_data_show_high_energy_num_flag_fullscreen'] ?? false;

        sc_panel_drag_left_fullscreen_percent = sc_self_memory_config['sc_panel_drag_left_fullscreen_percent'] ?? 0;
        sc_panel_drag_top_fullscreen_percent = sc_self_memory_config['sc_panel_drag_top_fullscreen_percent'] ?? 0;

        if (sc_panel_drag_left_fullscreen_percent) { sc_panel_drag_left_fullscreen = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_fullscreen_percent); }
        if (sc_panel_drag_top_fullscreen_percent) { sc_panel_drag_top_fullscreen = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_fullscreen_percent); }

        if (sc_panel_fold_mode_fullscreen === 1 && (unsafeWindow.innerWidth - sc_panel_drag_left_fullscreen) < 72) {
            sc_panel_drag_left_fullscreen = unsafeWindow.innerWidth - 72;
        }
        if (sc_panel_fold_mode_fullscreen === 2 && (unsafeWindow.innerWidth - sc_panel_drag_left_fullscreen) < sc_rectangle_width_fullscreen) {
            sc_panel_drag_left_fullscreen = unsafeWindow.innerWidth - sc_rectangle_width_fullscreen;
        }

        if (sc_panel_drag_top_fullscreen <= 0) {
            sc_panel_drag_top_fullscreen = 0;
        }
        if (sc_panel_drag_top_fullscreen >= unsafeWindow.innerHeight) {
            sc_panel_drag_top_fullscreen = unsafeWindow.innerHeight - sc_panel_list_height_fullscreen;
        }
    }

    function sc_memory_get_store_mode_switch(sc_switch_memory_rooms_json) {
        let sc_switch_memory_rooms = JSON.parse(sc_switch_memory_rooms_json);
        if (sc_switch_memory_rooms.includes(room_id)) {
            let sc_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record');
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record_fullscreen');
            }
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
    if (sc_keep_time_flag && (sc_now_time - parseInt(sc_keep_time, 10)) > 1000 * 60 * 60 * sc_clear_time_hour) {
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
                } else if (sc_keep_time_item !== null && sc_keep_time_item !== 'null' && sc_keep_time_item !== 0 && sc_keep_time_item !== '' && ((sc_now_time - parseInt(sc_keep_time_item, 10)) / (1000 * 60 * 60)) > sc_clear_time_hour) {
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

    function getTimestampConversion(timestamp, the_sc_start_time_simple_flag = false) {
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

        if (the_sc_start_time_simple_flag) {
            m = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

            return h + m;
        } else {
            return Y + M + D + h + m + s;
        }

    }

    function get_timestamp_diff(timestamp, sc_price) {
        let the_time_stamp = parseInt(timestamp);
        let the_sc_price = parseInt(sc_price);
        let the_sc_item_expire_flag = false;

        if (timestamp.toString().length === 10) {
            the_time_stamp = timestamp * 1000;
        }

        let now_time = (new Date()).getTime();
        let time_diff_value = now_time - the_time_stamp;

        let time_diff_second = parseInt(time_diff_value / 1000, 10);

        if (sc_panel_show_time_mode) {
            // 所有的SC至少停留30秒（开始循环的第一个30秒）
            if (sc_panel_show_time_mode === 3) {
                // 依照SC的时间停留
                if (the_sc_price >= 30 && the_sc_price < 50) {
                    // 1分钟过期
                    if (time_diff_second >= 60) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 50 && the_sc_price < 100) {
                    // 2分钟过期
                    if (time_diff_second >= 60 * 2) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 100 && the_sc_price < 500) {
                    // 5分钟过期
                    if (time_diff_second >= 60 * 5) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 500 && the_sc_price < 1000) {
                    // 30分钟过期
                    if (time_diff_second >= 60 * 30) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 1000 && the_sc_price < 2000) {
                    // 1小时过期
                    if (time_diff_second >= 60 * 60) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 2000) {
                    // 2小时过期
                    if (time_diff_second >= 60 * 120) { the_sc_item_expire_flag = true; }
                }
            } else if (sc_panel_show_time_mode === 4) {
                // 依照SC的时间，同时最多停留1~120分钟（取两者最小值）
                if (the_sc_price >= 30 && the_sc_price < 50) {
                    // 1分钟过期
                    if (time_diff_second >= 60 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 50 && the_sc_price < 100) {
                    // 2分钟过期
                    if (time_diff_second >= 60 * 2 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 100 && the_sc_price < 500) {
                    // 5分钟过期
                    if (time_diff_second >= 60 * 5 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 500 && the_sc_price < 1000) {
                    // 30分钟过期
                    if (time_diff_second >= 60 * 30 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 1000 && the_sc_price < 2000) {
                    // 1小时过期
                    if (time_diff_second >= 60 * 60 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                } else if (the_sc_price >= 2000) {
                    // 2小时过期
                    if (time_diff_second >= 60 * 120 || time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
                }
            } else {
                // 所有的SC停留 sc_panel_show_time_each_same 分钟
                if (time_diff_second >= 60 * sc_panel_show_time_each_same) { the_sc_item_expire_flag = true; }
            }
        }

        let result_str = '';
        if (time_diff_value < 0) {
            return [result_str, the_sc_item_expire_flag];
        }

        let day_diff = time_diff_value / (1000 * 60 * 60 * 24);
        let hour_diff = time_diff_value / (1000 * 60 * 60);
        let min_diff = time_diff_value / (1000 * 60);

        if (day_diff >= 1) {
            result_str = '' + parseInt(day_diff) + '天前';
        } else if (hour_diff >= 1) {
            result_str = '' + parseInt(hour_diff) + '小时前';
        } else if (min_diff >= 1) {
            result_str = '' + parseInt(min_diff) + '分钟前';
        } else {
            result_str = '刚刚';
        }

        return [result_str, the_sc_item_expire_flag];
    }

    // 更新每条SC距离当前时间，并且检查SC是否过期
    function update_timestamp_diff() {
        let sc_timestamp_item = $(document).find('.sc_start_timestamp');
        let sc_expire_check_stop_flag = $(document).find('.sc_long_list').hasClass('sc_long_expire_check_stop');

        sc_timestamp_item.each(function() {
            let [new_timestamp_diff, the_sc_item_expire_flag] = get_timestamp_diff($(this).html(), $(this).next().html());
            $(this).prev().html(new_timestamp_diff);
            if (sc_panel_fold_mode !== 0 && the_sc_item_expire_flag && !sc_expire_check_stop_flag) {
                $(this).closest('.sc_long_item').addClass('sc_long_expire_tag_item').fadeOut(500);
            }
        });
    }

    // 查找距离指定时间最近的div
    function find_time_closest_div(list_class_name, minutes_ago) {
        let the_target_time = Date.now() - (minutes_ago * 60 * 1000); // 计算几分钟前的时间戳
        let the_list_items = document.querySelectorAll(list_class_name);

        if (the_list_items.length === 0) {
            return null; // 没有找到任何符合条件的元素
        } else if (the_list_items.length === 1) {
            return the_list_items[0]; // 只有一个元素时直接返回
        }

        if (the_target_time >= parseInt(the_list_items[0].getAttribute('data-start'), 10)) {
            return the_list_items[0];
        }

        if (the_target_time <= parseInt(the_list_items[the_list_items.length - 1].getAttribute('data-start'), 10)) {
            return the_list_items[the_list_items.length - 1];
        }

        let index_left = 0;
        let index_right = the_list_items.length - 1;

        while (index_left <= index_right) {
            let index_mid = Math.floor((index_left + index_right) / 2);
            let the_mid_time = parseInt(the_list_items[index_mid].getAttribute('data-start'), 10);

            if (the_mid_time > the_target_time) {
                index_left = index_mid + 1;
            } else {
                index_right = index_mid - 1;
            }
        }

        if (index_left >= the_list_items.length) {
            // 所有元素的时间戳都小于目标时间
            return the_list_items[the_list_items.length - 1];
        } else if (index_right < 0) {
            // 所有元素的时间戳都大于目标时间
            return the_list_items[0];
        } else {
            // 比较 left 和 right 哪个更接近目标时间
            let the_left_time = parseInt(the_list_items[index_left].getAttribute('data-start'), 10);
            let the_right_time = parseInt(the_list_items[index_right].getAttribute('data-start'), 10);

            if (Math.abs(the_left_time - the_target_time) < Math.abs(the_right_time - the_target_time)) {
                return the_list_items[index_left];
            } else {
                return the_list_items[index_right];
            }
        }
    }

    function change_color_opacity(color, alpha) {
        // 如果是 HEX 格式（#开头）
        if (color.startsWith('#')) {
            color = color.replace(/^#/, '');
            if (color.length === 3) {
                color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
            }
            const num = parseInt(color, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            // 如果未传入 alpha，默认 1，否则使用传入的 alpha
            return `rgba(${r}, ${g}, ${b}, ${alpha !== undefined ? alpha : 1})`;
        }
        // 如果是 RGB / RGBA 格式
        else if (color.startsWith('rgb')) {
            // 提取 RGB/RGBA 数值部分
            const parts = color.match(/(\d*\.?\d+)/g); // 支持整数和浮点数
            if (!parts || parts.length < 3) {
                throw new Error("Invalid RGB/RGBA color format");
            }
            const [r, g, b, originalAlpha] = parts.map(Number);
            // 如果传入了 alpha，则覆盖；否则沿用原 RGBA 的 alpha（若没有则默认 1）
            const finalAlpha = alpha !== undefined ? alpha : (originalAlpha !== undefined ? originalAlpha : 1);
            return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
        }
        // 其他格式返回原来的
        else {
            return color;
        }
    }

    function custom_search_sc_div(the_search_user_name, the_search_content, the_search_time, list_class_name, type = 1) {

        let the_list_items = document.querySelectorAll(list_class_name);
        let the_list_items_arr = [...the_list_items];

        if ((sc_item_order_up_flag || !type) && !(sc_item_order_up_flag && !type)) {
            // default: 0_time_大，end_time_小
            // reverse: 0_time_小，end_time_大
            the_list_items_arr = the_list_items_arr.reverse();
        }

        // 格式化参数
        let the_search_first_flag = true;

        the_search_user_name = the_search_user_name.trim();
        the_search_content = the_search_content.trim();

        let the_default_result = null;

        // 条件为空直接返回空
        if (the_search_user_name === '' && the_search_content === '' && the_search_time === '' && !sc_list_search_result_time) {
            sc_list_search_str = '__';

            return the_default_result;
        } else if (the_search_user_name === '' && the_search_content === '' && the_search_time === '' && sc_list_search_result_time) {
            // 条件为空但有上一次搜索的结果，直接返回上一个/下一个相邻的SC
            let the_sc_live_search_last_div = document.querySelector(list_class_name + '[data-start="' + sc_list_search_result_time + '"]');

            the_default_result = the_sc_live_search_last_div;

            if (type) {
                let the_sc_live_search_next_div = $(the_sc_live_search_last_div).next();

                if (the_sc_live_search_next_div.length) {
                    sc_list_search_result_time = parseInt(the_sc_live_search_next_div.attr('data-start'), 10);
                    the_default_result = the_sc_live_search_next_div[0];
                }
            } else {
                let the_sc_live_search_prev_div = $(the_sc_live_search_last_div).prev();

                if (the_sc_live_search_prev_div.length) {
                    sc_list_search_result_time = parseInt(the_sc_live_search_prev_div.attr('data-start'), 10);
                    the_default_result = the_sc_live_search_prev_div[0];
                }
            }

            sc_list_search_str = '__';

            return the_default_result;
        }

        if (the_search_time !== '' && the_search_time < 0) {
            the_search_time = 0;
        }

        if (sc_list_search_str === the_search_user_name + '_' + the_search_content + '_' + the_search_time) {
            the_search_first_flag = false;
            // 非初次搜索，但没结果的直接返回空
            if (!sc_list_search_result_time) {
                return the_default_result;
            }
        }

        sc_list_search_str = the_search_user_name + '_' + the_search_content + '_' + the_search_time;

        let the_last_search_start_time = 0;

        for (let the_sc_item of the_list_items_arr) {
            let the_item_start_time = parseInt(the_sc_item.getAttribute('data-start'), 10);
            if (!the_search_first_flag) {
                // 非初次搜索
                if (type) {
                    // 下一个
                    if (the_item_start_time >= sc_list_search_result_time) {
                        continue;
                    }
                } else {
                    the_last_search_start_time = sc_list_search_result_time; // 上一个
                }
            }

            // 上一次
            if (the_last_search_start_time) {

                if (the_item_start_time <= the_last_search_start_time) {
                    continue;
                }
            }

            // time
            if (the_search_time !== '' && !the_last_search_start_time) {
                let the_now_search_start_time = Date.now() - (the_search_time * 60 * 1000); // 计算几分钟前的时间戳

                if ((the_item_start_time > the_now_search_start_time) && the_search_time > 0) {
                    continue;
                } else {
                    if (the_search_user_name === '' && the_search_content === '') {
                        the_default_result = the_sc_item;
                        sc_list_search_result_time = the_item_start_time;
                    }
                }
            }

            // user
            let the_item_user_name = the_sc_item.querySelector('.sc_font_color').textContent;

            // content
            let the_item_content = the_sc_item.querySelector('.sc_msg_body span').textContent;

            let the_search_user_name_condition = true;
            let the_search_user_name_condition_in = true;
            let the_search_user_name_condition_out = true;
            let the_search_content_condition = true;

            if (the_search_user_name) {
                the_search_user_name_condition = the_item_user_name === the_search_user_name; // 精准
                the_search_user_name_condition_in = the_item_user_name.toLowerCase().includes(the_search_user_name.toLowerCase()); // 模糊
                the_search_user_name_condition_out = the_search_user_name.toLowerCase().includes(the_item_user_name.toLowerCase()); // 模糊
            }

            if (the_search_content) {
                the_search_content_condition = the_item_content.toLowerCase().includes(the_search_content.toLowerCase()); // 模糊
            }

            // 昵称精准匹配优先级最高
            if (the_search_user_name_condition && the_search_content_condition) {
                sc_list_search_result_time = the_item_start_time;

                return the_sc_item;
            } else if (the_search_user_name && the_search_user_name_condition_in && the_search_content_condition) {
                sc_list_search_result_time = the_item_start_time;

                return the_sc_item;
            } else if (the_search_user_name && the_search_user_name_condition_out && the_search_content_condition) {
                sc_list_search_result_time = the_item_start_time;

                return the_sc_item;
            } else {
                continue;
            }

        }

        if (!the_default_result && the_search_first_flag) {
            sc_list_search_result_time = 0;
        }

        if (!the_default_result && sc_list_search_result_time) {
            the_default_result = document.querySelector(list_class_name + '[data-start="' + sc_list_search_result_time + '"]');
        }

        return the_default_result;
    }

    // 同步特定用户提示的设置
    function sycn_live_special_tip_config() {
        sc_config_get_live_special_tip_location();
        sc_config_get_live_special_tip_str();
        sc_live_special_tip_str_to_arr();
        sc_config_get_live_special_msg_flag();
        sc_config_get_live_special_sc_flag();
        sc_config_get_live_special_danmu_mode();
        sc_config_get_live_special_sc_no_remain_flag();
    }

    // 同步SC以弹幕展现的设置
    function sycn_live_sc_to_danmu_show_config() {
        sc_config_get_live_sc_to_danmu_show_flag();
        sc_config_get_live_sc_to_danmu_show_location();
        sc_config_get_live_sc_to_danmu_show_mode();
        sc_config_get_live_sc_to_danmu_no_remain_flag();
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
        sc_copy_modal.style.zIndex = 6666;

        if (mode === 0) {
            sc_copy_modal.style.width = '30px';
            sc_copy_modal.style.height = '30px';
            sc_copy_modal.style.lineHeight = '30px';
            sc_copy_modal.style.borderRadius = '50%';
            sc_copy_modal.style.left = e.clientX + 10 + 'px';
            sc_copy_modal.style.top = e.clientY - 10 + 'px';
        } else if(mode === 1) {
            sc_copy_modal.style.borderRadius = '10px';
            sc_copy_modal.style.padding = '10px';
            sc_copy_modal.style.left = e.target.getBoundingClientRect().left + 10 + 'px';
            sc_copy_modal.style.top = e.target.getBoundingClientRect().top - 30 + 'px';
        } else {
            sc_copy_modal.style.borderRadius = '10px';
            sc_copy_modal.style.padding = '10px';
            sc_copy_modal.style.left = unsafeWindow.innerWidth / 2 + 'px';
            sc_copy_modal.style.top = unsafeWindow.innerHeight / 2 + 'px';
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
        let the_atn_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_atn_sc_rectangle_width = sc_rectangle_width;
        let the_atn_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_atn_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_atn_sc_rectangle_width = sc_rectangle_width_fullscreen;
            the_atn_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }

        if (the_atn_sc_panel_fold_mode === 1) {
            sc_side_fold_custom_auto_run_flag = true;

            let auto_target_oj = $(document).find('.' + sc_side_fold_custom_each_same_time_class);

            if (auto_target_oj.length === 0) { sc_side_fold_custom_auto_run_flag = false; return; }

            if (sc_side_fold_custom_stop_from_auto_flag) {
                let auto_target_oj_next = auto_target_oj.prev();
                if (sc_item_order_up_flag) {
                    auto_target_oj_next = auto_target_oj.next();
                }

                if (auto_target_oj_next.length) {
                    auto_target_oj = auto_target_oj_next;
                    sc_side_fold_custom_each_same_time_class = auto_target_oj.attr('class').split(' ').find((scClassName) => { return scClassName !== 'sc_long_item'; });
                }
            }

            auto_target_oj.css('position', 'absolute');
            auto_target_oj.css('top', '0px'); // 第一个SC的位置
            auto_target_oj.css('translateY', '-100%');
            auto_target_oj.css('opacity', 0);
            auto_target_oj.css('z-index', '10');
            auto_target_oj.css('width', (the_atn_sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            auto_target_oj.css('height', '');

            if ((auto_target_oj.offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                if (the_atn_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag) {
                    auto_target_oj.css('left', -(the_atn_sc_rectangle_width - 22 - 72 + 10 + 60)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                } else {
                    auto_target_oj.css('left', -(the_atn_sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                }
            } else {
                if (the_atn_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag) {
                    auto_target_oj.css('left', 70);
                }
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
                let the_sto_sc_panel_fold_mode = sc_panel_fold_mode;
                if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                    the_sto_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                }

                if (sc_side_fold_custom_each_same_time_class && the_sto_sc_panel_fold_mode === 1) {
                    // 下一个SC
                    let prev_target_oj = auto_target_oj.prev();
                    if (sc_item_order_up_flag) {
                        prev_target_oj = auto_target_oj.next();
                    }

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

        let the_tio_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_tio_sc_rectangle_width = sc_rectangle_width;
        let the_tio_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_tio_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_tio_sc_rectangle_width = sc_rectangle_width_fullscreen;
            the_tio_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }

        let target_oj = $(document).find('.' + target_oj_class);

        if (sc_side_fold_custom_each_same_time_flag) {
            sc_auto_trigger_side_fold_out_start(target_oj_class);
        } else {
            target_oj.css('position', 'absolute');
            target_oj.css('top', '0px'); // 第一个SC的位置
            target_oj.css('z-index', '10');
            target_oj.css('width', (the_tio_sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            target_oj.css('height', '');

            if ((target_oj.offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                if (the_tio_sc_panel_fold_mode === 1 && (the_tio_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag)) {
                    target_oj.css('left', -(the_tio_sc_rectangle_width - 22 - 72 + 10 + 60)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                } else {
                    target_oj.css('left', -(the_tio_sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                }
            } else {
                if (the_tio_sc_panel_fold_mode === 1 && (the_tio_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag)) {
                    target_oj.css('left', 70);
                }
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
        let the_cca_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        let the_cca_sc_panel_fold_mode = sc_panel_fold_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_cca_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            the_cca_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        }

        if (the_cca_sc_panel_side_fold_flag) {
            if (sc_side_fold_custom_config === 1) {
                // 第一个SC保持展开
                if (sc_side_fold_custom_first_class && the_cca_sc_panel_fold_mode === 1 && sc_side_fold_custom_first_class !== new_sc_side_fold_custom_first_class && !sc_side_fold_custom_auto_run_flag) {
                    sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                }

                if (new_sc_side_fold_custom_first_class && the_cca_sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(new_sc_side_fold_custom_first_class);
                }
            } else if (sc_side_fold_custom_config === 2) {
                // 第一个SC不保持展开
                if (sc_side_fold_custom_first_class && the_cca_sc_panel_fold_mode === 1 && sc_side_fold_custom_first_class !== new_sc_side_fold_custom_first_class && !sc_side_fold_custom_auto_run_flag) {
                    sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class);
                }
                if (sc_side_fold_custom_first_timeout_id) {
                    clearTimeout(sc_side_fold_custom_first_timeout_id);
                }

                if (new_sc_side_fold_custom_first_class && the_cca_sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(new_sc_side_fold_custom_first_class);
                }

                if (!sc_side_fold_custom_each_same_time_flag) {
                    sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                        if (new_sc_side_fold_custom_first_class && the_cca_sc_panel_fold_mode === 1) {
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

    function sc_fullscreen_separate_memory_var_copy() {
        sc_panel_list_height_fullscreen = sc_panel_list_height;
        sc_rectangle_width_fullscreen = sc_rectangle_width;
        sc_func_btn_mode_fullscreen = sc_func_btn_mode;
        sc_switch_fullscreen = sc_switch;
        sc_panel_fold_mode_fullscreen = sc_panel_fold_mode;
        sc_panel_side_fold_simple_fullscreen = sc_panel_side_fold_simple;
        sc_panel_drag_left_fullscreen = sc_panel_drag_left;
        sc_panel_drag_top_fullscreen = sc_panel_drag_top;
        sc_panel_side_fold_flag_fullscreen = sc_panel_side_fold_flag;
        sc_data_show_high_energy_num_flag_fullscreen = sc_data_show_high_energy_num_flag;
    }

    function sc_live_panel_width_change(new_width) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_rectangle_width_fullscreen = new_width;
        } else {
            sc_rectangle_width = new_width;
        }
    }

    function sc_live_panel_height_change(new_height) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_panel_list_height_fullscreen = new_height;
        } else {
            sc_panel_list_height = new_height;
        }
    }

    function sc_live_panel_fold_mode_change(new_mode) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_panel_fold_mode_fullscreen = new_mode;
        } else {
            sc_panel_fold_mode = new_mode;
        }
    }

    function sc_live_panel_side_fold_flag_change(new_flag) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_panel_side_fold_flag_fullscreen = new_flag;
        } else {
            sc_panel_side_fold_flag = new_flag;
        }
    }

    function sc_live_panel_side_fold_simple_change(new_flag) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_panel_side_fold_simple_fullscreen = new_flag;
        } else {
            sc_panel_side_fold_simple = new_flag;
        }
    }

    function sc_live_data_show_high_energy_num_flag_change(new_flag) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_data_show_high_energy_num_flag_fullscreen = new_flag;
        } else {
            sc_data_show_high_energy_num_flag = new_flag;
        }
    }

    function sc_live_drag_location_change(new_left_val, new_top_val) {
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            sc_panel_drag_left_fullscreen = new_left_val;
            sc_panel_drag_top_fullscreen = new_top_val;
        } else {
            sc_panel_drag_left = new_left_val;
            sc_panel_drag_top = new_top_val;
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
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_memory_config['sc_panel_drag_left_fullscreen'] = config_item_val[0] ?? -1;
                sc_memory_config['sc_panel_drag_top_fullscreen'] = config_item_val[1] ?? -1;

                if (config_item_val[0] >= 0) {
                    sc_panel_drag_left_fullscreen_percent = (config_item_val[0] / unsafeWindow.top.document.documentElement.clientWidth).toFixed(7);
                    sc_memory_config['sc_panel_drag_left_fullscreen_percent'] = sc_panel_drag_left_fullscreen_percent;
                }
                if (config_item_val[1] >= 0) {
                    sc_panel_drag_top_fullscreen_percent = (config_item_val[1] / unsafeWindow.top.document.documentElement.clientHeight).toFixed(7);
                    sc_memory_config['sc_panel_drag_top_fullscreen_percent'] = sc_panel_drag_top_fullscreen_percent;
                }
            } else {
                sc_memory_config['sc_panel_drag_left'] = config_item_val[0] ?? -1;
                sc_memory_config['sc_panel_drag_top'] = config_item_val[1] ?? -1;

                if (config_item_val[0] >= 0) {
                    sc_panel_drag_left_percent = (config_item_val[0] / unsafeWindow.top.document.documentElement.clientWidth).toFixed(7);
                    sc_memory_config['sc_panel_drag_left_percent'] = sc_panel_drag_left_percent;
                }
                if (config_item_val[1] >= 0) {
                    sc_panel_drag_top_percent = (config_item_val[1] / unsafeWindow.top.document.documentElement.clientHeight).toFixed(7);
                    sc_memory_config['sc_panel_drag_top_percent'] = sc_panel_drag_top_percent;
                }

            }
        } else {
            sc_memory_config[config_item_name] = config_item_val;

            // drag 分辨率适配相关
            if (config_item_name === 'sc_panel_drag_left' && config_item_val >= 0) {
                sc_panel_drag_left_percent = (config_item_val / unsafeWindow.top.document.documentElement.clientWidth).toFixed(7);
                sc_memory_config['sc_panel_drag_left_percent'] = sc_panel_drag_left_percent;
            }

            if (config_item_name === 'sc_panel_drag_left_fullscreen' && config_item_val >= 0) {
                sc_panel_drag_left_fullscreen_percent = (config_item_val / unsafeWindow.top.document.documentElement.clientWidth).toFixed(7);
                sc_memory_config['sc_panel_drag_left_fullscreen_percent'] = sc_panel_drag_left_fullscreen_percent;
            }

            if (config_item_name === 'sc_panel_drag_top' && config_item_val >= 0) {
                sc_panel_drag_top_percent = (config_item_val / unsafeWindow.top.document.documentElement.clientHeight).toFixed(7);
                sc_memory_config['sc_panel_drag_top_percent'] = sc_panel_drag_top_percent;
            }

            if (config_item_name === 'sc_panel_drag_top_fullscreen' && config_item_val >= 0) {
                sc_panel_drag_top_fullscreen_percent = (config_item_val / unsafeWindow.top.document.documentElement.clientHeight).toFixed(7);
                sc_memory_config['sc_panel_drag_top_fullscreen_percent'] = sc_panel_drag_top_fullscreen_percent;
            }
        }

        unsafeWindow.localStorage.setItem(sc_memory_config_key, JSON.stringify(sc_memory_config));
    }

    function sc_switch_store() {
        if (sc_memory === 1) {
            // 题记
            unsafeWindow.localStorage.setItem('live_sc_switch_record_fullscreen', sc_switch_fullscreen);
            unsafeWindow.localStorage.setItem('live_sc_switch_record', sc_switch);
        } else if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_switch', sc_switch, 'self');
            update_sc_memory_config('sc_switch_fullscreen', sc_switch_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_switch', sc_switch, 'all');
            update_sc_memory_config('sc_switch_fullscreen', sc_switch_fullscreen, 'all');
        }
    }

    function sc_fold_mode_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_fold_mode', sc_panel_fold_mode, 'self');
            update_sc_memory_config('sc_panel_fold_mode_fullscreen', sc_panel_fold_mode_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_fold_mode', sc_panel_fold_mode, 'all');
            update_sc_memory_config('sc_panel_fold_mode_fullscreen', sc_panel_fold_mode_fullscreen, 'all');
        }
    }

    function sc_panel_side_fold_flag_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_side_fold_flag', sc_panel_side_fold_flag, 'self');
            update_sc_memory_config('sc_panel_side_fold_flag_fullscreen', sc_panel_side_fold_flag_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_side_fold_flag', sc_panel_side_fold_flag, 'all');
            update_sc_memory_config('sc_panel_side_fold_flag_fullscreen', sc_panel_side_fold_flag_fullscreen, 'all');
        }
    }

    function sc_side_fold_simple_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_side_fold_simple', sc_panel_side_fold_simple, 'self');
            update_sc_memory_config('sc_panel_side_fold_simple_fullscreen', sc_panel_side_fold_simple_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_side_fold_simple', sc_panel_side_fold_simple, 'all');
            update_sc_memory_config('sc_panel_side_fold_simple_fullscreen', sc_panel_side_fold_simple_fullscreen, 'all');
        }
    }

    function sc_panel_drag_store(sc_panel_drag_left_val, sc_panel_drag_top_val) {
        let the_pds_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_pds_sc_rectangle_width = sc_rectangle_width;
        let the_pds_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_pds_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_pds_sc_rectangle_width = sc_rectangle_width_fullscreen;
            the_pds_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }

        if (sc_panel_drag_left_val <= 0) {
            sc_panel_drag_left_val = 0;
        }
        if (sc_panel_drag_top_val <= 0) {
            sc_panel_drag_top_val = 0;
        }
        if (sc_panel_drag_left_val >= unsafeWindow.innerWidth) {
            if (the_pds_sc_panel_fold_mode === 1) {
                sc_panel_drag_left_val = unsafeWindow.innerWidth - 72;
            } else {
                sc_panel_drag_left_val = unsafeWindow.innerWidth - the_pds_sc_rectangle_width;
            }
        }
        if (sc_panel_drag_top_val >= unsafeWindow.innerHeight) {
            sc_panel_drag_top_val = unsafeWindow.innerHeight - the_pds_sc_panel_list_height;
        }

        sc_live_drag_location_change(sc_panel_drag_left_val, sc_panel_drag_top_val);

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
            update_sc_memory_config('sc_func_btn_mode_fullscreen', sc_func_btn_mode_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_func_btn_mode', sc_func_btn_mode, 'all');
            update_sc_memory_config('sc_func_btn_mode_fullscreen', sc_func_btn_mode_fullscreen, 'all');
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

    function sc_start_time_simple_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_start_time_simple_flag', sc_start_time_simple_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_start_time_simple_flag', sc_start_time_simple_flag, 'all');
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
            update_sc_memory_config('sc_rectangle_width_fullscreen', sc_rectangle_width_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_rectangle_width', sc_rectangle_width, 'all');
            update_sc_memory_config('sc_rectangle_width_fullscreen', sc_rectangle_width_fullscreen, 'all');
        }
    }

    function sc_panel_list_height_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_list_height', sc_panel_list_height, 'self');
            update_sc_memory_config('sc_panel_list_height_fullscreen', sc_panel_list_height_fullscreen, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_list_height', sc_panel_list_height, 'all');
            update_sc_memory_config('sc_panel_list_height_fullscreen', sc_panel_list_height_fullscreen, 'all');
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

    function sc_item_order_up_flag_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_item_order_up_flag', sc_item_order_up_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_item_order_up_flag', sc_item_order_up_flag, 'all');
        }
    }

    function sc_fullscreen_separate_memory_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_fullscreen_config_separate_memory_flag', sc_live_fullscreen_config_separate_memory_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_fullscreen_config_separate_memory_flag', sc_live_fullscreen_config_separate_memory_flag, 'all');
        }
    }

    function sc_panel_show_time_mode_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_show_time_mode', sc_panel_show_time_mode, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_show_time_mode', sc_panel_show_time_mode, 'all');
        }
    }

    function sc_panel_show_time_each_same_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_panel_show_time_each_same', sc_panel_show_time_each_same, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_panel_show_time_each_same', sc_panel_show_time_each_same, 'all');
        }
    }

    function sc_live_panel_show_time_click_stop_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_panel_show_time_click_stop_flag', sc_live_panel_show_time_click_stop_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_panel_show_time_click_stop_flag', sc_live_panel_show_time_click_stop_flag, 'all');
        }
    }

    function sc_live_panel_not_show_now_time_sc_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_panel_not_show_now_time_sc_flag', sc_live_panel_not_show_now_time_sc_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_panel_not_show_now_time_sc_flag', sc_live_panel_not_show_now_time_sc_flag, 'all');
        }
    }

    function sc_live_panel_not_show_local_sc_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_panel_not_show_local_sc_flag', sc_live_panel_not_show_local_sc_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_panel_not_show_local_sc_flag', sc_live_panel_not_show_local_sc_flag, 'all');
        }
    }

    function sc_search_shortkey_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_list_search_shortkey_flag', sc_list_search_shortkey_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_list_search_shortkey_flag', sc_list_search_shortkey_flag, 'all');
        }
    }

    function sc_search_div_bg_opacity_range_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_list_search_div_bg_opacity_range', sc_list_search_div_bg_opacity_range, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_list_search_div_bg_opacity_range', sc_list_search_div_bg_opacity_range, 'all');
        }
    }

    function sc_live_auto_tianxuan_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_auto_tianxuan_flag', sc_live_auto_tianxuan_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_auto_tianxuan_flag', sc_live_auto_tianxuan_flag, 'all');
        }
    }

    function sc_live_send_dm_combo_flag_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_live_send_dm_combo_flag', sc_live_send_dm_combo_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_live_send_dm_combo_flag', sc_live_send_dm_combo_flag, 'all');
        }
    }

    // SC搜索上一个
    function sc_live_search_confirm_prev() {
        let the_fullscreen_str = '';
        let the_list_class_name = '.sc_long_item';
        if (sc_isFullscreen) {
            the_fullscreen_str = '_fullscreen';
            the_list_class_name = '#live-player .sc_long_item';
        }

        let the_search_user_name = $(document).find('#sc_live_search_user_name' + the_fullscreen_str).val();
        let the_search_content = $(document).find('#sc_live_search_content' + the_fullscreen_str).val();
        let the_search_time = $(document).find('#sc_live_search_time' + the_fullscreen_str).val();

        let the_search_result_div = custom_search_sc_div(the_search_user_name, the_search_content, the_search_time, the_list_class_name, 0);

        if (the_search_result_div) {
            the_search_result_div.scrollIntoView({block: 'center' });

            let the_search_result_div_clone = $(the_search_result_div).clone();
            let the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }
            if (the_copy_sc_panel_side_fold_flag) {
                sc_side_fold_out_one(the_search_result_div_clone);
            }

            the_search_result_div_clone.css('width', '100%');
            the_search_result_div_clone.css('height', 'auto');
            the_search_result_div_clone.css('animation', 'unset');
            the_search_result_div_clone.show();
            the_search_result_div_clone.find('.sc_font_color').css('color', '#000000');
            the_search_result_div_clone.find('.sc_start_time').show();
            the_search_result_div_clone.find('.sc_msg_head_left').css('text-align', 'left');
            the_search_result_div_clone.find('.sc_msg_head').removeClass('sc_msg_head');

            let the_search_result_div_clone_msg_body = the_search_result_div_clone.find('.sc_msg_body');
            the_search_result_div_clone_msg_body.css('padding', '10px');
            if (!the_search_result_div_clone_msg_body.is(":visible")) {
                the_search_result_div_clone.css('border-radius', '8px 8px 6px 6px');
                the_search_result_div_clone_msg_body.prev().css('border-radius', '6px 6px 0px 0px');
                the_search_result_div_clone_msg_body.show();
                the_search_result_div_clone.find('.sc_value_font span').css('color', '#000');
                the_search_result_div_clone.attr('data-fold', '0');
            }

            the_search_result_div_clone.removeClass();

            let the_search_result_div_clone_clone = the_search_result_div_clone.clone();

            $(document).find('.sc_live_search_result_div').html(the_search_result_div_clone);
            $(document).find('.sc_live_search_result_div_fullscreen').html(the_search_result_div_clone_clone);
        } else {
            $(document).find('.sc_live_search_result_div').html('');
            $(document).find('.sc_live_search_result_div_fullscreen').html('');
        }

        if (sc_isFullscreen) {
            $(document).find('#sc_live_search_user_name').val(the_search_user_name);
            $(document).find('#sc_live_search_content').val(the_search_content);
            $(document).find('#sc_live_search_time').val(the_search_time);
        } else {
            $(document).find('#sc_live_search_user_name_fullscreen').val(the_search_user_name);
            $(document).find('#sc_live_search_content_fullscreen').val(the_search_content);
            $(document).find('#sc_live_search_time_fullscreen').val(the_search_time);
        }
    }

    // SC搜索下一个
    function sc_live_search_confirm_next() {
        let the_fullscreen_str = '';
        let the_list_class_name = '.sc_long_item';
        if (sc_isFullscreen) {
            the_fullscreen_str = '_fullscreen';
            the_list_class_name = '#live-player .sc_long_item';
        }

        let the_search_user_name = $(document).find('#sc_live_search_user_name' + the_fullscreen_str).val();
        let the_search_content = $(document).find('#sc_live_search_content' + the_fullscreen_str).val();
        let the_search_time = $(document).find('#sc_live_search_time' + the_fullscreen_str).val();

        let the_search_result_div = custom_search_sc_div(the_search_user_name, the_search_content, the_search_time, the_list_class_name, 1);

        if (the_search_result_div) {
            the_search_result_div.scrollIntoView({block: 'center' });

            let the_search_result_div_clone = $(the_search_result_div).clone();
            let the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }
            if (the_copy_sc_panel_side_fold_flag) {
                sc_side_fold_out_one(the_search_result_div_clone);
            }

            the_search_result_div_clone.css('width', '100%');
            the_search_result_div_clone.css('height', 'auto');
            the_search_result_div_clone.css('animation', 'unset');
            the_search_result_div_clone.show();
            the_search_result_div_clone.find('.sc_font_color').css('color', '#000000');
            the_search_result_div_clone.find('.sc_start_time').show();
            the_search_result_div_clone.find('.sc_msg_head_left').css('text-align', 'left');
            the_search_result_div_clone.find('.sc_msg_head').removeClass('sc_msg_head');

            let the_search_result_div_clone_msg_body = the_search_result_div_clone.find('.sc_msg_body');
            the_search_result_div_clone_msg_body.css('padding', '10px');
            if (!the_search_result_div_clone_msg_body.is(":visible")) {
                the_search_result_div_clone.css('border-radius', '8px 8px 6px 6px');
                the_search_result_div_clone_msg_body.prev().css('border-radius', '6px 6px 0px 0px');
                the_search_result_div_clone_msg_body.show();
                the_search_result_div_clone.find('.sc_value_font span').css('color', '#000');
                the_search_result_div_clone.attr('data-fold', '0');
            }

            the_search_result_div_clone.removeClass();

            let the_search_result_div_clone_clone = the_search_result_div_clone.clone();

            $(document).find('.sc_live_search_result_div').html(the_search_result_div_clone);
            $(document).find('.sc_live_search_result_div_fullscreen').html(the_search_result_div_clone_clone);
        } else {
            $(document).find('.sc_live_search_result_div').html('');
            $(document).find('.sc_live_search_result_div_fullscreen').html('');
        }

        if (sc_isFullscreen) {
            $(document).find('#sc_live_search_user_name').val(the_search_user_name);
            $(document).find('#sc_live_search_content').val(the_search_content);
            $(document).find('#sc_live_search_time').val(the_search_time);
        } else {
            $(document).find('#sc_live_search_user_name_fullscreen').val(the_search_user_name);
            $(document).find('#sc_live_search_content_fullscreen').val(the_search_content);
            $(document).find('#sc_live_search_time_fullscreen').val(the_search_time);
        }
    }

    // 将ctrl+f替换为SC搜索框打开快捷键
    function sc_search_shortkey_ctrlf(e) {
        e = e || unsafeWindow.event;

        if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();

            let sc_live_search_config_div_id = 'sc_live_search_config_div';
            if (sc_isFullscreen) {
                sc_live_search_config_div_id = 'sc_live_search_config_div_fullscreen';
            }
            let the_sc_live_search_modal_div = $(document).find('#' + sc_live_search_config_div_id);
            if (the_sc_live_search_modal_div.is(':visible')) {
                the_sc_live_search_modal_div.hide();
            } else {
                the_sc_live_search_modal_div.show();
            }

        } else if (e.ctrlKey && e.key === 'ArrowLeft') {
            e.preventDefault();

            sc_live_search_confirm_prev();
        } else if (e.ctrlKey && e.key === 'ArrowRight') {
            e.preventDefault();

            sc_live_search_confirm_next();
        } else if (e.ctrlKey && e.key === 'ArrowUp') {
            e.preventDefault();

            sc_live_search_confirm_prev();
        } else if (e.ctrlKey && e.key === 'ArrowDown') {
            e.preventDefault();

            sc_live_search_confirm_next();
        }
    }

    function sc_search_shortkey_flag_config_apply() {
        if (sc_list_search_shortkey_flag) {
            $(document).off('keydown', sc_search_shortkey_ctrlf);

            $(document).on('keydown', sc_search_shortkey_ctrlf);
        } else {
            $(document).off('keydown', sc_search_shortkey_ctrlf);
        }
    }

    function sc_live_special_tip_location_store() {
        unsafeWindow.localStorage.setItem('live_sc_special_tip_location', sc_live_special_tip_location);
    }

    function sc_live_special_tip_str_store() {
        unsafeWindow.localStorage.setItem('live_sc_special_tip_str', sc_live_special_tip_str);
    }

    function sc_live_special_msg_flag_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_special_msg_flag', sc_live_special_msg_flag);
    }

    function sc_live_special_sc_flag_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_special_sc_flag', sc_live_special_sc_flag);
    }

    function sc_live_special_danmu_mode_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_special_danmu_mode', sc_live_special_danmu_mode);
    }

    function sc_live_sc_to_danmu_show_flag_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_to_danmu_show_flag', sc_live_sc_to_danmu_show_flag);
    }

    function sc_live_sc_to_danmu_show_location_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_to_danmu_show_location', sc_live_sc_to_danmu_show_location);
    }

    function sc_live_sc_to_danmu_show_mode_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_to_danmu_show_mode', sc_live_sc_to_danmu_show_mode);
    }

    function sc_live_special_sc_no_remain_flag_config_store() {
        unsafeWindow.localStorage.setItem('live_special_sc_no_remain_flag', sc_live_special_sc_no_remain_flag);
    }

    function sc_live_sc_to_danmu_no_remain_flag_config_store() {
        unsafeWindow.localStorage.setItem('live_sc_to_danmu_no_remain_flag', sc_live_sc_to_danmu_no_remain_flag);
    }

    function sc_live_other_config_store() {
        if (sc_memory === 2) {
            // 个记
            update_sc_memory_config('sc_data_show_high_energy_num_flag', sc_data_show_high_energy_num_flag, 'self');
            update_sc_memory_config('sc_data_show_high_energy_num_flag_fullscreen', sc_data_show_high_energy_num_flag_fullscreen, 'self');
            update_sc_memory_config('sc_side_fold_fullscreen_auto_hide_list_flag', sc_side_fold_fullscreen_auto_hide_list_flag, 'self');
            update_sc_memory_config('sc_live_all_font_size_add', sc_live_all_font_size_add, 'self');
            update_sc_memory_config('sc_live_font_size_only_message_flag', sc_live_font_size_only_message_flag, 'self');
            update_sc_memory_config('sc_live_side_fold_head_border_bg_opacity_flag', sc_live_side_fold_head_border_bg_opacity_flag, 'self');
            update_sc_memory_config('sc_live_item_bg_opacity_val', sc_live_item_bg_opacity_val, 'self');
            update_sc_memory_config('sc_live_item_suspend_bg_opacity_one_flag', sc_live_item_suspend_bg_opacity_one_flag, 'self');
            update_sc_memory_config('sc_live_hide_value_font_flag', sc_live_hide_value_font_flag, 'self');
            update_sc_memory_config('sc_live_hide_diff_time_flag', sc_live_hide_diff_time_flag, 'self');
        } else if (sc_memory === 3) {
            // 全记
            update_sc_memory_config('sc_data_show_high_energy_num_flag', sc_data_show_high_energy_num_flag, 'all');
            update_sc_memory_config('sc_data_show_high_energy_num_flag_fullscreen', sc_data_show_high_energy_num_flag_fullscreen, 'all');
            update_sc_memory_config('sc_side_fold_fullscreen_auto_hide_list_flag', sc_side_fold_fullscreen_auto_hide_list_flag, 'all');
            update_sc_memory_config('sc_live_all_font_size_add', sc_live_all_font_size_add, 'all');
            update_sc_memory_config('sc_live_font_size_only_message_flag', sc_live_font_size_only_message_flag, 'all');
            update_sc_memory_config('sc_live_side_fold_head_border_bg_opacity_flag', sc_live_side_fold_head_border_bg_opacity_flag, 'all');
            update_sc_memory_config('sc_live_item_bg_opacity_val', sc_live_item_bg_opacity_val, 'all');
            update_sc_memory_config('sc_live_item_suspend_bg_opacity_one_flag', sc_live_item_suspend_bg_opacity_one_flag, 'all');
            update_sc_memory_config('sc_live_hide_value_font_flag', sc_live_hide_value_font_flag, 'all');
            update_sc_memory_config('sc_live_hide_diff_time_flag', sc_live_hide_diff_time_flag, 'all');
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

    function sc_scroll_list_to_bottom() {
        let the_sc_list = $(document).find('.sc_long_list');
        the_sc_list.each(function() {
            $(this).scrollTop($(this)[0].scrollHeight);
        });
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
            $('.' + this_sc_item_dynamic_className).find('.sc_value_font span').css('color', this_sc_item_bg_color);
            $('.' + this_sc_item_dynamic_className).attr('data-fold', '1');
        } else {
            $('.' + this_sc_item_dynamic_className).css('border-radius', '8px 8px 6px 6px');
            this_sc_msg_body.prev().css('border-radius', '6px 6px 0px 0px');
            this_sc_msg_body.slideDown(200);
            $('.' + this_sc_item_dynamic_className).find('.sc_value_font span').css('color', '#000');
            $('.' + this_sc_item_dynamic_className).attr('data-fold', '0');
        }
    }

    // 按钮模式选择
    function sc_btn_mode_apply() {
        let the_bma_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        let the_bma_sc_func_btn_mode = sc_func_btn_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_bma_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            the_bma_sc_func_btn_mode = sc_func_btn_mode_fullscreen;
        }

        if (the_bma_sc_panel_side_fold_flag) {
            if (the_bma_sc_func_btn_mode === 0) {
                // 侧折模式下显示所有的按钮
                sc_menu();
            } else if (the_bma_sc_func_btn_mode === 1) {
                // 侧折模式下隐藏所有的按钮
                $(document).find('.sc_button_item').hide();
            } else if (the_bma_sc_func_btn_mode === 2) {
                // 侧折模式下按钮的极简模式
                $(document).find('.sc_button_item').hide();
                $(document).find('.sc_button_menu').show();
                $(document).find('.sc_button_min').show();
            } else if (the_bma_sc_func_btn_mode === 3) {
                // 侧折模式下只显示折叠按钮
                $(document).find('.sc_button_item').hide();
                $(document).find('.sc_button_min').show();
            } else if (the_bma_sc_func_btn_mode === 4) {
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

    function sc_panel_width_config_apply() {
        let the_pwa_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_pwa_sc_rectangle_width = sc_rectangle_width;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_pwa_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_pwa_sc_rectangle_width = sc_rectangle_width_fullscreen;
        }

        if (the_pwa_sc_panel_fold_mode === 1) {

            if (sc_side_fold_custom_first_class) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
            if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

            if (sc_side_fold_custom_first_class && !sc_live_sc_to_danmu_show_flag) { sc_side_fold_custom_auto_run_flag = false; sc_custom_config_apply(sc_side_fold_custom_first_class); }

        } else if (the_pwa_sc_panel_fold_mode === 2) {
            $(document).find('.sc_long_rectangle').width(the_pwa_sc_rectangle_width);
        }

        $(document).find('.sc_uname_div').width(the_pwa_sc_rectangle_width / 2 + 5);
    }

    function sc_panel_list_height_config_apply() {
        let height_apply_sc_long_list = $(document).find('.sc_long_list');
        let height_apply_sc_long_rectangle = $(document).find('.sc_long_rectangle');

        let the_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }

        if (the_sc_panel_list_height === 0) {
            height_apply_sc_long_rectangle.css('border-top', 'unset');
        } else {
            height_apply_sc_long_rectangle.css('border-top', '10px solid transparent');
        }

        if (the_sc_panel_list_height >= 200) {
            height_apply_sc_long_list.css('min-height', '200px');
            height_apply_sc_long_list.css('max-height', the_sc_panel_list_height + 'px');
        } else {
            height_apply_sc_long_list.css('min-height', the_sc_panel_list_height + 'px');
            height_apply_sc_long_list.css('max-height', the_sc_panel_list_height + 'px');
        }
    }

    function sc_panel_list_no_remember_hide() {
        sc_side_fold_hide_list_ing_flag = true;

        let the_plh_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_plh_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_plh_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_plh_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }
        sc_live_panel_height_change(0);

        let func_btn_sc_long_list = $(document).find('.sc_long_list');
        func_btn_sc_long_list.attr('data-height', the_plh_sc_panel_list_height);
        sc_panel_list_height_config_apply();

        if (sc_side_fold_custom_first_class && the_plh_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && the_plh_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        if (sc_side_fold_custom_first_class && the_plh_sc_panel_fold_mode === 1 && !sc_live_sc_to_danmu_show_flag) { sc_side_fold_custom_auto_run_flag = false; sc_custom_config_apply(sc_side_fold_custom_first_class); }

        sc_live_panel_height_change(the_plh_sc_panel_list_height);
    }

    function sc_panel_list_no_remember_show(btn_click_flag = true) {
        sc_side_fold_hide_list_ing_flag = false;

        let func_btn_sc_long_list = $(document).find('.sc_long_list');
        let old_rect_height = func_btn_sc_long_list.attr('data-height');

        let the_pls_sc_panel_list_height = sc_panel_list_height;
        let the_pls_sc_panel_fold_mode = sc_panel_fold_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag && btn_click_flag) {
            the_pls_sc_panel_list_height = sc_panel_list_height_fullscreen;
            the_pls_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        }

        if (old_rect_height !== undefined && old_rect_height !== 0 && btn_click_flag) {
            sc_live_panel_height_change(parseInt(old_rect_height, 10));
        }
        if (the_pls_sc_panel_list_height === 0 && btn_click_flag) {
            sc_live_panel_height_change(400);
        }

        sc_panel_list_height_config_apply();

        if (btn_click_flag) {
            $(document).find('.sc_long_item').show();
        }

        if (sc_side_fold_custom_first_class && the_pls_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && the_pls_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        if (sc_side_fold_custom_first_class && the_pls_sc_panel_fold_mode === 1 && !sc_live_sc_to_danmu_show_flag) { sc_side_fold_custom_auto_run_flag = false; sc_custom_config_apply(sc_side_fold_custom_first_class); }
    }

    // 数据显示模块设置
    function sc_live_other_config_data_show_apply() {
        let the_loa_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag;

        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_loa_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag_fullscreen;
        }

        if (the_loa_sc_data_show_high_energy_num_flag) {
            // 记录板的
            $(document).find('.sc_high_energy_num_left').text('高能：');
            $(document).find('.sc_high_energy_num_right').text(high_energy_num);
            if (high_energy_contribute_num === 0) {
                $(document).find('.sc_data_show_label').attr('title', '');
            } else {
                $(document).find('.sc_data_show_label').attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');
            }

            // 页面的
            if (data_show_bottom_flag) {
                const sc_loa_data_show_bottom_rank_num_div = $(document).find('#sc_data_show_bottom_rank_num');
                if (sc_loa_data_show_bottom_rank_num_div.length) {
                    const sc_loa_urc_data_show_bottom_div = $(document).find('#sc_data_show_bottom_div');
                    sc_loa_data_show_bottom_rank_num_div.text('高能：'+ high_energy_num);
                    if (high_energy_contribute_num === 0) {
                        sc_loa_urc_data_show_bottom_div.attr('title', '');
                    } else {
                        sc_loa_urc_data_show_bottom_div.attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');
                    }
                }
            }
        } else {
            // 记录板的
            if (high_energy_contribute_num === 0) {
                $(document).find('.sc_high_energy_num_left').text('高能：');
                $(document).find('.sc_high_energy_num_right').text(high_energy_num);
                $(document).find('.sc_data_show_label').attr('title', '');
            } else {
                $(document).find('.sc_high_energy_num_left').text('同接：');
                $(document).find('.sc_high_energy_num_right').text(high_energy_contribute_num);
                $(document).find('.sc_data_show_label').attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');
            }

            // 页面的
            if (data_show_bottom_flag) {
                const sc_loa_data_show_bottom_rank_num_div = $(document).find('#sc_data_show_bottom_rank_num');
                if (sc_loa_data_show_bottom_rank_num_div.length) {
                    const sc_loa_urc_data_show_bottom_div = $(document).find('#sc_data_show_bottom_div');
                    if (high_energy_contribute_num === 0) {
                        sc_loa_data_show_bottom_rank_num_div.text('高能：'+ high_energy_num);
                        sc_loa_urc_data_show_bottom_div.attr('title', '');
                    } else {
                        sc_loa_data_show_bottom_rank_num_div.text('同接：'+ high_energy_contribute_num);
                        sc_loa_urc_data_show_bottom_div.attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');
                    }
                }
            }
        }
    }

    function sc_live_fullscreen_config_all_store() {
        sc_switch_store();
        sc_fold_mode_store();
        sc_panel_side_fold_flag_store();
        sc_side_fold_simple_store();
        sc_func_btn_mode_store();
        sc_rectangle_width_store();
        sc_panel_list_height_store();
        sc_fullscreen_separate_memory_config_store();
        sc_live_other_config_store();

        if (sc_panel_drag_left_fullscreen === -1 && sc_panel_drag_top_fullscreen === -1) {
            const rect_circle = $(document).find('.sc_long_circle')[0].getBoundingClientRect();
            if (rect_circle.width === 0 && rect_circle.height === 0) {
                const rect_rectangle = $(document).find('.sc_long_rectangle')[0].getBoundingClientRect();
                sc_panel_drag_store(rect_rectangle.left, rect_rectangle.top);
            } else {
                sc_panel_drag_store(rect_circle.left, rect_circle.top);
            }
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
        sc_data_show.css('margin-bottom', '5px');
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

        let the_sf_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
        let the_sf_sc_panel_list_height = sc_panel_list_height;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_sf_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
            the_sf_sc_panel_list_height = sc_panel_list_height_fullscreen;
        }

        if (the_sf_sc_panel_side_fold_simple) {
            clone_sc_data_show.hide();
        } else {
            sc_long_rectangle.css('border-bottom', 'unset');
        }
        sc_long_rectangle.append(clone_sc_data_show);
        sc_long_rectangle.append(clone_sc_long_buttons);
        sc_data_show.remove();
        sc_long_buttons.remove();

        sc_side_fold_in_all();

        sc_live_panel_side_fold_flag_change(true);

        if (flag) {
            if (unsafeWindow.innerHeight - sc_long_rectangle.position().top < the_sf_sc_panel_list_height + 280) {
                sc_long_rectangle.each(function() {
                    $(this).css('top', unsafeWindow.innerHeight - the_sf_sc_panel_list_height - 280);
                });
            }

            sc_live_panel_fold_mode_change(1);

            sc_fold_mode_store();
            sc_panel_side_fold_flag_store();

            if (sc_item_order_up_flag) {
                sc_scroll_list_to_bottom();
            }
        }

        sc_btn_mode_apply();

        if (!sc_live_sc_to_danmu_show_flag) {
            sc_side_fold_custom_auto_run_flag = false;

            sc_custom_config_apply(sc_side_fold_custom_first_class);
        }

        if (sc_live_side_fold_head_border_bg_opacity_flag) {
            // head
            $(document).find('.sc_msg_head').each(function() {
                const bg_color = $(this).css('background-color');
                const sc_background_color = change_color_opacity(bg_color, 0);
                $(this).css('background-color', sc_background_color);
            })

            // item
            $(document).find('.sc_long_item').each(function() {
                const bg_color = $(this).css('background-color');
                const sc_background_color = change_color_opacity(bg_color, 0);
                $(this).css('background-color', sc_background_color);
            })
        }
    }

    // 侧折后恢复展开显示板
    function sc_foldback(flag = true) {
        let the_fb_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_fb_sc_rectangle_width = sc_rectangle_width;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag && flag) {
            the_fb_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_fb_sc_rectangle_width = sc_rectangle_width_fullscreen;
        }

        if (sc_side_fold_custom_first_class && the_fb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && the_fb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        $(document).find('.sc_long_rectangle').css('width', the_fb_sc_rectangle_width + 'px');
        $(document).find('.sc_long_list').css('padding-left', '10px');
        $(document).find('.sc_long_item').css('width', 'unset');
        $(document).find('.sc_long_item').css('height', 'unset');
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
        sc_data_show.css('margin-bottom', '10px');
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

        sc_data_show.hide();
        sc_long_buttons.hide();

        let clone_sc_data_show = sc_data_show.last().clone(true);
        let clone_sc_long_buttons = sc_long_buttons.last().clone(true);
        sc_long_rectangle.css('border-bottom', '10px solid transparent');
        sc_long_rectangle.prepend(clone_sc_data_show);
        sc_long_rectangle.prepend(clone_sc_long_buttons);
        sc_data_show.remove();
        sc_long_buttons.remove();

        if (unsafeWindow.innerWidth - sc_long_rectangle.position().left < the_fb_sc_rectangle_width) {
            sc_long_rectangle.each(function() {
                $(this).css('left', unsafeWindow.innerWidth - the_fb_sc_rectangle_width - 15);
            });
        }

        sc_side_fold_out_all();

        if (the_fb_sc_panel_fold_mode === 1 && sc_side_fold_fullscreen_auto_hide_list_flag) {
            sc_panel_list_height_config_apply();
        }

        sc_live_panel_fold_mode_change(2);
        sc_live_panel_side_fold_flag_change(false);

        sc_fold_mode_store();
        sc_panel_side_fold_flag_store();

        sc_menu();

        if (sc_item_order_up_flag) {
            sc_scroll_list_to_bottom();
        }

        let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
        let the_sc_switch = sc_switch;
        if (sc_isFullscreen) {
            the_sc_switch = sc_switch_fullscreen;
        }
        if ((the_sc_switch === 0 || the_sc_switch === 6) && sc_live_item_bg_opacity_val < 0.3) {
            // 主题是白色的时候，为了能够看清内容，调整透明度为0.3
            the_sc_live_item_bg_opacity_val = 0.3;
        }

        // head
        $(document).find('.sc_msg_head').each(function() {
            const bg_color = $(this).css('background-color');
            const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
            $(this).css('background-color', sc_background_color);
        })

        // item
        $(document).find('.sc_long_item').each(function() {
            const bg_color = $(this).css('background-color');
            const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
            $(this).css('background-color', sc_background_color);
        })
    }

    // 折叠显示板
    function sc_minimize(flag = true) {
        let the_min_sc_panel_fold_mode = sc_panel_fold_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag && flag) {
            the_min_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        }

        if (sc_side_fold_custom_first_class && the_min_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
        if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

        if (sc_side_fold_custom_each_same_time_class && the_min_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
        if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

        $(document).find('.sc_long_circle').show();
        $(document).find('.sc_long_rectangle').hide();
        $(document).find('.sc_long_buttons').hide(); // 优化回弹问题

        sc_live_panel_fold_mode_change(0);

        sc_fold_mode_store();

        if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(); }
    }

    // 切换主题
    function sc_switch_css(flag = false) {
        if (flag) {
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_switch_fullscreen++;
            } else {
                sc_switch++;
            }

            // 记录主题
            sc_switch_store();
        }

        let sc_rectangle = $(document).find('.sc_long_rectangle');
        let sc_item = $(document).find('.sc_long_item');
        let sc_list = $(document).find('.sc_long_list');
        let sc_data_show = $(document).find('.sc_data_show');
        let sc_button_item = $(document).find('.sc_button_item');

        let the_theme_sc_switch = sc_switch;
        let the_theme_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_theme_sc_switch = sc_switch_fullscreen;
            the_theme_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
        }

        let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
        if ((the_theme_sc_switch === 0 || the_theme_sc_switch === 6) && sc_live_item_bg_opacity_val < 0.3) {
            // 主题为白色的时候，为了看清内容，调整透明度为0.3
            the_sc_live_item_bg_opacity_val = 0.3;
        }

        if (sc_live_side_fold_head_border_bg_opacity_flag && the_theme_sc_panel_side_fold_flag) {
            // 侧折模式，并且设置了边框透明
            the_sc_live_item_bg_opacity_val = 0;
        }

        // head
        $(document).find('.sc_msg_head').each(function() {
            const bg_color = $(this).css('background-color');
            const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
            $(this).css('background-color', sc_background_color);
        })

        // item
        $(document).find('.sc_long_item').each(function() {
            const bg_color = $(this).css('background-color');
            const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
            $(this).css('background-color', sc_background_color);
        })

        if (the_theme_sc_switch === 0) {
            // 白色
            sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
            sc_rectangle.css('box-shadow', '2px 2px 5px black');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 14px 0px 11px');
            } else {
                sc_list.css('padding', '0px 13px 0px 10px');
            }
            sc_data_show.css('color', '#000');
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
        } else if(the_theme_sc_switch === 1) {
            // 透明
            sc_rectangle.css('background-color', 'rgba(255,255,255,0)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (the_theme_sc_panel_side_fold_flag){
                sc_list.css('padding', '0px 12px 0px 11px');
            } else {
                sc_list.css('padding', '0px 11px 0px 10px');
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
        } else if(the_theme_sc_switch === 2) {
            // 半透明（白0.1）
            sc_rectangle.css('background-color', 'rgba(255,255,255,0.1)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 14px 0px 11px');
            } else {
                sc_list.css('padding', '0px 13px 0px 10px');
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
        } else if(the_theme_sc_switch === 3) {
            // 半透明（白0.5）
            sc_rectangle.css('background-color', 'rgba(255,255,255,0.5)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 14px 0px 11px');
            } else {
                sc_list.css('padding', '0px 13px 0px 10px');
            }
            sc_data_show.css('color', '#000');
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
        } else if(the_theme_sc_switch === 4) {
            // 半透明（黑色0.1）
            sc_rectangle.css('background-color', 'rgba(0,0,0,0.1)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 12px 0px 11px');
            } else {
                sc_list.css('padding', '0px 11px 0px 10px');
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
        } else if(the_theme_sc_switch === 5) {
            // 半透明（黑色0.5）
            sc_rectangle.css('background-color', 'rgba(0,0,0,0.5)');
            sc_rectangle.css('box-shadow', '');
            sc_item.css('box-shadow', '');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 12px 0px 11px');
            } else {
                sc_list.css('padding', '0px 12px 0px 10px');
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
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_switch_fullscreen = 0;
            } else {
                sc_switch = 0;
            }

            sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
            sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
            if (the_theme_sc_panel_side_fold_flag) {
                sc_list.css('padding', '0px 14px 0px 11px');
            } else {
                sc_list.css('padding', '0px 13px 0px 10px');
            }

            sc_data_show.css('color', '#000');
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
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record_fullscreen');
            }
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
            sc_func_btn_mode_store();
            sc_side_fold_custom_config_store();
            sc_rectangle_width_store();
            sc_panel_list_height_store();
            sc_item_order_up_flag_store();
            sc_data_show_bottom_store();
            sc_panel_allow_drag_store();
            sc_welt_hide_circle_half_store();
            sc_start_time_simple_store();
            sc_start_time_show_store();
            sc_live_sidebar_left_flag_store();
            sc_fullscreen_separate_memory_config_store();
            sc_live_other_config_store();
            sc_panel_show_time_mode_config_store();
            sc_panel_show_time_each_same_config_store();
            sc_live_panel_show_time_click_stop_flag_config_store();
            sc_live_panel_not_show_now_time_sc_flag_config_store();
            sc_live_panel_not_show_local_sc_flag_config_store();
            sc_search_shortkey_flag_config_store();
            sc_search_div_bg_opacity_range_config_store();
            sc_live_auto_tianxuan_flag_config_store();
            sc_live_send_dm_combo_flag_config_store();

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
            sc_func_btn_mode_store();
            sc_side_fold_custom_config_store();
            sc_rectangle_width_store();
            sc_panel_list_height_store();
            sc_item_order_up_flag_store();
            sc_data_show_bottom_store();
            sc_panel_allow_drag_store();
            sc_welt_hide_circle_half_store();
            sc_start_time_simple_store();
            sc_start_time_show_store();
            sc_live_sidebar_left_flag_store();
            sc_fullscreen_separate_memory_config_store();
            sc_live_other_config_store();
            sc_panel_show_time_mode_config_store();
            sc_panel_show_time_each_same_config_store();
            sc_live_panel_show_time_click_stop_flag_config_store();
            sc_live_panel_not_show_now_time_sc_flag_config_store();
            sc_live_panel_not_show_local_sc_flag_config_store();
            sc_search_shortkey_flag_config_store();
            sc_search_div_bg_opacity_range_config_store();
            sc_live_auto_tianxuan_flag_config_store();
            sc_live_send_dm_combo_flag_config_store();

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

        let the_ms_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_ms_sc_panel_drag_left = sc_panel_drag_left;
        let the_ms_sc_panel_drag_top = sc_panel_drag_top;
        let the_ms_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
        let the_ms_sc_panel_side_fold_flag = sc_panel_side_fold_flag;

        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_ms_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_ms_sc_panel_drag_left = sc_panel_drag_left_fullscreen;
            the_ms_sc_panel_drag_top = sc_panel_drag_top_fullscreen;
            the_ms_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
            the_ms_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
        }

        if (the_ms_sc_panel_fold_mode) {
            sc_circles.each(function() {
                if (the_ms_sc_panel_drag_left >= 0) {
                    $(this).css('left', the_ms_sc_panel_drag_left + 'px');
                }

                if (the_ms_sc_panel_drag_top >= 0) {
                    $(this).css('top', the_ms_sc_panel_drag_top + 'px');
                }

                $(this).hide();
            });

            sc_rectangles.each(function() {
                if (the_ms_sc_panel_drag_left >= 0) {
                    $(this).css('left', the_ms_sc_panel_drag_left + 'px');
                }

                if (the_ms_sc_panel_drag_top >= 0) {
                    $(this).css('top', the_ms_sc_panel_drag_top + 'px');
                }

                if (the_ms_sc_panel_fold_mode === 1 && !the_ms_sc_panel_side_fold_simple) {
                    $(document).find('.sc_data_show').show();
                }

                $(this).slideDown(500);
            });

            if (the_ms_sc_panel_fold_mode === 1) { sc_sidefold(false); sc_btn_mode_apply(); }
        } else {

            if (the_ms_sc_panel_side_fold_flag) { sc_sidefold(false); sc_btn_mode_apply(); }

            sc_circles.each(function() {
                if (the_ms_sc_panel_drag_left >= 0) {
                    $(this).css('left', the_ms_sc_panel_drag_left + 'px');
                }

                if (the_ms_sc_panel_drag_top >= 0) {
                    $(this).css('top', the_ms_sc_panel_drag_top + 'px');
                }
            });

            if (sc_welt_hide_circle_half_flag) { sc_circle_welt_hide_half(the_ms_sc_panel_drag_left, the_ms_sc_panel_drag_top); }
        }

        if (sc_live_sidebar_left_flag) { setTimeout(() => { sc_live_sidebar_position_left_apply() }, 1000); }

        sc_search_shortkey_flag_config_apply();
    }

    // 导出
    function sc_export() {
        let sc_localstorage_json_export = unsafeWindow.localStorage.getItem(sc_localstorage_key);
        if (sc_localstorage_json_export === null || sc_localstorage_json_export === 'null' || sc_localstorage_json_export === '[]' || sc_localstorage_json_export === '') {
            return;
        } else {
            const the_sc_export_time_str = getTimestampConversion((new Date()).getTime());
            let sc_localstorage_export = JSON.parse(sc_localstorage_json_export);
            let sc_export_str = '';
            sc_export_str += '本次观看期间的最大同接 / 高能：' + this_view_high_energy_contribute_num_est + ' / ' + this_view_high_energy_num_est + '，对应的时间：' + getTimestampConversion(this_view_high_energy_contribute_num_est_time) + ' / ' + getTimestampConversion(this_view_high_energy_num_est_time) + '\n\n';
            sc_export_str += '导出数据时候的同接/高能：' + high_energy_contribute_num + '/' + high_energy_num + '，对应的时间：' + the_sc_export_time_str + '\n\n';
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
            const sc_export_blob = new Blob([sc_export_str], { type: 'text/plain;charset=utf-8' });

            // 创建一个下载链接
            const sc_export_downloadLink = document.createElement('a');
            sc_export_downloadLink.href = URL.createObjectURL(sc_export_blob);

            // 设置文件名
            sc_export_downloadLink.download = 'B站SC记录_' + sc_live_room_title + '_' + the_sc_export_time_str + '.txt';

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

        let the_sd_sc_panel_fold_mode = sc_panel_fold_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_sd_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        }

        let sc_drag_target_classname = e.target.className;
        if (the_sd_sc_panel_fold_mode === 1 && sc_drag_target_classname !== 'sc_long_list' && sc_drag_target_classname !== 'sc_data_show' && sc_drag_target_classname !== 'sc_long_buttons' && !sc_drag_target_classname.includes('sc_button_item')) {
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

            if (e.clientY <= 0 || e.clientX <= 0 || e.clientY >= unsafeWindow.innerHeight || e.clientX >= unsafeWindow.innerWidth - 5) {
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

        let the_aca_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        let the_aca_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
        let the_aca_sc_func_btn_mode = sc_func_btn_mode;
        let the_aca_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_aca_sc_rectangle_width = sc_rectangle_width;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_aca_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            the_aca_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
            the_aca_sc_func_btn_mode = sc_func_btn_mode_fullscreen;
            the_aca_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            the_aca_sc_rectangle_width = sc_rectangle_width_fullscreen;
        }

        if (the_aca_sc_panel_side_fold_flag) {

            if (click_page_x < sc_rect_left || click_page_x - sc_rect_left > 72
                || click_page_y < sc_rect_top
                || (click_page_y > sc_rect_top && click_page_y - sc_rect_top > $(sc_rectangle_model).outerHeight())) {

                if (animate_flag && the_aca_sc_panel_side_fold_simple) {
                    $(sc_data_model).slideUp(500);
                }

                $(sc_btn_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                });

                if (!the_aca_sc_panel_side_fold_simple) {
                    $(sc_rectangle_model).css('border-bottom', 'unset');
                }
            }

            if (!the_aca_sc_panel_side_fold_simple && the_aca_sc_func_btn_mode === 1) {
                $(sc_rectangle_model).css('border-bottom', 'unset');
            }
        } else if (the_aca_sc_panel_fold_mode == 2) {

            if (click_page_x < sc_rect_left || click_page_x - sc_rect_left > the_aca_sc_rectangle_width
                || click_page_y < sc_rect_top
                || (click_page_y > sc_rect_top && click_page_y - sc_rect_top > $(sc_rectangle_model).outerHeight())) {
                $(sc_data_model).slideUp(500);
                $(sc_btn_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                });
            }
        }
    }

    function update_guard_count(sc_data_guard_count) {
        if (sc_guard_num !== sc_data_guard_count) {
            sc_guard_num = sc_data_guard_count;

            $(document).find('.sc_captain_num_right').text(sc_data_guard_count);

            if (data_show_bottom_flag) {
                const ugc_sc_data_show_bottom_guard_num_div = $(document).find('#sc_data_show_bottom_guard_num');
                if (ugc_sc_data_show_bottom_guard_num_div.length) {
                    ugc_sc_data_show_bottom_guard_num_div.text('舰长：' + sc_data_guard_count);
                }

                // 兼容页面的不会自动更新舰长数的问题
                let ugc_rank_list_ctnr_box_li = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (ugc_rank_list_ctnr_box_li.length === 0) {
                    ugc_rank_list_ctnr_box_li = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
                }
                if (ugc_rank_list_ctnr_box_li.length) {
                    const ugc_guard_n = ugc_rank_list_ctnr_box_li.last().text().match(/\d+/) ?? 0;

                    if (sc_data_guard_count !== parseInt(ugc_guard_n, 10)) {
                        ugc_rank_list_ctnr_box_li.last().text('大航海('+ sc_data_guard_count +')');
                    }
                }
            }
        }
    }

    // 返回true-已关注，false-未关注。需要.then()链式调用获取结果
    function sc_get_follow_up_flag() {
        return fetch(sc_follow_api + sc_live_room_up_uid, {
            credentials: 'include'
        }).then(response => {
            return response.json();
        }).then(ret => {
            if (ret.code === 0 && ret.data.attribute !== 0 && ret.data.attribute !== 128) {
                return true;
            } else {
                return false;
            }
        }).catch(error => {
            return false;
        });
    }

    // 自动天选
    function handle_auto_tianxuan(the_sc_follow_up_flag) {
        setTimeout(() => {
            let the_anchor_box_iframe_obj = $('#anchor-guest-box-id iframe').contents();
            if (the_anchor_box_iframe_obj.length === 0) {
                the_anchor_box_iframe_obj = $('.m-nobar__popup-container__popup-content iframe').contents();
            }

            let the_click_btn = the_anchor_box_iframe_obj.find('#app .participation-box .particitation-btn img.btn-name');
            let the_close_btn = the_anchor_box_iframe_obj.find('#app .participation-box .close-btn');

            let sc_anchor_auto_joinTimeout;
            let sc_anchor_auto_closeTimeout;

            if (the_sc_follow_up_flag && the_click_btn.length) {
                clearTimeout(sc_anchor_auto_joinTimeout);
                clearTimeout(sc_anchor_auto_closeTimeout);

                // 延时2s后
                sc_anchor_auto_joinTimeout = setTimeout(() => {

                    the_click_btn.trigger('click');
                    open_and_close_sc_modal('成功自动点击天选 ✓', '#A7C9D3', null, 3);

                }, 2000);

                // 延时2s后
                sc_anchor_auto_closeTimeout = setTimeout(() => {
                    the_close_btn.trigger('click');

                    // 兼容天选关闭按钮失效的情况
                    $('.m-nobar__popup-container').hide();
                }, 2000);
            }
        }, 1000); // 等渲染完成
    }

    // 发送弹幕
    function sc_send_dm_fetch(msg, rnd) {
        return fetch(sc_dm_send_api, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `color=16777215&fontsize=25&mode=1&msg=${msg}&rnd=${rnd}&roomid=${real_room_id}&csrf=${sc_u_frsc}`
        }).then(response => {
            return response.json();
        }).then(ret => {
            if (ret.code === 0) {
                return true;
            } else {
                return false;
            }
        }).catch(error => {
            return false;
        });
    }

    function sc_handle_dm_fetch(the_combo_dm_msg, the_time_rnd) {

        sc_send_dm_fetch(the_combo_dm_msg, the_time_rnd).then(the_dm_send_flag => {
            if (the_dm_send_flag) {
                // 定时、剔除（相同的combo弹幕相隔30秒）
                setTimeout(() => {
                    sc_combo_dm_recent_send_arr = sc_combo_dm_recent_send_arr.filter(dm_item => dm_item !== the_combo_dm_msg);
                    sc_combo_dm_send_fail_arr = sc_combo_dm_send_fail_arr.filter(dm_item => dm_item !== the_combo_dm_msg);
                }, 30 * 1000);

            } else {

                if (sc_combo_dm_send_fail_arr.includes(the_combo_dm_msg)) {
                    // 连续两次发送失败，10s后再给机会
                    setTimeout(() => {
                        sc_combo_dm_recent_send_arr = sc_combo_dm_recent_send_arr.filter(dm_item => dm_item !== the_combo_dm_msg);
                        sc_combo_dm_send_fail_arr = sc_combo_dm_send_fail_arr.filter(dm_item => dm_item !== the_combo_dm_msg);
                    }, 10 * 1000);

                } else {
                    sc_combo_dm_recent_send_arr = sc_combo_dm_recent_send_arr.filter(dm_item => dm_item !== the_combo_dm_msg);
                    sc_combo_dm_send_fail_arr.push(the_combo_dm_msg);
                }
            }
        });
    }

    // 自动跟风发送combo弹幕
    function handle_auto_dm_combo(parsedArr_info) {

        const the_combo_dm_msg = parsedArr_info[1];

        // 因有时候combo弹幕会额外的带 x/×/X数字结尾，故过滤掉
        if (!/[x×X]\d+$/.test(the_combo_dm_msg)) {

            sc_combo_dm_recent_send_arr.push(the_combo_dm_msg);

            const the_time_rnd = parseInt((new Date).getTime() / 1000);

            // 查询关注至少相隔20s（10s好像太少，30s又太多，那就20s吧）
            if (the_time_rnd - sc_auto_dm_send_last_rnd > 20) {

                sc_get_follow_up_flag().then(the_sc_follow_up_flag => {

                    sc_auto_dm_send_last_rnd = the_time_rnd;
                    sc_last_follow_check_flag = the_sc_follow_up_flag;

                    if (the_sc_follow_up_flag) {
                        sc_handle_dm_fetch(the_combo_dm_msg, the_time_rnd);
                    }
                });

            } else {

                if (sc_last_follow_check_flag) {
                    sc_handle_dm_fetch(the_combo_dm_msg, the_time_rnd);
                }
            }
        }
    }

    // danmu_location_val_type-0: 特定的
    // danmu_location_val_type-1: 所有的
    function get_free_danmu_show_index(danmu_location_val_type = 0) {
        let the_sc_live_danmu_location = sc_live_special_tip_location;
        let the_free_danmu_show_index = 0;
        let the_free_danmu_show_flag = false;

        if (danmu_location_val_type === 1) {
            the_sc_live_danmu_location = sc_live_sc_to_danmu_show_location;
        }

        if (the_sc_live_danmu_location === 0) {
            // 顶部
            if (!sc_live_special_danmu_show_index_arr[0]) {
                // 发送
                the_free_danmu_show_index = 0;
                the_free_danmu_show_flag = true;
                sc_live_special_danmu_show_index_arr[0] = 1;
            } else if (!sc_live_special_danmu_show_index_arr[5]) {
                // 发送
                the_free_danmu_show_index = 5;
                the_free_danmu_show_flag = true;
                sc_live_special_danmu_show_index_arr[5] = 1;
            }
        } else if (the_sc_live_danmu_location === 1) {
            // 中间
            let the_rand_middle_danmu_index = sc_live_last_middle_danmu_index;
            if (sc_live_last_middle_danmu_index === 0) {
                the_rand_middle_danmu_index = sc_live_middle_danmu_index_arr[Math.floor(Math.random() * 4)];
            } else {
                the_rand_middle_danmu_index = sc_live_middle_danmu_index_crash_handle_arr[the_rand_middle_danmu_index][0];
            }

            if (!sc_live_special_danmu_show_index_arr[the_rand_middle_danmu_index]) {
                // 发送
                sc_live_last_middle_danmu_index = the_rand_middle_danmu_index;
                sc_live_special_danmu_show_index_arr[the_rand_middle_danmu_index] = 1;
                the_free_danmu_show_index = the_rand_middle_danmu_index;
                the_free_danmu_show_flag = true;
            } else {
                let the_now_middle_danmu_index = 0;
                let the_now_middle_danmu_crash_handle_arr = sc_live_middle_danmu_index_crash_handle_arr[the_rand_middle_danmu_index];
                for(let i = 0; i < the_now_middle_danmu_crash_handle_arr.length; ++i) {
                    if (!sc_live_special_danmu_show_index_arr[the_now_middle_danmu_crash_handle_arr[i]]) {
                        the_now_middle_danmu_index = the_now_middle_danmu_crash_handle_arr[i];
                        break;
                    }
                }
                if (the_now_middle_danmu_index) {
                    // 发送
                    sc_live_last_middle_danmu_index = the_now_middle_danmu_index;
                    sc_live_special_danmu_show_index_arr[the_now_middle_danmu_index] = 1;
                    the_free_danmu_show_index = the_now_middle_danmu_index;
                    the_free_danmu_show_flag = true;
                }
            }
        } else if (the_sc_live_danmu_location === 2) {
            // 底部
            if (!sc_live_special_danmu_show_index_arr[5]) {
                // 发送
                the_free_danmu_show_index = 5;
                the_free_danmu_show_flag = true;
                sc_live_special_danmu_show_index_arr[5] = 1;
            } else if (!sc_live_special_danmu_show_index_arr[0]) {
                // 发送
                the_free_danmu_show_index = 0;
                the_free_danmu_show_flag = true;
                sc_live_special_danmu_show_index_arr[0] = 1;
            }
        }

        return {'the_free_danmu_show_index' : the_free_danmu_show_index, 'the_free_danmu_show_flag' : the_free_danmu_show_flag};
    }

    // 检查弹幕分类数组是否没有自驱动，没有则驱动
    function sc_check_danmu_pause_arr_and_start(exclude_arr_type) {
        if (exclude_arr_type === 'tip') {
            if (sc_live_msg_danmu_show_n < 0 && sc_live_special_msg_danmu_cache_arr.length) {
                handle_special_msg(sc_live_special_msg_danmu_cache_arr.shift());
            }

            if (sc_live_sc_danmu_show_n < 0 && sc_live_sc_to_danmu_cache_arr.length) {
                let the_now_sc_to_danmu_data = sc_live_sc_to_danmu_cache_arr.shift();
                handle_special_sc(the_now_sc_to_danmu_data['sc_data'], the_now_sc_to_danmu_data['all_sc_to_danmu_show_flag']);
            }
        } else if (exclude_arr_type === 'msg') {
            if (sc_live_tip_danmu_show_n < 0 && sc_live_special_tip_danmu_cache_arr.length) {
                handle_special_tip(sc_live_special_tip_danmu_cache_arr.shift());
            }

            if (sc_live_sc_danmu_show_n < 0 && sc_live_sc_to_danmu_cache_arr.length) {
                let the_now_sc_to_danmu_data = sc_live_sc_to_danmu_cache_arr.shift();
                handle_special_sc(the_now_sc_to_danmu_data['sc_data'], the_now_sc_to_danmu_data['all_sc_to_danmu_show_flag']);
            }
        } else if (exclude_arr_type === 'sc') {
            if (sc_live_tip_danmu_show_n < 0 && sc_live_special_tip_danmu_cache_arr.length) {
                handle_special_tip(sc_live_special_tip_danmu_cache_arr.shift());
            }

            if (sc_live_msg_danmu_show_n < 0 && sc_live_special_msg_danmu_cache_arr.length) {
                handle_special_msg(sc_live_special_msg_danmu_cache_arr.shift());
            }
        }
    }

    function handle_special_tip(parseArr_data) {

        if (sc_live_special_tip_uid_arr.includes(parseArr_data?.uid.toString() ?? '0')) {

            let sc_live_the_enter_uid = parseArr_data?.uid.toString() ?? '0';

            if (sc_live_special_tip_await_arr.includes(sc_live_the_enter_uid)) { return; }

            let get_free_danmu_show_arr = get_free_danmu_show_index(0);

            if (get_free_danmu_show_arr['the_free_danmu_show_flag']) {
                sc_live_special_tip_await_arr.push(sc_live_the_enter_uid);
                // 发送
                let sc_special_tip_div_class = 'sc_special_tip_div';
                let sc_special_tip_img_px = '50';
                let sc_special_msg_margin_left = '10';
                let sc_special_sc_msg_font_size = 16;
                if (sc_live_special_danmu_mode === 1) {
                    sc_special_tip_div_class = 'sc_special_tip_div_no_padding';
                    sc_special_tip_img_px = '40';
                    sc_special_msg_margin_left = '5';
                    sc_special_sc_msg_font_size -= 2;
                } else if (sc_live_special_danmu_mode === 2) {
                    sc_special_tip_div_class = 'sc_special_tip_div_no_opaque';
                } else if (sc_live_special_danmu_mode === 3) {
                    sc_special_tip_div_class = 'sc_special_tip_div_no_opaque_no_padding';
                    sc_special_tip_img_px = '40';
                    sc_special_msg_margin_left = '5';
                    sc_special_sc_msg_font_size -= 2;
                }

                let the_original_sc_special_font_size = sc_special_sc_msg_font_size;

                if (sc_live_all_font_size_add > 0) {
                    sc_special_sc_msg_font_size += sc_live_all_font_size_add;
                }

                let sc_special_tip_div_custom_style = 'style="top: 2px"';

                if (get_free_danmu_show_arr['the_free_danmu_show_index'] === 5) {
                    sc_special_tip_div_custom_style = 'style="bottom: 2px"';
                } else {
                    sc_special_tip_div_custom_style = 'style="top: '+ get_free_danmu_show_arr['the_free_danmu_show_index'] * 17 +'%"';
                }

                let sc_special_tip_remark = sc_live_special_tip_remark_arr['"' + sc_live_the_enter_uid + '"'] ?? '';
                let sc_special_tip_remark_html = '';
                if (sc_special_tip_remark && sc_special_tip_remark !== parseArr_data.uname) {
                    sc_special_tip_remark_html = '（' + sc_special_tip_remark + '）';
                }

                let sc_special_tip_div_the_id = sc_live_the_enter_uid + '_' + (new Date()).getTime();

                let sc_special_tip_face = parseArr_data?.uinfo?.base?.face ?? '';

                let sc_special_tip_div = '<div id="'+ sc_special_tip_div_the_id +'"'+ sc_special_tip_div_custom_style + 'class="'+ sc_special_tip_div_class +'">' +
                    '<div style="height: '+ sc_special_tip_img_px +'px;width: '+ sc_special_tip_img_px +'px;"><img style="border-radius: '+ sc_special_tip_img_px +'px;" src="' + sc_special_tip_face + '" height="'+ sc_special_tip_img_px +'" width="'+ sc_special_tip_img_px +'"></div>' +
                    '<div style="margin-left: '+ sc_special_msg_margin_left +'px;margin-right: 50px;"><span class="sc_special_msg_body_span" data-font_size="' + the_original_sc_special_font_size + '" style="font-size: ' + sc_special_sc_msg_font_size + 'px;">' + parseArr_data.uname + sc_special_tip_remark_html + ' 进入直播间</span></div>' +
                    '</div>';

                if (sc_special_tip_remark) {
                    sc_catch_log('['+ getTimestampConversion(parseArr_data.timestamp) +'][用户id]' + sc_live_the_enter_uid + '_[用户名]' + parseArr_data.uname + '_[备注]' + sc_special_tip_remark + '_进入直播间');
                } else {
                    sc_catch_log('['+ getTimestampConversion(parseArr_data.timestamp) +'][用户id]' + sc_live_the_enter_uid + '_[用户名]' + parseArr_data.uname + '_进入直播间');
                }

                $(document).find('#live-player').append(sc_special_tip_div);

                // 发送后定时
                setTimeout(() => {
                    $(document).find('#' + sc_special_tip_div_the_id).remove();
                    sc_live_special_tip_await_arr = sc_live_special_tip_await_arr.filter(item => item !== sc_live_the_enter_uid);
                    sc_live_special_danmu_show_index_arr[get_free_danmu_show_arr['the_free_danmu_show_index']] = 0;

                    // 先检测出其他的分类弹幕是否有-1
                    sc_check_danmu_pause_arr_and_start('tip');

                    if (sc_live_special_tip_danmu_cache_arr.length) {
                        handle_special_tip(sc_live_special_tip_danmu_cache_arr.shift());
                    }
                }, 16000);
            } else {
                // 缓存
                sc_live_special_tip_danmu_cache_arr.push(parseArr_data);

                if (sc_live_tip_danmu_show_n === 0) {
                    sc_live_tip_danmu_show_n = -1;
                }
            }

        }
    }

    function handle_special_msg(parseArr_data_info) {

        if (sc_live_special_tip_uid_arr.includes(parseArr_data_info[0]?.[15]?.["user"]?.["uid"].toString() ?? '0')) {
            let sc_special_user = parseArr_data_info[0]?.[15]?.["user"] ?? '';
            let sc_special_msg = parseArr_data_info[1];
            let sc_sp_msg_ts = parseArr_data_info[9]?.["ts"].toString() ?? (new Date()).getTime() + '';

            let sc_live_the_enter_uid = sc_special_user?.["uid"].toString() ?? '0';

            if (sc_live_special_msg_await_arr.includes(sc_live_the_enter_uid + sc_sp_msg_ts)) { return; }

            let get_free_danmu_show_arr = get_free_danmu_show_index(0);

            if (get_free_danmu_show_arr['the_free_danmu_show_flag']) {
                sc_live_special_msg_await_arr.push(sc_live_the_enter_uid + sc_sp_msg_ts);
                // 发送
                let sc_special_msg_div_class = 'sc_special_tip_div';
                let sc_special_msg_img_px = '50';
                let sc_special_msg_margin_left = '10';
                let sc_special_sc_msg_font_size = 16;
                if (sc_live_special_danmu_mode === 1) {
                    sc_special_msg_div_class = 'sc_special_tip_div_no_padding';
                    sc_special_msg_img_px = '40';
                    sc_special_msg_margin_left = '5';
                    sc_special_sc_msg_font_size -= 2;
                } else if (sc_live_special_danmu_mode === 2) {
                    sc_special_msg_div_class = 'sc_special_tip_div_no_opaque';
                } else if (sc_live_special_danmu_mode === 3) {
                    sc_special_msg_div_class = 'sc_special_tip_div_no_opaque_no_padding';
                    sc_special_msg_img_px = '40';
                    sc_special_msg_margin_left = '5';
                    sc_special_sc_msg_font_size -= 2;
                }

                let the_original_sc_special_font_size = sc_special_sc_msg_font_size;

                if (sc_live_all_font_size_add > 0) {
                    sc_special_sc_msg_font_size += sc_live_all_font_size_add;
                }

                let sc_special_msg_div_custom_style = 'style="top: 2px"';

                if (get_free_danmu_show_arr['the_free_danmu_show_index'] === 5) {
                    sc_special_msg_div_custom_style = 'style="bottom: 2px"';
                } else {
                    sc_special_msg_div_custom_style = 'style="top: '+ get_free_danmu_show_arr['the_free_danmu_show_index'] * 17 +'%"';
                }

                let sc_special_msg_div_the_id = sc_live_the_enter_uid + '_' + (new Date()).getTime();

                let sc_special_msg_face = sc_special_user?.["base"]?.["face"] ?? '';
                let sc_special_msg_uname = sc_special_user?.["base"]?.["name"] ?? '';

                let sc_special_msg_remark = sc_live_special_tip_remark_arr['"' + sc_live_the_enter_uid + '"'] ?? '';
                let sc_special_msg_remark_html = '';
                if (sc_special_msg_remark && sc_special_msg_remark !== sc_special_msg_uname) {
                    sc_special_msg_remark_html = '（' + sc_special_msg_remark + '）';
                }



                let sc_special_msg_div = '<div id="'+ sc_special_msg_div_the_id +'"'+ sc_special_msg_div_custom_style + 'class="'+ sc_special_msg_div_class +'">' +
                    '<div style="height: '+ sc_special_msg_img_px +'px;width: '+ sc_special_msg_img_px +'px;"><img style="border-radius: '+ sc_special_msg_img_px +'px;" src="' + sc_special_msg_face + '" height="'+ sc_special_msg_img_px +'" width="'+ sc_special_msg_img_px +'"></div>' +
                    '<div style="margin-left: '+ sc_special_msg_margin_left +'px;margin-right: 50px;"><span class="sc_special_msg_body_span" data-font_size="' + the_original_sc_special_font_size + '" style="font-size: ' + sc_special_sc_msg_font_size + 'px;">' + sc_special_msg_uname + sc_special_msg_remark_html + '：' + sc_special_msg + '</span></div>' +
                    '</div>';

                if (sc_special_msg_remark) {
                    sc_catch_log('['+ getTimestampConversion(parseInt(sc_sp_msg_ts)) +'][弹幕][用户id]' + sc_live_the_enter_uid + '_[用户名]' + sc_special_msg_uname + '_[备注]' + sc_special_msg_remark + '：' + sc_special_msg);
                } else {
                    sc_catch_log('['+ getTimestampConversion(parseInt(sc_sp_msg_ts)) +'][弹幕][用户id]' + sc_live_the_enter_uid + '_[用户名]' + sc_special_msg_uname + '：' + sc_special_msg);
                }

                $(document).find('#live-player').append(sc_special_msg_div);

                setTimeout(() => {
                    sc_live_special_msg_await_arr = sc_live_special_msg_await_arr.filter(item => item !== (sc_live_the_enter_uid + sc_sp_msg_ts));
                }, 1000);

                setTimeout(() => {
                    sc_live_special_danmu_show_index_arr[get_free_danmu_show_arr['the_free_danmu_show_index']] = 0;

                    // 先检测出其他的分类弹幕是否有-1
                    sc_check_danmu_pause_arr_and_start('msg');

                    if (sc_live_special_msg_danmu_cache_arr.length) {
                        handle_special_msg(sc_live_special_msg_danmu_cache_arr.shift());
                    }
                }, 10000);

                setTimeout(() => {
                    $(document).find('#' + sc_special_msg_div_the_id).remove();
                }, 16000);
            } else {
                // 缓存
                sc_live_special_msg_danmu_cache_arr.push(parseArr_data_info);

                if (sc_live_msg_danmu_show_n === 0) {
                    sc_live_msg_danmu_show_n = -1;
                }
            }
        }
    }

    function handle_special_sc(sc_data, all_sc_to_danmu_show_flag = false, first_time_flag = false) {

        if (all_sc_to_danmu_show_flag || sc_live_special_tip_uid_arr.includes(sc_data["uid"].toString() ?? '0')) {

            let sc_live_the_sc_uid = sc_data["uid"].toString() ?? '0';
            let sc_live_the_sc_id = sc_data["id"].toString() ?? '0';

            if (first_time_flag) {
                if (sc_live_special_sc_await_arr.includes(sc_live_the_sc_uid + sc_live_the_sc_id)) { return; }

                sc_live_special_sc_await_arr.push(sc_live_the_sc_uid + sc_live_the_sc_id);
            }

            let the_sc_live_no_remain_flag = true;
            let the_danmu_location_val_type = 0;
            let the_sc_live_danmu_mode = sc_live_special_danmu_mode;
            if (all_sc_to_danmu_show_flag) {
                the_danmu_location_val_type = 1;
                the_sc_live_danmu_mode = sc_live_sc_to_danmu_show_mode;
                if (!sc_live_sc_to_danmu_no_remain_flag) {
                    the_sc_live_no_remain_flag = false;
                }
            } else {
                if (!sc_live_special_sc_no_remain_flag) {
                    the_sc_live_no_remain_flag = false;
                }
            }

            if (sc_live_sc_danmu_show_n <= 0) {
                let get_free_danmu_show_arr = get_free_danmu_show_index(the_danmu_location_val_type);
                if (get_free_danmu_show_arr['the_free_danmu_show_flag']) {
                    sc_live_sc_danmu_show_n = 1;
                    // 发送
                    let sc_speical_sc_div_class = 'sc_special_tip_div';
                    let sc_special_sc_img_px = '50';
                    let sc_special_sc_msg_margin_left = '10';
                    let sc_special_sc_div_custom_style = ' style="background:linear-gradient(to right, '+ sc_data["background_bottom_color"] +',transparent);';
                    let sc_special_sc_msg_font_size = 16;
                    if (the_sc_live_danmu_mode === 1) {
                        sc_speical_sc_div_class = 'sc_special_tip_div_no_padding';
                        sc_special_sc_img_px = '40';
                        sc_special_sc_msg_margin_left = '5';
                        sc_special_sc_msg_font_size -= 2;
                    } else if (the_sc_live_danmu_mode === 2) {
                        sc_speical_sc_div_class = 'sc_special_tip_div_no_opaque';
                        sc_special_sc_div_custom_style = ' style="background:linear-gradient(to right, '+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +',transparent);';
                    } else if (the_sc_live_danmu_mode === 3) {
                        sc_speical_sc_div_class = 'sc_special_tip_div_no_opaque_no_padding';
                        sc_special_sc_img_px = '40';
                        sc_special_sc_msg_margin_left = '5';
                        sc_special_sc_div_custom_style = ' style="background:linear-gradient(to right, '+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +','+ sc_data["background_bottom_color"] +',transparent);';
                        sc_special_sc_msg_font_size -= 2;
                    }

                    let the_original_sc_special_font_size = sc_special_sc_msg_font_size;

                    if (sc_live_all_font_size_add > 0) {
                        sc_special_sc_msg_font_size += sc_live_all_font_size_add;
                    }

                    if (get_free_danmu_show_arr['the_free_danmu_show_index'] === 0) {
                        sc_special_sc_div_custom_style += 'top: 2px;" ';
                    } else if (get_free_danmu_show_arr['the_free_danmu_show_index'] === 5) {
                        sc_special_sc_div_custom_style += 'bottom: 2px;" ';
                    } else {
                        sc_special_sc_div_custom_style += 'top: '+ get_free_danmu_show_arr['the_free_danmu_show_index'] * 17 +'%;" ';
                    }

                    let sc_special_sc_remark = sc_live_special_tip_remark_arr['"' + sc_live_the_sc_uid + '"'] ?? '';
                    let sc_special_sc_remark_html = '';
                    if (sc_special_sc_remark && sc_special_sc_remark !== sc_data["user_info"]["uname"]) {
                        sc_special_sc_remark_html = '（' + sc_special_sc_remark + '）';
                    }

                    let sc_special_sc_div_the_id = sc_live_the_sc_uid + '_' + (new Date()).getTime();

                    let sc_special_sc_face = sc_data["user_info"]["face"];

                    let sc_special_sc_price = parseInt(sc_data["price"]);
                    let sc_special_sc_no_routine_pric_tip = '';
                    if (!sc_live_sc_routine_price_arr.includes(sc_special_sc_price)) {
                        sc_special_sc_no_routine_pric_tip = '[' + sc_special_sc_price * 10 + ']';
                    }

                    let sc_special_sc_div = '<div id="'+ sc_special_sc_div_the_id +'"'+ sc_special_sc_div_custom_style + 'class="'+ sc_speical_sc_div_class +'">' +
                        '<div style="height: '+ sc_special_sc_img_px +'px;width: '+ sc_special_sc_img_px +'px;"><img style="border-radius: '+ sc_special_sc_img_px +'px;" src="' + sc_special_sc_face + '" height="'+ sc_special_sc_img_px +'" width="'+ sc_special_sc_img_px +'"></div>' +
                        '<div style="margin-left: '+ sc_special_sc_msg_margin_left +'px;margin-right: 50px;"><span class="sc_special_msg_body_span" data-font_size="' + the_original_sc_special_font_size + '" style="font-size: ' + sc_special_sc_msg_font_size + 'px;">[SC]'+ sc_special_sc_no_routine_pric_tip + ' ' + sc_data["user_info"]["uname"] + sc_special_sc_remark_html + '：' + sc_data["message"] + '</span></div>' +
                        '</div>';

                    if (sc_special_sc_remark) {
                        sc_catch_log('['+ getTimestampConversion(sc_data['start_time']) +'][SC][￥'+ sc_special_sc_price +'][用户id]' + sc_live_the_sc_uid + '_[用户名]' + sc_data["user_info"]["uname"] + '_[备注]' + sc_special_sc_remark + '：' + sc_data["message"]);
                    } else {
                        sc_catch_log('['+ getTimestampConversion(sc_data['start_time']) +'][SC][￥'+ sc_special_sc_price +'][用户id]' + sc_live_the_sc_uid + '_[用户名]' + sc_data["user_info"]["uname"] + '：' + sc_data["message"]);
                    }

                    $(document).find('#live-player').append(sc_special_sc_div);

                    let the_sc_special_sc_div_width = $(document).find('#' + sc_special_sc_div_the_id).width();
                    let the_live_player_width = $(document).find('#live-player').width();

                    if (the_sc_live_no_remain_flag) {
                        $(document).find('#' + sc_special_sc_div_the_id).css('animation', 'slideInFromRightToLeftOut 25s linear forwards');
                    } else {
                        if (the_sc_special_sc_div_width > the_live_player_width) {
                            $(document).find('#' + sc_special_sc_div_the_id).css('animation', 'slideInFromRightToLeftOut 25s linear forwards');
                        }
                    }

                    setTimeout(() => {
                        $(document).find('#' + sc_special_sc_div_the_id).remove();
                        sc_live_special_sc_await_arr = sc_live_special_sc_await_arr.filter(item => item !== (sc_live_the_sc_uid + sc_live_the_sc_id));

                        sc_live_special_danmu_show_index_arr[get_free_danmu_show_arr['the_free_danmu_show_index']] = 0;

                        sc_live_sc_danmu_show_n = 0;

                        // 先检测出其他的分类弹幕是否有-1
                        sc_check_danmu_pause_arr_and_start('sc');

                        if (sc_live_sc_to_danmu_cache_arr.length) {
                            let the_now_sc_to_danmu_data = sc_live_sc_to_danmu_cache_arr.shift();
                            handle_special_sc(the_now_sc_to_danmu_data['sc_data'], the_now_sc_to_danmu_data['all_sc_to_danmu_show_flag']);
                        }

                    }, 25000);
                } else {
                    if (first_time_flag) {
                        // 缓存
                        sc_live_sc_to_danmu_cache_arr.push({ 'sc_data': sc_data, 'all_sc_to_danmu_show_flag': all_sc_to_danmu_show_flag});
                    } else {
                        // 回退缓存
                        sc_live_sc_to_danmu_cache_arr.unshift({ 'sc_data': sc_data, 'all_sc_to_danmu_show_flag': all_sc_to_danmu_show_flag});
                    }

                    sc_live_sc_danmu_show_n = -1;
                }
            } else {
                // 缓存
                if (first_time_flag) {
                    sc_live_sc_to_danmu_cache_arr.push({ 'sc_data': sc_data, 'all_sc_to_danmu_show_flag': all_sc_to_danmu_show_flag});
                }
            }
        }
    }

    function update_sc_item(sc_data, realtime = true) {
        let the_usi_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        let the_usi_sc_rectangle_width = sc_rectangle_width;
        let the_usi_sc_panel_fold_mode = sc_panel_fold_mode;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_usi_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            the_usi_sc_rectangle_width = sc_rectangle_width_fullscreen;
            the_usi_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        }

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

        let the_int_sc_start_timestamp = parseInt(sc_start_timestamp, 10);
        if (the_int_sc_start_timestamp === sc_last_item_timestamp) {
            sc_last_item_sort++;
        } else {
            sc_last_item_timestamp = the_int_sc_start_timestamp;
            sc_last_item_sort = 0;
        }

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

        let sc_start_time_all = getTimestampConversion(sc_start_timestamp, false);
        let sc_start_time_simple = getTimestampConversion(sc_start_timestamp, true);
        let [sc_diff_time, the_sc_item_expire_flag] = get_timestamp_diff(sc_start_timestamp, sc_price);

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
        let sc_start_time_str = '<span class="sc_start_time_all_span" style="color: rgba(0,0,0,0.3); font-size: 10px;">'+ sc_start_time_all +'</span><span class="sc_start_time_simple_span" style="color: rgba(0,0,0,0.3); font-size: 10px; display: none;">'+ sc_start_time_simple +'</span>';
        if (sc_start_time_simple_flag) {
            sc_start_time_str = '<span class="sc_start_time_all_span" style="color: rgba(0,0,0,0.3); font-size: 10px; display: none;">'+ sc_start_time_all +'</span><span class="sc_start_time_simple_span" style="color: rgba(0,0,0,0.3); font-size: 10px;">'+ sc_start_time_simple +'</span>';
        }
        let metal_and_start_time_html = '<div class="sc_start_time" style="height: 20px; padding-left: 5px; margin-top: -1px;'+ sc_start_time_display +'">'+ sc_start_time_str +'</div>';
        if (sc_medal_flag) {
            metal_and_start_time_html = '<div style="display: inline-flex;"><div class="fans_medal_item" style="background-color: '+ sc_medal_color +';border: 1px solid '+ sc_medal_color +';"><div class="fans_medal_label"><span class="fans_medal_content">'+ sc_medal_name +'</span></div><div class="fans_medal_level">'+ sc_medal_level +'</div></div>' +
                '<div class="sc_start_time" style="height: 20px; padding-left: 5px;'+ sc_start_time_display +'">'+ sc_start_time_str +'</div></div>'
        }

        let sc_msg_item_style_width = '';
        let sc_msg_item_style_border_radius = 'border-radius: 8px 8px 6px 6px;';
        let sc_msg_body_style_display = '';
        let sc_msg_head_style_border_radius = 'border-radius: 6px 6px 0px 0px;';
        let sc_msg_head_left_style_display = '';
        let sc_msg_head_right_style_display = '';
        if (the_usi_sc_panel_side_fold_flag) {
            sc_msg_item_style_width = 'width: 50px;';
            sc_msg_item_style_border_radius = 'border-radius: 8px;';
            sc_msg_body_style_display = 'display: none;';
            sc_msg_head_style_border_radius = 'border-radius: 6px;';
            sc_msg_head_left_style_display = 'display: none;';
            sc_msg_head_right_style_display = 'display: none;';
        }

        let sc_item_show_animation = 'animation: sc_fadenum 1s linear forwards;';
        if (sc_item_order_up_flag) {
            sc_item_show_animation = 'animation: sc_fadenum_reverse 1s linear forwards;';
        }

        let sc_item_uname_font_size = 15;
        let sc_item_msg_body_font_size = 14;
        if (sc_live_all_font_size_add > 0) {
            if (!sc_live_font_size_only_message_flag) {
                sc_item_uname_font_size += sc_live_all_font_size_add;
            }
            sc_item_msg_body_font_size += sc_live_all_font_size_add;
        }

        // 如果在侧折模式，并且设置了头像边框透明
        if (sc_isFullscreen) {
            if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag_fullscreen) {
                sc_background_bottom_color = change_color_opacity(sc_background_bottom_color, 0);
                sc_background_color = change_color_opacity(sc_background_color, 0);
            } else {
                // 如果调整了SC背景的透明度
                if (sc_live_item_bg_opacity_val < 1) {
                    let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
                    if ((sc_switch_fullscreen === 0 || sc_switch_fullscreen === 6) && sc_live_item_bg_opacity_val < 0.3) {
                        // 白色的时候，为了能看到内容，透明度调整为0.3
                        the_sc_live_item_bg_opacity_val = 0.3;
                    }
                    sc_background_bottom_color = change_color_opacity(sc_background_bottom_color, the_sc_live_item_bg_opacity_val);
                    sc_background_color = change_color_opacity(sc_background_color, the_sc_live_item_bg_opacity_val);
                }
            }
        } else {
            if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag) {
                sc_background_bottom_color = change_color_opacity(sc_background_bottom_color, 0);
                sc_background_color = change_color_opacity(sc_background_color, 0);
            } else {
                // 如果调整了SC背景的透明度
                if (sc_live_item_bg_opacity_val < 1) {
                    let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
                    if ((sc_switch === 0 || sc_switch === 6) && sc_live_item_bg_opacity_val < 0.3) {
                        // 白色的时候，为了能看到内容，透明度调整为0.3
                        the_sc_live_item_bg_opacity_val = 0.3;
                    }
                    sc_background_bottom_color = change_color_opacity(sc_background_bottom_color, the_sc_live_item_bg_opacity_val);
                    sc_background_color = change_color_opacity(sc_background_color, the_sc_live_item_bg_opacity_val);
                }
            }
        }

        let sc_item_value_font_style_display = '';
        let sc_item_diff_time_style_display = '';
        if (sc_live_hide_value_font_flag) {
            sc_item_value_font_style_display = 'display: none;';
        }

        if (sc_live_hide_diff_time_flag) {
            sc_item_diff_time_style_display = 'display: none;';
        }

        let sc_item_html = '<div class="sc_long_item sc_' + sc_uid + '_' + sc_start_timestamp + '" data-fold="0" data-start="'+ (sc_start_timestamp * 1000 + sc_last_item_sort)+'" style="'+ sc_msg_item_style_width +'background-color: '+ sc_background_bottom_color +';margin-bottom: 10px;'+ sc_item_show_animation + sc_msg_item_style_border_radius + box_shadow_css +'">'+
            '<div class="sc_msg_head" style="' + sc_background_image_html + 'height: 40px;background-color: '+ sc_background_color +';padding:5px;background-size: contain;background-repeat: no-repeat;background-position: right center;'+ sc_msg_head_style_border_radius +'">'+
            '<div class="sc_avatar_div" style="float: left; box-sizing: border-box; height: 40px; position: relative;"><a href="//space.bilibili.com/'+ sc_uid +'" target="_blank">'+
            sc_user_info_face_img+ sc_user_info_face_frame_img +'</a></div>'+
            '<div class="sc_msg_head_left" style="float: left; box-sizing: border-box; height: 40px; margin-left: 40px; padding-top: 2px;'+ sc_msg_head_left_style_display +'">'+
            metal_and_start_time_html+
            '<div class="sc_uname_div" style="height: 20px; padding-left: 5px; white-space: nowrap; width: ' + ((the_usi_sc_rectangle_width / 2) + 5) + 'px; overflow: hidden; text-overflow: ellipsis;"><span class="sc_font_color" style="color: ' + sc_font_color + ';font-size: ' + sc_item_uname_font_size + 'px;text-decoration: none;" data-color="'+ sc_font_color_data +'">' + sc_user_info_uname + '</span></div>'+
            '</div>'+
            '<div class="sc_msg_head_right" style="float: right; box-sizing: border-box; height: 40px; padding: 2px 2px 0px 0px;'+ sc_msg_head_right_style_display +'">'+
            '<div class="sc_value_font" style="height: 20px;'+ sc_item_value_font_style_display +'"><span style="font-size: 15px; float: right; color: #000;">￥'+ sc_price +'</span></div>'+
            '<div style="height: 20px; color: #666666" data-html2canvas-ignore><span class="sc_diff_time" style="font-size: 15px; float: right;'+ sc_item_diff_time_style_display +'">'+ sc_diff_time +'</span><span class="sc_start_timestamp" style="display:none;">'+ sc_start_timestamp +'</span><span style="display:none">'+ sc_price +'</span></div>'+
            '</div>'+
            '</div>'+
            '<div class="sc_msg_body" style="padding-left: 14px; padding-right: 10px; padding-top: 10px; padding-bottom: 10px; overflow-wrap: break-word; line-height: 2;'+ sc_msg_body_style_display +'"><span class="sc_msg_body_span" style="color: white; font-size: ' + sc_item_msg_body_font_size + 'px;">'+ sc_message +'</span></div>'+
            '</div>';

        if (sc_item_order_up_flag) {
            $(document).find('.sc_long_list').append(sc_item_html);
            if (realtime && the_usi_sc_panel_fold_mode === 2) {
                sc_scroll_list_to_bottom();
            }
        } else {
            $(document).find('.sc_long_list').prepend(sc_item_html);
        }

        if (!sc_live_sc_to_danmu_show_flag) {
            sc_custom_config_apply('sc_' + sc_uid + '_' + sc_start_timestamp);
        }

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
        // n_count 贡献用户数（同接数）
        // n_online_count 高能用户数（App显示的）（在线的）

        let the_urc_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag;
        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
            the_urc_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag_fullscreen;
        }

        const the_update_count_timestamp = (new Date()).getTime();

        if (n_count) {
            high_energy_contribute_num = n_count;
            if (n_count > this_view_high_energy_contribute_num_est) {
                this_view_high_energy_contribute_num_est = n_count;
                this_view_high_energy_contribute_num_est_time = the_update_count_timestamp;
            }
        }

        if (n_online_count) {
            high_energy_num = n_online_count;
            if (n_online_count > this_view_high_energy_num_est) {
                this_view_high_energy_num_est = n_online_count;
                this_view_high_energy_num_est_time = the_update_count_timestamp;
            }
        }

        if (sc_update_date_guard_once) {
            if (high_energy_contribute_num >= high_energy_num * 2 && n_online_count === 0) {
                // 这种情况，应该是，非直播态直播间 或者 嵌套直播间，如虚拟区官方频道，同接就是App的高能
                // 如果连续5个数据包是这样就判定
                if (sc_date_num_nesting_judge_n === 5) {
                    sc_nesting_live_room_flag = true;
                } else {
                    sc_date_num_nesting_judge_n++;
                }
            } else {
                sc_date_num_nesting_judge_n = 0;
            }

            if (sc_nesting_live_room_flag) {
                high_energy_num = high_energy_contribute_num;
            }
        } else {
            let rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (rank_data_show_div.length === 0) {
                rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
            }
            if (rank_data_show_div.length) {
                $(document).find('.sc_captain_num_right').text(rank_data_show_div.last().text().match(/\d+/) ?? 0);
                sc_update_date_guard_once = true;
            }
        }

        // SC记录板的
        if (the_urc_sc_data_show_high_energy_num_flag) {
            $(document).find('.sc_high_energy_num_left').text('高能：');
            if (high_energy_num >= 100000) {
                $(document).find('.sc_high_energy_num_right').text(parseInt(high_energy_num/10000) + 'w+');
            } else {
                $(document).find('.sc_high_energy_num_right').text(high_energy_num);
            }

        } else {
            $(document).find('.sc_high_energy_num_left').text('同接：');
            if (high_energy_contribute_num >= 100000) {
                $(document).find('.sc_high_energy_num_right').text(parseInt(high_energy_contribute_num/10000) + 'w+');
            } else {
                $(document).find('.sc_high_energy_num_right').text(high_energy_contribute_num);
            }

        }

        $(document).find('.sc_data_show_label').attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');


        // 页面的
        // 弹幕框顶部
        if (data_show_top_flag) {
            let rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (rank_data_show_div.length === 0) {
                rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
            }

            if (rank_data_show_div.length) {
                const default_high_energy_pattern1 = /房间观众/;
                const rank_data_show_div_first_text_str = rank_data_show_div.first().text();

                if (default_high_energy_pattern1.test(rank_data_show_div_first_text_str)) {
                    if (high_energy_num >= 100000) {
                        rank_data_show_div.first().text('房间观众(' + parseInt(high_energy_num/10000) + '万+)');
                    } else {
                        rank_data_show_div.first().text('房间观众(' + high_energy_num + ')');
                    }
                } else {
                    const default_high_energy_pattern2 = /高能用户/;
                    if (default_high_energy_pattern2.test(rank_data_show_div_first_text_str)) {
                        if (high_energy_num >= 100000) {
                            rank_data_show_div.first().text('高能用户(' + parseInt(high_energy_num/10000) + '万+)');
                        } else {
                            rank_data_show_div.first().text('高能用户(' + high_energy_num + ')');
                        }
                    }
                }

                rank_data_show_div.first().attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');
            }
        }

        // 弹幕框底部
        if (data_show_bottom_flag) {
            const sc_urc_data_show_bottom_rank_num_div = $(document).find('#sc_data_show_bottom_rank_num');
            if (sc_urc_data_show_bottom_rank_num_div.length) {
                const sc_urc_data_show_bottom_div = $(document).find('#sc_data_show_bottom_div');

                if (the_urc_sc_data_show_high_energy_num_flag) {
                    if (high_energy_num >= 100000) {
                        sc_urc_data_show_bottom_rank_num_div.text('高能：'+ parseInt(high_energy_num/10000) + '万+');
                    } else {
                        sc_urc_data_show_bottom_rank_num_div.text('高能：'+ high_energy_num);
                    }

                } else {
                    if (high_energy_contribute_num >= 100000) {
                        sc_urc_data_show_bottom_rank_num_div.text('同接：'+ parseInt(high_energy_contribute_num/10000) + '万+');
                    } else {
                        sc_urc_data_show_bottom_rank_num_div.text('同接：'+ high_energy_contribute_num);
                    }

                }

                sc_urc_data_show_bottom_div.attr('title', '同接/高能('+ high_energy_contribute_num + '/' + high_energy_num +') = ' + (high_energy_contribute_num / high_energy_num * 100).toFixed(2) + '%');

            } else {
                let rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (rank_data_show_div.length === 0) {
                    rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
                }

                if (rank_data_show_div.length) {
                    const guard_text = rank_data_show_div.last().text();

                    // 不同发送框UI适配
                    let bili_live_send_ui_one_flag = $('#chat-control-panel-vm .bottom-actions .bl-button span').text() === '发送';
                    let sc_data_show_bottom_div_width = 'width: 50%;';
                    let sc_data_show_bottom_div_style = '';
                    let sc_data_show_bottom_div_item_width = 'width: 100%; ';
                    if (!bili_live_send_ui_one_flag) {
                        sc_data_show_bottom_div_width = 'width: 100%;';
                        sc_data_show_bottom_div_style = 'margin-top: 3px; display: flex; ';
                        sc_data_show_bottom_div_item_width = 'width: 42%; ';
                    }

                    let sc_data_show_bottom_div_color = '#ffffff; ' + sc_data_show_bottom_div_style;
                    const chat_control_panel_vm_div = $(document).find('#chat-control-panel-vm');
                    if (chat_control_panel_vm_div.length) {
                        const chat_control_panel_vm_div_bg = chat_control_panel_vm_div.css('background-image');
                        if (!chat_control_panel_vm_div_bg || chat_control_panel_vm_div_bg === 'none') {
                            sc_data_show_bottom_div_color = '#666666; ' + sc_data_show_bottom_div_style;
                        }
                    }

                    if (the_urc_sc_data_show_high_energy_num_flag) {
                        $(document).find('#control-panel-ctnr-box').append('<div style="'+ sc_data_show_bottom_div_width +' position: relative;color: '+ sc_data_show_bottom_div_color +'" id="sc_data_show_bottom_div" title="'+ (high_energy_contribute_num / high_energy_num * 100).toFixed(2) +'%"><div id="sc_data_show_bottom_rank_num" style="'+ sc_data_show_bottom_div_item_width +' margin-bottom: 5px;">高能：'+ high_energy_num +'</div><div id="sc_data_show_bottom_guard_num" >舰长：'+ (guard_text.match(/\d+/) ?? 0) +'</div></div>');
                    } else {
                        $(document).find('#control-panel-ctnr-box').append('<div style="'+ sc_data_show_bottom_div_width +' position: relative;color: '+ sc_data_show_bottom_div_color +'" id="sc_data_show_bottom_div" title="'+ (high_energy_contribute_num / high_energy_num * 100).toFixed(2) +'%"><div id="sc_data_show_bottom_rank_num" style="'+ sc_data_show_bottom_div_item_width +' margin-bottom: 5px;">同接：'+ high_energy_contribute_num +'</div><div id="sc_data_show_bottom_guard_num" >舰长：'+ (guard_text.match(/\d+/) ?? 0) +'</div></div>');
                    }
                }
            }
        }
    }

    function sc_fetch_and_show() {
        // 抓取SC
        fetch(sc_url, { credentials: 'include' }).then(response => {
            return response.json();
        }).then(ret => {
            let sc_catch = [];
            if (ret.code === 0) {
                // 高能数
                high_energy_num = ret.data?.room_rank_info?.user_rank_entry?.user_contribution_rank_entry?.count || 0;

                // 舰长数
                let captain_num = ret.data?.guard_info?.count || 0;
                $(document).find('.sc_captain_num_right').text(captain_num);

                sc_live_room_title = (ret.data?.anchor_info?.base_info?.uname || '') + '_' + (ret.data?.room_info?.title || '');

                sc_catch = ret.data?.super_chat_info?.message_list || [];

                sc_live_room_up_uid = ret.data?.room_info?.uid || 0;

                real_room_id = ret.data?.room_info?.room_id || room_id;
            }

            // 如果设置了-进入直播间的时候，不显示直播间正在挂着的SC
            if (sc_live_panel_not_show_now_time_sc_flag) {
                sc_catch = [];
            }

            // 追加到localstorage 和 SC显示板
            let sc_localstorage = [];
            let sc_sid_localstorage = [];
            let temp_sc_localstorage = [];
            let temp_sc_sid_localstorage = [];
            let diff_arr_new_sc = [];
            let sc_add_arr = [];
            let sc_localstorage_json = unsafeWindow.localStorage.getItem(sc_localstorage_key);
            if (sc_localstorage_json === null || sc_localstorage_json === 'null' || sc_localstorage_json === '[]' || sc_localstorage_json === '') {
                diff_arr_new_sc = sc_catch;
            } else {
                sc_localstorage = JSON.parse(sc_localstorage_json);
                sc_sid_localstorage = JSON.parse(unsafeWindow.localStorage.getItem(sc_sid_localstorage_key));
                temp_sc_localstorage = sc_localstorage;
                temp_sc_sid_localstorage = sc_sid_localstorage;

                // 如果设置了-进入直播间的时候，不显示保存在本地的往期SC
                if (sc_live_panel_not_show_local_sc_flag) {
                    temp_sc_localstorage = [];
                    temp_sc_sid_localstorage = [];
                }

                diff_arr_new_sc = sc_catch.filter(v => {
                    let sid = String(v.id) + '_' + String(v.uid) + '_' + String(v.price);

                    return !sc_sid_localstorage.includes(sid);
                });

            }

            diff_arr_new_sc = diff_arr_new_sc.sort((a, b) => a.start_time - b.start_time);

            if (sc_isListEmpty) {
                // 一开始进入
                if (sc_live_panel_not_show_local_sc_flag) {
                    sc_add_arr = sc_catch;

                    if (sc_catch.length && !sc_live_panel_not_show_now_time_sc_flag) {
                        // 有抓取到实时已经存在的
                        sc_custom_config_start_class_by_fetch(sc_catch);
                    }

                } else {
                    sc_add_arr = temp_sc_localstorage.concat(diff_arr_new_sc);

                    if (diff_arr_new_sc.length && !sc_live_panel_not_show_now_time_sc_flag) {
                        // 有抓取到实时已经存在的
                        sc_custom_config_start_class_by_fetch(diff_arr_new_sc);
                    }
                }

                if (!diff_arr_new_sc.length && temp_sc_localstorage.length && !sc_live_panel_not_show_local_sc_flag) {
                    // 没抓取到实时已经存在的，但有存储的
                    sc_custom_config_start_class_by_store(temp_sc_localstorage);
                }

            } else {
                // 实时
                sc_add_arr = diff_arr_new_sc;
            }

            if (sc_add_arr.length) {
                for (let i = 0; i < sc_add_arr.length; i++){
                    // 追加到SC显示板
                    update_sc_item(sc_add_arr[i], false);
                }

                if (sc_item_order_up_flag) {
                    setTimeout(() => { sc_scroll_list_to_bottom(); }, 1000);
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
                    if (sc_localstorage.length && !sc_live_panel_not_show_local_sc_flag) {
                        sc_custom_config_start_class_by_store(sc_localstorage);

                        for (let r = 0; r < sc_localstorage.length; r++){
                            // 追加到SC显示板
                            update_sc_item(sc_localstorage[r], false);
                        }

                        sc_isListEmpty = false;

                        if (sc_item_order_up_flag) {
                            setTimeout(() => { sc_scroll_list_to_bottom(); }, 1000);
                        }
                    }
                }
            }
        });
    }

    function sc_fullscreen_width_high_mode_show() {
        let the_whm_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
        let the_whm_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
        let the_whm_sc_rectangle_width = sc_rectangle_width;

        let the_reset_sc_panel_fold_mode = sc_panel_fold_mode;
        let the_reset_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
        if (sc_isFullscreen) {
            the_whm_sc_panel_fold_mode = sc_panel_fold_mode;
            the_whm_sc_panel_side_fold_flag = sc_panel_side_fold_flag;

            if (sc_live_fullscreen_config_separate_memory_flag) {
                the_whm_sc_rectangle_width = sc_rectangle_width_fullscreen;

                the_reset_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                the_reset_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }
        }

        $(document).find('.sc_long_rectangle').width(the_whm_sc_rectangle_width);
        $(document).find('.sc_uname_div').width(the_whm_sc_rectangle_width / 2 + 5);

        sc_panel_list_height_config_apply();

        if (the_whm_sc_panel_fold_mode === 1) {
            if (sc_side_fold_custom_first_class) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            sc_foldback(false);
            sc_minimize();
        } else if (the_whm_sc_panel_fold_mode === 2) {
            sc_minimize();
        } else {
            if (the_whm_sc_panel_side_fold_flag) {
                sc_foldback();
            }
        }

        sc_live_panel_fold_mode_change(the_reset_sc_panel_fold_mode);
        sc_live_panel_side_fold_flag_change(the_reset_sc_panel_side_fold_flag);
        sc_fold_mode_store();
        sc_panel_side_fold_flag_store();

        sc_memory_show();
    }

    function sc_fullscreen_separate_memory_apply() {

        sc_fullscreen_width_high_mode_show();
        sc_switch_css();
        sc_live_other_config_data_show_apply();

        sc_live_fullscreen_config_all_store();
    }

    function sc_process_start() {
        if (sc_panel_list_height < 0) { sc_panel_list_height = 0; }
        if (sc_panel_list_height > 500) { sc_panel_list_height = 500; }

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
        if (sc_panel_list_height > 0) {
            sc_rectangleContainer.style.borderTop = '10px solid transparent';
        }

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
        sc_buttonsContainer.style.height = 'auto';

        // Create a container for the dataShow
        const sc_dataShowContainer = document.createElement('div');
        sc_dataShowContainer.className = 'sc_data_show';
        sc_dataShowContainer.style.display = 'none';
        sc_dataShowContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        sc_dataShowContainer.style.color = '#000';
        sc_dataShowContainer.style.textAlign = 'center';
        sc_dataShowContainer.style.position = 'sticky';
        sc_dataShowContainer.style.zIndex = '3';
        sc_dataShowContainer.style.height = '20px';
        sc_dataShowContainer.style.fontSize = '15px';
        sc_dataShowContainer.style.padding = '10px';
        sc_dataShowContainer.style.marginBottom = '10px';

        // Create labels for the dataShow
        const sc_label_high_energy_num_left = document.createElement('label');
        sc_label_high_energy_num_left.textContent = '同接：';
        sc_label_high_energy_num_left.classList.add('sc_data_show_label', 'sc_high_energy_num_left');
        sc_label_high_energy_num_left.style.float = 'left';
        if (sc_data_show_high_energy_num_flag) {
            sc_label_high_energy_num_left.textContent = '高能：';
        }

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

        let sc_panel_list_height_min = '200';
        if (sc_panel_list_height < 200) { sc_panel_list_height_min = sc_panel_list_height; }
        // Create a container for sc list
        const sc_listContainer = document.createElement('div');
        sc_listContainer.className = 'sc_long_list';
        sc_listContainer.id = 'sc_normal_list';
        sc_listContainer.style.minHeight = sc_panel_list_height_min + 'px';
        sc_listContainer.style.maxHeight = sc_panel_list_height + 'px';
        sc_listContainer.style.overflowY = 'scroll';
        sc_listContainer.style.overflowX = 'hidden';
        sc_listContainer.style.scrollbarGutter = 'stable'; // 滚动条不占位置
        sc_listContainer.style.paddingLeft = '10px';
        sc_listContainer.style.paddingTop = '0px';
        sc_listContainer.style.paddingBottom = '0px';
        sc_listContainer.style.paddingRight = '13px';
        sc_listContainer.style.marginRight = '-7px'; // 可能scrollbarGutter不是所有浏览器都支持，加多这个和设置'scroll'兼容下
        if (navigator.userAgent.indexOf("Firefox") > -1) {
            // Firefox浏览器兼容美化
            sc_listContainer.style.marginRight = '-2px';
            sc_listContainer.style.scrollbarWidth = 'thin';
            sc_listContainer.style.scrollbarColor = 'rgba(0, 0, 0, 0.3) transparent';
        }

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
            @keyframes sc_fadenum_reverse {
                0%{transform: translateY(100%);opacity: 0;}
                100%{transform: translateY(0);opacity: 1;}
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

            .sc_search_btn {
                text-decoration: none;
                width: 'auto';
                padding: 5px;
                background: linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3);
                background-size: 350%;
                color: #ffffff;
                border: none;
                box-shadow: '0 0 3px rgba(0, 0, 0, 0.3)';
            }
            .sc_search_btn:hover {
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

            @keyframes slideInFromRightToLeft {
                from {
                    left: 100%;
                }
                to {
                    left: 0;
                }
            }
            @keyframes slideInFromRightToLeftOut {
                from {
                    left: 100%;
                }
                to {
                    left: -120%;
                }
            }
            .sc_special_tip_div {
                font-size: 16px;
                color: #fff;
                height: auto;
                width: auto;
                background: linear-gradient(to right, lightblue,transparent);
                position: absolute;
                left: 100%;
                height: 50px;
                animation: slideInFromRightToLeft 15s linear forwards;
                border-radius: 50px 0 0 50px;
                padding: 10px;
                display: flex;
                align-items: center;
                white-space: nowrap;
                z-index: 2222;
            }
            .sc_special_tip_div_no_padding {
                font-size: 14px;
                color: #fff;
                height: auto;
                width: auto;
                background: linear-gradient(to right, lightblue,transparent);
                position: absolute;
                left: 100%;
                height: 40px;
                animation: slideInFromRightToLeft 15s linear forwards;
                border-radius: 40px 0 0 40px;
                display: flex;
                align-items: center;
                white-space: nowrap;
                z-index: 2222;
            }
            .sc_special_tip_div_no_opaque {
                font-size: 16px;
                color: #fff;
                height: auto;
                width: auto;
                background: linear-gradient(to right, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, transparent);
                position: absolute;
                left: 100%;
                height: 50px;
                animation: slideInFromRightToLeft 15s linear forwards;
                border-radius: 50px 0 0 50px;
                padding: 10px;
                display: flex;
                align-items: center;
                white-space: nowrap;
                z-index: 2222;
            }
            .sc_special_tip_div_no_opaque_no_padding {
                font-size: 14px;
                color: #fff;
                height: auto;
                width: auto;
                background: linear-gradient(to right, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, lightblue, transparent);
                position: absolute;
                left: 100%;
                height: 40px;
                animation: slideInFromRightToLeft 15s linear forwards;
                border-radius: 40px 0 0 40px;
                display: flex;
                align-items: center;
                white-space: nowrap;
                z-index: 2222;
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
            let the_hfc_sc_panel_fold_mode = sc_panel_fold_mode;
            if (sc_live_fullscreen_config_separate_memory_flag) {
                the_hfc_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            }

            let the_normal_list_div = $(document).find('#sc_normal_list');

            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) {
                let sc_circle_clone = $(sc_circleContainer).clone(true);
                let sc_rectangle_clone = $(sc_rectangleContainer).clone(true);
                $(live_player_div).append(sc_circle_clone);
                $(live_player_div).append(sc_rectangle_clone);
                sc_isFullscreen = true;

                sc_fullscreen_separate_memory_apply();

                if (the_hfc_sc_panel_fold_mode === 1 && sc_side_fold_fullscreen_auto_hide_list_flag) {
                    sc_panel_list_no_remember_hide();
                }

                $(sc_rectangle_clone).find('.sc_long_list').attr('id', 'sc_fullscreen_list').scrollTop(the_normal_list_div.scrollTop());
            } else {

                let the_live_list_div_scrolltop = $(document).find('#sc_fullscreen_list').scrollTop() ?? 0;

                $(live_player_div).find('.sc_drag_div').remove();
                sc_isFullscreen = false;
                sc_side_fold_hide_list_ing_flag = false;

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

                if (the_hfc_sc_panel_fold_mode === 1 && sc_side_fold_fullscreen_auto_hide_list_flag) {
                    sc_panel_list_no_remember_show(false);
                }

                sc_fullscreen_separate_memory_apply();

                the_normal_list_div.scrollTop(the_live_list_div_scrolltop);

            }
        }

        // 让全屏直播的情况下也显示
        live_player_div.addEventListener('fullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('webkitfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('mozfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('MSFullscreenChange', sc_handleFullscreenChange);

        $(document).on('click', '.sc_long_circle', () => {
            if (sc_isClickAllowed) {
                let the_cc_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
                let the_cc_sc_rectangle_width = sc_rectangle_width;
                let the_cc_sc_panel_list_height = sc_panel_list_height;
                if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                    the_cc_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                    the_cc_sc_rectangle_width = sc_rectangle_width_fullscreen;
                    the_cc_sc_panel_list_height = sc_panel_list_height_fullscreen;
                }

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

                if (the_cc_sc_panel_side_fold_flag) {
                    if (unsafeWindow.innerWidth - xPos < 72) {
                        xPos = unsafeWindow.innerWidth - 72;
                    }

                    sc_live_panel_fold_mode_change(1);
                } else {
                    if (unsafeWindow.innerWidth - xPos < the_cc_sc_rectangle_width) {
                        xPos = unsafeWindow.innerWidth - the_cc_sc_rectangle_width;
                    }

                    sc_live_panel_fold_mode_change(2);
                }

                if (unsafeWindow.innerHeight - yPos < the_cc_sc_panel_list_height) {
                    yPos = unsafeWindow.innerHeight - the_cc_sc_panel_list_height - 150;
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

                if (!sc_live_sc_to_danmu_show_flag) {
                    sc_side_fold_custom_auto_run_flag = false;

                    sc_custom_config_apply(sc_side_fold_custom_first_class);
                }
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

            let the_enter_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            let the_enter_sc_func_btn_mode = sc_func_btn_mode;
            let the_enter_sc_panel_fold_mode = sc_panel_fold_mode;
            let the_enter_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_enter_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                the_enter_sc_func_btn_mode = sc_func_btn_mode_fullscreen;
                the_enter_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                the_enter_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
            }

            function sc_change_show() {

                if (!the_enter_sc_panel_side_fold_flag || (the_enter_sc_panel_side_fold_flag && the_enter_sc_func_btn_mode !== 1)) {

                    $(sc_btn_model).slideDown(500, () => {
                        sc_rectangle_is_slide_down = false;
                        $(sc_btn_model).css('height', 'auto');

                        if (sc_rectangle_mouse_out) {
                            $(sc_btn_model).slideUp(500);
                        }
                    });
                }

                if (!the_enter_sc_panel_side_fold_flag || (the_enter_sc_panel_side_fold_flag && the_enter_sc_panel_side_fold_simple)) {

                    $(sc_data_model).slideDown(500, () => {
                        $(sc_btn_model).show();
                        $(sc_btn_model).css('height', 'auto');
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

            if (the_enter_sc_panel_fold_mode === 1) {

                let sc_extra_height = 0;
                let sc_enter_change = $(sc_btn_model).outerHeight() + $(sc_data_model).outerHeight() + 20;
                let sc_diff_height = unsafeWindow.innerHeight - sc_rectangle_model[0].offsetTop - $(sc_list_model).outerHeight() - $(sc_btn_model).outerHeight() - $(sc_data_model).outerHeight() - 25;

                if (!the_enter_sc_panel_side_fold_simple) {
                    sc_extra_height = $(sc_data_model).outerHeight();
                    if (the_enter_sc_func_btn_mode !== 1) {
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
                    $(sc_btn_model).css('height', 'auto');

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

            if (the_enter_sc_panel_side_fold_flag && the_enter_sc_func_btn_mode !== 1) {
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

            let the_leave_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            let the_leave_sc_panel_fold_mode = sc_panel_fold_mode;
            let the_leave_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_leave_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                the_leave_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                the_leave_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
            }

            let sc_rectangle_top = sc_rectangle_model[0].offsetTop;

            sc_btn_mode_apply();

            $(sc_btn_model).slideUp(500, () => {
                sc_rectangle_is_slide_up = false;
                if (!sc_rectangle_mouse_out) {
                    $(sc_btn_model).slideDown(500);
                    if (the_leave_sc_panel_side_fold_flag && !the_leave_sc_panel_side_fold_simple) {
                        $(sc_rectangle_model).css('border-bottom', '10px solid transparent');
                    }
                }
            });

            if (the_leave_sc_panel_side_fold_flag) {
                // 应对鼠标的快速移入移出时，动画进行中的情况
                let sc_edge_mouse_enter_anime = $(sc_data_model).attr('data-anime');
                if (sc_edge_mouse_enter_anime === '1') {
                    sc_rectangle_top = parseInt($(sc_data_model).attr('data-rectangleTop'), 10);
                }

                if (the_leave_sc_panel_side_fold_simple) {
                    $(sc_data_lable_model).animate({opacity: 0}, 200);
                    $(sc_data_model).slideUp(500, () => {
                        // 预防快速操作
                        let the_leave_delay_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
                        if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                            the_leave_delay_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
                        }

                        sc_rectangle_is_slide_up = false;
                        if (!sc_rectangle_mouse_out || !the_leave_delay_sc_panel_side_fold_simple) {
                            $(sc_data_model).slideDown(500);
                            $(sc_rectangle_model).css('border-bottom', 'unset');
                        }
                    });
                    $(sc_rectangle_model).css('border-bottom', '10px solid transparent');

                } else {
                    $(sc_rectangle_model).css('border-bottom', 'unset');

                    // 预防快速操作
                    setTimeout(()=> {
                        if ($(sc_data_model).css('display') === 'none') {
                            $(sc_data_model).slideDown(500);
                        }
                    }, 1000)
                }
            } else {
                $(sc_data_lable_model).animate({opacity: 0}, 200);
                $(sc_data_model).slideUp(500, () => {
                    sc_rectangle_is_slide_up = false;
                    if (!sc_rectangle_mouse_out) {
                        $(sc_data_model).slideDown(500);
                        $(sc_btn_model).show();
                    }
                });
            }

            let sc_change_height = $(sc_btn_model).outerHeight() + $(sc_data_model).outerHeight();
            let sc_leave_change = sc_change_height + 20;
            if (the_leave_sc_panel_fold_mode === 1 && !the_leave_sc_panel_side_fold_simple) {
                sc_leave_change = $(sc_btn_model).outerHeight() + 10;
            }

            if (Math.abs(unsafeWindow.innerHeight - sc_rectangle_top - $(sc_list_model).outerHeight() - sc_change_height - 30) <= 10) {
                $(sc_rectangle_model).animate({top: sc_rectangle_top + sc_leave_change}, 500, () => {
                    sc_panel_drag_store(sc_rectangle_model[0].offsetLeft, sc_rectangle_model[0].offsetTop);
                });
            }

        });

        $(document).on('mouseenter', '.sc_msg_head', function(e) {
            let the_enter_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            let the_enter_sc_panel_list_height = sc_panel_list_height;
            let the_enter_sc_rectangle_width = sc_rectangle_width;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_enter_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                the_enter_sc_panel_list_height = sc_panel_list_height_fullscreen;
                the_enter_sc_rectangle_width = sc_rectangle_width_fullscreen;
            }

            if (!the_enter_sc_panel_side_fold_flag || sc_item_side_fold_touch_flag) { return; }

            let sc_fold_out_show_top = $(this).offset().top - $(this).parent().parent().parent().offset().top - 10;
            if (the_enter_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag) {
                sc_fold_out_show_top = sc_fold_out_show_top + 10;
            }
            $(this).parent().css('position', 'absolute');
            $(this).parent().css('top', sc_fold_out_show_top);
            $(this).parent().css('z-index', '10');
            $(this).parent().css('width', (the_enter_sc_rectangle_width - 22) + 'px'); // 22 约为总padding
            $(this).parent().css('height', '');

            if (($(this).offset().left - (unsafeWindow.innerWidth / 2)) > 0) {
                if (the_enter_sc_panel_list_height === 0 || sc_side_fold_hide_list_ing_flag) {
                    $(this).parent().css('left', -(the_enter_sc_rectangle_width - 22 - 72 + 10 + 60)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                } else {
                    $(this).parent().css('left', -(the_enter_sc_rectangle_width - 22 - 72 + 10)); // 22 约为总padding, 72为侧折后的宽，10为一个padding
                }
            }
            sc_side_fold_out_one($(this).parent(), true);

            sc_item_side_fold_touch_flag = true;
            sc_item_side_fold_touch_oj = $(this).parent();

            const bg_color = $(this).css('background-color');
            let bg_color_op_val = sc_live_item_bg_opacity_val;
            if (bg_color_op_val < 0.5) {
                // 防止太透明导致看不清
                bg_color_op_val = 0.5
            }
            const sc_background_color = change_color_opacity(bg_color, bg_color_op_val);
            $(this).css('background-color', sc_background_color);

            const bg_p_color = $(this).parent().css('background-color');
            const sc_p_background_color = change_color_opacity(bg_p_color, bg_color_op_val);
            $(this).parent().css('background-color', sc_p_background_color);
        });

        $(document).on('mouseleave', '.sc_msg_head', function() {
            let the_leave_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_leave_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }

            if (!the_leave_sc_panel_side_fold_flag) { return; }

            $(this).parent().css('position', '');
            $(this).parent().css('top', '');
            $(this).parent().css('z-index', '');
            $(this).parent().css('width', '50px');
            $(this).parent().css('height', '50px');
            $(this).parent().css('left', '');
            sc_side_fold_in_one($(this).parent());

            sc_item_side_fold_touch_flag = false;
            sc_item_side_fold_touch_oj = {};

            if (sc_isFullscreen) {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag_fullscreen) {
                    const bg_color = $(this).css('background-color');
                    const sc_background_color = change_color_opacity(bg_color, 0);
                    $(this).css('background-color', sc_background_color);

                    const bg_p_color = $(this).parent().css('background-color');
                    const sc_p_background_color = change_color_opacity(bg_p_color, 0);
                    $(this).parent().css('background-color', sc_p_background_color);
                }
            } else {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag) {
                    const bg_color = $(this).css('background-color');
                    const sc_background_color = change_color_opacity(bg_color, 0);
                    $(this).css('background-color', sc_background_color);

                    const bg_p_color = $(this).parent().css('background-color');
                    const sc_p_background_color = change_color_opacity(bg_p_color, 0);
                    $(this).parent().css('background-color', sc_p_background_color);
                }
            }
        });

        $(document).on('mouseenter', '.sc_long_item,.sc_msg_head', function() {
            if (!sc_live_item_suspend_bg_opacity_one_flag) return;

            if ($(this).hasClass('sc_long_item')) {
                let the_sc_msg_head_obj = $(this).find('.sc_msg_head');
                let the_sc_item_head_bg_color = the_sc_msg_head_obj.css('background-color');
                the_sc_item_head_bg_color = change_color_opacity(the_sc_item_head_bg_color, 1);

                let the_sc_item_bg_color = $(this).css('background-color');
                the_sc_item_bg_color = change_color_opacity(the_sc_item_bg_color, 1);

                $(this).css('background-color', the_sc_item_bg_color);
                the_sc_msg_head_obj.css('background-color', the_sc_item_head_bg_color);
            } else {
                let the_sc_item_head_bg_color = $(this).css('background-color');
                the_sc_item_head_bg_color = change_color_opacity(the_sc_item_head_bg_color, 1);

                let the_sc_item_bg_color = $(this).parent().css('background-color');
                the_sc_item_bg_color = change_color_opacity(the_sc_item_bg_color, 1);

                $(this).parent().css('background-color', the_sc_item_bg_color);
                $(this).css('background-color', the_sc_item_head_bg_color);
            }
        });

        $(document).on('mouseleave', '.sc_long_item', function() {
            if (!sc_live_item_suspend_bg_opacity_one_flag) return;

            let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
            let the_sc_switch = sc_switch;
            let the_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            if (sc_isFullscreen) {
                the_sc_switch = sc_switch_fullscreen;
                the_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }
            if ((the_sc_switch === 0 || the_sc_switch === 6) && sc_live_item_bg_opacity_val < 0.3) {
                // 主题是白色的时候，为了能够看清内容，调整透明度为0.3
                the_sc_live_item_bg_opacity_val = 0.3;
            }

            if (sc_live_side_fold_head_border_bg_opacity_flag && the_sc_panel_side_fold_flag) {
                // 侧折模式，并且设置了边框透明
                the_sc_live_item_bg_opacity_val = 0;
            }

            let the_sc_msg_head_obj = $(this).find('.sc_msg_head');
            let the_sc_item_head_bg_color = the_sc_msg_head_obj.css('background-color');
            the_sc_item_head_bg_color = change_color_opacity(the_sc_item_head_bg_color, the_sc_live_item_bg_opacity_val);

            let the_sc_item_bg_color = $(this).css('background-color');
            the_sc_item_bg_color = change_color_opacity(the_sc_item_bg_color, the_sc_live_item_bg_opacity_val);

            $(this).css('background-color', the_sc_item_bg_color);
            the_sc_msg_head_obj.css('background-color', the_sc_item_head_bg_color);
        });

        $(document).on('click', '.sc_long_item', sc_toggle_msg_body);

        $(document).on('click', '.sc_data_show', function(e) {
            let the_cds_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            let the_cds_sc_panel_side_fold_simple = sc_panel_side_fold_simple;
            let the_cds_sc_func_btn_mode = sc_func_btn_mode;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_cds_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                the_cds_sc_panel_side_fold_simple = sc_panel_side_fold_simple_fullscreen;
                the_cds_sc_func_btn_mode = sc_func_btn_mode_fullscreen;
            }

            if (the_cds_sc_panel_side_fold_flag) {
                e = e || unsafeWindow.event;

                if (the_cds_sc_panel_side_fold_simple) {
                    sc_live_panel_side_fold_simple_change(false);
                    open_and_close_sc_modal('已退出 侧折的极简模式 ✓', '#A7C9D3', e, 1);
                } else {
                    sc_live_panel_side_fold_simple_change(true);
                    open_and_close_sc_modal('已设置 侧折的极简模式 ✓', '#A7C9D3', e, 1);
                }

                sc_side_fold_simple_store();

                if (the_cds_sc_func_btn_mode === 1) {
                    sc_rectangle_is_slide_down = false;
                }
            }
        });

        // 侧折状态下，展开一个SC时也可以滚动
        $(document).on('wheel', '.sc_long_list', function(e) {
            let the_wl_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_wl_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
            }

            if (the_wl_sc_panel_side_fold_flag && sc_item_side_fold_touch_flag) {
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
                            <label for="sc_custom_each_same_time_input_fullscreen" class="sc_custom_checkbox_inline" >确保每个实时SC都有相同的展开时间</label>
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
            let the_ccb_sc_panel_fold_mode = sc_panel_fold_mode;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_ccb_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            }

            let sc_custom_select_val = $(document).find('.sc_custom_radio_group input[name="sc_custom_option"]:checked').val();

            if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
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

                if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class); }

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

                if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class);

                    if (!sc_side_fold_custom_each_same_time_flag) {
                        sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                            if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) {
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
            let the_ccb_sc_panel_fold_mode = sc_panel_fold_mode;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_ccb_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            }

            let sc_custom_select_val = $(document).find('.sc_custom_radio_group_fullscreen input[name="sc_custom_option_fullscreen"]:checked').val();

            if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
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

                    sc_side_fold_custom_time = sc_side_fold_custom_time + 1.5; // 1.5s是动画时间，补回来

                }

                if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class); }

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

                sc_side_fold_custom_time = sc_side_fold_custom_time + 1.5; // 1.5s是动画时间，补回来

                if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) {
                    sc_trigger_item_side_fold_out(sc_side_fold_custom_first_class);

                    if (!sc_side_fold_custom_each_same_time_flag) {
                        sc_side_fold_custom_first_timeout_id = setTimeout(function() {
                            if (sc_side_fold_custom_first_class && the_ccb_sc_panel_fold_mode === 1) {
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

        let sc_live_panel_show_time_modal_style = document.createElement('style');
        sc_live_panel_show_time_modal_style.textContent = `
            .sc_live_panel_show_time_config_modal {
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

            .sc_live_panel_show_time_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 45%;
            }

            .sc_live_panel_show_time_modal_content p {
                color: #000;
            }

            .sc_live_panel_show_time_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_live_panel_show_time_close:hover,
            .sc_live_panel_show_time_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_live_panel_show_time_radio_group {
                display: inline-flex;
                color: #000;
                flex-direction: column;
            }

            .sc_live_panel_show_time_radio_group_fullscreen {
                display: inline-flex;
                color: #000;
                flex-direction: column;
            }

            .sc_live_panel_show_time_radio_group label {
                padding-right: 30px;
                padding-left: 10px;
            }

            .sc_live_panel_show_time_radio_group_fullscreen label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_live_panel_show_time_btn_div {
                margin-top: 30px;
            }

            .sc_live_panel_show_time_btn_div_fullscreen {
                margin-top: 30px;
            }

            .sc_live_panel_show_time_checkbox_div{
                text-align: center;
                margin-top: 20px;
            }

            .sc_live_panel_show_time_checkbox_inline {
                vertical-align: middle;
                display: inline-block;
                color: #000;
            }

            #sc_live_panel_show_time_form {
                margin-top: 30px;
                text-align: center;
            }

            #sc_live_panel_show_time_form_fullscreen {
                margin-top: 30px;
                text-align: center;
            }

            .sc_live_panel_show_time_form_item {
                display: flex;
                align-items: center;
                margin-top: 5px;
                margin-bottom: 5px;
            }

            #sc_live_panel_show_time_confirm_btn {
                float: right;
            }

            #sc_live_panel_show_time_confirm_btn_fullscreen {
                float: right;
            }

            .sc_live_panel_show_time_modal_btn {
                padding: 5px 20px;
            }
        `;

        document.head.appendChild(sc_live_panel_show_time_modal_style);

        let sc_live_panel_show_time_modal_html = document.createElement('div');
        sc_live_panel_show_time_modal_html.id = 'sc_live_panel_show_time_config_div';
        sc_live_panel_show_time_modal_html.className = 'sc_live_panel_show_time_config_modal';
        sc_live_panel_show_time_modal_html.innerHTML = `
                <div class="sc_live_panel_show_time_modal_content">
                    <span class="sc_live_panel_show_time_close">&times;</span>
                    <p>所有模式下留言显示自定义设置：</p>
                    <form id="sc_live_panel_show_time_form">
                        <label class="sc_model_div_label">若选择非默认选项，过期检查启动 / 继续（SC过期则自动隐藏）</label>
                        <br>
                        <br>
                        <div class="sc_live_panel_show_time_radio_group">
                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_always_show_option" name="sc_live_panel_show_time_option" value="0" checked />
                                <label for="sc_live_panel_show_time_always_show_option">默认一直显示</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_30s_option" name="sc_live_panel_show_time_option" value="1" />
                                <label for="sc_live_panel_show_time_30s_option">过期距离SC发送30秒</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_minute_option" name="sc_live_panel_show_time_option" value="2" />
                                <label for="sc_live_panel_show_time_minute_option">过期距离SC发送1~120分钟</label>
                                <input id="sc_live_panel_show_time_sc_input" type="number" min="1" max="120" value="2" style="color: #999;"/>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_option" name="sc_live_panel_show_time_option" value="3" />
                                <label for="sc_live_panel_show_time_sc_option">依照SC的时间过期</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_and_minute_option" name="sc_live_panel_show_time_option" value="4" />
                                <label for="sc_live_panel_show_time_sc_and_minute_option">依照SC的时间过期，同时最多距离SC发送1~120分钟</label>
                                <input id="sc_live_panel_show_time_sc_and_most_time_input" type="number" min="1" max="120" value="2" style="color: #999;"/>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_and_second_option" name="sc_live_panel_show_time_option" value="5" />
                                <label for="sc_live_panel_show_time_sc_and_second_option">过期距离SC发送30~300秒</label>
                                <input id="sc_live_panel_show_time_sc_and_most_second_input" type="number" min="30" max="300" value="30" style="color: #999;"/>
                            </div>
                            <br>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_show_time_click_stop" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_show_time_click_stop" class="sc_live_panel_show_time_checkbox_inline">点击【不记忆地显示醒目留言列表】后，过期检查暂停；点击【不记忆地隐藏过期醒目留言】后，过期检查继续</label>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_not_show_now_time_sc" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_not_show_now_time_sc" class="sc_live_panel_show_time_checkbox_inline">进入直播间的时候，不显示直播间正在挂着的SC</label>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_not_show_local_sc" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_not_show_local_sc" class="sc_live_panel_show_time_checkbox_inline">进入直播间的时候，不显示保存在本地的往期SC</label>
                        </div>
                    </form>
                    <div class="sc_live_panel_show_time_btn_div">
                        <button id="sc_live_panel_show_time_cancel_btn" class="sc_live_panel_show_time_modal_btn sc_live_panel_show_time_modal_close_btn">取消</button>
                        <button id="sc_live_panel_show_time_confirm_btn" class="sc_live_panel_show_time_modal_btn sc_live_panel_show_time_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_live_panel_show_time_modal_html);

        let sc_live_panel_show_time_modal_html_fullscreen = document.createElement('div');
        sc_live_panel_show_time_modal_html_fullscreen.id = 'sc_live_panel_show_time_config_div_fullscreen';
        sc_live_panel_show_time_modal_html_fullscreen.className = 'sc_live_panel_show_time_config_modal';
        sc_live_panel_show_time_modal_html_fullscreen.innerHTML = `
                <div class="sc_live_panel_show_time_modal_content">
                    <span class="sc_live_panel_show_time_close">&times;</span>
                    <p>所有模式下留言显示自定义设置：</p>
                    <form id="sc_live_panel_show_time_form_fullscreen">
                        <label class="sc_model_div_label">若选择非默认选项，过期检查启动 / 继续（SC过期则自动隐藏）</label>
                        <br>
                        <br>
                        <div class="sc_live_panel_show_time_radio_group_fullscreen">
                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_always_show_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="0" checked />
                                <label for="sc_live_panel_show_time_always_show_option_fullscreen">默认一直显示</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_30s_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="1" />
                                <label for="sc_live_panel_show_time_30s_option_fullscreen">过期距离SC发送30秒</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_minute_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="2" />
                                <label for="sc_live_panel_show_time_minute_option_fullscreen">过期距离SC发送1~120分钟</label>
                                <input id="sc_live_panel_show_time_sc_input_fullscreen" type="number" min="1" max="120" value="2" style="color: #999;"/>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="3" />
                                <label for="sc_live_panel_show_time_sc_option_fullscreen">依照SC的时间过期</label>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_and_minute_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="4" />
                                <label for="sc_live_panel_show_time_sc_and_minute_option_fullscreen">依照SC的时间过期，同时最多距离SC发送1~120分钟</label>
                                <input id="sc_live_panel_show_time_sc_and_most_time_input_fullscreen" type="number" min="1" max="120" value="2" style="color: #999;"/>
                            </div>

                            <div class="sc_live_panel_show_time_form_item">
                                <input type="radio" id="sc_live_panel_show_time_sc_and_second_option_fullscreen" name="sc_live_panel_show_time_option_fullscreen" value="5" />
                                <label for="sc_live_panel_show_time_sc_and_second_option_fullscreen">过期距离SC发送30~300秒</label>
                                <input id="sc_live_panel_show_time_sc_and_most_second_input_fullscreen" type="number" min="30" max="300" value="30" style="color: #999;"/>
                            </div>
                            <br>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_show_time_click_stop_fullscreen" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_show_time_click_stop_fullscreen" class="sc_live_panel_show_time_checkbox_inline">点击【不记忆地显示醒目留言列表】后，过期检查暂停；点击【不记忆地隐藏过期醒目留言】后，过期检查继续</label>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_not_show_now_time_sc_fullscreen" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_not_show_now_time_sc_fullscreen" class="sc_live_panel_show_time_checkbox_inline">进入直播间的时候，不显示直播间正在挂着的SC</label>
                        </div>
                        <div class="sc_live_panel_show_time_checkbox_div">
                            <input type="checkbox" id="sc_live_panel_not_show_local_sc_fullscreen" class="sc_live_panel_show_time_checkbox_inline"/>
                            <label for="sc_live_panel_not_show_local_sc_fullscreen" class="sc_live_panel_show_time_checkbox_inline">进入直播间的时候，不显示保存在本地的往期SC</label>
                        </div>
                    </form>
                    <div class="sc_live_panel_show_time_btn_div_fullscreen">
                        <button id="sc_live_panel_show_time_cancel_btn" class="sc_live_panel_show_time_modal_btn sc_live_panel_show_time_modal_close_btn">取消</button>
                        <button id="sc_live_panel_show_time_confirm_btn_fullscreen" class="sc_live_panel_show_time_modal_btn sc_live_panel_show_time_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_live_panel_show_time_modal_html_fullscreen);

        function sc_close_live_panel_show_time_modal() {
            $(document).find('.sc_live_panel_show_time_config_modal').hide();
        }

        $(document).on('click', '.sc_live_panel_show_time_close, .sc_live_panel_show_time_modal_close_btn', function() {
            sc_close_live_panel_show_time_modal();
        });

        $(document).on('click', '#sc_live_panel_show_time_confirm_btn', function(e) {

            let sc_panel_show_time_option_val = $(document).find('.sc_live_panel_show_time_radio_group input[name="sc_live_panel_show_time_option"]:checked').val();
            sc_panel_show_time_mode = parseInt(sc_panel_show_time_option_val, 10);

            sc_panel_show_time_each_same = 0.5;
            if (sc_panel_show_time_mode === 0) {
                $(document).find('.sc_long_item').show();
            } else if (sc_panel_show_time_mode === 2) {
                let the_sc_panel_show_time_sc_val = $(document).find('#sc_live_panel_show_time_sc_input').val();
                if (the_sc_panel_show_time_sc_val) {
                    sc_panel_show_time_each_same = parseInt(the_sc_panel_show_time_sc_val, 10);
                } else {
                    sc_panel_show_time_each_same = 1;
                }
            } else if (sc_panel_show_time_mode === 4) {
                let the_sc_panel_show_time_sc_and_most_time_val = $(document).find('#sc_live_panel_show_time_sc_and_most_time_input').val();
                if (the_sc_panel_show_time_sc_and_most_time_val) {
                    sc_panel_show_time_each_same = parseInt(the_sc_panel_show_time_sc_and_most_time_val, 10);
                } else {
                    sc_panel_show_time_each_same = 1;
                }
            } else if (sc_panel_show_time_mode === 5) {
                let the_sc_panel_show_time_sc_and_most_second_val = $(document).find('#sc_live_panel_show_time_sc_and_most_second_input').val();
                if (the_sc_panel_show_time_sc_and_most_second_val) {
                    if (the_sc_panel_show_time_sc_and_most_second_val < 30) {
                        the_sc_panel_show_time_sc_and_most_second_val = 30;
                    }
                    sc_panel_show_time_each_same = parseFloat((parseInt(the_sc_panel_show_time_sc_and_most_second_val, 10)/60).toFixed(3));
                } else {
                    sc_panel_show_time_each_same = 0.5;
                }
            }

            sc_live_panel_show_time_click_stop_flag = $(document).find('#sc_live_panel_show_time_click_stop').is(':checked');
            sc_live_panel_not_show_now_time_sc_flag = $(document).find('#sc_live_panel_not_show_now_time_sc').is(':checked');
            sc_live_panel_not_show_local_sc_flag = $(document).find('#sc_live_panel_not_show_local_sc').is(':checked');

            sc_panel_show_time_mode_config_store();
            sc_panel_show_time_each_same_config_store();
            sc_live_panel_show_time_click_stop_flag_config_store();
            sc_live_panel_not_show_now_time_sc_flag_config_store();
            sc_live_panel_not_show_local_sc_flag_config_store();

            if (sc_panel_show_time_mode) {
                // 重启过期检查
                $(document).find('.sc_long_list').removeClass('sc_long_expire_check_stop');
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_live_panel_show_time_confirm_btn_fullscreen', function(e) {

            let sc_panel_show_time_option_val = $(document).find('.sc_live_panel_show_time_radio_group_fullscreen input[name="sc_live_panel_show_time_option_fullscreen"]:checked').val();
            sc_panel_show_time_mode = parseInt(sc_panel_show_time_option_val, 10);

            sc_panel_show_time_each_same = 0.5;
            if (sc_panel_show_time_mode === 0) {
                $(document).find('.sc_long_item').show();
            } else if (sc_panel_show_time_mode === 2) {
                let the_sc_panel_show_time_sc_val = $(document).find('#sc_live_panel_show_time_sc_input_fullscreen').val();
                if (the_sc_panel_show_time_sc_val) {
                    sc_panel_show_time_each_same = parseInt(the_sc_panel_show_time_sc_val, 10);
                } else {
                    sc_panel_show_time_each_same = 1;
                }
            } else if (sc_panel_show_time_mode === 4) {
                let the_sc_panel_show_time_sc_and_most_time_val = $(document).find('#sc_live_panel_show_time_sc_and_most_time_input_fullscreen').val();
                if (the_sc_panel_show_time_sc_and_most_time_val) {
                    sc_panel_show_time_each_same = parseInt(the_sc_panel_show_time_sc_and_most_time_val, 10);
                } else {
                    sc_panel_show_time_each_same = 1;
                }
            } else if (sc_panel_show_time_mode === 5) {
                let the_sc_panel_show_time_sc_and_most_second_val = $(document).find('#sc_live_panel_show_time_sc_and_most_second_input_fullscreen').val();
                if (the_sc_panel_show_time_sc_and_most_second_val) {
                    if (the_sc_panel_show_time_sc_and_most_second_val < 30) {
                        the_sc_panel_show_time_sc_and_most_second_val = 30;
                    }
                    sc_panel_show_time_each_same = parseFloat((parseInt(the_sc_panel_show_time_sc_and_most_second_val, 10)/60).toFixed(3));
                } else {
                    sc_panel_show_time_each_same = 0.5;
                }
            }

            sc_live_panel_show_time_click_stop_flag = $(document).find('#sc_live_panel_show_time_click_stop_fullscreen').is(':checked');
            sc_live_panel_not_show_now_time_sc_flag = $(document).find('#sc_live_panel_not_show_now_time_sc_fullscreen').is(':checked');
            sc_live_panel_not_show_local_sc_flag = $(document).find('#sc_live_panel_not_show_local_sc_fullscreen').is(':checked');

            sc_panel_show_time_mode_config_store();
            sc_panel_show_time_each_same_config_store();
            sc_live_panel_show_time_click_stop_flag_config_store();
            sc_live_panel_not_show_now_time_sc_flag_config_store();
            sc_live_panel_not_show_local_sc_flag_config_store();

            if (sc_panel_show_time_mode) {
                // 重启过期检查
                $(document).find('.sc_long_list').removeClass('sc_long_expire_check_stop');
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
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
            sc_panel_width_config = parseInt(sc_panel_width_config, 10);
            if (sc_panel_width_config >= 300 && sc_panel_width_config <= 500) {
                sc_live_panel_width_change(sc_panel_width_config);
            } else {
                if (sc_panel_width_config < 300) {
                    sc_live_panel_width_change(300);
                } else if (sc_panel_width_config > 500) {
                    sc_live_panel_width_change(500);
                } else {
                    sc_live_panel_width_change(325);
                }
            }
            sc_rectangle_width_store();
            sc_panel_width_config_apply();

            sc_close_panel_width_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_panel_width_confirm_btn_fullscreen', function(e) {
            let sc_panel_width_config = $(document).find('#sc_panel_width_input_fullscreen').val();
            sc_panel_width_config = parseInt(sc_panel_width_config, 10);
            if (sc_panel_width_config >= 300 && sc_panel_width_config <= 500) {
                sc_live_panel_width_change(sc_panel_width_config);
            } else {
                if (sc_panel_width_config < 300) {
                    sc_live_panel_width_change(300);
                } else if (sc_panel_width_config > 500) {
                    sc_live_panel_width_change(500);
                } else {
                    sc_live_panel_width_change(325);
                }
            }
            sc_rectangle_width_store();
            sc_panel_width_config_apply();

            sc_close_panel_width_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        let sc_panel_height_modal_style = document.createElement('style');
        sc_panel_height_modal_style.textContent = `
            .sc_panel_height_config_modal {
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

            .sc_panel_height_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_panel_height_modal_content p {
                color: #000;
            }

            .sc_panel_height_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_panel_height_close:hover,
            .sc_panel_height_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_panel_height_btn_div {
                text-align: center;
                margin-top: 20px;
            }

            .sc_panel_height_btn_div_fullscreen {
                text-align: center;
                margin-top: 30px;
            }

            #sc_panel_height_input_div {
                text-align: center;
                margin-top: 20px;
            }

            #sc_panel_height_input_div label {
                color: #000;
            }

            #sc_panel_height_input_div_fullscreen {
                text-align: center;
                margin-top: 20px;
            }

            #sc_panel_height_input_div_fullscreen label {
                color: #000;
            }

            #sc_panel_height_cancel_btn {
                float: left;
            }

            #sc_panel_height_cancel_btn_fullscreen {
                float: left;
            }

            #sc_panel_height_confirm_btn {
                float: right;
            }

            #sc_panel_height_confirm_btn_fullscreen {
                float: right;
            }

            .sc_panel_height_modal_btn {
                padding: 3px 10px;
            }
            .sc_panel_height_modal_width_1_btn,
            .sc_panel_height_modal_width_2_btn,
            .sc_panel_height_modal_width_3_btn,
            .sc_panel_height_modal_width_4_btn,
            .sc_panel_height_modal_width_5_btn{
                margin-left: 10px;
            }
        `;

        document.head.appendChild(sc_panel_height_modal_style);

        let sc_panel_height_modal_html = document.createElement('div');
        sc_panel_height_modal_html.id = 'sc_panel_height_config_div';
        sc_panel_height_modal_html.className = 'sc_panel_height_config_modal';
        sc_panel_height_modal_html.innerHTML = `
                <div class="sc_panel_height_modal_content">
                    <span class="sc_panel_height_close">&times;</span>
                    <p>记录板高度自定义设置：</p>
                    <form id="sc_panel_height_form">
                        <div id="sc_panel_height_input_div">
                            <label for="sc_panel_height_input">0-500(px)：</label>
                            <input type="number" class="sc_panel_height_input_value" id="sc_panel_height_input" min="0" max="500" value="170"/>
                        </div>
                    </form>

                    <div class="sc_panel_height_btn_div">
                        <button id="sc_panel_height_cancel_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_close_btn">取消</button>
                        <button id="sc_panel_height_default_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_default_btn">默认</button>
                        <button id="sc_panel_height_1_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_width_1_btn">最小</button>
                        <button id="sc_panel_height_2_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_width_2_btn">高一</button>
                        <button id="sc_panel_height_3_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_width_3_btn">高二</button>
                        <button id="sc_panel_height_4_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_width_4_btn">高三</button>
                        <button id="sc_panel_height_5_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_width_5_btn">最大</button>
                        <button id="sc_panel_height_confirm_btn" class="sc_panel_height_modal_btn sc_panel_height_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_panel_height_modal_html);

        let sc_panel_height_modal_html_fullscreen = document.createElement('div');
        sc_panel_height_modal_html_fullscreen.id = 'sc_panel_height_config_div_fullscreen';
        sc_panel_height_modal_html_fullscreen.className = 'sc_panel_height_config_modal';
        sc_panel_height_modal_html_fullscreen.innerHTML = `
                <div class="sc_panel_height_modal_content">
                    <span class="sc_panel_height_close">&times;</span>
                    <p>记录板高度自定义设置：</p>
                    <form id="sc_panel_height_form_fullscreen">
                        <div id="sc_panel_height_input_div_fullscreen">
                            <label for="sc_panel_height_input_fullscreen">0-500(px)：</label>
                            <input type="number" class="sc_panel_height_input_value" id="sc_panel_height_input_fullscreen" min="0" max="500" value="170"/>
                        </div>
                    </form>

                    <div class="sc_panel_height_btn_div_fullscreen">
                        <button id="sc_panel_height_cancel_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_close_btn">取消</button>
                        <button id="sc_panel_height_default_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_default_btn">默认</button>
                        <button id="sc_panel_height_1_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_width_1_btn">最小</button>
                        <button id="sc_panel_height_2_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_width_2_btn">高一</button>
                        <button id="sc_panel_height_3_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_width_3_btn">高二</button>
                        <button id="sc_panel_height_4_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_width_4_btn">高三</button>
                        <button id="sc_panel_height_5_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_width_5_btn">最大</button>
                        <button id="sc_panel_height_confirm_btn_fullscreen" class="sc_panel_height_modal_btn sc_panel_height_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_panel_height_modal_html_fullscreen);

        function sc_close_panel_height_modal() {
            $(document).find('.sc_panel_height_config_modal').hide();
        }

        $(document).on('click', '.sc_panel_height_close, .sc_panel_height_modal_close_btn', function() {
            sc_close_panel_height_modal();
        });

        $(document).on('click', '.sc_panel_height_modal_default_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(400);
        });

        $(document).on('click', '.sc_panel_height_modal_width_1_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(0);
        });

        $(document).on('click', '.sc_panel_height_modal_width_2_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(50);
        });

        $(document).on('click', '.sc_panel_height_modal_width_3_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(110);
        });

        $(document).on('click', '.sc_panel_height_modal_width_4_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(170);
        });

        $(document).on('click', '.sc_panel_height_modal_width_5_btn', function() {
            $(document).find('.sc_panel_height_input_value').val(500);
        });

        $(document).on('click', '#sc_panel_height_confirm_btn', function(e) {
            sc_side_fold_hide_list_ing_flag = false;

            let the_phc_sc_panel_fold_mode = sc_panel_fold_mode;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_phc_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            }

            let sc_phc_long_list = $(document).find('.sc_long_list');
            let sc_panel_height_config = $(document).find('#sc_panel_height_input').val();
            sc_panel_height_config = parseInt(sc_panel_height_config, 10);
            if (sc_panel_height_config >= 0 && sc_panel_height_config <= 500) {
                sc_live_panel_height_change(sc_panel_height_config);
                sc_phc_long_list.attr('data-height', sc_panel_height_config);

                if (sc_panel_height_config === 0) {
                    sc_side_fold_hide_list_ing_flag = true;
                }
            } else {
                if (sc_panel_height_config < 0) {
                    sc_live_panel_height_change(0);
                    sc_phc_long_list.attr('data-height', 0);

                    sc_side_fold_hide_list_ing_flag = true;
                } else if (sc_panel_height_config > 500) {
                    sc_live_panel_height_change(500);
                    sc_phc_long_list.attr('data-height', 500);
                } else {
                    sc_live_panel_height_change(170);
                    sc_phc_long_list.attr('data-height', 170);
                }
            }
            sc_panel_list_height_store();
            sc_panel_list_height_config_apply();

            if (sc_side_fold_custom_first_class && the_phc_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && the_phc_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
            if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

            if (sc_side_fold_custom_first_class && the_phc_sc_panel_fold_mode === 1 && !sc_live_sc_to_danmu_show_flag) { sc_side_fold_custom_auto_run_flag = false; sc_custom_config_apply(sc_side_fold_custom_first_class); }

            sc_close_panel_height_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_panel_height_confirm_btn_fullscreen', function(e) {
            sc_side_fold_hide_list_ing_flag = false;

            let the_phc_sc_panel_fold_mode = sc_panel_fold_mode;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_phc_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
            }

            let sc_phc_long_list = $(document).find('.sc_long_list');
            let sc_panel_height_config = $(document).find('#sc_panel_height_input_fullscreen').val();
            sc_panel_height_config = parseInt(sc_panel_height_config, 10);
            if (sc_panel_height_config >= 0 && sc_panel_height_config <= 500) {
                sc_live_panel_height_change(sc_panel_height_config);
                sc_phc_long_list.attr('data-height', sc_panel_height_config);

                if (sc_panel_height_config === 0) {
                    sc_side_fold_hide_list_ing_flag = true;
                }
            } else {
                if (sc_panel_height_config < 0) {
                    sc_live_panel_height_change(0);
                    sc_phc_long_list.attr('data-height', 0);

                    sc_side_fold_hide_list_ing_flag = true;
                } else if (sc_panel_height_config > 500) {
                    sc_live_panel_height_change(500);
                    sc_phc_long_list.attr('data-height', 500);
                } else {
                    sc_live_panel_height_change(170);
                    sc_phc_long_list.attr('data-height', 170);
                }
            }
            sc_panel_list_height_store();
            sc_panel_list_height_config_apply();

            if (sc_side_fold_custom_first_class && the_phc_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
            if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

            if (sc_side_fold_custom_each_same_time_class && the_phc_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
            if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }

            if (sc_side_fold_custom_first_class && the_phc_sc_panel_fold_mode === 1 && !sc_live_sc_to_danmu_show_flag) { sc_side_fold_custom_auto_run_flag = false; sc_custom_config_apply(sc_side_fold_custom_first_class); }

            sc_close_panel_height_modal();
            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        let sc_item_order_modal_style = document.createElement('style');
        sc_item_order_modal_style.textContent = `
            .sc_item_order_config_modal {
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

            .sc_item_order_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_item_order_modal_content p {
                color: #000;
            }

            .sc_item_order_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_item_order_close:hover,
            .sc_item_order_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_item_order_radio_group {
                display: inline-flex;
                color: #000;
            }

            .sc_item_order_radio_group_fullscreen {
                display: inline-flex;
                color: #000;
            }

            .sc_item_order_radio_group label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_item_order_radio_group_fullscreen label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_item_order_btn_div {
                margin-top: 30px;
            }

            .sc_item_order_btn_div_fullscreen {
                margin-top: 30px;
            }

            #sc_item_order_form {
                margin-top: 30px;
                text-align: center;
            }

            #sc_item_order_form_fullscreen {
                margin-top: 30px;
                text-align: center;
            }

            #sc_item_order_confirm_btn {
                float: right;
            }

            #sc_item_order_confirm_btn_fullscreen {
                float: right;
            }

            .sc_item_order_modal_btn {
                padding: 5px 20px;
            }
        `;

        document.head.appendChild(sc_item_order_modal_style);

        let sc_item_order_modal_html = document.createElement('div');
        sc_item_order_modal_html.id = 'sc_item_order_config_div';
        sc_item_order_modal_html.className = 'sc_item_order_config_modal';
        sc_item_order_modal_html.innerHTML = `
                <div class="sc_item_order_modal_content">
                    <span class="sc_item_order_close">&times;</span>
                    <p>设置记录板留言的排列顺序：</p>
                    <form id="sc_item_order_form">
                        <div class="sc_item_order_radio_group">
                            <input type="radio" id="sc_item_order_down_option" name="sc_item_order_option" value="0" checked />
                            <label for="sc_item_order_down_option">从上往下（最新的在顶部）</label>

                            <input type="radio" id="sc_item_order_up_option" name="sc_item_order_option" value="1" />
                            <label for="sc_item_order_up_option">从下往上（最新的在底部）</label>
                        </div>
                    </form>
                    <div class="sc_item_order_btn_div">
                        <button id="sc_item_order_cancel_btn" class="sc_item_order_modal_btn sc_item_order_modal_close_btn">取消</button>
                        <button id="sc_item_order_confirm_btn" class="sc_item_order_modal_btn sc_item_order_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_item_order_modal_html);

        let sc_item_order_modal_html_fullscreen = document.createElement('div');
        sc_item_order_modal_html_fullscreen.id = 'sc_item_order_config_div_fullscreen';
        sc_item_order_modal_html_fullscreen.className = 'sc_item_order_config_modal';
        sc_item_order_modal_html_fullscreen.innerHTML = `
                <div class="sc_item_order_modal_content">
                    <span class="sc_item_order_close">&times;</span>
                    <p>设置记录板留言的排列顺序：</p>
                    <form id="sc_item_order_form_fullscreen">
                        <div class="sc_item_order_radio_group_fullscreen">
                            <input type="radio" id="sc_item_order_down_option_fullscreen" name="sc_item_order_option_fullscreen" value="0" checked />
                            <label for="sc_item_order_down_option_fullscreen">从上往下（最新的在顶部）</label>

                            <input type="radio" id="sc_item_order_up_option_fullscreen" name="sc_item_order_option_fullscreen" value="1" />
                            <label for="sc_item_order_up_option_fullscreen">从下往上（最新的在底部）</label>
                        </div>
                    </form>
                    <div class="sc_item_order_btn_div_fullscreen">
                        <button id="sc_item_order_cancel_btn_fullscreen" class="sc_item_order_modal_btn sc_item_order_modal_close_btn">取消</button>
                        <button id="sc_item_order_confirm_btn_fullscreen" class="sc_item_order_modal_btn sc_item_order_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_item_order_modal_html_fullscreen);

        function sc_close_item_order_modal() {
            $(document).find('.sc_item_order_config_modal').hide();
        }

        $(document).on('click', '.sc_item_order_close, .sc_item_order_modal_close_btn', function() {
            sc_close_item_order_modal();
        });

        $(document).on('click', '#sc_item_order_confirm_btn', function(e) {
            let sc_item_order_select_val = $(document).find('.sc_item_order_radio_group input[name="sc_item_order_option"]:checked').val();
            let old_sc_item_order_up_flag = sc_item_order_up_flag;
            if (sc_item_order_select_val === '0') {
                sc_item_order_up_flag = false;
            } else if (sc_item_order_select_val === '1') {
                sc_item_order_up_flag = true;
            }

            sc_close_item_order_modal();

            if (old_sc_item_order_up_flag === sc_item_order_up_flag) {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            } else {
                sc_item_order_up_flag_store();
                alert('更新设置成功！刷新页面后生效~');
                unsafeWindow.location.reload();
            }
        });

        $(document).on('click', '#sc_item_order_confirm_btn_fullscreen', function(e) {
            let sc_item_order_select_val = $(document).find('.sc_item_order_radio_group_fullscreen input[name="sc_item_order_option_fullscreen"]:checked').val();
            let old_sc_item_order_up_flag = sc_item_order_up_flag;
            if (sc_item_order_select_val === '0') {
                sc_item_order_up_flag = false;
            } else if (sc_item_order_select_val === '1') {
                sc_item_order_up_flag = true;
            }

            sc_close_item_order_modal();

            if (old_sc_item_order_up_flag === sc_item_order_up_flag) {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            } else {
                sc_item_order_up_flag_store();
                alert('更新设置成功！刷新页面后生效~');
                unsafeWindow.location.reload();
            }
        });

        let sc_live_sc_to_danmu_show_modal_style = document.createElement('style');
        sc_live_sc_to_danmu_show_modal_style.textContent = `
              .sc_live_sc_to_danmu_show_config_modal {
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

              .sc_live_sc_to_danmu_show_modal_content {
                  background-color: #fefefe;
                  margin: 15% auto;
                  padding: 20px;
                  border: 1px solid #888;
                  width: 45%;
              }

              .sc_live_sc_to_danmu_show_modal_content p {
                  color: #000;
              }

              .sc_modal_label_tip {
                  color: #000;
              }

              .sc_live_sc_to_danmu_show_close {
                  color: #aaa;
                  float: right;
                  font-size: 28px;
                  font-weight: bold;
              }

              .sc_live_sc_to_danmu_show_close:hover,
              .sc_live_sc_to_danmu_show_close:focus {
                  color: black;
                  text-decoration: none;
                  cursor: pointer;
              }

              .sc_live_sc_to_danmu_show_radio_group {
                  display: inline-flex;
                  text-align: center;
                  color: #000;
                  margin-top: 10px;
                  margin-bottom: 10px;
              }
              .sc_live_sc_to_danmu_show_radio_group input[type="radio"] {
                  margin-right: 10px;
              }

              .sc_live_sc_to_danmu_show_radio_group label {
                  margin-right: 30px;
              }

              .sc_live_sc_to_danmu_show_radio_group_fullscreen {
                  display: inline-flex;
                  text-align: center;
                  color: #000;
              }
              .sc_live_sc_to_danmu_show_radio_group_fullscreen input[type="radio"] {
                  margin-right: 10px;
              }

              .sc_live_sc_to_danmu_show_radio_group_fullscreen label {
                  margin-right: 30px;
              }

              .sc_live_sc_to_danmu_show_btn_div {
                  margin-top: 30px;
              }

              .sc_live_sc_to_danmu_show_btn_div_fullscreen {
                  margin-top: 30px;
              }

              #sc_live_sc_to_danmu_show_confirm_btn {
                  float: right;
              }

              #sc_live_sc_to_danmu_show_confirm_btn_fullscreen {
                  float: right;
              }

              .sc_live_sc_to_danmu_show_modal_btn {
                  padding: 3px 10px;
              }

              #sc_live_sc_to_danmu_show_form {
                  text-align: center;
              }
              #sc_live_sc_to_danmu_show_form_fullscreen {
                  margin-top: 20px;
                  text-align: center;
              }
              .sc_live_sc_to_danmu_show_checkbox_inline {
                  vertical-align: middle;
                  display: inline-block;
                  color: #000;
              }
              .sc_model_div_label {
                  color: #000;
              }
        `;

        document.head.appendChild(sc_live_sc_to_danmu_show_modal_style);

        let sc_live_sc_to_danmu_show_modal_html = document.createElement('div');
        sc_live_sc_to_danmu_show_modal_html.id = 'sc_live_sc_to_danmu_show_config_div';
        sc_live_sc_to_danmu_show_modal_html.className = 'sc_live_sc_to_danmu_show_config_modal';
        sc_live_sc_to_danmu_show_modal_html.innerHTML = `
                <div class="sc_live_sc_to_danmu_show_modal_content">
                    <span class="sc_live_sc_to_danmu_show_close">&times;</span>
                    <p>设置醒目留言以弹幕来展现：</p>
                    <form id="sc_live_sc_to_danmu_show_form">
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_sc_to_danmu_show_checkbox" class="sc_live_sc_to_danmu_show_checkbox_inline"/>
                            <label for="sc_live_sc_to_danmu_show_checkbox" class="sc_live_sc_to_danmu_show_checkbox_inline">设置醒目留言以弹幕来展现（侧折模式不再将SC自动展现）</label>
                        </div>
                        <br>
                        <div class="sc_live_sc_to_danmu_show_radio_group">
                            <input type="radio" id="sc_live_sc_to_danmu_show_top_option" name="sc_live_sc_to_danmu_show_location_option" value="0" checked />
                            <label for="sc_live_sc_to_danmu_show_top_option">显示在顶部 / 底部（优先顶部）</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_middle_option" name="sc_live_sc_to_danmu_show_location_option" value="1" />
                            <label for="sc_live_sc_to_danmu_show_middle_option">显示在中间随机</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_bottom_option" name="sc_live_sc_to_danmu_show_location_option" value="2" />
                            <label for="sc_live_sc_to_danmu_show_bottom_option">显示在底部 / 顶部（优先底部）</label>
                        </div>
                        <br>
                        <br>
                        <label class="sc_model_div_label">高亮弹幕样式选择：</label>
                        <div class="sc_live_sc_to_danmu_show_radio_group">
                            <input type="radio" id="sc_live_sc_to_danmu_show_half_opaque_big_option" name="sc_live_sc_to_danmu_show_mode_option" value="0" checked />
                            <label for="sc_live_sc_to_danmu_show_half_opaque_big_option">半透明 [样式较大]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_half_opaque_small_option" name="sc_live_sc_to_danmu_show_mode_option" value="1" />
                            <label for="sc_live_sc_to_danmu_show_half_opaque_small_option">半透明 [样式较小]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_no_opaque_big_option" name="sc_live_sc_to_danmu_show_mode_option" value="2" />
                            <label for="sc_live_sc_to_danmu_show_no_opaque_big_option">不透明 [样式较大]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_no_opaque_small_option" name="sc_live_sc_to_danmu_show_mode_option" value="3" />
                            <label for="sc_live_sc_to_danmu_show_no_opaque_small_option">不透明 [样式较小]</label>
                        </div>
                        <br>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_sc_to_danmu_no_remain_checkbox" class="sc_live_sc_to_danmu_show_checkbox_inline"/>
                            <label for="sc_live_sc_to_danmu_no_remain_checkbox" class="sc_live_sc_to_danmu_show_checkbox_inline">SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）</label>
                        </div>
                    </form>
                    <div class="sc_live_sc_to_danmu_show_btn_div">
                        <button id="sc_live_sc_to_danmu_show_cancel_btn" class="sc_live_sc_to_danmu_show_modal_btn sc_live_sc_to_danmu_show_modal_close_btn">取消</button>
                        <button id="sc_live_sc_to_danmu_show_confirm_btn" class="sc_live_sc_to_danmu_show_modal_btn sc_live_sc_to_danmu_show_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_live_sc_to_danmu_show_modal_html);

        let sc_live_sc_to_danmu_show_modal_html_fullscreen = document.createElement('div');
        sc_live_sc_to_danmu_show_modal_html_fullscreen.id = 'sc_live_sc_to_danmu_show_config_div_fullscreen';
        sc_live_sc_to_danmu_show_modal_html_fullscreen.className = 'sc_live_sc_to_danmu_show_config_modal';
        sc_live_sc_to_danmu_show_modal_html_fullscreen.innerHTML = `
                <div class="sc_live_sc_to_danmu_show_modal_content">
                    <span class="sc_live_sc_to_danmu_show_close">&times;</span>
                    <p>设置醒目留言以弹幕来展现：</p>
                    <form id="sc_live_sc_to_danmu_show_form_fullscreen">
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_sc_to_danmu_show_checkbox_fullscreen" class="sc_live_sc_to_danmu_show_checkbox_inline"/>
                            <label for="sc_live_sc_to_danmu_show_checkbox_fullscreen" class="sc_live_sc_to_danmu_show_checkbox_inline">设置醒目留言以弹幕来展现（侧折模式不再将SC自动展现）</label>
                        </div>
                        <br>
                        <div class="sc_live_sc_to_danmu_show_radio_group_fullscreen">
                            <input type="radio" id="sc_live_sc_to_danmu_show_top_option_fullscreen" name="sc_live_sc_to_danmu_show_location_option_fullscreen" value="0" checked />
                            <label for="sc_live_sc_to_danmu_show_top_option_fullscreen">显示在顶部 / 底部（优先顶部）</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_middle_option_fullscreen" name="sc_live_sc_to_danmu_show_location_option_fullscreen" value="1" />
                            <label for="sc_live_sc_to_danmu_show_middle_option_fullscreen">显示在中间随机</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_bottom_option_fullscreen" name="sc_live_sc_to_danmu_show_location_option_fullscreen" value="2" />
                            <label for="sc_live_sc_to_danmu_show_bottom_option_fullscreen">显示在底部 / 顶部（优先底部）</label>
                        </div>
                        <br>
                        <br>
                        <label class="sc_model_div_label">高亮弹幕样式选择：</label>
                        <div class="sc_live_sc_to_danmu_show_radio_group_fullscreen">
                            <input type="radio" id="sc_live_sc_to_danmu_show_half_opaque_big_option_fullscreen" name="sc_live_sc_to_danmu_show_mode_option_fullscreen" value="0" checked />
                            <label for="sc_live_sc_to_danmu_show_half_opaque_big_option_fullscreen">半透明 [样式较大]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_half_opaque_small_option_fullscreen" name="sc_live_sc_to_danmu_show_mode_option_fullscreen" value="1" />
                            <label for="sc_live_sc_to_danmu_show_half_opaque_small_option_fullscreen">半透明 [样式较小]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_no_opaque_big_option_fullscreen" name="sc_live_sc_to_danmu_show_mode_option_fullscreen" value="2" />
                            <label for="sc_live_sc_to_danmu_show_no_opaque_big_option_fullscreen">不透明 [样式较大]</label>

                            <input type="radio" id="sc_live_sc_to_danmu_show_no_opaque_small_option_fullscreen" name="sc_live_sc_to_danmu_show_mode_option_fullscreen" value="3" />
                            <label for="sc_live_sc_to_danmu_show_no_opaque_small_option_fullscreen">不透明 [样式较小]</label>
                        </div>
                        <br>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_sc_to_danmu_no_remain_checkbox_fullscreen" class="sc_live_sc_to_danmu_show_checkbox_inline"/>
                            <label for="sc_live_sc_to_danmu_no_remain_checkbox_fullscreen" class="sc_live_sc_to_danmu_show_checkbox_inline">SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）</label>
                        </div>
                    </form>
                    <div class="sc_live_sc_to_danmu_show_btn_div_fullscreen">
                        <button id="sc_live_sc_to_danmu_show_cancel_btn" class="sc_live_sc_to_danmu_show_modal_btn sc_live_sc_to_danmu_show_modal_close_btn">取消</button>
                        <button id="sc_live_sc_to_danmu_show_confirm_btn_fullscreen" class="sc_live_sc_to_danmu_show_modal_btn sc_live_sc_to_danmu_show_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_live_sc_to_danmu_show_modal_html_fullscreen);

        function sc_close_live_sc_to_danmu_show_modal() {
            $(document).find('.sc_live_sc_to_danmu_show_config_modal').hide();
        }

        $(document).on('click', '.sc_live_sc_to_danmu_show_close, .sc_live_sc_to_danmu_show_modal_close_btn', function() {
            sc_close_live_sc_to_danmu_show_modal();
        });

        $(document).on('click', '#sc_live_sc_to_danmu_show_confirm_btn', function(e) {

            sc_live_sc_to_danmu_show_flag = $(document).find('#sc_live_sc_to_danmu_show_checkbox').is(':checked');
            sc_live_sc_to_danmu_show_flag_config_store();

            let sc_live_sc_to_danmu_show_location_select_val = $(document).find('.sc_live_sc_to_danmu_show_radio_group input[name="sc_live_sc_to_danmu_show_location_option"]:checked').val();
            sc_live_sc_to_danmu_show_location = parseInt(sc_live_sc_to_danmu_show_location_select_val, 10);
            sc_live_sc_to_danmu_show_location_config_store();

            let sc_live_sc_to_danmu_show_mode_select_val = $(document).find('.sc_live_sc_to_danmu_show_radio_group input[name="sc_live_sc_to_danmu_show_mode_option"]:checked').val();
            sc_live_sc_to_danmu_show_mode = parseInt(sc_live_sc_to_danmu_show_mode_select_val, 10);
            sc_live_sc_to_danmu_show_mode_config_store();

            sc_live_sc_to_danmu_no_remain_flag = $(document).find('#sc_live_sc_to_danmu_no_remain_checkbox').is(':checked');
            sc_live_sc_to_danmu_no_remain_flag_config_store();

            if (sc_live_sc_to_danmu_show_flag) {
                let the_sds_sc_panel_fold_mode = sc_panel_fold_mode;
                if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                    the_sds_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                }

                if (sc_side_fold_custom_first_class && the_sds_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
                if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

                if (sc_side_fold_custom_each_same_time_class && the_sds_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
                if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }
            } else {
                sc_side_fold_custom_auto_run_flag = false;

                sc_custom_config_apply(sc_side_fold_custom_first_class);
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_live_sc_to_danmu_show_confirm_btn_fullscreen', function(e) {

            sc_live_sc_to_danmu_show_flag = $(document).find('#sc_live_sc_to_danmu_show_checkbox_fullscreen').is(':checked');
            sc_live_sc_to_danmu_show_flag_config_store();

            let sc_live_sc_to_danmu_show_location_select_val = $(document).find('.sc_live_sc_to_danmu_show_radio_group_fullscreen input[name="sc_live_sc_to_danmu_show_location_option_fullscreen"]:checked').val();
            sc_live_sc_to_danmu_show_location = parseInt(sc_live_sc_to_danmu_show_location_select_val, 10);
            sc_live_sc_to_danmu_show_location_config_store();

            let sc_live_sc_to_danmu_show_mode_select_val = $(document).find('.sc_live_sc_to_danmu_show_radio_group_fullscreen input[name="sc_live_sc_to_danmu_show_mode_option_fullscreen"]:checked').val();
            sc_live_sc_to_danmu_show_mode = parseInt(sc_live_sc_to_danmu_show_mode_select_val, 10);
            sc_live_sc_to_danmu_show_mode_config_store();

            sc_live_sc_to_danmu_no_remain_flag = $(document).find('#sc_live_sc_to_danmu_no_remain_checkbox_fullscreen').is(':checked');
            sc_live_sc_to_danmu_no_remain_flag_config_store();

            if (sc_live_sc_to_danmu_show_flag) {
                let the_sds_sc_panel_fold_mode = sc_panel_fold_mode;
                if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                    the_sds_sc_panel_fold_mode = sc_panel_fold_mode_fullscreen;
                }

                if (sc_side_fold_custom_first_class && the_sds_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_first_class); }
                if (sc_side_fold_custom_first_timeout_id) { clearTimeout(sc_side_fold_custom_first_timeout_id); }

                if (sc_side_fold_custom_each_same_time_class && the_sds_sc_panel_fold_mode === 1) { sc_trigger_item_side_fold_in(sc_side_fold_custom_each_same_time_class); }
                if (sc_side_fold_custom_each_same_time_timeout_id) { clearTimeout(sc_side_fold_custom_each_same_time_timeout_id); }
            } else {
                sc_side_fold_custom_auto_run_flag = false;

                sc_custom_config_apply(sc_side_fold_custom_first_class);
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });



        let sc_fullscreen_separate_memory_modal_style = document.createElement('style');
        sc_fullscreen_separate_memory_modal_style.textContent = `
            .sc_fullscreen_separate_memory_config_modal {
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

            .sc_fullscreen_separate_memory_modal_content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_fullscreen_separate_memory_modal_content p {
                color: #000;
            }

            .sc_modal_label_tip {
                color: #000;
            }

            .sc_fullscreen_separate_memory_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_fullscreen_separate_memory_close:hover,
            .sc_fullscreen_separate_memory_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_fullscreen_separate_memory_btn_div {
                margin-top: 30px;
            }

            .sc_fullscreen_separate_memory_btn_div_fullscreen {
                margin-top: 30px;
            }

            .sc_fullscreen_separate_memory_checkbox_div{
                text-align: center;
                margin-top: 20px;
            }

            .sc_fullscreen_separate_memory_checkbox_inline {
                vertical-align: middle;
                display: inline-block;
                color: #000;
            }

            #sc_fullscreen_separate_memory_form {
                margin-top: 30px;
                text-align: center;
            }

            #sc_fullscreen_separate_memory_form_fullscreen {
                margin-top: 30px;
                text-align: center;
            }

            #sc_fullscreen_separate_memory_confirm_btn {
                float: right;
            }

            #sc_fullscreen_separate_memory_confirm_btn_fullscreen {
                float: right;
            }

            .sc_fullscreen_separate_memory_modal_btn {
                padding: 5px 20px;
            }
        `;

        document.head.appendChild(sc_fullscreen_separate_memory_modal_style);

        let sc_fullscreen_separate_memory_modal_html = document.createElement('div');
        sc_fullscreen_separate_memory_modal_html.id = 'sc_fullscreen_separate_memory_config_div';
        sc_fullscreen_separate_memory_modal_html.className = 'sc_fullscreen_separate_memory_config_modal';
        sc_fullscreen_separate_memory_modal_html.innerHTML = `
                <div class="sc_fullscreen_separate_memory_modal_content">
                    <span class="sc_fullscreen_separate_memory_close">&times;</span>
                    <p>一些设置在全屏时分开记忆：</p>
                    <form id="sc_fullscreen_separate_memory_form">
                        <div class="sc_fullscreen_separate_memory_checkbox_div">
                            <input type="checkbox" id="sc_some_fullscreen_separate_memory" class="sc_fullscreen_separate_memory_checkbox_inline"/>
                            <label for="sc_some_fullscreen_separate_memory" class="sc_fullscreen_separate_memory_checkbox_inline">全屏状态下一些配置分开单独记忆</label>
                        </div>
                        <div class="sc_modal_label_tip" style="padding: 10px 0px 10px 0px;">（宽高、主题、模式、位置、数据）</div>
                    </form>
                    <div class="sc_fullscreen_separate_memory_btn_div">
                        <button id="sc_fullscreen_separate_memory_cancel_btn" class="sc_fullscreen_separate_memory_modal_btn sc_fullscreen_separate_memory_modal_close_btn">取消</button>
                        <button id="sc_fullscreen_separate_memory_confirm_btn" class="sc_fullscreen_separate_memory_modal_btn sc_fullscreen_separate_memory_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_fullscreen_separate_memory_modal_html);

        let sc_fullscreen_separate_memory_modal_html_fullscreen = document.createElement('div');
        sc_fullscreen_separate_memory_modal_html_fullscreen.id = 'sc_fullscreen_separate_memory_config_div_fullscreen';
        sc_fullscreen_separate_memory_modal_html_fullscreen.className = 'sc_fullscreen_separate_memory_config_modal';
        sc_fullscreen_separate_memory_modal_html_fullscreen.innerHTML = `
                <div class="sc_fullscreen_separate_memory_modal_content">
                    <span class="sc_fullscreen_separate_memory_close">&times;</span>
                    <p>一些设置在全屏时分开记忆：</p>
                    <form id="sc_fullscreen_separate_memory_form_fullscreen">
                        <div class="sc_fullscreen_separate_memory_checkbox_div">
                            <input type="checkbox" id="sc_some_fullscreen_separate_memory_fullscreen" class="sc_fullscreen_separate_memory_checkbox_inline"/>
                            <label for="sc_some_fullscreen_separate_memory_fullscreen" class="sc_fullscreen_separate_memory_checkbox_inline">全屏状态下一些配置分开单独记忆</label>
                        </div>
                        <div class="sc_modal_label_tip" style="padding: 10px 0px 10px 0px;">（宽高、主题、模式、位置、数据）</div>
                    </form>
                    <div class="sc_fullscreen_separate_memory_btn_div_fullscreen">
                        <button id="sc_fullscreen_separate_memory_cancel_btn" class="sc_fullscreen_separate_memory_modal_btn sc_fullscreen_separate_memory_modal_close_btn">取消</button>
                        <button id="sc_fullscreen_separate_memory_confirm_btn_fullscreen" class="sc_fullscreen_separate_memory_modal_btn sc_fullscreen_separate_memory_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_fullscreen_separate_memory_modal_html_fullscreen);

        function sc_close_fullscreen_separate_memory_modal() {
            $(document).find('.sc_fullscreen_separate_memory_config_modal').hide();
        }

        $(document).on('click', '.sc_fullscreen_separate_memory_close, .sc_fullscreen_separate_memory_modal_close_btn', function() {
            sc_close_fullscreen_separate_memory_modal();
        });

        $(document).on('click', '#sc_fullscreen_separate_memory_confirm_btn', function(e) {
            let old_fullscreen_config_separate_memory_flag = sc_live_fullscreen_config_separate_memory_flag;
            sc_live_fullscreen_config_separate_memory_flag = $(document).find('#sc_some_fullscreen_separate_memory').is(':checked');

            if (sc_live_fullscreen_config_separate_memory_flag && !old_fullscreen_config_separate_memory_flag) {
                sc_fullscreen_separate_memory_var_copy();
            }

            sc_live_fullscreen_config_all_store();

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_fullscreen_separate_memory_confirm_btn_fullscreen', function(e) {
            let old_fullscreen_config_separate_memory_flag = sc_live_fullscreen_config_separate_memory_flag;
            sc_live_fullscreen_config_separate_memory_flag = $(document).find('#sc_some_fullscreen_separate_memory_fullscreen').is(':checked');

            if (sc_live_fullscreen_config_separate_memory_flag && !old_fullscreen_config_separate_memory_flag) {
                sc_fullscreen_separate_memory_var_copy();
            }

            sc_live_fullscreen_config_all_store();

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        let sc_live_special_tip_modal_style = document.createElement('style');
        sc_live_special_tip_modal_style.textContent = `
              .sc_live_special_tip_config_modal {
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

              .sc_live_special_tip_modal_content {
                  background-color: #fefefe;
                  margin: 15% auto;
                  padding: 20px;
                  border: 1px solid #888;
                  width: 45%;
              }

              .sc_live_special_tip_modal_content p {
                  color: #000;
              }

              .sc_modal_label_tip {
                  color: #000;
              }

              .sc_live_special_tip_close {
                  color: #aaa;
                  float: right;
                  font-size: 28px;
                  font-weight: bold;
              }

              .sc_live_special_tip_close:hover,
              .sc_live_special_tip_close:focus {
                  color: black;
                  text-decoration: none;
                  cursor: pointer;
              }

              .sc_live_special_tip_radio_group {
                  display: inline-flex;
                  text-align: center;
                  color: #000;
                  margin-top: 10px;
                  margin-bottom: 10px;
              }
              .sc_live_special_tip_radio_group input[type="radio"] {
                  margin-right: 10px;
              }

              .sc_live_special_tip_radio_group label {
                  margin-right: 30px;
              }

              .sc_live_special_tip_radio_group_fullscreen {
                  display: inline-flex;
                  text-align: center;
                  color: #000;
              }
              .sc_live_special_tip_radio_group_fullscreen input[type="radio"] {
                  margin-right: 10px;
              }

              .sc_live_special_tip_radio_group_fullscreen label {
                  margin-right: 30px;
              }

              .sc_live_special_tip_btn_div {
                  margin-top: 30px;
              }

              .sc_live_special_tip_btn_div_fullscreen {
                  margin-top: 30px;
              }

              #sc_live_special_tip_confirm_btn {
                  float: right;
              }

              #sc_live_special_tip_confirm_btn_fullscreen {
                  float: right;
              }

              .sc_live_special_tip_modal_btn {
                  padding: 3px 10px;
              }

              #sc_live_special_tip_form {
                  text-align: center;
              }
              #sc_live_special_tip_form_fullscreen {
                  margin-top: 20px;
                  text-align: center;
              }
              .sc_live_special_msg_checkbox_inline {
                  vertical-align: middle;
                  display: inline-block;
                  color: #000;
              }
              .sc_model_div_label {
                  color: #000;
              }
        `;

        document.head.appendChild(sc_live_special_tip_modal_style);

        let sc_live_special_tip_modal_html = document.createElement('div');
        sc_live_special_tip_modal_html.id = 'sc_live_special_tip_config_div';
        sc_live_special_tip_modal_html.className = 'sc_live_special_tip_config_modal';
        sc_live_special_tip_modal_html.innerHTML = `
                <div class="sc_live_special_tip_modal_content">
                    <span class="sc_live_special_tip_close">&times;</span>
                    <p>对特定用户进入直播间提示（基于数据包解析，活动页面若没数据包会失效）（本窗口所有功能都需要用户登录）：</p>
                    <form id="sc_live_special_tip_form">
                        <div class="sc_live_special_tip_radio_group">
                            <input type="radio" id="sc_live_special_tip_top_option" name="sc_live_special_tip_option" value="0" checked />
                            <label for="sc_live_special_tip_top_option">显示在顶部 / 底部（优先顶部）</label>

                            <input type="radio" id="sc_live_special_tip_middle_option" name="sc_live_special_tip_option" value="1" />
                            <label for="sc_live_special_tip_middle_option">显示在中间随机</label>

                            <input type="radio" id="sc_live_special_tip_bottom_option" name="sc_live_special_tip_option" value="2" />
                            <label for="sc_live_special_tip_bottom_option">显示在底部 / 顶部（优先底部）</label>
                        </div>
                        <div class="sc_live_special_tip_textarea_div">
                            <div class="sc_modal_label_tip" style="padding: 10px 0px 10px 0px;">规则：用户id,用户id-备注（逗号，以及横杠，逗号后可换行，不加备注就只显示用户名）</div>
                            <textarea id="sc_live_special_tip_textarea_content" style="min-width: 60%; min-height: 100px; max-width: 90%; max-height: 160px;" placeholder="示例：111111,222222,333333,444444-小张"></textarea>
                        </div>
                        <br>
                        <label class="sc_model_div_label">高亮弹幕样式选择：</label>
                        <div class="sc_live_special_tip_radio_group">
                            <input type="radio" id="sc_live_special_danmu_half_opaque_big_option" name="sc_live_special_danmu_mode_option" value="0" checked />
                            <label for="sc_live_special_danmu_half_opaque_big_option">半透明 [样式较大]</label>

                            <input type="radio" id="sc_live_special_danmu_half_opaque_small_option" name="sc_live_special_danmu_mode_option" value="1" />
                            <label for="sc_live_special_danmu_half_opaque_small_option">半透明 [样式较小]</label>

                            <input type="radio" id="sc_live_special_danmu_no_opaque_big_option" name="sc_live_special_danmu_mode_option" value="2" />
                            <label for="sc_live_special_danmu_no_opaque_big_option">不透明 [样式较大]</label>

                            <input type="radio" id="sc_live_special_danmu_no_opaque_small_option" name="sc_live_special_danmu_mode_option" value="3" />
                            <label for="sc_live_special_danmu_no_opaque_small_option">不透明 [样式较小]</label>
                        </div>
                        <div>
                            <input type="checkbox" id="sc_live_special_msg_checkbox" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_msg_checkbox" class="sc_live_special_msg_checkbox_inline">相应用户的弹幕高亮</label>
                        </div>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_special_sc_checkbox" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_sc_checkbox" class="sc_live_special_msg_checkbox_inline">相应用户的SC以高亮弹幕出现（记录板还是会显示）</label>
                        </div>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_special_sc_no_remain_checkbox" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_sc_no_remain_checkbox" class="sc_live_special_msg_checkbox_inline">SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）</label>
                        </div>
                    </form>
                    <div class="sc_live_special_tip_btn_div">
                        <button id="sc_live_special_tip_cancel_btn" class="sc_live_special_tip_modal_btn sc_live_special_tip_modal_close_btn">取消</button>
                        <button id="sc_live_special_tip_confirm_btn" class="sc_live_special_tip_modal_btn sc_live_special_tip_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_live_special_tip_modal_html);

        let sc_live_special_tip_modal_html_fullscreen = document.createElement('div');
        sc_live_special_tip_modal_html_fullscreen.id = 'sc_live_special_tip_config_div_fullscreen';
        sc_live_special_tip_modal_html_fullscreen.className = 'sc_live_special_tip_config_modal';
        sc_live_special_tip_modal_html_fullscreen.innerHTML = `
                <div class="sc_live_special_tip_modal_content">
                    <span class="sc_live_special_tip_close">&times;</span>
                    <p>对特定用户进入直播间提示（基于数据包解析，活动页面若没数据包会失效）（本窗口所有功能都需要用户登录）：</p>
                    <form id="sc_live_special_tip_form_fullscreen">
                        <div class="sc_live_special_tip_radio_group_fullscreen">
                            <input type="radio" id="sc_live_special_tip_top_option_fullscreen" name="sc_live_special_tip_option_fullscreen" value="0" checked />
                            <label for="sc_live_special_tip_top_option_fullscreen">显示在顶部 / 底部（优先顶部）</label>

                            <input type="radio" id="sc_live_special_tip_middle_option_fullscreen" name="sc_live_special_tip_option_fullscreen" value="1" />
                            <label for="sc_live_special_tip_middle_option_fullscreen">显示在中间随机</label>

                            <input type="radio" id="sc_live_special_tip_bottom_option_fullscreen" name="sc_live_special_tip_option_fullscreen" value="2" />
                            <label for="sc_live_special_tip_bottom_option_fullscreen">显示在底部 / 顶部（优先底部）</label>
                        </div>
                        <div class="sc_live_special_tip_textarea_div">
                            <div class="sc_modal_label_tip" style="padding: 10px 0px 10px 0px;">规则：用户id,用户id-备注（逗号，以及横杠，逗号后可换行，不加备注就只显示用户名）</div>
                            <textarea id="sc_live_special_tip_textarea_content_fullscreen" style="min-width: 60%; min-height: 100px; max-width: 90%; max-height: 160px;" placeholder="示例：111111,222222,333333,444444-小张"></textarea>
                        </div>
                        <br>
                        <label class="sc_model_div_label">高亮弹幕样式选择：</label>
                        <div class="sc_live_special_tip_radio_group_fullscreen">
                            <input type="radio" id="sc_live_special_danmu_half_opaque_big_option_fullscreen" name="sc_live_special_danmu_mode_option_fullscreen" value="0" checked />
                            <label for="sc_live_special_danmu_half_opaque_big_option_fullscreen">半透明 [样式较大]</label>

                            <input type="radio" id="sc_live_special_danmu_half_opaque_small_option_fullscreen" name="sc_live_special_danmu_mode_option_fullscreen" value="1" />
                            <label for="sc_live_special_danmu_half_opaque_small_option_fullscreen">半透明 [样式较小]</label>

                            <input type="radio" id="sc_live_special_danmu_no_opaque_big_option_fullscreen" name="sc_live_special_danmu_mode_option_fullscreen" value="2" />
                            <label for="sc_live_special_danmu_no_opaque_big_option_fullscreen">不透明 [样式较大]</label>

                            <input type="radio" id="sc_live_special_danmu_no_opaque_small_option_fullscreen" name="sc_live_special_danmu_mode_option_fullscreen" value="3" />
                            <label for="sc_live_special_danmu_no_opaque_small_option_fullscreen">不透明 [样式较小]</label>
                        </div>
                        <div>
                            <input type="checkbox" id="sc_live_special_msg_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_msg_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline">相应用户的弹幕高亮</label>
                        </div>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_special_sc_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_sc_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline">相应用户的SC以高亮弹幕出现（记录板还是会显示）</label>
                        </div>
                        <br>
                        <div>
                            <input type="checkbox" id="sc_live_special_sc_no_remain_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline"/>
                            <label for="sc_live_special_sc_no_remain_checkbox_fullscreen" class="sc_live_special_msg_checkbox_inline">SC的弹幕到达左侧后不再停留（默认停留10s，是为了看清SC内容，如果SC长度超过屏幕则自动不停留）</label>
                        </div>
                    </form>
                    <div class="sc_live_special_tip_btn_div_fullscreen">
                        <button id="sc_live_special_tip_cancel_btn" class="sc_live_special_tip_modal_btn sc_live_special_tip_modal_close_btn">取消</button>
                        <button id="sc_live_special_tip_confirm_btn_fullscreen" class="sc_live_special_tip_modal_btn sc_live_special_tip_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_live_special_tip_modal_html_fullscreen);

        function sc_close_live_special_tip_modal() {
            $(document).find('.sc_live_special_tip_config_modal').hide();
        }

        $(document).on('click', '.sc_live_special_tip_close, .sc_live_special_tip_modal_close_btn', function() {
            sc_close_live_special_tip_modal();
        });

        $(document).on('click', '#sc_live_special_tip_confirm_btn', function(e) {

            let sc_live_special_tip_select_val = $(document).find('.sc_live_special_tip_radio_group input[name="sc_live_special_tip_option"]:checked').val();
            sc_live_special_tip_location = parseInt(sc_live_special_tip_select_val, 10);
            sc_live_special_tip_location_store();

            sc_live_special_tip_str = $(document).find('#sc_live_special_tip_textarea_content').val().replace(/ /g, '');
            sc_live_special_tip_str = sc_live_special_tip_str.replace(/，/g, ',');
            sc_live_special_tip_str_store();

            sc_live_special_tip_str_to_arr();

            let sc_live_special_danmu_mode_select_val = $(document).find('.sc_live_special_tip_radio_group input[name="sc_live_special_danmu_mode_option"]:checked').val();
            sc_live_special_danmu_mode = parseInt(sc_live_special_danmu_mode_select_val, 10);
            sc_live_special_danmu_mode_config_store();

            sc_live_special_msg_flag = $(document).find('#sc_live_special_msg_checkbox').is(':checked');

            sc_live_special_msg_flag_config_store();

            sc_live_special_sc_flag = $(document).find('#sc_live_special_sc_checkbox').is(':checked');

            sc_live_special_sc_flag_config_store();

            sc_live_special_sc_no_remain_flag = $(document).find('#sc_live_special_sc_no_remain_checkbox').is(':checked');

            sc_live_special_sc_no_remain_flag_config_store();

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_live_special_tip_confirm_btn_fullscreen', function(e) {

            let sc_live_special_tip_select_val = $(document).find('.sc_live_special_tip_radio_group_fullscreen input[name="sc_live_special_tip_option_fullscreen"]:checked').val();
            sc_live_special_tip_location = parseInt(sc_live_special_tip_select_val, 10);
            sc_live_special_tip_location_store();

            sc_live_special_tip_str = $(document).find('#sc_live_special_tip_textarea_content_fullscreen').val().replace(/ /g, '');
            sc_live_special_tip_str = sc_live_special_tip_str.replace(/，/g, ',');
            sc_live_special_tip_str_store();

            sc_live_special_tip_str_to_arr();

            let sc_live_special_danmu_mode_select_val = $(document).find('.sc_live_special_tip_radio_group_fullscreen input[name="sc_live_special_danmu_mode_option_fullscreen"]:checked').val();
            sc_live_special_danmu_mode = parseInt(sc_live_special_danmu_mode_select_val, 10);
            sc_live_special_danmu_mode_config_store();

            sc_live_special_msg_flag = $(document).find('#sc_live_special_msg_checkbox_fullscreen').is(':checked');

            sc_live_special_msg_flag_config_store();

            sc_live_special_sc_flag = $(document).find('#sc_live_special_sc_checkbox_fullscreen').is(':checked');

            sc_live_special_sc_flag_config_store();

            sc_live_special_sc_no_remain_flag = $(document).find('#sc_live_special_sc_no_remain_checkbox_fullscreen').is(':checked');

            sc_live_special_sc_no_remain_flag_config_store();

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        let sc_live_other_modal_style = document.createElement('style');
        sc_live_other_modal_style.textContent = `
            .sc_live_other_config_modal {
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

            .sc_live_other_modal_content {
                background-color: #fefefe;
                margin: 10% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 42%;
            }

            .sc_live_other_modal_content p {
                color: #000;
            }

            .sc_live_other_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_live_other_close:hover,
            .sc_live_other_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_live_other_radio_group {
                display: inline-flex;
                color: #000;
            }

            .sc_live_other_radio_group_fullscreen {
                display: inline-flex;
                color: #000;
            }

            .sc_live_other_radio_group label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_live_other_radio_group_fullscreen label {
                padding-right: 80px;
                padding-left: 10px;
            }

            .sc_live_other_btn_div {
                margin-top: 30px;
            }

            .sc_live_other_btn_div_fullscreen {
                margin-top: 30px;
            }

            .sc_live_other_checkbox_div{
                text-align: center;
                margin-top: 20px;
            }

            .sc_live_other_checkbox_inline {
                vertical-align: middle;
                display: inline-block;
                color: #000;
            }

            #sc_live_other_form {
                margin-top: 30px;
                text-align: center;
            }

            #sc_live_other_form_fullscreen {
                margin-top: 30px;
                text-align: center;
            }

            #sc_live_other_confirm_btn {
                float: right;
            }

            #sc_live_other_confirm_btn_fullscreen {
                float: right;
            }

            .sc_live_other_modal_btn {
                padding: 5px 20px;
            }
        `;

        document.head.appendChild(sc_live_other_modal_style);

        let sc_live_other_modal_html = document.createElement('div');
        sc_live_other_modal_html.id = 'sc_live_other_config_div';
        sc_live_other_modal_html.className = 'sc_live_other_config_modal';
        sc_live_other_modal_html.innerHTML = `
                <div class="sc_live_other_modal_content">
                    <span class="sc_live_other_close">&times;</span>
                    <p>其他一些功能的自定义设置：</p>
                    <form id="sc_live_other_form">
                        <div class="sc_live_other_radio_group">
                            <input type="radio" id="sc_live_other_default_option" name="sc_live_other_option" value="1" checked />
                            <label for="sc_live_other_default_option">数据模块显示 [同接]</label>

                            <input type="radio" id="sc_live_other_open_option" name="sc_live_other_option" value="0" />
                            <label for="sc_live_other_open_option">数据模块显示 [高能]</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_fullscreen_auto_hide_list" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_fullscreen_auto_hide_list" class="sc_live_other_checkbox_inline">侧折模式下，切换全屏时，自动隐藏醒目留言列表</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_side_fold_head_border_bg_opacity_flag" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_side_fold_head_border_bg_opacity_flag" class="sc_live_other_checkbox_inline">侧折模式下，隐藏头像边框</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_start_time_simple_flag" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_start_time_simple_flag" class="sc_live_other_checkbox_inline">设置SC发送的时间显示为简单的时分</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_search_shortkey_flag" class="sc_live_other_checkbox_inline" checked/>
                            <label for="sc_live_other_search_shortkey_flag" class="sc_live_other_checkbox_inline">设置SC搜索快捷键[ 开启/关闭：ctrl + f ][ 上一个：ctrl + 方向左/上 ][ 下一个：ctrl + 方向右/下 ]</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_auto_tianxuan_flag" class="sc_live_other_checkbox_inline" />
                            <label for="sc_live_other_auto_tianxuan_flag" class="sc_live_other_checkbox_inline">开启自动点击天选（当前直播间，并且已经关注主播）</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_auto_dm_combo_flag" class="sc_live_other_checkbox_inline" />
                            <label for="sc_live_other_auto_dm_combo_flag" class="sc_live_other_checkbox_inline">开启跟风发送combo弹幕（当前直播间，并且已经关注主播）</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <label for="sc_live_other_all_font_size_add" class="sc_live_other_checkbox_inline">调整记录板的字体大小 (px)(增量 0~10)：</label>
                            <input type="number" min="0" max="10" id="sc_live_other_all_font_size_add" class="sc_live_other_checkbox_inline" value="0" style="width: 42px;" />
                            <input type="checkbox" id="sc_live_other_font_size_only_message_flag" class="sc_live_other_checkbox_inline" checked/>
                            <label for="sc_live_other_font_size_only_message_flag" class="sc_live_other_checkbox_inline">不调整用户名显示</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <label for="sc_live_item_bg_opacity_val" class="sc_live_other_checkbox_inline">调整SC显示卡片背景的透明度（0~1）（1为完全不透明）：</label>
                            <input type="number" min="0" max="1" step="0.1" id="sc_live_item_bg_opacity_val" class="sc_live_other_checkbox_inline" value="1" style="width: 42px;" />
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_item_suspend_bg_opacity_one_flag" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_item_suspend_bg_opacity_one_flag" class="sc_live_other_checkbox_inline">设置鼠标悬浮在SC显示卡片上方的时候，其背景的透明度变为1</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_hide_value_font_flag" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_hide_value_font_flag" class="sc_live_other_checkbox_inline">设置隐藏SC的价格</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_hide_diff_time_flag" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_hide_diff_time_flag" class="sc_live_other_checkbox_inline">设置隐藏SC的时间距离</label>
                        </div>
                    </form>
                    <div class="sc_live_other_btn_div">
                        <button id="sc_live_other_cancel_btn" class="sc_live_other_modal_btn sc_live_other_modal_close_btn">取消</button>
                        <button id="sc_live_other_confirm_btn" class="sc_live_other_modal_btn sc_live_other_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_live_other_modal_html);

        let sc_live_other_modal_html_fullscreen = document.createElement('div');
        sc_live_other_modal_html_fullscreen.id = 'sc_live_other_config_div_fullscreen';
        sc_live_other_modal_html_fullscreen.className = 'sc_live_other_config_modal';
        sc_live_other_modal_html_fullscreen.innerHTML = `
                <div class="sc_live_other_modal_content">
                    <span class="sc_live_other_close">&times;</span>
                    <p>其他一些功能的自定义设置：</p>
                    <form id="sc_live_other_form_fullscreen">
                        <div class="sc_live_other_radio_group_fullscreen">
                            <input type="radio" id="sc_live_other_default_option_fullscreen" name="sc_live_other_option_fullscreen" value="1" checked />
                            <label for="sc_live_other_default_option_fullscreen">数据模块显示 [同接]</label>

                            <input type="radio" id="sc_live_other_open_option_fullscreen" name="sc_live_other_option_fullscreen" value="0" />
                            <label for="sc_live_other_open_option_fullscreen">数据模块显示 [高能]</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_fullscreen_auto_hide_list_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_fullscreen_auto_hide_list_fullscreen" class="sc_live_other_checkbox_inline">侧折模式下，切换全屏时，自动隐藏醒目留言列表</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_side_fold_head_border_bg_opacity_flag_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_side_fold_head_border_bg_opacity_flag_fullscreen" class="sc_live_other_checkbox_inline">侧折模式下，隐藏头像边框</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_start_time_simple_flag_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_start_time_simple_flag_fullscreen" class="sc_live_other_checkbox_inline">设置SC发送的时间显示为简单的时分</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_search_shortkey_flag_fullscreen" class="sc_live_other_checkbox_inline" checked/>
                            <label for="sc_live_other_search_shortkey_flag_fullscreen" class="sc_live_other_checkbox_inline">设置SC搜索快捷键[ 开启/关闭：ctrl + f ][ 上一个：ctrl + 方向左/上 ][ 下一个：ctrl + 方向右/下 ]</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_auto_tianxuan_flag_fullscreen" class="sc_live_other_checkbox_inline" />
                            <label for="sc_live_other_auto_tianxuan_flag_fullscreen" class="sc_live_other_checkbox_inline">开启自动点击天选（当前直播间，并且已经关注主播）</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_auto_dm_combo_flag_fullscreen" class="sc_live_other_checkbox_inline" />
                            <label for="sc_live_other_auto_dm_combo_flag_fullscreen" class="sc_live_other_checkbox_inline">开启跟风发送combo弹幕（当前直播间，并且已经关注主播）</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <label for="sc_live_other_all_font_size_add_fullscreen" class="sc_live_other_checkbox_inline">调整记录板的字体大小 (px)(增量 0~10)：</label>
                            <input type="number" min="0" max="10" id="sc_live_other_all_font_size_add_fullscreen" class="sc_live_other_checkbox_inline" value="0" style="width: 42px;" />
                            <input type="checkbox" id="sc_live_other_font_size_only_message_flag_fullscreen" class="sc_live_other_checkbox_inline" checked/>
                            <label for="sc_live_other_font_size_only_message_flag_fullscreen" class="sc_live_other_checkbox_inline">不调整用户名显示</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <label for="sc_live_item_bg_opacity_val_fullscreen" class="sc_live_other_checkbox_inline">调整SC显示卡片背景的透明度（0~1）（1为完全不透明）：</label>
                            <input type="number" min="0" max="1" step="0.1" id="sc_live_item_bg_opacity_val_fullscreen" class="sc_live_other_checkbox_inline" value="1" style="width: 42px;" />
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_item_suspend_bg_opacity_one_flag_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_item_suspend_bg_opacity_one_flag_fullscreen" class="sc_live_other_checkbox_inline">设置鼠标悬浮在SC显示卡片上方的时候，其背景的透明度变为1</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_hide_value_font_flag_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_hide_value_font_flag_fullscreen" class="sc_live_other_checkbox_inline">设置隐藏SC的价格</label>
                        </div>
                        <div class="sc_live_other_checkbox_div">
                            <input type="checkbox" id="sc_live_other_hide_diff_time_flag_fullscreen" class="sc_live_other_checkbox_inline"/>
                            <label for="sc_live_other_hide_diff_time_flag_fullscreen" class="sc_live_other_checkbox_inline">设置隐藏SC的时间距离</label>
                        </div>
                    </form>
                    <div class="sc_live_other_btn_div_fullscreen">
                        <button id="sc_live_other_cancel_btn" class="sc_live_other_modal_btn sc_live_other_modal_close_btn">取消</button>
                        <button id="sc_live_other_confirm_btn_fullscreen" class="sc_live_other_modal_btn sc_live_other_modal_close_btn">确定</button>
                    </div>
                </div>
        `;

        $(live_player_div).append(sc_live_other_modal_html_fullscreen);

        function sc_close_live_other_modal() {
            $(document).find('.sc_live_other_config_modal').hide();
        }

        $(document).on('click', '.sc_live_other_close, .sc_live_other_modal_close_btn', function() {
            sc_close_live_other_modal();
        });

        $(document).on('click', '#sc_live_other_confirm_btn', function(e) {

            let sc_live_other_select_val = $(document).find('.sc_live_other_radio_group input[name="sc_live_other_option"]:checked').val();
            if (sc_live_other_select_val === '0') {
                sc_live_data_show_high_energy_num_flag_change(true);
            } else if (sc_live_other_select_val === '1') {
                sc_live_data_show_high_energy_num_flag_change(false);
            }

            sc_side_fold_fullscreen_auto_hide_list_flag = $(document).find('#sc_live_other_fullscreen_auto_hide_list').is(':checked');

            let sc_live_all_font_size_add_val = $(document).find('#sc_live_other_all_font_size_add').val();
            sc_live_all_font_size_add = parseInt(sc_live_all_font_size_add_val, 10);
            if (!sc_live_all_font_size_add || sc_live_all_font_size_add < 0) {
                sc_live_all_font_size_add = 0;
            }

            if (sc_live_all_font_size_add > 10) {
                sc_live_all_font_size_add = 10;
            }

            sc_live_font_size_only_message_flag = $(document).find('#sc_live_other_font_size_only_message_flag').is(':checked');

            sc_live_side_fold_head_border_bg_opacity_flag = $(document).find('#sc_live_other_side_fold_head_border_bg_opacity_flag').is(':checked');

            sc_live_item_bg_opacity_val = $(document).find('#sc_live_item_bg_opacity_val').val();
            sc_live_item_bg_opacity_val = parseFloat(sc_live_item_bg_opacity_val);
            if (sc_live_item_bg_opacity_val < 0) {
                sc_live_item_bg_opacity_val = 0;
            } else if (sc_live_item_bg_opacity_val > 1) {
                sc_live_item_bg_opacity_val = 1;
            }

            if (sc_isFullscreen) {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag_fullscreen) {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })
                } else {
                    let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
                    if ((sc_switch_fullscreen === 0 || sc_switch_fullscreen === 6) && sc_live_item_bg_opacity_val < 0.3) {
                        // 主题为白色的时候，为了看清内容，调整透明度为0.3
                        the_sc_live_item_bg_opacity_val = 0.3;
                    }

                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })
                }
            } else {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag) {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })
                } else {
                    let the_sc_live_item_bg_opacity_val = sc_live_item_bg_opacity_val;
                    if ((sc_switch === 0 || sc_switch === 6) && sc_live_item_bg_opacity_val < 0.3) {
                        // 主题为白色的时候，为了看清内容，调整透明度为0.3
                        the_sc_live_item_bg_opacity_val = 0.3;
                    }

                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, the_sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })
                }
            }

            sc_live_item_suspend_bg_opacity_one_flag = $(document).find('#sc_live_item_suspend_bg_opacity_one_flag').is(':checked');

            sc_live_hide_value_font_flag = $(document).find('#sc_live_other_hide_value_font_flag').is(':checked');

            if (sc_live_hide_value_font_flag) {
                $(document).find('.sc_value_font').hide();
            } else {
                $(document).find('.sc_value_font').show();
            }

            sc_live_hide_diff_time_flag = $(document).find('#sc_live_other_hide_diff_time_flag').is(':checked');

            if (sc_live_hide_diff_time_flag) {
                $(document).find('.sc_diff_time').hide();
            } else {
                $(document).find('.sc_diff_time').show();
            }

            sc_live_other_config_store();

            sc_start_time_simple_flag = $(document).find('#sc_live_other_start_time_simple_flag').is(':checked');

            sc_start_time_simple_store();

            if (sc_start_time_simple_flag) {
                $(document).find('.sc_start_time_all_span').hide();
                $(document).find('.sc_start_time_simple_span').show();
            } else {
                $(document).find('.sc_start_time_all_span').show();
                $(document).find('.sc_start_time_simple_span').hide();
            }

            sc_list_search_shortkey_flag = $(document).find('#sc_live_other_search_shortkey_flag').is(':checked');

            sc_search_shortkey_flag_config_store();

            sc_search_shortkey_flag_config_apply();

            sc_live_auto_tianxuan_flag = $(document).find('#sc_live_other_auto_tianxuan_flag').is(':checked');

            sc_live_auto_tianxuan_flag_config_store();

            sc_live_send_dm_combo_flag = $(document).find('#sc_live_other_auto_dm_combo_flag').is(':checked');

            sc_live_send_dm_combo_flag_config_store();

            sc_live_other_config_data_show_apply();

            if (sc_live_all_font_size_add > 0) {
                $(document).find('.sc_msg_body_span').css('font-size', 14 + sc_live_all_font_size_add + 'px');

                $(document).find('.sc_special_msg_body_span').css('font-size', function(index, currentSize) {
                    return parseInt($(this).attr('data-font_size')) + sc_live_all_font_size_add + 'px';
                });

                if (!sc_live_font_size_only_message_flag) {
                    $(document).find('.sc_font_color').css('font-size', 15 + sc_live_all_font_size_add + 'px');
                } else {
                    $(document).find('.sc_font_color').css('font-size', '15px');
                }
            } else {
                $(document).find('.sc_msg_body_span').css('font-size', '14px');
                $(document).find('.sc_font_color').css('font-size', '15px');
                $(document).find('.sc_special_msg_body_span').css('font-size', function(index, currentSize) {
                    return $(this).attr('data-font_size') + 'px';
                });
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });

        $(document).on('click', '#sc_live_other_confirm_btn_fullscreen', function(e) {

            let sc_live_other_select_val = $(document).find('.sc_live_other_radio_group_fullscreen input[name="sc_live_other_option_fullscreen"]:checked').val();
            if (sc_live_other_select_val === '0') {
                sc_live_data_show_high_energy_num_flag_change(true);
            } else if (sc_live_other_select_val === '1') {
                sc_live_data_show_high_energy_num_flag_change(false);
            }

            sc_side_fold_fullscreen_auto_hide_list_flag = $(document).find('#sc_live_other_fullscreen_auto_hide_list_fullscreen').is(':checked');

            let sc_live_all_font_size_add_val = $(document).find('#sc_live_other_all_font_size_add_fullscreen').val();
            sc_live_all_font_size_add = parseInt(sc_live_all_font_size_add_val, 10);
            if (!sc_live_all_font_size_add || sc_live_all_font_size_add < 0) {
                sc_live_all_font_size_add = 0;
            }

            if (sc_live_all_font_size_add > 10) {
                sc_live_all_font_size_add = 10;
            }

            sc_live_font_size_only_message_flag = $(document).find('#sc_live_other_font_size_only_message_flag_fullscreen').is(':checked');

            sc_live_side_fold_head_border_bg_opacity_flag = $(document).find('#sc_live_other_side_fold_head_border_bg_opacity_flag_fullscreen').is(':checked');

            sc_live_item_bg_opacity_val = $(document).find('#sc_live_item_bg_opacity_val_fullscreen').val();
            sc_live_item_bg_opacity_val = parseFloat(sc_live_item_bg_opacity_val);
            if (sc_live_item_bg_opacity_val < 0) {
                sc_live_item_bg_opacity_val = 0;
            } else if (sc_live_item_bg_opacity_val > 1) {
                sc_live_item_bg_opacity_val = 1;
            }

            if (sc_isFullscreen) {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag_fullscreen) {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })
                } else {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })
                }
            } else {
                if (sc_live_side_fold_head_border_bg_opacity_flag && sc_panel_side_fold_flag) {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, 0);
                        $(this).css('background-color', sc_background_color);
                    })
                } else {
                    // head
                    $(document).find('.sc_msg_head').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })

                    // item
                    $(document).find('.sc_long_item').each(function() {
                        const bg_color = $(this).css('background-color');
                        const sc_background_color = change_color_opacity(bg_color, sc_live_item_bg_opacity_val);
                        $(this).css('background-color', sc_background_color);
                    })
                }
            }

            sc_live_item_suspend_bg_opacity_one_flag = $(document).find('#sc_live_item_suspend_bg_opacity_one_flag_fullscreen').is(':checked');

            sc_live_hide_value_font_flag = $(document).find('#sc_live_other_hide_value_font_flag_fullscreen').is(':checked');

            if (sc_live_hide_value_font_flag) {
                $(document).find('.sc_value_font').hide();
            } else {
                $(document).find('.sc_value_font').show();
            }

            sc_live_hide_diff_time_flag = $(document).find('#sc_live_other_hide_diff_time_flag_fullscreen').is(':checked');

            if (sc_live_hide_diff_time_flag) {
                $(document).find('.sc_diff_time').hide();
            } else {
                $(document).find('.sc_diff_time').show();
            }

            sc_live_other_config_store();

            sc_start_time_simple_flag = $(document).find('#sc_live_other_start_time_simple_flag_fullscreen').is(':checked');

            sc_start_time_simple_store();

            if (sc_start_time_simple_flag) {
                $(document).find('.sc_start_time_all_span').hide();
                $(document).find('.sc_start_time_simple_span').show();
            } else {
                $(document).find('.sc_start_time_all_span').show();
                $(document).find('.sc_start_time_simple_span').hide();
            }

            sc_list_search_shortkey_flag = $(document).find('#sc_live_other_search_shortkey_flag_fullscreen').is(':checked');

            sc_search_shortkey_flag_config_store();

            sc_search_shortkey_flag_config_apply();

            sc_live_auto_tianxuan_flag = $(document).find('#sc_live_other_auto_tianxuan_flag_fullscreen').is(':checked');

            sc_live_auto_tianxuan_flag_config_store();

            sc_live_send_dm_combo_flag = $(document).find('#sc_live_other_auto_dm_combo_flag_fullscreen').is(':checked');

            sc_live_send_dm_combo_flag_config_store();

            sc_live_other_config_data_show_apply();

            if (sc_live_all_font_size_add > 0) {
                $(document).find('.sc_msg_body_span').css('font-size', 14 + sc_live_all_font_size_add + 'px');

                $(document).find('.sc_special_msg_body_span').css('font-size', function(index, currentSize) {
                    return parseInt($(this).attr('data-font_size')) + sc_live_all_font_size_add + 'px';
                });

                if (!sc_live_font_size_only_message_flag) {
                    $(document).find('.sc_font_color').css('font-size', 15 + sc_live_all_font_size_add + 'px');
                } else {
                    $(document).find('.sc_font_color').css('font-size', '15px');
                }
            } else {
                $(document).find('.sc_msg_body_span').css('font-size', '14px');
                $(document).find('.sc_font_color').css('font-size', '15px');
                $(document).find('.sc_special_msg_body_span').css('font-size', function(index, currentSize) {
                    return $(this).attr('data-font_size') + 'px';
                });
            }

            open_and_close_sc_modal('✓', '#A7C9D3', e);
        });


        let sc_live_search_modal_style = document.createElement('style');
        sc_live_search_modal_style.textContent = `
            .sc_live_search_config_modal {
                display: none;
                position: fixed;
                z-index: 3333;
                top: 18%;
                left: 50%;
                margin-left: -21%;
                width: 42%;
            }

            .sc_live_search_modal_content {
                background-color: rgb(255, 255, 255, 0.9);
                padding: 20px;
                border: 1px solid #888;
            }

            .sc_live_search_modal_content p {
                color: #000;
            }

            .sc_live_search_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_live_search_close:hover,
            .sc_live_search_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_live_setting_close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .sc_live_setting_close:hover,
            .sc_live_setting_close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }

            .sc_live_search_div_group {
                display: block;
                color: #000;
                padding-bottom: 10px;
            }

            .sc_live_search_div_group input{
                background-color: rgb(255, 255, 255, 0);
                border: 1px solid;
                padding: 5px
            }

            .sc_live_search_div_group_fullscreen {
                display: block;
                color: #000;
                padding-bottom: 10px;
            }

            .sc_live_search_div_group_fullscreen input{
                background-color: rgb(255, 255, 255, 0);
                border: 1px solid;
                padding: 5px
            }

            .sc_live_search_btn_div {
                margin-top: 30px;
            }

            .sc_live_search_btn_div_fullscreen {
                margin-top: 30px;
            }

            #sc_live_search_form {
                margin-top: 30px;
                text-align: center;
            }

            #sc_live_search_form_fullscreen {
                margin-top: 30px;
                text-align: center;
            }

            #sc_live_search_confirm_btn {
                float: right;
            }

            #sc_live_search_confirm_btn_fullscreen {
                float: right;
            }

            .sc_live_search_modal_btn {
                padding: 5px 20px;
                color: initial;
                border: unset;
                cursor: pointer;
            }

            .sc_live_search_normal_btn {
                padding: 5px 5px;
                color: initial;
                border: unset;
                cursor: pointer;
            }

            .change_bg_opacity_range,
            .change_bg_opacity_range_fullscreen {
                -webkit-appearance: none;
                appearance: none;
                width: 80px;
                background: transparent;
                outline: none;
                opacity: 0.2;
                -moz-transition: opacity .2s;
                transition: opacity .2s;
            }

            .change_bg_opacity_range::-moz-range-thumb,
            .change_bg_opacity_range_fullscreen::-moz-range-thumb {
                background: #abb3ac;
                border: none;
                height: 6px;
                width: 12px;
                cursor: pointer;
                margin-top: -2px;
            }

            .change_bg_opacity_range::-webkit-slider-thumb,
            .change_bg_opacity_range_fullscreen::-webkit-slider-thumb {
                -webkit-appearance: none;
                background: #abb3ac;
                border: none;
                height: 6px;
                width: 12px;
                cursor: pointer;
                margin-top: -2px;
            }

            .change_bg_opacity_range::-moz-range-track,
            .change_bg_opacity_range_fullscreen::-moz-range-track {
                background: #ddd;
                border: none;
                height: 2px;
            }

            .change_bg_opacity_range::-webkit-slider-runnable-track,
            .change_bg_opacity_range_fullscreen::-webkit-slider-runnable-track {
                background: #ddd;
                border: none;
                height: 2px;
            }

            .change_bg_opacity_range:hover::-moz-range-thumb,
            .change_bg_opacity_range_fullscreen:hover::-moz-range-thumb {
                background: #000;
            }

            .change_bg_opacity_range:hover::-webkit-slider-thumb,
            .change_bg_opacity_range_fullscreen:hover::-webkit-slider-thumb {
                background: #000;
            }

            .sc_settings_icon {
                margin-right: 5px;
                vertical-align: middle;
                color: #aaa;
                cursor: pointer
            }
            .sc_settings_icon:hover {
                color: #000;
            }
            .sc_live_setting_modal_div {
                display: none;
                z-index: 5555;
                position: fixed;
                top: 18%;
                left: 50%;
                margin-left: -15%;
                width: 30%;
                box-shadow: 5px 5px 5px #aaa;
            }
            .sc_live_setting_modal_content {
                background-color: rgb(255, 255, 255);
                padding: 20px;
                border: 1px solid #888;
            }
            .sc_live_setting_item_div {
                text-align: center;
            }
            .sc_live_setting_item {
                padding: 5px;
                margin: 5px;
            }
        `;

        document.head.appendChild(sc_live_search_modal_style);

        let sc_live_search_modal_html = document.createElement('div');
        sc_live_search_modal_html.id = 'sc_live_search_config_div';
        sc_live_search_modal_html.className = 'sc_live_search_config_modal';
        sc_live_search_modal_html.innerHTML = `
                <div class="sc_live_search_modal_content">
                    <span class="sc_live_search_close">&times;</span>
                    <p>
                        <svg class="sc_settings_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                        </svg>
                    自定义搜索SC：
                    </p>
                    <input type="range" min="0" max="100" value="90" class="change_bg_opacity_range">
                    <form id="sc_live_search_form">
                        <div class="sc_live_search_div_group">
                            <label for="sc_live_search_user_name">用户昵称：</label>
                            <input type="text" id="sc_live_search_user_name" class="sc_live_search_user_name_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_user_name_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group">
                            <label for="sc_live_search_content">留言内容：</label>
                            <input type="text" id="sc_live_search_content" class="sc_live_search_content_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_content_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group">
                            <label for="sc_live_search_time">时间距离：</label>
                            <input type="number" min="0" id="sc_live_search_time" placeholder="分钟前" class="sc_live_search_time_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group">
                            <label>快速填充/分钟：</label>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_0">0</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_5">5</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_10">10</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_20">20</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_30">30</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_40">40</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_50">50</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_60">60</button>
                        </div>
                        <div class="sc_live_search_div_group" style="margin-top:30px;">
                            <button type="button" id="sc_live_search_prev_btn" class="sc_live_search_normal_btn" style="margin-right:60px;">上一个</button>
                            <button type="button" id="sc_live_search_next_btn" class="sc_live_search_normal_btn">下一个</button>
                        </div>
                        <div class="sc_live_search_result_div" style="width: 100%;">
                        </div>
                    </form>
                </div>
        `;

        document.body.appendChild(sc_live_search_modal_html);

        let sc_live_setting_modal_html = document.createElement('div');
        sc_live_setting_modal_html.id = 'sc_live_setting_modal';
        sc_live_setting_modal_html.className = 'sc_live_setting_modal_div';
        sc_live_setting_modal_html.innerHTML = `
                <div class="sc_live_setting_modal_content">
                    <span class="sc_live_setting_close">&times;</span>
                    <p>记录板配置：</p>
                    <div class="sc_live_setting_item_div">
                        <button id="sc_live_catch_reset_setting_btn" class="sc_live_setting_item" type="button">重置配置</button>
                        <button id="sc_live_catch_output_setting_btn" class="sc_live_setting_item" type="button">导出配置</button>
                        <button id="sc_live_catch_import_setting_btn" class="sc_live_setting_item" type="button">导入配置</button>
                    </div>
                    <div class="sc_live_setting_item_div">
                        <textarea id="sc_live_setting_import_textarea_content" style="min-width: 60%; min-height: 100px; max-width: 90%; max-height: 160px; margin: 5px;" placeholder="输入json格式配置，并且点击导入配置按钮\n\n注意：\n\n重置配置不是清空本输入框的内容\n\n重置配置是清空记录板的所有配置"></textarea>
                    </div>
                    <div class="sc_live_setting_item_div">
                        <button id="sc_live_setting_sample_json_btn" class="sc_live_setting_item" type="button">填充示例配置</button>
                    </div>
                </div>
        `;

        document.body.appendChild(sc_live_setting_modal_html);

        let sc_live_search_modal_html_fullscreen = document.createElement('div');
        sc_live_search_modal_html_fullscreen.id = 'sc_live_search_config_div_fullscreen';
        sc_live_search_modal_html_fullscreen.className = 'sc_live_search_config_modal';
        sc_live_search_modal_html_fullscreen.innerHTML = `
                <div class="sc_live_search_modal_content">
                    <span class="sc_live_search_close">&times;</span>
                    <p>自定义搜索SC：</p>
                    <input type="range" min="0" max="100" value="90" class="change_bg_opacity_range_fullscreen">
                    <form id="sc_live_search_form_fullscreen">
                        <div class="sc_live_search_div_group_fullscreen">
                            <label for="sc_live_search_user_name_fullscreen">用户昵称：</label>
                            <input type="text" id="sc_live_search_user_name_fullscreen" class="sc_live_search_user_name_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_user_name_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group_fullscreen">
                            <label for="sc_live_search_content_fullscreen">留言内容：</label>
                            <input type="text" id="sc_live_search_content_fullscreen" class="sc_live_search_content_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_content_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group_fullscreen">
                            <label for="sc_live_search_time_fullscreen">时间距离：</label>
                            <input type="number" min="0" id="sc_live_search_time_fullscreen" placeholder="分钟前" class="sc_live_search_time_input" />
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_clear_btn">清空</button>
                        </div>
                        <div class="sc_live_search_div_group_fullscreen">
                            <label>快速填充/分钟：</label>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_0">0</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_5">5</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_10">10</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_20">20</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_30">30</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_40">40</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_50">50</button>
                            <button type="button" class="sc_live_search_normal_btn sc_live_search_time_60">60</button>
                        </div>
                        <div class="sc_live_search_div_group_fullscreen" style="margin-top:30px;">
                            <button type="button" id="sc_live_search_prev_btn_fullscreen" class="sc_live_search_normal_btn" style="margin-right:60px;">上一个</button>
                            <button type="button" id="sc_live_search_next_btn_fullscreen" class="sc_live_search_normal_btn">下一个</button>
                        </div>
                        <div class="sc_live_search_result_div_fullscreen" style="width: 100%;">
                        </div>
                    </form>
                </div>
        `;

        $(live_player_div).append(sc_live_search_modal_html_fullscreen);

        function sc_close_live_search_modal() {
            $(document).find('.sc_live_search_config_modal').hide();
        }

        $(document).on('click', '.sc_live_search_close', function() {
            sc_close_live_search_modal();
        });

        $(document).on('click', '.sc_live_search_user_name_clear_btn', function() {
            $(document).find('.sc_live_search_user_name_input').val('');
            if (sc_isFullscreen) {
                $(document).find('#sc_live_search_user_name_fullscreen').focus();
            } else {
                $(document).find('#sc_live_search_user_name').focus();
            }
        });

        $(document).on('click', '.sc_live_search_content_clear_btn', function() {
            $(document).find('.sc_live_search_content_input').val('');
            if (sc_isFullscreen) {
                $(document).find('#sc_live_search_content_fullscreen').focus();
            } else {
                $(document).find('#sc_live_search_content').focus();
            }
        });

        $(document).on('click', '.sc_live_search_time_clear_btn', function() {
            $(document).find('.sc_live_search_time_input').val('');
            if (sc_isFullscreen) {
                $(document).find('#sc_live_search_time_fullscreen').focus();
            } else {
                $(document).find('#sc_live_search_time').focus();
            }
        });

        let sc_change_bg_opacity_timeout;
        let sc_change_bg_opacity_fullscreen_timeout;

        sc_list_search_div_bg_opacity_range = parseInt(sc_list_search_div_bg_opacity_range, 10);

        $(document).find('.sc_live_search_modal_content').css('background-color', 'rgb(255, 255, 255, '+ sc_list_search_div_bg_opacity_range / 100 +')');
        $(document).find('.sc_live_search_modal_btn').css('background-color', 'rgb(220, 220, 220, '+ sc_list_search_div_bg_opacity_range / 100 +')');
        $(document).find('.sc_live_search_normal_btn').css('background-color', 'rgb(220, 220, 220, '+ sc_list_search_div_bg_opacity_range / 100 +')');
        $(document).find('.change_bg_opacity_range').val(sc_list_search_div_bg_opacity_range);
        $(document).find('.change_bg_opacity_range_fullscreen').val(sc_list_search_div_bg_opacity_range);

        $(document).on('input', '.change_bg_opacity_range', function() {
            $(document).find('.sc_live_search_modal_content').css('background-color', 'rgb(255, 255, 255, '+ $(this).val() / 100 +')');
            $(document).find('.sc_live_search_modal_btn').css('background-color', 'rgb(220, 220, 220, '+ $(this).val() / 100 +')');
            $(document).find('.sc_live_search_normal_btn').css('background-color', 'rgb(220, 220, 220, '+ $(this).val() / 100 +')');
            $(document).find('.change_bg_opacity_range_fullscreen').val($(this).val());

            clearTimeout(sc_change_bg_opacity_timeout);

            sc_change_bg_opacity_timeout = setTimeout(() => {
                sc_list_search_div_bg_opacity_range = $(this).val();
                sc_search_div_bg_opacity_range_config_store();
            }, 1000);
        });

        $(document).on('input', '.change_bg_opacity_range_fullscreen', function() {
            $(document).find('.sc_live_search_modal_content').css('background-color', 'rgb(255, 255, 255, '+ $(this).val() / 100 +')');
            $(document).find('.sc_live_search_modal_btn').css('background-color', 'rgb(220, 220, 220, '+ $(this).val() / 100 +')');
            $(document).find('.sc_live_search_normal_btn').css('background-color', 'rgb(220, 220, 220, '+ $(this).val() / 100 +')');
            $(document).find('.change_bg_opacity_range').val($(this).val());

            clearTimeout(sc_change_bg_opacity_fullscreen_timeout);

            sc_change_bg_opacity_fullscreen_timeout = setTimeout(() => {
                sc_list_search_div_bg_opacity_range = $(this).val();
                sc_search_div_bg_opacity_range_config_store();
            }, 1000);
        });

        $(document).on('click', '.sc_live_search_time_0', function() {
            $(document).find('.sc_live_search_time_input').val(0);
        });

        $(document).on('click', '.sc_live_search_time_5', function() {
            $(document).find('.sc_live_search_time_input').val(5);
        });

        $(document).on('click', '.sc_live_search_time_10', function() {
            $(document).find('.sc_live_search_time_input').val(10);
        });

        $(document).on('click', '.sc_live_search_time_20', function() {
            $(document).find('.sc_live_search_time_input').val(20);
        });

        $(document).on('click', '.sc_live_search_time_30', function() {
            $(document).find('.sc_live_search_time_input').val(30);
        });

        $(document).on('click', '.sc_live_search_time_40', function() {
            $(document).find('.sc_live_search_time_input').val(40);
        });

        $(document).on('click', '.sc_live_search_time_50', function() {
            $(document).find('.sc_live_search_time_input').val(50);
        });

        $(document).on('click', '.sc_live_search_time_60', function() {
            $(document).find('.sc_live_search_time_input').val(60);
        });

        $(document).on('click', '#sc_live_search_prev_btn', function() {
            sc_live_search_confirm_prev();
        });

        $(document).on('click', '#sc_live_search_next_btn', function() {
            sc_live_search_confirm_next();
        });

        $(document).on('click', '#sc_live_search_prev_btn_fullscreen', function() {
            sc_live_search_confirm_prev();
        });

        $(document).on('click', '#sc_live_search_next_btn_fullscreen', function() {
            sc_live_search_confirm_next();
        });

        $(document).on('click', '.sc_settings_icon', function() {
            $(document).find('.sc_live_setting_modal_div').show();
        });

        $(document).on('click', '.sc_live_setting_close', function() {
            $(document).find('.sc_live_setting_modal_div').hide();
            $(document).find('#sc_live_setting_import_textarea_content').val('');
        });

        $(document).on('click', '#sc_live_catch_reset_setting_btn', function(e) {
            if (confirm('清空记录板的所有配置，恢复默认配置')) {
                unsafeWindow.localStorage.removeItem('live_sc_all_memory_config');
                unsafeWindow.localStorage.removeItem('live_sc_self_memory_config');
                unsafeWindow.localStorage.removeItem('live_sc_memory_all_rooms_mode');
                unsafeWindow.localStorage.removeItem('live_sc_switch_memory_rooms');
                unsafeWindow.localStorage.removeItem('live_sc_switch_record');
                unsafeWindow.localStorage.removeItem('live_sc_switch_record_fullscreen');
                unsafeWindow.localStorage.removeItem('live_sc_room_blacklist');
                unsafeWindow.localStorage.removeItem('live_sc_screen_resolution_str');
                unsafeWindow.localStorage.removeItem('live_sc_special_tip_location');
                unsafeWindow.localStorage.removeItem('live_sc_special_tip_str');
                unsafeWindow.localStorage.removeItem('live_sc_special_msg_flag');
                unsafeWindow.localStorage.removeItem('live_sc_special_sc_flag');
                unsafeWindow.localStorage.removeItem('live_sc_special_danmu_mode');
                unsafeWindow.localStorage.removeItem('live_sc_to_danmu_show_flag');
                unsafeWindow.localStorage.removeItem('live_sc_to_danmu_show_location');
                unsafeWindow.localStorage.removeItem('live_sc_to_danmu_show_mode');
                unsafeWindow.localStorage.removeItem('live_special_sc_no_remain_flag');
                unsafeWindow.localStorage.removeItem('live_sc_to_danmu_no_remain_flag');

                // 个记
                for (let i = 0; i < unsafeWindow.localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('live_') && key.endsWith('_sc_self_memory_config')) {
                        unsafeWindow.localStorage.removeItem(key);
                    }
                }

                alert("配置已清空，刷新页面生效！");
                unsafeWindow.location.reload();
            }
        });

        $(document).on('click', '#sc_live_catch_output_setting_btn', function(e) {
            let the_sc_live_setting_obj = {};

            let sc_live_catch_all_memory_config = unsafeWindow.localStorage.getItem('live_sc_all_memory_config');
            if (sc_live_catch_all_memory_config !== null && sc_live_catch_all_memory_config !== 'null' && sc_live_catch_all_memory_config !== '') {
                the_sc_live_setting_obj.live_sc_all_memory_config = JSON.parse(sc_live_catch_all_memory_config);
            }

            let sc_live_catch_self_memory_config = unsafeWindow.localStorage.getItem('live_sc_self_memory_config');
            if (sc_live_catch_self_memory_config !== null && sc_live_catch_self_memory_config !== 'null' && sc_live_catch_self_memory_config !== '') {
                the_sc_live_setting_obj.live_sc_self_memory_config = JSON.parse(sc_live_catch_self_memory_config);
            }

            let sc_live_catch_memory_all_rooms_mode = unsafeWindow.localStorage.getItem('live_sc_memory_all_rooms_mode');
            if (sc_live_catch_memory_all_rooms_mode !== null && sc_live_catch_memory_all_rooms_mode !== 'null' && sc_live_catch_memory_all_rooms_mode !== '') {
                the_sc_live_setting_obj.live_sc_memory_all_rooms_mode = sc_live_catch_memory_all_rooms_mode;
            }

            let sc_live_catch_switch_memory_rooms = unsafeWindow.localStorage.getItem('live_sc_switch_memory_rooms');
            if (sc_live_catch_switch_memory_rooms !== null && sc_live_catch_switch_memory_rooms !== 'null' && sc_live_catch_switch_memory_rooms !== '') {
                the_sc_live_setting_obj.live_sc_switch_memory_rooms = JSON.parse(sc_live_catch_switch_memory_rooms);
            }

            let sc_live_catch_switch_record = unsafeWindow.localStorage.getItem('live_sc_switch_record');
            if (sc_live_catch_switch_record !== null && sc_live_catch_switch_record !== 'null' && sc_live_catch_switch_record !== '') {
                the_sc_live_setting_obj.live_sc_switch_record = sc_live_catch_switch_record;
            }

            let sc_live_catch_switch_record_fullscreen = unsafeWindow.localStorage.getItem('live_sc_switch_record_fullscreen');
            if (sc_live_catch_switch_record_fullscreen !== null && sc_live_catch_switch_record_fullscreen !== 'null' && sc_live_catch_switch_record_fullscreen !== '') {
                the_sc_live_setting_obj.live_sc_switch_record_fullscreen = sc_live_catch_switch_record_fullscreen;
            }

            let sc_live_catch_room_blacklist = unsafeWindow.localStorage.getItem('live_sc_room_blacklist');
            if (sc_live_catch_room_blacklist !== null && sc_live_catch_room_blacklist !== 'null' && sc_live_catch_room_blacklist !== '') {
                the_sc_live_setting_obj.live_sc_room_blacklist = JSON.parse(sc_live_catch_room_blacklist);
            }

            let sc_live_catch_screen_resolution_str = unsafeWindow.localStorage.getItem('live_sc_screen_resolution_str');
            if (sc_live_catch_screen_resolution_str !== null && sc_live_catch_screen_resolution_str !== 'null' && sc_live_catch_screen_resolution_str !== '') {
                the_sc_live_setting_obj.live_sc_screen_resolution_str = sc_live_catch_screen_resolution_str;
            }

            let sc_live_catch_special_tip_location = unsafeWindow.localStorage.getItem('live_sc_special_tip_location');
            if (sc_live_catch_special_tip_location !== null && sc_live_catch_special_tip_location !== 'null' && sc_live_catch_special_tip_location !== '') {
                the_sc_live_setting_obj.live_sc_special_tip_location = sc_live_catch_special_tip_location;
            }

            let sc_live_catch_special_tip_str = unsafeWindow.localStorage.getItem('live_sc_special_tip_str');
            if (sc_live_catch_special_tip_str !== null && sc_live_catch_special_tip_str !== 'null' && sc_live_catch_special_tip_str !== '') {
                the_sc_live_setting_obj.live_sc_special_tip_str = sc_live_catch_special_tip_str;
            }

            let sc_live_catch_special_msg_flag = unsafeWindow.localStorage.getItem('live_sc_special_msg_flag');
            if (sc_live_catch_special_msg_flag !== null && sc_live_catch_special_msg_flag !== 'null' && sc_live_catch_special_msg_flag !== '') {
                the_sc_live_setting_obj.live_sc_special_msg_flag = sc_live_catch_special_msg_flag;
            }

            let sc_live_catch_special_sc_flag = unsafeWindow.localStorage.getItem('live_sc_special_sc_flag');
            if (sc_live_catch_special_sc_flag !== null && sc_live_catch_special_sc_flag !== 'null' && sc_live_catch_special_sc_flag !== '') {
                the_sc_live_setting_obj.live_sc_special_sc_flag = sc_live_catch_special_sc_flag;
            }

            let sc_live_catch_special_danmu_mode = unsafeWindow.localStorage.getItem('live_sc_special_danmu_mode');
            if (sc_live_catch_special_danmu_mode !== null && sc_live_catch_special_danmu_mode !== 'null' && sc_live_catch_special_danmu_mode !== '') {
                the_sc_live_setting_obj.live_sc_special_danmu_mode = sc_live_catch_special_danmu_mode;
            }

            let sc_live_catch_to_danmu_show_flag = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_flag');
            if (sc_live_catch_to_danmu_show_flag !== null && sc_live_catch_to_danmu_show_flag !== 'null' && sc_live_catch_to_danmu_show_flag !== '') {
                the_sc_live_setting_obj.live_sc_to_danmu_show_flag = sc_live_catch_to_danmu_show_flag;
            }

            let sc_live_catch_to_danmu_show_location = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_location');
            if (sc_live_catch_to_danmu_show_location !== null && sc_live_catch_to_danmu_show_location !== 'null' && sc_live_catch_to_danmu_show_location !== '') {
                the_sc_live_setting_obj.live_sc_to_danmu_show_location = sc_live_catch_to_danmu_show_location;
            }

            let sc_live_catch_to_danmu_show_mode = unsafeWindow.localStorage.getItem('live_sc_to_danmu_show_mode');
            if (sc_live_catch_to_danmu_show_mode !== null && sc_live_catch_to_danmu_show_mode !== 'null' && sc_live_catch_to_danmu_show_mode !== '') {
                the_sc_live_setting_obj.live_sc_to_danmu_show_mode = sc_live_catch_to_danmu_show_mode;
            }

            let sc_live_catch_special_sc_no_remain_flag = unsafeWindow.localStorage.getItem('live_special_sc_no_remain_flag');
            if (sc_live_catch_special_sc_no_remain_flag !== null && sc_live_catch_special_sc_no_remain_flag !== 'null' && sc_live_catch_special_sc_no_remain_flag !== '') {
                the_sc_live_setting_obj.live_special_sc_no_remain_flag = sc_live_catch_special_sc_no_remain_flag;
            }

            let sc_live_catch_to_danmu_no_remain_flag = unsafeWindow.localStorage.getItem('live_sc_to_danmu_no_remain_flag');
            if (sc_live_catch_to_danmu_no_remain_flag !== null && sc_live_catch_to_danmu_no_remain_flag !== 'null' && sc_live_catch_to_danmu_no_remain_flag !== '') {
                the_sc_live_setting_obj.live_sc_to_danmu_no_remain_flag = sc_live_catch_to_danmu_no_remain_flag;
            }

            // 个记
            for (let i = 0; i < unsafeWindow.localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('live_') && key.endsWith('_sc_self_memory_config')) {
                    let sc_live_catch_self_config = unsafeWindow.localStorage.getItem(key);
                    if (sc_live_catch_self_config !== null && sc_live_catch_self_config !== 'null' && sc_live_catch_self_config !== '') {
                        the_sc_live_setting_obj[key] = JSON.parse(sc_live_catch_self_config);
                    }
                }
            }

            const the_sc_live_catch_Json = JSON.stringify(the_sc_live_setting_obj, null, 2)

            // 创建一个Blob对象，将字符串放入其中
            const sc_setting_export_blob = new Blob([the_sc_live_catch_Json], { type: 'application/json' });

            // 创建一个下载链接
            const sc_setting_export_downloadLink = document.createElement('a');
            sc_setting_export_downloadLink.href = URL.createObjectURL(sc_setting_export_blob);

            // 设置文件名
            sc_setting_export_downloadLink.download = 'B站直播间SC记录板配置.json';

            // 将链接添加到页面中，模拟点击下载
            document.body.appendChild(sc_setting_export_downloadLink);
            sc_setting_export_downloadLink.click();

            // 移除链接
            document.body.removeChild(sc_setting_export_downloadLink);
        });

        $(document).on('click', '#sc_live_catch_import_setting_btn', function(e) {
            const the_import_setting_json_str = $(document).find('#sc_live_setting_import_textarea_content').val();
            if (the_import_setting_json_str.length) {
                try {
                    const the_import_setting_json = JSON.parse(the_import_setting_json_str);

                    // 如果大于30项，说明不是记录板的配置，小小的预防下错误
                    if (Object.keys(the_import_setting_json).length > 30) {
                        open_and_close_sc_modal('✗ 导入失败，请输入正确的配置', 'red', e, 1);
                    } else {

                        for (let setting_item in the_import_setting_json) {
                            if (setting_item.startsWith('live_')) {
                                if (typeof the_import_setting_json[setting_item] === 'object') {
                                    unsafeWindow.localStorage.setItem(setting_item, JSON.stringify(the_import_setting_json[setting_item]));
                                } else {
                                    unsafeWindow.localStorage.setItem(setting_item, the_import_setting_json[setting_item]);
                                }
                            }
                        }

                        alert("配置导入成功！刷新页面生效！");
                        unsafeWindow.location.reload();
                    }
                } catch {
                    open_and_close_sc_modal('✗ 导入失败，配置格式错误', 'red', e, 1);
                }
            }
        });

        $(document).on('click', '#sc_live_setting_sample_json_btn', function(e) {
            const the_default_setting_str = `{
  "live_sc_all_memory_config": {
    "sc_switch": 1,
    "sc_switch_fullscreen": 1,
    "sc_panel_fold_mode": 1,
    "sc_panel_fold_mode_fullscreen": 1,
    "sc_panel_side_fold_flag": true,
    "sc_panel_side_fold_flag_fullscreen": true,
    "sc_panel_side_fold_simple": false,
    "sc_panel_side_fold_simple_fullscreen": false,
    "sc_func_btn_mode": 2,
    "sc_func_btn_mode_fullscreen": 4,
    "sc_side_fold_custom_config": 1,
    "sc_side_fold_custom_time": 11.5,
    "sc_side_fold_custom_each_same_time_flag": true,
    "sc_rectangle_width": 388,
    "sc_rectangle_width_fullscreen": 325,
    "sc_panel_list_height": 170,
    "sc_panel_list_height_fullscreen": 400,
    "sc_item_order_up_flag": false,
    "data_show_bottom_flag": false,
    "sc_panel_allow_drag_flag": true,
    "sc_welt_hide_circle_half_flag": true,
    "sc_start_time_show_flag": true,
    "sc_live_sidebar_left_flag": false,
    "sc_live_fullscreen_config_separate_memory_flag": true,
    "sc_data_show_high_energy_num_flag": true,
    "sc_data_show_high_energy_num_flag_fullscreen": true,
    "sc_side_fold_fullscreen_auto_hide_list_flag": true,
    "sc_panel_show_time_mode": 0,
    "sc_panel_show_time_each_same": 0.5,
    "sc_live_panel_show_time_click_stop_flag": true,
    "sc_panel_drag_left": 1306.7321777,
    "sc_panel_drag_top": 96.6964340,
    "sc_panel_drag_left_percent": "0.9400951",
    "sc_panel_drag_top_percent": "0.1158041",
    "sc_panel_drag_top_fullscreen_percent": "0.1810428",
    "sc_panel_drag_left_fullscreen": 12.4910717,
    "sc_panel_drag_top_fullscreen": 173.9821472,
    "sc_panel_drag_left_fullscreen_percent": "0.0086683",
    "sc_start_time_simple_flag": true,
    "sc_list_search_shortkey_flag": true,
    "sc_list_search_div_bg_opacity_range": "30",
    "sc_live_auto_tianxuan_flag": false,
    "sc_live_send_dm_combo_flag": false,
    "sc_live_all_font_size_add": 5,
    "sc_live_font_size_only_message_flag": true,
    "sc_live_side_fold_head_border_bg_opacity_flag": false,
    "sc_live_item_bg_opacity_val": 0.8,
    "sc_live_hide_value_font_flag": true,
    "sc_live_hide_diff_time_flag": false,
    "sc_live_item_suspend_bg_opacity_one_flag": false,
    "sc_live_panel_not_show_now_time_sc_flag": false,
    "sc_live_panel_not_show_local_sc_flag": false
  },
  "live_sc_memory_all_rooms_mode": "3",
  "live_sc_screen_resolution_str": "1390_835",
  "live_sc_special_tip_location": "1",
  "live_sc_special_msg_flag": "true",
  "live_sc_special_sc_flag": "true",
  "live_sc_special_danmu_mode": "1",
  "live_sc_to_danmu_show_flag": "true",
  "live_sc_to_danmu_show_location": "0",
  "live_sc_to_danmu_show_mode": "3",
  "live_special_sc_no_remain_flag": "false",
  "live_sc_to_danmu_no_remain_flag": "false"
}`;

            $(document).find('#sc_live_setting_import_textarea_content').val(the_default_setting_str);

            open_and_close_sc_modal('✓ 填充成功', '#A7C9D3', e, 1);
        });

        // 创建一个自定义右键菜单
        let sc_func_button1 = document.createElement('button');
        sc_func_button1.className = 'sc_func_btn';
        sc_func_button1.id = 'sc_func_no_remember_show_sc_list_btn';
        sc_func_button1.innerHTML = '不记忆地显示醒目留言列表';
        sc_func_button1.style.marginBottom = '2px';

        let sc_func_button2 = document.createElement('button');
        sc_func_button2.className = 'sc_func_btn';
        sc_func_button2.id = 'sc_func_no_remember_hide_sc_list_btn';
        sc_func_button2.innerHTML = '不记忆地隐藏醒目留言列表';
        sc_func_button2.style.marginBottom = '2px';

        let sc_func_button3 = document.createElement('button');
        sc_func_button3.className = 'sc_func_btn';
        sc_func_button3.id = 'sc_func_no_remember_hide_expire_sc_btn';
        sc_func_button3.innerHTML = '不记忆地隐藏过期醒目留言';
        sc_func_button3.style.marginBottom = '2px';

        let sc_func_button4 = document.createElement('button');
        sc_func_button4.className = 'sc_func_btn';
        sc_func_button4.id = 'sc_func_show_btn';
        sc_func_button4.innerHTML = '侧折模式下显示所有的按钮';
        sc_func_button4.style.marginBottom = '2px';

        let sc_func_button5 = document.createElement('button');
        sc_func_button5.className = 'sc_func_btn';
        sc_func_button5.id = 'sc_func_hide_btn';
        sc_func_button5.innerHTML = '侧折模式下隐藏所有的按钮';
        sc_func_button5.style.marginBottom = '2px';

        let sc_func_button6 = document.createElement('button');
        sc_func_button6.className = 'sc_func_btn';
        sc_func_button6.id = 'sc_func_simple_btn';
        sc_func_button6.innerHTML = '侧折模式下按钮的极简模式';
        sc_func_button6.style.marginBottom = '2px';

        let sc_func_button7 = document.createElement('button');
        sc_func_button7.className = 'sc_func_btn';
        sc_func_button7.id = 'sc_func_one_min_btn';
        sc_func_button7.innerHTML = '侧折模式下只显示折叠按钮';
        sc_func_button7.style.marginBottom = '2px';

        let sc_func_button8 = document.createElement('button');
        sc_func_button8.className = 'sc_func_btn';
        sc_func_button8.id = 'sc_func_one_menu_btn';
        sc_func_button8.innerHTML = '侧折模式下只显示菜单按钮';
        sc_func_button8.style.marginBottom = '2px';

        let sc_func_button9 = document.createElement('button');
        sc_func_button9.className = 'sc_func_btn';
        sc_func_button9.id = 'sc_func_first_sc_item_config_btn';
        sc_func_button9.innerHTML = '侧折模式下留言显示自定义';
        sc_func_button9.style.marginBottom = '2px';

        let sc_func_button10 = document.createElement('button');
        sc_func_button10.className = 'sc_func_btn';
        sc_func_button10.id = 'sc_func_panel_sc_item_show_config_btn';
        sc_func_button10.innerHTML = '所有模式下留言显示自定义';
        sc_func_button10.style.marginBottom = '2px';

        let sc_func_button11 = document.createElement('button');
        sc_func_button11.className = 'sc_func_btn';
        sc_func_button11.id = 'sc_func_panel_width_config_btn';
        sc_func_button11.innerHTML = '设置记录板留言宽度自定义';
        sc_func_button11.style.marginBottom = '2px';

        let sc_func_button12 = document.createElement('button');
        sc_func_button12.className = 'sc_func_btn';
        sc_func_button12.id = 'sc_func_panel_height_config_btn';
        sc_func_button12.innerHTML = '设置记录板显示高度自定义';
        sc_func_button12.style.marginBottom = '2px';

        let sc_func_button13 = document.createElement('button');
        sc_func_button13.className = 'sc_func_btn';
        sc_func_button13.id = 'sc_func_item_order_config_btn';
        sc_func_button13.innerHTML = '设置记录板留言的排列顺序';
        sc_func_button13.style.marginBottom = '2px';

        let sc_func_button14 = document.createElement('button');
        sc_func_button14.className = 'sc_func_btn';
        sc_func_button14.id = 'sc_func_item_custom_search_btn';
        sc_func_button14.innerHTML = '搜索定位记录板留言自定义';
        sc_func_button14.style.marginBottom = '2px';

        let sc_func_button15 = document.createElement('button');
        sc_func_button15.className = 'sc_func_btn';
        sc_func_button15.id = 'sc_func_bottom_data_show_btn';
        sc_func_button15.innerHTML = '右侧的弹幕发送框显示数据';
        sc_func_button15.style.marginBottom = '2px';

        let sc_func_button16 = document.createElement('button');
        sc_func_button16.className = 'sc_func_btn';
        sc_func_button16.id = 'sc_func_bottom_data_hide_btn';
        sc_func_button16.innerHTML = '右侧的弹幕发送框隐藏数据';
        sc_func_button16.style.marginBottom = '2px';

        let sc_func_button17 = document.createElement('button');
        sc_func_button17.className = 'sc_func_btn';
        sc_func_button17.id = 'sc_func_panel_allow_drag_close_btn';
        sc_func_button17.innerHTML = '锁定记录板即关闭拖拽功能';
        sc_func_button17.style.marginBottom = '2px';

        let sc_func_button18 = document.createElement('button');
        sc_func_button18.className = 'sc_func_btn';
        sc_func_button18.id = 'sc_func_panel_allow_drag_open_btn';
        sc_func_button18.innerHTML = '解锁记录板即开放拖拽功能';
        sc_func_button18.style.marginBottom = '2px';

        let sc_func_button19 = document.createElement('button');
        sc_func_button19.className = 'sc_func_btn';
        sc_func_button19.id = 'sc_func_panel_switch_open_mode_btn';
        sc_func_button19.innerHTML = '展开记录板即切换展开模式';
        sc_func_button19.style.marginBottom = '2px';

        let sc_func_button20 = document.createElement('button');
        sc_func_button20.className = 'sc_func_btn';
        sc_func_button20.id = 'sc_circle_welt_hide_half_true_btn';
        sc_func_button20.innerHTML = '设置小图标在贴边后半隐藏';
        sc_func_button20.style.marginBottom = '2px';

        let sc_func_button21 = document.createElement('button');
        sc_func_button21.className = 'sc_func_btn';
        sc_func_button21.id = 'sc_circle_welt_hide_half_false_btn';
        sc_func_button21.innerHTML = '取消小图标在贴边后半隐藏';
        sc_func_button21.style.marginBottom = '2px';

        let sc_func_button22 = document.createElement('button');
        sc_func_button22.className = 'sc_func_btn';
        sc_func_button22.id = 'sc_func_item_show_time_btn';
        sc_func_button22.innerHTML = '显示醒目留言发送具体时间';
        sc_func_button22.style.marginBottom = '2px';

        let sc_func_button23 = document.createElement('button');
        sc_func_button23.className = 'sc_func_btn';
        sc_func_button23.id = 'sc_func_item_hide_time_btn';
        sc_func_button23.innerHTML = '隐藏醒目留言发送具体时间';
        sc_func_button23.style.marginBottom = '2px';

        let sc_func_button24 = document.createElement('button');
        sc_func_button24.className = 'sc_func_btn';
        sc_func_button24.id = 'sc_func_live_sidebar_left_btn';
        sc_func_button24.innerHTML = '设置直播间功能按钮在左侧';
        sc_func_button24.style.marginBottom = '2px';

        let sc_func_button25 = document.createElement('button');
        sc_func_button25.className = 'sc_func_btn';
        sc_func_button25.id = 'sc_func_live_sidebar_right_btn';
        sc_func_button25.innerHTML = '恢复直播间功能按钮在右侧';
        sc_func_button25.style.marginBottom = '2px';

        let sc_func_button26 = document.createElement('button');
        sc_func_button26.className = 'sc_func_btn';
        sc_func_button26.id = 'sc_func_live_sc_to_danmu_show_btn';
        sc_func_button26.innerHTML = '设置醒目留言以弹幕来展现';
        sc_func_button26.style.marginBottom = '2px';

        let sc_func_button27 = document.createElement('button');
        sc_func_button27.className = 'sc_func_btn';
        sc_func_button27.id = 'sc_func_fullscreen_separate_memory_btn';
        sc_func_button27.innerHTML = '一些设置在全屏时分开记忆';
        sc_func_button27.style.marginBottom = '2px';

        let sc_func_button28 = document.createElement('button');
        sc_func_button28.className = 'sc_func_btn';
        sc_func_button28.id = 'sc_func_live_special_tip_config_btn';
        sc_func_button28.innerHTML = '对特定用户进入直播间提示';
        sc_func_button28.style.marginBottom = '2px';

        let sc_func_button29 = document.createElement('button');
        sc_func_button29.className = 'sc_func_btn';
        sc_func_button29.id = 'sc_func_live_other_config_btn';
        sc_func_button29.innerHTML = '其他一些功能的自定义设置';
        sc_func_button29.style.marginBottom = '2px';

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
        let sc_func_br18 = document.createElement('br');
        let sc_func_br19 = document.createElement('br');
        let sc_func_br20 = document.createElement('br');
        let sc_func_br21 = document.createElement('br');
        let sc_func_br22 = document.createElement('br');
        let sc_func_br23 = document.createElement('br');
        let sc_func_br24 = document.createElement('br');
        let sc_func_br25 = document.createElement('br');
        let sc_func_br26 = document.createElement('br');
        let sc_func_br27 = document.createElement('br');
        let sc_func_br28 = document.createElement('br');

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
        sc_func_context_menu.appendChild(sc_func_br18);
        sc_func_context_menu.appendChild(sc_func_button19);
        sc_func_context_menu.appendChild(sc_func_br19);
        sc_func_context_menu.appendChild(sc_func_button20);
        sc_func_context_menu.appendChild(sc_func_br20);
        sc_func_context_menu.appendChild(sc_func_button21);
        sc_func_context_menu.appendChild(sc_func_br21);
        sc_func_context_menu.appendChild(sc_func_button22);
        sc_func_context_menu.appendChild(sc_func_br22);
        sc_func_context_menu.appendChild(sc_func_button23);
        sc_func_context_menu.appendChild(sc_func_br23);
        sc_func_context_menu.appendChild(sc_func_button24);
        sc_func_context_menu.appendChild(sc_func_br24);
        sc_func_context_menu.appendChild(sc_func_button25);
        sc_func_context_menu.appendChild(sc_func_br25);
        sc_func_context_menu.appendChild(sc_func_button26);
        sc_func_context_menu.appendChild(sc_func_br26);
        sc_func_context_menu.appendChild(sc_func_button27);
        sc_func_context_menu.appendChild(sc_func_br27);
        sc_func_context_menu.appendChild(sc_func_button28);
        sc_func_context_menu.appendChild(sc_func_br28);
        sc_func_context_menu.appendChild(sc_func_button29);

        // 将功能的右键菜单添加到body中
        document.body.appendChild(sc_func_context_menu);

        let sc_func_context_menu_fullscreen = sc_func_context_menu.cloneNode(true);
        sc_func_context_menu_fullscreen.id = 'sc_func_context_menu_fullscreen';
        $(live_player_div).append(sc_func_context_menu_fullscreen);

        $(document).on('click', '#sc_func_show_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_func_btn_mode_fullscreen = 0;
            } else {
                sc_func_btn_mode = 0;
            }

            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下显示所有的按钮✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_hide_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_func_btn_mode_fullscreen = 1;
            } else {
                sc_func_btn_mode = 1;
            }

            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下隐藏所有的按钮 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_simple_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_func_btn_mode_fullscreen = 2;
            } else {
                sc_func_btn_mode = 2;
            }

            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下按钮的极简模式 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_one_min_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_func_btn_mode_fullscreen = 3;
            } else {
                sc_func_btn_mode = 3;
            }

            sc_func_btn_mode_store();
            sc_btn_mode_apply();
            sc_after_click_func_btn_apply(e);

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已设置 侧折模式下只显示折叠按钮 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_one_menu_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                sc_func_btn_mode_fullscreen = 4;
            } else {
                sc_func_btn_mode = 4;
            }

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
            let sc_custom_config_radio_group_class = 'sc_custom_radio_group';
            let sc_custom_config_option_name = 'sc_custom_option';
            let sc_custom_config_checkbox_id = 'sc_custom_each_same_time_input';
            let sc_custom_config_input_id = 'sc_custom_time_input';

            if (sc_isFullscreen) {
                sc_custom_config_div_id = 'sc_custom_config_div_fullscreen';
                sc_custom_config_radio_group_class = 'sc_custom_radio_group_fullscreen';
                sc_custom_config_option_name = 'sc_custom_option_fullscreen';
                sc_custom_config_checkbox_id = 'sc_custom_each_same_time_input_fullscreen';
                sc_custom_config_input_id = 'sc_custom_time_input_fullscreen';
            }
            $(document).find('#' + sc_custom_config_div_id).show();

            $(document).find('.'+ sc_custom_config_radio_group_class +' input[name="'+ sc_custom_config_option_name +'"]').eq(sc_side_fold_custom_config).prop('checked', true);

            if (sc_side_fold_custom_config) {
                $(document).find('.sc_custom_checkbox_div').show();
                if (sc_side_fold_custom_config === 2) {
                    $(document).find('.sc_custom_input_div').show();
                }
            }

            $(document).find('#sc_custom_each_same_time_input').prop('checked', false);
            $(document).find('#sc_custom_each_same_time_input_fullscreen').prop('checked', false);
            if (sc_side_fold_custom_each_same_time_flag) {
                $(document).find('.sc_custom_input_div').show();
                $(document).find('#' + sc_custom_config_checkbox_id).prop('checked', true);

                let the_sc_side_fold_custom_time = 10;
                if (sc_side_fold_custom_time !== 0) {
                    the_sc_side_fold_custom_time = sc_side_fold_custom_time - 1.5;
                }

                $(document).find('#' + sc_custom_config_input_id).val(the_sc_side_fold_custom_time);
            }

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_panel_sc_item_show_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_panel_show_time_config_div_id = 'sc_live_panel_show_time_config_div';
            let sc_live_panel_show_time_radio_group_class = 'sc_live_panel_show_time_radio_group';
            let sc_live_panel_show_time_option_name = 'sc_live_panel_show_time_option';
            let sc_live_panel_show_time_sc_input_id = 'sc_live_panel_show_time_sc_input';
            let sc_live_panel_show_time_sc_and_most_time_input_id = 'sc_live_panel_show_time_sc_and_most_time_input';
            let sc_live_panel_show_time_sc_and_most_second_input_id = 'sc_live_panel_show_time_sc_and_most_second_input';
            let sc_live_panel_show_time_click_stop_checkbox_id = 'sc_live_panel_show_time_click_stop';
            let sc_live_panel_not_show_now_time_sc_checkbox_id = 'sc_live_panel_not_show_now_time_sc';
            let sc_live_panel_not_show_local_sc_checkbox_id = 'sc_live_panel_not_show_local_sc';
            if (sc_isFullscreen) {
                sc_panel_show_time_config_div_id = 'sc_live_panel_show_time_config_div_fullscreen';
                sc_live_panel_show_time_radio_group_class = 'sc_live_panel_show_time_radio_group_fullscreen';
                sc_live_panel_show_time_option_name = 'sc_live_panel_show_time_option_fullscreen';
                sc_live_panel_show_time_sc_input_id = 'sc_live_panel_show_time_sc_input_fullscreen';
                sc_live_panel_show_time_sc_and_most_time_input_id = 'sc_live_panel_show_time_sc_and_most_time_input_fullscreen';
                sc_live_panel_show_time_sc_and_most_second_input_id = 'sc_live_panel_show_time_sc_and_most_second_input_fullscreen';
                sc_live_panel_show_time_click_stop_checkbox_id = 'sc_live_panel_show_time_click_stop_fullscreen';
                sc_live_panel_not_show_now_time_sc_checkbox_id = 'sc_live_panel_not_show_now_time_sc_fullscreen';
                sc_live_panel_not_show_local_sc_checkbox_id = 'sc_live_panel_not_show_local_sc_fullscreen';
            }
            $(document).find('#' + sc_panel_show_time_config_div_id).show();
            $(document).find('.'+ sc_live_panel_show_time_radio_group_class +' input[name="'+ sc_live_panel_show_time_option_name +'"]').eq(sc_panel_show_time_mode).prop('checked', true);
            let the_sc_panel_show_time_each_same = sc_panel_show_time_each_same;
            if (the_sc_panel_show_time_each_same === 0.5) {
                the_sc_panel_show_time_each_same = 2;
            }

            if (sc_panel_show_time_mode === 5) {
                $(document).find('#' + sc_live_panel_show_time_sc_and_most_second_input_id).val(Math.round(the_sc_panel_show_time_each_same * 60));
            } else {
                $(document).find('#' + sc_live_panel_show_time_sc_input_id).val(the_sc_panel_show_time_each_same);
                $(document).find('#' + sc_live_panel_show_time_sc_and_most_time_input_id).val(the_sc_panel_show_time_each_same);
            }

            $(document).find('#sc_live_panel_show_time_click_stop').prop('checked', false);
            $(document).find('#sc_live_panel_show_time_click_stop_fullscreen').prop('checked', false);
            if (sc_live_panel_show_time_click_stop_flag) {
                $(document).find('#' + sc_live_panel_show_time_click_stop_checkbox_id).prop('checked', true);
            }
            $(document).find('#sc_live_panel_not_show_now_time_sc').prop('checked', false);
            $(document).find('#sc_live_panel_not_show_now_time_sc_fullscreen').prop('checked', false);
            if (sc_live_panel_not_show_now_time_sc_flag) {
                $(document).find('#' + sc_live_panel_not_show_now_time_sc_checkbox_id).prop('checked', true);
            }
            $(document).find('#sc_live_panel_not_show_local_sc').prop('checked', false);
            $(document).find('#sc_live_panel_not_show_local_sc_fullscreen').prop('checked', false);
            if (sc_live_panel_not_show_local_sc_flag) {
                $(document).find('#' + sc_live_panel_not_show_local_sc_checkbox_id).prop('checked', true);
            }

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_panel_width_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_panel_width_config_div_id = 'sc_panel_width_config_div';
            let the_sc_rectangle_width_config_val = sc_rectangle_width;
            let sc_panel_width_config_input_id = 'sc_panel_width_input';
            if (sc_isFullscreen) {
                sc_panel_width_config_div_id = 'sc_panel_width_config_div_fullscreen';
                the_sc_rectangle_width_config_val = sc_rectangle_width_fullscreen;
                sc_panel_width_config_input_id = 'sc_panel_width_input_fullscreen';
            }
            $(document).find('#' + sc_panel_width_config_div_id).show();

            $(document).find('#' + sc_panel_width_config_input_id).val(the_sc_rectangle_width_config_val);

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_panel_height_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_panel_height_config_div_id = 'sc_panel_height_config_div';
            let the_sc_panel_height_config_val = sc_panel_list_height;
            let sc_panel_height_config_input_id = 'sc_panel_height_input';
            if (sc_isFullscreen) {
                sc_panel_height_config_div_id = 'sc_panel_height_config_div_fullscreen';
                the_sc_panel_height_config_val = sc_panel_list_height_fullscreen;
                sc_panel_height_config_input_id = 'sc_panel_height_input_fullscreen';
            }
            $(document).find('#' + sc_panel_height_config_div_id).show();

            $(document).find('#' + sc_panel_height_config_input_id).val(the_sc_panel_height_config_val);

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_item_order_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_item_order_config_div_id = 'sc_item_order_config_div';
            let sc_item_order_config_radio_group_class = 'sc_item_order_radio_group';
            let sc_item_order_config_option_name = 'sc_item_order_option';
            if (sc_isFullscreen) {
                sc_item_order_config_div_id = 'sc_item_order_config_div_fullscreen';
                sc_item_order_config_radio_group_class = 'sc_item_order_radio_group_fullscreen';
                sc_item_order_config_option_name = 'sc_item_order_option_fullscreen';
            }
            $(document).find('#' + sc_item_order_config_div_id).show();

            if (sc_item_order_up_flag) {
                $(document).find('.'+ sc_item_order_config_radio_group_class +' input[name="'+ sc_item_order_config_option_name +'"]').eq(1).prop('checked', true);
            }

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_item_custom_search_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_live_search_config_div_id = 'sc_live_search_config_div';
            if (sc_isFullscreen) {
                sc_live_search_config_div_id = 'sc_live_search_config_div_fullscreen';
            }
            let the_sc_live_search_modal_div = $(document).find('#' + sc_live_search_config_div_id);
            the_sc_live_search_modal_div.show();

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
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

        $(document).on('click', '#sc_func_no_remember_show_sc_list_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_panel_list_no_remember_show();

            if (sc_live_panel_show_time_click_stop_flag) {
                // 暂停过期检查
                $(document).find('.sc_long_list').addClass('sc_long_expire_check_stop');
            }

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已显示醒目留言列表，该操作不会记忆 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_no_remember_hide_sc_list_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            sc_panel_list_no_remember_hide();

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已隐藏醒目留言列表，该操作不会记忆 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_no_remember_hide_expire_sc_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            // 隐藏已经标记的
            $(document).find('.sc_long_expire_tag_item').fadeOut(500);

            if (sc_live_panel_show_time_click_stop_flag) {
                // 重启过期检查
                $(document).find('.sc_long_list').removeClass('sc_long_expire_check_stop');
            }

            $(this).parent().fadeOut();
            open_and_close_sc_modal('已隐藏过期醒目留言，该操作不会记忆 ✓', '#A7C9D3', e, 1);
        });

        $(document).on('click', '#sc_func_live_sc_to_danmu_show_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_live_sc_to_danmu_show_config_div_id = 'sc_live_sc_to_danmu_show_config_div';
            let sc_live_sc_to_danmu_show_config_checkbox_id = 'sc_live_sc_to_danmu_show_checkbox';
            let sc_live_sc_to_danmu_show_radio_group_class = 'sc_live_sc_to_danmu_show_radio_group';
            let sc_live_sc_to_danmu_show_location_option_name = 'sc_live_sc_to_danmu_show_location_option';
            let sc_live_sc_to_danmu_show_mode_option_name = 'sc_live_sc_to_danmu_show_mode_option';
            let sc_live_sc_to_danmu_no_remain_config_checkbox_id = 'sc_live_sc_to_danmu_no_remain_checkbox';
            if (sc_isFullscreen) {
                sc_live_sc_to_danmu_show_config_div_id = 'sc_live_sc_to_danmu_show_config_div_fullscreen';
                sc_live_sc_to_danmu_show_config_checkbox_id = 'sc_live_sc_to_danmu_show_checkbox_fullscreen';
                sc_live_sc_to_danmu_show_radio_group_class = 'sc_live_sc_to_danmu_show_radio_group_fullscreen';
                sc_live_sc_to_danmu_show_location_option_name = 'sc_live_sc_to_danmu_show_location_option_fullscreen';
                sc_live_sc_to_danmu_show_mode_option_name = 'sc_live_sc_to_danmu_show_mode_option_fullscreen';
                sc_live_sc_to_danmu_no_remain_config_checkbox_id = 'sc_live_sc_to_danmu_no_remain_checkbox_fullscreen';
            }
            $(document).find('#' + sc_live_sc_to_danmu_show_config_div_id).show();

            $(document).find('#sc_live_sc_to_danmu_show_checkbox').prop('checked', false);
            $(document).find('#sc_live_sc_to_danmu_show_checkbox_fullscreen').prop('checked', false);
            if (sc_live_sc_to_danmu_show_flag) {
                $(document).find('#' + sc_live_sc_to_danmu_show_config_checkbox_id).prop('checked', true);
            }

            $(document).find('.'+ sc_live_sc_to_danmu_show_radio_group_class +' input[name="'+ sc_live_sc_to_danmu_show_location_option_name +'"]').eq(sc_live_sc_to_danmu_show_location).prop('checked', true);

            $(document).find('.'+ sc_live_sc_to_danmu_show_radio_group_class +' input[name="'+ sc_live_sc_to_danmu_show_mode_option_name +'"]').eq(sc_live_sc_to_danmu_show_mode).prop('checked', true);

            $(document).find('#sc_live_sc_to_danmu_no_remain_checkbox').prop('checked', false);
            $(document).find('#sc_live_sc_to_danmu_no_remain_checkbox_fullscreen').prop('checked', false);
            if (sc_live_sc_to_danmu_no_remain_flag) {
                $(document).find('#' + sc_live_sc_to_danmu_no_remain_config_checkbox_id).prop('checked', true);
            }

            $(this).parent().fadeOut();
        });



        $(document).on('click', '#sc_func_fullscreen_separate_memory_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_fullscreen_separate_memory_config_div_id = 'sc_fullscreen_separate_memory_config_div';
            let sc_fullscreen_separate_memory_config_checkbox_id = 'sc_some_fullscreen_separate_memory';
            if (sc_isFullscreen) {
                sc_fullscreen_separate_memory_config_div_id = 'sc_fullscreen_separate_memory_config_div_fullscreen';
                sc_fullscreen_separate_memory_config_checkbox_id = 'sc_some_fullscreen_separate_memory_fullscreen';
            }
            $(document).find('#' + sc_fullscreen_separate_memory_config_div_id).show();

            $(document).find('#sc_some_fullscreen_separate_memory').prop('checked', false);
            $(document).find('#sc_some_fullscreen_separate_memory_fullscreen').prop('checked', false);
            if (sc_live_fullscreen_config_separate_memory_flag) {
                $(document).find('#' + sc_fullscreen_separate_memory_config_checkbox_id).prop('checked', true);
            }

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_live_special_tip_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_live_special_tip_config_div_id = 'sc_live_special_tip_config_div';
            let sc_live_special_tip_location_radio_group_class = 'sc_live_special_tip_radio_group';
            let sc_live_special_tip_location_option_name = 'sc_live_special_tip_option';
            let sc_live_special_danmu_mode_option_name = 'sc_live_special_danmu_mode_option';
            let sc_live_special_tip_textarea_id = 'sc_live_special_tip_textarea_content';
            let sc_live_special_msg_config_checkbox_id = 'sc_live_special_msg_checkbox';
            let sc_live_special_sc_config_checkbox_id = 'sc_live_special_sc_checkbox';
            let sc_live_special_sc_no_remain_flag_config_checkbox_id = 'sc_live_special_sc_no_remain_checkbox';
            if (sc_isFullscreen) {
                sc_live_special_tip_config_div_id = 'sc_live_special_tip_config_div_fullscreen';
                sc_live_special_tip_location_radio_group_class = 'sc_live_special_tip_radio_group_fullscreen';
                sc_live_special_tip_location_option_name = 'sc_live_special_tip_option_fullscreen';
                sc_live_special_danmu_mode_option_name = 'sc_live_special_danmu_mode_option_fullscreen';
                sc_live_special_tip_textarea_id = 'sc_live_special_tip_textarea_content_fullscreen';
                sc_live_special_msg_config_checkbox_id = 'sc_live_special_msg_checkbox_fullscreen';
                sc_live_special_sc_config_checkbox_id = 'sc_live_special_sc_checkbox_fullscreen';
                sc_live_special_sc_no_remain_flag_config_checkbox_id = 'sc_live_special_sc_no_remain_checkbox_fullscreen';
            }
            $(document).find('#' + sc_live_special_tip_config_div_id).show();

            $(document).find('#' + sc_live_special_tip_textarea_id).val(sc_live_special_tip_str);

            $(document).find('.'+ sc_live_special_tip_location_radio_group_class +' input[name="'+ sc_live_special_tip_location_option_name +'"]').eq(sc_live_special_tip_location).prop('checked', true);

            $(document).find('#sc_live_special_msg_checkbox').prop('checked', false);
            $(document).find('#sc_live_special_msg_checkbox_fullscreen').prop('checked', false);
            if (sc_live_special_msg_flag) {
                $(document).find('#' + sc_live_special_msg_config_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_special_sc_checkbox').prop('checked', false);
            $(document).find('#sc_live_special_sc_checkbox_fullscreen').prop('checked', false);
            if (sc_live_special_sc_flag) {
                $(document).find('#' + sc_live_special_sc_config_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_special_sc_no_remain_checkbox').prop('checked', false);
            $(document).find('#sc_live_special_sc_no_remain_checkbox_fullscreen').prop('checked', false);
            if (sc_live_special_sc_no_remain_flag) {
                $(document).find('#' + sc_live_special_sc_no_remain_flag_config_checkbox_id).prop('checked', true);
            }

            $(document).find('.'+ sc_live_special_tip_location_radio_group_class +' input[name="'+ sc_live_special_danmu_mode_option_name +'"]').eq(sc_live_special_danmu_mode).prop('checked', true);

            $(this).parent().fadeOut();
        });

        $(document).on('click', '#sc_func_live_other_config_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_live_other_config_div_id = 'sc_live_other_config_div';
            let the_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag;
            let sc_live_other_config_radio_group_class = 'sc_live_other_radio_group';
            let sc_live_other_config_radio_option_name = 'sc_live_other_option';
            let sc_live_other_auto_hide_config_checkbox_id = 'sc_live_other_fullscreen_auto_hide_list';
            let sc_live_other_start_time_simple_flag_checkbox_id = 'sc_live_other_start_time_simple_flag';
            let sc_live_other_search_shortkey_flag_checkbox_id = 'sc_live_other_search_shortkey_flag';
            let sc_live_other_auto_tianxuan_flag_checkbox_id = 'sc_live_other_auto_tianxuan_flag';
            let sc_live_other_auto_dm_combo_flag_checkbox_id = 'sc_live_other_auto_dm_combo_flag';
            let sc_live_other_all_font_size_add_id = 'sc_live_other_all_font_size_add';
            let sc_live_other_font_size_only_message_flag_id = 'sc_live_other_font_size_only_message_flag';
            let sc_live_other_side_fold_head_border_bg_opacity_flag_id = 'sc_live_other_side_fold_head_border_bg_opacity_flag';
            let sc_live_item_bg_opacity_val_id = 'sc_live_item_bg_opacity_val';
            let sc_live_other_item_suspend_bg_opacity_one_flag_id = 'sc_live_item_suspend_bg_opacity_one_flag';
            let sc_live_other_hide_value_font_flag_id = 'sc_live_other_hide_value_font_flag';
            let sc_live_other_hide_diff_time_flag_id = 'sc_live_other_hide_diff_time_flag';

            if (sc_isFullscreen) {
                sc_live_other_config_div_id = 'sc_live_other_config_div_fullscreen';
                the_sc_data_show_high_energy_num_flag = sc_data_show_high_energy_num_flag_fullscreen;
                sc_live_other_config_radio_group_class = 'sc_live_other_radio_group_fullscreen';
                sc_live_other_config_radio_option_name = 'sc_live_other_option_fullscreen';
                sc_live_other_auto_hide_config_checkbox_id = 'sc_live_other_fullscreen_auto_hide_list_fullscreen';
                sc_live_other_start_time_simple_flag_checkbox_id = 'sc_live_other_start_time_simple_flag_fullscreen';
                sc_live_other_search_shortkey_flag_checkbox_id = 'sc_live_other_search_shortkey_flag_fullscreen';
                sc_live_other_auto_tianxuan_flag_checkbox_id = 'sc_live_other_auto_tianxuan_flag_fullscreen';
                sc_live_other_auto_dm_combo_flag_checkbox_id = 'sc_live_other_auto_dm_combo_flag_fullscreen';
                sc_live_other_all_font_size_add_id = 'sc_live_other_all_font_size_add_fullscreen';
                sc_live_other_font_size_only_message_flag_id = 'sc_live_other_font_size_only_message_flag_fullscreen';
                sc_live_other_side_fold_head_border_bg_opacity_flag_id = 'sc_live_other_side_fold_head_border_bg_opacity_flag_fullscreen';
                sc_live_item_bg_opacity_val_id = 'sc_live_item_bg_opacity_val_fullscreen';
                sc_live_other_item_suspend_bg_opacity_one_flag_id = 'sc_live_item_suspend_bg_opacity_one_flag_fullscreen';
                sc_live_other_hide_value_font_flag_id = 'sc_live_other_hide_value_font_flag_fullscreen';
                sc_live_other_hide_diff_time_flag_id = 'sc_live_other_hide_diff_time_flag_fullscreen';
            }
            $(document).find('#' + sc_live_other_config_div_id).show();

            if (the_sc_data_show_high_energy_num_flag) {
                $(document).find('.'+ sc_live_other_config_radio_group_class +' input[name="'+ sc_live_other_config_radio_option_name +'"]').eq(1).prop('checked', true);
            }

            $(document).find('#sc_live_other_fullscreen_auto_hide_list').prop('checked', false);
            $(document).find('#sc_live_other_fullscreen_auto_hide_list_fullscreen').prop('checked', false);
            if (sc_side_fold_fullscreen_auto_hide_list_flag) {
                $(document).find('#' + sc_live_other_auto_hide_config_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_start_time_simple_flag').prop('checked', false);
            $(document).find('#sc_live_other_start_time_simple_flag_fullscreen').prop('checked', false);
            if (sc_start_time_simple_flag) {
                $(document).find('#' + sc_live_other_start_time_simple_flag_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_search_shortkey_flag').prop('checked', false);
            $(document).find('#sc_live_other_search_shortkey_flag_fullscreen').prop('checked', false);
            if (sc_list_search_shortkey_flag) {
                $(document).find('#' + sc_live_other_search_shortkey_flag_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_auto_tianxuan_flag').prop('checked', false);
            $(document).find('#sc_live_other_auto_tianxuan_flag_fullscreen').prop('checked', false);
            if (sc_live_auto_tianxuan_flag) {
                $(document).find('#' + sc_live_other_auto_tianxuan_flag_checkbox_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_auto_dm_combo_flag').prop('checked', false);
            $(document).find('#sc_live_other_auto_dm_combo_flag_fullscreen').prop('checked', false);
            if (sc_live_send_dm_combo_flag) {
                $(document).find('#' + sc_live_other_auto_dm_combo_flag_checkbox_id).prop('checked', true);
            }

            $(document).find('#' + sc_live_other_all_font_size_add_id).val(sc_live_all_font_size_add);
            $(document).find('#' + sc_live_other_font_size_only_message_flag_id).prop('checked', false);
            if (sc_live_font_size_only_message_flag) {
                $(document).find('#' + sc_live_other_font_size_only_message_flag_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_side_fold_head_border_bg_opacity_flag').prop('checked', false);
            $(document).find('#sc_live_other_side_fold_head_border_bg_opacity_flag_fullscreen').prop('checked', false);
            if (sc_live_side_fold_head_border_bg_opacity_flag) {
                $(document).find('#' + sc_live_other_side_fold_head_border_bg_opacity_flag_id).prop('checked', true);
            }

            $(document).find('#' + sc_live_item_bg_opacity_val_id).val(sc_live_item_bg_opacity_val);

            $(document).find('#sc_live_item_suspend_bg_opacity_one_flag').prop('checked', false);
            $(document).find('#sc_live_item_suspend_bg_opacity_one_flag_fullscreen').prop('checked', false);
            if (sc_live_item_suspend_bg_opacity_one_flag) {
                $(document).find('#' + sc_live_other_item_suspend_bg_opacity_one_flag_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_hide_value_font_flag').prop('checked', false);
            $(document).find('#sc_live_other_hide_value_font_flag_fullscreen').prop('checked', false);
            if (sc_live_hide_value_font_flag) {
                $(document).find('#' + sc_live_other_hide_value_font_flag_id).prop('checked', true);
            }

            $(document).find('#sc_live_other_hide_diff_time_flag').prop('checked', false);
            $(document).find('#sc_live_other_hide_diff_time_flag_fullscreen').prop('checked', false);
            if (sc_live_hide_diff_time_flag) {
                $(document).find('#' + sc_live_other_hide_diff_time_flag_id).prop('checked', true);
            }

            $(this).parent().fadeOut();
        });

        // 创建一个自定义右键菜单
        let sc_copy_button1 = document.createElement('button');
        sc_copy_button1.className = 'sc_search_btn';
        sc_copy_button1.id = 'sc_copy_content_btn';
        sc_copy_button1.innerHTML = '点击复制内容(快速复制)';
        sc_copy_button1.style.marginBottom = '2px';

        let sc_copy_button2 = document.createElement('button');
        sc_copy_button2.className = 'sc_copy_btn';
        sc_copy_button2.id = 'sc_copy_has_time_btn';
        sc_copy_button2.innerHTML = '点击复制为图片(有时间)';
        sc_copy_button2.style.marginBottom = '2px';

        let sc_copy_button3 = document.createElement('button');
        sc_copy_button3.className = 'sc_copy_btn';
        sc_copy_button3.id = 'sc_copy_no_time_btn';
        sc_copy_button3.innerHTML = '点击复制为图片(没时间)';
        sc_copy_button3.style.marginBottom = '2px';

        let sc_copy_button4 = document.createElement('button');
        sc_copy_button4.className = 'sc_copy_btn';
        sc_copy_button4.id = 'sc_copy_uname_color_btn';
        sc_copy_button4.innerHTML = '点击复制为图片(名颜色)';
        sc_copy_button4.style.marginBottom = '2px';

        let sc_copy_button5 = document.createElement('button');
        sc_copy_button5.className = 'sc_search_btn';
        sc_copy_button5.id = 'sc_pos_to_newest_btn';
        sc_copy_button5.innerHTML = '到达最新留言(快速定位)';
        sc_copy_button5.style.marginBottom = '2px';

        let sc_copy_button6 = document.createElement('button');
        sc_copy_button6.className = 'sc_search_btn';
        sc_copy_button6.id = 'sc_pos_first_unfold_btn';
        sc_copy_button6.innerHTML = '最早未折叠的(快速定位)';
        sc_copy_button6.style.marginBottom = '2px';

        let sc_copy_button7 = document.createElement('button');
        sc_copy_button7.className = 'sc_search_btn';
        sc_copy_button7.id = 'sc_pos_last_fold_btn';
        sc_copy_button7.innerHTML = '最后已折叠的(快速定位)';
        sc_copy_button7.style.marginBottom = '2px';

        let sc_copy_button8 = document.createElement('button');
        sc_copy_button8.className = 'sc_search_btn';
        sc_copy_button8.id = 'sc_pos_half_hour_ago_btn';
        sc_copy_button8.innerHTML = '半个小时前的(快速定位)';
        sc_copy_button8.style.marginBottom = '2px';

        let sc_copy_button9 = document.createElement('button');
        sc_copy_button9.className = 'sc_search_btn';
        sc_copy_button9.id = 'sc_pos_more_search_btn';
        sc_copy_button9.innerHTML = '更多定义搜索(快速定位)';

        let sc_copy_br1 = document.createElement('br');
        let sc_copy_br2 = document.createElement('br');
        let sc_copy_br3 = document.createElement('br');
        let sc_copy_br4 = document.createElement('br');
        let sc_copy_br5 = document.createElement('br');
        let sc_copy_br6 = document.createElement('br');
        let sc_copy_br7 = document.createElement('br');
        let sc_copy_br8 = document.createElement('br');

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
        sc_copy_context_menu.appendChild(sc_copy_br3);
        sc_copy_context_menu.appendChild(sc_copy_button4);
        sc_copy_context_menu.appendChild(sc_copy_br4);
        sc_copy_context_menu.appendChild(sc_copy_button5);
        sc_copy_context_menu.appendChild(sc_copy_br5);
        sc_copy_context_menu.appendChild(sc_copy_button6);
        sc_copy_context_menu.appendChild(sc_copy_br6);
        sc_copy_context_menu.appendChild(sc_copy_button7);
        sc_copy_context_menu.appendChild(sc_copy_br7);
        sc_copy_context_menu.appendChild(sc_copy_button8);
        sc_copy_context_menu.appendChild(sc_copy_br8);
        sc_copy_context_menu.appendChild(sc_copy_button9);

        // 将复制的右键菜单添加到body中
        document.body.appendChild(sc_copy_context_menu);

        let sc_copy_context_menu_fullscreen = sc_copy_context_menu.cloneNode(true);
        sc_copy_context_menu_fullscreen.id = 'sc_copy_context_menu_fullscreen';
        $(live_player_div).append(sc_copy_context_menu_fullscreen);

        $(document).on('mouseover', '.sc_copy_btn, .sc_func_btn, .sc_search_btn', function() {
            $(this).css('transform', 'translateX(-2px)');
            setTimeout(function() {
                $(document).find('.sc_copy_btn, .sc_func_btn, .sc_search_btn').css('transform', 'translateY(0)');
            }, 200);

        })

        $(document).on('click', '#sc_copy_content_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let current_sc_div = $(sc_copy_context_menu).data('current_sc_div');
            let the_current_sc_content = $(current_sc_div).find('.sc_msg_body span').text();

            $(this).parent().fadeOut();

            navigator.clipboard.writeText(the_current_sc_content).then(() => {
                open_and_close_sc_modal('✓ 复制成功', '#A7C9D3', e, 1);
            }).catch(err => {
                open_and_close_sc_modal('✗ 复制失败', 'red', e, 1);
            });
        });

        $(document).on('click', '#sc_pos_to_newest_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen) {
                let the_match_item_divs_live = document.querySelectorAll('#live-player .sc_long_item');
                let the_search_item_div_live = the_match_item_divs_live[0];
                if (sc_item_order_up_flag) {
                    the_search_item_div_live = the_match_item_divs_live[the_match_item_divs_live.length - 1];
                }
                the_search_item_div_live.scrollIntoView({block: 'center' });

            } else {
                let the_match_item_divs_body = document.querySelectorAll('.sc_long_item');
                let the_search_item_div_body = the_match_item_divs_body[0];
                if (sc_item_order_up_flag) {
                    the_search_item_div_body = the_match_item_divs_body[the_match_item_divs_body.length - 1];
                }
                the_search_item_div_body.scrollIntoView({block: 'center' });
            }

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
        });

        $(document).on('click', '#sc_pos_first_unfold_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen) {
                let the_match_item_divs_live = document.querySelectorAll('#live-player .sc_long_item[data-fold="0"]');
                let the_search_item_div_live = the_match_item_divs_live[the_match_item_divs_live.length - 1];
                the_search_item_div_live.scrollIntoView({block: 'center' });

            } else {
                let the_match_item_divs_body = document.querySelectorAll('.sc_long_item[data-fold="0"]');
                let the_search_item_div_body = the_match_item_divs_body[the_match_item_divs_body.length - 1];
                the_search_item_div_body.scrollIntoView({block: 'center' });
            }

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
        });

        $(document).on('click', '#sc_pos_last_fold_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen) {
                let the_match_item_divs_live = document.querySelectorAll('#live-player .sc_long_item[data-fold="1"]');
                if (the_match_item_divs_live.length) {
                    let the_search_item_div_live = the_match_item_divs_live[0];
                    the_search_item_div_live.scrollIntoView({block: 'center' });
                }

            } else {
                let the_match_item_divs_body = document.querySelectorAll('.sc_long_item[data-fold="1"]');
                if (the_match_item_divs_body.length) {
                    let the_search_item_div_body = the_match_item_divs_body[0];
                    the_search_item_div_body.scrollIntoView({block: 'center' });
                }
            }

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
        });

        $(document).on('click', '#sc_pos_half_hour_ago_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            if (sc_isFullscreen) {
                let the_closest_div = find_time_closest_div('#live-player .sc_long_item', 30);
                if (the_closest_div) {
                    the_closest_div.scrollIntoView({block: 'center' });
                }
            } else {
                let the_closest_div = find_time_closest_div('.sc_long_item', 30);
                if (the_closest_div) {
                    the_closest_div.scrollIntoView({block: 'center' });
                }
            }

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
        });

        $(document).on('click', '#sc_pos_more_search_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            let sc_live_search_config_div_id = 'sc_live_search_config_div';
            if (sc_isFullscreen) {
                sc_live_search_config_div_id = 'sc_live_search_config_div_fullscreen';
            }
            let the_sc_live_search_modal_div = $(document).find('#' + sc_live_search_config_div_id);
            the_sc_live_search_modal_div.show();

            let current_sc_div = $(sc_copy_context_menu).data('current_sc_div');
            let the_current_user_name = $(current_sc_div).find('.sc_font_color').text();
            the_sc_live_search_modal_div.find('.sc_live_search_user_name_input').val(the_current_user_name);

            $(this).parent().fadeOut(function() {
                open_and_close_sc_modal('✓', '#A7C9D3', e);
            });
        });

        $(document).on('click', '.sc_copy_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_long_rectangle').css('cursor', 'progress');

            sc_after_click_func_btn_apply(e, true);

            let the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag;
            let the_copy_sc_rectangle_width = sc_rectangle_width;
            if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                the_copy_sc_panel_side_fold_flag = sc_panel_side_fold_flag_fullscreen;
                the_copy_sc_rectangle_width = sc_rectangle_width_fullscreen;
            }

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

                if (the_copy_sc_panel_side_fold_flag) {
                    $(current_sc_div).css('width', (the_copy_sc_rectangle_width - 22) + 'px');
                    sc_side_fold_out_one($(current_sc_div));
                    if ($(current_sc_div).attr('data-fold') === '0') {
                        $(current_sc_div).css('height', $(current_sc_div).attr('data-height') + 'px');
                    }
                }

                let tmp_sc_item = $(current_sc_div).clone(); // 为了去掉animation的影响
                tmp_sc_item.width(current_sc_div.clientWidth);
                tmp_sc_item.height(current_sc_div.clientHeight);
                tmp_sc_item.css('animation', 'unset');
                tmp_sc_item.find('.sc_font_color').css('color', '#000000');
                tmp_sc_item.find('.sc_start_time').show();

                let tmp_sc_item_bg_color = tmp_sc_item.css('background-color');
                let tmp_sc_item_head_bg_color = tmp_sc_item.find('.sc_msg_head').css('background-color');
                // 恢复背景透明度为1
                tmp_sc_item_bg_color = change_color_opacity(tmp_sc_item_bg_color, 1);
                tmp_sc_item_head_bg_color = change_color_opacity(tmp_sc_item_head_bg_color, 1);
                tmp_sc_item.css('background-color', tmp_sc_item_bg_color);
                tmp_sc_item.find('.sc_msg_head').css('background-color', tmp_sc_item_head_bg_color);

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

                if (the_copy_sc_panel_side_fold_flag) {
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
            if (unsafeWindow.innerHeight - e.clientY <= 770) {
                e.clientY = unsafeWindow.innerHeight - 770;
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

        if (sc_live_auto_tianxuan_flag) {
            setTimeout(() => {

                sc_get_follow_up_flag().then(the_sc_follow_up_flag => {
                    let the_anchor_before_obj = $(document).find('#gift-control-vm .anchor-lottery-entry');

                    if (the_sc_follow_up_flag && the_anchor_before_obj.length) {
                        the_anchor_before_obj.trigger('click'); // 若已关注，并且已经存在天选，则先触发点击，展开天选弹窗

                        handle_auto_tianxuan(the_sc_follow_up_flag);
                    }
                });

            }, 3000); // 等渲染完成
        }

        // 分辨率变化相关
        if (!sc_screen_resolution_change_flag && (!sc_panel_drag_left_percent || !sc_panel_drag_top_percent || !sc_panel_drag_left_fullscreen_percent || !sc_panel_drag_top_fullscreen_percent)) {
            sc_panel_drag_store(sc_panel_drag_left, sc_panel_drag_top);
        }

        let sc_window_resizeTimeout;

        unsafeWindow.addEventListener('resize', () => {

            clearTimeout(sc_window_resizeTimeout);

            // 设置一个延迟来获取最新的 unsafeWindow.top.document.documentElement.clientWidth 或者 unsafeWindow.top.document.documentElement.clientHeight
            sc_window_resizeTimeout = setTimeout(() => {

                sc_screen_resolution_change_flag = sc_screen_resolution_change_check();

                if (sc_screen_resolution_change_flag) {

                    if (sc_panel_drag_left_percent) { sc_panel_drag_left = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_percent); }
                    if (sc_panel_drag_top_percent) { sc_panel_drag_top = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_percent); }
                    if (sc_panel_drag_left_fullscreen_percent) { sc_panel_drag_left_fullscreen = unsafeWindow.top.document.documentElement.clientWidth * parseFloat(sc_panel_drag_left_fullscreen_percent); }
                    if (sc_panel_drag_top_fullscreen_percent) { sc_panel_drag_top_fullscreen = unsafeWindow.top.document.documentElement.clientHeight * parseFloat(sc_panel_drag_top_fullscreen_percent); }

                    let the_resize_sc_panel_left = sc_panel_drag_left;
                    let the_resize_sc_panel_top = sc_panel_drag_top;
                    if (sc_isFullscreen && sc_live_fullscreen_config_separate_memory_flag) {
                        the_resize_sc_panel_left = sc_panel_drag_left_fullscreen;
                        the_resize_sc_panel_top = sc_panel_drag_top_fullscreen;
                    }

                    let sc_circles = $(document).find('.sc_long_circle');
                    let sc_rectangles = $(document).find('.sc_long_rectangle');

                    sc_circles.each(function() {
                        if (the_resize_sc_panel_left >= 0) {
                            $(this).css('left', the_resize_sc_panel_left + 'px');
                        }

                        if (the_resize_sc_panel_top >= 0) {
                            $(this).css('top', the_resize_sc_panel_top + 'px');
                        }
                    });

                    sc_rectangles.each(function() {
                        if (the_resize_sc_panel_left >= 0) {
                            $(this).css('left', the_resize_sc_panel_left + 'px');
                        }

                        if (the_resize_sc_panel_top >= 0) {
                            $(this).css('top', the_resize_sc_panel_top + 'px');
                        }
                    });

                }

            }, 300);

        });
    }

    sc_process_start();

    if (!sc_room_blacklist_flag) {
        const originalParse = JSON.parse;
        JSON.parse = function (str) {
            try {
                const parsedArr = originalParse(str);
                if (parsedArr && parsedArr.cmd !== undefined) {
                    if (parsedArr.cmd === 'ONLINE_RANK_COUNT') {
                        let n_count = parsedArr.data.count ?? 0;
                        let n_online_count = parsedArr.data.online_count ?? 0;
                        update_rank_count(n_count, n_online_count);
                    } else if (parsedArr.cmd === 'SUPER_CHAT_MESSAGE') {
                        let store_flag = store_sc_item(parsedArr.data);
                        if (store_flag) {
                            update_sc_item(parsedArr.data);
                        }

                        if (sc_live_special_sc_flag && sc_live_special_tip_uid_arr.length) {
                            handle_special_sc(parsedArr.data, false, true);
                        }

                        if (sc_live_sc_to_danmu_show_flag) {
                            handle_special_sc(parsedArr.data, true, true);
                        }
                    } else if (parsedArr.cmd === 'USER_TOAST_MSG') {
                        let sc_data_guard_count = parsedArr.data.target_guard_count ?? 0;
                        if (sc_data_guard_count) {
                            update_guard_count(sc_data_guard_count);
                        }
                    } else if (parsedArr.cmd === 'INTERACT_WORD') {
                        if (parsedArr.data.msg_type === 1) {
                            if (sc_live_special_tip_uid_arr.length) {
                                handle_special_tip(parsedArr.data);
                            }
                        }
                    } else if (parsedArr.cmd === 'DANMU_MSG') {
                        if (parsedArr.info) {
                            if (sc_live_special_msg_flag && sc_live_special_tip_uid_arr.length) {
                                handle_special_msg(parsedArr.info);
                            }

                            if (sc_live_send_dm_combo_flag && parsedArr.info[0][15]['extra'].includes('"hit_combo\":1') && !sc_combo_dm_recent_send_arr.includes(parsedArr.info[1])) {
                                handle_auto_dm_combo(parsedArr.info);
                            }
                        }
                    } else if (parsedArr.cmd === 'ANCHOR_LOT_START') {
                        if (sc_live_auto_tianxuan_flag) {
                            sc_get_follow_up_flag().then(the_sc_follow_up_flag => {
                                handle_auto_tianxuan(the_sc_follow_up_flag);
                            });
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
            let _rank_list_ctnr_box_li = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (_rank_list_ctnr_box_li.length === 0) {
                _rank_list_ctnr_box_li = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
            }

            if (_rank_list_ctnr_box_li.length) {
                let _guard_n = _rank_list_ctnr_box_li.last().text().match(/\d+/) ?? 0;
                _guard_n = parseInt(_guard_n, 10);
                if (sc_guard_num > _guard_n) {
                    _guard_n = sc_guard_num;
                }

                $(document).find('.sc_captain_num_right').text(_guard_n);
                sc_update_date_guard_once = true;

                if (data_show_bottom_flag) {
                    $(document).find('#sc_data_show_bottom_guard_num').text('舰长：' + _guard_n);
                }
            }

            let rank_list_ctnr_box_interval = setInterval(() => {
                let rank_list_ctnr_box_item = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
                if (rank_list_ctnr_box_item.length === 0) {
                    rank_list_ctnr_box_item = $(document).find('#rank-list-ctnr-box > div.tabs > div.tab-list > div.tab-item');
                }

                if (rank_list_ctnr_box_item.length) {
                    const guard_text_target = rank_list_ctnr_box_item.last();

                    const guard_test_observer = new MutationObserver((mutationsList) => {
                        for (const mutation of mutationsList) {
                            if (mutation.type === 'characterData' || mutation.type === 'childList' || mutation.type === 'subtree') {
                                const guard_newNum = mutation.target.textContent.match(/\d+/) ?? 0;
                                if (sc_guard_num !== parseInt(guard_newNum, 10)) {
                                    // SC记录板的
                                    $(document).find('.sc_captain_num_right').text(guard_newNum);

                                    // 页面的
                                    if (data_show_bottom_flag) {
                                        $(document).find('#sc_data_show_bottom_guard_num').text('舰长：' + guard_newNum);
                                    }
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
            update_timestamp_diff(); // 每30秒更新时间差，并且检查SC是否过期
            check_all_memory_status(); // 每30秒检查全记状态
            sycn_live_special_tip_config(); // 每30秒同步最新的特定用户提示设置
            sycn_live_sc_to_danmu_show_config(); // 每30秒同步最新的SC以弹幕展现的设置
        }, 30000);

    }

})();
