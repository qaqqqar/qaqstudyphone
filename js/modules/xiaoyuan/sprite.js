/**
 * js/modules/xiaoyuan/sprite.js
 * 小院模块 - 场景精灵 / 拖拽 / 互动动画
 */
(function () {
    'use strict';

    function qaqCreateSpriteInScene(sceneEl, spriteHtml, defaultX, defaultY, name, itemId, type) {
        var container = document.createElement('div');
        container.className = 'qaq-sprite-container';

        var state = window.qaqGetSpriteState ? window.qaqGetSpriteState(itemId) : {};
        var savedX = state.posX != null ? state.posX : defaultX;
        var savedY = state.posY != null ? state.posY : defaultY;

        container.style.left = savedX + 'px';
        container.style.bottom = savedY + 'px';
        container.dataset.itemId = itemId;

        var spriteWrap = document.createElement('div');
        spriteWrap.className = type === 'plant' ? 'qaq-plant-sprite' : 'qaq-animal-sprite';

        if (type === 'animal' && window.qaqGetXiaoyuanModeByType && window.qaqGetXiaoyuanModeByType('animal') !== 'lottie') {
            spriteWrap.classList.add('qaq-walking');
        }

        var innerId = 'scene-obj-' + itemId + '-' + Date.now();
        spriteWrap.id = innerId;

        // ===== 关键修复：包裹盒子大小跟缩放走 =====
        var sceneSettings = window.qaqGetXiaoyuanSceneSettings ? window.qaqGetXiaoyuanSceneSettings() : {};
        var latestState = window.qaqGetSpriteState ? window.qaqGetSpriteState(itemId) : {};
        var globalScale = type === 'plant'
            ? (sceneSettings.globalPlantScale || 1)
            : (sceneSettings.globalAnimalScale || 1);
        var finalScale = (latestState.scale || 1) * globalScale;

        var baseSize = 75;
        var finalSize = Math.max(36, Math.round(baseSize * finalScale));
        spriteWrap.style.width = finalSize + 'px';
        spriteWrap.style.height = finalSize + 'px';

        container.appendChild(spriteWrap);
        sceneEl.appendChild(container);

        // 渲染视觉
        try {
            if (window.qaqRenderVisualToDOM) {
                window.qaqRenderVisualToDOM(
                    innerId,
                    itemId,
                    type,
                    finalScale,
                    window.qaqGetXiaoyuanModeByType ? window.qaqGetXiaoyuanModeByType(type) : 'static',
                    true
                );
            } else {
                console.error('[QAQ-XY] window.qaqRenderVisualToDOM 未挂载');
            }
        } catch (err) {
            console.error('[QAQ-XY] 精灵渲染失败:', err);
        }

        // ===== 拖拽交互 =====
        var isDragging = false;
        var hasMoved = false;
        var startX = 0;
        var startY = 0;
        var initLeft = 0;
        var initBottom = 0;
        var activePointerId = null;

        function getSceneScaleInfo() {
            var rect = sceneEl.getBoundingClientRect();
            var logicalW = sceneEl.offsetWidth || sceneEl.clientWidth || rect.width || 1;
            var logicalH = sceneEl.offsetHeight || sceneEl.clientHeight || rect.height || 1;

            var scaleX = rect.width / logicalW;
            var scaleY = rect.height / logicalH;

            if (!isFinite(scaleX) || scaleX <= 0) scaleX = 1;
            if (!isFinite(scaleY) || scaleY <= 0) scaleY = 1;

            return {
                scaleX: scaleX,
                scaleY: scaleY,
                logicalW: logicalW,
                logicalH: logicalH
            };
        }

        function calcPosition(clientX, clientY) {
    var scaleInfo = getSceneScaleInfo();
    var dx = (clientX - startX) / scaleInfo.scaleX;
    var dy = (clientY - startY) / scaleInfo.scaleY;

    var newLeft = initLeft + dx;
    var newBottom = initBottom - dy;

    // 允许部分超出场景边缘，交给 overflow:hidden 裁剪
    var overflowX = 35;
    var overflowBottom = 30;
    var overflowTop = 10;

    newLeft = Math.max(-overflowX, Math.min(newLeft, scaleInfo.logicalW - 10));
    newBottom = Math.max(-overflowBottom, Math.min(newBottom, scaleInfo.logicalH - overflowTop));

    return {
        left: newLeft,
        bottom: newBottom
    };
}

        function onPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            activePointerId = e.pointerId;
            isDragging = true;
            hasMoved = false;

            startX = e.clientX;
            startY = e.clientY;
            initLeft = parseFloat(container.style.left) || 0;
            initBottom = parseFloat(container.style.bottom) || 0;

            container.style.zIndex = '999';
            container.style.transition = 'none';

            try { container.setPointerCapture(activePointerId); } catch (err) {}
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            if (activePointerId != null && e.pointerId !== activePointerId) return;

            var movedX = e.clientX - startX;
            var movedY = e.clientY - startY;

            if (Math.abs(movedX) > 4 || Math.abs(movedY) > 4) {
                hasMoved = true;
                if (e.cancelable) e.preventDefault();
            }

            if (!hasMoved) return;

            // ===== 关键修复：拖拽过程中直接更新 left/bottom =====
            var pos = calcPosition(e.clientX, e.clientY);
            container.style.left = pos.left + 'px';
            container.style.bottom = pos.bottom + 'px';
        }

        function finishPointer(e) {
            if (!isDragging) return;
            if (activePointerId != null && e && e.pointerId != null && e.pointerId !== activePointerId) return;

            isDragging = false;
            container.style.zIndex = '3';
            container.style.transition = '';

            try { container.releasePointerCapture(activePointerId); } catch (err) {}
            activePointerId = null;

            if (!hasMoved) {
                if (type === 'plant' && window.qaqOpenSpriteDetailModal) {
                    window.qaqOpenSpriteDetailModal(itemId, 'plant');
                } else if (type === 'animal' && window.qaqOpenSpriteDetailModal) {
                    window.qaqOpenSpriteDetailModal(itemId, 'animal');
                }
                return;
            }

            // ===== 关键修复：松手时把当前位置立即存档 =====
            var latest = window.qaqGetSpriteState ? window.qaqGetSpriteState(itemId) : {};
            latest.posX = parseFloat(container.style.left) || 0;
            latest.posY = parseFloat(container.style.bottom) || 0;

            if (window.qaqSaveSpriteState) {
                window.qaqSaveSpriteState(itemId, latest);
            }

            if (window.qaqDebugLog) {
                window.qaqDebugLog('[QAQ-XY] 已保存位置', itemId, 'x=' + latest.posX, 'y=' + latest.posY);
            } else {
                console.log('[QAQ-XY] 已保存位置', itemId, latest.posX, latest.posY);
            }
        }

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', finishPointer);
        container.addEventListener('pointercancel', finishPointer);
        container.addEventListener('lostpointercapture', finishPointer);

        return container;
    }

    function qaqWaterPlant(containerEl, itemId) {
        var sprite = containerEl.querySelector('.qaq-plant-sprite');
        if (sprite) {
            sprite.classList.add('qaq-watering');
            setTimeout(function () {
                sprite.classList.remove('qaq-watering');
            }, 800);
        }

        for (var i = 0; i < 3; i++) {
            var drop = document.createElement('div');
            drop.className = 'qaq-water-drop';
            drop.style.left = (Math.random() * 20 + 10) + 'px';
            drop.style.top = '0px';
            drop.style.animationDelay = (i * 0.15) + 's';
            containerEl.appendChild(drop);

            (function (node) {
                setTimeout(function () {
                    if (node.parentNode) node.remove();
                }, 800);
            })(drop);
        }

        var state = window.qaqGetSpriteState ? window.qaqGetSpriteState(itemId) : {};
        state.growth = Math.min(100, (state.growth || 0) + 10);
        state.lastWater = Date.now();

        if (window.qaqSaveSpriteState) {
            window.qaqSaveSpriteState(itemId, state);
        }

        if (window.qaqAddPoints) {
            window.qaqAddPoints(1);
        }
        if (window.qaqToast) {
            window.qaqToast('浇水成功 +1 积分');
        }
    }

    function qaqPetAnimal(containerEl, itemId) {
        var sprite = containerEl.querySelector('.qaq-animal-sprite');
        if (sprite) {
            sprite.classList.add('qaq-bounce');
            setTimeout(function () {
                sprite.classList.remove('qaq-bounce');
            }, 500);
        }

        var heart = document.createElement('div');
        heart.className = 'qaq-feed-heart';
        heart.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="#e05565" stroke="none">' +
                '<path d="M12 21C12 21 3 15 3 8.5C3 5.46 5.46 3 8.5 3C10.24 3 11.91 3.81 13 5.09C14.09 3.81 15.76 3 17.5 3C20.54 3 23 5.46 23 8.5C23 15 14 21 14 21"/>' +
            '</svg>';
        heart.style.left = '50%';
        heart.style.top = '-10px';
        heart.style.transform = 'translateX(-50%)';
        containerEl.appendChild(heart);

        setTimeout(function () {
            if (heart.parentNode) heart.remove();
        }, 1000);

        var state = window.qaqGetSpriteState ? window.qaqGetSpriteState(itemId) : {};
        state.mood = Math.min(100, (state.mood || 50) + 5);
        state.lastFeed = Date.now();

        if (window.qaqSaveSpriteState) {
            window.qaqSaveSpriteState(itemId, state);
        }

        if (window.qaqAddPoints) {
            window.qaqAddPoints(1);
        }
        if (window.qaqToast) {
            window.qaqToast('互动成功 +1 积分');
        }
    }

    window.qaqCreateSpriteInScene = qaqCreateSpriteInScene;
    window.qaqWaterPlant = qaqWaterPlant;
    window.qaqPetAnimal = qaqPetAnimal;
})();