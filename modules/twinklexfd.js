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
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	Twinkle.addPortletLink( Twinkle.xfd.callback, "提删", "tw-xfd", "提交删除讨论" );
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.status.printUserText(Twinkle.xfd.currentRationale, "您的理由已在下方提供，如果您想重新提交，请将其复制到一新窗口中：");
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( "提交存废讨论" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "关于存废讨论", "WP:XFD" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#xfd" );

	var form = new Morebits.quickForm( Twinkle.xfd.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: '提交类型：',
			event: Twinkle.xfd.callback.change_category
		} );
	categories.append( {
			type: 'option',
			label: '页面存废讨论',
			selected: mw.config.get('wgNamespaceNumber') === 0,  // Main namespace
			value: 'afd'
		} );
	categories.append( {
			type: 'option',
			label: '文件存废讨论',
			selected: mw.config.get('wgNamespaceNumber') === 6,  // File namespace
			value: 'ffd'
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '如可能，通知页面创建者',
					value: 'notify',
					name: 'notify',
					tooltip: "在页面创建者对话页上放置一通知模板。",
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
			tooltip: '您可以使用维基格式，Twinkle将自动为您加入签名。'
		} );
		// TODO possible future "preview" link here
	};

	switch( value ) {
	case 'afd':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '页面存废讨论',
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
							tooltip: '使其不会在被包含时出现。'
						}
					]
		} );
		var afd_category = work_area.append( {
				type:'select',
				name:'xfdcat',
				label:'选择提删类别：',
				event:Twinkle.xfd.callback.change_afd_category
			} );

		afd_category.append( { type:'option', label:'删除', value:'delete', selected:true } );
		afd_category.append( { type:'option', label:'合并', value:'merge' } );
		afd_category.append( { type:'option', label:'移动到维基辞典', value:'vmd' } );
		afd_category.append( { type:'option', label:'移动到维基文库', value:'vms' } );
		afd_category.append( { type:'option', label:'移动到维基教科书', value:'vmb' } );
		afd_category.append( { type:'option', label:'移动到维基语录', value:'vmq' } );
		afd_category.append( { type:'option', label:'移动到维基导游', value:'vmvoy' } );
		if ( Morebits.userIsInGroup('sysop') ) {
			afd_category.append( { type:'option', label:'转交自快速删除候选', value:'fwdcsd' } );
		}


		work_area.append( {
				type: 'input',
				name: 'mergeinto',
				label: '合并到：',
				disabled: true
			} );
		appendReasonBox();
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	case 'ffd':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '文件存废讨论',
				name: 'work_area'
			} );
		appendReasonBox();
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	default:
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '未定义',
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
		e.target.form.mergeinto.previousElementSibling.innerHTML = '合并到：';
	} else if( e.target.value === 'fwdcsd' ) {
		e.target.form.mergeinto.disabled = false;
		e.target.form.mergeinto.previousElementSibling.innerHTML = '提交人：';
		
	} else {
		e.target.form.mergeinto.disabled = true;
	}
}

Twinkle.xfd.callbacks = {
	afd: {
		main: function(pageobj) {
			// this is coming in from lookupCreator...!
			var params = pageobj.getCallbackParameters();

			// Adding discussion
			wikipedia_page = new Morebits.wiki.page(params.logpage, "添加讨论到当日列表");
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.todaysList);

			// Notification to first contributor
			if(params.usertalk) {
				var initialContrib = pageobj.getCreator();

				// Disallow warning yourself
				if (initialContrib === mw.config.get('wgUserName')) {
					pageobj.getStatusElement().warn("您（" + initialContrib + "）创建了该页，跳过通知");
					return;
				}

				var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
				var notifytext = "\n{{subst:AFDNote|" + Morebits.pageNameNorm + "}}--~~~~";
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary("通知：页面[[" + Morebits.pageNameNorm + "]]存废讨论提名。" + Twinkle.getPref('summaryAd'));
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
			}
		},
		taggingArticle: function(pageobj) {
			if (!pageobj.exists()) {
				statelem.error("页面不存在，可能已被删除");
				return;
			}
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
			} else {
				tag += '\n';
			}

			// Then, test if there are speedy deletion-related templates on the article.
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[\- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
			if (text !== textNoSd && confirm("在页面上找到快速删除模板，要移除吗？")) {
				text = textNoSd;
			}

			pageobj.setPageText(tag + text);
			pageobj.setEditSummary("页面存废讨论：[[" + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
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
			pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]。" + Twinkle.getPref('summaryAd'));
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
		}
	},

	ffd: {
		main: function(pageobj) {
			// this is coming in from lookupCreator...!
			var params = pageobj.getCallbackParameters();
			var initialContrib = pageobj.getCreator();
			params.uploader = initialContrib;

			// Adding discussion
			wikipedia_page = new Morebits.wiki.page(params.logpage, "添加讨论到当日列表");
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.ffd.todaysList);

			// Notification to first contributor
			if(params.usertalk) {
				// Disallow warning yourself
				if (initialContrib === mw.config.get('wgUserName')) {
					pageobj.getStatusElement().warn("您（" + initialContrib + "）创建了该页，跳过通知");
					return;
				}

				var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
				var notifytext = "\n{{subst:idw|File:" + mw.config.get('wgTitle') + "}}--~~~~";
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary("通知：文件[[" + Morebits.pageNameNorm + "]]存废讨论提名。" + Twinkle.getPref('summaryAd'));
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
			}
		},
		taggingImage: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			pageobj.setPageText("{{ifd|" + Morebits.string.formatReasonText(params.reason) + "|date={{subst:#time:c}}}}\n" + text);
			pageobj.setEditSummary("文件存废讨论：[[" + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
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
			pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]。" + Twinkle.getPref('summaryAd'));
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
		}
	}
};



Twinkle.xfd.callback.evaluate = function(e) {
	var type = e.target.category.value;
	var usertalk = e.target.notify.checked;
	var reason = e.target.xfdreason.value;
	var xfdcat, mergeinto, noinclude;
	if( type === 'afd' ) {
		var noinclude = e.target.noinclude.checked
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
	var date = new Date();
	function twodigits(num) {
		return num < 10 ? '0' + num : num;
	};
	switch( type ) {

	case 'afd': // AFD
		var dateString = date.getUTCFullYear() + '/' + twodigits(date.getUTCMonth() + 1) + '/' + twodigits(date.getUTCDate());
		logpage = 'Wikipedia:頁面存廢討論/記錄/' + dateString;
		params = { usertalk: usertalk, xfdcat: xfdcat, mergeinto: mergeinto, noinclude: noinclude, reason: reason, logpage: logpage };

		Morebits.wiki.addCheckpoint();
		// Updating data for the action completed event
		Morebits.wiki.actionCompleted.redirect = logpage;
		Morebits.wiki.actionCompleted.notice = "提名完成，重定向到讨论页";

		// Tagging file
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "添加存废讨论模板到页面");
		wikipedia_page.setFollowRedirect(false);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.afd.taggingArticle);

		// Notification to first contributor
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.afd.main);

		Morebits.wiki.removeCheckpoint();
		break;

	case 'ffd': // FFD
		var dateString = date.getUTCFullYear() + '/' + twodigits(date.getUTCMonth() + 1) + '/' + twodigits(date.getUTCDate());
		logpage = 'Wikipedia:檔案存廢討論/記錄/' + dateString;
		params = { usertalk: usertalk, reason: reason, logpage: logpage };

		Morebits.wiki.addCheckpoint();
		// Updating data for the action completed event
		Morebits.wiki.actionCompleted.redirect = logpage;
		Morebits.wiki.actionCompleted.notice = "提名完成，重定向到讨论页";

		// Tagging file
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "添加存废讨论模板到文件描述页");
		wikipedia_page.setFollowRedirect(false);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.ffd.taggingImage);

		// Contributor specific edits
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.ffd.main);

		Morebits.wiki.removeCheckpoint();
		break;

	default:
		alert("twinklexfd：未定义的类别");
		break;
	}
};
})(jQuery);


//</nowiki>
