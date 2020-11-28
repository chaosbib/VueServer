const user = require('../models/user.server.model');

const e_validate = require('email-validator');

// API IMPLEMENTATION

// USERS ENDPOINTS

exports.login = async function (req, res) {
    try {
        let cred = [req.body.username, req.body.password, req.body.email];
        await user.authLogin(cred, function (result) {
            if (result.ERROR) {
                res.statusMessage = 'Bad Request';
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
        res.status(400)
            .send();
    }
};

exports.logout = async function (req, res) {

    let x_auth = req.headers['x-authorization'];

    if (x_auth === '') {
        res.statusMessage = 'Unauthorized';
        res.status(401)
            .send();
    } else {
        try {
            await user.authLogout(x_auth, function (result) {
                if (result.ERROR) {
                    res.statusMessage = 'Unauthorized';
                    res.status(401)
                        .send();
                } else {
                    res.statusMessage = 'OK';
                    res.status(200)
                        .send();
                }
            });
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        }
    }
};

exports.oneUser = async function (req, res) {
    try {
        let x_auth = req.headers['x-authorization'];
        let user_id = req.params.id;
        await user.getOneUser(x_auth, user_id, function (result) {
            if (result.ERROR) {
                res.statusMessage = 'Not Found';
                res.status(404)
                    .send();
            } else {
                res.statusMessage = 'OK';
                res.status(200)
                    .send(result);
            }
        });
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Not Found';
        res.status(404)
            .send();
    }
};

exports.registerUser = async function (req, res) {
    try {
        let values = req.body;
        if (!values.username || !values.email || !values.password || !e_validate.validate(values.email)) {
            res.statusMessage = 'Bad Request';
            res.status(400)
                .send();
        } else {
            await user.addUser(values, function (result) {
                if (result.ERROR) {
                    res.statusMessage = 'Bad Request';
                    res.status(400)
                        .send(result);
                } else {
                    res.statusMessage = 'Created';
                    res.status(201)
                        .json(result);
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

exports.patchUser = async function (req, res) {
    let x_auth = req.headers['x-authorization'];
    let user_id = req.params.id;
    let values = req.body;
    if (!values.givenName && !values.familyName && !values.password) {
        res.statusMessage = 'Bad Request';
        res.status(400)
            .send();
    } else {
        try {
            await user.updateUser(x_auth, user_id, values, function (result) {
                if (result.ERROR) {
                    if (result.ERROR === "Unauthorized") {
                        res.statusMessage = "Unauthorized";
                        res.status(401)
                            .send();
                    } else if (result.ERROR === "Not Found") {
                        res.statusMessage = "Not Found";
                        res.status(404)
                            .send();
                    } else if (result.ERROR === "Forbidden") {
                        res.statusMessage = "Forbidden";
                        res.status(403)
                            .send();
                    } else {
                        res.statusMessage = "Bad Request";
                        res.status(400)
                            .send();
                    }
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

// USER.PHOTOS ENDPOINTS

exports.uploadUserPhoto = async function (req, res) {
    try {
        let x_auth = req.headers['x-authorization'];
        let img_type = req.headers['content-type'];
        img_type = img_type.substring(6, img_type.length);
        let user_id = req.params.id;
        let photo = req.body;

        if (x_auth === '' || !x_auth) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            await user.updateUserPhoto(x_auth, user_id, photo, img_type, function (result) {
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

exports.viewUserPhoto = async function (req, res) {
    let user_id = req.params.id;
    try {
        await user.getUserPhoto(user_id, function (result) {
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

exports.removeUserPhoto = async function (req, res) {
    try {
        let x_auth = req.headers['x-authorization'];
        let user_id = req.params.id;

        if (x_auth === '' || !x_auth) {
            res.statusMessage = 'Unauthorized';
            res.status(401)
                .send();
        } else {
            await user.deleteUserPhoto(x_auth, user_id, function (result) {
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