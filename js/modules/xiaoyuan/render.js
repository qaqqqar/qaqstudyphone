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

    // 标准字段
    if (x.type === 'seed') return 'seed';
    if (x.type === 'animal') return 'animal';
    if (x.type === 'item') return 'item';

    // 兼容旧版本
    if (x.type === 'pet' || x.type === 'zoo' || x.type === 'animals') return 'animal';
    if (x.category === 'animal') return 'animal';
    if (x.category === 'seed') return 'seed';
    if (x.category === 'item') return 'item';

    // 根据 id / itemId 兜底判断
    var rawId = x.id || x.itemId || x.goodsId || '';
    if (rawId) {
        var id = String(rawId);
        if (id.indexOf('seed-') === 0) return 'seed';
        if (id.indexOf('animal-') === 0) return 'animal';
        if (id.indexOf('item-') === 0) return 'item';
    }

    return '';
}
  function qaqMaybeAutoMoveSceneSprites(sceneItems, sceneEl) {
    if (!sceneItems || !sceneItems.length || !sceneEl) return;

    var now = Date.now();
    var sceneWidth = sceneEl.clientWidth || 300;
    var sceneHeight = sceneEl.clientHeight || 180;
    var changed = false;

    sceneItems.forEach(function (item, idx) {
        var state = window.qaqGetSpriteState ? window.qaqGetSpriteState(item.id) : null;
        if (!state) return;

        // 没设置过下次移动时间，就初始化
        if (!state.nextAutoMoveAt) {
            state.nextAutoMoveAt = now + (60 + Math.floor(Math.random() * 60)) * 60 * 1000; // 1~2小时
            if (window.qaqSaveSpriteState) window.qaqSaveSpriteState(item.id, state);
            return;
        }

        if (now < state.nextAutoMoveAt) return;

        // 随机位置
        var newX = Math.max(-20, Math.min(Math.floor(Math.random() * (sceneWidth - 40)), sceneWidth - 40));
        var newY = Math.max(0, Math.min(Math.floor(Math.random() * Math.max(40, sceneHeight - 60)), sceneHeight - 50));

        state.posX = newX;
        state.posY = newY;
        state.nextAutoMoveAt = now + (60 + Math.floor(Math.random() * 60)) * 60 * 1000; // 下次 1~2小时后
        changed = true;

        if (window.qaqSaveSpriteState) {
            window.qaqSaveSpriteState(item.id, state);
        }

        if (window.qaqDebugLog) {
            window.qaqDebugLog('[QAQ-XY] 自动换位', item.id, 'x=' + newX, 'y=' + newY);
        }
    });

    return changed;
}

    function qaqRenderXiaoyuanMain() {
    var currentTab = qaqGetXiaoyuanCurrentTab();
    qaqXyCurrentTab = currentTab;

    var ownedAll = (typeof window.qaqGetOwnedItems === 'function' ? window.qaqGetOwnedItems() : []) || [];

    if (window.qaqDebugLog) {
        window.qaqDebugLog('[QAQ-XY] render start');
        window.qaqDebugLog('[QAQ-XY] currentTab = ' + currentTab);
        window.qaqDebugLog('[QAQ-XY] ownedAll.length = ' + ownedAll.length);
        window.qaqDebugLog('[QAQ-XY] ownedAll raw = ' + JSON.stringify(ownedAll));
    } else {
        console.log('[QAQ-XY] render start', currentTab, ownedAll);
    }

        var plants = ownedAll.filter(function (x) {
            return qaqResolveOwnedType(x) === 'seed';
        });

        var animals = ownedAll.filter(function (x) {
            return qaqResolveOwnedType(x) === 'animal';
        });

        var inv = (typeof window.qaqGetItemInventory === 'function' ? window.qaqGetItemInventory() : {}) || {};
var items = [];

Object.keys(inv).forEach(function (key) {
    if (key === 'item-bed') {
        if (Array.isArray(inv[key]) && inv[key].length > 0) {
            var metaBed = (window.qaqShopCatalog && window.qaqShopCatalog.items || []).find(function (it) {
                return it.id === key;
            });
            items.push({
                id: key,
                name: metaBed ? metaBed.name : '小窝',
                type: 'item',
                count: inv[key].length
            });
        }
    } else if ((inv[key] || 0) > 0) {
        var meta = (window.qaqShopCatalog && window.qaqShopCatalog.items || []).find(function (it) {
            return it.id === key;
        });
        items.push({
            id: key,
            name: meta ? meta.name : key,
            type: 'item',
            count: inv[key]
        });
    }
});
        if (window.qaqDebugLog) {
    window.qaqDebugLog('[QAQ-XY] plants=' + plants.length + ', animals=' + animals.length + ', items=' + items.length);
}


        var currentMap = {
            plants: plants,
            animals: animals,
            items: items
        };

        var currentList = currentMap[currentTab] || [];
        if (window.qaqDebugLog) {
    window.qaqDebugLog('[QAQ-XY] currentList.length = ' + currentList.length);
}

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
        qaqMaybeAutoMoveSceneSprites(sceneItems, sceneEl);

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
    var s = window.qaqGetSpriteState(p.id);
    s.growth = Math.min(100, (s.growth || 0) + 10);
    s.energy = Math.min(100, (s.energy || 0) + 4);
    s.expEnergy = (s.expEnergy || 0) + 4;
    window.qaqSaveSpriteState(p.id, s);

    if (window.qaqPushSpriteLog) {
        window.qaqPushSpriteLog(p.id, '一键浇水：成长 +10%，精力 +4');
    }

    if (window.qaqMaybeLevelUp) {
        window.qaqMaybeLevelUp(p.id);
    }
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

        var inv = window.qaqGetItemInventory ? window.qaqGetItemInventory() : {};
        var foodCount = inv['item-food-basic'] || 0;

        if (foodCount < animals.length) {
            return qaqToast('粮食不足，需要 ' + animals.length + ' 份，当前只有 ' + foodCount + ' 份');
        }

        animals.forEach(function (a) {
            if (window.qaqConsumeInventory) {
                window.qaqConsumeInventory('item-food-basic', 1);
            }

            var s = window.qaqGetSpriteState ? window.qaqGetSpriteState(a.id) : {};
            s.mood = Math.min(100, (s.mood || 50) + 10);
            s.energy = Math.min(100, (s.energy || 0) + 8);
            s.expEnergy = (s.expEnergy || 0) + 8;

            if (window.qaqSaveSpriteState) {
                window.qaqSaveSpriteState(a.id, s);
            }

            if (window.qaqPushSpriteLog) {
                window.qaqPushSpriteLog(a.id, '一键喂食：心情 +10，精力 +8，粮食 -1');
            }

            if (window.qaqMaybeLevelUp) {
                window.qaqMaybeLevelUp(a.id);
            }
        });

        if (window.qaqAddPoints) {
            window.qaqAddPoints(animals.length);
        }

        qaqScheduleXiaoyuanRender();
        qaqToast('喂食完成，消耗 ' + animals.length + ' 份粮食');
    };
}
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
} else if (realType === 'item') {
    statusColor = '#5b9bd5';
    statusText = '库存 ' + (item.count || 0);
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