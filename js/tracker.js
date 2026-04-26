/* ============================================
   CCD Session Tracker
   Stores quiz attempts in sessionStorage so
   they persist across pages in one browser tab.
   ============================================ */
var CCDTracker = (function () {
  'use strict';
  var KEY = 'ccd_quiz_attempts';

  function getAll() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); }
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
    try { sessionStorage.setItem(KEY, JSON.stringify(attempts)); }
    catch (e) { /* storage full – silently skip */ }
  }

  /* Best percent per chapter+set combo (for summary display) */
  function bestByExam() {
    var map = {};
    getAll().forEach(function (a) {
      var key = a.chapter + '-' + a.set;
      if (!map[key] || a.percent > map[key].percent) map[key] = a;
    });
    return map;
  }

  /* Average score across best attempts per chapter */
  function chapterAverages() {
    var best = bestByExam();
    var ch = {};
    Object.values(best).forEach(function (a) {
      if (!ch[a.chapter]) ch[a.chapter] = { sum: 0, count: 0, title: a.chapterTitle };
      ch[a.chapter].sum += a.percent;
      ch[a.chapter].count++;
    });
    var avgs = {};
    Object.keys(ch).forEach(function (c) {
      avgs[c] = { avg: Math.round(ch[c].sum / ch[c].count), title: ch[c].title, count: ch[c].count };
    });
    return avgs;
  }

  return { getAll: getAll, record: record, bestByExam: bestByExam, chapterAverages: chapterAverages };
})();
