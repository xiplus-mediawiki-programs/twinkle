// <nowiki>


(function() {


/*
 ****************************************
 *** twinkleprotect.js: Protect/RPP module
 ****************************************
 * Mode of invocation:     Tab ("PP"/"RPP")
 * Active on:              Non-special, non-MediaWiki pages
 */

// Note: a lot of code in this module is re-used/called by batchprotect.

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.protect = function twinkleprotect() {
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgNamespaceNumber') === 8) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.protect.callback, conv({ hans: '保护', hant: '保護' }), 'tw-rpp',
		Morebits.userIsSysop ? conv({ hans: '保护页面', hant: '保護頁面' }) : conv({ hans: '请求保护页面', hant: '請求保護頁面' }));
};

Twinkle.protect.callback = function twinkleprotectCallback() {
	var Window = new Morebits.SimpleWindow(620, 530);
	Window.setTitle(Morebits.userIsSysop ? conv({ hans: '施行或请求保护页面', hant: '施行或請求保護頁面' }) : conv({ hans: '请求保护页面', hant: '請求保護頁面' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '保护模板', hant: '保護模板' }), 'Template:Protection templates');
	Window.addFooterLink(conv({ hans: '保护方针', hant: '保護方針' }), 'WP:PROT');
	Window.addFooterLink(conv({ hans: '保护设置', hant: '保護設定' }), 'WP:TW/PREF#protect');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#protect');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.protect.callback.evaluate);
	var actionfield = form.append({
		type: 'field',
		label: conv({ hans: '操作类型', hant: '操作類別' })
	});
	if (Morebits.userIsSysop) {
		actionfield.append({
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: conv({ hans: '保护页面', hant: '保護頁面' }),
					value: 'protect',
					checked: true
				}
			]
		});
	}
	actionfield.append({
		type: 'radio',
		name: 'actiontype',
		event: Twinkle.protect.callback.changeAction,
		list: [
			{
				label: conv({ hans: '请求保护页面', hant: '請求保護頁面' }),
				value: 'request',
				tooltip: conv({ hans: '如果您想在WP:RFPP请求保护此页', hant: '如果您想在WP:RFPP請求保護此頁' }) + (Morebits.userIsSysop ? '而不是自行完成。' : '。'),
				checked: !Morebits.userIsSysop
			},
			{
				label: conv({ hans: '用保护模板标记此页', hant: '用保護模板標記此頁' }),
				value: 'tag',
				tooltip: conv({ hans: '可以用此为页面加上合适的保护模板。', hant: '可以用此為頁面加上合適的保護模板。' }),
				disabled: mw.config.get('wgArticleId') === 0 || mw.config.get('wgPageContentModel') === 'Scribunto'
			}
		]
	});

	form.append({ type: 'field', label: conv({ hans: '默认', hant: '預設' }), name: 'field_preset' });
	form.append({ type: 'field', label: '1', name: 'field1' });
	form.append({ type: 'field', label: '2', name: 'field2' });

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// We must init the controls
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.actiontype[0].dispatchEvent(evt);

	// get current protection level asynchronously
	Twinkle.protect.fetchProtectionLevel();
};


// Customizable namespace and FlaggedRevs settings
// In theory it'd be nice to have restrictionlevels defined here,
// but those are only available via a siteinfo query

// Limit template editor; a Twinkle restriction, not a site setting
var isTemplate = mw.config.get('wgNamespaceNumber') === 10 || mw.config.get('wgNamespaceNumber') === 828;


// Contains the current protection level in an object
// Once filled, it will look something like:
// { edit: { level: "sysop", expiry: <some date>, cascade: true }, ... }
Twinkle.protect.currentProtectionLevels = {};
Twinkle.protect.previousProtectionLevels = {};

Twinkle.protect.fetchProtectionLevel = function twinkleprotectFetchProtectionLevel() {

	var api = new mw.Api();
	var protectDeferred = api.get({
		format: 'json',
		indexpageids: true,
		action: 'query',
		list: 'logevents',
		letype: 'protect',
		letitle: mw.config.get('wgPageName'),
		prop: 'info',
		inprop: 'protection|watched',
		titles: mw.config.get('wgPageName')
	});

	$.when.apply($, [protectDeferred]).done(function(protectData) {
		var pageid = protectData.query.pageids[0];
		var page = protectData.query.pages[pageid];
		var current = {};
		var previous = {};

		// Save requested page's watched status for later in case needed when filing request
		Twinkle.protect.watched = page.watchlistexpiry || page.watched === '';

		$.each(page.protection, function(index, protection) {
			if (protection.type !== 'aft') {
				current[protection.type] = {
					level: protection.level,
					expiry: protection.expiry,
					cascade: protection.cascade === ''
				};
			}
		});

		// Only use the log except unprotect
		if (protectData.query.logevents.length >= 1 && protectData.query.logevents[0].action !== 'unprotect') {
			Twinkle.protect.previousProtectionLog = protectData.query.logevents[0];
		} else if (protectData.query.logevents.length >= 2) {
			Twinkle.protect.previousProtectionLog = protectData.query.logevents[1];
		}

		if (Twinkle.protect.previousProtectionLog) {
			$.each(Twinkle.protect.previousProtectionLog.params.details, function(index, protection) {
				if (protection.type !== 'aft') {
					previous[protection.type] = {
						level: protection.level,
						expiry: protection.expiry,
						cascade: protection.cascade === ''
					};
				}
			});
		}

		// show the protection level and log info
		Twinkle.protect.hasProtectLog = !!protectData.query.logevents.length;
		Twinkle.protect.currentProtectionLevels = current;
		Twinkle.protect.previousProtectionLevels = previous;
		Twinkle.protect.callback.showLogAndCurrentProtectInfo();
	});
};

Twinkle.protect.callback.showLogAndCurrentProtectInfo = function twinkleprotectCallbackShowLogAndCurrentProtectInfo() {
	var currentlyProtected = !$.isEmptyObject(Twinkle.protect.currentProtectionLevels);

	if (Twinkle.protect.hasProtectLog || Twinkle.protect.hasStableLog) {
		var $linkMarkup = $('<span>');

		if (Twinkle.protect.hasProtectLog) {
			$linkMarkup.append(
				$('<a target="_blank" href="' + mw.util.getUrl('Special:Log', { action: 'view', page: mw.config.get('wgPageName'), type: 'protect' }) + '">' + conv({ hans: '保护日志', hant: '保護日誌' }) + '</a>'),
				Twinkle.protect.hasStableLog ? $('<span> &bull; </span>') : null
			);
		}

		Morebits.Status.init($('div[name="hasprotectlog"] span')[0]);
		Morebits.Status.warn(
			currentlyProtected
				? conv({ hans: '先前保护', hant: '先前保護' })
				: [
					conv({ hans: '此页面曾在', hant: '此頁面曾在' }),
					$('<b>' + new Morebits.Date(Twinkle.protect.previousProtectionLog.timestamp).calendar('utc') + '</b>')[0],
					'被' + Twinkle.protect.previousProtectionLog.user + conv({ hans: '保护', hant: '保護' }) + '：'
				].concat(Twinkle.protect.formatProtectionDescription(Twinkle.protect.previousProtectionLevels)),
			$linkMarkup[0]
		);
	}

	Morebits.Status.init($('div[name="currentprot"] span')[0]);
	var protectionNode = [], statusLevel = 'info';

	protectionNode = Twinkle.protect.formatProtectionDescription(Twinkle.protect.currentProtectionLevels);
	if (currentlyProtected) {
		statusLevel = 'warn';
	}

	Morebits.Status[statusLevel](conv({ hans: '当前保护等级', hant: '目前保護等級' }), protectionNode);
};

Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
	var field_preset;
	var field1;
	var field2;

	switch (e.target.values) {
		case 'protect':
			field_preset = new Morebits.QuickForm.Element({ type: 'field', label: conv({ hans: '默认', hant: '預設' }), name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: conv({ hans: '选择默认：', hant: '選擇預設：' }),
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypesAdmin : Twinkle.protect.protectionTypesCreate
			});

			field2 = new Morebits.QuickForm.Element({ type: 'field', label: conv({ hans: '保护选项', hant: '保護選項' }), name: 'field2' });
			field2.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field2.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			// for existing pages
			if (mw.config.get('wgArticleId')) {
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.editmodify,
					list: [
						{
							label: conv({ hans: '修改编辑权限', hant: '修改編輯權限' }),
							name: 'editmodify',
							tooltip: conv({ hans: '如果此项关闭，编辑权限将不会修改。', hant: '如果此項關閉，編輯權限將不會修改。' }),
							checked: true
						}
					]
				});
				field2.append({
					type: 'select',
					name: 'editlevel',
					label: conv({ hans: '编辑权限：', hant: '編輯權限：' }),
					event: Twinkle.protect.formevents.editlevel,
					list: Twinkle.protect.protectionLevels.filter(function(level) {
						// Filter TE outside of templates and modules
						return isTemplate || level.value !== 'templateeditor';
					})
				});
				field2.append({
					type: 'select',
					name: 'editexpiry',
					label: conv({ hans: '终止时间：', hant: '終止時間：' }),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
						$('input[name=small]', $(e.target).closest('form'))[0].checked = e.target.selectedIndex >= 4; // 1 month
					},
					// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.movemodify,
					list: [
						{
							label: conv({ hans: '修改移动权限', hant: '修改移動權限' }),
							name: 'movemodify',
							tooltip: conv({ hans: '如果此项被关闭，移动权限将不被修改。', hant: '如果此項被關閉，移動權限將不被修改。' }),
							checked: true
						}
					]
				});
				field2.append({
					type: 'select',
					name: 'movelevel',
					label: conv({ hans: '移动权限：', hant: '移動權限：' }),
					event: Twinkle.protect.formevents.movelevel,
					list: Twinkle.protect.protectionLevels.filter(function(level) {
						// Autoconfirmed is required for a move, redundant
						return level.value !== 'autoconfirmed' && (isTemplate || level.value !== 'templateeditor');
					})
				});
				field2.append({
					type: 'select',
					name: 'moveexpiry',
					label: conv({ hans: '终止时间：', hant: '終止時間：' }),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
			} else {  // for non-existing pages
				field2.append({
					type: 'select',
					name: 'createlevel',
					label: conv({ hans: '创建权限：', hant: '建立權限：' }),
					event: Twinkle.protect.formevents.createlevel,
					list: Twinkle.protect.protectionLevels.filter(function(level) {
						// Filter TE always, and autoconfirmed in mainspace, redundant since WP:ACPERM
						return level.value !== 'templateeditor';
					})
				});
				field2.append({
					type: 'select',
					name: 'createexpiry',
					label: conv({ hans: '终止时间：', hant: '終止時間：' }),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection (indefinite) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
			}
			field2.append({
				type: 'checkbox',
				list: [
					{
						name: 'close',
						label: conv({ hans: '标记请求保护页面中的请求', hant: '標記請求保護頁面中的請求' }),
						checked: true
					}
				]
			});
			field2.append({
				type: 'textarea',
				name: 'protectReason',
				label: conv({ hans: '理由（保护日志）：', hant: '理由（保護日誌）：' })
			});
			if (!mw.config.get('wgArticleId') || mw.config.get('wgPageContentModel') === 'Scribunto') {  // tagging isn't relevant for non-existing or module pages
				break;
			}
			/* falls through */
		case 'tag':
			field1 = new Morebits.QuickForm.Element({ type: 'field', label: conv({ hans: '标记选项', hant: '標記選項' }), name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'tagtype',
				label: conv({ hans: '选择保护模板：', hant: '選擇保護模板：' }),
				list: Twinkle.protect.protectionTags,
				event: Twinkle.protect.formevents.tagtype
			});
			field1.append({
				type: 'checkbox',
				list: [
					{
						name: 'small',
						label: conv({ hans: '使用图标（small=yes）', hant: '使用圖示（small=yes）' }),
						tooltip: conv({ hans: '将给模板加上|small=yes参数，显示成右上角的一把挂锁。', hant: '將給模板加上|small=yes參數，顯示成右上角的一把掛鎖。' })
					},
					{
						name: 'noinclude',
						label: conv({ hans: '用&lt;noinclude&gt;包裹保护模板', hant: '用&lt;noinclude&gt;包裹保護模板' }),
						tooltip: conv({ hans: '将保护模板包裹在&lt;noinclude&gt;中', hant: '將保護模板包裹在&lt;noinclude&gt;中' }),
						checked: mw.config.get('wgNamespaceNumber') === 10
					},
					{
						name: 'showexpiry',
						label: conv({ hans: '在模板显示到期时间', hant: '在模板顯示到期時間' }),
						tooltip: conv({ hans: '将给模板加上|expiry参数', hant: '將給模板加上|expiry參數' }),
						checked: true,
						hidden: e.target.values === 'tag'
					}
				]
			});
			break;

		case 'request':
			field_preset = new Morebits.QuickForm.Element({ type: 'field', label: conv({ hans: '保护类型', hant: '保護類別' }), name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: conv({ hans: '类型和理由：', hant: '類別和理由：' }),
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
			});

			field1 = new Morebits.QuickForm.Element({ type: 'field', label: conv({ hans: '选项', hant: '選項' }), name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'expiry',
				label: conv({ hans: '时长：', hant: '時長：' }),
				list: [
					{ label: '', selected: true, value: '' },
					{ label: conv({ hans: '临时', hant: '臨時' }), value: 'temporary' },
					{ label: '永久', value: 'infinity' }
				]
			});
			field1.append({
				type: 'textarea',
				name: 'reason',
				label: '理由：'
			});
			break;
		default:
			alert(conv({ hans: '这玩意儿被逆袭的天邪鬼吃掉了！', hant: '這玩意兒被逆襲的天邪鬼吃掉了！' }));
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

	if (e.target.values === 'protect') {
		// fake a change event on the preset dropdown
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		e.target.form.category.dispatchEvent(evt);

		// reduce vertical height of dialog
		$(e.target.form).find('fieldset[name="field2"] select').parent().css({ display: 'inline-block', marginRight: '0.5em' });
	}

	// re-add protection level and log info, if it's available
	Twinkle.protect.callback.showLogAndCurrentProtectInfo();
};

// NOTE: This function is used by batchprotect as well
Twinkle.protect.formevents = {
	editmodify: function twinkleprotectFormEditmodifyEvent(e) {
		e.target.form.editlevel.disabled = !e.target.checked;
		e.target.form.editexpiry.disabled = !e.target.checked || (e.target.form.editlevel.value === 'all');
		e.target.form.editlevel.style.color = e.target.form.editexpiry.style.color = e.target.checked ? '' : 'transparent';
	},
	editlevel: function twinkleprotectFormEditlevelEvent(e) {
		e.target.form.editexpiry.disabled = e.target.value === 'all';
	},
	movemodify: function twinkleprotectFormMovemodifyEvent(e) {
		// sync move settings with edit settings if applicable
		if (e.target.form.movelevel.disabled && !e.target.form.editlevel.disabled) {
			e.target.form.movelevel.value = e.target.form.editlevel.value;
			e.target.form.moveexpiry.value = e.target.form.editexpiry.value;
		} else if (e.target.form.editlevel.disabled) {
			e.target.form.movelevel.value = 'sysop';
			e.target.form.moveexpiry.value = 'infinity';
		}
		e.target.form.movelevel.disabled = !e.target.checked;
		e.target.form.moveexpiry.disabled = !e.target.checked || (e.target.form.movelevel.value === 'all');
		e.target.form.movelevel.style.color = e.target.form.moveexpiry.style.color = e.target.checked ? '' : 'transparent';
	},
	movelevel: function twinkleprotectFormMovelevelEvent(e) {
		e.target.form.moveexpiry.disabled = e.target.value === 'all';
	},
	createlevel: function twinkleprotectFormCreatelevelEvent(e) {
		e.target.form.createexpiry.disabled = e.target.value === 'all';
	},
	tagtype: function twinkleprotectFormTagtypeEvent(e) {
		e.target.form.small.disabled = e.target.form.noinclude.disabled = e.target.form.showexpiry.disabled = (e.target.value === 'none') || (e.target.value === 'noop');
	}
};

Twinkle.protect.doCustomExpiry = function twinkleprotectDoCustomExpiry(target) {
	var custom = prompt(conv({ hans: '输入自定义终止时间。\n您可以使用相对时间，如“1 minute”或“19 days”，或绝对时间“yyyymmddhhmm”（如“200602011405”是2006年02月01日14：05（UTC））', hant: '輸入自訂終止時間。\n您可以使用相對時間，如「1 minute」或「19 days」，或絕對時間「yyyymmddhhmm」（如「200602011405」是2006年02月01日14：05（UTC））' }), '');
	if (custom) {
		var option = document.createElement('option');
		option.setAttribute('value', custom);
		option.textContent = custom;
		target.appendChild(option);
		target.value = custom;
	} else {
		target.selectedIndex = 0;
	}
};

// NOTE: This list is used by batchprotect as well
Twinkle.protect.protectionLevels = [
	{ label: '全部', value: 'all' },
	{ label: conv({ hans: '仅允许自动确认用户', hant: '僅允許自動確認使用者' }), value: 'autoconfirmed' },
	{ label: conv({ hans: '仅允许延伸确认用户', hant: '僅允許延伸確認使用者' }), value: 'extendedconfirmed' },
	{ label: conv({ hans: '仅模板编辑员和管理员', hant: '僅模板編輯員和管理員' }), value: 'templateeditor' },
	{ label: conv({ hans: '仅管理员', hant: '僅管理員' }), value: 'sysop', selected: true }
];

// default expiry selection is conditionally set in Twinkle.protect.callback.changePreset
// NOTE: This list is used by batchprotect as well
Twinkle.protect.protectionLengths = [
	{ label: '1天', value: '1 day' },
	{ label: '3天', value: '3 days' },
	{ label: conv({ hans: '1周', hant: '1週' }), value: '1 week' },
	{ label: conv({ hans: '2周', hant: '2週' }), value: '2 weeks' },
	{ label: conv({ hans: '1个月', hant: '1個月' }), value: '1 month' },
	{ label: conv({ hans: '3个月', hant: '3個月' }), value: '3 months' },
	{ label: conv({ hans: '6个月', hant: '6個月' }), value: '6 months' },
	{ label: '1年', value: '1 year' },
	{ label: conv({ hans: '无限期', hant: '無限期' }), value: 'infinity' },
	{ label: conv({ hans: '自定义…', hant: '自訂…' }), value: 'custom' }
];

Twinkle.protect.protectionTypesAdmin = [
	{ label: conv({ hans: '解除保护', hant: '解除保護' }), value: 'unprotect' },
	{
		label: conv({ hans: '全保护', hant: '全保護' }),
		list: [
			{ label: conv({ hans: '常规（全）', hant: '常規（全）' }), value: 'pp-protected' },
			{ label: conv({ hans: '争议、编辑战（全）', hant: '爭議、編輯戰（全）' }), value: 'pp-dispute' }
		]
	},
	{
		label: conv({ hans: '模板保护', hant: '模板保護' }),
		list: [
			{ label: conv({ hans: '高风险模板（模板）', hant: '高風險模板（模板）' }), value: 'pp-template' }
		]
	},
	{
		label: conv({ hans: '延伸确认保护', hant: '延伸確認保護' }),
		list: [
			{ label: conv({ hans: '争议、编辑战（延伸）', hant: '爭議、編輯戰（延伸）' }), value: 'pp-extend-dispute' },
			{ label: conv({ hans: '持续破坏（延伸）', hant: '持續破壞（延伸）' }), value: 'pp-vandalism' },
			{ label: conv({ hans: '傀儡破坏（延伸）', hant: '傀儡破壞（延伸）' }), value: 'pp-sock' }
		]
	},
	{
		label: conv({ hans: '半保护', hant: '半保護' }),
		list: [
			{ label: conv({ hans: '常规（半）', hant: '常規（半）' }), value: 'pp-semi-protected' },
			{ label: conv({ hans: '持续破坏（半）', hant: '持續破壞（半）' }), value: 'pp-semi-vandalism' },
			{ label: conv({ hans: '违反生者传记方针（半）', hant: '違反生者傳記方針（半）' }), value: 'pp-semi-blp' },
			{ label: conv({ hans: '傀儡破坏（半）', hant: '傀儡破壞（半）' }), value: 'pp-semi-sock' },
			{ label: conv({ hans: '高风险模板（半）', hant: '高風險模板（半）' }), value: 'pp-semi-template' },
			{ label: conv({ hans: '被封禁用户滥用讨论页（半）', hant: '被封禁使用者濫用討論頁（半）' }), value: 'pp-semi-usertalk' }
		]
	},
	{
		label: conv({ hans: '移动保护', hant: '移動保護' }),
		list: [
			{ label: conv({ hans: '常规（移动）', hant: '常規（移動）' }), value: 'pp-move' },
			{ label: conv({ hans: '争议、移动战（移动）', hant: '爭議、移動戰（移動）' }), value: 'pp-move-dispute' },
			{ label: conv({ hans: '移动破坏（移动）', hant: '移動破壞（移動）' }), value: 'pp-move-vandalism' },
			{ label: conv({ hans: '高风险页面（移动）', hant: '高風險頁面（移動）' }), value: 'pp-move-indef' }
		]
	}
].filter(function(type) {
	// Filter for templates
	return isTemplate || (type.label !== '模板保护' && type.label !== '模板保護');
});

Twinkle.protect.protectionTypesCreateOnly = [
	{
		label: conv({ hans: '白纸保护', hant: '白紙保護' }),
		list: [
			{ label: conv({ hans: '常规（白纸）', hant: '常規（白紙）' }), value: 'pp-create' },
			{ label: conv({ hans: '多次重复创建（白纸）', hant: '多次重複建立（白紙）' }), value: 'pp-create-repeat' },
			{ label: conv({ hans: '持续破坏（白纸）', hant: '持續破壞（白紙）' }), value: 'pp-create-vandalism' },
			{ label: conv({ hans: '已封禁用户的用户页（白纸）', hant: '已封禁使用者的使用者頁（白紙）' }), value: 'pp-create-userpage' }
		]
	}
];

Twinkle.protect.protectionTypes = Twinkle.protect.protectionTypesAdmin.concat(
	Twinkle.protect.protectionTypesCreateOnly);

Twinkle.protect.protectionTypesCreate = [
	{ label: conv({ hans: '解除保护', hant: '解除保護' }), value: 'unprotect' }
].concat(Twinkle.protect.protectionTypesCreateOnly);

// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
// Also note: stabilize = Pending Changes level
// expiry will override any defaults
Twinkle.protect.protectionPresetsInfo = {
	'pp-protected': {
		edit: 'sysop',
		move: 'sysop',
		reason: null
	},
	'pp-dispute': {
		edit: 'sysop',
		move: 'sysop',
		reason: conv({ hans: '编辑战', hant: '編輯戰' })
	},
	'pp-template': {
		edit: 'templateeditor',
		move: 'templateeditor',
		expiry: 'infinity',
		reason: conv({ hans: '[[WP:HRT|高风险模板]]', hant: '[[WP:HRT|高風險模板]]' }),
		template: 'noop'
	},
	'pp-vandalism': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: conv({ hans: '被自动确认用户破坏', hant: '被自動確認使用者破壞' })
	},
	'pp-extend-dispute': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: conv({ hans: '自动确认用户编辑战', hant: '自動確認使用者編輯戰' }),
		template: 'pp-dispute'
	},
	'pp-sock': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: conv({ hans: '持续的傀儡破坏', hant: '持續的傀儡破壞' })
	},
	'pp-semi-vandalism': {
		edit: 'autoconfirmed',
		reason: conv({ hans: '被IP用户或新用户破坏', hant: '被IP使用者或新使用者破壞' }),
		template: 'pp-vandalism'
	},
	'pp-semi-blp': {
		edit: 'autoconfirmed',
		reason: conv({ hans: 'IP用户或新用户违反生者传记方针', hant: 'IP使用者或新使用者違反生者傳記方針' })
	},
	'pp-semi-usertalk': {
		edit: 'autoconfirmed',
		reason: conv({ hans: '被封禁用户滥用其讨论页', hant: '被封禁使用者濫用其討論頁' })
	},
	'pp-semi-template': {  // removed for now
		edit: 'autoconfirmed',
		expiry: 'infinity',
		reason: conv({ hans: '[[WP:HRT|高风险模板]]', hant: '[[WP:HRT|高風險模板]]' }),
		template: 'noop'
	},
	'pp-semi-sock': {
		edit: 'autoconfirmed',
		reason: conv({ hans: '持续的傀儡破坏', hant: '持續的傀儡破壞' }),
		template: 'pp-sock'
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
		reason: conv({ hans: '页面移动战', hant: '頁面移動戰' })
	},
	'pp-move-vandalism': {
		move: 'sysop',
		reason: conv({ hans: '移动破坏', hant: '移動破壞' })
	},
	'pp-move-indef': {
		move: 'sysop',
		expiry: 'infinity',
		reason: conv({ hans: '高风险页面', hant: '高風險頁面' })
	},
	'unprotect': {
		edit: 'all',
		move: 'all',
		create: 'all',
		reason: null,
		template: 'none'
	},
	'pp-create': {
		create: 'autoconfirmed',
		reason: null
	},
	'pp-create-repeat': {
		create: 'autoconfirmed',
		reason: conv({ hans: '多次重复创建', hant: '多次重複建立' })
	},
	'pp-create-vandalism': {
		create: 'autoconfirmed',
		reason: conv({ hans: '被IP用户或新用户破坏', hant: '被IP使用者或新使用者破壞' })
	},
	'pp-create-userpage': {
		create: 'sysop',
		expiry: 'infinity',
		reason: conv({ hans: '被永久封禁的用户页', hant: '被永久封禁的使用者頁面' })
	}
};

Twinkle.protect.protectionTags = [
	{
		label: conv({ hans: '无（移除现有模板）', hant: '無（移除現有模板）' }),
		value: 'none'
	},
	{
		label: conv({ hans: '无（不移除现有模板）', hant: '無（不移除現有模板）' }),
		value: 'noop'
	},
	{
		label: '通用模板',
		list: [
			{ label: '{{pp-dispute}}: ' + conv({ hans: '争议', hant: '爭議' }), value: 'pp-dispute' },
			{ label: '{{pp-vandalism}}: ' + conv({ hans: '破坏', hant: '破壞' }), value: 'pp-vandalism', selected: true },
			{ label: '{{pp-sock}}: ' + '傀儡', value: 'pp-sock' },
			{ label: '{{pp-template}}: ' + conv({ hans: '高风险模板', hant: '高風險模板' }), value: 'pp-template' },
			{ label: '{{pp-protected}}: ' + conv({ hans: '常规', hant: '常規' }), value: 'pp-protected' }
		]
	},
	{
		label: conv({ hans: '半保护模板', hant: '半保護模板' }),
		list: [
			{ label: '{{pp-semi-usertalk}}: ' + conv({ hans: '封禁的用户', hant: '封禁的使用者' }), value: 'pp-semi-usertalk' },
			{ label: '{{pp-semi-blp}}: ' + conv({ hans: '生者传记', hant: '生者傳記' }), value: 'pp-semi-blp' },
			{ label: '{{pp-semi-indef}}: ' + conv({ hans: '长期', hant: '長期' }), value: 'pp-semi-indef' }
		]
	},
	{
		label: conv({ hans: '移动保护模板', hant: '移動保護模板' }),
		list: [
			{ label: '{{pp-move-dispute}}: ' + conv({ hans: '争议', hant: '爭議' }), value: 'pp-move-dispute' },
			{ label: '{{pp-move-vandalism}}: ' + conv({ hans: '破坏', hant: '破壞' }), value: 'pp-move-vandalism' },
			{ label: '{{pp-move-indef}}: ' + conv({ hans: '长期', hant: '長期' }), value: 'pp-move-indef' },
			{ label: '{{pp-move}}: ' + conv({ hans: '常规', hant: '常規' }), value: 'pp-move' }
		]
	}
];

Twinkle.protect.callback.changePreset = function twinkleprotectCallbackChangePreset(e) {
	var form = e.target.form;

	var actiontypes = form.actiontype;
	var actiontype;
	for (var i = 0; i < actiontypes.length; i++) {
		if (!actiontypes[i].checked) {
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

			form.editexpiry.value = form.moveexpiry.value = item.expiry || '1 week';
		} else {
			if (item.create) {
				form.createlevel.value = item.create;
				Twinkle.protect.formevents.createlevel({ target: form.createlevel });
				form.createexpiry.value = item.createexpiry || '1 week';
			}
			form.createexpiry.value = item.expiry || '1 week';
		}

		var reasonField = actiontype === 'protect' ? form.protectReason : form.reason;
		if (item.reason) {
			reasonField.value = item.reason;
		} else {
			reasonField.value = '';
		}

		// sort out tagging options, disabled if nonexistent or lua
		if (mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto') {
			if (form.category.value === 'unprotect') {
				form.tagtype.value = 'none';
			} else {
				form.tagtype.value = item.template ? item.template : form.category.value;
			}
			Twinkle.protect.formevents.tagtype({ target: form.tagtype });

			if (/template/.test(form.category.value)) {
				form.noinclude.checked = true;
			} else if (mw.config.get('wgNamespaceNumber') !== 10) {
				form.noinclude.checked = false;
			}
		}

	} else {  // RPP request
		if (form.category.value === 'unprotect') {
			form.expiry.value = '';
			form.expiry.disabled = true;
		} else {
			form.expiry.value = '';
			form.expiry.disabled = false;
		}
	}
};

Twinkle.protect.callback.evaluate = function twinkleprotectCallbackEvaluate(e) {
	var form = e.target;
	var input = Morebits.QuickForm.getInputData(form);

	var tagparams;
	if (input.actiontype === 'tag' || (input.actiontype === 'protect' && mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto')) {
		tagparams = {
			tag: input.tagtype,
			reason: (input.tagtype === 'pp-protected' || input.tagtype === 'pp-semi-protected' || input.tagtype === 'pp-move') && input.protectReason ? input.protectReason : null,
			showexpiry: input.actiontype === 'protect' ? input.showexpiry : null,
			small: input.small,
			noinclude: input.noinclude
		};
		if (input.actiontype === 'protect') {
			if (input.editmodify) {
				tagparams.expiry = input.editexpiry;
			} else if (input.movemodify) {
				tagparams.expiry = input.moveexpiry;
			}
		}
	}

	var closeparams = {};
	if (input.close) {
		if (input.category === 'unprotect') {
			closeparams.type = 'unprotect';
		} else if (mw.config.get('wgArticleId')) {
			if (input.editmodify) {
				if (input.editlevel === 'sysop') {
					closeparams.type = 'full';
					closeparams.expiry = input.editexpiry;
				} else if (input.editlevel === 'templateeditor') {
					closeparams.type = 'temp';
					closeparams.expiry = input.editexpiry;
				} else if (input.editlevel === 'extendedconfirmed') {
					closeparams.type = 'ecp';
					closeparams.expiry = input.editexpiry;
				} else if (input.editlevel === 'autoconfirmed') {
					closeparams.type = 'semi';
					closeparams.expiry = input.editexpiry;
				}
			} else if (input.movemodify && ['sysop', 'templateeditor', 'extendedconfirmed'].indexOf(input.movelevel) !== -1) {
				closeparams.type = 'move';
				closeparams.expiry = input.moveexpiry;
			}
		} else {
			if (input.createlevel !== 'all') {
				closeparams.type = 'salt';
				closeparams.expiry = input.createexpiry;
			}
		}
	}

	switch (input.actiontype) {
		case 'protect':
			// protect the page

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.notice = conv({ hans: '保护完成', hant: '保護完成' });

			var statusInited = false;
			var thispage;

			var allDone = function twinkleprotectCallbackAllDone() {
				if (thispage) {
					thispage.getStatusElement().info('完成');
				}
				if (tagparams) {
					Twinkle.protect.callbacks.taggingPageInitial(tagparams);
				}
				if (closeparams && closeparams.type) {
					var rppPage = new Morebits.wiki.Page('Wikipedia:请求保护页面', conv({ hans: '关闭请求', hant: '關閉請求' }));
					rppPage.setFollowRedirect(true);
					rppPage.setCallbackParameters(closeparams);
					rppPage.load(Twinkle.protect.callbacks.closeRequest);
				}
			};

			var protectIt = function twinkleprotectCallbackProtectIt(next) {
				thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '保护页面', hant: '保護頁面' }));
				var anyExtendProtection = false;
				if (mw.config.get('wgArticleId')) {
					if (input.editmodify) {
						if (input.editlevel === 'extendedconfirmed') {
							anyExtendProtection = true;
						}
						thispage.setEditProtection(input.editlevel, input.editexpiry);
					}
					if (input.movemodify) {
						// Ensure a level has actually been chosen
						if (input.movelevel) {
							if (input.movelevel === 'extendedconfirmed') {
								anyExtendProtection = true;
							}
							thispage.setMoveProtection(input.movelevel, input.moveexpiry);
						} else {
							alert(conv({ hans: '您需要选择保护层级！', hant: '您需要選擇保護層級！' }));
							return;
						}
					}
					thispage.setWatchlist(Twinkle.getPref('watchProtectedPages'));
				} else {
					if (input.createlevel === 'extendedconfirmed') {
						anyExtendProtection = true;
					}
					thispage.setCreateProtection(input.createlevel, input.createexpiry);
					thispage.setWatchlist(false);
				}

				if (input.protectReason) {
					if (anyExtendProtection && !/(争议|爭議|编辑战|編輯戰|破坏|破壞|重复创建|重複建立)/.test(input.protectReason)
						&& !confirm(conv({ hans: '根据保护方针，延伸确认保护仅可用于编辑战或破坏，但是您指定的保护理由似乎未符此条件。单击确认以继续保护，单击取消以更改保护设置', hant: '根據保護方針，延伸確認保護僅可用於編輯戰或破壞，但是您指定的保護理由似乎未符此條件。點擊確認以繼續保護，點擊取消以更改保護設定' }))) {
						return;
					}

					thispage.setEditSummary(input.protectReason);
					thispage.setChangeTags(Twinkle.changeTags);
				} else {
					alert(conv({ hans: '您必须输入保护理由，这将被记录在保护日志中。', hant: '您必須輸入保護理由，這將被記錄在保護日誌中。' }));
					return;
				}

				if (!statusInited) {
					Morebits.SimpleWindow.setButtonsEnabled(false);
					Morebits.Status.init(form);
					statusInited = true;
				}

				thispage.setChangeTags(Twinkle.changeTags);
				thispage.protect(next);
			};

			if (input.editmodify || input.movemodify || !mw.config.get('wgArticleId')) {
				protectIt(allDone);
			} else {
				alert(conv({ hans: '请告诉Twinkle要做什么！\n如果您只是想标记该页，请选择上面的“用保护模板标记此页”选项。', hant: '請告訴Twinkle要做什麼！\n如果您只是想標記該頁，請選擇上面的「用保護模板標記此頁」選項。' }));
			}

			break;

		case 'tag':
			// apply a protection template

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.followRedirect = false;
			Morebits.wiki.actionCompleted.notice = conv({ hans: '标记完成', hant: '標記完成' });

			Twinkle.protect.callbacks.taggingPageInitial(tagparams);
			break;

		case 'request':
			// file request at RFPP
			var typename, typereason;
			switch (input.category) {
				case 'pp-dispute':
				case 'pp-protected':
					typename = conv({ hans: '全保护', hant: '全保護' });
					break;
				case 'pp-template':
					typename = conv({ hans: '模板保护', hant: '模板保護' });
					break;
				case 'pp-vandalism':
				case 'pp-extend-dispute':
					typename = conv({ hans: '延伸确认保护', hant: '延伸確認保護' });
					break;
				case 'pp-semi-vandalism':
				case 'pp-semi-usertalk':
				case 'pp-semi-template':  // removed for now
				case 'pp-semi-sock':
				case 'pp-semi-blp':
				case 'pp-semi-protected':
					typename = conv({ hans: '半保护', hant: '半保護' });
					break;
				case 'pp-move':
				case 'pp-move-dispute':
				case 'pp-move-indef':
				case 'pp-move-vandalism':
					typename = conv({ hans: '移动保护', hant: '移動保護' });
					break;
				case 'pp-create':
				case 'pp-create-offensive':
				case 'pp-create-blp':
				case 'pp-create-salt':
				case 'pp-create-userpage':
				case 'pp-create-repeat':
				case 'pp-create-vandalism':
					typename = conv({ hans: '白纸保护', hant: '白紙保護' });
					break;
				case 'unprotect':
					/* falls through */
				default:
					typename = conv({ hans: '解除保护', hant: '解除保護' });
					break;
			}
			switch (input.category) {
				case 'pp-dispute':
				case 'pp-extend-dispute':
					typereason = conv({ hans: '争议、编辑战', hant: '爭議、編輯戰' });
					break;
				case 'pp-vandalism':
				case 'pp-semi-vandalism':
				case 'pp-create-vandalism':
					typereason = conv({ hans: '持续破坏', hant: '持續破壞' });
					break;
				case 'pp-template':
				case 'pp-semi-template':  // removed for now
					typereason = conv({ hans: '高风险模板', hant: '高風險模板' });
					break;
				case 'pp-create-userpage':
					typereason = conv({ hans: '被永久封禁的用户页', hant: '被永久封鎖的使用者頁面' });
					break;
				case 'pp-semi-usertalk':
					typereason = conv({ hans: '已封禁用户的讨论页', hant: '已封鎖使用者的討論頁' });
					break;
				case 'pp-semi-sock':
					typereason = conv({ hans: '傀儡破坏', hant: '傀儡破壞' });
					break;
				case 'pp-semi-blp':
					typereason = conv({ hans: '违反生者传记方针', hant: '違反生者傳記方針' });
					break;
				case 'pp-move-dispute':
					typereason = conv({ hans: '争议、移动战', hant: '爭議、移動戰' });
					break;
				case 'pp-move-vandalism':
					typereason = conv({ hans: '移动破坏', hant: '移動破壞' });
					break;
				case 'pp-move-indef':
					typereason = conv({ hans: '高风险页面', hant: '高風險頁面' });
					break;
				case 'pp-create-repeat':
					typereason = conv({ hans: '多次重复创建', hant: '多次重複建立' });
					break;
				default:
					typereason = '';
					break;
			}

			var reason = typereason;
			if (input.reason !== '') {
				if (typereason !== '') {
					reason += '：';
				}
				reason += input.reason;
			}
			if (reason !== '') {
				reason = Morebits.string.appendPunctuation(reason);
			}

			var rppparams = {
				reason: reason,
				typename: typename,
				category: input.category,
				expiry: input.expiry
			};

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			var rppName = 'Wikipedia:请求保护页面';

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = rppName;
			Morebits.wiki.actionCompleted.notice = conv({ hans: '提名完成，重定向到讨论页', hant: '提名完成，重新導向到討論頁' });

			var rppPage = new Morebits.wiki.Page(rppName, conv({ hans: '请求保护页面', hant: '請求保護頁面' }));
			rppPage.setFollowRedirect(true);
			rppPage.setCallbackParameters(rppparams);
			rppPage.load(Twinkle.protect.callbacks.fileRequest);
			break;
		default:
			alert('twinkleprotect: 未知操作类型');
			break;
	}
};

Twinkle.protect.callbacks = {
	taggingPageInitial: function(tagparams) {
		if (tagparams.tag === 'noop') {
			Morebits.Status.info(conv({ hans: '应用保护模板', hant: '應用保護模板' }), conv({ hans: '没什么要做的', hant: '沒什麼要做的' }));
			return;
		}

		var pageName = mw.config.get('wgPageName');
		var protectedPage = new Morebits.wiki.Page(pageName, conv({ hans: '标记页面', hant: '標記頁面' }));
		protectedPage.setCallbackParameters(tagparams);
		protectedPage.load(Twinkle.protect.callbacks.taggingPage);
	},
	getTaggedPage: function(params, text) {
		var tag, summary;

		var oldtag_re = /(?:<noinclude>)?[ \t]*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*/gi;
		var re_result = oldtag_re.exec(text);
		if (re_result) {
			if (params.tag === 'none' || confirm(conv({ hans: '在页面上找到{{', hant: '在頁面上找到{{' }) + re_result[1] + conv({ hans: '}}\n单击确定以移除，或单击取消以取消操作。', hant: '}}\n點擊確定以移除，或點擊取消以取消操作。' }))) {
				text = text.replace(oldtag_re, '');
			}
		}

		if (params.tag === 'none') {
			summary = conv({ hans: '移除保护模板', hant: '移除保護模板' });
		} else {
			tag = params.tag;
			if (params.reason) {
				tag += '|reason=' + params.reason;
			}
			if (params.showexpiry && params.expiry && !Morebits.string.isInfinity(params.expiry)) {
				tag += '|expiry={{subst:#time:c|' + params.expiry + '}}';
			}
			if (params.small) {
				tag += '|small=yes';
			}

			if (/^\s*#(?:redirect|重定向|重新導向)/i.test(text)) { // redirect page
				// Only tag if no {{rcat shell}} is found
				if (!text.match(/{{(?:Redirect[ _]category shell|Rcat[ _]shell|This[ _]is a redirect|多种类型重定向|多種類型重定向|多種類型重新導向|多种类型重新导向|R0|其他重定向|RCS|Redirect[ _]shell)/i)) {
					text = text.replace(/#(?:redirect|重定向|重新導向) ?(\[\[.*?\]\])(.*)/i, '#REDIRECT $1$2\n\n{{' + tag + '}}');
				} else {
					Morebits.Status.info('已存在Redirect category shell', conv({ hans: '没什么可做的', hant: '沒什麼可做的' }));
					return;
				}
			} else {
				if (params.noinclude) {
					tag = '<noinclude>{{' + tag + '}}</noinclude>';

					// 只有表格需要单独加回车，其他情况加回车会破坏模板。
					if (text.indexOf('{|') === 0) {
						tag += '\n';
					}
				} else {
					tag = '{{' + tag + '}}\n';
				}

				// Insert tag after short description or any hatnotes
				var wikipage = new Morebits.wikitext.Page(text);
				text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
			}
			summary = '加入{{' + params.tag + '}}';
		}

		return {
			text: text,
			summary: summary
		};
	},
	taggingPage: function(protectedPage) {
		var params = protectedPage.getCallbackParameters();
		var text = protectedPage.getPageText();
		var newVersion = Twinkle.protect.callbacks.getTaggedPage(params, text);
		if (typeof newVersion === 'undefined') {
			protectedPage.getStatusElement().info('完成');
			return;
		}

		protectedPage.setEditSummary(newVersion.summary);
		protectedPage.setChangeTags(Twinkle.changeTags);
		protectedPage.setWatchlist(Twinkle.getPref('watchPPTaggedPages'));
		protectedPage.setPageText(newVersion.text);
		protectedPage.setCreateOption('nocreate');
		protectedPage.suppressProtectWarning(); // no need to let admins know they are editing through protection
		protectedPage.save();
	},
	fileRequest: function(rppPage) {
		var params = rppPage.getCallbackParameters();
		var text = rppPage.getPageText();
		var statusElement = rppPage.getStatusElement();

		var rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + Morebits.string.escapeRegExp(Morebits.pageNameNorm) + '\\s*(\\]\\])?\\s*===', 'm');
		var tag = rppRe.exec(text);

		var rppLink = document.createElement('a');
		rppLink.setAttribute('href', mw.util.getUrl(rppPage.getPageName()));
		rppLink.appendChild(document.createTextNode(rppPage.getPageName()));

		if (tag) {
			statusElement.error([rppLink, conv({ hans: '已有对此页面的保护提名，取消操作。', hant: '已有對此頁面的保護提名，取消操作。' })]);
			return;
		}

		var newtag = '=== [[:' + Morebits.pageNameNorm + ']] ===' + '\n';
		if (new RegExp('^' + mw.util.escapeRegExp(newtag).replace(/\s+/g, '\\s*'), 'm').test(text)) {
			statusElement.error([rppLink, conv({ hans: '已有对此页面的保护提名，取消操作。', hant: '已有對此頁面的保護提名，取消操作。' })]);
			return;
		}

		var words;
		switch (params.expiry) {
			case 'temporary':
				words = conv({ hans: '临时', hant: '臨時' });
				break;
			case 'infinity':
				words = '永久';
				break;
			default:
				words = '';
				break;
		}

		words += params.typename;

		newtag += '* <small>' + conv({ hans: '当前保护状态', hant: '目前保護狀態' }) + '：{{protection status|' + (/=/.test(Morebits.pageNameNorm) ? '1=' : '') + Morebits.pageNameNorm + '}}</small>\n';
		newtag += conv({ hans: '请求', hant: '請求' }) + Morebits.string.toUpperCaseFirstChar(words) + (params.reason !== '' ? '：' +
			Morebits.string.formatReasonText(params.reason) : '。') + '--~~~~';

		var reg;

		if (params.category === 'unprotect') {
			reg = /(==\s*请求解除保护\s*==)/;
		} else {
			reg = /({{\s*\/header\s*}})/;
		}

		var originalTextLength = text.length;
		text = text.replace(reg, '$1\n' + newtag + '\n');
		if (text.length === originalTextLength) {
			var linknode = document.createElement('a');
			linknode.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/修复RFPP'));
			linknode.appendChild(document.createTextNode(conv({ hans: '如何修复RFPP', hant: '如何修復RFPP' })));
			statusElement.error([conv({ hans: '无法在WP:RFPP上找到相关定位点标记，要修复此问题，请参见', hant: '無法在WP:RFPP上找到相關定位點標記，要修復此問題，請參見' }), linknode, '。']);
			return;
		}
		statusElement.status('加入新提名…');
		rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ ' + conv({ hans: '请求对', hant: '請求對' }) + '[[' + Morebits.pageNameNorm + ']]' + params.typename);
		rppPage.setChangeTags(Twinkle.changeTags);
		rppPage.setPageText(text);
		rppPage.setCreateOption('recreate');
		rppPage.save(function() {
			// Watch the page being requested
			var watchPref = Twinkle.getPref('watchRequestedPages');
			// action=watch has no way to rely on user preferences (T262912), so we do it manually.
			// The watchdefault pref appears to reliably return '1' (string),
			// but that's not consistent among prefs so might as well be "correct"
			var watch = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
			if (watch) {
				var watch_query = {
					action: 'watch',
					titles: mw.config.get('wgPageName'),
					token: mw.user.tokens.get('watchToken')
				};
				// Only add the expiry if page is unwatched or already temporarily watched
				if (Twinkle.protect.watched !== true && watchPref !== 'default' && watchPref !== 'yes') {
					watch_query.expiry = watchPref;
				}
				new Morebits.wiki.Api(conv({ hans: '将请求保护的页面加入到监视列表', hant: '將請求保護的頁面加入到監視清單' }), watch_query).post();
			}
		});
	},

	closeRequest: function(rppPage) {
		var params = rppPage.getCallbackParameters();
		var text = rppPage.getPageText();
		var statusElement = rppPage.getStatusElement();

		var sections = text.split(/(?=\n==\s*请求解除保护\s*==)/);

		if (sections.length !== 2) {
			var linknode2 = document.createElement('a');
			linknode2.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/修复RFPP'));
			linknode2.appendChild(document.createTextNode('如何修复RFPP'));
			statusElement.error([conv({ hans: '无法在WP:RFPP上找到相关定位点标记，要修复此问题，请参见', hant: '無法在WP:RFPP上找到相關定位點標記，要修復此問題，請參見' }), linknode2, '。']);
			return;
		}

		var sectionText, expiryText = '';
		if (params.type === 'unprotect') {
			sectionText = sections[1];
		} else {
			sectionText = sections[0];
			expiryText = Morebits.string.formatTime(params.expiry);
		}

		var requestList = sectionText.split(/(?=\n===.+===\s*\n)/);

		var found = false;
		var rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + Morebits.pageNameRegex(Morebits.pageNameNorm) + '\\s*(\\]\\])?\\s*===', 'm');
		for (var i = 1; i < requestList.length; i++) {
			if (rppRe.exec(requestList[i])) {
				requestList[i] = requestList[i].trimRight();
				if (params.type === 'unprotect') {
					requestList[i] += '\n: {{RFPP|isun}}。--~~~~\n';
				} else {
					requestList[i] += '\n: {{RFPP|' + params.type + '|'
						+ (Morebits.string.isInfinity(params.expiry) ? 'infinity' : expiryText)
						+ '}}。--~~~~\n';
				}
				found = true;
				break;
			}
		}

		if (!found) {
			statusElement.warn(conv({ hans: '没有找到相关的请求', hant: '沒有找到相關的請求' }));
			return;
		}

		if (params.type === 'unprotect') {
			text = sections[0] + requestList.join('');
		} else {
			text = requestList.join('') + sections[1];
		}

		var summary = '';

		if (params.type === 'unprotect') {
			sectionText = sections[1];
		} else {
			sectionText = sections[0];
		}
		switch (params.type) {
			case 'semi':
				summary = conv({ hans: '半保护', hant: '半保護' });
				break;
			case 'temp':
				summary = conv({ hans: '模板保护', hant: '模板保護' });
				break;
			case 'ecp':
				summary = conv({ hans: '延伸确认保护', hant: '延伸確認保護' });
				break;
			case 'full':
				summary = conv({ hans: '全保护', hant: '全保護' });
				break;
			case 'move':
				summary = conv({ hans: '移动保护', hant: '移動保護' });
				break;
			case 'salt':
				summary = conv({ hans: '白纸保护', hant: '白紙保護' });
				break;
			case 'unprotect':
				summary = conv({ hans: '解除保护', hant: '解除保護' });
				break;
			default:
				statusElement.warn(conv({ hans: '未知保护类型', hant: '未知保護類別' }));
				return;
		}

		if (Morebits.string.isInfinity(params.expiry)) {
			summary = expiryText + summary;
		} else {
			summary += expiryText;
		}

		rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ ' + summary);
		rppPage.setChangeTags(Twinkle.changeTags);
		rppPage.setPageText(text);
		rppPage.save();
	}
};

Twinkle.protect.formatProtectionDescription = function(protectionLevels) {
	var protectionNode = [];

	if (!$.isEmptyObject(protectionLevels)) {
		$.each(protectionLevels, function(type, settings) {
			var label;
			switch (type) {
				case 'edit':
					label = conv({ hans: '编辑', hant: '編輯' });
					break;
				case 'move':
					label = conv({ hans: '移动', hant: '移動' });
					break;
				case 'create':
					label = conv({ hans: '创建', hant: '建立' });
					break;
				case 'upload':
					label = conv({ hans: '上传', hant: '上傳' });
					break;
				default:
					label = type;
					break;
			}
			var level;
			switch (settings.level) {
				case 'autoconfirmed':
					level = conv({ hans: '仅允许自动确认用户', hant: '僅允許自動確認使用者' });
					break;
				case 'extendedconfirmed':
					level = conv({ hans: '仅允许延伸确认用户', hant: '僅允許延伸確認使用者' });
					break;
				case 'templateeditor':
					level = conv({ hans: '仅模板编辑员和管理员', hant: '僅模板編輯員和管理員' });
					break;
				case 'sysop':
					level = conv({ hans: '仅管理员', hant: '僅管理員' });
					break;
				default:
					level = settings.level;
					break;
			}
			protectionNode.push($('<b>' + label + '：' + level + '</b>')[0]);
			if (Morebits.string.isInfinity(settings.expiry)) {
				protectionNode.push(conv({ hans: '（无限期）', hant: '（無限期）' }));
			} else {
				protectionNode.push(conv({ hans: '（过期：', hant: '（過期：' }) + new Morebits.Date(settings.expiry).calendar('utc') + '）');
			}
			if (settings.cascade) {
				protectionNode.push(conv({ hans: '（连锁）', hant: '（連鎖）' }));
			}
		});
	} else {
		protectionNode.push($('<b>' + conv({ hans: '无保护', hant: '無保護' }) + '</b>')[0]);
	}

	return protectionNode;
};

Twinkle.addInitCallback(Twinkle.protect, 'protect');
})();


// </nowiki>
