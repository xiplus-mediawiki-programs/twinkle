// <nowiki>


(function($) {

var api = new mw.Api(), relevantUserName;
var menuFormattedNamespaces = mw.config.get('wgFormattedNamespaces');
menuFormattedNamespaces[0] = wgULS('（条目）', '（條目）');
var blockActionText = {
	'block': wgULS('封禁', '封鎖'),
	'reblock': wgULS('重新封禁', '重新封鎖'),
	'unblock': wgULS('解除封禁', '解除封鎖')
};

/*
 ****************************************
 *** twinkleblock.js: Block module
 ****************************************
 * Mode of invocation:     Tab ("Block")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

Twinkle.block = function twinkleblock() {
	// should show on Contributions or Block pages, anywhere there's a relevant user
	if (Morebits.userIsSysop && Morebits.wiki.flow.relevantUserName(true)) {
		Twinkle.addPortletLink(Twinkle.block.callback, wgULS('封禁', '封鎖'), 'tw-block', wgULS('封禁相关用户', '封鎖相關使用者'));
	}
};

Twinkle.block.callback = function twinkleblockCallback() {
	if (Morebits.wiki.flow.relevantUserName(true) === mw.config.get('wgUserName') &&
			!confirm(wgULS('您即将封禁自己！确认要继续吗？', '您即將封鎖自己！確認要繼續嗎？'))) {
		return;
	}

	Twinkle.block.currentBlockInfo = undefined;
	Twinkle.block.field_block_options = {};
	Twinkle.block.field_template_options = {};

	var Window = new Morebits.simpleWindow(650, 530);
	// need to be verbose about who we're blocking
	Window.setTitle(wgULS('封禁或向', '封鎖或向') + Morebits.wiki.flow.relevantUserName(true) + wgULS('发出封禁模板', '發出封鎖模板'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink('封禁模板', 'Wikipedia:模板消息/用戶討論名字空間#.E5.B0.81.E7.A6.81');
	Window.addFooterLink(wgULS('封禁方针', '封鎖方針'), 'WP:BLOCK');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#block');

	var form = new Morebits.quickForm(Twinkle.block.callback.evaluate);
	var actionfield = form.append({
		type: 'field',
		label: wgULS('操作类型', '操作類別')
	});
	actionfield.append({
		type: 'checkbox',
		name: 'actiontype',
		event: Twinkle.block.callback.change_action,
		list: [
			{
				label: wgULS('封禁用户', '封鎖使用者'),
				value: 'block',
				tooltip: wgULS('用选择的选项全站封禁相关用户，如果未勾选部分封禁则为全站封禁。', '用選擇的選項全站封鎖相關使用者，如果未勾選部分封鎖則為全站封鎖。'),
				checked: true
			},
			{
				label: wgULS('部分封禁', '部分封鎖'),
				value: 'partial',
				tooltip: wgULS('启用部分封禁及部分封禁模板。', '啟用部分封鎖及部分封鎖模板。'),
				checked: Twinkle.getPref('defaultToPartialBlocks')
			},
			{
				label: wgULS('加入封禁模板到用户讨论页', '加入封鎖模板到使用者討論頁'),
				value: 'template',
				tooltip: wgULS('如果执行封禁的管理员忘记发出封禁模板，或你封禁了用户而没有给其发出模板，则你可以用此来发出合适的模板。勾选部分封禁以使用部分封禁模板。', '如果執行封鎖的管理員忘記發出封鎖模板，或你封鎖了使用者而沒有給其發出模板，則你可以用此來發出合適的模板。勾選部分封鎖以使用部分封鎖模板。'),
				checked: true
			},
			{
				label: wgULS('标记用户页', '標記使用者頁面'),
				value: 'tag',
				tooltip: wgULS('将用户页替换成{{indef}}或{{spp}}，仅限永久封禁使用。', '將使用者頁面替換成{{indef}}或{{spp}}，僅限永久封鎖使用。'),
				hidden: true
			},
			{
				label: wgULS('保护用户页', '保護使用者頁面'),
				value: 'protect',
				tooltip: wgULS('全保护用户页，仅限永久封禁使用。', '全保護使用者頁面，僅限永久封鎖使用。'),
				hidden: true
			},
			{
				label: wgULS('解除封禁用户', '解除封鎖使用者'),
				value: 'unblock',
				tooltip: wgULS('解除封禁相关用户。', '解除封鎖相關使用者。')
			}
		]
	});

	form.append({ type: 'field', label: wgULS('默认', '預設'), name: 'field_preset' });
	form.append({ type: 'field', label: wgULS('模板选项', '模板選項'), name: 'field_template_options' });
	form.append({ type: 'field', label: wgULS('封禁选项', '封鎖選項'), name: 'field_block_options' });
	form.append({ type: 'field', label: wgULS('标记用户页', '標記使用者頁面'), name: 'field_tag_options' });
	form.append({ type: 'field', label: wgULS('解除封禁选项', '解除封鎖選項'), name: 'field_unblock_options' });

	form.append({ type: 'submit', label: '提交' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.root = result;

	Twinkle.block.fetchUserInfo(function() {
		if (Twinkle.block.isRegistered) {
			var $form = $(result);
			Morebits.quickForm.setElementVisibility($form.find('[name=actiontype][value=tag]').parent(), true);
			Morebits.quickForm.setElementVisibility($form.find('[name=actiontype][value=protect]').parent(), true);
		}

		// clean up preset data (defaults, etc.), done exactly once, must be before Twinkle.block.callback.change_action is called
		Twinkle.block.transformBlockPresets();

		// init the controls after user and block info have been fetched
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.actiontype[0].dispatchEvent(evt);
	});
};

Twinkle.block.fetchUserInfo = function twinkleblockFetchUserInfo(fn) {
	var userName = Morebits.wiki.flow.relevantUserName(true);

	var query = {
		format: 'json',
		action: 'query',
		list: 'blocks|users|logevents',
		letype: 'block',
		lelimit: 2,
		ususers: userName,
		usprop: 'groupmemberships',
		letitle: 'User:' + userName
	};
	if (Morebits.isIPRange(userName)) {
		query.bkip = userName;
	} else {
		query.bkusers = userName;
	}
	api.get(query)
		.then(function(data) {
			var blockinfo = data.query.blocks[0],
				userinfo = data.query.users[0];

			Twinkle.block.isRegistered = !!userinfo.userid;
			if (Twinkle.block.isRegistered) {
				relevantUserName = 'User:' + userName;
				Twinkle.block.userIsBot = !!userinfo.groupmemberships && userinfo.groupmemberships.map(function(e) {
					return e.group;
				}).indexOf('bot') !== -1;
			} else {
				relevantUserName = userName;
				Twinkle.block.userIsBot = false;
			}

			if (blockinfo) {
			// handle frustrating system of inverted boolean values
				blockinfo.disabletalk = blockinfo.allowusertalk === undefined;
				blockinfo.hardblock = blockinfo.anononly === undefined;
				Twinkle.block.currentBlockInfo = blockinfo;
			}

			Twinkle.block.hasBlockLog = !!data.query.logevents.length;
			// Used later to check if block status changed while filling out the form and display block info in window
			Twinkle.block.blockLogId = Twinkle.block.hasBlockLog ? data.query.logevents[0].logid : false;
			// Only use block or reblock log
			Twinkle.block.recentBlockLog = data.query.logevents.length >= 1 && data.query.logevents[0].action !== 'unblock'
				? data.query.logevents[0]
				: data.query.logevents.length >= 2 ? data.query.logevents[1] : null;

			if (typeof fn === 'function') {
				return fn();
			}
		}, function(msg) {
			Morebits.status.init($('div[name="currentblock"] span').last()[0]);
			Morebits.status.warn(wgULS('抓取用户信息出错', '抓取使用者資訊出錯'), msg);
		});
};

Twinkle.block.callback.saveFieldset = function twinkleblockCallbacksaveFieldset(fieldset) {
	Twinkle.block[$(fieldset).prop('name')] = {};
	$(fieldset).serializeArray().forEach(function(el) {
		// namespaces and pages for partial blocks are overwritten
		// here, but we're handling them elsewhere so that's fine
		Twinkle.block[$(fieldset).prop('name')][el.name] = el.value;
	});
};

Twinkle.block.callback.change_action = function twinkleblockCallbackChangeAction(e) {
	var field_preset, field_template_options, field_block_options, field_tag_options, field_unblock_options, $form = $(e.target.form);
	// Make ifs shorter
	var block = $form.find('[name=actiontype][value=block]');
	var blockBox = block.is(':checked');
	var template = $form.find('[name=actiontype][value=template]');
	var templateBox = template.is(':checked');
	var tag = $form.find('[name=actiontype][value=tag]');
	var protect = $form.find('[name=actiontype][value=protect]');
	var partial = $form.find('[name=actiontype][value=partial]');
	var partialBox = partial.is(':checked');
	var unblock = $form.find('[name=actiontype][value=unblock]');
	var blockGroup = partialBox ? Twinkle.block.blockGroupsPartial : Twinkle.block.blockGroups;

	if (e.target.value === 'unblock') {
		if (!Twinkle.block.currentBlockInfo) {
			unblock.prop('checked', false);
			return alert(wgULS('用户没有被封禁', '使用者沒有被封鎖'));
		}
		block.prop('checked', false);
		blockBox = false;
		template.prop('checked', false);
		templateBox = false;
		tag.prop('checked', false);
		protect.prop('checked', false);
		partial.prop('checked', false);
	} else {
		unblock.prop('checked', false);
	}
	partial.prop('disabled', !blockBox && !templateBox);

	Twinkle.block.callback.saveFieldset($('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_template_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_tag_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_unblock_options]'));

	if (blockBox) {
		field_preset = new Morebits.quickForm.element({ type: 'field', label: wgULS('默认', '預設'), name: 'field_preset' });
		field_preset.append({
			type: 'select',
			name: 'preset',
			label: wgULS('选择默认：', '選擇預設：'),
			event: Twinkle.block.callback.change_preset,
			list: Twinkle.block.callback.filtered_block_groups(blockGroup)
		});

		field_block_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('封禁选项', '封鎖選項'), name: 'field_block_options' });
		field_block_options.append({ type: 'div', name: 'currentblock', label: ' ' });
		field_block_options.append({ type: 'div', name: 'hasblocklog', label: ' ' });
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

		if (partialBox) { // Partial block
			field_block_options.append({
				type: 'select',
				multiple: true,
				name: 'pagerestrictions',
				label: wgULS('页面封禁', '頁面封鎖'),
				value: '',
				tooltip: wgULS('最多10页面。', '最多10頁面。')
			});
			var ns = field_block_options.append({
				type: 'select',
				multiple: true,
				name: 'namespacerestrictions',
				label: wgULS('名字空间封禁', '命名空間封鎖'),
				value: '',
				tooltip: wgULS('指定封禁的名字空间。', '指定封鎖的命名空間。')
			});
			$.each(menuFormattedNamespaces, function(number, name) {
				// Ignore -1: Special; -2: Media; and 2300-2303: Gadget (talk) and Gadget definition (talk)
				if (number >= 0 && number < 830) {
					ns.append({ type: 'option', label: name, value: number });
				}
			});
		}

		var blockoptions = [
			{
				checked: Twinkle.block.field_block_options.nocreate,
				label: wgULS('禁止创建账户', '禁止建立帳號'),
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
				value: '1',
				tooltip: partialBox ? wgULS('如果使用部分封禁，不应选择此项，除非您也想要禁止编辑用户讨论页。', '如果使用部分封鎖，不應選擇此項，除非您也想要禁止編輯使用者討論頁。') : ''
			}
		];

		if (Twinkle.block.isRegistered) {
			blockoptions.push({
				checked: Twinkle.block.field_block_options.autoblock,
				label: wgULS('自动封禁', '自動封鎖'),
				name: 'autoblock',
				value: '1'
			});
		} else {
			blockoptions.push({
				checked: Twinkle.block.field_block_options.hardblock,
				label: wgULS('阻止登录用户使用该IP地址编辑', '阻止登入使用者使用該IP位址編輯'),
				name: 'hardblock',
				value: '1'
			});
		}

		blockoptions.push({
			checked: Twinkle.block.field_block_options.watchuser,
			label: wgULS('监视该用户的用户页和讨论页', '監視該使用者的使用者頁面和討論頁'),
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
			label: wgULS('理由（用于封禁日志）：', '理由（用於封鎖日誌）：'),
			name: 'reason',
			value: Twinkle.block.field_block_options.reason
		});
		field_block_options.append({
			type: 'div',
			name: 'filerlog_label',
			label: wgULS('“参见”：', '「參見」：'),
			style: 'display:inline-block;font-style:normal !important',
			tooltip: wgULS('在封禁理由中标清特殊情况以供其他管理员参考', '在封鎖理由中標清特殊情況以供其他管理員參考')
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
					value: wgULS('过滤器日志', '過濾器日誌')
				}
			]
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'deleted_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block',
			list: [
				{
					label: wgULS('已删除的编辑', '已刪除的編輯'),
					checked: false,
					value: wgULS('已删除的编辑', '已刪除的編輯')
				}
			]
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'filter_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block; margin-right:5px',
			list: [
				{
					label: wgULS('用户讨论页', '使用者討論頁'),
					checked: false,
					value: wgULS('用户讨论页', '使用者討論頁')
				}
			]
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'filter_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block; margin-right:5px',
			list: [
				{
					label: wgULS('过去的封禁记录', '過去的封鎖記錄'),
					checked: false,
					value: wgULS('过去的封禁记录', '過去的封鎖記錄')
				}
			]
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'filter_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block; margin-right:5px',
			list: [
				{
					label: wgULS('跨维基贡献', '跨維基貢獻'),
					checked: false,
					value: wgULS('跨维基贡献', '跨維基貢獻')
				}
			]
		});

		if (Twinkle.block.currentBlockInfo) {
			field_block_options.append({ type: 'hidden', name: 'reblock', value: '1' });
		}
	}

	if (templateBox) {
		field_template_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('模板选项', '模板選項'), name: 'field_template_options' });
		field_template_options.append({
			type: 'select',
			name: 'template',
			label: wgULS('选择讨论页模板：', '選擇討論頁模板：'),
			event: Twinkle.block.callback.change_template,
			list: Twinkle.block.callback.filtered_block_groups(blockGroup, true),
			value: Twinkle.block.field_template_options.template
		});
		field_template_options.append({
			type: 'input',
			name: 'article',
			display: 'none',
			label: wgULS('条目链接', '條目連結'),
			value: '',
			tooltip: wgULS('可以随通知链接条目，比如扰乱的主目标。没有条目需要链接则请留空。', '可以隨通知連結條目，比如擾亂的主目標。沒有條目需要連結則請留空。')
		});

		// Only visible if partial and not blocking
		field_template_options.append({
			type: 'input',
			name: 'area',
			display: 'none',
			label: wgULS('封禁区域', '封鎖區域'),
			value: '',
			tooltip: wgULS('阻止用户编辑的页面或名字空间的可选说明。', '阻止使用者編輯的頁面或命名空間的可選說明。')
		});

		if (!blockBox) {
			field_template_options.append({
				type: 'input',
				name: 'template_expiry',
				display: 'none',
				label: '封禁期限：',
				value: '',
				tooltip: wgULS('封禁时长，如24小时、2周、无限期等。', '封鎖時長，如24小時、2週、無限期等。')
			});
		}
		field_template_options.append({
			type: 'input',
			name: 'block_reason',
			label: wgULS('“由于…您已被封禁”', '「由於…您已被封鎖」'),
			display: 'none',
			tooltip: wgULS('可选的理由，用于替换默认理由。只在常规封禁模板中有效。', '可選的理由，用於替換預設理由。只在常規封鎖模板中有效。'),
			value: Twinkle.block.field_template_options.block_reason
		});

		if (blockBox) {
			field_template_options.append({
				type: 'checkbox',
				name: 'blank_duration',
				list: [
					{
						label: '不在模板中包含封禁期限',
						checked: Twinkle.block.field_template_options.blank_duration,
						tooltip: wgULS('模板将会显示“一段时间”而不是具体时长', '模板將會顯示「一段時間」而不是具體時長')
					}
				]
			});
		} else {
			field_template_options.append({
				type: 'checkbox',
				list: [
					{
						label: wgULS('不能编辑自己的讨论页', '不能編輯自己的討論頁'),
						name: 'notalk',
						checked: Twinkle.block.field_template_options.notalk,
						tooltip: wgULS('用此在保护模板中指明该用户编辑讨论页的权限已被移除', '用此在保護模板中指明該使用者編輯討論頁的權限已被移除')
					}/* ,
					{
						label: wgULS('不能发送电子邮件', '不能傳送電子郵件'),
						name: 'noemail_template',
						checked: Twinkle.block.field_template_options.noemail_template,
						tooltip: wgULS('用此在保护模板中指明该用户发送电子邮件的权限已被移除', '用此在保護模板中指明該使用者傳送電子郵件的權限已被移除')
					},
					{
						label: wgULS('不能创建账户', '不能建立帳號'),
						name: 'nocreate_template',
						checked: Twinkle.block.field_template_options.nocreate_template,
						tooltip: wgULS('用此在保护模板中指明该用户创建账户的权限已被移除', '用此在保護模板中指明該使用者建立帳號的權限已被移除')
					} */
				]
			});
		}

		var $previewlink = $('<a id="twinkleblock-preivew-link">' + wgULS('预览', '預覽') + '</a>');
		$previewlink.off('click').on('click', function() {
			Twinkle.block.callback.preview($form[0]);
		});
		$previewlink.css({cursor: 'pointer'});
		field_template_options.append({ type: 'div', id: 'blockpreview', label: [ $previewlink[0] ] });
		field_template_options.append({ type: 'div', id: 'twinkleblock-previewbox', style: 'display: none' });
	}

	if ($form.find('[name=actiontype][value=tag]').is(':checked')) {
		field_tag_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('标记用户页', '標記使用者頁面'), name: 'field_tag_options' });

		field_tag_options.append({
			type: 'select',
			name: 'tag',
			label: wgULS('选择用户页模板：', '選擇使用者頁面模板：'),
			event: Twinkle.block.callback.change_tag,
			list: [
				{ label: '{{Indef}}：一般永久封禁', value: 'indef' },
				{ label: '{{Spp}}：傀儡帳號', value: 'spp' },
				{ label: '{{Sockpuppeteer|blocked}}：傀儡主帳號', value: 'spm' }
			]
		});

		field_tag_options.append({
			type: 'input',
			name: 'username',
			label: wgULS('主账户用户名：', '主帳號使用者名稱：'),
			display: 'none'
		});

	}

	if ($form.find('[name=actiontype][value=unblock]').is(':checked')) {
		field_unblock_options = new Morebits.quickForm.element({ type: 'field', label: wgULS('解除封禁选项', '解除封鎖選項'), name: 'field_unblock_options' });

		field_unblock_options.append({
			type: 'textarea',
			label: wgULS('理由（用于封禁日志）：', '理由（用於封鎖日誌）：'),
			name: 'reason',
			value: Twinkle.block.field_unblock_options.reason
		});
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


		$form.find('[name=pagerestrictions]').select2({
			width: '100%',
			placeholder: wgULS('输入要阻止用户编辑的页面', '輸入要阻止使用者編輯的頁面'),
			language: {
				errorLoading: function() {
					return wgULS('搜索词汇不完整或无效', '搜尋詞彙不完整或無效');
				}
			},
			maximumSelectionLength: 10, // Software limitation [[phab:T202776]]
			minimumInputLength: 1, // prevent ajax call when empty
			ajax: {
				url: mw.util.wikiScript('api'),
				dataType: 'json',
				delay: 100,
				data: function(params) {
					var title = mw.Title.newFromText(params.term);
					if (!title) {
						return;
					}
					return {
						'action': 'query',
						'format': 'json',
						'list': 'allpages',
						'apfrom': title.title,
						'apnamespace': title.namespace,
						'aplimit': '10'
					};
				},
				processResults: function(data) {
					return {
						results: data.query.allpages.map(function(page) {
							var title = mw.Title.newFromText(page.title, page.ns).toText();
							return {
								id: title,
								text: title
							};
						})
					};
				}
			},
			templateSelection: function(choice) {
				return $('<a>').text(choice.text).attr({
					href: mw.util.getUrl(choice.text),
					target: '_blank'
				});
			}
		});


		$form.find('[name=namespacerestrictions]').select2({
			width: '100%',
			matcher: Morebits.select2.matchers.wordBeginning,
			language: {
				searching: Morebits.select2.queryInterceptor
			},
			templateResult: Morebits.select2.highlightSearchMatches,
			placeholder: wgULS('选择要阻止用户编辑的名字空间', '選擇要阻止使用者編輯的命名空間')
		});

		mw.util.addCSS(
			// Reduce padding
			'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
			// Adjust font size
			'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
			'.select2-container .selection .select2-selection__rendered { font-size: 13px; }' +
			// Remove black border
			'.select2-container--default.select2-container--focus .select2-selection--multiple { border: 1px solid #aaa; }' +
			// Make the tiny cross larger
			'.select2-selection__choice__remove { font-size: 130%; }'
		);
	} else {
		$form.find('fieldset[name="field_block_options"]').hide();
		// Clear select2 options
		$form.find('[name=pagerestrictions]').val(null).trigger('change');
		$form.find('[name=namespacerestrictions]').val(null).trigger('change');
	}
	if (field_tag_options) {
		oldfield = $form.find('fieldset[name="field_tag_options"]')[0];
		oldfield.parentNode.replaceChild(field_tag_options.render(), oldfield);
	} else {
		$form.find('fieldset[name="field_tag_options"]').hide();
	}
	if (field_unblock_options) {
		oldfield = $form.find('fieldset[name="field_unblock_options"]')[0];
		oldfield.parentNode.replaceChild(field_unblock_options.render(), oldfield);
	} else {
		$form.find('fieldset[name="field_unblock_options"]').hide();
	}
	if (field_template_options) {
		oldfield = $form.find('fieldset[name="field_template_options"]')[0];
		oldfield.parentNode.replaceChild(field_template_options.render(), oldfield);
		e.target.form.root.previewer = new Morebits.wiki.preview($(e.target.form.root).find('#twinkleblock-previewbox').last()[0]);
	} else {
		$form.find('fieldset[name="field_template_options"]').hide();
	}

	if (Twinkle.block.hasBlockLog) {
		var $blockloglink = $('<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: Morebits.wiki.flow.relevantUserName(true), type: 'block'}) + '">' + wgULS('封禁日志', '封鎖日誌') + '</a>)');

		Morebits.status.init($('div[name="hasblocklog"] span').last()[0]);
		Morebits.status.warn(
			Twinkle.block.currentBlockInfo
				? wgULS('封禁详情', '封鎖詳情')
				: [
					wgULS('此用户曾在', '此使用者曾在'),
					$('<b>' + new Morebits.date(Twinkle.block.recentBlockLog.timestamp).calendar('utc') + '</b>')[0],
					'被' + Twinkle.block.recentBlockLog.user + wgULS('封禁', '封鎖'),
					$('<b>' + Morebits.string.formatTime(Twinkle.block.recentBlockLog.params.duration) + '</b>')[0]
				],
			$blockloglink[0]
		);
	}

	if (Twinkle.block.currentBlockInfo) {
		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		// list=blocks without bkprops (as we do in fetchUerInfo)
		// returns partial: '' if the user is partially blocked
		var statusStr = relevantUserName + (Twinkle.block.currentBlockInfo.partial === '' ? wgULS('已被部分封禁', '已被部分封鎖') : wgULS('已被全站封禁', '已被全站封鎖'));
		if (Twinkle.block.currentBlockInfo.expiry === 'infinity') {
			statusStr += '（' + wgULS('无限期', '無限期') + '）';
		} else if (new Morebits.date(Twinkle.block.currentBlockInfo.expiry).isValid()) {
			statusStr += '（' + wgULS('终止于', '終止於') + new Morebits.date(Twinkle.block.currentBlockInfo.expiry).calendar('utc') + '）';
		}
		var infoStr = wgULS('提交请求以变更封禁', '提交請求以變更封鎖');
		if (Twinkle.block.currentBlockInfo.partial === undefined && partialBox) {
			infoStr += wgULS('为部分封禁', '為部分封鎖');
		} else if (Twinkle.block.currentBlockInfo.partial === '' && !partialBox) {
			infoStr += wgULS('为全站封禁', '為全站封鎖');
		}
		Morebits.status.warn(statusStr, infoStr);
		Twinkle.block.callback.update_form(e, Twinkle.block.currentBlockInfo);
	}
	if (templateBox) {
		// make sure all the fields are correct based on defaults
		if (blockBox) {
			Twinkle.block.callback.change_preset(e);
		} else {
			Twinkle.block.callback.change_template(e);
		}
	}
	if ($form.find('[name=actiontype][value=tag]').is(':checked')) {
		Twinkle.block.callback.change_tag(e);
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
	'anonblock': {
		expiry: '72 hours',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{anonblock}}',
		summary: wgULS('匿名编辑封禁', '匿名編輯封鎖'),
		sig: '~~~~'
	},
	'blocked proxy': {
		expiry: '2 years',
		nocreate: true,
		hardblock: true,
		nonstandard: true,
		reason: '{{blocked proxy}}',
		summary: wgULS('开放代理封禁', '開放代理封鎖'),
		sig: '~~~~'
	},
	'checkuserblock': {
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		hardblock: true,
		nonstandard: true,
		reason: '{{checkuserblock}}',
		summary: wgULS('用户查核IP封禁', '使用者查核IP封鎖'),
		sig: '~~~~'
	},
	'checkuserblock-account': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{checkuserblock-account}}',
		summary: wgULS('用户查核账户封禁', '使用者查核帳號封鎖'),
		sig: '~~~~'
	},
	'range block': {
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{range block}}',
		summary: wgULS('广域封禁', '廣域封鎖'),
		sig: '~~~~'
	},
	'school block': {
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{School block}}',
		summary: wgULS('公用IP封禁', '公共IP封鎖'),
		sig: '~~~~'
	},
	// uw-prefixed
	'uw-3block': {
		autoblock: true,
		expiry: '24 hours',
		nocreate: true
	},
	'uw-ablock': {
		autoblock: true,
		expiry: '24 hours',
		forAnonOnly: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-bblock': {
	},
	'uw-block1': {
		autoblock: true,
		nocreate: true,
		reasonParam: true
	},
	'uw-block2': {
		autoblock: true,
		expiry: '1 week',
		nocreate: true,
		reasonParam: true
	},
	'uw-block3': {
		autoblock: true,
		expiry: 'infinity',
		nocreate: true,
		reasonParam: true
	},
	'uw-dblock': {
		autoblock: true,
		nocreate: true
	},
	'uw-sblock': {
		autoblock: true,
		nocreate: true
	},
	'uw-ublock': {
		expiry: 'infinity',
		summary: wgULS('不当用户名', '不當使用者名稱')
	},
	'uw-ublock|误导': {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|误导}}', '{{uw-ublock|誤導}}'),
		summary: wgULS('误导性用户名', '誤導性使用者名稱')
	},
	'uw-ublock|宣传': {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|宣传}}', '{{uw-ublock|宣傳}}'),
		summary: wgULS('宣传性用户名', '宣傳性使用者名稱')
	},
	'uw-ublock|攻击|或侮辱性': {
		expiry: 'infinity',
		reason: wgULS('{{uw-ublock|攻击|或侮辱性}}', '{{uw-ublock|攻擊|或侮辱性}}'),
		summary: wgULS('攻击或侮辱性用户名', '攻擊或侮辱性使用者名稱')
	},
	'uw-ublock|混淆': {
		expiry: 'infinity',
		reason: '{{uw-ublock|混淆}}',
		summary: wgULS('令人混淆的用户名', '令人混淆的使用者名稱')
	},
	'uw-vblock': {
		autoblock: true,
		expiry: '24 hours',
		nocreate: true
	},
	'Bot block message': {
		expiry: 'infinity',
		sig: '~~~~'
	},
	'uw-pblock': {
		autoblock: true,
		expiry: '24 hours',
		nocreate: false,
		pageParam: false,
		reasonParam: true,
		summary: '您已被禁止編輯維基百科的部分區域'
	}
};

Twinkle.block.blockGroupsUpdated = false;
Twinkle.block.transformBlockPresets = function twinkleblockTransformBlockPresets() {
	// supply sensible defaults
	$.each(Twinkle.block.blockPresetsInfo, function(preset, settings) {
		settings.summary = settings.summary || settings.reason;
		settings.sig = settings.sig !== undefined ? settings.sig : 'yes';
		settings.indefinite = settings.indefinite || Morebits.string.isInfinity(settings.expiry);

		if (!Twinkle.block.isRegistered && settings.indefinite) {
			settings.expiry = '24 hours';
		} else {
			settings.expiry = settings.expiry || '24 hours';
		}

		Twinkle.block.blockPresetsInfo[preset] = settings;
	});
	if (!Twinkle.block.blockGroupsUpdated) {
		$.each(Twinkle.block.blockGroups.concat(Twinkle.block.blockGroupsPartial), function(_, blockGroup) {
			if (blockGroup.custom) {
				blockGroup.list = Twinkle.getPref('customBlockReasonList');
			}
			$.each(blockGroup.list, function(_, blockPreset) {
				var value = blockPreset.value, reason = blockPreset.label, newPreset = value + ':' + reason;
				Twinkle.block.blockPresetsInfo[newPreset] = jQuery.extend(true, {}, Twinkle.block.blockPresetsInfo[value]);
				Twinkle.block.blockPresetsInfo[newPreset].template = value;
				if (blockGroup.meta) {
					// Twinkle.block.blockPresetsInfo[newPreset].forAnonOnly = false;
					Twinkle.block.blockPresetsInfo[newPreset].forRegisteredOnly = false;
				} else if (reason) {
					Twinkle.block.blockPresetsInfo[newPreset].reason = reason;
				}
				if (blockGroup.custom && Twinkle.block.blockPresetsInfo[blockPreset.value] === undefined) {
					Twinkle.block.blockPresetsInfo[newPreset].reasonParam = true;
					Twinkle.block.blockPresetsInfo[blockPreset.value] = Twinkle.block.blockPresetsInfo[newPreset];
				}
				if (blockGroup.custom && Twinkle.block.blockPresetsInfo[blockPreset.value].expiry === undefined) {
					Twinkle.block.blockPresetsInfo[blockPreset.value].expiry = '24 hours';
				}
				blockPreset.value = newPreset;
			});
		});
		Twinkle.block.blockGroupsUpdated = true;
	}
};

// These are the groups of presets and defines the order in which they appear. For each list item:
//   label: <string, the description that will be visible in the dropdown>
//   value: <string, the key of a preset in blockPresetsInfo>
Twinkle.block.blockGroups = [
	{
		meta: true,
		label: '封禁模板',
		list: [
			{ label: wgULS('层级1封禁', '層級1封鎖'), value: 'uw-block1' },
			{ label: wgULS('层级2封禁', '層級2封鎖'), value: 'uw-block2' },
			{ label: wgULS('层级3封禁', '層級3封鎖'), value: 'uw-block3' },
			{ label: '匿名封禁', value: 'uw-ablock', forAnonOnly: true }
		]
	},
	{
		label: '一般的封禁理由',
		list: [
			{ label: wgULS('[[WP:VAN|破坏]]', '[[WP:VAN|破壞]]'), value: 'uw-vblock' },
			{ label: wgULS('[[WP:VAN#LANG|繁简破坏]]', '[[WP:VAN#LANG|繁簡破壞]]'), value: 'uw-block1' },
			{ label: wgULS('跨维基项目破坏', '跨維基項目破壞'), value: 'uw-block1', forRegisteredOnly: true },
			{ label: wgULS('[[WP:VOA|纯粹破坏]]', '[[WP:VOA|純粹破壞]]'), value: 'uw-block3', forRegisteredOnly: true },
			{ label: wgULS('不断加入[[Wikipedia:垃圾内容|垃圾链接]]', '不斷加入[[Wikipedia:垃圾內容|垃圾連結]]'), value: 'uw-sblock' },
			{ label: wgULS('[[WP:SOAP|散发广告/宣传]]', '[[WP:SOAP|散發廣告/宣傳]]'), value: 'uw-block1' },
			{ label: wgULS('仅[[WP:SOAP|散发广告/宣传]]', '僅[[WP:SOAP|散發廣告/宣傳]]'), value: 'uw-block3', forRegisteredOnly: true },
			{ label: wgULS('违反[[WP:3RR|回退不过三原则]]', '違反[[WP:3RR|回退不過三原則]]'), value: 'uw-3block' },
			{ label: wgULS('无礼的行为、[[WP:NPA|攻击别人]]', '無禮的行為、[[WP:NPA|攻擊別人]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:骚扰|骚扰用户]]', '[[WP:騷擾|騷擾使用者]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:扰乱|扰乱]]', '[[WP:擾亂|擾亂]]'), value: 'uw-block1' },
			{ label: wgULS('[[WP:GAME|游戏维基规则]]', '[[WP:GAME|遊戲維基規則]]'), value: 'uw-block1' },
			{ label: wgULS('确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根据用户贡献确定', '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根據使用者貢獻確定'), value: 'uw-block1', forAnonOnly: true },
			{ label: wgULS('确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 用户查核确认', '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 使用者查核確認'), value: 'uw-block1', forAnonOnly: true },
			{ label: wgULS('确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根据用户贡献确定', '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根據使用者貢獻確定'), value: 'uw-block3', forRegisteredOnly: true },
			{ label: wgULS('确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 用户查核确认', '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 使用者查核確認'), value: 'uw-block3', forRegisteredOnly: true },
			{ label: wgULS('滥用[[WP:SOCK|傀儡]]', '濫用[[WP:SOCK|傀儡]]'), value: 'uw-block1', forRegisteredOnly: true },
			{ label: wgULS('屡次增加不实资料', '屢次增加不實資料'), value: 'uw-block1' },
			{ label: wgULS('在条目中增加无意义文字', '在條目中增加無意義文字'), value: 'uw-block1' },
			{ label: wgULS('无故删除条目内容', '無故刪除條目內容'), value: 'uw-dblock' },
			{ label: wgULS('多次加入[[WP:COPYVIO|侵犯著作权]]的内容', '多次加入[[WP:COPYVIO|侵犯著作權]]的內容'), value: 'uw-block1' },
			{ label: wgULS('机器人发生故障并必须紧急停止', '機器人發生故障並必須緊急停止'), value: 'Bot block message', forRegisteredOnly: true }
			// { label: wgULS('剥夺编辑讨论页权限', '剝奪編輯討論頁權限'), value: '' }
		]
	},
	{
		custom: true,
		label: wgULS('自定义的封禁理由', '自訂的封鎖理由')
	},
	{
		label: wgULS('用户名封禁', '使用者名稱封鎖'),
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
			{ label: '', value: 'anonblock', forAnonOnly: true },
			{ label: '', value: 'range block', forAnonOnly: true },
			{ label: '', value: 'school block', forAnonOnly: true },
			{ label: '', value: 'blocked proxy', forAnonOnly: true },
			{ label: '', value: 'checkuserblock', forAnonOnly: true },
			{ label: '', value: 'checkuserblock-account', forRegisteredOnly: true }
		]
	}
];

Twinkle.block.blockGroupsPartial = [
	{
		label: wgULS('部分封禁原因', '部分封鎖原因'),
		list: [
			{ label: wgULS('部分封禁', '部分封鎖'), value: 'uw-pblock', selected: true }
		]
	}
];


Twinkle.block.callback.filtered_block_groups = function twinkleblockCallbackFilteredBlockGroups(group, show_template) {
	return $.map(group, function(blockGroup) {
		if (!show_template && blockGroup.meta) {
			return;
		}

		var list = $.map(blockGroup.list, function(blockPreset) {
			// only show uw-talkrevoked if reblocking
			if (!Twinkle.block.currentBlockInfo && blockPreset.value === 'uw-talkrevoked') {
				return;
			}

			var blockSettings = Twinkle.block.blockPresetsInfo[blockPreset.value];
			var registrationRestrict = blockPreset.forRegisteredOnly ? Twinkle.block.isRegistered : blockPreset.forAnonOnly ? !Twinkle.block.isRegistered : true;
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
		if (list.length) {
			return {
				label: blockGroup.label,
				list: list
			};
		}
	});
};

Twinkle.block.callback.change_preset = function twinkleblockCallbackChangePreset(e) {
	var key = e.target.form.preset.value;
	if (!key) {
		return;
	}

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
Twinkle.block.callback.toggle_see_alsos = function twinkleblockCallbackToggleSeeAlso() {
	var reason = this.form.reason.value.replace(
		new RegExp('(<!-- )(参见|參見)' + Twinkle.block.seeAlsos.join('、') + '( -->)?'), ''
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
	} else {
		this.form.reason.value = reason + '<!-- ' + wgULS('参见', '參見') + seeAlsoMessage + ' -->';
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
	if (Twinkle.block.userIsBot || relevantUserName.search(/bot\b/i) > 0) {
		data.autoblock = false;
	}

	$(form).find('[name=field_block_options]').find(':checkbox').each(function(i, el) {
		// don't override original options if useInitialOptions is set
		if (data.useInitialOptions && data[el.name] === undefined) {
			return;
		}

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

	var blockBox = $(form).find('[name=actiontype][value=block]').is(':checked');
	var partialBox = $(form).find('[name=actiontype][value=partial]').is(':checked');
	var templateBox = $(form).find('[name=actiontype][value=template]').is(':checked');

	// Block form is not present
	if (!blockBox) {
		if (settings.indefinite || settings.nonstandard) {
			if (Twinkle.block.prev_template_expiry === null) {
				Twinkle.block.prev_template_expiry = form.template_expiry.value || '';
			}
			form.template_expiry.parentNode.style.display = 'none';
			form.template_expiry.value = 'infinity';
		} else if (form.template_expiry.parentNode.style.display === 'none') {
			if (Twinkle.block.prev_template_expiry !== null) {
				form.template_expiry.value = Twinkle.block.prev_template_expiry;
				Twinkle.block.prev_template_expiry = null;
			}
			form.template_expiry.parentNode.style.display = 'block';
		}
		if (Twinkle.block.prev_template_expiry) {
			form.expiry.value = Twinkle.block.prev_template_expiry;
		}
		Morebits.quickForm.setElementVisibility(form.notalk.parentNode, !settings.nonstandard);
		// Partial
		// Morebits.quickForm.setElementVisibility(form.noemail_template.parentNode, partialBox);
		// Morebits.quickForm.setElementVisibility(form.nocreate_template.parentNode, partialBox);
	} else if (templateBox) { // Only present if block && template forms both visible
		Morebits.quickForm.setElementVisibility(
			form.blank_duration.parentNode,
			!settings.indefinite && !settings.nonstandard
		);
	}

	// Only particularly relevant if template form is present
	Morebits.quickForm.setElementVisibility(form.article.parentNode, settings && !!settings.pageParam);
	Morebits.quickForm.setElementVisibility(form.block_reason.parentNode, settings && !!settings.reasonParam);
	form.block_reason.value = settings.reason || '';

	// Partial block
	Morebits.quickForm.setElementVisibility(form.area.parentNode, partialBox && !blockBox);

	form.root.previewer.closePreview();
};
Twinkle.block.prev_template_expiry = null;
Twinkle.block.prev_block_reason = null;
Twinkle.block.prev_article = null;
Twinkle.block.prev_reason = null;

Twinkle.block.callback.change_tag = function twinkleblockcallbackChangeTag(e) {
	var form = e.target.form, value = form.tag.value;

	if (value === 'spp') {
		form.username.parentNode.style.display = 'block';
	} else {
		form.username.parentNode.style.display = 'none';
	}
};

Twinkle.block.callback.preview = function twinkleblockcallbackPreview(form) {
	var params = {
		article: form.article.value,
		blank_duration: form.blank_duration ? form.blank_duration.checked : false,
		disabletalk: form.disabletalk.checked || (form.notalk ? form.notalk.checked : false),
		expiry: form.template_expiry ? form.template_expiry.value : form.expiry.value,
		hardblock: Twinkle.block.isRegistered ? form.autoblock.checked : form.hardblock.checked,
		indefinite: Morebits.string.isInfinity(form.template_expiry ? form.template_expiry.value : form.expiry.value),
		reason: form.block_reason.value,
		template: form.template.value.split(':', 1)[0],
		partial: $(form).find('[name=actiontype][value=partial]').is(':checked'),
		pagerestrictions: $(form.pagerestrictions).val() || [],
		namespacerestrictions: $(form.namespacerestrictions).val() || [],
		// noemail: form.noemail.checked || (form.noemail_template ? form.noemail_template.checked : false),
		// nocreate: form.nocreate.checked || (form.nocreate_template ? form.nocreate_template.checked : false),
		area: form.area.value
	};

	var templateText = Twinkle.block.callback.getBlockNoticeWikitext(params);

	form.previewer.beginRender(templateText);
};

Twinkle.block.callback.evaluate = function twinkleblockCallbackEvaluate(e) {
	var $form = $(e.target),
		toBlock = $form.find('[name=actiontype][value=block]').is(':checked'),
		toWarn = $form.find('[name=actiontype][value=template]').is(':checked'),
		toPartial = $form.find('[name=actiontype][value=partial]').is(':checked'),
		toTag = $form.find('[name=actiontype][value=tag]').is(':checked'),
		toProtect = $form.find('[name=actiontype][value=protect]').is(':checked'),
		toUnblock = $form.find('[name=actiontype][value=unblock]').is(':checked'),
		blockoptions = {}, templateoptions = {}, unblockoptions = {}, tagprotectoptions = {};

	Twinkle.block.callback.saveFieldset($form.find('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_template_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_tag_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_unblock_options]'));

	blockoptions = Twinkle.block.field_block_options;
	unblockoptions = Twinkle.block.field_unblock_options;
	tagprotectoptions = Twinkle.block.field_tag_options;

	templateoptions = Twinkle.block.field_template_options;
	templateoptions.disabletalk = !!(templateoptions.disabletalk || blockoptions.disabletalk);
	templateoptions.hardblock = !!blockoptions.hardblock;

	tagprotectoptions.istag = toTag;
	tagprotectoptions.isprotect = toProtect;

	// remove extraneous
	delete blockoptions.expiry_preset;

	// Partial API requires this to be gone, not false or 0
	if (toPartial) {
		blockoptions.partial = templateoptions.partial = true;
	}
	templateoptions.pagerestrictions = $form.find('[name=pagerestrictions]').val() || [];
	templateoptions.namespacerestrictions = $form.find('[name=namespacerestrictions]').val() || [];
	// Format for API here rather than in saveFieldset
	blockoptions.pagerestrictions = templateoptions.pagerestrictions.join('|');
	blockoptions.namespacerestrictions = templateoptions.namespacerestrictions.join('|');

	// use block settings as warn options where not supplied
	templateoptions.summary = templateoptions.summary || blockoptions.reason;
	templateoptions.expiry = templateoptions.template_expiry || blockoptions.expiry;

	if (toBlock) {
		if (blockoptions.partial) {
			if (blockoptions.disabletalk && blockoptions.namespacerestrictions.indexOf('3') === -1) {
				return alert(wgULS('部分封禁无法阻止编辑自己的讨论页，除非也封禁了User talk名字空间！', '部分封鎖無法阻止編輯自己的討論頁，除非也封鎖了User talk命名空間！'));
			}
			if (!blockoptions.namespacerestrictions && !blockoptions.pagerestrictions) {
				if (!blockoptions.noemail && !blockoptions.nocreate) { // Blank entries technically allowed [[phab:T208645]]
					return alert(wgULS('没有选择页面或名字空间，也没有停用电子邮件或禁止创建账户；请选择至少一个选项以应用部分封禁！', '沒有選擇頁面或命名空間，也沒有停用電子郵件或禁止建立帳號；請選擇至少一個選項以應用部分封鎖！'));
				} else if (!confirm(wgULS('您将要进行封禁，但没有阻止任何页面或名字空间的编辑，确定要继续？', '您將要進行封鎖，但沒有阻止任何頁面或命名空間的編輯，確定要繼續？'))) {
					return;
				}
			}
		}
		if (!blockoptions.expiry) {
			return alert(wgULS('请提供过期时间！', '請提供過期時間！'));
		} else if (Morebits.string.isInfinity(blockoptions.expiry) && !Twinkle.block.isRegistered) {
			return alert(wgULS('禁止无限期封禁IP地址！', '禁止無限期封鎖IP位址！'));
		}
		if (!blockoptions.reason) {
			return alert(wgULS('请提供封禁理由！', '請提供封鎖理由！'));
		}

		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);
		var statusElement = new Morebits.status(wgULS('执行封禁', '執行封鎖'));
		blockoptions.action = 'block';
		blockoptions.user = Morebits.wiki.flow.relevantUserName(true);

		// boolean-flipped options
		blockoptions.anononly = blockoptions.hardblock ? undefined : true;
		blockoptions.allowusertalk = blockoptions.disabletalk ? undefined : true;

		// fix for bug with block API, see [[phab:T68646]]
		if (blockoptions.expiry === 'infinity') {
			blockoptions.expiry = 'infinite';
		}

		/*
		  Check if block status changed while processing the form.

		  There's a lot to consider here. list=blocks provides the
		  current block status, but there are at least two issues with
		  relying on it. First, the id doesn't update on a reblock,
		  meaning the individual parameters need to be compared. This
		  can be done roughly with JSON.stringify - we can thankfully
		  rely on order from the server, although sorting would be
		  fine if not - but falsey values are problematic and is
		  non-ideal. More importantly, list=blocks won't indicate if a
		  non-blocked user is blocked then unblocked. This should be
		  exceedingy rare, but regardless, we thus need to check
		  list=logevents, which has a nicely updating logid
		  parameter. We can't rely just on that, though, since it
		  doesn't account for blocks that have expired on their own.

		  As such, we use both. Using some ternaries, the logid
		  variables are false if there's no logevents, so if they
		  aren't equal we defintely have a changed entry (send
		  confirmation). If they are equal, then either the user was
		  never blocked (the block statuses will be equal, no
		  confirmation) or there's no new block, in which case either
		  a block expired (different statuses, confirmation) or the
		  same block is still active (same status, no confirmation).
		*/
		var query = {
			format: 'json',
			action: 'query',
			list: 'blocks|logevents',
			letype: 'block',
			lelimit: 1,
			letitle: 'User:' + blockoptions.user
		};
		if (Morebits.isIPRange(blockoptions.user)) {
			query.bkip = blockoptions.user;
		} else {
			query.bkusers = blockoptions.user;
		}

		api.get(query).then(function(data) {
			var block = data.query.blocks[0];
			var logevents = data.query.logevents[0];
			var logid = data.query.logevents.length ? logevents.logid : false;

			if (logid !== Twinkle.block.blockLogId || !!block !== !!Twinkle.block.currentBlockInfo) {
				var message = mw.config.get('wgRelevantUserName') + wgULS('的封禁状态已被修改。', '的封鎖狀態已被修改。');
				if (block) {
					message += wgULS('新状态：', '新狀態：');
				} else {
					message += wgULS('最新日志：', '最新日誌：');
				}

				var logExpiry = '';
				if (logevents.params.duration) {
					if (logevents.params.duration === 'infinity') {
						logExpiry = wgULS('无限期', '無限期');
					} else {
						var expiryDate = new Morebits.date(logevents.params.expiry);
						logExpiry += '到' + expiryDate.calendar();
					}
				} else { // no duration, action=unblock, just show timestamp
					logExpiry = '於' + new Morebits.date(logevents.timestamp).calendar();
				}
				message += '由' + logevents.user + wgULS('以“', '以「') + logevents.comment + wgULS('”', '」') +
					blockActionText[logevents.action] + logExpiry + wgULS('，你想要以你的设置变更封禁吗？', '，你想要以你的設定變更封鎖嗎？');

				if (!confirm(message)) {
					Morebits.status.error(wgULS('执行封禁', '執行封鎖'), wgULS('用户取消操作', '使用者取消操作'));
					return;
				}
				blockoptions.reblock = 1; // Writing over a block will fail otherwise
			}

			// execute block
			blockoptions.tags = Twinkle.changeTags;
			blockoptions.token = mw.user.tokens.get('csrfToken');
			var mbApi = new Morebits.wiki.api(wgULS('执行封禁', '執行封鎖'), blockoptions, function() {
				statusElement.info('完成');
				if (toWarn) {
					Twinkle.block.callback.issue_template(templateoptions);
				}
			});
			mbApi.post();
		});
	} else if (toWarn) {
		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);

		Twinkle.block.callback.issue_template(templateoptions);
	}
	if (toTag || toProtect) {
		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);
		var userPage = 'User:' + Morebits.wiki.flow.relevantUserName(true);
		var wikipedia_page = new Morebits.wiki.page(userPage, wgULS('标记或保护用户页', '標記或保護使用者頁面'));
		wikipedia_page.setCallbackParameters(tagprotectoptions);
		wikipedia_page.load(Twinkle.block.callback.taguserpage);
	}
	if (toUnblock) {
		if (!unblockoptions.reason) {
			return alert(wgULS('请提供解除封禁理由！', '請提供解除封鎖理由！'));
		}

		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);
		var unblockStatusElement = new Morebits.status(wgULS('执行解除封禁', '執行解除封鎖'));
		unblockoptions.action = 'unblock';
		unblockoptions.user = Morebits.wiki.flow.relevantUserName(true);
		// execute unblock
		unblockoptions.tags = Twinkle.changeTags;
		unblockoptions.token = mw.user.tokens.get('csrfToken');
		var unblockMbApi = new Morebits.wiki.api(wgULS('执行解除封禁', '執行解除封鎖'), unblockoptions, function() {
			unblockStatusElement.info('完成');
		});
		unblockMbApi.post();
	}
	if (!toBlock && !toWarn && !toTag && !toProtect && !toUnblock) {
		return alert(wgULS('请给Twinkle点事做！', '請給Twinkle點事做！'));
	}
};

Twinkle.block.callback.taguserpage = function twinkleblockCallbackTagUserpage(pageobj) {
	var params = pageobj.getCallbackParameters();
	// var statelem = pageobj.getStatusElement();
	if (params.istag) {
		var pagetext = '';
		switch (params.tag) {
			case 'indef':
				pagetext = '{{indef}}';
				break;
			case 'spp':
				var username = params.username.trim();
				if (!username) {
					return alert(wgULS('请给主账户用户名！', '請給主帳號使用者名稱！'));
				}
				pagetext = '{{Blocked sockpuppet|' + username + '}}';
				break;
			case 'spm':
				pagetext = '{{Sockpuppeteer|blocked}}';
				break;
			default:
				return alert(wgULS('未知的用户页模板！', '未知的使用者頁面模板！'));
		}
		pageobj.setPageText(pagetext);
		pageobj.setEditSummary(wgULS('标记被永久封禁的用户页', '標記被永久封鎖的使用者頁面'));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.save(function() {
			Morebits.status.info(wgULS('标记用户页', '標記使用者頁面'), '完成');
			pageobj.load(Twinkle.block.callback.protectuserpage);
		});
	} else {
		Twinkle.block.callback.protectuserpage(pageobj);
	}
};

Twinkle.block.callback.protectuserpage = function twinkleblockCallbackProtectUserpage(pageobj) {
	var params = pageobj.getCallbackParameters();
	// var statelem = pageobj.getStatusElement();
	if (params.isprotect) {
		if (pageobj.exists()) {
			pageobj.setEditProtection('sysop', 'indefinite');
			pageobj.setMoveProtection('sysop', 'indefinite');
		} else {
			pageobj.setCreateProtection('sysop', 'indefinite');
		}
		pageobj.setEditSummary(wgULS('被永久封禁的用户页', '被永久封鎖的使用者頁面'));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.protect(function() {
			Morebits.status.info(wgULS('保护用户页', '保護使用者頁面'), pageobj.exists() ? wgULS('已全保护', '已全保護') : wgULS('已白纸保护', '已白紙保護'));
		});
	}
};

Twinkle.block.callback.issue_template = function twinkleblockCallbackIssueTemplate(formData) {
	if (Morebits.isIPRange(Morebits.wiki.flow.relevantUserName(true))) {
		new Morebits.status(wgULS('信息', '資訊'), wgULS('由于封禁目标为IP段，加入封禁模板已略过', '由於封鎖目標為IP段，加入封鎖模板已略過'), 'warn');
		return;
	}

	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName(true);

	var params = $.extend(formData, {
		messageData: Twinkle.block.blockPresetsInfo[formData.template],
		reason: Twinkle.block.field_template_options.block_reason,
		disabletalk: Twinkle.block.field_template_options.notalk
		// noemail: Twinkle.block.field_template_options.noemail_template,
		// nocreate: Twinkle.block.field_template_options.nocreate_template
	});
	params.template = params.template.split(':', 1)[0];

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = wgULS('完成，将在几秒后加载用户讨论页', '完成，將在幾秒後載入使用者討論頁');

	Morebits.wiki.flow.check(userTalkPage, function () {
		var flowpage = new Morebits.wiki.flow(userTalkPage, wgULS('用户Flow讨论页留言', '使用者Flow討論頁留言'));
		flowpage.setCallbackParameters(params);
		Twinkle.block.callback.main_flow(flowpage);
	}, function () {
		var wikipedia_page = new Morebits.wiki.page(userTalkPage, wgULS('用户讨论页修改', '使用者討論頁修改'));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.load(Twinkle.block.callback.main);
	});

};

Twinkle.block.formatBlockTime = function twinkleblockFormatBlockTime(time) {
	var m;
	if ((m = time.match(/^\s*(\d+)\s*seconds?\s*$/)) !== null) {
		return m[1] + '秒';
	}
	if ((m = time.match(/^\s*(\d+)\s*min(ute)?s?\s*$/)) !== null) {
		return m[1] + '分';
	}
	if ((m = time.match(/^\s*(\d+)\s*hours?\s*$/)) !== null) {
		return m[1] + '小時';
	}
	if ((m = time.match(/^\s*(\d+)\s*days?\s*$/)) !== null) {
		return m[1] + '天';
	}
	if ((m = time.match(/^\s*(\d+)\s*weeks?\s*$/)) !== null) {
		return m[1] + '週';
	}
	if ((m = time.match(/^\s*(\d+)\s*months?\s*$/)) !== null) {
		return m[1] + '個月';
	}
	if ((m = time.match(/^\s*(\d+)\s*years?\s*$/)) !== null) {
		return m[1] + '年';
	}
	return time;
};

Twinkle.block.callback.getBlockNoticeWikitext = function(params, nosign) {
	var text = '{{', settings = Twinkle.block.blockPresetsInfo[params.template];
	if (!settings.nonstandard) {
		text += 'subst:' + params.template;
		if (params.article && settings.pageParam) {
			text += '|page=' + params.article;
		}

		if (!/te?mp|^\s*$|min/.exec(params.expiry)) {
			if (params.indefinite) {
				text += '|indef=yes';
			} else if (!params.blank_duration) {
				text += '|time=' + Twinkle.block.formatBlockTime(params.expiry);
			}
		}

		if (!Twinkle.block.isRegistered && !params.hardblock) {
			text += '|anon=yes';
		}

		if (params.reason) {
			text += '|reason=' + params.reason;
		}
		if (params.disabletalk) {
			text += '|notalk=yes';
		}
		text += '|subst=subst:';

		// Currently, all partial block templates are "standard"
		// Building the template, however, takes a fair bit of logic
		if (params.partial) {
			if (params.pagerestrictions.length || params.namespacerestrictions.length) {
				var makeSentence = function (array) {
					if (array.length < 3) {
						return array.join('和');
					}
					var last = array.pop();
					return array.join('、') + '和' + last;

				};
				text += '|area=某些';
				if (params.pagerestrictions.length) {
					text += '頁面（' + makeSentence(params.pagerestrictions.map(function(p) {
						return '[[:' + p + ']]';
					}));
					text += params.namespacerestrictions.length ? '）和某些' : '）';
				}
				if (params.namespacerestrictions.length) {
					// 1 => Talk, 2 => User, etc.
					var namespaceNames = params.namespacerestrictions.map(function(id) {
						return menuFormattedNamespaces[id];
					});
					text += wgULS('[[Wikipedia:名字空间|名字空间]]（', '[[Wikipedia:命名空間|命名空間]]（') + makeSentence(namespaceNames) + '）';
				}
			} else if (params.area) {
				text += '|area=' + params.area;
			} else {
				if (params.noemail) {
					text += '|email=yes';
				}
				if (params.nocreate) {
					text += '|accountcreate=yes';
				}
			}
		}
	} else {
		text += params.template;
	}

	if ((settings.sig === '~~~~' || settings.sig === undefined) && !nosign) {
		text += '}}--~~~~';
	} else if (settings.sig && !nosign) {
		text += '|sig=' + settings.sig;
		text += '}}';
	} else {
		text += '}}';
	}

	return text;
};

Twinkle.block.callback.main = function twinkleblockcallbackMain(pageobj) {
	var text = pageobj.getPageText(),
		params = pageobj.getCallbackParameters(),
		messageData = params.messageData,
		date = new Morebits.date(pageobj.getLoadTime());

	var dateHeaderRegex = date.monthHeaderRegex(), dateHeaderRegexLast, dateHeaderRegexResult;
	while ((dateHeaderRegexLast = dateHeaderRegex.exec(text)) !== null) {
		dateHeaderRegexResult = dateHeaderRegexLast;
	}
	// If dateHeaderRegexResult is null then lastHeaderIndex is never checked. If it is not null but
	// \n== is not found, then the date header must be at the very start of the page. lastIndexOf
	// returns -1 in this case, so lastHeaderIndex gets set to 0 as desired.
	var lastHeaderIndex = text.lastIndexOf('\n==') + 1;

	if (text.length > 0) {
		text += '\n\n';
	}

	params.indefinite = Morebits.string.isInfinity(params.expiry);

	if (Twinkle.getPref('blankTalkpageOnIndefBlock') && params.template !== 'uw-lblock' && params.indefinite) {
		Morebits.status.info(wgULS('信息', '資訊'), wgULS('根据参数设置清空讨论页并为日期创建新2级标题', '根據偏好設定清空討論頁並為日期建立新2級標題'));
		text = date.monthHeader() + '\n';
	} else if (!dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex) {
		Morebits.status.info(wgULS('信息', '資訊'), wgULS('未找到当月标题，将创建新的', '未找到當月標題，將建立新的'));
		text += date.monthHeader() + '\n';
	}

	params.expiry = typeof params.template_expiry !== 'undefined' ? params.template_expiry : params.expiry;

	text += Twinkle.block.callback.getBlockNoticeWikitext(params);

	// build the edit summary
	var summary = wgULS('封禁通知：', '封鎖通知：');
	summary += messageData.summary || messageData.reason || params.reason;
	if (messageData.suppressArticleInSummary !== true && params.article) {
		summary += wgULS('，于[[', '，於[[') + params.article + ']]';
	}

	pageobj.setPageText(text);
	pageobj.setEditSummary(summary);
	pageobj.setChangeTags(Twinkle.changeTags);
	pageobj.setWatchlist(Twinkle.getPref('watchWarnings'));
	pageobj.save();
};

Twinkle.block.callback.main_flow = function twinkleblockcallbackMain(flowobj) {
	var params = flowobj.getCallbackParameters();

	params.indefinite = (/indef|infinity|never|\*|max/).test(params.expiry);
	params.expiry = typeof params.template_expiry !== 'undefined' ? params.template_expiry : params.expiry;

	var title = '封禁通知';
	var content = Twinkle.block.callback.getBlockNoticeWikitext(params, true);

	flowobj.setTopic(title);
	flowobj.setContent(content);
	flowobj.newTopic();
};

Twinkle.addInitCallback(Twinkle.block, 'block');
})(jQuery);


// </nowiki>
