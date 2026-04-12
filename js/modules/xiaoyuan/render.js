/**
 * js/modules/xiaoyuan/render.js
 * 小院模块 - 主渲染 / 刷新调度
 */
(function () {
    'use strict';

    var qaqXiaoyuanPage = document.getElementById('qaq-xiaoyuan-page');
    var qaqXyCurrentTab = 'plants';
    var _qaqXyRenderTimer = null;

    function qaqSetXiaoyuanCurrentTab(tab) {
        qaqXyCurrentTab = tab || 'plants';
    }

    function qaqGetXiaoyuanCurrentTab() {
        // 优先从 DOM 当前激活按钮读取，避免模块变量不同步
        var activeBtn = document.querySelector('[data-xy-tab].qaq-wordbank-tab-active');
        if (activeBtn && activeBtn.dataset && activeBtn.dataset.xyTab) {
            return activeBtn.dataset.xyTab;
        }
        return qaqXyCurrentTab || 'plants';
    }

    function qaqScheduleXiaoyuanRender() {
        if (_qaqXyRenderTimer) return;
        _qaqXyRenderTimer = requestAnimationFrame(function () {
            _qaqXyRenderTimer = null;
            qaqRenderXiaoyuanMain();
        });
    }

    function qaqRefreshXiaoyuanView() {
        if (!qaqXiaoyuanPage) return;
        if (qaqXiaoyuanPage.classList.contains('qaq-page-show')) {
            qaqRenderXiaoyuanMain();
        }
    }

    function qaqResolveOwnedType(x) {
        if (!x) return '';

        if (x.type === 'seed') return 'seed';
        if (x.type === 'animal') return 'animal';
        if (x.type === 'item') return 'item';

        // 兼容旧版本
        if (x.type === 'pet' || x.type === 'zoo' || x.type === 'animals') return 'animal';

        // 根据 id 兜底判断
        if (x.id) {
            var id = String(x.id);
            if (id.indexOf('seed-') === 0) return 'seed';
            if (id.indexOf('animal-') === 0) return 'animal';
            if (id.indexOf('item-') === 0) return 'item';
        }

        return '';
    }

    function qaqRenderXiaoyuanMain() {
        var currentTab = qaqGetXiaoyuanCurrentTab();
        qaqXyCurrentTab = currentTab;

        var ownedAll = qaqGetOwnedItems() || [];

        var plants = ownedAll.filter(function (x) {
            return qaqResolveOwnedType(x) === 'seed';
        });

        var animals = ownedAll.filter(function (x) {
            return qaqResolveOwnedType(x) === 'animal';
        });

        var items = ownedAll.filter(function (x) {
            return qaqResolveOwnedType(x) === 'item';
        });

        var currentMap = {
            plants: plants,
            animals: animals,
            items: items
        };

        var currentList = currentMap[currentTab] || [];

        var gridEl = document.getElementById('qaq-xy-main-grid');
        var emptyEl = document.getElementById('qaq-xy-main-empty');
        var sceneEl = document.getElementById('qaq-xy-main-scene');
        var interactBtn = document.getElementById('qaq-xy-interact-all-btn');
        var mount = qaqGetXiaoyuanSpriteMount();

        if (!gridEl || !emptyEl || !sceneEl || !interactBtn || !mount) return;

        gridEl.innerHTML = '';

        // 清空场景旧精灵
        sceneEl.querySelectorAll('.qaq-sprite-container').forEach(function (el) {
            el.remove();
        });

        var scaler = sceneEl.querySelector('.qaq-xiaoyuan-scene-scaler');
        if (scaler) {
            scaler.querySelectorAll('.qaq-sprite-container').forEach(function (el) {
                el.remove();
            });
        }

        // 上方场景：只展示植物和动物
        var sceneItems = plants.concat(animals).filter(function (item) {
            var s = qaqGetSpriteState(item.id);
            return s.inScene !== false;
        });

        if (sceneItems.length) {
            var spacing = (sceneEl.clientWidth || 300) / (sceneItems.length + 1);

            sceneItems.forEach(function (item, i) {
                var realType = qaqResolveOwnedType(item);

                qaqCreateSpriteInScene(
                    mount,
                    '',
                    spacing * (i + 1) - 20,
                    realType === 'seed' ? 10 : 24,
                    item.name,
                    item.id,
                    realType === 'seed' ? 'plant' : 'animal'
                );
            });
        }

        // 一键按钮
        if (currentTab === 'plants') {
            interactBtn.style.display = '';
            interactBtn.textContent = '一键浇水（全部植物）';
            interactBtn.onclick = function () {
                if (!plants.length) return qaqToast('没有植物可供浇水');

                plants.forEach(function (p) {
                    var s = qaqGetSpriteState(p.id);
                    s.growth = Math.min(100, (s.growth || 0) + 10);
                    qaqSaveSpriteState(p.id, s);
                });

                qaqAddPoints(plants.length);
                qaqScheduleXiaoyuanRender();
                qaqToast('浇水完成');
            };
        } else if (currentTab === 'animals') {
            interactBtn.style.display = '';
            interactBtn.textContent = '一键喂食（全部动物）';
            interactBtn.onclick = function () {
                if (!animals.length) return qaqToast('没有动物可供喂食');

                animals.forEach(function (a) {
                    var s = qaqGetSpriteState(a.id);
                    s.mood = Math.min(100, (s.mood || 50) + 10);
                    qaqSaveSpriteState(a.id, s);
                });

                qaqAddPoints(animals.length);
                qaqScheduleXiaoyuanRender();
                qaqToast('喂食完成');
            };
        } else {
            interactBtn.style.display = 'none';
            interactBtn.onclick = null;
        }

        if (!currentList.length) {
            emptyEl.style.display = '';
            return;
        }

        emptyEl.style.display = 'none';

        currentList.forEach(function (item) {
            var realType = qaqResolveOwnedType(item);
            var isPlant = realType === 'seed';
            var isAnimal = realType === 'animal';
            var state = qaqGetSpriteState(item.id);

            var statusColor = '#999';
            var statusText = '摆件';

            if (isPlant) {
                statusColor = (state.growth || 0) >= 100 ? '#e05565' : '#7bab6e';
                statusText = (state.growth || 0) >= 100
                    ? '已盛开'
                    : '成长进度 ' + (state.growth || 0) + '%';
            } else if (isAnimal) {
                statusColor = (state.mood || 50) >= 80 ? '#e8c34f' : '#e88d4f';
                statusText = '当前心情 ' + (state.mood || 50) + '%';
            }

            var card = document.createElement('div');
            card.className = 'qaq-garden-card';
            card.innerHTML =
                '<div class="qaq-garden-card-icon">' +
                    '<div class="qaq-garden-card-visual" id="qaq-card-visual-' + item.id + '"></div>' +
                '</div>' +
                '<div class="qaq-garden-card-name">' + item.name + '</div>' +
                '<div class="qaq-garden-card-status" style="color:' + statusColor + ';font-weight:600;">' + statusText + '</div>';

            card.addEventListener('click', function () {
                qaqOpenSpriteDetailModal(
                    item.id,
                    isPlant ? 'plant' : (isAnimal ? 'animal' : 'item')
                );
            });

            gridEl.appendChild(card);

            qaqRenderVisualToDOM(
                'qaq-card-visual-' + item.id,
                item.id,
                isPlant ? 'plant' : (isAnimal ? 'animal' : 'item'),
                0.9,
                'static',
                true
            );
        });
    }

    window.qaqScheduleXiaoyuanRender = qaqScheduleXiaoyuanRender;
    window.qaqRefreshXiaoyuanView = qaqRefreshXiaoyuanView;
    window.qaqRenderXiaoyuanMain = qaqRenderXiaoyuanMain;
    window.qaqSetXiaoyuanCurrentTab = qaqSetXiaoyuanCurrentTab;
    window.qaqGetXiaoyuanCurrentTab = qaqGetXiaoyuanCurrentTab;
    window.qaqXiaoyuanPage = qaqXiaoyuanPage;
})();