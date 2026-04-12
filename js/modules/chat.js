/**
 * js/modules/chat.js
 * QAQ - AI学习辅助独立聊天引擎 (通俗化、强化系统提示词版)
 */
(function () {
    'use strict';

    var CHAT_STORE_KEY = 'qaq-chat-store-v3';
    var activeContactId = null;

    /* ===== 数据存取与通用工具 ===== */
    function getCache(key, def) {
        return (typeof qaqCacheGet !== 'undefined') ? qaqCacheGet(key, def) : 
               (window.qaqCacheGet ? window.qaqCacheGet(key, def) : def);
    }
    function setCache(key, val) {
        if (typeof qaqCacheSet !== 'undefined') qaqCacheSet(key, val);
        else if (window.qaqCacheSet) window.qaqCacheSet(key, val);
    }
    
    // 强制使用系统统一 Toast，禁止使用 alert
    function safeToast(msg) {
        if (typeof qaqToast !== 'undefined') qaqToast(msg);
        else if (window.qaqToast) window.qaqToast(msg);
        else console.log("Toast: " + msg); // 降级为 log，不阻断
    }
    
    function safeSwitchTo(el) {
        if (!el) return;
        el.classList.add('qaq-page-show');
        el.style.zIndex = '999';
    }
    function safeGoBackTo(parent, child) {
        if (child) child.classList.remove('qaq-page-show');
        if (parent) parent.classList.add('qaq-page-show');
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
            myProfile: { nickname: 'Learner', trueName: '', persona: '热爱外语学习的学生', avatar: '' }
        });
    }

    function qaqSaveChatData(data) { setCache(CHAT_STORE_KEY, data); }

    function qaqChatFormatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2, '0');
        var m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    }

    /* ===== 核心提示词构建逻辑 (发给 AI 时使用) ===== */
    // 将此处暴露给全局或在调用 API 时获取
    window.qaqBuildChatSystemPrompt = function(contactId) {
        var cd = qaqGetChatData();
        var c = cd.contacts[contactId] || {};
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
        var p = cd.myProfile;
        
        var basePrompt = s.op_persona || "你是我的外语对话导师。";
        
        // 强制格式约束提示词
        var formatConstraint = `
=========================
【核心规则设定】
你现在正在一个外语学习APP内与我交流。请严格遵守以下规则：

1. 角色认知：你的身份是「${escapeHTML(c.remark || c.nickname || 'AI导师')}」。我的名字是「${escapeHTML(p.trueName || p.nickname || '学生')}」。
2. 我的人设设定为：「${escapeHTML(p.persona || '普通学生')}」，在交流中请结合此人设。
3. 语言规范：如果是外语交流，必须符合该外语的地道表达和语法规范，禁止使用中式外语，语句尽量口语化、自然。
`;

        // 根据双语设置添加翻译指令
        var transMode = s.op_trans_pos || 'in_bottom';
        if (transMode !== 'hide') {
            formatConstraint += `
4. 双语输出强制要求：
   无论我说什么语言，你的回复必须采用【特定格式】同时包含【原文(通常是外语)】和【精准的中文翻译】。
   请严禁偏离此格式，请确保不漏掉翻译。
   请采用以下 JSON 格式输出回复（不要输出 markdown 的代码块结构，直接输出合法的 JSON 即可）：
   {
      "original_text": "你的原始回复文本（比如英语）",
      "translation": "对应的中文翻译文本"
   }
`;
        } else {
             formatConstraint += `
4. 语言输出：只用目标外语回复，不需要翻译。
`;
        }

        return basePrompt + "\n" + formatConstraint;
    };


    /* ===== 核心初始化 / 接管器 ===== */
    window.qaqOpenChatPage = function () {
        try {
            var cd = qaqGetChatData();
            if (Object.keys(cd.contacts).length === 0) {
                cd.contacts['ai_tutor'] = {
                    id: 'ai_tutor', nickname: 'Alice', remark: '口语私教', avatar: '',
                    isTop: true, updateTime: Date.now(),
                    configs: { 
                        op_persona: '你是一名专业且温柔的英语外教。', 
                        ui_bubble_radius: 12, ui_avatar_radius: 6, 
                        op_trans_pos: 'in_bottom',
                        ui_my_bubble: '#fed2e0',    /* 默认我方粉色 */
                        ui_other_bubble: '#ffffff'  /* 默认对方白色 */
                    }
                };
                cd.messages['ai_tutor'] = [
                    { id: 1, text: "Welcome! Ready for today's practice?", isMe: false, time: Date.now() - 36000, translated: "欢迎！准备好今天的练习了吗？" },
                ];
                qaqSaveChatData(cd);
            }
            renderContactList();
            safeSwitchTo(document.getElementById('qaq-chat-main-page'));
        } catch(e) { console.error("聊天模块拉起失败:", e); }
    };

    function bindPageEvents() {
        var mainPage = document.getElementById('qaq-chat-main-page');
        var windowPage = document.getElementById('qaq-chat-window-page');
        var settingsPage = document.getElementById('qaq-chat-settings-page');

        document.getElementById('qaq-chat-main-back')?.addEventListener('click', function () { 
            if(mainPage) mainPage.classList.remove('qaq-page-show'); 
        });
        document.getElementById('qaq-chat-win-back')?.addEventListener('click', function () { 
            renderContactList(); safeGoBackTo(mainPage, windowPage); 
        });
        document.getElementById('qaq-chat-set-back')?.addEventListener('click', function () { 
            renderMessages(); safeGoBackTo(windowPage, settingsPage); 
        });
        document.getElementById('qaq-chat-win-set-btn')?.addEventListener('click', function () { 
            renderDynamicSettings(); safeSwitchTo(settingsPage); 
        });

        // Add Contact Popover - 替换为原生自定义弹窗 (qaqOpenModal)
        var topAddBtn = document.getElementById('qaq-chat-top-add-btn');
        if (topAddBtn) {
            topAddBtn.addEventListener('click', function() {
                if (typeof window.qaqOpenModal === 'function') {
                    var mTitle = document.getElementById('qaq-modal-title');
                    var mBody = document.getElementById('qaq-modal-body');
                    var mBtns = document.getElementById('qaq-modal-btns');
                    
                    if(mTitle) mTitle.textContent = '添加新联系人 (AI)';
                    if(mBody) {
                        mBody.innerHTML = `
                            <div class="qaq-inline-input-row">
                                <input type="text" id="qaq-new-contact-name" placeholder="输入角色昵称">
                                <input type="text" id="qaq-new-contact-persona" placeholder="输入一句话设定(如：严厉的法语老师)">
                            </div>
                        `;
                    }
                    if(mBtns) {
                        mBtns.innerHTML = `
                            <button class="qaq-inline-cancel" id="qaq-modal-cancel">取消</button>
                            <button class="qaq-inline-ok" id="qaq-modal-confirm-add">添加</button>
                        `;
                    }
                    window.qaqOpenModal();
                    
                    document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
                    document.getElementById('qaq-modal-confirm-add').onclick = function() {
                        var cName = document.getElementById('qaq-new-contact-name').value.trim() || '未知角色';
                        var cPersona = document.getElementById('qaq-new-contact-persona').value.trim() || '一名普通的交谈对象';
                        
                        var cd = qaqGetChatData();
                        var newId = 'ai_' + Date.now();
                        cd.contacts[newId] = {
                            id: newId, nickname: cName, remark: cName, avatar: '',
                            isTop: false, updateTime: Date.now(),
                            configs: { op_persona: `扮演：${cPersona}` }
                        };
                        qaqSaveChatData(cd);
                        renderContactList();
                        safeToast(`已成功添加角色「${cName}」`);
                        window.qaqCloseModal();
                    };
                } else {
                    safeToast('弹窗组件未就绪');
                }
            });
        }

        document.getElementById('qaq-chat-send-btn')?.addEventListener('click', sendMyMessage);
        var inputBox = document.getElementById('qaq-chat-input-box');
        if (inputBox) {
            inputBox.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMyMessage(); }
            });
        }
        
        var extBtn = document.getElementById('qaq-chat-toggle-menu');
        var extMenu = document.getElementById('qaq-chat-ext-menu');
        if (extBtn && extMenu) {
            extBtn.addEventListener('click', function() {
                extMenu.style.display = extMenu.style.display === 'none' ? 'grid' : 'none';
            });
        }
        renderExtMenu();
    }

    /* ===== 菜单栏扩展功能 ===== */
    function renderExtMenu() {
        var mnu = document.getElementById('qaq-chat-ext-menu');
        if (!mnu) return;
        var feats = [
            { n: '表情', i: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>' },
            { n: '语音', i: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>' },
            { n: '照片', i: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { n: '位置', i: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
        ];
        mnu.innerHTML = feats.map(function(f) {
            return '<div class="qaq-ext-item qaq-ext-action" data-ft="'+f.n+'">' +
                     '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + f.i + '</svg></div>' +
                     '<div class="qaq-ext-label">' + f.n + '</div>' +
                   '</div>';
        }).join('');
        mnu.querySelectorAll('.qaq-ext-action').forEach(function(el){
            el.onclick = function(){ safeToast(this.dataset.ft + '功能开发中'); };
        });
    }

    /* ===== 联系人列表 ===== */
    function renderContactList() {
        var cd = qaqGetChatData();
        var listEl = document.getElementById('qaq-chat-contact-list');
        if (!listEl) return;
        
        var arr = Object.keys(cd.contacts).map(function(k) { return cd.contacts[k]; });
        arr.sort(function(a,b) {
            if(a.isTop !== b.isTop) return a.isTop ? -1 : 1;
            return (b.updateTime || 0) - (a.updateTime || 0);
        });

        if (!arr.length) {
            listEl.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px;">没有消息记录，点击右上角加号发起新聊天</div>';
            return;
        }

        var dAva = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
        listEl.innerHTML = '';
        arr.forEach(function(c) {
            var s = c.configs || {};
            var msgs = cd.messages[c.id] || [];
            var lst = msgs.length ? msgs[msgs.length - 1] : null;
            var tStr = lst ? qaqChatFormatTime(lst.time) : '';
            var rRadius = s.ui_avatar_radius !== undefined ? s.ui_avatar_radius : 8; 
            
            var div = document.createElement('div');
            div.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            div.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || dAva) + '" style="border-radius:'+rRadius+'px;"/>' +
                '<div class="qaq-chat-list-info">' +
                    '<div class="qaq-chat-list-top-row">' +
                        '<div class="qaq-chat-list-name">' + escapeHTML(c.remark || c.nickname || c.id) + '</div>' +
                        '<div class="qaq-chat-list-time">' + tStr + '</div>' +
                    '</div>' +
                    '<div class="qaq-chat-list-preview">' + escapeHTML(lst ? (lst.text||'[内容]') : '还没发过消息哦') + '</div>' +
                '</div>';
            div.onclick = function() { openChatWindow(c.id); };
            listEl.appendChild(div);
        });
    }

    /* ===== 对话界面流 ===== */
    function openChatWindow(cid) {
        activeContactId = cid;
        var cd = qaqGetChatData();
        var c = cd.contacts[cid];
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});

        var tEl = document.getElementById('qaq-chat-win-title');
        if (tEl) tEl.textContent = c.remark || c.nickname;
        
        // 动态将主题颜色注入 css 变量
        var rMyBub = s.ui_my_bubble || '#fce8e2'; // 我方粉色
        var rOthBub = s.ui_other_bubble || '#ffffff'; // 对方白色
        document.documentElement.style.setProperty('--chat-my-bubble', rMyBub);
        document.documentElement.style.setProperty('--chat-other-bubble', rOthBub);

        var rBtn = document.getElementById('qaq-chat-recv-ai-btn');
        var mBtn = document.getElementById('qaq-chat-toggle-menu');
        if(rBtn) rBtn.style.display = s.ui_hide_rbtn ? 'none' : 'block';
        if(mBtn) mBtn.style.display = s.ui_hide_mbtn ? 'none' : 'flex';
        
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
        
        var dAva = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
        var rRadius = s.ui_avatar_radius !== undefined ? s.ui_avatar_radius : 8; 
        var bubR = s.ui_bubble_radius !== undefined ? s.ui_bubble_radius : 14; 
        var fSz = s.ui_font_size || '14px';

        var html = '';
        msgs.forEach(function(m, idx) {
            var isMe = m.isMe;
            var avaUrl = isMe ? (cd.myProfile.avatar || dAva) : (c.avatar || dAva);
            var avaHtml = '<img class="qaq-chat-bubble-avatar" src="' + escapeHTML(avaUrl) + '" style="border-radius:'+rRadius+'px;">';
            
            if (s.ui_avatar_show === 'hide_all') avaHtml = '';
            else if (s.ui_avatar_show === 'first' && idx !== 0) avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            else if (s.ui_avatar_show === 'last' && idx !== msgs.length - 1) avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            
            var bubRadiusStyle = isMe ? `border-radius:${bubR}px 2px ${bubR}px ${bubR}px` 
                                      : `border-radius:2px ${bubR}px ${bubR}px ${bubR}px`;

            var transPos = s.op_trans_pos || 'in_bottom';
            var trInner = '', trOuter = '';
            if (m.translated && transPos !== 'hide') {
                var th = '<div class="qaq-chat-trans" style="font-size:'+(parseInt(fSz)-2)+'px">' + escapeHTML(m.translated) + '</div>';
                if(transPos.indexOf('in')>-1) trInner = th; else trOuter = th;
            }
            
            var bIn = escapeHTML(m.text) + trInner;
            if(transPos === 'in_top') bIn = trInner + escapeHTML(m.text);

            var tStr = s.ui_show_time === 'true' ? `<div class="qaq-chat-msg-time">${qaqChatFormatTime(m.time)}</div>` : '';
            var alg = isMe ? 'qaq-row-me' : 'qaq-row-other';
            
            html += `
                <div class="qaq-chat-row ${alg}">
                    ${avaHtml}
                    <div class="qaq-chat-bubble-wrap ${transPos.indexOf('out')>-1?'qaq-has-outer-tr':''}">
                        ${tStr}
                        <div class="qaq-chat-bubble" style="${bubRadiusStyle}; font-size:${fSz};">
                            ${bIn}
                        </div>
                        ${trOuter}
                    </div>
                </div>`;
        });
        
        listEl.innerHTML = html;
        setTimeout(function() { listEl.scrollTop = listEl.scrollHeight; }, 10);
    }

    function sendMyMessage() {
        if (!activeContactId) return;
        var box = document.getElementById('qaq-chat-input-box');
        if (!box) return;
        var txt = box.value.trim();
        if (!txt) return;

        var cd = qaqGetChatData();
        if(!cd.messages[activeContactId]) cd.messages[activeContactId] = [];
        cd.messages[activeContactId].push({ id: Date.now(), text: txt, isMe: true, time: Date.now(), translated: '' });
        cd.contacts[activeContactId].updateTime = Date.now();
        qaqSaveChatData(cd);

        box.value = '';
        renderMessages();
    }

    /* ===== 设置与配置大集束引擎 (文案均已通俗化) ===== */
    function renderDynamicSettings() {
        var cd = qaqGetChatData();
        var cid = activeContactId;
        var c = cd.contacts[cid] || {};
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
        var p = cd.myProfile;
        
        var scr = document.getElementById('qaq-chat-settings-scroll');
        if (!scr) return;

        var groups = [
            {
                t: '对方设置', // 1
                f: [
                    { k: 'remark', l: '备注名', v: c.remark||'', ph: '输入备注名称', ty: 'text' },
                    { k: 'avatar', l: '对方头像链接 (URL)', v: c.avatar||'', ty: 'text' },
                    { k: 'c_persona', l: 'TA的人设或身份提示词 (System)', v: s.op_persona||'', ty: 'area', h: 80 },
                    { k: 'c_world', l: '绑定本地世界书 (填名称)', v: s.op_bind_world||'', ty: 'text' },
                    { k: 'c_trans_mode', l: '翻译文本显示位置', v: s.op_trans_pos||'in_bottom', ty: 'sel', opts:[{l:'气泡内底部',v:'in_bottom'},{l:'气泡内顶部',v:'in_top'},{l:'气泡外部底部',v:'out_bottom'},{l:'关闭双语翻译',v:'hide'}] },
                    { k: 'c_mem_cnt', l: '记忆历史消息条数', v: s.mem_max||20, ty: 'num' },
                    { k: 'c_mem_auto', l: '历史记录过多时自动生成大纲', v: s.mem_summary, ty: 'switch' }
                ]
            },
            {
                t: '我的设置', // 2
                f: [
                    { k: 'm_nick', l: '我当前的网名', v: p.nickname||'', ty: 'text' },
                    { k: 'm_true', l: '我的真实姓名 (告诉AI)', v: p.trueName||'', ty: 'text' },
                    { k: 'm_persona', l: '我的人设 / 背景', v: p.persona||'', ty: 'area', h:60 },
                    { k: 'm_avatar', l: '我的头像链接 (URL)', v: p.avatar||'', ty: 'text' }
                ]
            },
            {
                t: '界面美化', // 3
                f: [
                    { k: 'u_my_bub', l: '我发出的气泡颜色', v: s.ui_my_bubble||'#fce8e2', ty: 'sel', opts:[{l:'默认粉白',v:'#fce8e2'},{l:'原生青绿',v:'#b8dfbf'},{l:'冷光蓝',v:'#cce0d4'},{l:'经典白',v:'#ffffff'}] },
                    { k: 'u_oth_bub', l: 'TA发出的气泡颜色', v: s.ui_other_bubble||'#ffffff', ty: 'sel', opts:[{l:'经典白',v:'#ffffff'},{l:'淡雾灰',v:'#f4f5f7'},{l:'柔和黄',v:'#fdfaec'}] },
                    { k: 'u_bub_r', l: '气泡圆角弯度 (数字)', v: s.ui_bubble_radius||14, ty: 'num' },
                    { k: 'u_ava_r', l: '头像圆角弯度 (数字)', v: s.ui_avatar_radius||8, ty: 'num' },
                    { k: 'u_ava_m', l: '头像显示偏好', v: s.ui_avatar_show||'all', ty: 'sel', opts:[{l:'全部显示',v:'all'},{l:'仅显示气泡首段',v:'first'},{l:'仅显示气泡末尾段',v:'last'},{l:'隐藏头像',v:'hide_all'}] },
                    { k: 'u_time_s', l: '聊天界面显示时间', v: s.ui_show_time||'true', ty: 'switch' },
                    { k: 'u_hide_r', l: '隐藏底部[AI回]按钮', v: !!s.ui_hide_rbtn, ty: 'switch' },
                    { k: 'u_hide_m', l: '隐藏底部侧边[+]按钮', v: !!s.ui_hide_mbtn, ty: 'switch' },
                    { k: 'u_font_s', l: '气泡文本大小', v: s.ui_font_size||'14px', ty: 'sel', opts:[{l:'小 (13px)',v:'13px'},{l:'标准 (14px)',v:'14px'},{l:'大 (16px)',v:'16px'}] }
                ]
            }
        ];

        var ht = '';
        groups.forEach(function(g) {
            ht += '<div class="qaq-chat-set-card"><div class="qaq-chat-set-hd" onclick="this.parentElement.classList.toggle(\'qaq-open\')"><span>'+g.t+'</span></div><div class="qaq-chat-set-bd">';
            g.f.forEach(function(i) {
                var lab = '<div class="qaq-chat-set-lbl">' + i.l + '</div>';
                if (i.ty === 'text' || i.ty === 'pwd' || i.ty === 'num') {
                    var tg = i.ty==='pwd'?'password':(i.ty==='num'?'number':'text');
                    ht += lab + '<input type="'+tg+'" class="qaq-chat-set-inp" id="chs_'+i.k+'" value="'+escapeHTML(i.v)+'" placeholder="'+(i.ph||'')+'">';
                } else if (i.ty === 'area') {
                    ht += lab + '<textarea class="qaq-chat-set-txt" id="chs_'+i.k+'" style="height:'+(i.h||60)+'px">'+escapeHTML(i.v)+'</textarea>';
                } else if (i.ty === 'switch') {
                    ht += '<div class="qaq-chat-set-row-tog" onclick="this.querySelector(\'.qaq-toggle\').classList.toggle(\'qaq-toggle-on\')">' +
                            '<span style="font-size:12px;color:#555;">'+i.l+'</span><div class="qaq-toggle '+(i.v?'qaq-toggle-on':'')+'" id="chs_'+i.k+'"><div class="qaq-toggle-knob"></div></div></div>';
                } else if (i.ty === 'sel') {
                    var ops = i.opts.map(function(o){ return '<option value="'+o.v+'" '+(o.v===i.v?'selected':'')+'>'+o.l+'</option>'; }).join('');
                    ht += lab + '<select class="qaq-chat-set-inp" id="chs_'+i.k+'">'+ops+'</select>';
                } 
            });
            ht += '</div></div>';
        });
        
        ht += '<button class="qaq-chat-set-save" id="qaq-chs-sv">保存设置 (返回聊天界面生效)</button>';
        scr.innerHTML = ht;

        // 保存逻辑
        document.getElementById('qaq-chs-sv').addEventListener('click', function(){
            function vx(id, isT){ 
                var x = document.getElementById('chs_'+id); 
                return x ? (isT ? x.classList.contains('qaq-toggle-on') : x.value) : undefined;
            }
            
            var mN = vx('m_nick'); if(mN!==undefined) cd.myProfile.nickname = mN;
            var mT = vx('m_true'); if(mT!==undefined) cd.myProfile.trueName = mT;
            var mP = vx('m_persona'); if(mP!==undefined) cd.myProfile.persona = mP;
            var mAva = vx('m_avatar'); if(mAva!==undefined) cd.myProfile.avatar = mAva;

            var crk = vx('remark');
            if(crk!==undefined) {
                c.remark = crk;
                var el=document.getElementById('qaq-chat-win-title'); 
                if(el) el.textContent = crk || c.nickname;
            }
            var cav = vx('avatar'); if(cav!==undefined) c.avatar = cav;

            s.op_persona = vx('c_persona');
            s.op_bind_world = vx('c_world');
            s.op_trans_pos = vx('c_trans_mode');
            s.mem_max = vx('c_mem_cnt');
            s.mem_summary = vx('c_mem_auto', true);
            
            s.ui_my_bubble = vx('u_my_bub');
            s.ui_other_bubble = vx('u_oth_bub');
            s.ui_bubble_radius = vx('u_bub_r');
            s.ui_avatar_radius = vx('u_ava_r');
            s.ui_avatar_show = vx('u_ava_m');
            s.ui_show_time = vx('u_time_s', true)?'true':'false';
            s.ui_hide_rbtn = vx('u_hide_r', true);
            s.ui_hide_mbtn = vx('u_hide_m', true);
            s.ui_font_size = vx('u_font_s');

            c.configs = s;
            qaqSaveChatData(cd);
            safeToast('聊天设定已保存。');
            
            // 返回页面重新渲染
            document.getElementById('qaq-chat-set-back').click();
        });
    }

    if (document.readyState === 'loading') { document.addEventListener("DOMContentLoaded", bindPageEvents); } 
    else { bindPageEvents(); }
})();