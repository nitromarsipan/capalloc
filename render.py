import decimal
from decimal import Decimal
import data_collector
import math
import bisect
import dominate
from dominate.tags import *

# From https://docs.python.org/3/library/decimal.html
def remove_exponent(d):
    return d.quantize(Decimal(1)) if d == d.to_integral() else d.normalize()

def si_prefixed(x):
    prefixes = {
        15: "P",
        12: "T",
        9: "G",
        6: "M",
        3: "k",
        0: "",
        -3: "m",
        -6: "µ",
        -9: "n",
        -12: "p",
        -15: "f",
        -18: "a"}
    e = math.floor(x.log10())
    xt = 3*math.floor((e + 0)/3)
    prefix = prefixes[xt]
    n = x/Decimal(10)**xt
    return "{} {}".format(remove_exponent(n), prefix)

class Axis:
    def __init__(self, items, value_getter, printer):
        self.printer = printer
        self.value_getter = value_getter
        
        self.values = []
        # Insert new values in sorted order
        for item in items:
            value = self.value_getter(item)
            if (not value in self.values):
                bisect.insort_left(self.values, value)

items = data_collector.parse_sources(data_collector.data_sources)

# Add a unique ID to each item.
for i in range(len(items)):
    items[i].css_id = i

ax_capacitance = Axis(items, lambda x: x.cap, lambda x: x)
ax_voltage = Axis(items, lambda x: x.voltage, lambda x: x)
ax_size = Axis(items, lambda x: x.size, lambda x: x)