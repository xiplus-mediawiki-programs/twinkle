//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if( Morebits.wiki.isPageRedirect() ) {
		Twinkle.tag.mode = '重定向';
		Twinkle.addPortletLink( Twinkle.tag.callback, wgULS("标记", "標記"), "friendly-tag", wgULS("标记重定向", "標記重定向") );
	}
	// article/draft tagging
	else if( ( ( mw.config.get('wgNamespaceNumber') === 0 || mw.config.get('wgNamespaceNumber') === 118 ) && mw.config.get('wgCurRevisionId') ) || ( Morebits.pageNameNorm === 'Wikipedia:沙盒' ) ) {
		Twinkle.tag.mode = wgULS('条目', '條目');
		Twinkle.addPortletLink( Twinkle.tag.callback, wgULS("标记", "標記"), "friendly-tag", wgULS("标记条目", "標記條目") );
	}
};

Twinkle.tag.callback = function friendlytagCallback() {
	var Window = new Morebits.simpleWindow( 630, (Twinkle.tag.mode === "条目" || Twinkle.tag.mode === "條目") ? 500 : 400 );
	Window.setScriptName( "Twinkle" );
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#tag" );

	var form = new Morebits.quickForm( Twinkle.tag.callback.evaluate );

	if (document.getElementsByClassName("patrollink").length) {
		form.append( {
			type: 'checkbox',
			list: [
				{
					label: wgULS('标记页面为已巡查', '標記頁面為已巡查'),
					value: 'patrolPage',
					name: 'patrolPage',
					checked: Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled')
				}
			]
		} );
	}

	switch( Twinkle.tag.mode ) {
		case '條目':
		case '条目':
			Window.setTitle( wgULS("条目维护标记", "條目維護標記") );

			form.append({
				type: 'select',
				name: 'sortorder',
				label: wgULS('查看列表：', '檢視列表：'),
				tooltip: wgULS('您可以在Twinkle参数设置（WP:TWPREFS）中更改此项。', '您可以在Twinkle偏好設定（WP:TWPREFS）中更改此項。'),
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: wgULS('按类别', '按類別'), selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			form.append({
				type: 'div',
				id: 'tagWorkArea',
				className: 'morebits-scrollbox',
				style: 'max-height: 28em'
			});

			form.append( {
					type: 'checkbox',
					list: [
						{
							label: wgULS('如可能，合并入{{multiple issues}}', '如可能，合併入{{multiple issues}}'),
							value: 'group',
							name: 'group',
							tooltip: wgULS('如果添加{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并入{{multiple issues}}模板中。',
									'如果添加{{multiple issues}}支持的三個以上的模板，所有支持的模板都會被合並入{{multiple issues}}模板中。'),
							checked: Twinkle.getFriendlyPref('groupByDefault')
						}
					]
				}
			);

			break;

		case '重定向':
			Window.setTitle( wgULS("重定向标记", "重定向標記") );

			form.append({ type: 'header', label:'常用模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.frequentList });

			form.append({ type: 'header', label:'偶用模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.lessFrequentList });

			form.append({ type: 'header', label:wgULS('鲜用模板', '鮮用模板') });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.rareList });
			break;

		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	if (Twinkle.tag.mode === "条目" || Twinkle.tag.mode === "條目") {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent("Event");
		evt.initEvent("change", true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.updateSortOrder = function(e) {
	var sortorder = e.target.value;

	Twinkle.tag.checkedTags = e.target.form.getChecked("articleTags");
	if (!Twinkle.tag.checkedTags) {
		Twinkle.tag.checkedTags = [];
	}

	var container = new Morebits.quickForm.element({ type: "fragment" });

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}
		switch (tag) {
			case "merge":
			case "merge from":
			case "merge to":
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
						label: wgULS('其他条目：', '其他條目：'),
						tooltip: wgULS('如指定多个条目，请用管道符分隔：条目甲|条目乙', '如指定多個條目，請用管道符分隔：條目甲|條目乙')
					},
					{
						name: 'mergeTagOther',
						type: 'checkbox',
						list: [
							{
								label: '用{{' + otherTagName + wgULS('}}标记其他条目', '}}標記其他條目'),
								checked: true,
								tooltip: wgULS('仅在只输入了一个条目名时可用', '僅在只輸入了一個條目名時可用')
							}
						]
					}
				];
				if (mw.config.get('wgNamespaceNumber') === 0) {
					checkbox.subgroup.push({
						name: 'mergeReason',
						type: 'textarea',
						label: wgULS('合并理由（会被贴上' +
							(tag === "merge to" ? '其他' : '这') + '条目的讨论页）：',
							'合併理由（會被貼上' +
							(tag === "merge to" ? '其他' : '這') + '條目的討論頁）：'),
						tooltip: wgULS('可选，但强烈推荐。如不需要请留空。仅在只输入了一个条目名时可用。', '可選，但強烈推薦。如不需要請留空。僅在只輸入了一個條目名時可用。')
					});
				}
				break;
			case "requested move":
				checkbox.subgroup = [
					{
						name: 'moveTarget',
						type: 'input',
						label: wgULS('新名称：', '新名稱：')
					},
					{
						name: 'moveReason',
						type: 'textarea',
						label: wgULS('移动理由（会被贴上这条目的讨论页）：', '移動理由（會被貼上這條目的討論頁）：'),
						tooltip: wgULS('可选，但强烈推荐。如不需要请留空。', '可選，但強烈推薦。如不需要請留空。')
					}
				];
				break;
			case "notability":
				checkbox.subgroup = {
					name: 'notability',
					type: 'select',
					list: [
						{ label: "{{notability}}："+ wgULS("通用的关注度指引", "通用的關注度指引"), value: "none" },
						{ label: "{{notability|Biographies}}：" + wgULS("人物传记", "人物傳記"), value: "Biographies" },
						{ label: "{{notability|Book}}：" + wgULS("书籍", "書籍"), value: "Book" },
						{ label: "{{notability|Number}}：" + wgULS("数字", "數字"), value: "Number" },
						{ label: "{{notability|Fiction}}：" + wgULS("虚构事物", "虛構事物"), value: "Fiction" },
						{ label: "{{notability|Neologisms}}：" + wgULS("发明、研究", "發明、研究"), value: "Neologisms" },
						{ label: "{{notability|Web}}：" + wgULS("网站、网络内容", "網站、網路內容"), value: "Web"}
					]
				};
				break;
			default:
				break;
		}
		return checkbox;
	};

	// categorical sort order
	if (sortorder === "cat") {
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
			container.append({ type: "header", id: "tagHeader" + i, label: title });
			var subdiv = container.append({ type: "div", id: "tagSubdiv" + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: "div", label: [ Morebits.htmlNode("b", subtitle) ] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});
	}
	// alphabetical sort order
	else {
		var checkboxes = [];
		$.each(Twinkle.tag.article.tags, function(tag, description) {
			checkboxes.push(makeCheckbox(tag, description));
		});
		container.append({
			type: "checkbox",
			name: "articleTags",
			list: checkboxes
		});
	}

	// append any custom tags
	if (Twinkle.getFriendlyPref('customTagList').length) {
		container.append({ type: 'header', label: wgULS('自定义模板', '自訂模板') });
		container.append({ type: 'checkbox', name: 'articleTags', list: Twinkle.getFriendlyPref('customTagList') });
	}

	var $workarea = $(e.target.form).find("div#tagWorkArea");
	var rendered = container.render();
	$workarea.empty().append(rendered);

	// style adjustments
	$workarea.find("h5").css({ 'font-size': '110%' });
	$workarea.find("h5:not(:first-child)").css({ 'margin-top': '1em' });
	$workarea.find("div").filter(":has(span.quickformDescription)").css({ 'margin-top': '0.4em' });

	// add a link to each template's description page
	$.each(Morebits.quickForm.getElements(e.target.form, "articleTags"), function(index, checkbox) {
		var $checkbox = $(checkbox);
		var link = Morebits.htmlNode("a", ">");
		link.setAttribute("class", "tag-template-link");
		link.setAttribute("href", mw.util.getUrl("Template:" +
			Morebits.string.toUpperCaseFirstChar(checkbox.values)));
		link.setAttribute("target", "_blank");
		$checkbox.parent().append(["\u00A0", link]);
	});
};


// Tags for ARTICLES start here

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = wgULS({
	"advert": "类似广告或宣传性内容",
	"autobiography": "类似一篇自传，或内容主要由条目描述的当事人或组织撰写、编辑",
	"blpdispute": "可能违反了维基百科关于生者传记的方针",
	"blpsources": "生者传记需要补充更多可供查证的来源",
	"blpunsourced": "生者传记没有列出任何参考或来源",
	"catimprove": "需要更多页面分类",
	"citation style": "引用需要进行清理",
	"citecheck": "可能包含不适用或被曲解的引用资料，部分内容的准确性无法被证实",
	"cleanup": "可能需要进行清理，以符合维基百科的质量标准",
	"cleanup-jargon": "包含过多行话或专业术语，可能需要简化或提出进一步解释",
	"coi": "主要贡献者与本条目所宣扬的内容可能存在利益冲突",
	"copypaste": "内容可能是从某个来源处拷贝后贴上",
	"contradict": "内容自相矛盾",
	"copyedit": "需要编修，以确保文法、用词、语气、格式、标点等使用恰当",
	"dead end": "需要更多内部连接以构筑百科全书的链接网络",
	"disputed": "内容疑欠准确，有待查证",
	"expand": "需要扩充",
	"expert": "需要精通或熟悉本主题的专业人士参与及协助编辑",
	"external links": "使用外部链接的方式可能不符合维基百科的方针或指引",
	"fansite": "类似爱好者网页",
	"globalize": "仅具有一部分地区的信息或观点",
	"hoax": "真实性被质疑",
	"howto": "包含指南或教学内容",
	"in-universe": "使用小说故事内的观点描述一个虚构事物",
	"inappropriate person": "使用不适当的第一人称和第二人称",
	"inappropriate tone": "语调或风格可能不适合百科全书的写作方式",
	"lead section": "导言部分也许不足以概括其内容",
	"lead section too long": "导言部分也许过于冗长",
	"merge": "建议此页面与页面合并",
	"merge from": "建议将页面并入本页面",
	"merge to": "建议将此页面并入页面",
	"newsrelease": "阅读起来像是新闻稿及包含过度的宣传性语调",
	"no footnotes": "因为没有内文引用而来源仍然不明",
	"non-free": "可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件",
	"notability": "可能不符合通用关注度指引",
	"Notability Unreferenced": "可能具备关注度，但需要来源加以彰显",
	"notmandarin": "包含过多不是现代标准汉语的内容",
	"onesource": "极大或完全地依赖于某个单一的来源",
	"original research": "可能包含原创研究或未查证内容",
	"orphan": "没有或只有很少链入页面",
	"overlinked": "含有过多、重复、或不必要的内部链接",
	"overly detailed": "包含太多过度细节内容",
	"plot": "可能包含过于详细的剧情摘要",
	"pov": "中立性有争议。内容、语调可能带有明显的个人观点或地方色彩",
	"primarysources": "依赖第一手来源",
	"prose": "使用了日期或时间列表式记述，需要改写为连贯的叙述性文字",
	"refimprove": "需要补充更多来源",
	"requested move": "建议将此页面移动到新名称",
	"review": "阅读起来类似评论，需要清理",
	"rewrite": "不符合维基百科的质量标准，需要完全重写",
	"roughtranslation": "翻译品质不佳",
	"substub": "过于短小",
	"trivia": "应避免有陈列杂项、琐碎资料的部分",
	"uncategorized": "缺少页面分类",
	"unencyclopedic": "可能不适合写入百科全书",
	"unreferenced": "没有列出任何参考或来源",
	"update": "当前条目或章节需要更新",
	"verylong": "可能过于冗长",
	"weasel": "语意模棱两可而损及其中立性或准确性"
}, {
	"advert": "類似廣告或宣傳性內容",
	"autobiography": "類似一篇自傳，或內容主要由條目描述的當事人或組織撰寫、編輯",
	"blpdispute": "可能違反了維基百科關於生者傳記的方針",
	"blpsources": "生者傳記需要補充更多可供查證的來源",
	"blpunsourced": "生者傳記沒有列出任何參考或來源",
	"catimprove": "需要更多頁面分類",
	"citation style": "引用需要進行清理",
	"citecheck": "可能包含不適用或被曲解的引用資料，部分內容的準確性無法被證實",
	"cleanup": "可能需要進行清理，以符合維基百科的質量標準",
	"cleanup-jargon": "包含過多行話或專業術語，可能需要簡化或提出進一步解釋",
	"coi": "主要貢獻者與本條目所宣揚的內容可能存在利益衝突",
	"copypaste": "內容可能是從某個來源處拷貝後貼上",
	"contradict": "內容自相矛盾",
	"copyedit": "需要編修，以確保文法、用詞、語氣、格式、標點等使用恰當",
	"dead end": "需要更多內部連結以構築百科全書的連結網絡",
	"disputed": "內容疑欠準確，有待查證",
	"expand": "需要擴充",
	"expert": "需要精通或熟悉本主題的專業人士參與及協助編輯",
	"external links": "使用外部連結的方式可能不符合維基百科的方針或指引",
	"fansite": "類似愛好者網頁",
	"globalize": "僅具有一部分地區的資訊或觀點",
	"hoax": "真實性被質疑",
	"howto": "包含指南或教學內容",
	"in-universe": "使用小說故事內的觀點描述一個虛構事物",
	"inappropriate person": "使用不適當的第一人稱和第二人稱",
	"inappropriate tone": "語調或風格可能不適合百科全書的寫作方式",
	"lead section": "導言部分也許不足以概括其內容",
	"lead section too long": "導言部分也許過於冗長",
	"merge": "建議此頁面與頁面合併",
	"merge from": "建議將頁面併入本頁面",
	"merge to": "建議將此頁面併入頁面",
	"newsrelease": "閱讀起來像是新聞稿及包含過度的宣傳性語調",
	"no footnotes": "因為沒有內文引用而來源仍然不明",
	"non-free": "可能過多或不當地使用了受版權保護的文字、圖像或/及多媒體檔案",
	"notability": "可能不符合通用關注度指引",
	"Notability Unreferenced": "可能具備關注度，但需要來源加以彰顯",
	"notmandarin": "包含過多不是現代標準漢語的內容",
	"onesource": "極大或完全地依賴於某個單一的來源",
	"original research": "可能包含原創研究或未查證內容",
	"orphan": "沒有或只有很少連入頁面",
	"overlinked": "含有過多、重複、或不必要的內部連結",
	"overly detailed": "包含太多過度細節內容",
	"plot": "可能包含過於詳細的劇情摘要",
	"pov": "中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩",
	"primarysources": "依賴第一手來源",
	"prose": "使用了日期或時間列表式記述，需要改寫為連貫的敘述性文字",
	"refimprove": "需要補充更多來源",
	"requested move": "建議將此頁面移動到新名稱",
	"review": "閱讀起來類似評論，需要清理",
	"rewrite": "不符合維基百科的質量標準，需要完全重寫",
	"roughtranslation": "翻譯品質不佳",
	"substub": "過於短小",
	"trivia": "應避免有陳列雜項、瑣碎資料的部分",
	"uncategorized": "缺少頁面分類",
	"unencyclopedic": "可能不適合寫入百科全書",
	"unreferenced": "沒有列出任何參考或來源",
	"update": "當前條目或章節需要更新",
	"verylong": "可能過於冗長",
	"weasel": "語意模棱兩可而損及其中立性或準確性"
});

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = wgULS({
	"清理和维护模板": {
		"常规清理": [
			"cleanup",
			"cleanup-jargon",
			"copyedit"
		],
		"可能多余的内容": [
			"copypaste",
			"external links",
			"non-free"
		],
		"结构和导言": [
			"lead section",
			"lead section too long",
			"verylong"
		],
		"虚构作品相关清理": [
			"in-universe",
			"plot"
		]
	},
	"常规条目问题": {
		"重要性和知名度": [
			"notability",  // has subcategories and special-cased code
			"Notability Unreferenced"
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
			"overly detailed",
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
	"合并": [  // these three have a subgroup with several options
		"merge",
		"merge from",
		"merge to"
	],
	"移动": [  // this one have a subgroup with several options
		"requested move"
	]
}, {
	"清理和維護模板": {
		"常規清理": [
			"cleanup",
			"cleanup-jargon",
			"copyedit"
		],
		"可能多餘的內容": [
			"copypaste",
			"external links",
			"non-free"
		],
		"結構和導言": [
			"lead section",
			"lead section too long",
			"verylong"
		],
		"虛構作品相關清理": [
			"in-universe",
			"plot"
		]
	},
	"常規條目問題": {
		"重要性和知名度": [
			"notability",  // has subcategories and special-cased code
			"Notability Unreferenced"
		],
		"寫作風格": [
			"advert",
			"fansite",
			"howto",
			"inappropriate person",
			"inappropriate tone",
			"newsrelease",
			"prose",
			"review"
		],
		"內容": [
			"expand",
			"substub",
			"unencyclopedic"
		],
		"資訊和細節": [
			"expert",
			"overly detailed",
			"trivia"
		],
		"時間性": [
			"update"
		],
		"中立、偏見和事實準確性": [
			"autobiography",
			"coi",
			"contradict",
			"disputed",
			"globalize",
			"hoax",
			"pov",
			"weasel"
		],
		"可供查證和來源": [
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
	"具體內容問題": {
		"語言": [
			"notmandarin",
			"roughtranslation"
		],
		"連結": [
			"dead end",
			"orphan",
			"overlinked"
		],
		"參考技術": [
			"citation style"
		],
		"分類": [
			"catimprove",
			"uncategorized"
		]
	},
	"合併": [  // these three have a subgroup with several options
		"merge",
		"merge from",
		"merge to"
	],
	"移動": [  // this one have a subgroup with several options
		"requested move"
	]
});

// Tags for REDIRECTS start here

Twinkle.tag.frequentList = wgULS([
	{
		label: '{{合并重定向}}：保持页面题名至相应主条目，令页面内容在合并后仍能保存其编辑历史',
		value: '合并重定向'
	},
	{
		label: '{{简繁重定向}}：引导简体至繁体，或繁体至简体',
		value: '简繁重定向'
	},
	{
		label: '{{关注度重定向}}：缺乏关注度的子主题向有关注度的母主题的重定向',
		value: '关注度重定向'
	},
	{
		label: '{{模板重定向}}：指向模板的重定向页面',
		value: '模板重定向'
	},
	{
		label: '{{别名重定向}}：标题的其他名称、笔名、绰号、同义字等',
		value: '别名重定向'
	},
	{
		label: '{{译名重定向}}：人物、作品等各项事物的其他翻译名称',
		value: '译名重定向'
	},
	{
		label: '{{缩写重定向}}：标题缩写',
		value: '缩写重定向'
	},
	{
		label: '{{拼写重定向}}：标题的其他不同拼写',
		value: '拼写重定向'
	},
	{
		label: '{{错字重定向}}：纠正标题的常见错误拼写或误植',
		value: '错字重定向'
	},
	{
		label: '{{旧名重定向}}：将事物早前的名称引导至更改后的主题',
		value: '旧名重定向'
	},
	{
		label: '{{历史名称重定向}}：具有历史意义的别名、笔名、同义词',
		value: '历史名称重定向'
	},
	{
		label: '{{全名重定向}}：标题的完整或更完整名称',
		value: '全名重定向'
	},
	{
		label: '{{短名重定向}}：完整标题名称或人物全名的部分、不完整的名称或简称',
		value: '短名重定向'
	},
	{
		label: '{{姓氏重定向}}：人物姓氏',
		value: '姓氏重定向'
	},
	{
		label: '{{名字重定向}}：人物人名',
		value: '名字重定向'
	},
	{
		label: '{{本名重定向}}：人物本名',
		value: '本名重定向'
	},
	{
		label: '{{非中文重定向}}：非中文标题',
		value: '非中文重定向'
	},
	{
		label: '{{日文重定向}}：日语名称',
		value: '日文重定向'
	}
], [
	{
		label: '{{合併重定向}}：保持頁面題名至相應主條目，令頁面內容在合併後仍能儲存其編輯歷史',
		value: '合併重定向'
	},
	{
		label: '{{簡繁重定向}}：引導簡體至繁體，或繁體至簡體',
		value: '簡繁重定向'
	},
	{
		label: '{{關注度重定向}}：缺乏關注度的子主題向有關注度的母主題的重定向',
		value: '關注度重定向'
	},
	{
		label: '{{模板重定向}}：指向模板的重定向頁面',
		value: '模板重定向'
	},
	{
		label: '{{別名重定向}}：標題的其他名稱、筆名、綽號、同義字等',
		value: '別名重定向'
	},
	{
		label: '{{譯名重定向}}：人物、作品等各項事物的其他翻譯名稱',
		value: '譯名重定向'
	},
	{
		label: '{{縮寫重定向}}：標題縮寫',
		value: '縮寫重定向'
	},
	{
		label: '{{拼寫重定向}}：標題的其他不同拼寫',
		value: '拼寫重定向'
	},
	{
		label: '{{錯字重定向}}：糾正標題的常見錯誤拼寫或誤植',
		value: '錯字重定向'
	},
	{
		label: '{{舊名重定向}}：將事物早前的名稱引導至更改後的主題',
		value: '舊名重定向'
	},
	{
		label: '{{歷史名稱重定向}}：具有歷史意義的別名、筆名、同義詞',
		value: '歷史名稱重定向'
	},
	{
		label: '{{全名重定向}}：標題的完整或更完整名稱',
		value: '全名重定向'
	},
	{
		label: '{{短名重定向}}：完整標題名稱或人物全名的部分、不完整的名稱或簡稱',
		value: '短名重定向'
	},
	{
		label: '{{姓氏重定向}}：人物姓氏',
		value: '姓氏重定向'
	},
	{
		label: '{{名字重定向}}：人物人名',
		value: '名字重定向'
	},
	{
		label: '{{本名重定向}}：人物本名',
		value: '本名重定向'
	},
	{
		label: '{{非中文重定向}}：非中文標題',
		value: '非中文重定向'
	},
	{
		label: '{{日文重定向}}：日語名稱',
		value: '日文重定向'
	}
]);

Twinkle.tag.lessFrequentList = wgULS([
	{
		label: '{{角色重定向}}：电视剧、电影、书籍等作品的角色',
		value: '角色重定向'
	},
	{
		label: '{{章节重定向}}：导向至较高密度组织的页面',
		value: '章节重定向'
	},
	{
		label: '{{列表重定向}}：导向至低密度的列表',
		value: '列表重定向'
	},
	{
		label: '{{可能性重定向}}：导向至当前提供内容更为详尽的目标页面',
		value: '可能性重定向'
	},
	{
		label: '{{关联字重定向}}：标题名称关联字',
		value: '关联字重定向'
	},
	{
		label: '{{条目请求重定向}}：需要独立条目的页面',
		value: '条目请求重定向'
	},
	{
		label: '{{快捷方式重定向}}：维基百科快捷方式',
		value: '快捷方式重定向'
	}
], [
	{
		label: '{{角色重定向}}：電視劇、電影、書籍等作品的角色',
		value: '角色重定向'
	},
	{
		label: '{{章節重定向}}：導向至較高密度組織的頁面',
		value: '章節重定向'
	},
	{
		label: '{{列表重定向}}：導向至低密度的列表',
		value: '列表重定向'
	},
	{
		label: '{{可能性重定向}}：導向至當前提供內容更為詳盡的目標頁面',
		value: '可能性重定向'
	},
	{
		label: '{{關聯字重定向}}：標題名稱關聯字',
		value: '關聯字重定向'
	},
	{
		label: '{{條目請求重定向}}：需要獨立條目的頁面',
		value: '條目請求重定向'
	},
	{
		label: '{{快捷方式重定向}}：維基百科快捷方式',
		value: '快捷方式重定向'
	}
]);

Twinkle.tag.rareList = wgULS([
	{
		label: '{{词组重定向}}：将词组/词组/成语指向切题的条目及恰当章节',
		value: '词组重定向'
	},
	{
		label: '{{消歧义页重定向}}：指向消歧义页',
		value: '消歧义页重定向'
	},
	{
		label: '{{域名重定向}}：网域名称',
		value: '域名重定向'
	},
	{
		label: '{{年代重定向}}：于年份条目导向至年代条目',
		value: '年代重定向'
	},
	{
		label: '{{用户框模板重定向}}：用户框模板',
		value: '用户框模板重定向'
	},
	{
		label: '{{重定向模板用重定向}}：导向至重定向模板',
		value: '重定向模板用重定向'
	},
	{
		label: '{{EXIF重定向}}：JPEG图像包含EXIF信息',
		value: 'EXIF重定向'
	}
], [
	{
		label: '{{詞組重定向}}：將詞組/詞組/成語指向切題的條目及恰當章節',
		value: '詞組重定向'
	},
	{
		label: '{{消歧義頁重定向}}：指向消歧義頁',
		value: '消歧義頁重定向'
	},
	{
		label: '{{域名重定向}}：網域名稱',
		value: '域名重定向'
	},
	{
		label: '{{年代重定向}}：於年份條目導向至年代條目',
		value: '年代重定向'
	},
	{
		label: '{{用戶框模板重定向}}：用戶框模板',
		value: '用戶框模板重定向'
	},
	{
		label: '{{重定向模板用重定向}}：導向至重定向模板',
		value: '重定向模板用重定向'
	},
	{
		label: '{{EXIF重定向}}：JPEG圖檔包含EXIF資訊',
		value: 'EXIF重定向'
	}
]);


// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.tag.multipleIssuesExceptions = [
	'catimprove',
	'merge',
	'merge from',
	'merge to',
	'notability',
	'notmandarin',
	"substub",
	'requested move',
	'uncategorized'
];


Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = wgULS('添加', '加入'),
		    tags = [], groupableTags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";
			if( tagName === 'uncategorized' || tagName === 'catimprove' ) {
				pageText += '\n\n{{' + tagName +
					'|time={{subst:#time:c}}}}';
			} else {
				currentTag += ( Twinkle.tag.mode === '重定向' ? '\n' : '' ) + '{{' + tagName;

				if( tagName === 'notability' && params.tagParameters.notability !== 'none' ) {
					currentTag += '|||' + params.tagParameters.notability;
				}

				// prompt for other parameters, based on the tag
				switch( tagName ) {
					case 'merge':
					case 'merge to':
					case 'merge from':
						if (params.mergeTarget) {
							// normalize the merge target for now and later
							params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));

							currentTag += '|' + params.mergeTarget;

							// link to the correct section on the talk page, for article space only
							if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
								if (!params.discussArticle) {
									// discussArticle is the article whose talk page will contain the discussion
									params.discussArticle = (tagName === "merge to" ? params.mergeTarget : mw.config.get('wgTitle'));
									// nonDiscussArticle is the article which won't have the discussion
									params.nonDiscussArticle = (tagName === "merge to" ? mw.config.get('wgTitle') : params.mergeTarget);
									params.talkDiscussionTitle = wgULS('请求与' + params.nonDiscussArticle + '合并', '請求與' + params.nonDiscussArticle + '合併');
								}
								currentTag += '|discuss=Talk:' + params.discussArticle + '#' + params.talkDiscussionTitle;
							}
						}
						break;
					case 'requested move':
						if (params.moveTarget) {
							// normalize the move target for now and later
							params.moveTarget = Morebits.string.toUpperCaseFirstChar(params.moveTarget.replace(/_/g, ' '));
							params.discussArticle = mw.config.get('wgTitle');
							currentTag += '|' + params.moveTarget;
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
					if( params.tags[i] === 'notability' ) {
						var wikipedia_page = new Morebits.wiki.page("Wikipedia:关注度/提报", wgULS("添加关注度记录项", "加入關注度記錄項"));
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
					Morebits.status.warn( wgULS('信息', '資訊'), wgULS('在页面上找到{{' + params.tags[i] +
						'}}…跳过', '在頁面上找到{{' + params.tags[i] +
						'}}…跳過') );
					// don't do anything else with merge tags
					if (params.tags[i] === "merge" || params.tags[i] === "merge from" ||
						params.tags[i] === "merge to") {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = false;
					}
					// don't do anything else with requested move tags
					if (params.tags[i] === "requested move") {
						params.moveTarget = params.moveReason = false;
					}
				}
			}

			var miTest = /\{\{(multiple ?issues|article ?issues|mi)[^}]+\{/im.exec(pageText);
			var miOldStyleRegex = /\{\{(multiple ?issues|article ?issues|mi)\s*\|([^{]+)\}\}/im;
			var miOldStyleTest = miOldStyleRegex.exec(pageText);

			if( ( miTest || miOldStyleTest ) && groupableTags.length > 0 ) {
				Morebits.status.info( wgULS('信息', '資訊'), wgULS('添加支持的标记入已存在的{{multiple issues}}', '添加支持的標記入已存在的{{multiple issues}}') );

				groupableTags.sort();
				tagText = "";

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += wgULS('标记', '標記') + '（在{{[[T:multiple issues|multiple issues]]}}' + wgULS('内', '內') +'）';
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
				Morebits.status.info( wgULS('信息', '資訊'), wgULS('合并支持的模板入{{multiple issues}}', '合併支援的模板入{{multiple issues}}') );

				groupableTags.sort();
				tagText += '{{multiple issues|\n';

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += wgULS('等标记', '等標記') + '（{{[[T:multiple issues|multiple issues]]}}）';
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
					Morebits.status.warn( wgULS('信息', '資訊'), wgULS('在重定向上找到{{' + params.tags[i] +
						'}}…跳过', '在重定向上找到{{' + params.tags[i] +
						'}}…跳過') );
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
		summaryText += ( tags.length > 0 ? wgULS('标记', '標記') : '' ) +
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
		pageobj.save(function() {
			// special functions for merge tags
			if (params.mergeReason) {
				// post the rationale on the talk page (only operates in main namespace)
				var talkpageText = "\n\n== 请求与[[" + params.nonDiscussArticle + "]]合并 ==\n\n";
				talkpageText += params.mergeReason.trim() + "--~~~~";

				var talkpage = new Morebits.wiki.page("Talk:" + params.discussArticle, wgULS("将理由贴进讨论页", "將理由貼進討論頁"));
				talkpage.setAppendText(talkpageText);
				talkpage.setEditSummary(wgULS('请求将[[' + params.nonDiscussArticle + ']]' +
					'与' + '[[' + params.discussArticle + ']]合并', '請求將[[' + params.nonDiscussArticle + ']]' +
					'與' + '[[' + params.discussArticle + ']]合併') +
					Twinkle.getPref('summaryAd'));
				talkpage.setWatchlist(Twinkle.getFriendlyPref('watchMergeDiscussions'));
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
					mergeTarget: Morebits.pageNameNorm,
					discussArticle: params.discussArticle,
					talkDiscussionTitle: params.talkDiscussionTitle
				};
				var otherpage = new Morebits.wiki.page(params.mergeTarget, wgULS("标记其他页面（", "標記其他頁面（") +
					params.mergeTarget + "）");
				otherpage.setCallbackParameters(newParams);
				otherpage.load(Twinkle.tag.callbacks.main);
			}
			// special functions for requested move tags
			if (params.moveReason) {
				// post the rationale on the talk page (only operates in main namespace)
				var talkpageText = "\n\n{{subst:RM|"+params.moveReason.trim();
				if (params.moveTarget) {
					talkpageText += "|" + params.moveTarget;
				}
				talkpageText += "}}";

				var talkpage = new Morebits.wiki.page("Talk:" + params.discussArticle, wgULS("将理由贴进讨论页", "將理由貼進討論頁"));
				talkpage.setAppendText(talkpageText);
				talkpage.setEditSummary(wgULS('请求移动' + (params.moveTarget ? "至[[" + params.moveTarget + "]]" : ""), '請求移動' + (params.moveTarget ? "至[[" + params.moveTarget + "]]" : "")) +
					Twinkle.getPref('summaryAd'));
				talkpage.setCreateOption('recreate');
				talkpage.append();
			}
		});

		if( params.patrol ) {
			pageobj.patrol();
		}
	},

	notabilityList: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		pageobj.setAppendText("\n{{subst:Wikipedia:关注度/提报/item|title=" + Morebits.pageNameNorm + "}}");
		pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};
	if (form.patrolPage) {
		params.patrol = form.patrolPage.checked;
	}

	switch (Twinkle.tag.mode) {
		case '條目':
		case '条目':
			params.tags = form.getChecked( 'articleTags' );
			params.group = form.group.checked;
			params.tagParameters = {
				notability: form["articleTags.notability"] ? form["articleTags.notability"].value : null
			};
			// common to {{merge}}, {{merge from}}, {{merge to}}
			params.mergeTarget = form["articleTags.mergeTarget"] ? form["articleTags.mergeTarget"].value : null;
			params.mergeReason = form["articleTags.mergeReason"] ? form["articleTags.mergeReason"].value : null;
			params.mergeTagOther = form["articleTags.mergeTagOther"] ? form["articleTags.mergeTagOther"].checked : false;
			// common to {{requested move}}
			params.moveTarget = form["articleTags.moveTarget"] ? form["articleTags.moveTarget"].value : null;
			params.moveReason = form["articleTags.moveReason"] ? form["articleTags.moveReason"].value : null;
			break;
		case '重定向':
			params.tags = form.getChecked( 'redirectTags' );
			break;
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	// form validation
	if( !params.tags.length ) {
		alert( wgULS('必须选择至少一个标记！', '必須選擇至少一個標記！') );
		return;
	}
	if( ((params.tags.indexOf("merge") !== -1) + (params.tags.indexOf("merge from") !== -1) +
		(params.tags.indexOf("merge to") !== -1)) > 1 ) {
		alert( wgULS('请在{{merge}}、{{merge from}}和{{merge to}}中选择一个。如果需要多次合并，请使用{{merge}}并用管道符分隔条目名（但在这种情形中Twinkle不能自动标记其他条目）。', '請在{{merge}}、{{merge from}}和{{merge to}}中選擇一個。如果需要多次合併，請使用{{merge}}並用管道符分隔條目名（但在這種情形中Twinkle不能自動標記其他條目）。') );
		return;
	}
	if( (params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1 ) {
		alert( wgULS('目前还不支持在一次合并中标记多个条目，与开启关于多个条目的讨论。请不要勾选“标记其他条目”和/或清理“理由”框，并重试。', '目前還不支援在一次合併中標記多個條目，與開啟關於多個條目的討論。請不要勾選「標記其他條目」和/或清理「理由」框，並重試。') );
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = wgULS("标记完成，在几秒内刷新页面", "標記完成，在幾秒內重新整理頁面");
	if (Twinkle.tag.mode === '重定向') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, wgULS("正在标记", "正在標記") + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case '條目':
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
})(jQuery);


//</nowiki>
