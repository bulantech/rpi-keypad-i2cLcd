//======================== variable
let gState = 'init'
let gTag = ''
let intervalMenu
let timeoutMenu
let bathText=''

// test user rfid
const users = [ 
  {tag: '0443770628', name: 'Jone'},
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
			task('auth')
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

const keypadC1 = new Gpio(21, 'in', 'falling', {debounceTimeout: 10});
const keypadC2 = new Gpio(20, 'in', 'falling', {debounceTimeout: 10});
const keypadC3 = new Gpio(16, 'in', 'falling', {debounceTimeout: 10});

let scanRow = 0
const keys = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['*','0','#'],
]

keypadC1.watch((err, value) => {
  if (err) {
    throw err;
  }
  // console.log('keypad C1')
  checkKey(0)
});

keypadC2.watch((err, value) => {
  if (err) {
    throw err;
  }
  checkKey(1)
});

keypadC3.watch((err, value) => {
  if (err) {
    throw err;
  }
  checkKey(2)
});

const checkKey = (col) => {
  console.log('Key:', keys[scanRow][col], new Date().getTime())
  const key = keys[scanRow][col]
	switch(gState) {
		case 'refuel-select':
			switch(key) {
				case '1': task('refuel-full'); break;
				case '2': task('refuel-bath-select'); break;
				case '3': task('refuel-lite-select'); break;
			}
		break
		case 'refuel-bath-select':
			switch(key) {
				case '*': bathText = bathText.slice(0, -1); break;
				case '#': task('refuel-bath'); break;
				case '1':case '2':case '3':case '4':case '5':
				case '6':case '7':case '8':case '9':case '0': 
					bathText += key 
				break;
			}
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 10*1000)	
		break
	}
}

const scanInterval = setInterval(function(){ 
  // console.log('scanRow:', scanRow)
  if(++scanRow >= 4) scanRow = 0; 

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
}, 50);


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
			// lcd.printLineSync(1, '                ');
			task('ready')
		break;

		case 'ready':
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
				lcd.printLineSync(1, 'Plese tap card  ');
			}, 1000)
		break

		case 'auth':
		  clearInterval(intervalMenu)
			const user =  users.find((u) => u.tag === gTag )
			// console.log(users, user, tag)
			gtag = ''
    	if(!user) {
    		console.log('User not found!!')
				lcd.printLineSync(0, 'Authentication  ');
				lcd.printLineSync(1, 'incorrect       ');
				setTimeout(()=>{
					task('ready')
				}, 3000)	
				return			
			}
			task('refuel-select')
		break;

		case 'refuel-select': 
			lcd.printLineSync(0, '1)Full          ');
			lcd.printLineSync(1, '2)Bath    3)Lite');
			timeoutMenu = setTimeout(()=>{
				task('ready')
			}, 5*1000)	
		break;

		case 'refuel-full':
			lcd.printLineSync(0, 'Refuel Full     ');
			lcd.printLineSync(1, 'Wait a moment...');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('refuel-complete')
			}, 5*1000)	
		break;
		case 'refuel-bath-select':
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
		case 'refuel-bath':
			clearInterval(intervalMenu)
			lcd.clearSync();
			lcd.printLineSync(0, 'Refuel '+bathText+' Bath  ');
			lcd.printLineSync(1, 'Wait a moment...');
			clearTimeout(timeoutMenu)
			timeoutMenu = setTimeout(()=>{
				task('refuel-complete')
			}, 5*1000)	
		break;
		case 'refuel-complete':
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