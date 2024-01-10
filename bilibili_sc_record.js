// ==UserScript==
// @name         B站直播间SC记录板
// @namespace    http://tampermonkey.net/
// @homepage     https://greasyfork.org/zh-CN/scripts/484381
// @version      1.0.2
// @description  在进入B站直播间的那一刻开始记录SC，可拖拽移动，可导出，不用登录，多种主题切换，多种抓取速度切换（有停止状态），在屏幕顶层，自动清除超过12小时的房间SC存储，下播10分钟自动停止抓取
// @author       ltxlong
// @match        *://live.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.7.1/jquery.min.js
// @grant        unsafeWindow
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';
    // 抓取SC ：https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=
    // 进入直播间的时候开始记录SC
    // 开始固定在屏幕左上方一侧，为圆点，可以展开，可以拖拽移动，在屏幕顶层
    // 进入直播间时候判断，如果保留的SC大于12小时就清除
    // 每个直播间隔离保留，用localstorage
    // 每10秒（高速）/30秒（中速）/55秒（低速/一般）（默认）抓取一次，还有停止状态
    // SC标明日期和距离前期时间差
    // 下播后10分钟自动停止抓取（非实时直播10分钟即停止，即可以提前10钟进入直播间）

    if (window.top !== window.self) { return; }

    let sc_catch_interval = 30; // 中速模式，每30秒抓取一次（固定）
    let sc_catch_interval_fast = 10; // 高速模式，每10秒抓取一次（比如：如果主播念的快时，可以切换到高速模式。最低可以设置为5）（不建议改的太小，毕竟请求太频繁会被ban）
    let sc_catch_interval_low = 55; // 默认低速(一般)模式，每55秒抓取一次（最低300电池的存活的时间是60秒，错开点时间）（固定）
    let room_id = parseInt(window.location.pathname.substring(1)); // 获取直播间id

    if (isNaN(room_id)) { return; }

    let sc_url = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=' + room_id; // 请求sc的url

    let sc_panel_high = '400'; // 显示面板的高度（单位是px，后面会拼接）

    let sc_catch = [];
    let sc_localstorage_key = 'live_' + room_id + '_sc';
    let sc_sid_localstorage_key = 'live_' + room_id + '_sc_sid';
    let sc_live_room_title = '';

    let sc_keep_time_key = 'live_' + room_id + '_sc_keep_time';
    let sc_clear_time_hour = 12; // 大于sc_clear_time_hour(默认12)小时即清除上一次的存储（会自动遍历检测所有存储的房间）
    let sc_now_time = (new Date()).getTime();
    let sc_keep_time = unsafeWindow.localStorage.getItem(sc_keep_time_key);
    let sc_keep_time_flag = 0;

    if (sc_keep_time !== null && sc_keep_time !== 'null' && sc_keep_time !== 0 && sc_keep_time !== '') {
        sc_keep_time_flag = 1;
    }

    let catch_live_status = 1;
    let catch_time_out = 10;
    let first_live_down_time = 0;

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
        sc_circleContainer.classList.add('sc_circle', 'sc_drag_div');
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
        sc_rectangleContainer.classList.add('sc_rectangle', 'sc_drag_div');
        sc_rectangleContainer.style.width = '300px';
        sc_rectangleContainer.style.height = sc_panel_high + 'px';
        sc_rectangleContainer.style.backgroundColor = 'rgba(255,255,255,1)';
        sc_rectangleContainer.style.position = 'fixed';
        sc_rectangleContainer.style.display = 'none';
        sc_rectangleContainer.style.overflowY = 'scroll';
        sc_rectangleContainer.style.overflowX = 'hidden';
        sc_rectangleContainer.style.borderBottom = '10px solid transparent';
        sc_rectangleContainer.style.cursor = 'grab';
        sc_rectangleContainer.style.userSelect = 'none';
        sc_rectangleContainer.style.zIndex = '2233';
        sc_rectangleContainer.style.scrollbarGutter = 'stable'; // 滚动条不占位置

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

        // Add a button to the page to trigger model function
        const sc_modelButton = document.createElement('button');
        sc_modelButton.textContent = '一般';
        sc_modelButton.title = '抓取状态：一般（一分钟抓取一次）';
        sc_modelButton.classList.add('sc_button_model', 'sc_button_item');
        sc_modelButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_model', sc_model_change);

        // Add a button to the page to trigger switch function
        const sc_switchButton = document.createElement('button');
        sc_switchButton.textContent = '切换';
        sc_switchButton.title = '主题切换';
        sc_switchButton.classList.add('sc_button_switch', 'sc_button_item');
        sc_switchButton.style.cursor = 'pointer';
        $(document).on('click', '.sc_button_switch', sc_switch_css);

        // Create a container for the buttons
        const sc_buttonsContainer = document.createElement('div');
        sc_buttonsContainer.className = 'sc_buttons';
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
        sc_dataShowContainer.style.top = '65px';
        sc_dataShowContainer.style.zIndex = '3';
        sc_dataShowContainer.style.height = '20px';
        sc_dataShowContainer.style.fontSize = '15px';
        sc_dataShowContainer.style.paddingLeft = '10px';
        sc_dataShowContainer.style.paddingRight = '10px';
        sc_dataShowContainer.style.paddingTop = '10px';
        sc_dataShowContainer.style.marginBottom = '20px';

        // Create labels for the dataShow
        const sc_label_high_energy_num_left = document.createElement('label');
        sc_label_high_energy_num_left.textContent = '高能：';
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
        sc_buttonsContainer.appendChild(sc_modelButton);
        sc_buttonsContainer.appendChild(sc_minimizeButton);

        // Append the container to the rectangle
        sc_rectangleContainer.appendChild(sc_buttonsContainer);

        sc_dataShowContainer.appendChild(sc_label_high_energy_num_left);
        sc_dataShowContainer.appendChild(sc_label_high_energy_num_right);
        sc_dataShowContainer.appendChild(sc_label_captain_num_right);
        sc_dataShowContainer.appendChild(sc_label_captain_num_left);
        sc_rectangleContainer.appendChild(sc_dataShowContainer);

        // Create a container for sc list
        const sc_listContainer = document.createElement('div');
        sc_listContainer.className = 'sc_list';
        sc_listContainer.style.paddingLeft = '10px';
        sc_listContainer.style.paddingTop = '10px';
        sc_listContainer.style.paddingBottom = '10px';
        sc_listContainer.style.paddingRight = '12px';
        sc_listContainer.style.marginRight = '-6px'; // 可能scrollbarGutter不是所有浏览器都支持，加多这个和设置'scroll'兼容下

        // Append the container to the rectangle
        sc_rectangleContainer.appendChild(sc_listContainer);

        // scrollbar css
        let sc_scrollbar_style = document.createElement('style');
        sc_scrollbar_style.id = 'sc_scrollbar_style';
        sc_scrollbar_style.textContent = `
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.7);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
        `;
        document.head.appendChild(sc_scrollbar_style);

        let sc_other_style = document.createElement('style');
        sc_other_style.textContent = `
            @keyframes sc_fadenum {
                0%{opacity: 0;}
                100%{opacity: 1;}
            }
            .sc_button_item {
                text-decoration: none;
                width: 60px;
                padding: 5px;
                margin-top: 15px;
                margin-bottom: 5px;
                margin-left: 5px;
                margin-right: 5px;
                background: linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3);
                background-size: 350%;
                color: #ffffff;
                border: none;
            }
            .sc_button_item:hover {
                animation: sc_sun 7s infinite;
            }
            @keyframes sc_sun {
                100%{ background-position: -350% 0; }
            }
        `;
        document.head.appendChild(sc_other_style);


        let live_player_div = document.getElementById('live-player');
        let live_room_div = document.getElementsByClassName('live-room-app')[0];
        live_room_div.appendChild(sc_circleContainer);
        live_room_div.appendChild(sc_rectangleContainer);

        let sc_isDragging = false;
        let sc_isClickAllowed = true;
        let sc_offsetX = 0;
        let sc_offsetY = 0;
        let sc_isFullScreen = false;
        let sc_isListEmpty = true;
        let sc_switch = 0;

        // Set initial position
        sc_circleContainer.style.top = `${innerHeight / 4}px`;

        $(document).on('mousedown', '.sc_drag_div', sc_startDragging);
        $(document).on('mousemove', sc_drag);
        $(document).on('mouseup', sc_stopDragging);

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
                sc_isFullScreen = true;
            } else {
                $(live_player_div).find('.sc_drag_div').remove();
                sc_isFullScreen = false;
            }
        }

        function sc_startDragging(e) {
            sc_isDragging = true;
            sc_isClickAllowed = true;
            const rect = e.target.getBoundingClientRect();
            sc_offsetX = e.clientX - rect.left;
            sc_offsetY = e.clientY - rect.top;
        }

        function sc_drag(e) {
            if (sc_isDragging) {
                let sc_elements = $(document).find('.sc_drag_div');
                sc_elements.each(function(){
                    const rect = this.getBoundingClientRect();

                    const maxX = innerWidth - rect.width;
                    const maxY = innerHeight - rect.height;

                    let x = Math.min(maxX, Math.max(0, e.clientX - sc_offsetX));
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

        $(document).on('click', '.sc_circle', (e) => {
            if (sc_isClickAllowed) {
                let xPos = 0;
                let yPos = 0;
                let sc_circles = $(document).find('.sc_circle');
                sc_circles.each(function() {
                    let rect = this.getBoundingClientRect();
                    xPos = rect.left;
                    yPos = rect.top;
                    $(this).hide();
                });

                if (innerWidth - xPos < 300) {
                    xPos = innerWidth - 305;
                }

                if (innerHeight - yPos < sc_panel_high) {
                    yPos = innerHeight - sc_panel_high - 5;
                }

                let sc_rectangles = $(document).find('.sc_rectangle');
                sc_rectangles.each(function() {
                    $(this).css('left', xPos + 'px');
                    $(this).css('top', yPos + 'px');

                    $(this).slideDown(500, function () {
                        $(document).find('.sc_buttons').slideDown(500);
                    });
                });

            }
        });


        $(document).on('mouseenter', '.sc_circle', (e) => {
            $(document).find('.sc_circle').css('border', '3px solid rgba(255,255,255,0.5)');
        });

        $(document).on('mouseleave', '.sc_circle', (e) => {
            $(document).find('.sc_circle').css('border', '2px solid #ffffff');
        });

        let sc_rectangle_is_slide_down = false;
        let sc_rectangle_is_slide_up = false;
        // 优化回弹问题
        $(document).on('mouseenter', '.sc_rectangle', (e) => {
            if (sc_rectangle_is_slide_down) {
                return;
            }
            sc_rectangle_is_slide_down = true;

            $(document).find('.sc_buttons').slideDown(500, function() {
                sc_rectangle_is_slide_down = false;
            });
            $(document).find('.sc_data_show').slideDown(500, function() {
                sc_rectangle_is_slide_down = false;
            });
            $(document).find('.sc_data_show label').animate({opacity: 1}, 1000);

        });

        $(document).on('mouseleave', '.sc_rectangle', (e) => {
            if (sc_rectangle_is_slide_up) {
                return;
            }
            sc_rectangle_is_slide_up = true;

            $(document).find('.sc_buttons').slideUp(500, function() {
                sc_rectangle_is_slide_up = false;
            });
            $(document).find('.sc_data_show label').animate({opacity: 0}, 200);
            $(document).find('.sc_data_show').slideUp(500, function() {
                sc_rectangle_is_slide_up = false;
            });

        });

        // 折叠
        function sc_minimize() {
            $(document).find('.sc_circle').show();
            $(document).find('.sc_rectangle').hide();
            $(document).find('.sc_buttons').hide(); // 优化回弹问题
        }

        // 切换主题
        function sc_switch_css() {
            sc_switch++;
            let sc_rectangle = $(document).find('.sc_rectangle');
            let sc_item = $(document).find('.sc_item');
            let sc_list = $(document).find('.sc_list');
            let sc_data_show = $(document).find('.sc_data_show');
            let sc_button_item = $(document).find('.sc_button_item');

            if (sc_switch === 0) {
                // 白色
                sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
                sc_rectangle.css('box-shadow', '2px 2px 5px black');
                sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
                sc_list.css('padding-right', '12px');
                sc_data_show.css('color', '');
                sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
                sc_button_item.css('background-size', '350%');
                sc_button_item.css('border', 0);
                $(document).find('#sc_scrollbar_style').text(`
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.7);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
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
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0);
            }
            `);
            } else if(sc_switch === 2) {
                // 半透明（白0.1）
                sc_rectangle.css('background-color', 'rgba(255,255,255,0.1)');
                sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
                sc_list.css('padding-right', '12px');
                sc_data_show.css('color', '#ffffff');
                sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
                sc_button_item.css('background-size', '350%');
                sc_button_item.css('border', 0);
                $(document).find('#sc_scrollbar_style').text(`
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.7);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
                background: rgba(204,204,204,0);
            }
            `);
            } else if(sc_switch === 3) {
                // 半透明（白0.5）
                sc_rectangle.css('background-color', 'rgba(255,255,255,0.5)');
                sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
                sc_list.css('padding-right', '12px');
                sc_data_show.css('color', '');
                sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
                sc_button_item.css('background-size', '350%');
                sc_button_item.css('border', 0);
                $(document).find('#sc_scrollbar_style').text(`
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.7);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
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
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
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
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0);
            }
            `);
            } else {
                // 白色
                sc_switch = 0;
                sc_rectangle.css('background-color', 'rgba(255,255,255,1)');
                sc_item.css('box-shadow', 'rgba(0, 0, 0, 0.5) 2px 2px 2px');
                sc_list.css('padding-right', '12px');
                sc_data_show.css('color', '');
                sc_button_item.css('background', 'linear-gradient(90deg, #A7C9D3, #eeeeee, #5c95d7, #A7C9D3)');
                sc_button_item.css('background-size', '350%');
                sc_button_item.css('border', 0);
                $(document).find('#sc_scrollbar_style').text(`
            .sc_rectangle::-webkit-scrollbar {
                width: 6px;
            }
            .sc_rectangle:hover::-webkit-scrollbar-thumb {
                    background: rgba(204,204,204,0.7);
                    border-radius: 6px;
            }
            .sc_rectangle::-webkit-scrollbar-thumb {
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

                    let sc_export_price = '[ CN￥' + sc_localstorage_export[j]["price"] + ' ]';
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

        // 切换抓取速度
        function sc_model_change() {
            let sc_button_model = $(document).find('.sc_button_model');
            // 删除定时器
            clearInterval(sc_catch_inverval_id);
            updateTimestampDiff();
            sc_fetch_and_show();
            first_live_down_time = 0;
            if(sc_button_model.html() === '一般') {
                sc_button_model.html('中速');
                sc_button_model.attr('title', '抓取状态：中速（30秒抓取一次）');
                console.log('b站直播间SC抓取：已切换到中速，30秒抓取一次');
                sc_catch_interval = parseInt(sc_catch_interval);
                if (sc_catch_interval != 30) { sc_catch_interval = 30; }
                sc_catch_inverval_id = setInterval(() => {
                    updateTimestampDiff();
                    sc_fetch_and_show();
                    // 下播后，一段时间自动停止抓取（10分钟）（解决三种情况：提前、状况、下播）
                    if (catch_live_status !== 1) {
                        let now_catch_time = (new Date()).getTime();
                        if (first_live_down_time) {
                            if ( (now_catch_time - first_live_down_time) > 1000 * 60 * catch_time_out) {
                                // 删除定时器
                                clearInterval(sc_catch_inverval_id);
                                sc_button_model.html('停止');
                                sc_button_model.attr('title', '抓取状态：已停止抓取');
                                console.log('b站直播间SC抓取：已停止');
                            }
                        } else {
                            first_live_down_time = now_catch_time;
                        }
                    } else {
                        first_live_down_time = 0;
                    }
                }, 1000 * sc_catch_interval);

            } else if (sc_button_model.html() === '中速') {
                sc_button_model.html('高速');
                sc_button_model.attr('title', '抓取状态：高速（' + sc_catch_interval_fast + '秒抓取一次）');
                console.log('b站直播间SC抓取：已切换到高速，' + sc_catch_interval_fast + '秒抓取一次');
                sc_catch_interval_fast = parseInt(sc_catch_interval_fast);
                if (sc_catch_interval_fast < 5) { sc_catch_interval_fast = 5; }
                sc_catch_inverval_id = setInterval(() => {
                    updateTimestampDiff();
                    sc_fetch_and_show();
                    // 下播后，一段时间自动停止抓取（10分钟）（解决三种情况：提前、状况、下播）
                    if (catch_live_status !== 1) {
                        let now_catch_time = (new Date()).getTime();
                        if (first_live_down_time) {
                            if ( (now_catch_time - first_live_down_time) > 1000 * 60 * catch_time_out) {
                                // 删除定时器
                                clearInterval(sc_catch_inverval_id);
                                sc_button_model.html('停止');
                                sc_button_model.attr('title', '抓取状态：已停止抓取');
                                console.log('b站直播间SC抓取：已停止');
                            }
                        } else {
                            first_live_down_time = now_catch_time;
                        }
                    } else {
                        first_live_down_time = 0;
                    }
                }, 1000 * sc_catch_interval_fast);

            } else if(sc_button_model.html() === '高速'){
                sc_button_model.html('停止');
                sc_button_model.attr('title', '抓取状态：已停止抓取');
                console.log('b站直播间SC抓取：已停止');

            } else if (sc_button_model.html() === '停止') {
                sc_button_model.html('一般');
                sc_button_model.attr('title', '抓取状态：一般（一分钟抓取一次）');
                console.log('b站直播间SC抓取：已切换到低速，55秒抓取一次');
                sc_catch_interval_low = parseInt(sc_catch_interval_low);
                if (sc_catch_interval_low != 55) { sc_catch_interval_low = 55; }
                sc_catch_inverval_id = setInterval(() => {
                    updateTimestampDiff();
                    sc_fetch_and_show();
                    // 下播后，一段时间自动停止抓取（10分钟）（解决三种情况：提前、状况、下播）
                    if (catch_live_status !== 1) {
                        let now_catch_time = (new Date()).getTime();
                        if (first_live_down_time) {
                            if ( (now_catch_time - first_live_down_time) > 1000 * 60 * catch_time_out) {
                                // 删除定时器
                                clearInterval(sc_catch_inverval_id);
                                sc_button_model.html('停止');
                                sc_button_model.attr('title', '抓取状态：已停止抓取');
                                console.log('b站直播间SC抓取：已停止');
                            }
                        } else {
                            first_live_down_time = now_catch_time;
                        }
                    } else {
                        first_live_down_time = 0;
                    }
                }, 1000 * sc_catch_interval_low);

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

        function sc_fetch_and_show() {
            // 抓取SC
            fetch(sc_url).then(response => {
                return response.json();
            }).then(ret => {
                if (ret.code === 0) {
                    catch_live_status = ret.data.room_info.live_status;

                    // 高能数
                    let high_energy_num = ret.data.room_rank_info ? ret.data.room_rank_info.user_rank_entry.user_contribution_rank_entry.count : 0;
                    $(document).find('.sc_high_energy_num_right').text(high_energy_num);

                    // 舰长数
                    let captain_num = ret.data.guard_info.count;
                    $(document).find('.sc_captain_num_right').text(captain_num);

                    sc_live_room_title = ret.data.anchor_info.base_info.uname + '_' + ret.data.room_info.title;

                    // 追加到localstorage 和 SC显示板
                    let sc_catch = ret.data.super_chat_info.message_list;
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

                    if (sc_add_arr.length > 0) {
                        for (let i = 0; i < sc_add_arr.length; i++){
                            if (diff_arr_new_sc.length > 0) {
                                sc_localstorage.push(sc_add_arr[i]);
                                sc_sid_localstorage.push(String(sc_add_arr[i]["id"]) + '_' + String(sc_add_arr[i]["uid"]) + '_' + String(sc_add_arr[i]["price"]));
                            }

                            // 追加到SC显示板
                            let sc_background_bottom_color = sc_add_arr[i]["background_bottom_color"];
                            let sc_background_image = sc_add_arr[i]["background_image"];
                            let sc_background_color = sc_add_arr[i]["background_color"];
                            let sc_uid = sc_add_arr[i]["uid"];
                            let sc_user_info_face = sc_add_arr[i]["user_info"]["face"];
                            let sc_user_info_face_frame = sc_add_arr[i]["user_info"]["face_frame"];
                            let sc_user_info_uname = sc_add_arr[i]["user_info"]["uname"];
                            let sc_font_color = sc_add_arr[i]["font_color"]?sc_add_arr[i]["font_color"]:'#666666';
                            let sc_price = sc_add_arr[i]["price"];
                            let sc_message = sc_add_arr[i]["message"];
                            let sc_start_timestamp = sc_add_arr[i]["start_time"];
                            let sc_start_time = getTimestampConversion(sc_start_timestamp);
                            let sc_diff_time = getTimestampDiff(sc_start_timestamp);

                            let sc_user_info_face_frame_div = '';
                            if (sc_user_info_face_frame !== '') {
                                sc_user_info_face_frame_div = '<img src="'+ sc_user_info_face_frame +'" height="40" width="40" style="float: left; position: absolute; z-index:2;">';
                            }

                            let box_shadow_css = '';
                            if (sc_switch === 0 || sc_switch === 2 || sc_switch === 3) {
                                box_shadow_css = 'box-shadow: rgba(0, 0, 0, 0.5) 2px 2px 2px;';
                            }
                            let sc_item_html = '<div class="sc_item" style="background-color: '+ sc_background_bottom_color +';min-height: 70px;margin-bottom: 10px;animation: sc_fadenum 2s ease-out;border-radius: 8px 8px 6px 6px;'+ box_shadow_css +'">'+
                                '<div style="background-image: url('+ sc_background_image +');height: 40px;background-color: '+ sc_background_color +';padding:5px;background-size: cover;background-position: left center; border-top-left-radius: 6px; border-top-right-radius: 6px;">'+
                                '<div style="float: left; box-sizing: border-box; height: 40px; position: relative;"><a href="//space.bilibili.com/'+ sc_uid +'" target="_blank">'+
                                '<img src="'+ sc_user_info_face +'" height="40" width="40" style="border-radius: 20px; float: left; position: absolute; z-index:1;">'+ sc_user_info_face_frame_div +'</a></div>'+
                                '<div style="float: left; box-sizing: border-box; height: 40px; margin-left: 40px;">'+
                                '<div style="height: 20px; padding-left: 5px;"><span style="color: rgba(0,0,0,0.3); font-size: 10px;">'+ sc_start_time +'</span></div>'+
                                '<div style="height: 20px; padding-left: 5px;"><a href="//space.bilibili.com/'+ sc_uid +'" target="_blank" style="color: '+ sc_font_color +';font-size: 15px;text-decoration: none;">'+ sc_user_info_uname +'</a></div>'+
                                '</div>'+
                                '<div style="float: right; box-sizing: border-box; height: 40px;">'+
                                '<div style="height: 20px;"><span style="font-size: 15px;">CN￥'+ sc_price +'</span></div>'+
                                '<div style="height: 20px; color: #666666"><span class="sc_diff_time" style="font-size: 15px; float: right;">'+ sc_diff_time +'</span><span class="sc_start_timestamp" style="display:none;">'+ sc_start_timestamp +'</span></div>'+
                                '</div>'+
                                '</div>'+
                                '<div style="padding: 10px;overflow-wrap: break-word;"><span style="color: white; font-size: 14px;">'+ sc_message +'</span></div>'+
                                '</div>';

                            $(document).find('.live-room-app .sc_list').prepend(sc_item_html);

                        }

                        // 追加到localstorage（存储就不用GM_setValue了，直接localstorage，控制台就可以看到）
                        if (diff_arr_new_sc.length > 0) {
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

                            // 保存/更新sc_keep_time （最后sc的时间戳）
                            unsafeWindow.localStorage.setItem(sc_keep_time_key, (new Date()).getTime());

                            // 追加
                            unsafeWindow.localStorage.setItem(sc_localstorage_key, JSON.stringify(sc_localstorage));
                            unsafeWindow.localStorage.setItem(sc_sid_localstorage_key, JSON.stringify(sc_sid_localstorage));
                        }

                        sc_isListEmpty = false;
                    }
                }
            })
        }

        check_and_clear_all_sc_store();
        sc_fetch_and_show();
        console.log('start b站直播间SC抓取：低速，55秒抓取一次');
        sc_catch_interval_low = parseInt(sc_catch_interval_low);
        if (sc_catch_interval_low !== 55) { sc_catch_interval_low = 55; }
        let sc_catch_inverval_id = setInterval(() => {
            updateTimestampDiff();
            sc_fetch_and_show();
            // 下播后，一段时间自动停止抓取（10分钟）（解决三种情况：提前、状况、下播）
            if (catch_live_status !== 1) {
                let now_catch_time = (new Date()).getTime();
                if (first_live_down_time) {
                    if ( (now_catch_time - first_live_down_time) > 1000 * 60 * catch_time_out) {
                        // 删除定时器
                        clearInterval(sc_catch_inverval_id);
                        let sc_button_model = $(document).find('.sc_button_model');
                        sc_button_model.html('停止');
                        sc_button_model.attr('title', '抓取状态：已停止抓取');
                        console.log('b站直播间SC抓取：已停止');
                    }
                } else {
                    first_live_down_time = now_catch_time;
                }
            } else {
                first_live_down_time = 0;
            }
        }, 1000 * sc_catch_interval_low);
    }

    sc_process_start();

})();
