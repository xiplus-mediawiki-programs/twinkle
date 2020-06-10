import argparse
import html
import re

import requests


def findBetween(text, start, end):
    idx1 = text.index(start)
    idx2 = text.index(end)
    return text[idx1 + len(start):idx2]


FILENAME = '../modules/friendlytag.js'
with open(FILENAME, 'r', encoding='utf8') as f:
    jstext = f.read()

articleTags = findBetween(jstext, 'Twinkle.tag.article.tags = wgULS', 'Twinkle.tag.article.tagCategories = wgULS')

templates = set()
matches = re.findall(r"'(.+?)': '", articleTags)
for match in matches:
    templates.add(match)

templates = list(templates)
print(templates, len(templates))
for idx in range(0, len(templates), 50):
    print(idx, templates[idx:idx + 50])
    names = []
    for name in templates[idx:idx + 50]:
        names.append('Template:{}'.format(name))
    data = {
        'action': 'query',
        'format': 'json',
        'prop': 'info',
        'titles': '|'.join(names),
        'redirects': 1,
        'converttitles': 1,
    }
    r = requests.post('https://zh.wikipedia.org/w/api.php', data=data)
    result = r.json()
    result = result['query']
    for key in ['normalized', 'converted', 'redirects']:
        if key in result:
            for item in result[key]:
                fromName = item['from'].replace('Template:', '')
                toName = item['to'].replace('Template:', '')
                jstext = jstext.replace("'{}'".format(fromName), "'{}'".format(toName))
                print(key, item, "'{}'".format(fromName))

with open(FILENAME, 'w', encoding='utf8') as f:
    f.write(jstext)
