'use strict';

const express = require('express');
const superagent = require('superagent');
require('ejs');
require('dotenv').config();
const pg = require('pg');
const app = express();
const methodOverride = require('method-override');
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.HEROKU_POSTGRESQL_NAVY_URL);
const errorAlert = (err, response) => {
  response.status(500).send('Sorry, something went wrong');
  console.log('error', err);
}

/////////////////////////ROUTES//////////////////////////////

// this allows us to see the request.body
app.use(express.urlencoded({ extended: true }));
// serve files from public folder
app.use(express.static('public'));
// allows ejs to work - look in views folder for your template
app.set('view engine', 'ejs');
// lets us translate our post to a put in html
app.use(methodOverride('_method'));
app.get('/', homeRoute); // should render home page that shows favorite books
app.get('/books/:id', getOneBook); // shows detail page
app.get('/searches/new', showForm); // shows search form
app.post('/searches/new', addBook);
app.post('/searches', getSearchResults);
app.get('/update/:book_id', showUpdateBookForm);
app.put('/update/:book_id', updateBook);
app.get('/delete/:book_id', deleteBook);
app.get('*', (request, response) => {
  response.status(404).send('Sorry, no page found.')
});
// app.get('/')

////////////////////////FUNCTIONS////////////////////////////

function getBookShelf(request, response) {
  let sql = 'SELECT DISTINCT bookshelf FROM books;';
  return client.query(sql);
}

function updateBook(request, response) {
  let bookId = request.params.book_id;
  let { title, author, description, image_url, isbn, bookshelf } = request.body;
  let sql = 'UPDATE books SET title=$1, author=$2, description=$3, image_url=$4, isbn=$5, bookshelf=$6 WHERE id=$7;';
  let safeValues = [title, author, description, image_url, isbn, bookshelf, bookId];
  client.query(sql, safeValues)
    .then(sqlResults => {
      response.redirect(`/books/${bookId}`)
    }).catch(error => errorAlert(error, response));
}

function showUpdateBookForm(request, response) {
  let id = request.params.book_id;
  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];

  client.query(sql, safeValues)
    .then(sqlResults => {
      response.status(200).render('pages/searches/edit.ejs', { oneBook: sqlResults.rows[0] });
    }).catch(error => errorAlert(error, response));
}

function deleteBook(request, response) {
  let bookId = request.params.book_id;
  let sql = 'DELETE FROM books WHERE id=$1;';
  let safeValues = [bookId];
  client.query(sql, safeValues)
    .then(sqlResults => {
      response.redirect('/')
    }).catch(error => errorAlert(error, response));
}

// THIS HOME ROUTE IS PULLING ALL DATA FROM DATABASE THEN DISPLAYING FAVORITES
function homeRoute(request, response) {
  getBookShelf()
    .then(bookshelf => {
      let sql = 'SELECT * FROM books;';
      client.query(sql)
        .then(sqlResults => {
          let books = sqlResults.rows;
          console.log(bookshelf);
          response.status(200).render('pages/index.ejs', { myBooks: books, totalBookShelf: bookshelf.rows });
        }).catch(error => errorAlert(error, response));
    })
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
// SHOWS SEARCH FORM
function showForm(request, response) {
  response.render('pages/searches/new.ejs');
}

// route searches/new - adds the user response from the show.ejs form 
function addBook(request, response) {
  let { title, author, description, image_url, isbn, bookshelf } = request.body;
  console.log(bookshelf);
  let sql = 'INSERT INTO books (title, author, description, image_url, isbn, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;';
  let safeValues = [title, author, description, image_url, isbn, bookshelf];

  client.query(sql, safeValues)
    .then(results => {
      let id = results.rows[0].id;
      response.redirect(`/books/${id}`)
      // customize this catch to send you back to favorites or find books
    }).catch(error => {
      response.render('pages/error.ejs', { error: error });
    });
}

function getSearchResults(request, response) {
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
      console.log(finalBookArr)
      response.status(200).render('pages/searches/show.ejs', { searchResults: finalBookArr })
    }).catch(error => errorAlert(error, response));
}

////////////////////CONSTRUCTORS//////////////////////

function Book(info) {
  let regex = /^(http:\/\/)/g;
  const placeholderImg = 'https://i.imgur.com/J5LVHEL.jpg';
  this.title = info.title ? info.title : 'No title available.';
  this.author = info.authors ? info.authors[0] : 'No author available.';
  this.description = info.description ? info.description : 'No description available.';
  this.image_url = info.imageLinks ? info.imageLinks.thumbnail.replace(regex, 'https://') : placeholderImg;
  this.isbn = info.industryIdentifiers ? info.industryIdentifiers[0].identifier : 'No isbn.';
  this.bookshelf = info.categories ? info.categories[0] : 'No bookshelf available.';
}

/////////////////////CONNECT/////////////////////////

client.on('error', err => console.log(err));
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    })
  })
