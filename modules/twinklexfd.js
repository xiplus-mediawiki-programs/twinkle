// <nowiki>


(function() {


/*
 ****************************************
 *** twinklexfd.js: XFD module
 ****************************************
 * Mode of invocation:     Tab ("XFD")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * Flow pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageContentModel') === 'flow-board' || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.isPageRedirect())))) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.xfd.callback, conv({ hans: '提删', hant: '提刪' }), 'tw-xfd', conv({ hans: '提交删除讨论', hant: '提交刪除討論' }));
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.Status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.Status.printUserText(Twinkle.xfd.currentRationale, conv({ hans: '您的理由已在下方提供，如果您想重新提交，请将其复制到一新窗口中：', hant: '您的理由已在下方提供，如果您想重新提交，請將其複製到一新視窗中：' }));
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.SimpleWindow(600, 350);
	Window.setTitle(conv({ hans: '提交存废讨论', hant: '提交存廢討論' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '关于存废讨论', hant: '關於存廢討論' }), 'WP:XFD');
	Window.addFooterLink(conv({ hans: '提删设置', hant: '提刪設定' }), 'WP:TW/PREF#xfd');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#xfd');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.xfd.callback.evaluate);
	var categories = form.append({
		type: 'select',
		name: 'category',
		label: conv({ hans: '提交类型：', hant: '提交類別：' }),
		event: Twinkle.xfd.callback.change_category
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '页面存废讨论', hant: '頁面存廢討論' }),
		selected: mw.config.get('wgNamespaceNumber') === 0,  // Main namespace
		value: 'afd'
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '文件存废讨论', hant: '檔案存廢討論' }),
		selected: mw.config.get('wgNamespaceNumber') === 6,  // File namespace
		value: 'ffd'
	});
	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '如可能，通知页面创建者', hant: '如可能，通知頁面建立者' }),
				value: 'notify',
				name: 'notify',
				tooltip: conv({ hans: '在页面创建者讨论页上放置一通知模板。', hant: '在頁面建立者討論頁上放置一通知模板。' }),
				checked: true
			}
		]
	}
	);
	form.append({
		type: 'field',
		label: '工作区',
		name: 'work_area'
	});

	var previewLink = document.createElement('a');
	$(previewLink).on('click', () => {
		Twinkle.xfd.callbacks.preview(result); // |result| is defined below
	});
	previewLink.textContent = conv({ hans: '预览', hant: '預覽' });
	previewLink.style.cursor = 'pointer';
	form.append({ type: 'div', id: 'xfdpreview', label: [ previewLink ] });
	form.append({ type: 'div', id: 'twinklexfd-previewbox', style: 'display: none' });


	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklexfd-previewbox').last()[0]);

	if (mw.config.get('wgPageContentModel') !== 'wikitext') {
		form = new Morebits.QuickForm(Twinkle.xfd.callback.evaluate);
		form.append({
			type: 'div',
			label: [
				conv({ hans: 'Twinkle不支持在页面内容模型为', hant: 'Twinkle不支援在頁面內容模型為' }),
				mw.config.get('wgPageContentModel'),
				conv({ hans: '的页面上挂上存废讨论模板，请参见', hant: '的頁面上掛上存廢討論模板，請參見' }),
				$('<a>').attr({ target: '_blank', href: mw.util.getUrl('WP:SPECIALSD') }).text(conv({ hans: '手动放置模板时的注意事项', hant: '手動放置模板時的注意事項' }))[0],
				'。'
			]
		});
		Window.setContent(form.render());
		Window.display();
		return;
	}

	// We must init the controls
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.category.dispatchEvent(evt);
};

Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
	var value = e.target.value;
	var form = e.target.form;
	var old_area = Morebits.QuickForm.getElements(e.target.form, 'work_area')[0];
	var work_area = null;

	var oldreasontextbox = form.getElementsByTagName('textarea')[0];
	var oldreason = oldreasontextbox ? oldreasontextbox.value : '';

	var appendReasonBox = function twinklexfdAppendReasonBox(xfd_cat) {
		switch (xfd_cat) {
			case 'fwdcsd':
				oldreason = decodeURIComponent($('#delete-reason').text()).replace(/\+/g, ' ');
				break;
			case 'fame':
				oldreason = Twinkle.getPref('afdFameDefaultReason');
				break;
			case 'substub':
				oldreason = Twinkle.getPref('afdSubstubDefaultReason');
				break;
			default:
				break;
		}
		work_area.append({
			type: 'textarea',
			name: 'xfdreason',
			label: conv({ hans: '提删理由：', hant: '提刪理由：' }),
			value: oldreason,
			tooltip: conv({ hans: '您可以使用维基格式，Twinkle将自动为您加入签名。如果您使用批量提删功能，存废讨论页只会使用第一次提交的理由，但之后您仍需提供以用于删除通告模板的参数。', hant: '您可以使用維基格式，Twinkle將自動為您加入簽名。如果您使用批次提刪功能，存廢討論頁只會使用第一次提交的理由，但之後您仍需提供以用於刪除通告模板的參數。' }),
			placeholder: conv({ hans: '此值亦显示于页面的删除通告模板内，故务必提供此值，避免使用“同上”等用语。', hant: '此值亦顯示於頁面的刪除通告模板內，故務必提供此值，避免使用「同上」等用語。' })
		});
	};

	form.previewer.closePreview();
	switch (value) {
		case 'afd':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '页面存废讨论', hant: '頁面存廢討論' }),
				name: 'work_area'
			});
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: '使用&lt;noinclude&gt;包裹模板',
						value: 'noinclude',
						name: 'noinclude',
						checked: mw.config.get('wgNamespaceNumber') === 10, // Template namespace
						tooltip: conv({ hans: '使其不会在被包含时出现。', hant: '使其不會在被包含時出現。' })
					}
				]
			});
			var afd_category = work_area.append({
				type: 'select',
				name: 'xfdcat',
				label: conv({ hans: '选择提删类型：', hant: '選擇提刪類別：' }),
				event: Twinkle.xfd.callback.change_afd_category
			});

			var afd_cat;
			if (Twinkle.getPref('xfdContinueBatch')) {
				afd_cat = Twinkle.xfd.getBatchToContinue() || 'delete';
			} else if (Twinkle.getPref('afdDefaultCategory') === 'same') {
				if (localStorage.Twinkle_afdCategory === undefined) {
					localStorage.Twinkle_afdCategory = 'delete';
				} else {
					afd_cat = localStorage.Twinkle_afdCategory;
				}
			}

			afd_category.append({ type: 'option', label: conv({ hans: '删除', hant: '刪除' }), value: 'delete', selected: afd_cat === 'delete' });
			afd_category.append({ type: 'option', label: conv({ hans: '合并', hant: '合併' }), value: 'merge', selected: afd_cat === 'merge' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基词典', hant: '移動到維基詞典' }), value: 'vmd', selected: afd_cat === 'vmd' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基文库', hant: '移動到維基文庫' }), value: 'vms', selected: afd_cat === 'vms' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基教科书', hant: '移動到維基教科書' }), value: 'vmb', selected: afd_cat === 'vmb' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基语录', hant: '移動到維基語錄' }), value: 'vmq', selected: afd_cat === 'vmq' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基导游', hant: '移動到維基導遊' }), value: 'vmvoy', selected: afd_cat === 'vmvoy' });
			afd_category.append({ type: 'option', label: conv({ hans: '移动到维基学院', hant: '移動到維基學院' }), value: 'vmv', selected: afd_cat === 'vmv' });
			if (Twinkle.getPref('FwdCsdToXfd')) {
				afd_category.append({ type: 'option', label: conv({ hans: '转交自快速删除候选', hant: '轉交自快速刪除候選' }), value: 'fwdcsd', selected: afd_cat === 'fwdcsd' });
			}
			afd_category.append({ type: 'option', label: conv({ hans: '批量收录标准提删', hant: '批次收錄標準提刪' }), value: 'fame', selected: afd_cat === 'fame' });
			afd_category.append({ type: 'option', label: conv({ hans: '批量小小作品提删', hant: '批次小小作品提刪' }), value: 'substub', selected: afd_cat === 'substub' });
			afd_category.append({ type: 'option', label: conv({ hans: '批量其他提删', hant: '批次其他提刪' }), value: 'batch', selected: afd_cat === 'batch' });


			work_area.append({
				type: 'input',
				name: 'mergeinto',
				label: conv({ hans: '合并到：', hant: '合併到：' }),
				hidden: true
			});
			appendReasonBox(afd_cat);
			work_area.append({
				type: 'textarea',
				name: 'fwdcsdreason',
				label: conv({ hans: '转交理由：', hant: '轉交理由：' }),
				tooltip: conv({ hans: '您可以使用维基格式，Twinkle将自动为您加入签名。', hant: '您可以使用維基格式，Twinkle將自動為您加入簽名。' }),
				hidden: true
			});

			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);

			var evt = document.createEvent('Event');
			evt.initEvent('change', true, true);
			form.xfdcat.dispatchEvent(evt);
			break;
		case 'ffd':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '文件存废讨论', hant: '檔案存廢討論' }),
				name: 'work_area'
			});
			appendReasonBox('ffd');
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		default:
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '未定义', hant: '未定義' }),
				name: 'work_area'
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
	}

	// Return to checked state when switching
	form.notify.checked = true;
	form.notify.disabled = false;
};

Twinkle.xfd.getAfdBatchReason = function twinklexfdGetAfdBatchReason() {
	var previousTime = parseInt(localStorage.getItem('Twinkle_afdBatchReasonTime'));
	if (previousTime && new Date() - new Date(previousTime) < 1000 * 60 * 60) {
		return localStorage.getItem('Twinkle_afdBatchReasonText') || '';
	}
	return '';
};

Twinkle.xfd.getBatchToContinue = function twinklexfdBatchToContinue() {
	var previousBatchTime = parseInt(localStorage.getItem('Twinkle_afdBatchToContinueTime'));
	if (previousBatchTime && new Date() - new Date(previousBatchTime) < 1000 * 60 * 60) {
		return localStorage.getItem('Twinkle_afdBatchToContinue') || '';
	}
	return '';
};

Twinkle.xfd.callback.change_afd_category = function twinklexfdCallbackChangeAfdCategory(e) {
	if (e.target.value === 'merge') {
		e.target.form.mergeinto.parentElement.removeAttribute('hidden');
		e.target.form.fwdcsdreason.parentElement.setAttribute('hidden', '');
		e.target.form.mergeinto.previousElementSibling.innerHTML = conv({ hans: '合并到：', hant: '合併到：' });
	} else if (e.target.value === 'fwdcsd') {
		e.target.form.mergeinto.parentElement.removeAttribute('hidden');
		e.target.form.fwdcsdreason.parentElement.removeAttribute('hidden');
		e.target.form.mergeinto.previousElementSibling.innerHTML = '提交人：';
		e.target.form.xfdreason.value = decodeURIComponent($('#delete-reason').text()).replace(/\+/g, ' ');
	} else if (e.target.value === 'fame') {
		e.target.form.mergeinto.parentElement.setAttribute('hidden', '');
		e.target.form.fwdcsdreason.parentElement.setAttribute('hidden', '');
		e.target.form.xfdreason.value = Twinkle.getPref('afdFameDefaultReason');
	} else if (e.target.value === 'substub') {
		e.target.form.mergeinto.parentElement.setAttribute('hidden', '');
		e.target.form.fwdcsdreason.parentElement.setAttribute('hidden', '');
		e.target.form.xfdreason.value = Twinkle.getPref('afdSubstubDefaultReason');
	} else if (e.target.value === 'batch') {
		e.target.form.mergeinto.parentElement.setAttribute('hidden', '');
		e.target.form.fwdcsdreason.parentElement.setAttribute('hidden', '');
		e.target.form.xfdreason.value = Twinkle.xfd.getAfdBatchReason();
	} else {
		e.target.form.mergeinto.parentElement.setAttribute('hidden', '');
		e.target.form.fwdcsdreason.parentElement.setAttribute('hidden', '');
	}
	if (Twinkle.getPref('afdDefaultCategory') === 'same') {
		localStorage.Twinkle_afdCategory = e.target.value;
	}
};

Twinkle.xfd.callbacks = {
	afd: {
		main: function(tagging_page) {
			var params = tagging_page.getCallbackParameters();

			Twinkle.xfd.callbacks.afd.taggingArticle(tagging_page);

			// Adding discussion
			var discussion_page = new Morebits.wiki.Page(params.logpage, conv({ hans: '加入讨论到当日列表', hant: '加入討論到當日列表' }));
			discussion_page.setFollowRedirect(true);
			discussion_page.setCallbackParameters(params);
			discussion_page.load(Twinkle.xfd.callbacks.afd.todaysList);

			// Notification to first contributor
			if (params.notify) {
				// Disallow warning yourself
				if (params.creator === mw.config.get('wgUserName')) {
					Morebits.Status.warn(conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）', conv({ hans: '您创建了该页，跳过通知', hant: '您建立了該頁，跳過通知' }));
					params.creator = null;
				} else {
					var talkPageName = 'User talk:' + params.creator;
					Morebits.wiki.flow.check(talkPageName, function () {
						var flowpage = new Morebits.wiki.flow(talkPageName, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）');
						flowpage.setTopic('页面[[:' + Morebits.pageNameNorm + ']]存废讨论通知');
						flowpage.setContent('{{subst:AFDNote|' + Morebits.pageNameNorm + '|flow=yes}}');
						flowpage.newTopic();
					}, function () {
						var usertalkpage = new Morebits.wiki.Page(talkPageName, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）');
						var notifytext = '\n{{subst:AFDNote|' + Morebits.pageNameNorm + '}}--~~~~';
						usertalkpage.setAppendText(notifytext);
						usertalkpage.setEditSummary('通知：页面[[' + Morebits.pageNameNorm + ']]存废讨论提名');
						usertalkpage.setChangeTags(Twinkle.changeTags);
						usertalkpage.setCreateOption('recreate');
						usertalkpage.setWatchlist(Twinkle.getPref('xfdWatchUser'));
						usertalkpage.setFollowRedirect(true, false);
						usertalkpage.append();
					});
				}
				// add this nomination to the user's userspace log, if the user has enabled it
				if (params.lognomination) {
					Twinkle.xfd.callbacks.addToLog(params, params.creator);
				}

			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			} else if (params.lognomination) {
				Twinkle.xfd.callbacks.addToLog(params, null);
			}
		},
		taggingArticle: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			var tag = '{{vfd|' + Morebits.string.formatReasonText(params.xfdreason);

			switch (params.xfdcat) {
				case 'vmd':
					tag += '|wikt';
					break;
				case 'vms':
					tag += '|s';
					break;
				case 'vmb':
					tag += '|b';
					break;
				case 'vmq':
					tag += '|q';
					break;
				case 'vmvoy':
					tag += '|voy';
					break;
				case 'vmv':
					tag += '|v';
					break;
				default:
					break;
			}
			if (Morebits.isPageRedirect()) {
				tag += '|r';
			}
			tag += '|date={{subst:#time:Y/m/d}}}}';
			if (params.noinclude) {
				tag = '<noinclude>' + tag + '</noinclude>';

				// 只有表格需要单独加回车，其他情况加回车会破坏模板。
				if (text.indexOf('{|') === 0) {
					tag += '\n';
				}
			} else {
				tag += '\n';
			}

			// Then, test if there are speedy deletion-related templates on the article.
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
			if (text !== textNoSd && confirm(conv({ hans: '在页面上找到快速删除模板，要移除吗？', hant: '在頁面上找到快速刪除模板，要移除嗎？' }))) {
				text = textNoSd;
			}

			var textNoNotMandarin = text.replace(/\{\{\s*(NotMandarin|Notchinese|非中文|非現代漢語|非现代汉语|非現代標準漢語|非现代标准汉语)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
			if (text !== textNoNotMandarin && confirm(conv({ hans: '在页面上找到非现代标准汉语模板，要移除吗？', hant: '在頁面上找到非現代標準漢語模板，要移除嗎？' }))) {
				text = textNoNotMandarin;
			}

			var textNoAfc = text.replace(/{{\s*AFC submission\s*\|\s*\|[^}]*?}}\s*/ig, '');
			if (text !== textNoAfc && confirm(conv({ hans: '在页面上找到AFC提交模板，要移除吗？', hant: '在頁面上找到AFC提交模板，要移除嗎？' }))) {
				text = textNoAfc;
			}

			// Mark the page as patrolled, if wanted
			if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
				pageobj.patrol();
			}

			// Insert tag after short description or any hatnotes
			var wikipage = new Morebits.wikitext.Page(text);
			text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();

			pageobj.setPageText(text);
			pageobj.setEditSummary(conv({ hans: '页面存废讨论：[[', hant: '頁面存廢討論：[[' }) + params.logpage + '#' + Morebits.pageNameNorm + ']]');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
			pageobj.save();
		},
		todaysList: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			var result = Twinkle.xfd.callbacks.afd.buildListText(params, text);

			pageobj.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ 新提案');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
			pageobj.setCreateOption('recreate');
			if (result.append) {
				pageobj.setAppendText(result.text);
				pageobj.append();
			} else {
				pageobj.setPageText(result.text);
				pageobj.save();
			}
			Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
		},
		lookupCreation: function (target_page) {
			target_page.getStatusElement().info('完成');

			var params = target_page.getCallbackParameters();
			params.creator = target_page.getCreator();

			// Tagging page
			var tagging_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '加入存废讨论模板到页面', hant: '加入存廢討論模板到頁面' }));
			tagging_page.setFollowRedirect(false);
			tagging_page.setCallbackParameters(params);
			tagging_page.load(Twinkle.xfd.callbacks.afd.tryTagging);
		},
		tryTagging: function (tagging_page) {
			var statelem = tagging_page.getStatusElement();
			// defaults to /doc for lua modules, which may not exist
			if (!tagging_page.exists()) {
				statelem.error(conv({ hans: '页面不存在，可能已被删除', hant: '頁面不存在，可能已被刪除' }));
				return;
			}

			var text = tagging_page.getPageText();

			var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec(text);
			if (xfd && !confirm(conv({ hans: '删除相关模板{{', hant: '刪除相關模板{{' }) + xfd[1] + conv({ hans: '}}已被置于页面中，您是否仍想继续提报？', hant: '}}已被置於頁面中，您是否仍想繼續提報？' }))) {
				statelem.error(conv({ hans: '页面已被提交至存废讨论。', hant: '頁面已被提交至存廢討論。' }));
				return;
			}

			var copyvio = /(?:\{\{\s*(copyvio)[^{}]*?\}\})/i.exec(text);
			if (copyvio) {
				statelem.error(conv({ hans: '页面中已有著作权验证模板。', hant: '頁面中已有著作權驗證模板。' }));
				return;
			}

			Twinkle.xfd.callbacks.afd.main(tagging_page);
		},
		buildListText: function(params, text) {
			var type = '';
			var to = '';

			switch (params.xfdcat) {
				case 'vmd':
				case 'vms':
				case 'vmb':
				case 'vmq':
				case 'vmvoy':
				case 'vmv':
					type = 'vm';
					to = params.xfdcat;
					break;
				case 'fwdcsd':
				case 'merge':
					to = params.mergeinto;
				/* Fall through */
				default:
					type = params.xfdcat;
					break;
			}

			var append = true;
			switch (type) {
				case 'fame':
				case 'substub':
				case 'batch':
					var commentText = '<!-- Twinkle: User:' + mw.config.get('wgUserName') + ' 的 ' + type + ' 提刪插入點，請勿變更或移除此行，除非不再於此頁提刪 -->';
					var newText = '===[[:' + Morebits.pageNameNorm + ']]===';
					if (type === 'fame') {
						newText += '\n{{Findsources|';
						if (Morebits.pageNameNorm.indexOf('=') !== -1) {
							newText += '1=';
						}
						newText += Morebits.pageNameNorm + '}}';
					}
					if (text.indexOf(commentText) !== -1) {
						text = text.replace(commentText, newText + '\n\n' + commentText);
						append = false;
					} else {
						text = '\n{{safesubst:SafeAfdHead}}\n' +
							{
								fame: '==30天后仍掛有{{tl|notability}}模板的條目==\n' +
									'<span style="font-size:smaller;">(已掛[[Template:notability|收錄標準模板]]30天)</span>',
								substub: '==到期篩選的小小作品==',
								batch: '==批量提刪=='
							}[type] + '\n' +
							newText + '\n\n' +
							commentText + '\n' +
							'----\n' +
							':{{删除}}理據：' + Morebits.string.formatReasonText(params.xfdreason) + '\n' +
							'提报以上' + {
							fame: '<u>不符合收錄標準</u>条目',
							substub: '<u>小小作品</u>',
							batch: '頁面'
						}[type] + '的維基人及時間：<br id="no-new-title" />~~~~';
					}
					break;
				default:
					text = '\n{{subst:DRItem|Type=' + type + '|DRarticles=' + Morebits.pageNameNorm + '|Reason=' + Morebits.string.formatReasonText(params.xfdreason) + (params.fwdcsdreason.trim() !== '' ? '<br>\n轉交理由：' + params.fwdcsdreason : '') + '|To=' + to + '}}~~~~';
					break;
			}

			return { text: text, append: append };
		}
	},

	ffd: {
		main: function(tagging_page) {
			var params = tagging_page.getCallbackParameters();

			Twinkle.xfd.callbacks.ffd.taggingImage(tagging_page);

			// Adding discussion
			var wikipedia_page = new Morebits.wiki.Page(params.logpage, conv({ hans: '加入讨论到当日列表', hant: '加入討論到當日列表' }));
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.ffd.todaysList);

			// Notification to first contributor
			if (params.notify) {
				// Disallow warning yourself
				if (params.creator === mw.config.get('wgUserName')) {
					Morebits.Status.warn(conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）', conv({ hans: '您创建了该页，跳过通知', hant: '您建立了該頁，跳過通知' }));
					return;
				}

				var talkPageName = 'User talk:' + params.creator;

				Morebits.wiki.flow.check(talkPageName, function () {
					var flowpage = new Morebits.wiki.flow(talkPageName, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）');
					flowpage.setTopic('文件[[:File:' + mw.config.get('wgTitle') + ']]存废讨论通知');
					flowpage.setContent('{{subst:idw|File:' + mw.config.get('wgTitle') + '|flow=yes}}');
					flowpage.newTopic();
				}, function () {
					var usertalkpage = new Morebits.wiki.Page(talkPageName, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + params.creator + '）');
					var notifytext = '\n{{subst:idw|File:' + mw.config.get('wgTitle') + '}}--~~~~';
					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary('通知：文件[[' + Morebits.pageNameNorm + ']]存废讨论提名');
					usertalkpage.setChangeTags(Twinkle.changeTags);
					usertalkpage.setCreateOption('recreate');
					usertalkpage.setWatchlist(Twinkle.getPref('xfdWatchUser'));
					usertalkpage.setFollowRedirect(true, false);
					usertalkpage.append();
				});
				// add this nomination to the user's userspace log, if the user has enabled it
				if (params.lognomination) {
					Twinkle.xfd.callbacks.addToLog(params, params.creator);
				}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			} else if (params.lognomination) {
				Twinkle.xfd.callbacks.addToLog(params, null);
			}
		},
		taggingImage: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setPageText('{{ifd|' + Morebits.string.formatReasonText(params.xfdreason) + '|date={{subst:#time:Y/m/d}}}}\n' + text);
			pageobj.setEditSummary(conv({ hans: '文件存废讨论：[[', hant: '檔案存廢討論：[[' }) + params.logpage + '#' + Morebits.pageNameNorm + ']]');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
			pageobj.setCreateOption('recreate');  // it might be possible for a file to exist without a description page
			pageobj.save();
		},
		todaysList: function(pageobj) {
			// var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setAppendText('\n{{subst:IfdItem|Filename=' + mw.config.get('wgTitle') + '|Uploader=' + params.creator + '|Reason=' + Morebits.string.formatReasonText(params.xfdreason) + '}}--~~~~');
			pageobj.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ 新提案');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
			pageobj.setCreateOption('recreate');
			pageobj.append(function() {
				Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
			});
		},
		lookupCreation: function (target_page) {
			target_page.getStatusElement().info('完成');

			var params = target_page.getCallbackParameters();
			params.creator = target_page.getCreator();

			// Tagging file
			var tagging_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '加入存废讨论模板到文件描述页', hant: '加入存廢討論模板到檔案描述頁' }));
			tagging_page.setFollowRedirect(false);
			tagging_page.setCallbackParameters(params);
			tagging_page.load(Twinkle.xfd.callbacks.ffd.tryTagging);
		},
		tryTagging: function (tagging_page) {
			var statelem = tagging_page.getStatusElement();
			if (!tagging_page.exists()) {
				statelem.error(conv({ hans: '页面不存在，可能已被删除', hant: '頁面不存在，可能已被刪除' }));
				return;
			}

			var text = tagging_page.getPageText();

			var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec(text);
			if (xfd && !confirm(conv({ hans: '删除相关模板{{', hant: '刪除相關模板{{' }) + xfd[1] + conv({ hans: '}}已被置于页面中，您是否仍想继续提报？', hant: '}}已被置於頁面中，您是否仍想繼續提報？' }))) {
				statelem.error(conv({ hans: '页面已被提交至存废讨论。', hant: '頁面已被提交至存廢討論。' }));
				return;
			}

			Twinkle.xfd.callbacks.ffd.main(tagging_page);
		}
	},
	addToLog: function(params, initialContrib) {
		var editsummary = conv({ hans: '记录对[[', hant: '記錄對[[' }) + Morebits.pageNameNorm + conv({ hans: ']]的存废讨论提名', hant: ']]的存廢討論提名' });
		var usl = new Morebits.UserspaceLogger(Twinkle.getPref('xfdLogPageName'));
		usl.initialText =
			conv({
				hans: '这是该用户使用[[WP:TW|Twinkle]]的提删模块做出的[[WP:XFD|存废讨论]]提名列表。\n\n' +
					'如果您不再想保留此日志，请在[[' + Twinkle.getPref('configPage') + '|参数设置]]中关掉，并' +
					'使用[[WP:CSD#O1|CSD O1]]提交快速删除。',
				hant: '這是該使用者使用[[WP:TW|Twinkle]]的提刪模塊做出的[[WP:XFD|存廢討論]]提名列表。\n\n' +
					'如果您不再想保留此日誌，請在[[' + Twinkle.getPref('configPage') + '|偏好設定]]中關掉，並' +
					'使用[[WP:CSD#O1|CSD O1]]提交快速刪除。'
			});
		var xfdCatName;
		switch (params.xfdcat) {
			case 'delete':
				xfdCatName = conv({ hans: '删除', hant: '刪除' });
				break;
			case 'merge':
				xfdCatName = conv({ hans: '合并到', hant: '合併到' });
				break;
			case 'vmd':
				xfdCatName = conv({ hans: '移动到维基词典', hant: '移動到維基詞典' });
				break;
			case 'vms':
				xfdCatName = conv({ hans: '移动到维基文库', hant: '移動到維基文庫' });
				break;
			case 'vmb':
				xfdCatName = conv({ hans: '移动到维基教科书', hant: '移動到維基教科書' });
				break;
			case 'vmq':
				xfdCatName = conv({ hans: '移动到维基语录', hant: '移動到維基語錄' });
				break;
			case 'vmvoy':
				xfdCatName = conv({ hans: '移动到维基导游', hant: '移動到維基導遊' });
				break;
			case 'vmv':
				xfdCatName = conv({ hans: '移动到维基学院', hant: '移動到維基學院' });
				break;
			case 'fwdcsd':
				xfdCatName = conv({ hans: '转交自快速删除候选', hant: '轉交自快速刪除候選' });
				break;
			case 'fame':
				xfdCatName = conv({ hans: '批量收录标准提删', hant: '批次收錄標準提刪' });
				break;
			case 'substub':
				xfdCatName = conv({ hans: '批量小小作品提删', hant: '批次小小作品提刪' });
				break;
			case 'batch':
				xfdCatName = conv({ hans: '批量其他提删', hant: '批次其他提刪' });
				break;
			default:
				xfdCatName = conv({ hans: '文件存废讨论', hant: '檔案存廢討論' });
				break;
		}

		// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
		var appendText = '# [[:' + Morebits.pageNameNorm + ']]';
		if (mw.config.get('wgNamespaceNumber') === 6) {
			appendText += '（[{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} ' + conv({ hans: '日志', hant: '日誌' }) + ']）';
		}
		appendText += '：' + xfdCatName;
		if (params.xfdcat === 'merge') {
			appendText += '[[:' + params.mergeinto + ']]';
		}
		appendText += '。';

		if (params.xfdreason) {
			appendText += "'''" + (params.xfdcat === 'fwdcsd' ? conv({ hans: '原删除理据', hant: '原刪除理據' }) : conv({ hans: '理据', hant: '理據' })) + "'''：" + Morebits.string.formatReasonForLog(params.xfdreason);
			appendText = Morebits.string.appendPunctuation(appendText);
		}
		if (params.fwdcsdreason) {
			appendText += "'''" + (params.xfdcat === 'fwdcsd' ? conv({ hans: '转交理据', hant: '轉交理據' }) : conv({ hans: '理据', hant: '理據' })) + "'''：" + Morebits.string.formatReasonForLog(params.fwdcsdreason);
			appendText = Morebits.string.appendPunctuation(appendText);
		}

		if (initialContrib) {
			appendText += '；通知{{user|' + initialContrib + '}}';
		}
		appendText += ' ~~~~~\n';
		usl.changeTags = Twinkle.changeTags;
		usl.log(appendText, editsummary);
	},
	preview: function(form) {
		// zh has only one individual template in use, no need to use 3 three funcs as en does
		const params = Morebits.quickForm.getInputData(form);

		const category = params.category;

		if (category === 'ffd') {
			// Fetch the uploader
			const page = new Morebits.wiki.page(mw.config.get('wgPageName'));
			page.lookupCreation(() => {
				let text = '\n{{subst:IfdItem|Filename=' + mw.config.get('wgTitle') + '|Uploader=' + page.getCreator() + '|Reason=' + Morebits.string.formatReasonText(params.xfdreason) + '}}--~~~~';
				form.previewer.beginRender(text, 'WP:TW'); // Force wikitext
			});
		} else {
			// Template:DRItem need to subst itself at log page
			let logPageTitle = 'Wikipedia:頁面存廢討論/記錄/' + new Morebits.date().format('YYYY/MM/DD', 'utc');
			let logPage = new Morebits.wiki.page(logPageTitle);
			logPage.load(function() {
				let logPageText = logPage.getPageText();
				form.previewer.beginRender(Twinkle.xfd.callbacks.afd.buildListText(params, logPageText).text, logPageTitle); // Force wikitext
			});
		}
	}
};

Twinkle.xfd.callback.evaluate = function(e) {
	var params = Morebits.QuickForm.getInputData(e.target);
	if (params.xfdcat === 'merge' && params.mergeinto.trim() === '') {
		alert(conv({ hans: '请提供合并目标！', hant: '請提供合併目標！' }));
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);

	Twinkle.xfd.currentRationale = params.xfdreason;
	Morebits.Status.onError(Twinkle.xfd.printRationale);

	if (!params.category) {
		Morebits.Status.error('错误', '未定义的动作');
		return;
	}

	var target_page;
	var date = new Morebits.Date(); // XXX: avoid use of client clock, still used by TfD, FfD and CfD
	switch (params.category) {
		case 'afd': // AFD
			if (Twinkle.getPref('xfdContinueBatch') && ['fame', 'substub', 'batch'].includes(params.xfdcat)) {
				localStorage.setItem('Twinkle_afdBatchToContinue', params.xfdcat);
				localStorage.setItem('Twinkle_afdBatchToContinueTime', new Date().getTime());
			} else {
				localStorage.removeItem('Twinkle_afdBatchToContinue');
				localStorage.removeItem('Twinkle_afdBatchToContinueTime');
			}
			if (params.xfdcat === 'batch') {
				localStorage.setItem('Twinkle_afdBatchReasonText', params.xfdreason || '');
				localStorage.setItem('Twinkle_afdBatchReasonTime', new Date().getTime());
			}
			params.logpage = 'Wikipedia:頁面存廢討論/記錄/' + date.format('YYYY/MM/DD', 'utc');
			params.lognomination = Twinkle.getPref('logXfdNominations') && Twinkle.getPref('noLogOnXfdNomination').indexOf(params.xfdcat) === -1;

			Morebits.wiki.addCheckpoint();
			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = params.logpage;
			Morebits.wiki.actionCompleted.notice = conv({ hans: '提名完成，重定向到讨论页', hant: '提名完成，重新導向到討論頁' });

			// Lookup creation
			target_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '获取页面创建信息', hant: '取得頁面建立資訊' }));
			target_page.setCallbackParameters(params);
			if (mw.config.get('wgPageContentModel') === 'wikitext') {
				target_page.setLookupNonRedirectCreator(true); // Look for author of first non-redirect revision
			}
			target_page.lookupCreation(Twinkle.xfd.callbacks.afd.lookupCreation);

			Morebits.wiki.removeCheckpoint();
			break;

		case 'ffd': // FFD
			params.logpage = 'Wikipedia:檔案存廢討論/記錄/' + date.format('YYYY/MM/DD', 'utc');
			params.lognomination = Twinkle.getPref('logXfdNominations') && Twinkle.getPref('noLogOnXfdNomination').indexOf('ffd') === -1;

			Morebits.wiki.addCheckpoint();
			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = params.logpage;
			Morebits.wiki.actionCompleted.notice = conv({ hans: '提名完成，重定向到讨论页', hant: '提名完成，重新導向到討論頁' });

			// Lookup creation
			var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '获取页面创建信息', hant: '取得頁面建立資訊' }));
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.setLookupNonRedirectCreator(true); // Look for author of first non-redirect revision
			wikipedia_page.lookupCreation(Twinkle.xfd.callbacks.ffd.lookupCreation);

			Morebits.wiki.removeCheckpoint();
			break;

		default:
			alert('twinklexfd：未定义的类别');
			break;
	}
};

Twinkle.addInitCallback(Twinkle.xfd, 'xfd');
})();


// </nowiki>
