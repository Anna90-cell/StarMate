
// window.StarMatePet = {
//     currentState: "idle",

//     setState: function (name) {
//         this.currentState = name;

//         console.log("伙伴当前状态：", name);
//     }
// };

/*!
 * StarMate · C 模块 · 统一请求封装（c-api.js）
 *
 * 为什么要有这个文件：
 *   后端地址只在这里写一次，以后改端口只改这一行。
 *   所有请求都走同样的“成功/失败”判断，出错信息也只在一处处理。
 *
 * 用法：
 *   StarMateC.get('/api/reward')
 *   StarMateC.post('/api/mood', { session_id: 'session_001', stage: 'before', mood: 2 })
 */
(function (global) {
  'use strict';

  var API_BASE = '';

  var api = {};

  api.setBase = function (url) {
    API_BASE = String(url).replace(/\/+$/, '');
  };

  /**
   * 发一个请求，成功返回 data，失败抛出 Error（message 就是给人看的中文提示）。
   * @param {string} path  例如 '/api/mood'
   * @param {{method?: string, body?: object}} options
   */
  api.request = function (path, options) {
    options = options || {};
    var url = /^https?:\/\//.test(path) ? path : API_BASE + path;

    var init = {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    if (options.body !== undefined && options.body !== null) {
      init.body = JSON.stringify(options.body);
    }

    return fetch(url, init).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (result) {
          if (!response.ok || result.success === false) {
            var info = result.error || {};
            var message = info.message || '请求失败（HTTP ' + response.status + '）';
            var err = new Error(message);
            err.status = response.status;
            err.code = info.code;
            throw err;
          }
          return result.data;
        });
    });
  };

  api.get = function (path) {
    return api.request(path, { method: 'GET' });
  };

  api.post = function (path, body) {
    return api.request(path, { method: 'POST', body: body });
  };

  api.put = function (path, body) {
    return api.request(path, { method: 'PUT', body: body });
  };

  global.StarMateC = api;
})(typeof window !== 'undefined' ? window : this);
