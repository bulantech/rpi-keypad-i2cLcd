var path = require('path');
var Datastore = require('nedb')
var bcrypt = require('bcrypt')
const cwd = process.cwd()

db = {};
db.users = new Datastore( path.join(cwd, 'database', 'users.db'));
 
// You need to load each database (here we do it asynchronously)
db.users.loadDatabase();

const saltRounds = 10

const tags = [
  '0512854932',
  '0035526419',
  '1937879868',
  '3010006761',
  '3010006761',
  '3124006404',
]

tags.map( tag => {
  const pass = '1234'
  const userID = tag.slice(-6)
  bcrypt.hash(pass, saltRounds, function(err, hash) {
    if(err) {
      return console.log(err)
    }
    const data = { 
      userID: userID, 
      tag: tag,
      username: 'MEM'+userID, 
      password: hash, 
      name: 'Member '+userID, 
      address: '',
      lastLogin: '',
      role: 'member',    
      createAt: new Date(),
      createBy: 'owner',
      updateAt: new Date(),
      updateBy: 'owner',

    }

    db.users.remove({userID: userID}, { multi: true }, function (err, numRemoved) {
      console.log('err, numRemoved =>', err, numRemoved)
      db.users.update({userID: userID}, { $set: data }, { upsert: true }, function (err, numReplaced) {
        console.log('err, numReplaced =>', err, numReplaced)
      });
    });  
  })
})
