var mtgox = require('node-mtgox-client-streaming'),
    http  = require('http'),
    redis = require('redis');


if (!process.env.MTGOX_API_KEY || !process.env.MTGOX_API_SECRET) {
  throw new Error("You must set your MTGOX_API_KEY and MTGOX_API_SECRET environment variables.");
}

var mtGox = new mtgox.MtGox(process.env.MTGOX_API_KEY, process.env.MTGOX_API_SECRET);
mtGox.unsubscribe('depth');
mtGox.unsubscribe('trade');
//mtGox.unsubscribe('ticker');

mtGox.authEmit({
  call: 'private/info'
});


var redisClient = redis.createClient(6379, 'nodejitsudb2457935228.redis.irstack.com');
redisClient.auth('nodejitsudb2457935228.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4', function (err) {
 if (err) { throw err; }
});


var MtGoxStreamHandler = {
  lastTickerValue: null,

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
    if (this.lastTickerValue != ltv) {
      this.lastTickerValue = ltv;
      var dp = { t: (new Date()).getTime(), v: ltv };
      redisClient.lpush("mtgox:ticks", JSON.stringify(dp));
      redisClient.ltrim("mtgox:ticks", 0, 32767);
      console.log("ticker: 1BTC = USD $" + this.lastTickerValue);
    }
  },

  default: function(data) {
    if (data.op != 'subscribe' && data.op != 'unsubscribe') {
      console.log(data.op + " (ignored)");
    }
  }

};

var lastTickerValue = null;

mtGox.onMessage(function(data) {
  if (data.op in MtGoxStreamHandler) {
    MtGoxStreamHandler[data.op](data);
  } else {
    MtGoxStreamHandler.default(data);
  }
});



// creates a new httpServer instance
http.createServer(function (req, res) {
  // this is the callback, or request handler for the httpServer

  // respond to the browser, write some headers so the 
  // browser knows what type of content we are sending
  res.writeHead(200, {'Content-Type': 'text/html'});

  // write some content to the browser that your user will see
  res.write('<h1>hello, i know nodejitsu.</h1>');

  // close the response
  res.end();
}).listen(8080);
