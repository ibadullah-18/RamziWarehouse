const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');

const sourceRoot = path.join(__dirname, '../src');

function load(file, imports = {}) {
  const module = { exports: {} };
  const text = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  const code = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, require: (name) => imports[name] ?? require(name), URLSearchParams, Error, Date, Math, Number, Object,
  });
  return module.exports;
}

const nav = load('features/customer-accounts/account-navigation.ts');
const dates = load('features/customer-accounts/account-dates.ts');
const math = load('features/customer-accounts/settlement-math.ts', {});

test('each account destination renders its own page rather than the account menu', () => {
  for (const page of nav.accountPages) {
    const file = path.join(sourceRoot, `app/(app)/account/${page}.tsx`);
    assert.ok(fs.existsSync(file), `${page} must have its own route file`);
    const url = nav.accountDestination(page, 'customer with spaces', '2026-10-01');
    const parsed = new URL(url, 'https://example.test');
    assert.equal(parsed.pathname, `/account/${page}`);
    for (const reserved of ['screen', 'params', 'initial', 'state']) assert.equal(parsed.searchParams.has(reserved), false);
  }
  assert.equal(fs.existsSync(path.join(sourceRoot, 'app/(app)/account/[screen].tsx')), false);
});

test('removed account pages are gone for good', () => {
  for (const removed of ['customers', 'history', 'history-day', 'debt', 'old', 'correct', 'payment']) {
    assert.equal(fs.existsSync(path.join(sourceRoot, `app/(app)/account/${removed}.tsx`)), false, removed);
  }
});

test('customer context is encoded and day context never inherits a customer id', () => {
  const parsed = new URL(nav.accountDestination('detail', 'x&date=wrong'), 'https://example.test');
  assert.equal(parsed.searchParams.get('id'), 'x&date=wrong');
  assert.equal(parsed.searchParams.has('date'), false);
  assert.equal(nav.accountDestination('daily', 'stale-id'), '/account/daily');
  assert.equal(nav.accountDestination('collect', 'stale-id'), '/account/collect');
  assert.equal(nav.accountDestination('reports', 'stale-id'), '/account/reports');
  assert.equal(nav.accountDestination('report', 'stale-id', '2026-10-01'), '/account/report?date=2026-10-01');
  assert.equal(nav.accountDestination('settle', 'abc'), '/account/settle?id=abc');
  assert.throws(() => nav.accountDestination('settle'), /Müştəri/);
});

test('calendar validation rejects impossible dates', () => {
  for (const date of ['2026-10-01', '2024-02-29']) assert.equal(nav.isBusinessDate(date), true);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-10-', '2026-1-1', '0000-01-01']) assert.equal(nav.isBusinessDate(date), false);
  assert.equal(nav.updateDatePart('2026-10-01', 2, '15x'), '2026-10-15');
});

test('açot dates use Baku time and show day.month.year', () => {
  // 20:30 UTC on the 24th is already 00:30 on the 25th in Baku.
  assert.equal(dates.todayKey(Date.UTC(2026, 9, 24, 20, 30)), '2026-10-25');
  assert.equal(dates.todayKey(Date.UTC(2026, 9, 24, 19, 59)), '2026-10-24');
  assert.equal(dates.dateLabel('2026-10-24'), '24.10.2026');
  assert.equal(dates.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(dates.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(dates.monthLabel('2026-10'), 'Oktyabr 2026');
  assert.equal(dates.isMonthKey('2026-13'), false);
});

test('money fields accept comma or dot and at most two decimals', () => {
  assert.equal(math.parseMoney('150,5'), 150.5);
  assert.equal(math.parseMoney('150.50'), 150.5);
  assert.equal(math.parseMoney(''), 0);
  assert.equal(math.parseMoney('1.234'), null);
  assert.equal(math.parseMoney('abc'), null);
  assert.equal(math.cleanMoneyInput('12a,345'), '12.34');
});

test('product codes and batches keep only digits and hyphens', () => {
  assert.equal(math.cleanCodeInput('340-1'), '340-1');
  assert.equal(math.cleanCodeInput('10A19'), '1019');
  assert.equal(math.cleanCodeInput('ab 1019--2'), '1019-2');
});

test('payment preview pays daily first, then old, and keeps the surplus as advance', () => {
  const row = { remainingOld: 300, remainingDaily: 250 };
  let preview = math.previewSettlement(row, 350, false);
  assert.equal(preview.paidFromDaily, 250);
  assert.equal(preview.paidFromOld, 100);
  assert.equal(preview.finalOld, 200);
  assert.equal(preview.finalDaily, 0);

  preview = math.previewSettlement(row, 100, true);
  assert.equal(preview.remainingDaily, 150);
  assert.equal(preview.finalDaily, 150, 'kept for tomorrow');
  assert.equal(preview.finalOld, 300);

  preview = math.previewSettlement(row, 100, false);
  assert.equal(preview.finalOld, 450, 'unpaid daily joins the old debt');
  assert.equal(preview.finalDaily, 0);

  preview = math.previewSettlement(row, 600, false);
  assert.equal(preview.advance, 50);
  assert.equal(preview.finalOld, 0);
});

test('settlement supports mixed cash and card, returns, bonus and keeping the debt', () => {
  const text = fs.readFileSync(path.join(sourceRoot, 'features/customer-accounts/settlement-screen.tsx'), 'utf8');
  for (const needle of ['label="Nağd"', 'label="Kart"', 'Yeni vazvrat yarat', 'Bonus', 'Günlük borcu sabaha saxla', 'carryToTomorrow']) {
    assert.ok(text.includes(needle), needle);
  }
});

test('the customer form offers the Sədərək shop switch', () => {
  for (const file of ['app/(app)/create-customer.tsx', 'app/(app)/edit-customer/[id].tsx']) {
    assert.ok(fs.readFileSync(path.join(sourceRoot, file), 'utf8').includes('<ShopSwitch'), file);
  }
});

test('returns keep the manager approval workflow', () => {
  const detail = fs.readFileSync(path.join(sourceRoot, 'app/(app)/return-detail/[id].tsx'), 'utf8');
  for (const needle of ['submitProductReturn', 'completeProductReturn', 'cancelProductReturn', 'Menecerə göndər', 'Sistemə işlənildi']) {
    assert.ok(detail.includes(needle), needle);
  }
  const api = fs.readFileSync(path.join(sourceRoot, 'api/product-return-api.ts'), 'utf8');
  assert.ok(api.includes('/submit') && api.includes('/complete') && api.includes('/cancel'));
  const browser = fs.readFileSync(path.join(sourceRoot, 'features/product-returns/returns-browser.tsx'), 'utf8');
  assert.ok(browser.includes('Təsdiq gözləyir') && browser.includes('Anbara qəbul tarixi'));
});

test('all text, money, quantity and phone fields declare the correct keyboard mode', () => {
  let inputs = 0;
  function walk(dir) {
    for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, file.name);
      if (file.isDirectory()) walk(p);
      else if (p.endsWith('.tsx') && !p.endsWith('form-inputs.tsx')) {
        const text = fs.readFileSync(p, 'utf8');
        const source = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = (node) => {
          if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === 'TextInput') {
            const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map((attr) => [attr.name.getText(source), attr.initializer]));
            const keyboard = attrs.keyboardType?.text, mode = attrs.inputMode?.text;
            assert.ok(keyboard, `${p} must declare a keyboard`);
            assert.ok(mode, `${p} must declare inputMode`);
            const value = attrs.value?.getText(source);
            if (value === '{amount}' || value === '{initial}' || value === '{returnAmount}') { assert.equal(keyboard, 'decimal-pad'); assert.equal(mode, 'decimal'); }
            else if (value === '{String(quantity)}' || value === '{quantityText}' || (p.includes('edit-return') && value?.includes('item.quantity'))) { assert.equal(keyboard, 'number-pad'); assert.equal(mode, 'numeric'); }
            else if (value === '{phoneNumber}' || value === '{customerPhoneNumber}') { assert.equal(keyboard, 'phone-pad'); assert.equal(mode, 'tel'); }
            else if (p.endsWith('account-date-input.tsx')) { assert.equal(keyboard, 'number-pad'); assert.equal(mode, 'numeric'); }
            else { assert.equal(keyboard, 'default', `${p}: ${value}`); assert.equal(mode, 'text', `${p}: ${value}`); }
            inputs++;
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
  }
  walk(sourceRoot);
  assert.ok(inputs >= 30);
});

test('the shared form inputs fix their keyboards: decimal for money, numeric for codes', () => {
  const text = fs.readFileSync(path.join(sourceRoot, 'components/form-inputs.tsx'), 'utf8');
  const money = text.slice(text.indexOf('export function MoneyInput'), text.indexOf('export const CodeInput'));
  const code = text.slice(text.indexOf('export const CodeInput'), text.indexOf('export function TextField'));
  const plain = text.slice(text.indexOf('export function TextField'));
  assert.match(money, /keyboardType="decimal-pad"[\s\S]*inputMode="decimal"/);
  assert.match(code, /keyboardType="number-pad"[\s\S]*inputMode="numeric"/);
  assert.ok(code.includes('Defis əlavə et'), 'codes need an on-screen hyphen key');
  assert.match(plain, /keyboardType="default"[\s\S]*inputMode="text"/);
});
