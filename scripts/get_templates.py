import os
import re

import json5
import requests
from util import findBetween

HEADERS = {
    'User-Agent': 'Twinkle/1.0 (https://github.com/xiplus-mediawiki-programs/twinkle)'
}

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
    'action': 'query',
    'format': 'json',
    'prop': 'redirects',
    'generator': 'embeddedin',
    'rdlimit': 'max',
    'geititle': 'Template:Twinkle standard installation',
    'geinamespace': '10',
    'geilimit': 'max'
}
markedPages = set()
while True:
    # print(postData)
    res = requests.post('https://zh.wikipedia.org/w/api.php', data=postData, headers=HEADERS).json()
    pages = res['query']['pages']
    for pageid in pages:
        page = pages[pageid]
        if re.search(r'/(doc|sandbox)$', page['title'], flags=re.I):
            continue
        markedPages.add(page['title'])
        if 'redirects' in page:
            for redirect in page['redirects']:
                redirectTable[redirect['title']] = page['title']
    if 'continue' in res:
        # print(res['continue'])
        for key, val in res['continue'].items():
            postData[key] = val
    else:
        break

basedir = os.path.join(os.path.dirname(__file__), '..')

filenames = [
    'src/twinkle.js',
    'src/morebits.js',
    'src/modules/twinkletag.js',
    'src/modules/twinkletalkback.js',
    'src/modules/twinklearv.js',
    'src/modules/twinklebatchdelete.js',
    'src/modules/twinklebatchundelete.js',
    'src/modules/twinkleblock.js',
    'src/modules/twinkleclose.js',
    'src/modules/twinkleconfig.js',
    'src/modules/twinklecopyvio.js',
    'src/modules/twinklediff.js',
    'src/modules/twinkleimage.js',
    'src/modules/twinkleprotect.js',
    'src/modules/twinklerollback.js',
    'src/modules/twinklespeedy.js',
    'src/modules/twinkleunlink.js',
    'src/modules/twinklewarn.js',
    'src/modules/twinklexfd.js',
]

templates = set()
for filename in filenames:
    with open(os.path.join(basedir, filename), 'r', encoding='utf8') as f:
        jstext = f.read()

    matches = re.findall(r"{{subst:([^#|}']+)(?:\||}|\\n)", jstext)

    for match in matches:
        templates.add(normalizeTitle(match))

    matches = re.findall(r"'{{(?!subst:)([^#|<\[{}']+)\|?'", jstext)
    for match in matches:
        templates.add(normalizeTitle(match))

    matches = re.findall(r'"{{(?!subst:)([^#|<\[{}]+)\|?', jstext)
    for match in matches:
        templates.add(normalizeTitle(match))


# src/modules/twinkletag.js
with open(os.path.join(basedir, 'src/modules/twinkletag.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

articleTags = findBetween(jstext, 'Twinkle.tag.article.tagList = [{', 'Twinkle.tag.redirectList = [{')
matches = re.findall(r"tag: '(.+?)',", articleTags)
for match in matches:
    templates.add(normalizeTitle(match))

articleTags = findBetween(jstext, 'Twinkle.tag.fileList = [{', 'Twinkle.tag.callbacks = {')
matches = re.findall(r"{{(.+?)}}", articleTags)
for match in matches:
    if re.search(r'重定向$', match):
        continue
    templates.add(normalizeTitle(match))


# src/modules/twinklewelcome.js
with open(os.path.join(basedir, 'src/modules/twinklewelcome.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

tags = findBetween(jstext, 'Twinkle.welcome.templates = {', 'Twinkle.welcome.getTemplateWikitext = ')
matches = re.findall(r"\n\t{3}(.+?): {", tags)
for match in matches:
    templates.add(normalizeTitle(match))


# src/modules/twinkleblock.js
with open(os.path.join(basedir, 'src/modules/twinkleblock.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.block.blockPresetsInfo =', 'Twinkle.block.transformBlockPresets =')[1:-3]
blockPresetsInfo = re.sub(r"(reason|summary): .+?(,)?\n", r"\1: ''\2\n", blockPresetsInfo)
blockPresetsInfo = json5.loads(blockPresetsInfo)

for template, info in blockPresetsInfo.items():
    if 'templateName' not in info and '|' not in template:
        templates.add(normalizeTitle(template))

blockUserTags = findBetween(jstext, 'Twinkle.block.callback.taguserpage =', 'Twinkle.block.callback.protectuserpage =')

matches = re.findall(r"case '(.+?)':", blockUserTags)
for match in matches:
    templates.add(normalizeTitle(match))


# src/modules/twinkleimage.js
with open(os.path.join(basedir, 'src/modules/twinkleimage.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, "'来源不明（CSD F3）'", "'f10_type'")

matches = re.findall(r"value: '([^\n]+?)',", blockPresetsInfo)
for match in matches:
    templates.add(normalizeTitle(match))

    notice = 'Di-{}-notice'.format(match)
    templates.add(normalizeTitle(notice))


# src/modules/twinkleprotect.js
with open(os.path.join(basedir, 'src/modules/twinkleprotect.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

blockPresetsInfo = findBetween(jstext, 'Twinkle.protect.protectionTypesAdmin = [', 'Twinkle.protect.protectionPresetsInfo = {')

matches = re.findall(r", value: '([^\n]+?)'", blockPresetsInfo)
for match in matches:
    if match in ['unprotect']:
        continue
    templates.add(normalizeTitle(match))


# src/modules/twinklewarn.js
with open(os.path.join(basedir, 'src/modules/twinklewarn.js'), 'r', encoding='utf8') as f:
    jstext = f.read()

warnTemplates = findBetween(jstext, 'Twinkle.warn.messages = {', 'Twinkle.warn.prev_article = null;')

matches = re.findall(r"\n\t{3}'[^|\n]+?'[\s\S]+?\n\t{3}}", warnTemplates)
for match in matches:
    match2 = re.match(r"\n\t{3}'([^|\n]+?)'", match)
    if match2:
        template = match2.group(1)
        for level in ['1', '2', '3', '4', '4im']:
            if 'level' + level in match:
                templates.add(normalizeTitle(template + level))

matches = re.findall(r"\n\t{2}'([^|\n]+?)': {\n\t+label", warnTemplates)
for match in matches:
    templates.add(normalizeTitle(match))

# end

# can't found from code or core templates
WHITELIST = set([
    # on-wiki
    'Template:Singlenotice',
    # block
    'Template:Sockpuppeteer',
    # image
    'Template:No source no license/auto',
    # talkback
    'Template:No talkback',
    # tag
    'Template:Multiple issues',
    # speedy
    'Template:Salt',
    # warn
    'Template:Uw-generic',
])
# non-exists or can't mark templates
BLACKLIST = set([
    # close
    'Template:Merge approved/auto',
    # copyvio
    'Template:Copyvio/auto',
    # image
    'Template:No source no license',
    # protect
    'Template:Pp-create',
    'Template:Pp-create-repeat',
    'Template:Pp-create-userpage',
    'Template:Pp-create-vandalism',
    'Template:Pp-extend-dispute',
    # other
    'Template:FULLPAGENAME',
    'Template:!',
])

anyError = False

text = ''
text += 'Unmarked pages\n'
for template in templates - markedPages - BLACKLIST:
    text += '# [[{}]]\n'.format(template)
    print('::error title=Unmarked pages::{}'.format(template))
    anyError = True

text += '\nUnused blacklist\n'
for template in BLACKLIST - templates:
    text += '# [[{}]]\n'.format(template)
    print('::error title=Unused blacklist::{}'.format(template))
    anyError = True

text += '\nUnused pages\n'
for template in markedPages - templates - WHITELIST:
    text += '# [[{}]]\n'.format(template)
    print('::error title=Unused pages::{}'.format(template))
    anyError = True

text += '\nUnused whitelist\n'
for template in WHITELIST - markedPages:
    text += '# [[{}]]\n'.format(template)
    print('::error title=Unused whitelist::{}'.format(template))
    anyError = True

text += '\nmarkedPages\n'
for page in markedPages:
    text += '# [[{}]]\n'.format(page)

text += '\nredirectTable\n'
for src, dst in redirectTable.items():
    text += '# [[{}]] [[{}]]\n'.format(src, dst)

outpath = os.path.join(basedir, 'scripts/get_templates-output.txt')
with open(outpath, 'w', encoding='utf8') as f:
    f.write(text)

if anyError:
    exit(1)
