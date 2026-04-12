/**
 * js/modules/xiaoyuan/index.js
 * 小院模块 - 入口 / 设置事件 / tab 事件 / 初始化
 */
(function () {
    'use strict';

    function qaqApplyXiaoyuanThemeClass() {
        var frame = document.querySelector('.qaq-phone-frame');
        var page = document.getElementById('qaq-xiaoyuan-page');
        var sub = document.getElementById('qaq-sub-xiaoyuan-settings');
        if (!frame) return;

        [page, sub].forEach(function (el) {
            if (!el) return;
            el.classList.remove('qaq-theme-dark', 'qaq-theme-cool');
            if (frame.classList.contains('qaq-theme-dark')) {
                el.classList.add('qaq-theme-dark');
            } else if (frame.classList.contains('qaq-theme-cool')) {
                el.classList.add('qaq-theme-cool');
            }
        });
    }

    function qaqOpenXiaoyuanPage() {
        var page = window.qaqXiaoyuanPage || document.getElementById('qaq-xiaoyuan-page');
        qaqApplyXiaoyuanThemeClass();
        qaqApplyXiaoyuanSceneSkin(false);
        qaqSwitchTo(page);
        requestAnimationFrame(function () {
            if (typeof qaqRenderXiaoyuanMain === 'function') {
                qaqRenderXiaoyuanMain();
            }
        });
    }

    function bindXiaoyuanEvents() {
        var page = window.qaqXiaoyuanPage || document.getElementById('qaq-xiaoyuan-page');
        var sub = document.getElementById('qaq-sub-xiaoyuan-settings');

        var settingsBtn = document.getElementById('qaq-xiaoyuan-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function () {
                sub.classList.remove('qaq-theme-dark', 'qaq-theme-cool');
                if (page.classList.contains('qaq-theme-dark')) {
                    sub.classList.add('qaq-theme-dark');
                } else if (page.classList.contains('qaq-theme-cool')) {
                    sub.classList.add('qaq-theme-cool');
                }

                qaqRefreshXiaoyuanSettingTexts();
                qaqSwitchTo(sub);
            });
        }

        var plantScale = document.getElementById('qaq-xy-plant-scale');
        if (plantScale) {
            plantScale.addEventListener('input', function () {
                var v = parseInt(this.value, 10) || 100;
                var valEl = document.getElementById('qaq-xy-plant-scale-val');
                if (valEl) valEl.textContent = v + '%';

                var scene = qaqGetXiaoyuanSceneSettings();
                scene.globalPlantScale = v / 100;
                qaqSaveXiaoyuanSceneSettings(scene);
                qaqRenderXiaoyuanMain();
            });
        }

        var animalScale = document.getElementById('qaq-xy-animal-scale');
        if (animalScale) {
            animalScale.addEventListener('input', function () {
                var v = parseInt(this.value, 10) || 100;
                var valEl = document.getElementById('qaq-xy-animal-scale-val');
                if (valEl) valEl.textContent = v + '%';

                var scene = qaqGetXiaoyuanSceneSettings();
                scene.globalAnimalScale = v / 100;
                qaqSaveXiaoyuanSceneSettings(scene);
                qaqRenderXiaoyuanMain();
            });
        }

        var yardSkinBtn = document.getElementById('qaq-xy-yard-skin-btn');
        if (yardSkinBtn) {
            yardSkinBtn.addEventListener('click', function () {
                var scene = qaqGetXiaoyuanSceneSettings();
                var list = qaqGetYardSkinCatalog().map(function (item) {
                    return { value: item.id, label: item.name };
                });

                qaqOpenXiaoyuanSelectModal('选择小院皮肤', list, scene.yardSkin || 'default', function (val) {
                    qaqSaveXiaoyuanSceneSettings({ yardSkin: val });
                    qaqRefreshXiaoyuanSettingTexts();
                    qaqApplyXiaoyuanSceneSkin(true);
                });
            });
        }

        var plantModeBtn = document.getElementById('qaq-xy-plant-mode-btn');
        if (plantModeBtn) {
            plantModeBtn.addEventListener('click', function () {
                var settings = qaqGetXiaoyuanDisplaySettings();
                qaqOpenXiaoyuanSelectModal(
                    '植物渲染方式',
                    [
                        { value: 'static', label: '2D 静态' },
                        { value: 'lottie', label: '2D 动态' },
                        { value: '3d', label: '3D 模型' }
                    ],
                    settings.plantMode || 'lottie',
                    function (val) {
                        settings.plantMode = val;
                        qaqSaveXiaoyuanDisplaySettings(settings);
                        qaqRefreshXiaoyuanSettingTexts();
                    }
                );
            });
        }

        var animalModeBtn = document.getElementById('qaq-xy-animal-mode-btn');
        if (animalModeBtn) {
            animalModeBtn.addEventListener('click', function () {
                var settings = qaqGetXiaoyuanDisplaySettings();
                qaqOpenXiaoyuanSelectModal(
                    '动物渲染方式',
                    [
                        { value: 'static', label: '2D 静态' },
                        { value: 'lottie', label: '2D 动态' },
                        { value: '3d', label: '3D 模型' }
                    ],
                    settings.animalMode || 'lottie',
                    function (val) {
                        settings.animalMode = val;
                        qaqSaveXiaoyuanDisplaySettings(settings);
                        qaqRefreshXiaoyuanSettingTexts();
                    }
                );
            });
        }

        var itemModeBtn = document.getElementById('qaq-xy-item-mode-btn');
        if (itemModeBtn) {
            itemModeBtn.addEventListener('click', function () {
                var settings = qaqGetXiaoyuanDisplaySettings();
                qaqOpenXiaoyuanSelectModal(
                    '道具渲染方式',
                    [
                        { value: 'static', label: '2D 静态' },
                        { value: 'lottie', label: '2D 动态' },
                        { value: '3d', label: '3D 模型' }
                    ],
                    settings.itemMode || 'static',
                    function (val) {
                        settings.itemMode = val;
                        qaqSaveXiaoyuanDisplaySettings(settings);
                        qaqRefreshXiaoyuanSettingTexts();
                    }
                );
            });
        }

        var yardScale = document.getElementById('qaq-xy-yard-scale');
        if (yardScale) {
            yardScale.addEventListener('input', function () {
                var v = parseInt(this.value, 10) || 100;
                var valEl = document.getElementById('qaq-xy-yard-scale-val');
                if (valEl) valEl.textContent = v + '%';

                var scene = qaqGetXiaoyuanSceneSettings();
                scene.yardScale = v / 100;
                qaqSaveXiaoyuanSceneSettings(scene);
                qaqApplyXiaoyuanSceneSkin();
                qaqRenderXiaoyuanMain();
            });
        }

        var followScaleRow = document.getElementById('qaq-xy-follow-scale-row');
        if (followScaleRow) {
            followScaleRow.addEventListener('click', function () {
                var scene = qaqGetXiaoyuanSceneSettings();
                scene.followSceneScale = !(scene.followSceneScale !== false);
                qaqSaveXiaoyuanSceneSettings(scene);
                qaqRefreshXiaoyuanSettingTexts();
                qaqRenderXiaoyuanMain();
            });
        }

        var settingsBack = document.getElementById('qaq-xiaoyuan-settings-back');
        if (settingsBack) {
            settingsBack.addEventListener('click', function (e) {
                e.stopPropagation();
                qaqGoBackTo(page, sub);
            });
        }

        var settingsSave = document.getElementById('qaq-xy-settings-save-btn');
        if (settingsSave) {
            settingsSave.addEventListener('click', function () {
                qaqApplyXiaoyuanSceneSkin(false);
                qaqToast('小院设置已保存');
                qaqGoBackTo(page, sub);
                setTimeout(function () {
                    qaqRenderXiaoyuanMain();
                }, 120);
            });
        }

        var pageBack = document.getElementById('qaq-xiaoyuan-back');
        if (pageBack) {
            pageBack.addEventListener('click', function () {
                qaqClosePage(page);
            });
        }

        document.querySelectorAll('[data-xy-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('[data-xy-tab]').forEach(function (b) {
                    b.classList.remove('qaq-wordbank-tab-active');
                });
                this.classList.add('qaq-wordbank-tab-active');

                if (typeof qaqSetXiaoyuanCurrentTab === 'function') {
                    qaqSetXiaoyuanCurrentTab(this.dataset.xyTab);
                }

                if (window.qaqDebugLog) {
                    window.qaqDebugLog('[QAQ-XY] 当前切换到 tab = ' + this.dataset.xyTab);
                } else {
                    console.log('[QAQ-XY] 当前切换到 tab =', this.dataset.xyTab);
                }

                qaqRenderXiaoyuanMain();
            });
        });
    }

    function initXiaoyuan() {
        bindXiaoyuanEvents();
        setTimeout(function () {
            qaqRefreshXiaoyuanSettingTexts();
            qaqApplyXiaoyuanSceneSkin(false);
        }, 0);
    }

    window.qaqApplyXiaoyuanThemeClass = qaqApplyXiaoyuanThemeClass;
    window.qaqOpenXiaoyuanPage = qaqOpenXiaoyuanPage;
    window.qaqInitXiaoyuan = initXiaoyuan;

    initXiaoyuan();
})();