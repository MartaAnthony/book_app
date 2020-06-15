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


  let query = request.body.search[0];
  let titleOrAuthor = request.body.search[1];

  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (titleOrAuthor === 'title') {
    url += `+intitle:${query}`;
  } else if (titleOrAuthor === 'author') {
    url += `+inauthor:${query}`;
  }

  superagent.get(url)
    .then(results => {
      let bookArray = results.body.items;

      const finalBookArray = bookArray.map(book => {
        return new Book(book.volumeInfo)
      });

      console.log(finalBookArray)

      response.render('show.ejs', { searchResults: finalBookArray })
    })
})


function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';

  this.title = info.title ? info.title : 'no title available';

}

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
})
