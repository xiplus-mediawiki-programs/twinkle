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
	if ( Twinkle.getPref('XfdClose') === 'hide' || !(/^Wikipedia:(頁面|檔案)存廢討論\/記錄\/\d+\/\d+\/\d+$/.test(mw.config.get('wgPageName'))) ) {
		return;
	}

	var spanTag = function( color, content ) {
		var span = document.createElement( 'span' );
		span.style.color = color;
		span.appendChild( document.createTextNode( content ) );
		return span;
	};

	$('h1:has(.mw-headline),h2:has(.mw-headline),h3:has(.mw-headline),h4:has(.mw-headline),h5:has(.mw-headline),h6:has(.mw-headline)', '#bodyContent').each(function (index, current) {
		current.setAttribute('data-section', index + 1);
	});

	var selector = ':has(.mw-headline a:only-of-type):not(:has(+ div.NavFrame))';
	var titles = $('#bodyContent').find('h2' + selector + ':not(:has(+ p + h3)), h3' + selector); // really needs to work on

	var delNode = document.createElement('strong');
	var delLink = document.createElement('a');
	delLink.appendChild( spanTag( 'Black', '[' ) );
	delLink.appendChild( spanTag( 'Red', wgULS('关闭讨论', '關閉討論') ) );
	delLink.appendChild( spanTag( 'Black', ']' ) );
	delNode.appendChild(delLink);

	titles.each(function(key, current) {
		var headlinehref = $(current).find('.mw-headline a').attr('href');
		var title;
		if (headlinehref.indexOf('redlink=1') === -1) {
			title = headlinehref.slice(6);
		}
		else {
			title = headlinehref.slice(19, -22);
		}
		title = decodeURIComponent(title);
		var pagenotexist = $(current).find('.mw-headline a').hasClass('new');
		var section = current.getAttribute('data-section');
		var node = current.getElementsByClassName('mw-headline')[0];
		node.appendChild( document.createTextNode(' ') );
		var tmpNode = delNode.cloneNode( true );
		tmpNode.firstChild.href = '#' + section;
		$(tmpNode.firstChild).click(function() {
			Twinkle.close.callback(title, section, pagenotexist);
			return false;
		});
		node.appendChild( tmpNode );
	});
};

// Keep this synchronized with {{delh}}
Twinkle.close.codes = wgULS({
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
			action: 'keep',
			adminonly: true
		},
		'sk': {
			label: '快速保留',
			action: 'keep'
		},
		'tk': {
			label: '暂时保留',
			action: 'keep',
			adminonly: true
		},
		'rr': {
			label: '请求理由消失',
			action: 'keep',
			selected: (Twinkle.getPref('XfdClose') === 'nonadminonly')
		},
		'dan': {
			label: '删后重建',
			action: 'keep',
			adminonly: true
		}
	},
	'删除': {
		'd': {
			label: '删除',
			action: 'del',
			adminonly: true,
			selected: (Twinkle.getPref('XfdClose') === 'all')
		},
		'ic': {
			label: '图像因侵权被删',
			action: 'del',
			adminonly: true
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
			action: 'del',
			adminonly: true
		}
	},
	'转移至其他维基计划': {
		'twc': {
			label: '转移至维基共享资源',
			action: 'noop',
			adminonly: true
		},
		'twn': {
			label: '转移至维基新闻',
			action: 'noop',
			adminonly: true
		},
		'tws': {
			label: '转移至维基文库',
			action: 'noop',
			adminonly: true
		},
		'twb': {
			label: '转移至维基教科书',
			action: 'noop',
			adminonly: true
		},
		'twq': {
			label: '转移至维基语录',
			action: 'noop',
			adminonly: true
		},
		'twt': {
			label: '转移至维基词典',
			action: 'noop',
			adminonly: true
		},
		'two': {
			label: '转移至其他维基计划',
			action: 'noop',
			adminonly: true
		}
	},
	'其他处理方法': {
		'c': {
			label: '转交侵权',
			action: 'noop'
		},
		//'m2pfd': {
		//	label: '转送页面存废讨论',
		//	action: 'noop'
		//},
		'm2ifd': {
			label: '转送文件存废讨论',
			action: 'noop'
		},
		'r': {
			label: '重定向',
			action: 'noop',
			adminonly: true
		},
		'cr': {
			label: '分类重定向',
			action: 'noop',
			adminonly: true
		},
		'm': {
			label: '移动',
			action: 'noop',
			adminonly: true
		},
		'merge': {
			label: '并入',
			action: 'noop',
			adminonly: true
		},
		'nc': {
			label: '无共识',
			action: 'keep',
			adminonly: true
		}
	}
}, {
	'請求無效': {
		'ir': {
			label: '請求無效',
			action: 'keep'
		},
		'rep': {
			label: '重複提出，無效',
			action: 'keep'
		},
		'commons': {
			label: '應在維基共享資源提請',
			action: 'keep'
		},
		'ne': {
			label: '目標頁面或檔案不存在，無效',
			action: 'keep'
		},
		'nq': {
			label: '提刪者未取得提刪資格，無效',
			action: 'keep'
		}
	},
	'保留': {
		'k': {
			label: '保留',
			action: 'keep',
			adminonly: true
		},
		'sk': {
			label: '快速保留',
			action: 'keep'
		},
		'tk': {
			label: '暫時保留',
			action: 'keep',
			adminonly: true
		},
		'rr': {
			label: '請求理由消失',
			action: 'keep',
			selected: (Twinkle.getPref('XfdClose') === 'nonadminonly')
		},
		'dan': {
			label: '刪後重建',
			action: 'keep',
			adminonly: true
		}
	},
	'刪除': {
		'd': {
			label: '刪除',
			action: 'del',
			adminonly: true,
			selected: (Twinkle.getPref('XfdClose') === 'all')
		},
		'ic': {
			label: '圖像因侵權被刪',
			action: 'del',
			adminonly: true
		}
	},
	'快速刪除': {
		'sd': {
			label: '快速刪除',
			action: 'del'
		},
		'lssd': {
			label: '無來源或版權資訊，快速刪除',
			action: 'del'
		},
		'svg': {
			label: '已改用SVG圖形，快速刪除',
			action: 'del'
		},
		'nowcommons': {
			label: '維基共享資源已提供，快速刪除',
			action: 'del'
		},
		'drep': {
			label: '多次被刪除，條目鎖定',
			action: 'del',
			adminonly: true
		}
	},
	'轉移至其他維基計劃': {
		'twc': {
			label: '轉移至維基共享資源',
			action: 'noop',
			adminonly: true
		},
		'twn': {
			label: '轉移至維基新聞',
			action: 'noop',
			adminonly: true
		},
		'tws': {
			label: '轉移至維基文庫',
			action: 'noop',
			adminonly: true
		},
		'twb': {
			label: '轉移至維基教科書',
			action: 'noop',
			adminonly: true
		},
		'twq': {
			label: '轉移至維基語錄',
			action: 'noop',
			adminonly: true
		},
		'twt': {
			label: '轉移至維基詞典',
			action: 'noop',
			adminonly: true
		},
		'two': {
			label: '轉移至其他維基計劃',
			action: 'noop',
			adminonly: true
		}
	},
	'其他處理方法': {
		'c': {
			label: '轉交侵權',
			action: 'noop'
		},
		//'m2pfd': {
		//	label: '轉送頁面存廢討論',
		//	action: 'noop'
		//},
		'm2ifd': {
			label: '轉送檔案存廢討論',
			action: 'noop'
		},
		'r': {
			label: '重定向',
			action: 'noop',
			adminonly: true
		},
		'cr': {
			label: '分類重定向',
			action: 'noop',
			adminonly: true
		},
		'm': {
			label: '移動',
			action: 'noop',
			adminonly: true
		},
		'merge': {
			label: '併入',
			action: 'noop',
			adminonly: true
		},
		'nc': {
			label: '無共識',
			action: 'keep',
			adminonly: true
		}
	}
});

Twinkle.close.callback = function twinklecloseCallback(title, section, noop) {
	var Window = new Morebits.simpleWindow( 400, 150 );
	Window.setTitle( wgULS("关闭存废讨论", "關閉存廢討論") + " \u00B7 " + title );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#close" );

	var form = new Morebits.quickForm( Twinkle.close.callback.evaluate );

	form.append( {
		type: 'select',
		label: wgULS('处理结果：', '處理結果：'),
		name: 'sub_group',
		event: Twinkle.close.callback.change_code
	} );

	form.append( {
			type: 'input',
			name: 'remark',
			label: wgULS('补充说明：', '補充說明：')
	} );

	form.append( {
		type: 'checkbox',
		list: [
			{
				label: wgULS('只关闭讨论，不进行其他操作', '只關閉討論，不進行其他操作'),
				value: 'noop',
				name: 'noop',
				checked: noop
			}
		]
	} );

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	var sub_group = result.getElementsByTagName('select')[0]; // hack

	var resultData = {
		title: title,
		section: parseInt(section),
		noop: noop
	};
	$(result).data("resultData", resultData);
	// worker function to create the combo box entries
	var createEntries = function( contents, container ) {
		$.each( contents, function( itemKey, itemProperties ) {
			var key = (typeof itemKey === "string") ? itemKey : itemProperties.value;

			var elem = new Morebits.quickForm.element( {
				type: 'option',
				label: key + '：' + itemProperties.label,
				value: key,
				selected: itemProperties.selected,
				disabled: (Twinkle.getPref('XfdClose') !== 'all' && itemProperties.adminonly)
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

	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.sub_group.dispatchEvent( evt );
};

Twinkle.close.callback.change_code = function twinklecloseCallbackChangeCode(e) {
	var resultData = $(e.target.form).data("resultData");
	var messageData = $(e.target).find('option[value="' + e.target.value + '"]').data("messageData");
	var noop = e.target.form.noop;
	if (resultData.noop || messageData.action === 'noop') {
		noop.checked = true;
		noop.disabled = true;
	}
	else {
		noop.checked = false;
		noop.disabled = false;
	}
};

Twinkle.close.callback.evaluate = function twinklecloseCallbackEvaluate(e) {
	var code = e.target.sub_group.value;
	var resultData = $(e.target).data('resultData');
	var messageData = $(e.target.sub_group).find('option[value="' + code + '"]').data("messageData");
	var noop = e.target.noop.checked;
	var params = {
		title: resultData.title,
		code: code,
		remark: e.target.remark.value,
		section: resultData.section,
		messageData: messageData
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.notice = "操作完成";

	if (noop || messageData.action === 'noop') {
		Twinkle.close.callbacks.talkend( params );
	}
	else {
		switch (messageData.action) {
			case 'del':
				Twinkle.close.callbacks.del(params);
				break;
			case 'keep':
				var wikipedia_page = new Morebits.wiki.page( params.title, wgULS('移除存废讨论模板', '移除存廢討論模板') );
				wikipedia_page.setCallbackParameters( params );
				wikipedia_page.load( Twinkle.close.callbacks.keep );
				break;
			default:
				alert("Twinkle.close：未定义 " + code);
				return;
		}
	}
};

Twinkle.close.callbacks = {
	del: function (params) {
		Morebits.wiki.addCheckpoint();

		var page = new Morebits.wiki.page( params.title, "删除页面" );

		page.setEditSummary( wgULS('存废讨论通过：[[', '存廢討論通過：[[') + mw.config.get('wgPageName') + ']]' + Twinkle.getPref('deletionSummaryAd') );
		page.deletePage(function() {
			page.getStatusElement().info("完成");
			Twinkle.close.callbacks.talkend( params );
		});
		Morebits.wiki.removeCheckpoint();
	},
	keep: function (pageobj) {
		var statelem = pageobj.getStatusElement();

		if (!pageobj.exists()) {
			statelem.error( wgULS("页面不存在，可能已被删除", "頁面不存在，可能已被刪除") );
			return;
		}

		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var pagetitle = mw.Title.newFromText(params.title);
		if (pagetitle.getNamespaceId() % 2 === 0) {
			var talkpagetitle = new mw.Title(pagetitle.getMainText(), pagetitle.getNamespaceId() + 1);
			var talkpage = new Morebits.wiki.page(talkpagetitle.toString(), wgULS('标记讨论页', '標記討論頁'));
			var vfdkept = '{{vfd-kept|' + mw.config.get('wgPageName').split('/').slice(2).join('/') + '|' + params.messageData.label + '}}\n';
			talkpage.setPrependText(vfdkept);
			talkpage.setEditSummary('[[' + mw.config.get('wgPageName') + ']]：' + params.messageData.label + Twinkle.getPref('summaryAd'));
			talkpage.setCreateOption('recreate');
			talkpage.prepend();
		}

		var newtext = text.replace(/<noinclude>\s*\{\{([rsaiftcmv]fd)\|[^{}]*?\}\}\s*<\/noinclude>\s*/gi, '');
		newtext = newtext.replace(/\{\{([rsaiftcmv]fd)\|[^{}]*?\}\}\s*/gi, '');
		if (params.code !== 'tk') {
			newtext = newtext.replace(/\{\{(notability|fame|mair|知名度|重要性|显著性|顯著性|知名度不足|人物重要性|重要性不足|notable|关注度|关注度不足|關注度|關注度不足|重要|重要度)\|[^{}]*?\}\}\n*/gi, '');
			newtext = newtext.replace(/\{\{(substub|小小作品|cod|小小條目|小小条目)\|[^{}]*?\}\}\n*/gi, '');
		}
		if (newtext === text) {
			statelem.warn(wgULS("未找到存废讨论模板，可能已被移除", "未找到存廢討論模板，可能已被移除"));
			Twinkle.close.callbacks.talkend( params );
			return;
		}
		var editsummary = wgULS('存废讨论关闭：[[', '存廢討論關閉：[[') + mw.config.get('wgPageName') + ']]';

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
		var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS('关闭讨论', '關閉討論'));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setPageSection(params.section);
		wikipedia_page.load(Twinkle.close.callbacks.saveTalk);
	},
	saveTalk: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		if (text.indexOf('{{delh') !== -1) {
			statelem.error( wgULS("讨论已被关闭", "討論已被關閉") );
			return;
		}

		var sbegin = text.indexOf('<section begin=backlog />') !== -1;
		var send = text.indexOf('<section end=backlog />') !== -1;
		text = text.replace('\n<section begin=backlog />', '');
		text = text.replace('\n<section end=backlog />', '');

		var bar = text.split('\n----\n');
		var split = bar[0].split('\n');

		text = split[0] + '\n{{delh|' + params.code + '}}\n' + split.slice(1).join('\n');
		text += '\n----\n: ' + params.messageData.label;
		if (params.remark) {
			text += '：' + params.remark;
		}
		else {
			text += '。';
		}
		text += '--~~~~\n{{delf}}';

		if (bar[1]) {
			text += '\n----\n' + bar.slice(1).join('\n----\n');
		}
		if (send) {
			text += '\n<section end=backlog />';
		}
		if (sbegin) {
			// guaranteed to be at tne end?
			text += '\n<section begin=backlog />';
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
};

})(jQuery);


//</nowiki>
