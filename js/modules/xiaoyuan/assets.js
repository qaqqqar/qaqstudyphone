/**
 * js/modules/xiaoyuan/assets.js
 * 小院模块 - 视觉资源（SVG / Lottie 映射 / SVG 缓存）
 */
(function () {
    'use strict';

    /* ===== Lottie 动画映射 ===== */
    window.qaqLotties = {
        'animal-dog':    './assets/lottie/dog1.json',
        'animal-rabbit': './assets/lottie/rabbit1.json',
        'animal-cat':    './assets/lottie/cat1.json',
        'seed-rose':     './assets/lottie/rose1.json'
    };

    /* ===== 植物 SVG ===== */
    var qaqPlantSVGs = {
        'seed-sunflower': function(scale) {
            return '<svg width="' + (48 * scale) + '" height="' + (64 * scale) + '" viewBox="0 0 48 64">' +
                '<line x1="24" y1="30" x2="24" y2="60" stroke="#5a8a3e" stroke-width="3" stroke-linecap="round"/>' +
                '<ellipse cx="18" cy="42" rx="8" ry="4" fill="#6aa84f" opacity="0.6" transform="rotate(-20,18,42)"/>' +
                '<ellipse cx="30" cy="38" rx="7" ry="3.5" fill="#6aa84f" opacity="0.5" transform="rotate(15,30,38)"/>' +
                '<circle cx="24" cy="20" r="10" fill="#e8c34f"/>' +
                '<circle cx="24" cy="20" r="5" fill="#a0722a"/>' +
                '<ellipse cx="24" cy="8" rx="4" ry="6" fill="#f0d060"/>' +
                '<ellipse cx="24" cy="32" rx="4" ry="6" fill="#f0d060"/>' +
                '<ellipse cx="12" cy="20" rx="6" ry="4" fill="#f0d060"/>' +
                '<ellipse cx="36" cy="20" rx="6" ry="4" fill="#f0d060"/>' +
                '<ellipse cx="15" cy="11" rx="5" ry="4" fill="#f0d060" transform="rotate(-45,15,11)"/>' +
                '<ellipse cx="33" cy="11" rx="5" ry="4" fill="#f0d060" transform="rotate(45,33,11)"/>' +
                '<ellipse cx="15" cy="29" rx="5" ry="4" fill="#f0d060" transform="rotate(45,15,29)"/>' +
                '<ellipse cx="33" cy="29" rx="5" ry="4" fill="#f0d060" transform="rotate(-45,33,29)"/>' +
                '</svg>';
        },
        'seed-rose': function(scale) {
            return '<svg width="' + (40 * scale) + '" height="' + (60 * scale) + '" viewBox="0 0 40 60">' +
                '<line x1="20" y1="26" x2="20" y2="56" stroke="#4a7a32" stroke-width="2.5" stroke-linecap="round"/>' +
                '<ellipse cx="14" cy="38" rx="6" ry="3" fill="#5a9840" opacity="0.7" transform="rotate(-25,14,38)"/>' +
                '<ellipse cx="26" cy="44" rx="6" ry="3" fill="#5a9840" opacity="0.65" transform="rotate(25,26,44)"/>' +
                '<path d="M20 8 C15 10 12 14 12 19 C12 24 16 28 20 28 C24 28 28 24 28 19 C28 14 25 10 20 8 Z" fill="#e05565"/>' +
                '<path d="M20 12 C17.5 13.5 16 16.5 16 19.5 C16 22.5 18 25 20 26" fill="#c84050" opacity="0.65"/>' +
                '<path d="M20 12 C22.5 13.5 24 16.5 24 19.5 C24 22.5 22 25 20 26" fill="#ea6a78" opacity="0.55"/>' +
                '<circle cx="20" cy="18" r="2.8" fill="#d04858" opacity="0.55"/>' +
                '</svg>';
        },
        'seed-cactus': function(scale) {
            return '<svg width="' + (36 * scale) + '" height="' + (56 * scale) + '" viewBox="0 0 36 56">' +
                '<rect x="13" y="10" width="10" height="40" rx="5" fill="#5a9848"/>' +
                '<rect x="13" y="10" width="10" height="40" rx="5" fill="none" stroke="#4a8838" stroke-width="1"/>' +
                '<path d="M13 26 L8 22 L8 18 Q8 14 12 14" fill="none" stroke="#5a9848" stroke-width="4" stroke-linecap="round"/>' +
                '<path d="M23 20 L28 16 L28 12 Q28 8 24 8" fill="none" stroke="#5a9848" stroke-width="4" stroke-linecap="round"/>' +
                '<circle cx="15" cy="15" r="1" fill="#f0d060"/>' +
                '<circle cx="21" cy="30" r="1" fill="#f0d060"/>' +
                '<line x1="13" y1="50" x2="23" y2="50" stroke="#8a7260" stroke-width="2" stroke-linecap="round"/>' +
                '</svg>';
        }
    };

    /* ===== 动物 SVG ===== */
    var qaqAnimalSVGs = {
        'animal-cat': function(scale) {
            return '<svg width="' + (52 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 52 44">' +
                '<ellipse cx="26" cy="30" rx="14" ry="10" fill="#e8a050"/>' +
                '<circle cx="26" cy="18" r="10" fill="#e8a050"/>' +
                '<polygon points="18,12 14,2 22,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
                '<polygon points="34,12 38,2 30,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
                '<polygon points="19,11 16,4 22,8" fill="#f0b8a0" opacity="0.5"/>' +
                '<polygon points="33,11 36,4 30,8" fill="#f0b8a0" opacity="0.5"/>' +
                '<ellipse cx="22" cy="17" rx="2.5" ry="3" fill="#333"/>' +
                '<ellipse cx="30" cy="17" rx="2.5" ry="3" fill="#333"/>' +
                '<circle cx="21" cy="16" r="1" fill="#fff"/>' +
                '<circle cx="29" cy="16" r="1" fill="#fff"/>' +
                '<ellipse cx="26" cy="21" rx="1.5" ry="1" fill="#d07060"/>' +
                '<path d="M24 22 Q26 24 28 22" fill="none" stroke="#d07060" stroke-width="0.8"/>' +
                '<line x1="14" y1="19" x2="21" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
                '<line x1="14" y1="22" x2="21" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
                '<line x1="38" y1="19" x2="31" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
                '<line x1="38" y1="22" x2="31" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
                '<path d="M40 28 Q48 20 44 14" fill="none" stroke="#e8a050" stroke-width="3" stroke-linecap="round"/>' +
                '<ellipse cx="18" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
                '<ellipse cx="34" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
                '</svg>';
        },
        'animal-dog': function(scale) {
            return '<svg width="' + (56 * scale) + '" height="' + (48 * scale) + '" viewBox="0 0 56 48">' +
                '<ellipse cx="28" cy="33" rx="15" ry="10" fill="#d8a36d"/>' +
                '<circle cx="28" cy="18" r="11" fill="#d8a36d"/>' +
                '<ellipse cx="18" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(8,18,17)"/>' +
                '<ellipse cx="38" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(-8,38,17)"/>' +
                '<ellipse cx="28" cy="22" rx="7" ry="5.5" fill="#f3dfc9"/>' +
                '<circle cx="24" cy="17" r="2.3" fill="#2f2f2f"/>' +
                '<circle cx="32" cy="17" r="2.3" fill="#2f2f2f"/>' +
                '<circle cx="23.3" cy="16.2" r="0.9" fill="#fff"/>' +
                '<circle cx="31.3" cy="16.2" r="0.9" fill="#fff"/>' +
                '<ellipse cx="28" cy="21.5" rx="2.3" ry="1.7" fill="#3a2a22"/>' +
                '<path d="M26 23.8 Q28 25.5 30 23.8" fill="none" stroke="#8a5a46" stroke-width="0.9" stroke-linecap="round"/>' +
                '<circle cx="20" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +
                '<circle cx="36" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +
                '<ellipse cx="20" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +
                '<ellipse cx="36" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +
                '<path d="M42 31 Q50 25 48 18" fill="none" stroke="#d8a36d" stroke-width="3.2" stroke-linecap="round"/>' +
                '</svg>';
        },
        'animal-rabbit': function(scale) {
            return '<svg width="' + (44 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 44 52">' +
                '<ellipse cx="16" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
                '<ellipse cx="28" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
                '<ellipse cx="16" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
                '<ellipse cx="28" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
                '<circle cx="22" cy="26" r="11" fill="#e0a8a0"/>' +
                '<ellipse cx="22" cy="40" rx="10" ry="8" fill="#e0a8a0"/>' +
                '<circle cx="18" cy="24" r="2.5" fill="#333"/>' +
                '<circle cx="26" cy="24" r="2.5" fill="#333"/>' +
                '<circle cx="17.5" cy="23.5" r="1" fill="#fff"/>' +
                '<circle cx="25.5" cy="23.5" r="1" fill="#fff"/>' +
                '<ellipse cx="22" cy="28" rx="1.5" ry="1" fill="#d08080"/>' +
                '<circle cx="14" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
                '<circle cx="30" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
                '</svg>';
        }
    };

    /* ===== 道具 SVG ===== */
    var qaqItemSVGs = {
        'item-fertilizer': function(scale) {
            return '<svg width="' + (40 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 40 52">' +
                '<rect x="8" y="20" width="24" height="28" rx="4" fill="#7bab6e" opacity="0.85"/>' +
                '<rect x="8" y="20" width="24" height="28" rx="4" fill="none" stroke="#5a8a4e" stroke-width="1.2"/>' +
                '<path d="M10 20 Q20 14 30 20" fill="#6a9a5e" stroke="#5a8a4e" stroke-width="0.8"/>' +
                '<rect x="13" y="28" width="14" height="10" rx="2" fill="#fff" opacity="0.7"/>' +
                '<text x="20" y="35" text-anchor="middle" fill="#5a8a4e" font-size="6" font-weight="700">N P K</text>' +
                '<path d="M20 8 C16 8 12 12 12 16 C12 20 16 22 20 22 C20 22 20 8 20 8Z" fill="#7bab6e" opacity="0.6"/>' +
                '<path d="M20 8 C24 8 28 12 28 16 C28 20 24 22 20 22 C20 22 20 8 20 8Z" fill="#6a9a5e" opacity="0.5"/>' +
                '<line x1="20" y1="8" x2="20" y2="22" stroke="#5a8a4e" stroke-width="1" stroke-linecap="round"/>' +
                '<circle cx="14" cy="44" r="1.5" fill="#a0c890" opacity="0.6"/>' +
                '<circle cx="22" cy="46" r="1.2" fill="#90b880" opacity="0.5"/>' +
                '<circle cx="28" cy="43" r="1.8" fill="#a0c890" opacity="0.4"/>' +
                '</svg>';
        },
        'item-food-basic': function(scale) {
            return '<svg width="' + (44 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 44 44">' +
                '<path d="M6 22 Q6 36 22 38Q38 36 38 22 Z" fill="#e8d0b0" stroke="#d0b890" stroke-width="1"/>' +
                '<ellipse cx="22" cy="22" rx="16" ry="5" fill="#f0e0c8" stroke="#d0b890" stroke-width="0.8"/>' +
                '<ellipse cx="22" cy="20" rx="12" ry="4" fill="#d4a060"/>' +
                '<ellipse cx="18" cy="18" rx="3" ry="2.5" fill="#c89050" opacity="0.7"/>' +
                '<ellipse cx="26" cy="19" rx="3.5" ry="2" fill="#d8a868" opacity="0.6"/>' +
                '<ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#c08848" opacity="0.5"/>' +
                '<path d="M16 12 Q15 8 16 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
                '<path d="M22 10 Q21 6 22 4" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
                '<path d="M28 12 Q27 8 28 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
                '</svg>';
        },
        'item-bed': function(scale) {
            return '<svg width="' + (48 * scale) + '" height="' + (40 * scale) + '" viewBox="0 0 48 40">' +
                '<rect x="4" y="24" width="40" height="12" rx="6" fill="#5b9bd5" opacity="0.8"/>' +
                '<rect x="4" y="24" width="40" height="12" rx="6" fill="none" stroke="#4a88c0" stroke-width="1"/>' +
                '<ellipse cx="24" cy="24" rx="18" ry="5" fill="#7ab8e8" opacity="0.6"/>' +
                '<path d="M8 24 Q8 14 16 12Q24 10 32 12Q40 14 40 24" fill="#6aa8d8" opacity="0.5" stroke="#4a88c0" stroke-width="0.8"/>' +
                '<ellipse cx="16" cy="20" rx="6" ry="3.5" fill="#a0d0f0" stroke="#80b8e0" stroke-width="0.6"/>' +
                '<circle cx="30" cy="28" r="1.5" fill="#4a88c0" opacity="0.2"/>' +
                '<circle cx="28" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
                '<circle cx="32" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
                '<circle cx="29" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
                '<circle cx="31" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
                '<text x="36" y="10" fill="#5b9bd5" font-size="8" font-weight="700" opacity="0.4">z</text>' +
                '<text x="39" y="6" fill="#5b9bd5" font-size="6" font-weight="700" opacity="0.3">z</text>' +
                '</svg>';
        }
    };

    /* ===== SVG 缓存 ===== */
    var _qaqSvgCache = {};

    function qaqCachedPlantSVG(id, scale) {
        var key = id + '_' + scale;
        if (_qaqSvgCache[key]) return _qaqSvgCache[key];
        var fn = qaqPlantSVGs[id];
        if (!fn) return '';
        var svg = fn(scale);
        _qaqSvgCache[key] = svg;
        return svg;
    }

    function qaqCachedAnimalSVG(id, scale) {
        var key = id + '_' + scale;
        if (_qaqSvgCache[key]) return _qaqSvgCache[key];
        var fn = qaqAnimalSVGs[id];
        if (!fn) return '';
        var svg = fn(scale);
        _qaqSvgCache[key] = svg;
        return svg;
    }

    /* ===== 暴露到全局 ===== */
    window.qaqPlantSVGs = qaqPlantSVGs;
    window.qaqAnimalSVGs = qaqAnimalSVGs;
    window.qaqItemSVGs = qaqItemSVGs;
    window.qaqCachedPlantSVG = qaqCachedPlantSVG;
    window.qaqCachedAnimalSVG = qaqCachedAnimalSVG;

})();