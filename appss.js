const Raspistill = require('node-raspistill').Raspistill;
const camera = new Raspistill();
const Jimp = require('jimp');

const Gpio = require('onoff').Gpio;
const button = new Gpio(23, 'in', 'rising', {debounceTimeout: 100});
const led = new Gpio(24, 'out');
led.writeSync(0);

const express = require('express');
const app = express();
const server = require('http').createServer(app).listen(8000, () => {
    console.log('listening on', 3000);
})
const path = require('path');

const io = require('socket.io').listen(server);
io.sockets.on('connection', socket => {
    console.log('connected display: ' + socket.id);
})

const runwayio = require('socket.io-client');
const im2txtsocket = runwayio.connect('http://kk-radiant.local:3000', {reconnect: true});
const stylesocket = runwayio.connect('http://kk-radiant.local:3002', {reconnect: true});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'display.html'));
})

let slowBlink, fastBlink;

button.watch((err, value) => {
    if (err) throw err;
    let slowBlink = setInterval(_ => led.writeSync(led.readSync() ^ 1), 200);

    camera.takePhoto().then((photo) => {
        // console.log(photo);
        Jimp.read(photo, async (err, image) => {
            if (err) throw err;

            image
                .resize(Jimp.AUTO, 480)
                .cover(480, 480)
            let image64 = await image.getBase64Async(Jimp.MIME_JPEG);
            console.log('image captured');

            clearInterval(slowBlink);
    
            im2txtsocket.emit('query', {
                "image": image64
            });
    
            stylesocket.emit('query', {
                "content_image": image64
            });
        });
    })

})



stylesocket.on('data', data => {

    console.log('image received');
    let url = data.image.replace(/^data:image\/\w+;base64,/, "");
    let imgBuffer = Buffer.from(url, 'base64');

    Jimp.read(imgBuffer, async (err, image) => {
        if (err) throw err;
        console.log('image processed');

        image
            .resize(480, 480)
            .flip(true, false)
            .rotate(90)
            .quality(75)
        let image64 = await image.getBase64Async(Jimp.MIME_JPEG);
        console.log('image processed');

        io.sockets.emit('image', image64);
        led.writeSync(0);
        setTimeout(_ => led.writeSync(1), 200);    
    })

    // io.sockets.emit('image', data.image);
})
