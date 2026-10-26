// Starts Expo against the API running on this computer, using the computer's current Wi-Fi
// address. The address changes whenever the router hands out a new one, so it is detected on
// every start instead of being written into .env.local.
const os = require('node:os');
const { spawn } = require('node:child_process');

const port = process.env.API_PORT || '5080';

function lanAddress() {
  const candidates = Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
  // Home and office Wi-Fi first; skip WSL / Docker / hotspot-style ranges when possible.
  return (
    candidates.find((address) => address.startsWith('192.168.')) ||
    candidates.find((address) => address.startsWith('10.')) ||
    candidates[0]
  );
}

const address = lanAddress();
if (!address) {
  console.error('Şəbəkə ünvanı tapılmadı. Wi-Fi-a qoşulduğunuzu yoxlayın.');
  process.exit(1);
}

const url = `http://${address}:${port}`;
console.log(`API ünvanı: ${url}`);
console.log(`Yoxlama: telefonun brauzerində ${url}/api/app-version/android açılmalıdır.`);

const child = spawn('npx', ['expo', 'start', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_URL: url },
});
child.on('exit', (code) => process.exit(code ?? 0));
