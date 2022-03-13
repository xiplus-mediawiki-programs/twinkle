# Twinkle ![Linter](https://github.com/Xi-Plus/twinkle/workflows/Linter/badge.svg)

Twinkle是维基人用于快速执行常见维护工作（如提交删除候选及清理破坏）的JavaScript库和应用程式。

它构建于已被许多维基百科脚本和编辑工具使用的`morebits.js`库之上。

查看中文维基百科上的[Wikipedia:Twinkle][]以获取更多信息。

[AzaToth][]是本工具和`morebits.js`库的的最初作者和维护者。

此代码库的结构
--------------

* `morebits.js`：Twinkle和许多其他脚本使用的中央库，包含与MediaWiki API进行交互、显示表单和对话框、生成状态日志及执行其他有用工作的代码。这当中大部分代码都不是Twinkle特有的。
* `twinkle.js`：通用的Twinkle特有代码，大部分用于处理参数设置和在UI中显示Twinkle。此外，这个文件包含了Twinkle的默认参数。
* `modules`：包含了单个Twinkle模块。相关说明可在头部注释或[Twinkle文档][]中找到。模块`twinkleconfig.js`用于提供[Twinkle参数设置][WP:TWPREFS]。

[select2][] is added under the [MIT license][select2license].

[Wikipedia:Twinkle]: https://zh.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[Twinkle文档]: https://zh.wikipedia.org/wiki/Help:Twinkle
[WP:TWPREFS]: https://zh.wikipedia.org/wiki/WP:TWPREFS
[select2]: https://github.com/select2/select2
[select2license]: https://github.com/select2/select2/blob/develop/LICENSE.md
