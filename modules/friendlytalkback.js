//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** friendlytalkback.js: Talkback module
 ****************************************
 * Mode of invocation:     Tab ("TB")
 * Active on:              Existing user talk pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.talkback = function() {

	if ( !Morebits.wiki.flow.relevantUserName() ) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.talkback.callback, "通告", "friendly-talkback", wgULS("回复通告", "回覆通告") );
};

Twinkle.talkback.callback = function( ) {
	if( Morebits.wiki.flow.relevantUserName() === mw.config.get("wgUserName") && !confirm(wgULS("您寂寞到了要自己回复自己的程度么？", "您寂寞到了要自己回覆自己的程度麼？")) ){
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle(wgULS("回复通告", "回覆通告"));
	Window.setScriptName("Twinkle");
	Window.addFooterLink( wgULS("关于{{talkback}}", "關於{{talkback}}"), "Template:Talkback" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#talkback" );

	var form = new Morebits.quickForm( callback_evaluate );

	form.append({ type: "radio", name: "tbtarget",
				list: [
					{
						label: wgULS("回复：我的对话页", "回覆：我的對話頁"),
						value: "mytalk",
						checked: "true"
					},
					{
						label: wgULS("回复：其他用户的对话页", "回覆：其他用戶的對話頁"),
						value: "usertalk"
					},
					{
						label: wgULS("其它页面", "其它頁面"),
						value: "other"
					},
					{
						label: wgULS("“有新邮件”", "「有新郵件」"),
						value: "mail"
					}
				],
				event: callback_change_target
			});

	form.append({
			type: "field",
			label: "工作区",
			name: "work_area"
		});

	form.append({ type: "submit" });

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the
	var evt = document.createEvent("Event");
	evt.initEvent( "change", true, true );
	result.tbtarget[0].dispatchEvent( evt );

	// Check whether the user has opted out from talkback
	var query = {
		action: 'query',
		prop: 'extlinks',
		titles: mw.config.get('wgPageName'),
		elquery: 'userjs.invalid/noTalkback',
		ellimit: '1'
	};
	var wpapi = new Morebits.wiki.api("抓取opt-out信息", query, Twinkle.talkback.callback.optoutStatus);
	wpapi.post();
};

Twinkle.talkback.optout = null;

Twinkle.talkback.callback.optoutStatus = function(apiobj) {
	var xml = apiobj.getXML();
	var $el = $(xml).find('el');

	if ($el.length) {
		Twinkle.talkback.optout = Morebits.wiki.flow.relevantUserName() + wgULS("不希望收到回复通告", "不希望收到回覆通告");
		var url = $el.text();
		if (url.indexOf("reason=") > -1) {
			Twinkle.talkback.optout += "：" + decodeURIComponent(url.substring(url.indexOf("reason=") + 7)) + "。";
		} else {
			Twinkle.talkback.optout += "。";
		}
	} else {
		Twinkle.talkback.optout = false;
	}

	var $status = $("#twinkle-talkback-optout-message");
	if ($status.length) {
		$status.append(Twinkle.talkback.optout);
	}
};

var prev_page = "";
var prev_section = "";
var prev_message = "";

var callback_change_target = function( e ) {
	var value = e.target.values;
	var root = e.target.form;
	var old_area = Morebits.quickForm.getElements(root, "work_area")[0];

	if(root.section) {
		prev_section = root.section.value;
	}
	if(root.message) {
		prev_message = root.message.value;
	}
	if(root.page) {
		prev_page = root.page.value;
	}

	var work_area = new Morebits.quickForm.element({
			type: "field",
			label: wgULS("回复通告信息", "回覆通告訊息"),
			name: "work_area"
		});

	switch( value ) {
		case "mytalk":
			/* falls through */
		default:
			work_area.append({
				type: "div",
				label: "",
				style: "color: red",
				id: "twinkle-talkback-optout-message"
			});
			work_area.append({
					type:"input",
					name:"section",
					label:wgULS("小节（可选）", "小節（可選）"),
					tooltip:wgULS("您留下消息的小节标题。", "您留下消息的小節標題。"),
					value: prev_section
				});
			break;
		case "usertalk":
			work_area.append({
				type: "div",
				label: "",
				style: "color: red",
				id: "twinkle-talkback-optout-message"
			});
			work_area.append({
					type:"input",
					name:"page",
					label:"用户",
					tooltip:wgULS("您留下消息的用户名。", "您留下消息的用戶名。"),
					value: prev_page
				});

			work_area.append({
					type:"input",
					name:"section",
					label:wgULS("小节（可选）", "小節（可選）"),
					tooltip:wgULS("您留下消息的小节标题。", "您留下消息的小節標題。"),
					value: prev_section
				});
			break;
		case "other":
			work_area.append({
				type: "div",
				label: "",
				style: "color: red",
				id: "twinkle-talkback-optout-message"
			});
			work_area.append({
					type:"input",
					name:"page",
					label:wgULS("完整页面名", "完整頁面名"),
					tooltip:wgULS("您留下消息的完整页面名，比如“"+Twinkle.getPref("projectNamespaceName")+" talk:Twinkle”。", "您留下消息的完整頁面名，比如「"+Twinkle.getPref("projectNamespaceName")+" talk:Twinkle」。"),
					value: prev_page
				});

			work_area.append({
					type:"input",
					name:"section",
					label:wgULS("小节（可选）", "小節（可選）"),
					tooltip:wgULS("您留下消息的小节标题。", "您留下消息的小節標題。"),
					value: prev_section
				});
			break;
		case "mail":
			work_area.append({
					type:"input",
					name:"section",
					label:wgULS("电子邮件主题（可选）", "電子郵件主題（可選）"),
					tooltip:wgULS("您发出的电子邮件的主题。", "您發出的電子郵件的主題。")
				});
			break;
	}

	if (value !== "notice") {
		work_area.append({ type:"textarea", label:wgULS("附加信息（可选）：", "附加訊息（可選）："), name:"message", tooltip:wgULS("会在回复通告模板下出现的消息，您的签名会被加在最后。", "會在回覆通告模板下出現的訊息，您的簽名會被加在最後。") });
	}

	work_area = work_area.render();
	root.replaceChild( work_area, old_area );
	if (root.message) {
		root.message.value = prev_message;
	}

	if (Twinkle.talkback.optout) {
		$("#twinkle-talkback-optout-message").append(Twinkle.talkback.optout);
	}
};

var callback_evaluate = function( e ) {

	var tbtarget = e.target.getChecked( "tbtarget" )[0];
	var page = null;
	var section = e.target.section.value;
	var userName = Morebits.wiki.flow.relevantUserName();
	var fullUserTalkPageName = mw.config.get("wgFormattedNamespaces")[ mw.config.get("wgNamespaceIds").user_talk ] + ":" + userName;

	if( tbtarget === "usertalk" || tbtarget === "other" ) {
		page = e.target.page.value;

		if( tbtarget === "usertalk" ) {
			if( !page ) {
				alert(wgULS("您必须指定用户名。", "您必須指定用戶名。"));
				return;
			}
		} else {
			if( !page ) {
				alert(wgULS("您必须指定页面名。", "您必須指定頁面名。"));
				return;
			}
		}
	}

	var message;
	if (e.target.message) {
		message = e.target.message.value;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = fullUserTalkPageName;
	Morebits.wiki.actionCompleted.notice = wgULS("回复通告完成，将在几秒内刷新", "回覆通告完成，將在幾秒內重新整理");

	var tbPageName = (tbtarget === "mytalk") ? mw.config.get("wgUserName") : page;

	var text;
	var title, content, editSummary;
	if ( tbtarget === "mail" ) {
		title = Twinkle.getFriendlyPref("mailHeading");
		content = "{{you've got mail|subject=" + section + "|ts=~~~~~}}";

		text = "\n\n==" + title + "==\n" + content;

		if( message ) {
			content += "\n" + message.trim();
			text += "\n" + message.trim() + "--~~~~";
		} else if( Twinkle.getFriendlyPref("insertTalkbackSignature") ) {
			text += "\n~~~~";
		}

		editSummary = wgULS("通知：有新邮件", "通知：有新郵件") + Twinkle.getPref("summaryAd");
	} else {  // tbtarget one of mytalk, usertalk, other
		// clean talkback heading: strip section header markers that were erroneously suggested in the documentation
		title = Twinkle.getFriendlyPref("talkbackHeading").replace( /^\s*=+\s*(.*?)\s*=+$\s*/, "$1" );
		content = "{{talkback|" + tbPageName;

		if( section ) {
			content += "|" + section;
		}
		content += "|target=" + userName + "|ts=~~~~~}}";

		text = "\n\n==" + title + "==\n" + content;

		if( message ) {
			content += "\n" + message.trim();
			text += "\n" + message.trim() + "--~~~~";
		} else if( Twinkle.getFriendlyPref("insertTalkbackSignature") ) {
			text += "\n~~~~";
		}

		var editSummary = wgULS("回复通告（[[", "回覆通告（[[");
		if (tbtarget !== "other" && !/^\s*user talk:/i.test(tbPageName)) {
			editSummary += "User talk:";
		}
		editSummary += tbPageName + (section ? ("#" + section) : "") + "]]）";
		editSummary += Twinkle.getPref("summaryAd");
	}

	Morebits.wiki.flow.check(fullUserTalkPageName, function () {
		var flowpage = new Morebits.wiki.flow(fullUserTalkPageName, wgULS("添加回复通告", "加入回覆通告"));
		flowpage.setTopic(title);
		flowpage.setContent(content);
		flowpage.newTopic();
	}, function () {
		var talkpage = new Morebits.wiki.page(fullUserTalkPageName, wgULS("添加回复通告", "加入回覆通告"));
		talkpage.setEditSummary(editSummary);
		talkpage.setAppendText( text );
		talkpage.setCreateOption("recreate");
		talkpage.setMinorEdit(Twinkle.getFriendlyPref("markTalkbackAsMinor"));
		talkpage.setFollowRedirect( true );
		talkpage.append();
	});

};

})(jQuery);


//</nowiki>
