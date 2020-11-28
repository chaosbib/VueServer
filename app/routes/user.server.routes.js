const user = require('../controllers/user.server.controller');

module.exports = function (app) {

    // USERS ENDPOINTS

    app.route(app.rootUrl + '/users/login')
        .post(user.login);

    app.route(app.rootUrl + '/users/logout')
        .post(user.logout);

    app.route(app.rootUrl + '/users/:id')
        .get(user.oneUser)
        .patch(user.patchUser);

    app.route(app.rootUrl + '/users')
        .post(user.registerUser);

    // USER.PHOTOS ENDPOINTS

    app.route(app.rootUrl + '/users/:id/photo')
        .put(user.uploadUserPhoto)
        .get(user.viewUserPhoto)
        .delete(user.removeUserPhoto);
};