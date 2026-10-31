/* 旅遊工具：倒數與提醒、出發前待辦、探索（搜尋＋篩選）、收藏、當天路線、換算計算機、旅費（規劃預算／實際記帳分帳）。
   純前端，資料只存在這支手機的 localStorage，不會上傳。依賴 index.html 的 D、PL、ALT。 */
(function () {
  'use strict';
  try {
    var KEY = 'bkk-tools-v1';
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    var st = load();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
    st.todo = st.todo || {};
    st.fav = st.fav || {};
    st.members = (st.members && st.members.length === 4) ? st.members : ['成員1', '成員2', '成員3', '成員4'];
    st.exp = st.exp || [];
    st.rate = st.rate || '';
    st.mode = st.mode || 'act';
    st.dir = st.dir || 'thb';

    /* ---------- 資料 ---------- */
    var DEPART = new Date('2026-12-06T22:30:00+08:00');
    var CATS = ['餐飲/咖啡', '景點/門票', '交通', '住宿', '購物', '其他'];
    var KIND = { eat: '餐飲', go: '景點', move: '移動', rest: '休息' };
    var TODO = [
      { g: '要訂位／購票', items: [
        ['dib', '✅ 已訂位｜Dib Bangkok｜12/08 17:00', '官網預約 17:00 時段（沒有就 17:30），只收信用卡或轉帳，不可退款；預約頁 12/08 有開放時段'],
        ['su', 'Straight Up 日落節目｜12/08', '12 月場次尚未開放，開放後再訂；場次 18:00／18:20／18:35，每場限 10 人，250 THB'],
        ['rongros', '✅ 已訂位｜RONGROS｜12/09 17:30（河景位）', '電話 +66 96 946 1785，官網不能訂位；訂不到改訂備案 Chom Arun +66 95 446 4199'],
        ['lonlon', '✅ 已訂位｜Lon Lon Local Diner｜12/10 18:00', '備案 Rongsi Pochana Langsuan 02 121 4287；已訂位就不用打'],
        ['aether', 'AETHER｜12/08 20:00 夜間', '線上或電話，訂位規則未證實；入場費說法不一（600 THB 或免費）'],
        ['skygallery', '✅ 已訂位｜The Sky Gallery｜12/07 18:00', '餐廳回覆：訂位費 1,500 THB 可全額抵餐飲，不退、不可取消，已訂位；訂位費付款與確認信請留存'],
        ['sanctuary', '✅ 已訂位｜真理寺｜12/07 10:00', 'Klook／KKday 購票；官網沒列票價']
      ] },
      { g: '出發前再確認', items: [
        ['shops', '12/03 前後：12/07、12/10 店家 IG／FB 特殊營業時間', '補假與憲法日，大多沒查到公告'],
        ['wat', '鄭王廟實際關門與最後入場時間', '來源矛盾：17:30 或 18:00 閉廟'],
        ['ferry', '過河渡船末班（現場問）', '約 05:00–19:00，末班出發時間未證實'],
        ['costume', 'Summer Photo Studio 價格、妝髮時間、是否提供租借', '12/09 14:00 開始；地圖座標在臥佛寺附近（Maha Rat Rd），價格都還沒確認'],
        ['checkin', 'Ana Anan 12/07 提早入住', '05:00 到，只寄放行李；請飯店看能不能提早給房（尚未聯絡）'],
        ['pokemon', 'Pokémon Center 開幕日', '官方只說 12 月開幕；12/08 前沒開就用備案'],
        ['nitan', 'Nitan 要去哪間分店', 'Pratumnak 或 Na Jomtien，營業時間不同'],
        ['khunya', '老奶奶餐廳正確店名與區域', '搜尋查不到營業資訊'],
        ['sustart', 'Straight Up 12 月何時開放預訂', '已確認週二可以，12/08 場次待開放']
      ] }
    ];
    /* 規劃預算預設：只放「有來源的票價」，其餘請自己輸入。pp＝每人 THB，cnt＝人數，on＝是否計入 */
    var PLAN0 = [
      { id: 'p1', name: 'Dib Bangkok 門票（官網）', cat: '景點/門票', pp: 700, cnt: 4, on: true },
      { id: 'p2', name: '鄭王廟門票（多數來源 200，BMA 寫 100）', cat: '景點/門票', pp: 200, cnt: 4, on: true },
      { id: 'p3', name: '過河渡船往返（約 5.5 × 2）', cat: '交通', pp: 11, cnt: 4, on: true },
      { id: 'p4', name: 'Straight Up 日落節目（備選，官網 250）', cat: '景點/門票', pp: 250, cnt: 4, on: false },
      { id: 'p5', name: 'AETHER 入場費（方案 A，來源不一，含 450 飲料抵用）', cat: '景點/門票', pp: 600, cnt: 4, on: false },
          ];
    if (!st.plan) { st.plan = JSON.parse(JSON.stringify(PLAN0)); save(); }
    else { var n0 = st.plan.length; st.plan = st.plan.filter(function (p) { return !(p.id === 'p6' && !p.on); }); if (st.plan.length !== n0) save(); }

    /* ---------- 面板骨架 ---------- */
    var fab = document.createElement('button');
    fab.id = 'tfab'; fab.type = 'button'; fab.setAttribute('aria-label', '旅遊工具'); fab.setAttribute('aria-expanded', 'false'); fab.textContent = '🧰';
    var back = document.createElement('div'); back.className = 'tl-back';
    var panel = document.createElement('div'); panel.className = 'tl-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '旅遊工具');
    var TABS = [['money', '旅費'], ['count', '倒數'], ['todo', '待辦'], ['route', '路線'], ['calc', '換算']];
    panel.innerHTML = '<div class="tl-head"><h2>旅遊工具</h2><button type="button" class="tl-x" aria-label="關閉">✕</button></div>' +
      '<div class="tl-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="false">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="tl-body" id="tl-body"></div>';
    document.body.appendChild(fab); document.body.appendChild(back); document.body.appendChild(panel);
    var body = panel.querySelector('#tl-body');
    var cur = 'money';

    function open(tab) { back.classList.add('on'); panel.classList.add('on'); fab.setAttribute('aria-expanded', 'true'); show(tab || cur); }
    function close() { back.classList.remove('on'); panel.classList.remove('on'); fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
    fab.addEventListener('click', function () { open(); });
    back.addEventListener('click', close);
    panel.querySelector('.tl-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('on')) close(); });
    panel.querySelector('.tl-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) show(b.getAttribute('data-tab')); });
    function show(tab) {
      cur = tab;
      Array.prototype.forEach.call(panel.querySelectorAll('.tl-tabs button'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'); });
      ({ count: rCount, todo: rTodo, find: rFind, fav: rFav, route: rRoute, calc: rCalc, money: rMoney })[tab]();
      body.scrollTop = 0;
    }
    function seg(opts, val, attr) {
      return '<div class="tl-seg" role="group">' + opts.map(function (o) { return '<button type="button" data-' + attr + '="' + o[0] + '" aria-pressed="' + (o[0] === val ? 'true' : 'false') + '">' + o[1] + '</button>'; }).join('') + '</div>';
    }
    function jump(id) {
      var el = document.getElementById(id); close();
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.remove('tl-flash'); void el.offsetWidth; el.classList.add('tl-flash'); }
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
      var left = 0, total = 0, next = [];
      TODO.forEach(function (g) { g.items.forEach(function (i) { total++; if (!st.todo[i[0]]) { left++; if (next.length < 3) next.push(i); } }); });
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
        }).join('') + '<div class="tl-row"><button type="button" class="tl-btn" id="tl-reset">全部取消勾選</button></div>';
      body.querySelectorAll('input[data-id]').forEach(function (c) {
        c.addEventListener('change', function () {
          var id = c.getAttribute('data-id');
          if (c.checked) st.todo[id] = 1; else delete st.todo[id];
          save(); c.closest('.tl-chk').classList.toggle('done', c.checked);
        });
      });
      body.querySelector('#tl-reset').addEventListener('click', function () { st.todo = {}; save(); rTodo(); });
    }

    /* ---------- 3. 探索：搜尋＋篩選＋收藏 ---------- */
    var F = { q: '', kind: 'all', day: 'all' };
    function items(filter) {
      var out = [];
      var altOnly = filter.kind === 'alt';
      if (!altOnly) {
        D.forEach(function (d) {
          if (filter.day !== 'all' && String(d.no) !== filter.day) return;
          d.items.forEach(function (it, i) {
            if (filter.kind !== 'all' && it[2] !== filter.kind) return;
            var hay = (it[0] + ' ' + it[1] + ' ' + (it[3] || '')).toLowerCase();
            if (filter.q && hay.indexOf(filter.q) < 0) return;
            out.push({ id: 'it-' + d.no + '-' + i, kind: 'it', d: d, it: it, ord: d.no * 1000 + i });
          });
        });
      }
      if (filter.kind === 'all' || altOnly) {
        if (filter.day === 'all') {
          ALT.forEach(function (a, i) {
            var hay = (a[0] + ' ' + a[1] + ' ' + a[2] + ' ' + a[3]).toLowerCase();
            if (filter.q && hay.indexOf(filter.q) < 0) return;
            out.push({ id: 'alt-' + i, kind: 'alt', a: a, ord: 9000 + i });
          });
        }
      }
      return out;
    }
    function resHtml(r, withHeart) {
      var heart = '<button type="button" class="tl-heart' + (st.fav[r.id] ? ' on' : '') + '" data-fav="' + r.id + '" aria-label="收藏" aria-pressed="' + (st.fav[r.id] ? 'true' : 'false') + '">' + (st.fav[r.id] ? '♥' : '♡') + '</button>';
      if (r.kind === 'it') {
        return '<div class="tl-r"><button type="button" class="tl-res" data-t="' + r.id + '"><b>' + esc(r.d.date) + ' ' + esc(r.it[0]) + '</b><span class="tl-k">' + esc(KIND[r.it[2]] || '') + '</span>' + esc(r.it[1]) + (r.it[3] ? '<small>' + esc(r.it[3]) + '</small>' : '') + '</button>' + (withHeart ? heart : '') + '</div>';
      }
      return '<div class="tl-r"><div class="tl-res alt"><b>備選</b><span class="tl-k">' + esc(r.a[1]) + '</span>' + esc(r.a[0]) + '<small class="wrap">' + esc(r.a[2]) + '。' + esc(r.a[3]) + '</small></div>' + (withHeart ? heart : '') + '</div>';
    }
    function bindResults(rs, again) {
      rs.addEventListener('click', function (e) {
        var h = e.target.closest('.tl-heart');
        if (h) { var id = h.getAttribute('data-fav'); if (st.fav[id]) delete st.fav[id]; else st.fav[id] = 1; save(); again(); return; }
        var b = e.target.closest('.tl-res[data-t]'); if (b) jump(b.getAttribute('data-t'));
      });
    }
    function rFind() {
      var KINDS = [['all', '全部'], ['eat', '餐飲'], ['go', '景點'], ['move', '移動'], ['rest', '休息'], ['alt', '備選']];
      var DAYS = [['all', '全部日期']].concat(D.map(function (d) { return [String(d.no), d.date]; }));
      body.innerHTML = '<div class="tl-row"><input class="tl-in w" id="tl-q" type="search" placeholder="搜尋景點、餐廳、備註…" autocomplete="off" value="' + esc(F.q) + '"></div>' +
        '<div class="tl-chips" id="tl-kc">' + KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="' + (F.kind === k[0] ? 'true' : 'false') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
        '<div class="tl-chips" id="tl-dc">' + DAYS.map(function (k) { return '<button type="button" data-d="' + k[0] + '" aria-pressed="' + (F.day === k[0] ? 'true' : 'false') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
        '<div id="tl-rs"></div>';
      var q = body.querySelector('#tl-q'), rs = body.querySelector('#tl-rs');
      function draw() {
        var out = items({ q: F.q.trim().toLowerCase(), kind: F.kind, day: F.day });
        rs.innerHTML = '<div class="tl-note">共 ' + out.length + ' 筆' + (out.length > 40 ? '，只顯示前 40 筆' : '') + (F.kind === 'alt' && F.day !== 'all' ? '（備選地點沒有日期，請把日期選回「全部日期」）' : '') + '</div>' + out.slice(0, 40).map(function (r) { return resHtml(r, true); }).join('');
      }
      q.addEventListener('input', function () { F.q = q.value; draw(); });
      body.querySelector('#tl-kc').addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; F.kind = b.getAttribute('data-k'); rFind(); });
      body.querySelector('#tl-dc').addEventListener('click', function (e) { var b = e.target.closest('button[data-d]'); if (!b) return; F.day = b.getAttribute('data-d'); rFind(); });
      bindResults(rs, draw);
      draw();
    }

    /* ---------- 4. 收藏 ---------- */
    function rFav() {
      body.innerHTML = '<div class="tl-note">在「探索」點 ♡ 收藏，這裡集中看。只存在這支手機。</div><div id="tl-fr"></div>';
      var fr = body.querySelector('#tl-fr');
      function draw() {
        var cnt = Object.keys(st.fav).length;
        var cur2 = items({ q: '', kind: 'all', day: 'all' }).filter(function (r) { return st.fav[r.id]; }).sort(function (a, b) { return a.ord - b.ord; });
        fr.innerHTML = cur2.length ? cur2.map(function (r) { return resHtml(r, true); }).join('') : '<div class="tl-note">還沒有收藏（目前 ' + cnt + ' 個）。</div>';
      }
      bindResults(fr, draw);
      draw();
    }

    /* ---------- 5. 當天路線（Google 地圖） ---------- */
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

    /* ---------- 6. 換算（計算機） ---------- */
    var buf = '';
    function updateRate(cb) {
      fetch('https://open.er-api.com/v6/latest/THB').then(function (x) { return x.json(); }).then(function (j) {
        var v = j && j.rates && j.rates.TWD; if (!v) throw new Error('no rate');
        st.rate = String(Math.round(v * 10000) / 10000); save(); cb(true);
      }).catch(function () { cb(false); });
    }
    function conv() {
      var x = parseFloat(buf || '0'), r = parseFloat(st.rate);
      if (!(r > 0)) return null;
      return st.dir === 'thb' ? x * r : x / r;
    }
    function fmtN(v) { return v.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function rCalc() {
      var thb = st.dir === 'thb';
      body.innerHTML = seg([['thb', '泰銖 → 台幣'], ['twd', '台幣 → 泰銖']], st.dir, 'dir') +
        '<div class="tl-calc"><div class="tl-cl">' + (thb ? '泰銖 THB' : '台幣 TWD') + '</div><div class="tl-cv" id="tl-cin">' + (thb ? '฿' : 'NT$') + esc(buf || '0') + '</div>' +
        '<div class="tl-cl">約合' + (thb ? '台幣' : '泰銖') + '</div><div class="tl-cv big2" id="tl-cout"></div><div class="tl-cl" id="tl-rline"></div></div>' +
        '<div class="tl-keys">' + ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'AC', '0', '.'].map(function (k) { return '<button type="button" class="tl-key" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '<div class="tl-row" style="justify-content:flex-end"><button type="button" class="tl-btn" data-k="DEL">⌫ 刪除一位</button></div>' +
        '<div class="tl-sec"><h3>匯率</h3><div class="tl-row"><label class="tl-note">1 THB =</label><input class="tl-in" id="tl-rate" type="number" step="0.0001" min="0" style="width:100px" value="' + esc(st.rate) + '" placeholder="例如 0.95"><span class="tl-note">TWD</span><button type="button" class="tl-btn" id="tl-rup">更新匯率</button></div>' +
        '<div class="tl-note" id="tl-rmsg">匯率沒有預設值，請輸入或按「更新匯率」（需要網路）。僅供參考，實際以刷卡或換匯為準。</div></div>';
      function draw() {
        body.querySelector('#tl-cin').textContent = (thb ? '฿' : 'NT$') + (buf || '0');
        var v = conv(), o = body.querySelector('#tl-cout');
        o.textContent = v === null ? '請先輸入匯率' : ((thb ? 'NT$' : '฿') + fmtN(v));
        o.classList.toggle('muted', v === null);
        body.querySelector('#tl-rline').textContent = v === null ? '' : '匯率 1 THB = ' + st.rate + ' TWD';
      }
      body.querySelector('.tl-seg').addEventListener('click', function (e) { var b = e.target.closest('button[data-dir]'); if (!b) return; st.dir = b.getAttribute('data-dir'); save(); buf = ''; rCalc(); });
      body.querySelector('.tl-keys').addEventListener('click', function (e) {
        var b = e.target.closest('.tl-key'); if (!b) return; var k = b.getAttribute('data-k');
        if (k === 'AC') buf = '';
        else if (k === '.') { if (buf.indexOf('.') < 0) buf = (buf || '0') + '.'; }
        else if (buf.length < 12) buf = (buf === '0' ? '' : buf) + k;
        draw();
      });
      body.querySelector('[data-k="DEL"]').addEventListener('click', function () { buf = buf.slice(0, -1); draw(); });
      var rate = body.querySelector('#tl-rate'), rmsg = body.querySelector('#tl-rmsg');
      rate.addEventListener('input', function () { st.rate = rate.value; save(); draw(); });
      body.querySelector('#tl-rup').addEventListener('click', function () {
        rmsg.textContent = '更新中…';
        updateRate(function (ok) {
          if (ok) { rate.value = st.rate; rmsg.textContent = '已更新：1 THB = ' + st.rate + ' TWD（來源 open.er-api.com）。'; draw(); } else rmsg.textContent = '更新失敗（可能沒有網路），請手動輸入匯率。';
        });
      });
      draw();
      if (Date.now() - (rCalc.last || 0) > 60000) {
        rCalc.last = Date.now();
        rmsg.textContent = '自動更新匯率中…';
        updateRate(function (ok) {
          if (!body.contains(rate)) return;
          if (ok) { rate.value = st.rate; rmsg.textContent = '已自動更新：1 THB = ' + st.rate + ' TWD（open.er-api.com，約每日更新、中間價，實際以刷卡或換匯為準）。'; draw(); }
          else rmsg.textContent = parseFloat(st.rate) > 0 ? '自動更新失敗，沿用上次匯率 ' + st.rate + '。' : '自動更新失敗（可能沒有網路），請手動輸入匯率。';
        });
      }
    }

    /* ---------- 7. 旅費：規劃預算／實際記帳 ---------- */
    function toC(x) { return Math.round(parseFloat(x) * 100); }
    function fmt(c) { return (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function twd(c) { var r = parseFloat(st.rate); return r > 0 ? '（約 NT$' + Math.round(c / 100 * r).toLocaleString('en-US') + '）' : ''; }
    function planTotals() {
      var by = {}, tot = 0, perP = 0;
      CATS.forEach(function (c) { by[c] = { n: 0, c: 0, rows: [] }; });
      st.plan.forEach(function (p) {
        if (!p.on) return;
        var c = toC(p.pp * p.cnt); var k = by[p.cat] ? p.cat : '其他';
        by[k].n++; by[k].c += c; by[k].rows.push(p); tot += c; perP += toC(p.pp);
      });
      return { by: by, tot: tot, perP: perP };
    }
    function actTotals() {
      var by = {}, tot = 0;
      CATS.forEach(function (c) { by[c] = { n: 0, c: 0, rows: [] }; });
      st.exp.forEach(function (e) { var k = by[e.cat] ? e.cat : '其他'; by[k].n++; by[k].c += e.amt; by[k].rows.push(e); tot += e.amt; });
      return { by: by, tot: tot };
    }
    function catDetails(by, rowFn) {
      return CATS.filter(function (c) { return by[c].n > 0; }).map(function (c) {
        return '<details class="tl-det"><summary><span>' + esc(c) + '<small> ' + by[c].n + ' 筆</small></span><b>฿' + fmt(by[c].c) + '</b></summary>' + by[c].rows.map(rowFn).join('') + '</details>';
      }).join('');
    }
    function rMoney() {
      var head = seg([['plan', '規劃預算'], ['act', '實際記帳']], st.mode, 'mode');
      if (st.mode === 'plan') rPlan(head); else rAct(head);
      body.querySelector('.tl-seg').addEventListener('click', function (e) { var b = e.target.closest('button[data-mode]'); if (!b) return; st.mode = b.getAttribute('data-mode'); save(); rMoney(); });
    }
    function catSel(id) { return '<select class="tl-sel" id="' + id + '">' + CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>'; }

    function rPlan(head) {
      var t = planTotals();
      body.innerHTML = head +
        '<div class="tl-sec"><div class="tl-cl">規劃預算／人</div><div class="tl-big">฿' + fmt(t.perP) + '</div><div class="tl-note">' + twd(t.perP).replace(/[（）]/g, '') + '　全團（依各項人數）฿' + fmt(t.tot) + twd(t.tot) + '。預估與預留，不代表已消費；只預填有來源的票價，餐飲、住宿、機票請自己輸入。</div></div>' +
        '<div class="tl-sec">' + (catDetails(t.by, function (p) { return '<div class="tl-exp"><div>' + esc(p.name) + '<small>每人 ฿' + esc(p.pp) + ' × ' + esc(p.cnt) + ' 人</small></div><div style="text-align:right">฿' + fmt(toC(p.pp * p.cnt)) + '</div></div>'; }) || '<div class="tl-note">沒有計入的項目。</div>') + '</div>' +
        '<div class="tl-sec"><h3>全部項目（勾選才計入）</h3>' + st.plan.map(function (p) {
          return '<div class="tl-exp"><label style="display:flex;gap:8px;align-items:flex-start;flex:1"><input type="checkbox" data-pon="' + esc(p.id) + '"' + (p.on ? ' checked' : '') + ' style="margin-top:3px"><span>' + esc(p.name) + '<small>' + esc(p.cat) + '｜每人 ฿' + esc(p.pp) + ' × ' + esc(p.cnt) + ' 人</small></span></label><button type="button" class="tl-btn" data-pdel="' + esc(p.id) + '" style="padding:2px 8px">刪除</button></div>';
        }).join('') + '</div>' +
        '<div class="tl-sec"><h3>新增規劃項目</h3><div class="tl-row"><input class="tl-in w" id="tl-pn" placeholder="項目（例：午餐預估）">' + catSel('tl-pc') + '</div><div class="tl-row"><input class="tl-in" id="tl-pa" type="number" min="0" step="0.01" placeholder="每人 THB" style="width:110px"><input class="tl-in" id="tl-pt" type="number" min="1" step="1" value="4" style="width:70px"><span class="tl-note">人</span><button type="button" class="tl-btn pri" id="tl-padd">新增</button></div><div class="tl-note" id="tl-pm"></div></div>';
      Array.prototype.forEach.call(body.querySelectorAll('[data-pon]'), function (c) { c.addEventListener('change', function () { var id = c.getAttribute('data-pon'); st.plan.forEach(function (p) { if (p.id === id) p.on = c.checked; }); save(); rMoney(); }); });
      Array.prototype.forEach.call(body.querySelectorAll('[data-pdel]'), function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-pdel'); st.plan = st.plan.filter(function (p) { return p.id !== id; }); save(); rMoney(); }); });
      body.querySelector('#tl-padd').addEventListener('click', function () {
        var n = body.querySelector('#tl-pn').value.trim(), a = parseFloat(body.querySelector('#tl-pa').value), c = parseInt(body.querySelector('#tl-pt').value, 10), cat = body.querySelector('#tl-pc').value;
        if (!n || !(a >= 0) || !(c >= 1)) { body.querySelector('#tl-pm').textContent = '請填項目、每人金額（0 以上）與人數（1 以上）。'; return; }
        st.plan.push({ id: 'p' + Date.now(), name: n, cat: cat, pp: a, cnt: c, on: true }); save(); rMoney();
      });
    }

    function calc() {
      var paid = [0, 0, 0, 0], share = [0, 0, 0, 0], total = 0;
      st.exp.forEach(function (e) {
        var n = e.parts.length; if (!n) return;
        var base = Math.floor(e.amt / n), rem = e.amt - base * n;
        e.parts.forEach(function (p, i) { share[p] += base + (i < rem ? 1 : 0); });
        paid[e.payer] += e.amt; total += e.amt;
      });
      var bal = paid.map(function (p, i) { return p - share[i]; });
      var cr = [], db = [], pay = [];
      bal.forEach(function (b, i) { if (b > 0) cr.push({ i: i, v: b }); else if (b < 0) db.push({ i: i, v: -b }); });
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
    function rAct(head) {
      var r = calc(), M = st.members, A = actTotals(), P = planTotals();
      var sel = M.map(function (m, i) { return '<option value="' + i + '">' + esc(m) + '</option>'; }).join('');
      var parts = M.map(function (m, i) { return '<label style="margin-right:10px;white-space:nowrap"><input type="checkbox" data-p="' + i + '" checked> ' + esc(m) + '</label>'; }).join('');
      var cmp = CATS.filter(function (c) { return A.by[c].c > 0 || P.by[c].c > 0; });
      body.innerHTML = head +
        '<div class="tl-sec"><div class="tl-cl">實際支出（全團）</div><div class="tl-big">฿' + fmt(r.total) + '</div><div class="tl-note">' + twd(r.total).replace(/[（）]/g, '') + '</div></div>' +
        '<div class="tl-sec"><h3>成員（4 人，可改名）</h3><div class="tl-row">' + M.map(function (m, i) { return '<input class="tl-in" data-m="' + i + '" value="' + esc(m) + '" style="width:23%;min-width:70px">'; }).join('') + '</div></div>' +
        '<div class="tl-sec"><h3>新增支出（THB）</h3><div class="tl-row"><input class="tl-in w" id="tl-ed" placeholder="項目（例：午餐）"><input class="tl-in" id="tl-ea" type="number" min="0" step="0.01" placeholder="金額" style="width:100px"></div>' +
        '<div class="tl-row">' + catSel('tl-ec') + '<select class="tl-sel" id="tl-ep">' + sel + '</select><span class="tl-note">付款</span></div>' +
        '<div class="tl-note">分攤的人：</div><div class="tl-row">' + parts + '</div><div class="tl-row"><button type="button" class="tl-btn pri" id="tl-add">新增</button></div></div>' +
        '<div class="tl-sec"><h3>支出明細（' + st.exp.length + ' 筆，依類別）</h3>' + (st.exp.length ? catDetails(A.by, function (e) {
          var i = st.exp.indexOf(e);
          return '<div class="tl-exp"><div>' + esc(e.desc) + '<small>' + esc(M[e.payer]) + ' 付，分攤：' + e.parts.map(function (p) { return esc(M[p]); }).join('、') + '</small></div><div style="text-align:right">฿' + fmt(e.amt) + '<br><button type="button" class="tl-btn" data-del="' + i + '" style="padding:2px 8px;margin-top:4px">刪除</button></div></div>';
        }) : '<div class="tl-note">還沒有支出。金額以小數兩位計算。</div>') + '</div>' +
        (cmp.length ? '<div class="tl-sec"><h3>規劃 vs 實際（全團）</h3><table class="tl-tbl"><thead><tr><th>類別</th><th class="n">規劃</th><th class="n">實際</th></tr></thead><tbody>' + cmp.map(function (c) { return '<tr><td>' + esc(c) + '</td><td class="n">' + fmt(P.by[c].c) + '</td><td class="n ' + (A.by[c].c > P.by[c].c && P.by[c].c > 0 ? 'tl-neg' : '') + '">' + fmt(A.by[c].c) + '</td></tr>'; }).join('') + '<tr><td><b>合計</b></td><td class="n"><b>' + fmt(P.tot) + '</b></td><td class="n"><b>' + fmt(A.tot) + '</b></td></tr></tbody></table><div class="tl-note">規劃只含有計入的項目；實際是目前記的全部。</div></div>' : '') +
        (st.exp.length ? '<div class="tl-sec"><h3>分帳統計</h3><table class="tl-tbl"><thead><tr><th></th><th class="n">已付</th><th class="n">應分攤</th><th class="n">差額</th></tr></thead><tbody>' +
          M.map(function (m, i) { return '<tr><td>' + esc(m) + '</td><td class="n">' + fmt(r.paid[i]) + '</td><td class="n">' + fmt(r.share[i]) + '</td><td class="n ' + (r.bal[i] >= 0 ? 'tl-pos' : 'tl-neg') + '">' + (r.bal[i] >= 0 ? '+' : '−') + fmt(Math.abs(r.bal[i])) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<h3 style="margin-top:10px">誰該付給誰</h3>' + (r.pay.length ? r.pay.map(function (p) { return '<div class="tl-note" style="font-size:14px;color:var(--ink)">' + esc(M[p.from]) + ' → ' + esc(M[p.to]) + '：฿' + fmt(p.v) + twd(p.v) + '</div>'; }).join('') : '<div class="tl-note">已平衡，沒有人需要付錢。</div>') + '</div>' : '') +
        '<div class="tl-row"><button type="button" class="tl-btn" id="tl-copy">複製明細</button><button type="button" class="tl-btn warn" id="tl-clear">清除全部支出</button></div><div class="tl-note" id="tl-msg">記帳只存在這支手機，4 個人的資料不會同步；可以複製明細貼到 LINE。匯率在「換算」設定。</div>';

      Array.prototype.forEach.call(body.querySelectorAll('input[data-m]'), function (inp) {
        inp.addEventListener('change', function () { var i = +inp.getAttribute('data-m'); st.members[i] = inp.value.trim() || ('成員' + (i + 1)); save(); rMoney(); });
      });
      body.querySelector('#tl-add').addEventListener('click', function () {
        var desc = body.querySelector('#tl-ed').value.trim(), amt = toC(body.querySelector('#tl-ea').value), payer = +body.querySelector('#tl-ep').value, cat = body.querySelector('#tl-ec').value;
        var ps = Array.prototype.map.call(body.querySelectorAll('input[data-p]:checked'), function (c) { return +c.getAttribute('data-p'); });
        if (!desc || !(amt > 0) || !ps.length) { body.querySelector('#tl-msg').textContent = '請填項目、金額（大於 0），並至少選一位分攤的人。'; return; }
        st.exp.push({ desc: desc, amt: amt, payer: payer, parts: ps, cat: cat }); save(); rMoney();
      });
      Array.prototype.forEach.call(body.querySelectorAll('[data-del]'), function (b) { b.addEventListener('click', function () { st.exp.splice(+b.getAttribute('data-del'), 1); save(); rMoney(); }); });
      body.querySelector('#tl-clear').addEventListener('click', function () { if (st.exp.length && confirm('確定要清除全部支出？無法復原。')) { st.exp = []; save(); rMoney(); } });
      body.querySelector('#tl-copy').addEventListener('click', function () {
        var rr = calc(), M2 = st.members, msg = body.querySelector('#tl-msg');
        var t = '曼谷行程記帳（THB）\n' + st.exp.map(function (e) { return '[' + (e.cat || '其他') + '] ' + e.desc + ' ฿' + fmt(e.amt) + '｜' + M2[e.payer] + ' 付｜分攤：' + e.parts.map(function (p) { return M2[p]; }).join('、'); }).join('\n') +
          '\n總計 ฿' + fmt(rr.total) + '\n' + (rr.pay.length ? rr.pay.map(function (p) { return M2[p.from] + ' → ' + M2[p.to] + '：฿' + fmt(p.v); }).join('\n') : '已平衡');
        function fallback() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); msg.textContent = '已複製。'; } catch (e) { msg.textContent = '複製失敗，請手動選取。'; } document.body.removeChild(ta); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { msg.textContent = '已複製，可以貼到 LINE。'; }, fallback); else fallback();
      });
    }
  } catch (err) {
    if (window.console) console.error('tools.js 載入失敗', err);
  }
})();
