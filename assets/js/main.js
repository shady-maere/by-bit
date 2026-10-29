(function () {
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  var menu = document.getElementById('mmenu');
  if (openBtn && menu) {
    openBtn.addEventListener('click', function () {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }
  if (closeBtn && menu) {
    closeBtn.addEventListener('click', function () {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  }
  if (menu) {
    menu.querySelectorAll('.mm-parent').forEach(function (p) {
      p.addEventListener('click', function () {
        var id = p.getAttribute('data-sub');
        if (!id) return;
        p.classList.toggle('is-open');
        var sub = document.getElementById(id);
        if (sub) sub.classList.toggle('open');
      });
    });
  }

  var tabs = document.querySelectorAll('.hot-tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('is-active'); });
      t.classList.add('is-active');
      var key = t.getAttribute('data-tab');
      document.querySelectorAll('.hot-rows').forEach(function (r) {
        r.hidden = r.getAttribute('data-rows') !== key;
      });
    });
  });

  var cookie = document.getElementById('cookie');
  var ok = document.getElementById('cookieOk');
  if (ok && cookie) {
    if (localStorage.getItem('byCookie') === '1') cookie.classList.add('hide');
    ok.addEventListener('click', function () {
      cookie.classList.add('hide');
      try { localStorage.setItem('byCookie', '1'); } catch (e) {}
    });
  }

  var at = document.querySelectorAll('.auth-tab');
  if (at.length) {
    at.forEach(function (t) {
      t.addEventListener('click', function () {
        at.forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
        var key = t.getAttribute('data-apanel');
        document.querySelectorAll('.auth-panel').forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== key;
        });
      });
    });
  }

  var hTrack = document.getElementById('hubTrack');
  var hGrid = document.getElementById('hubGrid');
  var hVp = document.getElementById('hubViewport');
  var hMQ = window.matchMedia('(min-width:1024px)');
  function hubUpdate() {
    if (!hTrack || !hGrid || !hVp) return;
    if (!hMQ.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hTrack.style.removeProperty('--pin-distance');
      hGrid.style.removeProperty('--grid-offset');
      hGrid.style.removeProperty('--outer-column-offset');
      return;
    }
    var s = Math.max(0, hGrid.offsetHeight - hVp.clientHeight);
    var c = Math.max(2.4 * window.innerHeight, 2.5 * s);
    hTrack.style.setProperty('--pin-distance', c.toFixed(0) + 'px');
    var top = hTrack.getBoundingClientRect().top;
    var a = Math.max(0, Math.min(1, (48 - top) / c));
    hGrid.style.setProperty('--grid-offset', (-s * a).toFixed(2) + 'px');
    hGrid.style.setProperty('--outer-column-offset', (120 * (1 - 2 * a)).toFixed(2) + 'px');
  }
  if (hTrack && hGrid && hVp) {
    hubUpdate();
    window.addEventListener('scroll', hubUpdate, { passive: true });
    window.addEventListener('resize', hubUpdate);
    if (window.ResizeObserver) new ResizeObserver(hubUpdate).observe(hGrid);
  }

  var skDone = function () { document.body.classList.add('sk-done'); };
  if (document.querySelector('.sk-spot')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(skDone, 800); });
    } else {
      setTimeout(skDone, 800);
    }
  }
})();
