/**
 * js/modules/chat.js
 * QAQ - AI学习辅助独立聊天引擎 (极致扩展版)
 */
(function () {
    'use strict';

    var CHAT_STORE_KEY = 'qaq-chat-store-v2';
    var activeContactId = null;

    /* ===== 数据存取模块 ===== */
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
        else alert(msg);
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
            myProfile: { nickname: 'Learner', trueName: '', persona: 'A passionate language learner.', avatar: '' }
        });
    }

    function qaqSaveChatData(data) { setCache(CHAT_STORE_KEY, data); }

    function qaqChatFormatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2, '0');
        var m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    }

    /* ===== 核心初始化 / 接管器 ===== */
    window.qaqOpenChatPage = function () {
        try {
            var cd = qaqGetChatData();
            if (Object.keys(cd.contacts).length === 0) {
                // 初始化示例 NPC
                cd.contacts['ai_tutor'] = {
                    id: 'ai_tutor', nickname: 'Alice', remark: '口语私教', avatar: '',
                    isTop: true, updateTime: Date.now(),
                    configs: { 
                        op_persona: 'You are a professional and gentle English tutor.', 
                        ui_bubble_radius: 12, ui_avatar_radius: 6, op_trans_pos: 'in_bottom'
                    }
                };
                cd.messages['ai_tutor'] = [
                    { id: 1, text: "Welcome! Ready for today's practice?", isMe: false, time: Date.now() - 36000, translated: "欢迎！准备好今天的练习了吗？" },
                    { id: 2, text: "I'm ready.", isMe: true, time: Date.now() - 1000 }
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

        // Navigation
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

        // Add Contact Popover
        var topAddBtn = document.getElementById('qaq-chat-top-add-btn');
        if (topAddBtn) {
            topAddBtn.addEventListener('click', function() {
                safeToast('在此处拉起添加好友/群聊表单（暂代）');
            });
        }

        // Messaging
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

    /* ===== 菜单栏扩展功能（纯SVG构筑无Emoji） ===== */
    function renderExtMenu() {
        var mnu = document.getElementById('qaq-chat-ext-menu');
        if (!mnu) return;
        var feats = [
            { n: '表情', i: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>' },
            { n: '语音', i: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>' },
            { n: '照片', i: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
            { n: '位置', i: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
            { n: '转账', i: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
            { n: '快递', i: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
            { n: '剧场', i: '<polygon points="5 3 19 12 5 21 5 3"/>' },
            { n: '视讯', i: '<rect x="2" y="7" width="14" height="10" rx="2" ry="2"/><polygon points="16 12 22 8 22 16 16 12"/>' },
            { n: '日记', i: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' }
        ];
        mnu.innerHTML = feats.map(function(f) {
            return '<div class="qaq-ext-item qaq-ext-action" data-ft="'+f.n+'">' +
                     '<div class="qaq-ext-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + f.i + '</svg></div>' +
                     '<div class="qaq-ext-label">' + f.n + '</div>' +
                   '</div>';
        }).join('');

        mnu.querySelectorAll('.qaq-ext-action').forEach(function(el){
            el.onclick = function(){ safeToast(this.dataset.ft + ' 功能模块接口'); };
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
            listEl.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px;">暂无交互联系人</div>';
            return;
        }

        var dAva = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e8e8ec'/%3E%3C/svg%3E";
        listEl.innerHTML = '';
        arr.forEach(function(c) {
            var s = c.configs || {};
            var msgs = cd.messages[c.id] || [];
            var lst = msgs.length ? msgs[msgs.length - 1] : null;
            var tStr = lst ? qaqChatFormatTime(lst.time) : '';
            var rRadius = s.ui_avatar_radius !== undefined ? s.ui_avatar_radius : 8; // 默认圆角方
            
            var div = document.createElement('div');
            div.className = 'qaq-chat-list-item' + (c.isTop ? ' qaq-top' : '');
            div.innerHTML = 
                '<img class="qaq-chat-list-avatar" src="' + (c.avatar || dAva) + '" style="border-radius:'+rRadius+'px;"/>' +
                '<div class="qaq-chat-list-info">' +
                    '<div class="qaq-chat-list-top-row">' +
                        '<div class="qaq-chat-list-name">' + escapeHTML(c.remark || c.nickname || c.id) + '</div>' +
                        '<div class="qaq-chat-list-time">' + tStr + '</div>' +
                    '</div>' +
                    '<div class="qaq-chat-list-preview">' + escapeHTML(lst ? (lst.text||'[消息]') : '暂无交互') + '</div>' +
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
        
        // 排版联动
        var rBtn = document.getElementById('qaq-chat-recv-ai-btn');
        var mBtn = document.getElementById('qaq-chat-toggle-menu');
        var iBox = document.getElementById('qaq-chat-input-box');
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
            var avaHtml = '<img class="qaq-chat-bubble-avatar" src="' + avaUrl + '" style="border-radius:'+rRadius+'px;">';
            
            // 头像显示策略
            if (s.ui_avatar_show === 'hide_all') avaHtml = '';
            else if (s.ui_avatar_show === 'first' && idx !== 0) avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            else if (s.ui_avatar_show === 'last' && idx !== msgs.length - 1) avaHtml = '<div class="qaq-chat-bubble-avatar-gap" style="width:38px;margin:'+(isMe?'0 0 0 10px':'0 10px 0 0')+'"></div>';
            
            // 带方向小尾巴的圆角计算
            var bubRadiusStyle = isMe ? 'border-radius:'+bubR+'px 2px '+bubR+'px '+bubR+'px' 
                                      : 'border-radius:2px '+bubR+'px '+bubR+'px '+bubR+'px';

            var transPos = s.op_trans_pos || 'in_bottom';
            var trInner = '', trOuter = '';
            if (m.translated && transPos !== 'hide') {
                var th = '<div class="qaq-chat-trans" style="font-size:'+(parseInt(fSz)-2)+'px">' + escapeHTML(m.translated) + '</div>';
                if(transPos.indexOf('in')>-1) trInner = th; else trOuter = th;
            }
            
            // 译文拼入
            var bIn = escapeHTML(m.text) + trInner;
            if(transPos === 'in_top') bIn = trInner + escapeHTML(m.text);

            var tStr = '';
            if (s.ui_show_time === 'true') {
                tStr = '<div class="qaq-chat-msg-time">' + qaqChatFormatTime(m.time) + '</div>';
            }

            var alg = isMe ? 'qaq-row-me' : 'qaq-row-other';
            html += 
                '<div class="qaq-chat-row ' + alg + '">' +
                    avaHtml +
                    '<div class="qaq-chat-bubble-wrap '+(transPos.indexOf('out')>-1?'qaq-has-outer-tr':'')+'">' + tStr +
                        '<div class="qaq-chat-bubble" style="' + bubRadiusStyle + '; font-size:'+fSz+'; '+(isMe?('background:'+(s.ui_theme_color||'#b8dfbf')):('background:#fff'))+'">' +
                            bIn +
                        '</div>' +
                        trOuter +
                    '</div>' +
                '</div>';
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

    /* ===== 设置与配置大集束引擎 ===== */
    function renderDynamicSettings() {
        var cd = qaqGetChatData();
        var cid = activeContactId;
        var c = cd.contacts[cid] || {};
        var s = Object.assign({}, cd.globalSettings || {}, c.configs || {});
        var p = cd.myProfile;
        
        var scr = document.getElementById('qaq-chat-settings-scroll');
        if (!scr) return;

        // 五大分类超强表单映射
        var groups = [
            {
                t: '对方智脑构架', // 1
                f: [
                    { k: 'remark', l: '备注/真名 (超限昵称)', v: c.remark||'', ph: '输入备注', ty: 'text' },
                    { k: 'avatar', l: '对方化身头像 (URL)', v: c.avatar||'', ty: 'text' },
                    { k: 'c_persona', l: '系统 Prompt 人设池 (System)', v: s.op_persona||'', ty: 'area', h: 80 },
                    { k: 'c_world', l: '映射词库 / 世界书挂载名', v: s.op_bind_world||'', ty: 'text' },
                    { k: 'c_emoji', l: '赋能角色发表情包能力', v: s.op_allow_emoji, ty: 'switch' },
                    { k: 'c_trans_mode', l: '双语同传模式 / 气泡译文', v: s.op_trans_pos||'in_bottom', ty: 'sel', opts:[{l:'气泡内下端',v:'in_bottom'},{l:'气泡内顶端',v:'in_top'},{l:'抽层剥离显示',v:'out_bottom'},{l:'关闭',v:'hide'}] },
                    { k: 'c_mem_cnt', l: '绝对记忆边界长队', v: s.mem_max||20, ty: 'num' },
                    { k: 'c_mem_auto', l: '到达记忆边界时强制回滚压缩大纲', v: s.mem_summary, ty: 'switch' },
                    { k: 'c_mem_mix', l: '整合[视频/语音/线下/群聊]复合模态', v: s.mem_attach, ty: 'switch' },
                    { k: 'c_auto_msg', l: '开启无情无序的自动骚扰消息流', v: s.op_auto_msg, ty: 'switch' },
                    { k: 'c_auto_gap', l: '静默多久触发流 (分钟)', v: s.op_auto_gap||60, ty: 'num' },
                    { k: 'c_ai_diary', l: '子程序：睡前自动生成他/她的日记', v: s.op_ai_diary, ty: 'switch' },
                    { k: 'c_api_txt', l: '专列 API 钥 (空则主全局)', v: s.api_txt||'', ty: 'pwd' },
                    { k: 'c_api_voc', l: '私配发音列 (MiniMax)', v: s.api_voc||'', ty: 'sel', opts:[{l:'原生默认',v:''},{l:'Female-Shaonv',v:'f-s'},{l:'Male-Qingnian',v:'m-q'}] },
                    { k: 'c_api_img', l: '幻象生图底座提示流 (DALL-E)', v: s.api_img||'', ty: 'area' }
                ]
            },
            {
                t: '自身虚构镜像', // 2
                f: [
                    { k: 'm_nick', l: '本次对话网名', v: p.nickname||'', ty: 'text' },
                    { k: 'm_true', l: '投喂真名 (防止他乱叫)', v: p.trueName||'', ty: 'text' },
                    { k: 'm_persona', l: '在TA视角下的[我]', v: p.persona||'', ty: 'area', h:60 }
                ]
            },
            {
                t: '气场渲染排版', // 3
                f: [
                    { k: 'u_color', l: '主客色相盘 (我的底色)', v: s.ui_theme_color||'#b8dfbf', ty: 'sel', opts:[{l:'原生青绿',v:'#b8dfbf'},{l:'蜜桃粉',v:'#fce8e2'},{l:'淡雾灰',v:'#e2e6eb'}] },
                    { k: 'u_bub_r', l: '张力圆滑角界值 (气泡圆角 px)', v: s.ui_bubble_radius||14, ty: 'num' },
                    { k: 'u_ava_r', l: '相片圆周约束 (头像圆角 px)', v: s.ui_avatar_radius||8, ty: 'num' },
                    { k: 'u_ava_m', l: '头像存在感', v: s.ui_avatar_show||'all', ty: 'sel', opts:[{l:'时刻彰显',v:'all'},{l:'仅揭面首句显示',v:'first'},{l:'仅拖尾末句显示',v:'last'},{l:'彻底隐去拉长视野',v:'hide_all'}] },
                    { k: 'u_time_s', l: '光阴刻度指示', v: s.ui_show_time||'true', ty: 'switch' },
                    { k: 'u_hide_r', l: '剔除底栏【AI回】将输入拉通', v: !!s.ui_hide_rbtn, ty: 'switch' },
                    { k: 'u_hide_m', l: '剔除左侧【挂载菜单】封死扩展', v: !!s.ui_hide_mbtn, ty: 'switch' },
                    { k: 'u_font_s', l: '书写尺寸缩放 (默认14px)', v: s.ui_font_size||'14px', ty: 'sel', opts:[{l:'偏小 (13px)',v:'13px'},{l:'标准 (14px)',v:'14px'},{l:'舒缓 (16px)',v:'16px'}] },
                    { k: 'btn_css', l: '编织纯骨 CSS 魔改层', ty: 'btn', c:'blue' }
                ]
            },
            {
                t: '不可抗力与备份', // 4
                f: [
                    { k: 'b_imp', l: '覆盖：重放外源羁绊流 (Import .json)', ty: 'btn' },
                    { k: 'b_exp', l: '剥离：导出该频段神识 (Export .json)', ty: 'btn' },
                    { k: 'b_clr', l: '重塑：碾碎所有消息长河 (清理)', ty: 'btn', c:'red' }
                ]
            },
            {
                t: '制裁裁决权', // 5
                f: [
                    { k: 'x_dnd', l: '封锁子时(免打扰)', v: !!s.x_dnd, ty: 'switch' },
                    { k: 'x_blk', l: '无尽黑暗 (拉黑阻断)', ty: 'btn', c:'dark' },
                    { k: 'x_del', l: '【肃杀】强行湮灭角色存在 (删号)', ty: 'btn', c:'red' },
                    { k: 'x_add', l: '复生 (反向被删后捞回)', ty: 'btn' }
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
                } else if (i.ty === 'btn') {
                    var color = i.c==='red'?'#d9534f':(i.c==='blue'?'#5b9bd5':(i.c==='dark'?'#333':'#8a6050'));
                    var bg = i.c==='red'?'rgba(217,83,79,0.1)':(i.c==='blue'?'rgba(91,155,213,0.1)':'#f0f0f0');
                    ht += '<button class="qaq-chat-set-act-btn" data-act="'+i.l+'" style="color:'+color+';background:'+bg+'">'+i.l+'</button>';
                }
            });
            ht += '</div></div>';
        });
        
        ht += '<button class="qaq-chat-set-save" id="qaq-chs-sv">重塑基建参数保存</button>';
        scr.innerHTML = ht;

        // 占位功能吐司绑定
        scr.querySelectorAll('.qaq-chat-set-act-btn').forEach(function(b){
            b.onclick = function(){ safeToast('接口: ' + this.dataset.act); };
        });

        // 反向写入逻辑池
        document.getElementById('qaq-chs-sv').addEventListener('click', function(){
            function vx(id, isT){ 
                var x = document.getElementById('chs_'+id); 
                return x ? (isT ? x.classList.contains('qaq-toggle-on') : x.value) : undefined;
            }
            
            var mN = vx('m_nick'); if(mN!==undefined) cd.myProfile.nickname = mN;
            var mT = vx('m_true'); if(mT!==undefined) cd.myProfile.trueName = mT;
            var mP = vx('m_persona'); if(mP!==undefined) cd.myProfile.persona = mP;

            var crk = vx('remark');
            if(crk!==undefined) {
                c.remark = crk;
                var el=document.getElementById('qaq-chat-win-title'); 
                if(el) el.textContent = crk || c.nickname;
            }
            var cav = vx('avatar'); if(cav!==undefined) c.avatar = cav;

            s.op_persona = vx('c_persona');
            s.op_bind_world = vx('c_world');
            s.op_allow_emoji = vx('c_emoji', true);
            s.op_trans_pos = vx('c_trans_mode');
            s.mem_max = vx('c_mem_cnt');
            s.mem_summary = vx('c_mem_auto', true);
            s.mem_attach = vx('c_mem_mix', true);
            s.op_auto_msg = vx('c_auto_msg', true);
            s.op_auto_gap = vx('c_auto_gap');
            s.op_ai_diary = vx('c_ai_diary', true);
            s.api_txt = vx('c_api_txt');
            s.api_voc = vx('c_api_voc');
            s.api_img = vx('c_api_img');
            
            s.ui_theme_color = vx('u_color');
            s.ui_bubble_radius = vx('u_bub_r');
            s.ui_avatar_radius = vx('u_ava_r');
            s.ui_avatar_show = vx('u_ava_m');
            s.ui_show_time = vx('u_time_s', true)?'true':'false';
            s.ui_hide_rbtn = vx('u_hide_r', true);
            s.ui_hide_mbtn = vx('u_hide_m', true);
            s.ui_font_size = vx('u_font_s');
            
            s.x_dnd = vx('x_dnd', true);

            c.configs = s;
            qaqSaveChatData(cd);
            safeToast('数据参数熔铸完成，全局影响即刻生效。');
        });
    }

    if (document.readyState === 'loading') { document.addEventListener("DOMContentLoaded", bindPageEvents); } 
    else { bindPageEvents(); }
})();