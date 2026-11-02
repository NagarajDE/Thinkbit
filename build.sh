#!/bin/sh
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  cat src/head.html
  printf '<script>\n(() => {\n"use strict";\n'
  cat src/core.js src/tools1.js src/tools2.js src/tools3.js src/tools4.js src/tools5.js src/tasks.js src/live.js src/boot.js
  printf '})();\n</script>\n</body>\n</html>\n'
} > dist/mathbench.html
cp dist/mathbench.html dist/index.html
# GitHub Pages serves the copy at the repository root
if [ -f .nojekyll ]; then cp dist/mathbench.html index.html; fi
node -e "
const fs=require('fs');const h=fs.readFileSync('dist/mathbench.html','utf8');
const js=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
new Function(js); console.log('syntax ok', (h.length/1024).toFixed(1)+' KB');"
