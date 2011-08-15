/*
 ****************************************
 *** twinklecopyvio.js: Copyvio module
 ****************************************
 * Mode of invocation:     Tab ("Copyvio")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.copyvio = function twinklecopyvio() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Wikipedia.isPageRedirect()))) ) {
		return;
	}
	if (twinkleUserAuthorized) {
		$(twAddPortletLink("#", "侵权", "tw-copyvio", "提报侵权页面", "")).click(Twinkle.copyvio.callback);
	} else {
		$(twAddPortletLink("#", '侵权', 'tw-copyvio', '提报侵权页面', '')).click(function() {
			alert("您尚未达到自动确认。");
		});
	}
};

Twinkle.copyvio.callback = function twinklecopyvioCallback() {
	var Window = new SimpleWindow( 600, 350 );
	Window.setTitle( "提报侵权页面" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#copyvio" );

	var form = new QuickForm( Twinkle.copyvio.callback.evaluate );
	form.append( {
			type: 'textarea',
			label:'侵权来源：',
			name: 'source'
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
};

Twinkle.copyvio.callbacks = {
	main: function(pageobj) {
		// this is coming in from lookupCreator...!
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();

		// Adding discussion
		wikipedia_page = new Wikipedia.page(params.logpage, "添加侵权记录项");
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.copyvio.callbacks.copyvioList);

		// Notification to first contributor
		var usertalkpage = new Wikipedia.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
		var notifytext = "\n{{subst:CopyvioNotice|" + mw.config.get('wgPageName') +  "}}";
		usertalkpage.setAppendText(notifytext);
		usertalkpage.setEditSummary("通知：页面[[" + mw.config.get('wgPageName') + "]]疑似侵犯版权。" + Twinkle.getPref('summaryAd'));
		usertalkpage.setCreateOption('recreate');
		switch (Twinkle.getPref('copyvioWatchUser')) {
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
	},
	taggingArticle: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var tag = "{{subst:Copyvio/auto|url=" + params.source.replace(/http/g, '&#104;ttp').replace(/\n+/g, '\n').replace(/^\s*([^\*])/gm, '* $1').replace(/^\* $/m, '') + "}}";
		if ( /\/temp$/i.test( mw.config.get('wgPageName') ) ) {
			tag = "{{D|G16}}\n" + tag;
		}

		pageobj.setPageText(tag);
		pageobj.setEditSummary("本页面疑似侵犯版权" + Twinkle.getPref('summaryAd'));
		switch (Twinkle.getPref('copyvioWatchPage')) {
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

		if( Twinkle.getPref('markCopyvioPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	},
	copyvioList: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		pageobj.setPageText(text + "\n{{subst:CopyvioVFDRecord|" + mw.config.get('wgPageName') + "}}");
		pageobj.setEditSummary("添加[[" + mw.config.get('wgPageName') + "]]。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
		Twinkle.copyvio.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
	}
};


Twinkle.copyvio.callback.evaluate = function(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!

	var source = e.target.source.value;

	SimpleWindow.setButtonsEnabled( false );
	Status.init( e.target );

	if( !source.trim() ) {
		Status.error( '错误', '未指定侵权来源' );
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params;
	logpage = 'Wikipedia:頁面存廢討論/疑似侵權';
	params = { source: source, logpage: logpage };

	Wikipedia.addCheckpoint();
	// Updating data for the action completed event
	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "提报完成，将在几秒内刷新";

	// Tagging file
	wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'), "添加侵权模板到页面");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.copyvio.callbacks.taggingArticle);

	// Contributor specific edits
	wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.lookupCreator(Twinkle.copyvio.callbacks.main);

	Wikipedia.removeCheckpoint();
};
