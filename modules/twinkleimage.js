// <nowiki>


(function($) { // eslint-disable-line no-unused-vars


/*
 ****************************************
 *** twinkleimage.js: Image CSD module
 ****************************************
 * Mode of invocation:     Tab ("DI")
 * Active on:              Local nonredirect file pages (not on Commons)
 */

Twinkle.image = function twinkleimage() {
	if (mw.config.get('wgNamespaceNumber') === 6 &&
			!document.getElementById('mw-sharedupload') &&
			document.getElementById('mw-imagepage-section-filehistory')) {

		Twinkle.addPortletLink(Twinkle.image.callback, wgULS('图权', '圖權'), 'tw-di', wgULS('提交文件快速删除', '提交檔案快速刪除'));
	}
};

Twinkle.image.callback = function twinkleimageCallback() {
	var Window = new Morebits.simpleWindow(600, 330);
	Window.setTitle(wgULS('文件快速删除候选', '檔案快速刪除候選'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(wgULS('快速删除方针', '快速刪除方針'), 'WP:CSD');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#image');

	var form = new Morebits.quickForm(Twinkle.image.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: wgULS('通知上传者', '通知上傳者'),
				value: 'notify',
				name: 'notify',
				tooltip: wgULS('如果您在标记同一用户的很多文件，请取消此复选框以避免使用户对话页过载。CSD F6永远不会通知。', '如果您在標記同一用戶的很多檔案，請取消此複選框以避免使用戶對話頁過載。CSD F6永遠不會通知。'),
				checked: Twinkle.getPref('notifyUserOnDeli')
			}
		]
	}
	);
	var field = form.append({
		type: 'field',
		label: wgULS('需要的动作', '需要的動作')
	});
	field.append({
		type: 'radio',
		name: 'type',
		list: [
			{
				label: wgULS('来源不明（CSD F3）', '來源不明（CSD F3）'),
				value: 'no source',
				checked: true,
				tooltip: wgULS('本档案并未注明原始出处', '本檔案並未注明原始出處')
			},
			{
				label: wgULS('未知版权或版权无法被查证（CSD F4）', '未知版權或版權無法被查證（CSD F4）'),
				value: 'no license',
				tooltip: wgULS('本档案缺少版权信息，或声称的版权信息无法予以查证', '本檔案缺少版權資訊，或聲稱的版權資訊無法予以查證')
			},
			{
				label: wgULS('来源不明（CSD F3）且未知版权或版权无法被查证（CSD F4）', '來源不明（CSD F3）且未知版權或版權無法被查證（CSD F4）'),
				value: 'no source no license',
				tooltip: wgULS('本档案并未注明原始出处，且本档案缺少版权信息或声称的版权信息无法予以查证', '本檔案並未注明原始出處，且本檔案缺少版權資訊或聲稱的版權資訊無法予以查證')
			},
			{
				label: wgULS('没有被条目使用的非自由版权文件（CSD F6）', '沒有被條目使用的非自由版權檔案（CSD F6）'),
				value: 'orphaned fair use',
				tooltip: wgULS('本文件为非自由版权且没有被条目使用', '本檔案為非自由版權且沒有被條目使用')
			},
			{
				label: wgULS('明显侵权之文件（CSD F8）', '明顯侵權之檔案（CSD F8）'),
				value: 'no permission',
				tooltip: wgULS('上传者宣称拥有，而在其他来源找到的文件。或从侵权的来源取得的文件。', '上傳者宣稱擁有，而在其他來源找到的檔案。或從侵權的來源取得的檔案。'),
				subgroup: {
					name: 'f8_source',
					type: 'textarea',
					label: wgULS('侵权来源：', '侵權來源：')
				}
			}
		]
	});
	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// We must init the parameters
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.type[0].dispatchEvent(evt);
};

Twinkle.image.callback.evaluate = function twinkleimageCallbackEvaluate(event) {
	var type;

	var notify = event.target.notify.checked;
	var types = event.target.type;
	for (var i = 0; i < types.length; ++i) {
		if (types[i].checked) {
			type = types[i].values;
			break;
		}
	}

	var csdcrit;
	switch (type) {
		case 'no source':
			csdcrit = 'f3';
			break;
		case 'no license':
			csdcrit = 'f4';
			break;
		case 'no source no license':
			csdcrit = 'f3 f4';
			break;
		case 'orphaned fair use':
			csdcrit = 'f6';
			notify = false;
			break;
		case 'no permission':
			csdcrit = 'f8';
			break;
		default:
			throw new Error('Twinkle.image.callback.evaluate：未知条款');
	}

	var lognomination = Twinkle.getPref('logSpeedyNominations') && Twinkle.getPref('noLogOnSpeedyNomination').indexOf(csdcrit.toLowerCase()) === -1;
	var templatename = type;

	var params = {
		'type': type,
		'templatename': templatename,
		'normalized': csdcrit,
		'lognomination': lognomination
	};
	if (csdcrit === 'f8') {
		params.f8_source = event.target['type.f8_source'].value;
	}
	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(event.target);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = wgULS('标记完成', '標記完成');

	// Tagging image
	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS('添加删除标记', '加入刪除標記'));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.image.callbacks.taggingImage);

	// Notifying uploader
	if (notify) {
		wikipedia_page.lookupCreator(Twinkle.image.callbacks.userNotification);
	} else {
		// add to CSD log if desired
		if (lognomination) {
			params.fromDI = true;
			Twinkle.speedy.callbacks.user.addToLog(params, null);
		}
		// No auto-notification, display what was going to be added.
		if (type !== 'orphaned fair use') {
			var noteData = document.createElement('pre');
			noteData.appendChild(document.createTextNode('{{subst:Uploadvionotice|' + Morebits.pageNameNorm + '}}--~~~~'));
			Morebits.status.info('提示', wgULS([ '这些内容应贴进上传者对话页：', document.createElement('br'), noteData ], [ '這些內容應貼進上傳者對話頁：', document.createElement('br'), noteData ]));
		}
	}
};

Twinkle.image.callbacks = {
	taggingImage: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
		text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
		// Adding discussion
		if (params.type !== 'orphaned fair use') {
			var wikipedia_page = new Morebits.wiki.page('Wikipedia:檔案存廢討論/無版權訊息或檔案來源', wgULS('添加快速删除记录项', '加入快速刪除記錄項'));
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.image.callbacks.imageList);
		}

		var tag = '';
		switch (params.type) {
			case 'orphaned fair use':
				tag = '{{subst:orphaned fair use}}\n';
				break;
			case 'no permission':
				tag = '{{subst:' + params.templatename + '/auto|1=' + params.f8_source.replace(/http/g, '&#104;ttp').replace(/\n+/g, '\n').replace(/^\s*([^*])/gm, '* $1').replace(/^\* $/m, '') + '}}\n';
				break;
			default:
				tag = '{{subst:' + params.templatename + '/auto}}\n';
				break;
		}

		var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
		if (text !== textNoSd && confirm(wgULS('在页面上找到快速删除模板，要移除吗？', '在頁面上找到快速刪除模板，要移除嗎？'))) {
			text = textNoSd;
		}

		pageobj.setPageText(tag + text);

		var editSummary = wgULS('请求快速删除（', '請求快速刪除（');
		if (params.normalized === 'f3 f4') {
			editSummary += '[[WP:CSD#F3|CSD F3]]+[[WP:CSD#F4|CSD F4]]';
		} else {
			editSummary += '[[WP:CSD#' + params.normalized.toUpperCase() + '|CSD ' + params.normalized.toUpperCase() + ']]';
		}
		editSummary += '）：' + params.type + Twinkle.getPref('summaryAd');
		pageobj.setEditSummary(editSummary);
		pageobj.setTags(Twinkle.getPref('revisionTags'));

		switch (Twinkle.getPref('deliWatchPage')) {
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
		pageobj.setCreateOption('nocreate');
		pageobj.save();
	},
	userNotification: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();

		// disallow warning yourself
		if (initialContrib === mw.config.get('wgUserName')) {
			pageobj.getStatusElement().warn(wgULS('您（' + initialContrib + '）创建了该页，跳过通知', '您（' + initialContrib + '）建立了該頁，跳過通知'));
		} else {
			var talkPageName = 'User talk:' + initialContrib;
			Morebits.wiki.flow.check(talkPageName, function () {
				var flowpage = new Morebits.wiki.flow(talkPageName, wgULS('通知上传者(', '通知上傳者(') + initialContrib + ')');
				flowpage.setTopic(wgULS('请补充文件[[:', '請補充檔案[[:') + Morebits.pageNameNorm + wgULS(']]的版权或来源信息', ']]的版權或來源資訊'));
				flowpage.setContent('{{subst:Uploadvionotice|' + Morebits.pageNameNorm + '|flow=yes}}');
				flowpage.newTopic();
			}, function () {
				var usertalkpage = new Morebits.wiki.page(talkPageName, wgULS('通知上传者(', '通知上傳者(') + initialContrib + ')');
				var notifytext = '\n{{subst:Uploadvionotice|' + Morebits.pageNameNorm + '}}--~~~~';
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary(wgULS('通知：文件[[', '通知：檔案[[') + Morebits.pageNameNorm + wgULS(']]快速删除提名', ']]快速刪除提名') + Twinkle.getPref('summaryAd'));
				usertalkpage.setTags(Twinkle.getPref('revisionTags'));
				usertalkpage.setCreateOption('recreate');
				switch (Twinkle.getPref('deliWatchUser')) {
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

		// add this nomination to the user's userspace log, if the user has enabled it
		if (params.lognomination) {
			params.fromDI = true;
			Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
		}
	},
	imageList: function(pageobj) {
		var text = pageobj.getPageText();
		// var params = pageobj.getCallbackParameters();

		pageobj.setPageText(text + '\n* [[:' + Morebits.pageNameNorm + ']]--~~~~');
		pageobj.setEditSummary(wgULS('添加[[', '加入[[') + Morebits.pageNameNorm + ']]。' + Twinkle.getPref('summaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}

};
})(jQuery);


// </nowiki>
