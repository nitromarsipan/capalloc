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

class Value {
  constructor(m, e) {
    this.m = m;
    this.e = e;
  }
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
  let e = parseInt(rm[8]) - 12;
  c.capVal = new Value(parseInt(rm[7]), e);

  // Parameter: Capacitance tolerance
  let tols = {
    "J": [-5, 5],
    "K": [-10, 10],
    "M": [-20, 20],
  };
  c.tol = tols[rm[9]];

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
  let e = parseInt(rm[5]) - 12;
  c.capVal = new Value(parseInt(rm[4]), e);

  // Parameter: Capacitance tolerance
  let tols = {
    "F": [-1, 1],
    "G": [-2, 2],
    "J": [-5, 5],
    "K": [-10, 10],
    "M": [-20, 20],
    "Z": [-20, 80],
  };
  c.tol = tols[rm[6]];

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

// Parser for Kemet MLCC MPNs
let kemetParser = new CapacitorParser();
// Group index: 1222234456789111
//              0000000000000011
// Example mpn: C1206C106M4RACTU
// type         ^|   ||  ||||||
// size          ^^^^||  ||||||
// series            ^|  ||||||
// capacitance        ^^^||||||
// tolerance             ^|||||
// volage                 ^||||
// temperature             ^|||
// failure rate             ^||
// termination               ^|
// packaging                  ^^
kemetParser.regex = new RegExp(
  "(C)" +
  "([0-9]{4})" +
  "([CXFJSYTVW])" +
  "([0-9][0-9R])" +
  "([0-9])" +
  "([BCDFGJKMZ])" +
  "([798436512ACBDFGZH])" +
  "([GHJNPRUV])" +
  "([ABC12])" +
  "([CL])" +
  "(TU|7411|7210|TM|7040|7013|7025|7215|7081|7082|" +
  "7186|7289|7800|7805|7810|7867|9028|9239|3325|AUTO|" +
  "AUTO7411|AUTO7210|AUTO7289|)",
  "g");

kemetParser.parse = function(rm) {
  let c = new Capacitor();
  c.m = "Kemet";
  
  c.mpn = rm[0];
  
  // Parameter: Type
  c.type = rm[1];
  
  // Parameter: Size
  c.size = size.i[rm[2]];
  if (c.size === undefined) {
    console.log(rm);
    console.log(rm[2]);
    throw new Error("Undefined size code.");
  }
  
  // Parameter: Series
  if (rm[3] === "C") {
    c.series = "Standard";
  } else if (rm[3] === "X") {
    c.series = "Flexible termination";
    c.flexterm = "Flexible termination";
  } else if (rm[3] === "F") {
    c.series = "Open mode";
  } else if (rm[3] === "J") {
    c.series = "Open mode";
    c.flexterm = "Flexible termination";
  } else if (rm[3] === "S") {
    c.series = "Floating electrode";
  } else if (rm[3] === "Y") {
    c.series = "Floating electrode with flexible termination";
    c.flexterm = "Flexible termination";
  } else if (rm[3] === "V") {
    c.series = "ArcShield";
  } else if (rm[3] === "W") {
    c.series = "ArcShield with flexible termination";
    c.flexterm = "Flexible termination";
  } else if (rm[3] === "T") {
    c.series = "COTS";
    if (rm[9] === "A") {
      c.design = "MIL-PRF-55681 PDA 8 %";
    } else if (rm[9] === "B") {
      c.design = "MIL-PRF-556851 PDA 8 %, DPA EIA-469";
    } else if (rm[9] === "C") {
      c.design = "MIL-PRF-55681 PDA 8 %, DPA EIA-469, MIL-STD-202 103 A";
    }
  } else {
    c.series = rm[3];
  }
  
  // Parameter: Nominal capacitance
  /*
  let s_cap_m = rm[4];
  let s_cap_e = rm[5];
  if (s_cap_m.slice(1,2) == "R") {
    throw new Error("R not implemented.");
  }
  // Kemet uses 8 and 9 as special codes for small values
  if (s_cap_e === "8") {
  console.log(s_cap_e);
    c.capacitance = parseFloat(s_cap_m) *
     Math.pow(10.0, -13);
  } else if (s_cap_e === "9") {
  console.log(s_cap_e);
    c.capacitance = parseFloat(s_cap_m) *
     Math.pow(10.0, -14);
  } else {
    c.capacitance = parseFloat(s_cap_m) *
     Math.pow(10.0, parseInt(s_cap_e) - 12); 
  }*/
  let e;
  if (rm[5] === "9") {
    e = -13;
  } else if (rm[5] === "8") {
    e = -14;
  } else {
    e = parseInt(rm[5]) - 12;
  }
  c.capVal = new Value(parseInt(rm[4]), e);
  
  //c.capCode = rm[4] + rm[5];

  // Parameter: Capacitance tolerance
  let tols = {
    "F": [-1, 1],
    "G": [-2, 2],
    "J": [-5, 5],
    "K": [-10, 10],
    "M": [-20, 20],
    "Z": [-20, +80],
  };
  c.tol = tols[rm[6]];
  if (c.tol === undefined) {
    console.log(rm);
    console.log(rm[6]);
    throw new Error("undefined temperature tolerance");
  }
  
  // Parameter: Rated voltage
  let voltages = {
    "7": 4,
    "9": 6.3,
    "8": 10,
    "4": 16,
    "3": 25,
    "6": 35,
    "5": 50,
    "1": 100,
    "2": 200,
    "A": 250,
    "C": 500,
    "B": 630,
    "D": 1000,
    "F": 1500,
    "G": 2000,
    "Z": 2500,
    "H": 3000,
  }
  c.voltage = voltages[rm[7]];
  if (c.voltage === undefined) {
    console.log(rm);
    console.log(rm[7]);
    throw new Error("undefined voltage");
  }
  
  // Parameter: Temperature characteristic
  let temps = {
    "G": "C0G",
    "H": "X8R",
    "J": "U2J",
    "N": "X8L",
    "P": "X5R",
    "R": "X7R",
    "U": "Z5U",
    "V": "Y5V",
  };
  let tempchar = temps[rm[8]];
  if (tempchar == undefined) {
    console.log(rm);
    console.log(rm[8]);
    throw new Error("undefined tempchar");
  }
  c.temp = new TempChar(tempchar);
  
  // Parameter: Failure rate / design
  if (c.design === undefined) {
    if (rm[9] === "A") {
    
    } else if (rm[9] === "1") {
      c.design = "KPS Single chip stack";
    } else if (rm[9] === "2") {
      c.design = "KPS Double chip stack";
    }
  }
  
  // Parameter: Termination
  // (ignore) rm[10]
  let terms = {
    "C": "Sn 100 %",
    "L": "SnPb (Pb > 5 %)",
  }
  c.term = terms[rm[10]];
  
  // Parameter: Packaging
  let packagings = {
    "": "bulk bag",
    "TU": "7\" reel, unmarked",
    "7411": "13\" reel, unmarked",
    "7210": "13\" reel, unmarked",
    "7867": "13\" reel, unmarked",
    "TM": "7\" reel, marked",
    "7013": "7\" reel, marked",
    "7025": "7\" reel, marked",
    "7040": "13\" reel, marked",
    "7215": "13\" reel, marked",
    "7081": "7\" reel, unmarked, 2 mm pitch",
    "7082": "13\" reel, unmarked, 2 mm pitch",
    "7800": "7\" reel, unmarked",
    "7805": "7\" reel, unmarked",
    "7810": "13\" reel, unmarked",
    "9028": "special bulk casette, unmarked",
    "3325": "special bulk casette, marked",
    "7186": "7\" reel, unmarked",
    "7289": "13\" reel, unmarked",
    "AUTO": "7\" reel, plastic, auto grade",
    "AUTO7289": "13\" reel, plastic, auto grade", 
    "AUTO7411": "13\" reel, paper, auto grade", 
    "AUTO7210": "13\" reel, plastic, auto grade", 
  }
  c.pack = packagings[rm[11]];
  if (c.pack === undefined) {
    console.log(rm);
    console.log(rm[11]);
    throw new Error("undefined packaging");
  }
  
  // "(TU|7411|7210|TM|7040|7215|7081|7082)"
  
  return c;
};

class DataSource {
  constructor(url, parser) {
    this.url = url;
    this.parser = parser;
  }
}

function parseDataSources(i, items, dataSources, last) {
  let f = new XMLHttpRequest();
  f.open("GET", dataSources[i].url);
  f.send();

  // Parse list and display it when done.
  f.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      s = f.responseText;

      let match;
      while (match = dataSources[i].parser.regex.exec(s)) {
        let alreadyThere = false;
        for (let i in items) {
          if (items[i].mpn === match[0]) {
            alreadyThere = true;
          }
        }
        if (!alreadyThere) {
          items.push(dataSources[i].parser.parse(match));
        }
      }
      
      if (i < dataSources.length - 1) {
        parseDataSources(i + 1, items, dataSources, last);
      } else {
        last(items);
      }
    }
  };
}

let capacitors = [];
let dataSources = [
  new DataSource("data/tdk_flex.capacitor", tdkParser), // 554 pcs
  new DataSource("data/samsung_flex.capacitor", samsungParser), // 134 pcs
  new DataSource("data/kemet/c1.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/c2.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/c3.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/c4.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/c5.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/c6.html", kemetParser), // 500 pcs
//  new DataSource("data/kemet/csmall_test.html", kemetParser), // 17 pcs
  ];
parseDataSources(0, capacitors, dataSources, display);

// To run:
// run python -m http.server 8000 in the root directory,
// then point a browser to localhost:8000