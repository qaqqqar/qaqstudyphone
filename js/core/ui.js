(function () {
    'use strict';

    /* ===== Global Error Catch ===== */
    window.addEventListener('error', function (e) {
        document.title = 'ERR: ' + e.message;
        console.error('[QAQ Global Error]', e.message, e.filename, e.lineno);
    });

    /* ===== Toast ===== */
    window.qaqToastTimeout = null;

    window.qaqToast = function (msg) {
        var old = document.querySelector('.qaq-toast');
        if (old) old.remove();
        if (window.qaqToastTimeout) clearTimeout(window.qaqToastTimeout);

        var el = document.createElement('div');
        el.className = 'qaq-toast';
        el.textContent = msg;
        document.body.appendChild(el);

        requestAnimationFrame(function () {
            el.classList.add('qaq-show');
        });

        window.qaqToastTimeout = setTimeout(function () {
            el.classList.remove('qaq-show');
            setTimeout(function () {
                if (el.parentNode) el.remove();
            }, 260);
        }, 1400);
    };

    /* ===== Import / Progress Controller ===== */
    window.qaqImportCtrl = {
        cancelled: false,
        loadingTask: null,
        activeReader: null,
        busy: false
    };

    window.qaqImportProgressEl = document.getElementById('qaq-import-progress');
    window.qaqImportProgressTitleEl = document.getElementById('qaq-import-progress-title');
    window.qaqImportProgressDescEl = document.getElementById('qaq-import-progress-desc');
    window.qaqImportProgressFillEl = document.getElementById('qaq-import-progress-fill');
    window.qaqImportProgressTextEl = document.getElementById('qaq-import-progress-text');

    window.qaqImportCancelBtn = document.getElementById('qaq-import-cancel-btn');
    window.qaqImportRetryBtn = document.getElementById('qaq-import-retry-btn');

    window.qaqIsImportCancelled = function () {
        return !!window.qaqImportCtrl.cancelled;
    };

    window.qaqAbortCurrentImport = function () {
        window.qaqImportCtrl.cancelled = true;

        try {
            if (window.qaqImportCtrl.activeReader &&
                window.qaqImportCtrl.activeReader.readyState === 1) {
                window.qaqImportCtrl.activeReader.abort();
            }
        } catch (e) {}

        try {
            if (window.qaqImportCtrl.loadingTask &&
                typeof window.qaqImportCtrl.loadingTask.destroy === 'function') {
                window.qaqImportCtrl.loadingTask.destroy();
            }
        } catch (e) {}
    };

    window.qaqRequireImportNotCancelled = function () {
        if (window.qaqIsImportCancelled()) {
            var err = new Error('__QAQ_IMPORT_CANCELLED__');
            err.qaqCancelled = true;
            throw err;
        }
    };

    window.qaqIsCancelError = function (err) {
        return !!(err && (err.qaqCancelled || err.message === '__QAQ_IMPORT_CANCELLED__'));
    };

    /* ===== Progress UI ===== */
    window.qaqShowImportProgress = function (title, desc) {
        if (!window.qaqImportProgressEl) return;

        window.qaqImportCtrl.cancelled = false;

        window.qaqImportProgressTitleEl.textContent = title || '正在导入';
        window.qaqImportProgressDescEl.textContent = desc || '请稍等，正在解析文件…';
        window.qaqImportProgressFillEl.style.width = '0%';
        window.qaqImportProgressTextEl.textContent = '0%';

        window.qaqImportProgressEl.classList.add('qaq-import-show');

        if (window.qaqImportCancelBtn) {
            window.qaqImportCancelBtn.disabled = false;
        }

        var actions = document.querySelector('.qaq-import-progress-actions');
        if (actions) actions.style.display = 'flex';
    };

    window.qaqUpdateImportProgress = function (percent, desc) {
        if (!window.qaqImportProgressEl) return;

        percent = Math.max(0, Math.min(100, Math.round(percent || 0)));
        window.qaqImportProgressFillEl.style.width = percent + '%';
        window.qaqImportProgressTextEl.textContent = percent + '%';

        if (desc) {
            window.qaqImportProgressDescEl.textContent = desc;
        }
    };

    window.qaqHideImportProgress = function () {
        if (!window.qaqImportProgressEl) return;
        window.qaqImportProgressEl.classList.remove('qaq-import-show');
    };

    window.qaqShowStoryProgress = function (title, desc) {
        window.qaqShowImportProgress(
            title || '正在生成小说',
            desc || '请稍等，正在生成内容…'
        );

        var actions = document.querySelector('.qaq-import-progress-actions');
        if (actions) actions.style.display = 'none';
    };

    window.qaqHideStoryProgress = function () {
        var actions = document.querySelector('.qaq-import-progress-actions');
        if (actions) actions.style.display = 'flex';
        window.qaqHideImportProgress();
    };

    /* ===== Retry Picker Hook ===== */
    window.qaqOpenImportPicker = function () {
        var input = document.getElementById('qaq-wordbank-file-input');
        if (!input) return;
        input.value = '';
        input.click();
    };

    /* ===== Bind Progress Buttons ===== */
    if (window.qaqImportCancelBtn) {
        window.qaqImportCancelBtn.addEventListener('click', function () {
            window.qaqAbortCurrentImport();
            window.qaqHideImportProgress();
            window.qaqToast('已取消导入');
        });
    }

    if (window.qaqImportRetryBtn) {
        window.qaqImportRetryBtn.addEventListener('click', function () {
            if (window.qaqImportCtrl.busy) {
                window.qaqAbortCurrentImport();
            }
            window.qaqHideImportProgress();

            setTimeout(function () {
                window.qaqOpenImportPicker();
            }, 80);
        });
    }

})();