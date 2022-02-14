var express = require('express');
var app = express();

//启动gzip压缩
var compression = require('compression');
app.use(compression());

//操作日期的插件
var moment = require('moment');

//操作cookie的插件
var cookieParser = require('cookie-parser');
app.use(cookieParser());

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// 自动将body请求数据格式转成json
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// parse application/json
app.use(express.text());
app.use(express.json());

app.use(function (req, res, next) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// global.EnclavePublicKey = '';
require('./router/subscription');
require('./router/verify')(app);

var port = process.env.PORT ? process.env.PORT : 10240;
//监听端口
app.listen(port);

console.log('%s | node server initializing | listening on port %s | process id %s | NODE_ENV is', moment().format('YYYY-MM-DD HH:mm:ss.SSS'), port, process.pid, process.env.NODE_ENV);
