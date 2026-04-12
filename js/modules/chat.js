/**
 * js/modules/chat.js
 * QAQ - AI学习辅助独立聊天引擎 (完美界面渲染级 / 提示词铁腕限定)
 */
(function () {
    'use strict';

    var CHAT_STORE_KEY = 'qaq-chat-store-v4';
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
    
    // 我们在此不调用浏览器原生丑弹窗，只用美化 Toast
    function safeToast(msg) {
        if (typeof qaqToast !== 'undefined') qaqToast(msg);
        else if (window.qaqToast) window.qaqToast(msg);
        else console.log(msg);
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
            myProfile: { nickname: '学生', trueName: '', persona: '正在全力攻克外语考试的学习者', avatar: '' }
        });
    }

    function qaqSaveChatData(data) { setCache(CHAT_STORE_KEY, data); }

    function qaqChatFormatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2, '0');
        var m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    }


    /* ========================================================
       极其关键：送给核心调用层的聊天 System Prompt 生成 🛠️
       (当请求 AI API 时，将其作为 System 的角色前置背景下发)
       ======================================================== */
    window.qaqBuildChatSystemPrompt = function(contactId) {
        var cd = qaqGetChatData();
        var c = cd.contacts[contactId] || {};
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
        var p = cd.myProfile;
        
        // ① 基底人设组合
        var basePrompt = s.op_persona || "你是我的高级外教陪练导师。";
        
        // ② 格式和铁血纪律（防止AI不按格式发文）
        var formatConstraint = `
[严重指令优先级最高] 这是一个专业的外语陪伴学习端。
* 你的当前角色代称是「${escapeHTML(c.remark || c.nickname || 'AI导师')}」。
* 而我是「${escapeHTML(p.trueName || p.nickname || '学生')}」，我是一个：${escapeHTML(p.persona || '普通的语言学习者')}。 
(切勿搞混对方名字)
* 语言纯正：如果对话是外语（如英语等），请严格运用母语者口吻语境地道发声，绝不允许说散装洋泾浜！不要带有机器的僵硬感。
`;

        // ③ 翻译切割判定
        var transMode = s.op_trans_pos || 'in_bottom';
        if (transMode !== 'hide') {
            formatConstraint += `
* 双向结构返回规章（双语全自动补全翻译）：
无论我说什么语言，你的响应「永远只能」是一个绝对规整纯净的 JSON 解析体（不要携带任何额外的 Markdown\`\`\` 修饰前后缀）。结构如下：
{
  "original_text": "【此处存放你要对我说的原文内容(外文为主)】",
  "translation": "【此处存放你对上一句原文精心推敲过后的信达雅中文译文】"
}
记住：如果你无法翻译，就在 translation 内置空字符串，但此格式不可打破！
`;
        } else {
             formatConstraint += `\n* 响应指示：本模式不允许中文释义渗入，请完全用我的目标进修语种和我沟通，请不要返回JSON，当做平常聊天返回纯文本。\n`;
        }

        return basePrompt + "\n" + formatConstraint;
    };


    /* ===== 核心页面唤起流 ===== */
    window.qaqOpenChatPage = function () {
        try {
            var cd = qaqGetChatData();
            if (Object.keys(cd.contacts).length === 0) {
                // 如果空，就送一个陪伴样例
                cd.contacts['ai_tutor'] = {
                    id: 'ai_tutor', nickname: 'Alice', remark: '外语陪练员 Alice', avatar: '',
                    isTop: true, updateTime: Date.now(),
                    configs: { 
                        op_persona: '你是一名极其开朗且平易近人的金牌英语外教。', 
                        ui_bubble_radius: 12, ui_avatar_radius: 8, 
                        op_trans_pos: 'in_bottom',
                        ui_my_bubble: '#b8dfbf',    // 原生青绿
                        ui_other_bubble: '#ffffff'  // 常规白色
                    }
                };
                cd.messages['ai_tutor'] = [
                    { id: 1, text: "I'm always by your side! What are we going to practice today?", isMe: false, time: Date.now() - 36000, translated: "我会一直陪在你身旁的！今天咱们想怎么练习呢？" },
                ];
                qaqSaveChatData(cd);
            }
            renderContactList();
            safeSwitchTo(document.getElementById('qaq-chat-main-page'));
        } catch(e) { console.error(e); }
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

    // ============================================
    // 极其彻底改造右上角加号：仿微信级强悬浮气泡菜单 💬
    // ============================================
    var topAddBtn = document.getElementById('qaq-chat-top-add-btn');
    if (topAddBtn && mainPage) {
        
        // 1. 动态将气泡菜单插入在底层之上（摆脱任何 Modal 层级掩盖恶疾）
        var popMenu = document.createElement('div');
        popMenu.className = 'qaq-chat-pop-menu';
        popMenu.innerHTML = `
            <div class="qaq-chat-pop-item" id="qaq-chat-add-friend-act">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg> 添加陪练 AI
            </div>
            <div class="qaq-chat-pop-item" id="qaq-chat-add-group-act">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path></svg> 发起群聊
            </div>
        `;
        mainPage.appendChild(popMenu);

        // 2. 为了绝对防止被盖在底下，亲自植入独立最高 Z-index 极净弹窗来处理逻辑
        var hardMask = document.createElement('div'); hardMask.className = 'qaq-chat-hard-modal-mask'; mainPage.appendChild(hardMask);
        var hardModal = document.createElement('div'); hardModal.className = 'qaq-chat-hard-modal';
        hardModal.innerHTML = `
            <div style="font-size:16px; font-weight:700; margin-bottom:18px; text-align:center;">创造并调频新伙伴</div>
            <div class="qaq-inline-input-row" style="gap:14px; margin-bottom: 24px;">
                <div><div style="font-size:12px;color:#888;margin-bottom:6px;">联络假名设定：</div><input type="text" id="qaq-chat-hard-name" placeholder="例：雅思雅思死啦死啦"></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:6px;">他在潜意识里的系统底色：</div><input type="text" id="qaq-chat-hard-persona" placeholder="例：毒舌且阴阳怪气的考官"></div>
            </div>
            <div class="qaq-inline-btns">
                <button class="qaq-inline-cancel" id="qaq-chat-hard-ccl">罢休</button>
                <button class="qaq-inline-ok" id="qaq-chat-hard-cfm">注入网络并激活</button>
            </div>
        `;
        mainPage.appendChild(hardModal);

        // 互相呼应控制开合
        topAddBtn.addEventListener('click', function(e){ e.stopPropagation(); popMenu.classList.toggle('qaq-show'); });
        mainPage.addEventListener('click', function(){ popMenu.classList.remove('qaq-show'); });

        // 仅当没完成的功能进行 Toast
        document.getElementById('qaq-chat-add-group-act').addEventListener('click', function(e){
            e.stopPropagation(); popMenu.classList.remove('qaq-show'); safeToast('暂未开放多 AI 杂交群聊哦。');
        });

        // "添加好友"的核心呼入逻辑 
        document.getElementById('qaq-chat-add-friend-act').addEventListener('click', function(e){
            e.stopPropagation(); popMenu.classList.remove('qaq-show');
            hardMask.classList.add('qaq-show'); hardModal.classList.add('qaq-show');
            document.getElementById('qaq-chat-hard-name').value = ''; document.getElementById('qaq-chat-hard-persona').value = '';
        });
        function closeHard() { hardMask.classList.remove('qaq-show'); hardModal.classList.remove('qaq-show'); }
        hardMask.addEventListener('click', closeHard);
        document.getElementById('qaq-chat-hard-ccl').addEventListener('click', closeHard);
        
        document.getElementById('qaq-chat-hard-cfm').addEventListener('click', function(){
            var cName = document.getElementById('qaq-chat-hard-name').value.trim() || '不具名的神秘陪读';
            var cPersona = document.getElementById('qaq-chat-hard-persona').value.trim() || '我是一名专业的高效学习交流助理。';
            
            var cd = qaqGetChatData();
            var newId = 'ai_' + Date.now();
            cd.contacts[newId] = {
                id: newId, nickname: cName, remark: cName, avatar: '', isTop: false, updateTime: Date.now(),
                configs: { op_persona: `从此刻起你饰演这个人设基底：\n${cPersona}` }
            };
            qaqSaveChatData(cd);
            renderContactList();
            safeToast(`通道已建立：新信号源「${cName}」被捕获！`);
            closeHard();
        });
    }

    // ================== 发送与发送状态栏监听机制保留不动 ==================
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

    /* ===== 左侧抽屉菜单伪展开区 ===== */
    function renderExtMenu() {
        var mnu = document.getElementById('qaq-chat-ext-menu');
        if (!mnu) return;
        var feats = [
            { n: '照片', i: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { n: '听译', i: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>' },
            { n: '文章纠错', i: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
            { n: '情境剧场', i: '<polygon points="5 3 19 12 5 21 5 3"/>' }
        ];
        mnu.innerHTML = feats.map(function(f) {
            return '<div class="qaq-ext-item qaq-ext-action" data-ft="'+f.n+'">' +
                     '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + f.i + '</svg></div>' +
                     '<div class="qaq-ext-label">' + f.n + '</div>' +
                   '</div>';
        }).join('');
        mnu.querySelectorAll('.qaq-ext-action').forEach(function(el){
            el.onclick = function(){ safeToast(this.dataset.ft + ' 即将落地。敬请期待！'); };
        });
    }


    /* ===== 外联总表 ===== */
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
            listEl.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px;">频道空旷，点击右上方按键呼叫一个伴读来此吧</div>';
            return;
        }

        var dAva = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
        listEl.innerHTML = '';
        arr.forEach(function(c) {
            var s = c.configs || {};
            var msgs = cd.messages[c.id] || [];
            var lst = msgs.length ? msgs[msgs.length - 1] : null;
            var tStr = lst ? qaqChatFormatTime(lst.time) : '';
            var rRadius = s.ui_avatar_radius !== undefined ? s.ui_avatar_radius : 10; 
            
            var div = document.createElement('div');
            div.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            div.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || dAva) + '" style="border-radius:'+rRadius+'px;"/>' +
                '<div class="qaq-chat-list-info">' +
                    '<div class="qaq-chat-list-top-row">' +
                        '<div class="qaq-chat-list-name">' + escapeHTML(c.remark || c.nickname || c.id) + '</div>' +
                        '<div class="qaq-chat-list-time">' + tStr + '</div>' +
                    '</div>' +
                    '<div class="qaq-chat-list-preview">' + escapeHTML(lst ? (lst.text||'[图片/系统片段]') : '静静地等候着您的问候') + '</div>' +
                '</div>';
            div.onclick = function() { openChatWindow(c.id); };
            listEl.appendChild(div);
        });
    }

    /* ===== 对话界面流机制 ===== */
    function openChatWindow(cid) {
        activeContactId = cid;
        var cd = qaqGetChatData();
        var c = cd.contacts[cid];
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});

        var tEl = document.getElementById('qaq-chat-win-title');
        if (tEl) tEl.textContent = c.remark || c.nickname;
        
        // 关键视觉联动 (主题约束化 CSS Variables 注入全局)
        var myC = s.ui_my_bubble || '#fce8e2';
        var otC = s.ui_other_bubble || '#ffffff';
        document.documentElement.style.setProperty('--chat-my-bub', myC);
        document.documentElement.style.setProperty('--chat-oth-bub', otC);

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
        var rRadius = s.ui_avatar_radius !== undefined ? s.ui_avatar_radius : 10; 
        var bubR = s.ui_bubble_radius !== undefined ? s.ui_bubble_radius : 14; 
        var fSz = s.ui_font_size || '14px';

        var html = '';
        msgs.forEach(function(m, idx) {
            var isMe = m.isMe;
            var avaUrl = isMe ? (cd.myProfile.avatar || dAva) : (c.avatar || dAva);
            
            var avaHtml = '<img class="qaq-chat-bubble-avatar" src="' + escapeHTML(avaUrl) + '" style="border-radius:'+rRadius+'px;">';
            if (s.ui_avatar_show === 'hide_all') {
                avaHtml = '';
            } else if (s.ui_avatar_show === 'first' && idx !== 0) {
                avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            } else if (s.ui_avatar_show === 'last' && idx !== msgs.length - 1) {
                avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            }
            
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


    /* ===== 【深度通俗化设置表单映射核心体系 - 完全重构版】 ===== */
function renderDynamicSettings() {
    var cd = qaqGetChatData();
    var cid = activeContactId;
    var c = cd.contacts[cid] || {};
    var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
    var p = cd.myProfile;
    
    var scr = document.getElementById('qaq-chat-settings-scroll');
    if (!scr) return;

    // 图标SVG库
    var icons = {
        user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>',
        palette: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/>',
        message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
    };

    function ico(name) {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + (icons[name] || '') + '</svg>';
    }

    // 折叠栏配置
    var sections = [
        {
            id: 'other', title: '对方设置', icon: 'user',
            fields: [
                { k: 'o_avatar', l: '头像URL', v: c.avatar||'', ty: 'text' },
                { k: 'o_nickname', l: '昵称', v: c.nickname||'', ty: 'text' },
                { k: 'o_remark', l: '备注真实名字', v: c.remark||'', ty: 'text' },
                { k: 'o_persona', l: '具体人设', v: s.op_persona||'', ty: 'area', h: 60 },
                { k: 'o_worldbook', l: '绑定的世界书ID', v: s.o_worldbook||'', ty: 'text' },
                { k: 'o_emoji', l: '主动发表情包', v: !!s.o_emoji, ty: 'switch' },
                { k: 'o_trans_enable', l: '双语翻译功能', v: s.o_trans_enable!==false, ty: 'switch' },
                { k: 'o_trans_pos', l: '翻译显示模式', v: s.op_trans_pos||'in_bottom', ty: 'sel', opts:[
                    {l:'气泡内下方',v:'in_bottom'},{l:'气泡内上方',v:'in_top'},
                    {l:'气泡外下方',v:'out_bottom'},{l:'气泡外上方',v:'out_top'},{l:'隐藏',v:'hide'}
                ]},
                { k: 'o_mem_max', l: '最大记忆条数', v: s.mem_max||20, ty: 'num' },
                { k: 'o_mem_group', l: '挂载群聊记忆', v: !!s.o_mem_group, ty: 'switch' },
                { k: 'o_mem_video', l: '挂载视频通话记忆', v: !!s.o_mem_video, ty: 'switch' },
                { k: 'o_mem_voice', l: '挂载语音通话记忆', v: !!s.o_mem_voice, ty: 'switch' },
                { k: 'o_mem_offline', l: '挂载线下记忆', v: !!s.o_mem_offline, ty: 'switch' },
                { k: 'o_mem_summary', l: '总结记忆功能', v: !!s.o_mem_summary, ty: 'switch' },
                { k: 'o_mem_summary_cnt', l: '总结条数', v: s.o_mem_summary_cnt||50, ty: 'num' },
                { k: 'o_allow_video', l: '允许主动发起视频通话', v: !!s.o_allow_video, ty: 'switch' },
                { k: 'o_allow_voice', l: '允许主动发起语音通话', v: !!s.o_allow_voice, ty: 'switch' },
                { k: 'o_allow_msg', l: '允许主动发送消息', v: !!s.o_allow_msg, ty: 'switch' },
                { k: 'o_msg_interval', l: '消息间隔(分钟)', v: s.o_msg_interval||30, ty: 'num' },
                { k: 'o_allow_block', l: '允许角色拉黑用户', v: !!s.o_allow_block, ty: 'switch' },
                { k: 'o_allow_delete', l: '允许角色删除用户', v: !!s.o_allow_delete, ty: 'switch' },
                { k: 'o_allow_diary', l: '允许主动生成日记', v: !!s.o_allow_diary, ty: 'switch' },
                { k: 'o_api_url', l: '专属API URL', v: s.o_api_url||'', ty: 'text', ph: '留空使用全局' },
                { k: 'o_api_key', l: '专属API Key', v: s.o_api_key||'', ty: 'pwd' },
                { k: 'o_api_model', l: '专属模型', v: s.o_api_model||'', ty: 'text', hasBtn: 'fetch_model' },
                { k: 'o_voice_url', l: '语音API URL', v: s.o_voice_url||'', ty: 'text' },
                { k: 'o_voice_key', l: '语音API Key', v: s.o_voice_key||'', ty: 'pwd' },
                { k: 'o_voice_model', l: '语音模型', v: s.o_voice_model||'speech-02-hd', ty: 'sel', opts:[
                    {l:'speech-02-hd',v:'speech-02-hd'},{l:'speech-02-turbo',v:'speech-02-turbo'},
                    {l:'speech-2.8-hd',v:'speech-2.8-hd'},{l:'speech-01-turbo',v:'speech-01-turbo'}
                ]},
                { k: 'o_voice_speed', l: '语速(0.6-1.2)', v: s.o_voice_speed||0.9, ty: 'num', step: 0.1, min: 0.6, max: 1.2 },
                { k: 'o_img_url', l: '生图API URL', v: s.o_img_url||'', ty: 'text' },
                { k: 'o_img_key', l: '生图API Key', v: s.o_img_key||'', ty: 'pwd' },
                { k: 'o_img_model', l: '生图模型', v: s.o_img_model||'', ty: 'text' },
                { k: 'o_img_prompt', l: '生图提示词', v: s.o_img_prompt||'', ty: 'area', h: 50 }
            ]
        },
        {
            id: 'my', title: '我方设置', icon: 'user',
            fields: [
                { k: 'm_avatar', l: '我的头像URL', v: p.avatar||'', ty: 'text' },
                { k: 'm_nickname', l: '我的昵称', v: p.nickname||'', ty: 'text' },
                { k: 'm_truename', l: '我的真名', v: p.trueName||'', ty: 'text' },
                { k: 'm_persona', l: '我的人设', v: p.persona||'', ty: 'area', h: 60 },
                { k: 'm_preset', l: '人设预设', v: s.m_preset||'default', ty: 'sel', opts:[
                    {l:'默认学习者',v:'default'},{l:'考研党',v:'postgrad'},{l:'雅思备考',v:'ielts'},
                    {l:'托福备考',v:'toefl'},{l:'四六级',v:'cet'},{l:'自定义',v:'custom'}
                ]}
            ]
        },
        {
            id: 'ui', title: '美化设置', icon: 'palette',
            fields: [
                { k: 'u_my_bubble', l: '我的气泡颜色', v: s.ui_my_bubble||'#fce8e2', ty: 'sel', opts:[
                    {l:'蜜桃粉',v:'#fce8e2'},{l:'青绿',v:'#b8dfbf'},{l:'冷光银',v:'#dce4f0'},
                    {l:'纯白',v:'#ffffff'},{l:'纯黑',v:'#111111'}
                ]},
                { k: 'u_other_bubble', l: '对方气泡颜色', v: s.ui_other_bubble||'#ffffff', ty: 'sel', opts:[
                    {l:'自然白',v:'#ffffff'},{l:'霜白灰',v:'#f4f5f7'},{l:'淡茶黄',v:'#fdfaec'}
                ]},
                { k: 'u_theme', l: '主题颜色', v: s.u_theme||'default', ty: 'sel', opts:[
                    {l:'默认',v:'default'},{l:'冷雾',v:'cool'},{l:'夜幕',v:'dark'}
                ]},
                { k: 'u_avatar_show', l: '头像显示', v: s.ui_avatar_show||'all', ty: 'sel', opts:[
                    {l:'全显示',v:'all'},{l:'全隐藏',v:'hide_all'},{l:'首条',v:'first'},{l:'末条',v:'last'}
                ]},
                { k: 'u_show_time', l: '显示时间戳', v: s.ui_show_time!=='false', ty: 'switch' },
                { k: 'u_time_pos', l: '时间戳位置', v: s.u_time_pos||'top', ty: 'sel', opts:[
                    {l:'气泡上方',v:'top'},{l:'气泡下方',v:'bottom'}
                ]},
                { k: 'u_time_fmt', l: '时间格式', v: s.u_time_fmt||'HH:mm', ty: 'sel', opts:[
                    {l:'HH:mm',v:'HH:mm'},{l:'HH:mm:ss',v:'HH:mm:ss'},{l:'MM-DD HH:mm',v:'MM-DD HH:mm'}
                ]},
                { k: 'u_hide_reply', l: '隐藏回复按钮', v: !!s.ui_hide_rbtn, ty: 'switch' },
                { k: 'u_hide_menu', l: '隐藏菜单按钮', v: !!s.ui_hide_mbtn, ty: 'switch' },
                { k: 'u_menu_pos', l: '菜单位置', v: s.u_menu_pos||'top', ty: 'sel', opts:[
                    {l:'输入框上方',v:'top'},{l:'输入框下方',v:'bottom'}
                ]},
                { k: 'u_avatar_radius', l: '头像圆角', v: s.ui_avatar_radius||10, ty: 'num' },
                { k: 'u_bubble_radius', l: '气泡圆角', v: s.ui_bubble_radius||14, ty: 'num' },
                { k: 'u_font_url', l: '字体URL', v: s.u_font_url||'', ty: 'text' },
                { k: 'u_font_size', l: '字体大小', v: s.ui_font_size||'14px', ty: 'text' },
                { k: 'u_font_color', l: '字体颜色', v: s.u_font_color||'#333', ty: 'text' },
                { k: 'u_global_css', l: '全局CSS', v: s.u_global_css||'', ty: 'area', h: 60 },
                { k: 'u_bubble_css', l: '气泡CSS', v: s.u_bubble_css||'', ty: 'area', h: 60 }
            ]
        },
        {
            id: 'history', title: '聊天记录', icon: 'message',
            fields: []
        },
        {
            id: 'other_ops', title: '其他', icon: 'more',
            fields: [
                { k: 'x_dnd', l: '角色勿扰', v: !!s.x_dnd, ty: 'switch' },
                { k: 'x_dnd_time', l: '勿扰时间段', v: s.x_dnd_time||'', ty: 'text', ph: '如: 22:00-08:00' },
                { k: 'x_blocked', l: '已拉黑此角色', v: !!c.blocked, ty: 'switch' },
                { k: 'x_deleted', l: '已删除此角色', v: !!c.deleted, ty: 'switch' }
            ]
        }
    ];

    var html = '';
    sections.forEach(function(sec) {
        // 默认折叠
        html += '<div class="qaq-chat-set-card qaq-collapsible qaq-collapsed" data-sec="'+sec.id+'">';
        html += '<div class="qaq-chat-set-hd qaq-collapse-trigger">'+ico(sec.icon)+'<span>'+sec.title+'</span><svg class="qaq-collapse-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>';
        html += '<div class="qaq-chat-set-bd qaq-collapse-body">';
        
        if (sec.id === 'history') {
            html += '<button class="qaq-chat-action-btn" id="qaq-chat-import-history">'+ico('download')+' 导入聊天记录</button>';
            html += '<button class="qaq-chat-action-btn" id="qaq-chat-export-history">'+ico('download')+' 导出聊天记录</button>';
            html += '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-clear-history">'+ico('message')+' 清除聊天记录</button>';
        } else {
            sec.fields.forEach(function(f) {
                var lab = '<div class="qaq-chat-set-lbl">'+f.l+'</div>';
                if (f.ty === 'text' || f.ty === 'pwd' || f.ty === 'num') {
                    var tg = f.ty==='pwd'?'password':(f.ty==='num'?'number':'text');
                    var step = f.step ? ' step="'+f.step+'"' : '';
                    var minmax = '';
                    if (f.min !== undefined) minmax += ' min="'+f.min+'"';
                    if (f.max !== undefined) minmax += ' max="'+f.max+'"';
                    
                    if (f.hasBtn === 'fetch_model') {
                        html += lab + '<div class="qaq-input-with-btn"><input type="'+tg+'" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escapeHTML(String(f.v))+'" placeholder="'+(f.ph||'')+'"'+step+minmax+'><button class="qaq-fetch-model-btn" data-target="chs_'+f.k+'">'+ico('download')+'</button></div>';
                    } else {
                        html += lab + '<input type="'+tg+'" class="qaq-chat-set-inp" id="chs_'+f.k+'" value="'+escapeHTML(String(f.v))+'" placeholder="'+(f.ph||'')+'"'+step+minmax+'>';
                    }
                } else if (f.ty === 'area') {
                    html += lab + '<textarea class="qaq-chat-set-txt" id="chs_'+f.k+'" style="height:'+(f.h||60)+'px">'+escapeHTML(String(f.v))+'</textarea>';
                } else if (f.ty === 'switch') {
                    html += '<div class="qaq-chat-set-row-tog"><span>'+f.l+'</span><div class="qaq-toggle '+(f.v?'qaq-toggle-on':'')+'" id="chs_'+f.k+'" data-field="'+f.k+'"><div class="qaq-toggle-knob"></div></div></div>';
                } else if (f.ty === 'sel') {
                    var ops = f.opts.map(function(o){ return '<option value="'+o.v+'" '+(o.v===f.v?'selected':'')+'>'+o.l+'</option>'; }).join('');
                    html += lab + '<select class="qaq-chat-set-inp" id="chs_'+f.k+'">'+ops+'</select>';
                }
            });
        }
        
        html += '</div></div>';
    });
    
    html += '<button class="qaq-chat-set-save" id="qaq-chs-sv">保存全部设置</button>';
    scr.innerHTML = html;

    // 绑定折叠事件
    scr.querySelectorAll('.qaq-collapse-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            this.parentElement.classList.toggle('qaq-collapsed');
        });
    });

    // 绑定开关事件
    scr.querySelectorAll('.qaq-toggle').forEach(function(tog) {
        tog.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('qaq-toggle-on');
        });
    });

    // 绑定拉取模型按钮
    scr.querySelectorAll('.qaq-fetch-model-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.dataset.target;
            var inp = document.getElementById(targetId);
            if (!inp) return;
            
            var apiUrl = document.getElementById('chs_o_api_url').value || cd.globalSettings.apiUrl;
            var apiKey = document.getElementById('chs_o_api_key').value || cd.globalSettings.apiKey;
            
            if (!apiUrl || !apiKey) {
                if (typeof qaqToast === 'function') {
                    qaqToast('请先配置API URL和Key');
                } else {
                    safeToast('请先配置API URL和Key');
                }
                return;
            }
            
            this.disabled = true;
            this.innerHTML = ico('download') + ' 拉取中...';
            
            fetch(apiUrl + '/v1/models', {
                headers: { 'Authorization': 'Bearer ' + apiKey }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.data && data.data.length > 0) {
                    var models = data.data.map(function(m) { return m.id; });
                    var selectHtml = '<select class="qaq-model-select-popup">' + 
                        models.map(function(m) { return '<option value="'+m+'">'+m+'</option>'; }).join('') +
                        '</select>';
                    
                    if (typeof qaqConfirm === 'function') {
                        qaqConfirm('选择模型', selectHtml, function() {
                            var sel = document.querySelector('.qaq-model-select-popup');
                            if (sel) inp.value = sel.value;
                        });
                    } else {
                        var chosen = prompt('可用模型:\n' + models.join('\n') + '\n\n请输入模型名称:');
                        if (chosen) inp.value = chosen;
                    }
                } else {
                    if (typeof qaqToast === 'function') {
                        qaqToast('未获取到模型列表');
                    } else {
                        safeToast('未获取到模型列表');
                    }
                }
            })
            .catch(function() {
                if (typeof qaqToast === 'function') {
                    qaqToast('拉取失败');
                } else {
                    safeToast('拉取失败');
                }
            })
            .finally(function() {
                btn.disabled = false;
                btn.innerHTML = ico('download');
            });
        });
    });

    // 聊天记录操作
    var impBtn = document.getElementById('qaq-chat-import-history');
    if (impBtn) {
        impBtn.addEventListener('click', function() {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.json';
            inp.onchange = function() {
                if (!this.files || !this.files[0]) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        var data = JSON.parse(e.target.result);
                        if (data.messages && Array.isArray(data.messages)) {
                            cd.messages[cid] = data.messages;
                            qaqSaveChatData(cd);
                            renderMessages();
                            if (typeof qaqToast === 'function') {
                                qaqToast('聊天记录导入成功');
                            } else {
                                safeToast('聊天记录导入成功');
                            }
                        } else {
                            if (typeof qaqToast === 'function') {
                                qaqToast('文件格式错误');
                            } else {
                                safeToast('文件格式错误');
                            }
                        }
                    } catch(err) {
                        if (typeof qaqToast === 'function') {
                            qaqToast('导入失败');
                        } else {
                            safeToast('导入失败');
                        }
                    }
                };
                reader.readAsText(this.files[0]);
            };
            inp.click();
        });
    }

    var expBtn = document.getElementById('qaq-chat-export-history');
    if (expBtn) {
        expBtn.addEventListener('click', function() {
            var msgs = cd.messages[cid] || [];
            var blob = new Blob([JSON.stringify({messages: msgs}, null, 2)], {type: 'application/json'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'chat_' + cid + '_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
            if (typeof qaqToast === 'function') {
                qaqToast('聊天记录已导出');
            } else {
                safeToast('聊天记录已导出');
            }
        });
    }

    var clrBtn = document.getElementById('qaq-chat-clear-history');
    if (clrBtn) {
        clrBtn.addEventListener('click', function() {
            if (typeof qaqConfirm === 'function') {
                qaqConfirm('清除聊天记录', '确认清除与此角色的所有聊天记录？', function() {
                    cd.messages[cid] = [];
                    qaqSaveChatData(cd);
                    renderMessages();
                    qaqToast('聊天记录已清除');
                });
            } else {
                safeToast('请使用自定义弹窗系统');
            }
        });
    }

    // 保存按钮
    document.getElementById('qaq-chs-sv').addEventListener('click', function() {
        function vx(id, isT) {
            var x = document.getElementById('chs_'+id);
            return x ? (isT ? x.classList.contains('qaq-toggle-on') : x.value) : undefined;
        }

        // 对方设置
        var oAva = vx('o_avatar'); if(oAva!==undefined) c.avatar = oAva;
        var oNick = vx('o_nickname'); if(oNick!==undefined) c.nickname = oNick;
        var oRmk = vx('o_remark'); if(oRmk!==undefined) c.remark = oRmk;
        s.op_persona = vx('o_persona');
        s.o_worldbook = vx('o_worldbook');
        s.o_emoji = vx('o_emoji', true);
        s.o_trans_enable = vx('o_trans_enable', true);
        s.op_trans_pos = vx('o_trans_pos');
        s.mem_max = parseInt(vx('o_mem_max')) || 20;
        s.o_mem_group = vx('o_mem_group', true);
        s.o_mem_video = vx('o_mem_video', true);
        s.o_mem_voice = vx('o_mem_voice', true);
        s.o_mem_offline = vx('o_mem_offline', true);
        s.o_mem_summary = vx('o_mem_summary', true);
        s.o_mem_summary_cnt = parseInt(vx('o_mem_summary_cnt')) || 50;
        s.o_allow_video = vx('o_allow_video', true);
        s.o_allow_voice = vx('o_allow_voice', true);
        s.o_allow_msg = vx('o_allow_msg', true);
        s.o_msg_interval = parseInt(vx('o_msg_interval')) || 30;
        s.o_allow_block = vx('o_allow_block', true);
        s.o_allow_delete = vx('o_allow_delete', true);
        s.o_allow_diary = vx('o_allow_diary', true);
        s.o_api_url = vx('o_api_url');
        s.o_api_key = vx('o_api_key');
        s.o_api_model = vx('o_api_model');
        s.o_voice_url = vx('o_voice_url');
        s.o_voice_key = vx('o_voice_key');
        s.o_voice_model = vx('o_voice_model');
        s.o_voice_speed = parseFloat(vx('o_voice_speed')) || 0.9;
        s.o_img_url = vx('o_img_url');
        s.o_img_key = vx('o_img_key');
        s.o_img_model = vx('o_img_model');
        s.o_img_prompt = vx('o_img_prompt');

        // 我方设置
        p.avatar = vx('m_avatar');
        p.nickname = vx('m_nickname');
        p.trueName = vx('m_truename');
        p.persona = vx('m_persona');
        s.m_preset = vx('m_preset');

        // 美化设置
        s.ui_my_bubble = vx('u_my_bubble');
        s.ui_other_bubble = vx('u_other_bubble');
        s.u_theme = vx('u_theme');
        s.ui_avatar_show = vx('u_avatar_show');
        s.ui_show_time = vx('u_show_time', true) ? 'true' : 'false';
        s.u_time_pos = vx('u_time_pos');
        s.u_time_fmt = vx('u_time_fmt');
        s.ui_hide_rbtn = vx('u_hide_reply', true);
        s.ui_hide_mbtn = vx('u_hide_menu', true);
        s.u_menu_pos = vx('u_menu_pos');
        s.ui_avatar_radius = parseInt(vx('u_avatar_radius')) || 10;
        s.ui_bubble_radius = parseInt(vx('u_bubble_radius')) || 14;
        s.u_font_url = vx('u_font_url');
        s.ui_font_size = vx('u_font_size');
        s.u_font_color = vx('u_font_color');
        s.u_global_css = vx('u_global_css');
        s.u_bubble_css = vx('u_bubble_css');

        // 其他
        s.x_dnd = vx('x_dnd', true);
        s.x_dnd_time = vx('x_dnd_time');
        c.blocked = vx('x_blocked', true);
        c.deleted = vx('x_deleted', true);

        c.configs = s;
        qaqSaveChatData(cd);
        
        if (typeof qaqToast === 'function') {
            qaqToast('设置已保存');
        } else {
            safeToast('设置已保存');
        }
        
        // 刷新界面
        var titleEl = document.getElementById('qaq-chat-win-title');
        if (titleEl) titleEl.textContent = c.remark || c.nickname;
        
        // 应用主题
        document.documentElement.style.setProperty('--chat-my-bub', s.ui_my_bubble || '#fce8e2');
        document.documentElement.style.setProperty('--chat-oth-bub', s.ui_other_bubble || '#ffffff');
        
        // 应用自定义字体
        if (s.u_font_url) {
            var fontFace = new FontFace('ChatCustomFont', 'url(' + s.u_font_url + ')');
            fontFace.load().then(function(loaded) {
                document.fonts.add(loaded);
                document.getElementById('qaq-chat-msg-list').style.fontFamily = 'ChatCustomFont, sans-serif';
            }).catch(function() {
                if (typeof qaqToast === 'function') {
                    qaqToast('字体加载失败');
                } else {
                    safeToast('字体加载失败');
                }
            });
        }
        
        // 应用全局CSS
        var globalStyleEl = document.getElementById('qaq-chat-global-style');
        if (!globalStyleEl) {
            globalStyleEl = document.createElement('style');
            globalStyleEl.id = 'qaq-chat-global-style';
            document.head.appendChild(globalStyleEl);
        }
        globalStyleEl.textContent = s.u_global_css || '';
        
        // 应用气泡CSS
        var bubbleStyleEl = document.getElementById('qaq-chat-bubble-style');
        if (!bubbleStyleEl) {
            bubbleStyleEl = document.createElement('style');
            bubbleStyleEl.id = 'qaq-chat-bubble-style';
            document.head.appendChild(bubbleStyleEl);
        }
        bubbleStyleEl.textContent = '.qaq-chat-bubble { ' + (s.u_bubble_css || '') + ' }';
        
        renderMessages();
        document.getElementById('qaq-chat-set-back').click();
    });
}

// 在发送语音消息的函数中，确保使用配置的语速
function sendVoiceMessage(text) {
    var cd = qaqGetChatData();
    var c = cd.contacts[activeContactId] || {};
    var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
    
    var voiceUrl = s.o_voice_url || cd.globalSettings.voiceUrl;
    var voiceKey = s.o_voice_key || cd.globalSettings.voiceKey;
    var voiceModel = s.o_voice_model || 'speech-02-hd';
    var voiceSpeed = s.o_voice_speed || 0.9;
    
    // 确保语速在合理范围内
    voiceSpeed = Math.max(0.6, Math.min(1.2, voiceSpeed));
    
    fetch(voiceUrl + '/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + voiceKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: voiceModel,
            input: text,
            voice: 'alloy',
            speed: voiceSpeed,
            response_format: 'mp3'
        })
    })
    .then(function(res) { return res.blob(); })
    .then(function(blob) {
        var url = URL.createObjectURL(blob);
        var audio = new Audio(url);
        audio.play();
    })
    .catch(function(err) {
        console.error('语音生成失败:', err);
        if (typeof qaqToast === 'function') {
            qaqToast('语音生成失败');
        } else {
            safeToast('语音生成失败');
        }
    });
}

    if (document.readyState === 'loading') { document.addEventListener("DOMContentLoaded", bindPageEvents); } 
    else { bindPageEvents(); }
})();