/**
 * js/modules/xiaoyuan/scene.js
 * 小院模块 - 场景结构 / 皮肤 / 进度层
 */
(function () {
    'use strict';

    var qaqXiaoyuanSkinLoader = null;
    var qaqXiaoyuanLoadAborter = null;
    var qaqXiaoyuanLoadChangingMode = false;

    function qaqEnsureXiaoyuanSceneStructure() {
        var sceneEl = document.getElementById('qaq-xy-main-scene');
        if (!sceneEl) return null;

        var inner = sceneEl.querySelector('.qaq-xiaoyuan-scene-inner');
        if (!inner) {
            inner = document.createElement('div');
            inner.className = 'qaq-xiaoyuan-scene-inner';
            while (sceneEl.firstChild) {
                inner.appendChild(sceneEl.firstChild);
            }
            sceneEl.appendChild(inner);
        }

        var scaler = inner.querySelector('.qaq-xiaoyuan-scene-scaler');
        if (!scaler) {
            scaler = document.createElement('div');
            scaler.className = 'qaq-xiaoyuan-scene-scaler';
            inner.appendChild(scaler);
        }

        return {
            sceneEl: sceneEl,
            inner: inner,
            scaler: scaler
        };
    }

    function qaqOpenXiaoyuanLoadProgress(title, desc, onCancel, onChangeMode) {
        var layer = document.getElementById('qaq-import-progress');
        var titleEl = document.getElementById('qaq-import-progress-title');
        var descEl = document.getElementById('qaq-import-progress-desc');
        var fillEl = document.getElementById('qaq-import-progress-fill');
        var textEl = document.getElementById('qaq-import-progress-text');
        var cancelBtn = document.getElementById('qaq-import-cancel-btn');
        var retryBtn = document.getElementById('qaq-import-retry-btn');

        if (!layer || !titleEl || !descEl || !fillEl || !textEl || !cancelBtn || !retryBtn) return;

        titleEl.textContent = title || '加载中';
        descEl.textContent = desc || '请稍候...';
        fillEl.style.width = '0%';
        textEl.textContent = '0%';
        retryBtn.textContent = '更换渲染方式';
        retryBtn.style.display = '';

        cancelBtn.onclick = function () {
            if (onCancel) onCancel();
            qaqCloseXiaoyuanLoadProgress();
        };

        retryBtn.onclick = function () {
            if (onChangeMode) onChangeMode();
            qaqCloseXiaoyuanLoadProgress();
        };

        layer.classList.add('qaq-import-show');
    }

    function qaqUpdateXiaoyuanLoadProgress(percent, desc) {
        var fillEl = document.getElementById('qaq-import-progress-fill');
        var textEl = document.getElementById('qaq-import-progress-text');
        var descEl = document.getElementById('qaq-import-progress-desc');

        if (fillEl) fillEl.style.width = (percent || 0) + '%';
        if (textEl) textEl.textContent = (percent || 0) + '%';
        if (descEl && desc != null) descEl.textContent = desc;
    }

    function qaqCloseXiaoyuanLoadProgress() {
        var layer = document.getElementById('qaq-import-progress');
        if (layer) layer.classList.remove('qaq-import-show');
    }

    function qaqApplyXiaoyuanSceneSkin(showProgress) {
        var refs = qaqEnsureXiaoyuanSceneStructure();
        if (!refs) return;

        var sceneEl = refs.sceneEl;
        var inner = refs.inner;
        var skin = qaqGetCurrentYardSkin();
        var settings = qaqGetXiaoyuanSceneSettings();
        var scale = settings.yardScale || 1;

        inner.style.transform = 'scale(' + scale + ')';
        inner.style.backgroundImage = '';
        inner.style.backgroundSize = 'cover';
        inner.style.backgroundPosition = 'center';
        inner.style.backgroundRepeat = 'no-repeat';

        if (qaqXiaoyuanSkinLoader) {
            qaqXiaoyuanSkinLoader.onload = null;
            qaqXiaoyuanSkinLoader.onerror = null;
            qaqXiaoyuanSkinLoader = null;
        }

        if (!skin || skin.id === 'default' || !skin.image) {
            sceneEl.classList.remove('qaq-xiaoyuan-has-custom-skin');
            return;
        }

        sceneEl.classList.remove('qaq-xiaoyuan-has-custom-skin');

        var img = new Image();
        qaqXiaoyuanSkinLoader = img;

        if (showProgress) {
            qaqOpenXiaoyuanLoadProgress(
                '加载小院皮肤',
                '正在读取皮肤资源...',
                function () {
                    if (qaqXiaoyuanSkinLoader) {
                        qaqXiaoyuanSkinLoader.onload = null;
                        qaqXiaoyuanSkinLoader.onerror = null;
                        qaqXiaoyuanSkinLoader = null;
                    }
                    qaqToast('已取消皮肤加载');
                },
                function () {
                    var scene = qaqGetXiaoyuanSceneSettings();
                    scene.yardSkin = 'default';
                    qaqSaveXiaoyuanSceneSettings(scene);
                    if (typeof qaqRefreshXiaoyuanSettingTexts === 'function') {
                        qaqRefreshXiaoyuanSettingTexts();
                    }
                    qaqApplyXiaoyuanSceneSkin(false);
                    qaqToast('已切换为默认渐变');
                }
            );

            qaqUpdateXiaoyuanLoadProgress(5, '正在发起请求...');
            setTimeout(function () {
                if (qaqXiaoyuanSkinLoader === img) {
                    qaqUpdateXiaoyuanLoadProgress(25, '正在下载图片...');
                }
            }, 120);
            setTimeout(function () {
                if (qaqXiaoyuanSkinLoader === img) {
                    qaqUpdateXiaoyuanLoadProgress(60, '正在解码图片...');
                }
            }, 260);
        }

        img.onload = function () {
            if (qaqXiaoyuanSkinLoader !== img) return;

            inner.style.backgroundImage = 'url("' + skin.image + '")';
            sceneEl.classList.add('qaq-xiaoyuan-has-custom-skin');

            if (showProgress) {
                qaqUpdateXiaoyuanLoadProgress(100, '皮肤加载完成');
                setTimeout(qaqCloseXiaoyuanLoadProgress, 180);
            }

            qaqXiaoyuanSkinLoader = null;
        };

        img.onerror = function () {
            if (qaqXiaoyuanSkinLoader !== img) return;

            if (showProgress) {
                qaqUpdateXiaoyuanLoadProgress(100, '皮肤加载失败');
                setTimeout(qaqCloseXiaoyuanLoadProgress, 200);
            }

            qaqToast('皮肤加载失败，请检查图片路径');
            qaqXiaoyuanSkinLoader = null;
        };

        img.src = skin.image;
    }

    function qaqGetXiaoyuanSpriteMount() {
        var refs = qaqEnsureXiaoyuanSceneStructure();
        if (!refs) return null;

        var settings = qaqGetXiaoyuanSceneSettings();
        return settings.followSceneScale ? refs.scaler : refs.sceneEl;
    }

    /* ===== 暴露 ===== */
    window.qaqEnsureXiaoyuanSceneStructure = qaqEnsureXiaoyuanSceneStructure;
    window.qaqApplyXiaoyuanSceneSkin = qaqApplyXiaoyuanSceneSkin;
    window.qaqGetXiaoyuanSpriteMount = qaqGetXiaoyuanSpriteMount;

    window.qaqOpenXiaoyuanLoadProgress = qaqOpenXiaoyuanLoadProgress;
    window.qaqUpdateXiaoyuanLoadProgress = qaqUpdateXiaoyuanLoadProgress;
    window.qaqCloseXiaoyuanLoadProgress = qaqCloseXiaoyuanLoadProgress;

    // 可选暴露，便于后续调试
    window.qaqXiaoyuanLoadAborter = qaqXiaoyuanLoadAborter;
    window.qaqXiaoyuanLoadChangingMode = qaqXiaoyuanLoadChangingMode;
})();