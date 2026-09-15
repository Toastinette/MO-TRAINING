import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
test('both GitHub Pages root and dist hosting resolve all local entry assets',()=>{
 for(const entry of ['index.html','dist/index.html']) {
  const html=fs.readFileSync(path.join(root,entry),'utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)) {
   assert.ok(fs.existsSync(path.resolve(root,path.dirname(entry),url)),`${entry}: ${url} missing`);
   assert.ok(new URL(url,`https://example.com/MO-TRAINING/${entry}`).pathname.startsWith('/MO-TRAINING/'));
  }
 }
});
test('the two hosting entry points bootstrap the same application',()=>{
 const direct=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 const github=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(github.replaceAll('./dist/','./'),direct);
 assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
 assert.ok(fs.existsSync(path.join(root,'dist/.nojekyll')));
});
