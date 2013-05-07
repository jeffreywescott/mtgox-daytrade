var mtgox = require('node-mtgox-client-streaming');

if (!process.env.MTGOX_API_KEY || !process.env.MTGOX_API_SECRET) {
  throw new Error("You must set your MTGOX_API_KEY and MTGOX_API_SECRET environment variables.");
}


var mtGox = new mtgox.MtGox(process.env.MTGOX_API_KEY, process.env.MTGOX_API_SECRET);
mtGox.unsubscribe('trade');
mtGox.unsubscribe('depth');
//mtGox.unsubscribe('ticker');

mtGox.authEmit({
  call: 'private/info'
});


var MtGoxStreamHandler = {
  lastTickerValue: null,

  private: function(data) {
    switch(data.private) {
      case 'ticker':
        this.ticker(data);
        break;
      default:
        console.log(data.op+"/"+data.private+" (ignored)");
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
