/**
 * Utilitas alamat IP yang dipakai bersama oleh klien (React) dan server (proxy).
 */

/**
 * Menentukan apakah oktet pertama/kedua menandakan rentang privat, loopback,
 * link-local, atau multicast/reserved.
 */
export function isPrivateOrReserved(a, b) {
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a >= 224
  );
}

/**
 * Menghasilkan satu alamat IPv4 publik acak (untuk simulasi IP virtual).
 */
export function randomPublicIp() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const a = 1 + Math.floor(Math.random() * 223);
    const b = Math.floor(Math.random() * 256);
    const c = Math.floor(Math.random() * 256);
    const d = 1 + Math.floor(Math.random() * 254);

    if (isPrivateOrReserved(a, b)) {
      continue;
    }

    return `${a}.${b}.${c}.${d}`;
  }

  return `203.0.113.${1 + Math.floor(Math.random() * 254)}`;
}

/**
 * Menghasilkan daftar IP publik acak unik.
 */
export function randomPublicIpList(count) {
  const ips = new Set();

  while (ips.size < count) {
    ips.add(randomPublicIp());
  }

  return [...ips];
}
