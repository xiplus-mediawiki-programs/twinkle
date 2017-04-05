//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


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
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	if ( mw.config.get('wgPageContentModel') === 'flow-board' ) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.copyvio.callback, "侵权", "tw-copyvio", "提报侵权页面", "");
};

Twinkle.copyvio.callback = function twinklecopyvioCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( "提报侵权页面" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#copyvio" );

	var form = new Morebits.quickForm( Twinkle.copyvio.callback.evaluate );
	form.append( {
			type: 'textarea',
			label:'侵权来源：',
			name: 'source'
		}
	);
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '通知页面创建者',
					value: 'notify',
					name: 'notify',
					tooltip: "在页面创建者对话页上放置一通知模板。",
					checked: true
				}
			]
		}
	);
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
		wikipedia_page = new Morebits.wiki.page(params.logpage, "添加侵权记录项");
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.copyvio.callbacks.copyvioList);

		// Notification to first contributor
		if(params.usertalk) {
			Morebits.wiki.flow.check('User talk:' + initialContrib, function () {
				var flowpage = new Morebits.wiki.flow('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
				var topic = '您建立的页面[[' + mw.config.get('wgPageName') + ']]可能侵犯版权';
				var content = "{{subst:CopyvioNotice|" + mw.config.get('wgPageName') +  "|flow=yes}}";
				flowpage.setTopic(topic);
				flowpage.setContent(content);
				flowpage.newTopic();
			}, function () {
				var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
				var notifytext = "\n{{subst:CopyvioNotice|" + mw.config.get('wgPageName') +  "}}";
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary("通知：页面[[" + mw.config.get('wgPageName') + "]]疑似侵犯版权" + Twinkle.getPref('summaryAd'));
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
			});
		}
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
		var output = '';
		var date = new Date();

		var dateHeaderRegex = new RegExp( "^===+\\s*" + (date.getUTCMonth() + 1) + "月" + date.getUTCDate() + "日" +
			"\\s*===+", 'mg' );

		if (!dateHeaderRegex.exec(text)) {
			output = "\n\n===" + (date.getUTCMonth() + 1) + "月" + date.getUTCDate() + "日" + "===";
		}

		output += "\n{{subst:CopyvioVFDRecord|" + mw.config.get('wgPageName') + "}}";
		pageobj.setAppendText(output);
		pageobj.setEditSummary("添加[[" + mw.config.get('wgPageName') + "]]" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};


Twinkle.copyvio.callback.evaluate = function(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!

	var source = e.target.source.value;
	var usertalk = e.target.notify.checked;

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	if( !source.trim() ) {
		Morebits.status.error( '错误', '未指定侵权来源' );
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params;
	logpage = 'Wikipedia:頁面存廢討論/疑似侵權';
	params = { source: source, logpage: logpage, usertalk: usertalk};

	Morebits.wiki.addCheckpoint();
	// Updating data for the action completed event
	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "提报完成，将在几秒内刷新";

	// Tagging file
	wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "添加侵权模板到页面");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.copyvio.callbacks.taggingArticle);

	// Contributor specific edits
	wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.lookupCreator(Twinkle.copyvio.callbacks.main);

	Morebits.wiki.removeCheckpoint();
};
})(jQuery);


//</nowiki>
