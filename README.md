Twinkle
=======

Twinkle是维基人用于快速执行常见维护工作（如提交删除候选及清理破坏）的JavaScript库和应用程式。

它构建于已被许多维基百科脚本和编辑工具使用的`morebits.js`库之上。

查看中文维基百科上的[Wikipedia:Twinkle][]以获取更多信息。

[AzaToth][]是本工具和`morebits.js`库的的最初作者和维护者。

更新Wikipedia上的脚本
---------------------

要生成被猫过的Twinkle脚本，请使用以下`bash`命令：

    awk 'FNR==1{print ""}{print}' twinkle.header.js modules/*.js twinkle.footer.js > alltwinkle.js

然后就可以把`alltwinkle.js`上传到[MediaWiki:Gadget-Twinkle.js][]。这并未包含`morebits.js`和`morebits.css`，它们需要被分开上传。

如果`morebits.js`和/或`morebits.css`需要更新，它们应当被同步到这些地方：

* _morebits.js_ 至[MediaWiki:Gadget-morebits.js][]
* _morebits.css_ 至[MediaWiki:Gadget-morebits.css][]

[MediaWiki:Gadgets-definition][]应当包含这一行：

    * Twinkle[ResourceLoader|dependencies=jquery.ui.dialog,jquery.tipsy]|morebits.js|morebits.css|Twinkle.js

同步（给开发者）
----------------

存在一个名为`sync.pl`的同步脚本，可用于向维基百科上拉取和推送文件。

这个程序依赖于Perl 5.10和模块[`Git::Repository`][Git::Repository]与[`MediaWiki::Bot`][MediaWiki::Bot]，可轻易用[`App::cpanminus`][App::cpanminus]安装：

    cpanm --sudo install Git::Repository MediaWiki::Bot

在运行这个程序时，您可以在命令行中使用`--username`和`--password`参数提供您的凭据，但更推荐将它们保存到`~/.mwbotrc`的文件中，采用以下格式：

    username => "Username",
    password => "password",
    base     => "User::Username"

其中`base`是`pull`和`push`文件时的wiki路径前缀。

留意您的工作目录**不需要**是干净的；亦可以`stash`或`commit`您的修改。

要`pull`用户Foobar的修改，做：

    ./sync.pl --base User:Foobar --pull morebits.js

要`push`您的修改到Foobar的wiki页，做：

    ./sync.pl --base User:Foobar --push morebits.js

也有一`deploy`命令来部署新的文件。

    ./sync.pl --deploy twinkle.js
    make deploy

编辑摘要会包含分支和上次提交的SHA。

格式指引
--------

虽然旧的代码有许多不同且不一致的格式，但我们已经决定要在代码中使用更为一致的格式。

[jQuery Core Style Guideline][jq_style]是我们在此之后使用的格式指引。

[Wikipedia:Twinkle]: https://zh.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[MediaWiki:Gadget-Twinkle.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-Twinkle.js
[MediaWiki:Gadget-morebits.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.js
[MediaWiki:Gadget-morebits.css]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.css
[MediaWiki:Gadgets-definition]: https://zh.wikipedia.org/wiki/MediaWiki:Gadgets-definition
[Git::Repository]: http://search.cpan.org/~book/Git-Repository-1.17/lib/Git/Repository.pm
[Mediawiki::Bot]: http://search.cpan.org/~lifeguard/MediaWiki-Bot-3.2.7/lib/MediaWiki/Bot.pm
[App::cpanminus]: http://search.cpan.org/~miyagawa/App-cpanminus-1.4001/lib/App/cpanminus.pm
[jq_style]: http://docs.jquery.com/JQuery_Core_Style_Guidelines
