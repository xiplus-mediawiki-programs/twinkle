// <nowiki>


(function($) {

var conv = require('ext.gadget.HanAssist').conv;
var api = new mw.Api(), relevantUserName, blockedUserName;
var menuFormattedNamespaces = $.extend({}, mw.config.get('wgFormattedNamespaces'));
menuFormattedNamespaces[0] = conv({ hans: '（条目）', hant: '（條目）' });
var blockActionText = {
	block: conv({ hans: '封禁', hant: '封鎖' }),
	reblock: conv({ hans: '重新封禁', hant: '重新封鎖' }),
	unblock: conv({ hans: '解除封禁', hant: '解除封鎖' })
};

/*
 ****************************************
 *** twinkleblock.js: Block module
 ****************************************
 * Mode of invocation:     Tab ("Block")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

Twinkle.block = function twinkleblock() {
	relevantUserName = Morebits.wiki.flow.relevantUserName(true);
	// should show on Contributions or Block pages, anywhere there's a relevant user
	// Ignore ranges wider than the CIDR limit
	// zhwiki: Enable for non-admins
	if ((Morebits.userIsSysop || !mw.util.isIPAddress(relevantUserName, true)) && relevantUserName && (!Morebits.ip.isRange(relevantUserName) || Morebits.ip.validCIDR(relevantUserName))) {
		Twinkle.addPortletLink(Twinkle.block.callback, conv({ hans: '封禁', hant: '封鎖' }), 'tw-block', conv({ hans: '封禁相关用户', hant: '封鎖相關使用者' }));
	}
};

Twinkle.block.callback = function twinkleblockCallback() {
	if (relevantUserName === mw.config.get('wgUserName') &&
		!confirm(conv({ hans: '您即将对自己执行封禁相关操作！确认要继续吗？', hant: '您即將對自己執行封鎖相關操作！確認要繼續嗎？' }))) {
		return;
	}

	Twinkle.block.currentBlockInfo = undefined;
	Twinkle.block.field_block_options = {};
	Twinkle.block.field_template_options = {};

	var Window = new Morebits.simpleWindow(650, 530);
	// need to be verbose about who we're blocking
	Window.setTitle(conv({ hans: '封禁或向', hant: '封鎖或向' }) + relevantUserName + conv({ hans: '发出封禁模板', hant: '發出封鎖模板' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink('封禁模板', 'Wikipedia:模板消息/用戶討論命名空間#封禁');
	Window.addFooterLink(conv({ hans: '封禁方针', hant: '封鎖方針' }), 'WP:BLOCK');
	Window.addFooterLink(conv({ hans: '封禁设置', hant: '封鎖設定' }), 'WP:TW/PREF#block');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#block');

	var form = new Morebits.quickForm(Twinkle.block.callback.evaluate);
	var actionfield = form.append({
		type: 'field',
		label: conv({ hans: '操作类型', hant: '操作類別' })
	});
	actionfield.append({
		type: 'checkbox',
		name: 'actiontype',
		event: Twinkle.block.callback.change_action,
		list: [
			{
				label: conv({ hans: '封禁用户', hant: '封鎖使用者' }),
				value: 'block',
				tooltip: conv({ hans: '用选择的选项全站封禁相关用户，如果未勾选部分封禁则为全站封禁。', hant: '用選擇的選項全站封鎖相關使用者，如果未勾選部分封鎖則為全站封鎖。' }),
				hidden: !Morebits.userIsSysop,
				checked: Morebits.userIsSysop
			},
			{
				label: conv({ hans: '部分封禁', hant: '部分封鎖' }),
				value: 'partial',
				tooltip: conv({ hans: '启用部分封禁及部分封禁模板。', hant: '啟用部分封鎖及部分封鎖模板。' }),
				hidden: !Morebits.userIsSysop,
				checked: Twinkle.getPref('defaultToPartialBlocks') // Overridden if already blocked
			},
			{
				label: conv({ hans: '加入封禁模板到用户讨论页', hant: '加入封鎖模板到使用者討論頁' }),
				value: 'template',
				tooltip: conv({ hans: '如果执行封禁的管理员忘记发出封禁模板，或你封禁了用户而没有给其发出模板，则你可以用此来发出合适的模板。勾选部分封禁以使用部分封禁模板。', hant: '如果執行封鎖的管理員忘記發出封鎖模板，或你封鎖了使用者而沒有給其發出模板，則你可以用此來發出合適的模板。勾選部分封鎖以使用部分封鎖模板。' }),
				// Disallow when viewing the block dialog on an IP range
				hidden: !Morebits.userIsSysop,
				checked: Morebits.userIsSysop && !Morebits.ip.isRange(relevantUserName),
				disabled: Morebits.ip.isRange(relevantUserName)
			},
			{
				label: conv({ hans: '标记用户页', hant: '標記使用者頁面' }),
				value: 'tag',
				tooltip: conv({ hans: '将用户页替换成相关的标记模板，仅限永久封禁使用。', hant: '將使用者頁面替換成相關的標記模板，僅限永久封鎖使用。' }),
				hidden: true,
				checked: !Morebits.userIsSysop
			},
			{
				label: conv({ hans: '保护用户页', hant: '保護使用者頁面' }),
				value: 'protect',
				tooltip: conv({ hans: '全保护用户页，仅限永久封禁使用。', hant: '全保護使用者頁面，僅限永久封鎖使用。' }),
				hidden: true
			},
			{
				label: conv({ hans: '解除封禁用户', hant: '解除封鎖使用者' }),
				value: 'unblock',
				tooltip: conv({ hans: '解除封禁相关用户。', hant: '解除封鎖相關使用者。' }),
				hidden: !Morebits.userIsSysop
			}
		]
	});

	/*
	  Add option for IPv6 ranges smaller than /64 to upgrade to the 64
	  CIDR ([[WP:/64]]).  This is one of the few places where we want
	  wgRelevantUserName since this depends entirely on the original user.
	  In theory, we shouldn't use Morebits.ip.get64 here since since we want
	  to exclude functionally-equivalent /64s.  That'd be:
	  // if (mw.util.isIPv6Address(Morebits.wiki.flow.relevantUserName(true), true) &&
	  // (mw.util.isIPv6Address(Morebits.wiki.flow.relevantUserName(true)) || parseInt(Morebits.wiki.flow.relevantUserName(true).replace(/^(.+?)\/?(\d{1,3})?$/, '$2'), 10) > 64)) {
	  In practice, though, since functionally-equivalent ranges are
	  (mis)treated as separate by MediaWiki's logging ([[phab:T146628]]),
	  using Morebits.ip.get64 provides a modicum of relief in thise case.
	*/
	var sixtyFour = Morebits.ip.get64(Morebits.wiki.flow.relevantUserName(true));
	if (sixtyFour && sixtyFour !== Morebits.wiki.flow.relevantUserName(true)) {
		var block64field = form.append({
			type: 'field',
			label: conv({ hans: '转换为/64段封禁', hant: '轉換為/64段封鎖' }),
			name: 'field_64'
		});
		block64field.append({
			type: 'div',
			style: 'margin-bottom: 0.5em',
			label: [$.parseHTML('<a target="_blank" href="' + mw.util.getUrl('en:WP:/64') + '">' + conv({ hans: '直接封禁/64段', hant: '直接封鎖/64段' }) + '</a>')[0], '（',
				$.parseHTML('<a target="_blank" href="' + mw.util.getUrl('Special:Contributions/' + sixtyFour) + '">' + sixtyFour + '</a>)')[0], conv({ hans: '）有益无害。', hant: '）有益無害。' })]
		});
		block64field.append({
			type: 'checkbox',
			name: 'block64',
			event: Twinkle.block.callback.change_block64,
			list: [{
				checked: Twinkle.getPref('defaultToBlock64'),
				label: conv({ hans: '改成封禁/64', hant: '改成封鎖/64' }),
				value: 'block64',
				tooltip: Morebits.ip.isRange(Morebits.wiki.flow.relevantUserName(true)) ? conv({ hans: '将不会发送模板通知。', hant: '將不會發送模板通知。' }) : conv({ hans: '任何模板将会发送给原始IP：', hant: '任何模板將會發送給原始IP：' }) + Morebits.wiki.flow.relevantUserName(true)
			}]
		});
	}

	form.append({ type: 'field', label: conv({ hans: '默认', hant: '預設' }), name: 'field_preset' });
	form.append({ type: 'field', label: conv({ hans: '模板选项', hant: '模板選項' }), name: 'field_template_options' });
	form.append({ type: 'field', label: conv({ hans: '封禁选项', hant: '封鎖選項' }), name: 'field_block_options' });
	form.append({ type: 'field', label: conv({ hans: '标记用户页', hant: '標記使用者頁面' }), name: 'field_tag_options' });
	form.append({ type: 'field', label: conv({ hans: '解除封禁选项', hant: '解除封鎖選項' }), name: 'field_unblock_options' });

	form.append({ type: 'submit', label: '提交' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.root = result;

	Twinkle.block.fetchUserInfo(function() {
		if (Twinkle.block.isRegistered) {
			var $form = $(result);
			Morebits.quickForm.setElementVisibility($form.find('[name=actiontype][value=tag]').parent(), true);
			if (Morebits.userIsSysop) {
				Morebits.quickForm.setElementVisibility($form.find('[name=actiontype][value=protect]').parent(), true);
			}
		}

		// Toggle initial partial state depending on prior block type,
		// will override the defaultToPartialBlocks pref
		if (blockedUserName === relevantUserName) {
			$(result).find('[name=actiontype][value=partial]').prop('checked', Twinkle.block.currentBlockInfo.partial === '');
		}

		// clean up preset data (defaults, etc.), done exactly once, must be before Twinkle.block.callback.change_action is called
		Twinkle.block.transformBlockPresets();

		// init the controls after user and block info have been fetched
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);

		if (result.block64 && result.block64.checked) {
			// Calls the same change_action event once finished
			result.block64.dispatchEvent(evt);
		} else {
			result.actiontype[0].dispatchEvent(evt);
		}
	});
};

// Store fetched user data, only relevant if switching IPv6 to a /64
Twinkle.block.fetchedData = {};
// Processes the data from a a query response, separated from
// Twinkle.block.fetchUserInfo to allow reprocessing of already-fetched data
Twinkle.block.processUserInfo = function twinkleblockProcessUserInfo(data, fn) {
	var blockinfo = data.query.blocks[0],
		userinfo = data.query.users[0];
	// If an IP is blocked *and* rangeblocked, the above finds
	// whichever block is more recent, not necessarily correct.
	// Three seems... unlikely
	if (data.query.blocks.length > 1 && blockinfo.user !== relevantUserName) {
		blockinfo = data.query.blocks[1];
	}
	// Cache response, used when toggling /64 blocks
	Twinkle.block.fetchedData[userinfo.name] = data;

	Twinkle.block.isRegistered = !!userinfo.userid;
	if (Twinkle.block.isRegistered) {
		Twinkle.block.userIsBot = !!userinfo.groupmemberships && userinfo.groupmemberships.map(function(e) {
			return e.group;
		}).indexOf('bot') !== -1;
	} else {
		Twinkle.block.userIsBot = false;
	}

	if (blockinfo) {
		// handle frustrating system of inverted boolean values
		blockinfo.disabletalk = blockinfo.allowusertalk === undefined;
		blockinfo.hardblock = blockinfo.anononly === undefined;
	}
	// will undefine if no blocks present
	Twinkle.block.currentBlockInfo = blockinfo;
	blockedUserName = Twinkle.block.currentBlockInfo && Twinkle.block.currentBlockInfo.user;

	// Semi-busted on ranges, see [[phab:T270737]] and [[phab:T146628]].
	// Basically, logevents doesn't treat functionally-equivalent ranges
	// as equivalent, meaning any functionally-equivalent IP range is
	// misinterpreted by the log throughout.  Without logevents
	// redirecting (like Special:Block does) we would need a function to
	// parse ranges, which is a pain.  IPUtils has the code, but it'd be a
	// lot of cruft for one purpose.
	Twinkle.block.hasBlockLog = !!data.query.logevents.length;
	Twinkle.block.blockLog = Twinkle.block.hasBlockLog && data.query.logevents;
	// Used later to check if block status changed while filling out the form
	Twinkle.block.blockLogId = Twinkle.block.hasBlockLog ? data.query.logevents[0].logid : false;

	if (typeof fn === 'function') {
		return fn();
	}
};

Twinkle.block.fetchUserInfo = function twinkleblockFetchUserInfo(fn) {
	var query = {
		format: 'json',
		action: 'query',
		list: 'blocks|users|logevents',
		letype: 'block',
		lelimit: 2, // zhwiki: Add more details
		letitle: 'User:' + relevantUserName,
		bkprop: 'expiry|reason|flags|restrictions|range|user',
		ususers: relevantUserName
	};

	// bkusers doesn't catch single IPs blocked as part of a range block
	if (mw.util.isIPAddress(relevantUserName, true)) {
		query.bkip = relevantUserName;
	} else {
		query.bkusers = relevantUserName;
		// groupmemberships only relevant for registered users
		query.usprop = 'groupmemberships';
	}

	api.get(query).then(function(data) {
		Twinkle.block.processUserInfo(data, fn);
	}, function(msg) {
		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		Morebits.status.warn(conv({ hans: '抓取用户信息出错', hant: '抓取使用者資訊出錯' }), msg);
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

Twinkle.block.callback.change_block64 = function twinkleblockCallbackChangeBlock64(e) {
	var $form = $(e.target.form), $block64 = $form.find('[name=block64]');

	// Show/hide block64 button
	// Single IPv6, or IPv6 range smaller than a /64
	var priorName = relevantUserName;
	if ($block64.is(':checked')) {
		relevantUserName = Morebits.ip.get64(Morebits.wiki.flow.relevantUserName(true));
	} else {
		relevantUserName = Morebits.wiki.flow.relevantUserName(true);
	}
	// No templates for ranges, but if the original user is a single IP, offer the option
	// (done separately in Twinkle.block.callback.issue_template)
	var originalIsRange = Morebits.ip.isRange(Morebits.wiki.flow.relevantUserName(true));
	$form.find('[name=actiontype][value=template]').prop('disabled', originalIsRange).prop('checked', !originalIsRange);

	// Refetch/reprocess user info then regenerate the main content
	var regenerateForm = function() {
		// Tweak titlebar text.  In theory, we could save the dialog
		// at initialization and then use `.setTitle` or
		// `dialog('option', 'title')`, but in practice that swallows
		// the scriptName and requires `.display`ing, which jumps the
		// window.  It's just a line of text, so this is fine.
		var titleBar = document.querySelector('.ui-dialog-title').firstChild.nextSibling;
		titleBar.nodeValue = titleBar.nodeValue.replace(priorName, relevantUserName);

		// Correct partial state
		$form.find('[name=actiontype][value=partial]').prop('checked', Twinkle.getPref('defaultToPartialBlocks'));
		if (blockedUserName === relevantUserName) {
			$form.find('[name=actiontype][value=partial]').prop('checked', Twinkle.block.currentBlockInfo.partial === '');
		}

		// Set content appropriately
		Twinkle.block.callback.change_action(e);
	};

	if (Twinkle.block.fetchedData[relevantUserName]) {
		Twinkle.block.processUserInfo(Twinkle.block.fetchedData[relevantUserName], regenerateForm);
	} else {
		Twinkle.block.fetchUserInfo(regenerateForm);
	}
};

Twinkle.block.callback.change_action = function twinkleblockCallbackChangeAction(e) {
	var field_preset, field_template_options, field_block_options, field_tag_options, field_unblock_options, $form = $(e.target.form);
	// Make ifs shorter
	var $block = $form.find('[name=actiontype][value=block]');
	var blockBox = $block.is(':checked');
	var $template = $form.find('[name=actiontype][value=template]');
	var templateBox = $template.is(':checked');
	var $tag = $form.find('[name=actiontype][value=tag]');
	var tagBox = $tag.is(':checked');
	var $protect = $form.find('[name=actiontype][value=protect]');
	var $partial = $form.find('[name=actiontype][value=partial]');
	var partialBox = $partial.is(':checked');
	var $unblock = $form.find('[name=actiontype][value=unblock]');
	var unblockBox = $unblock.is(':checked');
	var blockGroup = partialBox ? Twinkle.block.blockGroupsPartial : Twinkle.block.blockGroups;

	if (e.target.value === 'unblock') {
		if (!Twinkle.block.currentBlockInfo) {
			$unblock.prop('checked', false);
			return alert(conv({ hans: '用户没有被封禁', hant: '使用者沒有被封鎖' }));
		}
		$block.prop('checked', false);
		blockBox = false;
		$template.prop('checked', false);
		templateBox = false;
		$tag.prop('checked', false);
		$protect.prop('checked', false);
		$partial.prop('checked', false);
	} else {
		$unblock.prop('checked', false);
	}

	$partial.prop('disabled', !blockBox && !templateBox);

	// Add current block parameters as default preset
	var prior = { label: conv({ hans: '当前封禁', hant: '目前封鎖' }) };
	if (blockedUserName === relevantUserName) {
		Twinkle.block.blockPresetsInfo.prior = Twinkle.block.currentBlockInfo;
		// value not a valid template selection, chosen below by setting templateName
		prior.list = [{ label: conv({ hans: '当前封禁设置', hant: '目前封鎖設定' }), value: 'prior', selected: true }];

		// Arrays of objects are annoying to check
		if (!blockGroup.some(function(bg) {
			return bg.label === prior.label;
		})) {
			blockGroup.push(prior);
		}

		// Always ensure proper template exists/is selected when switching modes
		if (partialBox) {
			Twinkle.block.blockPresetsInfo.prior.templateName = Morebits.string.isInfinity(Twinkle.block.currentBlockInfo.expiry) ? 'uw-pblockindef' : 'uw-pblock';
		} else {
			if (!Twinkle.block.isRegistered) {
				Twinkle.block.blockPresetsInfo.prior.templateName = 'uw-ablock';
			} else {
				Twinkle.block.blockPresetsInfo.prior.templateName = Morebits.string.isInfinity(Twinkle.block.currentBlockInfo.expiry) ? 'uw-blockindef' : 'uw-block';
			}
		}
	} else {
		// But first remove any prior prior
		blockGroup = blockGroup.filter(function(bg) {
			return bg.label !== prior.label;
		});
	}

	Twinkle.block.callback.saveFieldset($('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_template_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_tag_options]'));
	Twinkle.block.callback.saveFieldset($('[name=field_unblock_options]'));

	if (blockBox) {
		field_preset = new Morebits.quickForm.element({ type: 'field', label: conv({ hans: '默认', hant: '預設' }), name: 'field_preset' });
		field_preset.append({
			type: 'select',
			name: 'preset',
			label: conv({ hans: '选择默认：', hant: '選擇預設：' }),
			event: Twinkle.block.callback.change_preset,
			list: Twinkle.block.callback.filtered_block_groups(blockGroup)
		});

		field_block_options = new Morebits.quickForm.element({ type: 'field', label: conv({ hans: '封禁选项', hant: '封鎖選項' }), name: 'field_block_options' });
		field_block_options.append({ type: 'div', name: 'currentblock', label: ' ' });
		field_block_options.append({ type: 'div', name: 'hasblocklog', label: ' ' });
		field_block_options.append({
			type: 'select',
			name: 'expiry_preset',
			label: conv({ hans: '过期时间：', hant: '過期時間：' }),
			event: Twinkle.block.callback.change_expiry,
			list: [
				{ label: conv({ hans: '自定义', hant: '自訂' }), value: 'custom', selected: true },
				{ label: conv({ hans: '无限期', hant: '無限期' }), value: 'infinity' },
				{ label: conv({ hans: '3小时', hant: '3小時' }), value: '3 hours' },
				{ label: conv({ hans: '12小时', hant: '12小時' }), value: '12 hours' },
				{ label: '1天', value: '1 day' },
				{ label: conv({ hans: '31小时', hant: '31小時' }), value: '31 hours' },
				{ label: '2天', value: '2 days' },
				{ label: '3天', value: '3 days' },
				{ label: conv({ hans: '1周', hant: '1週' }), value: '1 week' },
				{ label: conv({ hans: '2周', hant: '2週' }), value: '2 weeks' },
				{ label: conv({ hans: '1个月', hant: '1個月' }), value: '1 month' },
				{ label: conv({ hans: '3个月', hant: '3個月' }), value: '3 months' },
				{ label: conv({ hans: '6个月', hant: '6個月' }), value: '6 months' },
				{ label: '1年', value: '1 year' },
				{ label: '2年', value: '2 years' },
				{ label: '3年', value: '3 years' }
			]
		});
		field_block_options.append({
			type: 'input',
			name: 'expiry',
			label: conv({ hans: '自定义过期时间', hant: '自訂過期時間' }),
			tooltip: conv({ hans: '您可以使用相对时间，如“1 minute”或“19 days”；或绝对时间，“yyyymmddhhmm”（如“200602011405”是2006年2月1日14:05 UTC。）', hant: '您可以使用相對時間，如「1 minute」或「19 days」；或絕對時間，「yyyymmddhhmm」（如「200602011405」是2006年2月1日14:05 UTC。）' }),
			value: Twinkle.block.field_block_options.expiry || Twinkle.block.field_template_options.template_expiry
		});

		if (partialBox) { // Partial block
			field_block_options.append({
				type: 'select',
				multiple: true,
				name: 'pagerestrictions',
				label: conv({ hans: '页面封禁', hant: '頁面封鎖' }),
				value: '',
				tooltip: conv({ hans: '最多10个页面。', hant: '最多10個頁面。' })
			});
			var ns = field_block_options.append({
				type: 'select',
				multiple: true,
				name: 'namespacerestrictions',
				label: conv({ hans: '命名空间封禁', hant: '命名空間封鎖' }),
				value: '',
				tooltip: conv({ hans: '指定封禁的命名空间。', hant: '指定封鎖的命名空間。' })
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
				label: conv({ hans: '禁止创建账户', hant: '禁止建立帳號' }),
				name: 'nocreate',
				value: '1'
			},
			{
				checked: Twinkle.block.field_block_options.noemail,
				label: conv({ hans: '电子邮件停用', hant: '電子郵件停用' }),
				name: 'noemail',
				value: '1'
			},
			{
				checked: Twinkle.block.field_block_options.disabletalk,
				label: conv({ hans: '不能编辑自己的讨论页', hant: '不能編輯自己的討論頁' }),
				name: 'disabletalk',
				value: '1',
				tooltip: partialBox ? conv({ hans: '如果使用部分封禁，不应选择此项，除非您也想要禁止编辑用户讨论页。', hant: '如果使用部分封鎖，不應選擇此項，除非您也想要禁止編輯使用者討論頁。' }) : ''
			}
		];

		if (Twinkle.block.isRegistered) {
			blockoptions.push({
				checked: Twinkle.block.field_block_options.autoblock,
				label: conv({ hans: '自动封禁', hant: '自動封鎖' }),
				name: 'autoblock',
				value: '1'
			});
		} else {
			blockoptions.push({
				checked: Twinkle.block.field_block_options.hardblock,
				label: conv({ hans: '阻止登录用户使用该IP地址编辑', hant: '阻止登入使用者使用該IP位址編輯' }),
				name: 'hardblock',
				value: '1'
			});
		}

		blockoptions.push({
			checked: Twinkle.block.field_block_options.watchuser,
			label: conv({ hans: '监视该用户的用户页和讨论页', hant: '監視該使用者的使用者頁面和討論頁' }),
			name: 'watchuser',
			value: '1'
		});

		blockoptions.push({
			checked: true,
			label: conv({ hans: '标记当前的破坏中的请求', hant: '標記當前的破壞中的請求' }),
			name: 'closevip',
			value: '1'
		});

		field_block_options.append({
			type: 'checkbox',
			name: 'blockoptions',
			list: blockoptions
		});
		field_block_options.append({
			type: 'textarea',
			label: conv({ hans: '理由（用于封禁日志）：', hant: '理由（用於封鎖日誌）：' }),
			name: 'reason',
			tooltip: conv({ hans: '请考虑在默认的消息中加入有用的详细信息。', hant: '請考慮在預設的訊息中加入有用的詳細資訊。' }),
			value: Twinkle.block.field_block_options.reason
		});

		field_block_options.append({
			type: 'div',
			name: 'filerlog_label',
			label: conv({ hans: '参见：', hant: '參見：' }),
			style: 'display:inline-block;font-style:normal !important',
			tooltip: conv({ hans: '在封禁理由中标清特殊情况以供其他管理员参考', hant: '在封鎖理由中標清特殊情況以供其他管理員參考' })
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'filter_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block; margin-right:5px',
			list: [
				{
					label: conv({ hans: '过滤器日志', hant: '過濾器日誌' }),
					checked: false,
					value: conv({ hans: '过滤器日志', hant: '過濾器日誌' })
				}
			]
		});
		field_block_options.append({
			type: 'checkbox',
			name: 'deleted_see_also',
			event: Twinkle.block.callback.toggle_see_alsos,
			style: 'display:inline-block; margin-right:5px',
			list: [
				{
					label: conv({ hans: '已删除的编辑', hant: '已刪除的編輯' }),
					checked: false,
					value: conv({ hans: '已删除的编辑', hant: '已刪除的編輯' })
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
					label: conv({ hans: '用户讨论页', hant: '使用者討論頁' }),
					checked: false,
					value: conv({ hans: '用户讨论页', hant: '使用者討論頁' })
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
					label: conv({ hans: '过去的封禁记录', hant: '過去的封鎖記錄' }),
					checked: false,
					value: conv({ hans: '过去的封禁记录', hant: '過去的封鎖記錄' })
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
					label: conv({ hans: '跨维基贡献', hant: '跨維基貢獻' }),
					checked: false,
					value: conv({ hans: '跨维基贡献', hant: '跨維基貢獻' })
				}
			]
		});

		// Yet-another-logevents-doesn't-handle-ranges-well
		if (blockedUserName === relevantUserName) {
			field_block_options.append({ type: 'hidden', name: 'reblock', value: '1' });
		}
	}

	if (templateBox) {
		field_template_options = new Morebits.quickForm.element({ type: 'field', label: conv({ hans: '模板选项', hant: '模板選項' }), name: 'field_template_options' });
		field_template_options.append({
			type: 'select',
			name: 'template',
			label: conv({ hans: '选择讨论页模板：', hant: '選擇討論頁模板：' }),
			event: Twinkle.block.callback.change_template,
			list: Twinkle.block.callback.filtered_block_groups(blockGroup, true),
			value: Twinkle.block.field_template_options.template
		});

		field_template_options.append({
			type: 'input',
			name: 'article',
			label: conv({ hans: '链接页面', hant: '連結頁面' }),
			value: '',
			tooltip: conv({ hans: '可以随通知链接页面，例如破坏的目标。没有条目需要链接则请留空。', hant: '可以隨通知連結頁面，例如破壞的目標。沒有條目需要連結則請留空。' })
		});

		// Only visible if partial and not blocking
		field_template_options.append({
			type: 'input',
			name: 'area',
			label: conv({ hans: '封禁范围', hant: '封鎖範圍' }),
			value: '',
			tooltip: conv({ hans: '阻止用户编辑的页面或命名空间的可选说明。', hant: '阻止使用者編輯的頁面或命名空間的可選說明。' })
		});

		if (!blockBox) {
			field_template_options.append({
				type: 'input',
				name: 'template_expiry',
				label: '封禁期限：',
				value: '',
				tooltip: conv({ hans: '封禁时长，如24小时、2周、无限期等。', hant: '封鎖時長，如24小時、2週、無限期等。' })
			});
		}
		field_template_options.append({
			type: 'input',
			name: 'block_reason',
			label: conv({ hans: '“由于…您已被封禁”', hant: '「由於…您已被封鎖」' }),
			tooltip: conv({ hans: '可选的理由，用于替换默认理由。只在常规封禁模板中有效。', hant: '可選的理由，用於替換預設理由。只在常規封鎖模板中有效。' }),
			value: Twinkle.block.field_template_options.block_reason,
			size: 60
		});

		if (blockBox) {
			field_template_options.append({
				type: 'checkbox',
				name: 'blank_duration',
				list: [
					{
						label: conv({ hans: '不在模板中包含封禁期限', hant: '不在模板中包含封鎖期限' }),
						checked: Twinkle.block.field_template_options.blank_duration,
						tooltip: conv({ hans: '模板将会显示“一段时间”而不是具体时长', hant: '模板將會顯示「一段時間」而不是具體時長' })
					}
				]
			});
		} else {
			field_template_options.append({
				type: 'checkbox',
				list: [
					{
						label: conv({ hans: '不能编辑自己的讨论页', hant: '不能編輯自己的討論頁' }),
						name: 'notalk',
						checked: Twinkle.block.field_template_options.notalk,
						tooltip: conv({ hans: '用此在封禁模板中指明该用户编辑讨论页的权限已被移除', hant: '用此在封鎖模板中指明該使用者編輯討論頁的權限已被移除' })
					},
					{
						label: conv({ hans: '不能发送电子邮件', hant: '不能傳送電子郵件' }),
						name: 'noemail_template',
						checked: Twinkle.block.field_template_options.noemail_template,
						tooltip: conv({ hans: '用此在封禁模板中指明该用户发送电子邮件的权限已被移除', hant: '用此在封鎖模板中指明該使用者傳送電子郵件的權限已被移除' })
					},
					{
						label: conv({ hans: '不能创建账户', hant: '不能建立帳號' }),
						name: 'nocreate_template',
						checked: Twinkle.block.field_template_options.nocreate_template,
						tooltip: conv({ hans: '用此在封禁模板中指明该用户创建账户的权限已被移除', hant: '用此在封鎖模板中指明該使用者建立帳號的權限已被移除' })
					}
				]
			});
		}

		var $previewlink = $('<a id="twinkleblock-preview-link">' + conv({ hans: '预览', hant: '預覽' }) + '</a>');
		$previewlink.off('click').on('click', function() {
			Twinkle.block.callback.preview($form[0]);
		});
		$previewlink.css({cursor: 'pointer'});
		field_template_options.append({ type: 'div', id: 'blockpreview', label: [ $previewlink[0] ] });
		field_template_options.append({ type: 'div', id: 'twinkleblock-previewbox', style: 'display: none' });
	}

	if (tagBox) {
		field_tag_options = new Morebits.quickForm.element({ type: 'field', label: conv({ hans: '标记用户页', hant: '標記使用者頁面' }), name: 'field_tag_options' });

		field_tag_options.append({
			type: 'checkbox',
			name: 'tag',
			label: conv({ hans: '选择用户页模板：', hant: '選擇使用者頁面模板：' }),
			list: [
				{
					label: '{{Blocked user}}：' + conv({ hans: '一般永久封禁', hant: '一般永久封鎖' }),
					value: 'Blocked user'
				},
				{
					label: '{{Sockpuppet}}：' + conv({ hans: '傀儡账户', hant: '傀儡帳號' }),
					value: 'Sockpuppet',
					subgroup: [
						{
							name: 'sppUsername',
							type: 'input',
							label: conv({ hans: '主账户用户名：', hant: '主帳號使用者名稱：' })
						},
						{
							name: 'sppType',
							type: 'select',
							label: conv({ hans: '状态：', hant: '狀態：' }),
							list: [
								{ type: 'option', value: 'blocked', label: 'blocked - ' + conv({ hans: '仅依行为证据认定', hant: '僅依行為證據認定' }), selected: true },
								{ type: 'option', value: 'proven', label: 'proven - ' + conv({ hans: '经傀儡调查确认', hant: '經傀儡調查確認' }) },
								{ type: 'option', value: 'confirmed', label: 'confirmed - ' + conv({ hans: '经查核确认', hant: '經查核確認' }) }
							]
						},
						{
							name: 'sppEvidence',
							type: 'input',
							label: conv({ hans: '根据……确定：', hant: '根據……確定：' }),
							tooltip: conv({ hans: '纯文字或是带[[]]的链接，例如：[[Special:固定链接/xxxxxxxx|用户查核]]', hant: '純文字或是帶[[]]的連結，例如：[[Special:固定链接/xxxxxxxx|用戶查核]]' })
						}
					]
				},
				{
					label: '{{Sockpuppeteer|blocked}}：' + conv({ hans: '傀儡主账户', hant: '傀儡主帳號' }),
					value: 'Sockpuppeteer',
					subgroup: [
						{
							type: 'checkbox',
							list: [
								{
									name: 'spmChecked',
									value: 'spmChecked',
									label: conv({ hans: '经用户查核确认', hant: '經使用者查核確認' })
								}
							]
						},
						{
							name: 'spmEvidence',
							type: 'input',
							label: conv({ hans: '额外理由：', hant: '額外理由：' })
						}
					]
				},
				{
					label: '{{Locked global account}}：' + conv({ hans: '全域锁定', hant: '全域鎖定' }),
					value: 'Locked global account',
					subgroup: [
						{
							type: 'checkbox',
							list: [
								{
									name: 'lockBlocked',
									value: 'lockBlocked',
									label: conv({ hans: '亦被本地封禁', hant: '亦被本地封鎖' })
								}
							]
						}
					]
				}
			]
		});

		field_tag_options.append({
			type: 'input',
			name: 'category',
			label: 'Category:……的維基用戶分身' + conv({ hans: '（主账户用户名）', hant: '（主帳號使用者名稱）' }), // no variant conversion for category name
			tooltip: conv({ hans: '您通常应该使用{{Sockpuppet}}的主账户参数来产生分类，只有单独使用{{Locked global account}}才需填写此项。', hant: '您通常應該使用{{Sockpuppet}}的主帳號參數來產生分類，只有單獨使用{{Locked global account}}才需填寫此項。' })
		});
	}

	if (unblockBox) {
		field_unblock_options = new Morebits.quickForm.element({ type: 'field', label: conv({ hans: '解除封禁选项', hant: '解除封鎖選項' }), name: 'field_unblock_options' });

		field_unblock_options.append({
			type: 'textarea',
			label: conv({ hans: '理由（用于封禁日志）：', hant: '理由（用於封鎖日誌）：' }),
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
		$form.find('fieldset[name="field_64"]').show();


		$form.find('[name=pagerestrictions]').select2({
			width: '100%',
			placeholder: conv({ hans: '输入要阻止用户编辑的页面', hant: '輸入要阻止使用者編輯的頁面' }),
			language: {
				errorLoading: function() {
					return conv({ hans: '搜索词汇不完整或无效', hant: '搜尋詞彙不完整或無效' });
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
						action: 'query',
						format: 'json',
						list: 'allpages',
						apfrom: title.title,
						apnamespace: title.namespace,
						aplimit: '10'
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
			placeholder: conv({ hans: '选择要禁止用户编辑的命名空间', hant: '選擇要禁止使用者編輯的命名空間' })
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
		$form.find('fieldset[name="field_64"]').hide();
		// Clear select2 options
		$form.find('[name=pagerestrictions]').val(null).trigger('change');
		$form.find('[name=namespacerestrictions]').val(null).trigger('change');
	}

	if (field_template_options) {
		oldfield = $form.find('fieldset[name="field_template_options"]')[0];
		oldfield.parentNode.replaceChild(field_template_options.render(), oldfield);
		e.target.form.root.previewer = new Morebits.wiki.preview($(e.target.form.root).find('#twinkleblock-previewbox').last()[0]);
	} else {
		$form.find('fieldset[name="field_template_options"]').hide();
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

	// Any block, including ranges
	if (Twinkle.block.currentBlockInfo) {
		// false for an ip covered by a range or a smaller range within a larger range;
		// true for a user, single ip block, or the exact range for a range block
		var sameUser = blockedUserName === relevantUserName;

		Morebits.status.init($('div[name="currentblock"] span').last()[0]);
		var statusStr = relevantUserName + '已被' + (Twinkle.block.currentBlockInfo.partial === '' ? conv({ hans: '部分封禁', hant: '部分封鎖' }) : conv({ hans: '全站封禁', hant: '全站封鎖' }));

		// Range blocked
		if (Twinkle.block.currentBlockInfo.rangestart !== Twinkle.block.currentBlockInfo.rangeend) {
			if (sameUser) {
				statusStr += conv({ hans: '（段封禁）', hant: '（段封鎖）' });
			} else {
				// zhwiki: Change order
				// Link to the full range
				var $rangeblockloglink = $('<span>').append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: blockedUserName, type: 'block'}) + '">' + (Morebits.ip.get64(relevantUserName) === blockedUserName ? '/64' : blockedUserName) + '</a>)'));
				statusStr += conv({ hans: '（位于', hant: '（位於' }) + $rangeblockloglink.html() + conv({ hans: '段封禁内）', hant: '段封鎖內）' });
			}
		}

		if (Twinkle.block.currentBlockInfo.expiry === 'infinity') {
			statusStr += conv({ hans: '（无限期）', hant: '（無限期）' });
		} else if (new Morebits.date(Twinkle.block.currentBlockInfo.expiry).isValid()) {
			statusStr += conv({ hans: '（终止于', hant: '（終止於' }) + new Morebits.date(Twinkle.block.currentBlockInfo.expiry).calendar('utc') + '）';
		}


		var infoStr = conv({ hans: '此表单将', hant: '此表單將' });
		if (sameUser) {
			infoStr += conv({ hans: '变更封禁', hant: '變更封鎖' });
			if (Twinkle.block.currentBlockInfo.partial === undefined && partialBox) {
				infoStr += conv({ hans: '为部分封禁', hant: '為部分封鎖' });
			} else if (Twinkle.block.currentBlockInfo.partial === '' && !partialBox) {
				infoStr += conv({ hans: '为全站封禁', hant: '為全站封鎖' });
			}
			infoStr += '。';
		} else {
			infoStr += conv({ hans: '加上额外的', hant: '加上額外的' }) + (partialBox ? '部分' : '') + conv({ hans: '封禁。', hant: '封鎖。' });
		}

		Morebits.status.warn(statusStr, infoStr);

		// Default to the current block conditions on intial form generation
		Twinkle.block.callback.update_form(e, Twinkle.block.currentBlockInfo);
	}

	// This is where T146628 really comes into play: a rangeblock will
	// only return the correct block log if wgRelevantUserName is the
	// exact range, not merely a funtional equivalent
	if (Twinkle.block.hasBlockLog) {
		// zhwiki: Add more details
		var blockloginfo = [];
		var $blockloglink = $('<span>').append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: relevantUserName, type: 'block' }) + '">' + conv({ hans: '封禁日志', hant: '封鎖日誌' }) + '</a>)'));
		if (Twinkle.block.currentBlockInfo) {
			blockloginfo.push(conv({ hans: '封禁详情', hant: '封鎖詳情' }));
		} else {
			var lastBlockAction = Twinkle.block.blockLog[0],
				blockAction = lastBlockAction.action === 'unblock' ? Twinkle.block.blockLog[1] : lastBlockAction;

			blockloginfo.push('此' + (Morebits.ip.isRange(relevantUserName) ? conv({ hans: 'IP范围', hant: 'IP範圍' }) : conv({ hans: '用户', hant: '使用者' })) + '曾在');
			blockloginfo.push($('<b>' + new Morebits.date(blockAction.timestamp).calendar('utc') + '</b>')[0]);
			blockloginfo.push('被' + blockAction.user + conv({ hans: '封禁', hant: '封鎖' }));
			blockloginfo.push($('<b>' + Morebits.string.formatTime(blockAction.params.duration) + '</b>')[0]);
			if (lastBlockAction.action === 'unblock') {
				blockloginfo.push('，' + new Morebits.date(lastBlockAction.timestamp).calendar('utc') + '解封');
			} else { // block or reblock
				blockloginfo.push('，' + new Morebits.date(blockAction.params.expiry).calendar('utc') + conv({ hans: '过期', hant: '過期' }));
			}
		}

		Morebits.status.init($('div[name="hasblocklog"] span').last()[0]);
		Morebits.status.warn(blockloginfo, $blockloglink[0]);
	}

	// Make sure all the fields are correct based on initial defaults
	if (blockBox) {
		Twinkle.block.callback.change_preset(e);
	} else if (templateBox) {
		Twinkle.block.callback.change_template(e);
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
 *   expiry: <string - expiry timestamp, can include relative times like "5 months", "2 weeks" etc>
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
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{anonblock}}',
		sig: '~~~~'
	},
	'blocked proxy': {
		expiry: '2 years',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		hardblock: true,
		reason: '{{blocked proxy}}',
		sig: null
	},
	'CheckUser block': {
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{CheckUser block}}',
		sig: '~~~~'
	},
	'checkuserblock-account': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{checkuserblock-account}}',
		sig: '~~~~'
	},
	'school block': {
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		nonstandard: true,
		reason: '{{school block}}',
		sig: '~~~~'
	},
	'range block': {
		expiry: '1 week',
		reason: '<!-- 請登入您的帳號，若無帳號，請閱讀 https://w.wiki/Jyi -->{{range block}}',
		nocreate: true,
		nonstandard: true,
		forAnonOnly: true,
		sig: '~~~~'
	},
	// uw-prefixed
	'uw-3block': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '违反[[WP:3RR|回退不过三原则]]', hant: '違反[[WP:3RR|回退不過三原則]]' }),
		summary: conv({ hans: '封禁通知：违反[[WP:3RR|回退不过三原则]]', hant: '封鎖通知：違反[[WP:3RR|回退不過三原則]]' })
	},
	'uw-ablock': {
		autoblock: true,
		expiry: '1 day',
		forAnonOnly: true,
		nocreate: true,
		pageParam: true,
		reasonParam: true,
		summary: conv({ hans: '封禁通知', hant: '封鎖通知' }),
		suppressArticleInSummary: true
	},
	'uw-adblock': {
		autoblock: true,
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:SOAP|散发广告/宣传]]', hant: '[[WP:SOAP|散發廣告/宣傳]]' }),
		summary: conv({ hans: '封禁通知：散发[[WP:SOAP|散发广告/宣传]]', hant: '封鎖通知：散發[[WP:SOAP|散發廣告/宣傳]]' }),
		templateName: 'uw-block'
	},
	'uw-block': {
		autoblock: true,
		expiry: '1 day',
		forRegisteredOnly: true,
		nocreate: true,
		pageParam: true,
		reasonParam: true,
		summary: conv({ hans: '封禁通知', hant: '封鎖通知' }),
		suppressArticleInSummary: true
	},
	'uw-blockindef': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		pageParam: true,
		reasonParam: true,
		summary: conv({ hans: '封禁通知', hant: '封鎖通知' }),
		suppressArticleInSummary: true
	},
	'uw-blocknotalk': {
		disabletalk: true,
		pageParam: true,
		reasonParam: true,
		summary: conv({ hans: '封禁通知：禁止编辑讨论页', hant: '封鎖通知：禁止編輯討論頁' }),
		suppressArticleInSummary: true
	},
	'uw-copyrightblock': {
		autoblock: true,
		expiry: 'infinity',
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '多次加入[[WP:COPYVIO|侵犯著作权]]的内容', hant: '多次加入[[WP:COPYVIO|侵犯著作權]]的內容' }),
		summary: conv({ hans: '封禁通知：持续[[WP:COPYVIO|侵犯著作权]]', hant: '封鎖通知：持續[[WP:COPYVIO|侵犯著作權]]' }),
		templateName: 'uw-blockindef'
	},
	'uw-dblock': {
		autoblock: true,
		nocreate: true,
		reason: conv({ hans: '持续无故删除内容', hant: '持續無故刪除內容' }),
		pageParam: true,
		summary: conv({ hans: '封禁通知：持续[[WP:VAN|删除内容]]', hant: '封鎖通知：持續[[WP:VAN|刪除內容]]' })
	},
	'uw-hblock': {
		autoblock: true,
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:骚扰|骚扰用户]]', hant: '[[WP:騷擾|騷擾使用者]]' }),
		summary: conv({ hans: '封禁通知：[[WP:骚扰|骚扰]]其他用户', hant: '封鎖通知：[[WP:騷擾|騷擾]]其他使用者' }),
		templateName: 'uw-block'
	},
	'uw-npblock': {
		autoblock: true,
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:VAN|在条目中增加无意义文字]]', hant: '[[WP:VAN|在條目中增加無意義文字]]' }),
		summary: conv({ hans: '封禁通知：[[WP:VAN|在条目中增加无意义文字]]', hant: '封鎖通知：[[WP:VAN|在條目中增加無意義文字]]' }),
		templateName: 'uw-block'
	},
	'uw-pablock': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		reason: conv({ hans: '无礼的行为、[[WP:NPA|攻击别人]]', hant: '無禮的行為、[[WP:NPA|攻擊別人]]' }),
		summary: conv({ hans: '封禁通知：无礼的行为、[[WP:NPA|人身攻击]]', hant: '封鎖通知：無禮的行為、[[WP:NPA|人身攻擊]]' }),
		templateName: 'uw-block'
	},
	'uw-sblock': {
		autoblock: true,
		nocreate: true,
		reason: conv({ hans: '不断加入[[Wikipedia:垃圾内容|垃圾链接]]', hant: '不斷加入[[Wikipedia:垃圾內容|垃圾連結]]' }),
		summary: conv({ hans: '封禁通知：利用维基百科散发[[Wikipedia:垃圾内容|垃圾链接]]', hant: '封鎖通知：利用維基百科散發[[Wikipedia:垃圾內容|垃圾連結]]' })
	},
	'uw-soablock': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:SOAP|散发广告/宣传]]', hant: '[[WP:SOAP|散發廣告/宣傳]]' }),
		summary: conv({ hans: '封禁通知：仅[[WP:SOAP|散发广告/宣传]]', hant: '封鎖通知：僅[[WP:SOAP|散發廣告/宣傳]]' }),
		templateName: 'uw-block'
	},
	'uw-sockblock': {
		autoblock: true,
		expiry: '1 week',
		forRegisteredOnly: true,
		nocreate: true,
		reason: conv({ hans: '滥用[[WP:SOCK|多个账户]]', hant: '濫用[[WP:SOCK|多個帳號]]' }),
		summary: conv({ hans: '封禁通知：滥用[[WP:SOCK|多个账户]]', hant: '封鎖通知：濫用[[WP:SOCK|多個帳號]]' }),
		templateName: 'uw-block'
	},
	'uw-softerblock': {
		expiry: 'infinity',
		forRegisteredOnly: true,
		reason: '{{uw-softerblock}}<!-- ' + conv({ hans: '宣传性用户名、软封禁', hant: '宣傳性使用者名稱、軟封鎖' }) + ' -->',
		summary: conv({ hans: '封禁通知：您的[[WP:U|用户名]]暗示您的账户代表一个团体、组织或网站', hant: '封鎖通知：您的[[WP:U|使用者名稱]]暗示您的帳號代表一個團體、組織或網站' })
	},
	'uw-spamublock': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reason: '{{uw-spamublock}}<!-- ' + conv({ hans: '宣传性用户名、宣传性编辑', hant: '宣傳性使用者名稱、宣傳性編輯' }) + ' -->',
		summary: conv({ hans: '封禁通知：仅[[WP:SOAP|广告宣传]]，同时您的用户名违反[[WP:U|用户名方针]]', hant: '封鎖通知：僅[[WP:SOAP|廣告宣傳]]，同時您的使用者名稱違反[[WP:U|使用者名稱方針]]' })
	},
	'uw-ublock': {
		expiry: 'infinity',
		forRegisteredOnly: true,
		reason: '{{uw-ublock}}<!-- ' + conv({ hans: '不当用户名、软封禁', hant: '不當使用者名稱、軟封鎖' }) + ' -->',
		summary: conv({ hans: '封禁通知：您的用户名违反[[WP:U|用户名方针]]', hant: '封鎖通知：您的使用者名稱違反[[WP:U|使用者名稱方針]]' })
	},
	'uw-ublock-double': {
		expiry: 'infinity',
		forRegisteredOnly: true,
		reason: '{{uw-ublock-double}}<!-- ' + conv({ hans: '用户名与其他用户相似、软封禁', hant: '使用者名稱與其他使用者相似、軟封鎖' }) + ' -->',
		summary: conv({ hans: '封禁通知：您的[[WP:U|用户名]]与其他维基百科用户过于相似', hant: '封鎖通知：您的[[WP:U|使用者名稱]]與其他維基百科使用者過於相似' })
	},
	'uw-ucblock': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '屡次增加没有[[WP:RS|可靠来源]]的资料', hant: '屢次增加沒有[[WP:RS|可靠來源]]的資料' }),
		summary: conv({ hans: '封禁通知：屡次增加没有[[WP:RS|可靠来源]]的资料', hant: '封鎖通知：屢次增加沒有[[WP:RS|可靠來源]]的資料' }),
		templateName: 'uw-block'
	},
	'uw-ublock-wellknown': {
		expiry: 'infinity',
		forRegisteredOnly: true,
		reason: '{{uw-ublock-wellknown}}<!-- ' + conv({ hans: '用户名与知名人物相似、软封禁', hant: '使用者名稱與知名人物相似、軟封鎖' }) + ' -->',
		summary: conv({ hans: '封禁通知：您的[[WP:U|用户名]]与知名人物过于相似', hant: '封鎖通知：您的[[WP:U|使用者名稱]]與知名人物過於相似' })
	},
	'uw-uhblock-double': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reason: '{{uw-uhblock-double}}<!-- ' + conv({ hans: '用户名试图冒充其他用户、硬封禁', hant: '使用者名稱試圖冒充其他使用者、硬封鎖' }) + ' -->',
		summary: conv({ hans: '封禁通知：您的[[WP:U|用户名]]试图冒充其他维基百科用户', hant: '封鎖通知：您的[[WP:U|使用者名稱]]試圖冒充其他維基百科使用者' })
	},
	'uw-ublock|误导': {
		expiry: 'infinity',
		reason: conv({ hans: '{{uw-ublock|误导}}', hant: '{{uw-ublock|誤導}}' }),
		summary: conv({ hans: '封禁通知：误导性用户名', hant: '封鎖通知：誤導性使用者名稱' })
	},
	'uw-ublock|宣传': {
		expiry: 'infinity',
		reason: conv({ hans: '{{uw-ublock|宣传}}', hant: '{{uw-ublock|宣傳}}' }),
		summary: conv({ hans: '封禁通知：宣传性用户名', hant: '封鎖通知：宣傳性使用者名稱' })
	},
	'uw-ublock|攻击|或侮辱性': {
		expiry: 'infinity',
		reason: conv({ hans: '{{uw-ublock|攻击|或侮辱性}}', hant: '{{uw-ublock|攻擊|或侮辱性}}' }),
		summary: conv({ hans: '封禁通知：攻击或侮辱性用户名', hant: '封鎖通知：攻擊或侮辱性使用者名稱' })
	},
	'uw-ublock|混淆': {
		expiry: 'infinity',
		reason: '{{uw-ublock|混淆}}',
		summary: conv({ hans: '封禁通知：令人混淆的用户名', hant: '封鎖通知：令人混淆的使用者名稱' })
	},
	'uw-vblock': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:VAN|破坏]]', hant: '[[WP:VAN|破壞]]' }),
		summary: conv({ hans: '封禁通知：[[WP:VAN|破坏]]', hant: '封鎖通知：[[WP:VAN|破壞]]' })
	},
	'uw-voablock': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		pageParam: true,
		reason: conv({ hans: '[[WP:VOA|纯粹破坏]]', hant: '[[WP:VOA|純粹破壞]]' }),
		summary: conv({ hans: '封禁通知：您的账户仅用于[[WP:VAN|破坏]]', hant: '封鎖通知：您的帳號僅用於[[WP:VAN|破壞]]' }),
		templateName: 'uw-blockindef'
	},
	'Bot block message': {
		expiry: 'infinity',
		forRegisteredOnly: true,
		reason: conv({ hans: '机器人故障', hant: '機器人故障' }),
		summary: conv({ hans: '封禁通知：机器人故障', hant: '封鎖通知：機器人故障' }),
		sig: '~~~~'
	},

	// zhwiki
	'vcc-violation': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		pageParam: true,
		reasonParam: true,
		reason: conv({ hans: '[[WP:VAN#LANG|繁简破坏]]', hant: '[[WP:VAN#LANG|繁簡破壞]]' }),
		summary: conv({ hans: '封禁通知：[[WP:VAN#LANG|无故替换繁简用字]]', hant: '封鎖通知：[[WP:VAN#LANG|無故替換繁簡用字]]' }),
		templateName: 'uw-block'
	},
	'cross-wiki-van': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '跨维基项目破坏', hant: '跨維基項目破壞' }),
		summary: conv({ hans: '封禁通知：跨维基项目[[WP:VAN|破坏]]', hant: '封鎖通知：跨維基項目[[WP:VAN|破壞]]' }),
		templateName: 'uw-blockindef'
	},
	'point-block': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '[[WP:POINT|为了阐释观点而扰乱维基百科]]', hant: '[[WP:POINT|為了闡釋觀點而擾亂維基百科]]' }),
		summary: conv({ hans: '封禁通知：[[WP:POINT|为了阐释观点而扰乱维基百科]]', hant: '封鎖通知：[[WP:POINT|為了闡釋觀點而擾亂維基百科]]' }),
		templateName: 'uw-block'
	},
	'game-block': {
		autoblock: true,
		expiry: '1 day',
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '[[WP:GAME|游戏维基规则]]', hant: '[[WP:GAME|遊戲維基規則]]' }),
		summary: conv({ hans: '封禁通知：[[WP:GAME|游戏维基规则]]', hant: '封鎖通知：[[WP:GAME|遊戲維基規則]]' }),
		templateName: 'uw-block'
	},
	'sock-contribs-anon': {
		autoblock: true,
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根据用户贡献确定', hant: '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根據使用者貢獻確定' }),
		summary: conv({ hans: '封禁通知：[[WP:SOCK|使用其他IP地址绕过封禁]]', hant: '封鎖通知：[[WP:SOCK|使用其他IP位址繞過封鎖]]' }),
		templateName: 'uw-ablock'
	},
	'sock-cu-anon': {
		autoblock: true,
		expiry: '1 week',
		forAnonOnly: true,
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 用户查核确认', hant: '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 使用者查核確認' }),
		summary: conv({ hans: '封禁通知：[[WP:SOCK|使用其他IP地址绕过封禁]]', hant: '封鎖通知：[[WP:SOCK|使用其他IP位址繞過封鎖]]' }),
		templateName: 'uw-ablock'
	},
	'sock-contribs-reg': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根据用户贡献确定', hant: '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 根據使用者貢獻確定' }),
		summary: conv({ hans: '封禁通知：确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]', hant: '封鎖通知：確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]' }),
		templateName: 'uw-blockindef'
	},
	'sock-cu-reg': {
		autoblock: true,
		expiry: 'infinity',
		forRegisteredOnly: true,
		nocreate: true,
		reasonParam: true,
		reason: conv({ hans: '确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 用户查核确认', hant: '確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]] - 使用者查核確認' }),
		summary: conv({ hans: '封禁通知：确认为[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]', hant: '封鎖通知：確認為[[WP:SOCK|傀儡]]或[[WP:MEAT|真人傀儡]]' }),
		templateName: 'uw-blockindef'
	},

	// Begin partial block templates, accessed in Twinkle.block.blockGroupsPartial
	'uw-pblock': {
		autoblock: true,
		expiry: '1 day',
		nocreate: false,
		pageParam: false,
		reasonParam: true,
		summary: conv({ hans: '封禁通知：您已被禁止编辑维基百科的部分区域', hant: '封鎖通知：您已被禁止編輯維基百科的部分區域' })
	}
};

Twinkle.block.transformBlockPresets = function twinkleblockTransformBlockPresets() {
	// zhwiki: Merge custom reason
	$.each(Twinkle.getPref('customBlockReasonList'), function(_, item) {
		var newKey = item.value + '|' + item.label;
		Twinkle.block.blockPresetsInfo[newKey] = Object.assign(
			{},
			{
				autoblock: true,
				nocreate: true
			},
			Twinkle.block.blockPresetsInfo[item.value],
			{
				reason: item.label,
				templateName: item.value
			}
		);
		if (Twinkle.block.blockPresetsInfo[item.value] === undefined) {
			Twinkle.block.blockPresetsInfo[item.value] = {
				pageParam: true,
				reasonParam: true,
				custom: true
			};
		}
	});

	// supply sensible defaults
	$.each(Twinkle.block.blockPresetsInfo, function(preset, settings) {
		settings.summary = settings.summary || settings.reason;
		settings.sig = settings.sig !== undefined ? settings.sig : 'yes';
		settings.indefinite = settings.indefinite || Morebits.string.isInfinity(settings.expiry);

		if (!Twinkle.block.isRegistered && settings.indefinite) {
			settings.expiry = '1 day';
		} else {
			settings.expiry = settings.expiry || '1 day';
		}
		// zhwiki
		if (!Twinkle.block.isRegistered && ['uw-block', 'uw-blockindef'].indexOf(settings.templateName) > -1) {
			settings.templateName = 'uw-ablock';
		}

		Twinkle.block.blockPresetsInfo[preset] = settings;
	});
};

// These are the groups of presets and defines the order in which they appear. For each list item:
//   label: <string, the description that will be visible in the dropdown>
//   value: <string, the key of a preset in blockPresetsInfo>
//   meta: <boolean, show in templates only, zhwiki>
Twinkle.block.blockGroups = [
	{
		label: conv({ hans: '常见封禁理由', hant: '常見封鎖理由' }),
		list: [
			{ label: conv({ hans: '通用封禁（自定义理由）', hant: '通用封鎖（自訂理由）' }), value: 'uw-block' },
			{ label: conv({ hans: '通用封禁（自定义理由） - IP', hant: '通用封鎖（自訂理由） - IP' }), value: 'uw-ablock' },
			{ label: conv({ hans: '通用封禁（自定义理由） - 无限期', hant: '通用封鎖（自訂理由） - 無限期' }), value: 'uw-blockindef' },
			{ label: conv({ hans: '破坏', hant: '破壞' }), value: 'uw-vblock', selected: true },
			{ label: conv({ hans: '繁简破坏', hant: '繁簡破壞' }), value: 'vcc-violation' },
			{ label: conv({ hans: '跨维基项目破坏', hant: '跨維基項目破壞' }), value: 'cross-wiki-van' },
			{ label: conv({ hans: '纯粹破坏', hant: '純粹破壞' }), value: 'uw-voablock' },
			{ label: conv({ hans: '不断加入垃圾链接', hant: '不斷加入垃圾連結' }), value: 'uw-sblock' },
			{ label: conv({ hans: '散发广告/宣传', hant: '散發廣告/宣傳' }), value: 'uw-adblock' },
			{ label: conv({ hans: '仅散发广告/宣传', hant: '僅散發廣告/宣傳' }), value: 'uw-soablock' },
			{ label: conv({ hans: '违反回退不过三原则', hant: '違反回退不過三原則' }), value: 'uw-3block' },
			{ label: conv({ hans: '无礼的行为、人身攻击', hant: '無禮的行為、人身攻擊' }), value: 'uw-pablock' },
			{ label: conv({ hans: '骚扰用户', hant: '騷擾使用者' }), value: 'uw-hblock' },
			{ label: conv({ hans: '为了阐释观点而扰乱维基百科', hant: '為了闡釋觀點而擾亂維基百科' }), value: 'point-block' },
			{ label: conv({ hans: '游戏维基规则', hant: '遊戲維基規則' }), value: 'game-block' },
			{ label: conv({ hans: '确认为傀儡或真人傀儡 - 根据用户贡献确定', hant: '確認為傀儡或真人傀儡 - 根據使用者貢獻確定' }), value: 'sock-contribs-anon' },
			{ label: conv({ hans: '确认为傀儡或真人傀儡 - 用户查核确认', hant: '確認為傀儡或真人傀儡 - 使用者查核確認' }), value: 'sock-contribs-anon' },
			{ label: conv({ hans: '确认为傀儡或真人傀儡 - 根据用户贡献确定', hant: '確認為傀儡或真人傀儡 - 根據使用者貢獻確定' }), value: 'sock-contribs-reg' },
			{ label: conv({ hans: '确认为傀儡或真人傀儡 - 用户查核确认', hant: '確認為傀儡或真人傀儡 - 使用者查核確認' }), value: 'sock-cu-reg' },
			{ label: conv({ hans: '滥用多个账户', hant: '濫用多個帳號' }), value: 'uw-sockblock' },
			{ label: conv({ hans: '屡次增加没有可靠来源的资料', hant: '屢次增加沒有可靠來源的資料' }), value: 'uw-ucblock' },
			{ label: conv({ hans: '在条目中增加无意义文字', hant: '在條目中增加無意義文字' }), value: 'uw-npblock' },
			{ label: conv({ hans: '无故删除内容', hant: '無故刪除內容' }), value: 'uw-dblock' },
			{ label: conv({ hans: '多次加入侵犯著作权的内容', hant: '多次加入侵犯著作權的內容' }), value: 'uw-copyrightblock' },
			{ label: conv({ hans: '机器人发生故障并必须紧急停止', hant: '機器人發生故障並必須緊急停止' }), value: 'Bot block message' },
			{ label: conv({ hans: '禁止编辑讨论页', hant: '禁止編輯討論頁' }), value: 'uw-blocknotalk', meta: true }
		]
	},
	{
		custom: true,
		label: conv({ hans: '自定义封禁理由', hant: '自訂封鎖理由' })
	},
	{
		label: conv({ hans: '用户名封禁', hant: '使用者名稱封鎖' }),
		list: [
			{ label: conv({ hans: '宣传性用户名、宣传性编辑', hant: '宣傳性使用者名稱、宣傳性編輯' }), value: 'uw-spamublock' },
			{ label: conv({ hans: '宣传性用户名、软封禁', hant: '宣傳性使用者名稱、軟封鎖' }), value: 'uw-softerblock' },
			{ label: conv({ hans: '用户名与其他用户相似、软封禁', hant: '使用者名稱與其他使用者相似、軟封鎖' }), value: 'uw-ublock-double' },
			{ label: conv({ hans: '不当用户名、软封禁', hant: '不當使用者名稱、軟封鎖' }), value: 'uw-ublock' },
			{ label: conv({ hans: '用户名试图冒充其他用户、硬封禁', hant: '使用者名稱試圖冒充其他使用者、硬封鎖' }), value: 'uw-uhblock-double' },
			{ label: conv({ hans: '用户名与知名人物相似、软封禁', hant: '使用者名稱與知名人物相似、軟封鎖' }), value: 'uw-ublock-wellknown' },
			{ label: conv({ hans: '误导性用户名', hant: '誤導性使用者名稱' }), value: 'uw-ublock|误导' },
			{ label: conv({ hans: '宣传性用户名', hant: '宣傳性使用者名稱' }), value: 'uw-ublock|宣传' },
			{ label: conv({ hans: '攻击性用户名', hant: '攻擊性使用者名稱' }), value: 'uw-ublock|攻击|或侮辱性' },
			{ label: conv({ hans: '混淆性用户名', hant: '混淆性使用者名稱' }), value: 'uw-ublock|混淆' }
		]
	},
	{
		label: '其他模板',
		list: [
			{ label: 'anonblock', value: 'anonblock', forAnonOnly: true },
			{ label: 'range block', value: 'range block', forAnonOnly: true },
			{ label: 'school block', value: 'school block', forAnonOnly: true },
			{ label: 'blocked proxy', value: 'blocked proxy', forAnonOnly: true },
			{ label: 'CheckUser block', value: 'CheckUser block', forAnonOnly: true },
			{ label: 'checkuserblock-account', value: 'checkuserblock-account', forRegisteredOnly: true }
		]
	}
];

Twinkle.block.blockGroupsPartial = [
	{
		label: conv({ hans: '常见部分封禁理由', hant: '常見部分封鎖理由' }),
		list: [
			{ label: conv({ hans: '通用部分封禁（自定义理由）', hant: '通用部分封鎖（自訂理由）' }), value: 'uw-pblock', selected: true }
		]
	}
];


Twinkle.block.callback.filtered_block_groups = function twinkleblockCallbackFilteredBlockGroups(group, show_template) {
	return $.map(group, function(blockGroup) {
		// zhwiki: Add custom reason
		if (blockGroup.custom) {
			if (show_template) {
				var templates = $.map(Twinkle.getPref('customBlockReasonList'), function(item) {
					if (Twinkle.block.blockPresetsInfo[item.value].custom) {
						return item.value;
					}
				});
				templates = Morebits.array.uniq(templates);
				blockGroup.list = $.map(templates, function(template) {
					return {
						label: conv({ hans: '自定义模板', hant: '自訂模板' }),
						value: template
					};
				});
			} else {
				blockGroup.list = $.map(Twinkle.getPref('customBlockReasonList'), function(item) {
					return {
						label: item.label,
						value: item.value + '|' + item.label
					};
				});
			}
		}

		var list = $.map(blockGroup.list, function(blockPreset) {
			// zhwiki
			if (!show_template && blockPreset.meta) {
				return;
			}

			switch (blockPreset.value) {
				case 'range block':
					if (!Morebits.ip.isRange(relevantUserName)) {
						return;
					}
					blockPreset.selected = !Morebits.ip.get64(relevantUserName);
					break;
				default:
					break;
			}

			var blockSettings = Twinkle.block.blockPresetsInfo[blockPreset.value];

			var registrationRestrict;
			if (blockSettings.forRegisteredOnly) {
				registrationRestrict = Twinkle.block.isRegistered;
			} else if (blockSettings.forAnonOnly) {
				registrationRestrict = !Twinkle.block.isRegistered;
			} else {
				registrationRestrict = true;
			}

			if (!(blockSettings.templateName && show_template) && registrationRestrict) {
				var templateName = blockSettings.templateName || blockPreset.value;
				return {
					label: (show_template ? '{{' + templateName + '}}: ' : '') + blockPreset.label,
					value: blockPreset.value,
					data: [{
						name: 'template-name',
						value: templateName
					}],
					selected: !!blockPreset.selected,
					disabled: !!blockPreset.disabled
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
	var form = e.target.form, key = form.preset.value;
	if (!key) {
		return;
	}

	Twinkle.block.callback.update_form(e, Twinkle.block.blockPresetsInfo[key]);
	if (form.template) {
		form.template.value = Twinkle.block.blockPresetsInfo[key].templateName || key;
		Twinkle.block.callback.change_template(e);
	}
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
		new RegExp('(<!-- )(参见|參見)' + Twinkle.block.seeAlsos.join('、') + '( -->)'), ''
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
		this.form.reason.value = reason + '<!-- ' + conv({ hans: '参见', hant: '參見' }) + seeAlsoMessage + ' -->';
	}
};

// zhwiki: No ds

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
	if (Twinkle.block.userIsBot || /bot\b/i.test(relevantUserName)) {
		data.autoblock = false;
	}

	$(form).find('[name=field_block_options]').find(':checkbox').each(function(i, el) {
		// don't override original options if useInitialOptions is set
		if (data.useInitialOptions && data[el.name] === undefined) {
			return;
		}
		if (el.name === 'closevip') {
			return;
		}

		var check = data[el.name] === '' || !!data[el.name];
		$(el).prop('checked', check);
	});

	if (data.prependReason && data.reason) {
		form.reason.value = data.reason + '；' + form.reason.value;
	} else {
		form.reason.value = data.reason || '';
	}

	// Clear and/or set any partial page or namespace restrictions
	if (form.pagerestrictions) {
		var $pageSelect = $(form).find('[name=pagerestrictions]');
		var $namespaceSelect = $(form).find('[name=namespacerestrictions]');

		// Respect useInitialOptions by clearing data when switching presets
		// In practice, this will always clear, since no partial presets use it
		if (!data.useInitialOptions) {
			$pageSelect.val(null).trigger('change');
			$namespaceSelect.val(null).trigger('change');
		}

		// Add any preset options; in practice, just used for prior block settings
		if (data.restrictions) {
			if (data.restrictions.pages && !$pageSelect.val().length) {
				var pages = data.restrictions.pages.map(function(pr) {
					return pr.title;
				});
				// since page restrictions use an ajax source, we
				// short-circuit that and just add a new option
				pages.forEach(function(page) {
					if (!$pageSelect.find("option[value='" + $.escapeSelector(page) + "']").length) {
						var newOption = new Option(page, page, true, true);
						$pageSelect.append(newOption);
					}
				});
				$pageSelect.val($pageSelect.val().concat(pages)).trigger('change');
			}
			if (data.restrictions.namespaces) {
				$namespaceSelect.val($namespaceSelect.val().concat(data.restrictions.namespaces)).trigger('change');
			}
		}
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
		Morebits.quickForm.setElementVisibility(form.noemail_template.parentNode, partialBox);
		Morebits.quickForm.setElementVisibility(form.nocreate_template.parentNode, partialBox);
	} else if (templateBox) { // Only present if block && template forms both visible
		Morebits.quickForm.setElementVisibility(
			form.blank_duration.parentNode,
			!settings.indefinite && !settings.nonstandard
		);
	}

	// Only particularly relevant if template form is present
	Morebits.quickForm.setElementVisibility(form.article.parentNode, settings && !!settings.pageParam);
	Morebits.quickForm.setElementVisibility(form.block_reason.parentNode, settings && !!settings.reasonParam);

	// zhwiki: Apply reason from blockPresetsInfo
	if (settings.reasonParam) {
		form.block_reason.value = Twinkle.block.blockPresetsInfo[form.preset.value].reason || '';
	} else {
		form.block_reason.value = '';
	}

	// Partial block
	Morebits.quickForm.setElementVisibility(form.area.parentNode, partialBox && !blockBox);

	form.root.previewer.closePreview();
};
Twinkle.block.prev_template_expiry = null;

Twinkle.block.callback.preview = function twinkleblockcallbackPreview(form) {
	var params = {
		article: form.article.value,
		blank_duration: form.blank_duration ? form.blank_duration.checked : false,
		disabletalk: form.disabletalk.checked || (form.notalk ? form.notalk.checked : false),
		expiry: form.template_expiry ? form.template_expiry.value : form.expiry.value,
		hardblock: Twinkle.block.isRegistered ? form.autoblock.checked : form.hardblock.checked,
		indefinite: Morebits.string.isInfinity(form.template_expiry ? form.template_expiry.value : form.expiry.value),
		reason: form.block_reason.value,
		template: form.template.value,
		partial: $(form).find('[name=actiontype][value=partial]').is(':checked'),
		pagerestrictions: $(form.pagerestrictions).val() || [],
		namespacerestrictions: $(form.namespacerestrictions).val() || [],
		noemail: form.noemail.checked || (form.noemail_template ? form.noemail_template.checked : false),
		nocreate: form.nocreate.checked || (form.nocreate_template ? form.nocreate_template.checked : false),
		area: form.area.value
	};

	var templateText = Twinkle.block.callback.getBlockNoticeWikitext(params);

	form.previewer.beginRender(templateText, 'User_talk:' + relevantUserName + '/Wikitext'); // Force wikitext/correct username
};

Twinkle.block.callback.evaluate = function twinkleblockCallbackEvaluate(e) {
	var params = Morebits.quickForm.getInputData(e.target);

	var $form = $(e.target),
		toBlock = $form.find('[name=actiontype][value=block]').is(':checked'),
		toWarn = $form.find('[name=actiontype][value=template]').is(':checked'),
		toPartial = $form.find('[name=actiontype][value=partial]').is(':checked'),
		toTag = $form.find('[name=actiontype][value=tag]').is(':checked'),
		toProtect = $form.find('[name=actiontype][value=protect]').is(':checked'),
		toUnblock = $form.find('[name=actiontype][value=unblock]').is(':checked'),
		blockoptions = {}, templateoptions = {}, unblockoptions = {};

	Twinkle.block.callback.saveFieldset($form.find('[name=field_block_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_template_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_tag_options]'));
	Twinkle.block.callback.saveFieldset($form.find('[name=field_unblock_options]'));

	blockoptions = Twinkle.block.field_block_options;
	unblockoptions = Twinkle.block.field_unblock_options;

	var toClosevip = !!blockoptions.closevip;

	templateoptions = Twinkle.block.field_template_options;

	templateoptions.disabletalk = !!(templateoptions.disabletalk || blockoptions.disabletalk);
	templateoptions.hardblock = !!blockoptions.hardblock;

	// remove extraneous
	delete blockoptions.expiry_preset;
	delete blockoptions.closevip;

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

	// zhwiki
	templateoptions.preset = toBlock ? params.preset : null;

	// Check tags
	// Given an array of incompatible tags, check if we have two or more selected
	var checkIncompatible = function(conflicts, extra) {
		var count = conflicts.reduce(function(sum, tag) {
			return sum += params.tag.indexOf(tag) !== -1;
		}, 0);
		if (count > 1) {
			var message = conv({ hans: '请在以下标签中择一使用', hant: '請在以下標籤中擇一使用' }) + '：{{' + conflicts.join('}}、{{') + '}}。';
			message += extra ? extra : '';
			alert(message);
			return true;
		}
	};

	if (toTag) {
		if (params.tag.length === 0) {
			return alert(conv({ hans: '请至少选择一个用户页标记！', hant: '請至少選擇一個使用者頁面標記！' }));
		}

		if (checkIncompatible(['Blocked user', 'Sockpuppet'], conv({ hans: '{{Sockpuppet}}已涵盖{{Blocked user}}的功能。', hant: '{{Sockpuppet}}已涵蓋{{Blocked user}}的功能。' }))) {
			return;
		}
		if (checkIncompatible(['Blocked user', 'Sockpuppeteer'], conv({ hans: '{{Sockpuppeteer}}已涵盖{{Blocked user}}的功能。', hant: '{{Sockpuppeteer}}已涵蓋{{Blocked user}}的功能。' }))) {
			return;
		}
		if (checkIncompatible(['Blocked user', 'Locked global account'], conv({ hans: '请使用{{Locked global account}}的“亦被本地封禁”选项。', hant: '請使用{{Locked global account}}的「亦被本地封鎖」選項。' }))) {
			return;
		}
		if (checkIncompatible(['Sockpuppet', 'Sockpuppeteer'], conv({ hans: '请从主账户和分身账户中选择一个。', hant: '請從主帳號和分身帳號中選擇一個。' }))) {
			return;
		}

		if (params.tag.indexOf('Sockpuppet') > -1) {
			if (params.sppUsername.trim() === '') {
				return alert(conv({ hans: '请提供傀儡账户的主账户用户名！', hant: '請提供傀儡帳號的主帳號使用者名稱！' }));
			}
			if (blockoptions.reason) {
				blockoptions.reason += ' - [[User:' + params.sppUsername.trim() + ']]的傀儡';
			}
		}
	}

	if (toBlock) {
		if (blockoptions.partial) {
			if (blockoptions.disabletalk && blockoptions.namespacerestrictions.indexOf('3') === -1) {
				return alert(conv({ hans: '部分封禁无法阻止编辑自己的讨论页，除非也封禁了User talk命名空间！', hant: '部分封鎖無法阻止編輯自己的討論頁，除非也封鎖了User talk命名空間！' }));
			}
			if (!blockoptions.namespacerestrictions && !blockoptions.pagerestrictions) {
				if (!blockoptions.noemail && !blockoptions.nocreate) { // Blank entries technically allowed [[phab:T208645]]
					return alert(conv({ hans: '没有选择页面或命名空间，也没有停用电子邮件或禁止创建账户；请选择至少一个选项以应用部分封禁！', hant: '沒有選擇頁面或命名空間，也沒有停用電子郵件或禁止建立帳號；請選擇至少一個選項以應用部分封鎖！' }));
				} else if (!confirm(conv({ hans: '您将要进行封禁，但没有阻止任何页面或命名空间的编辑，确定要继续？', hant: '您將要進行封鎖，但沒有阻止任何頁面或命名空間的編輯，確定要繼續？' }))) {
					return;
				}
			}
		}
		if (!blockoptions.expiry) {
			return alert(conv({ hans: '请提供过期时间！', hant: '請提供過期時間！' }));
		} else if (Morebits.string.isInfinity(blockoptions.expiry) && !Twinkle.block.isRegistered) {
			return alert(conv({ hans: '禁止无限期封禁IP地址！', hant: '禁止無限期封鎖IP位址！' }));
		}
		if (!blockoptions.reason) {
			return alert(conv({ hans: '请提供封禁理由！', hant: '請提供封鎖理由！' }));
		}

		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);
		var statusElement = new Morebits.status(conv({ hans: '执行封禁', hant: '執行封鎖' }));
		blockoptions.action = 'block';

		blockoptions.user = relevantUserName;

		// boolean-flipped options
		blockoptions.anononly = blockoptions.hardblock ? undefined : true;
		blockoptions.allowusertalk = blockoptions.disabletalk ? undefined : true;

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
		// bkusers doesn't catch single IPs blocked as part of a range block
		if (mw.util.isIPAddress(blockoptions.user, true)) {
			query.bkip = blockoptions.user;
		} else {
			query.bkusers = blockoptions.user;
			query.list += '|users';
			query.usprop = 'groups';
			query.ususers = blockoptions.user;
			query.meta = 'tokens';
			query.type = 'userrights';
		}
		api.get(query).then(function(data) {
			var block = data.query.blocks[0];
			// As with the initial data fetch, if an IP is blocked
			// *and* rangeblocked, this would only grab whichever
			// block is more recent, which would likely mean a
			// mismatch.  However, if the rangeblock is updated
			// while filling out the form, this won't detect that,
			// but that's probably fine.
			if (data.query.blocks.length > 1 && block.user !== relevantUserName) {
				block = data.query.blocks[1];
			}
			var logevents = data.query.logevents[0];
			var user = data.query.users ? data.query.users[0] : null;
			var logid = data.query.logevents.length ? logevents.logid : false;

			if (logid !== Twinkle.block.blockLogId || !!block !== !!Twinkle.block.currentBlockInfo) {
				var message = blockoptions.user + conv({ hans: '的封禁状态已被修改。', hant: '的封鎖狀態已被修改。' });
				if (block) {
					message += conv({ hans: '新状态：', hant: '新狀態：' });
				} else {
					message += conv({ hans: '最新日志：', hant: '最新日誌：' });
				}

				var logExpiry = '';
				if (logevents.params.duration) {
					if (logevents.params.duration === 'infinity') {
						logExpiry = conv({ hans: '无限期', hant: '無限期' });
					} else {
						var expiryDate = new Morebits.date(logevents.params.expiry);
						logExpiry += (expiryDate.isBefore(new Date()) ? conv({ hans: '过期于', hant: '過期於' }) : '直到') + expiryDate.calendar();
					}
				} else { // no duration, action=unblock, just show timestamp
					logExpiry = '於' + new Morebits.date(logevents.timestamp).calendar();
				}
				message += '由' + logevents.user + conv({ hans: '以“', hant: '以「' }) + logevents.comment + conv({ hans: '”', hant: '」' }) +
					blockActionText[logevents.action] + logExpiry + conv({ hans: '，你想要以你的设置变更封禁吗？', hant: '，你想要以你的設定變更封鎖嗎？' });

				if (!confirm(message)) {
					Morebits.status.info(conv({ hans: '执行封禁', hant: '執行封鎖' }), conv({ hans: '用户取消操作', hant: '使用者取消操作' }));
					return;
				}
				blockoptions.reblock = 1; // Writing over a block will fail otherwise
			}

			var groupsCanBeRemoved = [
				'autoreviewer',
				'confirmed',
				'eventparticipant',
				'filemover',
				'ipblock-exempt',
				'massmessage-sender',
				'patroller',
				'rollbacker',
				'templateeditor',
				'transwiki'
			];
			var groupsToBeRemoved = [];
			if (user && Morebits.string.isInfinity(blockoptions.expiry)) {
				groupsToBeRemoved = user.groups.filter(function (group) {
					return groupsCanBeRemoved.indexOf(group) > -1;
				});
			}

			// execute block
			blockoptions.tags = Twinkle.changeTags;
			blockoptions.token = mw.user.tokens.get('csrfToken');
			var mbApi = new Morebits.wiki.api(conv({ hans: '执行封禁', hant: '執行封鎖' }), blockoptions, function () {
				statusElement.info('完成');
				if (toWarn) {
					Twinkle.block.callback.issue_template(templateoptions);
				}
				if (toClosevip) {
					var vipPage = new Morebits.wiki.page('Wikipedia:当前的破坏', conv({ hans: '关闭请求', hant: '關閉請求' }));
					vipPage.setFollowRedirect(true);
					vipPage.setCallbackParameters(blockoptions);
					vipPage.load(Twinkle.block.callback.closeRequest);
				}
				if (groupsToBeRemoved.length > 0) {
					var rightStatusElement = new Morebits.status(conv({ hans: '移除权限', hant: '移除權限' }));
					if (confirm(conv({ hans: '该用户有以下权限：', hant: '該使用者有以下權限：' }) + groupsToBeRemoved.join('、') + conv({ hans: '，您是否想要同时移除这些权限？', hant: '，您是否想要同時移除這些權限？' }))) {
						var revokeOptions = {
							action: 'userrights',
							user: blockoptions.user,
							remove: groupsToBeRemoved.join('|'),
							reason: conv({ hans: '用户已被无限期封禁', hant: '使用者已被無限期封鎖' }),
							token: data.query.tokens.userrightstoken,
							tags: Twinkle.changeTags
						};
						var mrApi = new Morebits.wiki.api(conv({ hans: '移除权限', hant: '移除權限' }), revokeOptions, function () {
							rightStatusElement.info('已移除' + groupsToBeRemoved.join('、'));
						});
						mrApi.post();
					} else {
						rightStatusElement.error(conv({ hans: '用户取消操作。', hant: '使用者取消操作。' }));
					}
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
		var wikipedia_page = new Morebits.wiki.page(userPage, conv({ hans: '标记或保护用户页', hant: '標記或保護使用者頁面' }));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.block.callback.taguserpage);
	}
	if (toUnblock) {
		if (!unblockoptions.reason) {
			return alert(conv({ hans: '请提供解除封禁理由！', hant: '請提供解除封鎖理由！' }));
		}

		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(e.target);
		var unblockStatusElement = new Morebits.status(conv({ hans: '执行解除封禁', hant: '執行解除封鎖' }));
		unblockoptions.action = 'unblock';
		unblockoptions.user = Morebits.wiki.flow.relevantUserName(true);
		// execute unblock
		unblockoptions.tags = Twinkle.changeTags;
		unblockoptions.token = mw.user.tokens.get('csrfToken');
		var unblockMbApi = new Morebits.wiki.api(conv({ hans: '执行解除封禁', hant: '執行解除封鎖' }), unblockoptions, function () {
			unblockStatusElement.info('完成');
		});
		unblockMbApi.post();
	}
	if (!toBlock && !toWarn && !toTag && !toProtect && !toUnblock) {
		return alert(conv({ hans: '请给Twinkle点事做！', hant: '請給Twinkle點事做！' }));
	}
};

Twinkle.block.callback.taguserpage = function twinkleblockCallbackTagUserpage(pageobj) {
	var params = pageobj.getCallbackParameters();
	var statelem = pageobj.getStatusElement();

	if (params.actiontype.indexOf('tag') > -1) {
		var tags = [];
		params.tag.forEach(function(tag) {
			var tagtext = '{{' + tag;

			switch (tag) {
				case 'Blocked user':
					break;
				case 'Sockpuppet':
					tagtext += '\n| 1 = ' + params.sppUsername.trim();
					tagtext += '\n| 2 = ' + params.sppType.trim();
					if (params.sppEvidence.trim()) {
						tagtext += '\n| evidence = ' + params.sppEvidence.trim();
					}
					tagtext += '\n| locked = no';
					tagtext += '\n| notblocked = no';
					tagtext += '\n';
					break;
				case 'Sockpuppeteer':
					tagtext += '\n| 1 = blocked';
					tagtext += '\n| checked = ' + (params.spmChecked ? 'yes' : '');
					if (params.spmEvidence.trim()) {
						tagtext += '\n| evidence = ' + params.spmEvidence.trim();
					}
					tagtext += '\n';
					break;
				case 'Locked global account':
					if (params.lockBlocked) {
						tagtext += '|blocked=yes';
					}
					break;
				default:
					return alert(conv({ hans: '未知的用户页模板！', hant: '未知的使用者頁面模板！' }));
			}

			tagtext += '}}';
			tags.push(tagtext);
		});

		var text = tags.join('\n');

		if (params.category) {
			text += '\n[[Category:' + params.category.trim() + '的維基用戶分身]]';
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(conv({ hans: '标记被永久封禁的用户页', hant: '標記被永久封鎖的使用者頁面' }));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.save(function() {
			Morebits.status.info(conv({ hans: '标记用户页', hant: '標記使用者頁面' }), '完成');
			statelem.status(conv({ hans: '正在保护页面', hant: '正在保護頁面' }));
			pageobj.load(Twinkle.block.callback.protectuserpage);
		});
	} else {
		Twinkle.block.callback.protectuserpage(pageobj);
	}
};

Twinkle.block.callback.protectuserpage = function twinkleblockCallbackProtectUserpage(pageobj) {
	var params = pageobj.getCallbackParameters();
	var statelem = pageobj.getStatusElement();

	if (params.actiontype.indexOf('protect') > -1) {
		if (pageobj.exists()) {
			pageobj.setEditProtection('sysop', 'indefinite');
			pageobj.setMoveProtection('sysop', 'indefinite');
		} else {
			pageobj.setCreateProtection('sysop', 'indefinite');
		}
		pageobj.setEditSummary(conv({ hans: '被永久封禁的用户页', hant: '被永久封鎖的使用者頁面' }));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.protect(function() {
			Morebits.status.info(conv({ hans: '保护用户页', hant: '保護使用者頁面' }), pageobj.exists() ? conv({ hans: '已全保护', hant: '已全保護' }) : conv({ hans: '已白纸保护', hant: '已白紙保護' }));
			statelem.info('全部完成');
		});
	} else {
		statelem.info('全部完成');
	}
};

Twinkle.block.callback.issue_template = function twinkleblockCallbackIssueTemplate(formData) {
	// Use wgRelevantUserName to ensure the block template goes to a single IP and not to the
	// "talk page" of an IP range (which does not exist)
	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName(true);

	var params = $.extend(formData, {
		messageData: Twinkle.block.blockPresetsInfo[formData.template],
		usertalk_summary: Twinkle.block.blockPresetsInfo[formData.preset || formData.template].summary, // zhwiki
		reason: Twinkle.block.field_template_options.block_reason,
		disabletalk: Twinkle.block.field_template_options.notalk,
		noemail: Twinkle.block.field_template_options.noemail_template,
		nocreate: Twinkle.block.field_template_options.nocreate_template
	});

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = conv({ hans: '完成，将在几秒后加载用户讨论页', hant: '完成，將在幾秒後載入使用者討論頁' });

	Morebits.wiki.flow.check(userTalkPage, function () {
		var flowpage = new Morebits.wiki.flow(userTalkPage, conv({ hans: '用户Flow讨论页留言', hant: '使用者Flow討論頁留言' }));
		flowpage.setCallbackParameters(params);
		Twinkle.block.callback.main_flow(flowpage);
	}, function () {
		var wikipedia_page = new Morebits.wiki.page(userTalkPage, conv({ hans: '用户讨论页修改', hant: '使用者討論頁修改' }));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.block.callback.main);
	});

};

Twinkle.block.callback.closeRequest = function twinkleblockCallbackCloseRequest(vipPage) {
	var params = vipPage.getCallbackParameters();
	var text = vipPage.getPageText();
	var statusElement = vipPage.getStatusElement();
	var userName = Morebits.wiki.flow.relevantUserName(true);

	var expiryText = Morebits.string.formatTime(params.expiry);
	var comment = '{{Blocked|' + (Morebits.string.isInfinity(params.expiry) ? 'indef' : expiryText) + '}}。';

	var requestList = text.split(/(?=\n===.+===\s*\n)/);

	var found = false;
	var hidename = false;
	var vipRe = new RegExp('{{\\s*[Vv]andal\\s*\\|\\s*(1\\s*=\\s*)?' + Morebits.pageNameRegex(userName) + '\\s*(\\|\\s*hidename\\s*=[^|]+)?}}', 'm');
	for (var i = 1; i < requestList.length; i++) {
		if (vipRe.exec(requestList[i])) {
			hidename = /\|\s*hidename\s*=[^|]+/.test(requestList[i]);
			requestList[i] = requestList[i].trimRight();

			var newText = requestList[i].replace(/^(\*\s*处理：)[ \t]*(<!-- 非管理員僅可標記已執行的封禁，針對提報的意見請放在下一行 -->)?[ \t]*$/m, '$1' + comment + '--~~~~');
			if (requestList[i] === newText) {
				newText = requestList[i] + '\n* 处理：' + comment + '--~~~~';
			}

			requestList[i] = newText + '\n';

			found = true;
			break;
		}
	}

	if (!found) {
		statusElement.warn(conv({ hans: '没有找到相关的请求', hant: '沒有找到相關的請求' }));
		return;
	}

	text = requestList.join('');

	var summary;
	if (hidename) {
		summary = conv({ hans: '标记为已处理', hant: '標記為已處理' });
	} else {
		summary = '/* ' + userName + ' */ ';
		if (Morebits.string.isInfinity(params.expiry)) {
			summary += conv({ hans: '不限期封禁', hant: '不限期封鎖' });
		} else {
			summary += conv({ hans: '封禁', hant: '封鎖' }) + expiryText;
		}
	}

	vipPage.setEditSummary(summary);
	vipPage.setChangeTags(Twinkle.changeTags);
	vipPage.setPageText(text);
	vipPage.save();
};

Twinkle.block.callback.getBlockNoticeWikitext = function(params) {
	var text = '{{', settings = Twinkle.block.blockPresetsInfo[params.template];
	if (!settings.nonstandard) {
		text += 'subst:' + params.template;
		if (params.article && settings.pageParam) {
			text += '|page=' + params.article;
		}

		if (!/te?mp|^\s*$|min/.exec(params.expiry)) {
			if (params.indefinite) {
				text += '|indef=yes';
			} else if (!params.blank_duration) { // zhwiki: No expiry checks
				// Block template wants a duration, not date
				text += '|time=' + Morebits.string.formatTime(params.expiry); // zhwiki: formatTime
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
					text += conv({ hans: '[[Wikipedia:命名空间|命名空间]]（', hant: '[[Wikipedia:命名空間|命名空間]]（' }) + makeSentence(namespaceNames) + '）';
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

	if (settings.sig) {
		text += '|sig=' + settings.sig;
	}
	return text + '}}';
};

Twinkle.block.callback.main = function twinkleblockcallbackMain(pageobj) {
	var params = pageobj.getCallbackParameters(),
		date = new Morebits.date(pageobj.getLoadTime()),
		messageData = params.messageData,
		text;

	params.indefinite = Morebits.string.isInfinity(params.expiry);

	if (Twinkle.getPref('blankTalkpageOnIndefBlock') && params.template !== 'uw-lblock' && params.indefinite) {
		Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '根据参数设置清空讨论页并为日期创建新2级标题', hant: '根據偏好設定清空討論頁並為日期建立新2級標題' }));
		text = date.monthHeader() + '\n';
	} else {
		text = pageobj.getPageText();

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

		if (!dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex) {
			Morebits.status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '未找到当月的二级标题，将创建新的', hant: '未找到當月的二級標題，將建立新的' }));
			text += date.monthHeader() + '\n';
		}
	}

	params.expiry = typeof params.template_expiry !== 'undefined' ? params.template_expiry : params.expiry;

	text += Twinkle.block.callback.getBlockNoticeWikitext(params);

	// build the edit summary
	var summary = params.usertalk_summary; // zhwiki
	if (messageData.suppressArticleInSummary !== true && params.article) {
		summary += conv({ hans: '，于', hant: '，於' }) + '[[:' + params.article + ']]';
	}

	pageobj.setPageText(text);
	pageobj.setEditSummary(summary);
	pageobj.setChangeTags(Twinkle.changeTags);
	pageobj.setWatchlist(Twinkle.getPref('watchBlockNotices'));
	pageobj.save();
};

Twinkle.block.callback.main_flow = function twinkleblockcallbackMain(flowobj) {
	var params = flowobj.getCallbackParameters();

	params.indefinite = (/indef|infinity|never|\*|max/).test(params.expiry);
	params.expiry = typeof params.template_expiry !== 'undefined' ? params.template_expiry : params.expiry;

	var title = params.usertalk_summary;
	var content = Twinkle.block.callback.getBlockNoticeWikitext(params, true);

	flowobj.setTopic(title);
	flowobj.setContent(content);
	flowobj.newTopic();
};

Twinkle.addInitCallback(Twinkle.block, 'block');
})(jQuery);


// </nowiki>
