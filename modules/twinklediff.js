// <nowiki>


(function($) {


/*
 ****************************************
 *** twinklediff.js: Diff module
 ****************************************
 * Mode of invocation:     Tab on non-diff pages ("Last"); tabs on diff pages ("Since", "Since mine", "Current")
 * Active on:              Existing non-special pages
 */

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.diff = function twinklediff() {
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageContentModel') === 'flow-board' || !mw.config.get('wgArticleId')) {
		return;
	}
	Twinkle.addPortletLink(mw.util.getUrl(mw.config.get('wgPageName'), { diff: 'cur', oldid: 'prev' }), conv({ hans: '最后', hant: '最後' }), 'tw-lastdiff', conv({ hans: '显示最后修改', hant: '顯示最後修改' }));

	// Show additional tabs only on diff pages
	if (mw.config.get('wgDiffNewId')) {
		Twinkle.addPortletLink(function() {
			Twinkle.diff.evaluate(false);
		}, '自上', 'tw-since', conv({ hans: '显示与上一修订版本间的差异', hant: '顯示與上一修訂版本間的差異' }));
		Twinkle.addPortletLink(function() {
			Twinkle.diff.evaluate(true);
		}, '自我', 'tw-sincemine', conv({ hans: '显示与我做出的修订版本的差异', hant: '顯示與我做出的修訂版本的差異' }));

		Twinkle.addPortletLink(mw.util.getUrl(mw.config.get('wgPageName'), { diff: 'cur', oldid: mw.config.get('wgDiffNewId') }), conv({ hans: '当前', hant: '目前' }), 'tw-curdiff', conv({ hans: '显示与当前版本间的差异', hant: '顯示與目前版本間的差異' }));
	}
};

Twinkle.diff.evaluate = function twinklediffEvaluate(me) {

	var user;
	if (me) {
		user = mw.config.get('wgUserName');
	} else {
		var node = document.getElementById('mw-diff-ntitle2');
		if (!node) {
			// nothing to do?
			return;
		}
		user = $(node).find('a').first().text();
	}
	var query = {
		prop: 'revisions',
		action: 'query',
		titles: mw.config.get('wgPageName'),
		rvlimit: 1,
		rvprop: [ 'ids', 'user' ],
		rvstartid: mw.config.get('wgCurRevisionId') - 1, // i.e. not the current one
		rvuser: user
	};
	Morebits.status.init(document.getElementById('mw-content-text'));
	var wikipedia_api = new Morebits.wiki.api(conv({ hans: '抓取最初贡献者信息', hant: '抓取最初貢獻者資訊' }), query, Twinkle.diff.callbacks.main);
	wikipedia_api.params = { user: user };
	wikipedia_api.post();
};

Twinkle.diff.callbacks = {
	main: function(self) {
		var xmlDoc = self.responseXML;
		var revid = $(xmlDoc).find('rev').attr('revid');

		if (!revid) {
			self.statelem.error(conv({ hans: '未找到合适的早期版本，或 ', hant: '未找到合適的早期版本，或 ' }) + self.params.user + conv({ hans: ' 是唯一贡献者。取消。', hant: ' 是唯一貢獻者。取消。' }));
			return;
		}
		window.location = mw.util.getUrl(mw.config.get('wgPageName'), {
			diff: mw.config.get('wgCurRevisionId'),
			oldid: revid
		});
	}
};

Twinkle.addInitCallback(Twinkle.diff, 'diff');
})(jQuery);


// </nowiki>
