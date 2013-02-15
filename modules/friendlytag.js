/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles; file pages with a corresponding file
 *                         which is local (not on Commons); existing subpages of
 *                         {Wikipedia|Wikipedia talk}:Articles for creation;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if( Morebits.wiki.isPageRedirect() ) {
		Twinkle.tag.mode = '重定向';
		twAddPortletLink( Twinkle.tag.callback, "标记", "friendly-tag", "标记重定向" );
	}
	// article/draft article tagging
	else if( ( mw.config.get('wgNamespaceNumber') === 0 && mw.config.get('wgCurRevisionId') ) || ( mw.config.get('wgPageName') === 'Wikipedia:沙盒' ) ) {
		Twinkle.tag.mode = '条目';
		twAddPortletLink( Twinkle.tag.callback, "标记", "friendly-tag", "标记条目" );
	}
};

Twinkle.tag.callback = function friendlytagCallback( uid ) {
	var Window = new Morebits.simpleWindow( 630, (Twinkle.tag.mode === "条目") ? 450 : 400 );
	Window.setScriptName( "Twinkle" );
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#tag" );

	var form = new Morebits.quickForm( Twinkle.tag.callback.evaluate );

	switch( Twinkle.tag.mode ) {
		case '条目':
			Window.setTitle( "条目维护标记" );

			form.append( {
					type: 'checkbox',
					list: [
						{
							label: '如可能，合并入{{multiple issues}}',
							value: 'group',
							name: 'group',
							tooltip: '如果添加{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并入{{multiple issues}}模板中。',
							checked: Twinkle.getFriendlyPref('groupByDefault')
						}
					]
				}
			);

			form.append({
				type: 'select',
				name: 'sortorder',
				label: '察看列表：',
				tooltip: '您可以在Twinkle参数设置中更改此项。',
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: '按类别', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			form.append( { type: 'div', id: 'tagWorkArea' } );

			if( Twinkle.getFriendlyPref('customTagList').length ) {
				form.append( { type:'header', label:'自定义模板' } );
				form.append( { type: 'checkbox', name: 'articleTags', list: Twinkle.getFriendlyPref('customTagList') } );
			}
			break;

		case '重定向':
			Window.setTitle( "重定向标记" );

			form.append({ type: 'header', label:'拼写、错误拼写、时态和大小写模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.spellingList });

			form.append({ type: 'header', label:'其他名称模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.alternativeList });

			form.append({ type: 'header', label:'杂项和管理用重定向模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.administrativeList });
			break;

		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	if (Twinkle.tag.mode === "条目") {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent("Event");
		evt.initEvent("change", true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.updateSortOrder = function(e) {
	var sortorder = e.target.value;
	var $workarea = $(e.target.form).find("div#tagWorkArea");

	Twinkle.tag.checkedTags = e.target.form.getChecked("articleTags");
	if (!Twinkle.tag.checkedTags) {
		Twinkle.tag.checkedTags = [];
	}

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		} else if (tag === "merge" || tag === "merge from" || tag === "merge to") {
			var otherTagName = "merge";
			switch (tag)
			{
				case "merge from":
					otherTagName = "merge to";
					break;
				case "merge to":
					otherTagName = "merge from";
					break;
			}
			checkbox.subgroup = [
				{
					name: 'mergeTarget',
					type: 'input',
					label: '其他条目：',
					tooltip: '如指定复数个条目，请用管道符分隔：条目甲|条目乙'
				},
				{
					name: 'mergeTagOther',
					type: 'checkbox',
					list: [
						{
							label: '用{{' + otherTagName + '}}标记其他条目',
							checked: true,
							tooltip: '仅在只输入了一个条目名时有效'
						}
					]
				}
			];
			if (mw.config.get('wgNamespaceNumber') === 0) {
				checkbox.subgroup.push({
					name: 'mergeReason',
					type: 'textarea',
					label: '合并理由（会贴进讨论页）：',
					tooltip: '可选，但强烈推荐。如无必要请留空。'
				});
			}
		}
		return checkbox;
	};

	// categorical sort order
	if (sortorder === "cat") {
		var div = new Morebits.quickForm.element({
			type: "div",
			id: "tagWorkArea"
		});

		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, array) {
			var checkboxes = [];
			$.each(array, function(k, tag) {
				var description = Twinkle.tag.article.tags[tag];
				checkboxes.push(makeCheckbox(tag, description));
			});
			subdiv.append({
				type: "checkbox",
				name: "articleTags",
				list: checkboxes
			});
		};

		var i = 0;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.tag.article.tagCategories, function(title, content) {
			div.append({ type: "header", id: "tagHeader" + i, label: title });
			var subdiv = div.append({ type: "div", id: "tagSubdiv" + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: "div", label: [ Morebits.htmlNode("b", subtitle) ] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});

		var rendered = div.render();
		$workarea.replaceWith(rendered);
		var $rendered = $(rendered);
		$rendered.find("h5").css({ 'font-size': '110%', 'margin-top': '1em' });
		$rendered.find("div").filter(":has(span.quickformDescription)").css({ 'margin-top': '0.4em' });
	}
	// alphabetical sort order
	else {
		var checkboxes = [];
		$.each(Twinkle.tag.article.tags, function(tag, description) {
			checkboxes.push(makeCheckbox(tag, description));
		});
		var tags = new Morebits.quickForm.element({
			type: "checkbox",
			name: "articleTags",
			list: checkboxes
		});
		$workarea.empty().append(tags.render());
	}
};


// Tags for ARTICLES start here

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = {
	"advert": "类似广告",
	"autobiography": "类似一篇自传，或内容主要由条目描述的当事人或组织撰写、编辑",
	"blpdispute": "可能违反了维基百科关于生者传记的方针",
	"blpsources": "传记需要补充更多来源",
	"blpunsourced": "传记没有列出任何参考或来源",
	"catimprove": "需要更多页面分类",
	"citation style": "参考文献需要进行清理，以符合正确的引用、脚注或外部链接格式",
	"citecheck": "可能包含不适用或被曲解的引用资料，部分内容的准确性无法被证实",
	"cleanup": "可能需要进行清理，以符合维基百科的质量标准",
	"cleanup-jargon": "包含过多行话或专业术语，可能需要简化或提出进一步解释",
	"coi": "主要贡献者与本条目所宣扬的内容可能存在利益冲突",
	"contradict": "内容自相矛盾",
	"copyedit": "需要编修，以确保文法、用词、语气、格式、标点等使用恰当",
	"dead end": "需要更多连接去其他条目的链结以连入百科全书的链接网络",
	"disputed": "内容疑欠准确，有待查证",
	"expand": "需要扩充",
	"expert": "需要精通或熟悉本主题的专家参与编辑",
	"external links": "使用外部链接的方式可能不符合维基百科的方针或指引",
	"fansite": "类似爱好者站点",
	"globalize": "仅具有一部分地区的信息或观点，无法做到普世通用和完整表达包含广泛区域的信息、观点",
	"hoax": "真实性被质疑",
	"howto": "包含指南或教学内容",
	"in-universe": "使用小说故事内的观点描述一个虚构事物",
	"inappropriate person": "使用不适当的第一人称和第二人称",
	"inappropriate tone": "语调或风格可能不适合百科全书的写作方式",
	"lead section": "导言部分也许不足以概括其内容",
	"lead section too long": "导言部分也许过于冗长",
	"merge": "建议此页面与页面合并",
	"merge from": "建议将页面合并到本页面",
	"merge to": "建议将此页面合并至页面",
	"newsrelease": "阅读起来像是新闻稿，或包含过度的宣传性语调",
	"no footnotes": "由于缺少内文脚注，部分信息的来源仍然不明确",
	"non-free": "可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件",
	"notability": "可能不符合通用关注度指引，或下列标准：传记、虚构事物、发明研究或网站",
	"notmandarin": "包含过多不是现代标准汉语的内容",
	"onesource": "极大或完全地依赖于某个单一的来源",
	"original research": "可能包含原创研究或未查证内容",
	"orphan": "没有或只有很少链入页面",
	"overlinked": "可能含有太多的内部链接",
	"pov": "中立性有争议。内容、语调可能带有明显的个人观点或地方色彩",
	"primarysources": "需要可靠、公开、第三方的来源",
	"prose": "使用了列表式记述，可能需要改写为连贯的叙述性文字",
	"refimprove": "需要补充更多来源",
	"review": "阅读起来类似评论，需要清理",
	"rewrite": "不符合维基百科的质量标准，需要完全重写",
	"roughtranslation": "翻译品质不佳",
	"substub": "过于短小",
	"trivia": "应避免有陈列杂项、琐碎资料的部分",
	"uncategorized": "缺少页面分类",
	"unencyclopedic": "可能不适合写入百科全书",
	"unreferenced": "没有列出任何参考或来源",
	"update": "需要更新",
	"verylong": "可能过于冗长",
	"weasel": "可能因为语意模棱两可而损及其中立性或准确性"
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = {
	"清理和维护模板": {
		"常规清理": [
			"cleanup",
			"cleanup-jargon",
			"copyedit"
		],
		"可能多余的内容": [
			"external links",
			"non-free"
		],
		"结构和导言": [
			"lead section",
			"lead section too long",
			"verylong"
		],
		"小说相关清理": [
			"in-universe"
		]
	},
	"常规条目问题": {
		"重要性和知名度": [
			"notability"
		],
		"写作风格": [
			"advert",
			"fansite",
			"howto",
			"inappropriate person",
			"inappropriate tone",
			"newsrelease",
			"prose",
			"review"
		],
		"内容": [
			"expand",
			"substub",
			"unencyclopedic"
		],
		"信息和细节": [
			"expert",
			"trivia"
		],
		"时间性": [
			"update"
		],
		"中立、偏见和事实准确性": [
			"autobiography",
			"coi",
			"contradict",
			"disputed",
			"globalize",
			"hoax",
			"pov",
			"weasel"
		],
		"可供查证和来源": [
			"blpdispute",
			"blpsources",
			"blpunsourced",
			"citecheck",
			"no footnotes",
			"onesource",
			"original research",
			"primarysources",
			"refimprove",
			"unreferenced"
		]
	},
	"具体内容问题": {
		"语言": [
			"notmandarin",
			"roughtranslation"
		],
		"链接": [
			"dead end",
			"orphan",
			"overlinked"
		],
		"参考技术": [
			"citation style"
		],
		"分类": [
			"catimprove",
			"uncategorized"
		]
	},
	"合并": [
		"merge",
		"merge from",
		"merge to"
	]
};

// Tags for REDIRECTS start here

Twinkle.tag.spellingList = [
	{
		label: "{{簡繁重定向}}: 引导简体至繁体，或繁体至简体",
		value: '簡繁重定向'
	},
	{
		label: "{{模板重定向}}: 指向模板",
		value: '模板重定向'
	},
	{
		label: "{{别名重定向}}: 标题的其他名称、笔名、绰号、同义字等",
		value: '别名重定向'
	},
	{
		label: "{{縮寫重定向}}: 标题缩写",
		value: '縮寫重定向'
	},
	{
		label: "{{拼寫重定向}}: 标题的其他不同拼写",
		value: '拼寫重定向'
	},
	{
		label: "{{錯字重定向}}: 标题的常见错误拼写或误植",
		value: '錯字重定向'
	},
];

Twinkle.tag.alternativeList = [
	{
		label: "{{全名重定向}}: 标题的完整或更完整名称",
		value: '全名重定向'
	},
	{
		label: "{{短名重定向}}: 完整标题名称或人物全名的部分、不完整的名称或简称",
		value: '短名重定向'
	},
	{
		label: "{{姓氏重定向}}: 人物姓氏",
		value: '姓氏重定向'
	},
	{
		label: "{{人名重定向}}: 人物人名",
		value: '人名重定向'
	},
	{
		label: "{{非中文重定向}}: 非中文标题",
		value: '非中文重定向'
	},
	{
		label: "{{日文重定向}}: 日语名称",
		value: '日文重定向'
	}
];

Twinkle.tag.administrativeList = [
	{
		label: "{{角色重定向}}: 电视剧、电影、书籍等作品的角色",
		value: '角色重定向'
	},
	{
		label: "{{章節重定向}}: 导向至较高密度（散文般密集）组织的页面",
		value: '章節重定向'
	},
	{
		label: "{{列表重定向}}: 导向至低密度的列表",
		value: '列表重定向'
	},
	{
		label: "{{可能性重定向}}: 导向至当前提供内容更为详尽的目标页面、或该页面的章节段落",
		value: '可能性重定向'
	},
	{
		label: "{{關聯字重定向}}: 标题名称关联字",
		value: '關聯字重定向'
	},
	{
		label: "{{捷徑重定向}}: 维基百科捷径",
		value: '捷徑重定向'
	},
	{
		label: "{{重定向模板用重定向}}: 重定向模板用",
		value: '重定向模板用重定向'
	},
	{
		label: "{{EXIF重定向}}: JPEG图像包含EXIF信息",
		value: 'EXIF重定向'
	}
];


// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.tag.multipleIssuesExceptions = [
	'catimprove',
	'merge',
	'merge from',
	'merge to',
	'notmandarin',
	'roughtranslation',
	"substub",
	'uncategorized',
	'update'
];


Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = '添加',
		    tags = [], groupableTags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*(New unreviewed article|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";
			if( tagName === 'uncategorized' || tagName === 'catimprove' ) {
				pageText += '\n\n{{' + tagName +
					'|time={{subst:#time:c}}}}';
			} else {
				currentTag += ( Twinkle.tag.mode === '重定向' ? '\n' : '' ) + '{{' + tagName;

				// prompt for other parameters, based on the tag
				switch( tagName ) {
					case 'merge':
					case 'merge to':
					case 'merge from':
						if (params.mergeTarget) {
							// normalize the merge target for now and later
							params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));
							currentTag += '|' + params.mergeTarget;
							// link to the correct section on the talk page
							if (!params.talkPageLink) {
								params.talkPageLink = 'Talk:' + mw.config.get('wgTitle') + '#请求与' +
									params.mergeTarget + '合并';
							}
							currentTag += '|discuss=' + params.talkPageLink;
						}
						break;
					default:
						break;
				}

				currentTag += (Twinkle.tag.mode === '重定向') ? '}}' : '|time={{subst:#time:c}}}}\n';
				tagText += currentTag;
			}

			if ( tagIndex > 0 ) {
				if( tagIndex === (totalTags - 1) ) {
					summaryText += '和';
				} else if ( tagIndex < (totalTags - 1) ) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[';
			summaryText += (tagName.indexOf(":") !== -1 ? tagName : ("T:" + tagName + "|" + tagName));
			summaryText += ']]}}';
		};

		if( Twinkle.tag.mode !== '重定向' ) {
			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\})|\\|\\s*' + params.tags[i] + '\\s*=[a-z ]+\\d+)', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( params.tags[i] == 'notability' ) {
						wikipedia_page = new Morebits.wiki.page("Wikipedia:关注度/提报", "添加关注度记录项");
						wikipedia_page.setFollowRedirect(true);
						wikipedia_page.setCallbackParameters(params);
						wikipedia_page.load(Twinkle.tag.callbacks.notabilityList);
					}
					if( Twinkle.tag.multipleIssuesExceptions.indexOf(params.tags[i]) === -1 ) {
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Morebits.status.warn( '信息', '在页面上找到{{' + params.tags[i] +
						'}}…跳过' );
					// don't do anything else with merge tags
					if (params.tags[i] === "merge" || params.tags[i] === "merge from" || 
						params.tags[i] === "merge to") {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = false;
					}
				}
			}

			var miTest = /\{\{(multiple ?issues|article ?issues|mi)[^}]+\{/im.exec(pageText);
			var miOldStyleRegex = /\{\{(multiple ?issues|article ?issues|mi)\s*\|([^{]+)\}\}/im;
			var miOldStyleTest = miOldStyleRegex.exec(pageText);

			if( ( miTest || miOldStyleTest ) && groupableTags.length > 0 ) {
				Morebits.status.info( '信息', '添加支持的标记入已存在的{{multiple issues}}' );

				groupableTags.sort();
				tagText = "";

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += '标记' + '（在{{[[T:multiple issues|multiple issues]]}}内）';
				if( tags.length > 0 ) {
					summaryText += '和';
				}

				if( miOldStyleTest ) {
					// convert tags from old-style to new-style
					var split = miOldStyleTest[2].split("|");
					$.each(split, function(index, val) {
						split[index] = val.replace("=", "|time=").trim();
					});
					pageText = pageText.replace(miOldStyleRegex, "{{$1|\n{{" + split.join("}}\n{{") + "}}\n" + tagText + "}}\n");
				} else {
					var miRegex = new RegExp("(\\{\\{\\s*" + miTest[1] + "\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*", "im");
					pageText = pageText.replace(miRegex, "$1" + tagText + "}}\n");
				}
				tagText = "";
			} else if( params.group && groupableTags.length >= 3 ) {
				Morebits.status.info( '信息', '合并支持的模板入{{multiple issues}}' );

				groupableTags.sort();
				tagText += '{{multiple issues|\n';

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += '等标记（{{[[T:multiple issues|multiple issues]]}}）';
				if( tags.length > 0 ) {
					summaryText += '及';
				}
				tagText += '}}\n';
			} else {
				tags = tags.concat( groupableTags );
			}
		} else {
			// Redirect tagging: Check for pre-existing tags
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					tags = tags.concat( params.tags[i] );
				} else {
					Morebits.status.warn( '信息', '在重定向上找到{{' + params.tags[i] +
						'}}…跳过' );
				}
			}
		}

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		if( Twinkle.tag.mode === '重定向' ) {
			pageText += tagText;
		} else {
			// smartly insert the new tags after any hatnotes. Regex is a bit more
			// complicated than it'd need to be, to allow templates as parameters,
			// and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);
		}
		summaryText += ( tags.length > 0 ? '标记' : '' ) +
			'到' + Twinkle.tag.mode;

		// avoid truncated summaries
		if (summaryText.length > (254 - Twinkle.getPref('summaryAd').length)) {
			summaryText = summaryText.replace(/\[\[[^\|]+\|([^\]]+)\]\]/g, "$1");
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
		
		// special functions for merge tags
		var talkpageLink = null;
		if (params.mergeReason) {
			// post the rationale on the talk page
			// (only operates in main namespace)
			var talkpageText = "\n\n== 请求与[[" + params.mergeTarget + "]]合并 ==\n\n";
			talkpageText += params.mergeReason.trim() + "--~~~~";
			
			var talkpage = new Morebits.wiki.page("Talk:" + mw.config.get("wgTitle"), "将理由贴进讨论页");
			talkpage.setAppendText(talkpageText);
			talkpage.setEditSummary('请求将[[' + mw.config.get("wgTitle") +
				']]与[[' + params.mergeTarget + ']]合并' + Twinkle.getPref('summaryAd'));
			talkpage.setCreateOption('recreate');
			talkpage.append();
		}
		if (params.mergeTagOther) {
			// tag the target page if requested
			var otherTagName = "merge";
			if (tags.indexOf("merge from") !== -1) {
				otherTagName = "merge to";
			} else if (tags.indexOf("merge to") !== -1) {
				otherTagName = "merge from";
			}
			var newParams = { 
				tags: [otherTagName],
				mergeTarget: mw.config.get("wgPageName"),
				talkPageLink: params.talkPageLink
			};
			var otherpage = new Morebits.wiki.page(params.mergeTarget, "标记其他页面（" +
				params.mergeTarget + "）");
			otherpage.setCallbackParameters(newParams);
			otherpage.load(Twinkle.tag.callbacks.main);
		}
	},

	notabilityList: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		pageobj.setAppendText("\n{{subst:Wikipedia:关注度/提报/item|title=" + mw.config.get('wgPageName') + "}}");
		pageobj.setEditSummary("添加[[" + mw.config.get('wgPageName') + "]]。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};

	switch (Twinkle.tag.mode) {
		case '条目':
			params.tags = form.getChecked( 'articleTags' );
			params.group = form.group.checked;
			params.mergeTarget = form["articleTags.mergeTarget"] ? form["articleTags.mergeTarget"].value : null;
			params.mergeReason = form["articleTags.mergeReason"] ? form["articleTags.mergeReason"].value : null;
			params.mergeTagOther = form["articleTags.mergeTagOther"] ? form["articleTags.mergeTagOther"].checked : false;
			break;
		case '重定向':
			params.tags = form.getChecked( 'redirectTags' );
			break;
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	if( !params.tags.length ) {
		alert( '必须选择至少一个标记！' );
		return;
	}
	if( params.mergeTagOther && params.mergeTarget.indexOf('|') !== -1 ) {
		alert( '目前还不支持在一次合并中标记多个条目。请不要勾选“标记其他条目”并重试。' );
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "标记完成，在几秒内刷新页面";
	if (Twinkle.tag.mode === '重定向') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "正在标记" + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case '条目':
			/* falls through */
		case '重定向':
			wikipedia_page.load(Twinkle.tag.callbacks.main);
			return;
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}
};
