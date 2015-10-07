//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){

var api = new mw.Api(), relevantUserName;

/*
 ****************************************
 *** twinkleblock.js: Block module
 ****************************************
 * Mode of invocation:     Tab ("Block")
 * Active on:              any page with relevant user name (userspace, contribs, etc.)
 * Config directives in:   [soon to be TwinkleConfig]
 */

Twinkle.block = function twinkleblock() {
	// should show on Contributions pages, anywhere there's a relevant user
	if ( Morebits.userIsInGroup('sysop') && mw.config.get('wgRelevantUserName') ) {
		Twinkle.addPortletLink(Twinkle.block.callback, '封禁', 'tw-block', '封禁相关用户' );
	}
};

Twinkle.block.callback = function twinkleblockCallback() {
	if( mw.config.get('wgRelevantUserName') === mw.config.get('wgUserName') &&
			!confirm( '您即将封禁自己！确认要继续吗？' ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 650, 530 );
	// need to be verbose about who we're blocking
	Window.setTitle( '封禁或向' + mw.config.get('wgRelevantUserName') + '发出封禁模板' );
	Window.setScriptName( 'Twinkle' );
	Window.addFooterLink( '封禁模板', 'Wikipedia:模板消息/用戶討論名字空間#.E5.B0.81.E7.A6.81' );
	Window.addFooterLink( '封禁方针', 'WP:BLOCK' );
	Window.addFooterLink( 'Twinkle帮助', 'WP:TW/DOC#block' );

	Twinkle.block.currentBlockInfo = undefined;
	Twinkle.block.field_block_options = {};
	Twinkle.block.field_template_options = {};

	var form = new Morebits.quickForm( Twinkle.block.callback.evaluate );
	var actionfield = form.append( {
			type: 'field',
			label: '操作类型'
		} );
	actionfield.append({
			type: 'checkbox',
			name: 'actiontype',
			event: Twinkle.block.callback.change_action,
			list: [
				{
					label: '封禁用户',
					value: 'block',
					tooltip: '用选择的选项封禁相关用户。',
					checked: true
				},
				{
					label: '添加封禁模板到用户对话页',
					value: 'template',
					tooltip: '如果执行封禁的管理员忘记发出保护模板，或你封禁了用户而没有给其发出模板，则你可以用此来发出合适的模板。',
					checked: true
				}
			]
		});

	form.append({ type: 'field', label: '预设', name: 'field_preset' });
	form.append({ type: 'field', label: '模板选项', name: 'field_template_options' });
	form.append({ type: 'field', label: '封禁选项', name: 'field_block_options' });

	form.append( { type:'submit', label: '提交〜工具测试中，请检查执行结果！〜' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
	result.root = result;

	Twinkle.block.fetchUserInfo(function() {
		// clean up preset data (defaults, etc.), done exactly once, must be before Twinkle.block.callback.change_action is called
		Twinkle.block.transformBlockPresets();

		// init the controls after user and block info have been fetched
		var evt = document.createEvent( 'Event' );
		evt.initEvent( 'change', true, true );
		result.actiontype[0].dispatchEvent( evt );
	});
};

Twinkle.block.fetchUserInfo = function twinkleblockFetchUserInfo(fn) {

	api.get({
		format: 'json',
		action: 'query',
		list: 'blocks|users|logevents',
		letype: 'block',
		lelimit: 1,
		bkusers: mw.config.get('wgRelevantUserName'),
		ususers: mw.config.get('wgRelevantUserName'),
		letitle: 'User:' + mw.config.get('wgRelevantUserName')
	})
	.then(function(data){
		var blockinfo = data.query.blocks[0],
			userinfo = data.query.users[0];

		Twinkle.block.isRegistered = !!userinfo.userid;
		relevantUserName = Twinkle.block.isRegistered ? 'User:' + mw.config.get('wgRelevantUserName') : mw.config.get('wgRelevantUserName');

		if (blockinfo) {
			// handle frustrating system of inverted boolean values
			blockinfo.disabletalk = blockinfo.allowusertalk === undefined;
			blockinfo.hardblock = blockinfo.anononly === undefined;
			Twinkle.block.currentBlockInfo = blockinfo;
		}

		Twinkle.block.hasBlockLog = !!data.query.logevents.length;

		if (typeof fn === 'function') return fn();
	}, function(msg) {
		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		Morebits.status.warn('抓取用户信息出错', msg);
	});
};

Twinkle.block.callback.saveFieldset = function twinkleblockCallbacksaveFieldset(fieldset) {
	Twinkle.block[$(fieldset).prop('name')] = {};
	$(fieldset).serializeArray().forEach(function(el) {
		Twinkle.block[$(fieldset).prop('name')][el.name] = el.value;
	});
};

Twinkle.block.callback.change_action = function twinkleblockCallbackChangeAction(e) {
	var field_preset, field_template_options, field_block_options, $form = $(e.target.form);

	Twinkle.block.callback.saveFieldset($('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_template_options]'));

	if ($form.find('[name=actiontype][value=block]').is(':checked')) {
		field_preset = new Morebits.quickForm.element({ type: 'field', label: '预设', name: 'field_preset' });
		field_preset.append({
				type: 'select',
				name: 'preset',
				label: '选择预设：',
				event: Twinkle.block.callback.change_preset,
				list: Twinkle.block.callback.filtered_block_groups()
			});

		field_block_options = new Morebits.quickForm.element({ type: 'field', label: '封禁选项', name: 'field_block_options' });
		field_block_options.append({ type: 'div', name: 'hasblocklog', label: ' ' });
		field_block_options.append({ type: 'div', name: 'currentblock', label: ' ' });
		field_block_options.append({
				type: 'select',
				name: 'expiry_preset',
				label: '过期时间：',
				event: Twinkle.block.callback.change_expiry,
				list: [
					{ label: '自定义', value: 'custom', selected: true },
					{ label: '无限期', value: 'infinity' },
					{ label: '3小时', value: '3 hours' },
					{ label: '12小时', value: '12 hours' },
					{ label: '24小时', value: '24 hours' },
					{ label: '31小时', value: '31 hours' },
					{ label: '36小时', value: '36 hours' },
					{ label: '48小时', value: '48 hours' },
					{ label: '60小时', value: '60 hours' },
					{ label: '72小时', value: '72 hours' },
					{ label: '1周', value: '1 week' },
					{ label: '2周', value: '2 weeks' },
					{ label: '1月', value: '1 month' },
					{ label: '3月', value: '3 months' },
					{ label: '6月', value: '6 months' },
					{ label: '1年', value: '1 year' },
					{ label: '2年', value: '2 years' },
					{ label: '3年', value: '3 years' }
				]
			});
			field_block_options.append({
					type: 'input',
					name: 'expiry',
					label: '自定义过期时间',
					tooltip: '您可以使用相对时间，如“1 minute”或“19 days”；或绝对是间，“yyyymmddhhmm”（如“200602011405”是2006年2月1日14:05 UTC。）',
					value: Twinkle.block.field_block_options.expiry || Twinkle.block.field_template_options.template_expiry
				});
		var blockoptions = [
				{
					checked: Twinkle.block.field_block_options.nocreate,
					label: '禁止创建帐户',
					name: 'nocreate',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.noemail,
					label: '电子邮件停用',
					name: 'noemail',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.disabletalk,
					label: '不能编辑自己的讨论页',
					name: 'disabletalk',
					value: '1'
				}
			];

		if (Twinkle.block.isRegistered) {
			blockoptions.push({
					checked: Twinkle.block.field_block_options.autoblock,
					label: '自动封禁',
					name: 'autoblock',
					value: '1'
				});
		} else {
			blockoptions.push({
					checked: Twinkle.block.field_block_options.hardblock,
					label: '阻止登录用户使用该IP地址编辑',
					name: 'hardblock',
					value: '1'
				});
		}

		blockoptions.push({
				checked: Twinkle.block.field_block_options.watchuser,
				label: '监视该用户的用户页和讨论页',
				name: 'watchuser',
				value: '1'
			});

		field_block_options.append({
				type: 'checkbox',
				name: 'blockoptions',
				list: blockoptions
			});
		field_block_options.append({
				type: 'textarea',
				label: '理由（为了封禁日志）：',
				name: 'reason',
				value: Twinkle.block.field_block_options.reason
			});

		if (Twinkle.block.currentBlockInfo) {
			field_block_options.append( { type: 'hidden', name: 'reblock', value: '1' } );
		}
	}

	if ($form.find('[name=actiontype][value=template]').is(':checked')) {
		field_template_options = new Morebits.quickForm.element({ type: 'field', label: '模板选项', name: 'field_template_options' });
		field_template_options.append( {
				type: 'select',
				name: 'template',
				label: '选择对话页模板：',
				event: Twinkle.block.callback.change_template,
				list: Twinkle.block.callback.filtered_block_groups(true),
				value: Twinkle.block.field_template_options.template
			} );
		field_template_options.append( {
				type: 'input',
				name: 'article',
				display: 'none',
				label: '条目链接',
				value: '',
				tooltip: '可以随通知链接条目，比如扰乱的主目标。没有条目需要链接则请留空。'
			} );
		if (!$form.find('[name=actiontype][value=block]').is(':checked')) {
			field_template_options.append( {
				type: 'input',
				name: 'template_expiry',
				display: 'none',
				label: '封禁期限：',
				value: '',
				tooltip: '封禁时长，如24小时、2周、无限期等。'
			} );
		}
		field_template_options.append( {
			type: 'input',
			name: 'block_reason',
			label: '“由于…您已被封禁”',
			display: 'none',
			tooltip: '可选的理由，用于替换默认理由。只在常规封禁模板中有效。',
			value: Twinkle.block.field_template_options.block_reason
		} );

		if ($form.find('[name=actiontype][value=block]').is(':checked')) {
			field_template_options.append( {
				type: 'checkbox',
				name: 'blank_duration',
				list: [
					{
						label: '不在模板中包含封禁期限',
						checked: Twinkle.block.field_template_options.blank_duration,
						tooltip: '模板将会显示“一段时间”而不是具体时长'
					}
				]
			} );
		} else {
			//field_template_options.append( {
			//	type: 'checkbox',
			//	name: 'notalk',
			//	list: [
			//		{
			//			label: '不能编辑自己的讨论页',
			//			checked: Twinkle.block.field_template_options.notalk,
			//			tooltip: '用此在保护模板中指明该用户编辑对话页的权限已被移除'
			//		}
			//	]
			//} );
		}

		var $previewlink = $( '<a id="twinkleblock-preivew-link">预览</a>' );
		$previewlink.off('click').on('click', function(){
			Twinkle.block.callback.preview($form[0]);
		});
		$previewlink.css({cursor: 'pointer'});
		field_template_options.append( { type: 'div', id: 'blockpreview', label: [ $previewlink[0] ] } );
		field_template_options.append( { type: 'div', id: 'twinkleblock-previewbox', style: 'display: none' } );
	}

	var oldfield;
	if (field_preset) {
		oldfield = $form.find('fieldset[name="field_preset"]')[0];
		oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
	} else {
		$form.find('fieldset[name="field_preset"]').hide();
	}
	if (field_block_options) {
		oldfield = $form.find('fieldset[name="field_block_options"]')[0];
		oldfield.parentNode.replaceChild(field_block_options.render(), oldfield);
	} else {
		$form.find('fieldset[name="field_block_options"]').hide();
	}
	if (field_template_options) {
		oldfield = $form.find('fieldset[name="field_template_options"]')[0];
		oldfield.parentNode.replaceChild(field_template_options.render(), oldfield);
		e.target.form.root.previewer = new Morebits.wiki.preview($(e.target.form.root).find('#twinkleblock-previewbox').last()[0]);
	} else {
		$form.find('fieldset[name="field_template_options"]').hide();
	}

	if (Twinkle.block.hasBlockLog) {
		var $blockloglink = $( '<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: mw.config.get('wgRelevantUserName'), type: 'block'}) + '">封禁日志</a>)' );

		Morebits.status.init($('div[name="hasblocklog"] span').last()[0]);
		Morebits.status.warn('此用户曾在过去被封禁', $blockloglink[0]);
	}

	if (Twinkle.block.currentBlockInfo) {
		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		Morebits.status.warn(relevantUserName + '已被封禁', '提交请求来用给定的选项重新封禁');
		Twinkle.block.callback.update_form(e, Twinkle.block.currentBlockInfo);
	} else if ($form.find('[name=actiontype][value=template]').is(':checked')) {
		// make sure all the fields are correct based on defaults
		if ($form.find('[name=actiontype][value=block]').is(':checked')) {
			Twinkle.block.callback.change_preset(e);
		} else {
			Twinkle.block.callback.change_template(e);
		}
	}
};

/*
 * Keep alphabetized by key name, Twinkle.block.blockGroups establishes
 *    the order they will appear in the interface
 *
 * Block preset format, all keys accept only 'true' (omit for false) except where noted:
 * <title of block template> : {
 *   autoblock: <autoblock any IP addresses used (for registered users only)>
 *   disabletalk: <disable user from editing their own talk page while blocked>
 *   expiry: <string - expiry timestamp, can include relative times like "5 months", "2 weeks" etc, use "infinity" for indefinite>
 *   forAnonOnly: <show block option in the interface only if the relevant user is an IP>
 *   forRegisteredOnly: <show block option in the interface only if the relevant user is registered>
 *   label: <string - label for the option of the dropdown in the interface (keep brief)>
 *   noemail: prevent the user from sending email through Special:Emailuser
 *   pageParam: <set if the associated block template accepts a page parameter>
 *   prependReason: <string - prepends the value of 'reason' to the end of the existing reason, namely for when revoking talk page access>
 *   nocreate: <block account creation from the user's IP (for anonymous users only)>
 *   nonstandard: <template does not conform to stewardship of WikiProject User Warnings and may not accept standard parameters>
 *   reason: <string - block rationale, as would appear in the block log,
 *            and the edit summary for when adding block template, unless 'summary' is set>
 *   reasonParam: <set if the associated block template accepts a reason parameter>
 *   sig: <string - set to ~~~~ if block template does not accept "true" as the value, or set null to omit sig param altogether>
 *   summary: <string - edit summary for when adding block template to user's talk page, if not set, 'reason' is used>
 *   suppressArticleInSummary: <set to suppress showing the article name in the edit summary, as with attack pages>
 *   templateName: <string - name of template to use (instead of key name), entry will be omitted from the Templates list.
 *                  (e.g. use another template but with different block options)>
 *   useInitialOptions: <when preset is chosen, only change given block options, leave others as they were>
 *
 * WARNING: 'anononly' and 'allowusertalk' are enabled by default.
 *   To disable, set 'hardblock' and 'disabletalk', respectively
 */
Twinkle.block.blockPresetsInfo = {
	'blocked proxy' : {
		expiry: '2 years',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{blocked proxy}}',
		sig: null
	},
	'checkuserblock' : {
		expiry: 'infinity',
		nonstandard: true,
		reason: '{{checkuserblock}}',
		sig: '~~~~'
	},
	'checkuserblock-account' : {
		forRegisteredOnly: true,
		expiry: '1 month',
		nonstandard: true,
		reason: '{{checkuserblock-account}}',
		sig: '~~~~'
	},
	// Placeholder for when we add support for rangeblocks
	//'range block' : {
	//	expiry: '6 months',
	//	forAnonOnly: true,
	//	nocreate: true,
	//	nonstandard: true,
	//	reason: '{{range block}}',
	//	sig: null
	//},
	'schoolblock' : {
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{schoolblock}}',
		sig: '~~~~'
	},
	// uw-prefixed
	'uw-3block' : {
		autoblock: true,
		expiry: '24 hours',
		nocreate: true
	},
	'uw-ablock' : {
		autoblock: true,
		expiry: '31 hours',
		forAnonOnly: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-bblock': {
		forRegisteredOnly: true,
	},
	'uw-block1' : {
		autoblock: true,
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-block2' : {
		autoblock: true,
		expiry: '1 week',
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-block3' : {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-dblock': {
		autoblock: true,
		nocreate: true
	},
	'uw-sblock' : {
		autoblock: true,
		nocreate: true
	},
	'uw-ublock' : {
		expiry: 'infinity',
		forRegisteredOnly: true
	},
	'uw-ublock|误导' : {
		expiry: 'infinity',
		forRegisteredOnly: true
	},
	'uw-ublock|宣传' : {
		expiry: 'infinity',
		forRegisteredOnly: true
	},
	'uw-ublock|攻击|或侮辱性' : {
		expiry: 'infinity',
		forRegisteredOnly: true
	},
	'uw-ublock|混淆' : {
		expiry: 'infinity',
		forRegisteredOnly: true
	},
	'uw-vblock' : {
		autoblock: true,
		expiry: '31 hours',
		nocreate: true
	}
};

Twinkle.block.transformBlockPresets = function twinkleblockTransformBlockPresets() {
	// supply sensible defaults
	$.each(Twinkle.block.blockPresetsInfo, function(preset, settings) {
		settings.summary = settings.summary || settings.reason;
		settings.sig = settings.sig !== undefined ? settings.sig : 'yes';
		// despite this it's preferred that you use 'infinity' as the value for expiry
		settings.indefinite = settings.indefinite || settings.expiry === 'infinity' || settings.expiry === 'indefinite' || settings.expiry === 'never';

		if (!Twinkle.block.isRegistered && settings.indefinite) {
			settings.expiry = '31 hours';
		} else {
			settings.expiry = settings.expiry || '31 hours';
		}

		Twinkle.block.blockPresetsInfo[preset] = settings;
	});
	$.each(Twinkle.block.blockGroups, function(_, blockGroup) {
		$.each(blockGroup.list, function(_, blockPreset) {
			var value = blockPreset.value, reason = blockPreset.label, newPreset = value + ':' + reason;
			Twinkle.block.blockPresetsInfo[newPreset] = jQuery.extend(true, {}, Twinkle.block.blockPresetsInfo[value]);
			Twinkle.block.blockPresetsInfo[newPreset].template = value;
			if (blockGroup.meta) {
				//Twinkle.block.blockPresetsInfo[newPreset].forAnonOnly = false;
				Twinkle.block.blockPresetsInfo[newPreset].forRegisteredOnly = false;
			} else if (reason) {
				Twinkle.block.blockPresetsInfo[newPreset].reason = reason;
			}
			blockPreset.value = newPreset;
		});
	});
};

// These are the groups of presets and defines the order in which they appear. For each list item:
//   label: <string, the description that will be visible in the dropdown>
//   value: <string, the key of a preset in blockPresetsInfo>
Twinkle.block.blockGroups = [
	{
		meta: true,
		label: '封禁模板',
		list: [
			{ label: '层级1封禁', value: 'uw-block1' },
			{ label: '层级2封禁', value: 'uw-block2' },
			{ label: '层级3封禁', value: 'uw-block3' },
			{ label: '匿名封禁', value: 'uw-ablock' }
		]
	},
	{
		label: '一般的封禁理由',
		list: [
			{ label: '[[WP:VAN|破坏]]', value: 'uw-vblock' },
			{ label: '[[WP:VAN#LANG|繁简破坏]]', value: 'uw-block1' },
			{ label: '跨维基项目破坏', value: 'uw-block1' },
			{ label: '[[WP:VOA|纯破坏用户]]', value: 'uw-block3' },
			{ label: '[[WP:SOAP|散发广告或宣传]]', value: 'uw-sblock' },
			{ label: '仅[[WP:SOAP|散发广告/宣传]]的用户', value: 'uw-block3' },
			{ label: '违反[[WP:3RR|回退不过三原则]]', value: 'uw-3block' },
			{ label: '无礼的行为、[[WP:NPA|攻击别人]]', value: 'uw-block1' },
			{ label: '[[WP:骚扰|骚扰用户]]', value: 'uw-block1' },
			{ label: '[[WP:扰乱|扰乱]]', value: 'uw-block1' },
			{ label: '[[WP:GAME|游戏维基规则]]', value: 'uw-block1' },
			{ label: '确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]', value: 'uw-block3' },
			{ label: '滥用[[WP:SOCK|傀儡]]', value: 'uw-block1' },
			{ label: '屡次增加不实资料', value: 'uw-block1' },
			{ label: '在条目中增加无意义文字', value: 'uw-block1' },
			{ label: '无故删除条目内容', value: 'uw-dblock' },
			{ label: '多次加入[[WP:COPYVIO|侵犯版权]]的内容', value: 'uw-block1' },
			{ label: '机器人发生故障并必须紧急停止', value: 'uw-bblock' }
			//{ label: '剥夺编辑对话页权限', value: '' }
		]
	},
	{
		label: '用户名封禁',
		list: [
			{ label: '', value: 'uw-ublock|误导' },
			{ label: '', value: 'uw-ublock|宣传' },
			{ label: '', value: 'uw-ublock|攻击|或侮辱性' },
			{ label: '', value: 'uw-ublock|混淆' }
		]
	},
	{
		label: '其他模板',
		list: [
			{ label: '', value: 'uw-ublock' },
			//{ label: '', value: 'range block' },
			{ label: '', value: 'schoolblock' },
			{ label: '', value: 'blocked proxy' },
			{ label: '', value: 'checkuserblock' },
			{ label: '', value: 'checkuserblock-account' }
		]
	}
];

Twinkle.block.callback.filtered_block_groups = function twinkleblockCallbackFilteredBlockGroups(show_template) {
	return $.map(Twinkle.block.blockGroups, function(blockGroup) {
		if (!show_template && blockGroup.meta) return;
		var list = $.map(blockGroup.list, function(blockPreset) {
				// only show uw-talkrevoked if reblocking
				if (!Twinkle.block.currentBlockInfo && blockPreset.value === "uw-talkrevoked") return;

				var blockSettings = Twinkle.block.blockPresetsInfo[blockPreset.value];
				var registrationRestrict = blockSettings.forRegisteredOnly ? Twinkle.block.isRegistered : (blockSettings.forAnonOnly ? !Twinkle.block.isRegistered : true);
				if (!(blockSettings.templateName && show_template) && registrationRestrict) {
					var templateName = blockSettings.templateName || blockSettings.template || blockPreset.value;
					return {
						label: (show_template ? '{{' + templateName + '}}: ' : '') + (blockPreset.label || '{{' + templateName + '}}'),
						value: blockPreset.value,
						data: [{
							name: 'template-name',
							value: templateName
						}],
						selected: !!blockPreset.selected
					};
				}
			});
		if (list.length) return {
				label: blockGroup.label,
				list: list
			};
	});
};

Twinkle.block.callback.change_preset = function twinkleblockCallbackChangePreset(e) {
	var key = e.target.form.preset.value;
	if (!key) return;

	e.target.form.template.value = Twinkle.block.blockPresetsInfo[key].templateName || key;
	e.target.form.template.value = key;
	Twinkle.block.callback.update_form(e, Twinkle.block.blockPresetsInfo[key]);
	Twinkle.block.callback.change_template(e);
};

Twinkle.block.callback.change_expiry = function twinkleblockCallbackChangeExpiry(e) {
	var expiry = e.target.form.expiry;
	if (e.target.value === 'custom') {
		Morebits.quickForm.setElementVisibility(expiry.parentNode, true);
	} else {
		Morebits.quickForm.setElementVisibility(expiry.parentNode, false);
		expiry.value = e.target.value;
	}
};

Twinkle.block.callback.update_form = function twinkleblockCallbackUpdateForm(e, data) {
	var form = e.target.form, expiry_preset = form.expiry_preset,
		expiry = data.expiry;

	// don't override original expiry if useInitialOptions is set
	if (!data.useInitialOptions) {
		if (Date.parse(expiry)) {
			expiry = new Date(expiry).toGMTString();
			form.expiry_preset.value = 'custom';
		} else {
			form.expiry_preset.value = data.expiry || 'custom';
		}

		form.expiry.value = expiry;
		if (form.expiry_preset.value === 'custom') {
			Morebits.quickForm.setElementVisibility(form.expiry.parentNode, true);
		} else {
			Morebits.quickForm.setElementVisibility(form.expiry.parentNode, false);
		}
	}

	// boolean-flipped options, more at [[mw:API:Block]]
	data.disabletalk = data.disabletalk !== undefined ? data.disabletalk : false;
	data.hardblock = data.hardblock !== undefined ? data.hardblock : false;

	// disable autoblock if blocking a bot
	if (Twinkle.block.isRegistered && relevantUserName.search(/bot$/i) > 0) {
		data.autoblock = false;
	}

	$(form.field_block_options).find(':checkbox').each(function(i, el) {
		// don't override original options if useInitialOptions is set
		if (data.useInitialOptions && data[el.name] === undefined) return;

		var check = data[el.name] === '' || !!data[el.name];
		$(el).prop('checked', check);
	});

	if (data.prependReason && data.reason) {
		form.reason.value = data.reason + '; ' + form.reason.value;
	} else {
		form.reason.value = data.reason || '';
	}
};

Twinkle.block.callback.change_template = function twinkleblockcallbackChangeTemplate(e) {
	var form = e.target.form, value = form.template.value, settings = Twinkle.block.blockPresetsInfo[value];

	if (!$(form).find('[name=actiontype][value=block]').is(':checked')) {
		if (settings.indefinite || settings.nonstandard) {
			if (Twinkle.block.prev_template_expiry === null) {
				Twinkle.block.prev_template_expiry = form.template_expiry.value || '';
			}
			form.template_expiry.parentNode.style.display = 'none';
			form.template_expiry.value = 'indefinite';
		} else if ( form.template_expiry.parentNode.style.display === 'none' ) {
			if(Twinkle.block.prev_template_expiry !== null) {
				form.template_expiry.value = Twinkle.block.prev_template_expiry;
				Twinkle.block.prev_template_expiry = null;
			}
			form.template_expiry.parentNode.style.display = 'block';
		}
		if (Twinkle.block.prev_template_expiry) form.expiry.value = Twinkle.block.prev_template_expiry;
		Morebits.quickForm.setElementVisibility(form.notalk.parentNode, !settings.nonstandard);
	} else {
		Morebits.quickForm.setElementVisibility(
			form.blank_duration.parentNode,
			!settings.indefinite && !settings.nonstandard
		);
	}

	Morebits.quickForm.setElementVisibility(form.article.parentNode, !!settings.pageParam);
	Morebits.quickForm.setElementVisibility(form.block_reason.parentNode, !!settings.reasonParam);
	form.block_reason.value = settings.reason || '';

	form.root.previewer.closePreview();
};
Twinkle.block.prev_template_expiry = null;
Twinkle.block.prev_block_reason = null;
Twinkle.block.prev_article = null;
Twinkle.block.prev_reason = null;

Twinkle.block.callback.preview = function twinkleblockcallbackPreview(form) {
	var params = {
		article: form.article.value,
		blank_duration: form.blank_duration ? form.blank_duration.checked : false,
		disabletalk: form.disabletalk.checked || (form.notalk ? form.notalk.checked : false),
		expiry: form.template_expiry ? form.template_expiry.value : form.expiry.value,
		hardblock: Twinkle.block.isRegistered ? form.autoblock.checked : form.hardblock.checked,
		indefinite: (/indef|infinity|never|\*|max/).test( form.template_expiry ? form.template_expiry.value : form.expiry.value ),
		reason: form.block_reason.value,
		template: form.template.value.split(':', 1)[0]
	};

	var templateText = Twinkle.block.callback.getBlockNoticeWikitext(params);

	form.previewer.beginRender(templateText);
};

Twinkle.block.callback.evaluate = function twinkleblockCallbackEvaluate(e) {
	var $form = $(e.target),
		toBlock = $form.find('[name=actiontype][value=block]').is(':checked'),
		toWarn = $form.find('[name=actiontype][value=template]').is(':checked'),
		blockoptions = {}, templateoptions = {};

	Twinkle.block.callback.saveFieldset($form.find('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_template_options]'));

	blockoptions = Twinkle.block.field_block_options;

	templateoptions = Twinkle.block.field_template_options;
	templateoptions.disabletalk = !!(templateoptions.disabletalk || blockoptions.disabletalk);
	templateoptions.hardblock = !!blockoptions.hardblock;
	delete blockoptions.expiry_preset; // remove extraneous

	// use block settings as warn options where not supplied
	templateoptions.summary = templateoptions.summary || blockoptions.reason;
	templateoptions.expiry = templateoptions.template_expiry || blockoptions.expiry;

	if (toBlock) {
		if (!blockoptions.expiry) return alert('请提供过期时间！');
		if (!blockoptions.reason) return alert('请提供封禁理由！');

		Morebits.simpleWindow.setButtonsEnabled( false );
		Morebits.status.init( e.target );
		var statusElement = new Morebits.status('执行封禁');
		blockoptions.action = 'block';
		blockoptions.user = mw.config.get('wgRelevantUserName');

		// boolean-flipped options
		blockoptions.anononly = blockoptions.hardblock ? undefined : true;
		blockoptions.allowusertalk = blockoptions.disabletalk ? undefined : true;

		// fix for bug with block API, see [[phab:T68646]]
		if (blockoptions.expiry === 'infinity') blockoptions.expiry = 'infinite';

		// execute block
		api.getToken('block').then(function(token) {
			statusElement.status('处理中…');
			blockoptions.token = token;
			var mbApi = new Morebits.wiki.api( '执行封禁', blockoptions, function(data) {
				statusElement.info('完成');
				if (toWarn) Twinkle.block.callback.issue_template(templateoptions);
			});
			mbApi.post();
		}, function() {
			statusElement.error('未能抓取封禁令牌');
		});
	} else if (toWarn) {
		Morebits.simpleWindow.setButtonsEnabled( false );

		Morebits.status.init( e.target );
		Twinkle.block.callback.issue_template(templateoptions);
	} else {
		return alert('请给Twinkle点事做！');
	}
};

Twinkle.block.callback.issue_template = function twinkleblockCallbackIssueTemplate(formData) {
	var userTalkPage = 'User_talk:' + mw.config.get('wgRelevantUserName');

	var params = $.extend(formData, {
		messageData: Twinkle.block.blockPresetsInfo[formData.template],
		reason: Twinkle.block.field_template_options.block_reason,
		disabletalk: Twinkle.block.field_template_options.notalk
	});
	params.template = params.template.split(':', 1)[0]

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = '完成，将在几秒后载入用户对话页';

	var wikipedia_page = new Morebits.wiki.page( userTalkPage, '用户对话页修改' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.setFollowRedirect( true );
	wikipedia_page.load( Twinkle.block.callback.main );
};

Twinkle.block.callback.getBlockNoticeWikitext = function(params) {
	var text = '{{', settings = Twinkle.block.blockPresetsInfo[params.template];

	if (!settings.nonstandard) {
		text += 'subst:'+params.template;
		if (params.article && settings.pageParam) text += '|page=' + params.article;

		if (!/te?mp|^\s*$|min/.exec(params.expiry)) {
			if (params.indefinite) {
				text += '|indef=yes';
			} else if(!params.blank_duration) {
				text += '|time=' + params.expiry;
			}
		}

		if (!Twinkle.block.isRegistered && !params.hardblock) {
			text += '|anon=yes';
		}

		if (params.reason) text += '|reason=' + params.reason;
		if (params.disabletalk) text += '|notalk=yes';
	} else {
		text += params.template;
	}
	text += '|subst=subst:';

	if (settings.sig === '~~~~') {
		text += '}}--~~~~';
	} else if (settings.sig) {
		text += '|sig=' + settings.sig;
		text += '}}';
	} else {
		text += '}}';
	}

	return text;
};

Twinkle.block.callback.main = function twinkleblockcallbackMain( pageobj ) {
	var text = pageobj.getPageText(),
		params = pageobj.getCallbackParameters(),
		messageData = params.messageData,
		date = new Date();

	var dateHeaderRegex = new RegExp( "^==+\\s*" + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月" +
		"\\s*==+", 'mg' );
	var dateHeaderRegexLast, dateHeaderRegexResult;
	while ((dateHeaderRegexLast = dateHeaderRegex.exec( text )) !== null) {
		dateHeaderRegexResult = dateHeaderRegexLast;
	}
	// If dateHeaderRegexResult is null then lastHeaderIndex is never checked. If it is not null but
	// \n== is not found, then the date header must be at the very start of the page. lastIndexOf
	// returns -1 in this case, so lastHeaderIndex gets set to 0 as desired.
	var lastHeaderIndex = text.lastIndexOf( '\n==' ) + 1;

	if ( text.length > 0 ) {
		text += '\n\n';
	}

	params.indefinite = (/indef|infinity|never|\*|max/).test( params.expiry );

	if ( Twinkle.getPref('blankTalkpageOnIndefBlock') && params.template !== 'uw-lblock' && params.indefinite ) {
		Morebits.status.info( '信息', '根据参数设置清空讨论页并为日期创建新2级标题' );
		text = '== ' + date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月 ' + ' ==\n';
	} else if( !dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex ) {
		Morebits.status.info( '信息', '未找到当月标题，将创建新的' );
		text += '== ' + date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月 ' + ' ==\n';
	}

	params.expiry = typeof params.template_expiry !== "undefined" ? params.template_expiry : params.expiry;

	text += Twinkle.block.callback.getBlockNoticeWikitext(params);

	// build the edit summary
	var templateName = messageData.templateName || messageData.template || messageData.value;
	var summary = '{{' + templateName + '}}: ' + params.reason;
	if ( messageData.suppressArticleInSummary !== true && params.article ) {
		summary += '，于[[' + params.article + ']]';
	}
	summary += Twinkle.getPref('summaryAd');

	pageobj.setPageText( text );
	pageobj.setEditSummary( summary );
	pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
	pageobj.save();
};

})(jQuery);

//</nowiki>
