import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseReport} from '../src/lib/wwbp/parser';
import {demoReport} from '../src/lib/demo';
import Multipliers from '../src/components/multipliers';
const report=(values:string,turn=2)=>parseReport(demoReport('DEMO-A',turn).replace('Forces under your control:',values+'\nForces under your control:'));
const render=(current:ReturnType<typeof report>,previous:ReturnType<typeof report>|null)=>renderToStaticMarkup(createElement(Multipliers,{report:current,previous}));
test('reads each multiplier from the report heading including omitted missiles',()=>{
 const parsed=report('Multipliers=(I20,A156,N75,F75,X208,S50,C75)');
 assert.deepEqual(parsed.multipliers,{I:20,A:156,N:75,F:75,X:208,S:50,C:75});
 assert.equal(parsed.multipliers.M,undefined);
 assert.equal(report('Multipliers=(M12.5)').multipliers.M,12.5);
 const text=render(parsed,null);assert.match(text,/Multipliers/);assert.match(text,/Anti-missiles/);assert.match(text,/Counterspies/);assert.match(text,/Not reported/);
});
test('compares against supplied earlier turn with signed increases, decreases and unchanged values',()=>{
 const text=render(report('Multipliers=(I20,A156,N75)'),report('Multipliers=(I25,A150,N75)',1));
 assert.match(text,/Compared with turn 1/);assert.match(text,/>-5</);assert.match(text,/>\+6</);assert.match(text,/No change/);assert.match(text,/Previous: 150/);
});
test('missing multipliers never become zero or fabricated changes, and zero remains a value',()=>{
 const text=render(report('Multipliers=(I0,A156)'),report('Multipliers=(I0,M10)',1));
 assert.match(text,/Previously unreported/);assert.match(text,/Not reported/);assert.doesNotMatch(text,/>-10</);assert.match(text,/multiplier-value">0</);
 assert.match(render(report(''),null),/No earlier report imported/);
});
test('multiplier extraction ignores order echo after the report heading',()=>{
 const raw=demoReport()+'\nMultipliers=(A999)';assert.deepEqual(parseReport(raw).multipliers,{});
});
