// <nowiki>


(function() { // eslint-disable-line no-unused-vars


/*
 ****************************************
 *** twinkleimage.js: Image CSD module
 ****************************************
 * Mode of invocation:     Tab ("DI")
 * Active on:              Local nonredirect file pages (not on Commons)
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.image = function twinkleimage() {
	if (mw.config.get('wgNamespaceNumber') === 6 &&
			!document.getElementById('mw-sharedupload') &&
			document.getElementById('mw-imagepage-section-filehistory')) {

		Twinkle.addPortletLink(Twinkle.image.callback, conv({ hans: '图权', hant: '圖權' }), 'tw-di', conv({ hans: '提交文件快速删除', hant: '提交檔案快速刪除' }));
	}
};

Twinkle.image.callback = function twinkleimageCallback() {
	var Window = new Morebits.SimpleWindow(600, 330);
	Window.setTitle(conv({ hans: '文件快速删除候选', hant: '檔案快速刪除候選' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(conv({ hans: '快速删除方针', hant: '快速刪除方針' }), 'WP:CSD');
	Window.addFooterLink(conv({ hans: '图权设置', hant: '圖權設定' }), 'WP:TW/PREF#image');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'WP:TW/DOC#image');

	var form = new Morebits.QuickForm(Twinkle.image.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: conv({ hans: '通知上传者', hant: '通知上傳者' }),
				value: 'notify',
				name: 'notify',
				tooltip: conv({ hans: '如果您在标记同一用户的很多文件，请取消此复选框以避免发送过多消息。CSD F6永远不会通知。', hant: '如果您在標記同一使用者的很多檔案，請取消此核取方塊以避免發送過多訊息。CSD F6永遠不會通知。' }),
				checked: Twinkle.getPref('notifyUserOnDeli')
			}
		]
	}
	);
	var field = form.append({
		type: 'field',
		label: conv({ hans: '需要的动作', hant: '需要的動作' })
	});
	field.append({
		type: 'radio',
		name: 'type',
		list: [
			{
				label: conv({ hans: '来源不明（CSD F3）', hant: '來源不明（CSD F3）' }),
				value: 'no source',
				checked: true,
				tooltip: conv({ hans: '本文件并未注明原始出处', hant: '本檔案並未註明原始出處' })
			},
			{
				label: conv({ hans: '未知著作权或著作权无法被查证（CSD F4）', hant: '未知著作權或著作權無法被查證（CSD F4）' }),
				value: 'no license',
				tooltip: conv({ hans: '本文件缺少著作权信息，或声称的著作权信息无法被查证', hant: '本檔案缺少著作權資訊，或聲稱的著作權資訊無法被查證' })
			},
			{
				label: conv({ hans: '来源不明（CSD F3）且未知著作权或著作权无法被查证（CSD F4）', hant: '來源不明（CSD F3）且未知著作權或著作權無法被查證（CSD F4）' }),
				value: 'no source no license',
				tooltip: conv({ hans: '本文件并未注明原始出处，且本文件缺少著作权信息或声称的著作权信息无法被查证', hant: '本檔案並未註明原始出處，且本檔案缺少著作權資訊或聲稱的著作權資訊無法被查證' })
			},
			{
				label: conv({ hans: '没有被条目使用的非自由著作权文件（CSD F6）', hant: '沒有被條目使用的非自由著作權檔案（CSD F6）' }),
				value: 'orphaned fair use',
				tooltip: conv({ hans: '本文件为非自由著作权且没有被条目使用', hant: '本檔案為非自由著作權且沒有被條目使用' })
			},
			{
				label: conv({ hans: '明显侵权之文件（CSD F8）', hant: '明顯侵權之檔案（CSD F8）' }),
				value: 'no permission',
				tooltip: conv({ hans: '上传者宣称拥有，而在其他来源找到的文件。或从侵权的来源获取的文件。', hant: '上傳者宣稱擁有，而在其他來源找到的檔案。或從侵權的來源取得的檔案。' }),
				subgroup: {
					name: 'f8_source',
					type: 'textarea',
					label: conv({ hans: '侵权来源：', hant: '侵權來源：' })
				}
			},
			{
				label: conv({ hans: '没有填写任何合理使用依据的非自由著作权文件（CSD F9）', hant: '沒有填寫任何合理使用依據的非自由著作權檔案（CSD F9）' }),
				value: 'no fair use rationale',
				tooltip: conv({ hans: '不适用于有争议但完整的合理使用依据。如果非自由著作权文件只有部分条目的使用依据，但同时被使用于未提供合理使用依据的条目，则本方针也不适用。', hant: '不適用於有爭議但完整的合理使用依據。如果非自由著作權檔案只有部分條目的使用依據，但同時被使用於未提供合理使用依據的條目，則本方針也不適用。' })
			},
			{
				label: conv({ hans: '可被替代的非自由著作权文件（CSD F10）', hant: '可被替代的非自由著作權檔案（CSD F10）' }),
				value: 'replaceable fair use',
				tooltip: conv({ hans: '文件仅用于描述、识别或评论文件中展示的事物，或仅用作插图，且满足以下四个条件之一。如果给出了其他合理使用依据，不适用本条。如对文件的可替代性存在争议，应交文件存废讨论处理。本条也不适用于正在或曾经由文件存废讨论处理过的文件。', hant: '檔案僅用於描述、辨識或評論檔案中展示的事物，或僅用作插圖，且滿足以下四個條件之一。如果給出了其他合理使用依據，不適用本條。如對檔案的可替代性存在爭議，應交檔案存廢討論處理。本條也不適用於正在或曾經由檔案存廢討論處理過的檔案。' }),
				subgroup: {
					name: 'f10_type',
					type: 'select',
					label: conv({ hans: '适用类型：', hant: '適用類別：' }),
					style: 'width: 85%;',
					list: [
						{ label: conv({ hans: '请选择', hant: '請選擇' }), value: '' },
						{ label: conv({ hans: '有其他自由著作权文件展示相同的事物', hant: '有其他自由著作權檔案展示相同的事物' }), value: '1' },
						{ label: conv({ hans: '文件描述的是在世或假定在世人物、仍然存在的建筑、室外雕塑或仍然在售的商品，且预计自行拍摄的照片不受他人著作权保护', hant: '檔案描述的是在世或假定在世人物、仍然存在的建築、室外雕塑或仍然在售的商品，且預計自行拍攝的相片不受他人著作權保護' }), value: '2' },
						{ label: conv({ hans: '文件为可自行绘制的地图或图表', hant: '檔案為可自行繪製的地圖或圖表' }), value: '3' },
						{ label: conv({ hans: '文件来自商业图片机构（如Getty）', hant: '檔案來自商業圖片機構（如Getty）' }), value: '4' }
					]
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
		case 'no fair use rationale':
			csdcrit = 'f9';
			break;
		case 'replaceable fair use':
			csdcrit = 'f10';
			break;
		default:
			throw new Error('Twinkle.image.callback.evaluate：未知条款');
	}

	var lognomination = Twinkle.getPref('logSpeedyNominations') && Twinkle.getPref('noLogOnSpeedyNomination').indexOf(csdcrit.toLowerCase()) === -1;
	var templatename = type;

	var params = {
		type: type,
		templatename: templatename,
		normalized: csdcrit,
		lognomination: lognomination
	};
	if (csdcrit === 'f8') {
		params.f8_source = event.target['type.f8_source'].value;
	}
	if (csdcrit === 'f10') {
		var f10_type = event.target['type.f10_type'].value;
		if (!f10_type) {
			alert(conv({ hans: 'CSD F10：请选择适用类型。', hant: 'CSD F10：請選擇適用類別。' }));
			return false;
		}
		params.f10_type = f10_type;
	}
	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(event.target);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = conv({ hans: '标记完成', hant: '標記完成' });

	// Tagging image
	var wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), conv({ hans: '加入删除标记', hant: '加入刪除標記' }));
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.image.callbacks.taggingImage);

	// Notifying uploader
	if (notify) {
		wikipedia_page.lookupCreation(Twinkle.image.callbacks.userNotification);
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
			Morebits.Status.info('提示', [conv({ hans: '这些内容应贴进上传者对话页：', hant: '這些內容應貼進上傳者討論頁：' }), document.createElement('br'), noteData]);
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
			var wikipedia_page = new Morebits.wiki.Page('Wikipedia:檔案存廢討論/快速刪除提報', conv({ hans: '加入快速删除记录项', hant: '加入快速刪除記錄項' }));
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
			case 'replaceable fair use':
				tag = '{{subst:' + params.templatename + '/auto|1=' + params.f10_type + '}}\n';
				break;
			default:
				tag = '{{subst:' + params.templatename + '/auto}}\n';
				break;
		}

		var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
		if (text !== textNoSd && confirm(conv({ hans: '在页面上找到快速删除模板，要移除吗？', hant: '在頁面上找到快速刪除模板，要移除嗎？' }))) {
			text = textNoSd;
		}

		pageobj.setPageText(tag + text);

		var editSummary = conv({ hans: '请求快速删除（', hant: '請求快速刪除（' });
		if (params.normalized === 'f3 f4') {
			editSummary += '[[WP:CSD#F3|CSD F3]]+[[WP:CSD#F4|CSD F4]]';
		} else {
			editSummary += '[[WP:CSD#' + params.normalized.toUpperCase() + '|CSD ' + params.normalized.toUpperCase() + ']]';
		}
		editSummary += '）';
		pageobj.setEditSummary(editSummary);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('deliWatchPage'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();
	},
	userNotification: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();

		// disallow warning yourself
		if (initialContrib === mw.config.get('wgUserName')) {
			pageobj.getStatusElement().warn('您（' + initialContrib + conv({ hans: '）创建了该页，跳过通知', hant: '）建立了該頁，跳過通知' }));
		} else {
			var talkPageName = 'User talk:' + initialContrib;
			Morebits.wiki.flow.check(talkPageName, function () {
				var flowpage = new Morebits.wiki.flow(talkPageName, conv({ hans: '通知上传者（', hant: '通知上傳者（' }) + initialContrib + '）');
				flowpage.setTopic(conv({ hans: '文件[[', hant: '檔案[[' }) + Morebits.pageNameNorm + conv({ hans: ']]的快速删除通知', hant: ']]的快速刪除通知' }));
				flowpage.setContent('{{subst:Di-' + params.templatename + '-notice|1=' + Morebits.pageNameNorm + '}}');
				flowpage.newTopic();
			}, function () {
				var usertalkpage = new Morebits.wiki.Page(talkPageName, conv({ hans: '通知上传者（', hant: '通知上傳者（' }) + initialContrib + '）');
				var notifytext = '\n{{subst:Di-' + params.templatename + '-notice|1=' + Morebits.pageNameNorm + '}}--~~~~';
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary(conv({ hans: '通知：文件[[', hant: '通知：檔案[[' }) + Morebits.pageNameNorm + conv({ hans: ']]快速删除提名', hant: ']]快速刪除提名' }));
				usertalkpage.setChangeTags(Twinkle.changeTags);
				usertalkpage.setCreateOption('recreate');
				usertalkpage.setWatchlist(Twinkle.getPref('deliWatchUser'));
				usertalkpage.setFollowRedirect(true, false);
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
		pageobj.setEditSummary('加入[[' + Morebits.pageNameNorm + ']]');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}

};

Twinkle.addInitCallback(Twinkle.image, 'image');
})();


// </nowiki>
