// <nowiki>


(function($) {


/*
 ****************************************
 *** twinkleprotect.js: Protect/RPP module
 ****************************************
 * Mode of invocation:     Tab ("PP"/"RPP")
 * Active on:              Non-special, non-MediaWiki pages
 */

// Note: a lot of code in this module is re-used/called by batchprotect.

Twinkle.protect = function twinkleprotect() {
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgNamespaceNumber') === 8) {
		return;
	}

	// 如果是Flow讨论版而且是“Topic:”开头的帖子则不显示
	if (mw.config.get('wgPageContentModel') === 'flow-board' && mw.config.get('wgPageName').indexOf('Topic:') === 0) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.protect.callback, wgULS('保护', '保護'), 'tw-rpp',
		Morebits.userIsSysop ? wgULS('保护页面', '保護頁面') : wgULS('请求保护页面', '請求保護頁面'));
};

Twinkle.protect.callback = function twinkleprotectCallback() {
	var Window = new Morebits.simpleWindow(620, 530);
	Window.setTitle(Morebits.userIsSysop ? wgULS('施行或请求保护页面', '施行或請求保護頁面') : wgULS('请求保护页面', '請求保護頁面'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(wgULS('保护模板', '保護模板'), 'Template:Protection templates');
	Window.addFooterLink(wgULS('保护方针', '保護方針'), 'WP:PROT');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#protect');

	var form = new Morebits.quickForm(Twinkle.protect.callback.evaluate);
	var actionfield = form.append({
		type: 'field',
		label: wgULS('操作类型', '操作類別')
	});
	if (Morebits.userIsSysop) {
		actionfield.append({
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: wgULS('保护页面', '保護頁面'),
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
				label: wgULS('请求保护页面', '請求保護頁面'),
				value: 'request',
				tooltip: wgULS('如果您想在WP:RFPP请求保护此页', '如果您想在WP:RFPP請求保護此頁') + (Morebits.userIsSysop ? '而不是自行完成。' : '。'),
				checked: !Morebits.userIsSysop
			},
			{
				label: wgULS('用保护模板标记此页', '用保護模板標記此頁'),
				value: 'tag',
				tooltip: wgULS('可以用此为页面加上合适的保护模板。', '可以用此為頁面加上合適的保護模板。'),
				disabled: mw.config.get('wgArticleId') === 0 || mw.config.get('wgPageContentModel') === 'Scribunto'
			}
		]
	});

	form.append({ type: 'field', label: wgULS('默认', '預設'), name: 'field_preset' });
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

// Contains the current protection level in an object
// Once filled, it will look something like:
// { edit: { level: "sysop", expiry: <some date>, cascade: true }, ... }
Twinkle.protect.currentProtectionLevels = {};

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
		inprop: 'protection',
		titles: mw.config.get('wgPageName')
	});

	$.when.apply($, [protectDeferred]).done(function(protectData) {
		var pageid = protectData.query.pageids[0];
		var page = protectData.query.pages[pageid];
		var current = {};

		$.each(page.protection, function(index, protection) {
			if (protection.type !== 'aft') {
				current[protection.type] = {
					level: protection.level,
					expiry: protection.expiry,
					cascade: protection.cascade === ''
				};
			}
		});

		// show the protection level and log info
		Twinkle.protect.hasProtectLog = !!protectData.query.logevents.length;
		Twinkle.protect.currentProtectionLevels = current;
		Twinkle.protect.callback.showLogAndCurrentProtectInfo();
	});
};

Twinkle.protect.callback.showLogAndCurrentProtectInfo = function twinkleprotectCallbackShowLogAndCurrentProtectInfo() {
	var currentlyProtected = !$.isEmptyObject(Twinkle.protect.currentProtectionLevels);

	if (Twinkle.protect.hasProtectLog || Twinkle.protect.hasStableLog) {
		var $linkMarkup = $('<span>');

		if (Twinkle.protect.hasProtectLog) {
			$linkMarkup.append(
				$('<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: mw.config.get('wgPageName'), type: 'protect'}) + '">' + wgULS('保护日志', '保護日誌') + '</a>'),
				Twinkle.protect.hasStableLog ? $('<span> &bull; </span>') : null
			);
		}

		Morebits.status.init($('div[name="hasprotectlog"] span')[0]);
		Morebits.status.warn(
			currentlyProtected ? wgULS('早前保护', '早前保護') : wgULS('此页面曾在过去被保护', '此頁面曾在過去被保護'),
			$linkMarkup[0]
		);
	}

	Morebits.status.init($('div[name="currentprot"] span')[0]);
	var protectionNode = [], statusLevel = 'info';

	if (currentlyProtected) {
		$.each(Twinkle.protect.currentProtectionLevels, function(type, settings) {
			var label = Morebits.string.toUpperCaseFirstChar(type);
			protectionNode.push($('<b>' + label + ': ' + settings.level + '</b>')[0]);
			if (settings.expiry === 'infinity') {
				protectionNode.push(wgULS('（无限期）', '（無限期）'));
			} else {
				protectionNode.push(wgULS('（过期：', '（過期：') + new Date(settings.expiry).toUTCString() + ') ');
			}
			if (settings.cascade) {
				protectionNode.push(wgULS('（连锁）', '（連鎖）'));
			}
		});
		statusLevel = 'warn';
	} else {
		protectionNode.push($('<b>' + wgULS('无保护', '無保護') + '</b>')[0]);
	}

	Morebits.status[statusLevel](wgULS('当前保护等级', '目前保護等級'), protectionNode);
};

Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
	var field_preset;
	var field1;
	var field2;
	// var isTemplate = mw.config.get("wgNamespaceNumber") === 10 || mw.config.get("wgNamespaceNumber") === 828;

	switch (e.target.values) {
		case 'protect':
			field_preset = new Morebits.quickForm.element({ type: 'field', label: wgULS('默认', '預設'), name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: wgULS('选择默认：', '選擇預設：'),
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ?
					Twinkle.protect.protectionTypesAdmin :
					Twinkle.protect.protectionTypesCreate
			});

			field2 = new Morebits.quickForm.element({ type: 'field', label: wgULS('保护选项', '保護選項'), name: 'field2' });
			field2.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field2.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			// for existing pages
			if (mw.config.get('wgArticleId')) {
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.editmodify,
					list: [
						{
							label: wgULS('修改编辑权限', '修改編輯權限'),
							name: 'editmodify',
							tooltip: wgULS('如果此项关闭，编辑权限将不会修改。', '如果此項關閉，編輯權限將不會修改。'),
							checked: true
						}
					]
				});
				var editlevel = field2.append({
					type: 'select',
					name: 'editlevel',
					label: wgULS('编辑权限：', '編輯權限：'),
					event: Twinkle.protect.formevents.editlevel
				});
				editlevel.append({
					type: 'option',
					label: wgULS('（站点默认）', '（站點預設）'),
					value: 'all'
				});
				editlevel.append({
					type: 'option',
					label: wgULS('仅允许自动确认用户', '僅允許自動確認使用者'),
					value: 'autoconfirmed'
				});
				editlevel.append({
					type: 'option',
					label: wgULS('仅管理员', '僅管理員'),
					value: 'sysop',
					selected: true
				});
				field2.append({
					type: 'select',
					name: 'editexpiry',
					label: wgULS('终止时间：', '終止時間：'),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
						$('input[name=small]', $(e.target).closest('form'))[0].checked = e.target.selectedIndex >= 8; // 1 month
					},
					// default expiry selection is conditionally set in Twinkle.protect.callback.changePreset
					list: wgULS([
						{ label: '1小时', value: '1 hour' },
						{ label: '2小时', value: '2 hours' },
						{ label: '3小时', value: '3 hours' },
						{ label: '6小时', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', value: '1 year' },
						{ label: '无限期', value: 'infinity' },
						{ label: '自定义…', value: 'custom' }
					], [
						{ label: '1小時', value: '1 hour' },
						{ label: '2小時', value: '2 hours' },
						{ label: '3小時', value: '3 hours' },
						{ label: '6小時', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', value: '1 year' },
						{ label: '無限期', value: 'infinity' },
						{ label: '自訂…', value: 'custom' }
					])
				});
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.movemodify,
					list: [
						{
							label: wgULS('修改移动权限', '修改移動權限'),
							name: 'movemodify',
							tooltip: wgULS('如果此项被关闭，移动权限将不被修改。', '如果此項被關閉，移動權限將不被修改。'),
							checked: true
						}
					]
				});
				var movelevel = field2.append({
					type: 'select',
					name: 'movelevel',
					label: wgULS('移动权限：', '移動權限：'),
					event: Twinkle.protect.formevents.movelevel
				});
				movelevel.append({
					type: 'option',
					label: wgULS('（站点默认）', '（站點預設）'),
					value: 'all'
				});
				movelevel.append({
					type: 'option',
					label: wgULS('仅允许自动确认用户', '僅允許自動確認使用者'),
					value: 'autoconfirmed'
				});
				movelevel.append({
					type: 'option',
					label: wgULS('仅管理员', '僅管理員'),
					value: 'sysop',
					selected: true
				});
				field2.append({
					type: 'select',
					name: 'moveexpiry',
					label: wgULS('终止时间：', '終止時間：'),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection is conditionally set in Twinkle.protect.callback.changePreset
					list: wgULS([
						{ label: '1小时', value: '1 hour' },
						{ label: '2小时', value: '2 hours' },
						{ label: '3小时', value: '3 hours' },
						{ label: '6小时', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', value: '1 year' },
						{ label: '无限期', value: 'infinity' },
						{ label: '自定义…', value: 'custom' }
					], [
						{ label: '1小時', value: '1 hour' },
						{ label: '2小時', value: '2 hours' },
						{ label: '3小時', value: '3 hours' },
						{ label: '6小時', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', value: '1 year' },
						{ label: '無限期', value: 'infinity' },
						{ label: '自訂…', value: 'custom' }
					])
				});
			} else {  // for non-existing pages
				var createlevel = field2.append({
					type: 'select',
					name: 'createlevel',
					label: wgULS('创建权限：', '建立權限：'),
					event: Twinkle.protect.formevents.createlevel
				});
				createlevel.append({
					type: 'option',
					label: '全部',
					value: 'all'
				});
				createlevel.append({
					type: 'option',
					label: wgULS('仅允许自动确认用户', '僅允許自動確認使用者'),
					value: 'autoconfirmed'
				});
				createlevel.append({
					type: 'option',
					label: wgULS('仅管理员', '僅管理員'),
					value: 'sysop',
					selected: true
				});
				field2.append({
					type: 'select',
					name: 'createexpiry',
					label: wgULS('终止时间：', '終止時間：'),
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					list: wgULS([
						{ label: '1小时', value: '1 hour' },
						{ label: '2小时', value: '2 hours' },
						{ label: '3小时', value: '3 hours' },
						{ label: '6小时', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', selected: true, value: '1 year' },
						{ label: '无限期', value: 'infinity' },
						{ label: '自定义…', value: 'custom' }
					], [
						{ label: '1小時', value: '1 hour' },
						{ label: '2小時', value: '2 hours' },
						{ label: '3小時', value: '3 hours' },
						{ label: '6小時', value: '6 hours' },
						{ label: '1日', value: '1 day' },
						{ label: '3日', value: '3 days' },
						{ label: '1周', value: '1 week' },
						{ label: '2周', value: '2 weeks' },
						{ label: '1月', value: '1 month' },
						{ label: '3月', value: '3 months' },
						{ label: '6月', value: '6 months' },
						{ label: '1年', selected: true, value: '1 year' },
						{ label: '無限期', value: 'infinity' },
						{ label: '自訂…', value: 'custom' }
					])
				});
			}
			field2.append({
				type: 'checkbox',
				list: [
					{
						name: 'close',
						label: wgULS('标记请求保护页面中的请求（测试功能，请复查编辑！）', '標記請求保護頁面中的請求（測試功能，請複查編輯！）'),
						checked: true
					}
				]
			});
			field2.append({
				type: 'textarea',
				name: 'protectReason',
				label: wgULS('理由（保护日志）：', '理由（保護日誌）：')
			});
			if (!mw.config.get('wgArticleId') || mw.config.get('wgPageContentModel') === 'Scribunto') {  // tagging isn't relevant for non-existing or module pages
				break;
			}
			/* falls through */
		case 'tag':
			field1 = new Morebits.quickForm.element({ type: 'field', label: wgULS('标记选项', '標記選項'), name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'tagtype',
				label: wgULS('选择保护模板：', '選擇保護模板：'),
				list: Twinkle.protect.protectionTags,
				event: Twinkle.protect.formevents.tagtype
			});
			field1.append({
				type: 'checkbox',
				list: [
					{
						name: 'small',
						label: wgULS('使用图标（small=yes）', '使用圖示（small=yes）'),
						tooltip: wgULS('将给模板加上|small=yes参数，显示成右上角的一把挂锁。', '將給模板加上|small=yes參數，顯示成右上角的一把掛鎖。')
					},
					{
						name: 'noinclude',
						label: wgULS('用<noinclude>包裹保护模板', '用<noinclude>包裹保護模板'),
						tooltip: wgULS('将保护模板包裹在&lt;noinclude&gt;中', '將保護模板包裹在&lt;noinclude&gt;中'),
						checked: mw.config.get('wgNamespaceNumber') === 10
					},
					{
						name: 'showexpiry',
						label: wgULS('在模板显示到期时间', '在模板顯示到期時間'),
						tooltip: wgULS('将给模板加上|expiry参数', '將給模板加上|expiry參數'),
						checked: true,
						hidden: e.target.values === 'tag'
					}
				]
			});
			break;

		case 'request':
			field_preset = new Morebits.quickForm.element({ type: 'field', label: wgULS('保护类型', '保護類別'), name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: wgULS('类型和理由：', '類別和理由：'),
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
			});

			field1 = new Morebits.quickForm.element({ type: 'field', label: wgULS('选项', '選項'), name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' });  // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'expiry',
				label: wgULS('时长：', '時長：'),
				list: [
					{ label: '', selected: true, value: '' },
					{ label: wgULS('临时', '臨時'), value: 'temporary' },
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
			alert(wgULS('这玩意儿被逆袭的天邪鬼吃掉了！', '這玩意兒被逆襲的天邪鬼吃掉了！'));
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
	var custom = prompt(wgULS('输入自定义终止时间。\n您可以使用相对时间，如“1 minute”或“19 days”，或绝对时间“yyyymmddhhmm”（如“200602011405”是2006年02月01日14：05（UTC））', '輸入自訂終止時間。\n您可以使用相對時間，如「1 minute」或「19 days」，或絕對時間「yyyymmddhhmm」（如「200602011405」是2006年02月01日14：05（UTC））'), '');
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

Twinkle.protect.protectionTypesAdmin = wgULS([
	{ label: '解除保护', value: 'unprotect' },
	{
		label: '全保护',
		list: [
			{ label: '常规（全）', value: 'pp-protected' },
			{ label: '争议、编辑战（全）', value: 'pp-dispute' },
			{ label: '长期破坏（全）', value: 'pp-vandalism' },
			{ label: '高风险模板（全）', value: 'pp-template' },
			{ label: '已封禁用户的用户页（全）', value: 'pp-userpage' },
			{ label: '已封禁用户的讨论页（全）', value: 'pp-usertalk' }
		]
	},
	{
		label: '半保护',
		list: [
			{ label: '常规（半）', value: 'pp-semi-protected' },
			{ label: '长期破坏（半）', value: 'pp-semi-vandalism' },
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
	}
], [
	{ label: '解除保護', value: 'unprotect' },
	{
		label: '全保護',
		list: [
			{ label: '常規（全）', value: 'pp-protected' },
			{ label: '爭議、編輯戰（全）', value: 'pp-dispute' },
			{ label: '長期破壞（全）', value: 'pp-vandalism' },
			{ label: '高風險模板（全）', value: 'pp-template' },
			{ label: '已封禁用戶的用戶頁（全）', value: 'pp-userpage' },
			{ label: '已封禁用戶的討論頁（全）', value: 'pp-usertalk' }
		]
	},
	{
		label: '半保護',
		list: [
			{ label: '常規（半）', value: 'pp-semi-protected' },
			{ label: '長期破壞（半）', value: 'pp-semi-vandalism' },
			{ label: '違反生者傳記方針（半）', value: 'pp-semi-blp' },
			{ label: '傀儡破壞（半）', value: 'pp-semi-sock' },
			{ label: '高風險模板（半）', value: 'pp-semi-template' },
			{ label: '已封禁用戶的討論頁（半）', value: 'pp-semi-usertalk' }
		]
	},
	{
		label: '移動保護',
		list: [
			{ label: '常規（移動）', value: 'pp-move' },
			{ label: '爭議、移動戰（移動）', value: 'pp-move-dispute' },
			{ label: '移動破壞（移動）', value: 'pp-move-vandalism' },
			{ label: '高風險頁面（移動）', value: 'pp-move-indef' }
		]
	}
]);

Twinkle.protect.protectionTypesCreateOnly = wgULS([
	{
		label: '白纸保护',
		list: [
			{ label: '常规（白纸）', value: 'pp-create' },
			{ label: '多次重复创建（白纸）', value: 'pp-create-repeat' },
			{ label: '长期破坏（白纸）', value: 'pp-create-vandalism' },
			{ label: '已封禁用户的用户页（白纸）', value: 'pp-create-userpage' }
		]
	}
], [
	{
		label: '白紙保護',
		list: [
			{ label: '常規（白紙）', value: 'pp-create' },
			{ label: '多次重複建立（白紙）', value: 'pp-create-repeat' },
			{ label: '長期破壞（白紙）', value: 'pp-create-vandalism' },
			{ label: '已封禁用戶的用戶頁（白紙）', value: 'pp-create-userpage' }
		]
	}
]);

Twinkle.protect.protectionTypes = Twinkle.protect.protectionTypesAdmin.concat(
	Twinkle.protect.protectionTypesCreateOnly);

Twinkle.protect.protectionTypesCreate = wgULS([
	{ label: '解除保护', value: 'unprotect' }
], [
	{ label: '解除保護', value: 'unprotect' }
]).concat(Twinkle.protect.protectionTypesCreateOnly);

// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
Twinkle.protect.protectionPresetsInfo = wgULS({
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
		editexpiry: 'indefinite',
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '高风险模板',
		template: 'noop'
	},
	'pp-userpage': {
		edit: 'sysop',
		editexpiry: 'indefinite',
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '被永久封禁的用户页',
		template: 'noop'
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
	'pp-semi-template': {  // removed for now
		edit: 'autoconfirmed',
		editexpiry: 'indefinite',
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '高风险模板',
		template: 'noop'
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
		moveexpiry: 'indefinite',
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
		create: 'autoconfirmed',
		reason: null
	},
	'pp-create-repeat': {
		create: 'autoconfirmed',
		reason: '多次重复创建'
	},
	'pp-create-vandalism': {
		create: 'autoconfirmed',
		reason: '被IP用户或新用户破坏'
	},
	'pp-create-userpage': {
		create: 'sysop',
		createexpiry: 'indefinite',
		reason: '被永久封禁的用户页'
	}
}, {
	'pp-protected': {
		edit: 'sysop',
		move: 'sysop',
		reason: null
	},
	'pp-dispute': {
		edit: 'sysop',
		move: 'sysop',
		reason: '編輯戰'
	},
	'pp-vandalism': {
		edit: 'sysop',
		move: 'sysop',
		reason: '被自動確認用戶破壞'
	},
	'pp-template': {
		edit: 'sysop',
		editexpiry: 'indefinite',
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '高風險模板',
		template: 'noop'
	},
	'pp-userpage': {
		edit: 'sysop',
		editexpiry: 'indefinite',
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '被永久封禁的用戶頁',
		template: 'noop'
	},
	'pp-usertalk': {
		edit: 'sysop',
		move: 'sysop',
		reason: '已封禁用戶濫用其討論頁'
	},
	'pp-semi-vandalism': {
		edit: 'autoconfirmed',
		reason: '被IP用戶或新用戶破壞',
		template: 'pp-vandalism'
	},
	'pp-semi-blp': {
		edit: 'autoconfirmed',
		reason: 'IP用戶或新用戶違反生者傳記方針'
	},
	'pp-semi-usertalk': {
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '已封禁用戶濫用其討論頁'
	},
	'pp-semi-template': {  // removed for now
		edit: 'autoconfirmed',
		move: 'sysop',
		reason: '高風險模板',
		template: 'noop'
	},
	'pp-semi-sock': {
		edit: 'autoconfirmed',
		reason: '持續的傀儡破壞'
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
		reason: '頁面移動戰'
	},
	'pp-move-vandalism': {
		move: 'sysop',
		reason: '移動破壞'
	},
	'pp-move-indef': {
		move: 'sysop',
		moveexpiry: 'indefinite',
		reason: '高風險頁面'
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
		reason: '多次重複建立'
	},
	'pp-create-vandalism': {
		create: 'autoconfirmed',
		reason: '被IP用戶或新用戶破壞'
	},
	'pp-create-userpage': {
		create: 'sysop',
		createexpiry: 'indefinite',
		reason: '被永久封禁的用戶頁'
	}
});

Twinkle.protect.protectionTags = wgULS([
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
], [
	{
		label: '無（移除現有模板）',
		value: 'none'
	},
	{
		label: '無（不移除現有模板）',
		value: 'noop'
	},
	{
		label: '全保護模板',
		list: [
			{ label: '{{pp-dispute}}: 爭議', value: 'pp-dispute', selected: true },
			{ label: '{{pp-usertalk}}: 封禁的用戶', value: 'pp-usertalk' }
		]
	},
	{
		label: '全、半保護模板',
		list: [
			{ label: '{{pp-vandalism}}: 破壞', value: 'pp-vandalism' },
			{ label: '{{pp-template}}: 高風險模板', value: 'pp-template' },
			{ label: '{{pp-protected}}: 常規', value: 'pp-protected' }
		]
	},
	{
		label: '半保護模板',
		list: [
			{ label: '{{pp-semi-usertalk}}: 封禁的用戶', value: 'pp-semi-usertalk' },
			{ label: '{{pp-semi-sock}}: 傀儡', value: 'pp-semi-sock' },
			{ label: '{{pp-semi-blp}}: 生者傳記', value: 'pp-semi-blp' },
			{ label: '{{pp-semi-indef}}: 長期', value: 'pp-semi-indef' }
		]
	},
	{
		label: '移動保護模板',
		list: [
			{ label: '{{pp-move-dispute}}: 爭議', value: 'pp-move-dispute' },
			{ label: '{{pp-move-vandalism}}: 破壞', value: 'pp-move-vandalism' },
			{ label: '{{pp-move-indef}}: 長期', value: 'pp-move-indef' },
			{ label: '{{pp-move}}: 常規', value: 'pp-move' }
		]
	}
]);

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

				form.editexpiry.value = item.editexpiry || '1 week';
			} else {
				form.editmodify.checked = false;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
			}

			if (item.move) {
				form.movemodify.checked = true;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
				form.movelevel.value = item.move;
				Twinkle.protect.formevents.movelevel({ target: form.movelevel });
				form.moveexpiry.value = item.moveexpiry || '1 week';
			} else {
				form.movemodify.checked = false;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
			}
		} else {
			if (item.create) {
				form.createlevel.value = item.create;
				Twinkle.protect.formevents.createlevel({ target: form.createlevel });
				form.createexpiry.value = item.createexpiry || '1 week';
			}
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
				form.editexpiry.value = form.moveexpiry.value = 'infinity';
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
	var input = Morebits.quickForm.getInputData(form);

	var tagparams;
	if (input.actiontype === 'tag' || (input.actiontype === 'protect' && mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto')) {
		tagparams = {
			tag: input.tagtype,
			reason: (input.tagtype === 'pp-protected' || input.tagtype === 'pp-semi-protected' || input.tagtype === 'pp-move') && input.protectReason ? input.protectReason : null,
			showexpiry: input.actiontype === 'protect' ? input.showexpiry : null,
			expiry: input.actiontype === 'protect' ?
				input.editmodify ? input.editexpiry :
					input.movemodify ? input.moveexpiry : null
				: null,
			small: input.small,
			noinclude: input.noinclude
		};
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
				} else if (input.editlevel === 'autoconfirmed') {
					closeparams.type = 'semi';
					closeparams.expiry = input.editexpiry;
				}
			} else if (input.movemodify && input.movelevel === 'sysop') {
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
			Morebits.wiki.actionCompleted.notice = wgULS('保护完成', '保護完成');

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
					var rppPage = new Morebits.wiki.page('Wikipedia:请求保护页面', wgULS('关闭请求', '關閉請求'));
					rppPage.setFollowRedirect(true);
					rppPage.setCallbackParameters(closeparams);
					rppPage.load(Twinkle.protect.callbacks.closeRequest);
				}
			};

			var protectIt = function twinkleprotectCallbackProtectIt(next) {
				thispage = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS('保护页面', '保護頁面'));
				if (mw.config.get('wgArticleId')) {
					if (input.editmodify) {
						thispage.setEditProtection(input.editlevel, input.editexpiry);
					}
					if (input.movemodify) {
						// Ensure a level has actually been chosen
						if (input.movelevel) {
							thispage.setMoveProtection(input.movelevel, input.moveexpiry);
						} else {
							alert(wgULS('您需要选择保护层级！', '您需要選擇保護層級！'));
							return;
						}
					}
				} else {
					thispage.setCreateProtection(input.createlevel, input.createexpiry);
					thispage.setWatchlist(false);
				}

				if (input.protectReason) {
					thispage.setEditSummary(input.protectReason + Twinkle.getPref('protectionSummaryAd'));
					thispage.setTags(Twinkle.getPref('revisionTags'));
				} else {
					alert(wgULS('您必须输入保护理由，这将被记录在保护日志中。', '您必須輸入保護理由，這將被記錄在保護日誌中。'));
					return;
				}

				if (!statusInited) {
					Morebits.simpleWindow.setButtonsEnabled(false);
					Morebits.status.init(form);
					statusInited = true;
				}

				thispage.protect(next);
			};

			if (input.editmodify || input.movemodify || !mw.config.get('wgArticleId')) {
				protectIt(allDone);
			} else {
				alert(wgULS('请告诉Twinkle要做什么！\n如果您只是想标记该页，请选择上面的“用保护模板标记此页”选项。', '請告訴Twinkle要做什麼！\n如果您只是想標記該頁，請選擇上面的「用保護模板標記此頁」選項。'));
			}

			break;

		case 'tag':
			// apply a protection template

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.followRedirect = false;
			Morebits.wiki.actionCompleted.notice = wgULS('标记完成', '標記完成');

			Twinkle.protect.callbacks.taggingPageInitial(tagparams);
			break;

		case 'request':
			// file request at RFPP
			var typename, typereason;
			switch (input.category) {
				case 'pp-dispute':
				case 'pp-vandalism':
				case 'pp-template':
				case 'pp-usertalk':
				case 'pp-protected':
					typename = '全保护';
					break;
				case 'pp-semi-vandalism':
				case 'pp-semi-usertalk':
				case 'pp-semi-template':  // removed for now
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
				case 'pp-create-userpage':
				case 'pp-create-repeat':
				case 'pp-create-vandalism':
					typename = '白纸保护';
					break;
				case 'unprotect':
					/* falls through */
				default:
					typename = '解除保护';
					break;
			}
			switch (input.category) {
				case 'pp-dispute':
					typereason = '争议、编辑战';
					break;
				case 'pp-vandalism':
				case 'pp-semi-vandalism':
				case 'pp-create-vandalism':
					typereason = '长期破坏';
					break;
				case 'pp-template':
				case 'pp-semi-template':  // removed for now
					typereason = '高风险模板';
					break;
				case 'pp-userpage':
				case 'pp-create-userpage':
					typereason = '被永久封禁的用户页';
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
				case 'pp-create-repeat':
					typereason = '多次重复创建';
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

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			var rppName = 'Wikipedia:请求保护页面';

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = rppName;
			Morebits.wiki.actionCompleted.notice = wgULS('提名完成，重定向到讨论页', '提名完成，重新導向到討論頁');

			var rppPage = new Morebits.wiki.page(rppName, wgULS('请求保护页面', '請求保護頁面'));
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
			Morebits.status.info(wgULS('应用保护模板', '應用保護模板'), wgULS('没什么要做的', '沒什麼要做的'));
			return;
		}

		var pageName = mw.config.get('wgPageName');
		Morebits.wiki.flow.check(pageName, function () {
			var flowpage = new Morebits.wiki.flow(pageName, wgULS('标记Flow页描述', '標記Flow頁描述'));
			flowpage.setCallbackParameters(tagparams);
			flowpage.viewHeader(Twinkle.protect.callbacks.taggingFlowPage);
		}, function () {
			var protectedPage = new Morebits.wiki.page(pageName, wgULS('标记页面', '標記頁面'));
			protectedPage.setCallbackParameters(tagparams);
			protectedPage.load(Twinkle.protect.callbacks.taggingPage);
		});
	},
	getTaggedPage: function(params, text) {
		var tag, summary;

		var oldtag_re = /(?:<noinclude>)?[ \t]*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*/gi;
		var re_result = oldtag_re.exec(text);
		if (re_result) {
			if (params.tag === 'none' || confirm(wgULS('在页面上找到{{' + re_result[1] + '}}\n单击确定以移除，或单击取消以取消操作。', '在頁面上找到{{' + re_result[1] + '}}\n點擊確定以移除，或點擊取消以取消操作。'))) {
				text = text.replace(oldtag_re, '');
			}
		}

		if (params.tag === 'none') {
			summary = wgULS('移除保护模板', '移除保護模板') + Twinkle.getPref('summaryAd');
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
					Morebits.status.info('已存在Redirect category shell', wgULS('没什么可做的', '沒什麼可做的'));
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
				var wikipage = new Morebits.wikitext.page(text);
				text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
			}
			summary = wgULS('添加{{' + params.tag + '}}', '加入{{' + params.tag + '}}') + Twinkle.getPref('summaryAd');
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

		protectedPage.setEditSummary(newVersion.summary);
		protectedPage.setTags(Twinkle.getPref('revisionTags'));
		protectedPage.setPageText(newVersion.text);
		protectedPage.setCreateOption('nocreate');
		protectedPage.suppressProtectWarning(); // no need to let admins know they are editing through protection
		protectedPage.save();
	},
	taggingFlowPage: function(flowpage) {
		var params = flowpage.getCallbackParameters();
		var text = flowpage.getHeader();
		var newVersion = Twinkle.protect.callbacks.getTaggedPage(params, text);
		flowpage.setHeader(newVersion.text);
		flowpage.editHeader();
	},

	fileRequest: function(rppPage) {

		var params = rppPage.getCallbackParameters();
		var text = rppPage.getPageText();
		var statusElement = rppPage.getStatusElement();

		var rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + RegExp.escape(Morebits.pageNameNorm, true) + '\\s*(\\]\\])?\\s*===', 'm');
		var tag = rppRe.exec(text);

		var rppLink = document.createElement('a');
		rppLink.setAttribute('href', mw.util.getUrl(rppPage.getPageName()));
		rppLink.appendChild(document.createTextNode(rppPage.getPageName()));

		if (tag) {
			statusElement.error(wgULS([ '已有对此条目的保护提名，在 ', rppLink, '，取消操作。' ], [ '已有對此條目的保護提名，在 ', rppLink, '，取消操作。' ]));
			return;
		}

		var newtag = '=== [[:' + mw.config.get('wgPageName') + ']] ===' + '\n';
		if (new RegExp('^' + RegExp.escape(newtag).replace(/\s+/g, '\\s*'), 'm').test(text)) {
			statusElement.error(wgULS([ '已有对此条目的保护提名，在 ', rppLink, '，取消操作。' ], [ '已有對此條目的保護提名，在 ', rppLink, '，取消操作。' ]));
			return;
		}

		var words;
		switch (params.expiry) {
			case 'temporary':
				words = '临时';
				break;
			case 'infinity':
				words = '永久';
				break;
			default:
				words = '';
				break;
		}

		words += params.typename;

		newtag += '请求' + Morebits.string.toUpperCaseFirstChar(words) + (params.reason !== '' ? '：' +
			Morebits.string.formatReasonText(params.reason) : '。') + '--~~~~';
		newtag += '\n:: <small>当前保护状态：{{protection status|' + mw.config.get('wgPageName') + '}}</small>';

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
			linknode.appendChild(document.createTextNode('如何修复RFPP'));
			statusElement.error(wgULS([ '无法在WP:RFPP上找到相关位点标记，要修复此问题，请参见', linknode, '。' ], [ '無法在WP:RFPP上找到相關位點標記，要修複此問題，請參見', linknode, '。' ]));
			return;
		}
		statusElement.status(wgULS('添加新提名…', '加入新提名…'));
		rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ 请求对[[' + Morebits.pageNameNorm + ']]' + params.typename + Twinkle.getPref('summaryAd'));
		rppPage.setTags(Twinkle.getPref('revisionTags'));
		rppPage.setPageText(text);
		rppPage.setCreateOption('recreate');
		rppPage.save();
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
			statusElement.error(wgULS([ '无法在WP:RFPP上找到相关位点标记，要修复此问题，请参见', linknode2, '。' ], [ '無法在WP:RFPP上找到相關位點標記，要修複此問題，請參見', linknode2, '。' ]));
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
		var rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + RegExp.escape(Morebits.pageNameNorm, true) + '\\s*(\\]\\])?\\s*===', 'm');
		for (var i = 1; i < requestList.length; i++) {
			if (rppRe.exec(requestList[i])) {
				requestList[i] = requestList[i].trimRight();
				if (params.type === 'unprotect') {
					requestList[i] += '\n: {{RFPP|isun}}。--~~~~\n';
				} else {
					requestList[i] += '\n: {{RFPP|' + params.type + '|'
						+ (Morebits.string.isInfinity(params.expiry) ? 'indefinite' : expiryText)
						+ '}}。--~~~~\n';
				}
				found = true;
				break;
			}
		}

		if (!found) {
			statusElement.warn(wgULS('没有找到相关的请求', '沒有找到相關的請求'));
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
				summary = wgULS('半保护', '半保護');
				break;
			case 'full':
				summary = wgULS('全保护', '全保護');
				break;
			case 'move':
				summary = wgULS('移动保护', '移動保護');
				break;
			case 'salt':
				summary = wgULS('白纸保护', '白紙保護');
				break;
			case 'unprotect':
				summary = wgULS('解除保护', '解除保護');
				break;
			default:
				statusElement.warn(wgULS('未知保护类型', '未知保護類別'));
				return;
		}

		if (Morebits.string.isInfinity(params.expiry)) {
			summary = expiryText + summary;
		} else {
			summary += expiryText;
		}

		rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ ' + summary + Twinkle.getPref('summaryAd'));
		rppPage.setTags(Twinkle.getPref('revisionTags'));
		rppPage.setPageText(text);
		rppPage.save();
	}
};

Twinkle.addInitCallback(Twinkle.protect, 'protect');
})(jQuery);


// </nowiki>
