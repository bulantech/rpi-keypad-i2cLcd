var path = require('path');
var Datastore = require('nedb')
var bcrypt = require('bcrypt')
const cwd = process.cwd()

db = {};
db.users = new Datastore( path.join(cwd, 'database', 'users.db'));
db.configs = new Datastore( path.join(cwd, 'database', 'configs.db'));
db.logs = new Datastore( path.join(cwd, 'database', 'logs.db'));
 
// You need to load each database (here we do it asynchronously)
db.users.loadDatabase();
db.configs.loadDatabase();
db.logs.loadDatabase();

const myPlaintextPassword = 'hin@1234'
const saltRounds = 10

bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
  if(err) {
    return console.log(err)
  }
  const data = { 
    userID: 'oio1234', 
    tag: '',
    username: 'root', 
    password: hash, 
    name: 'Root', 
    address: '',
    lastLogin: '',
    role: '',    
    createAt: new Date(),
    createBy: 'root',
    updateAt: new Date(),
    updateBy: 'root',

  }

  db.users.remove({username: 'root'}, { multi: true }, function (err, numRemoved) {
    console.log('err, numRemoved =>', err, numRemoved)
    db.users.update({username: 'root'}, { $set: data }, { upsert: true }, function (err, numReplaced) {
      console.log('err, numReplaced =>', err, numReplaced)
    });
  });

  
})

bcrypt.hash('1234', saltRounds, function(err, hash) {
  if(err) {
    return console.log(err)
  }
  const data = { 
    userID: 'owner', 
    tag: '',
    username: 'owner', 
    password: hash, 
    name: 'owner', 
    address: '',
    lastLogin: '',
    role: 'admin',    
    createAt: new Date(),
    createBy: 'root',
    updateAt: new Date(),
    updateBy: 'root',

  }

  db.users.remove({username: 'owner'}, { multi: true }, function (err, numRemoved) {
    console.log('err, numRemoved =>', err, numRemoved)
    db.users.update({username: 'owner'}, { $set: data }, { upsert: true }, function (err, numReplaced) {
      console.log('err, numReplaced =>', err, numReplaced)
    });
  });  
})

bcrypt.hash('1234', saltRounds, function(err, hash) {
  if(err) {
    return console.log(err)
  }
  const data = { 
    userID: '0001', 
    tag: '',
    username: 'admin', 
    password: hash, 
    name: 'admin', 
    address: '',
    lastLogin: '',
    role: 'admin',    
    createAt: new Date(),
    createBy: 'owner',
    updateAt: new Date(),
    updateBy: 'owner',

  }

  db.users.remove({username: 'admin'}, { multi: true }, function (err, numRemoved) {
    console.log('err, numRemoved =>', err, numRemoved)
    db.users.update({username: 'admin'}, { $set: data }, { upsert: true }, function (err, numReplaced) {
      console.log('err, numReplaced =>', err, numReplaced)
    });
  });  
})
