
/* Create a WiFi access point and provide a web server on it. */

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <SimpleCLI.h>


//#ifndef APSSID
#define APSSID "ap0242ac130003"
#define APPSK  "46ed-11ec"
//#endif

/* Set these to your desired credentials. */
const char *ssid = APSSID;
const char *password = APPSK;

ESP8266WebServer server(3000);

IPAddress local_IP(192,168,4,22);
IPAddress gateway(192,168,4,9);
IPAddress subnet(255,255,255,0);

String argValue = "";

#define LED_BUILTIN 2
int ledState = LOW;
unsigned long previousMillis = 0;
const long interval = 1000;
const long intervalOn = 200;

// Create CLI Object
SimpleCLI cli;

// Commands
Command whoAreYou;
Command clientId;

// Callback function for cowsay command
void whoAreYouCallback(cmd* c) {
  Command cmd(c); // Create wrapper object
  // Get first (and only) Argument
  Argument arg = cmd.getArgument(0);
  // Get value of argument
  String argVal = arg.getValue();    
//    for (int i = 0; i<argVal.length(); i++) Serial.print('_');
  // Print Value
  Serial.println("~esp-master");
}

void clientIdCallback(cmd* c) {
  Command cmd(c); // Create wrapper object
  // Get first (and only) Argument
  Argument arg = cmd.getArgument(0);
  // Get value of argument
  String argVal = arg.getValue();    
//    for (int i = 0; i<argVal.length(); i++) Serial.print('_');
  // Print Value
  Serial.println("~"+argValue);
}

// Callback in case of an error
void errorCallback(cmd_error* e) {
    CommandError cmdError(e); // Create wrapper object

    Serial.print("ERROR: ");
    Serial.println(cmdError.toString());

//    if (cmdError.hasCommand()) {
//        Serial.print("Did you mean \"");
//        Serial.print(cmdError.getCommand().toString());
//        Serial.println("\"?");
//    }
}



/* Just a little test message.  Go to http://192.168.4.1 in a web browser
   connected to this access point to see it.
*/
void handleRoot() {
  server.send(200, "text/html", "<h1>You are connected</h1>");
}

void registerDevice() {
  argValue = server.arg("value");
  Serial.println(argValue);
  server.send(200, "text/html", "<h1>what up!</h1>");
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  
//  delay(1000);
  Serial.begin(9600);
  Serial.println();
  Serial.println("Configuring access point...");

  Serial.print("Setting soft-AP configuration ... ");
  Serial.println(WiFi.softAPConfig(local_IP, gateway, subnet) ? "Ready" : "Failed!");

  /* You can remove the password parameter if you want the AP to be open. */
  WiFi.softAP(ssid, password);

  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  server.on("/", handleRoot);
  server.on("/hey", registerDevice);
  server.begin();
  Serial.println("HTTP server started");

  cli.setOnError(errorCallback); // Set error Callback
  whoAreYou = cli.addSingleArgCmd("~?", whoAreYouCallback);
  clientId = cli.addSingleArgCmd("~cid", clientIdCallback);
}

void checkCommand() {
  // Check if user typed something into the serial monitor
  if (Serial.available()) {
    // Read out string from the serial monitor
    String input = Serial.readStringUntil('\n');

    // Parse the user input into the CLI
    cli.parse(input);

    ledState = HIGH;
    digitalWrite(LED_BUILTIN, LOW);
  }

  if (cli.errored()) {
    CommandError cmdError = cli.getError();

    Serial.print("ERROR: ");
    Serial.println(cmdError.toString());

//    if (cmdError.hasCommand()) {
//      Serial.print("Did you mean \"");
//      Serial.print(cmdError.getCommand().toString());
//      Serial.println("\"?");
//    }
  }
    
}

void loop() {
  server.handleClient();

  unsigned long currentMillis = millis();
  if (ledState == LOW) { //on
    if (currentMillis - previousMillis >= intervalOn) {
      ledState = HIGH; //off
      digitalWrite(LED_BUILTIN, ledState);
    }
  }
  else if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    if (ledState == LOW) {
      ledState = HIGH;  // Note that this switches the LED *off*
    } else {
      ledState = LOW;  // Note that this switches the LED *on*
    }
    digitalWrite(LED_BUILTIN, ledState);
  }

  checkCommand();
}
