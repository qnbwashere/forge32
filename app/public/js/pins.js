/* What each GPIO can do, and which ones will bite you.
 * The warnings here are the ones that actually cost people evenings.
 */

const CHIPS = {};

function chip(id, meta, pins) {
  const map = new Map();
  for (const p of pins) map.set(p.gpio, p);
  CHIPS[id] = { id, ...meta, pins, map };
}

const P = (gpio, flags = {}, note = '') => ({ gpio, ...flags, note });

/* ------------------------------------------------------------------ */
/* ESP32, the original WROOM and WROVER                                */
/* ------------------------------------------------------------------ */

chip('ESP32', {
  label: 'ESP32',
  cores: 2,
  maxGpio: 39,
  dac: [25, 26],
  touch: [0, 2, 4, 12, 13, 14, 15, 27, 32, 33],
  adc1: [32, 33, 34, 35, 36, 37, 38, 39],
  adc2: [0, 2, 4, 12, 13, 14, 15, 25, 26, 27],
  defaults: { sda: 21, scl: 22, sck: 18, miso: 19, mosi: 23, cs: 5, tx: 1, rx: 3, led: 2 },
}, [
  P(0, { strapping: true, adc2: 1, touch: 1, rtc: true },
    'Boot select. Held LOW at reset the chip enters flash download mode, which is what the BOOT button does. Fine as an input after boot, but never pull it low with a resistor.'),
  P(1, { uart0: true }, 'UART0 TX, wired to the USB chip. Use it and you lose the serial monitor.'),
  P(2, { strapping: true, adc2: 2, touch: 2, rtc: true, led: true },
    'Onboard LED on most dev boards. Also a strapping pin, so do not hold it high while entering download mode.'),
  P(3, { uart0: true }, 'UART0 RX, wired to the USB chip. Sits HIGH at boot.'),
  P(4, { adc2: 0, touch: 0, rtc: true }, 'Free and well behaved.'),
  P(5, { strapping: true }, 'Default SPI chip select. Outputs a PWM burst at boot, so do not drive a relay or servo from it.'),
  P(6, { flash: true }, 'Wired to the flash chip inside the module. Using it crashes the board.'),
  P(7, { flash: true }, 'Wired to the flash chip inside the module.'),
  P(8, { flash: true }, 'Wired to the flash chip inside the module.'),
  P(9, { flash: true }, 'Wired to the flash chip. Sometimes exposed on the header as a trap.'),
  P(10, { flash: true }, 'Wired to the flash chip.'),
  P(11, { flash: true }, 'Wired to the flash chip.'),
  P(12, { strapping: true, adc2: 5, touch: 5, rtc: true, jtag: true },
    'Sets the internal flash voltage at boot. Pulling it high can brick a boot on some modules. Avoid it if you have another choice.'),
  P(13, { adc2: 4, touch: 4, rtc: true, jtag: true }, 'Free. JTAG TCK if you ever debug with hardware.'),
  P(14, { adc2: 6, touch: 6, rtc: true, jtag: true }, 'Outputs a PWM burst at boot.'),
  P(15, { strapping: true, adc2: 3, touch: 3, rtc: true, jtag: true },
    'Held LOW at boot this silences the bootloader log. Also outputs a PWM burst at boot.'),
  P(16, { psram: true }, 'Free on WROOM. On a WROVER this is PSRAM, so keep clear if your board has extra RAM.'),
  P(17, { psram: true }, 'Free on WROOM. PSRAM on a WROVER.'),
  P(18, {}, 'Default SPI clock. Free if you are not using SPI.'),
  P(19, {}, 'Default SPI MISO.'),
  P(21, { i2c: 'sda' }, 'Default I2C data.'),
  P(22, { i2c: 'scl' }, 'Default I2C clock.'),
  P(23, {}, 'Default SPI MOSI.'),
  P(25, { dac: 1, adc2: 8, rtc: true }, 'DAC channel 1, true analog out.'),
  P(26, { dac: 2, adc2: 9, rtc: true }, 'DAC channel 2, true analog out.'),
  P(27, { adc2: 7, touch: 7, rtc: true }, 'Free and well behaved.'),
  P(32, { adc1: 4, touch: 9, rtc: true }, 'Good general purpose pin. ADC1, so it keeps working with WiFi on.'),
  P(33, { adc1: 5, touch: 8, rtc: true }, 'Good general purpose pin. ADC1, so it keeps working with WiFi on.'),
  P(34, { adc1: 6, rtc: true, inputOnly: true }, 'Input only. No output, no internal pull up or pull down.'),
  P(35, { adc1: 7, rtc: true, inputOnly: true }, 'Input only. No output, no internal pull resistors.'),
  P(36, { adc1: 0, rtc: true, inputOnly: true }, 'Input only, labelled VP or SVP on some boards.'),
  P(37, { adc1: 1, rtc: true, inputOnly: true, rare: true }, 'Input only and usually not brought out to the header.'),
  P(38, { adc1: 2, rtc: true, inputOnly: true, rare: true }, 'Input only and usually not brought out to the header.'),
  P(39, { adc1: 3, rtc: true, inputOnly: true }, 'Input only, labelled VN or SVN on some boards.'),
]);

/* ------------------------------------------------------------------ */
/* ESP32-S3                                                            */
/* ------------------------------------------------------------------ */

chip('ESP32-S3', {
  label: 'ESP32-S3',
  cores: 2,
  maxGpio: 48,
  dac: [],
  touch: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  adc1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  adc2: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  defaults: { sda: 8, scl: 9, sck: 12, miso: 13, mosi: 11, cs: 10, tx: 43, rx: 44, led: 48 },
}, [
  P(0, { strapping: true, rtc: true }, 'Boot button on most boards. Held LOW at reset it enters download mode.'),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) =>
    P(g, { adc1: g, touch: g, rtc: true }, 'ADC1 and touch capable. Safe to read while WiFi is on.')),
  P(11, { adc2: 1, touch: 11, rtc: true }, 'ADC2, so a read here fails while WiFi is running.'),
  P(12, { adc2: 2, touch: 12, rtc: true }, 'ADC2. Also the default SPI clock on many boards.'),
  P(13, { adc2: 3, touch: 13, rtc: true }, 'ADC2.'),
  P(14, { adc2: 4, touch: 14, rtc: true }, 'ADC2.'),
  P(15, { adc2: 5, rtc: true }, 'ADC2.'),
  P(16, { adc2: 6, rtc: true }, 'ADC2.'),
  P(17, { adc2: 7, rtc: true }, 'ADC2.'),
  P(18, { adc2: 8, rtc: true }, 'ADC2.'),
  P(19, { adc2: 9, rtc: true, usb: true }, 'USB D minus. Leave it alone on boards that flash over native USB.'),
  P(20, { adc2: 10, rtc: true, usb: true }, 'USB D plus. Leave it alone on boards that flash over native USB.'),
  P(21, {}, 'Free.'),
  ...[26, 27, 28, 29, 30, 31, 32].map((g) =>
    P(g, { flash: true }, 'Wired to the internal flash. Using it crashes the board.')),
  ...[33, 34, 35, 36, 37].map((g) =>
    P(g, { psram: true }, 'Octal PSRAM on N8R8 and N16R8 modules. Free only if your module has no PSRAM or quad PSRAM.')),
  ...[38, 39, 40, 41, 42].map((g) => P(g, { jtag: g >= 39 && g <= 42 }, 'Free. Part of the JTAG group.')),
  P(43, { uart0: true }, 'UART0 TX.'),
  P(44, { uart0: true }, 'UART0 RX.'),
  P(45, { strapping: true }, 'Strapping pin, sets the internal voltage at boot.'),
  P(46, { strapping: true, inputOnly: true }, 'Input only and a strapping pin.'),
  P(47, {}, 'Free.'),
  P(48, { led: true }, 'Addressable RGB LED on many S3 boards.'),
]);

/* ------------------------------------------------------------------ */
/* ESP32-C3                                                            */
/* ------------------------------------------------------------------ */

chip('ESP32-C3', {
  label: 'ESP32-C3',
  cores: 1,
  maxGpio: 21,
  dac: [],
  touch: [],
  adc1: [0, 1, 2, 3, 4],
  adc2: [5],
  defaults: { sda: 8, scl: 9, sck: 4, miso: 5, mosi: 6, cs: 7, tx: 21, rx: 20, led: 8 },
}, [
  P(0, { adc1: 0, rtc: true }, 'ADC1.'),
  P(1, { adc1: 1, rtc: true }, 'ADC1.'),
  P(2, { adc1: 2, rtc: true, strapping: true }, 'ADC1 and a strapping pin. Must be high or floating at boot.'),
  P(3, { adc1: 3, rtc: true }, 'ADC1.'),
  P(4, { adc1: 4, rtc: true }, 'ADC1.'),
  P(5, { adc2: 0 }, 'ADC2, so a read here fails while WiFi is running.'),
  P(6, {}, 'Free.'), P(7, {}, 'Free.'),
  P(8, { strapping: true, led: true }, 'Onboard LED on many C3 boards, and a strapping pin that must be high at boot.'),
  P(9, { strapping: true }, 'Boot button. Held LOW at reset it enters download mode.'),
  P(10, {}, 'Free.'),
  P(11, { vdd: true }, 'Powers the flash on most modules. Do not touch.'),
  ...[12, 13, 14, 15, 16, 17].map((g) => P(g, { flash: true }, 'Wired to the internal flash.')),
  P(18, { usb: true }, 'USB D minus.'), P(19, { usb: true }, 'USB D plus.'),
  P(20, { uart0: true }, 'UART0 RX.'), P(21, { uart0: true }, 'UART0 TX.'),
]);

/* ------------------------------------------------------------------ */
/* lighter tables for the newer parts                                  */
/* ------------------------------------------------------------------ */

chip('ESP32-C6', {
  label: 'ESP32-C6', cores: 1, maxGpio: 30, dac: [], touch: [],
  adc1: [0, 1, 2, 3, 4, 5, 6], adc2: [],
  defaults: { sda: 6, scl: 7, sck: 6, miso: 5, mosi: 7, cs: 4, tx: 16, rx: 17, led: 8 },
}, [
  ...[0, 1, 2, 3, 4, 5, 6].map((g) => P(g, { adc1: g, rtc: true, strapping: g === 4 || g === 5 },
    'ADC1 capable.' + (g === 4 || g === 5 ? ' Also a strapping pin.' : ''))),
  P(7, {}, 'Free.'),
  P(8, { strapping: true, led: true }, 'Onboard LED on many boards, and a strapping pin.'),
  P(9, { strapping: true }, 'Boot button.'),
  P(10, {}, 'Free.'), P(11, {}, 'Free.'),
  P(12, { usb: true }, 'USB D minus.'), P(13, { usb: true }, 'USB D plus.'),
  P(15, { strapping: true }, 'Strapping pin.'),
  P(16, { uart0: true }, 'UART0 TX.'), P(17, { uart0: true }, 'UART0 RX.'),
  P(18, {}, 'Free.'), P(19, {}, 'Free.'), P(20, {}, 'Free.'), P(21, {}, 'Free.'),
  P(22, {}, 'Free.'), P(23, {}, 'Free.'),
  ...[24, 25, 26, 27, 28, 29, 30].map((g) => P(g, { flash: true }, 'Wired to the internal flash.')),
]);

chip('ESP32-S2', {
  label: 'ESP32-S2', cores: 1, maxGpio: 46, dac: [17, 18],
  touch: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  adc1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], adc2: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  defaults: { sda: 8, scl: 9, sck: 36, miso: 37, mosi: 35, cs: 34, tx: 43, rx: 44, led: 15 },
}, [
  P(0, { strapping: true }, 'Boot button.'),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => P(g, { adc1: g, touch: g, rtc: true }, 'ADC1 and touch capable.')),
  ...[11, 12, 13, 14, 15, 16].map((g) => P(g, { adc2: g - 10, rtc: true }, 'ADC2, unusable while WiFi runs.')),
  P(17, { dac: 1, adc2: 7, rtc: true }, 'DAC channel 1.'),
  P(18, { dac: 2, adc2: 8, rtc: true }, 'DAC channel 2.'),
  P(19, { usb: true, adc2: 9 }, 'USB D minus.'), P(20, { usb: true, adc2: 10 }, 'USB D plus.'),
  ...[26, 27, 28, 29, 30, 31, 32].map((g) => P(g, { flash: true }, 'Wired to the internal flash.')),
  P(43, { uart0: true }, 'UART0 TX.'), P(44, { uart0: true }, 'UART0 RX.'),
  P(45, { strapping: true }, 'Strapping pin.'), P(46, { strapping: true, inputOnly: true }, 'Input only strapping pin.'),
]);

chip('ESP32-H2', {
  label: 'ESP32-H2', cores: 1, maxGpio: 27, dac: [], touch: [],
  adc1: [1, 2, 3, 4, 5], adc2: [],
  defaults: { sda: 1, scl: 2, sck: 4, miso: 0, mosi: 5, cs: 3, tx: 24, rx: 23, led: 8 },
}, [
  P(0, {}, 'Free.'),
  ...[1, 2, 3, 4, 5].map((g) => P(g, { adc1: g, rtc: true }, 'ADC1 capable.')),
  P(8, { strapping: true, led: true }, 'Onboard LED on many boards, and a strapping pin.'),
  P(9, { strapping: true }, 'Boot button.'),
  P(13, { usb: true }, 'USB D minus.'), P(14, { usb: true }, 'USB D plus.'),
  ...[15, 16, 17, 18, 19, 20, 21].map((g) => P(g, { flash: true }, 'Wired to the internal flash.')),
  P(23, { uart0: true }, 'UART0 RX.'), P(24, { uart0: true }, 'UART0 TX.'),
  P(25, {}, 'Free.'), P(26, {}, 'Free.'), P(27, {}, 'Free.'),
]);

export function chipInfo(name) {
  return CHIPS[name] || CHIPS['ESP32'];
}

export function chipList() {
  return Object.keys(CHIPS);
}

/* ------------------------------------------------------------------ */
/* checking a sketch against the chip                                  */
/* ------------------------------------------------------------------ */

export function pinIssues(usage, chipName, opts = {}) {
  const info = chipInfo(chipName);
  const out = [];
  const wifi = !!opts.usesWiFi;

  for (const u of usage) {
    const pin = info.map.get(u.gpio);
    const at = u.lines[0];
    const writes = u.roles.some((r) => ['out', 'pwm', 'dac'].includes(r));
    const reads = u.roles.some((r) => ['in', 'adc', 'touch', 'int'].includes(r));

    if (!pin) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' does not exist on the ' + info.label + '.' });
      continue;
    }
    if (pin.flash) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' is wired to the internal flash on the ' + info.label +
                 '. Touching it will crash or brick the boot. Move to a free pin.' });
    }
    if (pin.vdd) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' powers the flash chip. Do not drive it.' });
    }
    if (pin.inputOnly && writes) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' is input only on the ' + info.label +
                 ', so it cannot drive anything. It also has no internal pull up, so a button here needs an external resistor.' });
    }
    if (pin.uart0) {
      out.push({ gpio: u.gpio, line: at, severity: 'warning',
        message: 'GPIO' + u.gpio + ' is the USB serial line. Using it means losing the serial monitor and possibly failed uploads.' });
    }
    if (pin.usb) {
      out.push({ gpio: u.gpio, line: at, severity: 'warning',
        message: 'GPIO' + u.gpio + ' is a native USB data line. On boards that flash over USB this breaks uploading.' });
    }
    if (pin.psram) {
      out.push({ gpio: u.gpio, line: at, severity: 'note',
        message: 'GPIO' + u.gpio + ' is used by PSRAM on some ' + info.label +
                 ' modules. Fine if yours has none, otherwise pick another pin.' });
    }
    if (pin.strapping && writes) {
      out.push({ gpio: u.gpio, line: at, severity: 'warning',
        message: 'GPIO' + u.gpio + ' is a strapping pin. ' + pin.note });
    } else if (pin.strapping && reads) {
      out.push({ gpio: u.gpio, line: at, severity: 'note',
        message: 'GPIO' + u.gpio + ' is a strapping pin, so whatever is wired to it is read at reset too. ' +
                 'A button here that happens to be held during a reset changes how the chip boots. ' + pin.note });
    }
    if (wifi && pin.adc2 != null && u.roles.includes('adc')) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' is on ADC2, and ADC2 stops working the moment WiFi starts. analogRead will return garbage. Move to an ADC1 pin: ' +
                 info.adc1.map((g) => 'GPIO' + g).join(', ') + '.' });
    }
    if (u.roles.includes('adc') && pin.adc1 == null && pin.adc2 == null) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' has no ADC on the ' + info.label + ', so analogRead cannot read it.' });
    }
    if (u.roles.includes('touch') && !info.touch.includes(u.gpio)) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: info.touch.length
          ? 'GPIO' + u.gpio + ' is not a touch pin. Touch capable pins are ' + info.touch.map((g) => 'GPIO' + g).join(', ') + '.'
          : 'The ' + info.label + ' has no capacitive touch peripheral at all.' });
    }
    if (u.roles.includes('dac') && !info.dac.includes(u.gpio)) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: info.dac.length
          ? 'dacWrite only works on GPIO' + info.dac.join(' and GPIO') + ' on the ' + info.label + '.'
          : 'The ' + info.label + ' has no DAC. Use ledcWrite for PWM instead.' });
    }
    if (u.roles.includes('wake') && !pin.rtc) {
      out.push({ gpio: u.gpio, line: at, severity: 'error',
        message: 'GPIO' + u.gpio + ' is not an RTC pin, so it cannot wake the chip from deep sleep.' });
    }
    if (pin.rare) {
      out.push({ gpio: u.gpio, line: at, severity: 'note',
        message: 'GPIO' + u.gpio + ' is rarely brought out to the header on dev boards. Check your pinout.' });
    }
    if (reads && writes && !u.roles.includes('i2c')) {
      out.push({ gpio: u.gpio, line: at, severity: 'note',
        message: 'GPIO' + u.gpio + ' is both read and written. That is fine for a one wire protocol, worth a look otherwise.' });
    }
  }
  return out;
}

/** Roles collapsed to a single label for the rail. */
export function roleLabel(roles) {
  const order = ['i2c', 'spi', 'uart', 'dac', 'pwm', 'adc', 'touch', 'int', 'out', 'in', 'wake'];
  const names = {
    out: 'OUT', in: 'IN', adc: 'ADC', pwm: 'PWM', dac: 'DAC', touch: 'TCH',
    int: 'IRQ', i2c: 'I2C', spi: 'SPI', uart: 'UART', wake: 'WAKE',
  };
  for (const r of order) if (roles.includes(r)) return names[r];
  return 'USE';
}
