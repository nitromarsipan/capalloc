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
  "3226": "1210",
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

/*
console.log(size.m);
console.log(size.m["0402"]);
console.log(size.i);
console.log(size.i["0603"]);
*/

class Capacitor {
  constructor() {
  }
}

function parse_c(m, mpn) {
  if (m === "TDK") {
    return parse_c_tdk(mpn);
  } else {
    console.log("No parser for manufacturer \"" + m + "\".");
  }
}

function parse_c_tdk(mpn) {
  // Index:       00000000001111111111
  //              01234567890123456789
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
  let c = new Capacitor(mpn)
  c.m = "TDK";
  c.mpn = mpn;
  
  let s_size = mpn.slice(3, 4);
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
  c.size = sizes[s_size]
  
  let s_thickness = mpn.slice(4, 5)
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
  c.thickness = thicknesses[s_thickness];
  
  // These mpns define the thickness twice -
  // see if they agree.
  let s_thickness_2 = mpn.slice(15, 18);
  let thickness_2 = parseInt(s_thickness_2)/100;
  if (c.thickness !== thickness_2) {
    throw new Error("Mismatching thicknesses.");
  }
  
  let s_characteristic = mpn.slice(6, 9);
  c.characteristic = s_characteristic;
  
  let s_voltage = mpn.slice(9, 11);
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
  c.voltage = voltages[s_voltage];

  let s_cap_m = mpn.slice(11, 13);
  let s_cap_e = mpn.slice(13, 14);
  c.capacitance = parseFloat(
    s_cap_m*Math.pow(10.0, parseInt(s_cap_e) - 12));
  
  let s_special = mpn.slice(19, 20);
  if (s_special === "E") {
    c.flexterm = "Soft termination";
  } else {
    throw new Error("Unknown special code \"" + s_special + "\".");
  }
  
  return c;
}

/*
// Fetch capacitor listing
let x = new XMLHttpRequest();
x.open("GET", "tdk.capacitor");
x.send();

// Parse listing
x.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    let lines = x.responseText.split("\n");
    let mmpns = [];
    for (let i in lines) {
      mmpns.push(lines[i]);
    }
    
    parse_mmpns(mmpns);
  }
};
*/

// Fetch capacitor listing for regex parsing
let y = new XMLHttpRequest();
y.open("GET", "tdk_regex.capacitor");
y.send();

// CGA4C4C0G2W101J060AE
y.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    s = y.responseText;
    mpn_r = new RegExp(
      "CGA[2-9D][BCEFHJKLMNP][1234](?:C0G|X7R|X7S|X7T|X8R)" +
      "(?:0J|1A|1C|1E|1V|1H|2A|2E|2W|2J|3A|3D|3F)" +
      "[0-9]{3}(?:J|K|M)[0-9]{3}(?:A|B|K|L)E");
    match = mpn_r.exec(s);
    console.log(match);
    
    /*
    let mmpns = [];
    for (let i in lines) {
      mmpns.push(lines[i]);
    }
    */
    
    //parse_mmpns(mmpns);
  }
};

function parse_mmpns(mmpns) {
  cs = []
  
  for (let i in mmpns) {
    let mmpn = mmpns[i].split(" ");
    let c = parse_c(mmpn[0], mmpn[1]);
    cs.push(c);
  }
  
  console.log(cs);
}

//let c = parse_c("TDK", "CGADN3X7R1E476M230LE");
//console.log(c);

// To run:
// run python -m http.server 8000 in the root directory,
// then point a browser to localhost:8000