var express = require('express');
var router = express.Router();
var passport = require('passport');
var bcrypt = require('bcrypt')
const nedb = require('../lib/nedb');

const gTitle = 'Auto Oil Pump'

/* GET users listing. */
router.get('/', function(req, res, next) {
  // res.send('respond with a resource');
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  nedb.users.find({username: {$ne: 'root'}}, function (err, docs) {
    // console.log('err, docs =>', err, docs)
    res.render('users', { gTitle: gTitle, title: gTitle+' - Users', navLink: 'users', users: docs });
  });

});

router.get('/u/:userID', function(req, res, next) {
  // res.send('respond with a resource');
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }
  const userID = req.params.userID;
  if (!userID) {
      next();
      return;
  }
  nedb.users.findOne({userID: userID}, function (err, doc) {
    // console.log('err, doc =>', err, doc)
    if(doc) delete doc.password
    res.send(doc);
  });

});

router.get('/login', function(req, res, next) {
  if(('user' in req)) {   
    return res.redirect('/');
  }
  res.render('login', { gTitle: gTitle, title: gTitle+' - Login', errorText: '' });
});

router.post('/login', function(req, res, next) {
  // console.log(req.body)
  passport.authenticate('local', function(err, user, info) {  
    // console.log('logIn', err, user, info)  
    if (err) { return next(err); }
    if (info) { return res.render('login', { gTitle: gTitle, title: 'Login failed', errorText: info.message }); }
    req.logIn(user, function(err) {
      // console.log('logIn', err)
      if (err) { return next(err); }   
      res.redirect('/');     
    });
  })(req, res, next);
});

router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
}); 

router.post('/add', function(req, res) {
  // console.log(req.body)
  if(!('user' in req)) {   
    return res.redirect('/');
  }  
  nedb.users.findOne({userID: req.body.userID}, function (err, doc) {
    // console.log('err, docs =>', err, doc)
    if(err) {
      console.log(err, doc)
      res.send({error: 1, msg:'db find error !!'});
      return
    }
    if(doc) {
      console.log(err, doc)
      res.send({error: 2, msg: 'userID is duplicate !!'});
      return
    }
    const myPlaintextPassword = req.body.password
    const saltRounds = 10
    bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
      if(err) {
        console.log(err)
        res.send({error: 3, msg: 'hash error !!'});
        return
      }
      // console.log('user =>', user)
      req.body.createDate = new Date()
      req.body.createBy = user.username
      req.body.password = hash
      nedb.users.insert(req.body, function (err, newDoc) {
        if(err) {
          console.log(err, doc)
          res.send({error: 4, msg: 'db insert error!!'});
          return
        }
        // console.log('err, newDoc =>', err, newDoc)
        res.send({ error: null });
      })    
    })
  });
  
});

router.post('/edit', function(req, res) {
  console.log('/edit =>',req.body)
  if(!('user' in req)) {   
    return res.redirect('/');
  } 

  if(!req.body.userID) {   
    console.log('User ID not found !!')
    res.send({error: 1, msg: 'User ID not found !!'});
    return
  }  

  const myPlaintextPassword = req.body.password
  const saltRounds = 10
  if(myPlaintextPassword) {
    bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
      if(err) {
        console.log(err)
        res.send({error: 3, msg: 'hash error !!'});
        return
      }
      // console.log('user =>', user)
      req.body.updateAt = new Date()
      req.body.updateBy = user.username
      req.body.password = hash
      nedb.users.update({userID: req.body.userID}, { $set: req.body }, function (err, newDoc) {
        if(err) {
          console.log(err, doc)
          res.send({error: 2, msg: 'db update error!!'});
          return
        }
        // console.log('err, newDoc =>', err, newDoc)
        res.send({ error: null });
      })    
    })
  }
  else {
    req.body.updateDate = new Date()
    req.body.updateBy = user.username
    nedb.users.update({userID: req.body.userID}, req.body, function (err, newDoc) {
      if(err) {
        console.log(err, doc)
        res.send({error: 2, msg: 'db update error!!'});
        return
      }
      // console.log('err, newDoc =>', err, newDoc)
      res.send({ error: null });
    })    
  }
  
});

router.post('/delete', function(req, res) {
  // console.log(req.body)
  if(!('user' in req)) {   
    return res.redirect('/');
  }  

  // Remove multiple documents
  nedb.users.remove({ userID: req.body.userID }, { multi: true }, function (err, numRemoved) {
    if(err) {
      // console.log(err, numRemoved)
      res.send({error: 1, msg:'db remove error !!'});
      return
    }
    res.send({ error: null });
  });
  
});


module.exports = router;
