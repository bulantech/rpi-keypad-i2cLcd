var express = require('express');
var router = express.Router();
const nedb = require('../lib/nedb');

const gTitle = 'Auto Oil Pump'

/* GET home page. */
router.get('/', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }
  res.redirect('/dashboard');
}); 
module.exports = router;

router.get('/dashboard', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }
  res.render('dashboard', { gTitle: gTitle, title: gTitle + ' - Dashboard', navLink: 'dashboard' });
});

router.get('/orders', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  const start = new Date();
  start.setHours(0,0,0,0);

  const end = new Date();
  end.setHours(23,59,59,999);

  // nedb.orders.find({insertAt: {$gte: start, $lt: end}}, function (err, docs) {
  // nedb.orders.find({}, function (err, docs) {
  nedb.orders.find({}).sort({$natural: -1}).limit(25).exec(function (err, docs) {
    // console.log('err, docs =>', err, docs)
    const orders = docs
    res.render('orders', { gTitle: gTitle, title: gTitle + ' - Orders', navLink: 'orders', orders: orders });
  });
  
});

router.post('/orders', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  if(!req.body.start) {
    console.log('Start date not found')
    res.send({error: 1, msg:'Start date not found'});
    return
  }

  if(!req.body.end) {
    console.log('End date not found')
    res.send({error: 2, msg:'End date not found'});
    return
  }

  const start = new Date(req.body.start);
  const end = new Date(req.body.end);

  nedb.orders.find({insertAt: {$gte: start, $lt: end}}, function (err, docs) {
    console.log('err, docs =>', err, docs)
    const orders = docs
    res.send({ error: null, orders: orders });
  });
  
});

router.post('/orders/delete', function(req, res) {
  // console.log(req.body)
  if(!('user' in req)) {   
    return res.redirect('/');
  }  

  // Remove multiple documents
  nedb.orders.remove({ _id: req.body._id }, { multi: true }, function (err, numRemoved) {
    if(err) {
      // console.log(err, numRemoved)
      res.send({error: 1, msg:'db remove error !!'});
      return
    }
    res.send({ error: null });
  });
  
});

router.get('/setting', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  nedb.setting.find({}, function (err, docs) {
    console.log('err, docs =>', err, docs)
    const data = docs
    res.render('setting', { gTitle: gTitle, title: gTitle + ' - Setting', navLink: 'setting', data: data });
  });
  
});

router.post('/setting/edit', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  if(!req.body.key) {   
    console.log('Key not found !!')
    res.send({error: 1, msg: 'Key not found !!'});
    return
  }  

  if(!req.body.value) {   
    console.log('Value not found !!')
    res.send({error: 2, msg: 'Value not found !!'});
    return
  } 

  req.body.updateAt = new Date()
  req.body.updateBy = user.username

  nedb.setting.update({key: req.body.key}, { $set: req.body }, function (err, newDoc) {
    if(err) {
      console.log(err, doc)
      res.send({error: 3, msg: 'db update error!!'});
      return
    }
    // console.log('err, newDoc =>', err, newDoc)
    res.send({ error: null });
  })    
  
});