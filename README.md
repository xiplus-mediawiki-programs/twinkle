Twinkle
=======

Twinkle是维基人用于快速执行常见维护工作（如提交删除候选及清理破坏）的JavaScript库和应用程式。

它构建于已被许多维基百科脚本和编辑工具使用的`morebits.js`库之上。

查看中文维基百科上的[Wikipedia:Twinkle][]以获取更多信息。

[AzaToth][]是本工具和`morebits.js`库的的最初作者和维护者。

此代码库的结构
--------------

* `morebits.js`：Twinkle和许多其他脚本使用的中央库，包含与MediaWiki API进行交互、显示表单和对话框、生成状态日志及执行其他有用工作的代码。这当中大部分代码都不是Twinkle特有的。
* `morebits.css`：`morebits.js`所附带的样式表。在Modern皮肤中应用的一些样式是Twinkle特有的，或许这些应该被放进`twinkle.css`里。
* `sync.pl`：用来更新维基上小工具、或用维基上的修改更新此代码库的Perl脚本。参见下方的完整文档。
* `twinkle.js`：通用的Twinkle特有代码，大部分用于处理参数设置和在UI中显示Twinkle。此外，这个文件包含了Twinkle的默认参数。
* `modules`：包含了单个Twinkle模块。相关说明可在头部注释或[Twinkle文档][]中找到。模块`twinkleconfig.js`用于提供[Twinkle参数设置][WP:TWPREFS]。

其他没有提到的文件大概已经过时了。

更新Wikipedia上的脚本
---------------------

有两种方式将Twinkle脚本上传到维基百科或其他地方。

### 手工拼接

**此处的指引已过时，请勿使用否则你很可能搞坏东西。**

要生成拼接后的Twinkle脚本，请使用以下`bash`命令：

    awk 'FNR==1{print ""}{print}' twinkle.js modules/*.js > alltwinkle.js

然后就可以把`alltwinkle.js`上传到[MediaWiki:Gadget-Twinkle.js][]。这并未包含`morebits.js`和`morebits.css`，它们需要被分开上传。

如果`morebits.js`和/或`morebits.css`需要更新，它们应当被同步到[MediaWiki:Gadget-morebits.js][]和[MediaWiki:Gadget-morebits.css][]。

[MediaWiki:Gadgets-definition][]应当包含这一行：

    * Twinkle[ResourceLoader|dependencies=mediawiki.user,mediawiki.util,mediawiki.RegExp,mediawiki.Title,jquery.ui.dialog,jquery.tipsy|rights=autoconfirmed]|morebits.js|morebits.css|Twinkle.js|friendlyshared.js|friendlytag.js|friendlytalkback.js|twinklearv.js|twinklebatchdelete.js|twinklebatchundelete.js|twinkleblock.js|twinkleclose.js|twinkleconfig.js|twinklecopyvio.js|twinkledelimages.js|twinklediff.js|twinklefluff.js|twinkleimage.js|twinkleprotect.js|twinklespeedy.js|twinkleunlink.js|twinklewarn.js|twinklexfd.js

### 使用`sync.pl`同步

存在一个名为`sync.pl`的同步脚本，可用于向维基百科上拉取和推送文件。

这个程序依赖于Perl 5.10和模块[`Git::Repository`][Git::Repository]与[`MediaWiki::Bot`][MediaWiki::Bot]，可轻易用[`App::cpanminus`][App::cpanminus]安装：

    cpanm --sudo install Git::Repository MediaWiki::Bot

注意：在一些系统上，您可能需要安装附加的模块如`File::Slurp`、`Getopt::Long::Descriptive`和其他依赖。建议您通过系统的包管理工具安装这些（如`apt-get install libgetopt-long-descriptive-perl`），但您也可以通过cpanm来安装。

在运行这个程序时，您可以在命令行中使用`--username`和`--password`参数提供您的凭据，但更推荐将它们保存到`~/.mwbotrc`的文件中，采用以下格式：

    username => "Username",
    password => "password",
    base     => "User::Username"

其中`base`是`pull`和`push`文件时的wiki路径前缀。如果你不指定`base`参数，文件将会被推到MediaWiki名字空间。

留意您的工作目录**不需要**是干净的；亦可以`stash`或`commit`您的修改。

要`pull`用户Foobar的修改（如`User:Foobar/morebits.js`），做：

    ./sync.pl --base User:Foobar --pull morebits.js

要`push`您的修改到Foobar的wiki页，做：

    ./sync.pl --base User:Foobar --push morebits.js

也有一`deploy`命令来部署所有Twinkle文件。

    ./sync.pl --deploy twinkle.js
    make deploy

请留意，要同步到一个自定义的维基，您也需要指定--lang和--family参数。比如，要同步文件到`test.wmflabs.org`，您应当指定`--lang=test --family=wmflabs`。如果您希望使用`make deploy`来部署所有文件，您也可能需要将相关参数通过Makefile传递给脚本，如：

    make ARGS="--lang=test --family=wmflabs" deploy

编辑摘要会包含分支和上次提交的SHA。

格式指引
--------

虽然旧的代码有许多不同且不一致的格式，但我们已经决定要在代码中使用更为一致的格式。

[jQuery Core Style Guideline][jq_style]是我们在此之后使用的格式指引。

无需多言，例外也是存在的。这主要和括号旁的空白有关：旧Twinkle代码看起来像`if ( condition ) {`，但新代码一般会用`if (condition) {`。惯例是跟随周围代码的样式。

[Wikipedia:Twinkle]: https://zh.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[Twinkle文档]: https://zh.wikipedia.org/wiki/Help:Twinkle
[WP:TWPREFS]: https://zh.wikipedia.org/wiki/WP:TWPREFS
[MediaWiki:Gadget-Twinkle.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-Twinkle.js
[MediaWiki:Gadget-morebits.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.js
[MediaWiki:Gadget-morebits.css]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.css
[MediaWiki:Gadgets-definition]: https://zh.wikipedia.org/wiki/MediaWiki:Gadgets-definition
[Git::Repository]: http://search.cpan.org/perldoc?Git%3A%3ARepository
[MediaWiki::Bot]: http://search.cpan.org/perldoc?MediaWiki%3A%3ABot
[App::cpanminus]: http://search.cpan.org/perldoc?App%3A%3Acpanminus
[jq_style]: http://contribute.jquery.org/style-guide/js/
