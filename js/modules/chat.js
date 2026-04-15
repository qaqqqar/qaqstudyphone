(function () {
'use strict';

var CHAT_STORE_KEY = 'qaq-chat-app-store-v1';
var CHAT_PRESETS_KEY = 'qaq-chat-app-presets-v1';
var activeContactId = null;
var activeMainTab = 'message';
var runtimeFontName = '';
var runtimeStyleMounted = false;

function getCache(k, d) {
    return (window.qaqCacheGet || function (_, dd) { return dd; })(k, d);
}
function setCache(k, v) {
    (window.qaqCacheSet || function () {})(k, v);
}
function toast(msg) {
    (window.qaqToast || console.log)(msg);
}
function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '');
}
function fmtTime(ts, fmt) {
    var d = new Date(ts || Date.now());
    var Y = d.getFullYear();
    var M = String(d.getMonth() + 1).padStart(2, '0');
    var D = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    if (fmt === 'HH:mm:ss') return h + ':' + m + ':' + s;
    if (fmt === 'MM-DD HH:mm') return M + '-' + D + ' ' + h + ':' + m;
    if (fmt === 'YYYY-MM-DD HH:mm') return Y + '-' + M + '-' + D + ' ' + h + ':' + m;
    return h + ':' + m;
}
function getGlobalTheme() {
    var t = localStorage.getItem('qaq-theme') || 'default';
    return ['default', 'cool', 'dark'].indexOf(t) > -1 ? t : 'default';
}
function icon(name, size) {
    size = size || 18;
    if (window.lucide && window.lucide.icons && window.lucide.icons[name]) {
        try {
            return window.lucide.icons[name].toSvg({
                width: size,
                height: size,
                stroke: 'currentColor',
                'stroke-width': 1.9
            });
        } catch (e) {}
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"></circle></svg>';
}
function getDefaultAvatar() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='18' fill='%23ececf0'/%3E%3Ccircle cx='50' cy='38' r='20' fill='%23d7d7dd'/%3E%3Cpath d='M20 86c4-18 18-28 30-28s26 10 30 28' fill='%23d0d0d6'/%3E%3C/svg%3E";
}
function getBubbleThemeDefaults(theme) {
    theme = theme || getGlobalTheme();
    if (theme === 'dark') return { my: '#5a4038', other: '#303035' };
    if (theme === 'cool') return { my: '#d8e2f2', other: '#ffffff' };
    return { my: '#fce8e2', other: '#ffffff' };
}
function getMainNavLabel(v) {
    return ({ message: '消息', friend: '好友', feed: '动态', mine: '我的' })[v] || v;
}
function getAvatarShowLabel(v) {
    return ({ all: '头像全显示', hide_all: '头像全隐藏', first: '首条头像', last: '末条头像' })[v] || v;
}
function getThemeLabel(v) {
    return ({ default: '暖阳', cool: '冷雾', dark: '夜幕' })[v] || v;
}
function getTranslateLabel(v) {
    return ({ in_top: '气泡内上方', in_bottom: '气泡内下方', out_top: '气泡外上方', out_bottom: '气泡外下方', hide: '隐藏翻译' })[v] || v;
}
function getTimePosLabel(v) {
    return ({ top: '气泡上方', bottom: '气泡下方', bubble_inner: '气泡内侧', bubble_outer: '气泡外侧', avatar_top: '头像上方', avatar_bottom: '头像下方' })[v] || v;
}
function getMenuPosLabel(v) {
    return ({ top: '输入栏上方', bottom: '输入栏下方', inside: '收在菜单栏里' })[v] || v;
}

function createDefaultStore() {
    var bub = getBubbleThemeDefaults(getGlobalTheme());
    return {
        version: 1,
        globalApi: JSON.parse(localStorage.getItem('qaq-api-config') || '{}'),
        myProfile: {
            avatar: '',
            nickname: '学生',
            realName: '',
            persona: '正在认真进行语言学习的用户',
            preset: ''
        },
        contacts: {
            ai_demo: {
                id: 'ai_demo',
                avatar: '',
                nickname: 'Alice',
                remark: '外语陪练员 Alice',
                realName: '',
                persona: '开朗、耐心、自然、真实的人类外语陪练',
                worldBookId: '',
                worldBookName: '',
                activeSticker: false,
                translateEnabled: true,
                translateMode: 'in_bottom',
                memMax: 20,
                bindGroupMemory: false,
                bindVideoMemory: false,
                bindVoiceMemory: false,
                bindOfflineMemory: false,
                summaryMemory: false,
                summaryCount: 50,
                allowVideoCall: true,
                allowVoiceCall: true,
                allowAutoMessage: false,
                autoMessageGap: 60,
                allowBlockUser: false,
                allowDeleteUser: false,
                allowAutoDiary: false,
                apiUrl: '',
                apiKey: '',
                apiModel: '',
                voiceUrl: '',
                voiceKey: '',
                voiceModel: 'speech-02-hd',
                voiceSpeed: 0.9,
                imageUrl: '',
                imageKey: '',
                imageModel: '',
                imagePrompt: '',
                imageNegative: '',
                top: true,
                blocked: false,
                deleted: false,
                dnd: false,
                dndTime: '',
                uiTheme: getGlobalTheme(),
                uiBubbleMy: bub.my,
                uiBubbleOther: bub.other,
                uiAvatarShow: 'all',
                uiShowTime: true,
                uiTimePos: 'top',
                uiTimeFmt: 'HH:mm',
                uiHideReplyBtn: false,
                uiHideMenuBtn: false,
                uiMenuPos: 'top',
                uiAvatarRadius: 10,
                uiBubbleRadius: 16,
                uiFontUrl: '',
                uiFontSize: '14px',
                uiFontColor: '#333333',
                uiGlobalCss: '',
                uiBubbleCss: ''
            }
        },
        messages: {
            ai_demo: [
                {
                    id: uid('msg'),
                    type: 'text',
                    isMe: false,
                    text: "I can practice vocabulary, conversation, writing and listening with you.",
                    translated: '我可以陪你练习词汇、对话、写作和听力。',
                    time: Date.now() - 3600000
                }
            ]
        },
        friendRequests: [],
        deletedPool: [],
        feedPosts: [],
        worldBooks: []
    };
}
function getStore() {
    var s = getCache(CHAT_STORE_KEY, null);
    if (!s || s.version !== 1) {
        s = createDefaultStore();
        setStore(s);
    }
    if (!s.contacts) s.contacts = {};
    if (!s.messages) s.messages = {};
    if (!s.friendRequests) s.friendRequests = [];
    if (!s.deletedPool) s.deletedPool = [];
    if (!s.feedPosts) s.feedPosts = [];
    if (!s.worldBooks) s.worldBooks = [];
    if (!s.myProfile) s.myProfile = createDefaultStore().myProfile;
    return s;
}
function setStore(s) {
    s.version = 1;
    setCache(CHAT_STORE_KEY, s);
}
function getPresets() {
    var p = getCache(CHAT_PRESETS_KEY, null);
    if (!p || p.version !== 1) {
        p = {
            version: 1,
            api: [],
            voice: [],
            image: [],
            persona: [],
            globalCss: [],
            bubbleCss: []
        };
        setPresets(p);
    }
    return p;
}
function setPresets(p) {
    p.version = 1;
    setCache(CHAT_PRESETS_KEY, p);
}

function ensureRuntimeStyleNode() {
    if (runtimeStyleMounted) return;
    var s1 = document.getElementById('qaq-chat-runtime-style');
    if (!s1) {
        s1 = document.createElement('style');
        s1.id = 'qaq-chat-runtime-style';
        document.head.appendChild(s1);
    }
    runtimeStyleMounted = true;
}
function applyPageThemeClass(theme) {
    var pages = document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page');
    pages.forEach(function (p) {
        p.classList.remove('qaq-theme-dark', 'qaq-theme-cool');
        if (theme === 'dark') p.classList.add('qaq-theme-dark');
        if (theme === 'cool') p.classList.add('qaq-theme-cool');
    });
}
function applyRuntimeStyle(cfg) {
    ensureRuntimeStyleNode();
    var node = document.getElementById('qaq-chat-runtime-style');
    if (!node) return;
    var css = [];
    css.push(':root{--chat-my-bub:' + (cfg.uiBubbleMy || '#fce8e2') + ';--chat-oth-bub:' + (cfg.uiBubbleOther || '#ffffff') + ';}');
    css.push('.qaq-chat-msg-list{font-size:' + (cfg.uiFontSize || '14px') + ';color:' + (cfg.uiFontColor || '#333333') + ';}');
    if (cfg.uiBubbleCss) css.push('.qaq-chat-bubble{' + cfg.uiBubbleCss + '}');
    if (cfg.uiGlobalCss) css.push(cfg.uiGlobalCss);
    if (runtimeFontName) {
        css.push('.qaq-chat-msg-list,.qaq-chat-input-box,.qaq-chat-settings-scroll{font-family:"' + runtimeFontName + '",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;}');
    }
    node.textContent = css.join('\n');
}
function loadCustomFont(url, done) {
    if (!url) {
        runtimeFontName = '';
        done && done();
        return;
    }
    try {
        runtimeFontName = 'qaqChatFont_' + Date.now();
        var ff = new FontFace(runtimeFontName, 'url(' + url + ')');
        ff.load().then(function (font) {
            document.fonts.add(font);
            done && done();
        }).catch(function () {
            runtimeFontName = '';
            toast('字体加载失败');
            done && done();
        });
    } catch (e) {
        runtimeFontName = '';
        done && done();
    }
}

function getActiveContact() {
    var s = getStore();
    return s.contacts[activeContactId] || null;
}
function getMergedChatConfig(contact) {
    if (!contact) return null;
    return contact;
}
function getDisplayName(contact) {
    return contact ? (contact.remark || contact.nickname || '未命名联系人') : '聊天';
}
function getMessages(contactId) {
    var s = getStore();
    return s.messages[contactId] || [];
}
function ensureMessageArr(store, cid) {
    if (!store.messages[cid]) store.messages[cid] = [];
    return store.messages[cid];
}
function isInDndRange(cfg) {
    if (!cfg.dnd || !cfg.dndTime) return false;
    var arr = String(cfg.dndTime).split('-');
    if (arr.length !== 2) return false;
    var now = new Date();
    var cur = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var start = arr[0];
    var end = arr[1];
    if (start <= end) return cur >= start && cur <= end;
    return cur >= start || cur <= end;
}
function sortContacts(arr) {
    arr.sort(function (a, b) {
        if (!!a.top !== !!b.top) return a.top ? -1 : 1;
        return (b.lastTime || 0) - (a.lastTime || 0);
    });
    return arr;
}
function buildContactList() {
    var s = getStore();
    var arr = Object.keys(s.contacts).map(function (id) {
        var c = s.contacts[id];
        if (c.deleted) return null;
        var msgs = getMessages(id);
        var last = msgs[msgs.length - 1];
        return {
            id: id,
            avatar: c.avatar || getDefaultAvatar(),
            name: getDisplayName(c),
            preview: last ? (last.text || '[空消息]') : '暂无消息',
            time: last ? fmtTime(last.time, 'HH:mm') : '',
            top: !!c.top,
            blocked: !!c.blocked,
            lastTime: last ? last.time : 0,
            raw: c
        };
    }).filter(Boolean);
    return sortContacts(arr);
}

function qs(id) { return document.getElementById(id); }

function openModal(title, html, opts) {
    opts = opts || {};
    var titleEl = qs('qaq-modal-title');
    var bodyEl = qs('qaq-modal-body');
    var btnsEl = qs('qaq-modal-btns');
    if (!titleEl || !bodyEl || !btnsEl) return;
    titleEl.textContent = title || '提示';
    bodyEl.innerHTML = html || '';
    if (opts.hideBtns) {
        btnsEl.innerHTML = '';
    } else {
        btnsEl.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-chat-modal-cancel">' + (opts.cancelText || '取消') + '</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-modal-confirm">' + (opts.confirmText || '确定') + '</button>';
    }
    if (window.qaqOpenModal) window.qaqOpenModal();
    if (!opts.hideBtns) {
        var c = qs('qaq-chat-modal-cancel');
        var f = qs('qaq-chat-modal-confirm');
        if (c) c.onclick = function () {
            opts.onCancel && opts.onCancel();
            window.qaqCloseModal && window.qaqCloseModal();
        };
        if (f) f.onclick = function () {
            var ret = opts.onConfirm && opts.onConfirm();
            if (ret === false) return;
            window.qaqCloseModal && window.qaqCloseModal();
        };
    }
    opts.afterRender && opts.afterRender();
}
function openSelect(title, list, current, onPick) {
    openModal(title,
        '<div class="qaq-custom-select-list">' +
        list.map(function (it) {
            var value = typeof it === 'string' ? it : it.value;
            var label = typeof it === 'string' ? it : it.label;
            var active = value === current;
            return '<div class="qaq-custom-select-option' + (active ? ' qaq-custom-select-active' : '') + '" data-qaq-v="' + esc(value) + '">' +
                '<span>' + esc(label) + '</span>' +
                (active ? '<span style="color:#c47068;">✓</span>' : '') +
            '</div>';
        }).join('') +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                document.querySelectorAll('[data-qaq-v]').forEach(function (el) {
                    el.onclick = function () {
                        var v = this.getAttribute('data-qaq-v');
                        onPick && onPick(v);
                        window.qaqCloseModal && window.qaqCloseModal();
                    };
                });
            }
        }
    );
}
function chooseImage(targetId) {
    openModal('设置图片',
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<input class="qaq-modal-input" id="qaq-chat-image-url" placeholder="输入图片 URL">' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-image-file" style="height:38px;">导入本地图片</button>' +
        '</div>',
        {
            onConfirm: function () {
                var v = (qs('qaq-chat-image-url').value || '').trim();
                if (!v) return false;
                var t = qs(targetId);
                if (t) t.value = v;
            },
            afterRender: function () {
                qs('qaq-chat-image-file').onclick = function () {
                    var input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = function () {
                        if (!this.files || !this.files[0]) return;
                        var rd = new FileReader();
                        rd.onload = function (e) {
                            var t = qs(targetId);
                            if (t) t.value = e.target.result;
                            window.qaqCloseModal && window.qaqCloseModal();
                        };
                        rd.readAsDataURL(this.files[0]);
                    };
                    input.click();
                };
            }
        }
    );
}
function chooseFont(targetId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ttf,.otf,.woff,.woff2';
    input.onchange = function () {
        if (!this.files || !this.files[0]) return;
        var rd = new FileReader();
        rd.onload = function (e) {
            var t = qs(targetId);
            if (t) t.value = e.target.result;
            toast('字体已导入');
        };
        rd.readAsDataURL(this.files[0]);
    };
    input.click();
}
function chooseColor(title, current, onPick) {
    var colors = ['#fce8e2','#ffffff','#d8e2f2','#cfe7d1','#f5f1d8','#333333','#111111','#d7d7df','#f0d4ca','#b8dfbf','#5a4038','#303035'];
    openModal(title,
        '<div class="qaq-custom-select-list">' +
        colors.map(function (c) {
            return '<div class="qaq-custom-select-option" data-qaq-color="' + c + '">' +
                '<span style="display:flex;align-items:center;gap:10px;"><span style="width:18px;height:18px;border-radius:50%;display:inline-block;background:' + c + ';border:1px solid rgba(0,0,0,.08);"></span>' + c + '</span>' +
                (c === current ? '<span style="color:#c47068;">✓</span>' : '') +
            '</div>';
        }).join('') +
        '</div>' +
        '<input class="qaq-modal-input" id="qaq-chat-color-free" value="' + esc(current || '#333333') + '" placeholder="#RRGGBB" style="margin-top:10px;">',
        {
            confirmText: '应用',
            onConfirm: function () {
                var v = (qs('qaq-chat-color-free').value || '').trim();
                if (!v) return false;
                onPick && onPick(v);
            },
            afterRender: function () {
                document.querySelectorAll('[data-qaq-color]').forEach(function (el) {
                    el.onclick = function () {
                        qs('qaq-chat-color-free').value = this.getAttribute('data-qaq-color');
                    };
                });
            }
        }
    );
}
function savePreset(type, data) {
    openModal('保存预设', '<input class="qaq-modal-input" id="qaq-chat-preset-name" placeholder="输入预设名称">', {
        confirmText: '保存',
        onConfirm: function () {
            var name = (qs('qaq-chat-preset-name').value || '').trim();
            if (!name) {
                toast('请输入名称');
                return false;
            }
            var p = getPresets();
            if (!p[type]) p[type] = [];
            p[type].push({ id: uid('preset'), name: name, data: data });
            setPresets(p);
            toast('预设已保存');
        }
    });
}
function loadPreset(type, applyFn) {
    var p = getPresets();
    var arr = p[type] || [];
    if (!arr.length) {
        toast('暂无预设');
        return;
    }
    openModal('导入预设',
        '<div class="qaq-custom-select-list">' +
        arr.map(function (x) {
            return '<div class="qaq-custom-select-option" data-qaq-preset="' + x.id + '"><span>' + esc(x.name) + '</span></div>';
        }).join('') +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                document.querySelectorAll('[data-qaq-preset]').forEach(function (el) {
                    el.onclick = function () {
                        var id = this.getAttribute('data-qaq-preset');
                        var hit = arr.find(function (x) { return x.id === id; });
                        if (hit) applyFn && applyFn(hit.data);
                        window.qaqCloseModal && window.qaqCloseModal();
                    };
                });
            }
        }
    );
}

function renderMainNav() {
    var page = qs('qaq-chat-main-page');
    if (!page) return;
    page.querySelectorAll('.qaq-chat-bottom-nav .qaq-chat-nav-item').forEach(function (el, idx) {
        var map = ['message', 'friend', 'feed', 'mine'];
        var key = map[idx];
        el.classList.toggle('qaq-chat-nav-active', key === activeMainTab);
    });
}
function renderMainBody() {
    renderMainNav();
    if (activeMainTab === 'message') renderMessageList();
    if (activeMainTab === 'friend') renderFriendList();
    if (activeMainTab === 'feed') renderFeedList();
    if (activeMainTab === 'mine') renderMineList();
}
function renderMessageList() {
    var list = qs('qaq-chat-contact-list');
    if (!list) return;
    var rows = buildContactList();
    var s = getStore();
    var reqCount = (s.friendRequests || []).filter(function (x) { return !x.done; }).length;
    var html = '';
    if (reqCount > 0) {
        html += '<div class="qaq-chat-list-item" id="qaq-chat-new-friend-entry">' +
            '<div class="qaq-chat-list-avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(196,112,104,.12);color:#c47068;">' + icon('user-plus', 20) + '</div>' +
            '<div class="qaq-chat-list-info">' +
                '<div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">新朋友</div><div class="qaq-chat-list-time">' + reqCount + ' 条</div></div>' +
                '<div class="qaq-chat-list-preview">查看好友申请</div>' +
            '</div>' +
        '</div>';
    }
    if (!rows.length) {
        list.innerHTML = html + '<div style="text-align:center;color:#aaa;padding:60px 20px;">暂无消息，点击右上角添加联系人</div>';
        window.lucide && window.lucide.createIcons && window.lucide.createIcons();
        if (qs('qaq-chat-new-friend-entry')) qs('qaq-chat-new-friend-entry').onclick = showFriendRequests;
        return;
    }
    rows.forEach(function (row) {
        html += '<div class="qaq-chat-list-item' + (row.top ? ' qaq-top' : '') + '" data-qaq-contact="' + row.id + '">' +
            '<img class="qaq-chat-list-avatar" src="' + esc(row.avatar) + '">' +
            '<div class="qaq-chat-list-info">' +
                '<div class="qaq-chat-list-top-row">' +
                    '<div class="qaq-chat-list-name">' + esc(row.name) + '</div>' +
                    '<div class="qaq-chat-list-time">' + esc(row.time) + '</div>' +
                '</div>' +
                '<div class="qaq-chat-list-preview">' + esc((row.blocked ? '[已拉黑] ' : '') + row.preview) + '</div>' +
            '</div>' +
        '</div>';
    });
    list.innerHTML = html;
    window.lucide && window.lucide.createIcons && window.lucide.createIcons();
    if (qs('qaq-chat-new-friend-entry')) qs('qaq-chat-new-friend-entry').onclick = showFriendRequests;
    list.querySelectorAll('[data-qaq-contact]').forEach(function (el) {
        el.onclick = function () {
            openChat(this.getAttribute('data-qaq-contact'));
        };
        el.oncontextmenu = function (e) {
            e.preventDefault();
            openContactQuickMenu(this.getAttribute('data-qaq-contact'));
        };
    });
}
function renderFriendList() {
    var list = qs('qaq-chat-contact-list');
    if (!list) return;
    var s = getStore();
    var rows = Object.keys(s.contacts).map(function (id) {
        var c = s.contacts[id];
        if (c.deleted) return null;
        return c;
    }).filter(Boolean).sort(function (a, b) {
        return getDisplayName(a).localeCompare(getDisplayName(b), 'zh');
    });
    if (!rows.length) {
        list.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px 20px;">暂无好友</div>';
        return;
    }
    list.innerHTML = rows.map(function (c) {
        return '<div class="qaq-chat-list-item" data-qaq-contact="' + c.id + '">' +
            '<img class="qaq-chat-list-avatar" src="' + esc(c.avatar || getDefaultAvatar()) + '">' +
            '<div class="qaq-chat-list-info">' +
                '<div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">' + esc(getDisplayName(c)) + '</div><div class="qaq-chat-list-time">' + (c.blocked ? '已拉黑' : '联系人') + '</div></div>' +
                '<div class="qaq-chat-list-preview">' + esc(c.persona || '暂无人设') + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('[data-qaq-contact]').forEach(function (el) {
        el.onclick = function () {
            openContactQuickMenu(this.getAttribute('data-qaq-contact'));
        };
    });
}
function renderFeedList() {
    var list = qs('qaq-chat-contact-list');
    if (!list) return;
    var s = getStore();
    var posts = s.feedPosts || [];
    if (!posts.length) {
        var contacts = buildContactList().slice(0, 3);
        if (contacts.length) {
            posts = contacts.map(function (x, i) {
                return {
                    id: uid('feed'),
                    cid: x.id,
                    avatar: x.avatar,
                    name: x.name,
                    text: ['今天继续训练听力与口语表达。','刚整理完一轮高频词汇。','保持稳定输出，今天也要认真练习。'][i % 3],
                    time: Date.now() - i * 3600000
                };
            });
            s.feedPosts = posts;
            setStore(s);
        }
    }
    if (!posts.length) {
        list.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px 20px;">暂无动态</div>';
        return;
    }
    list.innerHTML = posts.map(function (p) {
        return '<div class="qaq-chat-list-item" style="align-items:flex-start;">' +
            '<img class="qaq-chat-list-avatar" src="' + esc(p.avatar || getDefaultAvatar()) + '">' +
            '<div class="qaq-chat-list-info">' +
                '<div class="qaq-chat-list-top-row"><div class="qaq-chat-list-name">' + esc(p.name) + '</div><div class="qaq-chat-list-time">' + fmtTime(p.time, 'MM-DD HH:mm') + '</div></div>' +
                '<div class="qaq-chat-list-preview" style="white-space:normal;line-height:1.7;">' + esc(p.text) + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}
function renderMineList() {
    var list = qs('qaq-chat-contact-list');
    if (!list) return;
    var s = getStore();
    var me = s.myProfile || {};
    var deletedCount = (s.deletedPool || []).length;
    var totalCount = Object.keys(s.contacts || {}).filter(function (id) {
        return !s.contacts[id].deleted;
    }).length;
    list.innerHTML =
        '<div style="padding:16px;">' +
            '<div class="qaq-chat-set-card" style="margin-bottom:12px;">' +
                '<div class="qaq-chat-set-bd" style="padding:14px;">' +
                    '<div style="display:flex;gap:12px;align-items:center;">' +
                        '<img src="' + esc(me.avatar || getDefaultAvatar()) + '" style="width:54px;height:54px;border-radius:12px;object-fit:cover;flex-shrink:0;">' +
                        '<div style="min-width:0;flex:1;">' +
                            '<div style="font-size:15px;font-weight:700;color:inherit;">' + esc(me.nickname || '学生') + '</div>' +
                            '<div style="font-size:12px;color:#999;margin-top:4px;line-height:1.6;">' + esc(me.persona || '暂无人设') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="qaq-chat-set-card">' +
                '<div class="qaq-chat-set-bd" style="padding:0;">' +
                    '<div class="qaq-settings-item" id="qaq-chat-mine-edit">' +
                        '<div class="qaq-settings-item-icon">' + icon('user-round-pen', 18) + '</div>' +
                        '<div class="qaq-settings-item-text">编辑我的资料</div>' +
                    '</div>' +
                    '<div class="qaq-settings-item" id="qaq-chat-mine-requests">' +
                        '<div class="qaq-settings-item-icon">' + icon('user-plus', 18) + '</div>' +
                        '<div class="qaq-settings-item-text">好友申请</div>' +
                        '<div style="font-size:11px;color:#999;">' + ((s.friendRequests || []).filter(function (x) { return !x.done; }).length) + ' 条</div>' +
                    '</div>' +
                    '<div class="qaq-settings-item" id="qaq-chat-mine-recover">' +
                        '<div class="qaq-settings-item-icon">' + icon('undo-2', 18) + '</div>' +
                        '<div class="qaq-settings-item-text">恢复被删除角色</div>' +
                        '<div style="font-size:11px;color:#999;">' + deletedCount + ' 个</div>' +
                    '</div>' +
                    '<div class="qaq-settings-item">' +
                        '<div class="qaq-settings-item-icon">' + icon('users', 18) + '</div>' +
                        '<div class="qaq-settings-item-text">当前联系人</div>' +
                        '<div style="font-size:11px;color:#999;">' + totalCount + ' 个</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    window.lucide && window.lucide.createIcons && window.lucide.createIcons();
    qs('qaq-chat-mine-edit').onclick = editMyProfile;
    qs('qaq-chat-mine-requests').onclick = showFriendRequests;
    qs('qaq-chat-mine-recover').onclick = showDeletedPool;
}

function openContactQuickMenu(cid) {
    var s = getStore();
    var c = s.contacts[cid];
    if (!c) return;
    openModal('联系人操作',
        '<div class="qaq-custom-select-list">' +
            '<div class="qaq-custom-select-option" id="qaq-chat-act-open"><span>打开聊天</span></div>' +
            '<div class="qaq-custom-select-option" id="qaq-chat-act-top"><span>' + (c.top ? '取消置顶' : '置顶聊天') + '</span></div>' +
            '<div class="qaq-custom-select-option" id="qaq-chat-act-block"><span>' + (c.blocked ? '取消拉黑' : '拉黑角色') + '</span></div>' +
            '<div class="qaq-custom-select-option" id="qaq-chat-act-delete"><span style="color:#d9534f;">删除角色</span></div>' +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                qs('qaq-chat-act-open').onclick = function () {
                    window.qaqCloseModal && window.qaqCloseModal();
                    openChat(cid);
                };
                qs('qaq-chat-act-top').onclick = function () {
                    c.top = !c.top;
                    setStore(s);
                    window.qaqCloseModal && window.qaqCloseModal();
                    renderMainBody();
                };
                qs('qaq-chat-act-block').onclick = function () {
                    c.blocked = !c.blocked;
                    setStore(s);
                    window.qaqCloseModal && window.qaqCloseModal();
                    renderMainBody();
                    if (activeContactId === cid) renderChatWindow();
                };
                qs('qaq-chat-act-delete').onclick = function () {
                    window.qaqCloseModal && window.qaqCloseModal();
                    deleteContact(cid);
                };
            }
        }
    );
}
function deleteContact(cid) {
    var s = getStore();
    var c = s.contacts[cid];
    if (!c) return;
    openModal('删除角色',
        '<div style="font-size:13px;color:#666;line-height:1.8;">确认删除「' + esc(getDisplayName(c)) + '」以及其聊天记录？<br>删除后可在“我的 - 恢复被删除角色”中找回联系人，但聊天记录将清空。</div>',
        {
            confirmText: '删除',
            onConfirm: function () {
                s.deletedPool.unshift({
                    id: c.id,
                    avatar: c.avatar,
                    nickname: c.nickname,
                    remark: c.remark,
                    deletedAt: Date.now()
                });
                c.deleted = true;
                s.messages[cid] = [];
                setStore(s);
                if (activeContactId === cid) {
                    activeContactId = null;
                    qs('qaq-chat-window-page').classList.remove('qaq-page-show');
                    qs('qaq-chat-settings-page').classList.remove('qaq-page-show');
                    qs('qaq-chat-main-page').classList.add('qaq-page-show');
                }
                renderMainBody();
                toast('角色已删除');
            }
        }
    );
}
function showDeletedPool() {
    var s = getStore();
    var arr = s.deletedPool || [];
    if (!arr.length) {
        toast('暂无可恢复角色');
        return;
    }
    openModal('恢复被删除角色',
        '<div class="qaq-custom-select-list">' +
        arr.map(function (x) {
            return '<div class="qaq-custom-select-option" data-qaq-restore="' + x.id + '">' +
                '<span>' + esc(x.remark || x.nickname || '未命名角色') + '</span>' +
                '<span style="font-size:11px;color:#999;">恢复</span>' +
            '</div>';
        }).join('') +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                document.querySelectorAll('[data-qaq-restore]').forEach(function (el) {
                    el.onclick = function () {
                        var id = this.getAttribute('data-qaq-restore');
                        var hit = s.contacts[id];
                        if (hit) hit.deleted = false;
                        s.deletedPool = s.deletedPool.filter(function (x) { return x.id !== id; });
                        setStore(s);
                        window.qaqCloseModal && window.qaqCloseModal();
                        renderMainBody();
                        toast('已恢复');
                    };
                });
            }
        }
    );
}
function showFriendRequests() {
    var s = getStore();
    var arr = (s.friendRequests || []).filter(function (x) { return !x.done; });
    if (!arr.length) {
        toast('暂无好友申请');
        return;
    }
    openModal('好友申请',
        '<div class="qaq-custom-select-list">' +
        arr.map(function (x, idx) {
            return '<div class="qaq-custom-select-option" style="display:block;">' +
                '<div style="font-size:13px;color:#333;">' + esc(x.name) + ' 请求添加好友</div>' +
                '<div style="font-size:11px;color:#999;margin-top:4px;">申请时间：' + fmtTime(x.createdAt, 'MM-DD HH:mm') + '</div>' +
                '<div style="display:flex;gap:8px;margin-top:8px;">' +
                    '<button class="qaq-modal-btn qaq-modal-btn-confirm" data-qaq-fr-ok="' + idx + '" style="height:32px;font-size:12px;">通过</button>' +
                    '<button class="qaq-modal-btn qaq-modal-btn-cancel" data-qaq-fr-no="' + idx + '" style="height:32px;font-size:12px;">忽略</button>' +
                '</div>' +
            '</div>';
        }).join('') +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                document.querySelectorAll('[data-qaq-fr-ok]').forEach(function (el) {
                    el.onclick = function (e) {
                        e.stopPropagation();
                        var item = arr[parseInt(this.getAttribute('data-qaq-fr-ok'), 10)];
                        if (!item) return;
                        var real = s.friendRequests.find(function (x) { return x.id === item.id; });
                        if (real) real.done = true;
                        if (s.contacts[item.cid]) s.contacts[item.cid].blocked = false;
                        setStore(s);
                        window.qaqCloseModal && window.qaqCloseModal();
                        renderMainBody();
                        toast('已通过申请');
                    };
                });
                document.querySelectorAll('[data-qaq-fr-no]').forEach(function (el) {
                    el.onclick = function (e) {
                        e.stopPropagation();
                        var item = arr[parseInt(this.getAttribute('data-qaq-fr-no'), 10)];
                        if (!item) return;
                        var real = s.friendRequests.find(function (x) { return x.id === item.id; });
                        if (real) real.done = true;
                        setStore(s);
                        window.qaqCloseModal && window.qaqCloseModal();
                        renderMainBody();
                        toast('已忽略申请');
                    };
                });
            }
        }
    );
}
function editMyProfile() {
    var s = getStore();
    var me = s.myProfile || {};
    openModal('编辑我的资料',
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<div class="qaq-chat-set-lbl">头像</div>' +
            '<div style="display:flex;gap:8px;"><input class="qaq-modal-input" id="qaq-chat-my-avatar" value="' + esc(me.avatar || '') + '" placeholder="头像 URL 或本地 DataURL"><button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-my-avatar-upload" style="width:84px;height:38px;flex:none;">导入</button></div>' +
            '<div class="qaq-chat-set-lbl">昵称</div>' +
            '<input class="qaq-modal-input" id="qaq-chat-my-name" value="' + esc(me.nickname || '') + '">' +
            '<div class="qaq-chat-set-lbl">真名</div>' +
            '<input class="qaq-modal-input" id="qaq-chat-my-real" value="' + esc(me.realName || '') + '">' +
            '<div class="qaq-chat-set-lbl">人设</div>' +
            '<textarea class="qaq-modal-textarea" id="qaq-chat-my-persona" style="height:88px;">' + esc(me.persona || '') + '</textarea>' +
        '</div>',
        {
            confirmText: '保存',
            onConfirm: function () {
                me.avatar = (qs('qaq-chat-my-avatar').value || '').trim();
                me.nickname = (qs('qaq-chat-my-name').value || '').trim() || '学生';
                me.realName = (qs('qaq-chat-my-real').value || '').trim();
                me.persona = (qs('qaq-chat-my-persona').value || '').trim();
                s.myProfile = me;
                setStore(s);
                renderMineList();
                if (activeContactId) renderChatWindow();
                toast('已保存');
            },
            afterRender: function () {
                qs('qaq-chat-my-avatar-upload').onclick = function () {
                    chooseImage('qaq-chat-my-avatar');
                };
            }
        }
    );
}

function openChat(cid) {
    activeContactId = cid;
    qs('qaq-chat-main-page').classList.remove('qaq-page-show');
    qs('qaq-chat-settings-page').classList.remove('qaq-page-show');
    qs('qaq-chat-window-page').classList.add('qaq-page-show');
    renderChatWindow();
}
function closeChatWindow() {
    qs('qaq-chat-window-page').classList.remove('qaq-page-show');
    qs('qaq-chat-settings-page').classList.remove('qaq-page-show');
    qs('qaq-chat-main-page').classList.add('qaq-page-show');
    renderMainBody();
}
function renderChatWindow() {
    var c = getActiveContact();
    if (!c) return;
    var cfg = getMergedChatConfig(c);
    applyPageThemeClass(cfg.uiTheme || getGlobalTheme());
    loadCustomFont(cfg.uiFontUrl || '', function () {
        applyRuntimeStyle(cfg);
        qs('qaq-chat-win-title').textContent = getDisplayName(c);
        renderChatFriendTip();
        renderChatMessageList();
        renderChatInputArea();
        renderChatExtMenu();
    });
}
function renderChatFriendTip() {
    var wrap = qs('qaq-chat-friend-request-tip-wrap');
    if (!wrap) return;
    var s = getStore();
    var hasPending = (s.friendRequests || []).some(function (x) {
        return x.cid === activeContactId && !x.done;
    });
    wrap.innerHTML = '';
    if (hasPending) {
        wrap.innerHTML = '<div style="margin:8px 16px 0;padding:10px 12px;border-radius:10px;background:rgba(91,155,213,.08);font-size:12px;color:#5b9bd5;cursor:pointer;">该角色向你发来了好友申请，点击查看</div>';
        wrap.firstChild.onclick = showFriendRequests;
    }
}
function shouldShowAvatar(arr, idx, mode) {
    if (mode === 'hide_all') return false;
    if (mode === 'all') return true;
    if (mode === 'first') return idx === 0 || arr[idx - 1].isMe !== arr[idx].isMe;
    if (mode === 'last') return idx === arr.length - 1 || arr[idx + 1].isMe !== arr[idx].isMe;
    return true;
}
function buildBubbleTailStyle(isMe, radius) {
    radius = radius == null ? 16 : radius;
    if (isMe) return 'border-radius:' + radius + 'px 4px ' + radius + 'px ' + radius + 'px;';
    return 'border-radius:4px ' + radius + 'px ' + radius + 'px ' + radius + 'px;';
}
function renderChatMessageList() {
    var list = qs('qaq-chat-msg-list');
    if (!list) return;
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    var me = s.myProfile || {};
    var cfg = getMergedChatConfig(c);
    var arr = getMessages(activeContactId);
    var showTime = !!cfg.uiShowTime;
    var timeFmt = cfg.uiTimeFmt || 'HH:mm';
    var timePos = cfg.uiTimePos || 'top';
    var transMode = cfg.translateEnabled === false ? 'hide' : (cfg.translateMode || 'in_bottom');
    var html = arr.map(function (m, idx) {
        var isMe = !!m.isMe;
        var avatar = isMe ? (me.avatar || getDefaultAvatar()) : (c.avatar || getDefaultAvatar());
        var bubbleText = esc(m.text || '');
        var transText = m.translated ? esc(m.translated) : '';
        var bubbleInner = '';
        var outerTop = '';
        var outerBottom = '';
        if (transMode === 'in_top' && transText) bubbleInner += '<div class="qaq-chat-trans">' + transText + '</div>';
        bubbleInner += bubbleText;
        if (transMode === 'in_bottom' && transText) bubbleInner += '<div class="qaq-chat-trans">' + transText + '</div>';
        if (transMode === 'out_top' && transText) outerTop = '<div class="qaq-chat-trans">' + transText + '</div>';
        if (transMode === 'out_bottom' && transText) outerBottom = '<div class="qaq-chat-trans">' + transText + '</div>';
        var timeHtml = showTime ? '<div class="qaq-chat-msg-time">' + fmtTime(m.time, timeFmt) + '</div>' : '';
        var topTime = '';
        var bottomTime = '';
        var innerTime = '';
        if (showTime) {
            if (timePos === 'top' || timePos === 'avatar_top') topTime = timeHtml;
            else if (timePos === 'bottom' || timePos === 'avatar_bottom' || timePos === 'bubble_outer') bottomTime = timeHtml;
            else if (timePos === 'bubble_inner') innerTime = '<div style="font-size:10px;color:#bbb;margin-top:4px;">' + fmtTime(m.time, timeFmt) + '</div>';
        }
        var avatarHtml = shouldShowAvatar(arr, idx, cfg.uiAvatarShow || 'all')
            ? '<img class="qaq-chat-bubble-avatar" src="' + esc(avatar) + '" style="border-radius:' + (cfg.uiAvatarRadius == null ? 10 : cfg.uiAvatarRadius) + 'px;">'
            : '';
        return '<div class="qaq-chat-row ' + (isMe ? 'qaq-row-me' : 'qaq-row-other') + '">' +
            avatarHtml +
            '<div class="qaq-chat-bubble-wrap' + ((transMode === 'out_top' || transMode === 'out_bottom') ? ' qaq-has-outer-tr' : '') + '">' +
                topTime +
                outerTop +
                '<div class="qaq-chat-bubble" style="' + buildBubbleTailStyle(isMe, cfg.uiBubbleRadius) + 'font-size:' + (cfg.uiFontSize || '14px') + ';color:' + (cfg.uiFontColor || '#333333') + ';">' + bubbleInner + innerTime + '</div>' +
                outerBottom +
                bottomTime +
            '</div>' +
        '</div>';
    }).join('');
    if (!arr.length) {
        html = '<div style="text-align:center;color:#aaa;padding:40px 20px;font-size:13px;">开始聊天吧</div>';
    }
    list.innerHTML = html;
    setTimeout(function () {
        list.scrollTop = list.scrollHeight;
    }, 16);
}
function renderChatInputArea() {
    var c = getActiveContact();
    if (!c) return;
    var cfg = getMergedChatConfig(c);
    var recv = qs('qaq-chat-recv-ai-btn');
    var menuBtn = qs('qaq-chat-toggle-menu');
    var ext = qs('qaq-chat-ext-menu');
    var row = qs('qaq-chat-input-row');
    var area = qs('qaq-chat-input-area');
    var tip = qs('qaq-chat-block-tip');
    if (recv) recv.style.display = cfg.uiHideReplyBtn ? 'none' : '';
    if (menuBtn) menuBtn.style.display = cfg.uiHideMenuBtn ? 'none' : '';
    if (tip) {
        if (c.blocked) {
            tip.style.display = '';
            tip.textContent = '你已拉黑该角色，不能发送消息，但仍可查看聊天记录';
        } else if (isInDndRange(cfg)) {
            tip.style.display = '';
            tip.textContent = '当前处于勿扰时间段';
        } else {
            tip.style.display = 'none';
        }
    }
    if (ext && row && area) {
        if ((cfg.uiMenuPos || 'top') === 'bottom') {
            if (row.nextSibling !== ext) area.insertBefore(ext, row.nextSibling);
        } else {
            if (row.previousSibling !== ext) area.insertBefore(ext, row);
        }
    }
}
function renderChatExtMenu() {
    var ext = qs('qaq-chat-ext-menu');
    if (!ext) return;
    var items = [
        { id: 'sticker', text: '表情', icon: 'smile' },
        { id: 'voice', text: '发送语音', icon: 'mic' },
        { id: 'photo', text: '照片', icon: 'image' },
        { id: 'transfer', text: '转账', icon: 'wallet' },
        { id: 'delivery', text: '快递', icon: 'package' },
        { id: 'offline', text: '线下', icon: 'handshake' },
        { id: 'theater', text: '剧场', icon: 'clapperboard' },
        { id: 'video', text: '视频通话', icon: 'video' },
        { id: 'voicecall', text: '语音通话', icon: 'phone' },
        { id: 'location', text: '位置', icon: 'map-pinned' },
        { id: 'diary', text: '日记', icon: 'book-open' }
    ];
    ext.innerHTML = items.map(function (x) {
        return '<div class="qaq-ext-item" data-qaq-ext="' + x.id + '">' +
            '<div class="qaq-ext-icon">' + icon(x.icon, 22) + '</div>' +
            '<div class="qaq-ext-label">' + x.text + '</div>' +
        '</div>';
    }).join('');
    window.lucide && window.lucide.createIcons && window.lucide.createIcons();
    ext.querySelectorAll('[data-qaq-ext]').forEach(function (el) {
        el.onclick = function () {
            handleExtAction(this.getAttribute('data-qaq-ext'));
        };
    });
}
function handleExtAction(type) {
    var map = {
        sticker: '表情功能开发中',
        voice: '发送语音功能开发中',
        photo: '照片功能开发中',
        transfer: '转账功能开发中',
        delivery: '快递功能开发中',
        offline: '线下功能开发中',
        theater: '剧场功能开发中',
        video: '视频通话功能开发中',
        voicecall: '语音通话功能开发中',
        location: '位置功能开发中',
        diary: '日记功能开发中'
    };
    toast(map[type] || '功能开发中');
}

function sendMessage() {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    if (c.blocked) {
        toast('该角色已被拉黑');
        return;
    }
    if (isInDndRange(c)) {
        toast('当前处于勿扰时间段');
        return;
    }
    var box = qs('qaq-chat-input-box');
    if (!box) return;
    var text = (box.value || '').trim();
    if (!text) return;
    var arr = ensureMessageArr(s, activeContactId);
    arr.push({
        id: uid('msg'),
        type: 'text',
        isMe: true,
        text: text,
        translated: '',
        time: Date.now()
    });
    box.value = '';
    setStore(s);
    renderChatMessageList();
    renderMainBody();
}
async function receiveAI() {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;

    if (c.blocked) {
        toast('该角色已被拉黑');
        return;
    }
    if (isInDndRange(c)) {
        toast('当前处于勿扰时间段');
        return;
    }

    var apiUrl = c.apiUrl || (s.globalApi && s.globalApi.url) || '';
    var apiKey = c.apiKey || (s.globalApi && s.globalApi.key) || '';
    var apiModel = c.apiModel || (s.globalApi && s.globalApi.model) || '';

    if (!apiUrl || !apiKey || !apiModel) {
        toast('请先配置专属 API 或全局 API');
        return;
    }

    var cfg = getMergedChatConfig(c);
    var history = getMessages(activeContactId)
        .slice(-(parseInt(cfg.memMax, 10) || 20))
        .map(function (m) {
            return {
                role: m.isMe ? 'user' : 'assistant',
                content: m.text || ''
            };
        });

    function buildSystemPrompt() {
        var me = s.myProfile || {};
        var lines = [];
        lines.push('你正在一个长期聊天应用中扮演固定角色。');
        lines.push('你不是助手，不是系统，不是工具。你是一个真实自然的人。');
        lines.push('角色昵称：' + (c.nickname || '未命名角色'));
        lines.push('角色备注：' + (c.remark || c.nickname || ''));
        lines.push('角色人设：' + (c.persona || '自然聊天对象'));
        lines.push('用户昵称：' + (me.nickname || '学生'));
        lines.push('用户人设：' + (me.persona || '正在学习语言的用户'));
        if (c.worldBookName) lines.push('当前绑定世界书：' + c.worldBookName);
        lines.push('要求：');
        lines.push('1. 回复自然，像真实聊天。');
        lines.push('2. 不要自称人工智能、模型、助手。');
        lines.push('3. 允许口语化，避免模板化。');
        if (cfg.translateEnabled !== false && cfg.translateMode !== 'hide') {
            lines.push('4. 输出 JSON，格式必须是：{"original_text":"原文","translation":"翻译"}');
        } else {
            lines.push('4. 直接输出纯文本，不要 JSON，不要 markdown。');
        }
        return lines.join('\n');
    }

    try {
        toast('正在接收回复');

        var payload = {
            model: apiModel,
            temperature: 0.8,
            messages: [
                { role: 'system', content: buildSystemPrompt() }
            ].concat(history)
        };

        var resp = await fetch(normalizeUrl(apiUrl) + '/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        var data = await resp.json();
        var content = ((((data || {}).choices || [])[0] || {}).message || {}).content || '';
        content = String(content || '').trim();

        if (!content) {
            toast('回复为空');
            return;
        }

        var text = content;
        var translated = '';

        if (cfg.translateEnabled !== false && cfg.translateMode !== 'hide') {
            try {
                var parsed = JSON.parse(content);
                text = parsed.original_text || content;
                translated = parsed.translation || '';
            } catch (e) {
                text = content;
                translated = '';
            }
        }

        ensureMessageArr(s, activeContactId).push({
            id: uid('msg'),
            type: 'text',
            isMe: false,
            text: text,
            translated: translated,
            time: Date.now()
        });

        if (window.qaqAddTokens) {
            var tokenGuess = Math.ceil((JSON.stringify(payload).length + content.length) / 4);
            window.qaqAddTokens(tokenGuess);
        }

        setStore(s);
        renderChatMessageList();
        renderMainBody();
    } catch (e) {
        console.error('[qaq-chat] AI reply error:', e);
        toast('请求失败');
    }
}
    
function openAddMenu() {
    openModal('新建',
        '<div class="qaq-custom-select-list">' +
            '<div class="qaq-custom-select-option" id="qaq-chat-add-friend"><span>添加好友</span></div>' +
            '<div class="qaq-custom-select-option" id="qaq-chat-add-group"><span>添加群聊</span></div>' +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                qs('qaq-chat-add-friend').onclick = function () {
                    window.qaqCloseModal && window.qaqCloseModal();
                    openAddFriendDialog();
                };
                qs('qaq-chat-add-group').onclick = function () {
                    window.qaqCloseModal && window.qaqCloseModal();
                    toast('群聊功能开发中');
                };
            }
        }
    );
}
function openAddFriendDialog() {
    openModal('添加好友',
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<div class="qaq-chat-set-lbl">头像</div>' +
            '<div style="display:flex;gap:8px;"><input class="qaq-modal-input" id="qaq-chat-add-avatar" placeholder="头像 URL 或 DataURL"><button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-chat-add-avatar-btn" style="width:84px;height:38px;flex:none;">导入</button></div>' +
            '<div class="qaq-chat-set-lbl">昵称</div>' +
            '<input class="qaq-modal-input" id="qaq-chat-add-name" placeholder="例如：Alice">' +
            '<div class="qaq-chat-set-lbl">备注</div>' +
            '<input class="qaq-modal-input" id="qaq-chat-add-remark" placeholder="备注优先显示">' +
            '<div class="qaq-chat-set-lbl">真实名字</div>' +
            '<input class="qaq-modal-input" id="qaq-chat-add-real" placeholder="可选">' +
            '<div class="qaq-chat-set-lbl">人设</div>' +
            '<textarea class="qaq-modal-textarea" id="qaq-chat-add-persona" style="height:88px;" placeholder="例如：耐心、真实、擅长口语对练"></textarea>' +
        '</div>',
        {
            confirmText: '创建',
            onConfirm: function () {
                var s = getStore();
                var id = uid('contact');
                var theme = getGlobalTheme();
                var bub = getBubbleThemeDefaults(theme);
                var nickname = (qs('qaq-chat-add-name').value || '').trim() || '未命名联系人';
                s.contacts[id] = {
                    id: id,
                    avatar: (qs('qaq-chat-add-avatar').value || '').trim(),
                    nickname: nickname,
                    remark: (qs('qaq-chat-add-remark').value || '').trim(),
                    realName: (qs('qaq-chat-add-real').value || '').trim(),
                    persona: (qs('qaq-chat-add-persona').value || '').trim() || '自然、真实的聊天对象',
                    worldBookId: '',
                    worldBookName: '',
                    activeSticker: false,
                    translateEnabled: true,
                    translateMode: 'in_bottom',
                    memMax: 20,
                    bindGroupMemory: false,
                    bindVideoMemory: false,
                    bindVoiceMemory: false,
                    bindOfflineMemory: false,
                    summaryMemory: false,
                    summaryCount: 50,
                    allowVideoCall: true,
                    allowVoiceCall: true,
                    allowAutoMessage: false,
                    autoMessageGap: 60,
                    allowBlockUser: false,
                    allowDeleteUser: false,
                    allowAutoDiary: false,
                    apiUrl: '',
                    apiKey: '',
                    apiModel: '',
                    voiceUrl: '',
                    voiceKey: '',
                    voiceModel: 'speech-02-hd',
                    voiceSpeed: 0.9,
                    imageUrl: '',
                    imageKey: '',
                    imageModel: '',
                    imagePrompt: '',
                    imageNegative: '',
                    top: false,
                    blocked: false,
                    deleted: false,
                    dnd: false,
                    dndTime: '',
                    uiTheme: theme,
                    uiBubbleMy: bub.my,
                    uiBubbleOther: bub.other,
                    uiAvatarShow: 'all',
                    uiShowTime: true,
                    uiTimePos: 'top',
                    uiTimeFmt: 'HH:mm',
                    uiHideReplyBtn: false,
                    uiHideMenuBtn: false,
                    uiMenuPos: 'top',
                    uiAvatarRadius: 10,
                    uiBubbleRadius: 16,
                    uiFontUrl: '',
                    uiFontSize: '14px',
                    uiFontColor: '#333333',
                    uiGlobalCss: '',
                    uiBubbleCss: ''
                };
                s.messages[id] = [{
                    id: uid('msg'),
                    type: 'text',
                    isMe: false,
                    text: '你好，很高兴认识你。',
                    translated: '你好，很高兴认识你。',
                    time: Date.now()
                }];
                setStore(s);
                renderMainBody();
                toast('好友已创建');
            },
            afterRender: function () {
                qs('qaq-chat-add-avatar-btn').onclick = function () {
                    chooseImage('qaq-chat-add-avatar');
                };
            }
        }
    );
}

function openChatSettings() {
    if (!activeContactId) return;
    renderSettingsPage();
    qs('qaq-chat-window-page').classList.remove('qaq-page-show');
    qs('qaq-chat-settings-page').classList.add('qaq-page-show');
}

function renderSettingsPage() {
    var c = getActiveContact();
    var s = getStore();
    if (!c) return;
    var me = s.myProfile || {};
    var cfg = getMergedChatConfig(c);
    applyPageThemeClass(cfg.uiTheme || getGlobalTheme());
    var body = qs('qaq-chat-settings-scroll');
    if (!body) return;

    body.innerHTML = [
        renderSettingCard('对方设置', 'open', [
            settingImageRow('头像', 'qaq-chs-o-avatar', c.avatar || ''),
            settingInput('昵称', 'qaq-chs-o-name', c.nickname || '', '角色昵称'),
            settingInput('备注', 'qaq-chs-o-remark', c.remark || '', '备注优先显示'),
            settingInput('真实名字', 'qaq-chs-o-real', c.realName || '', '真实名字'),
            settingTextarea('具体人设', 'qaq-chs-o-persona', c.persona || '', 78),
            settingSelectBtn('绑定世界书', 'qaq-chs-o-worldbook-btn', c.worldBookName || '未绑定'),
            settingHidden('qaq-chs-o-worldbook', c.worldBookId || ''),
            settingToggle('是否主动发表情包', 'qaq-chs-o-sticker', !!c.activeSticker),
            settingToggle('聊天双语翻译功能', 'qaq-chs-o-trans-enable', c.translateEnabled !== false),
            settingSelectBtn('翻译显示模式', 'qaq-chs-o-trans-mode-btn', getTranslateLabel(c.translateMode || 'in_bottom')),
            settingHidden('qaq-chs-o-trans-mode', c.translateMode || 'in_bottom'),
            settingInput('最大记忆条数', 'qaq-chs-o-mem-max', String(c.memMax || 20), '1-999', 'number'),
            settingToggle('挂载群聊记忆', 'qaq-chs-o-bind-group', !!c.bindGroupMemory),
            settingToggle('挂载视频通话记忆', 'qaq-chs-o-bind-video', !!c.bindVideoMemory),
            settingToggle('挂载语音通话记忆', 'qaq-chs-o-bind-voice', !!c.bindVoiceMemory),
            settingToggle('挂载线下记忆', 'qaq-chs-o-bind-offline', !!c.bindOfflineMemory),
            settingToggle('总结记忆功能', 'qaq-chs-o-summary', !!c.summaryMemory),
            settingInput('总结条数', 'qaq-chs-o-summary-count', String(c.summaryCount || 50), '50-100', 'number'),
            settingToggle('允许主动发起视频通话', 'qaq-chs-o-video-call', !!c.allowVideoCall),
            settingToggle('允许主动发起语音通话', 'qaq-chs-o-voice-call', !!c.allowVoiceCall),
            settingToggle('允许主动发送消息', 'qaq-chs-o-auto-msg', !!c.allowAutoMessage),
            settingInput('主动消息间隔（分钟）', 'qaq-chs-o-auto-gap', String(c.autoMessageGap || 60), '分钟', 'number'),
            settingToggle('允许角色拉黑用户', 'qaq-chs-o-block-user', !!c.allowBlockUser),
            settingToggle('允许角色删除用户', 'qaq-chs-o-delete-user', !!c.allowDeleteUser),
            settingToggle('允许角色主动生成日记', 'qaq-chs-o-auto-diary', !!c.allowAutoDiary),

            settingPresetBar('api'),
            settingInput('聊天专属 API URL', 'qaq-chs-o-api-url', c.apiUrl || '', '留空则使用全局'),
            settingInput('聊天专属 API Key', 'qaq-chs-o-api-key', c.apiKey || '', '留空则使用全局', 'password'),
            settingInputWithBtn('聊天专属 Model', 'qaq-chs-o-api-model', c.apiModel || '', '点击拉取模型', 'qaq-chs-fetch-api-model'),

            settingPresetBar('voice'),
            settingInput('声音 API URL', 'qaq-chs-o-voice-url', c.voiceUrl || '', '支持 minimax'),
            settingInput('声音 API Key', 'qaq-chs-o-voice-key', c.voiceKey || '', '语音 key', 'password'),
            settingSelectBtn('语音模型', 'qaq-chs-o-voice-model-btn', c.voiceModel || 'speech-02-hd'),
            settingHidden('qaq-chs-o-voice-model', c.voiceModel || 'speech-02-hd'),
            settingRange('调整语速', 'qaq-chs-o-voice-speed', c.voiceSpeed == null ? 0.9 : c.voiceSpeed, 0.6, 1.2, 0.1),

            settingPresetBar('image'),
            settingInput('生图 API URL', 'qaq-chs-o-img-url', c.imageUrl || '', '支持 openai 图片接口'),
            settingInput('生图 API Key', 'qaq-chs-o-img-key', c.imageKey || '', '图片 key', 'password'),
            settingInputWithBtn('生图模型', 'qaq-chs-o-img-model', c.imageModel || '', '点击拉取模型', 'qaq-chs-fetch-img-model'),
            settingTextarea('生图提示词', 'qaq-chs-o-img-prompt', c.imagePrompt || '', 64),
            settingTextarea('生图负向提示词', 'qaq-chs-o-img-negative', c.imageNegative || '', 64)
        ]),
        renderSettingCard('我方设置', 'closed', [
            settingImageRow('我方头像', 'qaq-chs-m-avatar', me.avatar || ''),
            settingInput('我方昵称', 'qaq-chs-m-name', me.nickname || '', '你的昵称'),
            settingInput('我方真名', 'qaq-chs-m-real', me.realName || '', '你的真名'),
            settingTextarea('具体人设', 'qaq-chs-m-persona', me.persona || '', 78),
            settingPresetBar('persona')
        ]),
        renderSettingCard('美化设置', 'closed', [
            settingColorRow('我的气泡颜色', 'qaq-chs-u-bubble-my', cfg.uiBubbleMy || getBubbleThemeDefaults(cfg.uiTheme).my),
            settingColorRow('对方气泡颜色', 'qaq-chs-u-bubble-other', cfg.uiBubbleOther || getBubbleThemeDefaults(cfg.uiTheme).other),
            settingSelectBtn('主题颜色', 'qaq-chs-u-theme-btn', getThemeLabel(cfg.uiTheme || getGlobalTheme())),
            settingHidden('qaq-chs-u-theme', cfg.uiTheme || getGlobalTheme()),
            settingSelectBtn('头像显示设置', 'qaq-chs-u-avatar-show-btn', getAvatarShowLabel(cfg.uiAvatarShow || 'all')),
            settingHidden('qaq-chs-u-avatar-show', cfg.uiAvatarShow || 'all'),
            settingToggle('显示时间戳', 'qaq-chs-u-show-time', !!cfg.uiShowTime),
            settingSelectBtn('时间戳位置', 'qaq-chs-u-time-pos-btn', getTimePosLabel(cfg.uiTimePos || 'top')),
            settingHidden('qaq-chs-u-time-pos', cfg.uiTimePos || 'top'),
            settingSelectBtn('时间戳格式', 'qaq-chs-u-time-fmt-btn', cfg.uiTimeFmt || 'HH:mm'),
            settingHidden('qaq-chs-u-time-fmt', cfg.uiTimeFmt || 'HH:mm'),
            settingToggle('隐藏回复按钮', 'qaq-chs-u-hide-recv', !!cfg.uiHideReplyBtn),
            settingToggle('隐藏菜单栏按钮', 'qaq-chs-u-hide-menu', !!cfg.uiHideMenuBtn),
            settingSelectBtn('菜单位置', 'qaq-chs-u-menu-pos-btn', getMenuPosLabel(cfg.uiMenuPos || 'top')),
            settingHidden('qaq-chs-u-menu-pos', cfg.uiMenuPos || 'top'),
            settingRange('头像圆角', 'qaq-chs-u-avatar-radius', cfg.uiAvatarRadius == null ? 10 : cfg.uiAvatarRadius, 0, 30, 1),
            settingRange('气泡圆角', 'qaq-chs-u-bubble-radius', cfg.uiBubbleRadius == null ? 16 : cfg.uiBubbleRadius, 0, 30, 1),
            settingFontRow('字体 URL', 'qaq-chs-u-font-url', cfg.uiFontUrl || ''),
            settingRange('字体大小', 'qaq-chs-u-font-size', parseInt(cfg.uiFontSize || '14px', 10) || 14, 10, 24, 1),
            settingColorRow('字体颜色', 'qaq-chs-u-font-color', cfg.uiFontColor || '#333333'),
            settingPresetBar('globalCss'),
            settingTextarea('全局 CSS', 'qaq-chs-u-global-css', cfg.uiGlobalCss || '', 88),
            settingPresetBar('bubbleCss'),
            settingTextarea('气泡 CSS', 'qaq-chs-u-bubble-css', cfg.uiBubbleCss || '', 88)
        ]),
        renderSettingCard('聊天记录', 'closed', [
            '<button class="qaq-chat-action-btn" id="qaq-chat-history-import">导入聊天记录</button>',
            '<button class="qaq-chat-action-btn" id="qaq-chat-history-export">导出聊天记录</button>',
            '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-history-clear">清空聊天记录</button>'
        ]),
        renderSettingCard('其他', 'closed', [
            settingToggle('角色勿扰', 'qaq-chs-x-dnd', !!c.dnd),
            settingSelectBtn('勿扰时间', 'qaq-chs-x-dnd-time-btn', c.dndTime || '点击设置'),
            settingHidden('qaq-chs-x-dnd-time', c.dndTime || ''),
            settingToggle('拉黑角色', 'qaq-chs-x-blocked', !!c.blocked),
            '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-delete-contact-btn">删除角色</button>',
            '<button class="qaq-chat-action-btn" id="qaq-chat-recover-contact-btn">尝试恢复删除入口</button>'
        ]),
        '<button class="qaq-chat-set-save" id="qaq-chat-settings-save-all">保存全部设置</button>'
    ].join('');

    bindSettingsEvents();
    previewSettingsToUI();
}
function renderSettingCard(title, state, innerList) {
    return '<div class="qaq-chat-set-card qaq-collapsible' + (state === 'closed' ? ' qaq-collapsed' : '') + '">' +
        '<div class="qaq-chat-set-hd qaq-collapse-trigger"><span>' + title + '</span><svg class="qaq-collapse-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg></div>' +
        '<div class="qaq-collapse-body"><div class="qaq-chat-set-bd">' + innerList.join('') + '</div></div>' +
    '</div>';
}
function settingInput(label, id, value, placeholder, type) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div><input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '"' + (type ? ' type="' + type + '"' : '') + '>';
}
function settingHidden(id, value) {
    return '<input type="hidden" id="' + id + '" value="' + esc(value || '') + '">';
}
function settingTextarea(label, id, value, height) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div><textarea class="qaq-chat-set-txt" id="' + id + '" style="height:' + (height || 72) + 'px;">' + esc(value || '') + '</textarea>';
}
function settingSelectBtn(label, id, text) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div><button class="qaq-chat-action-btn" id="' + id + '">' + esc(text || '请选择') + '</button>';
}
function settingToggle(label, id, on) {
    return '<div class="qaq-chat-set-row-tog"><span>' + label + '</span><div class="qaq-toggle' + (on ? ' qaq-toggle-on' : '') + '" id="' + id + '"><div class="qaq-toggle-knob"></div></div></div>';
}
function settingRange(label, id, value, min, max, step) {
    value = value == null ? min : value;
    return '<div class="qaq-chat-set-lbl">' + label + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
            '<input type="range" class="qaq-chat-slider" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" style="flex:1;">' +
            '<input class="qaq-chat-set-inp" id="' + id + '_val" type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" style="width:64px;">' +
        '</div>';
}
function settingInputWithBtn(label, id, value, placeholder, btnId) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div>' +
        '<div class="qaq-input-with-btn">' +
            '<input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '">' +
            '<button class="qaq-fetch-model-btn" id="' + btnId + '">拉</button>' +
        '</div>';
}
function settingImageRow(label, id, value) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '') + '" placeholder="图片 URL 或本地 DataURL">' +
            '<button class="qaq-upload-img-btn" data-qaq-image-target="' + id + '">导入</button>' +
        '</div>';
}
function settingFontRow(label, id, value) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '') + '" placeholder="字体 URL 或本地导入">' +
            '<button class="qaq-upload-font-btn" data-qaq-font-target="' + id + '">导入</button>' +
        '</div>';
}
function settingColorRow(label, id, value) {
    return '<div class="qaq-chat-set-lbl">' + label + '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<button class="qaq-color-pick-btn" id="' + id + '_btn" style="width:40px;height:36px;border-radius:8px;border:1px solid #ddd;background:' + esc(value || '#333333') + ';"></button>' +
            '<input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '#333333') + '">' +
        '</div>';
}
function settingPresetBar(type) {
    return '<div style="display:flex;gap:6px;margin-top:4px;">' +
        '<button class="qaq-preset-btn" data-qaq-preset-save="' + type + '">保存预设</button>' +
        '<button class="qaq-preset-btn" data-qaq-preset-load="' + type + '">导入预设</button>' +
    '</div>';
}
function bindRangePair(id) {
    var a = qs(id);
    var b = qs(id + '_val');
    if (!a || !b) return;

    a.oninput = function () {
        b.value = this.value;
        previewSettingsToUI();
    };
    b.oninput = function () {
        a.value = this.value;
        previewSettingsToUI();
    };
}
function bindSettingsEvents() {
    document.querySelectorAll('.qaq-collapse-trigger').forEach(function (el) {
        el.onclick = function () {
            this.parentNode.classList.toggle('qaq-collapsed');
        };
    });
    document.querySelectorAll('.qaq-toggle').forEach(function (el) {
        el.onclick = function (e) {
            e.stopPropagation();
            this.classList.toggle('qaq-toggle-on');
            previewSettings                     -uqaq-chs-u-bubble-radius',
        'qaq-chs-u-font-size'
    ].forEach(bindRangePair);

    document.querySelectorAll('[data-qaq-image-target]').forEach(function (el) {
        el.onclick = function () {
            chooseImage(this.getAttribute('data-qaq-image-target'));
        };
    });
    document.querySelectorAll('[data-qaq-font-target]').forEach(function (el) {
        el.onclick = function () {
            chooseFont(this.getAttribute('data-qaq-font-target'));
        };
    });

    if (qs('qaq_btn('qaq-chs-u-bubble-my_btn').onclick = function () {
            chooseColor('选择我的气泡颜色', qs('qaq-chs-u-bubble-my').value, function (v) {
                qs('qaq-chs-u-bubble-my').value = v;
                qs('qaq-chs-u-bubble-my_btn').style.background = v;
                previewSettingsToUI();
            });
        };
    }
    if (qs('qaq-chs-u-bubble-other_btn')) {
        qs('qaq-chs-u-bubble-other_btn').onclick = function () {
            chooseColor('选择对方气泡颜色', qs('-other {
 qs('qaq-chs-u vs v();
   -fontaq_btn {
',s-u-font-color').value, function (v) {
                qs('qaq-chs-u-font-color').value = v;
                qs('qaq-chs-u-font-color_btn').style.background = v;
                previewSettingsToUI();
            });
        };
    }

    qs('qaq-chs-o-worldbook-btn').onclick = chooseWorldBook;
    qs('qaq-chs-o-trans-mode-btn').onclick = function () {
        openSelect('翻译显示模式', [
            { label: '气泡内上方', value: 'in_top' },
            { label: '气泡内下方', value: 'in_bottom' },
            { label: '气泡外上方', value: 'out_top' },
            { label: '气泡外下方', value: 'out_bottom' },
            { label: '隐藏翻译', value: 'hide' }
        ], qs('qaq-chs-o-trans-mode').value, function (v) {
            qs').aqContentSettings };
    qs('qaq-chs-o-voice-model-btn').onclick = function () {
        openSelect('语speech                      .-urbo',
            'speech-2.6-hd',
            'speech-2.6-turbo',
            'speech-01-turbo'
        ].map(function (x) { return { label: x, value: x }; }), qs('qaq-chs-o-voice-model').value, function (v) {
            qs('qaq-chs-o-voice-model').value = v;
            qs('qaq-chs-o-voice-model-btn').textContent =   -theme       主题颜色', [
            { label: '暖阳', value: 'default' },
            { label: '冷雾', value: 'cool' },
            { label: '夜幕', value: 'dark' }
        ], qs('qaq-chs-u-theme').value, function ( {
            qs('qaq-chs-u-theme').value = v;
            qs('qaq-chs-u-theme-btn').textContent = getThemeLabel(v);
            previewSettingsToUI();
        });
    };
    qs('qaq-chs-u-avatar-show-btn').onclick = function () {
        openSelect('头像显示设置', [
            { label {隐藏 },
',           头像       qaq,aqvalue('-utextContent = getAvatarShowLabel(v);
            previewSettingsToUI();
        });
    };
    qs('qaq-ch-posonclick function       ('位置           :泡',top            label: '气泡下方', value: 'bottom' },
            { label: '气泡内侧', value: 'bubble_inner' },
            { label: '气泡外侧', value: 'bubble_outer' },
            { label: '头像上方', value: 'avatar_top' },
            { label: '头像下方', value: 'avatar_bottom' }
        ], qs('qaq-chs-u-time-pos').value, function (v) {
            qs('qaq-chs-u-time-pos').value = v;
            qs('qaq-chs-u-time-pos-btn').textContent = getTimePosLabel(v);
            previewSettingsToUI();
          -f function格式HH' { label: 'HH:mm:ss', value: 'HH:mm:ss' },
            { label: 'MM-DD HH:mm', value: 'MM-DD HH:mm' },
            { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' }
        ], qs('qaq-chs-u-time-fmt').value, function (v)s v-chtextUI('aq-chs-u-menu-pos-btn').onclick = function () {
        openSelect('菜单位置', [
            { label: '输入栏上方', value: 'top' },
            { label: '输入栏下方', value: 'bottom' },
            { label: '收在菜单栏里', value: 'inside' qs'). {
 qsq-ch-menuvalue;
qs-postextContent = getMenuPos(v preview       q-btn设置 stylecolumn +
-size时间-modal-dtime-sizeinput class="qaq-modal-input" id="qaq-chat-dnd-end" type="time">' +
                '<div style="font-size:11px;color:#999;">不设置则仅手动开启勿扰</div>' +
            '</div>',
            {
                confirmText: '确定',
                onConfirm: function () {
                    var a = (qs('qaq-chat-dnd-start').value || '').trim();
                    var b = (qs('qaq-chat-dnd-end').value || '').trim();
                    var val = (a && b) ? (a + '-' + b) : '';
                    qs('qaq-chs                   ';
s                    if ().splitaq sp('value       s fetchIntoInput('api'); };
    qs('qaq-chs-fetch-img-model').onclick = function () { fetchModelsIntoInput('image'); };

    document.querySelectorAll('[data-qaq-preset-save]').forEach(function (el) {
        el.onclick = function () {
            var type = this.getAttribute('data-qaq-preset-save');
            if (type === 'api') {
                savePreset('api', {
                    url: qs('qaq-chs-o-api-url').value,
                    key: qs('qaq-chs-o-api-key').value,
                    model: qs('qaq-chs-o-api-model').value
                });
            }
            if (type === 'voice') {
                savePreset('voice', {
                    url: qs('qaq-chs-o-voice-url').value,
                    key: qs('qaq-chs-o-voice-key').value,
                    model: qs('qaq-chs-o-voice-model').value,
                    speed: qs('qaq-chs-o-voice-speed_val').value
                });
            }
            if (type === 'image') {
                savePreset('image', {
                    url: qs('qaq-chs-o-img-url').value,
                    key: qs('qaq-chs-o-img-key').value,
                    model: qs('qaq-chs-o-img-model').value,
                    prompt: qs('qaq-chs-o-img-prompt').value,
                    negative: qs('qaq-chs-o-img-negative').value
                });
            }
            if (type === 'persona') {
                savePreset('persona', {
                    avatar: qs('qaq-chs-m-avatar').value,
                    nickname: qs('qaq-chs-m-name').value,
                    realName: qs('qaq-chs-m-real').value,
                    persona: qs('qaq-chs-m-persona').value
                });
            }
            if (type === 'globalCss') {
                savePreset('globalCss', { css: qs('qaq-chs-u-global-css').value });
            }
            if (type === 'bubbleCss') {
                savePreset('bubbleCss', { css: qs('qaq-chs-u-bubble-css').value });
            }
        };
    });
    document.querySelectorAll('[data-qaq-preset-load]').forEach(function (el) {
        el.onclick = function () {
            var type = this.getAttribute('data-qaq-preset-load');
            if (type === 'api') {
                loadPreset('api', function (d) {
                    qs('qaq-chs-o-api-url').value = d.url || '';
                    qs('qaq-chs-o-api-key').value = d.key || '';
                    qs('qaq-chs-o-api-model').value = d.model || '';
                });
            }
            if (type === 'voice') {
                loadPreset('voice', function (d) {
                    qs('qaq-chs-o-voice-url').value = d.url || '';
                    qs('qaq-chs-o-voice-key').value = d.key || '';
                    qs('qaq-chs-o-voice-model').value = d.model || 'speech-02-hd';
                    qs('qaq-chs-o-voice-model-btn').textContent = d.model || 'speech-02-hd';
                    qs('qaq-chs-o-voice-speed').value = d.speed || 0.9;
                    qs('qaq-chs-o-voice-speed_val').value = d.speed || 0.9;
                });
            }
            if (type === 'image') {
                loadPreset('image', function (d) {
                    qs('qaq-chs-o-img-url').value = d.url || '';
                    qs('qaq-chs-o-img-key').value = d.key || '';
                    qs('qaq-chs-o-img-model').value = d.model || '';
                    qs('qaq-chs-o-img-prompt').value = d.prompt || '';
                    qs('qaq-chs-o-img-negative').value = d.negative || '';
                });
            }
            if (type === 'persona') {
                loadPreset('persona', function (d) {
                    qs('qaq-chs-m-avatar').value = d.avatar || '';
                    qs('qaq-chs-m-name').value = d.nickname || '';
                    qs('qaq-chs-m-real').value = d.realName || '';
                    qs('qaq-chs-m-persona').value = d.persona || '';
                });
            }
            if (type === 'globalCss') {
                loadPreset('globalCss', function (d) {
                    qs('qaq-chs-u-global-css').value = d.css || '';
                    previewSettingsToUI();
                });
            }
            if (type === 'bubbleCss') {
                loadPreset('bubbleCss', function (d) {
                    qs('qaq-chs-u-bubble-css').value = d.css || '';
                    previewSettingsToUI();
                });
            }
        };
    });

    qs('qaq-chat-history-import').onclick = importChatHistory;
    qs('qaq-chat-history-export').onclick = exportChatHistory;
    qs('qaq-chat-history-clear').onclick = clearChatHistory;
    qs('qaq-chat-delete-contact-btn').onclick = function () { deleteContact(activeContactId); };
    qs('qaq-chat-recover-contact-btn').onclick = showDeletedPool;
    qs('qaq-chat-settings-save-all').onclick = saveSettingsAll;

    [
        'qaq-chs-u-bubble-my',
        'qaq-chs-u-bubble-other',
        'qaq-chs-u-font-color',
        'qaq-chs-u-font-url',
        'qaq-chs-u-global-css',
        'qaq-chs-u-bubble-css'
    ].forEach(function (id) {
        var el = qs(id);
        if (el) el.addEventListener('input', previewSettingsToUI);
    });
}
function previewSettingsToUI() {
    var fake = {
        uiTheme: (qs('qaq-chs-u-theme') || {}).value || getGlobalTheme(),
        uiBubbleMy: (qs('qaq-chs-u-bubble-my') || {}).value || getBubbleThemeDefaults(getGlobalTheme()).my,
        uiBubbleOther: (qs('qaq-chs-u-bubble-other') || {}).value || getBubbleThemeDefaults(getGlobalTheme()).other,
        uiAvatarShow: (qs('qaq-chs-u-avatar-show') || {}).value || 'all',
        uiShowTime: !!(qs('qaq-chs-u-show-time') && qs('qaq-chs-u-show-time').classList.contains('qaq-toggle-on')),
        uiTimePos: (qs('qaq-chs-u-time-pos') || {}).value || 'top',
        uiTimeFmt: (qs('qaq-chs-u-time-fmt') || {}).value || 'HH:mm',
        uiHideReplyBtn: !!(qs('qaq-chs-u-hide-recv') && qs('qaq-chs-u-hide-recv').classList.contains('qaq-toggle-on')),
        uiHideMenuBtn: !!(qs('qaq-chs-u-hide-menu') && qs('qaq-chs-u-hide-menu').classList.contains('qaq-toggle-on')),
        uiMenuPos: (qs('qaq-chs-u-menu-pos') || {}).value || 'top',
        uiAvatarRadius: parseFloat((qs('qaq-chs-u-avatar-radius_val') || {}).value || 10),
        uiBubbleRadius: parseFloat((qs('qaq-chs-u-bubble-radius_val') || {}).value || 16),
        uiFontUrl: (qs('qaq-chs-u-font-url') || {}).value || '',
        uiFontSize: (((qs('qaq-chs-u-font-size_val') || {}).value || 14) + 'px'),
        uiFontColor: (qs('qaq-chs-u-font-color') || {}).value || '#333333',
        uiGlobalCss: (qs('qaq-chs-u-global-css') || {}).value || '',
        uiBubbleCss: (qs('qaq-chs-u-bubble-css') || {}).value || '',
        translateEnabled: !!(qs('qaq-chs-o-trans-enable') && qs('qaq-chs-o-trans-enable').classList.contains('qaq-toggle-on')),
        translateMode: (qs('qaq-chs-o-trans-mode') || {}).value || 'in_bottom'
    };
    applyPageThemeClass(fake.uiTheme);
    loadCustomFont(fake.uiFontUrl, function () {
        applyRuntimeStyle(fake);
        var c = getActiveContact();
        if (c) {
            renderChatMessageList();
            renderChatInputArea();
        }
    });
}

async function fetchModelsIntoInput(kind) {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    var url = kind === 'image' ? (qs('qaq-chs-o-img-url').value || c.imageUrl || '') : (qs('qaq-chs-o-api-url').value || c.apiUrl || (s.globalApi && s.globalApi.url) || '');
    var key = kind === 'image' ? (qs('qaq-chs-o-img-key').value || c.imageKey || '') : (qs('qaq-chs-o-api-key').value || c.apiKey || (s.globalApi && s.globalApi.key) || '');
    if (!url || !key) {
        toast('请先填写 API');
        return;
    }
    try {
        toast('正在拉取模型');
        var resp = await fetch(normalizeUrl(url) + '/models', {
            headers: { 'Authorization': 'Bearer ' + key }
        });
        var data = await resp.json();
        var arr = (data.data || data.models || []).map(function (x) {
            return typeof x === 'string' ? x : (x.id || x.name || '');
        }).filter(Boolean);
        if (!arr.length) {
            toast('未获取到模型');
            return;
        }
        openSelect('选择模型', arr.map(function (x) {
            return { label: x, value: x };
        }), '', function (v) {
            if (kind === 'image') qs('qaq-chs-o-img-model').value = v;
            else qs('qaq-chs-o-api-model').value = v;
        });
    } catch (e) {
        console.error(e);
        toast('拉取失败');
    }
}

function chooseWorldBook() {
    var s = getStore();
    var arr = s.worldBooks || [];
    if (!arr.length) {
        openModal('绑定世界书',
            '<div style="font-size:13px;color:#666;line-height:1.8;text-align:center;">当前没有可绑定的世界书。<br>可先在世界书模块中创建后再回来绑定。</div>',
            { confirmText: '知道了', cancelText: '关闭' }
        );
        return;
    }
    openSelect('绑定世界书', arr.map(function (x) {
        return { label: x.name, value: x.id };
    }), qs('qaq-chs-o-worldbook').value, function (v) {
        var hit = arr.find(function (x) { return x.id === v; });
        qs('qaq-chs-o-worldbook').value = v;
        qs('qaq-chs-o-worldbook-btn').textContent = hit ? hit.name : '未绑定';
    });
}

function saveSettingsAll() {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    var me = s.myProfile || {};

    c.avatar = qs('qaq-chs-o-avatar').value || '';
    c.nickname = (qs('qaq-chs-o-name').value || '').trim() || '未命名联系人';
    c.remark = (qs('qaq-chs-o-remark').value || '').trim();
    c.realName = (qs('qaq-chs-o-real').value || '').trim();
    c.persona = (qs('qaq-chs-o-persona').value || '').trim();
    c.worldBookId = qs('qaq-chs-o-worldbook').value || '';
    c.worldBookName = qs('qaq-chs-o-worldbook-btn').textContent === '未绑定' ? '' : qs('qaq-chs-o-worldbook-btn').textContent;
    c.activeSticker = !!qs('qaq-chs-o-sticker').classList.contains('qaq-toggle-on');
    c.translateEnabled = !!qs('qaq-chs-o-trans-enable').classList.contains('qaq-toggle-on');
    c.translateMode = qs('qaq-chs-o-trans-mode').value || 'in_bottom';
    c.memMax = Math.max(1, parseInt(qs('qaq-chs-o-mem-max').value || '20', 10));
    c.bindGroupMemory = !!qs('qaq-chs-o-bind-group').classList.contains('qaq-toggle-on');
    c.bindVideoMemory = !!qs('qaq-chs-o-bind-video').classList.contains('qaq-toggle-on');
    c.bindVoiceMemory = !!qs('qaq-chs-o-bind-voice').classList.contains('qaq-toggle-on');
    c.bindOfflineMemory = !!qs('qaq-chs-o-bind-offline').classList.contains('qaq-toggle-on');
    c.summaryMemory = !!qs('qaq-chs-o-summary').classList.contains('qaq-toggle-on');
    c.summaryCount = Math.max(50, Math.min(100, parseInt(qs('qaq-chs-o-summary-count').value || '50', 10)));
    c.allowVideoCall = !!qs('qaq-chs-o-video-call').classList.contains('qaq-toggle-on');
    c.allowVoiceCall = !!qs('qaq-chs-o-voice-call').classList.contains('qaq-toggle-on');
    c.allowAutoMessage = !!qs('qaq-chs-o-auto-msg').classList.contains('qaq-toggle-on');
    c.autoMessageGap = Math.max(1, parseInt(qs('qaq-chs-o-auto-gap').value || '60', 10));
    c.allowBlockUser = !!qs('qaq-chs-o-block-user').classList.contains('qaq-toggle-on');
    c.allowDeleteUser = !!qs('qaq-chs-o-delete-user').classList.contains('qaq-toggle-on');
    c.allowAutoDiary = !!qs('qaq-chs-o-auto-diary').classList.contains('qaq-toggle-on');

    c.apiUrl = qs('qaq-chs-o-api-url').value || '';
    c.apiKey = qs('qaq-chs-o-api-key').value || '';
    c.apiModel = qs('qaq-chs-o-api-model').value || '';
    c.voiceUrl = qs('qaq-chs-o-voice-url').value || '';
    c.voiceKey = qs('qaq-chs-o-voice-key').value || '';
    c.voiceModel = qs('qaq-chs-o-voice-model').value || 'speech-02-hd';
    c.voiceSpeed = parseFloat(qs('qaq-chs-o-voice-speed_val').value || '0.9');
    c.imageUrl = qs('qaq-chs-o-img-url').value || '';
    c.imageKey = qs('qaq-chs-o-img-key').value || '';
    c.imageModel = qs('qaq-chs-o-img-model').value || '';
    c.imagePrompt = qs('qaq-chs-o-img-prompt').value || '';
    c.imageNegative = qs('qaq-chs-o-img-negative').value || '';

    me.avatar = qs('qaq-chs-m-avatar').value || '';
    me.nickname = (qs('qaq-chs-m-name').value || '').trim() || '学生';
    me.realName = (qs('qaq-chs-m-real').value || '').trim();
    me.persona = (qs('qaq-chs-m-persona').value || '').trim();

    c.uiTheme = qs('qaq-chs-u-theme').value || getGlobalTheme();
    c.uiBubbleMy = qs('qaq-chs-u-bubble-my').value || getBubbleThemeDefaults(c.uiTheme).my;
    c.uiBubbleOther = qs('qaq-chs-u-bubble-other').value || getBubbleThemeDefaults(c.uiTheme).other;
    c.uiAvatarShow = qs('qaq-chs-u-avatar-show').value || 'all';
    c.uiShowTime = !!qs('qaq-chs-u-show-time').classList.contains('qaq-toggle-on');
    c.uiTimePos = qs('qaq-chs-u-time-pos').value || 'top';
    c.uiTimeFmt = qs('qaq-chs-u-time-fmt').value || 'HH:mm';
    c.uiHideReplyBtn = !!qs('qaq-chs-u-hide-recv').classList.contains('qaq-toggle-on');
    c.uiHideMenuBtn = !!qs('qaq-chs-u-hide-menu').classList.contains('qaq-toggle-on');
    c.uiMenuPos = qs('qaq-chs-u-menu-pos').value || 'top';
    c.uiAvatarRadius = parseFloat(qs('qaq-chs-u-avatar-radius_val').value || '10');
    c.uiBubbleRadius = parseFloat(qs('qaq-chs-u-bubble-radius_val').value || '16');
    c.uiFontUrl = qs('qaq-chs-u-font-url').value || '';
    c.uiFontSize = (parseInt(qs('qaq-chs-u-font-size_val').value || '14', 10) || 14) + 'px';
    c.uiFontColor = qs('qaq-chs-u-font-color').value || '#333333';
    c.uiGlobalCss = qs('qaq-chs-u-global-css').value || '';
    c.uiBubbleCss = qs('qaq-chs-u-bubble-css').value || '';

    c.dnd = !!qs('qaq-chs-x-dnd').classList.contains('qaq-toggle-on');
    c.dndTime = qs('qaq-chs-x-dnd-time').value || '';
    c.blocked = !!qs('qaq-chs-x-blocked').classList.contains('qaq-toggle-on');

    s.myProfile = me;
    setStore(s);

    qs('qaq-chat-win-title').textContent = getDisplayName(c);
    renderMainBody();
    renderChatWindow();
    toast('设置已保存');
}

function importChatHistory() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
        if (!this.files || !this.files[0]) return;
        var rd = new FileReader();
        rd.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                var s = getStore();
                if (Array.isArray(data.messages)) {
                    s.messages[activeContactId] = data.messages;
                    setStore(s);
                    renderChatMessageList();
                    renderMainBody();
                    toast('聊天记录已导入');
                } else {
                    toast('文件格式错误');
                }
            } catch (err) {
                toast('导入失败');
            }
        };
        rd.readAsText(this.files[0]);
    };
    input.click();
}
function exportChatHistory() {
    var data = { messages: getMessages(activeContactId) };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qaq-chat-history-' + activeContactId + '-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出');
}
function clearChatHistory() {
    openModal('清空聊天记录',
        '<div style="font-size:13px;color:#666;line-height:1.8;">确认清空当前聊天记录？此操作不可恢复。</div>',
        {
            confirmText: '清空',
            onConfirm: function () {
                var s = getStore();
                s.messages[activeContactId] = [];
                setStore(s);
                renderChatMessageList();
                renderMainBody();
                toast('已清空');
            }
        }
    );
}

function bindMainEvents() {
    if (qs('qaq-chat-main-back')) {
        qs('qaq-chat-main-back').onclick = function () {
            qs('qaq-chat-main-page').classList.remove('qaq-page-show');
        };
    }
    if (qs('qaq-chat-win-back')) {
        qs('qaq-chat-win-back').onclick = closeChatWindow;
    }
    if (qs('qaq-chat-set-back')) {
        qs('qaq-chat-set-back').onclick = function () {
            saveSettingsAll();
            qs('qaq-chat-settings-page').classList.remove('qaq-page-show');
            qs('qaq-chat-window-page').classList.add('qaq-page-show');
        };
    }
    if (qs('qaq-chat-win-set-btn')) {
        qs('qaq-chat-win-set-btn').onclick = openChatSettings;
    }
    if (qs('qaq-chat-top-add-btn')) {
        qs('qaq-chat-top-add-btn').onclick = openAddMenu;
    }
    if (qs('qaq-chat-send-btn')) {
        qs('qaq-chat-send-btn').onclick = sendMessage;
    }
    if (qs('qaq-chat-recv-ai-btn')) {
        qs('qaq-chat-recv-ai-btn').onclick = receiveAI;
    }
    if (qs('qaq-chat-toggle-menu')) {
        qs('qaq-chat-toggle-menu').onclick = function () {
            var ext = qs('qaq-chat-ext-menu');
            if (!ext) return;
            ext.style.display = (ext.style.display === 'none' || !ext.style.display) ? 'grid' : 'none';
        };
    }
    if (qs('qaq-chat-input-box')) {
        qs('qaq-chat-input-box').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        qs('qaq-chat-input-box').addEventListener('input', function () {
            this.style.height = '40px';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    var navs = document.querySelectorAll('.qaq-chat-bottom-nav .qaq-chat-nav-item');
    navs.forEach(function (el, idx) {
        var map = ['message', 'friend', 'feed', 'mine'];
        el.onclick = function () {
            activeMainTab = map[idx];
            renderMainBody();
        };
    });
}

function initThemeSync() {
    applyPageThemeClass(getGlobalTheme());
}
function ensureDemo() {
    var s = getStore();
    if (!Object.keys(s.contacts || {}).length) {
        s = createDefaultStore();
        setStore(s);
    }
}
function checkDndRelease() {
    var s = getStore();
    var changed = false;
    Object.keys(s.contacts || {}).forEach(function (id) {
        var c = s.contacts[id];
        if (c && c.dnd && c.dndTime && !isInDndRange(c)) {
            c.dnd = false;
            changed = true;
        }
    });
    if (changed) setStore(s);
}

function init() {
    ensureDemo();
    initThemeSync();
    bindMainEvents();
    renderMainBody();
    renderChatExtMenu();
    checkDndRelease();
}
window.qaqOpenChatPage = function () {
    ensureDemo();
    initThemeSync();
    activeMainTab = 'message';
    qs('qaq-chat-settings-page') && qs('qaq-chat-settings-page').classList.remove('qaq-page-show');
    qs('qaq-chat-window-page') && qs('qaq-chat-window-page').classList.remove('qaq-page-show');
    qs('qaq-chat-main-page') && qs('qaq-chat-main-page').classList.add('qaq-page-show');
    renderMainBody();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
setInterval(checkDndRelease, 60000);

})();
    