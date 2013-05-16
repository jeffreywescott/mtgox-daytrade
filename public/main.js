$(document).ready(function () {

  // draw chart
  //Highcharts.setOptions({ global : { useUTC : false } });
  $('#chart').highcharts('StockChart', {
    chart: {
      backgroundColor: "#222",
      shadow: true
    },

    colors: [ "aqua", "fuchsia", "blue", "white", "teal", "purple" ],

    navigator: {
      series: {
        color: "maroon"
      },
    },

    rangeSelector: {
      buttons: [
        { type: 'minute',
          count: 60,
          text: '1h' },
        { type: 'minute',
          count: 60*8,
          text: '8h' },
        { type: 'day',
          count: 1,
          text: '1d' },
        { type: 'all',
          text: 'All' }
      ],
      inputEnabled: false,
      selected: 3
    },

    scrollbar: {
      enabled: false
    },

    series: [{
      name: 'BTC to USD',
      data: []
    }]
  });


  function toMoney(v) {
    return Math.round(parseFloat(v)*100)/100;
  }

  // track current data
  var socket = io.connect(window.location);
  socket.on('tick', function (data) {
    var $currPriceH1 = $('#curr-price'),
        $meanStdDevDiv = $('#mean-stddev'),
        $currPriceSpan = $currPriceH1.find('span.price'),
        $pricesList = $('ul#prices'),
        prevPrice = toMoney($currPriceSpan.text().substring(1)), // remove $
        prevColor = $currPriceSpan.css('color'),
        currPrice = toMoney(data.v),
        mean = toMoney(data.mean),
        stdDev = toMoney(data.stdDev),
        priceTemplate = '<span class="price"></span>',
        currColor = 'aqua',
        chart  = $('#chart').highcharts(),
        series = chart.series[0];

    // add the current price to the chart
    series.addPoint([data.t, currPrice], false);

    if (prevPrice) {
      if (currPrice > prevPrice) {
        currColor = 'green';
      } else if (currPrice < prevPrice) {
        currColor = 'red';
      }
    }

    // put the previous price into the price list, update the current price, and colorize / highlight as necessary
    if (prevPrice) {
      $pricesList.prepend('<li>' + priceTemplate + '</li>').find('li:first span.price').html('$' + prevPrice).css('color', prevColor);
    }
    $currPriceH1.html(priceTemplate).find('span.price').html('$' + currPrice).css('color', currColor);
    $meanStdDevDiv.html('($' + mean + ' +/- $' + stdDev + ')');
    if (currColor != 'aqua') { $currPriceH1.find('span.price').effect("highlight", {}, 500); }

    // prune the list to 100 items (which works well for both 2 and 5 columns)
    $pricesList.find('li:gt(' + 99 + ')').remove();
  });

  (function redrawChart() {
    console.log('redrawing ...');
    setTimeout(redrawChart, 5000);
    $('#chart').highcharts().redraw();
  })();
});
