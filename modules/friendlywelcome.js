// <nowiki>


(function() {


/*
 ****************************************
 *** friendlywelcome.js: Welcome module
 ****************************************
 * Mode of invocation:     Tab ("Wel"), or from links on diff pages
 * Active on:              Any page with relevant user name (userspace,
 *                         contribs, etc.) and diff pages
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.welcome = function friendlywelcome() {
	if (mw.util.getParamValue('friendlywelcome')) {
		if (mw.util.getParamValue('friendlywelcome') === 'auto') {
			Twinkle.welcome.auto();
		} else {
			Twinkle.welcome.semiauto();
		}
	} else {
		Twinkle.welcome.normal();
	}
};

Twinkle.welcome.auto = function() {
	if (mw.util.getParamValue('action') !== 'edit') {
		// userpage not empty, aborting auto-welcome
		return;
	}

	Twinkle.welcome.welcomeUser();
};

Twinkle.welcome.semiauto = function() {
	Twinkle.welcome.callback(Morebits.relevantUserName());
};

Twinkle.welcome.normal = function() {
	if (mw.util.getParamValue('diff')) {
		// check whether the contributors' talk pages exist yet
		var $oList = $('#mw-diff-otitle2').find('span.mw-usertoollinks a.new.mw-usertoollinks-talk').first();
		var $nList = $('#mw-diff-ntitle2').find('span.mw-usertoollinks a.new.mw-usertoollinks-talk').first();

		if ($oList.length > 0 || $nList.length > 0) {
			var spanTag = function(color, content) {
				var span = document.createElement('span');
				span.style.color = color;
				span.appendChild(document.createTextNode(content));
				return span;
			};

			var welcomeNode = document.createElement('strong');
			var welcomeLink = document.createElement('a');
			welcomeLink.appendChild(spanTag('Black', '['));
			welcomeLink.appendChild(spanTag('Goldenrod', conv({ hans: '欢迎', hant: '歡迎' })));
			welcomeLink.appendChild(spanTag('Black', ']'));
			welcomeNode.appendChild(welcomeLink);

			if ($oList.length > 0) {
				var oHref = $oList.attr('href');

				var oWelcomeNode = welcomeNode.cloneNode(true);
				oWelcomeNode.firstChild.setAttribute('href', oHref + '&' + $.param({
					friendlywelcome: Twinkle.getPref('quickWelcomeMode') === 'auto' ? 'auto' : 'norm',
					vanarticle: Morebits.pageNameNorm
				}));
				$oList[0].parentNode.parentNode.appendChild(document.createTextNode(' '));
				$oList[0].parentNode.parentNode.appendChild(oWelcomeNode);
			}

			if ($nList.length > 0) {
				var nHref = $nList.attr('href');

				var nWelcomeNode = welcomeNode.cloneNode(true);
				nWelcomeNode.firstChild.setAttribute('href', nHref + '&' + $.param({
					friendlywelcome: Twinkle.getPref('quickWelcomeMode') === 'auto' ? 'auto' : 'norm',
					vanarticle: Morebits.pageNameNorm
				}));
				$nList[0].parentNode.parentNode.appendChild(document.createTextNode(' '));
				$nList[0].parentNode.parentNode.appendChild(nWelcomeNode);
			}
		}
	}
	if (Morebits.relevantUserName()) {
		Twinkle.addPortletLink(function() {
			Twinkle.welcome.callback(Morebits.relevantUserName());
		}, conv({ hans: '欢迎', hant: '歡迎' }), 'friendly-welcome', conv({ hans: '欢迎用户', hant: '歡迎使用者' }));
	}
};

Twinkle.welcome.welcomeUser = function welcomeUser() {
	Morebits.Status.init(document.getElementById('mw-content-text'));
	$('#catlinks').remove();

	var params = {
		template: Twinkle.getPref('quickWelcomeTemplate'),
		article: mw.util.getParamValue('vanarticle') || '',
		mode: 'auto'
	};

	var userTalkPage = mw.config.get('wgFormattedNamespaces')[3] + ':' + Morebits.relevantUserName();
	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = conv({ hans: '欢迎完成，将在几秒内刷新页面', hant: '歡迎完成，將在幾秒內重新整理頁面' });

	var wikipedia_page = new Morebits.wiki.Page(userTalkPage, conv({ hans: '编辑用户讨论页', hant: '編輯使用者討論頁' }));
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};

Twinkle.welcome.callback = function friendlywelcomeCallback(uid) {
	if (uid === mw.config.get('wgUserName') && !confirm(conv({ hans: '您真的要欢迎您自己吗？', hant: '您真的要歡迎您自己嗎？' }))) {
		return;
	}

	var Window = new Morebits.SimpleWindow(600, 420);
	Window.setTitle(conv({ hans: '欢迎用户', hant: '歡迎使用者' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '欢迎设置', hant: '歡迎設定' }), 'WP:TW/PREF#welcome');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'H:TW#欢迎');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.welcome.callback.evaluate);

	var relevantUserName = mw.config.get('wgRelevantUserName');
	var isAnonUser = mw.util.isTemporaryUser(relevantUserName) || mw.util.isIPAddress(relevantUserName);

	form.append({
		type: 'select',
		name: 'type',
		label: conv({ hans: '欢迎类型：', hant: '歡迎類別：' }),
		event: Twinkle.welcome.populateWelcomeList,
		list: [
			{ type: 'option', value: 'standard', label: conv({ hans: '标准欢迎', hant: '標準歡迎' }), selected: !isAnonUser },
			{ type: 'option', value: 'anonymous', label: conv({ hans: '欢迎非注册用户', hant: '歡迎非註冊使用者' }), selected: isAnonUser },
			{ type: 'option', value: 'nonChinese', label: conv({ hans: '非中文欢迎', hant: '非中文歡迎' }) }
		]
	});

	form.append({
		type: 'div',
		id: 'welcomeWorkArea',
		className: 'morebits-scrollbox'
	});

	form.append({
		type: 'input',
		name: 'article',
		label: conv({ hans: '* 条目链接（如果模板支持）：', hant: '* 條目連結（如果模板支援）：' }),
		value: mw.util.getParamValue('vanarticle') || '',
		tooltip: conv({ hans: '如果模板支持则可以链接到条目，留空则不链接。支持链接的模板以星号标注。', hant: '如果模板支援則可以連結到條目，留空則不連結。支援連結的模板以星號標註。' })
	});

	// Only displayed when the user viewing the user talk page
	if (mw.config.get('wgNamespaceNumber') === 3 && mw.config.get('wgTitle') === Morebits.relevantUserName()) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '欢迎前清空用户讨论页', hant: '歡迎前清空使用者討論頁' }),
					value: 'blank',
					name: 'blank',
					tooltip: conv({ hans: '适用于用户讨论页面上仅有胡言乱语或编辑测试时。', hant: '適用於使用者討論頁面上僅有胡言亂語或編輯測試時。' })
				}
			]
		});
	}

	var previewlink = document.createElement('a');
	$(previewlink).click(function() {
		Twinkle.welcome.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = conv({ hans: '预览', hant: '預覽' });
	form.append({ type: 'div', name: 'welcomepreview', label: [ previewlink ] });

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// initialize the welcome list
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.type.dispatchEvent(evt);
};

Twinkle.welcome.populateWelcomeList = function(e) {
	var type = e.target.value;

	var container = new Morebits.QuickForm.Element({ type: 'fragment' });

	if ((type === 'standard' || type === 'anonymous') && Twinkle.getPref('customWelcomeList').length) {
		container.append({ type: 'header', label: conv({ hans: '自定义欢迎模板', hant: '自訂歡迎模板' }) });
		container.append({
			type: 'radio',
			name: 'template',
			list: Twinkle.getPref('customWelcomeList'),
			event: function() {
				e.target.form.article.disabled = false;
			}
		});
	}

	var sets = Twinkle.welcome.templates[type];
	$.each(sets, function(label, templates) {
		container.append({ type: 'header', label: label });
		container.append({
			type: 'radio',
			name: 'template',
			list: $.map(templates, function(properties, template) {
				return {
					value: template,
					label: '{{' + template + '}}：' + properties.description + (properties.linkedArticle ? '\u00A0*' : ''),  // U+00A0 NO-BREAK SPACE
					tooltip: properties.tooltip  // may be undefined
				};
			}),
			event: function(ev) {
				ev.target.form.article.disabled = !templates[ev.target.value].linkedArticle;
			}
		});
	});

	var rendered = container.render();
	$(e.target.form).find('div#welcomeWorkArea').empty().append(rendered);

	var firstRadio = e.target.form.template[0] || e.target.form.template;
	firstRadio.checked = true;
	var vals = sets[Object.keys(sets)[0]];
	e.target.form.article.disabled = vals[firstRadio.value] ? !vals[firstRadio.value].linkedArticle : true;
};

// A list of welcome templates and their properties and syntax

// The four fields that are available are "description", "linkedArticle", "syntax", and "tooltip".
// The three magic words that can be used in the "syntax" field are:
//   - $USERNAME$  - replaced by the welcomer's username, depending on user's preferences
//   - $ARTICLE$   - replaced by an article name, if "linkedArticle" is true
//   - $HEADER$    - adds a level 2 header (most templates already include this)


Twinkle.welcome.templates = {
	standard: {
		[conv({ hans: '一般欢迎模板', hant: '一般歡迎模板' })]: {
			Welcome: {
				description: conv({ hans: '标准欢迎', hant: '標準歡迎' }),
				syntax: '{{subst:Welcome}}'
			}
		},
		[conv({ hans: '问题用户欢迎模板', hant: '問題使用者歡迎模板' })]: {
			Firstarticle: {
				description: conv({ hans: '给第一篇条目不符条目创建指引的用户', hant: '給第一篇條目不符條目建立指引的使用者' }),
				linkedArticle: true,
				syntax: '{{subst:Firstarticle|1=$ARTICLE$}}'
			}
		}
	},
	anonymous: {
		[conv({ hans: '匿名用户欢迎模板', hant: '匿名使用者歡迎模板' })]: {
			Welcomeip: {
				description: conv({ hans: '供匿名用户，鼓励其创建账户', hant: '供匿名使用者，鼓勵其建立帳戶' }),
				syntax: '{{subst:Welcomeip}}'
			}
		}
	},
	nonChinese: {
		[conv({ hans: '非中文欢迎模板', hant: '非中文歡迎模板' })]: {
			Welcomeen: {
				description: conv({ hans: '欢迎非中文用户', hant: '歡迎非中文使用者' }),
				linkedArticle: true,
				syntax: '{{subst:Welcomeen|art=$ARTICLE$}}'
			}
		}
	}
};
/* eslint-enable quote-props */

Twinkle.welcome.getTemplateWikitext = function(type, template, article) {
	// the iteration is required as the type=standard has two groups
	var properties;
	$.each(Twinkle.welcome.templates[type], function(label, templates) {
		properties = templates[template];
		if (properties) {
			return false; // break
		}
	});
	if (properties) {
		return properties.syntax.
			replace('$USERNAME$', Twinkle.getPref('insertUsername') ? mw.config.get('wgUserName') : '').
			replace('$ARTICLE$', article ? article : '').
			replace(/\$HEADER\$\s*/, '== ' + conv({ hans: '欢迎', hant: '歡迎' }) + ' ==\n\n').
			replace('$EXTRA$', '');  // EXTRA is not implemented yet
	}
	return '{{subst:' + template + (article ? '|art=' + article : '') + '}}' +
			(Twinkle.getPref('customWelcomeSignature') ? ' ~~~~' : '');
};

Twinkle.welcome.callbacks = {
	preview: function(form) {
		var previewDialog = new Morebits.SimpleWindow(750, 400);
		previewDialog.setTitle(conv({ hans: '预览欢迎模板', hant: '預覽歡迎模板' }));
		previewDialog.setScriptName(conv({ hans: '欢迎用户', hant: '歡迎使用者' }));
		previewDialog.setModality(true);

		var previewdiv = document.createElement('div');
		previewdiv.style.marginLeft = previewdiv.style.marginRight = '0.5em';
		previewdiv.style.fontSize = 'small';
		previewDialog.setContent(previewdiv);

		var previewer = new Morebits.wiki.Preview(previewdiv);
		var input = Morebits.QuickForm.getInputData(form);
		previewer.beginRender(Twinkle.welcome.getTemplateWikitext(input.type, input.template, input.article), 'User talk:' + Morebits.relevantUserName()); // Force wikitext/correct username

		var submit = document.createElement('input');
		submit.setAttribute('type', 'submit');
		submit.setAttribute('value', conv({ hans: '关闭', hant: '關閉' }));
		previewDialog.addContent(submit);

		previewDialog.display();

		$(submit).click(function() {
			previewDialog.close();
		});
	},
	main: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var text = pageobj.getPageText();

		// abort if mode is auto and form is not empty
		if (pageobj.exists() && params.mode === 'auto') {
			Morebits.Status.info('警告', conv({ hans: '用户讨论页不是空的，略过自动欢迎', hant: '使用者討論頁不是空的，略過自動歡迎' }));
			Morebits.wiki.actionCompleted.event();
			return;
		}

		var welcomeText = Twinkle.welcome.getTemplateWikitext(params.type, params.template, params.article);

		if (params.blank) {
			text = '';
		}

		if (Twinkle.getPref('topWelcomes')) {
			text = welcomeText + '\n\n' + text;
		} else {
			text += '\n' + welcomeText;
		}

		var summaryText = conv({ hans: '欢迎来到维基百科！', hant: '歡迎來到維基百科！' });
		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('watchWelcomes'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.welcome.callback.evaluate = function friendlywelcomeCallbackEvaluate(e) {
	var form = e.target;

	var params = Morebits.QuickForm.getInputData(form); // : type, template, article
	params.mode = 'manual';

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	var userTalkPage = mw.config.get('wgFormattedNamespaces')[3] + ':' + Morebits.relevantUserName();
	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = conv({ hans: '欢迎完成，将在几秒内刷新讨论页面', hant: '歡迎完成，將在幾秒內重新整理討論頁面' });

	var wikipedia_page = new Morebits.wiki.Page(userTalkPage, conv({ hans: '修改用户讨论页', hant: '修改使用者討論頁' }));
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};

Twinkle.addInitCallback(Twinkle.welcome, 'welcome');
})();


// </nowiki>
