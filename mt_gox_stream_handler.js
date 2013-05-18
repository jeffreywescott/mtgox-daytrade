var redis = require('redis'),
    stats = require('./running_stats');


var MtGoxStreamHandler = function(mtGoxClient, io) {
  this.mtGoxClient = mtGoxClient;
  this.io = io;
  this.runningStats = new stats.RunningStats();
  this.runningStats.ready = false;
  this._initStats();
  this.__numRedisErrors = 0;
}

MtGoxStreamHandler.prototype = {
  _initStats: function() {
    var self = this;

    // pull values out of redis and add them to our running statistics
    var initStats = function(numAttempts) {
      self._redisClient().lrange('mtgox:ticks', 0, 24999, function(error, ticks) {
        if (error) {
          if (numAttempts < 10) {
            console.log("ERROR:", error);
            setTimeout(function() { initStats(numAttempts+1) }, 3000);
          } else {
            throw "ERROR: failed 10 times trying to initialize stats -- " + error;
          }
        } else {
          console.log("INFO: Setting up running stats using previously recorded data.");
          for (var i in ticks) {
            var dp = JSON.parse(ticks[i]);
            self.runningStats.push(dp.v);
            self.io.sockets.emit('historic', dp);
          }
          self.runningStats.ready = true;
        }
      });
    }

    if (self._redisClient()) {
      initStats(0);
    } else {
      setTimeout(function() { initStats(0) }, 3000);
    }
  },

  _redisClient: function() {
    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
      console.log("WARNING: REDIS_HOST and REDIS_PORT are not both set -- using localhost!");
      process.env.REDIS_HOST = "localhost";
      process.env.REDIS_PORT = "6379";
    } else {
      if (!this.__redisClient) {
        // be sure to handle re-authorization
        this.__redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
        if (process.env.REDIS_AUTH) {
          this.__redisClient.auth(process.env.REDIS_AUTH);
        }

        var self = this;
        this.__redisClient.on("error", function (err) {
          if (self.__numRedisErrors < 3) {
            self.__numRedisErrors++;
            console.log("ERROR: unhandled redis error --", err);
          } else {
            throw "ERROR: 10 redis failures exceeded -- " + err;
          }
        });
      }
    }
    
    return this.__redisClient;
  },

  saveTick: function(dp) {
    // save to redis
    if (this._redisClient()) {
      var redis = this._redisClient();
      // only write the tick if it's newer than the latest tick already stored
      this._redisClient().lindex("mtgox:ticks", 0, function(err, json) {
        if (err) {
          console.log("ERROR:", err);
        } else {
          var lastTick = JSON.parse(json);
          if (!lastTick || dp.t > lastTick.t) { // if there was no lastTick, this is the first tick ever recorded
            redis.lpush("mtgox:ticks", JSON.stringify(dp));
            redis.ltrim("mtgox:ticks", 0, 25000);
          } else {
            console.log("DEBUG: not saving datapoint since it's older than the last one saved.");
          }
        }
      });
    } else {
      console.log("WARNING: _redisClient() not defined, unable to save tick.");
    }

    // add to running statistics
    if (this.runningStats.ready) {
      this.runningStats.push(dp.v);
    } else {
      console.log("WARNING: runningStats not yet ready, tick not added to stats.");
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
    dp.mean = this.runningStats.mean();
    dp.stdDev = this.runningStats.stdDev();
    dp.low = this.runningStats.low;
    dp.high = this.runningStats.high;
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
