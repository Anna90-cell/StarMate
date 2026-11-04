/*!
 * StarMate · 伙伴数据统一入口（companion-store.js）
 *
 * 为什么要有这个文件：
 *   以前每个页面各自读 localStorage 里的 starMateData，
 *   换一台电脑或清掉浏览器缓存后，形象、名字、背景就全丢了，
 *   而后端其实已经保存了这些数据。
 *
 * 现在的规则：
 *   1. 伙伴数据（name / avatar_id / room / pet_state）一律以后端为准，
 *      统一走 GET /api/companion；
 *   2. localStorage 只作为"后端请求失败时"的离线兜底，不再是数据源；
 *   3. 任何修改都先 PUT /api/companion 落盘，成功后再更新本地缓存。
 *
 * 用法（传统脚本，挂在 window 上，ES Module 页面也能直接用）：
 *   const companion = await StarMateCompanion.load();
 *   StarMateCompanion.applyRoomBackground(el, companion.room);
 *   await StarMateCompanion.savePetState('happy');
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'starMateData';
  var DEFAULT_AVATAR = 'character-01';
  var DEFAULT_ROOM = 'background1';
  var DEFAULT_PET_STATE = 'idle';

  // 房间背景：键名同时兼容创建页用过的 background1/2/3 与后端默认的 default
  var ROOM_BACKGROUNDS = {
    'default': 'linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)',
    background1: 'linear-gradient(135deg, #c9c3e5, #ead9e9, #b9c9df)',
    background2: 'linear-gradient(135deg, #d9c5b7, #f0dfc9, #b8cbbd)',
    background3: 'linear-gradient(135deg, #222c52, #626b9c, #b5a4ce)'
  };

  // 状态 -> 素材目录（frontend/assets/characters/states/）
  var STATE_FOLDERS = {
    idle: 'idle',
    study: 'learning',
    happy: 'happy',
    rest: 'resting',
    sleep: 'sleeping'
  };

  var store = {};
  var cached = null;

  function readCache() {
    try {
      var raw = global.localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(companion) {
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify({
        name: companion.name || '',
        avatar_id: companion.avatar_id || DEFAULT_AVATAR,
        room: companion.room || DEFAULT_ROOM,
        pet_state: companion.pet_state || DEFAULT_PET_STATE
      }));
    } catch (error) {
      // 隐私模式下 localStorage 可能不可写，忽略即可，不影响主流程
    }
  }

  function request(path, options) {
    // 优先复用 c-api.js 的统一封装；它只在部分页面引入，缺失时退回 fetch
    if (global.StarMateC && typeof global.StarMateC.request === 'function') {
      return global.StarMateC.request(path, options);
    }

    options = options || {};
    var init = {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    if (options.body !== undefined && options.body !== null) {
      init.body = JSON.stringify(options.body);
    }

    return global.fetch(path, init).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (result) {
        if (!response.ok || result.success === false) {
          var info = result.error || {};
          throw new Error(info.message || '请求失败（HTTP ' + response.status + '）');
        }
        return result.data;
      });
    });
  }

  function normalize(data) {
    data = data && typeof data === 'object' ? data : {};
    return {
      name: data.name || '我的伙伴',
      avatar_id: data.avatar_id || DEFAULT_AVATAR,
      room: ROOM_BACKGROUNDS[data.room] ? data.room : DEFAULT_ROOM,
      pet_state: STATE_FOLDERS[data.pet_state] ? data.pet_state : DEFAULT_PET_STATE,
      level: data.level,
      exp: data.exp,
      exists: true
    };
  }

  /**
   * 读取伙伴数据，后端优先。
   * @returns {Promise<object|null>} 尚未创建伙伴时返回 null
   */
  store.load = function () {
    return request('/api/companion', { method: 'GET' }).then(function (data) {
      // 后端明确返回 null：伙伴确实还没创建，清掉旧缓存避免显示幽灵数据
      if (!data) {
        cached = null;
        return null;
      }

      cached = normalize(data);
      writeCache(cached);
      return cached;
    }).catch(function (error) {
      console.error('伙伴资料加载失败，尝试使用本地缓存：', error);

      var fallback = readCache();
      if (!fallback) {
        return null;
      }

      cached = normalize(fallback);
      return cached;
    });
  };

  /** 同步取最近一次 load() 的结果，拿不到就用缓存，始终返回可用默认值。 */
  store.current = function () {
    return cached || normalize(readCache() || {});
  };

  /** 把伙伴字段保存到后端，成功后同步本地缓存。 */
  store.save = function (fields) {
    return request('/api/companion', { method: 'PUT', body: fields })
      .then(function (data) {
        cached = normalize(Object.assign({}, store.current(), fields));
        writeCache(cached);
        return data;
      });
  };

  /** 保存娱乐空间最近一次的桌宠状态。 */
  store.savePetState = function (state) {
    if (!STATE_FOLDERS[state]) {
      return Promise.reject(new Error('未知的桌宠状态：' + state));
    }
    return store.save({ pet_state: state });
  };

  /** 基础立绘路径。 */
  store.avatarImage = function (avatarId) {
    return 'assets/characters/' + (avatarId || DEFAULT_AVATAR) + '.png';
  };

  /** 指定状态的桌宠立绘路径。 */
  store.stateImage = function (avatarId, state) {
    var folder = STATE_FOLDERS[state] || STATE_FOLDERS[DEFAULT_PET_STATE];
    return 'assets/characters/states/' + folder + '/' +
      (avatarId || DEFAULT_AVATAR) + '.png';
  };

  /** 把房间背景应用到指定元素；element 为空时安全跳过。 */
  store.applyRoomBackground = function (element, room) {
    if (!element) {
      return;
    }
    element.style.background =
      ROOM_BACKGROUNDS[room] || ROOM_BACKGROUNDS[DEFAULT_ROOM];
  };

  /** 把房间背景铺满整个页面（专注空间用）。 */
  store.applyPageBackground = function (room) {
    var background = ROOM_BACKGROUNDS[room] || ROOM_BACKGROUNDS[DEFAULT_ROOM];
    var body = global.document && global.document.body;

    if (!body) {
      return;
    }

    body.style.backgroundImage = background;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundAttachment = 'fixed';
    body.style.minHeight = '100vh';
  };

  store.ROOM_BACKGROUNDS = ROOM_BACKGROUNDS;
  store.STATE_FOLDERS = STATE_FOLDERS;
  store.DEFAULT_AVATAR = DEFAULT_AVATAR;

  global.StarMateCompanion = store;
})(typeof window !== 'undefined' ? window : this);
