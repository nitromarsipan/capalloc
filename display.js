// Copyright 2018 Magnus Sollien Sjursen <m@didakt.no>

// a and b are 3 digit capacitance codes
// 104 means 10*10^4 pF
// Returns whether a is smaller than b.
function cc_lt(a, b) {
  let ae = parseInt(a.slice(0,2));
  let ax = parseInt(a.slice(-1));
  let be = parseInt(b.slice(0,2));
  let bx = parseInt(b.slice(-1));
  if (ax < bx) {
    return true;
  } else if (bx == ax) {
    return ae < be;
  } else {
    return false;
  }
}

// Insert value into list in rising order
// lt and eq are comparison functions fitting
// the type of value.
function insert_sorted(value, list, lt, eq) {
  let largest = true;
  for (let i in list) {
    if (lt(value, list[i])) {
      list.splice(i, 0, value);
      largest = false;
      break;
    } else if (eq(value, list[i])) {
      largest = false;
      break;
    }
  }
  if (largest) {
    list.push(value);
  }
}

// Lists of values present in the components
capacitances = [];
capCodes = [];
voltages = [];
sizes = [];
characteristics = [];
thicknesses = [];
  
function find_ranges(cs) {
  // Find range of values
  for (let i in cs) {
    let c = cs[i];
    
    insert_sorted(
      c.capacitance,
      capacitances,
      function(a, b) {return (a < b);},
      function(a, b) {return (a == b);});
    
    insert_sorted(
      c.capCode,
      capCodes,
      cc_lt,
      function(a, b) {return (a == b);});
    
    insert_sorted(
      c.voltage,
      voltages,
      function(a, b) {return (a < b);},
      function(a, b) {return (a == b);});
    
    insert_sorted(
      c.size,
      sizes,
      function(a, b) {return (a < b);},
      function(a, b) {return (a == b);});
    
    insert_sorted(
      c.characteristic,
      characteristics,
      function(a, b) {return (a < b);},
      function(a, b) {return (a == b);});
    
    insert_sorted(
      c.thickness,
      thicknesses,
      function(a, b) {return (a < b);},
      function(a, b) {return (a == b);});
  }
}

class Axis {
  constructor(values, valueExtractor, printer) {
    this.values = values;
    this.valueExtractor = valueExtractor;
    this.printer = printer;
  }
  
  indexOf(item) {
    let i = this.values.indexOf(this.valueExtractor(item));
    if (i >= 0) {
      return i;
    } else {
      throw new Error("Value " + valueExtractor(item) +
        " not in " + this.values + " .");
    }
  }
}

class Cell {
  constructor(axes, indices) {
    this.axes = axes;
    this.indices = indices;
    this.items = [];
  }
  
  // Add item if it fits the axes.
  offerItem(item) {
    for (let i = 0; i < this.axes.length; i++) {
      if (this.axes[i].indexOf(item) != this.indices[i]) {
        return false;
      }
    }
    
    // Add item if it mached all axes.
    this.items.push(item);
    return true;
  }
}

// Pretty print a capacitance code
function printCapCode(code) {
  let e = parseInt(code.slice(0,2));
  let x = parseInt(code.slice(-1)) - 12;
  let xt = 3*Math.floor((x + 1)/3);
  let prefixes = {
    "-3": "m",
    "-6": "µ",
    "-9": "n",
    "-12": "p",
    "-15": "f",
  }
  let prefix = prefixes[xt];
  let n = e*Math.pow(10, x - xt);
  return n.toFixed(1) + " " + prefix + "F";
}

// Return HTML colour code to indicate component size
function sizeColor(size, border) {
  let a = function(size) {
    return size.slice(0,2)*size.slice(2,4);
  }
  
  let min = a("1005");
  let max = a("7563");
  let s = a(size);
  // Area of item relative to area scale
  let aRatio = (s - min)/(max - min);
  let lRatio = Math.sqrt(aRatio); // rel to length scale
  let w = Math.pow(lRatio, 1);
  
  let hue = Math.floor(360*w);
  let sat = "70%";
  let lig = "70%";
  
  if (border) {
    sat = "60%";
    lig = "60%";
  }

  return "hsl(" + hue + ", " + sat + ", " + lig + ")";
}

// Return HTML colour code to indicate component characteristic
function charColor(char, border) {
  let hue = 10;
  let sat = 70;
  let lig = 70;
  if (char === "C0G") {
    hue = 10;
    sat = 0;
    lig = 100;
  }
  
  if (border) {
    sat = sat - 10;
    lig = lig - 10;
  }

  return "hsl(" + hue + ", " + sat + "%, " + lig + "%)";
}

function display(cs) {
  find_ranges(cs);
  
  if (true) {
    console.log(capacitances);
    console.log(capCodes);
    console.log(voltages);
    console.log(sizes);
    console.log(characteristics);
    console.log(thicknesses);
  }
  
  // Setup axes
  let axes = [];
  axes.push(new Axis(
    voltages,
    function(i) {return i.voltage;},
    function(i) {return this.values[i] + " V";}));
  axes.push(new Axis(
    capCodes,
    function(i) {return i.capCode;},
    function(i) {return printCapCode(this.values[i]);}));
  /*
  axes.push(new Axis(
    sizes,
    function(i) {return i.size;},
    function(i) {return this.values[i];}));
  axes.push(new Axis(
    characteristics,
    function(i) {return i.characteristic;},
    function(i) {return this.values[i];}));
  */
  
  // Create table cells
  let cells = [];
  for (let i = 0; i < axes[0].values.length; i++) {
    for (let j = 0; j < axes[1].values.length; j++) {
      //for (let k = 0; j < axes[2].values.length; k++) {
        //for (let l = 0; j < axes[3].values.length; l++) {
          cells.push(new Cell(axes, [i, j]));
        //}
      //}
    }
  }
  
  // Fill table cells
  for (let i in cs) {
    for (let j in cells) {
      cells[j].offerItem(cs[i]);
    }
  }
  
  // A grid to display the cells in
  let grid = document.createElement("grid_div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns =
    "repeat(" + (1 + axes[0].values.length) + ", 110px)";
  grid.style.gridGap = "0px";
  grid.style.gridAutoFlow = "column dense";
  
  // Corner cell
  let d = document.createElement("div");
  d.className = "cell corner_header";
  d.style.gridRow = "1/2";
  d.style.gridColumn = "1/2";
  grid.appendChild(d);
  
  let p = document.createElement("p");
  p.innerHTML = "Capalloc"
  d.appendChild(p);
  
  // Column headers
  for (let i in axes[0].values) {
    let d = document.createElement("div");
    d.className = "cell col_header";
    d.style.gridRow = "1/2";
    grid.appendChild(d);
    
    let p = document.createElement("p");
    p.innerHTML = axes[0].printer(i);
    d.appendChild(p);
  }
  
  // Row headers
  for (let i in axes[1].values) {
    let d = document.createElement("div");
    d.className = "cell row_header";
    d.style.gridColumn = "1/2";
    grid.appendChild(d);
    
    let p = document.createElement("p");
    p.innerHTML = axes[1].printer(i);
    d.appendChild(p);
  }
  
  // Display each cell
  grid.className = "grid";
  for (let i in cells) {
    let d = document.createElement("div");
    d.className = "cell";
    
    for (let j in cells[i].items) {
      let item = cells[i].items[j];
      let a = document.createElement("a");
      a.href = "https://octopart.com/search?q=" +
        item.mpn +
        "&start=0";
      a.rel = "external noreferrer";
        
      let itemD = document.createElement("div");
      itemD.className = "item hoverinfo";
      
      // Display item package size
      sizeD = document.createElement("div");
      sizeD.className = "size";
      sizeD.innerHTML = item.size;
      sizeD.style.color = "#111111";
      sizeD.style.backgroundColor = sizeColor(item.size, false);
      sizeD.style.borderColor = sizeColor(item.size, true);
      itemD.appendChild(sizeD);
      
      // Display item material characteristic code
      charD = document.createElement("div");
      charD.className = "char";
      charD.innerHTML = item.characteristic;
      charD.style.color = "#111111";
      charD.style.backgroundColor =
        charColor(item.characteristic, false);
      charD.style.borderColor =
        charColor(item.characteristic, true);
      itemD.appendChild(charD);
      
      let span = document.createElement("span");
      span.className = "hoverinfotext";
      span.innerHTML = item.m + " " + item.mpn;
      itemD.appendChild(span);
      
      a.appendChild(itemD);
      d.appendChild(a);
    }
    grid.appendChild(d);
    document.body.appendChild(grid);
  }
}