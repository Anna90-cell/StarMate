/*!
 * StarMate · C 模块 · 情绪温度计（mood.js）
 *
 * 负责：1~5 五档情绪的数据结构、专注前/后各选一次、算前后变化、提交给后端。
 * 数值约定（和接口文档完全一致，不要改）：
 *   1 = 非常低落  2 = 有点疲惫  3 = 比较平静  4 = 心情不错  5 = 非常开心
 *
 * 给 A 的用法（两种都行）：
 *   1) 自己在按钮上写 data-mood="1" ~ "5"，然后：
 *      StarMateMood.bind('#moodBefore', { stage: 'before', onChange: function (v) { ... } });
 *   2) 完全自己写点击逻辑，只调用：
 *      StarMateMood.set('before', 2);
 *
 * 提交给 D：
 *   StarMateMood.submit(sessionId, 'before', 2)
 *   -> POST /api/mood  { session_id, stage: 'before', mood: 2 }
 */
(function (global) {
  'use strict';

  var LEVELS = [
    { value: 1, label: '非常低落', emoji: '😞' },
    { value: 2, label: '有点疲惫', emoji: '😔' },
    { value: 3, label: '比较平静', emoji: '😐' },
    { value: 4, label: '心情不错', emoji: '🙂' },
    { value: 5, label: '非常开心', emoji: '😄' }
  ];

  var current = { before: null, after: null };
  var handlers = []; // 供 bind() 使用

  function isValid(value) {
    return Number.isInteger(value) && value >= 1 && value <= 5;
  }

  function levelOf(value) {
    return LEVELS[value - 1] || null;
  }

  function set(stage, value) {
    if (stage !== 'before' && stage !== 'after') {
      throw new Error('stage 只能是 before 或 after');
    }
    var num = Number(value);
    if (!isValid(num)) {
      throw new Error('mood 必须是 1 到 5 的整数');
    }
    current[stage] = num;
    handlers.forEach(function (h) {
      if (h.stage === stage) h.cb(num, levelOf(num));
    });
    return num;
  }

  function get(stage) {
    return current[stage];
  }

  function reset() {
    current.before = null;
    current.after = null;
  }

  /** 前后情绪变化：正数代表变好了，负数代表变差了，null 代表还没选完 */
  function diff() {
    if (current.before === null || current.after === null) return null;
    return current.after - current.before;
  }

  function describeDiff() {
    var d = diff();
    if (d === null) return '还没有完成前后两次情绪记录';
    if (d > 0) return '专注之后心情提升了 ' + d + ' 档';
    if (d < 0) return '专注之后心情下降了 ' + Math.abs(d) + ' 档';
    return '专注前后心情差不多，保持稳定';
  }

  /** 给 B 的 AI 用：把两个数字打包成上下文 */
  function toContext() {
    return {
      mood_before: current.before,
      mood_after: current.after,
      mood_change: diff()
    };
  }

  function submit(sessionId, stage, value) {
    var mood = value === undefined ? current[stage] : Number(value);
    return global.StarMateC.post('/api/mood', {
      session_id: sessionId,
      stage: stage,
      mood: mood
    });
  }

  /**
   * 把一组按钮变成“单选”的情绪选择器。
   * @param {string|Element} container 容器
   * @param {{stage:'before'|'after', onChange?:Function}} options
   */
  function bind(container, options) {
    options = options || {};
    var root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) {
      console.warn('[mood] 找不到容器：', container);
      return null;
    }
    var stage = options.stage === 'after' ? 'after' : 'before';

    function paint(value) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-mood]'), function (btn) {
        btn.classList.toggle('is-selected', Number(btn.getAttribute('data-mood')) === value);
        btn.setAttribute('aria-pressed', String(Number(btn.getAttribute('data-mood')) === value));
      });
    }

    root.addEventListener('click', function (event) {
      var btn = event.target.closest ? event.target.closest('[data-mood]') : null;
      if (!btn || !root.contains(btn)) return;

      event.preventDefault();
      event.stopPropagation();

      var value = Number(btn.getAttribute('data-mood'));
      set(stage, value);
      paint(value);
      if (typeof options.onChange === 'function') options.onChange(value, levelOf(value));
    });

    if (options.onChange) handlers.push({ stage: stage, cb: options.onChange });
    if (current[stage] !== null) paint(current[stage]);
    return { stage: stage, element: root, set: function (v) { set(stage, v); paint(v); } };
  }

  global.StarMateMood = {
    LEVELS: LEVELS,
    set: set,
    get: get,
    reset: reset,
    isValid: isValid,
    levelOf: levelOf,
    diff: diff,
    describeDiff: describeDiff,
    toContext: toContext,
    submit: submit,
    bind: bind
  };
})(typeof window !== 'undefined' ? window : this);