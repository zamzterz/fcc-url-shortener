'use strict';

const express = require('express');
const mongo = require('mongodb').MongoClient;
const shortId = require('short-mongo-id');
const url = require('url');

let app = express();

const BASE_URL = 'https://wood-beetle.hyperdev.space';

app.get('/new', (req, res) => {
  let urlToShorten = req.query.url;
  console.log(urlToShorten);
  let parsed = url.parse(urlToShorten);

  if (!parsed.protocol || !parsed.hostname) {
    return res.status(400).end('Not a proper URL');
  }


  mongo.connect(process.env.DB_URI, (err, db) => {
    if (err) throw err;
    let urls = db.collection('urls');

    let doc = {'url': urlToShorten};
    urls.findOneAndUpdate(doc, {$setOnInsert: doc},
      {'upsert': true, 'returnOriginal': false}, (err, result) => {
        if (err) throw err;

        let short = result.value.shortId;
        if (!short) {
          // if the url doesn't already have a shortened id
          short = shortId(result.value._id);
          urls.updateOne({'_id': result.value._id}, {$set: {'shortId': short}},
            (err, updated) => {
              if (err) throw err;

              let response = {
                'original_url': doc.url,
                'short_url': BASE_URL + '/' + short
              }

              db.close();
              return res.json(response);
          });
        } else {
          let response = {
            'original_url': doc.url,
            'short_url': BASE_URL + '/' + short
          }

          db.close();
          return res.json(response);
        }
      });
    });
});


app.get('/:shortId', (req, res) => {
  mongo.connect(process.env.DB_URI, (err, db) => {
    if (err) throw err;
    db.collection('urls').findOne({'shortId': req.params.shortId},
      (err, result) => {
        if (err) throw err;

        if (result) {
            return res.redirect(result.url);
        }

        res.sendStatus(404);
      }
    );
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});