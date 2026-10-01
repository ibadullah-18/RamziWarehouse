const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const sourceRoot=path.join(__dirname,'../src');
function load(file,imports={}) {
 const module={exports:{}};const text=fs.readFileSync(path.join(sourceRoot,file),'utf8');
 const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]??require(name),URLSearchParams,Error,Date});
 return module.exports;
}
const nav=load('features/customer-accounts/account-navigation.ts');
test('each account destination renders its own page rather than the account menu',()=>{
 for(const page of nav.accountPages) {
  const AccountScreen=()=>{};
  const module=load(`app/(app)/account/${page}.tsx`,{'../../../features/customer-accounts/account-screen':{__esModule:true,default:AccountScreen}});
  const element=module.default();assert.equal(element.type,AccountScreen);assert.equal(element.props.mode,page);
  const url=nav.accountDestination(page,'customer with spaces','2026-10-01');
  const parsed=new URL(url,'https://example.test');
  assert.equal(parsed.pathname,`/account/${page}`);
  for(const reserved of ['screen','params','initial','state'])assert.equal(parsed.searchParams.has(reserved),false);
 }
 assert.equal(fs.existsSync(path.join(sourceRoot,'app/(app)/account/[screen].tsx')),false);
});
test('customer context is encoded and report context never inherits a customer id',()=>{
 const parsed=new URL(nav.accountDestination('history','x&date=wrong'),'https://example.test');
 assert.equal(parsed.searchParams.get('id'),'x&date=wrong');assert.equal(parsed.searchParams.has('date'),false);
 assert.equal(nav.accountDestination('daily','stale-id'),'/account/daily');
 assert.equal(nav.accountDestination('reports','stale-id'),'/account/reports');
 assert.equal(nav.accountDestination('report','stale-id','2026-10-01'),'/account/report?date=2026-10-01');
 assert.throws(()=>nav.accountDestination('payment'),/Müştəri/);
});
test('calendar validation rejects impossible dates and incomplete numeric inputs',()=>{
 for(const date of ['2026-10-01','2024-02-29'])assert.equal(nav.isBusinessDate(date),true);
 for(const date of ['2026-02-29','2026-04-31','2026-13-01','2026-10-','2026-1-1','0000-01-01'])assert.equal(nav.isBusinessDate(date),false);
 assert.equal(nav.updateDatePart('2026-10-01',2,'15x'),'2026-10-15');
 assert.equal(nav.updateDatePart('2026-10-01',0,'202712'),'2027-10-01');
});
test('date picker exposes three numeric keyboards and keeps the chosen calendar date',()=>{
 const component=load('features/customer-accounts/account-date-input.tsx',{
  'react-native':{StyleSheet:{create:value=>value},Text:'Text',TextInput:'TextInput',View:'View'},
  '../../theme':{colors:{}},'./account-navigation':nav,'../../components/keyboard-form':{dismissKeyboard:()=>{}}
 }).default;
 let changed;
 const tree=component({value:'2026-10-01',onChange:value=>changed=value});
 const fields=tree.props.children;
 assert.equal(fields.length,3);
 for(const field of fields){const input=field.props.children[1];assert.equal(input.props.keyboardType,'number-pad');assert.equal(input.props.inputMode,'numeric');}
 fields[0].props.children[1].props.onChangeText('02');assert.equal(changed,'2026-10-02');
});
test('all text, money, quantity and phone fields declare the correct keyboard mode',()=>{
 let inputs=0,money=0;
 function walk(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,file.name);if(file.isDirectory())walk(p);else if(p.endsWith('.tsx')){
 const text=fs.readFileSync(p,'utf8');const source=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(source)==='TextInput'){
 const attrs=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr=>[attr.name.getText(source),attr.initializer]));
 const keyboard=attrs.keyboardType?.text;const mode=attrs.inputMode?.text;
 assert.ok(keyboard,`${p} must declare a keyboard`);assert.ok(mode,`${p} must declare inputMode`);
 const value=attrs.value?.getText(source);if(value==='{amount}'||value==='{initial}'){assert.equal(keyboard,'decimal-pad');assert.equal(mode,'decimal');money++;}
 else if(value==='{String(quantity)}' || value==='{quantityText}' || (p.includes('edit-return') && value?.includes('item.quantity')) || ((p.includes('create-return') || p.includes('edit-return')) && (value==='{productCode}' || value==='{batchNumber}' || value==='{item.productCode}' || value==='{item.batchNumber}'))){assert.equal(keyboard,'number-pad');assert.equal(mode,'numeric');}
 else if(value==='{phoneNumber}'||value==='{customerPhoneNumber}'){assert.equal(keyboard,'phone-pad');assert.equal(mode,'tel');}
 else if(p.endsWith('account-date-input.tsx')){assert.equal(keyboard,'number-pad');assert.equal(mode,'numeric');}
 else {assert.equal(keyboard,'default',`${p}: ${value}`);assert.equal(mode,'text',`${p}: ${value}`);}
 inputs++;}ts.forEachChild(node,visit);}visit(source);
 }}}walk(sourceRoot);assert.ok(inputs>=40);assert.equal(money,3);
});

