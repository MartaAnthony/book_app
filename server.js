'use strict';

const express = require('express');
const superagent = require('superagent');
require('ejs');
require('dotenv').config();
const pg = require('pg');
const app = express();
const methodOverride = require('method-override');
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);
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



///////////////////////////////NEW CODE FROM TODAY//////////////////////////////////////////
app.put('/update/:book_id', updateBook);

function updateBook(request, response) {
  console.log('this is our params', request.params)

  let bookId = request.params.book_id;

  // this console log refers to form on detail.ejs page
  console.log('form information to be updated', request.body)

  let { title, author, description, image_url, isbn } = request.body;

  let sql = 'UPDATE books SET title=$1, author=$2, description=$3, image_url=$4, isbn=$5 WHERE id=$6;';

  let safeValues = [title, author, description, image_url, isbn, bookId];

  client.query(sql, safeValues)
    .then(sqlResults => {
      response.redirect(`/books/${bookId}`)
    })


}



// for all routes not found -- double check this later !!!!!!!!!!!!!
app.get('*', (request, response) => {
  response.status(404).send('Sorry, no page found.')
})

////////////////////////FUNCTIONS////////////////////////////

// THIS HOME ROUTE IS PULLING ALL DATA FROM DATABASE THEN DISPLAYING FAVORITES
// if else statement in this function needed ??????????????
function homeRoute(request, response) {
  let sql = 'SELECT * FROM books;';
  client.query(sql)
    .then(sqlResults => {
      let books = sqlResults.rows;
      let bookCount = sqlResults.rowCount;
      response.status(200).render('pages/index.ejs', { myBooks: books, totalBooks: bookCount });
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
// SHOWS SEARCH FORM
function showForm(request, response) {
  response.render('pages/searches/new.ejs');
}

// route searches/new - adds the user response from the show.ejs form 
function addBook(request, response) {
  let { title, author, description, image_url, isbn, bookshelf } = request.body;
  let sql = 'INSERT INTO books (title, author, description, image_url, isbn) VALUES ($1, $2, $3, $4, $5) RETURNING id;';
  let safeValues = [title, author, description, image_url, isbn];

  client.query(sql, safeValues)
    .then(results => {
      let id = results.rows[0].id;
      response.redirect(`/books/${id}`)
    }).catch(error => errorAlert(error, response));
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
      // console.log(finalBookArr)
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
}

//////////////////////////////////////////////////////

client.on('error', err => console.log(err));
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    })
  })
