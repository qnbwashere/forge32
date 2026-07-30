/* FORGE32 symbol database.
 * Everything the completion engine knows about the ESP32 Arduino core plus the
 * libraries people actually reach for. Add your own at the bottom of the file.
 *
 * insert strings support ${1:placeholder} tab stops and $0 for the final caret.
 */

const F = (name, sig, doc, include, insert) =>
  ({ name, kind: 'func', sig, doc, include, insert });
const M = (name, sig, doc, insert) =>
  ({ name, kind: 'method', sig, doc, insert });
const C = (name, doc, include) => ({ name, kind: 'const', doc, include });
const T = (name, doc) => ({ name, kind: 'type', doc });
const K = (name, doc) => ({ name, kind: 'keyword', doc });

/* ------------------------------------------------------------------ */
/* global functions                                                    */
/* ------------------------------------------------------------------ */

export const GLOBALS = [
  /* digital and analog io */
  F('pinMode', 'void pinMode(uint8_t pin, uint8_t mode)',
    'Set a pin to INPUT, OUTPUT, INPUT_PULLUP or INPUT_PULLDOWN. Call it in setup.',
    null, 'pinMode(${1:pin}, ${2:OUTPUT});$0'),
  F('digitalWrite', 'void digitalWrite(uint8_t pin, uint8_t value)',
    'Drive an output pin HIGH or LOW.', null, 'digitalWrite(${1:pin}, ${2:HIGH});$0'),
  F('digitalRead', 'int digitalRead(uint8_t pin)',
    'Read a pin as HIGH or LOW.', null, 'digitalRead(${1:pin})$0'),
  F('analogRead', 'uint16_t analogRead(uint8_t pin)',
    'Read the ADC on a pin. Returns 0 to 4095 at the default 12 bit resolution.',
    null, 'analogRead(${1:pin})$0'),
  F('analogReadMilliVolts', 'uint32_t analogReadMilliVolts(uint8_t pin)',
    'Read the ADC already converted to millivolts using the factory calibration. More accurate than scaling analogRead yourself.',
    null, 'analogReadMilliVolts(${1:pin})$0'),
  F('analogReadResolution', 'void analogReadResolution(uint8_t bits)',
    'Set ADC resolution from 9 to 12 bits. Default is 12.', null, 'analogReadResolution(${1:12});$0'),
  F('analogSetAttenuation', 'void analogSetAttenuation(adc_attenuation_t attenuation)',
    'Set the input range for every ADC pin. ADC_11db reads up to about 2.5V.',
    null, 'analogSetAttenuation(${1:ADC_11db});$0'),
  F('analogSetPinAttenuation', 'void analogSetPinAttenuation(uint8_t pin, adc_attenuation_t attenuation)',
    'Set the input range for one ADC pin.', null, 'analogSetPinAttenuation(${1:pin}, ${2:ADC_11db});$0'),
  F('analogWrite', 'void analogWrite(uint8_t pin, int value)',
    'PWM out on any pin. Core 3.x wires this to LEDC for you. Range is 0 to 255 unless you change it.',
    null, 'analogWrite(${1:pin}, ${2:128});$0'),
  F('analogWriteResolution', 'void analogWriteResolution(uint8_t pin, uint8_t bits)',
    'Change the analogWrite duty range on a pin, up to 16 bits.',
    null, 'analogWriteResolution(${1:pin}, ${2:12});$0'),
  F('analogWriteFrequency', 'void analogWriteFrequency(uint8_t pin, uint32_t freq)',
    'Change the PWM frequency on a pin.', null, 'analogWriteFrequency(${1:pin}, ${2:5000});$0'),
  F('dacWrite', 'void dacWrite(uint8_t pin, uint8_t value)',
    'True analog output, 0 to 255. Only GPIO25 and GPIO26 on the original ESP32.',
    null, 'dacWrite(${1:25}, ${2:128});$0'),

  /* ledc pwm */
  F('ledcAttach', 'bool ledcAttach(uint8_t pin, uint32_t freq, uint8_t resolution)',
    'Core 3.x. Bind a pin to a free LEDC channel at a frequency and duty resolution.',
    null, 'ledcAttach(${1:pin}, ${2:5000}, ${3:12});$0'),
  F('ledcAttachChannel', 'bool ledcAttachChannel(uint8_t pin, uint32_t freq, uint8_t resolution, uint8_t channel)',
    'Core 3.x. Same as ledcAttach but you pick the channel.',
    null, 'ledcAttachChannel(${1:pin}, ${2:5000}, ${3:12}, ${4:0});$0'),
  F('ledcSetup', 'double ledcSetup(uint8_t channel, double freq, uint8_t resolution_bits)',
    'Core 2.x. Configure a PWM channel before attaching a pin to it.',
    null, 'ledcSetup(${1:0}, ${2:5000}, ${3:12});$0'),
  F('ledcAttachPin', 'void ledcAttachPin(uint8_t pin, uint8_t channel)',
    'Core 2.x. Route a configured PWM channel to a pin.',
    null, 'ledcAttachPin(${1:pin}, ${2:0});$0'),
  F('ledcWrite', 'void ledcWrite(uint8_t pin, uint32_t duty)',
    'Set the PWM duty. Core 3.x takes the pin, core 2.x takes the channel.',
    null, 'ledcWrite(${1:pin}, ${2:2048});$0'),
  F('ledcWriteTone', 'double ledcWriteTone(uint8_t pin, double freq)',
    'Output a square wave at a frequency, handy for buzzers.',
    null, 'ledcWriteTone(${1:pin}, ${2:1000});$0'),
  F('ledcWriteNote', 'double ledcWriteNote(uint8_t pin, note_t note, uint8_t octave)',
    'Play a musical note, for example NOTE_C with octave 4.',
    null, 'ledcWriteNote(${1:pin}, ${2:NOTE_C}, ${3:4});$0'),
  F('ledcRead', 'uint32_t ledcRead(uint8_t pin)', 'Read back the current duty.', null, 'ledcRead(${1:pin})$0'),
  F('ledcDetach', 'bool ledcDetach(uint8_t pin)', 'Release a pin from LEDC.', null, 'ledcDetach(${1:pin});$0'),
  F('tone', 'void tone(uint8_t pin, unsigned int frequency, unsigned long duration)',
    'Buzzer tone. Duration is optional, leave it off to run until noTone.',
    null, 'tone(${1:pin}, ${2:440}, ${3:200});$0'),
  F('noTone', 'void noTone(uint8_t pin)', 'Stop a tone.', null, 'noTone(${1:pin});$0'),

  /* touch */
  F('touchRead', 'touch_value_t touchRead(uint8_t pin)',
    'Read a capacitive touch pin. Only the T0 to T9 pins support this.',
    null, 'touchRead(${1:T0})$0'),
  F('touchAttachInterrupt', 'void touchAttachInterrupt(uint8_t pin, void (*handler)(void), touch_value_t threshold)',
    'Fire a callback when a touch pin crosses a threshold.',
    null, 'touchAttachInterrupt(${1:T0}, ${2:onTouch}, ${3:40});$0'),
  F('touchSetCycles', 'void touchSetCycles(uint16_t measure, uint16_t sleep)',
    'Tune touch sensitivity by changing measurement timing.', null, 'touchSetCycles(${1:0x1000}, ${2:0x1000});$0'),

  /* timing */
  F('delay', 'void delay(uint32_t ms)',
    'Block for milliseconds. Other tasks still run, but this loop does nothing else.',
    null, 'delay(${1:1000});$0'),
  F('delayMicroseconds', 'void delayMicroseconds(uint32_t us)',
    'Block for microseconds. Accurate for short waits.', null, 'delayMicroseconds(${1:100});$0'),
  F('millis', 'unsigned long millis()',
    'Milliseconds since boot. Rolls over after about 49 days, so compare differences rather than absolutes.',
    null, 'millis()$0'),
  F('micros', 'unsigned long micros()',
    'Microseconds since boot. Rolls over after about 71 minutes.', null, 'micros()$0'),
  F('esp_timer_get_time', 'int64_t esp_timer_get_time()',
    'Microseconds since boot as a 64 bit value, so no rollover to worry about.',
    null, 'esp_timer_get_time()$0'),

  /* interrupts */
  F('attachInterrupt', 'void attachInterrupt(uint8_t pin, void (*handler)(void), int mode)',
    'Run a handler when a pin changes. Mode is RISING, FALLING or CHANGE. Mark the handler IRAM_ATTR and keep it short.',
    null, 'attachInterrupt(${1:pin}, ${2:onEdge}, ${3:FALLING});$0'),
  F('attachInterruptArg', 'void attachInterruptArg(uint8_t pin, void (*handler)(void *), void *arg, int mode)',
    'Pin interrupt that passes a pointer to your handler, so one handler can serve several pins.',
    null, 'attachInterruptArg(${1:pin}, ${2:onEdge}, ${3:&arg}, ${4:FALLING});$0'),
  F('detachInterrupt', 'void detachInterrupt(uint8_t pin)', 'Stop watching a pin.', null, 'detachInterrupt(${1:pin});$0'),
  F('digitalPinToInterrupt', 'int digitalPinToInterrupt(uint8_t pin)',
    'Portability helper. On ESP32 it just returns the pin.', null, 'digitalPinToInterrupt(${1:pin})$0'),

  /* math and bits */
  F('map', 'long map(long x, long inMin, long inMax, long outMin, long outMax)',
    'Rescale a number from one range to another. Integer math, so it truncates.',
    null, 'map(${1:value}, ${2:0}, ${3:4095}, ${4:0}, ${5:255})$0'),
  F('constrain', 'constrain(x, low, high)', 'Clamp a value between two bounds.',
    null, 'constrain(${1:value}, ${2:0}, ${3:255})$0'),
  F('min', 'min(a, b)', 'Smaller of two values.', null, 'min(${1:a}, ${2:b})$0'),
  F('max', 'max(a, b)', 'Larger of two values.', null, 'max(${1:a}, ${2:b})$0'),
  F('abs', 'abs(x)', 'Absolute value.', null, 'abs(${1:x})$0'),
  F('pow', 'double pow(double base, double exponent)', 'Raise to a power.', null, 'pow(${1:base}, ${2:exp})$0'),
  F('sqrt', 'double sqrt(double x)', 'Square root.', null, 'sqrt(${1:x})$0'),
  F('sq', 'sq(x)', 'Square of a value.', null, 'sq(${1:x})$0'),
  F('random', 'long random(long min, long max)',
    'Pseudo random number. The upper bound is exclusive.', null, 'random(${1:0}, ${2:100})$0'),
  F('randomSeed', 'void randomSeed(unsigned long seed)',
    'Seed the generator. Feed it esp_random() or an unconnected analogRead.',
    null, 'randomSeed(${1:esp_random()});$0'),
  F('esp_random', 'uint32_t esp_random()',
    'True hardware random number. Needs WiFi or Bluetooth active to be fully random.',
    null, 'esp_random()$0'),
  F('bitRead', 'bitRead(value, bit)', 'Read one bit of a number.', null, 'bitRead(${1:value}, ${2:0})$0'),
  F('bitWrite', 'bitWrite(value, bit, bitValue)', 'Write one bit of a number.', null, 'bitWrite(${1:value}, ${2:0}, ${3:1});$0'),
  F('bitSet', 'bitSet(value, bit)', 'Set one bit high.', null, 'bitSet(${1:value}, ${2:0});$0'),
  F('bitClear', 'bitClear(value, bit)', 'Set one bit low.', null, 'bitClear(${1:value}, ${2:0});$0'),
  F('lowByte', 'lowByte(value)', 'Least significant byte.', null, 'lowByte(${1:value})$0'),
  F('highByte', 'highByte(value)', 'Most significant byte.', null, 'highByte(${1:value})$0'),

  /* pulse and shift */
  F('pulseIn', 'unsigned long pulseIn(uint8_t pin, uint8_t state, unsigned long timeout)',
    'Measure a pulse in microseconds. Used by ultrasonic rangefinders.',
    null, 'pulseIn(${1:pin}, ${2:HIGH}, ${3:30000})$0'),
  F('shiftOut', 'void shiftOut(uint8_t dataPin, uint8_t clockPin, uint8_t bitOrder, uint8_t value)',
    'Clock a byte out one bit at a time, for shift registers like the 74HC595.',
    null, 'shiftOut(${1:dataPin}, ${2:clockPin}, ${3:MSBFIRST}, ${4:value});$0'),
  F('shiftIn', 'uint8_t shiftIn(uint8_t dataPin, uint8_t clockPin, uint8_t bitOrder)',
    'Clock a byte in one bit at a time.', null, 'shiftIn(${1:dataPin}, ${2:clockPin}, ${3:MSBFIRST})$0'),

  /* chip and power */
  F('temperatureRead', 'float temperatureRead()',
    'Internal die temperature in Celsius. It reads the silicon, not the room, so it runs warm.',
    null, 'temperatureRead()$0'),
  F('esp_restart', 'void esp_restart()', 'Reboot the chip immediately.', null, 'esp_restart();$0'),
  F('esp_get_free_heap_size', 'uint32_t esp_get_free_heap_size()', 'Free heap in bytes.', null, 'esp_get_free_heap_size()$0'),
  F('esp_sleep_enable_timer_wakeup', 'esp_err_t esp_sleep_enable_timer_wakeup(uint64_t time_in_us)',
    'Wake from sleep after a delay. The argument is microseconds, so multiply seconds by 1000000.',
    null, 'esp_sleep_enable_timer_wakeup(${1:10} * 1000000ULL);$0'),
  F('esp_sleep_enable_ext0_wakeup', 'esp_err_t esp_sleep_enable_ext0_wakeup(gpio_num_t pin, int level)',
    'Wake from deep sleep on one RTC pin reaching a level.',
    null, 'esp_sleep_enable_ext0_wakeup(${1:GPIO_NUM_33}, ${2:0});$0'),
  F('esp_sleep_enable_ext1_wakeup', 'esp_err_t esp_sleep_enable_ext1_wakeup(uint64_t mask, esp_sleep_ext1_wakeup_mode_t mode)',
    'Wake from deep sleep on any of several RTC pins.',
    null, 'esp_sleep_enable_ext1_wakeup(${1:BIT64(33)}, ${2:ESP_EXT1_WAKEUP_ALL_LOW});$0'),
  F('esp_deep_sleep_start', 'void esp_deep_sleep_start()',
    'Enter deep sleep. Nothing after this line runs, the chip restarts from setup on wake.',
    null, 'esp_deep_sleep_start();$0'),
  F('esp_light_sleep_start', 'esp_err_t esp_light_sleep_start()',
    'Enter light sleep. Execution continues on the next line after waking.',
    null, 'esp_light_sleep_start();$0'),
  F('esp_sleep_get_wakeup_cause', 'esp_sleep_wakeup_cause_t esp_sleep_get_wakeup_cause()',
    'Find out what woke the chip up.', null, 'esp_sleep_get_wakeup_cause()$0'),
  F('setCpuFrequencyMhz', 'bool setCpuFrequencyMhz(uint32_t freq)',
    'Change the CPU clock. 80 MHz cuts current draw a lot, and 240 is the default.',
    null, 'setCpuFrequencyMhz(${1:80});$0'),
  F('getCpuFrequencyMhz', 'uint32_t getCpuFrequencyMhz()', 'Current CPU clock in MHz.', null, 'getCpuFrequencyMhz()$0'),

  /* freertos */
  F('xTaskCreate', 'BaseType_t xTaskCreate(TaskFunction_t fn, const char *name, uint32_t stackDepth, void *param, UBaseType_t priority, TaskHandle_t *handle)',
    'Start a task that runs alongside loop. Stack is in words, 4096 is a safe starting point.',
    null, 'xTaskCreate(${1:taskFn}, "${2:task}", ${3:4096}, NULL, ${4:1}, NULL);$0'),
  F('xTaskCreatePinnedToCore', 'BaseType_t xTaskCreatePinnedToCore(TaskFunction_t fn, const char *name, uint32_t stackDepth, void *param, UBaseType_t priority, TaskHandle_t *handle, BaseType_t core)',
    'Start a task on a specific core. Core 0 runs the radio, core 1 runs your sketch.',
    null, 'xTaskCreatePinnedToCore(${1:taskFn}, "${2:task}", ${3:4096}, NULL, ${4:1}, NULL, ${5:0});$0'),
  F('vTaskDelay', 'void vTaskDelay(TickType_t ticks)',
    'Yield for a number of ticks. Wrap milliseconds in pdMS_TO_TICKS.',
    null, 'vTaskDelay(pdMS_TO_TICKS(${1:100}));$0'),
  F('vTaskDelete', 'void vTaskDelete(TaskHandle_t task)',
    'Kill a task. Pass NULL to delete the task that is calling.', null, 'vTaskDelete(${1:NULL});$0'),
  F('pdMS_TO_TICKS', 'pdMS_TO_TICKS(ms)', 'Convert milliseconds to FreeRTOS ticks.', null, 'pdMS_TO_TICKS(${1:100})$0'),
  F('xPortGetCoreID', 'BaseType_t xPortGetCoreID()', 'Which core is running this code, 0 or 1.', null, 'xPortGetCoreID()$0'),
  F('xQueueCreate', 'QueueHandle_t xQueueCreate(UBaseType_t length, UBaseType_t itemSize)',
    'Make a queue to pass data between tasks safely.',
    null, 'xQueueCreate(${1:10}, sizeof(${2:int}));$0'),
  F('xQueueSend', 'BaseType_t xQueueSend(QueueHandle_t queue, const void *item, TickType_t wait)',
    'Push an item onto a queue.', null, 'xQueueSend(${1:queue}, &${2:item}, portMAX_DELAY);$0'),
  F('xQueueReceive', 'BaseType_t xQueueReceive(QueueHandle_t queue, void *buffer, TickType_t wait)',
    'Pop an item off a queue, waiting if it is empty.',
    null, 'xQueueReceive(${1:queue}, &${2:item}, portMAX_DELAY)$0'),
  F('xSemaphoreCreateMutex', 'SemaphoreHandle_t xSemaphoreCreateMutex()',
    'Make a mutex so two tasks do not touch the same thing at once.', null, 'xSemaphoreCreateMutex();$0'),
  F('xSemaphoreTake', 'BaseType_t xSemaphoreTake(SemaphoreHandle_t sem, TickType_t wait)',
    'Take a mutex, blocking until it is free.', null, 'xSemaphoreTake(${1:mutex}, portMAX_DELAY);$0'),
  F('xSemaphoreGive', 'BaseType_t xSemaphoreGive(SemaphoreHandle_t sem)',
    'Release a mutex. Always pair this with a take.', null, 'xSemaphoreGive(${1:mutex});$0'),
  F('uxTaskGetStackHighWaterMark', 'UBaseType_t uxTaskGetStackHighWaterMark(TaskHandle_t task)',
    'Smallest amount of free stack a task has ever had. Useful for right sizing stacks.',
    null, 'uxTaskGetStackHighWaterMark(NULL)$0'),
];

/* ------------------------------------------------------------------ */
/* class members, keyed by the type name                               */
/* ------------------------------------------------------------------ */

export const MEMBERS = {

  HardwareSerial: [
    M('begin', 'void begin(unsigned long baud, uint32_t config = SERIAL_8N1, int8_t rxPin = -1, int8_t txPin = -1)',
      'Start the port. 115200 is the ESP32 default and what the bootloader logs use.',
      'begin(${1:115200});$0'),
    M('end', 'void end()', 'Release the port.', 'end();$0'),
    M('available', 'int available()', 'Bytes waiting to be read.', 'available()$0'),
    M('availableForWrite', 'int availableForWrite()', 'Room left in the transmit buffer.', 'availableForWrite()$0'),
    M('read', 'int read()', 'Read one byte, or -1 if nothing is waiting.', 'read()$0'),
    M('readBytes', 'size_t readBytes(char *buffer, size_t length)', 'Read into a buffer until full or timeout.', 'readBytes(${1:buf}, ${2:len})$0'),
    M('readString', 'String readString()', 'Read everything available into a String.', 'readString()$0'),
    M('readStringUntil', 'String readStringUntil(char terminator)',
      'Read until a character arrives. Pass a newline to read a line at a time.', "readStringUntil('\\n')$0"),
    M('peek', 'int peek()', 'Look at the next byte without consuming it.', 'peek()$0'),
    M('flush', 'void flush()', 'Wait until the transmit buffer has drained.', 'flush();$0'),
    M('print', 'size_t print(value)', 'Send text with no newline.', 'print(${1:value});$0'),
    M('println', 'size_t println(value)', 'Send text followed by a newline.', 'println(${1:value});$0'),
    M('printf', 'size_t printf(const char *format, ...)',
      'C style formatting. Use %d for int, %lu for unsigned long, %.2f for a float and \\n for a newline.',
      'printf("${1:%d\\\\n}", ${2:value});$0'),
    M('write', 'size_t write(uint8_t value)', 'Send a raw byte.', 'write(${1:byte});$0'),
    M('setTimeout', 'void setTimeout(unsigned long ms)', 'How long the read helpers wait. Default is one second.', 'setTimeout(${1:100});$0'),
    M('setRxBufferSize', 'size_t setRxBufferSize(size_t size)', 'Grow the receive buffer. Call before begin.', 'setRxBufferSize(${1:1024});$0'),
    M('setDebugOutput', 'void setDebugOutput(bool enable)', 'Send core log messages to this port.', 'setDebugOutput(${1:true});$0'),
    M('onReceive', 'void onReceive(OnReceiveCb function)', 'Callback when bytes arrive, instead of polling.', 'onReceive(${1:onSerialData});$0'),
    M('updateBaudRate', 'void updateBaudRate(unsigned long baud)', 'Change speed without closing the port.', 'updateBaudRate(${1:9600});$0'),
  ],

  WiFiClass: [
    M('mode', 'bool mode(wifi_mode_t mode)', 'WIFI_STA to join a network, WIFI_AP to make one, WIFI_AP_STA for both.', 'mode(${1:WIFI_STA});$0'),
    M('begin', 'wl_status_t begin(const char *ssid, const char *passphrase)', 'Join a network. Returns immediately, so poll status.', 'begin(${1:ssid}, ${2:password});$0'),
    M('disconnect', 'bool disconnect(bool wifioff = false)', 'Leave the network.', 'disconnect();$0'),
    M('reconnect', 'bool reconnect()', 'Try the last network again.', 'reconnect();$0'),
    M('status', 'wl_status_t status()', 'Connection state. Compare against WL_CONNECTED.', 'status()$0'),
    M('isConnected', 'bool isConnected()', 'True when joined to a network.', 'isConnected()$0'),
    M('waitForConnectResult', 'uint8_t waitForConnectResult(unsigned long timeout = 60000)',
      'Block until the join finishes or times out.', 'waitForConnectResult(${1:10000})$0'),
    M('localIP', 'IPAddress localIP()', 'This device address on the network.', 'localIP()$0'),
    M('gatewayIP', 'IPAddress gatewayIP()', 'Router address.', 'gatewayIP()$0'),
    M('subnetMask', 'IPAddress subnetMask()', 'Subnet mask.', 'subnetMask()$0'),
    M('dnsIP', 'IPAddress dnsIP(uint8_t index = 0)', 'DNS server address.', 'dnsIP()$0'),
    M('macAddress', 'String macAddress()', 'This device MAC as a string.', 'macAddress()$0'),
    M('RSSI', 'int8_t RSSI()', 'Signal strength in dBm. Closer to zero is stronger, so -55 beats -85.', 'RSSI()$0'),
    M('SSID', 'String SSID()', 'Name of the joined network.', 'SSID()$0'),
    M('channel', 'int32_t channel()', 'Current WiFi channel.', 'channel()$0'),
    M('setHostname', 'bool setHostname(const char *hostname)', 'Name this device shows as on the network. Call before begin.', 'setHostname("${1:esp32}");$0'),
    M('setSleep', 'bool setSleep(bool enable)', 'Turn off modem sleep for lower latency at the cost of current.', 'setSleep(${1:false});$0'),
    M('setTxPower', 'bool setTxPower(wifi_power_t power)', 'Lower the radio power to reduce current draw.', 'setTxPower(${1:WIFI_POWER_11dBm});$0'),
    M('setAutoReconnect', 'bool setAutoReconnect(bool autoReconnect)', 'Rejoin automatically after a drop.', 'setAutoReconnect(${1:true});$0'),
    M('config', 'bool config(IPAddress local, IPAddress gateway, IPAddress subnet, IPAddress dns)',
      'Use a static address instead of DHCP. Call before begin.', 'config(${1:local}, ${2:gateway}, ${3:subnet});$0'),
    M('softAP', 'bool softAP(const char *ssid, const char *passphrase = NULL)',
      'Become an access point. The password must be eight characters or more, or leave it open.',
      'softAP("${1:ESP32-AP}", "${2:password}");$0'),
    M('softAPIP', 'IPAddress softAPIP()', 'Address of your own access point, usually 192.168.4.1.', 'softAPIP()$0'),
    M('softAPgetStationNum', 'uint8_t softAPgetStationNum()', 'How many clients are joined to your access point.', 'softAPgetStationNum()$0'),
    M('scanNetworks', 'int16_t scanNetworks(bool async = false, bool showHidden = false)',
      'Scan for networks and return how many were found.', 'scanNetworks()$0'),
    M('onEvent', 'void onEvent(WiFiEventCb cbEvent, arduino_event_id_t event = ARDUINO_EVENT_MAX)',
      'Register a callback for connect, disconnect and got IP events.', 'onEvent(${1:onWiFiEvent});$0'),
  ],

  TwoWire: [
    M('begin', 'bool begin(int sda = -1, int scl = -1, uint32_t frequency = 0)',
      'Start I2C. On ESP32 you can pick any pins, the defaults are GPIO21 for SDA and GPIO22 for SCL.',
      'begin(${1:21}, ${2:22});$0'),
    M('setClock', 'bool setClock(uint32_t frequency)', 'Bus speed. 100000 is standard, 400000 is fast mode.', 'setClock(${1:400000});$0'),
    M('beginTransmission', 'void beginTransmission(uint8_t address)', 'Start a write to a device address.', 'beginTransmission(${1:0x3C});$0'),
    M('write', 'size_t write(uint8_t data)', 'Queue a byte for the current transmission.', 'write(${1:data});$0'),
    M('endTransmission', 'uint8_t endTransmission(bool sendStop = true)',
      'Send the queued bytes. Returns 0 on success, 2 when nothing answered at that address.', 'endTransmission()$0'),
    M('requestFrom', 'size_t requestFrom(uint8_t address, size_t size, bool sendStop = true)',
      'Ask a device for bytes.', 'requestFrom(${1:0x3C}, ${2:1});$0'),
    M('available', 'int available()', 'Bytes left to read from the last request.', 'available()$0'),
    M('read', 'int read()', 'Read one received byte.', 'read()$0'),
    M('setPins', 'bool setPins(int sda, int scl)', 'Choose pins before begin.', 'setPins(${1:21}, ${2:22});$0'),
    M('setTimeOut', 'void setTimeOut(uint16_t timeOutMillis)', 'How long to wait on a stuck bus.', 'setTimeOut(${1:50});$0'),
  ],

  SPIClass: [
    M('begin', 'void begin(int8_t sck = -1, int8_t miso = -1, int8_t mosi = -1, int8_t ss = -1)',
      'Start SPI. Defaults on the original ESP32 are 18 for SCK, 19 for MISO and 23 for MOSI.',
      'begin(${1:18}, ${2:19}, ${3:23}, ${4:5});$0'),
    M('end', 'void end()', 'Release the bus.', 'end();$0'),
    M('beginTransaction', 'void beginTransaction(SPISettings settings)',
      'Claim the bus with a speed, bit order and mode.',
      'beginTransaction(SPISettings(${1:1000000}, MSBFIRST, SPI_MODE0));$0'),
    M('endTransaction', 'void endTransaction()', 'Release the bus for other devices.', 'endTransaction();$0'),
    M('transfer', 'uint8_t transfer(uint8_t data)', 'Send a byte and receive one at the same time.', 'transfer(${1:data})$0'),
    M('transfer16', 'uint16_t transfer16(uint16_t data)', 'Send and receive sixteen bits.', 'transfer16(${1:data})$0'),
    M('writeBytes', 'void writeBytes(const uint8_t *data, uint32_t size)', 'Send a buffer without reading back.', 'writeBytes(${1:buf}, ${2:len});$0'),
    M('setFrequency', 'void setFrequency(uint32_t freq)', 'Clock speed in Hz.', 'setFrequency(${1:1000000});$0'),
    M('setDataMode', 'void setDataMode(uint8_t dataMode)', 'SPI_MODE0 through SPI_MODE3.', 'setDataMode(${1:SPI_MODE0});$0'),
  ],

  Preferences: [
    M('begin', 'bool begin(const char *name, bool readOnly = false)',
      'Open a namespace in flash. The name is limited to fifteen characters.', 'begin("${1:app}", false);$0'),
    M('end', 'void end()', 'Close the namespace.', 'end();$0'),
    M('clear', 'bool clear()', 'Wipe every key in this namespace.', 'clear();$0'),
    M('remove', 'bool remove(const char *key)', 'Delete one key.', 'remove("${1:key}");$0'),
    M('isKey', 'bool isKey(const char *key)', 'Check whether a key was ever written.', 'isKey("${1:key}")$0'),
    M('putInt', 'size_t putInt(const char *key, int32_t value)', 'Store an int that survives power loss.', 'putInt("${1:key}", ${2:value});$0'),
    M('getInt', 'int32_t getInt(const char *key, int32_t defaultValue = 0)',
      'Read an int. The default is returned when the key is missing, which is what you get on a fresh board.',
      'getInt("${1:key}", ${2:0})$0'),
    M('putUInt', 'size_t putUInt(const char *key, uint32_t value)', 'Store an unsigned int.', 'putUInt("${1:key}", ${2:value});$0'),
    M('getUInt', 'uint32_t getUInt(const char *key, uint32_t defaultValue = 0)', 'Read an unsigned int.', 'getUInt("${1:key}", ${2:0})$0'),
    M('putFloat', 'size_t putFloat(const char *key, float value)', 'Store a float.', 'putFloat("${1:key}", ${2:value});$0'),
    M('getFloat', 'float getFloat(const char *key, float defaultValue = NAN)', 'Read a float.', 'getFloat("${1:key}", ${2:0.0})$0'),
    M('putBool', 'size_t putBool(const char *key, bool value)', 'Store a bool.', 'putBool("${1:key}", ${2:true});$0'),
    M('getBool', 'bool getBool(const char *key, bool defaultValue = false)', 'Read a bool.', 'getBool("${1:key}", ${2:false})$0'),
    M('putString', 'size_t putString(const char *key, String value)', 'Store a string.', 'putString("${1:key}", ${2:value});$0'),
    M('getString', 'String getString(const char *key, String defaultValue = String())', 'Read a string.', 'getString("${1:key}", "${2:}")$0'),
    M('putBytes', 'size_t putBytes(const char *key, const void *value, size_t len)', 'Store a raw struct or buffer.', 'putBytes("${1:key}", &${2:data}, sizeof(${2:data}));$0'),
    M('getBytes', 'size_t getBytes(const char *key, void *buf, size_t maxLen)', 'Read a raw struct or buffer.', 'getBytes("${1:key}", &${2:data}, sizeof(${2:data}));$0'),
    M('freeEntries', 'size_t freeEntries()', 'How many entries are left in the partition.', 'freeEntries()$0'),
  ],

  WebServer: [
    M('begin', 'void begin(uint16_t port = 0)', 'Start listening.', 'begin();$0'),
    M('on', 'void on(const Uri &uri, THandlerFunction handler)',
      'Route a path to a handler. Add HTTP_GET or HTTP_POST as the second argument to pin the method.',
      'on("${1:/}", ${2:handleRoot});$0'),
    M('onNotFound', 'void onNotFound(THandlerFunction fn)', 'Handler for anything unrouted.', 'onNotFound(${1:handleNotFound});$0'),
    M('handleClient', 'void handleClient()', 'Pump the server. Call this every pass through loop or nothing responds.', 'handleClient();$0'),
    M('send', 'void send(int code, const char *contentType, const String &content)',
      'Reply to the current request.', 'send(200, "${1:text/plain}", "${2:ok}");$0'),
    M('sendHeader', 'void sendHeader(const String &name, const String &value, bool first = false)', 'Add a response header.', 'sendHeader("${1:Location}", "${2:/}");$0'),
    M('arg', 'String arg(const String &name)', 'Read a query or form value.', 'arg("${1:name}")$0'),
    M('hasArg', 'bool hasArg(const String &name)', 'Check a parameter exists.', 'hasArg("${1:name}")$0'),
    M('args', 'int args()', 'How many parameters came in.', 'args()$0'),
    M('uri', 'String uri()', 'Path of the current request.', 'uri()$0'),
    M('method', 'HTTPMethod method()', 'GET, POST and so on.', 'method()$0'),
    M('client', 'WiFiClient &client()', 'The underlying socket.', 'client()$0'),
    M('stop', 'void stop()', 'Stop listening.', 'stop();$0'),
  ],

  HTTPClient: [
    M('begin', 'bool begin(String url)', 'Point at a URL. For https pass a WiFiClientSecure first.', 'begin(${1:url});$0'),
    M('GET', 'int GET()', 'Send a GET. Returns the status code, or a negative number for a transport failure.', 'GET()$0'),
    M('POST', 'int POST(String payload)', 'Send a POST with a body.', 'POST(${1:payload})$0'),
    M('PUT', 'int PUT(String payload)', 'Send a PUT.', 'PUT(${1:payload})$0'),
    M('addHeader', 'void addHeader(const String &name, const String &value)', 'Set a request header.', 'addHeader("Content-Type", "application/json");$0'),
    M('getString', 'String getString()', 'Read the whole response body.', 'getString()$0'),
    M('getSize', 'int getSize()', 'Content length, or -1 when chunked.', 'getSize()$0'),
    M('getStreamPtr', 'Stream *getStreamPtr()', 'Stream the body instead of buffering it, for large downloads.', 'getStreamPtr()$0'),
    M('setTimeout', 'void setTimeout(uint16_t timeout)', 'Socket timeout in milliseconds.', 'setTimeout(${1:5000});$0'),
    M('setReuse', 'void setReuse(bool reuse)', 'Keep the connection alive between requests.', 'setReuse(${1:true});$0'),
    M('setFollowRedirects', 'void setFollowRedirects(followRedirects_t follow)', 'Follow 301 and 302 replies.', 'setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);$0'),
    M('end', 'void end()', 'Close the connection and free the buffers. Always call this.', 'end();$0'),
  ],

  File: [
    M('available', 'int available()', 'Bytes left to read.', 'available()$0'),
    M('read', 'int read()', 'Read one byte.', 'read()$0'),
    M('write', 'size_t write(uint8_t data)', 'Write one byte.', 'write(${1:data});$0'),
    M('print', 'size_t print(value)', 'Write text.', 'print(${1:value});$0'),
    M('println', 'size_t println(value)', 'Write text and a newline.', 'println(${1:value});$0'),
    M('readStringUntil', 'String readStringUntil(char terminator)', 'Read up to a delimiter.', "readStringUntil('\\n')$0"),
    M('size', 'size_t size()', 'File size in bytes.', 'size()$0'),
    M('name', 'const char *name()', 'File name.', 'name()$0'),
    M('path', 'const char *path()', 'Full path.', 'path()$0'),
    M('close', 'void close()', 'Flush and close. Forgetting this loses writes.', 'close();$0'),
    M('seek', 'bool seek(uint32_t pos)', 'Jump to a byte offset.', 'seek(${1:0});$0'),
    M('isDirectory', 'bool isDirectory()', 'True for folders.', 'isDirectory()$0'),
    M('openNextFile', 'File openNextFile()', 'Walk the entries of a directory.', 'openNextFile()$0'),
  ],

  FS: [
    M('begin', 'bool begin(bool formatOnFail = false)',
      'Mount the filesystem. Pass true so a blank chip formats itself instead of failing.', 'begin(true)$0'),
    M('open', 'File open(const char *path, const char *mode = FILE_READ)',
      'Open a file. Modes are FILE_READ, FILE_WRITE which truncates, and FILE_APPEND.',
      'open("${1:/data.txt}", ${2:FILE_READ})$0'),
    M('exists', 'bool exists(const char *path)', 'Check a path exists.', 'exists("${1:/data.txt}")$0'),
    M('remove', 'bool remove(const char *path)', 'Delete a file.', 'remove("${1:/data.txt}");$0'),
    M('rename', 'bool rename(const char *from, const char *to)', 'Rename or move.', 'rename("${1:/a}", "${2:/b}");$0'),
    M('mkdir', 'bool mkdir(const char *path)', 'Create a directory.', 'mkdir("${1:/logs}");$0'),
    M('totalBytes', 'size_t totalBytes()', 'Size of the partition.', 'totalBytes()$0'),
    M('usedBytes', 'size_t usedBytes()', 'How much is in use.', 'usedBytes()$0'),
    M('format', 'bool format()', 'Erase everything on the partition.', 'format();$0'),
  ],

  ESPClass: [
    M('getFreeHeap', 'uint32_t getFreeHeap()', 'Free heap in bytes. Watch this fall if you have a leak.', 'getFreeHeap()$0'),
    M('getHeapSize', 'uint32_t getHeapSize()', 'Total heap.', 'getHeapSize()$0'),
    M('getMinFreeHeap', 'uint32_t getMinFreeHeap()', 'Lowest the heap has ever been.', 'getMinFreeHeap()$0'),
    M('getMaxAllocHeap', 'uint32_t getMaxAllocHeap()', 'Largest single block still available. Fragmentation shows up here.', 'getMaxAllocHeap()$0'),
    M('getPsramSize', 'size_t getPsramSize()', 'PSRAM size, zero when the board has none.', 'getPsramSize()$0'),
    M('getFreePsram', 'size_t getFreePsram()', 'Free PSRAM.', 'getFreePsram()$0'),
    M('getChipModel', 'const char *getChipModel()', 'Chip name, for example ESP32-D0WD.', 'getChipModel()$0'),
    M('getChipRevision', 'uint8_t getChipRevision()', 'Silicon revision.', 'getChipRevision()$0'),
    M('getChipCores', 'uint8_t getChipCores()', 'Core count, one or two.', 'getChipCores()$0'),
    M('getCpuFreqMHz', 'uint32_t getCpuFreqMHz()', 'Clock speed.', 'getCpuFreqMHz()$0'),
    M('getSdkVersion', 'const char *getSdkVersion()', 'ESP IDF version underneath the Arduino layer.', 'getSdkVersion()$0'),
    M('getEfuseMac', 'uint64_t getEfuseMac()', 'Factory MAC, unique per chip. Handy as a device ID.', 'getEfuseMac()$0'),
    M('getFlashChipSize', 'uint32_t getFlashChipSize()', 'Flash size in bytes.', 'getFlashChipSize()$0'),
    M('restart', 'void restart()', 'Reboot now.', 'restart();$0'),
    M('deepSleep', 'void deepSleep(uint64_t us)', 'Sleep for microseconds then restart.', 'deepSleep(${1:10} * 1000000ULL);$0'),
  ],

  WiFiClient: [
    M('connect', 'int connect(const char *host, uint16_t port)', 'Open a TCP connection.', 'connect(${1:host}, ${2:80})$0'),
    M('connected', 'uint8_t connected()', 'Still open.', 'connected()$0'),
    M('available', 'int available()', 'Bytes waiting.', 'available()$0'),
    M('read', 'int read()', 'Read a byte.', 'read()$0'),
    M('print', 'size_t print(value)', 'Send text.', 'print(${1:value});$0'),
    M('println', 'size_t println(value)', 'Send text and a newline.', 'println(${1:value});$0'),
    M('write', 'size_t write(uint8_t data)', 'Send a byte.', 'write(${1:data});$0'),
    M('stop', 'void stop()', 'Close the connection.', 'stop();$0'),
    M('setInsecure', 'void setInsecure()', 'WiFiClientSecure only. Skip certificate checking, fine for testing and wrong for production.', 'setInsecure();$0'),
    M('setCACert', 'void setCACert(const char *rootCA)', 'WiFiClientSecure only. Verify the server against a root certificate.', 'setCACert(${1:rootCA});$0'),
  ],

  Servo: [
    M('attach', 'int attach(int pin, int min = 500, int max = 2500)',
      'Bind a servo to a pin. Adjust min and max if the horn does not reach the ends.', 'attach(${1:13});$0'),
    M('write', 'void write(int value)', 'Move to an angle from 0 to 180 degrees.', 'write(${1:90});$0'),
    M('writeMicroseconds', 'void writeMicroseconds(int value)', 'Set the pulse width directly for finer control.', 'writeMicroseconds(${1:1500});$0'),
    M('read', 'int read()', 'Last angle written.', 'read()$0'),
    M('detach', 'void detach()', 'Stop driving the pin so the servo goes limp.', 'detach();$0'),
    M('attached', 'bool attached()', 'Whether a pin is bound.', 'attached()$0'),
    M('setPeriodHertz', 'void setPeriodHertz(int hertz)', 'Refresh rate. 50 for analog servos, 330 for many digital ones. Call before attach.', 'setPeriodHertz(50);$0'),
  ],

  Adafruit_NeoPixel: [
    M('begin', 'void begin()', 'Set up the data pin.', 'begin();$0'),
    M('show', 'void show()', 'Push the buffer to the strip. Nothing changes until you call this.', 'show();$0'),
    M('setPixelColor', 'void setPixelColor(uint16_t n, uint32_t color)', 'Set one pixel. Index starts at zero.', 'setPixelColor(${1:0}, ${2:strip.Color(255, 0, 0)});$0'),
    M('Color', 'uint32_t Color(uint8_t r, uint8_t g, uint8_t b)', 'Pack red, green and blue into one value.', 'Color(${1:255}, ${2:0}, ${3:0})$0'),
    M('ColorHSV', 'uint32_t ColorHSV(uint16_t hue, uint8_t sat = 255, uint8_t val = 255)', 'Build a color from hue, which makes rainbows easy.', 'ColorHSV(${1:hue})$0'),
    M('setBrightness', 'void setBrightness(uint8_t brightness)', 'Global brightness from 0 to 255. Keep it low on USB power.', 'setBrightness(${1:50});$0'),
    M('clear', 'void clear()', 'Blank the buffer. Follow with show.', 'clear();$0'),
    M('fill', 'void fill(uint32_t color, uint16_t first = 0, uint16_t count = 0)', 'Fill a run of pixels.', 'fill(${1:color});$0'),
    M('numPixels', 'uint16_t numPixels()', 'Length of the strip.', 'numPixels()$0'),
    M('getPixelColor', 'uint32_t getPixelColor(uint16_t n)', 'Read a pixel back.', 'getPixelColor(${1:0})$0'),
    M('gamma32', 'uint32_t gamma32(uint32_t x)', 'Gamma correct a color so dim values look right to the eye.', 'gamma32(${1:color})$0'),
  ],

  Adafruit_SSD1306: [
    M('begin', 'bool begin(uint8_t switchvcc = SSD1306_SWITCHCAPVCC, uint8_t i2caddr = 0)',
      'Start the panel. Most modules answer at 0x3C.', 'begin(SSD1306_SWITCHCAPVCC, 0x3C)$0'),
    M('clearDisplay', 'void clearDisplay()', 'Blank the buffer.', 'clearDisplay();$0'),
    M('display', 'void display()', 'Push the buffer to the glass. Nothing shows until you call this.', 'display();$0'),
    M('setTextSize', 'void setTextSize(uint8_t s)', 'Scale the font, 1 is six by eight pixels.', 'setTextSize(${1:1});$0'),
    M('setTextColor', 'void setTextColor(uint16_t c)', 'SSD1306_WHITE or SSD1306_BLACK.', 'setTextColor(SSD1306_WHITE);$0'),
    M('setCursor', 'void setCursor(int16_t x, int16_t y)', 'Where the next print lands.', 'setCursor(${1:0}, ${2:0});$0'),
    M('print', 'size_t print(value)', 'Draw text at the cursor.', 'print(${1:value});$0'),
    M('println', 'size_t println(value)', 'Draw text and move down a line.', 'println(${1:value});$0'),
    M('drawPixel', 'void drawPixel(int16_t x, int16_t y, uint16_t color)', 'One pixel.', 'drawPixel(${1:x}, ${2:y}, SSD1306_WHITE);$0'),
    M('drawLine', 'void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color)', 'A line.', 'drawLine(${1:0}, ${2:0}, ${3:127}, ${4:63}, SSD1306_WHITE);$0'),
    M('drawRect', 'void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color)', 'Rectangle outline.', 'drawRect(${1:0}, ${2:0}, ${3:64}, ${4:32}, SSD1306_WHITE);$0'),
    M('fillRect', 'void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color)', 'Filled rectangle.', 'fillRect(${1:0}, ${2:0}, ${3:64}, ${4:32}, SSD1306_WHITE);$0'),
    M('drawCircle', 'void drawCircle(int16_t x, int16_t y, int16_t r, uint16_t color)', 'Circle outline.', 'drawCircle(${1:64}, ${2:32}, ${3:10}, SSD1306_WHITE);$0'),
    M('fillCircle', 'void fillCircle(int16_t x, int16_t y, int16_t r, uint16_t color)', 'Filled circle.', 'fillCircle(${1:64}, ${2:32}, ${3:10}, SSD1306_WHITE);$0'),
    M('drawBitmap', 'void drawBitmap(int16_t x, int16_t y, const uint8_t *bitmap, int16_t w, int16_t h, uint16_t color)', 'Blit a one bit image.', 'drawBitmap(${1:0}, ${2:0}, ${3:logo}, ${4:128}, ${5:64}, SSD1306_WHITE);$0'),
    M('setRotation', 'void setRotation(uint8_t r)', 'Rotate the screen, 0 to 3.', 'setRotation(${1:0});$0'),
    M('invertDisplay', 'void invertDisplay(bool i)', 'Swap black and white.', 'invertDisplay(${1:true});$0'),
    M('dim', 'void dim(bool dim)', 'Lower the contrast.', 'dim(${1:true});$0'),
  ],

  PubSubClient: [
    M('setServer', 'PubSubClient &setServer(const char *domain, uint16_t port)', 'Point at a broker. 1883 is the usual plain port.', 'setServer(${1:mqttHost}, 1883);$0'),
    M('setCallback', 'PubSubClient &setCallback(MQTT_CALLBACK_SIGNATURE)', 'Function called for every message you are subscribed to.', 'setCallback(${1:onMqtt});$0'),
    M('connect', 'bool connect(const char *id)', 'Connect with a client ID that must be unique on the broker.', 'connect(${1:clientId})$0'),
    M('connected', 'bool connected()', 'Still connected.', 'connected()$0'),
    M('loop', 'bool loop()', 'Pump the client. Call it every pass or you will be dropped.', 'loop();$0'),
    M('publish', 'bool publish(const char *topic, const char *payload)', 'Send a message.', 'publish("${1:esp32/status}", "${2:online}");$0'),
    M('subscribe', 'bool subscribe(const char *topic)', 'Listen to a topic. Plus matches one level and hash matches the rest.', 'subscribe("${1:esp32/cmd}");$0'),
    M('unsubscribe', 'bool unsubscribe(const char *topic)', 'Stop listening.', 'unsubscribe("${1:topic}");$0'),
    M('disconnect', 'void disconnect()', 'Close the connection.', 'disconnect();$0'),
    M('state', 'int state()', 'Why the last connect failed, as a negative code.', 'state()$0'),
    M('setBufferSize', 'bool setBufferSize(uint16_t size)', 'Grow the packet buffer past the 256 byte default for larger payloads.', 'setBufferSize(${1:512});$0'),
    M('setKeepAlive', 'PubSubClient &setKeepAlive(uint16_t keepAlive)', 'Seconds between pings.', 'setKeepAlive(${1:30});$0'),
  ],

  DHT: [
    M('begin', 'void begin(uint8_t usec = 55)', 'Start the sensor.', 'begin();$0'),
    M('readTemperature', 'float readTemperature(bool S = false, bool force = false)',
      'Temperature in Celsius, or Fahrenheit when the first argument is true. Returns NAN on a failed read, so check with isnan.',
      'readTemperature()$0'),
    M('readHumidity', 'float readHumidity(bool force = false)', 'Relative humidity as a percentage.', 'readHumidity()$0'),
    M('computeHeatIndex', 'float computeHeatIndex(float temperature, float percentHumidity, bool isFahrenheit = true)', 'Apparent temperature.', 'computeHeatIndex(${1:t}, ${2:h}, false)$0'),
  ],

  DallasTemperature: [
    M('begin', 'void begin()', 'Scan the bus for sensors.', 'begin();$0'),
    M('requestTemperatures', 'void requestTemperatures()', 'Ask every sensor to take a reading. Call before getTemp.', 'requestTemperatures();$0'),
    M('getTempCByIndex', 'float getTempCByIndex(uint8_t index)', 'Celsius from the sensor at an index. -127 means it did not answer.', 'getTempCByIndex(0)$0'),
    M('getTempFByIndex', 'float getTempFByIndex(uint8_t index)', 'Fahrenheit from the sensor at an index.', 'getTempFByIndex(0)$0'),
    M('getDeviceCount', 'uint8_t getDeviceCount()', 'How many sensors were found.', 'getDeviceCount()$0'),
    M('setResolution', 'void setResolution(uint8_t newResolution)', 'Nine to twelve bits. Lower is faster.', 'setResolution(${1:12});$0'),
  ],

  Button2: [
    M('begin', 'void begin(int attachTo, byte buttonMode = INPUT_PULLUP, bool isCapacitive = false)', 'Attach to a pin.', 'begin(${1:pin});$0'),
    M('loop', 'void loop()', 'Poll the button. Call every pass through loop.', 'loop();$0'),
    M('setClickHandler', 'void setClickHandler(CallbackFunction f)', 'Single press callback.', 'setClickHandler(${1:onClick});$0'),
    M('setDoubleClickHandler', 'void setDoubleClickHandler(CallbackFunction f)', 'Double press callback.', 'setDoubleClickHandler(${1:onDouble});$0'),
    M('setLongClickHandler', 'void setLongClickHandler(CallbackFunction f)', 'Press and hold callback.', 'setLongClickHandler(${1:onLong});$0'),
    M('isPressed', 'bool isPressed()', 'Current state.', 'isPressed()$0'),
  ],
};

/* Objects that already exist, mapped to the member set they use. */
export const INSTANCES = {
  Serial: 'HardwareSerial', Serial1: 'HardwareSerial', Serial2: 'HardwareSerial',
  WiFi: 'WiFiClass', Wire: 'TwoWire', Wire1: 'TwoWire', SPI: 'SPIClass',
  ESP: 'ESPClass', SPIFFS: 'FS', LittleFS: 'FS', SD: 'FS', FFat: 'FS',
};

/* Class names that map onto a member set under a different name. */
export const TYPE_ALIASES = {
  HardwareSerial: 'HardwareSerial', WiFiClient: 'WiFiClient', WiFiClientSecure: 'WiFiClient',
  NetworkClient: 'WiFiClient', WebServer: 'WebServer', HTTPClient: 'HTTPClient',
  Preferences: 'Preferences', TwoWire: 'TwoWire', SPIClass: 'SPIClass', File: 'File',
  fs: 'FS', Servo: 'Servo', ESP32PWM: 'Servo',
  Adafruit_NeoPixel: 'Adafruit_NeoPixel', Adafruit_SSD1306: 'Adafruit_SSD1306',
  PubSubClient: 'PubSubClient', DHT: 'DHT', DallasTemperature: 'DallasTemperature',
  Button2: 'Button2',
};

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

export const CONSTANTS = [
  C('HIGH', 'Logic one, about 3.3V on an output.'),
  C('LOW', 'Logic zero, ground.'),
  C('INPUT', 'Pin reads, high impedance and floating until something drives it.'),
  C('OUTPUT', 'Pin drives.'),
  C('INPUT_PULLUP', 'Pin reads with an internal pull up, so it idles HIGH and a button to ground reads LOW.'),
  C('INPUT_PULLDOWN', 'Pin reads with an internal pull down, so it idles LOW. ESP32 has this where classic AVR does not.'),
  C('OUTPUT_OPEN_DRAIN', 'Pin can pull low only, for shared buses.'),
  C('LED_BUILTIN', 'The onboard LED pin. GPIO2 on many boards, so check yours.'),
  C('RISING', 'Interrupt on a low to high edge.'),
  C('FALLING', 'Interrupt on a high to low edge.'),
  C('CHANGE', 'Interrupt on either edge.'),
  C('ONLOW', 'Interrupt while the level is low.'),
  C('ONHIGH', 'Interrupt while the level is high.'),
  C('MSBFIRST', 'Most significant bit first.'),
  C('LSBFIRST', 'Least significant bit first.'),
  C('DEC', 'Print in base ten.'), C('HEX', 'Print in base sixteen.'),
  C('BIN', 'Print in base two.'), C('OCT', 'Print in base eight.'),
  C('SERIAL_8N1', 'Eight data bits, no parity, one stop bit. The normal choice.'),
  C('T0', 'Touch channel 0, which is GPIO4.'), C('T1', 'Touch channel 1, GPIO0.'),
  C('T2', 'Touch channel 2, GPIO2.'), C('T3', 'Touch channel 3, GPIO15.'),
  C('T4', 'Touch channel 4, GPIO13.'), C('T5', 'Touch channel 5, GPIO12.'),
  C('T6', 'Touch channel 6, GPIO14.'), C('T7', 'Touch channel 7, GPIO27.'),
  C('T8', 'Touch channel 8, GPIO33.'), C('T9', 'Touch channel 9, GPIO32.'),
  C('ADC_0db', 'ADC range up to about 0.75V, best resolution.'),
  C('ADC_2_5db', 'ADC range up to about 1.05V.'),
  C('ADC_6db', 'ADC range up to about 1.3V.'),
  C('ADC_11db', 'ADC range up to about 2.5V. The default and the one you usually want.'),
  C('WL_CONNECTED', 'WiFi is joined.', 'WiFi.h'),
  C('WL_IDLE_STATUS', 'WiFi is idle.', 'WiFi.h'),
  C('WL_NO_SSID_AVAIL', 'That network was not found.', 'WiFi.h'),
  C('WL_CONNECT_FAILED', 'Wrong password, usually.', 'WiFi.h'),
  C('WL_CONNECTION_LOST', 'Was joined, then dropped.', 'WiFi.h'),
  C('WL_DISCONNECTED', 'Not joined.', 'WiFi.h'),
  C('WIFI_STA', 'Station mode, join someone else network.', 'WiFi.h'),
  C('WIFI_AP', 'Access point mode, be the network.', 'WiFi.h'),
  C('WIFI_AP_STA', 'Both at once.', 'WiFi.h'),
  C('WIFI_OFF', 'Radio off.', 'WiFi.h'),
  C('WIFI_POWER_19_5dBm', 'Maximum transmit power.', 'WiFi.h'),
  C('WIFI_POWER_11dBm', 'Reduced transmit power for lower current.', 'WiFi.h'),
  C('HTTP_GET', 'GET route.', 'WebServer.h'), C('HTTP_POST', 'POST route.', 'WebServer.h'),
  C('HTTP_ANY', 'Any method.', 'WebServer.h'),
  C('FILE_READ', 'Open for reading.'), C('FILE_WRITE', 'Open for writing, truncating what was there.'),
  C('FILE_APPEND', 'Open for writing at the end.'),
  C('SSD1306_SWITCHCAPVCC', 'Generate the panel voltage internally, which is what breakout boards want.', 'Adafruit_SSD1306.h'),
  C('SSD1306_WHITE', 'Lit pixel.', 'Adafruit_SSD1306.h'),
  C('SSD1306_BLACK', 'Dark pixel.', 'Adafruit_SSD1306.h'),
  C('NEO_GRB', 'Green red blue byte order, correct for most WS2812.', 'Adafruit_NeoPixel.h'),
  C('NEO_RGB', 'Red green blue byte order.', 'Adafruit_NeoPixel.h'),
  C('NEO_GRBW', 'Four channel strips with a white LED.', 'Adafruit_NeoPixel.h'),
  C('NEO_KHZ800', '800 kHz data rate, correct for WS2812B.', 'Adafruit_NeoPixel.h'),
  C('SPI_MODE0', 'Clock idles low, sample on the rising edge.'),
  C('portMAX_DELAY', 'Wait forever in a FreeRTOS call.'),
  C('IRAM_ATTR', 'Put this function in instruction RAM. Required on interrupt handlers.'),
  C('GPIO_NUM_33', 'GPIO 33 as an enum, which the sleep and RTC functions require.'),
  C('ESP_EXT1_WAKEUP_ANY_HIGH', 'Wake when any listed pin goes high.'),
  C('ESP_EXT1_WAKEUP_ALL_LOW', 'Wake when all listed pins are low.'),
  C('ESP_SLEEP_WAKEUP_TIMER', 'Woken by the sleep timer.'),
  C('ESP_SLEEP_WAKEUP_EXT0', 'Woken by a single pin.'),
  C('ESP_SLEEP_WAKEUP_TOUCHPAD', 'Woken by a touch pin.'),
  C('SDA', 'Default I2C data pin for this board.'),
  C('SCL', 'Default I2C clock pin for this board.'),
  C('MOSI', 'Default SPI data out pin.'), C('MISO', 'Default SPI data in pin.'),
  C('SCK', 'Default SPI clock pin.'), C('SS', 'Default SPI chip select pin.'),
  C('TX', 'Default UART transmit pin.'), C('RX', 'Default UART receive pin.'),
];

/* ------------------------------------------------------------------ */
/* types and keywords                                                  */
/* ------------------------------------------------------------------ */

export const TYPES = [
  T('uint8_t', 'Unsigned byte, 0 to 255. Use this for pins and raw bytes.'),
  T('int8_t', 'Signed byte, -128 to 127.'),
  T('uint16_t', 'Unsigned, 0 to 65535.'), T('int16_t', 'Signed, -32768 to 32767.'),
  T('uint32_t', 'Unsigned 32 bit. What millis returns.'), T('int32_t', 'Signed 32 bit.'),
  T('uint64_t', 'Unsigned 64 bit. Sleep times use this.'), T('int64_t', 'Signed 64 bit.'),
  T('bool', 'true or false.'), T('char', 'One character.'),
  T('byte', 'Arduino alias for uint8_t.'), T('word', 'Arduino alias for uint16_t.'),
  T('int', '32 bit signed on ESP32, unlike the 16 bit int on an Uno.'),
  T('unsigned int', '32 bit unsigned on ESP32.'),
  T('long', '32 bit signed.'), T('unsigned long', '32 bit unsigned. Use it for millis values.'),
  T('float', 'Single precision decimal. The ESP32 has hardware float, so this is cheap.'),
  T('double', 'On ESP32 this is the same as float in practice.'),
  T('void', 'No value.'), T('size_t', 'Unsigned size or count.'),
  T('String', 'Arduino string object. Convenient, but it fragments the heap if you build it in a tight loop.'),
  T('IPAddress', 'Four byte network address.'),
  T('File', 'Open file handle.'), T('Preferences', 'Key value storage in flash.'),
  T('WiFiClient', 'TCP socket.'), T('WiFiClientSecure', 'TLS socket.'),
  T('WiFiServer', 'Listening TCP socket.'), T('WebServer', 'Simple blocking HTTP server.'),
  T('HTTPClient', 'HTTP request helper.'), T('TaskHandle_t', 'Handle to a FreeRTOS task.'),
  T('QueueHandle_t', 'Handle to a FreeRTOS queue.'), T('SemaphoreHandle_t', 'Handle to a mutex or semaphore.'),
  T('volatile', 'Tell the compiler this can change behind its back. Required on variables shared with an interrupt.'),
  T('portMUX_TYPE', 'Spinlock for guarding data shared with an interrupt.'),
];

export const KEYWORDS = [
  K('if', 'Conditional.'), K('else', 'Otherwise.'), K('for', 'Counted loop.'),
  K('while', 'Loop while true.'), K('do', 'Loop that runs at least once.'),
  K('switch', 'Branch on a value.'), K('case', 'One branch.'), K('default', 'Fallback branch.'),
  K('break', 'Leave the loop or switch.'), K('continue', 'Skip to the next pass.'),
  K('return', 'Hand a value back.'), K('const', 'Cannot be changed.'),
  K('static', 'Keeps its value between calls, and stays private to the file.'),
  K('constexpr', 'Computed at compile time.'), K('struct', 'Group of fields.'),
  K('class', 'Type with data and methods.'), K('enum', 'Named set of values.'),
  K('typedef', 'Alias for a type.'), K('sizeof', 'Size of a type or value in bytes.'),
  K('true', 'Boolean true.'), K('false', 'Boolean false.'),
  K('NULL', 'Null pointer, C style.'), K('nullptr', 'Null pointer, the C++ way.'),
  K('#include', 'Pull in a header.'), K('#define', 'Text substitution before compiling.'),
  K('#ifdef', 'Compile this only when a macro exists.'), K('#endif', 'End a conditional block.'),
  K('#pragma once', 'Include this header only once.'),
];

/* ------------------------------------------------------------------ */
/* snippets, the real time savers                                      */
/* ------------------------------------------------------------------ */

const S = (name, doc, insert, include) => ({ name, kind: 'snippet', doc, insert, include });

export const SNIPPETS = [
  S('sketch', 'Empty setup and loop skeleton with serial started.',
`void setup() {
  Serial.begin(115200);
  \${1}
}

void loop() {
  \${0}
}`),

  S('wifi', 'Join a network and wait, printing dots while it tries.',
`const char* ssid     = "\${1:your-network}";
const char* password = "\${2:your-password}";

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(300);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\\nConnected, IP is ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\\nCould not connect. Check the name and password.");
  }
}\${0}`, 'WiFi.h'),

  S('softap', 'Become an access point so a phone can connect directly.',
`void startAP() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP("\${1:ESP32-Setup}", "\${2:12345678}");
  Serial.print("Access point up at ");
  Serial.println(WiFi.softAPIP());
}\${0}`, 'WiFi.h'),

  S('timer', 'Non blocking repeat using millis, so the rest of loop keeps running.',
`static uint32_t last\${1:Tick} = 0;
const uint32_t \${2:interval} = \${3:1000};

if (millis() - last\${1:Tick} >= \${2:interval}) {
  last\${1:Tick} = millis();
  \${0}
}`),

  S('debounce', 'Read a button without the noise of contact bounce.',
`const uint8_t BUTTON_PIN = \${1:0};
bool lastReading = HIGH;
bool stableState = HIGH;
uint32_t lastChange = 0;

void pollButton() {
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastReading) {
    lastReading = reading;
    lastChange = millis();
  }
  if (millis() - lastChange > 30 && reading != stableState) {
    stableState = reading;
    if (stableState == LOW) {
      \${0}
    }
  }
}`),

  S('interrupt', 'Count pulses in an interrupt and read the count safely from loop.',
`volatile uint32_t pulses = 0;
portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR onPulse() {
  portENTER_CRITICAL_ISR(&pulseMux);
  pulses++;
  portEXIT_CRITICAL_ISR(&pulseMux);
}

void setupPulseCounter() {
  pinMode(\${1:pin}, INPUT_PULLUP);
  attachInterrupt(\${1:pin}, onPulse, FALLING);
}

uint32_t readPulses() {
  portENTER_CRITICAL(&pulseMux);
  uint32_t value = pulses;
  portEXIT_CRITICAL(&pulseMux);
  return value;
}\${0}`),

  S('deepsleep', 'Sleep for a set time and remember how many times you woke.',
`RTC_DATA_ATTR int wakeCount = 0;

void sleepFor(uint32_t seconds) {
  wakeCount++;
  Serial.printf("Wake number %d, sleeping %lu s\\n", wakeCount, seconds);
  Serial.flush();
  esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000ULL);
  esp_deep_sleep_start();
}\${0}`),

  S('task', 'Run work on its own FreeRTOS task, pinned to a core.',
`void \${1:workerTask}(void *param) {
  for (;;) {
    \${2:// work here}
    vTaskDelay(pdMS_TO_TICKS(\${3:100}));
  }
}

// call this from setup
// xTaskCreatePinnedToCore(\${1:workerTask}, "\${1:workerTask}", 4096, NULL, 1, NULL, \${4:0});\${0}`),

  S('i2cscan', 'Find every I2C device on the bus and print its address.',
`void scanI2C() {
  Wire.begin(\${1:21}, \${2:22});
  Serial.println("Scanning I2C");
  uint8_t found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  found 0x%02X\\n", addr);
      found++;
    }
  }
  Serial.printf("%u device(s)\\n", found);
}\${0}`, 'Wire.h'),

  S('prefs', 'Save a value to flash and read it back after a reboot.',
`#include <Preferences.h>
Preferences prefs;

void saveSetting(int value) {
  prefs.begin("\${1:app}", false);
  prefs.putInt("\${2:key}", value);
  prefs.end();
}

int loadSetting() {
  prefs.begin("\${1:app}", true);
  int value = prefs.getInt("\${2:key}", \${3:0});
  prefs.end();
  return value;
}\${0}`, 'Preferences.h'),

  S('webserver', 'Small HTTP server with one page and one JSON endpoint.',
`#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);

void handleRoot() {
  server.send(200, "text/html", "<h1>\${1:ESP32}</h1>");
}

void handleStatus() {
  String json = "{\\"uptime\\":" + String(millis()) +
                ",\\"heap\\":" + String(ESP.getFreeHeap()) + "}";
  server.send(200, "application/json", json);
}

void startServer() {
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.onNotFound([]() { server.send(404, "text/plain", "not found"); });
  server.begin();
}
// remember server.handleClient() in loop\${0}`, 'WebServer.h'),

  S('httpget', 'Fetch a URL and print what came back.',
`#include <HTTPClient.h>

void fetch(const char *url) {
  HTTPClient http;
  http.begin(url);
  int code = http.GET();
  if (code > 0) {
    Serial.printf("HTTP %d\\n", code);
    Serial.println(http.getString());
  } else {
    Serial.printf("Request failed: %s\\n", http.errorToString(code).c_str());
  }
  http.end();
}\${0}`, 'HTTPClient.h'),

  S('mqtt', 'Connect to an MQTT broker, subscribe and republish.',
`#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient net;
PubSubClient mqtt(net);

void onMqtt(char *topic, byte *payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  Serial.printf("%s -> %s\\n", topic, msg.c_str());
}

void connectMqtt() {
  mqtt.setServer("\${1:broker.local}", 1883);
  mqtt.setCallback(onMqtt);
  while (!mqtt.connected()) {
    String id = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqtt.connect(id.c_str())) {
      mqtt.subscribe("\${2:esp32/cmd}");
    } else {
      delay(2000);
    }
  }
}
// remember mqtt.loop() in loop\${0}`, 'PubSubClient.h'),

  S('ota', 'Update firmware over WiFi instead of plugging in the cable.',
`#include <WiFi.h>
#include <ArduinoOTA.h>

void startOTA() {
  ArduinoOTA.setHostname("\${1:esp32}");
  ArduinoOTA.onStart([]() { Serial.println("OTA starting"); });
  ArduinoOTA.onEnd([]() { Serial.println("OTA done"); });
  ArduinoOTA.onProgress([](unsigned int done, unsigned int total) {
    Serial.printf("OTA %u%%\\r", done * 100 / total);
  });
  ArduinoOTA.begin();
}
// remember ArduinoOTA.handle() in loop\${0}`, 'ArduinoOTA.h'),

  S('neopixel', 'Drive an addressable LED strip.',
`#include <Adafruit_NeoPixel.h>

#define LED_PIN   \${1:5}
#define LED_COUNT \${2:16}

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

void setupStrip() {
  strip.begin();
  strip.setBrightness(40);
  strip.show();
}

void rainbow(uint16_t offset) {
  for (int i = 0; i < strip.numPixels(); i++) {
    uint16_t hue = offset + (i * 65536L / strip.numPixels());
    strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(hue)));
  }
  strip.show();
}\${0}`, 'Adafruit_NeoPixel.h'),

  S('oled', 'Print text on a small I2C OLED.',
`#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setupDisplay() {
  Wire.begin(\${1:21}, \${2:22});
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("No display at 0x3C. Try 0x3D.");
    return;
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("\${3:hello}");
  display.display();
}\${0}`, 'Adafruit_SSD1306.h'),

  S('serialcmd', 'Read newline terminated commands from the serial monitor.',
`void handleCommand(const String &cmd) {
  if (cmd == "on")        digitalWrite(LED_BUILTIN, HIGH);
  else if (cmd == "off")  digitalWrite(LED_BUILTIN, LOW);
  else if (cmd == "heap") Serial.println(ESP.getFreeHeap());
  else                    Serial.println("commands: on, off, heap");
}

void pollSerial() {
  static String line;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\\n' || c == '\\r') {
      line.trim();
      if (line.length()) handleCommand(line);
      line = "";
    } else {
      line += c;
    }
  }
}\${0}`),

  S('plot', 'Print values in the shape the plotter graphs, as name colon value pairs.',
`Serial.printf("\${1:temp}:%.2f,\${2:humidity}:%.2f\\n", \${3:t}, \${4:h});\${0}`),

  S('espnow', 'Send a struct straight to another ESP32 with no router involved.',
`#include <WiFi.h>
#include <esp_now.h>

typedef struct { int id; float value; } Packet;

uint8_t peerMac[] = { 0x\${1:FF}, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };

void onSent(const uint8_t *mac, esp_now_send_status_t status) {
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "sent" : "failed");
}

void setupEspNow() {
  WiFi.mode(WIFI_STA);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init failed"); return; }
  esp_now_register_send_cb(onSent);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, peerMac, 6);
  peer.channel = 0;
  peer.encrypt = false;
  esp_now_add_peer(&peer);
}

void sendPacket(int id, float value) {
  Packet p = { id, value };
  esp_now_send(peerMac, (uint8_t *)&p, sizeof(p));
}\${0}`, 'esp_now.h'),

  S('bleserver', 'BLE server with one characteristic a phone can read and subscribe to.',
`#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#define SERVICE_UUID "\${1:4fafc201-1fb5-459e-8fcc-c5c9c331914b}"
#define CHAR_UUID    "\${2:beb5483e-36e1-4688-b7f5-ea07361b26a8}"

BLECharacteristic *characteristic;

void setupBLE() {
  BLEDevice::init("\${3:ESP32}");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService(SERVICE_UUID);
  characteristic = service->createCharacteristic(
      CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  characteristic->setValue("ready");
  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void notify(const String &value) {
  characteristic->setValue(value.c_str());
  characteristic->notify();
}\${0}`, 'BLEDevice.h'),

  S('blescan', 'Scan for nearby BLE devices and print what is advertising.',
`#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    Serial.printf("%s  rssi %d  %s\\n",
                  dev.getAddress().toString().c_str(),
                  dev.getRSSI(),
                  dev.haveName() ? dev.getName().c_str() : "");
  }
};

void scanBLE(uint32_t seconds) {
  BLEDevice::init("");
  BLEScan *scan = BLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new ScanCallbacks());
  scan->setActiveScan(true);
  scan->setInterval(100);
  scan->setWindow(99);
  scan->start(seconds, false);
  scan->clearResults();
}\${0}`, 'BLEDevice.h'),

  S('littlefs', 'Write a file to flash and read it back.',
`#include <LittleFS.h>

void fsDemo() {
  if (!LittleFS.begin(true)) { Serial.println("mount failed"); return; }

  File f = LittleFS.open("/\${1:log.txt}", FILE_APPEND);
  if (f) { f.printf("boot at %lu\\n", millis()); f.close(); }

  f = LittleFS.open("/\${1:log.txt}", FILE_READ);
  while (f && f.available()) Serial.println(f.readStringUntil('\\n'));
  if (f) f.close();

  Serial.printf("%u of %u bytes used\\n", LittleFS.usedBytes(), LittleFS.totalBytes());
}\${0}`, 'LittleFS.h'),

  S('pwm', 'Fade an LED with hardware PWM.',
`void setupPWM() {
  ledcAttach(\${1:2}, \${2:5000}, \${3:12});   // pin, frequency, resolution bits
}

void fade() {
  for (int duty = 0; duty <= 4095; duty += 32) {
    ledcWrite(\${1:2}, duty);
    delay(8);
  }
  for (int duty = 4095; duty >= 0; duty -= 32) {
    ledcWrite(\${1:2}, duty);
    delay(8);
  }
}\${0}`),

  S('diag', 'Print a boot report you will want the first time something is wrong.',
`void printDiag() {
  Serial.println();
  Serial.printf("chip     %s rev %d, %d core(s)\\n",
                ESP.getChipModel(), ESP.getChipRevision(), ESP.getChipCores());
  Serial.printf("cpu      %lu MHz\\n", getCpuFrequencyMHz());
  Serial.printf("flash    %lu bytes\\n", ESP.getFlashChipSize());
  Serial.printf("heap     %lu free of %lu\\n", ESP.getFreeHeap(), ESP.getHeapSize());
  Serial.printf("psram    %u bytes\\n", ESP.getPsramSize());
  Serial.printf("mac      %012llX\\n", ESP.getEfuseMac());
  Serial.printf("sdk      %s\\n", ESP.getSdkVersion());
  Serial.printf("reset    %d\\n", esp_reset_reason());
}\${0}`),
];

/* ------------------------------------------------------------------ */
/* library headers, so include suggestions know what exists            */
/* ------------------------------------------------------------------ */

export const HEADERS = [
  ['WiFi.h', 'WiFi station and access point.'],
  ['WiFiClientSecure.h', 'TLS sockets for https and secure MQTT.'],
  ['WiFiMulti.h', 'Try several networks and take the strongest.'],
  ['WebServer.h', 'Simple blocking HTTP server, bundled with the core.'],
  ['HTTPClient.h', 'Make HTTP requests.'],
  ['ESPmDNS.h', 'Answer to a name like esp32.local.'],
  ['ArduinoOTA.h', 'Firmware updates over WiFi.'],
  ['Update.h', 'The flash writing layer under OTA.'],
  ['Wire.h', 'I2C.'], ['SPI.h', 'SPI.'],
  ['Preferences.h', 'Key value storage in flash.'],
  ['SPIFFS.h', 'Older flash filesystem.'], ['LittleFS.h', 'Flash filesystem, more robust than SPIFFS.'],
  ['FS.h', 'Filesystem base classes.'], ['SD.h', 'SD card over SPI.'], ['SD_MMC.h', 'SD card over the faster SDMMC bus.'],
  ['esp_now.h', 'Direct ESP32 to ESP32 radio messages.'],
  ['esp_sleep.h', 'Sleep and wake sources.'],
  ['esp_system.h', 'Reset reasons, chip info.'],
  ['esp_task_wdt.h', 'Task watchdog.'],
  ['driver/gpio.h', 'IDF level GPIO.'], ['driver/ledc.h', 'IDF level PWM.'],
  ['driver/rtc_io.h', 'RTC pin control for deep sleep.'],
  ['BLEDevice.h', 'Bluedroid BLE, feature complete and large.'],
  ['NimBLEDevice.h', 'NimBLE, same job in far less flash.'],
  ['BluetoothSerial.h', 'Classic Bluetooth serial. ESP32 only, not on S3 or C3.'],
  ['Adafruit_NeoPixel.h', 'Addressable LEDs.'], ['FastLED.h', 'Addressable LEDs with effects.'],
  ['Adafruit_GFX.h', 'Shared drawing primitives.'], ['Adafruit_SSD1306.h', 'Monochrome OLED.'],
  ['TFT_eSPI.h', 'Fast colour TFT panels.'],
  ['ArduinoJson.h', 'Build and parse JSON.'],
  ['PubSubClient.h', 'MQTT.'], ['ESPAsyncWebServer.h', 'Async HTTP and WebSocket server.'],
  ['DHT.h', 'DHT11 and DHT22 sensors.'], ['OneWire.h', '1-Wire bus.'],
  ['DallasTemperature.h', 'DS18B20 sensors.'],
  ['ESP32Servo.h', 'Servos using LEDC.'], ['Servo.h', 'Servo, when the ESP32 variant provides it.'],
  ['Adafruit_BME280.h', 'Temperature, pressure and humidity.'],
  ['Adafruit_Sensor.h', 'Unified sensor interface.'],
  ['WiFiManager.h', 'Captive portal for WiFi setup.'],
  ['IRremote.h', 'Infrared send and receive.'],
  ['Button2.h', 'Debounced buttons with click types.'],
  ['freertos/FreeRTOS.h', 'FreeRTOS core.'], ['freertos/task.h', 'Tasks.'],
  ['freertos/queue.h', 'Queues.'], ['freertos/semphr.h', 'Semaphores and mutexes.'],
].map(([name, doc]) => ({ name, kind: 'header', doc }));

/* Which header a type needs, used to insert includes automatically. */
export const TYPE_INCLUDES = {
  WiFiClient: 'WiFi.h', WiFiClientSecure: 'WiFiClientSecure.h', WiFiServer: 'WiFi.h',
  WebServer: 'WebServer.h', HTTPClient: 'HTTPClient.h', Preferences: 'Preferences.h',
  Servo: 'ESP32Servo.h', Adafruit_NeoPixel: 'Adafruit_NeoPixel.h',
  Adafruit_SSD1306: 'Adafruit_SSD1306.h', PubSubClient: 'PubSubClient.h',
  DHT: 'DHT.h', OneWire: 'OneWire.h', DallasTemperature: 'DallasTemperature.h',
  Button2: 'Button2.h', TFT_eSPI: 'TFT_eSPI.h', JsonDocument: 'ArduinoJson.h',
  BLEDevice: 'BLEDevice.h', BLEServer: 'BLEDevice.h', BLECharacteristic: 'BLEDevice.h',
  AsyncWebServer: 'ESPAsyncWebServer.h', Adafruit_BME280: 'Adafruit_BME280.h',
};

/* Objects that need an include even though they look built in. */
export const INSTANCE_INCLUDES = {
  WiFi: 'WiFi.h', Wire: 'Wire.h', Wire1: 'Wire.h', SPI: 'SPI.h',
  SPIFFS: 'SPIFFS.h', LittleFS: 'LittleFS.h', SD: 'SD.h', MDNS: 'ESPmDNS.h',
  ArduinoOTA: 'ArduinoOTA.h', Update: 'Update.h',
};

/* ------------------------------------------------------------------ */

export const ALL_GLOBAL = [
  ...GLOBALS, ...CONSTANTS, ...TYPES, ...KEYWORDS, ...SNIPPETS,
  ...Object.keys(INSTANCES).map((n) => ({
    name: n, kind: 'object', doc: 'Built in object of type ' + INSTANCES[n] + '.',
    include: INSTANCE_INCLUDES[n] || null,
  })),
];

export function membersFor(typeName) {
  if (!typeName) return null;
  const key = TYPE_ALIASES[typeName] || typeName;
  return MEMBERS[key] || null;
}
