/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles; file pages with a corresponding file
 *                         which is local (not on Commons); existing user subpages
 *                         and existing subpages of Wikipedia:Articles for creation;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if( Wikipedia.isPageRedirect() ) {
		Twinkle.tag.mode = 'redirect';
		$(twAddPortletLink("#", "标记", "friendly-tag", "标记重定向", "")).click(Twinkle.tag.callback);
	}
	// file tagging
	/*
	else if( mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById("mw-sharedupload") && document.getElementById("mw-imagepage-section-filehistory") ) {
		Twinkle.tag.mode = 'file';
		$(twAddPortletLink("#", "标记", "friendly-tag", "标记文件", "")).click(Twinkle.tag.callback);
	}
	*/
	// article tagging
	else if( mw.config.get('wgNamespaceNumber') === 0 && mw.config.get('wgCurRevisionId') ) {
		Twinkle.tag.mode = 'article';
		$(twAddPortletLink("#", "标记", "friendly-tag", "标记条目", "")).click(Twinkle.tag.callback);
	}
	// tagging of draft articles
	/*else if( ((mw.config.get('wgNamespaceNumber') === 2 && mw.config.get('wgPageName').indexOf("/") !== -1) || /^Wikipedia\:Articles[ _]for[ _]creation\//.exec(mw.config.get('wgPageName')) ) && mw.config.get('wgCurRevisionId') ) {
		Twinkle.tag.mode = 'draft';
		$(twAddPortletLink("#", "Tag", "friendly-tag", "Add review tags to draft article", "")).click(Twinkle.tag.callback);
	}*/
};

Twinkle.tag.callback = function friendlytagCallback( uid ) {
	var Window = new SimpleWindow( 630, 400 );
	Window.setScriptName( "Twinkle" );
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink( "Twinkle帮助", "WP:TW/DOC#tag" );

	var form = new QuickForm( Twinkle.tag.callback.evaluate );

	switch( Twinkle.tag.mode ) {
		case 'article':
			Window.setTitle( "条目维护标记" );

			form.append( {
					type: 'checkbox',
					list: [
						{
							label: '如可能，合并到{{multiple issues}}',
							value: 'group',
							name: 'group',
							tooltip: '如果添加{{multiple issues}}支持的三个以上的模板，所有支持的模板都会被合并至一个{{multiple issues}}模板中。',
							checked: Twinkle.getFriendlyPref('groupByDefault')
						}
					]
				}
			);

			form.append( { type:'header', label:'维护模板' } );
			form.append( { type:'checkbox', name: 'maintenance', list: Twinkle.tag.maintenanceList } );

			form.append( { type:'header', label:'问题模板' } );
			form.append( { type:'checkbox', name: 'problem', list: Twinkle.tag.problemList } );

			form.append( { type:'header', label:'提示模板' } );
			form.append( { type:'checkbox', name: 'notice', list: Twinkle.tag.noticeList } );

			if( Twinkle.getFriendlyPref('customTagList').length ) {
				form.append( { type:'header', label:'自定义模板' } );
				form.append( { type: 'checkbox', name: 'custom', list: Twinkle.getFriendlyPref('customTagList') } );
			}
			break;

		/*case 'file':
			Window.setTitle( "文件维护标记" );

			// TODO: perhaps add custom tags TO list of checkboxes

			form.append({ type: 'header', label: '版权和来源问题模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.licenseList } );

			form.append({ type: 'header', label: '清理模板' } );
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.cleanupList } );

			form.append({ type: 'header', label: '图片质量模板' } );
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.qualityList } );

			form.append({ type: 'header', label: '维基媒体相关模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.commonsList } );

			form.append({ type: 'header', label: '替换模板' });
			form.append({ type: 'checkbox', name: 'imageTags', list: Twinkle.tag.file.replacementList } );
			break;*/

		case 'redirect':
			Window.setTitle( "重定向标记" );

			form.append({ type: 'header', label:'拼写、错误拼写、时态和大小写模板' });
			form.append({ type: 'checkbox', name: 'spelling', list: Twinkle.tag.spellingList });

			form.append({ type: 'header', label:'其他名称模板' });
			form.append({ type: 'checkbox', name: 'alternative', list: Twinkle.tag.alternativeList });

			form.append({ type: 'header', label:'杂项和管理用重定向模板' });
			form.append({ type: 'checkbox', name: 'administrative', list: Twinkle.tag.administrativeList });
			break;

		/*case 'draft':
			Window.setTitle( "Article draft tagging" );

			form.append({ type: 'header', label:'Draft article tags' });
			form.append({ type: 'checkbox', name: 'draftTags', list: Twinkle.tag.draftList });
			break;*/

		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
};

// Tags for ARTICLES start here

Twinkle.tag.maintenanceList = [
	{
		label: wgUVS("{{attention}}: 此条目需要您的关注", "{{attention}}: 此條目需要您的關注"),
		value: 'attention'
	},
	{
		label: wgUVS("{{cleanup}}: 条目可能需要进行清理", "{{cleanup}}: 條目可能需要進行清理"),
		value: 'cleanup'
	},
	{
		label: wgUVS("{{copyedit}}: 条目需要校对，以确保语法、用语、语气、风格及表达恰当", "{{copyedit}}: 條目需要校對，以確保語法、用語、語氣、風格及表達恰當"),
		value: 'copyedit'
	},
	{
		label: wgUVS("{{expand}}: 此条目需要扩充", "{{expand}}: 此條目需要擴充"),
		value: 'expand'
	},
	{
		label: wgUVS("{{expert}}: 此条目需要精通或熟悉本主题的专家参与编辑", "{{expert}}: 此條目需要精通或熟悉本主題的專家參與編輯"),
		value: 'expert'
	},
	{
		label: wgUVS("{{fansite}}: 此条目类似爱好者站点", "{{fansite}}: 此條目類似愛好者站點"),
		value: 'fansite'
	},
	{
		label: wgUVS("{{grammar}}: 此条目或章节的文法需要改善", "{{grammar}}: 此條目或章節的文法需要改善"),
		value: 'grammar'
	},
	{
		label: wgUVS("{{howto}}: 此条目或章节包含指南或教学内容", "{{howto}}: 此條目或章節包含指南或教學內容"),
		value: 'howto'
	},
	{
		label: wgUVS("{{in-universe}}: 本条目以小说作品原始的写作风格叙述一个小说作品或情节", "{{in-universe}}: 本條目以小說作品原始的寫作風格敍述一個小說作品或情節"),
		value: 'in-universe'
	},
	{
		label: wgUVS("{{infoboxneeded}}: 此条目需要加上一个合适的信息框模板，或是现有的信息框需要更新", "{{infoboxneeded}}: 此條目需要加上一個合適的訊息框模板，或是現有的訊息框需要更新"),
		value: 'infoboxneeded'
	},
	{
		label: wgUVS("{{intro-missing}}: 这个条目的导言过于短小", "{{intro-missing}}: 這個條目的導言過於短小"),
		value: 'intromissing'
	},
	{
		label: wgUVS("{{newsrelease}}: 本条目或章节阅读起来像是新闻稿，或包含过度的宣传性语调", "{{newsrelease}}: 本條目或章節閱讀起來像是新聞稿，或包含過度的宣傳性語調"),
		value: 'newsrelease'
	},
	{
		label: wgUVS("{{nofootnotes}}: 本条目包含了一些参考来源或外部链接，但由于条目内部缺少内文脚注，本条目的来源仍然不明确", "{{nofootnotes}}: 本條目包含了一些參考來源或外部鏈結，但由於條目內部缺乏內文腳注，本條目的來源仍然不明確"),
		value: 'nofootnotes'
	},
	{
		label: wgUVS("{{notchinese}}: 此条目包含过多不是现代标准汉语的内容", "{{notchinese}}: 此條目包含過多不是現代標準漢語的內容"),
		value: 'notchinese'
	},
	{
		label: wgUVS("{{notchinesetitle}}: 据命名常规，本条目标题应使用中文", "{{notchinesetitle}}: 據命名常規，本條目標題應使用中文"),
		value: 'notchinesetitle'
	},
	{
		label: wgUVS("{{orphan}}: 这个条目只有或没有很少链入页面", "{{orphan}}: 這個條目只有或沒有很少鏈入頁面"),
		value: 'orphan'
	},
	{
		label: wgUVS("{{prosetimeline}}: 此条目或章节可能包含不适当的条列式年代表", "{{prosetimeline}}: 此條目或章節可能包含不適當的條列式年代表"),
		value: 'prosetimeline'
	},
	{
		label: wgUVS("{{roughtranslation}}: 此条目或章节翻译粗劣", "{{roughtranslation}}: 此條目或章節翻譯粗劣"),
		value: 'roughtranslation'
	},
	{
		label: wgUVS("{{tone}}: 此条目的语调或风格可能不适合百科全书的写作方式", "{{tone}}: 此條目的語調或風格可能不適合百科全書的寫作方式"),
		value: 'tone'
	},
	{
		label: wgUVS("{{translating}}: 此条目仍有文字未被翻译成中文", "{{translating}}: 此條目仍有文字未被翻譯成中文"),
		value: 'translating'
	},
	{
		label: wgUVS("{{trivia}}: 应避免有陈列杂项资料的章节", "{{trivia}}: 應避免有陳列雜項資料的章節"),
		value: 'trivia'
	},
	{
		label: wgUVS("{{uncategorized}}: 此条目缺少页面分类", "{{uncategorized}: 此條目缺乏頁面分類"),
		value: 'uncategorized'
	},
	{
		label: wgUVS("{{verylong}}: 此条目可能过于冗长", "{{verylong}}: 此條目可能過於冗長"),
		value: 'verylong'
	},
	{
		label: wgUVS("{{wikify}}: 此条目格式需要被修正以符合维基标准", "{{wikify}}: 此條目格式需要被修正以符合維基標準"),
		value: 'wikify'
	}
];


Twinkle.tag.problemList = [
	{
		label: wgUVS("{{advert}}: 此条目类似广告", "{{advert}}: 此條目類似廣告"),
		value: 'advert'
	},
	{
		label: wgUVS("{{blpdispute}}: 此条目可能违反了生者传记方针", "{{blpdispute}}: 此條目可能違反了生者傳記方針"),
		value: 'blpdispute'
	},
	{
		label: wgUVS("{{blpsource}}: 此传记条目需要补充性的引用以供查证", "{{blpsource}}: 此傳記條目需要附加來源資料以供查證"),
		value: 'blpsource'
	},
	{
		label: wgUVS("{{disputed}}: 此条目的准确性有争议", "{{disputed}}: 此條目的準確性有爭議"),
		value: 'disputed'
	},
	{
		label: wgUVS("{{globalize}}: 此条目仅具一部分地域的观点或资料，尚需补充世界性的内容", "{{globalize}}: 此條目僅具一部份地域的觀點或資料，尚需補充世界性的內容"),
		value: 'globalize',
	},
	{
		label: wgUVS("{{hoax}}: 此条目真实性成疑", "{{hoax}}: 此條目真實性成疑"),
		value: 'hoax'
	},
	{
		label: wgUVS("{{non-free}}: 此条目可能过多或不当地使用了受版权保护的文字、图像或/及多媒体文件", "{{non-free}}: 此條目可能過多或不當地使用了受版權保護的文字、圖像或/及多媒體檔案"),
		value: 'non-free'
	},
	{
		label: wgUVS("{{notability}}: 此条目可能不符合通用关注度指引", "{{notability}}: 此條目可能不符合通用關注度指引"),
		value: 'notability',
		subgroup: {
			name: 'notability',
			type: 'select',
			list: [
				{
					label: wgUVS("{{notability}}: 通用的知名度标准", "{{notability}}: 通用的知名度標準"),
					value: "none"
				},
				{
					label: wgUVS("{{notability|Biographies}}: 人物传记", "{{notability|Biographies}}: 人物傳記"),
					value: "Biographies"
				},
				{
					label: wgUVS("{{notability|Fiction}}: 虚构事物", "{{notability|Fiction}}: 虛構事物"),
					value: "Fiction"
				},
				{
					label: wgUVS("{{notability|Neologisms}}: 发明、研究", "{{notability|Neologisms}}: 發明或研究"),
					value: "Neologisms"
				},
				{
					label: wgUVS("{{notability|Web}}: 网站、网络内容", "{{notability|Web}}: 網站或網絡內容"),
					value: "Web"
				}
			]
		}
	},
	{
		label: wgUVS("{{notability unreferenced}}: 此条目也许具备关注度，但需要可靠的来源来加以彰显", "{{notability unreferenced}}: 此條目也許具備關注度，但需要可靠的來源加以彰顯"),
		value: 'notability unreferenced'
	},
	{
		label: wgUVS("{{npov}}: 此条目的中立性有争议。内容、语调可能带有明显的个人观点或地方色彩", "{{npov}}: 此條目的中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩"),
		value: 'npov'
	},
	{
		label: wgUVS("{{off-topic}}: 这篇文章的内容文不对题", "{{off-topic}}: 這篇文章的內容文不對題"),
		value: 'off-topic'
	},
	{
		label: wgUVS("{{original research}}: 此条目可能包含原创研究或未查证内容", "{{original research}}: 此條目可能包含原創研究或未查證內容"),
		value: 'original research'
	},
	{
		label: wgUVS("{{primarysources}}: 此条目需要可靠、公开、第三方的来源", "{{primarysources}}: 此條目需要可靠、公開、第三方的來源"),
		value: 'primarysources'
	},
	{
		label: wgUVS("{{refimprove}}: 此条目需要补充更多来源", "{{refimprove}}: 此條目需要補充更多來源"),
		value: 'refimprove'
	},
	{
		label: wgUVS("{{review}}: 此条目或章节阅读起来类似评论", "{{review}}: 此條目或章節閱讀起來類似評論"),
		value: 'review'
	},
	{
		label: wgUVS("{{rewrite}}: 此条目或段落的质量低劣，需要完全重写", "{{rewrite}}: 此條目或段落的質量低劣，需要完全重寫"),
		value: 'rewrite'
	},
	{
		label: wgUVS("{{substub}}: 这篇是过于短小的文章", "{{substub}}: 這篇是過於短小的文章"),
		value: 'substub'
	},
	{
		label: wgUVS("{{unencyclopedic}}: 此条目可能不适合写入百科全书", "{{unencyclopedic}}: 此條目可能不適合寫入百科全書"),
		value: 'unencyclopedic'
	},
	{
		label: wgUVS("{{unreferenced}}: 此条目没有列出任何参考或来源", "{{unreferenced}}: 此條目沒有列出任何參考或來源"),
		value: 'unreferenced'
	},
	{
		label: wgUVS("{{update}}: 这个条目需要更新", "{{update}}: 這個條目需要更新"),
		value: 'update'
	},
	{
		label: wgUVS("{{weasel}}: 此条目可能因为语意模棱两可而损及其中立性", "{{weasel}}: 此條目可能因為語意模稜兩可而損及其中立性"),
		value: 'weasel'
	}
];

Twinkle.tag.noticeList = [
	{
		label: wgUVS("{{current}}: 本文记述一项新闻动态", "{{current}}: 本文記述一項新聞動態"),
		value: 'current',
		subgroup: {
			name: 'current',
			type: 'select',
			list: [
				{
					label: wgUVS("{{current}}: 本文记述一项新闻动态", "{{current}}: 本文記述一項新聞動態"),
					value: "current"
				},
				{
					label: wgUVS("{{current spaceflight}}: 本文或本章节是关于目前或最近的太空任务", "{{current spaceflight}}: 本文或本章節是關於目前或最近的太空任務"),
					value: "current spaceflight"
				},
				{
					label: wgUVS("{{current sport}}: 此条目记述一项近期体育赛事", "{{current sport}}: 此條目記述一項近期體育賽事"),
					value: "current sport"
				},
				{
					label: wgUVS("{{current related}}: 本条目和一项新闻动态相关", "{{current related}}: 本條目和一項新聞動態相關"),
					value: "current related"
				},
				{
					label: wgUVS("{{recent death}}: 这是一篇关于最近逝世人物的文章", "{{recent death}}: 這是一篇關於最近逝世人物的文章"),
					value: "recent death"
				}
			]
		}
	},
	{
		label: wgUVS("{{future}}: 此条目是关于未来已定或预期会发生的事件", "{{future}}: 此條目是關於未來已定或預期會發生的事件"),
		value: 'future',
		subgroup: {
			name: 'future',
			type: 'select',
			list: [
				{
					label: wgUVS("{{future}}: 此条目是关于未来已定或预期会发生的事件", "{{future}}: 此條目關於未來已定或預期會發生的事件"),
					value: "future"
				},
				{
					label: "工程",
					list: [
						{
							label: wgUVS("{{future infrastructure}}: 此条目是关于未来的建设或计划", "{{future infrastructure}}: 此條目是關於未來的建設或計劃"),
							value: "future infrastructure"
						},
						{
							label: wgUVS("{{future software}}: 此条目包含计划中或预期会发布的未来软件", "{{future software}}: 此條目包含計劃中或預期會發布的未來軟件"),
							value: "future software"
						},
						{
							label: wgUVS("{{future spaceflight}}: 本条目为已列入计划或可能进行的航天活动", "{{future spaceflight}}: 本條目為已列入計劃或可能進行的航天活動"),
							value: "future spaceflight"
						}
					]
				},
				{
					label: "娱乐",
					list: [
						{
							label: wgUVS("{{future film}}: 此条目是关于正在计划或拍摄中的电影", "{{future film}}: 此條目是關於正在計劃或拍攝中的電影"),
							value: "future film"
						},
						{
							label: wgUVS("{{future game}}: 此条目是关于尚未发行的电子游戏", "{{future game}}: 此條目是關於尚未發行的電子遊戲"),
							value: "future game"
						},
						{
							label: wgUVS("{{future tvshow}}: 此条目包含有关正在计划、拍摄中或有待播出的电视节目的信息", "{{future tvshow}}: 此條目包含有關正在計劃、拍攝中或有待播出之電視節目訊息"),
							value: "future tvshow"
						},
						{
							label: wgUVS("{{future tvshow information}}: 此条目包含有关正在播出的电视系列节目的信息", "{{future tvshow information}}: 此條目包含有關正在播出的電視系列節目之訊息"),
							value: "future tvshow information"
						}
					]
				},
				{
					label: "杂项",
					list: [
						{
							label: wgUVS("{{future election}}: 此条目是关于将举办或进行中的选举", "{{future election}}: 此條目是關於將舉辦或進行中的選舉"),
							value: "future election"
						},
						{
							label: wgUVS("{{future product}}: 此条目是关于未上市产品的信息", "{{future product}}: 此條目是關於未上市產品的訊息"),
							value: "future product"
						}
					]
				},
				{
					label: "运输",
					list: [
						{
							label: wgUVS("{{future public transportation}}: 本文是关于未来的公共运输建设或计划", "{{future public transportation}}: 本文是關於未來的公共運輸建設或計劃"),
							value: "future public transportation"
						}
					]
				},
				{
					label: "运动",
					list: [
						{
							label: wgUVS("{{future go}}: 此条目是关于一项预定进行的围棋赛", "{{future go}}: 此條目是關於一項預定進行的圍棋賽"),
							value: "future go"
						},
						{
							label: wgUVS("{{future sport}}: 此条目是关于一项预定进行的体育竞赛", "{{future sport}}: 此條目是關於一項預定進行的體育競賽"),
							value: "future sport"
						}
					]
				}
			]
		}
	},
	{
		label: wgUVS("{{inuse}}: 这篇文章正在进行重大修改", "{{inuse}}: 這篇文章正在進行重大修改"),
		value: 'inuse'
	},
	{
		label: wgUVS("{{underconstruction}}: 这个条目是一个扩展或大修改，它并未供使用", "{{underconstruction}}: 這個條目是一個擴展或大修改，它並未供使用"),
		value: 'underconstruction'
	}
];

// Tags for REDIRECTS start here

Twinkle.tag.spellingList = [
	{
		label: "{{簡繁重定向}}: 引导简体至繁体，或繁体至简体",
		value: '簡繁重定向'
	},
	{
		label: "{{模板重定向}}: 指向模板",
		value: '模板重定向'
	},
	{
		label: "{{别名重定向}}: 标题的其他名称、笔名、绰号、同义字等",
		value: '别名重定向'
	},
	{
		label: "{{縮寫重定向}}: 标题缩写",
		value: '縮寫重定向'
	},
	{
		label: "{{拼寫重定向}}: 标题的其他不同拼写",
		value: '拼寫重定向'
	},
	{
		label: "{{錯字重定向}}: 标题的常见错误拼写或误植",
		value: '錯字重定向'
	},
];

Twinkle.tag.alternativeList = [
	{
		label: "{{全名重定向}}: 标题的完整或更完整名称",
		value: '全名重定向'
	},
	{
		label: "{{短名重定向}}: 完整标题名称或人物全名的部分、不完整的名称或简称",
		value: '短名重定向'
	},
	{
		label: "{{姓氏重定向}}: 人物姓氏",
		value: '姓氏重定向'
	},
	{
		label: "{{人名重定向}}: 人物人名",
		value: '人名重定向'
	},
	{
		label: "{{非中文重定向}}: 非中文标题",
		value: '非中文重定向'
	},
	{
		label: "{{日文重定向}}: 日语名称",
		value: '日文重定向'
	}
];

Twinkle.tag.administrativeList = [
	{
		label: "{{角色重定向}}: 电视剧、电影、书籍等作品的角色",
		value: '角色重定向'
	},
	{
		label: "{{章節重定向}}: 导向至较高密度（散文般密集）组织的页面",
		value: '章節重定向'
	},
	{
		label: "{{列表重定向}}: 导向至低密度的列表",
		value: '列表重定向'
	},
	{
		label: "{{可能性重定向}}: 导向至当前提供内容更为详尽的目标页面、或该页面的章节段落",
		value: '可能性重定向'
	},
	{
		label: "{{關聯字重定向}}: 标题名称关联字",
		value: '關聯字重定向'
	},
	{
		label: "{{捷徑重定向}}: 维基百科捷径",
		value: '捷徑重定向'
	},
	{
		label: "{{重定向模板用重定向}}: 重定向模板用",
		value: '重定向模板用重定向'
	},
	{
		label: "{{EXIF重定向}}: JPEG图像包含EXIF信息",
		value: 'EXIF重定向'
	}
];

// maintenance tags for FILES start here
/* TODO(jimmyxu)

Twinkle.tag.file = {};

Twinkle.tag.file.licenseList = [
	{ label: '{{Bsr}}: source info consists of bare image URL/generic base URL only', value: 'Bsr' },
	{ label: '{{Non-free reduce}}: non-low-resolution fair use image (or too-long audio clip, etc)', value: 'Non-free reduce' },
	{ label: '{{Non-free reduced}}: fair use media which has been reduced (old versions need to be deleted)', value: 'Non-free reduced' }
];

Twinkle.tag.file.cleanupList = [
	{ label: '{{Artifacts}}: PNG contains residual compression artifacts', value: 'Artifacts' },
	{ label: '{{Bad font}}: SVG uses fonts not available on the thumbnail server', value: 'Bad font' },
	{ label: '{{Bad format}}: PDF/DOC/... file should be converted to a more useful format', value: 'Bad format' },
	{ label: '{{Bad GIF}}: GIF that should be PNG, JPEG, or SVG', value: 'Bad GIF' },
	{ label: '{{Bad JPEG}}: JPEG that should be PNG or SVG', value: 'Bad JPEG' },
	{ label: '{{Bad trace}}: auto-traced SVG requiring cleanup', value: 'Bad trace' },
	{ label: '{{Cleanup image}}: general cleanup', value: 'Cleanup image' },
	{ label: '{{Cleanup SVG}}: SVG needing code and/or appearance cleanup', value: 'Cleanup SVG' },
	{ label: '{{ClearType}}: image (not screenshot) with ClearType anti-aliasing', value: 'ClearType' },
	{ label: '{{Imagewatermark}}: image contains visible or invisible watermarking', value: 'Imagewatermark' },
	{ label: '{{NoCoins}}: image using coins to indicate scale', value: 'NoCoins' },
	{ label: '{{Overcompressed JPEG}}: JPEG with high levels of artifacts', value: 'Overcompressed JPEG' },
	{ label: '{{Opaque}}: opaque background should be transparent', value: 'Opaque' },
	{ label: '{{Remove border}}: unneeded border, white space, etc.', value: 'Remove border' },
	{ label: '{{Rename media}}: file should be renamed according to the criteria at [[WP:FMV]]', value: 'Rename media' },
	{ label: '{{Should be PNG}}: GIF or JPEG should be lossless', value: 'Should be PNG' },
	{
		label: '{{Should be SVG}}: PNG, GIF or JPEG should be vector graphics', value: 'Should be SVG',
		subgroup: {
			name: 'svgCategory',
			type: 'select',
			list: [
				{ label: '{{Should be SVG|other}}', value: 'other' },
				{ label: '{{Should be SVG|alphabet}}: character images, font examples, etc.', value: 'alphabet' },
				{ label: '{{Should be SVG|chemical}}: chemical diagrams, etc.', value: 'chemical' },
				{ label: '{{Should be SVG|circuit}}: electronic circuit diagrams, etc.', value: 'circuit' },
				{ label: '{{Should be SVG|coat of arms}}: coats of arms', value: 'coat of arms' },
				{ label: '{{Should be SVG|diagram}}: diagrams that do not fit any other subcategory', value: 'diagram' },
				{ label: '{{Should be SVG|emblem}}: emblems, free/libre logos, insignias, etc.', value: 'emblem' },
				{ label: '{{Should be SVG|fair use}}: fair-use images, fair-use logos', value: 'fair use' },
				{ label: '{{Should be SVG|flag}}: flags', value: 'flag' },
				{ label: '{{Should be SVG|graph}}: visual plots of data', value: 'graph' },
				{ label: '{{Should be SVG|logo}}: logos', value: 'logo' },
				{ label: '{{Should be SVG|map}}: maps', value: 'map' },
				{ label: '{{Should be SVG|music}}: musical scales, notes, etc.', value: 'music' },
				{ label: '{{Should be SVG|physical}}: "realistic" images of physical objects, people, etc.', value: 'physical' },
				{ label: '{{Should be SVG|symbol}}: miscellaneous symbols, icons, etc.', value: 'symbol' }
			]
		}
	},
	{ label: '{{Should be text}}: image should be represented as text, tables, or math markup', value: 'Should be text' }
];

Twinkle.tag.file.qualityList = [
	{ label: '{{Image-blownout}}', value: 'Image-blownout' },
	{ label: '{{Image-out-of-focus}}', value: 'Image-out-of-focus' },
	{ label: '{{Image-Poor-Quality}}', value: 'Image-Poor-Quality' },
	{ label: '{{Image-underexposure}}', value: 'Image-underexposure' },
	{ label: '{{Low quality chem}}: disputed chemical structures', value: 'Low quality chem' }
];

Twinkle.tag.file.commonsList = [
	{ label: '{{Copy to Commons}}: free media that should be copied to Commons', value: 'Copy to Commons' },
	{ label: '{{Do not move to Commons}} (PD issue): file is PD in the US but not in country of origin', value: 'Do not move to Commons' },
	{ label: '{{Do not move to Commons}} (other reason)', value: 'Do not move to Commons_reason' },
	{ label: '{{Keep local}}: request to keep local copy of a Commons file', value: 'Keep local' },
	{ label: '{{Now Commons}}: file has been copied to Commons', value: 'subst:ncd' },
	{ label: '{{Shadows Commons}}: a different file is present on Commons under the same filename', value: 'Shadows Commons' }
];

Twinkle.tag.file.replacementList = [
	{ label: '{{Obsolete}}: improved version available', value: 'Obsolete' },
	{ label: '{{Redundant}}: exact duplicate of another file, but not yet orphaned', value: 'Redundant' },
	{ label: '{{PNG version available}}', value: 'PNG version available' },
	{ label: '{{SVG version available}}', value: 'SVG version available' }
];

// Tags for DRAFT ARTICLES start here

Twinkle.tag.draftList = [
	{ label: '{{New unreviewed article}}: mark article for later review', value: 'new unreviewed article' }
];
*/

// Contains those article tags that can be grouped into {{multiple issues}}.
// This list includes synonyms.
Twinkle.tag.groupHash = [
	'blpsources',
	'citation style',
	'refimprove',
	'roughtranslation',
	'onesource',
	'primarysources',
	'review',
	'fansite',
	'howto',
	'contradiction',
	'intromissing',
	'update',
	'jargon',
	'inappropriate person',
	'npov',
	'or',
	'disputed',
	'blpdispute',
	'weasel',
	'globalize',
	'tone',
	'advert',
	'in-universe',
	'expert',
	'verylong',
	'expand',
	'orphan',
	'copyedit',
	'rewrite',
	'citecheck',
	'wikify',
	'trivia',
	'cleanup',
	'importance',
	'unencyclopedic',
	'newsrelease',
	'hoax',
	'grammar',
	'unreferenced'
];

Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		var tagRe, tagText = '', summaryText = '添加';
		var tags = [], groupableTags = [];
		var isNotability = false;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*(New unreviewed article|Userspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");

		var i;
		if( Twinkle.tag.mode !== 'redirect' ) {
			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( Twinkle.tag.groupHash.indexOf(params.tags[i]) !== -1 && 
							/*(params.tags[i] !== 'globalize' || params.globalizeSubcategory === 'globalize' ) &&*/
							(params.tags[i] !== 'notability' || params.notabilitySubcategory === 'none' )) {
						// don't add to multipleissues for globalize/notability subcats
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Status.info( '信息', '在条目上找到{{' + params.tags[i] +
						'}}…已排除' );
				}
			}

			if( params.group && groupableTags.length >= 3 ) {
				Status.info( '信息', '合并支持的模板到{{multiple issues}}' );

				groupableTags.sort();
				tagText += '{{multiple issues';
				summaryText += ' {{[[Template:multiple issues|multiple issues]]}}带有参数';
				for( i = 0; i < groupableTags.length; i++ ) {
					tagText += '|' + groupableTags[i] +
						'={{subst:#time:c}}';

					if( i === (groupableTags.length - 1) ) {
						summaryText += '和';
					} else if ( i < (groupableTags.length - 1) && i > 0 ) {
						summaryText += '、';
					}
					summaryText += groupableTags[i];
				}
				tagText += '}}\n';
			} else {
				tags = tags.concat( groupableTags );
			}
		} else {
			// Check for pre-existing tags
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					tags = tags.concat( params.tags[i] );
				} else {
					Status.info( '信息', '在重定向上找到{{' + params.tags[i] +
						'}}…已排除' );
				}
			}
		}

		tags.sort();
		for( i = 0; i < tags.length; i++ ) {
			var currentTag = "";
			if( tags[i] === 'uncategorized' || tags[i] === 'catimprove' ) {
				pageText += '\n\n{{' + tags[i] +
					'|date={{subst:#time:c}}}}';
			} else {
				/*
				if( tags[i] === 'globalize' ) {
					currentTag += '{{' + params.globalizeSubcategory;
				} else*/
				if (tags[i] == 'current') {
					currentTag += '{{' + self.params.currentSubcategory;
				} else if (tags[i] == 'future') {
					currentTag += '{{' + self.params.futureSubcategory;
				} else {
					currentTag += ( Twinkle.tag.mode === 'redirect' ? '\n' : '' ) + '{{' + tags[i];
					}

				if( tags[i] === 'notability' && params.notabilitySubcategory !== 'none' ) {
					currentTag += '|3=' + params.notabilitySubcategory;
				}
				if (tags[i] == 'notability') {
					isNotability = true;
				}
/*
				// prompt for other parameters, based on the tag
				switch( tags[i] ) {
					case 'cleanup':
						var reason = prompt('You can optionally enter a more specific reason why the article requires cleanup.  \n' +
							"Just click OK if you don't wish to enter this.  To skip the {{cleanup}} tag, click Cancel.", "");
						if (reason === null) {
							continue;
						} else if (reason !== "") {
							currentTag += '|reason=' + reason;
						}
						break;
					case 'copypaste':
						var url = prompt('Please enter the URL which is believed to be the source of the copy-paste.  \n' +
							"Just click OK if you don't know.  To skip the {{copypaste}} tag, click Cancel.", "");
						if (url === null) {
							continue;
						} else if (url !== "") {
							currentTag += '|url=' + url;
						}
						break;
					case 'notenglish':
						var langname = prompt('Please enter the name of the language the article is thought to be written in.  \n' +
							"Just click OK if you don't know.  To skip the {{notenglish}} tag, click Cancel.", "");
						if (langname === null) {
							continue;
						} else if (langname !== "") {
							currentTag += '|1=' + langname;
						}
						break;
					case 'roughtranslation':
						var roughlang = prompt('Please enter the name of the language the article is thought to have been translated from.  \n' +
							"Just click OK if you don't know.  To skip the {{roughtranslation}} tag, click Cancel.", "");
						if (roughlang === null) {
							continue;
						} else if (roughlang !== "") {
							currentTag += '|1=' + roughlang;
						}
						break;
					case 'merge':
					case 'merge to':
					case 'merge from':
						var param = prompt('Please enter the name of the other article(s) involved in the merge.  \n' +
							"To specify multiple articles, separate them with a vertical pipe (|) character.  \n" +
							"This information is required.  Click OK when done, or click Cancel to skip the merge tag.", "");
						if (param === null) {
							continue;
						} else if (param !== "") {
							currentTag += '|' + param;
						}
						break;
					default:
						break;
				}
				*/
				currentTag += Twinkle.tag.mode === 'redirect' ? '}}' : '|date={{subst:#time:c}}}}\n';
				tagText += currentTag;
			}

			if ( i > 0 || groupableTags.length > 3 ) {
				if( i === (tags.length - 1) ) {
					summaryText += '和';
				} else if ( i < (tags.length - 1) ) {
					summaryText += '、';
				}
			}

			summaryText += ' {{[[Template:';
			/*if( tags[i] === 'globalize' ) {
				summaryText += params.globalizeSubcategory + '|' + params.globalizeSubcategory;
			} else {*/
			summaryText += tags[i] + '|' + tags[i];
			summaryText += ']]}}';
		}

		if( Twinkle.tag.mode === 'redirect' ) {
			pageText += tagText;
		} else {
			// smartly insert the new tags after any hatnotes. Regex is a bit more
			// complicated than it'd need to be, to allow templates as parameters,
			// and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);
		}
		summaryText += ' tag' + ( ( tags.length + ( groupableTags.length > 3 ? 1 : 0 ) ) > 1 ? 's' : '' ) +
			' to ' + Twinkle.tag.mode + Twinkle.getPref('summaryAd');

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();
		
		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	}
/*
	file: function friendlytagCallbacksFile(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var summary = "Adding ";

		// Add in maintenance tags
		if (params.tags.length) {

			var tagtext = "";
			$.each(params.tags, function(k, tag) {
				tagtext += "{{" + (tag === "Do not move to Commons_reason" ? "Do not move to Commons" : tag);

				var input;
				switch (tag) {
					case "subst:ncd":
						/* falls through * /
					case "Keep local":
						input = prompt( "{{" + (tag === "subst:ncd" ? "Now Commons" : tag) +
							"}} - Enter the name of the image on Commons (if different from local name), excluding the File: prefix:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += '|1=' + input;
						}
						break;
					case "Rename media":
						input = prompt( "{{Rename media}} - Enter the new name for the image (optional):", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|1=" + input;
						}
						input = prompt( "{{Rename media}} - Enter the reason for the rename (optional):", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|2=" + input;
						}
						break;
					case "Cleanup image":
						/* falls through * /
					case "Cleanup SVG":
						input = prompt( "{{" + tag + "}} - Enter the reason for cleanup (required). To skip the tag, click Cancel:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|1=" + input;
						}
						break;
					case "Image-Poor-Quality":
						input = prompt( "{{Image-Poor-Quality}} - Enter the reason why this image is so bad (required). To skip the tag, click Cancel:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|1=" + input;
						}
						break;
					case "Low quality chem":
						input = prompt( "{{Low quality chem}} - Enter the reason why the diagram is disputed (required). To skip the tag, click Cancel:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|1=" + input;
						}
						break;
					case "PNG version available":
						/* falls through * /
					case "SVG version available":
						/* falls through * /
					case "Obsolete":
						/* falls through * /
					case "Redundant":
						input = prompt( "{{" + tag + "}} - Enter the name of the file which replaces this one (required). To skip the tag, click Cancel:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|1=" + input;
						}
						break;
					case "Do not move to Commons_reason":
						input = prompt( "{{Do not move to Commons}} - Enter the reason why this image should not be moved to Commons (required). To skip the tag, click Cancel:", "" );
						if (input === null) {
							return true;  // continue
						} else if (input !== "") {
							tagtext += "|reason=" + input;
						}
						break;
					default:
						break;  // don't care
				}

				if (tag === "Should be SVG") {
					tagtext += "|" + params.svgSubcategory;
				}

				tagtext += "}}\n";

				summary += "{{" + tag + "}}, ";

				return true;  // continue
			});

			text = tagtext + text;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary.substring(0, summary.length - 2) + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	}
*/
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};

	switch (Twinkle.tag.mode) {
		case 'article':
			if( Twinkle.getFriendlyPref('customTagList').length ) {
				params.tags = form.getChecked( 'notice' ).concat( form.getChecked( 'problem' ) ).concat( form.getChecked( 'maintenance' ) ).concat( form.getChecked( 'custom' ) );
			} else {
				params.tags = form.getChecked( 'notice' ).concat( form.getChecked( 'problem' ) ).concat( form.getChecked( 'maintenance' ) );
			}
			params.group = form.group.checked;
			/*params.globalizeSubcategory = form.getChecked( 'problem.globalize' );
			params.globalizeSubcategory = params.globalizeSubcategory ? params.globalizeSubcategory[0] : null;*/
			params.notabilitySubcategory = form.getChecked( 'problem.notability' );
			params.notabilitySubcategory = params.notabilitySubcategory ? params.notabilitySubcategory[0] : null;
			params.currentSubcategory = form.getChecked( 'problem.current' );
			params.currentSubcategory = params.currentSubcategory ? params.currentSubcategory[0] : null;
			params.futureSubcategory = form.getChecked( 'problem.future' );
			params.futureSubcategory = params.futureSubcategory ? params.futureSubcategory[0] : null;
			break;
		/*case 'file':
			params.svgSubcategory = form["imageTags.svgCategory"] ? form["imageTags.svgCategory"].value : null;
			params.tags = form.getChecked( 'imageTags' );
			break;*/
		case 'redirect':
			params.tags = form.getChecked( 'administrative' ).concat( form.getChecked( 'alternative' ) ).concat( form.getChecked( 'spelling' ) );
			break;
		/*case 'draft':
			params.tags = form.getChecked( 'draftTags' );
			Twinkle.tag.mode = 'article';
			break;*/
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	if( !params.tags.length ) {
		alert( '必须选择至少一个标记！' );
		return;
	}

	SimpleWindow.setButtonsEnabled( false );
	Status.init( form );

	Wikipedia.actionCompleted.redirect = mw.config.get('wgPageName');
	Wikipedia.actionCompleted.notice = "标记完成，在几秒内刷新页面";
	if (Twinkle.tag.mode === 'redirect') {
		Wikipedia.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Wikipedia.page(mw.config.get('wgPageName'), "正在标记" + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case 'article':
			/* falls through */
		case 'redirect':
			wikipedia_page.load(Twinkle.tag.callbacks.main);
			return;
		/*case 'file':
			wikipedia_page.load(Twinkle.tag.callbacks.file);
			return;*/
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}
};
