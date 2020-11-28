const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const photoDirectory = './photos/';

const allowCrossOriginRequests = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
};

module.exports = function () {
    const app = express();
    app.rootUrl = '/api/v1';

    // MIDDLEWARE
    app.use(allowCrossOriginRequests);
    app.use(bodyParser.json());
    app.use(bodyParser.raw({ type: 'text/plain' }));  // for the /executeSql endpoint
    app.use(bodyParser.raw({ limit: '50mb', type: 'image/jpeg' }));
    app.use(bodyParser.raw({ limit: '50mb', type: 'image/png' }));

    // ROUTES
    require('../app/routes/backdoor.routes')(app);
    require('../app/routes/user.server.routes')(app);
    require('../app/routes/venue.server.routes')(app);

    // DEBUG (you can remove this)
    app.get('/', function (req, res) {
        res.send({ 'message': 'Hello World!' })
    });

    // Create directory for venue_photos
    if (!fs.existsSync(photoDirectory + 'venue_photos/'))
        fs.mkdir(photoDirectory + 'venue_photos/', {recursive: true}, function (err){if (err) throw (err)});

    return app;
};
