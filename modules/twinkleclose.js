//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleclose.js: XFD closing module
 ****************************************
 * Mode of invocation:     Links after section heading
 * Active on:              AfD dated archive pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.close = function twinkleclose() {
	if ( !Morebits.userIsInGroup('sysop') || !(/^Wikipedia:頁面存廢討論\/記錄\/\d+\/\d+\/\d+$/.test(mw.config.get('wgPageName'))) ) {
		return;
	}

	var spanTag = function( color, content ) {
		var span = document.createElement( 'span' );
		span.style.color = color;
		span.appendChild( document.createTextNode( content ) );
		return span;
	};

	var selector = ':has(.mw-headline a:only-of-type:not(.new)):not(:has(+ div.NavFrame))'
	var titles = $('#bodyContent').find('h3' + selector + ':not(:has(+ p + h4)), h4' + selector); // really needs to work on

	var delNode = document.createElement('strong');
	var delLink = document.createElement('a');
	delLink.appendChild( spanTag( 'Black', '[' ) );
	delLink.appendChild( spanTag( 'Red', '结束讨论' ) );
	delLink.appendChild( spanTag( 'Black', ']' ) );
	delNode.appendChild(delLink);

	titles.each(function(key, current) {
		var title = decodeURI($(current).find('.mw-headline a').attr('href').slice(6));
		var section = /section=(\d+)/.exec($(current).find('.mw-editsection a').attr('href'))[1];
		var node = current.getElementsByClassName('mw-headline')[0];
		node.appendChild( document.createTextNode(' ') );
		var tmpNode = delNode.cloneNode( true );
		tmpNode.firstChild.href = '#' + section;
		$(tmpNode.firstChild).click(function() {
			Twinkle.close.callback(title, section);
			return false;
		});
		node.appendChild( tmpNode );
	});
};

Twinkle.close.codes = {
	'请求无效': {
		'ir': {
			label: '请求无效',
			action: 'keep'
		},
		'rep': {
			label: '重复提出，无效',
			action: 'keep'
		},
		'commons': {
			label: '应在维基共享资源提请',
			action: 'keep'
		},
		'ne': {
			label: '目标页面或档案不存在，无效',
			action: 'keep'
		},
		'nq': {
			label: '提删者未取得提删资格，无效',
			action: 'keep'
		}
	},
	'保留': {
		'k': {
			label: '保留',
			action: 'keep'
		},
		'sk': {
			label: '快速保留',
			action: 'keep'
		},
		'tk': {
			label: '暂时保留',
			action: 'keep'
		},
		'rr': {
			label: '请求理由消失',
			action: 'keep'
		},
		'dan': {
			label: '删后重建',
			action: 'keep'
		}
	},
	'删除': {
		'd': {
			label: '删除',
			action: 'del',
			selected: true
		},
		'ic': {
			label: '图像因侵权被删',
			action: 'del'
		}
	},
	'快速删除': {
		'sd': {
			label: '快速删除',
			action: 'del'
		},
		'lssd': {
			label: '无来源或版权资讯，快速删除',
			action: 'del'
		},
		'svg': {
			label: '已改用SVG图形，快速删除',
			action: 'del'
		},
		'nowcommons': {
			label: '维基共享资源已提供，快速删除',
			action: 'del'
		},
		'drep': {
			label: '多次被删除，条目锁定',
			action: 'del'
		}
	}
}

Twinkle.close.callback = function twinklecloseCallback(title, section) {
	var Window = new Morebits.simpleWindow( 350, 200 );
	Window.setTitle( "结束存废讨论" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#close" );

	var form = new Morebits.quickForm( Twinkle.close.callback.evaluate );

	form.append( {
			type: 'input',
			label: '页面名：',
			name: 'title',
			value: title,
			disabled: true
		}
	);
	form.append( {
			type: 'input',
			label: '小节号：',
			name: 'section',
			value: section,
			disabled: true
		}
	);

	form.append( {
			type: 'select',
			label: '理据：',
			name: 'sub_group'
		}
	);
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	var sub_group = result.getElementsByTagName('select')[0]; // hack

	// worker function to create the combo box entries
	var createEntries = function( contents, container ) {
		$.each( contents, function( itemKey, itemProperties ) {
			var key = (typeof itemKey === "string") ? itemKey : itemProperties.value;

			var elem = new Morebits.quickForm.element( {
				type: 'option',
				label: key + '：' + itemProperties.label,
				value: key,
			    	selected: itemProperties.selected
			} );
			var elemRendered = container.appendChild( elem.render() );
			$(elemRendered).data("messageData", itemProperties);
		} );
	};

	$.each( Twinkle.close.codes, function( groupLabel, groupContents ) {
		var optgroup = new Morebits.quickForm.element( {
			type: 'optgroup',
			label: groupLabel
		} );
		optgroup = optgroup.render();
		sub_group.appendChild( optgroup );
		// create the options
		createEntries( groupContents, optgroup );
	} );
};

Twinkle.close.callback.evaluate = function twinklecloseCallbackEvaluate(e) {
	var code = e.target.sub_group.value;
	var messageData = $(e.target.sub_group).find('option[value="' + code + '"]').data("messageData");
	var params = {
		title: e.target.title.value,
		code: code,
		section: parseInt(e.target.section.value),
		messageData: messageData
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.notice = "操作完成";

	switch (messageData.action) {
		case 'del':
			Twinkle.close.callbacks.del(params);
			break;
		case 'keep':
			var wikipedia_page = new Morebits.wiki.page( params.title, '移除存废讨论模板' );
			wikipedia_page.setCallbackParameters( params );
			wikipedia_page.load( Twinkle.close.callbacks.keep );
			break;
		default:
			alert("Twinkle.close：未定义 " + code);
			return;
	}
	//Twinkle.close.callbacks.talkend( params );
};

Twinkle.close.callbacks = {
	del: function (params) {
		Morebits.wiki.addCheckpoint();

		var page = new Morebits.wiki.page( params.title, "删除页面" );

		page.setEditSummary( '存废讨论通过：[[' + mw.config.get('wgPageName') + ']]' + Twinkle.getPref('deletionSummaryAd') );
		page.deletePage(function() {
			page.getStatusElement().info("完成");
			Twinkle.close.callbacks.talkend( params );
		});
		Morebits.wiki.removeCheckpoint();
	},
	keep: function (pageobj) {
		var statelem = pageobj.getStatusElement();

		if (!pageobj.exists()) {
			statelem.error( "页面不存在，可能已被删除" );
			return;
		}

		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var pagetitle = mw.Title.newFromText(params.title);
		if (pagetitle.getNamespaceId() % 2 === 0) {
			var talkpagetitle = new mw.Title(pagetitle.getMainText(), pagetitle.getNamespaceId() + 1);
			var talkpage = new Morebits.wiki.page(talkpagetitle.toString(), '标记讨论页');
			var vfdkept = '{{vfd-kept|' + mw.config.get('wgPageName').split('/').slice(2).join('/') + '|' + params.messageData.label + '}}\n';
			talkpage.setPrependText(vfdkept);
			talkpage.setEditSummary('[[' + mw.config.get('wgPageName') + ']]：' + params.messageData.label + Twinkle.getPref('summaryAd'));
			talkpage.setCreateOption('recreate');
			talkpage.prepend();
		}

		var newtext = text.replace(/\{\{([rsaiftcmv]fd)[^{}]*?\}\}\n*/gi, '');
		if (newtext === text) {
			statelem.warn("未找到存废讨论模板，可能已被移除");
			Twinkle.close.callbacks.talkend( params );
			return;
		}
		var editsummary = '存废讨论：[[' + mw.config.get('wgPageName') + ']]';

		pageobj.setPageText(newtext);
		pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.keepComplete);
	},
	keepComplete: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		Twinkle.close.callbacks.talkend( params );
	},

	talkend: function (params) {
		var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), '结束讨论');
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setPageSection(params.section);
		wikipedia_page.load(Twinkle.close.callbacks.saveTalk);
	},
	saveTalk: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		if (text.indexOf('{{delh') !== -1) {
			statelem.error( "讨论已被结束" );
			return;
		}

		var bar = text.split('\n----\n');
		var split = bar[0].split('\n');

		text = split[0] + '\n{{delh|' + params.code + '}}\n' + split.slice(1).join('\n');
		text += '\n----\n: ' + params.messageData.label + '。--~~~~\n{{delf}}';

		if (bar[1]) {
			text += '\n----\n' + bar.slice(1).join('\n----\n');
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary('/* ' + params.title + ' */ ' + params.messageData.label + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.disableLink);
	},

	disableLink: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		$('strong a[href=#' + params.section + '] span').css('color', 'grey');
	}
}

})(jQuery);


//</nowiki>
