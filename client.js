const net = require('net');

class Request {
  constructor({
    host = '',
    port = 80,
    method = 'GET',
    path = '/',
    headers = {},
    body = {}
  } = {}) {
    this.method = method
    this.host = host
    this.port = port
    this.path = path
    this.headers = headers
    this.body = body

    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body) 
    } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
    }

    this.headers['Content-Length'] = this.bodyText.length
  }

  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      // 发送请求
      if (connection) {
        connection.write(request.toString());
      } else {
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          connection.write(this.toString())
        })
      }
  
      // 接收返回数据
      connection.on('data', (data) => {
        resolve(data.toString());
        connection.end();
      });
  
      // 连接过程出现错误
      connection.on('error', err => {
        reject(err)
        connection.end()
      });
    })
  }
}

class Response {

}

const request = new Request({
  method: 'POST',
  host: '127.0.0.1',
  port: 8088,
  headers: {
    send: 'ok'
  },
  body: {
    send: 'body'
  }
})
request.send()
  .then(data => {
    console.log(data)
  });