(function () {
    'use strict';
var wordbankPage = window.qaqWordbankPage || document.getElementById('qaq-wordbank-page');
var modalTitle = window.qaqModalTitle || document.getElementById('qaq-modal-title');
var modalBody = window.qaqModalBody || document.getElementById('qaq-modal-body');
var modalBtns = window.qaqModalBtns || document.getElementById('qaq-modal-btns');
var overlay = window.qaqModalOverlay;
var fileInput = window.qaqFileInput;
var qaqPageLock = window.qaqPageLock;
var qaqSwitchTimer = window.qaqSwitchTimer;

// 提前暴露给 review.js 使用
window.qaqWordbankPage = wordbankPage;

    /*===== Live2D / PixiJS 懒加载 ===== */
var qaqLive2DReady = false;
var qaqLive2DLoading = false;
var qaqLive2DCallbacks = [];

function qaqEnsureLive2D(callback) {
    if (qaqLive2DReady) { if (callback) callback(); return; }
    if (callback) qaqLive2DCallbacks.push(callback);
    if (qaqLive2DLoading) return;
    qaqLive2DLoading = true;

    var scripts = [
        'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.10/browser/pixi.min.js',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/dist/cubism4.min.js',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/dist/index.min.js'
    ];
    var loaded = 0;

    function loadNext() {
        if (loaded >= scripts.length) {
            qaqLive2DReady = true;
            qaqLive2DLoading = false;
            qaqLive2DCallbacks.forEach(function(cb) { try { cb(); } catch(e) { console.error(e); } });
            qaqLive2DCallbacks = [];
            return;
        }
        var s = document.createElement('script');
        s.src = scripts[loaded];
        s.onload = function() { loaded++; loadNext(); };
        s.onerror = function() {
            console.error('Failed to load: ' + scripts[loaded]);
            loaded++; loadNext();
        };
        document.head.appendChild(s);
    }
    loadNext();
}

/* ===== 1. 全局动画/模型映射配置 ===== */
// 💡 把字典名字改成 qaqLotties 更通用（可选，但不影响运行）
window.qaqLotties = {
    // 🐶 动物类
    'animal-dog': './assets/lottie/dog1.json',
    'animal-rabbit': './assets/lottie/rabbit1.json',
    'animal-cat': './assets/lottie/cat1.json',    // 🌟 新增：小猫

    // 🌹 植物类 (只要这里的 Key 和 qaqShopCatalog 里的 id 一致即可完美替换)
    'seed-rose': './assets/lottie/rose1.json'     // 🌟 新增：玫瑰
};

/* ===== 2. 获取系统的全局展示模式 ===== */
function qaqGetDisplayMode() {
    // 模式分为: 'static' (2D静态), 'lottie' (2D动态), '3d' (3D模型)
    return qaqCacheGet('qaq-global-display-mode', 'lottie'); 
}

function qaqSaveDisplayMode(mode) {
    qaqCacheSet('qaq-global-display-mode', mode);
}

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

function qaqGetYardSkinCatalog() {
    return [
        { id: 'default', name: '默认渐变', image: '' },
        { id: 'yard1', name: '小院皮肤 1', image: 'assets/images/yard1.jpg' }
    ];
}

function qaqGetXiaoyuanSceneSettings() {
    return qaqCacheGet('qaq-xiaoyuan-scene-settings', {
        yardSkin:'default',
        yardScale:1,
        followSceneScale:true
    });
}

function qaqSaveXiaoyuanSceneSettings(data) {
    var old=qaqGetXiaoyuanSceneSettings();
    qaqCacheSet('qaq-xiaoyuan-scene-settings', {
        yardSkin:data&&data.yardSkin!=null?data.yardSkin:(old.yardSkin||'default'),
        yardScale:data&&data.yardScale!=null?data.yardScale:(old.yardScale||1),
        followSceneScale:data&&data.followSceneScale!=null?!!data.followSceneScale:(old.followSceneScale!==false)
    });
}

function qaqGetCurrentYardSkin() {
    var settings = qaqGetXiaoyuanSceneSettings();
    var list = qaqGetYardSkinCatalog();
    return list.find(function (x) { return x.id === settings.yardSkin; }) || list[0];
}

function qaqEnsureXiaoyuanSceneStructure() {
    var sceneEl=document.getElementById('qaq-xy-main-scene');
    if(!sceneEl) return null;
    var inner=sceneEl.querySelector('.qaq-xiaoyuan-scene-inner');
    if(!inner){
        inner=document.createElement('div');
        inner.className='qaq-xiaoyuan-scene-inner';
        while(sceneEl.firstChild){
            inner.appendChild(sceneEl.firstChild);
        }
        sceneEl.appendChild(inner);
    }
    var scaler=inner.querySelector('.qaq-xiaoyuan-scene-scaler');
    if(!scaler){
        scaler=document.createElement('div');
        scaler.className='qaq-xiaoyuan-scene-scaler';
        inner.appendChild(scaler);
    }
    return {sceneEl:sceneEl,inner:inner,scaler:scaler};
}

var qaqXiaoyuanSkinLoader=null;

function qaqApplyXiaoyuanSceneSkin(showProgress) {
    var refs=qaqEnsureXiaoyuanSceneStructure();
    if(!refs) return;
    var sceneEl=refs.sceneEl;
    var inner=refs.inner;
    var skin=qaqGetCurrentYardSkin();
    var settings=qaqGetXiaoyuanSceneSettings();
    var scale=settings.yardScale||1;

    inner.style.transform='scale(' + scale + ')';
    inner.style.backgroundImage='';
    inner.style.backgroundSize='cover';
    inner.style.backgroundPosition='center';
    inner.style.backgroundRepeat='no-repeat';

    if(qaqXiaoyuanSkinLoader){
        qaqXiaoyuanSkinLoader.onload=null;
        qaqXiaoyuanSkinLoader.onerror=null;
        qaqXiaoyuanSkinLoader=null;
    }

    if(!skin||skin.id==='default'||!skin.image){
        sceneEl.classList.remove('qaq-xiaoyuan-has-custom-skin');
        return;
    }

    sceneEl.classList.remove('qaq-xiaoyuan-has-custom-skin');

    var img=new Image();
    qaqXiaoyuanSkinLoader=img;

    if(showProgress){
        qaqOpenXiaoyuanLoadProgress('加载小院皮肤','正在读取皮肤资源...',function(){
            if(qaqXiaoyuanSkinLoader){
                qaqXiaoyuanSkinLoader.onload=null;
                qaqXiaoyuanSkinLoader.onerror=null;
                qaqXiaoyuanSkinLoader=null;
            }
            qaqToast('已取消皮肤加载');
        },function(){
            var scene=qaqGetXiaoyuanSceneSettings();
            scene.yardSkin='default';
            qaqSaveXiaoyuanSceneSettings(scene);
            qaqRefreshXiaoyuanSettingTexts();
            qaqApplyXiaoyuanSceneSkin(false);
            qaqToast('已切换为默认渐变');
        });
        qaqUpdateXiaoyuanLoadProgress(5,'正在发起请求...');
        setTimeout(function(){if(qaqXiaoyuanSkinLoader===img) qaqUpdateXiaoyuanLoadProgress(25,'正在下载图片...');},120);
        setTimeout(function(){if(qaqXiaoyuanSkinLoader===img) qaqUpdateXiaoyuanLoadProgress(60,'正在解码图片...');},260);
    }

    img.onload=function(){
        if(qaqXiaoyuanSkinLoader!==img) return;
        inner.style.backgroundImage='url("' + skin.image + '")';
        sceneEl.classList.add('qaq-xiaoyuan-has-custom-skin');
        if(showProgress){
            qaqUpdateXiaoyuanLoadProgress(100,'皮肤加载完成');
            setTimeout(qaqCloseXiaoyuanLoadProgress,180);
        }
        qaqXiaoyuanSkinLoader=null;
    };

    img.onerror=function(){
        if(qaqXiaoyuanSkinLoader!==img) return;
        if(showProgress){
            qaqUpdateXiaoyuanLoadProgress(100,'皮肤加载失败');
            setTimeout(qaqCloseXiaoyuanLoadProgress,200);
        }
        qaqToast('皮肤加载失败，请检查图片路径');
        qaqXiaoyuanSkinLoader=null;
    };

    img.src=skin.image;
}

function qaqGetXiaoyuanSpriteMount() {
    var refs=qaqEnsureXiaoyuanSceneStructure();
    if(!refs) return null;
    var settings=qaqGetXiaoyuanSceneSettings();
    return settings.followSceneScale ? refs.scaler : refs.sceneEl;
}

var qaqXiaoyuanLoadAborter=null;
var qaqXiaoyuanLoadChangingMode=false;

function qaqOpenXiaoyuanLoadProgress(title,desc,onCancel,onChangeMode){
    var layer=document.getElementById('qaq-import-progress');
    var titleEl=document.getElementById('qaq-import-progress-title');
    var descEl=document.getElementById('qaq-import-progress-desc');
    var fillEl=document.getElementById('qaq-import-progress-fill');
    var textEl=document.getElementById('qaq-import-progress-text');
    var cancelBtn=document.getElementById('qaq-import-cancel-btn');
    var retryBtn=document.getElementById('qaq-import-retry-btn');
    if(!layer||!titleEl||!descEl||!fillEl||!textEl||!cancelBtn||!retryBtn) return;
    titleEl.textContent=title||'加载中';
    descEl.textContent=desc||'请稍候...';
    fillEl.style.width='0%';
    textEl.textContent='0%';
    retryBtn.textContent='更换渲染方式';
    retryBtn.style.display='';
    cancelBtn.onclick=function(){
        if(onCancel) onCancel();
        qaqCloseXiaoyuanLoadProgress();
    };
    retryBtn.onclick=function(){
        if(onChangeMode) onChangeMode();
        qaqCloseXiaoyuanLoadProgress();
    };
    layer.classList.add('qaq-import-show');
}

function qaqUpdateXiaoyuanLoadProgress(percent,desc){
    var fillEl=document.getElementById('qaq-import-progress-fill');
    var textEl=document.getElementById('qaq-import-progress-text');
    var descEl=document.getElementById('qaq-import-progress-desc');
    if(fillEl) fillEl.style.width=(percent||0)+'%';
    if(textEl) textEl.textContent=(percent||0)+'%';
    if(descEl&&desc!=null) descEl.textContent=desc;
}

function qaqCloseXiaoyuanLoadProgress(){
    var layer=document.getElementById('qaq-import-progress');
    if(layer) layer.classList.remove('qaq-import-show');
}
function qaqOpenXiaoyuanRenderModeQuickSwitch(type){
    var settings=qaqGetXiaoyuanDisplaySettings();
    var current=type==='plant'?(settings.plantMode||'lottie'):type==='animal'?(settings.animalMode||'lottie'):(settings.itemMode||'static');
    qaqOpenXiaoyuanSelectModal('更换' + (type==='plant'?'植物':type==='animal'?'动物':'道具') + '渲染方式',[
        {value:'static',label:'2D 静态'},
        {value:'lottie',label:'2D 动态'},
        {value:'3d',label:'3D 模型'}
    ],current,function(val){
        if(type==='plant') settings.plantMode=val;
        else if(type==='animal') settings.animalMode=val;
        else settings.itemMode=val;
        qaqSaveXiaoyuanDisplaySettings(settings);
        qaqRefreshXiaoyuanSettingTexts();
        qaqRenderXiaoyuanMain();
        qaqToast('已切换渲染方式');
    });
}

/* ===== 3. Lottie 引擎懒加载 (与 3D 逻辑同源) ===== */
var qaqLottieReady = false;
var qaqLottieLoading = false;
var qaqLottieCallbacks = [];

function qaqEnsureLottie(callback) {
    // 如果存在 LottiePlayer，说明已经加载过了
    if (qaqLottieReady || typeof LottiePlayer !== 'undefined') { 
        if (callback) callback(); 
        return; 
    }
    if (callback) qaqLottieCallbacks.push(callback);
    if (qaqLottieLoading) return;
    qaqLottieLoading = true;

    // 动态插入 JS 脚本，不需要改 HTML
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    s.onload = function () {
        qaqLottieReady = true;
        qaqLottieLoading = false;
        qaqLottieCallbacks.forEach(function (cb) { try { cb(); } catch (e) {} });
        qaqLottieCallbacks = [];
    };
    s.onerror = function () {
        console.error('Lottie 引擎加载失败');
        qaqLottieLoading = false;
    };
    document.head.appendChild(s);
}

    /* ===== 时间更新 ===== */
    function qaqUpdateClock() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var display = document.querySelector('.qaq-time-display');
        if (display) display.textContent = h + ':' + (m < 10 ? '0' : '') + m;
    }
    qaqUpdateClock();
    setInterval(qaqUpdateClock, 15000);
    var qaqTokenTotal = parseInt(qaqCacheGet('qaq-token-total', 0), 10) || 0;

function qaqAddTokens(n) {
    if (!n || n <= 0) return;
    qaqTokenTotal += n;
    qaqCacheSet('qaq-token-total', qaqTokenTotal);
    qaqApplyStatusBar();
}

function qaqApplyStatusBar() {
    var s = qaqGetStatusBarSettings();
    var bar = document.getElementById('qaq-status-bar');
    if (!bar) return;
    bar.style.display = s.visible ? '' : 'none';

    // ★ 新增：同步 class 到 phone-frame
    var frame = document.querySelector('.qaq-phone-frame');
    if (frame) {
        frame.classList.toggle('qaq-statusbar-hidden', !s.visible);
    }

    var tokenEl = document.getElementById('qaq-token-display');
    if (tokenEl) {
        if (s.showToken) {
            tokenEl.style.display = '';
            tokenEl.textContent = qaqTokenTotal > 9999
                ? (qaqTokenTotal / 1000).toFixed(1) + 'k'
                : qaqTokenTotal;
        } else {
            tokenEl.style.display = 'none';
        }
    }
}

var qaqBatteryRef = null;

function qaqInitBattery() {
    var s = qaqGetStatusBarSettings();
    if (!s.batteryFollow) return;
    if (!navigator.getBattery) return;

    navigator.getBattery().then(function (battery) {
        qaqBatteryRef = battery;
        function update() {
            var ss = qaqGetStatusBarSettings();
            if (!ss.batteryFollow) return;
            var pct = Math.round(battery.level * 100);
            var fillEl = document.getElementById('qaq-battery-fill');
            if (fillEl) {
                fillEl.setAttribute('width', Math.max(1, Math.round(pct / 100 * 16)));
                fillEl.setAttribute('fill', pct <= 20 ? '#e05565' : (battery.charging ? '#4aaa6a' : '#5ab364'));
            }
        }
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
    }).catch(function () {});
}

function qaqStopBattery() {
    // 简单重置，刷新后重新判断
    var fillEl = document.getElementById('qaq-battery-fill');
    if (fillEl) {
        fillEl.setAttribute('width', '16');
        fillEl.setAttribute('fill', '#5ab364');
    }
}

function qaqRenderStatusBarToggles() {
    var s = qaqGetStatusBarSettings();
    var v = document.getElementById('qaq-sb-visible-toggle');
    var b = document.getElementById('qaq-sb-battery-toggle');
    var t = document.getElementById('qaq-sb-token-toggle');
    if (v) v.classList.toggle('qaq-toggle-on', s.visible);
    if (b) b.classList.toggle('qaq-toggle-on', s.batteryFollow);
    if (t) t.classList.toggle('qaq-toggle-on', s.showToken);
}

// 状态栏设置页打开
document.getElementById('qaq-set-statusbar').addEventListener('click', function () {
    qaqRenderStatusBarToggles();
    qaqSwitchTo(document.getElementById('qaq-sub-statusbar'));
});

document.getElementById('qaq-sb-visible-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.visible = !s.visible;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    qaqApplyStatusBar();
    qaqToast(s.visible ? '状态栏已显示' : '状态栏已隐藏');
});

document.getElementById('qaq-sb-battery-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.batteryFollow = !s.batteryFollow;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    if (s.batteryFollow) {
        qaqInitBattery();
        qaqToast(navigator.getBattery ? '电量跟随已开启' : '当前浏览器不支持 Battery API');
    } else {
        qaqStopBattery();
        qaqToast('电量跟随已关闭');
    }
});

document.getElementById('qaq-sb-token-toggle').parentElement.addEventListener('click', function () {
    var s = qaqGetStatusBarSettings();
    s.showToken = !s.showToken;
    qaqSaveStatusBarSettings(s);
    qaqRenderStatusBarToggles();
    qaqApplyStatusBar();
    qaqToast(s.showToken ? 'Token 显示已开启' : 'Token 显示已关闭');
});

document.getElementById('qaq-sb-token-reset').addEventListener('click', function () {
    qaqConfirm('重置 Token', '确认将 Token 计数清零？', function () {
        qaqTokenTotal = 0;
        qaqCacheSet('qaq-token-total', qaqTokenTotal);
        qaqApplyStatusBar();
        qaqToast('Token 已清零');
    });
});

// 初始化
qaqApplyStatusBar();
qaqInitBattery();

function qaqGet3DSettings() {
    return qaqCacheGet('qaq-3d-settings', {
        askBeforeRender: true,
        defaultRender3D: true
    });
}

function qaqSave3DSettings(settings) {
    qaqCacheSet('qaq-3d-settings', settings || {
        askBeforeRender: true,
        defaultRender3D: true
    });
}

function qaqGet3DModelCache() {
    return qaqCacheGet('qaq-3d-model-cache', {});
}

function qaqSave3DModelCache(data) {
    qaqCacheSet('qaq-3d-model-cache', data || {});
}

function qaqClear3DModelCacheById(itemId) {
    var cache = qaqGet3DModelCache();
    delete cache[itemId];
    qaqCacheSet('qaq-3d-model-cache', cache);
}

function qaqClearAll3DModelCache() {
    qaqCacheSet('qaq-3d-model-cache', {});
}

function qaqMark3DModelLoaded(itemId, data) {
    var cache = qaqGet3DModelCache();
    cache[itemId] = {
        loadedAt: Date.now(),
        modelUrl: qaqGet3DModelUrl(itemId),
        meta: data || {}
    };
    qaqCacheSet('qaq-3d-model-cache', cache);
}

function qaqHas3DModelCache(itemId) {
    var cache = qaqGet3DModelCache();
    return !!cache[itemId];
}

function qaqRefreshXiaoyuanView() {
    if (!qaqXiaoyuanPage) return;
    if (qaqXiaoyuanPage.classList.contains('qaq-page-show')) {
        qaqRenderXiaoyuanMain();
    }
}

    /* ===== 小组件编辑 ===== */
    document.getElementById('qaq-edit-nickname').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑昵称', el.textContent, false, function (val) { el.textContent = val; });
    });
    document.getElementById('qaq-edit-signature').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑个性签名', el.textContent, false, function (val) { el.textContent = val; });
    });
    document.getElementById('qaq-edit-text').addEventListener('click', function () {
        var el = this;
        qaqEditText('编辑正文', el.textContent, true, function (val) { el.textContent = val; });
    });

    var placeholderInput = document.getElementById('qaq-edit-placeholder');
    var pressTimer = null;
    function bindLongPressEdit(inp) {
        pressTimer = setTimeout(function () {
            qaqEditText('编辑占位文字', inp.placeholder, false, function (val) { inp.placeholder = val; });
        }, 600);
    }
    placeholderInput.addEventListener('mousedown', function () { bindLongPressEdit(this); });
    placeholderInput.addEventListener('mouseup', function () { clearTimeout(pressTimer); });
    placeholderInput.addEventListener('touchstart', function () { bindLongPressEdit(this); }, { passive: true });
    placeholderInput.addEventListener('touchend', function () { clearTimeout(pressTimer); });

    document.getElementById('qaq-avatar-btn').addEventListener('click', function () {
        var avatarDiv = this;
        qaqEditImage('更换头像', function (src) {
            avatarDiv.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;">';
        });
    });

    document.querySelectorAll('.qaq-img-square.qaq-clickable-img').forEach(function (el) {
        el.addEventListener('click', function () {
            var imgDiv = this;
            var idx = parseInt(this.dataset.img, 10) + 1;
            qaqEditImage('更换图片 ' + idx, function (src) {
                imgDiv.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:8px;">';
            });
        });
    });

    document.querySelectorAll('.qaq-action-btn').forEach(function (btn) {
        var longTimer = null;
        var isLong = false;

        btn.addEventListener('click', function () {
            if (isLong) { isLong = false; return; }

            var action = this.dataset.action;
            var countEl = this.querySelector('span');
            var count = parseInt(countEl.textContent, 10);

            if (action === 'like') {
                if (this.classList.toggle('qaq-liked')) { count++; qaqToast('已点赞'); } else { count--; qaqToast('取消点赞'); }
            } else if (action === 'collect') {
                if (this.classList.toggle('qaq-collected')) { count++; qaqToast('已收藏'); } else { count--; qaqToast('取消收藏'); }
            } else if (action === 'share') {
                if (this.classList.toggle('qaq-shared')) { count++; qaqToast('已转发'); } else { count--; qaqToast('取消转发'); }
            }
            countEl.textContent = count;
        });

        var span = btn.querySelector('span');
        function openCountEdit(el) {
            var action = btn.dataset.action;
            var labels = { like: '点赞', collect: '收藏', share: '转发' };
            longTimer = setTimeout(function () {
                isLong = true;
                qaqEditText('编辑' + labels[action] + '数量', el.textContent, false, function (val) { el.textContent = val; });
            }, 600);
        }
        span.addEventListener('mousedown', function (e) { e.stopPropagation(); isLong = false; openCountEdit(this); });
        span.addEventListener('mouseup', function () { clearTimeout(longTimer); });
        span.addEventListener('mouseleave', function () { clearTimeout(longTimer); });
        span.addEventListener('touchstart', function (e) { e.stopPropagation(); isLong = false; openCountEdit(this); }, { passive: true });
        span.addEventListener('touchend', function () { clearTimeout(longTimer); });
    });

    /* ===== 评论 ===== */
    var sendBtn = document.querySelector('.qaq-send-btn');
    var commentInput = document.querySelector('.qaq-comment-input');
    if (sendBtn && commentInput) {
        function qaqSendComment() {
            var val = commentInput.value.trim();
            if (!val) return qaqToast('请输入评论内容');
            commentInput.value = '';
            qaqToast('评论已发送');
        }
        sendBtn.addEventListener('click', qaqSendComment);
        commentInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); qaqSendComment(); }
        });
    }

    /* ===== 页面切换管理 ===== */
    var settingsPage = document.getElementById('qaq-settings-page');
    var planPage = document.getElementById('qaq-plan-page');

// ===== 4. 防抖渲染：合并多次渲染请求 =====
var _qaqPendingRenders = {};


// ===== 6. SVG 缓存 =====
// 避免每次渲染都重新拼接 SVG 字符串

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

/* ===== 事件绑定 ===== */
var qaqAppTapLock = false;

document.querySelectorAll('.qaq-app-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (qaqAppTapLock) return;
        qaqAppTapLock = true;

        var name = this.querySelector('.qaq-app-name').textContent;

        if (name === '今日计划') {
            qaqOpenPlanPage();
        } else if (name === '词库') {
            qaqOpenWordbankPage();
        } else {
            qaqToast(name);
        }

        setTimeout(function () {
            qaqAppTapLock = false;
        }, 350);
    });
});

    var appNames = ['聊天', '世界书', '词库', '番茄钟', '自习室', '同桌', '今日计划', '日记', '动物园', '主题商店', '游戏'];

    
    
    /* ===== 设置页 ===== */
    function qaqOpenSettings() { qaqSwitchTo(settingsPage); }
    function qaqCloseSettings() {
    if (qaqPageLock) return;

    var openedSubs = settingsPage.querySelectorAll('.qaq-settings-sub.qaq-page-show');
    if (openedSubs.length) {
        openedSubs.forEach(function (sub) {
            sub.classList.remove('qaq-page-show');
        });
        return;
    }

    qaqClosePage(settingsPage);
}

    document.getElementById('qaq-settings-back').addEventListener('click', function (e) {
        e.stopPropagation();
        qaqCloseSettings();
    });

    document.querySelectorAll('.qaq-settings-sub .qaq-back-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var sub = this.closest('.qaq-settings-sub');
        if (sub) {
            qaqGoBackTo(settingsPage, sub);
        }
    });
});

    document.getElementById('qaq-set-notice').addEventListener('click', function () {
        qaqSwitchTo(document.getElementById('qaq-sub-notice'));
    });

    document.getElementById('qaq-set-api').addEventListener('click', function () {
    var sub = document.getElementById('qaq-sub-api');
    
    // 1. 读取全局 AI 配置
    var saved = JSON.parse(localStorage.getItem('qaq-api-config') || '{}');
    document.getElementById('qaq-api-url').value = saved.url || '';
    document.getElementById('qaq-api-key').value = saved.key || '';
    document.getElementById('qaq-api-model').value = saved.model || '';
    
    // 2. [新增] 读取 MiniMax 语音模型配置
    var reviewCfg = JSON.parse(localStorage.getItem('qaq-word-review-settings') || '{}');
    var minimaxModelSelect = document.getElementById('qaq-setting-minimax-model');
    if (minimaxModelSelect) {
        minimaxModelSelect.value = reviewCfg.minimaxModel || 'speech-02-hd'; 
    }

    qaqSwitchTo(sub);
});

    document.getElementById('qaq-api-save').addEventListener('click', function () {
    // 1. 保存全局 AI 配置
    var config = {
        url: document.getElementById('qaq-api-url').value.trim(),
        key: document.getElementById('qaq-api-key').value.trim(),
        model: document.getElementById('qaq-api-model').value.trim()
    };
    localStorage.setItem('qaq-api-config', JSON.stringify(config));

    // 2. [新增] 保存 MiniMax 语音模型配置
    var reviewCfg = JSON.parse(localStorage.getItem('qaq-word-review-settings') || '{}');
    var minimaxModelSelect = document.getElementById('qaq-setting-minimax-model');
    if (minimaxModelSelect) {
        reviewCfg.minimaxModel = minimaxModelSelect.value;
        localStorage.setItem('qaq-word-review-settings', JSON.stringify(reviewCfg));
    }

    qaqToast('API 及语音配置已保存');
});

    document.getElementById('qaq-set-theme').addEventListener('click', function () {
        qaqSwitchTo(document.getElementById('qaq-sub-theme'));
    });

    var themes = {
        'default': 'linear-gradient(160deg, #f6e9c9 0%, #faebd7 25%, #fce8e2 50%, #fed2e0 75%, #f6e9c9 100%)',
        'cool': 'linear-gradient(160deg, #ebeef3 0%, #f0f2f5 25%, #f3f4f7 50%, #eef0f4 75%, #ebeef3 100%)',
        'dark': 'linear-gradient(160deg, #121212 0%, #1a1a1a 25%, #161616 50%, #1c1c1c 75%, #121212 100%)'
    };

    function qaqApplyTheme(t) {
    var phoneFrame = document.querySelector('.qaq-phone-frame');
    phoneFrame.style.background = themes[t] || themes['default'];
    phoneFrame.classList.remove('qaq-theme-cool', 'qaq-theme-dark');
    if (t === 'cool') phoneFrame.classList.add('qaq-theme-cool');
    if (t === 'dark') phoneFrame.classList.add('qaq-theme-dark');

    var themeColors = {
        'default': '#f6e9c9',
        'cool': '#ebeef3',
        'dark': '#121212'
    };
    var color = themeColors[t] || themes['default'];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', color);
    }

    qaqApplyXiaoyuanThemeClass();
    qaqRefreshXiaoyuanView();
}

    document.querySelectorAll('[data-theme]').forEach(function (item) {
        item.addEventListener('click', function () {
            var t = this.dataset.theme;
            qaqApplyTheme(t);
            localStorage.setItem('qaq-theme', t);
            qaqToast('主题已切换');
        });
    });

    var savedTheme = localStorage.getItem('qaq-theme');
    if (savedTheme && themes[savedTheme]) qaqApplyTheme(savedTheme);

    function qaqApplyHiddenApps() {
        var hidden = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');
        document.querySelectorAll('.qaq-app-item').forEach(function (item) {
            var name = item.querySelector('.qaq-app-name').textContent;
            item.style.display = hidden.indexOf(name) > -1 ? 'none' : '';
        });
    }

    document.getElementById('qaq-set-appmanage').addEventListener('click', function () {
        var sub = document.getElementById('qaq-sub-appmanage');
        qaqSwitchTo(sub);

        var list = document.getElementById('qaq-app-manage-list');
        list.innerHTML = '';
        var hiddenApps = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');

        appNames.forEach(function (name) {
            var isHidden = hiddenApps.indexOf(name) > -1;
            var item = document.createElement('div');
            item.className = 'qaq-settings-item';
            item.innerHTML =
                '<div class="qaq-settings-item-text">' + name + '</div>' +
                '<div class="qaq-toggle' + (isHidden ? '' : ' qaq-toggle-on') + '" data-app-toggle="' + name + '">' +
                '<div class="qaq-toggle-knob"></div></div>';
            list.appendChild(item);
        });

        list.querySelectorAll('.qaq-toggle').forEach(function (toggle) {
            toggle.parentElement.addEventListener('click', function () {
                var t = this.querySelector('.qaq-toggle');
                t.classList.toggle('qaq-toggle-on');

                var appName = t.dataset.appToggle;
                var hidden = JSON.parse(localStorage.getItem('qaq-hidden-apps') || '[]');

                if (t.classList.contains('qaq-toggle-on')) {
                    hidden = hidden.filter(function (n) { return n !== appName; });
                    qaqToast(appName + ' 已显示');
                } else {
                    hidden.push(appName);
                    qaqToast(appName + ' 已隐藏');
                }

                localStorage.setItem('qaq-hidden-apps', JSON.stringify(hidden));
                qaqApplyHiddenApps();
            });
        });
    });

    qaqApplyHiddenApps();

    /* ===== 底部导航 ===== */
    var navItems = document.querySelectorAll('.qaq-nav-item');
    var navLabels = { xiaoyuan: '小院', shop: '商店', game: '游戏', settings: '设置' };
    navItems.forEach(function (item) {
    item.addEventListener('click', function () {
        navItems.forEach(function (n) { n.classList.remove('qaq-nav-active'); });
        this.classList.add('qaq-nav-active');

        //★ 强制解锁，防止之前的页面切换残留锁
        qaqPageLock = false;

        if (this.dataset.nav === 'settings') qaqOpenSettings();
        else if (this.dataset.nav === 'xiaoyuan') qaqOpenXiaoyuanPage();
        else if (this.dataset.nav === 'shop') qaqOpenGlobalShopPage();
        else qaqToast(navLabels[this.dataset.nav] || this.dataset.nav);
    });
});

/* ===== 小院页面 (Tab分类管理与降级引擎) ===== */
var qaqXiaoyuanPage = document.getElementById('qaq-xiaoyuan-page');
var qaqXyCurrentTab = 'plants';

function qaqGetRenderModeLabel(mode){
    var map={
        'static':'2D 静态',
        'lottie':'2D 动态',
        '3d':'3D 模型'
    };
    return map[mode]||mode;
}

function qaqRefreshXiaoyuanSettingTexts() {
    var display=qaqGetXiaoyuanDisplaySettings();
    var scene=qaqGetXiaoyuanSceneSettings();
    var skin=qaqGetCurrentYardSkin();

    var skinText=document.getElementById('qaq-xy-yard-skin-text');
    var plantText=document.getElementById('qaq-xy-plant-mode-text');
    var animalText=document.getElementById('qaq-xy-animal-mode-text');
    var itemText=document.getElementById('qaq-xy-item-mode-text');
    var scaleInput=document.getElementById('qaq-xy-yard-scale');
    var scaleVal=document.getElementById('qaq-xy-yard-scale-val');
    var followToggle=document.getElementById('qaq-xy-follow-scale-toggle');

    if(skinText) skinText.textContent=skin?skin.name:'默认渐变';
    if(plantText) plantText.textContent=qaqGetRenderModeLabel(display.plantMode||'lottie');
    if(animalText) animalText.textContent=qaqGetRenderModeLabel(display.animalMode||'lottie');
    if(itemText) itemText.textContent=qaqGetRenderModeLabel(display.itemMode||'static');
    if(scaleInput) scaleInput.value=Math.round((scene.yardScale||1)*100);
    if(scaleVal) scaleVal.textContent=Math.round((scene.yardScale||1)*100)+'%';
    if(followToggle) followToggle.classList.toggle('qaq-toggle-on',scene.followSceneScale!==false);
}

document.getElementById('qaq-xiaoyuan-settings-btn').addEventListener('click', function () {
    var sub=document.getElementById('qaq-sub-xiaoyuan-settings');

    sub.classList.remove('qaq-theme-dark','qaq-theme-cool');
    if(qaqXiaoyuanPage.classList.contains('qaq-theme-dark')){
        sub.classList.add('qaq-theme-dark');
    }else if(qaqXiaoyuanPage.classList.contains('qaq-theme-cool')){
        sub.classList.add('qaq-theme-cool');
    }

    qaqRefreshXiaoyuanSettingTexts();
    qaqSwitchTo(sub);
});

function qaqOpenXiaoyuanSelectModal(title,list,currentValue,onSelect){
    modalTitle.textContent=title;
    modalBody.innerHTML='<div class="qaq-custom-select-list">'+list.map(function(item){
        var active=item.value===currentValue;
        return '<div class="qaq-custom-select-option'+(active?' qaq-custom-select-active':'')+'" data-value="'+item.value+'"><span>'+item.label+'</span>'+(active?'<span style="color:#c47068;">✓</span>':'')+'</div>';
    }).join('')+'</div>';
    modalBtns.innerHTML='<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
    qaqOpenModal();
    document.getElementById('qaq-modal-cancel').onclick=qaqCloseModal;
    modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function(opt){
        opt.addEventListener('click',function(){
            var val=this.dataset.value;
            onSelect(val);
            qaqCloseModal();
        });
    });
}

document.getElementById('qaq-xy-yard-skin-btn').addEventListener('click',function(){
    var scene=qaqGetXiaoyuanSceneSettings();
    var list=qaqGetYardSkinCatalog().map(function(item){
        return {value:item.id,label:item.name};
    });
    qaqOpenXiaoyuanSelectModal('选择小院皮肤',list,scene.yardSkin||'yard1',function(val){
        qaqSaveXiaoyuanSceneSettings({yardSkin:val});
qaqRefreshXiaoyuanSettingTexts();
qaqApplyXiaoyuanSceneSkin(true);
    });
});

document.getElementById('qaq-xy-plant-mode-btn').addEventListener('click',function(){
    var settings=qaqGetXiaoyuanDisplaySettings();
    qaqOpenXiaoyuanSelectModal('植物渲染方式',[
        {value:'static',label:'2D 静态'},
        {value:'lottie',label:'2D 动态'},
        {value:'3d',label:'3D 模型'}
    ],settings.plantMode||'lottie',function(val){
        settings.plantMode=val;
        qaqSaveXiaoyuanDisplaySettings(settings);
        qaqRefreshXiaoyuanSettingTexts();
    });
});

document.getElementById('qaq-xy-animal-mode-btn').addEventListener('click',function(){
    var settings=qaqGetXiaoyuanDisplaySettings();
    qaqOpenXiaoyuanSelectModal('动物渲染方式',[
        {value:'static',label:'2D 静态'},
        {value:'lottie',label:'2D 动态'},
        {value:'3d',label:'3D 模型'}
    ],settings.animalMode||'lottie',function(val){
        settings.animalMode=val;
        qaqSaveXiaoyuanDisplaySettings(settings);
        qaqRefreshXiaoyuanSettingTexts();
    });
});

document.getElementById('qaq-xy-item-mode-btn').addEventListener('click',function(){
    var settings=qaqGetXiaoyuanDisplaySettings();
    qaqOpenXiaoyuanSelectModal('道具渲染方式',[
        {value:'static',label:'2D 静态'},
        {value:'lottie',label:'2D 动态'},
        {value:'3d',label:'3D 模型'}
    ],settings.itemMode||'static',function(val){
        settings.itemMode=val;
        qaqSaveXiaoyuanDisplaySettings(settings);
        qaqRefreshXiaoyuanSettingTexts();
    });
});


document.getElementById('qaq-xy-yard-scale').addEventListener('input',function(){
    var v=parseInt(this.value,10)||100;
    document.getElementById('qaq-xy-yard-scale-val').textContent=v+'%';
    var scene=qaqGetXiaoyuanSceneSettings();
    scene.yardScale=v/100;
    qaqSaveXiaoyuanSceneSettings(scene);
    qaqApplyXiaoyuanSceneSkin();
    qaqRenderXiaoyuanMain();
});

document.getElementById('qaq-xy-follow-scale-row').addEventListener('click',function(){
    var scene=qaqGetXiaoyuanSceneSettings();
    scene.followSceneScale=!(scene.followSceneScale!==false);
    qaqSaveXiaoyuanSceneSettings(scene);
    qaqRefreshXiaoyuanSettingTexts();
    qaqRenderXiaoyuanMain();
});

document.getElementById('qaq-xiaoyuan-settings-back').addEventListener('click', function (e) {
    e.stopPropagation();
    qaqGoBackTo(qaqXiaoyuanPage, document.getElementById('qaq-sub-xiaoyuan-settings'));
});

document.getElementById('qaq-xy-settings-save-btn').addEventListener('click', function () {
    qaqApplyXiaoyuanSceneSkin(false);
    qaqToast('小院设置已保存');
    qaqGoBackTo(qaqXiaoyuanPage, document.getElementById('qaq-sub-xiaoyuan-settings'));
    setTimeout(qaqRenderXiaoyuanMain,120);
});

setTimeout(function(){
    qaqRefreshXiaoyuanSettingTexts();
    qaqApplyXiaoyuanSceneSkin(false);
},0);

function qaqOpenXiaoyuanPage() {
    qaqApplyXiaoyuanThemeClass();
    qaqApplyXiaoyuanSceneSkin(false);
    qaqSwitchTo(qaqXiaoyuanPage);
    requestAnimationFrame(qaqRenderXiaoyuanMain);
}

document.getElementById('qaq-xiaoyuan-back').addEventListener('click', function () {
    qaqClosePage(qaqXiaoyuanPage);
});

// Tab 切换分类功能
document.querySelectorAll('[data-xy-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('[data-xy-tab]').forEach(function(b){ b.classList.remove('qaq-wordbank-tab-active'); });
        this.classList.add('qaq-wordbank-tab-active');
        qaqXyCurrentTab = this.dataset.xyTab;
        qaqRenderXiaoyuanMain();
    });
});

// 主渲染流
function qaqRenderXiaoyuanMain() {
    var ownedAll = qaqGetOwnedItems() || [];
    var plants = ownedAll.filter(function (x) { return x.type === 'seed'; });
    var animals = ownedAll.filter(function (x) { return x.type === 'animal'; });
    var items = ownedAll.filter(function (x) { return x.type === 'item'; });

    var currentMap = {
        plants: plants,
        animals: animals,
        items: items
    };

    var currentList = currentMap[qaqXyCurrentTab] || [];

    var gridEl=document.getElementById('qaq-xy-main-grid');
var emptyEl=document.getElementById('qaq-xy-main-empty');
var sceneEl=document.getElementById('qaq-xy-main-scene');
var interactBtn=document.getElementById('qaq-xy-interact-all-btn');
var mount=qaqGetXiaoyuanSpriteMount();

if(!gridEl||!emptyEl||!sceneEl||!interactBtn||!mount) return;

gridEl.innerHTML='';

sceneEl.querySelectorAll('.qaq-sprite-container,.qaq-scene-tip').forEach(function(el){
    el.remove();
});
var scaler=sceneEl.querySelector('.qaq-xiaoyuan-scene-scaler');
if(scaler){
    scaler.querySelectorAll('.qaq-sprite-container,.qaq-scene-tip').forEach(function(el){
        el.remove();
    });
}

    // 上方场景：只展示植物和动物
    var sceneItems = plants.concat(animals);
    if(sceneItems.length){
    var tip=document.createElement('div');
    tip.className='qaq-scene-tip';
    tip.textContent='拖动布置位置 · 点击互动';
    mount.appendChild(tip);

    var spacing=(sceneEl.clientWidth||300)/(sceneItems.length+1);

    sceneItems.forEach(function(item,i){
        qaqCreateSpriteInScene(
            mount,
            '',
            spacing*(i+1)-20,
            item.type==='seed'?10:24,
            item.name,
            item.id,
            item.type==='seed'?'plant':'animal'
        );
    });
}

    // 一键按钮
    if (qaqXyCurrentTab === 'plants') {
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
            qaqRenderXiaoyuanMain();
            qaqToast('浇水完成');
        };
    } else if (qaqXyCurrentTab === 'animals') {
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
            qaqRenderXiaoyuanMain();
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
        var isPlant = item.type === 'seed';
        var isAnimal = item.type === 'animal';

        var catList = isPlant
            ? qaqShopCatalog.seeds
            : (isAnimal ? qaqShopCatalog.animals : qaqShopCatalog.items);

        var catItem = catList.find(function (x) { return x.id === item.id; });
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
                (catItem ? catItem.svg.replace(/32/g, '48') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + item.name + '</div>' +
            '<div class="qaq-garden-card-status" style="color:' + statusColor + ';font-weight:600;">' + statusText + '</div>';

        if (isPlant || isAnimal) {
            card.addEventListener('click', function () {
                var targetBox = sceneEl.querySelector('[data-item-id="' + item.id + '"]');
                if (isPlant) {
                    qaqWaterPlant(targetBox || card, item.id);
                } else {
                    qaqPetAnimal(targetBox || card, item.id);
                }
                setTimeout(qaqRenderXiaoyuanMain, 300);
            });
        }

        gridEl.appendChild(card);
    });
}

function qaqCreateSpriteInSceneLegacy(sceneEl, defaultX, defaultY, name, itemId, type) {
    var state = qaqGetSpriteState(itemId);
    var savedX = state.posX != null ? state.posX : defaultX;
    var savedY = state.posY != null ? state.posY : defaultY;
    
    var container = document.createElement('div');
    container.className = 'qaq-sprite-container';
    container.style.left = savedX + 'px';
    container.style.bottom = savedY + 'px';
    container.dataset.itemId = itemId;

    var spriteWrap = document.createElement('div');
    spriteWrap.className = type === 'seed' ? 'qaq-plant-sprite' : 'qaq-animal-sprite';
    if(type === 'animal' && (typeof qaqGetDisplayMode === 'function' ? qaqGetDisplayMode() : 'lottie') !== 'lottie') spriteWrap.classList.add('qaq-walking');
    
    var innerId = 'scene-obj-' + itemId + '-' + Date.now();
    spriteWrap.id = innerId;
    spriteWrap.style.width = '75px';
    spriteWrap.style.height = '75px';

    var nameTag = document.createElement('div');
    nameTag.className = 'qaq-sprite-name';
    nameTag.textContent = name;

    container.appendChild(spriteWrap);
    container.appendChild(nameTag);
    sceneEl.appendChild(container);

    if(typeof qaqRenderVisualToDOM === 'function') {
        qaqRenderVisualToDOM(innerId, itemId, type === 'seed' ? 'plant' : 'animal', 1.0, qaqGetDisplayMode());
    }

    // 拖拽坐标储存
    var isDragging = false, hasMoved = false, startX, startY, initLeft, initBottom, sceneRect;
    
    function onDragStart(e) {
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        initLeft = parseFloat(container.style.left) || 0;
        initBottom = parseFloat(container.style.bottom) || 0;
        sceneRect = sceneEl.getBoundingClientRect();
        isDragging = true;
        hasMoved = false;
        container.style.zIndex = '999';
    }
    function onDragMove(e) {
        if (!isDragging) return;
        var dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
        var dy = (e.touches ? e.touches[0].clientY : e.clientY) - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
        if (hasMoved) {
            if(e.cancelable) e.preventDefault();
            var newLeft = Math.max(-20, Math.min(initLeft + dx, sceneRect.width - 40));
            var newBottom = Math.max(0, Math.min(initBottom - dy, sceneRect.height - 50));
            container.style.left = newLeft + 'px';
            container.style.bottom = newBottom + 'px';
        }
    }
    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        container.style.zIndex = '3';
        if (!hasMoved) {
            if (type === 'seed') qaqWaterPlant(container, itemId);
            else qaqPetAnimal(container, itemId);
        } else {
            state.posX = parseFloat(container.style.left);
            state.posY = parseFloat(container.style.bottom);
            qaqSaveSpriteState(itemId, state);
        }
    }

    container.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove, {passive: false});
    document.addEventListener('mouseup', onDragEnd);
    container.addEventListener('touchstart', onDragStart, {passive: true});
    document.addEventListener('touchmove', onDragMove, {passive: false});
    document.addEventListener('touchend', onDragEnd);
}

/* ===== 全局商店（底部导航入口） ===== */
function qaqOpenGlobalShopPage() {
    qaqShopPageSource = 'global';
    qaqRenderShopPage();
    qaqSwitchTo(document.getElementById('qaq-mine-shop-page'));

    if (!qaqThreeReady && !qaqThreeLoading) {
        setTimeout(function () {
            qaqEnsureThreeJS();
        }, 500);
    }
}

// 商店页返回时回到主页而非词库页
// 需在商店页back按钮处判断来源
var qaqShopPageSource = 'wordbank'; // 'wordbank' | 'global'

document.getElementById('qaq-mine-shop-back').addEventListener('click', function () {
    if (qaqShopPageSource === 'global') {
        qaqClosePage(document.getElementById('qaq-mine-shop-page'));
    } else {
        qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-shop-page'));
        qaqSwitchWordbankTab('mine');
    }
    qaqShopPageSource = 'wordbank';
});
    /* ===== 数据导出导入清除 ===== */

    document.getElementById('qaq-set-clearall').addEventListener('click', function () {
        qaqConfirm('清除所有数据', '此操作不可恢复，确认要清除所有数据吗？', function () {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key.indexOf('qaq') === 0) keys.push(key);
            }
            keys.forEach(function (key) { localStorage.removeItem(key); });
            qaqToast('已清除所有数据');
            setTimeout(function () { location.reload(); }, 1000);
        });
    });

function qaqApplyXiaoyuanThemeClass() {
    var frame = document.querySelector('.qaq-phone-frame');
    var page = document.getElementById('qaq-xiaoyuan-page');
    var sub = document.getElementById('qaq-sub-xiaoyuan-settings');
    if (!frame) return;

    [page, sub].forEach(function (el) {
        if (!el) return;
        el.classList.remove('qaq-theme-dark', 'qaq-theme-cool');
        if (frame.classList.contains('qaq-theme-dark')) {
            el.classList.add('qaq-theme-dark');
        } else if (frame.classList.contains('qaq-theme-cool')) {
            el.classList.add('qaq-theme-cool');
        }
    });
}

/* ===== 我的页面 - 完整重构===== */

function qaqRenderPointDetailPage(appType) {
    var list = qaqGetPointLedger().filter(function(item) {
        return item.app === appType;
    });

    var listEl = document.getElementById(appType === 'shop'
        ? 'qaq-shop-point-detail-list'
        : 'qaq-wordbank-point-detail-list');

    var statsEl = document.getElementById(appType === 'shop'
        ? 'qaq-shop-point-detail-stats'
        : 'qaq-wordbank-point-detail-stats');

    var emptyEl = document.getElementById(appType === 'shop'
        ? 'qaq-shop-point-detail-empty'
        : 'qaq-wordbank-point-detail-empty');

    if (!listEl) return;

    statsEl.textContent = '共 ' + list.length + ' 条';
    listEl.innerHTML = '';

    if (!list.length) {
        emptyEl.style.display = '';
        return;
    }

    emptyEl.style.display = 'none';

    list.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'qaq-point-detail-card';
        card.innerHTML =
            '<div class="qaq-point-detail-title">' + qaqEscapeHtml(item.title || '') + '</div>' +
            '<div class="qaq-point-detail-detail">' + qaqEscapeHtml(item.detail || '') + '</div>' +
            '<div class="qaq-point-detail-points">+' + (item.points || 0) + '</div>';
        listEl.appendChild(card);
    });
}

function qaqGetPointLedger() {
    return qaqCacheGet('qaq-point-ledger', []);
}

function qaqSavePointLedger(list) {
    qaqCacheSet('qaq-point-ledger', list || []);
}

function qaqPushPointLedger(item) {
    var list = qaqGetPointLedger();
    list.unshift(item);
    if (list.length > 300) list = list.slice(0, 300);
    qaqSavePointLedger(list);
}

function qaqGetDailyWordPointProgress() {
    return qaqCacheGet('qaq-daily-word-point-progress', {});
}

function qaqSaveDailyWordPointProgress(data) {
    qaqCacheSet('qaq-daily-word-point-progress', data || {});
}

function qaqRewardWordStudyPoints(bookName, wordCount, durationMinutes) {
    var today = qaqDateKey(new Date());
    var progressAll = qaqGetDailyWordPointProgress();

    if (!progressAll[today]) {
        progressAll[today] = {
            words: 0,
            minutes: 0,
            gained: 0   // 今日已通过背单词获得的积分
        };
    }

    var todayData = progressAll[today];

    todayData.words += Math.max(0, wordCount || 0);
    todayData.minutes += Math.max(0, durationMinutes || 0);

    // 每 10 词 + 15 分钟 = 10 积分
    var wordUnits = Math.floor(todayData.words / 10);
    var timeUnits = Math.floor(todayData.minutes / 15);
    var totalEligiblePoints = Math.min(100, Math.min(wordUnits, timeUnits) * 10);

    var canGain = totalEligiblePoints - (todayData.gained || 0);
    if (canGain > 0) {
        todayData.gained += canGain;
        qaqSavePoints(qaqGetPoints() + canGain);

        // 词库积分明细
        qaqPushPointLedger({
            id: 'pl_' + Date.now() + Math.random().toString(36).slice(2, 6),
            app: 'wordbank',
            source: 'review',
            points: canGain,
            title: qaqFormatDateTime(Date.now()) + ' 背单词所得',
            detail: '词库：' + (bookName || '未知词库') + ' · 累计满足 10词/15分钟 规则',
            createdAt: Date.now()
        });

        // 商店积分明细
        qaqPushPointLedger({
            id: 'pl_' + Date.now() + Math.random().toString(36).slice(2, 6),
            app: 'shop',
            source: 'wordbank',
            points: canGain,
            title: qaqFormatDateTime(Date.now()) + ' 词库APP所得',
            detail: '来源：背单词奖励 · 来自词库APP',
            createdAt: Date.now()
        });

        qaqToast('背单词奖励 +' + canGain + ' 积分');
    }

    qaqSaveDailyWordPointProgress(progressAll);
}

// ---- 积分 ----

function qaqAddPoints(n) {
    if (n <= 0) return;
    qaqSavePoints(qaqGetPoints() + n);
}

// ---- 学习记录 ----
function qaqLogStudySession(bookName, wordCount, durationMinutes) {
    var today = qaqDateKey(new Date());
    var log = qaqGetStudyLog();
    if (!log[today]) log[today] = { words: 0, time: 0, rounds: 0, books: {} };

    log[today].words += wordCount || 0;
    log[today].time += durationMinutes || 0;
    log[today].rounds += 1;

    if (bookName) {
        if (!log[today].books[bookName]) log[today].books[bookName] = 0;
        log[today].books[bookName] += wordCount || 0;
    }

    qaqSaveStudyLog(log);

    // 新积分规则
    qaqRewardWordStudyPoints(bookName, wordCount, durationMinutes);
}

// ---- 收藏分类 ----
function qaqGetFavCategories() {
    return qaqCacheGet('qaq-mine-fav-categories', ['全部', '单词', '句子', '段落']);
}

function qaqSaveFavCategories(cats) {
    qaqCacheSet('qaq-mine-fav-categories', cats || ['全部', '单词', '句子', '段落']);
}

// ---- 商店系统 ----

function qaqGetActivePet() {
    return qaqCacheGet('qaq-mine-active-pet', null);
}

function qaqSaveActivePet(pet) {
    qaqCacheSet('qaq-mine-active-pet', pet || null);
}

var qaqShopCatalog = {
    seeds: [
        { id: 'seed-sunflower', name: '向日葵', price: 30, type: 'seed', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e8c34f" stroke-width="1.5"><circle cx="12" cy="10" r="4"/><path d="M12 14v8" stroke-linecap="round"/><path d="M8 18h8" stroke-linecap="round"/><path d="M12 2v4M7 4l23M17 4l-2 3M4 8l3 1M20 8l-3 1" stroke-linecap="round" opacity="0.6"/></svg>' },
        {
    id: 'seed-rose',
    name: '玫瑰',
    price: 50,
    type: 'seed',
    svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e05565" stroke-width="1.5"><path d="M12 3c-2 2-4 4-4 7 0 4 3 6 4 6s4-2 4-6c0-3-2-5-4-7z" fill="#e05565" stroke-linejoin="round"/><path d="M12 15v7" stroke="#4a7a32" stroke-linecap="round"/><path d="M9 19l3-2 3 2" stroke="#4a7a32" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="9.5" cy="10.5" rx="1.2" ry="0.8" fill="#f3a0aa" opacity="0.5"/></svg>'
},
        { id: 'seed-cactus', name: '仙人掌', price: 20, type: 'seed', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.5"><rect x="9" y="6" width="6" height="14" rx="3" stroke-linejoin="round"/><path d="M9 12H6a2 2 0 01-2-2V8" stroke-linecap="round"/><path d="M15 10h3a2 2 0 002-2V6" stroke-linecap="round"/><line x1="8" y1="20" x2="16" y2="20" stroke-linecap="round"/></svg>' },
    ],
    animals: [
        { id: 'animal-cat', name: '小猫', price: 80, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><path d="M5 9l2-5h2l1 3h4l1-3h2l2 5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="15" rx="7" ry="6"/><circle cx="9" cy="14" r="1" fill="#e88d4f" stroke="none"/><circle cx="15" cy="14" r="1" fill="#e88d4f" stroke="none"/><path d="M10 17s11 2 1 2-1 2-1" stroke-linecap="round"/></svg>' },
        { id: 'animal-dog', name: '小狗', price: 80, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b6cc1" stroke-width="1.5"><path d="M4 10c0-2 1-4 3-4h1l1-3h6l1 3h1c2 0 3 2 3 4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="15" rx="7" ry="6"/><circle cx="9" cy="14" r="1" fill="#8b6cc1" stroke="none"/><circle cx="15" cy="14" r="1" fill="#8b6cc1" stroke="none"/><ellipse cx="12" cy="17" rx="2" ry="1.2" fill="#8b6cc1" stroke="none" opacity="0.3"/></svg>' },
        { id: 'animal-rabbit', name: '兔子', price: 60, type: 'animal', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c47068" stroke-width="1.5"><ellipse cx="9" cy="6" rx="2" ry="5"/><ellipse cx="15" cy="6" rx="2" ry="5"/><circle cx="12" cy="15" r="6"/><circle cx="10" cy="14" r="1" fill="#c47068" stroke="none"/><circle cx="14" cy="14" r="1" fill="#c47068" stroke="none"/><path d="M11 17h2" stroke-linecap="round"/></svg>' },
    ],
    items: [
        { id: 'item-fertilizer', name: '普通肥料', price: 10, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.5"><path d="M12 3v9M8 7l4 54-5" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="14" width="12" height="7" rx="2"/></svg>' },
        { id: 'item-food-basic', name: '基础粮食', price: 15, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><path d="M4 16h16l-2 5H6l-2-5z" stroke-linejoin="round"/><path d="M6 16c0-43-8 6-1032 6 6 6 10" stroke-linejoin="round"/></svg>' },
        { id: 'item-bed', name: '小窝', price: 40, type: 'item', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" stroke-width="1.5"><rect x="2" y="12" width="20" height="8" rx="3"/><path d="M5 12V8a3 3 0 013-3h8a3 3 0 013 3v4" stroke-linejoin="round"/></svg>' },
    ]
};

// ---- 渲染我的页面主面板 ----
function qaqRenderMinePanel() {
    var profile = qaqGetMineProfile();
    var favs = qaqGetReviewFavorites();
    var log = qaqGetStudyLog();
    var today = qaqDateKey(new Date());
    var todayLog = log[today] || { words: 0, time: 0, rounds: 0, books: {} };

    // 头像
    var avatarEl = document.getElementById('qaq-mine-avatar');
    if (profile.avatar) {
        avatarEl.innerHTML = '<img src="' + profile.avatar + '">';
    }

    document.getElementById('qaq-mine-nickname').textContent = profile.nickname || '学习者';
    document.getElementById('qaq-mine-status-text').textContent = profile.status || '学习中';
    document.getElementById('qaq-mine-signature').textContent = profile.signature || '每天进步一点点';

    document.getElementById('qaq-mine-fav-count').textContent = favs.length;
    document.getElementById('qaq-mine-today-words').textContent = '今日 ' + todayLog.words + ' 词';
    document.getElementById('qaq-mine-points-balance').textContent = qaqGetPoints();

    // ★ 更新今日概览（新位置的元素）
    var ovWordsEl = document.getElementById('qaq-mine-ov-words');
    var ovTimeEl = document.getElementById('qaq-mine-ov-time');
    var ovRoundsEl = document.getElementById('qaq-mine-ov-rounds');
    var ovBooksEl = document.getElementById('qaq-mine-ov-books');
    if (ovWordsEl) ovWordsEl.textContent = todayLog.words || 0;
    if (ovTimeEl) ovTimeEl.textContent = todayLog.time || 0;
    if (ovRoundsEl) ovRoundsEl.textContent = todayLog.rounds || 0;
    if (ovBooksEl) ovBooksEl.textContent = Object.keys(todayLog.books || {}).length;

    var owned = qaqGetOwnedItems();
var plantCount = owned.filter(function (x) { return x.type === 'seed'; }).length;
var animalCount = owned.filter(function (x) { return x.type === 'animal'; }).length;

var plantCountEl = document.getElementById('qaq-mine-plant-count');
var animalCountEl = document.getElementById('qaq-mine-animal-count');

if (plantCountEl) plantCountEl.textContent = plantCount + ' 株';
if (animalCountEl) animalCountEl.textContent = animalCount + ' 只';
}

// ---- 用户资料编辑 ----
document.getElementById('qaq-mine-edit-btn').addEventListener('click', function () {
    var profile = qaqGetMineProfile();

    modalTitle.textContent = '编辑资料';
    modalBody.innerHTML =
        '<div class="qaq-plan-form">' +
            '<div class="qaq-plan-form-label">昵称</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-nick" type="text" value="' + (profile.nickname || '').replace(/"/g, '&quot;') + '">' +
            '<div class="qaq-plan-form-label">状态</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-status" type="text" value="' + (profile.status || '').replace(/"/g, '&quot;') +'" placeholder="学习中 / 休息中">' +
            '<div class="qaq-plan-form-label">个性签名</div>' +
            '<input class="qaq-plan-form-input" id="qaq-mine-edit-sig" type="text" value="' + (profile.signature || '').replace(/"/g, '&quot;') + '">' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>' +
        '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-confirm">保存</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
    document.getElementById('qaq-modal-confirm').onclick = function () {
        profile.nickname = document.getElementById('qaq-mine-edit-nick').value.trim() || '学习者';
        profile.status = document.getElementById('qaq-mine-edit-status').value.trim() || '学习中';
        profile.signature = document.getElementById('qaq-mine-edit-sig').value.trim() || '每天进步一点点';
        qaqSaveMineProfile(profile);
        qaqCloseModal();
        qaqRenderMinePanel();qaqToast('资料已更新');
    };
});

document.getElementById('qaq-mine-avatar').addEventListener('click', function () {
    var profile = qaqGetMineProfile();
    qaqEditImage('更换头像', function (src) {
        profile.avatar = src;
        qaqSaveMineProfile(profile);
        document.getElementById('qaq-mine-avatar').innerHTML = '<img src="' + src + '">';
        qaqToast('头像已更新');
    });
});

// ---- 收藏子页面 ----
var qaqMineFavSelectedCat = '全部';

document.getElementById('qaq-mine-fav-header').addEventListener('click', function () {
    qaqMineFavSelectedCat = '全部';
    qaqRenderMineFavPage('');qaqSwitchTo(document.getElementById('qaq-mine-fav-page'));
});

document.getElementById('qaq-mine-fav-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-fav-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-mine-fav-search').addEventListener('input', function () {
    qaqRenderMineFavPage(this.value);
});

document.getElementById('qaq-mine-fav-add-cat-btn').addEventListener('click', function () {
    qaqEditText('新建收藏分类', '', false, function (val) {
        var cats = qaqGetFavCategories();
        if (cats.indexOf(val) > -1) return qaqToast('分类已存在');
        cats.push(val);
        qaqSaveFavCategories(cats);
        qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
        qaqToast('分类已创建');
    });
});

function qaqRenderMineFavPage(keyword) {
    var cats = qaqGetFavCategories();
    var favs = qaqGetReviewFavorites().slice();
    var kw = (keyword || '').trim().toLowerCase();
    var listEl = document.getElementById('qaq-mine-fav-list');
    var catsEl = document.getElementById('qaq-mine-fav-cats');
    var emptyEl = document.getElementById('qaq-mine-fav-empty');

    // 分类标签
    catsEl.innerHTML = '';
    cats.forEach(function (cat) {
        var chip = document.createElement('div');
        chip.className = 'qaq-mine-fav-cat-chip' + (cat === qaqMineFavSelectedCat ? ' qaq-active' : '');
        chip.textContent = cat;
        chip.addEventListener('click', function () {
            qaqMineFavSelectedCat = cat;
            qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
        });
        catsEl.appendChild(chip);
    });

    // 过滤
    var filtered = favs;
    if (qaqMineFavSelectedCat !== '全部') {
        filtered = filtered.filter(function (item) {
            return (item.favCategory || '单词') === qaqMineFavSelectedCat;
        });
    }
    if (kw) {
        filtered = filtered.filter(function (item) {
            return (item.word || '').toLowerCase().indexOf(kw) > -1 ||
                   (item.meaning || '').toLowerCase().indexOf(kw) > -1;
        });
    }

    listEl.innerHTML = '';

    if (!filtered.length) {
        emptyEl.style.display = '';
        return;
    }
    emptyEl.style.display = 'none';

    filtered.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'qaq-mine-fav-card';
        card.innerHTML =
            '<div class="qaq-mine-fav-card-top">' +
                '<div class="qaq-mine-fav-card-word">' + qaqEscapeHtml(item.word || '') + '</div>' +
                '<div class="qaq-mine-fav-card-cat">' + qaqEscapeHtml(item.favCategory || '单词') + '</div>' +
            '</div>' +
            '<div class="qaq-mine-fav-card-meaning">' + qaqEscapeHtml(item.meaning || '') + '</div>' +
            '<div class="qaq-mine-fav-card-meta">' +
                '<span>来自：' + qaqEscapeHtml(item.bookName || '未知') + '</span>' +'</div>' +
            '<div class="qaq-mine-fav-card-actions">' +
                '<button class="qaq-import-ghost-btn" data-fav-move="1" style="font-size:11px;padding:4px 10px;">移动分类</button>' +
                '<button class="qaq-import-ghost-btn" data-fav-del="1" style="font-size:11px;padding:4px 10px;color:#c44;">移除</button>' +
            '</div>';

        card.querySelector('[data-fav-del]').addEventListener('click', function () {
            var favsList = qaqGetReviewFavorites().filter(function (f) {
                return !(f.id === item.id && f.bookId === item.bookId);
            });
            qaqSaveReviewFavorites(favsList);
            qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
            qaqToast('已移除');
        });

        card.querySelector('[data-fav-move]').addEventListener('click', function () {
            var cats2 = qaqGetFavCategories().filter(function (c) { return c !== '全部'; });
            modalTitle.textContent = '选择分类';
            modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
                cats2.map(function (c) {
                    return '<div class="qaq-custom-select-option" data-cat="' + c + '"><span>' + c + '</span></div>';
                }).join('') + '</div>';
            modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
            qaqOpenModal();
            document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
            modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (opt) {
                opt.addEventListener('click', function () {
                    var newCat = this.dataset.cat;
                    var allFavs = qaqGetReviewFavorites();
                    var hit = allFavs.find(function (f) { return f.id === item.id && f.bookId === item.bookId; });
                    if (hit) hit.favCategory = newCat;
                    qaqSaveReviewFavorites(allFavs);
                    qaqCloseModal();
                    qaqRenderMineFavPage(document.getElementById('qaq-mine-fav-search').value);
                    qaqToast('已移至「' + newCat + '」');
                });
            });
        });

        listEl.appendChild(card);
    });
}

// ---- 学习数据子页面 ----
var qaqCalendarYear = new Date().getFullYear();
var qaqCalendarMonth = new Date().getMonth();
var qaqCalendarSelectedDay = '';

document.getElementById('qaq-mine-stats-header').addEventListener('click', function () {
    qaqCalendarYear = new Date().getFullYear();
    qaqCalendarMonth = new Date().getMonth();
    qaqCalendarSelectedDay = '';
    qaqRenderStatsPage();qaqSwitchTo(document.getElementById('qaq-mine-stats-page'));
});

document.getElementById('qaq-mine-points-header').addEventListener('click', function () {
    qaqRenderPointDetailPage('wordbank');
    qaqSwitchTo(document.getElementById('qaq-wordbank-point-detail-page'));
});

document.getElementById('qaq-wordbank-point-detail-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-wordbank-point-detail-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-shop-balance-badge').addEventListener('click', function () {
    qaqRenderPointDetailPage('shop');
    qaqSwitchTo(document.getElementById('qaq-shop-point-detail-page'));
});

document.getElementById('qaq-shop-point-detail-back').addEventListener('click', function () {
    qaqGoBackTo(document.getElementById('qaq-mine-shop-page'), document.getElementById('qaq-shop-point-detail-page'));
});

var mineGardenBack = document.getElementById('qaq-mine-garden-back');
if (mineGardenBack) {
    mineGardenBack.addEventListener('click', function () {
        qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-garden-page'));
        qaqSwitchWordbankTab('mine');
    });
}

var mineZooBack = document.getElementById('qaq-mine-zoo-back');
if (mineZooBack) {
    mineZooBack.addEventListener('click', function () {
        qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-zoo-page'));
        qaqSwitchWordbankTab('mine');
    });
}

document.getElementById('qaq-mine-stats-back').addEventListener('click', function () {
    qaqGoBackTo(wordbankPage, document.getElementById('qaq-mine-stats-page'));
    qaqSwitchWordbankTab('mine');
});

document.getElementById('qaq-calendar-prev').addEventListener('click', function () {
    qaqCalendarMonth--;
    if (qaqCalendarMonth < 0) { qaqCalendarMonth = 11; qaqCalendarYear--; }
    qaqRenderCalendar();
});

document.getElementById('qaq-calendar-next').addEventListener('click', function () {
    qaqCalendarMonth++;
    if (qaqCalendarMonth > 11) { qaqCalendarMonth = 0; qaqCalendarYear++; }
    qaqRenderCalendar();
});

function qaqRenderStatsPage() {
    var log = qaqGetStudyLog();
    var today = qaqDateKey(new Date());

    // ★ 删掉今日overview的DOM操作（元素已从学习数据页删除）

    // 总体
    var totalWords = 0, totalTime = 0, totalDays = 0;
    Object.keys(log).forEach(function (key) {
        totalWords += log[key].words || 0;
        totalTime += log[key].time || 0;
        if (log[key].words > 0) totalDays++;
    });

    // 连续天数
    var streak = 0;
    var d = new Date();
    while (true) {
        var key = qaqDateKey(d);
        if (log[key] && log[key].words > 0) {
            streak++;
            d.setDate(d.getDate() -1);
        } else break;
    }

    document.getElementById('qaq-stats-total-words').textContent = totalWords;
    document.getElementById('qaq-stats-total-time').textContent = totalTime;
    document.getElementById('qaq-stats-total-days').textContent = totalDays;
    document.getElementById('qaq-stats-total-streak').textContent = streak;

    qaqRenderCalendar();
}

function qaqRenderCalendar() {
    var log = qaqGetStudyLog();
    var gridEl = document.getElementById('qaq-calendar-grid');
    var labelEl = document.getElementById('qaq-calendar-month-label');
    var detailEl = document.getElementById('qaq-calendar-day-detail');

    labelEl.textContent = qaqCalendarYear + '年' + (qaqCalendarMonth + 1) + '月';
    detailEl.style.display = 'none';

    var firstDay = new Date(qaqCalendarYear, qaqCalendarMonth, 1).getDay();
    var daysInMonth = new Date(qaqCalendarYear, qaqCalendarMonth + 1, 0).getDate();
    var todayKey = qaqDateKey(new Date());

    // 找出本月最高学习量
    var maxWords = 1;
    for (var i = 1; i <= daysInMonth; i++) {
        var k = qaqCalendarYear + '-' + (qaqCalendarMonth + 1 < 10 ? '0' : '') + (qaqCalendarMonth + 1) + '-' + (i < 10 ? '0' : '') + i;
        if (log[k] && log[k].words > maxWords) maxWords = log[k].words;
    }

    gridEl.innerHTML = '';

    // 空白占位
    for (var e = 0; e < firstDay; e++) {
        var emptyCell = document.createElement('div');
        emptyCell.className = 'qaq-calendar-cell qaq-calendar-empty';
        gridEl.appendChild(emptyCell);
    }

    for (var d = 1; d <= daysInMonth; d++) {
        var key = qaqCalendarYear + '-' + (qaqCalendarMonth + 1 < 10 ? '0' : '') + (qaqCalendarMonth + 1) + '-' + (d < 10 ? '0' : '') + d;
        var dayLog = log[key];
        var words = dayLog ? (dayLog.words || 0) : 0;

        var cell = document.createElement('div');
        cell.className = 'qaq-calendar-cell';
        cell.textContent = d;
        cell.dataset.dateKey = key;

        if (key === todayKey) cell.classList.add('qaq-calendar-today');
        if (key === qaqCalendarSelectedDay) cell.classList.add('qaq-calendar-selected');

        // 热力颜色
        if (words > 0) {
            var ratio = Math.min(words / maxWords, 1);
            if (ratio <= 0.33) cell.style.background = '#f0e4d6';
            else if (ratio <= 0.66) cell.style.background = '#e0c4a8';
            else cell.style.background = '#d4a088';
            cell.style.color = ratio > 0.5 ? '#fff' : '#555';
        } else {
            cell.style.background = 'rgba(0,0,0,0.02)';
        }

        cell.addEventListener('click', function () {
            var dk = this.dataset.dateKey;
            qaqCalendarSelectedDay = dk;
            gridEl.querySelectorAll('.qaq-calendar-cell').forEach(function (c) { c.classList.remove('qaq-calendar-selected'); });
            this.classList.add('qaq-calendar-selected');

            var dl = qaqGetStudyLog()[dk];
            if (dl && dl.words > 0) {
                detailEl.style.display = '';
                document.getElementById('qaq-calendar-detail-title').textContent = qaqFormatDate(dk) + ' 学习概览';
                var html = '学习 ' + dl.words + ' 个单词 · 用时 ' + (dl.time || 0) + ' 分钟 · ' + (dl.rounds || 0) + ' 轮';
                if (dl.books) {
                    html += '<br>';
                    Object.keys(dl.books).forEach(function (name) {
                        html += '<br>' + qaqEscapeHtml(name) + '：' + dl.books[name] + ' 词';
                    });
                }
                document.getElementById('qaq-calendar-detail-body').innerHTML = html;
            } else {
                detailEl.style.display = '';
                document.getElementById('qaq-calendar-detail-title').textContent = qaqFormatDate(dk);
                document.getElementById('qaq-calendar-detail-body').innerHTML = '当天无学习记录';
            }
        });

        gridEl.appendChild(cell);
    }
}

function qaqOpenShopSettingsModal() {
    var settings = qaqGet3DSettings();

    modalTitle.textContent = '商店 3D 设置';
    modalBody.innerHTML =
        '<div class="qaq-settings-group-card" style="padding:10px 12px;">' +
            '<div class="qaq-settings-item" id="qaq-shop-3d-ask-row" style="padding:12px 0;">' +
                '<div class="qaq-settings-item-text">查看详情前询问是否渲染3D</div>' +
                '<div class="qaq-toggle' + (settings.askBeforeRender ? ' qaq-toggle-on' : '') + '" id="qaq-shop-3d-ask-toggle">' +
                    '<div class="qaq-toggle-knob"></div>' +
                '</div>' +
            '</div>' +
            '<div class="qaq-settings-item" id="qaq-shop-3d-default-row" style="padding:12px 0;">' +
                '<div class="qaq-settings-item-text">默认使用3D查看</div>' +
                '<div class="qaq-toggle' + (settings.defaultRender3D ? ' qaq-toggle-on' : '') + '" id="qaq-shop-3d-default-toggle">' +
                    '<div class="qaq-toggle-knob"></div>' +
                '</div>' +
            '</div>' +
            '<div class="qaq-settings-item" id="qaq-shop-clear-current-3d-row" style="padding:12px 0;">' +
                '<div class="qaq-settings-item-text">清除某个物品的3D缓存</div>' +
            '</div>' +
            '<div class="qaq-settings-item" id="qaq-shop-clear-all-3d-row" style="padding:12px 0;">' +
                '<div class="qaq-settings-item-text" style="color:#d9534f;">清除全部3D缓存</div>' +
            '</div>' +
        '</div>';

    modalBtns.innerHTML =
        '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';

    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    document.getElementById('qaq-shop-3d-ask-row').onclick = function () {
        settings.askBeforeRender = !settings.askBeforeRender;
        qaqSave3DSettings(settings);
        document.getElementById('qaq-shop-3d-ask-toggle').classList.toggle('qaq-toggle-on', settings.askBeforeRender);
    };

    document.getElementById('qaq-shop-3d-default-row').onclick = function () {
        settings.defaultRender3D = !settings.defaultRender3D;
        qaqSave3DSettings(settings);
        document.getElementById('qaq-shop-3d-default-toggle').classList.toggle('qaq-toggle-on', settings.defaultRender3D);
    };

    document.getElementById('qaq-shop-clear-current-3d-row').onclick = function () {
        qaqOpenClearSingle3DCacheModal();
    };

    document.getElementById('qaq-shop-clear-all-3d-row').onclick = function () {
        qaqConfirm('清除全部3D缓存', '确认清除所有物品的3D缓存记录吗？', function () {
            qaqClearAll3DModelCache();
            qaqToast('已清除全部3D缓存');
        });
    };
}

function qaqOpenClearSingle3DCacheModal() {
    var allItems = qaqShopCatalog.seeds.concat(qaqShopCatalog.animals, qaqShopCatalog.items);
    var cache = qaqGet3DModelCache();
    var list = allItems.filter(function (item) {
        return !!cache[item.id];
    });

    modalTitle.textContent = '清除单个3D缓存';

    if (!list.length) {
        modalBody.innerHTML = '<div style="text-align:center;font-size:13px;color:#999;line-height:1.8;">当前没有可清除的3D缓存</div>';
        modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
        qaqOpenModal();
        document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;
        return;
    }

    modalBody.innerHTML =
        '<div class="qaq-custom-select-list">' +
        list.map(function (item) {
            return '<div class="qaq-custom-select-option" data-clear-3d-id="' + item.id + '">' +
                '<span>' + qaqEscapeHtml(item.name) + '</span>' +
                '<span style="font-size:11px;color:#999;">已缓存</span>' +
            '</div>';
        }).join('') +
        '</div>';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    modalBody.querySelectorAll('[data-clear-3d-id]').forEach(function (el) {
        el.addEventListener('click', function () {
            var itemId = this.dataset.clear3dId;
            qaqClear3DModelCacheById(itemId);
            qaqToast('已清除该物品3D缓存');
            qaqCloseModal();
        });
    });
}

document.getElementById('qaq-shop-settings-btn').addEventListener('click', function () {
    qaqOpenShopSettingsModal();
});

function qaqRenderShopPage() {
    var owned = qaqGetOwnedItems();
    var ownedIds = owned.map(function (x) { return x.id; });
    var points = qaqGetPoints();

    document.getElementById('qaq-shop-balance').textContent = points;

    function renderGrid(gridId, items) {
        var gridEl = document.getElementById(gridId);
        gridEl.innerHTML = '';
        items.forEach(function (item) {
            var isOwned = ownedIds.indexOf(item.id) > -1;
            var card = document.createElement('div');
            card.className = 'qaq-shop-card' + (isOwned ? ' qaq-shop-owned' : '');

            var iconHtml = '';
            if (qaqPlantSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-plant-sprite">' + qaqPlantSVGs[item.id](0.6) + '</div>';
            } else if (qaqAnimalSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-animal-sprite">' + qaqAnimalSVGs[item.id](0.7) + '</div>';
            } else if (qaqItemSVGs[item.id]) {
                iconHtml = '<div class="qaq-shop-card-icon qaq-item-sprite">' + qaqItemSVGs[item.id](0.7) + '</div>';
            } else {
                iconHtml = '<div class="qaq-shop-card-icon">' + item.svg + '</div>';
            }

            card.innerHTML =
                iconHtml +
                '<div class="qaq-shop-card-name">' + item.name + '</div>' +
                (isOwned
                    ? '<div class="qaq-shop-card-owned">已拥有</div>'
                    : '<div class="qaq-shop-card-price">' + item.price + ' 积分</div>') +
                '<button class="qaq-shop-detail-btn" data-detail-id="' + item.id + '">查看详情</button>';

            // 购买点击（点卡片非按钮区域）
            card.addEventListener('click', function (e) {
    if (e.target.closest('.qaq-shop-detail-btn')) return;
    if (isOwned) return qaqToast('已拥有该物品');

    qaqConfirm('确认兑换', '花费 ' + item.price + ' 积分兑换「' + item.name + '」？', function () {
        try {
            var latestPoints = qaqGetPoints();
            if (latestPoints < item.price) {
                return qaqToast('积分不足');
            }

            var ownedList = qaqGetOwnedItems() || [];

            // 防重复购买
            if (ownedList.some(function (x) { return x.id === item.id; })) {
                qaqToast('已拥有该物品');
                qaqRenderShopPage();
                return;
            }

            ownedList.push({
                id: item.id,
                name: item.name,
                type: item.type,
                obtainedAt: Date.now()
            });

            // 先保存拥有物品，再扣积分
            qaqSaveOwnedItems(ownedList);
            qaqSavePoints(latestPoints - item.price);

            // 刷新所有相关页面
            qaqRenderShopPage();
            qaqRenderMinePanel();
            if (typeof qaqRenderGardenPage === 'function') qaqRenderGardenPage();
            if (typeof qaqRenderZooPage === 'function') qaqRenderZooPage();
            if (typeof qaqRenderXiaoyuanGarden === 'function') qaqRenderXiaoyuanGarden();
            if (typeof qaqRenderXiaoyuanZoo === 'function') qaqRenderXiaoyuanZoo();

            qaqToast('兑换成功');
        } catch (err) {
            console.error('购买失败：', err);
            qaqToast('购买失败：' + (err.message || '未知错误'));
        }
    });
});

            gridEl.appendChild(card);
        });

        //绑定「查看详情」
        gridEl.querySelectorAll('.qaq-shop-detail-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = this.dataset.detailId;
                qaqOpenShopItemDetail(id);
            });
        });
    }

    renderGrid('qaq-shop-seeds-grid', qaqShopCatalog.seeds);
    renderGrid('qaq-shop-animals-grid', qaqShopCatalog.animals);
    renderGrid('qaq-shop-items-grid', qaqShopCatalog.items);
    qaqSwitchShopTab(qaqCurrentShopTab || 'seeds');
}

/*===== Three.js 懒加载 ===== */
var qaqThreeReady = false;
var qaqThreeLoading = false;
var qaqThreeCallbacks = [];

function qaqEnsureThreeJS(onProgress, callback) {
    if (qaqThreeReady) { if (callback) callback(); return; }
    if (callback) qaqThreeCallbacks.push(callback);
    if (qaqThreeLoading) return;
    qaqThreeLoading = true;

    var scripts = [
    'https://cdn.jsdelivr.net/npm/three@0.142.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/loaders/GLTFLoader.js'
];
    var loaded = 0;
    var total = scripts.length;

    function loadNext() {
        if (loaded >= total) {
            qaqThreeReady = true;
            qaqThreeLoading = false;
            if (onProgress) onProgress(100);
            qaqThreeCallbacks.forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } });
            qaqThreeCallbacks = [];
            return;
        }
        var s = document.createElement('script');
        s.src = scripts[loaded];
        s.onload = function () {
            loaded++;
            if (onProgress) onProgress(Math.round((loaded / total) * 90));
            loadNext();
        };
        s.onerror = function () {
            console.error('Failed to load: ' + scripts[loaded]);
            loaded++;
            loadNext();
        };
        document.head.appendChild(s);
    }

    if (onProgress) onProgress(5);
    loadNext();
}

function qaqGet3DModelUrl(itemId) {
    var map = {
        'animal-dog': 'assets/models/dog1.glb',
        'animal-cat': 'assets/models/cat1.glb',
        'animal-rabbit': 'assets/models/rabbit1.glb',
        'seed-rose': 'assets/models/rose1.glb'
    };
    return map[itemId] || '';
}

function qaq3DLoadGLB(item, group) {
    return new Promise(function(resolve, reject) {
        var url = qaqGet3DModelUrl(item.id);
        if (!url) return reject(new Error('没有配置模型路径'));

        if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
            return reject(new Error('GLTFLoader 未加载'));
        }

        var loader = new THREE.GLTFLoader();

        loader.load(
            url,
            function(gltf) {
                var model = gltf.scene;
                if (!model) return reject(new Error('模型为空'));

                var box = new THREE.Box3().setFromObject(model);
var size = new THREE.Vector3();
var center = new THREE.Vector3();
box.getSize(size);
box.getCenter(center);

// 先居中
model.position.sub(center);

// 缩放到合适大小
var maxDim = Math.max(size.x, size.y, size.z) || 1;
var scale = 1.7 / maxDim;
model.scale.setScalar(scale);

// 重新计算缩放后的包围盒
var scaledBox = new THREE.Box3().setFromObject(model);
var minY = scaledBox.min.y;

// 让模型“落地”
model.position.y -= minY;

// 再轻微抬高一点，避免和底盘穿插
model.position.y += 0.02;

                model.traverse(function(obj) {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;

                        if (obj.material) {
                            if (obj.material.roughness == null) obj.material.roughness = 0.8;
                            if (obj.material.metalness == null) obj.material.metalness = 0.05;
                        }
                    }
                });

                group.add(model);
qaqMark3DModelLoaded(item.id, {
    type: item.type || '',
    name: item.name || ''
});
resolve(model);
            },
            undefined,
            function(err) {
                reject(err);
            }
        );
    });
}

/* ===== 3D 设置与缓存 ===== */
function qaqGetPetSettings() {
    return qaqCacheGet('qaq-pet-settings', {
        use3D: false
    });
}

function qaqSavePetSettings(data) {
    qaqCacheSet('qaq-pet-settings', data || { use3D: false });
}

function qaqGet3DSettings() {
    return qaqCacheGet('qaq-3d-settings', {
        askBeforeRender: true,   // 查看详情前是否询问
        defaultRender3D: true    // 默认是否渲染3D
    });
}

function qaqSave3DSettings(settings) {
    qaqCacheSet('qaq-3d-settings', settings || {});
}

function qaqGet3DModelCache() {
    return qaqCacheGet('qaq-3d-model-cache', {});
}

function qaqSave3DModelCache(data) {
    qaqCacheSet('qaq-3d-model-cache', data || {});
}

function qaqClear3DModelCacheById(itemId) {
    var cache = qaqGet3DModelCache();
    delete cache[itemId];
    qaqSave3DModelCache(cache);
}

function qaqClearAll3DModelCache() {
    qaqSave3DModelCache({});
}

function qaqMark3DModelLoaded(itemId, data) {
    var cache = qaqGet3DModelCache();
    cache[itemId] = {
        loadedAt: Date.now(),
        modelUrl: qaqGet3DModelUrl(itemId),
        meta: data || {}
    };
    qaqSave3DModelCache(cache);
}

function qaqHas3DModelCache(itemId) {
    var cache = qaqGet3DModelCache();
    return !!cache[itemId];
}

/* ===== Three.js 3D 状态 ===== */
var qaq3D = {
    renderer: null, scene: null, camera: null, controls: null,
    animId: null, mainGroup: null, clock: null, particles: null, destroyed: false
};

function qaq3DPreviewDestroy() {
    qaq3D.destroyed = true;
    if (qaq3D.animId) { cancelAnimationFrame(qaq3D.animId); qaq3D.animId = null; }
    if (qaq3D.controls) { qaq3D.controls.dispose(); qaq3D.controls = null; }
    if (qaq3D.renderer) { qaq3D.renderer.dispose(); qaq3D.renderer.domElement.remove(); qaq3D.renderer = null; }
    qaq3D.scene = null; qaq3D.camera = null; qaq3D.mainGroup = null;
    qaq3D.clock = null; qaq3D.particles = null;
}

/* ===== 修复版：强制读取 DOM 和 window 方法，带防崩溃 ===== */

function qaqOpenShopItemDetail2D(item, isOwned, typeName) {
    try {
        var mTitle = document.getElementById('qaq-modal-title');
        var mBody = document.getElementById('qaq-modal-body');
        var mBtns = document.getElementById('qaq-modal-btns');

        if(mTitle) mTitle.textContent = item.name;
        if(mBody) mBody.innerHTML =
            '<div class="qaq-shop-detail-modal">' +
                '<div class="qaq-shop-detail-stage" style="height:180px;display:flex;align-items:center;justify-content:center;">' +
                    '<div class="qaq-detail-preview">' +
                        (qaqPlantSVGs[item.id]
                            ? qaqPlantSVGs[item.id](1.8)
                            : (qaqAnimalSVGs[item.id]
                                ? qaqAnimalSVGs[item.id](1.8)
                                : (qaqItemSVGs[item.id]
                                    ? qaqItemSVGs[item.id](1.8)
                                    : (item.svg || '')))) +
                    '</div>' +
                '</div>' +
                '<div class="qaq-shop-detail-info">' +
                    '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">类型</span><span>' + typeName + '</span></div>' +
                    '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">价格</span><span style="color:#e8c34f;font-weight:600;">' + item.price + ' 积分</span></div>' +
                    '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">状态</span><span style="color:' + (isOwned ? '#7bab6e' : '#999') + ';">' + (isOwned ? '已拥有' : '未拥有') + '</span></div>' +
                    '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">展示模式</span><span>普通展示</span></div>' +
                '</div>' +
            '</div>';

        if (mBtns) {
            if (isOwned) {
                mBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel" style="flex:1;">关闭</button>';
            } else {
                mBtns.innerHTML =
                    '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>' +
                    '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-shop-detail-buy">兑换</button>';
            }
        }

        if(window.qaqOpenModal) window.qaqOpenModal();

        var mCancel = document.getElementById('qaq-modal-cancel');
        if(mCancel && window.qaqCloseModal) mCancel.onclick = window.qaqCloseModal;

        var buyBtn = document.getElementById('qaq-shop-detail-buy');
        if (buyBtn) {
            buyBtn.onclick = function () {
                try {
                    var points = window.qaqGetPoints ? window.qaqGetPoints() : qaqGetPoints();
                    if (points < item.price) return window.qaqToast ? window.qaqToast('积分不足') : null;

                    var ownedList = window.qaqGetOwnedItems ? window.qaqGetOwnedItems() : (qaqGetOwnedItems() || []);
                    if (ownedList.some(function (x) { return x.id === item.id; })) {
                        if(window.qaqCloseModal) window.qaqCloseModal();
                        return window.qaqToast ? window.qaqToast('已拥有该物品') : null;
                    }

                    ownedList.push({
                        id: item.id,
                        name: item.name,
                        type: item.type,
                        obtainedAt: Date.now()
                    });

                    if(window.qaqSaveOwnedItems) window.qaqSaveOwnedItems(ownedList);
                    if(window.qaqSavePoints) window.qaqSavePoints(points - item.price);

                    if(window.qaqCloseModal) window.qaqCloseModal();
                    qaqRenderShopPage();
                    qaqRenderMinePanel();
                    if (typeof qaqRenderGardenPage === 'function') qaqRenderGardenPage();
                    if (typeof qaqRenderZooPage === 'function') qaqRenderZooPage();
                    if (typeof qaqRenderXiaoyuanGarden === 'function') qaqRenderXiaoyuanGarden();
                    if (typeof qaqRenderXiaoyuanZoo === 'function') qaqRenderXiaoyuanZoo();

                    if(window.qaqToast) window.qaqToast('兑换成功');
                } catch (err) {
                    console.error(err);
                    if(window.qaqToast) window.qaqToast('购买失败：' + (err.message || '未知错误'));
                }
            };
        }
    } catch (e) {
        console.error("2D弹窗报错:", e);
        if(window.qaqToast) window.qaqToast("商店弹窗初始化失败，请查看控制台");
    }
}

function qaqOpenShopItemDetail3DWithLazyLoad(item, isOwned, typeName) {
    if (!qaqThreeReady) {
        var mTitle = document.getElementById('qaq-modal-title');
        var mBody = document.getElementById('qaq-modal-body');
        var mBtns = document.getElementById('qaq-modal-btns');

        if(mTitle) mTitle.textContent = '加载 3D 引擎';
        if(mBody) mBody.innerHTML =
            '<div style="text-align:center;">' +
                '<div style="font-size:13px;color:#888;margin-bottom:12px;">正在下载 3D 渲染模块…</div>' +
                '<div class="qaq-import-progress-bar" style="margin:0 auto;width:80%;">' +
                    '<div class="qaq-import-progress-fill" id="qaq-3d-load-fill" style="width:0%;"></div>' +
                '</div>' +
                '<div id="qaq-3d-load-text" style="font-size:11px;color:#aaa;margin-top:8px;">0%</div>' +
            '</div>';
        if(mBtns) mBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
        
        if(window.qaqOpenModal) window.qaqOpenModal();

        var cancelBtn = document.getElementById('qaq-modal-cancel');
        if(cancelBtn) cancelBtn.onclick = function () {
            if(window.qaqCloseModal) window.qaqCloseModal();
        };

        qaqEnsureThreeJS(
            function (pct) {
                var fill = document.getElementById('qaq-3d-load-fill');
                var text = document.getElementById('qaq-3d-load-text');
                if (fill) fill.style.width = pct + '%';
                if (text) text.textContent = pct + '%';
            },
            function () {
                if(window.qaqCloseModal) window.qaqCloseModal();
                setTimeout(function () {
                    qaqOpenShopItemDetail3D(item, isOwned, typeName);
                }, 160);
            }
        );
        return;
    }

    qaqOpenShopItemDetail3D(item, isOwned, typeName);
}

function qaqOpenShopItemDetail(itemId) {
    try {
        var allItems = qaqShopCatalog.seeds.concat(qaqShopCatalog.animals, qaqShopCatalog.items);
        var item = allItems.find(function (x) { return x.id === itemId; });
        if (!item) return;

        var owned = window.qaqGetOwnedItems ? window.qaqGetOwnedItems() : (qaqGetOwnedItems() || []);
        var isOwned = owned.some(function (x) { return x.id === itemId; });
        var typeNames = { seed: '种子', animal: '动物', item: '道具' };
        var typeName = typeNames[item.type] || '物品';

        var settings = qaqGet3DSettings();

        function open2DDetail() {
            qaqOpenShopItemDetail2D(item, isOwned, typeName);
        }

        function open3DDetail() {
            qaqOpenShopItemDetail3DWithLazyLoad(item, isOwned, typeName);
        }

        if (!settings.askBeforeRender) {
            if (settings.defaultRender3D) open3DDetail();
            else open2DDetail();
            return;
        }

        var mTitle = document.getElementById('qaq-modal-title');
        var mBody = document.getElementById('qaq-modal-body');
        var mBtns = document.getElementById('qaq-modal-btns');

        // 安全的 escape HTML
        var safeItemName = window.qaqEscapeHtml ? window.qaqEscapeHtml(item.name) : item.name.replace(/</g, "&lt;");

        if(mTitle) mTitle.textContent = '选择查看方式';

// 🌟 神级重构：不要把大选项全塞进底部的 mBtns，要塞进宽敞的 mBody 里！
// 而且直接复用你写好的巨好看的 import-mode 类名，这绝对最搭主题！
if(mBody) mBody.innerHTML =
    '<div style="text-align:center;font-size:13px;color:#666;line-height:1.6;margin-bottom:16px;">' +
        '您想以哪种引擎欣赏「<b>' + safeItemName + '</b>」？<br>' +
        '<span style="font-size:10px;color:#999;">如果未加载高级资源将自动降级为静态插画</span>' +
    '</div>' +
    '<div class="qaq-import-mode-list">' +
        '<div class="qaq-import-mode-item" id="qaq-shop-force-static">' +
            '<div class="qaq-import-mode-title">2D 静态插画</div>' +
            '<div class="qaq-import-mode-desc">一张精致的高清贴图。</div>' +
        '</div>' +
        '<div class="qaq-import-mode-item" id="qaq-shop-force-lottie" style="position:relative;">' +
            '<div class="qaq-import-mode-title">2D 骨骼动画</div>' +
            '<div class="qaq-import-mode-desc">享受顺滑的手绘画风和自然呼吸动作。</div>' +
            '<span class="qaq-import-mode-badge" style="position:absolute; right:14px; top:14px;">推荐</span>' +
        '</div>' +
        '<div class="qaq-import-mode-item" id="qaq-shop-force-3d">' +
            '<div class="qaq-import-mode-title">3D 立体模型</div>' +
            '<div class="qaq-import-mode-desc">最高画质全角度查看，可能有微小加载延迟。</div>' +
        '</div>' +
    '</div>';

// 底部乖乖只放一个取消按钮
if(mBtns) mBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';

if(window.qaqOpenModal) window.qaqOpenModal();
var closeBtn = document.getElementById('qaq-modal-cancel');
if(closeBtn && window.qaqCloseModal) closeBtn.onclick = window.qaqCloseModal;

// 绑定静态SVG逻辑
var btnStatic = document.getElementById('qaq-shop-force-static');
if(btnStatic) btnStatic.onclick = function () {
    if(window.qaqCloseModal) window.qaqCloseModal();
    setTimeout(function(){ qaqOpenShopItemDetail2D(item, isOwned, typeName); }, 120);
};

// 绑定动态Lottie逻辑
var btnLottie = document.getElementById('qaq-shop-force-lottie');
if(btnLottie) btnLottie.onclick = function () {
    if(window.qaqCloseModal) window.qaqCloseModal();
    setTimeout(function(){
        // 1. 先搭好 2D 详情页的框架
        qaqOpenShopItemDetail2D(item, isOwned, typeName);
        
        // 2. 保证加载引擎，然后极其暴力地替换内容
        qaqEnsureLottie(function(){
            var previewBox = document.querySelector('.qaq-detail-preview');
            if(previewBox) {
                // 🌟 终极锁死法：绕过万能渲染器，直接把死尺寸带有 !important 的写在它自己的标签上！
                previewBox.innerHTML = 
                    '<lottie-player ' +
                    'src="' + window.qaqLotties[item.id] + '" ' +
                    'background="transparent" speed="1" ' +
                    'style="width: 110px !important; height: 110px !important; margin: 0 auto; display: block; pointer-events: none;" ' +
                    'loop autoplay>' +
                    '</lottie-player>';
            }
        });
    }, 120);
};

// 绑定3D模型逻辑
var btn3D = document.getElementById('qaq-shop-force-3d');
if(btn3D) btn3D.onclick = function () {
    if(window.qaqCloseModal) window.qaqCloseModal();
    setTimeout(function(){ qaqOpenShopItemDetail3DWithLazyLoad(item, isOwned, typeName); }, 120);
};
    } catch(e) {
        console.error("整体点击查看详情时崩溃:", e);
    }
}

function qaqOpenShopItemDetail3D(item, isOwned, typeName) {
    var mTitle = document.getElementById('qaq-modal-title');
    var mBody = document.getElementById('qaq-modal-body');
    var mBtns = document.getElementById('qaq-modal-btns');

    if(mTitle) mTitle.textContent = item.name;
    if(mBody) mBody.innerHTML =
        '<div class="qaq-shop-detail-modal">' +
            '<div class="qaq-shop-detail-stage qaq-3d-stage" id="qaq-3d-stage">' +
                '<canvas id="qaq-3d-canvas"></canvas>' +
                '<div class="qaq-3d-hint">拖动旋转 ·滚轮缩放 · 点击互动</div>' +
            '</div>' +
            '<div class="qaq-shop-detail-info">' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">类型</span><span>' + typeName + '</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">价格</span><span style="color:#e8c34f;font-weight:600;">' + item.price + ' 积分</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">状态</span><span style="color:' + (isOwned ? '#7bab6e' : '#999') + ';">' + (isOwned ? '已拥有' : '未拥有') + '</span></div>' +
                '<div class="qaq-shop-detail-row"><span class="qaq-shop-detail-label">3D缓存</span><span>' + (qaqHas3DModelCache(item.id) ? '已缓存' : '未缓存') + '</span></div>' +
            '</div>' +
        '</div>';

    if(mBtns) {
        if (isOwned) {
            mBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-modal-cancel" style="flex:1;">关闭</button>';
        } else {
            mBtns.innerHTML =
                '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>' +
                '<button class="qaq-modal-btn qaq-modal-btn-confirm" id="qaq-shop-detail-buy">兑换</button>';
        }
    }

    if(window.qaqOpenModal) window.qaqOpenModal();

    setTimeout(function () { qaq3DInit(item); }, 150);

    var cancelBtn = document.getElementById('qaq-modal-cancel');
    if(cancelBtn) cancelBtn.onclick = function () {
        qaq3DPreviewDestroy(); 
        if(window.qaqCloseModal) window.qaqCloseModal();
    };

    var buyBtn = document.getElementById('qaq-shop-detail-buy');
    if (buyBtn) {
        buyBtn.onclick = function () {
            try {
                var points = window.qaqGetPoints ? window.qaqGetPoints() : qaqGetPoints();
                if (points < item.price) return window.qaqToast ? window.qaqToast('积分不足') : null;

                var ownedList = window.qaqGetOwnedItems ? window.qaqGetOwnedItems() : (qaqGetOwnedItems() || []);

                if (ownedList.some(function (x) { return x.id === item.id; })) {
                    qaq3DPreviewDestroy();
                    if(window.qaqCloseModal) window.qaqCloseModal();
                    return window.qaqToast ? window.qaqToast('已拥有该物品') : null;
                }

                ownedList.push({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    obtainedAt: Date.now()
                });

                if(window.qaqSaveOwnedItems) window.qaqSaveOwnedItems(ownedList);
                if(window.qaqSavePoints) window.qaqSavePoints(points - item.price);

                qaq3DPreviewDestroy();
                if(window.qaqCloseModal) window.qaqCloseModal();

                qaqRenderShopPage();
                qaqRenderMinePanel();
                if (typeof qaqRenderGardenPage === 'function') qaqRenderGardenPage();
                if (typeof qaqRenderZooPage === 'function') qaqRenderZooPage();
                if (typeof qaqRenderXiaoyuanGarden === 'function') qaqRenderXiaoyuanGarden();
                if (typeof qaqRenderXiaoyuanZoo === 'function') qaqRenderXiaoyuanZoo();

                if(window.qaqToast) window.qaqToast('兑换成功');
            } catch (err) {
                console.error('详情页购买失败：', err);
                if(window.qaqToast) window.qaqToast('购买失败：' + (err.message || '未知错误'));
            }
        };
    }
}

/* ===== Three.js 3D 场景初始化 ===== */
async function qaq3DInit(item) {
    qaq3DPreviewDestroy();
    qaq3D.destroyed = false;

    var canvas = document.getElementById('qaq-3d-canvas');
    var container = document.getElementById('qaq-3d-stage');
    if (!canvas || !container) {
        console.error('[3D] canvas或 container 不存在');
        return;
    }

    if (typeof THREE === 'undefined') {
        console.error('[3D] THREE 未定义');
        return;
    }

    try {
        var w = container.clientWidth || 280;
        var h = container.clientHeight || 220;
        var isDark = document.querySelector('.qaq-phone-frame').classList.contains('qaq-theme-dark');

        //----渲染器 ----
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (renderer.toneMapping !== undefined) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        qaq3D.renderer = renderer;

        // ---- 场景 ----
        var scene = new THREE.Scene();
        qaq3D.scene = scene;

        // ---- 相机 ----
        var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.set(0, 1.35, 4.2);
camera.lookAt(0, 1.0, 0);
        qaq3D.camera = camera;

        // ---- 控制器（容错） ----
        var controls = null;
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.0;
            controls.minDistance = 2.5;
            controls.maxDistance = 8;
            controls.maxPolarAngle = Math.PI * 0.58;
            controls.minPolarAngle = Math.PI * 0.2;
            controls.target.set(0, 1.0, 0);
            controls.update();
        } else {
            console.warn('[3D] OrbitControls 未加载，跳过控制器');
        }
        qaq3D.controls = controls;

        qaq3D.clock = new THREE.Clock();

        // ---- 灯光 ----
        scene.add(new THREE.AmbientLight(isDark ? 0x334455 : 0x8899aa, 0.8));
        var dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(3, 5, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(512, 512);
        if (dirLight.shadow.radius !== undefined) dirLight.shadow.radius = 4;
        scene.add(dirLight);

        var fillLight = new THREE.DirectionalLight(isDark ? 0x445566 : 0xffeedd, 0.4);
        fillLight.position.set(-2, 3, -2);
        scene.add(fillLight);

        var rim = new THREE.PointLight(0x88aaff, 0.6, 10);
        rim.position.set(-2, 2, -3);
        scene.add(rim);

        // ---- 地面 ----
        var ground = new THREE.Mesh(
            new THREE.CircleGeometry(3, 64),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x222222 : 0xddccbb, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.12;
        ground.receiveShadow = true;
        scene.add(ground);

        // ---- 主模型 ----
        var mainGroup = new THREE.Group();
        scene.add(mainGroup);
        qaq3D.mainGroup = mainGroup;

        try {
    await qaq3DBuild(item, mainGroup, isDark);
} catch (buildErr) {
    console.error('[3D] 模型构建失败:', buildErr);
    var fallbackMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xc47068, roughness: 0.3, metalness: 0.5 })
    );
    fallbackMesh.position.y = 0.8;
    fallbackMesh.castShadow = true;
    mainGroup.add(fallbackMesh);
}

        // ---- 粒子 ----
        try {
            qaq3DParticles(scene, item.type, isDark);
        } catch (partErr) {
            console.warn('[3D] 粒子创建失败:', partErr);
        }

        // ---- 点击交互 ----
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        canvas.addEventListener('click', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            if (raycaster.intersectObjects(mainGroup.children, true).length > 0) {
                qaq3DClickBounce(mainGroup, scene);
            }
        });

        // ---- 动画循环 ----
        function animate() {
            if (qaq3D.destroyed) return;
            qaq3D.animId = requestAnimationFrame(animate);

            try {
                var t = qaq3D.clock.getElapsedTime();
                if (controls) controls.update();
                if (mainGroup) mainGroup.position.y = Math.sin(t * 1.5) * 0.06;

                if (qaq3D.particles) {
                    qaq3D.particles.rotation.y += 0.002;
                    var pos = qaq3D.particles.geometry.attributes.position.array;
                    for (var i = 1; i < pos.length; i += 3) {
                        pos[i] += Math.sin(t * 2+ i) * 0.002;
                    }
                    qaq3D.particles.geometry.attributes.position.needsUpdate = true;
                }

                renderer.render(scene, camera);
            } catch (animErr) {
                console.error('[3D] 渲染帧出错:', animErr);
                cancelAnimationFrame(qaq3D.animId);
            }
        }
        animate();

        console.log('[3D] 初始化成功, 模型子节点:', mainGroup.children.length);} catch (err) {
        console.error('[3D] 初始化失败:', err);qaqToast('3D 渲染失败: ' + (err.message || '未知错误'));
    }
}

/* ===== 3D 模型构建 ===== */
async function qaq3DBuild(item, group, isDark) {
    var modelUrl = qaqGet3DModelUrl(item.id);

    if (modelUrl && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
        try {
            await qaq3DLoadGLB(item, group);
            return;
        } catch (e) {
            console.warn('GLB 模型加载失败，回退到手搓模型：', e);
            qaqToast('3D 模型加载失败，已切换为默认展示模型');
        }
    }

    var id = item.id;
    var builders = {
        'seed-sunflower': qaq3DSunflower,
        'seed-rose': qaq3DRose,
        'seed-cactus': qaq3DCactus,
        'animal-cat': qaq3DCat,
        'animal-dog': qaq3DDog,
        'animal-rabbit': qaq3DRabbit,
        'item-fertilizer': qaq3DFertilizer,
        'item-food-basic': qaq3DFoodBowl,
        'item-bed': qaq3DBed
    };

    var fn = builders[id];
    if (fn) {
        fn(group);
    } else {
        var m = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xc47068,
                roughness: 0.3,
                metalness: 0.5
            })
        );
        m.position.y = 0.8;
        m.castShadow = true;
        group.add(m);
    }
}

function qaq3DAddPot(g, color) {
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.35, 16), new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
    pot.position.y = 0.175; pot.castShadow = true; pot.receiveShadow = true; g.add(pot);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 24), new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
    rim.position.y = 0.35; rim.rotation.x = Math.PI / 2; g.add(rim);
}

function qaq3DSunflower(g) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x4a8838, roughness: 0.8 });
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8), mat);
    stem.position.y = 0.9; stem.castShadow = true; g.add(stem);
    for (var i = 0; i < 2; i++) {
        var lf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5a9840, roughness: 0.7 }));
        lf.scale.set(1, 0.2, 0.6); lf.position.set(i === 0 ? -0.25 : 0.25, 0.5+ i * 0.4, 0); lf.rotation.z = i === 0 ? 0.6 : -0.6; g.add(lf);
    }
    var center = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6 }));
    center.position.y = 1.85; center.castShadow = true; g.add(center);
    for (var j = 0; j < 12; j++) {
        var a = (j / 12) * Math.PI * 2;
        var p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0d060, roughness: 0.5 }));
        p.scale.set(0.5, 0.15, 1); p.position.set(Math.cos(a) * 0.5, 1.85, Math.sin(a) * 0.5); p.lookAt(0, 1.85, 0); g.add(p);
    }
    qaq3DAddPot(g, 0x9a7b5a);
}

function qaq3DRose(g) {
    var stemMat = new THREE.MeshStandardMaterial({
        color: 0x6f9638,
        roughness: 0.72
    });

    var leafMat = new THREE.MeshStandardMaterial({
        color: 0x57a132,
        roughness: 0.68
    });

    var petalMat = new THREE.MeshStandardMaterial({
        color: 0xe05565,
        roughness: 0.55,
        side: THREE.DoubleSide
    });

    // 茎
    var stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.045, 1.4, 10),
        stemMat
    );
    stem.position.y = 0.7;
    stem.castShadow = true;
    g.add(stem);

    // 叶子
    var leaf1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        leafMat
    );
    leaf1.scale.set(1.8, 0.32, 0.8);
    leaf1.position.set(0.18, 0.95, 0.02);
    leaf1.rotation.z = -0.7;
    g.add(leaf1);

    var leaf2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        leafMat
    );
    leaf2.scale.set(1.8, 0.32, 0.8);
    leaf2.position.set(-0.2, 0.6, -0.02);
    leaf2.rotation.z = 0.7;
    g.add(leaf2);

    // 花头（简单版）
    var flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 20, 20),
        petalMat
    );
    flower.scale.set(1.2, 0.95, 1.1);
    flower.position.set(0, 1.55, 0);
    flower.castShadow = true;
    g.add(flower);

    // 内层
    var core = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0xb92f42,
            roughness: 0.5
        })
    );
    core.position.set(0, 1.58, 0.06);
    core.castShadow = true;
    g.add(core);
}

function qaq3DCactus(g) {
    var cMat = new THREE.MeshStandardMaterial({ color: 0x4a8838, roughness: 0.6 });
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.4, 12), cMat);
    body.position.y = 0.9; body.castShadow = true; g.add(body);
    var a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.7, 8), cMat);
    a1.position.set(-0.35, 1.0, 0); a1.rotation.z = Math.PI / 4; g.add(a1);
    var a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), cMat);
    a2.position.set(0.3, 1.2, 0); a2.rotation.z = -Math.PI / 5; g.add(a2);
    var fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0d060, emissive: 0x332200, emissiveIntensity: 0.2 }));
    fl.position.set(0, 1.65, 0); g.add(fl);
    qaq3DAddPot(g, 0x8a7260);
}

function qaq3DCat(g) {
    var m = new THREE.MeshStandardMaterial({ color: 0xe8a050, roughness: 0.65 });
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), m); b.scale.set(1, 0.8, 0.7); b.position.y = 0.5; b.castShadow = true; g.add(b);
    var h = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m); h.position.set(0, 1.0, 0.2); h.castShadow = true; g.add(h);
    var eGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
    [-0.18, 0.18].forEach(function (x) { var e = new THREE.Mesh(eGeo, m); e.position.set(x, 1.32, 0.2); e.rotation.z = x< 0 ? 0.15 : -0.15; g.add(e); });
    var eyeM = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.12, 0.12].forEach(function (x) { var e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeM); e.position.set(x, 1.05, 0.5); g.add(e); });
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd07060 }));
    nose.position.set(0, 0.95, 0.52); g.add(nose);
    for (var i = 0; i < 4; i++) { var pw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), m); pw.scale.y = 0.5; pw.position.set(i< 2 ? -0.22 : 0.22, 0.08, i % 2 === 0 ? 0.2 : -0.15); pw.castShadow = true; g.add(pw); }
    var tc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.4, -0.35), new THREE.Vector3(0.2, 0.7, -0.6), new THREE.Vector3(0.3, 1.0, -0.5), new THREE.Vector3(0.15, 1.15, -0.3)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 20, 0.05, 8, false), m));
}

function qaq3DDog(g) {
    var bodyMat = new THREE.MeshStandardMaterial({
        color: 0xd8a36d,
        roughness: 0.75,
        metalness: 0.02
    });
    var earMat = new THREE.MeshStandardMaterial({
        color: 0xb97d4f,
        roughness: 0.8,
        metalness: 0.02
    });
    var muzzleMat = new THREE.MeshStandardMaterial({
        color: 0xf3dfc9,
        roughness: 0.7
    });
    var eyeMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3
    });
    var noseMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a22,
        roughness: 0.4
    });
    var blushMat = new THREE.MeshStandardMaterial({
        color: 0xf0b0a8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.9
    });

    // 身体：更圆润
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), bodyMat);
    body.scale.set(1.15, 0.9, 0.85);
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);

    // 头：更大
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), bodyMat);
    head.position.set(0, 1.18, 0.25);
    head.castShadow = true;
    g.add(head);

    // 嘴套
    var muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), muzzleMat);
    muzzle.scale.set(1.3, 0.95, 1.1);
    muzzle.position.set(0, 1.03, 0.62);
    muzzle.castShadow = true;
    g.add(muzzle);

    // 鼻子
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), noseMat);
    nose.scale.set(1.2, 0.9, 1);
    nose.position.set(0, 1.07, 0.82);
    g.add(nose);

    // 眼睛：更大更靠下
    [-0.16, 0.16].forEach(function (x) {
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeMat);
        eye.position.set(x, 1.2, 0.62);
        g.add(eye);

        var eyeLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        eyeLight.position.set(x - 0.02, 1.23, 0.67);
        g.add(eyeLight);
    });

    // 腮红
    [-0.24, 0.24].forEach(function (x) {
        var blush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), blushMat);
        blush.scale.set(1.4, 0.8, 0.4);
        blush.position.set(x, 1.02, 0.68);
        g.add(blush);
    });

    // 下垂耳
    [-0.34, 0.34].forEach(function (x) {
        var ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), earMat);
        ear.scale.set(0.85, 1.6, 0.55);
        ear.position.set(x, 1.18, 0.28);
        ear.rotation.z = x < 0 ? 0.35 : -0.35;
        ear.castShadow = true;
        g.add(ear);
    });

    // 四只短腿
    [
        [-0.24, 0.12, 0.2],
        [0.24, 0.12, 0.2],
        [-0.24, 0.12, -0.12],
        [0.24, 0.12, -0.12]
    ].forEach(function (p) {
        var leg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bodyMat);
        leg.scale.set(0.95, 0.7, 0.95);
        leg.position.set(p[0], p[1], p[2]);
        leg.castShadow = true;
        g.add(leg);
    });

    // 尾巴：短一点，狗感更强
    var tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.42, 0.62, -0.28),
        new THREE.Vector3(0.62, 0.9, -0.38),
        new THREE.Vector3(0.48, 1.15, -0.3)
    ]);
    var tail = new THREE.Mesh(
        new THREE.TubeGeometry(tailCurve, 20, 0.05, 8, false),
        bodyMat
    );
    tail.castShadow = true;
    g.add(tail);
}

function qaq3DRabbit(g) {
    var m = new THREE.MeshStandardMaterial({ color: 0xe0a8a0, roughness: 0.6 });
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), m); b.scale.set(0.9, 0.85, 0.7); b.position.y = 0.45; b.castShadow = true; g.add(b);
    var h = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m); h.position.set(0, 1.0, 0.15); g.add(h);
    [-0.14, 0.14].forEach(function (x) { var e = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), m); e.position.set(x, 1.5, 0.1); g.add(e); var t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), m); t.position.set(x, 1.82, 0.1); g.add(t); });
    [-0.12, 0.12].forEach(function (x) { var e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); e.position.set(x, 1.02, 0.44); g.add(e); });
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd08080 }));
    nose.position.set(0, 0.92, 0.48); g.add(nose);
    var blush = new THREE.MeshStandardMaterial({ color: 0xf0b8b0, transparent: true, opacity: 0.35 });
    [-0.22, 0.22].forEach(function (x) { var c = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), blush); c.position.set(x, 0.95, 0.4); g.add(c); });
    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), m); tail.position.set(0, 0.35, -0.4); g.add(tail);
}

function qaq3DFertilizer(g) {
    var bagMat = new THREE.MeshStandardMaterial({
        color: 0x739b63,
        roughness: 0.82,
        metalness: 0.02
    });
    var topMat = new THREE.MeshStandardMaterial({
        color: 0x5e8451,
        roughness: 0.9
    });
    var labelMat = new THREE.MeshStandardMaterial({
        color: 0xf7f2e8,
        roughness: 0.55
    });

    var bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 1.0, 0.42, 4, 4, 2),
        bagMat
    );
    bag.position.y = 0.55;
    bag.castShadow = true;
    bag.receiveShadow = true;
    g.add(bag);

    var topFold = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.14, 0.36),
        topMat
    );
    topFold.position.set(0, 1.05, 0);
    topFold.rotation.z = 0.03;
    topFold.castShadow = true;
    g.add(topFold);

    var label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.28),
        labelMat
    );
    label.position.set(0, 0.58, 0.215);
    g.add(label);

    var badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x8dbb7d, roughness: 0.6 })
    );
    badge.position.set(0, 0.6, 0.22);
    g.add(badge);

    for (var i = 0; i < 8; i++) {
        var p = new THREE.Mesh(
            new THREE.SphereGeometry(0.035 + Math.random() * 0.01, 8, 8),
            new THREE.MeshStandardMaterial({
                color: i % 2 ? 0x90b880 : 0xa8c890,
                roughness: 1
            })
        );
        p.position.set((Math.random() - 0.5) * 0.9, 0.03, (Math.random() - 0.5) * 0.7);
        p.castShadow = true;
        g.add(p);
    }
}

function qaq3DFoodBowl(g) {
    var bowlMat = new THREE.MeshStandardMaterial({
        color: 0xe6d0b3,
        roughness: 0.4,
        metalness: 0.05
    });

    var foodMat1 = new THREE.MeshStandardMaterial({
        color: 0xc88e4d,
        roughness: 0.9
    });

    var foodMat2 = new THREE.MeshStandardMaterial({
        color: 0xd8a865,
        roughness: 0.88
    });

    var bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.36, 0.26, 32),
        bowlMat
    );
    bowl.position.y = 0.16;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    g.add(bowl);

    var rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.04, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0xd6bc9f, roughness: 0.35 })
    );
    rim.position.y = 0.28;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    for (var i = 0; i < 10; i++) {
        var pellet = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 + Math.random() * 0.02, 10, 10),
            i % 2 ? foodMat1 : foodMat2
        );
        pellet.scale.y = 0.7;
        pellet.position.set(
            (Math.random() - 0.5) * 0.55,
            0.3 + Math.random() * 0.04,
            (Math.random() - 0.5) * 0.55
        );
        pellet.castShadow = true;
        g.add(pellet);
    }
}

function qaq3DBed(g) {
    var baseMat = new THREE.MeshStandardMaterial({
        color: 0x5f9fd8,
        roughness: 0.65
    });
    var cushionMat = new THREE.MeshStandardMaterial({
        color: 0xa8d2ef,
        roughness: 0.92
    });
    var pillowMat = new THREE.MeshStandardMaterial({
        color: 0xd7eefb,
        roughness: 0.85
    });

    var base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.62, 0.22, 36),
        baseMat
    );
    base.position.y = 0.12;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    var edge = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.11, 12, 40),
        new THREE.MeshStandardMaterial({ color: 0x4d89bf, roughness: 0.7 })
    );
    edge.position.y = 0.24;
    edge.rotation.x = Math.PI / 2;
    g.add(edge);

    var cushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.08, 32),
        cushionMat
    );
    cushion.position.y = 0.24;
    g.add(cushion);

    var pillow = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        pillowMat
    );
    pillow.scale.set(1.5, 0.55, 0.95);
    pillow.position.set(-0.18, 0.34, 0.12);
    pillow.castShadow = true;
    g.add(pillow);
}

/* ===== 3D 粒子 ===== */
function qaq3DParticles(scene, type, isDark) {
    var count = 60;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var palette = type === 'seed'
        ? [new THREE.Color(0xf0d060), new THREE.Color(0xb8dfbf), new THREE.Color(0xffeedd)]
        : type === 'animal'
        ? [new THREE.Color(0xffbbcc), new THREE.Color(0xbbddff), new THREE.Color(0xffeedd)]
        : [new THREE.Color(0xa0c890), new THREE.Color(0xd0e0ff), new THREE.Color(0xf0d060)];
    for (var i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 1] = Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
        var c = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: isDark ? 0.4 : 0.6, sizeAttenuation: true }));
    scene.add(pts);
    qaq3D.particles = pts;
}

/* ===== 3D 点击弹跳 ===== */
function qaq3DClickBounce(mainGroup, scene) {
    var start = performance.now();
    function bounce() {
        var t = (performance.now() - start) / 500;
        if (t > 1) { mainGroup.scale.set(1, 1, 1); return; }
        var s = 1 +0.2 * Math.sin(t * Math.PI * 3) * (1 - t);
        var sy = 1 + 0.15 * Math.sin(t * Math.PI * 4) * (1 - t);
        mainGroup.scale.set(s, sy, s);
        requestAnimationFrame(bounce);
    }
    bounce();

    //粒子爆发
    var burstGroup = new THREE.Group();
    scene.add(burstGroup);
    var burstColors = [0xe8c34f, 0xe05565, 0x5b9bd5, 0x7bab6e, 0x8b6cc1];
    for (var i = 0; i < 15; i++) {
        var bm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshStandardMaterial({ color: burstColors[Math.floor(Math.random() * burstColors.length)], emissive: 0x332211, emissiveIntensity: 0.3 }));
        bm.position.set(0, 0.8, 0);
        bm.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.05+ Math.random() * 0.1, (Math.random() - 0.5) * 0.15);
        burstGroup.add(bm);
    }
    var bs = performance.now();
    function animBurst() {
        var elapsed = (performance.now() - bs) / 1000;
        if (elapsed > 1.5) { scene.remove(burstGroup); return; }
        burstGroup.children.forEach(function (child) {
            child.position.add(child.userData.velocity);
            child.userData.velocity.y -= 0.004;
            child.material.opacity = Math.max(0, 1 - elapsed);
            child.material.transparent = true;
        });
        requestAnimationFrame(animBurst);
    }
    animBurst();
}

function qaqGetPetFloatState() {
    return qaqCacheGet('qaq-pet-float-state', {
        wordbank: { right: 14, bottom: 90, scale: 1 },
        review: { right: 14, bottom: 90, scale: 1 }
    });
}

function qaqSavePetFloatState(data) {
    qaqCacheSet('qaq-pet-float-state', data || {
        wordbank: { right: 14, bottom: 90, scale: 1 },
        review: { right: 14, bottom: 90, scale: 1 }
    });
}

function qaqBindPetFloatDragAndScale(floatId, pageKey) {
    var el = document.getElementById(floatId);
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';

    var stateAll = qaqGetPetFloatState();
    var state = stateAll[pageKey] || { right: 14, bottom: 90, scale: 1 };

    el.style.right = state.right + 'px';
    el.style.bottom = state.bottom + 'px';
    el.style.transform = 'scale(' + (state.scale || 1) + ')';
    el.style.transformOrigin = 'bottom right'; // 确保从右下角固定放大

    var startX = 0;
    var startY = 0;
    var startRight = 0;
    var startBottom = 0;
    var dragging = false;
    var hasMoved = false; // 新增：是否发生了拖动

    function onStart(clientX, clientY) {
        dragging = true;
        hasMoved = false; // 每次触摸重置移动状态
        el.classList.add('qaq-pet-dragging');
        startX = clientX;
        startY = clientY;

        var latest = qaqGetPetFloatState()[pageKey] || { right: 14, bottom: 90, scale: 1 };
        startRight = latest.right;
        startBottom = latest.bottom;
    }

    function onMove(clientX, clientY) {
        if (!dragging) return;
        
        var dx = clientX - startX;
        var dy = clientY - startY;

        // 如果移动距离超过 5 像素，则判定为正在拖拽
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        var newRight = Math.max(0, startRight - dx);
        var newBottom = Math.max(70, startBottom - dy);

        el.style.right = newRight + 'px';
        el.style.bottom = newBottom + 'px';
    }

    var lastTap = 0;

    function onEnd() {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('qaq-pet-dragging');

        var right = parseFloat(el.style.right) || 14;
        var bottom = parseFloat(el.style.bottom) || 90;
        var all = qaqGetPetFloatState();
        if (!all[pageKey]) all[pageKey] = {};
        all[pageKey].right = right;
        all[pageKey].bottom = bottom;

        // 【最核心的缩放修复在这里】
        // 如果没有发生明显位移，认定这是一次精准的“点击”
        if (!hasMoved) {
            var now = Date.now();
            if (now - lastTap < 400) { // 放宽到 400 毫秒
                var cur = all[pageKey].scale || 1;
                var next = cur >= 1.3 ? 1 : 1.4; // 1.4倍放大
                all[pageKey].scale = next;
                el.style.transform = 'scale(' + next + ')';
                if(window.qaqToast) window.qaqToast(next > 1 ? '桌宠已放大' : '桌宠恢复默认大小');
                lastTap = 0; // 重置，防止无限触发
            } else {
                lastTap = now;
            }
        }
        
        qaqSavePetFloatState(all);
    }

    el.addEventListener('mousedown', function (e) {
        onStart(e.clientX, e.clientY);
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        onMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', onEnd);

    el.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches[0]) return;
        onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!dragging || !e.touches || !e.touches[0]) return;
        // 如果系统开始移动了，阻止默认的页面滚动穿透
        if (hasMoved && e.cancelable) e.preventDefault(); 
        onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false }); // 注意这里改成 false 才能在需要时阻止默认行为

    document.addEventListener('touchend', onEnd);
}


/*===== 桌宠设置（设置页入口） ===== */
document.getElementById('qaq-set-pet').addEventListener('click', function () {
    var owned = qaqGetOwnedItems().filter(function (x) {
        return x.type === 'animal' || x.type === 'seed';
    });

    var currentPet = qaqGetActivePet();
    var currentId = currentPet ? currentPet.id : '';
    var currentMode = typeof qaqGetDisplayMode === 'function' ? qaqGetDisplayMode() : 'lottie';

    // 🌟 神级重构：复用原生的 qaq-custom-select-list，彻底告别浏览器原生 select 丑弹窗！
    var displayModeHtml = 
        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06);">' +
            '<div class="qaq-settings-group-title" style="padding-left:4px; margin-bottom:8px;">画质渲染引擎</div>' +
            '<div class="qaq-custom-select-list" id="qaq-display-mode-list">' +
                '<div class="qaq-custom-select-option' + (currentMode === 'static' ? ' qaq-custom-select-active' : '') + '" data-mode="static">' +
                    '<span>2D 静态插图 (极速省电)</span>' + (currentMode === 'static' ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>' +
                '<div class="qaq-custom-select-option' + (currentMode === 'lottie' ? ' qaq-custom-select-active' : '') + '" data-mode="lottie">' +
                    '<span>2D 骨骼动画 (原汁原味)</span>' + (currentMode === 'lottie' ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>' +
                '<div class="qaq-custom-select-option' + (currentMode === '3d' ? ' qaq-custom-select-active' : '') + '" data-mode="3d">' +
                    '<span>3D 立体模型 (极致丝滑)</span>' + (currentMode === '3d' ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>' +
            '</div>' +
        '</div>';

    modalTitle.textContent = '桌宠与场景设置';
    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';

    var petsHtml = '';
    if (!owned.length) {
        petsHtml = '<div style="text-align:center;font-size:13px;color:#999;line-height:1.8;padding:10px 0;">还没有可设置的桌宠<br>去商店兑换动物或种子吧</div>';
    } else {
        petsHtml = '<div class="qaq-custom-select-list" id="qaq-pet-select-list">' +
            owned.map(function (item) {
                var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === item.id; });
                var isActive = item.id === currentId;
                return '<div class="qaq-custom-select-option' + (isActive ? ' qaq-custom-select-active' : '') + '" data-pet-id="' + item.id + '">' +
                    '<span>' + (catItem ? catItem.name : item.name) + '</span>' + (isActive ? '<span style="color:#c47068;">✓</span>' : '') +
                '</div>';
            }).join('') +
            '<div class="qaq-custom-select-option' + (!currentId ? ' qaq-custom-select-active' : '') + '" data-pet-id="">' +
                '<span style="color:#aaa;">不设置桌宠</span>' + (!currentId ? '<span style="color:#c47068;">✓</span>' : '') +
            '</div>' +
        '</div>';
    }

    modalBody.innerHTML = petsHtml + displayModeHtml;

    qaqOpenModal();
    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    // 绑定桌宠选择事件
    modalBody.querySelectorAll('[data-pet-id]').forEach(function (opt) {
        opt.addEventListener('click', function () {
            // 互斥UI更新
            modalBody.querySelectorAll('[data-pet-id]').forEach(function(o){o.classList.remove('qaq-custom-select-active'); o.innerHTML = o.innerHTML.replace('<span style="color:#c47068;">✓</span>', '');});
            this.classList.add('qaq-custom-select-active');
            if(this.dataset.petId) this.innerHTML += '<span style="color:#c47068;">✓</span>';

            var petId = this.dataset.petId;
            if (!petId) {
                qaqSaveActivePet(null);
                document.getElementById('qaq-settings-pet-preview').textContent = '未设置';
            } else {
                qaqSaveActivePet({ id: petId });
                var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === petId; });
                document.getElementById('qaq-settings-pet-preview').textContent = catItem ? catItem.name : '已设置';
            }
            if (typeof qaqRenderWordbankPetFloat === 'function') qaqRenderWordbankPetFloat();
            if (typeof qaqRenderReviewPetFloat === 'function') qaqRenderReviewPetFloat();
            qaqToast(petId ? '桌宠更替成功' : '桌宠已收起');
        });
    });

    // 绑定画质选择事件
    modalBody.querySelectorAll('[data-mode]').forEach(function (opt) {
        opt.addEventListener('click', function () {
            // 互斥UI更新
            modalBody.querySelectorAll('[data-mode]').forEach(function(o){o.classList.remove('qaq-custom-select-active');o.innerHTML = o.innerHTML.replace('<span style="color:#c47068;">✓</span>', '');});
            this.classList.add('qaq-custom-select-active');
            this.innerHTML += '<span style="color:#c47068;">✓</span>';
            
            qaqSaveDisplayMode(this.dataset.mode);
            qaqToast('引擎已切换，画面重载中...');
            // 即时重绘画面
            if (typeof qaqRenderWordbankPetFloat === 'function') qaqRenderWordbankPetFloat();
            if (typeof qaqRenderReviewPetFloat === 'function') qaqRenderReviewPetFloat();
            if (typeof qaqRefreshXiaoyuanView === 'function') qaqRefreshXiaoyuanView();
        });
    });
});

// 初始化设置页桌宠预览文字
(function () {
    var pet = qaqGetActivePet();
    var previewEl = document.getElementById('qaq-settings-pet-preview');
    if (previewEl && pet) {
        var catItem = qaqShopCatalog.animals.concat(qaqShopCatalog.seeds).find(function (x) { return x.id === pet.id; });
        previewEl.textContent = catItem ? catItem.name : '已设置';
    }
})();

/* ====================================================================★★★ Live2D / 动态2D 引擎 ★★★
   ==================================================================== */

// ---- 精灵状态存储 ----
function qaqGetSpriteState(itemId) {
    var states = qaqCacheGet('qaq-sprite-states', {});
    return states[itemId] || { growth: 0, mood: 100, lastWater: 0, lastFeed: 0 };
}

function qaqSaveSpriteState(itemId, state) {
    var states = qaqCacheGet('qaq-sprite-states', {});
    states[itemId] = state;
    qaqCacheSet('qaq-sprite-states', states);
}

// ---- 2D 精灵工厂（SVG 动画） ----
var qaqPlantSVGs = {
    'seed-sunflower': function(scale) {
        return '<svg width="' + (48 * scale) + '" height="' + (64 * scale) + '" viewBox="0 0 48 64">' +
            '<line x1="24" y1="30" x2="24" y2="60" stroke="#5a8a3e" stroke-width="3" stroke-linecap="round"/>' +
            '<ellipse cx="18" cy="42" rx="8" ry="4" fill="#6aa84f" opacity="0.6" transform="rotate(-20,18,42)"/>' +
            '<ellipse cx="30" cy="38" rx="7" ry="3.5" fill="#6aa84f" opacity="0.5" transform="rotate(15,30,38)"/>' +
            '<circle cx="24" cy="20" r="10" fill="#e8c34f"/>' +
            '<circle cx="24" cy="20" r="5" fill="#a0722a"/>' +
            // 花瓣
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

var qaqAnimalSVGs = {
    'animal-cat': function(scale) {
        return '<svg width="' + (52 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 52 44">' +
            // 身体
            '<ellipse cx="26" cy="30" rx="14" ry="10" fill="#e8a050"/>' +
            // 头
            '<circle cx="26" cy="18" r="10" fill="#e8a050"/>' +
            // 耳朵
            '<polygon points="18,12 14,2 22,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
            '<polygon points="34,12 38,2 30,8" fill="#e8a050" stroke="#d89040" stroke-width="0.5"/>' +
            '<polygon points="19,11 16,4 22,8" fill="#f0b8a0" opacity="0.5"/>' +
            '<polygon points="33,11 36,4 30,8" fill="#f0b8a0" opacity="0.5"/>' +
            // 眼睛
            '<ellipse cx="22" cy="17" rx="2.5" ry="3" fill="#333"/>' +
            '<ellipse cx="30" cy="17" rx="2.5" ry="3" fill="#333"/>' +
            '<circle cx="21" cy="16" r="1" fill="#fff"/>' +
            '<circle cx="29" cy="16" r="1" fill="#fff"/>' +
            // 鼻子
            '<ellipse cx="26" cy="21" rx="1.5" ry="1" fill="#d07060"/>' +
            // 嘴
            '<path d="M24 22 Q26 24 28 22" fill="none" stroke="#d07060" stroke-width="0.8"/>' +
            // 胡须
            '<line x1="14" y1="19" x2="21" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="14" y1="22" x2="21" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="38" y1="19" x2="31" y2="20" stroke="#c88040" stroke-width="0.5"/>' +
            '<line x1="38" y1="22" x2="31" y2="21" stroke="#c88040" stroke-width="0.5"/>' +
            // 尾巴
            '<path d="M40 28 Q48 20 44 14" fill="none" stroke="#e8a050" stroke-width="3" stroke-linecap="round"/>' +
            //爪子
            '<ellipse cx="18" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
            '<ellipse cx="34" cy="38" rx="4" ry="3" fill="#e8a050"/>' +
            '</svg>';
    },
    'animal-dog': function(scale) {
    return '<svg width="' + (56 * scale) + '" height="' + (48 * scale) + '" viewBox="0 0 56 48">' +
        // 身体
        '<ellipse cx="28" cy="33" rx="15" ry="10" fill="#d8a36d"/>' +

        // 头
        '<circle cx="28" cy="18" r="11" fill="#d8a36d"/>' +

        // 下垂耳
        '<ellipse cx="18" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(8,18,17)"/>' +
        '<ellipse cx="38" cy="17" rx="5" ry="9" fill="#b97d4f" transform="rotate(-8,38,17)"/>' +

        // 脸中间浅色嘴套
        '<ellipse cx="28" cy="22" rx="7" ry="5.5" fill="#f3dfc9"/>' +

        // 眼睛
        '<circle cx="24" cy="17" r="2.3" fill="#2f2f2f"/>' +
        '<circle cx="32" cy="17" r="2.3" fill="#2f2f2f"/>' +
        '<circle cx="23.3" cy="16.2" r="0.9" fill="#fff"/>' +
        '<circle cx="31.3" cy="16.2" r="0.9" fill="#fff"/>' +

        // 鼻子
        '<ellipse cx="28" cy="21.5" rx="2.3" ry="1.7" fill="#3a2a22"/>' +

        // 嘴
        '<path d="M26 23.8 Q28 25.5 30 23.8" fill="none" stroke="#8a5a46" stroke-width="0.9" stroke-linecap="round"/>' +

        // 腮红
        '<circle cx="20" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +
        '<circle cx="36" cy="22" r="2.2" fill="#f0b0a8" opacity="0.35"/>' +

        // 爪子
        '<ellipse cx="20" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +
        '<ellipse cx="36" cy="40" rx="4" ry="3" fill="#d8a36d"/>' +

        // 尾巴
        '<path d="M42 31 Q50 25 48 18" fill="none" stroke="#d8a36d" stroke-width="3.2" stroke-linecap="round"/>' +
        '</svg>';
},
    'animal-rabbit': function(scale) {
        return '<svg width="' + (44 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 44 52">' +
            // 耳朵
            '<ellipse cx="16" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
            '<ellipse cx="28" cy="10" rx="4" ry="12" fill="#e0a8a0"/>' +
            '<ellipse cx="16" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
            '<ellipse cx="28" cy="10" rx="2.5" ry="9" fill="#f0c0b8" opacity="0.6"/>' +
            // 头
            '<circle cx="22" cy="26" r="11" fill="#e0a8a0"/>' +
            // 身体
            '<ellipse cx="22" cy="40" rx="10" ry="8" fill="#e0a8a0"/>' +
            // 眼睛
            '<circle cx="18" cy="24" r="2.5" fill="#333"/>' +
            '<circle cx="26" cy="24" r="2.5" fill="#333"/>' +
            '<circle cx="17.5" cy="23.5" r="1" fill="#fff"/>' +
            '<circle cx="25.5" cy="23.5" r="1" fill="#fff"/>' +
            // 鼻子
            '<ellipse cx="22" cy="28" rx="1.5" ry="1" fill="#d08080"/>' +
            // 腮红
            '<circle cx="14" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
            '<circle cx="30" cy="28" r="3" fill="#f0b8b0" opacity="0.3"/>' +
            '</svg>';
    }
};

var qaqItemSVGs = {
    'item-fertilizer': function(scale) {
        return '<svg width="' + (40 * scale) + '" height="' + (52 * scale) + '" viewBox="0 0 40 52">' +
            //袋子
            '<rect x="8" y="20" width="24" height="28" rx="4" fill="#7bab6e" opacity="0.85"/>' +
            '<rect x="8" y="20" width="24" height="28" rx="4" fill="none" stroke="#5a8a4e" stroke-width="1.2"/>' +
            // 袋口折叠
            '<path d="M10 20 Q20 14 30 20" fill="#6a9a5e" stroke="#5a8a4e" stroke-width="0.8"/>' +
            // 标签
            '<rect x="13" y="28" width="14" height="10" rx="2" fill="#fff" opacity="0.7"/>' +
            '<text x="20" y="35" text-anchor="middle" fill="#5a8a4e" font-size="6" font-weight="700">N P K</text>' +
            // 叶子装饰
            '<path d="M20 8 C16 8 12 12 12 16 C12 20 16 22 20 22 C20 22 20 8 20 8Z" fill="#7bab6e" opacity="0.6"/>' +
            '<path d="M20 8 C24 8 28 12 28 16 C28 20 24 22 20 22 C20 22 20 8 20 8Z" fill="#6a9a5e" opacity="0.5"/>' +
            '<line x1="20" y1="8" x2="20" y2="22" stroke="#5a8a4e" stroke-width="1" stroke-linecap="round"/>' +
            // 散落的颗粒
            '<circle cx="14" cy="44" r="1.5" fill="#a0c890" opacity="0.6"/>' +
            '<circle cx="22" cy="46" r="1.2" fill="#90b880" opacity="0.5"/>' +
            '<circle cx="28" cy="43" r="1.8" fill="#a0c890" opacity="0.4"/>' +
            '</svg>';
    },
    'item-food-basic': function(scale) {
        return '<svg width="' + (44 * scale) + '" height="' + (44 * scale) + '" viewBox="0 0 44 44">' +
            // 碗
            '<path d="M6 22 Q6 36 22 38Q38 36 38 22 Z" fill="#e8d0b0" stroke="#d0b890" stroke-width="1"/>' +
            '<ellipse cx="22" cy="22" rx="16" ry="5" fill="#f0e0c8" stroke="#d0b890" stroke-width="0.8"/>' +
            // 食物堆
            '<ellipse cx="22" cy="20" rx="12" ry="4" fill="#d4a060"/>' +
            '<ellipse cx="18" cy="18" rx="3" ry="2.5" fill="#c89050" opacity="0.7"/>' +
            '<ellipse cx="26" cy="19" rx="3.5" ry="2" fill="#d8a868" opacity="0.6"/>' +
            '<ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#c08848" opacity="0.5"/>' +
            // 冒热气
            '<path d="M16 12 Q15 8 16 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
            '<path d="M22 10 Q21 6 22 4" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
            '<path d="M28 12 Q27 8 28 6" fill="none" stroke="#ddd" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
            '</svg>';
    },
    'item-bed': function(scale) {
        return '<svg width="' + (48 * scale) + '" height="' + (40 * scale) + '" viewBox="0 0 48 40">' +
            // 底座
            '<rect x="4" y="24" width="40" height="12" rx="6" fill="#5b9bd5" opacity="0.8"/>' +
            '<rect x="4" y="24" width="40" height="12" rx="6" fill="none" stroke="#4a88c0" stroke-width="1"/>' +
            // 垫子
            '<ellipse cx="24" cy="24" rx="18" ry="5" fill="#7ab8e8" opacity="0.6"/>' +
            //靠背/边缘
            '<path d="M8 24 Q8 14 16 12Q24 10 32 12Q40 14 40 24" fill="#6aa8d8" opacity="0.5" stroke="#4a88c0" stroke-width="0.8"/>' +
            //枕头
            '<ellipse cx="16" cy="20" rx="6" ry="3.5" fill="#a0d0f0" stroke="#80b8e0" stroke-width="0.6"/>' +
            // 小爪印装饰
            '<circle cx="30" cy="28" r="1.5" fill="#4a88c0" opacity="0.2"/>' +
            '<circle cx="28" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
            '<circle cx="32" cy="26" r="1" fill="#4a88c0" opacity="0.15"/>' +
            '<circle cx="29" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
            '<circle cx="31" cy="24.5" r="0.8" fill="#4a88c0" opacity="0.12"/>' +
            // 小z字（睡觉）
            '<text x="36" y="10" fill="#5b9bd5" font-size="8" font-weight="700" opacity="0.4">z</text>' +
            '<text x="39" y="6" fill="#5b9bd5" font-size="6" font-weight="700" opacity="0.3">z</text>' +
            '</svg>';
    }
};

// ---- Live2D 渲染引擎 ----
var qaqLive2DApps = {};

function qaqCreateLive2DApp(canvasId, width, height) {
    if (typeof PIXI === 'undefined') {
        console.warn('PixiJS 未加载，请先调用 qaqEnsureLive2D');
        return null;
    }

    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    if (qaqLive2DApps[canvasId]) {
        try { qaqLive2DApps[canvasId].destroy(true); } catch(e) {}
        delete qaqLive2DApps[canvasId];
    }

    var app = new PIXI.Application({
        view: canvas,
        width: width || canvas.parentElement.clientWidth,
        height: height || canvas.parentElement.clientHeight,
        transparent: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });

    qaqLive2DApps[canvasId] = app;
    return app;
}

async function qaqLoadLive2DModel(app, modelUrl, options) {
    if (!app || !modelUrl) return null;
    if (typeof PIXI === 'undefined' || !PIXI.live2d) {
        console.warn('pixi-live2d-display 未加载');
        return null;
    }

    options = options || {};
    var scale = options.scale || 0.15;
    var x = options.x != null ? options.x : app.screen.width / 2;
    var y = options.y != null ? options.y : app.screen.height * 0.85;

    try {
        var model = await PIXI.live2d.Live2DModel.from(modelUrl);
        model.scale.set(scale);
        model.anchor.set(0.5, 1);
        model.x = x;
        model.y = y;

        // 可交互
        model.interactive = true;
        model.buttonMode = true;

        // 点击交互 —— 随机动作
        model.on('pointertap', function() {
            var motions = Object.keys(model.internalModel.motionManager.definitions || {});
            if (motions.length) {
                var group = motions[Math.floor(Math.random() * motions.length)];
                model.motion(group);
            }
        });

        // 跟踪指针
        model.on('pointermove', function(e) {
            var point = e.data.global;
            model.focus(point.x, point.y);
        });

        app.stage.addChild(model);
        return model;
    } catch(err) {
        console.error('Live2D 模型加载失败:', err);
        return null;
    }
}

// ---- 2D 精灵渲染到场景 (🌟新增：完美拖拽放置 + 存档) ----
function qaqCreateSpriteInScene(sceneEl, spriteHtml, defaultX, defaultY, name, itemId, type) {
    var container = document.createElement('div');
    container.className = 'qaq-sprite-container';
    
    // 🌟 1. 读取存档坐标 (如果没有存档，才用计算出来的 defaultX)
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

    var nameTag = document.createElement('div');
    nameTag.className = 'qaq-sprite-name';
    nameTag.textContent = name;

    container.appendChild(spriteWrap);
    container.appendChild(nameTag);
    sceneEl.appendChild(container);

    qaqRenderVisualToDOM(innerId, itemId, type, 1.0, qaqGetXiaoyuanModeByType(type), true);

    // 🌟 2. 拖拽交互：改成 Pointer Events，避免每次渲染都往 document 叠加监听导致死机
    var isDragging = false;
    var hasMoved = false;
    var startX = 0;
    var startY = 0;
    var initLeft = 0;
    var initBottom = 0;
    var sceneRect = null;
    var activePointerId = null;

    function onPointerDown(e) {
        // 鼠标只响应左键；触屏/笔正常响应
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        initLeft = parseFloat(container.style.left) || 0;
        initBottom = parseFloat(container.style.bottom) || 0;
        sceneRect = sceneEl.getBoundingClientRect();

        isDragging = true;
        hasMoved = false;

        container.style.zIndex = '999';
        container.style.transition = 'none';

        try {
            container.setPointerCapture(activePointerId);
        } catch (err) {}
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        if (activePointerId != null && e.pointerId !== activePointerId) return;

        var dx = e.clientX - startX;
        var dy = e.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
            if (e.cancelable) e.preventDefault();
        }

        if (!hasMoved || !sceneRect) return;

        var newLeft = initLeft + dx;
        var newBottom = initBottom - dy;

        newLeft = Math.max(-20, Math.min(newLeft, sceneRect.width - 40));
        newBottom = Math.max(0, Math.min(newBottom, sceneRect.height - 50));

        container.style.left = newLeft + 'px';
        container.style.bottom = newBottom + 'px';
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        if (activePointerId != null && e.pointerId !== activePointerId) return;

        isDragging = false;
        container.style.zIndex = '3';
        container.style.transition = '';

        try {
            container.releasePointerCapture(activePointerId);
        } catch (err) {}

        activePointerId = null;

        if (!hasMoved) {
            if (type === 'plant') {
                qaqWaterPlant(container, itemId);
            } else {
                qaqPetAnimal(container, itemId);
            }
        } else {
            state.posX = parseFloat(container.style.left);
            state.posY = parseFloat(container.style.bottom);
            qaqSaveSpriteState(itemId, state);

            // 不建议每次拖完都 Toast，频繁拖拽会很烦，也会增加 UI 压力
            // qaqToast('位置已保存');
        }
    }

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    return container;
}

function qaqWaterPlant(containerEl, itemId) {
    var sprite = containerEl.querySelector('.qaq-plant-sprite');
    sprite.classList.add('qaq-watering');
    setTimeout(function() { sprite.classList.remove('qaq-watering'); }, 800);

    // 水滴效果
    for (var i = 0; i < 3; i++) {
        var drop = document.createElement('div');
        drop.className = 'qaq-water-drop';
        drop.style.left = (Math.random() * 20 + 10) + 'px';
        drop.style.top = '0px';
        drop.style.animationDelay = (i * 0.15) + 's';
        containerEl.appendChild(drop);
        setTimeout(function() { if (drop.parentNode) drop.remove(); }, 800);
    }

    // 更新状态
    var state = qaqGetSpriteState(itemId);
    state.growth = Math.min(100, (state.growth || 0) + 10);
    state.lastWater = Date.now();
    qaqSaveSpriteState(itemId, state);

    qaqAddPoints(1);
    qaqToast('浇水成功 +1 积分');
}

function qaqPetAnimal(containerEl, itemId) {
    var sprite = containerEl.querySelector('.qaq-animal-sprite');
    sprite.classList.add('qaq-bounce');
    setTimeout(function() { sprite.classList.remove('qaq-bounce'); }, 500);

    // 爱心效果
    var heart = document.createElement('div');
    heart.className = 'qaq-feed-heart';
    heart.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#e05565" stroke="none"><path d="M12 21C1221 3 15 3 8.5C3 5.46 5.46 3 8.5 3C10.24 3 11.91 3.81 135.09C14.09 3.81 15.76 3 17.5 3C20.54 3 23 5.46 23 8.5C23 15 14 21 14 21"/></svg>';
    heart.style.left = '50%';
    heart.style.top = '-10px';
    heart.style.transform = 'translateX(-50%)';
    containerEl.appendChild(heart);
    setTimeout(function() { if (heart.parentNode) heart.remove(); }, 1000);

    // 更新状态
    var state = qaqGetSpriteState(itemId);
    state.mood = Math.min(100, (state.mood || 50) + 5);
    state.lastFeed = Date.now();
    qaqSaveSpriteState(itemId, state);

    qaqAddPoints(1);
    qaqToast('互动成功 +1 积分');
}

// ---- 植物园渲染（替换原有函数） ----
function qaqRenderGardenPage() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'seed'; });
    var gridEl = document.getElementById('qaq-garden-plants-grid');
    var emptyEl = document.getElementById('qaq-garden-plants-empty');
    var sceneEl = document.getElementById('qaq-garden-scene');

    gridEl.innerHTML = '';

    // 清除场景中的旧精灵
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip').forEach(function(el) { el.remove(); });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    // 添加场景提示
    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击植物可浇水';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function(item, idx) {
        var catItem = qaqShopCatalog.seeds.find(function(x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var growth = state.growth || 0;
        var growthStage = growth< 30 ? 0.7 : (growth < 70 ? 0.85 : 1);

        // 场景中添加精灵
        var svgFn = qaqPlantSVGs[item.id];
        if (svgFn) {
            var x = spacing * (idx + 1) - 20;
            qaqCreateSpriteInScene(
                sceneEl,
                svgFn(growthStage),
                x,10,
                catItem ? catItem.name : item.name,
                item.id,
                'plant'
            );
        }

        // 网格卡片
        var card = document.createElement('div');
        card.className = 'qaq-garden-card';

        var bloomSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e05565" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><circle cx="12" cy="12" r="4" fill="#e05565" opacity="0.3"/><circle cx="12" cy="5" r="2.5" fill="#f8b0b8"/><circle cx="12" cy="19" r="2.5" fill="#f8b0b8"/><circle cx="5" cy="12" r="2.5" fill="#f8b0b8"/><circle cx="19" cy="12" r="2.5" fill="#f8b0b8"/></svg>';
var growSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7bab6e" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22V12" stroke-linecap="round"/><path d="M8 16c0-4 2-6 4-7" stroke-linecap="round"/><path d="M16 14c0-3-2-5-4-6" stroke-linecap="round"/><circle cx="12" cy="8" r="3" fill="#7bab6e" opacity="0.2"/></svg>';
var seedSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.8" style="vertical-align:-2px;margin-right:2px;"><path d="M12 22v-8" stroke-linecap="round"/><path d="M12 14c-3 0-5-2-5-5s4-7 5-7 5 4 5 7-2 5-5 5z" fill="#b8dfbf" opacity="0.3"/></svg>';

var statusText = growth >= 100 ? bloomSvg + '盛开' : (growth >= 50 ? growSvg + '成长中' : seedSvg + '幼苗');
        var statusColor = growth >= 100 ? '#e05565' : (growth >= 50 ? '#7bab6e' : '#999');

        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +
                (catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-status" style="color:' + statusColor + ';">' + statusText + '</div>' +
            '<div class="qaq-garden-card-growth"><div class="qaq-garden-card-growth-fill" style="width:' + growth + '%;"></div></div>';

        card.addEventListener('click', function() {
            qaqWaterPlant(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            //刷新卡片
            setTimeout(qaqRenderGardenPage, 300);
        });

        gridEl.appendChild(card);
    });
}

// ---- 动物园渲染（替换原有函数） ----
function qaqRenderZooPage() {
    var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'animal'; });
    var gridEl = document.getElementById('qaq-zoo-animals-grid');
    var emptyEl = document.getElementById('qaq-zoo-animals-empty');
    var sceneEl = document.getElementById('qaq-zoo-scene');

    gridEl.innerHTML = '';
    sceneEl.querySelectorAll('.qaq-sprite-container, .qaq-scene-tip, .qaq-live2d-loading').forEach(function(el) {
        el.remove();
    });

    if (!owned.length) {
        emptyEl.style.display = '';
        sceneEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    sceneEl.style.display = '';

    var tip = document.createElement('div');
    tip.className = 'qaq-scene-tip';
    tip.textContent = '点击动物互动';
    sceneEl.appendChild(tip);

    var sceneWidth = sceneEl.clientWidth || 300;
    var spacing = sceneWidth / (owned.length + 1);

    owned.forEach(function(item, idx) {
        var catItem = qaqShopCatalog.animals.find(function(x) { return x.id === item.id; });
        var state = qaqGetSpriteState(item.id);
        var mood = state.mood || 50;

        var happySvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8c34f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e8c34f" stroke="none"/><path d="M8 15s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/></svg>';
        var neutralSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e88d4f" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#e88d4f" stroke="none"/><line x1="9" y1="15" x2="15" y2="15" stroke-linecap="round"/></svg>';
        var sadSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.2" fill="#999" stroke="none"/><circle cx="15" cy="10" r="1.2" fill="#999" stroke="none"/><path d="M8 17s1.5-2 4-2 4 2 4 2" stroke-linecap="round"/></svg>';
        var moodEmoji = mood >= 80 ? happySvg : (mood >= 50 ? neutralSvg : sadSvg);

        var svgFn = qaqAnimalSVGs[item.id];
        if (svgFn) {
            qaqCreateSpriteInScene(
                sceneEl, svgFn(1),
                spacing * (idx + 1) - 20, 10,
                catItem ? catItem.name : item.name,
                item.id,'animal'
            );
        }

        var card = document.createElement('div');
        card.className = 'qaq-garden-card';
        card.innerHTML =
            '<div class="qaq-garden-card-icon">' +(catItem ? catItem.svg.replace(/width="32"/g, 'width="48"').replace(/height="32"/g, 'height="48"') : '') +
            '</div>' +
            '<div class="qaq-garden-card-name">' + (catItem ? catItem.name : item.name) + '</div>' +
            '<div class="qaq-garden-card-mood">' + moodEmoji + '</div>' +
            '<div class="qaq-garden-card-status">心情 ' + mood + '%</div>';

        card.addEventListener('click', function() {
            qaqPetAnimal(
                sceneEl.querySelector('[data-item-id="' + item.id + '"]') || card,
                item.id
            );
            setTimeout(qaqRenderZooPage, 300);
        });

        gridEl.appendChild(card);
    });
}

// ---- 在场景中展示 Live2D ----
async function qaqShowLive2DInScene(canvasId, sceneEl, modelUrl, modelName) {
    var loadingEl = document.createElement('div');
    loadingEl.className = 'qaq-live2d-loading';
    sceneEl.appendChild(loadingEl);

    //懒加载 Live2D 库
    await new Promise(function(resolve) { qaqEnsureLive2D(resolve); });

    try {
        var w = sceneEl.clientWidth;
        var h = sceneEl.clientHeight;
        var app = qaqCreateLive2DApp(canvasId, w, h);
        if (!app) throw new Error('PixiJS 初始化失败');

        var model = await qaqLoadLive2DModel(app, modelUrl, {
            scale: 0.12,
            x: w / 2,
            y: h * 0.92
        });

        if (!model) throw new Error('模型加载失败');

        loadingEl.remove();
        qaqToast(modelName + ' 已加载');} catch(err) {
        console.error('Live2D 加载错误:', err);
        loadingEl.remove();
        qaqToast('Live2D 加载失败: ' + (err.message || '未知错误'));
    }
}


// ---- 全部浇水 / 全部喂食 ----
var gardenWaterAllBtn = document.getElementById('qaq-garden-water-all-btn');
if (gardenWaterAllBtn) {
    gardenWaterAllBtn.addEventListener('click', function() {
        var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'seed'; });
        if (!owned.length) return qaqToast('没有可浇水的植物');

        owned.forEach(function(item) {
            var state = qaqGetSpriteState(item.id);
            state.growth = Math.min(100, (state.growth || 0) + 10);
            state.lastWater = Date.now();
            qaqSaveSpriteState(item.id, state);
        });

        qaqAddPoints(owned.length);
        qaqRenderGardenPage();
        qaqToast('全部浇水完成 +' + owned.length + ' 积分');
    });
}

var zooFeedAllBtn = document.getElementById('qaq-zoo-feed-all-btn');
if (zooFeedAllBtn) {
    zooFeedAllBtn.addEventListener('click', function() {
        var owned = qaqGetOwnedItems().filter(function(x) { return x.type === 'animal'; });
        if (!owned.length) return qaqToast('没有可喂食的动物');

        owned.forEach(function(item) {
            var state = qaqGetSpriteState(item.id);
            state.mood = Math.min(100, (state.mood || 50) + 10);
            state.lastFeed = Date.now();
            qaqSaveSpriteState(item.id, state);
        });

        qaqAddPoints(owned.length);
        qaqRenderZooPage();
        qaqToast('全部喂食完成 +' + owned.length + ' 积分');
    });
}

/* ===== 完整升级版：全方位分模块数据导出导入清除 ===== */
function qaqGetDataModules() {
    return {
        'all': {
            name: '全部数据',
            keys: function() {
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                    if (localStorage.key(i).indexOf('qaq') === 0) keys.push(localStorage.key(i));
                }
                return keys;
            }
        },
        'wordbank': {
            name: '词库',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k === 'qaq-wordbooks' || k === 'qaq-wordbank-theme'; });
            }
        },
        'review': {
            name: '背单词设置与小说',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k.indexOf('qaq-word-review') === 0 || k.indexOf('qaq-review-story') === 0; });
            }
        },
        'study': {
            name: '学习数据与积分',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k === 'qaq-study-log' || k === 'qaq-point-ledger' || k === 'qaq-daily-word-point-progress' || k === 'qaq-points' || k === 'qaq-token-total'; });
            }
        },
        'garden': {
            name: '小院桌宠数据',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k === 'qaq-owned-items' || k === 'qaq-sprite-states' || k === 'qaq-mine-active-pet' || k === 'qaq-pet-settings' || k === 'qaq-pet-float-state' || k === 'qaq-mine-profile'; });
            }
        },
        'cache': {
            name: '3D模型及基础设置',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k === 'qaq-3d-model-cache' || k === 'qaq-3d-settings' || k === 'qaq-theme' || k === 'qaq-api-config' || k === 'qaq-hidden-apps'; });
            }
        },
        'plan': {
            name: '日常规划',
            keys: function() {
                return Object.keys(localStorage).filter(function(k) { return k === 'qaq-plans' || k === 'qaq-plan-categories' || k === 'qaq-plan-theme'; });
            }
        },
        'audio': {
            name: '语音缓存库',
            keys: function() { return []; }, // 强行把这个脱离普通的表，独立管理
            customExport: async function() {
                if (!window.qaqAudioCache) return {};
                return await new Promise(async function(resolve) {
                    try {
                        var allData = await window.qaqAudioCache.getAllAsBase64();
                        resolve({ '__QAQ_AUDIO_CACHE__': allData });
                    } catch(e) { resolve({}); }
                });
            },
            customImport: async function(data) {
                if (!window.qaqAudioCache || !data['__QAQ_AUDIO_CACHE__']) return;
                await window.qaqAudioCache.importFromBase64(data['__QAQ_AUDIO_CACHE__']);
            }
        }
    };
}

async function qaqExportDataModule(moduleId) {
    if (window.qaqShowImportProgress) window.qaqShowImportProgress('正在打包数据...', '可能需要一点时间');
    if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(20, '正在读取表格...');
    
    try {
        var modules = qaqGetDataModules();
        var module = modules[moduleId];
        if (!module) return;

        var data = {};
        
        // 1. 导出常规 LocalStorage 表区
        var keys = module.keys();
        keys.forEach(function(key) {
            data[key] = localStorage.getItem(key);
        });
        
        // 2. 若涉及 IndexedDB 则读取二进制大文件流区
        if (module.customExport) {
            if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(50, '正在下载语音文件...');
            var customData = await module.customExport();
            Object.assign(data, customData);
        }
        
        // 3. All 的强行连锅端扫描
        if (moduleId === 'all') {
            for (var id in modules) {
                if (id !== 'all' && modules[id].customExport) {
                    if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(70, '读取语音缓存中...');
                    var cData = await modules[id].customExport();
                    Object.assign(data, cData);
                }
            }
        }

        if (Object.keys(data).length === 0) {
            if (window.qaqHideImportProgress) window.qaqHideImportProgress();
            return qaqToast('该模块暂无数据');
        }

        if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(95, '正在打包 JSON');
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'qaq-backup-' + moduleId + '-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.qaqHideImportProgress) window.qaqHideImportProgress();
        qaqToast(module.name + ' 数据已为您导出');
    } catch(e) {
        if (window.qaqHideImportProgress) window.qaqHideImportProgress();
        qaqToast('导出失败: ' + e.message);
    }
}

async function qaqImportDataModule(file, moduleId) {
    if (window.qaqShowImportProgress) window.qaqShowImportProgress('数据导入中', '正在分析文件...');
    
    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(30, '分析结构...');
            var data = JSON.parse(e.target.result);
            var modules = qaqGetDataModules();
            var module = modules[moduleId];
            
            if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(60, '正在逐步导入...');
            
            if (moduleId === 'all') {
                var allKeys = Object.keys(data);
                for (var i = 0; i < allKeys.length; i++) {
                    if (allKeys[i].indexOf('qaq') === 0) localStorage.setItem(allKeys[i], data[allKeys[i]]);
                }
                for (var id in modules) {
                    if (id !== 'all' && modules[id].customImport) {
                        await modules[id].customImport(data);
                    }
                }
            } else {
                var validKeys = module.keys ? module.keys() : [];
                Object.keys(data).forEach(function(key) {
                    if (validKeys.indexOf(key) > -1) localStorage.setItem(key, data[key]);
                });
                if (module.customImport) await module.customImport(data);
            }
            
            if (window.qaqUpdateImportProgress) window.qaqUpdateImportProgress(100, '全部导入完成！');
            if (window.qaqHideImportProgress) setTimeout(window.qaqHideImportProgress, 200);
            
            qaqToast(module.name + ' 导入成功，即将刷新页面... ');
            setTimeout(function() { location.reload(); }, 1200);
        } catch (err) {
            console.error(err);
            if (window.qaqHideImportProgress) window.qaqHideImportProgress();
            qaqToast('格式损坏：文件格式无法阅读');
        }
    };
    reader.readAsText(file);
}

// 修改掉底层清空数据那个毁灭按钮，顺手把 IndexedDB 拆房式爆爆破
document.getElementById('qaq-set-clearall').addEventListener('click', function () {
    qaqConfirm('清空', '警告：此操作亦会清空语音与3D缓存，不可逆！确定吗？', async function () {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).indexOf('qaq') === 0) keys.push(localStorage.key(i));
        }
        keys.forEach(function (key) { localStorage.removeItem(key); });
        
        if (window.qaqAudioCache && window.qaqAudioCache.clearAll) {
            await window.qaqAudioCache.clearAll();
        }
        
        qaqToast('数据已清空');
        setTimeout(function () { location.reload(); }, 1200);
    });
});

function qaqOpenExportModal() {
    var modules = qaqGetDataModules();
    
    modalTitle.textContent = '数据导出';
    modalBody.innerHTML = 
        '<div class="qaq-settings-group-card">' +
        Object.keys(modules).map(function(id) {
            var module = modules[id];
            var count = module.keys().length;
            return (
                '<div class="qaq-settings-item" data-export-module="' + id + '">' +
                    '<div class="qaq-settings-item-text">' + module.name + '</div>' +
                    '<div style="font-size:11px;color:#999;">' + count + ' 项</div>' +
                    '<svg class="qaq-settings-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">' +
                        '<polyline points="9,6 15,12 9,18" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</div>'
            );
        }).join('') +
        '</div>';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    modalBody.querySelectorAll('[data-export-module]').forEach(function(item) {
        item.addEventListener('click', function() {
            var moduleId = this.dataset.exportModule;
            qaqExportDataModule(moduleId);
        });
    });
}

function qaqOpenImportModal() {
    var modules = qaqGetDataModules();
    
    modalTitle.textContent = '数据导入';
    modalBody.innerHTML = 
        '<div class="qaq-settings-group-card">' +
        Object.keys(modules).map(function(id) {
            var module = modules[id];
            return (
                '<div class="qaq-settings-item" data-import-module="' + id + '">' +
                    '<div class="qaq-settings-item-text">' + module.name + '</div>' +
                    '<svg class="qaq-settings-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">' +
                        '<polyline points="9,6 15,12 9,18" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</div>'
            );
        }).join('') +
        '</div>' +
        '<input type="file" id="qaq-import-file-picker" accept=".json" style="display:none;">';

    modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">关闭</button>';
    qaqOpenModal();

    document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

    var filePicker = document.getElementById('qaq-import-file-picker');
    var selectedModule = null;

    modalBody.querySelectorAll('[data-import-module]').forEach(function(item) {
        item.addEventListener('click', function() {
            selectedModule = this.dataset.importModule;
            filePicker.click();
        });
    });

    filePicker.onchange = function() {
        if (this.files && this.files[0] && selectedModule) {
            qaqImportDataModule(this.files[0], selectedModule);
            qaqCloseModal();
        }
        this.value = '';
    };
}

// ===== Android 全屏适配 =====
(function androidFullscreen() {
    const phoneFrame = document.querySelector('.qaq-phone-frame');
    if (!phoneFrame) return;

    // 1. 真实视口高度（解决地址栏收缩问题）
    function setRealVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--qaq-vh', vh + 'px');
        phoneFrame.style.height = window.innerHeight + 'px';
    }

    setRealVH();
    window.addEventListener('resize', setRealVH);

    // 部分安卓浏览器 resize 不触发，用 visualViewport 兜底
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setRealVH);
    }

    // 2. 尝试进入全屏模式（需要用户手势触发）
    function tryFullscreen() {
    const el = document.documentElement;
const rfs = el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
    
    if (rfs) {
        try {
            var ret = rfs.call(el);
            if (ret && typeof ret.catch === 'function') {
                ret.catch(function () {});
            }
        } catch (e) {}
    }
}

    // 3. 监听全屏状态变化
    function onFullscreenChange() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        phoneFrame.classList.toggle('qaq-fullscreen', isFS);
        // 全屏后重新算高度
        setTimeout(setRealVH, 100);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // 4. 双击顶部状态栏区域切换全屏
    const statusBar = document.querySelector('.qaq-status-bar');
    if (statusBar) {
        let lastTap = 0;
        statusBar.addEventListener('click', function () {
            const now = Date.now();
            if (now - lastTap < 300) {
                const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
                if (isFS) {
                    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                } else {
                    tryFullscreen();
                }
            }
            lastTap = now;
        });
    }

    // 5. 首次触摸时尝试全屏（安卓要求用户手势）
    let firstTouch = true;
    document.addEventListener('touchstart', function () {
        if (firstTouch) {
            firstTouch = false;
            tryFullscreen();
        }
    }, { once: true });

    // 6. 软键盘弹出适配（安卓输入框聚焦时视口会缩小）
    const inputs = phoneFrame.querySelectorAll('input, textarea');
    inputs.forEach(function (input) {
        input.addEventListener('focus', function () {
            setTimeout(function () {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });

        input.addEventListener('blur', function () {
            // 键盘收起后恢复高度
            setTimeout(setRealVH, 200);
        });
    });

    // 7. 阻止双指缩放（保持 UI 一致性）
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, false);

})();

function qaqRenderPetFloatTo(floatId, avatarId) {
    var pet = qaqGetActivePet();
    var floatEl = document.getElementById(floatId);
    if (!floatEl) return;

    if (!pet || !pet.id) {
        floatEl.style.display = 'none';
        return;
    }
    
    // 显示浮窗，并设置基础尺寸
    floatEl.style.display = '';
    var avatarEl = document.getElementById(avatarId);
    if(avatarEl) {
       avatarEl.style.width = '75px';
       avatarEl.style.height = '75px';
    }

    // 🌟 召唤万能渲染器接管一切
    qaqRenderVisualToDOM(avatarId, pet.id, 'animal', 0.9, qaqGetDisplayMode(), true);
}

function qaqRenderWordbankPetFloat() {
    qaqRenderPetFloatTo('qaq-wordbank-pet-float', 'qaq-wordbank-pet-avatar');
    qaqBindPetFloatDragAndScale('qaq-wordbank-pet-float', 'wordbank');
}

function qaqRenderReviewPetFloat() {
    qaqRenderPetFloatTo('qaq-review-pet-float', 'qaq-review-pet-avatar');
    qaqBindPetFloatDragAndScale('qaq-review-pet-float', 'review');
}

function qaqGetPetModelUrl(itemId) {
    return qaqGet3DModelUrl(itemId);
}

/* ===== 万能渲染引擎 (自动降级: 3D -> Lottie -> Static) ===== */
function qaqRenderVisualToDOM(containerId,itemId,type,scale,preferredMode,silent) {
    silent = !!silent;
    var container=document.getElementById(containerId);
    if(!container) return;

    container.innerHTML='';

    var has3D=!!qaqGet3DModelUrl(itemId);
    var hasLottie=!!(window.qaqLotties&&window.qaqLotties[itemId]);

    var mode=preferredMode||'static';
if(mode==='3d'&&!has3D) mode=hasLottie?'lottie':'static';
if(mode==='lottie'&&!hasLottie) mode='static';

// 小院/桌宠这种小尺寸场景不要弹全屏进度层，也不要默认跑多个 3D
// 3D 在小院里很容易多 canvas 多动画导致卡顿，静默场景优先降级到 Lottie 或静态
if (silent && mode === '3d') {
    mode = hasLottie ? 'lottie' : 'static';
}

    function openModeSwitch(){
        qaqOpenXiaoyuanRenderModeQuickSwitch(type);
    }

    if(mode==='3d'){
        qaqOpenXiaoyuanLoadProgress('加载3D模型','正在准备3D引擎...',function(){
            container.innerHTML='';
            qaqToast('已取消3D加载');
        },function(){
            openModeSwitch();
        });
        qaqEnsureThreeJS(function(pct){
            qaqUpdateXiaoyuanLoadProgress(Math.min(90,pct||0),'正在加载3D引擎...');
        },function(){
            var canvasId='cvs-' + itemId + '-' + Date.now();
            container.innerHTML='<canvas id="' + canvasId + '"></canvas>';
            var w=container.clientWidth||75;
            var h=container.clientHeight||75;
            container.style.width=w+'px';
            container.style.height=h+'px';
            qaqUpdateXiaoyuanLoadProgress(95,'正在渲染3D模型...');
            setTimeout(function(){
                qaqRenderMini3D(canvasId,itemId,w,h);
                qaqUpdateXiaoyuanLoadProgress(100,'3D模型加载完成');
                setTimeout(qaqCloseXiaoyuanLoadProgress,180);
            },120);
        });
        return;
    }

    if(mode==='lottie'){
    // 静默模式：小院/桌宠用，不弹全屏加载层
    if (silent) {
        container.innerHTML =
            '<lottie-player src="' + window.qaqLotties[itemId] + '" ' +
            'background="transparent" speed="1" ' +
            'style="width:100%;height:100%;pointer-events:none;" loop autoplay>' +
            '</lottie-player>';

        qaqEnsureLottie(function(){
            // 引擎加载完后再保险刷新一次
            if (!document.body.contains(container)) return;
            container.innerHTML =
                '<lottie-player src="' + window.qaqLotties[itemId] + '" ' +
                'background="transparent" speed="1" ' +
                'style="width:100%;height:100%;pointer-events:none;" loop autoplay>' +
                '</lottie-player>';

            if(container.parentElement&&container.parentElement.classList){
                container.parentElement.classList.remove('qaq-walking');
            }
        });

        return;
    }

    // 非静默模式：商店详情等大预览才显示进度层
    qaqOpenXiaoyuanLoadProgress('加载动态资源','正在准备Lottie引擎...',function(){
        container.innerHTML='';
        qaqToast('已取消动态资源加载');
    },function(){
        openModeSwitch();
    });

    qaqUpdateXiaoyuanLoadProgress(10,'正在加载动画引擎...');

    qaqEnsureLottie(function(){
        qaqUpdateXiaoyuanLoadProgress(75,'正在装配动画...');
        container.innerHTML =
            '<lottie-player src="' + window.qaqLotties[itemId] + '" ' +
            'background="transparent" speed="1" ' +
            'style="width:100%;height:100%;pointer-events:none;" loop autoplay>' +
            '</lottie-player>';

        if(container.parentElement&&container.parentElement.classList){
            container.parentElement.classList.remove('qaq-walking');
        }

        qaqUpdateXiaoyuanLoadProgress(100,'动态资源加载完成');
        setTimeout(qaqCloseXiaoyuanLoadProgress,180);
    });

    return;
}

    var svgHtml='';

    if(type==='plant'&&qaqPlantSVGs[itemId]){
        svgHtml=qaqPlantSVGs[itemId](scale||1);
    }else if(type==='animal'&&qaqAnimalSVGs[itemId]){
        svgHtml=qaqAnimalSVGs[itemId](scale||1);
    }else if(type==='item'&&qaqItemSVGs[itemId]){
        svgHtml=qaqItemSVGs[itemId](scale||1);
    }else{
        var fallbackItem=null;
        if(type==='plant'){
            fallbackItem=(qaqShopCatalog.seeds||[]).find(function(x){return x.id===itemId;});
        }else if(type==='animal'){
            fallbackItem=(qaqShopCatalog.animals||[]).find(function(x){return x.id===itemId;});
        }else if(type==='item'){
            fallbackItem=(qaqShopCatalog.items||[]).find(function(x){return x.id===itemId;});
        }
        svgHtml=fallbackItem?(fallbackItem.svg||''):'';
    }

    container.innerHTML=svgHtml;
}

/* --- 配合万能渲染器的专属 3D 迷你加载器 --- */
function qaqRenderMini3D(canvasId, itemId, width, height) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.8);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    var dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 3, 2);
    scene.add(dir);

    var group = new THREE.Group();
    scene.add(group);

    qaq3DLoadGLB({ id: itemId, type: 'pet', name: 'pet' }, group).then(function() {
        group.position.y = -0.3; // 防止越界
        function animate() {
            if (!document.body.contains(canvas)) {
                try { renderer.dispose(); } catch (e) {} return;
            }
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        animate();
    });
}

var qaqPetEncourageTexts = [
    '好棒，继续冲呀！',
    '我就知道你可以！',
    '又记住一个啦！',
    '今天状态真不错～',
    '继续保持这个节奏！',
    '太厉害了，稳稳进步！',
    '你正在一点点变强！',
    '再来一个也没问题！'
];

var _qaqPetBubbleTimer = null;

function qaqShowPetEncourageBubble(level, wordObj) {
    try {
        var bubbleEl = null;
        var floatEl = null;
        var avatarEl = null; // ★ 锁定对应头像

        // 安全地获取各种页面元素，防崩溃
        var reviewFloat = document.getElementById('qaq-review-pet-float');
        var wordbankFloat = document.getElementById('qaq-wordbank-pet-float');
        var pageReview = document.getElementById('qaq-word-review-page');
        var pageWordbank = document.getElementById('qaq-wordbank-page');

        if (reviewFloat && reviewFloat.style.display !== 'none' && pageReview && pageReview.classList.contains('qaq-page-show')) {
            floatEl = reviewFloat;
            bubbleEl = document.getElementById('qaq-review-pet-bubble');
            avatarEl = document.getElementById('qaq-review-pet-avatar');
        } else if (wordbankFloat && wordbankFloat.style.display !== 'none' && pageWordbank && pageWordbank.classList.contains('qaq-page-show')) {
            floatEl = wordbankFloat;
            bubbleEl = document.getElementById('qaq-wordbank-pet-bubble');
            avatarEl = document.getElementById('qaq-wordbank-pet-avatar');
        }

        if (!floatEl || !bubbleEl) return;

        var fallbackMap = {
            known: [
                '太棒了，这个你掌握得很好！',
                '厉害呀，这个词你已经很熟啦！',
                '表现真好，继续保持！'
            ],
            vague: [
                '没关系，已经有印象了，再来几次就稳了。',
                '你已经在进步啦，再看一眼就会更牢。',
                '别急，这种状态最容易提升。'
            ],
            unknown: [
                '没关系，我们一个个来。',
                '不会也正常，我陪你继续记。',
                '别灰心，这个词下次就会熟一点。'
            ]
        };

        var text = '';
        if (wordObj) {
            if (level === 'known') text = wordObj.petMsgKnown || '';
            if (level === 'vague') text = wordObj.petMsgVague || '';
            if (level === 'unknown') text = wordObj.petMsgUnknown || '';
        }

        if (!text) {
            var arr = fallbackMap[level] || fallbackMap.known;
            text = arr[Math.floor(Math.random() * arr.length)];
        }

        bubbleEl.textContent = text;
        bubbleEl.style.display = '';

        // ★ 蹦极鼓励一下
        if (avatarEl && (level === 'known' || level === 'vague')) {
            avatarEl.classList.remove('qaq-pet-jump');
            void avatarEl.offsetWidth; // 触发页面重绘强制重置动画
            avatarEl.classList.add('qaq-pet-jump');
            // 等跳跃完了把清理工作收个尾，浮动接管
            setTimeout(function(){
                avatarEl.classList.remove('qaq-pet-jump');
            }, 550);
        }

        clearTimeout(_qaqPetBubbleTimer);
        _qaqPetBubbleTimer = setTimeout(function () {
            bubbleEl.style.display = 'none';
        }, 2300);
        
    } catch (e) {
        // 利用 Try Catch 兜底，即使 UI 层面报错，也绝不阻塞背单词往下切
        console.error("桌宠气泡展示出错:", e);
    }
}

/* ===== 词库语言切换 ===== */
(function () {
    var langSwitch = document.getElementById('qaq-wordbank-lang-switch');
    var langLabel = document.getElementById('qaq-wordbank-lang-label');

    function updateLangLabel() {
        var lang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';
        var cfg = window.qaqWordbankLangConfig ? window.qaqWordbankLangConfig[lang] : null;
        if (langLabel && cfg) {
            langLabel.textContent = cfg.flag + ' ' + cfg.name;
        }
    }

    if (langSwitch) {
        langSwitch.addEventListener('click', function () {
            var langs = Object.keys(window.qaqWordbankLangConfig || {});
            var currentLang = window.qaqGetWordbankLanguage ? window.qaqGetWordbankLanguage() : 'en';

            modalTitle.textContent = '切换词库语言';
            modalBody.innerHTML = '<div class="qaq-custom-select-list">' +
                langs.map(function (lang) {
                    var cfg = window.qaqWordbankLangConfig[lang];
                    var isActive = lang === currentLang;
                    return '<div class="qaq-custom-select-option' +
                        (isActive ? ' qaq-custom-select-active' : '') +
                        '" data-lang="' + lang + '">' +
                        '<span>' + cfg.flag + ' ' + cfg.name + '</span>' +
                        (isActive ? '<span style="color:#c47068;">✓</span>' : '') +
                        '</div>';
                }).join('') +
                '</div>' +
                '<div style="padding:10px 4px 0;font-size:11px;color:#999;line-height:1.6;">' +
                    '切换语言会影响：<br>' +
                    '• 导入时的词条识别规则<br>' +
                    '• AI 智能导入的提示词<br>' +
                    '• 背单词时的音标/例句生成<br>' +
                    '• 朗读发音的语言<br>' +
                    '• 小说生成的目标语言' +
                '</div>';

            modalBtns.innerHTML = '<button class="qaq-modal-btn qaq-modal-btn-cancel" id="qaq-modal-cancel">取消</button>';
            qaqOpenModal();
            document.getElementById('qaq-modal-cancel').onclick = qaqCloseModal;

            modalBody.querySelectorAll('.qaq-custom-select-option').forEach(function (opt) {
                opt.addEventListener('click', function () {
                    var newLang = this.dataset.lang;
                    if (window.qaqSaveWordbankLanguage) window.qaqSaveWordbankLanguage(newLang);
                    updateLangLabel();
                    qaqCloseModal();
                    
                    // 【新增：刷新词库主页和背单词主页视图】
                    var search = document.getElementById('qaq-wordbook-search');
                    if (window.qaqRenderWordbookHome) {
                        window.qaqRenderWordbookHome(search ? search.value : '');
                    }
                    if (window.qaqRenderReviewHome) {
                        window.qaqRenderReviewHome();
                    }
                    
                    qaqToast('已切换到' + window.qaqWordbankLangConfig[newLang].name + '词库模式');
                });
            });
        });
    }

    // 页面初始化时更新标签
    updateLangLabel();
})();

// 替换原有的导出导入事件
document.getElementById('qaq-set-export').addEventListener('click', function() {
    qaqOpenExportModal();
});

document.getElementById('qaq-set-import').addEventListener('click', function() {
    qaqOpenImportModal();
});
// ==========================================
// ===== 暴露给 review.js 调用的全局共享函数 =====
// ==========================================
window.qaqAddTokens = qaqAddTokens;
window.qaqRenderReviewPetFloat = qaqRenderReviewPetFloat;
window.qaqShowPetEncourageBubble = qaqShowPetEncourageBubble;
window.qaqLogStudySession = qaqLogStudySession;
})();

