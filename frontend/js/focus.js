/*!
 * StarMate · C 模块 · 番茄钟（focus.js）
 *
 * 负责：25 分钟倒计时、开始 / 暂停 / 继续 / 提前结束、进度条、实际专注时长。
 * 不负责：页面长什么样（那是 A 的事）、数据存到哪个文件（那是 D 的事）。
 *
 * 关键设计（对应 PDF 里的“建议使用开始时间戳计算剩余时间”）：
 *   每次都用「结束时间戳 - 现在」重新算剩余秒数，
 *   所以浏览器切到后台、标签页被挂起，回来时时间也是准的。
 *
 * 给 A 的接口：
 *   StarMateFocus.mount({ time:'#timer', progress:'#bar', task:'#task', status:'#status',
 *                         startBtn:'#btnStart', pauseBtn:'#btnPause',
 *                         resumeBtn:'#btnResume', endBtn:'#btnEnd', taskInput:'#taskInput' })
 *   元素可以传选择器字符串，也可以直接传 DOM 元素；不需要的就不传。
 *
 * 给 A / D 的事件：
 *   StarMateFocus.on('finish', function (result) { ... })
 *   result = { reason, completed, task, plannedMinutes, actualMinutes, startedAt, endedAt }
 *
 * 给 A 的桌宠联动（见 C-给团队的交接说明）：
 *   本文件会在开始/结束时调用 window.StarMatePet.setState('study' / 'happy' / 'idle')
 *   A 只要在 pet.js 里实现这个函数即可，没实现也不会报错。
 */
(function (global) {
  'use strict';

  var DEFAULT_FOCUS_MINUTES = 25;
  var TICK_MS = 250; // 250 毫秒刷新一次，显示更顺滑，也不会太耗性能

  var config = {
    focusMinutes: DEFAULT_FOCUS_MINUTES,
    demoSeconds: 0 // >0 时用“秒”代替“分钟”，现场演示用（25 秒）
  };

  var state = {
    status: 'idle', // idle | running | paused | finished
    task: '',
    totalSeconds: 0,
    remainingSeconds: 0,
    endAt: 0,
    startedAt: null,
    demo: false
  };

  var timerId = null;
  var listeners = {};

  /* ---------------- 事件 ---------------- */

  function on(event, handler) {
    if (typeof handler !== 'function') return function () {};
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (h) {
        return h !== handler;
      });
    };
  }

  function emit(event, payload) {
    (listeners[event] || []).slice().forEach(function (handler) {
      try {
        handler(payload);
      } catch (e) {
        console.error('[focus] 事件 ' + event + ' 的处理函数出错：', e);
      }
    });
  }

  /* ---------------- 工具 ---------------- */

  function totalSeconds() {
    return config.demoSeconds > 0 ? config.demoSeconds : config.focusMinutes * 60;
  }

  function remainingNow() {
    if (state.status !== 'running') return state.remainingSeconds;
    return Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
  }

  function formatTime(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }

  function setPet(name) {
    if (global.StarMatePet && typeof global.StarMatePet.setState === 'function') {
      global.StarMatePet.setState(name);
    }
  }

  function snapshot() {
    var remaining = state.status === 'running' ? remainingNow() : state.remainingSeconds;
    var percent = 0;
    if (state.totalSeconds > 0) {
      percent = Math.min(100, Math.max(0, Math.round((1 - remaining / state.totalSeconds) * 100)));
    }
    return {
      status: state.status,
      task: state.task,
      totalSeconds: state.totalSeconds,
      remainingSeconds: remaining,
      percent: percent,
      timeText: formatTime(remaining),
      startedAt: state.startedAt,
      demo: state.demo
    };
  }

  /* ---------------- 计时循环 ---------------- */

  function stopTicking() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTicking() {
    stopTicking();
    timerId = setInterval(tick, TICK_MS);
  }

  function tick() {
    state.remainingSeconds = remainingNow();
    emit('tick', snapshot());
    if (state.remainingSeconds <= 0) finish('completed');
  }

  /* ---------------- 对外动作 ---------------- */

  function start(task) {
    if (state.status === 'running') return snapshot();
    if (state.status === 'paused') return resume();

    state.task = String(task === undefined || task === null ? state.task : task).trim();
    state.totalSeconds = totalSeconds();
    state.remainingSeconds = state.totalSeconds;
    state.demo = config.demoSeconds > 0;
    state.startedAt = new Date().toISOString();
    state.status = 'running';
    state.endAt = Date.now() + state.totalSeconds * 1000;

    startTicking();
    emit('start', snapshot());
    emit('tick', snapshot());
    setPet('study');
    return snapshot();
  }

  function pause() {
    if (state.status !== 'running') return snapshot();
    state.remainingSeconds = remainingNow();
    state.status = 'paused';
    stopTicking();
    emit('pause', snapshot());
    emit('tick', snapshot());
    return snapshot();
  }

  function resume() {
    if (state.status !== 'paused') return snapshot();
    state.status = 'running';
    state.endAt = Date.now() + state.remainingSeconds * 1000;
    startTicking();
    emit('resume', snapshot());
    emit('tick', snapshot());
    setPet('study');
    return snapshot();
  }

  function endEarly() {
    return finish('ended_early');
  }

  function finish(reason) {
    if (state.status === 'idle' || state.status === 'finished') return snapshot();

    var left = state.status === 'running' ? remainingNow() : state.remainingSeconds;
    stopTicking();

    var spentSeconds = Math.max(0, state.totalSeconds - left);
    var plannedMinutes = config.focusMinutes; // 演示模式也按“计划 25 分钟”记录，日记才完整
    var actualMinutes;
    if (state.demo) {
      actualMinutes = reason === 'completed' ? plannedMinutes : Math.max(1, Math.round(spentSeconds / 60));
    } else {
      actualMinutes = Math.max(0, Math.round(spentSeconds / 60));
    }

    state.remainingSeconds = state.totalSeconds;
    state.status = 'finished';
    state.totalSeconds = state.totalSeconds || plannedMinutes * 60;

    var result = {
      reason: reason, // 'completed' 自然结束 / 'ended_early' 提前结束
      completed: reason === 'completed',
      task: state.task,
      plannedMinutes: plannedMinutes,
      actualMinutes: actualMinutes,
      actualSeconds: spentSeconds,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      demo: state.demo
    };

    emit('finish', result);
    emit('tick', snapshot());
    setPet(result.completed ? 'happy' : 'idle');
    return snapshot();
  }


    function reset() {
        stopTicking();

        state.status = 'idle';
        state.task = '';

        // 恢复默认专注时长
        state.totalSeconds = config.focusMinutes * 60;
        state.remainingSeconds = state.totalSeconds;

        state.startedAt = null;
        state.demo = false;

        emit('reset', snapshot());
        emit('tick', snapshot());

        setPet('idle');
        return snapshot();
    }


  function configure(options) {
    options = options || {};
    if (typeof options.focusMinutes === 'number' && options.focusMinutes > 0) {
      config.focusMinutes = options.focusMinutes;
    }
    if (typeof options.demoSeconds === 'number' && options.demoSeconds >= 0) {
      config.demoSeconds = options.demoSeconds;
    }
    if (state.status === 'idle') {
      state.totalSeconds = totalSeconds();
      state.remainingSeconds = state.totalSeconds;
      emit('tick', snapshot());
    }
    return config;
  }

  /* ---------------- 可选：自动绑定页面元素 ---------------- */

  function resolve(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      // 选择器写错了不应该让整个页面崩掉，所以这里兜底
      try {
        return document.querySelector(target);
      } catch (e) {
        return null;
      }
    }
    return target;
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function setProgress(el, percent) {
    if (!el) return;
    if (String(el.tagName).toUpperCase() === 'PROGRESS') {
      el.value = percent;
      el.max = 100;
    } else {
      el.style.width = percent + '%';
    }
  }

  var STATUS_TEXT = {
    idle: '准备开始',
    running: '专注中',
    paused: '已暂停',
    finished: '本次结束'
  };

  function mount(elements) {
    elements = elements || {};
    var el = {
      time: resolve(elements.time),
      progress: resolve(elements.progress),
      task: resolve(elements.task),
      status: resolve(elements.status),
      taskInput: resolve(elements.taskInput),
      startBtn: resolve(elements.startBtn),
      pauseBtn: resolve(elements.pauseBtn),
      resumeBtn: resolve(elements.resumeBtn),
      endBtn: resolve(elements.endBtn)
    };

    on('tick', function (s) {
      setText(el.time, s.timeText);
      setProgress(el.progress, s.percent);
      setText(el.task, s.task || '还没有填写任务');
      setText(el.status, STATUS_TEXT[s.status] || s.status);
      if (el.startBtn) el.startBtn.disabled = s.status === 'running' || s.status === 'paused';
      if (el.pauseBtn) el.pauseBtn.disabled = s.status !== 'running';
      if (el.resumeBtn) el.resumeBtn.disabled = s.status !== 'paused';
      if (el.endBtn) el.endBtn.disabled = s.status === 'idle' || s.status === 'finished';
    });

    if (el.startBtn) {
      el.startBtn.addEventListener('click', function () {
        var task = el.taskInput ? el.taskInput.value : '';
        start(task);
      });
    }
    if (el.pauseBtn) el.pauseBtn.addEventListener('click', pause);
    if (el.resumeBtn) el.resumeBtn.addEventListener('click', resume);
    if (el.endBtn) el.endBtn.addEventListener('click', endEarly);

    emit('tick', snapshot());
    return el;
  }

  global.StarMateFocus = {
    start: start,
    pause: pause,
    resume: resume,
    endEarly: endEarly,
    reset: reset,
    configure: configure,
    mount: mount,
    on: on,
    getState: snapshot,
    getConfig: function () {
      return { focusMinutes: config.focusMinutes, demoSeconds: config.demoSeconds };
    },
    formatTime: formatTime,
    STATUS_TEXT: STATUS_TEXT
  };

  // 页面一打开就先显示 25:00，而不是 00:00
  state.totalSeconds = totalSeconds();
  state.remainingSeconds = state.totalSeconds;
})(typeof window !== 'undefined' ? window : this);