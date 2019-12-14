const Gpio = require('onoff').Gpio;
const button = new Gpio(23, 'in', 'rising', {debounceTimeout: 100});
const led = new Gpio(24, 'out');

led.writeSync(0);
button.watch((err, value) => console.log(value));