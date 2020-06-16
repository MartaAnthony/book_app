'use strict';

const express = require('express');
const superagent = require('superagent');
require('ejs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.set('view engine', 'ejs');

const errorAlert = (err, response) => {
  response.status(500).send('Sorry, something went wrong');
  console.log('error', err);
}

// app.get('/', (request, response) => {
//   response.render('Hello, I like pizza.');
// });

app.get('/hello', (request, response) => {
  response.render('pages/index.ejs');
});

app.get('/searches', (request, response) => {
  response.render('pages/searches/new.ejs');
});

app.post('/searches', (request, response) => {
  console.log(request.body);
  let query = request.body.search;
  let titleOrAuthor = request.body.search[1];

  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  // const queryParams = {
  //   maxResults: 10
  // }

  if (titleOrAuthor === 'title') {
    url += `+intitle:${query}`;
  } else if (titleOrAuthor === 'author') {
    url += `+inauthor:${query}`;
  }

  superagent.get(url)
    // .query(queryParams);
    .then(res => {
      let bookArr = res.body.items;
      console.log(bookArr);

      const finalBookArr = bookArr.map(book => {
        return new Book(book.volumeInfo);
      });

      console.log(finalBookArr)

      response.render('pages/searches/show.ejs', { searchResults: finalBookArr })
    }).catch(error => errorAlert(error, response));
})

function Book(info) {
  const placeholderImg = 'https://i.imgur.com/J5LVHEL.jpg';
  // console.log(info);
  this.title = info.title ? info.title : 'No title available.';
  this.author = info.authors ? info.authors : 'No author available.';
  // some of the image links are an http reference to a url.. needs to be replaces with https and rest of url ... slice or regex

  this.image_url = info.imageLinks.thumbnail ? info.imageLinks.thumbnail : placeholderImg;
}

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
})
