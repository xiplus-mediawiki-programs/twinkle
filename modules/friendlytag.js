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
	if (Morebits.isPageRedirect()) {
		Twinkle.tag.mode = wgULS('重定向', '重新導向');
		Twinkle.tag.modeEn = 'redirect';
		Twinkle.addPortletLink(Twinkle.tag.callback, wgULS('标记', '標記'), 'friendly-tag', wgULS('标记重定向', '標記重新導向'));
	// file tagging
	} else if (mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById('mw-sharedupload') && document.getElementById('mw-imagepage-section-filehistory')) {
		Twinkle.tag.mode = wgULS('文件', '檔案');
		Twinkle.tag.modeEn = 'file';
		Twinkle.addPortletLink(Twinkle.tag.callback, wgULS('标记', '標記'), 'friendly-tag', wgULS('标记文件', '標記檔案'));
	// article/draft tagging
	} else if (([0, 118].indexOf(mw.config.get('wgNamespaceNumber')) !== -1 && mw.config.get('wgCurRevisionId')) || (Morebits.pageNameNorm === Twinkle.getPref('sandboxPage'))) {
		Twinkle.tag.mode = wgULS('条目', '條目');
		Twinkle.tag.modeEn = 'article';
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
	var Window = new Morebits.simpleWindow(630, Twinkle.tag.modeEn === 'article' ? 500 : 400);
	Window.setScriptName('Twinkle');
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#tag');

	var form = new Morebits.quickForm(Twinkle.tag.callback.evaluate);

	form.append({
		type: 'input',
		label: wgULS('筛选标记列表：', '篩選標記列表：'),
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

	switch (Twinkle.tag.modeEn) {
		case 'article':
			Window.setTitle(wgULS('条目维护标记', '條目維護標記'));


			// Build sorting and lookup object flatObject, which is always
			// needed but also used to generate the alphabetical list
			// Would be infinitely better with Object.values, but, alas, IE 11
			Twinkle.tag.article.flatObject = {};
			Object.keys(Twinkle.tag.article.tagList).forEach(function(group) {
				Object.keys(Twinkle.tag.article.tagList[group]).forEach(function(subgroup) {
					if (Array.isArray(Twinkle.tag.article.tagList[group][subgroup])) {
						Twinkle.tag.article.tagList[group][subgroup].forEach(function(item) {
							Twinkle.tag.article.flatObject[item.tag] = { description: item.description, excludeMI: !!item.excludeMI };
						});
					} else {
						Twinkle.tag.article.flatObject[Twinkle.tag.article.tagList[group][subgroup].tag] = {description: Twinkle.tag.article.tagList[group][subgroup].description, excludeMI: !!Twinkle.tag.article.tagList[group][subgroup].excludeMI };
					}
				});
			});


			form.append({
				type: 'select',
				name: 'sortorder',
				label: wgULS('查看列表：', '檢視列表：'),
				tooltip: wgULS('您可以在Twinkle参数设置（WP:TWPREFS）中更改此项。', '您可以在Twinkle偏好設定（WP:TWPREFS）中更改此項。'),
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: wgULS('按类型', '按類別'), selected: Twinkle.getPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getPref('tagArticleSortOrder') === 'alpha' }
				]
			});


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
				style: 'max-height: 28em'
			});

			form.append({
				type: 'checkbox',
				list: [
					{
						label: wgULS('如可能，合并入{{multiple issues}}', '如可能，合併入{{multiple issues}}'),
						value: 'group',
						name: 'group',
						tooltip: wgULS('如果加入{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并入{{multiple issues}}模板中。',
							'如果加入{{multiple issues}}支援的三個以上的模板，所有支援的模板都會被合併入{{multiple issues}}模板中。'),
						checked: Twinkle.getPref('groupByDefault')
					}
				]
			});

			form.append({
				type: 'input',
				label: '理由：',
				name: 'reason',
				tooltip: wgULS('附加于编辑摘要的可选理由，例如指出条目内容的哪些部分有问题或移除模板的理由，但如果理由很长则应该发表在讨论页。',
					'附加於編輯摘要的可選理由，例如指出條目內容的哪些部分有問題或移除模板的理由，但如果理由很長則應該發表在討論頁。'),
				size: '80px'
			});

			break;

		case 'file':
			Window.setTitle(wgULS('文件维护标记', '檔案維護標記'));

			$.each(Twinkle.tag.fileList, function(groupName, group) {
				form.append({ type: 'header', label: groupName });
				form.append({ type: 'checkbox', name: 'tags', list: group });
			});

			if (Twinkle.getPref('customFileTagList').length) {
				form.append({ type: 'header', label: wgULS('自定义模板', '自訂模板') });
				form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customFileTagList') });
			}
			break;

		case 'redirect':
			Window.setTitle(wgULS('重定向标记', '重新導向標記'));

			var i = 1;
			$.each(Twinkle.tag.redirectList, function(groupName, group) {
				form.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
				form.append({
					type: 'checkbox',
					name: 'tags',
					list: group.map(function (item) {
						return { value: item.tag, label: '{{' + item.tag + '}}：' + item.description, subgroup: item.subgroup };
					})
				});
			});

			if (Twinkle.getPref('customRedirectTagList').length) {
				form.append({ type: 'header', label: wgULS('自定义模板', '自訂模板') });
				form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customRedirectTagList') });
			}
			break;

		default:
			alert('Twinkle.tag：未知模式 ' + Twinkle.tag.mode);
			break;
	}

	if (document.getElementsByClassName('patrollink').length) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: wgULS('标记页面为已巡查', '標記頁面為已巡查'),
					value: 'patrol',
					name: 'patrol',
					checked: Twinkle.getPref('markTaggedPagesAsPatrolled')
				}
			]
		});
	}
	form.append({ type: 'submit', className: 'tw-tag-submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// for quick filter:
	$allCheckboxDivs = $(result).find('[name$=tags]').parent();
	$allHeaders = $(result).find('h5');
	result.quickfilter.focus();  // place cursor in the quick filter field as soon as window is opened
	result.quickfilter.autocomplete = 'off'; // disable browser suggestions
	result.quickfilter.addEventListener('keypress', function(e) {
		if (e.keyCode === 13) { // prevent enter key from accidentally submitting the form
			e.preventDefault();
			return false;
		}
	});

	if (Twinkle.tag.modeEn === 'article') {

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
							if (e.classList[0].indexOf('box-') === 0) {
								var tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
								Twinkle.tag.alreadyPresentTags.push(tag);
							}
						});
						return true; // continue
					}

					var tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
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
		$('button.tw-tag-submit').after(statusNode);

		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.sortorder.dispatchEvent(evt);

	} else {
		// Redirects and files: Add a link to each template's description page
		Morebits.quickForm.getElements(result, 'tags').forEach(generateLinks);
	}
};


// $allCheckboxDivs and $allHeaders are defined globally, rather than in the
// quickfilter event function, to avoid having to recompute them on every keydown
var $allCheckboxDivs, $allHeaders;

Twinkle.tag.updateSortOrder = function(e) {
	var form = e.target.form;
	var sortorder = e.target.value;
	Twinkle.tag.checkedTags = form.getChecked('tags');

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
			case 'Expert needed':
				checkbox.subgroup = [
					{
						name: 'expert',
						type: 'input',
						label: wgULS('哪个领域的专家（必填）：', '哪個領域的專家（必填）：'),
						tooltip: wgULS('必填，可参考 Category:需要专业人士关注的页面 使用现存的分类。', '必填，可參考 Category:需要專業人士關注的頁面 使用現存的分類。')
					},
					{
						name: 'expert2',
						type: 'input',
						label: wgULS('哪个领域的专家：', '哪個領域的專家：'),
						tooltip: wgULS('可选，可参考 Category:需要专业人士关注的页面 使用现存的分类。', '可選，可參考 Category:需要專業人士關注的頁面 使用現存的分類。')
					},
					{
						name: 'expert3',
						type: 'input',
						label: wgULS('哪个领域的专家：', '哪個領域的專家：'),
						tooltip: wgULS('可选，可参考 Category:需要专业人士关注的页面 使用现存的分类。', '可選，可參考 Category:需要專業人士關注的頁面 使用現存的分類。')
					}
				];
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
					// no default
				}
				checkbox.subgroup = [
					{
						name: 'mergeTarget',
						type: 'input',
						label: wgULS('其他条目：', '其他條目：'),
						tooltip: wgULS('如指定多个条目，请用管道符分隔：条目甲|条目乙', '如指定多個條目，請用管道符分隔：條目甲|條目乙')
					},
					{
						type: 'checkbox',
						list: [
							{
								name: 'mergeTagOther',
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
					tooltip: wgULS('必填，显示为“缺少有关……的信息。”', '必填，顯示為「缺少有關……的資訊。」')
				};
				break;
			case 'Notability':
				checkbox.subgroup = {
					name: 'notability',
					type: 'select',
					list: [
						{ label: '{{Notability}}：' + wgULS('通用的关注度指引', '通用的關注度指引'), value: 'none' },
						{ label: '{{Notability|Astro}}：' + wgULS('天体', '天體'), value: 'Astro' },
						{ label: '{{Notability|Biographies}}：' + wgULS('人物传记', '人物傳記'), value: 'Biographies' },
						{ label: '{{Notability|Book}}：' + wgULS('书籍', '書籍'), value: 'Book' },
						{ label: '{{Notability|Companies}}：' + wgULS('组织与公司', '組織與公司'), value: 'Companies' },
						{ label: '{{Notability|Cyclone}}：' + wgULS('气旋', '氣旋'), value: 'Cyclone' },
						{ label: '{{Notability|Fiction}}：' + wgULS('虚构事物', '虛構事物'), value: 'Fiction' },
						{ label: '{{Notability|Geographic}}：' + wgULS('地理特征', '地理特徵'), value: 'Geographic' },
						{ label: '{{Notability|Geometry}}：' + wgULS('几何图形', '幾何圖形'), value: 'Geometry' },
						{ label: '{{Notability|Invention}}：' + wgULS('发明、研究', '發明、研究'), value: 'Invention' },
						{ label: '{{Notability|Music}}：' + wgULS('音乐', '音樂'), value: 'Music' },
						{ label: '{{Notability|Numbers}}：' + wgULS('数字', '數字'), value: 'Numbers' },
						{ label: '{{Notability|Property}}：' + wgULS('性质表', '性質表'), value: 'Property' },
						{ label: '{{Notability|Traffic}}：' + '交通', value: 'Traffic' },
						{ label: '{{Notability|Web}}：' + wgULS('网站、网络内容', '網站、網路內容') + '（非正式指引）', value: 'Web'}
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
						label: wgULS('移动理由（会被粘贴该条目的讨论页）：', '移動理由（會被貼上該條目的討論頁）：'),
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
		var unCheckedTags = e.target.form.getUnchecked('existingTags');
		Twinkle.tag.alreadyPresentTags.forEach(function(tag) {
			var checkbox =
				{
					value: tag,
					label: '{{' + tag + '}}' + (Twinkle.tag.article.flatObject[tag] ? ': ' + Twinkle.tag.article.flatObject[tag].description : ''),
					checked: unCheckedTags.indexOf(tag) === -1
				};

			checkboxes.push(checkbox);
		});
		subdiv.append({
			type: 'checkbox',
			name: 'existingTags',
			list: checkboxes
		});
	};


	if (sortorder === 'cat') { // categorical sort order
		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, subgroup) {
			var checkboxes = [];
			$.each(subgroup, function(k, item) {
				if (Twinkle.tag.alreadyPresentTags.indexOf(item.tag) === -1) {
					checkboxes.push(makeCheckbox(item.tag, item.description));
				}
			});
			subdiv.append({
				type: 'checkbox',
				name: 'tags',
				list: checkboxes
			});
		};

		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
		}
		var i = 1;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.tag.article.tagList, function(groupName, group) {
			container.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
			var subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
			if (Array.isArray(group)) {
				doCategoryCheckboxes(subdiv, group);
			} else {
				$.each(group, function(subgroupName, subgroup) {
					subdiv.append({ type: 'div', label: [ Morebits.htmlNode('b', subgroupName) ] });
					doCategoryCheckboxes(subdiv, subgroup);
				});
			}
		});
	} else { // alphabetical sort order
		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
			container.append({ type: 'header', id: 'tagHeader1', label: wgULS('可用的维护标记', '可用的維護標記') });
		}

		// Avoid repeatedly resorting
		Twinkle.tag.article.alphabeticalList = Twinkle.tag.article.alphabeticalList || Object.keys(Twinkle.tag.article.flatObject).sort();
		var checkboxes = [];
		Twinkle.tag.article.alphabeticalList.forEach(function(tag) {
			if (Twinkle.tag.alreadyPresentTags.indexOf(tag) === -1) {
				checkboxes.push(makeCheckbox(tag, Twinkle.tag.article.flatObject[tag].description));
			}
		});
		container.append({
			type: 'checkbox',
			name: 'tags',
			list: checkboxes
		});
	}

	// append any custom tags
	if (Twinkle.getPref('customTagList').length) {
		container.append({ type: 'header', label: wgULS('自定义模板', '自訂模板') });
		container.append({ type: 'checkbox', name: 'tags',
			list: Twinkle.getPref('customTagList').map(function(el) {
				el.checked = Twinkle.tag.checkedTags.indexOf(el.value) !== -1;
				return el;
			})
		});
	}

	var $workarea = $(form).find('#tagWorkArea');
	var rendered = container.render();
	$workarea.empty().append(rendered);

	// for quick filter:
	$allCheckboxDivs = $workarea.find('[name=tags], [name=existingTags]').parent();
	$allHeaders = $workarea.find('h5, .quickformDescription');
	form.quickfilter.value = ''; // clear search, because the search results are not preserved over mode change
	form.quickfilter.focus();

	// style adjustments
	$workarea.find('h5').css({ 'font-size': '110%' });
	$workarea.find('h5:not(:first-child)').css({ 'margin-top': '1em' });
	$workarea.find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });

	Morebits.quickForm.getElements(form, 'existingTags').forEach(generateLinks);
	Morebits.quickForm.getElements(form, 'tags').forEach(generateLinks);

	// tally tags added/removed, update statusNode text
	var statusNode = document.getElementById('tw-tag-status');
	$('[name=tags], [name=existingTags]').click(function() {
		if (this.name === 'tags') {
			Twinkle.tag.status.numAdded += this.checked ? 1 : -1;
		} else if (this.name === 'existingTags') {
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

// Tags arranged by category; will be used to generate the alphabetical list,
// but tags should be in alphabetical order within the categories
// excludeMI: true indicate a tag that *does not* work inside {{multiple issues}}
// Add new categories with discretion - the list is long enough as is!
/* eslint-disable quote-props */
Twinkle.tag.article.tagList = wgULS({
	'清理和维护模板': {
		'常规清理': [
			{ tag: 'Cleanup', description: '可能需要进行清理，以符合维基百科的质量标准' },
			{ tag: 'Cleanup rewrite', description: '不符合维基百科的质量标准，需要完全重写' },
			{ tag: 'Cleanup-jargon', description: '包含过多行话或专业术语，可能需要简化或提出进一步解释' },
			{ tag: 'Copy edit', description: '需要编修，以确保文法、用词、语气、格式、标点等使用恰当' }
		],
		'可能多余的内容': [
			{ tag: 'Copypaste', description: '内容可能是从某个来源处拷贝后贴上' },
			{ tag: 'External links', description: '使用外部链接的方式可能不符合维基百科的方针或指引' },
			{ tag: 'Non-free', description: '可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件' }
		],
		'结构和导言': [
			{ tag: 'Lead too long', description: '导言部分也许过于冗长' },
			{ tag: 'Lead too short', description: '导言部分也许不足以概括其内容' },
			{ tag: 'Very long', description: '可能过于冗长' }
		],
		'虚构作品相关清理': [
			{ tag: 'In-universe', description: '使用小说故事内的观点描述一个虚构事物' },
			{ tag: 'Long plot', description: '可能包含过于详细的剧情摘要' }
		]
	},
	'常规条目问题': {
		'重要性和知名度': [
			{ tag: 'Notability', description: '可能不符合通用关注度指引', excludeMI: true },  // has a subgroup with subcategories
			{ tag: 'Notability Unreferenced', description: '可能具备关注度，但需要来源加以彰显' }
		],
		'写作风格': [
			{ tag: 'Advert', description: '类似广告或宣传性内容' },
			{ tag: 'Fanpov', description: '类似爱好者网页' },
			{ tag: 'How-to', description: '包含指南或教学内容' },
			{ tag: 'Inappropriate person', description: '使用不适当的第一人称和第二人称' },
			{ tag: 'Newsrelease', description: '阅读起来像是新闻稿及包含过度的宣传性语调' },
			{ tag: 'Prose', description: '使用了日期或时间列表式记述，需要改写为连贯的叙述性文字' },
			{ tag: 'Review', description: '阅读起来类似评论，需要清理' },
			{ tag: 'Tone', description: '语调或风格可能不适合百科全书的写作方式' }
		],
		'内容': [
			{ tag: 'Expand language', description: '可以根据其他语言版本扩充' },  // these three have a subgroup with several options
			{ tag: 'Missing information', description: '缺少必要的信息' },  // these three have a subgroup with several options
			{ tag: 'Substub', description: '过于短小', excludeMI: true },
			{ tag: 'Unencyclopedic', description: '可能不适合写入百科全书' }
		],
		'信息和细节': [
			{ tag: 'Expert needed', description: '需要精通或熟悉本主题的专业人士（专家）参与及协助编辑' },
			{ tag: 'Overly detailed', description: '包含太多过度细节内容' },
			{ tag: 'Trivia', description: '应避免有陈列杂项、琐碎资料的部分' }
		],
		'时间性': [
			{ tag: 'Current', description: '记述新闻动态', excludeMI: true }, // Works but not intended for use in MI
			{ tag: 'Update', description: '当前条目或章节需要更新' }
		],
		'中立、偏见和事实准确性': [
			{ tag: 'Autobiography', description: '类似一篇自传，或内容主要由条目描述的当事人或组织撰写、编辑' },
			{ tag: 'COI', description: '主要贡献者与本条目所宣扬的内容可能存在利益冲突' },
			{ tag: 'Disputed', description: '内容疑欠准确，有待查证' },
			{ tag: 'Globalize', description: '仅具有一部分地区的信息或观点' },
			{ tag: 'Hoax', description: '真实性被质疑' },
			{ tag: 'POV', description: '中立性有争议。内容、语调可能带有明显的个人观点或地方色彩' },
			{ tag: 'Self-contradictory', description: '内容自相矛盾' },
			{ tag: 'Weasel', description: '语意模棱两可而损及其中立性或准确性' }
		],
		'可供查证和来源': [
			{ tag: 'BLPdispute', description: '可能违反了维基百科关于生者传记的方针' },
			{ tag: 'BLPsources', description: '生者传记需要补充更多可供查证的来源' },
			{ tag: 'BLP unsourced', description: '生者传记没有列出任何参考或来源' },
			{ tag: 'Citecheck', description: '可能包含不适用或被曲解的引用资料，部分内容的准确性无法被证实' },
			{ tag: 'More footnotes needed', description: '因为文内引用不足，部分字句的来源仍然不明' },
			{ tag: 'No footnotes', description: '因为没有内文引用而来源仍然不明' },
			{ tag: 'Onesource', description: '极大或完全地依赖于某个单一的来源' },
			{ tag: 'Original research', description: '可能包含原创研究或未查证内容' },
			{ tag: 'Primarysources', description: '依赖第一手来源' },
			{ tag: 'Refimprove', description: '需要补充更多来源' },
			{ tag: 'Unreferenced', description: '没有列出任何参考或来源' }
		]
	},
	'具体内容问题': {
		'语言': [
			{ tag: 'NotMandarin', description: '包含过多不是现代标准汉语的内容', excludeMI: true },
			{ tag: 'Rough translation', description: '翻译品质不佳' }
		],
		'链接': [
			{ tag: 'Dead end', description: '需要加上内部链接以构筑百科全书的链接网络' },
			{ tag: 'Orphan', description: '没有或只有很少链入页面' },
			{ tag: 'Overlinked', description: '含有过多、重复、或不必要的内部链接' },
			{ tag: 'Underlinked', description: '需要更多内部链接以构筑百科全书的链接网络' }
		],
		'参考技术': [
			{ tag: 'Citation style', description: '引用需要进行清理' }
		],
		'分类': [
			{ tag: 'Improve categories', description: '需要更多页面分类', excludeMI: true },
			{ tag: 'Uncategorized', description: '缺少页面分类', excludeMI: true }
		]
	},
	'合并': [
		{ tag: 'Merge', description: '建议此页面与页面合并', excludeMI: true },  // these three have a subgroup with several options
		{ tag: 'Merge from', description: '建议将页面并入本页面', excludeMI: true },
		{ tag: 'Merge to', description: '建议将此页面并入页面', excludeMI: true }
	],
	'移动': [
		{ tag: 'Requested move', description: '建议将此页面移动到新名称', excludeMI: true }  // these three have a subgroup with several options
	]
}, {
	'清理和維護模板': {
		'常規清理': [
			{ tag: 'Cleanup', description: '可能需要進行清理，以符合維基百科的質量標準' },
			{ tag: 'Cleanup rewrite', description: '不符合維基百科的質量標準，需要完全重寫' },
			{ tag: 'Cleanup-jargon', description: '包含過多行話或專業術語，可能需要簡化或提出進一步解釋' },
			{ tag: 'Copy edit', description: '需要編修，以確保文法、用詞、語氣、格式、標點等使用恰當' }
		],
		'可能多餘的內容': [
			{ tag: 'Copypaste', description: '內容可能是從某個來源處拷貝後貼上' },
			{ tag: 'External links', description: '使用外部連結的方式可能不符合維基百科的方針或指引' },
			{ tag: 'Non-free', description: '可能過多或不當地使用了受版權保護的文字、圖像或/及多媒體檔案' }
		],
		'結構和導言': [
			{ tag: 'Lead too long', description: '導言部分也許過於冗長' },
			{ tag: 'Lead too short', description: '導言部分也許不足以概括其內容' },
			{ tag: 'Very long', description: '可能過於冗長' }
		],
		'虛構作品相關清理': [
			{ tag: 'In-universe', description: '使用小說故事內的觀點描述一個虛構事物' },
			{ tag: 'Long plot', description: '可能包含過於詳細的劇情摘要' }
		]
	},
	'常規條目問題': {
		'重要性和知名度': [
			{ tag: 'Notability', description: '可能不符合通用關注度指引', excludeMI: true },  // has a subgroup with subcategories
			{ tag: 'Notability Unreferenced', description: '可能具備關注度，但需要來源加以彰顯' }
		],
		'寫作風格': [
			{ tag: 'Advert', description: '類似廣告或宣傳性內容' },
			{ tag: 'Fanpov', description: '類似愛好者網頁' },
			{ tag: 'How-to', description: '包含指南或教學內容' },
			{ tag: 'Inappropriate person', description: '使用不適當的第一人稱和第二人稱' },
			{ tag: 'Newsrelease', description: '閱讀起來像是新聞稿及包含過度的宣傳性語調' },
			{ tag: 'Prose', description: '使用了日期或時間列表式記述，需要改寫為連貫的敘述性文字' },
			{ tag: 'Review', description: '閱讀起來類似評論，需要清理' },
			{ tag: 'Tone', description: '語調或風格可能不適合百科全書的寫作方式' }
		],
		'內容': [
			{ tag: 'Expand language', description: '可以根據其他語言版本擴充' },  // these three have a subgroup with several options
			{ tag: 'Missing information', description: '缺少必要的信息' },  // these three have a subgroup with several options
			{ tag: 'Substub', description: '過於短小', excludeMI: true },
			{ tag: 'Unencyclopedic', description: '可能不適合寫入百科全書' }
		],
		'資訊和細節': [
			{ tag: 'Expert needed', description: '需要精通或熟悉本主題的專業人士（專家）參與及協助編輯' },
			{ tag: 'Overly detailed', description: '包含太多過度細節內容' },
			{ tag: 'Trivia', description: '應避免有陳列雜項、瑣碎資料的部分' }
		],
		'時間性': [
			{ tag: 'Current', description: '記述新聞動態', excludeMI: true }, // Works but not intended for use in MI
			{ tag: 'Update', description: '當前條目或章節需要更新' }
		],
		'中立、偏見和事實準確性': [
			{ tag: 'Autobiography', description: '類似一篇自傳，或內容主要由條目描述的當事人或組織撰寫、編輯' },
			{ tag: 'COI', description: '主要貢獻者與本條目所宣揚的內容可能存在利益衝突' },
			{ tag: 'Disputed', description: '內容疑欠準確，有待查證' },
			{ tag: 'Globalize', description: '僅具有一部分地區的資訊或觀點' },
			{ tag: 'Hoax', description: '真實性被質疑' },
			{ tag: 'POV', description: '中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩' },
			{ tag: 'Self-contradictory', description: '內容自相矛盾' },
			{ tag: 'Weasel', description: '語意模棱兩可而損及其中立性或準確性' }
		],
		'可供查證和來源': [
			{ tag: 'BLPdispute', description: '可能違反了維基百科關於生者傳記的方針' },
			{ tag: 'BLPsources', description: '生者傳記需要補充更多可供查證的來源' },
			{ tag: 'BLP unsourced', description: '生者傳記沒有列出任何參考或來源' },
			{ tag: 'Citecheck', description: '可能包含不適用或被曲解的引用資料，部分內容的準確性無法被證實' },
			{ tag: 'More footnotes needed', description: '因為文內引用不足，部分字句的來源仍然不明' },
			{ tag: 'No footnotes', description: '因為沒有內文引用而來源仍然不明' },
			{ tag: 'Onesource', description: '極大或完全地依賴於某個單一的來源' },
			{ tag: 'Original research', description: '可能包含原創研究或未查證內容' },
			{ tag: 'Primarysources', description: '依賴第一手來源' },
			{ tag: 'Refimprove', description: '需要補充更多來源' },
			{ tag: 'Unreferenced', description: '沒有列出任何參考或來源' }
		]
	},
	'具體內容問題': {
		'語言': [
			{ tag: 'NotMandarin', description: '包含過多不是現代標準漢語的內容', excludeMI: true },
			{ tag: 'Rough translation', description: '翻譯品質不佳' }
		],
		'連結': [
			{ tag: 'Dead end', description: '需要加上內部連結以構築百科全書的連結網絡' },
			{ tag: 'Orphan', description: '沒有或只有很少連入頁面' },
			{ tag: 'Overlinked', description: '含有過多、重複、或不必要的內部連結' },
			{ tag: 'Underlinked', description: '需要更多內部連結以構築百科全書的連結網絡' }
		],
		'參考技術': [
			{ tag: 'Citation style', description: '引用需要進行清理' }
		],
		'分類': [
			{ tag: 'Improve categories', description: '需要更多頁面分類', excludeMI: true },
			{ tag: 'Uncategorized', description: '缺少頁面分類', excludeMI: true }
		]
	},
	'合併': [
		{ tag: 'Merge', description: '建議此頁面與頁面合併', excludeMI: true },  // these three have a subgroup with several options
		{ tag: 'Merge from', description: '建議將頁面併入本頁面', excludeMI: true },
		{ tag: 'Merge to', description: '建議將此頁面併入頁面', excludeMI: true }
	],
	'移動': [
		{ tag: 'Requested move', description: '建議將此頁面移動到新名稱', excludeMI: true }  // these three have a subgroup with several options
	]
});

// Tags for REDIRECTS start here
// Not by policy, but the list roughly approximates items with >500
// transclusions from Template:R template index
Twinkle.tag.redirectList = wgULS({
	'常用模板': [
		{ tag: '合并重定向', description: '保持页面题名至相应主条目，令页面内容在合并后仍能保存其编辑历史' },
		{ tag: '简繁重定向', description: '引导简体至繁体，或繁体至简体' },
		{ tag: '关注度重定向', description: '缺乏关注度的子主题向有关注度的母主题的重定向' },
		{ tag: '模板重定向', description: '指向模板的重定向页面' },
		{ tag: '别名重定向', description: '标题的其他名称、笔名、绰号、同义字等' },
		{ tag: '译名重定向', description: '人物、作品等各项事物的其他翻译名称' },
		{ tag: '缩写重定向', description: '标题缩写' },
		{ tag: '拼写重定向', description: '标题的其他不同拼写' },
		{ tag: '错字重定向', description: '纠正标题的常见错误拼写或误植' },
		{ tag: '旧名重定向', description: '将事物早前的名称引导至更改后的主题' },
		{ tag: '历史名称重定向', description: '具有历史意义的别名、笔名、同义词' },
		{ tag: '全名重定向', description: '标题的完整或更完整名称' },
		{ tag: '短名重定向', description: '完整标题名称或人物全名的部分、不完整的名称或简称' },
		{ tag: '姓氏重定向', description: '人物姓氏' },
		{ tag: '名字重定向', description: '人物人名' },
		{ tag: '本名重定向', description: '人物本名' },
		{
			tag: '非中文重定向',
			description: '非中文标题',
			subgroup: [
				{
					name: 'altLangFrom',
					type: 'input',
					label: '本重定向的语言（可选）',
					tooltip: '输入重定向名称所使用语言的ISO 639代码，例如en代表英语，代码可参见 Template:ISO_639_name'
				}
			]
		},
		{ tag: '日文重定向', description: '日语名称' }
	],
	'偶用模板': [
		{ tag: '角色重定向', description: '电视剧、电影、书籍等作品的角色' },
		{ tag: '章节重定向', description: '导向至较高密度组织的页面' },
		{ tag: '列表重定向', description: '导向至低密度的列表' },
		{ tag: '可能性重定向', description: '导向至当前提供内容更为详尽的目标页面' },
		{ tag: '关联字重定向', description: '标题名称关联字' },
		{
			tag: '条目请求重定向',
			description: '需要独立条目的页面',
			subgroup: [
				{
					name: 'reqArticleLang',
					type: 'input',
					label: '外语语言代码：',
					tooltip: '使用ISO 639代码，可参见 Template:ISO_639_name'
				},
				{
					name: 'reqArticleTitle',
					type: 'input',
					label: '外语页面名称：',
					size: 60
				}
			]
		},
		{ tag: '捷徑重定向', description: '维基百科快捷方式' }
	],
	'鲜用模板': [
		{ tag: '词组重定向', description: '将词组/词组/成语指向切题的条目及恰当章节' },
		{ tag: '消歧义页重定向', description: '指向消歧义页' },
		{ tag: '域名重定向', description: '网域名称' },
		{ tag: '年代重定向', description: '于年份条目导向至年代条目' },
		{ tag: '用户框模板重定向', description: '用户框模板' },
		{ tag: '重定向模板用重定向', description: '导向至重定向模板' },
		{ tag: 'EXIF重定向', description: 'JPEG图像包含EXIF信息' }
	]
}, {
	'常用模板': [
		{ tag: '合併重定向', description: '保持頁面題名至相應主條目，令頁面內容在合併後仍能儲存其編輯歷史' },
		{ tag: '簡繁重定向', description: '引導簡體至繁體，或繁體至簡體' },
		{ tag: '關注度重定向', description: '缺乏關注度的子主題向有關注度的母主題的重定向' },
		{ tag: '模板重定向', description: '指向模板的重定向頁面' },
		{ tag: '別名重定向', description: '標題的其他名稱、筆名、綽號、同義字等' },
		{ tag: '譯名重定向', description: '人物、作品等各項事物的其他翻譯名稱' },
		{ tag: '縮寫重定向', description: '標題縮寫' },
		{ tag: '拼寫重定向', description: '標題的其他不同拼寫' },
		{ tag: '錯字重定向', description: '糾正標題的常見錯誤拼寫或誤植' },
		{ tag: '舊名重定向', description: '將事物早前的名稱引導至更改後的主題' },
		{ tag: '歷史名稱重定向', description: '具有歷史意義的別名、筆名、同義詞' },
		{ tag: '全名重定向', description: '標題的完整或更完整名稱' },
		{ tag: '短名重定向', description: '完整標題名稱或人物全名的部分、不完整的名稱或簡稱' },
		{ tag: '姓氏重定向', description: '人物姓氏' },
		{ tag: '名字重定向', description: '人物人名' },
		{ tag: '本名重定向', description: '人物本名' },
		{
			tag: '非中文重定向',
			description: '非中文標題',
			subgroup: [
				{
					name: 'altLangFrom',
					type: 'input',
					label: '本重新導向的語言（可選）',
					tooltip: '輸入重新導向名稱所使用語言的ISO 639代碼，例如en代表英語，代碼可參見 Template:ISO_639_name'
				}
			]
		},
		{ tag: '日文重定向', description: '日語名稱' }
	],
	'偶用模板': [
		{ tag: '角色重定向', description: '電視劇、電影、書籍等作品的角色' },
		{ tag: '章節重定向', description: '導向至較高密度組織的頁面' },
		{ tag: '列表重定向', description: '導向至低密度的列表' },
		{ tag: '可能性重定向', description: '導向至當前提供內容更為詳盡的目標頁面' },
		{ tag: '關聯字重定向', description: '標題名稱關聯字' },
		{
			tag: '條目請求重定向',
			description: '需要獨立條目的頁面',
			subgroup: [
				{
					name: 'reqArticleLang',
					type: 'input',
					label: '外語語言代碼：',
					tooltip: '使用ISO 639代碼，可參見 Template:ISO_639_name'
				},
				{
					name: 'reqArticleTitle',
					type: 'input',
					label: '外語頁面名稱：',
					size: 60
				}
			]
		},
		{ tag: '捷徑重定向', description: '維基百科快捷方式' }
	],
	'鮮用模板': [
		{ tag: '詞組重定向', description: '將詞組/詞組/成語指向切題的條目及恰當章節' },
		{ tag: '消歧義頁重定向', description: '指向消歧義頁' },
		{ tag: '域名重定向', description: '網域名稱' },
		{ tag: '年代重定向', description: '於年份條目導向至年代條目' },
		{ tag: '用戶框模板重定向', description: '用戶框模板' },
		{ tag: '重定向模板用重定向', description: '導向至重定向模板' },
		{ tag: 'EXIF重定向', description: 'JPEG圖檔包含EXIF資訊' }
	]
});
/* eslint-enable quote-props */

// maintenance tags for FILES start here

Twinkle.tag.fileList = {};

Twinkle.tag.fileList[wgULS('著作权和来源问题标签', '著作權和來源問題標籤')] = [
	{ label: '{{Non-free reduce}}：' + wgULS('非低分辨率的合理使用图像（或过长的音频剪辑等）', '非低解析度的合理使用圖像（或過長的音頻剪輯等）'), value: 'Non-free reduce' }
];

Twinkle.tag.fileList[wgULS('维基共享资源相关标签', '維基共享資源相關標籤')] = [
	{ label: '{{Copy to Wikimedia Commons}}：' + wgULS('自由著作权文件应该被移动至维基共享资源', '自由版權檔案應該被移動至維基共享資源'), value: 'Copy to Wikimedia Commons' },
	{
		label: '{{Do not move to Commons}}：' + wgULS('不要移动至维基共享资源', '不要移動至維基共享資源'),
		value: 'Do not move to Commons_reason',
		subgroup: {
			type: 'input',
			name: 'DoNotMoveToCommons',
			label: '原因：',
			tooltip: wgULS('输入不应该将该图像移动到维基共享资源的原因（必填）。', '輸入不應該將該圖像移動到維基共享資源的原因（必填）。')
		}
	},
	{
		label: '{{Keep local}}：' + wgULS('请求在本地保留维基共享资源的文件副本', '請求在本地保留維基共享資源的檔案副本'),
		value: 'Keep local',
		subgroup: [
			{
				type: 'input',
				name: 'keeplocalName',
				label: wgULS('共享资源的不同图像名称：', '共享資源的不同圖像名稱：'),
				tooltip: wgULS('输入在共享资源的图像名称（如果不同于本地名称），不包括 File: 前缀', '輸入在共享資源的圖像名稱（如果不同於本地名稱），不包括 File: 字首')
			},
			{
				type: 'input',
				name: 'keeplocalReason',
				label: '原因：',
				tooltip: wgULS('输入请求在本地保留文件副本的原因（可选）：', '輸入請求在本地保留檔案副本的原因（可選）：')
			}
		]
	},
	{
		label: '{{Now Commons}}：' + wgULS('文件已被复制到维基共享资源（CSD F7）', '檔案已被複製到維基共享資源（CSD F7）'),
		value: 'Now Commons',
		subgroup: {
			type: 'input',
			name: 'nowcommonsName',
			label: wgULS('共享资源的不同图像名称：', '共享資源的不同圖像名稱：'),
			tooltip: wgULS('输入在共享资源的图像名称（如果不同于本地名称），不包括 File: 前缀', '輸入在共享資源的圖像名稱（如果不同於本地名稱），不包括 File: 字首')
		}
	}
];

Twinkle.tag.fileList[wgULS('清理标签', '清理標籤')] = [
	{ label: '{{Imagewatermark}}：' + wgULS('图像包含了水印', '圖像包含了浮水印'), value: 'Imagewatermark' },
	{
		label: '{{Rename media}}：' + wgULS('文件应该根据文件名称指引被重命名', '檔案應該根據檔案名稱指引被重新命名'),
		value: 'Rename media',
		subgroup: [
			{
				type: 'input',
				name: 'renamemediaNewname',
				label: wgULS('新名称：', '新名稱：'),
				tooltip: wgULS('输入图像的新名称（可选）', '輸入圖像的新名稱（可選）')
			},
			{
				type: 'input',
				name: 'renamemediaReason',
				label: '原因：',
				tooltip: wgULS('输入重命名的原因（可选）', '輸入重新命名的原因（可選）')
			}
		]
	},
	{ label: '{{Should be SVG}}：' + wgULS('PNG、GIF、JPEG文件应该重制成矢量图形', 'PNG、GIF、JPEG檔案應該重製成向量圖形'), value: 'Should be SVG' }
];

Twinkle.tag.fileList[wgULS('文件取代标签', '檔案取代標籤')] = [
	{ label: '{{Obsolete}}：' + wgULS('有新版本可用的过时文件', '有新版本可用的過時檔案'), value: 'Obsolete' },
	{ label: '{{Vector version available}}：' + wgULS('有矢量图形可用的非矢量图形文件', '有向量圖形可用的非向量圖形檔案'), value: 'Vector version available' }
];
Twinkle.tag.fileList[wgULS('文件取代标签', '檔案取代標籤')].forEach(function(el) {
	el.subgroup = {
		type: 'input',
		label: wgULS('替换的文件：', '替換的檔案：'),
		tooltip: wgULS('输入替换此文件的文件名称（必填）', '輸入替換此檔案的檔案名稱（必填）'),
		name: el.value.replace(/ /g, '_') + 'File'
	};
});

Twinkle.tag.callbacks = {
	article: function articleCallback(pageobj) {

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
		var params = pageobj.getCallbackParameters();

		/**
		 * Saves the page following the removal of tags if any. The last step.
		 * Called from removeTags()
		 */
		var postRemoval = function() {
			if (params.tagsToRemove.length) {
				// Remove empty {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|\s*\}\}\n?/im, '');
				// Remove single-element {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(?:multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|\s*(\{\{(?:\{\{[^{}]*\}\}|[^{}])+\}\})\s*\}\}/im, '$1');
			}

			// Build edit summary
			var makeSentence = function(array) {
				if (array.length < 3) {
					return array.join('和');
				}
				var last = array.pop();
				return array.join('、') + '和' + last;
			};
			var makeTemplateLink = function(tag) {
				var text = '{{[[';
				// if it is a custom tag with a parameter
				if (tag.indexOf('|') !== -1) {
					tag = tag.slice(0, tag.indexOf('|'));
				}
				text += tag.indexOf(':') !== -1 ? tag : 'Template:' + tag + '|' + tag;
				return text + ']]}}';
			};

			var summaryText;
			var addedTags = params.tags.map(makeTemplateLink);
			var removedTags = params.tagsToRemove.map(makeTemplateLink);
			if (addedTags.length) {
				summaryText = '加入' + makeSentence(addedTags);
				summaryText += removedTags.length ? '並移除' + makeSentence(removedTags) : '';
			} else {
				summaryText = '移除' + makeSentence(removedTags);
			}
			summaryText += wgULS('标记', '標記');
			if (params.reason) {
				summaryText += '：' + params.reason;
			}

			// avoid truncated summaries
			if (summaryText.length > 499) {
				summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
			}

			pageobj.setPageText(pageText);
			pageobj.setEditSummary(summaryText);
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
			pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
			pageobj.setCreateOption('nocreate');
			pageobj.save(function() {
				// special functions for merge tags
				if (params.mergeReason) {
					// post the rationale on the talk page (only operates in main namespace)
					var talkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, wgULS('将理由贴进讨论页', '將理由貼進討論頁'));
					talkpage.setNewSectionText(params.mergeReason.trim() + ' ~~~~');
					talkpage.setNewSectionTitle('请求与[[' + params.nonDiscussArticle + ']]合并');
					talkpage.setChangeTags(Twinkle.changeTags);
					talkpage.setWatchlist(Twinkle.getPref('watchMergeDiscussions'));
					talkpage.setCreateOption('recreate');
					talkpage.newSection();
				}
				if (params.mergeTagOther) {
					// tag the target page if requested
					var otherTagName = 'Merge';
					if (params.mergeTag === 'Merge from') {
						otherTagName = 'Merge to';
					} else if (params.mergeTag === 'Merge to') {
						otherTagName = 'Merge from';
					}
					var newParams = {
						tags: [otherTagName],
						tagsToRemove: [],
						tagsToRemain: [],
						mergeTarget: Morebits.pageNameNorm,
						discussArticle: params.discussArticle,
						talkDiscussionTitle: params.talkDiscussionTitle,
						talkDiscussionTitleLinked: params.talkDiscussionTitleLinked
					};
					var otherpage = new Morebits.wiki.page(params.mergeTarget, wgULS('标记其他页面（', '標記其他頁面（') +
						params.mergeTarget + '）');
					otherpage.setCallbackParameters(newParams);
					otherpage.load(Twinkle.tag.callbacks.article);
				}
				// special functions for requested move tags
				if (params.moveReason) {
					// post the rationale on the talk page (only operates in main namespace)
					var moveTalkpageText = '\n\n{{subst:RM|' + params.moveReason.trim();
					if (params.moveTarget) {
						moveTalkpageText += '|' + params.moveTarget;
					}
					moveTalkpageText += '}}';

					var moveTalkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, wgULS('将理由贴进讨论页', '將理由貼進討論頁'));
					moveTalkpage.setAppendText(moveTalkpageText);
					moveTalkpage.setEditSummary(wgULS('请求移动', '請求移動') + (params.moveTarget ? '至[[' + params.moveTarget + ']]' : ''));
					moveTalkpage.setChangeTags(Twinkle.changeTags);
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
				postRemoval();
				return;
			}

			Morebits.status.info(wgULS('信息', '資訊'), wgULS('移除取消选择的已存在标记', '移除取消選擇的已存在標記'));

			var getRedirectsFor = [];

			// Remove the tags from the page text, if found in its proper name,
			// otherwise moves it to `getRedirectsFor` array earmarking it for
			// later removal
			params.tagsToRemove.forEach(function removeTag(tag) {
				var tag_re = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?');

				if (tag_re.test(pageText)) {
					pageText = pageText.replace(tag_re, '');
				} else {
					getRedirectsFor.push('Template:' + tag);
				}
			});

			if (!getRedirectsFor.length) {
				postRemoval();
				return;
			}

			// Remove tags which appear in page text as redirects
			var api = new Morebits.wiki.api(wgULS('获取模板重定向', '取得模板重新導向'), {
				action: 'query',
				prop: 'linkshere',
				titles: getRedirectsFor.join('|'),
				redirects: 1,  // follow redirect if the class name turns out to be a redirect page
				lhnamespace: '10',  // template namespace only
				lhshow: 'redirect',
				lhlimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
			}, function removeRedirectTag(apiobj) {

				$(apiobj.responseXML).find('page').each(function(idx, page) {
					var removed = false;
					$(page).find('lh').each(function(idx, el) {
						var tag = $(el).attr('title').slice(9);
						var tag_re = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?\\}\\}\\n?');
						if (tag_re.test(pageText)) {
							pageText = pageText.replace(tag_re, '');
							removed = true;
							return false;   // break out of $.each
						}
					});
					if (!removed) {
						Morebits.status.warn(wgULS('信息', '資訊'), wgULS('无法在页面上找到{{', '無法在頁面上找到{{') + $(page).attr('title').slice(9) + wgULS('}}…跳过', '}}…跳過'));
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

		var tagRe, tagText = '', tags = [], groupableTags = [], groupableExistingTags = [];
		// Executes first: addition of selected tags

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
						currentTag += '|1=' + params.expandLanguage;
						break;
					case 'Expert needed':
						currentTag += '|subject=' + params.expert;
						if (params.expert2) {
							currentTag += '|subject2=' + params.expert2;
						}
						if (params.expert3) {
							currentTag += '|subject3=' + params.expert3;
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
						currentTag += '|1=' + params.missingInformation;
						break;
					case 'Notability':
						if (params.notability !== 'none') {
							currentTag += '|3=' + params.notability;
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
		};

		/**
		 * Adds the tags which go outside {{multiple issues}}, either because
		 * these tags aren't supported in {{multiple issues}} or because
		 * {{multiple issues}} is not being added to the page at all
		 */
		var addUngroupedTags = function() {
			$.each(tags, addTag);

			// Insert tag after short description or any hatnotes,
			// as well as deletion/protection-related templates
			var wikipage = new Morebits.wikitext.page(pageText);
			var templatesAfter = Twinkle.hatnoteRegex +
				// Protection templates
				'pp|pp-.*?|' +
				// CSD
				'(?:Delete|Db-reason|D|Deletebecause|Db|速删|速刪|Speedy|SD|快删|快刪|CSD)|' +
				// AfD
				'[rsaiftcmv]fd|vfd-(?:b|q|s|source|v|wikt)|(?:移动到维基|移動到維基)(?:教科书|教科書|语录|語錄|文库|文庫|导游|導遊|词典|詞典)';
			pageText = wikipage.insertAfterTemplates(tagText, templatesAfter).getText();

			removeTags();
		};

		// Separate tags into groupable ones (`groupableTags`) and non-groupable ones (`tags`)
		params.tags.forEach(function(tag) {
			tagRe = new RegExp('\\{\\{' + tag + '(\\||\\}\\})', 'im');
			// regex check for preexistence of tag can be skipped if in canRemove mode
			if (Twinkle.tag.canRemove || !tagRe.exec(pageText)) {
				if (tag === 'Notability' && (mw.config.get('wgNamespaceNumber') === 0 || confirm(wgULS('该页面不是条目，您仍要提报到关注度提报吗？', '該頁面不是條目，您仍要提報到關注度提報嗎？')))) {
					var wikipedia_page = new Morebits.wiki.page('Wikipedia:关注度/提报', wgULS('加入关注度记录项', '加入關注度記錄項'));
					wikipedia_page.setFollowRedirect(true);
					wikipedia_page.setCallbackParameters(params);
					wikipedia_page.load(Twinkle.tag.callbacks.notabilityList);
				}
				// condition Twinkle.tag.article.tags[tag] to ensure that its not a custom tag
				// Custom tags are assumed non-groupable, since we don't know whether MI template supports them
				if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
					groupableTags.push(tag);
				} else {
					tags.push(tag);
				}
			} else {
				if (tag === 'Merge from') {
					tags.push(tag);
				} else {
					Morebits.status.warn(wgULS('信息', '資訊'), wgULS('在页面上找到{{', '在頁面上找到{{') + tag + wgULS('}}…跳过', '}}…跳過'));
					// don't do anything else with merge tags
					if (['Merge', 'Merge to'].indexOf(tag) !== -1) {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = null;
					}
				}
			}
		});

		// To-be-retained existing tags that are groupable
		params.tagsToRemain.forEach(function(tag) {
			// If the tag is unknown to us, we consider it non-groupable
			if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
				groupableExistingTags.push(tag);
			}
		});

		var miTest = /\{\{(multiple ?issues|article ?issues|mi|ai|issues|多個問題|多个问题|問題條目|问题条目|數個問題|数个问题)\s*\|[^}]+\{/im.exec(pageText);

		if (miTest && groupableTags.length > 0) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS('加入支持的标记入已存在的{{multiple issues}}', '加入支援的標記入已存在的{{multiple issues}}'));

			tagText = '';
			$.each(groupableTags, addTag);

			var miRegex = new RegExp('(\\{\\{\\s*' + miTest[1] + '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*', 'im');
			pageText = pageText.replace(miRegex, '$1' + tagText + '}}\n');
			tagText = '';

			addUngroupedTags();

		} else if (params.group && !miTest && (groupableExistingTags.length + groupableTags.length) >= 2) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS('加入支持的标记入{{multiple issues}}', '加入支援的標記入{{multiple issues}}'));

			tagText += '{{Multiple issues|\n';

			/**
			 * Adds newly added tags to MI
			 */
			var addNewTagsToMI = function() {
				$.each(groupableTags, addTag);
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

			var api = new Morebits.wiki.api(wgULS('获取模板重定向', '取得模板重新導向'), {
				action: 'query',
				prop: 'linkshere',
				titles: getRedirectsFor.join('|'),
				redirects: 1,
				lhnamespace: '10', // template namespace only
				lhshow: 'redirect',
				lhlimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
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
						Morebits.status.warn(wgULS('信息', '資訊'), wgULS('无法在页面上找到{{', '無法在頁面上找到{{') + $(page).attr('title').slice(9) + wgULS('}}…跳过', '}}…跳過'));
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

		pageobj.setAppendText('\n{{subst:Fameitem|title=' + Morebits.pageNameNorm + '}}');
		pageobj.setEditSummary('加入' + '[[' + Morebits.pageNameNorm + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('recreate');
		pageobj.append();
	},

	redirect: function redirect(pageobj) {
		var params = pageobj.getCallbackParameters(),
			pageText = pageobj.getPageText(),
			tagRe, tagText = '', summaryText = '加入',
			tags = [], i;

		for (i = 0; i < params.tags.length; i++) {
			tagRe = new RegExp('(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im');
			if (!tagRe.exec(pageText)) {
				tags.push(params.tags[i]);
			} else {
				Morebits.status.warn(wgULS('信息', '資訊'), wgULS('在重定向上找到{{', '在重新導向上找到{{') + params.tags[i] + wgULS('}}…跳过', '}}…跳過'));
			}
		}

		var addTag = function redirectAddTag(tagIndex, tagName) {
			tagText += '\n{{' + tagName;
			if (tagName === '非中文重定向') {
				if (params.altLangFrom) {
					tagText += '|1=' + params.altLangFrom;
				}
			} else if (tagName === '条目请求重定向' || tagName === '條目請求重定向') {
				if (params.reqArticleLang && params.reqArticleTitle) {
					tagText += '|1=' + params.reqArticleLang;
					tagText += '|2=' + params.reqArticleTitle;
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

		if (!tags.length) {
			Morebits.status.warn(wgULS('信息', '資訊'), wgULS('没有标签可供标记', '沒有標籤可供標記'));
		}

		tags.sort();
		$.each(tags, addTag);

		// Check for all Rcat shell redirects (from #433)
		if (pageText.match(/{{(?:redr|this is a redirect|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
			// Regex inspired by [[User:Kephir/gadgets/sagittarius.js]] ([[Special:PermaLink/831402893]])
			var oldTags = pageText.match(/(\s*{{[A-Za-z\s]+\|(?:\s*1=)?)((?:[^|{}]|{{[^}]+}})+)(}})\s*/i);
			pageText = pageText.replace(oldTags[0], oldTags[1] + tagText + oldTags[2] + oldTags[3]);
		} else {
			// Fold any pre-existing Rcats into taglist and under Rcatshell
			var pageTags = pageText.match(/\s*{{.+?重定向.*?}}/img);
			var oldPageTags = '';
			if (pageTags) {
				pageTags.forEach(function(pageTag) {
					var pageRe = new RegExp(pageTag, 'img');
					pageText = pageText.replace(pageRe, '');
					pageTag = pageTag.trim();
					oldPageTags += '\n' + pageTag;
				});
			}
			pageText += '\n{{Redirect category shell|' + tagText + oldPageTags + '\n}}';
		}

		summaryText += (tags.length > 0 ? wgULS('标记', '標記') : '{{Redirect category shell}}') + wgULS('到重定向', '到重新導向');

		// avoid truncated summaries
		if (summaryText.length > 499) {
			summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setChangeTags(Twinkle.changeTags);
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
		var summary = '加入';

		// Add maintenance tags
		if (params.tags.length) {

			var tagtext = '', currentTag;
			$.each(params.tags, function(k, tag) {
				// when other commons-related tags are placed, remove "move to Commons" tag
				if (['Keep local', 'Now Commons', 'Do not move to Commons_reason', 'Do not move to Commons'].indexOf(tag) !== -1) {
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
				}
				if (tag === 'Vector version available') {
					text = text.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
				}

				currentTag = tag === 'Do not move to Commons_reason' ? 'Do not move to Commons' : tag;

				switch (tag) {
					case 'Now Commons':
						currentTag = 'subst:' + currentTag; // subst
						if (params.nowcommonsName !== '') {
							currentTag += '|1=' + params.nowcommonsName;
						}
						break;
					case 'Keep local':
						if (params.keeplocalName !== '') {
							currentTag += '|1=' + params.keeplocalName;
						}
						if (params.keeplocalReason !== '') {
							currentTag += '|reason=' + params.keeplocalReason;
						}
						break;
					case 'Rename media':
						if (params.renamemediaNewname !== '') {
							currentTag += '|1=' + params.renamemediaNewname;
						}
						if (params.renamemediaReason !== '') {
							currentTag += '|2=' + params.renamemediaReason;
						}
						break;
					case 'Vector version available':
						/* falls through */
					case 'Obsolete':
						currentTag += '|1=' + params[tag.replace(/ /g, '_') + 'File'];
						break;
					case 'Do not move to Commons_reason':
						currentTag += '|reason=' + params.DoNotMoveToCommons;
						break;
					case 'Copy to Wikimedia Commons':
						currentTag += '|human=' + mw.config.get('wgUserName');
						break;
					default:
						break;  // don't care
				}

				currentTag = '{{' + currentTag + '}}\n';

				tagtext += currentTag;
				summary += '{{' + tag + '}}、';
			});

			if (!tagtext) {
				pageobj.getStatusElement().warn(wgULS('用户取消操作，没什么要做的', '使用者取消操作，沒什麼要做的'));
				return;
			}

			text = tagtext + text;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary.substring(0, summary.length - 1));
		pageobj.setChangeTags(Twinkle.changeTags);
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
	var params = Morebits.quickForm.getInputData(form);


	// Validation

	// Given an array of incompatible tags, check if we have two or more selected
	var checkIncompatible = function(conflicts, extra) {
		var count = conflicts.reduce(function(sum, tag) {
			return sum += params.tags.indexOf(tag) !== -1;
		}, 0);
		if (count > 1) {
			var message = wgULS('请在以下标签中择一使用', '請在以下標籤中擇一使用') + '：{{' + conflicts.join('}}、{{') + '}}。';
			message += extra ? extra : '';
			alert(message);
			return true;
		}
	};
	// Given a tag, ensure an associate parameter is present
	// Maybe just sock this away in each function???
	var checkParameter = function(tag, parameter, description) {
		description = description || '理由';
		if (params.tags.indexOf(tag) !== -1 && params[parameter].trim() === '') {
			alert(wgULS('您必须指定', '您必須指定') + '{{' + tag + '}}的' + description + '。');
			return true;
		}
	};

	// We could theoretically put them all checkIncompatible calls in a
	// forEach loop, but it's probably clearer not to have [[array one],
	// [array two]] devoid of context. Likewise, all the checkParameter
	// calls could be in one if, but could be similarly confusing.
	switch (Twinkle.tag.modeEn) {
		case 'article':
			params.tagsToRemove = form.getUnchecked('existingTags'); // not in `input`
			params.tagsToRemain = params.existingTags || []; // container not created if none present

			if ((params.tags.indexOf('Merge') !== -1) || (params.tags.indexOf('Merge from') !== -1) ||
				(params.tags.indexOf('Merge to') !== -1)) {
				if (checkIncompatible(['Merge', 'Merge from', 'Merge to'], wgULS('如果需要多次合并，请使用{{Merge}}并用管道符分隔条目名（但在这种情形中Twinkle不能自动标记其他条目）。', '如果需要多次合併，請使用{{Merge}}並用管道符分隔條目名（但在這種情形中Twinkle不能自動標記其他條目）。'))) {
					return;
				}
				if (!params.mergeTarget) {
					alert(wgULS('请指定使用于merge模板中的另一个页面标题。', '請指定使用於merge模板中的另一個頁面標題。'));
					return;
				}
				if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1) {
					alert(wgULS('当前还不支持在一次合并中标记多个条目，与开启关于多个条目的讨论。请不要勾选“标记其他条目”并清空“理由”框后再提交。', '目前還不支援在一次合併中標記多個條目，與開啟關於多個條目的討論。請不要勾選「標記其他條目」並清空「理由」框後再提交。'));
					return;
				}
			}

			if (checkParameter('Expand language', 'expandLanguage', wgULS('语言代码', '語言代碼'))) {
				return;
			}
			if (checkParameter('Missing information', 'missingInformation', wgULS('缺少的内容', '缺少的內容'))) {
				return;
			}
			if (checkParameter('Expert needed', 'expert', wgULS('专家领域', '專家領域'))) {
				return;
			}
			break;

		case 'file':
			// Silly to provide the same string to each of these
			if (checkParameter('Obsolete', 'ObsoleteFile', wgULS('替换的文件名称', '替換的檔案名稱')) ||
				checkParameter('Vector version available', 'Vector_version_availableFile', wgULS('替换的文件名称', '替換的檔案名稱'))) {
				return;
			}
			if (checkParameter('Do not move to Commons_reason', 'DoNotMoveToCommons')) {
				return;
			}
			break;

		case 'redirect':
			break;

		default:
			alert('Twinkle.tag：未知模式 ' + Twinkle.tag.mode);
			break;
	}

	// File/redirect: return if no tags selected
	// Article: return if no tag is selected and no already present tag is deselected
	if (params.tags.length === 0 && (Twinkle.tag.modeEn !== 'article' || params.tagsToRemove.length === 0)) {
		alert(wgULS('必须选择至少一个标记！', '必須選擇至少一個標記！'));
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(form);

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = wgULS('标记完成，在几秒内刷新页面', '標記完成，在幾秒內重新整理頁面');
	if (Twinkle.tag.modeEn === 'redirect') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, wgULS('正在标记', '正在標記') + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.tag.callbacks[Twinkle.tag.modeEn]);
};

Twinkle.addInitCallback(Twinkle.tag, 'tag');
})(jQuery);
// </nowiki>
