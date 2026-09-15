import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,plan,finishSession} from '../dist/engine.js';
import {draftFor,evaluateTrial,continueAfterRest,recordSet,prepareExercise} from '../dist/flow.js';
function initial() {
  const s=defaults();
  s.active={...plan(s),id:'test-flow',index:0,stage:'calibrate',records:[],emomMinute:0};
  return s;
}
const trial={weight:10,mode:'side',step:5};
test('first trial needs no increment input; existing catalog default is available',()=>{
 const s=initial();assert.equal(draftFor(s).step,5);assert.equal(draftFor(s).weight,null);
});
test('easy trial preserves mode and editable next weight across reload, without recording work',()=>{
 let s=initial();evaluateTrial(s,trial,'easy');s=JSON.parse(JSON.stringify(s));
 assert.equal(s.active.records.length,0);assert.deepEqual(s.loads,{});
 assert.equal(s.active.stage,'rest');continueAfterRest(s);
 assert.equal(s.active.stage,'calibrate');assert.equal(draftFor(s).weight,15);assert.equal(draftFor(s).mode,'side');
});
test('hard trial lowers weight and never goes negative',()=>{
 const s=initial();evaluateTrial(s,{...trial,weight:2},'hard');continueAfterRest(s);assert.equal(draftFor(s).weight,0);
});
test('good trial saves one exercise only and requires rest before the working set',()=>{
 const s=initial();evaluateTrial(s,trial,'good');assert.equal(s.loads.press.weight,10);assert.equal(s.loads.chest,undefined);
 assert.equal(s.active.stage,'rest');assert.equal(s.active.records.length,0);continueAfterRest(s);assert.equal(s.active.stage,'work');
});
test('one feeling button records reps and effort, then keeps rest across reload',()=>{
 let s=initial();evaluateTrial(s,trial,'good');continueAfterRest(s);recordSet(s,{weight:10,reps:8,feeling:'good'});
 s=JSON.parse(JSON.stringify(s));assert.equal(s.active.records[0].rir,2);assert.equal(s.active.stage,'rest');assert.equal(s.active.rest,180);
 continueAfterRest(s);assert.equal(s.active.stage,'work');recordSet(s,{weight:10,reps:8,feeling:'easy'});
 assert.equal(s.active.index,1);assert.equal(s.active.restKind,'exercise');assert.equal(s.active.rest,150);continueAfterRest(s);assert.equal(s.active.stage,'calibrate');
});
test('a double submission cannot record a second working set while resting',()=>{
 const s=initial();evaluateTrial(s,trial,'good');continueAfterRest(s);recordSet(s,{weight:10,reps:8,feeling:'good'});
 assert.throws(()=>recordSet(s,{weight:10,reps:8,feeling:'good'}));assert.equal(s.active.records.length,1);
});
test('actual changed weight persists to next set and hard feedback is recorded conservatively',()=>{
 const s=initial();evaluateTrial(s,trial,'good');continueAfterRest(s);recordSet(s,{weight:5,reps:7,feeling:'hard'});
 assert.equal(s.active.workingWeights.press,5);assert.equal(s.active.records[0].rir,0);
});
test('invalid trial and missing calibration cannot silently create working records',()=>{
 const s=initial();assert.throws(()=>evaluateTrial(s,{...trial,weight:NaN},'good'));assert.throws(()=>evaluateTrial(s,{...trial,mode:'pair'},'good'));
 assert.throws(()=>recordSet(s,{weight:10,reps:8,feeling:'good'}));assert.equal(s.active.records.length,0);
});
test('a saved V1 rest without return stage resumes the right working exercise',()=>{
 const s=initial();s.loads.press={...trial,target:8};s.active.stage='rest';continueAfterRest(s);assert.equal(s.active.stage,'work');
});
test('bodyweight replacement needs no weight calibration',()=>{
 const s=initial();s.active.exercises[0].id='chair';prepareExercise(s);assert.equal(s.active.stage,'work');
 recordSet(s,{weight:0,reps:8,feeling:'good'});assert.equal(s.active.records[0].weight,0);
});
