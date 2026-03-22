(function () {
    'use strict';

    // ==========================================
    // ===== 补充模块被拆分后缺失的核心工具函数 =====
    // ==========================================

    // 1. 日期与ID工具
    if (!window.qaqDateKey) {
        window.qaqDateKey = function (d) {
            var m = d.getMonth() + 1;
            var dt = d.getDate();
            return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dt < 10 ? '0' : '') + dt;
        };
    }
    if (!window.qaqFormatDate) {
        window.qaqFormatDate = function (str) {
            if (!str) return '';
            var parts = str.split('-');
            return parts.length === 3 ? parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日' : str;
        };
    }
    if (!window.qaqPlanId) {
        window.qaqPlanId = function () { 
            return 'plan_' + Date.now() + Math.random().toString(36).slice(2, 6); 
        };
    }

    // 2. 数据读取工具兜底
    if (!window.qaqGetAllPlans) {
        window.qaqGetAllPlans = function() { 
            try { return JSON.parse(localStorage.getItem('qaq-plans') || '{}'); } catch(e) { return {}; }
        };
        window.qaqSavePlans = function(d) { localStorage.setItem('qaq-plans', JSON.stringify(d)); };
        window.qaqGetCategories = function() { 
            try { var c = JSON.parse(localStorage.getItem('qaq-plan-categories')); if (c) return c; } catch(e) {}
            return [{ name: '学习', color: '#e8c34f' }, { name: '工作', color: '#5b9bd5' }];
        };
        window.qaqSaveCategories = function(c) { localStorage.setItem('qaq-plan-categories', JSON.stringify(c)); };
        window.qaqGetPlanTheme = function() { 
            try { return JSON.parse(localStorage.getItem('qaq-plan-theme') || '{}'); } catch(e) { return {}; }
        };
        window.qaqSavePlanTheme = function(t) { localStorage.setItem('qaq-plan-theme', JSON.stringify(t)); };
    }

    // 3. 颜色转换计算工具 (解决白频框)
    if (!window.qaqHexToHsv) {
        window.qaqHexToHsv = function (hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return { h: 0, s: 0, v: 1 };
            var r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
            var max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, v = max, d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) h = 0;
            else {
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: h * 360, s: s, v: v };
        };
    }
    if (!window.qaqHsvToHex) {
        window.qaqHsvToHex = function (h, s, v) {
            var i = Math.floor((h / 360) * 6), f = (h / 360) * 6 - i;
            var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s), r, g, b;
            switch (i % 6) {
                case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
            }
            var toHex = function(x) { var hex = Math.round(x * 255).toString(16); return hex.length === 1 ? '0' + hex : hex; };
            return '#' + toHex(r) + toHex(g) + toHex(b);
        };
    }
    /* ===== Plan Module State ===== */
    window.qaqPlanColors = ['#e05565', '#e88d4f', '#e8c34f', '#7bab6e', '#5b9bd5', '#8b6cc1', '#c47068', '#999999'];
    window.qaqPlanSelectedDate = window.qaqDateKey(new Date());

    window.qaqPlanThemePage = document.getElementById('qaq-plan-theme-page');

    /* ===== Plan Data ===== */
    window.qaqGetDayPlans = function (dateKey) {
        var all = window.qaqGetAllPlans();
        return all[dateKey] || [];
    };

    window.qaqSaveDayPlans = function (dateKey, items) {
        var all = window.qaqGetAllPlans();
        if (!items.length) delete all[dateKey];
        else all[dateKey] = items;
        window.qaqSavePlans(all);
    };

    window.qaqCategoryColor = function (catName) {
        var cats = window.qaqGetCategories();
        var found = cats.find(function (c) {
            return c.name === catName;
        });
        return found ? found.color : '#999';
    };

    /* ===== Widget Plans ===== */
    window.qaqRenderWidgetPlans = function () {
        var todayKey = window.qaqDateKey(new Date());
        var items = window.qaqGetDayPlans(todayKey);
        var listEl = document.getElementById('qaq-plan-list');
        var fillEl = document.getElementById('qaq-plan-fill');
        var percentEl = document.getElementById('qaq-plan-percent');

        if (!listEl) return;

        listEl.innerHTML = '';

        if (!items.length) {
            listEl.innerHTML = '<div class="qaq-plan-item" style="color:#bbb;font-size:10px;">暂无计划，点击添加</div>';
            if (fillEl) fillEl.style.width = '0%';
            if (percentEl) percentEl.textContent = '0/0';
            return;
        }

        var catMap = {};
        var catOrder = [];
        items.forEach(function (item) {
            var cat = item.category || '未分类';
            if (!catMap[cat]) {
                catMap[cat] = [];
                catOrder.push(cat);
            }
            catMap[cat].push(item);
        });

        var doneCount = 0;

        catOrder.forEach(function (cat) {
            var group = document.createElement('div');
            group.className = 'qaq-mini-cat-group';

            var catColor = window.qaqCategoryColor(cat);
            var catItems = catMap[cat];
            var catDone = catItems.filter(function (x) { return x.done; }).length;

            var header = document.createElement('div');
            header.className = 'qaq-mini-cat-header';
            header.innerHTML =
                '<svg class="qaq-mini-cat-arrow" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5">' +
                    '<polyline points="6,9 12,15 18,9" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>' +
                '<span class="qaq-mini-cat-name" style="color:' + catColor + ';">' + cat + '</span>' +
                '<span class="qaq-mini-cat-count">' + catDone + '/' + catItems.length + '</span>';

            var body = document.createElement('div');
            body.className = 'qaq-mini-cat-body';

            catItems.forEach(function (item) {
                var div = document.createElement('div');
                div.className = 'qaq-plan-item' + (item.done ? ' qaq-item-done' : '');
                div.innerHTML =
                    '<div class="qaq-plan-dot' + (item.done ? ' qaq-dot-done' : '') + '" style="background:' +
                    (item.done ? '#b5d6a7' : (item.color || '#deb3be')) + ';"></div>' +
                    '<span>' + item.name + '</span>';

                div.addEventListener('click', function (e) {
                    e.stopPropagation();
                    item.done = !item.done;
                    window.qaqSaveDayPlans(todayKey, items);
                    window.qaqRenderWidgetPlans();
                });

                body.appendChild(div);
                if (item.done) doneCount++;
            });

            header.addEventListener('click', function (e) {
                e.stopPropagation();
                this.classList.toggle('qaq-collapsed');
                body.classList.toggle('qaq-cat-hidden');
            });

            group.appendChild(header);
            group.appendChild(body);
            listEl.appendChild(group);
        });

        var total = items.length;
        var pct = Math.round(doneCount / total * 100);

        if (fillEl) fillEl.style.width = pct + '%';
        if (percentEl) percentEl.textContent = doneCount + '/' + total;
    };

    /* ===== Date Selector ===== */
    window.qaqRenderDateSelector = function () {
        var container = document.getElementById('qaq-plan-date-selector');
        if (!container) return;

        container.innerHTML = '';

        var today = new Date();
        var dayNames = ['日', '一', '二', '三', '四', '五', '六'];

        for (var i = -3; i <= 7; i++) {
            var d = new Date(today);
            d.setDate(today.getDate() + i);

            var key = window.qaqDateKey(d);
            var chip = document.createElement('div');
            chip.className = 'qaq-plan-date-chip' + (key === window.qaqPlanSelectedDate ? ' qaq-date-active' : '');
            chip.dataset.dateKey = key;

            var label = i === 0
                ? '今天'
                : (i === -1 ? '昨天' : (i === 1 ? '明天' : '周' + dayNames[d.getDay()]));

            chip.innerHTML =
                '<div class="qaq-plan-date-chip-day">' + label + '</div>' +
                '<div class="qaq-plan-date-chip-num">' + d.getDate() + '</div>';

            chip.addEventListener('click', function () {
                window.qaqPlanSelectedDate = this.dataset.dateKey;
                container.querySelectorAll('.qaq-plan-date-chip').forEach(function (c) {
                    c.classList.remove('qaq-date-active');
                });
                this.classList.add('qaq-date-active');
                window.qaqRenderPlanCards();
            });

            container.appendChild(chip);
        }

        setTimeout(function () {
            var active = container.querySelector('.qaq-date-active');
            if (active) {
                active.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }, 360);
    };

    /* ===== Open / Close Plan Page ===== */
    window.qaqOpenPlanPage = function () {
        window.qaqPlanSelectedDate = window.qaqDateKey(new Date());
        var planPage = document.getElementById('qaq-plan-page');
        window.qaqSwitchTo(planPage);

        requestAnimationFrame(function () {
            window.qaqRenderDateSelector();
            window.qaqRenderPlanCards();
        });
    };

    window.qaqClosePlanPage = function () {
        var planPage = document.getElementById('qaq-plan-page');
        window.qaqClosePage(planPage);
    };

    /* ===== Render Plan Cards ===== */
    window.qaqRenderPlanCards = function () {
        var container = document.getElementById('qaq-plan-card-list');
        if (!container) return;

        var rawItems = window.qaqGetDayPlans(window.qaqPlanSelectedDate);

        if (!rawItems.length) {
            container.innerHTML =
                '<div class="qaq-plan-empty"><div>' +
                window.qaqFormatDate(window.qaqPlanSelectedDate) +
                '暂无计划</div></div>';
            return;
        }

        var items = rawItems.slice().sort(function (a, b) {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

        var catMap = {};
        var catOrder = [];

        items.forEach(function (item) {
            var cat = item.category || '未分类';
            if (!catMap[cat]) {
                catMap[cat] = [];
                catOrder.push(cat);
            }
            catMap[cat].push(item);
        });

        var frag = document.createDocumentFragment();

        catOrder.forEach(function (cat) {
            var catItems = catMap[cat];
            var catColor = window.qaqCategoryColor(cat);
            var catDone = catItems.filter(function (x) { return x.done; }).length;

            var group = document.createElement('div');
            group.className = 'qaq-category-group';

            var header = document.createElement('div');
            header.className = 'qaq-category-header';
            header.innerHTML =
                '<div class="qaq-category-color-dot" style="background:' + catColor + '"></div>' +
                '<span class="qaq-category-name">' + cat + '</span>' +
                '<span class="qaq-category-count">' + catDone + '/' + catItems.length + '</span>';

            var body = document.createElement('div');
            body.className = 'qaq-category-body';

            catItems.forEach(function (item) {
                var card = document.createElement('div');
                card.className = 'qaq-plan-card' + (item.done ? ' qaq-plan-card-done' : '');
                card.dataset.planId = item.id;

                card.innerHTML =
                    '<div class="qaq-plan-card-color" style="background:' + (item.color || '#deb3be') + '"></div>' +
                    '<div class="qaq-plan-card-body">' +
                        '<div class="qaq-plan-card-name">' + item.name + '</div>' +
                        (item.desc ? '<div class="qaq-plan-card-desc">' + item.desc + '</div>' : '') +
                        (item.thought ? '<div class="qaq-plan-card-thought">' + item.thought + '</div>' : '') +
                    '</div>' +
                    '<div class="qaq-plan-card-actions">' +
                        '<button class="qaq-plan-card-check" data-plan-id="' + item.id + '">' + (item.done ? '✓' : '') + '</button>' +
                        '<button class="qaq-plan-card-del" data-plan-id="' + item.id + '">✕</button>' +
                    '</div>';

                body.appendChild(card);
            });

            header.addEventListener('click', function () {
                this.classList.toggle('qaq-collapsed');
                body.classList.toggle('qaq-cat-hidden');
            });

            group.appendChild(header);
            group.appendChild(body);
            frag.appendChild(group);
        });

        container.innerHTML = '';
        container.appendChild(frag);

        container.onclick = function (e) {
            var checkBtn = e.target.closest('.qaq-plan-card-check');
            if (checkBtn) {
                e.stopPropagation();
                var id = checkBtn.dataset.planId;
                var dayItems = window.qaqGetDayPlans(window.qaqPlanSelectedDate);
                var hit = dayItems.find(function (x) { return x.id === id; });
                if (hit) {
                    hit.done = !hit.done;
                    window.qaqSaveDayPlans(window.qaqPlanSelectedDate, dayItems);
                    window.qaqRenderPlanCards();
                    window.qaqRenderWidgetPlans();
                }
                return;
            }

            var delBtn = e.target.closest('.qaq-plan-card-del');
            if (delBtn) {
                e.stopPropagation();
                var id2 = delBtn.dataset.planId;
                window.qaqConfirm('删除计划', '确认删除？', function () {
                    var dayItems2 = window.qaqGetDayPlans(window.qaqPlanSelectedDate);
                    var idx = dayItems2.findIndex(function (x) { return x.id === id2; });
                    if (idx > -1) {
                        dayItems2.splice(idx, 1);
                        window.qaqSaveDayPlans(window.qaqPlanSelectedDate, dayItems2);
                        window.qaqRenderPlanCards();
                        window.qaqRenderWidgetPlans();
                    }
                });
                return;
            }

            var card = e.target.closest('.qaq-plan-card');
            if (card && card.dataset.planId) {
                window.qaqEditPlan(window.qaqPlanSelectedDate, card.dataset.planId);
            }
        };
    };

    /* ===== Time Picker ===== */
    window.qaqTimeMask = document.getElementById('qaq-time-mask');
    window.qaqTimePanel = document.getElementById('qaq-time-panel');
    window.qaqTimeHourCol = document.getElementById('qaq-time-hour');
    window.qaqTimeMinuteCol = document.getElementById('qaq-time-minute');
    window.qaqTimeCallback = null;
    window.qaqTimeCurrentH = 8;
    window.qaqTimeCurrentM = 0;

    window.qaqBuildTimeCol = function (col, count, pad) {
        if (!col) return;
        col.innerHTML = '<div class="qaq-time-col-spacer"></div>';
        for (var i = 0; i < count; i++) {
            var item = document.createElement('div');
            item.className = 'qaq-time-col-item';
            item.dataset.val = i;
            item.textContent = pad && i < 10 ? '0' + i : '' + i;
            col.appendChild(item);
        }
        var spacer2 = document.createElement('div');
        spacer2.className = 'qaq-time-col-spacer';
        col.appendChild(spacer2);
    };

    window.qaqScrollToVal = function (col, val) {
        if (!col) return;
        var items = col.querySelectorAll('.qaq-time-col-item');
        if (!items[val]) return;
        var itemH = 40;
        col.scrollTop = val * itemH;
    };

    window.qaqGetSelectedVal = function (col) {
        if (!col) return 0;
        var scrollTop = col.scrollTop;
        var idx = Math.round(scrollTop / 40);
        var items = col.querySelectorAll('.qaq-time-col-item');
        idx = Math.max(0, Math.min(idx, items.length - 1));
        return parseInt(items[idx].dataset.val, 10);
    };

    window.qaqUpdateTimeHighlight = function (col) {
        if (!col) return;
        var scrollTop = col.scrollTop;
        var idx = Math.round(scrollTop / 40);
        var items = col.querySelectorAll('.qaq-time-col-item');
        items.forEach(function (it, i) {
            it.classList.toggle('qaq-time-selected', i === idx);
        });
    };

    window.qaqOpenTimePicker = function (currentVal, callback) {
        window.qaqTimeCallback = callback;

        if (currentVal && /^\d{2}:\d{2}$/.test(currentVal)) {
            var parts = currentVal.split(':');
            window.qaqTimeCurrentH = parseInt(parts[0], 10);
            window.qaqTimeCurrentM = parseInt(parts[1], 10);
        } else {
            var now = new Date();
            window.qaqTimeCurrentH = now.getHours();
            window.qaqTimeCurrentM = now.getMinutes();
        }

        if (window.qaqTimeMask) window.qaqTimeMask.classList.add('qaq-time-mask-show');
        if (window.qaqTimePanel) window.qaqTimePanel.classList.add('qaq-time-panel-show');

        setTimeout(function () {
            window.qaqScrollToVal(window.qaqTimeHourCol, window.qaqTimeCurrentH);
            window.qaqScrollToVal(window.qaqTimeMinuteCol, window.qaqTimeCurrentM);
            window.qaqUpdateTimeHighlight(window.qaqTimeHourCol);
            window.qaqUpdateTimeHighlight(window.qaqTimeMinuteCol);
        }, 50);
    };

    window.qaqCloseTimePicker = function () {
        if (window.qaqTimeMask) window.qaqTimeMask.classList.remove('qaq-time-mask-show');
        if (window.qaqTimePanel) window.qaqTimePanel.classList.remove('qaq-time-panel-show');
    };

    /* ===== Color Picker ===== */
    window.qaqCreateColorPicker = function (container, initialColor, onChange, onCancel) {
        var hue = 0, sat = 1, val = 1;

        if (initialColor) {
            var hsv = window.qaqHexToHsv(initialColor);
            hue = hsv.h; sat = hsv.s; val = hsv.v;
        }

        var extraSwatches = ['#ff6b6b', '#ff9f43', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#c8d6e5', '#576574'];

        var html =
            '<div class="qaq-color-swatches" id="qaq-cp-swatches">' +
                extraSwatches.map(function (c) {
                    return '<div class="qaq-color-swatch-item" data-swatch="' + c + '" style="background:' + c + ';"></div>';
                }).join('') +
            '</div>' +
            '<div class="qaq-color-sv-wrap" id="qaq-cp-sv">' +
                '<div class="qaq-color-sv-white"></div>' +
                '<div class="qaq-color-sv-black"></div>' +
                '<div class="qaq-color-sv-thumb" id="qaq-cp-sv-thumb"></div>' +
            '</div>' +
            '<div class="qaq-color-hue-wrap" id="qaq-cp-hue">' +
                '<div class="qaq-color-hue-thumb" id="qaq-cp-hue-thumb"></div>' +
            '</div>' +
            '<div class="qaq-color-preview-row">' +
                '<div class="qaq-color-preview-top">' +
                    '<div class="qaq-color-preview-swatch" id="qaq-cp-preview"></div>' +
                    '<input class="qaq-color-hex-input" id="qaq-cp-hex" type="text" maxlength="7" placeholder="#FF0000">' +
                '</div>' +
                '<div class="qaq-color-preview-btns">' +
                    '<button class="qaq-color-cancel-btn" id="qaq-cp-cancel">取消</button>' +
                    '<button class="qaq-color-confirm-btn" id="qaq-cp-ok">选好了</button>' +
                '</div>' +
            '</div>';

        container.innerHTML = html;

        var svWrap = document.getElementById('qaq-cp-sv');
        var svThumb = document.getElementById('qaq-cp-sv-thumb');
        var hueWrap = document.getElementById('qaq-cp-hue');
        var hueThumb = document.getElementById('qaq-cp-hue-thumb');
        var preview = document.getElementById('qaq-cp-preview');
        var hexInput = document.getElementById('qaq-cp-hex');

        function updateUI() {
            var hex = window.qaqHsvToHex(hue, sat, val);
            var pureHue = window.qaqHsvToHex(hue, 1, 1);
            svWrap.style.background = pureHue;
            svThumb.style.left = (sat * 100) + '%';
            svThumb.style.top = ((1 - val) * 100) + '%';
            svThumb.style.background = hex;
            hueThumb.style.left = (hue / 360 * 100) + '%';
            hueThumb.style.background = pureHue;
            preview.style.background = hex;
            hexInput.value = hex.toUpperCase();

            var swatches = container.querySelectorAll('.qaq-color-swatch-item');
            swatches.forEach(function (s) {
                s.classList.toggle('qaq-swatch-active', s.dataset.swatch.toUpperCase() === hex.toUpperCase());
            });
        }

        function hueMove(clientX) {
            var rect = hueWrap.getBoundingClientRect();
            var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            hue = (x / rect.width) * 360;
            updateUI();
        }

        function svMove(clientX, clientY) {
            var rect = svWrap.getBoundingClientRect();
            var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            var y = Math.max(0, Math.min(clientY - rect.top, rect.height));
            sat = x / rect.width;
            val = 1 - (y / rect.height);
            updateUI();
        }

        hueWrap.addEventListener('mousedown', function (e) {
            e.preventDefault();
            hueMove(e.clientX);

            function onMove(ev) { hueMove(ev.clientX); }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        hueWrap.addEventListener('touchstart', function (e) {
            hueMove(e.touches[0].clientX);

            function onMove(ev) {
                ev.preventDefault();
                hueMove(ev.touches[0].clientX);
            }

            function onEnd() {
                hueWrap.removeEventListener('touchmove', onMove);
                hueWrap.removeEventListener('touchend', onEnd);
            }

            hueWrap.addEventListener('touchmove', onMove, { passive: false });
            hueWrap.addEventListener('touchend', onEnd);
        }, { passive: true });

        svWrap.addEventListener('mousedown', function (e) {
            e.preventDefault();
            svMove(e.clientX, e.clientY);

            function onMove(ev) { svMove(ev.clientX, ev.clientY); }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        svWrap.addEventListener('touchstart', function (e) {
            svMove(e.touches[0].clientX, e.touches[0].clientY);

            function onMove(ev) {
                ev.preventDefault();
                svMove(ev.touches[0].clientX, ev.touches[0].clientY);
            }

            function onEnd() {
                svWrap.removeEventListener('touchmove', onMove);
                svWrap.removeEventListener('touchend', onEnd);
            }

            svWrap.addEventListener('touchmove', onMove, { passive: false });
            svWrap.addEventListener('touchend', onEnd);
        }, { passive: true });

        hexInput.addEventListener('input', function () {
            var v = this.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                var hsv = window.qaqHexToHsv(v);
                hue = hsv.h; sat = hsv.s; val = hsv.v;
                updateUI();
            }
        });

        container.querySelector('#qaq-cp-swatches').addEventListener('click', function (e) {
            var item = e.target.closest('.qaq-color-swatch-item');
            if (!item) return;
            var c = item.dataset.swatch;
            var hsv = window.qaqHexToHsv(c);
            hue = hsv.h; sat = hsv.s; val = hsv.v;
            updateUI();
        });

        document.getElementById('qaq-cp-ok').addEventListener('click', function () {
            var hex = window.qaqHsvToHex(hue, sat, val);
            if (typeof onChange === 'function') onChange(hex);
        });

        document.getElementById('qaq-cp-cancel').addEventListener('click', function () {
            if (typeof onCancel === 'function') onCancel();
        });

        updateUI();
    };

    /* ===== Category Management ===== */
    window.qaqOpenCatManage = function () {
        window.qaqModalTitle.textContent = '分类管理';

        function buildColorRow(currentColor, idPrefix) {
            var html = '<div class="qaq-cat-color-row" id="' + idPrefix + '-colors">';
            var matchPreset = false;

            window.qaqPlanColors.forEach(function (c) {
                var sel = currentColor && currentColor.toLowerCase() === c.toLowerCase();
                if (sel) matchPreset = true;
                html += '<div class="qaq-cat-color-dot' + (sel ? ' qaq-cat-color-active' : '') +
                    '" data-c="' + c + '" style="background:' + c + ';"></div>';
            });

            var customStyle = (!matchPreset && currentColor) ? 'background:' + currentColor + ';' : '';
            html += '<div class="qaq-cat-color-custom' + (!matchPreset && currentColor ? ' qaq-cat-color-active' : '') +
                '" id="' + idPrefix + '-custom"' + (customStyle ? ' style="' + customStyle + '"' : '') + '></div>';
            html += '</div>';
            html += '<div class="qaq-cat-color-panel" id="' + idPrefix + '-panel"></div>';

            return html;
        }

        function bindColorRow(idPrefix, initialColor, onColorChange) {
            var selectedColor = initialColor || window.qaqPlanColors[0];
            var row = document.getElementById(idPrefix + '-colors');
            var customBtn = document.getElementById(idPrefix + '-custom');
            var panel = document.getElementById(idPrefix + '-panel');

            row.addEventListener('click', function (e) {
                var dot = e.target.closest('.qaq-cat-color-dot');
                if (dot) {
                    row.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) {
                        d.classList.remove('qaq-cat-color-active');
                    });
                    customBtn.classList.remove('qaq-cat-color-active');
                    dot.classList.add('qaq-cat-color-active');
                    selectedColor = dot.dataset.c;
                    panel.classList.remove('qaq-cat-color-panel-show');
                    onColorChange(selectedColor);
                    return;
                }

                if (e.target.closest('.qaq-cat-color-custom')) {
                    row.querySelectorAll('.qaq-cat-color-dot').forEach(function (d) {
                        d.classList.remove('qaq-cat-color-active');
                    });
                    customBtn.classList.add('qaq-cat-color-active');

                    if (panel.classList.contains('qaq-cat-color-panel-show')) {
                        panel.classList.remove('qaq-cat-color-panel-show');
                    } else {
                        panel.classList.add('qaq-cat-color-panel-show');
                        window.qaqCreateColorPicker(panel, selectedColor, function (hex) {
                            selectedColor = hex;
                            customBtn.style.background = hex;
                            panel.classList.remove('qaq-cat-color-panel-show');
                            onColorChange(selectedColor);
                        }, function () {
                            panel.classList.remove('qaq-cat-color-panel-show');
                            customBtn.classList.remove('qaq-cat-color-active');
                        });
                    }
                }
            });

            return function () {
                return selectedColor;
            };
        }

        function renderList() {
            var cats = window.qaqGetCategories();
            var html = '<div style="max-height:50vh;overflow-y:auto;" id="qaq-cat-manage-scroll">';

            cats.forEach(function (cat, idx) {
                html +=
                    '<div class="qaq-cat-manage-item" data-cat-idx="' + idx + '">' +
                        '<div class="qaq-cat-manage-dot" style="background:' + cat.color + ';" id="qaq-cat-dot-' + idx + '"></div>' +
                        '<div class="qaq-cat-manage-name" id="qaq-cat-name-' + idx + '">' + cat.name + '</div>' +
                        '<button class="qaq-cat-manage-edit" data-cat-idx="' + idx + '" title="编辑">✎</button>' +
                        '<button class="qaq-cat-manage-del" data-cat-idx="' + idx + '">✕</button>' +
                    '</div>' +
                    '<div id="qaq-cat-edit-area-' + idx + '" style="display:none;"></div>';
            });

            html += '<div class="qaq-cat-manage-add" id="qaq-cat-add-btn"><span style="font-size:18px;margin-right:2px;">+</span> 添加新分类</div>';
            html += '<div id="qaq-cat-add-area" style="display:none;"></div>';
            html += '</div>';

            window.qaqModalBody.innerHTML = html;

            window.qaqModalBody.querySelectorAll('.qaq-cat-manage-del').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var idx2 = parseInt(this.dataset.catIdx, 10);
                    var cats2 = window.qaqGetCategories();
                    if (cats2.length <= 1) return window.qaqToast('至少保留一个分类');
                    var removed = cats2.splice(idx2, 1)[0];
                    window.qaqSaveCategories(cats2);
                    renderList();
                    window.qaqToast('已删除「' + removed.name + '」');
                });
            });

            window.qaqModalBody.querySelectorAll('.qaq-cat-manage-edit').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();

                    var idx2 = parseInt(this.dataset.catIdx, 10);
                    var cats2 = window.qaqGetCategories();
                    var oldName = cats2[idx2].name;
                    var oldColor = cats2[idx2].color;

                    var nameEl = document.getElementById('qaq-cat-name-' + idx2);
                    var editArea = document.getElementById('qaq-cat-edit-area-' + idx2);
                    var parentItem = nameEl.parentElement;

                    parentItem.style.display = 'none';
                    editArea.style.display = 'block';

                    editArea.innerHTML =
                        '<div class="qaq-cat-edit-block">' +
                            '<div class="qaq-plan-form-label">分类名称</div>' +
                            '<input class="qaq-plan-form-input" type="text" value="' + oldName.replace(/"/g, '&quot;') + '" id="qaq-cat-rename-input-' + idx2 + '">' +
                            '<div class="qaq-plan-form-label">分类颜色</div>' +
                            buildColorRow(oldColor, 'qaq-cat-edit-color-' + idx2) +
                            '<div class="qaq-inline-btns">' +
                                '<button class="qaq-inline-cancel" id="qaq-cat-rename-cancel-' + idx2 + '">取消</button>' +
                                '<button class="qaq-inline-ok" id="qaq-cat-rename-ok-' + idx2 + '">保存</button>' +
                            '</div>' +
                        '</div>';

                    var inp = document.getElementById('qaq-cat-rename-input-' + idx2);
                    setTimeout(function () { inp.focus(); inp.select(); }, 50);

                    var getColor = bindColorRow('qaq-cat-edit-color-' + idx2, oldColor, function () {});

                    function doSave() {
                        var newName = inp.value.trim();
                        if (!newName) {
                            window.qaqToast('请输入分类名称');
                            return;
                        }

                        var newColor = getColor();
                        var latest = window.qaqGetCategories();

                        if (newName !== oldName && latest.find(function (c) { return c.name === newName; })) {
                            window.qaqToast('分类名已存在');
                            return;
                        }

                        if (newName !== oldName) {
                            var allPlans = window.qaqGetAllPlans();
                            Object.keys(allPlans).forEach(function (dateKey) {
                                allPlans[dateKey].forEach(function (item) {
                                    if (item.category === oldName) item.category = newName;
                                });
                            });
                            window.qaqSavePlans(allPlans);
                        }

                        latest[idx2].name = newName;
                        latest[idx2].color = newColor;
                        window.qaqSaveCategories(latest);
                        renderList();
                        window.qaqToast('已保存');
                    }

                    document.getElementById('qaq-cat-rename-ok-' + idx2).addEventListener('click', doSave);
                    document.getElementById('qaq-cat-rename-cancel-' + idx2).addEventListener('click', function () {
                        renderList();
                    });

                    inp.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            doSave();
                        }
                    });
                });
            });

            document.getElementById('qaq-cat-add-btn').addEventListener('click', function () {
                this.style.display = 'none';
                var area = document.getElementById('qaq-cat-add-area');
                area.style.display = 'block';

                area.innerHTML =
                    '<div class="qaq-cat-edit-block">' +
                        '<div class="qaq-plan-form-label">分类名称</div>' +
                        '<input class="qaq-plan-form-input" type="text" placeholder="输入新分类名称" id="qaq-cat-new-input">' +
                        '<div class="qaq-plan-form-label">分类颜色</div>' +
                        buildColorRow(window.qaqPlanColors[0], 'qaq-cat-new-color') +
                        '<div class="qaq-inline-btns">' +
                            '<button class="qaq-inline-cancel" id="qaq-cat-new-cancel">取消</button>' +
                            '<button class="qaq-inline-ok" id="qaq-cat-new-ok">添加</button>' +
                        '</div>' +
                    '</div>';

                var inp = document.getElementById('qaq-cat-new-input');
                setTimeout(function () { inp.focus(); }, 50);

                var getColor = bindColorRow('qaq-cat-new-color', window.qaqPlanColors[0], function () {});

                function doAdd() {
                    var newName = inp.value.trim();
                    if (!newName) return window.qaqToast('请输入分类名称');

                    var cats2 = window.qaqGetCategories();
                    if (cats2.find(function (c) { return c.name === newName; })) {
                        return window.qaqToast('分类已存在');
                    }

                    cats2.push({ name: newName, color: getColor() });
                    window.qaqSaveCategories(cats2);
                    renderList();
                    window.qaqToast('已添加「' + newName + '」');
                }

                document.getElementById('qaq-cat-new-ok').addEventListener('click', doAdd);
                document.getElementById('qaq-cat-new-cancel').addEventListener('click', function () {
                    renderList();
                });

                inp.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        doAdd();
                    }
                });
            });
        }

        renderList();

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm" style="flex:1;">完成</button>';

        window.qaqOpenModal();

        document.getElementById('qaq-modal-confirm').onclick = function () {
            window.qaqCloseModal();
            window.qaqRenderPlanCards();
            window.qaqRenderWidgetPlans();
        };
    };

    /* ===== Edit Plan ===== */
    window.qaqEditPlan = function (dateKey, planId) {
        var dayItems = window.qaqGetDayPlans(dateKey);
        var item = dayItems.find(function (x) { return x.id === planId; });
        if (!item) return;

        window.qaqModalTitle.textContent = '编辑计划';

        var colorsHtml = '';
        var matchPreset = false;

        window.qaqPlanColors.forEach(function (c) {
            var sel = item.color && item.color.toLowerCase() === c.toLowerCase();
            if (sel) matchPreset = true;
            colorsHtml += '<div class="qaq-plan-color-option' + (sel ? ' qaq-color-selected' : '') +
                '" data-color="' + c + '" style="background:' + c + ';"></div>';
        });

        var customStyle = (!matchPreset && item.color) ? 'background:' + item.color + ';' : '';
        colorsHtml += '<div class="qaq-color-custom-btn' + (!matchPreset && item.color ? ' qaq-color-selected' : '') +
            '" id="qaq-pf-color-custom" title="自定义颜色"' +
            (customStyle ? ' style="' + customStyle + '"' : '') + '></div>';

        var cats = window.qaqGetCategories();
        var currentCat = item.category || '未分类';
        var catsHtml = '';
        var hasCurrent = false;

        cats.forEach(function (cat) {
            var sel = cat.name === currentCat;
            if (sel) hasCurrent = true;
            catsHtml += '<div class="qaq-plan-cat-chip' + (sel ? ' qaq-cat-selected' : '') +
                '" data-cat="' + cat.name + '">' + cat.name + '</div>';
        });

        if (!hasCurrent && currentCat !== '未分类') {
            catsHtml =
                '<div class="qaq-plan-cat-chip qaq-cat-selected" data-cat="' + currentCat + '">' +
                currentCat + '</div>' + catsHtml;
        }

        catsHtml += '<div class="qaq-plan-cat-chip qaq-plan-cat-chip-add" id="qaq-pf-cat-add">+ 新建</div>';

        var timeBtnContent = item.time
            ? '<span class="qaq-time-value">' + item.time + '</span>'
            : '<span class="qaq-time-placeholder">点击选择时间</span>';

        timeBtnContent +=
            '<svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<circle cx="12" cy="12" r="10"/>' +
                '<polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>';

        window.qaqModalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">项目名称 *</div>' +
                '<input class="qaq-plan-form-input" id="qaq-pf-name" type="text" value="' + (item.name || '').replace(/"/g, '&quot;') + '" placeholder="例如：背单词">' +
                '<div class="qaq-plan-form-label">分类</div>' +
                '<div class="qaq-plan-cat-picker" id="qaq-pf-cats">' + catsHtml + '</div>' +
                '<div class="qaq-plan-form-label">项目描述</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-pf-desc" placeholder="可选，简单描述一下">' + (item.desc || '') + '</textarea>' +
                '<div class="qaq-plan-form-label">想法</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-pf-thought" placeholder="记录你的灵感、想法、心得...">' + (item.thought || '') + '</textarea>' +
                '<div class="qaq-plan-form-row">' +
                    '<div style="flex:1;">' +
                        '<div class="qaq-plan-form-label">时间</div>' +
                        '<div class="qaq-time-picker-wrapper"><div class="qaq-time-picker-btn" id="qaq-pf-time-btn">' + timeBtnContent + '</div></div>' +
                    '</div>' +
                    '<div style="flex:1;">' +
                        '<div class="qaq-plan-form-label">大致用时</div>' +
                        '<input class="qaq-plan-form-input" id="qaq-pf-duration" type="text" value="' + (item.duration || '').replace(/"/g, '&quot;') + '" placeholder="如 30分钟" style="margin-top:6px;">' +
                    '</div>' +
                '</div>' +
                '<div class="qaq-plan-form-label">标签颜色</div>' +
                '<div class="qaq-plan-color-picker" id="qaq-pf-colors">' + colorsHtml + '</div>' +
                '<div class="qaq-color-panel" id="qaq-pf-color-panel"></div>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

        window.qaqOpenModal();

        var selectedTime = item.time || '';
        var selectedCategory = currentCat;
        var selectedColor = item.color || window.qaqPlanColors[0];
        var timeBtn = document.getElementById('qaq-pf-time-btn');

        timeBtn.addEventListener('click', function () {
            window.qaqOpenTimePicker(selectedTime, function (val) {
                selectedTime = val;
                if (val) {
                    timeBtn.innerHTML =
                        '<span class="qaq-time-value">' + val + '</span>' +
                        '<svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<circle cx="12" cy="12" r="10"/>' +
                            '<polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/>' +
                        '</svg>';
                } else {
                    timeBtn.innerHTML =
                        '<span class="qaq-time-placeholder">点击选择时间</span>' +
                        '<svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<circle cx="12" cy="12" r="10"/>' +
                            '<polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/>' +
                        '</svg>';
                }
            });
        });

        document.getElementById('qaq-pf-cats').addEventListener('click', function (e) {
            var chip = e.target.closest('.qaq-plan-cat-chip');
            if (!chip) return;
            if (chip.id === 'qaq-pf-cat-add') return;
            this.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) {
                c.classList.remove('qaq-cat-selected');
            });
            chip.classList.add('qaq-cat-selected');
            selectedCategory = chip.dataset.cat;
        });

        var colorPanel = document.getElementById('qaq-pf-color-panel');
        var colorCustomBtn = document.getElementById('qaq-pf-color-custom');

        document.getElementById('qaq-pf-colors').addEventListener('click', function (e) {
            var option = e.target.closest('.qaq-plan-color-option');
            if (option) {
                this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) {
                    o.classList.remove('qaq-color-selected');
                });
                colorCustomBtn.classList.remove('qaq-color-selected');
                option.classList.add('qaq-color-selected');
                selectedColor = option.dataset.color;
                colorPanel.classList.remove('qaq-color-panel-show');
                return;
            }

            if (e.target.closest('.qaq-color-custom-btn')) {
                this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) {
                    o.classList.remove('qaq-color-selected');
                });
                colorCustomBtn.classList.add('qaq-color-selected');

                if (colorPanel.classList.contains('qaq-color-panel-show')) {
                    colorPanel.classList.remove('qaq-color-panel-show');
                } else {
                    colorPanel.classList.add('qaq-color-panel-show');
                    window.qaqCreateColorPicker(colorPanel, selectedColor, function (hex) {
                        selectedColor = hex;
                        colorCustomBtn.style.background = hex;
                        colorPanel.classList.remove('qaq-color-panel-show');
                        window.qaqToast('颜色已选择');
                    }, function () {
                        colorPanel.classList.remove('qaq-color-panel-show');
                        colorCustomBtn.classList.remove('qaq-color-selected');
                    });
                }
            }
        });

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var name = document.getElementById('qaq-pf-name').value.trim();
            if (!name) return window.qaqToast('请输入项目名称');

            item.name = name;
            item.desc = document.getElementById('qaq-pf-desc').value.trim();
            item.thought = document.getElementById('qaq-pf-thought').value.trim();
            item.time = selectedTime;
            item.duration = document.getElementById('qaq-pf-duration').value.trim();
            item.color = selectedColor;
            item.category = selectedCategory;

            window.qaqSaveDayPlans(dateKey, dayItems);
            window.qaqCloseModal();

            setTimeout(function () {
                window.qaqRenderPlanCards();
                window.qaqRenderWidgetPlans();
            }, 230);

            window.qaqToast('已保存');
        };
    };

    /* ===== Add Plan ===== */
    window.qaqOpenAddPlanModal = function () {
        window.qaqModalTitle.textContent = '新建计划';

        var colorsHtml = '';
        window.qaqPlanColors.forEach(function (c, i) {
            colorsHtml += '<div class="qaq-plan-color-option' + (i === 0 ? ' qaq-color-selected' : '') + '" data-color="' + c + '" style="background:' + c + ';"></div>';
        });
        colorsHtml += '<div class="qaq-color-custom-btn" id="qaq-pf-color-custom" title="自定义颜色"></div>';

        var cats = window.qaqGetCategories();
        var catsHtml = '';
        cats.forEach(function (cat, i) {
            catsHtml += '<div class="qaq-plan-cat-chip' + (i === 0 ? ' qaq-cat-selected' : '') + '" data-cat="' + cat.name + '">' + cat.name + '</div>';
        });
        catsHtml += '<div class="qaq-plan-cat-chip qaq-plan-cat-chip-add" id="qaq-pf-cat-add">+ 新建</div>';

        window.qaqModalBody.innerHTML =
            '<div class="qaq-plan-form">' +
                '<div class="qaq-plan-form-label">项目名称 *</div>' +
                '<input class="qaq-plan-form-input" id="qaq-pf-name" type="text" placeholder="例如：背单词">' +
                '<div class="qaq-plan-form-label">分类</div>' +
                '<div class="qaq-plan-cat-picker" id="qaq-pf-cats">' + catsHtml + '</div>' +
                '<div class="qaq-plan-form-label">项目描述</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-pf-desc" placeholder="可选，简单描述一下"></textarea>' +
                '<div class="qaq-plan-form-label">想法</div>' +
                '<textarea class="qaq-plan-form-textarea" id="qaq-pf-thought" placeholder="记录你的灵感、想法、心得..."></textarea>' +
                '<div class="qaq-plan-form-row">' +
                    '<div style="flex:1;">' +
                        '<div class="qaq-plan-form-label">时间</div>' +
                        '<div class="qaq-time-picker-wrapper"><div class="qaq-time-picker-btn" id="qaq-pf-time-btn"><span class="qaq-time-placeholder">点击选择时间</span><svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>' +
                    '</div>' +
                    '<div style="flex:1;">' +
                        '<div class="qaq-plan-form-label">大致用时</div>' +
                        '<input class="qaq-plan-form-input" id="qaq-pf-duration" type="text" placeholder="如 30分钟" style="margin-top:6px;">' +
                    '</div>' +
                '</div>' +
                '<div class="qaq-plan-form-label">标签颜色</div>' +
                '<div class="qaq-plan-color-picker" id="qaq-pf-colors">' + colorsHtml + '</div>' +
                '<div class="qaq-color-panel" id="qaq-pf-color-panel"></div>' +
            '</div>';

        window.qaqModalBtns.innerHTML =
            '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
            '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">添加</button>';

        window.qaqOpenModal();

        var selectedTime = '';
        var selectedCategory = cats.length ? cats[0].name : '未分类';
        var selectedColor = window.qaqPlanColors[0];
        var timeBtn = document.getElementById('qaq-pf-time-btn');

        timeBtn.addEventListener('click', function () {
            window.qaqOpenTimePicker(selectedTime, function (val) {
                selectedTime = val;
                if (val) {
                    timeBtn.innerHTML =
                        '<span class="qaq-time-value">' + val + '</span>' +
                        '<svg class="qaq-time-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<circle cx="12" cy="12" r="10"/>' +
                            '<polyline points="12,6 12,12 16,14" stroke-linecap="round" stroke-linejoin="round"/>' +
                        '</svg>';
                }
            });
        });

        document.getElementById('qaq-pf-cats').addEventListener('click', function (e) {
            var chip = e.target.closest('.qaq-plan-cat-chip');
            if (!chip) return;
            if (chip.id === 'qaq-pf-cat-add') return;
            this.querySelectorAll('.qaq-plan-cat-chip').forEach(function (c) {
                c.classList.remove('qaq-cat-selected');
            });
            chip.classList.add('qaq-cat-selected');
            selectedCategory = chip.dataset.cat;
        });

        var colorPanel = document.getElementById('qaq-pf-color-panel');
        var colorCustomBtn = document.getElementById('qaq-pf-color-custom');

        document.getElementById('qaq-pf-colors').addEventListener('click', function (e) {
            var option = e.target.closest('.qaq-plan-color-option');
            if (option) {
                this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) {
                    o.classList.remove('qaq-color-selected');
                });
                colorCustomBtn.classList.remove('qaq-color-selected');
                option.classList.add('qaq-color-selected');
                selectedColor = option.dataset.color;
                colorPanel.classList.remove('qaq-color-panel-show');
                return;
            }

            if (e.target.closest('.qaq-color-custom-btn')) {
                this.querySelectorAll('.qaq-plan-color-option').forEach(function (o) {
                    o.classList.remove('qaq-color-selected');
                });
                colorCustomBtn.classList.add('qaq-color-selected');

                if (colorPanel.classList.contains('qaq-color-panel-show')) {
                    colorPanel.classList.remove('qaq-color-panel-show');
                } else {
                    colorPanel.classList.add('qaq-color-panel-show');
                    window.qaqCreateColorPicker(colorPanel, selectedColor, function (hex) {
                        selectedColor = hex;
                        colorCustomBtn.style.background = hex;
                        colorPanel.classList.remove('qaq-color-panel-show');
                        window.qaqToast('颜色已选择');
                    }, function () {
                        colorPanel.classList.remove('qaq-color-panel-show');
                        colorCustomBtn.classList.remove('qaq-color-selected');
                    });
                }
            }
        });

        setTimeout(function () {
            document.getElementById('qaq-pf-name').focus();
        }, 100);

        document.getElementById('qaq-modal-cancel').onclick = window.qaqCloseModal;
        document.getElementById('qaq-modal-confirm').onclick = function () {
            var name = document.getElementById('qaq-pf-name').value.trim();
            if (!name) return window.qaqToast('请输入项目名称');

            var dayItems = window.qaqGetDayPlans(window.qaqPlanSelectedDate);
            dayItems.push({
                id: window.qaqPlanId(),
                name: name,
                desc: document.getElementById('qaq-pf-desc').value.trim(),
                thought: document.getElementById('qaq-pf-thought').value.trim(),
                time: selectedTime,
                duration: document.getElementById('qaq-pf-duration').value.trim(),
                color: selectedColor,
                category: selectedCategory,
                done: false
            });

            window.qaqSaveDayPlans(window.qaqPlanSelectedDate, dayItems);
            window.qaqCloseModal();
            window.qaqRenderPlanCards();
            window.qaqRenderWidgetPlans();
            window.qaqToast('计划已添加');
        };
    };

    /* ===== Plan Theme ===== */
    window.qaqPlanAccentPresets = [
        { name: '暖阳', color: '#c47068' },
        { name: '蜜桃', color: '#e05565' },
        { name: '橘子', color: '#e88d4f' },
        { name: '柠檬', color: '#c4a820' },
        { name: '薄荷', color: '#4aaa6a' },
        { name: '天空', color: '#5b9bd5' },
        { name: '薰衣草', color: '#8b6cc1' },
        { name: '石墨', color: '#666666' }
    ];

    window.qaqApplyWidgetBg = function () {
        var widget = document.getElementById('qaq-plan-widget');
        if (!widget) return;
        var theme = window.qaqGetPlanTheme();

        var oldBg = widget.querySelector('.qaq-plan-widget-bg');
        if (oldBg) oldBg.remove();
        widget.classList.remove('qaq-has-widget-bg');

        if (theme.widgetBg) {
            widget.classList.add('qaq-has-widget-bg');
            var op = (theme.widgetOpacity != null ? theme.widgetOpacity : 45) / 100;
            var bgDiv = document.createElement('div');
            bgDiv.className = 'qaq-plan-widget-bg';
            bgDiv.innerHTML =
                '<img src="' + theme.widgetBg + '">' +
                '<div style="position:absolute;inset:0;background:rgba(255,255,255,' + op + ');"></div>';
            widget.insertBefore(bgDiv, widget.firstChild);
            widget.style.background = 'transparent';
            widget.style.border = '1px solid rgba(255,255,255,0.3)';
        } else {
            widget.style.background = '';
            widget.style.border = '';
        }
    };

    window.qaqApplyPlanTheme = function () {
        var theme = window.qaqGetPlanTheme();
        var bgEl = document.getElementById('qaq-plan-page-bg');
        var overlayEl = document.getElementById('qaq-plan-page-bg-overlay');

        if (theme.wallpaper) {
            bgEl.style.backgroundImage = 'url(' + theme.wallpaper + ')';
            bgEl.style.display = '';
            var op = (theme.wallpaperOpacity || 30) / 100;
            overlayEl.style.background = 'rgba(0,0,0,' + op + ')';
            overlayEl.style.display = '';
        } else {
            bgEl.style.backgroundImage = '';
            bgEl.style.display = 'none';
            overlayEl.style.display = 'none';
        }

        var planPage = document.getElementById('qaq-plan-page');
        if (theme.accent) {
            planPage.style.setProperty('--qaq-accent', theme.accent);

            var addBtns = planPage.querySelectorAll('.qaq-plan-add-btn');
            addBtns.forEach(function (btn) {
                btn.style.background = 'linear-gradient(135deg, ' + theme.accent + '33, ' + theme.accent + '66)';
            });

            var dateActive = planPage.querySelectorAll('.qaq-plan-date-chip.qaq-date-active');
            dateActive.forEach(function (chip) {
                chip.style.background = 'linear-gradient(135deg, ' + theme.accent + '33, ' + theme.accent + '66)';
                chip.style.color = theme.accent;
            });
        } else {
            planPage.style.removeProperty('--qaq-accent');
            var addBtns2 = planPage.querySelectorAll('.qaq-plan-add-btn');
            addBtns2.forEach(function (btn) { btn.style.background = ''; });
        }
    };

    window.qaqRenderPlanThemePage = function () {
        var theme = window.qaqGetPlanTheme();

        var wpPreview = document.getElementById('qaq-pt-wallpaper-preview');
        if (theme.wallpaper) {
            var wpOp = (theme.wallpaperOpacity != null ? theme.wallpaperOpacity : 30) / 100;
            wpPreview.innerHTML =
                '<img src="' + theme.wallpaper + '">' +
                '<div class="qaq-preview-overlay" id="qaq-pt-wp-overlay" style="background:rgba(0,0,0,' + wpOp + ');"></div>';
        } else {
            wpPreview.innerHTML = '<div class="qaq-wp-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>点击下方按钮设置壁纸</div>';
        }

        var opSlider = document.getElementById('qaq-pt-wp-opacity');
        var opVal = document.getElementById('qaq-pt-wp-opacity-val');
        opSlider.value = theme.wallpaperOpacity != null ? theme.wallpaperOpacity : 30;
        opVal.textContent = opSlider.value + '%';

        var cardPreview = document.getElementById('qaq-pt-card-preview');
        if (theme.cardBg) {
            var cardOp = (theme.cardOpacity != null ? theme.cardOpacity : 55) / 100;
            cardPreview.innerHTML =
                '<img src="' + theme.cardBg + '">' +
                '<div class="qaq-preview-overlay" id="qaq-pt-card-overlay" style="background:rgba(255,255,255,' + cardOp + ');"></div>';
        } else {
            cardPreview.innerHTML = '<div class="qaq-wp-placeholder" style="font-size:11px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>未设置</div>';
        }

        var cardOpSlider = document.getElementById('qaq-pt-card-opacity');
        var cardOpVal = document.getElementById('qaq-pt-card-opacity-val');
        cardOpSlider.value = theme.cardOpacity != null ? theme.cardOpacity : 55;
        cardOpVal.textContent = cardOpSlider.value + '%';

        var widgetPreview = document.getElementById('qaq-pt-widget-preview');
        if (widgetPreview) {
            if (theme.widgetBg) {
                var wOp = (theme.widgetOpacity != null ? theme.widgetOpacity : 45) / 100;
                widgetPreview.innerHTML =
                    '<img src="' + theme.widgetBg + '">' +
                    '<div class="qaq-preview-overlay" id="qaq-pt-widget-overlay" style="background:rgba(255,255,255,' + wOp + ');"></div>';
            } else {
                widgetPreview.innerHTML = '<div class="qaq-wp-placeholder" style="font-size:11px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>未设置</div>';
            }
            var wSlider = document.getElementById('qaq-pt-widget-opacity');
            var wVal = document.getElementById('qaq-pt-widget-opacity-val');
            if (wSlider) {
                wSlider.value = theme.widgetOpacity != null ? theme.widgetOpacity : 45;
                wVal.textContent = wSlider.value + '%';
            }
        }

        var accentRow = document.getElementById('qaq-pt-accent-row');
        var accentHtml = '';

        window.qaqPlanAccentPresets.forEach(function (p) {
            var sel = theme.accent && theme.accent.toLowerCase() === p.color.toLowerCase();
            accentHtml += '<div class="qaq-theme-accent-dot' + (sel ? ' qaq-accent-active' : '') + '" data-accent="' + p.color + '" style="background:' + p.color + ';" title="' + p.name + '"></div>';
        });

        var matchPreset = window.qaqPlanAccentPresets.some(function (p) {
            return theme.accent && theme.accent.toLowerCase() === p.color.toLowerCase();
        });

        var customStyle = (!matchPreset && theme.accent) ? 'background:' + theme.accent + ';' : '';
        accentHtml += '<div class="qaq-cat-color-custom' + (!matchPreset && theme.accent ? ' qaq-accent-active' : '') + '" id="qaq-pt-accent-custom" style="width:32px;height:32px;border-width:3px;' + customStyle + '"></div>';
        accentRow.innerHTML = accentHtml;
    };

    /* ===== Bind Time Picker Events ===== */
    if (window.qaqTimeHourCol && window.qaqTimeMinuteCol) {
        window.qaqBuildTimeCol(window.qaqTimeHourCol, 24, true);
        window.qaqBuildTimeCol(window.qaqTimeMinuteCol, 60, true);

        window.qaqTimeHourCol.addEventListener('scroll', function () {
            window.qaqUpdateTimeHighlight(this);
        });

        window.qaqTimeMinuteCol.addEventListener('scroll', function () {
            window.qaqUpdateTimeHighlight(this);
        });

        window.qaqTimeHourCol.addEventListener('click', function (e) {
            var item = e.target.closest('.qaq-time-col-item');
            if (item) window.qaqScrollToVal(this, parseInt(item.dataset.val, 10));
        });

        window.qaqTimeMinuteCol.addEventListener('click', function (e) {
            var item = e.target.closest('.qaq-time-col-item');
            if (item) window.qaqScrollToVal(this, parseInt(item.dataset.val, 10));
        });
    }

    var timeConfirm = document.getElementById('qaq-time-confirm');
    if (timeConfirm) {
        timeConfirm.addEventListener('click', function () {
            var h = window.qaqGetSelectedVal(window.qaqTimeHourCol);
            var m = window.qaqGetSelectedVal(window.qaqTimeMinuteCol);
            var val = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
            if (window.qaqTimeCallback) window.qaqTimeCallback(val);
            window.qaqCloseTimePicker();
        });
    }

    var timeCancel = document.getElementById('qaq-time-cancel');
    if (timeCancel) timeCancel.addEventListener('click', window.qaqCloseTimePicker);
    if (window.qaqTimeMask) window.qaqTimeMask.addEventListener('click', window.qaqCloseTimePicker);

    var timeClear = document.getElementById('qaq-time-clear');
    if (timeClear) {
        timeClear.addEventListener('click', function () {
            if (window.qaqTimeCallback) window.qaqTimeCallback('');
            window.qaqCloseTimePicker();
        });
    }

    /* ===== Bind Plan Page Events ===== */
    var planDateEl = document.getElementById('qaq-plan-date');
    if (planDateEl) {
        var now = new Date();
        planDateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日';
    }

    var planBackBtn = document.getElementById('qaq-plan-back');
    if (planBackBtn) {
        planBackBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.qaqClosePlanPage();
            window.qaqRenderWidgetPlans();
        });
    }

    var planWidget = document.getElementById('qaq-plan-widget');
    if (planWidget) {
        planWidget.addEventListener('click', function () {
            window.qaqOpenPlanPage();
        });
    }

    var planAddBtn = document.getElementById('qaq-plan-add-btn');
    if (planAddBtn) {
        planAddBtn.addEventListener('click', function () {
            window.qaqOpenAddPlanModal();
        });
    }

    var planCatManageBtn = document.getElementById('qaq-plan-cat-manage-btn');
    if (planCatManageBtn) {
        planCatManageBtn.addEventListener('click', function () {
            window.qaqOpenCatManage();
        });
    }

    /* ===== Bind Plan Theme Events ===== */
    var planThemeBtn = document.getElementById('qaq-plan-theme-btn');
    if (planThemeBtn) {
        planThemeBtn.addEventListener('click', function () {
            window.qaqRenderPlanThemePage();
            window.qaqSwitchTo(window.qaqPlanThemePage);
        });
    }

    var planThemeBack = document.getElementById('qaq-plan-theme-back');
    if (planThemeBack) {
        planThemeBack.addEventListener('click', function () {
            var planPage = document.getElementById('qaq-plan-page');
            window.qaqGoBackTo(planPage, window.qaqPlanThemePage);
            window.qaqApplyPlanTheme();
            window.qaqApplyWidgetBg();
            window.qaqRenderPlanCards();
        });
    }

    var ptUpload = document.getElementById('qaq-pt-wp-upload');
    if (ptUpload) {
        ptUpload.addEventListener('click', function () {
            window.qaqEditImage('设置页面壁纸', function (src) {
                var theme = window.qaqGetPlanTheme();
                theme.wallpaper = src;
                window.qaqSavePlanTheme(theme);
                window.qaqRenderPlanThemePage();
                window.qaqApplyPlanTheme();
                window.qaqToast('壁纸已设置');
            });
        });
    }

    var ptClear = document.getElementById('qaq-pt-wp-clear');
    if (ptClear) {
        ptClear.addEventListener('click', function () {
            var theme = window.qaqGetPlanTheme();
            theme.wallpaper = '';
            window.qaqSavePlanTheme(theme);
            window.qaqRenderPlanThemePage();
            window.qaqApplyPlanTheme();
            window.qaqToast('壁纸已清除');
        });
    }

    var ptOpacity = document.getElementById('qaq-pt-wp-opacity');
    if (ptOpacity) {
        ptOpacity.addEventListener('input', function () {
            document.getElementById('qaq-pt-wp-opacity-val').textContent = this.value + '%';
            var overlay = document.getElementById('qaq-pt-wp-overlay');
            if (overlay) overlay.style.background = 'rgba(0,0,0,' + (this.value / 100) + ')';
        });

        ptOpacity.addEventListener('change', function () {
            var theme = window.qaqGetPlanTheme();
            theme.wallpaperOpacity = parseInt(this.value, 10);
            window.qaqSavePlanTheme(theme);
            window.qaqApplyPlanTheme();
        });
    }

    var ptCardUpload = document.getElementById('qaq-pt-card-upload');
    if (ptCardUpload) {
        ptCardUpload.addEventListener('click', function () {
            window.qaqEditImage('设置卡片背景', function (src) {
                var theme = window.qaqGetPlanTheme();
                theme.cardBg = src;
                window.qaqSavePlanTheme(theme);
                window.qaqRenderPlanThemePage();
                window.qaqToast('卡片背景已设置');
            });
        });
    }

    var ptCardClear = document.getElementById('qaq-pt-card-clear');
    if (ptCardClear) {
        ptCardClear.addEventListener('click', function () {
            var theme = window.qaqGetPlanTheme();
            theme.cardBg = '';
            window.qaqSavePlanTheme(theme);
            window.qaqRenderPlanThemePage();
            window.qaqToast('卡片背景已清除');
        });
    }

    var ptCardOpacity = document.getElementById('qaq-pt-card-opacity');
    if (ptCardOpacity) {
        ptCardOpacity.addEventListener('input', function () {
            document.getElementById('qaq-pt-card-opacity-val').textContent = this.value + '%';
            var overlay = document.getElementById('qaq-pt-card-overlay');
            if (overlay) overlay.style.background = 'rgba(255,255,255,' + (this.value / 100) + ')';
        });

        ptCardOpacity.addEventListener('change', function () {
            var theme = window.qaqGetPlanTheme();
            theme.cardOpacity = parseInt(this.value, 10);
            window.qaqSavePlanTheme(theme);
        });
    }

    var ptWidgetUpload = document.getElementById('qaq-pt-widget-upload');
    if (ptWidgetUpload) {
        ptWidgetUpload.addEventListener('click', function () {
            window.qaqEditImage('设置小组件背景', function (src) {
                var theme = window.qaqGetPlanTheme();
                theme.widgetBg = src;
                window.qaqSavePlanTheme(theme);
                window.qaqRenderPlanThemePage();
                window.qaqApplyWidgetBg();
                window.qaqToast('小组件背景已设置');
            });
        });
    }

    var ptWidgetClear = document.getElementById('qaq-pt-widget-clear');
    if (ptWidgetClear) {
        ptWidgetClear.addEventListener('click', function () {
            var theme = window.qaqGetPlanTheme();
            theme.widgetBg = '';
            window.qaqSavePlanTheme(theme);
            window.qaqRenderPlanThemePage();
            window.qaqApplyWidgetBg();
            window.qaqToast('小组件背景已清除');
        });
    }

    var ptWidgetOpacity = document.getElementById('qaq-pt-widget-opacity');
    if (ptWidgetOpacity) {
        ptWidgetOpacity.addEventListener('input', function () {
            document.getElementById('qaq-pt-widget-opacity-val').textContent = this.value + '%';
            var overlay = document.getElementById('qaq-pt-widget-overlay');
            if (overlay) overlay.style.background = 'rgba(255,255,255,' + (this.value / 100) + ')';
        });

        ptWidgetOpacity.addEventListener('change', function () {
            var theme = window.qaqGetPlanTheme();
            theme.widgetOpacity = parseInt(this.value, 10);
            window.qaqSavePlanTheme(theme);
            window.qaqApplyWidgetBg();
        });
    }

    var ptAccentRow = document.getElementById('qaq-pt-accent-row');
    if (ptAccentRow) {
        ptAccentRow.addEventListener('click', function (e) {
            var dot = e.target.closest('.qaq-theme-accent-dot');
            if (dot) {
                this.querySelectorAll('.qaq-theme-accent-dot').forEach(function (d) {
                    d.classList.remove('qaq-accent-active');
                });

                var customBtn = document.getElementById('qaq-pt-accent-custom');
                if (customBtn) customBtn.classList.remove('qaq-accent-active');

                dot.classList.add('qaq-accent-active');

                var theme = window.qaqGetPlanTheme();
                theme.accent = dot.dataset.accent;
                window.qaqSavePlanTheme(theme);
                window.qaqApplyPlanTheme();
                window.qaqToast('色系已切换');

                document.getElementById('qaq-pt-accent-panel').classList.remove('qaq-cat-color-panel-show');
                return;
            }

            var custom = e.target.closest('.qaq-cat-color-custom');
            if (custom) {
                this.querySelectorAll('.qaq-theme-accent-dot').forEach(function (d) {
                    d.classList.remove('qaq-accent-active');
                });
                custom.classList.add('qaq-accent-active');

                var panel = document.getElementById('qaq-pt-accent-panel');
                if (panel.classList.contains('qaq-cat-color-panel-show')) {
                    panel.classList.remove('qaq-cat-color-panel-show');
                } else {
                    panel.classList.add('qaq-cat-color-panel-show');
                    var curTheme = window.qaqGetPlanTheme();
                    window.qaqCreateColorPicker(panel, curTheme.accent || '#c47068', function (hex) {
                        curTheme = window.qaqGetPlanTheme();
                        curTheme.accent = hex;
                        window.qaqSavePlanTheme(curTheme);
                        custom.style.background = hex;
                        panel.classList.remove('qaq-cat-color-panel-show');
                        window.qaqApplyPlanTheme();
                        window.qaqToast('色系已设置');
                    }, function () {
                        panel.classList.remove('qaq-cat-color-panel-show');
                        custom.classList.remove('qaq-accent-active');
                    });
                }
            }
        });
    }

    var ptReset = document.getElementById('qaq-pt-reset');
    if (ptReset) {
        ptReset.addEventListener('click', function () {
            window.qaqConfirm('恢复默认', '确认恢复计划页面为默认主题？', function () {
                localStorage.removeItem('qaq-plan-theme');
                window.qaqCacheInvalidate('qaq-plan-theme');
                window.qaqApplyPlanTheme();
                window.qaqApplyWidgetBg();
                window.qaqRenderPlanThemePage();
                window.qaqRenderPlanCards();
                window.qaqToast('已恢复默认');
            });
        });
    }

    /* ===== Initial Apply ===== */
    window.qaqApplyPlanTheme();
    window.qaqApplyWidgetBg();
    window.qaqRenderWidgetPlans();

})();