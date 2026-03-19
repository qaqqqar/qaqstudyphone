const CACHE_NAME = 'qaq-pwa-v1';

// 需要缓存的核心资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './manifest.json'
];

// CDN 资源（运行时缓存）
const CDN_HOSTS = [
  'cdn.jsdelivr.net'
];

// ===== 安装：预缓存核心资源 =====
self.addEventListener('install', function (event) {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      // 跳过等待，立即激活
      return self.skipWaiting();
    })
  );
});

// ===== 激活：清理旧缓存 =====
self.addEventListener('activate', function (event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function () {
      // 立即控制所有页面
      return self.clients.claim();
    })
  );
});

// ===== 拦截请求 =====
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 跳过 chrome-extension 等非 http(s)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // API 请求不缓存（包含 api. 或 /v1/ 的外部请求）
  if (isApiRequest(url)) return;

  // CDN 资源：缓存优先，回退网络
  if (isCdnResource(url)) {
    event.respondWith(cacheFirstThenNetwork(request));
    return;
  }

  // 本地资源：网络优先，回退缓存（保证更新及时）
  event.respondWith(networkFirstThenCache(request));
});

// ===== 策略：缓存优先（适合 CDN 不常变的资源） =====
function cacheFirstThenNetwork(request) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      // 后台更新缓存
      fetchAndCache(request);
      return cached;
    }
    return fetchAndCache(request);
  });
}

// ===== 策略：网络优先（适合本地频繁修改的资源） =====
function networkFirstThenCache(request) {
  return fetch(request)
    .then(function (response) {
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        // 如果是导航请求，返回缓存的首页
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    });
}

// ===== 辅助：fetch 并存入缓存 =====
function fetchAndCache(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, clone);
      });
    }
    return response;
  }).catch(function () {
    return caches.match(request);
  });
}

// ===== 判断是否 API 请求 =====
function isApiRequest(url) {
  var host = url.hostname.toLowerCase();
  var path = url.pathname.toLowerCase();

  // 常见 AI API 地址
  if (host.indexOf('api.') === 0) return true;
  if (host.indexOf('openai') > -1) return true;
  if (host.indexOf('minimax') > -1) return true;
  if (path.indexOf('/v1/') > -1 && path.indexOf('/chat/') > -1) return true;
  if (path.indexOf('/models') > -1) return true;

  return false;
}

// ===== 判断是否 CDN 资源 =====
function isCdnResource(url) {
  var host = url.hostname.toLowerCase();
  for (var i = 0; i < CDN_HOSTS.length; i++) {
    if (host.indexOf(CDN_HOSTS[i]) > -1) return true;
  }
  return false;
}

// ===== 接收主线程消息 =====
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(function () {
      console.log('[SW] Cache cleared');
    });
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});