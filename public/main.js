$(document).ready(function () {

  // draw chart
  var data = usdeur.splice(0, 500);
  $('#chart').highcharts('StockChart', {
    chart: {
      backgroundColor: "#222",
      shadow: true
    },

    colors: [
      "aqua",
      "fuchsia",
      "blue",
      "white",
      "teal",
      "purple"
    ],

    navigator: {
      series: {
        color: "maroon"
      },

      yAxis: {

      }
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
      data: data
    }]
  });

  $('#chart').click(function(e) {
    var chart  = $('#container').highcharts(),
        i      = 0,
        series = chart.series[0];
    data = usdeur.splice(0, 100);
    for (i; i < data.length; i++) {
      series.addPoint(data[i], false);
    }
    chart.redraw();
  });


  // track current data
  var socket = io.connect(window.location);
  socket.on('tick', function (data) {
    var $currPriceH1 = $('#curr-price');
    var $meanStdDevDiv = $('#mean-stddev');
    var $currPriceSpan = $currPriceH1.find('span.price');
    var $pricesList = $('ul#prices');
    var prevPrice = parseFloat($currPriceSpan.text().substring(1)); // remove $
    var prevColor = $currPriceSpan.css('color');
    var currPrice = parseFloat(data.v);
    var mean = parseFloat(data.mean);
    var stdDev = parseFloat(data.stdDev);
    var priceTemplate = '<span class="price"></span>';
    var currColor = 'aqua';
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
});
