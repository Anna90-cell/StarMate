/*!
 * StarMate · C 模块 · 伙伴成长系统（growth.js）
 *
 * 负责：显示等级/经验、结算一次专注的奖励、升级提示。
 * 奖励规则（PDF + 接口文档）：
 *   完成一次 25 分钟专注      +10 EXP
 *   完成每日学习目标          +10 EXP
 *   连续完成两次专注          +5 EXP
 *   首次创建伙伴              +5 EXP
 * 等级：Lv.1=0  Lv.2=30  Lv.3=70  Lv.4=120  （后面每级 +60）
 *
 * 重要：升级永远由后端算（D 的 /api/reward/claim 返回 level），
 *      这里的 levelInfo() 只用来画进度条，不能作为“权威数据”。
 *
 * 给 A 的用法：
 *   StarMateGrowth.mount({ level:'#levelValue', exp:'#expValue',
 *                          next:'#nextLevelExp', bar:'#expBar' });
 *   StarMateGrowth.refresh();                      // 刷新成长数据
 *   StarMateGrowth.claim(sessionId)                // 专注结束后结算
 */
(function (global) {
  'use strict';

  // 必须和 services/growth_service.py 里的 LEVEL_THRESHOLDS 保持一致
  var LEVEL_THRESHOLDS = [0, 30, 70, 120, 180, 250];

  var elements = {};
  var lastLevel = null;

  function floorOf(level) {
    var list = LEVEL_THRESHOLDS.slice();
    while (list.length < level) list.push(list[list.length - 1] + 60);
    return list[level - 1];
  }

  /** 只用来画界面：根据经验值估算当前等级和下一级门槛 */
  function levelInfo(exp) {
    exp = Math.max(0, Number(exp) || 0);
    var level = 1;
    while (floorOf(level + 1) !== undefined && exp >= floorOf(level + 1)) level += 1;

    var floor = floorOf(level);
    var next = exp >= floorOf(LEVEL_THRESHOLDS.length) ? floor + 60 : floorOf(level + 1);
    var span = Math.max(1, next - floor);
    return {
      level: level,
      exp: exp,
      levelFloor: floor,
      nextLevelExp: next,
      expToNext: Math.max(0, next - exp),
      percent: Math.min(100, Math.round(((exp - floor) / span) * 100))
    };
  }

  /* ---------------- 接口 ---------------- */

  function fetchReward() {
    return global.StarMateC.get('/api/reward');
  }

  /**
   * 结算一次专注奖励。同一个 session_id 只能领一次（后端负责去重）。
   * @returns {Promise<{earned_exp:number,total_exp:number,level:number,leveled_up:boolean}>}
   */
  function claim(sessionId) {
    if (!sessionId) return Promise.reject(new Error('缺少 session_id，无法结算奖励'));
    return global.StarMateC.post('/api/reward/claim', { session_id: sessionId });
  }

  /* ---------------- 显示 ---------------- */

  function resolve(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      try {
        return document.querySelector(target);
      } catch (e) {
        return null;
      }
    }
    return target;
  }

  function mount(map) {
    map = map || {};
    elements = {
      level: resolve(map.level),
      exp: resolve(map.exp),
      next: resolve(map.next),
      bar: resolve(map.bar)
    };
    return elements;
  }

  function render(data, silent) {
    if (!data) return null;
    var info = data.level && data.next_level_exp
      ? {
          level: data.level,
          exp: data.exp,
          nextLevelExp: data.next_level_exp,
          expToNext: Math.max(0, data.next_level_exp - data.exp),
          percent: Math.min(
            100,
            Math.round(((data.exp - floorOf(data.level)) / Math.max(1, data.next_level_exp - floorOf(data.level))) * 100)
          )
        }
      : levelInfo(data.exp || 0);

    if (elements.level) elements.level.textContent = 'Lv.' + info.level;
    if (elements.exp) elements.exp.textContent = info.exp;
    if (elements.next) elements.next.textContent = info.nextLevelExp;
    if (elements.bar) {
      if (String(elements.bar.tagName).toUpperCase() === 'PROGRESS') {
        elements.bar.value = info.percent;
        elements.bar.max = 100;
      } else {
        elements.bar.style.width = info.percent + '%';
      }
    }

    // 第一次渲染不提示升级
    if (!silent && lastLevel !== null && info.level > lastLevel) {
      toast('🎉 升级啦！现在是 Lv.' + info.level);
    }
    lastLevel = info.level;
    return info;
  }

  function refresh() {
    return fetchReward().then(render);
  }

  function toast(text, ms) {
    var box = document.createElement('div');
    box.className = 'sm-toast';
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(function () {
      box.classList.add('is-hide');
      setTimeout(function () {
        box.remove();
      }, 300);
    }, ms || 2200);
    return box;
  }

  /**
   * 一站式：结算 -> 刷新界面 -> 提示用户
   * 专注结束后 C 调用这个就够了。
   */
  function settle(sessionId) {
    return claim(sessionId).then(function (data) {
      // 先用后端返回的真实经验值刷新界面（render 内部会在升级时提示一次）
      if (data && typeof data.total_exp === 'number') {
        render({ level: data.level, exp: data.total_exp }, true);
      }
      if (data && data.earned_exp > 0) {
        toast('经验 +' + data.earned_exp + ' EXP');
      }
      if (data && data.leveled_up) {
        toast('🎉 升级啦！现在是 Lv.' + data.level, 3000);
        if (global.StarMatePet && typeof global.StarMatePet.setState === 'function') {
          global.StarMatePet.setState('happy');
        }
      }
      return data;
    });
  }

  global.StarMateGrowth = {
    levelInfo: levelInfo,
    fetchReward: fetchReward,
    claim: claim,
    settle: settle,
    refresh: refresh,
    render: render,
    mount: mount,
    toast: toast
  };
})(typeof window !== 'undefined' ? window : this);