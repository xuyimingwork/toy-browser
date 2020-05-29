const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  console.log(req.headers, '\n');
  res.setHeader('X-Foo', 'bar');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  const html = fs.readFileSync('./index.html', 'utf8')
  res.end(html);
});

server.listen(8088)