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

  let data = {
    orders: 0,
    amounts: 0,
    users: 0,
    alerts: 0,
  }

  const start = new Date();
  start.setHours(0,0,0,0);

  const end = new Date();
  end.setHours(23,59,59,999);

  nedb.orders.find({insertAt: {$gte: start, $lt: end}}, function (err, docs) {
  // nedb.orders.find({}, function (err, docs) {
  // nedb.orders.find({}).sort({$natural: -1}).limit(25).exec(function (err, docs) {
    // console.log('err, count =>', err, docs)
    data.orders = docs.length

    for(order of docs) {
      data.amounts += order.amount
    }

    nedb.alerts.count({insertAt: {$gte: start, $lt: end}}, function (err, count) {
      // console.log('err, count =>', err, count)
      data.alerts = count
      nedb.users.count({}, function (err, count) {
        // console.log('err, count =>', err, count)
        data.users = count
        res.render('dashboard', { 
          user: req.user, 
          gTitle: gTitle, 
          title: gTitle + ' - Dashboard', 
          navLink: 'dashboard',
          data: data, 
        });
      });
    });
  });

  
});


// orders ===============================================================================

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
    res.render('orders', { user: req.user, gTitle: gTitle, title: gTitle + ' - Orders', navLink: 'orders', orders: orders });
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


// setting ===============================================================================

router.get('/setting', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  nedb.setting.find({}, function (err, docs) {
    console.log('err, docs =>', err, docs)
    const data = docs
    res.render('setting', { user: req.user, gTitle: gTitle, title: gTitle + ' - Setting', navLink: 'setting', data: data });
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


// alerts ===============================================================================
router.get('/alerts', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  const start = new Date();
  start.setHours(0,0,0,0);

  const end = new Date();
  end.setHours(23,59,59,999);

  // nedb.alerts.find({insertAt: {$gte: start, $lt: end}}, function (err, docs) {
  // nedb.alerts.find({}, function (err, docs) {
  nedb.alerts.find({}).sort({$natural: -1}).limit(25).exec(function (err, docs) {
    // console.log('err, docs =>', err, docs)
    const orders = docs
    res.render('alerts', { user: req.user, gTitle: gTitle, title: gTitle + ' - Alerts', navLink: 'alerts', orders: orders });
  });
  
}); 

router.post('/alerts', function(req, res, next) {
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

  nedb.alerts.find({insertAt: {$gte: start, $lt: end}}, function (err, docs) {
    console.log('err, docs =>', err, docs)
    const alerts = docs
    res.send({ error: null, alerts: alerts });
  });
  
});

router.post('/alerts/delete', function(req, res) {
  // console.log(req.body)
  if(!('user' in req)) {   
    return res.redirect('/');
  }  

  // Remove multiple documents
  nedb.alerts.remove({ _id: req.body._id }, { multi: true }, function (err, numRemoved) {
    if(err) {
      // console.log(err, numRemoved)
      res.send({error: 1, msg:'db remove error !!'});
      return
    }
    res.send({ error: null });
  });
  
});

// reboot ===============================================================================
router.post('/reboot', function(req, res, next) {
  // res.render('index', { title: gTitle });
  if(!('user' in req)) {   
    return res.redirect('/users/login');
  }

  const alert = {
    insertAt: new Date(),
    event: 'Reboot',
    message: 'Reboot by '+req.user.username
  }
  // console.log(alert)
  nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
    console.log(err, newDoc)
    res.send({ error: null });
    setTimeout(()=>{
      var exec = require('child_process').exec;
      exec('sudo reboot', function(error, stdout, stderr){ 
        console.log('Reboot:',error, stdout, stderr)
      });
    }, 1*1000)  
  });
});