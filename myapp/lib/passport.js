var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;
const bcrypt = require('bcrypt');

const nedb = require('./nedb');
const config = require('config');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader("authorization"),
  secretOrKey: config.get('jwt.secret')
}
const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {  
  //console.log('payload =>', payload, new Date().getTime(), payload.exp);
  if( new Date().getTime() > payload.exp ) { 
    return done(null, false, { message: 'Incorrect token.' }) 
  }
  done(null, true)
});

// passport config
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(jwtAuth);

passport.use('local', new LocalStrategy({ usernameField: 'username', passwordField: 'password' }, function(username, password, done) {  
  var err = 0   

  if (username) {
    username = username.toLowerCase().split(' ').join('')
  }

  if (password) {
    password = password.split(' ').join('')
  }

  const query = { username: username}
   
  nedb.users.findOne(query, function (err, item) {
    if (err) { 
      console.log('Error => find.users');
      return done(err); 
    }    
    if (!item) {          
      console.log('Incorrect username.')
      return done(null, false, { message: 'Incorrect username.' });
    }
    user = item    

    let myPlaintextPassword = password
    let hash = user.password
    // console.log('hash=>', hash, myPlaintextPassword)
    bcrypt.compare(myPlaintextPassword, hash, function(err, res) {
      // res == true
      return ( res ? done(null, user) : done(null, false, { message: 'Incorrect password.' }) )
    }); 

  });     
}));
