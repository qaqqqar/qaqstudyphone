(function () {
'use strict';

var CHAT_STORE_KEY = 'qaq-chat-app-store-v1';
var CHAT_PRESETS_KEY = 'qaq-chat-app-presets-v1';
var CHAT_SETTING_PRESETS_KEY = 'qaq-chat-setting-presets-v1';
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
    
    // 尝试旧版 API: lucide.icons[name].toSvg()
    if (window.lucide && window.lucide.icons && window.lucide.icons[name]) {
        //旧版本 (有 toSvg 方法)
        if (typeof window.lucide.icons[name].toSvg === 'function') {
            try {
                return window.lucide.icons[name].toSvg({
                    width: size,
                    height: size,
                    stroke: 'currentColor',
                    'stroke-width': 1.9
                });
            } catch (e) {}
        }
        
        // 新版本: icons[name] 是数组 [tagName, attrs, children]
        if (Array.isArray(window.lucide.icons[name])) {
            try {
                var iconData = window.lucide.icons[name];
                var children = iconData[2] || iconData[1] || [];
                var inner = '';
                if (Array.isArray(children)) {
                    children.forEach(function (child) {
                        var tag = child[0] || child;
                        var attrs = child[1] || {};
                        if (typeof tag === 'string') {
                            var attrStr = '';
                            Object.keys(attrs).forEach(function (k) {
                                attrStr += ' ' + k + '="' + attrs[k] + '"';
                            });
                            inner += '<' + tag + attrStr + '/>';
                        }
                    });
                }
                return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
            } catch (e) {}
        }
    }

    // ★ 内置常用图标 SVG，不依赖任何外部库
    var builtinIcons = {
        'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        'sparkles': '<path d="m12 3-1.912 5.813a22 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
        'send-horizontal': '<path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/>',
        'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
        'circle-dot': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
        'shield-x': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-55"/><path d="m9.5 9.5 5 5"/>',
        'moon-star': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
        'chevron-down': '<path d="m6 9 6 6 6-6"/>',
        'check': '<path d="M20 69 17l-5-5"/>',
        'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
        'user-round-pen': '<path d="M2 21a8 8 0 0 1 10.821-7.477"/><circle cx="10" cy="8" r="5"/><path d="M21.378 16.626a11 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
        'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
        'id-card': '<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a33 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
        'palette': '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.6880-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
        'history': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        'settings-2': '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
        'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
        'undo-2': '<path d="M9144 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
        'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'volume-2': '<polygon points="115 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a55 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        'smile-plus': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M208v4"/><path d="M22 10h-4"/>',
        'mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
        'image-plus': '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L621"/>',
        'wallet-cards': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
        'package': '<path d="m7.5 4.27 95.15"/><path d="M218a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
        'handshake': '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 111h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
        'clapperboard': '<path d="M20.2 63 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
        'video': '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
        'phone-call': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14.05 2a9 9 0 0 1 87.94"/><path d="M14.05 6A5 5 0 0 1 18 10"/>',
        'map-pinned': '<path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.2140C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/>',
        'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M18.4 2.6a2.17 2.17 0 0 1 33L16 11l-4 11-4Z"/>'};

    if (builtinIcons[name]) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + builtinIcons[name] + '</svg>';
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
                signature: '陪你把外语练成日常习惯',
signatureAutoChange: true,
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
                voiceGroup: '',
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
function ensureChatSettingsStyle() {
    if (document.getElementById('qaq-chat-settings-style')) return;
    var style = document.createElement('style');
    style.id = 'qaq-chat-settings-style';
    style.textContent = [
        '.qaq-chat-settings-scroll{padding:12px 14px 30px;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}',
        '.qaq-chat-settings-scroll::-webkit-scrollbar{display:none;}',
        '.qaq-chat-fold-card{background:rgba(255,255,255,.86);border:1px solid rgba(255,255,255,.6);border-radius:16px;margin-bottom:12px;overflow:hidden;}',
        '.qaq-chat-fold-head{display:flex;align-items:center;gap:10px;padding:14px 14px;cursor:pointer;user-select:none;}',
        '.qaq-chat-fold-head:active{opacity:.88;}',
        '.qaq-chat-fold-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:#8a6050;flex-shrink:0;}',
        '.qaq-chat-fold-title{flex:1;font-size:14px;font-weight:600;color:#333;}',
        '.qaq-chat-fold-desc{font-size:11px;color:#999;margin-right:6px;white-space:nowrap;}',
        '.qaq-chat-fold-arrow{width:16px;height:16px;color:#999;transition:transform .18s ease;flex-shrink:0;}',
        '.qaq-chat-fold-card.qaq-open .qaq-chat-fold-arrow{transform:rotate(180deg);}',
        '.qaq-chat-fold-body{display:none;padding:0 14px 14px;}',
        '.qaq-chat-fold-card.qaq-open .qaq-chat-fold-body{display:block;}',
        '.qaq-chat-set-grid{display:flex;flex-direction:column;gap:10px;}',
        '.qaq-chat-set-row{display:flex;align-items:center;gap:10px;}',
        '.qaq-chat-set-row-wrap{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;}',
        '.qaq-chat-set-col{flex:1;min-width:0;}',
        '.qaq-chat-set-lbl{font-size:11px;color:#999;margin-bottom:6px;line-height:1.5;}',
        '.qaq-chat-set-inp,.qaq-chat-set-sel,.qaq-chat-set-txt{width:100%;border:1px solid rgba(0,0,0,.08);background:rgba(255,255,255,.92);border-radius:12px;padding:0 12px;font-size:13px;color:#333;font-family:inherit;outline:none;}',
        '.qaq-chat-set-inp,.qaq-chat-set-sel{height:38px;}',
        '.qaq-chat-set-txt{padding:10px 12px;height:88px;resize:none;line-height:1.7;}',
        '.qaq-chat-set-inp:focus,.qaq-chat-set-sel:focus,.qaq-chat-set-txt:focus{border-color:#deb3be;}',
        '.qaq-chat-mini-btn{height:38px;min-width:60px;padding:0 14px;border:none;border-radius:12px;background:linear-gradient(135deg,#f6e9c9,#fed2e0);color:#8a6050;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;justify-content:center;}',
        '.qaq-chat-mini-btn:active{transform:scale(.97);}',
        '.qaq-chat-ghost-btn{height:38px;padding:0 12px;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:#fff;color:#666;font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap;}',
        '.qaq-chat-ghost-btn:active{transform:scale(.97);}',
        '.qaq-chat-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.04);gap:10px;}',
        '.qaq-chat-toggle-row:last-child{border-bottom:none;}',
        '.qaq-chat-toggle-title{font-size:13px;color:#333;line-height:1.6;flex:1;}',
        '.qaq-chat-inline-note{font-size:11px;color:#999;line-height:1.7;margin-top:2px;}',
        '.qaq-chat-sub-block{padding:10px 12px;background:rgba(0,0,0,.025);border-radius:12px;display:flex;flex-direction:column;gap:10px;}',
        '.qaq-chat-preview-box{border:1px dashed rgba(0,0,0,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.92);}',
        '.qaq-chat-preview-title{font-size:11px;color:#999;margin-bottom:8px;}',
        '.qaq-chat-preview-row{display:flex;flex-direction:column;gap:10px;}',
        '.qaq-chat-preview-msg{display:flex;align-items:flex-end;gap:8px;}',
        '.qaq-chat-preview-msg.qaq-me{justify-content:flex-end;}',
        '.qaq-chat-preview-avatar{width:28px;height:28px;border-radius:10px;background:#ddd;flex-shrink:0;}',
        '.qaq-chat-preview-bubble{max-width:72%;padding:10px 12px;font-size:13px;line-height:1.7;word-break:break-word;}',
        '.qaq-chat-preview-time{font-size:10px;color:#999;line-height:1.4;}',
        '.qaq-chat-action-btn{width:100%;height:40px;border:none;border-radius:12px;background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.08);color:#555;font-size:13px;font-family:inherit;cursor:pointer;margin-bottom:8px;}',
        '.qaq-chat-action-btn:last-child{margin-bottom:0;}',
        '.qaq-chat-action-btn.qaq-danger{color:#d9534f;}',
        '.qaq-chat-set-save{width:100%;height:44px;border:none;border-radius:14px;background:linear-gradient(135deg,#f6e9c9,#fed2e0);color:#8a6050;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:4px;}',
        '.qaq-chat-setting-badge{font-size:10px;color:#8a6050;background:rgba(254,210,224,.35);padding:2px 8px;border-radius:999px;}',
        '.qaq-chat-hidden{display:none !important;}',
        '.qaq-chat-voice-btn{transition:color .15s;}',
'.qaq-chat-voice-btn:hover{color:#c47068 !important;}',
'.qaq-chat-voice-btn:active{opacity:.7;}',

        '.qaq-theme-dark .qaq-chat-fold-card{background:rgba(40,40,40,.92);border-color:rgba(60,60,60,.5);}',
        '.qaq-theme-dark .qaq-chat-voice-btn{color:#777 !important;}',
'.qaq-theme-dark .qaq-chat-voice-btn:hover{color:#d0b8a8 !important;}',
        '.qaq-theme-dark .qaq-chat-fold-title,.qaq-theme-dark .qaq-chat-toggle-title{color:#ddd;}',
        '.qaq-theme-dark .qaq-chat-fold-desc,.qaq-theme-dark .qaq-chat-set-lbl,.qaq-theme-dark .qaq-chat-inline-note,.qaq-theme-dark .qaq-chat-preview-title,.qaq-theme-dark .qaq-chat-preview-time{color:#888;}',
        '.qaq-theme-dark .qaq-chat-fold-arrow{color:#888;}',
        '.qaq-theme-dark .qaq-chat-fold-icon{color:#d0b8a8;}',
        '.qaq-theme-dark .qaq-chat-set-inp,.qaq-theme-dark .qaq-chat-set-sel,.qaq-theme-dark .qaq-chat-set-txt{background:#333;border-color:#444;color:#ddd;}',
        '.qaq-theme-dark .qaq-chat-mini-btn,.qaq-theme-dark .qaq-chat-set-save{background:linear-gradient(135deg,#4a3a2a,#5a3a4a);color:#d0b8a8;}',
        '.qaq-theme-dark .qaq-chat-ghost-btn,.qaq-theme-dark .qaq-chat-action-btn{background:rgba(50,50,50,.94);border-color:rgba(255,255,255,.08);color:#bbb;}',
        '.qaq-theme-dark .qaq-chat-sub-block,.qaq-theme-dark .qaq-chat-preview-box{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08);}',
        '.qaq-theme-dark .qaq-chat-setting-badge{color:#d0b8a8;background:rgba(90,58,74,.35);}',

        '.qaq-theme-cool .qaq-chat-fold-card{background:rgba(255,255,255,.92);border-color:rgba(255,255,255,.8);}',
        '.qaq-theme-cool .qaq-chat-voice-btn{color:#7d8794 !important;}',
'.qaq-theme-cool .qaq-chat-voice-btn:hover{color:#3a4a60 !important;}',
        '.qaq-theme-cool .qaq-chat-fold-icon{color:#3a4a60;}',
        '.qaq-theme-cool .qaq-chat-mini-btn,.qaq-theme-cool .qaq-chat-set-save{background:linear-gradient(135deg,#d0d8e8,#bfc9dd);color:#3a4a60;}',
        '.qaq-theme-cool .qaq-chat-ghost-btn,.qaq-theme-cool .qaq-chat-action-btn{background:rgba(255,255,255,.94);border-color:rgba(100,130,180,.12);color:#4a5b72;}',
        '.qaq-chat-voice-btn:hover{color:#c47068 !important;}',
'.qaq-chat-voice-btn:active{opacity:.7;}',
'.qaq-theme-dark .qaq-chat-voice-btn{color:#888 !important;}',
'.qaq-theme-dark .qaq-chat-voice-btn:hover{color:#d0b8a8 !important;}',
    ].join('');
    document.head.appendChild(style);
}
function getChatSettingPresets() {
    return getCache(CHAT_SETTING_PRESETS_KEY, {
        version: 1,
        persona: [],
        globalCss: [],
        bubbleCss: []
    });
}
function saveChatSettingPresets(data) {
    data.version = 1;
    setCache(CHAT_SETTING_PRESETS_KEY, data);
}
function exportJsonFile(name, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}
function importJsonFile(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
        if (!this.files || !this.files[0]) return;
        var rd = new FileReader();
        rd.onload = function (e) {
            try {
                cb && cb(JSON.parse(e.target.result));
            } catch (err) {
                toast('导入失败，JSON 格式错误');
            }
        };
        rd.readAsText(this.files[0]);
    };
    input.click();
}
function openPresetSaveDialog(type, value) {
    openModal('保存预设',
        '<input class="qaq-modal-input" id="qaq-chat-preset-save-name" placeholder="输入预设名称">',
        {
            confirmText: '保存',
            onConfirm: function () {
                var name = (qs('qaq-chat-preset-save-name').value || '').trim();
                if (!name) return false;
                var store = getChatSettingPresets();
                if (!store[type]) store[type] = [];
                store[type].push({ id: uid('preset'), name: name, value: value });
                saveChatSettingPresets(store);
                toast('预设已保存');
            }
        }
    );
}
function openPresetPickDialog(type, onPick) {
    var store = getChatSettingPresets();
    var arr = store[type] || [];
    if (!arr.length) {
        toast('暂无预设');
        return;
    }
    openModal('导入预设',
        '<div class="qaq-custom-select-list">' +
            arr.map(function (x) {
                return '<div class="qaq-custom-select-option" data-qaq-chat-preset="' + esc(x.id) + '">' +
                    '<span>' + esc(x.name) + '</span>' +
                '</div>';
            }).join('') +
        '</div>',
        {
            hideBtns: true,
            afterRender: function () {
                document.querySelectorAll('[data-qaq-chat-preset]').forEach(function (el) {
                    el.onclick = function () {
                        var id = this.getAttribute('data-qaq-chat-preset');
                        var hit = arr.find(function (x) { return x.id === id; });
                        if (hit) onPick && onPick(hit.value);
                        window.qaqCloseModal && window.qaqCloseModal();
                    };
                });
            }
        }
    );
}
function chatFoldCard(id, title, desc, iconName, bodyHtml, open) {
    return '' +
    '<div class="qaq-chat-fold-card' + (open ? ' qaq-open' : '') + '" id="' + id + '">' +
        '<div class="qaq-chat-fold-head" data-qaq-fold-head="' + id + '">' +
            '<div class="qaq-chat-fold-icon">' + icon(iconName || 'folder', 18) + '</div>' +
            '<div class="qaq-chat-fold-title">' + esc(title) + '</div>' +
            '<div class="qaq-chat-fold-desc">' + esc(desc || '') + '</div>' +
            '<div class="qaq-chat-fold-arrow">' + icon('chevron-down', 16) + '</div>' +
        '</div>' +
        '<div class="qaq-chat-fold-body">' + bodyHtml + '</div>' +
    '</div>';
}
function chatTextInput(id, label, value, placeholder) {
    return '' +
    '<div class="qaq-chat-set-col">' +
        '<div class="qaq-chat-set-lbl">' + esc(label) + '</div>' +
        '<input class="qaq-chat-set-inp" id="' + id + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '">' +
    '</div>';
}
function chatNumberInput(id, label, value, min, max, step) {
    return '' +
    '<div class="qaq-chat-set-col">' +
        '<div class="qaq-chat-set-lbl">' + esc(label) + '</div>' +
        '<input class="qaq-chat-set-inp" id="' + id + '" type="number" value="' + esc(value == null ? '' : value) + '"' +
        (min != null ? ' min="' + min + '"' : '') +
        (max != null ? ' max="' + max + '"' : '') +
        (step != null ? ' step="' + step + '"' : '') +
        '>' +
    '</div>';
}
function chatTextarea(id, label, value, placeholder, h) {
    return '' +
    '<div class="qaq-chat-set-col">' +
        '<div class="qaq-chat-set-lbl">' + esc(label) + '</div>' +
        '<textarea class="qaq-chat-set-txt" id="' + id + '" placeholder="' + esc(placeholder || '') + '" style="height:' + (h || 88) + 'px;">' + esc(value || '') + '</textarea>' +
    '</div>';
}
function chatSelect(id, label, value, options) {
    return '' +
    '<div class="qaq-chat-set-col">' +
        '<div class="qaq-chat-set-lbl">' + esc(label) + '</div>' +
        '<select class="qaq-chat-set-sel" id="' + id + '">' +
            options.map(function (x) {
                return '<option value="' + esc(x.value) + '"' + (String(x.value) === String(value) ? ' selected' : '') + '>' + esc(x.label) + '</option>';
            }).join('') +
        '</select>' +
    '</div>';
}
function chatClickSelect(id, label, value, options) {
    var current = options.find(function (x) { return String(x.value) === String(value); });
    var displayText = current ? current.label : (value || '请选择');
    return '' +
    '<div class="qaq-chat-set-col">' +
        '<div class="qaq-chat-set-lbl">' + esc(label) + '</div>' +
        '<div class="qaq-chat-set-inp" id="' + id + '" data-qaq-click-select="1" data-qaq-value="' + esc(value || '') + '" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">' +
            '<span id="' + id + '-text">' + esc(displayText) + '</span>' +
            '<span style="color:#999;font-size:11px;">' + icon('chevron-down', 12) + '</span>' +
        '</div>' +
    '</div>';
}

function bindClickSelect(id, title, options, onChange) {
    var el = qs(id);
    if (!el) return;
    el.onclick = function () {
        var current = el.getAttribute('data-qaq-value') || '';
        openModal(title,
            '<div class="qaq-custom-select-list">' +
            options.map(function (x) {
                var active = String(x.value) === String(current);
                return '<div class="qaq-custom-select-option' + (active ? ' qaq-custom-select-active' : '') + '" data-qaq-cs-v="' + esc(x.value) + '">' +
                    '<span>' + esc(x.label) + '</span>' +
                    (active ? '<span style="color:#c47068;">' + icon('check', 14) + '</span>' : '') +
                '</div>';
            }).join('') +
            '</div>',
            {
                hideBtns: true,
                afterRender: function () {
                    document.querySelectorAll('[data-qaq-cs-v]').forEach(function (opt) {
                        opt.onclick = function () {
                            var v = this.getAttribute('data-qaq-cs-v');
                            el.setAttribute('data-qaq-value', v);
                            var hit = options.find(function (x) { return String(x.value) === String(v); });
                            var textEl = qs(id + '-text');
                            if (textEl) textEl.textContent = hit ? hit.label : v;
                            onChange && onChange(v);
                            window.qaqCloseModal && window.qaqCloseModal();
                        };
                    });
                }
            }
        );
    };
}

function getClickSelectValue(id) {
    var el = qs(id);
    return el ? (el.getAttribute('data-qaq-value') || '') : '';
}
function chatToggleRow(id, title, checked, note) {
    return '' +
    '<div class="qaq-chat-toggle-row">' +
        '<div class="qaq-chat-set-col">' +
            '<div class="qaq-chat-toggle-title">' + esc(title) + '</div>' +
            (note ? '<div class="qaq-chat-inline-note">' + esc(note) + '</div>' : '') +
        '</div>' +
        '<div class="qaq-toggle' + (checked ? ' qaq-toggle-on' : '') + '" id="' + id + '"><div class="qaq-toggle-knob"></div></div>' +
    '</div>';
}
function getWorldBookOptions() {
    try {
        var books = JSON.parse(localStorage.getItem('qaq-wordbooks') || '[]');
        var arr = [{ value: '', label: '不绑定世界书' }];
        books.forEach(function (b) {
            arr.push({
                value: b.id || b.bookId || '',
                label: b.name || b.title || ('词库-' + (b.id || ''))
            });
        });
        return arr;
    } catch (e) {
        return [{ value: '', label: '不绑定世界书' }];
    }
}
function bindFoldEvents(root) {
    root.querySelectorAll('[data-qaq-fold-head]').forEach(function (el) {
        el.onclick = function () {
            var id = this.getAttribute('data-qaq-fold-head');
            var card = qs(id);
            if (card) card.classList.toggle('qaq-open');
        };
    });
}
function bindToggleRowById(rowId, toggleId, onChange) {
    var row = qs(rowId);
    var toggle = qs(toggleId);
    if (!toggle) return;
    function clickFn() {
    toggle.classList.toggle('qaq-toggle-on');
    var isOn = toggle.classList.contains('qaq-toggle-on');
    var tt = _chatCurrentTheme || 'default';
    if (tt === 'dark') {
        toggle.style.background = isOn ? '#8a6a5a' : '#444';
    } else if (tt === 'cool') {
        toggle.style.background = isOn ? '#7a9ab8' : '#ddd';
    } else {
        toggle.style.background = isOn ? '#c9a08a' : '#ddd';
    }
    onChange && onChange(isOn);
}
    toggle.onclick = function (e) {
        e.stopPropagation();
        clickFn();
    };
    if (row) row.onclick = clickFn;
}
function getToggleValue(id) {
    var el = qs(id);
    return !!(el && el.classList.contains('qaq-toggle-on'));
}
function setToggleValue(id, v) {
    var el = qs(id);
    if (el) el.classList.toggle('qaq-toggle-on', !!v);
}
function syncConditionalBlocks() {
    var autoMsg = getToggleValue('qaq-chs-o-auto-message-toggle');
    var sumMem = getToggleValue('qaq-chs-o-summary-memory-toggle');
    var mmVoice = getToggleValue('qaq-chs-o-mm-voice-toggle');
    var replyHidden = getToggleValue('qaq-chs-u-hide-reply-toggle');
    var menuHidden = getToggleValue('qaq-chs-u-hide-menu-toggle');

    var autoBlock = qs('qaq-chs-o-auto-message-block');
    var sumBlock = qs('qaq-chs-o-summary-count-block');
    var mmBlock = qs('qaq-chs-o-mm-voice-block');
    if (autoBlock) autoBlock.classList.toggle('qaq-chat-hidden', !autoMsg);
    if (sumBlock) sumBlock.classList.toggle('qaq-chat-hidden', !sumMem);
    if (mmBlock) mmBlock.classList.toggle('qaq-chat-hidden', !mmVoice);

    var menuPos = qs('qaq-chs-u-menu-pos-wrap');
    if (menuPos) menuPos.classList.toggle('qaq-chat-hidden', menuHidden);

    renderBubbleCssPreview();
}
function safeNumber(v, d) {
    var n = parseFloat(v);
    return isNaN(n) ? d : n;
}
function renderBubbleCssPreview() {
    var box = qs('qaq-chat-bubble-css-preview');
    if (!box) return;

    var myColor = (qs('qaq-chs-u-bubble-my') && qs('qaq-chs-u-bubble-my').value) || '#fce8e2';
    var otColor = (qs('qaq-chs-u-bubble-other') && qs('qaq-chs-u-bubble-other').value) || '#ffffff';
    var fontColor = (qs('qaq-chs-u-font-color') && qs('qaq-chs-u-font-color').value) || '#333333';
    var fontSize = ((parseInt((qs('qaq-chs-u-font-size') && qs('qaq-chs-u-font-size').value) || '14', 10) || 14) + 'px');
    var avatarShow = (qs('qaq-chs-u-avatar-show') && qs('qaq-chs-u-avatar-show').value) || 'all';
    var showTime = getToggleValue('qaq-chs-u-show-time-toggle');
    var timePos = (qs('qaq-chs-u-time-pos') && qs('qaq-chs-u-time-pos').value) || 'top';
    var bubbleRadius = safeNumber(qs('qaq-chs-u-bubble-radius') && qs('qaq-chs-u-bubble-radius').value, 16);
    var avatarRadius = safeNumber(qs('qaq-chs-u-avatar-radius') && qs('qaq-chs-u-avatar-radius').value, 10);
    var bubbleCss = (qs('qaq-chs-u-bubble-css') && qs('qaq-chs-u-bubble-css').value) || '';

    function buildSample(isMe, text, trans, showAvatar) {
        var top = '';
        var bottom = '';
        var inner = '';
        if (showTime && timePos === 'top') top = '<div class="qaq-chat-preview-time">12:08</div>';
        if (showTime && (timePos === 'bottom' || timePos === 'bubble_outer' || timePos === 'avatar_bottom')) bottom = '<div class="qaq-chat-preview-time">12:08</div>';
        if (showTime && timePos === 'bubble_inner') inner = '<div class="qaq-chat-preview-time" style="margin-top:4px;">12:08</div>';

        var radiusStyle = isMe
            ? (bubbleRadius + 'px 4px ' + bubbleRadius + 'px ' + bubbleRadius + 'px')
            : ('4px ' + bubbleRadius + 'px ' + bubbleRadius + 'px ' + bubbleRadius + 'px');

        return '' +
(top ? '<div style="display:flex; justify-content:' + (isMe ? 'flex-end' : 'flex-start') + '; padding: 0 40px; margin-bottom:2px;">' + top + '</div>' : '') +
'<div class="qaq-chat-preview-msg' + (isMe ? ' qaq-me' : '') + '">' +
    (!isMe && showAvatar ? '<div class="qaq-chat-preview-avatar" style="border-radius:' + avatarRadius + 'px; margin-top:2px;"></div>' : '') +
    '<div style="display:flex;flex-direction:column;gap:4px;align-items:' + (isMe ? 'flex-end' : 'flex-start') + ';">' +
        '<div class="qaq-chat-preview-bubble qaq-chat-preview-bubble-live" style="background:' + (isMe ? myColor : otColor) + ';color:' + fontColor + ';font-size:' + fontSize + ';border-radius:' + radiusStyle + ';">' +
            (trans ? '<div style="font-size:12px;color:rgba(0,0,0,.55);margin-bottom:4px;">' + esc(trans) + '</div>' : '') +
            esc(text) + inner +
        '</div>' +
    '</div>' +
    (isMe && showAvatar ? '<div class="qaq-chat-preview-avatar" style="border-radius:' + avatarRadius + 'px; margin-top:2px;"></div>' : '') +
'</div>' +
(bottom ? '<div style="display:flex; justify-content:' + (isMe ? 'flex-end' : 'flex-start') + '; padding: 0 40px; margin-top:2px;">' + bottom + '</div>' : '');
    }

    var showAvatar = avatarShow !== 'hide_all';
    box.innerHTML =
        '<div class="qaq-chat-preview-title">实时预览</div>' +
        '<div class="qaq-chat-preview-row">' +
            buildSample(false, '今天练习得怎么样', 'How was your study today', showAvatar) +
            buildSample(true, '还不错，我记住了很多单词', '', showAvatar) +
        '</div>';

    var styleId = 'qaq-chat-bubble-preview-style';
    var styleNode = document.getElementById(styleId);
    if (!styleNode) {
        styleNode = document.createElement('style');
        styleNode.id = styleId;
        document.head.appendChild(styleNode);
    }
    styleNode.textContent = '.qaq-chat-preview-bubble-live{' + bubbleCss + '}';
}

async function generateImage() {
    var c = getActiveContact();
    if (!c) return;

    var imageUrl = c.imageUrl || '';
    var imageKey = c.imageKey || '';
    var imageModel = c.imageModel || '';
    var globalApi = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');

    if (!imageUrl) imageUrl = globalApi.url || '';
    if (!imageKey) imageKey = globalApi.key || '';
    if (!imageModel) imageModel = 'dall-e-3';

    if (!imageUrl || !imageKey) {
        toast('请先配置生图 API');
        return;
    }

    openModal('生成图片',
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<div class="qaq-chat-set-lbl">描述你想生成的图片</div>' +
            '<textarea class="qaq-modal-textarea" id="qaq-chat-gen-img-prompt" style="height:100px;" placeholder="例如：一只橘猫坐在窗台上看夕阳"></textarea>' +
            '<div class="qaq-chat-set-lbl">默认提示词会自动附加</div>' +
        '</div>',
        {
            confirmText: '生成',
            onConfirm: function () {
                var userPrompt = (qs('qaq-chat-gen-img-prompt').value || '').trim();
                if (!userPrompt) {
                    toast('请输入描述');
                    return false;
                }
                var fullPrompt = userPrompt;
                if (c.imagePrompt) fullPrompt += ', ' + c.imagePrompt;
                doGenerateImage(imageUrl, imageKey, imageModel, fullPrompt, c.imageNegative || '');
            }
        }
    );
}

async function doGenerateImage(apiUrl, apiKey, model, prompt, negative) {
    toast('正在生成图片，请稍候');

    try {
        var payload = {
            model: model,
            prompt: prompt,
            n: 1,
            size: '1024x1024'
        };
        if (negative) {
            payload.negative_prompt = negative;
        }

        var resp = await fetch(normalizeUrl(apiUrl) + '/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        var data = await resp.json();
        var imgData = ((data.data || [])[0] || {});
        var imgUrl = imgData.url || imgData.b64_json || '';

        if (!imgUrl) {
            toast('生图返回为空');
            return;
        }
        if (imgData.b64_json) {
            imgUrl = 'data:image/png;base64,' + imgData.b64_json;
        }

        var s = getStore();
        ensureMessageArr(s, activeContactId).push({
            id: uid('msg'),
            type: 'image',
            isMe: false,
            text: '[图片]',
            imageUrl: imgUrl,
            translated: '',
            time: Date.now()
        });
        setStore(s);
        renderChatMessageList();
        renderMainBody();
        toast('图片已生成');
    } catch (e) {
        toast('生图失败: ' + (e.message || '网络错误'));
    }
}
function checkAIActionFromResponse(content, contactId) {
    var s = getStore();
    var c = s.contacts[contactId];
    if (!c) return;

    var lower = String(content).toLowerCase();

    // 拉黑检测
    if (c.allowBlockUser && (lower.indexOf('[block_user]') > -1 || lower.indexOf('[拉黑用户]') > -1)) {
        c.blocked = true;
        setStore(s);
        toast(getDisplayName(c) + ' 将你拉黑了');
        if (activeContactId === contactId) {
            renderChatWindow();
        }
        renderMainBody();
    }

    // 删除检测
    if (c.allowDeleteUser && (lower.indexOf('[delete_user]') > -1 || lower.indexOf('[删除用户]') > -1)) {
        c.deleted = true;
        if (!s.deletedPool) s.deletedPool = [];
        s.deletedPool.unshift({
            id: c.id,
            avatar: c.avatar,
            nickname: c.nickname,
            remark: c.remark,
            deletedAt: Date.now(),
            reason: 'ai_initiated'
        });
        setStore(s);
        toast(getDisplayName(c) + ' 将你删除了');
        if (activeContactId === contactId) {
            activeContactId = null;
            showOnlyChatPage('qaq-chat-main-page');
        }
        renderMainBody();
    }

    // 日记检测
    if (c.allowAutoDiary) {
        var diaryMatch = content.match(/\[diary\]([\s\S]*?)\[\/diary\]/i);
        if (diaryMatch && diaryMatch[1]) {
            var diaryText = diaryMatch[1].trim();
            if (diaryText) {
                var feedStore = getStore();
                if (!feedStore.feedPosts) feedStore.feedPosts = [];
                feedStore.feedPosts.unshift({
                    id: uid('feed'),
                    cid: contactId,
                    avatar: c.avatar || getDefaultAvatar(),
                    name: getDisplayName(c),
                    text: diaryText,
                    time: Date.now()
                });
                setStore(feedStore);
                toast(getDisplayName(c) + ' 发布了一篇日记');
            }
        }
    }
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
    var bgs = {
        'default': 'linear-gradient(160deg,#f6e9c9 0%,#faebd7 25%,#fce8e2 50%,#fed2e0 75%,#f6e9c9 100%)',
        'cool': 'linear-gradient(160deg,#ebeef3 0%,#f0f2f5 25%,#f3f4f7 50%,#eef0f4 75%,#ebeef3 100%)',
        'dark': 'linear-gradient(160deg,#121212 0%,#1a1a1a 25%,#161616 50%,#1c1c1c 75%,#121212 100%)'
    };
    var headerBgs = {
        'default': 'rgba(255,255,255,0.45)',
        'cool': 'rgba(255,255,255,0.6)',
        'dark': 'rgba(30,30,30,0.75)'
    };
    var headerColors = {
        'default': '#333',
        'cool': '#222',
        'dark': '#e0e0e0'
    };
    var navBgs = {
        'default': 'rgba(255,255,255,0.65)',
        'cool': 'rgba(255,255,255,0.72)',
        'dark': 'rgba(30,30,30,0.8)'
    };
    var navColors = {
        'default': '#aaa',
        'cool': '#a0a8b4',
        'dark': '#666'
    };
    var navActiveColors = {
        'default': '#c47068',
        'cool': '#4a6a9a',
        'dark': '#c47068'
    };
    var navActiveBgs = {
        'default': 'rgba(254,210,224,0.18)',
        'cool': 'rgba(160,180,210,0.15)',
        'dark': 'rgba(120,60,60,0.15)'
    };
    var inputAreaBgs = {
        'default': 'rgba(255,255,255,0.65)',
        'cool': 'rgba(255,255,255,0.65)',
        'dark': 'rgba(30,30,30,0.8)'
    };
    var inputBoxBgs = {
        'default': 'rgba(255,255,255,0.8)',
        'cool': 'rgba(255,255,255,0.85)',
        'dark': 'rgba(50,50,50,0.8)'
    };
    var inputBoxColors = {
        'default': '#333',
        'cool': '#333',
        'dark': '#ddd'
    };
    var sendBtnBgs = {
        'default': 'linear-gradient(135deg,#f6e9c9,#fed2e0)',
        'cool': 'linear-gradient(135deg,#d0d8e8,#bfc9dd)',
        'dark': 'linear-gradient(135deg,#4a3a2a,#5a3a4a)'
    };
    var sendBtnColors = {
        'default': '#8a6050',
        'cool': '#3a4a60',
        'dark': '#d0b8a8'
    };
    var listNameColors = {
        'default': '#333',
        'cool': '#222',
        'dark': '#e0e0e0'
    };
    var listPreviewColors = {
        'default': '#999',
        'cool': '#7d8794',
        'dark': '#777'
    };
    var listTimeColors = {
        'default': '#bbb',
        'cool': '#a0a8b4',
        'dark': '#555'
    };
    var listBorderColors = {
        'default': 'rgba(0,0,0,0.04)',
        'cool': 'rgba(100,130,180,0.06)',
        'dark': 'rgba(255,255,255,0.04)'
    };
    var extMenuBgs = {
        'default': 'rgba(255,255,255,0.5)',
        'cool': 'rgba(255,255,255,0.5)',
        'dark': 'rgba(30,30,30,0.7)'
    };
    var extIconBgs = {
        'default': 'rgba(255,255,255,0.7)',
        'cool': 'rgba(255,255,255,0.8)',
        'dark': 'rgba(50,50,50,0.8)'
    };
    var extIconColors = {
        'default': '#888',
        'cool': '#6a7a8a',
        'dark': '#888'
    };
    var extLabelColors = {
        'default': '#777',
        'cool': '#6a7a8a',
        'dark': '#888'
    };

    var t = theme || 'default';

    var pages = document.querySelectorAll('.qaq-chat-main-page,.qaq-chat-window-page,.qaq-chat-settings-page');
    pages.forEach(function (p) {
        p.classList.remove('qaq-theme-dark', 'qaq-theme-cool');
        if (t === 'dark') p.classList.add('qaq-theme-dark');
        if (t === 'cool') p.classList.add('qaq-theme-cool');
        p.style.background = bgs[t] || bgs['default'];
    });

    document.querySelectorAll('.qaq-chat-header').forEach(function (el) {
        el.style.background = headerBgs[t] || headerBgs['default'];
        el.style.borderBottomColor = listBorderColors[t] || listBorderColors['default'];
    });

    document.querySelectorAll('.qaq-chat-header .qaq-settings-title').forEach(function (el) {
        el.style.color = headerColors[t] || headerColors['default'];
    });

    document.querySelectorAll('.qaq-chat-header .qaq-back-btn svg, .qaq-chat-header .qaq-chat-add-btn svg').forEach(function (el) {
        el.style.stroke = headerColors[t] || headerColors['default'];
    });

    document.querySelectorAll('.qaq-chat-bottom-nav').forEach(function (el) {
        el.style.background = navBgs[t] || navBgs['default'];
        el.style.borderTopColor = listBorderColors[t] || listBorderColors['default'];
    });

    document.querySelectorAll('.qaq-chat-nav-item').forEach(function (el) {
        var isActive = el.classList.contains('qaq-chat-nav-active');
        el.style.color = isActive ? (navActiveColors[t] || navActiveColors['default']) : (navColors[t] || navColors['default']);
        el.style.background = isActive ? (navActiveBgs[t] || navActiveBgs['default']) : 'transparent';
        el.style.borderRadius = isActive ? '10px' : '';
        el.querySelectorAll('svg').forEach(function (svg) {
            svg.style.stroke = isActive ? (navActiveColors[t] || navActiveColors['default']) : (navColors[t] || navColors['default']);
        });
        el.querySelectorAll('span').forEach(function (sp) {
            sp.style.color = isActive ? (navActiveColors[t] || navActiveColors['default']) : (navColors[t] || navColors['default']);
        });
    });

    document.querySelectorAll('.qaq-chat-input-area').forEach(function (el) {
        el.style.background = inputAreaBgs[t] || inputAreaBgs['default'];
        el.style.borderTopColor = listBorderColors[t] || listBorderColors['default'];
    });

    document.querySelectorAll('.qaq-chat-input-box').forEach(function (el) {
        el.style.background = inputBoxBgs[t] || inputBoxBgs['default'];
        el.style.color = inputBoxColors[t] || inputBoxColors['default'];
        el.style.borderColor = t === 'dark' ? 'rgba(80,80,80,0.4)' : (t === 'cool' ? 'rgba(100,130,180,0.12)' : 'rgba(0,0,0,0.06)');
    });

    document.querySelectorAll('.qaq-chat-send-btn, .qaq-chat-recv-ai-btn').forEach(function (el) {
        el.style.background = sendBtnBgs[t] || sendBtnBgs['default'];
        el.style.color = sendBtnColors[t] || sendBtnColors['default'];
    });

    document.querySelectorAll('.qaq-chat-circle-btn').forEach(function (el) {
        el.style.color = t === 'dark' ? '#777' : (t === 'cool' ? '#8a98a8' : '#999');
    });

    document.querySelectorAll('.qaq-chat-ext-menu').forEach(function (el) {
        el.style.background = extMenuBgs[t] || extMenuBgs['default'];
    });

    document.querySelectorAll('.qaq-ext-icon').forEach(function (el) {
        el.style.background = extIconBgs[t] || extIconBgs['default'];
        el.style.color = extIconColors[t] || extIconColors['default'];
    });

    document.querySelectorAll('.qaq-ext-label').forEach(function (el) {
        el.style.color = extLabelColors[t] || extLabelColors['default'];
    });

    _chatCurrentTheme = t;
}

var _chatCurrentTheme = 'default';

function applyChatListItemTheme() {
    var t = _chatCurrentTheme || 'default';
    var listNameC = { 'default': '#333', 'cool': '#222', 'dark': '#e0e0e0' };
    var listPreviewC = { 'default': '#999', 'cool': '#7d8794', 'dark': '#777' };
    var listTimeC = { 'default': '#bbb', 'cool': '#a0a8b4', 'dark': '#555' };
    var listBorderC = { 'default': 'rgba(0,0,0,0.04)', 'cool': 'rgba(100,130,180,0.06)', 'dark': 'rgba(255,255,255,0.04)' };

    document.querySelectorAll('.qaq-chat-list-item').forEach(function (el) {
        el.style.borderBottomColor = listBorderC[t] || listBorderC['default'];
    });
    document.querySelectorAll('.qaq-chat-list-name').forEach(function (el) {
        el.style.color = listNameC[t] || listNameC['default'];
    });
    document.querySelectorAll('.qaq-chat-list-preview').forEach(function (el) {
        el.style.color = listPreviewC[t] || listPreviewC['default'];
    });
    document.querySelectorAll('.qaq-chat-list-time').forEach(function (el) {
        el.style.color = listTimeC[t] || listTimeC['default'];
    });
    document.querySelectorAll('.qaq-chat-set-card').forEach(function (el) {
    el.style.background = t === 'dark' ? 'rgba(40,40,40,0.7)' : (t === 'cool' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)');
    el.style.borderColor = t === 'dark' ? 'rgba(60,60,60,0.5)' : (t === 'cool' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)');
});
document.querySelectorAll('.qaq-chat-set-hd').forEach(function (el) {
    el.style.color = t === 'dark' ? '#ccc' : (t === 'cool' ? '#3a4a60' : '#555');
});
document.querySelectorAll('.qaq-chat-settings-scroll .qaq-settings-item-text').forEach(function (el) {
    el.style.color = t === 'dark' ? '#ddd' : '#333';
});
document.querySelectorAll('.qaq-chat-settings-scroll .qaq-settings-item-icon').forEach(function (el) {
    el.style.color = t === 'dark' ? '#888' : (t === 'cool' ? '#6a7a8a' : '#999');
});
}
function applyChatBubbleTheme() {
    var t = _chatCurrentTheme || 'default';

    var timeCols = { 'default': '#bbb', 'cool': '#a0a8b4', 'dark': '#555' };
    var transCols = { 'default': 'rgba(0,0,0,0.45)', 'cool': 'rgba(58,74,96,0.45)', 'dark': 'rgba(255,255,255,0.35)' };
    var bubbleShadows = { 'default': '0 1px 4px rgba(0,0,0,0.04)', 'cool': '0 1px 4px rgba(100,130,180,0.08)', 'dark': '0 1px 4px rgba(0,0,0,0.2)' };
    var avatarBorders = { 'default': '1px solid rgba(0,0,0,0.04)', 'cool': '1px solid rgba(100,130,180,0.1)', 'dark': '1px solid rgba(255,255,255,0.06)' };

    document.querySelectorAll('.qaq-chat-msg-time').forEach(function (el) {
        el.style.color = timeCols[t] || timeCols['default'];
    });

    document.querySelectorAll('.qaq-chat-trans').forEach(function (el) {
        el.style.color = transCols[t] || transCols['default'];
    });

    document.querySelectorAll('.qaq-chat-bubble').forEach(function (el) {
        el.style.boxShadow = bubbleShadows[t] || bubbleShadows['default'];
    });

    document.querySelectorAll('.qaq-chat-bubble-avatar').forEach(function (el) {
        el.style.border = avatarBorders[t] || avatarBorders['default'];
    });

    document.querySelectorAll('.qaq-chat-voice-btn').forEach(function (el) {
        el.style.color = t === 'dark' ? '#777' : (t === 'cool' ? '#7d8794' : '#999');
    });

    var msgList = qs('qaq-chat-msg-list');
    if (msgList) {
        msgList.style.color = t === 'dark' ? '#ddd' : '#333';
    }
}
function applyChatSettingsTheme() {
    var t = _chatCurrentTheme || 'default';

    document.querySelectorAll('.qaq-chat-fold-card').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = 'rgba(40,40,40,0.92)';
            el.style.borderColor = 'rgba(60,60,60,0.5)';
        } else if (t === 'cool') {
            el.style.background = 'rgba(255,255,255,0.92)';
            el.style.borderColor = 'rgba(255,255,255,0.8)';
        } else {
            el.style.background = 'rgba(255,255,255,0.86)';
            el.style.borderColor = 'rgba(255,255,255,0.6)';
        }
    });

    document.querySelectorAll('.qaq-chat-fold-title').forEach(function (el) {
        el.style.color = t === 'dark' ? '#ddd' : '#333';
    });

    document.querySelectorAll('.qaq-chat-fold-desc').forEach(function (el) {
        el.style.color = t === 'dark' ? '#888' : '#999';
    });

    document.querySelectorAll('.qaq-chat-fold-icon').forEach(function (el) {
        el.style.color = t === 'dark' ? '#d0b8a8' : (t === 'cool' ? '#3a4a60' : '#8a6050');
    });

    document.querySelectorAll('.qaq-chat-fold-arrow').forEach(function (el) {
        el.style.color = t === 'dark' ? '#888' : '#999';
    });

    document.querySelectorAll('.qaq-chat-set-lbl').forEach(function (el) {
        el.style.color = t === 'dark' ? '#888' : '#999';
    });

    document.querySelectorAll('.qaq-chat-toggle-title').forEach(function (el) {
        el.style.color = t === 'dark' ? '#ddd' : '#333';
    });

    document.querySelectorAll('.qaq-chat-inline-note').forEach(function (el) {
        el.style.color = t === 'dark' ? '#666' : '#999';
    });

    document.querySelectorAll('.qaq-chat-set-inp, .qaq-chat-set-sel, .qaq-chat-set-txt').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = '#333';
            el.style.borderColor = '#444';
            el.style.color = '#ddd';
        } else if (t === 'cool') {
            el.style.background = 'rgba(255,255,255,0.92)';
            el.style.borderColor = 'rgba(100,130,180,0.12)';
            el.style.color = '#333';
        } else {
            el.style.background = 'rgba(255,255,255,0.92)';
            el.style.borderColor = 'rgba(0,0,0,0.08)';
            el.style.color = '#333';
        }
    });

    document.querySelectorAll('.qaq-chat-sub-block').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = 'rgba(255,255,255,0.04)';
        } else if (t === 'cool') {
            el.style.background = 'rgba(100,130,180,0.04)';
        } else {
            el.style.background = 'rgba(0,0,0,0.025)';
        }
    });

    document.querySelectorAll('.qaq-chat-mini-btn').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = 'linear-gradient(135deg,#4a3a2a,#5a3a4a)';
            el.style.color = '#d0b8a8';
        } else if (t === 'cool') {
            el.style.background = 'linear-gradient(135deg,#d0d8e8,#bfc9dd)';
            el.style.color = '#3a4a60';
        } else {
            el.style.background = 'linear-gradient(135deg,#f6e9c9,#fed2e0)';
            el.style.color = '#8a6050';
        }
    });

    document.querySelectorAll('.qaq-chat-ghost-btn').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = 'rgba(50,50,50,0.94)';
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.color = '#bbb';
        } else if (t === 'cool') {
            el.style.background = 'rgba(255,255,255,0.94)';
            el.style.borderColor = 'rgba(100,130,180,0.12)';
            el.style.color = '#4a5b72';
        } else {
            el.style.background = '#fff';
            el.style.borderColor = 'rgba(0,0,0,0.08)';
            el.style.color = '#666';
        }
    });

    document.querySelectorAll('.qaq-chat-action-btn').forEach(function (el) {
        var isDanger = el.classList.contains('qaq-danger');
        if (t === 'dark') {
            el.style.background = 'rgba(50,50,50,0.94)';
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.color = isDanger ? '#e05555' : '#bbb';
        } else if (t === 'cool') {
            el.style.background = 'rgba(255,255,255,0.94)';
            el.style.borderColor = 'rgba(100,130,180,0.12)';
            el.style.color = isDanger ? '#d9534f' : '#4a5b72';
        } else {
            el.style.background = 'rgba(255,255,255,0.95)';
            el.style.borderColor = 'rgba(0,0,0,0.08)';
            el.style.color = isDanger ? '#d9534f' : '#555';
        }
    });

    var saveBtn = qs('qaq-chat-settings-save-all');
    if (saveBtn) {
        if (t === 'dark') {
            saveBtn.style.background = 'linear-gradient(135deg,#4a3a2a,#5a3a4a)';
            saveBtn.style.color = '#d0b8a8';
        } else if (t === 'cool') {
            saveBtn.style.background = 'linear-gradient(135deg,#d0d8e8,#bfc9dd)';
            saveBtn.style.color = '#3a4a60';
        } else {
            saveBtn.style.background = 'linear-gradient(135deg,#f6e9c9,#fed2e0)';
            saveBtn.style.color = '#8a6050';
        }
    }

    document.querySelectorAll('.qaq-chat-preview-box').forEach(function (el) {
        if (t === 'dark') {
            el.style.background = 'rgba(255,255,255,0.04)';
            el.style.borderColor = 'rgba(255,255,255,0.08)';
        } else if (t === 'cool') {
            el.style.background = 'rgba(255,255,255,0.92)';
            el.style.borderColor = 'rgba(100,130,180,0.1)';
        } else {
            el.style.background = 'rgba(255,255,255,0.92)';
            el.style.borderColor = 'rgba(0,0,0,0.08)';
        }
    });

    document.querySelectorAll('.qaq-chat-preview-title').forEach(function (el) {
        el.style.color = t === 'dark' ? '#888' : '#999';
    });

    document.querySelectorAll('.qaq-toggle').forEach(function (el) {
        if (!el.closest('.qaq-chat-settings-scroll')) return;
        if (t === 'dark') {
            el.style.background = el.classList.contains('qaq-toggle-on') ? '#8a6a5a' : '#444';
        } else if (t === 'cool') {
            el.style.background = el.classList.contains('qaq-toggle-on') ? '#7a9ab8' : '#ddd';
        } else {
            el.style.background = el.classList.contains('qaq-toggle-on') ? '#c9a08a' : '#ddd';
        }
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
function getDisplaySignature(contact) {
    if (!contact) return '';
    var s = String(contact.signature || '').trim();
    if (!s) s = '这个人很神秘';
    if (s.length > 20) s = s.slice(0, 20) + '…';
    return s;
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
    applyPageThemeClass(_chatCurrentTheme || getGlobalTheme());
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
    applyChatListItemTheme();
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
    applyChatListItemTheme();
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
    applyChatListItemTheme();
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
        applyChatListItemTheme();
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

        var titleEl = qs('qaq-chat-win-title');
        var signEl = qs('qaq-chat-win-sign');
        var avatarEl = qs('qaq-chat-win-avatar');
        var statusIconEl = qs('qaq-chat-win-status-icon');
        var setIconEl = qs('qaq-chat-win-set-icon');

        // ★ 修复：显示备注优先，否则显示昵称
        if (titleEl) titleEl.textContent = c.remark || c.nickname || '聊天';
        
        // ★ 修复：显示个性签名
        if (signEl) signEl.textContent = c.signature || '这个人很神秘';
        
        // ★ 修复：头像自动获取
        if (avatarEl) avatarEl.src = c.avatar || getDefaultAvatar();

        // ★ 修复：状态图标
        if (statusIconEl) {
            statusIconEl.innerHTML = c.blocked
                ? icon('shield-x', 18)
                : (isInDndRange(c)
                    ? icon('moon-star', 18)
                    : icon('circle-dot', 18));
        }

        // ★ 修复：设置图标
        if (setIconEl) {
            setIconEl.innerHTML = icon('settings', 18);
        }

        renderChatFriendTip();
        renderChatMessageList();
        applyChatBubbleTheme();
        renderChatInputArea();
        renderChatExtMenu();
        
        // ★ 修复：底部输入栏图标
        var menuIcon = qs('qaq-chat-toggle-menu-icon');
        var recvIcon = qs('qaq-chat-recv-icon');
        var sendIcon = qs('qaq-chat-send-icon');

        if (menuIcon) menuIcon.innerHTML = icon('plus', 18);
        if (recvIcon) recvIcon.innerHTML = icon('sparkles', 18);
        if (sendIcon) sendIcon.innerHTML = icon('send-horizontal', 18);
        
        // ★ 刷新 lucide 图标
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    });
}
function initChatWindowIcons() {
    var menuIcon = qs('qaq-chat-toggle-menu-icon');
    var recvIcon = qs('qaq-chat-recv-icon');
    var sendIcon = qs('qaq-chat-send-icon');

    if (menuIcon) menuIcon.innerHTML = icon('plus', 18);
    if (recvIcon) recvIcon.innerHTML = icon('sparkles', 18);
    if (sendIcon) sendIcon.innerHTML = icon('send-horizontal', 18);

    window.lucide && window.lucide.createIcons && window.lucide.createIcons();
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
    var imageHtml = '';
if (m.type === 'image' && m.imageUrl) {
    imageHtml = '<img src="' + esc(m.imageUrl) + '" style="max-width:200px;max-height:200px;border-radius:10px;display:block;margin-top:6px;cursor:pointer;" onclick="window.open(this.src)">';
    if (!m.text || m.text === '[图片]') bubbleText = '';
}
    var transText = m.translated ? esc(m.translated) : '';
    var bubbleInner = '';
    var outerTop = '';
    var outerBottom = '';

    // 图片消息处理
    var imageHtml = '';
    if (m.type === 'image' && m.imageUrl) {
        imageHtml = '<img src="' + esc(m.imageUrl) + '" style="max-width:200px;max-height:200px;border-radius:10px;display:block;margin-top:6px;cursor:pointer;" onclick="window.open(this.src)">';
        if (!m.text || m.text === '[图片]') bubbleText = '';
    }

    if (transMode === 'in_top' && transText) bubbleInner += '<div class="qaq-chat-trans">' + transText + '</div>';
bubbleInner += bubbleText;
bubbleInner += imageHtml;
if (transMode === 'in_bottom' && transText) bubbleInner += '<div class="qaq-chat-trans">' + transText + '</div>';

    // 朗读按钮
    var voiceBtn = '';
    if (!isMe && c.voiceUrl) {
        voiceBtn = '<div class="qaq-chat-voice-btn" data-qaq-voice-idx="' + idx + '" style="margin-top:6px;font-size:11px;color:#999;cursor:pointer;display:flex;align-items:center;gap:4px;user-select:none;">' + icon('volume-2', 13) + ' 朗读</div>';
    }

    bubbleInner += imageHtml;
    bubbleInner += voiceBtn;

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
        var leftAvatar = isMe ? '' : avatarHtml;
var rightAvatar = isMe ? avatarHtml : '';

var timeRowTop = topTime ? '<div style="display:flex; align-items:center; justify-content:' + (isMe ? 'flex-end' : 'flex-start') + '; padding: 0 54px; margin-bottom: 4px;">' + topTime + '</div>' : '';
var timeRowBot = bottomTime ? '<div style="display:flex; align-items:center; justify-content:' + (isMe ? 'flex-end' : 'flex-start') + '; padding: 0 54px; margin-top: 4px;">' + bottomTime + '</div>' : '';

return timeRowTop + 
    '<div class="qaq-chat-row ' + (isMe ? 'qaq-row-me' : 'qaq-row-other') + '">' +
        leftAvatar +
        '<div class="qaq-chat-bubble-wrap' + ((transMode === 'out_top' || transMode === 'out_bottom') ? ' qaq-has-outer-tr' : '') + '">' +
            outerTop +
            '<div class="qaq-chat-bubble" style="' + buildBubbleTailStyle(isMe, cfg.uiBubbleRadius) + 'font-size:' + (cfg.uiFontSize || '14px') + ';color:' + (cfg.uiFontColor || '#333333') + ';">' + bubbleInner + innerTime + '</div>' +
            outerBottom +
        '</div>' +
        rightAvatar +
    '</div>' + 
    timeRowBot;
    }).join('');
    if (!arr.length) {
        html = '<div style="text-align:center;color:#aaa;padding:40px 20px;font-size:13px;">开始聊天吧</div>';
    }
    list.innerHTML = html;
    // ★ 绑定朗读按钮事件
list.querySelectorAll('[data-qaq-voice-idx]').forEach(function (el) {
    el.onclick = function (e) {
        e.stopPropagation();
        var idx2 = parseInt(this.getAttribute('data-qaq-voice-idx'), 10);
        var msg = arr[idx2];
        if (msg && msg.text) playMiniMaxVoice(msg.text);
    };
});
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
    { id: 'sticker', text: '表情', icon: 'smile-plus' },
    { id: 'voice', text: '语音', icon: 'mic' },
    { id: 'photo', text: '图片', icon: 'image-plus' },
    { id: 'transfer', text: '转账', icon: 'wallet-cards' },
    { id: 'delivery', text: '快递', icon: 'package' },
    { id: 'offline', text: '线下', icon: 'handshake' },
    { id: 'theater', text: '剧场', icon: 'clapperboard' },
    { id: 'video', text: '视频', icon: 'video' },
    { id: 'voicecall', text: '通话', icon: 'phone-call' },
    { id: 'location', text: '位置', icon: 'map-pinned' },
    { id: 'diary', text: '日记', icon: 'notebook-pen' }
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
async function playMiniMaxVoice(text) {
    var c = getActiveContact();
    if (!c || !c.voiceUrl) {
        toast('未配置语音 API');
        return;
    }
    var voiceKey = c.voiceKey || c.apiKey || '';
    var globalApi = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');
    if (!voiceKey) voiceKey = globalApi.key || '';
    if (!voiceKey) {
        toast('缺少语音 API Key');
        return;
    }

    var url = normalizeUrl(c.voiceUrl);
    var groupId = (c.voiceGroup || '').trim();
    if (groupId) url = url + '?GroupId=' + encodeURIComponent(groupId);

    var payload = {
        model: c.voiceModel || 'speech-02-hd',
        text: text,
        stream: false,
        voice_setting: {
            voice_id: 'female-shaonv',
            speed: c.voiceSpeed != null ? c.voiceSpeed : 0.9
        },
        audio_setting: {
            sample_rate: 32000,
            format: 'mp3'
        }
    };

    toast('正在合成语音');

    try {
        var resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + voiceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        var data = await resp.json();
        var audioHex = '';

        if (data && data.data && data.data.audio) {
            audioHex = data.data.audio;
        } else if (data && data.audio) {
            audioHex = data.audio;
        } else if (data && data.extra_info && data.extra_info.audio) {
            audioHex = data.extra_info.audio;
        }

        if (!audioHex) {
            toast('语音合成返回为空');
            return;
        }

        var byteArr = new Uint8Array(audioHex.length / 2);
        for (var i = 0; i < audioHex.length; i += 2) {
            byteArr[i / 2] = parseInt(audioHex.substr(i, 2), 16);
        }
        var blob = new Blob([byteArr], { type: 'audio/mp3' });
        var audioUrl = URL.createObjectURL(blob);
        var audio = new Audio(audioUrl);
        audio.onended = function () { URL.revokeObjectURL(audioUrl); };
        audio.onerror = function () {
            URL.revokeObjectURL(audioUrl);
            toast('语音播放失败');
        };
        audio.play();
    } catch (e) {
        toast('语音合成失败: ' + (e.message || '网络错误'));
    }
}
function handleExtAction(type) {
    if (type === 'photo') {
        generateImage();
        return;
    }
    var map = {
        sticker: '表情功能开发中',
        voice: '发送语音功能开发中',
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
var latestForDnd = getStore().contacts[activeContactId];
if (latestForDnd && isInDndRange(latestForDnd)) {
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
var latestForDnd = getStore().contacts[activeContactId];
if (latestForDnd && isInDndRange(latestForDnd)) {
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
        if (c.worldBookId) {
    try {
        var allBooks = JSON.parse(localStorage.getItem('qaq-wordbooks') || '[]');
        var wb = allBooks.find(function (b) { return (b.id || b.bookId) === c.worldBookId; });
        if (wb) {
            lines.push('当前绑定世界书：' + (wb.name || wb.title || ''));
            var entries = wb.words || wb.entries || [];
            if (entries.length) {
                lines.push('世界书词条（供角色参考，自然融入对话）：');
                entries.slice(0, 50).forEach(function (e) {
                    lines.push('- ' + (e.word || e.key || '') + ': ' + (e.meaning || e.value || e.content || ''));
                });
            }
        }
    } catch (e) {}
}
if (c.bindGroupMemory) lines.push('你可以引用群聊中的共同记忆。');
if (c.bindVideoMemory) lines.push('你可以引用视频通话中的共同记忆。');
if (c.bindVoiceMemory) lines.push('你可以引用语音通话中的共同记忆。');
if (c.bindOfflineMemory) lines.push('你可以引用线下见面的共同记忆。');
if (c.summaryMemory) lines.push('你会自动总结过往对话要点，保持长期记忆连贯。');
if (c.allowAutoMessage) lines.push('你可以主动发起话题，不必等用户先说话。');
if (c.allowAutoDiary) lines.push('你可以在合适时机主动写一篇日记分享给用户，格式为 [diary]日记内容[/diary]。');
if (c.allowBlockUser) lines.push('如果用户行为恶劣，你有权拉黑用户，在回复末尾加上 [block_user] 标记。');
if (c.allowDeleteUser) lines.push('如果关系破裂，你有权删除用户，在回复末尾加上 [delete_user] 标记。');

        lines.push('要求：');
        lines.push('1. 回复自然，像真实聊天。');
        lines.push('2. 不要自称人工智能、模型、助手。');
        lines.push('3. 允许口语化，避免模板化。');
        if (cfg.translateEnabled !== false && cfg.translateMode !== 'hide') {
            lines.push('4. 输出 JSON，格式必须是：{"original_text":"原文","translation":"翻译"}');
        } else {
            lines.push('4. 直接输出纯文本，不要 JSON，不要 markdown。');
        }
        if (c.bindGroupMemory) lines.push('你可以引用群聊中的共同记忆。');
if (c.bindVideoMemory) lines.push('你可以引用视频通话中的共同记忆。');
if (c.bindVoiceMemory) lines.push('你可以引用语音通话中的共同记忆。');
if (c.bindOfflineMemory) lines.push('你可以引用线下见面的共同记忆。');
if (c.summaryMemory) lines.push('你会自动总结过往对话要点，保持长期记忆连贯。');
if (c.allowAutoMessage) lines.push('你可以主动发起话题，不必等用户先说话。');
if (c.allowAutoDiary) lines.push('你可以在合适时机主动写一篇日记分享给用户，格式为 [diary]日记内容[/diary]，日记内容用自然语言书写。');
if (c.allowBlockUser) lines.push('如果用户行为恶劣，你有权拉黑用户。');
if (c.allowDeleteUser) lines.push('如果关系破裂，你有权删除用户。');
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

checkAIActionFromResponse(text, activeContactId);

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
                    signature: '很高兴认识你',
signatureAutoChange: true,
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
                    voiceGroup: '',
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
    var c = getActiveContact();
    if (c) {
        _chatCurrentTheme = c.uiTheme || getGlobalTheme();
applyPageThemeClass(_chatCurrentTheme);
applyRuntimeStyle(c);
renderMainBody();
renderChatWindow();
toast('设置已保存');
    }
    renderSettingsPage();
    showOnlyChatPage('qaq-chat-settings-page');
}

function renderSettingsPage() {
    ensureChatSettingsStyle();

    var c = getActiveContact();
    var s = getStore();
    if (!c) return;

    var me = s.myProfile || {};
    var body = qs('qaq-chat-settings-scroll');
    if (!body) return;

    var worldBookOptions = getWorldBookOptions();
    var worldBookOptions = getWorldBookOptions();
var personaPresetStore = getChatSettingPresets();

var defaultImagePrompt = c.imagePrompt || 'anime style, soft lighting, warm color palette, detailed background, cinematic composition, high quality illustration';
var defaultImageNegative = c.imageNegative || 'blurry, low quality, deformed, ugly, watermark, text, signature, extra limbs, bad anatomy';
var defaultGlobalCss = c.uiGlobalCss || '.qaq-chat-msg-list {\n  letter-spacing: 0.3px;\n  line-height: 1.85;\n}';
var defaultBubbleCss = c.uiBubbleCss || 'padding: 8px 12px;\nbox-shadow: 0 1px 4px rgba(0,0,0,0.06);\nborder: 1px solid rgba(0,0,0,0.04);';
    var personaPresetStore = getChatSettingPresets();

    var otherHtml =
        '<div class="qaq-chat-set-grid">' +
            '<div class="qaq-chat-set-row-wrap">' +
                '<div class="qaq-chat-set-col" style="flex:1.2;">' +
                    '<div class="qaq-chat-set-lbl">头像</div>' +
                    '<div class="qaq-chat-set-row">' +
                        '<input class="qaq-chat-set-inp" id="qaq-chs-o-avatar" value="' + esc(c.avatar || '') + '" placeholder="头像 URL 或 DataURL">' +
                        '<button class="qaq-chat-mini-btn" id="qaq-chs-o-avatar-btn">导入</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-set-row-wrap">' +
                chatTextInput('qaq-chs-o-name', '昵称', c.nickname || '', '例如 Alice') +
                chatTextInput('qaq-chs-o-remark', '备注', c.remark || '', '备注优先显示') +
            '</div>' +

            '<div class="qaq-chat-set-row-wrap">' +
    chatTextInput('qaq-chs-o-real', '真实名字', c.realName || '', '可选') +
    chatClickSelect('qaq-chs-o-worldbook', '绑定世界书', c.worldBookId || '', worldBookOptions) +
'</div>' +

'<div class="qaq-chat-set-row-wrap">' +
    chatTextInput('qaq-chs-o-signature', '个性签名', c.signature || '', ) +
'</div>' +

            chatTextarea('qaq-chs-o-persona', '具体人设', c.persona || '', '输入详细角色人设', 92) +

            '<div class="qaq-chat-sub-block">' +
                chatToggleRow('qaq-chs-o-sticker-row', '是否会主动发表情包', !!c.activeSticker) +
                chatToggleRow('qaq-chs-o-translate-row', '开启双语翻译', c.translateEnabled !== false) +
                chatClickSelect('qaq-chs-o-translate-mode', '翻译显示模式', c.translateMode || 'in_bottom', [
                    { value: 'in_top', label: '气泡内上方' },
                    { value: 'in_bottom', label: '气泡内下方' },
                    { value: 'out_top', label: '气泡外上方' },
                    { value: 'out_bottom', label: '气泡外下方' },
                    { value: 'hide', label: '隐藏翻译' }
                ]) +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatNumberInput('qaq-chs-o-mem-max', '最大记忆条数', c.memMax == null ? 20 : c.memMax, 1, 300, 1) +
                chatToggleRow('qaq-chs-o-bind-group-row', '挂载群聊记忆', !!c.bindGroupMemory) +
                chatToggleRow('qaq-chs-o-bind-video-row', '挂载视频通话记忆', !!c.bindVideoMemory) +
                chatToggleRow('qaq-chs-o-bind-voice-row', '挂载语音通话记忆', !!c.bindVoiceMemory) +
                chatToggleRow('qaq-chs-o-bind-offline-row', '挂载线下记忆', !!c.bindOfflineMemory) +
                chatToggleRow('qaq-chs-o-summary-memory-row', '总结记忆功能', !!c.summaryMemory) +
                '<div id="qaq-chs-o-summary-count-block">' +
                    chatNumberInput('qaq-chs-o-summary-count', '总结条数', c.summaryCount == null ? 50 : c.summaryCount, 1, 500, 1) +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatToggleRow('qaq-chs-o-video-row', '允许主动发起视频通话', !!c.allowVideoCall) +
                chatToggleRow('qaq-chs-o-voice-row', '允许主动发起语音通话', !!c.allowVoiceCall) +
                chatToggleRow('qaq-chs-o-auto-message-row', '允许主动发送消息', !!c.allowAutoMessage) +
                '<div id="qaq-chs-o-auto-message-block">' +
                    chatNumberInput('qaq-chs-o-auto-gap', '主动消息间隔（分钟）', c.autoMessageGap == null ? 60 : c.autoMessageGap, 1, 1440, 1) +
                '</div>' +
                chatToggleRow('qaq-chs-o-allow-block-row', '允许角色拉黑用户', !!c.allowBlockUser) +
                chatToggleRow('qaq-chs-o-allow-delete-row', '允许角色删除用户', !!c.allowDeleteUser) +
                chatToggleRow('qaq-chs-o-auto-diary-row', '允许角色主动生成日记', !!c.allowAutoDiary) +
                chatToggleRow('qaq-chs-o-sign-auto-row', '允许角色自行更改个签', !!c.signatureAutoChange) +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                '<div class="qaq-chat-set-lbl">聊天专属 API 设置，留空则调用全局 API</div>' +
                chatTextInput('qaq-chs-o-api-url', 'API URL', c.apiUrl || '', '例如 https://api.example.com/v1') +
                '<div class="qaq-chat-set-row-wrap">' +
    chatTextInput('qaq-chs-o-api-key', 'API Key', c.apiKey || '', '专属 API Key') +
'</div>' +
'<div class="qaq-chat-set-row" style="display:flex;gap:8px;align-items:stretch;">' +
    '<div class="qaq-chat-set-col" style="flex:1;">' +
        '<div class="qaq-chat-set-lbl">Model</div>' +
        '<input class="qaq-chat-set-inp" id="qaq-chs-o-api-model" value="' + esc(c.apiModel || '') + '" placeholder="例如 gpt-4o">' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;justify-content:flex-end;">' +
        '<button class="qaq-chat-mini-btn" id="qaq-chs-o-fetch-models-btn" style="height:38px;">拉取</button>' +
    '</div>' +
'</div>' +

            '<div id="qaq-chs-o-mm-voice-block">' +
    chatClickSelect('qaq-chs-o-voice-url', '服务节点', c.voiceUrl || 'https://api.minimax.chat/v1/t2a_v2', [
        { value: 'https://api.minimax.chat/v1/t2a_v2', label: '国内节点 api.minimax.chat' },
        { value: 'https://api.minimaxi.chat/v1/t2a_v2', label: '国际节点 api.minimaxi.chat' },
        { value: 'https://api.minimax.com/v1/t2a_v2', label: '国际节点 api.minimax.com' }
    ]) +
    '<div class="qaq-chat-set-row-wrap">' +
        chatTextInput('qaq-chs-o-voice-key', '语音 API Key', c.voiceKey || '', '留空则借用聊天 Key') +
        chatTextInput('qaq-chs-o-voice-model', '语音模型', c.voiceModel || 'speech-02-hd', '如 speech-02-hd') +
    '</div>' +
    chatTextInput('qaq-chs-o-voice-group', 'Group ID', c.voiceGroup || '', '旧版账号必填，新版留空') +
    chatClickSelect('qaq-chs-o-voice-model-sel', '语音模型快选', c.voiceModel || 'speech-02-hd', [
        { value: 'speech-02-hd', label: 'speech-02-hd (推荐)' },
        { value: 'speech-02-turbo', label: 'speech-02-turbo' },
        { value: 'speech-2.8-hd', label: 'speech-2.8-hd' },
        { value: 'speech-2.8-turbo', label: 'speech-2.8-turbo' },
        { value: 'speech-01-turbo', label: 'speech-01-turbo' }
    ]) +
    chatNumberInput('qaq-chs-o-voice-speed', '语速', c.voiceSpeed == null ? 0.9 : c.voiceSpeed, 0.5, 2, 0.1) +
'</div>' +

            '<div class="qaq-chat-sub-block">' +
                '<div class="qaq-chat-set-lbl">生图 API 设置，可接入 OpenAI 生图模型</div>' +
                chatTextInput('qaq-chs-o-image-url', '生图 API URL', c.imageUrl || '', '例如 https://api.openai.com/v1') +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatTextInput('qaq-chs-o-image-key', '生图 API Key', c.imageKey || '', '专属生图 Key') +
                    chatTextInput('qaq-chs-o-image-model', '生图模型', c.imageModel || '', '例如 gpt-image-1') +
                '</div>' +
                '<div style="display:flex;flex-direction:column;justify-content:flex-end;">' +
        '<button class="qaq-chat-mini-btn" id="qaq-chs-o-fetch-models-btn" style="height:38px;">拉取</button>' +
    '</div>' +
'</div>' +
                chatTextarea('qaq-chs-o-image-prompt', '默认生图提示词', defaultImagePrompt, '描述画面风格和内容', 78) +
chatTextarea('qaq-chs-o-image-negative', '反向提示词', defaultImageNegative, '排除不想要的元素', 70) +
            '</div>' +
        '</div>';

    var myHtml =
        '<div class="qaq-chat-set-grid">' +
            '<div class="qaq-chat-set-col">' +
                '<div class="qaq-chat-set-lbl">头像</div>' +
                '<div class="qaq-chat-set-row">' +
                    '<input class="qaq-chat-set-inp" id="qaq-chs-m-avatar" value="' + esc(me.avatar || '') + '" placeholder="头像 URL 或 DataURL">' +
                    '<button class="qaq-chat-mini-btn" id="qaq-chs-m-avatar-btn">导入</button>' +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-set-row-wrap">' +
                chatTextInput('qaq-chs-m-name', '昵称', me.nickname || '', '例如 学生') +
                chatTextInput('qaq-chs-m-real', '真名', me.realName || '', '可选') +
            '</div>' +

            chatTextarea('qaq-chs-m-persona', '具体人设', me.persona || '', '输入我方人设', 92) +

            '<div class="qaq-chat-set-row-wrap">' +
                '<div class="qaq-chat-set-col">' +
                    '<div class="qaq-chat-set-lbl">人设预设</div>' +
                    '<div class="qaq-chat-set-row">' +
                        '<button class="qaq-chat-ghost-btn" id="qaq-chs-m-persona-import">导入预设</button>' +
                        '<button class="qaq-chat-ghost-btn" id="qaq-chs-m-persona-save">保存预设</button>' +
                        '<button class="qaq-chat-ghost-btn" id="qaq-chs-m-persona-export">导出预设</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
var defaultGlobalCss = c.uiGlobalCss || '.qaq-chat-msg-list {\n  letter-spacing: 0.3px;\n  line-height: 1.85;\n}';
var defaultBubbleCss = c.uiBubbleCss || 'padding: 12px 14px;\nbox-shadow: 0 2px 8px rgba(0,0,0,0.06);\nborder: 1px solid rgba(0,0,0,0.04);';
    var uiHtml =
        '<div class="qaq-chat-set-grid">' +
            '<div class="qaq-chat-sub-block">' +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatClickSelect('qaq-chs-u-theme', '主题颜色', c.uiTheme || getGlobalTheme(), [
                        { value: 'default', label: '暖阳' },
                        { value: 'cool', label: '冷雾' },
                        { value: 'dark', label: '夜幕' }
                    ]) +
                    chatClickSelect('qaq-chs-u-avatar-show', '头像显示设置', c.uiAvatarShow || 'all', [
                        { value: 'all', label: '头像全显示' },
                        { value: 'hide_all', label: '头像全隐藏' },
                        { value: 'first', label: '首条头像' },
                        { value: 'last', label: '末条头像' }
                    ]) +
                '</div>' +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatTextInput('qaq-chs-u-bubble-my', '我的气泡颜色', c.uiBubbleMy || getBubbleThemeDefaults(c.uiTheme || getGlobalTheme()).my, '#fce8e2') +
                    chatTextInput('qaq-chs-u-bubble-other', '对方气泡颜色', c.uiBubbleOther || getBubbleThemeDefaults(c.uiTheme || getGlobalTheme()).other, '#ffffff') +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatToggleRow('qaq-chs-u-show-time-row', '显示时间戳', !!c.uiShowTime) +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatClickSelect('qaq-chs-u-time-pos', '时间戳位置', c.uiTimePos || 'top', [
                        { value: 'top', label: '气泡上方' },
                        { value: 'bottom', label: '气泡下方' },
                        { value: 'bubble_inner', label: '气泡内侧' },
                        { value: 'bubble_outer', label: '气泡外侧' },
                        { value: 'avatar_top', label: '头像上方' },
                        { value: 'avatar_bottom', label: '头像下方' }
                    ]) +
                    chatClickSelect('qaq-chs-u-time-fmt', '时间戳格式', c.uiTimeFmt || 'HH:mm', [
                        { value: 'HH:mm', label: 'HH:mm' },
                        { value: 'HH:mm:ss', label: 'HH:mm:ss' },
                        { value: 'MM-DD HH:mm', label: 'MM-DD HH:mm' },
                        { value: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm' }
                    ]) +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatToggleRow('qaq-chs-u-hide-reply-row', '隐藏回复按钮', !!c.uiHideReplyBtn, '输入框自动铺满至回复按钮位置') +
                chatToggleRow('qaq-chs-u-hide-menu-row', '隐藏菜单栏按钮', !!c.uiHideMenuBtn, '输入框自动铺满至菜单按钮位置') +
                '<div id="qaq-chs-u-menu-pos-wrap">' +
                    chatClickSelect('qaq-chs-u-menu-pos', '菜单出现位置', c.uiMenuPos || 'top', [
                        { value: 'top', label: '输入底栏上方' },
                        { value: 'bottom', label: '输入底栏下方' },
                        { value: 'inside', label: '收在菜单栏里' }
                    ]) +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatNumberInput('qaq-chs-u-avatar-radius', '头像圆角', c.uiAvatarRadius == null ? 10 : c.uiAvatarRadius, 0, 40, 1) +
                    chatNumberInput('qaq-chs-u-bubble-radius', '气泡圆角', c.uiBubbleRadius == null ? 16 : c.uiBubbleRadius, 0, 40, 1) +
                '</div>' +
                '<div class="qaq-chat-set-row-wrap">' +
                    '<div class="qaq-chat-set-col">' +
                        '<div class="qaq-chat-set-lbl">字体 URL</div>' +
                        '<div class="qaq-chat-set-row">' +
                            '<input class="qaq-chat-set-inp" id="qaq-chs-u-font-url" value="' + esc(c.uiFontUrl || '') + '" placeholder="字体文件 URL 或 DataURL">' +
                            '<button class="qaq-chat-mini-btn" id="qaq-chs-u-font-btn">导入</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="qaq-chat-set-row-wrap">' +
                    chatNumberInput('qaq-chs-u-font-size', '字体大小', parseInt(c.uiFontSize || '14px', 10) || 14, 10, 30, 1) +
                    chatTextInput('qaq-chs-u-font-color', '字体颜色', c.uiFontColor || '#333333', '#333333') +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatTextarea('qaq-chs-u-global-css', '全局 CSS', defaultGlobalCss, '作用于聊天页整体，例如 letter-spacing、line-height', 96) +
                '<div class="qaq-chat-set-row">' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-global-css-save">保存预设</button>' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-global-css-import">导入预设</button>' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-global-css-export">导出预设</button>' +
                '</div>' +
            '</div>' +

            '<div class="qaq-chat-sub-block">' +
                chatTextarea('qaq-chs-u-bubble-css', '气泡 CSS', defaultBubbleCss, '仅作用于气泡，支持实时预览', 96) +
                '<div class="qaq-chat-set-row">' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-bubble-css-save">保存预设</button>' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-bubble-css-import">导入预设</button>' +
                    '<button class="qaq-chat-ghost-btn" id="qaq-chs-u-bubble-css-export">导出预设</button>' +
                '</div>' +
                '<div class="qaq-chat-preview-box" id="qaq-chat-bubble-css-preview"></div>' +
            '</div>' +
        '</div>';

    var historyHtml =
        '<div class="qaq-chat-set-grid">' +
            '<button class="qaq-chat-action-btn" id="qaq-chat-history-import">导入聊天记录</button>' +
            '<button class="qaq-chat-action-btn" id="qaq-chat-history-export">导出聊天记录</button>' +
            '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-history-clear">清除聊天记录</button>' +
        '</div>';

    var wasDeletedByAI = (s.deletedPool || []).some(function (x) {
    return x.id === c.id && x.reason === 'ai_initiated';
});

var otherOpsHtml =
    '<div class="qaq-chat-set-grid">' +
        '<div class="qaq-chat-sub-block">' +
            chatToggleRow('qaq-chs-x-dnd-row', '角色勿扰', !!c.dnd) +
            chatTextInput('qaq-chs-x-dnd-time', '勿扰时间', c.dndTime || '', '格式如 23:00-07:00') +
        '</div>' +
        '<button class="qaq-chat-action-btn" id="qaq-chat-block-contact-btn">' + (c.blocked ? '取消拉黑角色' : '拉黑角色') + '</button>' +
        '<button class="qaq-chat-action-btn qaq-danger" id="qaq-chat-delete-contact-btn">删除角色</button>' +
        '<button class="qaq-chat-action-btn" id="qaq-chat-recover-contact-btn"' + (wasDeletedByAI ? '' : ' style="display:none;"') + '>加回角色</button>' +
    '</div>';

    body.innerHTML =
        chatFoldCard('qaq-chat-fold-other', '对方设置', '角色信息与行为控制', 'user-round', otherHtml, true) +
        chatFoldCard('qaq-chat-fold-me', '我方设置', '我的身份信息与人设', 'id-card', myHtml, false) +
        chatFoldCard('qaq-chat-fold-ui', '美化设置', '气泡、主题、字体、样式', 'palette', uiHtml, false) +
        chatFoldCard('qaq-chat-fold-history', '聊天记录', '导入、导出、清理', 'history', historyHtml, false) +
        chatFoldCard('qaq-chat-fold-other-op', '其他', '勿扰、拉黑、删除、恢复', 'settings-2', otherOpsHtml, false) +
        '<button class="qaq-chat-set-save" id="qaq-chat-settings-save-all">保存全部设置</button>';

    window.lucide && window.lucide.createIcons && window.lucide.createIcons();
    bindFoldEvents(body);

    qs('qaq-chs-o-avatar-btn').onclick = function () { chooseImage('qaq-chs-o-avatar'); };
    qs('qaq-chs-m-avatar-btn').onclick = function () { chooseImage('qaq-chs-m-avatar'); };
    qs('qaq-chs-u-font-btn').onclick = function () { chooseFont('qaq-chs-u-font-url'); };

    setToggleValue('qaq-chs-o-sticker-row', !!c.activeSticker);
    setToggleValue('qaq-chs-o-translate-row', c.translateEnabled !== false);
    setToggleValue('qaq-chs-o-bind-group-row', !!c.bindGroupMemory);
    setToggleValue('qaq-chs-o-bind-video-row', !!c.bindVideoMemory);
    setToggleValue('qaq-chs-o-bind-voice-row', !!c.bindVoiceMemory);
    setToggleValue('qaq-chs-o-bind-offline-row', !!c.bindOfflineMemory);
    setToggleValue('qaq-chs-o-summary-memory-row', !!c.summaryMemory);
    setToggleValue('qaq-chs-o-video-row', !!c.allowVideoCall);
    setToggleValue('qaq-chs-o-voice-row', !!c.allowVoiceCall);
    setToggleValue('qaq-chs-o-auto-message-row', !!c.allowAutoMessage);
    setToggleValue('qaq-chs-o-allow-block-row', !!c.allowBlockUser);
    setToggleValue('qaq-chs-o-allow-delete-row', !!c.allowDeleteUser);
    setToggleValue('qaq-chs-o-auto-diary-row', !!c.allowAutoDiary);
    setToggleValue('qaq-chs-o-mm-voice-row', !!c.voiceUrl);

    setToggleValue('qaq-chs-u-show-time-row', !!c.uiShowTime);
    setToggleValue('qaq-chs-u-hide-reply-row', !!c.uiHideReplyBtn);
    setToggleValue('qaq-chs-u-hide-menu-row', !!c.uiHideMenuBtn);

    setToggleValue('qaq-chs-x-dnd-row', !!c.dnd);

    bindToggleRowById('qaq-chs-o-sticker-row', 'qaq-chs-o-sticker-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-translate-row', 'qaq-chs-o-translate-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-bind-group-row', 'qaq-chs-o-bind-group-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-bind-video-row', 'qaq-chs-o-bind-video-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-bind-voice-row', 'qaq-chs-o-bind-voice-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-bind-offline-row', 'qaq-chs-o-bind-offline-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-summary-memory-row', 'qaq-chs-o-summary-memory-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-video-row', 'qaq-chs-o-video-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-voice-row', 'qaq-chs-o-voice-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-auto-message-row', 'qaq-chs-o-auto-message-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-allow-block-row', 'qaq-chs-o-allow-block-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-allow-delete-row', 'qaq-chs-o-allow-delete-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-auto-diary-row', 'qaq-chs-o-auto-diary-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-o-mm-voice-row', 'qaq-chs-o-mm-voice-row', syncConditionalBlocks);

    bindToggleRowById('qaq-chs-u-show-time-row', 'qaq-chs-u-show-time-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-u-hide-reply-row', 'qaq-chs-u-hide-reply-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-u-hide-menu-row', 'qaq-chs-u-hide-menu-row', syncConditionalBlocks);
    bindToggleRowById('qaq-chs-x-dnd-row', 'qaq-chs-x-dnd-row', syncConditionalBlocks);

    [
        'qaq-chs-u-theme',
        'qaq-chs-u-avatar-show',
        'qaq-chs-u-bubble-my',
        'qaq-chs-u-bubble-other',
        'qaq-chs-u-time-pos',
        'qaq-chs-u-time-fmt',
        'qaq-chs-u-avatar-radius',
        'qaq-chs-u-bubble-radius',
        'qaq-chs-u-font-size',
        'qaq-chs-u-font-color',
        'qaq-chs-u-bubble-css'
    ].forEach(function (id) {
        var el = qs(id);
        if (el) {
            el.addEventListener('input', renderBubbleCssPreview);
            el.addEventListener('change', renderBubbleCssPreview);
        }
    });

    qs('qaq-chs-m-persona-save').onclick = function () {
        openPresetSaveDialog('persona', (qs('qaq-chs-m-persona').value || '').trim());
    };
    qs('qaq-chs-m-persona-import').onclick = function () {
        openPresetPickDialog('persona', function (v) {
            qs('qaq-chs-m-persona').value = v || '';
        });
    };
    qs('qaq-chs-m-persona-export').onclick = function () {
        exportJsonFile('qaq-chat-persona-presets.json', { type: 'persona', list: personaPresetStore.persona || [] });
    };

    qs('qaq-chs-u-global-css-save').onclick = function () {
        openPresetSaveDialog('globalCss', (qs('qaq-chs-u-global-css').value || '').trim());
    };
    qs('qaq-chs-u-global-css-import').onclick = function () {
        openPresetPickDialog('globalCss', function (v) {
            qs('qaq-chs-u-global-css').value = v || '';
        });
    };
    qs('qaq-chs-u-global-css-export').onclick = function () {
        exportJsonFile('qaq-chat-global-css-presets.json', { type: 'globalCss', list: getChatSettingPresets().globalCss || [] });
    };

    qs('qaq-chs-u-bubble-css-save').onclick = function () {
        openPresetSaveDialog('bubbleCss', (qs('qaq-chs-u-bubble-css').value || '').trim());
    };
    qs('qaq-chs-u-bubble-css-import').onclick = function () {
        openPresetPickDialog('bubbleCss', function (v) {
            qs('qaq-chs-u-bubble-css').value = v || '';
            renderBubbleCssPreview();
        });
    };
    qs('qaq-chs-u-bubble-css-export').onclick = function () {
        exportJsonFile('qaq-chat-bubble-css-presets.json', { type: 'bubbleCss', list: getChatSettingPresets().bubbleCss || [] });
    };

    qs('qaq-chat-history-import').onclick = importChatHistory;
    qs('qaq-chat-history-export').onclick = exportChatHistory;
    qs('qaq-chat-history-clear').onclick = clearChatHistory;

    qs('qaq-chat-block-contact-btn').onclick = function () {
        var store = getStore();
        var cc = store.contacts[activeContactId];
        if (!cc) return;
        cc.blocked = !cc.blocked;
        setStore(store);
        renderSettingsPage();
        renderChatWindow();
        renderMainBody();
        toast(cc.blocked ? '已拉黑角色' : '已取消拉黑');
    };
    qs('qaq-chat-delete-contact-btn').onclick = function () {
        deleteContact(activeContactId);
    };
    qs('qaq-chat-recover-contact-btn').onclick = function () {
        var store = getStore();
        var cc = store.contacts[activeContactId];
        if (!cc) return;
        cc.deleted = false;
        cc.blocked = false;
        store.deletedPool = (store.deletedPool || []).filter(function (x) { return x.id !== activeContactId; });
        setStore(store);
        renderSettingsPage();
        renderMainBody();
        toast('角色已加回');
    };

    qs('qaq-chat-settings-save-all').onclick = saveSettingsAll;
    
    bindClickSelect('qaq-chs-o-worldbook', '绑定世界书', worldBookOptions);
bindClickSelect('qaq-chs-o-translate-mode', '翻译显示模式', [
    { value: 'in_top', label: '气泡内上方' },
    { value: 'in_bottom', label: '气泡内下方' },
    { value: 'out_top', label: '气泡外上方' },
    { value: 'out_bottom', label: '气泡外下方' },
    { value: 'hide', label: '隐藏翻译' }
]);
bindClickSelect('qaq-chs-o-voice-url', '服务节点', [
    { value: 'https://api.minimax.chat/v1/t2a_v2', label: '国内节点 api.minimax.chat' },
    { value: 'https://api.minimaxi.chat/v1/t2a_v2', label: '国际节点 api.minimaxi.chat' },
    { value: 'https://api.minimax.com/v1/t2a_v2', label: '国际节点 api.minimax.com' }
]);
bindClickSelect('qaq-chs-u-theme', '主题颜色', [
    { value: 'default', label: '暖阳' },
    { value: 'cool', label: '冷雾' },
    { value: 'dark', label: '夜幕' }
], function () { renderBubbleCssPreview(); });
bindClickSelect('qaq-chs-u-avatar-show', '头像显示设置', [
    { value: 'all', label: '头像全显示' },
    { value: 'hide_all', label: '头像全隐藏' },
    { value: 'first', label: '首条头像' },
    { value: 'last', label: '末条头像' }
], function () { renderBubbleCssPreview(); });
bindClickSelect('qaq-chs-u-time-pos', '时间戳位置', [
    { value: 'top', label: '气泡上方' },
    { value: 'bottom', label: '气泡下方' },
    { value: 'bubble_inner', label: '气泡内侧' },
    { value: 'bubble_outer', label: '气泡外侧' },
    { value: 'avatar_top', label: '头像上方' },
    { value: 'avatar_bottom', label: '头像下方' }
], function () { renderBubbleCssPreview(); });
bindClickSelect('qaq-chs-u-time-fmt', '时间戳格式', [
    { value: 'HH:mm', label: 'HH:mm' },
    { value: 'HH:mm:ss', label: 'HH:mm:ss' },
    { value: 'MM-DD HH:mm', label: 'MM-DD HH:mm' },
    { value: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm' }
], function () { renderBubbleCssPreview(); });
bindClickSelect('qaq-chs-u-menu-pos', '菜单出现位置', [
    { value: 'top', label: '输入底栏上方' },
    { value: 'bottom', label: '输入底栏下方' },
    { value: 'inside', label: '收在菜单栏里' }
]);
bindClickSelect('qaq-chs-o-voice-model-sel', 'MiniMax 语音模型', [
    { value: 'speech-02-hd', label: 'speech-02-hd (推荐)' },
    { value: 'speech-02-turbo', label: 'speech-02-turbo' },
    { value: 'speech-2.8-hd', label: 'speech-2.8-hd' },
    { value: 'speech-2.8-turbo', label: 'speech-2.8-turbo' },
    { value: 'speech-01-turbo', label: 'speech-01-turbo' }
]);

qs('qaq-chs-o-fetch-models-btn').onclick = async function () {
    var url = (qs('qaq-chs-o-api-url').value || '').trim();
    var key = (qs('qaq-chs-o-api-key').value || '').trim();
    if (!url) {
        var g = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');
        url = g.url || '';
        key = key || g.key || '';
    }
    if (!url || !key) {
        toast('请先填写 API URL 和 Key');
        return;
    }
    toast('正在拉取模型列表');
    try {
        var resp = await fetch(normalizeUrl(url) + '/models', {
            headers: { 'Authorization': 'Bearer ' + key }
        });
        var data = await resp.json();
        var models = (data.data || []).map(function (m) {
            return { value: m.id, label: m.id };
        });
        if (!models.length) {
            toast('未获取到模型');
            return;
        }
        openModal('选择模型',
            '<div class="qaq-custom-select-list" style="max-height:50vh;overflow-y:auto;">' +
            models.map(function (m) {
                return '<div class="qaq-custom-select-option" data-qaq-model-pick="' + esc(m.value) + '"><span>' + esc(m.label) + '</span></div>';
            }).join('') +
            '</div>',
            {
                hideBtns: true,
                afterRender: function () {
                    document.querySelectorAll('[data-qaq-model-pick]').forEach(function (el) {
                        el.onclick = function () {
                            qs('qaq-chs-o-api-model').value = this.getAttribute('data-qaq-model-pick');
                            window.qaqCloseModal && window.qaqCloseModal();
                            toast('已选择模型');
                        };
                    });
                }
            }
        );
    } catch (e) {
        toast('拉取失败: ' + (e.message || '网络错误'));
    }
};
    syncConditionalBlocks();
    renderBubbleCssPreview();
    applyChatSettingsTheme();
}

function saveSettingsAll() {
    var s = getStore();
    var c = getActiveContact();
    if (!c) return;
    var me = s.myProfile || {};

    c.avatar = (qs('qaq-chs-o-avatar').value || '').trim();
    c.nickname = (qs('qaq-chs-o-name').value || '').trim() || '未命名联系人';
    c.remark = (qs('qaq-chs-o-remark').value || '').trim();
    c.realName = (qs('qaq-chs-o-real').value || '').trim();
    c.persona = (qs('qaq-chs-o-persona').value || '').trim();
    c.signature = (qs('qaq-chs-o-signature').value || '').trim().slice(0, 20);
c.signatureAutoChange = getToggleValue('qaq-chs-o-sign-auto-row');

    c.worldBookId = getClickSelectValue('qaq-chs-o-worldbook') || '';
    c.worldBookName = '';
    var wb = getWorldBookOptions().find(function (x) { return x.value === c.worldBookId; });
    if (wb) c.worldBookName = wb.label === '不绑定世界书' ? '' : wb.label;

    c.activeSticker = getToggleValue('qaq-chs-o-sticker-row');
    c.translateEnabled = getToggleValue('qaq-chs-o-translate-row');
    c.translateMode = getClickSelectValue('qaq-chs-o-translate-mode') || 'in_bottom';

    c.memMax = parseInt(qs('qaq-chs-o-mem-max').value || '20', 10) || 20;
    c.bindGroupMemory = getToggleValue('qaq-chs-o-bind-group-row');
    c.bindVideoMemory = getToggleValue('qaq-chs-o-bind-video-row');
    c.bindVoiceMemory = getToggleValue('qaq-chs-o-bind-voice-row');
    c.bindOfflineMemory = getToggleValue('qaq-chs-o-bind-offline-row');
    c.summaryMemory = getToggleValue('qaq-chs-o-summary-memory-row');
    c.summaryCount = parseInt(qs('qaq-chs-o-summary-count').value || '50', 10) || 50;

    c.allowVideoCall = getToggleValue('qaq-chs-o-video-row');
    c.allowVoiceCall = getToggleValue('qaq-chs-o-voice-row');
    c.allowAutoMessage = getToggleValue('qaq-chs-o-auto-message-row');
    c.autoMessageGap = parseInt(qs('qaq-chs-o-auto-gap').value || '60', 10) || 60;
    c.allowBlockUser = getToggleValue('qaq-chs-o-allow-block-row');
    c.allowDeleteUser = getToggleValue('qaq-chs-o-allow-delete-row');
    c.allowAutoDiary = getToggleValue('qaq-chs-o-auto-diary-row');

    c.apiUrl = (qs('qaq-chs-o-api-url').value || '').trim();
    c.apiKey = (qs('qaq-chs-o-api-key').value || '').trim();
    c.apiModel = (qs('qaq-chs-o-api-model').value || '').trim();

    if (getToggleValue('qaq-chs-o-mm-voice-row')) {
    c.voiceUrl = getClickSelectValue('qaq-chs-o-voice-url') || '';
    c.voiceModel = getClickSelectValue('qaq-chs-o-voice-model-sel') || (qs('qaq-chs-o-voice-model').value || 'speech-02-hd').trim();
        c.voiceKey = (qs('qaq-chs-o-voice-key').value || '').trim();
        c.voiceSpeed = safeNumber(qs('qaq-chs-o-voice-speed').value, 0.9);
        c.voiceGroup = (qs('qaq-chs-o-voice-group').value || '').trim();
    } else {
        c.voiceUrl = '';
        c.voiceKey = '';
        c.voiceModel = 'speech-02-hd';
        c.voiceSpeed = 0.9;
        c.voiceGroup = '';
    }

    c.imageUrl = (qs('qaq-chs-o-image-url').value || '').trim();
    c.imageKey = (qs('qaq-chs-o-image-key').value || '').trim();
    c.imageModel = (qs('qaq-chs-o-image-model').value || '').trim();
    c.imagePrompt = (qs('qaq-chs-o-image-prompt').value || '').trim();
    c.imageNegative = (qs('qaq-chs-o-image-negative').value || '').trim();

    me.avatar = (qs('qaq-chs-m-avatar').value || '').trim();
    me.nickname = (qs('qaq-chs-m-name').value || '').trim() || '学生';
    me.realName = (qs('qaq-chs-m-real').value || '').trim();
    me.persona = (qs('qaq-chs-m-persona').value || '').trim();

    c.uiTheme = getClickSelectValue('qaq-chs-u-theme') || getGlobalTheme();
    c.uiBubbleMy = (qs('qaq-chs-u-bubble-my').value || getBubbleThemeDefaults(c.uiTheme).my).trim();
    c.uiBubbleOther = (qs('qaq-chs-u-bubble-other').value || getBubbleThemeDefaults(c.uiTheme).other).trim();
    c.uiAvatarShow = getClickSelectValue('qaq-chs-u-avatar-show') || 'all';
    c.uiShowTime = getToggleValue('qaq-chs-u-show-time-row');
    c.uiTimePos = getClickSelectValue('qaq-chs-u-time-pos') || 'top';
c.uiTimeFmt = getClickSelectValue('qaq-chs-u-time-fmt') || 'HH:mm';
    c.uiHideReplyBtn = getToggleValue('qaq-chs-u-hide-reply-row');
    c.uiHideMenuBtn = getToggleValue('qaq-chs-u-hide-menu-row');
    c.uiMenuPos = getClickSelectValue('qaq-chs-u-menu-pos') || 'top';
    c.uiAvatarRadius = safeNumber(qs('qaq-chs-u-avatar-radius').value, 10);
    c.uiBubbleRadius = safeNumber(qs('qaq-chs-u-bubble-radius').value, 16);
    c.uiFontUrl = (qs('qaq-chs-u-font-url').value || '').trim();
    c.uiFontSize = ((parseInt(qs('qaq-chs-u-font-size').value || '14', 10) || 14) + 'px');
    c.uiFontColor = (qs('qaq-chs-u-font-color').value || '#333333').trim();
    c.uiGlobalCss = (qs('qaq-chs-u-global-css').value || '').trim();
    c.uiBubbleCss = (qs('qaq-chs-u-bubble-css').value || '').trim();

    c.dnd = getToggleValue('qaq-chs-x-dnd-row');
    c.dndTime = (qs('qaq-chs-x-dnd-time').value || '').trim();

    s.myProfile = me;
    setStore(s);

    applyPageThemeClass(c.uiTheme || getGlobalTheme());
    applyRuntimeStyle(c);
    renderMainBody();
    renderChatWindow();
    toast('设置已保存');
    syncAllAutoMessageTimers();
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
        renderChatWindow();
    };
}
    if (qs('qaq-chat-win-set-btn')) {
        qs('qaq-chat-win-set-btn').onclick = openChatSettings;
    }
    if (qs('qaq-chat-win-status-btn')) {
    qs('qaq-chat-win-status-btn').onclick = function () {
        var c = getActiveContact();
        if (!c) return;
        var statusText = c.blocked
            ? '已拉黑'
            : (isInDndRange(c) ? '勿扰中' : '在线可聊');
        toast('当前状态：' + statusText);
    };
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
    _chatCurrentTheme = getGlobalTheme();
    applyPageThemeClass(_chatCurrentTheme);
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
var _autoMsgTimers = {};

function startAutoMessageTimer(cid) {
    stopAutoMessageTimer(cid);
    var s = getStore();
    var c = s.contacts[cid];
    if (!c || !c.allowAutoMessage || c.blocked || c.deleted) return;
    var gap = Math.max(1, parseInt(c.autoMessageGap, 10) || 60) * 60 * 1000;

    _autoMsgTimers[cid] = setInterval(function () {
        var latest = getStore();
        var cc = latest.contacts[cid];
        if (!cc || !cc.allowAutoMessage || cc.blocked || cc.deleted) {
            stopAutoMessageTimer(cid);
            return;
        }
        if (isInDndRange(cc)) return;

        var msgs = getMessages(cid);
        var last = msgs[msgs.length - 1];
        if (last && !last.isMe && (Date.now() - last.time) < gap) return;

        if (activeContactId === cid) {
            receiveAI();
        } else {
            var tempActive = activeContactId;
            activeContactId = cid;
            receiveAI().then(function () {
                activeContactId = tempActive;
                renderMainBody();
            }).catch(function () {
                activeContactId = tempActive;
            });
        }
    }, gap);
}

function stopAutoMessageTimer(cid) {
    if (_autoMsgTimers[cid]) {
        clearInterval(_autoMsgTimers[cid]);
        delete _autoMsgTimers[cid];
    }
}

function syncAllAutoMessageTimers() {
    var s = getStore();
    Object.keys(s.contacts || {}).forEach(function (cid) {
        var c = s.contacts[cid];
        if (c && c.allowAutoMessage && !c.blocked && !c.deleted) {
            startAutoMessageTimer(cid);
        } else {
            stopAutoMessageTimer(cid);
        }
    });
}

function init() {
    ensureDemo();
    initThemeSync();
    bindMainEvents();
    renderMainBody();
    renderChatExtMenu();
    checkDndRelease();
    syncAllAutoMessageTimers();
}
window.qaqOpenChatPage = function () {
    ensureDemo();
    _chatCurrentTheme = getGlobalTheme();
    applyPageThemeClass(_chatCurrentTheme);
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
    