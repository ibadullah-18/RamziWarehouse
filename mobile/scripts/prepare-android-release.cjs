const fs = require('node:fs');
function nextVersionCode(configured, published) {
  if (![configured, published].every(value => Number.isSafeInteger(value) && value > 0 && value < 2147483647)) {
    throw new Error('Android versiya nömrəsi düzgün deyil.');
  }
  return Math.max(configured, published + 1);
}
async function main() {
  let info;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('https://api.grandwall.az/api/app-version/android', { signal: AbortSignal.timeout(10000), headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) throw new Error(`Versiya yoxlaması: ${response.status}`);
      info = await response.json();
      break;
    } catch (error) { if (attempt === 2) throw error; }
  }
  const config = JSON.parse(fs.readFileSync('app.json', 'utf8').replace(/^\uFEFF/, ''));
  config.expo.android.versionCode = nextVersionCode(config.expo.android.versionCode, info.latestVersionCode);
  fs.writeFileSync('app.json', JSON.stringify(config, null, 2) + '\n');
  console.log(`Android versionCode: ${config.expo.android.versionCode}`);
}
module.exports = { nextVersionCode };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
