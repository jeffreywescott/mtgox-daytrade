var mtgox = require('node-mtgox-client-streaming');

var API_KEY = '0ce0c4a6-fc1d-4cce-b912-9890e1bdbc4a';
var API_SECRET = 'jV0xU+X3duqasJW/8FdXbrEg8BizdPwKIAFjk1678KMAiSaTcX08cV2jXWq9CunY7PpKBBY5NuSbrFLWK7Q97A==';

var mtGox = new mtgox.MtGox(API_KEY, API_SECRET);
mtGox.unsubscribe('trade');
mtGox.unsubscribe('depth');
//mtGox.unsubscribe('ticker');

mtGox.onMessage(function(data) {
  console.log(data);
});

if (API_KEY && API_SECRET) {
  mtGox.authEmit({
    call: 'private/info'
  });
}
