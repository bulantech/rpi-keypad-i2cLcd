const config = require('config');
const player = require('play-sound')(opts = {})
const path = require('path');
const cwd = process.cwd()
const nedb = require('./lib/nedb') //require(path.join(cwd, 'lib', 'nedb') )
const bcrypt = require('bcrypt');

// nedb.setting.find({}, function (err, docs) {
// 	console.log('setting =>', err, docs)
// 	if(err) return console.log(err)
// })

//======================== variable
let gState = 'init'
let gStateLast = ''
let gTag = ''
let userID = ''
let password = ''
let passwordStart

let userIDAdd = ''
let passwordAdd = ''
let passwordAddAgain = ''

let passwordChange = ''
let passwordChangeAgain = ''

let intervalMenu
let timeoutMenu
let pingTimeout

const menuTimeoutCount = config.get('timeoutCount.menu');
const fillTimeoutCount = config.get('timeoutCount.fill');
let fillTimeoutNow = fillTimeoutCount
const alertTimeoutCount = config.get('timeoutCount.alert');
const skipTimeoutCount = config.get('timeoutCount.skip');
const pingTimeoutCount = config.get('timeoutCount.ping');
const showTimeCount = config.get('timeoutCount.show');

let bathText=''
let litresText=''
let maintenanceMode=false
let blink=false

let dateText=''
let timeText=''
let dtSetMb=''
let dtSetPi=''

let digiCount=0
let setDate=true
let index=0
let pingData=''
let pingDataArr=''


let port
let portOk=false

let serialReceiveCmd=''
let serialReceiveACK = false
let ackBuf = ''
let transaction = {}
let alert = {}

// 2.1 Request Message 
// 				Start byte 	ID 		Command tag Command data 		Stop byte
// length 1 					1 		2 					v 							1
// 				: 					D/G 	01-FF 			Check requires 	;

const cmd = {	
	start: 	':',
	end: 		';',
	Set_date_time: 	'01', // YYMMDDHHMMSS
	Set_fuel_price: '02', // ffff.ff
	Play_sound: 		'03', // XX
	Set_flow_sensor:'04', // XXXXX
	Set_fuel_type:  '05', // Y (D/G)
	reset_fuel_tank_to_full: '06', //200=liters
	Set_minimum_price: 		'08', // YY 
	clear_stored_amount: 	'0A', // XXXX (password)

	sale_by_member_debit_money: 	'0B', // XXXXmmmm
	sale_by_member_debit_liters: 	'10', // XXXXmmmm
	sale_by_member_debit_full: 	'11', // 

	set_value_of_K_of_dispenser: 	'0C', // YY (0_50)
	set_value_of_K_of_Liter_range:'0D', // LLLKKKK
	check_status_PING: '0E', //Null
}

const maintenanceMenu = [	  
	'Set date time', //01
	'Set fuel price', //02 
	'Play sound', //03 //xx
	'Set flow sensor', //'04', // XXXXX
	'Set fuel type', //05
	'Reset full tank', //06
	'Set min price', //08
	'Clear amount', //0A
	'Set K dispenser', //0C
	'Set K Liter', //'0D', // LLLKKKK
	'Ping control M/B', //0E
	// 'Clear/reset',
	'Add user',
	'Change password',	
	'Reboot',
	'Exit, to Home',
]
let menuCount=0

// test data ===================================
// test user rfid
const users = config.get('test.users');
// const users = [ 
//   {tag: '0443770628', name: 'Jone', userID: '1122334455', password:'1234'},
//   {tag: '', name: 'Admin', userID: '1234', password:'4321', maintenance:true},
// ]

let user=null

const readyPing = config.get('readyPing');
const skipRFIDNotFound = config.get('skipRFIDNotFound');
const skipSerialNotFound = config.get('skipSerialNotFound');

// read from database
let orderID = 0 

let mbPassword = '4321' //config.get('mbPassword');
nedb.setting.findOne({key: 'mbPassword'}, function (err, doc) {
	// console.log(err, doc)
	if(err) return console.log(err)
	if(!doc) return console.log('findOne price doc=>', doc)
	if(doc.value.indexOf('.') < 0) price = doc.value+'.00'
	mbPassword = doc.value
})
let mbPasswordText=''

let price = 99.99 //config.get('price');
nedb.setting.findOne({key: 'price'}, function (err, doc) {
	// console.log(err, doc)
	if(err) return console.log(err)
	if(!doc) return console.log('findOne price doc=>', doc)
	if(doc.value.indexOf('.') < 0) price = doc.value+'.00'
	price = doc.value
})
let priceText=''

let version = '9.9.9' //config.get('version');
nedb.setting.findOne({key: 'version'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne version doc=>', doc)
	version = doc.value
})

let vendingId = '9999' //config.get('vendingId');
nedb.setting.findOne({key: 'vendingID'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne vendingID doc=>', doc)
	vendingId = doc.value
})

let fullTank = 999 //config.get('vendingId');
nedb.setting.findOne({key: 'fullTank'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne fullTank doc=>', doc)
	fullTank = doc.value
})
let fullTankText = ''

let minPrice = 99
nedb.setting.findOne({key: 'minPrice'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne minPrice doc=>', doc)
	minPrice = doc.value*1
})
let minPriceText = ''

let flowSensor = 99999
nedb.setting.findOne({key: 'flowSensor'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne flowSensor doc=>', doc)
	flowSensor = doc.value*1
})
let flowSensorText = ''

let playSound = 99
nedb.setting.findOne({key: 'playSound'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne playSound doc=>', doc)
	playSound = doc.value*1
})
let playSoundText = '' 

let kDispenser = 99
nedb.setting.findOne({key: 'kDispenser'}, function (err, doc) {
	if(err) return console.log(err)
	if(!doc) return console.log('findOne kDispenser doc=>', doc)
	kDispenser = doc.value*1
})
let kDispenserText = ''

let kLiter = '8889999'
nedb.setting.findOne({key: 'kLiter'}, function (err, doc) {
	// console.log(err, doc)
	if(err) return console.log(err)
	if(!doc) return console.log('findOne kLiter doc=>', doc)
	kLiter = doc.value
})
let kLiterText = ''

let cmdFuelType = 'G' //config.get('mbType') // D or G
nedb.setting.findOne({key: 'fuelType'}, function (err, doc) {
	// console.log(err, doc)
	if(err) return console.log(err)
	if(!doc) return console.log('findOne fuelType doc=>', doc)
	cmdFuelType = doc.value
})
let cmdFuelTypeBuf = ''


//======================== lcd ======================================================
const LCD = require('raspberrypi-liquid-crystal');
// Instantiate the LCD object on bus 1 address 3f with 16 chars width and 2 lines
const lcd = new LCD(1, 0x27, 16, 2);

//======================== rfid ======================================================
const rfidInit = () => {
	const fs = require("fs");
	const path = '/dev/input/event0'

	if (!fs.existsSync(path)) {
		console.log(path, 'not found')
		return 1
	} 

	const InputEvent = require('input-event');
	const input = new InputEvent(path);
	const keyboard = new InputEvent.Keyboard(input);

	// https://github.com/torvalds/linux/blob/master/include/uapi/linux/input-event-codes.h
	const event_codes = [
	  {key: '1', code: 2},
	  {key: '2', code: 3},
	  {key: '3', code: 4},
	  {key: '4', code: 5},
	  {key: '5', code: 6},
	  {key: '6', code: 7},
	  {key: '7', code: 8},
	  {key: '8', code: 9},
	  {key: '9', code: 10},
	  {key: '0', code: 11},
	]

	let tag = ''

	keyboard.on('keypress', ev => {
	  if(ev.code==28) {
	    console.log('tag =', tag)
	    gTag = tag
	    tag = ''
	    if(gState === 'ready') {
				task('card-id')
	    }
	    else if(gState === 'addTag') {
	    	task('addCardId')
	    }
	    return
	  } 
	  const keyCode = event_codes.find(({code}) => code === ev.code )
	  console.log(ev.code, keyCode.key)
	  tag += keyCode.key
	});
}

//======================== keypad ======================================================
//Pi GPIO6  to keypad R1
//Pi GPIO13 to keypad R2
//Pi GPIO19 to keypad R3
//Pi GPIO26 to keypad R4
//Pi GPIO21 to keypad C1
//Pi GPIO20 to keypad C2
//Pi GPIO16 to keypad C3

const Gpio = require('onoff').Gpio;

const keypadR1 = new Gpio(6, 'out');
const keypadR2 = new Gpio(13, 'out');
const keypadR3 = new Gpio(19, 'out');
const keypadR4 = new Gpio(26, 'out');

const keypadC1 = new Gpio(21, 'in', 'falling', {debounceTimeout: 10}); //falling
const keypadC2 = new Gpio(20, 'in', 'falling', {debounceTimeout: 10}); //both
const keypadC3 = new Gpio(16, 'in', 'falling', {debounceTimeout: 10}); //rising

let scanRow = 0
const keys = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['*','0','#'],
]
let nowKey = null

// keypadC1.watch((err, value) => {
//   if (err) {
//     throw err;
//   }
//   // console.log('keypad C1')
//   checkKey(0)
// });

// keypadC2.watch((err, value) => {
//   if (err) {
//     throw err;
//   }
//   checkKey(1)
// });

// keypadC3.watch((err, value) => {
//   if (err) {
//     throw err;
//   }
//   checkKey(2)
// });


//========================================== key event

const checkKey = (col) => {
	// console.log('col:==>', col, new Date().getTime())	
	let key = ''
	if(col!==0xff) {	  
	  key = keys[scanRow][col]
	  if(!nowKey) nowKey=key
	  // console.log('Key:==>', key, new Date().getTime())	
		return
	}

	key = nowKey //key up	
	nowKey = null
	console.log('KeyUp:', key, new Date().getTime())	

	var audio = player.play('./sound/beep-08b.wav', function(err){
	  if (err) throw err
	})
	// audio.kill()

	switch(gState) {

		case 'ready':
			switch(key) {
				case '*': return task('maintenance-to'); break;
				case '#': return task('ready-show-date'); break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					userID += key; return task('user-id');
				break;
			}
		break 
		case 'ready-not-ping':
			switch(key) {
				case '*': 
					lcd.printLineSync(0, '   Check M/B    ');
					lcd.printLineSync(1, '      ...       ');
					setTimeout(()=> task('ready'), 1000) 
				break;
				// case '#': return task('init-rfid-0'); break;
			}
		break
		case 'init-rfid':
			switch(key) {
				case '*': return task('init-rfid-0'); break;
				case '#': if(skipRFIDNotFound) return task('init-serial-0'); break;
			}
		break

		case 'init-serial':
			switch(key) {
				case '*': return task('init-serial-0'); break;
				case '#': if(skipSerialNotFound) return task('ready'); break;
			}
		break
		case 'card-id':
			switch(key) {
				case '*': task('ready'); break;
				case '#': 
				// {
				// 	const user =  users.find((u) => (u.tag === gTag)  )
				// 	if(user) { 
				// 		transaction.insertAt = new Date()
				// 		transaction.tag = gTag
				// 		return task('password'); 
				// 	}
				// 	task('user-not-found');
				// } 
					// console.log('========== gTag =>', gTag)
					nedb.users.findOne({tag: gTag}, function (err, doc) {
				    console.log('err, doc =>', err, doc)
				    if(err) return task('System error');
				    user = doc
				    if(user) { 
							transaction.insertAt = new Date()
							transaction.tag = gTag
							transaction.name = user.name
							return task('password'); 
						}
						task('user-not-found');
				  });

				break;				
			}
		break

		case 'user-id':
			switch(key) {
				case '*':  
					if(userID.length) userID = userID.slice(0, -1); 
					else return task('ready');
				break;
				case '#': 
				// {
				// 	if(!userID.length) return
				// 	const user =  users.find((u) => (u.userID === userID) )
				// 	if(user) {
				// 		transaction.insertAt = new Date()
				// 		transaction.userID = userID
				// 		return task('password');
				// 	}
				// 	return task('user-not-found'); 
				// }
					if(!userID.length) return
					nedb.users.findOne({userID: userID}, function (err, doc) {
				    console.log('err, doc =>', err, doc)
				    if(err) return task('System error');
				    user = doc
				    if(user) {
							transaction.insertAt = new Date()
							transaction.userID = userID
							transaction.name = user.name
							return task('password');
						}
						task('user-not-found');
				  });
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
				 	userID += key				 	
				break;
			}

			lcd.printLineSync(0, 'User> '+userID.padStart(10, ' '));
			if(!userID.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)
		break

		case 'addUserID':
			switch(key) {
				case '*':  
					if(userIDAdd.length) userIDAdd = userIDAdd.slice(0, -1); 
					else return task('maintenance-menu');
				break;
				case '#': 
					if(!userIDAdd.length) return
					nedb.users.findOne({userID: userIDAdd}, function (err, doc) {
				    console.log('nedb.users.findOne err, doc =>', err, doc)
				    if(err) return task('System error');
				    user = doc
				    if(!user) {
							return task('addPassword');
						}

						lcd.printLineSync(0, 'userID Duplicate');
						lcd.printLineSync(1, '    Try again   ');
						clearTimeout(timeoutMenu)
						timeoutMenu = setTimeout(()=>{
							task('addUserID')
						}, alertTimeoutCount*1000)
				  });
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(userIDAdd.length >= 8) return
				 	userIDAdd += key				 	
				break;
			}

			lcd.printLineSync(0, 'UserID> '+userIDAdd.padStart(8, ' '));
			if(!userIDAdd.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)
		break

		case 'addPassword':
			switch(key) {
				case '*': 
					if(passwordAdd.length) passwordAdd = passwordAdd.slice(0, -1); 
					else return task('addUserID'); 
				break;
				case '#': 
					if(!passwordAdd.length) return
					return task('addPasswordAgain'); 
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(passwordAdd.length >= 10) return
					passwordAdd += key
				break;
			}

			passwordStart = ''
			for(let i=0; i<passwordAdd.length; i++) {
				passwordStart += '*'
			}
			lcd.printLineSync(0, 'Pass> '+passwordStart.padStart(10, ' '));
			if(!passwordAdd.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break 

		case 'addPasswordAgain':
			switch(key) {
				case '*': 
					if(passwordAddAgain.length) passwordAddAgain = passwordAddAgain.slice(0, -1); 
					else return task('addPassword'); 
				break;
				case '#': 
					if(!passwordAddAgain.length) return
					if(passwordAdd !== passwordAddAgain) return task('addPasswordNotMatch')
					return task('addTag')	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(passwordAddAgain.length >= 10) return
					passwordAddAgain += key
				break;
			}

			passwordStart = ''
			for(let i=0; i<passwordAddAgain.length; i++) {
				passwordStart += '*'
			}
			lcd.printLineSync(0, 'Again>'+passwordStart.padStart(10, ' '));
			if(!passwordAddAgain.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break 

		case 'changePassword':
			switch(key) {
				case '*': 
					if(passwordChange.length) passwordChange = passwordChange.slice(0, -1); 
					else return task('maintenance-menu'); 
				break;
				case '#': 
					if(!passwordChange.length) return
					return task('changePasswordAgain'); 
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(passwordChange.length >= 10) return
					passwordChange += key
				break;
			}

			passwordStart = ''
			for(let i=0; i<passwordChange.length; i++) {
				passwordStart += '*'
			}
			lcd.printLineSync(0, 'Pass> '+passwordStart.padStart(10, ' '));
			if(!passwordChange.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break 

		case 'changePasswordAgain':
			switch(key) {
				case '*': 
					if(passwordChangeAgain.length) passwordChangeAgain = passwordChangeAgain.slice(0, -1); 
					else return task('changePassword'); 
				break;
				case '#': 
					if(!passwordChangeAgain.length) return
					if(passwordChange!== passwordChangeAgain) return task('changePasswordNotMatch')
					return task('changePasswordComplete')
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(passwordChangeAgain.length >= 10) return
					passwordChangeAgain += key
				break;
			}

			passwordStart = ''
			for(let i=0; i<passwordChangeAgain.length; i++) {
				passwordStart += '*'
			}
			lcd.printLineSync(0, 'Again>'+passwordStart.padStart(10, ' '));
			if(!passwordChangeAgain.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break 

		case 'addTag':
			switch(key) {
				case '*': 
					return task('maintenance-menu'); 
				break;
				case '#': 
					console.log('add =>', userIDAdd, passwordAdd)
					bcrypt.hash(passwordAdd, 10, function(err, hash) {
					  if(err) {
					  	task('System error')
					    return console.log(err)
					  }
					  const data = { 
					    userID: userIDAdd, 
					    tag: '',
					    username: userIDAdd, 
					    password: hash, 
					    name: userIDAdd, 
					    address: '',
					    lastLogin: '',
					    role: '',    
					    createAt: new Date(),
					    createBy: 'maintenance',
					    updateAt: new Date(),
					    updateBy: 'maintenance',

					  }
					  db.users.insert(data, function (err, newDoc) {
					    console.log('err, newDoc =>', err, newDoc)
					    if(err) return task('System error')
					    task('addComplete') //skip	
					  });  
					})
				break;
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'addPasswordNotMatch':
			switch(key) {
				case '*': 
					return task('addPasswordAgain'); 
				break;
				case '#': 
					task('maintenance-menu') 
				break;
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'changePasswordNotMatch':
			switch(key) {
				case '*': 
					return task('changePasswordAgain'); 
				break;
				case '#': 
					task('maintenance-menu') 
				break;
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'addCardId':
			switch(key) {
				case '*': 
					return task('addTag'); 
				break;
				case '#': 
					console.log('add =>', userIDAdd, passwordAdd, gTag)
					bcrypt.hash(passwordAdd, 10, function(err, hash) {
					  if(err) {
					  	task('System error')
					    return console.log(err)
					  }
					  const data = { 
					    userID: userIDAdd, 
					    tag: gTag,
					    username: userIDAdd, 
					    password: hash, 
					    name: userIDAdd, 
					    address: '',
					    lastLogin: '',
					    role: '',    
					    createAt: new Date(),
					    createBy: 'maintenance',
					    updateAt: new Date(),
					    updateBy: 'maintenance',

					  }
					  db.users.insert(data, function (err, newDoc) {
					    console.log('err, newDoc =>', err, newDoc)
					    if(err) return task('System error')
					    task('addComplete') //skip	
					  });  
					})	
				break;
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'addComplete':
			switch(key) {
				case '*': 
					return task('maintenance-menu'); 
				break;
				case '#': 
					task('ready')	
				break;
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break


		case 'password':
			switch(key) {
				case '*': 
					if(password.length) password = password.slice(0, -1); 
					else return task('ready'); 
				break;
				case '#': 
					if(!password.length) return
					return task('auth'); 
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					password += key
				break;
			}

			passwordStart = ''
			for(let i=0; i<password.length; i++) {
				passwordStart += '*'
			}
			lcd.printLineSync(0, 'Pass> '+passwordStart.padStart(10, ' '));
			if(!password.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break 

		case 'validation-to':
			switch(key) {
				case '*': return task('validation-process'); break; 
				case '#': return task('fill-select'); break;
			}
		break

		case 'fill-select':
			switch(key) {
				case '1': task('fill-bath-select'); break;
				case '2': task('fill-litres-select'); break;
				case '3': task('fill-full-confirm'); break;
			}
		break

		case 'fill-full-confirm':
			switch(key) {
				case '*': return task('ready'); break; //return task('fill-select'); break;
				case '#': return task('fill-full-ack'); break;				
			}
		break

		case 'fill-bath-select':
			switch(key) {
				case '*': 
					if(bathText.length) bathText = bathText.slice(0, -1); 
					else return task('fill-select'); 
				break;
				case '#': 
					if(bathText.length)
						return task('fill-bath-confirm'); 
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(bathText.length<4) bathText += key
				break;
			}

			lcd.printLineSync(0, 'Amount> '+bathText.padStart(8, ' '));
			if(!bathText.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'fill-bath-confirm':
			switch(key) {
				case '*': return task('ready'); break; //return task('fill-select'); break;
				case '#': return task('fill-bath-ack'); break;
			}
		break

		case 'fill-litres-select':
			switch(key) {
				case '*': 
					if(litresText.length) litresText = litresText.slice(0, -1); 
					else return task('fill-select'); 
				break;
				case '#': 
					if(litresText.length)
						return task('fill-litres-confirm'); 
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(litresText.length<2) litresText += key
				break;
			}

			lcd.printLineSync(0, 'Litres> '+litresText.padStart(8, ' '));
			if(!litresText.length) lcd.printLineSync(1, 'BACK(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'fill-litres-confirm':
			switch(key) {
				case '*': return task('ready'); break; //return task('fill-select'); break;
				case '#': return task('fill-litres-ack'); break;
			}
		break

		case 'fill-timeout':
			switch(key) {
				case '*': return task('ready'); break;
				case '#': return task('ready'); break;
			}
		break
 
		case 'fill-error':
			switch(key) {
				// case '*': return task('ready'); break;
				case '#': return task('ready'); break;
			}
		break

		case 'fill-complete':
			switch(key) {
				// case '*': return task('ready'); break;
				case '#': 
				  // log to database confirm
					return task('ready');
				break;
			}
		break

		case 'maintenance-to':
			switch(key) {
				case '*': return task('ready'); break;
				case '#': maintenanceMode=true; return task('password'); break;
			}
		break

		case 'maintenance-menu': 
			switch(key) {
				case '7': if(--menuCount < 0) menuCount=maintenanceMenu.length-1; break;
				case '*': if(++menuCount >= maintenanceMenu.length) menuCount=0; break;
				case '#': 
					switch(maintenanceMenu[menuCount]) {
						case 'Set fuel price': return task('Set fuel price'); break; 
						case 'Reset full tank': return task('Reset full tank'); break;   	
						case 'Set flow sensor': return task('Set flow sensor'); break;					
						case 'Set min price': return task('Set min price'); break;
						case 'Play sound': return task('Play sound'); break; 
						case 'Set K dispenser': return task('Set K dispenser'); break; 
						case 'Set K Liter': return task('Set K Liter');
						case 'Set fuel type': return task('Set fuel type'); break;
						case 'Set date time': return task('Set date time'); break;
						case 'Add user': return task('addUserID'); break; 
						case 'Change password': return task('changePassword');
						case 'Ping control M/B': 
							lcd.printLineSync(0, '    Ping ...    ');
							lcd.printLineSync(1, '                ');
						
							clearTimeout(pingTimeout)
							clearTimeout(timeoutMenu)
							pingTimeout = setTimeout(()=>{
								task('Not respond')
							}, pingTimeoutCount*1000)

							gState = 'Ping control M/B'	
							return serialTransmit('Ping control M/B'); 
						break;
					
						case 'Clear amount': 
							lcd.printLineSync(0, 'Clear amount ...');
							lcd.printLineSync(1, '                ');
						
							clearTimeout(pingTimeout)
							clearTimeout(timeoutMenu)
							pingTimeout = setTimeout(()=>{
								task('Not respond')
							}, pingTimeoutCount*1000)

							gState = 'Clear amount'	
							return serialTransmit('Clear amount'); 
						break;
						case 'Reboot': return task('Reboot'); break;
						case 'Exit, to Home': return task('ready'); break;
						break;
					}
				break;
			}

			lcd.printLineSync(0, maintenanceMenu[menuCount].padEnd(16, ' '));
			// lcd.printLineSync(1, 'NEXT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'Set fuel price':
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, ' Set fuel price '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set fuel price')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					priceText = priceText.substring(0, index) + key + priceText.substring(index + 1);
					// console.log('priceText, index, key', priceText, index, key)
					if(++digiCount>=4) { digiCount=0; index=0; }
					// set index blink
					if(index>=1) index=digiCount+1
					else index=digiCount

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

				break;
			}

		break

		case 'Reset full tank': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, 'Setting sending.'); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Reset full tank')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					fullTankText = fullTankText.substring(0, index) + key + fullTankText.substring(index + 1);
					// console.log('priceText, index, key', priceText, index, key)
					if(++digiCount>=4) { digiCount=0; index=0; }
					// set index blink
					// if(index>=1) index=digiCount+1
					// else index=digiCount
					index=digiCount

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

				break;
			}

		break  

		case 'Set flow sensor': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, 'Set flow sensor '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set flow sensor')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					flowSensorText = flowSensorText.substring(0, index) + key + flowSensorText.substring(index + 1);
					// console.log('priceText, index, key', priceText, index, key)
					if(++digiCount>=5) { digiCount=0; index=0; }
					// set index blink
					// if(index>=1) index=digiCount+1
					// else index=digiCount
					index=digiCount

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

				break;
			}

		break

		case 'Set min price': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, 'Setting sending.'); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set min price')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					minPriceText = minPriceText.substring(0, index) + key + minPriceText.substring(index + 1);
					// console.log('priceText, index, key', priceText, index, key)
					if(++digiCount>=2) { digiCount=0; index=0; }
					// set index blink
					// if(index>=1) index=digiCount+1
					// else index=digiCount
					index=digiCount

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

				break;
			}

		break 

		case 'Play sound': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, ' Set Play Sound '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Play sound')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					playSoundText = playSoundText.substring(0, index) + key + playSoundText.substring(index + 1);
					// console.log('priceText, index, key', priceText, index, key)
					if(++digiCount>=2) { digiCount=0; index=0; }
					// set index blink
					// if(index>=1) index=digiCount+1
					// else index=digiCount
					index=digiCount

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

				break;
			}

		break 

		case 'Set K dispenser': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, 'Set K dispenser '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set K dispenser')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

					if(index==0 && (key*1) > 5) return
					if(index==1 && kDispenserText[0]=='5' && (key*1) > 0) return

					kDispenserText = kDispenserText.substring(0, index) + key + kDispenserText.substring(index + 1);
					if(++digiCount>=2) { digiCount=0; index=0; }
					index=digiCount

					if(kDispenserText[0]=='5') { 
						let a = kDispenserText.split("");
				    a[1] = '0';
				    kDispenserText = a.join("");
					}
					console.log('kDispenserText, kDispenserText[0], kDispenserText[1]', kDispenserText, kDispenserText[0], kDispenserText[1])

				break;
			}
 
		break 

		case 'Set K Liter': 
			switch(key) {
				case '*': 
					clearInterval(intervalMenu)
					return task('maintenance-menu'); 
				break;
				case '#': 
					clearInterval(intervalMenu)
					lcd.printLineSync(0, '  Set K Liter   '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set K Liter')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	

					kLiterText = kLiterText.substring(0, index) + key + kLiterText.substring(index + 1);
					if(++digiCount>=7) { digiCount=0; index=0; }
					index=digiCount

				break;
			}
 
		break

		case 'Set fuel type':
			switch(key) {
				// case '*': return task('maintenance-menu'); break;
				case '1': lcd.printLineSync(0, 'Set fuel type> D'); cmdFuelTypeBuf='D'; break;
				case '2': lcd.printLineSync(0, 'Set fuel type> G'); cmdFuelTypeBuf='G'; break;
				case '#': 
					// cmdFuelType = cmdFuelTypeBuf
					// return task('maintenance-menu'); break;
					lcd.printLineSync(0, '  Set fuel type '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set fuel type')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	
				break;
			}	
		break

		case 'Ping show data':
			switch(key) {
				case '*': return task('maintenance-menu'); break;
				case '#': 
					const name = ['Fuel', 'd1', 'd2', 'd3', 'd4', 'Time', 'Date']
					lcd.printLineSync(0, name[index] + ': ' + pingDataArr[index].padEnd(10, ' '));
					lcd.printLineSync(1, 'BACK(*)  NEXT(#)');
					if(++index >= 7) index = 0

					clearTimeout(timeoutMenu)
					timeoutMenu = setTimeout(()=>{
						task('timeout')
					}, menuTimeoutCount*1000)	
				break;
			}		
		break

		case 'Setting is ok':
			switch(key) {
				case '*': 
					if(gStateLast == 'Set fuel type') {
						menuCount = maintenanceMenu.indexOf('Set fuel type');
						return task('maintenance-menu');
					}
				case '#': 
					if(gStateLast==='Set fuel price') {
						console.log('Controller must reset')
					}
					menuCount=0
					return task('maintenance-menu');
				break;
			}		
		break;

		case 'Not respond':
			switch(key) {
				case '*': return task(gStateLast); break;
				case '#': menuCount=0; return task('maintenance-menu'); break;
				break;
			}		
		break;

		case 'Error respond':
			switch(key) {
				case '*': 
					if(gStateLast == 'Ping control M/B') {
						menuCount = maintenanceMenu.indexOf('Ping control M/B');
						return task('maintenance-menu');
					} 
					return task(gStateLast); 
				break;
				case '#': menuCount=0; return task('maintenance-menu'); break;
				break;
			}		
		break;

		case 'Reboot': 
			switch(key) {
				case '*': return task('maintenance-menu'); break;
				case '#': 
					console.log('Reboot')
					lcd.printLineSync(0, '   Reboot now   ');
					lcd.printLineSync(1, '      ...       ');

					alert = {
				    insertAt: new Date(),
				    event: 'Reboot',
				    message: 'Reboot by Maintenance'
				  }
				  // console.log(alert)
				  nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
				    console.log(err, newDoc)
				    setTimeout(()=>{
				      var exec = require('child_process').exec;
				      exec('sudo reboot', function(error, stdout, stderr){ 
				        console.log('Reboot:',error, stdout, stderr)
				      });
				    }, 1*1000)  
				  });
				break;
			}			
		break;

		case 'Set date time':
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	

			switch(key) {
				case '*': 
					if(setDate) {setDate=false; digiCount=0; index=0}
					else {setDate=true; digiCount=0; index=0}
				break;
				case '#': 
					const dateArr = dateText.split('/')
					dtSetPi = dateArr[2]+'-'+dateArr[1]+'-'+dateArr[0]+' '+timeText
					const dSet = dateArr[2].slice(-2)+dateArr[1]+dateArr[0]
					const tSet = timeText.split(':').join('')
					dtSetMb = dSet+tSet
					// console.log('dtSetPi, dtSetMb', dtSetPi, dtSetMb)

					clearInterval(intervalMenu)
					lcd.printLineSync(0, '  Set date time '); 
				  lcd.printLineSync(1, '      ...       ');
				  serialReceiveACK = true
					serialTransmit('Set date time')		
					clearTimeout(pingTimeout)
					pingTimeout = setTimeout(()=>{
						task('Not respond')
					}, pingTimeoutCount*1000)	

				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0':
					switch(digiCount) {
						case 0:
							if(setDate) {
								if( (key*1) > 3) return; // set date
							}
							else {
								if( (key*1) > 2) return; //set time	
							}							
						break;
						case 1:
							if(setDate) {
								if(dateText[0]==='3') {
									if( (key*1) > 1) return; // set date
								}								
							}
							else {
								if(timeText[0]==='2') {
									if( (key*1) >= 4) return; // set time
								}	
							}							
						break;
						case 2:
							if(setDate) {
								if( (key*1) > 1) return; // set date
							}
							else {
								if( (key*1) > 5) return; //set time	
							}							
						break;
						case 3:
							if(setDate) {
								if(dateText[3]==='1') {
									if( (key*1) > 2) return; // set date
								}								
							}						
						break;
						case 4:
							if(setDate) {
								if( (key*1) > 2) return; // set date
							}
							else {
								if( (key*1) > 5) return; //set time	
							}							
						break;
					}

					if(digiCount>3) index=digiCount+2
					else if(digiCount>1) index=digiCount+1
					else index=digiCount
					
					if(setDate) {						
						dateText = dateText.substring(0, index) + key + dateText.substring(index + 1);
						if(++digiCount>7) digiCount=0
					}
					else {						
						timeText = timeText.substring(0, index) + key + timeText.substring(index + 1);
						if(++digiCount>5) digiCount=0
					}

					// set index blink
					if(index>3) index=digiCount+2
					else if(index>=1) index=digiCount+1
					else index=digiCount

					if(!digiCount) index=0
					// console.log('digiCount, index', digiCount, index)
					
				break;
			}
			
		break

	}


}

const scanKeyInterval = () => {
	setInterval(function(){ 
	  // console.log('scanRow:', scanRow)
	  // if(++scanRow >= 4) scanRow = 0; 
	  for(scanRow=0; scanRow<4; scanRow++) {
		  keypadR1.writeSync(1)
		  keypadR2.writeSync(1)
		  keypadR3.writeSync(1)
		  keypadR4.writeSync(1)
		  
		  switch(scanRow) {
		    case 0: keypadR1.writeSync(0); break; 
		    case 1: keypadR2.writeSync(0); break;
		    case 2: keypadR3.writeSync(0); break;
		    case 3: keypadR4.writeSync(0); break;
		  } 

		  if(!keypadC1.readSync()) { 
		  	// console.log('nowKey 0:', nowKey, new Date().getTime()); 
		  	return checkKey(0)
		  }
		  if(!keypadC2.readSync()) return checkKey(1)
		  if(!keypadC3.readSync()) return checkKey(2)

		  if(nowKey) { // key Up
		  	// console.log('nowKey 1:', nowKey, new Date().getTime())
		  	return checkKey(0xff)
		  } 
		}
	  
	  // scanKeyInterval()

	}, 100);
}


// check serial port ====================================================

const serialInit = () => {
	const fs = require("fs");
	const path = '/dev/ttyUSB0'

	if (!fs.existsSync(path)) {
		console.log(path, 'not found')
		return 1
	} 	

	if(portOk) return 0

	const SerialPort = require('serialport')
	port = new SerialPort('/dev/ttyUSB0', {
	  autoOpen: true,
	  baudRate: 9600,
	  dataBits: 8,
	  parity: 'none',
	  stopBits: 1,
	  // hupcl: true,
	  // lock: true,	  
	  // rtscts: false,	  
	  // xany: false,
	  // xoff: false,
	  // xon: false,
	})

	// port.open(function (err) {
	//   if (err) {
	//     return console.log('Error opening port: ', err.message)
	//   }

	//   // Because there's no callback to write, write errors will be emitted on the port:
	//   port.write('main screen turn on ==')
	// })

	const byteParser = new SerialPort.parsers.ByteLength({ length: 1 })
	port.pipe(byteParser)

	// Open errors will be emitted as an error event
	port.on('error', function(err) {
	  console.log('Error: ', err.message)
	})

	// The open event is always emitted
	port.on('open', function() {
	  console.log('Port open')
	  portOk = true

	 //  port.write('main screen turn on', function(err) {
		//   if (err) {
		//     return console.log('Error on write: ', err.message)
		//   }
		//   console.log('message written')
		// })
		// setInterval(()=> port.write(':D0E;') ,5000)

	})

	// Read data that is available but keep the stream in "paused mode"
	// port.on('readable', function () {
	//   console.log('Readable:', port.read())
	// })

	// Switches the port into "flowing mode"
	// port.on('data', function (data) {
	//   console.log('Data:', data)
	// })

	port.on('close', () => {
	  console.log('Serial port disconnected.')
	  portOk = false
	})

	/**
	 * listen to the bytes as they are parsed from the parser.
	 */
	byteParser.on('data', data => {
	  // console.log('byteParser data:', data, data.toString())
	  serialReceive(data)
	})


	return 0

}

const serialTransmit = (command) => {
	console.log('serialTransmit: cmd, state =>', command, gState)
	if(!portOk) {				
		console.log('serialTransmit: !portOk', gState)
		// log to database
		return serialInit()
	}

	serialReceiveCmd=''
	let cmdNow
	// let orderIDtext
	gStateLast = gState

	switch(command) {
		case 'check_status_PING':
			cmdNow = cmd.start + cmdFuelType + cmd.check_status_PING + cmd.end	
		break

		case 'Set fuel price':
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Set_fuel_price + priceText + cmd.end	
		break

		case 'Reset full tank': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.reset_fuel_tank_to_full + fullTankText + cmd.end	
		break 

		case 'Set flow sensor': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Set_flow_sensor + flowSensorText + cmd.end	
		break 

		case 'Set date time': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Set_date_time + dtSetMb + cmd.end	
		break

		case 'Set min price': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Set_minimum_price + minPriceText + cmd.end	
		break 

		case 'Play sound': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Play_sound + playSoundText + cmd.end	
		break 

		case 'Set K dispenser': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.set_value_of_K_of_dispenser + kDispenserText + cmd.end	
		break 

		case 'Set K Liter': 
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.set_value_of_K_of_Liter_range + kLiterText + cmd.end	
		break

		case 'Set fuel type':
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.Set_fuel_type + cmdFuelTypeBuf + cmd.end	
		break

		case 'Ping control M/B':
			gStateLast = gState
			cmdNow = cmd.start + cmdFuelType + cmd.check_status_PING + cmd.end
		break 

		case 'Clear amount':
			gStateLast = 'maintenance-menu'
			serialReceiveACK = true
			cmdNow = cmd.start + cmdFuelType + cmd.clear_stored_amount + mbPassword + cmd.end
		break

		case 'sale_by_member_debit_money':
			// orderIDtext = (++orderID).toString().padStart(4, '0')
			switch(gState) {
				case 'fill-full-ack':
					transaction.orderType = 'full'
					cmdNow = cmd.start + cmdFuelType + cmd.sale_by_member_debit_full + 
						mbPassword + cmd.end			
				break
				case 'fill-bath-ack':
					console.log('price, bathText =>', price, bathText)
					transaction.amount = bathText*1
					transaction.orderType = 'price'
					cmdNow = cmd.start + cmdFuelType + cmd.sale_by_member_debit_money + 
						mbPassword + bathText + cmd.end	//bathText.padStart(4, '0') + cmd.end			
				break
				case 'fill-litres-ack':
					bathText = ( Math.floor(litresText*price) +'')
					transaction.petrolQty = litresText*1
					// transaction.amount = bathText*1
					transaction.orderType = 'quantity'
					console.log('price, litresText, bathText =>', price, litresText, bathText)
					cmdNow = cmd.start + cmdFuelType + cmd.sale_by_member_debit_liters + 
						mbPassword + litresText + cmd.end			
				break
			}
		break

		default:
			console.log('serialTransmit: gState not found =>', gState)
			// log to database
			return
		break

	}
	console.log('cmdNow =>', cmdNow)
	port.write(cmdNow)

}

const serialReceive = (buf) => {
	const bufChar = buf.toString()
	console.log('serialReceiveCmd bufChar =>', bufChar)
	if(serialReceiveACK) {
		ackBuf += bufChar
		if(ackBuf.length < 2) return

		console.log('serialReceiveCmd ackBuf =>', ackBuf)
		
		if(ackBuf[0]==='0' || ackBuf[1]==='0') { //ack ok
			switch(gState) {
				case 'fill-full-ack':
				case 'fill-bath-ack':
				case 'fill-litres-ack':
					console.log('serialReceive ACk',gState, ackBuf)
					gStateLast = gState
					task('fill-wait-press')
				break

				case 'Set fuel price':  
					console.log('serialReceive',gState, ackBuf, priceText)	
					price = priceText//*1	   
					alert = {
						insertAt: new Date(),
						event: 'Set fuel price',
						message: 'OK price='+price
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'price' }, { $set: {value: price, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Set flow sensor': 
					console.log('serialReceive',gState, ackBuf, flowSensorText)	
					flowSensor = flowSensorText*1	   
					alert = {
						insertAt: new Date(),
						event: 'Set flow sensor',
						message: 'OK flowSensor='+flowSensor
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'flowSensor' }, { $set: {value: flowSensor, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Set date time': 
					console.log('serialReceive',gState, ackBuf, dtSetMb)	
					flowSensor = flowSensorText*1	   
					alert = {
						insertAt: new Date(),
						event: 'Set date time',
						message: 'OK Date Time='+dtSetMb
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					{
					var exec = require('child_process').exec; 
					exec('sudo timedatectl set-ntp false', function(error, stdout, stderr){ 
						console.log('set-ntp false:',error, stdout, stderr)
						exec('sudo timedatectl set-time "'+dtSetPi+'"', function(error, stdout, stderr){ 
							console.log('set-time:',error, stdout, stderr)
							// return task('done');
						});
					});
					}

					// update setting
					// db.setting.update({ key: 'flowSensor' }, { $set: {value: flowSensor} }, { upsert: true }, function (err, numReplaced) {
					//   console.log(err, numReplaced)
					// });
			
					task('Setting is ok')
				break

				case 'Reset full tank': 
					console.log('serialReceive',gState, ackBuf, fullTankText)	
					fullTank = fullTankText*1	
					alert = {
						insertAt: new Date(),
						event: 'Reset full tank',
						message: 'OK full Tank='+fullTank
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'fullTank' }, { $set: {value: fullTank, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Set min price': 
					console.log('serialReceive',gState, ackBuf, minPriceText)	
					minPrice = minPriceText*1	
					alert = {
						insertAt: new Date(),
						event: 'Set min price',
						message: 'OK full minPrice='+minPrice
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'minPrice' }, { $set: {value: minPrice, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Play sound': 
					console.log('serialReceive',gState, ackBuf, playSoundText)	
					playSound = playSoundText*1	
					alert = {
						insertAt: new Date(),
						event: 'Set play sound',
						message: 'OK playSound='+playSound
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'playSound' }, { $set: {value: playSound, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Set K dispenser': 
					console.log('serialReceive',gState, ackBuf, kDispenserText)	
					kDispenser = kDispenserText*1	
					alert = {
						insertAt: new Date(),
						event: 'Set Set K dispenser',
						message: 'OK k Dispenser='+kDispenser
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'kDispenser' }, { $set: {value: kDispenser, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break 

				case 'Set K Liter': 
					console.log('serialReceive',gState, ackBuf, kLiterText)	
					kLiter = kLiterText
					alert = {
						insertAt: new Date(),
						event: 'Set Set K Liter',
						message: 'OK K Liter='+kLiter
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});

					// update setting
					nedb.setting.update({ key: 'kLiter' }, { $set: {value: kLiter, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break

				case 'Set fuel type':
					console.log('serialReceive <Set fuel type>',gState, ackBuf)	
					cmdFuelType = cmdFuelTypeBuf	
					alert = {
						insertAt: new Date(),
						event: 'Set fuel type',
						message: 'OK type='+cmdFuelType
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});
					// update setting
					nedb.setting.update({ key: 'fuelType' }, { $set: {value: cmdFuelType, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
					  console.log(err, numReplaced)
					});
			
					task('Setting is ok')
				break

				case 'Clear amount':
					console.log('serialReceive <Clear amount>',gState, ackBuf)	
					alert = {
						insertAt: new Date(),
						event: 'Clear amount',
						message: 'OK'
					}
					// console.log(alert)
					nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
					  console.log(err, newDoc)
					});
			
					task('Setting is ok')
				break

			}
		}
		else {
			console.log('serialReceive ACk FF =>',gState, ackBuf)
			switch(gState) {
				case 'fill-full-ack':
				case 'fill-bath-ack':
				case 'fill-litres-ack':					
					transaction.status = 'error'
					transaction.detail = 'Return FF'
					task('fill-error')
				break

				case 'Set fuel price':  
				case 'Set flow sensor':
				case 'Set date time':
				case 'Reset full tank': 
				case 'Set min price': 
				case 'Play sound':
				case 'Set K dispenser':
				case 'Set K Liter':
				case 'Set fuel type':		
				case 'Clear amount':				
					task('Error respond')
				break
			}
		}

		ackBuf = ''
		serialReceiveACK = false
		// serialReceiveCmd = ''
		return
	}

	if(bufChar===cmd.start && (!serialReceiveCmd.length)) return serialReceiveCmd = ':'
	serialReceiveCmd += bufChar
	if(bufChar===cmd.end) {
		console.log('serialReceiveCmd =>', gState, serialReceiveCmd)
		switch(gState) {

			case 'ready':
				clearTimeout(pingTimeout)
			break

			case 'Ping control M/B':
				clearTimeout(pingTimeout)
				clearTimeout(timeoutMenu)
				// console.log('Ping control M/B', serialReceiveCmd)
				pingData = serialReceiveCmd
				gStateLast = gState
				task('Ping show data')
			break 

			case 'fill-wait-press':
				// :DF,26:22:22,251021;
				const str = serialReceiveCmd.split(',')[2]
				const fillStartDate = str.substring(0, str.length - 1);
				const fillStartTimeArr = serialReceiveCmd.split(',')[1].split(':')
				const fillStartTime = fillStartTimeArr[2]+':'+fillStartTimeArr[1]+':'+fillStartTimeArr[0]

				transaction.fillStartStamp = new Date()
				transaction.fillStartDate = fillStartDate
				transaction.fillStartTime = fillStartTime

				switch(gStateLast) {
					case 'fill-full-ack':
						task('fill-full')
					break
					case 'fill-bath-ack':
						task('fill-bath')
					break
					case 'fill-litres-ack':
						task('fill-litres')
					break
				}
			break
			case 'fill-full':
			case 'fill-bath':
			case 'fill-litres':
				// :D9998.00,1.00,0,0,0,0,1.00,39:22:22,251021;
				const str1 = serialReceiveCmd.split(',')[0]
				const remainingPetrol = str1.substring(2, str1.length);
				const fillPetrol = serialReceiveCmd.split(',')[1]
				const putCoins = serialReceiveCmd.split(',')[2]
				const accumulatedCoins = serialReceiveCmd.split(',')[3]
				const putBanknotes = serialReceiveCmd.split(',')[4]
				const accumulatedBanknotes = serialReceiveCmd.split(',')[5]
				const accumulatedAmount = serialReceiveCmd.split(',')[6]

				const fillEndTimeArr = serialReceiveCmd.split(',')[7].split(':')
				const fillEndTime = fillEndTimeArr[2]+':'+fillEndTimeArr[1]+':'+fillEndTimeArr[0]

				const str2 = serialReceiveCmd.split(',')[8]
				const fillEndDate = str2.substring(0, str2.length - 1);
				
				transaction.remainingPetrol = remainingPetrol*1
				transaction.fillPetrol = fillPetrol*1
				transaction.putCoins = putCoins*1
				transaction.accumulatedCoins = accumulatedCoins*1
				transaction.putBanknotes = putBanknotes*1
				transaction.accumulatedBanknotes = accumulatedBanknotes*1
				transaction.accumulatedAmount = accumulatedAmount*1

				transaction.fillEndStamp = new Date()
				transaction.fillEndDate = fillEndDate
				transaction.fillEndTime = fillEndTime

				transaction.status = 'complete'

				gStateLast = gState
				task('fill-complete')

			break
		}

		serialReceiveCmd=''
	}

}


//======================== main task ===========================================================================
//======================== main task ===========================================================================
//======================== main task ===========================================================================

const task = state => {
	console.log(new Date().getTime(), 'task:', state)
	gState = state
	switch(state) {
		case 'init': 
			alert = {
				insertAt: new Date(),
				event: 'info',
				message: 'App restart'
			}
			// console.log(alert)
			nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

			var audio = player.play('./sound/bell.wav', function(err){
			  if (err) throw err
			})
			// audio.kill()

			// Init the lcd (must be done before calling any other methods)
			lcd.beginSync();
			// Clear any previously displayed content
			lcd.clearSync();
			// Display text multiline
			
			scanKeyInterval()		
			
			// task('init-rfid-0')

			lcd.printLineSync(0, ' Check Hardware ');
			lcd.printLineSync(1, '       ...      ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('init-rfid-0')
			}, 1*1000)

		break;

		case 'init-rfid-0':
			lcd.printLineSync(0, '   Check RFID   ');
			lcd.printLineSync(1, '       ...      ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('init-rfid')
			}, 1*1000)
		break;

		case 'init-rfid':
		{
			const err = rfidInit()
			if(err) {
				alert = {
					insertAt: new Date(),
					event: 'Check RFID',
					message: 'RFID Not Found'
				}
				// console.log(alert)
				nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
				  console.log(err, newDoc)
				});

				lcd.printLineSync(0, 'RFID Not Found  ');
				lcd.printLineSync(1, 'CHECK(*)        ');
				if(skipRFIDNotFound) lcd.printLineSync(1, 'CHECK(*) SKIP(#)');
				// clearTimeout(timeoutMenu)
				// timeoutMenu = setTimeout(()=>{
				// 	task('init-serial')
				// }, skipTimeoutCount*1000)
				return
			}

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('init-serial-0')
			}, 1*1000)
		}
		break;

		case 'init-serial-0':
			lcd.printLineSync(0, '  Check Serial  ');
			lcd.printLineSync(1, '      ...       ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('init-serial')
			}, 1*1000)
		break;

		case 'init-serial':  
		{
			const err = serialInit() 
			if(err) {
				alert = {
					insertAt: new Date(),
					event: 'Check Serial',
					message: 'Serial Not Found'
				}
				// console.log(alert)
				nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
				  console.log(err, newDoc)
				});

				lcd.printLineSync(0, 'Serial Not Found');
				lcd.printLineSync(1, 'CHECK(*)        ');
				if(skipSerialNotFound) lcd.printLineSync(1, 'CHECK(*) SKIP(#)');
				clearTimeout(timeoutMenu)
				// timeoutMenu = setTimeout(()=>{
				// 	task('ready')
				// }, 2*1000)
				return
			}
			
			lcd.printLineSync(0, '     Ready      ');
			lcd.printLineSync(1, '      ...       ');  
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 2*1000)
		}
		break;

		case 'ready':			
			password = ''
			userID = ''
			gTag = ''
			menuCount=0
			user=null

			maintenanceMode = false
			transaction = {}
			transaction.petrolPrice = price
			transaction.version = version
			transaction.vendingId = vendingId

			clearTimeout(timeoutMenu)

			if(readyPing) {
				serialReceiveACK = false
				serialTransmit('check_status_PING')		
				clearTimeout(pingTimeout)
				pingTimeout = setTimeout(()=>{
					task('ready-not-ping')
				}, pingTimeoutCount*1000)	
			}
			const dt = new Date();
			const d =  dt.getDate().toString().padStart(2, '0') +'/'+
			    (dt.getMonth()+1).toString().padStart(2, '0') + '   '+ //'/'+
			    // dt.getFullYear().toString().substr(-2) +' '+
			    dt.getHours().toString().padStart(2, '0') +':'+
			    dt.getMinutes().toString().padStart(2, '0') +':'+
			    dt.getSeconds().toString().padStart(2, '0')
			lcd.printLineSync(0, d);
			lcd.printLineSync(1, ' Key in or Tap  ');

			clearInterval(intervalMenu)
			intervalMenu = setInterval(() => {
				const dt = new Date();
				const d =  dt.getDate().toString().padStart(2, '0') +'/'+
				    (dt.getMonth()+1).toString().padStart(2, '0') + '   '+ //'/'+
				    // dt.getFullYear().toString().substr(-2) +' '+
				    dt.getHours().toString().padStart(2, '0') +':'+
				    dt.getMinutes().toString().padStart(2, '0') +':'+
				    dt.getSeconds().toString().padStart(2, '0')
				// console.log(d)

				lcd.printLineSync(0, d);
				lcd.printLineSync(1, ' Key in or Tap  ');
			}, 1*1000)
		break

		case 'ready-not-ping':
			alert = {
				insertAt: new Date(),
				event: 'ping',
				message: 'M/B not found'
			}
			// console.log(alert)
			nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

		  clearInterval(intervalMenu)
			lcd.printLineSync(0, 'M/B not found   '); 
			lcd.printLineSync(1, 'CHECK(*)        ');
		break;

		case 'ready-show-date':	
		{		
			const dt = new Date();
			const d =  dt.getDate().toString().padStart(2, '0') +'/'+
			    (dt.getMonth()+1).toString().padStart(2, '0') + '/'+ //'/'+
			    dt.getFullYear().toString()//.substr(-2) 

			const t = dt.getHours().toString().padStart(2, '0') +':'+
			    dt.getMinutes().toString().padStart(2, '0') +':'+
			    dt.getSeconds().toString().padStart(2, '0')

			lcd.printLineSync(0, '   '+d.padEnd(16,' '));
			lcd.printLineSync(1, '    '+t.padEnd(16,' '));

			clearInterval(intervalMenu)
			intervalMenu = setInterval(() => {
				const dt = new Date();
				const d =  dt.getDate().toString().padStart(2, '0') +'/'+
				    (dt.getMonth()+1).toString().padStart(2, '0') + '/'+ //'/'+
				    dt.getFullYear().toString()//.substr(-2) 

				const t = dt.getHours().toString().padStart(2, '0') +':'+
				    dt.getMinutes().toString().padStart(2, '0') +':'+
				    dt.getSeconds().toString().padStart(2, '0')

				lcd.printLineSync(0, '   '+d.padEnd(16,' '));
				lcd.printLineSync(1, '    '+t.padEnd(16,' '));
			}, 1*1000)

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, showTimeCount*1000)	

		}
		break

		case 'card-id':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Card> ' + gTag); // 3124006404
			lcd.printLineSync(1, 'EXIT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'user-id':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'User> '+userID.padStart(10, ' '));
			lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break; 


		// add user ============================================
		case 'addUserID':
		 	userIDAdd = ''
		 	passwordAdd = ''
		 	passwordAddAgain = ''
		 	gTag = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'UserID> '+userID.padStart(8, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'addPassword':
		 	passwordAdd = ''
		 	passwordAddAgain = ''
		 	gTag = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Pass> '+userID.padStart(10, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'addPasswordAgain':
		 	passwordAddAgain = ''
		 	gTag = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Again>'+userID.padStart(10, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break; 


		case 'changePassword':
		 	passwordChange = ''
		 	passwordChangeAgain = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Pass> '+passwordChange.padStart(10, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'changePasswordAgain':
		 	passwordChangeAgain = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Again>'+passwordChangeAgain.padStart(10, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break; 


		case 'addTag':
		 	gTag = ''

		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, ' Tap RFID card  ');
			lcd.printLineSync(1, 'MENU(*)  SKIP(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'addPasswordNotMatch':
		case 'changePasswordNotMatch':
		  clearInterval(intervalMenu)
		
			lcd.printLineSync(0, ' Pass not match ');
			lcd.printLineSync(1, 'BACK(*)  MENU(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break; 

		case 'changePasswordComplete':
		  clearInterval(intervalMenu)
		
			lcd.printLineSync(0, 'Change Passwd OK');
			lcd.printLineSync(1, '      ...       ');

			clearTimeout(timeoutMenu)
			clearTimeout(alertTimeoutCount)
			timeoutMenu = setTimeout(()=>{
				task('maintenance-menu')
			}, alertTimeoutCount*1000)	
 
			alert = {
				insertAt: new Date(),
				event: 'Change password',
				message: 'OK'
			}
			// console.log(alert)
			nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

			// update setting
			nedb.setting.update({ key: 'mainPassword' }, { $set: {value: passwordChangeAgain, updateBy: 'maintenance'} }, { upsert: true }, function (err, numReplaced) {
			  console.log(err, numReplaced)
			});

		break;

		case 'addCardId':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Tag> '+gTag.padStart(11, ' '));
			lcd.printLineSync(1, 'BACK(*)   ADD(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'addComplete':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, '  Add user OK   ');
			lcd.printLineSync(1, 'MENU(*)  HOME(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		// add user end ============================================


		case 'user-not-found':
			{
				let msg = ''
				if(userID) msg = 'userID:'+userID
				else if(gTag) msg = 'tag:'+gTag
				alert = {
					insertAt: new Date(),
					event: 'Check user',
					message: 'User not found '+msg
				}
				// console.log(alert)
				nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
				  console.log(err, newDoc)
				});
			}

		  clearInterval(intervalMenu)
			lcd.printLineSync(0, ' User not found ');
			lcd.printLineSync(1, '      ...       ');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 2*1000)	
		break;

		case 'password':		
		  clearInterval(intervalMenu)
	
			lcd.printLineSync(0, 'Pass>           ');
			lcd.printLineSync(1, 'EXIT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'timeout':
		  clearInterval(intervalMenu)
			lcd.printLineSync(0, '   Out of time  ');
			lcd.printLineSync(1, '      ...       ');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 2*1000)	
		break; 

		case 'auth':
		  clearInterval(intervalMenu)

			if(maintenanceMode) {
				// console.log('password =>', password)
				nedb.setting.findOne({key: 'mainPassword', value: password}, function (err, doc) {
			    console.log('err, doc =>', err, doc)
			    user = doc
			    if(!user) { 
	    		{
		    		let msg = ''
		    		msg='maintenanceMode'
		    		alert = {
							insertAt: new Date(),
							event: 'Check Password',
							message: 'Password incorrect '+ msg
						}
						// console.log(alert)
						nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
						  console.log(err, newDoc)
						});
					}

					lcd.printLineSync(0, '   Password     ');
					lcd.printLineSync(1, '  incorrect!    ');

					clearTimeout(timeoutMenu)
					setTimeout(()=>{
						task('ready')
					}, 2*1000)	
					return			
				}
				return task('maintenance-menu')
			  });
			}
			else {
				console.log('======= user', user)
				const hash = user.password
			  bcrypt.compare(password, hash, function(err, res) {
		      if(!res) { 
		    		{
			    		let msg = ''
			    		if(gTag) msg='tag:'+gTag
							else if(userID) msg='userID:'+userID
			    		alert = {
								insertAt: new Date(),
								event: 'Check Password',
								message: 'Password incorrect '+ msg
							}
							// console.log(alert)
							nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
							  console.log(err, newDoc)
							});
						}

						lcd.printLineSync(0, '   Password     ');
						lcd.printLineSync(1, '  incorrect!    ');

						clearTimeout(timeoutMenu)
						setTimeout(()=>{
							task('ready')
						}, 2*1000)	
						return			
					}
					task('validation-to')
		    }); 
			}

		break; 

		case 'validation-to':
			lcd.printLineSync(0, '   Validation?  ');
			lcd.printLineSync(1, 'OK(*)    SKIP(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'validation-process':
			lcd.printLineSync(0, '   Validation   ');
			lcd.printLineSync(1, '>>  Process   <<');
			intervalMenu = setInterval(() => {
				if(blink) {
					blink=false
					lcd.printLineSync(1, '>>  Process   <<');
				}
				else {
					blink=true
					lcd.printLineSync(1, ' >> Process  << ');
				}
				
			}, 1*1000)
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'fill-select': 
			lcd.printLineSync(0, '   How to pay?  ');
			lcd.printLineSync(1, 'B(1)  L(2)  F(3)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'fill-full-confirm': 
			lcd.printLineSync(0, ' Fill to full?  ');
			lcd.printLineSync(1, 'NO(*)     YES(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'fill-full':
			gStateLast = gState
			fillTimeoutNow = fillTimeoutCount

			--fillTimeoutNow
			lcd.printLineSync(0, '  Fill to full  ');
			// lcd.printLineSync(1, '>>  Process   <<');		
			lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );	

			intervalMenu = setInterval(() => {
				--fillTimeoutNow
				if(blink) {
					blink=false
					// lcd.printLineSync(1, '>>  Process   <<');
					lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );
				}
				else {
					blink=true
					// lcd.printLineSync(1, ' >> Process  << ');
					lcd.printLineSync(1, (' > Process '+fillTimeoutNow).padEnd(14,' ')+' >' );
				}
				
			}, 1*1000)

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('fill-timeout')
			}, fillTimeoutCount*1000)	
		break;

		case 'fill-bath-select':
			bathText = ''
			lcd.printLineSync(0, 'Amount> '+bathText.padStart(8, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'fill-bath-confirm': 
			clearInterval(intervalMenu)
			lcd.printLineSync(0, 'Fill '+bathText.padStart(4, ' ')+' Bath? ');
			lcd.printLineSync(1, 'NO(*)     YES(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'fill-bath':
			gStateLast = gState
			fillTimeoutNow = fillTimeoutCount

			--fillTimeoutNow
			lcd.printLineSync(0, ' Fill '+bathText.padStart(4, ' ')+' Bath ');
			lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );	

			intervalMenu = setInterval(() => {
				--fillTimeoutNow
				if(blink) {
					blink=false
					// lcd.printLineSync(1, '>>  Process   <<');
					lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );
				}
				else {
					blink=true
					// lcd.printLineSync(1, ' >> Process  << ');
					lcd.printLineSync(1, (' > Process '+fillTimeoutNow).padEnd(14,' ')+' >' );
				}
				
			}, 1*1000)

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('fill-timeout')
			}, fillTimeoutCount*1000)	
		break;

		case 'fill-litres-select':
			bathText = ''
			litresText = ''
			lcd.printLineSync(0, 'Litres> '+litresText.padStart(8, ' '));
			lcd.printLineSync(1, 'BACK(*)    OK(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'fill-litres-confirm': 
			clearInterval(intervalMenu)
			lcd.printLineSync(0, 'Fill '+litresText.padStart(3, ' ')+' Litres?');
			lcd.printLineSync(1, 'NO(*)     YES(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'fill-litres':
			gStateLast = gState
			fillTimeoutNow = fillTimeoutCount

			--fillTimeoutNow
			lcd.printLineSync(0, 'Fill '+litresText.padStart(3, ' ')+' Litres ');
			lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );	

			intervalMenu = setInterval(() => {
				--fillTimeoutNow
				if(blink) {
					blink=false
					// lcd.printLineSync(1, '>>  Process   <<');
					lcd.printLineSync(1, ('>  Process '+fillTimeoutNow).padEnd(14,' ')+'> ' );
				}
				else {
					blink=true
					// lcd.printLineSync(1, ' >> Process  << ');
					lcd.printLineSync(1, (' > Process '+fillTimeoutNow).padEnd(14,' ')+' >' );
				}
				
			}, 1*1000)

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('fill-timeout')
			}, fillTimeoutCount*1000)	
		break;

		case 'fill-timeout':
			transaction.status = 'error'
			transaction.detail = 'Fill not stop'
			if(gStateLast==='fill-full-ack' ||
				gStateLast==='fill-bath-ack' ||
				gStateLast==='fill-litres-ack') transaction.detail = 'Not ACK'
			if(gStateLast==='fill-wait-press') transaction.detail = 'Not start fill'

			console.log(gState, 'transaction =>', transaction)
			nedb.orders.insert(transaction, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

			clearInterval(intervalMenu)
			lcd.printLineSync(0, '  Fill Timeout  ');
			lcd.printLineSync(1, 'RESET(*) SKIP(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, menuTimeoutCount*1000)	
			// log to database
		break;

		case 'fill-error':
			console.log(gState, 'transaction =>', transaction)
			nedb.orders.insert(transaction, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

			clearInterval(intervalMenu)
			lcd.printLineSync(0, '   Fill Error   ');
			lcd.printLineSync(1, 'RESET(*) SKIP(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, menuTimeoutCount*1000)	
			// log to database
		break;

		case 'fill-wait-press':			
			clearInterval(intervalMenu)
			lcd.printLineSync(0, '   Wait press   ');
			lcd.printLineSync(1, '   Fuel nozzle  ');
			// lcd.printLineSync(1, '           OK(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				gStateLast = gState
				task('fill-timeout')
			}, fillTimeoutCount*1000)	
		break;

		case 'fill-complete':
			console.log(gState, 'transaction =>', transaction)
			nedb.orders.insert(transaction, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

			clearInterval(intervalMenu)
			lcd.printLineSync(0, ' Fill complete  ');
			lcd.printLineSync(1, '                ');
			// lcd.printLineSync(1, '           OK(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, alertTimeoutCount*1000)	
		break;

		case 'fill-full-ack':
		case 'fill-bath-ack':
		case 'fill-litres-ack':
			serialReceiveACK = true
			serialTransmit('sale_by_member_debit_money')

			clearInterval(intervalMenu)
			lcd.printLineSync(0, '   Please wait  ');
			lcd.printLineSync(1, '       ...      ');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('fill-timeout')
			}, fillTimeoutCount*1000)	
		break;

		case 'done':
			clearInterval(intervalMenu)
			lcd.printLineSync(0, '      Done      ');
			lcd.printLineSync(1, '                ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, alertTimeoutCount*1000)	
		break;

		case 'Setting is ok':
			clearInterval(intervalMenu)
			lcd.printLineSync(0, ' Setting is ok  ');
			lcd.printLineSync(1, 'BACK(*)  MENU(#)');
			if(gStateLast==='Set fuel price') lcd.printLineSync(1, 'BACK(*) RESET(#)');
			clearTimeout(pingTimeout)
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, menuTimeoutCount*1000)	
		break;

		case 'Not respond':
			alert = {
				insertAt: new Date(),
				event: gStateLast,
				message: 'Not respond'
			}
			// console.log(alert)
			nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

		  clearInterval(intervalMenu)
			lcd.printLineSync(0, '  Not respond   '); 
			lcd.printLineSync(1, 'BACK(*)  MENU(#)');

			clearTimeout(pingTimeout)
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, menuTimeoutCount*1000)	
		break;

		case 'Error respond':
			alert = {
				insertAt: new Date(),
				event: gStateLast,
				message: 'Error respond'
			}
			// console.log(alert)
			nedb.alerts.insert(alert, function (err, newDoc) {   // Callback is optional
			  console.log(err, newDoc)
			});

		  clearInterval(intervalMenu)
			lcd.printLineSync(0, '  Error respond '); 
			lcd.printLineSync(1, 'BACK(*)  MENU(#)');

			clearTimeout(pingTimeout)
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, menuTimeoutCount*1000)	
		break;

		case 'maintenance-to': 
			clearInterval(intervalMenu)

			lcd.printLineSync(0, 'To Maintenance? ');
			lcd.printLineSync(1, 'EXIT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'maintenance-menu': 
			// menuCount=0
			lcd.printLineSync(0, maintenanceMenu[menuCount].padEnd(16, ' '));
			// lcd.printLineSync(1, 'NO(*)     YES(#)');
			lcd.printLineSync(1, 'DOWN(* UP(7 OK(#');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;
		case 'Reboot': 
			clearInterval(intervalMenu)
			lcd.printLineSync(0, ' Reboot Machine?');
			lcd.printLineSync(1, 'NO(*)     YES(#)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break; 
		case 'Set fuel price': 
			priceText = price+''
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Price> '+priceText.padStart(5, ' ') + '    ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = priceText.substring(0, index) + '_' + priceText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = priceText
					blink = true
				}
				lcd.printLineSync(0, 'Price> '+lcdShow.padStart(5, ' ') + '    ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break; 

		case 'Set flow sensor': 
			flowSensorText = (flowSensor+'').padStart(5, '0')
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Flow Sen> '+flowSensorText.padStart(5, ' ') + '    ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				// console.log('.')
				let lcdShow = ''			
				if(blink) {
					lcdShow = flowSensorText.substring(0, index) + '_' + flowSensorText.substring(index + 1)
					blink = false
					// console.log('x')
				}
				else {
					lcdShow = flowSensorText
					blink = true
					// console.log('o')
				}
				lcd.printLineSync(0, 'Flow Sen> '+lcdShow.padStart(5, ' ') + '    ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break;

		case 'Reset full tank':  
			fullTankText = (fullTank+'').padStart(4, '0')
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Full> '+fullTankText.padStart(4, ' ') + '         ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = fullTankText.substring(0, index) + '_' + fullTankText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = fullTankText
					blink = true
				}
				lcd.printLineSync(0, 'Full> '+lcdShow.padStart(4, ' ') + '         ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break; 

		case 'Set min price':  
			minPriceText = (minPrice+'').padStart(2, '0')
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Min price> '+minPriceText.padStart(2, ' ') + '             ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = minPriceText.substring(0, index) + '_' + minPriceText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = minPriceText
					blink = true
				}
				lcd.printLineSync(0, 'Min price> '+lcdShow.padStart(2, ' ') + '             ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break; 

		case 'Play sound':  
			playSoundText = (playSound+'').padStart(2, '0')
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Play sound> '+playSoundText.padStart(2, ' ') + '             ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = playSoundText.substring(0, index) + '_' + playSoundText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = playSoundText
					blink = true
				}
				lcd.printLineSync(0, 'Play sound> '+lcdShow.padStart(2, ' ') + '             ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break; 

		case 'Set K dispenser':  
			kDispenserText = (kDispenser+'').padStart(2, '0')
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'K dispenser> '+kDispenserText.padStart(2, ' ') + '             ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = kDispenserText.substring(0, index) + '_' + kDispenserText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = kDispenserText
					blink = true
				}
				lcd.printLineSync(0, 'K dispenser> '+lcdShow.padStart(2, ' ') + '             ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break; 

		case 'Set K Liter':  
			kLiterText = kLiter
			// console.log('========kLiter',kLiter)
			digiCount=0; index=0
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'K Liter> '+kLiterText.padStart(7, ' ') + '     ');
			lcd.printLineSync(1, 'BACK(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''			
				if(blink) {
					lcdShow = kLiterText.substring(0, index) + '_' + kLiterText.substring(index + 1)
					blink = false
				}
				else {
					lcdShow = kLiterText
					blink = true
				}
				lcd.printLineSync(0, 'K Liter> '+lcdShow.padStart(7, ' ') + '     ');
				lcd.printLineSync(1, 'BACK(*)    OK(#)');	
			}, 500)
		break;

		case 'Set fuel type':
			cmdFuelTypeBuf = cmdFuelType
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Set fuel type> '+cmdFuelTypeBuf);
			lcd.printLineSync(1, '1(D) 2(G)  OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break  

		case 'Ping show data':
			// :DP9999.00,65,110,1.00,00,15:28:05,100300;
			index = 0
			pingDataArr = pingData.split(',')

			if(pingDataArr.length!=7) {
				console.log('pingDataArr.length!=7', pingDataArr)
				return task('Error respond')
			}

			const TimeArr = pingDataArr[5].split(':')
			const Time = TimeArr[2]+':'+TimeArr[1]+':'+TimeArr[0] 
			pingDataArr[0] = pingDataArr[0].substring(3, pingDataArr.length);		
			pingDataArr[5] = Time	
			pingDataArr[6] = pingDataArr[6].substring(0, pingDataArr.length-1);
			console.log('pingDataArr', pingDataArr)

			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, '   Ping data    ');
			lcd.printLineSync(1, 'BACK(*)  NEXT(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'Set date time': 	
			setDate = true
			digiCount = 0
			index = 0
			dateText =''
			timeText=''

			const dtNow = new Date();
			dateText =  dtNow.getDate().toString().padStart(2, '0') +'/'+
			    (dtNow.getMonth()+1).toString().padStart(2, '0') + '/'+
			    dtNow.getFullYear().toString()//.substr(-2) 
			timeText = dtNow.getHours().toString().padStart(2, '0') +':'+
			    dtNow.getMinutes().toString().padStart(2, '0') +':'+
			    dtNow.getSeconds().toString().padStart(2, '0')

			lcd.printLineSync(0, 'DATE> '+dateText);
			lcd.printLineSync(1, 'TIME(*)  SAVE(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	

			clearInterval(intervalMenu)
			intervalMenu = setInterval (()=>{
				let lcdShow = ''
				if(setDate) {					
					if(blink) {
						lcdShow = dateText.substring(0, index) + '_' + dateText.substring(index + 1)
						blink = false
					}
					else {
						lcdShow = dateText
						blink = true
					}
					lcd.printLineSync(0, 'DATE> '+lcdShow);
					lcd.printLineSync(1, 'TIME(*)  SAVE(#)');
				}
				else {
					if(blink) {
						lcdShow = timeText.substring(0, index) + '_' + timeText.substring(index + 1)
						blink = false
					}
					else {
						lcdShow = timeText
						blink = true
					}
					lcd.printLineSync(0, 'TIME>   '+lcdShow);
					lcd.printLineSync(1, 'DATE(*)  SAVE(#)');
				}
			}, 500)

		break;

		case 'System error':
			clearInterval(intervalMenu)
			lcd.printLineSync(0, '  System error  ');
			lcd.printLineSync(1, '                ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, alertTimeoutCount*1000)	
		break;

	}
}

task('init')