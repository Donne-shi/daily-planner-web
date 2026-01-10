const CACHE_NAME = 'daily-planner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/_expo/static/css/web-d908026a00332f3fc4d3163d3b8c0a6d.css',
  '/_expo/static/js/web/entry-263085e33e62635ddf58d2519a50628e.js'
];

// 安装事件：缓存资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存资源中...');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Service Worker: 部分资源缓存失败，继续运行', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 获取事件：优先使用缓存，缓存失败则从网络获取
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // 只缓存 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 对于 _expo 静态资源，使用缓存优先策略
  if (request.url.includes('/_expo/')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            // 缓存成功的响应
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            return response;
          });
        })
        .catch(() => {
          // 离线时返回缓存
          return caches.match(request);
        })
    );
    return;
  }

  // 对于 HTML 页面，使用网络优先策略
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        return caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            // 如果缓存也没有，返回首页
            return caches.match('/index.html');
          });
      })
  );
});

// 处理消息事件（用于更新提示）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
