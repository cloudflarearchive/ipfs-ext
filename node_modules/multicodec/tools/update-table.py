#!/usr/bin/env python3

import csv
import os
import sys
from collections import OrderedDict

# This is relative to where this script resides. Though you can also define
# an absolute path
DEFAULT_OUTPUT_DIR = '../src'

# The header of the generated files
HEADER = '''\
// THIS FILE IS GENERATED, DO NO EDIT MANUALLY
// For more information see the README.md
/* eslint-disable dot-notation */
'use strict'
'''


def padded_hex(hexstring):
    """Creates a padded (starting with a 0 if odd) hex string"""
    number = int(row['code'], 16)
    hexbytes = '{:x}'.format(number)
    if len(hexbytes) % 2:
        prefix = '0x0'
    else:
        prefix = '0x'
    return prefix + hexbytes


def unique_code(codecs):
    """Returns a list where every code exists only one.

    The first item in the list is taken
    """
    seen = []
    unique = []
    for codec in codecs:
        if 'code' in codec:
            if codec['code'] in seen:
                continue
            else:
                seen.append(codec['code'])
        unique.append(codec)
    return unique


# Preserve the order from earlier versions. New tags are appended
parsed = OrderedDict([
    ('serialization', []),
    ('multiformat', []),
    ('multihash', []),
    ('multiaddr', []),
    ('ipld', []),
    ('namespace', []),
    ('key', []),
    ('holochain', []),
])

multicodec_reader = csv.DictReader(sys.stdin, skipinitialspace=True)
for row in multicodec_reader:
    code = padded_hex(row['code'])
    name_const = row['name'].upper().replace('-', '_')
    name_human = row['name']
    tag = row['tag']
    value = {
        'const': name_const,
        'human': name_human,
        'code': code
    }
    if tag not in parsed:
        parsed[tag] = []

    parsed[tag].append(value)

tools_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(tools_dir, DEFAULT_OUTPUT_DIR)

print_file = os.path.join(output_dir, 'base-table.js')
with open(print_file, 'w') as ff:
    ff.write(HEADER)
    for tag, codecs in parsed.items():
        ff.write(f"\n// {tag}\n")
        for codec in codecs:
            hexstring = codec['code'][2:]
            ff.write("exports['{}'] = Buffer.from('{}', 'hex')\n"
                     .format(codec['human'], hexstring))

constants_file = os.path.join(output_dir, 'constants.js')
with open(constants_file, 'w') as ff:
    ff.write(HEADER)
    ff.write('module.exports = Object.freeze({\n')
    for tagindex, (tag, codecs) in enumerate(parsed.items()):
        ff.write(f"\n  // {tag}\n")
        for codecindex, codec in enumerate(codecs):
            ff.write("  {const}: {code}".format(**codec))
            # Add a trailing comma except for the last item in the dict
            if tagindex < len(parsed) - 1 or codecindex < len(codecs) - 1:
                ff.write(',\n')
    ff.write('\n})\n')

print_file = os.path.join(output_dir, 'print.js')
with open(print_file, 'w') as ff:
    ff.write(HEADER)
    ff.write('module.exports = Object.freeze({\n')
    for tagindex, (tag, codecs) in enumerate(parsed.items()):
        ff.write(f"\n  // {tag}\n")
        unique = unique_code(codecs)
        for codecindex, codec in enumerate(unique):
            ff.write("  {code}: '{human}'".format(**codec))
            # Add a trailing comma except for the last item in the dict
            if tagindex < len(parsed) - 1 or codecindex < len(codecs) - 1:
                ff.write(',\n')
    ff.write('\n})\n')
