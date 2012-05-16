/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** twinkleunlink.js: Unlink module
 ****************************************
 * Mode of invocation:     Tab ("Unlink")
 * Active on:              Non-special pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.unlink = function twinkleunlink() {
	if( mw.config.get('wgNamespaceNumber') < 0 ) {
		return;
	}
	twAddPortletLink( Twinkle.unlink.callback, "链入", "tw-unlink", "取消到本页的链接" );
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
	var Window = new SimpleWindow( 800, 400 );
	Window.setTitle( "取消链入" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#unlink" );

	var form = new QuickForm( Twinkle.unlink.callback.evaluate );
	form.append( {
		type: 'textarea',
		name: 'reason',
		label: '理由：',
		value: (presetReason ? presetReason : '')
	} );

	var query;
	if(mw.config.get('wgNamespaceNumber') === 6) {  // File:
		query = {
			'action': 'query',
			'list': [ 'backlinks', 'imageusage' ],
			'bltitle': mw.config.get('wgPageName'),
			'iutitle': mw.config.get('wgPageName'),
			'bllimit': userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'iulimit': userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces') // Main namespace and portal namespace only, keep on talk pages.
		};
	} else {
		query = {
			'action': 'query',
			'list': 'backlinks',
			'bltitle': mw.config.get('wgPageName'),
			'blfilterredir': 'nonredirects',
			'bllimit': userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces') // Main namespace and portal namespace only, keep on talk pages.
		};
	}
	var wikipedia_api = new Wikipedia.api( '抓取链入', query, Twinkle.unlink.callbacks.display.backlinks );
	wikipedia_api.params = { form: form, Window: Window, image: mw.config.get('wgNamespaceNumber') === 6 };
	wikipedia_api.post();

	var root = document.createElement( 'div' );
	root.style.padding = '15px';  // just so it doesn't look broken
	Status.init( root );
	wikipedia_api.statelem.status( "载入中…" );
	Window.setContent( root );
	Window.display();
};

Twinkle.unlink.callback.evaluate = function twinkleunlinkCallbackEvaluate(event) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!

	Twinkle.unlink.backlinksdone = 0;
	Twinkle.unlink.imageusagedone = 0;

	function processunlink(pages, imageusage) {
		var statusIndicator = new Status((imageusage ? '取消文件使用' : '取消链入'), '0%');
		var total = pages.length;  // removing doubling of this number - no apparent reason for it

		Wikipedia.addCheckpoint();

		if( !pages.length ) {
			statusIndicator.info( '100%（完成）' );
			Wikipedia.removeCheckpoint();
			return;
		}

		// get an edit token
		var params = { reason: reason, imageusage: imageusage, globalstatus: statusIndicator, current: 0, total: total };
		for (var i = 0; i < pages.length; ++i)
		{
			var myparams = $.extend({}, params);
			var articlepage = new Wikipedia.page(pages[i], '在条目：“' + pages[i] + '”中');
			articlepage.setCallbackParameters(myparams);
			articlepage.load(imageusage ? Twinkle.unlink.callbacks.unlinkImageInstances : Twinkle.unlink.callbacks.unlinkBacklinks);
		}
	}

	var reason = event.target.reason.value;
	var backlinks, imageusage;
	if( event.target.backlinks ) {
		backlinks = Twinkle.unlink.getChecked2(event.target.backlinks);
	}
	if( event.target.imageusage ) {
		imageusage = Twinkle.unlink.getChecked2(event.target.imageusage);
	}

	SimpleWindow.setButtonsEnabled( false );
	Status.init( event.target );
	Wikipedia.addCheckpoint();
	if (backlinks) {
		processunlink(backlinks, false);
	}
	if (imageusage) {
		processunlink(imageusage, true);
	}
	Wikipedia.removeCheckpoint();
};

Twinkle.unlink.backlinksdone = 0;
Twinkle.unlink.imageusagedone = 0;

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
					apiobj.params.form.append( { type: 'div', label: '未找到文件使用。' } );
				}
				else
				{
					apiobj.params.form.append( { type:'header', label: '文件使用' } );
					namespaces = [];
					$.each(Twinkle.getPref('unlinkNamespaces'), function(k, v) {
						namespaces.push(Wikipedia.namespacesFriendly[v]);
					});
					apiobj.params.form.append( {
						type: 'div',
						label: "已选择的名字空间：" + namespaces.join(', '),
						tooltip: "您可在Twinkle属性中更改这个，请参见[[WP:TWPREFS]]"
					});
					if ($(xmlDoc).find('query-continue').length) {
						apiobj.params.form.append( {
							type: 'div',
							label: "显示头 " + list.length.toString() + " 个文件使用。"
						});
					}
					apiobj.params.form.append( {
						type: 'checkbox',
						name: 'imageusage',
						list: list
					} );
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
					namespaces.push(Wikipedia.namespacesFriendly[v]);
				});
				apiobj.params.form.append( {
					type: 'div',
					label: "已选择的名字空间：" + namespaces.join(', '),
					tooltip: "您可在Twinkle属性中更改这个，请参见[[WP:TWPREFS]]"
				});
				if ($(xmlDoc).find('query-continue').length) {
					apiobj.params.form.append( {
						type: 'div',
						label: "显示头 " + list.length.toString() + " 个链入。"
					});
				}
				apiobj.params.form.append( {
					type: 'checkbox',
					name: 'backlinks',
					list: list
				});
				havecontent = true;
			}
			else
			{
				apiobj.params.form.append( { type: 'div', label: '未找到链入。' } );
			}

			if (havecontent) {
				apiobj.params.form.append( { type:'submit' } );
			}

			var result = apiobj.params.form.render();
			apiobj.params.Window.setContent( result );
		}
	},
	unlinkBacklinks: function twinkleunlinkCallbackUnlinkBacklinks(pageobj) {
		var text, oldtext;
		text = oldtext = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var wikiPage = new Mediawiki.Page(text);
		wikiPage.removeLink(mw.config.get('wgPageName'));
		text = wikiPage.getText();
		if (text === oldtext) {
			// Nothing to do, return
			Twinkle.unlink.callbacks.success(pageobj);
			Wikipedia.actionCompleted();
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary("取消到页面“" + mw.config.get('wgPageName') + "”的链接：" + params.reason + "。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.unlink.callbacks.success);
	},
	unlinkImageInstances: function twinkleunlinkCallbackUnlinkImageInstances(pageobj) {
		var text, oldtext;
		text = oldtext = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var wikiPage = new Mediawiki.Page(text);
		wikiPage.commentOutImage(mw.config.get('wgTitle'), '注释出');
		text = wikiPage.getText();
		if (text === oldtext) {
			// Nothing to do, return
			Twinkle.unlink.callbacks.success(pageobj);
			Wikipedia.actionCompleted();
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary("注释出对文件“" + mw.config.get('wgPageName') + "的使用：" + params.reason + "。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.unlink.callbacks.success);
	},
	success: function twinkleunlinkCallbackSuccess(pageobj) {
		var statelem = pageobj.getStatusElement();
		statelem.info('完成');

		var params = pageobj.getCallbackParameters();
		var total = params.total;
		var now = parseInt( 100 * (params.imageusage ? ++(Twinkle.unlink.imageusagedone) : ++(Twinkle.unlink.backlinksdone))/total, 10 ) + '%';
		params.globalstatus.update( now );
		if((params.imageusage ? Twinkle.unlink.imageusagedone : Twinkle.unlink.backlinksdone) >= total) {
			params.globalstatus.info( now + '（完成）' );
			Wikipedia.removeCheckpoint();
		}
	}
};
