// ==UserScript==
// @name         B站直播间SC记录板
// @namespace    http://tampermonkey.net/
// @homepage     https://greasyfork.org/zh-CN/scripts/484381
// @version      5.2.0
// @description  实时同步SC、同接、高能和舰长数据，可拖拽移动，可导出，可单个SC折叠，可生成图片（右键菜单），活动页可用，黑名单功能，不用登录，多种主题切换，直播全屏也在顶层显示，自动清除超过12小时的房间SC存储
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

    // 抓取SC ：https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=
    // 进入直播间的时候开始记录SC
    // 开始固定在屏幕左上方一侧，为圆形小图标，可以点击展开，可以拖拽移动，直播全屏也在顶层显示
    // 通过Hook实时抓取数据
    // 每个直播间隔离保留，用localstorage，并且自动清理时间长的数据
    // SC标明发送时间和距离当前的时间差
    // SC可折叠，可生成图片（折叠和展开都可以）
    // 黑名单功能

    let room_id = unsafeWindow.location.pathname.split('/').pop();
    let sc_url_api = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=';

    sc_catch_log('url_room_id:', room_id);

    if (!room_id) { sc_catch_log('获取room_id失败，插件已停止正确的SC存储'); }

    let sc_url = sc_url_api + room_id; // 请求sc的url

    let sc_panel_high = 400; // 显示面板的最大高度（单位是px，后面会拼接）
    let sc_rectangle_width = 302;

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
    let sc_switch = 0;

    let high_energy_num = 0;

    let sc_room_blacklist_flag = false;

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
        $(document).on('click', '.sc_button_switch', sc_switch_css);

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

        // Append buttons to the container
        sc_buttonsContainer.appendChild(sc_switchButton);
        sc_buttonsContainer.appendChild(sc_exportButton);
        sc_buttonsContainer.appendChild(sc_minimizeButton);

        // Append the container to the rectangle
        sc_rectangleContainer.appendChild(sc_buttonsContainer);

        sc_dataShowContainer.appendChild(sc_label_high_energy_num_left);
        sc_dataShowContainer.appendChild(sc_label_high_energy_num_right);
        sc_dataShowContainer.appendChild(sc_label_captain_num_right);
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
                width: 60px;
                padding: 5px;
                margin-top: 15px;
                margin-bottom: 15px;
                margin-right: 10px;
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
        `;
        document.head.appendChild(sc_other_style);

        let live_player_div = document.getElementById('live-player');
        if (!live_player_div) { return; }

        // 黑名单相关
        if (!check_blacklist_menu(room_id)) { sc_room_blacklist_flag = true; return; }

        document.body.appendChild(sc_circleContainer);
        document.body.appendChild(sc_rectangleContainer);

        let sc_isDragging = false;
        let sc_isClickAllowed = true;
        let sc_drag_start = 0; // 兼容有的时候点击触发拖拽的情况
        let sc_offsetX = 0;
        let sc_offsetY = 0;
        let sc_isListEmpty = true;
        let sc_isFullscreen = false;

        // Set initial position
        sc_circleContainer.style.top = `${unsafeWindow.innerHeight / 4}px`;

        $(document).on('mousedown', '.sc_drag_div', sc_startDragging);
        $(document).on('mousemove', sc_drag);
        $(document).on('mouseup', '.sc_drag_div', sc_stopDragging);

        // 让全屏直播的情况下也显示
        live_player_div.addEventListener('fullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('webkitfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('mozfullscreenchange', sc_handleFullscreenChange);
        live_player_div.addEventListener('MSFullscreenChange', sc_handleFullscreenChange);

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

                if (unsafeWindow.innerWidth - xPos < sc_circles_width + 10) {
                    xPos = unsafeWindow.innerWidth - sc_circles_width - 10;
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
                if (unsafeWindow.innerWidth - xPos < sc_rectangles_width + 15) {
                    xPos = unsafeWindow.innerWidth - sc_rectangles_width - 15;
                    sc_rectangles.css('left', xPos + 'px');
                }

                if (unsafeWindow.innerHeight - yPos < sc_rectangles_height) {
                    yPos = unsafeWindow.innerHeight - sc_rectangles_height - 10;
                    sc_rectangles.css('top', yPos + 'px');
                }
            }
        }

        function sc_startDragging(e) {
            e = e || unsafeWindow.event;
            sc_isDragging = true;
            sc_isClickAllowed = true;
            const rect = e.target.getBoundingClientRect();
            sc_offsetX = e.clientX - rect.left;
            sc_offsetY = e.clientY - rect.top;
            sc_drag_start = (new Date()).getTime();
        }

        function sc_drag(e) {
            e = e || unsafeWindow.event;
            if (sc_isDragging && ((new Date()).getTime() - sc_drag_start) > 30) {
                let sc_elements = $(document).find('.sc_drag_div');
                sc_elements.each(function() {
                    const rect = this.getBoundingClientRect();

                    const maxX = unsafeWindow.innerWidth - rect.width;
                    const maxY = unsafeWindow.innerHeight - rect.height;

                    let x = Math.min(maxX, Math.max(0, e.clientX - sc_offsetX)) + 0.5; // 这个0.5交给浏览器吧，至少chrome上是完美的
                    let y = Math.min(maxY, Math.max(0, e.clientY - sc_offsetY));

                    $(this).css('left', x + 'px');
                    $(this).css('top' , y + 'px');
                });

                sc_isClickAllowed = false;
            }
        }

        function sc_stopDragging() {
            sc_isDragging = false;
        }

        $(document).on('click', '.sc_long_circle', () => {
            if (sc_isClickAllowed) {
                let xPos = 0;
                let yPos = 0;
                let sc_circles = $(document).find('.sc_long_circle');
                sc_circles.each(function() {
                    let rect = this.getBoundingClientRect();
                    xPos = rect.left;
                    yPos = rect.top;
                    $(this).hide();
                });

                if (unsafeWindow.innerWidth - xPos < sc_rectangle_width) {
                    xPos = unsafeWindow.innerWidth - sc_rectangle_width - 15;
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

            } else {
                sc_isClickAllowed = true;
            }
        });


        $(document).on('mouseenter', '.sc_long_circle', () => {
            $(document).find('.sc_long_circle').css('border', '3px solid rgba(255,255,255,0.5)');
        });

        $(document).on('mouseleave', '.sc_long_circle', () => {
            $(document).find('.sc_long_circle').css('border', '2px solid #ffffff');
        });

        let sc_rectangle_is_slide_down = false;
        let sc_rectangle_is_slide_up = false;
        // 优化回弹问题
        $(document).on('mouseenter', '.sc_long_rectangle', () => {
            if (sc_rectangle_is_slide_down) {
                return;
            }
            sc_rectangle_is_slide_down = true;

            $(document).find('.sc_long_buttons').slideDown(500, () => {
                sc_rectangle_is_slide_down = false;
            });
            $(document).find('.sc_data_show').slideDown(500, () => {
                sc_rectangle_is_slide_down = false;
            });
            $(document).find('.sc_data_show label').animate({opacity: 1}, 1000);

        });

        $(document).on('mouseleave', '.sc_long_rectangle', (e) => {
            if (sc_rectangle_is_slide_up) {
                return;
            }

            e = e || unsafeWindow.event;
            let sc_mouseleave_next_class_name = (e.relatedTarget && e.relatedTarget.className) || '';
            if (sc_mouseleave_next_class_name === 'sc_ctx_menu') {
                return;
            }

            sc_rectangle_is_slide_up = true;

            $(document).find('.sc_long_buttons').slideUp(500, () => {
                sc_rectangle_is_slide_up = false;
            });
            $(document).find('.sc_data_show label').animate({opacity: 0}, 200);
            $(document).find('.sc_data_show').slideUp(500, () => {
                sc_rectangle_is_slide_up = false;
            });

        });

        $(document).on('click', '.sc_long_item', sc_toggle_msg_body);

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
            } else {
                $('.' + this_sc_item_dynamic_className).css('border-radius', '8px 8px 6px 6px');
                this_sc_msg_body.prev().css('border-radius', '6px 6px 0px 0px');
                this_sc_msg_body.slideDown(200);
                $('.' + this_sc_item_dynamic_className).find('.sc_value_font').css('color', '');
            }
        }

        // 折叠显示板
        function sc_minimize() {
            $(document).find('.sc_long_circle').show();
            $(document).find('.sc_long_rectangle').hide();
            $(document).find('.sc_long_buttons').hide(); // 优化回弹问题
        }

        // 切换主题
        function sc_switch_css() {
            sc_switch++;
            let sc_rectangle = $(document).find('.sc_long_rectangle');
            let sc_item = $(document).find('.sc_long_item');
            let sc_data_show = $(document).find('.sc_data_show');
            let sc_button_item = $(document).find('.sc_button_item');

            if (sc_switch === 0) {
                // 白色
                sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
                sc_rectangle.css('box-shadow', '2px 2px 5px black');
                sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
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

        let sc_context_menu = document.createElement('div');
        sc_context_menu.id = 'sc_context_menu_body';
        sc_context_menu.className = 'sc_ctx_menu';
        sc_context_menu.style.position = 'absolute';
        sc_context_menu.style.display = 'none';
        sc_context_menu.style.backgroundColor = '#ffffff';
        sc_context_menu.style.border = 0;
        sc_context_menu.style.padding = '5px';
        sc_context_menu.style.zIndex = 3333;

        sc_context_menu.appendChild(sc_copy_button1);
        sc_context_menu.appendChild(sc_copy_br1);
        sc_context_menu.appendChild(sc_copy_button2);
        sc_context_menu.appendChild(sc_copy_br2);
        sc_context_menu.appendChild(sc_copy_button3);

        // 将右键菜单添加到body中
        document.body.appendChild(sc_context_menu);

        let sc_context_menu_fullscrenn = sc_context_menu.cloneNode(true);
        sc_context_menu_fullscrenn.id = 'sc_context_menu_fullscreen';
        $(live_player_div).append(sc_context_menu_fullscrenn);

        $(document).on('mouseover', '.sc_copy_btn', function() {
            $(this).css('transform', 'translateX(-2px)');
            setTimeout(function() {
                $(document).find('.sc_copy_btn').css('transform', 'translateY(0)');
            }, 200);

        })

        $(document).on('click', '.sc_copy_btn', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            $(document).find('.sc_long_rectangle').css('cursor', 'progress');

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
                let current_sc_div = $(sc_context_menu).data('current_sc_div');

                let tmp_sc_item = $(current_sc_div).clone(); // 为了去掉animation的影响
                tmp_sc_item.width(current_sc_div.clientWidth);
                tmp_sc_item.height(current_sc_div.clientHeight);
                tmp_sc_item.css('animation', '');
                tmp_sc_item.find('.sc_font_color').css('color', '#000000');

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
                            open_and_close_sc_modal('✗', 'red');
                            console.error('复制SC图片失败', err);
                        });
                    });
                }).catch(error => {
                    console.error('处理html2canvas方法错误', error);
                });

                document.body.removeChild(tmp_sc_item[0]);
            });
        });

        let sc_context_menu_timeout_id;

        $(document).on('mouseleave', '.sc_ctx_menu', function() {
            sc_context_menu_timeout_id = setTimeout(() => {
                $(this).hide();
            }, 1000);
        });

        $(document).on('mouseover', '.sc_ctx_menu', function() {
            clearTimeout(sc_context_menu_timeout_id);
        });

        $(document).on('contextmenu', '.sc_long_item', function(e) {
            e = e || unsafeWindow.event;
            e.preventDefault();

            // 存储当前右键的div
            $(document).find('.sc_ctx_menu').data('current_sc_div', this);
            let the_sc_ctx_menu_id = 'sc_context_menu_body';
            if (sc_isFullscreen) {
                the_sc_ctx_menu_id = 'sc_context_menu_fullscreen';
            }
            $(document).find('#' + the_sc_ctx_menu_id).css('left', e.pageX + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).css('top', e.pageY + 'px');
            $(document).find('#' + the_sc_ctx_menu_id).show();

            clearTimeout(sc_context_menu_timeout_id);
        });

        function open_and_close_sc_modal(show_str, show_color, e) {
            $(document).find('.sc_long_rectangle').css('cursor', 'grab');
            let sc_copy_modal = document.createElement('div');
            sc_copy_modal.className = 'sc_cp_mod';
            sc_copy_modal.style.position = 'fixed';
            sc_copy_modal.style.display = 'none';
            sc_copy_modal.style.color = show_color;
            sc_copy_modal.style.width = '30px';
            sc_copy_modal.style.height = '30px';
            sc_copy_modal.style.lineHeight = '30px';
            sc_copy_modal.style.textAlign = 'center';
            sc_copy_modal.style.backgroundColor = '#ffffff';
            sc_copy_modal.style.border = 0;
            sc_copy_modal.style.borderRadius = '50%';
            sc_copy_modal.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.3)';
            sc_copy_modal.innerHTML = show_str;
            sc_copy_modal.style.left = e.pageX + 10 + 'px';
            sc_copy_modal.style.top = e.pageY - 10 + 'px';
            sc_copy_modal.style.zIndex = 3333;

            if (sc_isFullscreen) {
                $(live_player_div).append(sc_copy_modal);
            } else {
                document.body.appendChild(sc_copy_modal);
            }

            // 显示模态框
            sc_copy_modal.style.display = 'block';

            // 在一定时间后关闭并删除模态框
            setTimeout(() => {
                close_and_remove_sc_modal();
            }, 1000);
        }

        function close_and_remove_sc_modal() {
            // 关闭模态框
            $(document).find('.sc_cp_mod').hide();

            // 从 body 中移除模态框
            $(document).find('.sc_cp_mod').remove();
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

        check_and_clear_all_sc_store();
        sc_fetch_and_show();

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

    function sc_catch_log(...msg) {
        console.log('%c[sc_catch]', 'font-weight: bold; color: white; background-color: #A7C9D3; padding: 2px; border-radius: 2px;', ...msg);
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

        let metal_and_start_time_html = '<div class="sc_start_time" style="height: 20px; padding-left: 5px;"><span style="color: rgba(0,0,0,0.3); font-size: 10px;">'+ sc_start_time +'</span></div>';
        if (sc_medal_flag) {
            metal_and_start_time_html = '<div style="display: inline-flex;"><div class="fans_medal_item" style="background-color: '+ sc_medal_color +';border: 1px solid '+ sc_medal_color +';"><div class="fans_medal_label"><span class="fans_medal_content">'+ sc_medal_name +'</span></div><div class="fans_medal_level">'+ sc_medal_level +'</div></div>' +
                '<div class="sc_start_time" style="height: 20px; padding-left: 5px;"><span style="color: rgba(0,0,0,0.3); font-size: 10px;">' + sc_start_time + '</span></div></div>'
        }

        let sc_item_html = '<div class="sc_long_item sc_' + sc_uid + '_' + sc_start_timestamp + '" style="background-color: '+ sc_background_bottom_color +';margin-bottom: 10px;animation: sc_fadenum 1s linear forwards;border-radius: 8px 8px 6px 6px;'+ box_shadow_css +'">'+
            '<div class="sc_msg_head" style="' + sc_background_image_html + 'height: 40px;background-color: '+ sc_background_color +';padding:5px;background-size: cover;background-position: left center; border-radius: 6px 6px 0px 0px;">'+
            '<div style="float: left; box-sizing: border-box; height: 40px; position: relative;"><a href="//space.bilibili.com/'+ sc_uid +'" target="_blank">'+
            sc_user_info_face_img+ sc_user_info_face_frame_img +'</a></div>'+
            '<div class="sc_msg_head_left" style="float: left; box-sizing: border-box; height: 40px; margin-left: 40px;">'+
            metal_and_start_time_html+
            '<div class="sc_uname_div" style="height: 20px; padding-left: 5px; white-space: nowrap; width: ' + ((sc_rectangle_width / 2) + 5) + 'px; overflow: hidden; text-overflow: ellipsis;"><span class="sc_font_color" style="color: ' + sc_font_color + ';font-size: 15px;text-decoration: none;" data-color="'+ sc_font_color_data +'">' + sc_user_info_uname + '</span></div>'+
            '</div>'+
            '<div class="sc_msg_head_right" style="float: right; box-sizing: border-box; height: 40px;">'+
            '<div class="sc_value_font" style="height: 20px;"><span style="font-size: 15px; float: right;">￥'+ sc_price +'</span></div>'+
            '<div style="height: 20px; color: #666666" data-html2canvas-ignore><span class="sc_diff_time" style="font-size: 15px; float: right;">'+ sc_diff_time +'</span><span class="sc_start_timestamp" style="display:none;">'+ sc_start_timestamp +'</span></div>'+
            '</div>'+
            '</div>'+
            '<div class="sc_msg_body" style="padding-left: 14px; padding-right: 10px; padding-top: 10px; padding-bottom: 10px; overflow-wrap: break-word; line-height: 2;"><span style="color: white; font-size: 14px;">'+ sc_message +'</span></div>'+
            '</div>';

        $(document).find('.sc_long_list').prepend(sc_item_html);

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
        $(document).find('.sc_high_energy_num_right').text(n_count);
        $(document).find('.sc_data_show_label').attr('title', '同接/高能('+ n_count + '/' + n_online_count +') = ' + (n_count / n_online_count * 100).toFixed(2) + '%');

        // 页面的
        if (data_show_top_flag) {
            const rank_data_show_div = $(document).find('#rank-list-ctnr-box > div.tabs > ul > li.item');
            if (rank_data_show_div.length) {
                rank_data_show_div.first().text('高能用户(' + n_count + '/' + n_online_count + ')');
                rank_data_show_div.first().attr('title', '同接/高能 = ' + (n_count / n_online_count * 100).toFixed(2) + '%');
            }
        }

        if (data_show_bottom_flag) {
            const sc_data_show_bottom_rank_num_div = $(document).find('#sc_data_show_bottom_rank_num');
            if (sc_data_show_bottom_rank_num_div.length) {
                sc_data_show_bottom_rank_num_div.text('同接：'+ n_count);
                sc_data_show_bottom_rank_num_div.attr('title', '同接/高能('+ n_count + '/' + n_online_count +') = ' + (n_count / n_online_count * 100).toFixed(2) + '%');
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

                    $(document).find('#control-panel-ctnr-box').append('<div style="position: relative;color: '+ sc_data_show_bottom_div_color +';" id="sc_data_show_bottom_div"><div id="sc_data_show_bottom_rank_num" title="'+ (n_count / n_online_count * 100).toFixed(2) +'%" style="width: 100%;margin-bottom: 5px;">同接：'+ n_count +'</div><div id="sc_data_show_bottom_guard_num" style="width: 100%;">舰长：'+ guard_text.match(/\d+/) +'</div></div>');
                }
            }

        }
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
                const _guard_n = _rank_list_ctnr_box_li.last().text().match(/\d+/);

                $(document).find('.sc_captain_num_right').text(_guard_n);
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
                                const guard_newNum = mutation.target.textContent.match(/\d+/);
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
        }, 30000);

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
})();
