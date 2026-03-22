(function () {
    'use strict';

    /* ===== 提取模型返回中的 JSON ===== */
    window.qaqExtractJsonBlock = function (text) {
        text = String(text || '').trim();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch (e) {}

        var mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (mdMatch && mdMatch[1]) {
            try {
                return JSON.parse(mdMatch[1].trim());
            } catch (e) {}
        }

        var arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch (e) {}
        }

        var objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
            try {
                return JSON.parse(objMatch[0]);
            } catch (e) {}
        }

        return null;
    };

    /* ===== HTML 转义 ===== */
    window.qaqEscapeHtml = window.qaqEscapeHtml || function (str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

})();