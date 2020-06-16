DROP TABLE IF EXISTS books;

CREATE TABLE books
(
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  author VARCHAR(255),
  description TEXT,
  image_url VARCHAR(255),
  isbn VARCHAR(255),
  bookshelf VARCHAR(255)
);

-- INSERT INTO books
--   (title, author, description, image_url)
-- VALUES
--   ('Harry Potter', 'JK Rowlings', 'kajgkldjafoideojlkadjiofdcajdklfjdojla', 'gjlkajfdjoijl;a;gmdkjiajlsjs');

-- SELECT *
-- FROM books;