// <nowiki>


(function($) {


/*
 ****************************************
 *** twinkleclose.js: XFD closing module
 ****************************************
 * Mode of invocation:     Links after section heading
 * Active on:              AfD dated archive pages
 * Config directives in:   TwinkleConfig
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.close = function twinkleclose() {
	if (Twinkle.getPref('XfdClose') === 'hide' || !/^Wikipedia:(頁面|檔案)存廢討論\/記錄\/\d+\/\d+\/\d+$/.test(mw.config.get('wgPageName'))) {
		return;
	}

	mw.hook('wikipage.content').add(function(item) {
		if (item.attr('id') === 'mw-content-text') {
			Twinkle.close.addLinks();
		}
	});
};

Twinkle.close.addLinks = function twinklecloseAddLinks() {
	var prevH2Section = -1;
	$('h1:has(.mw-headline),h2:has(.mw-headline),h3:has(.mw-headline),h4:has(.mw-headline),h5:has(.mw-headline),h6:has(.mw-headline)', '#bodyContent').each(function (index, current) {
		current.setAttribute('data-section', index + 1);
		if (current.nodeName === 'H2') {
			prevH2Section = index + 1;
		} else {
			current.setAttribute('data-parent-section', prevH2Section);
		}
	});

	var selector = ':has(.mw-headline a:only-of-type):not(:has(+ div.NavFrame))';
	var titles; // really needs to work on
	if ($('.ext-discussiontools-init-section').length > 0) { // Handle discussion tools
		titles = $('#bodyContent').find('.mw-heading2' + selector + ':not(:has(+ p + h3)) > h2, h3' + selector);
	} else {
		titles = $('#bodyContent').find('h2' + selector + ':not(:has(+ p + h3)), h3' + selector);
	}

	titles.each(function(key, current) {
		var headlinehref = $(current).find('.mw-headline a:not(.ext-discussiontools-init-section-subscribe-link)').attr('href');
		if (headlinehref === undefined) {
			return;
		}
		var title = null;
		if (headlinehref.indexOf('redlink=1') !== -1) {
			title = headlinehref.slice(19, -22);
		} else {
			var m = headlinehref.match(/\/wiki\/([^?]+)/, '$1');
			if (m !== null) {
				title = m[1];
			}
		}
		if (title === null) {
			return;
		}
		title = decodeURIComponent(title);
		title = title.replace(/_/g, ' '); // Normalize for using in interface and summary
		var pagenotexist = $(current).find('.mw-headline a').hasClass('new');
		var section = current.getAttribute('data-section');
		var parentSection = current.getAttribute('data-parent-section') || -1;
		var node = current.getElementsByClassName('mw-editsection')[0];
		var delDivider = document.createElement('span');
		delDivider.appendChild(document.createTextNode(' | '));
		node.insertBefore(delDivider, node.childNodes[1]);
		var delLink = document.createElement('a');
		delLink.className = 'twinkle-close-button';
		delLink.href = '#';
		delLink.setAttribute('data-section', section);
		delLink.innerText = conv({ hans: '关闭讨论', hant: '關閉討論' });
		$(delLink).on('click', function() {
			Twinkle.close.callback(title, section, parentSection, pagenotexist);
			return false;
		});
		node.insertBefore(delLink, node.childNodes[1]);
	});
};

var date = new Morebits.date();

// Keep this synchronized with {{delh}}
Twinkle.close.codes = [{
	key: conv({ hans: '请求无效', hant: '請求無效' }),
	value: {
		ir: {
			label: conv({ hans: '请求无效', hant: '請求無效' }),
			action: 'keep'
		},
		rep: {
			label: conv({ hans: '重复提出，无效', hant: '重複提出，無效' }),
			action: 'keep'
		},
		commons: {
			label: conv({ hans: '应在维基共享资源提请', hant: '應在維基共享資源提請' }),
			action: 'keep'
		},
		ne: {
			label: conv({ hans: '目标页面或文件不存在，无效', hant: '目標頁面或檔案不存在，無效' }),
			action: 'keep'
		},
		nq: {
			label: conv({ hans: '提删者未获取提删资格，无效', hant: '提刪者未取得提刪資格，無效' }),
			action: 'keep'
		}
	}
},
{
	key: '保留',
	value: {
		k: {
			label: '保留',
			action: 'keep',
			adminonly: true
		},
		sk: {
			label: '快速保留',
			action: 'keep'
		},
		tk: {
			label: conv({ hans: '暂时保留，改挂维护模板（关注度等）', hant: '暫時保留，改掛維護模板（關注度等）' }),
			value: conv({ hans: '暂时保留', hant: '暫時保留' }),
			action: 'keep'
		},
		rr: {
			label: conv({ hans: '请求理由消失', hant: '請求理由消失' }),
			action: 'keep',
			selected: Twinkle.getPref('XfdClose') === 'nonadminonly'
		},
		dan: {
			label: conv({ hans: '删后重建', hant: '刪後重建' }),
			action: 'keep',
			adminonly: true
		}
	}
},
{
	key: conv({ hans: '删除', hant: '刪除' }),
	value: {
		d: {
			label: conv({ hans: '删除', hant: '刪除' }),
			action: 'del',
			adminonly: true,
			selected: Twinkle.getPref('XfdClose') === 'all'
		},
		ic: {
			label: conv({ hans: '图像因侵权被删', hant: '圖像因侵權被刪' }),
			action: 'del',
			adminonly: true
		}
	}
},
{
	key: conv({ hans: '快速删除', hant: '快速刪除' }),
	value: {
		sd: {
			label: conv({ hans: '快速删除', hant: '快速刪除' }),
			action: 'del'
		},
		lssd: {
			label: conv({ hans: '无来源或著作权信息，快速删除', hant: '無來源或版權資訊，快速刪除' }),
			action: 'del'
		},
		svg: {
			label: conv({ hans: '已改用SVG图形，快速删除', hant: '已改用SVG圖形，快速刪除' }),
			action: 'del'
		},
		nowcommons: {
			label: conv({ hans: '维基共享资源已提供，快速删除', hant: '維基共享資源已提供，快速刪除' }),
			action: 'del'
		},
		drep: {
			label: conv({ hans: '多次被删除，条目锁定', hant: '多次被刪除，條目鎖定' }),
			action: 'del',
			adminonly: true
		}
	}
},
{
	key: conv({ hans: '转移至其他维基计划', hant: '轉移至其他維基計劃' }),
	value: {
		twc: {
			label: conv({ hans: '转移至维基共享资源', hant: '轉移至維基共享資源' }),
			action: 'noop',
			adminonly: true
		},
		twn: {
			label: conv({ hans: '转移至维基新闻', hant: '轉移至維基新聞' }),
			action: 'noop',
			adminonly: true
		},
		tws: {
			label: conv({ hans: '转移至维基文库', hant: '轉移至維基文庫' }),
			action: 'noop',
			adminonly: true
		},
		twb: {
			label: conv({ hans: '转移至维基教科书', hant: '轉移至維基教科書' }),
			action: 'noop',
			adminonly: true
		},
		twq: {
			label: conv({ hans: '转移至维基语录', hant: '轉移至維基語錄' }),
			action: 'noop',
			adminonly: true
		},
		twt: {
			label: conv({ hans: '转移至维基词典', hant: '轉移至維基詞典' }),
			action: 'noop',
			adminonly: true
		},
		twv: {
			label: conv({ hans: '转移至维基学院', hant: '轉移至維基學院' }),
			action: 'noop',
			adminonly: true
		},
		twvoy: {
			label: conv({ hans: '转移至维基导游', hant: '轉移至維基導遊' }),
			action: 'noop',
			adminonly: true
		},
		two: {
			label: conv({ hans: '转移至其他维基计划', hant: '轉移至其他維基計劃' }),
			action: 'noop',
			adminonly: true
		}
	}
},
{
	key: conv({ hans: '其他处理方法', hant: '其他處理方法' }),
	value: {
		relist: {
			label: conv({ hans: '重新提交讨论', hant: '重新提交討論' }),
			action: 'noop',
			disabled: mw.config.get('wgPageName') === 'Wikipedia:頁面存廢討論/記錄/' + date.format('YYYY/MM/DD', 'utc'),
			hidden: !/^Wikipedia:頁面存廢討論\/記錄\//.test(mw.config.get('wgPageName'))
		},
		c: {
			label: conv({ hans: '转交侵权', hant: '轉交侵權' }),
			action: 'noop'
		},
		m2ifd: {
			label: conv({ hans: '转送文件存废讨论', hant: '轉送檔案存廢討論' }),
			action: 'noop'
		},
		r: {
			label: '重定向',
			action: 'keep',
			adminonly: true
		},
		cr: {
			label: conv({ hans: '分类重定向', hant: '分類重定向' }),
			action: 'keep',
			adminonly: true
		},
		m: {
			label: conv({ hans: '移动', hant: '移動' }),
			action: 'keep',
			adminonly: true
		},
		merge: {
			label: conv({ hans: '并入', hant: '併入' }),
			action: 'keep',
			adminonly: true
		},
		mergeapproved: {
			label: conv({ hans: '允许并入', hant: '允許併入' }),
			action: 'keep',
			adminonly: true
		},
		nc: {
			label: conv({ hans: '无共识暂时保留', hant: '無共識暫時保留' }),
			value: conv({ hans: '无共识', hant: '無共識' }),
			action: 'keep'
		}
	}
}];

Twinkle.close.callback = function twinklecloseCallback(title, section, parentSection, noop) {
	var Window = new Morebits.simpleWindow(410, 200);
	Window.setTitle(conv({ hans: '关闭存废讨论', hant: '關閉存廢討論' }) + ' \u00B7 ' + title);
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '存废讨论设置', hant: '存廢討論設定' }), 'WP:TW/PREF#close');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#close');

	var form = new Morebits.quickForm(Twinkle.close.callback.evaluate);

	form.append({
		type: 'select',
		label: conv({ hans: '处理结果：', hant: '處理結果：' }),
		name: 'sub_group',
		event: Twinkle.close.callback.change_code
	});

	form.append({
		type: 'input',
		name: 'sdreason',
		label: conv({ hans: '速删理由：', hant: '速刪理由：' }),
		tooltip: conv({ hans: '用于删除日志，使用{{delete}}的参数格式，例如 A1 或 A1|G1', hant: '用於刪除日誌，使用{{delete}}的參數格式，例如 A1 或 A1|G1' }),
		hidden: true
	});

	form.append({
		type: 'input',
		name: 'remark',
		label: conv({ hans: '补充说明：', hant: '補充說明：' })
	});

	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '只关闭讨论，不进行其他操作', hant: '只關閉討論，不進行其他操作' }),
				value: 'noop',
				name: 'noop',
				event: Twinkle.close.callback.change_operation,
				checked: noop
			}
		]
	});

	if (new mw.Title(title).namespace % 2 === 0 && new mw.Title(title).namespace !== 2) {  // hide option for user pages, to avoid accidentally deleting user talk page
		form.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '删除关联的讨论页', hant: '刪除關聯的討論頁' }),
					value: 'talkpage',
					name: 'talkpage',
					tooltip: conv({ hans: '删除时附带删除此页面的讨论页。', hant: '刪除時附帶刪除此頁面的討論頁。' }),
					checked: true,
					event: function(event) {
						event.stopPropagation();
					}
				}
			]
		});
	}
	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '删除重定向页', hant: '刪除重新導向頁面' }),
				value: 'redirects',
				name: 'redirects',
				tooltip: conv({ hans: '删除到此页的重定向。', hant: '刪除到此頁的重新導向。' }),
				checked: true,
				event: function(event) {
					event.stopPropagation();
				}
			}
		]
	});

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	var sub_group = result.getElementsByTagName('select')[0]; // hack

	var resultData = {
		title: title,
		section: parseInt(section),
		parentSection: parseInt(parentSection),
		noop: noop
	};
	$(result).data('resultData', resultData);
	// worker function to create the combo box entries
	var createEntries = function(contents, container) {
		$.each(contents, function(itemKey, itemProperties) {
			var key = typeof itemKey === 'string' ? itemKey : itemProperties.value;

			var elem = new Morebits.quickForm.element({
				type: 'option',
				label: key + '：' + itemProperties.label,
				value: key,
				selected: itemProperties.selected,
				disabled: (Twinkle.getPref('XfdClose') !== 'all' && itemProperties.adminonly) || itemProperties.disabled,
				hidden: itemProperties.hidden
			});
			var elemRendered = container.appendChild(elem.render());
			$(elemRendered).data('messageData', itemProperties);
		});
	};

	Twinkle.close.codes.forEach(function(group) {
		var optgroup = new Morebits.quickForm.element({
			type: 'optgroup',
			label: group.key
		});
		optgroup = optgroup.render();
		sub_group.appendChild(optgroup);
		// create the options
		createEntries(group.value, optgroup);
	});

	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.sub_group.dispatchEvent(evt);
};

Twinkle.close.callback.change_operation = function twinklecloseCallbackChangeOperation(e) {
	var noop = e.target.checked;
	var code = e.target.form.sub_group.value;
	var messageData = $(e.target.form.sub_group).find('option[value="' + code + '"]').data('messageData');
	var talkpage = e.target.form.talkpage;
	var redirects = e.target.form.redirects;
	if (noop || messageData.action === 'keep') {
		if (talkpage) {
			talkpage.checked = false;
			talkpage.disabled = true;
		}
		redirects.checked = false;
		redirects.disabled = true;
	} else {
		if (talkpage) {
			talkpage.checked = true;
			talkpage.disabled = false;
		}
		redirects.checked = true;
		redirects.disabled = false;
	}
};

Twinkle.close.callback.change_code = function twinklecloseCallbackChangeCode(e) {
	var resultData = $(e.target.form).data('resultData');
	var messageData = $(e.target).find('option[value="' + e.target.value + '"]').data('messageData');
	var noop = e.target.form.noop;
	var talkpage = e.target.form.talkpage;
	var redirects = e.target.form.redirects;
	if (resultData.noop || messageData.action === 'noop') {
		noop.checked = true;
		noop.disabled = true;
		if (talkpage) {
			talkpage.checked = false;
			talkpage.disabled = true;
		}
		redirects.checked = false;
		redirects.disabled = true;
	} else {
		noop.checked = false;
		noop.disabled = false;
		if (messageData.action === 'keep') {
			if (talkpage) {
				talkpage.checked = false;
				talkpage.disabled = true;
			}
			redirects.checked = false;
			redirects.disabled = true;
		} else {
			if (talkpage) {
				talkpage.checked = true;
				talkpage.disabled = false;
			}
			redirects.checked = true;
			redirects.disabled = false;
		}
		if (e.target.value === 'sd') {
			e.target.form.sdreason.parentElement.removeAttribute('hidden');
		} else {
			e.target.form.sdreason.parentElement.setAttribute('hidden', '');
		}
	}

};

Twinkle.close.callback.evaluate = function twinklecloseCallbackEvaluate(e) {
	var code = e.target.sub_group.value;
	var resultData = $(e.target).data('resultData');
	var messageData = $(e.target.sub_group).find('option[value="' + code + '"]').data('messageData');
	var noop = e.target.noop.checked;
	var talkpage = e.target.talkpage && e.target.talkpage.checked;
	var redirects = e.target.redirects.checked;
	var params = {
		title: resultData.title,
		code: code,
		remark: e.target.remark.value,
		sdreason: e.target.sdreason.value,
		section: resultData.section,
		parentSection: resultData.parentSection,
		messageData: messageData,
		talkpage: talkpage,
		redirects: redirects
	};

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(e.target);

	Morebits.wiki.actionCompleted.notice = '操作完成';

	if (noop || messageData.action === 'noop') {
		Twinkle.close.callbacks.talkend(params);
	} else {
		switch (messageData.action) {
			case 'del':
				Twinkle.close.callbacks.del(params);
				break;
			case 'keep':
				var wikipedia_page = new Morebits.wiki.page(params.title, conv({ hans: '移除存废讨论模板', hant: '移除存廢討論模板' }));
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.load(Twinkle.close.callbacks.keep);
				break;
			default:
				alert('Twinkle.close：未定义 ' + code);

		}
	}
};

Twinkle.close.callbacks = {
	del: function (params) {
		var query, wikipedia_api;
		Morebits.wiki.addCheckpoint();

		var page = new Morebits.wiki.page(params.title, conv({ hans: '删除页面', hant: '刪除頁面' }));

		if (params.code === 'sd') {
			Twinkle.speedy.callbacks.parseWikitext(params.title, '{{delete|' + params.sdreason + '}}', function(reason) {
				reason = prompt(conv({ hans: '输入删除理由，或点击确定以接受自动生成的：', hant: '輸入刪除理由，或點選確定以接受自動生成的：' }), reason);
				if (reason === null) {
					page.getStatusElement().warn(conv({ hans: '没有执行删除', hant: '沒有執行刪除' }));
					Twinkle.close.callbacks.talkend(params);
				} else {
					page.setEditSummary(reason);
					page.setChangeTags(Twinkle.changeTags);
					page.deletePage(function() {
						page.getStatusElement().info('完成');
						Twinkle.close.callbacks.talkend(params);
					});
				}
			});
		} else {
			page.setEditSummary(conv({ hans: '存废讨论通过：[[', hant: '存廢討論通過：[[' }) + mw.config.get('wgPageName') + '#' + params.title + ']]');
			page.setChangeTags(Twinkle.changeTags);
			page.deletePage(function() {
				page.getStatusElement().info('完成');
				Twinkle.close.callbacks.talkend(params);
			});
		}
		if (params.redirects) {
			query = {
				action: 'query',
				titles: params.title,
				prop: 'redirects',
				rdlimit: 'max' // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api(conv({ hans: '正在获取重定向', hant: '正在取得重新導向' }), query, Twinkle.close.callbacks.deleteRedirectsMain);
			wikipedia_api.params = params;
			wikipedia_api.post();
		}
		if (params.talkpage) {
			var pageTitle = mw.Title.newFromText(params.title);
			if (pageTitle && pageTitle.namespace % 2 === 0 && pageTitle.namespace !== 2) {
				pageTitle.namespace++;  // now pageTitle is the talk page title!
				query = {
					action: 'query',
					titles: pageTitle.toText()
				};
				wikipedia_api = new Morebits.wiki.api(conv({ hans: '正在检查讨论页面是否存在', hant: '正在檢查討論頁面是否存在' }), query, Twinkle.close.callbacks.deleteTalk);
				wikipedia_api.params = params;
				wikipedia_api.params.talkPage = pageTitle.toText();
				wikipedia_api.post();
			}
		}

		Morebits.wiki.removeCheckpoint();
	},
	deleteRedirectsMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('rd').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var redirectDeleter = new Morebits.batchOperation(conv({ hans: '正在删除到 ', hant: '正在刪除到 ' }) + apiobj.params.title + conv({ hans: ' 的重定向', hant: ' 的重新導向' }));
		redirectDeleter.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
		redirectDeleter.setPageList(pages);
		redirectDeleter.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, conv({ hans: '正在删除 ', hant: '正在刪除 ' }) + pageName);
			wikipedia_page.setEditSummary('[[WP:CSD#G15|G15]]: ' + conv({ hans: '指向已删页面“', hant: '指向已刪頁面「' }) + apiobj.params.title + conv({ hans: '”的重定向', hant: '」的重新導向' }));
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

		var page = new Morebits.wiki.page(apiobj.params.talkPage, conv({ hans: '正在删除页面 ', hant: '正在刪除頁面 ' }) + apiobj.params.title + conv({ hans: ' 的讨论页', hant: ' 的討論頁' }));
		page.setEditSummary('[[WP:CSD#G15|G15]]: ' + conv({ hans: '已删页面“', hant: '已刪頁面「' }) + apiobj.params.title + conv({ hans: '”的[[Wikipedia:讨论页|讨论页]]', hant: '」的[[Wikipedia:討論頁|討論頁]]' }));
		page.setChangeTags(Twinkle.changeTags);
		page.deletePage();
	},
	keep: function (pageobj) {
		var statelem = pageobj.getStatusElement();

		if (!pageobj.exists()) {
			statelem.error(conv({ hans: '页面不存在，可能已被删除', hant: '頁面不存在，可能已被刪除' }));
			return;
		}

		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var pagetitle = mw.Title.newFromText(params.title);
		if (pagetitle.getNamespaceId() % 2 === 0) {
			var talkpagetitle = new mw.Title(pagetitle.getMainText(), pagetitle.getNamespaceId() + 1);
			var talkpage = new Morebits.wiki.page(talkpagetitle.toString(), conv({ hans: '标记讨论页', hant: '標記討論頁' }));
			var reason = params.messageData.value || params.messageData.label;
			var vfdkept = '{{Old vfd multi|' + mw.config.get('wgPageName').split('/').slice(2).join('/') + '|' + reason + '}}\n';
			talkpage.setPrependText(vfdkept);
			talkpage.setEditSummary('[[' + mw.config.get('wgPageName') + '#' + params.title + ']]：' + reason);
			talkpage.setChangeTags(Twinkle.changeTags);
			talkpage.setCreateOption('recreate');
			talkpage.prepend();
		}

		var newtext = text.replace(/<noinclude>\s*\{\{([rsaiftcmv]fd)(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*<\/noinclude>\s*/gi, '');
		newtext = newtext.replace(/\{\{([rsaiftcmv]fd)(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/gi, '');
		if (params.code !== 'tk') {
			newtext = newtext.replace(/\{\{(notability|fame|mair|知名度|重要性|显著性|顯著性|知名度不足|人物重要性|重要性不足|notable|关注度|关注度不足|關注度|關注度不足|重要|重要度)(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\n*/gi, '');
			newtext = newtext.replace(/\{\{(substub|小小作品|cod|小小條目|小小条目)(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\n*/gi, '');
		}
		if (params.code === 'mergeapproved') {
			var tag = '{{subst:Merge approved/auto|discuss=' + mw.config.get('wgPageName') + '#' + params.title + '}}\n';

			// Insert tag after short description or any hatnotes
			var wikipage = new Morebits.wikitext.page(newtext);
			newtext = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
		}
		if (newtext === text) {
			statelem.warn(conv({ hans: '未找到存废讨论模板，可能已被移除', hant: '未找到存廢討論模板，可能已被移除' }));
			Twinkle.close.callbacks.talkend(params);
			return;
		}
		var editsummary = conv({ hans: '存废讨论关闭：[[', hant: '存廢討論關閉：[[' }) + mw.config.get('wgPageName') + '#' + params.title + ']]';

		pageobj.setPageText(newtext);
		pageobj.setEditSummary(editsummary);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.keepComplete);
	},
	keepComplete: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		Twinkle.close.callbacks.talkend(params);
	},

	talkend: function (params) {
		var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), conv({ hans: '关闭讨论', hant: '關閉討論' }));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setPageSection(params.section);
		wikipedia_page.load(Twinkle.close.callbacks.saveTalk);
	},
	saveTalk: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		if (text.indexOf('{{delh') !== -1) {
			statelem.error(conv({ hans: '讨论已被关闭', hant: '討論已被關閉' }));
			return;
		}

		var sbegin = text.indexOf('<section begin=backlog />') !== -1;
		var send = text.indexOf('<section end=backlog />') !== -1;
		text = text.replace('\n<section begin=backlog />', '');
		text = text.replace('\n<section end=backlog />', '');

		var bar = text.split('\n----\n');
		var split = bar[0].split('\n');

		text = split[0] + '\n{{delh|' + params.code + '}}\n';
		var reason;
		if (params.code === 'relist') {
			var dateStr = new Morebits.date().format('YYYY/MM/DD', 'utc');
			var logtitle = 'Wikipedia:頁面存廢討論/記錄/' + dateStr;
			text += '{{Relisted}}到[[' + logtitle + '#' + params.title + ']]。';
			reason = '重新提交到[[' + logtitle + '#' + params.title + '|' + dateStr + ']]';

			split[0] = split[0].replace(/^===(.+)===$/, '==$1==');
			var relist_params = {
				title: params.title,
				source: pageobj.getPageName(),
				text: split.join('\n'),
				comment: params.remark
			};
			var logpage = new Morebits.wiki.page(logtitle, '重新提交');
			if (params.parentSection > 0) {
				Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '正在获取批量提删理据…', hant: '正在取得批量提刪理據…' }));
				var api = new mw.Api();
				api.get({
					action: 'query',
					format: 'json',
					prop: 'revisions',
					titles: pageobj.getPageName(),
					formatversion: 2,
					rvprop: 'content',
					rvsection: params.parentSection
				}).then(function (data) {
					var content = data.query.pages[0].revisions[0].content;
					relist_params.batchText = content;
					logpage.setCallbackParameters(relist_params);
					logpage.load(Twinkle.close.callbacks.relistToday);
				});
			} else {
				logpage.setCallbackParameters(relist_params);
				logpage.load(Twinkle.close.callbacks.relistToday);
			}

			var article_params = {
				date: dateStr
			};
			var articlepage = new Morebits.wiki.page(params.title, conv({ hans: '重新标记', hant: '重新標記' }));
			articlepage.setCallbackParameters(article_params);
			articlepage.load(Twinkle.close.callbacks.retaggingArticle);
		} else {
			text += split.slice(1).join('\n');
			reason = params.messageData.value || params.messageData.label;
			text += '\n<hr>\n: ' + reason;
			if (params.remark) {
				text += '：' + Morebits.string.appendPunctuation(params.remark);
			} else {
				text += '。';
			}
		}
		if (!Morebits.userIsSysop) {
			text += '{{subst:NAC}}';
		}
		text += '--~~~~\n{{delf}}';

		if (bar[1]) {
			text += '\n----\n' + bar.slice(1).join('\n----\n');
		}
		if (send) {
			text += '\n<section end=backlog />';
		}
		if (sbegin) {
			// guaranteed to be at tne end?
			text += '\n<section begin=backlog />';
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary('/* ' + params.title + ' */ ' + reason);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.disableLink);
	},

	relistToday: function (pageobj) {
		var params = pageobj.getCallbackParameters();

		var lines = params.text.replace(/<!-- Twinkle:.+-->\n?/, '').trim().split('\n');
		var appendText = '\n{{safesubst:SafeAfdHead}}\n' + lines[0] + '\n';
		if (params.batchText) {
			var bar = params.batchText.split('\n----\n');
			var comment = bar[bar.length - 1];
			var m = comment.match(/({{[删刪]除}}理據.*)\n(提[报報]以上.*)/);
			if (m) {
				appendText += m[1] + '\n: ' + m[2] + '\n';
			} else {
				Morebits.status.warn(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '无法解析批量提删理据', hant: '無法解析批量提刪理據' }));
			}
		}
		appendText += lines.slice(1).join('\n') + '\n{{subst:Relist';
		if (params.comment) {
			appendText += '|1=' + params.comment;
		}
		appendText += '}}';

		var sourceAnchor = params.source + '#' + params.title;
		var dateStr = params.source.replace('Wikipedia:頁面存廢討論/記錄/', '');
		pageobj.setAppendText(appendText);
		pageobj.setEditSummary('/* ' + params.title + ' */ 重新提交自[[' + sourceAnchor + '|' + dateStr + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('recreate');
		pageobj.append();
	},
	retaggingArticle: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		// defaults to /doc for lua modules, which may not exist
		if (!pageobj.exists()) {
			statelem.error(conv({ hans: '页面不存在，可能已被删除', hant: '頁面不存在，可能已被刪除' }));
			return;
		}

		var params = pageobj.getCallbackParameters();
		var text = pageobj.getPageText();

		if (/{{[rsaiftcmv]fd\s*(\|.*)?\|\s*date\s*=[^|}]*.*}}/.test(text)) {
			text = text.replace(/({{[rsaiftcmv]fd\s*(?:\|.*)?\|\s*date\s*=)[^|}]*(.*}})/, '$1' + params.date + '$2');
		} else {
			Morebits.status.warn(conv({ hans: '重新标记', hant: '重新標記' }), conv({ hans: '找不到提删模板，重新插入', hant: '找不到提刪模板，重新插入' }));
			// Insert tag after short description or any hatnotes
			var wikipage = new Morebits.wikitext.page(text);
			var tag = '{{vfd|date=' + params.date + '}}\n';
			text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary('重新提交到[[Wikipedia:頁面存廢討論/記錄/' + params.date + '#' + pageobj.getPageName() + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.save();
	},

	disableLink: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		$('a.twinkle-close-button[data-section=' + params.section + ']').addClass('twinkle-close-button-disabled');
	}
};

Twinkle.addInitCallback(Twinkle.close, 'close');
})(jQuery);


// </nowiki>
