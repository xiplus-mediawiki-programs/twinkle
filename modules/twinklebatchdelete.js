//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklebatchdelete.js: Batch delete module (sysops only)
 ****************************************
 * Mode of invocation:     Tab ("D-batch")
 * Active on:              Existing non-articles, and Special:PrefixIndex
 * Config directives in:   TwinkleConfig
 */

Twinkle.batchdelete = function twinklebatchdelete() {
	if(
		Morebits.userIsInGroup( 'sysop' ) && (
			( mw.config.get( 'wgCurRevisionId' ) && mw.config.get( 'wgNamespaceNumber' ) > 0 ) ||
			mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Prefixindex'
		)
	) {
		Twinkle.addPortletLink( Twinkle.batchdelete.callback, wgULS("批删", "批刪"), "tw-batch", wgULS("删除此分类或页面中的所有链接", "刪除此分類或頁面中的所有連結") );
	}
};

Twinkle.batchdelete.unlinkCache = {};
Twinkle.batchdelete.callback = function twinklebatchdeleteCallback() {
	var Window = new Morebits.simpleWindow( 600, 400 );
	Window.setTitle( wgULS("批量删除", "批量刪除") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#batchdelete" );

	var form = new Morebits.quickForm( Twinkle.batchdelete.callback.evaluate );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: wgULS('删除页面', '刪除頁面'),
					name: 'delete_page',
					value: 'delete',
					checked: true,
					subgroup: {
						type: 'checkbox',
						list: [
							{
								label: wgULS('删除关联的讨论页（用户对话页除外）', '刪除關聯的討論頁（用戶對話頁除外）'),
								name: 'delete_talk',
								value: 'delete_talk',
								checked: true
							},
							{
								label: wgULS('删除重定向', '刪除重定向'),
								name: 'delete_redirects',
								value: 'delete_redirects',
								checked: true
							}
						]
					}
				},
				{
					label: wgULS('取消链入（仅处理条目及Portal命名空间）', '取消連入（僅處理條目及Portal名字空間）'),
					name: 'unlink_page',
					value: 'unlink',
					checked: false
				},
				{
					label: wgULS('移除文件使用（所有命名空间）', '移除檔案使用（所有名字空間）'),
					name: 'unlink_file',
					value: 'unlink_file',
					checked: true
				}
			]
		} );
	form.append( {
			type: 'input',
			name: 'reason',
			label: '理由：',
			size: 60
		} );

	var query = {
		'action': 'query',
		'prop': 'revisions|info|imageinfo',
		'inprop': 'protection',
		'rvprop': 'size|user'
	};
	if( mw.config.get( 'wgNamespaceNumber' ) === 14 ) {  // Category:
		query.generator = 'categorymembers';
		query.gcmtitle = mw.config.get('wgPageName');
		query.gcmlimit = Twinkle.getPref('batchMax'); // the max for sysops
	} else if( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Prefixindex' ) {

		query.generator = 'allpages';
		query.gaplimit = Twinkle.getPref('batchMax'); // the max for sysops
		if(Morebits.queryString.exists( 'prefix' ) )
		{
			query.gapnamespace = Morebits.queryString.get( 'namespace' );
			query.gapprefix = Morebits.string.toUpperCaseFirstChar( Morebits.queryString.get( 'prefix' ) );
		}
		else
		{
			var pathSplit = decodeURIComponent(location.pathname).split('/');
			if (pathSplit.length < 3 ) {//|| pathSplit[2] !== "Special:PrefixIndex") {
				return;
			}
			var titleSplit = pathSplit[3].split(':');
			query.gapnamespace = mw.config.get("wgNamespaceIds")[titleSplit[0].toLowerCase()];
			if ( titleSplit.length < 2 || typeof query.gapnamespace === 'undefined' )
			{
				query.gapnamespace = 0;  // article namespace
				query.gapprefix = pathSplit.splice(3).join('/');
			}
			else
			{
				pathSplit = pathSplit.splice(4);
				pathSplit.splice(0,0,titleSplit.splice(1).join(':'));
				query.gapprefix = pathSplit.join('/');
			}
		}
	} else {
		query.generator = 'links';
		query.titles = mw.config.get('wgPageName');
		query.gpllimit = Twinkle.getPref('batchMax'); // the max for sysops
	}

	var statusdiv = document.createElement( 'div' );
	statusdiv.style.padding = '15px';  // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.status.init(statusdiv);
	Window.display();

	var statelem = new Morebits.status(wgULS("抓取页面列表", "擷取頁面列表"));
	var wikipedia_api = new Morebits.wiki.api( wgULS('加载中…', '載入中…'), query, function( apiobj ) {
			var xml = apiobj.responseXML;
			var $pages = $(xml).find('page').filter(':not([missing])');  // :not([imagerepository="shared"])
			var list = [];
			$pages.each(function(index, page) {
				var $page = $(page);
				var ns = $page.attr('ns');
				var title = $page.attr('title');
				var isRedir = $page.attr('redirect') === "";
				var $editprot = $page.find('pr[type="edit"][level="sysop"]');
				var isProtected = $editprot.length > 0;
				var size = $page.find('rev').attr('size');

				var metadata = [];
				if (isRedir) {
					metadata.push("重定向");
				}
				if (isProtected) {
					metadata.push(wgULS("全保护，", "全保護，") +
						($editprot.attr('expiry') === 'infinity' ? wgULS('无限期', '無限期') : (wgULS('过期时间', '過期時間') + $editprot.attr('expiry'))));
				}
				if (ns === "6") {  // mimic what delimages used to show for files
					metadata.push(wgULS("上传者：", "上傳者：") + $page.find('ii').attr('user'));
					metadata.push(wgULS("最后编辑：", "最後編輯：") + $page.find('rev').attr('user'));
				} else {
					metadata.push(size + wgULS("字节", "位元組"));
				}
				list.push({
					label: title + (metadata.length ? ('（' + metadata.join('，') + '）') : ''),
					value: title,
					checked: true,
					style: (isProtected ? 'color:red' : '')
				});
			});

			apiobj.params.form.append({ type: 'header', label: wgULS('待删除页面', '待刪除頁面') });
			apiobj.params.form.append({
					type: 'button',
					label: wgULS("全选", "全選"),
					event: function(e) {
						$(Morebits.quickForm.getElements(e.target.form, "pages")).prop('checked', true);
					}
				});
			apiobj.params.form.append({
					type: 'button',
					label: wgULS("全不选", "全不選"),
					event: function(e) {
						$(Morebits.quickForm.getElements(e.target.form, "pages")).prop('checked', false);
					}
				});
			apiobj.params.form.append( {
					type: 'checkbox',
					name: 'pages',
					list: list
				} );
			apiobj.params.form.append( { type:'submit' } );

			var result = apiobj.params.form.render();
			apiobj.params.Window.setContent( result );

			Morebits.checkboxShiftClickSupport(Morebits.quickForm.getElements(result, 'pages'));
		}, statelem );

	wikipedia_api.params = { form:form, Window:Window };
	wikipedia_api.post();
};

Twinkle.batchdelete.callback.evaluate = function twinklebatchdeleteCallbackEvaluate(event) {
	Morebits.wiki.actionCompleted.notice = wgULS('状态', '狀態');
	Morebits.wiki.actionCompleted.postfix = wgULS('批量删除已完成', '批量刪除已完成');

	var numProtected = $(Morebits.quickForm.getElements(event.target, 'pages')).filter(function(index, element) {
		return element.checked && element.nextElementSibling.style.color === 'red';
	}).length;
	if (numProtected > 0 && !confirm(wgULS("您即将删除" + numProtected + "个全保护页面，确定？", "您即將刪除" + numProtected + "個全保護頁面，確定？"))) {
		return;
	}

	var pages = event.target.getChecked( 'pages' );
	var reason = event.target.reason.value;
	var delete_page = event.target.delete_page.checked;
	var delete_talk = event.target.delete_talk && event.target.delete_talk.checked;
	var delete_redirects = event.target.delete_redirects && event.target.delete_redirects.checked;
	var unlink_page = event.target.unlink_page.checked;
	var unlink_file = event.target.unlink_file.checked;
	if( ! reason ) {
		alert(wgULS("您需要给出理由！", "您需要給出理由！"));
		return;
	}
	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( event.target );
	if( !pages ) {
		Morebits.status.error( wgULS('错误', '錯誤'), wgULS('没什么要删的，取消操作', '沒什麼要刪的，取消操作') );
		return;
	}

	var pageDeleter = new Morebits.batchOperation(delete_page ? wgULS("正在删除页面", "正在刪除頁面") : wgULS("初始化作业请求", "初始化作業請求"));
	pageDeleter.setOption("chunkSize", Twinkle.getPref('batchdeleteChunks'));
	// we only need the initial status lines if we're deleting the pages in the pages array
	pageDeleter.setOption("preserveIndividualStatusLines", delete_page);
	pageDeleter.setPageList(pages);
	pageDeleter.run(function(pageName) {
		var params = {
			page: pageName,
			delete_page: delete_page,
			delete_talk: delete_talk,
			delete_redirects: delete_redirects,
			unlink_page: unlink_page,
			unlink_file: unlink_file && /^(File|Image):/i.test(pageName),
			reason: reason,
			pageDeleter: pageDeleter
		};

		var wikipedia_page = new Morebits.wiki.page( pageName, wgULS('删除页面', '刪除頁面') + pageName );
		wikipedia_page.setCallbackParameters(params);
		if( delete_page ) {
			wikipedia_page.setEditSummary(reason + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.suppressProtectWarning();
			wikipedia_page.deletePage(Twinkle.batchdelete.callbacks.doExtras, pageDeleter.workerFailure);
		} else {
			Twinkle.batchdelete.callbacks.doExtras(wikipedia_page);
		}
	});
};

Twinkle.batchdelete.callbacks = {
	// this stupid parameter name is a temporary thing until I implement an overhaul
	// of Morebits.wiki.* callback parameters
	doExtras: function( thingWithParameters ) {
		var params = thingWithParameters.parent ? thingWithParameters.parent.getCallbackParameters() :
			thingWithParameters.getCallbackParameters();
		// the initial batch operation's job is to delete the page, and that has
		// succeeded by now
		params.pageDeleter.workerSuccess(thingWithParameters);

		var query, wikipedia_api;

		if( params.unlink_page ) {
			Twinkle.batchdelete.unlinkCache = {};
			query = {
				'action': 'query',
				'list': 'backlinks',
				'blfilterredir': 'nonredirects',
				'blnamespace': [0, 100], // main space and portal space only
				'bltitle': params.page,
				'bllimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api( wgULS('抓取链入', '擷取連入'), query, Twinkle.batchdelete.callbacks.unlinkBacklinksMain );
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if( params.unlink_file ) {
			query = {
				'action': 'query',
				'list': 'imageusage',
				'iutitle': params.page,
				'iulimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api( wgULS('抓取文件链接', '擷取檔案連結'), query, Twinkle.batchdelete.callbacks.unlinkImageInstancesMain );
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if( params.delete_page ) {
			if ( params.delete_redirects ) {
				query = {
					'action': 'query',
					'titles': params.page,
					'prop': 'redirects',
					'rdlimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				wikipedia_api = new Morebits.wiki.api( wgULS('抓取重定向', '擷取重定向'), query, Twinkle.batchdelete.callbacks.deleteRedirectsMain );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
			if ( params.delete_talk ) {
				var pageTitle = mw.Title.newFromText(params.page);
				if (pageTitle && pageTitle.namespace % 2 === 0 && pageTitle.namespace !== 2) {
					pageTitle.namespace++;  // now pageTitle is the talk page title!
					query = {
						'action': 'query',
						'titles': pageTitle.toText()
					};
					wikipedia_api = new Morebits.wiki.api( wgULS('检查讨论页是否存在', '檢查討論頁是否存在'), query, Twinkle.batchdelete.callbacks.deleteTalk );
					wikipedia_api.params = params;
					wikipedia_api.params.talkPage = pageTitle.toText();
					wikipedia_api.post();
				}
			}
		}
	},
	deleteRedirectsMain: function( apiobj ) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('rd').map(function() { return $(this).attr('title'); }).get();
		if (!pages.length) {
			return;
		}

		var redirectDeleter = new Morebits.batchOperation(wgULS("删除到", "刪除到") + apiobj.params.page + "的重定向");
		redirectDeleter.setOption("chunkSize", Twinkle.getPref('batchdeleteChunks'));
		redirectDeleter.setPageList(pages);
		redirectDeleter.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, wgULS("删除", "刪除") + pageName);
			wikipedia_page.setEditSummary('[[WP:CSD#G15|G15]]: 孤立页面: 重定向到已删除页面“' + apiobj.params.page + '”' + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.deletePage(redirectDeleter.workerSuccess, redirectDeleter.workerFailure);
		});
	},
	deleteTalk: function( apiobj ) {
		var xml = apiobj.responseXML;
		var exists = $(xml).find('page:not([missing])').length > 0;

		if( !exists ) {
			// no talk page; forget about it
			return;
		}

		var page = new Morebits.wiki.page(apiobj.params.talkPage, wgULS("删除条目" + apiobj.params.page + "的讨论页", "刪除條目" + apiobj.params.page + "的討論頁"));
		page.setEditSummary('[[WP:CSD#G15|G15]]: 孤立页面: 已删除页面“' + apiobj.params.page + '”的讨论页' + Twinkle.getPref('deletionSummaryAd'));
		page.deletePage();
	},
	unlinkBacklinksMain: function( apiobj ) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('bl').map(function() { return $(this).attr('title'); }).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.batchOperation(wgULS("取消到" + apiobj.params.page + "的链入", "取消到" + apiobj.params.page + "的連入"));
		unlinker.setOption("chunkSize", Twinkle.getPref('batchdeleteChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, wgULS("取消链入于", "取消連入於") + pageName);
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkBacklinks);
		});
	},
	unlinkBacklinks: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		if( ! pageobj.exists() ) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var text;
		if( params.title in Twinkle.batchdelete.unlinkCache ) {
			text = Twinkle.batchdelete.unlinkCache[ params.title ];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.page( text );
		wikiPage.removeLink( params.page );

		text = wikiPage.getText();
		Twinkle.batchdelete.unlinkCache[ params.title ] = text;
		if( text === old_text ) {
			// Nothing to do, return
			params.unlinker.workerSuccess(pageobj);
			return;
		}
		pageobj.setEditSummary('取消到页面“' + params.page + '”的链接' + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	},
	unlinkImageInstancesMain: function( apiobj ) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('iu').map(function() { return $(this).attr('title'); }).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.batchOperation(wgULS("取消到" + apiobj.params.page + "的链入", "取消到" + apiobj.params.page + "的連入"));
		unlinker.setOption("chunkSize", Twinkle.getPref('batchdeleteChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, wgULS("移除文件使用于", "移除檔案使用於") + pageName);
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkImageInstances);
		});
	},
	unlinkImageInstances: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		if( ! pageobj.exists() ) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var image = params.image.replace( /^(?:Image|File):/, '' );
		var text;
		if( params.title in Twinkle.batchdelete.unlinkCache ) {
			text = Twinkle.batchdelete.unlinkCache[ params.title ];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.page( text );
		wikiPage.commentOutImage( image , wgULS('注释出文件，因其已被删除', '注釋出檔案，因其已被刪除') );

		text = wikiPage.getText();
		Twinkle.batchdelete.unlinkCache[ params.title ] = text;
		if( text === old_text ) {
			pageobj.getStatusElement().error( wgULS('未能取消文件' + image + '在' + pageobj.getPageName() + '的使用', '未能取消檔案' + image + '在' + pageobj.getPageName() + '的使用') );
			params.unlinker.workerFailure(pageobj);
			return;
		}
		pageobj.setEditSummary('移除对文件' + image + "的使用（" + params.reason + "）" + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	}
};
})(jQuery);


//</nowiki>
