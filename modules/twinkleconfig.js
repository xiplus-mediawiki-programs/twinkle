//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleconfig.js: Preferences module
 ****************************************
 * Mode of invocation:     Adds configuration form to Wikipedia:Twinkle/Preferences and user
                           subpages named "/Twinkle preferences", and adds ad box to the top of user
                           subpages belonging to the currently logged-in user which end in '.js'
 * Active on:              What I just said.  Yeah.
 * Config directives in:   TwinkleConfig

 I, [[User:This, that and the other]], originally wrote this.  If the code is misbehaving, or you have any
 questions, don't hesitate to ask me.  (This doesn't at all imply [[WP:OWN]]ership - it's just meant to
 point you in the right direction.)  -- TTO
 */


Twinkle.config = {};

Twinkle.config.commonEnums = wgULS({
	watchlist: { yes: "添加到监视列表", no: "不添加到监视列表", "default": "遵守站点设置" },
	talkPageMode: { window: "在窗口中，替换成其它用户对话页", tab: "在新标签页中", blank: "在全新的窗口中" }
}, {
	watchlist: { yes: "加入到監視清單", no: "不加入到監視清單", "default": "遵守站點設定" },
	talkPageMode: { window: "在當前分頁，替換成其它用戶對話頁", tab: "在新分頁中", blank: "在新視窗中" }
});

Twinkle.config.commonSets = {
	csdCriteria: {
		db: wgULS("自定义理由", "自訂理由"),
		g1: "G1", g2: "G2", g3: "G3", g5: "G5", g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14", g15: "G15", g16: "G16",
		a1: "A1", a2: "A2", a3: "A3", a5: "A5", a6: "A6",
		o1: "O1", o3: "O3", o4: "O4",
		f1: "F1", f3: "F3", f4: "F4", f5: "F5", f6: "F6", f7: "F7",
		r2: "R2", r3: "R3", r5: "R5"
	},
	csdCriteriaDisplayOrder: [
		"db",
		"g1", "g2", "g3", "g5", "g10", "g11", "g12", "g13", "g14", "g15", "g16",
		"a1", "a2", "a3", "a5", "a6",
		"o1", "o3", "o4",
		"f1", "f3", "f4", "f5", "f6", "f7",
		"r2", "r3", "r5"
	],
	csdCriteriaNotification: {
		db: wgULS("自定义理由", "自訂理由"),
		g1: "G1", g2: "G2", g3: "G3", g5: "G5", g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14", g15: "G15", g16: "G16",
		a1: "A1", a2: "A2", a3: "A3", a5: "A5", a6: "A6",
		o1: "O1", o3: "O3", o4: "O4",
		f1: "F1", f3: "F3", f4: "F4", f5: "F5", f6: "F6", f7: "F7",
		r2: "R2", r3: "R3", r5: "R5"
	},
	csdCriteriaNotificationDisplayOrder: [
		"db",
		"g1", "g2", "g3", "g5", "g10", "g11", "g12", "g13", "g14", "g15", "g16",
		"a1", "a2", "a3", "a5", "a6",
		"o1", "o3", "o4",
		"f1", "f3", "f4", "f5", "f6", "f7",
		"r2", "r3", "r5"
	],
	csdAndDICriteria: {
		db: wgULS("自定义理由", "自訂理由"),
		g1: "G1", g2: "G2", g3: "G3", g5: "G5", g10: "G10", g11: "G11", g12: "G12", g13: "G13", g14: "G14", g15: "G15", g16: "G16",
		a1: "A1", a2: "A2", a3: "A3", a5: "A5", a6: "A6",
		o1: "O1", o3: "O3", o4: "O4",
		f1: "F1", f3: "F3", f4: "F4", f5: "F5", f6: "F6", f7: "F7",
		r2: "R2", r3: "R3", r5: "R5"
	},
	csdAndDICriteriaDisplayOrder: [
		"db",
		"g1", "g2", "g3", "g5", "g10", "g11", "g12", "g13", "g14", "g15", "g16",
		"a1", "a2", "a3", "a5", "a6",
		"o1", "o3", "o4",
		"f1", "f3", "f4", "f5", "f6", "f7",
		"r2", "r3", "r5"
	],
	namespacesNoSpecial: {
		"0": wgULS("（条目）", "（條目）"),
		"1": "Talk",
		"2": "User",
		"3": "User talk",
		"4": "Wikipedia",
		"5": "Wikipedia talk",
		"6": "File",
		"7": "File talk",
		"8": "MediaWiki",
		"9": "MediaWiki talk",
		"10": "Template",
		"11": "Template talk",
		"12": "Help",
		"13": "Help talk",
		"14": "Category",
		"15": "Category talk",
		"100": "Portal",
		"101": "Portal talk",
		"118": "Draft",
		"119": "Draft talk",
		"828": "Module",
		"829": "Module talk"
	}
};

/**
 * Section entry format:
 *
 * {
 *   title: <human-readable section title>,
 *   adminOnly: <true for admin-only sections>,
 *   hidden: <true for advanced preferences that rarely need to be changed - they can still be modified by manually editing twinkleoptions.js>,
 *   inFriendlyConfig: <true for preferences located under FriendlyConfig rather than TwinkleConfig>,
 *   preferences: [
 *     {
 *       name: <TwinkleConfig property name>,
 *       label: <human-readable short description - used as a form label>,
 *       helptip: <(optional) human-readable text (using valid HTML) that complements the description, like limits, warnings, etc.>
 *       adminOnly: <true for admin-only preferences>,
 *       type: <string|boolean|integer|enum|set|customList> (customList stores an array of JSON objects { value, label }),
 *       enumValues: <for type = "enum": a JSON object where the keys are the internal names and the values are human-readable strings>,
 *       setValues: <for type = "set": a JSON object where the keys are the internal names and the values are human-readable strings>,
 *       setDisplayOrder: <(optional) for type = "set": an array containing the keys of setValues (as strings) in the order that they are displayed>,
 *       customListValueTitle: <for type = "customList": the heading for the left "value" column in the custom list editor>,
 *       customListLabelTitle: <for type = "customList": the heading for the right "label" column in the custom list editor>
 *     },
 *     . . .
 *   ]
 * },
 * . . .
 *
 */

Twinkle.config.sections = [
{
	title: wgULS("常规", "常規"),
	preferences: [
		// TwinkleConfig.summaryAd (string)
		// Text to be appended to the edit summary of edits made using Twinkle
		{
			name: "summaryAd",
			label: wgULS("编辑摘要后缀", "編輯摘要後綴"),
			helptip: wgULS("应当由一个空格开头，并尽可能短。", "應當由一個空格開頭，並盡可能短。"),
			type: "string"
		},

		// TwinkleConfig.deletionSummaryAd (string)
		// Text to be appended to the edit summary of deletions made using Twinkle
		{
			name: "deletionSummaryAd",
			label: wgULS("删除摘要后缀", "刪除摘要後綴"),
			helptip: wgULS("通常和编辑摘要后缀一样。", "通常和編輯摘要後綴一樣。"),
			adminOnly: true,
			type: "string"
		},

		// TwinkleConfig.protectionSummaryAd (string)
		// Text to be appended to the edit summary of page protections made using Twinkle
		{
			name: "protectionSummaryAd",
			label: wgULS("保护摘要后缀", "保護摘要後綴"),
			helptip: wgULS("通常和编辑摘要后缀一样。", "通常和編輯摘要後綴一樣。"),
			adminOnly: true,
			type: "string"
		},

		// TwinkleConfig.blockSummaryAd (string)
		// Text to be appended to the edit summary of block made using Twinkle
		{
			name: "blockSummaryAd",
			label: wgULS("封禁摘要后缀", "封禁摘要後綴"),
			helptip: wgULS("通常和编辑摘要后缀一样。", "通常和編輯摘要後綴一樣。"),
			adminOnly: true,
			type: "string"
		},

		// TwinkleConfig.userTalkPageMode may take arguments:
		// 'window': open a new window, remember the opened window
		// 'tab': opens in a new tab, if possible.
		// 'blank': force open in a new window, even if such a window exists
		{
			name: "userTalkPageMode",
			label: wgULS("当要打开用户对话页时，", "當要開啟用戶對話頁時，"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.talkPageMode
		},

		// TwinkleConfig.dialogLargeFont (boolean)
		{
			name: "dialogLargeFont",
			label: wgULS("在Twinkle对话框中使用大号字体", "在Twinkle對話方塊中使用大號字型"),
			type: "boolean"
		}
	]
},

{
	title: "图片删除",
	preferences: [
		// TwinkleConfig.notifyUserOnDeli (boolean)
		// If the user should be notified after placing a file deletion tag
		{
			name: "notifyUserOnDeli",
			label: wgULS("默认勾选“通知创建者”", "預設勾選「通知建立者」"),
			type: "boolean"
		},

		// TwinkleConfig.deliWatchPage (string)
		// The watchlist setting of the page tagged for deletion. Either "yes", "no", or "default". Default is "default" (Duh).
		{
			name: "deliWatchPage",
			label: wgULS("标记图片时添加到监视列表", "標記圖片時加入到監視清單"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.deliWatchUser (string)
		// The watchlist setting of the user talk page if a notification is placed. Either "yes", "no", or "default". Default is "default" (Duh).
		{
			name: "deliWatchUser",
			label: wgULS("标记图片时添加创建者对话页到监视列表", "標記圖片時加入建立者對話頁到監視清單"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		}
	]
},

{
	title: "回退",  // twinklefluff module
	preferences: [
		// TwinkleConfig.openTalkPage (array)
		// What types of actions that should result in opening of talk page
		{
			name: "openTalkPage",
			label: wgULS("在这些类型的回退后打开用户对话页", "在這些類別的回退後開啟用戶對話頁"),
			type: "set",
			setValues: wgULS({ agf: "善意回退", norm: "常规回退", vand: "破坏回退", torev: "“恢复此版本”" }, { agf: "善意回退", norm: "常規回退", vand: "破壞回退", torev: "「恢復此版本」" })
		},

		// TwinkleConfig.openTalkPageOnAutoRevert (bool)
		// Defines if talk page should be opened when calling revert from contrib page, because from there, actions may be multiple, and opening talk page not suitable. If set to true, openTalkPage defines then if talk page will be opened.
		{
			name: "openTalkPageOnAutoRevert",
			label: wgULS("在从用户贡献中发起回退时打开用户对话页", "在從用戶貢獻中發起回退時開啟用戶對話頁"),
			helptip: wgULS("您经常会在破坏者的用户贡献中发起许多回退，总是打开用户对话页可能不太适当，所以这个选项默认关闭。当它打开时，依赖上一个设定。", "您經常會在破壞者的用戶貢獻中發起許多回退，總是開啟用戶對話頁可能不太適當，所以這個設定預設關閉。當它開啟時，依賴上一個設定。"),
			type: "boolean"
		},

		// TwinkleConfig.markRevertedPagesAsMinor (array)
		// What types of actions that should result in marking edit as minor
		{
			name: "markRevertedPagesAsMinor",
			label: wgULS("将这些类型的回退标记为小修改", "將這些類別的回退標記為小修改"),
			type: "set",
			setValues: wgULS({ agf: "善意回退", norm: "常规回退", vand: "破坏回退", torev: "“恢复此版本”" }, { agf: "善意回退", norm: "常規回退", vand: "破壞回退", torev: "「恢復此版本」" })
		},

		// TwinkleConfig.watchRevertedPages (array)
		// What types of actions that should result in forced addition to watchlist
		{
			name: "watchRevertedPages",
			label: wgULS("把这些类型的回退加入监视列表", "把這些類別的回退加入監視清單"),
			type: "set",
			setValues: wgULS({ agf: "善意回退", norm: "常规回退", vand: "破坏回退", torev: "“恢复此版本”" }, { agf: "善意回退", norm: "常規回退", vand: "破壞回退", torev: "「恢復此版本」" })
		},

		// TwinkleConfig.offerReasonOnNormalRevert (boolean)
		// If to offer a prompt for extra summary reason for normal reverts, default to true
		{
			name: "offerReasonOnNormalRevert",
			label: wgULS("常规回退时询问理由", "常規回退時詢問理由"),
			helptip: wgULS("“常规”回退是中间的那个[回退]链接。", "「常規」回退是中間的那個[回退]連結。"),
			type: "boolean"
		},

		{
			name: "confirmOnFluff",
			label: wgULS("回退前要求确认", "回退前要求確認"),
			helptip: wgULS("给那些手持手持设备的用户，或者意志不坚定的。", "給那些手持行動裝置的用戶，或者意志不堅定的。"),
			type: "boolean"
		},

		// TwinkleConfig.showRollbackLinks (array)
		// Where Twinkle should show rollback links (diff, others, mine, contribs)
		// Note from TTO: |contribs| seems to be equal to |others| + |mine|, i.e. redundant, so I left it out heres
		{
			name: "showRollbackLinks",
			label: wgULS("在这些页面上显示回退链接", "在這些頁面上顯示回退連結"),
			type: "set",
			setValues: wgULS({ diff: "差异", history: "历史记录", others: "其它用户的贡献", mine: "我的贡献" }, { diff: "差異", history: "歷史記錄", others: "其它用戶的貢獻", mine: "我的貢獻" })
		},

		{
			name: "rollbackInCurrentWindow",
			label: wgULS("在当前窗口内执行回退", "在目前視窗內執行回退"),
			helptip: wgULS("不要开新窗口或者改变当前窗口的状态，或者意志不坚定的。", "不要開新視窗或者改變目前視窗的狀態。"),
			type: "boolean"
		},
	]
},

{
	title: wgULS("共享IP标记", "共享IP標記"),
	inFriendlyConfig: true,
	preferences: [
		{
			name: "markSharedIPAsMinor",
			label: wgULS("将共享IP标记标记为小修改", "將共享IP標記標記為小修改"),
			type: "boolean"
		}
	]
},

{
	title: wgULS("快速删除", "快速刪除"),
	preferences: [
		{
			name: "speedySelectionStyle",
			label: wgULS("什么时候执行标记或删除", "什麼時候執行標記或刪除"),
			type: "enum",
			enumValues: wgULS({ "buttonClick": '当我点“提交”时', "radioClick": "当我点一个选项时" }, { "buttonClick": '當我點「提交」時', "radioClick": "當我點一個設定時" })
		},

		// TwinkleConfig.watchSpeedyPages (array)
		// Whether to add speedy tagged pages to watchlist
		{
			name: "watchSpeedyPages",
			label: wgULS("将以下理由添加到监视列表", "將以下理由加入到監視清單"),
			type: "set",
			setValues: Twinkle.config.commonSets.csdCriteria,
			setDisplayOrder: Twinkle.config.commonSets.csdCriteriaDisplayOrder
		},

		// TwinkleConfig.markSpeedyPagesAsPatrolled (boolean)
		// If, when applying speedy template to page, to mark the page as patrolled (if the page was reached from NewPages)
		{
			name: "markSpeedyPagesAsPatrolled",
			label: wgULS("标记时标记页面为已巡查（如可能）", "標記時標記頁面為已巡查（如可能）"),
			type: "boolean"
		},

		// TwinkleConfig.notifyUserOnSpeedyDeletionNomination (array)
		// What types of actions should result that the author of the page being notified of nomination
		{
			name: "notifyUserOnSpeedyDeletionNomination",
			label: wgULS("仅在使用以下理由时通知页面创建者", "僅在使用以下理由時通知頁面建立者"),
			helptip: wgULS("尽管您在对话框中选择通知，通知仍只会在使用这些理由时发出。", "盡管您在對話框中選擇通知，通知仍只會在使用這些理由時發出。"),
			type: "set",
			setValues: Twinkle.config.commonSets.csdCriteriaNotification,
			setDisplayOrder: Twinkle.config.commonSets.csdCriteriaNotificationDisplayOrder
		},

		// TwinkleConfig.welcomeUserOnSpeedyDeletionNotification (array of strings)
		// On what types of speedy deletion notifications shall the user be welcomed
		// with a "firstarticle" notice if his talk page has not yet been created.
		{
			name: "welcomeUserOnSpeedyDeletionNotification",
			label: wgULS("在使用以下理由时欢迎页面创建者", "在使用以下理由時歡迎頁面建立者"),
			helptip: wgULS("欢迎模板仅在用户被通知时加入，使用的模板是{{firstarticle}}。", "歡迎模板僅在用戶被通知時加入，使用的模板是{{firstarticle}}。"),
			type: "set",
			setValues: Twinkle.config.commonSets.csdCriteriaNotification,
			setDisplayOrder: Twinkle.config.commonSets.csdCriteriaNotificationDisplayOrder
		},

		// TwinkleConfig.promptForSpeedyDeletionSummary (array of strings)
		{
			name: "promptForSpeedyDeletionSummary",
			label: wgULS("使用以下理由删除时允许编辑删除理由", "使用以下理由刪除時允許編輯刪除理由"),
			adminOnly: true,
			type: "set",
			setValues: Twinkle.config.commonSets.csdAndDICriteria,
			setDisplayOrder: Twinkle.config.commonSets.csdAndDICriteriaDisplayOrder
		},

		// TwinkleConfig.openUserTalkPageOnSpeedyDelete (array of strings)
		// What types of actions that should result user talk page to be opened when speedily deleting (admin only)
		{
			name: "openUserTalkPageOnSpeedyDelete",
			label: wgULS("使用以下理由时打开用户对话页", "使用以下理由時開啟用戶對話頁"),
			adminOnly: true,
			type: "set",
			setValues: Twinkle.config.commonSets.csdAndDICriteria,
			setDisplayOrder: Twinkle.config.commonSets.csdAndDICriteriaDisplayOrder
		},

		// TwinkleConfig.deleteTalkPageOnDelete (boolean)
		// If talk page if exists should also be deleted (CSD G8) when spedying a page (admin only)
		{
			name: "deleteTalkPageOnDelete",
			label: wgULS("默认勾选“删除讨论页”", "預設勾選「刪除討論頁」"),
			adminOnly: true,
			type: "boolean"
		},

		{
			name: "deleteRedirectsOnDelete",
			label: wgULS("默认勾选“删除重定向”", "預設勾選「刪除重定向」"),
			adminOnly: true,
			type: "boolean"
		},

		// TwinkleConfig.deleteSysopDefaultToTag (boolean)
		// Make the CSD screen default to "tag" instead of "delete" (admin only)
		{
			name: "deleteSysopDefaultToTag",
			label: wgULS("默认为标记而不是直接删除", "預設為標記而不是直接刪除"),
			adminOnly: true,
			type: "boolean"
		},

		// TwinkleConfig.speedyWindowWidth (integer)
		// Defines the width of the Twinkle SD window in pixels
		{
			name: "speedyWindowWidth",
			label: wgULS("快速删除对话框宽度（像素）", "快速刪除對話方塊寬度（像素）"),
			type: "integer"
		},

		// TwinkleConfig.speedyWindowWidth (integer)
		// Defines the width of the Twinkle SD window in pixels
		{
			name: "speedyWindowHeight",
			label: wgULS("快速删除对话框高度（像素）", "快速刪除對話方塊高度（像素）"),
			helptip: wgULS("如果您有一只很大的监视器，您可以将此调高。", "如果您有一只很大的監視器，您可以將此調高。"),
			type: "integer"
		},

		{
			name: "logSpeedyNominations",
			label: wgULS("在用户空间中记录所有快速删除提名", "在用戶空間中記錄所有快速刪除提名"),
			helptip: wgULS("非管理员无法访问到已删除的贡献，用户空间日志提供了一个很好的方法来记录这些历史。", "非管理員無法訪問到已刪除的貢獻，用戶空間日誌提供了一個很好的方法來記錄這些歷史。"),
			type: "boolean"
		},
		{
			name: "speedyLogPageName",
			label: wgULS("在此页保留日志", "在此頁保留日誌"),
			helptip: wgULS("在此框中输入子页面名称，您将在User:<i>用户名</i>/<i>子页面</i>找到CSD日志。仅在打开日志时工作。", "在此框中輸入子頁面名稱，您將在User:<i>用戶名</i>/<i>子頁面</i>找到CSD日誌。僅在開啟日誌時工作。"),
			type: "string"
		},
		{
			name: "noLogOnSpeedyNomination",
			label: wgULS("在使用以下理由时不做记录", "在使用以下理由時不做記錄"),
			type: "set",
			setValues: Twinkle.config.commonSets.csdAndDICriteria,
			setDisplayOrder: Twinkle.config.commonSets.csdAndDICriteriaDisplayOrder
		},

		{
			name: "enlargeG11Input",
			label: wgULS("扩大CSD G11的按钮", "擴大CSD G11的按鈕"),
			helptip: wgULS("扩为默认的两倍大。", "擴為預設的兩倍大。"),
			type: "boolean"
		}
	]
},

{
	title: wgULS("标记", "標記"),
	inFriendlyConfig: true,
	preferences: [
		{
			name: "watchTaggedPages",
			label: wgULS("标记时添加到监视列表", "標記時加入到監視清單"),
			type: "boolean"
		},
		{
			name: "watchMergeDiscussions",
			label: wgULS("添加合并讨论时监视讨论页", "加入合併討論時監視討論頁"),
			type: "boolean"
		},
		{
			name: "markTaggedPagesAsMinor",
			label: wgULS("将标记标记为小修改", "將標記標記為小修改"),
			type: "boolean"
		},
		{
			name: "markTaggedPagesAsPatrolled",
			label: wgULS("默认勾选“标记页面为已巡查”框", "預設勾選「標記頁面為已巡查」框"),
			type: "boolean"
		},
		{
			name: "groupByDefault",
			label: wgULS("默认勾选“合并到{{multiple issues}}”复选框", "預設勾選「合併到{{multiple issues}}」核取方塊"),
			type: "boolean"
		},
		{
			name: "tagArticleSortOrder",
			label: wgULS("条目标记的默认查看方式", "條目標記的預設檢視方式"),
			type: "enum",
			enumValues: { "cat": wgULS("按类别", "按類別"), "alpha": "按字母" }
		},
		{
			name: "customTagList",
			label: wgULS("自定义条目维护标记", "自訂條目維護標記"),
			helptip: wgULS("这些会出现在列表的末尾。", "這些會出現在清單的末尾。"),
			type: "customList",
			customListValueTitle: wgULS("模板名（不含大括号）", "模板名（不含大括號）"),
			customListLabelTitle: wgULS("显示的文字", "顯示的文字")
		}
	]
},

{
	title: wgULS("回复", "回覆"),
	inFriendlyConfig: true,
	preferences: [
		{
			name: "markTalkbackAsMinor",
			label: wgULS("将回复标记为小修改", "將回覆標記為小修改"),
			type: "boolean"
		},
		{
			name: "insertTalkbackSignature",
			label: wgULS("回复时添加签名", "回覆時加入簽名"),
			helptip: wgULS("Flow页除外。", "Flow頁除外。"),
			type: "boolean"
		},
		{
			name: "talkbackHeading",
			label: wgULS("回复所用的小节标题", "回覆所用的小節標題"),
			type: "string"
		},
		{
			name: "mailHeading",
			label: wgULS("“有新邮件”所用的小节标题", "「有新郵件」所用的小節標題"),
			type: "string"
		}
	]
},

{
	title: wgULS("反链", "反連"),
	preferences: [
		// TwinkleConfig.unlinkNamespaces (array)
		// In what namespaces unlink should happen, default in 0 (article) and 100 (portal)
		{
			name: "unlinkNamespaces",
			label: wgULS("取消以下命名空间中的反链", "取消以下名字空間中的反連"),
			helptip: wgULS("请避免选择讨论页，因这样会导致Twinkle试图修改讨论存档。", "請避免選擇討論頁，因這樣會導致Twinkle試圖修改討論存檔。"),
			type: "set",
			setValues: Twinkle.config.commonSets.namespacesNoSpecial
		}
	]
},

{
	title: wgULS("警告用户", "警告用戶"),
	preferences: [
		// TwinkleConfig.defaultWarningGroup (int)
		// if true, watch the page which has been dispatched an warning or notice, if false, default applies
		{
			name: "defaultWarningGroup",
			label: wgULS("默认警告级别", "預設警告級別"),
			type: "enum",
			enumValues: wgULS({
				"1": "层级1",
				"2": "层级2",
				"3": "层级3",
				"4": "层级4",
				"5": "层级4im",
				"6": "单层级通知",
				"7": "单层级警告",
				"9": "自定义警告"
			}, {
				"1": "層級1",
				"2": "層級2",
				"3": "層級3",
				"4": "層級4",
				"5": "層級4im",
				"6": "單層級通知",
				"7": "單層級警告",
				"9": "自訂警告"
			})
		},

		// TwinkleConfig.showSharedIPNotice may take arguments:
		// true: to show shared ip notice if an IP address
		// false: to not print the notice
		{
			name: "showSharedIPNotice",
			label: wgULS("在IP对话页上显示附加信息", "在IP對話頁上顯示附加資訊"),
			helptip: wgULS("使用的模板是{{SharedIPAdvice}}。", "使用的模板是{{SharedIPAdvice}}。"),
			type: "boolean"
		},

		// TwinkleConfig.watchWarnings (boolean)
		// if true, watch the page which has been dispatched an warning or notice, if false, default applies
		{
			name: "watchWarnings",
			label: wgULS("警告时添加用户对话页到监视列表", "警告時加入用戶對話頁到監視清單"),
			helptip: wgULS("注意：如果对方使用Flow，对应讨论串总会加到监视列表中。", "注意：如果對方使用Flow，對應討論串總會加到監視清單中。"),
			type: "boolean"
		},

		{
			name: "customWarningList",
			label: wgULS("自定义警告模板", "自訂警告模板"),
			helptip: wgULS("您可以加入模板或用户子页面。自定义警告会出现在警告对话框中“自定义警告”一节。", "您可以加入模板或用戶子頁面。自訂警告會出現在警告對話框中「自訂警告」一節。"),
			type: "customList",
			customListValueTitle: wgULS("模板名（不含大括号）", "模板名（不含大括號）"),
			customListLabelTitle: wgULS("显示的文字（和编辑摘要）", "顯示的文字（和編輯摘要）")
		},

		{
			name: "markXfdPagesAsPatrolled",
			label: wgULS("在提交存废讨论时将页面标记为已巡查（如可能）", "在提交存廢討論時將頁面標記為已巡查（如可能）"),
			type: "boolean"
		}
	]
},

{
	title: wgULS("存废讨论", "存廢討論"),
	preferences: [
		// TwinkleConfig.xfdWatchPage (string)
		// The watchlist setting of the page being nominated for XfD. Either "yes" (add to watchlist), "no" (don't
		// add to watchlist), or "default" (use setting from preferences). Default is "default" (duh).
		{
			name: "xfdWatchPage",
			label: wgULS("添加提名的页面到监视列表", "加入提名的頁面到監視清單"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.xfdWatchDiscussion (string)
		// The watchlist setting of the newly created XfD page (for those processes that create discussion pages for each nomination),
		// or the list page for the other processes.
		// Either "yes" (add to watchlist), "no" (don't add to watchlist), or "default" (use setting from preferences). Default is "default" (duh).
		{
			name: "xfdWatchDiscussion",
			label: wgULS("添加存废讨论页到监视列表", "加入存廢討論頁到監視清單"),
			helptip: wgULS("当日的页面。", "當日的頁面。"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.xfdWatchUser (string)
		// The watchlist setting of the user if he receives a notification. Either "yes" (add to watchlist), "no" (don't
		// add to watchlist), or "default" (use setting from preferences). Default is "default" (duh).
		{
			name: "xfdWatchUser",
			label: wgULS("添加创建者对话页到监视列表（在通知时）", "加入建立者對話頁到監視清單（在通知時）"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.markXfdPagesAsPatrolled (boolean)
		// If, when applying xfd template to page, to mark the page as patrolled (if the page was reached from NewPages)
		{
			name: "markXfdPagesAsPatrolled",
			label: wgULS("标记时标记页面为已巡查（如可能）", "標記時標記頁面為已巡查（如可能）"),
			helptip: wgULS("基于技术原因，页面仅会在由Special:NewPages到达时被标记为已巡查。", "基於技術原因，頁面僅會在由Special:NewPages到達時被標記為已巡查。"),
			type: "boolean"
		},

		{
			name: "FwdCsdToXfd",
			label: wgULS("提删类别增加转交自快速删除候选", "提刪類別增加轉交自快速刪除候選"),
			helptip: wgULS("请确保您充分了解[[Wikipedia:快速删除方针]]才开启此功能。", "請確保您充分了解[[Wikipedia:快速刪除方針]]才開啟此功能。"),
			type: "boolean"
		},

		{
			name: "XfdClose",
			label: wgULS("在存废讨论显示关闭讨论按钮", "在存廢討論顯示關閉討論按鈕"),
			helptip: wgULS("请确保您充分了解[[Wikipedia:关闭删除讨论指南]]才开启此功能。", "請確保您充分了解[[Wikipedia:關閉刪除討論指南]]才開啟此功能。"),
			type: "enum",
			enumValues: wgULS({
				"hide": "不显示",
				"nonadminonly": "只包含非管理员可使用选项",
				"all": "显示所有选项"
			}, {
				"hide": "不顯示",
				"nonadminonly": "只包含非管理員可使用選項",
				"all": "顯示所有選項"
			})
		},
	]

},

{
	title: wgULS("侵犯版权", "侵犯版權"),
	preferences: [
		// TwinkleConfig.copyvioWatchPage (string)
		// The watchlist setting of the page being nominated for XfD. Either "yes" (add to watchlist), "no" (don't
		// add to watchlist), or "default" (use setting from preferences). Default is "default" (duh).
		{
			name: "copyvioWatchPage",
			label: wgULS("添加提报的页面到监视列表", "加入提報的頁面到監視清單"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.copyvioWatchUser (string)
		// The watchlist setting of the user if he receives a notification. Either "yes" (add to watchlist), "no" (don't
		// add to watchlist), or "default" (use setting from preferences). Default is "default" (duh).
		{
			name: "copyvioWatchUser",
			label: wgULS("添加创建者对话页到监视列表（在通知时）", "加入建立者對話頁到監視清單（在通知時）"),
			type: "enum",
			enumValues: Twinkle.config.commonEnums.watchlist
		},

		// TwinkleConfig.markCopyvioPagesAsPatrolled (boolean)
		// If, when applying copyvio template to page, to mark the page as patrolled (if the page was reached from NewPages)
		{
			name: "markCopyvioPagesAsPatrolled",
			label: wgULS("标记时标记页面为已巡查（如可能）", "標記時標記頁面為已巡查（如可能）"),
			helptip: wgULS("基于技术原因，页面仅会在由Special:NewPages到达时被标记为已巡查。", "基於技術原因，頁面僅會在由Special:NewPages到達時被標記為已巡查。"),
			type: "boolean"
		},

	]
},

{
	title: wgULS("隐藏", "隱藏"),
	hidden: true,
	preferences: [
		// twinkle.header.js: portlet setup
		{
			name: "portletArea",
			type: "string"
		},
		{
			name: "portletId",
			type: "string"
		},
		{
			name: "portletName",
			type: "string"
		},
		{
			name: "portletType",
			type: "string"
		},
		{
			name: "portletNext",
			type: "string"
		},
		// twinklefluff.js: defines how many revision to query maximum, maximum possible is 50, default is 50
		{
			name: "revertMaxRevisions",
			type: "integer"
		},
		// twinklebatchdelete.js: How many pages should be processed at a time
		{
			name: "batchdeleteChunks",
			type: "integer"
		},
		// twinklebatchdelete.js: How many pages left in the process of being completed should allow a new batch to be initialized
		{
			name: "batchDeleteMinCutOff",
			type: "integer"
		},
		// twinklebatchdelete.js: How many pages should be processed maximum
		{
			name: "batchMax",
			type: "integer"
		},
		// twinklebatchprotect.js: How many pages should be processed at a time
		{
			name: "batchProtectChunks",
			type: "integer"
		},
		// twinklebatchprotect.js: How many pages left in the process of being completed should allow a new batch to be initialized
		{
			name: "batchProtectMinCutOff",
			type: "integer"
		},
		// twinklebatchundelete.js: How many pages should be processed at a time
		{
			name: "batchundeleteChunks",
			type: "integer"
		},
		// twinklebatchundelete.js: How many pages left in the process of being completed should allow a new batch to be initialized
		{
			name: "batchUndeleteMinCutOff",
			type: "integer"
		},
		// twinkledeprod.js: How many pages should be processed at a time
		{
			name: "proddeleteChunks",
			type: "integer"
		}
	]
}

]; // end of Twinkle.config.sections

//{
//			name: "",
//			label: "",
//			type: ""
//		},


Twinkle.config.init = function twinkleconfigInit() {

	if ((mw.config.get("wgNamespaceNumber") === mw.config.get("wgNamespaceIds").project && mw.config.get("wgTitle") === "Twinkle/参数设置" ||
			(mw.config.get("wgNamespaceNumber") === mw.config.get("wgNamespaceIds").user && mw.config.get("wgTitle").lastIndexOf("/Twinkle参数") === (mw.config.get("wgTitle").length - 9))) &&
			mw.config.get("wgAction") === "view") {
		// create the config page at Wikipedia:Twinkle/参数设置, and at user subpages (for testing purposes)

		if (!document.getElementById("twinkle-config")) {
			return;  // maybe the page is misconfigured, or something - but any attempt to modify it will be pointless
		}

		// set style (the url() CSS function doesn't seem to work from wikicode - ?!)
		document.getElementById("twinkle-config-titlebar").style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAkCAMAAAB%2FqqA%2BAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAEhQTFRFr73ZobTPusjdsMHZp7nVwtDhzNbnwM3fu8jdq7vUt8nbxtDkw9DhpbfSvMrfssPZqLvVztbno7bRrr7W1d%2Fs1N7qydXk0NjpkW7Q%2BgAAADVJREFUeNoMwgESQCAAAMGLkEIi%2FP%2BnbnbpdB59app5Vdg0sXAoMZCpGoFbK6ciuy6FX4ABAEyoAef0BXOXAAAAAElFTkSuQmCC)";

		var contentdiv = document.getElementById("twinkle-config-content");
		contentdiv.textContent = "";  // clear children

		// let user know about possible conflict with monobook.js/vector.js file
		// (settings in that file will still work, but they will be overwritten by twinkleoptions.js settings)
		var contentnotice = document.createElement("p");
		// I hate innerHTML, but this is one thing it *is* good for...
		contentnotice.innerHTML = wgULS("<b>在这里修改您的参数设置之前，</b>确认您已移除了<a href=\"" + mw.util.getUrl("Special:MyPage/skin.js") + "\" title=\"Special:MyPage/skin.js\">用户JavaScript文件</a>中任何旧的<code>FriendlyConfig</code>设置。", "<b>在這裡修改您的偏好設定之前，</b>確認您已移除了<a href=\"" + mw.util.getUrl("Special:MyPage/skin.js") + "\" title=\"Special:MyPage/skin.js\">用戶JavaScript檔案</a>中任何舊的<code>FriendlyConfig</code>設定。");
		contentdiv.appendChild(contentnotice);

		// look and see if the user does in fact have any old settings in their skin JS file
		var skinjs = new Morebits.wiki.page("User:" + mw.config.get("wgUserName") + "/" + mw.config.get("skin") + ".js");
		skinjs.setCallbackParameters(contentnotice);
		skinjs.load(Twinkle.config.legacyPrefsNotice);

		// start a table of contents
		var toctable = document.createElement("div");
		toctable.className = "toc";
		toctable.style.marginLeft = "0.4em";
		// create TOC title
		var toctitle = document.createElement("div");
		toctitle.id = "toctitle";
		var toch2 = document.createElement("h2");
		toch2.textContent = wgULS("目录 ", "目錄 ");
		toctitle.appendChild(toch2);
		// add TOC show/hide link
		var toctoggle = document.createElement("span");
		toctoggle.className = "toctoggle";
		toctoggle.appendChild(document.createTextNode("["));
		var toctogglelink = document.createElement("a");
		toctogglelink.className = "internal";
		toctogglelink.setAttribute("href", "#tw-tocshowhide");
		toctogglelink.textContent = wgULS("隐藏", "隱藏");
		toctoggle.appendChild(toctogglelink);
		toctoggle.appendChild(document.createTextNode("]"));
		toctitle.appendChild(toctoggle);
		toctable.appendChild(toctitle);
		// create item container: this is what we add stuff to
		var tocul = document.createElement("ul");
		toctogglelink.addEventListener("click", function twinkleconfigTocToggle() {
			var $tocul = $(tocul);
			$tocul.toggle();
			if ($tocul.find(":visible").length) {
				toctogglelink.textContent = wgULS("隐藏", "隱藏");
			} else {
				toctogglelink.textContent = wgULS("显示", "顯示");
			}
		}, false);
		toctable.appendChild(tocul);
		contentdiv.appendChild(toctable);

		var tocnumber = 1;

		var contentform = document.createElement("form");
		contentform.setAttribute("action", "javascript:void(0)");  // was #tw-save - changed to void(0) to work around Chrome issue
		contentform.addEventListener("submit", Twinkle.config.save, true);
		contentdiv.appendChild(contentform);

		var container = document.createElement("table");
		container.style.width = "100%";
		contentform.appendChild(container);

		$(Twinkle.config.sections).each(function(sectionkey, section) {
			if (section.hidden || (section.adminOnly && !Morebits.userIsInGroup("sysop"))) {
				return true;  // i.e. "continue" in this context
			}

			var configgetter;  // retrieve the live config values
			if (section.inFriendlyConfig) {
				configgetter = Twinkle.getFriendlyPref;
			} else {
				configgetter = Twinkle.getPref;
			}

			// add to TOC
			var tocli = document.createElement("li");
			tocli.className = "toclevel-1";
			var toca = document.createElement("a");
			toca.setAttribute("href", "#twinkle-config-section-" + tocnumber.toString());
			toca.appendChild(document.createTextNode(section.title));
			tocli.appendChild(toca);
			tocul.appendChild(tocli);

			var row = document.createElement("tr");
			var cell = document.createElement("td");
			cell.setAttribute("colspan", "3");
			var heading = document.createElement("h4");
			heading.style.borderBottom = "1px solid gray";
			heading.style.marginTop = "0.2em";
			heading.id = "twinkle-config-section-" + (tocnumber++).toString();
			heading.appendChild(document.createTextNode(section.title));
			cell.appendChild(heading);
			row.appendChild(cell);
			container.appendChild(row);

			var rowcount = 1;  // for row banding

			// add each of the preferences to the form
			$(section.preferences).each(function(prefkey, pref) {
				if (pref.adminOnly && !Morebits.userIsInGroup("sysop")) {
					return true;  // i.e. "continue" in this context
				}

				row = document.createElement("tr");
				row.style.marginBottom = "0.2em";
				// create odd row banding
				if (rowcount++ % 2 === 0) {
					row.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
				}
				cell = document.createElement("td");

				var label, input;
				switch (pref.type) {

					case "boolean":  // create a checkbox
						cell.setAttribute("colspan", "2");

						label = document.createElement("label");
						input = document.createElement("input");
						input.setAttribute("type", "checkbox");
						input.setAttribute("id", pref.name);
						input.setAttribute("name", pref.name);
						if (configgetter(pref.name) === true) {
							input.setAttribute("checked", "checked");
						}
						label.appendChild(input);
						label.appendChild(document.createTextNode(" " + pref.label));
						cell.appendChild(label);
						break;

					case "string":  // create an input box
					case "integer":
						// add label to first column
						cell.style.textAlign = "right";
						cell.style.paddingRight = "0.5em";
						label = document.createElement("label");
						label.setAttribute("for", pref.name);
						label.appendChild(document.createTextNode(pref.label + ":"));
						cell.appendChild(label);
						row.appendChild(cell);

						// add input box to second column
						cell = document.createElement("td");
						cell.style.paddingRight = "1em";
						input = document.createElement("input");
						input.setAttribute("type", "text");
						input.setAttribute("id", pref.name);
						input.setAttribute("name", pref.name);
						if (pref.type === "integer") {
							input.setAttribute("size", 6);
							input.setAttribute("type", "number");
							input.setAttribute("step", "1");  // integers only
						}
						if (configgetter(pref.name)) {
							input.setAttribute("value", configgetter(pref.name));
						}
						cell.appendChild(input);
						break;

					case "enum":  // create a combo box
						// add label to first column
						// note: duplicates the code above, under string/integer
						cell.style.textAlign = "right";
						cell.style.paddingRight = "0.5em";
						label = document.createElement("label");
						label.setAttribute("for", pref.name);
						label.appendChild(document.createTextNode(pref.label + ":"));
						cell.appendChild(label);
						row.appendChild(cell);

						// add input box to second column
						cell = document.createElement("td");
						cell.style.paddingRight = "1em";
						input = document.createElement("select");
						input.setAttribute("id", pref.name);
						input.setAttribute("name", pref.name);
						$.each(pref.enumValues, function(enumvalue, enumdisplay) {
							var option = document.createElement("option");
							option.setAttribute("value", enumvalue);
							if (configgetter(pref.name) === enumvalue) {
								option.setAttribute("selected", "selected");
							}
							option.appendChild(document.createTextNode(enumdisplay));
							input.appendChild(option);
						});
						cell.appendChild(input);
						break;

					case "set":  // create a set of check boxes
						// add label first of all
						cell.setAttribute("colspan", "2");
						label = document.createElement("label");  // not really necessary to use a label element here, but we do it for consistency of styling
						label.appendChild(document.createTextNode(pref.label + ":"));
						cell.appendChild(label);

						var checkdiv = document.createElement("div");
						checkdiv.style.paddingLeft = "1em";
						var worker = function(itemkey, itemvalue) {
							var checklabel = document.createElement("label");
							checklabel.style.marginRight = "0.7em";
							checklabel.style.display = "inline-block";
							var check = document.createElement("input");
							check.setAttribute("type", "checkbox");
							check.setAttribute("id", pref.name + "_" + itemkey);
							check.setAttribute("name", pref.name + "_" + itemkey);
							if (configgetter(pref.name) && configgetter(pref.name).indexOf(itemkey) !== -1) {
								check.setAttribute("checked", "checked");
							}
							// cater for legacy integer array values for unlinkNamespaces (this can be removed a few years down the track...)
							if (pref.name === "unlinkNamespaces") {
								if (configgetter(pref.name) && configgetter(pref.name).indexOf(parseInt(itemkey, 10)) !== -1) {
									check.setAttribute("checked", "checked");
								}
							}
							checklabel.appendChild(check);
							checklabel.appendChild(document.createTextNode(itemvalue));
							checkdiv.appendChild(checklabel);
						};
						if (pref.setDisplayOrder) {
							// add check boxes according to the given display order
							$.each(pref.setDisplayOrder, function(itemkey, item) {
								worker(item, pref.setValues[item]);
							});
						} else {
							// add check boxes according to the order it gets fed to us (probably strict alphabetical)
							$.each(pref.setValues, worker);
						}
						cell.appendChild(checkdiv);
						break;

					case "customList":
						// add label to first column
						cell.style.textAlign = "right";
						cell.style.paddingRight = "0.5em";
						label = document.createElement("label");
						label.setAttribute("for", pref.name);
						label.appendChild(document.createTextNode(pref.label + ":"));
						cell.appendChild(label);
						row.appendChild(cell);

						// add button to second column
						cell = document.createElement("td");
						cell.style.paddingRight = "1em";
						var button = document.createElement("button");
						button.setAttribute("id", pref.name);
						button.setAttribute("name", pref.name);
						button.setAttribute("type", "button");
						button.addEventListener("click", Twinkle.config.listDialog.display, false);
						// use jQuery data on the button to store the current config value
						$(button).data({
							value: configgetter(pref.name),
							pref: pref,
							inFriendlyConfig: section.inFriendlyConfig
						});
						button.appendChild(document.createTextNode(wgULS("编辑项目", "編輯項目")));
						cell.appendChild(button);
						break;

					default:
						alert("twinkleconfig: 未知类型的属性 " + pref.name);
						break;
				}
				row.appendChild(cell);

				// add help tip
				cell = document.createElement("td");
				cell.style.fontSize = "90%";

				cell.style.color = "gray";
				if (pref.helptip) {
					// convert mentions of templates in the helptip to clickable links
					cell.innerHTML = pref.helptip.replace(/{{(.+?)}}/g,
						'{{<a href="' + mw.util.getUrl("Template:") + '$1" target="_blank">$1</a>}}')
							.replace(/\[\[(.+?)]]/g,
						'<a href="' + mw.util.getUrl("") + '$1" target="_blank">$1</a>');
				}
				// add reset link (custom lists don't need this, as their config value isn't displayed on the form)
				if (pref.type !== "customList") {
					var resetlink = document.createElement("a");
					resetlink.setAttribute("href", "#tw-reset");
					resetlink.setAttribute("id", "twinkle-config-reset-" + pref.name);
					resetlink.addEventListener("click", Twinkle.config.resetPrefLink, false);
					if (resetlink.style.styleFloat) {  // IE (inc. IE9)
						resetlink.style.styleFloat = "right";
					} else {  // standards
						resetlink.style.cssFloat = "right";
					}
					resetlink.style.margin = "0 0.6em";
					resetlink.appendChild(document.createTextNode(wgULS("复位", "復位")));
					cell.appendChild(resetlink);
				}
				row.appendChild(cell);

				container.appendChild(row);
				return true;
			});
			return true;
		});

		var footerbox = document.createElement("div");
		footerbox.setAttribute("id", "twinkle-config-buttonpane");
		footerbox.style.backgroundColor = "#BCCADF";
		footerbox.style.padding = "0.5em";
		var button = document.createElement("button");
		button.setAttribute("id", "twinkle-config-submit");
		button.setAttribute("type", "submit");
		button.appendChild(document.createTextNode(wgULS("保存修改", "儲存修改")));
		footerbox.appendChild(button);
		var footerspan = document.createElement("span");
		footerspan.className = "plainlinks";
		footerspan.style.marginLeft = "2.4em";
		footerspan.style.fontSize = "90%";
		var footera = document.createElement("a");
		footera.setAttribute("href", "#tw-reset-all");
		footera.setAttribute("id", "twinkle-config-resetall");
		footera.addEventListener("click", Twinkle.config.resetAllPrefs, false);
		footera.appendChild(document.createTextNode(wgULS("恢复默认", "恢復預設")));
		footerspan.appendChild(footera);
		footerbox.appendChild(footerspan);
		contentform.appendChild(footerbox);

		// since all the section headers exist now, we can try going to the requested anchor
		if (location.hash) {
			location.hash = location.hash;
		}

	} else if (mw.config.get("wgNamespaceNumber") === mw.config.get("wgNamespaceIds").user &&
			mw.config.get("wgTitle").indexOf(mw.config.get("wgUserName")) === 0 &&
			mw.config.get("wgPageName").slice(-3) === ".js") {

		var box = document.createElement("div");
		box.setAttribute("id", "twinkle-config-headerbox");
		box.style.border = "1px #f60 solid";
		box.style.background = "#fed";
		box.style.padding = "0.6em";
		box.style.margin = "0.5em auto";
		box.style.textAlign = "center";

		var link,
			scriptPageName = mw.config.get("wgPageName").slice(mw.config.get("wgPageName").lastIndexOf("/") + 1,
				mw.config.get("wgPageName").lastIndexOf(".js"));

		if (scriptPageName === "twinkleoptions") {
			// place "why not try the preference panel" notice
			box.style.fontWeight = "bold";
			box.style.width = "80%";
			box.style.borderWidth = "2px";

			if (mw.config.get("wgArticleId") > 0) {  // page exists
				box.appendChild(document.createTextNode(wgULS("这页包含您的Twinkle参数设置，您可使用", "這頁包含您的Twinkle偏好設定，您可使用")));
			} else {  // page does not exist
				box.appendChild(document.createTextNode(wgULS("您可配置您的Twinkle，通过使用", "您可配置您的Twinkle，通過使用")));
			}
			link = document.createElement("a");
			link.setAttribute("href", mw.util.getUrl(mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").project] + ":Twinkle/参数设置") );
			link.appendChild(document.createTextNode(wgULS("Twinkle参数设置面板", "Twinkle偏好設定面板")));
			box.appendChild(link);
			box.appendChild(document.createTextNode(wgULS("，或直接编辑本页。", "，或直接編輯本頁。")));
			$(box).insertAfter($("#contentSub"));

		} else if (["monobook", "vector", "cologneblue", "modern", "common"].indexOf(scriptPageName) !== -1) {
			// place "Looking for Twinkle options?" notice
			box.style.width = "60%";

			box.appendChild(document.createTextNode(wgULS("如果您想配置您的Twinkle，请使用", "如果您想配置您的Twinkle，請使用")));
			link = document.createElement("a");
			link.setAttribute("href", mw.util.getUrl(mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").project] + ":Twinkle/参数设置") );
			link.appendChild(document.createTextNode(wgULS("Twinkle参数设置面板", "Twinkle偏好設定面板")));
			box.appendChild(link);
			box.appendChild(document.createTextNode("。"));
			$(box).insertAfter($("#contentSub"));
		}
	}
};

// Morebits.wiki.page callback from init code
Twinkle.config.legacyPrefsNotice = function twinkleconfigLegacyPrefsNotice(pageobj) {
	var text = pageobj.getPageText();
	var contentnotice = pageobj.getCallbackParameters();
	if (text.indexOf("TwinkleConfig") !== -1 || text.indexOf("FriendlyConfig") !== -1) {
		contentnotice.innerHTML = '<table class="plainlinks ombox ombox-content"><tr><td class="mbox-image">' +
			'<img alt="" src="http://upload.wikimedia.org/wikipedia/en/3/38/Imbox_content.png" /></td>' +
			'<td class="mbox-text"><p><big><b>在这里修改您的参数设置之前，</b>您必须移除在用户JavaScript文件中任何旧的Friendly设置。</big></p>' +
			'<p>要这样做，您可以<a href="' + mw.config.get("wgScript") + '?title=User:' + encodeURIComponent(mw.config.get("wgUserName")) + '/' + mw.config.get("skin") + '.js&action=edit" target="_blank"><b>编辑您的个人JavaScript</b></a>。删除提到<code>FriendlyConfig</code>的代码。</p>' +
			'</td></tr></table>';
	} else {
		$(contentnotice).remove();
	}
};

// custom list-related stuff

Twinkle.config.listDialog = {};

Twinkle.config.listDialog.addRow = function twinkleconfigListDialogAddRow(dlgtable, value, label) {
	var contenttr = document.createElement("tr");
	// "remove" button
	var contenttd = document.createElement("td");
	var removeButton = document.createElement("button");
	removeButton.setAttribute("type", "button");
	removeButton.addEventListener("click", function() { $(contenttr).remove(); }, false);
	removeButton.textContent = "移除";
	contenttd.appendChild(removeButton);
	contenttr.appendChild(contenttd);

	// value input box
	contenttd = document.createElement("td");
	var input = document.createElement("input");
	input.setAttribute("type", "text");
	input.className = "twinkle-config-customlist-value";
	input.style.width = "97%";
	if (value) {
		input.setAttribute("value", value);
	}
	contenttd.appendChild(input);
	contenttr.appendChild(contenttd);

	// label input box
	contenttd = document.createElement("td");
	input = document.createElement("input");
	input.setAttribute("type", "text");
	input.className = "twinkle-config-customlist-label";
	input.style.width = "98%";
	if (label) {
		input.setAttribute("value", label);
	}
	contenttd.appendChild(input);
	contenttr.appendChild(contenttd);

	dlgtable.appendChild(contenttr);
};

Twinkle.config.listDialog.display = function twinkleconfigListDialogDisplay(e) {
	var $prefbutton = $(e.target);
	var curvalue = $prefbutton.data("value");
	var curpref = $prefbutton.data("pref");

	var dialog = new Morebits.simpleWindow(720, 400);
	dialog.setTitle(curpref.label);
	dialog.setScriptName(wgULS("Twinkle参数设置", "Twinkle偏好設定"));

	var dialogcontent = document.createElement("div");
	var dlgtable = document.createElement("table");
	dlgtable.className = "wikitable";
	dlgtable.style.margin = "1.4em 1em";
	dlgtable.style.width = "97%";

	var dlgtbody = document.createElement("tbody");

	// header row
	var dlgtr = document.createElement("tr");
	// top-left cell
	var dlgth = document.createElement("th");
	dlgth.style.width = "5%";
	dlgtr.appendChild(dlgth);
	// value column header
	dlgth = document.createElement("th");
	dlgth.style.width = "35%";
	dlgth.textContent = (curpref.customListValueTitle ? curpref.customListValueTitle : wgULS("数值", "數值"));
	dlgtr.appendChild(dlgth);
	// label column header
	dlgth = document.createElement("th");
	dlgth.style.width = "60%";
	dlgth.textContent = (curpref.customListLabelTitle ? curpref.customListLabelTitle : wgULS("标签", "標籤"));
	dlgtr.appendChild(dlgth);
	dlgtbody.appendChild(dlgtr);

	// content rows
	var gotRow = false;
	$.each(curvalue, function(k, v) {
		gotRow = true;
		Twinkle.config.listDialog.addRow(dlgtbody, v.value, v.label);
	});
	// if there are no values present, add a blank row to start the user off
	if (!gotRow) {
		Twinkle.config.listDialog.addRow(dlgtbody);
	}

	// final "add" button
	var dlgtfoot = document.createElement("tfoot");
	dlgtr = document.createElement("tr");
	var dlgtd = document.createElement("td");
	dlgtd.setAttribute("colspan", "3");
	var addButton = document.createElement("button");
	addButton.style.minWidth = "8em";
	addButton.setAttribute("type", "button");
	addButton.addEventListener("click", function(e) {
		Twinkle.config.listDialog.addRow(dlgtbody);
	}, false);
	addButton.textContent = "添加";
	dlgtd.appendChild(addButton);
	dlgtr.appendChild(dlgtd);
	dlgtfoot.appendChild(dlgtr);

	dlgtable.appendChild(dlgtbody);
	dlgtable.appendChild(dlgtfoot);
	dialogcontent.appendChild(dlgtable);

	// buttonpane buttons: [Save changes] [Reset] [Cancel]
	var button = document.createElement("button");
	button.setAttribute("type", "submit");  // so Morebits.simpleWindow puts the button in the button pane
	button.addEventListener("click", function(e) {
		Twinkle.config.listDialog.save($prefbutton, dlgtbody);
		dialog.close();
	}, false);
	button.textContent = wgULS("保存修改", "儲存變更");
	dialogcontent.appendChild(button);
	button = document.createElement("button");
	button.setAttribute("type", "submit");  // so Morebits.simpleWindow puts the button in the button pane
	button.addEventListener("click", function(e) {
		Twinkle.config.listDialog.reset($prefbutton, dlgtbody);
	}, false);
	button.textContent = wgULS("复位", "復位");
	dialogcontent.appendChild(button);
	button = document.createElement("button");
	button.setAttribute("type", "submit");  // so Morebits.simpleWindow puts the button in the button pane
	button.addEventListener("click", function(e) {
		dialog.close();  // the event parameter on this function seems to be broken
	}, false);
	button.textContent = "取消";
	dialogcontent.appendChild(button);

	dialog.setContent(dialogcontent);
	dialog.display();
};

// Resets the data value, re-populates based on the new (default) value, then saves the
// old data value again (less surprising behaviour)
Twinkle.config.listDialog.reset = function twinkleconfigListDialogReset(button, tbody) {
	// reset value on button
	var $button = $(button);
	var curpref = $button.data("pref");
	var oldvalue = $button.data("value");
	Twinkle.config.resetPref(curpref, $button.data("inFriendlyConfig"));

	// reset form
	var $tbody = $(tbody);
	$tbody.find("tr").slice(1).remove();  // all rows except the first (header) row
	// add the new values
	var curvalue = $button.data("value");
	$.each(curvalue, function(k, v) {
		Twinkle.config.listDialog.addRow(tbody, v.value, v.label);
	});

	// save the old value
	$button.data("value", oldvalue);
};

Twinkle.config.listDialog.save = function twinkleconfigListDialogSave(button, tbody) {
	var result = [];
	var current = {};
	$(tbody).find('input[type="text"]').each(function(inputkey, input) {
		if ($(input).hasClass("twinkle-config-customlist-value")) {
			current = { value: input.value };
		} else {
			current.label = input.value;
			// exclude totally empty rows
			if (current.value || current.label) {
				result.push(current);
			}
		}
	});
	$(button).data("value", result);
};

// reset/restore defaults

Twinkle.config.resetPrefLink = function twinkleconfigResetPrefLink(e) {
	var wantedpref = e.target.id.substring(21); // "twinkle-config-reset-" prefix is stripped

	// search tactics
	$(Twinkle.config.sections).each(function(sectionkey, section) {
		if (section.hidden || (section.adminOnly && !Morebits.userIsInGroup("sysop"))) {
			return true;  // continue: skip impossibilities
		}

		var foundit = false;

		$(section.preferences).each(function(prefkey, pref) {
			if (pref.name !== wantedpref) {
				return true;  // continue
			}
			Twinkle.config.resetPref(pref, section.inFriendlyConfig);
			foundit = true;
			return false;  // break
		});

		if (foundit) {
			return false;  // break
		}
	});
	return false;  // stop link from scrolling page
};

Twinkle.config.resetPref = function twinkleconfigResetPref(pref, inFriendlyConfig) {
	switch (pref.type) {

		case "boolean":
			document.getElementById(pref.name).checked = (inFriendlyConfig ?
				Twinkle.defaultConfig.friendly[pref.name] : Twinkle.defaultConfig.twinkle[pref.name]);
			break;

		case "string":
		case "integer":
		case "enum":
			document.getElementById(pref.name).value = (inFriendlyConfig ?
				Twinkle.defaultConfig.friendly[pref.name] : Twinkle.defaultConfig.twinkle[pref.name]);
			break;

		case "set":
			$.each(pref.setValues, function(itemkey, itemvalue) {
				if (document.getElementById(pref.name + "_" + itemkey)) {
					document.getElementById(pref.name + "_" + itemkey).checked = ((inFriendlyConfig ?
						Twinkle.defaultConfig.friendly[pref.name] : Twinkle.defaultConfig.twinkle[pref.name]).indexOf(itemkey) !== -1);
				}
			});
			break;

		case "customList":
			$(document.getElementById(pref.name)).data("value", (inFriendlyConfig ?
				Twinkle.defaultConfig.friendly[pref.name] : Twinkle.defaultConfig.twinkle[pref.name]));
			break;

		default:
			alert("twinkleconfig: unknown data type for preference " + pref.name);
			break;
	}
};

Twinkle.config.resetAllPrefs = function twinkleconfigResetAllPrefs() {
	// no confirmation message - the user can just refresh/close the page to abort
	$(Twinkle.config.sections).each(function(sectionkey, section) {
		if (section.hidden || (section.adminOnly && !Morebits.userIsInGroup("sysop"))) {
			return true;  // continue: skip impossibilities
		}
		$(section.preferences).each(function(prefkey, pref) {
			if (!pref.adminOnly || Morebits.userIsInGroup("sysop")) {
				Twinkle.config.resetPref(pref, section.inFriendlyConfig);
			}
		});
		return true;
	});
	return false;  // stop link from scrolling page
};

Twinkle.config.save = function twinkleconfigSave(e) {
	Morebits.status.init( document.getElementById("twinkle-config-content") );

	Morebits.wiki.actionCompleted.notice = wgULS("保存", "儲存");

	var userjs = mw.config.get("wgFormattedNamespaces")[mw.config.get("wgNamespaceIds").user] + ":" + mw.config.get("wgUserName") + "/twinkleoptions.js";
	var wikipedia_page = new Morebits.wiki.page(userjs, wgULS("保存参数设置到 ", "儲存偏好設定到 ") + userjs);
	wikipedia_page.setCallbackParameters(e.target);
	wikipedia_page.load(Twinkle.config.writePrefs);

	return false;
};

// The JSON stringify method in the following code was excerpted from
// http://www.JSON.org/json2.js
// version of 2011-02-23

// Douglas Crockford, the code's author, has released it into the Public Domain.
// See http://www.JSON.org/js.html

var JSON;
if (!JSON) {
	JSON = {};
}

(function() {
	var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		gap,
		indent = '  ',  // hardcoded indent
		meta = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

	function quote(string) {
		escapable.lastIndex = 0;
		return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
			var c = meta[a];
			return typeof c === 'string' ? c :	'\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
		}) + '"' : '"' + string + '"';
	}

	function str(key, holder) {
		var i, k, v, length, mind = gap, partial, value = holder[key];

		if (value && typeof value === 'object' && $.isFunction(value.toJSON)) {
			value = value.toJSON(key);
		}

		switch (typeof value) {
		case 'string':
			return quote(value);
		case 'number':
			return isFinite(value) ? String(value) : 'null';
		case 'boolean':
		case 'null':
			return String(value);
		case 'object':
			if (!value) {
				return 'null';
			}
			gap += indent;
			partial = [];
			if ($.isArray(value)) {
				length = value.length;
				for (i = 0; i < length; ++i) {
					partial[i] = str(i, value) || 'null';
				}
				v = partial.length === 0 ? '[]' : gap ?
					'[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
					'[' + partial.join(',') + ']';
				gap = mind;
				return v;
			}
			for (k in value) {
				if (Object.prototype.hasOwnProperty.call(value, k)) {
					v = str(k, value);
					if (v) {
						partial.push(quote(k) + (gap ? ': ' : ':') + v);
					}
				}
			}
			v = partial.length === 0 ? '{}' : gap ?
				'{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
				'{' + partial.join(',') + '}';
			gap = mind;
			return v;
		default:
			throw new Error( "JSON.stringify: unknown data type" );
		}
	}

	if (!$.isFunction(JSON.stringify)) {
		JSON.stringify = function (value, ignoredParam1, ignoredParam2) {
			ignoredParam1 = ignoredParam2;  // boredom
			gap = '';
			return str('', {'': value});
		};
	}
}());

Twinkle.config.writePrefs = function twinkleconfigWritePrefs(pageobj) {
	var form = pageobj.getCallbackParameters();
	var statelem = pageobj.getStatusElement();

	// this is the object which gets serialized into JSON
	var newConfig = {
		twinkle: {},
		friendly: {}
	};

	// keeping track of all preferences that we encounter
	// any others that are set in the user's current config are kept
	// this way, preferences that this script doesn't know about are not lost
	// (it does mean obsolete prefs will never go away, but... ah well...)
	var foundTwinklePrefs = [], foundFriendlyPrefs = [];

	// a comparison function is needed later on
	// it is just enough for our purposes (i.e. comparing strings, numbers, booleans,
	// arrays of strings, and arrays of { value, label })
	// and it is not very robust: e.g. compare([2], ["2"]) === true, and
	// compare({}, {}) === false, but it's good enough for our purposes here
	var compare = function(a, b) {
		if ($.isArray(a)) {
			if (a.length !== b.length) {
				return false;
			}
			var asort = a.sort(), bsort = b.sort();
			for (var i = 0; asort[i]; ++i) {
				// comparison of the two properties of custom lists
				if ((typeof asort[i] === "object") && (asort[i].label !== bsort[i].label ||
					asort[i].value !== bsort[i].value)) {
					return false;
				} else if (asort[i].toString() !== bsort[i].toString()) {
					return false;
				}
			}
			return true;
		} else {
			return a === b;
		}
	};

	$(Twinkle.config.sections).each(function(sectionkey, section) {
		if (section.adminOnly && !Morebits.userIsInGroup("sysop")) {
			return;  // i.e. "continue" in this context
		}

		// reach each of the preferences from the form
		$(section.preferences).each(function(prefkey, pref) {
			var userValue;  // = undefined

			// only read form values for those prefs that have them
			if (!section.hidden && (!pref.adminOnly || Morebits.userIsInGroup("sysop"))) {
				switch (pref.type) {

					case "boolean":  // read from the checkbox
						userValue = form[pref.name].checked;
						break;

					case "string":  // read from the input box or combo box
					case "enum":
						userValue = form[pref.name].value;
						break;

					case "integer":  // read from the input box
						userValue = parseInt(form[pref.name].value, 10);
						if (isNaN(userValue)) {
							Morebits.status.warn(wgULS("保存", "儲存"), wgULS("您为 " + pref.name + " 指定的值（" + pref.value + "）不合法，会继续保存操作，但此值将会跳过。", "您為 " + pref.name + " 指定的值（" + pref.value + "）不合法，會繼續儲存操作，但此值將會跳過。"));
							userValue = null;
						}
						break;

					case "set":  // read from the set of check boxes
						userValue = [];
						if (pref.setDisplayOrder) {
							// read only those keys specified in the display order
							$.each(pref.setDisplayOrder, function(itemkey, item) {
								if (form[pref.name + "_" + item].checked) {
									userValue.push(item);
								}
							});
						} else {
							// read all the keys in the list of values
							$.each(pref.setValues, function(itemkey, itemvalue) {
								if (form[pref.name + "_" + itemkey].checked) {
									userValue.push(itemkey);
								}
							});
						}
						break;

					case "customList":  // read from the jQuery data stored on the button object
						userValue = $(form[pref.name]).data("value");
						break;

					default:
						alert("twinkleconfig: 未知数据类型，属性 " + pref.name);
						break;
				}
			}

			// only save those preferences that are *different* from the default
			if (section.inFriendlyConfig) {
				if (userValue !== undefined && !compare(userValue, Twinkle.defaultConfig.friendly[pref.name])) {
					newConfig.friendly[pref.name] = userValue;
				}
				foundFriendlyPrefs.push(pref.name);
			} else {
				if (userValue !== undefined && !compare(userValue, Twinkle.defaultConfig.twinkle[pref.name])) {
					newConfig.twinkle[pref.name] = userValue;
				}
				foundTwinklePrefs.push(pref.name);
			}
		});
	});

	if (Twinkle.prefs) {
		$.each(Twinkle.prefs.twinkle, function(tkey, tvalue) {
			if (foundTwinklePrefs.indexOf(tkey) === -1) {
				newConfig.twinkle[tkey] = tvalue;
			}
		});
		$.each(Twinkle.prefs.friendly, function(fkey, fvalue) {
			if (foundFriendlyPrefs.indexOf(fkey) === -1) {
				newConfig.friendly[fkey] = fvalue;
			}
		});
	}

	var text = wgULS(
		"// twinkleoptions.js：用户Twinkle参数设置文件\n" +
		"//\n" +
		"// 注：修改您的参数设置最简单的办法是使用\n" +
		"// Twinkle参数设置面板，在[[" + Morebits.pageNameNorm + "]]。\n" +
		"//\n" +
		"// 这个文件是自动生成的，您所做的任何修改（除了\n" +
		"// 以一种合法的JavaScript的方式来修改这些属性值）会\n" +
		"// 在下一次您点击“保存”时被覆盖。\n" +
		"// 修改此文件时，请记得使用合法的JavaScript。\n" +
		"\n" +
		"window.Twinkle.prefs = ",

		"// twinkleoptions.js：使用者Twinkle參數設定檔案\n" +
		"//\n" +
		"// 註：修改您的參數設定最簡單的辦法是使用\n" +
		"// Twinkle參數設定面板，在[[" + Morebits.pageNameNorm + "]]。\n" +
		"//\n" +
		"// 這個檔案是自動產生的，您所做的任何修改（除了\n" +
		"// 以一種合法的JavaScript的方式來修改這些屬性值）會\n" +
		"// 在下一次您點擊「儲存」時被覆蓋。\n" +
		"// 修改此檔案時，請記得使用合法的JavaScript。\n" +
		"\n" +
		"window.Twinkle.prefs = "
		);
	text += JSON.stringify(newConfig, null, 2);
	text +=
		";\n" +
		"\n" +
		wgULS("// twinkleoptions.js到此为止\n", "// twinkleoptions.js到此為止\n");

	pageobj.setPageText(text);
	pageobj.setEditSummary(wgULS("保存Twinkle参数设置：来自[[" + Morebits.pageNameNorm + "]]的自动编辑。 ([[WP:TW|TW]])", "儲存Twinkle偏好設定：來自[[" + Morebits.pageNameNorm + "]]的自動編輯。 ([[WP:TW|TW]])"));
	pageobj.setCreateOption("recreate");
	pageobj.save(Twinkle.config.saveSuccess);
};

Twinkle.config.saveSuccess = function twinkleconfigSaveSuccess(pageobj) {
	pageobj.getStatusElement().info("成功");

	var noticebox = document.createElement("div");
	noticebox.className = "successbox";
	noticebox.style.fontSize = "100%";
	noticebox.style.marginTop = "2em";
	noticebox.innerHTML = wgULS("<p><b>您的Twinkle参数设置已被保存。</b></p><p>要看到这些更改，您可能需要<a href=\"" + mw.util.getUrl("WP:BYPASS") + "\" title=\"WP:BYPASS\"><b>绕过浏览器缓存</b></a>。</p>", "<p><b>您的Twinkle偏好設定已被儲存。</b></p><p>要看到這些更改，您可能需要<a href=\"" + mw.util.getUrl("WP:BYPASS") + "\" title=\"WP:BYPASS\"><b>繞過瀏覽器快取</b></a>。</p>");
	Morebits.status.root.appendChild(noticebox);
	var noticeclear = document.createElement("br");
	noticeclear.style.clear = "both";
	Morebits.status.root.appendChild(noticeclear);
};
})(jQuery);


//</nowiki>
