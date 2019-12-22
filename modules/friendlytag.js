// <nowiki>

(function($) {


/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles and drafts; file pages with a corresponding file
 *                         which is local (not on Commons); all redirects
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if (Morebits.wiki.isPageRedirect()) {
		Twinkle.tag.mode = '重定向';
		Twinkle.addPortletLink(Twinkle.tag.callback, wgULS('标记', '標記'), 'friendly-tag', wgULS('标记重定向', '標記重定向'));
	// file tagging
	} else if (mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById('mw-sharedupload') && document.getElementById('mw-imagepage-section-filehistory')) {
		Twinkle.tag.mode = wgULS('文件', '檔案');

		Twinkle.addPortletLink(Twinkle.tag.callback, wgULS('标记', '標記'), 'friendly-tag', wgULS('标记文件', '標記檔案'));
	// article/draft tagging
	} else if (([0, 118].indexOf(mw.config.get('wgNamespaceNumber')) !== -1 && mw.config.get('wgCurRevisionId')) || (Morebits.pageNameNorm === Twinkle.getPref('sandboxPage'))) {
		Twinkle.tag.mode = wgULS('条目', '條目');
		// Can't remove tags when not viewing current version
		Twinkle.tag.canRemove = (mw.config.get('wgCurRevisionId') === mw.config.get('wgRevisionId')) &&
			// Disabled on latest diff because the diff slider could be used to slide
			// away from the latest diff without causing the script to reload
			!mw.config.get('wgDiffNewId');
		Twinkle.addPortletLink(Twinkle.tag.callback, wgULS('标记', '標記'), 'friendly-tag', wgULS('标记条目', '標記條目'));
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.callback = function friendlytagCallback() {
	var Window = new Morebits.simpleWindow(630, Twinkle.tag.mode === '条目' || Twinkle.tag.mode === '條目' ? 500 : 400);
	Window.setScriptName('Twinkle');
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#tag');

	var form = new Morebits.quickForm(Twinkle.tag.callback.evaluate);

	if (document.getElementsByClassName('patrollink').length) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: wgULS('标记页面为已巡查', '標記頁面為已巡查'),
					value: 'patrolPage',
					name: 'patrolPage',
					checked: Twinkle.getPref('markTaggedPagesAsPatrolled')
				}
			]
		});
	}

	switch (Twinkle.tag.mode) {
		case '條目':
		case '条目':
			Window.setTitle(wgULS('条目维护标记', '條目維護標記'));

			form.append({
				type: 'select',
				name: 'sortorder',
				label: wgULS('查看列表：', '檢視列表：'),
				tooltip: wgULS('您可以在Twinkle参数设置（WP:TWPREFS）中更改此项。', '您可以在Twinkle偏好設定（WP:TWPREFS）中更改此項。'),
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: wgULS('按类别', '按類別'), selected: Twinkle.getPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			Twinkle.tag.quickFilter(form);

			if (!Twinkle.tag.canRemove) {
				var divElement = document.createElement('div');
				divElement.innerHTML = wgULS('要移除现有维护标记，请从当前条目版本中打开“标记”菜单', '要移除現有維護標記，請從目前條目版本中打開「標記」選單');
				form.append({
					type: 'div',
					name: 'untagnotice',
					label: divElement
				});
			}

			form.append({
				type: 'div',
				id: 'tagWorkArea',
				className: 'morebits-scrollbox',
				style: 'max-height: 22em'
			});

			form.append({
				type: 'checkbox',
				list: [
					{
						label: wgULS('如可能，合并入{{multiple issues}}', '如可能，合併入{{multiple issues}}'),
						value: 'group',
						name: 'group',
						tooltip: wgULS('如果添加{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并入{{multiple issues}}模板中。',
							'如果添加{{multiple issues}}支持的三個以上的模板，所有支持的模板都會被合並入{{multiple issues}}模板中。'),
						checked: Twinkle.getPref('groupByDefault')
					}
				]
			}
			);

			form.append({
				type: 'textarea',
				name: 'tagReason',
				label: wgULS('维护标记理由（编辑摘要）：', '維護標記理由（編輯摘要）：'),
				tooltip: wgULS('说明加入这些维护模板的原因，指出条目内容的哪些部分有问题，如果理由很长则应该发表在讨论页。',
					'說明加入這些維護模板的原因，指出條目內容的哪些部分有問題，如果理由很長則應該發表在討論頁。')
			});

			break;

		case '重定向':
			Window.setTitle(wgULS('重定向标记', '重定向標記'));

			Twinkle.tag.quickFilter(form);

			form.append({ type: 'header', label: '常用模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.frequentList });

			form.append({ type: 'header', label: '偶用模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.lessFrequentList });

			form.append({ type: 'header', label: wgULS('鲜用模板', '鮮用模板') });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.rareList });
			break;

		case '文件':
		case '檔案':
			Window.setTitle(wgULS('文件维护标记', '檔案維護標記'));

			Twinkle.tag.quickFilter(form);

			// TODO: perhaps add custom tags TO list of checkboxes

			form.append({ type: 'header', label: wgULS('版权和来源问题标签', '版權和來源問題標籤') });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.licenseList });

			form.append({ type: 'header', label: wgULS('维基共享资源相关标签', '維基共享資源相關標籤') });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.commonsList });

			form.append({ type: 'header', label: wgULS('清理标签', '清理標籤') });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.cleanupList });

			form.append({ type: 'header', label: wgULS('档案取代标签', '檔案取代標籤') });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.replacementList });
			break;

		default:
			alert('Twinkle.tag：未知模式 ' + Twinkle.tag.mode);
			break;
	}

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// for quick filter:
	$allCheckboxDivs = $(result).find('[name$=Tags]').parent();
	$allHeaders = $(result).find('h5');
	result.quickfilter.focus();  // place cursor in the quick filter field as soon as window is opened
	result.quickfilter.autocomplete = 'off'; // disable browser suggestions
	result.quickfilter.addEventListener('keypress', function(e) {
		if (e.keyCode === 13) { // prevent enter key from accidentally submitting the form
			e.preventDefault();
			return false;
		}
	});

	if (Twinkle.tag.mode === '条目' || Twinkle.tag.mode === '條目') {

		Twinkle.tag.alreadyPresentTags = [];

		if (Twinkle.tag.canRemove) {
			// Look for existing maintenance tags in the lead section and put them in array

			// All tags are HTML table elements that are direct children of .mw-parser-output,
			// except when they are within {{multiple issues}}
			$('.mw-parser-output').children().each(function parsehtml(i, e) {

				// break out on encountering the first heading, which means we are no
				// longer in the lead section
				if (e.tagName === 'H2') {
					return false;
				}

				// The ability to remove tags depends on the template's {{ambox}} |name=
				// parameter bearing the template's correct name (preferably) or a name that at
				// least redirects to the actual name

				// All tags have their first class name as "box-" + template name
				if (e.className.indexOf('box-') === 0) {
					if (e.classList[0] === 'box-问题条目') {
						$(e).find('.ambox').each(function(idx, e) {
							var tag = e.classList[0].slice(4).replace(/_/g, ' ');
							Twinkle.tag.alreadyPresentTags.push(tag);
						});
						return true; // continue
					}

					var tag = e.classList[0].slice(4).replace(/_/g, ' ');
					Twinkle.tag.alreadyPresentTags.push(tag);
				}
			});

			// {{Uncategorized}} and {{Improve categories}} are usually placed at the end
			if ($('.box-Uncategorized').length) {
				Twinkle.tag.alreadyPresentTags.push('Uncategorized');
			}
			if ($('.box-Improve_categories').length) {
				Twinkle.tag.alreadyPresentTags.push('Improve categories');
			}

		}

		// Add status text node after Submit button
		var statusNode = document.createElement('small');
		statusNode.id = 'tw-tag-status';
		Twinkle.tag.status = {
			// initial state; defined like this because these need to be available for reference
			// in the click event handler
			numAdded: 0,
			numRemoved: 0
		};
		$(Window.buttons[0]).after(statusNode);

		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.sortorder.dispatchEvent(evt);

	} else {
		// Redirects and files: Add a link to each template's description page
		Morebits.quickForm.getElements(result, Twinkle.tag.mode + 'Tags').forEach(generateLinks);
	}
};

// $allCheckboxDivs and $allHeaders are defined globally, rather than in
// the event function, to avoid having to recompute them on every keydown.
var $allCheckboxDivs, $allHeaders;

Twinkle.tag.quickFilter = function(form) {

	form.append({
		type: 'input',
		label: wgULS('快速筛选：', '快速篩選：'),
		name: 'quickfilter',
		size: '30px',
		event: function twinkletagquickfilter() {
			// flush the DOM of all existing underline spans
			$allCheckboxDivs.find('.search-hit').each(function(i, e) {
				var label_element = e.parentElement;
				// This would convert <label>Hello <span class=search-hit>wo</span>rld</label>
				// to <label>Hello world</label>
				label_element.innerHTML = label_element.textContent;
			});

			if (this.value) {
				$allCheckboxDivs.hide();
				$allHeaders.hide();
				var searchString = this.value;
				var searchRegex = new RegExp(mw.util.escapeRegExp(searchString), 'i');

				$allCheckboxDivs.find('label').each(function () {
					var label_text = this.textContent;
					var searchHit = searchRegex.exec(label_text);
					if (searchHit) {
						var range = document.createRange();
						var textnode = this.childNodes[0];
						range.selectNodeContents(textnode);
						range.setStart(textnode, searchHit.index);
						range.setEnd(textnode, searchHit.index + searchString.length);
						var underline_span = $('<span>').addClass('search-hit').css('text-decoration', 'underline')[0];
						range.surroundContents(underline_span);
						this.parentElement.style.display = 'block'; // show
					}
				});
			} else {
				$allCheckboxDivs.show();
				$allHeaders.show();
			}
		}
	});

};

Twinkle.tag.updateSortOrder = function(e) {
	var form = e.target.form;
	var sortorder = e.target.value;
	Twinkle.tag.checkedTags = form.getChecked('articleTags') || [];

	var container = new Morebits.quickForm.element({ type: 'fragment' });

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: '{{' + tag + '}}: ' + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}
		switch (tag) {
			case 'Expand language':
				checkbox.subgroup = {
					name: 'expandLanguage',
					type: 'input',
					label: wgULS('外语版本语言代码（必填）：', '外語版本語言代碼（必填）：')
				};
				break;
			case 'Expert':
				checkbox.subgroup = {
					name: 'expert',
					type: 'input',
					label: wgULS('哪个领域的专家：', '哪個領域的專家：'),
					tooltip: wgULS('可选，可参考 Category:需要专业人士关注的页面 使用现存的分类。', '選填，可參考 Category:需要专业人士关注的页面 使用現存的分類。')
				};
				break;
			case 'Merge':
			case 'Merge from':
			case 'Merge to':
				var otherTagName = 'Merge';
				switch (tag) {
					case 'Merge from':
						otherTagName = 'Merge to';
						break;
					case 'Merge to':
						otherTagName = 'Merge from';
						break;
					default:
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
							(tag === 'Merge to' ? '其他' : '这') + '条目的讨论页）：',
						'合併理由（會被貼上' +
							(tag === 'Merge to' ? '其他' : '這') + '條目的討論頁）：'),
						tooltip: wgULS('可选，但强烈推荐。如不需要请留空。仅在只输入了一个条目名时可用。', '可選，但強烈推薦。如不需要請留空。僅在只輸入了一個條目名時可用。')
					});
				}
				break;
			case 'Missing information':
				checkbox.subgroup = {
					name: 'missingInformation',
					type: 'input',
					label: wgULS('缺少的内容（必填）：', '缺少的內容（必填）：'),
					tooltip: wgULS('必填，显示为“缺少有关……的资讯。”', '必填，顯示為「缺少有關……的資訊。」。')
				};
				break;
			case 'Notability':
				checkbox.subgroup = {
					name: 'notability',
					type: 'select',
					list: [
						{ label: '{{notability}}：' + wgULS('通用的关注度指引', '通用的關注度指引'), value: 'none' },
						{ label: '{{notability|Biographies}}：' + wgULS('人物传记', '人物傳記'), value: 'Biographies' },
						{ label: '{{notability|Book}}：' + wgULS('书籍', '書籍'), value: 'Book' },
						{ label: '{{notability|Number}}：' + wgULS('数字', '數字'), value: 'Number' },
						{ label: '{{notability|Fiction}}：' + wgULS('虚构事物', '虛構事物'), value: 'Fiction' },
						{ label: '{{notability|Neologisms}}：' + wgULS('发明、研究', '發明、研究'), value: 'Neologisms' },
						{ label: '{{notability|Web}}：' + wgULS('网站、网络内容', '網站、網路內容'), value: 'Web'}
					]
				};
				break;
			case 'Requested move':
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
			default:
				break;
		}
		return checkbox;
	};

	var makeCheckboxesForAlreadyPresentTags = function() {
		container.append({ type: 'header', id: 'tagHeader0', label: wgULS('已放置的维护标记', '已放置的維護標記') });
		var subdiv = container.append({ type: 'div', id: 'tagSubdiv0' });
		var checkboxes = [];
		var unCheckedTags = e.target.form.getUnchecked('alreadyPresentArticleTags') || [];
		Twinkle.tag.alreadyPresentTags.forEach(function(tag) {
			var description = Twinkle.tag.article.tags[tag];
			var checkbox =
				{
					value: tag,
					label: '{{' + tag + '}}' + (description ? ': ' + description : ''),
					checked: unCheckedTags.indexOf(tag) === -1
					// , subgroup: { type: 'input', name: 'removeReason', label: 'Reason', tooltip: 'Enter reason for removing this tag' }
					// TODO: add option for providing reason for removal
				};

			checkboxes.push(checkbox);
		});
		subdiv.append({
			type: 'checkbox',
			name: 'alreadyPresentArticleTags',
			list: checkboxes
		});
	};

	// categorical sort order
	if (sortorder === 'cat') {
		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, array) {
			var checkboxes = [];
			$.each(array, function(k, tag) {
				var description = Twinkle.tag.article.tags[tag];
				if (Twinkle.tag.alreadyPresentTags.indexOf(tag) === -1) {
					checkboxes.push(makeCheckbox(tag, description));
				}
			});
			subdiv.append({
				type: 'checkbox',
				name: 'articleTags',
				list: checkboxes
			});
		};

		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
		}
		var i = 1;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.tag.article.tagCategories, function(title, content) {
			container.append({ type: 'header', id: 'tagHeader' + i, label: title });
			var subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: 'div', label: [ Morebits.htmlNode('b', subtitle) ] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});
	} else { // alphabetical sort order
		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
			container.append({ type: 'header', id: 'tagHeader1', label: wgULS('可用的维护标记', '可用的維護標記') });
		}
		var checkboxes = [];
		$.each(Twinkle.tag.article.tags, function(tag, description) {
			if (Twinkle.tag.alreadyPresentTags.indexOf(tag) === -1) {
				checkboxes.push(makeCheckbox(tag, description));
			}
		});
		container.append({
			type: 'checkbox',
			name: 'articleTags',
			list: checkboxes
		});
	}

	// append any custom tags
	if (Twinkle.getPref('customTagList').length) {
		container.append({ type: 'header', label: wgULS('自定义模板', '自訂模板') });
		var customcheckboxes = [];
		$.each(Twinkle.getPref('customTagList'), function(_, item) {
			customcheckboxes.push(makeCheckbox(item.value, item.label));
		});
		container.append({
			type: 'checkbox',
			name: 'articleTags',
			list: customcheckboxes
		});
	}

	var $workarea = $(form).find('#tagWorkArea');
	var rendered = container.render();
	$workarea.empty().append(rendered);

	// for quick filter:
	$allCheckboxDivs = $workarea.find('[name$=Tags]').parent();
	$allHeaders = $workarea.find('h5, .quickformDescription');
	form.quickfilter.value = ''; // clear search, because the search results are not preserved over mode change
	form.quickfilter.focus();

	// style adjustments
	$workarea.find('h5').css({ 'font-size': '110%' });
	$workarea.find('h5:not(:first-child)').css({ 'margin-top': '1em' });
	$workarea.find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });

	var alreadyPresentTags = Morebits.quickForm.getElements(form, 'alreadyPresentArticleTags');
	if (alreadyPresentTags) {
		alreadyPresentTags.forEach(generateLinks);
	}
	// in the unlikely case that *every* tag is already on the page
	var notPresentTags = Morebits.quickForm.getElements(form, 'articleTags');
	if (notPresentTags) {
		notPresentTags.forEach(generateLinks);
	}

	// tally tags added/removed, update statusNode text
	var statusNode = document.getElementById('tw-tag-status');
	$('[name=articleTags], [name=alreadyPresentArticleTags]').click(function() {
		if (this.name === 'articleTags') {
			Twinkle.tag.status.numAdded += this.checked ? 1 : -1;
		} else if (this.name === 'alreadyPresentArticleTags') {
			Twinkle.tag.status.numRemoved += this.checked ? -1 : 1;
		}

		var firstPart = '加入' + Twinkle.tag.status.numAdded + wgULS('个标记', '個標記');
		var secondPart = '移除' + Twinkle.tag.status.numRemoved + wgULS('个标记', '個標記');
		statusNode.textContent =
			(Twinkle.tag.status.numAdded ? '  ' + firstPart : '') +
			(Twinkle.tag.status.numRemoved ? (Twinkle.tag.status.numAdded ? '；' : '  ') + secondPart : '');
	});
};

/**
 * Adds a link to each template's description page
 * @param {Morebits.quickForm.element} checkbox  associated with the template
 */
var generateLinks = function(checkbox) {
	var link = Morebits.htmlNode('a', '>');
	link.setAttribute('class', 'tag-template-link');
	var tagname = checkbox.values;
	link.setAttribute('href', mw.util.getUrl(
		(tagname.indexOf(':') === -1 ? 'Template:' : '') +
		(tagname.indexOf('|') === -1 ? tagname : tagname.slice(0, tagname.indexOf('|')))
	));
	link.setAttribute('target', '_blank');
	$(checkbox).parent().append(['\u00A0', link]);
};


// Tags for ARTICLES start here

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = wgULS({
	'Advert': '类似广告或宣传性内容',
	'Autobiography': '类似一篇自传，或内容主要由条目描述的当事人或组织撰写、编辑',
	'Blpdispute': '可能违反了维基百科关于生者传记的方针',
	'Blpsources': '生者传记需要补充更多可供查证的来源',
	'Blpunsourced': '生者传记没有列出任何参考或来源',
	'Citation style': '引用需要进行清理',
	'Citecheck': '可能包含不适用或被曲解的引用资料，部分内容的准确性无法被证实',
	'Cleanup': '可能需要进行清理，以符合维基百科的质量标准',
	'Cleanup-jargon': '包含过多行话或专业术语，可能需要简化或提出进一步解释',
	'Coi': '主要贡献者与本条目所宣扬的内容可能存在利益冲突',
	'Contradict': '内容自相矛盾',
	'Copyedit': '需要编修，以确保文法、用词、语气、格式、标点等使用恰当',
	'Copypaste': '内容可能是从某个来源处拷贝后贴上',
	'Current': '记述新闻动态',
	'Dead end': '需要加上内部链接以构筑百科全书的链接网络',
	'Disputed': '内容疑欠准确，有待查证',
	'Expand language': '可以根据其他语言版本扩充',
	'Expert': '需要精通或熟悉本主题的专业人士参与及协助编辑',
	'External links': '使用外部链接的方式可能不符合维基百科的方针或指引',
	'Fansite': '类似爱好者网页',
	'Globalize': '仅具有一部分地区的信息或观点',
	'Hoax': '真实性被质疑',
	'Howto': '包含指南或教学内容',
	'Improve categories': '需要更多页面分类',
	'In-universe': '使用小说故事内的观点描述一个虚构事物',
	'Inappropriate person': '使用不适当的第一人称和第二人称',
	'Inappropriate tone': '语调或风格可能不适合百科全书的写作方式',
	'Lead section': '导言部分也许不足以概括其内容',
	'Lead section too long': '导言部分也许过于冗长',
	'Merge': '建议此页面与页面合并',
	'Merge from': '建议将页面并入本页面',
	'Merge to': '建议将此页面并入页面',
	'Missing information': '缺少必要的信息',
	'Newsrelease': '阅读起来像是新闻稿及包含过度的宣传性语调',
	'No footnotes': '因为没有内文引用而来源仍然不明',
	'Non-free': '可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件',
	'Notability': '可能不符合通用关注度指引',
	'Notability Unreferenced': '可能具备关注度，但需要来源加以彰显',
	'Notmandarin': '包含过多不是现代标准汉语的内容',
	'Onesource': '极大或完全地依赖于某个单一的来源',
	'Original research': '可能包含原创研究或未查证内容',
	'Orphan': '没有或只有很少链入页面',
	'Overlinked': '含有过多、重复、或不必要的内部链接',
	'Overly detailed': '包含太多过度细节内容',
	'Plot': '可能包含过于详细的剧情摘要',
	'Pov': '中立性有争议。内容、语调可能带有明显的个人观点或地方色彩',
	'Primarysources': '依赖第一手来源',
	'Prose': '使用了日期或时间列表式记述，需要改写为连贯的叙述性文字',
	'Refimprove': '需要补充更多来源',
	'Requested move': '建议将此页面移动到新名称',
	'Review': '阅读起来类似评论，需要清理',
	'Rewrite': '不符合维基百科的质量标准，需要完全重写',
	'Roughtranslation': '翻译品质不佳',
	'Substub': '过于短小',
	'Trivia': '应避免有陈列杂项、琐碎资料的部分',
	'Uncategorized': '缺少页面分类',
	'Underlinked': '需要更多内部链接以构筑百科全书的链接网络',
	'Unencyclopedic': '可能不适合写入百科全书',
	'Unreferenced': '没有列出任何参考或来源',
	'Update': '当前条目或章节需要更新',
	'Verylong': '可能过于冗长',
	'Weasel': '语意模棱两可而损及其中立性或准确性'
}, {
	'Advert': '類似廣告或宣傳性內容',
	'Autobiography': '類似一篇自傳，或內容主要由條目描述的當事人或組織撰寫、編輯',
	'Blpdispute': '可能違反了維基百科關於生者傳記的方針',
	'Blpsources': '生者傳記需要補充更多可供查證的來源',
	'Blpunsourced': '生者傳記沒有列出任何參考或來源',
	'Citation style': '引用需要進行清理',
	'Citecheck': '可能包含不適用或被曲解的引用資料，部分內容的準確性無法被證實',
	'Cleanup': '可能需要進行清理，以符合維基百科的質量標準',
	'Cleanup-jargon': '包含過多行話或專業術語，可能需要簡化或提出進一步解釋',
	'Coi': '主要貢獻者與本條目所宣揚的內容可能存在利益衝突',
	'Contradict': '內容自相矛盾',
	'Copyedit': '需要編修，以確保文法、用詞、語氣、格式、標點等使用恰當',
	'Copypaste': '內容可能是從某個來源處拷貝後貼上',
	'Current': '記述新聞動態',
	'Dead end': '需要加上內部連結以構築百科全書的連結網絡',
	'Disputed': '內容疑欠準確，有待查證',
	'Expand language': '可以根據其他語言版本擴充',
	'Expert': '需要精通或熟悉本主題的專業人士參與及協助編輯',
	'External links': '使用外部連結的方式可能不符合維基百科的方針或指引',
	'Fansite': '類似愛好者網頁',
	'Globalize': '僅具有一部分地區的資訊或觀點',
	'Hoax': '真實性被質疑',
	'Howto': '包含指南或教學內容',
	'Improve categories': '需要更多頁面分類',
	'In-universe': '使用小說故事內的觀點描述一個虛構事物',
	'Inappropriate person': '使用不適當的第一人稱和第二人稱',
	'Inappropriate tone': '語調或風格可能不適合百科全書的寫作方式',
	'Lead section': '導言部分也許不足以概括其內容',
	'Lead section too long': '導言部分也許過於冗長',
	'Merge': '建議此頁面與頁面合併',
	'Merge from': '建議將頁面併入本頁面',
	'Merge to': '建議將此頁面併入頁面',
	'Missing information': '缺少必要的信息',
	'Newsrelease': '閱讀起來像是新聞稿及包含過度的宣傳性語調',
	'No footnotes': '因為沒有內文引用而來源仍然不明',
	'Non-free': '可能過多或不當地使用了受版權保護的文字、圖像或/及多媒體檔案',
	'Notability': '可能不符合通用關注度指引',
	'Notability Unreferenced': '可能具備關注度，但需要來源加以彰顯',
	'Notmandarin': '包含過多不是現代標準漢語的內容',
	'Onesource': '極大或完全地依賴於某個單一的來源',
	'Original research': '可能包含原創研究或未查證內容',
	'Orphan': '沒有或只有很少連入頁面',
	'Overlinked': '含有過多、重複、或不必要的內部連結',
	'Overly detailed': '包含太多過度細節內容',
	'Plot': '可能包含過於詳細的劇情摘要',
	'Pov': '中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩',
	'Primarysources': '依賴第一手來源',
	'Prose': '使用了日期或時間列表式記述，需要改寫為連貫的敘述性文字',
	'Refimprove': '需要補充更多來源',
	'Requested move': '建議將此頁面移動到新名稱',
	'Review': '閱讀起來類似評論，需要清理',
	'Rewrite': '不符合維基百科的質量標準，需要完全重寫',
	'Roughtranslation': '翻譯品質不佳',
	'Substub': '過於短小',
	'Trivia': '應避免有陳列雜項、瑣碎資料的部分',
	'Uncategorized': '缺少頁面分類',
	'Underlinked': '需要更多內部連結以構築百科全書的連結網絡',
	'Unencyclopedic': '可能不適合寫入百科全書',
	'Unreferenced': '沒有列出任何參考或來源',
	'Update': '當前條目或章節需要更新',
	'Verylong': '可能過於冗長',
	'Weasel': '語意模棱兩可而損及其中立性或準確性'
});

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = wgULS({
	'清理和维护模板': {
		'常规清理': [
			'Cleanup',
			'Cleanup-jargon',
			'Copyedit'
		],
		'可能多余的内容': [
			'Copypaste',
			'External links',
			'Non-free'
		],
		'结构和导言': [
			'Lead section',
			'Lead section too long',
			'Verylong'
		],
		'虚构作品相关清理': [
			'In-universe',
			'Plot'
		]
	},
	'常规条目问题': {
		'重要性和知名度': [
			'Notability',  // has subcategories and special-cased code
			'Notability Unreferenced'
		],
		'写作风格': [
			'Advert',
			'Fansite',
			'Howto',
			'Inappropriate person',
			'Inappropriate tone',
			'Newsrelease',
			'Prose',
			'Review'
		],
		'内容': [
			'Missing information', // has subcategories and special-cased code
			'Expand language', // has subcategories and special-cased code
			'Substub',
			'Unencyclopedic'
		],
		'信息和细节': [
			'Expert',
			'Overly detailed',
			'Trivia'
		],
		'时间性': [
			'Current',
			'Update'
		],
		'中立、偏见和事实准确性': [
			'Autobiography',
			'Coi',
			'Contradict',
			'Disputed',
			'Globalize',
			'Hoax',
			'Pov',
			'Weasel'
		],
		'可供查证和来源': [
			'Blpdispute',
			'Blpsources',
			'Blpunsourced',
			'Citecheck',
			'No footnotes',
			'Onesource',
			'Original research',
			'Primarysources',
			'Refimprove',
			'Unreferenced'
		]
	},
	'具体内容问题': {
		'语言': [
			'Notmandarin',
			'Roughtranslation'
		],
		'链接': [
			'Dead end',
			'Underlinked',
			'Orphan',
			'Overlinked'
		],
		'参考技术': [
			'Citation style'
		],
		'分类': [
			'Improve categories',
			'Uncategorized'
		]
	},
	'合并': [  // these three have a subgroup with several options
		'Merge',
		'Merge from',
		'Merge to'
	],
	'移动': [  // this one have a subgroup with several options
		'Requested move'
	]
}, {
	'清理和維護模板': {
		'常規清理': [
			'Cleanup',
			'Cleanup-jargon',
			'Copyedit'
		],
		'可能多餘的內容': [
			'Copypaste',
			'External links',
			'Non-free'
		],
		'結構和導言': [
			'Lead section',
			'Lead section too long',
			'Verylong'
		],
		'虛構作品相關清理': [
			'In-universe',
			'Plot'
		]
	},
	'常規條目問題': {
		'重要性和知名度': [
			'Notability',  // has subcategories and special-cased code
			'Notability Unreferenced'
		],
		'寫作風格': [
			'Advert',
			'Fansite',
			'Howto',
			'Inappropriate person',
			'Inappropriate tone',
			'Newsrelease',
			'Prose',
			'Review'
		],
		'內容': [
			'Missing information', // has subcategories and special-cased code
			'Expand language', // has subcategories and special-cased code
			'Substub',
			'Unencyclopedic'
		],
		'資訊和細節': [
			'Expert',
			'Overly detailed',
			'Trivia'
		],
		'時間性': [
			'Current',
			'Update'
		],
		'中立、偏見和事實準確性': [
			'Autobiography',
			'Coi',
			'Contradict',
			'Disputed',
			'Globalize',
			'Hoax',
			'Pov',
			'Weasel'
		],
		'可供查證和來源': [
			'Blpdispute',
			'Blpsources',
			'Blpunsourced',
			'Citecheck',
			'No footnotes',
			'Onesource',
			'Original research',
			'Primarysources',
			'Refimprove',
			'Unreferenced'
		]
	},
	'具體內容問題': {
		'語言': [
			'Notmandarin',
			'Roughtranslation'
		],
		'連結': [
			'Dead end',
			'Underlinked',
			'Orphan',
			'Overlinked'
		],
		'參考技術': [
			'Citation style'
		],
		'分類': [
			'Improve categories',
			'Uncategorized'
		]
	},
	'合併': [  // these three have a subgroup with several options
		'Merge',
		'Merge from',
		'Merge to'
	],
	'移動': [  // this one have a subgroup with several options
		'Requested move'
	]
});

// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.tag.multipleIssuesExceptions = [
	'Current', // Works but not intended for use in MI
	'Improve categories',
	'Merge from',
	'Merge to',
	'Merge',
	'Notability',
	'Notmandarin',
	'Requested move',
	'Substub',
	'Uncategorized'
];

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
		value: '條目請求重定向',
		subgroup: [
			{
				name: 'reqArticleLang',
				type: 'input',
				label: wgULS('外语语言代码：', '外語語言代碼：'),
				tooltip: wgULS('使用ISO 639代码', '使用ISO 639代碼')
			},
			{
				name: 'reqArticleTitle',
				type: 'input',
				label: wgULS('外语页面名称：', '外語頁面名稱：'),
				size: 60
			}
		]
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

// maintenance tags for FILES start here

Twinkle.tag.file = {};

Twinkle.tag.file.licenseList = wgULS([
	{ label: '{{Non-free reduce}}：非低分辨率的合理使用图像（或过长的音频剪辑等）', value: 'Non-free reduce' }
], [
	{ label: '{{Non-free reduce}}：非低解析度的合理使用圖像（或過長的音頻剪輯等）', value: 'Non-free reduce' }
]);

Twinkle.tag.file.commonsList = wgULS([
	{ label: '{{Copy to Commons}}：自由版权文件应该被移动至维基共享资源', value: 'Copy to Commons' },
	{ label: '{{Do not move to Commons}}：不要移动至维基共享资源', value: 'Do not move to Commons_reason' },
	{ label: '{{Keep local}}：请求在本地保留维基共享资源的文件副本', value: 'Keep local' },
	{ label: '{{Now Commons}}：文件已被复制到维基共享资源（CSD F7）', value: 'subst:ncd' }
], [
	{ label: '{{Copy to Commons}}：自由版權檔案應該被移動至維基共享資源', value: 'Copy to Commons' },
	{ label: '{{Do not move to Commons}}：不要移動至維基共享資源', value: 'Do not move to Commons_reason' },
	{ label: '{{Keep local}}：請求在本地保留維基共享資源的檔案副本', value: 'Keep local' },
	{ label: '{{Now Commons}}：檔案已被複製到維基共享資源（CSD F7）', value: 'subst:ncd' }
]);

Twinkle.tag.file.cleanupList = wgULS([
	{ label: '{{Imagewatermark}}：图像包含了水印', value: 'Imagewatermark' },
	{ label: '{{Rename media}}：文件应该根据文件名称指引被重命名', value: 'Rename media' },
	{ label: '{{Should be SVG}}：PNG、GIF、JPEG文件应该重制成矢量图形', value: 'Should be SVG' }
], [
	{ label: '{{Imagewatermark}}：圖像包含了浮水印', value: 'Imagewatermark' },
	{ label: '{{Rename media}}：檔案應該根據檔案名稱指引被重新命名', value: 'Rename media' },
	{ label: '{{Should be SVG}}：PNG、GIF、JPEG檔案應該重製成向量圖形', value: 'Should be SVG' }
]);

Twinkle.tag.file.replacementList = wgULS([
	{ label: '{{Obsolete}}：有新版本可用的过时文件', value: 'Obsolete' },
	{ label: '{{Vector version available}}：有矢量图形可用的非矢量图形文件', value: 'Vector version available' }
], [
	{ label: '{{Obsolete}}：有新版本可用的過時檔案', value: 'Obsolete' },
	{ label: '{{Vector version available}}：有向量圖形可用的非向量圖形檔案', value: 'Vector version available' }
]);


Twinkle.tag.callbacks = {
	main: function(pageobj) {

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
		var summaryText;
		var params = pageobj.getCallbackParameters();

		/**
		 * Saves the page following the removal of tags if any. The last step.
		 * Called from removeTags()
		 */
		var postRemoval = function() {

			if (params.tagsToRemove.length) {
				// Finish summary text
				summaryText += wgULS('标记', '標記');

				// Remove empty {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|\s*\}\}\n?/im, '');
				// Remove single-element {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(?:multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|\s*(\{\{[^}]+\}\})\s*\}\}/im, '$1');
			}

			var tagReason = params.tagReason || '';
			tagReason = tagReason.trim();
			if (tagReason !== '') {
				if (tagReason.search(/[.?!;，。？！；]$/) === -1) {
					tagReason += '。';
				}
				summaryText = tagReason + summaryText;
			}

			// avoid truncated summaries
			if (summaryText.length > (254 - Twinkle.getPref('summaryAd').length)) {
				summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
			}

			pageobj.setPageText(pageText);
			pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
			pageobj.setTags(Twinkle.getPref('revisionTags'));
			pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
			pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
			pageobj.setCreateOption('nocreate');
			pageobj.save(function() {
				// special functions for merge tags
				if (params.mergeReason) {
					// post the rationale on the talk page (only operates in main namespace)
					var talkpageText = '\n\n== 请求与[[' + params.nonDiscussArticle + ']]合并 ==\n\n';
					talkpageText += params.mergeReason.trim() + '--~~~~';

					var talkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, wgULS('将理由贴进讨论页', '將理由貼進討論頁'));
					talkpage.setAppendText(talkpageText);
					talkpage.setEditSummary(wgULS('请求将[[' + params.nonDiscussArticle + ']]' +
						'与' + '[[' + params.discussArticle + ']]合并', '請求將[[' + params.nonDiscussArticle + ']]' +
						'與' + '[[' + params.discussArticle + ']]合併') +
						Twinkle.getPref('summaryAd'));
					talkpage.setTags(Twinkle.getPref('revisionTags'));
					talkpage.setWatchlist(Twinkle.getPref('watchMergeDiscussions'));
					talkpage.setCreateOption('recreate');
					talkpage.append();
				}
				if (params.mergeTagOther) {
					// tag the target page if requested
					var otherTagName = 'Merge';
					if (tags.indexOf('Merge from') !== -1) {
						otherTagName = 'Merge to';
					} else if (tags.indexOf('Merge to') !== -1) {
						otherTagName = 'Merge from';
					}
					var newParams = {
						tags: [otherTagName],
						tagsToRemove: [],
						tagsToRemain: [],
						mergeTarget: Morebits.pageNameNorm,
						discussArticle: params.discussArticle,
						talkDiscussionTitle: params.talkDiscussionTitle
					};
					var otherpage = new Morebits.wiki.page(params.mergeTarget, wgULS('标记其他页面（', '標記其他頁面（') +
						params.mergeTarget + '）');
					otherpage.setCallbackParameters(newParams);
					otherpage.load(Twinkle.tag.callbacks.main);
				}
				// special functions for requested move tags
				if (params.moveReason) {
					// post the rationale on the talk page (only operates in main namespace)
					var moveTalkpageText = '\n\n{{subst:RM|' + params.moveReason.trim(); // eslint-disable-line no-redeclare
					if (params.moveTarget) {
						moveTalkpageText += '|' + params.moveTarget;
					}
					moveTalkpageText += '}}';

					var moveTalkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, wgULS('将理由贴进讨论页', '將理由貼進討論頁')); // eslint-disable-line no-redeclare
					moveTalkpage.setAppendText(moveTalkpageText);
					moveTalkpage.setEditSummary(wgULS('请求移动' + (params.moveTarget ? '至[[' + params.moveTarget + ']]' : ''), '請求移動' + (params.moveTarget ? '至[[' + params.moveTarget + ']]' : '')) +
						Twinkle.getPref('summaryAd'));
					moveTalkpage.setTags(Twinkle.getPref('revisionTags'));
					moveTalkpage.setCreateOption('recreate');
					moveTalkpage.append();
				}
			});

			if (params.patrol) {
				pageobj.patrol();
			}
		};

		/**
		 * Removes the existing tags that were deselected (if any)
		 * Calls postRemoval() when done
		 */
		var removeTags = function removeTags() {

			if (params.tagsToRemove.length === 0) {
				// finish summary text from adding of tags, in this case where there are
				// no tags to be removed
				summaryText += wgULS('标记到条目', '標記到條目');

				postRemoval();
				return;
			}

			Morebits.status.info(wgULS('信息', '資訊'), wgULS('移除取消选择的已存在标记', '移除取消選擇的已存在標記'));

			if (params.tags.length > 0) {
				summaryText += (tags.length ? wgULS('标记', '標記') : '') + '並移除';
			} else {
				summaryText = wgULS('已從条目移除', '已從條目移除');
			}

			var getRedirectsFor = [];

			// Remove the tags from the page text, if found in its proper name,
			// otherwise moves it to `getRedirectsFor` array earmarking it for
			// later removal
			params.tagsToRemove.forEach(function removeTag(tag, tagIndex) {
				var tag_re = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?');

				if (tag_re.test(pageText)) {
					pageText = pageText.replace(tag_re, '');
				} else {
					getRedirectsFor.push('Template:' + tag);
				}

				// Producing summary text for current tag removal
				if (tagIndex > 0) {
					if (tagIndex === (params.tagsToRemove.length - 1)) {
						summaryText += '和';
					} else if (tagIndex < (params.tagsToRemove.length - 1)) {
						summaryText += '、';
					}
				}
				summaryText += '{{[[Template:' + tag + '|' + tag + ']]}}';
			});

			if (!getRedirectsFor.length) {
				postRemoval();
				return;
			}

			// Remove tags which appear in page text as redirects
			var api = new Morebits.wiki.api(wgULS('获取模板重定向', '取得模板重定向'), {
				'action': 'query',
				'prop': 'linkshere',
				'titles': getRedirectsFor.join('|'),
				'redirects': 1,  // follow redirect if the class name turns out to be a redirect page
				'lhnamespace': '10',  // template namespace only
				'lhshow': 'redirect',
				'lhlimit': 'max'
			}, function removeRedirectTag(apiobj) {

				$(apiobj.responseXML).find('page').each(function(idx, page) {
					var removed = false;
					$(page).find('lh').each(function(idx, el) {
						var tag = $(el).attr('title').slice(9);
						var tag_re = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?');
						if (tag_re.test(pageText)) {
							pageText = pageText.replace(tag_re, '');
							removed = true;
							return false;   // break out of $.each
						}
					});
					if (!removed) {
						Morebits.status.warn(wgULS('信息', '資訊'), wgULS('無法在页面上找到{{' + $(page).attr('title').slice(9) +
							'}}…跳过', '無法在頁面上找到{{' + $(page).attr('title').slice(9) +
							'}}…跳過'));
					}

				});

				postRemoval();

			});
			api.post();

		};

		if (!params.tags.length) {
			removeTags();
			return;
		}

		// Executes first: addition of selected tags
		summaryText = wgULS('添加', '加入');
		var tagRe, tagText = '', tags = [], groupableTags = [], groupableExistingTags = [], totalTags;

		/**
		 * Updates `tagText` with the syntax of `tagName` template with its parameters
		 * @param {number} tagIndex
		 * @param {string} tagName
		 */
		var addTag = function articleAddTag(tagIndex, tagName) {
			var currentTag = '';
			if (tagName === 'Uncategorized' || tagName === 'Improve categories') {
				pageText += '\n\n{{' + tagName + '|time={{subst:#time:c}}}}';
			} else {
				currentTag += '{{' + tagName;
				// fill in other parameters, based on the tag
				switch (tagName) {
					case 'Expand language':
						if (params.tagParameters.expandLanguage) {
							currentTag += '|1=' + params.tagParameters.expandLanguage;
						} else {
							Morebits.status.warn(wgULS('信息', '資訊'), wgULS('{{Expand language}}已略过，因为你没有输入必填的参数。', '{{Expand language}}已略過，因為你沒有輸入必填的參數。'));
							return;
						}
						break;
					case 'Expert':
						if (params.tagParameters.expert) {
							currentTag += '|subject=' + params.tagParameters.expert;
						}
						break;
					case 'Merge':
					case 'Merge to':
					case 'Merge from':
						if (params.mergeTarget) {
							// normalize the merge target for now and later
							params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));

							currentTag += '|' + params.mergeTarget;

							// link to the correct section on the talk page, for article space only
							if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
								if (!params.discussArticle) {
									// discussArticle is the article whose talk page will contain the discussion
									params.discussArticle = tagName === 'Merge to' ? params.mergeTarget : mw.config.get('wgTitle');
									// nonDiscussArticle is the article which won't have the discussion
									params.nonDiscussArticle = tagName === 'Merge to' ? mw.config.get('wgTitle') : params.mergeTarget;
									params.talkDiscussionTitle = wgULS('请求与' + params.nonDiscussArticle + '合并', '請求與' + params.nonDiscussArticle + '合併');
								}
								currentTag += '|discuss=Talk:' + params.discussArticle + '#' + params.talkDiscussionTitle;
							}
						}
						break;
					case 'Missing information':
						if (params.tagParameters.missingInformation) {
							currentTag += '|1=' + params.tagParameters.missingInformation;
						} else {
							Morebits.status.warn(wgULS('信息', '資訊'), wgULS('{{Missing information}}已略过，因为你没有输入必填的参数。', '{{Missing information}}已略過，因為你沒有輸入必填的參數。'));
							return;
						}
						break;
					case 'Requested move':
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

				currentTag += '|time={{subst:#time:c}}}}\n';
				tagText += currentTag;
			}

			if (tagIndex > 0) {
				if (tagIndex === (totalTags - 1)) {
					summaryText += '和';
				} else if (tagIndex < (totalTags - 1)) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[';
			// if it is a custom tag with a parameter
			if (tagName.indexOf('|') !== -1) {
				tagName = tagName.slice(0, tagName.indexOf('|'));
			}
			summaryText += tagName.indexOf(':') !== -1 ? tagName : 'Template:' + tagName + '|' + tagName;
			summaryText += ']]}}';

		};

		/**
		 * Adds the tags which go outside {{multiple issues}}, either because
		 * these tags aren't supported in {{multiple issues}} or because
		 * {{multiple issues}} is not being added to the page at all
		 */
		var addUngroupedTags = function() {
			totalTags = tags.length;
			$.each(tags, addTag);

			// Smartly insert the new tags after any hatnotes or
			// afd, csd, or prod templates or hatnotes. Regex is
			// extra complicated to allow for templates with
			// parameters and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				'$1' + tagText);

			removeTags();
		};

		// Separate tags into groupable ones (`groupableTags`) and non-groupable ones (`tags`)
		params.tags.forEach(function(tag) {
			tagRe = new RegExp('\\{\\{' + tag + '(\\||\\}\\})', 'im');
			// regex check for preexistence of tag can be skipped if in canRemove mode
			if (Twinkle.tag.canRemove || !tagRe.exec(pageText)) {
				// condition Twinkle.tag.article.tags[tag] to ensure that its not a custom tag
				// Custom tags are assumed non-groupable, since we don't know whether MI template supports them
				if (tag === 'Notability') {
					var wikipedia_page = new Morebits.wiki.page('Wikipedia:关注度/提报', wgULS('添加关注度记录项', '加入關注度記錄項'));
					wikipedia_page.setFollowRedirect(true);
					wikipedia_page.setCallbackParameters(params);
					wikipedia_page.load(Twinkle.tag.callbacks.notabilityList);
				}
				if (Twinkle.tag.article.tags[tag] && Twinkle.tag.multipleIssuesExceptions.indexOf(tag) === -1) {
					groupableTags.push(tag);
				} else {
					tags.push(tag);
				}
			} else {
				if (tag === 'Merge from') {
					tags.push(tag);
				} else {
					Morebits.status.warn(wgULS('信息', '資訊'), wgULS('在页面上找到{{' + tag +
						'}}…跳过', '在頁面上找到{{' + tag +
						'}}…跳過'));
					// don't do anything else with merge tags
					if (['Merge', 'Merge to'].indexOf(tag) !== -1) {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = null;
					}
				}
			}
		});

		// To-be-retained existing tags that are groupable
		params.tagsToRemain.forEach(function(tag) {
			if (Twinkle.tag.multipleIssuesExceptions.indexOf(tag) === -1) {
				groupableExistingTags.push(tag);
			}
		});

		var miTest = /\{\{(multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|[^}]+\{/im.exec(pageText);

		if (miTest && groupableTags.length > 0) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS('添加支持的标记入已存在的{{multiple issues}}', '添加支持的標記入已存在的{{multiple issues}}'));

			tagText = '';

			totalTags = groupableTags.length;
			$.each(groupableTags, addTag);

			summaryText += wgULS('标记', '標記') + '（在{{[[T:multiple issues|multiple issues]]}}' + wgULS('内', '內') + '）';
			if (tags.length > 0) {
				summaryText += '及';
			}

			var miRegex = new RegExp('(\\{\\{\\s*' + miTest[1] + '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*', 'im');
			pageText = pageText.replace(miRegex, '$1' + tagText + '}}\n');
			tagText = '';

			addUngroupedTags();

		} else if (params.group && !miTest && (groupableExistingTags.length + groupableTags.length) >= 2) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS('添加支持的标记入已存在的{{multiple issues}}', '添加支持的標記入已存在的{{multiple issues}}'));

			tagText += '{{Multiple issues|\n';

			/**
			 * Adds newly added tags to MI
			 */
			var addNewTagsToMI = function() {
				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);
				if (groupableTags.length) {
					summaryText += wgULS('等标记', '等標記') + '（{{[[T:multiple issues|multiple issues]]}}）';
				} else {
					summaryText += ' {{[[Template:multiple issues|multiple issues]]}}';
				}
				if (tags.length > 0) {
					summaryText += '及';
				}
				tagText += '}}\n';

				addUngroupedTags();
			};


			var getRedirectsFor = [];

			// Reposition the tags on the page into {{multiple issues}}, if found with its
			// proper name, else moves it to `getRedirectsFor` array to be handled later
			groupableExistingTags.forEach(function repositionTagIntoMI(tag) {
				var tag_re = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?)');
				if (tag_re.test(pageText)) {
					tagText += tag_re.exec(pageText)[1];
					pageText = pageText.replace(tag_re, '');
				} else {
					getRedirectsFor.push('Template:' + tag);
				}
			});

			if (!getRedirectsFor.length) {
				addNewTagsToMI();
				return;
			}

			var api = new Morebits.wiki.api(wgULS('获取模板重定向', '取得模板重定向'), {
				'action': 'query',
				'prop': 'linkshere',
				'titles': getRedirectsFor.join('|'),
				'redirects': 1,
				'lhnamespace': '10', // template namespace only
				'lhshow': 'redirect',
				'lhlimit': 'max'
			}, function replaceRedirectTag(apiobj) {
				$(apiobj.responseXML).find('page').each(function(idx, page) {
					var found = false;
					$(page).find('lh').each(function(idx, el) {
						var tag = $(el).attr('title').slice(9);
						var tag_re = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?)');
						if (tag_re.test(pageText)) {
							tagText += tag_re.exec(pageText)[1];
							pageText = pageText.replace(tag_re, '');
							found = true;
							return false;   // break out of $.each
						}
					});
					if (!found) {
						Morebits.status.warn(wgULS('信息', '資訊'), wgULS('無法在页面上找到{{' + $(page).attr('title').slice(9) +
							'}}…跳过', '無法在頁面上找到{{' + $(page).attr('title').slice(9) +
							'}}…跳過'));
					}
				});
				addNewTagsToMI();
			});
			api.post();

		} else {
			tags = tags.concat(groupableTags);
			addUngroupedTags();
		}

	},

	notabilityList: function(pageobj) {
		// var text = pageobj.getPageText();
		// var params = pageobj.getCallbackParameters();

		pageobj.setAppendText('\n{{subst:Wikipedia:关注度/提报/item|title=' + Morebits.pageNameNorm + '}}');
		pageobj.setEditSummary('添加[[' + Morebits.pageNameNorm + ']]' + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	},

	redirect: function redirect(pageobj) {
		var params = pageobj.getCallbackParameters(),
			pageText = pageobj.getPageText(),
			tagRe, tagText = '', summaryText = wgULS('添加', '加入'),
			tags = [], i;

		for (i = 0; i < params.tags.length; i++) {
			tagRe = new RegExp('(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im');
			if (!tagRe.exec(pageText)) {
				tags.push(params.tags[i]);
			} else {
				Morebits.status.warn(wgULS('信息', '資訊'), wgULS('在重定向上找到{{' + params.tags[i] +
					'}}…跳过', '在重定向上找到{{' + params.tags[i] +
					'}}…跳過'));
			}
		}

		var addTag = function redirectAddTag(tagIndex, tagName) {
			tagText += '\n{{' + tagName;
			if (tagName === 'R from alternative language') {
				if (params.altLangFrom) {
					tagText += '|from=' + params.altLangFrom;
				}
				if (params.altLangTo) {
					tagText += '|to=' + params.altLangTo;
				}
			}
			tagText += '}}';

			if (tagIndex > 0) {
				if (tagIndex === (tags.length - 1)) {
					summaryText += '和';
				} else if (tagIndex < (tags.length - 1)) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[:' + (tagName.indexOf(':') !== -1 ? tagName : 'Template:' + tagName + '|' + tagName) + ']]}}';
		};

		tags.sort();
		$.each(tags, addTag);

		// Check for all Rcat shell redirects (from #433)
		if (pageText.match(/{{(?:redr|this is a redirect|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
			// Regex inspired by [[User:Kephir/gadgets/sagittarius.js]] ([[Special:PermaLink/831402893]])
			var oldTags = pageText.match(/(\s*{{[A-Za-z ]+\|)((?:[^|{}]*|{{[^}]*}})+)(}})\s*/i);
			pageText = pageText.replace(oldTags[0], oldTags[1] + tagText + oldTags[2] + oldTags[3]);
		} else {
			// Fold any pre-existing Rcats into taglist and under Rcatshell
			var pageTags = pageText.match(/\n{{R(?:edirect)? .*?}}/img);
			var oldPageTags = '';
			if (pageTags) {
				pageTags.forEach(function(pageTag) {
					var pageRe = new RegExp(pageTag, 'img');
					pageText = pageText.replace(pageRe, '');
					oldPageTags += pageTag;
				});
			}
			pageText += '\n{{Redirect category shell|' + tagText + oldPageTags + '\n}}';
		}

		summaryText += (tags.length > 0 ? wgULS('标记', '標記') : '') + '到重定向';

		// avoid truncated summaries
		if (summaryText.length > (254 - Twinkle.getPref('summaryAd').length)) {
			summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if (params.patrol) {
			pageobj.patrol();
		}

	},

	file: function friendlytagCallbacksFile(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var summary = wgULS('添加', '加入');



		// Add maintenance tags
		if (params.tags.length) {

			var tagtext = '', currentTag;
			$.each(params.tags, function(k, tag) {
				// when other commons-related tags are placed, remove "move to Commons" tag
				if (['Keep local', 'subst:ncd', 'Do not move to Commons_reason', 'Do not move to Commons',
					'Now Commons'].indexOf(tag) !== -1) {
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
				}
				if (tag === 'Vector version available') {
					text = text.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
				}

				currentTag = '{{' + (tag === 'Do not move to Commons_reason' ? 'Do not move to Commons' : tag);

				var input;
				switch (tag) {
					case 'subst:ncd':
						/* falls through */
					case 'Keep local':
						input = prompt('{{' + (tag === 'subst:ncd' ? 'Now Commons' : tag) +
							'}} ─ ' + wgULS('输入在共享资源的图像名称（如果不同于本地名称），不包括 File: 前缀。要跳过标记，请单击取消：', '輸入在共享資源的圖像名稱（如果不同於本地名稱），不包括 File: 字首。要跳過標記，請點擊取消：'), '');
						if (input === null) {
							return true;  // continue
						} else if (input !== '') {
							currentTag += '|1=' + input;
						}
						if (tag === 'Keep local') {
							input = prompt('{{Keep local}} ─ ' + wgULS('输入请求在本地保留文件副本的原因（可选）：', '輸入請求在本地保留檔案副本的原因（可選）：'), '');
							if (input !== null && input !== '') {
								currentTag += '|reason=' + input;
							}
						}
						break;
					case 'Rename media':
						input = prompt('{{Rename media}} ─ ' + wgULS('输入图像的新名称（可选）：', '輸入圖像的新名稱（可選）：'), '');
						if (input === null) {
							return true;  // continue
						} else if (input !== '') {
							currentTag += '|1=' + input;
						}
						input = prompt('{{Rename media}} ─ ' + wgULS('输入重命名的原因（可选）：', '輸入重命名的原因（可選）：'), '');
						if (input === null) {
							return true;  // continue
						} else if (input !== '') {
							currentTag += '|2=' + input;
						}
						break;
					case 'Vector version available':
						/* falls through */
					case 'Obsolete':
						input = prompt('{{' + tag + '}} ─ ' + wgULS('输入替换此文件的文件名称（必填）。 要跳过标记，请单击取消：', '輸入替換此檔案的檔案名稱（必填）。 要跳過標記，請點擊取消：'), '');
						if (input === null) {
							return true;  // continue
						} else if (input !== '') {
							currentTag += '|1=' + input;
						}
						break;
					case 'Do not move to Commons_reason':
						input = prompt('{{Do not move to Commons}} ─ ' + wgULS('输入不应该将该图像移动到维基共享资源的原因（必填）。 要跳过标记，请单击取消：', '輸入不應該將該圖像移動到維基共享資源的原因（必填）。 要跳過標記，請點擊取消：'), '');
						if (input === null) {
							return true;  // continue
						} else if (input !== '') {
							currentTag += '|reason=' + input;
						}
						break;
					case 'Copy to Commons':
						currentTag += '|human=' + mw.config.get('wgUserName');
						break;
					default:
						break;  // don't care
				}

				currentTag += '}}\n';

				tagtext += currentTag;
				summary += '{{' + tag + '}}, ';

				return true;  // continue
			});

			if (!tagtext) {
				pageobj.getStatusElement().warn(wgULS('用户取消操作，没什么要做的', '使用者取消操作，沒什麼要做的'));
				return;
			}

			text = tagtext + text;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary.substring(0, summary.length - 2) + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if (params.patrol) {
			pageobj.patrol();
		}
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};
	if (form.patrolPage) {
		params.patrol = form.patrolPage.checked;
	}

	// Save values of input fields into params object. This works as quickform input
	// fields within subgroups of elements with name 'articleTags' (say) have their
	// name attribute as 'articleTags.' + name of the subgroup element

	var name_prefix = Twinkle.tag.mode + 'Tags.';
	$(form).find("[name^='" + name_prefix + "']:not(div)").each(function(idx, el) {
		// el are the HTMLInputElements, el.name gives the name attribute
		params[el.name.slice(name_prefix.length)] =
			el.type === 'checkbox' ? form[el.name].checked : form[el.name].value;
	});

	switch (Twinkle.tag.mode) {
		case '條目':
		case '条目':
			// Don't return null if there aren't any available tags
			params.tags = form.getChecked('articleTags') || [];
			params.tagsToRemove = form.getUnchecked('alreadyPresentArticleTags') || [];
			params.tagsToRemain = form.getChecked('alreadyPresentArticleTags') || [];

			params.group = form.group.checked;
			params.tagReason = form.tagReason.value;
			params.tagParameters = {
				expandLanguage: form['articleTags.expandLanguage'] ? form['articleTags.expandLanguage'].value : null,
				expert: form['articleTags.expert'] ? form['articleTags.expert'].value : null,
				missingInformation: form['articleTags.missingInformation'] ? form['articleTags.missingInformation'].value : null,
				notability: form['articleTags.notability'] ? form['articleTags.notability'].value : null
			};
			// common to {{merge}}, {{merge from}}, {{merge to}}
			params.mergeTarget = form['articleTags.mergeTarget'] ? form['articleTags.mergeTarget'].value : null;
			params.mergeReason = form['articleTags.mergeReason'] ? form['articleTags.mergeReason'].value : null;
			params.mergeTagOther = form['articleTags.mergeTagOther'] ? form['articleTags.mergeTagOther'].checked : false;
			// common to {{requested move}}
			params.moveTarget = form['articleTags.moveTarget'] ? form['articleTags.moveTarget'].value : null;
			params.moveReason = form['articleTags.moveReason'] ? form['articleTags.moveReason'].value : null;
			break;
		case '重定向':
			params.tagParameters = {
				reqArticleLang: form['redirectTags.reqArticleLang'] ? form['redirectTags.reqArticleLang'].value : null,
				reqArticleTitle: form['redirectTags.reqArticleTitle'] ? form['redirectTags.reqArticleTitle'].value : null
			};
			// Don't return null if there aren't any available tags
			params.tags = form.getChecked('redirectTags') || [];
			break;
		case '文件':
		case '檔案':
			params.svgSubcategory = form['imageTags.svgCategory'] ? form['imageTags.svgCategory'].value : null;
			// Don't return null if there aren't any available tags
			params.tags = form.getChecked('imageTags') || [];
			break;
		default:
			alert('Twinkle.tag：未知模式 ' + Twinkle.tag.mode);
			break;
	}

	// form validation
	if (params.tags.length === 0 && (['條目', '条目'].indexOf(Twinkle.tag.mode) === -1 || params.tagsToRemove.length === 0)) {
		alert(wgULS('必须选择至少一个标记！', '必須選擇至少一個標記！'));
		return;
	}
	if (((params.tags.indexOf('Merge') !== -1) + (params.tags.indexOf('Merge from') !== -1) +
		(params.tags.indexOf('Merge to') !== -1)) > 1) {
		alert(wgULS('请在{{Merge}}、{{Merge from}}和{{Merge to}}中选择一个。如果需要多次合并，请使用{{Merge}}并用管道符分隔条目名（但在这种情形中Twinkle不能自动标记其他条目）。', '請在{{Merge}}、{{Merge from}}和{{Merge to}}中選擇一個。如果需要多次合併，請使用{{Merge}}並用管道符分隔條目名（但在這種情形中Twinkle不能自動標記其他條目）。'));
		return;
	}
	if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1) {
		alert(wgULS('目前还不支持在一次合并中标记多个条目，与开启关于多个条目的讨论。请不要勾选“标记其他条目”和/或清理“理由”框，并重试。', '目前還不支援在一次合併中標記多個條目，與開啟關於多個條目的討論。請不要勾選「標記其他條目」和/或清理「理由」框，並重試。'));
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(form);

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = wgULS('标记完成，在几秒内刷新页面', '標記完成，在幾秒內重新整理頁面');
	if (Twinkle.tag.mode === '重定向') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, wgULS('正在标记', '正在標記') + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case '條目':
		case '条目':
			wikipedia_page.load(Twinkle.tag.callbacks.main);
			return;
		case '重定向':
			wikipedia_page.load(Twinkle.tag.callbacks.redirect);
			return;
		case '文件':
		case '檔案':
			wikipedia_page.load(Twinkle.tag.callbacks.file);
			return;
		default:
			alert('Twinkle.tag：未知模式 ' + Twinkle.tag.mode);
			break;
	}
};
})(jQuery);


// </nowiki>
