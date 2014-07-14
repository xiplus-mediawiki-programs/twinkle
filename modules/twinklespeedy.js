//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.speedy.callback, "速删", "tw-csd", Morebits.userIsInGroup('sysop') ? "快速删除" : "请求快速删除" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;

// The speedy criteria list can be in one of several modes
Twinkle.speedy.mode = {
	sysopSubmit: 1,  // radio buttons, no subgroups, submit when "Submit" button is clicked
	sysopRadioClick: 2,  // radio buttons, no subgroups, submit when a radio button is clicked
	userMultipleSubmit: 3,  // check boxes, subgroups, "Submit" button already pressent
	userMultipleRadioClick: 4,  // check boxes, subgroups, need to add a "Submit" button
	userSingleSubmit: 5,  // radio buttons, subgroups, submit when "Submit" button is clicked
	userSingleRadioClick: 6,  // radio buttons, subgroups, submit when a radio button is clicked

	// are we in "delete page" mode?
	// (sysops can access both "delete page" [sysop] and "tag page only" [user] modes)
	isSysop: function twinklespeedyModeIsSysop(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.sysopRadioClick;
	},
	// do we have a "Submit" button once the form is created?
	hasSubmitButton: function twinklespeedyModeHasSubmitButton(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userSingleSubmit;
	},
	// is db-multiple the outcome here?
	isMultiple: function twinklespeedyModeIsMultiple(mode) {
		return mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick;
	},
	// do we want subgroups? (if not we have to use prompt())
	wantSubgroups: function twinklespeedyModeWantSubgroups(mode) {
		return !Twinkle.speedy.mode.isSysop(mode);
	}
};

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

							Twinkle.speedy.callback.modeChanged(cForm);

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
						Twinkle.speedy.callback.modeChanged( event.target.form );
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

	Twinkle.speedy.callback.modeChanged( result );
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	var namespace = mw.config.get('wgNamespaceNumber');

	// first figure out what mode we're in
	var mode = Twinkle.speedy.mode.userSingleSubmit;
	if (form.tag_only && !form.tag_only.checked) {
		mode = Twinkle.speedy.mode.sysopSubmit;
	} else {
		if (form.multiple.checked) {
			mode = Twinkle.speedy.mode.userMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.userSingleSubmit;
		}
	}
	if (Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		mode++;
	}

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (mode === Twinkle.speedy.mode.userMultipleRadioClick) {
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

	var radioOrCheckbox = (Twinkle.speedy.mode.isMultiple(mode) ? 'checkbox' : 'radio');

	switch (namespace) {
		case 0:  // article
			work_area.append( { type: 'header', label: '条目' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.articleList, mode) } );
			break;

		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: '用户页' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.userList, mode) } );
			break;

		case 6:  // file
			work_area.append( { type: 'header', label: '文件' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.fileList, mode) } );
			if (!Twinkle.speedy.mode.isSysop(mode)) {
				work_area.append( { type: 'div', label: '标记CSD F3、F4，请使用Twinkle的“图权”功能。' } );
			}
			break;

		case 14:  // category
			work_area.append( { type: 'header', label: '分类' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.categoryList, mode) } );
			break;

		default:
			break;
	}

	work_area.append( { type: 'header', label: '常规' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.generalList, mode) });
	if (!Twinkle.speedy.mode.isSysop(mode)) {
		work_area.append( { type: 'div', label: '标记CSD G16，请使用Twinkle的“侵权”功能。' } );
	}

	if (Morebits.wiki.isPageRedirect() || Morebits.userIsInGroup('sysop')) {
		work_area.append( { type: 'header', label: '重定向' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectList, mode) } );
	}

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {
	// mode switches
	var isSysop = Twinkle.speedy.mode.isSysop(mode);
	var multiple = Twinkle.speedy.mode.isMultiple(mode);
	var wantSubgroups = Twinkle.speedy.mode.wantSubgroups(mode);
	var hasSubmitButton = Twinkle.speedy.mode.hasSubmitButton(mode);

	var openSubgroupHandler = function(e) { 
		$(e.target.form).find('input').prop('disabled', true);
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	var submitSubgroupHandler = function(e) {
		Twinkle.speedy.callback.evaluateUser(e);
		e.stopPropagation();
	};

	return $.map(list, function(critElement) {
		var criterion = $.extend({}, critElement);

		// hack to get the g11 radio / checkbox right
		if (criterion.value === 'g11') {
			criterion.style = Twinkle.getPref('enlargeG11Input') ? 'height: 2em; width: 2em; height: -moz-initial; width: -moz-initial; -moz-transform: scale(2); -o-transform: scale(2);' : '';
		}

		if (!wantSubgroups) {
			criterion.subgroup = null;
		}

		if (multiple) {
			if (criterion.hideWhenMultiple) {
				return null;
			}
			if (criterion.hideSubgroupWhenMultiple) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenSingle) {
				return null;
			}
			if (criterion.hideSubgroupWhenSingle) {
				criterion.subgroup = null;
			}
		}

		if (isSysop) {
			if (criterion.hideWhenSysop) {
				return null;
			}
			if (criterion.hideSubgroupWhenSysop) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenUser) {
				return null;
			}
			if (criterion.hideSubgroupWhenUser) {
				criterion.subgroup = null;
			}
		}

		if (criterion.subgroup && !hasSubmitButton) {
			if ($.isArray(criterion.subgroup)) {
				criterion.subgroup.push({ 
					type: 'button',
					name: 'submit',
					label: '提交',
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit',  // ends up being called "csd.submit" so this is OK
						label: '提交',
						event: submitSubgroupHandler
					}
				];
			}
			criterion.event = openSubgroupHandler;
		}

		return criterion;
	});
};

Twinkle.speedy.fileList = [
	{
		label: 'F1: 重复的档案（完全相同或缩小），而且不再被条目使用',
		value: 'f1',
		subgroup: {
			name: 'f1_filename',
			type: 'input',
			label: '与此文件相同的文件名：',
			tooltip: '可不含“File:”前缀。'
		}
	},
	{
		label: 'F3: 所有未知版权的档案和来源不明档案',
		value: 'f3',
		hideWhenUser: true
	},
	{
		label: 'F4: 没有提供版权状况、来源等资讯的档案',
		value: 'f4',
		hideWhenUser: true
	},
	{
		label: 'F5: 被高分辨率或SVG档案取代的图片',
		value: 'f5',
		subgroup: {
			name: 'f5_filename',
			type: 'input',
			label: '新文件名：',
			tooltip: '可不含“File:”前缀。'
		}
	},
	{
		label: 'F6: 没有被条目使用的非自由版权档案',
		value: 'f6',
	},
	{
		label: 'F7: 与维基共享资源档案重复的档案',
		value: 'f7',
		subgroup: {
			name: 'f7_filename',
			type: 'input',
			label: '维基共享资源上的文件名：',
			value: Morebits.pageNameNorm,
			tooltip: '如与本文件名相同则可留空，可不含“File:”前缀。'
		},
		hideWhenMultiple: true
	}
];

Twinkle.speedy.articleList = [
	{
		label: 'A1: 非常短，而且没有定义或内容。',
		value: 'a1',
		tooltip: '例如：“他是一个很有趣的人，他创建了工厂和庄园。并且，顺便提一下，他的妻子也很好。”如果能够发现任何相关的内容，可以将这个页面重定向到相关的条目上。'
	},
	{
		label: 'A2: 内容只包括外部连接、参见、图书参考、类别标签、模板标签、跨语言连接的条目。',
		value: 'a2',
		tooltip: '请注意：有些维基人创建条目时会分开多次保存，请避免删除有人正在工作的页面。带有{{inuse}}的不适用。'
	},
	{
		label: 'A3: 复制自其他中文维基计划，或是与其他中文维基计划内容相同的文章。或者是透过Transwiki系统移动的文章。',
		value: 'a3'
	},
	{
		label: 'A5: 条目建立时之内容即与其他现有条目内容完全相同，且名称不适合做为其他条目之重定向。',
		value: 'a5',
		tooltip: '条目被建立时，第一个版本的内容与当时其他现存条目完全相同，且这个条目的名称不适合改为重定向，就可以提送快速删除。如果名称可以作为重定向，就应直接改重定向，不要提送快速删除。如果是多个条目合并产生的新条目，不适用。如果是从主条目拆分产生的条目，不适用；如有疑虑，应提送存废讨论处理。',
		subgroup: {
			name: 'a5_pagename',
			type: 'input',
			label: '现有条目名：',
			size: 60
		}
	}
];

Twinkle.speedy.categoryList = [
	{
		label: 'O4: 空的类别（没有条目也没有子类别）。',
		value: 'o4',
		tooltip: '不适用于Category:不要删除的分类中的空分类。'
	}
];

Twinkle.speedy.userList = [
	{
		label: 'O1: 用户请求删除自己的用户页或其子页面。',
		value: 'o1',
		tooltip: '如果是从其他名字空间移动来的，须附有合理原因。'
	},
	{
		label: 'O3: 匿名用户的用户讨论页，其中的内容不再有用。',
		value: 'o3',
		tooltip: '避免给使用同一IP地址的用户带来混淆。不适用于用户讨论页的存盘页面。'
	}
];

Twinkle.speedy.generalList = [
	{
		label: '自定义理由' + (Morebits.userIsInGroup('sysop') ? '（自定义删除理由）' : ''),
		value: 'reason',
		tooltip: '该页至少应该符合一条快速删除的标准，并且您必须在理由中提到。这不是万能的删除理由。',
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: '理由：',
			size: 60
		},
		hideWhenMultiple: true,
		hideSubgroupWhenSysop: true
	},
	{
		label: 'G1: 没有实际内容的页面',
		value: 'g1',
		tooltip: '如“adfasddd”。参见Wikipedia:胡言乱语。但注意：图片也算是内容。'
	},
	{
		label: 'G2: 测试页面',
		value: 'g2',
		tooltip: '例如：“这是一个测试。”'
	},
	{
		label: 'G3: 纯粹破坏，包括但不限于明显的恶作剧、错误信息、人身攻击等',
		value: 'g3',
		tooltip: '包括明显的错误信息、明显的恶作剧、信息明显错误的图片，以及清理移动破坏时留下的重定向。'
	},
	{
		label: 'G5: 曾经根据页面存废讨论、侵权审核或文件存废讨论结果删除后又重新创建的内容，而有关内容与已删除版本相同或非常相似，无论标题是否相同',
		value: 'g5',
		tooltip: '该内容之前必须是经存废讨论删除，如之前属于快速删除，请以相同理由重新提送快速删除。该内容如与被删除的版本明显不同，而提删者认为需要删除，请交到存废讨论，如果提删者对此不肯定，请先联络上次执行删除的管理人员。不适用于根据存废复核结果被恢复的内容。在某些情况下，重新创建的条目有机会发展。那么不应提交快速删除，而应该提交存废复核或存废讨论重新评核。',
		subgroup: {
			name: 'g5_1',
			type: 'input',
			label: '删除讨论位置：',
			tooltip: '必须以“Wikipedia:”开头',
			size: 60
		}
	},
	{
		label: 'G8: 管理员因技术原因删除页面',
		value: 'g8',
		tooltip: '包括解封用户后删除用户页、因用户夺取而删除、删除MediaWiki页面、因移动请求而删除页面。',
		hideWhenUser: true
	},
	{
		label: 'G10: 原作者清空页面或提出删除，且贡献者只有一人',
		value: 'g10',
		tooltip: '对条目内容无实际修改的除外；提请须出于善意，及附有合理原因。',
		subgroup: {
			name: 'g10_rationale',
			type: 'input',
			label: '可选的解释：',
			tooltip: '比如作者在哪里请求了删除。',
			size: 60
		}
	},
	{
		label: 'G11: 明显的广告宣传页面，或只有相关人物或团体的联系方法的页面',
		value: 'g11',
		tooltip: '页面只收宣传之用，并须完全重写才能贴合百科全书要求。须注意，仅仅以某公司或产品为主题的条目，并不直接导致其自然满足此速删标准。'
	},
	{
		label: 'G12: 未列明来源且语调负面的生者传记',
		value: 'g12',
		tooltip: '注意是未列明来源且语调负面，必须2项均符合。'
	},
	{
		label: 'G13: 明显、拙劣的机器翻译',
		value: 'g13'
	},
	{
		label: 'G14: 超过两周没有进行任何翻译的非现代标准汉语页面',
		value: 'g14',
		tooltip: '包括所有未翻译的外语、汉语方言以及文言文。',
		hideWhenUser: true
	},
	{
		label: 'G15: 孤立页面，比如没有主页面的讨论页、指向空页面的重定向等',
		value: 'g15',
		tooltip: '包括以下几种类型：1. 没有对应文件的文件页面；2. 没有对应母页面的子页面，用户页子页面除外；3. 指向不存在页面的重定向；4. 没有对应内容页面的讨论页，讨论页存档和用户讨论页除外；5. 不存在注册用户的用户页及用户页子页面，随用户更名产生的用户页重定向除外。请在删除时注意有无将内容移至他处的必要。不包括在主页面挂有{{CSD Placeholder}}模板的讨论页。'
	},
	{
		label: 'G16: 因为主页面侵权而创建的临时页面仍然侵权',
		value: 'g16',
		hideWhenUser: true
	}
];

Twinkle.speedy.redirectList = [
	{
		label: 'R2: 跨名字空间重定向。',
		value: 'r2',
		tooltip: '由条目的名字空间重定向至非条目名字空间，或将用户页移出条目名字空间时遗留的重定向。'
	},
	{
		label: 'R3: 格式错误，或明显笔误的重定向。',
		value: 'r3',
		tooltip: '非一眼能看出的拼写错误和翻译或标题用字的争议应交由存废讨论处理。',
		subgroup: {
			name: 'r3_type',
			type: 'select',
			label: '适用类别：',
			list: [
				{ label: '请选择', value: '' },
				{ label: '标题繁简混用', value: '标题繁简混用。' },
				{ label: '消歧义使用的括号或空格错误', value: '消歧义使用的括号或空格错误。' },
				{ label: '间隔号使用错误', value: '间隔号使用错误。' },
				{ label: '标题中使用非常见的错别字', value: '标题中使用非常见的错别字。' },
				{ label: '移动侵权页面的临时页后所产生的重定向', value: '移动侵权页面的临时页后所产生的重定向。' }
			]
		},
		hideSubgroupWhenSysop: true
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
	'g8': 'g8',
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
	'g8': '技术原因',
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
			var thispage;

			Morebits.wiki.addCheckpoint();  // prevent actionCompleted from kicking in until user interaction is done

			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if( params.openusertalk ) {
				thispage = new Morebits.wiki.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect status text
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}

			// delete page
			var reason;
			thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "删除页面" );
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
			if (reason === null) {
				Morebits.status.error("询问理由", "用户取消操作。");
				Morebits.wiki.removeCheckpoint();
				return;
			} else if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				Morebits.status.error("询问理由", "你不给我理由…我就…不管了…");
				Morebits.wiki.removeCheckpoint();
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage(function() {
				thispage.getStatusElement().info("完成");
				Twinkle.speedy.callbacks.sysop.deleteTalk( params );
			});
			Morebits.wiki.removeCheckpoint();
		},
		deleteTalk: function( params ) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'f7' &&
					params.normalized !== 'o1' &&
					document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "删除讨论页" );
				talkpage.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 已删除页面“' + Morebits.pageNameNorm + "”的讨论页" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(function() { Twinkle.speedy.callbacks.sysop.deleteRedirects( params ); }, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects( params );
			}
		},
		deleteRedirects: function( params ) {
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
						Twinkle.unlink.callback("取消对已删除文件 " + Morebits.pageNameNorm + " 的使用");
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
						Twinkle.unlink.callback("取消对已删除页面 " + Morebits.pageNameNorm + " 的链接");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除页面的链接',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var params = pageobj.getCallbackParameters();

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': Morebits.pageNameNorm
			};

			if (params.normalized === 'db' || Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
				// provide a link to the user talk page
				var $link, $bigtext;
				$link = $('<a/>', {
					'href': mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
					'text': '点此打开User talk:' + user,
					'target': '_blank',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				$bigtext = $('<span/>', {
					'text': '通知页面创建者',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else {
				// open the initial contributor's talk page
				var statusIndicator = new Morebits.status('打开用户' + user + '对话页编辑表单', '打开中…');

				switch( Twinkle.getPref('userTalkPageMode') ) {
				case 'tab':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank' );
					break;
				case 'blank':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				case 'window':
					/* falls through */
				default:
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
						( window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow' ),
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				}

				statusIndicator.info( '完成' );
			}
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('backlinks bl');
			var total = $snapshot.length;
			var statusIndicator = apiobj.statelem;

			if( !total ) {
				statusIndicator.status("未发现重定向");
				return;
			}

			statusIndicator.status("0%");

			var current = 0;
			var onsuccess = function( apiobjInner ) {
				var now = parseInt( 100 * (++current)/total, 10 ) + '%';
				statusIndicator.update( now );
				apiobjInner.statelem.unlink();
				if( current >= total ) {
					statusIndicator.info( now + '（完成）' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, '删除重定向 "' + title + '"');
				page.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立页面: 重定向到已删除页面“' + Morebits.pageNameNorm + "”" + Twinkle.getPref('deletionSummaryAd'));
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
			if (params.normalizeds.length > 1) {
				code = "{{delete";
				params.utparams = {};
				$.each(params.normalizeds, function(index, norm) {
					code += "|" + norm.toUpperCase();
					parameters = params.templateParams[index] || [];
					for (var i in parameters) {
						if (typeof parameters[i] === 'string') {
							code += "|" + parameters[i];
						}
					}
					$.extend(params.utparams, Twinkle.speedy.getUserTalkParameters(norm, parameters));
				});
				code += "}}";
			} else {
				parameters = params.templateParams[0] || [];
				code = "{{delete";
				if (params.values[0] !== 'reason') {
					code += '|' + params.values[0];
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
			text = text.replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");
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

					// disallow warning yourself
					if (initialContrib === mw.config.get('wgUserName')) {
						Morebits.status.warn("您（" + initialContrib + "）创建了该页，跳过通知");

					// don't notify users when their user talk page is nominated
					} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("通知页面创建者：用户创建了自己的对话页");

					} else {
						var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）"),
							notifytext, i;

						notifytext = "\n{{subst:db-notice|target=" + Morebits.pageNameNorm;
						notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

						var editsummary = "通知：";
						if (params.normalizeds.indexOf("g12") === -1) {  // no article name in summary for G10 deletions
							editsummary += "页面[[" + Morebits.pageNameNorm + "]]";
						} else {
							editsummary += "一攻击性页面";
						}
						editsummary += "快速删除提名";

						usertalkpage.setAppendText(notifytext);
						usertalkpage.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
						usertalkpage.setCreateOption('recreate');
						usertalkpage.setFollowRedirect(true);
						usertalkpage.append();
					}

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(Morebits.pageNameNorm);
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

			var appendText = "";

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				appendText +=
					"这是该用户使用[[WP:TW|Twinkle]]的速删模块做出的[[WP:CSD|快速删除]]提名列表。\n\n" +
					"如果您不再想保留此日志，请在[[Wikipedia:Twinkle/参数设置|参数设置]]中关掉，并" +
					"使用[[WP:CSD#O1|CSD O1]]提交快速删除。\n";
				if (Morebits.userIsInGroup("sysop")) {
					appendText += "\n此日志并不记录用Twinkle直接执行的删除。\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCFullYear() + "\\s*年\\s*" + (date.getUTCMonth() + 1) + "\\s*月\\s*==+", "m");
			if (!headerRe.exec(text)) {
				appendText += "\n\n=== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 ===";
			}

			appendText += "\n# [[:" + Morebits.pageNameNorm + "]]: ";
			if (params.fromDI) {
				appendText += "图版[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]（" + params.type + "）";
			} else {
				if (params.normalizeds.length > 1) {
					appendText += "多个理由（";
					$.each(params.normalizeds, function(index, norm) {
						appendText += "[[WP:CSD#" + norm.toUpperCase() + "|" + norm.toUpperCase() + ']]、';
					});
					appendText = appendText.substr(0, appendText.length - 1);  // remove trailing comma
					appendText += '）';
				} else if (params.normalizeds[0] === "db") {
					appendText += "自定义理由";
				} else {
					appendText += "[[WP:CSD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]]";
				}
			}

			if (params.logInitialContrib) {
				appendText += "；通知{{user|" + params.logInitialContrib + "}}";
			}
			appendText += " ~~~~~\n";

			pageobj.setAppendText(appendText);
			pageobj.setEditSummary("记录对[[" + Morebits.pageNameNorm + "]]的快速删除提名。" + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.append();
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	var parameters = [];

	$.each(values, function(index, value) {
		var currentParams = [];
		switch (value) {
			case 'reason':
				if (form["csd.reason_1"]) {
					var dbrationale = form["csd.reason_1"].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert( '自定义理由：请指定理由。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = dbrationale;
				}
				break;

			case 'a5':
				if (form["csd.a5_pagename"]) {
					var otherpage = form["csd.a5_pagename"].value;
					if (!otherpage || !otherpage.trim()) {
						alert( 'CSD A5：请提供现有条目的名称。' );
						parameters = null;
						return false;
					}
					currentParams.pagename = otherpage;
				}
				break;

			case 'g5':
				if (form["csd.g5_1"]) {
					var deldisc = form["csd.g5_1"].value;
					if (deldisc) {
						if (deldisc.substring(0, 9) !== "Wikipedia" &&
							deldisc.substring(0, 3) !== "WP:" &&
							deldisc.substring(0, 5) !== "维基百科:" &&
							deldisc.substring(0, 5) !== "維基百科:") {
							alert( 'CSD G5：您提供的讨论页名必须以“Wikipedia:”开头。' );
							parameters = null;
							return false;
						}
						currentParams["1"] = deldisc;
					}
				}
				break;

			case 'g10':
				if (form["csd.g10_rationale"] && form["csd.g10_rationale"].value) {
					currentParams.rationale = form["csd.g10_rationale"].value;
				}
				break;

			case 'f1':
				if (form["csd.f1_filename"]) {
					var redimage = form["csd.f1_filename"].value;
					if (!redimage || !redimage.trim()) {
						alert( 'CSD F1：请提供另一文件的名称。' );
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(/^\s*(Image|File|文件|檔案):/i, "");
				}
				break;

			case 'f5':
				if (form["csd.f5_filename"]) {
					var redimage = form["csd.f5_filename"].value;
					if (!redimage || !redimage.trim()) {
						alert( 'CSD F5：请提供另一文件的名称。' );
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(/^\s*(Image|File|文件|檔案):/i, "");
				}
				break;

			case 'f7':
				if (form["csd.f7_filename"]) {
					var filename = form["csd.f7_filename"].value;
					if (filename && filename !== Morebits.pageNameNorm) {
						if (filename.indexOf("Image:") === 0 || filename.indexOf("File:") === 0 ||
							filename.indexOf("文件:") === 0 || filename.indexOf("檔案:") === 0) {
							currentParams["1"] = filename;
						} else {
							currentParams["1"] = "File:" + filename;
						}
					}
				}
				break;

			case 'r3':
				if (form["csd.r3_type"]) {
					var redirtype = form["csd.r3_type"].value;
					if (!redirtype) {
						alert( 'CSD R3：请选择适用类别。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = redirtype;
				}
				break;

			default:
				break;
		}
		parameters.push(currentParams);
	});
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
	var utparams = [];
	switch (normalized) {
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

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
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
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox" || e.target.type === "text" || 
			e.target.type === "select") {
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
		lognomination: csdlog,
		templateParams: Twinkle.speedy.getParameters( form, values )
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "标记完成";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "标记页面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
})(jQuery);


//</nowiki>
