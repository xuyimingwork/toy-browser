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
      // 实例化用于解析返回数据的 parser
      const parser = new ResponseParser()

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
        // 让 parser 处理每次返回的数据
        parser.receive(data.toString())

        // 若本次响应已完整，返回最终响应结果
        if (parser.isFinished) {
          resolve(parser.response);
          connection.end();
        }
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

class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;

    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_VALUE = 3;
    this.WAITING_HEADER_LINE_END = 4;
    this.WAITING_HEADER_BLOCK_END = 5;
    
    this.WAITING_BODY = 6;

    this.current = this.WAITING_STATUS_LINE
    this.statusLine = ''
    this.headers = {}
    this.headerName = ''
    this.headerValue = ''
    this.bodyParser = null
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished
  }
  
  get response () {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }
  
  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string[i])
    }
  }

  receiveChar(char) {
    if (this.current === this.WAITING_STATUS_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END
      } else {
        this.statusLine += char
      }
    } else if (this.current === this.WAITING_STATUS_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current === this.WAITING_HEADER_NAME) {
      if (char === ':') {
        this.current = this.WAITING_HEADER_VALUE
      } else if (char === '\r') {
        this.current = this.WAITING_HEADER_BLOCK_END
      } else {
        this.headerName += char
      }
    } else if (this.current === this.WAITING_HEADER_VALUE) {
      if (char === '\r') {
        this.current = this.WAITING_HEADER_LINE_END
        this.headers[this.headerName] = this.headerValue.trim()
        this.headerName = ''
        this.headerValue = ''
      } else {
        this.headerValue += char
      }
    } else if (this.current === this.WAITING_HEADER_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.current = this.WAITING_BODY
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new ChunkedBodyParser()
        }
      }
    } else if (this.current === this.WAITING_BODY) {
      this.bodyParser.receiveChar(char)
    }
  }
}

class ChunkedBodyParser {
  constructor() {
    this.WAITING_SIZE = 0
    this.WAITING_SIZE_LINE_END = 1
    this.WAITING_DATA = 2
    this.WAITING_DATA_LINE_END = 3

    this.current = this.WAITING_SIZE
    this.size = 0

    this.isFinished = false
    this.content = []
  }

  receiveChar(char) {
    if (this.isFinished === true) return
    if (this.current === this.WAITING_SIZE) {
      if (char === '\r') {
        if (this.size === 0) {
          this.isFinished = true
        } else {
          this.current = this.WAITING_SIZE_LINE_END
        }
      } else {
        this.size *= 16
        this.size += parseInt(char, 16)
      }
    } else if (this.current === this.WAITING_SIZE_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_DATA
      }
    } else if (this.current === this.WAITING_DATA) {
      // 进入该分支时 size 一定大于 0，因此可以直接先 push
      this.content.push(char)
      this.size--
      if (this.size === 0) {
        this.current = this.WAITING_DATA_LINE_END
      }
    } else if (this.current === this.WAITING_DATA_LINE_END) {
      // 等待 line end 的状态会有 \r\n 两种结果
      if (char === '\n') {
        this.current = this.WAITING_SIZE
      }
    }
  }
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