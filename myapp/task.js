//======================== variable
let gState = 'init'
let gTag = ''
let userId = ''
let password = ''
let intervalMenu
let timeoutMenu
let bathText=''
let maintenanceMode=false
let blink=false

// test user rfid
const users = [ 
  {tag: '0443770628', name: 'Jone', userId: '1122334455', password:'1234'},
  {tag: '', name: 'Admin', userId: '123456', password:'4321', maintenance:true},
]

//======================== lcd
const LCD = require('raspberrypi-liquid-crystal');
// Instantiate the LCD object on bus 1 address 3f with 16 chars width and 2 lines
const lcd = new LCD(1, 0x27, 16, 2);

//======================== rfid
const InputEvent = require('input-event');
const input = new InputEvent('/dev/input/event0');
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

	switch(gState) {

		case 'ready':
			switch(key) {
				case '*': return task('maintenance-to'); break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					userId += key; return task('user-id');
				break;
			}
		break

		case 'card-id':
			switch(key) {
				case '*': task('ready'); break;
				case '#': 
				{
					const user =  users.find((u) => (u.tag === gTag)  )
					if(user) return task('password');
					task('user-not-found');
				} 
				break;				
			}
		break

		case 'user-id':
			switch(key) {
				case '*':  
					if(userId.length) userId = userId.slice(0, -1); 
					else return task('ready');
				break;
				case '#': 
				{
					const user =  users.find((u) => (u.userId === userId) )
					if(user) return task('password');
					return task('user-not-found'); 
				}
				break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
				 	userId += key				 	
				break;
			}

			lcd.printLineSync(0, 'User> '+userId.padStart(10, ' '));
			if(!userId.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)
		break

		case 'password':
			switch(key) {
				case '*': 
					if(password.length) password = password.slice(0, -1); 
					else return task('ready'); 
				break;
				case '#': return task('auth'); break;
				case '1': case '2': case '3': case '4': case '5': 
				case '6': case '7': case '8': case '9': case '0': 
					password += key
				break;
			}

			lcd.printLineSync(0, 'Pass> '+password.padStart(10, ' '));
			if(!password.length) lcd.printLineSync(1, 'EXIT(*)    OK(#)');
			else lcd.printLineSync(1, 'CLEAR(*)   OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 30*1000)	
		break 

		case 'validation-to':
			switch(key) {
				case '*': return task('fill-select'); break;
				case '#': return task('validation-process'); break;
			}
		break

		case 'maintenance-to':
			switch(key) {
				case '*': return task('ready'); break;
				case '#': maintenanceMode=true; return task('maintenance-menu'); break;
			}
		break

		case 'fill-select':
			switch(key) {
				case '1': task('fill-bath-select'); break;
				case '2': task('fill-lite-select'); break;
				case '3': task('fill-full'); break;
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


//======================== main task

const task = state => {
	console.log('task:', state)
	gState = state
	switch(state) {
		case 'init':
			// Init the lcd (must be done before calling any other methods)
			lcd.beginSync();
			// Clear any previously displayed content
			lcd.clearSync();
			// Display text multiline
			lcd.printLineSync(0, 'init...         ');
			lcd.printLineSync(1, '                ');

			scanKeyInterval()

			task('ready')
		break;

		case 'ready':			
			password = ''
			userId = ''
			gTag = ''
			maintenanceMode = false

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
				lcd.printLineSync(1, '> Keyin or Tap <');
			}, 1000)
		break

		case 'card-id':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'Card> ' + gTag); // 3124006404
			lcd.printLineSync(1, 'EXIT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'user-id':
		  clearInterval(intervalMenu)

			// console.log(users, user, tag)			
			lcd.printLineSync(0, 'User> '+userId.padStart(10, ' '));
			lcd.printLineSync(1, 'CLEAR(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'user-not-found':
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
			}, 30*1000)	
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
			else if(userId) user =  users.find((u) => (u.userId===userId) && (u.password===password) )
    	if(!user) {
				lcd.printLineSync(0, '   Password     ');
				lcd.printLineSync(1, '  incorrect!    ');

				clearTimeout(timeoutMenu)
				setTimeout(()=>{
					task('ready')
				}, 2*1000)	
				return			
			}
			task('validation-to')
		break; 

		case 'validation-to':
			lcd.printLineSync(0, '  validation ?  ');
			lcd.printLineSync(1, 'SKIP(*)    OK(#)');
			
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'validation-process':
			lcd.printLineSync(0, '   validation   ');
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
			}, 10*1000)	
		break;
		
		case 'maintenance-to': 
			clearInterval(intervalMenu)

			lcd.printLineSync(0, 'To Maintenance? ');
			lcd.printLineSync(1, 'EXIT(*)    OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'maintenance-menu': 
			lcd.printLineSync(0, '1) Set time     ');
			lcd.printLineSync(1, '<(3) >(6)  OK(#)');

			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'fill-select': 
			lcd.printLineSync(0, '   How to pay?  ');
			lcd.printLineSync(1, 'B(1)  L(2)  F(3)');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('timeout')
			}, 10*1000)	
		break;

		case 'fill-full':
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
				task('fill-complete')
			}, 10*1000)	
		break;
		case 'fill-bath-select':
			lcd.clearSync();
			bathText = ''
			intervalMenu = setInterval(() => {
				lcd.printLineSync(0, 'Enter Bath?     ');
				lcd.printLineSync(1, bathText.padStart(16, ' '));
			}, 500)
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{				
				task('ready')
			}, 10*1000)	
		break;
		case 'fill-bath':
			clearInterval(intervalMenu)
			lcd.clearSync();
			lcd.printLineSync(0, 'Refuel '+bathText+' Bath  ');
			lcd.printLineSync(1, 'Wait a moment...');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('fill-complete')
			}, 5*1000)	
		break;
		case 'fill-complete':
			lcd.printLineSync(0, 'Refuel complete ');
			lcd.printLineSync(1, '                ');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 3*1000)	
		break;

	}
}

task('init')