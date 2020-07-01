import argparse
import html
import os
import re

import requests

from util import findBetween

# parser = argparse.ArgumentParser()
# parser.add_argument('mode', type=int, choices=[1, 2])
# args = parser.parse_args()

basedir = os.path.join(os.path.dirname(__file__), '..')

filenames = [
    'twinkle.js',
    'morebits.js',
    'modules/friendlytag.js',
    'modules/friendlytalkback.js',
    'modules/twinklearv.js',
    'modules/twinklebatchdelete.js',
    'modules/twinklebatchundelete.js',
    'modules/twinkleblock.js',
    'modules/twinkleclose.js',
    'modules/twinkleconfig.js',
    'modules/twinklediff.js',
    'modules/twinklefluff.js',
    'modules/twinkleimage.js',
    'modules/twinkleprotect.js',
    'modules/twinklespeedy.js',
    'modules/twinkleunlink.js',
    'modules/twinklewarn.js',
    'modules/twinklexfd.js',
]

templates = set()
for filename in filenames:
    print(filename)

    with open(os.path.join(basedir, filename), 'r', encoding='utf8') as f:
        jstext = f.read()

    matches = re.findall(r"{{subst:([^#|}']+)(?:\||}|\\n)", jstext)

    for match in matches:
        templates.add(match)
        print('\t', match)


# modules/twinkleblock.js
print('modules/twinkleblock.js')
with open(os.path.join(basedir, 'modules/twinkleblock.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.block.blockPresetsInfo = {', 'Twinkle.block.blockGroupsUpdated = false;')

matches = re.findall(r"'([^|\n]+?)(?:\|[^\n]+?)?': {\n", blockPresetsInfo)
for match in matches:
    templates.add(match)
    print('\t', match)


# modules/twinkleimage.js
print('modules/twinkleimage.js')
with open(os.path.join(basedir, 'modules/twinkleimage.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, "'来源不明（CSD F3）'", "'f10_type'")

matches = re.findall(r"value: '([^\n]+?)',", blockPresetsInfo)
for match in matches:
    templates.add(match)
    print('\t', match)


# modules/twinkleprotect.js
print('modules/twinkleprotect.js')
with open(os.path.join(basedir, 'modules/twinkleprotect.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.protect.protectionTypesAdmin = wgULS([', 'Twinkle.protect.protectionTypes = ')

matches = re.findall(r", value: '([^\n]+?)'", blockPresetsInfo)
for match in matches:
    if match in ['unprotect']:
        continue
    templates.add(match)
    print('\t', match)


# modules/twinklewarn.js
print('modules/twinklewarn.js')
with open(os.path.join(basedir, 'modules/twinklewarn.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.warn.messages = wgULS({', 'Twinkle.warn.prev_article = null;')

matches = re.findall(r"'([^|\n]+?)(?:\|[^\n]+?)?': {\n\t+label", blockPresetsInfo)
for match in matches:
    templates.add(match)
    print('\t', match)


print(templates)
