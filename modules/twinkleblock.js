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
	if ( Morebits.userIsInGroup('sysop') && Morebits.wiki.flow.relevantUserName() ) {
		Twinkle.addPortletLink(Twinkle.block.callback, '封禁', 'tw-block', wgULS('封禁相关用户', '封禁相關用戶') );
	}
};

Twinkle.block.callback = function twinkleblockCallback() {
	if( Morebits.wiki.flow.relevantUserName() === mw.config.get('wgUserName') &&
			!confirm( wgULS('您即将封禁自己！确认要继续吗？', '您即將封禁自己！確認要繼續嗎？') ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 650, 530 );
	// need to be verbose about who we're blocking
	Window.setTitle( '封禁或向' + Morebits.wiki.flow.relevantUserName() + wgULS('发出封禁模板', '發出封禁模板') );
	Window.setScriptName( 'Twinkle' );
	Window.addFooterLink( '封禁模板', 'Wikipedia:模板消息/用戶討論名字空間#.E5.B0.81.E7.A6.81' );
	Window.addFooterLink( wgULS('封禁方针', '封禁方針'), 'WP:BLOCK' );
	Window.addFooterLink( wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#block' );

	Twinkle.block.currentBlockInfo = undefined;
	Twinkle.block.field_block_options = {};
	Twinkle.block.field_template_options = {};

	var form = new Morebits.quickForm( Twinkle.block.callback.evaluate );
	var actionfield = form.append( {
			type: 'field',
			label: wgULS('操作类型', '操作類別')
		} );
	actionfield.append({
			type: 'checkbox',
			name: 'actiontype',
			event: Twinkle.block.callback.change_action,
			list: [
				{
					label: wgULS('封禁用户', '封禁用戶'),
					value: 'block',
					tooltip: wgULS('用选择的选项封禁相关用户。', '用選擇的選項封禁相關用戶。'),
					checked: true
				},
				{
					label: wgULS('添加封禁模板到用户对话页', '加入封禁模板到用戶對話頁'),
					value: 'template',
					tooltip: wgULS('如果执行封禁的管理员忘记发出保护模板，或你封禁了用户而没有给其发出模板，则你可以用此来发出合适的模板。', '如果執行封禁的管理員忘記發出保護模板，或你封禁了用戶而沒有給其發出模板，則你可以用此來發出合適的模板。'),
					checked: true
				}
			]
		});

	form.append({ type: 'field', label: wgULS('预设', '預設'), name: 'field_preset' });
	form.append({ type: 'field', label: wgULS('模板选项', '模板設定'), name: 'field_template_options' });
	form.append({ type: 'field', label: wgULS('封禁选项', '封禁設定'), name: 'field_block_options' });

	form.append( { type:'submit', label: '提交' } );

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
	var userName = Morebits.wiki.flow.relevantUserName();

	api.get({
		format: 'json',
		action: 'query',
		list: 'blocks|users|logevents',
		letype: 'block',
		lelimit: 1,
		bkusers: userName,
		ususers: userName,
		letitle: 'User:' + userName
	})
	.then(function(data){
		var blockinfo = data.query.blocks[0],
			userinfo = data.query.users[0];

		Twinkle.block.isRegistered = !!userinfo.userid;
		relevantUserName = Twinkle.block.isRegistered ? ('User:' + userName) : userName;

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
		Morebits.status.warn(wgULS('抓取用户信息出错', '擷取用戶資訊出錯'), msg);
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
		field_preset = new Morebits.quickForm.element({ type: 'field', label: wgULS('预设', '預設'), name: 'field_preset' });
		field_preset.append({
				type: 'select',
				name: 'preset',
				label: wgULS('选择预设：', '選擇預設：'),
				event: Twinkle.block.callback.change_preset,
				list: Twinkle.block.callback.filtered_block_groups()
			});

		field_block_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('封禁选项', '封禁設定'), name: 'field_block_options' });
		field_block_options.append({ type: 'div', name: 'hasblocklog', label: ' ' });
		field_block_options.append({ type: 'div', name: 'currentblock', label: ' ' });
		field_block_options.append({
				type: 'select',
				name: 'expiry_preset',
				label: wgULS('过期时间：', '過期時間：'),
				event: Twinkle.block.callback.change_expiry,
				list: [
					{ label: wgULS('自定义', '自訂'), value: 'custom', selected: true },
					{ label: wgULS('无限期', '無限期'), value: 'infinity' },
					{ label: wgULS('3小时', '3小時'), value: '3 hours' },
					{ label: wgULS('12小时', '12小時'), value: '12 hours' },
					{ label: wgULS('24小时', '24小時'), value: '24 hours' },
					{ label: wgULS('31小时', '31小時'), value: '31 hours' },
					{ label: wgULS('36小时', '36小時'), value: '36 hours' },
					{ label: wgULS('48小时', '48小時'), value: '48 hours' },
					{ label: wgULS('60小时', '60小時'), value: '60 hours' },
					{ label: wgULS('72小时', '72小時'), value: '72 hours' },
					{ label: wgULS('1周', '1週'), value: '1 week' },
					{ label: wgULS('2周', '2週'), value: '2 weeks' },
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
					label: wgULS('自定义过期时间', '自訂過期時間'),
					tooltip: wgULS('您可以使用相对时间，如“1 minute”或“19 days”；或绝对时间，“yyyymmddhhmm”（如“200602011405”是2006年2月1日14:05 UTC。）', '您可以使用相對時間，如「1 minute」或「19 days」；或絕對時間，「yyyymmddhhmm」（如「200602011405」是2006年2月1日14:05 UTC。）'),
					value: Twinkle.block.field_block_options.expiry || Twinkle.block.field_template_options.template_expiry
				});
		var blockoptions = [
				{
					checked: Twinkle.block.field_block_options.nocreate,
					label: wgULS('禁止创建帐户', '禁止建立帳戶'),
					name: 'nocreate',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.noemail,
					label: wgULS('电子邮件停用', '電子郵件停用'),
					name: 'noemail',
					value: '1'
				},
				{
					checked: Twinkle.block.field_block_options.disabletalk,
					label: wgULS('不能编辑自己的讨论页', '不能編輯自己的討論頁'),
					name: 'disabletalk',
					value: '1'
				}
			];

		if (Twinkle.block.isRegistered) {
			blockoptions.push({
					checked: Twinkle.block.field_block_options.autoblock,
					label: wgULS('自动封禁', '自動封禁'),
					name: 'autoblock',
					value: '1'
				});
		} else {
			blockoptions.push({
					checked: Twinkle.block.field_block_options.hardblock,
					label: wgULS('阻止登录用户使用该IP地址编辑', '阻止登入用戶使用該IP位址編輯'),
					name: 'hardblock',
					value: '1'
				});
		}

		blockoptions.push({
				checked: Twinkle.block.field_block_options.watchuser,
				label: wgULS('监视该用户的用户页和讨论页', '監視該用戶的用戶頁和討論頁'),
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
				label: wgULS('理由（用于封禁日志）：', '理由（用於封禁日誌）：'),
				name: 'reason',
				value: Twinkle.block.field_block_options.reason
			});
		field_block_options.append({
				type: 'div',
				name: 'filerlog_label',
				label: wgULS('“参见”：', '「參見」：'),
				style: 'display:inline-block;font-style:normal !important',
				tooltip: wgULS('在封禁理由中标清特殊情况以供其他管理员参考', '在封禁理由中標清特殊情況以供其他管理員參考')
			});
		field_block_options.append({
				type: 'checkbox',
				name: 'filter_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block; margin-right:5px',
				list: [
					{
						label: wgULS('过滤器日志', '過濾器日誌'),
						checked: false,
						value: '过滤器日志'
					}
				]
			} );
		field_block_options.append({
				type: 'checkbox',
				name: 'deleted_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block',
				list: [
					{
						label: wgULS('已删除的编辑', '已刪除的編輯'),
						checked: false,
						value: '已删除的编辑'
					}
				]
			} );
		field_block_options.append({
				type: 'checkbox',
				name: 'filter_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block; margin-right:5px',
				list: [
					{
						label: wgULS('用户讨论页', '用戶討論頁'),
						checked: false,
						value: '用户讨论页'
					}
				]
			} );
		field_block_options.append({
				type: 'checkbox',
				name: 'filter_see_also',
				event: Twinkle.block.callback.toggle_see_alsos,
				style: 'display:inline-block; margin-right:5px',
				list: [
					{
						label: wgULS('过去的封禁记录', '過去的封禁記錄'),
						checked: false,
						value: '过去的封禁记录'
					}
				]
			} );

		if (Twinkle.block.currentBlockInfo) {
			field_block_options.append( { type: 'hidden', name: 'reblock', value: '1' } );
		}
	}

	if ($form.find('[name=actiontype][value=template]').is(':checked')) {
		field_template_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('模板选项', '模板設定'), name: 'field_template_options' });
		field_template_options.append( {
				type: 'select',
				name: 'template',
				label: wgULS('选择对话页模板：', '選擇對話頁模板：'),
				event: Twinkle.block.callback.change_template,
				list: Twinkle.block.callback.filtered_block_groups(true),
				value: Twinkle.block.field_template_options.template
			} );
		field_template_options.append( {
				type: 'input',
				name: 'article',
				display: 'none',
				label: wgULS('条目链接', '條目連結'),
				value: '',
				tooltip: wgULS('可以随通知链接条目，比如扰乱的主目标。没有条目需要链接则请留空。', '可以隨通知連結條目，比如擾亂的主目標。沒有條目需要連結則請留空。')
			} );
		if (!$form.find('[name=actiontype][value=block]').is(':checked')) {
			field_template_options.append( {
				type: 'input',
				name: 'template_expiry',
				display: 'none',
				label: '封禁期限：',
				value: '',
				tooltip: wgULS('封禁时长，如24小时、2周、无限期等。', '封禁時長，如24小時、2週、無限期等。')
			} );
		}
		field_template_options.append( {
			type: 'input',
			name: 'block_reason',
			label: wgULS('“由于…您已被封禁”', '「由於…您已被封禁」'),
			display: 'none',
			tooltip: wgULS('可选的理由，用于替换默认理由。只在常规封禁模板中有效。', '可選的理由，用於替換預設理由。只在常規封禁模板中有效。'),
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
						tooltip: wgULS('模板将会显示“一段时间”而不是具体时长', '模板將會顯示「一段時間」而不是具體時長')
					}
				]
			} );
		} else {
			//field_template_options.append( {
			//	type: 'checkbox',
			//	name: 'notalk',
			//	list: [
			//		{
			//			label: wgULS('不能编辑自己的讨论页', '不能編輯自己的討論頁'),
			//			checked: Twinkle.block.field_template_options.notalk,
			//			tooltip: wgULS('用此在保护模板中指明该用户编辑对话页的权限已被移除', '用此在保護模板中指明該用戶編輯對話頁的權限已被移除')
			//		}
			//	]
			//} );
		}

		var $previewlink = $( '<a id="twinkleblock-preivew-link">'+wgULS('预览', '預覽')+'</a>' );
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
		var $blockloglink = $( '<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: Morebits.wiki.flow.relevantUserName(), type: 'block'}) + '">'+wgULS('封禁日志', '封禁日誌')+'</a>)' );

		Morebits.status.init($('div[name="hasblocklog"] span').last()[0]);
		Morebits.status.warn(wgULS('此用户曾在过去被封禁', '此用戶曾在過去被封禁'), $blockloglink[0]);
	}

	if (Twinkle.block.currentBlockInfo) {
		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		Morebits.status.warn(relevantUserName + wgULS('已被封禁', '已被封禁'), wgULS('提交请求来用给定的选项重新封禁', '提交請求來用給定的設定重新封禁'));
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
		nocreate: true,
		reasonParam: true
	},
	'uw-bblock': {
	},
	'uw-block1' : {
		autoblock: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-block2' : {
		autoblock: true,
		expiry: '1 week',
		nocreate: true,
		reasonParam: true
	},
	'uw-block3' : {
		autoblock: true,
		expiry: 'infinity',
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
	},
	'uw-ublock|误导' : {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|误导}}', '{{uw-ublock|誤導}}'),
	},
	'uw-ublock|宣传' : {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|宣传}}', '{{uw-ublock|宣傳}}'),
	},
	'uw-ublock|攻击|或侮辱性' : {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|攻击|或侮辱性}}', '{{uw-ublock|攻擊|或侮辱性}}'),
	},
	'uw-ublock|混淆' : {
		expiry: 'infinity',
		reason: '{{uw-ublock|混淆}}',
	},
	'uw-vblock' : {
		autoblock: true,
		expiry: '31 hours',
		nocreate: true
	},
	'Bot block message' : {
		expiry: 'infinity'
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
			{ label: wgULS('层级1封禁', '層級1封禁'), value: 'uw-block1' },
			{ label: wgULS('层级2封禁', '層級2封禁'), value: 'uw-block2' },
			{ label: wgULS('层级3封禁', '層級3封禁'), value: 'uw-block3' },
			{ label: '匿名封禁', value: 'uw-ablock', forAnonOnly: true }
		]
	},
	{
		label: '一般的封禁理由',
		list: [
			{ label: wgULS('[[WP:VAN|破坏]]', '[[WP:VAN|破壞]]'), value: 'uw-vblock' },
			{ label: wgULS('[[WP:VAN#LANG|繁简破坏]]', '[[WP:VAN#LANG|繁簡破壞]]'), value: 'uw-block1' },
			{ label: wgULS('跨维基项目破坏', '跨維基項目破壞'), value: 'uw-block1', forRegisteredOnly:true },
			{ label: wgULS('[[WP:VOA|纯粹破坏]]', '[[WP:VOA|純粹破壞]]'), value: 'uw-block3' },
			{ label: wgULS('[[WP:SOAP|散发广告或宣传]]', '[[WP:SOAP|散發廣告或宣傳]]'), value: 'uw-sblock' },
			{ label: wgULS('仅[[WP:SOAP|散发广告/宣传]]', '僅[[WP:SOAP|散發廣告/宣傳]]'), value: 'uw-block3', forRegisteredOnly: true },
			{ label: wgULS('违反[[WP:3RR|回退不过三原则]]', '違反[[WP:3RR|回退不過三原則]]'), value: 'uw-3block' },
			{ label: wgULS('无礼的行为、[[WP:NPA|攻击别人]]', '無禮的行為、[[WP:NPA|攻擊別人]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:骚扰|骚扰用户]]', '[[WP:騷擾|騷擾用戶]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:扰乱|扰乱]]', '[[WP:擾亂|擾亂]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:GAME|游戏维基规则]]', '[[WP:GAME|遊戲維基規則]]'), value: 'uw-block1' },
			{ label: wgULS('确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]', '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]'), value: 'uw-block3' },
			{ label: wgULS('滥用[[WP:SOCK|傀儡]]', '濫用[[WP:SOCK|傀儡]]'), value: 'uw-block1', forRegisteredOnly: true },
			{ label: wgULS('屡次增加不实资料', '屢次增加不實資料'), value: 'uw-block1' },
			{ label: wgULS('在条目中增加无意义文字', '在條目中增加無意義文字'), value: 'uw-block1' },
			{ label: wgULS('无故删除条目内容', '無故刪除條目內容'), value: 'uw-dblock' },
			{ label: wgULS('多次加入[[WP:COPYVIO|侵犯版权]]的内容', '多次加入[[WP:COPYVIO|侵犯版權]]的內容'), value: 'uw-block1' },
			{ label: wgULS('机器人发生故障并必须紧急停止', '機器人發生故障並必須緊急停止'), value: 'Bot block message', forRegisteredOnly: true }
			//{ label: wgULS('剥夺编辑对话页权限', '剝奪編輯對話頁權限'), value: '' }
		]
	},
	{
		label: wgULS('用户名封禁', '用戶名封禁'),
		list: [
			{ label: '', value: 'uw-ublock|误导', forRegisteredOnly: true },
			{ label: '', value: 'uw-ublock|宣传', forRegisteredOnly: true },
			{ label: '', value: 'uw-ublock|攻击|或侮辱性', forRegisteredOnly: true },
			{ label: '', value: 'uw-ublock|混淆', forRegisteredOnly: true }
		]
	},
	{
		label: '其他模板',
		list: [
			{ label: '', value: 'uw-ublock', forRegisteredOnly: true },
			//{ label: '', value: 'range block' },
			{ label: '', value: 'schoolblock', forAnonOnly: true },
			{ label: '', value: 'blocked proxy', forAnonOnly: true },
			{ label: '', value: 'checkuserblock', forAnonOnly: true },
			{ label: '', value: 'checkuserblock-account', forRegisteredOnly: true }
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
				var registrationRestrict = blockPreset.forRegisteredOnly ? Twinkle.block.isRegistered : (blockPreset.forAnonOnly ? !Twinkle.block.isRegistered : true);
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

Twinkle.block.seeAlsos = [];
Twinkle.block.callback.toggle_see_alsos = function twinkleblockCallbackToggleSeeAlso(e) {
	var reason = this.form.reason.value.replace(
		new RegExp('( <!--|;) ' + '参见' + Twinkle.block.seeAlsos.join('、') + '( -->)?'), ''
	);

	Twinkle.block.seeAlsos = Twinkle.block.seeAlsos.filter(function(el) {
		return el !== this.value;
	}.bind(this));

	if (this.checked) {
		Twinkle.block.seeAlsos.push(this.value);
	}
	var seeAlsoMessage = Twinkle.block.seeAlsos.join('、');

	if (!Twinkle.block.seeAlsos.length) {
		this.form.reason.value = reason;
	} else if (reason.indexOf('{{') !== -1) {
		this.form.reason.value = reason + ' <!-- 参见' + seeAlsoMessage + ' -->';
	} else {
		this.form.reason.value = reason + '; 参见' + seeAlsoMessage;
	}
};

Twinkle.block.callback.update_form = function twinkleblockCallbackUpdateForm(e, data) {
	var form = e.target.form, expiry = data.expiry;

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
		if (!blockoptions.expiry) return alert(wgULS('请提供过期时间！', '請提供過期時間！'));
		if (!blockoptions.reason) return alert(wgULS('请提供封禁理由！', '請提供封禁理由！'));
		blockoptions.reason += Twinkle.getPref('blockSummaryAd');

		Morebits.simpleWindow.setButtonsEnabled( false );
		Morebits.status.init( e.target );
		var statusElement = new Morebits.status(wgULS('执行封禁', '執行封禁'));
		blockoptions.action = 'block';
		blockoptions.user = Morebits.wiki.flow.relevantUserName();

		// boolean-flipped options
		blockoptions.anononly = blockoptions.hardblock ? undefined : true;
		blockoptions.allowusertalk = blockoptions.disabletalk ? undefined : true;

		// fix for bug with block API, see [[phab:T68646]]
		if (blockoptions.expiry === 'infinity') {
			blockoptions.expiry = 'infinite';
		}

		// execute block
		api.getToken('block').then(function(token) {
			statusElement.status(wgULS('处理中…', '處理中…'));
			blockoptions.token = token;
			var mbApi = new Morebits.wiki.api( wgULS('执行封禁', '執行封禁'), blockoptions, function(data) {
				statusElement.info('完成');
				if (toWarn) Twinkle.block.callback.issue_template(templateoptions);
			});
			mbApi.post();
		}, function() {
			statusElement.error(wgULS('未能抓取封禁令牌', '未能擷取封禁權杖'));
		});
	} else if (toWarn) {
		Morebits.simpleWindow.setButtonsEnabled( false );

		Morebits.status.init( e.target );
		Twinkle.block.callback.issue_template(templateoptions);
	} else {
		return alert(wgULS('请给Twinkle点事做！', '請給Twinkle點事做！'));
	}
};

Twinkle.block.callback.issue_template = function twinkleblockCallbackIssueTemplate(formData) {
	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName();

	var params = $.extend(formData, {
		messageData: Twinkle.block.blockPresetsInfo[formData.template],
		reason: Twinkle.block.field_template_options.block_reason,
		disabletalk: Twinkle.block.field_template_options.notalk
	});
	params.template = params.template.split(':', 1)[0];

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = wgULS('完成，将在几秒后加载用户对话页', '完成，將在幾秒後載入用戶對話頁');

	Morebits.wiki.flow.check(userTalkPage, function () {
		var flowpage = new Morebits.wiki.flow(userTalkPage, wgULS('用户Flow对话页留言', '用戶Flow對話頁留言'));
		flowpage.setCallbackParameters(params);
		Twinkle.block.callback.main_flow(flowpage);
	}, function () {
		var wikipedia_page = new Morebits.wiki.page( userTalkPage, wgULS('用户对话页修改', '用戶對話頁修改') );
		wikipedia_page.setCallbackParameters( params );
		wikipedia_page.setFollowRedirect( true );
		wikipedia_page.load( Twinkle.block.callback.main );
	});

};

Twinkle.block.callback.getBlockNoticeWikitext = function(params, nosign) {
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

	if (settings.sig === '~~~~' && !nosign) {
		text += '}}--~~~~';
	} else if (settings.sig && !nosign) {
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
		Morebits.status.info( '信息', wgULS('根据参数设置清空讨论页并为日期创建新2级标题', '根據偏好設定清空討論頁並為日期創建新2級標題') );
		text = '== ' + date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月 ' + ' ==\n';
	} else if( !dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex ) {
		Morebits.status.info( '信息', wgULS('未找到当月标题，将创建新的', '未找到當月標題，將建立新的') );
		text += '== ' + date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月 ' + ' ==\n';
	}

	params.expiry = typeof params.template_expiry !== "undefined" ? params.template_expiry : params.expiry;

	text += Twinkle.block.callback.getBlockNoticeWikitext(params);

	// build the edit summary
	var templateName = messageData.templateName || messageData.template || messageData.value;
	var summary = '{{' + templateName + '}}: ' + params.reason;
	if ( messageData.suppressArticleInSummary !== true && params.article ) {
		summary += wgULS('，于[[', '，於[[') + params.article + ']]';
	}
	summary += Twinkle.getPref('summaryAd');

	pageobj.setPageText( text );
	pageobj.setEditSummary( summary );
	pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
	pageobj.save();
};

Twinkle.block.callback.main_flow = function twinkleblockcallbackMain( flowobj ) {
	var params = flowobj.getCallbackParameters();

	params.indefinite = (/indef|infinity|never|\*|max/).test( params.expiry );
	params.expiry = typeof params.template_expiry !== "undefined" ? params.template_expiry : params.expiry;

	var title = "封禁通知";
	var content = Twinkle.block.callback.getBlockNoticeWikitext(params, true);

	flowobj.setTopic(title);
	flowobj.setContent(content);
	flowobj.newTopic();
};

})(jQuery);

//</nowiki>
