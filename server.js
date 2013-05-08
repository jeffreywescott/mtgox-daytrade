var app     = require('express')(),
    server  = require('http').createServer(app),
    io      = require('socket.io').listen(server),
    mtgox   = require('node-mtgox-client-streaming'),
    handler = require('./mt_gox_stream_handler');


if (!process.env.MTGOX_API_KEY || !process.env.MTGOX_API_SECRET) {
  throw new Error("You must set your MTGOX_API_KEY and MTGOX_API_SECRET environment variables.");
}

// set up the web server and socket.io
server.listen(8080);
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
// io.sockets.on('connection', function (socket) {
//   // do this whenever a client connects
// });


// set up the MtGox client and handler
var mtGoxClient = new mtgox.MtGox(process.env.MTGOX_API_KEY, process.env.MTGOX_API_SECRET);
var mtGoxHandler = new handler.MtGoxStreamHandler(io);
mtGoxClient.unsubscribe('depth');
mtGoxClient.unsubscribe('trade');
//mtGox.unsubscribe('ticker');
// mtGox.authEmit({
//   call: 'private/info'
// });
mtGoxClient.onMessage(function(data) {
  if (data.op in mtGoxHandler && typeof mtGoxHandler[data.op] === 'function') {
    mtGoxHandler[data.op](data);
  } else {
    mtGoxHandler.default(data);
  }
});
