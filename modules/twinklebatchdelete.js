/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** twinklebatchdelete.js: Batch delete module (sysops only)
 ****************************************
 * Mode of invocation:     Tab ("D-batch")
 * Active on:              Existing and non-existing non-articles, and Special:PrefixIndex
 * Config directives in:   TwinkleConfig
 */


Twinkle.batchdelete = function twinklebatchdelete() {
	if( Morebits.userIsInGroup( 'sysop' ) && (mw.config.get( 'wgNamespaceNumber' ) > 0 || mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Prefixindex') ) {
		twAddPortletLink( Twinkle.batchdelete.callback, "批删", "tw-batch", "删除此分类或页面中的所有链接" );
	}
};

Twinkle.batchdelete.unlinkCache = {};
Twinkle.batchdelete.callback = function twinklebatchdeleteCallback() {
	var Window = new Morebits.simpleWindow( 800, 400 );
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
			type: 'textarea',
			name: 'reason',
			label: '理由：'
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
		if(Morebits.queryString.exists( 'from' ) )
		{
			gapnamespace = Morebits.queryString.get( 'namespace' );
			gapprefix = Morebits.string.toUpperCaseFirstChar( Morebits.queryString.get( 'from' ) );
		}
		else
		{
			var pathSplit = location.pathname.split('/');
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
			'prop' : ['categories', 'revisions' ],
			'rvprop': [ 'size' ]
		};
	} else {
		query = {
			'action': 'query',
			'generator': 'links',
			'titles': mw.config.get( 'wgPageName' ),
			'gpllimit' : Twinkle.getPref('batchMax'), // the max for sysops
			'prop': [ 'categories', 'revisions' ],
			'rvprop': [ 'size' ]
		};
	}

	var wikipedia_api = new Morebits.wiki.api( '抓取页面', query, function( self ) {
			var xmlDoc = self.responseXML;
			var snapshot = xmlDoc.evaluate('//page[@ns != "6" and not(@missing)]', xmlDoc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null );  // 6 = File: namespace
			var list = [];
			for ( var i = 0; i < snapshot.snapshotLength; ++i ) {
				var object = snapshot.snapshotItem(i);
				var page = xmlDoc.evaluate( '@title', object, null, XPathResult.STRING_TYPE, null ).stringValue;
				var size = xmlDoc.evaluate( 'revisions/rev/@size', object, null, XPathResult.NUMBER_TYPE, null ).numberValue;

				var disputed = xmlDoc.evaluate( 'boolean(categories/cl[@title="Category:有爭議的快速刪除候選"])', object, null, XPathResult.BOOLEAN_TYPE, null ).booleanValue;
				list.push( {label:page + '(' + size + '字节）' + ( disputed ? '（争议）' : '' ), value:page, checked:!disputed });
			}
			self.params.form.append( {
					type: 'checkbox',
					name: 'pages',
					list: list
				} );
			self.params.form.append( { type:'submit' } );

			var result = self.params.form.render();
			self.params.Window.setContent( result );
		} );

	wikipedia_api.params = { form:form, Window:Window };
	wikipedia_api.post();
	var root = document.createElement( 'div' );
	Morebits.status.init( root );
	Window.setContent( root );
	Window.display();
};

Twinkle.batchdelete.currentDeleteCounter = 0;
Twinkle.batchdelete.currentUnlinkCounter = 0;
Twinkle.batchdelete.currentdeletor = 0;
Twinkle.batchdelete.callback.evaluate = function twinklebatchdeleteCallbackEvaluate(event) {
	Morebits.wiki.actionCompleted.notice = '状态';
	Morebits.wiki.actionCompleted.postfix = '批量删除已完成';
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!
	var pages = event.target.getChecked( 'pages' );
	var reason = event.target.reason.value;
	var delete_page = event.target.delete_page.checked;
	var unlink_page = event.target.unlink_page.checked;
	var delete_redirects = event.target.delete_redirects.checked;
	if( ! reason ) {
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
				var query = {
					'action': 'query',
					'titles': page
				};
				var wikipedia_api = new Morebits.wiki.api( '检查页面 ' + page + ' 是否存在', query, Twinkle.batchdelete.callbacks.main );
				wikipedia_api.params = { page:page, reason:reason, unlink_page:unlink_page, delete_page:delete_page, delete_redirects:delete_redirects };
				wikipedia_api.post();
			}
		}
	}
	var work = Morebits.array.chunk( pages, Twinkle.getPref('batchdeleteChunks') );
	Morebits.wiki.addCheckpoint();
	Twinkle.batchdelete.currentdeletor = window.setInterval( toCall, 1000, work );
};

Twinkle.batchdelete.callbacks = {
	main: function( self ) {
		var xmlDoc = self.responseXML;
		var normal = xmlDoc.evaluate( '//normalized/n/@to', xmlDoc, null, XPathResult.STRING_TYPE, null ).stringValue;
		if( normal ) {
			self.params.page = normal;
		}
		var exists = xmlDoc.evaluate( 'boolean(//pages/page[not(@missing)])', xmlDoc, null, XPathResult.BOOLEAN_TYPE, null ).booleanValue;

		if( ! exists ) {
			self.statelem.error( "页面不存在，可能已被删除" );
			return;
		}

		var query, wikipedia_api;
		if( self.params.unlink_page ) {
			query = {
				'action': 'query',
				'list': 'backlinks',
				'blfilterredir': 'nonredirects',
				'blnamespace': [0, 100], // main space and portal space only
				'bltitle': self.params.page,
				'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500 // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api( '抓取链入', query, Twinkle.batchdelete.callbacks.unlinkBacklinksMain );
			wikipedia_api.params = self.params;
			wikipedia_api.post();
		} else {
			--Twinkle.batchdelete.currentUnlinkCounter;
		}
		if( self.params.delete_page ) {
			if (self.params.delete_redirects)
			{
				query = {
					'action': 'query',
					'list': 'backlinks',
					'blfilterredir': 'redirects',
					'bltitle': self.params.page,
					'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500 // 500 is max for normal users, 5000 for bots and sysops
				};
				wikipedia_api = new Morebits.wiki.api( '抓取重定向', query, Twinkle.batchdelete.callbacks.deleteRedirectsMain );
				wikipedia_api.params = self.params;
				wikipedia_api.post();
			}

			var wikipedia_page = new Morebits.wiki.page( self.params.page, '删除页面 ' + self.params.page );
			wikipedia_page.setEditSummary(self.params.reason + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.deletePage(function( apiobj ) { 
					--Twinkle.batchdelete.currentDeleteCounter;
					var link = document.createElement( 'a' );
					link.setAttribute( 'href', mw.util.wikiGetlink(self.params.page) );
					link.setAttribute( 'title', self.params.page );
					link.appendChild( document.createTextNode( self.params.page ) );
					apiobj.statelem.info( [ '完成（' , link , '）' ] );
				} );	
		} else {
			--Twinkle.batchdelete.currentDeleteCounter;
		}
	},
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
		pageobj.setEditSummary('取消到页面 ' + self.params.page + ' 的链接' + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.save(params.onsuccess);
	}
};
