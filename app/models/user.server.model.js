const db = require('../../config/db');

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const photoDirectory = './photos/user_photos/';

// API IMPLEMENTATION

// USERS ENDPOINTS

exports.authLogin = async function(cred, done) {

    let username = cred[0];
    let password = cred[1];
    let email = cred[2];

    let login = '';

    if (!password) {
        return done({"ERROR": "Password cannot be missing!"});
    } else if (!username && !email) {
        return done({"ERROR":"Invalid username or email"});
    } else if (!username) {
        login = username + password;
    } else if (!email) {
        login = email + password;
    }

    let login_query = "SELECT username, email, password FROM User WHERE username = '" + username + "' OR email = '" + email + "'";

    await db.getPool().query(login_query, async function (err, result) {
       if (err) return done({"ERROR": "Error selecting"});

       if (result.length === 0) {
           return done({"ERROR": "User doesn't exist"});
       }

       if (bcrypt.compareSync(password, result[0].password)) {

           let auth_token = await bcrypt.hashSync(login, 10);

           if (bcrypt.compareSync(login, auth_token)) {

               let auth_query = "UPDATE User SET auth_token = '" + auth_token + "' WHERE username = '" + username + "' OR email = '" + email + "'";

               await db.getPool().query(auth_query, async function (err) {
                   if (err) return done({"ERROR": "Error authenticating"});

                   let confirm = "SELECT user_id, auth_token FROM User WHERE username = '" + username + "' OR email = '" + email + "'";

                   await db.getPool().query(confirm, function (err, user_token) {
                       if (err) return done({"ERROR":"Error authenticating"});

                       return done({
                           "userId": user_token[0].user_id,
                           "token": user_token[0].auth_token
                       });
                   });
               });

           } else {
               return done({"ERROR": "Error authenticating"})
           }

       } else {
           return done({"ERROR": "Wrong Password!"});
       }
    });
};

exports.authLogout = async function(x_auth, done) {

    let logout_query = "SELECT auth_token FROM User WHERE auth_token = '" + x_auth + "'";

    await db.getPool().query(logout_query, async function (err, result) {
        if (err) return done({"ERROR": "Error selecting"});

        if (result.length === 0) return done({"ERROR": "User is not logged in"});

        let auth_query = "UPDATE User SET auth_token = NULL WHERE auth_token = '" + x_auth + "'";

        await db.getPool().query(auth_query, async function (err) {
            if (err) return done({"ERROR": "Error logging out"});

            let confirm = "SELECT auth_token FROM User WHERE auth_token = '" + x_auth + "'";

            await db.getPool().query(confirm, function (err, auth_token) {
                if (err) return done({"ERROR":"Error logging out"});

                if (auth_token.length > 1) return done({"ERROR":"Error logging out"});

                return done({"SUCCESS!":"Successfully logged out"});
            });
        });
    });
};

exports.addUser = async function (data, done) {

    let userExist = "SELECT username, email FROM User WHERE username = '" + data.username + "' OR email = '" + data.email + "'";
    await db.getPool().query(userExist, async function(err, result) {
        if (err) return done({"ERROR":"Error selecting"});

        if (result.length > 0) {
            if (result.username) return done({"Error": "Username already taken"});
            if (result.email) return done({"Error": "Email already taken"});
        }

        let pass = await bcrypt.hashSync(data.password, 10);

        if (!bcrypt.compareSync(data.password, pass)) return done({"ERROR":"Error hashing password"});

        let query = "INSERT into User (username, given_name, family_name, email, password) VALUES ('"
            + data.username + "', '" + data.givenName + "', '"
            + data.familyName + "', '" + data.email + "', '"
            + pass + "')";

        await db.getPool().query(query, async function(err) {
            if (err) {
                return done({"ERROR":"Error adding user"});
            }

            let confirm = "SELECT * FROM User WHERE username = '" + data.username + "' AND email = '" + data.email + "'";

            await db.getPool().query(confirm, function(err, rows) {
                if (err) {
                    return done({"ERROR":"Error selecting"});
                }

                return done({"userId" : rows[0].user_id})
            });
        });
    });
};

exports.updateUser = async function (x_auth, user_id, data, done) {

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized"});
    if (data.familyName === '' || /\d/.test(data.password)) return done({"ERROR":"Bad Request"});

    let userExist = "SELECT * FROM User WHERE user_id = " + user_id;
    await db.getPool().query(userExist, async function(err, result) {
        if (err) return done({"ERROR":"Error selecting"});

        if (result.length === 0) return done({"Error": "Not Found"});

        if (!(result[0].auth_token === x_auth)) return done({"ERROR":"Forbidden"});

        let update_query = "UPDATE User SET";

        if (data.givenName) update_query += " given_name = '" + data.givenName + "',";
        if (data.familyName) update_query += " family_name = '" + data.familyName + "',";
        if (data.password) {
            let pass = await bcrypt.hashSync(data.password, 10);
            if (!bcrypt.compareSync(data.password, pass)) return done({"ERROR":"Error hashing password"});
            update_query += " password = '" + pass + "',";
        }

        update_query = (update_query.substring(0, update_query.length - 1) + " WHERE user_id = " + user_id);

        await db.getPool().query(update_query, function (err) {
            if (err) return done({"ERROR":"Error updating"});

            return done({"SUCCESS": "Successfully updated"});
        })

    });
};

exports.getOneUser = async function (x_auth, user_id, done) {
    let query = "SELECT username, email, given_name, family_name, auth_token FROM User WHERE user_id = " + user_id;

    await db.getPool().query(query, function (err, rows) {

        if (err) return done(err);

        if (rows.length === 0) return done({"ERROR": "Not Found"});

        if (x_auth === rows[0].auth_token) {
            return done({
                "username": rows[0].username,
                "email": rows[0].email,
                "givenName": rows[0].given_name,
                "familyName": rows[0].family_name
            });
        } else {
            return done({
                "username": rows[0].username,
                "givenName": rows[0].given_name,
                "familyName": rows[0].family_name
            });
        }
    })
};

// USER.PHOTOS ENDPOINTS

exports.updateUserPhoto = async function (x_auth, user_id, photo, img_type, done) {

    let user_query = "SELECT * FROM User WHERE user_id = " + user_id;

    await db.getPool().query(user_query, async function (err, users) {

        if (err) return done({"ERROR":"Bad Request", "status":400});

        if (users.length === 0) return done({"ERROR": "Not Found", "status": 404});


        if (x_auth === users[0].auth_token) {

            let photo_file_name = crypto.randomBytes(10).toString('hex');

            let user_photo = photo_file_name + "." + img_type;

            // CREATE DIRECTORY IF NOT EXISTS

            if (!fs.existsSync(photoDirectory)) {
                fs.mkdir(photoDirectory, {recursive: true}, function (err) {
                    if (err) return done({"ERROR": "Bad Request", "status": 400});
                });
            }

            let replace = false;
            if (!(users[0].profile_photo_filename === null)) replace = true;
            let del_photo = users[0].profile_photo_filename;

            fs.writeFile(photoDirectory + user_photo, photo, function (err) {
                if (err) return done({"ERROR":"Bad Request","status":400});
            });

            let photo_query = "UPDATE User SET profile_photo_filename = '" + user_photo + "' WHERE user_id = " + user_id;

            await db.getPool().query(photo_query, async function (err) {
                if (err) return done({"ERROR":"Bad Request", "status":400});

                // We just want to delete the old photo, we don't want a server crash :)
                if (fs.existsSync(photoDirectory + del_photo)) {
                    fs.unlink(photoDirectory + del_photo, function (err) {
                        if (err) console.log(err);
                    });
                }

                if (replace) {
                    return done({
                        "message":"OK",
                        "status":200
                    })
                } else {
                    return done({
                        "message":"Created",
                        "status":201
                    })
                }
            });

        } else {

            return done({"ERROR": "Forbidden", "status": 403});

        }
    })

};

exports.getUserPhoto = async function (user_id, done) {

    let user_query = "SELECT * FROM User WHERE user_id = " + user_id;

    await db.getPool().query(user_query, async function (err, users) {

        if (err) return done({"ERROR": "Bad Request", "status": 400});

        if (users.length === 0) return done({"ERROR": "Not Found", "status": 404});

        let photo_file = users[0].profile_photo_filename;

        if (!fs.existsSync(photoDirectory + photo_file)) return done({"ERROR":"Not Found","status":404});

        fs.readFile(photoDirectory + photo_file, function (err, binary) {
            if (err) return done ({"ERROR":"Not Found", "status":404});
            return done({
                "body": binary,
                "type": path.extname(photo_file).substring(1, path.extname(photo_file).length)
            });
        });
    });
};

exports.deleteUserPhoto = async function (x_auth, user_id, done) {

    let user_query = "SELECT * FROM User WHERE user_id = " + user_id;

    await db.getPool().query(user_query, async function (err, users) {

        if (err) return done({"ERROR":"Not Found", "status":404});

        if (users.length === 0) return done({"ERROR": "Not Found", "status": 404});

        if (users[0].profile_photo_filename === null) return done({"ERROR":"Not Found", "status":404});
        let del_photo = users[0].profile_photo_filename;

        if (x_auth === users[0].auth_token) {

            let photo_query = "UPDATE User SET profile_photo_filename = null WHERE user_id = " + user_id;

            await db.getPool().query(photo_query, async function (err) {
                if (err) return done({"ERROR":"Not Found", "status":404});

                // We just want to delete the photo, we don't want a server crash :)
                if (fs.existsSync(photoDirectory + del_photo)) {
                    fs.unlink(photoDirectory + del_photo, function (err) {
                        if (err) console.log(err);
                    });
                }

                return done({
                    "message":"OK",
                    "status":200
                });
                }
            );
        } else {
            return done({"ERROR": "Forbidden", "status": 403});
        }
    })

};