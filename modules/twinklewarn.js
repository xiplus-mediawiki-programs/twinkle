// <nowiki>


(function() {


/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              Any page with relevant user name (userspace, contribs,
 *                         etc.), as well as the rollback success page
 */

var conv = require('ext.gadget.HanAssist').conv, initialBlockId, initialBlockInfo;

Twinkle.warn = function twinklewarn() {

	if (Morebits.wiki.flow.relevantUserName()) {
		Twinkle.addPortletLink(Twinkle.warn.callback, '警告', 'tw-warn', conv({ hans: '警告或提醒用户', hant: '警告或提醒使用者' }));
		if (Twinkle.getPref('autoMenuAfterRollback') &&
			mw.config.get('wgNamespaceNumber') === 3 &&
			mw.util.getParamValue('vanarticle') &&
			!mw.util.getParamValue('friendlywelcome') &&
			!mw.util.getParamValue('noautowarn')) {
			Twinkle.warn.callback();
		}
	}

	// Modify URL of talk page on rollback success pages, makes use of a
	// custom message box in [[MediaWiki:Rollback-success]]
	if (mw.config.get('wgAction') === 'rollback') {
		var $vandalTalkLink = $('#mw-rollback-success').find('.mw-usertoollinks a').first();
		if ($vandalTalkLink.length) {
			Twinkle.warn.makeVandalTalkLink($vandalTalkLink, Morebits.pageNameNorm);
			$vandalTalkLink.css('font-weight', 'bold');
		}
	}

	if (mw.config.get('wgCanonicalSpecialPageName') === 'AbuseLog' && mw.config.get('wgAbuseFilterVariables') !== null) {
		var afTalkLink = $('.mw-usertoollinks-talk').first();
		if (afTalkLink.length) {
			Twinkle.warn.makeVandalTalkLink(afTalkLink, mw.config.get('wgAbuseFilterVariables').page_prefixedtitle);
			afTalkLink.css('font-weight', 'bold');
		}
	}

	// Override the mw.notify function to allow us to inject a link into the
	// rollback success popup. Only users with the 'rollback' right need this,
	// but we have no nice way of knowing who has that right (what with global
	// groups and the like)
	/*
	else if( mw.config.get('wgAction') === 'history' ) {
		mw.notifyOriginal = mw.notify;
		mw.notify = function mwNotifyTwinkleOverride(message, options) {
			// This is a horrible, awful hack to add a link to the rollback success
			// popup. All other notification popups should be left untouched.
			// It won't work for people whose user language is not English.
			// As it's a hack, it's liable to stop working or break sometimes,
			// particularly if the text or format of the confirmation message
			// (MediaWiki:Rollback-success-notify) changes.
			var regexMatch;
			if ( options && options.title && mw.msg && options.title === mw.msg('actioncomplete') &&
				message && $.isArray(message) && message[0] instanceof HTMLParagraphElement &&
				(regexMatch = /^(?:回退|還原|取消|撤销|撤銷)(.+)(?:编辑|編輯|做出的編輯|做出的编辑|做出的修订版本|做出的修訂版本)/.exec(message[0].innerText))
			) {
				// Create a nicely-styled paragraph to place the link in
				var $p = $('<p/>');
				$p.css("margin", "0.5em -1.5em -1.5em");
				$p.css("padding", "0.5em 1.5em 0.8em");
				$p.css("border-top", "1px #666 solid");
				$p.css("cursor", "default");
				$p.click(function(e) { e.stopPropagation(); });

				// Create the new talk link and append it to the end of the message
				var $vandalTalkLink = $('<a/>');
				$vandalTalkLink.text("用Twinkle警告用户");
				//$vandalTalkLink.css("display", "block");
				$vandalTalkLink.attr("href", mw.util.getUrl("User talk:" + regexMatch[1]));
				Twinkle.warn.makeVandalTalkLink($vandalTalkLink);

				$p.append($vandalTalkLink);
				message[0].appendChild($p.get()[0]);

				// Don't auto-hide the notification. It only stays around for 5 seconds by
				// default, which might not be enough time for the user to read it and
				// click the link
				options.autoHide = false;
			}
			mw.notifyOriginal.apply(mw, arguments);
		};
	}
	*/

	// for testing, use:
	// mw.notify([ $("<p>Reverted edits by foo; changed</p>")[0] ], { title: mw.msg('actioncomplete') } );
};

Twinkle.warn.makeVandalTalkLink = function($vandalTalkLink, pagename) {
	$vandalTalkLink.wrapInner($('<span/>').attr('title', conv({ hans: '如果合适，您可以用Twinkle在该用户讨论页上做出警告。', hant: '如果合適，您可以用Twinkle在該使用者討論頁上做出警告。' })));

	var extraParam = 'vanarticle=' + mw.util.rawurlencode(pagename);
	var href = $vandalTalkLink.attr('href');
	if (href.indexOf('?') === -1) {
		$vandalTalkLink.attr('href', href + '?' + extraParam);
	} else {
		$vandalTalkLink.attr('href', href + '&' + extraParam);
	}
};

// Used to close window when switching to ARV in autolevel
Twinkle.warn.dialog = null;

Twinkle.warn.callback = function twinklewarnCallback() {
	if (Morebits.wiki.flow.relevantUserName() === mw.config.get('wgUserName') &&
		!confirm(conv({ hans: '您将要警告自己！您确定要继续吗？', hant: '您將要警告自己！您確定要繼續嗎？' }))) {
		return;
	}
	var dialog;
	Twinkle.warn.dialog = new Morebits.SimpleWindow(600, 440);
	dialog = Twinkle.warn.dialog;
	dialog.setTitle(conv({ hans: '警告、提醒用户', hant: '警告、提醒使用者' }));
	dialog.setScriptName('Twinkle');
	dialog.addFooterLink(conv({ hans: '选择警告级别', hant: '選擇警告級別' }), 'WP:WARN');
	dialog.addFooterLink(conv({ hans: '警告设置', hant: '警告設定' }), 'WP:TW/PREF#warn');
	dialog.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#warn');

	var form = new Morebits.QuickForm(Twinkle.warn.callback.evaluate);
	var main_select = form.append({
		type: 'field',
		label: conv({ hans: '选择要发送的警告或提醒类型', hant: '選擇要傳送的警告或提醒類別' }),
		tooltip: conv({ hans: '首先选择一组，再选择具体的警告模板。', hant: '首先選擇一組，再選擇具體的警告模板。' })
	});

	var main_group = main_select.append({
		type: 'select',
		name: 'main_group',
		tooltip: conv({ hans: '您可在Twinkle参数设置中设置默认选择的选项', hant: '您可在Twinkle偏好設定中設定預設選擇的選項' }),
		event: Twinkle.warn.callback.change_category
	});

	var defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append({ type: 'option', label: conv({ hans: '自动选择层级（1-4）', hant: '自動選擇層級（1-4）' }), value: 'autolevel', selected: defaultGroup === 11 });
	main_group.append({ type: 'option', label: '1：提醒', value: 'level1', selected: defaultGroup === 1 });
	main_group.append({ type: 'option', label: '2：注意', value: 'level2', selected: defaultGroup === 2 });
	main_group.append({ type: 'option', label: '3：警告', value: 'level3', selected: defaultGroup === 3 });
	main_group.append({ type: 'option', label: conv({ hans: '4：最后警告', hant: '4：最後警告' }), value: 'level4', selected: defaultGroup === 4 });
	main_group.append({ type: 'option', label: '4im：唯一警告', value: 'level4im', selected: defaultGroup === 5 });
	if (Twinkle.getPref('combinedSingletMenus')) {
		main_group.append({ type: 'option', label: conv({ hans: '单层级消息', hant: '單層級訊息' }), value: 'singlecombined', selected: defaultGroup === 6 || defaultGroup === 7 });
	} else {
		main_group.append({ type: 'option', label: conv({ hans: '单层级提醒', hant: '單層級提醒' }), value: 'singlenotice', selected: defaultGroup === 6 });
		main_group.append({ type: 'option', label: conv({ hans: '单层级警告', hant: '單層級警告' }), value: 'singlewarn', selected: defaultGroup === 7 });
	}
	if (Twinkle.getPref('customWarningList').length) {
		main_group.append({ type: 'option', label: conv({ hans: '自定义警告', hant: '自訂警告' }), value: 'custom', selected: defaultGroup === 9 });
	}
	main_group.append({ type: 'option', label: '所有警告模板', value: 'kitchensink', selected: defaultGroup === 10 });

	main_select.append({ type: 'select', name: 'sub_group', event: Twinkle.warn.callback.change_subcategory }); // Will be empty to begin with.

	form.append({
		type: 'input',
		name: 'article',
		label: conv({ hans: '页面链接', hant: '頁面連結' }),
		value: mw.util.getParamValue('vanarticle') || '',
		size: 50,
		tooltip: conv({ hans: '给模板中加入一页面链接，可留空。', hant: '給模板中加入一頁面連結，可留空。' }),
		placeholder: conv({ hans: '仅限一个，勿使用网址、[[ ]]，可使用Special:Diff', hant: '僅限一個，勿使用網址、[[ ]]，可使用Special:Diff' })
	});

	form.append({
		type: 'div',
		label: '',
		style: 'color: red',
		id: 'twinkle-warn-warning-messages'
	});


	var more = form.append({ type: 'field', name: 'reasonGroup', label: conv({ hans: '警告信息', hant: '警告資訊' }) });
	more.append({ type: 'textarea', label: conv({ hans: '可选信息：', hant: '可選資訊：' }), name: 'reason', tooltip: conv({ hans: '理由或是附加信息', hant: '理由或是附加資訊' }) });

	var previewlink = document.createElement('a');
	$(previewlink).click(function() {
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = conv({ hans: '预览', hant: '預覽' });
	more.append({ type: 'div', id: 'warningpreview', label: [ previewlink ] });
	more.append({ type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' });

	more.append({ type: 'submit', label: '提交' });

	var result = form.render();
	dialog.setContent(result);
	dialog.display();
	result.main_group.root = result;
	result.previewer = new Morebits.wiki.Preview($(result).find('div#twinklewarn-previewbox').last()[0]);

	// Potential notices for staleness and missed reverts
	var message = '';
	var query = {};
	var vanrevid = mw.util.getParamValue('vanarticlerevid');
	if (vanrevid) {
		// If you tried reverting, check if *you* actually reverted
		if (!mw.util.getParamValue('noautowarn') && mw.util.getParamValue('vanarticle')) { // Via fluff link
			query = {
				action: 'query',
				titles: mw.util.getParamValue('vanarticle'),
				prop: 'revisions',
				rvstartid: vanrevid,
				rvlimit: 2,
				rvdir: 'newer',
				rvprop: 'user'
			};

			new Morebits.wiki.Api(conv({ hans: '检查您是否成功回退该页面', hant: '檢查您是否成功回退該頁面' }), query, function (apiobj) {
				var revertUser = $(apiobj.getResponse()).find('revisions rev')[1].getAttribute('user');
				if (revertUser && revertUser !== mw.config.get('wgUserName')) {
					message += conv({ hans: '其他人回退了该页面，并可能已经警告该用户。', hant: '其他人回退了該頁面，並可能已經警告該使用者。' });
					$('#twinkle-warn-warning-messages').text('注意：' + message);
				}
			}).post();
		}

		// Confirm edit wasn't too old for a warning
		var checkStale = function(vantimestamp) {
			var revDate = new Morebits.Date(vantimestamp);
			if (vantimestamp && revDate.isValid()) {
				if (revDate.add(24, 'hours').isBefore(new Date())) {
					message += conv({ hans: '这笔编辑是在24小时前做出的，现在警告可能已过时。', hant: '這筆編輯是在24小時前做出的，現在警告可能已過時。' });
					$('#twinkle-warn-warning-messages').text('注意：' + message);
				}
			}
		};

		var vantimestamp = mw.util.getParamValue('vantimestamp');
		// Provided from a fluff module-based revert, no API lookup necessary
		if (vantimestamp) {
			checkStale(vantimestamp);
		} else {
			query = {
				action: 'query',
				prop: 'revisions',
				rvprop: 'timestamp',
				revids: vanrevid
			};
			new Morebits.wiki.Api(conv({ hans: '获取版本时间戳', hant: '取得版本時間戳' }), query, function (apiobj) {
				vantimestamp = $(apiobj.getResponse()).find('revisions rev').attr('timestamp');
				checkStale(vantimestamp);
			}).post();
		}
	}

	if (mw.util.isIPAddress(Morebits.wiki.flow.relevantUserName())) {
		query = {
			format: 'json',
			action: 'query',
			list: 'usercontribs',
			uclimit: 1,
			ucend: new Morebits.Date().subtract(30, 'days').format('YYYY-MM-DDTHH:MM:ssZ', 'utc'),
			ucuser: Morebits.wiki.flow.relevantUserName()
		};
		new Morebits.wiki.Api(conv({ hans: '检查该IP用户上一笔贡献时间', hant: '檢查該IP使用者上一筆貢獻時間' }), query, function (apiobj) {
			if (apiobj.getResponse().query.usercontribs.length === 0) {
				message += conv({ hans: '此IP用户上一次编辑在30日之前，现在警告可能已过时。', hant: '此IP使用者上一次編輯在30日之前，現在警告可能已過時。' });
				$('#twinkle-warn-warning-messages').text('注意：' + message);
			}
		}).post();
	}

	var init = function() {
		// We must init the first choice (General Note);
		var evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.main_group.dispatchEvent(evt);
	};

	Morebits.wiki.flow.check('User_talk:' + Morebits.wiki.flow.relevantUserName(), function () {
		Twinkle.warn.isFlow = true;
		init();
	}, function () {
		Twinkle.warn.isFlow = false;
		init();
	});
	Twinkle.block.fetchUserInfo(function () {
		initialBlockId = Twinkle.block.blockLogId;
		initialBlockInfo = Twinkle.block.currentBlockInfo;
	});
};

// This is all the messages that might be dispatched by the code
// Each of the individual templates require the following information:
//   label (required): A short description displayed in the dialog
//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with ". $summaryAd"
//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
Twinkle.warn.messages = {
	levels: [{
		category: conv({ hans: '不同类型的非建设编辑', hant: '不同類別的非建設編輯' }),
		list: {
			'uw-vandalism': {
				level1: {
					label: conv({ hans: '明显的破坏', hant: '明顯的破壞' }),
					summary: conv({ hans: '提醒：明显破坏', hant: '提醒：明顯破壞' })
				},
				level2: {
					label: conv({ hans: '明显的破坏', hant: '明顯的破壞' }),
					summary: conv({ hans: '注意：明显破坏', hant: '注意：明顯破壞' })
				},
				level3: {
					label: conv({ hans: '恶意破坏', hant: '惡意破壞' }),
					summary: conv({ hans: '警告：恶意破坏', hant: '警告：惡意破壞' })
				},
				level4: {
					label: conv({ hans: '恶意破坏', hant: '惡意破壞' }),
					summary: conv({ hans: '最后警告：恶意破坏', hant: '最後警告：惡意破壞' })
				},
				level4im: {
					label: conv({ hans: '恶意破坏', hant: '惡意破壞' }),
					summary: conv({ hans: '唯一警告：恶意破坏', hant: '唯一警告：惡意破壞' })
				}
			},
			'uw-test': {
				level1: {
					label: conv({ hans: '进行编辑测试而未及时清理', hant: '進行編輯測試而未及時清理' }),
					summary: conv({ hans: '提醒：进行编辑测试而未及时清理', hant: '提醒：進行編輯測試而未及時清理' })
				},
				level2: {
					label: conv({ hans: '进行损毁性的编辑测试', hant: '進行損毀性的編輯測試' }),
					summary: conv({ hans: '注意：进行编辑测试', hant: '注意：進行編輯測試' })
				},
				level3: {
					label: conv({ hans: '编辑测试', hant: '編輯測試' }),
					summary: conv({ hans: '警告：编辑测试', hant: '警告：編輯測試' })
				},
				level4: {
					label: conv({ hans: '编辑测试', hant: '編輯測試' }),
					summary: conv({ hans: '最后警告：编辑测试', hant: '最後警告：編輯測試' })
				}
			},
			'uw-delete': {
				level1: {
					label: conv({ hans: '不恰当地移除页面内容、模板或资料', hant: '不恰當地移除頁面內容、模板或資料' }),
					summary: conv({ hans: '提醒：不恰当地移除页面内容、模板或资料', hant: '提醒：不恰當地移除頁面內容、模板或資料' })
				},
				level2: {
					label: conv({ hans: '不恰当地移除页面内容、模板或资料', hant: '不恰當地移除頁面內容、模板或資料' }),
					summary: conv({ hans: '注意：不恰当地移除页面内容、模板或资料', hant: '注意：不恰當地移除頁面內容、模板或資料' })
				},
				level3: {
					label: conv({ hans: '不恰当地移除页面内容、模板或资料', hant: '不恰當地移除頁面內容、模板或資料' }),
					summary: conv({ hans: '警告：不恰当地移除页面内容、模板或资料', hant: '警告：不恰當地移除頁面內容、模板或資料' })
				},
				level4: {
					label: conv({ hans: '移除页面、移除内容或模板', hant: '移除頁面、移除內容或模板' }),
					summary: conv({ hans: '最后警告：移除页面、移除内容或模板', hant: '最後警告：移除頁面、移除內容或模板' })
				},
				level4im: {
					label: conv({ hans: '移除页面内容、模板或资料', hant: '移除頁面內容、模板或資料' }),
					summary: conv({ hans: '唯一警告：移除页面内容、模板或资料', hant: '唯一警告：移除頁面內容、模板或資料' })
				}
			},
			'uw-redirect': {
				level1: {
					label: conv({ hans: '创建破坏性的重定向', hant: '建立破壞性的重定向' }),
					summary: conv({ hans: '提醒：创建破坏性的重定向', hant: '提醒：建立破壞性的重定向' })
				},
				level2: {
					label: conv({ hans: '创建恶意重定向', hant: '建立惡意重定向' }),
					summary: conv({ hans: '注意：创建恶意重定向', hant: '注意：建立惡意重定向' })
				},
				level3: {
					label: conv({ hans: '创建恶意重定向', hant: '建立惡意重定向' }),
					summary: conv({ hans: '警告：创建恶意重定向', hant: '警告：建立惡意重定向' })
				},
				level4: {
					label: conv({ hans: '创建恶意重定向', hant: '建立惡意重定向' }),
					summary: conv({ hans: '最后警告：创建恶意重定向', hant: '最後警告：建立惡意重定向' })
				},
				level4im: {
					label: conv({ hans: '创建恶意重定向', hant: '建立惡意重定向' }),
					summary: conv({ hans: '唯一警告：创建恶意重定向', hant: '唯一警告：建立惡意重定向' })
				}
			},
			'uw-tdel': {
				level1: {
					label: conv({ hans: '在问题仍未解决的情况下移除维护性模板', hant: '在問題仍未解決的情況下移除維護性模板' }),
					summary: conv({ hans: '提醒：移除维护性模板', hant: '提醒：移除維護性模板' })
				},
				level2: {
					label: conv({ hans: '在问题仍未解决的情况下移除维护性模板', hant: '在問題仍未解決的情況下移除維護性模板' }),
					summary: conv({ hans: '注意：移除维护性模板', hant: '注意：移除維護性模板' })
				},
				level3: {
					label: conv({ hans: '移除维护性模板', hant: '移除維護性模板' }),
					summary: conv({ hans: '警告：移除维护性模板', hant: '警告：移除維護性模板' })
				},
				level4: {
					label: conv({ hans: '移除维护性模板', hant: '移除維護性模板' }),
					summary: conv({ hans: '最后警告：移除维护性模板', hant: '最後警告：移除維護性模板' })
				}
			},
			'uw-joke': {
				level1: {
					label: conv({ hans: '在百科全书内容中加入玩笑', hant: '在百科全書內容中加入玩笑' }),
					summary: conv({ hans: '提醒：加入不当玩笑', hant: '提醒：加入不當玩笑' })
				},
				level2: {
					label: conv({ hans: '在百科全书内容中加入玩笑', hant: '在百科全書內容中加入玩笑' }),
					summary: conv({ hans: '注意：加入不当玩笑', hant: '注意：加入不當玩笑' })
				},
				level3: {
					label: conv({ hans: '在百科全书内容中加入不当玩笑', hant: '在百科全書內容中加入不當玩笑' }),
					summary: conv({ hans: '警告：在百科全书内容中加入不当玩笑', hant: '警告：在百科全書內容中加入不當玩笑' })
				},
				level4: {
					label: conv({ hans: '在百科全书内容中加入不当玩笑', hant: '在百科全書內容中加入不當玩笑' }),
					summary: conv({ hans: '最后警告：在百科全书内容中加入不当玩笑', hant: '最後警告：在百科全書內容中加入不當玩笑' })
				},
				level4im: {
					label: conv({ hans: '加入不当玩笑', hant: '加入不當玩笑' }),
					summary: conv({ hans: '唯一警告：加入不当玩笑', hant: '唯一警告：加入不當玩笑' })
				}
			},
			'uw-create': {
				level1: {
					label: conv({ hans: '创建不当页面', hant: '建立不當頁面' }),
					summary: conv({ hans: '提醒：创建不当页面', hant: '提醒：建立不當頁面' })
				},
				level2: {
					label: conv({ hans: '创建不当页面', hant: '建立不當頁面' }),
					summary: conv({ hans: '注意：创建不当页面', hant: '注意：建立不當頁面' })
				},
				level3: {
					label: conv({ hans: '创建不当页面', hant: '建立不當頁面' }),
					summary: conv({ hans: '警告：创建不当页面', hant: '警告：建立不當頁面' })
				},
				level4: {
					label: conv({ hans: '创建不当页面', hant: '建立不當頁面' }),
					summary: conv({ hans: '最后警告：创建不当页面', hant: '最後警告：建立不當頁面' })
				},
				level4im: {
					label: conv({ hans: '创建不当页面', hant: '建立不當頁面' }),
					summary: conv({ hans: '唯一警告：创建不当页面', hant: '唯一警告：建立不當頁面' })
				}
			},
			'uw-upload': {
				level1: {
					label: conv({ hans: '上传不当图像', hant: '上傳不當圖像' }),
					summary: conv({ hans: '提醒：上传不当图像', hant: '提醒：上傳不當圖像' })
				},
				level2: {
					label: conv({ hans: '上传不当图像', hant: '上傳不當圖像' }),
					summary: conv({ hans: '注意：上传不当图像', hant: '注意：上傳不當圖像' })
				},
				level3: {
					label: conv({ hans: '上传不当图像', hant: '上傳不當圖像' }),
					summary: conv({ hans: '警告：上传不当图像', hant: '警告：上傳不當圖像' })
				},
				level4: {
					label: conv({ hans: '上传不当图像', hant: '上傳不當圖像' }),
					summary: conv({ hans: '最后警告：上传不当图像', hant: '最後警告：上傳不當圖像' })
				},
				level4im: {
					label: conv({ hans: '上传不当图像', hant: '上傳不當圖像' }),
					summary: conv({ hans: '唯一警告：上传不当图像', hant: '唯一警告：上傳不當圖像' })
				}
			},
			'uw-image': {
				level1: {
					label: conv({ hans: '在页面中加入不当图片', hant: '在頁面中加入不當圖片' }),
					summary: conv({ hans: '提醒：在页面中加入不当图片', hant: '提醒：在頁面中加入不當圖片' })
				},
				level2: {
					label: conv({ hans: '在页面中加入不当图片', hant: '在頁面中加入不當圖片' }),
					summary: conv({ hans: '注意：在页面中加入不当图片', hant: '注意：在頁面中加入不當圖片' })
				},
				level3: {
					label: conv({ hans: '在页面中加入不当图片', hant: '在頁面中加入不當圖片' }),
					summary: conv({ hans: '警告：在页面中加入不当图片', hant: '警告：在頁面中加入不當圖片' })
				},
				level4: {
					label: conv({ hans: '在页面中加入不当图片', hant: '在頁面中加入不當圖片' }),
					summary: conv({ hans: '最后警告：在页面中加入不当图片', hant: '最後警告：在頁面中加入不當圖片' })
				},
				level4im: {
					label: conv({ hans: '加入不恰当的图片', hant: '加入不恰當的圖片' }),
					summary: conv({ hans: '唯一警告：加入不恰当的图片', hant: '唯一警告：加入不恰當的圖片' })
				}
			},
			'uw-nor': {
				level1: {
					label: conv({ hans: '在条目中加入原创研究', hant: '在條目中加入原創研究' }),
					summary: conv({ hans: '提醒：在条目中加入原创研究', hant: '提醒：在條目中加入原創研究' })
				},
				level2: {
					label: conv({ hans: '在条目中加入原创研究', hant: '在條目中加入原創研究' }),
					summary: conv({ hans: '注意：在条目中加入原创研究', hant: '注意：在條目中加入原創研究' })
				},
				level3: {
					label: conv({ hans: '在条目中加入原创研究', hant: '在條目中加入原創研究' }),
					summary: conv({ hans: '警告：在条目中加入原创研究', hant: '警告：在條目中加入原創研究' })
				}
			},
			'uw-politicalbias': {
				level1: {
					label: conv({ hans: '违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '違反兩岸四地用語、朝鮮半島用語等相關規定' }),
					summary: conv({ hans: '提醒：违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '提醒：違反兩岸四地用語、朝鮮半島用語等相關規定' })
				},
				level2: {
					label: conv({ hans: '违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '違反兩岸四地用語、朝鮮半島用語等相關規定' }),
					summary: conv({ hans: '注意：违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '注意：違反兩岸四地用語、朝鮮半島用語等相關規定' })
				},
				level3: {
					label: conv({ hans: '违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '違反兩岸四地用語、朝鮮半島用語等相關規定' }),
					summary: conv({ hans: '警告：违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '警告：違反兩岸四地用語、朝鮮半島用語等相關規定' })
				},
				level4: {
					label: conv({ hans: '违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '違反兩岸四地用語、朝鮮半島用語等相關規定' }),
					summary: conv({ hans: '最后警告：违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '最後警告：違反兩岸四地用語、朝鮮半島用語等相關規定' })
				},
				level4im: {
					label: conv({ hans: '违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '違反兩岸四地用語、朝鮮半島用語等相關規定' }),
					summary: conv({ hans: '唯一警告：违反两岸四地用语、朝鲜半岛用语等相关规定', hant: '唯一警告：違反兩岸四地用語、朝鮮半島用語等相關規定' })
				}
			}
		}
	},
	{
		category: conv({ hans: '增加商品或政治广告', hant: '增加商品或政治廣告' }),
		list: {
			'uw-spam': {
				level1: {
					label: conv({ hans: '增加不合适的外部链接', hant: '增加不合適的外部連結' }),
					summary: conv({ hans: '提醒：增加不合适的外部链接', hant: '提醒：增加不合適的外部連結' })
				},
				level2: {
					label: conv({ hans: '增加垃圾链接', hant: '增加垃圾連結' }),
					summary: conv({ hans: '注意：增加垃圾链接', hant: '注意：增加垃圾連結' })
				},
				level3: {
					label: conv({ hans: '增加垃圾链接', hant: '增加垃圾連結' }),
					summary: conv({ hans: '警告：增加垃圾链接', hant: '警告：增加垃圾連結' })
				},
				level4: {
					label: conv({ hans: '增加垃圾链接', hant: '增加垃圾連結' }),
					summary: conv({ hans: '最后警告：增加垃圾链接', hant: '最後警告：增加垃圾連結' })
				},
				level4im: {
					label: conv({ hans: '增加垃圾链接', hant: '增加垃圾連結' }),
					summary: conv({ hans: '唯一警告：增加垃圾链接', hant: '唯一警告：增加垃圾連結' })
				}
			},
			'uw-advert': {
				level1: {
					label: conv({ hans: '利用维基百科来发布广告或推广', hant: '利用維基百科來發布廣告或推廣' }),
					summary: conv({ hans: '提醒：利用维基百科来发布广告或推广', hant: '提醒：利用維基百科來發布廣告或推廣' })
				},
				level2: {
					label: conv({ hans: '利用维基百科来发布广告或推广', hant: '利用維基百科來發布廣告或推廣' }),
					summary: conv({ hans: '注意：利用维基百科来发布广告或推广', hant: '注意：利用維基百科來發布廣告或推廣' })
				},
				level3: {
					label: conv({ hans: '利用维基百科来发布广告或推广', hant: '利用維基百科來發布廣告或推廣' }),
					summary: conv({ hans: '警告：利用维基百科来发布广告或推广', hant: '警告：利用維基百科來發布廣告或推廣' })
				},
				level4: {
					label: conv({ hans: '利用维基百科来发布广告或推广', hant: '利用維基百科來發布廣告或推廣' }),
					summary: conv({ hans: '最后警告：利用维基百科来发布广告或推广', hant: '最後警告：利用維基百科來發布廣告或推廣' })
				}
			},
			'uw-npov': {
				level1: {
					label: conv({ hans: '不遵守中立的观点方针', hant: '不遵守中立的觀點方針' }),
					summary: conv({ hans: '提醒：不遵守中立的观点方针', hant: '提醒：不遵守中立的觀點方針' })
				},
				level2: {
					label: conv({ hans: '不遵守中立的观点方针', hant: '不遵守中立的觀點方針' }),
					summary: conv({ hans: '注意：不遵守中立的观点方针', hant: '注意：不遵守中立的觀點方針' })
				},
				level3: {
					label: conv({ hans: '违反中立的观点方针', hant: '違反中立的觀點方針' }),
					summary: conv({ hans: '警告：违反中立的观点方针', hant: '警告：違反中立的觀點方針' })
				},
				level4: {
					label: conv({ hans: '违反中立的观点方针', hant: '違反中立的觀點方針' }),
					summary: conv({ hans: '最后警告：违反中立的观点方针', hant: '最後警告：違反中立的觀點方針' })
				}
			},
			'uw-paid': {
				level1: {
					label: conv({ hans: '未申报的有偿编辑', hant: '未申報的有償編輯' }),
					summary: conv({ hans: '提醒：未申报的有偿编辑', hant: '提醒：未申報的有償編輯' })
				},
				level2: {
					label: conv({ hans: '未申报的有偿编辑', hant: '未申報的有償編輯' }),
					summary: conv({ hans: '注意：未申报的有偿编辑', hant: '注意：未申報的有償編輯' })
				},
				level3: {
					label: conv({ hans: '未申报的有偿编辑', hant: '未申報的有償編輯' }),
					summary: conv({ hans: '警告：未申报的有偿编辑', hant: '警告：未申報的有償編輯' })
				},
				level4: {
					label: conv({ hans: '未申报的有偿编辑', hant: '未申報的有償編輯' }),
					summary: conv({ hans: '最后警告：未申报的有偿编辑', hant: '最後警告：未申報的有償編輯' })
				}
			}
		}
	},
	{
		category: conv({ hans: '加插不实及/或诽谤文字', hant: '加插不實及/或誹謗文字' }),
		list: {
			'uw-unsourced': {
				level1: {
					label: conv({ hans: '加入没有可靠来源佐证的内容', hant: '加入沒有可靠來源佐證的內容' }),
					summary: conv({ hans: '提醒：加入没有可靠来源佐证的内容', hant: '提醒：加入沒有可靠來源佐證的內容' })
				},
				level2: {
					label: conv({ hans: '加入没有可靠来源佐证的内容', hant: '加入沒有可靠來源佐證的內容' }),
					summary: conv({ hans: '注意：加入没有可靠来源佐证的内容', hant: '注意：加入沒有可靠來源佐證的內容' })
				},
				level3: {
					label: conv({ hans: '加入没有可靠来源佐证的内容', hant: '加入沒有可靠來源佐證的內容' }),
					summary: conv({ hans: '警告：加入没有可靠来源佐证的内容', hant: '警告：加入沒有可靠來源佐證的內容' })
				}
			},
			'uw-error': {
				level1: {
					label: conv({ hans: '故意加入不实内容', hant: '故意加入不實內容' }),
					summary: conv({ hans: '提醒：故意加入不实内容', hant: '提醒：故意加入不實內容' })
				},
				level2: {
					label: conv({ hans: '故意加入不实内容', hant: '故意加入不實內容' }),
					summary: conv({ hans: '注意：故意加入不实内容', hant: '注意：故意加入不實內容' })
				},
				level3: {
					label: conv({ hans: '故意加入不实内容', hant: '故意加入不實內容' }),
					summary: conv({ hans: '警告：故意加入不实内容', hant: '警告：故意加入不實內容' })
				}
			},
			'uw-biog': {
				level1: {
					label: conv({ hans: '在生者传记中加入没有可靠来源佐证而且可能引发争议的内容', hant: '在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容' }),
					summary: conv({ hans: '提醒：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容', hant: '提醒：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容' })
				},
				level2: {
					label: conv({ hans: '在生者传记中加入没有可靠来源佐证而且可能引发争议的内容', hant: '在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容' }),
					summary: conv({ hans: '注意：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容', hant: '注意：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容' })
				},
				level3: {
					label: conv({ hans: '在生者传记中加入没有可靠来源佐证而且带有争议的内容', hant: '在生者傳記中加入沒有可靠來源佐證而且帶有爭議的內容' }),
					summary: conv({ hans: '警告：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容', hant: '警告：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容' })
				},
				level4: {
					label: conv({ hans: '加入有关在生人物而又缺乏来源的资料', hant: '加入有關在生人物而又缺乏來源的資料' }),
					summary: conv({ hans: '最后警告：加入有关在生人物而又缺乏来源的资料', hant: '最後警告：加入有關在生人物而又缺乏來源的資料' })
				},
				level4im: {
					label: conv({ hans: '加入有关在生人物而又缺乏来源的资料', hant: '加入有關在生人物而又缺乏來源的資料' }),
					summary: conv({ hans: '唯一警告：加入有关在生人物而又缺乏来源的资料', hant: '唯一警告：加入有關在生人物而又缺乏來源的資料' })
				}
			},
			'uw-defamatory': {
				level1: {
					label: conv({ hans: '加入诽谤内容', hant: '加入誹謗內容' }),
					summary: conv({ hans: '提醒：加入诽谤内容', hant: '提醒：加入誹謗內容' })
				},
				level2: {
					label: conv({ hans: '加入诽谤内容', hant: '加入誹謗內容' }),
					summary: conv({ hans: '注意：加入诽谤内容', hant: '注意：加入誹謗內容' })
				},
				level3: {
					label: conv({ hans: '加入诽谤内容', hant: '加入誹謗內容' }),
					summary: conv({ hans: '警告：加入诽谤内容', hant: '警告：加入誹謗內容' })
				},
				level4: {
					label: conv({ hans: '加入诽谤内容', hant: '加入誹謗內容' }),
					summary: conv({ hans: '最后警告：加入诽谤内容', hant: '最後警告：加入誹謗內容' })
				},
				level4im: {
					label: conv({ hans: '加入诽谤内容', hant: '加入誹謗內容' }),
					summary: conv({ hans: '唯一警告：加入诽谤内容', hant: '唯一警告：加入誹謗內容' })
				}
			}
		}
	},
	{
		category: conv({ hans: '翻译品质', hant: '翻譯品質' }),
		list: {
			'uw-roughtranslation': {
				level1: {
					label: conv({ hans: '您翻译的质量有待改善', hant: '您翻譯的質量有待改善' }),
					summary: conv({ hans: '提醒：您翻译的质量有待改善', hant: '提醒：您翻譯的質量有待改善' })
				},
				level2: {
					label: conv({ hans: '粗劣翻译', hant: '粗劣翻譯' }),
					summary: conv({ hans: '注意：粗劣翻译', hant: '注意：粗劣翻譯' })
				},
				level3: {
					label: conv({ hans: '粗劣翻译', hant: '粗劣翻譯' }),
					summary: conv({ hans: '警告：粗劣翻译', hant: '警告：粗劣翻譯' })
				}
			}
		}
	},
	{
		category: conv({ hans: '非能接受且违反方针或指引的单方面行为或操作', hant: '非能接受且違反方針或指引的單方面行為或操作' }),
		list: {
			'uw-notcensored': {
				level1: {
					label: conv({ hans: '因为“内容使人反感”而删除条目内容', hant: '因為「內容使人反感」而刪除條目內容' }),
					summary: conv({ hans: '提醒：审查条目内容', hant: '提醒：審查條目內容' })
				},
				level2: {
					label: conv({ hans: '内容审查', hant: '內容審查' }),
					summary: conv({ hans: '注意：内容审查', hant: '注意：內容審查' })
				},
				level3: {
					label: conv({ hans: '审查内容', hant: '審查內容' }),
					summary: conv({ hans: '警告：审查内容', hant: '警告：審查內容' })
				}
			},
			'uw-mos': {
				level1: {
					label: conv({ hans: '不恰当的条目格式、日期、语言等', hant: '不恰當的條目格式、日期、語言等' }),
					summary: conv({ hans: '提醒：不恰当的条目格式、日期、语言等', hant: '提醒：不恰當的條目格式、日期、語言等' })
				},
				level2: {
					label: conv({ hans: '不恰当的条目格式、日期、语言等', hant: '不恰當的條目格式、日期、語言等' }),
					summary: conv({ hans: '注意：不恰当的条目格式、日期、语言等', hant: '注意：不恰當的條目格式、日期、語言等' })
				},
				level3: {
					label: conv({ hans: '违反格式、日期、语言等规定', hant: '違反格式、日期、語言等規定' }),
					summary: conv({ hans: '警告：违反格式、日期、语言等规定', hant: '警告：違反格式、日期、語言等規定' })
				},
				level4: {
					label: conv({ hans: '违反格式、日期、语言等相关规定', hant: '違反格式、日期、語言等相關規定' }),
					summary: conv({ hans: '最后警告：违反格式、日期、语言等相关规定', hant: '最後警告：違反格式、日期、語言等相關規定' })
				}
			},
			'uw-move': {
				level1: {
					label: conv({ hans: '无故移动条目/新名称不符合命名规范', hant: '無故移動條目/新名稱不符合命名規範' }),
					summary: conv({ hans: '提醒：不恰当地移动页面', hant: '提醒：不恰當地移動頁面' })
				},
				level2: {
					label: conv({ hans: '把页面移动到不恰当、违反命名常规或违反共识的标题', hant: '把頁面移動到不恰當、違反命名常規或違反共識的標題' }),
					summary: conv({ hans: '注意：不恰当地移动页面', hant: '注意：不恰當地移動頁面' })
				},
				level3: {
					label: conv({ hans: '不恰当地移动页面', hant: '不恰當地移動頁面' }),
					summary: conv({ hans: '警告：不恰当地移动页面', hant: '警告：不恰當地移動頁面' })
				},
				level4: {
					label: conv({ hans: '不恰当地移动页面', hant: '不恰當地移動頁面' }),
					summary: conv({ hans: '最后警告：不恰当地移动页面', hant: '最後警告：不恰當地移動頁面' })
				},
				level4im: {
					label: conv({ hans: '不恰当地移动页面', hant: '不恰當地移動頁面' }),
					summary: conv({ hans: '唯一警告：不恰当地移动页面', hant: '唯一警告：不恰當地移動頁面' })
				}
			},
			'uw-cd': {
				level1: {
					label: conv({ hans: '清空讨论页', hant: '清空討論頁' }),
					summary: conv({ hans: '提醒：清空讨论页', hant: '提醒：清空討論頁' })
				},
				level2: {
					label: conv({ hans: '清空讨论页', hant: '清空討論頁' }),
					summary: conv({ hans: '注意：清空讨论页', hant: '注意：清空討論頁' })
				},
				level3: {
					label: conv({ hans: '清空讨论页', hant: '清空討論頁' }),
					summary: conv({ hans: '警告：清空讨论页', hant: '警告：清空討論頁' })
				}
			},
			'uw-chat': {
				level1: {
					label: conv({ hans: '在讨论页发表与改善条目无关的内容', hant: '在討論頁發表與改善條目無關的內容' }),
					summary: conv({ hans: '提醒：在讨论页发表与改善条目无关的内容', hant: '提醒：在討論頁發表與改善條目無關的內容' })
				},
				level2: {
					label: conv({ hans: '在讨论页发表与改善条目无关的内容', hant: '在討論頁發表與改善條目無關的內容' }),
					summary: conv({ hans: '注意：在讨论页发表与改善条目无关的内容', hant: '注意：在討論頁發表與改善條目無關的內容' })
				},
				level3: {
					label: conv({ hans: '在讨论页发表无关内容', hant: '在討論頁發表無關內容' }),
					summary: conv({ hans: '警告：在讨论页发表无关内容', hant: '警告：在討論頁發表無關內容' })
				},
				level4: {
					label: conv({ hans: '在讨论页进行不当讨论', hant: '在討論頁進行不當討論' }),
					summary: conv({ hans: '最后警告：在讨论页进行不当讨论', hant: '最後警告：在討論頁進行不當討論' })
				}
			},
			'uw-tpv': {
				level1: {
					label: '修改他人留言',
					summary: '提醒：修改他人留言'
				},
				level2: {
					label: '修改他人留言',
					summary: '注意：修改他人留言'
				},
				level3: {
					label: '修改他人留言',
					summary: '警告：修改他人留言'
				}
			},
			'uw-afd': {
				level1: {
					label: conv({ hans: '移除{{afd}}（页面存废讨论）模板', hant: '移除{{afd}}（頁面存廢討論）模板' }),
					summary: conv({ hans: '提醒：移除{{afd}}（页面存废讨论）模板', hant: '提醒：移除{{afd}}（頁面存廢討論）模板' })
				},
				level2: {
					label: conv({ hans: '移除{{afd}}（页面存废讨论）模板', hant: '移除{{afd}}（頁面存廢討論）模板' }),
					summary: conv({ hans: '注意：移除{{afd}}（页面存废讨论）模板', hant: '注意：移除{{afd}}（頁面存廢討論）模板' })
				},
				level3: {
					label: conv({ hans: '移除{{afd}}（页面存废讨论）模板', hant: '移除{{afd}}（頁面存廢討論）模板' }),
					summary: conv({ hans: '警告：移除{{afd}}（页面存废讨论）模板', hant: '警告：移除{{afd}}（頁面存廢討論）模板' })
				},
				level4: {
					label: '移除{{afd}}模板',
					summary: conv({ hans: '最后警告：移除{{afd}}模板', hant: '最後警告：移除{{afd}}模板' })
				}
			},
			'uw-speedy': {
				level1: {
					label: conv({ hans: '移除{{delete}}（快速删除）模板', hant: '移除{{delete}}（快速刪除）模板' }),
					summary: conv({ hans: '提醒：移除{{delete}}（快速删除）模板', hant: '提醒：移除{{delete}}（快速刪除）模板' })
				},
				level2: {
					label: conv({ hans: '移除{{delete}}（快速删除）模板', hant: '移除{{delete}}（快速刪除）模板' }),
					summary: conv({ hans: '注意：移除{{delete}}（快速删除）模板', hant: '注意：移除{{delete}}（快速刪除）模板' })
				},
				level3: {
					label: conv({ hans: '移除{{delete}}（快速删除）模板', hant: '移除{{delete}}（快速刪除）模板' }),
					summary: conv({ hans: '警告：移除{{delete}}（快速删除）模板', hant: '警告：移除{{delete}}（快速刪除）模板' })
				},
				level4: {
					label: '移除{{delete}}模板',
					summary: conv({ hans: '最后警告：移除{{delete}}模板', hant: '最後警告：移除{{delete}}模板' })
				}
			},
			'uw-disruptive': {
				level1: {
					label: conv({ hans: '扰乱', hant: '擾亂' }),
					summary: conv({ hans: '提醒：扰乱', hant: '提醒：擾亂' })
				},
				level2: {
					label: conv({ hans: '扰乱', hant: '擾亂' }),
					summary: conv({ hans: '注意：扰乱', hant: '注意：擾亂' })
				},
				level3: {
					label: conv({ hans: '扰乱', hant: '擾亂' }),
					summary: conv({ hans: '警告：扰乱', hant: '警告：擾亂' })
				},
				level4: {
					label: conv({ hans: '扰乱', hant: '擾亂' }),
					summary: conv({ hans: '最后警告：扰乱', hant: '最後警告：擾亂' })
				}
			}
		}
	},
	{
		category: conv({ hans: '对其他用户和条目的态度', hant: '對其他用戶和條目的態度' }),
		list: {
			'uw-npa': {
				level1: {
					label: conv({ hans: '针对用户的人身攻击', hant: '針對用戶的人身攻擊' }),
					summary: conv({ hans: '提醒：针对用户的人身攻击', hant: '提醒：針對用戶的人身攻擊' })
				},
				level2: {
					label: conv({ hans: '针对用户的人身攻击', hant: '針對用戶的人身攻擊' }),
					summary: conv({ hans: '注意：针对用户的人身攻击', hant: '注意：針對用戶的人身攻擊' })
				},
				level3: {
					label: conv({ hans: '针对用户的人身攻击', hant: '針對用戶的人身攻擊' }),
					summary: conv({ hans: '警告：针对用户的人身攻击', hant: '警告：針對用戶的人身攻擊' })
				},
				level4: {
					label: conv({ hans: '针对用户的人身攻击', hant: '針對用戶的人身攻擊' }),
					summary: conv({ hans: '最后警告：针对用户的人身攻击', hant: '最後警告：針對用戶的人身攻擊' })
				},
				level4im: {
					label: conv({ hans: '针对用户的人身攻击', hant: '針對用戶的人身攻擊' }),
					summary: conv({ hans: '唯一警告：针对用户的人身攻击', hant: '唯一警告：針對用戶的人身攻擊' })
				}
			},
			'uw-agf': {
				level1: {
					label: conv({ hans: '没有假定善意', hant: '沒有假定善意' }),
					summary: conv({ hans: '提醒：没有假定善意', hant: '提醒：沒有假定善意' })
				},
				level2: {
					label: conv({ hans: '没有假定善意', hant: '沒有假定善意' }),
					summary: conv({ hans: '注意：没有假定善意', hant: '注意：沒有假定善意' })
				},
				level3: {
					label: conv({ hans: '没有假定善意', hant: '沒有假定善意' }),
					summary: conv({ hans: '警告：没有假定善意', hant: '警告：沒有假定善意' })
				}
			},
			'uw-own': {
				level1: {
					label: conv({ hans: '主张条目所有权', hant: '主張條目所有權' }),
					summary: conv({ hans: '提醒：主张条目所有权', hant: '提醒：主張條目所有權' })
				},
				level2: {
					label: conv({ hans: '主张条目的所有权', hant: '主張條目的所有權' }),
					summary: conv({ hans: '注意：主张条目的所有权', hant: '注意：主張條目的所有權' })
				},
				level3: {
					label: conv({ hans: '主张条目的所有权', hant: '主張條目的所有權' }),
					summary: conv({ hans: '警告：主张条目的所有权', hant: '警告：主張條目的所有權' })
				}
			},
			'uw-tempabuse': {
				level1: {
					label: conv({ hans: '不当使用警告或封禁模板', hant: '不當使用警告或封禁模板' }),
					summary: conv({ hans: '提醒：不当使用警告或封禁模板', hant: '提醒：不當使用警告或封禁模板' })
				},
				level2: {
					label: conv({ hans: '不当使用警告或封禁模板', hant: '不當使用警告或封禁模板' }),
					summary: conv({ hans: '注意：不当使用警告或封禁模板', hant: '注意：不當使用警告或封禁模板' })
				},
				level3: {
					label: conv({ hans: '不当使用警告或封禁模板', hant: '不當使用警告或封禁模板' }),
					summary: conv({ hans: '警告：不当使用警告或封禁模板', hant: '警告：不當使用警告或封禁模板' })
				},
				level4: {
					label: conv({ hans: '不当使用警告或封禁模板', hant: '不當使用警告或封禁模板' }),
					summary: conv({ hans: '最后警告：不当使用警告或封禁模板', hant: '最後警告：不當使用警告或封禁模板' })
				},
				level4im: {
					label: conv({ hans: '不当使用警告或封禁模板', hant: '不當使用警告或封禁模板' }),
					summary: conv({ hans: '唯一警告：不当使用警告或封禁模板', hant: '唯一警告：不當使用警告或封禁模板' })
				}
			}
		}
	}],

	singlenotice: {
		'uw-2redirect': {
			label: conv({ hans: '在移动页面后应该修复双重重定向', hant: '在移動頁面後應該修復雙重重定向' }),
			summary: conv({ hans: '提醒：在移动页面后应该修复双重重定向', hant: '提醒：在移動頁面後應該修復雙重重定向' })
		},
		'uw-aiv': {
			label: conv({ hans: '举报的并不是破坏者，或者举报破坏前未进行警告', hant: '舉報的並不是破壞者，或者舉報破壞前未進行警告' }),
			summary: conv({ hans: '提醒：不恰当地举报破坏', hant: '提醒：不恰當地舉報破壞' })
		},
		'uw-articlesig': {
			label: conv({ hans: '在条目中签名', hant: '在條目中簽名' }),
			summary: conv({ hans: '提醒：在条目中签名', hant: '提醒：在條目中簽名' })
		},
		'uw-autobiography': {
			label: conv({ hans: '创建自传', hant: '建立自傳' }),
			summary: conv({ hans: '提醒：创建自传', hant: '提醒：建立自傳' })
		},
		'uw-badcat': {
			label: conv({ hans: '加入错误的页面分类', hant: '加入錯誤的頁面分類' }),
			summary: conv({ hans: '提醒：加入错误的页面分类', hant: '提醒：加入錯誤的頁面分類' })
		},
		'uw-bite': {
			label: conv({ hans: '伤害新手', hant: '傷害新手' }),
			summary: conv({ hans: '提醒：伤害新手', hant: '提醒：傷害新手' })
		},
		'uw-booktitle': {
			label: conv({ hans: '没有使用书名号来标示书籍、电影、音乐专辑等', hant: '沒有使用書名號來標示書籍、電影、音樂專輯等' }),
			summary: conv({ hans: '提醒：没有使用书名号来标示书籍、电影、音乐专辑等', hant: '提醒：沒有使用書名號來標示書籍、電影、音樂專輯等' })
		},
		'uw-c&pmove': {
			label: conv({ hans: '剪贴移动', hant: '剪貼移動' }),
			summary: conv({ hans: '提醒：剪贴移动', hant: '提醒：剪貼移動' })
		},
		'uw-chinese': {
			label: conv({ hans: '请使用标准汉语沟通', hant: '請使用標準漢語溝通' }),
			summary: conv({ hans: '提醒：请使用标准汉语沟通', hant: '提醒：請使用標準漢語溝通' })
		},
		'uw-coi': {
			label: conv({ hans: '利益冲突', hant: '利益衝突' }),
			summary: conv({ hans: '提醒：利益冲突', hant: '提醒：利益衝突' })
		},
		'uw-concovid19': {
			label: conv({ hans: '违反COVID-19条目共识', hant: '違反COVID-19條目共識' }),
			summary: conv({ hans: '提醒：违反COVID-19条目共识', hant: '提醒：違反COVID-19條目共識' })
		},
		'uw-copyright-friendly': {
			label: conv({ hans: '初次加入侵犯著作权的内容', hant: '初次加入侵犯版權的內容' }),
			summary: conv({ hans: '提醒：初次加入侵犯著作权的内容', hant: '提醒：初次加入侵犯版權的內容' })
		},
		'uw-copyviorewrite': {
			label: conv({ hans: '在侵权页面直接重写条目', hant: '在侵權頁面直接重寫條目' }),
			summary: conv({ hans: '提醒：在侵权页面直接重写条目', hant: '提醒：在侵權頁面直接重寫條目' })
		},
		'uw-crystal': {
			label: conv({ hans: '加入臆测或未确认的消息', hant: '加入臆測或未確認的訊息' }),
			summary: conv({ hans: '提醒：加入臆测或未确认的消息', hant: '提醒：加入臆測或未確認的訊息' })
		},
		'uw-csd': {
			label: conv({ hans: '快速删除理由不当', hant: '快速刪除理由不當' }),
			summary: conv({ hans: '提醒：快速删除理由不当', hant: '提醒：快速刪除理由不當' })
		},
		'uw-dab': {
			label: conv({ hans: '消歧义页格式错误', hant: '消歧義頁格式錯誤' }),
			summary: conv({ hans: '提醒：消歧义页格式错误', hant: '提醒：消歧義頁格式錯誤' })
		},
		'uw-draft': {
			label: conv({ hans: '最近创建的页面被移动到草稿', hant: '最近建立的頁面被移動到草稿' }),
			summary: conv({ hans: '提醒：最近创建的页面被移动到草稿', hant: '提醒：最近建立的頁面被移動到草稿' })
		},
		'uw-editsummary': {
			label: conv({ hans: '没有使用编辑摘要', hant: '沒有使用編輯摘要' }),
			summary: conv({ hans: '提醒：没有使用编辑摘要', hant: '提醒：沒有使用編輯摘要' })
		},
		'uw-hangon': {
			label: conv({ hans: '没有在讨论页说明暂缓快速删除理由', hant: '沒有在討論頁說明暫緩快速刪除理由' }),
			summary: conv({ hans: '提醒：没有在讨论页说明暂缓快速删除理由', hant: '提醒：沒有在討論頁說明暫緩快速刪除理由' })
		},
		'uw-lang': {
			label: conv({ hans: '不必要地将文字换成简体或繁体中文', hant: '不必要地將文字換成簡體或繁體中文' }),
			summary: conv({ hans: '提醒：不必要地将文字换成简体或繁体中文', hant: '提醒：不必要地將文字換成簡體或繁體中文' })
		},
		'uw-langmove': {
			label: conv({ hans: '不必要地将标题换成简体或繁体中文', hant: '不必要地將標題換成簡體或繁體中文' }),
			summary: conv({ hans: '提醒：不必要地将标题换成简体或繁体中文', hant: '提醒：不必要地將標題換成簡體或繁體中文' })
		},
		'uw-linking': {
			label: conv({ hans: '过度加入红字链接或重复蓝字链接', hant: '過度加入紅字連結或重複藍字連結' }),
			summary: conv({ hans: '提醒：过度加入红字链接或重复蓝字链接', hant: '提醒：過度加入紅字連結或重複藍字連結' })
		},
		'uw-minor': {
			label: conv({ hans: '不适当地使用小修改选项', hant: '不適當地使用小修改選項' }),
			summary: conv({ hans: '提醒：不适当地使用小修改选项', hant: '提醒：不適當地使用小修改選項' })
		},
		'uw-notaiv': {
			label: conv({ hans: '向“当前的破坏”中报告的是用户纷争而不是破坏', hant: '向「當前的破壞」中報告的是用戶紛爭而不是破壞' }),
			summary: conv({ hans: '提醒：向“当前的破坏”中报告的是用户纷争而不是破坏', hant: '提醒：向「當前的破壞」中報告的是用戶紛爭而不是破壞' })
		},
		'uw-notvote': {
			label: conv({ hans: '我们以共识处事，而不仅仅是投票', hant: '我們以共識處事，而不僅僅是投票' }),
			summary: conv({ hans: '提醒：我们以共识处事，而不仅仅是投票', hant: '提醒：我們以共識處事，而不僅僅是投票' })
		},
		'uw-preview': {
			label: conv({ hans: '请使用预览按钮来避免不必要的错误', hant: '請使用預覽按鈕來避免不必要的錯誤' }),
			summary: conv({ hans: '提醒：请使用预览按钮来避免不必要的错误', hant: '提醒：請使用預覽按鈕來避免不必要的錯誤' })
		},
		'uw-sandbox': {
			label: conv({ hans: '移除沙盒的置顶模板{{sandbox}}', hant: '移除沙盒的置頂模板{{sandbox}}' }),
			summary: conv({ hans: '提醒：移除沙盒的置顶模板{{sandbox}}', hant: '提醒：移除沙盒的置頂模板{{sandbox}}' })
		},
		'uw-selfrevert': {
			label: conv({ hans: '感谢您自行回退自己的测试，以后不要再这样做了', hant: '感謝您自行回退自己的測試，以後不要再這樣做了' }),
			summary: conv({ hans: '提醒：回退个人的测试', hant: '提醒：回退個人的測試' })
		},
		'uw-subst': {
			label: conv({ hans: '谨记要替代模板（subst）', hant: '謹記要替代模板（subst）' }),
			summary: conv({ hans: '提醒：谨记要替代模板', hant: '提醒：謹記要替代模板' })
		},
		'uw-talkinarticle': {
			label: conv({ hans: '在条目页中留下意见', hant: '在條目頁中留下意見' }),
			summary: conv({ hans: '提醒：在条目页中留下意见', hant: '提醒：在條目頁中留下意見' })
		},
		'uw-tilde': {
			label: conv({ hans: '没有在讨论页上签名', hant: '沒有在討論頁上簽名' }),
			summary: conv({ hans: '提醒：没有在讨论页上签名', hant: '提醒：沒有在討論頁上簽名' })
		},
		'uw-translated': {
			label: conv({ hans: '翻译条目未标注原作者', hant: '翻譯條目未標註原作者' }),
			summary: conv({ hans: '提醒：翻译条目未标注原作者', hant: '提醒：翻譯條目未標註原作者' })
		},
		'uw-uaa': {
			label: conv({ hans: '向不当用户名布告板报告的用户名并不违反方针', hant: '向不當使用者名稱布告板報告的使用者名稱並不違反方針' }),
			summary: conv({ hans: '提醒：向不当用户名布告板报告的用户名并不违反方针', hant: '提醒：向不當使用者名稱布告板報告的使用者名稱並不違反方針' })
		},
		'uw-warn': {
			label: conv({ hans: '警告破坏用户', hant: '警告破壞用戶' }),
			summary: conv({ hans: '提醒：警告破坏用户', hant: '提醒：警告破壞用戶' })
		},
		'uw-mosiw': {
			label: conv({ hans: '不要使用跨语言链接', hant: '不要使用跨語言連結' }),
			summary: conv({ hans: '提醒：不要使用跨语言链接', hant: '提醒：不要使用跨語言連結' })
		},
		'uw-badtwinkle': {
			label: conv({ hans: '不恰当地使用Twinkle警告别人', hant: '不恰當地使用Twinkle警告別人' }),
			summary: conv({ hans: '提醒：不恰当地使用Twinkle警告别人', hant: '提醒：不恰當地使用Twinkle警告別人' })
		}
	},

	singlewarn: {
		'uw-3rr': {
			label: conv({ hans: '用户潜在违反回退不过三原则的可能性', hant: '用戶潛在違反回退不過三原則的可能性' }),
			summary: conv({ hans: '警告：用户潜在违反回退不过三原则的可能性', hant: '警告：用戶潛在違反回退不過三原則的可能性' })
		},
		'uw-attack': {
			label: conv({ hans: '创建人身攻击页面', hant: '建立人身攻擊頁面' }),
			summary: conv({ hans: '警告：创建人身攻击页面', hant: '警告：建立人身攻擊頁面' }),
			suppressArticleInSummary: true
		},
		'uw-bv': {
			label: conv({ hans: '公然地破坏', hant: '公然地破壞' }),
			summary: conv({ hans: '警告：公然地破坏', hant: '警告：公然地破壞' })
		},
		'uw-canvass': {
			label: conv({ hans: '不恰当地拉票', hant: '不恰當地拉票' }),
			summary: conv({ hans: '警告：不恰当地拉票', hant: '警告：不恰當地拉票' })
		},
		'uw-copyright': {
			label: conv({ hans: '侵犯著作权', hant: '侵犯版權' }),
			summary: conv({ hans: '警告：侵犯著作权', hant: '警告：侵犯版權' })
		},
		'uw-copyright-link': {
			label: conv({ hans: '链接到有著作权的材料', hant: '連結到有版權的材料' }),
			summary: conv({ hans: '警告：链接到有著作权的材料', hant: '警告：連結到有版權的材料' })
		},
		'uw-fakesource': {
			label: conv({ hans: '虚构数据源或引文', hant: '虛構資料來源或引文' }),
			summary: conv({ hans: '警告：虚构数据源或引文', hant: '警告：虛構資料來源或引文' })
		},
		'uw-hoax': {
			label: conv({ hans: '创建恶作剧', hant: '建立惡作劇' }),
			summary: conv({ hans: '警告：创建恶作剧', hant: '警告：建立惡作劇' })
		},
		'uw-incompletecite': {
			label: conv({ hans: '列出的数据源欠缺若干详情而不易查找', hant: '列出的資料來源欠缺若干詳情而不易查找' }),
			summary: conv({ hans: '警告：列出的数据源欠缺若干详情而不易查找', hant: '警告：列出的資料來源欠缺若干詳情而不易查找' })
		},
		'uw-legal': {
			label: conv({ hans: '诉诸法律威胁', hant: '訴諸法律威脅' }),
			summary: conv({ hans: '警告：诉诸法律威胁', hant: '警告：訴諸法律威脅' })
		},
		'uw-longterm': {
			label: conv({ hans: '长期的破坏', hant: '長期的破壞' }),
			summary: conv({ hans: '警告：长期的破坏', hant: '警告：長期的破壞' })
		},
		'uw-multipleIPs': {
			label: conv({ hans: '使用多个IP地址进行破坏', hant: '使用多個IP地址進行破壞' }),
			summary: conv({ hans: '警告：使用多个IP地址进行破坏', hant: '警告：使用多個IP地址進行破壞' })
		},
		'uw-npov-tvd': {
			label: conv({ hans: '在剧集条目中加入奸角等非中立描述', hant: '在劇集條目中加入奸角等非中立描述' }),
			summary: conv({ hans: '警告：在剧集条目中加入奸角等非中立描述', hant: '警告：在劇集條目中加入奸角等非中立描述' })
		},
		'uw-owntalk': {
			label: conv({ hans: '匿名用户移除自己讨论页上7日内的讨论', hant: '匿名使用者移除自己討論頁上7日內的討論' }),
			summary: conv({ hans: '警告：匿名用户移除自己讨论页上7日内的讨论', hant: '警告：匿名使用者移除自己討論頁上7日內的討論' })
		},
		'uw-pinfo': {
			label: conv({ hans: '张贴他人隐私', hant: '張貼他人隱私' }),
			summary: conv({ hans: '警告：张贴他人隐私', hant: '警告：張貼他人隱私' })
		},
		'uw-upv': {
			label: conv({ hans: '破坏他人用户页', hant: '破壞他人用戶頁' }),
			summary: conv({ hans: '警告：破坏他人用户页', hant: '警告：破壞他人用戶頁' })
		},
		'uw-selfinventedname': {
			label: conv({ hans: '不适当地自创新名词、新译名', hant: '不適當地自創新名詞、新譯名' }),
			summary: conv({ hans: '警告：不适当地自创新名词、新译名', hant: '警告：不適當地自創新名詞、新譯名' })
		},
		'uw-substub': {
			label: conv({ hans: '创建小小作品', hant: '建立小小作品' }),
			summary: conv({ hans: '警告：创建小小作品', hant: '警告：建立小小作品' })
		},
		'uw-username': {
			label: conv({ hans: '使用不恰当的用户名', hant: '使用不恰當的用戶名' }),
			summary: conv({ hans: '警告：使用不恰当的用户名', hant: '警告：使用不恰當的用戶名' }),
			suppressArticleInSummary: true
		},
		'uw-wrongsummary': {
			label: conv({ hans: '在编辑摘要制造不适当的内容', hant: '在編輯摘要製造不適當的內容' }),
			summary: conv({ hans: '警告：在编辑摘要制造不适当的内容', hant: '警告：在編輯摘要製造不適當的內容' })
		}
	}
};

// Used repeatedly below across menu rebuilds
Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;
Twinkle.warn.talkpageObj = null;

Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
	var value = e.target.value;
	var sub_group = e.target.root.sub_group;
	sub_group.main_group = value;
	var old_subvalue = sub_group.value;
	var old_subvalue_re;
	if (old_subvalue) {
		if (value === 'kitchensink') { // Exact match possible in kitchensink menu
			old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue));
		} else {
			old_subvalue = old_subvalue.replace(/\d*(im)?$/, '');
			old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue) + '(\\d*(?:im)?)$');
		}
	}

	while (sub_group.hasChildNodes()) {
		sub_group.removeChild(sub_group.firstChild);
	}

	var selected = false;
	// worker function to create the combo box entries
	var createEntries = function(contents, container, wrapInOptgroup, val) {
		val = typeof val !== 'undefined' ? val : value; // IE doesn't support default parameters
		// level2->2, singlewarn->''; also used to distinguish the
		// scaled levels from singlenotice, singlewarn, and custom
		var level = val.replace(/^\D+/g, '');
		// due to an apparent iOS bug, we have to add an option-group to prevent truncation of text
		// (search WT:TW archives for "Problem selecting warnings on an iPhone")
		if (wrapInOptgroup && $.client.profile().platform === 'iphone') {
			var wrapperOptgroup = new Morebits.QuickForm.Element({
				type: 'optgroup',
				label: '可用模板'
			});
			wrapperOptgroup = wrapperOptgroup.render();
			container.appendChild(wrapperOptgroup);
			container = wrapperOptgroup;
		}

		$.each(contents, function(itemKey, itemProperties) {
			// Skip if the current template doesn't have a version for the current level
			if (!!level && !itemProperties[val]) {
				return;
			}
			var key = typeof itemKey === 'string' ? itemKey : itemProperties.value;
			var template = key + level;

			var elem = new Morebits.QuickForm.Element({
				type: 'option',
				label: '{{' + template + '}}: ' + (level ? itemProperties[val].label : itemProperties.label),
				value: template
			});

			// Select item best corresponding to previous selection
			if (!selected && old_subvalue && old_subvalue_re.test(template)) {
				elem.data.selected = selected = true;
			}
			var elemRendered = container.appendChild(elem.render());
			$(elemRendered).data('messageData', itemProperties);
		});
	};

	switch (value) {
		case 'singlenotice':
		case 'singlewarn':
			createEntries(Twinkle.warn.messages[value], sub_group, true);
			break;
		case 'singlecombined':
			var unSortedSinglets = $.extend({}, Twinkle.warn.messages.singlenotice, Twinkle.warn.messages.singlewarn);
			var sortedSingletMessages = {};
			Object.keys(unSortedSinglets).sort().forEach(function(key) {
				sortedSingletMessages[key] = unSortedSinglets[key];
			});
			createEntries(sortedSingletMessages, sub_group, true);
			break;
		case 'custom':
			createEntries(Twinkle.getPref('customWarningList'), sub_group, true);
			break;
		case 'kitchensink':
			['level1', 'level2', 'level3', 'level4', 'level4im'].forEach(function(lvl) {
				$.each(Twinkle.warn.messages.levels, function(_, levelGroup) {
					createEntries(levelGroup.list, sub_group, true, lvl);
				});
			});
			createEntries(Twinkle.warn.messages.singlenotice, sub_group, true);
			createEntries(Twinkle.warn.messages.singlewarn, sub_group, true);
			createEntries(Twinkle.getPref('customWarningList'), sub_group, true);
			break;
		case 'level1':
		case 'level2':
		case 'level3':
		case 'level4':
		case 'level4im':
			// Creates subgroup regardless of whether there is anything to place in it;
			// leaves "Removal of deletion tags" empty for 4im
			$.each(Twinkle.warn.messages.levels, function(_, levelGroup) {
				var optgroup = new Morebits.QuickForm.Element({
					type: 'optgroup',
					label: levelGroup.category
				});
				optgroup = optgroup.render();
				sub_group.appendChild(optgroup);
				// create the options
				createEntries(levelGroup.list, optgroup, false);
			});
			break;
		case 'autolevel':
			// Check user page to determine appropriate level
			var autolevelProc = function() {
				var wikitext = Twinkle.warn.talkpageObj.getPageText();
				// history not needed for autolevel
				var latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
				// Pseudo-params with only what's needed to parse the level i.e. no messageData
				var params = {
					sub_group: old_subvalue,
					article: e.target.root.article.value
				};
				var lvl = 'level' + Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[1];

				// Identical to level1, etc. above but explicitly provides the level
				$.each(Twinkle.warn.messages.levels, function(_, levelGroup) {
					var optgroup = new Morebits.QuickForm.Element({
						type: 'optgroup',
						label: levelGroup.category
					});
					optgroup = optgroup.render();
					sub_group.appendChild(optgroup);
					// create the options
					createEntries(levelGroup.list, optgroup, false, lvl);
				});

				// Trigger subcategory change, add select menu, etc.
				Twinkle.warn.callback.postCategoryCleanup(e);
			};


			if (Twinkle.warn.talkpageObj) {
				autolevelProc();
			} else {
				if (Twinkle.warn.isFlow) {
					var $noTalkPageNode = $('<strong/>', {
						text: conv({ hans: '结构式讨论（Flow）不支持自动选择警告层级，请手动选择层级。', hant: '結構式討論（Flow）不支援自動選擇警告層級，請手動選擇層級。' }),
						id: 'twinkle-warn-autolevel-message',
						css: {color: 'red' }
					});
					$noTalkPageNode.insertBefore($('#twinkle-warn-warning-messages'));
					// If a preview was opened while in a different mode, close it
					// Should nullify the need to catch the error in preview callback
					e.target.root.previewer.closePreview();
				} else {
					var usertalk_page = new Morebits.wiki.Page('User_talk:' + Morebits.wiki.flow.relevantUserName(), conv({ hans: '加载上次警告', hant: '載入上次警告' }));
					usertalk_page.setFollowRedirect(true, false);
					usertalk_page.load(function(pageobj) {
						Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj
						autolevelProc();
					}, function() {
						// Catch and warn if the talkpage can't load,
						// most likely because it's a cross-namespace redirect
						// Supersedes the typical $autolevelMessage added in autolevelParseWikitext
						var $noTalkPageNode = $('<strong/>', {
							text: conv({ hans: '无法加载用户讨论页，这可能是因为它是跨命名空间重定向，自动选择警告级别将不会运作。', hant: '無法載入使用者討論頁，這可能是因為它是跨命名空間重新導向，自動選擇警告級別將不會運作。' }),
							id: 'twinkle-warn-autolevel-message',
							css: {color: 'red' }
						});
						$noTalkPageNode.insertBefore($('#twinkle-warn-warning-messages'));
						// If a preview was opened while in a different mode, close it
						// Should nullify the need to catch the error in preview callback
						e.target.root.previewer.closePreview();
					});
				}
			}
			break;
		default:
			alert(conv({ hans: 'twinklewarn中未知的警告组', hant: 'twinklewarn中未知的警告組' }));
			break;
	}

	// Trigger subcategory change, add select menu, etc.
	// Here because of the async load for autolevel
	if (value !== 'autolevel') {
		// reset any autolevel-specific messages while we're here
		$('#twinkle-warn-autolevel-message').remove();

		Twinkle.warn.callback.postCategoryCleanup(e);
	}
};

Twinkle.warn.callback.postCategoryCleanup = function twinklewarnCallbackPostCategoryCleanup(e) {
	// clear overridden label on article textbox
	Morebits.QuickForm.setElementTooltipVisibility(e.target.root.article, true);
	Morebits.QuickForm.resetElementLabel(e.target.root.article);
	// Trigger custom label/change on main category change
	Twinkle.warn.callback.change_subcategory(e);

	// Use select2 to make the select menu searchable
	if (!Twinkle.getPref('oldSelect')) {
		$('select[name=sub_group]')
			.select2({
				width: '100%',
				matcher: Morebits.select2.matchers.optgroupFull,
				templateResult: Morebits.select2.highlightSearchMatches,
				language: {
					searching: Morebits.select2.queryInterceptor
				}
			})
			.change(Twinkle.warn.callback.change_subcategory);

		$('.select2-selection').keydown(Morebits.select2.autoStart).focus();

		mw.util.addCSS(
			// Increase height
			'.select2-container .select2-dropdown .select2-results > .select2-results__options { max-height: 350px; }' +

			// Reduce padding
			'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
			'.select2-results .select2-results__group { padding-top: 1px; padding-bottom: 1px; } ' +

			// Adjust font size
			'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
			'.select2-container .selection .select2-selection__rendered { font-size: 13px; }'
		);
	}
};

Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
	var main_group = e.target.form.main_group.value;
	var value = e.target.form.sub_group.value;

	// Tags that don't take a linked article, but something else (often a username).
	// The value of each tag is the label next to the input field
	var notLinkedArticle = {
		'uw-bite': conv({ hans: '被“咬到”的用户（不含User:） ', hant: '被「咬到」的使用者（不含User:） ' }),
		'uw-username': conv({ hans: '用户名违反方针，因为… ', hant: '使用者名稱違反方針，因為… ' }),
		'uw-aiv': conv({ hans: '可选输入被警告的用户名（不含User:） ', hant: '可選輸入被警告的使用者名稱（不含User:） ' })
	};

	if (['singlenotice', 'singlewarn', 'singlecombined', 'kitchensink'].indexOf(main_group) !== -1) {
		if (notLinkedArticle[value]) {
			if (Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';

			// change form labels according to the warning selected
			Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, false);
			Morebits.QuickForm.overrideElementLabel(e.target.form.article, notLinkedArticle[value]);
		} else if (e.target.form.article.notArticle) {
			if (Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
			Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, true);
			Morebits.QuickForm.resetElementLabel(e.target.form.article);
		}
	}

	// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
	$('#tw-warn-red-notice').remove();
	var $redWarning;
	if (value === 'uw-username') {
		$redWarning = $(conv({
			hans: "<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不应</b>被用于<b>明显</b>违反用户名方针的用户。" +
			'明显的违反方针应被报告给UAA。' +
			'{{uw-username}}应只被用在边界情况下需要与用户讨论时。</div>',

			hant: "<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不應</b>被用於<b>明顯</b>違反用戶名方針的用戶。" +
			'明顯的違反方針應被報告給UAA。' +
				'{{uw-username}}應只被用在邊界情況下需要與用戶討論時。</div>'
		}));
		$redWarning.insertAfter(Morebits.QuickForm.getElementLabelObject(e.target.form.reasonGroup));
	}
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason, isCustom, noSign) {
		var text = '{{subst:' + templateName;

		// add linked article for user warnings
		if (article) {
			text += '|1=' + article;
		}
		if (reason) {
			// add extra message
			if (templateName === 'uw-csd') {
				text += '|3=' + reason;
			} else {
				text += '|2=' + reason;
			}
		}
		text += '|subst=subst:}}';

		if (!noSign) {
			text += ' ~~~~';
		}

		return text;
	},
	showPreview: function(form, templatename) {
		var input = Morebits.QuickForm.getInputData(form);
		// Provided on autolevel, not otherwise
		templatename = templatename || input.sub_group;
		var linkedarticle = input.article;
		var templatetext;

		templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle,
			input.reason, input.main_group === 'custom');

		form.previewer.beginRender(templatetext, 'User_talk:' + Morebits.wiki.flow.relevantUserName() + (Twinkle.warn.isFlow ? '/Wikitext' : '')); // Force wikitext/correct username
	},
	// Just a pass-through unless the autolevel option was selected
	preview: function(form) {
		if (form.main_group.value === 'autolevel') {
			// Always get a new, updated talkpage for autolevel processing
			var usertalk_page = new Morebits.wiki.Page('User_talk:' + Morebits.wiki.flow.relevantUserName(), conv({ hans: '加载上次警告', hant: '載入上次警告' }));
			usertalk_page.setFollowRedirect(true, false);
			// Will fail silently if the talk page is a cross-ns redirect,
			// removal of the preview box handled when loading the menu
			usertalk_page.load(function(pageobj) {
				Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj

				var wikitext = pageobj.getPageText();
				// history not needed for autolevel
				var latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
				var params = {
					sub_group: form.sub_group.value,
					article: form.article.value,
					messageData: $(form.sub_group).find('option[value="' + $(form.sub_group).val() + '"]').data('messageData')
				};
				var template = Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[0];
				Twinkle.warn.callbacks.showPreview(form, template);

				// If the templates have diverged, fake a change event
				// to reload the menu with the updated pageobj
				if (form.sub_group.value !== template) {
					var evt = document.createEvent('Event');
					evt.initEvent('change', true, true);
					form.main_group.dispatchEvent(evt);
				}
			});
		} else {
			Twinkle.warn.callbacks.showPreview(form);
		}
	},
	/**
	* Used in the main and autolevel loops to determine when to warn
	* about excessively recent, stale, or identical warnings.
	* @param {string} wikitext  The text of a user's talk page, from getPageText()
	* @returns {Object[]} - Array of objects: latest contains most recent
	* warning and date; history lists all prior warnings
	*/
	dateProcessing: function(wikitext) {
		var history_re = /<!--\s?Template:([uU]w-.*?)\s?-->.*?(\d{4})年(\d{1,2})月(\d{1,2})日 \([日一二三四五六]\) (\d{1,2}):(\d{1,2}) \(UTC\)/g;
		var history = {};
		var latest = { date: new Morebits.Date(0), type: '' };
		var current;

		while ((current = history_re.exec(wikitext)) !== null) {
			var template = current[1];
			var current_date = new Morebits.Date(current[2] + '-' + current[3] + '-' + current[4] + ' ' + current[5] + ':' + current[6] + ' UTC');
			if (!(template in history) || history[template].isBefore(current_date)) {
				history[template] = current_date;
			}
			if (!latest.date.isAfter(current_date)) {
				latest.date = current_date;
				latest.type = template;
			}
		}
		return [latest, history];
	},
	/**
	* Main loop for deciding what the level should increment to. Most of
	* this is really just error catching and updating the subsequent data.
	* May produce up to two notices in a twinkle-warn-autolevel-messages div
	*
	* @param {string} wikitext  The text of a user's talk page, from getPageText() (required)
	* @param {Object} params  Params object: sub_group is the template (required);
	* article is the user-provided article (form.article) used to link ARV on recent level4 warnings;
	* messageData is only necessary if getting the full template, as it's
	* used to ensure a valid template of that level exists
	* @param {Object} latest  First element of the array returned from
	* dateProcessing. Provided here rather than processed within to avoid
	* repeated call to dateProcessing
	* @param {(Date|Morebits.Date)} date  Date from which staleness is determined
	* @param {Morebits.Status} statelem  Status element, only used for handling error in final execution
	*
	* @returns {Array} - Array that contains the full template and just the warning level
	*/
	autolevelParseWikitext: function(wikitext, params, latest, date, statelem) {
		var level; // undefined rather than '' means the isNaN below will return true
		if (/\d(?:im)?$/.test(latest.type)) { // level1-4im
			level = parseInt(latest.type.replace(/.*(\d)(?:im)?$/, '$1'), 10);
		} else if (latest.type) { // Non-numbered warning
			// Try to leverage existing categorization of
			// warnings, all but one are universally lowercased
			var loweredType = /uw-multipleIPs/i.test(latest.type) ? 'uw-multipleIPs' : latest.type.toLowerCase();
			// It would be nice to account for blocks, but in most
			// cases the hidden message is terminal, not the sig
			if (Twinkle.warn.messages.singlewarn[loweredType]) {
				level = 3;
			} else {
				level = 1; // singlenotice or not found
			}
		}

		var $autolevelMessage = $('<div/>', {id: 'twinkle-warn-autolevel-message'});

		if (isNaN(level)) { // No prior warnings found, this is the first
			level = 1;
		} else if (level > 4 || level < 1) { // Shouldn't happen
			var message = conv({ hans: '无法解析上次的警告层级，请手动选择一个警告层级。', hant: '無法解析上次的警告層級，請手動選擇一個警告層級。' });
			if (statelem) {
				statelem.error(message);
			} else {
				alert(message);
			}
			return;
		} else {
			date = date || new Date();
			var autoTimeout = new Morebits.Date(latest.date.getTime()).add(parseInt(Twinkle.getPref('autolevelStaleDays'), 10), 'day');
			if (autoTimeout.isAfter(date)) {
				if (level === 4) {
					level = 4;
					// Basically indicates whether we're in the final Main evaluation or not,
					// and thus whether we can continue or need to display the warning and link
					if (!statelem) {
						var $link = $('<a/>', {
							href: '#',
							text: conv({ hans: '单击此处打开告状工具', hant: '點擊此處打開告狀工具' }),
							css: { fontWeight: 'bold' },
							click: function() {
								Morebits.wiki.actionCompleted.redirect = null;
								Twinkle.warn.dialog.close();
								Twinkle.arv.callback(Morebits.wiki.flow.relevantUserName());
								$('input[name=page]').val(params.article); // Target page
								$('input[value=final]').prop('checked', true); // Vandalism after final
							}
						});
						var statusNode = $('<div/>', {
							text: Morebits.wiki.flow.relevantUserName() + conv({ hans: '最后收到了一个层级4警告（', hant: '最後收到了一個層級4警告（' }) + latest.type + conv({ hans: '），所以将其报告给管理人员会比较好；', hant: '），所以將其報告給管理人員會比較好；' }),
							css: {color: 'red' }
						});
						statusNode.append($link[0]);
						$autolevelMessage.append(statusNode);
					}
				} else { // Automatically increase severity
					level += 1;
				}
			} else { // Reset warning level if most-recent warning is too old
				level = 1;
			}
		}

		$autolevelMessage.prepend($('<div>' + conv({ hans: '将发送', hant: '將發送' }) + '<span style="font-weight: bold;">' + conv({ hans: '层级', hant: '層級' }) + level + '</span>' + '警告模板' + '。</div>'));
		// Place after the stale and other-user-reverted (text-only) messages
		$('#twinkle-warn-autolevel-message').remove(); // clean slate
		$autolevelMessage.insertAfter($('#twinkle-warn-warning-messages'));

		var template = params.sub_group.replace(/(.*)\d$/, '$1');
		// Validate warning level, falling back to the uw-generic series.
		// Only a few items are missing a level, and in all but a handful
		// of cases, the uw-generic series is explicitly used elsewhere per WP:UTM.
		if (params.messageData && !params.messageData['level' + level]) {
			template = 'uw-generic';
		}
		template += level;

		return [template, level];
	},
	main: function(pageobj) {
		var text = pageobj.getPageText();
		var statelem = pageobj.getStatusElement();
		var params = pageobj.getCallbackParameters();
		var messageData = params.messageData;

		// JS somehow didn't get destructured assignment until ES6 so of course IE doesn't support it
		var warningHistory = Twinkle.warn.callbacks.dateProcessing(text);
		var latest = warningHistory[0];
		var history = warningHistory[1];

		var now = new Morebits.Date(pageobj.getLoadTime());

		Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj, just in case
		if (params.main_group === 'autolevel') {
			// [template, level]
			var templateAndLevel = Twinkle.warn.callbacks.autolevelParseWikitext(text, params, latest, now, statelem);

			// Only if there's a change from the prior display/load
			if (params.sub_group !== templateAndLevel[0] && !confirm(conv({ hans: '将发送给用户{{', hant: '將發送給使用者{{' }) + templateAndLevel[0] + conv({ hans: '}}模板，好吗？', hant: '}}模板，好嗎？' }))) {
				statelem.error(conv({ hans: '用户取消', hant: '使用者取消' }));
				return;
			}
			// Update params now that we've selected a warning
			params.sub_group = templateAndLevel[0];
			messageData = params.messageData['level' + templateAndLevel[1]];
		} else if (params.sub_group in history) {
			if (new Morebits.Date(history[params.sub_group]).add(1, 'day').isAfter(now)) {
				if (!confirm(conv({ hans: '近24小时内一个同样的 ', hant: '近24小時內一個同樣的 ' }) + params.sub_group + conv({ hans: ' 模板已被发出。\n是否继续？', hant: ' 模板已被發出。\n是否繼續？' }))) {
					statelem.error(conv({ hans: '用户取消', hant: '使用者取消' }));
					return;
				}
			}
		}

		latest.date.add(1, 'minute'); // after long debate, one minute is max

		if (latest.date.isAfter(now)) {
			if (!confirm(conv({ hans: '近1分钟内 ', hant: '近1分鐘內 ' }) + latest.type + conv({ hans: ' 模板已被发出。\n是否继续？', hant: ' 模板已被發出。\n是否繼續？' }))) {
				statelem.error(conv({ hans: '用户取消', hant: '使用者取消' }));
				return;
			}
		}

		// build the edit summary
		// Function to handle generation of summary prefix for custom templates
		var customProcess = function(template) {
			template = template.split('|')[0];
			var prefix;
			switch (template.substr(-1)) {
				case '1':
					prefix = '提醒';
					break;
				case '2':
					prefix = '注意';
					break;
				case '3':
					prefix = '警告';
					break;
				case '4':
					prefix = conv({ hans: '最后警告', hant: '最後警告' });
					break;
				case 'm':
					if (template.substr(-3) === '4im') {
						prefix = '唯一警告';
						break;
					}
					// falls through
				default:
					prefix = '提醒';
					break;
			}
			return prefix + '：' + Morebits.string.toUpperCaseFirstChar(messageData.label);
		};

		var summary;
		if (params.main_group === 'custom') {
			summary = customProcess(params.sub_group);
		} else {
			// Normalize kitchensink to the 1-4im style
			if (params.main_group === 'kitchensink' && !/^D+$/.test(params.sub_group)) {
				var sub = params.sub_group.substr(-1);
				if (sub === 'm') {
					sub = params.sub_group.substr(-3);
				}
				// Don't overwrite uw-3rr, technically unnecessary
				if (/\d/.test(sub)) {
					params.main_group = 'level' + sub;
				}
			}
			// singlet || level1-4im, no need to /^\D+$/.test(params.main_group)
			summary = messageData.summary || (messageData[params.main_group] && messageData[params.main_group].summary);
			// Not in Twinkle.warn.messages, assume custom template
			if (!summary) {
				summary = customProcess(params.sub_group);
			}
			if (messageData.suppressArticleInSummary !== true && params.article) {
				if (params.sub_group === 'uw-aiv') {  // these templates require a username
					summary += '（' + conv({ hans: '对于', hant: '對於' }) + '[[User:' + params.article + ']]）';
				} else if (params.sub_group === 'uw-bite') {  // this template requires a username
					summary += '，' + conv({ hans: '于', hant: '於' }) + '[[User talk:' + params.article + ']]';
				} else {
					summary += conv({ hans: '，于[[', hant: '，於[[' }) + params.article + ']]';
				}
			}
		}

		pageobj.setEditSummary(summary);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('watchWarnings'));


		// Get actual warning text
		var warningText = Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason, params.main_group === 'custom');
		if (Twinkle.getPref('showSharedIPNotice') && mw.util.isIPAddress(mw.config.get('wgTitle'))) {
			Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '加入共享IP说明', hant: '加入共享IP說明' }));
			warningText += '\n{{subst:SharedIPAdvice}}';
		}

		var sectionExists = false, sectionNumber = 0;
		// Only check sections if there are sections or there's a chance we won't create our own
		if (!messageData.heading && text.length) {
			// Get all sections
			var sections = text.match(/^(==*).+\1/gm);
			if (sections && sections.length !== 0) {
				// Find the index of the section header in question
				var dateHeaderRegex = now.monthHeaderRegex();
				sectionNumber = 0;
				// Find this month's section among L2 sections, preferring the bottom-most
				sectionExists = sections.reverse().some(function(sec, idx) {
					return /^(==)[^=].+\1/m.test(sec) && dateHeaderRegex.test(sec) && typeof (sectionNumber = sections.length - 1 - idx) === 'number';
				});
			}
		}

		if (sectionExists) { // append to existing section
			pageobj.setPageSection(sectionNumber + 1);
			pageobj.setAppendText('\n\n' + warningText);
			pageobj.append();
		} else {
			if (messageData.heading) { // create new section
				pageobj.setNewSectionTitle(messageData.heading);
			} else {
				Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), conv({ hans: '未找到当月的二级标题，将创建新的', hant: '未找到當月的二級標題，將建立新的' }));
				pageobj.setNewSectionTitle(now.monthHeader(0));
			}
			pageobj.setNewSectionText(warningText);
			pageobj.newSection();
		}
	},
	main_flow: function (flowobj) {
		var params = flowobj.getCallbackParameters();
		var messageData = params.messageData;

		// build the edit summary
		// Function to handle generation of summary prefix for custom templates
		var customProcess = function(template) {
			template = template.split('|')[0];
			var prefix;
			switch (template.substr(-1)) {
				case '1':
					prefix = '提醒';
					break;
				case '2':
					prefix = '注意';
					break;
				case '3':
					prefix = '警告';
					break;
				case '4':
					prefix = conv({ hans: '最后警告', hant: '最後警告' });
					break;
				case 'm':
					if (template.substr(-3) === '4im') {
						prefix = '唯一警告';
						break;
					}
					// falls through
				default:
					prefix = '提醒';
					break;
			}
			return prefix + '：' + Morebits.string.toUpperCaseFirstChar(messageData.label);
		};

		var topic;
		if (messageData.heading) {
			topic = messageData.heading;
		} else {
			// Normalize kitchensink to the 1-4im style
			if (params.main_group === 'kitchensink' && !/^D+$/.test(params.sub_group)) {
				var sub = params.sub_group.substr(-1);
				if (sub === 'm') {
					sub = params.sub_group.substr(-3);
				}
				// Don't overwrite uw-3rr, technically unnecessary
				if (/\d/.test(sub)) {
					params.main_group = 'level' + sub;
				}
			}
			// singlet || level1-4im, no need to /^\D+$/.test(params.main_group)
			topic = messageData.summary || (messageData[params.main_group] && messageData[params.main_group].summary);
			// Not in Twinkle.warn.messages, assume custom template
			if (!topic) {
				topic = customProcess(params.sub_group);
			}
		}

		var content = Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason, params.main_group === 'custom', true);

		flowobj.setTopic(topic);
		flowobj.setContent(content);
		flowobj.newTopic();
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {
	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName();

	// reason, main_group, sub_group, article
	var params = Morebits.QuickForm.getInputData(e.target);

	// Check that a reason was filled in if uw-username was selected
	if (params.sub_group === 'uw-username' && !params.article) {
		alert(conv({ hans: '必须给{{uw-username}}提供理由。', hant: '必須給{{uw-username}}提供理由。' }));
		return;
	}

	if (params.article) {
		if (/https?:\/\//.test(params.article)) {
			alert(conv({ hans: '“页面链接”不能使用网址。', hant: '「頁面連結」不能使用網址。' }));
			return;
		}

		try {
			var article = new mw.Title(params.article);
			params.article = article.getPrefixedText();
			if (article.getFragment()) {
				params.article += '#' + article.getFragment();
			}
		} catch (error) {
			alert(conv({ hans: '“页面链接”不合法，仅能输入一个页面名称，勿使用网址、[[ ]]，可使用Special:Diff。', hant: '「頁面連結」不合法，僅能輸入一個頁面名稱，勿使用網址、[[ ]]，可使用Special:Diff。' }));
			return;
		}
	}

	// The autolevel option will already know by now if a user talk page
	// is a cross-namespace redirect (via !!Twinkle.warn.talkpageObj), so
	// technically we could alert an error here, but the user will have
	// already ignored the bold red error above.  Moreover, they probably
	// *don't* want to actually issue a warning, so the error handling
	// after the form is submitted is probably preferable

	// Find the selected <option> element so we can fetch the data structure
	var $selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');
	params.messageData = $selectedEl.data('messageData');

	if (typeof params.messageData === 'undefined') {
		alert(conv({ hans: '请选择警告模板。', hant: '請選擇警告模板。' }));
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);
	Twinkle.block.fetchUserInfo(function () {
		if (initialBlockId !== Twinkle.block.blockLogId || !!initialBlockInfo !== !!Twinkle.block.currentBlockInfo) {
			var newBlockMessage = conv({ hans: '此用户的封禁状态发生变化，确定继续发出警告？', hant: '此使用者的封鎖狀態發生變化，確定繼續發出警告？' });
			if (!confirm(newBlockMessage)) {
				Morebits.Status.error(conv({ hans: '警告、提醒用户', hant: '警告、提醒使用者' }), conv({ hans: '用户取消操作', hant: '使用者取消操作' }));
				return;
			}
		}
		Morebits.wiki.actionCompleted.redirect = userTalkPage;
		Morebits.wiki.actionCompleted.notice = conv({ hans: '警告完成，将在几秒后刷新', hant: '警告完成，將在幾秒後重新整理' });

		if (Twinkle.warn.isFlow) {
			var flow_page = new Morebits.wiki.flow(userTalkPage, conv({ hans: '用户Flow讨论页留言', hant: '使用者Flow討論頁留言' }));
			flow_page.setCallbackParameters(params);
			Twinkle.warn.callbacks.main_flow(flow_page);
		} else {
			var wikipedia_page = new Morebits.wiki.Page(userTalkPage, conv({ hans: '用户讨论页修改', hant: '使用者討論頁修改' }));
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.setFollowRedirect(true, false);
			wikipedia_page.load(Twinkle.warn.callbacks.main);
		}
	});
};

Twinkle.addInitCallback(Twinkle.warn, 'warn');
})();


// </nowiki>
