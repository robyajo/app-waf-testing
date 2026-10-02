/**
 * Preset vektor serangan untuk memicu deteksi WAF dengan sekali klik.
 */
export const attackVectors = [
  { label: 'SSTI {{7*7}}', path: '/?q=%7B%7B7*7%7D%7D', method: 'GET' },
  { label: '.env probe', path: '/.env', method: 'GET' },
  { label: 'Path traversal', path: '/../../../../etc/passwd', method: 'GET' },
  { label: 'Double extension', path: '/uploads/shell.php.jpg', method: 'GET' },
  { label: 'SQLi', path: '/?id=1%20UNION%20SELECT%20password%20FROM%20users', method: 'GET' },
  { label: 'XSS', path: '/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E', method: 'GET' },
  { label: 'Null byte upload', path: '/uploads/avatar.php%00.jpg', method: 'GET' },
  {
    label: 'sqlmap UA',
    path: '/',
    method: 'GET',
    userAgent: 'sqlmap/1.7.2#stable (http://sqlmap.org)',
  },
];

/**
 * Preset User-Agent untuk menguji deteksi pemindai kerentanan.
 */
export const userAgentPresets = [
  {
    label: 'Browser',
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  },
  { label: 'sqlmap', value: 'sqlmap/1.7.2#stable (http://sqlmap.org)' },
  { label: 'Nikto', value: 'Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:map_codes)' },
  { label: 'curl', value: 'curl/8.7.1' },
];
