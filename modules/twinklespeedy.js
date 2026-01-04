// <nowiki>


(function() {


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.speedy.callback, conv({ hans: '速删', hant: '速刪' }), 'tw-csd', Morebits.userIsSysop ? conv({ hans: '快速删除', hant: '快速刪除' }) : conv({ hans: '请求快速删除', hant: '請求快速刪除' }));
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsSysop ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;
// Used throughout
Twinkle.speedy.hasCSD = !!$('#delete-reason').length;

// The speedy criteria list can be in one of several modes
Twinkle.speedy.mode = {
	sysopSingleSubmit: 1,  // radio buttons, no subgroups, submit when "Submit" button is clicked
	sysopRadioClick: 2,  // radio buttons, no subgroups, submit when a radio button is clicked
	sysopMultipleSubmit: 3, // check boxes, subgroups, "Submit" button already present
	sysopMultipleRadioClick: 4, // check boxes, subgroups, need to add a "Submit" button
	userMultipleSubmit: 5,  // check boxes, subgroups, "Submit" button already pressent
	userMultipleRadioClick: 6,  // check boxes, subgroups, need to add a "Submit" button
	userSingleSubmit: 7,  // radio buttons, subgroups, submit when "Submit" button is clicked
	userSingleRadioClick: 8,  // radio buttons, subgroups, submit when a radio button is clicked

	// are we in "delete page" mode?
	// (sysops can access both "delete page" [sysop] and "tag page only" [user] modes)
	isSysop: function twinklespeedyModeIsSysop(mode) {
		return mode === Twinkle.speedy.mode.sysopSingleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopRadioClick ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick;
	},
	// do we have a "Submit" button once the form is created?
	hasSubmitButton: function twinklespeedyModeHasSubmitButton(mode) {
		return mode === Twinkle.speedy.mode.sysopSingleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userSingleSubmit;
	},
	// is db-multiple the outcome here?
	isMultiple: function twinklespeedyModeIsMultiple(mode) {
		return mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick;
	}
};

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.SimpleWindow(Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight'));
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle(conv({ hans: '选择快速删除理由', hant: '選擇快速刪除理由' }));
	dialog.setScriptName('Twinkle');
	dialog.addFooterLink(conv({ hans: '快速删除方针', hant: '快速刪除方針' }), 'WP:CSD');
	dialog.addFooterLink(conv({ hans: '常见错误', hant: '常見錯誤' }), 'Wikipedia:管理员错误自查表/快速删除');
	dialog.addFooterLink(conv({ hans: '速删设置', hant: '速刪設定' }), 'WP:TW/PREF#speedy');
	dialog.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#speedy');
	dialog.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(callbackfunc, Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null);
	if (Morebits.userIsSysop) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '只标记，不删除', hant: '只標記，不刪除' }),
					value: 'tag_only',
					name: 'tag_only',
					tooltip: conv({ hans: '如果您只想标记此页面而不是将其删除', hant: '如果您只想標記此頁面而不是將其刪除' }),
					checked: !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
					event: function(event) {
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
						// enable/disable delete multiple
						cForm.delmultiple.disabled = cChecked;
						cForm.delmultiple.checked = false;
						// enable/disable open talk page checkbox
						cForm.openusertalk.disabled = cChecked;
						cForm.openusertalk.checked = false;

						// enable/disable notify checkbox
						cForm.notify.disabled = !cChecked;
						cForm.notify.checked = cChecked;
						// enable/disable multiple
						cForm.multiple.disabled = !cChecked;
						cForm.multiple.checked = false;
						// enable requesting creation protection
						cForm.salting.checked = false;

						Twinkle.speedy.callback.modeChanged(cForm);

						event.stopPropagation();
					}
				}
			]
		});

		var deleteOptions = form.append({
			type: 'div',
			name: 'delete_options'
		});
		deleteOptions.append({
			type: 'header',
			label: conv({ hans: '删除相关选项', hant: '刪除相關選項' })
		});
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && mw.config.get('wgNamespaceNumber') !== 2) {  // hide option for user pages, to avoid accidentally deleting user talk page
			deleteOptions.append({
				type: 'checkbox',
				list: [
					{
						label: conv({ hans: '删除讨论页', hant: '刪除討論頁' }),
						value: 'talkpage',
						name: 'talkpage',
						tooltip: conv({ hans: '删除时附带删除此页面的讨论页。', hant: '刪除時附帶刪除此頁面的討論頁。' }),
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						event: function(event) {
							event.stopPropagation();
						}
					}
				]
			});
		}
		deleteOptions.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '删除重定向', hant: '刪除重新導向' }),
					value: 'redirects',
					name: 'redirects',
					tooltip: conv({ hans: '删除到此页的重定向。', hant: '刪除到此頁的重新導向。' }),
					checked: Twinkle.getPref('deleteRedirectsOnDelete'),
					event: function(event) {
						event.stopPropagation();
					}
				}
			]
		});
		deleteOptions.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '应用多个理由删除', hant: '應用多個理由刪除' }),
					value: 'delmultiple',
					name: 'delmultiple',
					tooltip: conv({ hans: '您可选择应用于该页的多个理由。', hant: '您可選擇應用於該頁的多個理由。' }),
					event: function(event) {
						Twinkle.speedy.callback.modeChanged(event.target.form);
						event.stopPropagation();
					}
				}
			]
		});
		deleteOptions.append({
			type: 'checkbox',
			list: [
				{
					label: conv({ hans: '开启用户讨论页', hant: '開啟使用者討論頁' }),
					value: 'openusertalk',
					name: 'openusertalk',
					tooltip: conv({ hans: '此项的默认值为您的开启讨论页设置。在您选择应用多条理由删除时此项将保持不变。', hant: '此項的預設值為您的開啟討論頁設定。在您選擇應用多條理由刪除時此項將保持不變。' }),
					checked: false
				}
			]
		});
	}

	var tagOptions = form.append({
		type: 'div',
		name: 'tag_options'
	});

	if (Morebits.userIsSysop) {
		tagOptions.append({
			type: 'header',
			label: conv({ hans: '标记相关选项', hant: '標記相關選項' })
		});
	}

	tagOptions.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '如可能，通知创建者', hant: '如可能，通知建立者' }),
				value: 'notify',
				name: 'notify',
				tooltip: conv({ hans: '一个通知模板将会被加入创建者的讨论页，如果您启用了该理据的通知。', hant: '一個通知模板將會被加入建立者的討論頁，如果您啟用了該理據的通知。' }),
				checked: !Morebits.userIsSysop || !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
				event: function(event) {
					event.stopPropagation();
				}
			},
			{
				label: conv({ hans: '清空页面', hant: '清空頁面' }),
				value: 'blank',
				name: 'blank',
				tooltip: conv({ hans: '在标记模板前，先清空页面，适用于严重破坏或负面生者传记等。', hant: '在標記模板前，先清空頁面，適用於嚴重破壞或負面生者傳記等。' })
			},
			{
				label: conv({ hans: '同时标记以请求白纸保护', hant: '同時標記以請求白紙保護' }),
				value: 'salting',
				name: 'salting',
				tooltip: conv({ hans: '选取后，快速删除模板后将附带 {{salt}} 标签，以请求执行删除的管理员进行白纸保护，仅在页面创建3次以上才选择此项。', hant: '選取後，快速刪除模板後將附帶 {{salt}} 標籤，以請求執行刪除的管理員進行白紙保護，僅在頁面建立3次以上才選擇此項。' })
			},
			{
				label: conv({ hans: '应用多个理由', hant: '應用多個理由' }),
				value: 'multiple',
				name: 'multiple',
				tooltip: conv({ hans: '您可选择应用于该页的多个理由。', hant: '您可選擇應用於該頁的多個理由。' }),
				event: function(event) {
					Twinkle.speedy.callback.modeChanged(event.target.form);
					event.stopPropagation();
				}
			}
		]
	});

	form.append({
		type: 'div',
		id: 'prior-deletion-count'
	});

	form.append({
		type: 'div',
		name: 'work_area',
		label: conv({ hans: '初始化CSD模块失败，请重试，或将这报告给Twinkle开发者。', hant: '初始化CSD模組失敗，請重試，或將這報告給Twinkle開發者。' })
	});

	if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
		form.append({ type: 'submit', className: 'tw-speedy-submit' }); // Renamed in modeChanged
	}

	var result = form.render();
	dialog.setContent(result);
	dialog.display();

	Twinkle.speedy.callback.modeChanged(result);

	// Check for prior deletions.  Just once, upon init
	Twinkle.speedy.callback.priorDeletionCount();
};

Twinkle.speedy.callback.getMode = function twinklespeedyCallbackGetMode(form) {
	var mode = Twinkle.speedy.mode.userSingleSubmit;
	if (form.tag_only && !form.tag_only.checked) {
		if (form.delmultiple.checked) {
			mode = Twinkle.speedy.mode.sysopMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.sysopSingleSubmit;
		}
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

	return mode;
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	var namespace = mw.config.get('wgNamespaceNumber');

	// first figure out what mode we're in
	var mode = Twinkle.speedy.callback.getMode(form);
	var isSysopMode = Twinkle.speedy.mode.isSysop(mode);

	if (isSysopMode) {
		$('[name=delete_options]').show();
		$('[name=tag_options]').hide();
		$('button.tw-speedy-submit').text(conv({ hans: '删除页面', hant: '刪除頁面' }));
	} else {
		$('[name=delete_options]').hide();
		$('[name=tag_options]').show();
		$('button.tw-speedy-submit').text(conv({ hans: '标记页面', hant: '標記頁面' }));
	}

	var work_area = new Morebits.QuickForm.Element({
		type: 'div',
		name: 'work_area'
	});

	if (mode === Twinkle.speedy.mode.userMultipleRadioClick || mode === Twinkle.speedy.mode.sysopMultipleRadioClick) {
		var evaluateType = Twinkle.speedy.mode.isSysop(mode) ? 'evaluateSysop' : 'evaluateUser';

		work_area.append({
			type: 'div',
			label: conv({ hans: '当选择完成后，单击：', hant: '當選擇完成後，點擊：' })
		});
		work_area.append({
			type: 'button',
			name: 'submit-multiple',
			label: isSysopMode ? conv({ hans: '删除页面', hant: '刪除頁面' }) : conv({ hans: '标记页面', hant: '標記頁面' }),
			event: function(event) {
				Twinkle.speedy.callback[evaluateType](event);
				event.stopPropagation();
			}
		});
	}

	var radioOrCheckbox = Twinkle.speedy.mode.isMultiple(mode) ? 'checkbox' : 'radio';

	if (isSysopMode && !Twinkle.speedy.mode.isMultiple(mode)) {
		work_area.append({ type: 'header', label: conv({ hans: '自定义理由', hant: '自訂理由' }) });
		work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.customRationale, mode) });
	}

	switch (namespace) {
		case 0:  // article
			work_area.append({ type: 'header', label: conv({ hans: '条目', hant: '條目' }) });
			work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.articleList, mode) });
			break;

		case 2:  // user
			work_area.append({ type: 'header', label: conv({ hans: '用户页', hant: '使用者頁面' }) });
			work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.userList, mode) });
			break;

		case 6:  // file
			work_area.append({ type: 'header', label: conv({ hans: '文件', hant: '檔案' }) });
			work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.fileList, mode) });
			if (!Twinkle.speedy.mode.isSysop(mode)) {
				work_area.append({ type: 'div', label: conv({ hans: '标记CSD F3、F4、F6、F8、F9、F10，请使用Twinkle的“图权”功能。', hant: '標記CSD F3、F4、F6、F8、F9、F10，請使用Twinkle的「圖權」功能。' }) });
			}
			break;

		case 14:  // category
			work_area.append({ type: 'header', label: conv({ hans: '分类', hant: '分類' }) });
			work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.categoryList, mode) });
			break;

		case 118:  // draft
			work_area.append({ type: 'header', label: '草稿' });
			work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.draftList, mode) });
			break;

		default:
			break;
	}

	// custom rationale lives under general criteria when tagging
	var generalCriteria = Twinkle.speedy.generalList;
	if (!Twinkle.speedy.mode.isSysop(mode)) {
		generalCriteria = Twinkle.speedy.customRationale.concat(generalCriteria);
	}
	work_area.append({ type: 'header', label: conv({ hans: '常规', hant: '常規' }) });
	work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(generalCriteria, mode) });
	if (!Twinkle.speedy.mode.isSysop(mode)) {
		work_area.append({ type: 'div', label: conv({ hans: '标记CSD G16，请使用Twinkle的“侵权”功能。', hant: '標記CSD G16，請使用Twinkle的「侵權」功能。' }) });
	}

	if (mw.config.get('wgIsRedirect') || Morebits.userIsSysop) {
		work_area.append({ type: 'header', label: '重定向' });
		work_area.append({ type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectList, mode) });
	}

	var old_area = Morebits.QuickForm.getElements(form, 'work_area')[0];
	form.replaceChild(work_area.render(), old_area);

	// if sysop, check if CSD is already on the page and fill in custom rationale
	if (isSysopMode && Twinkle.speedy.hasCSD) {
		var customOption = $('input[name=csd][value=reason]')[0];
		if (customOption) {
			if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
				// force listeners to re-init
				customOption.click();
				customOption.parentNode.appendChild(customOption.subgroup);
			}
			customOption.subgroup.querySelector('input').value = decodeURIComponent($('#delete-reason').text()).replace(/\+/g, ' ');
		}
	}

	// enlarge G11 radio/checkbox and its label
	if (document.querySelector('input[value="g11"]') && Twinkle.getPref('enlargeG11Input')) {
		document.querySelector('input[value="g11"]').style = 'height: 2em; width: 2em; height: -moz-initial; width: -moz-initial; -moz-transform: scale(2); -o-transform: scale(2);';
		document.querySelector('input[value="g11"]').labels[0].style = 'font-size: 1.5em; line-height: 1.5em;';
	}

	if (!isSysopMode && mw.config.get('wgPageContentModel') !== 'wikitext') {
		$('[name=tag_options]').hide();
		$('[name=work_area]').empty();
		var message = [
			conv({ hans: 'Twinkle不支持在页面内容模型为', hant: 'Twinkle不支援在頁面內容模型為' }),
			mw.config.get('wgPageContentModel'),
			conv({ hans: '的页面上挂上快速删除模板，请参见', hant: '的頁面上掛上快速刪除模板，請參見' }),
			$('<a>').attr({ target: '_blank', href: mw.util.getUrl('WP:SPECIALSD') }).text(conv({ hans: '手动放置模板时的注意事项', hant: '手動放置模板時的注意事項' }))[0],
			'。'
		];
		$('[name=work_area]').append(message);
		Morebits.SimpleWindow.setButtonsEnabled(false);
	} else {
		Morebits.SimpleWindow.setButtonsEnabled(true);
	}
};

Twinkle.speedy.callback.priorDeletionCount = function () {
	var query = {
		action: 'query',
		format: 'json',
		list: 'logevents',
		letype: 'delete',
		leaction: 'delete/delete', // Just pure page deletion, no redirect overwrites or revdel
		letitle: mw.config.get('wgPageName'),
		leprop: '', // We're just counting we don't actually care about the entries
		lelimit: 5  // A little bit goes a long way
	};

	new Morebits.wiki.Api(conv({ hans: '检查之前的删除', hant: '檢查之前的刪除' }), query, function (apiobj) {
		var response = apiobj.getResponse();
		var delCount = response.query.logevents.length;
		if (delCount) {
			var message = conv({ hans: '被删除', hant: '被刪除' });
			if (response.continue) {
				message += conv({ hans: '超过', hant: '超過' });
			}
			message += delCount + '次';

			// 3+ seems problematic
			if (delCount >= 3) {
				$('#prior-deletion-count').css('color', 'red');
			}

			// Provide a link to page logs (CSD templates have one for sysops)
			var link = Morebits.htmlNode('a', conv({ hans: '（日志）', hant: '（日誌）' }));
			link.setAttribute('href', mw.util.getUrl('Special:Log', {page: mw.config.get('wgPageName')}));
			link.setAttribute('target', '_blank');

			$('#prior-deletion-count').text(message); // Space before log link
			$('#prior-deletion-count').append(link);
		}
	}).post();
};


Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {
	// mode switches
	var isSysopMode = Twinkle.speedy.mode.isSysop(mode);
	var multiple = Twinkle.speedy.mode.isMultiple(mode);
	var hasSubmitButton = Twinkle.speedy.mode.hasSubmitButton(mode);

	var openSubgroupHandler = function(e) {
		$(e.target.form).find('input').prop('disabled', true);
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	var submitSubgroupHandler = function(e) {
		var evaluateType = Twinkle.speedy.mode.isSysop(mode) ? 'evaluateSysop' : 'evaluateUser';
		Twinkle.speedy.callback[evaluateType](e);
		e.stopPropagation();
	};

	return $.map(list, function(critElement) {
		var criterion = $.extend({}, critElement);

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

		if (isSysopMode) {
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

		if (mw.config.get('wgIsRedirect') && criterion.hideWhenRedirect) {
			return null;
		}

		if (criterion.showInNamespaces && criterion.showInNamespaces.indexOf(mw.config.get('wgNamespaceNumber')) < 0) {
			return null;
		} else if (criterion.hideInNamespaces && criterion.hideInNamespaces.indexOf(mw.config.get('wgNamespaceNumber')) > -1) {
			return null;
		}

		if (criterion.subgroup && !hasSubmitButton) {
			if ($.isArray(criterion.subgroup)) {
				criterion.subgroup.push({
					type: 'button',
					name: 'submit',
					label: isSysopMode ? conv({ hans: '删除页面', hant: '刪除頁面' }) : conv({ hans: '标记页面', hant: '標記頁面' }),
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit',  // ends up being called "csd.submit" so this is OK
						label: isSysopMode ? conv({ hans: '删除页面', hant: '刪除頁面' }) : conv({ hans: '标记页面', hant: '標記頁面' }),
						event: submitSubgroupHandler
					}
				];
			}
			// FIXME: does this do anything?
			criterion.event = openSubgroupHandler;
		}

		if (isSysopMode) {
			var originalEvent = criterion.event;
			criterion.event = function(e) {
				if (multiple) {
					return originalEvent(e);
				}

				var normalizedCriterion = Twinkle.speedy.normalizeHash[e.target.value];
				$('[name=openusertalk]').prop('checked',
					Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf(normalizedCriterion) !== -1
				);
				if (originalEvent) {
					return originalEvent(e);
				}
			};
		}

		return criterion;
	});
};

Twinkle.speedy.customRationale = [
	{
		label: conv({ hans: '自定义理由' + (Morebits.userIsSysop ? '（自定义删除理由）' : ''), hant: '自訂理由' + (Morebits.userIsSysop ? '（自訂刪除理由）' : '') }),
		value: 'reason',
		tooltip: conv({ hans: '该页至少应该符合一条快速删除的标准，并且您必须在理由中提到。这不是万能的删除理由。', hant: '該頁至少應該符合一條快速刪除的標準，並且您必須在理由中提到。這不是萬能的刪除理由。' }),
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: '理由：',
			size: 60
		}
		// hideWhenMultiple: true
	}
];

Twinkle.speedy.fileList = [
	{
		label: conv({ hans: 'F1: 与中文维基百科的既有文件重复的文件', hant: 'F1: 與中文維基百科的既有檔案重複的檔案' }),
		value: 'f1',
		subgroup: {
			name: 'f1_filename',
			type: 'input',
			label: conv({ hans: '与此文件相同的文件名：', hant: '與此檔案相同的檔名：' }),
			tooltip: conv({ hans: '可不含“File:”前缀。', hant: '可不含「File:」字首。' })
		},
		tooltip: conv({ hans: '文件的内容与中文维基百科的既有文件的内容重复，而且文件的大小与既有文件相同或小于既有文件。<br>如果重复的文件的大小大于既有文件，此条不适用。', hant: '檔案的內容與中文維基百科的既有檔案的內容重複，而且檔案的大小與既有檔案相同或小於既有檔案。<br>如果重複的檔案的大小大於既有檔案，此條不適用。' })
	},
	{
		label: conv({ hans: 'F3: 来源不明的文件', hant: 'F3: 來源不明的檔案' }),
		value: 'f3',
		hideWhenUser: true
	},
	{
		label: conv({ hans: 'F4: 著作权不明的非自由著作权文件', hant: 'F4: 著作權不明的非自由著作權檔案' }),
		value: 'f4',
		hideWhenUser: true,
		tooltip: conv({ hans: '「版权不明」包括但不限于下列情况：<br>1.版权未知；<br>2.版权无法被查证；及<br>3.文件宣称依据某自由版权协定发布，但不见该自由协定的声明。', hant: '「版權不明」包括但不限於下列情況：<br>1.版權未知；<br>2.版權無法被查證；及<br>3.檔案宣稱依據某自由版權協定發佈，但不見該自由協定的聲明。' })
	},
	{
		label: conv({ hans: 'F5: 存在更高质量的版本的图片', hant: 'F5: 存在更高質素的版本的圖片' }),
		value: 'f5',
		subgroup: {
			name: 'f5_filename',
			type: 'input',
			label: conv({ hans: '新文件名：', hant: '新檔名：' }),
			tooltip: conv({ hans: '可不含“File:”前缀。', hant: '可不含「File:」字首。' })
		},
		tooltip: conv({ hans: '图片的内容与其他中文维基百科或维基共享资源的图片的内容重复，而且：<br>1.图片的分辨率比其他中文维基百科或维基共享资源的图片为低；或<br>图片并非可缩放向量图形（SVG），而其他中文维基百科或维基共享资源的图片为可缩放向量图形。', hant: '圖片的內容與其他中文維基百科或維基共享資源的圖片的內容重複，而且：<br>1.圖片的解像度比其他中文維基百科或維基共享資源的圖片為低；或<br>圖片並非可縮放向量圖形（SVG），而其他中文維基百科或維基共享資源的圖片為可縮放向量圖形。' })
	},
	{
		label: conv({ hans: 'F6: 未被条目使用的非自由著作权文件', hant: 'F6: 未被條目使用的非自由著作權檔案' }),
		value: 'f6',
		hideWhenUser: true
	},
	{
		label: conv({ hans: 'F7: 与维基共享资源文件重复的文件', hant: 'F7: 與維基共享資源檔案重複的檔案' }),
		value: 'f7',
		subgroup: {
			name: 'f7_filename',
			type: 'input',
			label: conv({ hans: '维基共享资源上的文件名：', hant: '維基共享資源上的檔名：' }),
			value: Morebits.pageNameNorm,
			tooltip: conv({ hans: '如与本文件名相同则可留空，可不含“File:”前缀。', hant: '如與本檔名相同則可留空，可不含「File:」字首。' })
		},
		hideWhenMultiple: true,
		tooltip: conv({ hans: '不要求文件的名称、大小与维基共享资源的文件的名称、大小须完全相同。<br>下列情况不适用此条：<br>1.文件的名称与维基共享资源的文件的名称重复，但文件的内容与维基共享资源的文件的内容并不相同；<br>2.维基共享资源的文件存在版权争议，例如（应）被提交至删除请求等。', hant: '不要求檔案的名稱、大小與維基共享資源的檔案的名稱、大小須完全相同。<br>下列情況不適用此條：<br>1.檔案的名稱與維基共享資源的檔案的名稱重複，但檔案的內容與維基共享資源的檔案的內容並不相同；<br>2.維基共享資源的檔案存在版權爭議，例如（應）被提交至刪除請求等。' })
	},
	{
		label: conv({ hans: 'F8: 上传者宣称拥有文件，但文件可在其他来源找到。', hant: 'F8: 上載者宣稱擁有檔案，但檔案可在其他來源找到。' }),
		value: 'f8',
		hideWhenUser: true,
		tooltip: conv({ hans: '涉及版权欺诈的商业图片机构不视为有效的“其他来源”', hant: '涉及版權欺詐的商業圖片機構不視為有效的「其他來源」' })
	},
	{
		label: conv({ hans: 'F9: 未填写任何合理使用依据的非自由著作权文件', hant: 'F9: 未填寫任何合理使用依據的非自由著作權檔案' }),
		value: 'f9',
		hideWhenUser: true,
		tooltip: conv({ hans: '空白的合理使用依据模板（如{{Non-free use rationale}}）不视为有效的合理使用依据。<br>具备有争议但完整的合理使用依据的文件不适用。<br>存在任何条目的合理使用依据的文件不适用；应将文件自使用文件但未提供合理使用依据的页面中移除。', hant: '空白的合理使用依據模板（如{{Non-free use rationale}}）不視為有效的合理使用依據。<br>具備有爭議但完整的合理使用依據的檔案不適用。<br>存在任何條目的合理使用依據的檔案不適用；應將檔案自使用檔案但未提供合理使用依據的頁面中移除。' })
	},
	{
		label: conv({ hans: 'F10: 可被替代的非自由著作权文件', hant: 'F10: 可被替代的非自由著作權檔案' }),
		value: 'f10',
		hideWhenUser: true,
		tooltip: conv({ hans: '文件仅用于描述、识别或评论文件中展示的事物，或仅用作插图（没有和文件内容相关的评论），且满足以下四个条件之一：<br>1.有其他自由版权文件展示相同的事物。<br>2.文件描述的是在世或假定在世人物、仍然存在的建筑、室外雕塑或仍然在售的商品，且预计自行拍摄的照片不受他人版权保护。<br>3.文件为可自行绘制的地图或图表。<br>4.文件来自商业图片机构（如Getty），但涉及版权欺诈的商业图片机构不适用。<br>如果给出了其他合理使用依据（如用于评论文件本身），此条不适用。如对文件的可替代性存在争议，应交文件存废讨论处理。<br>不适用于正在或曾经由文件存废讨论处理过的文件。', hant: '檔案僅用於描述、辨識或評論檔案中展示的事物，或僅用作插圖（沒有和檔案內容相關的評論），且滿足以下四個條件之一：<br>1.有其他自由版權檔案展示相同的事物。<br>2.檔案描述的是在世或假定在世人物、仍然存在的建築、室外雕塑或仍然在售的商品，且預計自行拍攝的相片不受他人版權保護。<br>3.檔案為可自行繪製的地圖或圖表。<br>4.檔案來自商業圖片機構（如Getty），但涉及版權欺詐的商業圖片機構不適用。<br>如果給出了其他合理使用依據（如用於評論檔案本身），此條不適用。如對檔案的可替代性存在爭議，應交檔案存廢討論處理。<br>不適用於正在或曾經由檔案存廢討論處理過的檔案。' })
	}
];

Twinkle.speedy.articleList = [
	{
		label: conv({ hans: 'A1: 内容空泛', hant: 'A1: 內容空泛' }),
		value: 'a1',
		tooltip: conv({ hans: '条目缺乏足够的背景信息，使读者无法清楚辨识条目的主题。例如：<br>「他是拥有红色汽车且风趣幽默的人。他使人大笑。」<br>此项条款一般仅适用于非常短的条目。<br>如果标题或条目上包括但不限于链接等任何信息允许用户借助包括但不限于网络搜索等途径找到有关该主题的更多有效信息，以尝试有效扩充或改写该条目，依据此项条款提请快速删除可能并不合适。<br>如果条目在最近几分钟创建，请勿依据此项条款提请快速删除。', hant: '條目缺乏足夠的背景資訊，使讀者無法清楚辨識條目的主題。例如：<br>「他是擁有紅色汽車且風趣幽默的人。他使人大笑。」<br>此項條款一般僅適用於非常短的條目。<br>如果標題或條目上包括但不限於連結等任何資訊允許用戶藉助包括但不限於網絡搜尋等途徑找到有關該主題的更多有效資訊，以嘗試有效擴充或改寫該條目，依據此項條款提請快速刪除可能並不合適。<br>如果條目在最近幾分鐘建立，請勿依據此項條款提請快速刪除。' })
	},
	{
		label: conv({ hans: 'A2: 内容只包括外部链接、参见、图书参考、分类、模板、跨语言链接的条目（消歧义页、重定向、软重定向除外）', hant: 'A2: 內容只包括外部連結、參見、圖書參考、分類、模板、跨語言連結的條目（消歧義頁、重新導向、軟重新導向除外）' }),
		value: 'a2',
		tooltip: conv({ hans: '请注意：有些维基人创建条目时会分开多次保存，请避免删除有人正在编辑的页面。<br>带有{{inuse}}模板的不适用。', hant: '請注意：有些維基人建立條目時會分開多次儲存，請避免刪除有人正在編輯的頁面。<br>帶有{{inuse}}模板的不適用。' })
	},
	{
		label: conv({ hans: 'A3: 复制自其他中文维基项目，或是与其他中文维基项目内容相同的文章', hant: 'A3: 複製自其他中文維基專案，或是與其他中文維基專案內容相同的文章' }),
		tooltip: conv({ hans: '其他“维基项目”指的是：维基词典、维基教科书、维基语录、维基文库、维基物种、维基新闻、维基孵育场、维基学院等，但并不包括与中文维基百科其他条目内容重复之状况。', hant: '其他「維基專案」指的是：維基詞典、維基教科書、維基語錄、維基文庫、維基物種、維基新聞、維基孵育場、維基學院等，但並不包括與中文維基百科其他條目內容重複之狀況。' }),
		value: 'a3',
		subgroup: {
			name: 'a3_pagename',
			type: 'input',
			label: conv({ hans: '现有条目名：', hant: '現有條目名：' }),
			tooltip: conv({ hans: '请加上跨 wiki 前缀。不自动加上链接，若需要请自行加上[[]]', hant: '請加上跨 wiki 字首。不自動加上連結，若需要請自行加上[[]]' }),
			size: 60
		}
	},
	{
		label: conv({ hans: 'A5: 与既有页面或其历史版本重复的条目', hant: 'A5: 與既有頁面或其歷史版本重複的條目' }),
		value: 'a5',
		tooltip: conv({ hans: '条目符合下列所有情形：<br>1.首个版本的内容与当时其他现存条目或草稿或其历史版本的全部或部分内容完全相同或非常相似<br>2.当前版本的内容与其首个版本的全部或部分内容完全相同或非常相似<br>3.名称不适合改为重定向<br>如果名称可以作为重定向，就应直接改为重定向，不要请求快速删除。<br>如果是多个页面合并产生的条目，或从另外一个或多个页面拆分产生的条目，不适用。<br>“页面”指位于用户命名空间与草稿命名空间之外的所有页面。<br>如有疑虑，应提交存废讨论处理。', hant: '條目符合下列所有情形：<br>1.首個版本的內容與當時其他現存條目或草稿或其歷史版本的全部或部分內容完全相同或非常相似<br>2.當前版本的內容與其首個版本的全部或部分內容完全相同或非常相似<br>3.名稱不適合改為重新導向<br>如果名稱可以作為重新導向，就應直接改為重新導向，不要請求快速刪除。<br>如果是多個頁面合併產生的條目，或從另外一個或多個頁面拆分產生的條目，不適用。<br>「頁面」指位於用戶命名空間與草稿命名空間之外的所有頁面。<br>如有疑慮，應提交存廢討論處理。' }),
		subgroup: {
			name: 'a5_pagename',
			type: 'input',
			label: conv({ hans: '现有页面名：', hant: '現有頁面名：' }),
			size: 60
		}
	},
	{
		label: conv({ hans: 'A6: 复制自其他维基百科语言版本，且完全没有翻译', hant: 'A6: 複製自其他維基百科語言版本，且完全沒有翻譯' }),
		value: 'a6',
		tooltip: conv({ hans: '如果并不是复制于任何其他的维基百科语言版本，请换用{{notmandarin}}。<br>带有{{inuse}}和{{translating}}模板的不适用。', hant: '如果並不是複製於任何其他的維基百科語言版本，請換用{{notmandarin}}。<br>帶有{{inuse}}和{{translating}}模板的不適用。' }),
		subgroup: {
			name: 'a6_pagename',
			type: 'input',
			label: conv({ hans: '现有条目名：', hant: '現有條目名：' }),
			tooltip: conv({ hans: '请加上跨 wiki 前缀。不自动加上链接，若需要请自行加上[[]]。', hant: '請加上跨 wiki 字首。不自動加上連結，若需要請自行加上[[]]。' }),
			size: 60
		}
	},
	{
		label: conv({ hans: 'A7：因收录标准问题被删除而又被重建的条目', hant: 'A7：因收錄標準問題被刪除而又被重建的條目' }),
		value: 'a7',
		tooltip: conv({ hans: '该内容之前必须是经存废讨论删除，且删除理由包括未满足收录标准的要求，而重新创建后的版本明显同样未满足收录标准的要求且并未列出任何旧版本中未曾出现的可靠来源。如有疑虑，请提交存废讨论或存废复核。', hant: '該內容之前必須是經存廢討論刪除，且刪除理由包括未滿足收錄標準的要求，而重新創建後的版本明顯同樣未滿足收錄標準的要求且並未列出任何舊版本中未曾出現的可靠來源。如有疑慮，請提交存廢討論或存廢覆核。' }),
		subgroup: {
			name: 'a7_pagename',
			type: 'input',
			label: conv({ hans: '原存废讨论位置：', hant: '原存廢討論位置：' }),
			size: 60
		}
	}
];

Twinkle.speedy.categoryList = [
	{
		label: conv({ hans: 'O4: 空分类', hant: 'O4: 空分類' }),
		value: 'o4',
		tooltip: conv({ hans: '该分类无收录任何页面或子分类。<br>不适用于Category:不要删除的分类中的空分类。<br>如对分类去留存在争议，应移交页面存废讨论处理。此准则亦不适用已移交页面存废讨论且正在讨论中的分类。', hant: '該分類無收錄任何頁面或子分類。<br>不適用於Category:不要刪除的分類中的空分類。<br>如對分類去留存在爭議，應移交頁面存廢討論處理。此準則亦不適用已移交頁面存廢討論且正在討論中的分類。' })
	}
];

Twinkle.speedy.draftList = [
	{
		label: conv({ hans: 'O7: 废弃草稿', hant: 'O7: 廢棄草稿' }),
		value: 'o7',
		tooltip: conv({ hans: '任何六个月内无编辑的草稿命名空间页面。<br>若相关编辑为机器人编辑或属维护性操作，相关编辑应视同不存在。', hant: '任何六個月內無編輯的草稿命名空間頁面。<br>若相關編輯為機械人編輯或屬維護性操作，相關編輯應視同不存在。' })
	}
];

Twinkle.speedy.userList = [
	{
		label: conv({ hans: 'U1: 用户请求删除自己的用户页或用户子页面', hant: 'U1: 使用者請求刪除自己的使用者頁面或使用者子頁面' }),
		value: 'u1',
		tooltip: conv({ hans: '如果页面曾位于该用户的用户命名空间（User）外，提请须附有合理原因。', hant: '如果頁面曾位於該用戶的用戶命名空間（User）外，提請須附有合理原因。' })
	},
	{
		label: conv({ hans: 'U2: 用户不存在', hant: 'U2:  用戶不存在' }),
		value: 'u2',
		tooltip: conv({ hans: '不存在对应的本地注册用户，也不存在对应的临时账户的用户自治空间页面。<br>已被全域隐藏的用户在此条视为不存在的用户。<br>其他维基媒体基金会项目的注册用户如无对应本地账户，其用户自治空间页面亦适用此条。', hant: '不存在對應的本地註冊用戶，也不存在對應的臨時帳戶的用戶自治空間頁面。<br>已被全域隱藏的用戶在此條視為不存在的用戶。<br>其他維基媒體基金會項目的註冊用戶如無對應本地帳戶，其用戶自治空間頁面亦適用此條。' })
	}
];

Twinkle.speedy.generalList = [
	{
		label: conv({ hans: 'G1: 没有实际内容的页面', hant: 'G1: 沒有實際內容的頁面' }),
		value: 'g1',
		tooltip: conv({ hans: '如“adfasddd”。参见Wikipedia:胡言乱语。但注意：图片、占位模板也算是内容。', hant: '如「adfasddd」。參見Wikipedia:胡言亂語。但注意：圖片、佔位模板也算是內容。' }),
		hideInNamespaces: [ 2, 3 ] // user, user talk
	},
	{
		label: conv({ hans: 'G2: 测试页面', hant: 'G2: 測試頁面' }),
		value: 'g2',
		tooltip: conv({ hans: '例如：“这是一个测试。”', hant: '例如：「這是一個測試。」' }),
		hideInNamespaces: [ 2, 3 ] // user, user talk
	},
	{
		label: conv({ hans: 'G3: 明显扰乱的非建设性页面', hant: 'G3: 明顯擾亂的非建設性頁面' }),
		value: 'g3',
		tooltip: conv({ hans: '包括但不限于明显的错误信息、信息明显错误的图片、人身攻击、清理移动破坏时留下的重定向等。', hant: '包括但不限於明顯的錯誤資訊、資訊明顯錯誤的圖片、人身攻擊、清理移動破壞時留下的重新導向等。' })
	},
	{
		label: conv({ hans: 'G5: 经存废讨论或复核程序被删除而又被重建的内容', hant: 'G5: 經存廢討論或覆核程序被刪除而又被重建的內容' }),
		value: 'g5',
		tooltip: conv({ hans: '页面此前根据页面存废讨论、侵权审核或文件存废讨论的结果而删除，并在删除后被重建，而页面重建后：<br>1.其首个版本的内容与被删除的版本的全部或部分内容完全相同或非常相似；且<br>2.其当前版本的内容与其首个版本的全部或部分内容完全相同或非常相似。<br>该内容如与被删除的版本明显不同或其现时的内容已不再适用此前页面存废讨论或文件存废讨论中提出的删除理由，而提删者认为需要删除，请交到页面存废讨论、文件存废讨论或存废复核请求如果提删者对此不肯定，请先联系上次执行删除的管理人员。<br>不适用于根据存废复核结果被恢复或允许重建的内容。在某些情况下，重新创建的条目有机会发展，那么不应提交快速删除，而应该提交存废复核或存废讨论重新评核。', hant: '頁面此前根據頁面存廢討論、侵權審核或檔案存廢討論的結果而刪除，並在刪除後被重建，而頁面重建後：<br>1.其首個版本的內容與被刪除的版本的全部或部分內容完全相同或非常相似；且<br>2.其當前版本的內容與其首個版本的全部或部分內容完全相同或非常相似。<br>該內容如與被刪除的版本明顯不同或其現時的內容已不再適用此前頁面存廢討論或文件存廢討論中提出的刪除理由，而提刪者認為需要刪除，請交到頁面存廢討論、文件存廢討論或存廢複核請求如果提刪者對此不肯定，請先聯繫上次執行刪除的管理人員。<br>不適用於根據存廢複核結果被恢復或允許重建的內容。在某些情況下，重新創建的條目有機會發展，那麼不應提交快速刪除，而應該提交存廢複核或存廢討論重新評核。' }),
		subgroup: [
			{
				name: 'g5_1',
				type: 'input',
				label: conv({ hans: '删除讨论位置：', hant: '刪除討論位置：' }),
				size: 60
			},
			{
				type: 'div',
				label: conv({ hans: '对于侵权页面，请使用Twinkle的“侵权”功能。', hant: '對於侵權頁面，請使用Twinkle的「侵權」功能。' })
			}
		],
		hideSubgroupWhenMultiple: true
	},
	{
		label: conv({ hans: 'G8: 因技术原因删除页面', hant: 'G8: 因技術原因刪除頁面' }),
		value: 'g8',
		tooltip: conv({ hans: '包括解封用户后删除用户页、因用户夺取而删除、删除无用的MediaWiki页面、因移动请求而删除页面、以改写删除重定向。', hant: '包括解封使用者後刪除使用者頁面、因使用者奪取而刪除、刪除無用的MediaWiki頁面、因移動請求而刪除頁面、以覆寫刪除重新導向。' }),
		hideWhenUser: true
	},
	{
		label: conv({ hans: 'G10: 原作者清空页面或提出删除，且实际贡献者只有一人', hant: 'G10: 原作者清空頁面或提出刪除，且實際貢獻者只有一人' }),
		value: 'g10',
		tooltip: conv({ hans: '提请须出于善意，并附有合理原因。', hant: '提請須出於善意，並附有合理原因。' }),
		subgroup: {
			name: 'g10_rationale',
			type: 'input',
			label: conv({ hans: '可选的解释：', hant: '可選的解釋：' }),
			tooltip: conv({ hans: '比如作者在哪里请求了删除。', hant: '比如作者在哪裡請求了刪除。' }),
			size: 60
		},
		hideSubgroupWhenSysop: true
	},
	{
		label: conv({ hans: 'G11: 明显的广告宣传页面，或只有相关人物或团体的联系方法的页面', hant: 'G11: 明顯的廣告宣傳頁面，或只有相關人物或團體的聯絡方法的頁面' }),
		value: 'g11',
		tooltip: conv({ hans: '页面只收宣传之用，并须完全重写才能贴合百科全书要求。须注意，仅仅以某公司或产品为主题的条目，并不直接导致其自然满足此速删标准。<br>即便该页面具有宣传情况，除非您可以非常确定该页面创建仅为广告宣传而建，否则应以收录标准提报或提删替代。', hant: '頁面只收宣傳之用，並須完全重寫才能貼合百科全書要求。須注意，僅僅以某公司或產品為主題的條目，並不直接導致其自然滿足此速刪標準。<br>即便該頁面具有宣傳情況，除非您可以非常確定該頁面建立僅為廣告宣傳而建，否則應以收錄標準提報或提刪替代。' })
	},
	{
		label: conv({ hans: 'G12: 未列明可靠来源且语调负面的生者传记', hant: 'G12: 未列明可靠來源且語調負面的生者傳記' }),
		value: 'g12',
		tooltip: conv({ hans: '“列明”指至少一个列出的来源可直接支撑条目中的任何信息，并与其中的断言相匹配。<br>如有用户对条目中列出的来源是否属于可靠来源提出合理异议，则应交由存废讨论处理。<br>注意是未列明可靠来源且语调负面，须2项均符合方适用此项。', hant: '「列明」指至少一個列出的來源可直接支撐條目中的任何資訊，並與其中的斷言相匹配。<br>如有使用者對條目中列出的來源是否屬於可靠來源提出合理異議，則應交由存廢討論處理。<br>注意是未列明可靠來源且語調負面，須2項均符合方適用此項。' })
	},
	{
		label: conv({ hans: 'G13: 翻译拙劣', hant: 'G13: 翻譯拙劣' }),
		value: 'g13',
		tooltip: conv({ hans: '不适用于所有的讨论命名空间、草稿命名空间和用户命名空间。若条目满足草稿化的条件，且无其他构成快速删除条件的问题，则应考虑优先选择草稿化，而非快速删除。', hant: '不適用於所有的討論命名空間、草稿命名空間和使用者命名空間。若條目滿足草稿化的條件，且無其他構成快速刪除條件的問題，則應考慮優先選擇草稿化，而非快速刪除。' }),
		hideInNamespaces: [ 1, 2, 3, 5, 7, 9, 11, 13, 15, 101, 118, 119, 829 ] // all talk, user, draft
	},
	{
		label: conv({ hans: 'G14: 逾14天没有翻译的非现代标准汉语页面', hant: 'G14: 逾14天沒有翻譯的非現代標準漢語頁面' }),
		value: 'g14',
		tooltip: conv({ hans: '包括所有未翻译的外语、汉语方言以及文言文。<br>此项仅适用于条目、项目、维基专题、使用说明和主题命名空间。', hant: '包括所有未翻譯的外語、漢語方言以及文言文。<br>此項僅適用於條目、計畫、維基專題、使用說明和主題命名空間。' }),
		hideWhenUser: true,
		showInNamespaces: [ 0, 4, 12, 100, 102 ] // main, wikipedia, help, portal, wikiproject
	},
	{
		label: conv({ hans: 'G15: 孤立页面', hant: 'G15: 孤立頁面' }),
		value: 'g15',
		tooltip: conv({ hans: '依附于不存在或已删除页面或文件的页面。包括但不限于下列情形：<br>1.没有对应内容页面的讨论页；<br>2.没有对应母页面的子页面；<br>3.没有对应本地文件的文件页面；<br>4.指向不存在页面的重定向；<br>5.对应页面已被删除或解除白纸保护的编辑提示。', hant: '依附於不存在或已刪除頁面或檔案的頁面。包括但不限於下列情形：<br>1.沒有對應內容頁面的討論頁；<br>2.沒有對應母頁面的子頁面；<br>3.沒有對應本地檔案的檔案頁面；<br>4.指向不存在頁面的重新導向；<br>5.對應頁面已被刪除或解除白紙保護的編輯提示。' })
	},
	{
		label: conv({ hans: 'G17: 位于不恰当的命名空间的消歧义页面', hant: 'G17: 位於不恰當的命名空間的消歧義頁面' }),
		value: 'g17',
		tooltip: conv({ hans: '在提请快速删除前，请务必先检查并清理相关消歧义页面的链入。<br>此项不论页面是否引用消歧义模板或消歧义消息模板均适用，惟对消歧义模板及消歧义消息模板本身不适用。', hant: '在提請快速刪除前，請務必先檢查並清理相關消歧義頁面的連入。<br>此項不論頁面是否引用消歧義模板或消歧義訊息模板均適用，惟對消歧義模板及消歧義訊息模板本身不適用。' }),
		hideInNamespaces: [ 0, 1, 2, 3, 4, 5, 118, 119 ] // main, user, project, draft and theirs talks
	},
	{
		label: conv({ hans: 'G19: 被草稿化而又被重建的页面', hant: 'G19: 被草稿化而又被重建的頁面' }),
		value: 'g19',
		tooltip: conv({ hans: '因为不满足维基百科对于内容的质量要求而被移动至用户命名空间或草稿命名空间作草稿之用，但其内容被以剪贴移动的方式再度发布至用户命名空间与草稿命名空间之外的页面。<br>草稿”指：所有位于用户命名空间且含{{AFC submission}}的页面、所有位于用户命名空间且显然作草稿之用的页面及所有位于草稿命名空间的页面<br>此条不要求页面被草稿化前与被再度发布后所在的命名空间必须为同一命名空间。', hant: '因為不滿足維基百科對於內容的品質要求而被移動至使用者命名空間或草稿命名空間作草稿之用，但其內容被以剪貼移動的方式再度發布至使用者命名空間與草稿命名空間之外的頁面。<br>草稿」指：所有位於使用者命名空間且含{{AFC submission}}的頁面、所有位於使用者命名空間且顯然作草稿之用的頁面及所有位於草稿命名空間的頁面<br>此條不要求頁面被草稿化前與被再度發布後所在的命名空間必須為同一命名空間。' }),
		hideInNamespaces: [ 2, 3, 118, 119 ] // user, user talk, draft, draft talk
	},
	{
		label: conv({ hans: 'G20: 未经同意以剪贴移动的方式发布的新草稿', hant: 'G20: 未經同意以剪貼移動的方式發布的新草稿' }),
		value: 'g20',
		tooltip: conv({ hans: '草稿未经主要实际贡献者明确同意，以剪贴移动的方式发布至用户命名空间与草稿命名空间之外，而本身属最近创建、经历持续修订或经历重大修订，并且未满足CC BY-SA 4.0协议条款“署名”的要求或由主要实际贡献者提出删除，并附有合理原因。<br>草稿”指：所有位于用户命名空间且含{{AFC submission}}的页面、所有位于用户命名空间且显然作草稿之用的页面及所有位于草稿命名空间的页面<br>如果主要实际贡献者多于一人，“主要实际贡献者明确同意”指所有主要实际贡献者均明确同意，而“主要实际贡献者提出删除”则指任何至少一位主要实际贡献者提出删除。', hant: '草稿未經主要實際貢獻者明確同意，以剪貼移動的方式發布至使用者命名空間與草稿命名空間之外，而本身屬最近建立、經歷持續修訂或經歷重大修訂，並且未滿足CC BY-SA 4.0協議條款「署名」的要求或由主要實際貢獻者提出刪除，並附有合理原因。<br>草稿」指：所有位於使用者命名空間且含{{AFC submission}}的頁面、所有位於使用者命名空間且顯然作草稿之用的頁面及所有位於草稿命名空間的頁面<br>如果主要實際貢獻者多於一人，「主要實際貢獻者明確同意」指所有主要實際貢獻者均明確同意，而「主要實際貢獻者提出刪除」則指任何至少一位主要實際貢獻者提出刪除。' }),
		hideInNamespaces: [ 2, 3, 118, 119 ] // user, user talk, draft, draft talk
	},
	{
		label: conv({ hans: 'G21: 极有可能使用大型语言模型生成且明显缺乏人工校对的页面', hant: 'G21: 極有可能使用大型語言模型生成且明顯缺乏人工校對的頁面' }),
		value: 'g21',
		tooltip: conv({ hans: '任何页面呈现出下列一条或多条征象，令读者可合理怀疑页面为LLM生成并缺乏人工校对，可提请快速删除。任何理性的编者读过一遍即应识别并修正下列问题内容，因此不论是否确实由LLM生成均可提请快速删除：<br>1.页面内容在不合理的地方含有针对使用AI者的指示或说明<br>2.虚假的参考文献<br>3.完全无意义的参考文献<br>上述列出的征象应为非常明确且强烈的信号，此外还有一些较为主观、依赖自由心证、且难以排除可能是不熟悉规则的编者的无心之失的征象。这些主观特征可以用来强化提请快速删除的证据，但是不应作为提请快速删除的唯一证据。', hant: '任何頁面呈現出下列一條或多條徵象，令讀者可合理懷疑頁面為LLM生成並缺乏人工校對，可提請快速刪除。任何理性的編者讀過一遍即應識別並修正下列問題內容，因此不論是否確實由LLM生成均可提請快速刪除：<br>1.頁面內容在不合理的地方含有針對使用AI者的指示或說明<br>2.虛假的參考文獻<br>3.完全無意義的參考文獻<br>上述列出的徵象應為非常明確且強烈的信號，此外還有一些較為主觀、依賴自由心證、且難以排除可能是不熟悉規則的編者的無心之失的徵象。這些主觀特徵可以用來強化提請快速刪除的證據，但是不應作為提請快速刪除的唯一證據。' })
	}
];

Twinkle.speedy.redirectList = [
	{
		label: conv({ hans: 'R2: 跨命名空间重定向', hant: 'R2: 跨命名空間重新導向' }),
		value: 'r2',
		tooltip: conv({ hans: '适用于条目命名空间和草稿命名空间。<br>社群同意设立的伪命名空间不适用。<br>草稿重定向速删前，请确保草稿已经完成其作用，且其历史已移动到相应的正式页面。', hant: '適用於條目命名空間和草稿命名空間。<br>社群同意設立的偽命名空間不適用。<br>草稿重新導向速刪前，請確保草稿已經完成其作用，且其歷史已移動到相應的正式頁面。' }),
		showInNamespaces: [ 0, 118 ] // main, draft
	},
	{
		label: conv({ hans: 'R3: 格式错误，或明显笔误的重定向', hant: 'R3: 格式錯誤，或明顯筆誤的重新導向' }),
		value: 'r3',
		tooltip: conv({ hans: '非一眼能看出的拼写错误和翻译或标题用字的争议应交由存废讨论处理。<br>将常见的拼写错误名称重定向至正确名称页面，可使百科用户纵使在查找文章时拼写错误，也能够找到寻求的文章。可参阅WP:重定向#何时用重定向？。<br>如重定向名称与导向目标名称（或其相关名称）仅存在合理的大小写差异及／或重定向名称为导向目标名称（或其相关名称）的ASCII字母表述的形式（例如Kurt Godel重定向至Kurt Gödel），不视为存在任何拼写错误。如有对相关大小写差异是否合理的争议，应交由存废讨论处理。<br>因类推简化字未收录至《通用规范汉字表》导致的繁简混杂情形，或系统无法自动进行繁简处理的情形，则不适用。', hant: '非一眼能看出的拼寫錯誤和翻譯或標題用字的爭議應交由存廢討論處理。<br>將常見的拼寫錯誤名稱重新導向至正確名稱頁面，可使百科使用者縱使在尋找文章時拼寫錯誤，也能夠找到尋求的文章。可參閱WP:重新導向#何時用重新導向？。<br>如重新導向名稱與導向目標名稱（或其相關名稱）僅存在合理的大小寫差異及／或重新導向名稱為導向目標名稱（或其相關名稱）的ASCII字母表述的形式（例如Kurt Godel重新導向至Kurt Gödel），不視為存在任何拼寫錯誤。如有對相關大小寫差異是否合理的爭議，應交由存廢討論處理。<br>因類推簡化字未收錄至《通用規範漢字表》導致的繁簡混雜情形，或系統無法自動進行繁簡處理的情形，則不適用。' }),
		subgroup: {
			name: 'r3_type',
			type: 'select',
			label: conv({ hans: '适用类型：', hant: '適用類別：' }),
			list: [
				{ label: conv({ hans: '请选择', hant: '請選擇' }), value: '' },
				{ label: conv({ hans: '标题繁简混用', hant: '標題繁簡混用' }), value: '标题繁简混用。' },
				{ label: conv({ hans: '消歧义使用的括号或空格错误', hant: '消歧義使用的括號或空格錯誤' }), value: '消歧义使用的括号或空格错误。' },
				{ label: conv({ hans: '间隔号使用错误', hant: '間隔號使用錯誤' }), value: '间隔号使用错误。' },
				{ label: conv({ hans: '标题中使用非常见的错别字', hant: '標題中使用非常見的錯別字' }), value: '标题中使用非常见的错别字。' }
			]
		},
		hideSubgroupWhenSysop: true
	},
	{
		label: conv({ hans: 'R5: 指向本身或循环的重定向', hant: 'R5: 指向本身或循環的重新導向' }),
		value: 'r5',
		tooltip: '如A→B→C→……→A。'
	},
	{
		label: conv({ hans: 'R6: 移动文件而产生的重定向，且页面标题不符合文件名指引', hant: 'R6: 移動檔案而產生的重新導向，且頁面標題不符合檔案名稱指引' }),
		value: 'r6',
		showInNamespaces: [ 6 ] // file
	},
	{
		label: conv({ hans: 'R8: 带有“(消歧义)”字样的重定向', hant: 'R8: 帶有「(消歧義)」字樣的重新導向' }),
		value: 'r8',
		tooltip: conv({ hans: '包括无内部链入以及并非指向消歧义页面的重定向。<br>若重定向页与导向目标页同样带有“(消歧义)”字样，且两者的标题仅存在繁简／地区词差异，则不适用。<br在提请快速删除前，请务必先检查并清理（如适用）相关重定向的链入。<br>如有用户对应否使用消歧义及消歧义的方式存在未解决的争议，则应交由存废讨论处理。', hant: '包括無內部鏈入以及並非指向消歧義頁面的重新導向。<br>若重新導向頁與導向目標頁同樣帶有「(消歧義)」字樣，且兩者的標題僅存在繁簡／地區詞差異，則不適用。<br>在提請快速刪除前，請務必先檢查並清理（如適用）相關重新導向的連入。<br>如有使用者對應否使用消歧義及消歧義的方式存在未解決的爭議，則應交由存廢討論處理。' })
	},
	{
		label: conv({ hans: 'R9: 导向目标明显未介绍名称所指事物的重定向', hant: 'R9: 導向目標明顯未介紹名稱所指事物的重新導向' }),
		value: 'r9',
		tooltip: conv({ hans: '导向目标完全未提及重定向名称或其别名，或虽提及但仍不含有对重定向名称所指事物的有价值描述。适用于主命名空间（条目空间）。<br>如果重定向标题或其别名是一个列表的项目之一，而该重定向的导向目标是该列表，则不适用。<br>挂有{{错字重定向}}模板的页面是否适用此条应根据其对应正字判断。如有用户对标题用字存在未解决的争议，则应交由存废讨论处理。<br>挂有{{收录标准重定向}}或{{合并重定向}}模板的页面不适用，请改为提出存废讨论。', hant: '導向目標完全未提及重新導向名稱或其別名，或雖提及但仍不含有對重新導向名稱所指事物的有價值描述。適用於主命名空間（條目空間）。<br>如果重新導向標題或其別名是一個列表的專案之一，而該重新導向的導向目標是該列表，則不適用。<br>掛有{{錯字重新導向}}模板的頁面是否適用此條應根據其對應正字判斷。如有使用者對標題用字存在未解決的爭議，則應交由存廢討論處理。<br>掛有{{收錄標準重新導向}}或{{合併重新導向}}模板的頁面不適用，請改為提出存廢討論。' }),
		showInNamespaces: [ 0 ] // main
	},
	{
		label: conv({ hans: 'R10: 名称涵盖的主题明显比导向目标更广泛的重定向', hant: 'R10: 名稱涵蓋的主題明顯比導向目標更廣泛的重新導向' }),
		value: 'r10',
		tooltip: conv({ hans: '重定向名称所指事物并非导向目标本主题或其子主题，且与导向目标主题并无密不可分的联系。适用于主命名空间（条目空间）。<br>重定向名称“具有歧义”并不属于本条文所说的“涵盖主题更广泛”。此类页面应遵循消歧义指引进行处理。<br>挂有{{收录标准重定向}}或{{合并重定向}}模板的页面不适用，请改为提出存废讨论。', hant: '重新導向名稱所指事物並非導向目標本主題或其子主題，且與導向目標主題並無密不可分的聯繫。適用於主命名空間（條目空間）。<br>重新導向名稱「具有歧義」並不屬於本條文所說的「涵蓋主題更廣泛」。此類頁面應遵循消歧義指引進行處理。<br>掛有{{收錄標準重新導向}}或{{合併重新導向}}模板的頁面不適用，請改為提出存廢討論。' }),
		showInNamespaces: [ 0 ] // main
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
	'g17': 'g17',
	'g19': 'g19',
	'g20': 'g20',
	'g21': 'g21',
	'a1': 'a1',
	'a2': 'a2',
	'a3': 'a3',
	'a5': 'a5',
	'a6': 'a6',
	'a7': 'a7',
	'r2': 'r2',
	'r3': 'r3',
	'r5': 'r5',
	'r6': 'r6',
	'r8': 'r8',
	'r9': 'r9',
	'r10': 'r10',
	'f1': 'f1',
	'f3': 'f3',
	'f4': 'f4',
	'f5': 'f5',
	'f6': 'f6',
	'f7': 'f7',
	'u1': 'u1',
	'u2': 'u2',
	'o4': 'o4',
	'o7': 'o7'
};

Twinkle.speedy.callbacks = {
	getTemplateCodeAndParams: function(params) {
		var code, parameters, i;
		if (params.normalizeds.length > 1) {
			code = '{{delete';
			params.utparams = {};
			$.each(params.normalizeds, function(index, norm) {
				if (norm !== 'db') {
					code += '|' + norm.toUpperCase();
				}
				parameters = params.templateParams[index] || [];
				for (var i in parameters) {
					if (typeof parameters[i] === 'string') {
						code += '|' + parameters[i];
					}
				}
				$.extend(params.utparams, Twinkle.speedy.getUserTalkParameters(norm, parameters));
			});
			code += '}}';
		} else {
			parameters = params.templateParams[0] || [];
			code = '{{delete';
			if (params.values[0] !== 'reason') {
				code += '|' + params.values[0];
			}
			for (i in parameters) {
				if (typeof parameters[i] === 'string') {
					code += '|' + parameters[i];
				}
			}
			code += '}}';
			params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
		}

		return [code, params.utparams];
	},

	parseWikitext: function(title, wikitext, callback) {
		var query = {
			action: 'parse',
			prop: 'text',
			pst: 'true',
			text: wikitext,
			contentmodel: 'wikitext',
			title: title
		};

		var statusIndicator = new Morebits.Status(conv({ hans: '构造删除理由', hant: '構造刪除理由' }));
		var api = new Morebits.wiki.Api(conv({ hans: '解析删除模板', hant: '解析刪除模板' }), query, function (apiObj) {
			var reason = decodeURIComponent($(apiObj.getXML().querySelector('text').childNodes[0].nodeValue).find('#delete-reason').text().replace(/\+/g, ' '));
			if (!reason) {
				statusIndicator.warn(conv({ hans: '未能从删除模板生成删除理由', hant: '未能從刪除模板生成刪除理由' }));
			} else {
				statusIndicator.info('完成');
			}
			callback(reason);
		}, statusIndicator);
		api.post();
	},

	sysop: {
		main: function(params) {
			var reason;

			if (!params.normalizeds.length && params.normalizeds[0] === 'db') {
				reason = prompt(conv({ hans: '输入删除理由：', hant: '輸入刪除理由：' }), '');
				Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
			} else {
				var code = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params)[0];
				Twinkle.speedy.callbacks.parseWikitext(mw.config.get('wgPageName'), code, function(reason) {
					if (params.promptForSummary) {
						reason = prompt(conv({ hans: '输入删除理由，或单击确定以接受自动生成的：', hant: '輸入刪除理由，或點擊確定以接受自動生成的：' }), reason);
					}
					Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
				});
			}
		},
		deletePage: function(reason, params) {
			var thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '删除页面', hant: '刪除頁面' }));

			if (reason === null) {
				return Morebits.Status.error(conv({ hans: '询问理由', hant: '詢問理由' }), conv({ hans: '用户取消操作。', hant: '使用者取消操作。' }));
			} else if (!reason || !reason.replace(/^\s*/, '').replace(/\s*$/, '')) {
				return Morebits.Status.error(conv({ hans: '询问理由', hant: '詢問理由' }), conv({ hans: '你不给我理由…我就…不管了…', hant: '你不給我理由…我就…不管了…' }));
			}

			var deleteMain = function() {
				thispage.setEditSummary(reason);
				thispage.setChangeTags(Twinkle.changeTags);
				thispage.setWatchlist(params.watch);
				thispage.deletePage(function() {
					thispage.getStatusElement().info('完成');
					Twinkle.speedy.callbacks.sysop.deleteTalk(params);
				});
			};

			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if (params.openUserTalk) {
				thispage.setCallbackParameters(params);
				thispage.lookupCreation(function() {
					Twinkle.speedy.callbacks.sysop.openUserTalkPage(thispage);
					deleteMain();
				});
			} else {
				deleteMain();
			}
		},
		deleteTalk: function(params) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'f7' &&
					params.normalized !== 'u1' &&
					!document.getElementById('ca-talk').classList.contains('new')) {
				var talkpage = new Morebits.wiki.Page(mw.config.get('wgFormattedNamespaces')[mw.config.get('wgNamespaceNumber') + 1] + ':' + mw.config.get('wgTitle'), conv({ hans: '删除讨论页', hant: '刪除討論頁' }));
				talkpage.setEditSummary('[[WP:CSD#G15|G15]]: 孤立页面: 已删除页面“' + Morebits.pageNameNorm + '”的讨论页');
				talkpage.setChangeTags(Twinkle.changeTags);
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(function() {
					Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
				}, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
			}
		},
		deleteRedirects: function(params) {
			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					action: 'query',
					titles: mw.config.get('wgPageName'),
					prop: 'redirects',
					rdlimit: 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '获取重定向列表…', hant: '取得重新導向列表…' }), query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.Status(conv({ hans: '删除重定向', hant: '刪除重新導向' })));
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			// prompt for protect on G11
			var $link, $bigtext;
			if (params.normalized === 'g11') {
				$link = $('<a/>', {
					href: '#',
					text: conv({ hans: '单击这里施行保护', hant: '點擊這裡施行保護' }),
					css: { fontSize: '130%', fontWeight: 'bold' },
					click: function() {
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						mw.config.set('wgArticleId', 0);
						Twinkle.protect.callback();
					}
				});
				$bigtext = $('<span/>', {
					text: conv({ hans: '白纸保护该页', hant: '白紙保護該頁' }),
					css: { fontSize: '130%', fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			}

			// promote Unlink tool
			if (mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f7') {
				$link = $('<a/>', {
					href: '#',
					text: conv({ hans: '单击这里前往取消链入工具', hant: '點擊這裡前往取消連入工具' }),
					css: { fontWeight: 'bold' },
					click: function() {
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback(conv({ hans: '取消对已删除文件 ', hant: '取消對已刪除檔案 ' }) + Morebits.pageNameNorm + ' 的使用');
					}
				});
				$bigtext = $('<span/>', {
					text: conv({ hans: '取消对已删除文件的使用', hant: '取消對已刪除檔案的使用' }),
					css: { fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f7') {
				$link = $('<a/>', {
					href: '#',
					text: conv({ hans: '单击这里前往取消链入工具', hant: '點擊這裡前往取消連入工具' }),
					css: { fontWeight: 'bold' },
					click: function() {
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback(conv({ hans: '取消对已删除页面 ', hant: '取消對已刪除頁面 ' }) + Morebits.pageNameNorm + conv({ hans: ' 的链接', hant: ' 的連結' }));
					}
				});
				$bigtext = $('<span/>', {
					text: conv({ hans: '取消对已删除页面的链接', hant: '取消對已刪除頁面的連結' }),
					css: { fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			}

			$link = $('<a>', {
				href: mw.util.getUrl('Special:RandomInCategory/快速删除候选'),
				text: conv({ hans: '单击前往下一个快速删除候选', hant: '點擊前往下一個快速刪除候選' })
			});
			Morebits.Status.info('工具', $link[0]);
		},
		openUserTalkPage: function(pageobj) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var params = pageobj.getCallbackParameters();

			var query = {
				title: 'User talk:' + user,
				action: 'edit',
				preview: 'yes',
				vanarticle: Morebits.pageNameNorm
			};

			if (params.normalized === 'db' || Twinkle.getPref('promptForSpeedyDeletionSummary').indexOf(params.normalized) !== -1) {
				// provide a link to the user talk page
				var $link, $bigtext;
				$link = $('<a/>', {
					href: mw.util.wikiScript('index') + '?' + $.param(query),
					text: conv({ hans: '点此打开User talk:', hant: '點此打開User talk:' }) + user,
					target: '_blank',
					css: { fontSize: '130%', fontWeight: 'bold' }
				});
				$bigtext = $('<span/>', {
					text: conv({ hans: '通知页面创建者', hant: '通知頁面建立者' }),
					css: { fontSize: '130%', fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			} else {
				// open the initial contributor's talk page
				var statusIndicator = new Morebits.Status(conv({ hans: '打开用户', hant: '打開使用者' }) + user + conv({ hans: '的讨论页编辑窗口', hant: '的討論頁編輯視窗' }), conv({ hans: '打开中…', hant: '打開中…' }));

				switch (Twinkle.getPref('userTalkPageMode')) {
					case 'tab':
						window.open(mw.util.wikiScript('index') + '?' + $.param(query), '_blank');
						break;
					case 'blank':
						window.open(mw.util.wikiScript('index') + '?' + $.param(query), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
						break;
					case 'window':
					/* falls through */
					default:
						window.open(mw.util.wikiScript('index') + '?' + $.param(query),
							window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow',
							'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
						break;
				}

				statusIndicator.info('完成');
			}
		},
		deleteRedirectsMain: function(apiobj) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('redirects rd');
			var total = $snapshot.length;
			var statusIndicator = apiobj.statelem;

			if (!total) {
				statusIndicator.info(conv({ hans: '未发现重定向', hant: '未發現重新導向' }));
				return;
			}

			statusIndicator.status('0%');

			var current = 0;
			var onsuccess = function(apiobjInner) {
				var now = parseInt(100 * ++current / total, 10) + '%';
				statusIndicator.update(now);
				apiobjInner.statelem.unlink();
				if (current >= total) {
					statusIndicator.info(now + '（完成）');
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.Page(title, conv({ hans: '删除重定向 "', hant: '刪除重新導向 "' }) + title + '"');
				page.setEditSummary('[[WP:CSD#G15|G15]]: 孤立页面: 重定向到已删除页面“' + Morebits.pageNameNorm + '”');
				page.setChangeTags(Twinkle.changeTags);
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error(conv({ hans: '页面不存在，可能已被删除', hant: '頁面不存在，可能已被刪除' }));
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status(conv({ hans: '检查页面已有标记…', hant: '檢查頁面已有標記…' }));

			// check for existing deletion tags
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|deletebecause|speedy|csd|速刪|速删|快删|快刪)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
			if (text !== textNoSd && !confirm(conv({ hans: '在页面上找到快速删除模板，要移除并加入新的吗？', hant: '在頁面上找到快速刪除模板，要移除並加入新的嗎？' }))) {
				statelem.error(conv({ hans: '快速删除模板已被置于页面中。', hant: '快速刪除模板已被置於頁面中。' }));
				return;
			}
			text = textNoSd;

			var copyvio = /(?:\{\{\s*(copyvio|侵权|侵權)[^{}]*?\}\})/i.exec(text);
			if (copyvio && !confirm(conv({ hans: '著作权验证模板已被置于页面中，您是否仍想加入一个快速删除模板？', hant: '著作權驗證模板已被置於頁面中，您是否仍想加入一個快速刪除模板？' }))) {
				statelem.error(conv({ hans: '页面中已有著作权验证模板。', hant: '頁面中已有著作權驗證模板。' }));
				return;
			}

			var xfd = /(?:\{\{([rsaiftcmv]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec(text);
			if (xfd && !confirm(conv({ hans: '删除相关模板{{', hant: '刪除相關模板{{' }) + xfd[1] + conv({ hans: '}}已被置于页面中，您是否仍想加入一个快速删除模板？', hant: '}}已被置於頁面中，您是否仍想加入一個快速刪除模板？' }))) {
				statelem.error(conv({ hans: '页面已被提交至存废讨论。', hant: '頁面已被提交至存廢討論。' }));
				return;
			}

			// given the params, builds the template and also adds the user talk page parameters to the params that were passed in
			// returns => [<string> wikitext, <object> utparams]
			var buildData = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params),
				code = buildData[0];
			params.utparams = buildData[1];

			var thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if (Twinkle.getPref('markSpeedyPagesAsPatrolled')) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = '<noinclude>' + code + '</noinclude>';
			}

			// Remove tags that become superfluous with this action
			text = text.replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
			if (mw.config.get('wgNamespaceNumber') === 6) {
				// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
				text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
			}

			if (params.requestsalt) {
				code = '{{salt}}\n' + code;
			}

			// Generate edit summary for edit
			var editsummary;
			if (params.normalizeds.length > 1) {
				editsummary = conv({ hans: '请求快速删除（', hant: '請求快速刪除（' });
				$.each(params.normalizeds, function(index, norm) {
					if (norm !== 'db') {
						editsummary += '[[WP:CSD#' + norm.toUpperCase() + '|CSD ' + norm.toUpperCase() + ']]、';
					}
				});
				editsummary = editsummary.substr(0, editsummary.length - 1); // remove trailing comma
				editsummary += '）';
			} else if (params.normalizeds[0] === 'db') {
				editsummary = conv({ hans: '请求[[WP:CSD|快速删除]]：', hant: '請求[[WP:CSD|快速刪除]]：' }) + params.templateParams[0]['1'];
			} else {
				editsummary = conv({ hans: '请求快速删除', hant: '請求快速刪除' }) + '（[[WP:CSD#' + params.normalizeds[0].toUpperCase() + '|CSD ' + params.normalizeds[0].toUpperCase() + ']]）';
			}


			// Blank attack pages
			if (params.blank) {
				text = code;
			} else {
				// Insert tag after short description or any hatnotes
				var wikipage = new Morebits.wikitext.Page(text);
				text = wikipage.insertAfterTemplates(code + '\n', Twinkle.hatnoteRegex).getText();
			}


			pageobj.setPageText(text);
			pageobj.setEditSummary(editsummary);
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(params.watch);
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
						Morebits.Status.warn('您（' + initialContrib + conv({ hans: '）创建了该页，跳过通知', hant: '）建立了該頁，跳過通知' }));
						initialContrib = null;

					// don't notify users when their user talk page is nominated
					} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.Status.warn(conv({ hans: '通知页面创建者：用户创建了自己的讨论页', hant: '通知頁面建立者：使用者建立了自己的討論頁' }));
						initialContrib = null;

					// quick hack to prevent excessive unwanted notifications. Should actually be configurable on recipient page...
					} else if (initialContrib === 'A2093064-bot' && params.normalizeds[0] === 'g15') {
						Morebits.Status.warn(conv({ hans: '通知页面创建者：由机器人创建，跳过通知', hant: '通知頁面建立者：由機器人建立，跳過通知' }));
						initialContrib = null;

					} else {
						var talkPageName = 'User talk:' + initialContrib;
						var usertalkpage = new Morebits.wiki.Page(talkPageName, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + initialContrib + '）'),
							notifytext;

						notifytext = '\n{{subst:db-notice|target=' + Morebits.pageNameNorm;
						notifytext += (params.welcomeuser ? '' : '|nowelcome=yes') + '}}--~~~~';

						var editsummary = '通知：';
						if (params.normalizeds.indexOf('g12') === -1) {  // no article name in summary for G10 deletions
							editsummary += '页面[[' + Morebits.pageNameNorm + ']]';
						} else {
							editsummary += '一攻击性页面';
						}
						editsummary += '快速删除提名';

						usertalkpage.setAppendText(notifytext);
						usertalkpage.setEditSummary(editsummary);
						usertalkpage.setChangeTags(Twinkle.changeTags);
						usertalkpage.setCreateOption('recreate');
						usertalkpage.setFollowRedirect(true, false);
						usertalkpage.append();
					}

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.Page(Morebits.pageNameNorm);
				thispage.lookupCreation(callback);
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			} else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.templatename, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var usl = new Morebits.UserspaceLogger(Twinkle.getPref('speedyLogPageName'));
			usl.initialText =
				'这是该用户使用[[WP:TW|Twinkle]]的速删模块做出的[[WP:CSD|快速删除]]提名列表。\n\n' +
				'如果您不再想保留此日志，请在[[' + Twinkle.getPref('configPage') + '|参数设置]]中关掉，并' +
				'使用[[WP:CSD#U1|CSD U1]]提交快速删除。' +
				(Morebits.userIsSysop ? '\n\n此日志并不记录用Twinkle直接执行的删除。' : '');

			var appendText = '# [[:' + Morebits.pageNameNorm + ']]：';
			if (params.fromDI) {
				if (params.normalized === 'f3 f4') {
					appendText += '图版[[WP:CSD#F3|CSD F3]]+[[WP:CSD#F4|CSD F4]]（{{tl|no source no license/auto}}）';
				} else {
					appendText += '图版[[WP:CSD#' + params.normalized.toUpperCase() + '|CSD ' + params.normalized.toUpperCase() + ']]（{{tl|' + params.templatename + '}}）';
				}
			} else {
				if (params.normalizeds.length > 1) {
					appendText += '多个理由（';
					$.each(params.normalizeds, function(index, norm) {
						appendText += '[[WP:CSD#' + norm.toUpperCase() + '|' + norm.toUpperCase() + ']]、';
					});
					appendText = appendText.substr(0, appendText.length - 1);  // remove trailing comma
					appendText += '）';
				} else if (params.normalizeds[0] === 'db') {
					appendText += '自定义理由';
				} else {
					appendText += '[[WP:CSD#' + params.normalizeds[0].toUpperCase() + '|CSD ' + params.normalizeds[0].toUpperCase() + ']]';
				}
			}

			if (params.requestsalt) {
				appendText += conv({ hans: '；请求白纸保护', hant: '；請求白紙保護' });
			}
			if (initialContrib) {
				appendText += '；通知{{user|' + initialContrib + '}}';
			}
			appendText += ' ~~~~~\n';

			usl.changeTags = Twinkle.changeTags;
			usl.log(appendText, conv({ hans: '记录对[[', hant: '記錄對[[' }) + Morebits.pageNameNorm + conv({ hans: ']]的快速删除提名', hant: ']]的快速刪除提名' }));
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	var parameters = [];

	$.each(values, function(index, value) {
		var currentParams = [];
		var redimage;
		switch (value) {
			case 'reason':
				if (form['csd.reason_1']) {
					var dbrationale = form['csd.reason_1'].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert(conv({ hans: '自定义理由：请指定理由。', hant: '自訂理由：請指定理由。' }));
						parameters = null;
						return false;
					}
					currentParams['1'] = dbrationale;
				}
				break;

			case 'a3':
				if (form['csd.a3_pagename'] && form['csd.a3_pagename'].value) {
					currentParams.pagename = form['csd.a3_pagename'].value;
				}
				break;

			case 'a5':
				if (form['csd.a5_pagename']) {
					var otherpage = form['csd.a5_pagename'].value;
					if (!otherpage || !otherpage.trim()) {
						alert(conv({ hans: 'CSD A5：请提供现有页面的名称。', hant: 'CSD A5：請提供現有頁面的名稱。' }));
						parameters = null;
						return false;
					}
					currentParams.pagename = otherpage;
				}
				break;

			case 'a6':
				if (form['csd.a6_pagename'] && form['csd.a6_pagename'].value) {
					currentParams.pagename = form['csd.a6_pagename'].value;
				}
				break;

			case 'a7':
				if (form['csd.a7_pagename']) {
					let pagename = form['csd.a7_pagename'].value;
					if (!pagename || !pagename.trim()) {
						alert(conv({ hans: 'CSD A7：请提供原存废讨论位置。', hant: 'CSD A7：請提供原存廢討論位置。' }));
						parameters = null;
						return false;
					}
					currentParams.pagename = pagename;
				}
				break;

			case 'g5':
				if (form['csd.g5_1']) {
					var deldisc = form['csd.g5_1'].value;
					if (deldisc) {
						if (!/^(Wikipedia|WP|维基百科|維基百科):/i.test(deldisc)) {
							alert(conv({ hans: 'CSD G5：您提供的讨论页名必须以“Wikipedia:”开头。', hant: 'CSD G5：您提供的討論頁名必須以「Wikipedia:」開頭。' }));
							parameters = null;
							return false;
						}
						currentParams['1'] = deldisc;
					}
				}
				break;

			case 'g10':
				if (form['csd.g10_rationale'] && form['csd.g10_rationale'].value) {
					currentParams.rationale = form['csd.g10_rationale'].value;
				}
				break;

			case 'g16':
				if (form['csd.g16_pagename']) {
					var pagename = form['csd.g16_pagename'].value;
					if (!pagename || !pagename.trim()) {
						alert(conv({ hans: 'CSD G16：请提供页面名称。', hant: 'CSD G16：請提供頁面名稱。' }));
						parameters = null;
						return false;
					}
					currentParams.pagename = pagename;
				}
				break;

			case 'f1':
				if (form['csd.f1_filename']) {
					redimage = form['csd.f1_filename'].value;
					if (!redimage || !redimage.trim()) {
						alert(conv({ hans: 'CSD F1：请提供另一文件的名称。', hant: 'CSD F1：請提供另一檔案的名稱。' }));
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i'), '');
				}
				break;

			case 'f5':
				if (form['csd.f5_filename']) {
					redimage = form['csd.f5_filename'].value;
					if (!redimage || !redimage.trim()) {
						alert(conv({ hans: 'CSD F5：请提供另一文件的名称。', hant: 'CSD F5：請提供另一檔案的名稱。' }));
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i'), '');
				}
				break;

			case 'f7':
				if (form['csd.f7_filename']) {
					var filename = form['csd.f7_filename'].value;
					if (filename && filename !== Morebits.pageNameNorm) {
						if (filename.indexOf('Image:') === 0 || filename.indexOf('File:') === 0 ||
							filename.indexOf('文件:') === 0 || filename.indexOf('檔案:') === 0) {
							currentParams['1'] = filename;
						} else {
							currentParams['1'] = 'File:' + filename;
						}
					}
				}
				break;

			case 'r3':
				if (form['csd.r3_type']) {
					var redirtype = form['csd.r3_type'].value;
					if (!redirtype) {
						alert(conv({ hans: 'CSD R3：请选择适用类型。', hant: 'CSD R3：請選擇適用類別。' }));
						parameters = null;
						return false;
					}
					currentParams['1'] = redirtype;
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
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) { // eslint-disable-line no-unused-vars
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
		alert(conv({ hans: '请选择一个理据！', hant: '請選擇一個理據！' }));
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
	var form = e.target.form ? e.target.form : e.target;

	if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
		return;
	}

	var tag_only = form.tag_only;
	if (tag_only && tag_only.checked) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}

	var normalizeds = values.map(function(value) {
		return Twinkle.speedy.normalizeHash[value];
	});

	// analyse each criterion to determine whether to watch the page, prompt for summary, or open user talk page
	var watchPage, promptForSummary;
	normalizeds.forEach(function(norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = Twinkle.getPref('watchSpeedyExpiry');
		}
		if (Twinkle.getPref('promptForSpeedyDeletionSummary').indexOf(norm) !== -1) {
			promptForSummary = true;
		}
	});

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked,
		openUserTalk: form.openusertalk.checked,
		promptForSummary: promptForSummary,
		templateParams: Twinkle.speedy.getParameters(form, values)
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Twinkle.speedy.callbacks.sysop.main(params);
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	var form = e.target.form ? e.target.form : e.target;

	if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	// var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[value];

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = Twinkle.getPref('watchSpeedyExpiry');
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
		blank: form.blank.checked,
		requestsalt: form.salting.checked,
		templateParams: Twinkle.speedy.getParameters(form, values)
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = conv({ hans: '标记完成', hant: '標記完成' });

	var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '标记页面', hant: '標記頁面' }));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};

Twinkle.addInitCallback(Twinkle.speedy, 'speedy');
})();


// </nowiki>
