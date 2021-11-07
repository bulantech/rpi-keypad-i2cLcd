var path = require('path');
var Datastore = require('nedb')
const cwd = process.cwd()

db = {};
db.setting = new Datastore( path.join(cwd, 'database', 'setting.db'));
 
// You need to load each database (here we do it asynchronously)
db.setting.loadDatabase();

let data = {}

let n=0

// 1
data = { key: 'version', lable: 'Version', value: '1.0.0', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 2
data = { key: 'vendingID', lable: 'Vending ID', value: '1001', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 3
data = { key: 'price', lable: 'Price', value: '31.89', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 4
data = { key: 'fuelType', lable: 'Fuel Type', value: 'G', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 5
data = { key: 'fullTank', lable: 'Full Tank', value: 200, updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 6
data = { key: 'minPrice', lable: 'Minimum price', value: 20, updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 7
data = { key: 'flowSensor', lable: 'Flow sensor', value: '99990', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 8
data = { key: 'playSound', lable: 'Play sound', value: 90, updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 9
data = { key: 'mbPassword', lable: 'M/B Password', value: '1234', updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});

// 10
data = { key: 'kDispenser', lable: 'K Dispenser', value: 50, updateAt: new Date(), updateBy: 'init'}
db.setting.update({ key: data.key }, { $set: data }, { upsert: true }, function (err, numReplaced) {
  console.log(++n, err, numReplaced)
});
  

