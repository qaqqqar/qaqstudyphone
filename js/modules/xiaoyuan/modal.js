/**
 * js/modules/xiaoyuan/modal.js
 * 小院模块 - 弹窗 / 设置文案 / 精灵互动
 */
(function () {
    'use strict';

    var modalTitle = window.qaqModalTitle || document.getElementById('qaq-modal-title');
    var modalBody = window.qaqModalBody || document.getElementById('qaq-modal-body');
    var modalBtns = window.qaqModalBtns || document.getElementById('qaq-modal-btns');

    function qaqGetRenderModeLabel(mode) {
        var map = {
            'static': '2D 静态',
            'lottie': '2D 动态',
            '3d': '3D 模型'
        };
        return map[mode] || mode;
    }

    function qaqRefreshXiaoyuanSettingTexts() {
        var display = qaqGetXiaoyuanDisplaySettings();
        var scene = qaqGetXiaoyuanSceneSettings();
        var skin = qaqGetCurrentYardSkin();

        var skinText = document.getElementById('qaq-xy-yard-skin-text');
        var plantText = document.getElementById('qaq-xy-plant-mode-text');
        var animalText = document.getElementById('qaq-xy-animal-mode-text');
        var itemText = document.getElementById('qaq-xy-item-mode-text');
        var scaleInput = document.getElementById('qaq-xy-yard-scale');
        var scaleVal = document.getElementById('qaq-xy-yard-scale-val');
        var followToggle = document.getElementById('qaq-xy-follow-scale-toggle');

        var plantScaleInput = document.getElementById('qaq-xy-plant-scale');
        var plantScaleVal = document.getElementById('qaq-xy-plant-scale-val');
        var animalScaleInput = document.getElementById('qaq-xy-animal-scale');
        var animalScaleVal = document.getElementById('qaq-xy-animal-scale-val');

        if (skinText) skinText.textContent = skin ? skin.name : '默认渐变';
        if (plantText) plantText.textContent = qaqGetRenderModeLabel(display.plantMode || 'lottie');
        if (animalText) animalText.textContent = qaqGetRenderModeLabel(display.animalMode || 'lottie');
        if (itemText) itemText.textContent = qaqGetRenderModeLabel(display.itemMode || 'static');
        if (scaleInput) scaleInput.value = Math.round((scene.yardScale || 1) * 100);
        if (scaleVal) scaleVal.textContent = Math.round((scene.yardScale || 1) * 100) + '%';
        if (followToggle) followToggle.classList.toggle('qaq-toggle-on', scene.followSceneScale !== false);

        if (plantScaleInput) plantScaleInput.value = Math.round((scene.globalPlantScale || 1) * 100);
        if (plantScaleVal) plantScaleVal.textContent = Math.round((scene.globalPlantScale || 1) * 100) + '%';
        if (animalScaleInput) animalScaleInput.value = Math.round((scene.globalAnimalScale || 1) * 100);
        if (animalScaleVal) animalScaleVal.textContent = Math.round((scene.globalAnimalScale || 1) * 100) + '%';
    }

    function qaqOpenXiaoyuanSelectModal(title, list, currentValue, onSelect) {
        modalTitle.textContent = title;
        modalBody.innerHTML =
            '<div class="qaq-custom-select-list">' +
            list.map(function (item) {
                var active = item.value === currentValue;
                return '<div class="qaq-custom-select-option' + (active ? ' qaq-custom-select-active' : '') + '" data-value="' + item.value + '">' +
                    '<span>' + item.label + '</span>' +
                    (active ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>';
            }).join('') +
            '</div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';

        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (opt) {
            opt.addEventListener('click', function () {
                var val = this.dataset.value;
                onSelect(val);
                qaqCloseModal();
            });
        });
    }

    function qaqOpenXiaoyuanRenderModeQuickSwitch(type) {
        var settings = qaqGetXiaoyuanDisplaySettings();
        var current = type === 'plant'
            ? (settings.plantMode || 'lottie')
            : type === 'animal'
                ? (settings.animalMode || 'lottie')
                : (settings.itemMode || 'static');

        qaqOpenXiaoyuanSelectModal(
            '更换' + (type === 'plant' ? '植物' : type === 'animal' ? '动物' : '道具') + '渲染方式',
            [
                { value: 'static', label: '2D 静态' },
                { value: 'lottie', label: '2D 动态' },
                { value: '3d', label: '3D 模型' }
            ],
            current,
            function (val) {
                if (type === 'plant') settings.plantMode = val;
                else if (type === 'animal') settings.animalMode = val;
                else settings.itemMode = val;

                qaqSaveXiaoyuanDisplaySettings(settings);
                qaqRefreshXiaoyuanSettingTexts();
                if (typeof qaqRenderXiaoyuanMain === 'function') {
                    qaqRenderXiaoyuanMain();
                }
                qaqToast('已切换渲染方式');
            }
        );
    }

    function qaqOpenSpriteDetailModal(itemId, kind) {
    // 去除多重购买后缀拿到数据模板
    var baseId = String(itemId).replace(/-\d{13}$/, '');
    var allItems = window.qaqShopCatalog.seeds.concat(window.qaqShopCatalog.animals, window.qaqShopCatalog.items);
    var item = allItems.find(function (x) { return x.id === baseId; });
    if (!item) return;

    if (item.type === 'item') kind = 'item';
    else if (item.type === 'seed') kind = 'plant';
    else if (item.type === 'animal') kind = 'animal';

    var s = qaqGetSpriteState(itemId);
    var inv = qaqGetItemInventory();
    
    // 🌟 读取它的专属定制名字，没有则用系统默认
    var displayName = s.customName || item.name;

    modalTitle.textContent = displayName + ' · 详情';

    // ===== 道具详情：完美显示库存量与普通等级模板 =====
    if (kind === 'item') {
        var stockText = '0';
        var extraRows = '';
        var levelText = '普通';

        // 判断库存并组装独特的文字提示
        if (baseId === 'item-bed') {
            var beds = Array.isArray(inv['item-bed']) ? inv['item-bed'] : [];
            stockText = String(beds.length);
            var durabilityText = beds.length
                ? beds.map(function (bed, idx) { return '床铺 ' + (idx + 1) + '：耐久 ' + (bed.durability || 0) + '/40'; }).join('<br>')
                : '暂无床铺，在商店购买后可用';
            extraRows = '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">耐久详情</span><span style="text-align:right;line-height:1.7;">' + durabilityText + '</span></div>';
        } else if (baseId === 'item-food-basic') {
            stockText = String(inv['item-food-basic'] || 0);
            extraRows = '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">用途</span><span>用于在小院或弹窗喂食动物</span></div>';
        } else if (baseId === 'item-fertilizer') {
            stockText = String(inv['item-fertilizer'] || 0);
            extraRows = '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">用途</span><span>用于促使植物超速成长</span></div>';
        }

        modalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div style="display:flex;justify-content:center;margin-bottom:4px;">' +
                    '<div id="qaq-sprite-detail-preview" style="width:88px;height:88px;"></div>' +
                '</div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">等级</span><span>' + levelText + '</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">当前库存量</span><span style="color:#7bab6e;font-weight:600;">' + stockText + ' 份</span></div>' +
            '</div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel">关闭</button>';

        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        qaqRenderVisualToDOM('qaq-sprite-detail-preview', itemId, 'item', 1.2, 'static', true);
        return;
    }

    // ===== 以下是 植物/动物 的模板 (加入点击改名功能) =====
    var logsHtml = (s.logs || []).slice(0, 8).map(function (log) {
        var t = new Date(log.time);
        var timeStr = isNaN(t.getTime()) ? '' : ((t.getMonth() + 1) + '-' + t.getDate() + ' ' + (t.getHours() < 10 ? '0' : '') + t.getHours() + ':' + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes());
        var safeText = window.qaqEscapeHtml ? window.qaqEscapeHtml(log.text) : String(log.text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return '<div style="font-size:11px;color:#888;line-height:1.7;">• ' + safeText + ' <span style="color:#bbb;">' + timeStr + '</span></div>';
    }).join('');

    var safeDisplayName = window.qaqEscapeHtml ? window.qaqEscapeHtml(displayName) : String(displayName).replace(/</g, "&lt;");

    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div style="display:flex;justify-content:center;margin-bottom:4px;">' +
                '<div id="qaq-sprite-detail-preview" style="width:88px;height:88px;"></div>' +
            '</div>' +
            // 🌟 新增的名字修改行
            '<div class="qaq-shop-detail-row" id="qaq-sprite-name-row" style="cursor:pointer;background:rgba(0,0,0,0.02);border-radius:8px;padding:8px 12px;margin-bottom:8px;">' +
                '<span class="qaq-shop-detail-label">名字 <span style="font-size:10px;color:#aaa;font-weight:normal;">(点击修改)</span></span>' +
                '<span style="color:#5b9bd5;font-weight:600;">' + safeDisplayName + ' ✎</span>' +
            '</div>' +
            '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">等级</span><span>Lv.' + (s.level || 1) + '</span></div>' +
            '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">心情</span><span>' + (s.mood || 0) + '/100</span></div>' +
            '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">精力</span><span>' + (s.energy || 0) + '/100</span></div>' +
            (kind === 'plant' ? '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">成长</span><span>' + (s.growth || 0) + '%</span></div>' : '') +
            '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">加入图景</span><span>' + (s.inScene !== false ? '已加入' : '未加入') + '</span></div>' +
            '<div class="qaq-plan-form-label">单独缩放</div>' +
            '<div class="qaq-theme-slider-row">' +
                '<span class="qaq-theme-slider-label">缩放</span>' +
                '<input type="range" class="qaq-theme-slider" id="qaq-sprite-scale-range" min="60" max="180" value="' + Math.round((s.scale || 1) * 100) + '">' +
                '<span class="qaq-theme-slider-val" id="qaq-sprite-scale-val">' + Math.round((s.scale || 1) * 100) + '%</span>' +
            '</div>' +
            '<div class="qaq-plan-form-label">相关库存</div>' +
            '<div style="font-size:12px;color:#666;line-height:1.8;">' +
                (kind === 'animal' ? ('粮食：' + (inv['item-food-basic'] || 0) + '<br>' + qaqGetBedDurabilityText()) : kind === 'plant' ? ('肥料：' + (inv['item-fertilizer'] || 0)) : '暂无相关库存') +
            '</div>' +
            '<div class="qaq-plan-form-label">日志</div>' +
            '<div style="max-height:140px;overflow-y:auto;background:rgba(0,0,0,0.03);border-radius:10px;padding:10px;">' +
                (logsHtml || '<div style="font-size:11px;color:#aaa;">暂无日志</div>') +
            '</div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>' +
        '<button class="qaq-modal-btn" id="qaq-sprite-toggle-scene-btn" style="background:#f0f0f0;color:#666;">' + (s.inScene !== false ? '移出图景' : '加入图景') + '</button>' +
        (kind === 'animal' ? '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-sprite-action-btn">喂食/睡觉</button>' : '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-sprite-action-btn">浇水/施肥</button>');

    qaqOpenModal();
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    qaqRenderVisualToDOM('qaq-sprite-detail-preview', itemId, kind, 1.2, 'static', true);

    // 🌟 改名绑定事件
    document.getElementById('qaq-sprite-name-row').onclick = function () {
        var newName = prompt('给它起个新名字叭：', displayName);
        if (newName !== null && newName.trim() !== '') {
            s.customName = newName.trim();
            qaqSaveSpriteState(itemId, s);
            qaqCloseModal();
            if (typeof window.qaqRefreshXiaoyuanView === 'function') window.qaqRefreshXiaoyuanView();
            if (typeof window.qaqRenderGardenPage === 'function') window.qaqRenderGardenPage();
            if (typeof window.qaqRenderZooPage === 'function') window.qaqRenderZooPage();
            qaqToast('起名成功：' + s.customName);
        }
    };

    document.getElementById('qaq-sprite-scale-range').addEventListener('input', function () {
        var scale = (parseInt(this.value, 10) || 100) / 100;
        document.getElementById('qaq-sprite-scale-val').textContent = this.value + '%';
        s.scale = scale;
        qaqSaveSpriteState(itemId, s);
        if (typeof window.qaqRefreshXiaoyuanView === 'function') window.qaqRefreshXiaoyuanView();
    });

    document.getElementById('qaq-sprite-toggle-scene-btn').onclick = function () {
        s.inScene = !(s.inScene !== false);
        qaqSaveSpriteState(itemId, s);
        qaqCloseModal();
        if (typeof qaqRefreshXiaoyuanView === 'function') qaqRefreshXiaoyuanView();
        qaqToast(s.inScene ? '已加入图景' : '已移出图景');
    };

    document.getElementById('qaq-sprite-action-btn').onclick = function () {
        if (kind === 'animal') qaqOpenAnimalActionModal(itemId); else qaqOpenPlantActionModal(itemId);
    };
}

    function qaqOpenAnimalActionModal(itemId) {
        modalTitle.textContent = '动物互动';
        modalBody.innerHTML =
            '<div class="qaq-custom-select-list">' +
                '<div class="qaq-custom-select-option" data-act="feed"><span>喂食（消耗 1 粮食）</span></div>' +
                '<div class="qaq-custom-select-option" data-act="sleep"><span>睡觉（消耗床铺耐久）</span></div>' +
            '</div>';

        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

        modalBody.querySelectorAll('[data-act]').forEach(function (el) {
            el.onclick = function () {
                var act = this.dataset.act;
                var s = qaqGetSpriteState(itemId);

                if (act === 'feed') {
                    if (!qaqConsumeInventory('item-food-basic', 1)) {
                        return qaqToast('粮食不足');
                    }
                    s.energy = Math.min(100, (s.energy || 0) + 18);
                    s.mood = Math.min(100, (s.mood || 0) + 10);
                    s.expEnergy = (s.expEnergy || 0) + 18;
                    qaqSaveSpriteState(itemId, s);
                    qaqPushSpriteLog(itemId, '喂食：心情 +10，精力 +18');
                }

                if (act === 'sleep') {
                    if (!qaqConsumeInventory('item-bed', 1)) {
                        return qaqToast('没有可用床铺');
                    }
                    s.energy = Math.min(100, (s.energy || 0) + 28);
                    s.mood = Math.min(100, (s.mood || 0) + 6);
                    s.expEnergy = (s.expEnergy || 0) + 28;
                    qaqSaveSpriteState(itemId, s);
                    qaqPushSpriteLog(itemId, '睡觉：心情 +6，精力 +28，床铺耐久 -1');
                }

                qaqMaybeLevelUp(itemId);
                qaqCloseModal();
                if (typeof qaqRefreshXiaoyuanView === 'function') {
                    qaqRefreshXiaoyuanView();
                }
                qaqToast('操作完成');
            };
        });
    }

    function qaqOpenPlantActionModal(itemId) {
    modalTitle.textContent = '植物照料';
    modalBody.innerHTML =
        '<div class="qaq-custom-select-list">' +
            '<div class="qaq-custom-select-option" data-act="water"><span>浇水</span></div>' +
            '<div class="qaq-custom-select-option" data-act="fertilize"><span>施肥（消耗 1 肥料）</span></div>' +
        '</div>';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    modalBody.querySelectorAll('[data-act]').forEach(function (el) {
        el.onclick = function () {
            var act = this.dataset.act;
            var s = qaqGetSpriteState(itemId);

            if (act === 'water') {
                s.growth = Math.min(100, (s.growth || 0) + 8);
                s.energy = Math.min(100, (s.energy || 0) + 6);
                s.expEnergy = (s.expEnergy || 0) + 6;
                qaqSaveSpriteState(itemId, s);
                qaqPushSpriteLog(itemId, '浇水：成长 +8%，精力 +6');
            }

            if (act === 'fertilize') {
                if (!qaqConsumeInventory('item-fertilizer', 1)) {
                    return qaqToast('肥料不足');
                }
                s.growth = Math.min(100, (s.growth || 0) + 15);
                s.energy = Math.min(100, (s.energy || 0) + 20);
                s.expEnergy = (s.expEnergy || 0) + 20;
                qaqSaveSpriteState(itemId, s);
                qaqPushSpriteLog(itemId, '施肥：成长 +15%，精力 +20');
            }

            qaqMaybeLevelUp(itemId);
            qaqCloseModal();
            if (typeof qaqRefreshXiaoyuanView === 'function') {
                qaqRefreshXiaoyuanView();
            }
            qaqToast('操作完成');
        };
    });
}

    /* ===== 暴露 ===== */
    window.qaqGetRenderModeLabel = qaqGetRenderModeLabel;
    window.qaqRefreshXiaoyuanSettingTexts = qaqRefreshXiaoyuanSettingTexts;
    window.qaqOpenXiaoyuanSelectModal = qaqOpenXiaoyuanSelectModal;
    window.qaqOpenXiaoyuanRenderModeQuickSwitch = qaqOpenXiaoyuanRenderModeQuickSwitch;
    window.qaqOpenSpriteDetailModal = qaqOpenSpriteDetailModal;
    window.qaqOpenAnimalActionModal = qaqOpenAnimalActionModal;
    window.qaqOpenPlantActionModal = qaqOpenPlantActionModal;
})();