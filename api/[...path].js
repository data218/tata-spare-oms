export default async function handler(req, res) {
  try {
    const module = await import('../server.js');
    return await module.default(req, res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: 'DYNAMIC_IMPORT_ERROR',
      error: e.message,
      stack: e.stack
    }));
  }
}
