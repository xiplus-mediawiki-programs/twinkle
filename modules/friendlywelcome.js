/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** friendlywelcome.js: Welcome module
 ****************************************
 * Mode of invocation:     Tab ("Wel"), or from links on diff pages
 * Active on:              Existing user talk pages, diff pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.welcome = function friendlywelcome() {
	if( QueryString.exists( 'friendlywelcome' ) ) {
		if( QueryString.get( 'friendlywelcome' ) === 'auto' ) {
			Twinkle.welcome.auto();
		} else {
			Twinkle.welcome.semiauto();
		}
	} else {
		Twinkle.welcome.normal();
	}
};

Twinkle.welcome.auto = function() {
	if( QueryString.get( 'action' ) !== 'edit' ) {
		// userpage not empty, aborting auto-welcome
		return;
	}

	Twinkle.welcome.welcomeUser();
};

Twinkle.welcome.semiauto = function() {
	Twinkle.welcome.callback( mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\"") );
};

Twinkle.welcome.normal = function() {
	if( QueryString.exists( 'diff' ) ) {
		// check whether the contributors' talk pages exist yet
		var $oList = $("div#mw-diff-otitle2 span.mw-usertoollinks a.new:contains(talk)").first();
		var $nList = $("div#mw-diff-ntitle2 span.mw-usertoollinks a.new:contains(talk)").first();

		if( $oList.length > 0 || $nList.length > 0 ) {
			var spanTag = function( color, content ) {
				var span = document.createElement( 'span' );
				span.style.color = color;
				span.appendChild( document.createTextNode( content ) );
				return span;
			};

			var welcomeNode = document.createElement('strong');
			var welcomeLink = document.createElement('a');
			welcomeLink.appendChild( spanTag( 'Black', '[' ) );
			welcomeLink.appendChild( spanTag( 'Goldenrod', '欢迎' ) );
			welcomeLink.appendChild( spanTag( 'Black', ']' ) );
			welcomeNode.appendChild(welcomeLink);

			if( $oList.length > 0 ) {
				var oHref = $oList.attr("href");

				var oWelcomeNode = welcomeNode.cloneNode( true );
				oWelcomeNode.firstChild.setAttribute( 'href', oHref + '&' + QueryString.create( { 'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode')==='auto'?'auto':'norm' } ) + '&' + QueryString.create( { 'vanarticle': mw.config.get( 'wgPageName' ).replace(/_/g, ' ') } ) );
				$oList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$oList[0].parentNode.parentNode.appendChild( oWelcomeNode );
			}

			if( $nList.length > 0 ) {
				var nHref = $nList.attr("href");

				var nWelcomeNode = welcomeNode.cloneNode( true );
				nWelcomeNode.firstChild.setAttribute( 'href', nHref + '&' + QueryString.create( { 'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode')==='auto'?'auto':'norm' } ) + '&' + QueryString.create( { 'vanarticle': mw.config.get( 'wgPageName' ).replace(/_/g, ' ') } ) );
				$nList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$nList[0].parentNode.parentNode.appendChild( nWelcomeNode );
			}
		}
	}
	if( mw.config.get( 'wgNamespaceNumber' ) === 3 ) {
		var username = mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\""); // only first part before any slashes
		$(twAddPortletLink("#", "欢迎", "friendly-welcome", "欢迎用户", "")).click(function() { Twinkle.welcome.callback(username); });
	}
};

Twinkle.welcome.welcomeUser = function welcomeUser() {
	Status.init( document.getElementById('bodyContent') );

	var params = {
		value: Twinkle.getFriendlyPref('quickWelcomeTemplate'),
		article: QueryString.exists( 'vanarticle' ) ? QueryString.get( 'vanarticle' ) : '',
		mode: 'auto'
	};

	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "欢迎完成，将在几秒钟后刷新";

	var wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'), "用户讨论页修改");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};

Twinkle.welcome.callback = function friendlywelcomeCallback( uid ) {
	if( uid === mw.config.get('wgUserName') ){
		alert( '我们非常、非常欢迎你的到来！' );
		return;
	}
	
	var Window = new SimpleWindow( 600, 400 );
	Window.setTitle( "欢迎用户" );
	Window.setScriptName( "Twinkle" );
	//Window.addFooterLink( "Welcoming Committee", "WP:WC" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#welcome" );

	var form = new QuickForm( Twinkle.welcome.callback.evaluate, 'change' );

	form.append( {
			type: 'input',
			name: 'article',
			label: '条目名（如模板支持）',
			value:( QueryString.exists( 'vanarticle' ) ? QueryString.get( 'vanarticle' ) : '' ),
			tooltip: '如果模板支持，您可在此处加入一个条目名。支持的模板已用星号标记出来。',
			event: function( event ) {
				event.stopPropagation();
			}
		} );

	form.append( { type:'header', label:'简单模板' } );
	form.append( { type: 'radio', name: 'simple', list: Twinkle.welcome.standardList } );

	if( Twinkle.getFriendlyPref('customWelcomeList').length ) {
		form.append( { type:'header', label:'自定义模板' } );
		form.append( { type: 'radio', name: 'custom', list: Twinkle.getFriendlyPref('customWelcomeList') } );
	}

	/*form.append( { type:'header', label:'Welcoming committee templates' } );
	form.append( { type: 'radio', name: 'welcomingCommittee', list: Twinkle.welcome.welcomingCommitteeList } );*/

	form.append( { type:'header', label:'问题用户模板' } );
	form.append( { type: 'radio', name: 'problem', list: Twinkle.welcome.problemList } );

	form.append( { type:'header', label:'匿名用户模板' } );
	form.append( { type: 'radio', name: 'anonymous', list: Twinkle.welcome.anonymousList } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
};

Twinkle.welcome.standardList = [
	{
		label: '{{Welcome}}: 标准欢迎模板*',
		value: 'Welcome'
	},
	{
		label: '{{Welcome plain}}: 纯文本欢迎模板',
		value: 'Welcome plain'
	}
];

/*Twinkle.welcome.welcomingCommitteeList = [
	{ 
		label: '{{Wel}}: similar to {{Welcome}}, but automatically identifies anonymous and registered users*',
		value: 'Wel',
		tooltip: 'This template checks whether the username contains any letters. If there are any, {{Welcome-reg}} will be shown. If there are none, {{Welcome-anon}} will be shown.'
	},
	{ 
		label: '{{W-basic}}: standard template, similar to {{Welcome}} with additional options',
		value: 'W-basic',
		tooltip: 'This template is similar to {{Welcome}} but supports many different options.  Includes a signature.'
	},
	{ 
		label: '{{W-shout}}: extroverted message with bold advice',
		value: 'W-shout',
		tooltip: 'This template is similar to {{WelcomeShout}} but supports many different options.  Includes a signature.'
	},
	{ 
		label: '{{W-short}}: concise; won\'t overwhelm',
		value: 'W-short||',
		tooltip: 'This template is similar to {{Welcomeshort}} but supports many different options.  Includes a signature.'
	},
	{ 
		label: '{{W-link}}: shortest greeting, links to Welcoming committee\'s greetings page',
		value: 'W-link',
		tooltip: 'This template is similar to {{Welcom}} but supports many different options.  Includes a signature.'
	},
	{ 
		label: '{{W-graphical}}: graphical menu format to ease transition from the graphic-heavy web',
		value: 'W-graphical',
		tooltip: 'This template is similar to {{Welcomeg}} but has fewer links.  Supports many different options.  Includes a signature.'
	},
	{ 
		label: '{{W-screen}}: graphical; designed to fit the size of the user\'s screen',
		value: 'W-screen',
		tooltip: 'This template is a nice graphical welcome with many different options.  Includes a signature.'
	}
];*/

Twinkle.welcome.problemList = [
	{
		label: '{{Firstarticle}}: 用户的第一篇条目不符合方针*',
		value: 'Firstarticle'
	},
	{
		label: '{{Welcomevandal}}: 用户的初始动作像是破坏',
		value: 'Welcomevandal'
	},
	{
		label: '{{Welcomeipvandal}}: 匿名用户的初始动作像是破坏',
		value: 'Welcomeipvandal'
	}
];

Twinkle.welcome.anonymousList = [
	{
		label: '{{Welcome-anon}}: 匿名用户',
		value: 'Welcome-anon'
	}
];

// Set to true if template does not already have heading
Twinkle.welcome.headingHash = {
	'Welcome': false,
	'Welcome plain': false,
	'Firstarticle': false,
	'Welcomevandal': false,
	'Welcomeipvandal': false,
	'Welcome-anon': false,
};

// Set to true if template already has signature
Twinkle.welcome.signatureHash = {
	'Welcome': true,
	'Welcome plain': true,
	'Firstarticle': true,
	'Welcomevandal': true,
	'Welcomeipvandal': true,
	'Welcome-anon': true,
};

/* Set to true if template supports article
 * name from art template parameter 
 */
Twinkle.welcome.artHash = {
	'Welcome': true,
	'Welcome plain': false,
	'Firstarticle': true,
	'Welcomevandal': false,
	'Welcomeipvandal': false,
	'Welcome-anon': false,
};

/* Set to true if template supports article
 * name from vanarticle template parameter 
 */
Twinkle.welcome.vandalHash = {
	'Welcome': false,
	'Welcome plain': false,
	'Firstarticle': false,
	'Welcomevandal': false,
	'Welcomeipvandal': false,
	'Welcome-anon': false,
};

Twinkle.welcome.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		var oldText = pageobj.getPageText();
		
		// abort if mode is auto and form is not empty
		if( pageobj.exists() && params.mode === 'auto' ) {
			Status.info( '警告', '用户对话页非空，取消自动欢迎' );
			Wikipedia.actionCompleted.event();
			return;
		}
		
		var text = '';
		Status.info( '信息', '将添加欢迎模板到对话页' +
			( Twinkle.getFriendlyPref('topWelcomes') ? '顶' : '底' ) +
			'部。' );
		if( !Twinkle.getFriendlyPref('topWelcomes') ) {
			text += oldText + '\n';
		}
		
		if( Twinkle.welcome.headingHash[ params.value ] && Twinkle.getFriendlyPref('insertHeadings') ) {
			Status.info( '信息', '将创建小节标题' );
			// strip section header markers from pref, to preserve backwards compatibility
			text += "== " + Twinkle.getFriendlyPref('welcomeHeading').replace(/^\s*=+\s*(.*?)\s*=+$\s*/, "$1") + " ==\n";
		}
		
		Status.info( '信息', '将替换引用{{' + params.value + '}}欢迎模板' );
		text += '{{subst:' + params.value;
		
		if( Twinkle.welcome.artHash[ params.value ] ) {
			if( Twinkle.getFriendlyPref('insertUsername') && params.value.substring(2,0) !== 'W-' ) {
				Status.info( '信息', '将添加您的用户名到模板' );
				text += '|' + mw.config.get('wgUserName');
			}
			
			if( params.article ) {
				Status.info( '信息', '将添加条目链接到模板' );
				text += '|art=' + params.article;
			}
		} else if( Twinkle.welcome.vandalHash[ params.value ] ) {
			if( params.article ) {
				Status.info( '信息', '将添加条目链接到模板' );
			}
			text += '|' + params.article;
			
			if( Twinkle.getFriendlyPref('insertUsername') ) {
				Status.info( '信息', '将添加您的用户名到模板' );
				text += '|' + mw.config.get('wgUserName');
			}
		} else if( Twinkle.getFriendlyPref('insertUsername') ) {
			Status.info( '信息', '将添加您的用户名到模板' );
			text += '|' + mw.config.get('wgUserName');
		} 
		
		text += '}}';
		
		if( !Twinkle.welcome.signatureHash[ params.value ] && Twinkle.getFriendlyPref('insertSignature') ) {
			Status.info( '信息', '将添加您的签名' );
			text += ' \n~~~~';
		}
		
		if( Twinkle.getFriendlyPref('topWelcomes') ) {
			text += '\n\n' + oldText;
		}
 
		var summaryText = "添加" + ( Twinkle.getFriendlyPref('maskTemplateInSummary') ? '欢迎' : ( '{{[[Template:' + params.value + '|' + params.value + ']]}}' ) ) +
			"模板到用户对话页";
		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markWelcomesAsMinor'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchWelcomes'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.welcome.callback.evaluate = function friendlywelcomeCallbackEvaluate(e) {
	// Ignore if a change to the text field triggered this event
	if( e.target.name === 'article' ) {
		return;
	}
	
	var params = {
		value: e.target.values,
		article: e.target.form.article.value,
		mode: 'manual'
	};

	SimpleWindow.setButtonsEnabled( false );
	Status.init( e.target.form );

	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "欢迎完成，将在几秒钟后刷新";

	var wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'), "用户对话页修改");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};
