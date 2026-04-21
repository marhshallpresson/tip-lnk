const fs = require('fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function pin(deps) {
  if (!deps) return;
  for (const name in deps) {
    let version = deps[name];
    if (version.startsWith('^') || version.startsWith('~')) {
      deps[name] = version.slice(1);
    }
    if (name === '@solana/web3.js') {
      deps[name] = '1.95.8';
    }
    if (name === 'tweetnacl') {
      deps[name] = '1.0.3';
    }
  }
}

pin(pkg.dependencies);
pin(pkg.devDependencies);

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated and pinned.');
