const path = require('path');
const Datastore = require('nedb')
const cwd = process.cwd()

db = {};
db.users = new Datastore( path.join(cwd, 'database', 'users.db'));
db.setting = new Datastore( path.join(cwd, 'database', 'setting.db'));
// db.logs = new Datastore( path.join(cwd, 'database', 'logs.db'));
db.orders = new Datastore( path.join(cwd, 'database', 'orders.db'));
db.alerts = new Datastore( path.join(cwd, 'database', 'alerts.db'));
 
// You need to load each database (here we do it asynchronously)
db.users.loadDatabase();
db.setting.loadDatabase();
// db.logs.loadDatabase();
db.orders.loadDatabase();
db.alerts.loadDatabase();

module.exports = db;