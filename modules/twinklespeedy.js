/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, check out the default values of the CSD preferences
 *   in twinkle.header.js, and add your new criterion to those if you think it would
 *   be good. 
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	twAddPortletLink( Twinkle.speedy.callback, "速删", "tw-csd", Morebits.userIsInGroup('sysop') ? "快速删除" : "请求快速删除" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	if ( !twinkleUserAuthorized ) {
		alert("您尚未达到自动确认。");
		return;
	}

	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

Twinkle.speedy.dialog = null;  // used by unlink feature

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.simpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle( "选择快速删除理由" );
	dialog.setScriptName( "Twinkle" );
	dialog.addFooterLink( "快速删除方针", "WP:CSD" );
	dialog.addFooterLink( "Twinkle帮助", "WP:TW/DOC#speedy" );

	var form = new Morebits.quickForm( callbackfunc, (Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null) );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '只标记，不删除',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: '如果您只想标记此页面而不是删除它',
						checked : Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							var cForm = event.target.form;
							var cChecked = event.target.checked;
							// enable/disable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.disabled = cChecked;
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							cForm.redirects.disabled = cChecked;
							cForm.redirects.checked = !cChecked;

							// enable/disable notify checkbox
							cForm.notify.disabled = !cChecked;
							cForm.notify.checked = cChecked;
							// enable/disable multiple
							cForm.multiple.disabled = !cChecked;
							cForm.multiple.checked = false;

							Twinkle.speedy.callback.dbMultipleChanged(cForm, false);

							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '删除相关选项' } );
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) {  // hide option for user pages, to avoid accidentally deleting user talk page
			form.append( {
				type: 'checkbox',
				list: [
					{
						label: '删除讨论页',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "删除时附带删除此页面的讨论页。",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		}
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '删除重定向',
						value: 'redirects',
						name: 'redirects',
						tooltip: "删除到此页的重定向。",
						checked: Twinkle.getPref('deleteRedirectsOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '标记相关选项' } );
	}

	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '如可能，通知创建者',
					value: 'notify',
					name: 'notify',
					tooltip: "一个通知模板将会被加入创建者的对话页，如果您启用了该理据的通知。",
					checked: !Morebits.userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						event.stopPropagation();
					}
				}
			]
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '应用多个理由',
					value: 'multiple',
					name: 'multiple',
					tooltip: "您可选择应用于该页的多个理由。",
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						Twinkle.speedy.callback.dbMultipleChanged( event.target.form, event.target.checked );
						event.stopPropagation();
					}
				}
			]
		} );

	form.append( {
			type: 'div',
			name: 'work_area',
			label: '初始化CSD模块失败，请重试，或将这报告给Twinkle开发者。'
		} );

	if( Twinkle.getPref( 'speedySelectionStyle' ) !== 'radioClick' ) {
		form.append( { type: 'submit' } );
	}

	var result = form.render();
	dialog.setContent( result );
	dialog.display();

	Twinkle.speedy.callback.dbMultipleChanged( result, false );
};

Twinkle.speedy.callback.dbMultipleChanged = function twinklespeedyCallbackDbMultipleChanged(form, checked) {
	var namespace = mw.config.get('wgNamespaceNumber');
	var value = checked;

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (checked && Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		work_area.append( {
				type: 'div',
				label: '当选择完成后，点击：'
			} );
		work_area.append( {
				type: 'button',
				name: 'submit-multiple',
				label: '提交',
				event: function( event ) {
					Twinkle.speedy.callback.evaluateUser( event );
					event.stopPropagation();
				}
			} );
	}

	var radioOrCheckbox = (value ? 'checkbox' : 'radio');

	switch (namespace) {
		case 0:  // article
			work_area.append( { type: 'header', label: '条目' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getArticleList(value) } );
			break;

		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: '用户页' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getUserList(value) } );
			break;

		case 6:  // file
			work_area.append( { type: 'header', label: '文件' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getFileList(value) } );
			work_area.append( { type: 'div', label: '标记CSD F3、F4，请使用Twinkle的“图版”功能。' } );
			break;

		case 14:  // category
			work_area.append( { type: 'header', label: '分类' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.categoryList } );
			break;

		default:
			break;
	}

	work_area.append( { type: 'header', label: '常规' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getGeneralList(value) });

	if (Morebits.wiki.isPageRedirect() || Morebits.userIsInGroup('sysop')) {
		work_area.append( { type: 'header', label: '重定向' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.redirectList } );
	}

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

// this is a function to allow for db-multiple filtering
Twinkle.speedy.getFileList = function twinklespeedyGetFileList(multiple) {
	var result = [];
	result.push({
		label: 'F1: 重复的文件（完全相同或缩小），而且所有的链入连接已经被修改为指向保留的文件。',
		value: 'f1'
	});
	if (Morebits.userIsInGroup('sysop')) {
		result.push({
			label: 'F3: 所有未知版权的文件和来源不明文件。',
			value: 'f3'
		});
		result.push({
			label: 'F4: 没有依据上载页面指示提供版权状况、来源等资讯的文件。',
			value: 'f4'
		});
	}
	result.push({
		label: 'F5: 被高分辨率或SVG文件取代的图片。',
		value: 'f5'
	});
	result.push({
		label: 'F6: 孤立而没有被条目使用的非自由版权文件。',
		value: 'f6'
	});
	if (!multiple) {
		result.push({
			label: 'F7: 被维基共享资源文件取代的文件。',
			value: 'f7'
		});
	}
	return result;
};

Twinkle.speedy.getArticleList = function twinklespeedyGetArticleList(multiple) {
	var result = [];
	result.push({
		label: 'A1: 非常短，而且没有定义或内容。',
		value: 'a1',
		tooltip: '例如：“他是一个很有趣的人，他创建了工厂和庄园。并且，顺便提一下，他的妻子也很好。”如果能够发现任何相关的内容，可以将这个页面重定向到相关的条目上。'
	});
	result.push({
		label: 'A2: 内容只包括外部连接、参见、图书参考、类别标签、模板标签、跨语言连接的条目。',
		value: 'a2',
		tooltip: '请注意：有些维基人创建条目时会分开多次保存，请避免删除有人正在工作的页面。带有{{inuse}}的不适用。'
	});
	result.push({
		label: 'A3: 复制自其他中文维基计划，或是与其他中文维基计划内容相同的文章。或者是透过Transwiki系统移动的文章。',
		value: 'a3'
	});
	result.push({
		label: 'A5: 条目建立时之内容即与其他现有条目内容完全相同，且名称不适合做为其他条目之重定向。',
		value: 'a5',
		tooltip: '条目被建立时，第一个版本的内容与当时其他现存条目完全相同，且这个条目的名称不适合改为重定向，就可以提送快速删除。如果名称可以作为重定向，就应直接改重定向，不要提送快速删除。如果是多个条目合并产生的新条目，不适用。如果是从主条目拆分产生的条目，不适用；如有疑虑，应提送存废讨论处理。'
	});
	return result;
};

Twinkle.speedy.categoryList = [
	{
		label: 'O4: 空的类别（没有条目也没有子类别）。',
		value: 'o4',
		tooltip: '不适用于Category:不要删除的分类中的空分类。'
	}
];

Twinkle.speedy.getUserList = function twinklespeedyGetTemplateList(multiple) {
	var result = [];
	result.push({
		label: 'O1: 用户请求删除自己的用户页或其子页面。',
		value: 'o1',
		tooltip: '如果是从其他名字空间移动来的，须附有合理原因。'
	});
	result.push({
		label: 'O3: 匿名用户的用户讨论页，其中的内容不再有用。',
		value: 'o3'
	});
	return result;
};

Twinkle.speedy.getGeneralList = function twinklespeedyGetGeneralList(multiple) {
	var result = [];
	if (!multiple) {
		result.push({
			label: '自定义理由' + (Morebits.userIsInGroup('sysop') ? '（自定义删除理由）' : ''),
			value: 'reason',
			tooltip: '该页至少应该符合一条快速删除的标准，并且您必须在理由中提到。这不是万能的删除理由。'
		});
	}
	result.push({
		label: 'G1: 没有实际内容或历史纪录的页面。',
		value: 'g1',
		tooltip: '如“adfasddd”。参见胡言乱语。但注意：图片也算是内容。'
	});
	result.push({
		label: 'G2: 测试页面。',
		value: 'g2',
		tooltip: '例如：“这是一个测试。”'
	});
	result.push({
		label: 'G3: 纯粹破坏或明显的恶作剧。',
		value: 'g3',
		tooltip: '包括明显的错误信息、明显的恶作剧、信息明显错误的图片，以及清理移动破坏时留下的重定向。'
	});
	result.push({
		label: 'G5: 曾经根据页面存废讨论、疑似侵权讨论、文件存废讨论被删除后又重新创建的内容，而有关内容与被删除的版本相同或非常相似，无论标题是否相同。',
		value: 'g5',
		tooltip: '该内容之前必须是经存废讨论删除，如之前属于快速删除，请以相同理由重新提送快速删除。不适用于根据恢复守则被恢复的内容。在某些情况下，重新创建的条目有发展的机会。那么不应提交快速删除，而应该提交删除投票进行讨论。'
	});
	result.push({
		label: 'G10: 原作者清空页面或提出删除，且贡献者只有一人。提请须出于善意，及附有合理原因。',
		value: 'g10',
		tooltip: '如果贡献者只有一人（对条目内容无实际修改的除外），并附有合理原因，适用此项。'
	});
	result.push({
		label: 'G11: 明显以广告宣传为目的而建立的页面，或任何只有该页面名称中的人物或团体的联系方法的页面。',
		value: 'g11',
		tooltip: '只针对专门用于宣传的页面，这些页面需要经过完全重写才能体现百科全书性。需注意，仅仅以某公司或产品为主题的条目，并不直接导致其自然满足此速删标准。'
	});
	result.push({
		label: 'G12: 未列明来源且语调负面的生者传记，无任何版本可回退。',
		value: 'g12',
		tooltip: '注意是未列明来源且语调负面，必须2项均符合。'
	});
	result.push({
		label: 'G13: 明显的、拙劣的机器翻译。',
		value: 'g13'
	});
	if (Morebits.userIsInGroup('sysop')) {
		result.push({
			label: 'G14: 超过两周没有进行任何翻译的非现代标准汉语页面。',
			value: 'g14',
			tooltip: '包括所有未翻译的外语、汉语方言以及文言文。'
		});
	}
	result.push({
		label: 'G15: 孤立页面。',
		value: 'g15',
		tooltip: '包括以下几种类型：1. 没有对应文件的文件页面；2. 没有对应母页面的子页面，用户页子页面除外；3. 指向不存在页面的重定向；4. 没有对应内容页面的讨论页，讨论页存档和用户讨论页除外；5. 对应内容页面为重定向的讨论页，前提是讨论页建立于重定向之后，或者讨论内容已经存档；6. 不存在用户的用户页及用户页子页面，随用户更名产生的用户页重定向除外。'
	});
	if (Morebits.userIsInGroup('sysop')) {
		result.push({
			label: 'G16: 临时页面依然侵权。',
			value: 'g16',
			tooltip: '因为主页面侵权而创建的临时页面仍然侵权。'
		});
	}
	return result;
};

Twinkle.speedy.redirectList = [
	{
		label: 'R2: 跨名字空间重定向。',
		value: 'r2',
		tooltip: '由条目的名字空间重定向至非条目名字空间，或将用户页移出条目名字空间时遗留的重定向。'
	},
	{
		label: 'R3: 格式错误，或明显笔误的重定向。',
		value: 'r3',
		tooltip: '包括标题繁简混用、消歧义使用的括号或空格错误、间隔号使用错误、标题中使用非常见的错别字、移动侵权页面的临时页后所产生的重定向。'
	},
	{
		label: 'R5: 指向本身的重定向或循环的重定向。',
		value: 'r5',
		tooltip: '如A→B→C→……→A。'
	}
];

Twinkle.speedy.normalizeHash = {
	'reason': 'db',
	'multiple': 'multiple',
	'multiple-finish': 'multiple-finish',
	'g1': 'g1',
	'g2': 'g2',
	'g3': 'g3',
	'g5': 'g5',
	'g10': 'g10',
	'g11': 'g11',
	'g12': 'g12',
	'g13': 'g13',
	'g14': 'g14',
	'g15': 'g15',
	'g16': 'g16',
	'a1': 'a1',
	'a2': 'a2',
	'a3': 'a3',
	'a5': 'a5',
	'r2': 'r2',
	'r3': 'r3',
	'r5': 'r5',
	'f1': 'f1',
	'f3': 'f3',
	'f4': 'f4',
	'f5': 'f5',
	'f6': 'f6',
	'f7': 'f7',
	'o1': 'o1',
	'o3': 'o3',
	'o4': 'o4'
};

// keep this synched with [[MediaWiki:Deletereason-dropdown]]
Twinkle.speedy.reasonHash = {
	'reason': '',
// General
	'g1': '无实际内容',
	'g2': '测试页',
	'g3': '破坏',
	'g5': '曾经依存废讨论被删除的重建内容',
	'g10': '作者请求',
	'g11': '广告或宣传',
	'g12': '未列明来源或违反生者传记的负面内容',
	'g13': '明显且拙劣的机器翻译',
	'g14': '超过两周没有翻译的非现代标准汉语页面',
	'g15': '孤立页面',
	'g16': '临时页面依然侵权',
// Articles
	'a1': '非常短而无定义或内容',
	'a2': '内容只包含参考、链接、模板或/及分类',
	'a3': '与其他中文维基计划内容相同的文章',
	'a5': '条目建立时之内容即与其他现有条目内容相同',
// Redirects
	'r2': '跨名字空间重定向',
	'r3': '标题错误的重定向',
	'r5': '指向本身的重定向或循环的重定向',
// Images and media
	'f1': '重复的图片',
	'f3': '[[:Category:未知版权的档案]]',
	'f4': '[[:Category:來源不明檔案]]',
	'f5': '已有高分辨率的图片取代',
	'f6': '孤立而没有被条目使用的非自由版权图片',
	'f7': '[[:Category:与维基共享资源重复的档案]]',
// User pages
	'o1': '用户请求删除自己的用户页或其子页面',
	'o3': '匿名用户的讨论页',
// Categories
	'o4': '空的类别'
// Templates
// Portals
};

Twinkle.speedy.callbacks = {
	sysop: {
		main: function( params ) {
			var thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "删除页面" );

			// delete page
			var reason;
			if (params.normalized === 'db') {
				reason = prompt("输入删除理由：", "");
			} else {
				var presetReason = "[[WP:CSD#" + params.normalized.toUpperCase() + "|" + params.normalized.toUpperCase() + "]]: " + params.reason;
				if (Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
					reason = prompt("输入删除理由，或点击确定以接受自动生成的：", presetReason);
				} else {
					reason = presetReason;
				}
			}
			if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				Morebits.status.error("询问理由", "您没有提供理由，取消操作。");
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage();

			// delete talk page
			if (params.deleteTalkPage &&
			    params.normalized !== 'f7' &&
			    params.normalized !== 'o1' &&
			    document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "删除讨论页" );
				talkpage.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 已删除页面“' + mw.config.get('wgPageName') + "”的讨论页" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
			}

			// prompt for protect on G11
			var $link, $bigtext;
			if (params.normalized === 'g11') {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里施行保护',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						mw.config.set('wgArticleId', 0);
						Twinkle.protect.callback();
					}
				});
				$bigtext = $('<span/>', {
					'text': '白纸保护该页',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}

			// promote Unlink tool
			var $link, $bigtext;
			if( mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f7' ) {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除文件 " + mw.config.get('wgPageName') + " 的使用");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除文件的使用',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f7') {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除页面 " + mw.config.get('wgPageName') + " 的链接");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除页面的链接',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}

			// open talk page of first contributor
			if( params.openusertalk ) {
				thispage = new Morebits.wiki.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect status text
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}

			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					'action': 'query',
					'list': 'backlinks',
					'blfilterredir': 'redirects',
					'bltitle': mw.config.get('wgPageName'),
					'bllimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.api( '取得重定向列表…', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.status( '删除重定向' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var statusIndicator = new Morebits.status('打开用户 ' + user + ' 的对话页', '正在打开…');

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': mw.config.get('wgPageName').replace(/_/g, ' ')
			};
			switch( Twinkle.getPref('userTalkPageMode') ) {
			case 'tab':
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_tab' );
				break;
			case 'blank':
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
				break;
			case 'window':
				/* falls through */
				default :
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), 'twinklewarnwindow', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
				break;
			}

			statusIndicator.info( '完成' );
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('backlinks bl');

			var total = $snapshot.length;

			if( !total ) {
				return;
			}

			var statusIndicator = apiobj.statelem;
			statusIndicator.status("0%");

			var onsuccess = function( apiobj ) {
				var obj = apiobj.parent.params.obj;
				var total = apiobj.parent.params.total;
				var now = parseInt( 100 * ++(apiobj.parent.params.current)/total, 10 ) + '%';
				obj.update( now );
				apiobj.statelem.unlink();
				if( apiobj.parent.params.current >= total ) {
					obj.info( now + '（完成）' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			var params = $.extend( {}, apiobj.params );
			params.current = 0;
			params.total = total;
			params.obj = statusIndicator;

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, '删除重定向 "' + title + '"');
				page.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 重定向到已删除页面“' + mw.config.get('wgPageName') + "”" + Twinkle.getPref('deletionSummaryAd'));
				page.params = params;
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error( "页面不存在，可能已被删除" );
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status( '检查页面已有标记…' );

			// check for existing deletion tags
			var tag = /(?:\{\{\s*(db|d|delete|db-.*?)(?:\s*\||\s*\}\}))/i.exec( text );
			if( tag ) {
				statelem.error( [ Morebits.htmlNode( 'strong', tag[1] ) , " 已被置于页面中。" ] );
				return;
			}

			var xfd = /(?:\{\{([rsaiftcm]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
			if( xfd && !confirm( "删除相关模板{{" + xfd[1] + "}}已被置于页面中，您是否仍想添加一个快速删除模板？" ) ) {
				return;
			}

			var code, parameters, i;
			if (params.normalizeds.length > 1)
			{
				code = "{{delete";
				var breakFlag = false;
				$.each(params.normalizeds, function(index, norm) {
					code += "|" + norm.toUpperCase();
					parameters = Twinkle.speedy.getParameters(params.values[index], norm, statelem);
					if (!parameters) {
						breakFlag = true;
						return false;  // the user aborted
					}
					for (i in parameters) {
						if (typeof parameters[i] === 'string' && !parseInt(i, 10)) {  // skip numeric parameters - {{db-multiple}} doesn't understand them
							code += "|" + parameters[i];
						}
					}
				});
				if (breakFlag) {
					return;
				}
				code += "}}";
				params.utparams = [];
			}
			else
			{
				parameters = Twinkle.speedy.getParameters(params.values[0], params.normalizeds[0], statelem);
				if (!parameters) {
					return;  // the user aborted
				}
				code = "{{delete";
				if (params.values[0] !== 'reason') {
					code += "|" + params.values[0];
				}
				for (i in parameters) {
					if (typeof parameters[i] === 'string') {
						code += "|" + parameters[i];
					}
				}
				code += "}}";
				params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
			}

			var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Remove tags that become superfluous with this action
			text = text.replace(/\{\{\s*(New unreviewed article|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
			if (mw.config.get('wgNamespaceNumber') === 6) {
				// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
				text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, "");
			}

			// Generate edit summary for edit
			var editsummary;
			if (params.normalizeds.length > 1) {
				editsummary = '请求快速删除（';
				$.each(params.normalizeds, function(index, norm) {
					editsummary += '[[WP:CSD#' + norm.toUpperCase() + '|CSD ' + norm.toUpperCase() + ']]、';
				});
				editsummary = editsummary.substr(0, editsummary.length - 1); // remove trailing comma
				editsummary += '）。';
			} else if (params.normalizeds[0] === "db") {
				editsummary = '请求[[WP:CSD|快速删除]]：' + parameters["1"];
			/*} else if (params.values[0] === "histmerge") {
				editsummary = "Requesting history merge with [[" + parameters["1"] + "]] ([[WP:CSD#G6|CSD G6]]).";*/
			} else {
				editsummary = "请求快速删除（[[WP:CSD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]]）。";
			}

			pageobj.setPageText(code + "\n" + text);
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
		},

		tagComplete: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();

					// don't notify users when their user talk page is nominated
					if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("通知页面创建者：用户创建了自己的对话页");
						return;
					}

					var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）"),
					    notifytext, i;

					notifytext = "\n{{subst:db-notice|target=" + mw.config.get('wgPageName');
					notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

					var editsummary = "通知：";
					if (params.normalizeds.indexOf("g12") === -1) {  // no article name in summary for G10 deletions
						editsummary += "页面[[" + mw.config.get('wgPageName') + "]]";
					} else {
						editsummary += "一攻击性页面";
					}
					editsummary += "快速删除提名";

					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.type, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Morebits.wiki.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "添加项目到用户日志");
			params.logInitialContrib = initialContrib;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.speedy.callbacks.user.saveLog);
		},

		saveLog: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				text =
					"这是该用户使用[[WP:TW|Twinkle]]的速删模块做出的[[WP:CSD|快速删除]]提名列表。\n\n" +
					"如果您不再想保留此日志，请在[[Wikipedia:Twinkle/参数设置|参数设置]]中关掉，并" +
					"使用[[WP:CSD#O1|CSD O1]]提交快速删除。\n";
				if (Morebits.userIsInGroup("sysop")) {
					text += "\n此日志并不记录用Twinkle直接执行的删除。\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCFullYear() + "\\s*年\\s*" + (date.getUTCMonth() + 1) + "\\s*月\\s*==+", "m");
			if (!headerRe.exec(text)) {
				text += "\n\n=== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 ===";
			}

			text += "\n# [[:" + mw.config.get('wgPageName') + "]]: ";
			if (params.fromDI) {
				text += "图版[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]（" + params.type + "）";
			} else {
				if (params.normalizeds.length > 1) {
					text += "多个理由（";
					$.each(params.normalizeds, function(index, norm) {
						text += "[[WP:CSD#" + norm.toUpperCase() + "|" + norm.toUpperCase() + ']]、';
					});
					text = text.substr(0, text.length - 1);  // remove trailing comma
					text += '）';
				} else if (params.normalizeds[0] === "db") {
					text += "自定义理由";
				} else {
					text += "[[WP:CSD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]]";
				}
			}

			if (params.logInitialContrib) {
				text += "；通知{{user|" + params.logInitialContrib + "}}";
			}
			text += " ~~~~~\n";

			pageobj.setPageText(text);
			pageobj.setEditSummary("记录对[[" + mw.config.get('wgPageName') + "]]的快速删除提名。" + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.save();
		}
	}
};

// prompts user for parameters to be passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(value, normalized, statelem)
{
	var parameters = [];
	switch( normalized ) {
		case 'db':
			var dbrationale = prompt('这个页面应当被快速删除，因为：', "");
			if (!dbrationale || !dbrationale.replace(/^\s*/, "").replace(/\s*$/, ""))
			{
				statelem.error( '您必须提供理由，用户取消操作。' );
				return null;
			}
			parameters["1"] = dbrationale;
			break;
		case 'f7':
			var pagenamespaces = mw.config.get('wgPageName').replace( '_', ' ' );
			var filename = prompt( '[CSD F7] 请输入维基共享上的文件名：', pagenamespaces );
			if (filename === null)
			{
				statelem.error( '用户取消操作。' );
				return null;
			}
			if (filename !== '' && filename !== pagenamespaces)
			{
				if (filename.indexOf("Image:") === 0 || filename.indexOf("File:") === 0)
				{
					parameters["1"] = filename;
				}
				else
				{
					statelem.error("缺少File:前缀，取消操作。");
					return null;
				}
			}
			break;
		case 'a5':
			var duptitle = prompt('[CSD A5] 请输入该其它条目的标题：', "");
			if (duptitle === null)
			{
				statelem.error( '用户取消操作。' );
				return null;
			}
			if (duptitle !== '')
			{
				parameters.duptitle = '[[:' + duptitle + ']]';
			}
			break;
		case 'g10':
			if (Twinkle.getPref('speedyPromptOnG10'))
			{
				var g10rationale = prompt('[CSD G10] 请提供可选的理由（比如作者在哪里请求了删除——留空以跳过）：', "");
				if (g10rationale === null)
				{
					statelem.error( '用户取消操作。' );
					return null;
				}
				if (g10rationale !== '')
				{
					parameters.rationale = g10rationale;
				}
			}
			break;
		case 'f1':
			var img = prompt( '[CSD F1] 输入与此文件相同的文件名（不含“File:”前缀）：', "" );
			if (img === null)
			{
				statelem.error( '用户取消操作。' );
				return null;
			}
			parameters.filename = img;
			break;
		default:
			break;
	}
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters)
{
	var utparams = [];
	switch (normalized)
	{
		default:
			break;
	}
	return utparams;
};


Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	var values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert( "请选择一个理据！" );
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e)
{
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' ')); // for queen/king/whatever and country!
	var form = (e.target.form ? e.target.form : e.target);

	var tag_only = form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var value = Twinkle.speedy.resolveCsdValues(e)[0];
	if (!value) {
		return;
	}
	var normalized = Twinkle.speedy.normalizeHash[ value ];

	var params = {
		value: value,
		normalized: normalized,
		watch: Twinkle.getPref('watchSpeedyPages').indexOf( normalized ) !== -1,
		reason: Twinkle.speedy.reasonHash[ value ],
		openusertalk: Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf( normalized ) !== -1,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox") {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	//var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[ value ];

		// for sysops only
		if (['f3', 'f4'].indexOf(norm) !== -1) {
			alert("您不能使用此工具标记CSD F3、F4，请使用“图版”工具，或取消勾选“仅标记”。");
			return;
		}

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = true;
			return false;  // break
		}
	});

	var notifyuser = false;
	if (form.notify.checked) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(norm) !== -1) {
				notifyuser = true;
				return false;  // break
			}
		});
	}

	var welcomeuser = false;
	if (notifyuser) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(norm) !== -1) {
				welcomeuser = true;
				return false;  // break
			}
		});
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations')) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('noLogOnSpeedyNomination').indexOf(norm) === -1) {
				csdlog = true;
				return false;  // break
			}
		});
	}

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "标记完成";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "标记页面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
