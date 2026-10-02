/**
 * Menyisipkan <base href> ke dalam HTML target agar aset relatif
 * (CSS, gambar, font) dimuat dari origin target, bukan dari dev-server uji.
 */
function injectBaseTag(html, baseUrl) {
  if (!baseUrl || typeof html !== 'string' || html === '') {
    return html;
  }

  const tag = `<base href="${baseUrl}">`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => match + tag);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${tag}</head>`);
  }

  return tag + html;
}

/**
 * Iframe pratinjau respons target.
 *
 * - `sandbox` tanpa `allow-same-origin` supaya HTML target tidak bisa mengakses
 *   storage/DOM aplikasi uji ini (origin menjadi opaque).
 * - `baseUrl` (origin target) disuntikkan agar tampilan benar-benar "real".
 */
export default function PreviewFrame({
  body,
  baseUrl = '',
  title = 'Pratinjau respons',
  className = '',
}) {
  return (
    <iframe
      title={title}
      srcDoc={injectBaseTag(body, baseUrl)}
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      className={`h-full w-full border-0 bg-white ${className}`}
    />
  );
}
