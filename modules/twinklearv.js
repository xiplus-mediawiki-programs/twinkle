// <nowiki>


(function() {


/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.arv = function twinklearv() {
	var username = Morebits.wiki.flow.relevantUserName(true);
	if (!username) {
		return;
	}

	var isIP = mw.util.isIPAddress(username);
	var title = isIP ? conv({ hans: '报告IP给管理员', hant: '報告IP給管理員' }) : conv({ hans: '报告用户给管理人员', hant: '報告使用者給管理人員' });

	Twinkle.addPortletLink(function() {
		Twinkle.arv.callback(username, isIP);
	}, conv({ hans: '告状', hant: '告狀' }), 'tw-arv', title);
};

Twinkle.arv.callback = function (uid, isIP) {
	if (uid === mw.config.get('wgUserName')) {
		alert(conv({ hans: '你不想报告你自己，对吧？', hant: '你不想報告你自己，對吧？' }));
		return;
	}

	var Window = new Morebits.SimpleWindow(600, 500);
	Window.setTitle(conv({ hans: '报告用户给管理人员', hant: '報告使用者給管理人員' }));
	Window.setScriptName('Twinkle');
	Window.addFooterLink('VIP', 'WP:VIP');
	Window.addFooterLink('EWIP', 'WP:EWIP');
	Window.addFooterLink('UAA', 'WP:UAA');
	Window.addFooterLink(conv({ hans: '用户名方针', hant: '使用者名稱方針' }), 'WP:U');
	Window.addFooterLink('SPI', 'WP:SPI');
	Window.addFooterLink(conv({ hans: '告状设置', hant: '告狀設定' }), 'WP:TW/PREF#arv');
	Window.addFooterLink(conv({ hans: 'Twinkle帮助', hant: 'Twinkle說明' }), 'H:TW#告狀');
	Window.addFooterLink(conv({ hans: '反馈意见', hant: '回報意見'}), 'WT:TW');

	var form = new Morebits.QuickForm(Twinkle.arv.callback.evaluate);
	var categories = form.append({
		type: 'select',
		name: 'category',
		label: conv({ hans: '选择报告类型：', hant: '選擇報告類別：' }),
		event: Twinkle.arv.callback.changeCategory
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '破坏（WP:VIP）', hant: '破壞（WP:VIP）' }),
		value: 'aiv'
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '编辑争议（WP:EWIP）', hant: '編輯爭議（WP:EWIP）' }),
		value: 'ewip'
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '用户名（WP:UAA）', hant: '使用者名稱（WP:UAA）' }),
		value: 'username',
		disabled: mw.util.isIPAddress(uid)
	});
	categories.append({
		type: 'option',
		label: conv({ hans: '傀儡调查（WP:SPI）', hant: '傀儡調查（WP:SPI）' }),
		value: 'spi'
	});
	form.append({
		type: 'div',
		label: '',
		style: 'color: red',
		id: 'twinkle-arv-blockwarning'
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

	// Check if the user is blocked, update notice
	var query = {
		action: 'query',
		list: 'blocks',
		bkprop: 'range|flags',
		format: 'json'
	};
	if (isIP) {
		query.bkip = uid;
	} else {
		query.bkusers = uid;
	}
	new Morebits.wiki.Api(conv({ hans: '检查用户的封禁状态', hant: '檢查使用者的封鎖狀態' }), query, function (apiobj) {
		var blocklist = apiobj.getResponse().query.blocks;
		if (blocklist.length) {
			var block = blocklist[0];
			var message = (isIP ? conv({ hans: '此IP地址', hant: '此IP位址' }) : conv({ hans: '此账户', hant: '此帳號' })) + conv({ hans: '已经被', hant: '已經被' }) + (block.partial ? '部分' : '');
			// Start and end differ, range blocked
			message += block.rangestart !== block.rangeend ? conv({ hans: '段封禁。', hant: '段封鎖。' }) : conv({ hans: '封禁。', hant: '封鎖。' });
			if (block.partial) {
				$('#twinkle-arv-blockwarning').css('color', 'black'); // Less severe
			}
			$('#twinkle-arv-blockwarning').text(message);
		}
	}).post();


	// We must init the
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.category.dispatchEvent(evt);
};

Twinkle.arv.lta_list = [
	{ value: '', label: conv({ hans: '请选择', hant: '請選擇' }) },
	{ value: 'Adam Asrul', label: 'Adam Asrul、ADAM' },
	{ value: 'Albert20009', label: 'Albert20009' },
	{ value: 'Kapol6360', label: 'Kapol6360、Kapol' },
	{ value: 'R1t5', label: conv({ hans: '114.27、数论和人瑞类条目破坏、R1t5', hant: '114.27、數論和人瑞類條目破壞、R1t5' }) },
	{ value: 'Royalfanta', label: 'Royalfanta、RF' },
	{ value: 'Xayahrainie43', label: 'Xayahrainie43、X43、妍欣' },
	{ value: '米記123', label: '米記123' }
];

Twinkle.arv.callback.pick_lta = function twinklearvCallbackPickLta(e) {
	e.target.form.sockmaster.value = e.target.value;
	Twinkle.arv.callback.spi_notice(e.target.form, e.target.value);
	Twinkle.arv.callback.set_sockmaster(e.target.value);
	e.target.value = '';
};

Twinkle.arv.callback.sockmaster_changed = function twinklearvCallbackSockmasterChanged(e) {
	Twinkle.arv.callback.spi_notice(e.target.form, e.target.value);
	Twinkle.arv.callback.set_sockmaster(e.target.value);
};

Twinkle.arv.callback.spi_notice = function twinklearvCallbackSpiNotice(form, sockmaster) {
	var previewText = '{{#ifexist:Wikipedia:傀儡調查/案件/' + sockmaster +
		'|{{#ifexist:Wikipedia:傀儡調查/案件通告/' + sockmaster +
		'  |<div class="extendedconfirmed-show sysop-show">{{Memo|1={{Wikipedia:傀儡調查/案件通告/' + sockmaster + '}}|2=notice}}</div>' +
		'  |無案件通告}}' +
		'|您將建立新的提報頁面，如果您希望提報過往曾被提報過的使用者，請檢查您的輸入是否正確。}}';
	form.spinoticepreviewer.beginRender(previewText, 'Wikipedia:傀儡調查/案件/' + sockmaster);
};

Twinkle.arv.callback.set_sockmaster = function twinklearvCallbackSetSockmaster(sockmaster) {
	$('code.tw-arv-sockmaster').text('{{subst:Socksuspectnotice|1=' + sockmaster + '}}');
};

Twinkle.arv.callback.changeCategory = function (e) {
	var value = e.target.value;
	var root = e.target.form;
	var old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];
	var work_area = null;
	var previewlink = document.createElement('a');
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = conv({ hans: '预览', hant: '預覽' });
	$(previewlink).on('click', function() {
		Twinkle.arv.callback.preview(root);
	});

	switch (value) {
		case 'aiv':
		/* falls through */
		default:
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '报告用户破坏', hant: '報告使用者破壞' }),
				name: 'work_area'
			});
			work_area.append({
				type: 'div',
				label: conv({ hans: '提报傀儡应优先发送至傀儡调查，除非相关的账户有高频率、涉及多个页面等紧急严重的破坏行为。', hant: '提報傀儡應優先發送至傀儡調查，除非相關的帳號有高頻率、涉及多個頁面等緊急嚴重的破壞行為。' })
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: conv({ hans: '相关页面：', hant: '相關頁面：' }),
				tooltip: conv({ hans: '如不希望让报告链接到页面，请留空', hant: '如不希望讓報告連結到頁面，請留空' }),
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
				label: conv({ hans: '受到破坏的修订版本：', hant: '受到破壞的修訂版本：' }),
				tooltip: conv({ hans: '留空以略过差异', hant: '留空以略過差異' }),
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
				label: conv({ hans: '破坏前的修订版本：', hant: '破壞前的修訂版本：' }),
				tooltip: conv({ hans: '留空以略过差异的较早版本', hant: '留空以略過差異的較早版本' }),
				value: mw.util.getParamValue('vanarticlegoodrevid') || '',
				disabled: !mw.util.getParamValue('vanarticle') || mw.util.getParamValue('vanarticlerevid')
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: conv({ hans: '已发出最后（层级4或4im）警告', hant: '已發出最後（層級4或4im）警告' }),
						value: 'final'
					},
					{
						label: conv({ hans: '封禁过期后随即破坏', hant: '封鎖過期後隨即破壞' }),
						value: 'postblock'
					},
					{
						label: conv({ hans: '显而易见的纯破坏用户', hant: '顯而易見的純破壞使用者' }),
						value: 'vandalonly',
						disabled: mw.util.isIPAddress(root.uid.value)
					},
					{
						label: conv({ hans: '显而易见的spambot或失窃账户', hant: '顯而易見的spambot或失竊帳號' }),
						value: 'spambot'
					},
					{
						label: conv({ hans: '仅用来散发广告宣传的用户', hant: '僅用來散發廣告宣傳的使用者' }),
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
							label: conv({ hans: '在页面上及编辑摘要隐藏用户名', hant: '在頁面上及編輯摘要隱藏使用者名稱' }),
							tooltip: conv({ hans: '若用户名不当请勾选此项，注意：请考虑私下联系管理员处理。', hant: '若使用者名稱不當請勾選此項，注意：請考慮私下聯絡管理員處理。' }),
							name: 'hidename',
							value: 'hidename'
						}
					]
				});
			}
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: conv({ hans: '评论：', hant: '評論：' })
			});
			work_area.append({ type: 'div', id: 'arvpreview', label: [ previewlink ] });
			work_area.append({ type: 'div', id: 'twinklearv-previewbox', style: 'display: none' });
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'ewip':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '报告编辑争议', hant: '報告編輯爭議' }),
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'dyninput',
					name: 'page',
					label: conv({ hans: '相关页面：', hant: '相關頁面：' }),
					sublabel: conv({ hans: '页面：', hant: '頁面：' }),
					tooltip: conv({ hans: '如不希望让报告链接到页面，请留空', hant: '如不希望讓報告連結到頁面，請留空' }),
					min: 1,
					max: 10
				});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: conv({ hans: '评论：', hant: '評論：' })
			});
			work_area.append({ type: 'div', id: 'arvpreview', label: [ previewlink ] });
			work_area.append({ type: 'div', id: 'twinklearv-previewbox', style: 'display: none' });
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'username':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '报告不当用户名', hant: '報告不當使用者名稱' }),
				name: 'work_area'
			});
			work_area.append({
				type: 'header',
				label: conv({ hans: '不当用户名类型', hant: '不當使用者名稱類別' }),
				tooltip: conv({
					hans: '维基百科不允许使用带有误导性、宣传性、侮辱性或破坏性的用户名。此外，使用域名及邮箱地址的用户名亦被禁止。这些准则俱应应用至用户名及签名。在其他语言中不当的用户名或通过错拼、替代、暗示、拆字或任何间接方法达成的非妥当用户名同样视为违规。', hant:
						'維基百科不允許使用帶有誤導性、宣傳性、侮辱性或破壞性的使用者名稱。此外，使用域名及電子信箱位址的使用者名稱亦被禁止。這些準則俱應應用至使用者名稱及簽名。在其他語言中不當的使用者名稱或通過錯拼、替代、暗示、拆字或任何間接方法達成的非妥當使用者名稱同樣視為違規。'
				})
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: conv({ hans: '误导性用户名', hant: '誤導性使用者名稱' }),
						value: conv({ hans: '误导性', hant: '誤導性' }),
						tooltip: conv({
							hans: '误导性用户名隐含着与贡献者相关或误导他人的事情。例如︰不实观点、暗示账户拥有特定权限或暗示该账户并非由一人拥有而是由一个组群、一个项目或一个集体运作。', hant:
								'誤導性使用者名稱隱含著與貢獻者相關或誤導他人的事情。例如︰不實觀點、暗示帳戶擁有特定權限或暗示該帳戶並非由一人擁有而是由一個群組、一個計畫或一個集體運作。'
						})
					},
					{
						label: conv({ hans: '宣传性用户名', hant: '宣傳性使用者名稱' }),
						value: conv({ hans: '宣传性', hant: '宣傳性' }),
						tooltip: conv({ hans: '宣传性用户名会于维基百科上起推销一个组群或一间公司的作用。', hant: '宣傳性使用者名稱會於維基百科上起推銷一個群組或一間公司的作用。' })
					},
					{
						label: conv({ hans: '暗示并非由一人拥有', hant: '暗示並非由一人擁有' }),
						value: 'shared',
						tooltip: conv({ hans: '每个维基账户只可以代表个人（容许一些例外情况），所有与他人分享账户的行为（包括分享账户密码）均被禁止。', hant: '每個維基帳戶只可以代表個人（容許一些例外情況），所有與他人分享帳戶的行為（包括分享帳戶密碼）均被禁止。' })
					},
					{
						label: conv({ hans: '侮辱性用户名', hant: '侮辱性使用者名稱' }),
						value: '侮辱性',
						tooltip: conv({ hans: '侮辱性用户名令协调编辑变得困难，甚至无可能。', hant: '侮辱性使用者名稱令協調編輯變得困難，甚至無可能。' })
					},
					{
						label: conv({ hans: '破坏性用户名', hant: '破壞性使用者名稱' }),
						value: conv({ hans: '破坏性', hant: '破壞性' }),
						tooltip: conv({ hans: '破坏性用户名包括人身攻击、伪冒他人或其他一切有着清晰可见的破坏维基百科意图的用户名。', hant: '破壞性使用者名稱包括人身攻擊、偽冒他人或其他一切有著清晰可見的破壞維基百科意圖的使用者名稱。' })
					}
				]
			});
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: conv({ hans: '在页面上隐藏用户名（需监督的用户名请勿于站内报告，勾选此项并不构成能在站内报告的理由）', hant: '在頁面上隱藏使用者名稱（需監督的使用者名稱請勿於站內報告，勾選此項並不構成能在站內報告的理由）' }),
						tooltip: conv({ hans: '若用户名不当请勾选此项，注意：请考虑私下联系管理员处理。', hant: '若使用者名稱不當請勾選此項，注意：請考慮私下聯絡管理員處理。' }),
						name: 'hidename',
						value: 'hidename'
					}
				],
				style: 'font-weight: bold;'
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: conv({ hans: '评论：', hant: '評論：' })
			});
			work_area.append({ type: 'div', id: 'arvpreview', label: [ previewlink ] });
			work_area.append({ type: 'div', id: 'twinklearv-previewbox', style: 'display: none' });
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'spi':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: conv({ hans: '发起傀儡调查', hant: '發起傀儡調查' }),
				name: 'work_area'
			});
			work_area.append({
				type: 'select',
				name: 'common_lta',
				label: '持續出沒的破壞者：',
				style: 'width: 420px;',
				list: Twinkle.arv.lta_list,
				event: Twinkle.arv.callback.pick_lta
			});
			work_area.append({
				type: 'input',
				name: 'sockmaster',
				label: $('<a>', {
					href: mw.util.getUrl('Special:PrefixIndex/Wikipedia:傀儡調查/案件/'),
					text: 'Wikipedia:傀儡調查/案件/',
					target: '_blank'
				})[0],
				tooltip: conv({ hans: '主账户的用户名（不含User:前缀），这被用于创建傀儡调查子页面的标题，可在 Wikipedia:傀儡调查/案件 的子页面搜索先前的调查。', hant: '主帳號的使用者名稱（不含User:字首），這被用於建立傀儡調查子頁面的標題，可在 Wikipedia:傀儡調查/案件 的子頁面搜尋先前的調查。' }),
				value: root.uid.value,
				event: Twinkle.arv.callback.sockmaster_changed
			});
			work_area.append({ type: 'div', id: 'twinklearv-spinoticebox', style: 'display: none' });
			work_area.append({
				type: 'dyninput',
				name: 'sockpuppet',
				label: '傀儡',
				sublabel: '傀儡：',
				tooltip: conv({ hans: '傀儡的用户名（不含User:前缀）', hant: '傀儡的使用者名稱（不含User:字首）' }),
				min: 2,
				max: 9
			});
			work_area.append({
				type: 'textarea',
				label: conv({ hans: '证据：', hant: '證據：' }),
				name: 'reason',
				tooltip: conv({ hans: '输入能够用来体现这些用户可能滥用多重账户的证据，这通常包括互助客栈发言、页面历史或其他有关的信息。请避免在此处提供非与傀儡或滥用多重账户相关的其他讨论。', hant: '輸入能夠用來體現這些使用者可能濫用多重帳號的證據，這通常包括互助客棧發言、頁面歷史或其他有關的資訊。請避免在此處提供非與傀儡或濫用多重帳號相關的其他討論。' })
			});
			work_area.append({
				type: 'checkbox',
				list: [{
					label: conv({ hans: '请求用户查核', hant: '請求使用者查核' }),
					name: 'checkuser',
					tooltip: conv({ hans: '用户查核是一种用于获取傀儡指控相关技术证据的工具，若没有正当理由则不会使用，您必须在证据字段充分解释为什么需要使用该工具。用户查核不会用于公开连接用户账户使用的IP地址。', hant: '使用者查核是一種用於獲取傀儡指控相關技術證據的工具，若沒有正當理由則不會使用，您必須在證據欄位充分解釋為什麼需要使用該工具。使用者查核不會用於公開連接使用者帳號使用的IP位址。' })
				}]
			});
			work_area.append({ type: 'div', id: 'arvpreview', label: [ previewlink ] });
			work_area.append({ type: 'div', id: 'twinklearv-previewbox', style: 'display: none' });
			work_area.append({
				type: 'div',
				label: [
					conv({ hans: '请使用常识决定是否以', hant: '請使用常識決定是否以' }),
					$('<code>').addClass('tw-arv-sockmaster').attr('style', 'margin: 2px;')[0],
					conv({ hans: '通知用户。这不是必须的，对于涉及新用户的报告而言，通知他们能让报告显得更公平，但是许多情况下（如长期破坏者）通知更可能适得其反。', hant: '通知使用者。這不是必須的，對於涉及新使用者的報告而言，通知他們能讓報告顯得更公平，但是許多情況下（如長期破壞者）通知更可能適得其反。' })
				]
			});
			work_area = work_area.render();
			$('input:text[name=sockpuppet]', work_area).first().val(root.uid.value);
			old_area.parentNode.replaceChild(work_area, old_area);
			root.spinoticepreviewer = new Morebits.wiki.Preview($(work_area).find('#twinklearv-spinoticebox').last()[0]);
			Twinkle.arv.callback.spi_notice(root, root.uid.value);
			Twinkle.arv.callback.set_sockmaster(root.uid.value);
			break;
	}
	root.previewer = new Morebits.wiki.Preview($(work_area).find('#twinklearv-previewbox').last()[0]);
};

Twinkle.arv.callback.preview = function(form) {
	var reason = Twinkle.arv.callback.getReportWikitext(form);
	if (reason === undefined) {
		return;
	}
	var input = Morebits.QuickForm.getInputData(form);
	var title;
	switch (input.category) {
		case 'vip': title = 'Wikipedia:当前的破坏'; break;
		case 'ewip': title = 'Wikipedia:管理员布告板/编辑争议'; break;
		case 'username': title = 'Wikipedia:管理员布告板/不当用户名'; break;
		case 'spi': title = 'Wikipedia:傀儡調查/案件/' + input.sockmaster; break;
		default: title = mw.config.get('wgPageName'); break;
	}
	form.previewer.beginRender('__NOTOC__' + reason[0], title);
};

Twinkle.arv.callback.getReportWikitext = function(form) {
	var input = Morebits.QuickForm.getInputData(form);
	var reason = '';
	var comment = '';
	var uid = input.uid;

	var checkTitle = function(title, revid) {
		if (/https?:\/\//.test(title)) {
			alert(conv({ hans: '页面名称不能使用网址。', hant: '頁面名稱不能使用網址。' }));
			return false;
		}

		var page;
		try {
			page = new mw.Title(title);
		} catch (error) {
			alert(conv({ hans: '“', hant: '「' }) + title + conv({ hans: '”不是一个有效的页面名称，如要使用差异链接请放在“评论”', hant: '」不是一個有效的頁面名稱，如要使用差異連結請放在「評論」' }) + (revid ? conv({ hans: '，或正确输入“修订版本”', hant: '，或正確輸入「修訂版本」' }) : '') + '。');
			return false;
		}

		if (page.namespace === -1) {
			alert(conv({ hans: '“', hant: '「' }) + title + conv({ hans: '”属于特殊页面，如要使用差异链接请放在“评论”', hant: '」屬於特殊頁面，如要使用差異連結請放在「評論」' }) + (revid ? conv({ hans: '，或正确输入“修订版本”', hant: '，或正確輸入「修訂版本」' }) : '') + '。');
			return false;
		}

		return page;
	};

	var page;
	switch (input.category) {
		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			if (!input.arvtype.length && input.reason === '') {
				alert(conv({ hans: '您必须指定理由', hant: '您必須指定理由' }));
				return;
			}

			reason += '=== ' + (input.hidename ? conv({ hans: '已隐藏用户名', hant: '已隱藏使用者名稱' }) : uid) + ' ===\n';
			reason += "* '''{{vandal|" + (/=/.test(uid) ? '1=' : '') + uid;
			if (input.hidename) {
				reason += '|hidename=1';
			}
			reason += "}}'''\n";

			var types = input.arvtype.map(function(v) {
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

			if (input.page !== '') {
				page = checkTitle(input.page, true);
				if (!page) {
					return;
				}

				comment += '* {{pagelinks|' + (page.getPrefixedText().indexOf('=') > -1 ? '1=' : '') + page.getPrefixedText() + '}}';

				if (input.badid) {
					comment += '（{{diff|' + page.getPrefixedText() + '|' + input.badid + '|' + (input.goodid ? input.goodid : '') + '|diff}}）';
				}
				comment += '\n';
			}

			if (types) {
				comment += '* ' + types;
			}
			if (input.reason !== '') {
				input.reason = input.reason.replace(/\n\n+/g, '\n');
				input.reason = input.reason.replace(/\r?\n/g, '\n*:');  // indent newlines
				comment += (types ? '。' : '* ') + input.reason;
			}
			comment = comment.trim();
			comment = Morebits.string.appendPunctuation(comment);

			reason += comment + '\n* 发现人：~~~~';
			break;

		// Report 3RR
		case 'ewip':
			if (input.reason === '') {
				alert(conv({ hans: '您必须指定理由', hant: '您必須指定理由' }));
				return;
			}
			reason += '=== ' + uid + ' ===\n';
			reason += "* '''{{vandal|" + (/=/.test(uid) ? '1=' : '') + uid + "}}'''\n";

			var pages = $.map($('input:text[name=page]', form), function (o) {
				return $(o).val() || null;
			});
			for (var i = 0; i < pages.length; i++) {
				page = checkTitle(pages[i], false);
				if (!page) {
					return;
				}

				comment += '* {{pagelinks|' + (page.getPrefixedText().indexOf('=') > -1 ? '1=' : '') + page.getPrefixedText() + '}}\n';
			}
			input.reason = input.reason.replace(/\n\n+/g, '\n');
			input.reason = input.reason.replace(/\r?\n/g, '\n*:');  // indent newlines
			comment += '* ' + input.reason + '\n';
			comment = comment.trim();
			comment = Morebits.string.appendPunctuation(comment);

			reason += comment + '\n* 提報人：~~~~';
			break;

		// Report inappropriate username
		case 'username':
			types = input.arvtype.map(Morebits.string.toLowerCaseFirstChar);

			var hasShared = types.indexOf('shared') > -1;
			if (hasShared) {
				types.splice(types.indexOf('shared'), 1);
			}

			if (types.indexOf('侮辱性') !== -1) {
				if (!confirm(conv({
					hans: '警告：严重的侮辱性用户名和针对特定个人的侮辱性用户名不应在公开页面报告，而是应当私下联系监督员处理。是否继续？', hant:
						'警告：嚴重的侮辱性使用者名稱和針對特定個人的侮辱性使用者名稱不應在公開頁面報告，而是應當私下聯絡監督員處理。是否繼續？'
				}))) {
					return;
				}
			}

			if (types.length <= 2) {
				types = types.join('和');
			} else {
				types = [ types.slice(0, -1).join('、'), types.slice(-1) ].join('和');
			}
			comment += '*{{user-uaa|1=' + uid;
			if (input.hidename) {
				comment += '|hidename=1';
			}
			comment += '}} &ndash; ';
			if (types.length) {
				comment += types + conv({ hans: '用户名', hant: '使用者名稱' });
			}
			if (types.length && hasShared) {
				comment += '，';
			}
			if (hasShared) {
				comment += conv({ hans: '暗示该账户并非由一人拥有', hant: '暗示該帳號並非由一人擁有' });
			}
			if (types.length || hasShared) {
				comment += '。';
			}
			if (input.reason) {
				comment += Morebits.string.toUpperCaseFirstChar(input.reason);
			}
			comment = Morebits.string.appendPunctuation(comment);
			comment += '--~~~~';
			comment = comment.replace(/\r?\n/g, '\n*:');  // indent newlines

			reason = comment;
			break;

		// WP:SPI
		case 'spi':
			if (!input.reason) {
				alert(conv({ hans: '请输入证据。', hant: '請輸入證據。' }));
				return;
			}

			var sockpuppets = Morebits.array.uniq($.map($('input:text[name=sockpuppet]', form), function(o) {
				return $(o).val().trim() || null;
			}));
			if (!sockpuppets[0]) {
				alert(conv({ hans: '您没有指定任何傀儡。', hant: '您沒有指定任何傀儡。' }));
				return;
			}

			comment += '{{subst:SPI report|';
			if (sockpuppets.indexOf(input.sockmaster) === -1) {
				comment += '1={{subst:#ifexist:{{subst:FULLPAGENAME}}||' + input.sockmaster + '}}|';
			}
			comment += sockpuppets.map(function(sock, index) {
				return (index + 2) + '=' + sock;
			}).join('|') + '\n|evidence=' + Morebits.string.appendPunctuation(input.reason) + '\n';

			if (input.checkuser) {
				comment += '|checkuser=yes';
			}
			comment += '}}';

			reason = comment;
			break;
	}

	return [reason, comment];
};

Twinkle.arv.callback.evaluate = function(e) {
	var form = e.target;
	var input = Morebits.QuickForm.getInputData(form);
	var uid = input.uid;
	var reason;

	var summary;
	switch (input.category) {
		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			reason = Twinkle.arv.callback.getReportWikitext(form);
			if (reason === undefined) {
				return;
			}

			summary = conv({ hans: '报告', hant: '報告' }) + '[[Special:Contributions/' + uid + '|' + uid + ']]';
			if (input.hidename) {
				summary = conv({ hans: '报告一名用户', hant: '報告一名使用者' });
			}

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:当前的破坏';
			Morebits.wiki.actionCompleted.notice = conv({ hans: '报告完成', hant: '報告完成' });

			var aivPage = new Morebits.wiki.Page('Wikipedia:当前的破坏', conv({ hans: '处理VIP请求', hant: '處理VIP請求' }));
			aivPage.setFollowRedirect(true);

			aivPage.load(function() {
				var text = aivPage.getPageText();
				var $aivLink = '<a target="_blank" href="/wiki/WP:VIP">WP:VIP</a>';

				// check if user has already been reported
				if (new RegExp('===\\s*\\{\\{\\s*(?:[Vv]andal)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(uid) + '\\s*\\}\\}\\s*===').test(text)) {
					aivPage.getStatusElement().error(conv({ hans: '报告已存在，将不会加入新的', hant: '報告已存在，將不會加入新的' }));
					Morebits.Status.printUserText(reason[1], conv({ hans: '您输入的评论已在下方提供，您可以将其加入到', hant: '您輸入的評論已在下方提供，您可以將其加入到' }) + $aivLink + conv({ hans: '已存在的小节中：', hant: '已存在的小節中：' }));
					return;
				}
				aivPage.setPageSection(0);
				aivPage.getStatusElement().status(conv({ hans: '加入新报告…', hant: '加入新報告…' }));
				aivPage.setEditSummary(summary);
				aivPage.setChangeTags(Twinkle.changeTags);
				aivPage.setAppendText('\n' + reason[0]);
				aivPage.append();
			});
			break;
		// Report 3RR
		case 'ewip':
			reason = Twinkle.arv.callback.getReportWikitext(form);
			if (reason === undefined) {
				return;
			}

			summary = conv({ hans: '报告', hant: '報告' }) + '[[Special:Contributions/' + uid + '|' + uid + ']]';

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:管理员布告板/编辑争议';
			Morebits.wiki.actionCompleted.notice = conv({ hans: '报告完成', hant: '報告完成' });

			var ewipPage = new Morebits.wiki.Page('Wikipedia:管理员布告板/编辑争议', conv({ hans: '处理EWIP请求', hant: '處理EWIP請求' }));
			ewipPage.setFollowRedirect(true);

			ewipPage.load(function() {
				var text = ewipPage.getPageText();
				var $ewipLink = '<a target="_blank" href="/wiki/WP:EWIP">WP:EWIP</a>';

				// check if user has already been reported
				if (new RegExp('===\\s*\\{\\{\\s*(?:[Vv]andal)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(uid) + '\\s*\\}\\}\\s*===').test(text)) {
					ewipPage.getStatusElement().error(conv({ hans: '报告已存在，将不会加入新的', hant: '報告已存在，將不會加入新的' }));
					Morebits.Status.printUserText(reason[1], conv({ hans: '您输入的评论已在下方提供，您可以将其加入到', hant: '您輸入的評論已在下方提供，您可以將其加入到' }) + $ewipLink + conv({ hans: '已存在的小节中：', hant: '已存在的小節中：' }));
					return;
				}
				ewipPage.setPageSection(0);
				ewipPage.getStatusElement().status(conv({ hans: '加入新报告…', hant: '加入新報告…' }));
				ewipPage.setEditSummary(summary);
				ewipPage.setChangeTags(Twinkle.changeTags);
				ewipPage.setAppendText('\n' + reason[0]);
				ewipPage.append();
			});
			break;

		// Report inappropriate username
		case 'username':
			reason = Twinkle.arv.callback.getReportWikitext(form);

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:管理员布告板/不当用户名';
			Morebits.wiki.actionCompleted.notice = conv({ hans: '报告完成', hant: '報告完成' });

			var uaaPage = new Morebits.wiki.Page('Wikipedia:管理员布告板/不当用户名', conv({ hans: '处理UAA请求', hant: '處理UAA請求' }));
			uaaPage.setFollowRedirect(true);

			uaaPage.load(function() {
				var text = uaaPage.getPageText();

				// check if user has already been reported
				if (new RegExp('\\{\\{\\s*user-uaa\\s*\\|\\s*(1\\s*=\\s*)?' + Morebits.string.escapeRegExp(uid) + '\\s*(\\||\\})').test(text)) {
					uaaPage.getStatusElement().error(conv({ hans: '用户已被列入。', hant: '使用者已被列入。' }));
					var $uaaLink = '<a target="_blank" href="/wiki/WP:UAA">WP:UAA</a>';
					Morebits.Status.printUserText(reason[1], conv({ hans: '您输入的评论已在下方提供，您可以将其手工加入', hant: '您輸入的評論已在下方提供，您可以將其手工加入' }) + $uaaLink + conv({ hans: '上该用户的报告中：', hant: '上該使用者的報告中：' }));
					return;
				}
				uaaPage.getStatusElement().status(conv({ hans: '加入新报告…', hant: '加入新報告…' }));
				uaaPage.setEditSummary(conv({ hans: '新提报', hant: '新提報' }));
				uaaPage.setChangeTags(Twinkle.changeTags);
				uaaPage.setAppendText('\n\n' + reason[0]);
				uaaPage.append();
			});
			break;

		// WP:SPI
		case 'spi':
			reason = Twinkle.arv.callback.getReportWikitext(form);

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			var reportpage = 'Wikipedia:傀儡調查/案件/' + input.sockmaster;

			Morebits.wiki.actionCompleted.redirect = reportpage;
			Morebits.wiki.actionCompleted.notice = conv({ hans: '报告完成', hant: '報告完成' });

			var spiPage = new Morebits.wiki.Page(reportpage, conv({ hans: '抓取讨论页面', hant: '抓取討論頁面' }));
			spiPage.setFollowRedirect(true);
			spiPage.setEditSummary(conv({ hans: '加入新提报', hant: '加入新提報' }));
			spiPage.setChangeTags(Twinkle.changeTags);
			spiPage.setAppendText(reason[0]);
			spiPage.setWatchlist(Twinkle.getPref('spiWatchReport'));
			spiPage.append();
			break;
	}
};

Twinkle.addInitCallback(Twinkle.arv, 'arv');
})();


// </nowiki>
