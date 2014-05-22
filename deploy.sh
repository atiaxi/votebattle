#!/bin/bash

mkdir -p deploy/src
mkdir -p deploy/js
mkdir -p deploy/resources

echo "Compiling"
java -jar compiler.jar --js src/votebattle.js \
    --js_output_file src/votebattle.min.js

cp -v src/votebattle.min.js deploy/src/
cp -v CREDITS deploy/
cp -v index.html deploy/
cp -v resources/* deploy/resources
cp -v js/phaser.min.js deploy/js

echo "Ready for deploy"
