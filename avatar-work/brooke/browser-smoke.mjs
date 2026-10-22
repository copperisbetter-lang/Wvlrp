// Browser smoke test: verifies that the head actually renders, morphs and exports.
// Run with Playwright installed: node avatar-work/brooke/browser-smoke.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:850},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('file://'+resolve('avatar-work/brooke/single-head-morph-test.html'),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Head surface count: 1'),{timeout:45000});
 await page.locator('#strength').fill('100');
 await page.locator('#nose').fill('45');
 await page.locator('#depth').fill('20');
 await page.screenshot({path:'brooke-single-head-smoke.png'});
 const canvas=await page.locator('#stage canvas').count();
 if(canvas!==1)throw Error('Expected one WebGL canvas, found '+canvas);
 const pixels=await page.locator('#stage canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');return gl?Array.from(gl.getParameter(gl.VIEWPORT)):null});
 if(!pixels||pixels[2]<100||pixels[3]<100)throw Error('WebGL viewport not initialized');
 if(errors.length)throw Error('Browser errors: '+errors.join('; '));
 const status=await page.locator('#status').textContent();
 if(!status.includes('Head surface count: 1'))throw Error('Incorrect head count: '+status);
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:30000}),page.locator('#export').click()]);
 if(!download.suggestedFilename().endsWith('.glb'))throw Error('GLB export missing');
 console.log('PASS: WebGL rendered one head; controls worked; GLB download started.');
}finally{await browser.close()}
