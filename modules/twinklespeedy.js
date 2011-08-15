/*
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

	if ( userIsInGroup( 'sysop' ) ) {
		$(twAddPortletLink("#", "速删", "tw-csd", "快速删除", "")).click(Twinkle.speedy.callback);
	} else if (twinkleUserAuthorized) {
		$(twAddPortletLink("#", "速删", "tw-csd", "请求快速删除", "")).click(Twinkle.speedy.callback);
	} else {
		$(twAddPortletLink("#", '速删', 'tw-csd', '请求快速删除', '')).click(function() {
			alert("您还未达到自动确认。");
		});
	}
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

Twinkle.speedy.dialog = null;
// Prepares the speedy deletion dialog and displays it
// Parameters:
//  - callbackfunc: the function to call when the dialog box is submitted
//  - firstTime: is this the first time? (false during a db-multiple run, true otherwise)
//  - content: (optional) a div element in which the form content should be rendered - allows
//    for placing content in an existing dialog box
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc, firstTime, content) {
	var dialog;
	if (!content)
	{
		Twinkle.speedy.dialog = new SimpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
		dialog = Twinkle.speedy.dialog;
		dialog.setTitle( "选择快速删除理由" );
		dialog.setScriptName( "Twinkle" );
		dialog.addFooterLink( "快速删除方针", "WP:CSD" );
		dialog.addFooterLink( "Twinkle帮助", "WP:TW/DOC#speedy" );
	}

	var form = new QuickForm( callbackfunc, 'change' );
	if( firstTime && userIsInGroup( 'sysop' ) ) {
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
							// enable/disable notify checkbox
							event.target.form.notify.disabled = !event.target.checked;
							event.target.form.notify.checked = event.target.checked;
							// enable/disable talk page checkbox
							if (event.target.form.talkpage) {
								event.target.form.talkpage.disabled = event.target.checked;
								event.target.form.talkpage.checked = !event.target.checked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							event.target.form.redirects.disabled = event.target.checked;
							event.target.form.redirects.checked = !event.target.checked;
							// enable/disable multiple
							$(event.target.form).find('input[name="csd"][value="multiple"]')[0].disabled = !event.target.checked;
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
						checked: true,
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '标记相关选项' } );
	}

	// don't show this notification checkbox for db-multiple, as the value is ignored
	// XXX currently not possible to turn off notification when using db-multiple
	if (firstTime) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '如可能，通知创建者',
						value: 'notify',
						name: 'notify',
						tooltip: "一个通知模板将会被加入创建者的对话页。",
						checked: !userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
						disabled: userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			}
		);
	} else {
		form.append( { type:'header', label: '多个理由：第 ' + (Twinkle.speedy.dbmultipleCriteria.length + 1) + ' 个' } );
	}

	if (firstTime) {
		form.append( { type: 'radio', name: 'csd',
			list: [
				{
					label: '应用多个理由',
					value: 'multiple',
					tooltip: '开启一些新的对话框，让您选择多个理由。',
					disabled: userIsInGroup('sysop') && !Twinkle.getPref('deleteSysopDefaultToTag')
				}
			]
		} );
	} else if (Twinkle.speedy.dbmultipleCriteria.length > 0) {
		form.append( { type: 'radio', name: 'csd',
			list: [
				{
					label: '没有更多理由了，结束标记',
					value: 'multiple-finish'
				}
			]
		} );
	}

	switch (mw.config.get('wgNamespaceNumber')) {
		case 0:  // article
		case 1:  // talk
			form.append( { type: 'header', label: '条目' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.getArticleList(!firstTime) } );
			break;

		case 2:  // user
		case 3:  // user talk
			form.append( { type: 'header', label: '用户页' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.userList } );
			break;

		case 6:  // file
		case 7:  // file talk
			form.append( { type: 'header', label: '文件' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.getFileList(!firstTime) } );
			form.append( { type: 'div', label: '标记CSD F3、F4，请使用Twinkle的“图版”功能。' } );
			break;

		/*case 10:  // template
		case 11:  // template talk
			form.append( { type: 'header', label: '模板' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.getTemplateList(!firstTime) } );
			break;*/

		case 14:  // category
		case 15:  // category talk
			form.append( { type: 'header', label: '分类' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.categoryList } );
			break;

		/*case 100:  // portal
		case 101:  // portal talk
			form.append( { type: 'header', label: '主题' } );
			form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.getPortalList(!firstTime) } );
			break;*/

		default:
			break;
	}

	form.append( { type: 'header', label: '常规' } );
	form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.getGeneralList(!firstTime) });

	form.append( { type: 'header', label: '重定向' } );
	form.append( { type: 'radio', name: 'csd', list: Twinkle.speedy.redirectList } );

	var result = form.render();
	if (dialog)
	{
		// render new dialog
		dialog.setContent( result );
		dialog.display();
	}
	else
	{
		// place the form content into the existing dialog box
		content.textContent = ''; // clear children
		content.appendChild(result);
	}
};

// this is a function to allow for db-multiple filtering
Twinkle.speedy.getFileList = function twinklespeedyGetFileList(multiple) {
	var result = [];
	result.push({
		label: 'F1: 重复的文件（完全相同或缩小），而且所有的链入连接已经被修改为指向保留的文件。',
		value: 'f1'
	});
	if (userIsInGroup('sysop')) {
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
		label: 'A2: 没有内容。',
		value: 'a2',
		tooltip: '任何内容只包括外部连接、参见、图书参考、类别标签、模板标签、跨语言连接的条目（消歧义页、重定向、软重定向除外）。请注意：有些维基人创建条目时会分开多次保存，请避免删除有人正在工作的页面。带有{{inuse}}的不适用。'
	});
	result.push({
		label: 'A3: 跨维基条目。',
		value: 'a3',
		tooltip: '复制自其他中文维基计划，或是与其他中文维基计划内容相同的文章，或者是透过Transwiki系统移动的文章。'
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

Twinkle.speedy.userList = [
	{
		label: 'O1: 用户请求删除的他们自己的用户页或用户讨论页及其子页面。',
		value: 'o1',
		tooltip: '如果是从其他名字空间移动来的，须附有合理原因。'
	},
	{
		label: 'O3: 匿名用户的用户讨论页，其中的内容不再有用（避免给使用同一IP地址的用户带来混淆）。',
		value: 'o3'
	}
];

/*Twinkle.speedy.getTemplateList = function twinklespeedyGetTemplateList(multiple) {
	var result = [];
	result.push({
		label: 'T2: Templates that are blatant misrepresentations of established policy',
		value: 'policy',
		tooltip: 'This includes "speedy deletion" templates for issues that are not speedy deletion criteria and disclaimer templates intended to be used in articles'
	});
	if (!multiple) {
		result.push({
			label: 'T3: Templates that are not employed in any useful fashion',
			value: 't3',
			tooltip: 'Templates that are either substantial duplications of another template or hardcoded instances of another template where the same functionality could be provided by that other template'
		});
	}
	return result;
};*/

/*Twinkle.speedy.getPortalList = function twinklespeedyGetPortalList(multiple) {
	var result = [];
	if (!multiple) {
		result.push({
			label: 'P1: Portal that would be subject to speedy deletion if it were an article',
			value: 'p1',
			tooltip: 'You must specify the article criterion that applies in this case (A1, A3, A7, or A10).'
		});
	}
	result.push({
		label: 'P2: Underpopulated portal',
		value: 'emptyportal',
		tooltip: 'Any Portal based on a topic for which there is not a non-stub header article, and at least three non-stub articles detailing subject matter that would be appropriate to discuss under the title of that Portal'
	});
	return result;
};*/

Twinkle.speedy.getGeneralList = function twinklespeedyGetGeneralList(multiple) {
	var result = [];
	if (!multiple) {
		result.push({
			label: '自定义理由' + (userIsInGroup('sysop') ? '（自定义删除理由）' : ''),
			value: 'reason'
		});
	}
	result.push({
		label: 'G1: 没有实际内容或历史纪录的文章。',
		value: 'g1',
		tooltip: '如“adfasddd”。参见Wikipedia:胡言乱语。但注意：图片也算是内容。'
	});
	result.push({
		label: 'G2: 测试页面。',
		value: 'g2',
		tooltip: '例如：“这是一个测试。”'
	});
	result.push({
		label: 'G3: 纯粹破坏。',
		value: 'g3'
	});
	result.push({
		label: 'G5: 曾经根据Wikipedia:页面存废讨论、Wikipedia:页面存废讨论/疑似侵权、Wikipedia:文件存废讨论被删除后又重新创建的内容，无论标题是否相同。',
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
	if (userIsInGroup('sysop')) {
		result.push({
			label: 'G14: 未翻译页面。',
			value: 'g14',
			tooltip: '复制自其他维基媒体计划，超过两周没有进行任何翻译的非现代标准汉语页面，包括所有未翻译的外语、汉语方言以及文言文。'
		});
	}
	result.push({
		label: 'G15: 孤立页面。',
		value: 'g15',
		tooltip: '包括以下几种类型：1. 没有对应文件的文件页面；2. 没有对应母页面的子页面，用户页子页面除外；3. 指向不存在页面的重定向；4. 没有对应内容页面的讨论页，讨论页存档和用户讨论页除外；5. 对应内容页面为重定向的讨论页，前提是讨论页建立于重定向之后，或者讨论内容已经存档；6. 不存在用户的用户页及用户页子页面，随用户更名产生的用户页重定向除外。'
	});
	result.push({
		label: 'G16: 临时页面依然侵权。',
		value: 'g16',
		tooltip: '因为主页面侵权而创建的临时页面仍然侵权。'
	});
	return result;
};

Twinkle.speedy.redirectList = [
	{
		label: 'R2: 跨名字空间重定向。',
		value: 'r2',
		tooltip: '由条目的名字空间重定向至非条目名字空间，或将用户页移出条目名字空间时遗留的重定向。'
	},
	{
		label: 'R3: 名称错误的重定向，包括条目标题繁简混用、消歧义使用括号或空格错误、间隔号使用错误。',
		value: 'r3',
		tooltip: '不包括常见的拼写错误。为常见的拼写错误建立指向正确题目的重定向页面，可使百科用户纵使在查找文章时拼写错误，也能够找到寻求的文章。参阅：Wikipedia:命名常规。'
	},
	{
		label: 'R4: 故意破坏的结果。',
		value: 'r4',
		tooltip: '如将一个页面移动到一个没有意义的标题上，当重新移动回正确名称时，就会留下一个重定向页。'
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
	'r2': 'r2',
	'r3': 'r3',
	'r4': 'r4',
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
	'g12': '未列明来源或违反[[Wikipedia:生者传记]]的负面内容',
	'g13': '明显且拙劣的机器翻译',
	'g14': '超过两周没有翻译的非现代标准汉语页面',
	'g15': '孤立页面',
	'g16': '临时页面依然侵权',
// Articles
	'a1': '非常短而无定义或内容',
	'a2': '内容只包含参考、链接、模板或/及分类',
	'a3': '与其他中文维基计划内容相同的文章',
// Redirects
	'r2': '跨名字空间重定向',
	'r3': '名称错误的重定向',
	'r4': '重定向破坏',
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
			var thispage = new Wikipedia.page( mw.config.get('wgPageName'), "删除页面" );

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
				Status.error("询问理由", "您没有提供理由，取消操作。");
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage();

			// delete talk page
			if (params.deleteTalkPage &&
			    params.normalized !== 'f7' &&
			    params.normalized !== 'o1' &&
			    document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Wikipedia.page( Wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "删除讨论页" );
				talkpage.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 已删除页面 [[' + mw.config.get('wgPageName') + "]] 的讨论页" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
			}

			// promote Unlink tool
			var $link, $bigtext;
			if( mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f7' ) {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Wikipedia.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除文件 " + mw.config.get('wgPageName') + " 的使用");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除文件的使用',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f7') {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Wikipedia.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除页面 " + mw.config.get('wgPageName') + " 的链接");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除页面的链接',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Status.info($bigtext[0], $link[0]);
			}

			// open talk page of first contributor
			if( params.openusertalk ) {
				thispage = new Wikipedia.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect Status.text
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
				var wikipedia_api = new Wikipedia.api( '取得重定向列表…', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Status( '删除重定向' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var statusIndicator = new Status('打开用户 ' + user + ' 的对话页', '正在打开…');

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': mw.config.get('wgPageName').replace(/_/g, ' ')
			};
			switch( Twinkle.getPref('userTalkPageMode') ) {
			case 'tab':
				window.open( mw.config.get('wgServer') + mw.config.get('wgScriptPath') + '/index.php?' + QueryString.create( query ), '_tab' );
				break;
			case 'blank':
				window.open( mw.config.get('wgServer') + mw.config.get('wgScriptPath') + '/index.php?' + QueryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
				break;
			case 'window':
				/* falls through */
				default :
				window.open( mw.config.get('wgServer') + mw.config.get('wgScriptPath') + '/index.php?' + QueryString.create( query ), 'twinklewarnwindow', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
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
					Wikipedia.removeCheckpoint();
				}
			};

			Wikipedia.addCheckpoint();

			var params = clone( apiobj.params );
			params.current = 0;
			params.total = total;
			params.obj = statusIndicator;

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Wikipedia.page(title, '删除重定向 "' + title + '"');
				page.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 重定向到已删除页面 [[' + mw.config.get('wgPageName') + "]]" + Twinkle.getPref('deletionSummaryAd'));
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
				statelem.error( [ htmlNode( 'strong', tag[1] ) , " 已被置于页面中。" ] );
				return;
			}

			var xfd = /(?:\{\{([rsaiftcm]fd|md1)[^{}]*?\}\})/i.exec( text );
			if( xfd && !confirm( "删除相关模板 {{" + xfd[1] + "}} 已被置于页面中，您是否仍想添加一个快速删除模板？" ) ) {
				return;
			}

			var code, parameters, i;
			if (params.normalized === 'multiple')
			{
				code = "{{delete";
				for (i in Twinkle.speedy.dbmultipleCriteria) {
					if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string') {
						code += "|" + Twinkle.speedy.dbmultipleCriteria[i].toUpperCase();
					}
				}
				for (i in Twinkle.speedy.dbmultipleParameters) {
					if (typeof Twinkle.speedy.dbmultipleParameters[i] === 'string') {
						code += "|" + Twinkle.speedy.dbmultipleParameters[i];
					}
				}
				code += "}}";
				params.utparams = [];
			}
			else
			{
				parameters = Twinkle.speedy.getParameters(params.value, params.normalized, statelem);
				if (!parameters) {
					return;  // the user aborted
				}
				code = "{{delete|" + params.value;
				for (i in parameters) {
					if (typeof parameters[i] === 'string' && parameters[i] !== 'reason') {
						code += "|" + parameters[i];
					}
				}
				code += "}}";
				params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalized, parameters);
			}

			var thispage = new Wikipedia.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();
					var usertalkpage = new Wikipedia.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）");
					var notifytext;

					// specialcase "db" and "db-multiple"
					// XXX modify the "db-csd-notice-custom" template to cater for these special cases
					switch (params.normalized)
					{
						case 'db':
						case 'multiple':
						default:
							notifytext = "\n\n{{subst:db-notice|target=" + mw.config.get('wgPageName');
							break;
					}
					/*for (var i in params.utparams) {
						if (typeof params.utparams[i] === 'string') {
							notifytext += "|" + i + "=" + params.utparams[i];
						}
					}*/
					notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary("通知：页面[[" + mw.config.get('wgPageName') + "]]快速删除提名。" + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Remove tags that become superfluous with this action
			//text = text.replace(/\{\{\s*(New unreviewed article|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");

			// Generate edit summary for edit
			var editsummary;
			switch (params.normalized)
			{
				case 'db':
					editsummary = '请求[[WP:CSD|快速删除]]：' + parameters["1"];
					break;
				case 'multiple':
					editsummary = '请求快速删除（';
					for (i in Twinkle.speedy.dbmultipleCriteria) {
						if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string') {
							editsummary += '[[WP:CSD#' + Twinkle.speedy.dbmultipleCriteria[i].toUpperCase() + '|CSD ' + Twinkle.speedy.dbmultipleCriteria[i].toUpperCase() + ']]、';
						}
					}
					editsummary = editsummary.substr(0, editsummary.length - 1); // remove trailing comma
					editsummary += '）。';
					break;
				default:
					editsummary = "请求快速删除（[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]）。";
					break;
			}

			pageobj.setPageText(code + "\n" + text );
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save();
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for all: params.normalized
		//   for CSD: params.value
		//   for DI: params.fromDI = true, params.type
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Wikipedia.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "添加项目到用户日志");
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
				if (userIsInGroup("sysop")) {
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
				switch (params.normalized)
				{
					case 'db':
						text += "自定义理由";
						break;
					case 'multiple':
						text += "多个理由（";
						for (var i in Twinkle.speedy.dbmultipleCriteria) {
							if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string') {
								text += '[[WP:CSD#' + Twinkle.speedy.dbmultipleCriteria[i].toUpperCase() + '|' + Twinkle.speedy.dbmultipleCriteria[i].toUpperCase() + ']]、';
							}
						}
						text = text.substr(0, text.length - 1);  // remove trailing comma
						text += '）';
						break;
					default:
						text += "[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]";
						break;
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
			var filename = prompt( '请输入维基共享上的文件名：', pagenamespaces );
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
		case 'f1':
			var img = prompt( '输入与此文件相同的文件名（不含“File:”前缀）：', "" );
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

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e)
{
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' ')); // for queen/king/whatever and country!

	var tag_only = e.target.form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var value = e.target.values;
	var normalized = Twinkle.speedy.normalizeHash[ value ];

	var params = {
		value: value,
		normalized: normalized,
		watch: Twinkle.getPref('watchSpeedyPages').indexOf( normalized ) !== -1,
		reason: Twinkle.speedy.reasonHash[ value ],
		openusertalk: Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf( normalized ) !== -1,
		deleteTalkPage: e.target.form.talkpage && e.target.form.talkpage.checked,
		deleteRedirects: e.target.form.redirects.checked
	};
	Status.init( e.target.form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!
	var value = e.target.values;

	if (value === 'multiple')
	{
		e.target.form.style.display = "none"; // give the user a cue that the dialog is being changed
		setTimeout(function() {
			Twinkle.speedy.initDialog(Twinkle.speedy.callback.doMultiple, false, e.target.form.parentNode);
		}, 150);
		return;
	}

	if (value === 'multiple-finish') {
		value = 'multiple';
	}
	else
	{
		// clear these out, whatever the case, to avoid errors
		Twinkle.speedy.dbmultipleCriteria = [];
		Twinkle.speedy.dbmultipleParameters = [];
	}

	var normalized = Twinkle.speedy.normalizeHash[ value ];

	// for sysops only
	if (['f3', 'f4'].indexOf(normalized) !== -1) {
		alert("您不能使用此工具标记CSD F3、F4，请使用“图版”工具，或取消勾选“仅标记”。");
		return;
	}

	var i;

	// analyse each db-multiple criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	if (value === 'multiple')
	{
		for (i in Twinkle.speedy.dbmultipleCriteria)
		{
			if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string' &&
				Twinkle.getPref('watchSpeedyPages').indexOf(Twinkle.speedy.dbmultipleCriteria[i]) !== -1)
			{
				watchPage = true;
				break;
			}
		}
	}
	else
	{
		watchPage = Twinkle.getPref('watchSpeedyPages').indexOf(normalized) !== -1;
	}

	var notifyuser = false;
	if (value === 'multiple')
	{
		for (i in Twinkle.speedy.dbmultipleCriteria)
		{
			if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string' &&
				Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(Twinkle.speedy.dbmultipleCriteria[i]) !== -1)
			{
				notifyuser = true;
				break;
			}
		}
	}
	else
	{
		notifyuser = (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(normalized) !== -1) && e.target.form.notify.checked;
	}

	var welcomeuser = false;
	if (notifyuser)
	{
		if (value === 'multiple')
		{
			for (i in Twinkle.speedy.dbmultipleCriteria)
			{
				if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string' &&
					Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(Twinkle.speedy.dbmultipleCriteria[i]) !== -1)
				{
					welcomeuser = true;
					break;
				}
			}
		}
		else
		{
			welcomeuser = Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(normalized) !== -1;
		}
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations') && value === 'multiple')
	{
		for (i in Twinkle.speedy.dbmultipleCriteria)
		{
			if (typeof Twinkle.speedy.dbmultipleCriteria[i] === 'string' &&
				Twinkle.getPref('noLogOnSpeedyNomination').indexOf(Twinkle.speedy.dbmultipleCriteria[i]) === -1)
			{
				csdlog = true;
				break;
			}
		}
	}
	else
	{
		csdlog = Twinkle.getPref('logSpeedyNominations') && Twinkle.getPref('noLogOnSpeedyNomination').indexOf(normalized) === -1;
	}

	var params = {
		value: value,
		normalized: normalized,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog
	};

	Status.init( e.target.form );

	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "标记完成";

	var wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'), "标记页面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};

Twinkle.speedy.dbmultipleCriteria = [];
Twinkle.speedy.dbmultipleParameters = [];
Twinkle.speedy.callback.doMultiple = function twinklespeedyCallbackDoMultiple(e)
{
	var value = e.target.values;
	var normalized = Twinkle.speedy.normalizeHash[value];
	if (value !== 'multiple-finish')
	{
		if (Twinkle.speedy.dbmultipleCriteria.indexOf(normalized) !== -1)
		{
			alert('您已经选择了此理由，请换一个。');
		}
		else
		{
			var parameters = Twinkle.speedy.getParameters(value, normalized, Status);
			if (parameters)
			{
				for (var i in parameters) {
					if (typeof parameters[i] === 'string') {
						Twinkle.speedy.dbmultipleParameters[i] = parameters[i];
					}
				}
				Twinkle.speedy.dbmultipleCriteria.push(normalized);
			}
		}
		e.target.form.style.display = "none"; // give the user a cue that the dialog is being changed
		setTimeout(function() {
			Twinkle.speedy.initDialog(Twinkle.speedy.callback.doMultiple, false, e.target.form.parentNode);
		}, 150);
	}
	else
	{
		Twinkle.speedy.callback.evaluateUser(e);
	}
};
