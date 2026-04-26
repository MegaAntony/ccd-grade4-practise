/* ============================================
   CCD Progress Tracker
   Uses localStorage so scores persist across
   tabs, page reloads, and iOS Safari navigation.
   ============================================ */
var CCDTracker = (function () {
  'use strict';
  var KEY = 'ccd_quiz_attempts';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function record(data) {
    var attempts = getAll();
    attempts.push({
      chapter:      data.chapter,
      set:          data.set,
      chapterTitle: data.chapterTitle,
      setTitle:     data.setTitle,
      score:        data.score,
      total:        data.total,
      percent:      Math.round((data.score / data.total) * 100),
      ts:           Date.now()
    });
    try { localStorage.setItem(KEY, JSON.stringify(attempts)); }
    catch (e) { /* storage full – silently skip */ }
  }

  function clearAll() {
    try { localStorage.removeItem(KEY); }
    catch (e) {}
  }

  /* Best percent per chapter+set combo */
  function bestByExam() {
    var map = {};
    getAll().forEach(function (a) {
      var key = String(a.chapter) + '-' + String(a.set);
      if (!map[key] || a.percent > map[key].percent) map[key] = a;
    });
    return map;
  }

  /* Average score across best attempts per chapter */
  function chapterAverages() {
    var best = bestByExam();
    var ch = {};
    var keys = Object.keys(best);
    for (var i = 0; i < keys.length; i++) {
      var a = best[keys[i]];
      var cid = String(a.chapter);
      if (!ch[cid]) ch[cid] = { sum: 0, count: 0, title: a.chapterTitle };
      ch[cid].sum += a.percent;
      ch[cid].count++;
    }
    var avgs = {};
    var ckeys = Object.keys(ch);
    for (var j = 0; j < ckeys.length; j++) {
      var c = ckeys[j];
      avgs[c] = { avg: Math.round(ch[c].sum / ch[c].count), title: ch[c].title, count: ch[c].count };
    }
    return avgs;
  }

  return { getAll: getAll, record: record, clearAll: clearAll, bestByExam: bestByExam, chapterAverages: chapterAverages };
})();
