//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleunlink.js: Unlink module
 ****************************************
 * Mode of invocation:     Tab ("Unlink")
 * Active on:              Non-special pages, except Wikipedia:Sandbox
 * Config directives in:   TwinkleConfig
 */

Twinkle.unlink = function twinkleunlink() {
	if( mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageName') === Twinkle.getPref("sandboxPage") ) {
		return;
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		Twinkle.addPortletLink( Twinkle.unlink.callback, wgULS("链入", "連入"), "tw-unlink", wgULS("取消到本页的链接", "取消到本頁的連結") );
	}
};

Twinkle.unlink.getChecked2 = function twinkleunlinkGetChecked2( nodelist ) {
	if( !( nodelist instanceof NodeList ) && !( nodelist instanceof HTMLCollection ) ) {
		return nodelist.checked ? [ nodelist.values ] : [];
	}
	var result = [];
	for(var i  = 0; i < nodelist.length; ++i ) {
		if( nodelist[i].checked ) {
			result.push( nodelist[i].values );
		}
	}
	return result;
};

// the parameter is used when invoking unlink from admin speedy
Twinkle.unlink.callback = function(presetReason) {
	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( wgULS("取消链入", "取消連入") + (mw.config.get('wgNamespaceNumber') === 6 ? wgULS("和文件使用", "和檔案使用") : "") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#unlink" );

	var form = new Morebits.quickForm( Twinkle.unlink.callback.evaluate );

	// prepend some basic documentation
	var node1 = Morebits.htmlNode("code", "[[" + Morebits.pageNameNorm + wgULS("|链接文本]]", "|連結文本]]"));
	var node2 = Morebits.htmlNode("code", wgULS("链接文本", "連結文本"));
	node1.style.fontFamily = node2.style.fontFamily = "monospace";
	node1.style.fontStyle = node2.style.fontStyle = "normal";
	form.append( {
		type: 'div',
		style: 'margin-bottom: 0.5em',
		label: [
			wgULS('这个工具可以取消所有指向该页的链接（“链入”）', '這個工具可以取消所有指向該頁的連結（「連入」）') +
				(mw.config.get('wgNamespaceNumber') === 6 ? wgULS("，和/或通过加入<!-- -->注释标记隐藏所有对此文件的使用", "，和/或通過加入<!-- -->注釋標記隱藏所有對此檔案的使用") : "") +
				"。比如，",
			node1,
			wgULS("将会变成", "將會變成"),
			node2,
			wgULS("。请小心使用。", "。請小心使用。")
		]
	} );

	form.append( {
		type: 'input',
		name: 'reason',
		label: '理由：',
		value: (presetReason ? presetReason : ''),
		size: 60
	} );

	var query;
	if(mw.config.get('wgNamespaceNumber') === 6) {  // File:
		query = {
			'action': 'query',
			'list': [ 'backlinks', 'imageusage' ],
			'bltitle': Morebits.pageNameNorm,
			'iutitle': Morebits.pageNameNorm,
			'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'iulimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces'),
			'iunamespace': Twinkle.getPref('unlinkNamespaces'),
			'rawcontinue': true
		};
	} else {
		query = {
			'action': 'query',
			'list': 'backlinks',
			'bltitle': Morebits.pageNameNorm,
			'blfilterredir': 'nonredirects',
			'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces'),
			'rawcontinue': true
		};
	}
	var wikipedia_api = new Morebits.wiki.api( wgULS('抓取链入', '擷取連入'), query, Twinkle.unlink.callbacks.display.backlinks );
	wikipedia_api.params = { form: form, Window: Window, image: mw.config.get('wgNamespaceNumber') === 6 };
	wikipedia_api.post();

	var root = document.createElement( 'div' );
	root.style.padding = '15px';  // just so it doesn't look broken
	Morebits.status.init( root );
	wikipedia_api.statelem.status( wgULS("加载中…", "載入中…") );
	Window.setContent( root );
	Window.display();
};

Twinkle.unlink.callback.evaluate = function twinkleunlinkCallbackEvaluate(event) {
	var reason = event.target.reason.value;
	if (!reason) {
		alert(wgULS("您必须指定取消链入的理由。", "您必須指定取消連入的理由。"));
		return;
	}

	var backlinks = [], imageusage = [];
	if( event.target.backlinks ) {
		backlinks = Twinkle.unlink.getChecked2(event.target.backlinks);
	}
	if( event.target.imageusage ) {
		imageusage = Twinkle.unlink.getChecked2(event.target.imageusage);
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( event.target );

	var pages = Morebits.array.uniq(backlinks.concat(imageusage));

	var unlinker = new Morebits.batchOperation(wgULS("取消链入", "取消連入") + (imageusage ? wgULS("与文件使用", "與檔案使用") : ""));
	unlinker.setOption("preserveIndividualStatusLines", true);
	unlinker.setPageList(pages);
	var params = { reason: reason, unlinker: unlinker };
	unlinker.run(function(pageName) {
		var wikipedia_page = new Morebits.wiki.page(pageName, wgULS("在条目“" + pageName + "”中取消链入", "在條目「" + pageName + "」中取消連入"));
		wikipedia_page.setBotEdit(true);  // unlink considered a floody operation
		var innerParams = $.extend({}, params);
		innerParams.doBacklinks = backlinks && backlinks.indexOf(pageName) !== -1;
		innerParams.doImageusage = imageusage && imageusage.indexOf(pageName) !== -1;
		wikipedia_page.setCallbackParameters(innerParams);
		wikipedia_page.load(Twinkle.unlink.callbacks.unlinkBacklinks);
	});
};

Twinkle.unlink.callbacks = {
	display: {
		backlinks: function twinkleunlinkCallbackDisplayBacklinks(apiobj) {
			var xmlDoc = apiobj.responseXML;
			var havecontent = false;
			var list, namespaces, i;

			if( apiobj.params.image ) {
				var imageusage = $(xmlDoc).find('query imageusage iu');
				list = [];
				for ( i = 0; i < imageusage.length; ++i ) {
					var usagetitle = imageusage[i].getAttribute('title');
					list.push( { label: usagetitle, value: usagetitle, checked: true } );
				}
				if (!list.length)
				{
					apiobj.params.form.append( { type: 'div', label: wgULS('未找到文件使用。', '未找到檔案使用。') } );
				}
				else
				{
					apiobj.params.form.append( { type:'header', label: wgULS('文件使用', '檔案使用') } );
					namespaces = [];
					$.each(Twinkle.getPref('unlinkNamespaces'), function(k, v) {
						namespaces.push(Morebits.wikipedia.namespacesFriendly[v]);
					});
					apiobj.params.form.append( {
						type: 'div',
						label: wgULS("已选择的命名空间：", "已選擇的名字空間：") + namespaces.join(', '),
						tooltip: wgULS("您可在Twinkle属性中更改这个，请参见[[WP:TWPREFS]]", "您可在Twinkle屬性中更改這個，請參見[[WP:TWPREFS]]")
					});
					if ($(xmlDoc).find('query-continue').length) {
						apiobj.params.form.append( {
							type: 'div',
							label: wgULS("显示头 " + list.length.toString() + " 个文件使用。", "顯示頭 " + list.length.toString() + " 個檔案使用。")
						});
					}
					apiobj.params.form.append({
						type: 'button',
						label: wgULS("全选", "全選"),
						event: function(e) {
							$(Morebits.quickForm.getElements(e.target.form, "imageusage")).prop('checked', true);
						}
					});
					apiobj.params.form.append({
						type: 'button',
						label: wgULS("全不选", "全不選"),
						event: function(e) {
							$(Morebits.quickForm.getElements(e.target.form, "imageusage")).prop('checked', false);
						}
					});
					apiobj.params.form.append({
						type: 'checkbox',
						name: 'imageusage',
						list: list
					});
					havecontent = true;
				}
			}

			var backlinks = $(xmlDoc).find('query backlinks bl');
			if( backlinks.length > 0 ) {
				list = [];
				for ( i = 0; i < backlinks.length; ++i ) {
					var title = backlinks[i].getAttribute('title');
					list.push( { label: title, value: title, checked: true } );
				}
				apiobj.params.form.append( { type:'header', label: 'Backlinks' } );
				namespaces = [];
				$.each(Twinkle.getPref('unlinkNamespaces'), function(k, v) {
					namespaces.push(Morebits.wikipedia.namespacesFriendly[v]);
				});
				apiobj.params.form.append( {
					type: 'div',
					label: wgULS("已选择的名字空间：", "已選擇的名字空間：") + namespaces.join(', '),
					tooltip: wgULS("您可在Twinkle属性中更改这个，请参见[[WP:TWPREFS]]", "您可在Twinkle屬性中更改這個，請參見[[WP:TWPREFS]]")
				});
				if ($(xmlDoc).find('query-continue').length) {
					apiobj.params.form.append( {
						type: 'div',
						label: wgULS("显示头 " + list.length.toString() + " 个链入。", "顯示頭 " + list.length.toString() + " 個連入。")
					});
				}
				apiobj.params.form.append({
					type: 'button',
					label: wgULS("全选", "全選"),
						event: function(e) {
							$(Morebits.quickForm.getElements(e.target.form, "backlinks")).prop('checked', true);
						}
				});
				apiobj.params.form.append({
					type: 'button',
					label: wgULS("全不选", "全不選"),
						event: function(e) {
							$(Morebits.quickForm.getElements(e.target.form, "backlinks")).prop('checked', false);
						}
				});
				apiobj.params.form.append({
					type: 'checkbox',
					name: 'backlinks',
					list: list
				});
				havecontent = true;
			}
			else
			{
				apiobj.params.form.append( { type: 'div', label: wgULS('未找到链入。', '未找到連入。') } );
			}

			if (havecontent) {
				apiobj.params.form.append( { type:'submit' } );
			}

			var result = apiobj.params.form.render();
			apiobj.params.Window.setContent( result );

			Morebits.checkboxShiftClickSupport($("input[name='imageusage']", result));
			Morebits.checkboxShiftClickSupport($("input[name='backlinks']", result));

		}
	},
	unlinkBacklinks: function twinkleunlinkCallbackUnlinkBacklinks(pageobj) {
		var oldtext = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var wikiPage = new Morebits.wikitext.page(oldtext);

		var summaryText = "", warningString = false;
		var text;

		// remove image usages
		if (params.doImageusage) {
			wikiPage.commentOutImage(mw.config.get('wgTitle'), wgULS('注释出', '注釋出'));
			text = wikiPage.getText();
			// did we actually make any changes?
			if (text === oldtext) {
				warningString = wgULS("文件使用", "檔案使用");
			} else {
				summaryText = wgULS("注释出文件使用", "注釋出檔案使用");
				oldtext = text;
			}
		}

		// remove backlinks
		if (params.doBacklinks) {
			wikiPage.removeLink(Morebits.pageNameNorm);
			text = wikiPage.getText();
			// did we actually make any changes?
			if (text === oldtext) {
				warningString = (warningString ? wgULS("反链或文件使用", "反連或檔案使用") : wgULS("反链", "反連"));
			} else {
				summaryText = (summaryText ? (summaryText + " / ") : "") + wgULS("取消链接到", "取消連結到");
				oldtext = text;
			}
		}

		if (warningString) {
			// nothing to do!
			pageobj.getStatusElement().error(wgULS("未能在页面上找到", "未能在頁面上找到") + warningString + "。");
			params.unlinker.workerFailure(pageobj);
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText + " \"" + Morebits.pageNameNorm + "\": " + params.reason + "." + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	}
};
})(jQuery);


//</nowiki>
