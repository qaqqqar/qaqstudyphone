(function () {
    'use strict';

    if (window.qaqFloatLoggerLoaded) return;
    window.qaqFloatLoggerLoaded = true;

    var logs = [];
    var maxLogs = 200;

    function safeStringify(v) {
        try {
            if (typeof v === 'string') return v;
            if (v instanceof Error) return v.stack || (v.name + ': ' + v.message);
            return JSON.stringify(v);
        } catch (e) {
            try { return String(v); } catch (_) { return '[Unserializable]'; }
        }
    }

    function joinArgs(args) {
        return Array.prototype.slice.call(args).map(safeStringify).join(' ');
    }

    function addLog(level, msg) {
        var time = new Date();
        var hh = String(time.getHours()).padStart(2, '0');
        var mm = String(time.getMinutes()).padStart(2, '0');
        var ss = String(time.getSeconds()).padStart(2, '0');

        logs.push({
            level: level,
            text: '[' + hh + ':' + mm + ':' + ss + '] ' + msg
        });

        if (logs.length > maxLogs) logs.shift();
        renderLogs();
    }

    function renderLogs() {
        var list = document.getElementById('qaq-float-log-list');
        var badge = document.getElementById('qaq-float-log-badge');
        if (!list) return;

        list.innerHTML = logs.map(function (item) {
            var color = item.level === 'error'
                ? '#ff7b7b'
                : item.level === 'warn'
                    ? '#ffd36f'
                    : '#d8d8d8';

            return '<div style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:11px;line-height:1.5;color:' + color + ';word-break:break-word;">' +
                item.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</div>';
        }).join('');

        if (badge) {
            var errors = logs.filter(function (x) { return x.level === 'error'; }).length;
            badge.textContent = errors > 99 ? '99+' : String(errors);
            badge.style.display = errors ? 'flex' : 'none';
        }

        list.scrollTop = list.scrollHeight;
    }

    function createUI() {
        var wrap = document.createElement('div');
        wrap.id = 'qaq-float-log-wrap';
        wrap.innerHTML =
            '<div id="qaq-float-log-ball" style="' +
                'position:fixed;right:14px;bottom:140px;z-index:99999;' +
                'width:54px;height:54px;border-radius:50%;' +
                'background:linear-gradient(135deg,#c47068,#8b6cc1);' +
                'box-shadow:0 6px 18px rgba(0,0,0,0.22);' +
                'display:flex;align-items:center;justify-content:center;' +
                'color:#fff;font-size:12px;font-weight:700;user-select:none;' +
                'touch-action:none;">' +
                '日志' +
                '<div id="qaq-float-log-badge" style="' +
                    'position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;' +
                    'border-radius:999px;background:#ff5a5f;color:#fff;font-size:10px;font-weight:700;' +
                    'display:none;align-items:center;justify-content:center;">0</div>' +
            '</div>' +

            '<div id="qaq-float-log-panel" style="' +
                'display:none;position:fixed;right:14px;bottom:206px;z-index:99999;' +
                'width:min(88vw,360px);height:min(52vh,420px);' +
                'background:rgba(18,18,18,0.96);color:#fff;border-radius:14px;' +
                'box-shadow:0 10px 30px rgba(0,0,0,0.35);overflow:hidden;' +
                'border:1px solid rgba(255,255,255,0.08);">' +

                '<div id="qaq-float-log-header" style="' +
                    'height:42px;padding:0 10px;display:flex;align-items:center;justify-content:space-between;' +
                    'background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.08);">' +
                    '<div style="font-size:12px;font-weight:700;">运行日志</div>' +
                    '<div style="display:flex;gap:8px;">' +
                        '<button id="qaq-float-log-clear" style="border:none;background:#333;color:#ddd;border-radius:8px;padding:4px 8px;font-size:11px;">清空</button>' +
                        '<button id="qaq-float-log-close" style="border:none;background:#333;color:#ddd;border-radius:8px;padding:4px 8px;font-size:11px;">关闭</button>' +
                    '</div>' +
                '</div>' +

                '<div id="qaq-float-log-list" style="' +
                    'height:calc(100% - 42px);overflow:auto;-webkit-overflow-scrolling:touch;' +
                    'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">' +
                '</div>' +
            '</div>';

        document.body.appendChild(wrap);

        bindUI();
    }

    function bindUI() {
        var ball = document.getElementById('qaq-float-log-ball');
        var panel = document.getElementById('qaq-float-log-panel');
        var closeBtn = document.getElementById('qaq-float-log-close');
        var clearBtn = document.getElementById('qaq-float-log-clear');

        if (!ball || !panel) return;

        closeBtn.onclick = function () {
            panel.style.display = 'none';
        };

        clearBtn.onclick = function () {
            logs = [];
            renderLogs();
        };

        var moved = false;
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var startRight = 14;
        var startBottom = 140;

        function getRight() {
            return parseFloat(ball.style.right || '14') || 14;
        }
        function getBottom() {
            return parseFloat(ball.style.bottom || '140') || 140;
        }

        ball.addEventListener('click', function () {
            if (moved) {
                moved = false;
                return;
            }
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            renderLogs();
        });

        function onStart(x, y) {
            dragging = true;
            moved = false;
            startX = x;
            startY = y;
            startRight = getRight();
            startBottom = getBottom();
        }

        function onMove(x, y) {
            if (!dragging) return;

            var dx = x - startX;
            var dy = y - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

            ball.style.right = Math.max(0, startRight - dx) + 'px';
            ball.style.bottom = Math.max(40, startBottom - dy) + 'px';

            if (panel.style.display !== 'none') {
                panel.style.right = ball.style.right;
                panel.style.bottom = (parseFloat(ball.style.bottom) + 66) + 'px';
            }
        }

        function onEnd() {
            dragging = false;
        }

        ball.addEventListener('mousedown', function (e) {
            onStart(e.clientX, e.clientY);
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            onMove(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', onEnd);

        ball.addEventListener('touchstart', function (e) {
            if (!e.touches || !e.touches[0]) return;
            onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (!dragging || !e.touches || !e.touches[0]) return;
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        document.addEventListener('touchend', onEnd);
    }

    function hookConsole() {
        var rawLog = console.log;
        var rawWarn = console.warn;
        var rawError = console.error;

        console.log = function () {
            addLog('log', joinArgs(arguments));
            rawLog.apply(console, arguments);
        };

        console.warn = function () {
            addLog('warn', joinArgs(arguments));
            rawWarn.apply(console, arguments);
        };

        console.error = function () {
            addLog('error', joinArgs(arguments));
            rawError.apply(console, arguments);
        };

        window.addEventListener('error', function (e) {
            addLog('error', '[window.onerror] ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0));
        });

        window.addEventListener('unhandledrejection', function (e) {
            addLog('error', '[promise] ' + safeStringify(e.reason));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            createUI();
            hookConsole();
            addLog('log', '浮动日志已启动');
        });
    } else {
        createUI();
        hookConsole();
        addLog('log', '浮动日志已启动');
    }

    window.qaqDebugLog = function () {
        addLog('log', joinArgs(arguments));
    };
})();