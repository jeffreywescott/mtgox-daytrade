// see: http://www.johndcook.com/standard_deviation.html
var RunningStats = function() {
  this._init();
}

RunningStats.prototype = {

  _init: function() {
    this.numValues = 0;
    this.oldSum = this.newSum = 0.0;
    this.oldMean = this.newMean = 0.0;
    this.high = 0.0;
    this.low = Number.MAX_VALUE;
  },

  push: function(val) {
    this.numValues++;

    // See Knuth TAOCP vol 2, 3rd edition, page 232
    if (this.numValues === 1) {
      this.oldMean = this.newMean = val*1.0;
      this.oldSum = 0.0;
    } else {
      this.newMean = this.oldMean + (val - this.oldMean) / this.numValues;
      this.newSum = this.oldSum + (val - this.oldMean) * (val - this.newMean);
      // set up for next iteration
      this.oldMean = this.newMean;
      this.oldSum = this.newSum;
    }

    if (val > this.high) { this.high = val; }
    if (val < this.low) { this.low = val; }
  },

  mean: function() {
    return (this.numValues > 0) ? this.newMean : 0.0;
  },

  variance: function() {
    return ( (this.numValues > 1) ? this.newSum / (this.numValues - 1) : 0.0 );
  },

  stdDev: function() {
    return Math.sqrt( this.variance() );
  }

};

exports.RunningStats = RunningStats;
