import argparse
import html
import os
import re

import requests

from util import findBetween

# parser = argparse.ArgumentParser()
# parser.add_argument('mode', type=int, choices=[1, 2])
# args = parser.parse_args()


redirectTable = dict()


def normalizeTitle(title):
    title = title[0].upper() + title[1:]
    if title.startswith('Wikipedia:'):
        pass
    elif not title.startswith('Template:'):
        title = 'Template:' + title
    if title in redirectTable:
        title = redirectTable[title]
    return title


postData = {
    "action": "query",
    "format": "json",
    "prop": "redirects",
    "generator": "embeddedin",
    "utf8": 1,
    "rdlimit": "max",
    "geititle": "Template:Twinkle standard installation",
    "geinamespace": "10",
    "geilimit": "max"
}
pages = requests.post('https://zh.wikipedia.org/w/api.php', data=postData).json()['query']['pages']
markedPages = set()
for pageid in pages:
    page = pages[pageid]
    if re.search(r'/(doc|sandbox)$', page['title']):
        continue
    markedPages.add(page['title'])
    if 'redirects' in page:
        for redirect in page['redirects']:
            redirectTable[redirect['title']] = page['title']
print(markedPages, len(markedPages))

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
        templates.add(normalizeTitle(match))
        print('\t', normalizeTitle(match))

    matches = re.findall(r"'{{(?!subst:)([^#|<\[{}']+)\|?'", jstext)
    for match in matches:
        templates.add(normalizeTitle(match))
        print('\t', normalizeTitle(match))

    matches = re.findall(r'"{{(?!subst:)([^#|<\[{}]+)\|?', jstext)
    for match in matches:
        templates.add(normalizeTitle(match))
        print('\t', normalizeTitle(match))

# modules/twinkleblock.js
print('modules/twinkleblock.js')
with open(os.path.join(basedir, 'modules/twinkleblock.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.block.blockPresetsInfo = {', 'Twinkle.block.blockGroupsUpdated = false;')

matches = re.findall(r"'([^|\n]+?)(?:\|[^\n]+?)?': {\n", blockPresetsInfo)
for match in matches:
    templates.add(normalizeTitle(match))
    print('\t', normalizeTitle(match))


# modules/twinkleimage.js
print('modules/twinkleimage.js')
with open(os.path.join(basedir, 'modules/twinkleimage.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, "'来源不明（CSD F3）'", "'f10_type'")

matches = re.findall(r"value: '([^\n]+?)',", blockPresetsInfo)
for match in matches:
    templates.add(normalizeTitle(match))
    print('\t', normalizeTitle(match))


# modules/twinkleprotect.js
print('modules/twinkleprotect.js')
with open(os.path.join(basedir, 'modules/twinkleprotect.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.protect.protectionTypesAdmin = wgULS([', 'Twinkle.protect.protectionTypes = ')

matches = re.findall(r", value: '([^\n]+?)'", blockPresetsInfo)
for match in matches:
    if match in ['unprotect']:
        continue
    templates.add(normalizeTitle(match))
    print('\t', normalizeTitle(match))


# modules/twinklewarn.js
print('modules/twinklewarn.js')
with open(os.path.join(basedir, 'modules/twinklewarn.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.warn.messages = wgULS({', 'Twinkle.warn.prev_article = null;')

matches = re.findall(r"'([^|\n]+?)(?:\|[^\n]+?)?': {\n\t+label", blockPresetsInfo)
for match in matches:
    templates.add(normalizeTitle(match))
    print('\t', normalizeTitle(match))

text = ''
text += 'Unmarked pages\n'
for template in templates - markedPages:
    text += '# [[{}]]\n'.format(template)
text += 'Unused pages\n'
for template in markedPages - templates:
    text += '# [[{}]]\n'.format(template)

outpath = os.path.join(basedir, 'maintenance/get_templates-output.txt')
with open(outpath, 'w', encoding='utf8') as f:
    f.write(text)
