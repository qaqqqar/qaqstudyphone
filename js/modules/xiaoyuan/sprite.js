/**
 * js/modules/xiaoyuan/sprite.js
 * 小院模块 - 场景精灵 / 拖拽 / 互动动画
 */
(function () {
    'use strict';

    function qaqCreateSpriteInScene(sceneEl, spriteHtml, defaultX, defaultY, name, itemId, type) {
        var container = document.createElement('div');
        container.className = 'qaq-sprite-container';

        // 读取存档坐标
        var state = qaqGetSpriteState(itemId);
        var savedX = state.posX != null ? state.posX : defaultX;
        var savedY = state.posY != null ? state.posY : defaultY;

        container.style.left = savedX + 'px';
        container.style.bottom = savedY + 'px';
        container.dataset.itemId = itemId;

        var spriteWrap = document.createElement('div');
        spriteWrap.className = type === 'plant' ? 'qaq-plant-sprite' : 'qaq-animal-sprite';

        if (type === 'animal' && qaqGetXiaoyuanModeByType('animal') !== 'lottie') {
            spriteWrap.classList.add('qaq-walking');
        }

        var innerId = 'scene-obj-' + itemId + '-' + Date.now();
        spriteWrap.id = innerId;
        spriteWrap.style.width = '75px';
        spriteWrap.style.height = '75px';

        container.appendChild(spriteWrap);
        sceneEl.appendChild(container);

        var sceneSettings = qaqGetXiaoyuanSceneSettings();
        var latestState = qaqGetSpriteState(itemId);
        var globalScale = type === 'plant'
            ? (sceneSettings.globalPlantScale || 1)
            : (sceneSettings.globalAnimalScale || 1);

        var finalScale = (latestState.scale || 1) * globalScale;

        qaqRenderVisualToDOM(
            innerId,
            itemId,
            type,
            finalScale,
            qaqGetXiaoyuanModeByType(type),
            true
        );

        // ===== 拖拽交互 =====
        var isDragging = false;
        var hasMoved = false;
        var startX = 0;
        var startY = 0;
        var initLeft = 0;
        var initBottom = 0;
        var sceneRect = null;
        var activePointerId = null;
        var rafId = 0;
        var pendingDX = 0;
        var pendingDY = 0;

        function applyDragFrame() {
            rafId = 0;
            if (!isDragging || !sceneRect) return;

            var newLeft = initLeft + pendingDX;
            var newBottom = initBottom - pendingDY;

            newLeft = Math.max(-20, Math.min(newLeft, sceneRect.width - 40));
            newBottom = Math.max(0, Math.min(newBottom, sceneRect.height - 50));

            container.style.transform =
                'translate3d(' + (newLeft - initLeft) + 'px,' + (-(newBottom - initBottom)) + 'px,0)';
        }

        function onPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            activePointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            initLeft = parseFloat(container.style.left) || 0;
            initBottom = parseFloat(container.style.bottom) || 0;
            sceneRect = sceneEl.getBoundingClientRect();

            isDragging = true;
            hasMoved = false;
            pendingDX = 0;
            pendingDY = 0;

            container.style.zIndex = '999';
            container.style.transition = 'none';

            try { container.setPointerCapture(activePointerId); } catch (err) {}
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            if (activePointerId != null && e.pointerId !== activePointerId) return;

            pendingDX = e.clientX - startX;
            pendingDY = e.clientY - startY;

            if (Math.abs(pendingDX) > 4 || Math.abs(pendingDY) > 4) {
                hasMoved = true;
                if (e.cancelable) e.preventDefault();
            }

            if (!hasMoved) return;
            if (!rafId) rafId = requestAnimationFrame(applyDragFrame);
        }

        function onPointerUp(e) {
            if (!isDragging) return;
            if (activePointerId != null && e.pointerId !== activePointerId) return;

            isDragging = false;
            container.style.zIndex = '3';
            container.style.transition = '';
            container.style.transform = '';

            try { container.releasePointerCapture(activePointerId); } catch (err) {}
            activePointerId = null;

            if (!hasMoved) {
                if (type === 'plant') qaqOpenSpriteDetailModal(itemId, 'plant');
                else if (type === 'animal') qaqOpenSpriteDetailModal(itemId, 'animal');
                return;
            }

            var newLeft = initLeft + pendingDX;
            var newBottom = initBottom - pendingDY;

            newLeft = Math.max(-20, Math.min(newLeft, sceneRect.width - 40));
            newBottom = Math.max(0, Math.min(newBottom, sceneRect.height - 50));

            var latest = qaqGetSpriteState(itemId);
            latest.posX = newLeft;
            latest.posY = newBottom;
            qaqSaveSpriteState(itemId, latest);
        }

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);

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

        // 水滴效果
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

        var state = qaqGetSpriteState(itemId);
        state.growth = Math.min(100, (state.growth || 0) + 10);
        state.lastWater = Date.now();
        qaqSaveSpriteState(itemId, state);

        qaqAddPoints(1);
        qaqToast('浇水成功 +1 积分');
    }

    function qaqPetAnimal(containerEl, itemId) {
        var sprite = containerEl.querySelector('.qaq-animal-sprite');
        if (sprite) {
            sprite.classList.add('qaq-bounce');
            setTimeout(function () {
                sprite.classList.remove('qaq-bounce');
            }, 500);
        }

        // 爱心效果
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

        var state = qaqGetSpriteState(itemId);
        state.mood = Math.min(100, (state.mood || 50) + 5);
        state.lastFeed = Date.now();
        qaqSaveSpriteState(itemId, state);

        qaqAddPoints(1);
        qaqToast('互动成功 +1 积分');
    }

    window.qaqCreateSpriteInScene = qaqCreateSpriteInScene;
    window.qaqWaterPlant = qaqWaterPlant;
    window.qaqPetAnimal = qaqPetAnimal;
})();