//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklebatchdelete.js: Batch delete module (sysops only)
 ****************************************
 * Mode of invocation:     Tab ("D-batch")
 * Active on:              Existing and non-existing non-articles, and Special:PrefixIndex
 * Config directives in:   TwinkleConfig
 */


Twinkle.batchdelete = function twinklebatchdelete() {
	if( Morebits.userIsInGroup( 'sysop' ) && (mw.config.get( 'wgNamespaceNumber' ) > 0 || mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Prefixindex') ) {
		Twinkle.addPortletLink( Twinkle.batchdelete.callback, "批删", "tw-batch", "删除此分类或页面中的所有链接" );
	}
};

Twinkle.batchdelete.unlinkCache = {};
Twinkle.batchdelete.callback = function twinklebatchdeleteCallback() {
	var Window = new Morebits.simpleWindow( 600, 400 );
	Window.setTitle( "批量删除" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#batchdelete" );

	var form = new Morebits.quickForm( Twinkle.batchdelete.callback.evaluate );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '删除页面',
					name: 'delete_page',
					value: 'delete',
					checked: true
				},
				{
					label: '取消链入',
					name: 'unlink_page',
					value: 'unlink',
					checked: true
				},
				{
					label: '删除重定向',
					name: 'delete_redirects',
					value: 'delete_redirects',
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

	var query;
	if( mw.config.get( 'wgNamespaceNumber' ) === 14 ) {  // Category:

		query = {
			'action': 'query',
			'generator': 'categorymembers',
			'gcmtitle': mw.config.get( 'wgPageName' ),
			'gcmlimit' : Twinkle.getPref('batchMax'), // the max for sysops
			'prop': [ 'categories', 'revisions' ],
			'rvprop': [ 'size' ]
		};
	} else if( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Prefixindex' ) {

		var gapnamespace, gapprefix;
		if(Morebits.queryString.exists( 'prefix' ) )
		{
			gapnamespace = Morebits.queryString.get( 'namespace' );
			gapprefix = Morebits.string.toUpperCaseFirstChar( Morebits.queryString.get( 'prefix' ) );
		}
		else
		{
			var pathSplit = decodeURIComponent(location.pathname).split('/');
			if (pathSplit.length < 3 ) {//|| pathSplit[2] !== "Special:PrefixIndex") {
				return;
			}
			var titleSplit = pathSplit[3].split(':');
			gapnamespace = mw.config.get("wgNamespaceIds")[titleSplit[0].toLowerCase()];
			if ( titleSplit.length < 2 || typeof gapnamespace === 'undefined' )
			{
				gapnamespace = 0;  // article namespace
				gapprefix = pathSplit.splice(3).join('/');
			}
			else
			{
				pathSplit = pathSplit.splice(4);
				pathSplit.splice(0,0,titleSplit.splice(1).join(':'));
				gapprefix = pathSplit.join('/');
			}
		}

		query = {
			'action': 'query',
			'generator': 'allpages',
			'gapnamespace': gapnamespace ,
			'gapprefix': gapprefix,
			'gaplimit' : Twinkle.getPref('batchMax'), // the max for sysops
			'prop' : 'revisions|info',
			'inprop': 'protection',
			'rvprop': 'size'
		};
	} else {
		query = {
			'action': 'query',
			'generator': 'links',
			'titles': mw.config.get( 'wgPageName' ),
			'gpllimit' : Twinkle.getPref('batchMax'), // the max for sysops
			'prop': 'revisions|info',
			'inprop': 'protection',
			'rvprop': 'size'
		};
	}

	var statusdiv = document.createElement( 'div' );
	statusdiv.style.padding = '15px';  // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.status.init(statusdiv);
	Window.display();

	var statelem = new Morebits.status("抓取页面列表");
	var wikipedia_api = new Morebits.wiki.api( '载入中…', query, function( apiobj ) {
			var xmlDoc = apiobj.responseXML;
			var $pages = $(xml).find('page').filter(':not([missing])');
			var list = [];
			$pages.each(function(index, page) {
				var $page = $(page);
				var title = $page.attr('title');
				var isRedir = $page.attr('redirect') === "";
				var $editprot = $page.find('pr[type="edit"][level="sysop"]');
				var protected = $editprot.length > 0;
				var size = $page.find('rev').attr('size');

				var metadata = [];
				if (isRedir) {
					metadata.push("重定向");
				}
				if (protected) {
					metadata.push("全保护，" + 
						($editprot.attr('expiry') === 'infinity' ? '无限期' : ('过期时间' + $editprot.attr('expiry'))));
				}
				metadata.push(size + "字节");
				list.push({
					label: title + (metadata.length ? ('（' + metadata.join('，') + '）') : ''),
					value: title,
					checked: true,
					style: (protected ? 'color:red' : '')
				});
			});

			apiobj.params.form.append({ type: 'header', label: '待删除页面' });
			apiobj.params.form.append({
					type: 'button',
					label: "全选",
					event: function(e) {
						$(Morebits.quickForm.getElements(e.target.form, "pages")).prop('checked', true);
					}
				});
			apiobj.params.form.append({
					type: 'button',
					label: "全不选",
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

Twinkle.batchdelete.currentDeleteCounter = 0;
Twinkle.batchdelete.currentUnlinkCounter = 0;
Twinkle.batchdelete.currentdeletor = 0;
Twinkle.batchdelete.callback.evaluate = function twinklebatchdeleteCallbackEvaluate(event) {
	Morebits.wiki.actionCompleted.notice = '状态';
	Morebits.wiki.actionCompleted.postfix = '批量删除已完成';

	var numProtected = $(Morebits.quickForm.getElements(event.target, 'pages')).filter(function(index, element) {
		return element.checked && element.nextElementSibling.style.color === 'red';
	}).length;
	if (numProtected > 0 && !confirm("您即将删除" + numProtected + "个全保护页面，确定？")) {
		return;
	}

	var pages = event.target.getChecked( 'pages' );
	var reason = event.target.reason.value;
	var delete_page = event.target.delete_page.checked;
	var unlink_page = event.target.unlink_page.checked;
	var delete_redirects = event.target.delete_redirects.checked;
	if( ! reason ) {
		alert("您需要给出理由！");
		return;
	}
	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( event.target );
	if( !pages ) {
		Morebits.status.error( '错误', '没什么要删的，取消操作' );
		return;
	}

	function toCall( work ) {
		if( work.length === 0 &&  Twinkle.batchdelete.currentDeleteCounter <= 0 && Twinkle.batchdelete.currentUnlinkCounter <= 0 ) {
			window.clearInterval( Twinkle.batchdelete.currentdeletor );
			Morebits.wiki.removeCheckpoint();
			return;
		} else if( work.length !== 0 && ( Twinkle.batchdelete.currentDeleteCounter <= Twinkle.getPref('batchDeleteMinCutOff') || Twinkle.batchdelete.currentUnlinkCounter <= Twinkle.getPref('batchDeleteMinCutOff')  ) ) {
			Twinkle.batchdelete.unlinkCache = []; // Clear the cache
			var pages = work.shift();
			Twinkle.batchdelete.currentDeleteCounter += pages.length;
			Twinkle.batchdelete.currentUnlinkCounter += pages.length;
			for( var i = 0; i < pages.length; ++i ) {
				var page = pages[i];
				var params = { page:page, reason:reason };
				
				var query, wikipedia_api;
				if( unlink_page ) {
					query = {
						'action': 'query',
						'list': 'backlinks',
						'blfilterredir': 'nonredirects',
						'blnamespace': [0, 100], // main space and portal space only
						'bltitle': page,
						'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500 // 500 is max for normal users, 5000 for bots and sysops
					};
					wikipedia_api = new Morebits.wiki.api( '抓取反向链接', query, Twinkle.batchdelete.callbacks.unlinkBacklinksMain );
					wikipedia_api.params = params;
					wikipedia_api.post();
				} else {
					--Twinkle.batchdelete.currentUnlinkCounter;
				}
				if( delete_page ) {
					if (delete_redirects)
					{
						query = {
							'action': 'query',
							'list': 'backlinks',
							'blfilterredir': 'redirects',
							'bltitle': page,
							'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500 // 500 is max for normal users, 5000 for bots and sysops
						};
						wikipedia_api = new Morebits.wiki.api( '抓取重定向', query, Twinkle.batchdelete.callbacks.deleteRedirectsMain );
						wikipedia_api.params = params;
						wikipedia_api.post();
					}

					var wikipedia_page = new Morebits.wiki.page( page, '删除页面 ' + page );
					wikipedia_page.setEditSummary(reason + Twinkle.getPref('deletionSummaryAd'));
					wikipedia_page.suppressProtectWarning();
					wikipedia_page.deletePage(function( apiobj ) {
							--Twinkle.batchdelete.currentDeleteCounter;
							var link = document.createElement( 'a' );
							var innerPage = apiobj.parent.getPageName();
							link.setAttribute( 'href', mw.util.getUrl( innerPage ) );
							link.setAttribute( 'title', innerPage );
							link.appendChild( document.createTextNode( innerPage ) );
							apiobj.getStatusElement().info( [ '完成（' , link , '）' ] );
						} );
				} else {
					--Twinkle.batchdelete.currentDeleteCounter;
				}
			}
		}
	}
	var work = Morebits.array.chunk( pages, Twinkle.getPref('batchdeleteChunks') );
	Morebits.wiki.addCheckpoint();
	Twinkle.batchdelete.currentdeletor = window.setInterval( toCall, 1000, work );
};

Twinkle.batchdelete.callbacks = {
	deleteRedirectsMain: function( self ) {
		var xmlDoc = self.responseXML;
		var snapshot = xmlDoc.evaluate('//backlinks/bl/@title', xmlDoc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );

		var total = snapshot.snapshotLength;

		if( snapshot.snapshotLength === 0 ) {
			return;
		}

		var statusIndicator = new Morebits.status('删除到 ' + self.params.page + ' 的重定向', '0%');

		var onsuccess = function( self ) {
			var obj = self.params.obj;
			var total = self.params.total;
			var now = parseInt( 100 * ++(self.params.current)/total, 10 ) + '%';
			obj.update( now );
			self.statelem.unlink();
			if( self.params.current >= total ) {
				obj.info( now + '（完成）' );
				Morebits.wiki.removeCheckpoint();
			}
		};


		Morebits.wiki.addCheckpoint();
		if( snapshot.snapshotLength === 0 ) {
			statusIndicator.info( '100%（完成）' );
			Morebits.wiki.removeCheckpoint();
			return;
		}

		var params = $.extend({}, self.params);
		params.current = 0;
		params.total = total;
		params.obj = statusIndicator;


		for ( var i = 0; i < snapshot.snapshotLength; ++i ) {
			var title = snapshot.snapshotItem(i).value;
			var wikipedia_page = new Morebits.wiki.page( title, "删除 " + title );
			wikipedia_page.setEditSummary('[[WP:CSD#G15|G15]]: 孤立页面: 重定向到已删除页面“' + self.params.page + '”' + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.deletePage(onsuccess);
		}
	},
	unlinkBacklinksMain: function( self ) {
		var xmlDoc = self.responseXML;
		var snapshot = xmlDoc.evaluate('//backlinks/bl/@title', xmlDoc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );

		if( snapshot.snapshotLength === 0 ) {
			--Twinkle.batchdelete.currentUnlinkCounter;
			return;
		}

		var statusIndicator = new Morebits.status('取消到 ' + self.params.page + ' 的链接', '0%');

		var total = snapshot.snapshotLength * 2;

		var onsuccess = function( self ) {
			var obj = self.params.obj;
			var total = self.params.total;
			var now = parseInt( 100 * ++(self.params.current)/total, 10 ) + '%';
			obj.update( now );
			self.statelem.unlink();
			if( self.params.current >= total ) {
				obj.info( now + '（完成）' );
				--Twinkle.batchdelete.currentUnlinkCounter;
				Morebits.wiki.removeCheckpoint();
			}
		};

		Morebits.wiki.addCheckpoint();
		if( snapshot.snapshotLength === 0 ) {
			statusIndicator.info( '100%（完成）' );
			--Twinkle.batchdelete.currentUnlinkCounter;
			Morebits.wiki.removeCheckpoint();
			return;
		}
		self.params.total = total;
		self.params.obj = statusIndicator;
		self.params.current =   0;

		for ( var i = 0; i < snapshot.snapshotLength; ++i ) {
			var title = snapshot.snapshotItem(i).value;
			var wikipedia_page = new Morebits.wiki.page( title, "在页面 " + title + " 中" );
			var params = $.extend( {}, self.params );
			params.title = title;
			params.onsuccess = onsuccess;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkBacklinks);
		}
	},
	unlinkBacklinks: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		if( ! pageobj.exists() ) {
			// we probably just deleted it, as a recursive backlink
			params.onsuccess( { params: params, statelem: pageobj.getStatusElement() } );
			Morebits.wiki.actionCompleted();
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
			params.onsuccess( { params: params, statelem: pageobj.getStatusElement() } );
			Morebits.wiki.actionCompleted();
			return;
		}
		pageobj.setEditSummary('取消到页面 ' + params.page + ' 的链接' + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.save(params.onsuccess);
	}
};
})(jQuery);


//</nowiki>
