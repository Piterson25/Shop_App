'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mqtt = require('mqtt');
const socketio = require('socket.io');
const uuid = require('uuid');
const fs = require('fs');
const https = require("https");
const app = express();
const logger = require('./logger');

app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));

const httpsOptions = {
  key: fs.readFileSync("./plik_klucz_bez_hasla.key", "utf8"),
  cert: fs.readFileSync("./plik_certyfikat.crt", "utf8"),
}

const httpsServer = https.createServer(httpsOptions, app);
const PORT = process.env.PORT || 3000;

const client = mqtt.connect('mqtt://127.0.0.1:1883');
const io = socketio(httpsServer);

let products = JSON.parse(fs.readFileSync('./products.json'));

const users = [];
let isChatPage = false;

io.on('connection', socket => {
  socket.on('new-user', (user) => {
    io.emit('user-connected', user)
  })
  socket.on('new-message', (message) => {
    const topic = `chat/${uuid.v4()}`;
    const fullMessage = `${message}`;
    client.publish(topic, fullMessage);
    logger.info(`${message}`);
    io.emit('message', message);
  });
  socket.on('disconnect', (user) => {
    if (isChatPage) {
      logger.info('Użytkownik wyszedl z czatu')
      io.emit('user-disconnected')
    }
    isChatPage = false;
  })
});

app.get('/', (req, res) => {
  const user = req.cookies.user;
  res.render('index', { user, products });
});

app.get('/products/:id', (req, res) => {
  const user = req.cookies.user;
  const id = parseInt(req.params.id);
  const product = products.products.find(p => p.id === id)
  res.render('product', { user, product, id: req.params.id });
});

app.get('/add', (req, res) => {
  const username = req.cookies.user;
  const user = users.find(u => u.username === username);
  const error = 'Nieprawidłowa ścieżka'
  res.render('add', { user, error });
});

app.post('/add', (req, res) => {
  const productId = products.products.length > 0 ? products.products[products.products.length - 1].id + 1 : 1;
  const owner = req.cookies.user;
  const product = { id: productId, ...req.body, owner: owner };
  products.products.push(product);
  fs.writeFileSync('./products.json', JSON.stringify(products, null, '\t'));
  logger.info(`${owner} added new product`);
  res.json({ message: 'Product added', product });
});

app.get('/chat', (req, res) => {
  const user = req.cookies.user;
  isChatPage = true;
  res.render('chat', { user, products });
});

app.get('/products/edit/:id', (req, res) => {
  const user = req.cookies.user;
  const id = parseInt(req.params.id);
  const product = products.products.find(p => p.id === id);
  res.render('edit', { user, product });
});

app.post('/products/edit/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const owner = req.cookies.user;
  const product = { id: productId, ...req.body, owner: owner };
  const index = products.products.findIndex(p => p.id === productId);
  products.products[index] = product;
  fs.writeFileSync('./products.json', JSON.stringify(products, null, '\t'));
  logger.info(`${owner} edited product`);
  res.redirect(`/products/${productId}`);
});

app.delete('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  products.products = products.products.filter(p => p.id !== productId);
  fs.writeFileSync('./products.json', JSON.stringify(products, null, '\t'));
  logger.info(`Deleted product`);
  res.json({ message: 'Product deleted' });
});

app.get('/login', (req, res) => {
  const error = ''
  res.render('login', { error });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin') {
    users.push({ username, email: "admin@admin", password });
    res.cookie('user', username, { maxAge: 3600 * 1000 });
    logger.info(`Admin logged in`);
    res.redirect('/');
  }
  else {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.cookie('user', username, { maxAge: 3600 * 1000 });
      logger.info(`${username} logged in`);
      res.redirect('/');
    } else {
      const error = 'Nieprawidłowe dane logowania'
      res.render('login', { error });
    }
  }
});

app.get('/logout', (req, res) => {
  logger.info(`${req.cookies.user} logged out`);
  res.clearCookie('user');
  res.redirect('/');
});

app.get('/register', (req, res) => {
  const error = ''
  res.render('register', { error });
});

app.post('/register', (req, res) => {
  const { username, email, password, password2 } = req.body;
  if (username === "admin") {
    return res.status(403).json({ message: "Rejestracja jako administrator jest zabroniona." });
  }
  else if (password !== password2) {
    res.render('register', { error: 'Hasła są różne' });
  } else if (users.some(u => u.username === username) || users.some(e => e.email === email)) {
    res.render('register', { error: 'Podany użytkownik już istnieje' });
  } else {
    users.push({ username, email, password });
    res.cookie('user', username, { maxAge: 3600 * 1000 });
    logger.info(`${username} registered new account`);
    res.redirect('/');
  }
});

app.get('/profile', (req, res) => {
  const username = req.cookies.user;
  const user = users.find(u => u.username === username);
  const error = 'Nie jesteś zalogowany!'
  res.render('profile', { user, error });
});

app.use((req, res, next) => {
  const user = req.cookies.user;
  res.locals.user = user;
  next();
});

httpsServer.listen(PORT, () => {
  logger.info(`Serwer https uruchomiony na porcie ${PORT}`);
});
