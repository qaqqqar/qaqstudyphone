(function () {
    'use strict';

    /* ===== 全局错误捕获 ===== */
    window.addEventListener('error', function(e) {
        document.title = 'ERR: ' + e.message;
        console.error('[QAQ Global Error]', e.message, e.filename, e.lineno);
    });
    
    // ===== 1. localStorage 缓存层 =====
// 在IIFE 顶部添加，替代所有直接 localStorage 调用

var qaqCache = {};

function qaqCacheGet(key, fallback) {
    if (qaqCache[key] !== undefined) return qaqCache[key];
    var raw = localStorage.getItem(key);
    var val = raw ? JSON.parse(raw) : fallback;
    qaqCache[key] = val;
    return val;
}

function qaqCacheSet(key, val) {
    qaqCache[key] = val;
    localStorage.setItem(key, JSON.stringify(val));
}

function qaqCacheInvalidate(key) {
    delete qaqCache[key];
}

// 替换高频调用的函数：
function qaqGetWordbooks() {
    return qaqCacheGet('qaq-wordbooks', []);
}

function qaqSaveWordbooks(books) {
    qaqCacheSet('qaq-wordbooks', books);
}

function qaqGetAllPlans() {
    return qaqCacheGet('qaq-plans', {});
}

function qaqSavePlans(plans) {
    qaqCacheSet('qaq-plans', plans);
}

function qaqGetReviewSettings() {
    return qaqCacheGet('qaq-word-review-settings', {
        roundCount: 20, random: true, autoPronounce: false,
        speechRate: 0.9, showPhonetic: true, showExample: true,
        skipMarked: true, storyMode: 'story',
        storyBilingualMode: 'summary-cn', storyWordCount: 800,
        apiProvider: 'openai', apiUrl: '', apiKey: '',
        apiModel: '', minimaxGroupId: ''
    });
}

function qaqSaveReviewSettings(settings) {
    qaqCacheSet('qaq-word-review-settings', settings);
}

function qaqGetCategories() {
    return qaqCacheGet('qaq-plan-categories', [
        { name: '学习', color: '#5b9bd5' },
        { name: '生活', color: '#7bab6e' },
        { name: '运动', color: '#e88d4f' },
        { name: '工作', color: '#8b6cc1' },
        { name: '其他', color: '#999999' }
    ]);
}

function qaqSaveCategories(cats) {
    qaqCacheSet('qaq-plan-categories', cats);
}

function qaqGetOwnedItems() {
    return qaqCacheGet('qaq-mine-owned-items', []);
}

function qaqSaveOwnedItems(items) {
    qaqCacheSet('qaq-mine-owned-items', items);
}

function qaqGetPoints() {
    return qaqCacheGet('qaq-mine-points', 9999999);
}

function qaqSavePoints(n) {
    qaqCacheSet('qaq-mine-points', Math.max(0, n));
}

function qaqGetStudyLog() {
    return qaqCacheGet('qaq-study-log', {});
}

function qaqSaveStudyLog(log) {
    qaqCacheSet('qaq-study-log', log);
}

function qaqGetReviewFavorites() {
    return qaqCacheGet('qaq-word-review-favorites', []);
}

function qaqSaveReviewFavorites(items) {
    qaqCacheSet('qaq-word-review-favorites', items);
}

function qaqGetMarkedWords() {
    return qaqCacheGet('qaq-word-review-marked', {});
}

function qaqSaveMarkedWords(data) {
    qaqCacheSet('qaq-word-review-marked', data);
}

function qaqGetPlanTheme() {
    return qaqCacheGet('qaq-plan-theme', {
        wallpaper: '', wallpaperOpacity: 30, accent: '',
        cardBg: '', cardOpacity: 55, widgetBg: '', widgetOpacity: 45
    });
}

function qaqSavePlanTheme(theme) {
    qaqCacheSet('qaq-plan-theme', theme);
}

function qaqGetWordbankTheme() {
    return qaqCacheGet('qaq-wordbank-theme', {
        appBg: '', appOpacity: 30, cardBg: '', cardOpacity: 55
    });
}

function qaqSaveWordbankTheme(theme) {
    qaqCacheSet('qaq-wordbank-theme', theme);
}

function qaqGetStatusBarSettings() {
    return qaqCacheGet('qaq-statusbar-settings', {
        visible: true, batteryFollow: false, showToken: false
    });
}

function qaqSaveStatusBarSettings(s) {
    qaqCacheSet('qaq-statusbar-settings', s);
}

function qaqGetMineProfile() {
    return qaqCacheGet('qaq-mine-profile', {
        nickname: '学习者', signature: '每天进步一点点',
        status: '学习中', avatar: ''
    });
}

function qaqSaveMineProfile(p) {
    qaqCacheSet('qaq-mine-profile', p);
}

    /*===== Live2D / PixiJS 懒加载 ===== */
var qaqLive2DReady = false;
var qaqLive2DLoading = false;
var qaqLive2DCallbacks = [];

function qaqEnsureLive2D(callback) {
    if (qaqLive2DReady) { if (callback) callback(); return; }
    if (callback) qaqLive2DCallbacks.push(callback);
    if (qaqLive2DLoading) return;
    qaqLive2DLoading = true;

    var scripts = [
        'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.10/browser/pixi.min.js',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/dist/cubism4.min.js',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/dist/index.min.js'
    ];
    var loaded = 0;

    function loadNext() {
        if (loaded >= scripts.length) {
            qaqLive2DReady = true;
            qaqLive2DLoading = false;
            qaqLive2DCallbacks.forEach(function(cb) { try { cb(); } catch(e) { console.error(e); } });
            qaqLive2DCallbacks = [];
            return;
        }
        var s = document.createElement('script');
        s.src = scripts[loaded];
        s.onload = function() { loaded++; loadNext(); };
        s.onerror = function() {
            console.error('Failed to load: ' + scripts[loaded]);
            loaded++; loadNext();
        };
        document.head.appendChild(s);
    }
    loadNext();
}

    /* ===== 时间更新 ===== */
    function qaqUpdateClock() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var display = document.querySelector('.qaq-time-display');
        if (display) display.textContent = h + ':' + (m < 10 ? '0' : '') + m;
    }
    qaqUpdateClock();
    setInterval(qaqUpdateClock, 15000);
    
var qaqTokenTotal = parseInt(localStorage.getItem('qaq-token-total') || '0', 10);

function qaqAddTokens(n) {
    if (!n || n <= 0) return;
    qaqTokenTotal += n;
    localStorage.setItem('qaq-token-total', String(qaqTokenTotal));
    qaqApplyStatusBar();
}

function qaqEstimateTokens(text) {
    return Math.ceil(String(text || '').length / 3);
}

function qaqApplyStatusBar() {
    var s = qaqGetStatusBarSettings();
    var bar = document.getElementById('qaq-status-bar');
    if (!bar) return;
    bar.style.display = s.visible ? '' : 'none';

    // ★ 新增：同步 class 到 phone-frame
    var frame = document.querySelector('.qaq-phone-frame');
    if (frame) {
        frame.classList.toggle('qaq-statusbar-hidden', !s.visible);
    }

    var tokenEl = document.getElementById('qaq-token-display');
    if (tokenEl) {
        if (s.showToken) {
            tokenEl.style.display = '';
            tokenEl.textContent = qaqTokenTotal > 9999
                ? (qaqTokenTotal / 1000).toFixed(1) + 'k'
                : qaqTokenTotal;
        } else {
            tokenEl.style.display = 'none';
        }
    }
}

var qaqBatteryRef = null;

function qaqInitBattery() {
    var s = qaqGetStatusBarSettings();
    if (!s.batteryFollow) return;
    if (!navigator.getBattery) return;

    navigator.getBattery().then(function (battery) {
        qaqBatteryRef = battery;
        function update() {
            var ss = qaqGetStatusBarSettings();
            if (!ss.batteryFollow) return;
            var pct = Math.round(battery.level * 100);
            var fillEl = document.getElementById('qaq-battery-fill');
            if (fillEl) {
                fillEl.setAttribute('width', Math.max(1, Math.round(pct / 100 * 16)));
                fillEl.setAttribute('fill', pct <= 20 ? '#e05565' : (battery.charging ? '#4aaa6a' : '#5ab364'));
            }
        }
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
    }).catch(function () {});
}

function qaqStopBattery() {
    // 简单重置，刷新后重新判断
    var fillEl = document.getElementById('qaq-battery-fill');
    if (fillEl) {
        fillEl.setAttribute('width', '16');
        fillEl.setAttribute('fill', '#5ab364');
    }
}

function qaqRenderStatusBarToggles() {
    var s = qaqGetStatusBarSettings();
    var v = document.getElementById('qaq-sb-visible-toggle');
    var b = document.getElementById('qaq-sb-battery-toggle');
    var t = document.getElementById('qaq-sb-token-toggle');
    if (v) v.classList.toggle('qaq-toggle-on', s.visible);
    if (b) b.classList.toggle('qaq-toggle-on', s.batteryFollow);
    if (t) t.classList.toggle('qaq-toggle-on', s.showToken);
}

// 状态栏设置页打开
document.getElementById('qaq-set-statusbar').addEventListener('click', function () {
    qaqRenderStatusBarToggles();
    qaqSwitchTo(document.getElementById('qaq-sub-statusbar'));
});

document.getElementById('qaq-sb-visible-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.visible = !s.visible;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    qaqApplyStatusBar();
    qaqToast(s.visible ? '状态栏已显示' : '状态栏已隐藏');
});

document.getElementById('qaq-sb-battery-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.batteryFollow = !s.batteryFollow;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    if (s.batteryFollow) {
        qaqInitBattery();
        qaqToast(navigator.getBattery ? '电量跟随已开启' : '当前浏览器不支持 Battery API');
    } else {
        qaqStopBattery();
        qaqToast('电量跟随已关闭');
    }
});

document.getElementById('qaq-sb-token-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.showToken = !s.showToken;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    qaqApplyStatusBar();
    qaqToast(s.showToken ? 'Token 显示已开启' : 'Token 显示已关闭');
});

document.getElementById('qaq-sb-token-reset').addEventListener('click', function () {
    qaqConfirm('重置 Token', '确认将 Token 计数清零？', function () {
        qaqTokenTotal = 0;
        localStorage.setItem('qaq-token-total', '0');
        qaqApplyStatusBar();
        qaqToast('Token 已清零');
    });
});

// 初始化
qaqApplyStatusBar();
qaqInitBattery();

/* ===== 性能优化工具 ===== */
function qaqDebounce(fn, delay) {
    var timer = null;
    return function () {
        var ctx = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(ctx, args);
        }, delay || 120);
    };
}

function qaqThrottle(fn, delay) {
    var last = 0;
    var timer = null;
    return function () {
        var now = Date.now();
        var ctx = this;
        var args = arguments;

        if (now - last >= delay) {
            last = now;
            fn.apply(ctx, args);
        } else {
            clearTimeout(timer);
            timer = setTimeout(function () {
                last = Date.now();
                fn.apply(ctx, args);
            }, delay - (now - last));
        }
    };
}

function qaqSafeText(v) {
    return String(v == null ? '' : v);
}

    /* ===== Toast ===== */
    var qaqToastTimeout = null;
    function qaqToast(msg) {
        var old = document.querySelector('.qaq-toast');
        if (old) old.remove();
        if (qaqToastTimeout) clearTimeout(qaqToastTimeout);

        var el = document.createElement('div');
        el.className = 'qaq-toast';
        el.textContent = msg;
        document.body.appendChild(el);

        requestAnimationFrame(function () { el.classList.add('qaq-show'); });

        qaqToastTimeout = setTimeout(function () {
            el.classList.remove('qaq-show');
            setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
        }, 1400);
    }

/* ===== 导入取消控制 ===== */
var qaqImportCtrl = {
    cancelled: false,
    loadingTask: null,
    activeReader: null,
    busy: false
};

function qaqRefreshXiaoyuanView() {
    if (!qaqXiaoyuanPage) return;
    if (qaqXiaoyuanPage.classList.contains('qaq-page-show')) {
        if (qaqXiaoyuanCurrentTab === 'garden') {
            qaqRenderXiaoyuanGarden();
        } else {
            qaqRenderXiaoyuanZoo();
        }
    }
}

function qaqIsImportCancelled() {
    return !!qaqImportCtrl.cancelled;
}

function qaqAbortCurrentImport() {
    qaqImportCtrl.cancelled = true;

    try {
        if (qaqImportCtrl.activeReader && qaqImportCtrl.activeReader.readyState === 1) {
            qaqImportCtrl.activeReader.abort();
        }
    } catch (e) {}

    try {
        if (qaqImportCtrl.loadingTask && typeof qaqImportCtrl.loadingTask.destroy === 'function') {
            qaqImportCtrl.loadingTask.destroy();
        }
    } catch (e) {}
}

function qaqRequireImportNotCancelled() {
    if (qaqIsImportCancelled()) {
        var err = new Error('__QAQ_IMPORT_CANCELLED__');
        err.qaqCancelled = true;
        throw err;
    }
}

function qaqIsCancelError(err) {
    return !!(err && (err.qaqCancelled || err.message === '__QAQ_IMPORT_CANCELLED__'));
}

var qaqImportCancelBtn = document.getElementById('qaq-import-cancel-btn');
var qaqImportRetryBtn = document.getElementById('qaq-import-retry-btn');

/* ===== 导入进度 ===== */
var qaqImportProgressEl = document.getElementById('qaq-import-progress');
var qaqImportProgressTitleEl = document.getElementById('qaq-import-progress-title');
var qaqImportProgressDescEl = document.getElementById('qaq-import-progress-desc');
var qaqImportProgressFillEl = document.getElementById('qaq-import-progress-fill');
var qaqImportProgressTextEl = document.getElementById('qaq-import-progress-text');

function qaqShowImportProgress(title, desc) {
    if (!qaqImportProgressEl) return;

    qaqImportProgressTitleEl.textContent = title || '正在导入';
    qaqImportProgressDescEl.textContent = desc || '请稍等，正在解析文件…';
    qaqImportProgressFillEl.style.width = '0%';
    qaqImportProgressTextEl.textContent = '0%';
    qaqImportProgressEl.classList.add('qaq-import-show');

    if (qaqImportCancelBtn) qaqImportCancelBtn.disabled = false;

    var actions = document.querySelector('.qaq-import-progress-actions');
    if (actions) actions.style.display = 'flex';
}

function qaqShowStoryProgress(title, desc) {
    qaqShowImportProgress(title || '正在生成小说', desc || '请稍等，正在生成内容…');
    var actions = document.querySelector('.qaq-import-progress-actions');
    if (actions) actions.style.display = 'none';
}

function qaqHideStoryProgress() {
    var actions = document.querySelector('.qaq-import-progress-actions');
    if (actions) actions.style.display = 'flex';
    qaqHideImportProgress();
}

document.getElementById('qaq-review-story-copy-btn').addEventListener('click', async function () {
    var title = document.getElementById('qaq-review-story-title').textContent.trim();
var text = document.getElementById('qaq-review-story-output').innerText.trim();
if (title) text = title + '\n\n' + text;
    if (!text || text === '生成后会显示在这里') {
        return qaqToast('暂无可复制内容');
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        qaqToast('已复制全文');
    } catch (err) {
        console.error(err);
        qaqToast('复制失败');
    }
});

document.getElementById('qaq-review-story-export-btn').addEventListener('click', function () {
    var title = document.getElementById('qaq-review-story-title').textContent.trim();
var text = document.getElementById('qaq-review-story-output').innerText.trim();
if (title) text = title + '\n\n' + text;
    if (!text || text === '生成后会显示在这里') {
        return qaqToast('暂无可导出内容');
    }

    var lastStory = qaqGetLastReviewStory();
    var fileName = 'qaq-story-' + new Date().toISOString().slice(0, 10) + '.txt';

    var header = '';
    if (lastStory) {
        header += '【QAQ 背单词小说】\n';
        if (lastStory.bookName) header += '词库：' + lastStory.bookName + '\n';
        if (lastStory.words && lastStory.words.length) header += '单词：' + lastStory.words.join(', ') + '\n';
        if (lastStory.tags && lastStory.tags.length) header += '标签：' + lastStory.tags.join('、') + '\n';
        if (lastStory.wordCount) header += '目标词数：' + lastStory.wordCount + '\n';
        if (lastStory.createdAt) header += '生成时间：' + qaqFormatDateTime(lastStory.createdAt) + '\n';
        header += '\n--------------------\n\n';
    }

    var blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    qaqToast('已导出 txt');
});

document.getElementById('qaq-review-story-regenerate-btn').addEventListener('click', function () {
    var lastStory = qaqGetLastReviewStory();
    if (lastStory) {
        if (lastStory.tags && lastStory.tags.length) {
            qaqReviewStorySelectedTags = lastStory.tags.slice();
        }
        if (lastStory.wordCount) {
            document.getElementById('qaq-review-story-word-count').value = lastStory.wordCount;
        }
        if (lastStory.mode) {
            document.getElementById('qaq-review-story-mode').value = lastStory.mode;
        }
        if (lastStory.bilingualMode) {
            document.getElementById('qaq-review-story-bilingual-mode').value = lastStory.bilingualMode;
        }
        qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
    }
    qaqGenerateReviewStory();
});

document.getElementById('qaq-review-story-clear-tags-btn').addEventListener('click', function () {
    if (!qaqReviewStorySelectedTags.length) {
        return qaqToast('当前没有已选标签');
    }
    qaqReviewStorySelectedTags = [];
    qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
    qaqToast('已清空标签');
});

function qaqOpenReviewStoryHistoryModal() {
    var list = qaqGetReviewStoryHistory();
    var favs = qaqGetReviewStoryFavorites();

    modalTitle.textContent = '小说历史记录';

    if (!list.length) {
        modalBody.innerHTML = '<div style="text-align:center;font-size:13px;color:#999;line-height:1.8;">还没有历史记录</div>';
        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        return;
    }

    modalBody.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:10px;max-height:58vh;overflow-y:auto;" id="qaq-story-history-modal-list">' +
        list.map(function (item, idx) {
            var isFav = favs.some(function (x) { return x.createdAt === item.createdAt; });

            return (
                '<div class="qaq-review-story-history-item">' +
                    '<div class="qaq-review-story-history-top">' +
                        '<div class="qaq-review-story-history-title">' + qaqEscapeHtml(item.title || '未命名作品') + '</div>' +
                        '<div class="qaq-story-history-top-right">' +
                            '<button class="qaq-story-history-fav' + (isFav ? ' qaq-active' : '') + '" data-story-fav="' + idx + '">★</button>' +
                            '<div class="qaq-review-story-history-time">' + qaqFormatDateTime(item.createdAt || Date.now()) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="qaq-review-story-history-meta2">' +
                        '词数：' + (item.wordCount || '-') +
                        ' · 标签：' + ((item.tags && item.tags.length) ? item.tags.join('、') : '无') +
                    '</div>' +
                    '<div class="qaq-review-story-history-preview">' + qaqEscapeHtml(item.content || '') + '</div>' +
                    '<div class="qaq-story-history-actions-row">' +
                        '<button class="qaq-import-ghost-btn" data-story-load="' + idx + '">载入</button>' +
                        '<button class="qaq-import-ghost-btn" data-story-copy="' + idx + '">复制</button>' +
                        '<button class="qaq-import-ghost-btn" data-story-del="' + idx + '">删除</button>' +
                    '</div>' +
                '</div>'
            );
        }).join('') +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-review-story-history-clear">清空历史</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel">关闭</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    document.getElementById('qaq-review-story-history-clear').onclick = function () {
        qaqConfirm('清空历史', '确认清空所有小说历史记录吗？', function () {
            qaqClearReviewStoryHistory();
            qaqCloseModal();
            qaqToast('已清空历史记录');
        });
    };

    modalBody.querySelectorAll('[data-story-load]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(this.dataset.storyLoad, 10);
            var list = qaqGetReviewStoryHistory();
            var item = list[idx];
            if (!item) return;

            document.getElementById('qaq-review-story-output').classList.toggle('qaq-review-story-translate-on', qaqReviewStoryTranslateMode);
            qaqRenderStructuredStory(item);
            document.getElementById('qaq-review-story-meta').textContent =
                '已载入：' + qaqFormatDateTime(item.createdAt || Date.now());

            if (item.tags && item.tags.length) {
                qaqReviewStorySelectedTags = item.tags.slice();
                qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
            }

            if (item.wordCount) document.getElementById('qaq-review-story-word-count').value = item.wordCount;
            if (item.mode) document.getElementById('qaq-review-story-mode').value = item.mode;
            if (item.bilingualMode) document.getElementById('qaq-review-story-bilingual-mode').value = item.bilingualMode;

            qaqSaveLastReviewStory(item);
            qaqCloseModal();
            qaqToast('已载入历史记录');
        });
    });

    modalBody.querySelectorAll('[data-story-copy]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var idx = parseInt(this.dataset.storyCopy, 10);
            var list = qaqGetReviewStoryHistory();
            var item = list[idx];
            if (!item || !item.content) return qaqToast('没有可复制内容');

            var text = (item.title ? item.title + '\n\n' : '') + item.content;

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
                qaqToast('已复制历史内容');
            } catch (err) {
                console.error(err);
                qaqToast('复制失败');
            }
        });
    });

    modalBody.querySelectorAll('[data-story-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(this.dataset.storyDel, 10);
            var list = qaqGetReviewStoryHistory();
            if (idx < 0 || idx >= list.length) return;

            list.splice(idx, 1);
            qaqSaveReviewStoryHistory(list);
            qaqCloseModal();
            qaqOpenReviewStoryHistoryModal();
            qaqToast('已删除历史记录');
        });
    });

    modalBody.querySelectorAll('[data-story-fav]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(this.dataset.storyFav, 10);
            var list = qaqGetReviewStoryHistory();
            var item = list[idx];
            if (!item) return;

            var nowFav = qaqToggleStoryFavorite(item);
            this.classList.toggle('qaq-active', nowFav);
            qaqToast(nowFav ? '已收藏历史记录' : '已取消收藏');
        });
    });
}

document.getElementById('qaq-review-story-history-btn').addEventListener('click', function () {
    qaqOpenReviewStoryHistoryModal();
});

document.getElementById('qaq-review-story-read-btn').addEventListener('click', function () {
    var text = document.getElementById('qaq-review-story-output').innerText.trim();
    if (!text || text === '生成后会显示在这里') {
        return qaqToast('暂无可朗读内容');
    }
    qaqSpeakText(text);
    qaqToast('开始朗读');
});

document.getElementById('qaq-review-story-stop-read-btn').addEventListener('click', function () {
    qaqStopSpeakText();
    qaqToast('已停止朗读');
});

document.getElementById('qaq-review-story-translate-toggle-btn').addEventListener('click', function () {
    qaqReviewStoryTranslateMode = !qaqReviewStoryTranslateMode;
    var outputEl = document.getElementById('qaq-review-story-output');
    outputEl.classList.toggle('qaq-review-story-translate-on', qaqReviewStoryTranslateMode);
    this.textContent = qaqReviewStoryTranslateMode ? '关闭逐句翻译' : '逐句翻译';
});

// 在 qaq-script.js 中找到小说页面的点击事件处理，替换为：

document.getElementById('qaq-review-story-output').addEventListener('click', function (e) {
    var wordEl = e.target.closest('.qaq-review-story-word');
    if (wordEl) {
        var rect = wordEl.getBoundingClientRect();
        var rawWord = wordEl.dataset.word || wordEl.textContent || '';
        var key = rawWord.toLowerCase();

        // ★ 优先使用预存的释义
        var lastStory = qaqGetLastReviewStory();
        if (lastStory && lastStory.wordMeanings && lastStory.wordMeanings[key]) {
            qaqOpenWordPopover(lastStory.wordMeanings[key], rect);
            e.stopPropagation();
            return;
        }

        // 其次从本轮单词中查找
        var sourcePool = (lastStory && lastStory.sourceWords && lastStory.sourceWords.length)
            ? lastStory.sourceWords
            : qaqGetReviewStorySourceWords();

        var wordInfo = qaqFindWordInfo(rawWord, sourcePool);
        if (wordInfo) {
            qaqOpenWordPopover(wordInfo, rect);
        } else {
            // 最后从所有词库中查找
            var found = qaqFindWordFromAllBooksSync(rawWord);
            if (found) {
                qaqOpenWordPopover(found, rect);
            } else {
                qaqToast('未找到该单词释义');
            }
        }
        e.stopPropagation();
        return;
    }

    var sentenceEl = e.target.closest('.qaq-review-story-sentence');
    if (sentenceEl) {
        var sentence = sentenceEl.dataset.sentence || sentenceEl.innerText.trim();
        if (sentence) {
            qaqSpeakText(sentence);
            qaqToast('正在朗读该句');
        }
        e.stopPropagation();
        return;
    }

    var paraEl = e.target.closest('.qaq-review-story-paragraph');
    if (paraEl) {
        var text = paraEl.innerText.trim();
        if (text) {
            qaqSpeakText(text);
            qaqToast('正在朗读该段');
        }
    }
});



document.addEventListener('click', function (e) {
    var pop = document.getElementById('qaq-word-popover');
    if (!pop || pop.style.display === 'none') return;

    if (!e.target.closest('.qaq-review-story-word') &&
        !e.target.closest('#qaq-word-popover-card')) {
        qaqCloseWordPopover();
    }
});


function qaqUpdateImportProgress(percent, desc) {
    if (!qaqImportProgressEl) return;
    percent = Math.max(0, Math.min(100, Math.round(percent || 0)));
    qaqImportProgressFillEl.style.width = percent + '%';
    qaqImportProgressTextEl.textContent = percent + '%';
    if (desc) qaqImportProgressDescEl.textContent = desc;
}

function qaqHideImportProgress() {
    if (!qaqImportProgressEl) return;
    qaqImportProgressEl.classList.remove('qaq-import-show');
}

function qaqOpenImportPicker() {
    if (!wordbankFileInput) return;
    wordbankFileInput.value = '';
    wordbankFileInput.click();
}

if (qaqImportCancelBtn) {
    qaqImportCancelBtn.addEventListener('click', function () {
        qaqAbortCurrentImport();
        qaqHideImportProgress();
        qaqToast('已取消导入');
    });
}

if (qaqImportRetryBtn) {
    qaqImportRetryBtn.addEventListener('click', function () {
        if (qaqImportCtrl.busy) {
            qaqAbortCurrentImport();
        }
        qaqHideImportProgress();
        setTimeout(function () {
            qaqOpenImportPicker();
        }, 80);
    });
}

    /* ===== 弹窗系统 ===== */
    var overlay = document.getElementById('qaq-modal-overlay');
    var modalTitle = document.getElementById('qaq-modal-title');
    var modalBody = document.getElementById('qaq-modal-body');
    var modalBtns = document.getElementById('qaq-modal-btns');
    var fileInput = document.getElementById('qaq-file-input');

    function qaqOpenModal() {
    if (!overlay) return;
    overlay.style.display = '';
    //强制 reflow 后再加class，避免跳帧
    void overlay.offsetHeight;
    overlay.classList.add('qaq-modal-show');
}

function qaqCloseModal() {
    if (!overlay) return;
    overlay.classList.remove('qaq-modal-show');
    setTimeout(function () {
        if (!overlay.classList.contains('qaq-modal-show')) {
            overlay.style.display = 'none';modalBody.innerHTML = '';
        }
    }, 160);
}

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) qaqCloseModal();
    });

    function qaqEditText(title, currentValue, isMultiline, onSave) {
        modalTitle.textContent = title;
        if (isMultiline) {
            modalBody.innerHTML = '<textarea class="qaq-modal-textarea" id="qaq-modal-edit-input">' + currentValue + '</textarea>';
        } else {
            modalBody.innerHTML = '<input class="qaq-modal-input" id="qaq-modal-edit-input" type="text" value="' + currentValue.replace(/"/g, '&quot;') + '">';
        }

        modalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

        qaqOpenModal();
        var input = document.getElementById('qaq-modal-edit-input');
        setTimeout(function () { input.focus(); }, 100);

        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var val = input.value.trim();
            if (val) {
                onSave(val);
                qaqToast('已保存');
            }
            qaqCloseModal();
        };
    }

    function qaqEditImage(title, onImageSet) {
        modalTitle.textContent = title;
        modalBody.innerHTML =
            '<div class="qaq-modal-upload-options">' +
            '<button class="qaq-modal-upload-btn" id="qaq-upload-url-btn">URL 链接上传</button>' +
            '<button class="qaq-modal-upload-btn" id="qaq-upload-local-btn">本地图片上传</button>' +
            '</div>' +
            '<div class="qaq-modal-url-area" id="qaq-url-area">' +
            '<input class="qaq-modal-input" id="qaq-url-input" type="text" placeholder="请输入图片URL...">' +
            '<div class="qaq-modal-btns">' +
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-url-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-url-confirm">确定</button>' +
            '</div></div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
        qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        document.getElementById('qaq-upload-url-btn').onclick = function () {
            document.querySelector('.qaq-modal-upload-options').style.display = 'none';
            document.getElementById('qaq-modal-cancel').parentElement.style.display = 'none';
            document.getElementById('qaq-url-area').classList.add('qaq-url-show');

            document.getElementById('qaq-url-cancel').onclick = qaqCloseModal;
            document.getElementById('qaq-url-confirm').onclick = function () {
                var url = document.getElementById('qaq-url-input').value.trim();
                if (url) {
                    onImageSet(url);
                    qaqToast('图片已更新');
                }
                qaqCloseModal();
            };
        };

        document.getElementById('qaq-upload-local-btn').onclick = function () {
            fileInput.onchange = function () {
                if (this.files && this.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        onImageSet(e.target.result);
                        qaqToast('图片已更新');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
                fileInput.value = '';
                qaqCloseModal();
            };
            fileInput.click();
        };
    }

    function qaqConfirm(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalBody.innerHTML = '<div style="font-size:13px;color:#666;line-height:1.6;text-align:center;">' + message + '</div>';
        modalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm" style="background:#d9534f;color:#fff;">确认</button>';
        qaqOpenModal();

        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            onConfirm();
            qaqCloseModal();
        };
    }

    /* ===== 小组件编辑 ===== */
    document.getElementById('qaq-edit-nickname').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑昵称', el.textContent, false, function (val) { el.textContent = val; });
    });
    document.getElementById('qaq-edit-signature').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑个性签名', el.textContent, false, function (val) { el.textContent = val; });
    });
    document.getElementById('qaq-edit-text').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑正文', el.textContent, true, function (val) { el.textContent = val; });
    });

    var placeholderInput = document.getElementById('qaq-edit-placeholder');
    var pressTimer = null;
    function bindLongPressEdit(inp) {
        pressTimer = setTimeout(function () {
            qaqEditText('编辑占位文字', inp.placeholder, false, function (val) { inp.placeholder = val; });
        }, 600);
    }
    placeholderInput.addEventListener('mousedown', function () { bindLongPressEdit(this); });
    placeholderInput.addEventListener('mouseup', function () { clearTimeout(pressTimer); });
    placeholderInput.addEventListener('touchstart', function () { bindLongPressEdit(this); }, { passive: true });
    placeholderInput.addEventListener('touchend', function () { clearTimeout(pressTimer); });

    document.getElementById('qaq-avatar-btn').addEventListener('click', function () {
        var avatarDiv = this;
        qaqEditImage('更换头像', function (src) {
            avatarDiv.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;">';
        });
    });

    document.querySelectorAll('.qaq-img-square.qaq-clickable-img').forEach(function (el) {
        el.addEventListener('click', function () {
            var imgDiv = this;
            var idx = parseInt(this.dataset.img, 10) + 1;
            qaqEditImage('更换图片 ' + idx, function (src) {
                imgDiv.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:8px;">';
            });
        });
    });

    document.querySelectorAll('.qaq-action-btn').forEach(function (btn) {
        var longTimer = null;
        var isLong = false;

        btn.addEventListener('click', function () {
            if (isLong) { isLong = false; return; }

            var action = this.dataset.action;
            var countEl = this.querySelector('span');
            var count = parseInt(countEl.textContent, 10);

            if (action === 'like') {
                if (this.classList.toggle('qaq-liked')) { count++; qaqToast('已点赞'); } else { count--; qaqToast('取消点赞'); }
            } else if (action === 'collect') {
                if (this.classList.toggle('qaq-collected')) { count++; qaqToast('已收藏'); } else { count--; qaqToast('取消收藏'); }
            } else if (action === 'share') {
                if (this.classList.toggle('qaq-shared')) { count++; qaqToast('已转发'); } else { count--; qaqToast('取消转发'); }
            }
            countEl.textContent = count;
        });

        var span = btn.querySelector('span');
        function openCountEdit(el) {
            var action = btn.dataset.action;
            var labels = { like: '点赞', collect: '收藏', share: '转发' };
            longTimer = setTimeout(function () {
                isLong = true;
                qaqEditText('编辑' + labels[action] + '数量', el.textContent, false, function (val) { el.textContent = val; });
            }, 600);
        }
        span.addEventListener('mousedown', function (e) { e.stopPropagation(); isLong = false; openCountEdit(this); });
        span.addEventListener('mouseup', function () { clearTimeout(longTimer); });
        span.addEventListener('mouseleave', function () { clearTimeout(longTimer); });
        span.addEventListener('touchstart', function (e) { e.stopPropagation(); isLong = false; openCountEdit(this); }, { passive: true });
        span.addEventListener('touchend', function () { clearTimeout(longTimer); });
    });

    /* ===== 评论 ===== */
    var sendBtn = document.querySelector('.qaq-send-btn');
    var commentInput = document.querySelector('.qaq-comment-input');
    if (sendBtn && commentInput) {
        function qaqSendComment() {
            var val = commentInput.value.trim();
            if (!val) return qaqToast('请输入评论内容');
            commentInput.value = '';
            qaqToast('评论已发送');
        }
        sendBtn.addEventListener('click', qaqSendComment);
        commentInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); qaqSendComment(); }
        });
    }

    /* ===== 页面切换管理 ===== */
    var settingsPage = document.getElementById('qaq-settings-page');
    var planPage = document.getElementById('qaq-plan-page');
    var qaqPageLock = false;

    var qaqSwitchTimer = null;

function qaqGetCurrentPage() {
    return document.querySelector('[class*="qaq-"].qaq-page-show');
}

function qaqGoBackTo(parentPageEl, childPageEl) {
    if (!parentPageEl || !childPageEl || qaqPageLock) return;

    qaqPageLock = true;
    //★ 删掉下面这行（函数不存在，会报错导致锁死）
    // qaqSetPageSwitching(true);

    parentPageEl.style.transition = 'none';
    parentPageEl.classList.add('qaq-page-show');

    void parentPageEl.offsetHeight;

    parentPageEl.style.transition = '';

    requestAnimationFrame(function () {
        childPageEl.classList.remove('qaq-page-show');

        clearTimeout(qaqSwitchTimer);
        qaqSwitchTimer = setTimeout(function () {
            qaqPageLock = false;
            // ★ 同样删掉下面这行
            // qaqSetPageSwitching(false);
        }, 200);
    });
}

function qaqValidateWordCandidate(word, meaning) {
    word = qaqTrim(word);
    meaning = qaqTrim(meaning);

    if (!word && !meaning) {
        return { ok: false, reason: '单词和释义都为空' };
    }
    if (!word) {
        return { ok: false, reason: '单词为空' };
    }
    if (!meaning) {
        return { ok: false, reason: '释义为空' };
    }
    if (qaqShouldDropWordItem(word, meaning)) {
        return { ok: false, reason: '疑似标题、页码或无效内容' };
    }
    if (!qaqLooksLikeEnglishWord(word)) {
        return { ok: false, reason: '单词格式未通过校验' };
    }
    if (meaning.length > 800) {
    return { ok: false, reason: '释义过长，疑似混入杂项文本' };

    }

    return { ok: true, reason: '' };
}

function qaqDedupeWordItemsWithLog(items) {
    var seen = {};
    var accepted = [];
    var rejected = [];

    items.forEach(function (item) {
        var key = (qaqTrim(item.word).toLowerCase() + '||' + qaqTrim(item.meaning));
        if (seen[key]) {
            rejected.push({
                word: item.word || '',
                meaning: item.meaning || '',
                reason: '重复词条'
            });
            return;
        }
        seen[key] = true;
        accepted.push(item);
    });

    return {
        accepted: accepted,
        rejected: rejected
    };
}

function qaqClassifyWordCandidates(items) {
    var accepted = [];
    var rejected = [];

    (items || []).forEach(function (item) {
        var word = qaqTrim(item.word || '');
        var meaning = qaqTrim(item.meaning || '');

        var check = qaqValidateWordCandidate(word, meaning);
        if (!check.ok) {
            rejected.push({
                word: word,
                meaning: meaning,
                reason: check.reason
            });
            return;
        }

        accepted.push({
            id: item.id || qaqWordId(),
            word: word,
            meaning: meaning,
            phonetic: item.phonetic || '',
            example: item.example || '',
            exampleCn: item.exampleCn || '',
            book: item.book || ''
        });
    });

    var deduped = qaqDedupeWordItemsWithLog(accepted);

    return {
        accepted: deduped.accepted,
        rejected: rejected.concat(deduped.rejected)
    };
}

function qaqOpenWordbookImportReview(bookName, acceptedItems, rejectedItems, sourceName) {
    acceptedItems = acceptedItems || [];
    rejectedItems = rejectedItems || [];

    var acceptedHtml = acceptedItems.slice(0, 20).map(function (item) {
        return (
            '<div class="qaq-wordbank-preview-item">' +
                '<div class="qaq-wordbank-preview-item-top">' +
                    '<div class="qaq-wordbank-preview-word">' + item.word + '</div>' +
                '</div>' +
                '<div class="qaq-wordbank-preview-meaning">' + item.meaning + '</div>' +
            '</div>'
        );
    }).join('');

    var rejectedHtml = rejectedItems.slice(0, 80).map(function (item, idx) {
        return (
            '<label class="qaq-wordbank-preview-item" style="cursor:pointer;">' +
                '<div style="display:flex;align-items:flex-start;gap:8px;">' +
                    '<input type="checkbox" class="qaq-import-reject-check" data-idx="' + idx + '" style="margin-top:2px;">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div class="qaq-wordbank-preview-item-top">' +
                            '<div class="qaq-wordbank-preview-word">' + (item.word || '（空）') + '</div>' +
                        '</div>' +
                        '<div class="qaq-wordbank-preview-meaning">' + (item.meaning || '（空）') + '</div>' +
                        '<div class="qaq-wordbank-preview-meta" style="color:#d27a7a;">未导入原因：' + item.reason + '</div>' +
                    '</div>' +
                '</div>' +
            '</label>'
        );
    }).join('');

    modalTitle.textContent = '导入检查';

    modalBody.innerHTML =
        '<div class="qaq-wordbank-preview-wrap">' +
            '<input class="qaq-modal-input" id="qaq-wordbook-name-input" type="text" value="' + bookName.replace(/"/g, '&quot;') + '">' +

            '<div class="qaq-wordbank-preview-desc">自动识别成功 ' + acceptedItems.length + ' 条</div>' +
            '<div class="qaq-wordbank-preview-list">' + acceptedHtml + '</div>' +

            (acceptedItems.length > 20
                ? '<div class="qaq-wordbank-preview-note">仅显示前 20 条自动识别结果</div>'
                : '') +

            '<div class="qaq-wordbank-preview-desc" style="margin-top:8px;">未导入候选 ' + rejectedItems.length + ' 条（可勾选补充导入）</div>' +

            '<div style="display:flex;gap:8px;">' +
                '<button class="qaq-import-ghost-btn" id="qaq-select-all-rejected" style="flex:1;">全选候选</button>' +
'<button class="qaq-import-ghost-btn" id="qaq-clear-all-rejected" style="flex:1;">清空选择</button>' +
            '</div>' +

            '<div class="qaq-wordbank-preview-list" id="qaq-rejected-preview-list">' + rejectedHtml + '</div>' +

            (rejectedItems.length > 80
                ? '<div class="qaq-wordbank-preview-note">仅显示前 80 条未导入候选</div>'
                : '') +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-wordbook-import-confirm">确认导入</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    var selectAllBtn = document.getElementById('qaq-select-all-rejected');
    var clearAllBtn = document.getElementById('qaq-clear-all-rejected');

    if (selectAllBtn) {
        selectAllBtn.onclick = function () {
            modalBody.querySelectorAll('.qaq-import-reject-check').forEach(function (el) {
                el.checked = true;
            });
        };
    }

    if (clearAllBtn) {
        clearAllBtn.onclick = function () {
            modalBody.querySelectorAll('.qaq-import-reject-check').forEach(function (el) {
                el.checked = false;
            });
        };
    }

    document.getElementById('qaq-wordbook-import-confirm').onclick = function () {
        var finalName = document.getElementById('qaq-wordbook-name-input').value.trim() || '未命名词库';

        var manualSelected = [];
        modalBody.querySelectorAll('.qaq-import-reject-check:checked').forEach(function (el) {
            var idx = parseInt(el.dataset.idx, 10);
            if (rejectedItems[idx]) {
                manualSelected.push({
                    id: qaqWordId(),
                    word: rejectedItems[idx].word || '',
                    meaning: rejectedItems[idx].meaning || '',
                    phonetic: '',
                    example: '',
                    exampleCn: '',
                    book: sourceName || ''
                });
            }
        });

        var finalItems = acceptedItems.concat(
            manualSelected.filter(function (item) {
                return qaqTrim(item.word) && qaqTrim(item.meaning);
            })
        );

        var deduped = qaqDedupeWordItemsWithLog(finalItems);
        finalItems = deduped.accepted;

        if (!finalItems.length) {
            return qaqToast('没有可导入的词条');
        }

        var books = qaqGetWordbooks();
        books.unshift(qaqCreateWordbook(finalName, finalItems, sourceName));
        qaqSaveWordbooks(books);

        qaqCloseModal();
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        qaqToast('导入成功，共 ' + finalItems.length + ' 条');
    };
}

/* ===== 第五阶段：本轮单词生成小说 ===== */
var qaqReviewStoryPage = document.getElementById('qaq-review-story-page');
var qaqReviewStoryAbortCtrl = null;
var qaqReviewStoryGenerating = false;
function qaqGetLastReviewStory() {
    return JSON.parse(localStorage.getItem('qaq-review-story-last') || 'null');
}

function qaqSaveLastReviewStory(data) {
    localStorage.setItem('qaq-review-story-last', JSON.stringify(data || null));
}

function qaqGetReviewStoryHistory() {
    return JSON.parse(localStorage.getItem('qaq-review-story-history') || '[]');
}

function qaqSaveReviewStoryHistory(list) {
    localStorage.setItem('qaq-review-story-history', JSON.stringify(list || []));
}

function qaqPushReviewStoryHistory(item) {
    var list = qaqGetReviewStoryHistory();
    list.unshift(item);
    if (list.length > 30) list = list.slice(0, 30);
    qaqSaveReviewStoryHistory(list);
}

function qaqClearReviewStoryHistory() {
    localStorage.removeItem('qaq-review-story-history');
}

function qaqFormatDateTime(ts) {
    var d = new Date(ts);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var min = d.getMinutes();
    return y + '-' +
        (m < 10 ? '0' : '') + m + '-' +
        (day < 10 ? '0' : '') + day + ' ' +
        (h < 10 ? '0' : '') + h + ':' +
        (min < 10 ? '0' : '') + min;
}

var qaqReviewBuiltInTagGroups = {
    '场景类': [
        '校园', '日常', '都市', '乡村', '古堡', '海边', '森林', '异世界'
    ],
    '风格类': [
        '治愈', '黑暗', '温柔', '幽默', '诗意', '紧张', '轻松', '热血'
    ],
    '情绪类': [
        '青春', '孤独', '成长', '希望', '友情', '恋爱', '遗憾', '勇气'
    ],
    '题材类': [
        '奇幻', '悬疑', '推理', '冒险', '科幻', '古风', '战争', '童话', '魔法'
    ]
};

function qaqGetAllBuiltInStoryTags() {
    var out = [];
    Object.keys(qaqReviewBuiltInTagGroups).forEach(function (groupName) {
        out = out.concat(qaqReviewBuiltInTagGroups[groupName] || []);
    });
    return out;
}

var qaqReviewStorySelectedTags = [];

function qaqGetReviewStoryCustomTags() {
    return JSON.parse(localStorage.getItem('qaq-review-story-custom-tags') || '[]');
}

function qaqSaveReviewStoryCustomTags(tags) {
    localStorage.setItem('qaq-review-story-custom-tags', JSON.stringify(tags || []));
}

var qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

function qaqGetReviewStorySourceWords() {
    var finished = qaqGetLastFinishedReview();
    if (!finished || !finished.words) return [];
    return finished.words.slice();
}

function qaqRenderReviewStoryPage() {
    var words = qaqGetReviewStorySourceWords();
    var wordlistEl = document.getElementById('qaq-review-story-wordlist');
    var settings = qaqGetReviewSettings();
    var lastStory = qaqGetLastReviewStory();

    wordlistEl.innerHTML = '';

    words.forEach(function (item) {
        var chip = document.createElement('div');
        chip.className = 'qaq-review-story-chip';
        chip.textContent = item.word;
        wordlistEl.appendChild(chip);
    });

    document.getElementById('qaq-review-story-word-count').value = settings.storyWordCount || 800;
    document.getElementById('qaq-review-story-mode').value = settings.storyMode || 'story';
    document.getElementById('qaq-review-story-bilingual-mode').value = settings.storyBilingualMode || 'summary-cn';

    if (lastStory && lastStory.tags && lastStory.tags.length) {
        qaqReviewStorySelectedTags = lastStory.tags.slice();
    }

    qaqRenderReviewStoryTags('');
    qaqReviewStoryTranslateMode = false;
    document.getElementById('qaq-review-story-output').classList.remove('qaq-review-story-translate-on');
    document.getElementById('qaq-review-story-translate-toggle-btn').textContent = '逐句翻译';

    if (lastStory && lastStory.paragraphs && lastStory.paragraphs.length) {
    qaqRenderStructuredStory(lastStory);
} else if (lastStory && lastStory.content) {
    // 兼容旧数据
    document.getElementById('qaq-review-story-title').textContent = lastStory.title || '生成结果';
    document.getElementById('qaq-review-story-title').style.display = '';
    document.getElementById('qaq-review-story-output').textContent = lastStory.content;
} else {
        document.getElementById('qaq-review-story-title').style.display = 'none';
        document.getElementById('qaq-review-story-output').textContent = '生成后会显示在这里';
        document.getElementById('qaq-review-story-meta').textContent = '暂无结果';
    }
    // ★ 新增：把原生 select 包装成弹窗选择器
qaqWrapSelectAsModal('qaq-review-story-mode', '选择生成模式');
qaqWrapSelectAsModal('qaq-review-story-bilingual-mode', '选择双语模式');
}

function qaqWrapSelectAsModal(selectId, title) {
    var sel = document.getElementById(selectId);
    if (!sel || sel.dataset.wrapped) return;
    sel.dataset.wrapped = '1';

    // 隐藏原生 select
    sel.style.display = 'none';

    // 创建显示按钮
    var btn = document.createElement('div');
    btn.className = 'qaq-custom-select-btn';
    btn.id = selectId + '-btn';

    function updateBtnText() {
        var opt = sel.options[sel.selectedIndex];
        btn.textContent = opt ? opt.textContent : '请选择';
    }
    updateBtnText();

    sel.parentNode.insertBefore(btn, sel.nextSibling);

    btn.addEventListener('click', function () {
        var options = [];
        for (var i = 0; i < sel.options.length; i++) {
            options.push({
                value: sel.options[i].value,
                label: sel.options[i].textContent,
                selected: sel.options[i].selected
            });
        }

        modalTitle.textContent = title;
        modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
            options.map(function (opt) {
                return '<div class="qaq-custom-select-option' +
                    (opt.selected ? ' qaq-custom-select-active' : '') +
                    '" data-value="' + opt.value + '">' +
                    '<span>' + opt.label + '</span>' +
                    (opt.selected ? '<span style="color:#c47068;">✓</span>' : '') +
                    '</div>';
            }).join('') +
            '</div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (item) {
            item.addEventListener('click', function () {
                sel.value = this.dataset.value;
                updateBtnText();
                qaqCloseModal();
            });
        });
    });
}

/* ===== 小说页增强工具 ===== */
var qaqReviewStoryTranslateMode = false;


function qaqGetReviewStoryFavorites() {
    return JSON.parse(localStorage.getItem('qaq-review-story-favorites') || '[]');
}

function qaqSaveReviewStoryFavorites(list) {
    localStorage.setItem('qaq-review-story-favorites', JSON.stringify(list || []));
}


function qaqToggleStoryFavorite(story) {
    var list = qaqGetReviewStoryFavorites();
    var idx = list.findIndex(function (item) {
        return item.createdAt === story.createdAt;
    });

    if (idx > -1) {
        list.splice(idx, 1);
        qaqSaveReviewStoryFavorites(list);
        return false;
    } else {
        list.unshift(story);
        if (list.length > 100) list = list.slice(0, 100);
        qaqSaveReviewStoryFavorites(list);
        return true;
    }
}

function qaqGenerateStoryTitle(storyText, tags, words, mode) {
    var map = {
        story: '单词短篇故事',
        dialogue: '单词情景对话',
        diary: '单词学习日记',
        essay: '单词主题短文',
        cet: '四六级风格作文'
    };

    var base = map[mode] || '单词生成作品';
    var useTag = tags && tags.length ? tags[0] : '';
    var useWord = words && words.length ? words[0] : '';

    if (useTag && useWord) return useTag + ' · ' + useWord + ' · ' + base;
    if (useTag) return useTag + ' · ' + base;
    if (useWord) return useWord + ' · ' + base;
    return base;
}

function qaqEscapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


function qaqNormalizeWordToken(token) {
    return String(token || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
}


function qaqFindWordInfo(rawWord, sourceWords) {
    var key = String(rawWord || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');

    var exact = (sourceWords || []).find(function (item) {
        return String(item.word || '').toLowerCase() === key;
    });
    if (exact) return exact;

    var fuzzy = (sourceWords || []).find(function (item) {
        var w = String(item.word || '').toLowerCase();
        return key === w ||
               key === w + 's' ||
               key === w + 'ed' ||
               key === w + 'ing' ||
               key === w.replace(/y$/, 'ies');
    });

    return fuzzy || null;
}

// 找到这个函数并完全替换
function qaqRenderSentenceWords(sentence, sourceWords) {
    // 给所有英文单词都添加可点击标记，不再限制只有本轮单词
    return String(sentence || '').replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, function (m, raw) {
        // 所有英文单词都包裹成可点击的
        return '<span class="qaq-review-story-word" data-word="' + qaqEscapeHtml(raw) + '">' + raw + '</span>';
    });
}

function qaqRenderStructuredStory(storyData) {
    var outputEl = document.getElementById('qaq-review-story-output');
    var titleEl = document.getElementById('qaq-review-story-title');
    if (!outputEl || !titleEl) return;
if (!storyData.sourceWords || !storyData.sourceWords.length) {
        storyData.sourceWords = qaqGetReviewStorySourceWords();
    }
    if (!storyData || !storyData.paragraphs || !storyData.paragraphs.length) {
        titleEl.style.display = 'none';
        outputEl.textContent = '生成后会显示在这里';
        return;
    }

    titleEl.textContent = storyData.title || '生成结果';
    titleEl.style.display = '';

    outputEl.classList.toggle('qaq-review-story-translate-on', !!qaqReviewStoryTranslateMode);

    outputEl.innerHTML = storyData.paragraphs.map(function (para, pIndex) {
        var sentenceHtml = (para.sentences || []).map(function (sentence, sIndex) {
            return (
                '<div class="qaq-review-story-sentence-wrap">' +
                    '<div class="qaq-review-story-sentence" data-paragraph="' + pIndex + '" data-sentence="' + sIndex + '">' +
                        qaqRenderSentenceWords(sentence.en || '', storyData.sourceWords || []) +
                    '</div>' +
                    '<div class="qaq-review-story-sentence-cn">' + qaqEscapeHtml(sentence.cn || '') + '</div>' +
                '</div>'
            );
        }).join('');

        return (
            '<div class="qaq-review-story-paragraph" data-paragraph="' + pIndex + '">' +
                sentenceHtml +
            '</div>'
        );
    }).join('');
}

function qaqSpeakText(text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) return qaqToast('当前设备不支持朗读');

    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = Math.max(0.6, Math.min(1.2, Number(qaqGetReviewSettings().speechRate || 0.9)));
    utter.pitch = 1;
    utter.volume = 1;

    var voice = qaqPickEnglishVoice();
    if (voice) utter.voice = voice;

    speechSynthesis.cancel();
    setTimeout(function () {
        speechSynthesis.speak(utter);
    }, 30);
}

function qaqStopSpeakText() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

function qaqRenderReviewStoryTags(keyword) {
    var builtinEl = document.getElementById('qaq-review-story-builtin-tags');
    var customEl = document.getElementById('qaq-review-story-custom-tags');
    var customEmptyEl = document.getElementById('qaq-review-story-custom-empty');

    if (!builtinEl || !customEl) return;

    builtinEl.innerHTML = '';
    customEl.innerHTML = '';

    var kw = (keyword || '').trim();
    qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

    function createTagEl(tag, isCustom) {
        var el = document.createElement('div');
        el.className = 'qaq-review-story-tag' +
            (qaqReviewStorySelectedTags.indexOf(tag) > -1 ? ' qaq-tag-active' : '') +
            (isCustom ? ' qaq-tag-custom' : '');
        el.textContent = tag;

        el.addEventListener('click', function (e) {
            if (e.target.closest('.qaq-review-story-tag-del')) return;

            var idx = qaqReviewStorySelectedTags.indexOf(tag);
            if (idx > -1) qaqReviewStorySelectedTags.splice(idx, 1);
            else qaqReviewStorySelectedTags.push(tag);

            qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
        });

        if (isCustom) {
            var del = document.createElement('span');
            del.className = 'qaq-review-story-tag-del';
            del.textContent = '×';
            del.title = '删除标签';

            del.addEventListener('click', function (e) {
                e.stopPropagation();

                qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags().filter(function (t) {
                    return t !== tag;
                });
                qaqSaveReviewStoryCustomTags(qaqReviewStoryCustomTags);

                qaqReviewStorySelectedTags = qaqReviewStorySelectedTags.filter(function (t) {
                    return t !== tag;
                });

                qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
                qaqToast('已删除自定义标签');
            });

            el.appendChild(del);
        }

        return el;
    }

    var builtinCount = 0;

    Object.keys(qaqReviewBuiltInTagGroups).forEach(function (groupName) {
        var tags = (qaqReviewBuiltInTagGroups[groupName] || []).filter(function (tag) {
            return !kw || tag.indexOf(kw) > -1;
        });

        if (!tags.length) return;

        builtinCount += tags.length;

        var groupWrap = document.createElement('div');
        groupWrap.className = 'qaq-review-story-tag-group';

        var title = document.createElement('div');
        title.className = 'qaq-review-story-tag-group-title';
        title.textContent = groupName + '（' + tags.length + '）';

        var body = document.createElement('div');
        body.className = 'qaq-review-story-tags';

        tags.forEach(function (tag) {
            body.appendChild(createTagEl(tag, false));
        });

        groupWrap.appendChild(title);
        groupWrap.appendChild(body);
        builtinEl.appendChild(groupWrap);
    });

    var customFiltered = qaqReviewStoryCustomTags.filter(function (tag) {
        return !kw || tag.indexOf(kw) > -1;
    });

    customFiltered.forEach(function (tag) {
        customEl.appendChild(createTagEl(tag, true));
    });

    customEmptyEl.style.display = customFiltered.length ? 'none' : '';

    document.getElementById('qaq-review-story-builtin-count').textContent = builtinCount;
    document.getElementById('qaq-review-story-custom-count').textContent = customFiltered.length;
    document.getElementById('qaq-review-story-tag-stats').textContent =
        '已选 ' + qaqReviewStorySelectedTags.length +
        ' · 内置 ' + builtinCount +
        ' · 自定义 ' + customFiltered.length;
}


async function qaqGenerateReviewStory() {
    var cfg = qaqGetReviewApiConfig();
    var words = qaqGetReviewStorySourceWords();
    var settings = qaqGetReviewSettings();

    if (qaqReviewStoryGenerating) {
        return qaqToast('正在生成中');
    }

    if (!words.length) {
        return qaqToast('没有可用于生成小说的本轮单词');
    }

    if (!cfg.key || !cfg.model) {
        return qaqToast('请先在背单词设置中填好 API Key 和 Model');
    }

    if ((cfg.provider === 'openai' || cfg.provider === 'minimax-openai') && !cfg.url) {
        return qaqToast('请先填写兼容接口 URL');
    }

    if (cfg.provider === 'minimax-native' && !cfg.minimaxGroupId && !cfg.url) {
        return qaqToast('MiniMax 原生接口请填写 Group ID，或完整原生 URL');
    }

    var storyMode = document.getElementById('qaq-review-story-mode').value;
    var bilingualMode = document.getElementById('qaq-review-story-bilingual-mode').value;
    var tags = qaqReviewStorySelectedTags.slice();
    var wordText = words.map(function (w) { return w.word; }).join(', ');

    var wordCount = parseInt(document.getElementById('qaq-review-story-word-count').value, 10) ||
        settings.storyWordCount ||
        800;

    wordCount = Math.max(100, Math.min(5000, wordCount));

    settings.storyMode = storyMode;
    settings.storyBilingualMode = bilingualMode;
    settings.storyWordCount = wordCount;
    qaqSaveReviewSettings(settings);

    var modeInstructionMap = {
        story: '写一篇英语短篇故事',
        dialogue: '写一篇以对话为主的英语短文',
        diary: '写一篇英语日记',
        essay: '写一篇英语议论文或观点短文',
        cet: '写一篇适合四六级水平的英语作文'
    };

    var bilingualInstruction = '';
    if (bilingualMode === 'en') {
        bilingualInstruction = '输出仅使用英文，不要附中文。';
    } else if (bilingualMode === 'summary-cn') {
        bilingualInstruction = '正文使用英文，最后附一段中文总结或中文翻译。';
    } else if (bilingualMode === 'paragraph-cn') {
        bilingualInstruction = '请采用英文段落 + 对应中文段落的形式输出。';
    }

    var targetWords = words.map(function (w) { return w.word; });

    var prompt =
        '你是英语学习内容生成助手。请根据给定单词生成内容，并严格返回 JSON，不要输出 JSON 以外的任何文字。\n\n' +
        '【必须覆盖的目标单词】\n' + targetWords.join(', ') + '\n\n' +
        '【任务类型】' + (modeInstructionMap[storyMode] || '英语短篇故事') + '\n' +
        '【风格标签】' + (tags.length ? tags.join('、') : '不限') + '\n' +
        '【目标英文词数】约 ' + wordCount + ' 词\n' +
        '【双语模式】' + bilingualMode + '\n\n' +

        '要求：\n' +
        '1. 尽可能覆盖全部目标单词，优先保证每个单词至少出现一次。\n' +
        '2. 内容自然、连贯、适合英语学习者。\n' +
        '3. 每个段落必须同时给出英文和中文。\n' +
        '4. 每个句子必须同时给出英文和中文。\n' +
        '5. 返回中必须明确列出实际使用的单词 usedWords。\n' +
        '6. 如果有漏掉的单词，必须列入 omittedWords。\n' +
        '7. 只能返回合法 JSON。\n\n' +

        '返回格式如下：\n' +
        '{\n' +
        '  "title": "文章标题",\n' +
        '  "usedWords": ["word1", "word2"],\n' +
        '  "omittedWords": [],\n' +
        '  "paragraphs": [\n' +
        '    {\n' +
        '      "en": "英文段落",\n' +
        '      "cn": "中文段落",\n' +
        '      "sentences": [\n' +
        '        {\n' +
        '          "en": "英文句子",\n' +
        '          "cn": "中文句子",\n' +
        '          "usedWords": ["word1"]\n' +
        '        }\n' +
        '      ]\n' +
        '    }\n' +
        '  ]\n' +
        '}';

    var stopBtn = document.getElementById('qaq-review-story-stop-btn');
    var genBtn = document.getElementById('qaq-review-story-generate-btn');

    try {
        qaqReviewStoryGenerating = true;
        qaqReviewStoryAbortCtrl = new AbortController();

        if (stopBtn) stopBtn.style.display = '';
        if (genBtn) genBtn.disabled = true;

        document.getElementById('qaq-review-story-output').textContent = '正在生成，请稍等...';

        qaqShowStoryProgress('正在生成小说', '正在整理本轮单词与标签...');
        qaqUpdateImportProgress(15, '正在整理提示词...');

        var content = '';

        qaqUpdateImportProgress(40, '正在请求模型...');
        if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
            content = await qaqReviewGenerateByOpenAICompatible(
                cfg,
                prompt,
                qaqReviewStoryAbortCtrl.signal
            );
        } else if (cfg.provider === 'minimax-native') {
            content = await qaqReviewGenerateByMiniMaxNative(
                cfg,
                prompt,
                qaqReviewStoryAbortCtrl.signal
            );
        } else {
            throw new Error('不支持的 provider');
        }

        qaqUpdateImportProgress(70, '正在整理生成结果...');
        var parsedStory = qaqParseStructuredStory(content);

        var fullEn = parsedStory.paragraphs.map(function (p) {
            return p.en || (p.sentences || []).map(function (s) { return s.en; }).join(' ');
        }).join('\n\n');

        var fullCn = parsedStory.paragraphs.map(function (p) {
            return p.cn || (p.sentences || []).map(function (s) { return s.cn; }).join('');
        }).join('\n\n');

        var missedWords = qaqCheckStoryCoverage(
            words.map(function (w) { return w.word; }),
            parsedStory.usedWords
        );

        // ★ 新增：提取所有英文单词
        qaqUpdateImportProgress(75, '正在提取所有单词...');
        var allWords = qaqExtractAllEnglishWords(fullEn);

        // ★ 新增：批量获取释义
        qaqUpdateImportProgress(80, '正在获取单词释义...');
        var wordMeanings = await qaqBatchFetchWordMeanings(allWords, words, cfg);

        var storyData = {
            title: parsedStory.title || qaqGenerateStoryTitle(
                fullEn,
                tags.slice(),
                words.map(function (w) { return w.word; }),
                storyMode
            ),
            content: fullEn,
            contentCn: fullCn,
            paragraphs: parsedStory.paragraphs || [],
            usedWords: parsedStory.usedWords || [],
            omittedWords: parsedStory.omittedWords && parsedStory.omittedWords.length
                ? parsedStory.omittedWords
                : missedWords,
            wordMeanings: wordMeanings,  // ★ 保存所有单词释义
            createdAt: Date.now(),
            tags: tags.slice(),
            wordCount: wordCount,
            words: words.map(function (w) { return w.word; }),
            sourceWords: words.map(function (w) {
                return {
                    id: w.id || '',
                    word: w.word || '',
                    meaning: w.meaning || '',
                    phonetic: w.phonetic || '',
                    example: w.example || '',
                    exampleCn: w.exampleCn || ''
                };
            }),
            bookName: (words[0] && words[0].bookName) || '',
            mode: storyMode,
            bilingualMode: bilingualMode
        };

        qaqRenderStructuredStory(storyData);
        qaqSaveLastReviewStory(storyData);
        qaqPushReviewStoryHistory(storyData);

        document.getElementById('qaq-review-story-meta').textContent =
            '已生成 · ' + wordCount + ' 词目标 · ' + qaqFormatDateTime(storyData.createdAt);

        qaqUpdateImportProgress(100, '生成完成');
        setTimeout(function () {
            qaqHideStoryProgress();
        }, 250);

        qaqToast('小说已生成');
    } catch (err) {
        console.error(err);
        qaqHideStoryProgress();

        if (err && err.name === 'AbortError') {
            document.getElementById('qaq-review-story-output').textContent = '已停止生成';
            document.getElementById('qaq-review-story-meta').textContent = '生成已中止';
            qaqToast('已停止生成');
        } else {
            document.getElementById('qaq-review-story-output').textContent = '生成失败：' + (err.message || '未知错误');
            qaqToast('生成失败');
        }
    } finally {
        qaqReviewStoryGenerating = false;
        qaqReviewStoryAbortCtrl = null;
        if (stopBtn) stopBtn.style.display = 'none';
        if (genBtn) genBtn.disabled = false;
    }
}

// 提取文本中所有英文单词（去重）
function qaqExtractAllEnglishWords(text) {
    var words = {};
    String(text || '').replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, function (m, word) {
        var key = word.toLowerCase();
        words[key] = word;
    });
    return Object.values(words);
}

// 批量获取单词释义
async function qaqBatchFetchWordMeanings(allWords, sourceWords, cfg) {
    if (!allWords || !allWords.length) return {};

    var meanings = {};
    var unknownWords = [];

    // 先从本轮单词中查找
    for (var i = 0; i < allWords.length; i++) {
        var word = allWords[i];
        var key = word.toLowerCase();
        
        var found = sourceWords.find(function (w) {
            return w.word.toLowerCase() === key;
        });

        if (found) {
            meanings[key] = {
                word: found.word,
                phonetic: found.phonetic || '',
                meaning: found.meaning || '暂无释义',
                example: found.example || '',
                exampleCn: found.exampleCn || ''
            };
            continue;
        }

        // 再从所有词库中查找
        found = qaqFindWordFromAllBooksSync(word);
        if (found) {
            meanings[key] = {
                word: found.word,
                phonetic: found.phonetic || '',
                meaning: found.meaning || '暂无释义',
                example: found.example || '',
                exampleCn: found.exampleCn || ''
            };
        } else {
            unknownWords.push(word);
        }
    }

    // 对未知单词批量请求API
    if (unknownWords.length > 0 && cfg.key && cfg.model) {
        try {
            // 分批处理，每次最多20个单词
            var batchSize = 20;
            for (var j = 0; j < unknownWords.length; j += batchSize) {
                var batch = unknownWords.slice(j, j + batchSize);
                
                var prompt =
                    '请为以下英语单词提供释义，只返回 JSON 数组，不要其他解释。\n' +
                    '单词列表：' + batch.join(', ') + '\n\n' +
                    '返回格式：\n' +
                    '[\n' +
                    '  {\n' +
                    '    "word": "单词原形",\n' +
                    '    "phonetic": "音标",\n' +
                    '    "meaning": "中文释义"\n' +
                    '  }\n' +
                    ']\n\n' +
                    '要求：释义简洁准确，适合四六级学习';

                var content = '';
                if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
                    content = await qaqReviewGenerateByOpenAICompatible(cfg, prompt);
                } else if (cfg.provider === 'minimax-native') {
                    content = await qaqReviewGenerateByMiniMaxNative(cfg, prompt);
                }

                var parsed = qaqExtractJsonBlock(content);
                if (Array.isArray(parsed)) {
                    for (var k = 0; k < parsed.length; k++) {
                        var item = parsed[k];
                        if (item.word) {
                            meanings[item.word.toLowerCase()] = {
                                word: item.word,
                                phonetic: item.phonetic || '',
                                meaning: item.meaning || '暂无释义',
                                example: '',
                                exampleCn: ''
                            };
                        }
                    }
                }
            }
        } catch (err) {
            console.error('批量获取释义失败：', err);
        }
    }

    return meanings;
}


document.getElementById('qaq-review-story-back').addEventListener('click', function () {
    if (qaqReviewStoryAbortCtrl) {
        qaqReviewStoryAbortCtrl.abort();
    }
    qaqGoBackTo(wordbankPage, qaqReviewStoryPage);
    qaqSwitchWordbankTab('review');
});

document.getElementById('qaq-review-story-tag-search').addEventListener('input', function () {
    qaqRenderReviewStoryTags(this.value);
});

document.getElementById('qaq-review-story-custom-add-btn').addEventListener('click', function () {
    var input = document.getElementById('qaq-review-story-custom-input');
    var val = input.value.trim();
    if (!val) return qaqToast('请输入标签');

    qaqReviewStoryCustomTags = qaqGetReviewStoryCustomTags();

    var allBuiltInTags = qaqGetAllBuiltInStoryTags();
if (allBuiltInTags.indexOf(val) === -1 && qaqReviewStoryCustomTags.indexOf(val) === -1) {
        qaqReviewStoryCustomTags.push(val);
        qaqSaveReviewStoryCustomTags(qaqReviewStoryCustomTags);
    }

    if (qaqReviewStorySelectedTags.indexOf(val) === -1) {
        qaqReviewStorySelectedTags.push(val);
    }

    input.value = '';
    qaqRenderReviewStoryTags(document.getElementById('qaq-review-story-tag-search').value);
    qaqToast('标签已添加');
});

document.getElementById('qaq-review-story-generate-btn').addEventListener('click', function () {
    qaqGenerateReviewStory();
});

document.getElementById('qaq-review-story-stop-btn').addEventListener('click', function () {
    if (qaqReviewStoryAbortCtrl) {
        qaqReviewStoryAbortCtrl.abort();
    }
});

/* ===== 词库系统（完整替换版） ===== */
var wordbankPage = document.getElementById('qaq-wordbank-page');
var wordbookDetailPage = document.getElementById('qaq-wordbook-detail-page');
var wordbankFileInput = document.getElementById('qaq-wordbank-file-input');

var qaqCurrentWordbankTab = 'books';
var qaqCurrentWordbookId = null;

/* ===== 词库选择状态 ===== */
var qaqWordbookSelectMode = false;
var qaqSelectedWordbookIds = [];

var qaqWordEntrySelectMode = false;
var qaqSelectedWordIds = [];

function qaqToggleInArray(arr, val) {
    var idx = arr.indexOf(val);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(val);
    return arr;
}

function qaqWordId() {
    return 'w' + Date.now() + Math.random().toString(36).slice(2, 7);
}

function qaqWordbookId() {
    return 'book_' + Date.now() + Math.random().toString(36).slice(2, 7);
}


function qaqFormatImportTime(ts) {
    var d = new Date(ts);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var min = d.getMinutes();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day + ' ' +
        (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
}

function qaqTrim(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

function qaqIsPureIndexLine(text) {
    return /^\d+$/.test(qaqTrim(text));
}

function qaqLooksLikeWordHeader(text) {
    text = qaqTrim(text).toLowerCase();
    return text === 'word' || text === '单词';
}

function qaqLooksLikeMeaningHeader(text) {
    text = qaqTrim(text).toLowerCase();
    return text === 'meaning' || text === '释义' || text === '中文' || text === 'translation';
}

function qaqLooksLikeNoiseLine(text) {
    text = qaqTrim(text);
    if (!text) return true;

    if (/^---page\s+\d+/i.test(text)) return true;
    if (/^2025四级词汇闪过/.test(text)) return true;
    if (/^共\s*\d+\s*词/.test(text)) return true;
    if (/^扫码听单词/.test(text)) return true;
    if (/^纸上默写/.test(text)) return true;
    if (/^word\s*meaning$/i.test(text)) return true;

    return false;
}

function qaqLooksLikeEnglishWord(text) {
    text = qaqTrim(text);
    if (!text) return false;

    var lower = text.toLowerCase();

    if (qaqLooksLikeWordHeader(text) || qaqLooksLikeMeaningHeader(text)) return false;
    if (qaqLooksLikeNoiseLine(text)) return false;
    if (qaqIsPureIndexLine(text)) return false;

    // 明显词性行不要
    if (qaqLooksLikePosLine(text)) return false;

    // 允许短词、单词、短词组
    if (!/^[A-Za-z][A-Za-z\s\-'\.\/()]{0,50}$/.test(text)) return false;

    if (text.length > 40) return false;

    // 只排除极少数明显不是词条的单字母
    if (lower === 'a' || lower === 'i') return false;

    return true;
}

function qaqLooksLikeChineseMeaning(text) {
    text = qaqTrim(text);
    if (!text) return false;

    if (qaqLooksLikeWordHeader(text) || qaqLooksLikeMeaningHeader(text)) return false;
    if (qaqLooksLikeNoiseLine(text)) return false;
    if (qaqIsPureIndexLine(text)) return false;

    // 词性开头 + 中文释义，也算 meaning
    if (qaqLooksLikePosLine(text) && /[\u4e00-\u9fa5]/.test(text)) return true;

    return /[\u4e00-\u9fa5]/.test(text);
}

function qaqShouldDropWordItem(word, meaning) {
    var w = qaqTrim(word).toLowerCase();
    var m = qaqTrim(meaning).toLowerCase();

    if (!w || !m) return true;

    if ((w === 'word' && m === 'meaning') ||
        (qaqLooksLikeWordHeader(w) && qaqLooksLikeMeaningHeader(m))) {
        return true;
    }

    if (qaqLooksLikeNoiseLine(word) || qaqLooksLikeNoiseLine(meaning)) return true;
    if (qaqIsPureIndexLine(word) || qaqIsPureIndexLine(meaning)) return true;

    return false;
}

function qaqDedupeWordItems(items) {
    var seen = {};
    return items.filter(function (item) {
        var key = (qaqTrim(item.word).toLowerCase() + '||' + qaqTrim(item.meaning));
        if (seen[key]) return false;
        seen[key] = true;
        return true;
    });
}

function qaqLooksLikePosLine(text) {
    text = qaqTrim(text).toLowerCase();

    return /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\.$/.test(text) ||
           /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\./.test(text) ||
           /^(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|modal|det)\b/.test(text);
}

function qaqNormalizeWordItem(raw, bookName) {
    var word = qaqTrim(raw.word || raw.en || raw.english || raw.term || raw.vocab || '');
    var meaning = qaqTrim(raw.meaning || raw.cn || raw.chinese || raw.translation || raw.desc || '');
    var phonetic = qaqTrim(raw.phonetic || raw.uk || raw.us || '');
    var example = qaqTrim(raw.example || raw.sentence || '');
    var exampleCn = qaqTrim(raw.exampleCn || raw.sentenceCn || raw.example_cn || '');

    if (!word && !meaning) return null;

    return {
        id: raw.id || qaqWordId(),
        word: word,
        meaning: meaning,
        phonetic: phonetic,
        example: example,
        exampleCn: exampleCn,
        book: raw.book || bookName || ''
    };
}

function qaqCreateWordbook(name, words, sourceName) {
    return {
        id: qaqWordbookId(),
        name: name || '未命名词库',
        color: '#5b9bd5',
        importedAt: Date.now(),
        sourceName: sourceName || '',
        words: words.map(function (item) {
            return {
                id: item.id || qaqWordId(),
                word: item.word || '',
                meaning: item.meaning || '',
                phonetic: item.phonetic || '',
                example: item.example || '',
                exampleCn: item.exampleCn || ''
            };
        })
    };
}

/* ===== 页面打开 / 关闭 ===== */
function qaqOpenWordbankPage() {
    qaqCurrentWordbankTab = 'books';
    qaqWordbookSelectMode = false;
    qaqSelectedWordbookIds = [];

    qaqSwitchTo(wordbankPage);

    requestAnimationFrame(function () {
        qaqSwitchWordbankTab('books');
        document.getElementById('qaq-wordbook-search').value = '';
        qaqRenderWordbookHome('');
        qaqApplyWordbankCardThemeDebounced();
    });
}

function qaqCloseWordbankPage() {
    qaqClosePage(wordbankPage);
}

function qaqOpenWordbookDetail(bookId) {
    qaqCurrentWordbookId = bookId;
    qaqWordEntrySelectMode = false;
    qaqSelectedWordIds = [];
    qaqSwitchTo(wordbookDetailPage);

    requestAnimationFrame(function () {
        document.getElementById('qaq-wordbook-detail-search').value = '';
        qaqRenderWordbookDetail(bookId, '');
        qaqApplyWordbankCardThemeDebounced();
    });
}

function qaqCloseWordbookDetail() {
    if (qaqPageLock) return;
    qaqGoBackTo(wordbankPage, wordbookDetailPage);
}

/* ===== 词库页内导航 ===== */
function qaqSwitchWordbankTab(tab) {
    qaqCurrentWordbankTab = tab;

    document.querySelectorAll('.qaq-wordbank-tab').forEach(function (el) {
        el.classList.toggle('qaq-wordbank-tab-active', el.dataset.tab === tab);
    });

    document.getElementById('qaq-wordbank-panel-books').style.display = tab === 'books' ? '' : 'none';
    document.getElementById('qaq-wordbank-panel-review').style.display = tab === 'review' ? '' : 'none';
    document.getElementById('qaq-wordbank-panel-mine').style.display = tab === 'mine' ? '' : 'none';

    if (tab === 'books') {
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    } else if (tab === 'review') {
        qaqRenderReviewHome();
    } else if (tab === 'mine') {
        qaqRenderMinePanel();
    }
}

// ===== 2. 列表渲染优化：DocumentFragment +限制渲染数量 =====

// 替换 qaqRenderWordbookHome
function qaqRenderWordbookHome(keyword) {
    var listEl = document.getElementById('qaq-wordbook-list');
    var statsEl = document.getElementById('qaq-wordbook-stats');
    var emptyEl = document.getElementById('qaq-wordbook-empty');
    var batchBar = document.getElementById('qaq-wordbook-batchbar');
    if (!listEl) return;

    var books = qaqGetWordbooks();
    var kw = (keyword || '').trim().toLowerCase();

    if (kw) {
        books = books.filter(function (book) {
            return (book.name || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    statsEl.textContent = '共 ' + books.length + ' 本' +
        (qaqWordbookSelectMode ? ' · 已选 ' + qaqSelectedWordbookIds.length + ' 本' : '');
    batchBar.style.display = qaqWordbookSelectMode ? 'flex' : 'none';

    if (!books.length) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }
    emptyEl.style.display = 'none';

    //★ 限制首屏渲染数量
    var MAX_RENDER = 30;
    var renderBooks = books.slice(0, MAX_RENDER);

    var frag = document.createDocumentFragment();

    renderBooks.forEach(function (book) {
        var selected = qaqSelectedWordbookIds.indexOf(book.id) > -1;
        var div = document.createElement('div');
        div.className = 'qaq-wordbook-card' + (selected ? ' qaq-card-selected' : '');
        div.dataset.bookId = book.id;
        var bookColor = book.color || '#5b9bd5';

        if (qaqWordbookSelectMode) {
            div.innerHTML =
                '<div class="qaq-wordbook-card-top">' +
                '<div class="qaq-select-check' + (selected ? ' qaq-select-check-on' : '') + '"></div>' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="width:10px;height:10px;border-radius:50%;background:' + bookColor + ';flex-shrink:0;"></div>' +
                '<div class="qaq-wordbook-card-name">' + book.name + '</div></div>' +
                '<div class="qaq-wordbook-card-meta">导入：' + qaqFormatImportTime(book.importedAt) + '</div>' +
                '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>' +
                '</div></div>';
        } else {
            div.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="width:10px;height:10px;border-radius:50%;background:' + bookColor + ';"></div>' +
                '<div class="qaq-wordbook-card-name">' + book.name + '</div></div>' +
                '<div class="qaq-wordbook-card-meta">导入：' + qaqFormatImportTime(book.importedAt) + '</div>' +
                '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>';
        }
        frag.appendChild(div);
    });

    listEl.innerHTML = '';
    listEl.appendChild(frag);

    // ★ 事件委托（不再给每个卡片绑事件）
    // 见下方事件委托优化
}

// 替换 qaqRenderWordbookDetail - 同样用Fragment + 限制
function qaqRenderWordbookDetail(bookId, keyword) {
    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === bookId; });
    if (!book) return;

    document.getElementById('qaq-wordbook-detail-title').textContent = book.name;

    var listEl = document.getElementById('qaq-wordbook-detail-list');
    var statsEl = document.getElementById('qaq-wordbook-detail-stats');
    var emptyEl = document.getElementById('qaq-wordbook-detail-empty');
    var batchBar = document.getElementById('qaq-word-entry-batchbar');

    var items = (book.words || []);
    var kw = (keyword || '').trim().toLowerCase();

    if (kw) {
        items = items.filter(function (item) {
            return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                   (item.meaning || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    statsEl.textContent = '共 ' + items.length + ' 条' +
        (qaqWordEntrySelectMode ? ' · 已选 ' + qaqSelectedWordIds.length + ' 条' : '');
    batchBar.style.display = qaqWordEntrySelectMode ? 'flex' : 'none';

    if (!items.length) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }
    emptyEl.style.display = 'none';

    // ★ 限制首屏渲染
    var MAX_RENDER = 50;
    var renderItems = items.slice(0, MAX_RENDER);

    var frag = document.createDocumentFragment();

    renderItems.forEach(function (item) {
        var selected = qaqSelectedWordIds.indexOf(item.id) > -1;
        var div = document.createElement('div');
        div.className = 'qaq-word-entry-card' + (selected ? ' qaq-card-selected' : '');
        div.dataset.wordId = item.id;

        if (qaqWordEntrySelectMode) {
            div.innerHTML =
                '<div class="qaq-word-entry-card-top">' +
                '<div class="qaq-select-check' + (selected ? ' qaq-select-check-on' : '') + '"></div>' +
                '<div class="qaq-word-entry-main">' +
                '<div class="qaq-word-entry-word">' + item.word + '</div>' +
                '<div class="qaq-word-entry-meaning">' + item.meaning + '</div>' +
                '</div></div>';
        } else {
            div.innerHTML =
                '<div class="qaq-word-entry-main">' +
                '<div class="qaq-word-entry-word">' + item.word + '</div>' +
                '<div class="qaq-word-entry-meaning">' + item.meaning + '</div>' +
                '</div><div class="qaq-word-entry-actions">' +
                '<button class="qaq-word-entry-btn qaq-word-entry-btn-edit" data-id="' + item.id + '">✎</button>' +
                '<button class="qaq-word-entry-btn qaq-word-entry-btn-del" data-id="' + item.id + '">✕</button>' +
                '</div>';
        }
        frag.appendChild(div);
    });

    listEl.innerHTML = '';
    listEl.appendChild(frag);

    // ★ 如果有更多数据，滚动时懒加载
    if (items.length > MAX_RENDER) {
        var sentinel = document.createElement('div');
        sentinel.className = 'qaq-wordbank-empty';
        sentinel.textContent = '下滑加载更多（共 ' + items.length + ' 条）';
        sentinel.style.padding = '20px';
        listEl.appendChild(sentinel);

        var loaded = MAX_RENDER;
        var scrollParent = listEl.closest('.qaq-wordbook-detail-content');
        if (scrollParent) {
            var loadMoreHandler = qaqThrottle(function () {
                if (loaded >= items.length) return;
                var rect = sentinel.getBoundingClientRect();
                var parentRect = scrollParent.getBoundingClientRect();
                if (rect.top< parentRect.bottom + 200) {
                    var batch = items.slice(loaded, loaded + 30);
                    var bFrag = document.createDocumentFragment();
                    batch.forEach(function (item) {
                        var div = document.createElement('div');
                        div.className = 'qaq-word-entry-card';
                        div.dataset.wordId = item.id;
                        div.innerHTML =
                            '<div class="qaq-word-entry-main">' +
                            '<div class="qaq-word-entry-word">' + item.word + '</div>' +
                            '<div class="qaq-word-entry-meaning">' + item.meaning + '</div>' +
                            '</div><div class="qaq-word-entry-actions">' +
                            '<button class="qaq-word-entry-btn qaq-word-entry-btn-edit" data-id="' + item.id + '">✎</button>' +
                            '<button class="qaq-word-entry-btn qaq-word-entry-btn-del" data-id="' + item.id + '">✕</button>' +
                            '</div>';
                        bFrag.appendChild(div);
                    });
                    listEl.insertBefore(bFrag, sentinel);
                    loaded += batch.length;
                    if (loaded >= items.length) sentinel.remove();
                }
            }, 150);
            scrollParent._qaqLoadMore = loadMoreHandler;
            scrollParent.addEventListener('scroll', loadMoreHandler);
        }
    }
}

// ===== 3. 事件委托优化 =====
// 替代给每个卡片单独绑事件，改用父级委托

// 词库首页点击委托
document.getElementById('qaq-wordbook-list').addEventListener('click', function (e) {
    var card = e.target.closest('.qaq-wordbook-card');
    if (!card) return;
    var bookId = card.dataset.bookId;
    if (!bookId) return;

    if (qaqWordbookSelectMode) {
        qaqToggleInArray(qaqSelectedWordbookIds, bookId);
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    } else {
        qaqOpenWordbookDetail(bookId);
    }
});

// ===== 4. 防抖渲染：合并多次渲染请求 =====
var _qaqPendingRenders = {};

function qaqScheduleRender(key, fn, delay) {
    clearTimeout(_qaqPendingRenders[key]);
    _qaqPendingRenders[key] = setTimeout(fn, delay || 50);
}

// ===== 5. 计划卡片渲染优化 =====
// 替换 qaqRenderPlanCards中构建卡片的方式

function qaqRenderPlanCards() {
    var container = document.getElementById('qaq-plan-card-list');
    var rawItems = qaqGetDayPlans(qaqPlanSelectedDate);

    if (!rawItems.length) {
        container.innerHTML =
            '<div class="qaq-plan-empty"><div>' +
            qaqFormatDate(qaqPlanSelectedDate) +
            '暂无计划</div></div>';
        return;
    }

    // 排序
    var items = rawItems.slice().sort(function (a, b) {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });

    // 分组
    var catMap = {};
    var catOrder = [];
    items.forEach(function (item) {
        var cat = item.category || '未分类';
        if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat); }
        catMap[cat].push(item);
    });

    //★ 用 Fragment 一次性插入
    var frag = document.createDocumentFragment();

    catOrder.forEach(function (cat) {
        var catItems = catMap[cat];
        var catColor = qaqCategoryColor(cat);
        var catDone = catItems.filter(function (x) { return x.done; }).length;

        var group = document.createElement('div');
        group.className = 'qaq-category-group';

        var header = document.createElement('div');
        header.className = 'qaq-category-header';
        header.innerHTML =
            '<div class="qaq-category-color-dot" style="background:' + catColor + '"></div>' +
            '<span class="qaq-category-name">' + cat + '</span>' +
            '<span class="qaq-category-count">' + catDone + '/' + catItems.length + '</span>';

        var body = document.createElement('div');
        body.className = 'qaq-category-body';

        catItems.forEach(function (item) {
            var card = document.createElement('div');
            card.className = 'qaq-plan-card' + (item.done ? ' qaq-plan-card-done' : '');
            card.dataset.planId = item.id;

            card.innerHTML =
                '<div class="qaq-plan-card-color" style="background:' + (item.color || '#deb3be') + '"></div>' +
                '<div class="qaq-plan-card-body">' +
                '<div class="qaq-plan-card-name">' + item.name + '</div>' +
                (item.desc ? '<div class="qaq-plan-card-desc">' + item.desc + '</div>' : '') +
                '</div>' +
                '<div class="qaq-plan-card-actions">' +
                '<button class="qaq-plan-card-check" data-plan-id="' + item.id + '">' +
                (item.done ? '✓' : '') + '</button>' +
                '<button class="qaq-plan-card-del" data-plan-id="' + item.id + '">✕</button>' +
                '</div>';

            body.appendChild(card);
        });

        header.addEventListener('click', function () {
            this.classList.toggle('qaq-collapsed');
            body.classList.toggle('qaq-cat-hidden');
        });

        group.appendChild(header);
        group.appendChild(body);
        frag.appendChild(group);
    });

    container.innerHTML = '';
    container.appendChild(frag);

    // ★ 事件委托替代逐个绑定
    container.onclick = function (e) {
        var checkBtn = e.target.closest('.qaq-plan-card-check');
        if (checkBtn) {
            e.stopPropagation();
            var id = checkBtn.dataset.planId;
            var dayItems = qaqGetDayPlans(qaqPlanSelectedDate);
            var hit = dayItems.find(function (x) { return x.id === id; });
            if (hit) {
                hit.done = !hit.done;
                qaqSaveDayPlans(qaqPlanSelectedDate, dayItems);qaqScheduleRender('planCards', qaqRenderPlanCards, 50);
                qaqScheduleRender('widgetPlans', qaqRenderWidgetPlans, 100);
            }
            return;
        }

        var delBtn = e.target.closest('.qaq-plan-card-del');
        if (delBtn) {
            e.stopPropagation();
            var id2 = delBtn.dataset.planId;
            qaqConfirm('删除计划', '确认删除？', function () {
                var dayItems2 = qaqGetDayPlans(qaqPlanSelectedDate);
                var idx = dayItems2.findIndex(function (x) { return x.id === id2; });
                if (idx > -1) {
                    dayItems2.splice(idx, 1);
                    qaqSaveDayPlans(qaqPlanSelectedDate, dayItems2);
                    qaqScheduleRender('planCards', qaqRenderPlanCards, 230);
                    qaqScheduleRender('widgetPlans', qaqRenderWidgetPlans, 280);
                }
            });
            return;
        }

        var card = e.target.closest('.qaq-plan-card');
        if (card && card.dataset.planId) {
            qaqEditPlan(qaqPlanSelectedDate, card.dataset.planId);
        }
    };
}

// ===== 6. SVG 缓存 =====
// 避免每次渲染都重新拼接 SVG 字符串

var _qaqSvgCache = {};

function qaqCachedPlantSVG(id, scale) {
    var key = id + '_' + scale;
    if (_qaqSvgCache[key]) return _qaqSvgCache[key];
    var fn = qaqPlantSVGs[id];
    if (!fn) return '';
    var svg = fn(scale);
    _qaqSvgCache[key] = svg;
    return svg;
}

function qaqCachedAnimalSVG(id, scale) {
    var key = id + '_' + scale;
    if (_qaqSvgCache[key]) return _qaqSvgCache[key];
    var fn = qaqAnimalSVGs[id];
    if (!fn) return '';
    var svg = fn(scale);
    _qaqSvgCache[key] = svg;
    return svg;
}

// ===== 7. 页面切换优化 =====
// 关闭页面时延迟清理而非立即渲染

function qaqClosePage(pageEl) {
    if (!pageEl || qaqPageLock) return;

    qaqPageLock = true;
    pageEl.classList.remove('qaq-page-show');

    clearTimeout(qaqSwitchTimer);
    qaqSwitchTimer = setTimeout(function () {
        qaqPageLock = false;
    }, 200);//★ 不再设置 qaq-page-switching class，减少重绘
}

function qaqSwitchTo(pageEl) {
    if (!pageEl) return;
    if (qaqPageLock) {
        clearTimeout(qaqSwitchTimer);
        qaqPageLock = false;
    }
    if (pageEl.classList.contains('qaq-page-show')) return;

    qaqPageLock = true;

    // ★ 直接添加 class，不做额外的 z-index 比较
    requestAnimationFrame(function () {
        pageEl.classList.add('qaq-page-show');
        clearTimeout(qaqSwitchTimer);
        qaqSwitchTimer = setTimeout(function () {
            qaqPageLock = false;
        }, 200);
    });
}
/* ===== 词库首页渲染 ===== */

function qaqEditWordbookMeta(bookId) {
    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === bookId; });
    if (!book) return;

    var currentColor = book.color || '#5b9bd5';

    var colorsHtml = '';
    qaqPlanColors.forEach(function (c) {
        colorsHtml += '<div class="qaq-plan-color-option' +
            (c.toLowerCase() === currentColor.toLowerCase() ? ' qaq-color-selected' : '') +
            '" data-color="' + c + '" style="background:' + c + ';"></div>';
    });
    colorsHtml += '<div class="qaq-color-custom-btn" id="qaq-wordbook-color-custom"' +
        (!qaqPlanColors.includes(currentColor) ? ' style="background:' + currentColor + ';"' : '') +
        '></div>';

    modalTitle.textContent = '编辑词库';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">词库名称</div>' +
            '<input class="qaq-plan-form-input" id="qaq-wordbook-edit-name" type="text" value="' + (book.name || '').replace(/"/g, '&quot;') + '">' +
            '<div class="qaq-plan-form-label">词库颜色</div>' +
            '<div class="qaq-plan-color-picker" id="qaq-wordbook-edit-colors">' + colorsHtml + '</div>' +
            '<div class="qaq-color-panel" id="qaq-wordbook-color-panel"></div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

    qaqOpenModal();

    var selectedColor = currentColor;
    var picker = document.getElementById('qaq-wordbook-edit-colors');
    var panel = document.getElementById('qaq-wordbook-color-panel');
    var customBtn = document.getElementById('qaq-wordbook-color-custom');

    picker.addEventListener('click', function (e) {
        var option = e.target.closest('.qaq-plan-color-option');
        if (option) {
            picker.querySelectorAll('.qaq-plan-color-option').forEach(function (el) {
                el.classList.remove('qaq-color-selected');
            });
            customBtn.classList.remove('qaq-color-selected');
            option.classList.add('qaq-color-selected');
            selectedColor = option.dataset.color;
            panel.classList.remove('qaq-color-panel-show');
            return;
        }

        if (e.target.closest('.qaq-color-custom-btn')) {
            picker.querySelectorAll('.qaq-plan-color-option').forEach(function (el) {
                el.classList.remove('qaq-color-selected');
            });
            customBtn.classList.add('qaq-color-selected');

            if (panel.classList.contains('qaq-color-panel-show')) {
                panel.classList.remove('qaq-color-panel-show');
            } else {
                panel.classList.add('qaq-color-panel-show');
                qaqCreateColorPicker(panel, selectedColor, function (hex) {
                    selectedColor = hex;
                    customBtn.style.background = hex;
                    panel.classList.remove('qaq-color-panel-show');
                }, function () {
                    panel.classList.remove('qaq-color-panel-show');
                    customBtn.classList.remove('qaq-color-selected');
                });
            }
        }
    });

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
        var newName = document.getElementById('qaq-wordbook-edit-name').value.trim();
        if (!newName) return qaqToast('请输入词库名称');

        book.name = newName;
        book.color = selectedColor;

        qaqSaveWordbooks(books);
        qaqCloseModal();

        document.getElementById('qaq-wordbook-detail-title').textContent = newName;
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        if (qaqCurrentWordbookId) {
            qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
        }

        qaqToast('词库已更新');
    };
}

document.getElementById('qaq-wordbook-more-btn').addEventListener('click', function () {
    if (!qaqCurrentWordbookId) return;
    qaqEditWordbookMeta(qaqCurrentWordbookId);
});

/* ===== 词库详情渲染 ===== */

document.getElementById('qaq-wordbook-detail-list').addEventListener('click', function (e) {
    if (!qaqCurrentWordbookId) return;

    var editBtn = e.target.closest('.qaq-word-entry-btn-edit');
    if (editBtn) {
        e.stopPropagation();
        qaqEditWordEntry(qaqCurrentWordbookId, editBtn.dataset.id);
        return;
    }

    var delBtn = e.target.closest('.qaq-word-entry-btn-del');
    if (delBtn) {
        e.stopPropagation();
        qaqDeleteWordEntry(qaqCurrentWordbookId, delBtn.dataset.id);
        return;
    }

    if (qaqWordEntrySelectMode) {
        var card = e.target.closest('.qaq-word-entry-card');
        if (!card) return;

        var wordId = card.dataset.wordId;
        if (!wordId) return;

        qaqToggleInArray(qaqSelectedWordIds, wordId);
        qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    }
});

/* ===== 词库首页：选择模式 ===== */
document.getElementById('qaq-wordbank-select-btn').addEventListener('click', function () {
    qaqWordbookSelectMode = !qaqWordbookSelectMode;
    if (!qaqWordbookSelectMode) qaqSelectedWordbookIds = [];
    qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
});

document.getElementById('qaq-wordbook-batch-cancel-btn').addEventListener('click', function () {
    qaqWordbookSelectMode = false;
    qaqSelectedWordbookIds = [];
    qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
});

document.getElementById('qaq-wordbook-select-all-btn').addEventListener('click', function () {
    var books = qaqGetWordbooks();
    var kw = document.getElementById('qaq-wordbook-search').value.trim().toLowerCase();

    if (kw) {
        books = books.filter(function (book) {
            return (book.name || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    if (qaqSelectedWordbookIds.length === books.length) {
        qaqSelectedWordbookIds = [];
    } else {
        qaqSelectedWordbookIds = books.map(function (b) { return b.id; });
    }

    qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
});

document.getElementById('qaq-wordbook-batch-export-btn').addEventListener('click', function () {
    qaqExportSelectedWordbooks(qaqSelectedWordbookIds);
});

document.getElementById('qaq-wordbook-batch-delete-btn').addEventListener('click', function () {
    if (!qaqSelectedWordbookIds.length) return qaqToast('请先选择词库');

    qaqConfirm('删除词库', '确认删除所选词库吗？', function () {
        var books = qaqGetWordbooks().filter(function (b) {
            return qaqSelectedWordbookIds.indexOf(b.id) === -1;
        });
        qaqSaveWordbooks(books);
        var count = qaqSelectedWordbookIds.length;
        qaqSelectedWordbookIds = [];
        qaqWordbookSelectMode = false;
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        qaqToast('已删除 ' + count + ' 本词库');
    });
});

/* ===== 词条详情：选择模式 ===== */
document.getElementById('qaq-word-entry-select-btn').addEventListener('click', function () {
    qaqWordEntrySelectMode = !qaqWordEntrySelectMode;
    if (!qaqWordEntrySelectMode) qaqSelectedWordIds = [];
    if (qaqCurrentWordbookId) {
        qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    }
});

document.getElementById('qaq-word-entry-batch-cancel-btn').addEventListener('click', function () {
    qaqWordEntrySelectMode = false;
    qaqSelectedWordIds = [];
    if (qaqCurrentWordbookId) {
        qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    }
});

document.getElementById('qaq-word-entry-select-all-btn').addEventListener('click', function () {
    if (!qaqCurrentWordbookId) return;

    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === qaqCurrentWordbookId; });
    if (!book) return;

    var items = (book.words || []).slice();
    var kw = document.getElementById('qaq-wordbook-detail-search').value.trim().toLowerCase();

    if (kw) {
        items = items.filter(function (item) {
            return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                   (item.meaning || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    if (qaqSelectedWordIds.length === items.length) {
        qaqSelectedWordIds = [];
    } else {
        qaqSelectedWordIds = items.map(function (w) { return w.id; });
    }

    qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
});

document.getElementById('qaq-word-entry-batch-delete-btn').addEventListener('click', function () {
    if (!qaqCurrentWordbookId) return;
    if (!qaqSelectedWordIds.length) return qaqToast('请先选择词条');

    qaqConfirm('删除词条', '确认删除所选词条吗？', function () {
        var books = qaqGetWordbooks();
        var book = books.find(function (b) { return b.id === qaqCurrentWordbookId; });
        if (!book) return;

        book.words = (book.words || []).filter(function (w) {
            return qaqSelectedWordIds.indexOf(w.id) === -1;
        });

        var count = qaqSelectedWordIds.length;
        qaqSaveWordbooks(books);
        qaqSelectedWordIds = [];
        qaqWordEntrySelectMode = false;

        // ★ 延迟渲染
        setTimeout(function () {
            qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
            qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        }, 230);
        qaqToast('已删除 ' + count + ' 条词条');
    });
});

/* ===== 词条增删改 ===== */
function qaqEditWordEntry(bookId, wordId) {
    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === bookId; });
    if (!book) return;

    var item = (book.words || []).find(function (w) { return w.id === wordId; });
    if (!item) return;

    modalTitle.textContent = '编辑词条';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">单词</div>' +
            '<input class="qaq-plan-form-input" id="qaq-word-entry-word" type="text" value="' + String(item.word).replace(/"/g, '&quot;') + '">' +
            '<div class="qaq-plan-form-label">释义</div>' +
            '<textarea class="qaq-plan-form-textarea" id="qaq-word-entry-meaning">' + item.meaning + '</textarea>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
    var newWord = document.getElementById('qaq-word-entry-word').value.trim();
    var newMeaning = document.getElementById('qaq-word-entry-meaning').value.trim();
    if (!newWord || !newMeaning) return qaqToast('请填写完整');

    item.word = newWord;
    item.meaning = newMeaning;
    qaqSaveWordbooks(books);
    qaqCloseModal();
    qaqRenderWordbookDetail(bookId, document.getElementById('qaq-wordbook-detail-search').value);
    // ★ 首页延迟渲染，不阻塞弹窗关闭动画
    setTimeout(function () {
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    }, 280);
    qaqToast('已保存');
};
}

function qaqDeleteWordEntry(bookId, wordId) {
    qaqConfirm('删除词条', '确认删除这条词条吗？', function () {
        var books = qaqGetWordbooks();
        var book = books.find(function (b) { return b.id === bookId; });
        if (!book) return;

        var idx = (book.words || []).findIndex(function (w) { return w.id === wordId; });
        if (idx > -1) {
            book.words.splice(idx, 1);
            qaqSaveWordbooks(books);
            // ★ 只渲染当前详情页，首页延迟渲染
            qaqRenderWordbookDetail(bookId, document.getElementById('qaq-wordbook-detail-search').value);
            qaqToast('已删除');
        }
    });
}

function qaqAddWordEntryToCurrentBook() {
    if (!qaqCurrentWordbookId) return;

    modalTitle.textContent = '新增词条';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">单词</div>' +
            '<input class="qaq-plan-form-input" id="qaq-word-entry-word" type="text" placeholder="输入单词">' +
            '<div class="qaq-plan-form-label">释义</div>' +
            '<textarea class="qaq-plan-form-textarea" id="qaq-word-entry-meaning" placeholder="输入释义"></textarea>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">添加</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
    var newWord = document.getElementById('qaq-word-entry-word').value.trim();
    var newMeaning = document.getElementById('qaq-word-entry-meaning').value.trim();
    if (!newWord || !newMeaning) return qaqToast('请填写完整');

    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === qaqCurrentWordbookId; });
    if (!book) return;

    book.words.unshift({
        id: qaqWordId(),
        word: newWord,
        meaning: newMeaning,
        phonetic: '',
        example: '',
        exampleCn: ''
    });

    qaqSaveWordbooks(books);
    qaqCloseModal();
    // ★ 先渲染当前页，首页异步
    qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    setTimeout(function () {
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    }, 280);
    qaqToast('已添加');
};
}

/* ===== 导入 ===== */
function qaqImportWordbankJson(file) {
    return new Promise(function (resolve, reject) {
        qaqShowImportProgress('正在导入 JSON', '正在读取文件…');

        var reader = new FileReader();
        qaqImportCtrl.activeReader = reader;
        qaqImportCtrl.busy = true;

        reader.onprogress = function (e) {
            if (qaqIsImportCancelled()) return;
            if (e.lengthComputable) {
                var percent = Math.round((e.loaded / e.total) * 80);
                qaqUpdateImportProgress(percent, '正在读取 JSON…');
            }
        };

        reader.onload = function (e) {
            try {
                qaqRequireImportNotCancelled();

                qaqUpdateImportProgress(90, '正在解析 JSON…');
                var data = JSON.parse(e.target.result);

                var out;
                if (Array.isArray(data)) out = data;
                else if (data && Array.isArray(data.items)) out = data.items;
                else throw new Error('JSON 格式不正确');

                qaqUpdateImportProgress(100, '解析完成');
                qaqImportCtrl.busy = false;
                qaqImportCtrl.activeReader = null;
                setTimeout(qaqHideImportProgress, 180);
                resolve(out);
            } catch (err) {
                qaqImportCtrl.busy = false;
                qaqImportCtrl.activeReader = null;
                qaqHideImportProgress();
                reject(err);
            }
        };

        reader.onerror = function (err) {
            qaqImportCtrl.busy = false;
            qaqImportCtrl.activeReader = null;
            qaqHideImportProgress();
            reject(err);
        };

        reader.onabort = function () {
            qaqImportCtrl.busy = false;
            qaqImportCtrl.activeReader = null;
            reject(new Error('__QAQ_IMPORT_CANCELLED__'));
        };

        reader.readAsText(file, 'utf-8');
    });
}

function qaqImportWordbankExcel(file) {
    return new Promise(function (resolve, reject) {
        qaqShowImportProgress('正在导入 Excel', '正在读取文件…');

        var reader = new FileReader();
        qaqImportCtrl.activeReader = reader;
        qaqImportCtrl.busy = true;

        reader.onprogress = function (e) {
            if (qaqIsImportCancelled()) return;
            if (e.lengthComputable) {
                var percent = Math.round((e.loaded / e.total) * 60);
                qaqUpdateImportProgress(percent, '正在读取 Excel…');
            }
        };

        reader.onload = function (e) {
            try {
                qaqRequireImportNotCancelled();

                qaqUpdateImportProgress(70, '正在解析工作表…');

                var workbook = XLSX.read(e.target.result, { type: 'array' });
                var result = [];
                var totalSheets = workbook.SheetNames.length || 1;

                for (var i = 0; i < workbook.SheetNames.length; i++) {
                    qaqRequireImportNotCancelled();

                    var sheetName = workbook.SheetNames[i];
                    var sheet = workbook.Sheets[sheetName];
                    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    // 跳过明显无效 sheet
                    var nonEmptyRows = qaqGetNonEmptyRows(rows);
                    var nonEmptyCellCount = nonEmptyRows.reduce(function (sum, row) {
                        return sum + row.filter(function (cell) {
                            return String(cell || '').trim();
                        }).length;
                    }, 0);

                    if (nonEmptyRows.length < 2 || nonEmptyCellCount < 6) {
                        var skipP = 70 + Math.round(((i + 1) / totalSheets) * 25);
                        qaqUpdateImportProgress(skipP, '跳过空工作表：' + sheetName);
                        continue;
                    }
                    var parsed = qaqParseExcelRowsToWordbank(rows, sheetName);
                    

                    result = result.concat(parsed);

                    var p = 70 + Math.round(((i + 1) / totalSheets) * 25);
                    qaqUpdateImportProgress(p, '正在解析工作表：' + sheetName);
                }

                result = qaqDedupeWordItems(result);

                qaqUpdateImportProgress(100, '解析完成');
                qaqImportCtrl.busy = false;
                qaqImportCtrl.activeReader = null;
                setTimeout(qaqHideImportProgress, 180);
                resolve(result);
            } catch (err) {
                qaqImportCtrl.busy = false;
                qaqImportCtrl.activeReader = null;
                qaqHideImportProgress();
                reject(err);
            }
        };

        reader.onerror = function (err) {
            qaqImportCtrl.busy = false;
            qaqImportCtrl.activeReader = null;
            qaqHideImportProgress();
            reject(err);
        };

        reader.onabort = function () {
            qaqImportCtrl.busy = false;
            qaqImportCtrl.activeReader = null;
            reject(new Error('__QAQ_IMPORT_CANCELLED__'));
        };

        reader.readAsArrayBuffer(file);
    });
}

    
function qaqGetNonEmptyRows(rows) {
    return (rows || []).filter(function (row) {
        return row && row.some(function (cell) {
            return String(cell || '').trim();
        });
    });
}

function qaqGetUsefulRowsForGuess(rows) {
    return qaqGetNonEmptyRows(rows).filter(function (row) {
        var count = row.filter(function (cell) {
            return String(cell || '').trim();
        }).length;
        return count >= 2;
    });
}

function qaqIsMostlyEnglish(text) {
    text = String(text || '').trim();
    if (!text) return false;
    return /^[A-Za-z][A-Za-z\s\-'\.\/()]{0,60}$/.test(text);
}

function qaqIsMostlyChinese(text) {
    text = String(text || '').trim();
    if (!text) return false;
    return /[\u4e00-\u9fa5]/.test(text);
}

function qaqCellScoreAsWord(text) {
    text = String(text || '').trim();
    if (!text) return 0;

    var score = 0;
    if (qaqIsMostlyEnglish(text)) score += 3;
    if (/^[A-Za-z\-'\.]+$/.test(text)) score += 2;
    if (text.split(/\s+/).length <= 3) score += 1;
    if (text.length >= 2 && text.length <= 30) score += 1;
    if (/[0-9]/.test(text)) score -= 1;
    if (/[\u4e00-\u9fa5]/.test(text)) score -= 3;

    return score;
}

function qaqCellScoreAsMeaning(text) {
    text = String(text || '').trim();
    if (!text) return 0;

    var score = 0;
    if (qaqIsMostlyChinese(text)) score += 3;
    if (/[\u4e00-\u9fa5]/.test(text)) score += 2;
    if (text.length >= 1 && text.length <= 80) score += 1;
    if (/^[，。；、：,.、\s\u4e00-\u9fa5a-zA-Z0-9\.]+$/.test(text)) score += 1;
    if (/^[A-Za-z\-'\.]+$/.test(text)) score -= 2;

    return score;
}

function qaqGuessHeaderMap(row) {
    function norm(v) {
        return String(v || '').trim().toLowerCase();
    }

    var map = {};
    row.forEach(function (cell, idx) {
        var key = norm(cell);

        if (/^(word|term|vocab|单词|英文|英文单词|外语|词汇)$/.test(key)) map.word = idx;
        if (/^(meaning|translation|chinese|中文|释义|词义|中文解释|解释|含义)$/.test(key)) map.meaning = idx;
        if (/^(phonetic|音标|英音|美音)$/.test(key)) map.phonetic = idx;
        if (/^(example|sentence|例句|例句1|例句一)$/.test(key)) map.example = idx;
        if (/^(examplecn|sentencecn|例句翻译|例句中文|例句释义)$/.test(key)) map.exampleCn = idx;
    });

    return map;
}

function qaqLooksLikeHeader(row) {
    var map = qaqGuessHeaderMap(row || []);
    return map.word != null || map.meaning != null || map.phonetic != null || map.example != null;
}

function qaqDetectWordMeaningColumns(rows) {
    var sampleRows = qaqGetUsefulRowsForGuess(rows).slice(0, 50);
    var maxCols = 0;

    sampleRows.forEach(function (row) {
        if (row && row.length > maxCols) maxCols = row.length;
    });

    if (maxCols === 0) {
        return { word: -1, meaning: -1 };
    }

    var wordScores = new Array(maxCols).fill(0);
    var meaningScores = new Array(maxCols).fill(0);

    sampleRows.forEach(function (row) {
        if (!row) return;
        for (var i = 0; i < maxCols; i++) {
            var cell = row[i] || '';
            wordScores[i] += qaqCellScoreAsWord(cell);
            meaningScores[i] += qaqCellScoreAsMeaning(cell);
        }
    });

    var wordIdx = -1;
    var meaningIdx = -1;
    var bestWord = -Infinity;
    var bestMeaning = -Infinity;

    for (var j = 0; j < maxCols; j++) {
        if (wordScores[j] > bestWord) {
            bestWord = wordScores[j];
            wordIdx = j;
        }
    }

    for (var k = 0; k < maxCols; k++) {
        if (k === wordIdx) continue;
        if (meaningScores[k] > bestMeaning) {
            bestMeaning = meaningScores[k];
            meaningIdx = k;
        }
    }

    if (wordIdx === -1 || meaningIdx === -1) {
        if (maxCols >= 2) {
            wordIdx = 0;
            meaningIdx = 1;
        }
    }

    return {
        word: wordIdx,
        meaning: meaningIdx
    };
}

function qaqFindExtraColumn(rows, usedIndexes, type) {
    var sampleRows = qaqGetUsefulRowsForGuess(rows).slice(0, 50);
    var maxCols = 0;

    sampleRows.forEach(function (row) {
        if (row && row.length > maxCols) maxCols = row.length;
    });

    var bestIdx = -1;
    var bestScore = 0;

    for (var i = 0; i < maxCols; i++) {
        if (usedIndexes.indexOf(i) > -1) continue;

        var score = 0;
        sampleRows.forEach(function (row) {
            if (!row) return;
            var text = String(row[i] || '').trim();
            if (!text) return;

            if (type === 'phonetic') {
                if (/[/\[\]əɪʊɔæθðʃʒŋˈˌ]/.test(text)) score += 3;
                if (text.length <= 30) score += 1;
            } else if (type === 'example') {
                if (/[A-Za-z]/.test(text) && /\s/.test(text)) score += 2;
                if (text.length >= 8) score += 1;
            } else if (type === 'exampleCn') {
                if (/[\u4e00-\u9fa5]/.test(text) && text.length >= 4) score += 2;
            }
        });

        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }

    return bestIdx;
}

function qaqParseExcelStructuredRows(rows, sheetName) {
    if (!rows || !rows.length) return [];

    var result = [];
    var startRow = 0;
    var map = {};
    var cleanRows = qaqGetNonEmptyRows(rows);

    if (!cleanRows.length) return [];

    var firstRow = cleanRows[0] || [];
    if (qaqLooksLikeHeader(firstRow)) {
        map = qaqGuessHeaderMap(firstRow);
        startRow = rows.indexOf(firstRow) + 1;
    } else {
        var detected = qaqDetectWordMeaningColumns(cleanRows);
        map.word = detected.word;
        map.meaning = detected.meaning;

        var used = [map.word, map.meaning].filter(function (x) {
            return x != null && x > -1;
        });

        var phoneticIdx = qaqFindExtraColumn(cleanRows, used, 'phonetic');
        if (phoneticIdx > -1) {
            map.phonetic = phoneticIdx;
            used.push(phoneticIdx);
        }

        var exampleIdx = qaqFindExtraColumn(cleanRows, used, 'example');
        if (exampleIdx > -1) {
            map.example = exampleIdx;
            used.push(exampleIdx);
        }

        var exampleCnIdx = qaqFindExtraColumn(cleanRows, used, 'exampleCn');
        if (exampleCnIdx > -1) {
            map.exampleCn = exampleCnIdx;
        }
    }

    if (map.word == null || map.meaning == null || map.word < 0 || map.meaning < 0) {
        return [];
    }

    for (var i = startRow; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row.length) continue;

        var word = qaqTrim(row[map.word] || '');
        var meaning = qaqTrim(row[map.meaning] || '');
        var phonetic = map.phonetic != null ? qaqTrim(row[map.phonetic] || '') : '';
        var example = map.example != null ? qaqTrim(row[map.example] || '') : '';
        var exampleCn = map.exampleCn != null ? qaqTrim(row[map.exampleCn] || '') : '';

        // 只跳过完全空行和纯表头行
        if (!word && !meaning && !phonetic && !example && !exampleCn) continue;
        if (qaqLooksLikeWordHeader(word) && qaqLooksLikeMeaningHeader(meaning)) continue;

        result.push({
            word: word,
            meaning: meaning,
            phonetic: phonetic,
            example: example,
            exampleCn: exampleCn,
            book: sheetName
        });
    }

    return result;
}

function qaqParseExcelFixedColumns(rows, sheetName) {
    if (!rows || !rows.length) return [];

    var result = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row || row.length < 2) continue;

        var c0 = qaqTrim(row[0] || '');
        var c1 = qaqTrim(row[1] || '');
        var c2 = qaqTrim(row[2] || '');

        if (qaqLooksLikeWordHeader(c0) && qaqLooksLikeMeaningHeader(c1)) continue;
        if (qaqLooksLikeWordHeader(c1) && qaqLooksLikeMeaningHeader(c2)) continue;

        if (/^\d+$/.test(c0) && qaqLooksLikeEnglishWord(c1) && qaqLooksLikeChineseMeaning(c2)) {
            result.push({ word: c1, meaning: c2, book: sheetName });
            continue;
        }

        if (qaqLooksLikeEnglishWord(c0) && qaqLooksLikeChineseMeaning(c1)) {
            result.push({ word: c0, meaning: c1, book: sheetName });
            continue;
        }

        if (qaqLooksLikeEnglishWord(c1) && qaqLooksLikeChineseMeaning(c2)) {
            result.push({ word: c1, meaning: c2, book: sheetName });
            continue;
        }

        if (qaqLooksLikeEnglishWord(c0) && qaqLooksLikeChineseMeaning(c2)) {
            result.push({ word: c0, meaning: c2, book: sheetName });
            continue;
        }
    }

    return result;
}

function qaqParseExcelFallbackByCells(rows, sheetName) {
    var cells = [];

    rows.forEach(function (row) {
        if (!row) return;
        row.forEach(function (cell) {
            var text = qaqTrim(cell || '');
            if (text) cells.push(text);
        });
    });

    var words = [];
    var meanings = [];
    var result = [];

    cells.forEach(function (text) {
        if (qaqLooksLikeNoiseLine(text)) return;
        if (qaqLooksLikeWordHeader(text) || qaqLooksLikeMeaningHeader(text)) return;
        if (qaqIsPureIndexLine(text)) return;

        if (qaqLooksLikeEnglishWord(text)) {
            words.push(text);
        } else {
            meanings.push(text);
        }
    });

    var len = Math.min(words.length, meanings.length);
    for (var i = 0; i < len; i++) {
        result.push({
            word: qaqTrim(words[i]),
            meaning: qaqTrim(meanings[i]),
            book: sheetName
        });
    }

    return result;
}

function qaqParseExcelRowsToWordbank(rows, sheetName) {
    if (!rows || !rows.length) return [];

    function evaluate(items) {
        var normalized = (items || [])
            .map(function (item) {
                return qaqNormalizeWordItem(item, sheetName);
            })
            .filter(function (item) {
                return item && (item.word || item.meaning);
            });

        var classified = qaqClassifyWordCandidates(normalized);

        return {
            raw: items || [],
            normalized: normalized,
            accepted: classified.accepted,
            rejected: classified.rejected
        };
    }

    var fixedEval = evaluate(qaqParseExcelFixedColumns(rows, sheetName));
    var structuredEval = evaluate(qaqParseExcelStructuredRows(rows, sheetName));
    var fallbackEval = evaluate(qaqParseExcelFallbackByCells(rows, sheetName));

    
    var best = fixedEval;
    if (structuredEval.accepted.length > best.accepted.length) best = structuredEval;
    if (fallbackEval.accepted.length > best.accepted.length) best = fallbackEval;

    // 如果 accepted 都很少，再尝试“宽松模式”
    if (best.accepted.length <= 2 && typeof qaqParseExcelLooseRows === 'function') {
        var looseEval = evaluate(qaqParseExcelLooseRows(rows, sheetName));
        
        if (looseEval.accepted.length > best.accepted.length) {
            best = looseEval;
        }
    }

    return best.raw || [];
}

async function qaqImportWordbankPdf(file) {
    qaqShowImportProgress('正在导入 PDF', '正在读取文件…');
    qaqImportCtrl.busy = true;

    var arrayBuffer = await file.arrayBuffer();
    qaqRequireImportNotCancelled();

    qaqUpdateImportProgress(2, '文件已读取，正在加载 PDF…');

    var loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    qaqImportCtrl.loadingTask = loadingTask;

    loadingTask.onProgress = function (progressData) {
        if (qaqIsImportCancelled()) return;
        if (!progressData || !progressData.total) return;
        var percent = Math.round((progressData.loaded / progressData.total) * 35);
        percent = Math.max(2, Math.min(35, percent));
        qaqUpdateImportProgress(percent, '正在加载 PDF…');
    };

    var pdf;
    try {
        pdf = await loadingTask.promise;
    } catch (err) {
        qaqImportCtrl.busy = false;
        qaqImportCtrl.loadingTask = null;
        if (qaqIsImportCancelled()) {
            throw new Error('__QAQ_IMPORT_CANCELLED__');
        }
        throw err;
    }

    qaqRequireImportNotCancelled();

    var lines = [];
    var totalPages = pdf.numPages || 1;

    qaqUpdateImportProgress(38, 'PDF 加载完成，准备解析页面…');

    for (var i = 1; i <= totalPages; i++) {
        qaqRequireImportNotCancelled();

        var page = await pdf.getPage(i);
        var textContent = await page.getTextContent();
        var pageText = textContent.items.map(function (it) { return it.str; }).join('\n');
        lines = lines.concat(pageText.split(/\n+/));

        var p = 40 + Math.round((i / totalPages) * 50);
        qaqUpdateImportProgress(p, '正在解析第 ' + i + ' / ' + totalPages + ' 页…');

        await qaqNextFrame();
    }

    qaqRequireImportNotCancelled();

    qaqUpdateImportProgress(93, '正在整理词条…');
    var parsed = await qaqParsePdfLinesToWordbankAsync(lines, file.name);

    qaqUpdateImportProgress(100, '解析完成');
    qaqImportCtrl.busy = false;
    qaqImportCtrl.loadingTask = null;
    setTimeout(qaqHideImportProgress, 220);

    return parsed;
}

function qaqNextFrame() {
    return new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
}

async function qaqParsePdfLinesToWordbankAsync(lines, bookName) {
    var words = [];
    var meaningBlocks = [];
    var result = [];

    lines = (lines || []).map(function (line) {
        return qaqTrim(line);
    }).filter(function (line) {
        return !qaqLooksLikeNoiseLine(line);
    });

    var total = lines.length || 1;

    // 先提取单词列
    for (var i = 0; i < lines.length; i++) {
        qaqRequireImportNotCancelled();

        var line = lines[i];
        if (!line) continue;
        if (qaqLooksLikeWordHeader(line)) continue;
        if (qaqLooksLikeMeaningHeader(line)) continue;
        if (qaqIsPureIndexLine(line)) continue;

        if (qaqLooksLikeEnglishWord(line)) {
            words.push(line);
        }

        if (i % 120 === 0) {
            var p1 = 93 + Math.round((i / total) * 2);
            qaqUpdateImportProgress(p1, '正在扫描单词…');
            await qaqNextFrame();
        }
    }

    // 再提取释义块
    var currentMeaning = '';

    for (var j = 0; j < lines.length; j++) {
        qaqRequireImportNotCancelled();

        var line2 = lines[j];
        if (!line2) continue;
        if (qaqLooksLikeWordHeader(line2)) continue;
        if (qaqLooksLikeMeaningHeader(line2)) continue;
        if (qaqIsPureIndexLine(line2)) continue;
        if (qaqLooksLikeEnglishWord(line2)) continue;

        if (qaqLooksLikePosLine(line2) || /[\u4e00-\u9fa5]/.test(line2)) {
            if (currentMeaning) {
                currentMeaning += ' ' + line2;
            } else {
                currentMeaning = line2;
            }

            if (/[\u4e00-\u9fa5]/.test(line2)) {
                meaningBlocks.push(qaqTrim(currentMeaning));
                currentMeaning = '';
            }
        }

        if (j % 120 === 0) {
            var p2 = 95 + Math.round((j / total) * 2);
            qaqUpdateImportProgress(p2, '正在整理释义…');
            await qaqNextFrame();
        }
    }

    if (currentMeaning) {
        meaningBlocks.push(qaqTrim(currentMeaning));
    }

    var len = Math.min(words.length, meaningBlocks.length);

    for (var k = 0; k < len; k++) {
        qaqRequireImportNotCancelled();

        var word = qaqTrim(words[k]);
        var meaning = qaqTrim(meaningBlocks[k]);

        // 这里只过滤完全空，其他交给 classify 处理
        if (!word && !meaning) continue;
        if (!meaning) continue;

        result.push({
            word: word,
            meaning: meaning,
            book: bookName
        });

        if (k % 80 === 0) {
            qaqUpdateImportProgress(97 + Math.round((k / len) * 2), '正在配对单词与释义…');
            await qaqNextFrame();
        }
    }

    return result;
}



/* ===== 导出 ===== */
function qaqExportWordbooks() {
    var data = qaqGetWordbooks();
    if (!data.length) return qaqToast('暂无词库');

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qaq-wordbooks.json';
    a.click();
    URL.revokeObjectURL(url);
    qaqToast('已导出 JSON');
}

function qaqExportSelectedWordbooks(ids) {
    var books = qaqGetWordbooks().filter(function (b) {
        return ids.indexOf(b.id) > -1;
    });
    if (!books.length) return qaqToast('请先选择词库');

    var blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qaq-wordbooks-selected.json';
    a.click();
    URL.revokeObjectURL(url);
    qaqToast('已导出所选词库');
}

/* ===== 事件绑定 ===== */
var qaqAppTapLock = false;

document.querySelectorAll('.qaq-app-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (qaqAppTapLock) return;
        qaqAppTapLock = true;

        var name = this.querySelector('.qaq-app-name').textContent;

        if (name === '今日计划') {
            qaqOpenPlanPage();
        } else if (name === '词库') {
            qaqOpenWordbankPage();
        } else {
            qaqToast(name);
        }

        setTimeout(function () {
            qaqAppTapLock = false;
        }, 350);
    });
});

document.getElementById('qaq-wordbank-back').addEventListener('click', function () {
    qaqCloseWordbankPage();
});

document.getElementById('qaq-wordbook-detail-back').addEventListener('click', function () {
    qaqCloseWordbookDetail();
});

document.querySelectorAll('.qaq-wordbank-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
        qaqSwitchWordbankTab(this.dataset.tab);
    });
});

document.getElementById('qaq-wordbook-search').addEventListener('input', qaqDebounce(function () {
    qaqRenderWordbookHome(this.value);
}, 160));

document.getElementById('qaq-wordbook-detail-search').addEventListener('input', qaqDebounce(function () {
    if (qaqCurrentWordbookId) {
        qaqRenderWordbookDetail(qaqCurrentWordbookId, this.value);
    }
}, 160));

document.getElementById('qaq-wordbook-add-word-btn').addEventListener('click', function () {
    qaqAddWordEntryToCurrentBook();
});

document.getElementById('qaq-wordbank-import-btn').addEventListener('click', function () {
    modalTitle.textContent = '导入词库';
    modalBody.innerHTML =
        '<div class="qaq-modal-upload-options">' +
            '<button class="qaq-modal-upload-btn" id="qaq-import-json-btn">导入 JSON</button>' +
            '<button class="qaq-modal-upload-btn" id="qaq-import-excel-btn">导入 Excel</button>' +
            '<button class="qaq-modal-upload-btn" id="qaq-import-pdf-btn">导入 PDF</button>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';

    qaqOpenModal();
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    document.getElementById('qaq-import-json-btn').onclick = function () {
        wordbankFileInput.accept = '.json';
        wordbankFileInput.click();
        qaqCloseModal();
    };

    document.getElementById('qaq-import-excel-btn').onclick = function () {
        wordbankFileInput.accept = '.xlsx,.xls';
        wordbankFileInput.click();
        qaqCloseModal();
    };

    document.getElementById('qaq-import-pdf-btn').onclick = function () {
        wordbankFileInput.accept = '.pdf';
        wordbankFileInput.click();
        qaqCloseModal();
    };
});

document.getElementById('qaq-wordbank-export-btn').addEventListener('click', function () {
    qaqExportWordbooks();
});

wordbankFileInput.addEventListener('change', async function () {
    if (!this.files || !this.files.length) return;

    try {
        for (var i = 0; i < this.files.length; i++) {
            var file = this.files[i];
            var lower = file.name.toLowerCase();
            var imported = [];

            if (lower.endsWith('.json')) {
                imported = await qaqImportWordbankJson(file);
            } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                imported = await qaqImportWordbankExcel(file);
            } else if (lower.endsWith('.pdf')) {
                imported = await qaqImportWordbankPdf(file);
            }

            if (!imported || !imported.length) {
                qaqToast('没有识别到有效词条');
                continue;
            }

            /* 如果 json 导入的是整本词库数组 */
            if (Array.isArray(imported) && imported.length && imported[0].words) {
                var books = qaqGetWordbooks();
                imported.forEach(function (book) {
                    books.unshift({
                        id: book.id || qaqWordbookId(),
                        name: book.name || '未命名词库',
                        importedAt: book.importedAt || Date.now(),
                        sourceName: book.sourceName || file.name,
                        words: (book.words || []).map(function (w) {
                            return {
                                id: w.id || qaqWordId(),
                                word: w.word || '',
                                meaning: w.meaning || '',
                                phonetic: w.phonetic || '',
                                example: w.example || '',
                                exampleCn: w.exampleCn || ''
                            };
                        }).filter(function (w) {
                            return String(w.word || '').trim() && String(w.meaning || '').trim();
                        })
                    });
                });
                qaqSaveWordbooks(books);
                qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
                qaqToast('导入成功');
                continue;
            }

            var normalized = imported
    .map(function (item) { return qaqNormalizeWordItem(item) || item; })
    .filter(function (item) {
        return item && (item.word || item.meaning);
    });

var classified = qaqClassifyWordCandidates(normalized);


if (!classified.accepted.length && !classified.rejected.length) {
    qaqToast('没有识别到有效词条');
    continue;
}

var bookName = file.name.replace(/\.(json|xlsx|xls|pdf)$/i, '');
qaqOpenWordbookImportReview(
    bookName,
    classified.accepted,
    classified.rejected,
    file.name
);
        }
    } catch (err) {
    console.error(err);

    if (qaqIsCancelError(err)) {
        qaqToast('已取消导入');
    } else {
        qaqToast('导入失败');
    }
}

    qaqImportCtrl.busy = false;
qaqImportCtrl.loadingTask = null;
qaqImportCtrl.activeReader = null;
qaqHideImportProgress();
this.value = '';
});

    /* ===== 今日计划系统 ===== */
    var qaqPlanColors = ['#e05565', '#e88d4f', '#e8c34f', '#7bab6e', '#5b9bd5', '#8b6cc1', '#c47068', '#999999'];
    /* ===== 分类系统 ===== */
var qaqDefaultCategories = [
    { name: '学习', color: '#5b9bd5' },
    { name: '生活', color: '#7bab6e' },
    { name: '运动', color: '#e88d4f' },
    { name: '工作', color: '#8b6cc1' },
    { name: '其他', color: '#999999' }
];

function qaqCategoryColor(catName) {
    var cats = qaqGetCategories();
    var found = cats.find(function (c) { return c.name === catName; });
    return found ? found.color : '#999';
}

/* 分类管理弹窗 */
function qaqOpenCatManage() {
    modalTitle.textContent = '分类管理';

    function buildColorRow(currentColor, idPrefix) {
        var html = '<div class="qaq-cat-color-row" id="' + idPrefix + '-colors">';
        var matchPreset = false;
        qaqPlanColors.forEach(function (c) {
            var sel = currentColor && currentColor.toLowerCase() === c.toLowerCase();
            if (sel) matchPreset = true;
            html += '<div class="qaq-cat-color-dot' + (sel ? ' qaq-cat-color-active' : '') + '" data-c="' + c + '" style="background:' + c + ';"></div>';
        });
        var customStyle = (!matchPreset && currentColor) ? 'background:' + currentColor + ';' : '';
        html += '<div class="qaq-cat-color-custom' + (!matchPreset && currentColor ? ' qaq-cat-color-active' : '') + '" id="' + idPrefix + '-custom"' + (customStyle ? ' style="' + customStyle + '"' : '') + '></div>';
        html += '</div>';
        html += '<div class="qaq-cat-color-panel" id="' + idPrefix + '-panel"></div>';
        return html;
    }

    function bindColorRow(idPrefix, initialColor, onColorChange) {
        var selectedColor = initialColor || qaqPlanColors[0];
        var row = document.getElementById(idPrefix + '-colors');
        var customBtn = document.getElementById(idPrefix + '-custom');
        var panel = document.getElementById(idPrefix + '-panel');

        row.addEventListener('click', function (e) {
            var dot = e.target.closest('.qaq-cat-color-dot');
            if (dot) {
                row.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
                customBtn.classList.remove('qaq-cat-color-active');
                dot.classList.add('qaq-cat-color-active');
                selectedColor = dot.dataset.c;
                panel.classList.remove('qaq-cat-color-panel-show');
                onColorChange(selectedColor);
                return;
            }

            if (e.target.closest('.qaq-cat-color-custom')) {
                row.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
                customBtn.classList.add('qaq-cat-color-active');

                if (panel.classList.contains('qaq-cat-color-panel-show')) {
                    panel.classList.remove('qaq-cat-color-panel-show');
                } else {
                    panel.classList.add('qaq-cat-color-panel-show');
                    qaqCreateColorPicker(panel, selectedColor, function (hex) {
                        selectedColor = hex;
                        customBtn.style.background = hex;
                        panel.classList.remove('qaq-cat-color-panel-show');
                        onColorChange(selectedColor);
                        qaqToast('颜色已选择');
                    }, function () {
                        panel.classList.remove('qaq-cat-color-panel-show');
                        customBtn.classList.remove('qaq-cat-color-active');
                    });
                }
            }
        });

        return function () { return selectedColor; };
    }

    function renderList() {
        var cats = qaqGetCategories();
        var html = '<div style="max-height:50vh;overflow-y:auto;" id="qaq-cat-manage-scroll">';

        cats.forEach(function (cat, idx) {
            html +=
                '<div class="qaq-cat-manage-item" data-cat-idx="' + idx + '">' +
                '<div class="qaq-cat-manage-dot" style="background:' + cat.color + ';" id="qaq-cat-dot-' + idx + '"></div>' +
                '<div class="qaq-cat-manage-name" id="qaq-cat-name-' + idx + '">' + cat.name + '</div>' +
                '<button class="qaq-cat-manage-edit" data-cat-idx="' + idx + '" title="编辑">✎</button>' +
                '<button class="qaq-cat-manage-del" data-cat-idx="' + idx + '">✕</button>' +
                '</div>' +
                '<div id="qaq-cat-edit-area-' + idx + '" style="display:none;"></div>';
        });

        html += '<div class="qaq-cat-manage-add" id="qaq-cat-add-btn"><span style="font-size:18px;margin-right:2px;">+</span> 添加新分类</div>';
        html += '<div id="qaq-cat-add-area" style="display:none;"></div>';
        html += '</div>';

        modalBody.innerHTML = html;

        /* ---- 删除 ---- */
        modalBody.querySelectorAll('.qaq-cat-manage-del').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var idx2 = parseInt(this.dataset.catIdx, 10);
                var cats2 = qaqGetCategories();
                if (cats2.length <= 1) return qaqToast('至少保留一个分类');
                var removed = cats2.splice(idx2, 1)[0];
                qaqSaveCategories(cats2);
                renderList();
                qaqToast('已删除「' + removed.name + '」');
            });
        });

        /* ---- 编辑（名称 + 颜色） ---- */
        modalBody.querySelectorAll('.qaq-cat-manage-edit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var idx2 = parseInt(this.dataset.catIdx, 10);
                var cats2 = qaqGetCategories();
                var oldName = cats2[idx2].name;
                var oldColor = cats2[idx2].color;

                var nameEl = document.getElementById('qaq-cat-name-' + idx2);
                var editArea = document.getElementById('qaq-cat-edit-area-' + idx2);
                var parentItem = nameEl.parentElement;

                /* 隐藏当前行的名称和按钮 */
                parentItem.style.display = 'none';

                editArea.style.display = 'block';
                editArea.innerHTML =
                    '<div class="qaq-cat-edit-block">' +
                    '<div class="qaq-plan-form-label">分类名称</div>' +
                    '<input class="qaq-plan-form-input" type="text" value="' + oldName.replace(/"/g, '&quot;') + '" id="qaq-cat-rename-input-' + idx2 + '">' +
                    '<div class="qaq-plan-form-label">分类颜色</div>' +
                    buildColorRow(oldColor, 'qaq-cat-edit-color-' + idx2) +
                    '<div class="qaq-inline-btns">' +
                    '<button class="qaq-inline-cancel" id="qaq-cat-rename-cancel-' + idx2 + '">取消</button>' +
                    '<button class="qaq-inline-ok" id="qaq-cat-rename-ok-' + idx2 + '">保存</button>' +
                    '</div>' +
                    '</div>';

                var inp = document.getElementById('qaq-cat-rename-input-' + idx2);
                setTimeout(function () { inp.focus(); inp.select(); }, 50);

                var getColor = bindColorRow('qaq-cat-edit-color-' + idx2, oldColor, function () {});

                function doSave() {
                    var newName = inp.value.trim();
                    if (!newName) { qaqToast('请输入分类名称'); return; }
                    var newColor = getColor();
                    var latest = qaqGetCategories();

                    if (newName !== oldName && latest.find(function (c) { return c.name === newName; })) {
                        qaqToast('分类名已存在');
                        return;
                    }

                    /* 同步更新所有计划里的分类名 */
                    if (newName !== oldName) {
                        var allPlans = qaqGetAllPlans();
                        Object.keys(allPlans).forEach(function (dateKey) {
                            allPlans[dateKey].forEach(function (item) {
                                if (item.category === oldName) item.category = newName;
                            });
                        });
                        qaqSavePlans(allPlans);
                    }

                    latest[idx2].name = newName;
                    latest[idx2].color = newColor;
                    qaqSaveCategories(latest);
                    renderList();
                    qaqToast('已保存');
                }

                document.getElementById('qaq-cat-rename-ok-' + idx2).addEventListener('click', doSave);
                document.getElementById('qaq-cat-rename-cancel-' + idx2).addEventListener('click', function () { renderList(); });
                inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); doSave(); } });
            });
        });

        /* ---- 添加新分类 ---- */
        document.getElementById('qaq-cat-add-btn').addEventListener('click', function () {
            this.style.display = 'none';
            var area = document.getElementById('qaq-cat-add-area');
            area.style.display = 'block';
            area.innerHTML =
                '<div class="qaq-cat-edit-block">' +
                '<div class="qaq-plan-form-label">分类名称</div>' +
                '<input class="qaq-plan-form-input" type="text" placeholder="输入新分类名称" id="qaq-cat-new-input">' +
                '<div class="qaq-plan-form-label">分类颜色</div>' +
                buildColorRow(qaqPlanColors[0], 'qaq-cat-new-color') +
                '<div class="qaq-inline-btns">' +
                '<button class="qaq-inline-cancel" id="qaq-cat-new-cancel">取消</button>' +
                '<button class="qaq-inline-ok" id="qaq-cat-new-ok">添加</button>' +
                '</div>' +
                '</div>';

            var inp = document.getElementById('qaq-cat-new-input');
            setTimeout(function () { inp.focus(); }, 50);

            var getColor = bindColorRow('qaq-cat-new-color', qaqPlanColors[0], function () {});

            function doAdd() {
                var newName = inp.value.trim();
                if (!newName) return qaqToast('请输入分类名称');
                var cats2 = qaqGetCategories();
                if (cats2.find(function (c) { return c.name === newName; })) return qaqToast('分类已存在');
                cats2.push({ name: newName, color: getColor() });
                qaqSaveCategories(cats2);
                renderList();
                qaqToast('已添加「' + newName + '」');
            }

            document.getElementById('qaq-cat-new-ok').addEventListener('click', doAdd);
            document.getElementById('qaq-cat-new-cancel').addEventListener('click', function () { renderList(); });
            inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); doAdd(); } });
        });
    }

    renderList();

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm" style="flex:1;">完成</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-confirm').onclick = function () {
        qaqCloseModal();
        qaqRenderPlanCards();
        qaqRenderWidgetPlans();
    };
}
    var appNames = ['聊天', '世界书', '词库', '番茄钟', '自习室', '同桌', '今日计划', '日记', '动物园', '主题商店', '游戏'];
    var qaqPlanSelectedDate = qaqDateKey(new Date());

    function qaqDateKey(date) {
        var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
        return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    }
    function qaqFormatDate(dateStr) {
        var parts = dateStr.split('-');
        return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
    }
    
    function qaqGetDayPlans(dateKey) {
        var all = qaqGetAllPlans();
        return all[dateKey] || [];
    }
    function qaqSaveDayPlans(dateKey, items) {
        var all = qaqGetAllPlans();
        if (!items.length) delete all[dateKey];
        else all[dateKey] = items;
        qaqSavePlans(all);
    }
    function qaqPlanId() { return 'p' + Date.now() + Math.random().toString(36).slice(2, 6); }

    var planDateEl = document.getElementById('qaq-plan-date');
    if (planDateEl) {
        var now = new Date();
        planDateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日';
    }

    function qaqRenderWidgetPlans() {
    var todayKey = qaqDateKey(new Date());
    var items = qaqGetDayPlans(todayKey);
    var listEl = document.getElementById('qaq-plan-list');
    var fillEl = document.getElementById('qaq-plan-fill');
    var percentEl = document.getElementById('qaq-plan-percent');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!items.length) {
        listEl.innerHTML = '<div class="qaq-plan-item" style="color:#bbb;font-size:10px;">暂无计划，点击添加</div>';
        if (fillEl) fillEl.style.width = '0%';
        if (percentEl) percentEl.textContent = '0/0';
        return;
    }

    var catMap = {};
    var catOrder = [];
    items.forEach(function (item) {
        var cat = item.category || '未分类';
        if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat); }
        catMap[cat].push(item);
    });

    var doneCount = 0;
    catOrder.forEach(function (cat) {
        var group = document.createElement('div');
        group.className = 'qaq-mini-cat-group';

        var catColor = qaqCategoryColor(cat);
        var catItems = catMap[cat];
        var catDone = catItems.filter(function (x) { return x.done; }).length;

        var header = document.createElement('div');
        header.className = 'qaq-mini-cat-header';
        header.innerHTML =
            '<svg class="qaq-mini-cat-arrow" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5">' +
            '<polyline points="6,9 12,15 18,9" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span class="qaq-mini-cat-name" style="color:' + catColor + ';">' + cat + '</span>' +
            '<span class="qaq-mini-cat-count">' + catDone + '/' + catItems.length + '</span>';

        var body = document.createElement('div');
        body.className = 'qaq-mini-cat-body';

        catItems.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'qaq-plan-item' + (item.done ? ' qaq-item-done' : '');
            div.innerHTML =
                '<div class="qaq-plan-dot' + (item.done ? ' qaq-dot-done' : '') + '" style="background:' + (item.done ? '#b5d6a7' : (item.color || '#deb3be')) + ';"></div>' +
                '<span>' + item.name + '</span>';
            div.addEventListener('click', function (e) {
                e.stopPropagation();
                item.done = !item.done;
                qaqSaveDayPlans(todayKey, items);
                qaqRenderWidgetPlans();
            });
            body.appendChild(div);
            if (item.done) doneCount++;
        });

        header.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('qaq-collapsed');
            body.classList.toggle('qaq-cat-hidden');
        });

        group.appendChild(header);
        group.appendChild(body);
        listEl.appendChild(group);
    });

    var total = items.length;
    var pct = Math.round(doneCount / total * 100);
    if (fillEl) fillEl.style.width = pct + '%';
    if (percentEl) percentEl.textContent = doneCount + '/' + total;
}
    qaqRenderWidgetPlans();

    function qaqRenderDateSelector() {
        var container = document.getElementById('qaq-plan-date-selector');
        container.innerHTML = '';
        var today = new Date();
        var dayNames = ['日', '一', '二', '三', '四', '五', '六'];

        for (var i = -3; i <= 7; i++) {
            var d = new Date(today);
            d.setDate(today.getDate() + i);
            var key = qaqDateKey(d);

            var chip = document.createElement('div');
            chip.className = 'qaq-plan-date-chip' + (key === qaqPlanSelectedDate ? ' qaq-date-active' : '');
            chip.dataset.dateKey = key;

            var label = i === 0 ? '今天' : (i === -1 ? '昨天' : (i === 1 ? '明天' : '周' + dayNames[d.getDay()]));
            chip.innerHTML =
                '<div class="qaq-plan-date-chip-day">' + label + '</div>' +
                '<div class="qaq-plan-date-chip-num">' + d.getDate() + '</div>';

            chip.addEventListener('click', function () {
                qaqPlanSelectedDate = this.dataset.dateKey;
                container.querySelectorAll('.qaq-plan-date-chip').forEach(function (c) { c.classList.remove('qaq-date-active'); });
                this.classList.add('qaq-date-active');
                qaqRenderPlanCards();
            });

            container.appendChild(chip);
        }

        setTimeout(function () {
            var active = container.querySelector('.qaq-date-active');
            if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 360);
    }

    function qaqOpenPlanPage() {
    qaqPlanSelectedDate = qaqDateKey(new Date());
    qaqSwitchTo(planPage);

    requestAnimationFrame(function () {
        qaqRenderDateSelector();
        qaqRenderPlanCards();
    });
}
    function qaqClosePlanPage() {
    qaqClosePage(planPage);
}

    document.getElementById('qaq-plan-back').addEventListener('click', function (e) {
        e.stopPropagation();
        qaqClosePlanPage();
        qaqRenderWidgetPlans();
    });

/* ===== 编辑计划弹窗 ===== */
function qaqEditPlan(dateKey, planId) {
    var dayItems = qaqGetDayPlans(dateKey);
    var item = dayItems.find(function (x) { return x.id === planId; });
    if (!item) return;

    modalTitle.textContent = '编辑计划';

    /* 已有颜色圆点 */
    var colorsHtml = '';
    var matchPreset = false;
    qaqPlanColors.forEach(function (c) {
        var sel = (item.color && item.color.toLowerCase() === c.toLowerCase());
        if (sel) matchPreset = true;
        colorsHtml += '<div class="qaq-plan-color-option' + (sel ? ' qaq-color-selected' : '') + '" data-color="' + c + '" style="background:' + c + ';"></div>';
    });
    var customStyle = (!matchPreset && item.color) ? 'background:' + item.color + ';' : '';
    colorsHtml += '<div class="qaq-color-custom-btn' + (!matchPreset && item.color ? ' qaq-color-selected' : '') + '" id="qaq-pf-color-custom" title="自定义颜色"' + (customStyle ? ' style="' + customStyle + '"' : '') + '></div>';

    /* 分类选择器 */
    var cats = qaqGetCategories();
    var currentCat = item.category || '未分类';
    var catsHtml = '';
    var hasCurrent = false;
    cats.forEach(function (cat) {
        var sel = (cat.name === currentCat);
        if (sel) hasCurrent = true;
        catsHtml += '<div class="qaq-plan-cat-chip' + (sel ? ' qaq-cat-selected' : '') + '" data-cat="' + cat.name + '">' + cat.name + '</div>';
    });
    if (!hasCurrent && currentCat !== '未分类') {
        catsHtml = '<div class="qaq-plan-cat-chip qaq-cat-selected" data-cat="' + currentCat + '">' + currentCat + '</div>' + catsHtml;
    }
    catsHtml += '<div class="qaq-plan-cat-chip qaq-plan-cat-chip-add" id="qaq-pf-cat-add">+ 新建</div>';

    /* 时间按钮内容 */
    var timeBtnContent = item.time
        ? '<span class="qaq-time-value">' + item.time + '</span>'
        : '<span class="qaq-time-placeholder">点击选择时间</span>';
    timeBtnContent += '<svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
        '<div class="qaq-plan-form-label">项目名称 *</div>' +
        '<input class="qaq-plan-form-input" id="qaq-pf-name" type="text" value="' + (item.name || '').replace(/"/g, '&quot;') + '" placeholder="例如：背单词">' +
        '<div class="qaq-plan-form-label">分类</div>' +
        '<div class="qaq-plan-cat-picker" id="qaq-pf-cats">' + catsHtml + '</div>' +
        '<div class="qaq-plan-form-label">项目描述</div>' +
'<textarea class="qaq-plan-form-textarea" id="qaq-pf-desc" placeholder="可选，简单描述一下">' + (item.desc || '') + '</textarea>' +
'<div class="qaq-plan-form-label">想法</div>' +
'<textarea class="qaq-plan-form-textarea" id="qaq-pf-thought" placeholder="记录你的灵感、想法、心得...">' + (item.thought || '') + '</textarea>' +
        '<div class="qaq-plan-form-row">' +
        '<div style="flex:1;"><div class="qaq-plan-form-label">时间</div>' +
        '<div class="qaq-time-picker-wrapper"><div class="qaq-time-picker-btn" id="qaq-pf-time-btn">' + timeBtnContent + '</div></div>' +
        '</div>' +
        '<div style="flex:1;"><div class="qaq-plan-form-label">大致用时</div><input class="qaq-plan-form-input" id="qaq-pf-duration" type="text" value="' + (item.duration || '').replace(/"/g, '&quot;') + '" placeholder="如 30分钟" style="margin-top:6px;"></div>' +
        '</div>' +
        '<div class="qaq-plan-form-label">标签颜色</div>' +
        '<div class="qaq-plan-color-picker" id="qaq-pf-colors">' + colorsHtml + '</div>' +
        '<div class="qaq-color-panel" id="qaq-pf-color-panel"></div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

    qaqOpenModal();

    /* ==== 时间选择 ==== */
    var selectedTime = item.time || '';
    var timeBtn = document.getElementById('qaq-pf-time-btn');
    timeBtn.addEventListener('click', function () {
        qaqOpenTimePicker(selectedTime, function (val) {
            selectedTime = val;
            if (val) {
                timeBtn.innerHTML = '<span class="qaq-time-value">' + val + '</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            } else {
                timeBtn.innerHTML = '<span class="qaq-time-placeholder">点击选择时间</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }
        });
    });

    /* ==== 分类选择 ==== */
    var selectedCategory = currentCat;
    document.getElementById('qaq-pf-cats').addEventListener('click', function (e) {
        var chip = e.target.closest('.qaq-plan-cat-chip');
        if (!chip) return;

        if (chip.id === 'qaq-pf-cat-add') {
    var pickerEl = chip.parentNode;
    chip.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'qaq-cat-edit-block';
    row.style.width = '100%';

    var tempId = 'qaq-pf-newcat-' + Date.now();
    var colorRowHtml = '<div class="qaq-cat-color-row" id="' + tempId + '-colors">';
    qaqPlanColors.forEach(function (c, i) {
        colorRowHtml += '<div class="qaq-cat-color-dot' + (i === 0 ? ' qaq-cat-color-active' : '') + '" data-c="' + c + '" style="background:' + c + ';"></div>';
    });
    colorRowHtml += '<div class="qaq-cat-color-custom" id="' + tempId + '-custom"></div>';
    colorRowHtml += '</div>';
    colorRowHtml += '<div class="qaq-cat-color-panel" id="' + tempId + '-panel"></div>';

    row.innerHTML =
        '<div class="qaq-plan-form-label">分类名称</div>' +
        '<input class="qaq-plan-form-input" type="text" placeholder="输入新分类名称" id="qaq-pf-cat-new-input">' +
        '<div class="qaq-plan-form-label">分类颜色</div>' +
        colorRowHtml +
        '<div class="qaq-inline-btns">' +
        '<button class="qaq-inline-cancel" id="qaq-pf-cat-new-cancel">取消</button>' +
        '<button class="qaq-inline-ok" id="qaq-pf-cat-new-ok">添加</button>' +
        '</div>';
    pickerEl.parentNode.insertBefore(row, pickerEl.nextSibling);

    var catInp = document.getElementById('qaq-pf-cat-new-input');
    setTimeout(function () { catInp.focus(); }, 50);

    /* 颜色选择绑定 */
    var newCatColor = qaqPlanColors[0];
    var ccRow = document.getElementById(tempId + '-colors');
    var ccCustom = document.getElementById(tempId + '-custom');
    var ccPanel = document.getElementById(tempId + '-panel');

    ccRow.addEventListener('click', function (ev) {
        var dot = ev.target.closest('.qaq-cat-color-dot');
        if (dot) {
            ccRow.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
            ccCustom.classList.remove('qaq-cat-color-active');
            dot.classList.add('qaq-cat-color-active');
            newCatColor = dot.dataset.c;
            ccPanel.classList.remove('qaq-cat-color-panel-show');
            return;
        }
        if (ev.target.closest('.qaq-cat-color-custom')) {
            ccRow.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
            ccCustom.classList.add('qaq-cat-color-active');
            if (ccPanel.classList.contains('qaq-cat-color-panel-show')) {
                ccPanel.classList.remove('qaq-cat-color-panel-show');
            } else {
                ccPanel.classList.add('qaq-cat-color-panel-show');
                qaqCreateColorPicker(ccPanel, newCatColor, function (hex) {
                    newCatColor = hex;
                    ccCustom.style.background = hex;
                    ccPanel.classList.remove('qaq-cat-color-panel-show');
                    qaqToast('颜色已选择');
                }, function () {
                    ccPanel.classList.remove('qaq-cat-color-panel-show');
                    ccCustom.classList.remove('qaq-cat-color-active');
                });
            }
        }
    });

    function doCatAdd() {
        var newName = catInp.value.trim();
        if (!newName) { qaqToast('请输入分类名称'); return; }
        var existCats = qaqGetCategories();
        if (existCats.find(function (c) { return c.name === newName; })) { qaqToast('分类已存在'); return; }
        existCats.push({ name: newName, color: newCatColor });
        qaqSaveCategories(existCats);

        row.remove();
        chip.style.display = '';

        var newChip = document.createElement('div');
        newChip.className = 'qaq-plan-cat-chip qaq-cat-selected';
        newChip.dataset.cat = newName;
        newChip.textContent = newName;
        pickerEl.insertBefore(newChip, chip);

        pickerEl.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) {
            if (c !== newChip && !c.classList.contains('qaq-plan-cat-chip-add')) c.classList.remove('qaq-cat-selected');
        });
        selectedCategory = newName;
        qaqToast('新分类已添加');
    }

    function doCatCancel() { row.remove(); chip.style.display = ''; }

    document.getElementById('qaq-pf-cat-new-ok').addEventListener('click', doCatAdd);
    document.getElementById('qaq-pf-cat-new-cancel').addEventListener('click', doCatCancel);
    catInp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); doCatAdd(); } });
    return;
}

        this.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) { c.classList.remove('qaq-cat-selected'); });
        chip.classList.add('qaq-cat-selected');
        selectedCategory = chip.dataset.cat;
    });

    /* ==== 颜色选择 ==== */
    var selectedColor = item.color || qaqPlanColors[0];
    var colorPanel = document.getElementById('qaq-pf-color-panel');
    var colorCustomBtn = document.getElementById('qaq-pf-color-custom');

    document.getElementById('qaq-pf-colors').addEventListener('click', function (e) {
        var option = e.target.closest('.qaq-plan-color-option');
        if (option) {
            this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) { o.classList.remove('qaq-color-selected'); });
            colorCustomBtn.classList.remove('qaq-color-selected');
            option.classList.add('qaq-color-selected');
            selectedColor = option.dataset.color;
            colorPanel.classList.remove('qaq-color-panel-show');
            return;
        }
        if (e.target.closest('.qaq-color-custom-btn')) {
            this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) { o.classList.remove('qaq-color-selected'); });
            colorCustomBtn.classList.add('qaq-color-selected');
            if (colorPanel.classList.contains('qaq-color-panel-show')) {
                colorPanel.classList.remove('qaq-color-panel-show');
            } else {
                colorPanel.classList.add('qaq-color-panel-show');
                qaqCreateColorPicker(colorPanel, selectedColor, function (hex) {
                    selectedColor = hex;
                    colorCustomBtn.style.background = hex;
                    colorPanel.classList.remove('qaq-color-panel-show');
                    qaqToast('颜色已选择');
                }, function () {
                    colorPanel.classList.remove('qaq-color-panel-show');
                    colorCustomBtn.classList.remove('qaq-color-selected');
                });
            }
        }
    });

    /* ==== 保存 ==== */
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
    var name = document.getElementById('qaq-pf-name').value.trim();
    if (!name) return qaqToast('请输入项目名称');

    item.name = name;
    item.desc = document.getElementById('qaq-pf-desc').value.trim();
    item.thought = document.getElementById('qaq-pf-thought').value.trim();
    item.time = selectedTime;
    item.duration = document.getElementById('qaq-pf-duration').value.trim();
    item.color = selectedColor;
    item.category = selectedCategory;

    qaqSaveDayPlans(dateKey, dayItems);
    qaqCloseModal();
    // ★ 延迟渲染
    setTimeout(function () {
        qaqRenderPlanCards();
        qaqRenderWidgetPlans();
    }, 230);
    qaqToast('已保存');
};
}

    document.getElementById('qaq-plan-add-btn').addEventListener('click', function () {
    modalTitle.textContent = '新建计划';

    /* 已有颜色圆点 */
    var colorsHtml = '';
    qaqPlanColors.forEach(function (c, i) {
        colorsHtml += '<div class="qaq-plan-color-option' + (i === 0 ? ' qaq-color-selected' : '') + '" data-color="' + c + '" style="background:' + c + ';"></div>';
    });
    colorsHtml += '<div class="qaq-color-custom-btn" id="qaq-pf-color-custom" title="自定义颜色"></div>';

    /* 分类选择器 */
    var cats = qaqGetCategories();
    var catsHtml = '';
    cats.forEach(function (cat, i) {
        catsHtml += '<div class="qaq-plan-cat-chip' + (i === 0 ? ' qaq-cat-selected' : '') + '" data-cat="' + cat.name + '">' + cat.name + '</div>';
    });
    catsHtml += '<div class="qaq-plan-cat-chip qaq-plan-cat-chip-add" id="qaq-pf-cat-add">+ 新建</div>';

    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
        '<div class="qaq-plan-form-label">项目名称 *</div>' +
        '<input class="qaq-plan-form-input" id="qaq-pf-name" type="text" placeholder="例如：背单词">' +
        '<div class="qaq-plan-form-label">分类</div>' +
        '<div class="qaq-plan-cat-picker" id="qaq-pf-cats">' + catsHtml + '</div>' +
        '<div class="qaq-plan-form-label">项目描述</div>' +
'<textarea class="qaq-plan-form-textarea" id="qaq-pf-desc" placeholder="可选，简单描述一下"></textarea>' +
'<div class="qaq-plan-form-label">想法</div>' +
'<textarea class="qaq-plan-form-textarea" id="qaq-pf-thought" placeholder="记录你的灵感、想法、心得..."></textarea>' +
        '<div class="qaq-plan-form-row">' +
        '<div style="flex:1;"><div class="qaq-plan-form-label">时间</div>' +
        '<div class="qaq-time-picker-wrapper"><div class="qaq-time-picker-btn" id="qaq-pf-time-btn"><span class="qaq-time-placeholder">点击选择时间</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>' +
        '</div>' +
        '<div style="flex:1;"><div class="qaq-plan-form-label">大致用时</div><input class="qaq-plan-form-input" id="qaq-pf-duration" type="text" placeholder="如 30分钟" style="margin-top:6px;"></div>' +
        '</div>' +
        '<div class="qaq-plan-form-label">标签颜色</div>' +
        '<div class="qaq-plan-color-picker" id="qaq-pf-colors">' + colorsHtml + '</div>' +
        '<div class="qaq-color-panel" id="qaq-pf-color-panel"></div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">添加</button>';

    qaqOpenModal();

    /* ==== 时间选择 ==== */
    var selectedTime = '';
    var timeBtn = document.getElementById('qaq-pf-time-btn');
    timeBtn.addEventListener('click', function () {
        qaqOpenTimePicker(selectedTime, function (val) {
            selectedTime = val;
            if (val) {
                timeBtn.innerHTML = '<span class="qaq-time-value">' + val + '</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            } else {
                timeBtn.innerHTML = '<span class="qaq-time-placeholder">点击选择时间</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }
        });
    });

    /* ==== 分类选择 ==== */
    var selectedCategory = cats.length ? cats[0].name : '未分类';
    document.getElementById('qaq-pf-cats').addEventListener('click', function (e) {
        var chip = e.target.closest('.qaq-plan-cat-chip');
        if (!chip) return;

        if (chip.id === 'qaq-pf-cat-add') {
    var pickerEl = chip.parentNode;
    chip.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'qaq-cat-edit-block';
    row.style.width = '100%';

    var tempId = 'qaq-pf-newcat-' + Date.now();
    var colorRowHtml = '<div class="qaq-cat-color-row" id="' + tempId + '-colors">';
    qaqPlanColors.forEach(function (c, i) {
        colorRowHtml += '<div class="qaq-cat-color-dot' + (i === 0 ? ' qaq-cat-color-active' : '') + '" data-c="' + c + '" style="background:' + c + ';"></div>';
    });
    colorRowHtml += '<div class="qaq-cat-color-custom" id="' + tempId + '-custom"></div>';
    colorRowHtml += '</div>';
    colorRowHtml += '<div class="qaq-cat-color-panel" id="' + tempId + '-panel"></div>';

    row.innerHTML =
        '<div class="qaq-plan-form-label">分类名称</div>' +
        '<input class="qaq-plan-form-input" type="text" placeholder="输入新分类名称" id="qaq-pf-cat-new-input">' +
        '<div class="qaq-plan-form-label">分类颜色</div>' +
        colorRowHtml +
        '<div class="qaq-inline-btns">' +
        '<button class="qaq-inline-cancel" id="qaq-pf-cat-new-cancel">取消</button>' +
        '<button class="qaq-inline-ok" id="qaq-pf-cat-new-ok">添加</button>' +
        '</div>';
    pickerEl.parentNode.insertBefore(row, pickerEl.nextSibling);

    var catInp = document.getElementById('qaq-pf-cat-new-input');
    setTimeout(function () { catInp.focus(); }, 50);

    /* 颜色选择绑定 */
    var newCatColor = qaqPlanColors[0];
    var ccRow = document.getElementById(tempId + '-colors');
    var ccCustom = document.getElementById(tempId + '-custom');
    var ccPanel = document.getElementById(tempId + '-panel');

    ccRow.addEventListener('click', function (ev) {
        var dot = ev.target.closest('.qaq-cat-color-dot');
        if (dot) {
            ccRow.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
            ccCustom.classList.remove('qaq-cat-color-active');
            dot.classList.add('qaq-cat-color-active');
            newCatColor = dot.dataset.c;
            ccPanel.classList.remove('qaq-cat-color-panel-show');
            return;
        }
        if (ev.target.closest('.qaq-cat-color-custom')) {
            ccRow.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) { d.classList.remove('qaq-cat-color-active'); });
            ccCustom.classList.add('qaq-cat-color-active');
            if (ccPanel.classList.contains('qaq-cat-color-panel-show')) {
                ccPanel.classList.remove('qaq-cat-color-panel-show');
            } else {
                ccPanel.classList.add('qaq-cat-color-panel-show');
                qaqCreateColorPicker(ccPanel, newCatColor, function (hex) {
                    newCatColor = hex;
                    ccCustom.style.background = hex;
                    ccPanel.classList.remove('qaq-cat-color-panel-show');
                    qaqToast('颜色已选择');
                }, function () {
                    ccPanel.classList.remove('qaq-cat-color-panel-show');
                    ccCustom.classList.remove('qaq-cat-color-active');
                });
            }
        }
    });

    function doCatAdd() {
        var newName = catInp.value.trim();
        if (!newName) { qaqToast('请输入分类名称'); return; }
        var existCats = qaqGetCategories();
        if (existCats.find(function (c) { return c.name === newName; })) { qaqToast('分类已存在'); return; }
        existCats.push({ name: newName, color: newCatColor });
        qaqSaveCategories(existCats);

        row.remove();
        chip.style.display = '';

        var newChip = document.createElement('div');
        newChip.className = 'qaq-plan-cat-chip qaq-cat-selected';
        newChip.dataset.cat = newName;
        newChip.textContent = newName;
        pickerEl.insertBefore(newChip, chip);

        pickerEl.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) {
            if (c !== newChip && !c.classList.contains('qaq-plan-cat-chip-add')) c.classList.remove('qaq-cat-selected');
        });
        selectedCategory = newName;
        qaqToast('新分类已添加');
    }

    function doCatCancel() { row.remove(); chip.style.display = ''; }

    document.getElementById('qaq-pf-cat-new-ok').addEventListener('click', doCatAdd);
    document.getElementById('qaq-pf-cat-new-cancel').addEventListener('click', doCatCancel);
    catInp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); doCatAdd(); } });
    return;
}

        this.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) { c.classList.remove('qaq-cat-selected'); });
        chip.classList.add('qaq-cat-selected');
        selectedCategory = chip.dataset.cat;
    });

    /* ==== 颜色选择 ==== */
    var selectedColor = qaqPlanColors[0];
    var colorPanel = document.getElementById('qaq-pf-color-panel');
    var colorCustomBtn = document.getElementById('qaq-pf-color-custom');

    document.getElementById('qaq-pf-colors').addEventListener('click', function (e) {
        /* 点已有的颜色圆点 */
        var option = e.target.closest('.qaq-plan-color-option');
        if (option) {
            this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) { o.classList.remove('qaq-color-selected'); });
            colorCustomBtn.classList.remove('qaq-color-selected');
            option.classList.add('qaq-color-selected');
            selectedColor = option.dataset.color;
            colorPanel.classList.remove('qaq-color-panel-show');
            return;
        }

        /* 点自定义按钮 */
        if (e.target.closest('.qaq-color-custom-btn')) {
            this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) { o.classList.remove('qaq-color-selected'); });
            colorCustomBtn.classList.add('qaq-color-selected');

            if (colorPanel.classList.contains('qaq-color-panel-show')) {
                colorPanel.classList.remove('qaq-color-panel-show');
            } else {
                colorPanel.classList.add('qaq-color-panel-show');
                qaqCreateColorPicker(colorPanel, selectedColor, function (hex) {
    selectedColor = hex;
    colorCustomBtn.style.background = hex;
    colorPanel.classList.remove('qaq-color-panel-show');
    qaqToast('颜色已选择');
}, function () {
    colorPanel.classList.remove('qaq-color-panel-show');
    colorCustomBtn.classList.remove('qaq-color-selected');
});
            }
        }
    });

    setTimeout(function () { document.getElementById('qaq-pf-name').focus(); }, 100);

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
        var name = document.getElementById('qaq-pf-name').value.trim();
        if (!name) return qaqToast('请输入项目名称');

        var dayItems = qaqGetDayPlans(qaqPlanSelectedDate);
        dayItems.push({
    id: qaqPlanId(),
    name: name,
    desc: document.getElementById('qaq-pf-desc').value.trim(),
    thought: document.getElementById('qaq-pf-thought').value.trim(),
    time: selectedTime,
    duration: document.getElementById('qaq-pf-duration').value.trim(),
    color: selectedColor,
    category: selectedCategory,
    done: false
});

        qaqSaveDayPlans(qaqPlanSelectedDate, dayItems);
        qaqCloseModal();
        qaqRenderPlanCards();
        qaqRenderWidgetPlans();
        qaqToast('计划已添加');
    };
});

/* 分类管理按钮 */
document.getElementById('qaq-plan-cat-manage-btn').addEventListener('click', function () {
    qaqOpenCatManage();
});

    /* 小组件点击打开今日计划 */
    var planWidget = document.getElementById('qaq-plan-widget');
    if (planWidget) {
        planWidget.addEventListener('click', function () { qaqOpenPlanPage(); });
    }




    /* ===== 设置页 ===== */
    function qaqOpenSettings() { qaqSwitchTo(settingsPage); }
    function qaqCloseSettings() {
    if (qaqPageLock) return;

    var openedSubs = document.querySelectorAll('.qaq-settings-sub.qaq-page-show');
    if (openedSubs.length) {
        openedSubs.forEach(function (sub) { sub.classList.remove('qaq-page-show'); });
        return;
    }

    qaqClosePage(settingsPage);
}

    document.getElementById('qaq-settings-back').addEventListener('click', function (e) {
        e.stopPropagation();
        qaqCloseSettings();
    });

    document.querySelectorAll('.qaq-settings-sub .qaq-back-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var sub = this.closest('.qaq-settings-sub');
        if (sub) {
            qaqGoBackTo(settingsPage, sub);
        }
    });
});

    document.getElementById('qaq-set-notice').addEventListener('click', function () {
        qaqSwitchTo(document.getElementById('qaq-sub-notice'));
    });

    document.getElementById('qaq-set-api').addEventListener('click', function () {
        var sub = document.getElementById('qaq-sub-api');
        var saved = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');
        document.getElementById('qaq-api-url').value = saved.url || '';
        document.getElementById('qaq-api-key').value = saved.key || '';
        document.getElementById('qaq-api-model').value = saved.model || '';
        qaqSwitchTo(sub);
    });

    document.getElementById('qaq-api-save').addEventListener('click', function () {
        var config = {
            url: document.getElementById('qaq-api-url').value.trim(),
            key: document.getElementById('qaq-api-key').value.trim(),
            model: document.getElementById('qaq-api-model').value.trim()
        };
        localStorage.setItem('qaq-api-config', JSON.stringify(config));
        qaqToast('API 配置已保存');
    });

    document.getElementById('qaq-set-theme').addEventListener('click', function () {
        qaqSwitchTo(document.getElementById('qaq-sub-theme'));
    });

    var themes = {
        'default': 'linear-gradient(160deg, #f6e9c9 0%, #faebd7 25%, #fce8e2 50%, #fed2e0 75%, #f6e9c9 100%)',
        'cool': 'linear-gradient(160deg, #ebeef3 0%, #f0f2f5 25%, #f3f4f7 50%, #eef0f4 75%, #ebeef3 100%)',
        'dark': 'linear-gradient(160deg, #121212 0%, #1a1a1a 25%, #161616 50%, #1c1c1c 75%, #121212 100%)'
    };

    function qaqApplyTheme(t) {
    var phoneFrame = document.querySelector('.qaq-phone-frame');
    phoneFrame.style.background = themes[t] || themes['default'];
    phoneFrame.classList.remove('qaq-theme-cool', 'qaq-theme-dark');
    if (t === 'cool') phoneFrame.classList.add('qaq-theme-cool');
    if (t === 'dark') phoneFrame.classList.add('qaq-theme-dark');

    var themeColors = {
        'default': '#f6e9c9',
        'cool': '#ebeef3',
        'dark': '#121212'
    };
    var color = themeColors[t] || themes['default'];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', color);
    }

    qaqApplyXiaoyuanThemeClass();
    qaqRefreshXiaoyuanView();
}

    document.querySelectorAll('[data-theme]').forEach(function (item) {
        item.addEventListener('click', function () {
            var t = this.dataset.theme;
            qaqApplyTheme(t);
            localStorage.setItem('qaq-theme', t);
            qaqToast('主题已切换');
        });
    });

    var savedTheme = localStorage.getItem('qaq-theme');
    if (savedTheme && themes[savedTheme]) qaqApplyTheme(savedTheme);

    function qaqApplyHiddenApps() {
        var hidden = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');
        document.querySelectorAll('.qaq-app-item').forEach(function (item) {
            var name = item.querySelector('.qaq-app-name').textContent;
            item.style.display = hidden.indexOf(name) > -1 ? 'none' : '';
        });
    }

    document.getElementById('qaq-set-appmanage').addEventListener('click', function () {
        var sub = document.getElementById('qaq-sub-appmanage');
        qaqSwitchTo(sub);

        var list = document.getElementById('qaq-app-manage-list');
        list.innerHTML = '';
        var hiddenApps = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');

        appNames.forEach(function (name) {
            var isHidden = hiddenApps.indexOf(name) > -1;
            var item = document.createElement('div');
            item.className = 'qaq-settings-item';
            item.innerHTML =
                '<div class="qaq-settings-item-text">' + name + '</div>' +
                '<div class="qaq-toggle' + (isHidden ? '' : ' qaq-toggle-on') + '" data-app-toggle="' + name + '">' +
                '<div class="qaq-toggle-knob"></div></div>';
            list.appendChild(item);
        });

        list.querySelectorAll('.qaq-toggle').forEach(function (toggle) {
            toggle.parentElement.addEventListener('click', function () {
                var t = this.querySelector('.qaq-toggle');
                t.classList.toggle('qaq-toggle-on');

                var appName = t.dataset.appToggle;
                var hidden = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');

                if (t.classList.contains('qaq-toggle-on')) {
                    hidden = hidden.filter(function (n) { return n !== appName; });
                    qaqToast(appName + ' 已显示');
                } else {
                    hidden.push(appName);
                    qaqToast(appName + ' 已隐藏');
                }

                localStorage.setItem('qaq-hidden-apps', JSON.stringify(hidden));
                qaqApplyHiddenApps();
            });
        });
    });

    qaqApplyHiddenApps();

    /* ===== 底部导航 ===== */
    var navItems = document.querySelectorAll('.qaq-nav-item');
    var navLabels = { xiaoyuan: '小院', shop: '商店', game: '游戏', settings: '设置' };
    navItems.forEach(function (item) {
    item.addEventListener('click', function () {
        navItems.forEach(function (n) { n.classList.remove('qaq-nav-active'); });
        this.classList.add('qaq-nav-active');

        //★ 强制解锁，防止之前的页面切换残留锁
        qaqPageLock = false;

        if (this.dataset.nav === 'settings') qaqOpenSettings();
        else if (this.dataset.nav === 'xiaoyuan') qaqOpenXiaoyuanPage();
        else if (this.dataset.nav === 'shop') qaqOpenGlobalShopPage();
        else qaqToast(navLabels[this.dataset.nav] || this.dataset.nav);
    });
});

/* ===== 小院页面 ===== */
var qaqXiaoyuanPage = document.getElementById('qaq-xiaoyuan-page');
var qaqXiaoyuanCurrentTab = 'garden';

function qaqOpenXiaoyuanPage() {
    qaqApplyXiaoyuanThemeClass();   // ★ 新增
    qaqSwitchTo(qaqXiaoyuanPage);
    requestAnimationFrame(function () {
        qaqSwitchXiaoyuanTab(qaqXiaoyuanCurrentTab || 'garden');
        qaqRefreshXiaoyuanView();
    });
}
function qaqSwitchXiaoyuanTab(tab) {
    qaqXiaoyuanCurrentTab = tab;
    document.querySelectorAll('[data-xiaoyuan-tab]').forEach(function (btn) {
        btn.classList.toggle('qaq-wordbank-tab-active', btn.dataset.xiaoyuanTab === tab);
    });
    document.getElementById('qaq-xiaoyuan-panel-garden').style.display = tab === 'garden' ? '' : 'none';
    document.getElementById('qaq-xiaoyuan-panel-zoo').style.display = tab === 'zoo' ? '' : 'none';

    if (tab === 'garden') qaqRenderXiaoyuanGarden();
    else qaqRenderXiaoyuanZoo();
}

document.getElementById('qaq-xiaoyuan-back').addEventListener('click', function () {
    qaqClosePage(qaqXiaoyuanPage);
});

document.querySelectorAll('[data-xiaoyuan-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
        qaqSwitchXiaoyuanTab(this.dataset.xiaoyuanTab);
    });
});

function qaqRenderXiaoyuanGarden() {
    var owned = qaqGetOwnedItems().filter(function (x) { return x.type === 'seed'; });
    var gridEl = document.getElementById('qaq-xy-garden-grid');
    var emptyEl = document.getElementById('qaq-xy-garden-empty');
    var sceneEl = document.getElementById('qaq-xy-garden-scene');

    gridEl.innerHTML = '';
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip').forEach(function (el) { el.remove(); });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击植物可浇水';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function (item, idx) {
        var catItem = qaqShopCatalog.seeds.find(function (x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var growth = state.growth || 0;
        var growthStage = growth< 30 ? 0.7 : (growth < 70 ? 0.85 : 1);

        var svgFn = qaqPlantSVGs[item.id];
        if (svgFn) {
            qaqCreateSpriteInScene(sceneEl, svgFn(growthStage),
                spacing * (idx + 1) - 20, 10,
                catItem ? catItem.name : item.name, item.id, 'plant');
        }

        var card = document.createElement('div');
        card.className = 'qaq-garden-card';

        var bloomSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e05565" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><circle cx="12" cy="12" r="4" fill="#e05565" opacity="0.3"/><circle cx="12" cy="5" r="2.5" fill="#f8b0b8"/><circle cx="12" cy="19" r="2.5" fill="#f8b0b8"/><circle cx="5" cy="12" r="2.5" fill="#f8b0b8"/><circle cx="19" cy="12" r="2.5" fill="#f8b0b8"/></svg>';
        var growSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22V12" stroke-linecap="round"/><path d="M8 16c0-4 2-6 4-7" stroke-linecap="round"/><path d="M16 14c0-3-2-5-4-6" stroke-linecap="round"/></svg>';
        var seedSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22v-8" stroke-linecap="round"/><path d="M12 14c-3 0-5-2-5-5s4-7 5-7 5 4 5 7-2 5-5 5z" fill="#b8dfbf" opacity="0.3"/></svg>';
        var statusText = growth >= 100 ? bloomSvg + '盛开' : (growth >= 50 ? growSvg + '成长中' : seedSvg + '幼苗');
        var statusColor = growth >= 100 ? '#e05565' : (growth >= 50 ? '#7bab6e' : '#999');

        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +
                (catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-status" style="color:' + statusColor + ';">' + statusText + '</div>' +
            '<div class="qaq-garden-card-growth"><div class="qaq-garden-card-growth-fill" style="width:' + growth + '%;"></div></div>';

        card.addEventListener('click', function () {
            qaqWaterPlant(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            setTimeout(qaqRenderXiaoyuanGarden, 300);
        });

        gridEl.appendChild(card);
    });
}

function qaqRenderXiaoyuanZoo() {
    var owned = qaqGetOwnedItems().filter(function (x) { return x.type === 'animal'; });
    var gridEl = document.getElementById('qaq-xy-zoo-grid');
    var emptyEl = document.getElementById('qaq-xy-zoo-empty');
    var sceneEl = document.getElementById('qaq-xy-zoo-scene');

    gridEl.innerHTML = '';
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip').forEach(function (el) { el.remove(); });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击动物互动';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function (item, idx) {
        var catItem = qaqShopCatalog.animals.find(function (x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var mood = state.mood || 50;

        var happySvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8c34f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><path d="M8 15s1.5 24 2 4-2 4-2" stroke-linecap="round"/></svg>';
        var neutralSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><line x1="9" y1="15" x2="15" y2="15" stroke-linecap="round"/></svg>';
        var sadSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#999" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#999" stroke="none"/><path d="M8 17s1.5-2 4-2 4 2 4 2" stroke-linecap="round"/></svg>';
        var moodEmoji = mood >= 80 ? happySvg : (mood >= 50 ? neutralSvg : sadSvg);

        var svgFn = qaqAnimalSVGs[item.id];
        if (svgFn) {
            qaqCreateSpriteInScene(sceneEl, svgFn(1),
                spacing * (idx + 1) - 20, 10,
                catItem ? catItem.name : item.name, item.id, 'animal');
        }

        var card = document.createElement('div');
        card.className = 'qaq-garden-card';
        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +
                (catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-mood">' + moodEmoji + '</div>' +
            '<div class="qaq-garden-card-status">心情 ' + mood + '%</div>';

        card.addEventListener('click', function () {
            qaqPetAnimal(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            setTimeout(qaqRenderXiaoyuanZoo, 300);
        });

        gridEl.appendChild(card);
    });
}

// 全部浇水/喂食（小院版）
document.getElementById('qaq-xy-water-all-btn').addEventListener('click', function () {
    var owned = qaqGetOwnedItems().filter(function (x) { return x.type === 'seed'; });
    if (!owned.length) return qaqToast('没有可浇水的植物');
    owned.forEach(function (item) {
        var state = qaqGetSpriteState(item.id);
        state.growth = Math.min(100, (state.growth || 0) + 10);
        state.lastWater = Date.now();
        qaqSaveSpriteState(item.id, state);
    });
    qaqAddPoints(owned.length);
    qaqRenderXiaoyuanGarden();qaqToast('全部浇水完成 +' + owned.length + ' 积分');
});

document.getElementById('qaq-xy-feed-all-btn').addEventListener('click', function () {
    var owned = qaqGetOwnedItems().filter(function (x) { return x.type === 'animal'; });
    if (!owned.length) return qaqToast('没有可喂食的动物');
    owned.forEach(function (item) {
        var state = qaqGetSpriteState(item.id);
        state.mood = Math.min(100, (state.mood || 50) + 10);
        state.lastFeed = Date.now();
        qaqSaveSpriteState(item.id, state);
    });
    qaqAddPoints(owned.length);
    qaqRenderXiaoyuanZoo();
    qaqToast('全部喂食完成 +' + owned.length + ' 积分');
});

/* ===== 全局商店（底部导航入口） ===== */
function qaqOpenGlobalShopPage() {
    qaqShopPageSource = 'global';
    qaqRenderShopPage();
    qaqSwitchTo(document.getElementById('qaq-mine-shop-page'));
}

// 商店页返回时回到主页而非词库页
// 需在商店页back按钮处判断来源
var qaqShopPageSource = 'wordbank'; // 'wordbank' | 'global'

document.getElementById('qaq-mine-shop-back').addEventListener('click', function () {
    if (qaqShopPageSource === 'global') {
        qaqClosePage(document.getElementById('qaq-mine-shop-page'));
    } else {
        qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-shop-page'));
        qaqSwitchWordbankTab('mine');
    }
    qaqShopPageSource = 'wordbank';
});
    /* ===== 数据导出导入清除 ===== */

    document.getElementById('qaq-set-clearall').addEventListener('click', function () {
        qaqConfirm('清除所有数据', '此操作不可恢复，确认要清除所有数据吗？', function () {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key.indexOf('qaq') === 0) keys.push(key);
            }
            keys.forEach(function (key) { localStorage.removeItem(key); });
            qaqToast('已清除所有数据');
            setTimeout(function () { location.reload(); }, 1000);
        });
    });

/* ===== QAQ 自定义时间选择器 ===== */
var qaqTimeMask = document.getElementById('qaq-time-mask');
var qaqTimePanel = document.getElementById('qaq-time-panel');
var qaqTimeHourCol = document.getElementById('qaq-time-hour');
var qaqTimeMinuteCol = document.getElementById('qaq-time-minute');
var qaqTimeCallback = null;
var qaqTimeCurrentH = 8;
var qaqTimeCurrentM = 0;

/* 构建滚轮内容 */
function qaqBuildTimeCol(col, count, pad) {
    col.innerHTML = '<div class="qaq-time-col-spacer"></div>';
    for (var i = 0; i < count; i++) {
        var item = document.createElement('div');
        item.className = 'qaq-time-col-item';
        item.dataset.val = i;
        item.textContent = pad && i < 10 ? '0' + i : '' + i;
        col.appendChild(item);
    }
    var spacer2 = document.createElement('div');
    spacer2.className = 'qaq-time-col-spacer';
    col.appendChild(spacer2);
}
qaqBuildTimeCol(qaqTimeHourCol, 24, true);
qaqBuildTimeCol(qaqTimeMinuteCol, 60, true);

function qaqScrollToVal(col, val) {
    var items = col.querySelectorAll('.qaq-time-col-item');
    if (!items[val]) return;
    var itemH = 40;
    var scrollTop = val * itemH;
    col.scrollTop = scrollTop;
}

function qaqGetSelectedVal(col) {
    var scrollTop = col.scrollTop;
    var idx = Math.round(scrollTop / 40);
    var items = col.querySelectorAll('.qaq-time-col-item');
    idx = Math.max(0, Math.min(idx, items.length - 1));
    return parseInt(items[idx].dataset.val, 10);
}

function qaqUpdateTimeHighlight(col) {
    var scrollTop = col.scrollTop;
    var idx = Math.round(scrollTop / 40);
    var items = col.querySelectorAll('.qaq-time-col-item');
    items.forEach(function (it, i) {
        it.classList.toggle('qaq-time-selected', i === idx);
    });
}

qaqTimeHourCol.addEventListener('scroll', function () { qaqUpdateTimeHighlight(this); });
qaqTimeMinuteCol.addEventListener('scroll', function () { qaqUpdateTimeHighlight(this); });

/* 点击某项快速跳转 */
qaqTimeHourCol.addEventListener('click', function (e) {
    var item = e.target.closest('.qaq-time-col-item');
    if (item) qaqScrollToVal(this, parseInt(item.dataset.val, 10));
});
qaqTimeMinuteCol.addEventListener('click', function (e) {
    var item = e.target.closest('.qaq-time-col-item');
    if (item) qaqScrollToVal(this, parseInt(item.dataset.val, 10));
});

function qaqOpenTimePicker(currentVal, callback) {
    qaqTimeCallback = callback;

    if (currentVal && /^\d{2}:\d{2}$/.test(currentVal)) {
        var parts = currentVal.split(':');
        qaqTimeCurrentH = parseInt(parts[0], 10);
        qaqTimeCurrentM = parseInt(parts[1], 10);
    } else {
        var now = new Date();
        qaqTimeCurrentH = now.getHours();
        qaqTimeCurrentM = now.getMinutes();
    }

    qaqTimeMask.classList.add('qaq-time-mask-show');
    qaqTimePanel.classList.add('qaq-time-panel-show');

    setTimeout(function () {
        qaqScrollToVal(qaqTimeHourCol, qaqTimeCurrentH);
        qaqScrollToVal(qaqTimeMinuteCol, qaqTimeCurrentM);
        qaqUpdateTimeHighlight(qaqTimeHourCol);
        qaqUpdateTimeHighlight(qaqTimeMinuteCol);
    }, 50);
}

function qaqCloseTimePicker() {
    qaqTimeMask.classList.remove('qaq-time-mask-show');
    qaqTimePanel.classList.remove('qaq-time-panel-show');
}

document.getElementById('qaq-time-confirm').addEventListener('click', function () {
    var h = qaqGetSelectedVal(qaqTimeHourCol);
    var m = qaqGetSelectedVal(qaqTimeMinuteCol);
    var val = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    if (qaqTimeCallback) qaqTimeCallback(val);
    qaqCloseTimePicker();
});

document.getElementById('qaq-time-cancel').addEventListener('click', qaqCloseTimePicker);
qaqTimeMask.addEventListener('click', qaqCloseTimePicker);

document.getElementById('qaq-time-clear').addEventListener('click', function () {
    if (qaqTimeCallback) qaqTimeCallback('');
    qaqCloseTimePicker();
});
function qaqApplyXiaoyuanThemeClass() {
    var page = document.getElementById('qaq-xiaoyuan-page');
    var frame = document.querySelector('.qaq-phone-frame');
    if (!page || !frame) return;

    page.classList.remove('qaq-theme-dark', 'qaq-theme-cool');

    if (frame.classList.contains('qaq-theme-dark')) {
        page.classList.add('qaq-theme-dark');
    } else if (frame.classList.contains('qaq-theme-cool')) {
        page.classList.add('qaq-theme-cool');
    }
}
/* ===== QAQ 自定义颜色选择器（HSV） ===== */
function qaqHsvToHex(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r1, g1, b1;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    var r = Math.round((r1 + m) * 255);
    var g = Math.round((g1 + m) * 255);
    var b = Math.round((b1 + m) * 255);
    return '#' + (r < 16 ? '0' : '') + r.toString(16) + (g < 16 ? '0' : '') + g.toString(16) + (b < 16 ? '0' : '') + b.toString(16);
}

function qaqHexToHsv(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h: h, s: s, v: v };
}

function qaqCreateColorPicker(container, initialColor, onChange, onCancel) {
    var hue = 0, sat = 1, val = 1;
    if (initialColor) {
        var hsv = qaqHexToHsv(initialColor);
        hue = hsv.h; sat = hsv.s; val = hsv.v;
    }

    var extraSwatches = ['#ff6b6b', '#ff9f43', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#c8d6e5', '#576574'];

    var html =
        '<div class="qaq-color-swatches" id="qaq-cp-swatches">' +
        extraSwatches.map(function (c) {
            return '<div class="qaq-color-swatch-item" data-swatch="' + c + '" style="background:' + c + ';"></div>';
        }).join('') +
        '</div>' +
        '<div class="qaq-color-sv-wrap" id="qaq-cp-sv">' +
        '<div class="qaq-color-sv-white"></div>' +
        '<div class="qaq-color-sv-black"></div>' +
        '<div class="qaq-color-sv-thumb" id="qaq-cp-sv-thumb"></div>' +
        '</div>' +
        '<div class="qaq-color-hue-wrap" id="qaq-cp-hue">' +
        '<div class="qaq-color-hue-thumb" id="qaq-cp-hue-thumb"></div>' +
        '</div>' +
'<div class="qaq-color-preview-row">' +
'<div class="qaq-color-preview-top">' +
'<div class="qaq-color-preview-swatch" id="qaq-cp-preview"></div>' +
'<input class="qaq-color-hex-input" id="qaq-cp-hex" type="text" maxlength="7" placeholder="#FF0000">' +
'</div>' +
'<div class="qaq-color-preview-btns">' +
'<button class="qaq-color-cancel-btn" id="qaq-cp-cancel">取消</button>' +
'<button class="qaq-color-confirm-btn" id="qaq-cp-ok">选好了</button>' +
'</div>' +
'</div>';

    container.innerHTML = html;

    var svWrap = document.getElementById('qaq-cp-sv');
    var svThumb = document.getElementById('qaq-cp-sv-thumb');
    var hueWrap = document.getElementById('qaq-cp-hue');
    var hueThumb = document.getElementById('qaq-cp-hue-thumb');
    var preview = document.getElementById('qaq-cp-preview');
    var hexInput = document.getElementById('qaq-cp-hex');

    function updateUI() {
        var hex = qaqHsvToHex(hue, sat, val);
        var pureHue = qaqHsvToHex(hue, 1, 1);
        svWrap.style.background = pureHue;
        svThumb.style.left = (sat * 100) + '%';
        svThumb.style.top = ((1 - val) * 100) + '%';
        svThumb.style.background = hex;
        hueThumb.style.left = (hue / 360 * 100) + '%';
        hueThumb.style.background = pureHue;
        preview.style.background = hex;
        hexInput.value = hex.toUpperCase();

        /* 高亮匹配的快捷色 */
        var swatches = container.querySelectorAll('.qaq-color-swatch-item');
        swatches.forEach(function (s) {
            s.classList.toggle('qaq-swatch-active', s.dataset.swatch.toUpperCase() === hex.toUpperCase());
        });
    }

    /* 色相条拖拽 */
    function hueMove(clientX) {
        var rect = hueWrap.getBoundingClientRect();
        var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        hue = (x / rect.width) * 360;
        updateUI();
    }
    hueWrap.addEventListener('mousedown', function (e) {
        e.preventDefault();
        hueMove(e.clientX);
        function onMove(ev) { hueMove(ev.clientX); }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
    hueWrap.addEventListener('touchstart', function (e) {
        hueMove(e.touches[0].clientX);
        function onMove(ev) { ev.preventDefault(); hueMove(ev.touches[0].clientX); }
        function onEnd() { hueWrap.removeEventListener('touchmove', onMove); hueWrap.removeEventListener('touchend', onEnd); }
        hueWrap.addEventListener('touchmove', onMove, { passive: false });
        hueWrap.addEventListener('touchend', onEnd);
    }, { passive: true });

    /* 饱和度/亮度拖拽 */
    function svMove(clientX, clientY) {
        var rect = svWrap.getBoundingClientRect();
        var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        var y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        sat = x / rect.width;
        val = 1 - (y / rect.height);
        updateUI();
    }
    svWrap.addEventListener('mousedown', function (e) {
        e.preventDefault();
        svMove(e.clientX, e.clientY);
        function onMove(ev) { svMove(ev.clientX, ev.clientY); }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
    svWrap.addEventListener('touchstart', function (e) {
        svMove(e.touches[0].clientX, e.touches[0].clientY);
        function onMove(ev) { ev.preventDefault(); svMove(ev.touches[0].clientX, ev.touches[0].clientY); }
        function onEnd() { svWrap.removeEventListener('touchmove', onMove); svWrap.removeEventListener('touchend', onEnd); }
        svWrap.addEventListener('touchmove', onMove, { passive: false });
        svWrap.addEventListener('touchend', onEnd);
    }, { passive: true });

    /* HEX 输入 */
    hexInput.addEventListener('input', function () {
        var v = this.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            var hsv = qaqHexToHsv(v);
            hue = hsv.h; sat = hsv.s; val = hsv.v;
            updateUI();
        }
    });

    /* 快捷色点击 */
    container.querySelector('#qaq-cp-swatches').addEventListener('click', function (e) {
        var item = e.target.closest('.qaq-color-swatch-item');
        if (!item) return;
        var c = item.dataset.swatch;
        var hsv = qaqHexToHsv(c);
        hue = hsv.h; sat = hsv.s; val = hsv.v;
        updateUI();
    });

    /* 确认 */
    document.getElementById('qaq-cp-ok').addEventListener('click', function () {
        var hex = qaqHsvToHex(hue, sat, val);
        onChange(hex);
    });
    
/* 取消 */
document.getElementById('qaq-cp-cancel').addEventListener('click', function () {
    if (onCancel) onCancel();
});

    updateUI();
}

/* ===== 计划页主题系统 ===== */
var qaqPlanThemePage = document.getElementById('qaq-plan-theme-page');

var qaqPlanAccentPresets = [
    { name: '暖阳', color: '#c47068' },
    { name: '蜜桃', color: '#e05565' },
    { name: '橘子', color: '#e88d4f' },
    { name: '柠檬', color: '#c4a820' },
    { name: '薄荷', color: '#4aaa6a' },
    { name: '天空', color: '#5b9bd5' },
    { name: '薰衣草', color: '#8b6cc1' },
    { name: '石墨', color: '#666666' }
];

function qaqApplyWidgetBg() {
    var widget = document.getElementById('qaq-plan-widget');
    if (!widget) return;
    var theme = qaqGetPlanTheme();

    /* 清除旧背景 */
    var oldBg = widget.querySelector('.qaq-plan-widget-bg');
    if (oldBg) oldBg.remove();
    widget.classList.remove('qaq-has-widget-bg');

    if (theme.widgetBg) {
        widget.classList.add('qaq-has-widget-bg');
        var op = (theme.widgetOpacity != null ? theme.widgetOpacity : 45) / 100;
        var bgDiv = document.createElement('div');
        bgDiv.className = 'qaq-plan-widget-bg';
        bgDiv.innerHTML =
            '<img src="' + theme.widgetBg + '">' +
            '<div style="position:absolute;inset:0;background:rgba(255,255,255,' + op + ');"></div>';
        widget.insertBefore(bgDiv, widget.firstChild);
        widget.style.background = 'transparent';
        widget.style.border = '1px solid rgba(255,255,255,0.3)';
    } else {
        widget.style.background = '';
        widget.style.border = '';
    }
}

function qaqApplyPlanTheme() {
    var theme = qaqGetPlanTheme();
    var bgEl = document.getElementById('qaq-plan-page-bg');
    var overlayEl = document.getElementById('qaq-plan-page-bg-overlay');

    /* 壁纸 */
    if (theme.wallpaper) {
        bgEl.style.backgroundImage = 'url(' + theme.wallpaper + ')';
        bgEl.style.display = '';
        var op = (theme.wallpaperOpacity || 30) / 100;
        overlayEl.style.background = 'rgba(0,0,0,' + op + ')';
        overlayEl.style.display = '';
    } else {
        bgEl.style.backgroundImage = '';
        bgEl.style.display = 'none';
        overlayEl.style.display = 'none';
    }

    /* 色系（用 CSS 变量） */
    var planPage = document.getElementById('qaq-plan-page');
    if (theme.accent) {
        planPage.style.setProperty('--qaq-accent', theme.accent);
        /* 动态修改按钮底色 */
        var addBtns = planPage.querySelectorAll('.qaq-plan-add-btn');
        addBtns.forEach(function (btn) {
            btn.style.background = 'linear-gradient(135deg, ' + theme.accent + '33, ' + theme.accent + '66)';
        });
        var dateActive = planPage.querySelectorAll('.qaq-plan-date-chip.qaq-date-active');
        dateActive.forEach(function (chip) {
            chip.style.background = 'linear-gradient(135deg, ' + theme.accent + '33, ' + theme.accent + '66)';
            chip.style.color = theme.accent;
        });
    } else {
        planPage.style.removeProperty('--qaq-accent');
        var addBtns2 = planPage.querySelectorAll('.qaq-plan-add-btn');
        addBtns2.forEach(function (btn) { btn.style.background = ''; });
    }
}

/* 打开主题页 */
document.getElementById('qaq-plan-theme-btn').addEventListener('click', function () {
    qaqRenderPlanThemePage();
    qaqSwitchTo(qaqPlanThemePage);
});

document.getElementById('qaq-plan-theme-back').addEventListener('click', function () {
    qaqGoBackTo(planPage, qaqPlanThemePage);
    qaqApplyPlanTheme();
    qaqApplyWidgetBg();
    qaqRenderPlanCards();
});

function qaqRenderPlanThemePage() {
    var theme = qaqGetPlanTheme();

    /* ---- 壁纸预览（带遮罩） ---- */
    var wpPreview = document.getElementById('qaq-pt-wallpaper-preview');
    if (theme.wallpaper) {
        var wpOp = (theme.wallpaperOpacity != null ? theme.wallpaperOpacity : 30) / 100;
        wpPreview.innerHTML =
            '<img src="' + theme.wallpaper + '">' +
            '<div class="qaq-preview-overlay" id="qaq-pt-wp-overlay" style="background:rgba(0,0,0,' + wpOp + ');"></div>';
    } else {
        wpPreview.innerHTML = '<div class="qaq-wp-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>点击下方按钮设置壁纸</div>';
    }

    /* 壁纸透明度滑块 */
    var opSlider = document.getElementById('qaq-pt-wp-opacity');
    var opVal = document.getElementById('qaq-pt-wp-opacity-val');
    opSlider.value = theme.wallpaperOpacity != null ? theme.wallpaperOpacity : 30;
    opVal.textContent = opSlider.value + '%';

    /* ---- 卡片预览（带遮罩） ---- */
    var cardPreview = document.getElementById('qaq-pt-card-preview');
    if (theme.cardBg) {
        var cardOp = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
        cardPreview.innerHTML =
            '<img src="' + theme.cardBg + '">' +
            '<div class="qaq-preview-overlay" id="qaq-pt-card-overlay" style="background:rgba(255,255,255,' + cardOp + ');"></div>';
    } else {
        cardPreview.innerHTML = '<div class="qaq-wp-placeholder" style="font-size:11px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>未设置</div>';
    }

    /* 卡片透明度滑块 */
    var cardOpSlider = document.getElementById('qaq-pt-card-opacity');
    var cardOpVal = document.getElementById('qaq-pt-card-opacity-val');
    cardOpSlider.value = theme.cardOpacity != null ? theme.cardOpacity : 55;
    cardOpVal.textContent = cardOpSlider.value + '%';

    /* ---- 小组件预览（带遮罩） ---- */
    var widgetPreview = document.getElementById('qaq-pt-widget-preview');
    if (widgetPreview) {
        if (theme.widgetBg) {
            var wOp = (theme.widgetOpacity != null ? theme.widgetOpacity : 45) / 100;
            widgetPreview.innerHTML =
                '<img src="' + theme.widgetBg + '">' +
                '<div class="qaq-preview-overlay" id="qaq-pt-widget-overlay" style="background:rgba(255,255,255,' + wOp + ');"></div>';
        } else {
            widgetPreview.innerHTML = '<div class="qaq-wp-placeholder" style="font-size:11px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>未设置</div>';
        }
        var wSlider = document.getElementById('qaq-pt-widget-opacity');
        var wVal = document.getElementById('qaq-pt-widget-opacity-val');
        if (wSlider) {
            wSlider.value = theme.widgetOpacity != null ? theme.widgetOpacity : 45;
            wVal.textContent = wSlider.value + '%';
        }
    }

    /* ---- 色系行 ---- */
    var accentRow = document.getElementById('qaq-pt-accent-row');
    var accentHtml = '';
    qaqPlanAccentPresets.forEach(function (p) {
        var sel = theme.accent && theme.accent.toLowerCase() === p.color.toLowerCase();
        accentHtml += '<div class="qaq-theme-accent-dot' + (sel ? ' qaq-accent-active' : '') + '" data-accent="' + p.color + '" style="background:' + p.color + ';" title="' + p.name + '"></div>';
    });
    var matchPreset = qaqPlanAccentPresets.some(function (p) {
        return theme.accent && theme.accent.toLowerCase() === p.color.toLowerCase();
    });
    var customStyle = (!matchPreset && theme.accent) ? 'background:' + theme.accent + ';' : '';
    accentHtml += '<div class="qaq-cat-color-custom' + (!matchPreset && theme.accent ? ' qaq-accent-active' : '') + '" id="qaq-pt-accent-custom" style="width:32px;height:32px;border-width:3px;' + customStyle + '"></div>';
    accentRow.innerHTML = accentHtml;
}

/* 壁纸上传 */
document.getElementById('qaq-pt-wp-upload').addEventListener('click', function () {
    qaqEditImage('设置页面壁纸', function (src) {
        var theme = qaqGetPlanTheme();
        theme.wallpaper = src;
        qaqSavePlanTheme(theme);
        qaqRenderPlanThemePage();
        qaqApplyPlanTheme();
        qaqToast('壁纸已设置');
    });
});

document.getElementById('qaq-pt-wp-clear').addEventListener('click', function () {
    var theme = qaqGetPlanTheme();
    theme.wallpaper = '';
    qaqSavePlanTheme(theme);
    qaqRenderPlanThemePage();
    qaqApplyPlanTheme();
    qaqToast('壁纸已清除');
});

/* 壁纸透明度 */
document.getElementById('qaq-pt-wp-opacity').addEventListener('input', function () {
    document.getElementById('qaq-pt-wp-opacity-val').textContent = this.value + '%';
    var overlay = document.getElementById('qaq-pt-wp-overlay');
    if (overlay) overlay.style.background = 'rgba(0,0,0,' + (this.value / 100) + ')';
});

document.getElementById('qaq-pt-wp-opacity').addEventListener('change', function () {
    var theme = qaqGetPlanTheme();
    theme.wallpaperOpacity = parseInt(this.value, 10);
    qaqSavePlanTheme(theme);
    qaqApplyPlanTheme();
});

/* 卡片背景上传 */
document.getElementById('qaq-pt-card-upload').addEventListener('click', function () {
    qaqEditImage('设置卡片背景', function (src) {
        var theme = qaqGetPlanTheme();
        theme.cardBg = src;
        qaqSavePlanTheme(theme);
        qaqRenderPlanThemePage();
        qaqToast('卡片背景已设置');
    });
});

document.getElementById('qaq-pt-card-clear').addEventListener('click', function () {
    var theme = qaqGetPlanTheme();
    theme.cardBg = '';
    qaqSavePlanTheme(theme);
    qaqRenderPlanThemePage();
    qaqToast('卡片背景已清除');
});

/* 卡片透明度 */
document.getElementById('qaq-pt-card-opacity').addEventListener('input', function () {
    document.getElementById('qaq-pt-card-opacity-val').textContent = this.value + '%';
    var overlay = document.getElementById('qaq-pt-card-overlay');
    if (overlay) overlay.style.background = 'rgba(255,255,255,' + (this.value / 100) + ')';
});

document.getElementById('qaq-pt-card-opacity').addEventListener('change', function () {
    var theme = qaqGetPlanTheme();
    theme.cardOpacity = parseInt(this.value, 10);
    qaqSavePlanTheme(theme);
});

/* ===== 小组件背景上传 ===== */
document.getElementById('qaq-pt-widget-upload').addEventListener('click', function () {
    qaqEditImage('设置小组件背景', function (src) {
        var theme = qaqGetPlanTheme();
        theme.widgetBg = src;
        qaqSavePlanTheme(theme);
        qaqRenderPlanThemePage();
        qaqApplyWidgetBg();
        qaqToast('小组件背景已设置');
    });
});

document.getElementById('qaq-pt-widget-clear').addEventListener('click', function () {
    var theme = qaqGetPlanTheme();
    theme.widgetBg = '';
    qaqSavePlanTheme(theme);
    qaqRenderPlanThemePage();
    qaqApplyWidgetBg();
    qaqToast('小组件背景已清除');
});

document.getElementById('qaq-pt-widget-opacity').addEventListener('input', function () {
    document.getElementById('qaq-pt-widget-opacity-val').textContent = this.value + '%';
    var overlay = document.getElementById('qaq-pt-widget-overlay');
    if (overlay) overlay.style.background = 'rgba(255,255,255,' + (this.value / 100) + ')';
});

document.getElementById('qaq-pt-widget-opacity').addEventListener('change', function () {
    var theme = qaqGetPlanTheme();
    theme.widgetOpacity = parseInt(this.value, 10);
    qaqSavePlanTheme(theme);
    qaqApplyWidgetBg();
});

/* 色系选择 */
document.getElementById('qaq-pt-accent-row').addEventListener('click', function (e) {
    var dot = e.target.closest('.qaq-theme-accent-dot');
    if (dot) {
        this.querySelectorAll('.qaq-theme-accent-dot').forEach(function (d) { d.classList.remove('qaq-accent-active'); });
        var customBtn = document.getElementById('qaq-pt-accent-custom');
        if (customBtn) customBtn.classList.remove('qaq-accent-active');
        dot.classList.add('qaq-accent-active');
        var theme = qaqGetPlanTheme();
        theme.accent = dot.dataset.accent;
        qaqSavePlanTheme(theme);
        qaqApplyPlanTheme();
        qaqToast('色系已切换');
        document.getElementById('qaq-pt-accent-panel').classList.remove('qaq-cat-color-panel-show');
        return;
    }

    var custom = e.target.closest('.qaq-cat-color-custom');
    if (custom) {
        this.querySelectorAll('.qaq-theme-accent-dot').forEach(function (d) { d.classList.remove('qaq-accent-active'); });
        custom.classList.add('qaq-accent-active');
        var panel = document.getElementById('qaq-pt-accent-panel');
        if (panel.classList.contains('qaq-cat-color-panel-show')) {
            panel.classList.remove('qaq-cat-color-panel-show');
        } else {
            panel.classList.add('qaq-cat-color-panel-show');
            var curTheme = qaqGetPlanTheme();
            qaqCreateColorPicker(panel, curTheme.accent || '#c47068', function (hex) {
                curTheme = qaqGetPlanTheme();
                curTheme.accent = hex;
                qaqSavePlanTheme(curTheme);
                custom.style.background = hex;
                panel.classList.remove('qaq-cat-color-panel-show');
                qaqApplyPlanTheme();
                qaqToast('色系已设置');
            }, function () {
                panel.classList.remove('qaq-cat-color-panel-show');
                custom.classList.remove('qaq-accent-active');
            });
        }
    }
});

/* 重置 */
document.getElementById('qaq-pt-reset').addEventListener('click', function () {
    qaqConfirm('恢复默认', '确认恢复计划页面为默认主题？', function () {
        localStorage.removeItem('qaq-plan-theme');
        qaqApplyPlanTheme();
        qaqApplyWidgetBg();
        qaqRenderPlanThemePage();
        qaqRenderPlanCards();
        qaqToast('已恢复默认');
    });
});

/* ===== 词库主题系统 ===== */
var qaqWordbankThemePage = document.getElementById('qaq-wordbank-theme-page');

function qaqApplyWordbankTheme() {
    var theme = qaqGetWordbankTheme();

    var pageBg = document.getElementById('qaq-wordbank-page-bg');
    var pageOverlay = document.getElementById('qaq-wordbank-page-bg-overlay');
    var detailBg = document.getElementById('qaq-wordbook-detail-page-bg');
    var detailOverlay = document.getElementById('qaq-wordbook-detail-page-bg-overlay');

    if (theme.appBg) {
        if (pageBg) {
            pageBg.style.backgroundImage = 'url(' + theme.appBg + ')';
            pageBg.style.display = '';
        }
        if (detailBg) {
            detailBg.style.backgroundImage = 'url(' + theme.appBg + ')';
            detailBg.style.display = '';
        }

        var op = (theme.appOpacity != null ? theme.appOpacity : 30) / 100;
        if (pageOverlay) {
            pageOverlay.style.background = 'rgba(0,0,0,' + op + ')';
            pageOverlay.style.display = '';
        }
        if (detailOverlay) {
            detailOverlay.style.background = 'rgba(0,0,0,' + op + ')';
            detailOverlay.style.display = '';
        }
    } else {
        if (pageBg) {
            pageBg.style.backgroundImage = '';
            pageBg.style.display = 'none';
        }
        if (detailBg) {
            detailBg.style.backgroundImage = '';
            detailBg.style.display = 'none';
        }
        if (pageOverlay) pageOverlay.style.display = 'none';
        if (detailOverlay) detailOverlay.style.display = 'none';
    }
}
// ★ 找到 function qaqApplyWordbankCardTheme() 前面，加这段
var _qaqCardThemeTimer = null;
function qaqApplyWordbankCardThemeDebounced() {
    clearTimeout(_qaqCardThemeTimer);
    _qaqCardThemeTimer = setTimeout(qaqApplyWordbankCardTheme, 150);
}
function qaqApplyWordbankCardTheme() {
    var theme = qaqGetWordbankTheme();
    var cardBg = theme.cardBg || '';
    var opacity = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
    var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
    var overlayColor = isDark ? 'rgba(0,0,0,' + opacity + ')' : 'rgba(255,255,255,' + opacity + ')';

    function applyToCards(selector) {
        var cards = document.querySelectorAll(selector);
        cards.forEach(function (card) {
            var oldBg = card.querySelector('.qaq-wordbank-card-custom-bg');

            if (!cardBg) {
                if (oldBg) oldBg.remove();
                card.classList.remove('qaq-has-custom-bg');
                card.style.background = '';
                card.style.border = '';
                return;
            }

            if (!oldBg) {
                oldBg = document.createElement('div');
                oldBg.className = 'qaq-wordbank-card-custom-bg';
                oldBg.innerHTML =
                    '<img src="' + cardBg + '">' +
                    '<div class="qaq-wordbank-card-custom-overlay"></div>';
                card.insertBefore(oldBg, card.firstChild);
            } else {
                var img = oldBg.querySelector('img');
                if (img && img.getAttribute('src') !== cardBg) {
                    img.setAttribute('src', cardBg);
                }
            }

            var overlay = oldBg.querySelector('.qaq-wordbank-card-custom-overlay');
            if (overlay) {
                overlay.style.background = overlayColor;
            }

            card.classList.add('qaq-has-custom-bg');
            card.style.background = 'transparent';
            card.style.border = '1px solid rgba(255,255,255,0.3)';
        });
    }

    applyToCards('.qaq-wordbook-card');
    applyToCards('.qaq-word-entry-card');
}
function qaqRenderWordbankThemePage() {
    var theme = qaqGetWordbankTheme();

    var appPreview = document.getElementById('qaq-wbt-app-preview');
    if (theme.appBg) {
        var op = (theme.appOpacity != null ? theme.appOpacity : 30) / 100;
        appPreview.innerHTML =
            '<img src="' + theme.appBg + '">' +
            '<div class="qaq-preview-overlay" id="qaq-wbt-app-overlay" style="background:rgba(0,0,0,' + op + ');"></div>';
    } else {
        appPreview.innerHTML =
            '<div class="qaq-wp-placeholder">' +
                '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">' +
                    '<rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/>' +
                    '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                    '<path d="M21 15l-5-5L5 21"/>' +
                '</svg>点击下方按钮设置背景' +
            '</div>';
    }

    document.getElementById('qaq-wbt-app-opacity').value = theme.appOpacity != null ? theme.appOpacity : 30;
    document.getElementById('qaq-wbt-app-opacity-val').textContent =
        document.getElementById('qaq-wbt-app-opacity').value + '%';

    var cardPreview = document.getElementById('qaq-wbt-card-preview');
    if (theme.cardBg) {
        var cardOp = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
        var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
        var cardOverlayColor = isDark
            ? 'rgba(0,0,0,' + cardOp + ')'
            : 'rgba(255,255,255,' + cardOp + ')';

        cardPreview.innerHTML =
            '<img src="' + theme.cardBg + '">' +
            '<div class="qaq-preview-overlay" id="qaq-wbt-card-overlay" style="background:' + cardOverlayColor + ';"></div>';
    } else {
        cardPreview.innerHTML =
            '<div class="qaq-wp-placeholder" style="font-size:11px;">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">' +
                    '<rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/>' +
                    '<circle cx="8.5" cy="8.5" r="1.5"/>' +
                    '<path d="M21 15l-5-5L5 21"/>' +
                '</svg>未设置' +
            '</div>';
    }

    document.getElementById('qaq-wbt-card-opacity').value = theme.cardOpacity != null ? theme.cardOpacity : 55;
    document.getElementById('qaq-wbt-card-opacity-val').textContent =
        document.getElementById('qaq-wbt-card-opacity').value + '%';
}

document.getElementById('qaq-wordbank-theme-btn').addEventListener('click', function () {
    qaqRenderWordbankThemePage();
    qaqSwitchTo(qaqWordbankThemePage);
});

document.getElementById('qaq-wordbank-theme-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, qaqWordbankThemePage);
    qaqApplyWordbankTheme();
    qaqApplyWordbankCardTheme();
});

/* APP背景上传 */
document.getElementById('qaq-wbt-app-upload').addEventListener('click', function () {
    qaqEditImage('设置词库 APP 背景', function (src) {
        var theme = qaqGetWordbankTheme();
        theme.appBg = src;
        qaqSaveWordbankTheme(theme);
        qaqRenderWordbankThemePage();
        qaqApplyWordbankTheme();
        qaqToast('词库背景已设置');
    });
});

document.getElementById('qaq-wbt-app-clear').addEventListener('click', function () {
    var theme = qaqGetWordbankTheme();
    theme.appBg = '';
    qaqSaveWordbankTheme(theme);
    qaqRenderWordbankThemePage();
    qaqApplyWordbankTheme();
    qaqToast('词库背景已清除');
});

document.getElementById('qaq-wbt-app-opacity').addEventListener('input', function () {
    document.getElementById('qaq-wbt-app-opacity-val').textContent = this.value + '%';
    var overlay = document.getElementById('qaq-wbt-app-overlay');
    if (overlay) overlay.style.background = 'rgba(0,0,0,' + (this.value / 100) + ')';
});

document.getElementById('qaq-wbt-app-opacity').addEventListener('change', function () {
    var theme = qaqGetWordbankTheme();
    theme.appOpacity = parseInt(this.value, 10);
    qaqSaveWordbankTheme(theme);
    qaqApplyWordbankTheme();
});

/* 卡片背景上传 */
document.getElementById('qaq-wbt-card-upload').addEventListener('click', function () {
    qaqEditImage('设置词库卡片背景', function (src) {
        var theme = qaqGetWordbankTheme();
        theme.cardBg = src;
        qaqSaveWordbankTheme(theme);
        qaqRenderWordbankThemePage();
        qaqApplyWordbankCardTheme();
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        if (qaqCurrentWordbookId) {
            qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
        }
        qaqApplyWordbankCardThemeDebounced();
        qaqToast('卡片背景已设置');
    });
});

document.getElementById('qaq-wbt-card-clear').addEventListener('click', function () {
    var theme = qaqGetWordbankTheme();
    theme.cardBg = '';
    qaqSaveWordbankTheme(theme);
    qaqRenderWordbankThemePage();
    qaqApplyWordbankCardTheme();
    qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
    if (qaqCurrentWordbookId) {
        qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    }
    qaqApplyWordbankCardThemeDebounced();
    qaqToast('卡片背景已清除');
});

document.getElementById('qaq-wbt-card-opacity').addEventListener('input', function () {
    document.getElementById('qaq-wbt-card-opacity-val').textContent = this.value + '%';

    var overlay = document.getElementById('qaq-wbt-card-overlay');
    if (overlay) {
        var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');
        overlay.style.background = isDark
            ? 'rgba(0,0,0,' + (this.value / 100) + ')'
            : 'rgba(255,255,255,' + (this.value / 100) + ')';
    }
});

document.getElementById('qaq-wbt-card-opacity').addEventListener('change', function () {
    var theme = qaqGetWordbankTheme();
    theme.cardOpacity = parseInt(this.value, 10);
    qaqSaveWordbankTheme(theme);
    qaqApplyWordbankCardThemeDebounced();
});

/* 重置 */
document.getElementById('qaq-wbt-reset').addEventListener('click', function () {
    qaqConfirm('恢复默认', '确认恢复词库主题为默认？', function () {
        localStorage.removeItem('qaq-wordbank-theme');
        qaqRenderWordbankThemePage();
        qaqApplyWordbankTheme();
        qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
        if (qaqCurrentWordbookId) {
            qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
        }
        qaqApplyWordbankCardThemeDebounced();
        qaqToast('已恢复默认');
    });
});

/* ===== 背单词第一阶段 ===== */
var qaqWordReviewPage = document.getElementById('qaq-word-review-page');

var qaqReviewSession = {
    bookId: '',
    bookName: '',
    queue: [],
    current: null,
    history: [],
    roundTotal: 0,
    shownMeaning: false,
    pendingLevel: '',
    stats: {
        unknown: 0,
        vague: 0,
        known: 0
    }
};

var qaqReviewSettingsPage = document.getElementById('qaq-review-settings-page');

function qaqOpenReviewSettingsPage() {
    var settings = qaqGetReviewSettings();

    document.getElementById('qaq-rs-count').value = settings.roundCount || 20;
    document.getElementById('qaq-rs-rate').value = settings.speechRate || 0.9;
    document.getElementById('qaq-rs-story-word-count').value = settings.storyWordCount || 800;
    document.getElementById('qaq-rs-provider').value = settings.apiProvider || 'openai';
    document.getElementById('qaq-rs-api-url').value = settings.apiUrl || '';
    document.getElementById('qaq-rs-api-key').value = settings.apiKey || '';
    document.getElementById('qaq-rs-api-model').value = settings.apiModel || '';
    document.getElementById('qaq-rs-minimax-group').value = settings.minimaxGroupId || '';

    var toggleMap = {
        'qaq-rs-random': settings.random,
        'qaq-rs-auto-pronounce': settings.autoPronounce,
        'qaq-rs-show-phonetic': settings.showPhonetic,
        'qaq-rs-show-example': settings.showExample,
        'qaq-rs-skip-marked': settings.skipMarked
    };

    Object.keys(toggleMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('qaq-toggle-on',!!toggleMap[id]);
    });

    qaqRsUpdateProviderUI();
    qaqRsRenderModelSelect(qaqGetReviewModelCache(
        document.getElementById('qaq-rs-provider').value,
        document.getElementById('qaq-rs-api-url').value.trim()
    ));

    qaqSwitchTo(qaqReviewSettingsPage);
}

function qaqRsUpdateProviderUI() {
    var provider = document.getElementById('qaq-rs-provider').value;
    document.getElementById('qaq-rs-minimax-group').style.display = provider === 'minimax-native' ? '' : 'none';
    document.getElementById('qaq-rs-minimax-group-label').style.display = provider === 'minimax-native' ? '' : 'none';
}

function qaqRsRenderModelSelect(models) {
    var select = document.getElementById('qaq-rs-model-select');
    var currentModel = document.getElementById('qaq-rs-api-model').value.trim();
    select.innerHTML = '<option value="">选择已拉取模型</option>';
    (models || []).forEach(function (model) {
        var opt = document.createElement('option');
        opt.value = model;
        opt.textContent = model;
        if (model === currentModel) opt.selected = true;
        select.appendChild(opt);
    });
}

function qaqRsSaveSettings() {
    var settings = qaqGetReviewSettings();
    settings.roundCount = Math.max(1, parseInt(document.getElementById('qaq-rs-count').value, 10) || 20);
    settings.random = document.getElementById('qaq-rs-random').classList.contains('qaq-toggle-on');
    settings.autoPronounce = document.getElementById('qaq-rs-auto-pronounce').classList.contains('qaq-toggle-on');
    settings.speechRate = Math.max(0.6, Math.min(1.2, parseFloat(document.getElementById('qaq-rs-rate').value) || 0.9));
    settings.showPhonetic = document.getElementById('qaq-rs-show-phonetic').classList.contains('qaq-toggle-on');
    settings.showExample = document.getElementById('qaq-rs-show-example').classList.contains('qaq-toggle-on');
    settings.skipMarked = document.getElementById('qaq-rs-skip-marked').classList.contains('qaq-toggle-on');
    settings.storyWordCount = Math.max(100, Math.min(5000, parseInt(document.getElementById('qaq-rs-story-word-count').value, 10) || 800));
    settings.apiProvider = document.getElementById('qaq-rs-provider').value;
    settings.apiUrl = document.getElementById('qaq-rs-api-url').value.trim();
    settings.apiKey = document.getElementById('qaq-rs-api-key').value.trim();
    settings.apiModel = document.getElementById('qaq-rs-api-model').value.trim();
    settings.minimaxGroupId = document.getElementById('qaq-rs-minimax-group').value.trim();
    qaqSaveReviewSettings(settings);

    if (qaqReviewSession.current) qaqRenderCurrentReviewWord();
    if (document.getElementById('qaq-review-story-word-count')) {
        document.getElementById('qaq-review-story-word-count').value = settings.storyWordCount || 800;
    }

    qaqToast('设置已保存');
}

document.getElementById('qaq-review-settings-back').addEventListener('click', function () {
    qaqRsSaveSettings();
    qaqGoBackTo(wordbankPage, qaqReviewSettingsPage);
});

document.getElementById('qaq-rs-save-btn').addEventListener('click', function () {
    qaqRsSaveSettings();
    qaqGoBackTo(wordbankPage, qaqReviewSettingsPage);
});

document.getElementById('qaq-rs-provider').addEventListener('change', qaqRsUpdateProviderUI);

document.getElementById('qaq-rs-model-select').addEventListener('change', function () {
    if (this.value) document.getElementById('qaq-rs-api-model').value = this.value;
});

document.getElementById('qaq-rs-fetch-models-btn').addEventListener('click', async function () {
    var provider = document.getElementById('qaq-rs-provider').value;
    var apiUrl = document.getElementById('qaq-rs-api-url').value.trim();
    var apiKey = document.getElementById('qaq-rs-api-key').value.trim();

    try {
        this.disabled = true;
        this.textContent = '拉取中...';
        var models = await qaqFetchReviewModels(provider, apiUrl, apiKey);
        qaqSaveReviewModelCache(provider, apiUrl, models);
        qaqRsRenderModelSelect(models);

        if (models.length && !document.getElementById('qaq-rs-api-model').value.trim()) {
            document.getElementById('qaq-rs-api-model').value = models[0];document.getElementById('qaq-rs-model-select').value = models[0];
        }
        qaqToast('模型拉取成功');
    } catch (err) {
        console.error(err);
        qaqToast(err.message || '拉取模型失败');
    } finally {
        this.disabled = false;
        this.textContent = '拉取模型';
    }
});

['qaq-rs-random', 'qaq-rs-auto-pronounce', 'qaq-rs-show-phonetic', 'qaq-rs-show-example', 'qaq-rs-skip-marked'].forEach(function (id) {
    document.getElementById(id + '-row').addEventListener('click', function () {
        document.getElementById(id).classList.toggle('qaq-toggle-on');
    });
});

/* ===== 背单词会话存储 ===== */
function qaqSaveCurrentReviewSession() {
    if (!qaqReviewSession || !qaqReviewSession.bookId) return;

    var copy = JSON.parse(JSON.stringify(qaqReviewSession));
    copy.updatedAt = Date.now();
    localStorage.setItem('qaq-word-review-last-session', JSON.stringify(copy));
}

function qaqGetCurrentReviewSession() {
    return JSON.parse(localStorage.getItem('qaq-word-review-last-session') || 'null');
}

function qaqClearCurrentReviewSession() {
    localStorage.removeItem('qaq-word-review-last-session');
}

function qaqSaveLastFinishedReview(data) {
    localStorage.setItem('qaq-word-review-last-finished', JSON.stringify(data || null));
}

function qaqGetLastFinishedReview() {
    return JSON.parse(localStorage.getItem('qaq-word-review-last-finished') || 'null');
}

async function qaqGenerateWordStudyDataForItem(wordObj, cfg) {
    var prompt =
        '请为下面这个英语单词补全学习信息，并只返回 JSON，不要返回多余解释。\n' +
        '单词：' + wordObj.word + '\n' +
        '已知释义：' + (wordObj.meaning || '无') + '\n\n' +
        '返回格式：\n' +
        '{\n' +
        '  "phonetic": "音标",\n' +
        '  "example": "简短英文例句",\n' +
        '  "exampleCn": "例句中文翻译"\n' +
        '}\n\n' +
        '要求：\n' +
        '1. 音标尽量标准\n' +
        '2. 例句自然、简短，适合四六级学习\n' +
        '3. 中文翻译准确\n' +
        '4. 只返回 JSON';

    var content = '';

    if (cfg.provider === 'openai' || cfg.provider === 'minimax-openai') {
        content = await qaqReviewGenerateByOpenAICompatible(cfg, prompt);
    } else if (cfg.provider === 'minimax-native') {
        content = await qaqReviewGenerateByMiniMaxNative(cfg, prompt);
    } else {
        throw new Error('不支持的 provider');
    }

    var parsed = qaqExtractJsonBlock(content);
    if (!parsed) {
        throw new Error('模型返回内容无法解析为 JSON');
    }

    return {
        phonetic: parsed.phonetic || '',
        example: parsed.example || '',
        exampleCn: parsed.exampleCn || ''
    };
}

async function qaqGenerateRoundStudyData(words) {
    var cfg = qaqGetReviewApiConfig();
    if (!cfg.key || !cfg.model) {
        throw new Error('请先填写 API Key 和 Model');
    }
    if ((cfg.provider === 'openai' || cfg.provider === 'minimax-openai') && !cfg.url) {
        throw new Error('请先填写兼容接口 URL');
    }

    var total = words.length;
    qaqShowImportProgress('正在生成学习内容', '正在为本轮单词生成音标和例句...');
    qaqUpdateImportProgress(0, '准备开始...');

    for (var i = 0; i < words.length; i++) {
        var item = words[i];

        /* 已有完整内容就跳过 */
        if (item.phonetic && item.example && item.exampleCn) {
            var skipPercent = Math.round(((i + 1) / total) * 100);
            qaqUpdateImportProgress(skipPercent, '跳过已有内容：' + item.word);
            continue;
        }

        try {
            var generated = await qaqGenerateWordStudyDataForItem(item, cfg);
            item.phonetic = generated.phonetic || item.phonetic || '';
            item.example = generated.example || item.example || '';
            item.exampleCn = generated.exampleCn || item.exampleCn || '';
            qaqPersistGeneratedWordData(item);
        } catch (err) {
            console.error('生成失败: ', item.word, err);
        }

        var percent = Math.round(((i + 1) / total) * 100);
        qaqUpdateImportProgress(percent, '正在生成：' + item.word);

        await new Promise(function (resolve) { setTimeout(resolve, 80); });
    }

    setTimeout(qaqHideImportProgress, 180);
}

/* ===== 背单词朗读优化 ===== */
var qaqSpeechVoiceCache = null;

function qaqLoadSpeechVoices() {
    if (!('speechSynthesis' in window)) return [];
    var voices = speechSynthesis.getVoices() || [];
    if (voices.length) qaqSpeechVoiceCache = voices;
    return voices;
}

function qaqPickEnglishVoice() {
    var voices = qaqLoadSpeechVoices();
    if (!voices.length && qaqSpeechVoiceCache) voices = qaqSpeechVoiceCache;

    if (!voices || !voices.length) return null;

    return (
        voices.find(function (v) { return /en-US/i.test(v.lang) && /female|samantha|zira|aria|jenny|google/i.test(v.name); }) ||
        voices.find(function (v) { return /en-GB/i.test(v.lang) && /female|serena|libby|google/i.test(v.name); }) ||
        voices.find(function (v) { return /en-US/i.test(v.lang); }) ||
        voices.find(function (v) { return /^en/i.test(v.lang); }) ||
        null
    );
}

function qaqSpeakWord(text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
        return qaqToast('当前设备不支持朗读');
    }

    var settings = qaqGetReviewSettings();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = Math.max(0.6, Math.min(1.2, Number(settings.speechRate || 0.9)));
    utter.pitch = 1;
    utter.volume = 1;

    var voice = qaqPickEnglishVoice();
    if (voice) utter.voice = voice;

    speechSynthesis.cancel();

    setTimeout(function () {
        try {
            speechSynthesis.speak(utter);
        } catch (e) {
            console.error(e);
            qaqToast('朗读失败');
        }
    }, 30);
}

if ('speechSynthesis' in window) {
    qaqLoadSpeechVoices();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
        speechSynthesis.onvoiceschanged = function () {
            qaqLoadSpeechVoices();
        };
    }
}

function qaqShuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

function qaqRenderReviewHome() {
    var listEl = document.getElementById('qaq-review-book-list');
    var emptyEl = document.getElementById('qaq-review-book-empty');
    var statsEl = document.getElementById('qaq-review-home-stats');
    if (!listEl) return;

    statsEl.textContent = '背单词';

    /* 继续上次 */
    var continueCard = document.getElementById('qaq-review-continue-card');
    var continueMeta = document.getElementById('qaq-review-continue-meta');
    var continueCount = document.getElementById('qaq-review-continue-count');
    var lastSession = qaqGetCurrentReviewSession();

    continueCard.classList.remove('qaq-disabled');
    if (lastSession && lastSession.bookId && (lastSession.current || (lastSession.queue && lastSession.queue.length))) {
        var leftCount = (lastSession.queue ? lastSession.queue.length : 0) + (lastSession.current ? 1 : 0);
        continueMeta.textContent = '词库：' + (lastSession.bookName || '未知词库');
        continueCount.textContent = '剩余 ' + leftCount + ' / ' + (lastSession.roundTotal || leftCount) + ' 个';
    } else {
        continueMeta.textContent = '暂无未完成学习';
        continueCount.textContent = '点击继续学习';
        continueCard.classList.add('qaq-disabled');
    }

    /* 复习上次 */
    var repeatCard = document.getElementById('qaq-review-repeat-card');
    var repeatMeta = document.getElementById('qaq-review-repeat-meta');
    var repeatCount = document.getElementById('qaq-review-repeat-count');
    var lastFinished = qaqGetLastFinishedReview();

    repeatCard.classList.remove('qaq-disabled');
    if (lastFinished && lastFinished.bookId && lastFinished.words && lastFinished.words.length) {
        repeatMeta.textContent = '词库：' + (lastFinished.bookName || '未知词库');
        repeatCount.textContent = '上次完成 ' + lastFinished.words.length + ' 个，点击复习';
    } else {
        repeatMeta.textContent = '暂无上次完成记录';
        repeatCount.textContent = '点击重新复习';
        repeatCard.classList.add('qaq-disabled');
    }

    /* 词库列表 */
    var books = qaqGetWordbooks().filter(function (book) {
        return book.words && book.words.length;
    });

    listEl.innerHTML = '';

    if (!books.length) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    books.forEach(function (book) {
        var div = document.createElement('div');
        div.className = 'qaq-wordbook-card';
        div.innerHTML =
            '<div class="qaq-wordbook-card-name">' + book.name + '</div>' +
            '<div class="qaq-wordbook-card-meta">点击开始新一轮学习</div>' +
            '<div class="qaq-wordbook-card-count">共 ' + (book.words ? book.words.length : 0) + ' 条</div>';

        div.addEventListener('click', function () {
            qaqOpenReviewStartModal(book);
        });

        listEl.appendChild(div);
    });

    continueCard.onclick = function () {
        var session = qaqGetCurrentReviewSession();
        if (!session || !session.bookId) return;
        qaqReviewSession = session;
        qaqSwitchTo(qaqWordReviewPage);
        qaqRenderCurrentReviewWord();
    };

    repeatCard.onclick = function () {
        var finished = qaqGetLastFinishedReview();
        if (!finished || !finished.words || !finished.words.length) return;

        qaqReviewSession = {
            bookId: finished.bookId,
            bookName: finished.bookName,
            queue: finished.words.slice(),
            current: null,
            history: [],
            roundTotal: finished.words.length,
            shownMeaning: false,
            pendingLevel: '',
            stats: {
                unknown: 0,
                vague: 0,
                known: 0
            }
        };

        qaqSwitchTo(qaqWordReviewPage);
        qaqReviewGoNext();
    };
}

function qaqOpenReviewStartModal(book) {
    var settings = qaqGetReviewSettings();

    var sourceWords = (book.words || []).slice();
    if (settings.skipMarked) {
        sourceWords = sourceWords.filter(function (w) {
            return !qaqIsMarkedWord(book.id, w.id);
        });
    }

    var availableCount = sourceWords.length;

    if (!availableCount) {
        return qaqToast('这本词库没有可背的单词了');
    }

    modalTitle.textContent = '开始新一轮';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">词库</div>' +
            '<input class="qaq-plan-form-input" type="text" value="' + book.name.replace(/"/g, '&quot;') + '" disabled>' +
            '<div class="qaq-plan-form-label">可背单词</div>' +
            '<input class="qaq-plan-form-input" type="text" value="' + availableCount + ' 个' + (settings.skipMarked ? '（已跳过标记）' : '') + '" disabled>' +
            '<div class="qaq-plan-form-label">本轮背多少单词</div>' +
            '<input class="qaq-plan-form-input" id="qaq-review-round-count" type="number" min="1" max="' + availableCount + '" value="' + Math.min(settings.roundCount || 20, availableCount) + '">' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#666;">' +
                '<input type="checkbox" id="qaq-review-round-generate" checked> 开始前生成本轮音标和例句' +
            '</label>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">开始</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = async function () {
        var count = parseInt(document.getElementById('qaq-review-round-count').value, 10) || 20;
        var needGenerate = document.getElementById('qaq-review-round-generate').checked;
        count = Math.max(1, Math.min(count, availableCount));

        settings.roundCount = count;
        qaqSaveReviewSettings(settings);

        var finalSource = (book.words || []).map(function (w) {
            return qaqNormalizeReviewWord(w, book.id, book.name);
        });

        if (settings.skipMarked) {
            finalSource = finalSource.filter(function (w) {
                return !qaqIsMarkedWord(book.id, w.id);
            });
        }

        finalSource = settings.random ? qaqShuffle(finalSource) : finalSource.slice();
        finalSource = finalSource.slice(0, count);

        qaqCloseModal();

        if (needGenerate) {
            try {
                await qaqGenerateRoundStudyData(finalSource);
            } catch (err) {
                console.error(err);
                qaqToast(err.message || '批量生成失败，继续开始本轮');
            }
        }

        qaqReviewSession = {
            bookId: book.id,
            bookName: book.name,
            queue: finalSource.slice(),
            current: null,
            history: [],
            roundTotal: finalSource.length,
            shownMeaning: false,
            pendingLevel: '',
            stats: {
                unknown: 0,
                vague: 0,
                known: 0
            }
        };

        qaqSaveCurrentReviewSession();
        qaqSwitchTo(qaqWordReviewPage);
        qaqReviewGoNext();
    };
}

function qaqUpdateReviewTopBtns() {
    if (!qaqReviewSession.current) return;

    var favBtn = document.getElementById('qaq-word-review-fav-btn');
    var markBtn = document.getElementById('qaq-word-review-mark-btn');

    var isFav = qaqIsFavoriteWord(qaqReviewSession.current.id, qaqReviewSession.current.bookId);
    var isMarked = qaqIsMarkedWord(qaqReviewSession.current.bookId, qaqReviewSession.current.id);

    favBtn.style.opacity = isFav ? '1' : '0.75';
    markBtn.style.opacity = isMarked ? '1' : '0.75';

    favBtn.style.boxShadow = isFav ? '0 0 0 2px rgba(212,160,32,0.22)' : '';
    markBtn.style.boxShadow = isMarked ? '0 0 0 2px rgba(196,112,104,0.22)' : '';
}

function qaqNormalizeReviewWord(word, bookId, bookName) {
    return {
        id: word.id || qaqWordId(),
        word: word.word || '',
        meaning: word.meaning || '',
        phonetic: word.phonetic || '',
        example: word.example || '',
        exampleCn: word.exampleCn || '',
        bookId: bookId,
        bookName: bookName,
        mastery: 0
    };
}

function qaqRenderCurrentReviewWord() {
    var item = qaqReviewSession.current;
    if (!item) return;

    var settings = qaqGetReviewSettings();

    document.getElementById('qaq-review-word').textContent = item.word || '（空）';

    var phoneticEl = document.getElementById('qaq-review-phonetic');
    phoneticEl.textContent = item.phonetic || '暂无音标';
    phoneticEl.style.display = settings.showPhonetic ? '' : 'none';

    var exampleEl = document.getElementById('qaq-review-example');
    var exampleWrapEl = exampleEl.parentElement;
    exampleEl.textContent = item.example || '暂无例句';
    exampleWrapEl.style.display = settings.showExample ? '' : 'none';

    var exampleCnEl = document.getElementById('qaq-review-example-cn');
    exampleCnEl.textContent = item.exampleCn || '暂无例句翻译';
    exampleCnEl.style.display = 'none';

    var meaningEl = document.getElementById('qaq-review-meaning');
    meaningEl.textContent = item.meaning || '暂无释义';
    meaningEl.style.display = 'none';

    document.getElementById('qaq-review-actions').style.display = 'flex';
    document.getElementById('qaq-review-next-wrap').style.display = 'none';

    qaqReviewSession.shownMeaning = false;
    qaqReviewSession.pendingLevel = '';

    document.getElementById('qaq-word-review-progress').textContent =
        '本轮 ' + qaqReviewSession.bookName + ' · 剩余 ' + (qaqReviewSession.queue.length + 1) + ' / ' + qaqReviewSession.roundTotal;

    qaqUpdateReviewTopBtns();

    if (settings.autoPronounce && item.word) {
    setTimeout(function () {
        if (qaqReviewSession.current && qaqReviewSession.current.id === item.id) {
            qaqSpeakWord(item.word);
        }
    }, 120);
}
}

function qaqReviewShowMeaning(level) {
    if (!qaqReviewSession.current) return;

    qaqReviewSession.pendingLevel = level;
    qaqReviewSession.shownMeaning = true;

    document.getElementById('qaq-review-meaning').style.display = 'block';
    document.getElementById('qaq-review-actions').style.display = 'none';
    document.getElementById('qaq-review-next-wrap').style.display = 'flex';
}

function qaqReviewRequeue(item, level) {
    if (!item) return;

    if (level === 'unknown') {
        item.mastery -= 2;
        qaqReviewSession.stats.unknown++;
        var insert1 = Math.min(2, qaqReviewSession.queue.length);
        qaqReviewSession.queue.splice(insert1, 0, item);
    } else if (level === 'vague') {
        item.mastery += 1;
        qaqReviewSession.stats.vague++;
        if (item.mastery < 3) {
            var insert2 = Math.min(4, qaqReviewSession.queue.length);
            qaqReviewSession.queue.splice(insert2, 0, item);
        }
    } else if (level === 'known') {
        item.mastery += 3;
        qaqReviewSession.stats.known++;
        if (item.mastery < 3) {
            qaqReviewSession.queue.push(item);
        }
    }
}

function qaqReviewGoNext() {
if (!qaqReviewSession._startTime) {
    qaqReviewSession._startTime = Date.now();
}
    if (!qaqReviewSession.queue.length) {
        qaqReviewFinishRound();
        return;
    }

    qaqReviewSession.current = qaqReviewSession.queue.shift();
    qaqSaveCurrentReviewSession();
    qaqRenderCurrentReviewWord();
}

function qaqReviewFinishCurrent() {
    if (!qaqReviewSession.current || !qaqReviewSession.pendingLevel) return;

    var snapshot = JSON.parse(JSON.stringify(qaqReviewSession.current));
    snapshot._pendingLevel = qaqReviewSession.pendingLevel;
    snapshot._queueSnapshot = JSON.parse(JSON.stringify(qaqReviewSession.queue));
    snapshot._statsSnapshot = JSON.parse(JSON.stringify(qaqReviewSession.stats));
    qaqReviewSession.history.push(snapshot);

    qaqReviewRequeue(qaqReviewSession.current, qaqReviewSession.pendingLevel);
    qaqSaveCurrentReviewSession();
    qaqReviewGoNext();
}

function qaqReviewFinishRound() {
    var finishedWords = [];

    if (qaqReviewSession.current) {
        finishedWords.push({
            id: qaqReviewSession.current.id,
            word: qaqReviewSession.current.word || '',
            meaning: qaqReviewSession.current.meaning || '',
            phonetic: qaqReviewSession.current.phonetic || '',
            example: qaqReviewSession.current.example || '',
            exampleCn: qaqReviewSession.current.exampleCn || '',
            bookId: qaqReviewSession.current.bookId || qaqReviewSession.bookId,
            bookName: qaqReviewSession.current.bookName || qaqReviewSession.bookName,
            mastery: qaqReviewSession.current.mastery || 0
        });
    }

    qaqReviewSession.history.forEach(function (item) {
        if (!finishedWords.find(function (x) { return x.id === item.id && x.bookId === item.bookId; })) {
            finishedWords.push({
                id: item.id,
                word: item.word || '',
                meaning: item.meaning || '',
                phonetic: item.phonetic || '',
                example: item.example || '',
                exampleCn: item.exampleCn || '',
                bookId: item.bookId || qaqReviewSession.bookId,
                bookName: item.bookName || qaqReviewSession.bookName,
                mastery: item.mastery || 0
            });
        }
    });

    qaqSaveLastFinishedReview({
        bookId: qaqReviewSession.bookId,
        bookName: qaqReviewSession.bookName,
        words: finishedWords,
        stats: qaqReviewSession.stats,
        finishedAt: Date.now()
    });
    
    // ★ 记录学习数据并奖励积分
var sessionDuration = Math.round((Date.now() - (qaqReviewSession._startTime || Date.now())) / 60000) || 1;
qaqLogStudySession(
    qaqReviewSession.bookName,
    finishedWords.length,
    sessionDuration
);

    qaqClearCurrentReviewSession();

    modalTitle.textContent = '本轮完成';
    modalBody.innerHTML =
        '<div style="text-align:center;font-size:13px;line-height:1.8;color:#666;">' +
            '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:6px;">这一轮背完啦</div>' +
            '<div>词库：' + qaqReviewSession.bookName + '</div>' +
            '<div>不认识：' + qaqReviewSession.stats.unknown + '</div>' +
            '<div>有点印象：' + qaqReviewSession.stats.vague + '</div>' +
            '<div>熟人：' + qaqReviewSession.stats.known + '</div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-review-finish-back">返回词库</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-review-finish-again">复习上次</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-review-finish-story" style="flex:1;">生成小说</button>';

    qaqOpenModal();

    document.getElementById('qaq-review-finish-back').onclick = function () {
    qaqCloseModal();
    qaqGoBackTo(wordbankPage, qaqWordReviewPage);
    qaqSwitchWordbankTab('review');
};

    document.getElementById('qaq-review-finish-again').onclick = function () {
        var finished = qaqGetLastFinishedReview();
        qaqCloseModal();
        if (!finished || !finished.words || !finished.words.length) {
            return qaqToast('没有可复习的内容');
        }

        qaqReviewSession = {
            bookId: finished.bookId,
            bookName: finished.bookName,
            queue: finished.words.slice(),
            current: null,
            history: [],
            roundTotal: finished.words.length,
            shownMeaning: false,
            pendingLevel: '',
            stats: {
                unknown: 0,
                vague: 0,
                known: 0
            }
        };

        qaqSaveCurrentReviewSession();
        qaqSwitchTo(qaqWordReviewPage);
        qaqReviewGoNext();
    };

    document.getElementById('qaq-review-finish-story').onclick = function () {
        qaqCloseModal();
        qaqReviewStorySelectedTags = [];
        qaqRenderReviewStoryPage();
        qaqSwitchTo(qaqReviewStoryPage);
    };
}

document.getElementById('qaq-word-review-back').addEventListener('click', function () {
    qaqSaveCurrentReviewSession();
    qaqGoBackTo(wordbankPage, qaqWordReviewPage);
    qaqSwitchWordbankTab('review');
});

document.getElementById('qaq-word-review-prev-btn').addEventListener('click', function () {
    if (!qaqReviewSession.history.length) return qaqToast('没有上一个单词');

    var prev = qaqReviewSession.history.pop();
    qaqReviewSession.queue = prev._queueSnapshot || [];
    qaqReviewSession.stats = prev._statsSnapshot || qaqReviewSession.stats;

    delete prev._queueSnapshot;
    delete prev._statsSnapshot;
    delete prev._pendingLevel;

    qaqReviewSession.current = prev;
    qaqSaveCurrentReviewSession();
    qaqRenderCurrentReviewWord();
    qaqToast('已返回上一个单词');
});

document.getElementById('qaq-word-review-fav-btn').addEventListener('click', function () {
    if (!qaqReviewSession.current) return;

    var added = qaqToggleFavoriteWord(qaqReviewSession.current);
    qaqUpdateReviewTopBtns();
    qaqToast(added ? '已收藏到我的单词本' : '已取消收藏');
});

document.getElementById('qaq-word-review-mark-btn').addEventListener('click', function () {
    if (!qaqReviewSession.current) return;

    var nowMarked = qaqToggleMarkedWord(qaqReviewSession.current.bookId, qaqReviewSession.current.id);
    qaqUpdateReviewTopBtns();

    if (nowMarked) {
        qaqToast('已标记，之后不会再出现');

        /* 把当前学习队列里相同单词移除，避免这一轮后面再次出现 */
        qaqReviewSession.queue = qaqReviewSession.queue.filter(function (item) {
            return !(item.bookId === qaqReviewSession.current.bookId && item.id === qaqReviewSession.current.id);
        });
    } else {
        qaqToast('已取消标记');
    }
});

var qaqReviewHomeSettingBtn = document.getElementById('qaq-review-home-setting-btn');
if (qaqReviewHomeSettingBtn) {
    qaqReviewHomeSettingBtn.addEventListener('click', function () {
        qaqOpenReviewSettingsPage();
    });
}

function qaqExtractJsonBlock(text) {
    text = String(text || '').trim();
    if (!text) return null;

    // 1. 直接解析
    try {
        return JSON.parse(text);
    } catch (e) {}

    // 2. 提取 markdown 代码块中的 JSON
    var mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch && mdMatch[1]) {
        try {
            return JSON.parse(mdMatch[1].trim());
        } catch (e) {}
    }

    // 3. 提取第一个完整的 JSON 对象
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {}
    }

    // 4. 尝试提取数组格式
    var arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            return JSON.parse(arrayMatch[0]);
        } catch (e) {}
    }

    // 5. 调试：打印原始内容（开发时使用）
    console.log('无法解析的模型返回内容：', text.substring(0, 500));
    
    return null;
}

function qaqParseStructuredStory(content) {
    var parsed = qaqExtractJsonBlock(content);
    if (!parsed) {
        throw new Error('模型返回内容无法解析为 JSON');
    }

    if (!parsed.paragraphs || !Array.isArray(parsed.paragraphs) || !parsed.paragraphs.length) {
        throw new Error('返回内容缺少 paragraphs');
    }

    parsed.title = parsed.title || '生成结果';
    parsed.usedWords = Array.isArray(parsed.usedWords) ? parsed.usedWords : [];
    parsed.omittedWords = Array.isArray(parsed.omittedWords) ? parsed.omittedWords : [];

    parsed.paragraphs = parsed.paragraphs.map(function (p) {
        return {
            en: p && p.en ? String(p.en).trim() : '',
            cn: p && p.cn ? String(p.cn).trim() : '',
            sentences: Array.isArray(p && p.sentences)
                ? p.sentences.map(function (s) {
                    return {
                        en: s && s.en ? String(s.en).trim() : '',
                        cn: s && s.cn ? String(s.cn).trim() : '',
                        usedWords: Array.isArray(s && s.usedWords) ? s.usedWords : []
                    };
                }).filter(function (s) {
                    return s.en;
                })
                : []
        };
    }).filter(function (p) {
        return p.en || (p.sentences && p.sentences.length);
    });

    return parsed;
}

function qaqCheckStoryCoverage(targetWords, usedWords) {
    var target = (targetWords || []).map(function (w) {
        return String(w || '').trim().toLowerCase();
    }).filter(Boolean);

    var used = (usedWords || []).map(function (w) {
        return String(w || '').trim().toLowerCase();
    }).filter(Boolean);

    return target.filter(function (w) {
        return used.indexOf(w) === -1;
    });
}

function qaqPersistGeneratedWordData(wordObj) {
    var books = qaqGetWordbooks();
    var book = books.find(function (b) { return b.id === wordObj.bookId; });
    if (!book || !book.words) return;

    var hit = book.words.find(function (w) { return w.id === wordObj.id; });
    if (!hit) return;

    hit.phonetic = wordObj.phonetic || hit.phonetic || '';
    hit.example = wordObj.example || hit.example || '';
    hit.exampleCn = wordObj.exampleCn || hit.exampleCn || '';

    qaqSaveWordbooks(books);

    if (qaqReviewSession.queue && qaqReviewSession.queue.length) {
        qaqReviewSession.queue.forEach(function (item) {
            if (item.id === wordObj.id && item.bookId === wordObj.bookId) {
                item.phonetic = wordObj.phonetic;
                item.example = wordObj.example;
                item.exampleCn = wordObj.exampleCn;
            }
        });
    }

    if (qaqReviewSession.history && qaqReviewSession.history.length) {
        qaqReviewSession.history.forEach(function (item) {
            if (item.id === wordObj.id && item.bookId === wordObj.bookId) {
                item.phonetic = wordObj.phonetic;
                item.example = wordObj.example;
                item.exampleCn = wordObj.exampleCn;
            }
        });
    }

    if (qaqCurrentWordbookId === wordObj.bookId) {
        qaqRenderWordbookDetail(qaqCurrentWordbookId, document.getElementById('qaq-wordbook-detail-search').value);
    }
    qaqRenderWordbookHome(document.getElementById('qaq-wordbook-search').value);
}

function qaqGetReviewModelCacheKey(provider, url) {
    return 'qaq-review-model-cache::' + (provider || 'openai') + '::' + (url || '');
}

function qaqSaveReviewModelCache(provider, url, models) {
    localStorage.setItem(
        qaqGetReviewModelCacheKey(provider, url),
        JSON.stringify(models || [])
    );
}

function qaqGetReviewModelCache(provider, url) {
    return JSON.parse(localStorage.getItem(
        qaqGetReviewModelCacheKey(provider, url)
    ) || '[]');
}


async function qaqFetchReviewModels(provider, apiUrl, apiKey) {
    if (provider === 'minimax-native') {
        return [
            'abab6.5s-chat',
            'abab7-chat-preview',
            'abab7.5-chat',
            'MiniMax-Text-01'
        ];
    }

    if (!apiUrl) throw new Error('请先填写 API URL');
    if (!apiKey) throw new Error('请先填写 API Key');

    var modelsUrl = apiUrl.replace(/\/+$/, '');
    modelsUrl = modelsUrl.replace(/\/chat\/completions$/i, '/models');
    modelsUrl = modelsUrl.replace(/\/completions$/i, '/models');

    if (!/\/models$/i.test(modelsUrl)) {
        if (/\/v\d+$/i.test(modelsUrl)) modelsUrl += '/models';
        else modelsUrl += '/models';
    }

    var resp = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        }
    });

    if (!resp.ok) {
        var errText = await resp.text().catch(function () { return ''; });
        throw new Error('拉取模型失败：' + resp.status + ' ' + errText);
    }

    var data = await resp.json();
    var list = [];

    if (Array.isArray(data.data)) {
        list = data.data.map(function (item) {
            return item.id || item.model || '';
        }).filter(Boolean);
    } else if (Array.isArray(data.models)) {
        list = data.models.map(function (item) {
            return item.id || item.name || item.model || '';
        }).filter(Boolean);
    }

    list = Array.from(new Set(list));

    if (!list.length) {
        throw new Error('未获取到模型列表');
    }

    return list;
}

function qaqGetReviewApiConfig() {
    var settings = qaqGetReviewSettings();
    return {
        provider: settings.apiProvider || 'openai',
        url: settings.apiUrl || '',
        key: settings.apiKey || '',
        model: settings.apiModel || '',
        minimaxGroupId: settings.minimaxGroupId || ''
    };
}


/* ===== 背单词交互事件：统一委托，修复按钮无法点击 ===== */
(function () {
    function qaqHandleReviewAction(target) {
        if (!target) return false;

        var reviewBtn = target.closest('.qaq-word-review-btn');
        if (reviewBtn) {
            var level = reviewBtn.dataset.level;
            
            qaqReviewShowMeaning(level);
            return true;
        }

        var nextBtn = target.closest('#qaq-review-next-btn');
        if (nextBtn) {
            
            qaqReviewFinishCurrent();
            return true;
        }

        var exampleEl = target.closest('#qaq-review-example');
        if (exampleEl) {
            var cn = document.getElementById('qaq-review-example-cn');
            if (cn) {
                cn.style.display = cn.style.display === 'none' ? 'block' : 'none';
            }
            return true;
        }

        var phoneticEl = target.closest('#qaq-review-phonetic');
        if (phoneticEl) {
            if (qaqReviewSession.current && qaqReviewSession.current.word) {
                qaqSpeakWord(qaqReviewSession.current.word);
            }
            return true;
        }

        var cardEl = target.closest('#qaq-word-review-card');
        if (cardEl) {
            if (!qaqReviewSession.current || qaqReviewSession.shownMeaning) return true;
            var meaningEl = document.getElementById('qaq-review-meaning');
            if (meaningEl) meaningEl.style.display = 'block';
            return true;
        }

        return false;
    }

    document.addEventListener('click', function (e) {
        var page = document.getElementById('qaq-word-review-page');
        if (!page || !page.classList.contains('qaq-page-show')) return;

        if (qaqHandleReviewAction(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    var actionsEl = document.getElementById('qaq-review-actions');
    var nextWrapEl = document.getElementById('qaq-review-next-wrap');

    if (actionsEl) {
        actionsEl.style.position = 'relative';
        actionsEl.style.zIndex = '20';
        actionsEl.style.pointerEvents = 'auto';
    }

    if (nextWrapEl) {
        nextWrapEl.style.position = 'relative';
        nextWrapEl.style.zIndex = '20';
        nextWrapEl.style.pointerEvents = 'auto';
    }

    document.querySelectorAll('.qaq-word-review-btn, #qaq-review-next-btn').forEach(function (el) {
        el.style.position = 'relative';
        el.style.zIndex = '21';
        el.style.pointerEvents = 'auto';
        if (el.tagName === 'BUTTON') el.type = 'button';
    });
})();

/* ===== 背单词第二阶段：收藏 / 标记 / 我的页面 ===== */

function qaqIsFavoriteWord(wordId, bookId) {
    var favs = qaqGetReviewFavorites();
    return favs.some(function (item) {
        return item.id === wordId && item.bookId === bookId;
    });
}

function qaqToggleFavoriteWord(wordObj) {
    var favs = qaqGetReviewFavorites();
    var idx = favs.findIndex(function (item) {
        return item.id === wordObj.id && item.bookId === wordObj.bookId;
    });

    if (idx > -1) {
        favs.splice(idx, 1);
        qaqSaveReviewFavorites(favs);
        return false;
    } else {
        favs.unshift({
            id: wordObj.id,
            word: wordObj.word || '',
            meaning: wordObj.meaning || '',
            phonetic: wordObj.phonetic || '',
            example: wordObj.example || '',
            exampleCn: wordObj.exampleCn || '',
            bookId: wordObj.bookId || '',
            bookName: wordObj.bookName || ''
        });
        qaqSaveReviewFavorites(favs);
        return true;
    }
}

function qaqIsMarkedWord(bookId, wordId) {
    var marked = qaqGetMarkedWords();
    var list = marked[bookId] || [];
    return list.indexOf(wordId) > -1;
}

function qaqToggleMarkedWord(bookId, wordId) {
    var marked = qaqGetMarkedWords();
    if (!marked[bookId]) marked[bookId] = [];

    var idx = marked[bookId].indexOf(wordId);
    if (idx > -1) {
        marked[bookId].splice(idx, 1);
        if (!marked[bookId].length) delete marked[bookId];
        qaqSaveMarkedWords(marked);
        return false;
    } else {
        marked[bookId].push(wordId);
        qaqSaveMarkedWords(marked);
        return true;
    }
}

/* ===== 我的页面 - 完整重构===== */

// ---- 用户资料 ----

// ---- 积分 ----

function qaqAddPoints(n) {
    if (n <= 0) return;
    qaqSavePoints(qaqGetPoints() + n);
}

// ---- 学习记录 ----
function qaqLogStudySession(bookName, wordCount, durationMinutes) {
    var today = qaqDateKey(new Date());
    var log = qaqGetStudyLog();
    if (!log[today]) log[today] = { words: 0, time: 0, rounds: 0, books: {} };
    log[today].words += wordCount || 0;
    log[today].time += durationMinutes || 0;
    log[today].rounds += 1;
    if (bookName) {
        if (!log[today].books[bookName]) log[today].books[bookName] = 0;
        log[today].books[bookName] += wordCount || 0;
    }
    qaqSaveStudyLog(log);

    // 奖励积分: 每个单词 1 积分
    qaqAddPoints(wordCount || 0);
}

// ---- 收藏分类 ----
function qaqGetFavCategories() {
    return JSON.parse(localStorage.getItem('qaq-mine-fav-categories') || '["全部","单词","句子","段落"]');
}

function qaqSaveFavCategories(cats) {
    localStorage.setItem('qaq-mine-fav-categories', JSON.stringify(cats));
}

// ---- 商店系统 ----

function qaqGetActivePet() {
    return JSON.parse(localStorage.getItem('qaq-mine-active-pet') ||'null');
}

function qaqSaveActivePet(pet) {
    localStorage.setItem('qaq-mine-active-pet', JSON.stringify(pet));
}

var qaqShopCatalog = {
    seeds: [
        { id: 'seed-sunflower', name: '向日葵', price: 30, type: 'seed', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e8c34f" stroke-width="1.5"><circle cx="12" cy="10" r="4"/><path d="M12 14v8" stroke-linecap="round"/><path d="M8 18h8" stroke-linecap="round"/><path d="M12 2v4M7 4l23M17 4l-2 3M4 8l3 1M20 8l-3 1" stroke-linecap="round" opacity="0.6"/></svg>' },
        {
    id: 'seed-rose',
    name: '玫瑰',
    price: 50,
    type: 'seed',
    svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e05565" stroke-width="1.5"><path d="M12 3c-2 2-4 4-4 7 0 4 3 6 4 6s4-2 4-6c0-3-2-5-4-7z" fill="#e05565" stroke-linejoin="round"/><path d="M12 15v7" stroke="#4a7a32" stroke-linecap="round"/><path d="M9 19l3-2 3 2" stroke="#4a7a32" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="9.5" cy="10.5" rx="1.2" ry="0.8" fill="#f3a0aa" opacity="0.5"/></svg>'
},
        { id: 'seed-cactus', name: '仙人掌', price: 20, type: 'seed', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.5"><rect x="9" y="6" width="6" height="14" rx="3" stroke-linejoin="round"/><path d="M9 12H6a2 2 0 01-2-2V8" stroke-linecap="round"/><path d="M15 10h3a2 2 0 002-2V6" stroke-linecap="round"/><line x1="8" y1="20" x2="16" y2="20" stroke-linecap="round"/></svg>' },
    ],
    animals: [
        { id: 'animal-cat', name: '小猫', price: 80, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><path d="M5 9l2-5h2l1 3h4l1-3h2l2 5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="15" rx="7" ry="6"/><circle cx="9" cy="14" r="1" fill="#e88d4f" stroke="none"/><circle cx="15" cy="14" r="1" fill="#e88d4f" stroke="none"/><path d="M10 17s11 2 1 2-1 2-1" stroke-linecap="round"/></svg>' },
        { id: 'animal-dog', name: '小狗', price: 80, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b6cc1" stroke-width="1.5"><path d="M4 10c0-2 1-4 3-4h1l1-3h6l1 3h1c2 0 3 2 3 4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="15" rx="7" ry="6"/><circle cx="9" cy="14" r="1" fill="#8b6cc1" stroke="none"/><circle cx="15" cy="14" r="1" fill="#8b6cc1" stroke="none"/><ellipse cx="12" cy="17" rx="2" ry="1.2" fill="#8b6cc1" stroke="none" opacity="0.3"/></svg>' },
        { id: 'animal-rabbit', name: '兔子', price: 60, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c47068" stroke-width="1.5"><ellipse cx="9" cy="6" rx="2" ry="5"/><ellipse cx="15" cy="6" rx="2" ry="5"/><circle cx="12" cy="15" r="6"/><circle cx="10" cy="14" r="1" fill="#c47068" stroke="none"/><circle cx="14" cy="14" r="1" fill="#c47068" stroke="none"/><path d="M11 17h2" stroke-linecap="round"/></svg>' },
    ],
    items: [
        { id: 'item-fertilizer', name: '普通肥料', price: 10, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.5"><path d="M12 3v9M8 7l4 54-5" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="14" width="12" height="7" rx="2"/></svg>' },
        { id: 'item-food-basic', name: '基础粮食', price: 15, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><path d="M4 16h16l-2 5H6l-2-5z" stroke-linejoin="round"/><path d="M6 16c0-43-8 6-1032 6 6 6 10" stroke-linejoin="round"/></svg>' },
        { id: 'item-bed', name: '小窝', price: 40, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" stroke-width="1.5"><rect x="2" y="12" width="20" height="8" rx="3"/><path d="M5 12V8a3 3 0 013-3h8a3 3 0 013 3v4" stroke-linejoin="round"/></svg>' },
    ]
};

// ---- 渲染我的页面主面板 ----
function qaqRenderMinePanel() {
    var profile = qaqGetMineProfile();
    var favs = qaqGetReviewFavorites();
    var log = qaqGetStudyLog();
    var today = qaqDateKey(new Date());
    var todayLog = log[today] || { words: 0, time: 0, rounds: 0, books: {} };

    // 头像
    var avatarEl = document.getElementById('qaq-mine-avatar');
    if (profile.avatar) {
        avatarEl.innerHTML = '<img src="' + profile.avatar + '">';
    }

    document.getElementById('qaq-mine-nickname').textContent = profile.nickname || '学习者';
    document.getElementById('qaq-mine-status-text').textContent = profile.status || '学习中';
    document.getElementById('qaq-mine-signature').textContent = profile.signature || '每天进步一点点';

    document.getElementById('qaq-mine-fav-count').textContent = favs.length;
    document.getElementById('qaq-mine-today-words').textContent = '今日 ' + todayLog.words + ' 词';
    document.getElementById('qaq-mine-points-balance').textContent = qaqGetPoints();

    // ★ 更新今日概览（新位置的元素）
    var ovWordsEl = document.getElementById('qaq-mine-ov-words');
    var ovTimeEl = document.getElementById('qaq-mine-ov-time');
    var ovRoundsEl = document.getElementById('qaq-mine-ov-rounds');
    var ovBooksEl = document.getElementById('qaq-mine-ov-books');
    if (ovWordsEl) ovWordsEl.textContent = todayLog.words || 0;
    if (ovTimeEl) ovTimeEl.textContent = todayLog.time || 0;
    if (ovRoundsEl) ovRoundsEl.textContent = todayLog.rounds || 0;
    if (ovBooksEl) ovBooksEl.textContent = Object.keys(todayLog.books || {}).length;

    var owned = qaqGetOwnedItems();
var plantCount = owned.filter(function (x) { return x.type === 'seed'; }).length;
var animalCount = owned.filter(function (x) { return x.type === 'animal'; }).length;

var plantCountEl = document.getElementById('qaq-mine-plant-count');
var animalCountEl = document.getElementById('qaq-mine-animal-count');

if (plantCountEl) plantCountEl.textContent = plantCount + ' 株';
if (animalCountEl) animalCountEl.textContent = animalCount + ' 只';
}

// ---- 用户资料编辑 ----
document.getElementById('qaq-mine-edit-btn').addEventListener('click', function () {
    var profile = qaqGetMineProfile();

    modalTitle.textContent = '编辑资料';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">昵称</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-nick" type="text" value="' + (profile.nickname || '').replace(/"/g, '&quot;') + '">' +
            '<div class="qaq-plan-form-label">状态</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-status" type="text" value="' + (profile.status || '').replace(/"/g, '&quot;') +'" placeholder="学习中 / 休息中">' +
            '<div class="qaq-plan-form-label">个性签名</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-sig" type="text" value="' + (profile.signature || '').replace(/"/g, '&quot;') + '">' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
        profile.nickname = document.getElementById('qaq-mine-edit-nick').value.trim() || '学习者';
        profile.status = document.getElementById('qaq-mine-edit-status').value.trim() || '学习中';
        profile.signature = document.getElementById('qaq-mine-edit-sig').value.trim() || '每天进步一点点';
        qaqSaveMineProfile(profile);
        qaqCloseModal();
        qaqRenderMinePanel();qaqToast('资料已更新');
    };
});

document.getElementById('qaq-mine-avatar').addEventListener('click', function () {
    var profile = qaqGetMineProfile();
    qaqEditImage('更换头像', function (src) {
        profile.avatar = src;
        qaqSaveMineProfile(profile);
        document.getElementById('qaq-mine-avatar').innerHTML = '<img src="' + src + '">';
        qaqToast('头像已更新');
    });
});

// ---- 收藏子页面 ----
var qaqMineFavSelectedCat = '全部';

document.getElementById('qaq-mine-fav-header').addEventListener('click', function () {
    qaqMineFavSelectedCat = '全部';
    qaqRenderMineFavPage('');qaqSwitchTo(document.getElementById('qaq-mine-fav-page'));
});

document.getElementById('qaq-mine-fav-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-fav-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-mine-fav-search').addEventListener('input', function () {
    qaqRenderMineFavPage(this.value);
});

document.getElementById('qaq-mine-fav-add-cat-btn').addEventListener('click', function () {
    qaqEditText('新建收藏分类', '', false, function (val) {
        var cats = qaqGetFavCategories();
        if (cats.indexOf(val) > -1) return qaqToast('分类已存在');
        cats.push(val);
        qaqSaveFavCategories(cats);
        qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
        qaqToast('分类已创建');
    });
});

function qaqRenderMineFavPage(keyword) {
    var cats = qaqGetFavCategories();
    var favs = qaqGetReviewFavorites().slice();
    var kw = (keyword || '').trim().toLowerCase();
    var listEl = document.getElementById('qaq-mine-fav-list');
    var catsEl = document.getElementById('qaq-mine-fav-cats');
    var emptyEl = document.getElementById('qaq-mine-fav-empty');

    // 分类标签
    catsEl.innerHTML = '';
    cats.forEach(function (cat) {
        var chip = document.createElement('div');
        chip.className = 'qaq-mine-fav-cat-chip' + (cat === qaqMineFavSelectedCat ? ' qaq-active' : '');
        chip.textContent = cat;
        chip.addEventListener('click', function () {
            qaqMineFavSelectedCat = cat;
            qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
        });
        catsEl.appendChild(chip);
    });

    // 过滤
    var filtered = favs;
    if (qaqMineFavSelectedCat !== '全部') {
        filtered = filtered.filter(function (item) {
            return (item.favCategory || '单词') === qaqMineFavSelectedCat;
        });
    }
    if (kw) {
        filtered = filtered.filter(function (item) {
            return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                   (item.meaning || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    listEl.innerHTML = '';

    if (!filtered.length) {
        emptyEl.style.display = '';
        return;
    }
    emptyEl.style.display = 'none';

    filtered.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'qaq-mine-fav-card';
        card.innerHTML =
            '<div class="qaq-mine-fav-card-top">' +
                '<div class="qaq-mine-fav-card-word">' + qaqEscapeHtml(item.word || '') + '</div>' +
                '<div class="qaq-mine-fav-card-cat">' + qaqEscapeHtml(item.favCategory || '单词') + '</div>' +
            '</div>' +
            '<div class="qaq-mine-fav-card-meaning">' + qaqEscapeHtml(item.meaning || '') + '</div>' +
            '<div class="qaq-mine-fav-card-meta">' +
                '<span>来自：' + qaqEscapeHtml(item.bookName || '未知') + '</span>' +'</div>' +
            '<div class="qaq-mine-fav-card-actions">' +
                '<button class="qaq-import-ghost-btn" data-fav-move="1" style="font-size:11px;padding:4px 10px;">移动分类</button>' +
                '<button class="qaq-import-ghost-btn" data-fav-del="1" style="font-size:11px;padding:4px 10px;color:#c44;">移除</button>' +
            '</div>';

        card.querySelector('[data-fav-del]').addEventListener('click', function () {
            var favsList = qaqGetReviewFavorites().filter(function (f) {
                return !(f.id === item.id && f.bookId === item.bookId);
            });
            qaqSaveReviewFavorites(favsList);
            qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
            qaqToast('已移除');
        });

        card.querySelector('[data-fav-move]').addEventListener('click', function () {
            var cats2 = qaqGetFavCategories().filter(function (c) { return c !== '全部'; });
            modalTitle.textContent = '选择分类';
            modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
                cats2.map(function (c) {
                    return '<div class="qaq-custom-select-option" data-cat="' + c + '"><span>' + c + '</span></div>';
                }).join('') + '</div>';
            modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
            qaqOpenModal();
            document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
            modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (opt) {
                opt.addEventListener('click', function () {
                    var newCat = this.dataset.cat;
                    var allFavs = qaqGetReviewFavorites();
                    var hit = allFavs.find(function (f) { return f.id === item.id && f.bookId === item.bookId; });
                    if (hit) hit.favCategory = newCat;
                    qaqSaveReviewFavorites(allFavs);
                    qaqCloseModal();
                    qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
                    qaqToast('已移至「' + newCat + '」');
                });
            });
        });

        listEl.appendChild(card);
    });
}

// ---- 学习数据子页面 ----
var qaqCalendarYear = new Date().getFullYear();
var qaqCalendarMonth = new Date().getMonth();
var qaqCalendarSelectedDay = '';

document.getElementById('qaq-mine-stats-header').addEventListener('click', function () {
    qaqCalendarYear = new Date().getFullYear();
    qaqCalendarMonth = new Date().getMonth();
    qaqCalendarSelectedDay = '';
    qaqRenderStatsPage();qaqSwitchTo(document.getElementById('qaq-mine-stats-page'));
});

document.getElementById('qaq-mine-points-header').addEventListener('click', function () {
    qaqShopPageSource = 'wordbank';
    qaqRenderShopPage();
    qaqSwitchTo(document.getElementById('qaq-mine-shop-page'));
});

document.getElementById('qaq-mine-garden-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-garden-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-mine-zoo-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-zoo-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-mine-stats-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-stats-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-calendar-prev').addEventListener('click', function () {
    qaqCalendarMonth--;
    if (qaqCalendarMonth < 0) { qaqCalendarMonth = 11; qaqCalendarYear--; }
    qaqRenderCalendar();
});

document.getElementById('qaq-calendar-next').addEventListener('click', function () {
    qaqCalendarMonth++;
    if (qaqCalendarMonth > 11) { qaqCalendarMonth = 0; qaqCalendarYear++; }
    qaqRenderCalendar();
});

function qaqRenderStatsPage() {
    var log = qaqGetStudyLog();
    var today = qaqDateKey(new Date());

    // ★ 删掉今日overview的DOM操作（元素已从学习数据页删除）

    // 总体
    var totalWords = 0, totalTime = 0, totalDays = 0;
    Object.keys(log).forEach(function (key) {
        totalWords += log[key].words || 0;
        totalTime += log[key].time || 0;
        if (log[key].words > 0) totalDays++;
    });

    // 连续天数
    var streak = 0;
    var d = new Date();
    while (true) {
        var key = qaqDateKey(d);
        if (log[key] && log[key].words > 0) {
            streak++;
            d.setDate(d.getDate() -1);
        } else break;
    }

    document.getElementById('qaq-stats-total-words').textContent = totalWords;
    document.getElementById('qaq-stats-total-time').textContent = totalTime;
    document.getElementById('qaq-stats-total-days').textContent = totalDays;
    document.getElementById('qaq-stats-total-streak').textContent = streak;

    qaqRenderCalendar();
}

function qaqRenderCalendar() {
    var log = qaqGetStudyLog();
    var gridEl = document.getElementById('qaq-calendar-grid');
    var labelEl = document.getElementById('qaq-calendar-month-label');
    var detailEl = document.getElementById('qaq-calendar-day-detail');

    labelEl.textContent = qaqCalendarYear + '年' + (qaqCalendarMonth + 1) + '月';
    detailEl.style.display = 'none';

    var firstDay = new Date(qaqCalendarYear, qaqCalendarMonth, 1).getDay();
    var daysInMonth = new Date(qaqCalendarYear, qaqCalendarMonth + 1, 0).getDate();
    var todayKey = qaqDateKey(new Date());

    // 找出本月最高学习量
    var maxWords = 1;
    for (var i = 1; i <= daysInMonth; i++) {
        var k = qaqCalendarYear + '-' + (qaqCalendarMonth + 1 < 10 ? '0' : '') + (qaqCalendarMonth + 1) + '-' + (i < 10 ? '0' : '') + i;
        if (log[k] && log[k].words > maxWords) maxWords = log[k].words;
    }

    gridEl.innerHTML = '';

    // 空白占位
    for (var e = 0; e < firstDay; e++) {
        var emptyCell = document.createElement('div');
        emptyCell.className = 'qaq-calendar-cell qaq-calendar-empty';
        gridEl.appendChild(emptyCell);
    }

    for (var d = 1; d <= daysInMonth; d++) {
        var key = qaqCalendarYear + '-' + (qaqCalendarMonth + 1 < 10 ? '0' : '') + (qaqCalendarMonth + 1) + '-' + (d < 10 ? '0' : '') + d;
        var dayLog = log[key];
        var words = dayLog ? (dayLog.words || 0) : 0;

        var cell = document.createElement('div');
        cell.className = 'qaq-calendar-cell';
        cell.textContent = d;
        cell.dataset.dateKey = key;

        if (key === todayKey) cell.classList.add('qaq-calendar-today');
        if (key === qaqCalendarSelectedDay) cell.classList.add('qaq-calendar-selected');

        // 热力颜色
        if (words > 0) {
            var ratio = Math.min(words / maxWords, 1);
            if (ratio <= 0.33) cell.style.background = '#f0e4d6';
            else if (ratio <= 0.66) cell.style.background = '#e0c4a8';
            else cell.style.background = '#d4a088';
            cell.style.color = ratio > 0.5 ? '#fff' : '#555';
        } else {
            cell.style.background = 'rgba(0,0,0,0.02)';
        }

        cell.addEventListener('click', function () {
            var dk = this.dataset.dateKey;
            qaqCalendarSelectedDay = dk;
            gridEl.querySelectorAll('.qaq-calendar-cell').forEach(function (c) { c.classList.remove('qaq-calendar-selected'); });
            this.classList.add('qaq-calendar-selected');

            var dl = qaqGetStudyLog()[dk];
            if (dl && dl.words > 0) {
                detailEl.style.display = '';
                document.getElementById('qaq-calendar-detail-title').textContent = qaqFormatDate(dk) + ' 学习概览';
                var html = '学习 ' + dl.words + ' 个单词 · 用时 ' + (dl.time || 0) + ' 分钟 · ' + (dl.rounds || 0) + ' 轮';
                if (dl.books) {
                    html += '<br>';
                    Object.keys(dl.books).forEach(function (name) {
                        html += '<br>' + qaqEscapeHtml(name) + '：' + dl.books[name] + ' 词';
                    });
                }
                document.getElementById('qaq-calendar-detail-body').innerHTML = html;
            } else {
                detailEl.style.display = '';
                document.getElementById('qaq-calendar-detail-title').textContent = qaqFormatDate(dk);
                document.getElementById('qaq-calendar-detail-body').innerHTML = '当天无学习记录';
            }
        });

        gridEl.appendChild(cell);
    }
}

function qaqRenderShopPage() {
    var owned = qaqGetOwnedItems();
    var ownedIds = owned.map(function (x) { return x.id; });
    var points = qaqGetPoints();

    document.getElementById('qaq-shop-balance').textContent = points;

    function renderGrid(gridId, items) {
        var gridEl = document.getElementById(gridId);
        gridEl.innerHTML = '';
        items.forEach(function (item) {
            var isOwned = ownedIds.indexOf(item.id) > -1;
            var card = document.createElement('div');
            card.className = 'qaq-shop-card' + (isOwned ? ' qaq-shop-owned' : '');

            var iconHtml = '';
            if (qaqPlantSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-plant-sprite">' + qaqPlantSVGs[item.id](0.6) + '</div>';
            } else if (qaqAnimalSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-animal-sprite">' + qaqAnimalSVGs[item.id](0.7) + '</div>';
            } else if (qaqItemSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-item-sprite">' + qaqItemSVGs[item.id](0.7) + '</div>';
            } else {
                iconHtml = '<div class="qaq-shop-card-icon">' + item.svg + '</div>';
            }

            card.innerHTML =
                iconHtml +
                '<div class="qaq-shop-card-name">' + item.name + '</div>' +
                (isOwned
                    ? '<div class="qaq-shop-card-owned">已拥有</div>'
                    : '<div class="qaq-shop-card-price">' + item.price + ' 积分</div>') +
                '<button class="qaq-shop-detail-btn" data-detail-id="' + item.id + '">查看详情</button>';

            // 购买点击（点卡片非按钮区域）
            card.addEventListener('click', function (e) {
    if (e.target.closest('.qaq-shop-detail-btn')) return;
    if (isOwned) return qaqToast('已拥有该物品');

    qaqConfirm('确认兑换', '花费 ' + item.price + ' 积分兑换「' + item.name + '」？', function () {
        try {
            var latestPoints = qaqGetPoints();
            if (latestPoints < item.price) {
                return qaqToast('积分不足');
            }

            var ownedList = qaqGetOwnedItems() || [];

            // 防重复购买
            if (ownedList.some(function (x) { return x.id === item.id; })) {
                qaqToast('已拥有该物品');
                qaqRenderShopPage();
                return;
            }

            ownedList.push({
                id: item.id,
                name: item.name,
                type: item.type,
                obtainedAt: Date.now()
            });

            // 先保存拥有物品，再扣积分
            qaqSaveOwnedItems(ownedList);
            qaqSavePoints(latestPoints - item.price);

            // 刷新所有相关页面
            qaqRenderShopPage();
            qaqRenderMinePanel();
            if (typeof qaqRenderGardenPage === 'function') qaqRenderGardenPage();
            if (typeof qaqRenderZooPage === 'function') qaqRenderZooPage();
            if (typeof qaqRenderXiaoyuanGarden === 'function') qaqRenderXiaoyuanGarden();
            if (typeof qaqRenderXiaoyuanZoo === 'function') qaqRenderXiaoyuanZoo();

            qaqToast('兑换成功');
        } catch (err) {
            console.error('购买失败：', err);
            qaqToast('购买失败：' + (err.message || '未知错误'));
        }
    });
});

            gridEl.appendChild(card);
        });

        //绑定「查看详情」
        gridEl.querySelectorAll('.qaq-shop-detail-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = this.dataset.detailId;
                qaqOpenShopItemDetail(id);
            });
        });
    }

    renderGrid('qaq-shop-seeds-grid', qaqShopCatalog.seeds);
    renderGrid('qaq-shop-animals-grid', qaqShopCatalog.animals);
    renderGrid('qaq-shop-items-grid', qaqShopCatalog.items);
}

/*===== Three.js 懒加载 ===== */
var qaqThreeReady = false;
var qaqThreeLoading = false;
var qaqThreeCallbacks = [];

function qaqEnsureThreeJS(onProgress, callback) {
    if (qaqThreeReady) { if (callback) callback(); return; }
    if (callback) qaqThreeCallbacks.push(callback);
    if (qaqThreeLoading) return;
    qaqThreeLoading = true;

    var scripts = [
    'https://cdn.jsdelivr.net/npm/three@0.142.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/loaders/GLTFLoader.js'
];
    var loaded = 0;
    var total = scripts.length;

    function loadNext() {
        if (loaded >= total) {
            qaqThreeReady = true;
            qaqThreeLoading = false;
            if (onProgress) onProgress(100);
            qaqThreeCallbacks.forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } });
            qaqThreeCallbacks = [];
            return;
        }
        var s = document.createElement('script');
        s.src = scripts[loaded];
        s.onload = function () {
            loaded++;
            if (onProgress) onProgress(Math.round((loaded / total) * 90));
            loadNext();
        };
        s.onerror = function () {
            console.error('Failed to load: ' + scripts[loaded]);
            loaded++;
            loadNext();
        };
        document.head.appendChild(s);
    }

    if (onProgress) onProgress(5);
    loadNext();
}

function qaqGet3DModelUrl(itemId) {
    var map = {
        'animal-dog': 'assets/models/dog1.glb',
        'animal-cat': 'assets/models/cat1.glb',
        'animal-rabbit': 'assets/models/rabbit1.glb',
        'seed-rose': 'assets/models/rose1.glb'
    };
    return map[itemId] || '';
}

function qaq3DLoadGLB(item, group) {
    return new Promise(function(resolve, reject) {
        var url = qaqGet3DModelUrl(item.id);
        if (!url) return reject(new Error('没有配置模型路径'));

        if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
            return reject(new Error('GLTFLoader 未加载'));
        }

        var loader = new THREE.GLTFLoader();

        loader.load(
            url,
            function(gltf) {
                var model = gltf.scene;
                if (!model) return reject(new Error('模型为空'));

                var box = new THREE.Box3().setFromObject(model);
var size = new THREE.Vector3();
var center = new THREE.Vector3();
box.getSize(size);
box.getCenter(center);

// 先居中
model.position.sub(center);

// 缩放到合适大小
var maxDim = Math.max(size.x, size.y, size.z) || 1;
var scale = 1.7 / maxDim;
model.scale.setScalar(scale);

// 重新计算缩放后的包围盒
var scaledBox = new THREE.Box3().setFromObject(model);
var minY = scaledBox.min.y;

// 让模型“落地”
model.position.y -= minY;

// 再轻微抬高一点，避免和底盘穿插
model.position.y += 0.02;

                model.traverse(function(obj) {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;

                        if (obj.material) {
                            if (obj.material.roughness == null) obj.material.roughness = 0.8;
                            if (obj.material.metalness == null) obj.material.metalness = 0.05;
                        }
                    }
                });

                group.add(model);
                resolve(model);
            },
            undefined,
            function(err) {
                reject(err);
            }
        );
    });
}

/* ===== Three.js 3D 状态 ===== */
var qaq3D = {
    renderer: null, scene: null, camera: null, controls: null,
    animId: null, mainGroup: null, clock: null, particles: null, destroyed: false
};

function qaq3DPreviewDestroy() {
    qaq3D.destroyed = true;
    if (qaq3D.animId) { cancelAnimationFrame(qaq3D.animId); qaq3D.animId = null; }
    if (qaq3D.controls) { qaq3D.controls.dispose(); qaq3D.controls = null; }
    if (qaq3D.renderer) { qaq3D.renderer.dispose(); qaq3D.renderer.domElement.remove(); qaq3D.renderer = null; }
    qaq3D.scene = null; qaq3D.camera = null; qaq3D.mainGroup = null;
    qaq3D.clock = null; qaq3D.particles = null;
}

function qaqOpenShopItemDetail(itemId) {
    var allItems = qaqShopCatalog.seeds.concat(qaqShopCatalog.animals, qaqShopCatalog.items);
    var item = allItems.find(function (x) { return x.id === itemId; });
    if (!item) return;

    var owned = qaqGetOwnedItems();
    var isOwned = owned.some(function (x) { return x.id === itemId; });
    var typeNames = { seed: '种子', animal: '动物', item: '道具' };
    var typeName = typeNames[item.type] || '物品';

    //★ 如果 Three.js 还没加载，先显示加载进度弹窗
    if (!qaqThreeReady) {
        modalTitle.textContent = '加载 3D 引擎';
        modalBody.innerHTML =
            '<div style="text-align:center;">' +
                '<div style="font-size:13px;color:#888;margin-bottom:12px;">正在下载 3D 渲染模块…</div>' +
                '<div class="qaq-import-progress-bar" style="margin:0 auto;width:80%;">' +
                    '<div class="qaq-import-progress-fill" id="qaq-3d-load-fill" style="width:0%;"></div>' +
                '</div>' +
                '<div id="qaq-3d-load-text" style="font-size:11px;color:#aaa;margin-top:8px;">0%</div>' +
            '</div>';
        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = function () {
            qaqCloseModal();
        };

        qaqEnsureThreeJS(
            function (pct) {
                var fill = document.getElementById('qaq-3d-load-fill');
                var text = document.getElementById('qaq-3d-load-text');
                if (fill) fill.style.width = pct + '%';
                if (text) text.textContent = pct + '%';
            },
            function () {
                qaqCloseModal();
                setTimeout(function () {
                    qaqOpenShopItemDetail3D(item, isOwned, typeName);
                }, 200);
            }
        );return;
    }

    qaqOpenShopItemDetail3D(item, isOwned, typeName);
}

function qaqOpenShopItemDetail3D(item, isOwned, typeName) {
    modalTitle.textContent = item.name;
    modalBody.innerHTML =
        '<div class="qaq-shop-detail-modal">' +
            '<div class="qaq-shop-detail-stage qaq-3d-stage" id="qaq-3d-stage">' +
                '<canvas id="qaq-3d-canvas"></canvas>' +
                '<div class="qaq-3d-hint">拖动旋转 ·滚轮缩放 · 点击互动</div>' +
            '</div>' +
            '<div class="qaq-shop-detail-info">' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">类型</span><span>' + typeName + '</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">价格</span><span style="color:#e8c34f;font-weight:600;">' + item.price + ' 积分</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">状态</span><span style="color:' + (isOwned ? '#7bab6e' : '#999') + ';">' + (isOwned ? '已拥有' : '未拥有') + '</span></div>' +
            '</div>' +
        '</div>';

    if (isOwned) {
        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel" style="flex:1;">关闭</button>';
    } else {
        modalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-shop-detail-buy">兑换</button>';
    }

    qaqOpenModal();

    setTimeout(function () { qaq3DInit(item); }, 150);

    document.getElementById('qaq-modal-cancel').onclick = function () {
        qaq3DPreviewDestroy(); qaqCloseModal();
    };

    var buyBtn = document.getElementById('qaq-shop-detail-buy');
    if (buyBtn) {
        buyBtn.onclick = function () {
    try {
        var points = qaqGetPoints();
        if (points < item.price) return qaqToast('积分不足');

        var ownedList = qaqGetOwnedItems() || [];

        if (ownedList.some(function (x) { return x.id === item.id; })) {
            qaq3DPreviewDestroy();
            qaqCloseModal();
            return qaqToast('已拥有该物品');
        }

        ownedList.push({
            id: item.id,
            name: item.name,
            type: item.type,
            obtainedAt: Date.now()
        });

        // 先保存拥有，再扣积分
        qaqSaveOwnedItems(ownedList);
        qaqSavePoints(points - item.price);

        qaq3DPreviewDestroy();
        qaqCloseModal();

        qaqRenderShopPage();
        qaqRenderMinePanel();
        if (typeof qaqRenderGardenPage === 'function') qaqRenderGardenPage();
        if (typeof qaqRenderZooPage === 'function') qaqRenderZooPage();
        if (typeof qaqRenderXiaoyuanGarden === 'function') qaqRenderXiaoyuanGarden();
        if (typeof qaqRenderXiaoyuanZoo === 'function') qaqRenderXiaoyuanZoo();

        qaqToast('兑换成功');
    } catch (err) {
        console.error('详情页购买失败：', err);
        qaqToast('购买失败：' + (err.message || '未知错误'));
    }
};
    }
}

/* ===== Three.js 3D 场景初始化 ===== */
async function qaq3DInit(item) {
    qaq3DPreviewDestroy();
    qaq3D.destroyed = false;

    var canvas = document.getElementById('qaq-3d-canvas');
    var container = document.getElementById('qaq-3d-stage');
    if (!canvas || !container) {
        console.error('[3D] canvas或 container 不存在');
        return;
    }

    if (typeof THREE === 'undefined') {
        console.error('[3D] THREE 未定义');
        return;
    }

    try {
        var w = container.clientWidth || 280;
        var h = container.clientHeight || 220;
        var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');

        //----渲染器 ----
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (renderer.toneMapping !== undefined) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        qaq3D.renderer = renderer;

        // ---- 场景 ----
        var scene = new THREE.Scene();
        qaq3D.scene = scene;

        // ---- 相机 ----
        var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.set(0, 1.35, 4.2);
camera.lookAt(0, 1.0, 0);
        qaq3D.camera = camera;

        // ---- 控制器（容错） ----
        var controls = null;
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.0;
            controls.minDistance = 2.5;
            controls.maxDistance = 8;
            controls.maxPolarAngle = Math.PI * 0.58;
            controls.minPolarAngle = Math.PI * 0.2;
            controls.target.set(0, 1.0, 0);
            controls.update();
        } else {
            console.warn('[3D] OrbitControls 未加载，跳过控制器');
        }
        qaq3D.controls = controls;

        qaq3D.clock = new THREE.Clock();

        // ---- 灯光 ----
        scene.add(new THREE.AmbientLight(isDark ? 0x334455 : 0x8899aa, 0.8));
        var dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(3, 5, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(512, 512);
        if (dirLight.shadow.radius !== undefined) dirLight.shadow.radius = 4;
        scene.add(dirLight);

        var fillLight = new THREE.DirectionalLight(isDark ? 0x445566 : 0xffeedd, 0.4);
        fillLight.position.set(-2, 3, -2);
        scene.add(fillLight);

        var rim = new THREE.PointLight(0x88aaff, 0.6, 10);
        rim.position.set(-2, 2, -3);
        scene.add(rim);

        // ---- 地面 ----
        var ground = new THREE.Mesh(
            new THREE.CircleGeometry(3, 64),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x222222 : 0xddccbb, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.12;
        ground.receiveShadow = true;
        scene.add(ground);

        // ---- 主模型 ----
        var mainGroup = new THREE.Group();
        scene.add(mainGroup);
        qaq3D.mainGroup = mainGroup;

        try {
    await qaq3DBuild(item, mainGroup, isDark);
} catch (buildErr) {
    console.error('[3D] 模型构建失败:', buildErr);
    var fallbackMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xc47068, roughness: 0.3, metalness: 0.5 })
    );
    fallbackMesh.position.y = 0.8;
    fallbackMesh.castShadow = true;
    mainGroup.add(fallbackMesh);
}

        // ---- 粒子 ----
        try {
            qaq3DParticles(scene, item.type, isDark);
        } catch (partErr) {
            console.warn('[3D] 粒子创建失败:', partErr);
        }

        // ---- 点击交互 ----
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        canvas.addEventListener('click', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            if (raycaster.intersectObjects(mainGroup.children, true).length > 0) {
                qaq3DClickBounce(mainGroup, scene);
            }
        });

        // ---- 动画循环 ----
        function animate() {
            if (qaq3D.destroyed) return;
            qaq3D.animId = requestAnimationFrame(animate);

            try {
                var t = qaq3D.clock.getElapsedTime();
                if (controls) controls.update();
                if (mainGroup) mainGroup.position.y = Math.sin(t * 1.5) * 0.06;

                if (qaq3D.particles) {
                    qaq3D.particles.rotation.y += 0.002;
                    var pos = qaq3D.particles.geometry.attributes.position.array;
                    for (var i = 1; i < pos.length; i += 3) {
                        pos[i] += Math.sin(t * 2+ i) * 0.002;
                    }
                    qaq3D.particles.geometry.attributes.position.needsUpdate = true;
                }

                renderer.render(scene, camera);
            } catch (animErr) {
                console.error('[3D] 渲染帧出错:', animErr);
                cancelAnimationFrame(qaq3D.animId);
            }
        }
        animate();

        console.log('[3D] 初始化成功, 模型子节点:', mainGroup.children.length);} catch (err) {
        console.error('[3D] 初始化失败:', err);qaqToast('3D 渲染失败: ' + (err.message || '未知错误'));
    }
}

/* ===== 3D 模型构建 ===== */
async function qaq3DBuild(item, group, isDark) {
    var modelUrl = qaqGet3DModelUrl(item.id);

    if (modelUrl && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
        try {
            await qaq3DLoadGLB(item, group);
            return;
        } catch (e) {
            console.warn('GLB 模型加载失败，回退到手搓模型：', e);
            qaqToast('3D 模型加载失败，已切换为默认展示模型');
        }
    }

    var id = item.id;
    var builders = {
        'seed-sunflower': qaq3DSunflower,
        'seed-rose': qaq3DRose,
        'seed-cactus': qaq3DCactus,
        'animal-cat': qaq3DCat,
        'animal-dog': qaq3DDog,
        'animal-rabbit': qaq3DRabbit,
        'item-fertilizer': qaq3DFertilizer,
        'item-food-basic': qaq3DFoodBowl,
        'item-bed': qaq3DBed
    };

    var fn = builders[id];
    if (fn) {
        fn(group);
    } else {
        var m = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xc47068,
                roughness: 0.3,
                metalness: 0.5
            })
        );
        m.position.y = 0.8;
        m.castShadow = true;
        group.add(m);
    }
}

function qaq3DAddPot(g, color) {
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.35, 16), new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
    pot.position.y = 0.175; pot.castShadow = true; pot.receiveShadow = true; g.add(pot);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 24), new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
    rim.position.y = 0.35; rim.rotation.x = Math.PI / 2; g.add(rim);
}

function qaq3DSunflower(g) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x4a8838, roughness: 0.8 });
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8), mat);
    stem.position.y = 0.9; stem.castShadow = true; g.add(stem);
    for (var i = 0; i < 2; i++) {
        var lf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5a9840, roughness: 0.7 }));
        lf.scale.set(1, 0.2, 0.6); lf.position.set(i === 0 ? -0.25 : 0.25, 0.5+ i * 0.4, 0); lf.rotation.z = i === 0 ? 0.6 : -0.6; g.add(lf);
    }
    var center = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6 }));
    center.position.y = 1.85; center.castShadow = true; g.add(center);
    for (var j = 0; j < 12; j++) {
        var a = (j / 12) * Math.PI * 2;
        var p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0d060, roughness: 0.5 }));
        p.scale.set(0.5, 0.15, 1); p.position.set(Math.cos(a) * 0.5, 1.85, Math.sin(a) * 0.5); p.lookAt(0, 1.85, 0); g.add(p);
    }
    qaq3DAddPot(g, 0x9a7b5a);
}

function qaq3DRose(g) {
    var stemMat = new THREE.MeshStandardMaterial({
        color: 0x6f9638,
        roughness: 0.72
    });

    var leafMat = new THREE.MeshStandardMaterial({
        color: 0x57a132,
        roughness: 0.68
    });

    var petalMat = new THREE.MeshStandardMaterial({
        color: 0xe05565,
        roughness: 0.55,
        side: THREE.DoubleSide
    });

    // 茎
    var stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.045, 1.4, 10),
        stemMat
    );
    stem.position.y = 0.7;
    stem.castShadow = true;
    g.add(stem);

    // 叶子
    var leaf1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        leafMat
    );
    leaf1.scale.set(1.8, 0.32, 0.8);
    leaf1.position.set(0.18, 0.95, 0.02);
    leaf1.rotation.z = -0.7;
    g.add(leaf1);

    var leaf2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        leafMat
    );
    leaf2.scale.set(1.8, 0.32, 0.8);
    leaf2.position.set(-0.2, 0.6, -0.02);
    leaf2.rotation.z = 0.7;
    g.add(leaf2);

    // 花头（简单版）
    var flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 20, 20),
        petalMat
    );
    flower.scale.set(1.2, 0.95, 1.1);
    flower.position.set(0, 1.55, 0);
    flower.castShadow = true;
    g.add(flower);

    // 内层
    var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0xb92f42,
            roughness: 0.5
        })
    );
    core.position.set(0, 1.58, 0.06);
    core.castShadow = true;
    g.add(core);
}

function qaq3DCactus(g) {
    var cMat = new THREE.MeshStandardMaterial({ color: 0x4a8838, roughness: 0.6 });
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.4, 12), cMat);
    body.position.y = 0.9; body.castShadow = true; g.add(body);
    var a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.7, 8), cMat);
    a1.position.set(-0.35, 1.0, 0); a1.rotation.z = Math.PI / 4; g.add(a1);
    var a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), cMat);
    a2.position.set(0.3, 1.2, 0); a2.rotation.z = -Math.PI / 5; g.add(a2);
    var fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0d060, emissive: 0x332200, emissiveIntensity: 0.2 }));
    fl.position.set(0, 1.65, 0); g.add(fl);
    qaq3DAddPot(g, 0x8a7260);
}

function qaq3DCat(g) {
    var m = new THREE.MeshStandardMaterial({ color: 0xe8a050, roughness: 0.65 });
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), m); b.scale.set(1, 0.8, 0.7); b.position.y = 0.5; b.castShadow = true; g.add(b);
    var h = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m); h.position.set(0, 1.0, 0.2); h.castShadow = true; g.add(h);
    var eGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
    [-0.18, 0.18].forEach(function (x) { var e = new THREE.Mesh(eGeo, m); e.position.set(x, 1.32, 0.2); e.rotation.z = x< 0 ? 0.15 : -0.15; g.add(e); });
    var eyeM = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.12, 0.12].forEach(function (x) { var e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeM); e.position.set(x, 1.05, 0.5); g.add(e); });
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd07060 }));
    nose.position.set(0, 0.95, 0.52); g.add(nose);
    for (var i = 0; i < 4; i++) { var pw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), m); pw.scale.y = 0.5; pw.position.set(i< 2 ? -0.22 : 0.22, 0.08, i % 2 === 0 ? 0.2 : -0.15); pw.castShadow = true; g.add(pw); }
    var tc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.4, -0.35), new THREE.Vector3(0.2, 0.7, -0.6), new THREE.Vector3(0.3, 1.0, -0.5), new THREE.Vector3(0.15, 1.15, -0.3)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 20, 0.05, 8, false), m));
}

function qaq3DDog(g) {
    var bodyMat = new THREE.MeshStandardMaterial({
        color: 0xd8a36d,
        roughness: 0.75,
        metalness: 0.02
    });
    var earMat = new THREE.MeshStandardMaterial({
        color: 0xb97d4f,
        roughness: 0.8,
        metalness: 0.02
    });
    var muzzleMat = new THREE.MeshStandardMaterial({
        color: 0xf3dfc9,
        roughness: 0.7
    });
    var eyeMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3
    });
    var noseMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a22,
        roughness: 0.4
    });
    var blushMat = new THREE.MeshStandardMaterial({
        color: 0xf0b0a8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.9
    });

    // 身体：更圆润
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), bodyMat);
    body.scale.set(1.15, 0.9, 0.85);
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);

    // 头：更大
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), bodyMat);
    head.position.set(0, 1.18, 0.25);
    head.castShadow = true;
    g.add(head);

    // 嘴套
    var muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), muzzleMat);
    muzzle.scale.set(1.3, 0.95, 1.1);
    muzzle.position.set(0, 1.03, 0.62);
    muzzle.castShadow = true;
    g.add(muzzle);

    // 鼻子
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), noseMat);
    nose.scale.set(1.2, 0.9, 1);
    nose.position.set(0, 1.07, 0.82);
    g.add(nose);

    // 眼睛：更大更靠下
    [-0.16, 0.16].forEach(function (x) {
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeMat);
        eye.position.set(x, 1.2, 0.62);
        g.add(eye);

        var eyeLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        eyeLight.position.set(x - 0.02, 1.23, 0.67);
        g.add(eyeLight);
    });

    // 腮红
    [-0.24, 0.24].forEach(function (x) {
        var blush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), blushMat);
        blush.scale.set(1.4, 0.8, 0.4);
        blush.position.set(x, 1.02, 0.68);
        g.add(blush);
    });

    // 下垂耳
    [-0.34, 0.34].forEach(function (x) {
        var ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), earMat);
        ear.scale.set(0.85, 1.6, 0.55);
        ear.position.set(x, 1.18, 0.28);
        ear.rotation.z = x < 0 ? 0.35 : -0.35;
        ear.castShadow = true;
        g.add(ear);
    });

    // 四只短腿
    [
        [-0.24, 0.12, 0.2],
        [0.24, 0.12, 0.2],
        [-0.24, 0.12, -0.12],
        [0.24, 0.12, -0.12]
    ].forEach(function (p) {
        var leg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bodyMat);
        leg.scale.set(0.95, 0.7, 0.95);
        leg.position.set(p[0], p[1], p[2]);
        leg.castShadow = true;
        g.add(leg);
    });

    // 尾巴：短一点，狗感更强
    var tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.42, 0.62, -0.28),
        new THREE.Vector3(0.62, 0.9, -0.38),
        new THREE.Vector3(0.48, 1.15, -0.3)
    ]);
    var tail = new THREE.Mesh(
        new THREE.TubeGeometry(tailCurve, 20, 0.05, 8, false),
        bodyMat
    );
    tail.castShadow = true;
    g.add(tail);
}

function qaq3DRabbit(g) {
    var m = new THREE.MeshStandardMaterial({ color: 0xe0a8a0, roughness: 0.6 });
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), m); b.scale.set(0.9, 0.85, 0.7); b.position.y = 0.45; b.castShadow = true; g.add(b);
    var h = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m); h.position.set(0, 1.0, 0.15); g.add(h);
    [-0.14, 0.14].forEach(function (x) { var e = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), m); e.position.set(x, 1.5, 0.1); g.add(e); var t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), m); t.position.set(x, 1.82, 0.1); g.add(t); });
    [-0.12, 0.12].forEach(function (x) { var e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); e.position.set(x, 1.02, 0.44); g.add(e); });
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd08080 }));
    nose.position.set(0, 0.92, 0.48); g.add(nose);
    var blush = new THREE.MeshStandardMaterial({ color: 0xf0b8b0, transparent: true, opacity: 0.35 });
    [-0.22, 0.22].forEach(function (x) { var c = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), blush); c.position.set(x, 0.95, 0.4); g.add(c); });
    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), m); tail.position.set(0, 0.35, -0.4); g.add(tail);
}

function qaq3DFertilizer(g) {
    var bag = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x6a9a5e, roughness: 0.7 }));
    bag.position.y = 0.5; bag.castShadow = true; g.add(bag);
    var top = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 24), new THREE.MeshStandardMaterial({ color: 0x5a8a4e }));
    top.position.y = 0.95; top.rotation.x = Math.PI / 2; g.add(top);
    var label = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    label.position.set(0, 0.5, 0.36); g.add(label);
    var pM = new THREE.MeshStandardMaterial({ color: 0xa0c890});
    for (var i = 0; i < 6; i++) { var p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pM); p.position.set((Math.random() - 0.5) * 0.8, 0.04, (Math.random() - 0.5) * 0.8); g.add(p); }
}

function qaq3DFoodBowl(g) {
    var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.3, 24), new THREE.MeshStandardMaterial({ color: 0xe8d0b0, roughness: 0.5 }));
    bowl.position.y = 0.2; bowl.castShadow = true; g.add(bowl);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 32), new THREE.MeshStandardMaterial({ color: 0xd0b890}));
    rim.position.y = 0.35; rim.rotation.x = Math.PI / 2; g.add(rim);
    var food = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0xd4a060, roughness: 0.6 }));
    food.position.y = 0.35; food.castShadow = true; g.add(food);
}

function qaq3DBed(g) {
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x5b9bd5, roughness: 0.5 }));
    base.position.y = 0.1; base.castShadow = true; g.add(base);
    var edge = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.1, 12, 32), new THREE.MeshStandardMaterial({ color: 0x4a88c0}));
    edge.position.y = 0.2; edge.rotation.x = Math.PI / 2; g.add(edge);
    var cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0xa0d0f0, roughness: 0.6 }));
    cushion.position.y = 0.22; g.add(cushion);
    var pillow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0xc0e0ff, roughness: 0.5 }));
    pillow.scale.set(1.2, 0.5, 0.8); pillow.position.set(-0.2, 0.32, 0.15); g.add(pillow);
}

/* ===== 3D 粒子 ===== */
function qaq3DParticles(scene, type, isDark) {
    var count = 60;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var palette = type === 'seed'
        ? [new THREE.Color(0xf0d060), new THREE.Color(0xb8dfbf), new THREE.Color(0xffeedd)]
        : type === 'animal'
        ? [new THREE.Color(0xffbbcc), new THREE.Color(0xbbddff), new THREE.Color(0xffeedd)]
        : [new THREE.Color(0xa0c890), new THREE.Color(0xd0e0ff), new THREE.Color(0xf0d060)];
    for (var i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 1] = Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
        var c = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: isDark ? 0.4 : 0.6, sizeAttenuation: true }));
    scene.add(pts);
    qaq3D.particles = pts;
}

/* ===== 3D 点击弹跳 ===== */
function qaq3DClickBounce(mainGroup, scene) {
    var start = performance.now();
    function bounce() {
        var t = (performance.now() - start) / 500;
        if (t > 1) { mainGroup.scale.set(1, 1, 1); return; }
        var s = 1 +0.2 * Math.sin(t * Math.PI * 3) * (1 - t);
        var sy = 1 + 0.15 * Math.sin(t * Math.PI * 4) * (1 - t);
        mainGroup.scale.set(s, sy, s);
        requestAnimationFrame(bounce);
    }
    bounce();

    //粒子爆发
    var burstGroup = new THREE.Group();
    scene.add(burstGroup);
    var burstColors = [0xe8c34f, 0xe05565, 0x5b9bd5, 0x7bab6e, 0x8b6cc1];
    for (var i = 0; i < 15; i++) {
        var bm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshStandardMaterial({ color: burstColors[Math.floor(Math.random() * burstColors.length)], emissive: 0x332211, emissiveIntensity: 0.3 }));
        bm.position.set(0, 0.8, 0);
        bm.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.05+ Math.random() * 0.1, (Math.random() - 0.5) * 0.15);
        burstGroup.add(bm);
    }
    var bs = performance.now();
    function animBurst() {
        var elapsed = (performance.now() - bs) / 1000;
        if (elapsed > 1.5) { scene.remove(burstGroup); return; }
        burstGroup.children.forEach(function (child) {
            child.position.add(child.userData.velocity);
            child.userData.velocity.y -= 0.004;
            child.material.opacity = Math.max(0, 1 - elapsed);
            child.material.transparent = true;
        });
        requestAnimationFrame(animBurst);
    }
    animBurst();
}

/*===== 桌宠设置（设置页入口） ===== */
document.getElementById('qaq-set-pet').addEventListener('click', function () {
    var owned = qaqGetOwnedItems().filter(function (x) { return x.type === 'animal' || x.type === 'seed'; });

    modalTitle.textContent = '桌宠设置';

    if (!owned.length) {
        modalBody.innerHTML = '<div style="text-align:center;font-size:13px;color:#999;line-height:1.8;">还没有可设置的桌宠<br>去商店兑换动物或种子吧</div>';
        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel">关闭</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        return;
    }

    var currentPet = qaqGetActivePet();
    var currentId = currentPet ? currentPet.id : '';

    modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
        owned.map(function (item) {
            var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === item.id; });
            var isActive = item.id === currentId;
            return '<div class="qaq-custom-select-option' + (isActive ? ' qaq-custom-select-active' : '') + '" data-pet-id="' + item.id + '">' +
                '<span>' + (catItem ? catItem.name : item.name) + '</span>' +
                (isActive ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>';
        }).join('') +
        '<div class="qaq-custom-select-option" data-pet-id=""><span style="color:#aaa;">不设置桌宠</span></div>' +
        '</div>';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
            var petId = this.dataset.petId;
            if (!petId) {
                qaqSaveActivePet(null);
                document.getElementById('qaq-settings-pet-preview').textContent = '未设置';} else {
                qaqSaveActivePet({ id: petId });
                var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === petId; });
                document.getElementById('qaq-settings-pet-preview').textContent = catItem ? catItem.name : '已设置';
            }
            qaqCloseModal();
            qaqToast(petId ? '桌宠已设置' : '桌宠已取消');
        });
    });
});

// 初始化设置页桌宠预览文字
(function () {
    var pet = qaqGetActivePet();
    var previewEl = document.getElementById('qaq-settings-pet-preview');
    if (previewEl && pet) {
        var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === pet.id; });
        previewEl.textContent = catItem ? catItem.name : '已设置';
    }
})();

/* ====================================================================★★★ Live2D / 动态2D 引擎 ★★★
   ==================================================================== */

// ---- 精灵状态存储 ----
function qaqGetSpriteState(itemId) {
    var states = JSON.parse(localStorage.getItem('qaq-sprite-states') || '{}');
    return states[itemId] || { growth: 0, mood: 100, lastWater: 0, lastFeed: 0 };
}

function qaqSaveSpriteState(itemId, state) {
    var states = JSON.parse(localStorage.getItem('qaq-sprite-states') || '{}');
    states[itemId] = state;
    localStorage.setItem('qaq-sprite-states', JSON.stringify(states));
}

// ---- 2D 精灵工厂（SVG 动画） ----
var qaqPlantSVGs = {
    'seed-sunflower': function(scale) {
        return '<svg width="' + (48 * scale) + '" height="' + (64 * scale) + '" viewBox="0 0 48 64">' +
            '<line x1="24" y1="30" x2="24" y2="60" stroke="#5a8a3e" stroke-width="3" stroke-linecap="round"/>' +
            '<ellipse cx="18" cy="42" rx="8" ry="4" fill="#6aa84f" opacity="0.6" transform="rotate(-20,18,42)"/>' +
            '<ellipse cx="30" cy="38" rx="7" ry="3.5" fill="#6aa84f" opacity="0.5" transform="rotate(15,30,38)"/>' +
            '<circle cx="24" cy="20" r="10" fill="#e8c34f"/>' +
            '<circle cx="24" cy="20" r="5" fill="#a0722a"/>' +
            // 花瓣
            '<ellipse cx="24" cy="8" rx="4" ry="6" fill="#f0d060"/>' +
            '<ellipse cx="24" cy="32" rx="4" ry="6" fill="#f0d060"/>' +
            '<ellipse cx="12" cy="20" rx="6" ry="4" fill="#f0d060"/>' +
            '<ellipse cx="36" cy="20" rx="6" ry="4" fill="#f0d060"/>' +
            '<ellipse cx="15" cy="11" rx="5" ry="4" fill="#f0d060" transform="rotate(-45,15,11)"/>' +
            '<ellipse cx="33" cy="11" rx="5" ry="4" fill="#f0d060" transform="rotate(45,33,11)"/>' +
            '<ellipse cx="15" cy="29" rx="5" ry="4" fill="#f0d060" transform="rotate(45,15,29)"/>' +
            '<ellipse cx="33" cy="29" rx="5" ry="4" fill="#f0d060" transform="rotate(-45,33,29)"/>' +
            '</svg>';
    },
    'seed-rose': function(scale) {
    return '<svg width="' + (40 * scale) + '" height="' + (60 * scale) + '" viewBox="0 0 40 60">' +
        '<line x1="20" y1="26" x2="20" y2="56" stroke="#4a7a32" stroke-width="2.5" stroke-linecap="round"/>' +
        '<ellipse cx="14" cy="38" rx="6" ry="3" fill="#5a9840" opacity="0.7" transform="rotate(-25,14,38)"/>' +
        '<ellipse cx="26" cy="44" rx="6" ry="3" fill="#5a9840" opacity="0.65" transform="rotate(25,26,44)"/>' +
        '<path d="M20 8 C15 10 12 14 12 19 C12 24 16 28 20 28 C24 28 28 24 28 19 C28 14 25 10 20 8 Z" fill="#e05565"/>' +
        '<path d="M20 12 C17.5 13.5 16 16.5 16 19.5 C16 22.5 18 25 20 26" fill="#c84050" opacity="0.65"/>' +
        '<path d="M20 12 C22.5 13.5 24 16.5 24 19.5 C24 22.5 22 25 20 26" fill="#ea6a78" opacity="0.55"/>' +
        '<circle cx="20" cy="18" r="2.8" fill="#d04858" opacity="0.55"/>' +
        '</svg>';
},
    'seed-cactus': function(scale) {
        return '<svg width="' + (36 * scale) + '" height="' + (56 * scale) + '" viewBox="0 0 36 56">' +
            '<rect x="13" y="10" width="10" height="40" rx="5" fill="#5a9848"/>' +
            '<rect x="13" y="10" width="10" height="40" rx="5" fill="none" stroke="#4a8838" stroke-width="1"/>' +
            '<path d="M13 26 L8 22 L8 18 Q8 14 12 14" fill="none" stroke="#5a9848" stroke-width="4" stroke-linecap="round"/>' +
            '<path d="M23 20 L28 16 L28 12 Q28 8 24 8" fill="none" stroke="#5a9848" stroke-width="4" stroke-linecap="round"/>' +
            '<circle cx="15" cy="15" r="1" fill="#f0d060"/>' +
            '<circle cx="21" cy="30" r="1" fill="#f0d060"/>' +
            '<line x1="13" y1="50" x2="23" y2="50" stroke="#8a7260" stroke-width="2" stroke-linecap="round"/>' +
            '</svg>';
    }
};

var qaqAnimalSVGs = {
    'animal-cat': function(scale) {
        return '<svg width="' + (52 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 52 44">' +
            // 身体
            '<ellipse cx="26" cy="30" rx="14" ry="10" fill="#e8a050"/>' +
            // 头
            '<circle cx="26" cy="18" r="10" fill="#e8a050"/>' +
            // 耳朵
            '<polygon points="18,12 14,2 22,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
            '<polygon points="34,12 38,2 30,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
            '<polygon points="19,11 16,4 22,8" fill="#f0b8a0" opacity="0.5"/>' +
            '<polygon points="33,11 36,4 30,8" fill="#f0b8a0" opacity="0.5"/>' +
            // 眼睛
            '<ellipse cx="22" cy="17" rx="2.5" ry="3" fill="#333"/>' +
            '<ellipse cx="30" cy="17" rx="2.5" ry="3" fill="#333"/>' +
            '<circle cx="21" cy="16" r="1" fill="#fff"/>' +
            '<circle cx="29" cy="16" r="1" fill="#fff"/>' +
            // 鼻子
            '<ellipse cx="26" cy="21" rx="1.5" ry="1" fill="#d07060"/>' +
            // 嘴
            '<path d="M24 22 Q26 24 28 22" fill="none" stroke="#d07060" stroke-width="0.8"/>' +
            // 胡须
            '<line x1="14" y1="19" x2="21" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="14" y1="22" x2="21" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="38" y1="19" x2="31" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="38" y1="22" x2="31" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
            // 尾巴
            '<path d="M40 28 Q48 20 44 14" fill="none" stroke="#e8a050" stroke-width="3" stroke-linecap="round"/>' +
            //爪子
            '<ellipse cx="18" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
            '<ellipse cx="34" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
            '</svg>';
    },
    'animal-dog': function(scale) {
    return '<svg width="' + (56 * scale) + '" height="' + (48 * scale) + '" viewBox="0 0 56 48">' +
        // 身体
        '<ellipse cx="28" cy="33" rx="15" ry="10" fill="#d8a36d"/>' +

        // 头
        '<circle cx="28" cy="18" r="11" fill="#d8a36d"/>' +

        // 下垂耳
        '<ellipse cx="18" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(8,18,17)"/>' +
        '<ellipse cx="38" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(-8,38,17)"/>' +

        // 脸中间浅色嘴套
        '<ellipse cx="28" cy="22" rx="7" ry="5.5" fill="#f3dfc9"/>' +

        // 眼睛
        '<circle cx="24" cy="17" r="2.3" fill="#2f2f2f"/>' +
        '<circle cx="32" cy="17" r="2.3" fill="#2f2f2f"/>' +
        '<circle cx="23.3" cy="16.2" r="0.9" fill="#fff"/>' +
        '<circle cx="31.3" cy="16.2" r="0.9" fill="#fff"/>' +

        // 鼻子
        '<ellipse cx="28" cy="21.5" rx="2.3" ry="1.7" fill="#3a2a22"/>' +

        // 嘴
        '<path d="M26 23.8 Q28 25.5 30 23.8" fill="none" stroke="#8a5a46" stroke-width="0.9" stroke-linecap="round"/>' +

        // 腮红
        '<circle cx="20" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +
        '<circle cx="36" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +

        // 爪子
        '<ellipse cx="20" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +
        '<ellipse cx="36" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +

        // 尾巴
        '<path d="M42 31 Q50 25 48 18" fill="none" stroke="#d8a36d" stroke-width="3.2" stroke-linecap="round"/>' +
        '</svg>';
},
    'animal-rabbit': function(scale) {
        return '<svg width="' + (44 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 44 52">' +
            // 耳朵
            '<ellipse cx="16" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
            '<ellipse cx="28" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
            '<ellipse cx="16" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
            '<ellipse cx="28" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
            // 头
            '<circle cx="22" cy="26" r="11" fill="#e0a8a0"/>' +
            // 身体
            '<ellipse cx="22" cy="40" rx="10" ry="8" fill="#e0a8a0"/>' +
            // 眼睛
            '<circle cx="18" cy="24" r="2.5" fill="#333"/>' +
            '<circle cx="26" cy="24" r="2.5" fill="#333"/>' +
            '<circle cx="17.5" cy="23.5" r="1" fill="#fff"/>' +
            '<circle cx="25.5" cy="23.5" r="1" fill="#fff"/>' +
            // 鼻子
            '<ellipse cx="22" cy="28" rx="1.5" ry="1" fill="#d08080"/>' +
            // 腮红
            '<circle cx="14" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
            '<circle cx="30" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
            '</svg>';
    }
};

var qaqItemSVGs = {
    'item-fertilizer': function(scale) {
        return '<svg width="' + (40 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 40 52">' +
            //袋子
            '<rect x="8" y="20" width="24" height="28" rx="4" fill="#7bab6e" opacity="0.85"/>' +
            '<rect x="8" y="20" width="24" height="28" rx="4" fill="none" stroke="#5a8a4e" stroke-width="1.2"/>' +
            // 袋口折叠
            '<path d="M10 20 Q20 14 30 20" fill="#6a9a5e" stroke="#5a8a4e" stroke-width="0.8"/>' +
            // 标签
            '<rect x="13" y="28" width="14" height="10" rx="2" fill="#fff" opacity="0.7"/>' +
            '<text x="20" y="35" text-anchor="middle" fill="#5a8a4e" font-size="6" font-weight="700">N P K</text>' +
            // 叶子装饰
            '<path d="M20 8 C16 8 12 12 12 16 C12 20 16 22 20 22 C20 22 20 8 20 8Z" fill="#7bab6e" opacity="0.6"/>' +
            '<path d="M20 8 C24 8 28 12 28 16 C28 20 24 22 20 22 C20 22 20 8 20 8Z" fill="#6a9a5e" opacity="0.5"/>' +
            '<line x1="20" y1="8" x2="20" y2="22" stroke="#5a8a4e" stroke-width="1" stroke-linecap="round"/>' +
            // 散落的颗粒
            '<circle cx="14" cy="44" r="1.5" fill="#a0c890" opacity="0.6"/>' +
            '<circle cx="22" cy="46" r="1.2" fill="#90b880" opacity="0.5"/>' +
            '<circle cx="28" cy="43" r="1.8" fill="#a0c890" opacity="0.4"/>' +
            '</svg>';
    },
    'item-food-basic': function(scale) {
        return '<svg width="' + (44 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 44 44">' +
            // 碗
            '<path d="M6 22 Q6 36 22 38Q38 36 38 22 Z" fill="#e8d0b0" stroke="#d0b890" stroke-width="1"/>' +
            '<ellipse cx="22" cy="22" rx="16" ry="5" fill="#f0e0c8" stroke="#d0b890" stroke-width="0.8"/>' +
            // 食物堆
            '<ellipse cx="22" cy="20" rx="12" ry="4" fill="#d4a060"/>' +
            '<ellipse cx="18" cy="18" rx="3" ry="2.5" fill="#c89050" opacity="0.7"/>' +
            '<ellipse cx="26" cy="19" rx="3.5" ry="2" fill="#d8a868" opacity="0.6"/>' +
            '<ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#c08848" opacity="0.5"/>' +
            // 冒热气
            '<path d="M16 12 Q15 8 16 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
            '<path d="M22 10 Q21 6 22 4" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
            '<path d="M28 12 Q27 8 28 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
            '</svg>';
    },
    'item-bed': function(scale) {
        return '<svg width="' + (48 * scale) + '" height="' + (40 * scale) + '" viewBox="0 0 48 40">' +
            // 底座
            '<rect x="4" y="24" width="40" height="12" rx="6" fill="#5b9bd5" opacity="0.8"/>' +
            '<rect x="4" y="24" width="40" height="12" rx="6" fill="none" stroke="#4a88c0" stroke-width="1"/>' +
            // 垫子
            '<ellipse cx="24" cy="24" rx="18" ry="5" fill="#7ab8e8" opacity="0.6"/>' +
            //靠背/边缘
            '<path d="M8 24 Q8 14 16 12Q24 10 32 12Q40 14 40 24" fill="#6aa8d8" opacity="0.5" stroke="#4a88c0" stroke-width="0.8"/>' +
            //枕头
            '<ellipse cx="16" cy="20" rx="6" ry="3.5" fill="#a0d0f0" stroke="#80b8e0" stroke-width="0.6"/>' +
            // 小爪印装饰
            '<circle cx="30" cy="28" r="1.5" fill="#4a88c0" opacity="0.2"/>' +
            '<circle cx="28" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
            '<circle cx="32" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
            '<circle cx="29" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
            '<circle cx="31" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
            // 小z字（睡觉）
            '<text x="36" y="10" fill="#5b9bd5" font-size="8" font-weight="700" opacity="0.4">z</text>' +
            '<text x="39" y="6" fill="#5b9bd5" font-size="6" font-weight="700" opacity="0.3">z</text>' +
            '</svg>';
    }
};

// ---- Live2D 渲染引擎 ----
var qaqLive2DApps = {};

function qaqCreateLive2DApp(canvasId, width, height) {
    if (typeof PIXI === 'undefined') {
        console.warn('PixiJS 未加载，请先调用 qaqEnsureLive2D');
        return null;
    }

    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    if (qaqLive2DApps[canvasId]) {
        try { qaqLive2DApps[canvasId].destroy(true); } catch(e) {}
        delete qaqLive2DApps[canvasId];
    }

    var app = new PIXI.Application({
        view: canvas,
        width: width || canvas.parentElement.clientWidth,
        height: height || canvas.parentElement.clientHeight,
        transparent: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });

    qaqLive2DApps[canvasId] = app;
    return app;
}

async function qaqLoadLive2DModel(app, modelUrl, options) {
    if (!app || !modelUrl) return null;
    if (typeof PIXI === 'undefined' || !PIXI.live2d) {
        console.warn('pixi-live2d-display 未加载');
        return null;
    }

    options = options || {};
    var scale = options.scale || 0.15;
    var x = options.x != null ? options.x : app.screen.width / 2;
    var y = options.y != null ? options.y : app.screen.height * 0.85;

    try {
        var model = await PIXI.live2d.Live2DModel.from(modelUrl);
        model.scale.set(scale);
        model.anchor.set(0.5, 1);
        model.x = x;
        model.y = y;

        // 可交互
        model.interactive = true;
        model.buttonMode = true;

        // 点击交互 —— 随机动作
        model.on('pointertap', function() {
            var motions = Object.keys(model.internalModel.motionManager.definitions || {});
            if (motions.length) {
                var group = motions[Math.floor(Math.random() * motions.length)];
                model.motion(group);
            }
        });

        // 跟踪指针
        model.on('pointermove', function(e) {
            var point = e.data.global;
            model.focus(point.x, point.y);
        });

        app.stage.addChild(model);
        return model;
    } catch(err) {
        console.error('Live2D 模型加载失败:', err);
        return null;
    }
}

// ---- 2D 精灵渲染到场景 ----
function qaqCreateSpriteInScene(sceneEl, spriteHtml, x, y, name, itemId, type) {
    var container = document.createElement('div');
    container.className = 'qaq-sprite-container';
    container.style.left = x + 'px';
    container.style.bottom = '10px';
    container.dataset.itemId = itemId;

    var spriteWrap = document.createElement('div');
    spriteWrap.className = type === 'plant' ? 'qaq-plant-sprite' : 'qaq-animal-sprite';
    if (type === 'animal') spriteWrap.classList.add('qaq-walking');
    spriteWrap.innerHTML = spriteHtml;

    var nameTag = document.createElement('div');
    nameTag.className = 'qaq-sprite-name';
    nameTag.textContent = name;

    spriteWrap.appendChild(nameTag);
    container.appendChild(spriteWrap);
    sceneEl.appendChild(container);

    // 交互
    container.addEventListener('click', function() {
        if (type === 'plant') {
            qaqWaterPlant(container, itemId);
        } else {
            qaqPetAnimal(container, itemId);
        }
    });

    return container;
}

function qaqWaterPlant(containerEl, itemId) {
    var sprite = containerEl.querySelector('.qaq-plant-sprite');
    sprite.classList.add('qaq-watering');
    setTimeout(function() { sprite.classList.remove('qaq-watering'); }, 800);

    // 水滴效果
    for (var i = 0; i < 3; i++) {
        var drop = document.createElement('div');
        drop.className = 'qaq-water-drop';
        drop.style.left = (Math.random() * 20 + 10) + 'px';
        drop.style.top = '0px';
        drop.style.animationDelay = (i * 0.15) + 's';
        containerEl.appendChild(drop);
        setTimeout(function() { if (drop.parentNode) drop.remove(); }, 800);
    }

    // 更新状态
    var state = qaqGetSpriteState(itemId);
    state.growth = Math.min(100, (state.growth || 0) + 10);
    state.lastWater = Date.now();
    qaqSaveSpriteState(itemId, state);

    qaqAddPoints(1);
    qaqToast('浇水成功 +1 积分');
}

function qaqPetAnimal(containerEl, itemId) {
    var sprite = containerEl.querySelector('.qaq-animal-sprite');
    sprite.classList.add('qaq-bounce');
    setTimeout(function() { sprite.classList.remove('qaq-bounce'); }, 500);

    // 爱心效果
    var heart = document.createElement('div');
    heart.className = 'qaq-feed-heart';
    heart.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#e05565" stroke="none"><path d="M12 21C1221 3 15 3 8.5C3 5.46 5.46 3 8.5 3C10.24 3 11.91 3.81 135.09C14.09 3.81 15.76 3 17.5 3C20.54 3 23 5.46 23 8.5C23 15 14 21 14 21"/></svg>';
    heart.style.left = '50%';
    heart.style.top = '-10px';
    heart.style.transform = 'translateX(-50%)';
    containerEl.appendChild(heart);
    setTimeout(function() { if (heart.parentNode) heart.remove(); }, 1000);

    // 更新状态
    var state = qaqGetSpriteState(itemId);
    state.mood = Math.min(100, (state.mood || 50) + 5);
    state.lastFeed = Date.now();
    qaqSaveSpriteState(itemId, state);

    qaqAddPoints(1);
    qaqToast('互动成功 +1 积分');
}

// ---- 植物园渲染（替换原有函数） ----
function qaqRenderGardenPage() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'seed'; });
    var gridEl = document.getElementById('qaq-garden-plants-grid');
    var emptyEl = document.getElementById('qaq-garden-plants-empty');
    var sceneEl = document.getElementById('qaq-garden-scene');

    gridEl.innerHTML = '';

    // 清除场景中的旧精灵
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip').forEach(function(el) { el.remove(); });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    // 添加场景提示
    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击植物可浇水';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function(item, idx) {
        var catItem = qaqShopCatalog.seeds.find(function(x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var growth = state.growth || 0;
        var growthStage = growth< 30 ? 0.7 : (growth < 70 ? 0.85 : 1);

        // 场景中添加精灵
        var svgFn = qaqPlantSVGs[item.id];
        if (svgFn) {
            var x = spacing * (idx + 1) - 20;
            qaqCreateSpriteInScene(
                sceneEl,
                svgFn(growthStage),
                x,10,
                catItem ? catItem.name : item.name,
                item.id,
                'plant'
            );
        }

        // 网格卡片
        var card = document.createElement('div');
        card.className = 'qaq-garden-card';

        var bloomSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e05565" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><circle cx="12" cy="12" r="4" fill="#e05565" opacity="0.3"/><circle cx="12" cy="5" r="2.5" fill="#f8b0b8"/><circle cx="12" cy="19" r="2.5" fill="#f8b0b8"/><circle cx="5" cy="12" r="2.5" fill="#f8b0b8"/><circle cx="19" cy="12" r="2.5" fill="#f8b0b8"/></svg>';
var growSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22V12" stroke-linecap="round"/><path d="M8 16c0-4 2-6 4-7" stroke-linecap="round"/><path d="M16 14c0-3-2-5-4-6" stroke-linecap="round"/><circle cx="12" cy="8" r="3" fill="#7bab6e" opacity="0.2"/></svg>';
var seedSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22v-8" stroke-linecap="round"/><path d="M12 14c-3 0-5-2-5-5s4-7 5-7 5 4 5 7-2 5-5 5z" fill="#b8dfbf" opacity="0.3"/></svg>';

var statusText = growth >= 100 ? bloomSvg + '盛开' : (growth >= 50 ? growSvg + '成长中' : seedSvg + '幼苗');
        var statusColor = growth >= 100 ? '#e05565' : (growth >= 50 ? '#7bab6e' : '#999');

        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +
                (catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-status" style="color:' + statusColor + ';">' + statusText + '</div>' +
            '<div class="qaq-garden-card-growth"><div class="qaq-garden-card-growth-fill" style="width:' + growth + '%;"></div></div>';

        card.addEventListener('click', function() {
            qaqWaterPlant(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            //刷新卡片
            setTimeout(qaqRenderGardenPage, 300);
        });

        gridEl.appendChild(card);
    });
}

// ---- 动物园渲染（替换原有函数） ----
function qaqRenderZooPage() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'animal'; });
    var gridEl = document.getElementById('qaq-zoo-animals-grid');
    var emptyEl = document.getElementById('qaq-zoo-animals-empty');
    var sceneEl = document.getElementById('qaq-zoo-scene');

    gridEl.innerHTML = '';
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip, .qaq-live2d-loading').forEach(function(el) {
        el.remove();
    });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击动物互动';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function(item, idx) {
        var catItem = qaqShopCatalog.animals.find(function(x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var mood = state.mood || 50;

        var happySvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8c34f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><path d="M8 15s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/></svg>';
        var neutralSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><line x1="9" y1="15" x2="15" y2="15" stroke-linecap="round"/></svg>';
        var sadSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#999" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#999" stroke="none"/><path d="M8 17s1.5-2 4-2 4 2 4 2" stroke-linecap="round"/></svg>';
        var moodEmoji = mood >= 80 ? happySvg : (mood >= 50 ? neutralSvg : sadSvg);

        var svgFn = qaqAnimalSVGs[item.id];
        if (svgFn) {
            qaqCreateSpriteInScene(
                sceneEl, svgFn(1),
                spacing * (idx + 1) - 20, 10,
                catItem ? catItem.name : item.name,
                item.id,'animal'
            );
        }

        var card = document.createElement('div');
        card.className = 'qaq-garden-card';
        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +(catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-mood">' + moodEmoji + '</div>' +
            '<div class="qaq-garden-card-status">心情 ' + mood + '%</div>';

        card.addEventListener('click', function() {
            qaqPetAnimal(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            setTimeout(qaqRenderZooPage, 300);
        });

        gridEl.appendChild(card);
    });
}

// ---- 在场景中展示 Live2D ----
async function qaqShowLive2DInScene(canvasId, sceneEl, modelUrl, modelName) {
    var loadingEl = document.createElement('div');
    loadingEl.className = 'qaq-live2d-loading';
    sceneEl.appendChild(loadingEl);

    //懒加载 Live2D 库
    await new Promise(function(resolve) { qaqEnsureLive2D(resolve); });

    try {
        var w = sceneEl.clientWidth;
        var h = sceneEl.clientHeight;
        var app = qaqCreateLive2DApp(canvasId, w, h);
        if (!app) throw new Error('PixiJS 初始化失败');

        var model = await qaqLoadLive2DModel(app, modelUrl, {
            scale: 0.12,
            x: w / 2,
            y: h * 0.92
        });

        if (!model) throw new Error('模型加载失败');

        loadingEl.remove();
        qaqToast(modelName + ' 已加载');} catch(err) {
        console.error('Live2D 加载错误:', err);
        loadingEl.remove();
        qaqToast('Live2D 加载失败: ' + (err.message || '未知错误'));
    }
}


// ---- 全部浇水 / 全部喂食 ----
document.getElementById('qaq-garden-water-all-btn').addEventListener('click', function() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'seed'; });
    if (!owned.length) return qaqToast('没有可浇水的植物');

    owned.forEach(function(item) {
        var state = qaqGetSpriteState(item.id);
        state.growth = Math.min(100, (state.growth || 0) + 10);
        state.lastWater = Date.now();
        qaqSaveSpriteState(item.id, state);
    });

    qaqAddPoints(owned.length);
    qaqRenderGardenPage();
    qaqToast('全部浇水完成 +' + owned.length + ' 积分');
});

document.getElementById('qaq-zoo-feed-all-btn').addEventListener('click', function() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'animal'; });
    if (!owned.length) return qaqToast('没有可喂食的动物');

    owned.forEach(function(item) {
        var state = qaqGetSpriteState(item.id);
        state.mood = Math.min(100, (state.mood || 50) + 10);
        state.lastFeed = Date.now();
        qaqSaveSpriteState(item.id, state);
    });

    qaqAddPoints(owned.length);
    qaqRenderZooPage();
    qaqToast('全部喂食完成 +' + owned.length + ' 积分');
});

// ---- 从所有词库查找单词(用于小说点击) ----
function qaqFindWordFromAllBooksSync(rawWord) {
    var key = String(rawWord || '').toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    if (!key) return null;

    var books = qaqGetWordbooks();
    for (var i = 0; i < books.length; i++) {
        var words = books[i].words || [];
        for (var j = 0; j < words.length; j++) {
            if (String(words[j].word || '').toLowerCase() === key) {
                return words[j];
            }
        }
    }
    return null;
}

function qaqNormalizeOpenAIChatUrl(url) {
    url = String(url || '').trim().replace(/\/+$/, '');
    if (!url) return '';

    if (/\/chat\/completions$/i.test(url)) return url;
    if (/\/v\d+$/i.test(url)) return url + '/chat/completions';
    if (/\/v\d+\/$/i.test(url)) return url + 'chat/completions';
    return url + '/chat/completions';
}

async function qaqReviewGenerateByOpenAICompatible(cfg, prompt, signal) {
    var url = qaqNormalizeOpenAIChatUrl(cfg.url);

    var resp = await fetch(url, {
    method: 'POST',
    signal: signal,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
    },
    body: JSON.stringify({
        model: cfg.model,
        messages: [
            {
                role: 'system',
                content: '你是一个英语学习助手，必须严格返回 JSON。'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.4
    })
});

    if (!resp.ok) {
        var errText = await resp.text().catch(function () { return ''; });
        throw new Error('兼容接口请求失败：' + resp.status + ' ' + errText);
    }

    var data = await resp.json();
    var content =
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
        (data.choices && data.choices[0] && data.choices[0].text) ||
        '';

    if (!content) {
        throw new Error('兼容接口返回为空');
    }
// Token 统计
var usage = data.usage;
if (usage && usage.total_tokens) {
    qaqAddTokens(usage.total_tokens);
} else {
    qaqAddTokens(qaqEstimateTokens(prompt) + qaqEstimateTokens(content));
}
    return content;
}

function qaqOpenWordPopover(wordInfo, rect) {
    if (!wordInfo) return;

    var pop = document.getElementById('qaq-word-popover');
    var card = document.getElementById('qaq-word-popover-card');

    document.getElementById('qaq-word-popover-word').textContent = wordInfo.word || '';
    document.getElementById('qaq-word-popover-phonetic').textContent = wordInfo.phonetic || '';
    document.getElementById('qaq-word-popover-meaning').textContent = wordInfo.meaning || '暂无释义';

    pop.style.display = 'block';

    requestAnimationFrame(function () {
        var top = rect.top - card.offsetHeight - 10;
        if (top < 12) top = rect.bottom + 10;

        var left = rect.left + rect.width / 2 - card.offsetWidth / 2;
        if (left < 12) left = 12;
        if (left + card.offsetWidth > window.innerWidth - 12) {
            left = window.innerWidth - card.offsetWidth - 12;
        }

        card.style.top = top + 'px';
        card.style.left = left + 'px';
    });

    document.getElementById('qaq-word-popover-read-btn').onclick = function () {
        qaqSpeakWord(wordInfo.word || '');
    };
    document.getElementById('qaq-word-popover-close-btn').onclick = function () {
        qaqCloseWordPopover();
    };
}

function qaqCloseWordPopover() {
    var pop = document.getElementById('qaq-word-popover');
    if (pop) pop.style.display = 'none';
}

function qaqNormalizeMiniMaxNativeUrl(url, groupId) {
    url = String(url || '').trim().replace(/\/+$/, '');

    if (!url) {
        url = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
    }

    if (groupId) {
        if (url.indexOf('GroupId=') === -1) {
            url += (url.indexOf('?') > -1 ? '&' : '?') + 'GroupId=' + encodeURIComponent(groupId);
        }
    }

    return url;
}

async function qaqReviewGenerateByMiniMaxNative(cfg, prompt, signal) {
    var url = qaqNormalizeMiniMaxNativeUrl(cfg.url, cfg.minimaxGroupId);

    var resp = await fetch(url, {
    method: 'POST',
    signal: signal,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
    },
    body: JSON.stringify({
        model: cfg.model,
        temperature: 0.4,
        messages: [
            {
                sender_type: 'SYSTEM',
                sender_name: '系统',
                text: '你是一个英语学习助手，必须严格返回 JSON。'
            },
            {
                sender_type: 'USER',
                sender_name: '用户',
                text: prompt
            }
        ]
    })
});

    if (!resp.ok) {
        var errText = await resp.text().catch(function () { return ''; });
        throw new Error('MiniMax 原生接口请求失败：' + resp.status + ' ' + errText);
    }

    var data = await resp.json();

    var content =
        data.reply ||
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
        (data.base_resp && data.base_resp.status_msg) ||
        '';

    if (!content) {
        throw new Error('MiniMax 原生接口返回为空');
    }
// Token 统计
var usage = data.usage;
if (usage && usage.total_tokens) {
    qaqAddTokens(usage.total_tokens);
} else {
    qaqAddTokens(qaqEstimateTokens(prompt) + qaqEstimateTokens(content));
}
    return content;
}
/* ===== 分模块数据导出导入 ===== */
function qaqGetDataModules() {
    return {
        'all': {
            name: '全部数据',
            keys: function() {
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key.indexOf('qaq') === 0) keys.push(key);
                }
                return keys;
            }
        },
        'plan': {
            name: '今日计划',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) {
                    return k === 'qaq-plans' || 
                           k === 'qaq-plan-categories' || 
                           k === 'qaq-plan-theme';
                });
            }
        },
        'wordbank': {
            name: '词库',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) {
                    return k === 'qaq-wordbooks' || 
                           k === 'qaq-wordbank-theme';
                });
            }
        },
        'review': {
            name: '背单词',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) {
                    return k.indexOf('qaq-word-review') === 0 || 
                           k.indexOf('qaq-review-story') === 0;
                });
            }
        },
        'settings': {
            name: '基础设置',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) {
                    return k === 'qaq-theme' || 
                           k === 'qaq-api-config' || 
                           k === 'qaq-hidden-apps';
                });
            }
        }
    };
}

function qaqExportDataModule(moduleId) {
    var modules = qaqGetDataModules();
    var module = modules[moduleId];
    if (!module) return;

    var keys = module.keys();
    if (!keys.length) {
        return qaqToast('该模块暂无数据');
    }

    var data = {};
    keys.forEach(function(key) {
        data[key] = localStorage.getItem(key);
    });

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qaq-' + moduleId + '-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    qaqToast(module.name + '已导出');
}

function qaqOpenExportModal() {
    var modules = qaqGetDataModules();
    
    modalTitle.textContent = '数据导出';
    modalBody.innerHTML = 
        '<div class="qaq-settings-group-card">' +
        Object.keys(modules).map(function(id) {
            var module = modules[id];
            var count = module.keys().length;
            return (
                '<div class="qaq-settings-item" data-export-module="' + id + '">' +
                    '<div class="qaq-settings-item-text">' + module.name + '</div>' +
                    '<div style="font-size:11px;color:#999;">' + count + ' 项</div>' +
                    '<svg class="qaq-settings-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">' +
                        '<polyline points="9,6 15,12 9,18" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</div>'
            );
        }).join('') +
        '</div>';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    modalBody.querySelectorAll('[data-export-module]').forEach(function(item) {
        item.addEventListener('click', function() {
            var moduleId = this.dataset.exportModule;
            qaqExportDataModule(moduleId);
        });
    });
}

function qaqImportDataModule(file, moduleId) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            var modules = qaqGetDataModules();
            var module = modules[moduleId];
            
            if (moduleId === 'all') {
                // 全部导入
                Object.keys(data).forEach(function(key) {
                    if (key.indexOf('qaq') === 0) {
                        localStorage.setItem(key, data[key]);
                    }
                });
            } else {
                // 模块导入：只导入属于该模块的key
                var validKeys = module.keys();
                Object.keys(data).forEach(function(key) {
                    if (validKeys.indexOf(key) > -1 || 
                        (moduleId === 'all' && key.indexOf('qaq') === 0)) {
                        localStorage.setItem(key, data[key]);
                    }
                });
            }
            
            qaqToast(module.name + '已导入，刷新生效');
            setTimeout(function() { location.reload(); }, 1000);
        } catch (err) {
            console.error(err);
            qaqToast('文件格式错误');
        }
    };
    reader.readAsText(file);
}

function qaqOpenImportModal() {
    var modules = qaqGetDataModules();
    
    modalTitle.textContent = '数据导入';
    modalBody.innerHTML = 
        '<div class="qaq-settings-group-card">' +
        Object.keys(modules).map(function(id) {
            var module = modules[id];
            return (
                '<div class="qaq-settings-item" data-import-module="' + id + '">' +
                    '<div class="qaq-settings-item-text">' + module.name + '</div>' +
                    '<svg class="qaq-settings-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">' +
                        '<polyline points="9,6 15,12 9,18" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</div>'
            );
        }).join('') +
        '</div>' +
        '<input type="file" id="qaq-import-file-picker" accept=".json" style="display:none;">';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    var filePicker = document.getElementById('qaq-import-file-picker');
    var selectedModule = null;

    modalBody.querySelectorAll('[data-import-module]').forEach(function(item) {
        item.addEventListener('click', function() {
            selectedModule = this.dataset.importModule;
            filePicker.click();
        });
    });

    filePicker.onchange = function() {
        if (this.files && this.files[0] && selectedModule) {
            qaqImportDataModule(this.files[0], selectedModule);
            qaqCloseModal();
        }
        this.value = '';
    };
}

// ===== Android 全屏适配 =====
(function androidFullscreen() {
    const phoneFrame = document.querySelector('.qaq-phone-frame');
    if (!phoneFrame) return;

    // 1. 真实视口高度（解决地址栏收缩问题）
    function setRealVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--qaq-vh', vh + 'px');
        phoneFrame.style.height = window.innerHeight + 'px';
    }

    setRealVH();
    window.addEventListener('resize', setRealVH);

    // 部分安卓浏览器 resize 不触发，用 visualViewport 兜底
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setRealVH);
    }

    // 2. 尝试进入全屏模式（需要用户手势触发）
    function tryFullscreen() {
        const el = document.documentElement;
        const rfs = el.requestFullscreen
            || el.webkitRequestFullscreen
            || el.mozRequestFullScreen
            || el.msRequestFullscreen;
        if (rfs) {
            rfs.call(el).catch(() => {});
        }
    }

    // 3. 监听全屏状态变化
    function onFullscreenChange() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        phoneFrame.classList.toggle('qaq-fullscreen', isFS);
        // 全屏后重新算高度
        setTimeout(setRealVH, 100);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // 4. 双击顶部状态栏区域切换全屏
    const statusBar = document.querySelector('.qaq-status-bar');
    if (statusBar) {
        let lastTap = 0;
        statusBar.addEventListener('click', function () {
            const now = Date.now();
            if (now - lastTap < 300) {
                const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
                if (isFS) {
                    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                } else {
                    tryFullscreen();
                }
            }
            lastTap = now;
        });
    }

    // 5. 首次触摸时尝试全屏（安卓要求用户手势）
    let firstTouch = true;
    document.addEventListener('touchstart', function () {
        if (firstTouch) {
            firstTouch = false;
            tryFullscreen();
        }
    }, { once: true });

    // 6. 软键盘弹出适配（安卓输入框聚焦时视口会缩小）
    const inputs = phoneFrame.querySelectorAll('input, textarea');
    inputs.forEach(function (input) {
        input.addEventListener('focus', function () {
            setTimeout(function () {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });

        input.addEventListener('blur', function () {
            // 键盘收起后恢复高度
            setTimeout(setRealVH, 200);
        });
    });

    // 7. 阻止双指缩放（保持 UI 一致性）
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, false);

})();


// 替换原有的导出导入事件
document.getElementById('qaq-set-export').addEventListener('click', function() {
    qaqOpenExportModal();
});

document.getElementById('qaq-set-import').addEventListener('click', function() {
    qaqOpenImportModal();
});
/* 页面加载时应用主题 */
qaqApplyPlanTheme();
qaqApplyWidgetBg();
qaqApplyWordbankTheme();
qaqApplyWordbankCardTheme();

})();