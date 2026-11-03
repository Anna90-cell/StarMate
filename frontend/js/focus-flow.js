/*!
 * StarMate · C 模块 · 专注结束后的「一站式提交」（focus-flow.js）
 *
 * 把一次专注的结果按后端约定的顺序发出去：
 *   ① POST /api/focus/session   → 拿 session_id
 *   ② POST /api/mood ×2         → before / after（D 的后端要求 mood_before/mood_after
 *                                  这两个字段必须存在，没选就发 null，不能省略）
 *   ③ POST /api/reward/claim    → 结算经验
 *
 * 用法（页面里只要两行）：
 *   StarMateFocus.on('finish', StarMateFocusFlow.saveSession);
 *
 * 返回值：Promise<{session_id, reward} | null>，null 表示整条流程没走通。
 */
(function (global) {
  'use strict';

  var inFlight = false;

  function moodOf(stage) {
    var m = global.StarMateMood;
    if (!m || typeof m.get !== 'function') return null;
    var v = m.get(stage);
    return v === undefined || v === null || v === '' ? null : v;
  }

  function toast(text, ms) {
    if (global.StarMateGrowth && typeof global.StarMateGrowth.toast === 'function') {
      return global.StarMateGrowth.toast(text, ms);
    }
    if (global.console) console.warn(text);
  }

  /** 组装 /api/focus/session 的请求体（字段名严格按 docs/api-contract.md） */
  function buildPayload(result) {
    result = result || {};
    return {
      task: result.task || '未命名任务',
      planned_minutes: result.plannedMinutes,
      actual_minutes: result.actualMinutes,
      completed: !!result.completed,
      started_at: result.startedAt,
      mood_before: moodOf('before'),
      mood_after: moodOf('after')
    };
  }

  /**
   * @param {object} result  StarMateFocus 的 finish 载荷
   * @param {object} [options] { quiet: 不弹提示, claim: 是否结算（默认 true） }
   */
  function saveSession(result, options) {
    options = options || {};
    var api = global.StarMateC;

    if (!api) {
      toast('没找到 StarMateC（c-api.js 没引入？）');
      return Promise.resolve(null);
    }
    // 同一个页面连点两次「提前结束」时，避免重复提交
    if (inFlight) return Promise.resolve(null);
    inFlight = true;

    var payload = buildPayload(result);
    var sessionId = null;

    return api.post('/api/focus/session', payload)
      .then(function (saved) {
        sessionId = saved && saved.session_id;
        if (!sessionId) throw new Error('后端没有返回 session_id');
        return submitMoods(sessionId, payload);
      })
      .then(function () {
        if (options.claim === false) return null;
        return global.StarMateGrowth.settle(sessionId);
      })
      .then(function (reward) {
        if (reward && reward.earned_exp === 0 && !options.quiet) {
          toast('本次专注没满 25 分钟，没有经验值');
        }
        return { session_id: sessionId, reward: reward };
      })
      .catch(function (err) {
        // 已经领过：不算失败，刷新一下数据就好
        if (err && /已经领取|ALREADY_CLAIMED/.test(err.message || '')) {
          toast('这次专注的奖励已经领过啦');
          if (global.StarMateGrowth) global.StarMateGrowth.refresh();
          return { session_id: sessionId, reward: null, already: true };
        }
        toast('保存失败：' + (err && err.message ? err.message : err), 4000);
        if (global.console) console.error('[focus-flow]', err);
        return null;
      })
      .then(function (out) {
        inFlight = false;
        return out;
      });
  }

  /**
   * 情绪单独失败不让整条流程失败（记录已经存下了，情绪可以事后补）。
   * 注意：必须一条一条串行发，不能 Promise.all 并发。
   * 后端每次请求都是「读 JSON → 改 → 写回」，两个请求同时到会互相覆盖，
   * 实测并发时 before 那条会丢。串行就没有这个问题。
   */
  function submitMoods(sessionId, payload) {
    var mood = global.StarMateMood;
    if (!mood || typeof mood.submit !== 'function') return Promise.resolve();

    var chain = Promise.resolve();
    function step(stage, value) {
      if (value === null || value === undefined) return;
      chain = chain.then(function () {
        return mood.submit(sessionId, stage, value).catch(function (e) {
          if (global.console) console.warn('[focus-flow] 情绪提交失败（不影响主流程）', e);
        });
      });
    }
    step('before', payload.mood_before);
    step('after', payload.mood_after);
    return chain;
  }

  global.StarMateFocusFlow = {
    saveSession: saveSession,
    buildPayload: buildPayload
  };
})(typeof window !== 'undefined' ? window : this);
