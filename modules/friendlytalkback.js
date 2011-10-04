/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** friendlytalkback.js: Talkback module
 ****************************************
 * Mode of invocation:     Tab ("TB")
 * Active on:              Existing user talk pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.talkback = function friendlytalkback() {
	if( mw.config.get('wgNamespaceNumber') === 3 ) {
		var username = mw.config.get('wgTitle').split( '/' )[0].replace( /\"/, "\\\""); // only first part before any slashes
		$(twAddPortletLink("#", "回复", "friendly-talkback", "回复通告", "")).click(function() { Twinkle.talkback.callback(username); });
	}
};

Twinkle.talkback.callback = function friendlytalkbackCallback( uid ) {
	if( uid === mw.config.get('wgUserName') ){
		alert( '请不要回复自己。' );
		return;
	}

	var Window = new SimpleWindow( 600, 350 );
	Window.setTitle( "回复通告" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "关于{{talkback}}", "Template:Talkback" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#talkback" );

	var form = new QuickForm( Twinkle.talkback.callback.evaluate );

	form.append( { type: 'radio', name: 'tbtarget',
				list: [ {
						label: '我的对话页',
						value: 'mytalk',
						checked: 'true' },
					{
						label: '其他用户的对话页',
						value: 'usertalk' },
					/*{
						label: "管理员通告板",
						value: 'an' },*/
					{
						label: '其它页面',
						value: 'other' } ],
				event: Twinkle.talkback.callback.change_target
			} );

	form.append( {
			type: 'field',
			label: '工作区',
			name: 'work_area'
		} );

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.tbtarget[0].dispatchEvent( evt );
};

Twinkle.talkback.prev_page = '';
Twinkle.talkback.prev_section = '';
Twinkle.talkback.prev_message = '';

Twinkle.talkback.callback.change_target = function friendlytagCallbackChangeTarget(e) {
	var value = e.target.values;
	var root = e.target.form;
	var old_area;

	if(root.section) {
		Twinkle.talkback.prev_section = root.section.value;
	}
	if(root.message) {
		Twinkle.talkback.prev_message = root.message.value;
	}
	if(root.page) {
		Twinkle.talkback.prev_page = root.page.value;
	}

	for( var i = 0; i < root.childNodes.length; ++i ) {
		var node = root.childNodes[i];
		if (node instanceof Element && node.getAttribute( 'name' ) === 'work_area' ) {
			old_area = node;
			break;
		}
	}
	var work_area = new QuickForm.element( { 
			type: 'field',
			label: '回复通告信息',
			name: 'work_area'
		} );

	switch( value ) {
		case 'mytalk':
			/* falls through */
		default:
			work_area.append( { 
					type:'input',
					name:'section',
					label:'小节（可选）',
					tooltip:'您对话页中留言的小节标题，留空以不加入链接。',
					value: Twinkle.talkback.prev_section
				} );
			break;
		case 'usertalk':
			work_area.append( { 
					type:'input',
					name:'page',
					label:'用户',
					tooltip:'您在其对话页上留言的用户的名字。',
					value: Twinkle.talkback.prev_page
				} );
			
			work_area.append( { 
					type:'input',
					name:'section',
					label:'小节（可选）',
					tooltip:'您留言的小节标题，留空以不加入链接。',
					value: Twinkle.talkback.prev_section
				} );
			break;
		/*case 'an':
			var noticeboard = work_area.append( {
					type: 'select',
					name: 'noticeboard',
					label: '通告板：'
				} );
			noticeboard.append( {
					type: 'option',
					label: "WP:AN（管理员通告板）",
					value: "Wikipedia:管理员通告板"
				} );
			noticeboard.append( {
					type: 'option',
					label: 'WP:ANI（Wikipedia:管理员通告板/界面的修改）',
					selected: true,
					value: "Wikipedia:管理员通告板/界面的修改"
				} );
			work_area.append( {
					type:'input',
					name:'section',
					label:'小节',
					tooltip:'AN或ANI中相关的小节。',
					value: Twinkle.talkback.prev_section
				} );
			break;*/
		case 'other':
			work_area.append( { 
					type:'input',
					name:'page',
					label:'完整页面名',
					tooltip:'您留下信息的完整页面名，如“Wikipedia talk:Twinkle”。',
					value: Twinkle.talkback.prev_page
				} );
			
			work_area.append( { 
					type:'input',
					name:'section',
					label:'小节（可选）',
					tooltip:'您留言的小节标题，留空以不加入链接。',
					value: Twinkle.talkback.prev_section
				} );
			break;
	}

	if (value !== "an") {
		work_area.append( { type:'textarea', label:'附加信息（可选）：', name:'message', tooltip:'一段将会出现在模板下的附加信息，您的签名将会被自动加入。' } );
	}

	work_area = work_area.render();
	root.replaceChild( work_area, old_area );
	root.message.value = Twinkle.talkback.prev_message;
};

Twinkle.talkback.callback.evaluate = function friendlytalkbackCallbackEvaluate(e) {
	var tbtarget = e.target.getChecked( 'tbtarget' )[0];
	var page = null;
	var section = e.target.section.value;
	if( tbtarget === 'usertalk' || tbtarget === 'other' ) {
		page = e.target.page.value;
		
		if( tbtarget === 'usertalk' ) {
			if( !page ) {
				alert( '您必须指定用户名。' );
				return;
			}
		} else {
			if( !page ) {
				alert( '您必须指定页面名。' );
				return;
			}
		}
	} /*else if (tbtarget === "an") {
		page = e.target.noticeboard.value;
	}*/

	var message = e.target.message.value;

	SimpleWindow.setButtonsEnabled( false );
	Status.init( e.target );

	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "回复通告完成，将在几秒后刷新";

	var talkpage = new Wikipedia.page(mw.config.get('wgPageName'), "添加回复通告");
	var tbPageName = (tbtarget === 'mytalk') ? mw.config.get('wgUserName') : page;

	var text;
	/*if ( tbtarget === "an" ) {
		text = "\n== " + Twinkle.getFriendlyPref('adminNoticeHeading') + " ==\n{{subst:ANI-notice|thread=";
		text += section + "|noticeboard=" + tbPageName + "}} ~~~~";

		talkpage.setEditSummary("Notice of AN/ANI discussion" + Twinkle.getPref('summaryAd'));
	} else {*/
		//clean talkback heading: strip section header markers, were erroneously suggested in the documentation
		text = '\n==' + Twinkle.getFriendlyPref('talkbackHeading').replace(/^\s*=+\s*(.*?)\s*=+$\s*/, "$1") + '==\n{{talkback|';
		text += tbPageName;

		if( section ) {
			text += '|' + section;
		}

		text += '|ts=~~~~~}}';

		if( message ) {
			text += '\n' + message + '--~~~~';
		} else if( Twinkle.getFriendlyPref('insertTalkbackSignature') ) {
			text += '\n~~~~';
		}

		talkpage.setEditSummary("回复通告（[[" + (tbtarget === 'other' ? '' : 'User talk:') + tbPageName +
			(section ? ('#' + section) : '') + "]]）" + Twinkle.getPref('summaryAd'));
	/*}*/

	talkpage.setAppendText(text);
	talkpage.setCreateOption('recreate');
	talkpage.setMinorEdit(Twinkle.getFriendlyPref('markTalkbackAsMinor'));
	talkpage.setFollowRedirect(true);
	talkpage.append();
};
