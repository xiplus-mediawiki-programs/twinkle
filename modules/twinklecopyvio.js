// <nowiki>


(function($) { // eslint-disable-line no-unused-vars


/*
 ****************************************
 *** twinklecopyvio.js: Copyvio module
 ****************************************
 * Mode of invocation:     Tab ("Copyvio")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.copyvio = function twinklecopyvio() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect())))) {
		return;
	}
	if (mw.config.get('wgPageContentModel') === 'flow-board') {
		return;
	}
	Twinkle.addPortletLink(Twinkle.copyvio.callback, wgULS('侵权', '侵權'), 'tw-copyvio', wgULS('提报侵权页面', '提報侵權頁面'), '');
};

Twinkle.copyvio.callback = function twinklecopyvioCallback() {
	var Window = new Morebits.simpleWindow(600, 350);
	Window.setTitle(wgULS('提报侵权页面', '提報侵權頁面'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(wgULS('常见错误', '常見錯誤'), 'Wikipedia:管理员错误自查表/侵权处理');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#copyvio');

	var form = new Morebits.quickForm(Twinkle.copyvio.callback.evaluate);
	form.append({
		type: 'textarea',
		label: wgULS('侵权来源：', '侵權來源：'),
		name: 'source'
	}
	);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: wgULS('通知页面创建者', '通知頁面建立者'),
				value: 'notify',
				name: 'notify',
				tooltip: wgULS('在页面创建者对话页上放置一通知模板。', '在頁面建立者對話頁上放置一通知模板。'),
				checked: true
			}
		]
	}
	);
	if (mw.config.get('wgNamespaceNumber') === 118) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: wgULS('同时标记CSD G16', '同時標記CSD G16'),
					value: 'csd',
					name: 'csd',
					tooltip: wgULS('G16: 因为主页面侵权而创建的临时页面仍然侵权', 'G16: 因為主頁面侵權而建立的臨時頁面仍然侵權'),
					checked: Twinkle.getPref('markDraftCopyvioWithCSD')
				}
			]
		}
		);
	}
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
			var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
			wikipedia_page.setCallbackParameters(pageobj.getCallbackParameters());
			wikipedia_page.lookupCreator(Twinkle.copyvio.callbacks.main);
		} else {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS('页面已经标记侵权，请人工确认是否已经提报。', '頁面已經標記侵權，請人工確認是否已經提報。'));
		}
	},
	main: function(pageobj) {
		// this is coming in from lookupCreator...!
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();

		// Adding discussion
		var wikipedia_page = new Morebits.wiki.page(params.logpage, wgULS('添加侵权记录项', '加入侵權記錄項'));
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.copyvio.callbacks.copyvioList);

		// Notification to first contributor
		if (params.usertalk) {
			Morebits.wiki.flow.check('User talk:' + initialContrib, function () {
				var flowpage = new Morebits.wiki.flow('User talk:' + initialContrib, wgULS('通知页面创建者（' + initialContrib + '）', '通知頁面建立者（' + initialContrib + '）'));
				var topic = '您建立的页面[[' + mw.config.get('wgPageName') + ']]可能侵犯版权';
				var content = '{{subst:CopyvioNotice|' + mw.config.get('wgPageName') + '|flow=yes}}';
				flowpage.setTopic(topic);
				flowpage.setContent(content);
				flowpage.newTopic();
			}, function () {
				var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, wgULS('通知页面创建者（' + initialContrib + '）', '通知頁面建立者（' + initialContrib + '）'));
				var notifytext = '\n{{subst:CopyvioNotice|' + mw.config.get('wgPageName') + '}}';
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary('通知：页面[[' + mw.config.get('wgPageName') + ']]疑似侵犯版权' + Twinkle.getPref('summaryAd'));
				usertalkpage.setTags(Twinkle.getPref('revisionTags'));
				usertalkpage.setCreateOption('recreate');
				switch (Twinkle.getPref('copyvioWatchUser')) {
					case 'yes':
						usertalkpage.setWatchlist(true);
						break;
					case 'no':
						usertalkpage.setWatchlistFromPreferences(false);
						break;
					default:
						usertalkpage.setWatchlistFromPreferences(true);
						break;
				}
				usertalkpage.setFollowRedirect(true);
				usertalkpage.append();
			});
		}
	},
	taggingArticle: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var tag = '{{subst:Copyvio/auto|url=' + params.source.replace(/http/g, '&#104;ttp').replace(/\n+/g, '\n').replace(/^\s*([^*])/gm, '* $1').replace(/^\* $/m, '') + '|OldRevision=' + mw.config.get('wgRevisionId') + '}}';
		var text = pageobj.getPageText();
		var oldcsd = text.match(/\{\{\s*(db(-\w*)?|d|delete)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}/i);
		if (oldcsd && confirm(wgULS('在页面上找到快速删除模板，要保留吗？\n\n当页面同时侵犯版权又符合快速删除标准时，应该优先走快速删除程序。\n点击“确认”以保留快速删除模板，若您认为快速删除理由不合，点击“取消”以移除快速删除模板。', '在頁面上找到快速刪除模板，要保留嗎？\n\n當頁面同時侵犯版權又符合快速刪除標準時，應該優先走快速刪除程序。\n點擊「確認」以保留快速刪除模板，若您認為快速刪除理由不合，點擊「取消」以移除快速刪除模板。'))) {
			tag = oldcsd[0] + '\n' + tag;
		}
		if (params.csd) {
			tag = '{{D|G16}}\n' + tag;
		}

		pageobj.setPageText(tag);
		pageobj.setEditSummary(wgULS('本页面疑似侵犯版权', '本頁面疑似侵犯版權') + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		switch (Twinkle.getPref('copyvioWatchPage')) {
			case 'yes':
				pageobj.setWatchlist(true);
				break;
			case 'no':
				pageobj.setWatchlistFromPreferences(false);
				break;
			default:
				pageobj.setWatchlistFromPreferences(true);
				break;
		}
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
		pageobj.setEditSummary(wgULS('添加[[', '加入[[') + mw.config.get('wgPageName') + ']]' + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};


Twinkle.copyvio.callback.evaluate = function(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!

	var source = e.target.source.value;
	var usertalk = e.target.notify.checked;
	var csd = false;
	if (mw.config.get('wgNamespaceNumber') === 118) {
		csd = e.target.csd.checked;
	}

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(e.target);

	if (!source.trim()) {
		Morebits.status.error(wgULS('错误', '錯誤'), wgULS('未指定侵权来源', '未指定侵權來源'));
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params; // eslint-disable-line no-unused-vars
	logpage = 'Wikipedia:頁面存廢討論/疑似侵權';
	params = { source: source, logpage: logpage, usertalk: usertalk, csd: csd};

	Morebits.wiki.addCheckpoint();
	// Updating data for the action completed event
	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = wgULS('提报完成，将在几秒内刷新', '提報完成，將在幾秒內重新整理');

	// Tagging file
	wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS('添加侵权模板到页面', '加入侵權模板到頁面'));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.copyvio.callbacks.tryTagging);

	Morebits.wiki.removeCheckpoint();
};
})(jQuery);


// </nowiki>
