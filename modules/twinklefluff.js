// <nowiki>

(function() {


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

var conv = require('ext.gadget.HanAssist').conv;

Twinkle.fluff = function twinklefluff() {
	// Only proceed if the user can actually edit the page in question
	// (see #632 for contribs issue).  wgIsProbablyEditable should take
	// care of namespace/contentModel restrictions as well as explicit
	// protections; it won't take care of cascading or TitleBlacklist.
	if (mw.config.get('wgIsProbablyEditable')) {
		// wgDiffOldId included for clarity in if else loop [[phab:T214985]]
		if (mw.config.get('wgDiffNewId') || mw.config.get('wgDiffOldId')) {
			// Reload alongside the revision slider
			mw.hook('wikipage.diff').add(function () {
				Twinkle.fluff.addLinks.diff();
			});
		} else if (mw.config.get('wgAction') === 'view' && mw.config.get('wgRevisionId') && mw.config.get('wgCurRevisionId') !== mw.config.get('wgRevisionId')) {
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
Twinkle.fluff.hiddenName = conv({ hans: '已隐藏的用户', hant: '已隱藏的使用者' });

// Consolidated construction of fluff links
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
	 * @param {string} [vandal=null] - Username of the editor being reverted
	 * Provide a falsey value if the username is hidden, defaults to null
	 * @param {boolean} inline - True to create two links in a span, false
	 * to create three links in a div (optional)
	 * @param {number|string} [rev=wgCurRevisionId] - Revision ID being reverted (optional)
	 * @param {string} [page=wgPageName] - Page being reverted (optional)
	 */
	rollbackLinks: function(vandal, inline, rev, page) {
		vandal = vandal || null;

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
		var vandLink = Twinkle.fluff.linkBuilder.buildLink('Red', conv({ hans: '破坏', hant: '破壞' }));

		$(normLink).click(function(e) {
			e.preventDefault();
			Twinkle.fluff.revert('norm', vandal, rev, page);
			Twinkle.fluff.disableLinks(revNode);
		});
		$(vandLink).click(function(e) {
			e.preventDefault();
			Twinkle.fluff.revert('vand', vandal, rev, page);
			Twinkle.fluff.disableLinks(revNode);
		});

		vandNode.appendChild(vandLink);
		normNode.appendChild(normLink);

		var separator = inline ? ' ' : ' || ';

		if (!inline) {
			var agfNode = document.createElement('strong');
			var agfLink = Twinkle.fluff.linkBuilder.buildLink('DarkOliveGreen', '回退（AGF）');
			$(agfLink).click(function(e) {
				e.preventDefault();
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

		var revertToRevisionLink = Twinkle.fluff.linkBuilder.buildLink('SaddleBrown', conv({ hans: '恢复此版本', hant: '恢復此版本' }));
		$(revertToRevisionLink).click(function(e) {
			e.preventDefault();
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
		var isRange = !!$('#sp-contributions-footer-anon-range')[0];
		if (mw.config.exists('wgRelevantUserName') || isRange) {
			// Get the username these contributions are for
			var username = mw.config.get('wgRelevantUserName');
			if (Twinkle.getPref('showRollbackLinks').indexOf('contribs') !== -1 ||
				(mw.config.get('wgUserName') !== username && Twinkle.getPref('showRollbackLinks').indexOf('others') !== -1) ||
				(mw.config.get('wgUserName') === username && Twinkle.getPref('showRollbackLinks').indexOf('mine') !== -1)) {
				var $list = $('#mw-content-text').find('ul li:has(span.mw-uctop):has(.mw-changeslist-diff)');

				$list.each(function(key, current) {
					// revid is also available in the href of both
					// .mw-changeslist-date or .mw-changeslist-diff
					var page = $(current).find('.mw-contributions-title').text();

					// Get username for IP ranges (wgRelevantUserName is null)
					if (isRange) {
						// The :not is possibly unnecessary, as it appears that
						// .mw-userlink is simply not present if the username is hidden
						username = $(current).find('.mw-userlink:not(.history-deleted)').text();
					}

					// It's unlikely, but we can't easily check for revdel'd usernames
					// since only a strong element is provided, with no easy selector [[phab:T255903]]
					current.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(username, true, current.dataset.mwRevid, page));
				});
			}
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
				// The :not is possibly unnecessary, as it appears that
				// .mw-userlink is simply not present if the username is hidden
				var vandal = $(current).find('.mw-userlink:not(.history-deleted)').text();
				var href = $(current).find('.mw-changeslist-diff').attr('href');
				var rev = mw.util.getParamValue('diff', href);
				var page = current.dataset.targetPage;
				current.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(vandal, true, rev, page));
			});
		}
	},

	history: function() {
		if (Twinkle.getPref('showRollbackLinks').indexOf('history') !== -1) {
			// All revs
			var histList = $('#pagehistory li').toArray();

			// On first page of results, so add revert/rollback
			// links to the top revision
			if (!$('a.mw-firstlink').length) {
				var first = histList.shift();
				var vandal = $(first).find('.mw-userlink:not(.history-deleted)').text();

				// Check for first username different than the top user,
				// only apply rollback links if/when found
				// for faster than every
				for (var i = 0; i < histList.length; i++) {
					if ($(histList[i]).find('.mw-userlink').text() !== vandal) {
						first.appendChild(Twinkle.fluff.linkBuilder.rollbackLinks(vandal, true));
						break;
					}
				}
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
				var revertsummary = new Morebits.QuickForm.Element({ type: 'select', name: 'revertsummary' });
				revertsummary.append({
					type: 'option',
					label: conv({ hans: '选择回退理由', hant: '選擇回退理由' }),
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

	if (Twinkle.fluff.rollbackInPlace) {
		var notifyStatus = document.createElement('span');
		mw.notify(notifyStatus, {
			autoHide: false,
			title: '回退' + page,
			tag: 'twinklefluff_' + rev // Shouldn't be necessary given disableLink
		});
		Morebits.Status.init(notifyStatus);
	} else {
		Morebits.Status.init(document.getElementById('mw-content-text'));
		$('#catlinks').remove();
	}

	var params = {
		type: type,
		user: vandal,
		userHidden: !vandal, // Keep track of whether the username was hidden
		pagename: pagename,
		revid: revid,
		summary: summary
	};

	var query = {
		action: 'query',
		prop: ['info', 'revisions'],
		titles: pagename,
		intestactions: 'edit',
		rvlimit: Twinkle.getPref('revertMaxRevisions'),
		rvprop: [ 'ids', 'timestamp', 'user' ],
		curtimestamp: '',
		meta: 'tokens',
		type: 'csrf'
	};
	var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '抓取较早修订版本信息', hant: '抓取較早修訂版本資訊' }), query, Twinkle.fluff.callbacks.main);
	wikipedia_api.params = params;
	wikipedia_api.post();
};

Twinkle.fluff.revertToRevision = function revertToRevision(oldrev) {

	var summary = '';
	if (document.getElementsByName('revertsummary')[0] !== undefined) {
		summary = document.getElementsByName('revertsummary')[0].value;
	}

	Morebits.Status.init(document.getElementById('mw-content-text'));

	var query = {
		action: 'query',
		prop: ['info', 'revisions'],
		titles: mw.config.get('wgPageName'),
		rvlimit: 1,
		rvstartid: oldrev,
		rvprop: [ 'ids', 'user' ],
		format: 'xml',
		curtimestamp: '',
		meta: 'tokens',
		type: 'csrf'
	};
	var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '抓取较早修订版本信息', hant: '抓取較早修訂版本資訊' }), query, Twinkle.fluff.callbacks.toRevision);
	wikipedia_api.params = { rev: oldrev, summary: summary };
	wikipedia_api.post();
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
			apiobj.statelem.error(conv({ hans: '抓取到的修订版本与请求的修订版本不符，取消。', hant: '抓取到的修訂版本與請求的修訂版本不符，取消。' }));
			return;
		}

		var optional_summary = prompt(conv({ hans: '请输入回退理由：', hant: '請輸入回退理由：' }) + '                                ', apiobj.params.summary);  // padded out to widen prompt in Firefox
		if (optional_summary === null) {
			apiobj.statelem.error(conv({ hans: '由用户取消。', hant: '由使用者取消。' }));
			return;
		}

		var summary = Twinkle.fluff.formatSummary(conv({ hans: '回退到由$USER做出的修订版本', hant: '回退到由$USER做出的修訂版本' }) + revertToRevID,
			revertToUserHidden ? null : revertToUser, optional_summary);

		var query = {
			action: 'edit',
			title: mw.config.get('wgPageName'),
			summary: summary,
			tags: Twinkle.changeTags,
			token: csrftoken,
			undo: lastrevid,
			undoafter: revertToRevID,
			basetimestamp: touched,
			starttimestamp: loadtimestamp,
			minor: Twinkle.getPref('markRevertedPagesAsMinor').indexOf('torev') !== -1 ? true : undefined,
			bot: true
		};
		// Handle watching, possible expiry
		if (Twinkle.getPref('watchRevertedPages').indexOf('torev') !== -1) {
			var watchOrExpiry = Twinkle.getPref('watchRevertedExpiry');

			if (!watchOrExpiry || watchOrExpiry === 'no') {
				query.watchlist = 'nochange';
			} else if (watchOrExpiry === 'default' || watchOrExpiry === 'preferences') {
				query.watchlist = 'preferences';
			} else {
				query.watchlist = 'watch';
				// number allowed but not used in Twinkle.config.watchlistEnums
				if (typeof watchOrExpiry === 'string' && watchOrExpiry !== 'yes') {
					query.watchlistexpiry = watchOrExpiry;
				}
			}
		}

		Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
		Morebits.wiki.actionCompleted.notice = '回退完成';

		var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '保存回退内容', hant: '儲存回退內容' }), query, Twinkle.fluff.callbacks.complete, apiobj.statelem);
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
			statelem.error(conv({ hans: '没有其它修订版本，无法回退', hant: '沒有其它修訂版本，無法回退' }));
			return;
		}
		var top = revs[0];
		var lastuser = top.getAttribute('user');

		if (lastrevid < params.revid) {
			Morebits.Status.error(conv({ hans: '错误', hant: '錯誤' }), [conv({ hans: '从服务器获取的最新修订版本ID ', hant: '從伺服器取得的最新修訂版本ID ' }), Morebits.htmlNode('strong', lastrevid), conv({ hans: ' 小于目前所显示的修订版本ID。这可能意味着当前修订版本已被删除、服务器延迟、或抓取到了坏掉的信息。取消。', hant: ' 小於目前所顯示的修訂版本ID。這可能意味著當前修訂版本已被刪除、伺服器延遲、或擷取到了壞掉的資訊。取消。' })]);
			return;
		}

		// Used for user-facing alerts, messages, etc., not edits or summaries
		var userNorm = params.user || Twinkle.fluff.hiddenName;
		var index = 1;
		if (params.revid !== lastrevid) {
			Morebits.Status.warn('警告', [conv({ hans: '最新修订版本 ', hant: '最新修訂版本 ' }), Morebits.htmlNode('strong', lastrevid), conv({ hans: ' 与我们的修订版本 ', hant: ' 與我們的修訂版本 ' }), Morebits.htmlNode('strong', params.revid), conv({ hans: '不同', hant: ' 不同' })]);
			if (lastuser === params.user) {
				switch (params.type) {
					case 'vand':
						Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), [conv({ hans: '最新修订版本由 ', hant: '最新修訂版本由 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 做出，因我们假定破坏，继续回退操作。', hant: ' 做出，因我們假定破壞，繼續回退操作。' })]);
						break;
					case 'agf':
						Morebits.Status.warn('警告', [conv({ hans: '最新修订版本由 ', hant: '最新修訂版本由 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 做出，因我们假定善意，取消回退操作，因为问题可能已被修复。', hant: ' 做出，因我們假定善意，取消回退操作，因為問題可能已被修復。' })]);
						return;
					default:
						Morebits.Status.warn('提示', [conv({ hans: '最新修订版本由 ', hant: '最新修訂版本由 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 做出，但我们还是不回退了。', hant: ' 做出，但我們還是不回退了。' })]);
						return;
				}
			} else if (params.type === 'vand' &&
					// Okay to test on user since it will either fail or sysop will correctly access it
					// Besides, none of the trusted bots are going to be revdel'd
					Twinkle.fluff.trustedBots.indexOf(top.getAttribute('user')) !== -1 && revs.length > 1 &&
					revs[1].getAttribute('revid') === params.revid) {
				Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), [conv({ hans: '最新修订版本由 ', hant: '最新修訂版本由 ' }), Morebits.htmlNode('strong', lastuser), conv({ hans: '，一个可信的机器人做出，但之前的版本被认为是破坏，继续回退操作。', hant: '，一個可信的機器人做出，但之前的版本被認為是破壞，繼續回退操作。' })]);
				index = 2;
			} else {
				Morebits.Status.error(conv({ hans: '错误', hant: '錯誤' }), [conv({ hans: '最新修订版本由 ', hant: '最新修訂版本由 ' }), Morebits.htmlNode('strong', lastuser), conv({ hans: ' 做出，所以这个修订版本可能已经被回退了，取消回退操作。', hant: ' 做出，所以這個修訂版本可能已經被回退了，取消回退操作。' })]);
				return;
			}

		} else {
			// Expected revision is the same, so the users must match;
			// this allows sysops to know whether the users are the same
			params.user = lastuser;
			userNorm = params.user || Twinkle.fluff.hiddenName;
		}

		if (Twinkle.fluff.trustedBots.indexOf(params.user) !== -1) {
			switch (params.type) {
				case 'vand':
					Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), [conv({ hans: '将对 ', hant: '將對 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 执行破坏回退，这是一个可信的机器人，我们假定您要回退前一个修订版本。', hant: ' 執行破壞回退，這是一個可信的機器人，我們假定您要回退前一個修訂版本。' })]);
					index = 2;
					params.user = revs[1].getAttribute('user');
					params.userHidden = revs[1].getAttribute('userhidden') === '';
					break;
				case 'agf':
					Morebits.Status.warn('提示', [conv({ hans: '将对 ', hant: '將對 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 执行善意回退，但这是一个可信的机器人，取消回退操作。', hant: ' 執行善意回退，但這是一個可信的機器人，取消回退操作。' })]);
					return;
				case 'norm':
				/* falls through */
				default:
					var cont = confirm(conv({ hans: '选择了常规回退，但最新修改是由一个可信的机器人（', hant: '選擇了常規回退，但最新修改是由一個可信的機器人（' }) + userNorm + conv({ hans: '）做出的。确定以回退前一个修订版本，取消以回退机器人的修改', hant: '）做出的。確定以回退前一個修訂版本，取消以回退機器人的修改' }));
					if (cont) {
						Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), [conv({ hans: '将对 ', hant: '將對 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 执行常规回退，这是一个可信的机器人，基于确认，我们将回退前一个修订版本。', hant: ' 執行常規回退，這是一個可信的機器人，基於確認，我們將回退前一個修訂版本。' })]);
						index = 2;
						params.user = revs[1].getAttribute('user');
						params.userHidden = revs[1].getAttribute('userhidden') === '';
						userNorm = params.user || Twinkle.fluff.hiddenName;
					} else {
						Morebits.Status.warn('提示', [conv({ hans: '将对 ', hant: '將對 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 执行常规回退，这是一个可信的机器人，基于确认，我们仍将回退这个修订版本。', hant: ' 執行常規回退，這是一個可信的機器人，基於確認，我們仍將回退這個修訂版本。' })]);
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
			statelem.error([conv({ hans: '未找到之前的修订版本，可能 ', hant: '未找到之前的修訂版本，可能 ' }), Morebits.htmlNode('strong', userNorm), conv({ hans: ' 是唯一贡献者，或这个用户连续做出了超过 ', hant: ' 是唯一貢獻者，或這個用戶連續做出了超過 ' }) + mw.language.convertNumber(Twinkle.getPref('revertMaxRevisions')) + conv({ hans: ' 次编辑。', hant: ' 次編輯。' })]);
			return;
		}

		if (!count) {
			Morebits.Status.error(conv({ hans: '错误', hant: '錯誤' }), conv({ hans: '我们将要回退0个修订版本，这没有意义，所以取消回退操作。可能是因为这个修订版本已经被回退，但修订版本ID仍是一样的。', hant: '我們將要回退0個修訂版本，這沒有意義，所以取消回退操作。可能是因為這個修訂版本已經被回退，但修訂版本ID仍是一樣的。' }));
			return;
		}

		var good_revision = revs[found];
		var userHasAlreadyConfirmedAction = false;
		if (params.type !== 'vand' && count > 1) {
			if (!confirm(userNorm + conv({ hans: ' 连续做出了 ', hant: ' 連續做出了 ' }) + mw.language.convertNumber(count) + conv({ hans: ' 次编辑，是否要全部回退？', hant: ' 次編輯，是否要全部回退？' }))) {
				Morebits.Status.info('提示', conv({ hans: '用户取消操作', hant: '使用者取消操作' }));
				return;
			}
			userHasAlreadyConfirmedAction = true;
		}

		params.count = count;

		params.goodid = good_revision.getAttribute('revid');
		params.gooduser = good_revision.getAttribute('user');
		params.gooduserHidden = good_revision.getAttribute('userhidden') === '';

		statelem.status([Morebits.htmlNode('strong', mw.language.convertNumber(count)), conv({ hans: ' 个修订版本之前由 ', hant: ' 個修訂版本之前由 ' }), Morebits.htmlNode('strong', params.gooduserHidden ? Twinkle.fluff.hiddenName : params.gooduser), conv({ hans: ' 做出的修订版本 ', hant: ' 做出的修訂版本 ' }), Morebits.htmlNode('strong', params.goodid)]);

		var summary, extra_summary;
		switch (params.type) {
			case 'agf':
				extra_summary = prompt(conv({ hans: '可选的编辑摘要：', hant: '可選的編輯摘要：' }) + '                              ', params.summary);  // padded out to widen prompt in Firefox
				if (extra_summary === null) {
					statelem.error(conv({ hans: '用户取消操作。', hant: '使用者取消操作。' }));
					return;
				}
				userHasAlreadyConfirmedAction = true;

				summary = Twinkle.fluff.formatSummary(conv({ hans: '回退$USER做出的出于[[WP:AGF|善意]]的编辑', hant: '回退$USER做出的出於[[WP:AGF|善意]]的編輯' }),
					params.userHidden ? null : params.user, extra_summary);
				break;

			case 'vand':
				summary = Twinkle.fluff.formatSummary('回退$USER做出的' + params.count + conv({ hans: '次编辑，到由', hant: '次編輯，到由' }) +
					(params.gooduserHidden ? Twinkle.fluff.hiddenName : params.gooduser) + conv({ hans: '做出的最后修订版本 ', hant: '做出的最後修訂版本 ' }), params.userHidden ? null : params.user);
				break;

			case 'norm':
			/* falls through */
			default:
				if (Twinkle.getPref('offerReasonOnNormalRevert')) {
					extra_summary = prompt(conv({ hans: '可选的编辑摘要：', hant: '可選的編輯摘要：' }) + '                              ', params.summary);  // padded out to widen prompt in Firefox
					if (extra_summary === null) {
						statelem.error(conv({ hans: '用户取消操作。', hant: '使用者取消操作。' }));
						return;
					}
					userHasAlreadyConfirmedAction = true;
				}

				summary = Twinkle.fluff.formatSummary('回退$USER做出的' + params.count + conv({ hans: '次编辑', hant: '次編輯' }),
					params.userHidden ? null : params.user, extra_summary);
				break;
		}

		if ((Twinkle.getPref('confirmOnFluff') ||
			// Mobile user agent taken from [[en:MediaWiki:Gadget-confirmationRollback-mobile.js]]
			(Twinkle.getPref('confirmOnMobileFluff') && /Android|webOS|iPhone|iPad|iPod|BlackBerry|Mobile|Opera Mini/i.test(navigator.userAgent))) &&
			!userHasAlreadyConfirmedAction && !confirm(conv({ hans: '回退页面：您确定吗？', hant: '回退頁面：您確定嗎？' }))) {
			statelem.error(conv({ hans: '用户取消操作。', hant: '使用者取消操作。' }));
			return;
		}

		// Decide whether to notify the user on success
		if (!Twinkle.fluff.skipTalk && Twinkle.getPref('openTalkPage').indexOf(params.type) !== -1 &&
				!params.userHidden && mw.config.get('wgUserName') !== params.user) {
			params.notifyUser = true;
			// Pass along to the warn module
			params.vantimestamp = top.getAttribute('timestamp');
		}

		var query = {
			action: 'edit',
			title: params.pagename,
			summary: summary,
			tags: Twinkle.changeTags,
			token: csrftoken,
			undo: lastrevid,
			undoafter: params.goodid,
			basetimestamp: touched,
			starttimestamp: loadtimestamp,
			minor: Twinkle.getPref('markRevertedPagesAsMinor').indexOf(params.type) !== -1 ? true : undefined,
			bot: true
		};
		// Handle watching, possible expiry
		if (Twinkle.getPref('watchRevertedPages').indexOf(params.type) !== -1) {
			var watchOrExpiry = Twinkle.getPref('watchRevertedExpiry');

			if (!watchOrExpiry || watchOrExpiry === 'no') {
				query.watchlist = 'nochange';
			} else if (watchOrExpiry === 'default' || watchOrExpiry === 'preferences') {
				query.watchlist = 'preferences';
			} else {
				query.watchlist = 'watch';
				// number allowed but not used in Twinkle.config.watchlistEnums
				if (typeof watchOrExpiry === 'string' && watchOrExpiry !== 'yes') {
					query.watchlistexpiry = watchOrExpiry;
				}
			}
		}

		if (!Twinkle.fluff.rollbackInPlace) {
			Morebits.wiki.actionCompleted.redirect = params.pagename;
		}
		Morebits.wiki.actionCompleted.notice = '回退完成';

		var wikipedia_api = new Morebits.wiki.Api(conv({ hans: '保存回退内容', hant: '儲存回退內容' }), query, Twinkle.fluff.callbacks.complete, statelem);
		wikipedia_api.params = params;
		wikipedia_api.post();

	},
	complete: function (apiobj) {
		// TODO Most of this is copy-pasted from Morebits.wiki.Page#fnSaveSuccess. Unify it
		var xml = apiobj.getXML();
		var $edit = $(xml).find('edit');

		if ($(xml).find('captcha').length > 0) {
			apiobj.statelem.error(conv({ hans: '不能回退，因维基服务器要求您输入验证码。', hant: '不能回退，因維基伺服器要求您輸入驗證碼。' }));
		} else if ($edit.attr('nochange') === '') {
			apiobj.statelem.error(conv({ hans: '要回退到的版本与当前版本相同，没什么要做的', hant: '要回退到的版本與目前版本相同，沒什麼要做的' }));
		} else {
			apiobj.statelem.info('完成');
			var params = apiobj.params;

			if (params.notifyUser && !params.userHidden) { // notifyUser only from main, not from toRevision
				Morebits.Status.info(conv({ hans: '信息', hant: '資訊' }), [conv({ hans: '开启用户 ', hant: '開啟使用者 ' }), Morebits.htmlNode('strong', params.user), conv({ hans: ' 的讨论页', hant: ' 的討論頁' })]);

				var windowQuery = {
					title: 'User talk:' + params.user,
					action: 'edit',
					preview: 'yes',
					vanarticle: params.pagename.replace(/_/g, ' '),
					vanarticlerevid: params.revid,
					vantimestamp: params.vantimestamp,
					vanarticlegoodrevid: params.goodid,
					type: params.type,
					count: params.count
				};

				switch (Twinkle.getPref('userTalkPageMode')) {
					case 'tab':
						window.open(mw.util.getUrl('', windowQuery), '_blank');
						break;
					case 'blank':
						window.open(mw.util.getUrl('', windowQuery), '_blank',
							'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
						break;
					case 'window':
					/* falls through */
					default:
						window.open(mw.util.getUrl('', windowQuery),
							window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow',
							'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
						break;
				}
			}
		}
	}
};

// If builtInString contains the string "$USER", it will be replaced
// by an appropriate user link if a user name is provided
Twinkle.fluff.formatSummary = function(builtInString, userName, customString) {
	var result = builtInString;

	// append user's custom reason
	if (customString) {
		result += '：' + Morebits.string.toUpperCaseFirstChar(customString);
	}

	// find number of UTF-8 bytes the resulting string takes up, and possibly add
	// a contributions or contributions+talk link if it doesn't push the edit summary
	// over the 499-byte limit
	if (/\$USER/.test(builtInString)) {
		if (userName) {
			var resultLen = unescape(encodeURIComponent(result.replace('$USER', ''))).length;
			var contribsLink = '[[Special:Contributions/' + userName + '|' + userName + ']]';
			var contribsLen = unescape(encodeURIComponent(contribsLink)).length;
			if (resultLen + contribsLen <= 499) {
				var talkLink = '（[[User talk:' + userName + conv({ hans: '|讨论]]）', hant: '|討論]]）' });
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
})();


// </nowiki>
