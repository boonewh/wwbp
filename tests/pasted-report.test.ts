import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pastedReport} from '../src/lib/pasted-report';
import {demoReport,demoWorkspace} from '../src/lib/demo';
import {importReports} from '../src/lib/workspace';
test('email body imports directly and derives a useful source name',()=>{const file=pastedReport(demoReport('DEMO-A',3));assert.equal(file.filename,'DEMO-A-turn-3-player-1-email.txt');const result=importReports(demoWorkspace(),'demo-a',[file]);assert.equal(result.added,1);assert.equal(result.state.campaigns[0].reports.length,3);});
test('normalizes copied mail spacing and Windows newlines',()=>{const file=pastedReport('\uFEFF'+demoReport().replaceAll(' ','\u00a0').replaceAll('\n','\r\n'));assert.equal(importReports(demoWorkspace(),'demo-a',[file]).duplicates,1);});
test('blank, incomplete and oversized email bodies are rejected',()=>{assert.throws(()=>pastedReport('   '),/Paste/);assert.throws(()=>pastedReport('Game DEMO-A, Turn 1, Player [1:DEMO]'),/incomplete/);assert.throws(()=>pastedReport('é'.repeat(1_000_001)),/2 MB/);});
test('pasted reports still enforce selected campaign and preserve conflicts',()=>{assert.throws(()=>importReports(demoWorkspace(),'demo-a',[pastedReport(demoReport('DEMO-B',3))]),/belongs/);assert.throws(()=>importReports(demoWorkspace(),'demo-a',[pastedReport(demoReport('DEMO-A',1,99))]),/different report/);});
