var app    = require('express')(),
    server = require('http').createServer(app),
    io     = require('socket.io').listen(server),
    mtgox  = require('node-mtgox-client-streaming'),
    redis  = require('redis');


if (!process.env.MTGOX_API_KEY || !process.env.MTGOX_API_SECRET) {
  throw new Error("You must set your MTGOX_API_KEY and MTGOX_API_SECRET environment variables.");
}

// creates a new httpServer instance
server.listen(8080);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
  // socket.emit('news', { hello: 'world' });
  // socket.on('my other event', function (data) {
  //   console.log(data);
  // });
});


var mtGox = new mtgox.MtGox(process.env.MTGOX_API_KEY, process.env.MTGOX_API_SECRET);
mtGox.unsubscribe('depth');
mtGox.unsubscribe('trade');
//mtGox.unsubscribe('ticker');
// mtGox.authEmit({
//   call: 'private/info'
// });

var redisClient;
var saveTick = function(dp) {
  // only save things if we're in production
  if (process.env.NODE_ENV === 'production') {
    if (!redisClient) {
      redisClient = redis.createClient(6379, 'nodejitsudb2457935228.redis.irstack.com');
      redisClient.auth('nodejitsudb2457935228.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4', function (err) {
       if (err) { throw err; }
      });
    }
    redisClient.lpush("mtgox:ticks", JSON.stringify(dp));
    redisClient.ltrim("mtgox:ticks", 0, 25000);
  }
}


var MtGoxStreamHandler = {
  private: function(data) {
    switch(data.private) {
      case 'ticker':
        this.ticker(data);
        break;
      default:
        if (data.private != 'depth' && data.private != 'trade') {
          console.log(data.op+"/"+data.private+" (ignored)");
        }
        break;
    }
  },

  result: function(data) {
      console.dir(data);
  },

  ticker: function(data) {
    var ltv = parseFloat(data.ticker.last.value);
    var dp = { t: (new Date()).getTime(), v: ltv };
    io.sockets.emit('tick', dp);
    saveTick(dp);
    console.log("ticker: 1BTC = USD $" + dp.v);
  },

  default: function(data) {
    if (data.op != 'subscribe' && data.op != 'unsubscribe') {
      console.log(data.op + " (ignored)");
    }
  }

};

mtGox.onMessage(function(data) {
  if (data.op in MtGoxStreamHandler) {
    MtGoxStreamHandler[data.op](data);
  } else {
    MtGoxStreamHandler.default(data);
  }
});
