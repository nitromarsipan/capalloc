// Copyright 2018 Magnus Sollien Sjursen <m@didakt.no>
//
// Thanks to Martin Stensgård for good ideas on
// how to render capacitor properties.

// a and b are instances of Value
function ccLt(a, b) {
  if (a.e < b.e) {
    return true;
  } else if (a.e == b.e) {
    return a.m < b.m;
  } else {
    return false;
  }
}

function ccEq(a, b) {
  if ((a.e === b.e) && (a.m === b.m)) {
    return true;
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
capVals = [];
voltages = [];
sizes = [];
tempCodes = [];
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
      c.capVal,
      capVals,
      ccLt,
      ccEq);
    
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
      c.temp.code,
      tempCodes,
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
    let ex = this.valueExtractor;
    let i;
    let value = this.valueExtractor(item);
    if (!(value instanceof Value)) {
      i = this.values.indexOf(value);
    } else {
      for (let j in this.values) {
        let a = this.values[j];
        if ((a.e === value.e) && (a.m === value.m)) {
          i = j;
          break;
        }
      }
    }
    
    if (i >= 0) {
      return i;
    } else {
      throw new Error("Value " + this.valueExtractor(item) +
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
function printCapVal(capVal) {
  let m = capVal.m;
  let e = capVal.e;
  let xt = 3*Math.floor((e + 1)/3);
  let prefixes = {
    "-3": "m",
    "-6": "µ",
    "-9": "n",
    "-12": "p",
    "-15": "f",
    "-18": "a",
  }
  let prefix = prefixes[xt];
  let n = m*Math.pow(10, e - xt);
  return n.toFixed(1) + " " + prefix + "F";
}

// Return HTML colour code to indicate component size
function sizeColor(size, border) {
  let a = function(size) {
    return size.slice(0,2)*size.slice(2,4);
  }
  
  let min = a("0603");
  let max = a("7563");
  let s = a(size);
  // Area of item relative to area scale
  let aRatio = (s - min)/(max - min);
  let lRatio = Math.sqrt(aRatio); // rel to length scale
  //let w = lRatio;
  let w = Math.sqrt(lRatio);
  
  let hue = Math.floor(360 - 260*w - 100); // Smaller size -> smaller wavelength
  let sat = "80%";
  let lig = "70%";
  
  if (border) {
    sat = "70%";
    lig = "60%";
  }

  return "hsl(" + hue + ", " + sat + ", " + lig + ")";
}

// Return HTML colour code to indicate component temperature characteristic
function tempColor(temp, border) {
  let hue = 10;
  let sat = 0;
  let lig = 80;
  if (temp.class === "1") {
    hue = 10;
    sat = 0;
    lig = 95;
  }
  
  if (border) {
    sat = sat - 10;
    lig = lig - 10;
  }

  return "hsl(" + hue + ", " + sat + "%, " + lig + "%)";
}

function makeInfoDecal(item, width, height, border) {
  let contentWidth = Math.ceil(width - 2*border);
  let contentHeight = Math.ceil(height/3 - 2*border);
  let itemD = document.createElement("div");
  itemD.className = "item hoverinfo";
  itemD.style.width = width + "px";
  itemD.style.height = height + "px";

  // Display item package size
  sizeD = document.createElement("div");
  sizeD.className = "item_param";
  sizeD.innerHTML = item.size;
  sizeD.style.lineHeight = contentHeight + "px";
  sizeD.style.width = contentWidth + "px";
  sizeD.style.height = contentHeight + "px";
  sizeD.style.backgroundColor = sizeColor(item.size, false);
  sizeD.style.borderColor = sizeColor(item.size, true);
  itemD.appendChild(sizeD);

  // Display item material temperature code
  charD = document.createElement("div");
  charD.className = "item_param";
  charD.style.width = contentWidth + "px";
  charD.style.height = contentHeight + "px";
  charD.style.backgroundColor =
    tempColor(item.temp, false);
  charD.style.borderColor =
    tempColor(item.temp, true);
  itemD.appendChild(charD);

  // Material temperature range indicator
  let tempInd = document.createElement("div");
  tempInd.className = "temp_ind";
  let MINTEMP = -55;
  let MAXTEMP = 200;
  let minTempRatio = (item.temp.temp[0] - MINTEMP)/(MAXTEMP - MINTEMP);
  let ml = Math.ceil(minTempRatio*contentWidth) + "px";
  tempInd.style.marginLeft = ml;
  let tempRatio = (item.temp.temp[1] - item.temp.temp[0])/(MAXTEMP - MINTEMP);
  let w = Math.ceil(tempRatio*contentWidth) + "px";
  tempInd.style.width = w;

  let MINTOL = -100;
  let MAXTOL = 100;
  let minTolRatio = (item.temp.tol[0] - MINTOL)/(MAXTOL - MINTOL);
  let mt = Math.ceil(minTolRatio*contentHeight) + "px";
  tempInd.style.marginTop = mt;
  let tolRatio = (item.temp.tol[1] - item.temp.tol[0])/(MAXTOL - MINTOL);
  let h = Math.ceil(tolRatio*contentHeight) + "px";
  tempInd.style.height = h;
  tempInd.style.backgroundColor = "hsl(0, 0%, 20%)";
  charD.appendChild(tempInd);

  // Display flex termination
  //if (item.flexterm != undefined) {
  if (true) { // decals did not tile right without this
    flexD = document.createElement("div");
    flexD.className = "item_param";
    if (item.flexterm != undefined) {
      flexD.innerHTML = "flex";
    } else {
      flexD.innerHTML = "&nbsp";
    }
    flexD.style.lineHeight = contentHeight + "px";
    flexD.style.width = contentWidth + "px";
    flexD.style.height = contentHeight + "px";
    flexD.style.backgroundColor = "hsl(90, 0%, 80%)";
    flexD.style.borderColor = "hsl(90, 0%, 70%)";
    itemD.appendChild(flexD);
  }

  return itemD;
}

function display(cs) {
  // Title and copyright assertion
  let title = document.createElement("p");
  title.innerHTML = "Capalloc © 2018 Magnus Sollien Sjursen";
  title.style.fontSize = "18px";
  title.style.padding = "5px";
  document.body.appendChild(title);
  
  // Debug info  
  let loadCount = document.createElement("p");
  loadCount.innerHTML = "Loaded " + cs.length + " part numbers.";
  loadCount.style.fontSize = "30px";
  loadCount.style.padding = "5px";
  document.body.appendChild(loadCount);
  
  // Spacer (to keep hover boxes on screen)
  let spacer = document.createElement("div");
  spacer.style.height = "130px";
  spacer.style.width = "130px";
  document.body.appendChild(spacer);
  
  find_ranges(cs);
  
  // Setup axes
  let axes = [];
  axes.push(new Axis(
    voltages,
    function(i) {return i.voltage;},
    function(i) {return this.values[i] + " V";}));
  axes.push(new Axis(
    capVals,
    function(i) {return i.capVal;},
    function(i) {return printCapVal(this.values[i]);}));
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
      
      let itemWidth = 24;
      let itemHeight = 24;
      let itemBorder = 1;
      itemD = makeInfoDecal(item, itemWidth, itemHeight, itemBorder);
      a.appendChild(itemD);
      
      // Detailed info showed when mouse over decal
      let hover = document.createElement("span");
      hover.className = "hoverinfotext";
      hover.innerHTML = item.m + " " + item.mpn;
      itemD.appendChild(hover);
      
      largeItemD = makeInfoDecal(item, 80, 80, 1);
      hover.appendChild(largeItemD);
      
      let s;
      let basicText = document.createElement("p");
      if (-item.tol[0] === item.tol[1]) {
        s = printCapVal(item.capVal) +
          " ±" + item.tol[1] + " % " +
          item.voltage + " V";
      } else {      
        s = printCapVal(item.capVal) +
          " [" + item.tol[0] + ", " + item.tol[1] + "] % " +
          item.voltage + " V";
      }
      basicText.innerHTML = s;
      hover.appendChild(basicText);
      
      let sizeText = document.createElement("p");
      s = "Size JEDEC " + item.size + " (EIA " + size.m[item.size] + ")";
      sizeText.innerHTML = s;
      hover.appendChild(sizeText);
      
      let tempText = document.createElement("p");
      s = item.temp.code +
        " [" + item.temp.temp[0] + ", " + item.temp.temp[1] + "] °C";
      if (-item.temp.tol[0] === item.temp.tol[1]) {
        s = s + " ±" + item.temp.tol[1] + " %";
      } else {
        s = s + " [" + item.temp.tol[0] + ", " + item.temp.tol[1] + "] %";
      }
      tempText.innerHTML = s;
      hover.appendChild(tempText);
      
      if (item.pack !== undefined) {
        let packText = document.createElement("p");
        s = item.pack;
        packText.innerHTML = s;
        hover.appendChild(packText);
      }
      
      if (item.flexterm !== undefined) {
        let flexText = document.createElement("p");
        s = item.flexterm;
        flexText.innerHTML = s;
        hover.appendChild(flexText);
      }
      
      d.appendChild(a);
    }
    grid.appendChild(d);
    document.body.appendChild(grid);
  }
  console.log(window.performance.memory);
}