/**
 * js/modules/chat.js
 * QAQ - 聊天模块 
 * 核心特性：多重嵌套折叠设置、动态双渲染模式(数据驱动UI)、极致顺滑的主题与交互适配
 */
(function () {
    'use strict';

    /* ===== 存储与数据操作 ===== */
    var CHAT_STORE_KEY = 'qaq-chat-all-data';
    var activeContactId = null;

    function qaqGetChatData() {
        return window.qaqCacheGet(CHAT_STORE_KEY, {
            contacts: {},
            messages: {},
            myProfile: {
                nickname: '我',
                trueName: '',
                persona: '',
                avatar: ''
            },
            // 用于控制聊天行为和视觉参数（默认不写入脏数据，全靠UI赋默认值）
            settings: {}
        });
    }

    function qaqSaveChatData(data) {
        window.qaqCacheSet(CHAT_STORE_KEY, data);
    }

    function qaqChatFormatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2,'0');
        var m = String(d.getMinutes()).padStart(2,'0');
        var today = new Date();
        if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) {
            return h + ':' + m;
        }
        return (d.getMonth()+1) + '-' + d.getDate() + ' ' + h + ':' + m;
    }

    /* ===== 数据预装载(假数据演示) ===== */
    function checkAndInjectMockData() {
        var cd = qaqGetChatData();
        if (Object.keys(cd.contacts).length === 0) {
            cd.contacts['ai_samantha'] = { id: 'ai_samantha', nickname: 'Samantha', remark: '外语死党', isTop: true, updateTime: Date.now() - 1000, configs: {} };
            cd.contacts['ai_leo'] = { id: 'ai_leo', nickname: 'Leo', remark: 'AI教练', isTop: false, updateTime: Date.now() - 60000, configs: {} };
            cd.messages['ai_samantha'] = [
                { id: 1, text: 'Hello! 准备好今天的对话练习了吗？', isMe: false, time: Date.now() - 120000, translated: '你好！准备好今天的对话练习了吗？' },
                { id: 2, text: 'Of course! What should we talk about?', isMe: true, time: Date.now() - 2000 }
            ];
            cd.messages['ai_leo'] = [
                { id: 3, text: 'Remember to review the new vocabularies!', isMe: false, time: Date.now() - 60000 }
            ];
            qaqSaveChatData(cd);
        }
    }

    /* ===== DOM 交互及页面切换绑定 ===== */
    var mainPage = document.getElementById('qaq-chat-main-page');
    var windowPage = document.getElementById('qaq-chat-window-page');
    var settingsPage = document.getElementById('qaq-chat-settings-page');

    function bindEvents() {
        // 全局桌面图标入口
        document.querySelectorAll('.qaq-app-item[data-app="chat"]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.stopPropagation(); e.preventDefault();
                checkAndInjectMockData();
                renderContactList();
                window.qaqSwitchTo(mainPage);
            });
        });

        // 返回按钮栈
        document.getElementById('qaq-chat-main-back').addEventListener('click', function() {
            window.qaqClosePage(mainPage);
        });
        document.getElementById('qaq-chat-win-back').addEventListener('click', function() {
            renderContactList();
            window.qaqGoBackTo(mainPage, windowPage);
        });
        document.getElementById('qaq-chat-set-back').addEventListener('click', function() {
            // 返回聊天窗时顺手重绘一下可能改变的主题圆角
            renderMessages();
            window.qaqGoBackTo(windowPage, settingsPage);
        });

        // 主页顶栏加号
        document.getElementById('qaq-chat-top-add-btn').addEventListener('click', function() {
            window.qaqToast('可在此发起群聊、添加AI或扫描');
        });
        // 聊天窗设置齿轮
        document.getElementById('qaq-chat-win-set-btn').addEventListener('click', function() {
            renderDynamicSettings();
            window.qaqSwitchTo(settingsPage);
        });

        // 聊天底栏交互
        var extMenu = document.getElementById('qaq-chat-ext-menu');
        document.getElementById('qaq-chat-toggle-menu').addEventListener('click', function() {
            var st = extMenu.style.display;
            extMenu.style.display = st === 'none' ? 'grid' : 'none';
        });

        document.getElementById('qaq-chat-send-btn').addEventListener('click', sendMyMessage);
        
        var inputBox = document.getElementById('qaq-chat-input-box');
        if (inputBox) {
            // 支持回车直接发送（阻止默认换行）
            inputBox.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMyMessage();
                }
            });
            // 自动增高
            inputBox.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
        
        // 预定义好的微信底栏高级功能
        var extFeatures = [
            { name: '照片', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { name: '拍摄', icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' },
            { name: '语音通话', icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' },
            { name: '位置', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
            { name: '转账', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
            { name: '剧场', icon: '<polygon points="5 3 19 12 5 21 5 3"/>' },
            { name: '世界书', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
            { name: '日记', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' }
        ];
        
        extMenu.innerHTML = extFeatures.map(function(item) {
            return '<div class="qaq-ext-item" onclick="window.qaqToast(\'' + item.name + ' 功能挂载点\')">' +
                     '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24">' + item.icon + '</svg></div>' +
                     '<div class="qaq-ext-label">' + item.name + '</div>' +
                   '</div>';
        }).join('');
    }

    /* ===== 通讯录渲染 ===== */
    function renderContactList() {
        var cd = qaqGetChatData();
        var listEl = document.getElementById('qaq-chat-contact-list');
        listEl.innerHTML = '';
        
        var arr = Object.values(cd.contacts).sort(function(a,b) {
            if(a.isTop !== b.isTop) return a.isTop ? -1 : 1;
            return (b.updateTime || 0) - (a.updateTime || 0);
        });

        arr.forEach(function(c) {
            var msgs = cd.messages[c.id] || [];
            var lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
            var timeStr = lastMsg ? qaqChatFormatTime(lastMsg.time) : '';
            var preview = lastMsg ? (lastMsg.text || '[特殊消息]') : '';
            var dpName = window.qaqEscapeHtml(c.remark || c.nickname || '未命名');

            var item = document.createElement('div');
            item.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            item.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E') + '" />' +
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

    /* ===== 聊天窗口渲染 ===== */
    function openChatWindow(cid) {
        activeContactId = cid;
        var cd = qaqGetChatData();
        var contact = cd.contacts[cid];
        document.getElementById('qaq-chat-win-title').textContent = contact.remark || contact.nickname || '对话';
        
        // 提取部分样式设定，实时应用给聊天输入栏 (隐藏右侧按钮体验铺满)
        var s = getMergedSettings(contact);
        var recvBtn = document.getElementById('qaq-chat-recv-ai-btn');
        recvBtn.style.display = s.ui_hide_ai_btn ? 'none' : 'block';

        window.qaqSwitchTo(windowPage);
        document.getElementById('qaq-chat-ext-menu').style.display = 'none';
        renderMessages();
    }

    function renderMessages() {
        if (!activeContactId) return;
        var cd = qaqGetChatData();
        var msgs = cd.messages[activeContactId] || [];
        var contact = cd.contacts[activeContactId];
        var myP = cd.myProfile;
        var s = getMergedSettings(contact); // 用于控制翻译模式等视觉差异

        var listEl = document.getElementById('qaq-chat-msg-list');
        listEl.innerHTML = '';

        var html = '';
        msgs.forEach(function(m) {
            var avatar = m.isMe ? myP.avatar : contact.avatar;
            if (!avatar) avatar = 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E';
            
            var alignClass = m.isMe ? 'qaq-row-me' : 'qaq-row-other';
            var customRadius = s.ui_bubble_radius ? 'style="border-radius:'+s.ui_bubble_radius+'px"' : '';
            var transLocation = s.op_trans_pos || '内下方'; // [内下方, 外下方]
            
            var transHtml = '';
            var bubTransClass = '';
            if (m.translated && transLocation !== '不显示') {
                transHtml = '<div class="qaq-chat-translation">' + window.qaqEscapeHtml(m.translated) + '</div>';
                if (transLocation === '外下方') bubTransClass = 'qaq-trans-out';
            }

            var bubbleInner = window.qaqEscapeHtml(m.text) + (transLocation==='内下方' ? transHtml : '');
            var bubbleOuter = transLocation==='外下方' ? transHtml : '';

            html += 
                '<div class="qaq-chat-row ' + alignClass + '">' +
                    '<img class="qaq-chat-bubble-avatar" src="' + avatar + '">' +
                    '<div class="qaq-chat-bubble-wrap ' + bubTransClass + '">' +
                        '<div class="qaq-chat-bubble" ' + customRadius + '>' + bubbleInner + '</div>' +
                        bubbleOuter +
                    '</div>' +
                '</div>';
        });
        
        listEl.innerHTML = html;
        listEl.scrollTop = listEl.scrollHeight;
    }

    function sendMyMessage() {
        if(!activeContactId) return;
        var box = document.getElementById('qaq-chat-input-box');
        var text = box.value.trim();
        if (!text) return;

        var cd = qaqGetChatData();
        if(!cd.messages[activeContactId]) cd.messages[activeContactId] = [];
        
        cd.messages[activeContactId].push({ id: Date.now(), text: text, isMe: true, time: Date.now(), translated: '' });
        cd.contacts[activeContactId].updateTime = Date.now();
        qaqSaveChatData(cd);

        box.value = '';
        box.style.height = 'auto'; // 恢复原始高度
        renderMessages();

        // 模拟 AI 回复（如果真想接入API，用 utils 里的工具发送请求即可）
        setTimeout(function() {
            var curr_cd = qaqGetChatData();
            curr_cd.messages[activeContactId].push({ 
                id: Date.now(), 
                text: "I clearly heard you. In fact, if you integrate an LLM, I can chat directly based on system prompts.", 
                isMe: false, 
                time: Date.now(),
                translated: "我听得很清楚，实际上如果接入 LLM 即可按照人设真实对话。"
            });
            curr_cd.contacts[activeContactId].updateTime = Date.now();
            qaqSaveChatData(curr_cd);
            if (document.getElementById('qaq-chat-window-page').classList.contains('qaq-page-show')) {
                renderMessages();
            }
        }, 1200);
    }

    /* ===== 数据驱动的：深度配置动态渲染器 ===== */
    // 工具：获取混合全局与个人的配置
    function getMergedSettings(contact) {
        var cd = qaqGetChatData();
        return Object.assign({}, cd.settings || {}, contact.configs || {});
    }

    function renderDynamicSettings() {
        var cd = qaqGetChatData();
        var c = cd.contacts[activeContactId];
        var s = getMergedSettings(c);
        var p = cd.myProfile;
        
        var listEl = document.getElementById('qaq-chat-settings-scroll');
        listEl.innerHTML = '';

        // 神奇的配置抽象树：根据这里的字段自动排版成卡片、input, toggle, select
        var forms = [
            {
                title: '一. 对方角色设定 (深度注入)',
                fields: [
                    { key: 'remark', type: 'input', label: '对方昵称/备注 (强制显示)', val: c.remark || c.nickname },
                    { key: 'avatar_c', type: 'image', label: '角色头像 URL (可更换)', val: c.avatar },
                    { key: 'op_persona', type: 'textarea', label: '具体人设核心 Prompt (严格服从)', val: s.op_persona },
                    { key: 'op_bind_world', type: 'input', label: '绑定《世界书》ID读取设定', val: s.op_bind_world },
                    { key: 'op_trans_pos', type: 'select', label: '双语翻译占位方案', val: s.op_trans_pos || '内下方', options: ['内下方','外下方','不显示'] },
                    { key: 'op_auto_msg', type: 'toggle', label: '允许角色长期无交互时主动发消息', val: !!s.op_auto_msg },
                    { key: 'op_msg_interval', type: 'input', label: '主动发送触发间隔 (分钟)', val: s.op_msg_interval || '120' },
                    { key: 'op_api_key', type: 'password', label: '角色私有 API Key (留空调用全局)', val: s.op_api_key },
                    { key: 'op_api_voice', type: 'select', label: '角色的单独配音库模型', val: s.op_api_voice||'无', options:['无','female-shaonv','male-tiannang'] }
                ]
            },
            {
                title: '二. 我方身份欺骗',
                fields: [
                    { key: 'my_name', type: 'input', label: '我在这段对话的真名', val: p.trueName },
                    { key: 'my_persona', type: 'textarea', label: '告诉AI我是谁，拥有什么背景', val: p.persona }
                ]
            },
            {
                title: '三. 定制美化与布局',
                fields: [
                    { key: 'ui_hide_ai_btn', type: 'toggle', label: '隐藏接收AI按钮 (打字框自动铺满)', val: !!s.ui_hide_ai_btn },
                    { key: 'ui_menu_top', type: 'toggle', label: '菜单附加项改到输入框上方', val: !!s.ui_menu_top },
                    { key: 'ui_bubble_radius', type: 'input', label: '聊天气泡强制圆角半径 (写数字)', val: s.ui_bubble_radius || '' },
                    { key: 'ui_theme_color', type: 'select', label: '对话气泡高亮色阶', val: s.ui_theme_color||'默认翡翠', options:['默认翡翠','粉色蔷薇','知性苍青'] },
                    { key: 'ui_avatar_show', type: 'select', label: '全屏幕头像裁切显示法', val: s.ui_avatar_show||'全部显示', options:['全部显示','紧贴边缘','隐藏'] }
                ]
            },
            {
                title: '四. 控制指令级记忆',
                fields: [
                    { key: 'mem_max', type: 'input', label: 'AI 可追溯的最大历史上下文数目', val: s.mem_max || '40' },
                    { key: 'mem_summarize', type: 'toggle', label: '超限时截断并在头部挂载机器提取总结', val: s.mem_summarize !== false },
                    { key: 'mem_attach_img', type: 'toggle', label: '携带照片图像流提供给模型 (Vision)', val: !!s.mem_attach_img },
                    { key: 'cmd_export', type: 'button', label: '以 JSON 标准格式导出所有内容' },
                    { key: 'cmd_clear', type: 'button', label: '【高危】粉碎双方所有对白与痕迹' }
                ]
            }
        ];

        forms.forEach(function(group) {
            var card = document.createElement('div');
            card.className = 'qaq-chat-setting-card';
            
            var cardHead = document.createElement('div');
            cardHead.className = 'qaq-chat-setting-head';
            cardHead.innerHTML = '<span>' + group.title + '</span><svg viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke-width="2" stroke-linecap="round"/></svg>';
            cardHead.onclick = function() { card.classList.toggle('qaq-expand'); };
            card.appendChild(cardHead);

            var cardBody = document.createElement('div');
            cardBody.className = 'qaq-chat-setting-body';

            group.fields.forEach(function(f) {
                var dLabel = '<div class="qaq-plan-form-label">' + f.label + '</div>';
                if (f.type === 'input' || f.type === 'password') {
                    cardBody.innerHTML += dLabel + '<input class="qaq-plan-form-input" type="' + (f.type==='password'?'password':'text') + '" id="chat_cfg_' + f.key + '" value="' + f.val + '">';
                } else if (f.type === 'textarea') {
                    cardBody.innerHTML += dLabel + '<textarea class="qaq-plan-form-textarea" id="chat_cfg_' + f.key + '">' + f.val + '</textarea>';
                } else if (f.type === 'select') {
                    var opts = f.options.map(function(o){ return '<option ' + (o===f.val?'selected':'') + '>' + o + '</option>'; }).join('');
                    cardBody.innerHTML += dLabel + '<select class="qaq-plan-form-input" id="chat_cfg_' + f.key + '">' + opts + '</select>';
                } else if (f.type === 'toggle') {
                    cardBody.innerHTML += 
                        '<div class="qaq-settings-item" style="padding:4px 0; border:none;" onclick="this.querySelector(\'.qaq-toggle\').classList.toggle(\'qaq-toggle-on\')">' +
                            '<div class="qaq-settings-item-text" style="font-size:13px;">' + f.label + '</div>' +
                            '<div class="qaq-toggle' + (f.val ? ' qaq-toggle-on' : '') + '" id="chat_cfg_' + f.key + '"><div class="qaq-toggle-knob"></div></div>' +
                        '</div>';
                } else if (f.type === 'button') {
                    cardBody.innerHTML += '<button class="qaq-import-ghost-btn" style="margin-top:4px;' + (f.label.indexOf('【高危】')>-1 ? 'color:#d9534f;border-color:#d9534f;':'') + '">' + f.label + '</button>';
                } else if (f.type === 'image') {
                    // 图片输入借用 input 且自带点击按钮支持
                    cardBody.innerHTML += dLabel + '<input class="qaq-plan-form-input" type="text" id="chat_cfg_' + f.key + '" value="' + f.val + '" placeholder="HTTPS URL 图片直链">';
                }
            });
            card.appendChild(cardBody);
            listEl.appendChild(card);
        });

        // 在最底下放保存按钮
        var saveWrap = document.createElement('div');
        saveWrap.innerHTML = '<button class="qaq-api-save-btn" id="qaq-chat-save-master" style="width:100%;margin:20px 0;">将所有修改硬提交进闪存</button>';
        listEl.appendChild(saveWrap);

        document.getElementById('qaq-chat-save-master').onclick = function() {
            var curr_cd = qaqGetChatData();
            
            // 手工提取所有的 ID (这个通过刚才渲染的 chat_cfg_* ID 直接逆向读取即可)
            var extractVal = function(key, isToggle) {
                var el = document.getElementById('chat_cfg_' + key);
                if(!el) return undefined;
                if(isToggle) return el.classList.contains('qaq-toggle-on');
                return el.value;
            };

            // 存活修改我方的（假装是全局状态）
            curr_cd.myProfile.trueName = extractVal('my_name') || '';
            curr_cd.myProfile.persona = extractVal('my_persona') || '';

            // 存储对方信息改动
            var r = extractVal('remark');
            if (r !== undefined) curr_cd.contacts[activeContactId].remark = r;
            var a = extractVal('avatar_c');
            if (a !== undefined) curr_cd.contacts[activeContactId].avatar = a;

            // 设置提取与持久化
            var cc = curr_cd.contacts[activeContactId].configs = {};
            cc.op_persona = extractVal('op_persona');
            cc.op_bind_world = extractVal('op_bind_world');
            cc.op_trans_pos = extractVal('op_trans_pos');
            cc.op_auto_msg = extractVal('op_auto_msg', true);
            cc.op_msg_interval = extractVal('op_msg_interval');
            cc.op_api_key = extractVal('op_api_key');
            cc.op_api_voice = extractVal('op_api_voice');
            cc.ui_hide_ai_btn = extractVal('ui_hide_ai_btn', true);
            cc.ui_menu_top = extractVal('ui_menu_top', true);
            cc.ui_bubble_radius = extractVal('ui_bubble_radius');
            cc.ui_theme_color = extractVal('ui_theme_color');
            cc.ui_avatar_show = extractVal('ui_avatar_show');
            cc.mem_max = extractVal('mem_max');
            cc.mem_summarize = extractVal('mem_summarize', true);
            cc.mem_attach_img = extractVal('mem_attach_img', true);

            qaqSaveChatData(curr_cd);
            
            // 同步标题
            if (r) document.getElementById('qaq-chat-win-title').textContent = r;
            window.qaqToast('超级参数已经应用到角色核心记忆里拉 (oﾟ▽ﾟ)o  ');
        };
    }

    // 导出的入口保证页面载入绑定
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", bindEvents);
    } else {
        bindEvents();
    }
})();