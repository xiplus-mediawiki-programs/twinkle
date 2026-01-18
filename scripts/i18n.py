import argparse
import html
import os
import re

import requests

BASEDIR = os.path.dirname(os.path.abspath(__file__))

filenames = [
    'twinkle.js',
    'morebits.js',
    'modules/twinklearv.js',
    'modules/twinklebatchdelete.js',
    'modules/twinklebatchundelete.js',
    'modules/twinkleblock.js',
    'modules/twinkleconfig.js',
    'modules/twinklecopyvio.js',
    'modules/twinklediff.js',
    'modules/twinklefluff.js',
    'modules/twinkleimage.js',
    'modules/twinkleprotect.js',
    'modules/twinklespeedy.js',
    'modules/twinklestub.js',
    'modules/twinkleunlink.js',
    'modules/twinklewarn.js',
    'modules/twinklexfd.js',
    'modules/friendlywelcome.js',
    'modules/friendlytag.js',
    'modules/friendlytalkback.js',
]

parser = argparse.ArgumentParser()
parser.add_argument('files', nargs='*')
parser.add_argument('--mode', nargs='?', type=int, choices=[1, 2], default=2)
args = parser.parse_args()

run_files = args.files
if len(run_files) == 0:
    run_files = filenames
print(run_files)

noteTA = '''{{NoteTA
|G1=IT
|G2=MediaWiki
}}
-{H|zh-hans:帮助;zh-hant:說明}-
-{H|zh-hans:周;zh-hant:週}-
-{H|zh-hans:批复;zh-hant:批復}-
-{H|zh-hans:配置;zh-hant:配置}-
-{H|zh-hans:窗口;zh-hant:視窗}-
-{H|zh-hans:项目;zh-hant:項目}-
-{H|zh-hans:单击;zh-hant:點擊}-
-{H|zh-hans:支持;zh-hant:支援}-
-{H|zh-hans:标清;zh-hant:標清}-
-{H|zh-hans:移动设备;zh-hant:行動裝置}-
-{H|zh-hans:关联;zh-hant:關聯}-
-{H|zh-hans:保存;zh-hant:儲存}-
-{H|zh-hans:执行;zh-hant:執行}-
-{H|zh-hans:消息;zh-hant:訊息}-
-{H|zh-hans:启动;zh-hant:啟動}-
-{H|zh-hans:启用功能;zh-hant:啟用功能}-
-{H|zh-hans:启用;zh-hant:啟用}-
-{H|zh-hans:计划;zh-hant:計劃}-
-{H|zh-hans:不实资料;zh-hant:不實資料}-
-{H|zh-hans:注释;zh-hant:注釋}-
-{H|zh-hans:分辨率;zh-hant:解析度}-
-{H|zh-hans:类型;zh-hant:類別}-
-{H|zh-hans:账户;zh-hant:帳號}-
-{H|zh-hans:账户;zh-hant:帳戶}-
-{H|zh-hans:已在运行;zh-hant:已在執行}-
-{H|zh-hans:当前;zh-hant:目前}-
-{H|zh-hans:最近更改;zh-hant:近期變更}-
-{H|zh-hans:相关更改;zh-hant:相關變更}-
-{H|zh-hans:说明;zh-hant:說明}-
-{H|zh-hans:Twinkle帮助;zh-hant:Twinkle說明}-
-{H|zh-hans:公用IP;zh-hant:公共IP}-
-{H|zh-hans:监视;zh-hant:監視}-
-{H|zh-hans:通过;zh-hant:透過}-
-{H|zh-hans:链入;zh-hant:連入}-
-{H|zh-hans:消链;zh-hant:消連}-
-{H|zh-hans:品质;zh-hant:品質}-
-{H|zh-hans:命名空间;zh-hant:命名空間}-
-{H|zh-hans:表单;zh-hant:表單}-
-{H|zh-hans:扩充;zh-hant:擴充}-
-{H|zh-hans:文件名称;zh-hant:檔案名稱}-
-{H|zh-hans:设置;zh-hant:設定}-
-{H|zh-hans:变更;zh-hant:變更}-
-{H|zh-hans:标签页;zh-hant:分頁}-
-{H|zh-hans:抓取;zh-hant:擷取}-
-{H|zh-hans:数据源;zh-hant:資料來源}-
'''

headers = {
    'user-agent': 'Twinkle i18n script [[User:Xiplus]]'
}


def escapeWikitextMatch(text):
    return '&#{};'.format(ord(text[0]))


def escapeWikitext(text):
    text = re.sub(r"[\[\]{}<>|\\:*'_#&\s]", escapeWikitextMatch, text)
    return text


for filename in run_files:
    print(filename)

    full_filename = os.path.join(BASEDIR, '..', filename)

    with open(full_filename, 'r', encoding='utf8') as f:
        jstext = f.read()

    matches = re.findall(r"conv\({ hans: '(.*?)',[\s\n]*?hant: '((?:[^()]|\([^()]*?\))*?)'", jstext)

    text = noteTA

    messages = []
    for match in matches:
        # print(match)
        if args.mode == 1:
            orimessage = match[0]
        else:
            orimessage = match[1]
        text += '<div id="text{}">{}</div>'.format(len(messages), escapeWikitext(orimessage))
        messages.append((match[0], match[1]))

    # print(text)
    data = {
        'action': 'parse',
        'format': 'json',
        'text': text,
        'prop': 'text',
        'contentmodel': 'wikitext',
        'utf8': 1
    }
    if args.mode == 1:
        data['uselang'] = 'zh-tw'
    else:
        data['uselang'] = 'zh-cn'
    r = requests.post('https://zh.wikipedia.org/w/api.php', data=data, headers=headers)
    try:
        result = r.json()
    except Exception as e:
        print(e)
        print(r.text)
        continue
    result = result['parse']['text']['*']
    matches = re.findall(r'<div id="text(\d+)">(.+?)</div>', result)
    for match in matches:
        idx = int(match[0])
        newtext = html.unescape(match[1]).replace('\\n', '\\\\n')
        # print(idx, newtext)
        if args.mode == 1:
            newregex = r'\g<1>\g<2>\g<3>{}\g<5>'.format(newtext)
        else:
            newregex = r'\g<1>{}\g<3>\g<4>\g<5>'.format(newtext)
        jstext = re.sub(
            r"(conv\({{ hans: ')({})(',[\s\n]*?hant: ')({})(' }}\))".format(
                re.escape(messages[idx][0]),
                re.escape(messages[idx][1])
            ),
            newregex,
            jstext,
        )

    jstext = re.sub(r"conv\({ hans: '(.*?)',[\s\n]*?hant: '\1' }\)", r"'\1'", jstext)

    with open(full_filename, 'w', encoding='utf8', newline='\n') as f:
        f.write(jstext)
