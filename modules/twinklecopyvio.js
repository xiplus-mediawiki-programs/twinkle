// <nowiki>


(function() { // eslint-disable-line no-unused-vars


/*
 ****************************************
 *** twinklecopyvio.js: Copyvio module
 ****************************************
 * Mode of invocation:     Tab ("Copyvio")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.copyvio = function twinklecopyvio() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.isPageRedirect())))) {
		return;
	}
	if (mw.config.get('wgPageContentModel') === 'flow-board') {
		return;
	}
	Twinkle.addPortletLink(Twinkle.copyvio.callback, conv({ hans: '侵权', hant: '侵權' }), 'tw-copyvio', conv({ hans: '提报侵权页面', hant: '提報侵權頁面' }), '');
};

Twinkle.copyvio.callback = function twinklecopyvioCallback() {
	var Window = new Morebits.SimpleWindow(600, 350);
	Window.setTitle(conv({ hans: '提报侵权页面', hant: '提報侵權頁面' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '常见错误', hant: '常見錯誤' }), 'Wikipedia:管理员错误自查表/侵权处理');
	Window.addFooterLink(conv({ hans: '侵权设置', hant: '侵權設定' }), 'WP:TW/PREF#copyvio');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#copyvio');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.copyvio.callback.evaluate);
	form.append({
		type: 'textarea',
		label: conv({ hans: '侵权来源：', hant: '侵權來源：' }),
		name: 'source'
	}
	);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: 'CSD G5: 曾经根据侵权审核删除后又重新创建的内容', hant: 'CSD G5: 曾經根據侵權審核刪除後又重新建立的內容' }),
				value: 'g5',
				name: 'g5',
				tooltip: conv({ hans: '同时以G5准则提报快速删除', hant: '同時以G5準則提報快速刪除' }),
				subgroup: [{
					name: 'g5_pagename',
					type: 'input',
					label: conv({ hans: '前次删除的页面名称', hant: '前次刪除的頁面名稱' }),
					tooltip: conv({ hans: '选填，如果前次删除的页面名称不同，请提供', hant: '選填，如果前次刪除的頁面名稱不同，請提供' })
				}]
			},
			{
				label: conv({ hans: 'CSD G16: 页面与介绍相同事物的原页面同样侵权', hant: 'CSD G16: 頁面與介紹相同事物的原頁面同樣侵權' }),
				value: 'g16',
				name: 'g16',
				tooltip: conv({ hans: '同时以G16准则提报快速删除', hant: '同時以G16準則提報快速刪除' }),
				subgroup: [{
					name: 'g16_pagename',
					type: 'input',
					label: conv({ hans: '已提报侵权的页面名称', hant: '已提報侵權的頁面名稱' }),
					tooltip: conv({ hans: '必填，请提供当前正在侵权审核的页面名称，若页面已根据侵权删除，则应使用G5准则', hant: '必填，請提供目前正在侵權審核的頁面名稱，若頁面已根據侵權刪除，則應使用G5準則' })
				}]
			},
			{
				label: conv({ hans: '通知页面创建者', hant: '通知頁面建立者' }),
				value: 'notify',
				name: 'notify',
				tooltip: conv({ hans: '在页面创建者讨论页上放置一通知模板。', hant: '在頁面建立者討論頁上放置一通知模板。' }),
				checked: true
			}
		]
	});
	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
};

Twinkle.copyvio.callbacks = {
	tryTagging: function (pageobj) {
		// 先尝试标记页面，如果发现已经标记则停止提报
		var text = pageobj.getPageText();

		if (text.indexOf('{{Copyvio|') === -1) {
			Twinkle.copyvio.callbacks.taggingArticle(pageobj);

			// Contributor specific edits
			var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'));
			wikipedia_page.setCallbackParameters(pageobj.getCallbackParameters());
			wikipedia_page.lookupCreation(Twinkle.copyvio.callbacks.main);
		} else {
			Morebits.Status.error(conv({ hans: '错误', hant: '錯誤' }), conv({ hans: '页面已经标记侵权，请人工确认是否已经提报。', hant: '頁面已經標記侵權，請人工確認是否已經提報。' }));
		}
	},
	main: function(pageobj) {
		// this is coming in from lookupCreation...!
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();

		// Adding discussion
		var wikipedia_page = new Morebits.wiki.Page(params.logpage, conv({ hans: '加入侵权记录项', hant: '加入侵權記錄項' }));
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.copyvio.callbacks.copyvioList);

		// Notification to first contributor
		if (params.notify) {
			Morebits.wiki.flow.check('User talk:' + initialContrib, function () {
				var flowpage = new Morebits.wiki.flow('User talk:' + initialContrib, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + initialContrib + '）');
				var topic = '您建立的页面[[' + mw.config.get('wgPageName') + ']]可能侵犯版权';
				var content = '{{subst:CopyvioNotice|' + mw.config.get('wgPageName') + '|flow=yes}}';
				flowpage.setTopic(topic);
				flowpage.setContent(content);
				flowpage.newTopic();
			}, function () {
				var usertalkpage = new Morebits.wiki.Page('User talk:' + initialContrib, conv({ hans: '通知页面创建者（', hant: '通知頁面建立者（' }) + initialContrib + '）');
				var notifytext = '\n{{subst:CopyvioNotice|' + mw.config.get('wgPageName') + '}}';
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary(conv({ hans: '通知：页面[[', hant: '通知：頁面[[' }) + mw.config.get('wgPageName') + conv({ hans: ']]疑似侵犯著作权', hant: ']]疑似侵犯版權' }));
				usertalkpage.setChangeTags(Twinkle.changeTags);
				usertalkpage.setCreateOption('recreate');
				usertalkpage.setWatchlist(Twinkle.getPref('copyvioWatchUser'));
				usertalkpage.setFollowRedirect(true, false);
				usertalkpage.append();
			});
		}
	},
	taggingArticle: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var revisionId = mw.config.get('wgRevisionId') || mw.config.get('wgDiffNewId') || mw.config.get('wgCurRevisionId');
		var tag = '{{subst:Copyvio/auto|url=' + params.source.replace(/http/g, '&#104;ttp').replace(/\n+/g, '\n').replace(/^\s*([^*])/gm, '* $1').replace(/^\* $/m, '') + '|OldRevision=' + revisionId + '}}';
		var text = pageobj.getPageText();
		var oldcsd = text.match(/{{\s*(db(-\w*)?|d|delete)\s*(\|(?:{{[^{}]*}}|[^{}])*)?}}/i);
		if (oldcsd && confirm(conv({ hans: '在页面上找到快速删除模板，要保留吗？\n\n当页面同时侵犯著作权又符合快速删除标准时，应该优先走快速删除程序。\n单击“确认”以保留快速删除模板，若您认为快速删除理由不合，单击“取消”以移除快速删除模板。', hant: '在頁面上找到快速刪除模板，要保留嗎？\n\n當頁面同時侵犯版權又符合快速刪除標準時，應該優先走快速刪除程序。\n點擊「確認」以保留快速刪除模板，若您認為快速刪除理由不合，點擊「取消」以移除快速刪除模板。' }))) {
			tag = oldcsd[0] + '\n' + tag;
			var oldsalt = text.match(/{{\s*salt\s*(\|(?:{{[^{}]*}}|[^{}])*)?}}/i);
			if (oldsalt) {
				tag = oldsalt[0] + '\n' + tag;
			}
		}
		if (params.g5 || params.g16) {
			var speedyTag = '{{delete';
			if (params.g5) {
				speedyTag += '|g5';
				if (params.g5_pagename) {
					speedyTag += '|' + params.g5_pagename + '|c1=[[Special:Undelete/' + params.g5_pagename + ']]';
				} else {
					speedyTag += '|c1=[[Special:Undelete/' + mw.config.get('wgPageName') + ']]';
				}
			}
			if (params.g16) {
				speedyTag += '|g16|' + params.g16_pagename;
			}
			speedyTag += '}}';

			tag = speedyTag + '\n' + tag;
		}

		pageobj.setPageText(tag);
		pageobj.setEditSummary(conv({ hans: '本页面疑似侵犯著作权', hant: '本頁面疑似侵犯版權' }));
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('copyvioWatchPage'));
		// pageobj.setCreateOption('recreate');
		pageobj.save();

		if (Twinkle.getPref('markCopyvioPagesAsPatrolled')) {
			pageobj.patrol();
		}
	},
	copyvioList: function(pageobj) {
		var text = pageobj.getPageText();
		var output = '';
		var date = new Date();

		var dateHeaderRegex = new RegExp('^===+\\s*' + (date.getUTCMonth() + 1) + '月' + date.getUTCDate() + '日' +
			'\\s*===+', 'mg');

		if (!dateHeaderRegex.exec(text)) {
			output = '\n\n===' + (date.getUTCMonth() + 1) + '月' + date.getUTCDate() + '日' + '===';
		}

		output += '\n{{subst:CopyvioVFDRecord|' + mw.config.get('wgPageName') + '}}';
		pageobj.setAppendText(output);
		pageobj.setEditSummary('加入[[' + mw.config.get('wgPageName') + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};


Twinkle.copyvio.callback.evaluate = function(e) {
	var params = Morebits.QuickForm.getInputData(e.target);

	if (!params.source.trim()) {
		alert(conv({ hans: '请指定侵权来源', hant: '請指定侵權來源' }));
		return;
	}
	if (params.g16 && !params.g16_pagename.trim()) {
		alert(conv({ hans: '请提供G16已提报侵权的页面名称', hant: '請提供G16已提報侵權的頁面名稱' }));
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);

	params.logpage = 'Wikipedia:頁面存廢討論/疑似侵權';

	Morebits.wiki.addCheckpoint();
	// Updating data for the action completed event
	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = conv({ hans: '提报完成，将在几秒内刷新页面', hant: '提報完成，將在幾秒內重新整理頁面' });

	// Tagging file
	var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '加入侵权模板到页面', hant: '加入侵權模板到頁面' }));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.copyvio.callbacks.tryTagging);

	Morebits.wiki.removeCheckpoint();
};

Twinkle.addInitCallback(Twinkle.copyvio, 'copyvio');
})();


// </nowiki>
