(function () {
    'use strict';

    /* ===== Page Switch State ===== */
    window.qaqPageLock = false;
    window.qaqSwitchTimer = null;

    /* ===== Get Current Page ===== */
    window.qaqGetCurrentPage = function () {
        return document.querySelector('[class*="qaq-"].qaq-page-show');
    };

    /* ===== Switch To Page ===== */
    window.qaqSwitchTo = function (pageEl) {
        if (!pageEl) return;

        if (window.qaqPageLock) {
            clearTimeout(window.qaqSwitchTimer);
            window.qaqPageLock = false;
        }

        if (pageEl.classList.contains('qaq-page-show')) return;

        window.qaqPageLock = true;

        requestAnimationFrame(function () {
            pageEl.classList.add('qaq-page-show');

            clearTimeout(window.qaqSwitchTimer);
            window.qaqSwitchTimer = setTimeout(function () {
                window.qaqPageLock = false;
            }, 200);
        });
    };

    /* ===== Close Page ===== */
    window.qaqClosePage = function (pageEl) {
        if (!pageEl || window.qaqPageLock) return;

        window.qaqPageLock = true;
        pageEl.classList.remove('qaq-page-show');

        clearTimeout(window.qaqSwitchTimer);
        window.qaqSwitchTimer = setTimeout(function () {
            window.qaqPageLock = false;
        }, 200);
    };

    /* ===== Go Back To Parent Page ===== */
    window.qaqGoBackTo = function (parentPageEl, childPageEl) {
        if (!parentPageEl || !childPageEl || window.qaqPageLock) return;

        window.qaqPageLock = true;

        parentPageEl.style.transition = 'none';
        parentPageEl.classList.add('qaq-page-show');

        void parentPageEl.offsetHeight;

        parentPageEl.style.transition = '';

        requestAnimationFrame(function () {
            childPageEl.classList.remove('qaq-page-show');

            clearTimeout(window.qaqSwitchTimer);
            window.qaqSwitchTimer = setTimeout(function () {
                window.qaqPageLock = false;
            }, 200);
        });
    };

})();