import re
import requests
import html

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

noteTA = '''{{NoteTA
|G1=IT
|G2=MediaWiki
|1=zh-hans:添加;zh-hant:加入
|2=zh-hans:帮助;zh-hant:說明
|3=zh-hans:周;zh-hant:週
|4=zh-hans:批复;zh-hant:批復
|5=zh-hans:配置;zh-hant:配置
|6=zh-hans:窗口;zh-hant:視窗
|7=zh-hans:项目;zh-hant:項目
|8=zh-hans:单击;zh-hant:點擊
|9=zh-hans:支持;zh-hant:支援
|10=zh-hans:标清;zh-hant:標清
|11=zh-hans:手持设备;zh-hant:行動裝置
|12=zh-hans:类型;zh-hant:類別
}}'''


def escapeWikitextMatch(text):
    return '&#{};'.format(ord(text[0]))


def escapeWikitext(text):
    text = re.sub(r"[\[\]{}<>|\\:*'_#&\s]", escapeWikitextMatch, text)
    return text


for filename in filenames:
    print(filename)

    with open(filename, 'r', encoding='utf8') as f:
        jstext = f.read()

    matches = re.findall(r"wgULS\('(.*?)',[\s\n]*?'((?:[^()]|\([^()]\))*?)'\)", jstext)

    text = noteTA

    messages = []
    for match in matches:
        # print(match)
        text += '<div id="text{}">{}</div>'.format(len(messages), escapeWikitext(match[0]))
        messages.append((match[0], match[1]))

    # print(text)
    data = {
        'action': 'parse',
        'format': 'json',
        'uselang': 'zh-tw',
        'text': text,
        'prop': 'text',
        'contentmodel': 'wikitext',
        'utf8': 1
    }
    r = requests.post('https://zh.wikipedia.org/w/api.php', data=data)
    result = r.json()
    result = result['parse']['text']['*']
    matches = re.findall(r'<div id="text(\d+)">(.+?)</div>', result)
    for match in matches:
        idx = int(match[0])
        newtext = html.unescape(match[1]).replace('\\n', '\\\\n')
        # print(idx, newtext)
        jstext = re.sub(
            r"(wgULS\('{}',[\s\n]*?'){}('\))".format(re.escape(messages[idx][0]), re.escape(messages[idx][1])),
            r'\g<1>{}\g<2>'.format(newtext),
            jstext,
        )

    with open(filename, 'w', encoding='utf8') as f:
        f.write(jstext)
