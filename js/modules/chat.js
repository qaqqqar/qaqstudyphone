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


    /* ===== 【深度通俗化设置表单映射核心体系】 ===== */
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
                t: '对方设置 (TA的身份逻辑)', 
                f: [
                    { k: 'remark', l: '好友备注名称', v: c.remark||'', ph: '填写入眼称呼', ty: 'text' },
                    { k: 'avatar', l: '专属头像相片链接网址(若有)', v: c.avatar||'', ty: 'text' },
                    { k: 'c_persona', l: '给此角色的系统设定的底座 (例如: 你是一只法斗...)', v: s.op_persona||'', ty: 'area', h: 80 },
                    { k: 'c_trans_mode', l: '自动双语同译格式呈现位置', v: s.op_trans_pos||'in_bottom', ty: 'sel', opts:[{l:'在气泡内原话文字底部接档',v:'in_bottom'},{l:'抽出来漂浮在气泡外底栏',v:'out_bottom'},{l:'太打脸了强制禁用中文',v:'hide'}] },
                    { k: 'c_mem_cnt', l: '追述长时记忆力 (记录几条上下文)', v: s.mem_max||20, ty: 'num' }
                ]
            },
            {
                t: '我的设置 (我的马甲假面)', 
                f: [
                    { k: 'm_nick', l: '对外展露的网名', v: p.nickname||'', ty: 'text' },
                    { k: 'm_true', l: '现实真名叫啥 (强行纠正用)', v: p.trueName||'', ty: 'text' },
                    { k: 'm_persona', l: '我的人设 / TA潜意识里觉得我怎样', v: p.persona||'', ty: 'area', h:60 },
                    { k: 'm_avatar', l: '自己的头像装配 (URL指向)', v: p.avatar||'', ty: 'text' }
                ]
            },
            {
                t: '界面美化 (气泡排版涂层)', 
                f: [
                    { k: 'u_my_bub', l: '我发射气泡的色彩(背景涂敷)', v: s.ui_my_bubble||'#fce8e2', ty: 'sel', opts:[{l:'蜜桃猛男粉 (经典推荐)',v:'#fce8e2'},{l:'QAQ原生青绿色板',v:'#b8dfbf'},{l:'平滑沉寂的冷光银',v:'#dce4f0'},{l:'平铺纯白色',v:'#ffffff'},{l:'重口纯黑色 (夜视慎选)',v:'#111111'}] },
                    { k: 'u_oth_bub', l: '对方面孔抛出的气泡基础色块', v: s.ui_other_bubble||'#ffffff', ty: 'sel', opts:[{l:'自然降噪白 (默认推荐)',v:'#ffffff'},{l:'清淡脱俗霜白灰',v:'#f4f5f7'},{l:'护眼淡茶黄',v:'#fdfaec'}] },
                    { k: 'u_bub_r', l: '信息气泡包裹边界拉伸弯角弧度 (输入整数)', v: s.ui_bubble_radius||14, ty: 'num' },
                    { k: 'u_ava_r', l: '显示化身的头颅面具裁切圆角尺寸', v: s.ui_avatar_radius||10, ty: 'num' },
                    { k: 'u_ava_m', l: '双方信息留存下相貌显示的吝啬度', v: s.ui_avatar_show||'all', ty: 'sel', opts:[{l:'句句话不离身带头像(标配)',v:'all'},{l:'同一组落幕之语悬挂头像',v:'last'},{l:'极端隐藏拉长排版文本空间',v:'hide_all'}] },
                    { k: 'u_time_s', l: '头顶顶置时光显示痕迹板印', v: s.ui_show_time||'true', ty: 'switch' },
                    { k: 'u_hide_r', l: '隐藏最底层的快捷「AI发话」迫击键', v: !!s.ui_hide_rbtn, ty: 'switch' }
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
        
        ht += '<button class="qaq-chat-set-save" id="qaq-chs-sv" style="margin-top:14px; margin-bottom:50px;">封印设定存回实境</button>';
        scr.innerHTML = ht;

        // 数据保存捕抓反哺回血环
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

            c.configs = s;
            qaqSaveChatData(cd);
            safeToast('配置锁死大成功！界已随参数改。');
            
            document.getElementById('qaq-chat-set-back').click(); // 自动闭合窗口
        });
    }

    if (document.readyState === 'loading') { document.addEventListener("DOMContentLoaded", bindPageEvents); } 
    else { bindPageEvents(); }
})();