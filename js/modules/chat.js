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

function showOnlyChatPage(pageId) {
    ['qaq-chat-main-page', 'qaq-chat-window-page', 'qaq-chat-settings-page'].forEach(function (id) {
        var el = qs(id);
        if (!el) return;
        if (id === pageId) el.classList.add('qaq-page-show');
        else el.classList.remove('qaq-page-show');
    });
}

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
    showOnlyChatPage('qaq-chat-window-page');
    renderChatWindow();
}
function closeChatWindow() {
    showOnlyChatPage('qaq-chat-main-page');
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
    showOnlyChatPage('qaq-chat-settings-page');
}

function renderSettingsPage() {
    var c = getActiveContact();
    var s = getStore();
    if (!c) return;
    var me = s.myProfile || {};
    var body = qs('qaq-chat-settings-scroll');
    if (!body) return;

    body.innerHTML =
        '<div class="qaq-chat-set-card">' +
            '<div class="qaq-chat-set-hd"><span>对方设置</span></div>' +
            '<div class="qaq-chat-set-bd">' +
                '<div class="qaq-chat-set-lbl">头像</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-o-avatar" value="' + esc(c.avatar || '') + '" placeholder="头像 URL">' +
                '<div class="qaq-chat-set-lbl">昵称</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-o-name" value="' + esc(c.nickname || '') + '" placeholder="昵称">' +
                '<div class="qaq-chat-set-lbl">备注</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-o-remark" value="' + esc(c.remark || '') + '" placeholder="备注">' +
                '<div class="qaq-chat-set-lbl">人设</div>' +
                '<textarea class="qaq-chat-set-txt" id="qaq-chs-o-persona" style="height:72px;">' + esc(c.persona || '') + '</textarea>' +
            '</div>' +
        '</div>' +

        '<div class="qaq-chat-set-card">' +
            '<div class="qaq-chat-set-hd"><span>我方设置</span></div>' +
            '<div class="qaq-chat-set-bd">' +
                '<div class="qaq-chat-set-lbl">头像</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-m-avatar" value="' + esc(me.avatar || '') + '" placeholder="头像 URL">' +
                '<div class="qaq-chat-set-lbl">昵称</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-m-name" value="' + esc(me.nickname || '') + '" placeholder="昵称">' +
                '<div class="qaq-chat-set-lbl">人设</div>' +
                '<textarea class="qaq-chat-set-txt" id="qaq-chs-m-persona" style="height:72px;">' + esc(me.persona || '') + '</textarea>' +
            '</div>' +
        '</div>' +

        '<div class="qaq-chat-set-card">' +
            '<div class="qaq-chat-set-hd"><span>美化设置</span></div>' +
            '<div class="qaq-chat-set-bd">' +
                '<div class="qaq-chat-set-lbl">主题</div>' +
                '<select class="qaq-chat-set-inp" id="qaq-chs-u-theme">' +
                    '<option value="default"' + ((c.uiTheme || getGlobalTheme()) === 'default' ? ' selected' : '') + '>暖阳</option>' +
                    '<option value="cool"' + ((c.uiTheme || getGlobalTheme()) === 'cool' ? ' selected' : '') + '>冷雾</option>' +
                    '<option value="dark"' + ((c.uiTheme || getGlobalTheme()) === 'dark' ? ' selected' : '') + '>夜幕</option>' +
                '</select>' +
                '<div class="qaq-chat-set-lbl">我的气泡颜色</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-u-bubble-my" value="' + esc(c.uiBubbleMy || getBubbleThemeDefaults(c.uiTheme).my) + '">' +
                '<div class="qaq-chat-set-lbl">对方气泡颜色</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-u-bubble-other" value="' + esc(c.uiBubbleOther || getBubbleThemeDefaults(c.uiTheme).other) + '">' +
                '<div class="qaq-chat-set-lbl">字体大小</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-u-font-size" value="' + esc(parseInt(c.uiFontSize || '14px', 10) || 14) + '" type="number">' +
                '<div class="qaq-chat-set-lbl">字体颜色</div>' +
                '<input class="qaq-chat-set-inp" id="qaq-chs-u-font-color" value="' + esc(c.uiFontColor || '#333333') + '">' +
            '</div>' +
        '</div>' +

        '<div class="qaq-chat-set-card">' +
            '<div class="qaq-chat-set-hd"><span>聊天记录</span></div>' +
            '<div class="qaq-chat-set-bd">' +
                '<button class="qaq-chat-action-btn" id="qaq-chat-history-import">导入聊天记录</button>' +
                '<button class="qaq-chat-action-btn" id="qaq-chat-history-export">导出聊天记录</button>' +
                '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-history-clear">清空聊天记录</button>' +
            '</div>' +
        '</div>' +

        '<div class="qaq-chat-set-card">' +
            '<div class="qaq-chat-set-hd"><span>其他</span></div>' +
            '<div class="qaq-chat-set-bd">' +
                '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-delete-contact-btn">删除角色</button>' +
            '</div>' +
        '</div>' +

        '<button class="qaq-chat-set-save" id="qaq-chat-settings-save-all">保存全部设置</button>';

    qs('qaq-chat-history-import').onclick = importChatHistory;
    qs('qaq-chat-history-export').onclick = exportChatHistory;
    qs('qaq-chat-history-clear').onclick = clearChatHistory;
    qs('qaq-chat-delete-contact-btn').onclick = function () {
        deleteContact(activeContactId);
    };
    qs('qaq-chat-settings-save-all').onclick = saveSettingsAll;
}

function saveSettingsAll() {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    var me = s.myProfile || {};

    c.avatar = (qs('qaq-chs-o-avatar').value || '').trim();
    c.nickname = (qs('qaq-chs-o-name').value || '').trim() || '未命名联系人';
    c.remark = (qs('qaq-chs-o-remark').value || '').trim();
    c.persona = (qs('qaq-chs-o-persona').value || '').trim();

    me.avatar = (qs('qaq-chs-m-avatar').value || '').trim();
    me.nickname = (qs('qaq-chs-m-name').value || '').trim() || '学生';
    me.persona = (qs('qaq-chs-m-persona').value || '').trim();

    c.uiTheme = (qs('qaq-chs-u-theme').value || getGlobalTheme());
    c.uiBubbleMy = (qs('qaq-chs-u-bubble-my').value || getBubbleThemeDefaults(c.uiTheme).my);
    c.uiBubbleOther = (qs('qaq-chs-u-bubble-other').value || getBubbleThemeDefaults(c.uiTheme).other);
    c.uiFontSize = ((parseInt(qs('qaq-chs-u-font-size').value || '14', 10) || 14) + 'px');
    c.uiFontColor = (qs('qaq-chs-u-font-color').value || '#333333');

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
        showOnlyChatPage('qaq-chat-window-page');
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
    showOnlyChatPage('qaq-chat-main-page');
    renderMainBody();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
setInterval(checkDndRelease, 60000);

})();
    