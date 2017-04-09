//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Existing and non-existing user pages, user talk pages, contributions pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.arv = function twinklearv() {
	var username = mw.config.get('wgRelevantUserName');
	if ( !username ) {
		return;
	}

	var title = Morebits.isIPAddress( username ) ? '报告IP给管理员' : '报告用户给管理员';

	Twinkle.addPortletLink( function(){ Twinkle.arv.callback(username); }, "告状", "tw-arv", title );
};

Twinkle.arv.callback = function ( uid ) {
	if ( uid === mw.config.get('wgUserName') ) {
		alert( '你不想报告你自己，对吧？' );
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 500 );
	Window.setTitle( "Very Important Person" ); //Backronym
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "VIP指导", "WP:VIP" );
	Window.addFooterLink( "UAA指引", "WP:U" );
	Window.addFooterLink( "关于RFCU", "WP:RFCU" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#arv" );

	var form = new Morebits.quickForm( Twinkle.arv.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: '选择报告类型：',
			event: Twinkle.arv.callback.changeCategory
		} );
	categories.append( {
			type: 'option',
			label: '破坏（WP:VIP）',
			value: 'aiv'
		} );
	categories.append( {
			type: 'option',
			label: '用户名（WP:UAA）',
			value: 'username'
		} );
	categories.append( {
			type: 'option',
			label: '用户查核 - 主账户（WP:RFCU）',
			value: 'sock'
		} );
	categories.append( {
			type: 'option',
			label: '用户查核 - 傀儡（WP:RFCU）',
			value: 'puppet'
		} );
	form.append( {
			type: 'field',
			label: 'Work area',
			name: 'work_area'
		} );
	form.append( { type: 'submit', label: '提交〜工具测试中，请检查执行结果！〜' } );
	form.append( {
			type: 'hidden',
			name: 'uid',
			value: uid
		} );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.arv.callback.changeCategory = function (e) {
	var value = e.target.value;
	var root = e.target.form;
	var old_area = Morebits.quickForm.getElements(root, "work_area")[0];
	var work_area = null;

	switch( value ) {
	case 'aiv':
		/* falls through */
	default:
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '报告用户破坏',
				name: 'work_area'
			} );
		work_area.append( {
				type: 'input',
				name: 'page',
				label: '相关页面：',
				tooltip: '如不希望让报告链接到页面，请留空',
				value: Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '',
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					if( value === '' ) {
						root.badid.disabled = root.goodid.disabled = true;
					} else {
						root.badid.disabled = false;
						root.goodid.disabled = root.badid.value === '';
					}
				}
			} );
		work_area.append( {
				type: 'input',
				name: 'badid',
				label: '受到破坏的修订版本：',
				tooltip: '留空以略过差异',
				value: Morebits.queryString.exists( 'vanarticlerevid' ) ? Morebits.queryString.get( 'vanarticlerevid' ) : '',
				disabled: !Morebits.queryString.exists( 'vanarticle' ),
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					root.goodid.disabled = value === '';
				}
			} );
		work_area.append( {
				type: 'input',
				name: 'goodid',
				label: '破坏前的修订版本：',
				tooltip: '留空以略过差异较早版本',
				value: Morebits.queryString.exists( 'vanarticlegoodrevid' ) ? Morebits.queryString.get( 'vanarticlegoodrevid' ) : '',
				disabled: !Morebits.queryString.exists( 'vanarticle' ) || Morebits.queryString.exists( 'vanarticlerevid' )
			} );
		work_area.append( {
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: '已发出最后（层级4或4im）警告',
						value: 'final'
					},
					{
						label: '封禁过期后随即破坏',
						value: 'postblock'
					},
					{
						label: '显而易见的纯破坏用户',
						value: 'vandalonly',
						disabled: Morebits.isIPAddress( root.uid.value )
					},
					{
						label: '显而易见的spambot或失窃账户',
						value: 'spambot'
					},
					{
						label: '仅用来散发广告宣传的用户',
						value: 'promoonly'
					}
				]
			} );
		work_area.append( {
				type: 'textarea',
				name: 'reason',
				label: '评论：'
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	case 'username':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '报告不当用户名',
				name: 'work_area'
			} );
		work_area.append ( {
				type: 'header',
				label: '不当用户名类别',
				tooltip: '維基百科不允許具有誤導性、宣傳性、侮辱性或破壞性的用戶名。域名和電子郵件地址也同樣被禁止。這些標準適用於用戶名和簽名。若在其他語言不恰當，或是不恰當名字的拼寫錯誤或文字替換，間接或暗示的用戶名，仍然被認為是不恰當的。'
			} );
		work_area.append( {
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: '误导性用户名',
						value: '误导性',
						tooltip: '誤導性用戶名隱含著與貢獻者相關或誤導他人的事情。例如︰不實觀點、予人擁有非實質擁有權限或是機器人帳戶的印象'
					},
					{
						label: '宣传性用户名',
						value: '宣传性',
						tooltip: '宣傳性用戶名是公司、網站或團體的廣告。如果用戶沒有在與其用戶名相關的頁面做出廣告編輯，請不要提報到UAA。'
					},
					{
						label: '暗示并非由一人拥有',
						value: 'shared',
						tooltip: '暗示並非一人擁有的用戶名（公司或團體名，職位名）是不被允許的。如果用戶名包含公司或團體名，但顯然可以表示出是個人帳戶是可以接受的，例如"Mark at WidgetsUSA", "Jack Smith at the XY Foundation", "WidgetFan87"。'
					},
					{
						label: '侮辱性用户名',
						value: '侮辱性',
						tooltip: '侮辱性用戶名令到協調編輯變得困難，甚至無可能。'
					},
					{
						label: '破坏性用户名',
						value: '破坏性',
						tooltip: '破壞性用戶名包括人身攻擊、偽冒他人或其他一切有著清晰可見的破壞維基百科意圖的使用者名稱。'
					}
				]
			} );
		work_area.append( {
				type: 'textarea',
				name: 'reason',
				label: '评论：'
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;

	case 'puppet':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '报告疑似主账户',
				name: 'work_area'
			} );
		work_area.append(
			{
				type: 'input',
				name: 'sockmaster',
				label: '主账户',
				tooltip: '主账户的用户名（不含User:前缀）'
			}
		);
		work_area.append( {
				type: 'textarea',
				label: '证据：',
				name: 'evidence',
				tooltip: '键入能够用来体现这些用户可能滥用多重账户的证据，这通常包括茶语、页面历史或其他有关的信息。请避免在此处提供非与傀儡或滥用多重账户相关的其他讨论。'
			} );
		work_area.append( {
				type: 'checkbox',
				list: [
					{
						label: '通知相关用户',
						name: 'notify',
						tooltip: '通知用户不是必须的，在许多情况下（如长期破坏者）通知更可能适得其反。但是，对于涉及新用户的报告而言，通知他们能让报告显得更公平。请使用常识。'
					}
				]
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	case 'sock':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: '报告疑似傀儡',
				name: 'work_area'
			} );
		work_area.append(
			{
				type: 'dyninput',
				name: 'sockpuppet',
				label: '傀儡',
				sublabel: '傀儡：',
				tooltip: '傀儡的用户名（不含User:前缀）',
				min: 2
			} );
		work_area.append( {
				type: 'textarea',
				label: '证据：',
				name: 'evidence',
				tooltip: '键入能够用来体现这些用户可能滥用多重账户的证据，这通常包括茶语、页面历史或其他有关的信息。请避免在此处提供非与傀儡或滥用多重账户相关的其他讨论。'
			} );
		work_area.append( {
				type: 'checkbox',
				list: [ {
					label: '通知相关用户',
					name: 'notify',
					tooltip: '通知用户不是必须的，在许多情况下（如长期破坏者）通知更可能适得其反。但是，对于涉及新用户的报告而言，通知他们能让报告显得更公平。请使用常识。'
				} ]
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
        break;
	case 'an3':
		work_area = new Morebits.quickForm.element( {
			type: 'field',
			label: 'Report edit warring',
			name: 'work_area'
		} );

		work_area.append( {
			type: 'input',
			name: 'page',
			label: 'Page',
			tooltip: 'The page being reported'
		} );
		work_area.append( {
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
				}).done(function(data){
					var pageid = data.query.pageids[0];
					var page = data.query.pages[pageid];
					if(!page.revisions) {
						return;
					}
					for(var i = 0; i < page.revisions.length; ++i) {
						var rev = page.revisions[i];
						var $entry = $('<div/>', {
							'class': 'entry'
						});
						var $input = $('<input/>', {
							'type': 'checkbox',
							'name': 's_diffs',
							'value': rev.revid
						});
						$input.data('revinfo',rev);
						$input.appendTo($entry);
						$entry.append('<span>"'+rev.parsedcomment+'" at <a href="'+mw.config.get('wgScript')+'?diff='+rev.revid+'">'+moment(rev.timestamp).calendar()+'</a></span>').appendTo($diffs);
					}
				}).fail(function(data){
					console.log( 'API failed :(', data );
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
				}).done(function(data){
					var pageid = data.query.pageids[0];
					var page = data.query.pages[pageid];
					if(!page.revisions) {
						return;
					}
					for(var i = 0; i < page.revisions.length; ++i) {
						var rev = page.revisions[i];
						var $entry = $('<div/>', {
							'class': 'entry'
						});
						var $input = $('<input/>', {
							'type': 'checkbox',
							'name': 's_warnings',
							'value': rev.revid
						});
						$input.data('revinfo',rev);
						$input.appendTo($entry);
						$entry.append('<span>"'+rev.parsedcomment+'" at <a href="'+mw.config.get('wgScript')+'?diff='+rev.revid+'">'+moment(rev.timestamp).calendar()+'</a></span>').appendTo($warnings);
					}
				}).fail(function(data){
					console.log( 'API failed :(', data );
				});

				var $resolves = $(root).find('[name=resolves]');
				$resolves.find('.entry').remove();

				var t = new mw.Title(value);
				var ns = t.getNamespaceId();
				var talk_page = (new mw.Title(t.getMain(), ns%2? ns : ns+1)).getPrefixedText();

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
				}).done(function(data){
					var pageid = data.query.pageids[0];
					var page = data.query.pages[pageid];
					if(!page.revisions) {
						return;
					}
					for(var i = 0; i < page.revisions.length; ++i) {
						var rev = page.revisions[i];
						var $entry = $('<div/>', {
							'class': 'entry'
						});
						var $input = $('<input/>', {
							'type': 'checkbox',
							'name': 's_resolves',
							'value': rev.revid
						});
						$input.data('revinfo',rev);
						$input.appendTo($entry);
						$entry.append('<span>"'+rev.parsedcomment+'" at <a href="'+mw.config.get('wgScript')+'?diff='+rev.revid+'">'+moment(rev.timestamp).calendar()+'</a></span>').appendTo($resolves);
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

				}).fail(function(data){
					console.log( 'API failed :(', data );
				});
			}
		} );
		work_area.append( {
			type: 'field',
			name: 'diffs',
			label: 'User\'s reverts',
			tooltip: 'Select the edits you believe are reverts'
		} );
		work_area.append( {
			type: 'field',
			name: 'warnings',
			label: 'Warnings given to subject',
			tooltip: 'You must have warned the subject before reporting'
		} );
		work_area.append( {
			type: 'field',
			name: 'resolves',
			label: 'Resolution initiatives',
			tooltip: 'You should have tried to resolve the issue on the talk page first'
		} );

		work_area.append( {
			type: 'textarea',
			label: 'Comment:',
			name: 'comment'
		} );

		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	}
};

Twinkle.arv.callback.evaluate = function(e) {
	var form = e.target;
	var reason = "";
	var comment = "";
	if ( form.reason ) {
		comment = form.reason.value;
	}
	var uid = form.uid.value;

	var types;
	switch( form.category.value ) {

		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			types = form.getChecked( 'arvtype' );
			if( !types.length && comment === '' ) {
				alert( '您必须指定理由' );
				return;
			}

			types = types.map( function(v) {
					switch(v) {
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
							return '位置理由';
					}
				} ).join( '，' );


			if ( form.page.value !== '' ) {

				// add a leading : on linked page namespace to prevent transclusion
				reason = '* {{pagelinks|' + form.page.value + '}}';

				if ( form.badid.value !== '' ) {
					reason += '（{{diff|' + form.page.value + '|' + form.badid.value + '|' + form.goodid.value + '|diff}}）';
				}
				reason += '\n';
			}

			if ( types ) {
				reason += '* ' + types;
			}
			if (comment !== "" ) {
				comment = comment.replace(/\r?\n/g, "\n*:");  // indent newlines
				reason += (types ? "。" : "* ") + comment;
			}
			reason = reason.trim();
			if (reason.search(/[.?!;。？！；]$/) === -1) {
				reason += "。";
			}
			reason += "\n* 发现人：~~~~\n* 处理：";

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );

			Morebits.wiki.actionCompleted.redirect = "Wikipedia:当前的破坏";
			Morebits.wiki.actionCompleted.notice = "报告完成";

			var aivPage = new Morebits.wiki.page( 'Wikipedia:当前的破坏', '处理VIP请求' );
			aivPage.setFollowRedirect( true );

			aivPage.load( function() {
				var text = aivPage.getPageText();

				// check if user has already been reported
				if (new RegExp( "===\s*\\{\\{\\s*(?:[Vv]andal)\\s*\\|\\s*(?:1=)?\s*" + RegExp.escape( uid, true ) + "\\s*\\}\\}\s*===" ).test(text)) {
					aivPage.getStatusElement().error( '报告已存在，将不会加入新的' );
					Morebits.status.printUserText( reason, '您键入的评论已在下方提供，您可以将其加入到VIP已存在的小节中：' );
					return;
				}
				aivPage.setPageSection( 0 );
				aivPage.getStatusElement().status( '加入新报告…' );
				aivPage.setEditSummary( '报告[[Special:Contributions/' + uid + '|' + uid + ']]。' + Twinkle.getPref('summaryAd') );
				aivPage.setAppendText( '\n=== {{vandal|' + (/\=/.test( uid ) ? '1=' : '' ) + uid + '}} ===\n' + reason );
				aivPage.append();
			} );
			break;

		// Report inappropriate username
		case 'username':
			types = form.getChecked( 'arvtype' ).map( Morebits.string.toLowerCaseFirstChar );

			var hasShared = types.indexOf( 'shared' ) > -1;
			if ( hasShared ) {
				types.splice( types.indexOf( 'shared' ), 1 );
			}

			if ( types.length <= 2 ) {
				types = types.join( '和' );
			} else {
				types = [ types.slice( 0, -1 ).join( '、' ), types.slice( -1 ) ].join( '和' );
			}
			reason = "*{{user-uaa|1=" + uid + "}} &ndash; ";
			if ( types.length || hasShared ) {
				reason += types + "用户名" +
					( hasShared ? "，暗示该账户并非由一人拥有。" : "。" );
			}
			if ( comment !== '' ) {
				reason += Morebits.string.toUpperCaseFirstChar(comment) + "。";
			}
			reason += "--~~~~";
			reason = reason.replace(/\r?\n/g, "\n*:");  // indent newlines

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );

			Morebits.wiki.actionCompleted.redirect = "Wikipedia:需要管理員注意的用戶名";
			Morebits.wiki.actionCompleted.notice = "报告完成";

			var uaaPage = new Morebits.wiki.page( 'Wikipedia:需要管理員注意的用戶名', '处理UAA请求' );
			uaaPage.setFollowRedirect( true );

			uaaPage.load( function() {
				var text = uaaPage.getPageText();

				// check if user has already been reported
				if (new RegExp( "\\{\\{\\s*user-uaa\\s*\\|\\s*(1\\s*=\\s*)?" + RegExp.escape(uid, true) + "\\s*(\\||\\})" ).test(text)) {
					uaaPage.getStatusElement().error( '用户已被列入。' );
					Morebits.status.printUserText( reason, '您键入的评论已在下方提供，您可以将其手工加入UAA上该用户的报告中：' );
					return;
				}
				uaaPage.getStatusElement().status( '添加新报告…' );
				uaaPage.setEditSummary( '报告[[Special:Contributions/' + uid + '|' + uid + ']]。'+ Twinkle.getPref('summaryAd') );
				uaaPage.setAppendText( "\n" + reason );
				uaaPage.append();
			} );
			break;

		// WP:SPI
		case "sock":
			/* falls through */
		case "puppet":
			var sockParameters = {
				evidence: form.evidence.value.trim(),
				notify: form.notify.checked
			};

			var puppetReport = form.category.value === "puppet";
			if (puppetReport && !(form.sockmaster.value.trim())) {
				if (!confirm("您未对这个傀儡账户输入主账户，您是否希望报告这个账户为傀儡操作者？")) {
					return;
				}
				puppetReport = false;
			}

			sockParameters.uid = puppetReport ? form.sockmaster.value.trim() : uid;
			sockParameters.sockpuppets = puppetReport ? [uid] : $.map( $('input:text[name=sockpuppet]',form), function(o){ return $(o).val() || null; });

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );
			Twinkle.arv.processSock( sockParameters );
			break;

		case 'an3':
			var diffs = $.map( $('input:checkbox[name=s_diffs]:checked',form), function(o){ return $(o).data('revinfo'); });

			if (diffs.length < 3 && !confirm("You have selected fewer than three offending edits. Do you wish to make the report anyway?")) {
				return;
			}

			var warnings = $.map( $('input:checkbox[name=s_warnings]:checked',form), function(o){ return $(o).data('revinfo'); });

			if(!warnings.length && !confirm("You have not selected any edits where you warned the offender. Do you wish to make the report anyway?")) {
				return;
			}

			var resolves = $.map( $('input:checkbox[name=s_resolves]:checked',form), function(o){ return $(o).data('revinfo'); });
			var free_resolves = $('input[name=s_resolves_free]').val();

			var an3_next = function(free_resolves) {
				if(!resolves.length && !free_resolves && !confirm("You have not selected any edits where you tried to resolve the issue. Do you wish to make the report anyway?")) {
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

				Morebits.simpleWindow.setButtonsEnabled( false );
				Morebits.status.init( form );
				Twinkle.arv.processAN3( an3Parameters );
			};

			if(free_resolves) {
				var oldid=mw.util.getParamValue('oldid',free_resolves);
				var api = new mw.Api();
				api.get({
					action: 'query',
					prop: 'revisions',
					format: 'json',
					rvprop: 'ids|timestamp|comment',
					indexpageids: true,
					revids: oldid
				}).done(function(data){
					var pageid = data.query.pageids[0];
					var page = data.query.pages[pageid];
					an3_next(page);
				}).fail(function(data){
					console.log( 'API failed :(', data );
				});
			} else {
				an3_next();
			}
			break;
	}
};

Twinkle.arv.processSock = function( params ) {
	Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

	// notify all user accounts if requested
	if (params.notify && params.sockpuppets.length>0) {

		var notifyEditSummary = "通知用户查核请求。" + Twinkle.getPref('summaryAd');
		var notifyText = "\n\n{{subst:socksuspectnotice}}";

		// notify user's master account
		var masterTalkPage = new Morebits.wiki.page( 'User talk:' + params.uid, '通知主账户' );
		masterTalkPage.setFollowRedirect( true );
		masterTalkPage.setEditSummary( notifyEditSummary );
		masterTalkPage.setAppendText( notifyText );
		masterTalkPage.append();

		var statusIndicator = new Morebits.status( '通知傀儡', '0%' );
		var total = params.sockpuppets.length;
		var current =   0;

		// display status of notifications as they progress
		var onSuccess = function( sockTalkPage ) {
			var now = parseInt( 100 * ++(current)/total, 10 ) + '%';
			statusIndicator.update( now );
			sockTalkPage.getStatusElement().unlink();
			if ( current >= total ) {
				statusIndicator.info( now + '（完成）' );
			}
		};

		var socks = params.sockpuppets;

		// notify each puppet account
		for( var i = 0; i < socks.length; ++i ) {
			var sockTalkPage = new Morebits.wiki.page( 'User talk:' + socks[i], "通知" +  socks[i] );
			sockTalkPage.setFollowRedirect( true );
			sockTalkPage.setEditSummary( notifyEditSummary );
			sockTalkPage.setAppendText( notifyText );
			sockTalkPage.append( onSuccess );
		}
	}

	// prepare the SPI report
	var text = "\n\n=== " + params.uid + " ===\n" +
		"{{status2}}<!-- 请勿更改本行 -->\n" +
		"{{checkuser|1=" + params.uid + "}}\n" +
		params.sockpuppets.map( function(v) {
				return "{{checkuser|1=" + v + "}}";
			} ).join( "\n" ) + "\n" + params.evidence + "--~~~~";

	var reportpage = 'Wikipedia:用戶查核請求';

	Morebits.wiki.actionCompleted.redirect = reportpage;
	Morebits.wiki.actionCompleted.notice = "报告完成";

	var spiPage = new Morebits.wiki.page( reportpage, '抓取讨论页面' );
	spiPage.setFollowRedirect( true );
	spiPage.setEditSummary( '报告[[Special:Contributions/' + params.uid + '|' + params.uid + ']]。'+ Twinkle.getPref('summaryAd') );
	spiPage.setAppendText( text );
	spiPage.append();

	Morebits.wiki.removeCheckpoint();  // all page updates have been started
};

Twinkle.arv.processAN3 = function( params ) {
	// prepare the AN3 report
	var minid;
	for(var i = 0; i < params.diffs.length; ++i) {
		if( params.diffs[i].parentid && (!minid || params.diffs[i].parentid < minid)) {
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
	}).done(function(data){
		Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"
		var orig;
		if(data.length) {
			var sha1 = data[0].sha1;
			for(var i = 1; i < data.length; ++i) {
				if(data[i].sha1 == sha1) {
					orig = data[i];
					break;
				}
			}

			if(!orig) {
				orig = data[0];
			}
		}

		var origtext = "";
		if(orig) {
			origtext = '{{diff2|' + orig.revid + '|' + orig.timestamp + '}} "' + orig.comment + '"';
		}

		var grouped_diffs = {};

		var parentid, lastid;
		for(var j = 0; j < params.diffs.length; ++j) {
			var cur = params.diffs[j];
			if( cur.revid && cur.revid != parentid || lastid === null ) {
				lastid = cur.revid;
				grouped_diffs[lastid] = [];
			}
			parentid = cur.parentid;
			grouped_diffs[lastid].push(cur);
		}

		var difftext = $.map(grouped_diffs, function(sub, index){
			var ret = "";
			if(sub.length >= 2) {
				var last = sub[0];
				var first = sub.slice(-1)[0];
				var label = "Consecutive edits made from " + moment(first.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + " to " + moment(last.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]');
				ret = "# {{diff|oldid="+first.parentid+"|diff="+last.revid+"|label="+label+"}}\n";
			}
			ret += sub.reverse().map(function(v){
				return (sub.length >= 2 ? '#' : '') + '# {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
			}).join("\n");
			return ret;
		}).reverse().join("\n");
		var warningtext = params.warnings.reverse().map(function(v){
			return '# ' + ' {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
		}).join("\n");
		var resolvetext = params.resolves.reverse().map(function(v){
			return '# ' + ' {{diff2|' + v.revid + '|' + moment(v.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + '}} "' + v.comment + '"';
		}).join("\n");

		if(params.free_resolves) {
			var page = params.free_resolves;
			var rev = page.revisions[0];
			resolvetext += "\n# " + ' {{diff2|' + rev.revid + '|' + moment(rev.timestamp).utc().format('HH:mm, D MMMM YYYY [(UTC)]') + ' on ' + page.title +  '}} "' + rev.comment + '"';
		}

		var comment = params.comment.replace(/~*$/g, '').trim();

		if(comment) {
			comment += " ~~~~";
		}

		var text = "\n\n"+'{{subst:AN3 report|diffs='+difftext+'|warnings='+warningtext+'|resolves='+resolvetext+'|pagename='+params.page+'|orig='+origtext+'|comment='+comment+'|uid='+params.uid+'}}';

		var reportpage = 'Wikipedia:Administrators\' noticeboard/Edit warring';

		Morebits.wiki.actionCompleted.redirect = reportpage;
		Morebits.wiki.actionCompleted.notice = "Reporting complete";

		var an3Page = new Morebits.wiki.page( reportpage, 'Retrieving discussion page' );
		an3Page.setFollowRedirect( true );
		an3Page.setEditSummary( 'Adding new report for [[Special:Contributions/' + params.uid + '|' + params.uid + ']].'+ Twinkle.getPref('summaryAd') );
		an3Page.setAppendText( text );
		an3Page.append();

		// notify user

		var notifyEditSummary = "Notifying about edit warring noticeboard discussion." + Twinkle.getPref('summaryAd');
		var notifyText = "\n\n{{subst:an3-notice|1=" + mw.util.wikiUrlencode(params.uid) + "|auto=1}} ~~~~";

		var talkPage = new Morebits.wiki.page( 'User talk:' + params.uid, 'Notifying edit warrior' );
		talkPage.setFollowRedirect( true );
		talkPage.setEditSummary( notifyEditSummary );
		talkPage.setAppendText( notifyText );
		talkPage.append();
		Morebits.wiki.removeCheckpoint();  // all page updates have been started
	}).fail(function(data){
		console.log( 'API failed :(', data );
	});
};
})(jQuery);


//</nowiki>
