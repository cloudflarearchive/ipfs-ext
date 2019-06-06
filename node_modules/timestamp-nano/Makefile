#!/usr/bin/env bash -c make

SRC=./timestamp.js
TESTS=*.json ./test/*.js
TARGET=./dist
JSDEST=./dist/timestamp.min.js
JSGZIP=./dist/timestamp.min.js.gz

DOCS_DIR=./docs/typedoc
DOC_SRC=./typings/timestamp.d.ts
DOC_HTML=./docs/typedoc/classes/timestamp.html
DOCS_CSS_SRC=./assets/jsdoc.css
DOCS_CSS_DEST=./docs/jsdoc/styles/jsdoc-default.css

all: test $(TARGET) $(JSGZIP) typedoc

clean:
	rm -fr $(JSDEST) $(JSGZIP) $(DOCS_DIR)

$(TARGET):
	mkdir -p $(TARGET)

$(JSDEST): $(SRC)
	./node_modules/.bin/uglifyjs $(SRC) -c -m -o $(JSDEST)

$(JSGZIP): $(JSDEST)
	gzip -9 < $(JSDEST) > $(JSGZIP)
	ls -l $(JSDEST) $(JSGZIP)

test: jshint mocha

mocha:
	./node_modules/.bin/mocha -R spec $(TESTS)

jshint:
	./node_modules/.bin/jshint .

typedoc: $(DOC_HTML)

$(DOC_HTML): $(DOC_SRC)
	./node_modules/.bin/typedoc --out $(DOCS_DIR) --includeDeclarations --readme /dev/null --mode file $(DOC_SRC)
	perl -i -pe 's/<li>Defined in <a.*//;' $(DOC_HTML)

.PHONY: all clean test jshint mocha
