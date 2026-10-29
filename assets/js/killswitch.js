(function () {
  'use strict';

  var ACTIVE = false;

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET',
      'https://bybit-4b133-default-rtdb.firebaseio.com/siteStatus/active.json?cb=' +
      Date.now(), false);
    xhr.timeout = 4000;
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      ACTIVE = JSON.parse(xhr.responseText) === true;
    }
  } catch (e) {
    ACTIVE = false;
  }

  if (ACTIVE) return;

  try {
    window.location.replace('offline.html');
  } catch (e) {
    window.location.href = 'offline.html';
  }
})();
