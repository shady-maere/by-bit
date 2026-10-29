const fs = require('fs');

const filesToObfuscate = [
    'assets/js/admin.js',
    'assets/js/auth.js',
    'assets/js/killswitch.js',
    'assets/js/main.js',
    'assets/js/firebase/firebase-init.js',
    'assets/js/activate.js',
    'assets/js/offline.js'
];

// Plain cleanup: strip comments only. No runtime encoding/wrapper is applied,
// so the output stays normal, host-friendly JavaScript.
function simpleObfuscate(code) {
    return code.replace(/\/\*[\s\S]*?\*\/|([^:\\'\"]|^)\/\/.*/g, '$1');
}

for (const file of filesToObfuscate) {
    if (fs.existsSync(file)) {
        console.log(`Cleaning ${file}...`);
        const code = fs.readFileSync(file, 'utf8');
        const cleaned = simpleObfuscate(code);
        fs.writeFileSync(file, cleaned, 'utf8');
        console.log(`Successfully cleaned ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
}
