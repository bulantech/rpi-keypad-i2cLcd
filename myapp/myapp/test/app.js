const SerialPort = require('serialport')
const port = new SerialPort('/dev/ttyUSB1', {
  baudRate: 9600,
})

const byteParser = new SerialPort.parsers.ByteLength({ length: 1 })
port.pipe(byteParser)

// port.write('main screen turn on', function(err) {
//   if (err) {
//     return console.log('Error on write: ', err.message)
//   }
//   console.log('message written')
//   setInterval(()=> port.write('Hello USB1'),3000)
// })

// Open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message)
})

// The open event is always emitted
port.on('open', function() {
  console.log('Port open')
})

// Switches the port into "flowing mode"
port.on('data', function (data) {
  console.log('Data:', data)
})

port.on('close', () => {
  console.log('Serial port disconnected.')
})

/**
 * listen to the bytes as they are parsed from the parser.
 */
byteParser.on('data', data => {
  console.log('byteParser data:', data, data.toString())
  serialReceive(data)
})

let serialReceiveCmd=''
const serialReceive = (buf) => {
  const bufChar = buf.toString()

  if(bufChar===':') return serialReceiveCmd = ':'
  serialReceiveCmd += bufChar
  if(bufChar===';') { //ping
    console.log('serialReceiveCmd =>', serialReceiveCmd)
    if(serialReceiveCmd === ':D0E;') {
      const data = ':DP9000,0,0,20.10,1888,58,29,15,08,04,21;'
      port.write(data)
      console.log('send =>', data)
    }
  }
}


const readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var recursiveAsyncReadLine = () => {
  rl.question(`
--------------------------------------------------------
  1) Check Balance
  2) Set_date_time:  '01', // YYMMDDHHMMSS
  3) Set_fuel_price: '02', // ffff.ff
  4) Play_sound:     '03', // XX
  5) Set_flow_sensor:'04', // XXXXX
  6) Set_fuel_type:  '05', // Y (D/G)
  7) reset_fuel_tank_to_full: '06200', //200=liters
  8) Set_minimum_price:    '08', // YY 
  9) clear_stored_amount:  '0A', // XXXX (password)
  a) sale_by_member_debit_money:   '0B', // XXXXmmmm
  b) set_value_of_K_of_dispenser:  '0C', // YY (0_50)
  c) set_value_of_K_of_Liter_range:'0D', // LLLKKKK
  d) check_status_PING: '0E', //Null
--------------------------------------------------------\n`, (answer) => {
    switch (answer) {
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "a": //sale
        port.write(':D190.50,1.25,10,1210,20,5215,6425,2304211613;')
      break;
      case "b":
      case "c":
      case "d": //ping
        port.write(':DP9000,0,0,20.10,1888,58,29,15,08,04,21;')
      break 
      

    }
    recursiveAsyncReadLine()
  })
}

recursiveAsyncReadLine()
