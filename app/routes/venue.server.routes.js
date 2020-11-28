const venue = require('../controllers/venue.server.controller');
const formidable = require('express-formidable');

const photoDirectory = './photos/venue_photos/';

module.exports = function (app) {
    // API IMPLEMENTATION

    // REVIEWS ENDPOINTS

    app.route(app.rootUrl + '/users/:id/reviews')
        .get(venue.userReviews);

    app.route(app.rootUrl + '/venues/:id/reviews')
        .post(venue.registerVenueReview)
        .get(venue.venueReviews);

    // VENUES ENDPOINTS

    app.route(app.rootUrl + '/venues')
        .get(venue.venues)
        .post(venue.registerVenue);

    app.route(app.rootUrl + '/venues/:id')
        .get(venue.oneVenue)
        .patch(venue.patchVenue);

    app.route(app.rootUrl + '/categories')
        .get(venue.categories);

    // VENUES.PHOTOS ENDPOINTS

    app.route(app.rootUrl + '/venues/:id/photos')
        .post(formidable({uploadDir: photoDirectory, keepExtensions: true}), venue.uploadVenuePhoto);

    app.route(app.rootUrl + '/venues/:id/photos/:photoFilename')
        .get(venue.viewVenuePhoto)
        .delete(venue.removeVenuePhoto);

    app.route(app.rootUrl + '/venues/:id/photos/:photoFilename/setPrimary')
        .post(venue.changeVenuePhoto);

};