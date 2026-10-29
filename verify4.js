const fs = require('fs');
const files = [
  'assets/js/admin.js',
  'assets/js/auth.js',
  'assets/js/killswitch.js',
  'assets/js/main.js',
  'assets/js/firebase/firebase-init.js',
  'assets/js/activate.js',
  'assets/js/offline.js'
];
for (const f of files) {
  const s = fs.readFileSync(f,'utf8').trim();
  const m = s.match(/^Function\(decodeURIComponent\(escape\(atob\("([\s\S]+)"\)\)\)\(\);?$/);
  if (!m) { console.log(f, '-> BAD'); continue; }
  const code = decodeURIComponent(escape(atob(m[1])));
  const out = 'C:/temp/' + f.split('/').pop().replace('firebase/','');
  fs.writeFileSync(out, code);
  console.log(f, 'OK', code.length);
}
