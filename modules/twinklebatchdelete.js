// <nowiki>


(function() {


/*
 ****************************************
 *** twinklebatchdelete.js: Batch delete module (sysops only)
 ****************************************
 * Mode of invocation:     Tab ("D-batch")
 * Active on:              Existing non-articles, and Special:PrefixIndex
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.batchdelete = function twinklebatchdelete() {
	if (
		Morebits.userIsSysop && (
			(mw.config.get('wgCurRevisionId') && mw.config.get('wgNamespaceNumber') > 0) ||
			mw.config.get('wgCanonicalSpecialPageName') === 'Prefixindex' ||
			mw.config.get('wgCanonicalSpecialPageName') === 'BrokenRedirects'
		)
	) {
		Twinkle.addPortletLink(Twinkle.batchdelete.callback, conv({ hans: '批删', hant: '批刪' }), 'tw-batch', conv({ hans: '删除此分类或页面中的所有链接', hant: '刪除此分類或頁面中的所有連結' }));
	}
};

Twinkle.batchdelete.unlinkCache = {};

// Has the subpages list been loaded?
var subpagesLoaded;

Twinkle.batchdelete.callback = function twinklebatchdeleteCallback() {
	subpagesLoaded = false;
	var Window = new Morebits.SimpleWindow(600, 400);
	Window.setTitle(conv({ hans: '批量删除', hant: '批次刪除' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#batchdelete');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.batchdelete.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '删除页面', hant: '刪除頁面' }),
				name: 'delete_page',
				value: 'delete',
				checked: true,
				subgroup: {
					type: 'checkbox',
					list: [
						{
							label: conv({ hans: '删除关联的讨论页（用户讨论页除外）', hant: '刪除關聯的討論頁（使用者討論頁除外）' }),
							name: 'delete_talk',
							value: 'delete_talk',
							checked: true
						},
						{
							label: conv({ hans: '删除到已删页面的重定向页', hant: '刪除到已刪頁面的重新導向頁面' }),
							name: 'delete_redirects',
							value: 'delete_redirects',
							checked: true
						},
						{
							label: conv({ hans: '删除已删页面的子页面', hant: '刪除已刪頁面的子頁面' }),
							name: 'delete_subpages',
							value: 'delete_subpages',
							checked: false,
							event: Twinkle.batchdelete.callback.toggleSubpages,
							subgroup: {
								type: 'checkbox',
								list: [
									{
										label: conv({ hans: '删除已删子页面的讨论页', hant: '刪除已刪子頁面的討論頁' }),
										name: 'delete_subpage_talks',
										value: 'delete_subpage_talks'
									},
									{
										label: conv({ hans: '删除到已删子页面的重定向页', hant: '刪除到已刪子頁面的重新導向頁面' }),
										name: 'delete_subpage_redirects',
										value: 'delete_subpage_redirects'
									},
									{
										label: conv({ hans: '取消所有已删页面的链入（仅处理条目及Portal命名空间）', hant: '取消所有已刪頁面的連入（僅處理條目及Portal命名空間）' }),
										name: 'unlink_subpages',
										value: 'unlink_subpages'
									}
								]
							}
						}
					]
				}
			},
			{
				label: conv({ hans: '取消链入（仅处理条目及Portal命名空间）', hant: '取消連入（僅處理條目及Portal命名空間）' }),
				name: 'unlink_page',
				value: 'unlink',
				checked: false
			},
			{
				label: conv({ hans: '移除文件使用（所有命名空间）', hant: '移除檔案使用（所有命名空間）' }),
				name: 'unlink_file',
				value: 'unlink_file',
				checked: true
			}
		]
	});
	form.append({
		type: 'select',
		name: 'common_reason',
		label: '常用理由：',
		style: 'width: 85%;',
		list: Twinkle.batchdelete.deletereasonlist,
		event: Twinkle.batchdelete.callback.change_common_reason
	});
	form.append({
		name: 'reason',
		type: 'input',
		label: '理由：',
		size: 75
	});
	var query = {
		action: 'query',
		prop: 'revisions|info|imageinfo',
		inprop: 'protection',
		rvprop: 'size|user'
	};

	// On categories
	if (mw.config.get('wgNamespaceNumber') === 14) {
		query.generator = 'categorymembers';
		query.gcmtitle = mw.config.get('wgPageName');
		query.gcmlimit = Twinkle.getPref('batchMax');

	// On Special:PrefixIndex
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'Prefixindex') {

		query.generator = 'allpages';
		query.gaplimit = Twinkle.getPref('batchMax');
		if (mw.util.getParamValue('prefix')) {
			query.gapnamespace = mw.util.getParamValue('namespace');
			query.gapprefix = mw.util.getParamValue('prefix');
		} else {
			var pathSplit = decodeURIComponent(location.pathname).split('/');
			if (pathSplit.length < 3 || pathSplit[2] !== 'Special:前缀索引') {
				return;
			}
			var titleSplit = pathSplit[3].split(':');
			query.gapnamespace = mw.config.get('wgNamespaceIds')[titleSplit[0].toLowerCase()];
			if (titleSplit.length < 2 || typeof query.gapnamespace === 'undefined') {
				query.gapnamespace = 0;  // article namespace
				query.gapprefix = pathSplit.splice(3).join('/');
			} else {
				pathSplit = pathSplit.splice(4);
				pathSplit.splice(0, 0, titleSplit.splice(1).join(':'));
				query.gapprefix = pathSplit.join('/');
			}
		}

	// On Special:BrokenRedirects
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'BrokenRedirects') {
		query.generator = 'querypage';
		query.gqppage = 'BrokenRedirects';
		query.gqplimit = Twinkle.getPref('batchMax');

	// On normal pages
	} else {
		query.generator = 'links';
		query.titles = mw.config.get('wgPageName');
		query.gpllimit = Twinkle.getPref('batchMax');
	}

	var statusdiv = document.createElement('div');
	statusdiv.style.padding = '15px';  // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.Status.init(statusdiv);
	Window.display();

	Twinkle.batchdelete.pages = {};

	var statelem = new Morebits.Status(conv({ hans: '抓取页面列表', hant: '抓取頁面列表' }));
	var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '加载中…', hant: '載入中…' }), query, function (apiobj) {
		var xml = apiobj.responseXML;
		var $pages = $(xml).find('page').filter(':not([missing])');  // :not([imagerepository="shared"])
		$pages.each(function(index, page) {
			var $page = $(page);
			var ns = $page.attr('ns');
			var title = $page.attr('title');
			var isRedir = $page.attr('redirect') === '';
			var $editprot = $page.find('pr[type="edit"][level="sysop"]');
			var isProtected = $editprot.length > 0;
			var size = $page.find('rev').attr('size');

			var metadata = [];
			if (isRedir) {
				metadata.push(conv({ hans: '重定向', hant: '重新導向' }));
			}
			if (isProtected) {
				metadata.push(conv({ hans: '全保护，', hant: '全保護，' }) +
					($editprot.attr('expiry') === 'infinity' ? conv({ hans: '无限期', hant: '無限期' }) : new Morebits.Date($editprot.attr('expiry')).calendar('utc') + ' (UTC)') + conv({ hans: '过期', hant: '過期' }));
			}
			if (ns === '6') {  // mimic what delimages used to show for files
				metadata.push(conv({ hans: '上传者：', hant: '上傳者：' }) + $page.find('ii').attr('user'));
				metadata.push(conv({ hans: '最后编辑：', hant: '最後編輯：' }) + $page.find('rev').attr('user'));
			} else {
				metadata.push(mw.language.convertNumber(size) + conv({ hans: '字节', hant: '位元組' }));
			}
			Twinkle.batchdelete.pages[title] = {
				label: title + (metadata.length ? '（' + metadata.join('，') + '）' : ''),
				value: title,
				checked: true,
				style: isProtected ? 'color:red' : ''
			};
		});

		var form = apiobj.params.form;
		form.append({ type: 'header', label: conv({ hans: '待删除页面', hant: '待刪除頁面' }) });
		form.append({
			type: 'button',
			label: conv({ hans: '全选', hant: '全選' }),
			event: function dBatchSelectAll() {
				$(result).find('input[name=pages]:not(:checked)').each(function(_, e) {
					e.click(); // check it, and invoke click event so that subgroup can be shown
				});

				// Check any unchecked subpages too
				$('input[name="pages.subpages"]').prop('checked', true);
			}
		});
		form.append({
			type: 'button',
			label: conv({ hans: '全不选', hant: '全不選' }),
			event: function dBatchDeselectAll() {
				$(result).find('input[name=pages]:checked').each(function(_, e) {
					e.click(); // uncheck it, and invoke click event so that subgroup can be hidden
				});
			}
		});
		form.append({
			type: 'checkbox',
			name: 'pages',
			id: 'tw-dbatch-pages',
			shiftClickSupport: true,
			list: $.map(Twinkle.batchdelete.pages, function (e) {
				return e;
			})
		});
		form.append({ type: 'submit' });

		var result = form.render();
		apiobj.params.Window.setContent(result);

		Morebits.QuickForm.getElements(result, 'pages').forEach(generateArrowLinks);

	}, statelem);

	wikipedia_api.params = { form: form, Window: Window };
	wikipedia_api.post();
};

function generateArrowLinks (checkbox) {
	var link = Morebits.htmlNode('a', ' >');
	link.setAttribute('class', 'tw-dbatch-page-link');
	link.setAttribute('href', mw.util.getUrl(checkbox.value));
	link.setAttribute('target', '_blank');
	checkbox.nextElementSibling.append(link);
}

Twinkle.batchdelete.generateNewPageList = function(form) {

	// Update the list of checked pages in Twinkle.batchdelete.pages object
	var elements = form.elements.pages;
	if (elements instanceof NodeList) { // if there are multiple pages
		for (var i = 0; i < elements.length; ++i) {
			Twinkle.batchdelete.pages[elements[i].value].checked = elements[i].checked;
		}
	} else if (elements instanceof HTMLInputElement) { // if there is just one page
		Twinkle.batchdelete.pages[elements.value].checked = elements.checked;
	}

	return new Morebits.QuickForm.Element({
		type: 'checkbox',
		name: 'pages',
		id: 'tw-dbatch-pages',
		shiftClickSupport: true,
		list: $.map(Twinkle.batchdelete.pages, function (e) {
			return e;
		})
	}).render();
};

Twinkle.batchdelete.deletereasonlist = [
	{
		label: conv({ hans: '请选择', hant: '請選擇' }),
		value: ''
	},
	{
		label: conv({ hans: 'G10: 原作者清空页面或提出删除，且实际贡献者只有一人', hant: 'G10: 原作者清空頁面或提出刪除，且實際貢獻者只有一人' }),
		value: conv({ hans: '[[Wikipedia:CSD#G10|G10]]: 原作者清空页面或提出删除，且实际贡献者只有一人', hant: '[[Wikipedia:CSD#G10|G10]]: 原作者清空頁面或提出刪除，且實際貢獻者只有一人' })
	},
	{
		label: conv({ hans: 'G15: 孤立页面，比如没有主页面的讨论页、指向空页面的重定向等', hant: 'G15: 孤立頁面，比如沒有主頁面的討論頁、指向空頁面的重新導向等' }),
		value: conv({ hans: '[[Wikipedia:CSD#G15|G15]]: 孤立页面', hant: '[[Wikipedia:CSD#G15|G15]]: 孤立頁面' })
	},
	{
		label: conv({ hans: 'F6: 没有被条目使用的非自由著作权文件', hant: 'F6: 沒有被條目使用的非自由著作權檔案' }),
		value: conv({ hans: '[[Wikipedia:CSD#F6|F6]]: 没有被条目使用的[[Wikipedia:合理使用|非自由著作权]]文件', hant: '[[Wikipedia:CSD#F6|F6]]: 沒有被條目使用的[[Wikipedia:合理使用|非自由著作權]]檔案' })
	},
	{
		label: conv({ hans: 'F7: 与维基共享资源文件重复的文件', hant: 'F7: 與維基共享資源檔案重複的檔案' }),
		value: conv({ hans: '[[Wikipedia:CSD#F7|F7]]: 与[[维基共享资源]]文件重复的文件', hant: '[[Wikipedia:CSD#F7|F7]]: 與[[維基共享資源]]檔案重複的檔案' })
	},
	{
		label: conv({ hans: 'F10: 可被替代的非自由著作权文件', hant: 'F10: 可被替代的非自由版權檔案' }),
		value: conv({ hans: '[[Wikipedia:CSD#F10|F10]]: 可被替代的非自由著作权文件', hant: '[[Wikipedia:CSD#F10|F10]]: 可被替代的非自由版權檔案' })
	},
	{
		label: conv({ hans: 'O1: 用户请求删除自己的用户页或其子页面', hant: 'O1: 使用者請求刪除自己的使用者頁面或其子頁面' }),
		value: conv({ hans: '[[Wikipedia:CSD#O1|O1]]: 用户请求删除自己的[[Help:用户页|用户页]]或其子页面。', hant: '[[Wikipedia:CSD#O1|O1]]: 使用者請求刪除自己的[[Help:用户页|使用者頁面]]或其子頁面。' })
	},
	{
		label: conv({ hans: 'O4: 空的分类（没有条目也没有子分类）', hant: 'O4: 空的分類（沒有條目也沒有子分類）' }),
		value: conv({ hans: '[[Wikipedia:CSD#O4|O4]]: 空的分类（没有条目也没有子分类）。', hant: '[[Wikipedia:CSD#O4|O4]]: 空的分類（沒有條目也沒有子分類）。' })
	},
	{
		label: conv({ hans: 'O7: 废弃草稿', hant: 'O7: 廢棄草稿' }),
		value: conv({ hans: '[[Wikipedia:CSD#O7|O7]]: 废弃草稿。', hant: '[[Wikipedia:CSD#O7|O7]]: 廢棄草稿。' })
	},
	{
		label: conv({ hans: 'R2: 跨命名空间的重定向', hant: 'R2: 跨命名空間的重新導向' }),
		value: conv({ hans: '[[WP:CSD#R2|R2]]: 跨[[H:NS|命名空间]]的[[WP:R|重定向]]', hant: '[[WP:CSD#R2|R2]]: 跨[[H:NS|命名空間]]的[[WP:R|重新導向]]' })
	}
];

Twinkle.batchdelete.callback.change_common_reason = function twinklebatchdeleteCallbackChangeCustomReason(e) {
	if (e.target.form.reason.value !== '') {
		e.target.form.reason.value = Morebits.string.appendPunctuation(e.target.form.reason.value);
	}
	e.target.form.reason.value += e.target.value;
	e.target.value = '';
};

Twinkle.batchdelete.callback.toggleSubpages = function twDbatchToggleSubpages(e) {

	var form = e.target.form;
	var newPageList;

	if (e.target.checked) {

		form.delete_subpage_redirects.checked = form.delete_redirects.checked;
		form.delete_subpage_talks.checked = form.delete_talk.checked;
		form.unlink_subpages.checked = form.unlink_page.checked;

		// If lists of subpages were already loaded once, they are
		// available without use of any API calls
		if (subpagesLoaded) {

			$.each(Twinkle.batchdelete.pages, function(i, el) {
				// Get back the subgroup from subgroup_, where we saved it
				if (el.subgroup === null && el.subgroup_) {
					el.subgroup = el.subgroup_;
				}
			});

			newPageList = Twinkle.batchdelete.generateNewPageList(form);
			$('#tw-dbatch-pages').replaceWith(newPageList);

			Morebits.QuickForm.getElements(newPageList, 'pages').forEach(generateArrowLinks);
			Morebits.QuickForm.getElements(newPageList, 'pages.subpages').forEach(generateArrowLinks);

			return;
		}

		// Proceed with API calls to get list of subpages
		var loadingText = '<strong id="dbatch-subpage-loading">' + conv({ hans: '加载中...', hant: '載入中...' }) + '</strong>';
		$(e.target).after(loadingText);

		var pages = $(form.pages).map(function(i, el) {
			return el.value;
		}).get();

		var subpageLister = new Morebits.BatchOperation();
		subpageLister.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		subpageLister.setPageList(pages);
		subpageLister.run(function worker (pageName) {
			var pageTitle = mw.Title.newFromText(pageName);

			// No need to look for subpages in main/file/mediawiki space
			if ([0, 6, 8].indexOf(pageTitle.namespace) > -1) {
				subpageLister.workerSuccess();
				return;
			}

			var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '正在获取 ', hant: '正在取得 ' }) + pageName + conv({ hans: ' 的子页面', hant: ' 的子頁面' }), {
				action: 'query',
				prop: 'revisions|info|imageinfo',
				generator: 'allpages',
				rvprop: 'size',
				inprop: 'protection',
				gapprefix: pageTitle.title + '/',
				gapnamespace: pageTitle.namespace,
				gaplimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				pageNameFull: pageName // Not used by API, but added for access in onSuccess()
			}, function onSuccess(apiobj) {
				var xml = apiobj.responseXML;
				var $pages = $(xml).find('page');
				var subpageList = [];
				$pages.each(function(index, page) {
					var $page = $(page);
					var ns = $page.attr('ns');
					var title = $page.attr('title');
					var isRedir = $page.attr('redirect') === '';
					var $editprot = $page.find('pr[type="edit"][level="sysop"]');

					var isProtected = $editprot.length > 0;
					var size = $page.find('rev').attr('size');

					var metadata = [];
					if (isRedir) {
						metadata.push('redirect');
					}
					if (isProtected) {
						metadata.push(conv({ hans: '全保护，', hant: '全保護，' }) +
							($editprot.attr('expiry') === 'infinity' ? conv({ hans: '无限期', hant: '無限期' }) : new Morebits.Date($editprot.attr('expiry')).calendar('utc') + ' (UTC)') + conv({ hans: '过期', hant: '過期' }));
					}
					if (ns === '6') {  // mimic what delimages used to show for files
						metadata.push(conv({ hans: '上传者：', hant: '上傳者：' }) + $page.find('ii').attr('user'));
						metadata.push(conv({ hans: '最后编辑：', hant: '最後編輯：' }) + $page.find('rev').attr('user'));
					} else {
						metadata.push(mw.language.convertNumber(size) + conv({ hans: '字节', hant: '位元組' }));
					}
					subpageList.push({
						label: title + (metadata.length ? ' (' + metadata.join('; ') + ')' : ''),
						value: title,
						checked: true,
						style: isProtected ? 'color:red' : ''
					});
				});
				if (subpageList.length) {
					var pageName = apiobj.query.pageNameFull;
					Twinkle.batchdelete.pages[pageName].subgroup = {
						type: 'checkbox',
						name: 'subpages',
						className: 'dbatch-subpages',
						shiftClickSupport: true,
						list: subpageList
					};
				}
				subpageLister.workerSuccess();
			}, null /* statusElement */, function onFailure() {
				subpageLister.workerFailure();
			});
			wikipedia_api.post();

		}, function postFinish () {
			// List 'em on the interface

			newPageList = Twinkle.batchdelete.generateNewPageList(form);
			$('#tw-dbatch-pages').replaceWith(newPageList);

			Morebits.QuickForm.getElements(newPageList, 'pages').forEach(generateArrowLinks);
			Morebits.QuickForm.getElements(newPageList, 'pages.subpages').forEach(generateArrowLinks);

			subpagesLoaded = true;

			// Remove "Loading... " text
			$('#dbatch-subpage-loading').remove();

		});

	} else if (!e.target.checked) {

		$.each(Twinkle.batchdelete.pages, function(i, el) {
			if (el.subgroup) {
				// Remove subgroup after saving its contents in subgroup_
				// so that it can be retrieved easily if user decides to
				// delete the subpages again
				el.subgroup_ = el.subgroup;
				el.subgroup = null;
			}
		});

		newPageList = Twinkle.batchdelete.generateNewPageList(form);
		$('#tw-dbatch-pages').replaceWith(newPageList);

		Morebits.QuickForm.getElements(newPageList, 'pages').forEach(generateArrowLinks);
	}
};

Twinkle.batchdelete.callback.evaluate = function twinklebatchdeleteCallbackEvaluate(event) {
	Morebits.wiki.actionCompleted.notice = conv({ hans: '批量删除已完成', hant: '批次刪除已完成' });

	var form = event.target;

	var numProtected = $(Morebits.QuickForm.getElements(form, 'pages')).filter(function(index, element) {
		return element.checked && element.nextElementSibling.style.color === 'red';
	}).length;
	if (numProtected > 0 && !confirm(conv({ hans: '您正要删除 ', hant: '您正要刪除 ' }) + mw.language.convertNumber(numProtected) + conv({ hans: ' 个全保护页面，您确定吗？', hant: ' 個全保護頁面，您確定嗎？' }))) {
		return;
	}

	var pages = form.getChecked('pages');
	var subpages = form.getChecked('pages.subpages');
	var reason = form.reason.value;
	var delete_page = form.delete_page.checked;
	var delete_talk, delete_redirects, delete_subpages;
	var delete_subpage_redirects, delete_subpage_talks, unlink_subpages;
	if (delete_page) {
		delete_talk = form.delete_talk.checked;
		delete_redirects = form.delete_redirects.checked;
		delete_subpages = form.delete_subpages.checked;
		if (delete_subpages) {
			delete_subpage_redirects = form.delete_subpage_redirects.checked;
			delete_subpage_talks = form.delete_subpage_talks.checked;
			unlink_subpages = form.unlink_subpages.checked;
		}
	}
	var unlink_page = form.unlink_page.checked;
	var unlink_file = form.unlink_file.checked;
	if (!reason) {
		alert(conv({ hans: '您需要给出一个理由', hant: '您需要給出一個理由' }));
		return;
	}
	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);
	if (!pages) {
		Morebits.Status.error(conv({ hans: '错误', hant: '錯誤' }), conv({ hans: '没有要删除的内容，中止', hant: '沒有要刪除的內容，中止' }));
		return;
	}

	var pageDeleter = new Morebits.BatchOperation(delete_page ? conv({ hans: '正在删除页面', hant: '正在刪除頁面' }) : conv({ hans: '正在启动要求的任务', hant: '正在啟動要求的任務' }));
	pageDeleter.setOption('chunkSize', Twinkle.getPref('batchChunks'));
	// we only need the initial status lines if we're deleting the pages in the pages array
	pageDeleter.setOption('preserveIndividualStatusLines', delete_page);
	pageDeleter.setPageList(pages);
	pageDeleter.run(function worker(pageName) {
		var params = {
			page: pageName,
			delete_page: delete_page,
			delete_talk: delete_talk,
			delete_redirects: delete_redirects,
			unlink_page: unlink_page,
			unlink_file: unlink_file && new RegExp('^' + Morebits.namespaceRegex(6) + ':', 'i').test(pageName),
			reason: reason,
			pageDeleter: pageDeleter
		};

		var wikipedia_page = new Morebits.wiki.Page(pageName, conv({ hans: '正在删除页面 ', hant: '正在刪除頁面 ' }) + pageName);
		wikipedia_page.setCallbackParameters(params);
		if (delete_page) {
			wikipedia_page.setEditSummary(reason + ' (批量)');
			wikipedia_page.setChangeTags(Twinkle.changeTags);
			wikipedia_page.suppressProtectWarning();
			wikipedia_page.deletePage(Twinkle.batchdelete.callbacks.doExtras, pageDeleter.workerFailure);
		} else {
			Twinkle.batchdelete.callbacks.doExtras(wikipedia_page);
		}
	}, function postFinish() {
		if (delete_subpages) {
			var subpageDeleter = new Morebits.BatchOperation(conv({ hans: '正在删除子页面', hant: '正在刪除子頁面' }));
			subpageDeleter.setOption('chunkSize', Twinkle.getPref('batchChunks'));
			subpageDeleter.setOption('preserveIndividualStatusLines', true);
			subpageDeleter.setPageList(subpages);
			subpageDeleter.run(function(pageName) {
				var params = {
					page: pageName,
					delete_page: true,
					delete_talk: delete_subpage_talks,
					delete_redirects: delete_subpage_redirects,
					unlink_page: unlink_subpages,
					unlink_file: false,
					reason: reason,
					pageDeleter: subpageDeleter
				};

				var wikipedia_page = new Morebits.wiki.Page(pageName, conv({ hans: '正在删除子页面 ', hant: '正在刪除子頁面 ' }) + pageName);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.setEditSummary(reason + ' (批量)');
				wikipedia_page.setChangeTags(Twinkle.changeTags);
				wikipedia_page.suppressProtectWarning();
				wikipedia_page.deletePage(Twinkle.batchdelete.callbacks.doExtras, pageDeleter.workerFailure);
			});
		}
	});
};

Twinkle.batchdelete.callbacks = {
	// this stupid parameter name is a temporary thing until I implement an overhaul
	// of Morebits.wiki.* callback parameters
	doExtras: function(thingWithParameters) {
		var params = thingWithParameters.parent ? thingWithParameters.parent.getCallbackParameters() :
			thingWithParameters.getCallbackParameters();
		// the initial batch operation's job is to delete the page, and that has
		// succeeded by now
		params.pageDeleter.workerSuccess(thingWithParameters);

		var query, wikipedia_api;

		if (params.unlink_page) {
			Twinkle.batchdelete.unlinkCache = {};
			query = {
				action: 'query',
				list: 'backlinks',
				blfilterredir: 'nonredirects',
				blnamespace: [0, 100], // main space and portal space only
				bltitle: params.page,
				bllimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.Api(conv({ hans: '正在获取链入', hant: '正在取得連入' }), query, Twinkle.batchdelete.callbacks.unlinkBacklinksMain);
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if (params.unlink_file) {
			query = {
				action: 'query',
				list: 'imageusage',
				iutitle: params.page,
				iulimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.Api(conv({ hans: '正在获取文件链入', hant: '正在取得檔案連入' }), query, Twinkle.batchdelete.callbacks.unlinkImageInstancesMain);
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if (params.delete_page) {
			if (params.delete_redirects) {
				query = {
					action: 'query',
					titles: params.page,
					prop: 'redirects',
					rdlimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
				};
				wikipedia_api = new Morebits.wiki.Api(conv({ hans: '正在获取重定向', hant: '正在取得重新導向' }), query, Twinkle.batchdelete.callbacks.deleteRedirectsMain);
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
			if (params.delete_talk) {
				var pageTitle = mw.Title.newFromText(params.page);
				if (pageTitle && pageTitle.namespace % 2 === 0 && pageTitle.namespace !== 2) {
					pageTitle.namespace++;  // now pageTitle is the talk page title!
					query = {
						action: 'query',
						titles: pageTitle.toText()
					};
					wikipedia_api = new Morebits.wiki.Api(conv({ hans: '正在检查讨论页面是否存在', hant: '正在檢查討論頁面是否存在' }), query, Twinkle.batchdelete.callbacks.deleteTalk);
					wikipedia_api.params = params;
					wikipedia_api.params.talkPage = pageTitle.toText();
					wikipedia_api.post();
				}
			}
		}
	},
	deleteRedirectsMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('rd').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var redirectDeleter = new Morebits.BatchOperation(conv({ hans: '正在删除到 ', hant: '正在刪除到 ' }) + apiobj.params.page + conv({ hans: ' 的重定向', hant: ' 的重新導向' }));
		redirectDeleter.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		redirectDeleter.setPageList(pages);
		redirectDeleter.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.Page(pageName, conv({ hans: '正在删除 ', hant: '正在刪除 ' }) + pageName);
			wikipedia_page.setEditSummary('[[WP:CSD#G15|G15]]: ' + conv({ hans: '指向已删页面“', hant: '指向已刪頁面「' }) + apiobj.params.page + conv({ hans: '”的重定向', hant: '」的重新導向' }));
			wikipedia_page.setChangeTags(Twinkle.changeTags);
			wikipedia_page.deletePage(redirectDeleter.workerSuccess, redirectDeleter.workerFailure);
		});
	},
	deleteTalk: function(apiobj) {
		var xml = apiobj.responseXML;
		var exists = $(xml).find('page:not([missing])').length > 0;

		if (!exists) {
			// no talk page; forget about it
			return;
		}

		var page = new Morebits.wiki.Page(apiobj.params.talkPage, conv({ hans: '正在删除页面 ', hant: '正在刪除頁面 ' }) + apiobj.params.page + conv({ hans: ' 的讨论页', hant: ' 的討論頁' }));
		page.setEditSummary('[[WP:CSD#G15|G15]]: ' + conv({ hans: '已删页面“', hant: '已刪頁面「' }) + apiobj.params.page + conv({ hans: '”的[[Wikipedia:讨论页|讨论页]]', hant: '」的[[Wikipedia:討論頁|討論頁]]' }));
		page.setChangeTags(Twinkle.changeTags);
		page.deletePage();
	},
	unlinkBacklinksMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('bl').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.BatchOperation('正在取消到 ' + apiobj.params.page + conv({ hans: ' 的链入', hant: ' 的連入' }));
		unlinker.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.Page(pageName, '正在取消 ' + pageName + conv({ hans: ' 上的链入', hant: ' 上的連入' }));
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkBacklinks);
		});
	},
	unlinkBacklinks: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		if (!pageobj.exists()) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var text;
		if (params.title in Twinkle.batchdelete.unlinkCache) {
			text = Twinkle.batchdelete.unlinkCache[params.title];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.Page(text);
		text = wikiPage.removeLink(params.page).getText();

		Twinkle.batchdelete.unlinkCache[params.title] = text;
		if (text === old_text) {
			// Nothing to do, return
			params.unlinker.workerSuccess(pageobj);
			return;
		}
		pageobj.setEditSummary(conv({ hans: '取消到已删页面', hant: '取消到已刪頁面' }) + params.page + conv({ hans: '的链入', hant: '的連入' }));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	},
	unlinkImageInstancesMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('iu').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.BatchOperation('正在取消到 ' + apiobj.params.page + conv({ hans: ' 的链入', hant: ' 的連入' }));
		unlinker.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.Page(pageName, '取消 ' + pageName + conv({ hans: ' 的文件使用', hant: ' 的檔案使用' }));
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkImageInstances);
		});
	},
	unlinkImageInstances: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		if (!pageobj.exists()) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var image = params.page.replace(new RegExp('^' + Morebits.namespaceRegex(6) + ':'), '');
		var text;
		if (params.title in Twinkle.batchdelete.unlinkCache) {
			text = Twinkle.batchdelete.unlinkCache[params.title];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.Page(text);
		text = wikiPage.commentOutImage(image, conv({ hans: '因文件已删，故注解', hant: '因檔案已刪，故註解' })).getText();

		Twinkle.batchdelete.unlinkCache[params.title] = text;
		if (text === old_text) {
			pageobj.getStatusElement().error('在 ' + pageobj.getPageName() + ' 上取消 ' + image + conv({ hans: ' 的文件使用失败', hant: ' 的檔案使用失敗' }));
			params.unlinker.workerFailure(pageobj);
			return;
		}
		pageobj.setEditSummary(conv({ hans: '取消使用已被删除文件', hant: '取消使用已被刪除檔案' }) + image + conv({ hans: '，因为：', hant: '，因為：' }) + params.reason);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	}
};

Twinkle.addInitCallback(Twinkle.batchdelete, 'batchdelete');
})();


// </nowiki>
