import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1440,height:900}});
try{
await p.goto('http://127.0.0.1:5173/');await p.getByRole('button',{name:'入 山',exact:true}).click();
const input=p.getByRole('textbox',{name:'修士姓名'});await input.fill('');await input.pressSequentially('wang123',{delay:30});assert.equal(await input.inputValue(),'wang123');
await p.getByRole('button',{name:'去回石驿',exact:true}).click();
await p.waitForFunction(()=>localStorage.getItem('xian-ni-return-stone-safe-v1'));
const before=await p.evaluate(()=>localStorage.getItem('xian-ni-return-stone-safe-v1'));
await p.reload();await p.getByRole('button',{name:'行路须知',exact:true}).click();await p.waitForTimeout(1600);
const after=await p.evaluate(()=>localStorage.getItem('xian-ni-return-stone-safe-v1'));
assert.equal(after,before,'Title help must never overwrite an existing automatic save');
console.log('UI regressions PASS');
}finally{await b.close();}
