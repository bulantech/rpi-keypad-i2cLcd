var path = require('path');
var Datastore = require('nedb')
const cwd = process.cwd()

db = {};
db.orders = new Datastore( path.join(cwd, 'database', 'orders.db'));
 
// You need to load each database (here we do it asynchronously)
db.orders.loadDatabase();

const d = new Date()
const dYY = d.getFullYear().toString().substr(-2)
const dMM = (d.getMonth()+1).toString().padStart(2, '0')
const dDD = d.getDate().toString().padStart(2, '0')
const tHH = d.getHours().toString().padStart(2, '0')
const tMM = d.getMinutes().toString().padStart(2, '0')
const tSS = d.getSeconds().toString().padStart(2, '0')

// -----------------------------------------------------------------------------------------------------
// :D0B12341;	cmd=06,password=1234 , order sale = 1 THB
//    1st reply		00
//    2nd reply before fill	:DF,26:22:22,251021;
//    3rd reply after filled	:D9998.00,1.00,0,0,0,0,1.00,39:22:22,251021;
// -----------------------------------------------------------------------------------------------------

// 3.2 order to sale by employee 
// Request 
//  Start byte ID Command tag Command data Stop byte 
// length 1 1 1 null 1 
//  : D 0B XXXXmmmm ; 
// Detail : 
// XXXX = จาํ นวนเงนิ
// mmmm = รหสัสงจ่าย ัÉ
// Response 
//  Start byte ID Command tag Command data Stop byte 
// length 1 1 1 1 
//  : D tttt.tt,lll.ll,ccc,CCC,bbb,BBB,TTTT,tttttttttt ; 
// Detail
// tttt.tt จํานวนนํÊามนัทเÉีหลอื ไม่ใดก้ ําหนดขนาด text ตายตวั เชน 20.55 , 205.29
// lll.ll จํานวนสติรทจÉี่ายไป. ไม่ใดก้ ําหนดขนาด text ตายตวั เชน 20.55 , 205.29
// ccc จาํ นวนเหรยีญทหยอด Éี
// CCC จาํ นวนเหรยีญสะสม
// bbb จาํ นวนแบง้ทหยอด Éี
// BBB จาํ นวนแบง้สะสม
// TTT จาํ นวนเงนิสระสม
// tttttttttt; time stamp 

const orderType = ['price', 'quantity']
const status = ['success' , 'fail' , 'error']

const transaction= {
	insertAt: d,

	fillStartTime: tHH+':'+tMM+':'+tSS,
	fillStartDate: dYY+dMM+dDD,	

	remainingPetrol: 99.9, //liters
	fillPetrol: 1.5, //liters
	putCoins: 9,
	accumulatedCoins: 99, 
	putBanknotes: 9,
	accumulatedBanknotes: 99,
	accumulatedAmount: 9999,
	fillEndTime: tHH+':'+tMM+':'+tSS,
	fillEndDate: dYY+dMM+dDD,	
	
	version:	'1.0.0', //	text	5	99.99	software version
	vendingId:	'001', //	text	3	999	vending id
	employeeId: '9999999999999',

	petrolPrice:	999.99, //	number	6	999.99	currently pertrol price
	petrolQty:	99999.999, //	number	9	99999.999	currently pay petrol quantity
	amount:	999999.99, //	number	9	999999.99	buy price (petrol_price x petrol_qty)
	orderType: orderType[Math.floor(Math.random() * orderType.length)] , //'price', //quantity
	status: status[Math.floor(Math.random() * status.length)] , //'success',

	// txnid:	'9999999999', // text	10	9999999999	Transaction id
	// txnstamp:	d, //	date/time	19	yyyy-mm-dd,hh:mm:ss	Transaction time stamp
	// version:	'1.0.0', //	text	5	99.99	software version
	// vending_id:	'999', //	text	3	999	vending id
	// vending_date:	dYY+dMM+dDD, //	text	6	yymmdd	vending loging date
	// vending_time:	tHH+tMM+tSS, //	text	6	hhmmss	vending loging time
	// txndate: dYY+dMM+dDD, //	text	6	yymmdd	Transaction loging date
	// txntime: tHH+tMM+tSS, //	text	6	hhmmss	Transaction loging time
	// employee_id: '9999999999999', //	text	13	9999999999999	personal id (employee or another)
	// petrol_price:	999.99, //	number	6	999.99	currently pertrol price
	// petrol_qty:	99999.999, //	number	9	99999.999	currently pay petrol quantity
	// amount:	999999.99, //	number	9	999999.99	buy price (petrol_price x petrol_qty)
	// amt_type:	'aaaa', //	text	4	aaaa	buy petrol by amount or liter
	// txn_status:	'99', //	text	2	99	Transaction flag ( success , fail , error)
	// txn_detail:	'error handeler', //	text	20	***error handeler***	Transaction error message
}

db.orders.insert(transaction, function (err, newDoc) {
  console.log('err, newDoc =>', err, newDoc)
});

  

