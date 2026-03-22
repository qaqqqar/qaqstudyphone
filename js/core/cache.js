(function () {
    'use strict';

    /* ===== QAQ Cache Layer ===== */
    window.qaqCache = {};

    window.qaqCacheGet = function (key, fallback) {
        if (window.qaqCache[key] !== undefined) return window.qaqCache[key];

        var raw = localStorage.getItem(key);
        var val;

        try {
            val = raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.warn('[qaqCacheGet] JSON parse failed:', key, e);
            val = fallback;
        }

        window.qaqCache[key] = val;
        return val;
    };

    window.qaqCacheSet = function (key, val) {
        window.qaqCache[key] = val;
        localStorage.setItem(key, JSON.stringify(val));
    };

    window.qaqCacheInvalidate = function (key) {
        delete window.qaqCache[key];
    };

    /* ===== Wordbooks ===== */
    window.qaqGetWordbooks = function () {
        return window.qaqCacheGet('qaq-wordbooks', []);
    };

    window.qaqSaveWordbooks = function (books) {
        window.qaqCacheSet('qaq-wordbooks', books);
    };

    /* ===== Plans ===== */
    window.qaqGetAllPlans = function () {
        return window.qaqCacheGet('qaq-plans', {});
    };

    window.qaqSavePlans = function (plans) {
        window.qaqCacheSet('qaq-plans', plans);
    };

    /* ===== Review Settings ===== */
    window.qaqGetReviewSettings = function () {
        return window.qaqCacheGet('qaq-word-review-settings', {
            roundCount: 20,
            random: true,
            autoPronounce: false,
            speechRate: 0.9,
            showPhonetic: true,
            showExample: true,
            skipMarked: true,
            storyMode: 'story',
            storyBilingualMode: 'summary-cn',
            storyWordCount: 800,
            apiProvider: 'openai',
            apiUrl: '',
            apiKey: '',
            apiModel: '',
            minimaxGroupId: ''
        });
    };

    window.qaqSaveReviewSettings = function (settings) {
        window.qaqCacheSet('qaq-word-review-settings', settings);
    };

    /* ===== Plan Categories ===== */
    window.qaqGetCategories = function () {
        return window.qaqCacheGet('qaq-plan-categories', [
            { name: '学习', color: '#5b9bd5' },
            { name: '生活', color: '#7bab6e' },
            { name: '运动', color: '#e88d4f' },
            { name: '工作', color: '#8b6cc1' },
            { name: '其他', color: '#999999' }
        ]);
    };

    window.qaqSaveCategories = function (cats) {
        window.qaqCacheSet('qaq-plan-categories', cats);
    };

    /* ===== Owned Items ===== */
    window.qaqGetOwnedItems = function () {
        return window.qaqCacheGet('qaq-mine-owned-items', []);
    };

    window.qaqSaveOwnedItems = function (items) {
        window.qaqCacheSet('qaq-mine-owned-items', items);
    };

    /* ===== Points ===== */
    window.qaqGetPoints = function () {
        return window.qaqCacheGet('qaq-mine-points', 9999999);
    };

    window.qaqSavePoints = function (n) {
        window.qaqCacheSet('qaq-mine-points', Math.max(0, n));
    };

    /* ===== Study Log ===== */
    window.qaqGetStudyLog = function () {
        return window.qaqCacheGet('qaq-study-log', {});
    };

    window.qaqSaveStudyLog = function (log) {
        window.qaqCacheSet('qaq-study-log', log);
    };

    /* ===== Review Favorites ===== */
    window.qaqGetReviewFavorites = function () {
        return window.qaqCacheGet('qaq-word-review-favorites', []);
    };

    window.qaqSaveReviewFavorites = function (items) {
        window.qaqCacheSet('qaq-word-review-favorites', items);
    };

    /* ===== Marked Words ===== */
    window.qaqGetMarkedWords = function () {
        return window.qaqCacheGet('qaq-word-review-marked', {});
    };

    window.qaqSaveMarkedWords = function (data) {
        window.qaqCacheSet('qaq-word-review-marked', data);
    };

    /* ===== Plan Theme ===== */
    window.qaqGetPlanTheme = function () {
        return window.qaqCacheGet('qaq-plan-theme', {
            wallpaper: '',
            wallpaperOpacity: 30,
            accent: '',
            cardBg: '',
            cardOpacity: 55,
            widgetBg: '',
            widgetOpacity: 45
        });
    };

    window.qaqSavePlanTheme = function (theme) {
        window.qaqCacheSet('qaq-plan-theme', theme);
    };

    /* ===== Wordbank Theme ===== */
    window.qaqGetWordbankTheme = function () {
        return window.qaqCacheGet('qaq-wordbank-theme', {
            appBg: '',
            appOpacity: 30,
            cardBg: '',
            cardOpacity: 55
        });
    };

    window.qaqSaveWordbankTheme = function (theme) {
        window.qaqCacheSet('qaq-wordbank-theme', theme);
    };

    /* ===== Status Bar Settings ===== */
    window.qaqGetStatusBarSettings = function () {
        return window.qaqCacheGet('qaq-statusbar-settings', {
            visible: true,
            batteryFollow: false,
            showToken: false
        });
    };

    window.qaqSaveStatusBarSettings = function (s) {
        window.qaqCacheSet('qaq-statusbar-settings', s);
    };

    /* ===== Mine Profile ===== */
    window.qaqGetMineProfile = function () {
        return window.qaqCacheGet('qaq-mine-profile', {
            nickname: '学习者',
            signature: '每天进步一点点',
            status: '学习中',
            avatar: ''
        });
    };

    window.qaqSaveMineProfile = function (p) {
        window.qaqCacheSet('qaq-mine-profile', p);
    };
    /* ===== Import Settings ===== */
window.qaqGetImportSettings = function () {
    return window.qaqCacheGet('qaq-import-settings', {
        importMode: 'fast' // fast | smart
    });
};

window.qaqSaveImportSettings = function (settings) {
    window.qaqCacheSet('qaq-import-settings', settings || {
        importMode: 'fast'
    });
};
/* ===== Wordbank Language ===== */
window.qaqGetWordbankLanguage = function () {
    return window.qaqCacheGet('qaq-wordbank-language', 'en');
};

window.qaqSaveWordbankLanguage = function (lang) {
    window.qaqCacheSet('qaq-wordbank-language', lang || 'en');
};
})();