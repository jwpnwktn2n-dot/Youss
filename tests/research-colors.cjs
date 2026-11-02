'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('research.js','utf8');
const stocks=[
 {symbol:'GRN',name:'Green example',sector:'Sample',stance:'Research',riskBand:'lower',riskScore:86,score:86,price:100,pe:14,ret1m:3,positiveFacts:[],riskFacts:[]},
 {symbol:'YEL',name:'Yellow example',sector:'Sample',stance:'Watch',riskBand:'moderate',riskScore:69,score:85,price:100,pe:30,ret1m:-2,positiveFacts:[],riskFacts:[]},
 {symbol:'RED',name:'Red example',sector:'Sample',stance:'Caution',riskBand:'high',riskScore:44,score:92,price:100,pe:90,ret1m:6,positiveFacts:[],riskFacts:[]},
 {symbol:'OLD',name:'Stale example',sector:'Sample',stance:'Data stale',riskBand:'unknown',riskScore:null,score:99,price:100,pe:12,ret1m:6,positiveFacts:[],riskFacts:[]}
];
async function main(){
 const dom=new JSDOM(html,{url:'https://example.test/Youss/',runScripts:'outside-only'});
 const win=dom.window,doc=win.document;
 win.fetch=async()=>({ok:true,json:async()=>({
  stocks,marketUpdated:'2026-11-02',newsUpdated:'2026-11-02',
  generatedAt:new Date().toISOString(),llmActivated:false,topHeadlines:[]
 })});
 win.eval(script);
 await new Promise(resolve=>setTimeout(resolve,60));
 const cards=[...doc.querySelectorAll('.deskCompany')];
 assert.equal(cards.length,4);
 assert.equal(doc.querySelectorAll('.deskCompany.riskLow').length,1);
 assert.equal(doc.querySelectorAll('.deskCompany.riskMedium').length,1);
 assert.equal(doc.querySelectorAll('.deskCompany.riskHigh').length,1);
 assert.equal(doc.querySelectorAll('.deskCompany.riskUnknown').length,1);
 assert.match(cards[0].textContent,/86\/100/);
 assert.match(cards[1].textContent,/69\/100/);
 assert.match(cards[2].textContent,/44\/100/);
 assert.match(cards[3].querySelector('.deskNumbers').textContent,/—/,'stale data must not display a green safety score');
 assert.equal(doc.querySelectorAll('.riskLegend .riskKey').length,4);
 doc.querySelector('[data-desk-filter="high"]').click();
 assert.equal(doc.querySelectorAll('.deskCompany').length,1);
 assert.match(doc.querySelector('.deskCompany').textContent,/Red example/);
 console.log('PASS: color-coded risk bands, score caps, stale data and high-risk filtering');
 dom.window.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
