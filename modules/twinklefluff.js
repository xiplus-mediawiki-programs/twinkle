// <nowiki>


(function($) {


/*
 ****************************************
 *** twinklefluff.js: Revert/rollback module
 ****************************************
 * Mode of invocation:     Links on contributions, recent changes, history, and diff pages
 * Active on:              Diff pages, history pages, Special:RecentChanges(Linked),
                           and Special:Contributions
 */

/**
 Twinklefluff revert and antivandalism utility
 */

Twinkle.fluff = function twinklefluff() {
	if (mw.config.get('wgIsProbablyEditable')) {
		// Only proceed if the user can actually edit the page
		// in question (ignored for contributions, see #632).
		// wgIsProbablyEditable should take care of
		// namespace/contentModel restrictions as well as
		// explicit protections; it won't take care of
		// cascading or TitleBlacklist restrictions
		if (mw.config.get('wgDiffNewId') || mw.config.get('wgDiffOldId')) { // wgDiffOldId included for clarity in if else loop [[phab:T214985]]
			mw.hook('wikipage.diff').add(function () { // Reload alongside the revision slider
				Twinkle.fluff.addLinks.diff();
			});
		} else if (mw.config.get('wgAction') === 'view' && mw.config.get('wgRevisionId') !== 0 && mw.config.get('wgCurRevisionId') !== mw.config.get('wgRevisionId')) {
			Twinkle.fluff.addLinks.oldid();
		} else if (mw.config.get('wgAction') === 'history') {
			Twinkle.fluff.addLinks.history();
		}
	} else if (mw.config.get('wgNamespaceNumber') === -1) {
		Twinkle.fluff.skipTalk = !Twinkle.getPref('openTalkPageOnAutoRevert');
		Twinkle.fluff.rollbackInPlace = Twinkle.getPref('rollbackInPlace');

		if (mw.config.get('wgCanonicalSpecialPageName') === 'Contributions') {
			Twinkle.fluff.addLinks.contributions();
		} else if (mw.config.get('wgCanonicalSpecialPageName') === 'Recentchanges' || mw.config.get('wgCanonicalSpecialPageName') === 'Recentchangeslinked') {
			// Reload with recent changes updates
			// structuredChangeFilters.ui.initialized is just on load
			mw.hook('wikipage.content').add(function(item) {
				if (item.is('div')) {
					Twinkle.fluff.addLinks.recentchanges();
				}
			});
		}
	}
};

// A list of usernames, usually only bots, that vandalism revert is jumped
// over; that is, if vandalism revert was chosen on such username, then its
// target is on the revision before.  This is for handling quick bots that
// makes edits seconds after the original edit is made.  This only affects
// vandalism rollback; for good faith rollback, it will stop, indicating a bot
// has no faith, and for normal rollback, it will rollback that edit.
Twinkle.fluff.trustedBots = [
	'Antigng-bot',
	'Jimmy-bot',
	'Jimmy-abot',
	'Liangent-bot',
	'Liangent-adminbot',
	'Cewbot',
	'WhitePhosphorus-bot'
];
Twinkle.fluff.skipTalk = null;
Twinkle.fluff.rollbackInPlace = null;
// String to insert when a username is hidden
Twinkle.fluff.hiddenName = wgULS('已隐藏的用户', '已隱藏的使用者');

Twinkle.fluff.linkBuilder = {
	spanTag: function(color, content) {
		var span = document.createElement('span');
		span.style.color = color;
		span.appendChild(document.createTextNode(content));
		return span;
	},

	buildLink: function(color, text) {
		var link = document.createElement('a');
		link.appendChild(Twinkle.fluff.linkBuilder.spanTag('Black', '['));
		link.appendChild(Twinkle.fluff.linkBuilder.spanTag(color, text));
		link.appendChild(Twinkle.fluff.linkBuilder.spanTag('Black', ']'));
		link.href = '#';
		return link;
	},

	/**
	 * @param {string} vandal - Username of the editor being reverted (required)
	 * Provide a falsey value if the username is hidden
	 * @param {boolean} inline - True to create two links in a span, false
	 * to create three links in a div (optional)
	 * @param {number|string} [rev=wgCurRevisionId] - Revision ID being reverted (optional)
	 * @param {string} [page=wgPageName] - Page being reverted (optional)
	 */
	rollbackLinks: function(vandal, inline, rev, page) {
		var elem = inline ? 'span' : 'div';
		var revNode = document.createElement(elem);

		rev = parseInt(rev, 10);
		if (rev) {
			revNode.setAttribute('id', 'tw-revert' + rev);
		} else {
			revNode.setAttribute('id', 'tw-revert');
		}

		var normNode = document.createElement('strong');
		var vandNode = document.createElement('strong');

		var normLink = Twinkle.fluff.linkBuilder.buildLink('SteelBlue', '回退');
		var vandLink = Twinkle.fluff.linkBuilder.buildLink('Red', wgULS('破坏', '破壞'));

		$(normLink).click(function() {
			Twinkle.fluff.revert('norm', vandal, rev, page);
			Twinkle.fluff.disableLinks(revNode);
		});
		$(vandLink).click(function() {
			Twinkle.fluff.revert('vand', vandal, rev, page);
			Twinkle.fluff.disableLinks(revNode);
		});

		vandNode.appendChild(vandLink);
		normNode.appendChild(normLink);

		var separator = inline ? ' ' : ' || ';

		if (!inline) {
			var agfNode = document.createElement('strong');
			var agfLink = Twinkle.fluff.linkBuilder.buildLink('DarkOliveGreen', '回退（AGF）');
			$(agfLink).click(function() {
				Twinkle.fluff.revert('agf', vandal, rev, page);
				// Twinkle.fluff.disableLinks(revNode); // rollbackInPlace not relevant for any inline situations
			});
			agfNode.appendChild(agfLink);
			revNode.appendChild(agfNode);
		}
		revNode.appendChild(document.createTextNode(separator));
		revNode.appendChild(normNode);
		revNode.appendChild(document.createTextNode(separator));
		revNode.appendChild(vandNode);

		return revNode;

	},

	// Build [restore this revision] links
	restoreThisRevisionLink: function(revisionRef, inline) {
		// If not a specific revision number, should be wgDiffNewId/wgDiffOldId/wgRevisionId
		revisionRef = typeof revisionRef === 'number' ? revisionRef : mw.config.get(revisionRef);

		var elem = inline ? 'span' : 'div';
		var revertToRevisionNode = document.createElement(elem);

		revertToRevisionNode.setAttribute('id', 'tw-revert-to-' + revisionRef);
		revertToRevisionNode.style.fontWeight = 'bold';

		var revertToRevisionLink = Twinkle.fluff.linkBuilder.buildLink('SaddleBrown', wgULS('恢复此版本', '恢復此版本'));
		$(revertToRevisionLink).click(function() {
			Twinkle.fluff.revertToRevision(revisionRef);
		});

		if (inline) {
			revertToRevisionNode.appendChild(document.createTextNode(' '));
		}
		revertToRevisionNode.appendChild(revertToRevisionLink);
		return revertToRevisionNode;
	}
};

Twinkle.fluff.addLinks = {
	contributions: function() {
		// $('sp-contributions-footer-anon-range') relies on the fmbox
		// id in [[MediaWiki:Sp-contributions-footer-anon-range]] and
		// is used to show rollback/vandalism links for IP ranges
		if (mw.config.exists('wgRelevantUserName') || !!$('#sp-contributions-footer-anon-range')[0]) {
			// Get the username these contributions are for
			var username = mw.config.get('wgRelevantUserName');
			if (Twinkle.getPref('showRollbackLinks').indexOf('contribs') !== -1 ||
					(mw.config.get('wgUserName') !== username && Twinkle.getPref('showRollbackLinks').indexOf('others') !== -1) ||
					(mw.config.get('wgUserName') === username && Twinkle.getPref('showRollbackLinks').indexOf('mine') !== -1)) {
				var list = $('#mw-content-text').find('ul li:has(span.mw-uctop):has(.mw-changeslist-diff)');

				list.each(function(key, current) {
					// revid is also available in the href of both
					// .mw-changeslist-date or .mw-changeslist-diff
					var page = $(current).find('.mw-contributions-title').text();

					// It's unlikely, but we can't easily check for revdel'd usernames
					// since only a strong element is provided, with no easy selector [[phab:T255903]]
					current.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(username, true, current.dataset.mwRevid, page));
				});
			}
		}
	},

	history: function() {
		if (Twinkle.getPref('showRollbackLinks').indexOf('history') !== -1) {
			// All revs
			var histList = $('#pagehistory li').toArray();

			// On first page of results, so add revert/rollback
			// links to the top revision
			if (!$('.mw-firstlink').length) {
				var first = histList.shift();
				var vandal = $(first).find('.mw-userlink:not(.history-deleted)').text();

				first.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(vandal, true));
			}

			// oldid
			histList.forEach(function(rev) {
				// From restoreThisRevision, non-transferable
				// If the text has been revdel'd, it gets wrapped in a span with .history-deleted,
				// and href will be undefined (and thus oldid is NaN)
				var href = rev.querySelector('.mw-changeslist-date').href;
				var oldid = parseInt(mw.util.getParamValue('oldid', href), 10);
				if (!isNaN(oldid)) {
					rev.appendChild(Twinkle.fluff.linkBuilder.restoreThisRevisionLink(oldid, true));
				}
			});


		}
	},

	recentchanges: function() {
		if (
			(mw.config.get('wgCanonicalSpecialPageName') === 'Recentchanges' && Twinkle.getPref('showRollbackLinks').indexOf('recentchanges') !== -1)
			|| (mw.config.get('wgCanonicalSpecialPageName') === 'Recentchangeslinked' && Twinkle.getPref('showRollbackLinks').indexOf('recentchangeslinked') !== -1)
		) {
			// Latest and revertable (not page creations, logs, categorizations, etc.)
			var $list = $('.mw-changeslist .mw-changeslist-last.mw-changeslist-src-mw-edit');
			// Exclude top-level header if "group changes" preference is used
			// and find only individual lines or nested lines
			$list = $list.not('.mw-rcfilters-ui-highlights-enhanced-toplevel').find('.mw-changeslist-line-inner, td.mw-enhanced-rc-nested');

			$list.each(function(key, current) {
				var vandal = $(current).find('.mw-userlink').text();
				var href = $(current).find('.mw-changeslist-diff').attr('href');
				var rev = mw.util.getParamValue('diff', href);
				var page = current.dataset.targetPage;
				current.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(vandal, true, rev, page));
			});
		}
	},

	diff: function() {
		// Autofill user talk links on diffs with vanarticle for easy warning, but don't autowarn
		var warnFromTalk = function(xtitle) {
			var talkLink = $('#mw-diff-' + xtitle + '2 .mw-usertoollinks a').first();
			if (talkLink.length) {
				var extraParams = 'vanarticle=' + mw.util.rawurlencode(Morebits.pageNameNorm) + '&' + 'noautowarn=true';
				// diffIDs for vanarticlerevid
				extraParams += '&vanarticlerevid=';
				extraParams += xtitle === 'otitle' ? mw.config.get('wgDiffOldId') : mw.config.get('wgDiffNewId');

				var href = talkLink.attr('href');
				if (href.indexOf('?') === -1) {
					talkLink.attr('href', href + '?' + extraParams);
				} else {
					talkLink.attr('href', href + '&' + extraParams);
				}
			}
		};

		// Older revision
		warnFromTalk('otitle'); // Add quick-warn link to user talk link
		// Don't load if there's a single revision or weird diff (cur on latest)
		if (mw.config.get('wgDiffOldId') && (mw.config.get('wgDiffOldId') !== mw.config.get('wgDiffNewId'))) {
			// Add a [restore this revision] link to the older revision
			var oldTitle = document.getElementById('mw-diff-otitle1').parentNode;
			var revertToRevision = Twinkle.fluff.linkBuilder.restoreThisRevisionLink('wgDiffOldId');
			oldTitle.insertBefore(revertToRevision, oldTitle.firstChild);
			if (Twinkle.getPref('customRevertSummary').length > 0) {
				revertToRevision.appendChild(document.createTextNode(' || '));
				var revertsummary = new Morebits.quickForm.element({ type: 'select', name: 'revertsummary' });
				revertsummary.append({
					type: 'option',
					label: wgULS('选择回退理由', '選擇回退理由'),
					value: ''
				});
				$(Twinkle.getPref('customRevertSummary')).each(function(_, e) {
					revertsummary.append({
						type: 'option',
						label: e.label,
						value: e.value
					});
				});
				revertToRevision.appendChild(revertsummary.render().childNodes[0]);
			}
		}

		// Newer revision
		warnFromTalk('ntitle'); // Add quick-warn link to user talk link
		// Add either restore or rollback links to the newer revision
		// Don't show if there's a single revision or weird diff (prev on first)
		if (document.getElementById('differences-nextlink')) {
			// Not latest revision, add [restore this revision] link to newer revision
			var newTitle = document.getElementById('mw-diff-ntitle1').parentNode;
			newTitle.insertBefore(Twinkle.fluff.linkBuilder.restoreThisRevisionLink('wgDiffNewId'), newTitle.firstChild);
		} else if (Twinkle.getPref('showRollbackLinks').indexOf('diff') !== -1 && mw.config.get('wgDiffOldId') && (mw.config.get('wgDiffOldId') !== mw.config.get('wgDiffNewId') || document.getElementById('differences-prevlink'))) {
			// Normally .mw-userlink is a link, but if the
			// username is hidden, it will be a span with
			// .history-deleted as well. When a sysop views the
			// hidden content, the span contains the username in a
			// link element, which will *just* have
			// .mw-userlink. The below thus finds the first
			// instance of the class, which if hidden is the span
			// and thus text returns undefined. Technically, this
			// is a place where sysops *could* have more
			// information available to them (as above, via
			// &unhide=1), since the username will be available by
			// checking a.mw-userlink instead, but revert() will
			// need reworking around userHidden
			var vandal = $('#mw-diff-ntitle2').find('.mw-userlink')[0].text;
			var ntitle = document.getElementById('mw-diff-ntitle1').parentNode;
			ntitle.insertBefore(Twinkle.fluff.linkBuilder.rollbackLinks(vandal), ntitle.firstChild);
		}
	},

	oldid: function() { // Add a [restore this revision] link on old revisions
		var title = document.getElementById('mw-revision-info').parentNode;
		title.insertBefore(Twinkle.fluff.linkBuilder.restoreThisRevisionLink('wgRevisionId'), title.firstChild);
	}
};

Twinkle.fluff.disableLinks = function disablelinks(parentNode) {
	// Array.from not available in IE11 :(
	$(parentNode).children().each(function(_ix, node) {
		node.innerHTML = node.textContent; // Feels like cheating
		$(node).css('font-weight', 'normal').css('color', 'darkgray');
	});
};

Twinkle.fluff.revert = function revertPage(type, vandal, rev, page) {
	if (mw.util.isIPv6Address(vandal)) {
		vandal = Morebits.sanitizeIPv6(vandal);
	}

	var pagename = page || mw.config.get('wgPageName');
	var revid = rev || mw.config.get('wgCurRevisionId');
	var summary = '';
	if (document.getElementsByName('revertsummary')[0] !== undefined) {
		summary = document.getElementsByName('revertsummary')[0].value;
	}

	var statusElement = document.getElementById('mw-content-text');
	if (Twinkle.fluff.useNotify) {
		statusElement = document.createElement('small');
		statusElement.id = 'twinklefluff_' + Twinkle.fluff.notifyId++;
		mw.notify(statusElement, {
			autoHide: false
		});
	}
	if (Twinkle.fluff.rollbackInPlace) {
		var notifyStatus = document.createElement('span');
		mw.notify(notifyStatus, {
			autoHide: false,
			title: '回退' + page,
			tag: 'twinklefluff_' + rev // Shouldn't be necessary given disableLink
		});
		Morebits.status.init(notifyStatus);
	} else {
		Morebits.status.init(document.getElementById('mw-content-text'));
		$('#catlinks').remove();
	}

	var params = {
		type: type,
		user: vandal || Twinkle.fluff.hiddenName,
		userHidden: !vandal, // Keep track of whether the username was hidden
		pagename: pagename,
		revid: revid,
		summary: summary
	};

	var query = {
		'action': 'query',
		'prop': ['info', 'revisions'],
		'titles': pagename,
		'intestactions': 'edit',
		'rvlimit': Twinkle.getPref('revertMaxRevisions'),
		'rvprop': [ 'ids', 'timestamp', 'user' ],
		'curtimestamp': '',
		'meta': 'tokens',
		'type': 'csrf'
	};
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取较早修订版本信息', '抓取較早修訂版本資訊'), query, Twinkle.fluff.callbacks.main);
	wikipedia_api.statelem.status(wgULS('正在准备回退……', '正在準備回退……'));
	wikipedia_api.params = params;
	wikipedia_api.post();
};

Twinkle.fluff.revertToRevision = function revertToRevision(oldrev) {

	var summary = '';
	if (document.getElementsByName('revertsummary')[0] !== undefined) {
		summary = document.getElementsByName('revertsummary')[0].value;
	}

	var statusElement = document.getElementById('mw-content-text');
	if (Twinkle.fluff.useNotify) {
		statusElement = document.createElement('small');
		statusElement.id = 'twinklefluff_' + Twinkle.fluff.notifyId++;
		mw.notify(statusElement, {
			autoHide: false
		});
	}
	Morebits.status.init(statusElement);

	var query = {
		'action': 'query',
		'prop': ['info', 'revisions'],
		'titles': mw.config.get('wgPageName'),
		'rvlimit': 1,
		'rvstartid': oldrev,
		'rvprop': [ 'ids', 'timestamp', 'user', 'comment' ],
		'format': 'xml',
		'curtimestamp': '',
		'meta': 'tokens',
		'type': 'csrf'
	};
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取较早修订版本信息', '抓取較早修訂版本資訊'), query, Twinkle.fluff.callbacks.toRevision);
	wikipedia_api.statelem.status(wgULS('正在准备回退……', '正在準備回退……'));
	wikipedia_api.params = { rev: oldrev, summary: summary };
	wikipedia_api.post();
};

Twinkle.fluff.userIpLink = function(user) {
	return (mw.util.isIPAddress(user) ? '[[Special:Contributions/' : '[[:User:') + user + '|' + user + ']]';
};

Twinkle.fluff.callbacks = {
	toRevision: function(apiobj) {
		var xmlDoc = apiobj.responseXML;

		var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
		var touched = $(xmlDoc).find('page').attr('touched');
		var loadtimestamp = $(xmlDoc).find('api').attr('curtimestamp');
		var csrftoken = $(xmlDoc).find('tokens').attr('csrftoken');
		var revertToRevID = parseInt($(xmlDoc).find('rev').attr('revid'), 10);

		var revertToUser = $(xmlDoc).find('rev').attr('user');
		var revertToUserHidden = typeof $(xmlDoc).find('rev').attr('userhidden') === 'string';

		if (revertToRevID !== apiobj.params.rev) {
			apiobj.statelem.error(wgULS('抓取到的修订版本与请求的修订版本不符，取消。', '抓取到的修訂版本與請求的修訂版本不符，取消。'));
			return;
		}

		var optional_summary = prompt(wgULS('请输入回退理由：', '請輸入回退理由：') + '                                ', apiobj.params.summary);  // padded out to widen prompt in Firefox
		if (optional_summary === null) {
			apiobj.statelem.error(wgULS('由用户取消。', '由使用者取消。'));
			return;
		}

		var summary = Twinkle.fluff.formatSummary(wgULS('回退到由$USER做出的修订版本', '回退到由$USER做出的修訂版本') + revertToRevID,
			revertToUserHidden ? null : revertToUser, optional_summary);

		var query = {
			'action': 'edit',
			'title': mw.config.get('wgPageName'),
			'tags': Twinkle.getPref('revisionTags'),
			'summary': summary,
			'token': csrftoken,
			'undo': lastrevid,
			'undoafter': revertToRevID,
			'basetimestamp': touched,
			'starttimestamp': loadtimestamp,
			'watchlist': Twinkle.getPref('watchRevertedPages').indexOf('torev') !== -1 ? 'watch' : undefined,
			'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf('torev') !== -1 ? true : undefined,
			'bot': true
		};

		if (!Twinkle.fluff.useNotify) {
			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
		}
		Morebits.wiki.actionCompleted.notice = wgULS('修订版本完成', '修訂版本完成');

		var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退內容'), query, Twinkle.fluff.callbacks.complete, apiobj.statelem);
		wikipedia_api.params = apiobj.params;
		wikipedia_api.post();

	},
	main: function(apiobj) {
		var xmlDoc = apiobj.responseXML;

		if (typeof $(xmlDoc).find('actions').attr('edit') === 'undefined') {
			apiobj.statelem.error("Unable to edit the page, it's probably protected.");
			return;
		}

		var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
		var touched = $(xmlDoc).find('page').attr('touched');
		var loadtimestamp = $(xmlDoc).find('api').attr('curtimestamp');
		var csrftoken = $(xmlDoc).find('tokens').attr('csrftoken');

		var revs = $(xmlDoc).find('rev');

		var statelem = apiobj.statelem;
		var params = apiobj.params;

		if (revs.length < 1) {
			statelem.error(wgULS('没有其它修订版本，无法回退', '沒有其它修訂版本，無法回退'));
			return;
		}
		var top = revs[0];
		var lastuser = top.getAttribute('user');

		if (lastrevid < params.revid) {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS([ '从服务器获取的最新修订版本ID ', Morebits.htmlNode('strong', lastrevid), ' 小于目前所显示的修订版本ID。这可能意味着当前修订版本已被删除、服务器延迟、或抓取到了坏掉的信息。取消。' ], [ '從伺服器取得的最新修訂版本ID ', Morebits.htmlNode('strong', lastrevid), ' 小於目前所顯示的修訂版本ID。這可能意味著當前修訂版本已被刪除、伺服器延遲、或擷取到了壞掉的資訊。取消。' ]));
			return;
		}
		var index = 1;
		if (params.revid !== lastrevid) {
			Morebits.status.warn('警告', wgULS([ '最新修订版本 ', Morebits.htmlNode('strong', lastrevid), ' 与我们的修订版本 ', Morebits.htmlNode('strong', params.revid), '不等' ], [ '最新修訂版本 ', Morebits.htmlNode('strong', lastrevid), ' 與我們的修訂版本 ', Morebits.htmlNode('strong', params.revid), ' 不等' ]));
			if (lastuser === params.user) {
				switch (params.type) {
					case 'vand':
						Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，因我们假定破坏，继续回退操作。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，因我們假定破壞，繼續回退操作。' ]));
						break;
					case 'agf':
						Morebits.status.warn('警告', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，因我们假定善意，取消回退操作，因为问题可能已被修复。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，因我們假定善意，取消回退操作，因為問題可能已被修復。' ]));
						return;
					default:
						Morebits.status.warn('提示', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，但我们还是不回退了。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', params.user), ' 做出，但我們還是不回退了。' ]));
						return;
				}
			} else if (params.type === 'vand' &&
					// Okay to test on user since it will either fail or sysop will correctly access it
					// Besides, none of the trusted bots are going to be revdel'd
					Twinkle.fluff.trustedBots.indexOf(top.getAttribute('user')) !== -1 && revs.length > 1 &&
					revs[1].getAttribute('pageId') === params.revid) {
				Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', lastuser), '，一个可信的机器人做出，之前的版本被认为是破坏，继续回退操作。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', lastuser), '，一個可信的機器人做出，之前的版本被認為是破壞，繼續回退操作。' ]));
				index = 2;
			} else {
				Morebits.status.error('错误', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', lastuser), ' 做出，所以这个修订版本可能已经被回退了，取消回退操作。'], [ '最新修訂版本由 ', Morebits.htmlNode('strong', lastuser), ' 做出，所以這個修訂版本可能已經被回退了，取消回退操作。']));
				return;
			}

		}

		if (Twinkle.fluff.trustedBots.indexOf(params.user) !== -1) {
			switch (params.type) {
				case 'vand':
					Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '将对 ', Morebits.htmlNode('strong', params.user), ' 执行破坏回退，这是一个可信的机器人，我们假定您要回退前一个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', params.user), ' 執行破壞回退，這是一個可信的機器人，我們假定您要回退前一個修訂版本。' ]));
					index = 2;
					params.user = revs[1].getAttribute('user');
					params.userHidden = revs[1].getAttribute('userhidden') === '';
					break;
				case 'agf':
					Morebits.status.warn('提示', wgULS([ '将对 ', Morebits.htmlNode('strong', params.user), ' 执行善意回退，这是一个可信的机器人，取消回退操作。' ], [ '將對 ', Morebits.htmlNode('strong', params.user), ' 執行善意回退，這是一個可信的機器人，取消回退操作。' ]));
					return;
				case 'norm':
				/* falls through */
				default:
					var cont = confirm(wgULS('选择了常规回退，但最新修改是由一个可信的机器人（' + params.user + '）做出的。您是否想回退前一个修订版本？', '選擇了常規回退，但最新修改是由一個可信的機器人（' + params.user + '）做出的。您是否想回退前一個修訂版本？'));
					if (cont) {
						Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '将对 ', Morebits.htmlNode('strong', params.user), ' 执行常规回退，这是一个可信的机器人，基于确认，我们将回退前一个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', params.user), ' 執行常規回退，這是一個可信的機器人，基於確認，我們將回退前一個修訂版本。' ]));
						index = 2;
						params.user = revs[1].getAttribute('user');
						params.userHidden = revs[1].getAttribute('userhidden') === '';
					} else {
						Morebits.status.warn('提示', wgULS([ '将对 ', Morebits.htmlNode('strong', params.user), ' 执行常规回退，这是一个可信的机器人，基于确认，我们仍将回退这个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', params.user), ' 執行常規回退，這是一個可信的機器人，基於確認，我們仍將回退這個修訂版本。' ]));
					}
					break;
			}
		}
		var found = false;
		var count = 0;

		for (var i = index; i < revs.length; ++i) {
			++count;
			if (revs[i].getAttribute('user') !== params.user) {
				found = i;
				break;
			}
		}

		if (!found) {
			statelem.error(wgULS([ '未找到之前的修订版本，可能 ', Morebits.htmlNode('strong', params.user), ' 是唯一贡献者，或这个用户连续做出了超过 ' + mw.language.convertNumber(Twinkle.getPref('revertMaxRevisions')) + ' 次编辑。' ], [ '未找到之前的修訂版本，可能 ', Morebits.htmlNode('strong', params.user), ' 是唯一貢獻者，或這個用戶連續做出了超過 ' + mw.language.convertNumber(Twinkle.getPref('revertMaxRevisions')) + ' 次編輯。' ]));
			return;
		}

		if (!count) {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS('我们将要回退0个修订版本，这没有意义，所以取消回退操作。可能是因为这个修订版本已经被回退，但修订版本ID仍是一样的。', '我們將要回退0個修訂版本，這沒有意義，所以取消回退操作。可能是因為這個修訂版本已經被回退，但修訂版本ID仍是一樣的。'));
			return;
		}

		var good_revision = revs[found];
		var userHasAlreadyConfirmedAction = false;
		if (params.type !== 'vand' && count > 1) {
			if (!confirm(wgULS(params.user + ' 连续做出了 ' + mw.language.convertNumber(count) + ' 次编辑，是否要回退所有这些？', params.user + ' 連續做出了 ' + mw.language.convertNumber(count) + ' 次編輯，是否要回退所有這些？'))) {
				Morebits.status.info('提示', wgULS('用户取消操作', '使用者取消操作'));
				return;
			}
			userHasAlreadyConfirmedAction = true;
		}

		params.count = count;

		params.goodid = good_revision.getAttribute('revid');
		params.gooduser = good_revision.getAttribute('user');
		params.gooduserHidden = good_revision.getAttribute('userhidden') === '';

		statelem.status([ Morebits.htmlNode('strong', mw.language.convertNumber(count)), wgULS(' 个修订版本之前由 ', ' 個修訂版本之前由 '), Morebits.htmlNode('strong', params.gooduser), wgULS(' 做出的修订版本 ', ' 做出的修訂版本 '), Morebits.htmlNode('strong', params.goodid) ]);

		var summary, extra_summary;
		switch (params.type) {
			case 'agf':
				extra_summary = prompt(wgULS('可选的编辑摘要：', '可選的編輯摘要：') + '                              ', params.summary);  // padded out to widen prompt in Firefox
				if (extra_summary === null) {
					statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
					return;
				}
				userHasAlreadyConfirmedAction = true;

				summary = Twinkle.fluff.formatSummary(wgULS('回退$USER做出的出于[[WP:AGF|善意]]的编辑', '回退$USER做出的出於[[WP:AGF|善意]]的編輯'),
					params.userHidden ? null : params.user, extra_summary);
				break;

			case 'vand':
				summary = Twinkle.fluff.formatSummary('回退$USER做出的' + params.count + wgULS('次编辑，到由', '次編輯，到由') +
					(params.gooduserHidden ? Twinkle.fluff.hiddenName : params.gooduser) + wgULS('做出的最后修订版本 ', '做出的最後修訂版本 '), params.userHidden ? null : params.user);
				break;

			case 'norm':
			/* falls through */
			default:
				if (Twinkle.getPref('offerReasonOnNormalRevert')) {
					extra_summary = prompt(wgULS('可选的编辑摘要：', '可選的編輯摘要：') + '                              ', params.summary);  // padded out to widen prompt in Firefox
					if (extra_summary === null) {
						statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
						return;
					}
					userHasAlreadyConfirmedAction = true;
				}

				summary = Twinkle.fluff.formatSummary(wgULS('回退$USER做出的', '回退$USER做出的') + params.count + wgULS('次编辑', '次編輯'),
					params.userHidden ? null : params.user, extra_summary);
				break;
		}

		if (Twinkle.getPref('confirmOnFluff') && !userHasAlreadyConfirmedAction && !confirm(wgULS('回退页面：您确定吗？', '回退頁面：您確定嗎？'))) {
			statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
			return;
		}

		var query;
		if (!Twinkle.fluff.skipTalk && Twinkle.getPref('openTalkPage').indexOf(params.type) !== -1 &&
				mw.config.get('wgUserName') !== params.user && !params.userHidden) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '打开用户 ', Morebits.htmlNode('strong', params.user), ' 的对话页' ], [ '開啟用戶 ', Morebits.htmlNode('strong', params.user), ' 的討論頁' ]));

			query = {
				'title': 'User talk:' + params.user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': params.pagename.replace(/_/g, ' '),
				'vanarticlerevid': params.revid,
				'vantimestamp': top.getAttribute('timestamp'),
				'vanarticlegoodrevid': params.goodid,
				'type': params.type,
				'count': params.count
			};

			switch (Twinkle.getPref('userTalkPageMode')) {
				case 'tab':
					window.open(mw.util.getUrl('', query), '_blank');
					break;
				case 'blank':
					window.open(mw.util.getUrl('', query), '_blank',
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
					break;
				case 'window':
				/* falls through */
				default:
					window.open(mw.util.getUrl('', query),
						window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow',
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
					break;
			}
		}

		query = {
			'action': 'edit',
			'title': params.pagename,
			'tags': Twinkle.getPref('revisionTags'),
			'summary': summary,
			'token': csrftoken,
			'undo': lastrevid,
			'undoafter': params.goodid,
			'basetimestamp': touched,
			'starttimestamp': loadtimestamp,
			'watchlist': Twinkle.getPref('watchRevertedPages').indexOf(params.type) !== -1 ? 'watch' : undefined,
			'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf(params.type) !== -1 ? true : undefined,
			'bot': true
		};

		if (!Twinkle.fluff.useNotify && !Twinkle.fluff.rollbackInPlace) {
			Morebits.wiki.actionCompleted.redirect = params.pagename;
		}
		Morebits.wiki.actionCompleted.notice = '回退完成';

		var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退內容'), query, Twinkle.fluff.callbacks.complete, statelem);
		wikipedia_api.params = params;
		wikipedia_api.post();

	},
	complete: function (apiobj) {
		// TODO Most of this is copy-pasted from Morebits.wiki.page#fnSaveSuccess. Unify it
		var xml = apiobj.getXML();
		var $edit = $(xml).find('edit');

		if ($(xml).find('captcha').length > 0) {
			apiobj.statelem.error(wgULS('不能回退，因维基服务器要求您输入验证码。', '不能回退，因維基伺服器要求您輸入驗證碼。'));
		} else if ($edit.attr('nochange') === '') {
			apiobj.statelem.error(wgULS('要回退到的版本与当前版本相同，没什么要做的', '要回退到的版本與目前版本相同，沒什麼要做的'));
		} else {
			apiobj.statelem.info('完成');
		}
	}
};

// If builtInString contains the string "$USER", it will be replaced
// by an appropriate user link if a user name is provided
Twinkle.fluff.formatSummary = function(builtInString, userName, customString) {
	var result = builtInString;

	// append user's custom reason
	if (customString) {
		result += ': ' + Morebits.string.toUpperCaseFirstChar(customString);
	}
	result += Twinkle.getPref('summaryAd');

	// find number of UTF-8 bytes the resulting string takes up, and possibly add
	// a contributions or contributions+talk link if it doesn't push the edit summary
	// over the 499-byte limit
	if (/\$USER/.test(builtInString)) {
		if (userName) {
			var resultLen = unescape(encodeURIComponent(result.replace('$USER', ''))).length;
			var contribsLink = '[[Special:Contributions/' + userName + '|' + userName + ']]';
			var contribsLen = unescape(encodeURIComponent(contribsLink)).length;
			if (resultLen + contribsLen <= 499) {
				var talkLink = '（[[User talk:' + userName + wgULS('|讨论]]）', '|討論]]）');
				if (resultLen + contribsLen + unescape(encodeURIComponent(talkLink)).length <= 499) {
					result = Morebits.string.safeReplace(result, '$USER', contribsLink + talkLink);
				} else {
					result = Morebits.string.safeReplace(result, '$USER', contribsLink);
				}
			} else {
				result = Morebits.string.safeReplace(result, '$USER', userName);
			}
		} else {
			result = Morebits.string.safeReplace(result, '$USER', Twinkle.fluff.hiddenName);
		}
	}

	return result;
};

Twinkle.addInitCallback(Twinkle.fluff, 'fluff');
})(jQuery);


// </nowiki>
