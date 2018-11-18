// A tool for aiding allocation strategies for
// multi layer chip capacitors.

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
let tdk_parser = new CapacitorParser();

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
tdk_parser.regex = new RegExp(
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

tdk_parser.parse = function(rm) {
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
  c.characteristic = rm[5];

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
    
  c.capacitance_code = rm[7] + rm[8];

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


// Fetch capacitor listing for parsing.
let y = new XMLHttpRequest();
y.open("GET", "tdk_regex.capacitor");
y.send();

// Parse list and display it when done.
y.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    s = y.responseText;

    let match;
    let capacitors = [];
    while (match = tdk_parser.regex.exec(s)) {
      capacitors.push(tdk_parser.parse(match));
    }
    
    display(capacitors);
  }
};

// To run:
// run python -m http.server 8000 in the root directory,
// then point a browser to localhost:8000