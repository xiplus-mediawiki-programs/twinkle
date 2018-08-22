//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              User talk pages
 * Config directives in:   TwinkleConfig
 */


Twinkle.warn = function twinklewarn() {
	if ( Morebits.wiki.flow.relevantUserName() ) {
		Twinkle.addPortletLink( Twinkle.warn.callback, "警告", "tw-warn", wgULS("警告或提醒用户", "警告或提醒用戶") );
	}

	// Modify URL of talk page on rollback success pages. This is only used
	// when a user Ctrl+clicks on a rollback link.
	if( mw.config.get('wgAction') === 'rollback' ) {
		var $vandalTalkLink = $("#mw-rollback-success").find(".mw-usertoollinks a").first();
		if ( $vandalTalkLink.length ) {
			Twinkle.warn.makeVandalTalkLink($vandalTalkLink);
			$vandalTalkLink.css("font-weight", "bold");
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

Twinkle.warn.makeVandalTalkLink = function($vandalTalkLink) {
	$vandalTalkLink.wrapInner($("<span/>").attr("title", wgULS("如果合适，您可以用Twinkle在该用户对话页上做出警告。", "如果合適，您可以用Twinkle在該用戶對話頁上做出警告。")));

	var extraParam = "vanarticle=" + mw.util.rawurlencode(Morebits.pageNameNorm);
	var href = $vandalTalkLink.attr("href");
	if (href.indexOf("?") === -1) {
		$vandalTalkLink.attr("href", href + "?" + extraParam);
	} else {
		$vandalTalkLink.attr("href", href + "&" + extraParam);
	}
};

Twinkle.warn.callback = function twinklewarnCallback() {
	if( Morebits.wiki.flow.relevantUserName() === mw.config.get( 'wgUserName' ) &&
			!confirm( wgULS('您将要警告自己！您确定要继续吗？', '您將要警告自己！您確定要繼續嗎？') ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( wgULS("警告、通知用户", "警告、通知用戶") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("选择警告级别", "選擇警告級別"), "WP:WARN" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle說明"), "WP:TW/DOC#warn" );

	var form = new Morebits.quickForm( Twinkle.warn.callback.evaluate );
	var main_select = form.append( {
			type: 'field',
			label: wgULS('选择要发送的警告或通知类别', '選擇要發送的警告或通知類別'),
			tooltip: wgULS('首先选择一组，再选择具体的警告模板。', '首先選擇一組，再選擇具體的警告模板。')
		} );

	var main_group = main_select.append( {
			type: 'select',
			name: 'main_group',
			event:Twinkle.warn.callback.change_category
		} );

	var defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append( { type: 'option', label: wgULS('层级1', '層級1'), value: 'level1', selected: ( defaultGroup === 1 || defaultGroup < 1 || ( Morebits.userIsInGroup( 'sysop' ) ? defaultGroup > 8 : defaultGroup > 7 ) ) } );
	main_group.append( { type: 'option', label: wgULS('层级2', '層級2'), value: 'level2', selected: ( defaultGroup === 2 ) } );
	main_group.append( { type: 'option', label: wgULS('层级3', '層級3'), value: 'level3', selected: ( defaultGroup === 3 ) } );
	main_group.append( { type: 'option', label: wgULS('层级4', '層級4'), value: 'level4', selected: ( defaultGroup === 4 ) } );
	main_group.append( { type: 'option', label: wgULS('层级4im', '層級4im'), value: 'level4im', selected: ( defaultGroup === 5 ) } );
	main_group.append( { type: 'option', label: wgULS('单层级通知', '單層級通知'), value: 'singlenotice', selected: ( defaultGroup === 6 ) } );
	main_group.append( { type: 'option', label: wgULS('单层级警告', '單層級警告'), value: 'singlewarn', selected: ( defaultGroup === 7 ) } );
	if( Twinkle.getPref( 'customWarningList' ).length ) {
		main_group.append( { type: 'option', label: wgULS('自定义警告', '自訂警告'), value: 'custom', selected: ( defaultGroup === 9 ) } );
	}

	main_select.append( { type: 'select', name: 'sub_group', event:Twinkle.warn.callback.change_subcategory } ); //Will be empty to begin with.

	form.append( {
			type: 'input',
			name: 'article',
			label: wgULS('页面链接', '頁面連結'),
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip: wgULS('给模板中加入一页面链接，可留空。', '給模板中加入一頁面連結，可留空。')
		} );

	var more = form.append( { type: 'field', name: 'reasonGroup', label: wgULS('警告信息', '警告訊息') } );
	more.append( { type: 'textarea', label: wgULS('可选信息：', '可選訊息：'), name: 'reason', tooltip: wgULS('理由或是附加信息', '理由或是附加訊息') } );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = wgULS('预览', '預覽');
	more.append( { type: 'div', id: 'warningpreview', label: [ previewlink ] } );
	more.append( { type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' } );

	more.append( { type: 'submit', label: '提交' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
	result.main_group.root = result;
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklewarn-previewbox').last()[0]);

	// We must init the first choice (General Note);
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.main_group.dispatchEvent( evt );
};

// This is all the messages that might be dispatched by the code
// Each of the individual templates require the following information:
//   label (required): A short description displayed in the dialog
//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with ". $summaryAd"
//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
// 警告：警告消息有简体和繁体两个版本，请注意同时维护！
Twinkle.warn.messages = wgULS({
	level1: {
		"不同类型的非建设编辑": {
			"uw-vandalism1": {
				label: "明显的破坏",
				summary: "层级1：明显破坏"
			},
			"uw-test1": {
				label: "进行编辑测试而未及时清理",
				summary: "层级1：进行编辑测试而未及时清理"
			},
			"uw-delete1": {
				label: "不恰当地移除页面内容、模板或资料",
				summary: "层级1：不恰当地页面条目内容、模板或资料"
			},
			"uw-redirect1": {
				label: "创建破坏性的重定向",
				summary: "层级1：创建破坏性的重定向"
			},
			"uw-tdel1": {
				label: "在问题仍未解决的情况下移除维护性模板",
				summary: "层级1：移除维护性模板"
			},
			"uw-joke1": {
				label: "在百科全书内容中加入玩笑",
				summary: "层级1：加入不当玩笑"
			},
			"uw-create1": {
				label: "创建不当页面",
				summary: "层级1：创建不当页面"
			},
			"uw-upload1": {
				label: "上传不当图像",
				summary: "层级1：上传不当图像"
			},
			"uw-image1": {
				label: "在页面中加入不当图片",
				summary: "层级1：在页面中加入不当图片"
			},
			"uw-nor1": {
				label: "在条目中加入原创研究",
				summary: "层级1：在条目中加入原创研究"
			},
			"uw-politicalbias1": {
				label: "违反两岸用语方针",
				summary: "层级1：违反两岸用语方针"
			}
		},
		"增加商品或政治广告": {
			"uw-spam1": {
				label: "增加不合适的外部链接",
				summary: "层级1：增加不合适的外部链接"
			},
			"uw-advert1": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级1：利用维基百科来发布广告或推广"
			},
			"uw-npov1": {
				label: "不遵守中立的观点方针",
				summary: "层级1：不遵守中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-unsourced1": {
				label: "加入没有可靠来源佐证的内容",
				summary: "层级1：加入没有可靠来源佐证的内容"
			},
			"uw-error1": {
				label: "故意加入不实内容",
				summary: "层级1：故意加入不实内容"
			},
			"uw-biog1": {
				label: "在生者传记中加入没有可靠来源佐证而且可能引发争议的内容",
				summary: "层级1：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容"
			},
			"uw-defamatory1": {
				label: "加入诽谤内容",
				summary: "层级1：加入诽谤内容"
			}
		},
		"翻译品质": {
			"uw-roughtranslation1": {
				label: "您翻译的质量有待改善",
				summary: "您翻译的质量有待改善"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-notcensored1": {
				label: "因为“内容使人反感”而删除条目内容",
				summary: "层级1：审查条目内容"
			},
			"uw-mos1": {
				label: "不恰当的条目格式、日期、语言等",
				summary: "层级1：不恰当的条目格式、日期、语言等"
			},
			"uw-move1": {
				label: "无故移动条目/新名称不符合命名规范",
				summary: "层级1：不恰当地移动页面"
			},
			"uw-cd1": {
				label: "清空讨论页",
				summary: "层级1：清空讨论页"
			},
			"uw-chat1": {
				label: "在讨论页发表与改善条目无关的内容",
				summary: "层级1：在讨论页发表与改善条目无关的内容"
			},
			"uw-tpv1": {
				label: "修改他人留言",
				summary: "层级1：修改他人留言"
			},
			"uw-afd1": {
				label: "移除{{afd}}（页面存废讨论）模板",
				summary: "层级1：移除{{afd}}（页面存废讨论）模板"
			},
			"uw-speedy1": {
				label: "移除{{delete}}（快速删除）模板",
				summary: "层级1：移除{{delete}}（快速删除）模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa1": {
				label: "针对特定用户的人身攻击",
				summary: "层级1：针对特定用户的人身攻击"
			},
			"uw-agf1": {
				label: "没有假定善意",
				summary: "层级1：没有假定善意"
			},
			"uw-own1": {
				label: "主张条目所有权",
				summary: "层级1：主张条目所有权"
			},
			"uw-tempabuse1": {
				label: "不当使用警告或封禁模板",
				summary: "层级1：不当使用警告或封禁模板"
			}
		}
	},


	level2: {
		"不同类型的非建设编辑": {
			"uw-vandalism2": {
				label: "明显的破坏",
				summary: "层级2：明显破坏"
			},
			"uw-test2": {
				label: "进行损毁性的编辑测试",
				summary: "层级2：进行编辑测试"
			},
			"uw-delete2": {
				label: "不恰当地移除页面内容、模板或资料",
				summary: "层级2：不恰当地移除页面内容、模板或资料"
			},
			"uw-redirect2": {
				label: "创建恶意重定向",
				summary: "层级2：创建恶意重定向"
			},
			"uw-tdel2": {
				label: "在问题仍未解决的情况下移除维护性模板",
				summary: "层级2：移除维护性模板"
			},
			"uw-joke2": {
				label: "在百科全书内容中加入玩笑",
				summary: "层级2：加入不当玩笑"
			},
			"uw-create2": {
				label: "创建不当页面",
				summary: "层级2：创建不当页面"
			},
			"uw-upload2": {
				label: "上传不当图像",
				summary: "层级2：上传不当图像"
			},
			"uw-image2": {
				label: "在页面中加入不当图片",
				summary: "层级2：在页面中加入不当图片"
			},
			"uw-nor2": {
				label: "在条目中加入原创研究",
				summary: "层级2：在条目中加入原创研究"
			},
			"uw-politicalbias2": {
				label: "违反两岸用语方针",
				summary: "层级2：违反两岸用语方针"
			}
		},
		"增加商品或政治广告": {
			"uw-spam2": {
				label: "增加垃圾链接",
				summary: "层级2：增加垃圾链接"
			},
			"uw-advert2": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级2：利用维基百科来发布广告或推广"
			},
			"uw-npov2": {
				label: "不遵守中立的观点方针",
				summary: "层级2：不遵守中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-unsourced2": {
				label: "加入没有可靠来源佐证的内容",
				summary: "层级2：加入没有可靠来源佐证的内容"
			},
			"uw-error2": {
				label: "故意加入不实内容",
				summary: "层级2：故意加入不实内容"
			},
			"uw-biog2": {
				label: "在生者传记中加入没有可靠来源佐证而且可能引发争议的内容",
				summary: "层级2：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容"
			},
			"uw-defamatory2": {
				label: "加入诽谤内容",
				summary: "层级2：加入诽谤内容"
			}
		},
		"翻译品质": {
			"uw-roughtranslation2": {
				label: "粗劣翻译",
				summary: "层级2：粗劣翻译"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-notcensored2": {
				label: "内容审查",
				summary: "层级2：内容审查"
			},
			"uw-mos2": {
				label: "不恰当的条目格式、日期、语言等",
				summary: "层级2：不恰当的条目格式、日期、语言等"
			},
			"uw-move2": {
				label: "把页面移动到不恰当、违反命名常规或违反共识的标题",
				summary: "层级2：不恰当地移动页面"
			},
			"uw-cd2": {
				label: "清空讨论页",
				summary: "层级2：清空讨论页"
			},
			"uw-chat2": {
				label: "在讨论页发表与改善条目无关的内容",
				summary: "层级2：在讨论页发表与改善条目无关的内容"
			},
			"uw-tpv2": {
				label: "修改他人留言",
				summary: "层级2：修改他人留言"
			},
			"uw-afd2": {
				label: "移除{{afd}}（页面存废讨论）模板",
				summary: "层级2：移除{{afd}}（页面存废讨论）模板"
			},
			"uw-speedy2": {
				label: "移除{{delete}}（快速删除）模板",
				summary: "层级2：移除{{delete}}（快速删除）模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa2": {
				label: "针对特定用户的人身攻击",
				summary: "层级2：针对特定用户的人身攻击"
			},
			"uw-agf2": {
				label: "没有假定善意",
				summary: "层级2：没有假定善意"
			},
			"uw-own2": {
				label: "主张条目的所有权",
				summary: "层级2：主张条目的所有权"
			},
			"uw-tempabuse2": {
				label: "不当使用警告或封禁模板",
				summary: "层级2：不当使用警告或封禁模板"
			}
		}
	},


	level3: {
		"不同类型的非建设编辑": {
			"uw-vandalism3": {
				label: "恶意破坏",
				summary: "层级3：恶意破坏"
			},
			"uw-test3": {
				label: "编辑测试",
				summary: "层级3：编辑测试"
			},
			"uw-delete3": {
				label: "不恰当地移除页面内容、模板或资料",
				summary: "层级3：不恰当地移除页面内容、模板或资料"
			},
			"uw-redirect3": {
				label: "创建恶意重定向",
				summary: "层级3：创建恶意重定向"
			},
			"uw-tdel3": {
				label: "移除维护性模板",
				summary: "层级3：移除维护性模板"
			},
			"uw-joke3": {
				label: "在百科全书内容中加入不当玩笑",
				summary: "层级3：在百科全书内容中加入不当玩笑"
			},
			"uw-create3": {
				label: "创建不当页面",
				summary: "层级3：创建不当页面"
			},
			"uw-upload3": {
				label: "上传不当图像",
				summary: "层级3：上传不当图像"
			},
			"uw-image3": {
				label: "在页面中加入不当图片",
				summary: "层级3：在页面中加入不当图片"
			},
			"uw-nor3": {
				label: "在条目中加入原创研究",
				summary: "层级3：在条目中加入原创研究"
			},
			"uw-politicalbias3": {
				label: "违反两岸用语方针",
				summary: "层级3：违反两岸用语方针"
			}
		},
		"增加商品或政治广告": {
			"uw-spam3": {
				label: "增加垃圾链接",
				summary: "层级3：增加垃圾链接"
			},
			"uw-advert3": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级3：利用维基百科来发布广告或推广"
			},
			"uw-npov3": {
				label: "违反中立的观点方针",
				summary: "层级3：违反中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-unsourced3": {
				label: "加入没有可靠来源佐证的内容",
				summary: "层级3：加入没有可靠来源佐证的内容"
			},
			"uw-error3": {
				label: "故意加入不实内容",
				summary: "层级3：故意加入不实内容"
			},
			"uw-biog3": {
				label: "在生者传记中加入没有可靠来源佐证而且带有争议的内容",
				summary: "层级3：在生者传记中加入没有可靠来源佐证而且可能引发争议的内容"
			},
			"uw-defamatory3": {
				label: "加入诽谤内容",
				summary: "层级3：加入诽谤内容"
			}
		},
		"翻译品质": {
			"uw-roughtranslation3": {
				label: "粗劣翻译",
				summary: "层级3：粗劣翻译"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-notcensored3": {
				label: "审查内容",
				summary: "层级3：审查内容"
			},
			"uw-mos3": {
				label: "违反格式、日期、语言等规定",
				summary: "层级3：违反格式、日期、语言等规定"
			},
			"uw-move3": {
				label: "不恰当地移动页面",
				summary: "层级3：不恰当地移动页面"
			},
			"uw-cd3": {
				label: "清空讨论页",
				summary: "层级3：清空讨论页"
			},
			"uw-chat3": {
				label: "在讨论页发表无关内容",
				summary: "层级3：在讨论页发表无关内容"
			},
			"uw-tpv3": {
				label: "修改他人留言",
				summary: "层级3：修改他人留言"
			},
			"uw-afd3": {
				label: "移除{{afd}}（页面存废讨论）模板",
				summary: "层级3：移除{{afd}}（页面存废讨论）模板"
			},
			"uw-speedy3": {
				label: "移除{{delete}}（快速删除）模板",
				summary: "层级3：移除{{delete}}（快速删除）模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa3": {
				label: "针对特定用户的人身攻击",
				summary: "层级3：针对特定用户的人身攻击"
			},
			"uw-agf3": {
				label: "没有假定善意",
				summary: "层级3：没有假定善意"
			},
			"uw-own3": {
				label: "主张条目的所有权",
				summary: "层级3：主张条目的所有权"
			},
			"uw-tempabuse3": {
				label: "不当使用警告或封禁模板",
				summary: "层级3：不当使用警告或封禁模板"
			}
		}
	},


	level4: {
		"不同类型的非建设编辑": {
			"uw-vandalism4": {
				label: "恶意破坏",
				summary: "层级4：恶意破坏"
			},
			"uw-test4": {
				label: "编辑测试",
				summary: "层级4：编辑测试"
			},
			"uw-delete4": {
				label: "移除页面、移除内容或模板",
				summary: "层级4：移除页面、移除内容或模板"
			},
			"uw-redirect4": {
				label: "创建恶意重定向",
				summary: "层级4：创建恶意重定向"
			},
			"uw-tdel4": {
				label: "移除维护性模板",
				summary: "层级4：移除维护性模板"
			},
			"uw-joke4": {
				label: "在百科全书内容中加入不当玩笑",
				summary: "层级4：在百科全书内容中加入不当玩笑"
			},
			"uw-create4": {
				label: "创建不当页面",
				summary: "层级4：创建不当页面"
			},
			"uw-upload4": {
				label: "上传不当图像",
				summary: "层级4：上传不当图像"
			},
			"uw-image4": {
				label: "在页面中加入不当图片",
				summary: "层级4：在页面中加入不当图片"
			},
			"uw-politicalbias4": {
				label: "违反两岸用语方针",
				summary: "层级4：违反两岸用语方针"
			}
		},
		"增加商品或政治广告": {
			"uw-spam4": {
				label: "增加垃圾链接",
				summary: "层级4：增加垃圾链接"
			},
			"uw-advert4": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级4：利用维基百科来发布广告或推广"
			},
			"uw-npov4": {
				label: "违反中立的观点方针",
				summary: "层级4：违反中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-biog4": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级4：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory4": {
				label: "加入诽谤内容",
				summary: "层级4：加入诽谤内容"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-mos4": {
				label: "违反格式、日期、语言等相关规定",
				summary: "层级4：违反格式、日期、语言等相关规定"
			},
			"uw-move4": {
				label: "不恰当地移动页面",
				summary: "层级4：不恰当地移动页面"
			},
			"uw-chat4": {
				label: "在讨论页进行不当讨论",
				summary: "层级4：在讨论页进行不当讨论"
			},
			"uw-afd4": {
				label: "移除{{afd}}模板",
				summary: "层级4：移除{{afd}}模板"
			},
			"uw-speedy4": {
				label: "移除{{delete}}模板",
				summary: "层级4：移除{{delete}}模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa4": {
				label: "针对特定用户的人身攻击",
				summary: "层级4：针对特定用户的人身攻击"
			},
			"uw-tempabuse4": {
				label: "不当使用警告或封禁模板",
				summary: "层级4：不当使用警告或封禁模板"
			}
		}
	},


	level4im: {
		"不同类型的非建设编辑": {
			"uw-vandalism4im": {
				label: "恶意破坏",
				summary: "层级4im：恶意破坏"
			},
			"uw-delete4im": {
				label: "移除页面内容、模板或资料",
				summary: "层级4im：移除页面内容、模板或资料"
			},
			"uw-redirect4im": {
				label: "创建恶意重定向",
				summary: "层级4im：创建恶意重定向"
			},
			"uw-joke4im": {
				label: "加入不当玩笑",
				summary: "层级4im：加入不当玩笑"
			},
			"uw-create4im": {
				label: "创建不当页面",
				summary: "层级4im：创建不当页面"
			},
			"uw-upload4im": {
				label: "上传不当图像",
				summary: "层级4im：上传不当图像"
			},
			"uw-image4im": {
				label: "加入不恰当的图片",
				summary: "层级4im：加入不恰当的图片"
			},
			"uw-politicalbias4im": {
				label: "违反两岸用语方针",
				summary: "层级4im：违反两岸用语方针"
			}
		},
		"增加商品或政治广告": {
			"uw-spam4im": {
				label: "增加垃圾连结",
				summary: "层级4im：增加垃圾连结"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-biog4im": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级4im：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory4im": {
				label: "加入诽谤内容",
				summary: "层级4im：加入诽谤内容"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-move4im": {
				label: "不恰当地移动页面",
				summary: "层级4im：不恰当地移动页面"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa4im": {
				label: "针对特定用户的人身攻击",
				summary: "层级4im：针对特定用户的人身攻击"
			},
			"uw-tempabuse4im": {
				label: "不当使用警告或封禁模板",
				summary: "层级4im：不当使用警告或封禁模板"
			}
		}
	},

	singlenotice: {
		"uw-2redirect": {
			label: "在移动页面后应该修复双重重定向",
			summary: "单层级通知：在移动页面后应该修复双重重定向"
		},
		"uw-aiv": {
			label: "举报的并不是破坏者，或者举报破坏前未进行警告",
			summary: "单层级通知：不恰当地举报破坏"
		},
		"uw-articlesig": {
			label: "在条目中签名",
			summary: "单层级通知：在条目中签名"
		},
		"uw-autobiography": {
			label: "建立自传",
			summary: "单层级通知：建立自传"
		},
		"uw-badcat": {
			label: "加入错误的页面分类",
			summary: "单层级通知：加入错误的页面分类"
		},
		"uw-bite": {
			label: "伤害新手",
			summary: "单层级通知：伤害新手"
		},
		"uw-booktitle": {
			label: "没有使用书名号来标示书籍、电影、音乐专辑等",
			summary: "单层级通知：没有使用书名号来标示书籍、电影、音乐专辑等"
		},
		"uw-c&pmove": {
			label: "剪贴移动",
			summary: "单层级通知：剪贴移动"
		},
		"uw-chinese": {
			label: "不是以中文进行沟通",
			summary: "单层级通知：不是以中文进行沟通"
		},
		"uw-coi": {
			label: "利益冲突",
			summary: "单层级通知：利益冲突"
		},
		"uw-copyright-friendly": {
			label: "初次加入侵犯版权的内容",
			summary: "单层级通知：初次加入侵犯版权的内容"
		},
		"uw-copyviorewrite": {
			label: "在侵权页面直接重写条目",
			summary: "单层级通知：在侵权页面直接重写条目"
		},
		"uw-crystal": {
			label: "加入臆测或未确认的讯息",
			summary: "单层级通知：加入臆测或未确认的讯息"
		},
		"uw-csd": {
			label: "快速删除理由不当",
			summary: "单层级通知：快速删除理由不当"
		},
		"uw-dab": {
			label: "消歧义页格式错误",
			summary: "单层级通知：消歧义页格式错误"
		},
		"uw-date": {
			label: "不必要地更换日期格式",
			summary: "单层级通知：不必要地更换日期格式"
		},
		"uw-editsummary": {
			label: "没有使用编辑摘要",
			summary: "单层级通知：没有使用编辑摘要"
		},
		"uw-hangon": {
			label: "没有在讨论页说明暂缓快速删除理由",
			summary: "单层级通知：没有在讨论页说明暂缓快速删除理由"
		},
		"uw-lang": {
			label: "不必要地将条目所有文字换成简体或繁体中文",
			summary: "单层级通知：不必要地将条目所有文字换成简体或繁体中文"
		},
		"uw-langmove": {
			label: "不必要地将条目标题换成简体或繁体中文",
			summary: "单层级通知：不必要地将条目标题换成简体或繁体中文"
		},
		"uw-linking": {
			label: "过度加入红字连结或重复蓝字连结",
			summary: "单层级通知：过度加入红字连结或重复蓝字连结"
		},
		"uw-minor": {
			label: "不适当地使用小修改选项",
			summary: "单层级通知：不适当地使用小修改选项"
		},
		"uw-notaiv": {
			label: "向“当前的破坏”中报告的是用户纷争而不是破坏",
			summary: "单层级通知：向“当前的破坏”中报告的是用户纷争而不是破坏"
		},
		"uw-notvote": {
			label: "我们以共识处事，而不仅仅是投票",
			summary: "单层级通知：我们以共识处事，而不仅仅是投票"
		},
		"uw-preview": {
			label: "请使用预览按钮来避免不必要的错误",
			summary: "单层级通知：请使用预览按钮来避免不必要的错误"
		},
		"uw-sandbox": {
			label: "移除沙盒的置顶模板{{sandbox}}",
			summary: "单层级通知：移除沙盒的置顶模板{{sandbox}}"
		},
		"uw-selfrevert": {
			label: "感谢您自行回退自己的测试，以后不要再这样做了",
			summary: "单层级通知：回退个人的测试"
		},
		"uw-subst": {
			label: "谨记要替代模板（subst）",
			summary: "单层级通知：谨记要替代模板"
		},
		"uw-talkinarticle": {
			label: "在条目页中留下意见",
			summary: "单层级通知：在条目页中留下意见"
		},
		"uw-tilde": {
			label: "没有在讨论页上签名",
			summary: "单层级通知：没有在讨论页上签名"
		},
		"uw-translated": {
			label: "翻译条目未标注原作者",
			summary: "单层级通知：翻译条目未标注原作者"
		},
		"uw-uaa": {
			label: "向需要管理员注意的用户名报告的用户名称并不违反方针",
			summary: "单层级通知：向需要管理员注意的用户名报告的用户名称并不违反方针"
		},
		"uw-warn": {
			label: "警告破坏用户",
			summary: "单层级通知：警告破坏用户"
		},
		"uw-mosiw": {
			label: "不要使用跨语言链接",
			summary: "单层级通知：不要使用跨语言链接"
		},
		"uw-badtwinkle": {
			label: "不恰当地使用Twinkle警告别人",
			summary: "单层级通知：不恰当地使用Twinkle警告别人"
		},
	},


	singlewarn: {
		"uw-3rr": {
			label: "用户潜在违反回退不过三原则的可能性",
			summary: "单层级警告：用户潜在违反回退不过三原则的可能性"
		},
		"uw-attack": {
			label: "建立人身攻击页面",
			summary: "单层级警告：建立人身攻击页面",
			suppressArticleInSummary: true
		},
		"uw-bv": {
			label: "公然地破坏",
			summary: "单层级警告：公然地破坏"
		},
		"uw-canvass": {
			label: "不恰当地拉票",
			summary: "单层级警告：不恰当地拉票"
		},
		"uw-copyright": {
			label: "侵犯版权",
			summary: "单层级警告：侵犯版权"
		},
		"uw-copyright-link": {
			label: "连结到有版权的材料",
			summary: "单层级警告：连结到有版权的材料"
		},
		"uw-fakesource": {
			label: "虚构资料来源或引文",
			summary: "单层级警告：虚构资料来源或引文"
		},
		"uw-hoax": {
			label: "建立恶作剧",
			summary: "单层级警告：建立恶作剧"
		},
		"uw-incompletecite": {
			label: "列出的资料来源欠缺若干详情而不易查找",
			summary: "单层级警告：列出的资料来源欠缺若干详情而不易查找"
		},
		"uw-legal": {
			label: "诉诸法律威胁",
			summary: "单层级警告：诉诸法律威胁"
		},
		"uw-longterm": {
			label: "长期的破坏",
			summary: "单层级警告：长期的破坏"
		},
		"uw-multipleIPs": {
			label: "使用多个IP地址",
			summary: "单层级警告：使用多个IP地址"
		},
		"uw-npov-tvd": {
			label: "在剧集条目中加入奸角等非中立描述",
			summary: "单层级警告：在剧集条目中加入奸角等非中立描述"
		},
		"uw-pinfo": {
			label: "张贴他人隐私",
			summary: "单层级警告：张贴他人隐私"
		},
		"uw-upv": {
			label: "破坏他人用户页",
			summary: "单层级警告：破坏他人用户页"
		},
		"uw-selfinventedname": {
			label: "不适当地自创新名词、新译名",
			summary: "单层级警告：不适当地自创新名词、新译名"
		},
		"uw-substub": {
			label: "创建小小作品",
			summary: "单层级警告：创建小小作品"
		},
		"uw-username": {
			label: "使用不恰当的用户名",
			summary: "单层级警告：使用不恰当的用户名"
		},
		"uw-wrongsummary": {
			label: "在编辑摘要制造不适当的内容",
			summary: "单层级警告：在编辑摘要制造不适当的内容"
		},
	}
}, {
	level1: {
		"不同類別的非建設編輯": {
			"uw-vandalism1": {
				label: "明顯的破壞",
				summary: "層級1：明顯破壞"
			},
			"uw-test1": {
				label: "進行編輯測試而未及時清理",
				summary: "層級1：進行編輯測試而未及時清理"
			},
			"uw-delete1": {
				label: "不恰當地移除頁面內容、模板或資料",
				summary: "層級1：不恰當地頁面條目內容、模板或資料"
			},
			"uw-redirect1": {
				label: "建立破壞性的重定向",
				summary: "層級1：建立破壞性的重定向"
			},
			"uw-tdel1": {
				label: "在問題仍未解決的情況下移除維護性模板",
				summary: "層級1：移除維護性模板"
			},
			"uw-joke1": {
				label: "在百科全書內容中加入玩笑",
				summary: "層級1：加入不當玩笑"
			},
			"uw-create1": {
				label: "建立不當頁面",
				summary: "層級1：建立不當頁面"
			},
			"uw-upload1": {
				label: "上傳不當圖像",
				summary: "層級1：上傳不當圖像"
			},
			"uw-image1": {
				label: "在頁面中加入不當圖片",
				summary: "層級1：在頁面中加入不當圖片"
			},
			"uw-nor1": {
				label: "在條目中加入原創研究",
				summary: "層級1：在條目中加入原創研究"
			},
			"uw-politicalbias1": {
				label: "違反兩岸用語方針",
				summary: "層級1：違反兩岸用語方針"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam1": {
				label: "增加不合適的外部連結",
				summary: "層級1：增加不合適的外部連結"
			},
			"uw-advert1": {
				label: "利用維基百科來發布廣告或推廣",
				summary: "層級1：利用維基百科來發布廣告或推廣"
			},
			"uw-npov1": {
				label: "不遵守中立的觀點方針",
				summary: "層級1：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced1": {
				label: "加入沒有可靠來源佐證的內容",
				summary: "層級1：加入沒有可靠來源佐證的內容"
			},
			"uw-error1": {
				label: "故意加入不實內容",
				summary: "層級1：故意加入不實內容"
			},
			"uw-biog1": {
				label: "在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容",
				summary: "層級1：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容"
			},
			"uw-defamatory1": {
				label: "加入誹謗內容",
				summary: "層級1：加入誹謗內容"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation1": {
				label: "您翻譯的質量有待改善",
				summary: "您翻譯的質量有待改善"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored1": {
				label: "因為「內容使人反感」而刪除條目內容",
				summary: "層級1：審查條目內容"
			},
			"uw-mos1": {
				label: "不恰當的條目格式、日期、語言等",
				summary: "層級1：不恰當的條目格式、日期、語言等"
			},
			"uw-move1": {
				label: "無故移動條目/新名稱不符合命名規範",
				summary: "層級1：不恰當地移動頁面"
			},
			"uw-cd1": {
				label: "清空討論頁",
				summary: "層級1：清空討論頁"
			},
			"uw-chat1": {
				label: "在討論頁發表與改善條目無關的內容",
				summary: "層級1：在討論頁發表與改善條目無關的內容"
			},
			"uw-tpv1": {
				label: "修改他人留言",
				summary: "層級1：修改他人留言"
			},
			"uw-afd1": {
				label: "移除{{afd}}（頁面存廢討論）模板",
				summary: "層級1：移除{{afd}}（頁面存廢討論）模板"
			},
			"uw-speedy1": {
				label: "移除{{delete}}（快速刪除）模板",
				summary: "層級1：移除{{delete}}（快速刪除）模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa1": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級1：針對特定用戶的人身攻擊"
			},
			"uw-agf1": {
				label: "沒有假定善意",
				summary: "層級1：沒有假定善意"
			},
			"uw-own1": {
				label: "主張條目所有權",
				summary: "層級1：主張條目所有權"
			},
			"uw-tempabuse1": {
				label: "不當使用警告或封禁模板",
				summary: "層級1：不當使用警告或封禁模板"
			}
		}
	},


	level2: {
		"不同類別的非建設編輯": {
			"uw-vandalism2": {
				label: "明顯的破壞",
				summary: "層級2：明顯破壞"
			},
			"uw-test2": {
				label: "進行損毀性的編輯測試",
				summary: "層級2：進行編輯測試"
			},
			"uw-delete2": {
				label: "不恰當地移除頁面內容、模板或資料",
				summary: "層級2：不恰當地移除頁面內容、模板或資料"
			},
			"uw-redirect2": {
				label: "建立惡意重定向",
				summary: "層級2：建立惡意重定向"
			},
			"uw-tdel2": {
				label: "在問題仍未解決的情況下移除維護性模板",
				summary: "層級2：移除維護性模板"
			},
			"uw-joke2": {
				label: "在百科全書內容中加入玩笑",
				summary: "層級2：加入不當玩笑"
			},
			"uw-create2": {
				label: "建立不當頁面",
				summary: "層級2：建立不當頁面"
			},
			"uw-upload2": {
				label: "上傳不當圖像",
				summary: "層級2：上傳不當圖像"
			},
			"uw-image2": {
				label: "在頁面中加入不當圖片",
				summary: "層級2：在頁面中加入不當圖片"
			},
			"uw-nor2": {
				label: "在條目中加入原創研究",
				summary: "層級2：在條目中加入原創研究"
			},
			"uw-politicalbias2": {
				label: "違反兩岸用語方針",
				summary: "層級2：違反兩岸用語方針"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam2": {
				label: "增加垃圾連結",
				summary: "層級2：增加垃圾連結"
			},
			"uw-advert2": {
				label: "利用維基百科來發布廣告或推廣",
				summary: "層級2：利用維基百科來發布廣告或推廣"
			},
			"uw-npov2": {
				label: "不遵守中立的觀點方針",
				summary: "層級2：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced2": {
				label: "加入沒有可靠來源佐證的內容",
				summary: "層級2：加入沒有可靠來源佐證的內容"
			},
			"uw-error2": {
				label: "故意加入不實內容",
				summary: "層級2：故意加入不實內容"
			},
			"uw-biog2": {
				label: "在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容",
				summary: "層級2：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容"
			},
			"uw-defamatory2": {
				label: "加入誹謗內容",
				summary: "層級2：加入誹謗內容"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation2": {
				label: "粗劣翻譯",
				summary: "層級2：粗劣翻譯"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored2": {
				label: "內容審查",
				summary: "層級2：內容審查"
			},
			"uw-mos2": {
				label: "不恰當的條目格式、日期、語言等",
				summary: "層級2：不恰當的條目格式、日期、語言等"
			},
			"uw-move2": {
				label: "把頁面移動到不恰當、違反命名常規或違反共識的標題",
				summary: "層級2：不恰當地移動頁面"
			},
			"uw-cd2": {
				label: "清空討論頁",
				summary: "層級2：清空討論頁"
			},
			"uw-chat2": {
				label: "在討論頁發表與改善條目無關的內容",
				summary: "層級2：在討論頁發表與改善條目無關的內容"
			},
			"uw-tpv2": {
				label: "修改他人留言",
				summary: "層級2：修改他人留言"
			},
			"uw-afd2": {
				label: "移除{{afd}}（頁面存廢討論）模板",
				summary: "層級2：移除{{afd}}（頁面存廢討論）模板"
			},
			"uw-speedy2": {
				label: "移除{{delete}}（快速刪除）模板",
				summary: "層級2：移除{{delete}}（快速刪除）模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa2": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級2：針對特定用戶的人身攻擊"
			},
			"uw-agf2": {
				label: "沒有假定善意",
				summary: "層級2：沒有假定善意"
			},
			"uw-own2": {
				label: "主張條目的所有權",
				summary: "層級2：主張條目的所有權"
			},
			"uw-tempabuse2": {
				label: "不當使用警告或封禁模板",
				summary: "層級2：不當使用警告或封禁模板"
			}
		}
	},


	level3: {
		"不同類別的非建設編輯": {
			"uw-vandalism3": {
				label: "惡意破壞",
				summary: "層級3：惡意破壞"
			},
			"uw-test3": {
				label: "編輯測試",
				summary: "層級3：編輯測試"
			},
			"uw-delete3": {
				label: "不恰當地移除頁面內容、模板或資料",
				summary: "層級3：不恰當地移除頁面內容、模板或資料"
			},
			"uw-redirect3": {
				label: "建立惡意重定向",
				summary: "層級3：建立惡意重定向"
			},
			"uw-tdel3": {
				label: "移除維護性模板",
				summary: "層級3：移除維護性模板"
			},
			"uw-joke3": {
				label: "在百科全書內容中加入不當玩笑",
				summary: "層級3：在百科全書內容中加入不當玩笑"
			},
			"uw-create3": {
				label: "建立不當頁面",
				summary: "層級3：建立不當頁面"
			},
			"uw-upload3": {
				label: "上傳不當圖像",
				summary: "層級3：上傳不當圖像"
			},
			"uw-image3": {
				label: "在頁面中加入不當圖片",
				summary: "層級3：在頁面中加入不當圖片"
			},
			"uw-nor3": {
				label: "在條目中加入原創研究",
				summary: "層級3：在條目中加入原創研究"
			},
			"uw-politicalbias3": {
				label: "違反兩岸用語方針",
				summary: "層級3：違反兩岸用語方針"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam3": {
				label: "增加垃圾連結",
				summary: "層級3：增加垃圾連結"
			},
			"uw-advert3": {
				label: "利用維基百科來發布廣告或推廣",
				summary: "層級3：利用維基百科來發布廣告或推廣"
			},
			"uw-npov3": {
				label: "違反中立的觀點方針",
				summary: "層級3：違反中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced3": {
				label: "加入沒有可靠來源佐證的內容",
				summary: "層級3：加入沒有可靠來源佐證的內容"
			},
			"uw-error3": {
				label: "故意加入不實內容",
				summary: "層級3：故意加入不實內容"
			},
			"uw-biog3": {
				label: "在生者傳記中加入沒有可靠來源佐證而且帶有爭議的內容",
				summary: "層級3：在生者傳記中加入沒有可靠來源佐證而且可能引發爭議的內容"
			},
			"uw-defamatory3": {
				label: "加入誹謗內容",
				summary: "層級3：加入誹謗內容"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation3": {
				label: "粗劣翻譯",
				summary: "層級3：粗劣翻譯"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored3": {
				label: "審查內容",
				summary: "層級3：審查內容"
			},
			"uw-mos3": {
				label: "違反格式、日期、語言等規定",
				summary: "層級3：違反格式、日期、語言等規定"
			},
			"uw-move3": {
				label: "不恰當地移動頁面",
				summary: "層級3：不恰當地移動頁面"
			},
			"uw-cd3": {
				label: "清空討論頁",
				summary: "層級3：清空討論頁"
			},
			"uw-chat3": {
				label: "在討論頁發表無關內容",
				summary: "層級3：在討論頁發表無關內容"
			},
			"uw-tpv3": {
				label: "修改他人留言",
				summary: "層級3：修改他人留言"
			},
			"uw-afd3": {
				label: "移除{{afd}}（頁面存廢討論）模板",
				summary: "層級3：移除{{afd}}（頁面存廢討論）模板"
			},
			"uw-speedy3": {
				label: "移除{{delete}}（快速刪除）模板",
				summary: "層級3：移除{{delete}}（快速刪除）模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa3": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級3：針對特定用戶的人身攻擊"
			},
			"uw-agf3": {
				label: "沒有假定善意",
				summary: "層級3：沒有假定善意"
			},
			"uw-own3": {
				label: "主張條目的所有權",
				summary: "層級3：主張條目的所有權"
			},
			"uw-tempabuse3": {
				label: "不當使用警告或封禁模板",
				summary: "層級3：不當使用警告或封禁模板"
			}
		}
	},


	level4: {
		"不同類別的非建設編輯": {
			"uw-vandalism4": {
				label: "惡意破壞",
				summary: "層級4：惡意破壞"
			},
			"uw-test4": {
				label: "編輯測試",
				summary: "層級4：編輯測試"
			},
			"uw-delete4": {
				label: "移除頁面、移除內容或模板",
				summary: "層級4：移除頁面、移除內容或模板"
			},
			"uw-redirect4": {
				label: "建立惡意重定向",
				summary: "層級4：建立惡意重定向"
			},
			"uw-tdel4": {
				label: "移除維護性模板",
				summary: "層級4：移除維護性模板"
			},
			"uw-joke4": {
				label: "在百科全書內容中加入不當玩笑",
				summary: "層級4：在百科全書內容中加入不當玩笑"
			},
			"uw-create4": {
				label: "建立不當頁面",
				summary: "層級4：建立不當頁面"
			},
			"uw-upload4": {
				label: "上傳不當圖像",
				summary: "層級4：上傳不當圖像"
			},
			"uw-image4": {
				label: "在頁面中加入不當圖片",
				summary: "層級4：在頁面中加入不當圖片"
			},
			"uw-politicalbias4": {
				label: "違反兩岸用語方針",
				summary: "層級4：違反兩岸用語方針"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam4": {
				label: "增加垃圾連結",
				summary: "層級4：增加垃圾連結"
			},
			"uw-advert4": {
				label: "利用維基百科來發布廣告或推廣",
				summary: "層級4：利用維基百科來發布廣告或推廣"
			},
			"uw-npov4": {
				label: "違反中立的觀點方針",
				summary: "層級4：違反中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-biog4": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級4：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory4": {
				label: "加入誹謗內容",
				summary: "層級4：加入誹謗內容"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-mos4": {
				label: "違反格式、日期、語言等相關規定",
				summary: "層級4：違反格式、日期、語言等相關規定"
			},
			"uw-move4": {
				label: "不恰當地移動頁面",
				summary: "層級4：不恰當地移動頁面"
			},
			"uw-chat4": {
				label: "在討論頁進行不當討論",
				summary: "層級4：在討論頁進行不當討論"
			},
			"uw-afd4": {
				label: "移除{{afd}}模板",
				summary: "層級4：移除{{afd}}模板"
			},
			"uw-speedy4": {
				label: "移除{{delete}}模板",
				summary: "層級4：移除{{delete}}模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa4": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級4：針對特定用戶的人身攻擊"
			},
			"uw-tempabuse4": {
				label: "不當使用警告或封禁模板",
				summary: "層級4：不當使用警告或封禁模板"
			}
		}
	},


	level4im: {
		"不同類別的非建設編輯": {
			"uw-vandalism4im": {
				label: "惡意破壞",
				summary: "層級4im：惡意破壞"
			},
			"uw-delete4im": {
				label: "移除頁面內容、模板或資料",
				summary: "層級4im：移除頁面內容、模板或資料"
			},
			"uw-redirect4im": {
				label: "建立惡意重定向",
				summary: "層級4im：建立惡意重定向"
			},
			"uw-joke4im": {
				label: "加入不當玩笑",
				summary: "層級4im：加入不當玩笑"
			},
			"uw-create4im": {
				label: "建立不當頁面",
				summary: "層級4im：建立不當頁面"
			},
			"uw-upload4im": {
				label: "上傳不當圖像",
				summary: "層級4im：上傳不當圖像"
			},
			"uw-image4im": {
				label: "加入不恰當的圖片",
				summary: "層級4im：加入不恰當的圖片"
			},
			"uw-politicalbias4im": {
				label: "違反兩岸用語方針",
				summary: "層級4im：違反兩岸用語方針"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam4im": {
				label: "增加垃圾連結",
				summary: "層級4im：增加垃圾連結"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-biog4im": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級4im：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory4im": {
				label: "加入誹謗內容",
				summary: "層級4im：加入誹謗內容"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-move4im": {
				label: "不恰當地移動頁面",
				summary: "層級4im：不恰當地移動頁面"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa4im": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級4im：針對特定用戶的人身攻擊"
			},
			"uw-tempabuse4im": {
				label: "不當使用警告或封禁模板",
				summary: "層級4im：不當使用警告或封禁模板"
			}
		}
	},

	singlenotice: {
		"uw-2redirect": {
			label: "在移動頁面後應該修復雙重重定向",
			summary: "單層級通知：在移動頁面後應該修復雙重重定向"
		},
		"uw-aiv": {
			label: "舉報的並不是破壞者，或者舉報破壞前未進行警告",
			summary: "單層級通知：不恰當地舉報破壞"
		},
		"uw-articlesig": {
			label: "在條目中簽名",
			summary: "單層級通知：在條目中簽名"
		},
		"uw-autobiography": {
			label: "建立自傳",
			summary: "單層級通知：建立自傳"
		},
		"uw-badcat": {
			label: "加入錯誤的頁面分類",
			summary: "單層級通知：加入錯誤的頁面分類"
		},
		"uw-bite": {
			label: "傷害新手",
			summary: "單層級通知：傷害新手"
		},
		"uw-booktitle": {
			label: "沒有使用書名號來標示書籍、電影、音樂專輯等",
			summary: "單層級通知：沒有使用書名號來標示書籍、電影、音樂專輯等"
		},
		"uw-c&pmove": {
			label: "剪貼移動",
			summary: "單層級通知：剪貼移動"
		},
		"uw-chinese": {
			label: "不是以中文進行溝通",
			summary: "單層級通知：不是以中文進行溝通"
		},
		"uw-coi": {
			label: "利益衝突",
			summary: "單層級通知：利益衝突"
		},
		"uw-copyright-friendly": {
			label: "初次加入侵犯版權的內容",
			summary: "單層級通知：初次加入侵犯版權的內容"
		},
		"uw-copyviorewrite": {
			label: "在侵權頁面直接重寫條目",
			summary: "單層級通知：在侵權頁面直接重寫條目"
		},
		"uw-crystal": {
			label: "加入臆測或未確認的訊息",
			summary: "單層級通知：加入臆測或未確認的訊息"
		},
		"uw-csd": {
			label: "快速刪除理由不當",
			summary: "單層級通知：快速刪除理由不當"
		},
		"uw-dab": {
			label: "消歧義頁格式錯誤",
			summary: "單層級通知：消歧義頁格式錯誤"
		},
		"uw-date": {
			label: "不必要地更換日期格式",
			summary: "單層級通知：不必要地更換日期格式"
		},
		"uw-editsummary": {
			label: "沒有使用編輯摘要",
			summary: "單層級通知：沒有使用編輯摘要"
		},
		"uw-hangon": {
			label: "沒有在討論頁說明暫緩快速刪除理由",
			summary: "單層級通知：沒有在討論頁說明暫緩快速刪除理由"
		},
		"uw-lang": {
			label: "不必要地將條目所有文字換成簡體或繁體中文",
			summary: "單層級通知：不必要地將條目所有文字換成簡體或繁體中文"
		},
		"uw-langmove": {
			label: "不必要地將條目標題換成簡體或繁體中文",
			summary: "單層級通知：不必要地將條目標題換成簡體或繁體中文"
		},
		"uw-linking": {
			label: "過度加入紅字連結或重複藍字連結",
			summary: "單層級通知：過度加入紅字連結或重複藍字連結"
		},
		"uw-minor": {
			label: "不適當地使用小修改選項",
			summary: "單層級通知：不適當地使用小修改選項"
		},
		"uw-notaiv": {
			label: "向「當前的破壞」中報告的是用戶紛爭而不是破壞",
			summary: "單層級通知：向「當前的破壞」中報告的是用戶紛爭而不是破壞"
		},
		"uw-notvote": {
			label: "我們以共識處事，而不僅僅是投票",
			summary: "單層級通知：我們以共識處事，而不僅僅是投票"
		},
		"uw-preview": {
			label: "請使用預覽按鈕來避免不必要的錯誤",
			summary: "單層級通知：請使用預覽按鈕來避免不必要的錯誤"
		},
		"uw-sandbox": {
			label: "移除沙盒的置頂模板{{sandbox}}",
			summary: "單層級通知：移除沙盒的置頂模板{{sandbox}}"
		},
		"uw-selfrevert": {
			label: "感謝您自行回退自己的測試，以後不要再這樣做了",
			summary: "單層級通知：回退個人的測試"
		},
		"uw-subst": {
			label: "謹記要替代模板（subst）",
			summary: "單層級通知：謹記要替代模板"
		},
		"uw-talkinarticle": {
			label: "在條目頁中留下意見",
			summary: "單層級通知：在條目頁中留下意見"
		},
		"uw-tilde": {
			label: "沒有在討論頁上簽名",
			summary: "單層級通知：沒有在討論頁上簽名"
		},
		"uw-translated": {
			label: "翻譯條目未標註原作者",
			summary: "單層級通知：翻譯條目未標註原作者"
		},
		"uw-uaa": {
			label: "向需要管理員注意的用戶名報告的用戶名稱並不違反方針",
			summary: "單層級通知：向需要管理員注意的用戶名報告的用戶名稱並不違反方針"
		},
		"uw-warn": {
			label: "警告破壞用戶",
			summary: "單層級通知：警告破壞用戶"
		},
		"uw-mosiw": {
			label: "不要使用跨語言連結",
			summary: "單層級通知：不要使用跨語言連結"
		},
		"uw-badtwinkle": {
			label: "不恰當地使用Twinkle警告別人",
			summary: "單層級通知：不恰當地使用Twinkle警告別人"
		},
	},


	singlewarn: {
		"uw-3rr": {
			label: "用戶潛在違反回退不過三原則的可能性",
			summary: "單層級警告：用戶潛在違反回退不過三原則的可能性"
		},
		"uw-attack": {
			label: "建立人身攻擊頁面",
			summary: "單層級警告：建立人身攻擊頁面",
			suppressArticleInSummary: true
		},
		"uw-bv": {
			label: "公然地破壞",
			summary: "單層級警告：公然地破壞"
		},
		"uw-canvass": {
			label: "不恰當地拉票",
			summary: "單層級警告：不恰當地拉票"
		},
		"uw-copyright": {
			label: "侵犯版權",
			summary: "單層級警告：侵犯版權"
		},
		"uw-copyright-link": {
			label: "連結到有版權的材料",
			summary: "單層級警告：連結到有版權的材料"
		},
		"uw-fakesource": {
			label: "虛構資料來源或引文",
			summary: "單層級警告：虛構資料來源或引文"
		},
		"uw-hoax": {
			label: "建立惡作劇",
			summary: "單層級警告：建立惡作劇"
		},
		"uw-incompletecite": {
			label: "列出的資料來源欠缺若干詳情而不易查找",
			summary: "單層級警告：列出的資料來源欠缺若干詳情而不易查找"
		},
		"uw-legal": {
			label: "訴諸法律威脅",
			summary: "單層級警告：訴諸法律威脅"
		},
		"uw-longterm": {
			label: "長期的破壞",
			summary: "單層級警告：長期的破壞"
		},
		"uw-multipleIPs": {
			label: "使用多個IP地址",
			summary: "單層級警告：使用多個IP地址"
		},
		"uw-npov-tvd": {
			label: "在劇集條目中加入奸角等非中立描述",
			summary: "單層級警告：在劇集條目中加入奸角等非中立描述"
		},
		"uw-pinfo": {
			label: "張貼他人隱私",
			summary: "單層級警告：張貼他人隱私"
		},
		"uw-upv": {
			label: "破壞他人用戶頁",
			summary: "單層級警告：破壞他人用戶頁"
		},
		"uw-selfinventedname": {
			label: "不適當地自創新名詞、新譯名",
			summary: "單層級警告：不適當地自創新名詞、新譯名"
		},
		"uw-substub": {
			label: "建立小小作品",
			summary: "單層級警告：建立小小作品"
		},
		"uw-username": {
			label: "使用不恰當的用戶名",
			summary: "單層級警告：使用不恰當的用戶名"
		},
		"uw-wrongsummary": {
			label: "在編輯摘要製造不適當的內容",
			summary: "單層級警告：在編輯摘要製造不適當的內容"
		},
	}
});

Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;

Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
	var value = e.target.value;
	var sub_group = e.target.root.sub_group;
	sub_group.main_group = value;
	var old_subvalue = sub_group.value;
	var old_subvalue_re;
	if( old_subvalue ) {
		old_subvalue = old_subvalue.replace(/\d*(im)?$/, '' );
		old_subvalue_re = new RegExp( mw.RegExp.escape( old_subvalue ) + "(\\d*(?:im)?)$" );
	}

	while( sub_group.hasChildNodes() ){
		sub_group.removeChild( sub_group.firstChild );
	}

	// worker function to create the combo box entries
	var createEntries = function( contents, container, wrapInOptgroup ) {
		// due to an apparent iOS bug, we have to add an option-group to prevent truncation of text
		// (search WT:TW archives for "Problem selecting warnings on an iPhone")
		if ( wrapInOptgroup && $.client.profile().platform === "iphone" ) {
			var wrapperOptgroup = new Morebits.quickForm.element( {
				type: 'optgroup',
				label: '可用模板'
			} );
			wrapperOptgroup = wrapperOptgroup.render();
			container.appendChild( wrapperOptgroup );
			container = wrapperOptgroup;
		}

		$.each( contents, function( itemKey, itemProperties ) {
			var key = (typeof itemKey === "string") ? itemKey : itemProperties.value;

			var selected = false;
			if( old_subvalue && old_subvalue_re.test( key ) ) {
				selected = true;
			}

			var elem = new Morebits.quickForm.element( {
				type: 'option',
				label: "{{" + key + "}}: " + itemProperties.label,
				value: key,
				selected: selected
			} );
			var elemRendered = container.appendChild( elem.render() );
			$(elemRendered).data("messageData", itemProperties);
		} );
	};

	if( value === "singlenotice" || value === "singlewarn" ) {
		// no categories, just create the options right away
		createEntries( Twinkle.warn.messages[ value ], sub_group, true );
	} else if( value === "custom" ) {
		createEntries( Twinkle.getPref("customWarningList"), sub_group, true );
	} else {
		// create the option-groups
		$.each( Twinkle.warn.messages[ value ], function( groupLabel, groupContents ) {
			var optgroup = new Morebits.quickForm.element( {
				type: 'optgroup',
				label: groupLabel
			} );
			optgroup = optgroup.render();
			sub_group.appendChild( optgroup );
			// create the options
			createEntries( groupContents, optgroup, false );
		} );
	}

	// clear overridden label on article textbox
	Morebits.quickForm.setElementTooltipVisibility(e.target.root.article, true);
	Morebits.quickForm.resetElementLabel(e.target.root.article);

	// hide the big red notice
	$("#tw-warn-red-notice").remove();
};

Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
	var main_group = e.target.form.main_group.value;
	var value = e.target.form.sub_group.value;

	// Tags that don't take a linked article, but something else (often a username).
	// The value of each tag is the label next to the input field
	var notLinkedArticle = {
		"uw-agf-sock": "Optional username of other account (without User:) ",
		"uw-bite": "Username of 'bitten' user (without User:) ",
		"uw-socksuspect": "Username of sock master, if known (without User:) ",
		"uw-username": "Username violates policy because... "
	};

	if( main_group === 'singlenotice' || main_group === 'singlewarn' ) {
		if( notLinkedArticle[value] ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';

			// change form labels according to the warning selected
			Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
			Morebits.quickForm.overrideElementLabel(e.target.form.article, notLinkedArticle[value]);
		} else if( e.target.form.article.notArticle ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
			Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, true);
			Morebits.quickForm.resetElementLabel(e.target.form.article);
		}
	}

	// change form labels according to the warning selected
	if (value === "uw-socksuspect") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, wgULS("傀儡操纵者用户名，如果知道的话（不含User:） ", "傀儡操縱者用戶名，如果知道的話（不含User:） "));
	} else if (value === "uw-username") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, wgULS("用户名违反方针，因为… ", "用戶名違反方針，因為… "));
	} else if (value === "uw-bite") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, wgULS("被“咬到”的用户（不含User:） ", "被「咬到」的用戶（不含User:） "));
	} else {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, true);
		Morebits.quickForm.resetElementLabel(e.target.form.article);
	}

	// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
	$("#tw-warn-red-notice").remove();

	var $redWarning;
	if (value === "uw-username") {
		$redWarning = $(wgULS("<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不应</b>被用于<b>明显</b>违反用户名方针的用户。" +
			"明显的违反方针应被报告给UAA。" +
			"{{uw-username}}应只被用在边界情况下需要与用户讨论时。</div>",

			"<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不應</b>被用於<b>明顯</b>違反用戶名方針的用戶。" +
			"明顯的違反方針應被報告給UAA。" +
			"{{uw-username}}應只被用在邊界情況下需要與用戶討論時。</div>"));
		$redWarning.insertAfter(Morebits.quickForm.getElementLabelObject(e.target.form.reasonGroup));
	}
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason, isCustom) {
		var text = "{{subst:" + templateName;

		if (article) {
			// add linked article for user warnings
			text += '|1=' + article;
		}

		if (reason) {
			text += "|2=" + reason;
		}
		text += '|subst=subst:}}';

		return text;
	},
	preview: function(form) {
		var templatename = form.sub_group.value;
		var linkedarticle = form.article.value;
		var templatetext;

		templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle,
			form.reason.value, form.main_group.value === 'custom');

		form.previewer.beginRender(templatetext);
	},
	main: function( pageobj ) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var messageData = params.messageData;

		var history_re = /<!-- Template:(uw-.*?) -->.*?(\d{4})年(\d{1,2})月(\d{1,2})日 \([日一二三四五六]\) (\d{1,2}):(\d{1,2}) \(UTC\)/g;
		var history = {};
		var latest = { date: new Date( 0 ), type: '' };
		var current;

		while( ( current = history_re.exec( text ) ) ) {
			var current_date = new Date( current[2] + '-' + current[3] + '-' + current[4] + ' ' + current[5] + ':' + current[6] + ' UTC' );
			if( !( current[1] in history ) ||  history[ current[1] ] < current_date ) {
				history[ current[1] ] = current_date;
			}
			if( current_date > latest.date ) {
				latest.date = current_date;
				latest.type = current[1];
			}
		}

		var date = new Date();

		if( params.sub_group in history ) {
			var temp_time = new Date( history[ params.sub_group ] );
			temp_time.setUTCHours( temp_time.getUTCHours() + 24 );

			if( temp_time > date ) {
				if( !confirm( wgULS("近24小时内一个同样的 " + params.sub_group + " 模板已被发出。\n是否继续？", "近24小時內一個同樣的 " + params.sub_group + " 模板已被發出。\n是否繼續？") ) ) {
					pageobj.statelem.info( '用户取消' );
					return;
				}
			}
		}

		latest.date.setUTCMinutes( latest.date.getUTCMinutes() + 1 ); // after long debate, one minute is max

		if( latest.date > date ) {
			if( !confirm( wgULS("近1分钟内一个同样的 " + latest.type + " 模板已被发出。\n是否继续？", "近1分鍾內一個同樣的 " + latest.type + " 模板已被發出。\n是否繼續？") ) ) {
				pageobj.statelem.info( '用户取消' );
				return;
			}
		}

		var dateHeaderRegex = new RegExp( "^==+\\s*" + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月" +
			"\\s*==+", 'mg' );
		var dateHeaderRegexLast, dateHeaderRegexResult;
		while ((dateHeaderRegexLast = dateHeaderRegex.exec( text )) !== null) {
			dateHeaderRegexResult = dateHeaderRegexLast;
		}
		// If dateHeaderRegexResult is null then lastHeaderIndex is never checked. If it is not null but
		// \n== is not found, then the date header must be at the very start of the page. lastIndexOf
		// returns -1 in this case, so lastHeaderIndex gets set to 0 as desired.
		var lastHeaderIndex = text.lastIndexOf( "\n==" ) + 1;

		if( text.length > 0 ) {
			text += "\n\n";
		}

		if( messageData.heading ) {
			text += "== " + messageData.heading + " ==\n";
		} else if( !dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex ) {
			Morebits.status.info( '信息', wgULS('未找到当月标题，将创建新的', '未找到當月標題，將建立新的') );
			text += "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
		}
		text += Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason, params.main_group === 'custom') + "--~~~~";

		if ( Twinkle.getPref('showSharedIPNotice') && Morebits.isIPAddress( mw.config.get('wgTitle') ) ) {
			Morebits.status.info( '信息', wgULS('添加共享IP说明', '加入共享IP說明') );
			text +=  "\n{{subst:SharedIPAdvice}}";
		}

		// build the edit summary
		var summary;
		if( params.main_group === 'custom' ) {
			switch( params.sub_group.substr( -1 ) ) {
				case "1":
					summary = "提醒";
					break;
				case "2":
					summary = "注意";
					break;
				case "3":
					summary = "警告";
					break;
				case "4":
					summary = wgULS("最后警告", "最後警告");
					break;
				case "m":
					if( params.sub_group.substr( -3 ) === "4im" ) {
						summary = "唯一警告";
						break;
					}
					summary = "提示";
					break;
				default:
					summary = "提示";
					break;
			}
			summary += "：" + Morebits.string.toUpperCaseFirstChar(messageData.label);
		} else {
			summary = messageData.summary;
			if ( messageData.suppressArticleInSummary !== true && params.article ) {
				if ( params.sub_group === "uw-socksuspect" ) {  // this template requires a username
					summary += "，[[User:" + params.article + "]]的";
				} else if ( params.sub_group === "uw-bite" ) {  // this template requires a username
					summary += "，" + wgULS("于", "於") + "[[User talk:" + params.article + "]]";
				} else {
					summary += wgULS("，于[[", "，於[[") + params.article + "]]";
				}
			}
		}
		summary += Twinkle.getPref("summaryAd");

		pageobj.setPageText( text );
		pageobj.setEditSummary( summary );
		pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
		pageobj.save();
	},
	main_flow: function (flowobj) {
		var params = flowobj.getCallbackParameters();
		var messageData = params.messageData;

		var date = new Date();

		var topic;
		if (messageData.heading) {
			topic = messageData.heading;
		} else {
			var summary;
			switch( params.sub_group.substr( -1 ) ) {
				case "1":
					summary = "提醒";
					break;
				case "2":
					summary = "注意";
					break;
				case "3":
					summary = "警告";
					break;
				case "4":
					summary = wgULS("最后警告", "最後警告");
					break;
				case "m":
					if( params.sub_group.substr( -3 ) === "4im" ) {
						summary = "唯一警告";
						break;
					}
					summary = "提示";
					break;
				default:
					summary = "提示";
					break;
			}
			// 因为Flow讨论串自带时间，所以不需要再另外标注
			topic = summary + " (" + Morebits.string.toUpperCaseFirstChar(messageData.label) + ")";
		}

		var content = Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason, params.main_group === 'custom');

		flowobj.setTopic(topic);
		flowobj.setContent(content);
		flowobj.newTopic();
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {
	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName();

	// First, check to make sure a reason was filled in if uw-username was selected

	if(e.target.sub_group.value === 'uw-username' && e.target.article.value.trim() === '') {
		alert(wgULS("必须给{{uw-username}}提供理由。", "必須給{{uw-username}}提供理由。"));
		return;
	}

	// Find the selected <option> element so we can fetch the data structure
	var selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');

	// Then, grab all the values provided by the form
	var params = {
		reason: e.target.reason.value,
		main_group: e.target.main_group.value,
		sub_group: e.target.sub_group.value,
		article: e.target.article.value,  // .replace( /^(Image|Category):/i, ':$1:' ),  -- apparently no longer needed...
		messageData: selectedEl.data("messageData")
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = wgULS("警告完成，将在几秒后刷新", "警告完成，將在幾秒後重新整理");

	Morebits.wiki.flow.check(userTalkPage, function () {
		var flow_page = new Morebits.wiki.flow( userTalkPage, wgULS('用户Flow对话页留言', '用戶Flow對話頁留言') );
		flow_page.setCallbackParameters( params );
		Twinkle.warn.callbacks.main_flow( flow_page );
	}, function () {
		var wikipedia_page = new Morebits.wiki.page( userTalkPage, wgULS('用户对话页修改', '用戶對話頁修改') );
		wikipedia_page.setCallbackParameters( params );
		wikipedia_page.setFollowRedirect( true );
		wikipedia_page.load( Twinkle.warn.callbacks.main );
	});

};
})(jQuery);


//</nowiki>
