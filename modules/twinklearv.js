// <nowiki>


(function($) {


/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

Twinkle.arv = function twinklearv() {
	var username = Morebits.wiki.flow.relevantUserName(true);
	if (!username) {
		return;
	}

	var title = mw.util.isIPAddress(username) ? wgULS('报告IP给管理员', '報告IP給管理員') : wgULS('报告用户给管理人员', '報告使用者給管理人員');

	Twinkle.addPortletLink(function() {
		Twinkle.arv.callback(username);
	}, wgULS('告状', '告狀'), 'tw-arv', title);
};

Twinkle.arv.callback = function (uid) {
	if (uid === mw.config.get('wgUserName')) {
		alert(wgULS('你不想报告你自己，对吧？', '你不想報告你自己，對吧？'));
		return;
	}

	var Window = new Morebits.simpleWindow(600, 500);
	Window.setTitle(wgULS('报告用户给管理人员', '報告用戶給管理人員'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink('VIP', 'WP:VIP');
	Window.addFooterLink('UAA', 'WP:UAA');
	Window.addFooterLink(wgULS('用户名方针', '使用者名稱方針'), 'WP:U');
	Window.addFooterLink('SRCU', 'WP:SRCU');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'H:TW#告狀');

	var form = new Morebits.quickForm(Twinkle.arv.callback.evaluate);
	var categories = form.append({
		type: 'select',
		name: 'category',
		label: wgULS('选择报告类型：', '選擇報告類型：'),
		event: Twinkle.arv.callback.changeCategory
	});
	categories.append({
		type: 'option',
		label: wgULS('破坏（WP:VIP）', '破壞（WP:VIP）'),
		value: 'aiv'
	});
	categories.append({
		type: 'option',
		label: wgULS('用户名（WP:UAA）', '用戶名（WP:UAA）'),
		value: 'username',
		disabled: mw.util.isIPAddress(uid)
	});
	categories.append({
		type: 'option',
		label: wgULS('用户查核协助请求 - 主账户（WP:RFCUHAM）', '用戶查核協助請求 - 主帳戶（WP:RFCUHAM）'),
		value: 'sock'
	});
	categories.append({
		type: 'option',
		label: wgULS('用户查核协助请求 - 傀儡（WP:RFCUHAM）', '用戶查核協助請求 - 傀儡（WP:RFCUHAM）'),
		value: 'puppet'
	});
	form.append({
		type: 'field',
		label: 'Work area',
		name: 'work_area'
	});
	form.append({ type: 'submit', label: '提交' });
	form.append({
		type: 'hidden',
		name: 'uid',
		value: uid
	});

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// We must init the
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.category.dispatchEvent(evt);
};

Twinkle.arv.callback.changeCategory = function (e) {
	var value = e.target.value;
	var root = e.target.form;
	var old_area = Morebits.quickForm.getElements(root, 'work_area')[0];
	var work_area = null;

	switch (value) {
		case 'aiv':
		/* falls through */
		default:
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: wgULS('报告用户破坏', '報告用戶破壞'),
				name: 'work_area'
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: wgULS('相关页面：', '相關頁面：'),
				tooltip: wgULS('如不希望让报告链接到页面，请留空', '如不希望讓報告連結到頁面，請留空'),
				value: mw.util.getParamValue('vanarticle') || '',
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					if (value === '') {
						root.badid.disabled = root.goodid.disabled = true;
					} else {
						root.badid.disabled = false;
						root.goodid.disabled = root.badid.value === '';
					}
				}
			});
			work_area.append({
				type: 'input',
				name: 'badid',
				label: wgULS('受到破坏的修订版本：', '受到破壞的修訂版本：'),
				tooltip: wgULS('留空以略过差异', '留空以略過差異'),
				value: mw.util.getParamValue('vanarticlerevid') || '',
				disabled: !mw.util.getParamValue('vanarticle'),
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					root.goodid.disabled = value === '';
				}
			});
			work_area.append({
				type: 'input',
				name: 'goodid',
				label: wgULS('破坏前的修订版本：', '破壞前的修訂版本：'),
				tooltip: wgULS('留空以略过差异的较早版本', '留空以略過差異的較早版本'),
				value: mw.util.getParamValue('vanarticlegoodrevid') || '',
				disabled: !mw.util.getParamValue('vanarticle') || mw.util.getParamValue('vanarticlerevid')
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: wgULS('已发出最后（层级4或4im）警告', '已發出最後（層級4或4im）警告'),
						value: 'final'
					},
					{
						label: wgULS('封禁过期后随即破坏', '封禁過期後隨即破壞'),
						value: 'postblock'
					},
					{
						label: wgULS('显而易见的纯破坏用户', '顯而易見的純破壞用戶'),
						value: 'vandalonly',
						disabled: mw.util.isIPAddress(root.uid.value)
					},
					{
						label: wgULS('显而易见的spambot或失窃账户', '顯而易見的spambot或失竊帳戶'),
						value: 'spambot'
					},
					{
						label: wgULS('仅用来散发广告宣传的用户', '僅用來散發廣告宣傳的用戶'),
						value: 'promoonly',
						disabled: mw.util.isIPAddress(root.uid.value)
					}
				]
			});
			if (!mw.util.isIPAddress(Morebits.wiki.flow.relevantUserName(true))) {
				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: wgULS('在页面上及编辑摘要隐藏用户名', '在頁面上及編輯摘要隱藏用戶名'),
							tooltip: wgULS('若用户名不当请勾选此项，注意：请考虑私下联系管理员处理。', '若用戶名不當請勾選此項，注意：請考慮私下聯絡管理員處理。'),
							name: 'hidename',
							value: 'hidename'
						}
					]
				});
			}
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: wgULS('评论：', '評論：')
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'username':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: wgULS('报告不当用户名', '報告不當用戶名'),
				name: 'work_area'
			});
			work_area.append({
				type: 'header',
				label: wgULS('不当用户名类别', '不當用戶名類別'),
				tooltip: wgULS('维基百科不允许使用带有误导性、宣传性、侮辱性或破坏性的用户名。此外，使用域名及邮箱地址的用户名亦被禁止。这些准则俱应应用至用户名及签名。在其他语言中不当的用户名或通过错拼、替代、暗示、拆字或任何间接方法达成的非妥当用户名同样视为违规。',
					'維基百科不允許使用帶有誤導性、宣傳性、侮辱性或破壞性的用戶名。此外，使用域名及電郵地址的用戶名亦被禁止。這些準則俱應應用至用戶名及簽名。在其他語言中不當的用戶名或通過錯拼、替代、暗示、拆字或任何間接方法達成的非妥當用戶名同樣視為違規。')
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: wgULS('误导性用户名', '誤導性用戶名'),
						value: wgULS('误导性', '誤導性'),
						tooltip: wgULS('误导性用户名隐含着与贡献者相关或误导他人的事情。例如︰不实观点、暗示账户拥有特定权限或暗示该账户并非由一人拥有而是由一个组群、一个计划或一个集体运作。',
							'誤導性用戶名隱含著與貢獻者相關或誤導他人的事情。例如︰不實觀點、暗示帳戶擁有特定權限或暗示該帳戶並非由一人擁有而是由一個組群、一個計劃或一個集體運作。')
					},
					{
						label: wgULS('宣传性用户名', '宣傳性用戶名'),
						value: wgULS('宣传性', '宣傳性'),
						tooltip: wgULS('宣传性用户名会于维基百科上起推销一个组织或一家公司的作用。', '宣傳性用戶名會於維基百科上起推銷一個組織或一間公司的作用。')
					},
					{
						label: wgULS('暗示并非由一人拥有', '暗示並非由一人擁有'),
						value: 'shared',
						tooltip: wgULS('每个维基账户只可以代表个人（个别特例除外），所有与他人分享账户的行为，包括分享账户密码均被禁止。', '每個維基帳戶只可以代表個人（個別特例除外），所有與他人分享帳戶的行為，包括分享帳戶密碼均被禁止。')
					},
					{
						label: wgULS('侮辱性用户名', '侮辱性用戶名'),
						value: '侮辱性',
						tooltip: wgULS('侮辱性用户名令到协调编辑变得困难，甚至无可能。', '侮辱性用戶名令到協調編輯變得困難，甚至無可能。')
					},
					{
						label: wgULS('破坏性用户名', '破壞性用戶名'),
						value: wgULS('破坏性', '破壞性'),
						tooltip: wgULS('破坏性用户名包括人身攻击、伪冒他人或其他一切有着清晰可见的破坏维基百科意图的用户名。', '破壞性用戶名包括人身攻擊、偽冒他人或其他一切有著清晰可見的破壞維基百科意圖的用戶名。')
					}
				]
			});
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: wgULS('在页面上隐藏用户名（需监督的用户名请勿于站内报告，勾选此项并不构成能在站内报告的理由）', '在頁面上隱藏用戶名（需監督的用戶名請勿於站內報告，勾選此項並不構成能在站內報告的理由）'),
						tooltip: wgULS('若用户名不当请勾选此项，注意：请考虑私下联系管理员处理。', '若用戶名不當請勾選此項，注意：請考慮私下聯絡管理員處理。'),
						name: 'hidename',
						value: 'hidename'
					}
				],
				style: 'font-weight: bold;'
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: wgULS('评论：', '評論：')
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'puppet':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: wgULS('报告疑似主账户', '報告疑似主帳戶'),
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'input',
					name: 'sockmaster',
					label: wgULS('主账户', '主帳戶'),
					tooltip: wgULS('主账户的用户名（不含User:前缀）', '主帳戶的用戶名（不含User:前綴）')
				}
			);
			work_area.append({
				type: 'textarea',
				label: wgULS('证据：', '證據：'),
				name: 'evidence',
				tooltip: wgULS('键入能够用来体现这些用户可能滥用多重账户的证据，这通常包括互助客栈发言、页面历史或其他有关的信息。请避免在此处提供非与傀儡或滥用多重账户相关的其他讨论。', '輸入能夠用來體現這些用戶可能濫用多重帳戶的證據，這通常包括互助客棧發言、頁面歷史或其他有關的資訊。請避免在此處提供非與傀儡或濫用多重帳戶相關的其他討論。')
			});
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: wgULS('通知相关用户', '通知相關用戶'),
						name: 'notify',
						tooltip: wgULS('通知用户不是必须的，在许多情况下（如长期破坏者）通知更可能适得其反。但是，对于涉及新用户的报告而言，通知他们能让报告显得更公平。请使用常识。', '通知用戶不是必須的，在許多情況下（如長期破壞者）通知更可能適得其反。但是，對於涉及新用戶的報告而言，通知他們能讓報告顯得更公平。請使用常識。')
					}
				]
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'sock':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: wgULS('报告疑似傀儡', '報告疑似傀儡'),
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'dyninput',
					name: 'sockpuppet',
					label: '傀儡',
					sublabel: '傀儡：',
					tooltip: wgULS('傀儡的用户名（不含User:前缀）', '傀儡的用戶名（不含User:前綴）'),
					min: 2,
					max: 9
				});
			work_area.append({
				type: 'textarea',
				label: wgULS('证据：', '證據：'),
				name: 'evidence',
				tooltip: wgULS('键入能够用来体现这些用户可能滥用多重账户的证据，这通常包括互助客栈发言、页面历史或其他有关的信息。请避免在此处提供非与傀儡或滥用多重账户相关的其他讨论。', '輸入能夠用來體現這些用戶可能濫用多重帳戶的證據，這通常包括互助客棧發言、頁面歷史或其他有關的資訊。請避免在此處提供非與傀儡或濫用多重帳戶相關的其他討論。')
			});
			work_area.append({
				type: 'checkbox',
				list: [ {
					label: wgULS('通知相关用户', '通知相關用戶'),
					name: 'notify',
					tooltip: wgULS('通知用户不是必须的，在许多情况下（如长期破坏者）通知更可能适得其反。但是，对于涉及新用户的报告而言，通知他们能让报告显得更公平。请使用常识。', '通知用戶不是必須的，在許多情況下（如長期破壞者）通知更可能適得其反。但是，對於涉及新用戶的報告而言，通知他們能讓報告顯得更公平。請使用常識。')
				} ]
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'an3':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Report edit warring',
				name: 'work_area'
			});

			work_area.append({
				type: 'input',
				name: 'page',
				label: 'Page',
				tooltip: 'The page being reported'
			});
			work_area.append({
				type: 'button',
				name: 'load',
				label: 'Load',
				event: function(e) {
					var root = e.target.form;
					var value = root.page.value;
					var uid = root.uid.value;
					var $diffs = $(root).find('[name=diffs]');
					$diffs.find('.entry').remove();

					var date = new Date();
					date.setHours(-36); // all since 36 hours

					var api = new mw.Api();
					api.get({
						action: 'query',
						prop: 'revisions',
						format: 'json',
						rvprop: 'sha1|ids|timestamp|parsedcomment|comment',
						rvlimit: 500,
						rvend: date.toISOString(),
						rvuser: uid,
						indexpageids: true,
						redirects: true,
						titles: value
					}).done(function(data) {
						var pageid = data.query.pageids[0];
						var page = data.query.pages[pageid];
						if (!page.revisions) {
							return;
						}
						for (var i = 0; i < page.revisions.length; ++i) {
							var rev = page.revisions[i];
							var $entry = $('<div/>', {
								'class': 'entry'
							});
							var $input = $('<input/>', {
								'type': 'checkbox',
								'name': 's_diffs',
								'value': rev.revid
							});
							$input.data('revinfo', rev);
							$input.appendTo($entry);
							$entry.append('<span>"' + rev.parsedcomment + '" at <a href="' + mw.config.get('wgScript') + '?diff=' + rev.revid + '">' + moment(rev.timestamp).calendar() + '</a></span>').appendTo($diffs);
						}
					}).fail(function(data) {
						console.log('API failed :(', data); // eslint-disable-line no-console
					});
					var $warnings = $(root).find('[name=warnings]');
					$warnings.find('.entry').remove();

					api.get({
						action: 'query',
						prop: 'revisions',
						format: 'json',
						rvprop: 'sha1|ids|timestamp|parsedcomment|comment',
						rvlimit: 500,
						rvend: date.toISOString(),
						rvuser: mw.config.get('wgUserName'),
						indexpageids: true,
						redirects: true,
						titles: 'User talk:' + uid
					}).done(function(data) {
						var pageid = data.query.pageids[0];
						var page = data.query.pages[pageid];
						if (!page.revisions) {
							return;
						}
						for (var i = 0; i < page.revisions.length; ++i) {
							var rev = page.revisions[i];
							var $entry = $('<div/>', {
								'class': 'entry'
							});
							var $input = $('<input/>', {
								'type': 'checkbox',
								'name': 's_warnings',
								'value': rev.revid
							});
							$input.data('revinfo', rev);
							$input.appendTo($entry);
							$entry.append('<span>"' + rev.parsedcomment + '" at <a href="' + mw.config.get('wgScript') + '?diff=' + rev.revid + '">' + moment(rev.timestamp).calendar() + '</a></span>').appendTo($warnings);
						}
					}).fail(function(data) {
						console.log('API failed :(', data); // eslint-disable-line no-console
					});

					var $resolves = $(root).find('[name=resolves]');
					$resolves.find('.entry').remove();

					var t = new mw.Title(value);
					var ns = t.getNamespaceId();
					var talk_page = new mw.Title(t.getMain(), ns % 2 ? ns : ns + 1).getPrefixedText();

					api.get({
						action: 'query',
						prop: 'revisions',
						format: 'json',
						rvprop: 'sha1|ids|timestamp|parsedcomment|comment',
						rvlimit: 500,
						rvend: date.toISOString(),
						rvuser: mw.config.get('wgUserName'),
						indexpageids: true,
						redirects: true,
						titles: talk_page
					}).done(function(data) {
						var pageid = data.query.pageids[0];
						var page = data.query.pages[pageid];
						if (!page.revisions) {
							return;
						}
						for (var i = 0; i < page.revisions.length; ++i) {
							var rev = page.revisions[i];
							var $entry = $('<div/>', {
								'class': 'entry'
							});
							var $input = $('<input/>', {
								'type': 'checkbox',
								'name': 's_resolves',
								'value': rev.revid
							});
							$input.data('revinfo', rev);
							$input.appendTo($entry);
							$entry.append('<span>"' + rev.parsedcomment + '" at <a href="' + mw.config.get('wgScript') + '?diff=' + rev.revid + '">' + moment(rev.timestamp).calendar() + '</a></span>').appendTo($resolves);
						}

						// add free form input
						var $free_entry = $('<div/>', {
							'class': 'entry'
						});
						var $free_input = $('<input/>', {
							'type': 'text',
							'name': 's_resolves_free'
						});

						var $free_label = $('<label/>', {
							'for': 's_resolves_free',
							'html': 'Diff to additional discussions: '
						});
						$free_entry.append($free_label).append($free_input).appendTo($resolves);

					}).fail(function(data) {
						console.log('API failed :(', data); // eslint-disable-line no-console
					});
				}
			});
			work_area.append({
				type: 'field',
				name: 'diffs',
				label: 'User\'s reverts',
				tooltip: 'Select the edits you believe are reverts'
			});
			work_area.append({
				type: 'field',
				name: 'warnings',
				label: 'Warnings given to subject',
				tooltip: 'You must have warned the subject before reporting'
			});
			work_area.append({
				type: 'field',
				name: 'resolves',
				label: 'Resolution initiatives',
				tooltip: 'You should have tried to resolve the issue on the talk page first'
			});

			work_area.append({
				type: 'textarea',
				label: 'Comment:',
				name: 'comment'
			});

			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
	}
};

Twinkle.arv.callback.evaluate = function(e) {
	var form = e.target;
	var reason = '';
	var comment = '';
	if (form.reason) {
		comment = form.reason.value;
	}
	var uid = form.uid.value;

	var types, header, summary;
	switch (form.category.value) {

		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			types = form.getChecked('arvtype');
			if (!types.length && comment === '') {
				alert(wgULS('您必须指定理由', '您必須指定理由'));
				return;
			}

			header = '\n=== {{vandal|' + (/=/.test(uid) ? '1=' : '') + uid;
			summary = wgULS('报告', '報告') + '[[Special:Contributions/' + uid + '|' + uid + ']]';
			if (form.hidename && form.hidename.checked) {
				header += '|hidename=1';
				summary = wgULS('报告一名用户', '報告一名用戶');
			}
			header += '}} ===\n';

			types = types.map(function(v) {
				switch (v) {
					case 'final':
						return '已发出最后警告';
					case 'postblock':
						return '封禁过期后随即破坏';
					case 'spambot':
						return '显而易见的spambot或失窃账户';
					case 'vandalonly':
						return '显而易见的纯破坏用户';
					case 'promoonly':
						return '仅用来散发广告宣传的用户';
					default:
						return '未知理由';
				}
			}).join('，');


			if (form.page.value !== '') {

				// add a leading : on linked page namespace to prevent transclusion
				reason = '* {{pagelinks|' + (form.page.value.indexOf('=') > -1 ? '1=' : '') + form.page.value + '}}';

				if (form.badid.value !== '') {
					reason += '（{{diff|' + form.page.value + '|' + form.badid.value + '|' + form.goodid.value + '|diff}}）';
				}
				reason += '\n';
			}

			if (types) {
				reason += '* ' + types;
			}
			if (comment !== '') {
				comment = comment.replace(/\r?\n/g, '\n*:');  // indent newlines
				reason += (types ? '。' : '* ') + comment;
			}
			reason = reason.trim();
			if (reason.search(/[.?!;。？！；]$/) === -1) {
				reason += '。';
			}
			reason += '\n* 发现人：~~~~\n* 处理：';

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:当前的破坏';
			Morebits.wiki.actionCompleted.notice = '报告完成';

			var aivPage = new Morebits.wiki.page('Wikipedia:当前的破坏', wgULS('处理VIP请求', '處理VIP請求'));
			aivPage.setFollowRedirect(true);

			aivPage.load(function() {
				var text = aivPage.getPageText();

				// check if user has already been reported
				if (new RegExp('===\\s*\\{\\{\\s*(?:[Vv]andal)\\s*\\|\\s*(?:1=)?\\s*' + RegExp.escape(uid, true) + '\\s*\\}\\}\\s*===').test(text)) {
					aivPage.getStatusElement().error(wgULS('报告已存在，将不会加入新的', '報告已存在，將不會加入新的'));
					Morebits.status.printUserText(reason, wgULS('您键入的评论已在下方提供，您可以将其加入到VIP已存在的小节中：', '您鍵入的評論已在下方提供，您可以將其加入到VIP已存在的小節中：'));
					return;
				}
				aivPage.setPageSection(0);
				aivPage.getStatusElement().status(wgULS('添加新报告…', '加入新報告…'));
				aivPage.setEditSummary(summary + Twinkle.getPref('summaryAd'));
				aivPage.setTags(Twinkle.getPref('revisionTags'));
				aivPage.setAppendText(header + reason);
				aivPage.append();
			});
			break;

		// Report inappropriate username
		case 'username':
			types = form.getChecked('arvtype').map(Morebits.string.toLowerCaseFirstChar);

			var hasShared = types.indexOf('shared') > -1;
			if (hasShared) {
				types.splice(types.indexOf('shared'), 1);
			}

			if (types.indexOf('侮辱性') !== -1) {
				if (!confirm(wgULS('警告：严重的侮辱性用户名和针对特定个人的侮辱性用户名不应在公开页面报告，而是应当私下联系监督员处理。是否继续？',
					'警告：嚴重的侮辱性用戶名和針對特定個人的侮辱性用戶名不應在公開頁面報告，而是應當私下聯繫監督員處理。是否繼續？'))) {
					return;
				}
			}

			if (types.length <= 2) {
				types = types.join('和');
			} else {
				types = [ types.slice(0, -1).join('、'), types.slice(-1) ].join('和');
			}
			reason = '*{{user-uaa|1=' + uid;
			if (form.hidename.checked) {
				reason += '|hidename=1';
			}
			reason += '}} &ndash; ';
			if (types.length) {
				reason += types + wgULS('用户名', '用戶名');
			}
			if (types.length && hasShared) {
				reason += '，';
			}
			if (hasShared) {
				reason += wgULS('暗示该账户并非由一人拥有', '暗示該帳戶並非由一人擁有');
			}
			reason += '。';
			if (comment !== '') {
				reason += Morebits.string.toUpperCaseFirstChar(comment) + '。';
			}
			reason += '--~~~~';
			reason = reason.replace(/\r?\n/g, '\n*:');  // indent newlines

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:需要管理員注意的用戶名';
			Morebits.wiki.actionCompleted.notice = wgULS('报告完成', '報告完成');

			var uaaPage = new Morebits.wiki.page('Wikipedia:需要管理員注意的用戶名', wgULS('处理UAA请求', '處理UAA請求'));
			uaaPage.setFollowRedirect(true);

			uaaPage.load(function() {
				var text = uaaPage.getPageText();

				// check if user has already been reported
				if (new RegExp('\\{\\{\\s*user-uaa\\s*\\|\\s*(1\\s*=\\s*)?' + RegExp.escape(uid, true) + '\\s*(\\||\\})').test(text)) {
					uaaPage.getStatusElement().error(wgULS('用户已被列入。', '用戶已被列入。'));
					Morebits.status.printUserText(reason, wgULS('您键入的评论已在下方提供，您可以将其手工加入UAA上该用户的报告中：', '您輸入的評論已在下方提供，您可以將其手工加入UAA上該用戶的報告中：'));
					return;
				}
				uaaPage.getStatusElement().status(wgULS('添加新报告…', '加入新報告…'));
				uaaPage.setEditSummary(wgULS('新提报', '新提報') + Twinkle.getPref('summaryAd'));
				uaaPage.setTags(Twinkle.getPref('revisionTags'));
				uaaPage.setAppendText('\n' + reason);
				uaaPage.append();
			});
			break;

		// WP:SPI
		case 'sock':
			/* falls through */
		case 'puppet':
			var sockParameters = {
				evidence: form.evidence.value.trim(),
				notify: form.notify.checked
			};

			var puppetReport = form.category.value === 'puppet';
			if (puppetReport && !form.sockmaster.value.trim()) {
				if (!confirm(wgULS('您未对这个傀儡账户输入主账户，您是否希望报告这个账户为傀儡操作者？', '您未對這個傀儡帳戶輸入主帳戶，您是否希望報告這個帳戶為傀儡操作者？'))) {
					return;
				}
				puppetReport = false;
			}

			sockParameters.uid = puppetReport ? form.sockmaster.value.trim() : uid;
			sockParameters.sockpuppets = puppetReport ? [uid] : $.map($('input:text[name=sockpuppet]', form), function(o) {
				return $(o).val() || null;
			});

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);
			Twinkle.arv.processSock(sockParameters);
			break;

		case 'an3':
			var diffs = $.map($('input:checkbox[name=s_diffs]:checked', form), function(o) {
				return $(o).data('revinfo');
			});

			if (diffs.length < 3 && !confirm('You have selected fewer than three offending edits. Do you wish to make the report anyway?')) {
				return;
			}

			var warnings = $.map($('input:checkbox[name=s_warnings]:checked', form), function(o) {
				return $(o).data('revinfo');
			});

			if (!warnings.length && !confirm('You have not selected any edits where you warned the offender. Do you wish to make the report anyway?')) {
				return;
			}

			var resolves = $.map($('input:checkbox[name=s_resolves]:checked', form), function(o) {
				return $(o).data('revinfo');
			});
			var free_resolves = $('input[name=s_resolves_free]').val();

			var an3_next = function(free_resolves) {
				if (!resolves.length && !free_resolves && !confirm('You have not selected any edits where you tried to resolve the issue. Do you wish to make the report anyway?')) {
					return;
				}

				var an3Parameters = {
					'uid': uid,
					'page': form.page.value.trim(),
					'comment': form.comment.value.trim(),
					'diffs': diffs,
					'warnings': warnings,
					'resolves': resolves,
					'free_resolves': free_resolves
				};

				Morebits.simpleWindow.setButtonsEnabled(false);
				Morebits.status.init(form);
				Twinkle.arv.processAN3(an3Parameters);
			};

			if (free_resolves) {
				var oldid = mw.util.getParamValue('oldid', free_resolves);
				var api = new mw.Api();
				api.get({
					action: 'query',
					prop: 'revisions',
					format: 'json',
					rvprop: 'ids|timestamp|comment',
					indexpageids: true,
					revids: oldid
				}).done(function(data) {
					var pageid = data.query.pageids[0];
					var page = data.query.pages[pageid];
					an3_next(page);
				}).fail(function(data) {
					console.log('API failed :(', data); // eslint-disable-line no-console
				});
			} else {
				an3_next();
			}
			break;
	}
};

Twinkle.arv.processSock = function(params) {
	Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

	// notify all user accounts if requested
	if (params.notify) {

		var notifyEditSummary = wgULS('通知用户查核请求。', '通知用戶查核請求。') + Twinkle.getPref('summaryAd');
		var notifyText = '\n\n{{subst:socksuspectnotice|1=' + params.uid + '}}';

		var notify = function (username, taskname, callback) {
			Morebits.wiki.flow.check('User talk:' + username, function () {
				var flowpage = new Morebits.wiki.flow('User talk:' + username, '通知' + (taskname || wgULS('主账户', '主帳戶')));
				flowpage.setTopic(wgULS('用户查核通知', '用戶查核通知'));
				flowpage.setContent(notifyText);
				flowpage.newTopic(callback);
			}, function () {
				var talkpage = new Morebits.wiki.page('User talk:' + username, '通知' + (taskname || wgULS('主账户', '主帳戶')));
				talkpage.setFollowRedirect(true);
				talkpage.setEditSummary(notifyEditSummary);
				talkpage.setTags(Twinkle.getPref('revisionTags'));
				talkpage.setAppendText(notifyText);
				talkpage.append(callback);
			});
		};

		// notify user's master account
		notify(params.uid);

		if (params.sockpuppets.length > 0) {
			var statusIndicator = new Morebits.status('通知傀儡', '0%');
			var total = params.sockpuppets.length;
			var current = 0;

			// display status of notifications as they progress
			var onSuccess = function(sockTalkPage) {
				var now = parseInt(100 * ++current / total, 10) + '%';
				statusIndicator.update(now);
				sockTalkPage.getStatusElement().unlink();
				if (current >= total) {
					statusIndicator.info(now + '（完成）');
				}
			};

			var socks = params.sockpuppets;

			// notify each puppet account
			for (var i = 0; i < socks.length; ++i) {
				notify(socks[i], socks[i], onSuccess);
			}
		}

	}

	// prepare the SPI report
	var text = '\n\n{{subst:RFCUform\n' +
		'| username1  = ' + params.uid + '\n' +
		params.sockpuppets.map(function(v, i) {
			return '| username' + (i + 2) + '  = ' + v;
		}).join('\n') + '\n' +
		'| reason = ' + params.evidence + '}}';

	var reportpage = 'Wikipedia:元維基用戶查核請求';

	Morebits.wiki.actionCompleted.redirect = reportpage;
	Morebits.wiki.actionCompleted.notice = wgULS('报告完成', '報告完成');

	var spiPage = new Morebits.wiki.page(reportpage, wgULS('抓取讨论页面', '擷取討論頁面'));
	spiPage.setFollowRedirect(true);
	spiPage.setEditSummary(wgULS('报告', '報告') + '[[Special:Contributions/' + params.uid + '|' + params.uid + ']]。' + Twinkle.getPref('summaryAd'));
	spiPage.setTags(Twinkle.getPref('revisionTags'));
	spiPage.setAppendText(text);
	spiPage.append();

	Morebits.wiki.removeCheckpoint();  // all page updates have been started
};

Twinkle.arv.processAN3 = function(params) {
	// prepare the AN3 report
	var minid;
	for (var i = 0; i < params.diffs.length; ++i) {
		if (params.diffs[i].parentid && (!minid || params.diffs[i].parentid < minid)) {
			minid = params.diffs[i].parentid;
		}
	}

	var api = new mw.Api();
	api.get({
		action: 'query',
		prop: 'revisions',
		format: 'json',
		rvprop: 'sha1|ids|timestamp|comment',
		rvlimit: 100,
		rvstartid: minid,
		rvexcludeuser: params.uid,
		indexpageids: true,
		redirects: true,
		titles: params.page
	}).done(function(data) {
		Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"
		var orig;
		if (data.length) {
			var sha1 = data[0].sha1;
			for (var i = 1; i < data.length; ++i) {
				if (data[i].sha1 === sha1) {
					orig = data[i];
					break;
				}
			}

			if (!orig) {
				orig = data[0];
			}
		}

		var origtext = '';
		if (orig) {
			origtext = '{{diff2|' + orig.revid + '|' + orig.timestamp + '}} "' + orig.comment + '"';
		}

		var grouped_diffs = {};

		var parentid, lastid;
		for (var j = 0; j < params.diffs.length; ++j) {
			var cur = params.diffs[j];
			if ((cur.revid && cur.revid !== parentid) || lastid === null) {
				lastid = cur.revid;
				grouped_diffs[lastid] = [];
			}
			parentid = cur.parentid;
			grouped_diffs[lastid].push(cur);
		}

		var difftext = $.map(grouped_diffs, function(sub) {
			var ret = '';
			if (sub.length >= 2) {
				var last = sub[0];
				var first = sub.slice(-1)[0];
				var label = 'Consecutive edits made from ' + moment(first.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + ' to ' + moment(last.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]');
				ret = '# {{diff|oldid=' + first.parentid + '|diff=' + last.revid + '|label=' + label + '}}\n';
			}
			ret += sub.reverse().map(function(v) {
				return (sub.length >= 2 ? '#' : '') + '# {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
			}).join('\n');
			return ret;
		}).reverse().join('\n');
		var warningtext = params.warnings.reverse().map(function(v) {
			return '# ' + ' {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
		}).join('\n');
		var resolvetext = params.resolves.reverse().map(function(v) {
			return '# ' + ' {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
		}).join('\n');

		if (params.free_resolves) {
			var page = params.free_resolves;
			var rev = page.revisions[0];
			resolvetext += '\n# ' + ' {{diff2|' + rev.revid + '|' + moment(rev.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + ' on ' + page.title + '}} "' + rev.comment + '"';
		}

		var comment = params.comment.replace(/~*$/g, '').trim();

		if (comment) {
			comment += ' ~~~~';
		}

		var text = '\n\n' + '{{subst:AN3 report|diffs=' + difftext + '|warnings=' + warningtext + '|resolves=' + resolvetext + '|pagename=' + params.page + '|orig=' + origtext + '|comment=' + comment + '|uid=' + params.uid + '}}';

		var reportpage = 'Wikipedia:Administrators\' noticeboard/Edit warring';

		Morebits.wiki.actionCompleted.redirect = reportpage;
		Morebits.wiki.actionCompleted.notice = 'Reporting complete';

		var an3Page = new Morebits.wiki.page(reportpage, 'Retrieving discussion page');
		an3Page.setFollowRedirect(true);
		an3Page.setEditSummary('Adding new report for [[Special:Contributions/' + params.uid + '|' + params.uid + ']].' + Twinkle.getPref('summaryAd'));
		an3Page.setTags(Twinkle.getPref('revisionTags'));
		an3Page.setAppendText(text);
		an3Page.append();

		// notify user

		var notifyEditSummary = 'Notifying about edit warring noticeboard discussion.' + Twinkle.getPref('summaryAd');
		var notifyText = '\n\n{{subst:an3-notice|1=' + mw.util.wikiUrlencode(params.uid) + '|auto=1}} ~~~~';

		var talkPage = new Morebits.wiki.page('User talk:' + params.uid, 'Notifying edit warrior');
		talkPage.setFollowRedirect(true);
		talkPage.setEditSummary(notifyEditSummary);
		talkPage.setTags(Twinkle.getPref('revisionTags'));
		talkPage.setAppendText(notifyText);
		talkPage.append();
		Morebits.wiki.removeCheckpoint();  // all page updates have been started
	}).fail(function(data) {
		console.log('API failed :(', data); // eslint-disable-line no-console
	});
};
})(jQuery);


// </nowiki>
