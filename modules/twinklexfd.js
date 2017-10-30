//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklexfd.js: XFD module
 ****************************************
 * Mode of invocation:     Tab ("XFD")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * Flow pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageContentModel') === 'flow-board' || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	Twinkle.addPortletLink( Twinkle.xfd.callback, wgULS("提删", "提刪"), "tw-xfd", wgULS("提交删除讨论", "提交刪除討論") );

	var date = new Date();
	if (date.getUTCMonth()===3 && date.getUTCDate()===1) {
		Twinkle.addPortletLink( Twinkle.xfd.aprilfool, wgULS("愚人节提删", "愚人節提刪"), "tw-xfd-april-fool", wgULS("愚人节提删", "愚人節提刪") );
	}
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.status.printUserText(Twinkle.xfd.currentRationale, wgULS("您的理由已在下方提供，如果您想重新提交，请将其复制到一新窗口中：", "您的理由已在下方提供，如果您想重新提交，請將其複製到一新窗口中："));
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( wgULS("提交存废讨论", "提交存廢討論") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("关于存废讨论", "關於存廢討論"), "WP:XFD" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#xfd" );

	var form = new Morebits.quickForm( Twinkle.xfd.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: wgULS('提交类型：', '提交類別：'),
			event: Twinkle.xfd.callback.change_category
		} );
	categories.append( {
			type: 'option',
			label: wgULS('页面存废讨论', '頁面存廢討論'),
			selected: mw.config.get('wgNamespaceNumber') === 0,  // Main namespace
			value: 'afd'
		} );
	categories.append( {
			type: 'option',
			label: wgULS('文件存废讨论', '檔案存廢討論'),
			selected: mw.config.get('wgNamespaceNumber') === 6,  // File namespace
			value: 'ffd'
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: wgULS('如可能，通知页面创建者', '如可能，通知頁面建立者'),
					value: 'notify',
					name: 'notify',
					tooltip: wgULS("在页面创建者对话页上放置一通知模板。", "在頁面建立者對話頁上放置一通知模板。"),
					checked: true
				}
			]
		}
	);
	form.append( {
			type: 'field',
			label:'工作区',
			name: 'work_area'
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.xfd.previousNotify = true;

Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
	var value = e.target.value;
	var form = e.target.form;
	var old_area = Morebits.quickForm.getElements(e.target.form, "work_area")[0];
	var work_area = null;

	var oldreasontextbox = form.getElementsByTagName('textarea')[0];
	var oldreason = (oldreasontextbox ? oldreasontextbox.value : '');

	var appendReasonBox = function twinklexfdAppendReasonBox() {
		work_area.append( {
			type: 'textarea',
			name: 'xfdreason',
			label: '理由：',
			value: oldreason,
			tooltip: wgULS('您可以使用维基格式，Twinkle将自动为您加入签名。', '您可以使用維基格式，Twinkle將自動為您加入簽名。')
		} );
		// TODO possible future "preview" link here
	};

	switch( value ) {
	case 'afd':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: wgULS('页面存废讨论', '頁面存廢討論'),
				name: 'work_area'
			} );
		work_area.append( {
				type: 'checkbox',
				list: [
						{
							label: '使用<noinclude>包裹模板',
							value: 'noinclude',
							name: 'noinclude',
							checked: mw.config.get('wgNamespaceNumber') === 10, // Template namespace
							tooltip: wgULS('使其不会在被包含时出现。', '使其不會在被包含時出現。')
						}
					]
		} );
		var afd_category = work_area.append( {
				type:'select',
				name:'xfdcat',
				label:wgULS('选择提删类别：', '選擇提刪類別：'),
				event:Twinkle.xfd.callback.change_afd_category
			} );

		afd_category.append( { type:'option', label:wgULS('删除', '刪除'), value:'delete', selected:true } );
		afd_category.append( { type:'option', label:wgULS('合并', '合併'), value:'merge' } );
		afd_category.append( { type:'option', label:wgULS('移动到维基词典', '移動到維基詞典'), value:'vmd' } );
		afd_category.append( { type:'option', label:wgULS('移动到维基文库', '移動到維基文庫'), value:'vms' } );
		afd_category.append( { type:'option', label:wgULS('移动到维基教科书', '移動到維基教科書'), value:'vmb' } );
		afd_category.append( { type:'option', label:wgULS('移动到维基语录', '移動到維基語錄'), value:'vmq' } );
		afd_category.append( { type:'option', label:wgULS('移动到维基导游', '移動到維基導遊'), value:'vmvoy' } );
		if ( Twinkle.getPref('FwdCsdToXfd') ) {
			afd_category.append( { type:'option', label:wgULS('转交自快速删除候选', '轉交自快速刪除候選'), value:'fwdcsd' } );
		}


		work_area.append( {
				type: 'input',
				name: 'mergeinto',
				label: wgULS('合并到：', '合併到：'),
				disabled: true
			} );
		appendReasonBox();
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	case 'ffd':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: wgULS('文件存废讨论', '檔案存廢討論'),
				name: 'work_area'
			} );
		appendReasonBox();
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	default:
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: wgULS('未定义', '未定義'),
				name: 'work_area'
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	}

	// No creator notification for CFDS
	if (value === "cfds") {
		Twinkle.xfd.previousNotify = form.notify.checked;
		form.notify.checked = false;
		form.notify.disabled = true;
	} else {
		form.notify.checked = Twinkle.xfd.previousNotify;
		form.notify.disabled = false;
	}
};

Twinkle.xfd.callback.change_afd_category = function twinklexfdCallbackChangeAfdCategory(e) {
	if( e.target.value === 'merge' ) {
		e.target.form.mergeinto.disabled = false;
		e.target.form.mergeinto.previousElementSibling.innerHTML = wgULS('合并到：', '合併到：');
	} else if( e.target.value === 'fwdcsd' ) {
		e.target.form.mergeinto.disabled = false;
		e.target.form.mergeinto.previousElementSibling.innerHTML = '提交人：';
		e.target.form.xfdreason.value = decodeURIComponent($("#delete-reason").text()).replace(/\+/g, ' ');
	} else {
		e.target.form.mergeinto.disabled = true;
	}
};

Twinkle.xfd.callbacks = {
	afd: {
		main: function(pageobj) {
			// this is coming in from lookupCreator...!
			var params = pageobj.getCallbackParameters();

			// Adding discussion
			var wikipedia_page = new Morebits.wiki.page(params.logpage, wgULS("添加讨论到当日列表", "加入討論到當日清單"));
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.todaysList);

			// Notification to first contributor
			if(params.usertalk) {
				var initialContrib = pageobj.getCreator();

				// Disallow warning yourself
				if (initialContrib === mw.config.get('wgUserName')) {
					pageobj.getStatusElement().warn(wgULS("您（" + initialContrib + "）创建了该页，跳过通知", "您（" + initialContrib + "）建立了該頁，跳過通知"));
					return;
				}

				var talkPageName = 'User talk:' + initialContrib;
				Morebits.wiki.flow.check(talkPageName, function () {
					var flowpage = new Morebits.wiki.flow(talkPageName, wgULS("通知页面创建者（" + initialContrib + "）", "通知頁面建立者（" + initialContrib + "）"));
					flowpage.setTopic("页面[[:" + Morebits.pageNameNorm + "]]存废讨论通知");
					flowpage.setContent("{{subst:AFDNote|" + Morebits.pageNameNorm + "|flow=yes}}");
					flowpage.newTopic();
				}, function () {
					var usertalkpage = new Morebits.wiki.page(talkPageName, wgULS("通知页面创建者（" + initialContrib + "）", "通知頁面建立者（" + initialContrib + "）"));
					var notifytext = "\n{{subst:AFDNote|" + Morebits.pageNameNorm + "}}--~~~~";
					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary("通知：页面[[" + Morebits.pageNameNorm + "]]存废讨论提名" + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					switch (Twinkle.getPref('xfdWatchUser')) {
						case 'yes':
							usertalkpage.setWatchlist(true);
							break;
						case 'no':
							usertalkpage.setWatchlistFromPreferences(false);
							break;
						default:
							usertalkpage.setWatchlistFromPreferences(true);
							break;
					}
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();
				});
			}
		},
		taggingArticle: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			var tag = '{{vfd|' + Morebits.string.formatReasonText(params.reason);

			switch ( params.xfdcat ) {
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
				default:
					break;
			}
			if (Morebits.wiki.isPageRedirect()) {
				tag += '|r';
			}
			tag += '|date={{subst:#time:Y/m/d}}}}';
			if ( params.noinclude ) {
				tag = '<noinclude>' + tag + '</noinclude>';

				// 只有表格需要单独加回车，其他情况加回车会破坏模板。
				if (text.indexOf('{|') === 0) {
					tag += '\n';
				}
			} else {
				tag += '\n';
			}

			// Then, test if there are speedy deletion-related templates on the article.
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[\- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
			if (text !== textNoSd && confirm(wgULS("在页面上找到快速删除模板，要移除吗？", "在頁面上找到快速刪除模板，要移除嗎？"))) {
				text = textNoSd;
			}

			// Mark the page as patrolled, if wanted
			if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
				pageobj.patrol();
			}

			pageobj.setPageText(tag + text);
			pageobj.setEditSummary(wgULS("页面存废讨论：[[", "頁面存廢討論：[[") + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchPage')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			// pageobj.setCreateOption('recreate');
			pageobj.save();

			if( Twinkle.getPref('markXfdPagesAsPatrolled') ) {
				pageobj.patrol();
			}
		},
		todaysList: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			var type = '';
			var to = '';

			switch ( params.xfdcat ) {
				case 'vmd':
				case 'vms':
				case 'vmb':
				case 'vmq':
				case 'vmvoy':
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

			pageobj.setAppendText("\n{{subst:DRItem|Type=" + type + "|DRarticles=" + Morebits.pageNameNorm + "|Reason=" + Morebits.string.formatReasonText(params.reason) + "|To=" + to + "}}~~~~");
			pageobj.setEditSummary(wgULS("添加[[", "加入[[") + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchDiscussion')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('recreate');
			pageobj.append();
			Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
		},
		tryTagging: function (pageobj) {
			var statelem = pageobj.getStatusElement();
			if (!pageobj.exists()) {
				statelem.error(wgULS("页面不存在，可能已被删除", "頁面不存在，可能已被刪除"));
				return;
			}

			var text = pageobj.getPageText();

			var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
			if ( xfd && !confirm( wgULS("删除相关模板{{" + xfd[1] + "}}已被置于页面中，您是否仍想继续提报？", "刪除相關模板{{" + xfd[1] + "}}已被置於頁面中，您是否仍想繼續提報？") ) ) {
				statelem.error( wgULS('页面已被提交至存废讨论。', '頁面已被提交至存廢討論。') );
				return;
			}

			var copyvio = /(?:\{\{\s*(copyvio)[^{}]*?\}\})/i.exec( text );
			if ( copyvio ) {
				statelem.error( wgULS('页面中已有版权验证模板。', '頁面中已有版權驗證模板。') );
				return;
			}

			Twinkle.xfd.callbacks.afd.taggingArticle(pageobj);

			// Notification to first contributor
			var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
			wikipedia_page.setCallbackParameters(pageobj.getCallbackParameters());
			wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.afd.main);
		}
	},

	ffd: {
		main: function(pageobj) {
			// this is coming in from lookupCreator...!
			var params = pageobj.getCallbackParameters();
			var initialContrib = pageobj.getCreator();
			params.uploader = initialContrib;

			// Adding discussion
			var wikipedia_page = new Morebits.wiki.page(params.logpage, wgULS("添加讨论到当日列表", "加入討論到當日清單"));
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.ffd.todaysList);

			// Notification to first contributor
			if(params.usertalk) {
				// Disallow warning yourself
				if (initialContrib === mw.config.get('wgUserName')) {
					pageobj.getStatusElement().warn(wgULS("您（" + initialContrib + "）创建了该页，跳过通知", "您（" + initialContrib + "）建立了該頁，跳過通知"));
					return;
				}

				var talkPageName = 'User talk:' + initialContrib;

				Morebits.wiki.flow.check(talkPageName, function () {
					var flowpage = new Morebits.wiki.flow(talkPageName, wgULS("通知页面创建者（" + initialContrib + "）", "通知頁面建立者（" + initialContrib + "）"));
					flowpage.setTopic("文件[[:File:" + mw.config.get('wgTitle') + "]]存废讨论通知");
					flowpage.setContent("{{subst:idw|File:" + mw.config.get('wgTitle') + "|flow=yes}}");
					flowpage.newTopic();
				}, function () {
					var usertalkpage = new Morebits.wiki.page(talkPageName, wgULS("通知页面创建者（" + initialContrib + "）", "通知頁面建立者（" + initialContrib + "）"));
					var notifytext = "\n{{subst:idw|File:" + mw.config.get('wgTitle') + "}}--~~~~";
					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary("通知：文件[[" + Morebits.pageNameNorm + "]]存废讨论提名" + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					switch (Twinkle.getPref('xfdWatchUser')) {
						case 'yes':
							usertalkpage.setWatchlist(true);
							break;
						case 'no':
							usertalkpage.setWatchlistFromPreferences(false);
							break;
						default:
							usertalkpage.setWatchlistFromPreferences(true);
							break;
					}
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();
				});
			}
		},
		taggingImage: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setPageText("{{ifd|" + Morebits.string.formatReasonText(params.reason) + "|date={{subst:#time:c}}}}\n" + text);
			pageobj.setEditSummary(wgULS("文件存废讨论：[[", "檔案存廢討論：[[") + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchPage')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('recreate');  // it might be possible for a file to exist without a description page
			pageobj.save();
		},
		todaysList: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setAppendText("\n{{subst:IfdItem|Filename=" + mw.config.get('wgTitle') + "|Uploader=" + params.uploader + "|Reason=" + Morebits.string.formatReasonText(params.reason) + "}}--~~~~");
			pageobj.setEditSummary(wgULS("添加[[", "加入[[") + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchDiscussion')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('recreate');
			pageobj.append(function() {
				Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
			});
		},
		tryTagging: function (pageobj) {
			var statelem = pageobj.getStatusElement();
			if (!pageobj.exists()) {
				statelem.error(wgULS("页面不存在，可能已被删除", "頁面不存在，可能已被刪除"));
				return;
			}

			var text = pageobj.getPageText();

			var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
			if ( xfd && !confirm( wgULS("删除相关模板{{" + xfd[1] + "}}已被置于页面中，您是否仍想继续提报？", "刪除相關模板{{" + xfd[1] + "}}已被置於頁面中，您是否仍想繼續提報？") ) ) {
				statelem.error( wgULS('页面已被提交至存废讨论。', '頁面已被提交至存廢討論。') );
				return;
			}

			Twinkle.xfd.callbacks.ffd.taggingImage(pageobj);

			// Contributor specific edits
			var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
			wikipedia_page.setCallbackParameters(pageobj.getCallbackParameters());
			wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.ffd.main);
		}
	}
};



Twinkle.xfd.callback.evaluate = function(e) {
	var type = e.target.category.value;
	var usertalk = e.target.notify.checked;
	var reason = e.target.xfdreason.value;
	var xfdcat, mergeinto, noinclude;
	if( type === 'afd' ) {
		noinclude = e.target.noinclude.checked;
		xfdcat = e.target.xfdcat.value;
		mergeinto = e.target.mergeinto.value;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Twinkle.xfd.currentRationale = reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	if( !type ) {
		Morebits.status.error( '错误', '未定义的动作' );
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params;
	var dateString;
	var date = new Date();
	function twodigits(num) {
		return num < 10 ? '0' + num : num;
	}
	switch( type ) {

	case 'afd': // AFD
		dateString = date.getUTCFullYear() + '/' + twodigits(date.getUTCMonth() + 1) + '/' + twodigits(date.getUTCDate());
		logpage = 'Wikipedia:頁面存廢討論/記錄/' + dateString;
		params = { usertalk: usertalk, xfdcat: xfdcat, mergeinto: mergeinto, noinclude: noinclude, reason: reason, logpage: logpage };

		Morebits.wiki.addCheckpoint();
		// Updating data for the action completed event
		Morebits.wiki.actionCompleted.redirect = logpage;
		Morebits.wiki.actionCompleted.notice = wgULS("提名完成，重定向到讨论页", "提名完成，重定向到討論頁");

		// Tagging file
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS("添加存废讨论模板到页面", "加入存廢討論模板到頁面"));
		wikipedia_page.setFollowRedirect(false);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.afd.tryTagging);

		Morebits.wiki.removeCheckpoint();
		break;

	case 'ffd': // FFD
		dateString = date.getUTCFullYear() + '/' + twodigits(date.getUTCMonth() + 1) + '/' + twodigits(date.getUTCDate());
		logpage = 'Wikipedia:檔案存廢討論/記錄/' + dateString;
		params = { usertalk: usertalk, reason: reason, logpage: logpage };

		Morebits.wiki.addCheckpoint();
		// Updating data for the action completed event
		Morebits.wiki.actionCompleted.redirect = logpage;
		Morebits.wiki.actionCompleted.notice = wgULS("提名完成，重定向到讨论页", "提名完成，重定向到討論頁");

		// Tagging file
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS("添加存废讨论模板到文件描述页", "加入存廢討論模板到檔案描述頁"));
		wikipedia_page.setFollowRedirect(false);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.ffd.tryTagging);

		Morebits.wiki.removeCheckpoint();
		break;

	default:
		alert("twinklexfd：未定义的类别");
		break;
	}
};


/**
 * 愚人节提删
 */

Twinkle.xfd.aprilfool = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( "APRIL FOOL" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("关于愚人节", "關於愚人節"), "Wikipedia:愚人節玩笑規範" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#xfd" );

	var form = new Morebits.quickForm( Twinkle.xfd.aprilfool.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: wgULS('提交类型：', '提交類別：'),
			event: Twinkle.xfd.callback.change_category
		} );
	categories.append( {
			type: 'option',
			label: wgULS('页面存废讨论', '頁面存廢討論'),
			selected: mw.config.get('wgNamespaceNumber') === 0,  // Main namespace
			value: 'afd'
		} );
	categories.append( {
			type: 'option',
			label: wgULS('文件存废讨论', '檔案存廢討論'),
			selected: mw.config.get('wgNamespaceNumber') === 6,  // File namespace
			value: 'ffd'
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: wgULS('通知还是不通知，这是一个问题', '通知還是不通知，這是一個問題'),
					value: 'notify',
					name: 'notify',
					tooltip: wgULS("无论选还是不选都不通知！", "無論選還是不選都不通知！"),
					checked: true
				}
			]
		}
	);
	form.append( {
			type: 'field',
			label:'工作区',
			name: 'work_area'
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.xfd.aprilfool.evaluate = function(e) {
	var type = e.target.category.value;
	var reason = e.target.xfdreason.value;
	var xfdcat, mergeinto, noinclude;
	if( type === 'afd' ) {
		noinclude = e.target.noinclude.checked;
		xfdcat = e.target.xfdcat.value;
		mergeinto = e.target.mergeinto.value;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Twinkle.xfd.currentRationale = reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	var wikipedia_page, logpage, params;
	var date = new Date();

	logpage = 'Wikipedia:頁面存廢和諧討論/記錄/' + date.getUTCFullYear() + '/04/01';
	params = { xfdcat: xfdcat, mergeinto: mergeinto, noinclude: noinclude, reason: reason, logpage: logpage };

	Morebits.wiki.addCheckpoint();
	// Updating data for the action completed event
	Morebits.wiki.actionCompleted.redirect = logpage;
	Morebits.wiki.actionCompleted.notice = wgULS("提名完成，重定向到讨论页", "提名完成，重定向到討論頁");

	// Tagging file
	wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS("假装添加存废讨论模板到页面", "假裝加入存廢討論模板到頁面"));
	wikipedia_page.setFollowRedirect(false);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.xfd.aprilfool.tryTagging);

	Morebits.wiki.removeCheckpoint();
};

Twinkle.xfd.aprilfool.todaysList = function(pageobj) {
	var text = pageobj.getPageText();
	var params = pageobj.getCallbackParameters();
	var type = '';
	var to = '';

	switch ( params.xfdcat ) {
		case 'vmd':
		case 'vms':
		case 'vmb':
		case 'vmq':
		case 'vmvoy':
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

	pageobj.setAppendText("\n{{subst:DRItem|Type=" + type + "|DRarticles=" + Morebits.pageNameNorm + "|Reason=" + Morebits.string.formatReasonText(params.reason) + "|To=" + to + "}}~~~~");
	pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
	switch (Twinkle.getPref('xfdWatchDiscussion')) {
		case 'yes':
			pageobj.setWatchlist(true);
			break;
		case 'no':
			pageobj.setWatchlistFromPreferences(false);
			break;
		default:
			pageobj.setWatchlistFromPreferences(true);
			break;
	}
	pageobj.setCreateOption('recreate');
	pageobj.append();
	Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
};

Twinkle.xfd.aprilfool.tryTagging = function (pageobj) {
	var statelem = pageobj.getStatusElement();
	var params = pageobj.getCallbackParameters();
	if (!pageobj.exists()) {
		statelem.error(wgULS("页面不存在，可能已被删除", "頁面不存在，可能已被刪除"));
		return;
	}

	var text = pageobj.getPageText();

	var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
	if ( xfd && !confirm( wgULS("删除相关模板{{" + xfd[1] + "}}已被置于页面中，您是否仍想继续提报？", "刪除相關模板{{" + xfd[1] + "}}已被置於頁面中，您是否仍想繼續提報？") ) ) {
		statelem.error( wgULS('页面已被提交至存废讨论。', '頁面已被提交至存廢討論。') );
		return;
	}

	var copyvio = /(?:\{\{\s*(copyvio)[^{}]*?\}\})/i.exec( text );
	if ( copyvio ) {
		statelem.error( wgULS('页面中已有版权验证模板。', '頁面中已有版權驗證模板。') );
	}

	var wikipedia_page = new Morebits.wiki.page(params.logpage, wgULS("添加讨论到当日列表", "加入討論到當日清單"));
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.xfd.aprilfool.todaysList);
};

})(jQuery);


//</nowiki>
