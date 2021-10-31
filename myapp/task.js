const config = require('config');
const player = require('play-sound')(opts = {})

//======================== variable
let gState = 'init'
let gStateLast = ''
let gTag = ''
let userID = ''
let password = ''

let intervalMenu
let timeoutMenu
let pingTimeout

const menuTimeoutCount = config.get('timeoutCount.menu');
const fillTimeoutCount = config.get('timeoutCount.fill');
const alertTimeoutCount = config.get('timeoutCount.alert');
const skipTimeoutCount = config.get('timeoutCount.skip');
const pingTimeoutCount = config.get('timeoutCount.ping');
const showTimeCount = config.get('timeoutCount.show');

let bathText=''
let litresText=''
let maintenanceMode=false
let blink=false

let priceText=''

let dateText=''
let timeText=''
let digiCount=0
let setDate=true
let index=0

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
	reset_fuel_tank_to_full: '06200', //200=liters
	Set_minimum_price: 		'08', // YY 
	clear_stored_amount: 	'0A', // XXXX (password)
	sale_by_member_debit_money: 	'0B', // XXXXmmmm
	set_value_of_K_of_dispenser: 	'0C', // YY (0_50)
	set_value_of_K_of_Liter_range:'0D', // LLLKKKK
	check_status_PING: '0E', //Null
}

const maintenanceMenu = [
	'Set oil price',
	'Set date time',
	'Add users',
	'Test control M/B',
	'Ping control M/B',
	'Tank volume',
	'Flow K volume',
	'Clear/reset',
	'Reboot',
	'Exit',
]
let menuCount=0


// test data ===================================
// test user rfid
const users = config.get('test.users');
// const users = [ 
//   {tag: '0443770628', name: 'Jone', userID: '1122334455', password:'1234'},
//   {tag: '', name: 'Admin', userID: '1234', password:'4321', maintenance:true},
// ]

const readyPing = config.get('readyPing');
const skipRFIDNotFound = config.get('skipRFIDNotFound');
const skipSerialNotFound = config.get('skipSerialNotFound');

// read from database
let orderID = 0 
let cmdFuelType="D"
let mbPassword = config.get('mbPassword');
let price = config.get('price');
let version = config.get('version');
let vendingId = config.get('vendingId');



//======================== lcd
const LCD = require('raspberrypi-liquid-crystal');
// Instantiate the LCD object on bus 1 address 3f with 16 chars width and 2 lines
const lcd = new LCD(1, 0x27, 16, 2);

//======================== rfid
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
	    return
	  } 
	  const keyCode = event_codes.find(({code}) => code === ev.code )
	  // console.log(ev.code, keyCode.key)
	  tag += keyCode.key
	});
}

//======================== keypad
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
				{
					const user =  users.find((u) => (u.tag === gTag)  )
					if(user) { 
						transaction.insertAt = new Date()
						transaction.tag = gTag
						return task('password'); 
					}
					task('user-not-found');
				} 
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
				{
					if(!userID.length) return
					const user =  users.find((u) => (u.userID === userID) )
					if(user) {
						transaction.insertAt = new Date()
						transaction.userID = userID
						return task('password');
					}
					return task('user-not-found'); 
				}
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

			let passwordStart = ''
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
				case '*': return task('fill-select'); break;
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
				case '*': return task('fill-select'); break;
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
				case '*': return task('fill-select'); break;
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
				case '*': if(++menuCount >= maintenanceMenu.length) menuCount=0; break;
				case '#': 
					switch(maintenanceMenu[menuCount]) {
						case 'Set oil price': return task('Set-oil-price'); break;
						case 'Set date time': return task('Set-date-time'); break;
						case 'Add users': return task('Add users'); break;
						case 'Test control M/B': return task('Test-control-M/B'); break;
						case 'Ping control M/B': return task('Ping-control-M/B'); break;
						case 'Tank volume': return task('Tank-volume'); break;
						case 'Flow K volume': return task('Flow-K-volume'); break;
						case 'Clear/reset': return task('Clear/reset'); break;
						case 'Reboot': return task('Reboot'); break;
						case 'Exit': return task('ready'); break;
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

		case 'Set-oil-price':
			switch(key) {
				case '*': 
					if(priceText.length) priceText = priceText.slice(0, -1); 
					else return task('ready'); 
				break;
				case '#': 
					if(priceText.length) {
						price = priceText*1
						console.log('price', price)
						return task('done'); 
					}
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					if(priceText.length<2) priceText += key
				break;
			}

			lcd.printLineSync(0, 'Price/Litres> '+priceText.padStart(2, ' '));
			if(!priceText.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('timeout')
			}, menuTimeoutCount*1000)	
		break

		case 'Reboot': 
			switch(key) {
				case '*': return task('maintenance-menu'); break;
				case '#': 
					console.log('Reboot')
					lcd.printLineSync(0, '   Reboot now   ');
					lcd.printLineSync(1, '       ...      ');
					timeoutMenu = setTimeout(()=>{
						var exec = require('child_process').exec;
						exec('sudo reboot', function(error, stdout, stderr){ 
							console.log('Reboot:',error, stdout, stderr)
						});
					}, 1*1000)	
				break;
			}			
		break;

		case 'Set-date-time':
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
					const dateSet = dateArr[2]+'-'+dateArr[1]+'-'+dateArr[0]+' '+timeText
					console.log('dateSet', dateSet)
					{
					var exec = require('child_process').exec; 
					exec('sudo timedatectl set-ntp false', function(error, stdout, stderr){ 
						console.log('set-ntp false:',error, stdout, stderr)
						exec('sudo timedatectl set-time "'+dateSet+'"', function(error, stdout, stderr){ 
							console.log('set-time:',error, stdout, stderr)
							// return task('done');
						});
					});
					}
					return task('done');
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
		case 'sale_by_member_debit_money':
			// orderIDtext = (++orderID).toString().padStart(4, '0')
			switch(gState) {
				case 'fill-full-ack':
					transaction.orderType = 'full'
					cmdNow = cmd.start + cmdFuelType + cmd.sale_by_member_debit_money + 
						mbPassword + 'FULL' + cmd.end			
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
					transaction.amount = bathText*1
					transaction.orderType = 'quantity'
					console.log('price, litresText, bathText =>', price, litresText, bathText)
					cmdNow = cmd.start + cmdFuelType + cmd.sale_by_member_debit_money + 
						mbPassword + bathText + cmd.end			
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
	// console.log('serialReceiveCmd bufChar =>', bufChar)
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
			}
		}
		else {
			switch(gState) {
				case 'fill-full-ack':
				case 'fill-bath-ack':
				case 'fill-litres-ack':					
					transaction.status = 'error'
					transaction.detail = 'Return FF'
					task('fill-error')
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
		console.log('serialReceiveCmd =>', serialReceiveCmd)
		switch(gState) {

			case 'ready':
				clearTimeout(pingTimeout)
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
					action: 'Check RFID',
					mesage: 'RFID Not Found'
				}
				console.log(alert)

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
					action: 'Check Serial',
					mesage: 'Serial Not Found'
				}
				console.log(alert)

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
				action: 'ping',
				mesage: 'M/B not found'
			}
			console.log(alert)

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

		case 'user-not-found':
			{
				let msg = ''
				if(userID) msg = 'userID:'+userID
				else if(gTag) msg = 'tag:'+gTag
				alert = {
					insertAt: new Date(),
					action: 'Check user',
					mesage: 'User not found '+msg
				}
				console.log(alert)
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
		  
		  let user = null
			if(gTag) user =  users.find((u) => (u.tag===gTag) && (u.password===password) )
			else if(userID) user =  users.find((u) => (u.userID===userID) && (u.password===password) )
			else if(maintenanceMode) user =  users.find((u) => (u.maintenance===true) && (u.password===password) )
				
    	if(!user) {
    		{
	    		let msg = ''
	    		if(gTag) msg='tag:'+tag
					else if(userID) msg='userID:'+userID
					else if(maintenanceMode) msg='maintenanceMode'
	    		alert = {
						insertAt: new Date(),
						action: 'Check Password',
						mesage: 'Password incorrect '+ msg
					}
					console.log(alert)
				}

				lcd.printLineSync(0, '   Password     ');
				lcd.printLineSync(1, '  incorrect!    ');

				clearTimeout(timeoutMenu)
				setTimeout(()=>{
					task('ready')
				}, 2*1000)	
				return			
			}
			if(maintenanceMode) return task('maintenance-menu')
			task('validation-to')
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
			lcd.printLineSync(0, '  Fill to full  ');
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
			lcd.printLineSync(0, ' Fill '+bathText.padStart(4, ' ')+' Bath ');
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
			lcd.printLineSync(0, 'Fill '+litresText.padStart(3, ' ')+' Litres ');
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
			menuCount=0
			lcd.printLineSync(0, maintenanceMenu[menuCount].padEnd(16, ' '));
			lcd.printLineSync(1, 'NEXT(*)    OK(#)');

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
		case 'Set-oil-price': 
			priceText = price+''
			clearInterval(intervalMenu)
			
			lcd.printLineSync(0, 'Price/Litres> '+priceText.padStart(2, ' '));
			if(!priceText.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, menuTimeoutCount*1000)	
		break;

		case 'Set-date-time': 	
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

	}
}

task('init')