'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(html,{url:'https://example.test/Youss/',runScripts:'dangerously',beforeParse(window){
  window.scrollTo=()=>{};
  window.confirm=()=>true;
  window.alert=()=>{};
  window.fetch=async()=>{throw new Error('No market data in offline UI test')};
}});
const {document,localStorage,Event}=dom.window;
const $=id=>document.getElementById(id);
const getState=()=>JSON.parse(localStorage.getItem('mymoney-personal-v1'));
const totals=id=>Object.values(getState().months).flatMap(x=>x.expenses).filter(x=>x.category===id).reduce((sum,x)=>sum+x.amount,0);
function clickAdd(id,amount){
  const button=document.querySelector('[data-quick-category="'+id+'"]');
  assert.ok(button,'missing quick-add button for '+id);
  button.click();
  assert.equal($('expenseCategory').value,id,'category must be preselected');
  assert.ok($('expenseTitle').value.trim(),'quick-add must suggest a description');
  $('expenseAmount').value=String(amount);
  $('expenseForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  assert.equal($('expenseDialog').classList.contains('open'),false,'dialog should close after save');
}
function test(){
  const initial=getState();
  assert.equal(initial.salary,3580);
  assert.equal($('budgetSnapshot').children.length,3);
  clickAdd('groceries',50);
  clickAdd('groceries',43);
  assert.equal(totals('groceries'),93,'two grocery purchases must accumulate, not overwrite');
  const grocery=document.querySelector('[data-quick-category="groceries"]').closest('.catV7');
  assert.match(grocery.textContent,/93,00/);
  assert.match(grocery.textContent,/2\.6%/,'93/3580 should show 2.6% of salary');
  const limit=document.querySelector('[data-limit="housing"]');
  limit.value='650';limit.dispatchEvent(new Event('change',{bubbles:true}));
  assert.equal(getState().categories.find(x=>x.id==='housing').limit,650);
  clickAdd('housing',650);
  const rent=document.querySelector('[data-quick-category="housing"]').closest('.catV7');
  assert.match(rent.textContent,/18\.2%/,'650/3580 should be 18.2%');
  const purchases=Object.values(getState().months).flatMap(x=>x.expenses);
  assert.equal(purchases.length,3);
  const edit=document.querySelector('[data-edit="'+purchases.find(x=>x.category==='groceries').id+'"]');
  assert.ok(edit,'edit control must exist');edit.click();
  assert.equal($('dialogTitle').textContent,'Edit expense');
  $('expenseAmount').value='25';
  $('expenseForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(totals('groceries'),68,'editing must replace one transaction, not add a duplicate');
  assert.equal(Object.values(getState().months).flatMap(x=>x.expenses).length,3);
  assert.equal(getState().categories.find(x=>x.id==='investments').limit,100,'core investment budget must remain unchanged');
  console.log('PASS: quick add, category percentages, monthly rent, edits and preserved investment plan');
  dom.window.close();
}
test();
