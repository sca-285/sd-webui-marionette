// Where the WebUI's server root is, wherever the editor page itself is served
// from (/rigged-pose/index.html, a versioned /rigged-pose/v123/index.html, or
// behind a proxy prefix). Server URLs ("../rigged-pose-api/...") resolve here.
export const ROOT = location.origin + location.pathname.replace(/\/rigged-pose\/.*$/, '/');
export const serverUrl = (u) => (u && u.startsWith('../') ? ROOT + u.replace(/^(\.\.\/)+/, '') : u);
