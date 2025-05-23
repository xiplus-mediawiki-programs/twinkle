// <nowiki>


(function() {


/*
 ****************************************
 *** friendlytalkback.js: Talkback module
 ****************************************
 * Mode of invocation:     Tab ("TB")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 * Config directives in:   FriendlyConfig
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.talkback = function() {

	if (!Morebits.wiki.flow.relevantUserName()) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.talkback.callback, '通告', 'friendly-talkback', conv({ hans: '回复通告', hant: '回覆通告' }));
};

Twinkle.talkback.callback = function() {
	if (Morebits.wiki.flow.relevantUserName() === mw.config.get('wgUserName') && !confirm(conv({ hans: '您寂寞到了要自己通告自己的程度么？', hant: '您寂寞到了要自己通告自己的程度麼？' }))) {
		return;
	}

	var Window = new Morebits.SimpleWindow(600, 350);
	Window.setTitle(conv({ hans: '回复通告', hant: '回覆通告' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '关于{{talkback}}', hant: '關於{{talkback}}' }), 'Template:Talkback');
	Window.addFooterLink(conv({ hans: '通告设置', hant: '通告設定' }), 'WP:TW/PREF#talkback');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#talkback');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.talkback.evaluate);

	form.append({ type: 'radio', name: 'tbtarget',
		list: [
			{
				label: conv({ hans: '回复：我的讨论页', hant: '回覆：我的討論頁' }),
				value: 'mytalk',
				checked: 'true'
			},
			{
				label: conv({ hans: '回复：其他用户的讨论页', hant: '回覆：其他使用者的討論頁' }),
				value: 'usertalk'
			},
			{
				label: conv({ hans: '回复：其它页面', hant: '回覆：其它頁面' }),
				value: 'other'
			},
			{
				label: conv({ hans: '邀请讨论', hant: '邀請討論' }),
				value: 'see'
			},
			{
				label: '通告板通知',
				value: 'notice'
			},
			{
				label: conv({ hans: '“有新邮件”', hant: '「有新郵件」' }),
				value: 'mail'
			}
		],
		event: Twinkle.talkback.changeTarget
	});

	form.append({
		type: 'field',
		label: '工作区',
		name: 'work_area'
	});

	var previewlink = document.createElement('a');
	$(previewlink).click(function() {
		Twinkle.talkback.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = conv({ hans: '预览', hant: '預覽' });
	form.append({ type: 'div', id: 'talkbackpreview', label: [ previewlink ] });
	form.append({ type: 'div', id: 'friendlytalkback-previewbox', style: 'display: none' });

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.previewer = new Morebits.wiki.Preview($(result).find('div#friendlytalkback-previewbox').last()[0]);

	// We must init the
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.tbtarget[0].dispatchEvent(evt);

	// Check whether the user has opted out from talkback
	var query = {
		action: 'query',
		prop: 'extlinks',
		titles: 'User talk:' + Morebits.wiki.flow.relevantUserName(),
		elquery: 'userjs.invalid/noTalkback',
		ellimit: '1'
	};
	var wpapi = new Morebits.wiki.Api(conv({ hans: '抓取退出通告信息', hant: '抓取退出通告資訊' }), query, Twinkle.talkback.callback.optoutStatus);
	wpapi.post();
};

Twinkle.talkback.optout = '';

Twinkle.talkback.callback.optoutStatus = function(apiobj) {
	var $el = $(apiobj.getXML()).find('el');
	if ($el.length) {
		Twinkle.talkback.optout = Morebits.wiki.flow.relevantUserName() + conv({ hans: '不希望收到回复通告', hant: '不希望收到回覆通告' });
		var url = $el.text();
		var reason = mw.util.getParamValue('reason', url);
		Twinkle.talkback.optout += reason ? '：' + Morebits.string.appendPunctuation(reason) : '。';
	}
	$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
};

var prev_page = '';
var prev_section = '';
var prev_message = '';

Twinkle.talkback.changeTarget = function(e) {
	var value = e.target.values;
	var root = e.target.form;
	var old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];

	if (root.section) {
		prev_section = root.section.value;
	}
	if (root.message) {
		prev_message = root.message.value;
	}
	if (root.page) {
		prev_page = root.page.value;
	}

	var work_area = new Morebits.QuickForm.Element({
		type: 'field',
		label: conv({ hans: '回复通告信息', hant: '回覆通告資訊' }),
		name: 'work_area'
	});

	root.previewer.closePreview();

	switch (value) {
		case 'mytalk':
			/* falls through */
		default:
			work_area.append({
				type: 'div',
				label: '',
				style: 'color: red',
				id: 'twinkle-talkback-optout-message'
			});
			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '章节（可选）', hant: '章節（可選）' }),
				tooltip: conv({ hans: '您留言的章节标题，留空则不会产生章节链接。', hant: '您留言的章節標題，留空則不會產生章節連結。' }),
				value: prev_section
			});
			break;

		case 'usertalk':
			work_area.append({
				type: 'div',
				label: '',
				style: 'color: red',
				id: 'twinkle-talkback-optout-message'
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: conv({ hans: '用户（必填）', hant: '使用者（必填）' }),
				tooltip: conv({ hans: '您留言页面的用户名，必填。', hant: '您留言頁面的使用者名稱，必填。' }),
				value: prev_page,
				required: true
			});

			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '章节（可选）', hant: '章節（可選）' }),
				tooltip: conv({ hans: '您留言的章节标题，留空则不会产生章节链接。', hant: '您留言的章節標題，留空則不會產生章節連結。' }),
				value: prev_section
			});
			break;

		case 'notice':
			var noticeboard = work_area.append({
				type: 'select',
				name: 'noticeboard',
				label: '通告板：'
			});

			$.each(Twinkle.talkback.noticeboards, function(value, data) {
				noticeboard.append({
					type: 'option',
					label: data.label,
					value: value,
					selected: !!data.defaultSelected
				});
			});

			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '章节（可选）', hant: '章節（可選）' }),
				tooltip: conv({ hans: '章节标题，留空则不会产生章节链接。', hant: '章節標題，留空則不會產生章節連結。' }),
				value: prev_section
			});
			break;

		case 'other':
			work_area.append({
				type: 'div',
				label: '',
				style: 'color: red',
				id: 'twinkle-talkback-optout-message'
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: conv({ hans: '完整页面名', hant: '完整頁面名' }),
				tooltip: conv({ hans: '您留下消息的完整页面名，比如“Wikipedia talk:Twinkle”。', hant: '您留下訊息的完整頁面名，比如「Wikipedia talk:Twinkle」。' }),
				value: prev_page,
				required: true
			});

			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '章节（可选）', hant: '章節（可選）' }),
				tooltip: conv({ hans: '您留言的章节标题，留空则不会产生章节链接。', hant: '您留言的章節標題，留空則不會產生章節連結。' }),
				value: prev_section
			});
			break;

		case 'mail':
			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '电子邮件主题（可选）', hant: '電子郵件主題（可選）' }),
				tooltip: conv({ hans: '您发出的电子邮件的主题。', hant: '您發出的電子郵件的主題。' })
			});
			break;

		case 'see':
			work_area.append({
				type: 'input',
				name: 'page',
				label: conv({ hans: '完整页面名', hant: '完整頁面名' }),
				tooltip: conv({ hans: '您留下消息的完整页面名，比如“Wikipedia talk:Twinkle”。', hant: '您留下訊息的完整頁面名，比如「Wikipedia talk:Twinkle」。' }),
				value: prev_page,
				required: true
			});
			work_area.append({
				type: 'input',
				name: 'section',
				label: conv({ hans: '章节（可选）', hant: '章節（可選）' }),
				tooltip: conv({ hans: '您留言的章节标题，留空则不会产生章节链接。', hant: '您留言的章節標題，留空則不會產生章節連結。' }),
				value: prev_section
			});
			break;
	}

	if (value !== 'notice') {
		work_area.append({ type: 'textarea', label: conv({ hans: '附加信息（可选）：', hant: '附加資訊（可選）：' }), name: 'message', tooltip: conv({ hans: '会在回复通告模板下出现的消息，您的签名会被加在最后。', hant: '會在回覆通告模板下出現的訊息，您的簽名會被加在最後。' }) });
	}

	work_area = work_area.render();
	root.replaceChild(work_area, old_area);
	if (root.message) {
		root.message.value = prev_message;
	}

	$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
};

Twinkle.talkback.noticeboards = {
	affp: {
		label: 'WP:AF/FP（' + conv({ hans: '防滥用过滤器/错误报告', hant: '防濫用過濾器/錯誤報告' }) + '）',
		title: conv({ hans: '过滤器错误报告有新回应', hant: '過濾器錯誤報告有新回應' }),
		content: conv({ hans: '您的[[Wikipedia:防滥用过滤器/错误报告|过滤器错误报告]]已有回应，请前往查看。', hant: '您的[[Wikipedia:防滥用过滤器/错误报告|過濾器錯誤報告]]已有回應，請前往查看。' }) + '--~~~~',
		editSummary: conv({ hans: '有关[[Wikipedia:防滥用过滤器/错误报告]]的通知', hant: '有關[[Wikipedia:防滥用过滤器/错误报告]]的通知' }),
		defaultSelected: true
	},
	sbl: {
		label: 'Spam-blacklist',
		title: conv({ hans: '垃圾链接黑名单请求有新回应', hant: '垃圾連結黑名單請求有新回應' }),
		content: conv({ hans: '您的[[MediaWiki talk:Spam-blacklist|垃圾链接黑名单请求]]已有回应，请前往查看。', hant: '您的[[MediaWiki talk:Spam-blacklist|垃圾連結黑名單請求]]已有回應，請前往查看。' }) + '--~~~~',
		editSummary: conv({ hans: '有关[[MediaWiki talk:Spam-blacklist]]的通知', hant: '有關[[MediaWiki talk:Spam-blacklist]]的通知' })
	},
	shl: {
		label: 'Spam-whitelist',
		title: conv({ hans: '垃圾链接白名单请求有新回应', hant: '垃圾連結白名單請求有新回應' }),
		content: conv({ hans: '您的[[MediaWiki talk:Spam-whitelist|垃圾链接白名单请求]]已有回应，请前往查看。', hant: '您的[[MediaWiki talk:Spam-whitelist|垃圾連結白名單請求]]已有回應，請前往查看。' }) + '--~~~~',
		editSummary: conv({ hans: '有关[[MediaWiki talk:Spam-whitelist]]的通知', hant: '有關[[MediaWiki talk:Spam-whitelist]]的通知' })
	}
};

Twinkle.talkback.evaluate = function(e) {
	var form = e.target;
	var tbtarget = form.getChecked('tbtarget')[0];
	var page, message;
	var section = form.section.value;

	var editSummary;
	if (tbtarget === 'notice') {
		page = form.noticeboard.value;
		editSummary = Twinkle.talkback.noticeboards[page].editSummary;
	} else {

		// usertalk, other, see
		page = form.page ? form.page.value : mw.config.get('wgUserName');
		if (form.message) {
			message = form.message.value.trim();
		}

		if (tbtarget === 'mail') {
			editSummary = conv({ hans: '通知：有新邮件', hant: '通知：有新郵件' });
		} else if (tbtarget === 'see') {
			editSummary = conv({ hans: '请看看', hant: '請看看' }) + '[[:' + page + (section ? '#' + section : '') + ']]' + conv({ hans: '上的讨论', hant: '上的討論' });
		} else {  // tbtarget one of mytalk, usertalk, other
			editSummary = conv({ hans: '回复通告', hant: '回覆通告' }) + '（[[:';
			if (tbtarget !== 'other' && !new RegExp('^\\s*' + Morebits.namespaceRegex(3) + ':', 'i').test(page)) {
				editSummary += 'User talk:';
			}
			editSummary += page + (section ? '#' + section : '') + ']])';
		}
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	var fullUserTalkPageName = mw.config.get('wgFormattedNamespaces')[mw.config.get('wgNamespaceIds').user_talk] + ':' + Morebits.wiki.flow.relevantUserName();

	Morebits.wiki.actionCompleted.redirect = fullUserTalkPageName;
	Morebits.wiki.actionCompleted.notice = conv({ hans: '回复通告完成，将在几秒内刷新页面', hant: '回覆通告完成，將在幾秒內重新整理頁面' });

	Morebits.wiki.flow.check(fullUserTalkPageName, function () {
		var data = Twinkle.talkback.getNoticeWikitext(tbtarget, page, section, message);
		var title = data[1], content = data[2];

		var flowpage = new Morebits.wiki.flow(fullUserTalkPageName, conv({ hans: '加入回复通告', hant: '加入回覆通告' }));
		flowpage.setTopic(title);
		flowpage.setContent(content);
		flowpage.newTopic();
	}, function () {
		var text = '\n\n' + Twinkle.talkback.getNoticeWikitext(tbtarget, page, section, message)[0];

		var talkpage = new Morebits.wiki.Page(fullUserTalkPageName, conv({ hans: '加入回复通告', hant: '加入回覆通告' }));

		talkpage.setEditSummary(editSummary);
		talkpage.setChangeTags(Twinkle.changeTags);
		talkpage.setAppendText(text);
		talkpage.setCreateOption('recreate');
		talkpage.setMinorEdit(Twinkle.getPref('markTalkbackAsMinor'));
		talkpage.setFollowRedirect(true);
		talkpage.append();
	});
};

Twinkle.talkback.preview = function(form) {
	var tbtarget = form.getChecked('tbtarget')[0];
	var section = form.section.value;
	var page, message;

	if (tbtarget === 'notice') {
		page = form.noticeboard.value;
	} else {
		// usertalk, other, see
		page = form.page ? form.page.value : mw.config.get('wgUserName');
		if (form.message) {
			message = form.message.value.trim();
		}
	}

	var noticetext = Twinkle.talkback.getNoticeWikitext(tbtarget, page, section, message)[0];
	form.previewer.beginRender(noticetext, 'User_talk:' + Morebits.wiki.flow.relevantUserName()); // Force wikitext/correct username
};

Twinkle.talkback.getNoticeWikitext = function(tbtarget, page, section, message) {
	var text;
	var title, content;
	if (tbtarget === 'notice') {
		title = Twinkle.talkback.noticeboards[page].title;
		content = Morebits.string.safeReplace(Twinkle.talkback.noticeboards[page].content, '$SECTION', section);
		text = '== ' + title + ' ==\n' + content;
	} else if (tbtarget === 'see') {
		title = page + conv({ hans: '的相关讨论', hant: '的相關討論' });
		content = '{{subst:Please see|location=' + page + (section ? '#' + section : '') + '|more=' + message.trim() + '}}';
		text = '{{subst:Please see|location=' + page + (section ? '#' + section : '') + '|more=' + message.trim() + '}}';
	} else {
		text = '==';
		if (tbtarget === 'mail') {
			title = Twinkle.getPref('mailHeading');
			content = "{{You've got mail|subject=" + section + '|ts=~~~~~}}';
			text += Twinkle.getPref('mailHeading') + '==\n' + "{{You've got mail|subject=" + section;
		} else {  // tbtarget one of mytalk, usertalk, other
			// clean talkback heading: strip section header markers that were erroneously suggested in the documentation
			title = Twinkle.getPref('talkbackHeading').replace(/^\s*=+\s*(.*?)\s*=+$\s*/, '$1');
			content = '{{talkback|' + page + (section ? '|' + section : '');
			text += Twinkle.getPref('talkbackHeading').replace(/^\s*=+\s*(.*?)\s*=+$\s*/, '$1') +
				'==\n' + '{{talkback|' + page + (section ? '|' + section : '');
		}
		content += '|ts=~~~~~}}';
		text += '|ts=~~~~~}}';

		if (message) {
			content += '\n' + message;
			text += '\n' + message + '  ~~~~';
		} else if (Twinkle.getPref('insertTalkbackSignature')) {
			text += '\n~~~~';
		}
	}
	return [text, title, content];
};

Twinkle.addInitCallback(Twinkle.talkback, 'talkback');
})();


// </nowiki>
