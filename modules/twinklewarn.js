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
	if( mw.config.get('wgNamespaceNumber') === 3 ) {
			Twinkle.addPortletLink( Twinkle.warn.callback, "警告", "tw-warn", "警告或提醒用户" );
	}

	// modify URL of talk page on rollback success pages
	if( mw.config.get('wgAction') === 'rollback' ) {
		var $vandalTalkLink = $("#mw-rollback-success").find(".mw-usertoollinks a").first();
		$vandalTalkLink.css("font-weight", "bold");
		$vandalTalkLink.wrapInner($("<span/>").attr("title", "如果合适，您可以用Twinkle在该用户对话页上做出警告。"));

		var extraParam = "vanarticle=" + mw.util.rawurlencode(Morebits.pageNameNorm);
		var href = $vandalTalkLink.attr("href");
		if (href.indexOf("?") === -1) {
			$vandalTalkLink.attr("href", href + "?" + extraParam);
		} else {
			$vandalTalkLink.attr("href", href + "&" + extraParam);
		}
	}
};

Twinkle.warn.callback = function twinklewarnCallback() {
	if( mw.config.get('wgTitle').split( '/' )[0] === mw.config.get('wgUserName') &&
			!confirm( '您将要警告自己！您确定要继续吗？' ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( "警告、通知用户" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "选择警告级别", "WP:WARN" );
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#warn" );

	var form = new Morebits.quickForm( Twinkle.warn.callback.evaluate );
	var main_select = form.append( {
			type: 'field',
			label: '选择要发送的警告或通知类别',
			tooltip: '首先选择一组，再选择具体的警告模板。'
		} );

	var main_group = main_select.append( {
			type: 'select',
			name: 'main_group',
			event:Twinkle.warn.callback.change_category
		} );

	var defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append( { type: 'option', label: '层级1', value: 'level1', selected: ( defaultGroup === 1 || defaultGroup < 1 || ( Morebits.userIsInGroup( 'sysop' ) ? defaultGroup > 8 : defaultGroup > 7 ) ) } );
	main_group.append( { type: 'option', label: '层级2', value: 'level2', selected: ( defaultGroup === 2 ) } );
	main_group.append( { type: 'option', label: '层级3', value: 'level3', selected: ( defaultGroup === 3 ) } );
	main_group.append( { type: 'option', label: '层级4', value: 'level4', selected: ( defaultGroup === 4 ) } );
	main_group.append( { type: 'option', label: '层级4im', value: 'level4im', selected: ( defaultGroup === 5 ) } );
	main_group.append( { type: 'option', label: '单层级通知', value: 'singlenotice', selected: ( defaultGroup === 6 ) } );
	main_group.append( { type: 'option', label: '单层级警告', value: 'singlewarn', selected: ( defaultGroup === 7 ) } );
	if( Twinkle.getPref( 'customWarningList' ).length ) {
		main_group.append( { type: 'option', label: '自定义警告', value: 'custom', selected: ( defaultGroup === 9 ) } );
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		main_group.append( { type: 'option', label: '封禁', value: 'block', selected: ( defaultGroup === 8 ) } );
	}

	main_select.append( { type: 'select', name: 'sub_group', event:Twinkle.warn.callback.change_subcategory } ); //Will be empty to begin with.

	form.append( {
			type: 'input',
			name: 'article',
			label: '条目链接',
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip: '给模板中加入一条目链接，可留空。'
		} );

	var more = form.append( { type: 'field', name: 'reasonGroup', label: '警告信息' } );
	more.append( { type: 'textarea', label: '可选信息：', name: 'reason', tooltip: '理由或是附加信息' } );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = '预览';
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
Twinkle.warn.messages = {
	level1: {
		"不同类型的非建设编辑": {
			"uw-vandalism1": {
				label: "破坏",
				summary: "层级1：破坏"
			},
			"uw-test1": {
				label: "编辑测试",
				summary: "层级1：编辑测试"
			},
			"uw-delete1": {
				label: "清空页面、移除内容或模板",
				summary: "层级1：清空页面、移除内容或模板"
			},
			"uw-redirect1": {
				label: "创建恶意重定向",
				summary: "层级1：创建恶意重定向"
			},
			"uw-tdel1": {
				label: "移除维护性模板",
				summary: "层级1：移除维护性模板"
			},
			"uw-joke1": {
				label: "加入不当玩笑",
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
				label: "与图像相关之破坏",
				summary: "层级1：与图像相关之破坏"
			}
		},
		"增加商品或政治广告": {
			"uw-spam1": {
				label: "增加垃圾连结",
				summary: "层级1：增加垃圾连结"
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
				label: "没有使用适当的引用方法而增加没有来源的资料",
				summary: "层级1：没有使用适当的引用方法而增加没有来源的资料"
			},
			"uw-error1": {
				label: "故意加入不实内容",
				summary: "层级1：故意加入不实内容"
			},
			"uw-biog1": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级1：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory1": {
				label: "没有特定目标的诽谤",
				summary: "层级1：没有特定目标的诽谤"
			}
		},
		"翻译品质": {
			"uw-roughtranslation1": {
				label: "粗劣翻译",
				summary: "层级1：粗劣翻译"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-notcensored1": {
				label: "资料的审查",
				summary: "层级1：资料的审查"
			},
			"uw-mos1": {
				label: "格式、日期、语言等",
				summary: "层级1：格式、日期、语言等"
			},
			"uw-move1": {
				label: "页面移动",
				summary: "层级1：页面移动"
			},
			"uw-cd1": {
				label: "把讨论页清空",
				summary: "层级1：把讨论页清空"
			},
			"uw-chat1": {
				label: "把讨论页当为论坛",
				summary: "层级1：把讨论页当为论坛"
			},
			"uw-tpv1": {
				label: "改写其他用户在讨论页留下的意见",
				summary: "层级1：改写其他用户在讨论页留下的意见"
			},
			"uw-afd1": {
				label: "移除{{afd}}模板",
				summary: "层级1：移除{{afd}}模板"
			},
			"uw-speedy1": {
				label: "移除{{delete}}模板",
				summary: "层级1：移除{{delete}}模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa1": {
				label: "针对特定用户的人身攻击",
				summary: "层级1：针对特定用户的人身攻击"
			},
			"uw-agf1": {
				label: "没有善意推定",
				summary: "层级1：没有善意推定"
			},
			"uw-own1": {
				label: "条目的所有权",
				summary: "层级1：条目的所有权"
			},
			"uw-tempabuse1": {
				label: "不当使用警告或封锁模板",
				summary: "层级1：不当使用警告或封锁模板"
			}
		}
	},


	level2: {
		"不同类型的非建设编辑": {
			"uw-vandalism2": {
				label: "破坏",
				summary: "层级2：破坏"
			},
			"uw-test2": {
				label: "编辑测试",
				summary: "层级2：编辑测试"
			},
			"uw-delete2": {
				label: "清空页面、移除内容或模板",
				summary: "层级2：清空页面、移除内容或模板"
			},
			"uw-redirect2": {
				label: "创建恶意重定向",
				summary: "层级2：创建恶意重定向"
			},
			"uw-tdel2": {
				label: "移除维护性模板",
				summary: "层级2：移除维护性模板"
			},
			"uw-joke2": {
				label: "加入不当玩笑",
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
				label: "与图像相关之破坏",
				summary: "层级2：与图像相关之破坏"
			}
		},
		"增加商品或政治广告": {
			"uw-spam2": {
				label: "增加垃圾连结",
				summary: "层级2：增加垃圾连结"
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
				label: "没有使用适当的引用方法而增加没有来源的资料",
				summary: "层级2：没有使用适当的引用方法而增加没有来源的资料"
			},
			"uw-error2": {
				label: "故意加入不实内容",
				summary: "层级2：故意加入不实内容"
			},
			"uw-biog2": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级2：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory2": {
				label: "没有特定目标的诽谤",
				summary: "层级2：没有特定目标的诽谤"
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
				label: "资料的审查",
				summary: "层级2：资料的审查"
			},
			"uw-mos2": {
				label: "格式、日期、语言等",
				summary: "层级2：格式、日期、语言等"
			},
			"uw-move2": {
				label: "页面移动",
				summary: "层级2：页面移动"
			},
			"uw-cd2": {
				label: "把讨论页清空",
				summary: "层级2：把讨论页清空"
			},
			"uw-chat2": {
				label: "把讨论页当为论坛",
				summary: "层级2：把讨论页当为论坛"
			},
			"uw-tpv2": {
				label: "改写其他用户在讨论页留下的意见",
				summary: "层级2：改写其他用户在讨论页留下的意见"
			},
			"uw-afd2": {
				label: "移除{{afd}}模板",
				summary: "层级2：移除{{afd}}模板"
			},
			"uw-speedy2": {
				label: "移除{{delete}}模板",
				summary: "层级2：移除{{delete}}模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa2": {
				label: "针对特定用户的人身攻击",
				summary: "层级2：针对特定用户的人身攻击"
			},
			"uw-agf2": {
				label: "没有善意推定",
				summary: "层级2：没有善意推定"
			},
			"uw-own2": {
				label: "条目的所有权",
				summary: "层级2：条目的所有权"
			},
			"uw-tempabuse2": {
				label: "不当使用警告或封锁模板",
				summary: "层级2：不当使用警告或封锁模板"
			}
		}
	},


	level3: {
		"不同类型的非建设编辑": {
			"uw-vandalism3": {
				label: "破坏",
				summary: "层级3：破坏"
			},
			"uw-test3": {
				label: "编辑测试",
				summary: "层级3：编辑测试"
			},
			"uw-delete3": {
				label: "清空页面、移除内容或模板",
				summary: "层级3：清空页面、移除内容或模板"
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
				label: "加入不当玩笑",
				summary: "层级3：加入不当玩笑"
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
				label: "与图像相关之破坏",
				summary: "层级3：与图像相关之破坏"
			}
		},
		"增加商品或政治广告": {
			"uw-spam3": {
				label: "增加垃圾连结",
				summary: "层级3：增加垃圾连结"
			},
			"uw-advert3": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级3：利用维基百科来发布广告或推广"
			},
			"uw-npov3": {
				label: "不遵守中立的观点方针",
				summary: "层级3：不遵守中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-unsourced3": {
				label: "没有使用适当的引用方法而增加没有来源的资料",
				summary: "层级3：没有使用适当的引用方法而增加没有来源的资料"
			},
			"uw-error3": {
				label: "故意加入不实内容",
				summary: "层级3：故意加入不实内容"
			},
			"uw-biog3": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级3：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory3": {
				label: "没有特定目标的诽谤",
				summary: "层级3：没有特定目标的诽谤"
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
				label: "资料的审查",
				summary: "层级3：资料的审查"
			},
			"uw-mos3": {
				label: "格式、日期、语言等",
				summary: "层级3：格式、日期、语言等"
			},
			"uw-move3": {
				label: "页面移动",
				summary: "层级3：页面移动"
			},
			"uw-cd3": {
				label: "把讨论页清空",
				summary: "层级3：把讨论页清空"
			},
			"uw-chat3": {
				label: "把讨论页当为论坛",
				summary: "层级3：把讨论页当为论坛"
			},
			"uw-tpv3": {
				label: "改写其他用户在讨论页留下的意见",
				summary: "层级3：改写其他用户在讨论页留下的意见"
			},
			"uw-afd3": {
				label: "移除{{afd}}模板",
				summary: "层级3：移除{{afd}}模板"
			},
			"uw-speedy3": {
				label: "移除{{delete}}模板",
				summary: "层级3：移除{{delete}}模板"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa3": {
				label: "针对特定用户的人身攻击",
				summary: "层级3：针对特定用户的人身攻击"
			},
			"uw-agf3": {
				label: "没有善意推定",
				summary: "层级3：没有善意推定"
			},
			"uw-own3": {
				label: "条目的所有权",
				summary: "层级3：条目的所有权"
			},
			"uw-tempabuse3": {
				label: "不当使用警告或封锁模板",
				summary: "层级3：不当使用警告或封锁模板"
			}
		}
	},


	level4: {
		"不同类型的非建设编辑": {
			"uw-vandalism4": {
				label: "破坏",
				summary: "层级4：破坏"
			},
			"uw-test4": {
				label: "编辑测试",
				summary: "层级4：编辑测试"
			},
			"uw-delete4": {
				label: "清空页面、移除内容或模板",
				summary: "层级4：清空页面、移除内容或模板"
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
				label: "加入不当玩笑",
				summary: "层级4：加入不当玩笑"
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
				label: "与图像相关之破坏",
				summary: "层级4：与图像相关之破坏"
			}
		},
		"增加商品或政治广告": {
			"uw-spam4": {
				label: "增加垃圾连结",
				summary: "层级4：增加垃圾连结"
			},
			"uw-advert4": {
				label: "利用维基百科来发布广告或推广",
				summary: "层级4：利用维基百科来发布广告或推广"
			},
			"uw-npov4": {
				label: "不遵守中立的观点方针",
				summary: "层级4：不遵守中立的观点方针"
			}
		},
		"加插不实及/或诽谤文字": {
			"uw-biog4": {
				label: "加入有关在生人物而又缺乏来源的资料",
				summary: "层级4：加入有关在生人物而又缺乏来源的资料"
			},
			"uw-defamatory4": {
				label: "没有特定目标的诽谤",
				summary: "层级4：没有特定目标的诽谤"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-mos4": {
				label: "格式、日期、语言等",
				summary: "层级4：格式、日期、语言等"
			},
			"uw-move4": {
				label: "页面移动",
				summary: "层级4：页面移动"
			},
			"uw-chat4": {
				label: "把讨论页当为论坛",
				summary: "层级4：把讨论页当为论坛"
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
				label: "不当使用警告或封锁模板",
				summary: "层级4：不当使用警告或封锁模板"
			}
		}
	},


	level4im: {
		"不同类型的非建设编辑": {
			"uw-vandalism4im": {
				label: "破坏",
				summary: "层级4im：破坏"
			},
			"uw-delete4im": {
				label: "清空页面、移除内容或模板",
				summary: "层级4im：清空页面、移除内容或模板"
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
				label: "与图像相关之破坏",
				summary: "层级4im：与图像相关之破坏"
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
				label: "没有特定目标的诽谤",
				summary: "层级4im：没有特定目标的诽谤"
			}
		},
		"非能接受且违反方针或指引的单方面行为或操作": {
			"uw-move4im": {
				label: "页面移动",
				summary: "层级4im：页面移动"
			}
		},
		"对其他用户和条目的态度": {
			"uw-npa4im": {
				label: "针对特定用户的人身攻击",
				summary: "层级4im：针对特定用户的人身攻击"
			},
			"uw-tempabuse4im": {
				label: "不当使用警告或封锁模板",
				summary: "层级4im：不当使用警告或封锁模板"
			}
		}
	},


	singlenotice: {
		"uw-2redirect": {
			label: "透过不适当的页面移动建立双重重定向",
			summary: "单层级通知：透过不适当的页面移动建立双重重定向"
		},
		"uw-aiv": {
			label: "不恰当的破坏回报",
			summary: "单层级通知：不恰当的破坏回报"
		},
		"uw-articlesig": {
			label: "在条目页中签名",
			summary: "单层级通知：在条目页中签名"
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
			label: "快速删除标记不当",
			summary: "单层级通知：快速删除标记不当"
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
			label: "不要向当前的破坏回报复杂的用户纷争",
			summary: "单层级通知：不要向当前的破坏回报复杂的用户纷争"
		},
		"uw-notvote": {
			label: "我们是以共识处事，不仅是投票",
			summary: "单层级通知：我们是以共识处事，不仅是投票"
		},
		"uw-preview": {
			label: "使用预览按钮来避免不必要的错误",
			summary: "单层级通知：使用预览按钮来避免不必要的错误"
		},
		"uw-sandbox": {
			label: "移除沙盒的置顶模板{{sandbox}}",
			summary: "单层级通知：移除沙盒的置顶模板{{sandbox}}"
		},
		"uw-selfrevert": {
			label: "回退个人的测试",
			summary: "单层级通知：回退个人的测试"
		},
		"uw-subst": {
			label: "谨记要替代模板",
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
			label: "向更改用户名回报的用户名称并不违反方针",
			summary: "单层级通知：向更改用户名回报的用户名称并不违反方针"
		},
		"uw-warn": {
			label: "警告破坏用户",
			summary: "单层级通知：警告破坏用户"
		}
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
			label: "公然的破坏",
			summary: "单层级警告：公然的破坏"
		},
		"uw-canvass": {
			label: "不恰当的拉票",
			summary: "单层级警告：不恰当的拉票"
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
			label: "个人资料",
			summary: "单层级警告：个人资料"
		},
		"uw-upv": {
			label: "用户页破坏",
			summary: "单层级警告：用户页破坏"
		},
		"uw-selfinventedname": {
			label: "不适当的自创新名词、新译名",
			summary: "单层级警告：不适当的自创新名词、新译名"
		},
		"uw-substub": {
			label: "创建小小作品",
			summary: "单层级警告：创建小小作品"
		},
		"uw-username": {
			label: "不恰当的用户名",
			summary: "单层级警告：不恰当的用户名"
		},
		"uw-wrongsummary": {
			label: "在编辑摘要制造不适当的内容",
			summary: "单层级警告：在编辑摘要制造不适当的内容"
		}
	},


	block: {
		"uw-block1": {
			label: "层级1封禁",
			summary: "层级1封禁",
			reasonParam: true
		},
		"uw-block2": {
			label: "层级2封禁",
			summary: "层级2封禁",
			reasonParam: true
		},
		"uw-block3": {
			label: "层级3封禁",
			summary: "层级3封禁",
			reasonParam: true,
			indefinite: true
		},
		"uw-3block": {
			label: "回退不过三原则封禁",
			summary: "回退不过三原则封禁",
			reasonParam: true,
		},
		"uw-ablock": {
			label: "匿名封禁",
			summary: "匿名封禁",
			reasonParam: true,
		},
		"uw-bblock": {
			label: "机器人失灵封禁",
			summary: "机器人失灵封禁"
		},
		"uw-dblock": {
			label: "删除封禁",
			summary: "删除封禁"
		},
		"uw-sblock": {
			label: "广告封禁",
			summary: "广告封禁"
		},
		"uw-ublock": {
			label: "用户名称封禁",
			summary: "用户名称封禁",
			indefinite: true
		},
		"uw-vblock": {
			label: "破坏封禁",
			summary: "破坏封禁"
		},
		"uw-cblock": {
			label: "用户核查封禁",
			summary: "用户核查封禁",
			indefinite: true
		}
	}
};

Twinkle.warn.prev_block_timer = null;
Twinkle.warn.prev_block_reason = null;
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
		old_subvalue_re = new RegExp( $.escapeRE( old_subvalue ) + "(\\d*(?:im)?)$" );
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

	if( value === "singlenotice" || value === "singlewarn" || value === "block" ) {
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

	if( value === 'block' ) {
		// create the block-related fields
		var more = new Morebits.quickForm.element( { type: 'div', id: 'block_fields' } );
		more.append( {
			type: 'input',
			name: 'block_timer',
			label: '封禁时间： ',
			tooltip: '例如24小时、2天等…'
		} );
		more.append( {
			type: 'input',
			name: 'block_reason',
			label: '“由于……您已被封禁”',
			tooltip: '可选的理由。'
		} );
		e.target.root.insertBefore( more.render(), e.target.root.lastChild );

		// restore saved values of fields
		if(Twinkle.warn.prev_block_timer !== null) {
			e.target.root.block_timer.value = Twinkle.warn.prev_block_timer;
			Twinkle.warn.prev_block_timer = null;
		}
		if(Twinkle.warn.prev_block_reason !== null) {
			e.target.root.block_reason.value = Twinkle.warn.prev_block_reason;
			Twinkle.warn.prev_block_reason = null;
		}
		if(Twinkle.warn.prev_article === null) {
			Twinkle.warn.prev_article = e.target.root.article.value;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().hide();
		e.target.root.previewer.closePreview();
	} else if( e.target.root.block_timer ) {
		// hide the block-related fields
		if(!e.target.root.block_timer.disabled && Twinkle.warn.prev_block_timer === null) {
			Twinkle.warn.prev_block_timer = e.target.root.block_timer.value;
		}
		if(!e.target.root.block_reason.disabled && Twinkle.warn.prev_block_reason === null) {
			Twinkle.warn.prev_block_reason = e.target.root.block_reason.value;
		}

		// hack to fix something really weird - removed elements seem to somehow keep an association with the form
		e.target.root.block_reason = null;

		$(e.target.root).find("#block_fields").remove();

		if(e.target.root.article.disabled && Twinkle.warn.prev_article !== null) {
			e.target.root.article.value = Twinkle.warn.prev_article;
			Twinkle.warn.prev_article = null;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().show();
		e.target.root.previewer.closePreview();
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

	if( main_group === 'singlenotice' || main_group === 'singlewarn' ) {
		if( value === 'uw-bite' || value === 'uw-username' || value === 'uw-socksuspect' ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';
		} else if( e.target.form.article.notArticle ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
		}
	} else if( main_group === 'block' ) {
		if( Twinkle.warn.messages.block[value].indefinite ) {
			if(Twinkle.warn.prev_block_timer === null) {
				Twinkle.warn.prev_block_timer = e.target.form.block_timer.value;
			}
			e.target.form.block_timer.disabled = true;
			e.target.form.block_timer.value = 'indefinite';
		} else if( e.target.form.block_timer.disabled ) {
			if(Twinkle.warn.prev_block_timer !== null) {
				e.target.form.block_timer.value = Twinkle.warn.prev_block_timer;
				Twinkle.warn.prev_block_timer = null;
			}
			e.target.form.block_timer.disabled = false;
		}

		if( Twinkle.warn.messages.block[value].pageParam ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.disabled = false;
		} else if( !e.target.form.article.disabled ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.disabled = true;
			e.target.form.article.value = '';
		}

		if( Twinkle.warn.messages.block[value].reasonParam ) {
			if(Twinkle.warn.prev_block_reason !== null) {
				e.target.form.block_reason.value = Twinkle.warn.prev_block_reason;
				Twinkle.warn.prev_block_reason = null;
			}
			e.target.form.block_reason.disabled = false;
		} else if( !e.target.form.block_reason.disabled ) {
			if(Twinkle.warn.prev_block_reason === null) {
				Twinkle.warn.prev_block_reason = e.target.form.block_reason.value;
			}
			e.target.form.block_reason.disabled = true;
			e.target.form.block_reason.value = '';
		}
	}

	// change form labels according to the warning selected
	if (value === "uw-socksuspect") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "傀儡操纵者用户名，如知晓（不含User:） ");
	} else if (value === "uw-username") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "用户名违反方针，因为… ");
	} else if (value === "uw-bite") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "被“咬到”的用户（不含User:） ");
	} else {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, true);
		Morebits.quickForm.resetElementLabel(e.target.form.article);
	}

	// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
	$("#tw-warn-red-notice").remove();

	var $redWarning;
	if (value === "uw-username") {
		$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不应</b>被用于<b>明显</b>违反用户名方针的用户。" +
			"明显的违反方针应被报告给UAA。" +
			"{{uw-username}}应只被用在边界情况下需要与用户讨论时。</div>");
		$redWarning.insertAfter(Morebits.quickForm.getElementLabelObject(e.target.form.reasonGroup));
	};
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason, isCustom) {
		var text = "{{subst:" + templateName;

		if (article) {
			// add linked article for user warnings (non-block templates)
			text += '|1=' + article;
		}

		if (reason && !isCustom) {
			// we assume that custom warnings lack a {{{2}}} parameter
			text += "|2=" + reason;
		}
		text += '|subst=subst:}}';

		return text;
	},
	getBlockNoticeWikitext: function(templateName, article, blockTime, blockReason, isIndefTemplate) {
		var text = "{{subst:" + templateName;

		if (article && Twinkle.warn.messages.block[templateName].pageParam) {
			text += '|page=' + article;
		}

		if (!/te?mp|^\s*$|min/.exec(blockTime) && !isIndefTemplate) {
			if (/indef|\*|max/.exec(blockTime)) {
				text += '|indef=yes';
			} else {
				text += '|time=' + blockTime;
			}
		}

		if (blockReason) {
			text += '|reason=' + blockReason;
		}

		text += "|sig=true|subst=subst:}}";
		return text;
	},
	preview: function(form) {
		var templatename = form.sub_group.value;
		var linkedarticle = form.article.value;
		var templatetext;

		if (templatename in Twinkle.warn.messages.block) {
			templatetext = Twinkle.warn.callbacks.getBlockNoticeWikitext(templatename, linkedarticle, form.block_timer.value,
				form.block_reason.value, Twinkle.warn.messages.block[templatename].indefinite);
		} else {
			templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle, 
				form.reason.value, form.main_group.value === 'custom');
		}

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
				if( !confirm( "近24小时内一个同样的 " + params.sub_group + " 模板已被发出。\n是否继续？" ) ) {
					pageobj.statelem.info( '用户取消' );
					return;
				}
			}
		}

		latest.date.setUTCMinutes( latest.date.getUTCMinutes() + 1 ); // after long debate, one minute is max

		if( latest.date > date ) {
			if( !confirm( "近1分钟内一个同样的 " + latest.type + " 模板已被发出。\n是否继续？" ) ) {
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

		if( params.main_group === 'block' ) {
			if( Twinkle.getPref('blankTalkpageOnIndefBlock') && ( messageData.indefinite || (/indef|\*|max/).exec( params.block_timer ) ) ) {
				Morebits.status.info( '信息', '根据参数设置清空讨论页并创建新标题' );
				text = "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			} else if( !dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex ) {
				Morebits.status.info( '信息', '未找到当月标题，将创建新的' );
				text += "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			}

			text += Twinkle.warn.callbacks.getBlockNoticeWikitext(params.sub_group, params.article, params.block_timer, params.reason, messageData.indefinite);
		} else {
			if( messageData.heading ) {
				text += "== " + messageData.heading + " ==\n";
			} else if( !dateHeaderRegexResult || dateHeaderRegexResult.index !== lastHeaderIndex ) {
				Morebits.status.info( '信息', '未找到当月标题，将创建新的' );
				text += "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			}
			text += Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article, 
				params.reason, params.main_group === 'custom') + "--~~~~";
		}

		if ( Twinkle.getPref('showSharedIPNotice') && Morebits.isIPAddress( mw.config.get('wgTitle') ) ) {
			Morebits.status.info( '信息', '添加共享IP说明' );
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
					summary = "最后警告";
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
				} else {
					summary += "，于[[" + params.article + "]]";
				}
			}
		}
		summary += "。" + Twinkle.getPref("summaryAd");

		pageobj.setPageText( text );
		pageobj.setEditSummary( summary );
		pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
		pageobj.save();
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {

	// First, check to make sure a reason was filled in if uw-username was selected

	if(e.target.sub_group.value === 'uw-username' && e.target.article.value.trim() === '') {
		alert("必须给{{uw-username}}提供理由。");
		return;
	}

	// Find the selected <option> element so we can fetch the data structure
	var selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');

	// Then, grab all the values provided by the form
	var params = {
		reason: e.target.block_reason ? e.target.block_reason.value : e.target.reason.value,
		main_group: e.target.main_group.value,
		sub_group: e.target.sub_group.value,
		article: e.target.article.value,  // .replace( /^(Image|Category):/i, ':$1:' ),  -- apparently no longer needed...
		block_timer: e.target.block_timer ? e.target.block_timer.value : null,
		messageData: selectedEl.data("messageData")
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "警告完成，将在几秒后刷新";

	var wikipedia_page = new Morebits.wiki.page( mw.config.get('wgPageName'), '用户对话页修改' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.setFollowRedirect( true );
	wikipedia_page.load( Twinkle.warn.callbacks.main );
};
})(jQuery);


//</nowiki>
