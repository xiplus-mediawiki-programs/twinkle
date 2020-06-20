import argparse
import html
import os
import re

import requests

# parser = argparse.ArgumentParser()
# parser.add_argument('mode', type=int, choices=[1, 2])
# args = parser.parse_args()

basedir = os.path.join(os.path.dirname(__file__), '..')

filenames = [
    'twinkle.js',
    'morebits.js',
    'modules/twinklearv.js',
    'modules/twinklebatchdelete.js',
    'modules/twinklebatchundelete.js',
    'modules/twinkleblock.js',
    'modules/twinkleconfig.js',
    'modules/twinklediff.js',
    'modules/twinklefluff.js',
    'modules/twinkleimage.js',
    'modules/twinkleprotect.js',
    'modules/twinklespeedy.js',
    'modules/twinkleunlink.js',
    'modules/twinklewarn.js',
    'modules/twinklexfd.js',
    'modules/friendlytag.js',
    'modules/friendlytalkback.js',
]

templates = set()
for filename in filenames:
    print(filename)

    with open(os.path.join(basedir, filename), 'r', encoding='utf8') as f:
        jstext = f.read()

    matches = re.findall(r"{{subst:([^#|}']+)[|}]", jstext)

    for match in matches:
        templates.add(match)
        print('\t', match)

print(templates)
