const net = require('net');

class Request {

}

class Response {

}

const client = net.createConnection({ 
  host: '127.0.0.1',
  port: 8088 }, () => {
  console.log('连接成功，发送数据');
  client.write('GET / HTTP/1.1\r\n');
  client.write('Host: 127.0.0.1\r\n');
  client.write('\r\n');
});

client.on('data', (data) => {
  console.log('接收返回数据');
  console.log(data.toString());
  client.end();
});

client.on('end', () => {
  console.log('断开连接');
});