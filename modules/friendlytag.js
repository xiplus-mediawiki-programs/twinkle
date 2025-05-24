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

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if (Morebits.isPageRedirect()) {
		Twinkle.tag.mode = conv({ hans: '重定向', hant: '重新導向' });
		Twinkle.tag.modeEn = 'redirect';
		Twinkle.addPortletLink(Twinkle.tag.callback, conv({ hans: '标记', hant: '標記' }), 'friendly-tag', conv({ hans: '标记重定向', hant: '標記重新導向' }));
	// file tagging
	} else if (mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById('mw-sharedupload') && document.getElementById('mw-imagepage-section-filehistory')) {
		Twinkle.tag.mode = conv({ hans: '文件', hant: '檔案' });
		Twinkle.tag.modeEn = 'file';
		Twinkle.addPortletLink(Twinkle.tag.callback, conv({ hans: '标记', hant: '標記' }), 'friendly-tag', conv({ hans: '标记文件', hant: '標記檔案' }));
	// article/draft tagging
	} else if (([0, 118].indexOf(mw.config.get('wgNamespaceNumber')) !== -1 && mw.config.get('wgCurRevisionId')) || (Morebits.pageNameNorm === Twinkle.getPref('sandboxPage'))) {
		Twinkle.tag.mode = conv({ hans: '条目', hant: '條目' });
		Twinkle.tag.modeEn = 'article';
		// Can't remove tags when not viewing current version
		Twinkle.tag.canRemove = (mw.config.get('wgCurRevisionId') === mw.config.get('wgRevisionId')) &&
			// Disabled on latest diff because the diff slider could be used to slide
			// away from the latest diff without causing the script to reload
			!mw.config.get('wgDiffNewId');
		Twinkle.addPortletLink(Twinkle.tag.callback, conv({ hans: '标记', hant: '標記' }), 'friendly-tag', conv({ hans: '标记条目', hant: '標記條目' }));
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.callback = function friendlytagCallback() {
	var Window = new Morebits.simpleWindow(630, Twinkle.tag.modeEn === 'article' ? 500 : 400);
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '标记设置', hant: '標記設定' }), 'WP:TW/PREF#tag');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#tag');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');
	var form = new Morebits.quickForm(Twinkle.tag.callback.evaluate);

	form.append({
		type: 'input',
		label: conv({ hans: '筛选标记列表：', hant: '篩選標記列表：' }),
		name: 'quickfilter',
		size: '30',
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
			Window.setTitle(conv({ hans: '条目维护标记', hant: '條目維護標記' }));


			// Build sorting and lookup object flatObject, which is always
			// needed but also used to generate the alphabetical list
			// Would be infinitely better with Object.values, but, alas, IE 11
			Twinkle.tag.article.flatObject = {};
			Twinkle.tag.article.tagList.forEach(function(group) {
				group.value.forEach(function(subgroup) {
					if (subgroup.value) {
						subgroup.value.forEach(function(item) {
							Twinkle.tag.article.flatObject[item.tag] = { description: item.description, excludeMI: !!item.excludeMI };
						});
					} else {
						Twinkle.tag.article.flatObject[subgroup.tag] = { description: subgroup.description, excludeMI: !!subgroup.excludeMI };
					}
				});
			});


			form.append({
				type: 'select',
				name: 'sortorder',
				label: conv({ hans: '查看列表：', hant: '檢視列表：' }),
				tooltip: conv({ hans: '您可以在Twinkle参数设置（WP:TWPREFS）中更改此项。', hant: '您可以在Twinkle偏好設定（WP:TWPREFS）中更改此項。' }),
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: conv({ hans: '按类型', hant: '按類別' }), selected: Twinkle.getPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getPref('tagArticleSortOrder') === 'alpha' }
				]
			});


			if (!Twinkle.tag.canRemove) {
				var divElement = document.createElement('div');
				divElement.innerHTML = conv({ hans: '要移除现有维护标记，请从当前条目版本中打开“标记”菜单', hant: '要移除現有維護標記，請從目前條目版本中打開「標記」選單' });
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
						label: conv({ hans: '如可能，合并入{{multiple issues}}', hant: '如可能，合併入{{multiple issues}}' }),
						value: 'group',
						name: 'group',
						tooltip: conv({
							hans: '如果加入{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并入{{multiple issues}}模板中。',
							hant: '如果加入{{multiple issues}}支援的三個以上的模板，所有支援的模板都會被合併入{{multiple issues}}模板中。'
						}),
						checked: Twinkle.getPref('groupByDefault')
					}
				]
			});

			form.append({
				type: 'input',
				label: '理由：',
				name: 'reason',
				tooltip: conv({
					hans: '附加于编辑摘要的可选理由，例如指出条目内容的哪些部分有问题或移除模板的理由，但如果理由很长则应该发表在讨论页。',
					hant: '附加於編輯摘要的可選理由，例如指出條目內容的哪些部分有問題或移除模板的理由，但如果理由很長則應該發表在討論頁。'
				}),
				size: '80'
			});

			break;

		case 'file':
			Window.setTitle(conv({ hans: '文件维护标记', hant: '檔案維護標記' }));

			Twinkle.tag.fileList.forEach(function(group) {
				if (group.buildFilename) {
					group.value.forEach(function(el) {
						el.subgroup = {
							type: 'input',
							label: conv({ hans: '替换的文件：', hant: '替換的檔案：' }),
							tooltip: conv({ hans: '输入替换此文件的文件名称（必填）', hant: '輸入替換此檔案的檔案名稱（必填）' }),
							name: el.value.replace(/ /g, '_') + 'File'
						};
					});
				}

				form.append({ type: 'header', label: group.key });
				form.append({ type: 'checkbox', name: 'tags', list: group.value });
			});

			if (Twinkle.getPref('customFileTagList').length) {
				form.append({ type: 'header', label: conv({ hans: '自定义模板', hant: '自訂模板' }) });
				form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customFileTagList') });
			}
			break;

		case 'redirect':
			Window.setTitle(conv({ hans: '重定向标记', hant: '重新導向標記' }));

			var i = 1;
			Twinkle.tag.redirectList.forEach(function(group) {
				form.append({ type: 'header', id: 'tagHeader' + i, label: group.key });
				form.append({
					type: 'checkbox',
					name: 'tags',
					list: group.value.map(function (item) {
						return { value: item.tag, label: '{{' + item.tag + '}}：' + item.description, subgroup: item.subgroup };
					})
				});
			});

			if (Twinkle.getPref('customRedirectTagList').length) {
				form.append({ type: 'header', label: conv({ hans: '自定义模板', hant: '自訂模板' }) });
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
					label: conv({ hans: '标记页面为已巡查', hant: '標記頁面為已巡查' }),
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
				checkbox.subgroup = [
					{
						name: 'expandLanguage',
						type: 'input',
						label: conv({ hans: '外语版本语言代码（必填）：', hant: '外語版本語言代碼（必填）：' })
					},
					{
						type: 'checkbox',
						list: [
							{
								name: 'highQualityArticle',
								label: conv({ hans: '高品质条目', hant: '高品質條目' })
							}
						]
					},
					{
						name: 'expandLanguage2',
						type: 'input',
						label: conv({ hans: '外语版本语言代码：', hant: '外語版本語言代碼：' })
					},
					{
						type: 'checkbox',
						list: [
							{
								name: 'highQualityArticle2',
								label: conv({ hans: '高品质条目', hant: '高品質條目' })
							}
						]
					},
					{
						name: 'expandLanguage3',
						type: 'input',
						label: conv({ hans: '外语版本语言代码：', hant: '外語版本語言代碼：' })
					},
					{
						type: 'checkbox',
						list: [
							{
								name: 'highQualityArticle3',
								label: conv({ hans: '高品质条目', hant: '高品質條目' })
							}
						]
					}
				];
				break;
			case 'Expert needed':
				checkbox.subgroup = [
					{
						name: 'expert',
						type: 'input',
						label: conv({ hans: '哪个领域的专家（必填）：', hant: '哪個領域的專家（必填）：' }),
						tooltip: conv({ hans: '必填，可参考 Category:需要专业人士关注的页面 使用现存的分类。', hant: '必填，可參考 Category:需要專業人士關注的頁面 使用現存的分類。' })
					},
					{
						name: 'expert2',
						type: 'input',
						label: conv({ hans: '哪个领域的专家：', hant: '哪個領域的專家：' }),
						tooltip: conv({ hans: '可选，可参考 Category:需要专业人士关注的页面 使用现存的分类。', hant: '可選，可參考 Category:需要專業人士關注的頁面 使用現存的分類。' })
					},
					{
						name: 'expert3',
						type: 'input',
						label: conv({ hans: '哪个领域的专家：', hant: '哪個領域的專家：' }),
						tooltip: conv({ hans: '可选，可参考 Category:需要专业人士关注的页面 使用现存的分类。', hant: '可選，可參考 Category:需要專業人士關注的頁面 使用現存的分類。' })
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
						label: conv({ hans: '其他条目：', hant: '其他條目：' }),
						tooltip: conv({ hans: '如指定多个条目，请用管道符分隔：条目甲|条目乙', hant: '如指定多個條目，請用管道符分隔：條目甲|條目乙' })
					},
					{
						type: 'checkbox',
						list: [
							{
								name: 'mergeTagOther',
								label: '用{{' + otherTagName + conv({ hans: '}}标记其他条目', hant: '}}標記其他條目' }),
								checked: true,
								tooltip: conv({ hans: '仅在只输入了一个条目名时可用', hant: '僅在只輸入了一個條目名時可用' })
							}
						]
					}
				];
				if (mw.config.get('wgNamespaceNumber') === 0) {
					checkbox.subgroup.push({
						name: 'mergeReason',
						type: 'textarea',
						label: conv({
							hans: '合并理由（会被贴上' + (tag === 'Merge to' ? '其他' : '这') + '条目的讨论页）：',
							hant: '合併理由（會被貼上' + (tag === 'Merge to' ? '其他' : '這') + '條目的討論頁）：'
						}),
						tooltip: conv({ hans: '可选，但强烈推荐。如不需要请留空。仅在只输入了一个条目名时可用。', hant: '可選，但強烈推薦。如不需要請留空。僅在只輸入了一個條目名時可用。' })
					});
				}
				break;
			case 'Missing information':
				checkbox.subgroup = {
					name: 'missingInformation',
					type: 'input',
					label: conv({ hans: '缺少的内容（必填）：', hant: '缺少的內容（必填）：' }),
					tooltip: conv({ hans: '必填，显示为“缺少有关……的信息。”', hant: '必填，顯示為「缺少有關……的資訊。」' })
				};
				break;
			case 'Notability':
				checkbox.subgroup = {
					name: 'notability',
					type: 'select',
					list: [
						{ label: '{{Notability}}：' + conv({ hans: '通用的收录标准指引', hant: '通用的收錄標準指引' }), value: 'none' },
						{ label: '{{Notability|Astro}}：' + conv({ hans: '天体', hant: '天體' }), value: 'Astro' },
						{ label: '{{Notability|Biographies}}：' + conv({ hans: '人物传记', hant: '人物傳記' }), value: 'Biographies' },
						{ label: '{{Notability|Book}}：' + conv({ hans: '书籍', hant: '書籍' }), value: 'Book' },
						{ label: '{{Notability|Cyclone}}：' + conv({ hans: '气旋', hant: '氣旋' }), value: 'Cyclone' },
						{ label: '{{Notability|Fiction}}：' + conv({ hans: '虚构事物', hant: '虛構事物' }), value: 'Fiction' },
						{ label: '{{Notability|Geographic}}：' + conv({ hans: '地理特征', hant: '地理特徵' }), value: 'Geographic' },
						{ label: '{{Notability|Geometry}}：' + conv({ hans: '几何图形', hant: '幾何圖形' }), value: 'Geometry' },
						{ label: '{{Notability|Invention}}：' + conv({ hans: '发明、研究', hant: '發明、研究' }), value: 'Invention' },
						{ label: '{{Notability|Music}}：' + conv({ hans: '音乐', hant: '音樂' }), value: 'Music' },
						{ label: '{{Notability|Numbers}}：' + conv({ hans: '数字', hant: '數字' }), value: 'Numbers' },
						{ label: '{{Notability|Organizations}}：' + conv({ hans: '组织', hant: '組織' }), value: 'Organizations' },
						{ label: '{{Notability|Property}}：' + conv({ hans: '性质表', hant: '性質表' }), value: 'Property' },
						{ label: '{{Notability|Traffic}}：' + '交通', value: 'Traffic' },
						{ label: '{{Notability|Web}}：' + conv({ hans: '网站、网络内容', hant: '網站、網路內容' }) + '（非正式指引）', value: 'Web' }
					]
				};
				break;
			case 'Requested move':
				checkbox.subgroup = [
					{
						name: 'moveTarget',
						type: 'input',
						label: conv({ hans: '新名称：', hant: '新名稱：' })
					},
					{
						name: 'moveReason',
						type: 'textarea',
						label: conv({ hans: '移动理由（会被粘贴该条目的讨论页）：', hant: '移動理由（會被貼上該條目的討論頁）：' }),
						tooltip: conv({ hans: '可选，但强烈推荐。如不需要请留空。', hant: '可選，但強烈推薦。如不需要請留空。' })
					}
				];
				break;
			case 'Split':
				checkbox.subgroup = [
					{
						name: 'target1',
						type: 'input',
						label: conv({ hans: '页面名1：', hant: '頁面名1：' }),
						tooltip: conv({ hans: '可选。', hant: '可選。' })
					},
					{
						name: 'target2',
						type: 'input',
						label: conv({ hans: '页面名2：', hant: '頁面名2：' }),
						tooltip: conv({ hans: '可选。', hant: '可選。' })
					},
					{
						name: 'target3',
						type: 'input',
						label: conv({ hans: '页面名3：', hant: '頁面名3：' }),
						tooltip: conv({ hans: '可选。', hant: '可選。' })
					}
				];
				break;
			case 'Cleanup':
				checkbox.subgroup = [
					{
						name: 'cleanupReason',
						type: 'input',
						label: '需要清理的理由',
						tooltip: conv({ hans: '可选，但强烈推荐。如不需要请留空。', hant: '可選，但強烈推薦。如不需要請留空。' })
					}
				];
				break;
			default:
				break;
		}
		return checkbox;
	};

	var makeCheckboxesForAlreadyPresentTags = function() {
		container.append({ type: 'header', id: 'tagHeader0', label: conv({ hans: '已放置的维护标记', hant: '已放置的維護標記' }) });
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
		Twinkle.tag.article.tagList.forEach(function(group) {
			container.append({ type: 'header', id: 'tagHeader' + i, label: group.key });
			var subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
			if (group.value[0].tag) {
				doCategoryCheckboxes(subdiv, group.value);
			} else {
				group.value.forEach(function(subgroup) {
					subdiv.append({ type: 'div', label: [ Morebits.htmlNode('b', subgroup.key) ] });
					doCategoryCheckboxes(subdiv, subgroup.value);
				});
			}
		});
	} else { // alphabetical sort order
		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
			container.append({ type: 'header', id: 'tagHeader1', label: conv({ hans: '可用的维护标记', hant: '可用的維護標記' }) });
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
		container.append({ type: 'header', label: conv({ hans: '自定义模板', hant: '自訂模板' }) });
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

		var firstPart = '加入' + Twinkle.tag.status.numAdded + conv({ hans: '个标记', hant: '個標記' });
		var secondPart = '移除' + Twinkle.tag.status.numRemoved + conv({ hans: '个标记', hant: '個標記' });
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
Twinkle.tag.article.tagList = [{
	key: conv({ hans: '清理和维护模板', hant: '清理和維護模板' }),
	value: [{
		key: conv({ hans: '常规清理', hant: '常規清理' }),
		value: [
			{ tag: 'Cleanup', description: conv({ hans: '可能需要进行清理，以符合维基百科的质量标准', hant: '可能需要進行清理，以符合維基百科的質量標準' }) },
			{ tag: 'Cleanup rewrite', description: conv({ hans: '不符合维基百科的质量标准，需要完全重写', hant: '不符合維基百科的質量標準，需要完全重寫' }) },
			{ tag: 'Cleanup-jargon', description: conv({ hans: '包含过多行话或专业术语，可能需要简化或提出进一步解释', hant: '包含過多行話或專業術語，可能需要簡化或提出進一步解釋' }) },
			{ tag: 'Copy edit', description: conv({ hans: '需要编修，以确保文法、用词、语气、格式、标点等使用恰当', hant: '需要編修，以確保文法、用詞、語氣、格式、標點等使用恰當' }) }
		]
	},
	{
		key: conv({ hans: '可能多余的内容', hant: '可能多餘的內容' }),
		value: [
			{ tag: 'Copypaste', description: conv({ hans: '内容可能是从某个来源处拷贝后粘贴', hant: '內容可能是從某個來源處拷貝後貼上' }) },
			{ tag: 'External links', description: conv({ hans: '使用外部链接的方式可能不符合维基百科的方针或指引', hant: '使用外部連結的方式可能不符合維基百科的方針或指引' }) },
			{ tag: 'Non-free', description: conv({ hans: '可能过多或不当地使用了受著作权保护的文字、图像或多媒体文件', hant: '可能過多或不當地使用了受版權保護的文字、圖像或多媒體檔案' }) }
		]
	},
	{
		key: conv({ hans: '结构和导言', hant: '結構和導言' }),
		value: [
			{ tag: 'Lead too long', description: conv({ hans: '导言部分也许过于冗长', hant: '導言部分也許過於冗長' }) },
			{ tag: 'Lead too short', description: conv({ hans: '导言部分也许不足以概括其内容', hant: '導言部分也許不足以概括其內容' }) },
			{ tag: 'Very long', description: conv({ hans: '可能过于冗长', hant: '可能過於冗長' }) }
		]
	},
	{
		key: conv({ hans: '虚构作品相关清理', hant: '虛構作品相關清理' }),
		value: [
			{ tag: 'In-universe', description: conv({ hans: '使用小说故事内的观点描述一个虚构事物', hant: '使用小說故事內的觀點描述一個虛構事物' }) },
			{ tag: 'Long plot', description: conv({ hans: '可能包含过于详细的剧情摘要', hant: '可能包含過於詳細的劇情摘要' }) }
		]
	}]
},
{
	key: conv({ hans: '常规条目问题', hant: '常規條目問題' }),
	value: [{
		key: '重要性和知名度',
		value: [
			{ tag: 'Notability', description: conv({ hans: '可能不符合通用收录标准指引', hant: '可能不符合通用收錄標準指引' }), excludeMI: true },  // has a subgroup with subcategories
			{ tag: 'Notability Unreferenced', description: conv({ hans: '可能符合收录标准，但需要来源加以彰显', hant: '可能符合收錄標準，但需要來源加以彰顯' }) }
		]
	},
	{
		key: conv({ hans: '写作风格', hant: '寫作風格' }),
		value: [
			{ tag: 'Advert', description: conv({ hans: '类似广告或宣传性内容', hant: '類似廣告或宣傳性內容' }) },
			{ tag: 'Fanpov', description: conv({ hans: '类似爱好者网页', hant: '類似愛好者網頁' }) },
			{ tag: 'How-to', description: conv({ hans: '包含指南或教学内容', hant: '包含指南或教學內容' }) },
			{ tag: 'Inappropriate person', description: conv({ hans: '使用不适当的第一人称和第二人称', hant: '使用不適當的第一人稱和第二人稱' }) },
			{ tag: 'Newsrelease', description: conv({ hans: '阅读起来像是新闻稿及包含过度的宣传性语调', hant: '閱讀起來像是新聞稿及包含過度的宣傳性語調' }) },
			{ tag: 'Prose', description: conv({ hans: '使用了日期或时间列表式记述，需要改写为连贯的叙述性文字', hant: '使用了日期或時間列表式記述，需要改寫為連貫的敘述性文字' }) },
			{ tag: 'Review', description: conv({ hans: '阅读起来类似评论，需要清理', hant: '閱讀起來類似評論，需要清理' }) },
			{ tag: 'Tone', description: conv({ hans: '语调或风格可能不适合百科全书的写作方式', hant: '語調或風格可能不適合百科全書的寫作方式' }) }
		]
	},
	{
		key: conv({ hans: '内容', hant: '內容' }),
		value: [
			{ tag: 'Expand language', description: conv({ hans: '可以根据其他语言版本扩充', hant: '可以根據其他語言版本擴充' }) },  // these three have a subgroup with several options
			{ tag: 'Missing information', description: '缺少必要的信息' },  // these three have a subgroup with several options
			{ tag: 'Substub', description: conv({ hans: '过于短小', hant: '過於短小' }), excludeMI: true },
			{ tag: 'Unencyclopedic', description: conv({ hans: '可能不适合写入百科全书', hant: '可能不適合寫入百科全書' }) }
		]
	},
	{
		key: conv({ hans: '信息和细节', hant: '資訊和細節' }),
		value: [
			{ tag: 'Expert needed', description: conv({ hans: '需要精通或熟悉本主题的专业人士（专家）参与及协助编辑', hant: '需要精通或熟悉本主題的專業人士（專家）參與及協助編輯' }) },
			{ tag: 'Overly detailed', description: conv({ hans: '包含太多过度细节内容', hant: '包含太多過度細節內容' }) },
			{ tag: 'Trivia', description: conv({ hans: '应避免有陈列杂项、琐碎资料的部分', hant: '應避免有陳列雜項、瑣碎資料的部分' }) }
		]
	},
	{
		key: conv({ hans: '时间性', hant: '時間性' }),
		value: [
			{ tag: 'Current', description: conv({ hans: '记述新闻动态', hant: '記述新聞動態' }), excludeMI: true }, // Works but not intended for use in MI
			{ tag: 'Update', description: conv({ hans: '当前条目或章节需要更新', hant: '當前條目或章節需要更新' }) }
		]
	},
	{
		key: conv({ hans: '中立、偏见和事实准确性', hant: '中立、偏見和事實準確性' }),
		value: [
			{ tag: 'Autobiography', description: conv({ hans: '类似一篇自传，或内容主要由条目描述的当事人或组织撰写、编辑', hant: '類似一篇自傳，或內容主要由條目描述的當事人或組織撰寫、編輯' }) },
			{ tag: 'COI', description: conv({ hans: '主要贡献者与本条目所宣扬的内容可能存在利益冲突', hant: '主要貢獻者與本條目所宣揚的內容可能存在利益衝突' }) },
			{ tag: 'Disputed', description: conv({ hans: '内容疑欠准确，有待查证', hant: '內容疑欠準確，有待查證' }) },
			{ tag: 'Globalize', description: conv({ hans: '仅具有一部分地区的信息或观点', hant: '僅具有一部分地區的資訊或觀點' }) },
			{ tag: 'Hoax', description: conv({ hans: '真实性被质疑', hant: '真實性被質疑' }) },
			{ tag: 'POV', description: conv({ hans: '中立性有争议。内容、语调可能带有明显的个人观点或地方色彩', hant: '中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩' }) },
			{ tag: 'Self-contradictory', description: conv({ hans: '内容自相矛盾', hant: '內容自相矛盾' }) },
			{ tag: 'Weasel', description: conv({ hans: '语义模棱两可而损及其中立性或准确性', hant: '語意模棱兩可而損及其中立性或準確性' }) }
		]
	},
	{
		key: conv({ hans: '可供查证和来源', hant: '可供查證和來源' }),
		value: [
			{ tag: 'BLPdispute', description: conv({ hans: '可能违反了维基百科关于生者传记的方针', hant: '可能違反了維基百科關於生者傳記的方針' }) },
			{ tag: 'BLPsources', description: conv({ hans: '生者传记需要补充更多可供查证的来源', hant: '生者傳記需要補充更多可供查證的來源' }) },
			{ tag: 'BLP unsourced', description: conv({ hans: '生者传记没有列出任何参考或来源', hant: '生者傳記沒有列出任何參考或來源' }) },
			{ tag: 'Citecheck', description: conv({ hans: '可能包含不适用或被曲解的引用资料，部分内容的准确性无法被证实', hant: '可能包含不適用或被曲解的引用資料，部分內容的準確性無法被證實' }) },
			{ tag: 'More footnotes needed', description: conv({ hans: '因为文内引用不足，部分字句的来源仍然不明', hant: '因為文內引用不足，部分字句的來源仍然不明' }) },
			{ tag: 'No footnotes', description: conv({ hans: '因为没有内文引用而来源仍然不明', hant: '因為沒有內文引用而來源仍然不明' }) },
			{ tag: 'Onesource', description: conv({ hans: '极大或完全地依赖于某个单一的来源', hant: '極大或完全地依賴於某個單一的來源' }) },
			{ tag: 'Original research', description: conv({ hans: '可能包含原创研究或未查证内容', hant: '可能包含原創研究或未查證內容' }) },
			{ tag: 'Primarysources', description: conv({ hans: '依赖第一手来源', hant: '依賴第一手來源' }) },
			{ tag: 'Refimprove', description: conv({ hans: '需要补充更多来源', hant: '需要補充更多來源' }) },
			{ tag: 'Unreferenced', description: conv({ hans: '没有列出任何参考或来源', hant: '沒有列出任何參考或來源' }) },
			{ tag: 'Unreliable sources', description: conv({ hans: '使用的来源可能不可靠', hant: '使用的來源可能不可靠' }) }
		]
	}]
},
{
	key: conv({ hans: '具体内容问题', hant: '具體內容問題' }),
	value: [{
		key: conv({ hans: '语言', hant: '語言' }),
		value: [
			{ tag: 'NotMandarin', description: conv({ hans: '包含过多不是现代标准汉语的内容', hant: '包含過多不是現代標準漢語的內容' }), excludeMI: true },
			{ tag: 'Rough translation', description: conv({ hans: '翻译品质不佳', hant: '翻譯品質不佳' }) }
		]
	},
	{
		key: conv({ hans: '链接', hant: '連結' }),
		value: [
			{ tag: 'Dead end', description: conv({ hans: '需要加上内部链接以构筑百科全书的链接网络', hant: '需要加上內部連結以構築百科全書的連結網絡' }) },
			{ tag: 'Orphan', description: conv({ hans: '没有或只有很少链入页面', hant: '沒有或只有很少連入頁面' }) },
			{ tag: 'Overlinked', description: conv({ hans: '含有过多、重复、或不必要的内部链接', hant: '含有過多、重複、或不必要的內部連結' }) },
			{ tag: 'Underlinked', description: conv({ hans: '需要更多内部链接以构筑百科全书的链接网络', hant: '需要更多內部連結以構築百科全書的連結網絡' }) }
		]
	},
	{
		key: conv({ hans: '参考技术', hant: '參考技術' }),
		value: [
			{ tag: 'Citation style', description: conv({ hans: '引用需要进行清理', hant: '引用需要進行清理' }) }
		]
	},
	{
		key: conv({ hans: '分类', hant: '分類' }),
		value: [
			{ tag: 'Improve categories', description: conv({ hans: '需要更多页面分类', hant: '需要更多頁面分類' }), excludeMI: true },
			{ tag: 'Uncategorized', description: conv({ hans: '缺少页面分类', hant: '缺少頁面分類' }), excludeMI: true }
		]
	}]
},
{
	key: conv({ hans: '合并、拆分、移动', hant: '合併、拆分、移動' }),
	value: [
		{ tag: 'Merge from', description: conv({ hans: '建议将页面并入本页面', hant: '建議將頁面併入本頁面' }), excludeMI: true },
		{ tag: 'Merge to', description: conv({ hans: '建议将此页面并入页面', hant: '建議將此頁面併入頁面' }), excludeMI: true },
		{ tag: 'Merge', description: conv({ hans: '建议此页面与页面合并', hant: '建議此頁面與頁面合併' }), excludeMI: true },
		{ tag: 'Requested move', description: conv({ hans: '建议将此页面移动到新名称', hant: '建議將此頁面移動到新名稱' }), excludeMI: true },
		{ tag: 'Split', description: conv({ hans: '建议将此页面分割为多个页面', hant: '建議將此頁面分割為多個頁面' }), excludeMI: true }
	]
}];

// Tags for REDIRECTS start here
// Not by policy, but the list roughly approximates items with >500
// transclusions from Template:R template index
Twinkle.tag.redirectList = [{
	key: '常用模板',
	value: [
		{ tag: conv({ hans: '合并重定向', hant: '合併重定向' }), description: conv({ hans: '保持页面题名至相应主条目，令页面内容在合并后仍能保存其编辑历史', hant: '保持頁面題名至相應主條目，令頁面內容在合併後仍能儲存其編輯歷史' }) },
		{ tag: conv({ hans: '简繁重定向', hant: '簡繁重定向' }), description: conv({ hans: '引导简体至繁体，或繁体至简体', hant: '引導簡體至繁體，或繁體至簡體' }) },
		{ tag: conv({ hans: '收录标准重定向', hant: '收錄標準重定向' }), description: conv({ hans: '不符收录标准的子主题向符合收录标准的母主题的重定向', hant: '不符收錄標準的子主題向符合收錄標準的母主題的重定向' }) },
		{ tag: '模板重定向', description: conv({ hans: '指向模板的重定向页面', hant: '指向模板的重定向頁面' }) },
		{ tag: conv({ hans: '别名重定向', hant: '別名重定向' }), description: conv({ hans: '标题的其他名称、笔名、绰号、同义字等', hant: '標題的其他名稱、筆名、綽號、同義字等' }) },
		{ tag: conv({ hans: '译名重定向', hant: '譯名重定向' }), description: conv({ hans: '人物、作品等各项事物的其他翻译名称', hant: '人物、作品等各項事物的其他翻譯名稱' }) },
		{ tag: conv({ hans: '缩写重定向', hant: '縮寫重定向' }), description: conv({ hans: '标题缩写', hant: '標題縮寫' }) },
		{ tag: conv({ hans: '拼写重定向', hant: '拼寫重定向' }), description: conv({ hans: '标题的其他不同拼写', hant: '標題的其他不同拼寫' }) },
		{ tag: conv({ hans: '错字重定向', hant: '錯字重定向' }), description: conv({ hans: '纠正标题的常见错误拼写或误植', hant: '糾正標題的常見錯誤拼寫或誤植' }) },
		{ tag: conv({ hans: '旧名重定向', hant: '舊名重定向' }), description: conv({ hans: '将事物早前的名称引导至更改后的主题', hant: '將事物早前的名稱引導至更改後的主題' }) },
		{ tag: '全名重定向', description: conv({ hans: '标题的完整或更完整名称', hant: '標題的完整或更完整名稱' }) },
		{ tag: '短名重定向', description: conv({ hans: '完整标题名称或人物全名的部分、不完整的名称或简称', hant: '完整標題名稱或人物全名的部分、不完整的名稱或簡稱' }) },
		{ tag: '姓氏重定向', description: '人物姓氏' },
		{ tag: '名字重定向', description: '人物人名' },
		{ tag: '本名重定向', description: '人物本名' },
		{
			tag: '非中文重定向',
			description: conv({ hans: '非中文标题', hant: '非中文標題' }),
			subgroup: [
				{
					name: 'altLangFrom',
					type: 'input',
					label: '本重新導向的語言（可選）',
					tooltip: '輸入重新導向名稱所使用語言的ISO 639代碼，例如en代表英語，代碼可參見 Template:ISO_639_name'
				}
			]
		},
		{ tag: '日文重定向', description: conv({ hans: '日语名称', hant: '日語名稱' }) }
	]
},
{
	key: '偶用模板',
	value: [
		{ tag: '角色重定向', description: conv({ hans: '电视剧、电影、书籍等作品的角色', hant: '電視劇、電影、書籍等作品的角色' }) },
		{ tag: conv({ hans: '章节重定向', hant: '章節重定向' }), description: conv({ hans: '导向至较高密度组织的页面', hant: '導向至較高密度組織的頁面' }) },
		{ tag: '列表重定向', description: conv({ hans: '导向至低密度的列表', hant: '導向至低密度的列表' }) },
		{ tag: '可能性重定向', description: conv({ hans: '导向至当前提供内容更为详尽的目标页面', hant: '導向至當前提供內容更為詳盡的目標頁面' }) },
		{ tag: conv({ hans: '关联字重定向', hant: '關聯字重定向' }), description: conv({ hans: '标题名称关联字', hant: '標題名稱關聯字' }) },
		{
			tag: conv({ hans: '条目请求重定向', hant: '條目請求重定向' }),
			description: conv({ hans: '需要独立条目的页面', hant: '需要獨立條目的頁面' }),
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
		{ tag: conv({ hans: '快捷方式重定向', hant: '捷徑重定向' }), description: conv({ hans: '维基百科快捷方式', hant: '維基百科快捷方式' }) }
	]
},
{
	key: conv({ hans: '鲜用模板', hant: '鮮用模板' }),
	value: [
		{ tag: conv({ hans: '词组重定向', hant: '詞組重定向' }), description: conv({ hans: '将词组/词组/成语指向切题的条目及恰当章节', hant: '將詞組/詞組/成語指向切題的條目及恰當章節' }) },
		{ tag: conv({ hans: '消歧义页重定向', hant: '消歧義頁重定向' }), description: conv({ hans: '指向消歧义页', hant: '指向消歧義頁' }) },
		{ tag: '域名重定向', description: conv({ hans: '域名', hant: '網域名稱' }) },
		{ tag: '年代重定向', description: conv({ hans: '于年份条目导向至年代条目', hant: '於年份條目導向至年代條目' }) },
		{ tag: conv({ hans: '用户框模板重定向', hant: '用戶框模板重定向' }), description: conv({ hans: '用户框模板', hant: '用戶框模板' }) },
		{ tag: '重定向模板用重定向', description: conv({ hans: '导向至重定向模板', hant: '導向至重定向模板' }) },
		{ tag: 'EXIF重定向', description: conv({ hans: 'JPEG图像文件包含EXIF信息', hant: 'JPEG圖檔包含EXIF資訊' }) }
	]
}];

// maintenance tags for FILES start here

Twinkle.tag.fileList = [{
	key: conv({ hans: '著作权和来源问题标签', hant: '著作權和來源問題標籤' }),
	value: [
		{
			label: '{{Non-free reduce}}：' + conv({ hans: '非低分辨率的合理使用图像（或过长的音频剪辑等）', hant: '非低解析度的合理使用圖像（或過長的音頻剪輯等）' }), value: 'Non-free reduce'
		}
	]
},
{
	key: conv({ hans: '维基共享资源相关标签', hant: '維基共享資源相關標籤' }),
	value: [
		{
			label: '{{Copy to Wikimedia Commons}}：' + conv({ hans: '自由著作权文件应该被移动至维基共享资源', hant: '自由版權檔案應該被移動至維基共享資源' }), value: 'Copy to Wikimedia Commons'
		},
		{
			label: '{{Do not move to Commons}}：' + conv({ hans: '不要移动至维基共享资源', hant: '不要移動至維基共享資源' }),
			value: 'Do not move to Commons',
			subgroup: {
				type: 'input',
				name: 'DoNotMoveToCommons_reason',
				label: '原因：',
				tooltip: conv({ hans: '输入不应该将该图像移动到维基共享资源的原因（必填）。', hant: '輸入不應該將該圖像移動到維基共享資源的原因（必填）。' })
			}
		},
		{
			label: '{{Keep local}}：' + conv({ hans: '请求在本地保留维基共享资源的文件副本', hant: '請求在本地保留維基共享資源的檔案副本' }),
			value: 'Keep local',
			subgroup: [
				{
					type: 'input',
					name: 'keeplocalName',
					label: conv({ hans: '共享资源的不同图像名称：', hant: '共享資源的不同圖像名稱：' }),
					tooltip: conv({ hans: '输入在共享资源的图像名称（如果不同于本地名称），不包括 File: 前缀', hant: '輸入在共享資源的圖像名稱（如果不同於本地名稱），不包括 File: 字首' })
				},
				{
					type: 'input',
					name: 'keeplocalReason',
					label: '原因：',
					tooltip: conv({ hans: '输入请求在本地保留文件副本的原因（可选）：', hant: '輸入請求在本地保留檔案副本的原因（可選）：' })
				}
			]
		},
		{
			label: '{{Now Commons}}：' + conv({ hans: '文件已被复制到维基共享资源（CSD F7）', hant: '檔案已被複製到維基共享資源（CSD F7）' }),
			value: 'Now Commons',
			subgroup: {
				type: 'input',
				name: 'nowcommonsName',
				label: conv({ hans: '共享资源的不同图像名称：', hant: '共享資源的不同圖像名稱：' }),
				tooltip: conv({ hans: '输入在共享资源的图像名称（如果不同于本地名称），不包括 File: 前缀', hant: '輸入在共享資源的圖像名稱（如果不同於本地名稱），不包括 File: 字首' })
			}
		}
	]
},
{
	key: conv({ hans: '清理标签', hant: '清理標籤' }),
	value: [
		{ label: '{{Watermark}}：' + conv({ hans: '图像包含了水印', hant: '圖像包含了浮水印' }), value: 'Watermark' },
		{
			label: '{{Rename media}}：' + conv({ hans: '文件应该根据文件名称指引被重命名', hant: '檔案應該根據檔案名稱指引被重新命名' }),
			value: 'Rename media',
			subgroup: [
				{
					type: 'input',
					name: 'renamemediaNewname',
					label: conv({ hans: '新名称：', hant: '新名稱：' }),
					tooltip: conv({ hans: '输入图像的新名称（可选）', hant: '輸入圖像的新名稱（可選）' })
				},
				{
					type: 'input',
					name: 'renamemediaReason',
					label: '原因：',
					tooltip: conv({ hans: '输入重命名的原因（可选）', hant: '輸入重新命名的原因（可選）' })
				}
			]
		},
		{ label: '{{Should be SVG}}：' + conv({ hans: 'PNG、GIF、JPEG文件应该重制成矢量图形', hant: 'PNG、GIF、JPEG檔案應該重製成向量圖形' }), value: 'Should be SVG' }
	]
},
{
	key: conv({ hans: '文件取代标签', hant: '檔案取代標籤' }),
	value: [
		{ label: '{{Obsolete}}：' + conv({ hans: '有新版本可用的过时文件', hant: '有新版本可用的過時檔案' }), value: 'Obsolete' },
		{ label: '{{Vector version available}}：' + conv({ hans: '有矢量图形可用的非矢量图形文件', hant: '有向量圖形可用的非向量圖形檔案' }), value: 'Vector version available' }
	],
	buildFilename: true
}];

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
			summaryText += conv({ hans: '标记', hant: '標記' });
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
					var talkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, conv({ hans: '将理由贴进讨论页', hant: '將理由貼進討論頁' }));
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
					var otherpage = new Morebits.wiki.page(params.mergeTarget, conv({ hans: '标记其他页面（', hant: '標記其他頁面（' }) +
						params.mergeTarget + '）');
					otherpage.setCallbackParameters(newParams);
					otherpage.load(Twinkle.tag.callbacks.article);
				}
				// special functions for requested move tags
				if (params.moveReason) {
					// post the rationale on the talk page (only operates in main namespace)
					var moveTalkpageText = '\n\n{{subst:RM|1=' + params.moveReason.trim();
					if (params.moveTarget) {
						moveTalkpageText += '|2=' + params.moveTarget;
					}
					moveTalkpageText += '}}';

					var moveTalkpage = new Morebits.wiki.page('Talk:' + params.discussArticle, conv({ hans: '将理由贴进讨论页', hant: '將理由貼進討論頁' }));
					moveTalkpage.setAppendText(moveTalkpageText);
					moveTalkpage.setEditSummary(conv({ hans: '请求移动', hant: '請求移動' }) + (params.moveTarget ? '至[[' + params.moveTarget + ']]' : ''));
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

			Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '移除取消选择的已存在标记', hant: '移除取消選擇的已存在標記' }));

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
			var api = new Morebits.wiki.api(conv({ hans: '获取模板重定向', hant: '取得模板重新導向' }), {
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
						Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '无法在页面上找到{{', hant: '無法在頁面上找到{{' }) + $(page).attr('title').slice(9) + conv({ hans: '}}…跳过', hant: '}}…跳過' }));
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
						if (params.highQualityArticle) {
							currentTag += '|status=yes';
						}
						if (params.expandLanguage2) {
							currentTag += '|2=' + params.expandLanguage2;
							if (params.highQualityArticle2) {
								currentTag += '|status2=yes';
							}
						}
						if (params.expandLanguage3) {
							currentTag += '|3=' + params.expandLanguage3;
							if (params.highQualityArticle3) {
								currentTag += '|status3=yes';
							}
						}
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
						params.mergeTag = tagName;
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
									params.talkDiscussionTitle = conv({ hans: '请求与', hant: '請求與' }) + params.nonDiscussArticle + conv({ hans: '合并', hant: '合併' });
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
					case 'Split':
						if (params.target1) {
							currentTag += '|1=' + params.target1;
						}
						if (params.target2) {
							currentTag += '|2=' + params.target2;
						}
						if (params.target3) {
							currentTag += '|3=' + params.target3;
						}
						break;
					case 'Cleanup':
						if (params.cleanupReason) {
							currentTag += '|reason=' + params.cleanupReason;
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
				if (tag === 'Notability' && (mw.config.get('wgNamespaceNumber') === 0 || confirm(conv({ hans: '该页面不是条目，您仍要提报到收录标准提报吗？', hant: '該頁面不是條目，您仍要提報到收錄標準提報嗎？' })))) {
					var wikipedia_page = new Morebits.wiki.page('Wikipedia:收錄標準/提報', conv({ hans: '加入收录标准提报记录', hant: '加入收錄標準提報記錄' }));
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
					Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '在页面上找到{{', hant: '在頁面上找到{{' }) + tag + conv({ hans: '}}…跳过', hant: '}}…跳過' }));
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
			Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '加入支持的标记入已存在的{{multiple issues}}', hant: '加入支援的標記入已存在的{{multiple issues}}' }));

			tagText = '';
			$.each(groupableTags, addTag);

			var miRegex = new RegExp('(\\{\\{\\s*' + miTest[1] + '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*', 'im');
			pageText = pageText.replace(miRegex, '$1' + tagText + '}}\n');
			tagText = '';

			addUngroupedTags();

		} else if (params.group && !miTest && (groupableExistingTags.length + groupableTags.length) >= 2) {
			Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '加入支持的标记入{{multiple issues}}', hant: '加入支援的標記入{{multiple issues}}' }));

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

			var api = new Morebits.wiki.api(conv({ hans: '获取模板重定向', hant: '取得模板重新導向' }), {
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
						Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '无法在页面上找到{{', hant: '無法在頁面上找到{{' }) + $(page).attr('title').slice(9) + conv({ hans: '}}…跳过', hant: '}}…跳過' }));
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
				Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '在重定向上找到{{', hant: '在重新導向上找到{{' }) + params.tags[i] + conv({ hans: '}}…跳过', hant: '}}…跳過' }));
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
			Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '没有标签可供标记', hant: '沒有標籤可供標記' }));
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
					var pageRe = new RegExp(Morebits.string.escapeRegExp(pageTag), 'img');
					pageText = pageText.replace(pageRe, '');
					pageTag = pageTag.trim();
					oldPageTags += '\n' + pageTag;
				});
			}
			pageText += '\n{{Redirect category shell|' + tagText + oldPageTags + '\n}}';
		}

		summaryText += (tags.length > 0 ? conv({ hans: '标记', hant: '標記' }) : '{{Redirect category shell}}') + conv({ hans: '到重定向', hant: '到重新導向' });

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
				if (['Keep local', 'Now Commons', 'Do not move to Commons'].indexOf(tag) !== -1) {
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
				}
				if (tag === 'Vector version available') {
					text = text.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
				}

				currentTag = tag;

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
					case 'Do not move to Commons':
						currentTag += '|reason=' + params.DoNotMoveToCommons_reason;
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
				pageobj.getStatusElement().warn(conv({ hans: '用户取消操作，没什么要做的', hant: '使用者取消操作，沒什麼要做的' }));
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
			var message = conv({ hans: '请在以下标签中择一使用', hant: '請在以下標籤中擇一使用' }) + '：{{' + conflicts.join('}}、{{') + '}}。';
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
			alert(conv({ hans: '您必须指定', hant: '您必須指定' }) + '{{' + tag + '}}的' + description + '。');
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
				if (checkIncompatible(['Merge', 'Merge from', 'Merge to'], conv({ hans: '如果需要多次合并，请使用{{Merge}}并用管道符分隔条目名（但在这种情形中Twinkle不能自动标记其他条目）。', hant: '如果需要多次合併，請使用{{Merge}}並用管道符分隔條目名（但在這種情形中Twinkle不能自動標記其他條目）。' }))) {
					return;
				}
				if (!params.mergeTarget) {
					alert(conv({ hans: '请指定使用于merge模板中的另一个页面标题。', hant: '請指定使用於merge模板中的另一個頁面標題。' }));
					return;
				}
				if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1) {
					alert(conv({ hans: '当前还不支持在一次合并中标记多个条目，与开启关于多个条目的讨论。请不要勾选“标记其他条目”并清空“理由”框后再提交。', hant: '目前還不支援在一次合併中標記多個條目，與開啟關於多個條目的討論。請不要勾選「標記其他條目」並清空「理由」框後再提交。' }));
					return;
				}
			}

			if (checkParameter('Expand language', 'expandLanguage', conv({ hans: '语言代码', hant: '語言代碼' }))) {
				return;
			}
			if (checkParameter('Missing information', 'missingInformation', conv({ hans: '缺少的内容', hant: '缺少的內容' }))) {
				return;
			}
			if (checkParameter('Expert needed', 'expert', conv({ hans: '专家领域', hant: '專家領域' }))) {
				return;
			}
			break;

		case 'file':
			// Silly to provide the same string to each of these
			if (checkParameter('Obsolete', 'ObsoleteFile', conv({ hans: '替换的文件名称', hant: '替換的檔案名稱' })) ||
				checkParameter('Vector version available', 'Vector_version_availableFile', conv({ hans: '替换的文件名称', hant: '替換的檔案名稱' }))) {
				return;
			}
			if (checkParameter('Do not move to Commons', 'DoNotMoveToCommons_reason')) {
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
		alert(conv({ hans: '必须选择至少一个标记！', hant: '必須選擇至少一個標記！' }));
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(form);

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = conv({ hans: '标记完成，将在几秒内刷新页面', hant: '標記完成，將在幾秒內重新整理頁面' });
	if (Twinkle.tag.modeEn === 'redirect') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, conv({ hans: '正在标记', hant: '正在標記' }) + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.tag.callbacks[Twinkle.tag.modeEn]);
};

Twinkle.addInitCallback(Twinkle.tag, 'tag');
})(jQuery);
// </nowiki>
