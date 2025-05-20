// <nowiki>


(function() {


/*
 ****************************************
 *** twinklestub.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Stub")
 * Active on:              Existing articles
 * Config directives in:   FriendlyConfig
 * Note:                   customised friendlytag module (for SEWP)
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.stub = function friendlytag() {
	if (Morebits.isPageRedirect()) {
		// Skip
	// article/draft article tagging
	} else if (((mw.config.get('wgNamespaceNumber') === 0 || mw.config.get('wgNamespaceNumber') === 118) && mw.config.get('wgCurRevisionId')) || (Morebits.pageNameNorm === Twinkle.getPref('sandboxPage'))) {
		Twinkle.stub.mode = conv({ hans: '条目', hant: '條目' });
		Twinkle.addPortletLink(Twinkle.stub.callback, '小作品', 'friendly-tag', conv({ hans: '标记小作品', hant: '標記小作品' }));
	}
};

Twinkle.stub.callback = function friendlytagCallback() {
	var Window = new Morebits.SimpleWindow(630, Twinkle.stub.mode === 'article' ? 450 : 400);
	Window.setScriptName('Twinkle');
	Window.addFooterLink('小作品說明', 'Wikipedia:小作品');
	Window.addFooterLink(conv({ hans: '小作品设置', hant: '小作品設定' }), 'WP:TW/PREF#stub');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#stub');

	var form = new Morebits.QuickForm(Twinkle.stub.callback.evaluate);

	if (document.getElementsByClassName('patrollink').length) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '标记页面为已巡查', hant: '標記頁面為已巡查' }),
					value: 'patrolPage',
					name: 'patrolPage',
					checked: Twinkle.getPref('markStubbedPagesAsPatrolled')
				}
			]
		});
	}

	switch (Twinkle.stub.mode) {
		case '條目':
		case '条目':
			Window.setTitle(conv({ hans: '条目小作品标记', hant: '條目小作品標記' }));

			form.append({
				type: 'select',
				name: 'sortorder',
				label: conv({ hans: '查看列表：', hant: '檢視列表：' }),
				tooltip: conv({ hans: '您可以在Twinkle参数设置（WP:TWPREFS）中更改此项。', hant: '您可以在Twinkle偏好設定（WP:TWPREFS）中更改此項。' }),
				event: Twinkle.stub.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: conv({ hans: '按类型', hant: '按類別' }), selected: Twinkle.getPref('stubArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getPref('stubArticleSortOrder') === 'alpha' }
				]
			});

			form.append({ type: 'div', id: 'tagWorkArea' });
			break;

		default:
			alert('Twinkle.stub：未知模式 ' + Twinkle.stub.mode);
			break;
	}

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	if (Twinkle.stub.mode === '条目' || Twinkle.stub.mode === '條目') {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.stub.checkedTags = [];

Twinkle.stub.updateSortOrder = function(e) {
	var sortorder = e.target.value;

	Twinkle.stub.checkedTags = e.target.form.getChecked('articleTags');
	if (!Twinkle.stub.checkedTags) {
		Twinkle.stub.checkedTags = [];
	}

	var container = new Morebits.QuickForm.Element({ type: 'fragment' });

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: '{{' + tag + '}}: ' + description };
		if (Twinkle.stub.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}

		return checkbox;
	};

	// append any custom tags
	if (Twinkle.getPref('customStubList').length) {
		container.append({ type: 'header', label: conv({ hans: '自定义模板', hant: '自訂模板' }) });
		var customcheckboxes = [];
		$.each(Twinkle.getPref('customStubList'), function(_, item) {
			customcheckboxes.push(makeCheckbox(item.value, item.label));
		});
		container.append({
			type: 'checkbox',
			name: 'articleTags',
			list: customcheckboxes
		});
	}

	// categorical sort order
	if (sortorder === 'cat') {
		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, array) {
			var checkboxes = [];
			$.each(array, function(k, tag) {
				var description = Twinkle.stub.article.tags[tag];
				checkboxes.push(makeCheckbox(tag, description));
			});
			subdiv.append({
				type: 'checkbox',
				name: 'articleTags',
				list: checkboxes
			});
		};

		var i = 0;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.stub.article.tagCategories, function(title, content) {
			container.append({ type: 'header', id: 'tagHeader' + i, label: title });
			var subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: 'div', label: [Morebits.htmlNode('b', subtitle)] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});
	// alphabetical sort order
	} else {
		var checkboxes = [];
		$.each(Twinkle.stub.article.tags, function(tag, description) {
			checkboxes.push(makeCheckbox(tag, description));
		});
		container.append({
			type: 'checkbox',
			name: 'articleTags',
			list: checkboxes
		});
	}

	var $workarea = $(e.target.form).find('div#tagWorkArea');
	var rendered = container.render();
	$workarea.empty().append(rendered);

	// style adjustments
	$workarea.find('h5').css({ 'font-size': '110%' });
	$workarea.find('h5:not(:first-child)').css({ 'margin-top': '1em' });
	$workarea.find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });

	// add a link to each template's description page
	$.each(Morebits.QuickForm.getElements(e.target.form, 'articleTags'), function(index, checkbox) {
		var $checkbox = $(checkbox);
		var link = Morebits.htmlNode('a', '>');
		link.setAttribute('class', 'tag-template-link');
		link.setAttribute('href', mw.util.getUrl('Template:' +
			Morebits.string.toUpperCaseFirstChar(checkbox.values)));
		link.setAttribute('target', '_blank');
		$checkbox.parent().append(['\u00A0', link]);
	});
};


// Tags for ARTICLES start here

Twinkle.stub.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.stub.article.tags = {
	'actor-stub': conv({ hans: '演员', hant: '演員' }),
	'asia-stub': conv({ hans: '亚洲', hant: '亞洲' }),
	'bio-stub': conv({ hans: '人物', hant: '人物' }),
	'biology-stub': conv({ hans: '生物学', hant: '生物學' }),
	'chem-stub': conv({ hans: '化学', hant: '化學' }),
	'europe-stub': conv({ hans: '欧洲', hant: '歐洲' }),
	'expand list': conv({ hans: '未完成列表', hant: '未完成列表' }),
	'food-stub': conv({ hans: '食物', hant: '食物' }),
	'france-geo-stub': conv({ hans: '法国地理', hant: '法國地理' }),
	'geo-stub': conv({ hans: '地理位置', hant: '地理位置' }),
	'hist-stub': conv({ hans: '历史或历史学', hant: '歷史或歷史學' }),
	'JP-stub': conv({ hans: '日本', hant: '日本' }),
	'lit-stub': conv({ hans: '文学', hant: '文學' }),
	'math-stub': conv({ hans: '数学', hant: '數學' }),
	'med-stub': conv({ hans: '医学', hant: '醫學' }),
	'mil-stub': conv({ hans: '军事', hant: '軍事' }),
	'movie-stub': conv({ hans: '电影', hant: '電影' }),
	'music-stub': conv({ hans: '音乐', hant: '音樂' }),
	'physics-stub': conv({ hans: '物理学', hant: '物理學' }),
	'politic-stub': conv({ hans: '政治', hant: '政治' }),
	'religion-stub': conv({ hans: '宗教', hant: '宗教' }),
	'science-stub': conv({ hans: '科学', hant: '科學' }),
	'sport-stub': conv({ hans: '体育', hant: '體育' }),
	'stub': conv({ hans: '通用小作品', hant: '通用小作品' }),
	'switzerland-stub': conv({ hans: '瑞士', hant: '瑞士' }),
	'tech-stub': conv({ hans: '科技', hant: '科技' }),
	'transp-stub': conv({ hans: '交通', hant: '交通' }),
	'TV-stub': conv({ hans: '电视', hant: '電視' }),
	'UK-stub': conv({ hans: '英国', hant: '英國' }),
	'US-bio-stub': conv({ hans: '美国人物', hant: '美國人物' }),
	'US-geo-stub': conv({ hans: '美国地理', hant: '美國地理' }),
	'US-stub': conv({ hans: '美国', hant: '美國' }),
	'weather-stub': conv({ hans: '天气和特别的天气事件', hant: '天氣和特別的天氣事件' })
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!


Twinkle.stub.article.tagCategories = {
	[conv({ hans: '通用模板', hant: '通用模板' })]: [
		'stub',
		'expand list'
	],
	[conv({ hans: '国家和地理', hant: '國家和地理' })]: [
		'asia-stub',
		'europe-stub',
		'france-geo-stub',
		'geo-stub',
		'JP-stub',
		'switzerland-stub',
		'UK-stub',
		'US-bio-stub',
		'US-geo-stub',
		'US-stub'
	],
	[conv({ hans: '杂项', hant: '雜項' })]: [
		'food-stub',
		'hist-stub',
		'mil-stub',
		'politic-stub',
		'religion-stub',
		'transp-stub'
	],
	[conv({ hans: '人物', hant: '人物' })]: [
		'actor-stub',
		'bio-stub',
		'US-bio-stub'
	],
	[conv({ hans: '科学', hant: '科學' })]: [
		'biology-stub',
		'chem-stub',
		'math-stub',
		'med-stub',
		'physics-stub',
		'science-stub',
		'weather-stub'
	],
	[conv({ hans: '体育', hant: '體育' })]: [
		'sport-stub'
	],
	[conv({ hans: '技术', hant: '技術' })]: [
		'tech-stub'
	],
	[conv({ hans: '艺术', hant: '藝術' })]: [
		'actor-stub',
		'lit-stub',
		'movie-stub',
		'music-stub',
		'TV-stub'
	]
};
/* eslint-enable quote-props */

// Tags for REDIRECTS start here



Twinkle.stub.callbacks = {
	main: function(pageobj) {
		var params = pageobj.getCallbackParameters(),
			tagRe, summaryText = '加入',
			tags = [], groupableTags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText();

		var addTag = function friendlytagAddTag(tagIndex, tagName) {

			pageText += '\n{{' + tagName + '}}';

			if (tagIndex > 0) {
				if (tagIndex === (totalTags - 1)) {
					summaryText += '和';
				} else if (tagIndex < (totalTags - 1)) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[';
			summaryText += tagName.indexOf(':') !== -1 ? tagName : 'Template:' + tagName + '|' + tagName;
			summaryText += ']]}}';
		};

		// Check for preexisting tags and separate tags into groupable and non-groupable arrays
		for (i = 0; i < params.tags.length; i++) {
			tagRe = new RegExp('(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im');
			if (!tagRe.exec(pageText)) {
				tags = tags.concat(params.tags[i]);
			} else {
				Morebits.Status.info(
					conv({ hans: '信息', hant: '資訊' }),
					conv({
						hans: '在页面上找到{{' + params.tags[i] + '}}…跳过',
						hant: '在頁面上找到{{' + params.tags[i] + '}}…跳過'
					}));
			}
		}

		tags = tags.concat(groupableTags);

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		summaryText += conv({ hans: '标记到', hant: '標記到' }) + Twinkle.stub.mode;

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('watchStubbedPages'));
		pageobj.setMinorEdit(Twinkle.getPref('markStubbedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if (params.patrol) {
			pageobj.patrol();
		}
	}
};

Twinkle.stub.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};
	if (form.patrolPage) {
		params.patrol = form.patrolPage.checked;
	}

	switch (Twinkle.stub.mode) {
		case '條目':
		case '条目':
			params.tags = form.getChecked('articleTags');
			params.group = false;
			break;
		default:
			alert('Twinkle.stub：未知模式 ' + Twinkle.stub.mode);
			break;
	}

	if (!params.tags.length) {
		alert(conv({ hans: '必须选择至少一个标记！', hant: '必須選擇至少一個標記！' }));
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = conv({ hans: '标记完成，将在几秒内刷新页面', hant: '標記完成，將在幾秒內重新整理頁面' });
	if (Twinkle.stub.mode === '重定向') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '正在标记', hant: '正在標記' }) + Twinkle.stub.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.stub.mode) {
		case '條目':
		case '条目':
		/* falls through */
		case '重定向':
			wikipedia_page.load(Twinkle.stub.callbacks.main);
			return;
		case '文件':
		case '檔案':
			wikipedia_page.load(Twinkle.stub.callbacks.file);
			break;
		default:
			alert('Twinkle.stub：未知模式 ' + Twinkle.stub.mode);
			break;
	}
};

Twinkle.addInitCallback(Twinkle.stub, 'stub');
})();


// </nowiki>
