/* 旅遊工具：倒數與提醒、出發前待辦、行程搜尋、當天路線、匯率與記帳分帳。
   純前端，資料只存在這支手機的 localStorage，不會上傳。依賴 index.html 的 D、PL、cityOf。 */
(function () {
  'use strict';
  try {
    var KEY = 'bkk-tools-v1';
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    var st = load();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
    st.todo = st.todo || {};
    st.members = (st.members && st.members.length === 4) ? st.members : ['成員1', '成員2', '成員3', '成員4'];
    st.exp = st.exp || [];
    st.rate = st.rate || '';

    /* ---------- 資料 ---------- */
    var DEPART = new Date('2026-12-06T22:30:00+08:00');
    var TODO = [
      { g: '要訂位／購票', items: [
        ['dib', 'Dib Bangkok｜12/08 17:30', '官網預約，只收信用卡或轉帳；預約頁 12/08 有開放時段'],
        ['su', 'Straight Up 日落節目｜12/08', '12 月場次尚未開放，開放後再訂；場次 18:00／18:20／18:35，每場限 10 人，250 THB'],
        ['tonkin', 'Tonkin Annam｜12/09 12:15', '電話 +66 93 469 2969；其他訂位管道沒查到'],
        ['rongros', 'RONGROS｜12/09 18:30（河景位）', '電話 +66 96 946 1785（Michelin、Time Out 一致），官網不能訂位'],
        ['aether', 'AETHER｜12/09 夜間', '線上或電話，訂位規則未證實；入場費說法不一（600 THB 或免費）'],
        ['abandoned', 'Abandoned Mansion｜12/08 19:45', '電話 02 259 7007；舞台前沙發區最低消費約 2,000 THB（待確認）'],
        ['skygallery', 'The Sky Gallery｜12/07 18:00', '官方管道訂位，要靠海景位'],
        ['sanctuary', '真理寺｜12/07 10:00', 'Klook／KKday 購票；官網沒列票價']
      ] },
      { g: '出發前再確認', items: [
        ['shops', '12/03 前後：12/07、12/10 店家 IG／FB 特殊營業時間', '補假與憲法日，大多沒查到公告'],
        ['wat', '鄭王廟實際關門與最後入場時間', '來源矛盾：17:30 或 18:00 閉廟'],
        ['ferry', '過河渡船末班（現場問）', '約 05:00–19:00，末班出發時間未證實'],
        ['costume', '泰服租借店位置與妝髮時長', '在 Tha Tien 側，預留 1 小時，位置未確認'],
        ['pokemon', 'Pokémon Center 開幕日', '官方只說 12 月開幕；12/08 前沒開就用備案'],
        ['nitan', 'Nitan 要去哪間分店', 'Pratumnak 或 Na Jomtien，營業時間不同'],
        ['khunya', '老奶奶餐廳正確店名與區域', '搜尋查不到營業資訊'],
        ['sustart', 'Straight Up 12 月何時開放預訂', '已確認週二可以，12/08 場次待開放']
      ] }
    ];

    /* ---------- 面板骨架 ---------- */
    var fab = document.createElement('button');
    fab.id = 'tfab'; fab.type = 'button'; fab.setAttribute('aria-label', '旅遊工具'); fab.setAttribute('aria-expanded', 'false'); fab.textContent = '🧰';
    var back = document.createElement('div'); back.className = 'tl-back';
    var panel = document.createElement('div'); panel.className = 'tl-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '旅遊工具');
    var TABS = [['count', '倒數'], ['todo', '待辦'], ['find', '搜尋'], ['route', '路線'], ['money', '記帳']];
    panel.innerHTML = '<div class="tl-head"><h2>旅遊工具</h2><button type="button" class="tl-x" aria-label="關閉">✕</button></div>' +
      '<div class="tl-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="false">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="tl-body" id="tl-body"></div>';
    document.body.appendChild(fab); document.body.appendChild(back); document.body.appendChild(panel);
    var body = panel.querySelector('#tl-body');
    var cur = 'count';

    function open(tab) {
      back.classList.add('on'); panel.classList.add('on'); fab.setAttribute('aria-expanded', 'true');
      show(tab || cur);
    }
    function close() { back.classList.remove('on'); panel.classList.remove('on'); fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
    fab.addEventListener('click', function () { open(); });
    back.addEventListener('click', close);
    panel.querySelector('.tl-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('on')) close(); });
    panel.querySelector('.tl-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) show(b.getAttribute('data-tab')); });

    function show(tab) {
      cur = tab;
      Array.prototype.forEach.call(panel.querySelectorAll('.tl-tabs button'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'); });
      ({ count: rCount, todo: rTodo, find: rFind, route: rRoute, money: rMoney })[tab]();
      body.scrollTop = 0;
    }

    /* ---------- 1. 倒數與提醒 ---------- */
    function rCount() {
      var now = new Date(), ms = DEPART - now, txt;
      if (ms > 0) {
        var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
        txt = '<div class="tl-big">' + d + ' 天 ' + h + ' 小時</div><div class="tl-note">距離 12/06 22:30 桃園起飛（CI837）</div>';
      } else {
        var end = new Date('2026-12-11T18:40:00+08:00');
        txt = '<div class="tl-big">' + (now < end ? '旅途中' : '已結束') + '</div><div class="tl-note">12/06 出發，12/11 18:40 抵達桃園</div>';
      }
      var left = 0, total = 0;
      TODO.forEach(function (g) { g.items.forEach(function (i) { total++; if (!st.todo[i[0]]) left++; }); });
      var next = [];
      TODO.forEach(function (g) { g.items.forEach(function (i) { if (!st.todo[i[0]] && next.length < 3) next.push(i); }); });
      var days = D.map(function (d) { return '<tr><td>' + esc(d.date) + '（' + esc(d.wd) + '）</td><td>' + esc(d.title) + '</td></tr>'; }).join('');
      body.innerHTML =
        '<div class="tl-sec"><h3>旅遊倒數</h3>' + txt + '</div>' +
        '<div class="tl-sec"><h3>最近要做的事（還剩 ' + left + '／' + total + ' 項）</h3>' +
        (next.length ? next.map(function (i) { return '<div class="tl-chk"><div><div class="tl-t">' + esc(i[1]) + '</div><div class="tl-s">' + esc(i[2]) + '</div></div></div>'; }).join('') : '<div class="tl-note">待辦都完成了。</div>') +
        '<div class="tl-row"><button type="button" class="tl-btn" data-go="todo">看全部待辦</button></div></div>' +
        '<div class="tl-sec"><h3>行程摘要</h3><table class="tl-tbl"><tbody>' + days + '</tbody></table></div>';
      body.querySelector('[data-go="todo"]').addEventListener('click', function () { show('todo'); });
    }

    /* ---------- 2. 出發前待辦 ---------- */
    function rTodo() {
      var total = 0, done = 0;
      TODO.forEach(function (g) { g.items.forEach(function (i) { total++; if (st.todo[i[0]]) done++; }); });
      body.innerHTML = '<div class="tl-note">已完成 ' + done + '／' + total + ' 項。勾選只存在這支手機。</div>' +
        TODO.map(function (g) {
          return '<div class="tl-sec"><h3>' + esc(g.g) + '</h3>' + g.items.map(function (i) {
            var on = !!st.todo[i[0]];
            return '<label class="tl-chk' + (on ? ' done' : '') + '"><input type="checkbox" data-id="' + i[0] + '"' + (on ? ' checked' : '') + '><span><span class="tl-t">' + esc(i[1]) + '</span><span class="tl-s" style="display:block">' + esc(i[2]) + '</span></span></label>';
          }).join('') + '</div>';
        }).join('') +
        '<div class="tl-row"><button type="button" class="tl-btn" id="tl-reset">全部取消勾選</button></div>';
      body.querySelectorAll('input[data-id]').forEach(function (c) {
        c.addEventListener('change', function () {
          var id = c.getAttribute('data-id');
          if (c.checked) st.todo[id] = 1; else delete st.todo[id];
          save(); c.closest('.tl-chk').classList.toggle('done', c.checked);
        });
      });
      body.querySelector('#tl-reset').addEventListener('click', function () { st.todo = {}; save(); rTodo(); });
    }

    /* ---------- 3. 行程搜尋 ---------- */
    function rFind() {
      body.innerHTML = '<div class="tl-row"><input class="tl-in w" id="tl-q" type="search" placeholder="搜尋景點、餐廳、備註…" autocomplete="off"></div><div id="tl-rs"><div class="tl-note">輸入關鍵字，點結果會跳到那一項。</div></div>';
      var q = body.querySelector('#tl-q'), rs = body.querySelector('#tl-rs');
      q.addEventListener('input', function () {
        var k = q.value.trim().toLowerCase();
        if (!k) { rs.innerHTML = '<div class="tl-note">輸入關鍵字，點結果會跳到那一項。</div>'; return; }
        var out = [];
        D.forEach(function (d) {
          d.items.forEach(function (it, i) {
            var hay = (it[0] + ' ' + it[1] + ' ' + (it[3] || '')).toLowerCase();
            if (hay.indexOf(k) >= 0) out.push({ d: d, i: i, it: it });
          });
        });
        if (!out.length) { rs.innerHTML = '<div class="tl-note">找不到「' + esc(q.value) + '」。</div>'; return; }
        rs.innerHTML = '<div class="tl-note">共 ' + out.length + ' 筆' + (out.length > 30 ? '，只顯示前 30 筆' : '') + '</div>' +
          out.slice(0, 30).map(function (r) {
            return '<button type="button" class="tl-res" data-t="it-' + r.d.no + '-' + r.i + '"><b>' + esc(r.d.date) + ' ' + esc(r.it[0]) + '</b>' + esc(r.it[1]) + (r.it[3] ? '<small>' + esc(r.it[3]) + '</small>' : '') + '</button>';
          }).join('');
      });
      rs.addEventListener('click', function (e) {
        var b = e.target.closest('.tl-res'); if (!b) return;
        var el = document.getElementById(b.getAttribute('data-t')); close();
        if (el) { el.scrollIntoView({ block: 'center' }); el.classList.remove('tl-flash'); void el.offsetWidth; el.classList.add('tl-flash'); }
      });
    }

    /* ---------- 4. 當天路線（Google 地圖） ---------- */
    function stopsFor(d) {
      var out = [];
      d.items.forEach(function (it) {
        var h = PL.find(function (r) { return it[1].indexOf(r[0]) >= 0; });
        if (h) { var nm = h[1][0]; if (out[out.length - 1] !== nm) out.push(nm); }
      });
      return out;
    }
    function qname(n, no) { return /Pattaya|Bangkok|Airport|曼谷/i.test(n) ? n : n + (no === 2 ? ' Pattaya' : ' Bangkok'); }
    function rRoute() {
      var cards = D.map(function (d) {
        var s = stopsFor(d);
        if (s.length < 2) return '';
        var names = s.map(function (n) { return qname(n, d.no); });
        var mid = names.slice(1, -1), cut = mid.length > 9;
        if (cut) mid = mid.slice(0, 9);
        var url = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(names[0]) + '&destination=' + encodeURIComponent(names[names.length - 1]) +
          (mid.length ? '&waypoints=' + mid.map(encodeURIComponent).join('%7C') : '') + '&travelmode=driving';
        return '<div class="tl-card"><b>' + esc(d.date) + '（' + esc(d.wd) + '）</b>　' + esc(d.title) + '<p>' + s.map(esc).join(' → ') + (cut ? '（中途站超過 9 個，只帶前 9 個）' : '') + '</p>' +
          '<a class="tl-btn pri" href="' + esc(url) + '" target="_blank" rel="noopener">在 Google 地圖開啟路線</a></div>';
      }).join('');
      body.innerHTML = '<div class="tl-note">依當天行程順序帶入地點，用店名搜尋，開出來要自己確認地點對不對；實際交通方式與時間請在地圖上調整。</div>' + (cards || '<div class="tl-note">沒有可用的路線。</div>');
    }

    /* ---------- 5. 匯率與記帳分帳 ---------- */
    function toC(x) { return Math.round(parseFloat(x) * 100); }
    function fmt(c) { return (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function calc() {
      var paid = [0, 0, 0, 0], share = [0, 0, 0, 0], total = 0;
      st.exp.forEach(function (e) {
        var n = e.parts.length; if (!n) return;
        var base = Math.floor(e.amt / n), rem = e.amt - base * n;
        e.parts.forEach(function (p, i) { share[p] += base + (i < rem ? 1 : 0); });
        paid[e.payer] += e.amt; total += e.amt;
      });
      var bal = paid.map(function (p, i) { return p - share[i]; });
      var cr = [], db = [];
      bal.forEach(function (b, i) { if (b > 0) cr.push({ i: i, v: b }); else if (b < 0) db.push({ i: i, v: -b }); });
      var pay = [];
      cr.sort(function (a, b) { return b.v - a.v; }); db.sort(function (a, b) { return b.v - a.v; });
      var ci = 0, di = 0;
      while (ci < cr.length && di < db.length) {
        var m = Math.min(cr[ci].v, db[di].v);
        pay.push({ from: db[di].i, to: cr[ci].i, v: m });
        cr[ci].v -= m; db[di].v -= m;
        if (!cr[ci].v) ci++; if (!db[di].v) di++;
      }
      return { paid: paid, share: share, bal: bal, total: total, pay: pay };
    }
    function twd(c) { var r = parseFloat(st.rate); return r > 0 ? '（約 NT$' + Math.round(c / 100 * r).toLocaleString('en-US') + '）' : ''; }
    function rMoney() {
      var r = calc(), M = st.members;
      var sel = M.map(function (m, i) { return '<option value="' + i + '">' + esc(m) + '</option>'; }).join('');
      var parts = M.map(function (m, i) { return '<label style="margin-right:10px;white-space:nowrap"><input type="checkbox" data-p="' + i + '" checked> ' + esc(m) + '</label>'; }).join('');
      body.innerHTML =
        '<div class="tl-sec"><h3>匯率（THB ↔ TWD）</h3><div class="tl-row"><label class="tl-note">1 THB =</label><input class="tl-in" id="tl-rate" type="number" step="0.001" min="0" style="width:90px" value="' + esc(st.rate) + '" placeholder="例如 0.9"><span class="tl-note">TWD</span><button type="button" class="tl-btn" id="tl-rup">更新匯率</button></div>' +
        '<div class="tl-note" id="tl-rmsg">匯率沒有預設值，請輸入或按「更新匯率」（需要網路）。</div>' +
        '<div class="tl-row"><input class="tl-in" id="tl-thb" type="number" min="0" placeholder="THB" style="width:110px"><span>＝</span><input class="tl-in" id="tl-twd" type="number" min="0" placeholder="TWD" style="width:110px"></div></div>' +
        '<div class="tl-sec"><h3>成員（4 人，可改名）</h3><div class="tl-row">' + M.map(function (m, i) { return '<input class="tl-in" data-m="' + i + '" value="' + esc(m) + '" style="width:23%;min-width:70px">'; }).join('') + '</div></div>' +
        '<div class="tl-sec"><h3>新增支出（THB）</h3><div class="tl-row"><input class="tl-in w" id="tl-ed" placeholder="項目（例：午餐）"><input class="tl-in" id="tl-ea" type="number" min="0" step="0.01" placeholder="金額" style="width:100px"><select class="tl-sel" id="tl-ep">' + sel + '</select><span class="tl-note">付款</span></div>' +
        '<div class="tl-note">分攤的人：</div><div class="tl-row">' + parts + '</div><div class="tl-row"><button type="button" class="tl-btn pri" id="tl-add">新增</button></div></div>' +
        '<div class="tl-sec"><h3>支出明細（' + st.exp.length + ' 筆）</h3>' +
        (st.exp.length ? st.exp.map(function (e, i) {
          return '<div class="tl-exp"><div>' + esc(e.desc) + '<small>' + esc(M[e.payer]) + ' 付，分攤：' + e.parts.map(function (p) { return esc(M[p]); }).join('、') + '</small></div><div style="text-align:right">฿' + fmt(e.amt) + '<br><button type="button" class="tl-btn" data-del="' + i + '" style="padding:2px 8px;margin-top:4px">刪除</button></div></div>';
        }).join('') : '<div class="tl-note">還沒有支出。金額以小數兩位計算。</div>') + '</div>' +
        (st.exp.length ? '<div class="tl-sec"><h3>統計</h3><div class="tl-note">總支出 ฿' + fmt(r.total) + twd(r.total) + '</div><table class="tl-tbl"><thead><tr><th></th><th class="n">已付</th><th class="n">應分攤</th><th class="n">差額</th></tr></thead><tbody>' +
          M.map(function (m, i) { return '<tr><td>' + esc(m) + '</td><td class="n">' + fmt(r.paid[i]) + '</td><td class="n">' + fmt(r.share[i]) + '</td><td class="n ' + (r.bal[i] >= 0 ? 'tl-pos' : 'tl-neg') + '">' + (r.bal[i] >= 0 ? '+' : '−') + fmt(Math.abs(r.bal[i])) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<h3 style="margin-top:10px">誰該付給誰</h3>' + (r.pay.length ? r.pay.map(function (p) { return '<div class="tl-note" style="font-size:14px;color:var(--ink)">' + esc(M[p.from]) + ' → ' + esc(M[p.to]) + '：฿' + fmt(p.v) + twd(p.v) + '</div>'; }).join('') : '<div class="tl-note">已平衡，沒有人需要付錢。</div>') + '</div>' : '') +
        '<div class="tl-row"><button type="button" class="tl-btn" id="tl-copy">複製明細</button><button type="button" class="tl-btn warn" id="tl-clear">清除全部支出</button></div><div class="tl-note" id="tl-msg">記帳只存在這支手機，4 個人的資料不會同步；可以複製明細貼到 LINE。</div>';

      var rate = body.querySelector('#tl-rate'), thb = body.querySelector('#tl-thb'), tw = body.querySelector('#tl-twd'), rmsg = body.querySelector('#tl-rmsg');
      rate.addEventListener('input', function () { st.rate = rate.value; save(); if (thb.value) thb.dispatchEvent(new Event('input')); });
      thb.addEventListener('input', function () { var x = parseFloat(thb.value), rr = parseFloat(st.rate); tw.value = (x >= 0 && rr > 0) ? (x * rr).toFixed(2) : ''; });
      tw.addEventListener('input', function () { var x = parseFloat(tw.value), rr = parseFloat(st.rate); thb.value = (x >= 0 && rr > 0) ? (x / rr).toFixed(2) : ''; });
      body.querySelector('#tl-rup').addEventListener('click', function () {
        rmsg.textContent = '更新中…';
        fetch('https://open.er-api.com/v6/latest/THB').then(function (x) { return x.json(); }).then(function (j) {
          var v = j && j.rates && j.rates.TWD;
          if (!v) throw new Error('no rate');
          st.rate = String(Math.round(v * 10000) / 10000); save(); rate.value = st.rate;
          rmsg.textContent = '已更新：1 THB = ' + st.rate + ' TWD（來源 open.er-api.com，僅供參考，實際以刷卡或換匯為準）。';
        }).catch(function () { rmsg.textContent = '更新失敗（可能沒有網路），請手動輸入匯率。'; });
      });
      Array.prototype.forEach.call(body.querySelectorAll('input[data-m]'), function (inp) {
        inp.addEventListener('change', function () { st.members[+inp.getAttribute('data-m')] = inp.value.trim() || ('成員' + (+inp.getAttribute('data-m') + 1)); save(); rMoney(); });
      });
      body.querySelector('#tl-add').addEventListener('click', function () {
        var desc = body.querySelector('#tl-ed').value.trim(), amt = toC(body.querySelector('#tl-ea').value), payer = +body.querySelector('#tl-ep').value;
        var ps = Array.prototype.map.call(body.querySelectorAll('input[data-p]:checked'), function (c) { return +c.getAttribute('data-p'); });
        var msg = body.querySelector('#tl-msg');
        if (!desc || !(amt > 0) || !ps.length) { msg.textContent = '請填項目、金額（大於 0），並至少選一位分攤的人。'; return; }
        st.exp.push({ desc: desc, amt: amt, payer: payer, parts: ps }); save(); rMoney();
      });
      Array.prototype.forEach.call(body.querySelectorAll('[data-del]'), function (b) {
        b.addEventListener('click', function () { st.exp.splice(+b.getAttribute('data-del'), 1); save(); rMoney(); });
      });
      body.querySelector('#tl-clear').addEventListener('click', function () {
        if (st.exp.length && confirm('確定要清除全部支出？無法復原。')) { st.exp = []; save(); rMoney(); }
      });
      body.querySelector('#tl-copy').addEventListener('click', function () {
        var rr = calc(), M2 = st.members, msg = body.querySelector('#tl-msg');
        var t = '曼谷行程記帳（THB）\n' + st.exp.map(function (e) { return e.desc + ' ฿' + fmt(e.amt) + '｜' + M2[e.payer] + ' 付｜分攤：' + e.parts.map(function (p) { return M2[p]; }).join('、'); }).join('\n') +
          '\n總計 ฿' + fmt(rr.total) + '\n' + (rr.pay.length ? rr.pay.map(function (p) { return M2[p.from] + ' → ' + M2[p.to] + '：฿' + fmt(p.v); }).join('\n') : '已平衡');
        function fallback() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); msg.textContent = '已複製。'; } catch (e) { msg.textContent = '複製失敗，請手動選取。'; } document.body.removeChild(ta); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { msg.textContent = '已複製，可以貼到 LINE。'; }, fallback); else fallback();
      });
    }
  } catch (err) {
    if (window.console) console.error('tools.js 載入失敗', err);
  }
})();
