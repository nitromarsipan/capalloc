INPUTS = $(wildcard data/*.capacitor data/kemet/*.html)
PY ?= python3

js_only/data.js: data_collector.py $(INPUTS)
	$(PY) data_collector.py
