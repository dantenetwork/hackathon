#!/bin/sh
mocha contract-test.js

i=1
while [ "$i" -le 1000 ]; do
    mocha upload-proof.js
    i=$(( i + 1 ))
done 