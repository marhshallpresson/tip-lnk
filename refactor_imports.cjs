const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const apiLibPath = path.resolve('api/_lib');
const srcLibPath = path.resolve('src/lib');

const files = [...walk('api/_handlers'), ...walk('api/_lib')];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Fix backend/lib/ to api/_lib/
  const backendLibRegex = /(['"])(\.\.\/)+backend\/lib\/(.*?)(['"])/g;
  content = content.replace(backendLibRegex, (match, p1, p2, filePart, p4) => {
    changed = true;
    const targetPath = path.join(apiLibPath, filePart);
    let relPath = path.relative(path.dirname(file), targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    return p1 + relPath + p4;
  });

  // 2. Fix src/lib/
  const srcLibRegex = /(['"])(\.\.\/)+src\/lib\/(.*?)(['"])/g;
  content = content.replace(srcLibRegex, (match, p1, p2, filePart, p4) => {
    changed = true;
    const targetPath = path.join(srcLibPath, filePart);
    let relPath = path.relative(path.dirname(file), targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    return p1 + relPath + p4;
  });

  // 3. User requested: Replace all occurrences of '../../lib/' with '../_lib/'
  if (content.includes('../../lib/')) {
    content = content.replace(/\.\.\/\.\.\/lib\//g, '../_lib/');
    changed = true;
  }

  // 4. Ensure ESM .js requirement for ALL relative imports (if not already ending with .js or .ts)
  const relativeImportRegex = /from (['"])(\.\.?\/.*?)(['"])/g;
  content = content.replace(relativeImportRegex, (match, p1, importPath, p3) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.ts') && !importPath.endsWith('.json')) {
      changed = true;
      return `from ${p1}${importPath}.js${p3}`;
    }
    // Convert .ts to .js if it is a relative import (ESM requires .js)
    if (importPath.endsWith('.ts')) {
      changed = true;
      return `from ${p1}${importPath.slice(0, -3)}.js${p3}`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});

console.log('Refactoring complete.');
