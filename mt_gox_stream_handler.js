var redis = require('redis');

var MtGoxStreamHandler = function(io) {
  this.io = io;
}

MtGoxStreamHandler.prototype = {
  saveTick: function(dp) {
    // only save things if we're in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.REDIS_HOST || !process.env.REDIS_PORT || !process.env.REDIS_AUTH) {
        throw new Error("You must set your REDIS_HOST, REDIS_PORT, and REDIS_AUTH environment variables.");
      }

      if (!this.redisClient) {
        this.redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
        this.redisClient.auth(process.env.REDIS_AUTH, function (err) {
         if (err) { throw err; }
        });
      }
      this.redisClient.lpush("mtgox:ticks", JSON.stringify(dp));
      this.redisClient.ltrim("mtgox:ticks", 0, 25000);
    }
  },

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
    this.saveTick(dp);
    this.io.sockets.emit('tick', dp);
    console.log("ticker: 1BTC = USD $" + dp.v);
  },

  default: function(data) {
    if (data.op != 'subscribe' && data.op != 'unsubscribe') {
      console.log(data.op + " (ignored)");
    }
  }

};

exports.MtGoxStreamHandler = MtGoxStreamHandler;
