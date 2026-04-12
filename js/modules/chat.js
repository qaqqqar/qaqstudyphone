/**
 * js/modules/chat.js
 * QAQ - 聊天模块
 */
(function () {
    'use strict';
    
    // ★ 强制放在文件执行的最高点第一行，绝对不会被任何报错给拦截！
    window.qaqOpenChatPage = function () {
        var cd = qaqGetChatData();
        if (Object.keys(cd.contacts).length === 0) {
            cd.contacts['ai_alice'] = {
                id: 'ai_alice',
                nickname: 'Alice',
                remark: '英语私教',
                avatar: '',
                isTop: true,
                updateTime: Date.now(),
                configs: { op_persona: '你是一名严肃但温柔的英语口语私教。', op_trans_pos: '气泡内下方', ui_bubble_radius: 14 }
            };
            cd.messages['ai_alice'] = [
                { id: 1, text: "Let's start your English training for today.", isMe: false, time: Date.now() - 3600000, translated: "让我们开始今天的英语训练吧。" },
                { id: 2, text: "No problem! I'm ready.", isMe: true, time: Date.now() - 1000 }
            ];
            qaqSaveChatData(cd);
        }
        renderContactList();
        
        // 我们直接用前面改好的强制CSS方案让它弹出来！
        var el = document.getElementById('qaq-chat-main-page');
        el.classList.add('qaq-page-show');
        el.style.zIndex = '999';
    };

    var CHAT_STORE_KEY = 'qaq-chat-store-v2';
    var activeContactId = null;

    /* ===== 数据存取 ===== */
 /* ===== 数据存取与强制页面路由 ===== */
function getCache(key, def) {
    return (typeof qaqCacheGet !== 'undefined') ? qaqCacheGet(key, def) : 
           (window.qaqCacheGet ? window.qaqCacheGet(key, def) : def);
}

function setCache(key, val) {
    if (typeof qaqCacheSet !== 'undefined') qaqCacheSet(key, val);
    else if (window.qaqCacheSet) window.qaqCacheSet(key, val);
}

function safeToast(msg) {
    if (typeof qaqToast !== 'undefined') qaqToast(msg);
    else if (window.qaqToast) window.qaqToast(msg);
    else alert(msg); // 强制兜底
}

// 暴力越过底层路由，直接控制界面开关！！
function safeSwitchTo(el) {
    if (!el) return;
    el.classList.add('qaq-page-show');
    // 将页面移到最前，防止被遮挡
    el.style.zIndex = '999';
}

function safeGoBackTo(parent, child) {
    if (child) child.classList.remove('qaq-page-show');
    if (parent) parent.classList.add('qaq-page-show');
}

function safeClosePage(el) {
    if (el) el.classList.remove('qaq-page-show');
}

function escapeHTML(str) {
    if (typeof qaqEscapeHtml !== 'undefined') return qaqEscapeHtml(str);
    if (window.qaqEscapeHtml) return window.qaqEscapeHtml(str);
    return String(str || '').replace(/</g, "&lt;");
}

    function qaqGetChatData() {
        return getCache(CHAT_STORE_KEY, {
            contacts: {},
            messages: {},
            globalSettings: {},
            myProfile: { nickname: '我', trueName: '', persona: '', avatar: '' }
        });
    }

    function qaqSaveChatData(data) {
        setCache(CHAT_STORE_KEY, data);
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

    /* ===== 入口函数（供 index.js 直接调用） ===== */
    window.qaqOpenChatPage = function () {
        try {
            var cd = qaqGetChatData();
            // 自动注入一条系统预置的聊天数据
            if (Object.keys(cd.contacts).length === 0) {
                cd.contacts['ai_alice'] = {
                    id: 'ai_alice',
                    nickname: 'Alice',
                    remark: '英语私教',
                    avatar: '',
                    isTop: true,
                    updateTime: Date.now(),
                    configs: { op_persona: '你是一名严肃但温柔的英语口语私教。', op_trans_pos: '气泡内下方', ui_bubble_radius: 14 }
                };
                cd.messages['ai_alice'] = [
                    { id: 1, text: "Let's start your English training for today.", isMe: false, time: Date.now() - 3600000, translated: "让我们开始今天的英语训练吧。" },
                    { id: 2, text: "No problem! I'm ready.", isMe: true, time: Date.now() - 1000 }
                ];
                qaqSaveChatData(cd);
            }
            renderContactList();
            safeSwitchTo(document.getElementById('qaq-chat-main-page'));
        } catch(e) {
            console.error("无法拉起聊天模块:", e);
        }
    };

    /* ===== 页面与按钮绑定 ===== */
    function bindPageEvents() {
        var mainPage = document.getElementById('qaq-chat-main-page');
        var windowPage = document.getElementById('qaq-chat-window-page');
        var settingsPage = document.getElementById('qaq-chat-settings-page');

        // 返回栈
        var mainBack = document.getElementById('qaq-chat-main-back');
        if (mainBack) mainBack.addEventListener('click', function () { safeClosePage(mainPage); });

        var winBack = document.getElementById('qaq-chat-win-back');
        if (winBack) winBack.addEventListener('click', function () { renderContactList(); safeGoBackTo(mainPage, windowPage); });

        var setBack = document.getElementById('qaq-chat-set-back');
        if (setBack) setBack.addEventListener('click', function () { renderMessages(); safeGoBackTo(windowPage, settingsPage); });

        // 打开设置页
        var winSetBtn = document.getElementById('qaq-chat-win-set-btn');
        if (winSetBtn) winSetBtn.addEventListener('click', function () { renderDynamicSettings(); safeSwitchTo(settingsPage); });

        // 发送消息与下拉底栏
        var sendBtn = document.getElementById('qaq-chat-send-btn');
        if (sendBtn) sendBtn.addEventListener('click', sendMyMessage);

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

        var extBtn = document.getElementById('qaq-chat-toggle-menu');
        var extMenu = document.getElementById('qaq-chat-ext-menu');
        if (extBtn && extMenu) {
            extBtn.addEventListener('click', function() {
                extMenu.style.display = extMenu.style.display === 'none' ? 'grid' : 'none';
            });
        }
        
        // 渲染微信风格的底栏快捷功能图标
        var extFeatures = [
            { name: '照片', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { name: '语音通话', icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' },
            { name: '位置', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
            { name: '转账', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
            { name: '剧场', icon: '<polygon points="5 3 19 12 5 21 5 3"/>' },
            { name: '世界书', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
            { name: '日记', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' }
        ];
        
        if (extMenu) {
            extMenu.innerHTML = extFeatures.map(function(item) {
                return '<div class="qaq-ext-item qaq-feat-menu-toast" data-feat="' + item.name + '">' +
                         '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + item.icon + '</svg></div>' +
                         '<div class="qaq-ext-label">' + item.name + '</div>' +
                       '</div>';
            }).join('');
            
            extMenu.querySelectorAll('.qaq-feat-menu-toast').forEach(function(el) {
                el.onclick = function() { safeToast(this.dataset.feat + ' 组件挂载触发点'); };
            });
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

        var defaultAva = 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E';

        arr.forEach(function(c) {
            var msgs = cd.messages[c.id] || [];
            var lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
            var timeStr = lastMsg ? qaqChatFormatTime(lastMsg.time) : '';
            var preview = lastMsg ? (lastMsg.text || '[其他消息]') : '暂无记录';
            var dpName = escapeHTML(c.remark || c.nickname || c.id);

            var item = document.createElement('div');
            item.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            item.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || defaultAva) + '" />' +
                '<div class="qaq-chat-list-info">' +
                    '<div class="qaq-chat-list-top-row">' +
                        '<div class="qaq-chat-list-name">' + dpName + '</div>' +
                        '<div class="qaq-chat-list-time">' + timeStr + '</div>' +
                    '</div>' +
                    '<div class="qaq-chat-list-preview">' + escapeHTML(preview) + '</div>' +
                '</div>';

            item.addEventListener('click', function() { openChatWindow(c.id); });
            listEl.appendChild(item);
        });
    }

    /* ===== 对话窗 ===== */
    function openChatWindow(cid) {
        activeContactId = cid;
        var cd = qaqGetChatData();
        var contact = cd.contacts[cid];
        var s = Object.assign({}, cd.globalSettings || {}, contact.configs || {});

        var titleEl = document.getElementById('qaq-chat-win-title');
        if (titleEl) titleEl.textContent = contact.remark || contact.nickname || '对话';
        
        var recvBtn = document.getElementById('qaq-chat-recv-ai-btn');
        var extBtn = document.getElementById('qaq-chat-toggle-menu');
        if (recvBtn) recvBtn.style.display = s.ui_hide_ai_btn ? 'none' : 'block';
        if (extBtn) extBtn.style.display = s.ui_hide_menu_btn ? 'none' : 'flex';
        
        var mnu = document.getElementById('qaq-chat-ext-menu');
        if(mnu) mnu.style.display = 'none';

        safeSwitchTo(document.getElementById('qaq-chat-window-page'));
        renderMessages();
    }

    function renderMessages() {
        if (!activeContactId) return;
        var cd = qaqGetChatData();
        var msgs = cd.messages[activeContactId] || [];
        var c = cd.contacts[activeContactId];
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {}); 

        var listEl = document.getElementById('qaq-chat-msg-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        var defaultAva = 'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e8e8ec\\'/%3E%3C/svg%3E';
        var html = '';

        msgs.forEach(function(m) {
            var avatar = m.isMe ? (cd.myProfile.avatar || defaultAva) : (c.avatar || defaultAva);
            var avaHtml = '<img class="qaq-chat-bubble-avatar" src="' + avatar + '">';
            if (s.ui_avatar_show === '头像全隐藏(贴边缘)') avaHtml = '';

            var alignClass = m.isMe ? 'qaq-row-me' : 'qaq-row-other';
            var r = s.ui_bubble_radius ? s.ui_bubble_radius : '16'; 
            var radiusStyle = 'style="border-radius:' + r + 'px"'; 
            if(r && !m.isMe) radiusStyle = 'style="border-radius:4px '+r+'px '+r+'px '+r+'px"';
            if(r && m.isMe) radiusStyle = 'style="border-radius:'+r+'px 4px '+r+'px '+r+'px"';
            
            var transLocation = s.op_trans_pos || '气泡内下方'; 
            var transHtml = '', bubTransClass = '';

            if (m.translated && transLocation !== '不显示') {
                transHtml = '<div class="qaq-chat-translation">' + escapeHTML(m.translated) + '</div>';
                if (transLocation === '气泡外下方') bubTransClass = 'qaq-trans-out';
            }

            var bubbleInner = escapeHTML(m.text) + (transLocation === '气泡内下方' ? transHtml : '');
            var bubbleOuter = transLocation === '气泡外下方' ? transHtml : '';

            var colorClass = s.ui_theme_color === '粉色主题' ? 'style="background:#fce8e2"' : 
                             s.ui_theme_color === '苍青主题' ? 'style="background:#c8d8c4"' : '';

            html += 
                '<div class="qaq-chat-row ' + alignClass + '">' +
                    avaHtml +
                    '<div class="qaq-chat-bubble-wrap ' + bubTransClass + '">' +
                        (s.ui_show_time === '显示' ? ('<div class="qaq-chat-msg-time">' + qaqChatFormatTime(m.time) + '</div>') : '') +
                        '<div class="qaq-chat-bubble" ' + radiusStyle + ' ' + (m.isMe ? colorClass : '') + '>' + bubbleInner + '</div>' +
                        bubbleOuter +
                    '</div>' +
                '</div>';
        });
        
        listEl.innerHTML = html;
        setTimeout(function() { listEl.scrollTop = listEl.scrollHeight; }, 50);
    }

    function sendMyMessage() {
        if (!activeContactId) return;
        var box = document.getElementById('qaq-chat-input-box');
        var text = box.value.trim();
        if (!text) return;

        var cd = qaqGetChatData();
        if(!cd.messages[activeContactId]) cd.messages[activeContactId] = [];
        
        cd.messages[activeContactId].push({ id: Date.now(), text: text, isMe: true, time: Date.now(), translated: '' });
        cd.contacts[activeContactId].updateTime = Date.now();
        qaqSaveChatData(cd);

        box.value = '';
        box.style.height = 'auto';
        renderMessages();
    }

    /* ===== 动态重构：展开折叠菜单区 ====== */
    function renderDynamicSettings() {
        var cd = qaqGetChatData();
        var c = cd.contacts[activeContactId] || {};
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
        var p = cd.myProfile;
        var scrollEl = document.getElementById('qaq-chat-settings-scroll');
        if (!scrollEl) return;

        var forms = [
            {
                title: '1. 对方 AI 人设引擎',
                fields: [
                    { k: 'remark', t: 'in', l: '对方真实姓名或备注', v: c.remark || '' },
                    { k: 'avatar_url', t: 'in', l: '角色头像外链 (URL)', v: c.avatar || '' },
                    { k: 'op_persona', t: 'tx', l: '核心骨干 System Prompt (限定它是什么)', v: s.op_persona || '' },
                    { k: 'op_bind_world', t: 'in', l: '挂载外部世界书 (词库ID映射)', v: s.op_bind_world || '' },
                    { k: 'op_allow_emoji', t: 'tg', l: '授权角色使用表情包系统', v: !!s.op_allow_emoji },
                    { k: 'op_auto_msg', t: 'tg', l: '授权角色主动发起消息或日常问候', v: !!s.op_auto_msg },
                    { k: 'op_api_key', t: 'in', l: '专有 API KEY (若为空则调用主平台配置)', v: s.op_api_key || '' },
                    { k: 'op_api_voice', t: 'se', l: '角色声纹库选用', v: s.op_api_voice||'默认系统音', opts:['默认系统音','minimax-shaonv','openai-alloy'] }
                ]
            },
            {
                title: '2. 我方身份与属性伪装',
                fields: [
                    { k: 'my_nick', t: 'in', l: '此回话中的我的特定昵称', v: p.nickname || '' },
                    { k: 'my_true', t: 'in', l: '暴露给AI用于互动的真名', v: p.trueName || '' },
                    { k: 'my_persona', t: 'tx', l: '我的设定背景 / 在这个世界的职阶', v: p.persona || '' }
                ]
            },
            {
                title: '3. 视觉、阅读与美化规则',
                fields: [
                    { k: 'ui_theme_color', t: 'se', l: '我方气泡着色风格 (全局级预设)', v: s.ui_theme_color || '默认原谅绿', opts: ['默认原谅绿','粉色主题','苍青主题'] },
                    { k: 'ui_bubble_radius', t: 'in', l: '覆盖圆润气泡参数 (建议:16)', v: s.ui_bubble_radius || '' },
                    { k: 'op_trans_pos', t: 'se', l: '模型返回的翻译件显示模式', v: s.op_trans_pos || '气泡内下方', opts: ['不显示','气泡内下方','气泡外下方'] },
                    { k: 'ui_avatar_show', t: 'se', l: '全屏头像占位消除规则', v: s.ui_avatar_show || '全部显示', opts: ['全部显示','头像全隐藏(贴边缘)','仅首末条头像(需接管样式)'] },
                    { k: 'ui_show_time', t: 'se', l: '时间戳格式', v: s.ui_show_time || '显示', opts: ['显示','不显示'] },
                    { k: 'ui_hide_ai_btn', t: 'tg', l: '隐藏[AI 回复]快捷拉板，使输入框拉满', v: !!s.ui_hide_ai_btn },
                    { k: 'ui_hide_menu_btn', t: 'tg', l: '隐藏左侧组件加号 [+]，仅依赖聊天', v: !!s.ui_hide_menu_btn },
                    { k: 'cmd_css', t: 'btn', l: '注入开发者覆写高级 CSS 库' }
                ]
            },
            {
                title: '4. 会话上下文摘要机制',
                fields: [
                    { k: 'mem_max', t: 'in', l: '记忆上限条目阈值', v: s.mem_max || '50' },
                    { k: 'mem_summary', t: 'tg', l: '越界时生成阶段剧情总结并植入核表', v: !!s.mem_summary },
                    { k: 'mem_attach_img', t: 'tg', l: '将视觉内容附加入记忆挂载(多模态支持)', v: !!s.mem_attach_img }
                ]
            },
            {
                title: '5. 数据迁移与操作管理',
                fields: [
                    { k: 'op_no_disturb', t: 'tg', l: '屏蔽主动角色午夜提醒打扰模式', v: !!s.op_no_disturb },
                    { k: 'cmd_export', t: 'btn', l: '将本次羁绊完整导出存档(.json)' },
                    { k: 'cmd_clear', t: 'btn', l: '【高危】剥夺该角色的所有的过往交互' },
                    { k: 'cmd_delete_c', t: 'btn', l: '【肃清】摧毁、断开且遗忘此角色链接' }
                ]
            }
        ];

        var buf = '';
        forms.forEach(function(g) {
            buf += 
                '<div class="qaq-chat-setting-card">' +
                    '<div class="qaq-chat-setting-head" onclick="this.parentNode.classList.toggle(\'qaq-expand\')">' +
                        '<span>' + g.title + '</span><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>' +
                    '</div>' +
                    '<div class="qaq-chat-setting-body">';
            g.fields.forEach(function(f) {
                var lab = '<div class="qaq-plan-form-label" style="font-size:11px;color:#888;margin-top:6px;">' + f.l + '</div>';
                if (f.t === 'in') {
                    buf += lab + '<input class="qaq-plan-form-input" id="cfg_' + f.k + '" value="' + f.v + '">';
                } else if (f.t === 'tx') {
                    buf += lab + '<textarea class="qaq-plan-form-textarea" style="height:70px;" id="cfg_' + f.k + '">' + f.v + '</textarea>';
                } else if (f.t === 'se') {
                    var opts = f.opts.map(function(o){ return '<option ' + (o === f.v ? 'selected' : '') + '>' + o + '</option>'; }).join('');
                    buf += lab + '<select class="qaq-plan-form-input" id="cfg_' + f.k + '">' + opts + '</select>';
                } else if (f.t === 'tg') {
                    buf += 
                        '<div class="qaq-settings-item" style="padding:10px 0; border:none;" onclick="this.querySelector(\'.qaq-toggle\').classList.toggle(\'qaq-toggle-on\')">' +
                            '<div class="qaq-settings-item-text" style="font-size:13px;color:#555;">' + f.l + '</div>' +
                            '<div class="qaq-toggle' + (f.v ? ' qaq-toggle-on' : '') + '" id="cfg_' + f.k + '"><div class="qaq-toggle-knob"></div></div>' +
                        '</div>';
                } else if (f.t === 'btn') {
                    var isDanger = f.l.indexOf('【') > -1;
                    buf += '<button class="qaq-import-ghost-btn qaq-chat-feat-btn" data-feat="' + f.l + '" style="margin-top:10px;width:100%;height:38px;padding:0;' + (isDanger ? 'color:#d9534f;border-color:rgba(217,83,79,0.3);' : '') + '">' + f.l + '</button>';
                }
            });
            buf += '</div></div>';
        });
        buf += '<button class="qaq-api-save-btn" id="qaq-chat-save-master" style="width:100%;margin-bottom:20px;height:44px;border-radius:14px;letter-spacing:1px;font-size:14px;">保存并应用到当前角色</button>';
        
        scrollEl.innerHTML = buf;

        // 为自动生成的按钮绑定 toast
        scrollEl.querySelectorAll('.qaq-chat-feat-btn').forEach(function(el){
            el.onclick = function(){ safeToast('功能【' + this.dataset.feat + '】待开发'); };
        });

        // 保存机制
        document.getElementById('qaq-chat-save-master').addEventListener('click', function() {
            var curr = qaqGetChatData();
            function ex(key, isToggle) {
                var el = document.getElementById('cfg_' + key);
                if (!el) return undefined;
                if (isToggle) return el.classList.contains('qaq-toggle-on');
                return el.value;
            }

            var nick = ex('my_nick');
            if (nick !== undefined) curr.myProfile.nickname = nick;
            curr.myProfile.trueName = ex('my_true') || '';
            curr.myProfile.persona = ex('my_persona') || '';

            var rmk = ex('remark');
            if (rmk !== undefined) {
                curr.contacts[activeContactId].remark = rmk;
                document.getElementById('qaq-chat-win-title').textContent = rmk || curr.contacts[activeContactId].nickname;
            }
            var ava = ex('avatar_url');
            if (ava !== undefined) curr.contacts[activeContactId].avatar = ava;

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
            conf.ui_show_time = ex('ui_show_time');
            
            conf.mem_max = ex('mem_max');
            conf.mem_attach_img = ex('mem_attach_img', true);
            conf.mem_summary = ex('mem_summary', true);

            qaqSaveChatData(curr);
            safeToast('人设参数、底层视觉覆写完毕！');
        });
    }

    /* ===== 生命周期初始化 ===== */
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", bindPageEvents);
    } else {
        bindPageEvents();
    }
})();