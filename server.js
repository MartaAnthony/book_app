'use strict';

const express = require('express');
const superagent = require('superagent');
require('ejs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const pg = require('pg');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const errorAlert = (err, response) => {
  response.status(500).send('Sorry, something went wrong');
  console.log('error', err);
}

app.get('/', getBooks);
app.get('/books/:id', getOneBook);
app.get('/searches/new', showForm);

// THIS HOME ROUTE IS PULLING ALL DATA FROM DATABASE
function getBooks(request, response) {
  // let { title, author, description, image_url, isbn, bookshelf } = request.body;
  // let safeValues = [title, author, description, image_url, isbn, bookshelf]; 
  let sql = 'SELECT * FROM books;';
  client.query(sql)
    .then(sqlResults => {
      let books = sqlResults.rows;
      // let counts = sqlResults.rowCount;
      response.status(200).render('pages/index.ejs', { myBooks: books });
    })
}
// displays one book for details.ejs
function getOneBook(request, response) {
  let id = request.params.id;
  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];

  client.query(sql, safeValues)
    .then(sqlResults => {
      response.status(200).render('pages/searches/detail.ejs', { oneBook: sqlResults.rows[0] });
    })
}
//shows form on new.ejs
function showForm(request, response) {
  response.render('pages/searches/new.ejs');
}

app.post('/searches', (request, response) => {
  console.log(request.body);
  let query = request.body.search;
  let titleOrAuthor = request.body.search[1];
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (titleOrAuthor === 'title') {
    url += `+intitle:${query}`;
  } else if (titleOrAuthor === 'author') {
    url += `+inauthor:${query}`;
  }

  superagent.get(url)
    // .query(queryParams);
    .then(res => {
      let bookArr = res.body.items;
      // console.log(bookArr);
      const finalBookArr = bookArr.map(book => {
        return new Book(book.volumeInfo);
      });
      // console.log(finalBookArr)
      response.status(200).render('pages/searches/show.ejs', { searchResults: finalBookArr })
    }).catch(error => errorAlert(error, response));
})

function Book(info) {
  let regex = /^(http:\/\/)/g;
  const placeholderImg = 'https://i.imgur.com/J5LVHEL.jpg';
  this.title = info.title ? info.title : 'No title available.';
  this.author = info.authors ? info.authors[0] : 'No author available.';
  this.description = info.description ? info.description : 'No description available.';
  // some of the image links are an http reference to a url.. needs to be replaces with https and rest of url ... slice or regex
  this.image_url = info.imageLinks ? info.imageLinks.thumbnail.replace(regex, 'https://') : placeholderImg;
}

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    })
  })
