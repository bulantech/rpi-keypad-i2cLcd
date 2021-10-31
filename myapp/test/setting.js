var path = require('path');
var Datastore = require('nedb')
const cwd = process.cwd()

db = {};
db.setting = new Datastore( path.join(cwd, 'database', 'setting.db'));
 
// You need to load each database (here we do it asynchronously)
db.setting.loadDatabase();

let data = {}

data = { key: 'version', value: '1.0.0', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: 'version' }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(err, numReplaced)
});

data = { key: 'vendindID', value: '1001', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: 'version' }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(err, numReplaced)
});

data = { key: 'price', value: '31.89', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: 'version' }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(err, numReplaced)
});

  

