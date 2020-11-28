const db = require('../../config/db');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const stats = require('stats-lite');

const photoDirectory = './photos/venue_photos/';


// API IMPLEMENTATION

// REVIEWS ENDPOINTS

exports.getUserReviews = async function(x_auth, user_id, done) {

    let query = "SELECT * FROM User";

    await db.getPool().query(query, async function (err, users) {
        if (err) return done({"ERROR":"Error selecting"});

        if (users.length === 0) return done({"ERROR":"Not found"});

        let auth = false;
        let username = "";

        for (let i = 0; i < users.length; i++) {
            if (users[i].auth_token === x_auth) {
                auth = true;
            }
            if (parseInt(users[i].user_id) === parseInt(user_id)) {
                username = users[i].username;
            }
        }

        if (auth) {
            let review_query = "SELECT * FROM Review WHERE review_author_id = " + user_id;

            await db.getPool().query(review_query, async function (err, reviews) {
                if (err) return done({"ERROR": "Error selecting"});

                if (reviews.length === 0) return done({"ERROR": "Not found"});

                let venue_query = "SELECT * FROM Venue";

                await db.getPool().query(venue_query, async function (err, venues) {
                    if (err) return done({"ERROR": "Error selecting"});

                    let venue = venues[0];

                    if (venues.length === 0) return done({"ERROR": "Not found"});

                    let category_query = "SELECT * FROM VenueCategory"; // WHERE category_id = " + venue.category_id;

                    await db.getPool().query(category_query, async function (err, categories) {
                        if (err) return done({"ERROR": "Error selecting"});

                        if (categories.length === 0) return done({"ERROR": "Not Found"});

                        let photo_query = "SELECT * FROM VenuePhoto WHERE is_primary = true";

                        await db.getPool().query(photo_query, async function (err, photos) {
                            if (err) return done({"ERROR": "Error selecting"});

                            let reviewList = [];

                            for (let i = 0; i < reviews.length; i++) {
                                let review = reviews[i];
                                let venueId = null;
                                let venueName = null;
                                let categoryName = null;
                                let city = null;
                                let shortDescription = null;
                                let primaryPhoto = null;

                                let categoryId = null;

                                //check venue
                                for (let v = 0; v < venues.length; v++) {
                                    let venue = venues[v];
                                    if (review.reviewed_venue_id === venue.venue_id) {
                                        venueId = venue.venue_id;
                                        venueName = venue.venue_name;
                                        city = venue.city;
                                        shortDescription = venue.short_description;
                                        categoryId = venue.category_id;
                                    }
                                }
                                //check category
                                for (let c = 0; c < categories.length; c++) {
                                    let category = categories[c];
                                    if (categoryId === category.category_id) categoryName = category.category_name;
                                }
                                //check photo
                                for (let p = 0; p < photos.length; p++) {
                                    let photo = photos[p];
                                    if (venueId === photo.venue_id) {
                                        primaryPhoto = photo.photo_filename;
                                    }
                                }

                                reviewList.push({
                                    "reviewAuthor": {
                                        "userId": user_id,
                                        "username": username
                                    },
                                    "reviewBody": review.review_body,
                                    "starRating": review.star_rating,
                                    "costRating": review.cost_rating,
                                    "timePosted": review.time_posted,
                                    "venue": {
                                        "venueId": venueId,
                                        "venueName": venueName,
                                        "categoryName": categoryName,
                                        "city": city,
                                        "shortDescription": shortDescription,
                                        "primaryPhoto": primaryPhoto
                                    }
                                });
                            }

                            if (!reviewList.length) return done({"ERROR":"Not Found", "status":404});

                            return done(reviewList);

                        });
                    });
                });
            });
        } else {
            return done({"ERROR":"Unauthorized","status":401});
        }
    });

};

exports.addVenueReview = async function (x_auth, venue_id, data, done) {

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized", "status":401});
    if (!data.starRating || data.starRating > 5 || !(data.starRating % 1 === 0) ||
        !(data.costRating % 1 === 0) || data.costRating < 0)
        return done({"ERROR":"Bad Request", "status":400});

    let userExist = "SELECT * FROM User WHERE auth_token = '" + x_auth + "'";
    await db.getPool().query(userExist, async function(err, users) {
        if (err) return done({"ERROR":"Bad Request","status":400});

        if (users.length === 0) return done({"ERROR": 'Unauthorized', "status": 401});

        let user_id = users[0].user_id;
        let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;


        await db.getPool().query(venue_query, async function (err, venues) {
            if (err) return done({"ERROR":"Bad Request","status":400});

            if (venues.length === 0) return done({"ERROR":"Not Found", "status":404});

            if (venues[0].admin_id === user_id) return done({"ERROR":"Forbidden", "status":403});

            let review_query = "SELECT * FROM Review WHERE reviewed_venue_id = "
                                + venue_id + " AND review_author_id = " + user_id;

            await db.getPool().query(review_query, async function (err, reviews) {
                if (err) return done({"ERROR":"Bad Request", "status":400});

                if (reviews.length) return done({"ERROR":"Forbidden","status":403});

                let date = moment().format("YYYY-MM-DD HH:mm:ss");

                let user_review = "INSERT INTO Review (reviewed_venue_id, review_author_id," +
                    " review_body, star_rating, cost_rating, time_posted) " +
                    "VALUES (" + venue_id + ", " + user_id + ", \"" + data.reviewBody + "\", " +
                    data.starRating + ", " + data.costRating + ", \"" + date + "\")";

                await db.getPool().query(user_review, function (err) {
                    if (err) return done({"ERROR":"Bad Request", "status":400});

                    return done({"message": "Created", "status":201});
                });
            });
        });
    });
};

exports.getVenueReviews = async function (venue_id, done) {

    let review_query = "SELECT * FROM Review WHERE reviewed_venue_id = " + venue_id;

    await db.getPool().query(review_query, async function (err, reviews) {
        if (err) return done({"ERROR":"Not Found","status":404});

        if (reviews.length === 0) done({"ERROR":"Not Found","status":404});

        let idList = [];

        for (let i = 0; i < reviews.length; i++) {
            idList.push(reviews[i].review_author_id);
        }

        let user_query = "SELECT * FROM User WHERE user_id in (" + idList + ")";

        await db.getPool().query(user_query, async function (err, users){

            if (err) return done({"ERROR":"Not Found","status":404});

            if (users.length === 0) return done({"ERROR":"Not Found","status":404});

            let reviewList = [];

            for (let i = 0; i < reviews.length; i++) {
                let review = reviews[i];
                let username = null;
                for (let u = 0; u < users.length; u++) {
                    if (review.review_author_id === users[u].user_id) username = users[u].username;
                }

                reviewList.push({
                    "reviewAuthor": {
                        "userId": review.review_author_id,
                        "username": username
                    },
                    "reviewBody": review.review_body,
                    "starRating": review.star_rating,
                    "costRating": review.cost_rating,
                    "timePosted": review.time_posted
                });
            }

            if (reviewList.length === 0) return done({"ERROR":"Not Found","status":404});

            let reviewSorted = [];
            let reviews_done = [];

            while (reviews_done.length < reviewList.length) {
                let most_recent = null;
                for (let i = 0; i < reviewList.length; i++) {
                    let review = reviewList[i];
                    if (review["timePosted"] >= most_recent
                        && !reviews_done.includes(review["reviewAuthor"]["userId"])) {
                        most_recent = review["timePosted"];
                    }
                }
                for (let j = 0; j < reviewList.length; j++) {
                    let review = reviewList[j];
                    if (review["timePosted"] === most_recent
                        && !reviews_done.includes(review["reviewAuthor"]["userId"])) {
                        reviews_done.push(review["reviewAuthor"]["userId"]);
                        reviewSorted.push(reviewList[j]);
                    }
                }
            }
            return done(reviewSorted);
        })

    })

};

// VENUES ENDPOINTS

exports.getVenues = async function(done) {

    await db.getPool().query('SELECT * FROM Venue', async function (err, venues) {
        if (err) return done({"ERROR":"Error selecting"});

        let rating_query = "SELECT * FROM Review";
        await db.getPool().query(rating_query, async function (err, ratings) {
            if (err) return done({"ERROR": "Error selecting"});

            let photo_query = "SELECT * FROM VenuePhoto WHERE is_primary = 1";
            await db.getPool().query(photo_query, async function (err, photos) {
                if (err) return done({"ERROR": "Error selecting"});

                let venueList = [];

                for (let i = 0; i < venues.length; i++) {
                    let venue = venues[i];
                    let starList = [];
                    let costList = [];
                    let star_rating = 0;
                    let cost_rating = 0;
                    let primary = null;

                    for (let j = 0; j < ratings.length; j++) {
                        rating = ratings[j];
                        if (rating.reviewed_venue_id === venue.venue_id) {
                            starList.push(rating.star_rating);
                            costList.push(rating.cost_rating);
                        }
                    }
                    for (let k = 0; k < photos.length; k++) {
                        photo = photos[k];
                        if ((photo.venue_id === venue.venue_id) && photo.is_primary === 1) {
                            primary = photo.photo_filename;
                        }
                    }

                    star_rating = parseFloat(stats.mean(starList));
                    cost_rating = stats.mode(costList);
                    if (!(typeof cost_rating === typeof 1)) {
                        let get_max = Array.from(cost_rating);
                        cost_rating = Math.max(...get_max);
                    }

                    if (!star_rating) star_rating = 0;
                    if (!cost_rating) cost_rating = 0;

                    venueList.push({
                        'venueId': venue.venue_id,
                        'venueName': venue.venue_name,
                        'categoryId': venue.category_id,
                        'city': venue.city,
                        'shortDescription': venue.short_description,
                        'latitude': venue.latitude,
                        'longitude': venue.longitude,
                        'meanStarRating': star_rating.toFixed(2),
                        'modeCostRating': cost_rating,
                        'primaryPhoto': primary,
                    });
                }
                return done(venueList);
            });
        });
    });

};

exports.filterVenues = async function(filter, done) {

    if (filter['minStarRating'] > 5) return done({"ERROR":"Bad Request","status":400});
    if (filter['minStarRating'] < 0) return done({"ERROR":"Bad Request","status":400});
    if (filter['modeCostRating'] > 5) return done({"ERROR":"Bad Request","status":400});
    if (filter['modeCostRating'] < 0) return done({"ERROR":"Bad Request","status":400});

    await db.getPool().query('SELECT * FROM Venue', async function (err, venues) {
        if (err) return done({"ERROR":"Error selecting"});

        let rating_query = "SELECT * FROM Review";
        await db.getPool().query(rating_query, async function (err, ratings) {
            if (err) return done({"ERROR": "Error selecting"});

            let photo_query = "SELECT * FROM VenuePhoto WHERE is_primary = 1";
            await db.getPool().query(photo_query, async function (err, photos) {
                if (err) return done({"ERROR": "Error selecting"});

                let venueList = [];

                for (let i = 0; i < venues.length; i++) {
                    let venue = venues[i];
                    let starList = [];
                    let costList = [];
                    let star_rating = 0;
                    let cost_rating = 0;
                    let primary = null;

                    for (let j = 0; j < ratings.length; j++) {
                        rating = ratings[j];
                        if (rating.reviewed_venue_id === venue.venue_id) {
                            starList.push(rating.star_rating);
                            costList.push(rating.cost_rating);
                        }
                    }
                    for (let k = 0; k < photos.length; k++) {
                        photo = photos[k];
                        if ((photo.venue_id === venue.venue_id) && photo.is_primary === 1) {
                            primary = photo.photo_filename;
                        }
                    }

                    star_rating = parseFloat(stats.mean(starList));
                    cost_rating = stats.mode(costList);
                    if (!(typeof cost_rating === typeof 1)) {
                        let get_max = Array.from(cost_rating);
                        cost_rating = Math.max(...get_max);
                    }

                    if (!star_rating) star_rating = 0;
                    if (!cost_rating) cost_rating = 0;

                    venueList.push({
                        // TO BE REMOVED ON FINAL
                        'adminId': venue.admin_id,
                        //
                        'venueId': venue.venue_id,
                        'venueName': venue.venue_name,
                        'categoryId': venue.category_id,
                        'city': venue.city,
                        'shortDescription': venue.short_description,
                        'latitude': venue.latitude,
                        'longitude': venue.longitude,
                        'meanStarRating': star_rating,
                        'modeCostRating': cost_rating,
                        'primaryPhoto': primary
                    });
                }

                let venueFiltered = [];

                for (let i = 0; i < venueList.length; i++) {
                    let venue = venueList[i];
                    let pass = true;
                    // Title filter
                    if (filter['q'])
                        pass = (venue['venueName'].toLowerCase().includes(filter['q'].toLowerCase()));
                    if (!pass) continue;
                    // Category filter
                    if (filter['categoryId'])
                        pass = (parseInt(venue['categoryId']) === parseInt(filter['categoryId']));
                    if (!pass) continue;
                    // Admin filter
                    if (filter['adminId'])
                        pass = (parseInt(venue['adminId']) === parseInt(filter['adminId']));
                    if (!pass) continue;
                    // City filter
                    if (filter['city']) pass = (venue['city'].toLowerCase() === filter['city'].toLowerCase());
                    if (!pass) continue;
                    // Min Star filter
                    if (filter['minStarRating'])
                        pass = (parseFloat(venue['meanStarRating']) >= parseFloat(filter['minStarRating']));
                    if (!pass) continue;
                    // Max Star Filter
                    if (filter['maxCostRating'])
                        pass = (parseInt(venue['modeCostRating']) <= parseInt(filter['maxCostRating']));
                    if (!pass) continue;

                    // Distance
                    let distance = 0;
                    if (filter['myLatitude'] && filter['myLongitude']) {
                        let x1 = parseFloat(filter['myLatitude']);
                        let y1 = parseFloat(filter['myLongitude']);
                        let x2 = parseFloat(venue['latitude']);
                        let y2 = parseFloat(venue['longitude']);
                        let a = x1 - x2;
                        let b = y1 - y2;
                        distance = Math.sqrt( a*a + b*b );
                    }

                    venueFiltered.push({
                        'venueId': venue["venueId"],
                        'venueName': venue["venueName"],
                        'categoryId': venue["categoryId"],
                        'city': venue["city"],
                        'shortDescription': venue["shortDescription"],
                        'latitude': venue["latitude"],
                        'longitude': venue["longitude"],
                        'meanStarRating': venue["meanStarRating"],
                        'modeCostRating': venue["modeCostRating"],
                        'primaryPhoto': venue["primaryPhoto"],
                        'distance': distance
                    });
                }

                let venueSorted = [];
                let venues_done = [];

                switch (filter['sortBy']) {
                    case "COST_RATING":
                        while (venues_done.length < venueFiltered.length) {
                            let min = Infinity;
                            for (let i = 0; i < venueFiltered.length; i++) {
                                let venue = venueFiltered[i];
                                if (parseFloat(venue['modeCostRating']) <= min
                                    && !venues_done.includes(venue['venueId'])) {
                                    min = parseFloat(venue['modeCostRating']);
                                }
                            }

                            for (let j = 0; j < venueFiltered.length; j++) {
                                let venue = venueFiltered[j];
                                if (parseFloat(venue['modeCostRating']) === min
                                    && !venues_done.includes(venue['venueId'])) {
                                    venues_done.push(venue['venueId']);
                                    venueSorted.push(venueFiltered[j]);
                                }
                            }
                        }
                        break;
                    case "DISTANCE":
                        while (venues_done.length < venueFiltered.length) {
                            let min = Infinity;
                            for (let i = 0; i < venueFiltered.length; i++) {
                                let venue = venueFiltered[i];
                                if (parseFloat(venue['distance']) <= min
                                    && !venues_done.includes(venue['venueId'])) {
                                    min = parseFloat(venue['distance']);
                                }
                            }

                            for (let j = 0; j < venueFiltered.length; j++) {
                                let venue = venueFiltered[j];
                                if (parseFloat(venue['distance']) === min
                                    && !venues_done.includes(venue['venueId'])) {
                                    venues_done.push(venue['venueId']);
                                    venueSorted.push(venueFiltered[j]);
                                }
                            }
                        }
                        break;
                    default: // SORT BY STAR RATING
                        while (venues_done.length < venueFiltered.length) {
                            let max = 0;

                            for (let i = 0; i < venueFiltered.length; i++) {
                                let venue = venueFiltered[i];
                                if (parseFloat(venue['meanStarRating']) >= max
                                    && !venues_done.includes(venue['venueId'])) {
                                    max = parseFloat(venue['meanStarRating']);
                                }
                            }

                            for (let j = 0; j < venueFiltered.length; j++) {
                                let venue = venueFiltered[j];
                                if (parseFloat(venue['meanStarRating']) === max
                                    && !venues_done.includes(venue['venueId'])) {
                                    venues_done.push(venue['venueId']);
                                    venueSorted.push(venueFiltered[j]);
                                }
                            }
                        }
                }

                if (filter['reverseSort'] === "true") venueSorted = venueSorted.reverse();

                let startIndex = 0;
                let count = venueSorted.length;

                if (filter['startIndex']) startIndex = parseInt(filter['startIndex']);
                if (filter['count']) count = parseInt(filter['count']);

                let venueFinal = [];
                let incl_dist = false;
                if (filter['myLatitude'] && filter['myLongitude']) incl_dist = true;

                for (startIndex; startIndex < venueSorted.length && count; startIndex++, count--) {
                    let venue = venueSorted[startIndex];
                    if (!venue) continue;
                    if (incl_dist) {
                        venueFinal.push({
                            'venueId': venue["venueId"],
                            'venueName': venue["venueName"],
                            'categoryId': venue["categoryId"],
                            'city': venue["city"],
                            'shortDescription': venue["shortDescription"],
                            'latitude': venue["latitude"],
                            'longitude': venue["longitude"],
                            'meanStarRating': parseFloat(venue["meanStarRating"].toFixed(2)),
                            'modeCostRating': venue["modeCostRating"],
                            'primaryPhoto': venue["primaryPhoto"],
                            'distance': parseFloat(venue["distance"].toFixed(3))
                        });
                    } else {
                        venueFinal.push({
                            'venueId': venue["venueId"],
                            'venueName': venue["venueName"],
                            'categoryId': venue["categoryId"],
                            'city': venue["city"],
                            'shortDescription': venue["shortDescription"],
                            'latitude': venue["latitude"],
                            'longitude': venue["longitude"],
                            'meanStarRating': parseFloat(venue["meanStarRating"].toFixed(3)),
                            'modeCostRating': venue["modeCostRating"],
                            'primaryPhoto':venue["primaryPhoto"]
                        });
                    }
                }

                return done(venueFinal);
            });
        });
    });

};

exports.getOneVenue = async function (venue_id, done) {
    let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;

    await db.getPool().query(venue_query, async function (err, venues) {

        if (err) return done({"ERROR":err});
        if (venues.length === 0) return done({"ERROR": "Not Found"});

        let category_query = "SELECT * FROM VenueCategory WHERE category_id = " + venues[0].category_id;

        await db.getPool().query(category_query, async function (err, categories) {

            if (err) return done({"ERROR":err});
            if (categories.length === 0) return done({"ERROR": "Not Found"});
            let photo_query = "SELECT * FROM VenuePhoto WHERE venue_id = " + venue_id;

            await db.getPool().query(photo_query, async function (err, photos) {
                if (err) return done({"ERROR":err});

                let photoList = [];

                for (let i = 0; i < photos.length; i++) {
                    let photo = photos[i];
                    let primary = false;
                    if (photo.is_primary) primary = true;
                    photoList.push({
                        "photoFilename": photo.photo_filename,
                        "photoDescription": photo.photo_description,
                        "isPrimary": primary
                    })
                }

                let user_query = "SELECT * FROM User WHERE user_id = " + venues[0].admin_id;

                await db.getPool().query(user_query, async function (err, users) {

                    if (err) console.log(err);
                    if (err) return done({"ERROR":err});

                    return done({
                        "venueName": venues[0].venue_name,
                        "admin": {
                            "userId": users[0].user_id,
                            "username": users[0].username
                        },
                        "category": {
                            "categoryId": categories[0].category_id,
                            "categoryName": categories[0].category_name,
                            "categoryDescription": categories[0].category_description
                        },
                        "city": venues[0].city,
                        "shortDescription": venues[0].short_description,
                        "longDescription": venues[0].long_description,
                        "dateAdded": venues[0].date_added,
                        "address": venues[0].address,
                        "latitude": venues[0].latitude,
                        "longitude": venues[0].longitude,
                        "photos": photoList
                    });
                });
            });
        });
    });
};

exports.getCategories = async function(done) {
    await db.getPool().query('SELECT * FROM VenueCategory', function (err, rows) {

        if (err) return done({"ERROR":"Error selecting"});

        let catList = [];

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            catList.push({
                "categoryId": row.category_id,
                "categoryName": row.category_name,
                "categoryDescription": row.category_description
            });
        }

        return done(catList);

    });
};

exports.addVenue = async function(x_auth, data, done) {

    if (!data.city) {
        return done({"ERROR":"City not provided!"});
    }

    if (data.latitude > 90) return done({"ERROR":"Latitude must not exceed 90!"});
    if (data.longitude < -180) return done({"ERROR": "Longittde must be above -180!"});

    let cat_query = "SELECT category_id FROM VenueCategory";

    await db.getPool().query(cat_query, async function (err, cats) {

        if (err) done({"ERROR":"Error selecting"});

        let catList = [];

        for (let i = 0; i < cats.length; i++) {
            let cat = cats[i];
            catList.push(cats[i].category_id);
        }

        if (data.categoryId in catList) {

            let auth = "SELECT user_id, auth_token FROM User";

            await db.getPool().query(auth, async function (err, rows) {

                if (err) return done({"ERROR": "Error selecting"});

                let admin_id = [];

                for (let i = 0; i < rows.length; i++) {
                    let row = rows[i];
                    if (x_auth === row.auth_token) {
                        admin_id.push(row.user_id);
                        i = rows.length;
                    }
                }

                if (!admin_id.length) {

                    return done({"ERROR": "Unauthorized"});

                } else {

                    let date = moment().format("YYYY-MM-DD");

                    let query = "INSERT INTO Venue (venue_name, admin_id, category_id, city, short_description, long_description, date_added, address, latitude, longitude)"
                        + " VALUES (\""
                        + data.venueName + "\", " + admin_id[0] + "," + data.categoryId + ", \"" + data.city + "\", \""
                        + data.shortDescription + "\", \"" + data.longDescription + "\", '" + date + "', \""
                        + data.address + "\", " + data.latitude + ", " + data.longitude + ");";

                    await db.getPool().query(query, async function (err) {

                        if (err) {
                            return done({"ERROR": "Bad Request"});
                        }

                        let confirm = "SELECT venue_id FROM Venue WHERE venue_name = \"" + data.venueName + "\"";

                        await db.getPool().query(confirm, function (err, venue_id) {

                            if (err) {
                                return done({"ERROR": "Error inserting"});
                            }

                            if (venue_id.length === 0) return done({"ERROR": "Error inserting"});

                            return done({"venueId": venue_id[0].venue_id});

                        });
                    });
                }
            });
        } else {
            return done({"ERROR":"Category ID not valid!"});
        }
    });
};

exports.updateVenue = async function (x_auth, venue_id, data, done) {

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized", "status":401});
    if (!data.venueName && !data.categoryId && !data.city &&
        !data.shortDescription && !data.longDescription &&
        !data.address && !data.latitude && !data.longitude)
        return done({"ERROR":"Bad Request", "status":400});


    let userExist = "SELECT * FROM User WHERE auth_token = '" + x_auth + "'";
    await db.getPool().query(userExist, async function(err, users) {
        if (err) return done({"ERROR":"Bad Request","status":400});


        if (users.length === 0) return done({"ERROR": "Not Found","status":404});
        let user_id = users[0].user_id;
        let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;


        await db.getPool().query(venue_query, async function (err, venues) {
            if (err) return done({"ERROR":"Bad Request","status":400});

            if (venues.length === 0) return done({"ERROR":"Not Found", "status":404});

            if (!(venues[0].admin_id === user_id)) return done({"ERROR":"Forbidden", "status":403});

            let update_query = "UPDATE Venue SET";

            if (data.venueName) update_query += " venue_name = \"" + data.venueName + "\",";
            if (data.categoryId) update_query += " category_id = '" + data.categoryId + "',";
            if (data.city) update_query += " city = \"" + data.city + "\",";
            if (data.shortDescription) update_query += " short_description = \"" + data.shortDescription + "\",";
            if (data.longDescription) update_query += " long_description = \"" + data.longDescription + "\",";
            if (data.address) update_query += " address = \"" + data.address + "\",";
            if (data.latitude) update_query += " latitude = " + data.latitude + ",";
            if (data.longitude) update_query += " longitude = " + data.longitude + ",";

            update_query = (update_query.substring(0, update_query.length - 1) + " WHERE venue_id = " + venue_id);

            await db.getPool().query(update_query, function (err) {
                if (err) return done({"ERROR":"Bad Request", "status":400});

                return done({"SUCCESS": "Successfully updated"});
            })
        });
    });
};


// VENUES.PHOTOS ENDPOINTS

exports.addVenuePhoto = async function (x_auth, venue_id, photo, values, done) {

    if (!photo) return done({"ERROR":"Bad Request", "status":400});

    // This long statements are to satisfy both POSTMAN and the ATS
    if (!(values["makePrimary"] === "true") && !(values["makePrimary"] === "false")
        && !(values["makePrimary\n"] === "true") && !(values["makePrimary\n"] === "false"))
        return done({"ERROR":"Bad Request", "status":400});
    if (!(values["description"]) && !(values["description\n"])) return done({"ERROR":"Bad Request", "status":400});

    // The variables with "\n" characters are to satisfy POSTMAN, others are to satisfy ATS
    let description = "";
    let makePrimary = "";
    if (values["description"]) description = values["description"];
    if (values["description\n"]) description = values["description\n"];
    if (values["makePrimary"]) makePrimary = values["makePrimary"];
    if (values["makePrimary\n"]) makePrimary = values["makePrimary\n"];

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized", "status":400});

    let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;

    await db.getPool().query(venue_query, async function (err, venues) {

        if (err) return done({"ERROR": "Bad Request", "status": 400});

        if (venues.length === 0) return done({"ERROR":"Not Found","status":404});

        let admin_query = "SELECT * FROM User WHERE auth_token = \"" + x_auth + "\"";

        await db.getPool().query(admin_query, async function (err, admins) {

            if (err) return done({"ERROR":"Bad Request", "status":400});

            if (admins.length === 0) return done({"ERROR":"Unauthorized","status":401});
            if (!(venues[0].admin_id === admins[0].user_id)) return done({"ERROR":"Forbidden","status":403});

            let photo_query = "SELECT * FROM VenuePhoto WHERE venue_id = " + venue_id + " AND is_primary = TRUE";

            await db.getPool().query(photo_query, async function (err, photos) {
                if (err) return done({"ERROR":"Bad Request", "status":400});

                let insert_photo = "";

                // If there is no photos
                if (photos.length === 0) {
                    insert_photo = "INSERT INTO VenuePhoto (venue_id, photo_filename, photo_description, is_primary)" +
                        " VALUES (" + venue_id + ", \"" + photo + "\", \"" + description + "\", 1)";
                // If there are photos but we make this primary
                } else if ((makePrimary === "true") || (makePrimary === 1)) {
                    insert_photo = "UPDATE VenuePhoto SET is_primary = 0 WHERE venue_id = " + venue_id +
                    "; INSERT INTO VenuePhoto (venue_id, photo_filename, photo_description, is_primary) VALUES (" +
                        venue_id + ", \"" + photo + "\", \"" + description + "\", 1)";
                // If there are photos but we just add this photo
                } else {
                    insert_photo = "INSERT INTO VenuePhoto (venue_id, photo_filename, photo_description, is_primary)" +
                        " VALUES (" + venue_id + ", \"" + photo + "\", \"" + description + "\", 0)";
                }

                await db.getPool().query(insert_photo, async function (err) {
                    if (err) return done({"ERROR":"Bad Request", "status":400});
                    return done({"message":"Created","status":201});
                })
            })
        })

    })
};

exports.getVenuePhoto = async function (data, done) {

    let venue_id = data.id;
    let photoFilename = data.photoFilename;

    if (!venue_id || !photoFilename) return done({"ERROR": "Not Found", "status": 404});

    let photo_query = "SELECT * FROM VenuePhoto WHERE venue_id = " + venue_id + " AND photo_filename = \"" + photoFilename + "\"";

    await db.getPool().query(photo_query, async function (err, photos) {

        if (err) return done({"ERROR": "Not Found", "status": 404});

        if (photos.length === 0) return done({"ERROR": "Not Found", "status": 414});

        let photo_file = photoDirectory + photos[0].photo_filename;

        if (!fs.existsSync(photo_file)) return done({"ERROR":"Not Found","status":404});

        let ext_name = path.extname(photo_file).substring(1, path.extname(photo_file).length);

        if (ext_name === 'jpg') ext_name = 'jpeg';

        fs.readFile(photo_file, function (err, binary) {
            if (err) return done ({"ERROR":"Not Found", "status":404});
            return done({
                "body": binary,
                "type": ext_name
            });
        });
    });
};

exports.deleteVenuePhoto = async function (x_auth, values, done) {

    let venue_id = parseInt(values.id, 10);
    let photo = values.photoFilename;

    if (!photo) return done({"ERROR":"Not Found","status":404});

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized", "status":401});

    let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;

    await db.getPool().query(venue_query, async function (err, venues) {

        if (err) return done({"ERROR":"Not Found","status":404});

        if (venues.length === 0) return done({"ERROR":"Not Found","status":404});

        let admin_query = "SELECT * FROM User WHERE auth_token = \"" + x_auth + "\"";

        await db.getPool().query(admin_query, async function (err, admins) {
            if (err) console.log(err);
            if (err) return done({"ERROR":"Not Found","status":404});

            if (admins.length === 0) return done({"ERROR":"Unauthorized","status":401});

            let photo_query = "SELECT * FROM VenuePhoto WHERE photo_filename = \"" + photo + "\" AND venue_id = " + venue_id;

            await db.getPool().query(photo_query, async function (err, photos) {
                if (err) return done({"ERROR":"Not Found","status":404});

                if (photos.length === 0) return done({"ERROR":"Not Found","status":404});
                if (!(photos[0].venue_id === venue_id)) return done({"ERROR":"Forbidden","status":403});
                if (!(admins[0].user_id === venues[0].admin_id)) return done({"ERROR":"Forbidden","status":403});

                let new_primary = false;

                if (photos[0].is_primary === 1) new_primary = true;

                let delete_photo = "DELETE FROM VenuePhoto WHERE photo_filename = \"" + photo + "\"";

                await db.getPool().query(delete_photo, async function (err, delete_log) {
                    if (err) return done({"ERROR":"Not Found", "status":404});

                    fs.unlink(photoDirectory + photo, function (err) {
                        if (err) return done({"ERROR":"Not Found","status":404});
                    });

                    if (new_primary) {
                        let get_primary = "SELECT * FROM VenuePhoto WHERE venue_id = " + venue_id;

                        await db.getPool().query(get_primary, async function (err, venue_photos) {
                            if (err) return done({"ERROR": "Not Found", "status": 404});

                            if (venue_photos.length === 0) return done({"message": "OK", "status": 200});

                            let new_photo = venue_photos[0].photo_filename;

                            let set_primary = "UPDATE VenuePhoto SET is_primary = 1 WHERE venue_id = "
                                + venue_id + " AND photo_filename = \"" + new_photo + "\"";

                            await db.getPool().query(set_primary, async function (err) {
                                if (err) return done({"ERROR": "Not Found", "status": 404});

                                return done({"message": "OK", "status":200});
                            });
                        });
                    }
                    return done({"message": "OK", "status": 200});
                })
            })
        })

    })
};

exports.setVenuePhoto = async function (x_auth, values, done) {

    let venue_id = values.id;
    let photo = values.photoFilename;

    if (!photo) return done({"ERROR":"Not Found","status":404});

    if (x_auth === '' || !x_auth) return done({"ERROR":"Unauthorized", "status":401});

    let venue_query = "SELECT * FROM Venue WHERE venue_id = " + venue_id;

    await db.getPool().query(venue_query, async function (err, venues) {

        if (err) return done({"ERROR":"Not Found","status":404});

        if (venues.length === 0) return done({"ERROR":"Not Found","status":404});

        let admin_query = "SELECT * FROM User WHERE user_id = " + venues[0].admin_id;

        await db.getPool().query(admin_query, async function (err, admins) {

            if (err) return done({"ERROR":"Not Found","status":404});

            if (!(x_auth === admins[0].auth_token)) return done({"ERROR":"Forbidden","status":403});

            let photo_query = "UPDATE VenuePhoto SET is_primary = 0 WHERE venue_id = " + venue_id  + ";" +
                "UPDATE VenuePhoto SET is_primary = 1 WHERE venue_id = " + venue_id + " AND " +
                "photo_filename = \"" + photo + "\"";

            await db.getPool().query(photo_query, async function (err, update_log) {
                if (err) return done({"ERROR":"Not Found","status":404});
                if (!update_log[1].affectedRows) return done({"ERROR":"Not Found","status":404});

                return done({"message": "OK", "status": 200});
            })
        })
    })
};

// END OF IMPLEMENTATION
