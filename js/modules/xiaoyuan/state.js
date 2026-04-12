/**
 * js/modules/xiaoyuan/state.js
 * 小院模块 - 状态/设置/精灵存档
 */
(function () {
    'use strict';

    /* ===== 小院显示设置 ===== */
    function qaqGetXiaoyuanDisplaySettings() {
        return qaqCacheGet('qaq-xiaoyuan-display-settings', {
            plantMode: 'lottie',
            animalMode: 'lottie',
            itemMode: 'static'
        });
    }

    function qaqSaveXiaoyuanDisplaySettings(data) {
        qaqCacheSet('qaq-xiaoyuan-display-settings', {
            plantMode: data && data.plantMode ? data.plantMode : 'lottie',
            animalMode: data && data.animalMode ? data.animalMode : 'lottie',
            itemMode: data && data.itemMode ? data.itemMode : 'static'
        });
    }

    function qaqGetXiaoyuanModeByType(type) {
        var s = qaqGetXiaoyuanDisplaySettings();
        if (type === 'plant') return s.plantMode || 'lottie';
        if (type === 'animal') return s.animalMode || 'lottie';
        return s.itemMode || 'static';
    }

    /* ===== 小院场景设置 ===== */
    function qaqGetYardSkinCatalog() {
        return [
            { id: 'default', name: '默认渐变', image: '' },
            { id: 'yard1', name: '小院皮肤 1', image: 'assets/images/yard1.jpg' }
        ];
    }

    function qaqGetXiaoyuanSceneSettings() {
        return qaqCacheGet('qaq-xiaoyuan-scene-settings', {
            yardSkin: 'default',
            yardScale: 1,
            followSceneScale: true,
            globalPlantScale: 1,
            globalAnimalScale: 1
        });
    }

    function qaqSaveXiaoyuanSceneSettings(data) {
        var old = qaqGetXiaoyuanSceneSettings();
        qaqCacheSet('qaq-xiaoyuan-scene-settings', {
            yardSkin: data && data.yardSkin != null ? data.yardSkin : (old.yardSkin || 'default'),
            yardScale: data && data.yardScale != null ? data.yardScale : (old.yardScale || 1),
            followSceneScale: data && data.followSceneScale != null ? !!data.followSceneScale : (old.followSceneScale !== false),
            globalPlantScale: data && data.globalPlantScale != null ? data.globalPlantScale : (old.globalPlantScale || 1),
            globalAnimalScale: data && data.globalAnimalScale != null ? data.globalAnimalScale : (old.globalAnimalScale || 1)
        });
    }

    function qaqGetCurrentYardSkin() {
        var settings = qaqGetXiaoyuanSceneSettings();
        var list = qaqGetYardSkinCatalog();
        return list.find(function (x) { return x.id === settings.yardSkin; }) || list[0];
    }

    /* ===== 精灵状态存储 ===== */
    function qaqCreateDefaultSpriteState(itemId) {
        return {
            id: itemId,
            level: 1,
            expEnergy: 0,
            energy: 50,
            mood: 70,
            growth: 0,
            lastWater: 0,
            lastFeed: 0,
            lastSleep: 0,
            lastFertilize: 0,
            inScene: true,
            scale: 1,
            posX: null,
            posY: null,
            logs: []
        };
    }

    function qaqGetSpriteState(itemId) {
        var states = qaqCacheGet('qaq-sprite-states', {});
        var old = states[itemId] || {};
        var base = qaqCreateDefaultSpriteState(itemId);
        return Object.assign(base, old);
    }

    function qaqSaveSpriteState(itemId, state) {
        var states = qaqCacheGet('qaq-sprite-states', {});
        states[itemId] = Object.assign(qaqCreateDefaultSpriteState(itemId), state || {});
        qaqCacheSet('qaq-sprite-states', states);
    }

    function qaqPushSpriteLog(itemId, text) {
        var s = qaqGetSpriteState(itemId);
        if (!Array.isArray(s.logs)) s.logs = [];
        s.logs.unshift({
            text: text,
            time: Date.now()
        });
        if (s.logs.length > 30) s.logs = s.logs.slice(0, 30);
        qaqSaveSpriteState(itemId, s);
    }

    function qaqMaybeLevelUp(itemId) {
        var s = qaqGetSpriteState(itemId);
        var need = s.level * 40;
        var leveled = false;

        while ((s.expEnergy || 0) >= need) {
            s.expEnergy -= need;
            s.level += 1;
            leveled = true;
            qaqPushSpriteLog(itemId, '升级到 Lv.' + s.level);
            need = s.level * 40;
        }

        qaqSaveSpriteState(itemId, s);
        return leveled;
    }

    /* ===== 暴露 ===== */
    window.qaqGetXiaoyuanDisplaySettings = qaqGetXiaoyuanDisplaySettings;
    window.qaqSaveXiaoyuanDisplaySettings = qaqSaveXiaoyuanDisplaySettings;
    window.qaqGetXiaoyuanModeByType = qaqGetXiaoyuanModeByType;

    window.qaqGetYardSkinCatalog = qaqGetYardSkinCatalog;
    window.qaqGetXiaoyuanSceneSettings = qaqGetXiaoyuanSceneSettings;
    window.qaqSaveXiaoyuanSceneSettings = qaqSaveXiaoyuanSceneSettings;
    window.qaqGetCurrentYardSkin = qaqGetCurrentYardSkin;

    window.qaqCreateDefaultSpriteState = qaqCreateDefaultSpriteState;
    window.qaqGetSpriteState = qaqGetSpriteState;
    window.qaqSaveSpriteState = qaqSaveSpriteState;
    window.qaqPushSpriteLog = qaqPushSpriteLog;
    window.qaqMaybeLevelUp = qaqMaybeLevelUp;
})();