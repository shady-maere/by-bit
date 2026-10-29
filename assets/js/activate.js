(function () {
  'use strict';

  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    document.getElementById('actErr').textContent = 'Firebase failed to load - cannot read site status.';
    return;
  }

  var ADMIN_UID = '61aL9IOHvyfbQO7GJNNoekZq1mU2';
  var auth = firebase.auth();
  var db = firebase.database();

  var els = {
    on: document.getElementById('actOn'),
    off: document.getElementById('actOff'),
    main: document.getElementById('actMainState'),
    admin: document.getElementById('actAdminState'),
    err: document.getElementById('actErr')
  };

  function render(isAdmin, active) {
    var on = active === true;
    els.main.textContent = on ? 'Online' : 'Offline';
    els.main.className = 'act-pill ' + (on ? 'on' : 'off');
    els.admin.textContent = on ? 'Online' : 'Offline';
    els.admin.className = 'act-pill ' + (on ? 'on' : 'off');
    els.on.disabled = !isAdmin || on;
    els.off.disabled = !isAdmin || !on;
  }

  
  db.ref('siteStatus').on('value', function (snap) {
    render(false, (snap.val() || {}).active);
  });

  
  auth.onAuthStateChanged(function (user) {
    if (user && user.uid === ADMIN_UID) render(true, null);
  });

  
  function requireAdmin() {
    if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
      return Promise.resolve(auth.currentUser);
    }
    var email = window.prompt('Admin email:');
    var pass = window.prompt('Admin password:');
    if (!email || !pass) return Promise.reject(new Error('Cancelled.'));
    return auth.signInWithEmailAndPassword(email, pass)
      .then(function (u) {
        if (u.uid !== ADMIN_UID) {
          auth.signOut();
          throw new Error('That account is not the admin.');
        }
        return u;
      })
      .catch(function (e) {
        throw new Error('Sign-in failed: ' + ((e && e.code) || e.message));
      });
  }

  function setActive(value) {
    els.err.textContent = '';
    return requireAdmin().then(function () {
      return db.ref('siteStatus').set({
        active: value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
    });
  }

  els.on.addEventListener('click', function () {
    setActive(true).catch(function (e) { els.err.textContent = e.message; });
  });

  els.off.addEventListener('click', function () {
    setActive(false).catch(function (e) { els.err.textContent = e.message; });
  });
})();
