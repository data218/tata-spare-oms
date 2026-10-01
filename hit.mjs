const { default: handler } = await import('./api/_server.js');

function mockRes() {
  const r = { statusCode: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = (b) => { r.body = b; return r; };
  r.write = () => true;
  return r;
}

const path = process.argv[2] || '/api/status';
const method = process.argv[3] || 'GET';
const payload = process.argv[4] ? JSON.parse(process.argv[4]) : undefined;

const req = { url: path, method, headers: {}, body: payload, query: {} };
const res = mockRes();
await handler(req, res);
console.log('HTTP', res.statusCode);
console.log(JSON.stringify(res.body, null, 2)?.slice(0, 3000));
