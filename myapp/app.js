var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')

var passport = require('passport');
require('./lib/passport');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const cwd = process.cwd()

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('views', path.join(cwd, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(cwd, 'public')));

app.use(session({
  secret: '9374fea0-c26b-40e2-a411-d3c50092f876',
  resave: true,
  saveUninitialized: true
} )); // session secret

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
