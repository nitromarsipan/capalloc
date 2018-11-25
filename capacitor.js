// A tool for aiding allocation strategies for
// multi layer chip capacitors.

// Copyright 2018 Magnus Sollien Sjursen <m@didakt.no>

// Tables for package size
let size = new Object();

// Capacitor size codes
// IEC (JEDEC) | EIA
// metric | inch
size.m = {
  "0402": "01005",
  "0404": "015015",
  "0603": "0201",
  "0505": "0202",
  "0805": "0302",
  "0808": "0303",
  "1310": "0504",
  "1005": "0402",
  "1608": "0603",
  "2012": "0805",
  "2520": "1008",
  "2828": "1111",
  "3216": "1206",
  "3225": "1210",
  "3625": "1410",
  "3838": "1515",
  "4516": "1806",
  "4520": "1808",
  "4532": "1812",
  "4564": "1825",
  "5025": "2010",
  "5050": "2020",
  "5750": "2220",
  "5764": "2225",
  "6432": "2512",
  "6450": "2520",
  "7450": "2920",
  "7563": "3025", // EIA size 3025 found in TDK datasheet.
  "8484": "3333",
  "9210": "4040",
  "100100": "4040",
  "140127": "5550",
  "203153": "8060"}

size.i = {}
for (let key in size.m) {
  size.i[size.m[key]] = key;
}

class Capacitor {
  constructor() {
  }
}

// Parser skeleton
class CapacitorParser {
  constructor() {}
}

// Parser for TDK MLCC MPNs
let tdkParser = new CapacitorParser();

// Group index: 11123455566778911111
//              00000000000000000012
// Example mpn: CGADN3X7R1E476M230LE
// series       ^^^||||  | |  ||  || CGA
// size            ^|||  | |  ||  || EIA 3025
// thickness        ^||  | |  ||  || 2.30 mm
// voltage condition ^|  | |  ||  || 1.5 x rated voltage
// characteristic     ^^^| |  ||  || X7R
// rated voltage         ^^|  ||  || 25 V
// capacitance             ^^^||  || 47 µF
// tolerance                  ^|  || ±20 %
// thickness                   ^^^|| 2.30 mm
// packaging                      ^| 330 mm reel, 12 mm pitch
// special reserved code           ^ Soft termination
tdkParser.regex = new RegExp(
  "\\b" +
  "(CGA)" +
  "([2-9D])" +
  "([BCEFHJKLMNP])" +
  "([1234])" +
  "(C0G|X7R|X7S|X7T|X8R)" +
  "(0J|1A|1C|1E|1V|1H|2A|2E|2W|2J|3A|3D|3F)" +
  "([0-9]{2})" +
  "([0-9])" +
  "(J|K|M)" +
  "([0-9]{3})" +
  "(A|B|K|L)" +
  "(E)",
  "g");

tdkParser.parse = function(rm) {
  let c = new Capacitor();
  c.m = "TDK";
  
  c.mpn = rm[0];
  
  // Parameter: Series
  c.series = rm[1];
  
  // Parameter: Dimensions
  let sizes = {
    "2": size.i["0402"],
    "3": size.i["0603"],
    "4": size.i["0805"],
    "5": size.i["1206"],
    "6": size.i["1210"],
    "7": size.i["1808"],
    "8": size.i["1812"],
    "9": size.i["2220"],
    "D": size.i["3025"],
  };
  c.size = sizes[rm[2]];

  // Parameter: Thickness
  let thicknesses = {
    "B": 0.50,
    "C": 0.60,
    "E": 0.80,
    "F": 0.85,
    "H": 1.15,
    "J": 1.25,
    "K": 1.30,
    "L": 1.60,
    "M": 2.00,
    "N": 2.30,
    "P": 2.50,
  };
  c.thickness = thicknesses[rm[3]];
  
  // Parameter: Thickness
  // In this MPN thickness is defined twice -
  // check if they agree.
  let thickness_2 = parseInt(rm[10])/100;
  if (c.thickness !== thickness_2) {
    throw new Error("Mismatching thicknesses.");
  }

  // Parameter: Voltage condition for life test
  // (ignored) rm[4]

  // Parameter: Temperature characteristic
  c.temp = new TempChar(rm[5]);

  // Parameter: Rated voltage
    let voltages = {
    "0J":    6.3,
    "1A":   10.0,
    "1C":   16.0,
    "1E":   25.0,
    "1V":   35.0,
    "1H":   50.0,
    "2A":  100.0,
    "2E":  250.0,
    "2W":  450.0,
    "2J":  630.0,
    "3A": 1000.0,
    "3D": 2000.0,
    "3F": 3000.0,
  };
  c.voltage = voltages[rm[6]];

  // Parameter: Nominal capacitance
  let s_cap_m = rm[7];
  let s_cap_e = rm[8];
  c.capacitance = parseFloat(s_cap_m) *
   Math.pow(10.0, parseInt(s_cap_e) - 12);
  // c.capacitance = parseInt(s_cap_m) *
    // Math.pow(10.0, parseInt(s_cap_e));
    
  c.capCode = rm[7] + rm[8];

  // Parameter: Capacitance tolerance
  // (ignore) rm[9]

  // Parameter: Packaging style
  // (ignore) rm[11]

  // Parameter: Special reserved code
  if (rm[12] === "E") {
    c.flexterm = "Soft termination";
  } else {
    throw new Error("Unknown special code \"" + s + "\".");
  }
  
  return c;
};

class TempChar {
  constructor(code) {
    this.code = code;
    let minTemp;
    let maxTemp;
    
    // Analyse temperature characteristic.
    if (code === "C0G" || code === "NP0") {
      minTemp = -55;
      maxTemp = 125;
      this.tol = [-0.54, 0.54]; // (125 - (-55)) °C * 30e-6/°C = 0.54 %
      this.class = "1";
    } else {
      this.class = "2";
      let minTemps = {
        "X": -55,
        "Y": -30,
        "Z": 10,
      };
      minTemp = minTemps[code.slice(0,1)];
      
      let maxTemps = {
        "4": 65,
        "5": 85,
        "6": 105,
        "7": 125,
        "8": 150,
        "9": 200,
      };
      maxTemp = maxTemps[code.slice(1,2)];
      
      let tols = {
        "P": [-10, 10],
        "R": [-15, 15],
        // "L": [-15, 15] [-40, 15] above 125°C
        "S": [-22, 22],
        "T": [-33, 22],
        "U": [-56, 22],
        "V": [-82, 22],
      };
      this.tol = tols[code.slice(2,3)];
    }
  
    this.temp = [minTemp, maxTemp];
  }
}

// Parser for Samsung MLCC MPNs
let samsungParser = new CapacitorParser();

// Group index: 112234456789111
//              000000000000012
// Example mpn: CL31B106KOHZFNE
// series       ^^| ||  ||||||| CL
// size           ^^||  ||||||| EIA 1206 (3216)
// temp char.       ^|  ||||||| X7R
// capacitance       ^^^||||||| 10 µF
// tolerance            ^|||||| ±10 %
// rated voltage         ^||||| 16 V
// thickness              ^|||| 1.6 mm
// termination             ^||| Ni, Soft termination, Sn 100 %
// product code             ^|| For POWER application
// special                   ^| Reserved code
// packaging                  ^ Embossed, 7" reel
samsungParser.regex = new RegExp(
  "\\b" +
  "(CL)" +
  "(03|05|10|21|31|32|43|55)" +
  "([ABCFLPRSTUXY])" +
  "([0-9][0-9R])" +
  "([0-9])" +
  "([ABCDFGJKMZ])" +
  "([ABCDEGHIJKLOPQR])" +
  "([3568ACFHIJLQVYU])" +
  "([ANGZSY])" +
  "([ABCFLNPW4N])" +
  "([N6JW])" +
  "([BCDEFLOPSG])",
  "g");

samsungParser.parse = function(rm) {
  let c = new Capacitor();
  c.m = "Samsung";
  
  c.mpn = rm[0];
  
  // Parameter: Series
  c.series = rm[1];
  
  // Parameter: Size
  let sizes = {
    "03": size.i["0201"],
    "05": size.i["0402"],
    "10": size.i["0603"],
    "21": size.i["0805"],
    "31": size.i["1206"],
    "32": size.i["1210"],
    "43": size.i["1812"],
    "55": size.i["2220"],
  };
  c.size = sizes[rm[2]];

  // Parameter: Temperature characteristic
  let characteristics = {
    "C": "C0G",
    "P": "P2H",
    "R": "R2H",
    "S": "S2H",
    "T": "T2H",
    "U": "U2J",
    "L": "S2L",
    "A": "X5R",
    "B": "X7R",
    "Y": "X7S",
    "X": "X6S",
    "F": "Y5V",
  };
  let tempchar = characteristics[rm[3]];
  if (tempchar == undefined) {
    console.log(rm);
    console.log(rm[3]);
    throw new Error("undefined tempchar");
  }
  c.temp = new TempChar(tempchar);
  
  // Parameter: Nominal capacitance
  let s_cap_m = rm[4];
  let s_cap_e = rm[5];
  if (s_cap_m.slice(1,2) == "R") {
    throw new Error("R not implemented.");
  }
  c.capacitance = parseFloat(s_cap_m) *
   Math.pow(10.0, parseInt(s_cap_e) - 12);
  
  c.capCode = rm[4] + rm[5];

  // Parameter: Capacitance tolerance
  // (ignore) rm[6]
  // K: ±10 %

  // Parameter: Rated voltage
    let voltages = {
    "R":    4.0,
    "Q":    6.3,
    "P":   10.0,
    "O":   16.0,
    "A":   25.0,
    "L":   35.0,
    "B":   50.0,
    "C":  100.0,
    "D":  200.0,
    "E":  250.0,
    "G":  500.0,
    "H":  630.0,
    "I": 1000.0,
    "J": 2000.0,
    "K": 3000.0,
  };
  c.voltage = voltages[rm[7]];
  
  // Parameter: Thickness
    let thicknesses = {
    "3": 0.30,
    "5": 0.50,
    "6": 0.60,
    "8": 0.80,
    "A": 0.65,
    "C": 0.85,
    "F": 1.25,
    "Q": 1.25,
    "Y": 1.25,
    "H": 1.60,
    "U": 1.80,
    "I": 2.00,
    "J": 2.50,
    "V": 2.50,
    "L": 3.20,
  };
  c.thickness = thicknesses[rm[8]];

  // Parameter: Product and plating method
  // Z:
  // S: Ni, Soft termination, Sn 100 %
  if (rm[9] === "Z" || rm[9] === "S") {
    c.flexterm = "Soft termination";
  } else if (rm[9] === "Y") {
    c.flexterm = "Cu/Ag-Epoxy";
  }
  
  // Parameter: Product code (Samsung control code)
  // (ignore) rm[10]
  // N: Normal
  // 4: Industrial (Network, power, etc)
  // W: Industrial (Network, power, etc)
  // F: Product for POWER application
  
  // Parameter: Reserved code
  // (ignore) rm[11]
  // N: Reserved code
  // 6: Higher bending strength
  // J: Higher bending strength
  // W: Industrial (Network, power, etc)
  
  // Parameter: Packaging type
  // (ignore) rm[12]
  // E: Embossed type, 7" reel
  // G: Embossed type, 7" reel
  // C: Cardboard type, 7" reel
  
  return c;
};


let capacitors = [];

// Fetch tdk capacitor listing for parsing.
function fetchTDK() {
  let f = new XMLHttpRequest();
  f.open("GET", "tdk_flex.capacitor");
  f.send();

  // Parse list and display it when done.
  f.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      s = f.responseText;

      let match;
      while (match = tdkParser.regex.exec(s)) {
        capacitors.push(tdkParser.parse(match));
      }
      
      fetchSamsung();
    }
  };
}

// Fetch Samsung capacitor listing for parsing.
function fetchSamsung() {
  let f = new XMLHttpRequest();
  f.open("GET", "samsung_flex.capacitor");
  f.send();

  // Parse list and display it when done.
  f.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      s = f.responseText;

      let match;
      while (match = samsungParser.regex.exec(s)) {
        capacitors.push(samsungParser.parse(match));
      }
      
      display(capacitors);
    }
  };
}

fetchTDK();

// To run:
// run python -m http.server 8000 in the root directory,
// then point a browser to localhost:8000