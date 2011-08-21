/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** twinkleprotect.js: Protect/RPP module
 ****************************************
 * Mode of invocation:     Tab ("PP"/"RPP")
 * Active on:              Non-special pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.protect = function twinkleprotect() {
	if ( mw.config.get('wgNamespaceNumber') < 0 ) {
		return;
	}

	if ( userIsInGroup( 'sysop' ) ) {
		$(twAddPortletLink("#", "保护", "tw-rpp", "保护页面", "")).click(Twinkle.protect.callback);
	} else if (twinkleUserAuthorized) {
		$(twAddPortletLink("#", "保护", "tw-rpp", "请求保护页面", "")).click(Twinkle.protect.callback);
	} else {
		$(twAddPortletLink("#", '保护', 'tw-rpp', '请求保护页面', '')).click(function() {
			alert("您还未达到自动确认。");
		});
	}
};

Twinkle.protect.callback = function twinkleprotectCallback() {
	var Window = new SimpleWindow( 620, 530 );
	Window.setTitle( userIsInGroup( 'sysop' ) ? "施行或请求保护页面" : "请求保护页面" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "保护模板", "Template:Protection templates" );
	Window.addFooterLink( "保护方针", "WP:PROT" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#protect" );

	var form = new QuickForm( Twinkle.protect.callback.evaluate );
	var actionfield = form.append( {
			type: 'field',
			label: '操作类型'
		} );
	if( userIsInGroup( 'sysop' ) ) {
		actionfield.append( {
				type: 'radio',
				name: 'actiontype',
				event: Twinkle.protect.callback.changeAction,
				list: [
					{
						label: '保护页面',
						value: 'protect',
						checked: true
					}
				]
			} );
	}
	actionfield.append( {
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: '请求保护页面',
					value: 'request',
					tooltip: '如果您想在WP:RFPP请求保护此页' + (userIsInGroup('sysop') ? '而不是自行完成。' : '。'),
					checked: !userIsInGroup('sysop')
				},
				{
					label: '用保护模板标记此页',
					value: 'tag',
					tooltip: '可以用此为页面加上合适的保护模板。'
				}
			]
		} );

	form.append({ type: 'field', label: '预设', name: 'field_preset' });
	form.append({ type: 'field', label: '1', name: 'field1' });
	form.append({ type: 'field', label: '2', name: 'field2' });

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.actiontype[0].dispatchEvent( evt );

	// reduce vertical height of dialog
	$('select[name="editlevel"], select[name="editexpiry"], select[name="moveexpiry"], select[name="movelevel"], select[name="createexpiry"], select[name="createlevel"]').
		parent().css({ display: 'inline-block', marginRight: '0.5em' });

	// get current protection level asynchronously
	Wikipedia.actionCompleted.postfix = false;  // avoid Action: completed notice
	if (userIsInGroup('sysop')) {
		var query = {
			action: 'query',
			prop: 'info',
			inprop: 'protection',
			titles: mw.config.get('wgPageName')
		};
		Status.init($('div[name="currentprot"] span').last()[0]);
		var statelem = new Status("当前保护级别");
		var wpapi = new Wikipedia.api("抓取…", query, Twinkle.protect.callback.protectionLevel, statelem);
		wpapi.post();
	}
};

Twinkle.protect.protectionLevel = null;

Twinkle.protect.callback.protectionLevel = function twinkleprotectCallbackProtectionLevel(apiobj) {
	var xml = apiobj.getXML();
	var result = [];
	$(xml).find('pr').each(function(index, pr) {
		var $pr = $(pr);
		var boldnode = document.createElement('b');
		boldnode.textContent = $pr.attr('type').toUpperCaseFirstChar() + ": " + $pr.attr('level');
		result.push(boldnode);
		if ($pr.attr('expiry') === 'infinity') {
			result.push("（永久）");
		} else {
			result.push("（过期：" + new Date($pr.attr('expiry')).toUTCString() + "）");
		}
		if ($pr.attr('cascade') === '') {
			result.push("（联锁）");
		}
	});
	if (!result.length) {
		var boldnode = document.createElement('b');
		boldnode.textContent = "未被保护";
		result.push(boldnode);
	}
	Twinkle.protect.protectionLevel = result;
	apiobj.statelem.info(result);
	window.setTimeout(function() { Wikipedia.actionCompleted.postfix = "完成"; }, 500);  // restore actionCompleted message
};

Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
	var field_preset;
	var field1;
	var field2;

	switch (e.target.values) {
		case 'protect':
			field_preset = new QuickForm.element({ type: 'field', label: '预设', name: 'field_preset' });
			field_preset.append({
					type: 'select',
					name: 'category',
					label: '选择预设：',
					event: Twinkle.protect.callback.changePreset,
					list: (mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate)
				});

			field2 = new QuickForm.element({ type: 'field', label: '保护选项', name: 'field2' });
			field2.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			// for existing pages
			if (mw.config.get('wgArticleId')) {
				field2.append({
						type: 'checkbox',
						name: 'editmodify',
						event: Twinkle.protect.formevents.editmodify,
						list: [
							{
								label: '修改编辑权限',
								value: 'editmodify',
								tooltip: '如果此项被关闭，编辑权限将不被修改。',
								checked: true
							}
						]
					});
				var editlevel = field2.append({
						type: 'select',
						name: 'editlevel',
						label: '编辑权限：',
						event: Twinkle.protect.formevents.editlevel
					});
				editlevel.append({
						type: 'option',
						label: '（站点默认）',
						value: 'all'
					});
				editlevel.append({
						type: 'option',
						label: '禁止未注册用户',
						value: 'autoconfirmed'
					});
				editlevel.append({
						type: 'option',
						label: '仅管理员',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'editexpiry',
						label: '终止时间：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小时', value: '1 hour' },
							{ label: '2小时', value: '2 hours' },
							{ label: '3小时', value: '3 hours' },
							{ label: '6小时', value: '6 hours' },
							{ label: '12小时', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', selected: true, value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1周', value: '1 week' },
							{ label: '2周', value: '2 weeks' },
							{ label: '1月', value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '无限期', value:'indefinite' },
							{ label: '自定义…', value: 'custom' }
						]
					});
				field2.append({
						type: 'checkbox',
						name: 'movemodify',
						event: Twinkle.protect.formevents.movemodify,
						list: [
							{
								label: '修改移动权限',
								value: 'movemodify',
								tooltip: '如果此项被关闭，移动权限将不被修改。',
								checked: true
							}
						]
					});
				var movelevel = field2.append({
						type: 'select',
						name: 'movelevel',
						label: '移动权限：',
						event: Twinkle.protect.formevents.movelevel
					});
				movelevel.append({
						type: 'option',
						label: '（站点默认）',
						value: 'all'
					});
				movelevel.append({
						type: 'option',
						label: '禁止未注册用户',
						value: 'autoconfirmed'
					});
				movelevel.append({
						type: 'option',
						label: '仅管理员',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'moveexpiry',
						label: '终止时间：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小时', value: '1 hour' },
							{ label: '2小时', value: '2 hours' },
							{ label: '3小时', value: '3 hours' },
							{ label: '6小时', value: '6 hours' },
							{ label: '12小时', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', selected: true, value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1周', value: '1 week' },
							{ label: '2周', value: '2 weeks' },
							{ label: '1月', value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '无限期', value:'indefinite' },
							{ label: '自定义…', value: 'custom' }
						]
					});
			} else {  // for non-existing pages
				var createlevel = field2.append({
						type: 'select',
						name: 'createlevel',
						label: '创建权限：',
						event: Twinkle.protect.formevents.createlevel
					});
				createlevel.append({
						type: 'option',
						label: '（站点默认）',
						value: 'all'
					});
				createlevel.append({
						type: 'option',
						label: '禁止未注册用户',
						value: 'autoconfirmed'
					});
				createlevel.append({
						type: 'option',
						label: '仅管理员',
						value: 'sysop',
						selected: true
					});
				field2.append({
						type: 'select',
						name: 'createexpiry',
						label: '终止时间：',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						list: [
							{ label: '1小时', value: '1 hour' },
							{ label: '2小时', value: '2 hours' },
							{ label: '3小时', value: '3 hours' },
							{ label: '6小时', value: '6 hours' },
							{ label: '12小时', value: '12 hours' },
							{ label: '1日', value: '1 day' },
							{ label: '2日', value: '2 days' },
							{ label: '3日', value: '3 days' },
							{ label: '4日', value: '4 days' },
							{ label: '1周', value: '1 week' },
							{ label: '2周', value: '2 weeks' },
							{ label: '1月', value: '1 month' },
							{ label: '2月', value: '2 months' },
							{ label: '3月', value: '3 months' },
							{ label: '1年', value: '1 year' },
							{ label: '无限期', selected: true, value:'indefinite' },
							{ label: '自定义…', value: 'custom' }
						]
					});
			}
			field2.append({
					type: 'textarea',
					name: 'reason',
					label: '保护理由（日志）：'
				});
			if (!mw.config.get('wgArticleId')) {  // tagging isn't relevant for non-existing pages
				break;
			}
			/* falls through */
		case 'tag':
			field1 = new QuickForm.element({ type: 'field', label: '标记选项', name: 'field1' });
			field1.append( {
					type: 'select',
					name: 'tagtype',
					label: '选择保护模板：',
					list: Twinkle.protect.protectionTags,
					event: Twinkle.protect.formevents.tagtype
				} );
			field1.append( {
					type: 'checkbox',
					list: [
						{
							name: 'small',
							label: '使用图标（small=yes）',
							tooltip: '将给模板加上|small=yes参数，显示成右上角的一把挂锁。',
							checked: true
						},
						{
							name: 'noinclude',
							label: '用<noinclude>包裹保护模板',
							tooltip: '将保护模板包裹在&lt;noinclude&gt;中',
							checked: (mw.config.get('wgNamespaceNumber') === 10)
						}
					]
				} );
			break;

		case 'request':
			field_preset = new QuickForm.element({ type: 'field', label: '保护类型', name: 'field_preset' });
			field_preset.append({
					type: 'select',
					name: 'category',
					label: '类型和理由：',
					event: Twinkle.protect.callback.changePreset,
					list: (mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate)
				});

			field1 = new QuickForm.element({ type: 'field', label: '选项', name: 'field1' });
			field1.append( {
					type: 'select',
					name: 'expiry',
					label: '时长：',
					list: [
						{ label: '临时', value: 'temporary' },
						{ label: '永久', value: 'indefinite' },
						{ label: '', selected: true, value: '' }
					]
				} );
			field1.append({
					type: 'textarea',
					name: 'reason',
					label: '理由：'
				});
			break;
		default:
			alert("这玩意儿坏掉了！");
			break;
	}

	var oldfield;
	if (field_preset) {
		oldfield = $(e.target.form).find('fieldset[name="field_preset"]')[0];
		oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field_preset"]').css('display', 'none');
	}
	if (field1) {
		oldfield = $(e.target.form).find('fieldset[name="field1"]')[0];
		oldfield.parentNode.replaceChild(field1.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field1"]').css('display', 'none');
	}
	if (field2) {
		oldfield = $(e.target.form).find('fieldset[name="field2"]')[0];
		oldfield.parentNode.replaceChild(field2.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field2"]').css('display', 'none');
	}

	// re-add protection level text, if it's available
	if (e.target.values === 'protect' && Twinkle.protect.protectionLevel) {
		Status.init($('div[name="currentprot"] span').last()[0]);
		Status.info("当前保护级别", Twinkle.protect.protectionLevel);
	}
};

Twinkle.protect.formevents = {
	editmodify: function twinkleprotectFormEditmodifyEvent(e) {
		e.target.form.editlevel.disabled = !e.target.checked;
		e.target.form.editexpiry.disabled = !e.target.checked || (e.target.form.editlevel.value === 'all');
		e.target.form.editlevel.style.color = e.target.form.editexpiry.style.color = (e.target.checked ? "" : "transparent");
	},
	editlevel: function twinkleprotectFormEditlevelEvent(e) {
		e.target.form.editexpiry.disabled = (e.target.value === 'all');
	},
	movemodify: function twinkleprotectFormMovemodifyEvent(e) {
		e.target.form.movelevel.disabled = !e.target.checked;
		e.target.form.moveexpiry.disabled = !e.target.checked || (e.target.form.movelevel.value === 'all');
		e.target.form.movelevel.style.color = e.target.form.moveexpiry.style.color = (e.target.checked ? "" : "transparent");
	},
	movelevel: function twinkleprotectFormMovelevelEvent(e) {
		e.target.form.moveexpiry.disabled = (e.target.value === 'all');
	},
	createlevel: function twinkleprotectFormCreatelevelEvent(e) {
		e.target.form.createexpiry.disabled = (e.target.value === 'all');
	},
	tagtype: function twinkleprotectFormTagtypeEvent(e) {
		e.target.form.small.disabled = e.target.form.noinclude.disabled = (e.target.value === 'none') || (e.target.value === 'noop');
	}
};

Twinkle.protect.doCustomExpiry = function twinkleprotectDoCustomExpiry(target) {
	var custom = prompt('输入自定义终止时间。\n您可以使用相对时间，如“1 minute”或“19 days”，或绝对时间“yyyymmddhhmm”（如“200602011406”是2006年02月01日14：06（UTC））', '');
	if (custom) {
		var option = document.createElement('option');
		option.setAttribute('value', custom);
		option.textContent = custom;
		target.appendChild(option);
		target.value = custom;
	}
};

Twinkle.protect.protectionTypes = [
	{
		label: '全保护',
		list: [
			{ label: '常规（全）', value: 'pp-protected' },
			{ label: '争议、编辑战（全）', selected: userIsInGroup('sysop'), value: 'pp-dispute' },
			{ label: '长期破坏（全）', value: 'pp-vandalism' },
			{ label: '高风险模板（全）', value: 'pp-template' },
			{ label: '已封禁用户的讨论页（全）', value: 'pp-usertalk' }
		]
	},
	{
		label: '半保护',
		list: [
			{ label: '常规（半）', value: 'pp-semi-protected' },
			{ label: '长期破坏（半）', selected: !userIsInGroup('sysop'), value: 'pp-semi-vandalism' },
			{ label: '违反生者传记方针（半）', value: 'pp-semi-blp' },
			{ label: '傀儡破坏（半）', value: 'pp-semi-sock' },
			{ label: '高风险模板（半）', value: 'pp-semi-template' },
			{ label: '已封禁用户的讨论页（半）', value: 'pp-semi-usertalk' }
		]
	},
	{
		label: '移动保护',
		list: [
			{ label: '常规（移动）', value: 'pp-move' },
			{ label: '争议、移动战（移动）', value: 'pp-move-dispute' },
			{ label: '移动破坏（移动）', value: 'pp-move-vandalism' },
			{ label: '高风险页面（移动）', value: 'pp-move-indef' }
		]
	},
	{ label: '解除保护', value: 'unprotect' }
];

Twinkle.protect.protectionTypesCreate = [
	{
		label: '白纸保护',
		list: [
			{ label: '常规', value: 'pp-create' }
		]
	},
	{ label: '解除保护', value: 'unprotect' }
];

// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
Twinkle.protect.protectionPresetsInfo = {
	'pp-protected': {
		edit: 'sysop',
		move: 'sysop',
		reason: null
	},
	'pp-dispute': {
		edit: 'sysop',
		move: 'sysop',
		reason: '编辑战'
	},
	'pp-vandalism': {
		edit: 'sysop',
		move: 'sysop',
		reason: '被自动确认用户破坏'
	},
	'pp-template': {
		edit: 'sysop',
		move: 'sysop',
		reason: '高风险模板'
	},
	'pp-usertalk': {
		edit: 'sysop',
		move: 'sysop',
		reason: '已封禁用户滥用其对话页'
	},
	'pp-semi-vandalism': {
		edit: 'autoconfirmed',
		reason: '被IP用户或新用户破坏',
		template: 'pp-vandalism'
	},
	'pp-semi-blp': {
		edit: 'autoconfirmed',
		reason: 'IP用户或新用户违反生者传记方针'
	},
	'pp-semi-usertalk': {
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '已封禁用户滥用其对话页'
	},
	'pp-semi-template': {
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '高风险模板',
		template: 'pp-template'
	},
	'pp-semi-sock': {
		edit: 'autoconfirmed',
		reason: '持续的傀儡破坏'
	},
	'pp-semi-protected': {
		edit: 'autoconfirmed',
		reason: null,
		template: 'pp-protected'
	},
	'pp-move': {
		move: 'sysop',
		reason: null
	},
	'pp-move-dispute': {
		move: 'sysop',
		reason: '页面移动战'
	},
	'pp-move-vandalism': {
		move: 'sysop',
		reason: '移动破坏'
	},
	'pp-move-indef': {
		move: 'sysop',
		reason: '高风险页面'
	},
	'unprotect': {
		edit: 'all',
		move: 'all',
		create: 'all',
		reason: null,
		template: 'none'
	},
	'pp-create': {
		create: 'sysop',
		reason: '{{pp-create}}'
	}
};

Twinkle.protect.protectionTags = [
	{
		label: '无（移除现有模板）',
		value: 'none'
	},
	{
		label: '无（不移除现有模板）',
		value: 'noop'
	},
	{
		label: '全保护模板',
		list: [
			{ label: '{{pp-dispute}}: 争议', value: 'pp-dispute', selected: true },
			{ label: '{{pp-usertalk}}: 封禁的用户', value: 'pp-usertalk' }
		]
	},
	{
		label: '全、半保护模板',
		list: [
			{ label: '{{pp-vandalism}}: 破坏', value: 'pp-vandalism' },
			{ label: '{{pp-template}}: 高风险模板', value: 'pp-template' },
			{ label: '{{pp-protected}}: 常规', value: 'pp-protected' }
		]
	},
	{
		label: '半保护模板',
		list: [
			{ label: '{{pp-semi-usertalk}}: 封禁的用户', value: 'pp-semi-usertalk' },
			{ label: '{{pp-semi-sock}}: 傀儡', value: 'pp-semi-sock' },
			{ label: '{{pp-semi-blp}}: 生者传记', value: 'pp-semi-blp' },
			{ label: '{{pp-semi-indef}}: 长期', value: 'pp-semi-indef' }
		]
	},
	{
		label: '移动保护模板',
		list: [
			{ label: '{{pp-move-dispute}}: 争议', value: 'pp-move-dispute' },
			{ label: '{{pp-move-vandalism}}: 破坏', value: 'pp-move-vandalism' },
			{ label: '{{pp-move-indef}}: 长期', value: 'pp-move-indef' },
			{ label: '{{pp-move}}: 常规', value: 'pp-move' }
		]
	}
];

Twinkle.protect.callback.changePreset = function twinkleprotectCallbackChangePreset(e) {
	var form = e.target.form;

	var actiontypes = form.actiontype;
	var actiontype;
	for( var i = 0; i < actiontypes.length; i++ )
	{
		if( !actiontypes[i].checked ) {
			continue;
		}
		actiontype = actiontypes[i].values;
		break;
	}

	if (actiontype === 'protect') {  // actually protecting the page
		var item = Twinkle.protect.protectionPresetsInfo[form.category.value];
		if (mw.config.get('wgArticleId')) {
			if (item.edit) {
				form.editmodify.checked = true;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
				form.editlevel.value = item.edit;
				Twinkle.protect.formevents.editlevel({ target: form.editlevel });
			} else {
				form.editmodify.checked = false;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
			}

			if (item.move) {
				form.movemodify.checked = true;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
				form.movelevel.value = item.move;
				Twinkle.protect.formevents.movelevel({ target: form.movelevel });
			} else {
				form.movemodify.checked = false;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
			}
		} else {
			if (item.create) {
				form.createlevel.value = item.create;
				Twinkle.protect.formevents.createlevel({ target: form.createlevel });
			}
		}

		if (item.reason) {
			form.reason.value = item.reason;
		} else {
			form.reason.value = '';
		}

		// sort out tagging options
		if (mw.config.get('wgArticleId')) {
			if( form.category.value === 'unprotect' ) {
				form.tagtype.value = 'none';
			} else {
				form.tagtype.value = (item.template ? item.template : form.category.value);
			}
			Twinkle.protect.formevents.tagtype({ target: form.tagtype });

			if( /template/.test( form.category.value ) ) {
				form.noinclude.checked = true;
				form.editexpiry.value = form.moveexpiry.value = "indefinite";
			} else {
				form.noinclude.checked = false;
			}
		}

	} else {  // RPP request
		if( form.category.value === 'unprotect' ) {
			form.expiry.value = '';
			form.expiry.disabled = true;
		} else {
			form.expiry.disabled = false;
		}
	}
};

Twinkle.protect.callback.evaluate = function twinkleprotectCallbackEvaluate(e) {
	var form = e.target;

	var actiontypes = form.actiontype;
	var actiontype;
	for( var i = 0; i < actiontypes.length; i++ )
	{
		if( !actiontypes[i].checked ) {
			continue;
		}
		actiontype = actiontypes[i].values;
		break;
	}

	if( !mw.config.get('wgArticleId') ) {
		tagparams = {
			tag: 'noop'
		};
	} else if( actiontype === 'tag' || actiontype === 'protect' ) {
		tagparams = {
			tag: form.tagtype.value,
			reason: ((form.tagtype.value === 'pp-protected' || form.tagtype.value === 'pp-semi-protected' || form.tagtype.value === 'pp-move') && form.reason) ? form.reason.value : null,
			expiry: (actiontype === 'protect') ? (form.editmodify.checked ? form.editexpiry.value : (form.movemodify.checked ?
				form.moveexpiry.value : null)) : null,
				small: form.small.checked,
				noinclude: form.noinclude.checked
		};
	}

	switch (actiontype) {
		case 'protect':
			// protect the page
			var thispage = new Wikipedia.page(mw.config.get('wgPageName'), "保护页面");
			if (mw.config.get('wgArticleId')) {
				if (form.editmodify.checked) {
					thispage.setEditProtection(form.editlevel.value, form.editexpiry.value);
				}
				if (form.movemodify.checked) {
					thispage.setMoveProtection(form.movelevel.value, form.moveexpiry.value);
				}
			} else {
				thispage.setCreateProtection(form.createlevel.value, form.createexpiry.value);
			}
			if (form.reason.value) {
				thispage.setEditSummary(form.reason.value);
			} else {
				alert("您必须输入保护理由，这会出现在日志中。");
				return;
			}

			SimpleWindow.setButtonsEnabled( false );
			Status.init( form );

			Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
			Wikipedia.actionCompleted.notice = "保护完成";

			thispage.protect();
			/* falls through */
		case 'tag':

			if (actiontype === 'tag') {
				SimpleWindow.setButtonsEnabled( false );
				Status.init( form );
				Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
				Wikipedia.actionCompleted.followRedirect = false;
				Wikipedia.actionCompleted.notice = "标记完成";
			}

			if (tagparams.tag === 'noop') {
				Status.info("应用保护模板", "无关");
				break;
			}

			var protectedPage = new Wikipedia.page( mw.config.get('wgPageName'), '标记页面');
			protectedPage.setCallbackParameters( tagparams );
			protectedPage.load( Twinkle.protect.callbacks.taggingPage );
			break;

		case 'request':
			// file request at RPP
			var typename, typereason;
			switch( form.category.value ) {
				case 'pp-dispute':
				case 'pp-vandalism':
				case 'pp-template':
				case 'pp-usertalk':
				case 'pp-protected':
					typename = '全保护';
					break;
				case 'pp-semi-vandalism':
				case 'pp-semi-usertalk':
				case 'pp-semi-template':
				case 'pp-semi-sock':
				case 'pp-semi-blp':
				case 'pp-semi-protected':
					typename = '半保护';
					break;
				case 'pp-move':
				case 'pp-move-dispute':
				case 'pp-move-indef':
				case 'pp-move-vandalism':
					typename = '移动保护';
					break;
				case 'pp-create':
				case 'pp-create-offensive':
				case 'pp-create-blp':
				case 'pp-create-salt':
					typename = '白纸保护';
					break;
				case 'unprotect':
					/* falls through */
				default:
					typename = '解除保护';
					break;
			}
			switch (form.category.value) {
				case 'pp-dispute':
					typereason = '争议、编辑战';
					break;
				case 'pp-vandalism':
				case 'pp-semi-vandalism':
					typereason = '长期破坏';
					break;
				case 'pp-template':
				case 'pp-semi-template':
					typereason = '高风险模板';
					break;
				case 'pp-usertalk':
				case 'pp-semi-usertalk':
					typereason = '已封禁用户的讨论页';
					break;
				case 'pp-semi-sock':
					typereason = '傀儡破坏';
					break;
				case 'pp-semi-blp':
					typereason = '违反生者传记方针';
					break;
				case 'pp-move-dispute':
					typereason = '争议、移动战';
					break;
				case 'pp-move-vandalism':
					typereason = '移动破坏';
					break;
				case 'pp-move-indef':
					typereason = '高风险页面';
					break;
				default:
					typereason = '';
					break;
			}

			var reason = typereason;
			if( form.reason.value !== '') {
				if ( typereason !== '' ) {
					reason += "：";
				}
				reason += form.reason.value;
			}
			if( reason !== '' && reason.charAt( reason.length - 1 ) !== '。' ) {
				reason += '。';
			}

			var rppparams = {
				reason: reason,
				typename: typename,
				category: form.category.value,
				expiry: form.expiry.value
			};

			SimpleWindow.setButtonsEnabled( false );
			Status.init( form );

			rppName = 'Wikipedia:请求保护页面';

			// Updating data for the action completed event
			Wikipedia.actionCompleted.redirect = rppName;
			Wikipedia.actionCompleted.notice = "提名完成，重定向到讨论页";

			var rppPage = new Wikipedia.page( rppName, '请求保护页面');
			rppPage.setFollowRedirect( true );
			rppPage.setCallbackParameters( rppparams );
			rppPage.load( Twinkle.protect.callbacks.fileRequest );
			break;
		default:
			alert("twinkleprotect: 未知操作类型");
			break;
	}
};

Twinkle.protect.callbacks = {
	taggingPage: function( protectedPage ) {
		var params = protectedPage.getCallbackParameters();
		var text = protectedPage.getPageText();
		var tag, summary;

		var oldtag_re = /\s*(?:<noinclude>)?\s*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*/gi;

		text = text.replace( oldtag_re, '' );

		if ( params.tag !== 'none' ) {
			tag = params.tag;
			if( params.reason ) {
				tag += '|reason=' + params.reason;
			}
			if( ['indefinite', 'infinite', 'never', null].indexOf(params.expiry) === -1 ) {
				tag += '|expiry={{subst:#time:c|' + (/^\s*\d+\s*$/.exec(params.expiry) ? params.expiry : '+' + params.expiry) + '}}';
			}
			if( params.small ) {
				tag += '|small=yes';
			}
		}

		if( params.tag === 'none' ) {
			summary = '移除保护模板' + Twinkle.getPref('summaryAd');
		} else {
			if( params.noinclude ) {
				text = "<noinclude>{{" + tag + "}}</noinclude>" + text;
			} else {
				text = "{{" + tag + "}}\n" + text;
			}
			summary = "添加{{" + params.tag + "}}" + Twinkle.getPref('summaryAd');
		}

		protectedPage.setEditSummary( summary );
		protectedPage.setPageText( text );
		protectedPage.setCreateOption( 'nocreate' );
		protectedPage.save();
	},

	fileRequest: function( rppPage ) {

		var params = rppPage.getCallbackParameters();
		var text = rppPage.getPageText();
		var statusElement = rppPage.getStatusElement();

		var rppRe = new RegExp( '===\\s*[[' + RegExp.escape( mw.config.get('wgPageName'), true ) + ']]\\s*===', 'm' );
		var tag = rppRe.exec( text );

		var rppLink = document.createElement('a');
		rppLink.setAttribute('href', mw.util.wikiGetlink(rppPage.getPageName()) );
		rppLink.appendChild(document.createTextNode(rppPage.getPageName()));

		if ( tag ) {
			statusElement.error( [ '已有对此条目的保护提名，在 ', rppLink, '，取消操作。' ] );
			return;
		}

		var newtag = '=== [[' + mw.config.get('wgPageName') +  ']] ===' + "\n";
		if( ( new RegExp( '^' + RegExp.escape( newtag ).replace( /\s+/g, '\\s*' ), 'm' ) ).test( text ) ) {
			statusElement.error( [ '已有对此条目的保护提名，在 ', rppLink, '，取消操作。' ] );
			return;
		}

		var words;
		switch( params.expiry ) {
		case 'temporary':
			words = "临时";
			break;
		case 'indefinite':
			words = "永久";
			break;
		default:
			words = "";
			break;
		}

		words += params.typename;

		newtag += "请求" + words.toUpperCaseFirstChar() + ( params.reason !== '' ? "：" + params.reason : "。" ) + "--~~~~";

		var reg;
		if ( params.category === 'unprotect' ) {
			reg = /(==\s*请求解除保护\s*==\n)/;
		} else {
			reg = /(==\s*请求保护\s*==\n)/;
		}
		var originalTextLength = text.length;
		text = text.replace( reg, "$1" + newtag + "\n");
		if (text.length === originalTextLength)
		{
			statusElement.error( '无法在WP:RFPP上找到相关位点标记，取消操作。' );
			return;
		}
		statusElement.status( '添加新提名…' );
		rppPage.setEditSummary( '请求对[[' + mw.config.get('wgPageName').replace(/_/g, ' ') + ']]' + params.typename + Twinkle.getPref('summaryAd') );
		rppPage.setPageText( text );
		rppPage.setCreateOption( 'recreate' );
		rppPage.save();
	}
};
