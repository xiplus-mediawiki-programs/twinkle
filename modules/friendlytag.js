/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles; file pages with a corresponding file
 *                         which is local (not on Commons); existing user subpages
 *                         and existing subpages of Wikipedia:Articles for creation;
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
	else if( mw.config.get('wgNamespaceNumber') === 0 && mw.config.get('wgCurRevisionId') ) {
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
							label: '如可能，合并到{{multiple issues}}',
							value: 'group',
							name: 'group',
							tooltip: '如果添加{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并至一个{{multiple issues}}模板中。',
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

		/*case 'file':
			Window.setTitle( "文件维护标记" );

			// TODO: perhaps add custom tags TO list of checkboxes

			form.append({ type: 'header', label: '版权和来源问题模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.licenseList } );

			form.append({ type: 'header', label: '清理模板' } );
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.cleanupList } );

			form.append({ type: 'header', label: '图片质量模板' } );
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.qualityList } );

			form.append({ type: 'header', label: '维基媒体相关模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.commonsList } );

			form.append({ type: 'header', label: '替换模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.replacementList } );
			break;*/

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
	"advert": "此条目或章节类似广告",
	"BLPsources": "当前传记条目需要补充更多来源",
	"BLP unsourced": "此生者传记条目没有列出任何参考或来源",
	"catimprove": "此条目需要更多页面分类",
	"citation style": "这篇条目的参考文献需要进行清理",
	"cleanup": "此条目可能需要进行清理，以符合维基百科的质量标准",
	"COI": "这个条目的一位主要贡献者似乎与本条目的主题存在利益冲突",
	"copyedit": "此条目或章节需要编修，以确保语法、用语、语气、风格、表达恰当",
	"disputed": "此条目的准确性有争议",
	"expand": "此条目或章节需要扩充",
	"expert-subject": "本条目或段落需要专家的关注",
	"external links": "维基百科不是连结集",
	"fansite": "此条目或章节类似爱好者站点",
	"globalize": "此条目仅具有一部分地区的观点或资讯，无法完整表达普世通用，并包含广泛区域的观点",
	"hoax": "此条目的真实性被质疑",
	"in-universe": "本条目或章节使用小说故事内的观点描述一个虚构事物",
	"inuse": "本条目正在进行重大修改",
	"lead section": "此文的导言部分也许不足以概括其内容",
	"merge": "建议此页面与页面合并",
	"merge from": "建议将页面合并到本页面",
	"merge to": "建议将此页面合并至页面",
	"nofootnotes": "此条目列出了一些参考来源或外部链接，但由于缺少内文脚注，条目中部分信息的来源仍然不明确",
	"non-free": "此条目或章节可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件",
	"notability": "此条目可能不符合通用关注度指引",
	"notmandarin": "此条目包含过多不是现代标准汉语的内容",
	"original research": "此条目或章节可能包含原创研究或未查证内容",
	"orphan": "这个条目没有或只有很少链入页面",
	"overlinked": "此条目可能含有太多的内部链接",
	"POV": "此条目的中立性有争议。内容、语调可能带有明显的个人观点或地方色彩",
	"prose": "此条目使用了列表式记述，可能需要改写为连贯的叙述性文字",
	"refimprove": "此条目需要补充更多来源",
	"roughtranslation": "此条目翻译粗劣",
	"substub": "请您改写这篇过于短小的文章",
	"tone": "此条目或章节的语调或风格可能不适合百科全书的写作方式",
	"toolong": "此条目或章节可能过于冗长",
	"uncategorized": "此条目缺少页面分类",
	"unreferenced": "此条目没有列出任何参考或来源",
	"update": "当前条目或章节需要更新",
	"weasel": "此条目或章节可能因为语意模棱两可而损及其中立性",
	"wikify": "此条目或章节需要被修正为维基格式以符合质量标准"
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = {
	"清理和维护模板": {
		"常规清理": [
			"cleanup",
			"copyedit",
			"wikify"
		],
		"可能多余的内容": [
			"external links",
			"non-free"
		],
		"结构和导言": [
			"lead section",
			"toolong"
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
			"prose",
			"tone"
		],
		"内容": [
			"expand",
			"substub"
		],
		"信息和细节": [
			"expert-subject",
		],
		"时间性": [
			"update"
		],
		"中立、偏见和事实准确性": [
			"COI",
			"disputed",
			"hoax",
			"globalize",
			"POV",
			"weasel"
		],
		"可供查证和来源": [
			"BLPsources",
			"BLP unsourced",
			"nofootnotes",
			"original research",
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
			"orphan",
			"overlinked",
			"wikify"  // this tag is listed twice because it used to focus mainly on links, but now it's a more general cleanup tag
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
	],
	"信息": [
		"inuse"
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

// maintenance tags for FILES start here
/* TODO(jimmyxu)

Twinkle.tag.file = {};

Twinkle.tag.file.licenseList = [
	{ label: '{{Bsr}}: source info consists of bare image URL/generic base URL only', value: 'Bsr' },
	{ label: '{{Non-free reduce}}: non-low-resolution fair use image (or too-long audio clip, etc)', value: 'Non-free reduce' },
	{ label: '{{Non-free reduced}}: fair use media which has been reduced (old versions need to be deleted)', value: 'Non-free reduced' }
];

Twinkle.tag.file.cleanupList = [
	{ label: '{{Artifacts}}: PNG contains residual compression artifacts', value: 'Artifacts' },
	{ label: '{{Bad font}}: SVG uses fonts not available on the thumbnail server', value: 'Bad font' },
	{ label: '{{Bad format}}: PDF/DOC/... file should be converted to a more useful format', value: 'Bad format' },
	{ label: '{{Bad GIF}}: GIF that should be PNG, JPEG, or SVG', value: 'Bad GIF' },
	{ label: '{{Bad JPEG}}: JPEG that should be PNG or SVG', value: 'Bad JPEG' },
	{ label: '{{Bad trace}}: auto-traced SVG requiring cleanup', value: 'Bad trace' },
	{ label: '{{Cleanup image}}: general cleanup', value: 'Cleanup image' },
	{ label: '{{Cleanup SVG}}: SVG needing code and/or appearance cleanup', value: 'Cleanup SVG' },
	{ label: '{{ClearType}}: image (not screenshot) with ClearType anti-aliasing', value: 'ClearType' },
	{ label: '{{Imagewatermark}}: image contains visible or invisible watermarking', value: 'Imagewatermark' },
	{ label: '{{NoCoins}}: image using coins to indicate scale', value: 'NoCoins' },
	{ label: '{{Overcompressed JPEG}}: JPEG with high levels of artifacts', value: 'Overcompressed JPEG' },
	{ label: '{{Opaque}}: opaque background should be transparent', value: 'Opaque' },
	{ label: '{{Remove border}}: unneeded border, white space, etc.', value: 'Remove border' },
	{ label: '{{Rename media}}: file should be renamed according to the criteria at [[WP:FMV]]', value: 'Rename media' },
	{ label: '{{Should be PNG}}: GIF or JPEG should be lossless', value: 'Should be PNG' },
	{
		label: '{{Should be SVG}}: PNG, GIF or JPEG should be vector graphics', value: 'Should be SVG',
		subgroup: {
			name: 'svgCategory',
			type: 'select',
			list: [
				{ label: '{{Should be SVG|other}}', value: 'other' },
				{ label: '{{Should be SVG|alphabet}}: character images, font examples, etc.', value: 'alphabet' },
				{ label: '{{Should be SVG|chemical}}: chemical diagrams, etc.', value: 'chemical' },
				{ label: '{{Should be SVG|circuit}}: electronic circuit diagrams, etc.', value: 'circuit' },
				{ label: '{{Should be SVG|coat of arms}}: coats of arms', value: 'coat of arms' },
				{ label: '{{Should be SVG|diagram}}: diagrams that do not fit any other subcategory', value: 'diagram' },
				{ label: '{{Should be SVG|emblem}}: emblems, free/libre logos, insignias, etc.', value: 'emblem' },
				{ label: '{{Should be SVG|fair use}}: fair-use images, fair-use logos', value: 'fair use' },
				{ label: '{{Should be SVG|flag}}: flags', value: 'flag' },
				{ label: '{{Should be SVG|graph}}: visual plots of data', value: 'graph' },
				{ label: '{{Should be SVG|logo}}: logos', value: 'logo' },
				{ label: '{{Should be SVG|map}}: maps', value: 'map' },
				{ label: '{{Should be SVG|music}}: musical scales, notes, etc.', value: 'music' },
				{ label: '{{Should be SVG|physical}}: "realistic" images of physical objects, people, etc.', value: 'physical' },
				{ label: '{{Should be SVG|symbol}}: miscellaneous symbols, icons, etc.', value: 'symbol' }
			]
		}
	},
	{ label: '{{Should be text}}: image should be represented as text, tables, or math markup', value: 'Should be text' },
	{ label: '{{Split media}}: there are two different images in the upload log which need to be split', value: 'Split media' }
];

Twinkle.tag.file.qualityList = [
	{ label: '{{Image-blownout}}', value: 'Image-blownout' },
	{ label: '{{Image-out-of-focus}}', value: 'Image-out-of-focus' },
	{ label: '{{Image-Poor-Quality}}', value: 'Image-Poor-Quality' },
	{ label: '{{Image-underexposure}}', value: 'Image-underexposure' },
	{ label: '{{Low quality chem}}: disputed chemical structures', value: 'Low quality chem' }
];

Twinkle.tag.file.commonsList = [
	{ label: '{{Copy to Commons}}: free media that should be copied to Commons', value: 'Copy to Commons' },
	{ label: '{{Do not move to Commons}} (PD issue): file is PD in the US but not in country of origin', value: 'Do not move to Commons' },
	{ label: '{{Do not move to Commons}} (other reason)', value: 'Do not move to Commons_reason' },
	{ label: '{{Keep local}}: request to keep local copy of a Commons file', value: 'Keep local' },
	{ label: '{{Now Commons}}: file has been copied to Commons', value: 'subst:ncd' }
];

Twinkle.tag.file.replacementList = [
	{ label: '{{Duplicate}}: exact duplicate of another file, but not yet orphaned', value: 'Duplicate' },
	{ label: '{{Obsolete}}: improved version available', value: 'Obsolete' },
	{ label: '{{PNG version available}}', value: 'PNG version available' },
	{ label: '{{SVG version available}}', value: 'SVG version available' }
];

*/

// Contains those article tags that can be grouped into {{multiple issues}}.
// This list includes synonyms.
Twinkle.tag.groupHash = [
	'advert',
	'attention',
	'autobiography',
	'biased',
	'blpdispute',
	'citations missing',
	'citation style',
	'citecheck',
	'cleanup',
	'COI',
	'coi',
	'colloquial',
	'confusing',
	'context',
	'contradict',
	'copyedit',
	'criticisms',
	'crystal',
	'deadend',
	'disputed',
	'do-attempt',
	'essay',
	'examplefarm',
	'expand',
	'expert',
	'external links',
	'fancruft',
	'fansite',
	'fiction',
	'gameguide',
	'globalize',
	'histinfo',
	'hoax',
	'howto',
	'inappropriate person',
	'in-universe',
	'importance',
	'incomplete',
	'intro length',
	'intromissing',
	'introrewrite',
	'jargon',
	'laundrylists',
	'likeresume',
	'long',
	'newsrelease',
	'nofootnotes',
	'notability',
	'onesource',
	'OR',
	'orphan',
	'do-attempt',
	'out of date',
	'peacock',
	'plot',
	'POV',
	'primarysources',
	'prose',
	'proseline',
	'quotefarm',
	'recent',
	'refimprove',
	'refimproveBLP',
	'restructure',
	'review',
	'rewrite',
	'roughtranslation',
	'sections',
	'self-published',
	'story',
	'synthesis',
	'tone',
	'tooshort',
	'travelguide',
	'trivia',
	'unbalanced',
	'unencyclopedic',
	'unreferenced',
	'unreferencedBLP',
	'update',
	'weasel',
	'wikify'
];

Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = '添加',
		    tags = [], groupableTags = [],

		    // Remove tags that become superfluous with this action
		    pageText = pageobj.getPageText().replace(/\{\{\s*(New unreviewed article|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, ""),

		    i;

		if( Twinkle.tag.mode !== '重定向' ) {
			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( params.tags[i] == 'notability' ) {
						wikipedia_page = new Morebits.wiki.page("Wikipedia:关注度/提报", "添加关注度记录项");
						wikipedia_page.setFollowRedirect(true);
						wikipedia_page.setCallbackParameters(params);
						wikipedia_page.load(Twinkle.tag.callbacks.notabilityList);
					}
					if( Twinkle.tag.groupHash.indexOf(params.tags[i]) !== -1 ) {
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Morebits.status.info( '信息', '在条目上找到{{' + params.tags[i] +
						'}}…已排除' );
				}
			}

			if( params.group && groupableTags.length >= 3 ) {
				Morebits.status.info( '信息', '合并支持的模板到{{multiple issues}}' );

				groupableTags.sort();
				tagText += '{{multiple issues';
				summaryText += ' {{[[Template:multiple issues|multiple issues]]}}带有参数';
				for( i = 0; i < groupableTags.length; i++ ) {
					tagText += '|' + groupableTags[i] +
						'={{subst:#time:c}}';

					if( i === (groupableTags.length - 1) ) {
						summaryText += '和';
					} else if ( i < (groupableTags.length - 1) && i > 0 ) {
						summaryText += '、';
					}
					summaryText += groupableTags[i];
				}
				tagText += '}}\n';
			} else {
				tags = tags.concat( groupableTags );
			}
		} else {
			// Check for pre-existing tags
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					tags = tags.concat( params.tags[i] );
				} else {
					Morebits.status.info( '信息', '在重定向上找到{{' + params.tags[i] +
						'}}…已排除' );
				}
			}
		}

		tags.sort();
		for( i = 0; i < tags.length; i++ ) {
			var currentTag = "";
			if( tags[i] === 'uncategorized' || tags[i] === 'cat improve' ) {
				pageText += '\n\n{{' + tags[i] +
					'|time={{subst:#time:c}}}}';
			} else {
				currentTag += ( Twinkle.tag.mode === '重定向' ? '\n' : '' ) + '{{' + tags[i];

				// prompt for other parameters, based on the tag
				switch( tags[i] ) {
					case 'merge':
					case 'merge to':
					case 'merge from':
						var param = prompt('请输入合并相关的条目名。\n' +
							"要指定多个条目，请用管道符（|）分开。\n" +
							"这个信息是必须的。完成时请点击确定，或点击取消以略过此标记。", "");
						if (param === null) {
							continue;
						} else if (param !== "") {
							currentTag += '|' + param;
						}
						break;
					default:
						break;
				}

				currentTag += Twinkle.tag.mode === '重定向' ? '}}' : '|time={{subst:#time:c}}}}\n';
				tagText += currentTag;
			}

			if ( i > 0 || groupableTags.length > 3 ) {
				if( i === (tags.length - 1) ) {
					summaryText += '和';
				} else if ( i < (tags.length - 1) ) {
					summaryText += '、';
				}
			}

			summaryText += ' {{[[Template:';
			summaryText += tags[i] + '|' + tags[i];
			summaryText += ']]}}';
		}

		if( Twinkle.tag.mode === '重定向' ) {
			pageText += tagText;
		} else {
			// smartly insert the new tags after any hatnotes. Regex is a bit more
			// complicated than it'd need to be, to allow templates as parameters,
			// and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);
		}
		summaryText += '标记' +
			'到' + Twinkle.tag.mode + Twinkle.getPref('summaryAd');

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
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
