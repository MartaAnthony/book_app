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
/////////////////////////ROUTES//////////////////////////////

app.get('/home', homeRoute);
app.get('/books/:id', getOneBook);
app.get('/searches/new', showForm);
app.post('/searches/new', addBook);

////////////////////////FUNCTIONS////////////////////////////

// THIS HOME ROUTE IS PULLING ALL DATA FROM DATABASE THEN DISPLAYING FAVORITES
function homeRoute(request, response) {
  let sql = 'SELECT * FROM books;';
  client.query(sql)
    .then(sqlResults => {
      let books = sqlResults.rows;
      // let counts = sqlResults.rowCount;
      response.status(200).render('pages/index.ejs', { myBooks: books });
    }).catch(error => errorAlert(error, response));
}
// route books/:id  - displays one book for details.ejs
function getOneBook(request, response) {
  let id = request.params.id;
  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];

  client.query(sql, safeValues)
    .then(sqlResults => {
      response.status(200).render('pages/searches/detail.ejs', { oneBook: sqlResults.rows[0] });
    }).catch(error => errorAlert(error, response));
}
// route searches/new - shows form on new.ejs
function showForm(request, response) {
  response.render('pages/searches/new.ejs');
}

// route searches/new - adds the user response from the forms
function addBook(request, response) {
  let { title, author, description, image_url, isbn, bookshelf } = request.body;
  let sql = 'INSERT INTO books (title, author, description, image_url, isbn, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID;';
  let safeValues = [title, author, description, image_url, isbn, bookshelf];

  client.query(sql, safeValues)
    .then(results => {
      let id = results.rows[0].id;
      response.redirect(`/books/${id}`)
    }).catch(error => errorAlert(error, response));
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

////////////////////CONSTRUCTORS//////////////////////

function Book(info) {
  let regex = /^(http:\/\/)/g;
  const placeholderImg = 'https://i.imgur.com/J5LVHEL.jpg';
  this.title = info.title ? info.title : 'No title available.';
  this.author = info.authors ? info.authors[0] : 'No author available.';
  this.description = info.description ? info.description : 'No description available.';
  this.image_url = info.imageLinks ? info.imageLinks.thumbnail.replace(regex, 'https://') : placeholderImg;
}

//////////////////////////////////////////////////////

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    })
  })
