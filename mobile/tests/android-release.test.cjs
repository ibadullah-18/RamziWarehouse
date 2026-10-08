const {test}=require('node:test');
const assert=require('node:assert/strict');
const {nextVersionCode}=require('../scripts/prepare-android-release.cjs');
test('every release is newer than the installed published APK',()=>{
 assert.equal(nextVersionCode(15,14),15);assert.equal(nextVersionCode(15,15),16);assert.equal(nextVersionCode(15,30),31);
});
test('invalid version metadata stops publishing',()=>{
 for(const value of [null,undefined,'14',0,-1,Infinity,2.5,2147483647])assert.throws(()=>nextVersionCode(15,value));
});
