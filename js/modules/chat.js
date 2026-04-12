/**
 * js/modules/chat.js
 * QAQ - 聊天模块 (深度解耦，完美接管桌面图标)
 */
(function () {
    'use strict';

    var CHAT_STORE_KEY = 'qaq-chat-store-v2';
    var activeContactId = null;

    /* ===== 核心数据初始化 ===== */
    function qaqGetChatData() {
        return window.qaqCacheGet(CHAT_STORE_KEY, {
            contacts: {},
            messages: {},
            globalSettings: {},
            myProfile: {
                nickname: '我',
                trueName: '',
                persona: '',
                avatar: ''
            }
        });
    }

    function qaqSaveChatData(data) {
        window.qaqCacheSet(CHAT_STORE_KEY, data);
    }

    function qaqChatFormatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2, '0');
        var m = String(d.getMinutes()).padStart(2, '0');
        var today = new Date();
        if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) {
            return h + ':' + m;
        }
        return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + h + ':' + m;
    }

    /* ===== 造一点初始数据 ===== */
    function checkAndInjectMockData() {
        var cd = qaqGetChatData();
        if (Object.keys(cd.contacts).length === 0) {
            cd.contacts['bot_alice'] = {
                id: 'bot_alice',
                nickname: 'Alice',
                remark: '英语精灵',
                avatar: '',
                isTop: true,
                updateTime: Date.now(),
                configs: {
                    op_persona: '你是一个英语精灵，专门陪我练习口语。',
                    op_trans_pos: '气泡内下方',
                    ui_bubble_radius: 12
                }
            };
            cd.messages['bot_alice'] = [
                {
                    id: 1,
                    text: "Hi there! I'm Alice, your English learning partner. How is your day going?",
                    isMe: false,
                    time: Date.now() - 300000,
                    translated: "你好！我是Alice，你的英语学习伙伴。今天过得怎么样？"
                },
                {
                    id: 2,
                    text: "It's going well, thank you!",
                    isMe: true,
                    time: Date.now() - 10000
                }
            ];
            qaqSaveChatData(cd);
        }
    }

    /* ===== 强制接管并打开应用 ===== */
    window.qaqOpenChatApp = function () {
        checkAndInjectMockData();
        renderContactList();
        var mainPage = document.getElementById('qaq-chat-main-page');
        window.qaqSwitchTo(mainPage);
    };

    function hijackDesktopIcon() {
        var chatIcons = document.querySelectorAll('.qaq-app-item[data-app="chat"]');
        chatIcons.forEach(function (icon) {
            // 通过克隆节点彻底洗掉 index.js 里绑定的弹 Toast 事件
            var clone = icon.cloneNode(true);
            icon.parentNode.replaceChild(clone, icon);
            
            // 重新绑定真正的打开方法
            clone.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                window.qaqOpenChatApp();
            });
        });
    }

    /* ===== 页面与按钮绑定 ===== */
    function bindPageEvents() {
        var mainPage = document.getElementById('qaq-chat-main-page');
        var windowPage = document.getElementById('qaq-chat-window-page');
        var settingsPage = document.getElementById('qaq-chat-settings-page');

        // 主页返回桌面
        var mainBack = document.getElementById('qaq-chat-main-back');
        if (mainBack) {
            mainBack.addEventListener('click', function () {
                window.qaqClosePage(mainPage);
            });
        }

        // 从聊天窗口返回主页
        var winBack = document.getElementById('qaq-chat-win-back');
        if (winBack) {
            winBack.addEventListener('click', function () {
                renderContactList();
                window.qaqGoBackTo(mainPage, windowPage);
            });
        }

        // 从设置页返回聊天窗口
        var setBack = document.getElementById('qaq-chat-set-back');
        if (setBack) {
            setBack.addEventListener('click', function () {
                renderMessages(); // 配置可能改变了气泡圆角或翻译，直接重绘
                window.qaqGoBackTo(windowPage, settingsPage);
            });
        }

        // 打开设置页
        var winSetBtn = document.getElementById('qaq-chat-win-set-btn');
        if (winSetBtn) {
            winSetBtn.addEventListener('click', function () {
                renderDynamicSettings();
                window.qaqSwitchTo(settingsPage);
            });
        }

        // 发送消息
        var sendBtn = document.getElementById('qaq-chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMyMessage);
        }

        // 输入框支持回车发送
        var inputBox = document.getElementById('qaq-chat-input-box');
        if (inputBox) {
            inputBox.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMyMessage();
                }
            });
            inputBox.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
        }

        // 附加菜单切换
        var extBtn = document.getElementById('qaq-chat-toggle-menu');
        var extMenu = document.getElementById('qaq-chat-ext-menu');
        if (extBtn && extMenu) {
            extBtn.addEventListener('click', function() {
                extMenu.style.display = extMenu.style.display === 'none' ? 'grid' : 'none';
            });
        }

        // 渲染底部附加菜单项目
        var extFeatures = [
            { name: '照片', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { name: '拍照', icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' },
            { name: '语音通话', icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' },
            { name: '转账', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
            { name: '剧场', icon: '<polygon points="5 3 19 12 5 21 5 3"/>' },
            { name: '世界书', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
            { name: '位置', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
            { name: '日记', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' }
        ];
        
        if (extMenu) {
            extMenu.innerHTML = extFeatures.map(function(item) {
                return '<div class="qaq-ext-item" onclick="window.qaqToast(\'' + item.name + ' 功能即将开放\')">' +
                         '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + item.icon + '</svg></div>' +
                         '<div class="qaq-ext-label">' + item.name + '</div>' +
                       '</div>';
            }).join('');
        }
    }

    /* ===== 联系人列表 ===== */
    function renderContactList() {
        var cd = qaqGetChatData();
        var listEl = document.getElementById('qaq-chat-contact-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        
        var arr = Object.keys(cd.contacts).map(function(k) { return cd.contacts[k]; });
        arr.sort(function(a,b) {
            if(a.isTop !== b.isTop) return a.isTop ? -1 : 1;
            return (b.updateTime || 0) - (a.updateTime || 0);
        });

        if (arr.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px;">您的消息列表空空如也~</div>';
            return;
        }

        arr.forEach(function(c) {
            var msgs = cd.messages[c.id] || [];
            var lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
            var timeStr = lastMsg ? qaqChatFormatTime(lastMsg.time) : '';
            var preview = lastMsg ? (lastMsg.text || '[媒体消息]') : '暂无消息';
            
            // 优先显示备注
            var dpName = window.qaqEscapeHtml(c.remark || c.nickname || c.id);
            var defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E';

            var item = document.createElement('div');
            item.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            item.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || defaultAvatar) + '" />' +
                '<div class="qaq-chat-list-info">' +
                    '<div class="qaq-chat-list-top-row">' +
                        '<div class="qaq-chat-list-name">' + dpName + '</div>' +
                        '<div class="qaq-chat-list-time">' + timeStr + '</div>' +
                    '</div>' +
                    '<div class="qaq-chat-list-preview">' + window.qaqEscapeHtml(preview) + '</div>' +
                '</div>';

            item.addEventListener('click', function() {
                openChatWindow(c.id);
            });
            listEl.appendChild(item);
        });
    }

    /* ===== 对话气泡窗 ===== */
    function openChatWindow(cid) {
        activeContactId = cid;
        var cd = qaqGetChatData();
        var contact = cd.contacts[cid];
        var s = getMergedSettings(contact);

        var titleEl = document.getElementById('qaq-chat-win-title');
        if (titleEl) titleEl.textContent = contact.remark || contact.nickname || '聊天';
        
        // 动态隐藏菜单或AI接收按扭
        var recvBtn = document.getElementById('qaq-chat-recv-ai-btn');
        var extBtn = document.getElementById('qaq-chat-toggle-menu');
        if (recvBtn) recvBtn.style.display = s.ui_hide_ai_btn ? 'none' : 'block';
        if (extBtn) extBtn.style.display = s.ui_hide_menu_btn ? 'none' : 'flex';
        
        document.getElementById('qaq-chat-ext-menu').style.display = 'none';

        var windowPage = document.getElementById('qaq-chat-window-page');
        window.qaqSwitchTo(windowPage);
        renderMessages();
    }

    function getMergedSettings(contact) {
        var cd = qaqGetChatData();
        return Object.assign({}, cd.globalSettings || {}, contact.configs || {});
    }

    function renderMessages() {
        if (!activeContactId) return;
        var cd = qaqGetChatData();
        var msgs = cd.messages[activeContactId] || [];
        var contact = cd.contacts[activeContactId];
        var myP = cd.myProfile;
        var s = getMergedSettings(contact); 

        var listEl = document.getElementById('qaq-chat-msg-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        var html = '';
        var defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E';

        msgs.forEach(function(m) {
            var avatar = m.isMe ? (myP.avatar || defaultAvatar) : (contact.avatar || defaultAvatar);
            
            // 是否隐藏头像
            var avaShow = s.ui_avatar_show || '全部显示';
            var avaHtml = '<img class="qaq-chat-bubble-avatar" src="' + avatar + '">';
            if (avaShow === '隐藏') avaHtml = ''; // 暂不实现首尾控制，仅做全隐演示

            var alignClass = m.isMe ? 'qaq-row-me' : 'qaq-row-other';
            var r = s.ui_bubble_radius ? s.ui_bubble_radius : '16'; 
            var radiusStyle = 'style="border-radius:' + r + 'px"'; 
            if(r && !m.isMe) radiusStyle = 'style="border-radius:4px '+r+'px '+r+'px '+r+'px"';
            if(r && m.isMe) radiusStyle = 'style="border-radius:'+r+'px 4px '+r+'px '+r+'px"';
            
            var transLocation = s.op_trans_pos || '气泡内下方'; 
            var transHtml = '';
            var bubTransClass = '';

            if (m.translated && transLocation !== '不显示') {
                transHtml = '<div class="qaq-chat-translation">' + window.qaqEscapeHtml(m.translated) + '</div>';
                if (transLocation === '气泡外下方') bubTransClass = 'qaq-trans-out';
            }

            var bubbleInner = window.qaqEscapeHtml(m.text) + (transLocation === '气泡内下方' ? transHtml : '');
            var bubbleOuter = transLocation === '气泡外下方' ? transHtml : '';

            // 解析纯颜色，如果选择的是预设主题
            var colorClass = s.ui_theme_color === '粉色蔷薇' ? 'style="background:#fce8e2"' : 
                             s.ui_theme_color === '知性苍青' ? 'style="background:#c8d8c4"' : '';

            html += 
                '<div class="qaq-chat-row ' + alignClass + '">' +
                    avaHtml +
                    '<div class="qaq-chat-bubble-wrap ' + bubTransClass + '">' +
                        '<div class="qaq-chat-msg-time">' + qaqChatFormatTime(m.time) + '</div>' +
                        '<div class="qaq-chat-bubble" ' + radiusStyle + ' ' + (m.isMe ? colorClass : '') + '>' + bubbleInner + '</div>' +
                        bubbleOuter +
                    '</div>' +
                '</div>';
        });
        
        listEl.innerHTML = html;
        setTimeout(function() {
            listEl.scrollTop = listEl.scrollHeight;
        }, 50);
    }

    function sendMyMessage() {
        if (!activeContactId) return;
        var box = document.getElementById('qaq-chat-input-box');
        var text = box.value.trim();
        if (!text) return;

        var cd = qaqGetChatData();
        if(!cd.messages[activeContactId]) cd.messages[activeContactId] = [];
        
        cd.messages[activeContactId].push({ 
            id: Date.now(), text: text, isMe: true, time: Date.now(), translated: '' 
        });
        cd.contacts[activeContactId].updateTime = Date.now();
        qaqSaveChatData(cd);

        box.value = '';
        box.style.height = 'auto';
        renderMessages();
    }

    /* ===== 超级复杂的折叠设置渲染 ===== */
    function renderDynamicSettings() {
        var cd = qaqGetChatData();
        var c = cd.contacts[activeContactId] || {};
        var s = getMergedSettings(c);
        var p = cd.myProfile;
        
        var scrollEl = document.getElementById('qaq-chat-settings-scroll');
        if (!scrollEl) return;
        scrollEl.innerHTML = '';

        var forms = [
            {
                title: '一. 对方角色设定 (深度赋权)',
                fields: [
                    { key: 'remark', type: 'input', label: '对方昵称/备注 (强覆写)', val: c.remark || '' },
                    { key: 'trueName', type: 'input', label: '真实姓名 (供人设剧情提取)', val: c.trueName || '' },
                    { key: 'avatar_url', type: 'image', label: '角色头像 URL 直链', val: c.avatar || '' },
                    { key: 'op_persona', type: 'textarea', label: '角色具体人设与限制系统提示词', val: s.op_persona || '' },
                    { key: 'op_bind_world', type: 'input', label: '绑定世界书知识库名', val: s.op_bind_world || '' },
                    { key: 'op_allow_emoji', type: 'toggle', label: '角色是否主动发表情包', val: !!s.op_allow_emoji },
                    { key: 'op_trans_pos', type: 'select', label: '对话双语翻译呈现方案', val: s.op_trans_pos || '气泡内下方', options: ['不显示','气泡内下方','气泡外下方'] }
                ]
            },
            {
                title: '二. 我的身份设定',
                fields: [
                    { key: 'my_nick', type: 'input', label: '我在对话中的显示昵称', val: p.nickname || '' },
                    { key: 'my_true', type: 'input', label: '我的真名 (暴露给AI)', val: p.trueName || '' },
                    { key: 'my_persona', type: 'textarea', label: '我方具体背景故事设定', val: p.persona || '' }
                ]
            },
            {
                title: '三. 美化与控制台',
                fields: [
                    { key: 'ui_theme_color', type: 'select', label: '对方对话气泡主题色', val: s.ui_theme_color || '默认翡翠', options: ['默认翡翠','粉色蔷薇','知性苍青'] },
                    { key: 'ui_bubble_radius', type: 'input', label: '气泡圆角重载 (默认 16)', val: s.ui_bubble_radius || '' },
                    { key: 'ui_avatar_show', type: 'select', label: '头像全局展示规则', val: s.ui_avatar_show || '全部显示', options: ['全部显示','隐藏'] },
                    { key: 'ui_hide_ai_btn', type: 'toggle', label: '隐藏接收消息按钮 (拉宽打字区)', val: !!s.ui_hide_ai_btn },
                    { key: 'ui_hide_menu_btn', type: 'toggle', label: '隐藏附加菜单 +号按钮', val: !!s.ui_hide_menu_btn }
                ]
            },
            {
                title: '四. 上下文与记忆',
                fields: [
                    { key: 'mem_max', type: 'input', label: '最大保留原始记忆数目', val: s.mem_max || '30' },
                    { key: 'mem_attach_img', type: 'toggle', label: '是否附挂聊天图像流记忆', val: !!s.mem_attach_img },
                    { key: 'mem_summary', type: 'toggle', label: '是否开启过载记忆提纯总结', val: !!s.mem_summary },
                    { key: 'cmd_export', type: 'button', label: '导出该聊天全量 JSON / TXT 数据' },
                    { key: 'cmd_clear', type: 'button', label: '【高危警告】清空聊天记录 (不可逆)' }
                ]
            },
            {
                title: '五. 通讯安全与杂项',
                fields: [
                    { key: 'op_no_disturb', type: 'toggle', label: '开启后半夜免打扰', val: !!s.op_no_disturb },
                    { key: 'cmd_delete_c', type: 'button', label: '【彻底拉黑并删除该角色】' }
                ]
            }
        ];

        var htmlBuffer = '';

        forms.forEach(function(group) {
            htmlBuffer += 
                '<div class="qaq-chat-setting-card">' +
                    '<div class="qaq-chat-setting-head" onclick="this.parentNode.classList.toggle(\'qaq-expand\')">' +
                        '<span>' + group.title + '</span><svg viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke-width="2" stroke-linecap="round"/></svg>' +
                    '</div>' +
                    '<div class="qaq-chat-setting-body">';

            group.fields.forEach(function(f) {
                var lab = '<div class="qaq-plan-form-label">' + f.label + '</div>';
                if (f.type === 'input') {
                    htmlBuffer += lab + '<input class="qaq-plan-form-input" id="cfg_' + f.key + '" value="' + f.val + '">';
                } else if (f.type === 'image') {
                    htmlBuffer += lab + '<input class="qaq-plan-form-input" id="cfg_' + f.key + '" value="' + f.val + '" placeholder="填写HTTPS安全图像直链">';
                } else if (f.type === 'textarea') {
                    htmlBuffer += lab + '<textarea class="qaq-plan-form-textarea" style="height:90px;" id="cfg_' + f.key + '">' + f.val + '</textarea>';
                } else if (f.type === 'select') {
                    var opts = f.options.map(function(o){ return '<option ' + (o === f.val ? 'selected' : '') + '>' + o + '</option>'; }).join('');
                    htmlBuffer += lab + '<select class="qaq-plan-form-input" id="cfg_' + f.key + '">' + opts + '</select>';
                } else if (f.type === 'toggle') {
                    htmlBuffer += 
                        '<div class="qaq-settings-item" style="padding:6px 0; border:none;" onclick="this.querySelector(\'.qaq-toggle\').classList.toggle(\'qaq-toggle-on\')">' +
                            '<div class="qaq-settings-item-text" style="font-size:13px;color:#555;">' + f.label + '</div>' +
                            '<div class="qaq-toggle' + (f.val ? ' qaq-toggle-on' : '') + '" id="cfg_' + f.key + '"><div class="qaq-toggle-knob"></div></div>' +
                        '</div>';
                } else if (f.type === 'button') {
                    htmlBuffer += '<button class="qaq-import-ghost-btn" style="margin-top:6px;width:100%;text-align:left;padding-left:14px;border:none;background:rgba(0,0,0,0.03);' + (f.label.indexOf('【') > -1 ? 'color:#d9534f;' : '') + '" onclick="window.qaqToast(\'动作执行触发...\')">' + f.label + '</button>';
                }
            });

            htmlBuffer += '</div></div>';
        });

        htmlBuffer += '<button class="qaq-api-save-btn" id="qaq-chat-save-master" style="width:100%;margin-bottom:20px;height:44px;border-radius:14px;">持久化应用并保存</button>';
        
        scrollEl.innerHTML = htmlBuffer;

        document.getElementById('qaq-chat-save-master').addEventListener('click', function() {
            var curr = qaqGetChatData();
            
            function ex(key, isToggle) {
                var el = document.getElementById('cfg_' + key);
                if (!el) return undefined;
                if (isToggle) return el.classList.contains('qaq-toggle-on');
                return el.value;
            }

            // 更新我方信息
            var nick = ex('my_nick');
            if (nick !== undefined) curr.myProfile.nickname = nick;
            curr.myProfile.trueName = ex('my_true') || '';
            curr.myProfile.persona = ex('my_persona') || '';

            // 更新这名联系人的显式状态
            var rmk = ex('remark');
            if (rmk !== undefined) {
                curr.contacts[activeContactId].remark = rmk;
                document.getElementById('qaq-chat-win-title').textContent = rmk || curr.contacts[activeContactId].nickname;
            }
            var ava = ex('avatar_url');
            if (ava !== undefined) curr.contacts[activeContactId].avatar = ava;

            // 存入黑箱 configs 配置域 
            var conf = curr.contacts[activeContactId].configs = curr.contacts[activeContactId].configs || {};
            conf.op_persona = ex('op_persona');
            conf.op_bind_world = ex('op_bind_world');
            conf.op_allow_emoji = ex('op_allow_emoji', true);
            conf.op_trans_pos = ex('op_trans_pos');
            conf.op_no_disturb = ex('op_no_disturb', true);

            conf.ui_theme_color = ex('ui_theme_color');
            conf.ui_bubble_radius = ex('ui_bubble_radius');
            conf.ui_avatar_show = ex('ui_avatar_show');
            conf.ui_hide_ai_btn = ex('ui_hide_ai_btn', true);
            conf.ui_hide_menu_btn = ex('ui_hide_menu_btn', true);
            
            conf.mem_max = ex('mem_max');
            conf.mem_attach_img = ex('mem_attach_img', true);
            conf.mem_summary = ex('mem_summary', true);

            qaqSaveChatData(curr);
            window.qaqToast('超级控制参数覆写成功！');
        });
    }

    /* ===== 生命周期初始化 ===== */
    document.addEventListener("DOMContentLoaded", function() {
        // 利用 setTimeout 确信 QAQ 全局挂载完成
        setTimeout(function() {
            hijackDesktopIcon();
            bindPageEvents();
        }, 400);
    });

})();