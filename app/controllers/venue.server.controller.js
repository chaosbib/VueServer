const venue = require('../models/venue.server.model');

// API IMPLEMENTATION

// REVIEWS ENDPOINTS

exports.userReviews = async function (req, res) {

    let x_auth = req.headers['x-authorization'];
    let user_id = req.params.id;

    if (x_auth === '' || !x_auth) {
        res.statusMessage = 'Unauthorized';
        res.status(401)
            .send();
    } else {
        try {
            await venue.getUserReviews(x_auth, user_id, function (result) {
                if (result.ERROR) {
                    if (result.ERROR === 'Unauthorized') {
                        res.statusMessage = 'Unauthorized';
                        res.status(401)
                            .send();
                    } else {
                        res.statusMessage = 'Not found';
                        res.status(404)
                            .send();
                    }
                } else {
                    res.statusMessage = 'OK';
                    res.status(200)
                        .json(result);
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Bad Request';
            res.status(400)
                .send();
        }
    }
};

exports.registerVenueReview = async function (req, res) {

    let x_auth = req.headers['x-authorization'];
    let venue_id = req.params.id;
    let values = req.body;

    if (x_auth === '' || !x_auth) {
        res.statusMessage = 'Unauthorized';
        res.status(401)
            .send();
    } else {
        try {
            await venue.addVenueReview(x_auth, venue_id, values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = result.ERROR;
                    res.status(result.status)
                        .send();
                } else {
                    res.statusMessage = 'Created';
                    res.status(201)
                        .send();
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Bad Request';
            res.status(400)
                .send();
        }
    }
};

exports.venueReviews = async function (req, res) {

    let venue_id = req.params.id;

    try {
        await venue.getVenueReviews(venue_id, function (result) {
            if (result.ERROR) {
                res.statusMessage = result.ERROR;
                res.status(result.status)
                    .send();
            } else {
                res.statusMessage = 'OK';
                res.status(200)
                    .json(result);
            }
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

// VENUES ENDPOINTS

exports.venues = async function(req, res) {
    // HAVE FILTERS
    if (Object.keys(req.query).length) {
        try {
            await venue.filterVenues(req.query, function (result) {
                if (result.ERROR) {
                    res.statusMessage = "Bad Request";
                    res.status(400)
                        .send();
                } else {
                    res.statusMessage = 'OK';
                    res.status(200)
                        .json(result);
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Bad Request';
            res.status(200)
                .send();
        }
    }

    // NO FILTERS
    try {
        await venue.getVenues(function (result) {
            res.statusMessage = 'OK';
            res.status(200)
                .json(result);
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Bad Request';
        res.status(400)
            .send();
    }
};

exports.oneVenue = async function(req, res) {
    try {
        let venue_id = req.params.id;
        await venue.getOneVenue(venue_id, function (result) {
                if (result.ERROR) {
                    res.statusMessage = 'Not Found';
                    res.status(404)
                        .send();
                } else {
                    res.statusMessage = 'OK';
                    res.status(200)
                        .json(result);
                }
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

exports.categories = async function(req, res) {
    try {
        await venue.getCategories(function (result) {
            res.statusMessage = 'OK';
            res.status(200)
                .json(result);
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Bad Request';
        res.status(400)
            .send();
    }
};

exports.registerVenue = async function (req, res) {

    let x_auth = req.headers['x-authorization'];

    if (x_auth === '') {
        res.statusMessage = 'Unauthorized';
        res.status(401)
            .send();
    } else {
        try {
            let values = req.body;
            await venue.addVenue(x_auth, values, function (result) {
                if (result.ERROR) {
                    if (result.ERROR === "Unauthorized") {
                        res.statusMessage = "Unauthorized";
                        res.status(401)
                            .send();
                    } else {
                        res.statusMessage = "Bad Request";
                        res.status(400)
                            .send();
                    }
                } else {
                    res.statusMessage = 'Created';
                    res.status(201)
                        .json(result);
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Bad Request';
            res.status(400)
                .send();
        }
    }
};

exports.patchVenue = async function (req, res) {

    let x_auth = req.headers['x-authorization'];
    let venue_id = req.params.id;
    let values = req.body;

    if (x_auth === '' || !x_auth) {
        res.statusMessage = 'Unauthorized';
        res.status(401)
            .send();
    } else {
        try {
            await venue.updateVenue(x_auth, venue_id, values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = result.ERROR;
                    res.status(result.status)
                        .send();
                } else {
                    res.statusMessage = 'OK';
                    res.status(200)
                        .send();
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Bad Request';
            res.status(400)
                .send();
        }
    }
};

// VENUES.PHOTOS ENDPOINTS

exports.uploadVenuePhoto = async function (req, res) {
    try {

        let x_auth = req.headers['x-authorization'];
        let venue_id = req.params.id;
        let photo = req.files.photo.path;
        photo = photo.substring(20, photo.length);
        let values = req.fields;

        if (x_auth === '' || !x_auth) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            await venue.addVenuePhoto(x_auth, venue_id, photo, values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = result.ERROR;
                    res.status(result.status)
                        .send();
                } else {
                    res.statusMessage = result.message;
                    res.status(result.status)
                        .send();
                }
            });
        }

    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Bad Request';
        res.status(400)
            .send();
    }
};

exports.viewVenuePhoto = async function (req, res) {
    try {
        let values = req.params;

        await venue.getVenuePhoto(values, function (result) {
            if (result.ERROR) {
                res.statusMessage = 'Not Found';
                res.status(404)
                    .send();
            } else {
                res.statusMessage = 'OK';
                res.setHeader('content-type', 'image/' + result.type);
                res.status(200)
                    .end(result.body, 'uint8array');
            }
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

exports.removeVenuePhoto = async function (req, res) {
    try {
        let x_auth = req.headers['x-authorization'];
        let values = req.params;

        if (x_auth === '' || !x_auth) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            await venue.deleteVenuePhoto(x_auth, values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = result.ERROR;
                    res.status(result.status)
                        .send();
                } else {
                    res.statusMessage = result.message;
                    res.status(result.status)
                        .send();
                }
            });
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

exports.changeVenuePhoto = async function (req, res) {
    try {
        let x_auth = req.headers['x-authorization'];
        let values = req.params;

        if (x_auth === '' || !x_auth) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            await venue.setVenuePhoto(x_auth, values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = result.ERROR;
                    res.status(result.status)
                        .send();
                } else {
                    res.statusMessage = result.message;
                    res.status(result.status)
                        .send();
                }
            });
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

// END OF IMPLEMENTATION