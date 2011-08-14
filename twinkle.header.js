/**
 * +-------------------------------------------------------------------------+
 * |                       === 警告：全局小工具文件 ===                      |
 * |                      对此文件的修改会影响许多用户。                     |
 * |                           修改前请联系维护者。                          |
 * +-------------------------------------------------------------------------+
 *
 * 从Github导入[https://github.com/jimmyxu/twinkle]
 * 要从Github更新此脚本，你必须设立一个本地仓库，再
 * 跟随[https://github.com/jimmyxu/twinkle/blob/master/README.md]的指引。
 *
 * ----------
 *
 * 这是Twinkle，新手、管理员及他们之间的用户的
 * 好搭档。请参见[[WP:TW]]以获取更多信息。
 *
 * 维护者：~~~
 */

//<nowiki>
//
if (navigator.userAgent.indexOf("MSIE") == -1) {
//

var Twinkle = {};
window.Twinkle = Twinkle;  // allow global access

// for use by custom modules (normally empty)
Twinkle.initCallbacks = [];
Twinkle.addInitCallback = function twinkleAddInitCallback(func) {
	Twinkle.initCallbacks.push(func);
};

Twinkle.defaultConfig = {};
/**
 * Twinkle.defaultConfig.twinkle and Twinkle.defaultConfig.friendly
 *
 * This holds the default set of preferences used by Twinkle. (The |friendly| object holds preferences stored in the FriendlyConfig object.)
 * It is important that all new preferences added here, especially admin-only ones, are also added to
 * |Twinkle.config.sections| in twinkleconfig.js, so they are configurable via the Twinkle preferences panel.
 * For help on the actual preferences, see the comments in twinkleconfig.js.
 */
Twinkle.defaultConfig.twinkle = {
	 // General
	summaryAd: " ([[WP:TW|TW]])",
	deletionSummaryAd: " ([[WP:TW|TW]])",
	protectionSummaryAd: " ([[WP:TW|TW]])",
	userTalkPageMode: "window",
	dialogLargeFont: false,
	 // Fluff (revert and rollback)
	openTalkPage: [  ],
	openTalkPageOnAutoRevert: false,
	markRevertedPagesAsMinor: [ "vand" ],
	watchRevertedPages: [ ],
	offerReasonOnNormalRevert: true,
	confirmOnFluff: false,
	showRollbackLinks: [ "diff", "others" ],
	 // DI (twinkleimage)
	notifyUserOnDeli: true,
	deliWatchPage: "default",
	deliWatchUser: "default",
	 // PROD
	watchProdPages: false,
	prodReasonDefault: "",
	logProdPages: false,
	prodLogPageName: "PROD log",
	 // CSD
	watchSpeedyPages: [ ],
	markSpeedyPagesAsPatrolled: true,
	// these next two should probably be identical by default
	notifyUserOnSpeedyDeletionNomination: [ "db", "g1", "g2", "g3", "g5", "g11", "g12", "g13", "g16", "a1", "a2", "f6", "r2", "r3", "r4" ],
	welcomeUserOnSpeedyDeletionNotification: [ "db", "g1", "g2", "g3", "g5", "g11", "g12", "g13", "g16", "a1", "a2", "f6", "r2", "r3", "r4" ],
	promptForSpeedyDeletionSummary: [ "db"/*, "g1", "g2", "g3", "g5", "g11", "g12", "g13", "g16", "a1", "a2", "f6", "r2", "r3", "r4"*/ ],
	openUserTalkPageOnSpeedyDelete: [ /*"db", "g1", "g2", "g3", "g5", "g11", "g12", "g13", "g16", "a1", "a2", "f6", "r2", "r3", "r4"*/ ],
	deleteTalkPageOnDelete: false,
	deleteSysopDefaultToTag: false,
	speedyWindowHeight: 500,
	speedyWindowWidth: 800,
	logSpeedyNominations: false,
	speedyLogPageName: "CSD日志",
	noLogOnSpeedyNomination: [ "o1" ],
	 // Unlink
	unlinkNamespaces: [ "0", "100" ],
	 // Warn
	defaultWarningGroup: "1",
	showSharedIPNotice: true,
	watchWarnings: false,
	blankTalkpageOnIndefBlock: false,
	 // XfD
	xfdWatchDiscussion: "default",
	xfdWatchPage: "default",
	xfdWatchUser: "default",
	 // Copyvio
	copyvioWatchPage: "default",
	copyvioWatchUser: "default",
	 // Hidden preferences
	revertMaxRevisions: 50,
	batchdeleteChunks: 50,
	batchDeleteMinCutOff: 5,
	batchMax: 5000,
	batchProtectChunks: 50,
	batchProtectMinCutOff: 5,
	batchundeleteChunks: 50,
	batchUndeleteMinCutOff: 5,
	deliChunks: 500,
	deliMax: 5000,
	proddeleteChunks: 50
};

// now some skin dependent config.
if (mw.config.get("skin") === 'vector') {
	Twinkle.defaultConfig.twinkle.portletArea = 'right-navigation';
	Twinkle.defaultConfig.twinkle.portletId   = 'p-twinkle';
	Twinkle.defaultConfig.twinkle.portletName = 'TW';
	Twinkle.defaultConfig.twinkle.portletType = 'menu';
	Twinkle.defaultConfig.twinkle.portletNext = 'p-search';
} else {
	Twinkle.defaultConfig.twinkle.portletArea =  null;
	Twinkle.defaultConfig.twinkle.portletId   = 'p-cactions';
	Twinkle.defaultConfig.twinkle.portletName = null;
	Twinkle.defaultConfig.twinkle.portletType = null;
	Twinkle.defaultConfig.twinkle.portletNext = null;
}

Twinkle.defaultConfig.friendly = {
	 // Tag
	groupByDefault: true,
	watchTaggedPages: false,
	markTaggedPagesAsMinor: false,
	markTaggedPagesAsPatrolled: true,
	tagArticleSortOrder: "cat",
	customTagList: [],
	 // Welcome
	topWelcomes: true,
	watchWelcomes: false,
	welcomeHeading: "欢迎",
	insertHeadings: true,
	insertUsername: true,
	insertSignature: true,  // sign welcome templates, where appropriate
	markWelcomesAsMinor: true,
	quickWelcomeMode: "norm",
	quickWelcomeTemplate: "welcome",
	maskTemplateInSummary: true,
	customWelcomeList: [],
	 // Talkback
	markTalkbackAsMinor: true,
	insertTalkbackSignature: true,  // always sign talkback templates
	talkbackHeading: "回复通告",
	adminNoticeHeading: "提醒",
	 // Shared
	markSharedIPAsMinor: true
};

Twinkle.getPref = function twinkleGetPref(name) {
	var result;
	if (typeof(Twinkle.prefs) === "object" && typeof(Twinkle.prefs.twinkle) === "object") {
		// look in Twinkle.prefs (twinkleoptions.js)
		result = Twinkle.prefs.twinkle[name];
	} else if (typeof(window.TwinkleConfig) === "object") {
		// look in TwinkleConfig
		result = window.TwinkleConfig[name];
	}

	if (typeof(result) === "undefined") {
		return Twinkle.defaultConfig.twinkle[name];
	}
	return result;
};

Twinkle.getFriendlyPref = function twinkleGetFriendlyPref(name) {
	var result;
	if (typeof(Twinkle.prefs) === "object" && typeof(Twinkle.prefs.friendly) === "object") {
		// look in Twinkle.prefs (twinkleoptions.js)
		result = Twinkle.prefs.friendly[name];
	} else if (typeof(window.FriendlyConfig) === "object") {
		// look in FriendlyConfig
		result = window.FriendlyConfig[name];
	}

	if (typeof(result) === "undefined") {
		return Twinkle.defaultConfig.friendly[name];
	}
	return result;
};



/**
 * **************** twAddPortlet() ****************
 *
 * Adds a portlet menu to one of the navigation areas on the page.
 * This is necessarily quite a hack since skins, navigation areas, and
 * portlet menu types all work slightly different.
 *
 * Available navigation areas depend on the skin used.
 * Monobook:
 *  "column-one", outer div class "portlet", inner div class "pBody". Existing portlets: "p-cactions", "p-personal", "p-logo", "p-navigation", "p-search", "p-interaction", "p-tb", "p-coll-print_export"
 *  Special layout of p-cactions and p-personal through specialized styles.
 * Vector:
 *  "mw-panel", outer div class "portal", inner div class "body". Existing portlets/elements: "p-logo", "p-navigation", "p-interaction", "p-tb", "p-coll-print_export"
 *  "left-navigation", outer div class "vectorTabs" or "vectorMenu", inner div class "" or "menu". Existing portlets: "p-namespaces", "p-variants" (menu)
 *  "right-navigation", outer div class "vectorTabs" or "vectorMenu", inner div class "" or "menu". Existing portlets: "p-views", "p-cactions" (menu), "p-search"
 *  Special layout of p-personal portlet (part of "head") through specialized styles.
 * Modern:
 *  "mw_contentwrapper" (top nav), outer div class "portlet", inner div class "pBody". Existing portlets or elements: "p-cactions", "mw_content"
 *  "mw_portlets" (sidebar), outer div class "portlet", inner div class "pBody". Existing portlets: "p-navigation", "p-search", "p-interaction", "p-tb", "p-coll-print_export"
 *
 * @param String navigation -- id of the target navigation area (skin dependant, on vector either of "left-navigation", "right-navigation", or "mw-panel")
 * @param String id -- id of the portlet menu to create, preferably start with "p-".
 * @param String text -- name of the portlet menu to create. Visibility depends on the class used.
 * @param String type -- type of portlet. Currently only used for the vector non-sidebar portlets, pass "menu" to make this portlet a drop down menu.
 * @param Node nextnodeid -- the id of the node before which the new item should be added, should be another item in the same list, or undefined to place it at the end.
 *
 * @return Node -- the DOM node of the new item (a DIV element) or null
 */
function twAddPortlet( navigation, id, text, type, nextnodeid )
{
	//sanity checks, and get required DOM nodes
	var root = document.getElementById( navigation );
	if ( !root ) {
		return null;
	}

	var item = document.getElementById( id );
	if (item) {
		if (item.parentNode && item.parentNode === root) {
			return item;
		}
		return null;
	}

	var nextnode;
	if (nextnodeid) {
		nextnode = document.getElementById(nextnodeid);
	}

	//verify/normalize input
	type = (skin === "vector" && type === "menu" && (navigation === "left-navigation" || navigation === "right-navigation")) ? "menu" : "";
	var outerDivClass;
	var innerDivClass;
	switch (skin)
	{
		case "vector":
			if (navigation !== "portal" && navigation !== "left-navigation" && navigation !== "right-navigation") {
				navigation = "mw-panel";
			}
			outerDivClass = (navigation === "mw-panel") ? "portal" : (type === "menu" ? "vectorMenu extraMenu" : "vectorTabs extraMenu");
			innerDivClass = (navigation === "mw-panel") ? 'body' : (type === 'menu' ? 'menu':'');
			break;
		case "modern":
			if (navigation !== "mw_portlets" && navigation !== "mw_contentwrapper") {
				navigation = "mw_portlets";
			}
			outerDivClass = "portlet";
			innerDivClass = "pBody";
			break;
		default:
			navigation = "column-one";
			outerDivClass = "portlet";
			innerDivClass = "pBody";
			break;
	}

	//Build the DOM elements.
	var outerDiv = document.createElement( 'div' );
	outerDiv.className = outerDivClass+" emptyPortlet";
	outerDiv.id = id;
	if ( nextnode && nextnode.parentNode === root ) {
		root.insertBefore( outerDiv, nextnode );
	} else {
		root.appendChild( outerDiv );
	}

	var h5 = document.createElement( 'h5' );
	if (type === 'menu') {
		var span = document.createElement( 'span' );
		span.appendChild( document.createTextNode( text ) );
		h5.appendChild( span );

		var a = document.createElement( 'a' );
		a.href = "#";
		span = document.createElement( 'span' );
		span.appendChild( document.createTextNode( text ) );
		a.appendChild( span );
		h5.appendChild( a );
	} else {
		h5.appendChild( document.createTextNode( text ) );
	}
	outerDiv.appendChild( h5 );

	var innerDiv = document.createElement( 'div' ); //not strictly necessary with type vectorTabs, or other skins.
	innerDiv.className = innerDivClass;
	outerDiv.appendChild(innerDiv);

	var ul = document.createElement( 'ul' );
	innerDiv.appendChild( ul );

	return outerDiv;
}


/**
 * **************** twAddPortletLink() ****************
 * Builds a portlet menu if it doesn't exist yet, and add the portlet link.
 */
function twAddPortletLink( href, text, id, tooltip, accesskey, nextnode )
{
	if (Twinkle.getPref("portletArea") !== null) {
		twAddPortlet(Twinkle.getPref("portletArea"), Twinkle.getPref("portletId"), Twinkle.getPref("portletName"), Twinkle.getPref("portletType"), Twinkle.getPref("portletNext"));
	}
	return mw.util.addPortletLink( Twinkle.getPref("portletId"), href, text, id, tooltip, accesskey, nextnode );
}

// check if account is experienced enough for more advanced functions
var twinkleUserAuthorized = userIsInGroup( 'autoconfirmed' ) || userIsInGroup( 'confirmed' );
