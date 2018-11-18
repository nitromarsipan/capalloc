// a and b are 3 digit capacitance codes
// 104 means 10*10^4 pF
// Returns whether a is smaller than b.
function cc_lt(a, b) {
  let ae = parseInt(a.slice(0,-2));
  let ax = parseInt(a.slice(-1));
  let be = parseInt(b.slice(0,-2));
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
capacitance_codes = [];
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
      c.capacitance_code,
      capacitance_codes,
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
  constructor(values, valueExtractor) {
    this.values = values;
    this.valueExtractor = valueExtractor;
  }
  
  indexOf(item) {
    let i = this.values.indexOf(valueExtractor(item));
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
    for (let i = 0; i < axes.length; i++) {
      if (axes[i].indexOf(item) != indices[i]) {
        return false;
      }
    }
    
    // Add item if it mached all axes.
    this.items.push(item);
    return true;
  }
}

function display(cs) {
  find_ranges(cs);
  
  if (false) {
    console.log(capacitances);
    console.log(capacitance_codes);
    console.log(voltages);
    console.log(sizes);
    console.log(characteristics);
    console.log(thicknesses);
  }
  
  // Setup axes
  let axes = [];
  axes.push(new Axis(voltages, function(i) {return i.voltage;}));
  axes.push(new Axis(capacitances, function(i) {return i.capacitance;}));
  
  let cells = [];
  
  for (let i = 0; i < axes[0].values.length; i++) {
    for (let j = 0; j < axes[1].values.length; j++) {
      cells.push(new Cell(axes, [i, j]));
      console.log(cells.slice(-1));
    }
  }
  
  // Display each capacitor
  for (let i in cs) {
    let c = cs[i];
    
    let p = document.createElement("p");
    let s = c.mpn;
    s = s + " " + c.capacitance_code;
    p.innerHTML = s;
    document.body.appendChild(p);
  }
}