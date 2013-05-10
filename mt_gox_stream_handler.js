var redis = require('redis'),
    stats = require('./running_stats');


var MtGoxStreamHandler = function(mtGoxClient, io) {
  this.mtGoxClient = mtGoxClient;
  this.io = io;
  this.runningStats = new stats.RunningStats();
  this._init();
}

MtGoxStreamHandler.prototype = {
  _init: function() {
    if (this._redisClient()) {
      var runningStats = this.runningStats;
      // pull values out of redis and add them to our running statistics
      this._redisClient().lrange('mtgox:ticks', 0, 24999, function(error, ticks) {
        if (error) {
          throw error;
        } else {
          for (var i in ticks) {
            var price = JSON.parse(ticks[i]).v;
            runningStats.push(price);
          }
        }
      });
    }
  },

  _redisClient: function() {
    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT || !process.env.REDIS_AUTH) {
      console.log("WARNING: REDIS_HOST, REDIS_PORT, and REDIS_AUTH are not set -- not saving ticks!");
    }

    if (!this.__redisClient) {
      this.__redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
      this.__redisClient.auth(process.env.REDIS_AUTH, function (err) {
       if (err) { throw err; }
      });
    }

    return this.__redisClient;
  },

  saveTick: function(dp) {
    if (this._redisClient()) {
      var redis = this._redisClient();
      // only write the tick if it's newer than the latest tick already stored
      this._redisClient().lindex("mtgox:ticks", 0, function(err, json) {
        var firstTick = JSON.parse(json);
        if (dp.t > firstTick.t) {
          redis.lpush("mtgox:ticks", JSON.stringify(dp));
          redis.ltrim("mtgox:ticks", 0, 25000);
        } else {
          console.log("DEBUG: not saving datapoint since it's older than the last one saved.");
        }
      });
    } else {
      console.log("WARNING: _redisClient() not defined, unable to save tick.");
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
    this.runningStats.push(dp.v);
    dp.mean = this.runningStats.mean();
    dp.stdDev = this.runningStats.stdDev();
    this.io.sockets.emit('tick', dp);
    console.log("current: $" + dp.v + ", mean: $" + dp.mean + ", stdDev: $" + dp.stdDev);
  },

  default: function(data) {
    if (data.op != 'subscribe' && data.op != 'unsubscribe') {
      console.log(data.op + " (ignored)");
    }
  }

};

exports.MtGoxStreamHandler = MtGoxStreamHandler;
