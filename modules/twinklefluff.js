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
	// A list of usernames, usually only bots, that vandalism revert is jumped over; that is,
	// if vandalism revert was chosen on such username, then its target is on the revision before.
	// This is for handling quick bots that makes edits seconds after the original edit is made.
	// This only affects vandalism rollback; for good faith rollback, it will stop, indicating a bot
	// has no faith, and for normal rollback, it will rollback that edit.
	Twinkle.fluff.whiteList = [
		'Antigng-bot',
		'Jimmy-bot',
		'Jimmy-abot',
		'Liangent-bot',
		'Liangent-adminbot',
		'Cewbot',
		'WhitePhosphorus-bot'
	];

	if (mw.util.getParamValue('twinklerevert')) {
		// Return if the user can't edit the page in question
		if (!mw.config.get('wgIsProbablyEditable')) {
			alert(wgULS('无法编辑页面，它可能被保护了。', '無法編輯頁面，它可能被保護了。'));
		} else {
			Twinkle.fluff.auto();
		}
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'Contributions') {
		Twinkle.fluff.addLinks.contributions();
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'Recentchanges' || mw.config.get('wgCanonicalSpecialPageName') === 'Recentchangeslinked') {
		// Reload with recent changes updates
		// structuredChangeFilters.ui.initialized is just on load
		mw.hook('wikipage.content').add(function(item) {
			if (item.is('div')) {
				Twinkle.fluff.addLinks.recentchanges();
			}
		});
	} else if (mw.config.get('wgIsProbablyEditable')) {
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
	}
};


Twinkle.fluff.spanTag = function twinklefluffspanTag(color, content) {
	var span = document.createElement('span');
	span.style.color = color;
	span.appendChild(document.createTextNode(content));
	return span;
};

Twinkle.fluff.buildLink = function twinklefluffbuildLink(color, text) {
	var link = document.createElement('a');
	link.appendChild(Twinkle.fluff.spanTag('Black', '['));
	link.appendChild(Twinkle.fluff.spanTag(color, text));
	link.appendChild(Twinkle.fluff.spanTag('Black', ']'));
	return link;
};

// Build [restore this revision] links
Twinkle.fluff.restoreThisRevision = function (element, revType) {
	var revertToRevision = document.createElement('div');
	revertToRevision.setAttribute('id', 'tw-revert-to-' + (revType === 'wgDiffNewId' ? 'n' : 'o') + 'revision');
	revertToRevision.style.fontWeight = 'bold';

	var revertToRevisionLink = Twinkle.fluff.buildLink('SaddleBrown', wgULS('恢复此版本', '恢復此版本'));
	revertToRevisionLink.href = '#';
	$(revertToRevisionLink).click(function() {
		Twinkle.fluff.revertToRevision(mw.config.get(revType).toString());
	});
	revertToRevision.appendChild(revertToRevisionLink);

	var title = document.getElementById(element).parentNode;
	title.insertBefore(revertToRevision, title.firstChild);
};


Twinkle.fluff.auto = function twinklefluffauto() {
	if (parseInt(mw.util.getParamValue('oldid', $('#mw-diff-ntitle1 a:first').attr('href')), 10) !== mw.config.get('wgCurRevisionId')) {
		// not latest revision
		alert(wgULS('无法回退，页面在此期间已被修改。', '無法回退，頁面在此期間已被修改。'));
		return;
	}

	var vandal = $('#mw-diff-ntitle2').find('a.mw-userlink').text();

	Twinkle.fluff.revert(mw.util.getParamValue('twinklerevert'), vandal, true);
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

				var revNode = document.createElement('strong');
				var revLink = Twinkle.fluff.buildLink('SteelBlue', '回退');
				revNode.appendChild(revLink);

				var revVandNode = document.createElement('strong');
				var revVandLink = Twinkle.fluff.buildLink('Red', wgULS('破坏', '破壞'));
				revVandNode.appendChild(revVandLink);

				list.each(function(key, current) {
					var href = $(current).find('.mw-changeslist-diff').attr('href');
					current.appendChild(document.createTextNode(' '));
					var tmpNode = revNode.cloneNode(true);
					current.appendChild(tmpNode);
					current.appendChild(document.createTextNode(' '));
					var tmpNode2 = revVandNode.cloneNode(true);
					current.appendChild(tmpNode2);
					if (Twinkle.getPref('rollbackInCurrentWindow')) {
						var revid = parseInt(href.match(/oldid=(\d*)/)[1]);
						var page = decodeURI(href.match(/title=(.*?)&/)[1]);
						$(tmpNode).click(function () {
							Twinkle.fluff.disableLinks([tmpNode, tmpNode2]);
							Twinkle.fluff.revert('norm', username, false, revid, page);
						});
						$(tmpNode2).click(function () {
							Twinkle.fluff.disableLinks([tmpNode, tmpNode2]);
							Twinkle.fluff.revert('vand', username, false, revid, page);
						});
					} else {
						tmpNode.firstChild.setAttribute('href', href + '&twinklerevert=norm');
						tmpNode2.firstChild.setAttribute('href', href + '&twinklerevert=vand');
					}
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
				var vandal = first.querySelector('.mw-userlink').text;

				var agfNode = document.createElement('strong');
				var vandNode = document.createElement('strong');
				var normNode = document.createElement('strong');

				var agfLink = Twinkle.fluff.buildLink('DarkOliveGreen', wgULS('回退（AGF）', '回退（AGF）'));
				var vandLink = Twinkle.fluff.buildLink('Red', wgULS('破坏', '破壞'));
				var normLink = Twinkle.fluff.buildLink('SteelBlue', '回退');

				agfLink.href = '#';
				vandLink.href = '#';
				normLink.href = '#';
				$(agfLink).click(function() {
					Twinkle.fluff.revert('agf', vandal);
				});
				$(vandLink).click(function() {
					Twinkle.fluff.revert('vand', vandal);
				});
				$(normLink).click(function() {
					Twinkle.fluff.revert('norm', vandal);
				});

				agfNode.appendChild(agfLink);
				vandNode.appendChild(vandLink);
				normNode.appendChild(normLink);

				first.appendChild(document.createTextNode(' '));
				first.appendChild(agfNode);
				first.appendChild(document.createTextNode(' '));
				first.appendChild(normNode);
				first.appendChild(document.createTextNode(' '));
				first.appendChild(vandNode);
			}

			// oldid
			histList.forEach(function(rev) {
				// From restoreThisRevision, non-transferable

				var href = rev.querySelector('.mw-changeslist-date').href;
				var oldid = parseInt(mw.util.getParamValue('oldid', href), 10);

				var revertToRevisionNode = document.createElement('strong');
				var revertToRevisionLink = Twinkle.fluff.buildLink('SaddleBrown', wgULS('恢复此版本', '恢復此版本'));

				revertToRevisionLink.href = '#';
				$(revertToRevisionLink).click(function() {
					Twinkle.fluff.revertToRevision(oldid.toString());
				});
				revertToRevisionNode.appendChild(revertToRevisionLink);

				rev.appendChild(document.createTextNode(' '));
				rev.appendChild(revertToRevisionNode);
			});


		}
	},

	recentchanges: function() {
		if (
			(mw.config.get('wgCanonicalSpecialPageName') === 'Recentchanges' && Twinkle.getPref('showRollbackLinks').indexOf('recentchanges') !== -1)
			|| (mw.config.get('wgCanonicalSpecialPageName') === 'Recentchangeslinked' && Twinkle.getPref('showRollbackLinks').indexOf('recentchangeslinked') !== -1)
		) {
			// Latest and revertable (not page creations, logs, categorizations, etc.)
			var list = $('.mw-changeslist .mw-changeslist-last.mw-changeslist-src-mw-edit');
			// Exclude top-level header if "group changes" preference is used
			// and find only individual lines or nested lines
			list = list.not('.mw-rcfilters-ui-highlights-enhanced-toplevel').find('.mw-changeslist-line-inner, td.mw-enhanced-rc-nested');

			var revNode = document.createElement('strong');
			var revLink = Twinkle.fluff.buildLink('SteelBlue', '回退');
			revNode.appendChild(revLink);

			var revVandNode = document.createElement('strong');
			var revVandLink = Twinkle.fluff.buildLink('Red', wgULS('破坏', '破壞'));
			revVandNode.appendChild(revVandLink);

			list.each(function(key, current) {
				current.appendChild(document.createTextNode(' '));
				var href = $(current).find('.mw-changeslist-diff').attr('href');
				var tmpNode = revNode.cloneNode(true);
				tmpNode.firstChild.setAttribute('href', href + '&twinklerevert=norm');
				current.appendChild(tmpNode);
				current.appendChild(document.createTextNode(' '));
				tmpNode = revVandNode.cloneNode(true);
				tmpNode.firstChild.setAttribute('href', href + '&twinklerevert=vand');
				current.appendChild(tmpNode);
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
			Twinkle.fluff.restoreThisRevision('mw-diff-otitle1', 'wgDiffOldId');

			var revertToRevision = document.getElementById('tw-revert-to-orevision');
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

		// Newer revision
		warnFromTalk('ntitle'); // Add quick-warn link to user talk link
		// Add either restore or rollback links to the newer revision
		// Don't show if there's a single revision or weird diff (prev on first)
		if (document.getElementById('differences-nextlink')) {
			// Not latest revision, add [restore this revision] link to newer revision
			Twinkle.fluff.restoreThisRevision('mw-diff-ntitle1', 'wgDiffNewId');
		} else if (Twinkle.getPref('showRollbackLinks').indexOf('diff') !== -1 && mw.config.get('wgDiffOldId') && (mw.config.get('wgDiffOldId') !== mw.config.get('wgDiffNewId') || document.getElementById('differences-prevlink'))) {
			var vandal = $('#mw-diff-ntitle2').find('a').first().text();

			var revertNode = document.createElement('div');
			revertNode.setAttribute('id', 'tw-revert');

			var agfNode = document.createElement('strong');
			var vandNode = document.createElement('strong');
			var normNode = document.createElement('strong');

			var agfLink = Twinkle.fluff.buildLink('DarkOliveGreen', wgULS('回退（AGF）', '回退（AGF）'));
			var vandLink = Twinkle.fluff.buildLink('Red', wgULS('回退（破坏）', '回退（破壞）'));
			var normLink = Twinkle.fluff.buildLink('SteelBlue', '回退');

			agfLink.href = '#';
			vandLink.href = '#';
			normLink.href = '#';
			$(agfLink).click(function() {
				Twinkle.fluff.revert('agf', vandal);
			});
			$(vandLink).click(function() {
				Twinkle.fluff.revert('vand', vandal);
			});
			$(normLink).click(function() {
				Twinkle.fluff.revert('norm', vandal);
			});

			agfNode.appendChild(agfLink);
			vandNode.appendChild(vandLink);
			normNode.appendChild(normLink);

			revertNode.appendChild(agfNode);
			revertNode.appendChild(document.createTextNode(' || '));
			revertNode.appendChild(normNode);
			revertNode.appendChild(document.createTextNode(' || '));
			revertNode.appendChild(vandNode);

			var ntitle = document.getElementById('mw-diff-ntitle1').parentNode;
			ntitle.insertBefore(revertNode, ntitle.firstChild);
		}
	},

	oldid: function() { // Add a [restore this revision] link on old revisions
		Twinkle.fluff.restoreThisRevision('mw-revision-info', 'wgRevisionId');
	}
};

Twinkle.fluff.disableLinks = function (links) {
	for (var i = 0; i < links.length; i++) {
		var link = $(links[i]);
		link.off('click')
			.attr('href', '#')
			.css('color', 'grey')
			.css('cursor', 'default');
		$('span', link).css('color', 'grey');
	}
};

Twinkle.fluff.revert = function revertPage(type, vandal, autoRevert, rev, page) {
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
	Morebits.status.init(statusElement);
	$('#catlinks').remove();

	var params = {
		type: type,
		user: vandal,
		pagename: pagename,
		revid: revid,
		autoRevert: !!autoRevert,
		summary: summary
	};
	var query = {
		'action': 'query',
		'prop': ['info', 'revisions'],
		'titles': pagename,
		'rvlimit': 50, // max possible
		'rvprop': [ 'ids', 'timestamp', 'user', 'comment' ],
		'intoken': 'edit'
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
		'intoken': 'edit',
		'format': 'xml'
	};
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取较早修订版本信息', '抓取較早修訂版本資訊'), query, Twinkle.fluff.callbacks.toRevision.main);
	wikipedia_api.statelem.status(wgULS('正在准备回退……', '正在準備回退……'));
	wikipedia_api.params = { rev: oldrev, summary: summary };
	wikipedia_api.post();
};

Twinkle.fluff.userIpLink = function(user) {
	return (mw.util.isIPAddress(user) ? '[[Special:Contributions/' : '[[:User:') + user + '|' + user + ']]';
};

Twinkle.fluff.callbacks = {
	toRevision: {
		main: function(self) {
			var xmlDoc = self.responseXML;

			var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
			var touched = $(xmlDoc).find('page').attr('touched');
			var starttimestamp = $(xmlDoc).find('page').attr('starttimestamp');
			var edittoken = $(xmlDoc).find('page').attr('edittoken');
			var revertToRevID = $(xmlDoc).find('rev').attr('revid');
			var revertToUser = $(xmlDoc).find('rev').attr('user');

			if (revertToRevID !== self.params.rev) {
				self.statelem.error(wgULS('抓取到的修订版本与请求的修订版本不符，取消。', '抓取到的修訂版本與請求的修訂版本不符，取消。'));
				return;
			}

			var optional_summary = prompt(wgULS('请输入回退理由：', '請輸入回退理由：') + '                                ', self.params.summary);  // padded out to widen prompt in Firefox
			if (optional_summary === null) {
				self.statelem.error(wgULS('由用户取消。', '由使用者取消。'));
				return;
			}
			var summary = Twinkle.fluff.formatSummary(wgULS('回退到由$USER做出的修订版本', '回退到由$USER做出的修訂版本') + revertToRevID, revertToUser, optional_summary);

			var query = {
				'action': 'edit',
				'title': mw.config.get('wgPageName'),
				'tags': Twinkle.getPref('revisionTags'),
				'summary': summary,
				'token': edittoken,
				'undo': lastrevid,
				'undoafter': revertToRevID,
				'basetimestamp': touched,
				'starttimestamp': starttimestamp,
				'watchlist': Twinkle.getPref('watchRevertedPages').indexOf('torev') !== -1 ? 'watch' : undefined,
				'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf('torev') !== -1 ? true : undefined,
				'bot': true
			};

			if (!Twinkle.fluff.useNotify) {
				Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			}
			Morebits.wiki.actionCompleted.notice = wgULS('修订版本完成', '修訂版本完成');

			var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退內容'), query, Twinkle.fluff.callbacks.complete, self.statelem);
			wikipedia_api.params = self.params;
			wikipedia_api.post();

		}
	},
	main: function(self) {
		var xmlDoc = self.responseXML;

		var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
		var touched = $(xmlDoc).find('page').attr('touched');
		var starttimestamp = $(xmlDoc).find('page').attr('starttimestamp');
		var edittoken = $(xmlDoc).find('page').attr('edittoken');
		var lastuser = $(xmlDoc).find('rev').attr('user');

		var revs = $(xmlDoc).find('rev');

		if (revs.length < 1) {
			self.statelem.error(wgULS('没有其它修订版本，无法回退', '沒有其它修訂版本，無法回退'));
			return;
		}
		var top = revs[0];
		if (lastrevid < self.params.revid) {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS([ '从服务器获取的最新修订版本ID ', Morebits.htmlNode('strong', lastrevid), ' 小于目前所显示的修订版本ID。这可能意味着当前修订版本已被删除、服务器延迟、或抓取到了坏掉的信息。取消。' ], [ '從伺服器取得的最新修訂版本ID ', Morebits.htmlNode('strong', lastrevid), ' 小於目前所顯示的修訂版本ID。這可能意味著當前修訂版本已被刪除、伺服器延遲、或擷取到了壞掉的資訊。取消。' ]));
			return;
		}
		var index = 1;
		if (self.params.revid !== lastrevid) {
			Morebits.status.warn('警告', wgULS([ '最新修订版本 ', Morebits.htmlNode('strong', lastrevid), ' 与我们的修订版本 ', Morebits.htmlNode('strong', self.params.revid), '不等' ], [ '最新修訂版本 ', Morebits.htmlNode('strong', lastrevid), ' 與我們的修訂版本 ', Morebits.htmlNode('strong', self.params.revid), ' 不等' ]));
			if (lastuser === self.params.user) {
				switch (self.params.type) {
					case 'vand':
						Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，因我们假定破坏，继续回退操作。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，因我們假定破壞，繼續回退操作。' ]));
						break;
					case 'agf':
						Morebits.status.warn('警告', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，因我们假定善意，取消回退操作，因为问题可能已被修复。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，因我們假定善意，取消回退操作，因為問題可能已被修復。' ]));
						return;
					default:
						Morebits.status.warn('提示', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，但我们还是不回退了。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', self.params.user), ' 做出，但我們還是不回退了。' ]));
						return;
				}
			} else if (self.params.type === 'vand' &&
					Twinkle.fluff.whiteList.indexOf(top.getAttribute('user')) !== -1 && revs.length > 1 &&
					revs[1].getAttribute('pageId') === self.params.revid) {
				Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', lastuser), '，一个可信的机器人做出，之前的版本被认为是破坏，继续回退操作。' ], [ '最新修訂版本由 ', Morebits.htmlNode('strong', lastuser), '，一個可信的機器人做出，之前的版本被認為是破壞，繼續回退操作。' ]));
				index = 2;
			} else {
				Morebits.status.error('错误', wgULS([ '最新修订版本由 ', Morebits.htmlNode('strong', lastuser), ' 做出，所以这个修订版本可能已经被回退了，取消回退操作。'], [ '最新修訂版本由 ', Morebits.htmlNode('strong', lastuser), ' 做出，所以這個修訂版本可能已經被回退了，取消回退操作。']));
				return;
			}

		}

		if (Twinkle.fluff.whiteList.indexOf(self.params.user) !== -1) {
			switch (self.params.type) {
				case 'vand':
					Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '将对 ', Morebits.htmlNode('strong', self.params.user), ' 执行破坏回退，这是一个可信的机器人，我们假定您要回退前一个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', self.params.user), ' 執行破壞回退，這是一個可信的機器人，我們假定您要回退前一個修訂版本。' ]));
					index = 2;
					self.params.user = revs[1].getAttribute('user');
					break;
				case 'agf':
					Morebits.status.warn('提示', wgULS([ '将对 ', Morebits.htmlNode('strong', self.params.user), ' 执行善意回退，这是一个可信的机器人，取消回退操作。' ], [ '將對 ', Morebits.htmlNode('strong', self.params.user), ' 執行善意回退，這是一個可信的機器人，取消回退操作。' ]));
					return;
				case 'norm':
				/* falls through */
				default:
					var cont = confirm(wgULS('选择了常规回退，但最新修改是由一个可信的机器人（' + self.params.user + '）做出的。您是否想回退前一个修订版本？', '選擇了常規回退，但最新修改是由一個可信的機器人（' + self.params.user + '）做出的。您是否想回退前一個修訂版本？'));
					if (cont) {
						Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '将对 ', Morebits.htmlNode('strong', self.params.user), ' 执行常规回退，这是一个可信的机器人，基于确认，我们将回退前一个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', self.params.user), ' 執行常規回退，這是一個可信的機器人，基於確認，我們將回退前一個修訂版本。' ]));
						index = 2;
						self.params.user = revs[1].getAttribute('user');
					} else {
						Morebits.status.warn('提示', wgULS([ '将对 ', Morebits.htmlNode('strong', self.params.user), ' 执行常规回退，这是一个可信的机器人，基于确认，我们仍将回退这个修订版本。' ], [ '將對 ', Morebits.htmlNode('strong', self.params.user), ' 執行常規回退，這是一個可信的機器人，基於確認，我們仍將回退這個修訂版本。' ]));
					}
					break;
			}
		}
		var found = false;
		var count = 0;

		for (var i = index; i < revs.length; ++i) {
			++count;
			if (revs[i].getAttribute('user') !== self.params.user) {
				found = i;
				break;
			}
		}

		if (!found) {
			self.statelem.error(wgULS([ '未找到之前的修订版本，可能 ', Morebits.htmlNode('strong', self.params.user), ' 是唯一贡献者，或这个用户连续做出了超过 ' + Twinkle.getPref('revertMaxRevisions') + ' 次编辑。' ], [ '未找到之前的修訂版本，可能 ', Morebits.htmlNode('strong', self.params.user), ' 是唯一貢獻者，或這個用戶連續做出了超過 ' + Twinkle.getPref('revertMaxRevisions') + ' 次編輯。' ]));
			return;
		}

		if (!count) {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS('我们将要回退0个修订版本，这没有意义，所以取消回退操作。可能是因为这个修订版本已经被回退，但修订版本ID仍是一样的。', '我們將要回退0個修訂版本，這沒有意義，所以取消回退操作。可能是因為這個修訂版本已經被回退，但修訂版本ID仍是一樣的。'));
			return;
		}

		var good_revision = revs[found];
		var userHasAlreadyConfirmedAction = false;
		if (self.params.type !== 'vand' && count > 1) {
			if (!confirm(wgULS(self.params.user + ' 连续做出了 ' + count + ' 次编辑，是否要回退所有这些？', self.params.user + ' 連續做出了 ' + count + ' 次編輯，是否要回退所有這些？'))) {
				Morebits.status.info('提示', wgULS('用户取消操作', '使用者取消操作'));
				return;
			}
			userHasAlreadyConfirmedAction = true;
		}

		self.params.count = count;

		self.params.goodid = good_revision.getAttribute('revid');
		self.params.gooduser = good_revision.getAttribute('user');

		self.statelem.status([ Morebits.htmlNode('strong', count), wgULS(' 个修订版本之前由 ', ' 個修訂版本之前由 '), Morebits.htmlNode('strong', self.params.gooduser), wgULS(' 做出的修订版本 ', ' 做出的修訂版本 '), Morebits.htmlNode('strong', self.params.goodid) ]);

		var summary, extra_summary;
		switch (self.params.type) {
			case 'agf':
				extra_summary = prompt(wgULS('可选的编辑摘要：', '可選的編輯摘要：') + '                              ', self.params.summary);  // padded out to widen prompt in Firefox
				if (extra_summary === null) {
					self.statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
					return;
				}
				userHasAlreadyConfirmedAction = true;

				summary = Twinkle.fluff.formatSummary(wgULS('回退$USER做出的出于[[WP:AGF|善意]]的编辑', '回退$USER做出的出於[[WP:AGF|善意]]的編輯'), self.params.user, extra_summary);
				break;

			case 'vand':

				summary = '回退[[Special:Contributions/' +
				self.params.user + '|' + self.params.user + ']] ([[User talk:' + self.params.user + '|讨论]])' +
				'做出的 ' + self.params.count + wgULS(' 次编辑，到由', ' 次編輯，到由') +
				self.params.gooduser + wgULS('做出的前一个修订版本 ', '做出的前一個修訂版本 ') + Twinkle.getPref('summaryAd');
				break;

			case 'norm':
			/* falls through */
			default:
				if (Twinkle.getPref('offerReasonOnNormalRevert')) {
					extra_summary = prompt(wgULS('可选的编辑摘要：', '可選的編輯摘要：') + '                              ', self.params.summary);  // padded out to widen prompt in Firefox
					if (extra_summary === null) {
						self.statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
						return;
					}
					userHasAlreadyConfirmedAction = true;
				}

				summary = Twinkle.fluff.formatSummary(wgULS('回退$USER做出的' + self.params.count + '次编辑', '回退$USER做出的' + self.params.count + '次編輯'), self.params.user, extra_summary);
				break;
		}

		if (Twinkle.getPref('confirmOnFluff') && !userHasAlreadyConfirmedAction && !confirm(wgULS('回退页面：您确定吗？', '回退頁面：您確定嗎？'))) {
			self.statelem.error(wgULS('用户取消操作。', '使用者取消操作。'));
			return;
		}

		var query;
		if ((!self.params.autoRevert || Twinkle.getPref('openTalkPageOnAutoRevert')) &&
				Twinkle.getPref('openTalkPage').indexOf(self.params.type) !== -1 &&
				mw.config.get('wgUserName') !== self.params.user) {
			Morebits.status.info(wgULS('信息', '資訊'), wgULS([ '打开用户 ', Morebits.htmlNode('strong', self.params.user), ' 的对话页' ], [ '開啟用戶 ', Morebits.htmlNode('strong', self.params.user), ' 的討論頁' ]));

			query = {
				'title': 'User talk:' + self.params.user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': self.params.pagename.replace(/_/g, ' '),
				'vanarticlerevid': self.params.revid,
				'vanarticlegoodrevid': self.params.goodid,
				'type': self.params.type,
				'count': self.params.count
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
			'title': self.params.pagename,
			'tags': Twinkle.getPref('revisionTags'),
			'summary': summary,
			'token': edittoken,
			'undo': lastrevid,
			'undoafter': self.params.goodid,
			'basetimestamp': touched,
			'starttimestamp': starttimestamp,
			'watchlist': Twinkle.getPref('watchRevertedPages').indexOf(self.params.type) !== -1 ? 'watch' : undefined,
			'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf(self.params.type) !== -1 ? true : undefined,
			'bot': true
		};

		if (!Twinkle.fluff.useNotify) {
			Morebits.wiki.actionCompleted.redirect = self.params.pagename;
		}
		Morebits.wiki.actionCompleted.notice = '回退完成';

		var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退內容'), query, Twinkle.fluff.callbacks.complete, self.statelem);
		wikipedia_api.params = self.params;
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

// builtInString should contain the string "$USER", which will be replaced
// by an appropriate user link
Twinkle.fluff.formatSummary = function(builtInString, userName, userString) {
	var result = builtInString;

	// append user's custom reason
	if (userString) {
		result += '：' + Morebits.string.toUpperCaseFirstChar(userString);
	}
	result += Twinkle.getPref('summaryAd');

	// find number of UTF-8 bytes the resulting string takes up, and possibly add
	// a contributions or contributions+talk link if it doesn't push the edit summary
	// over the 255-byte limit
	var resultLen = unescape(encodeURIComponent(result.replace('$USER', ''))).length;
	var contribsLink = '[[Special:Contributions/' + userName + '|' + userName + ']]';
	var contribsLen = unescape(encodeURIComponent(contribsLink)).length;
	if (resultLen + contribsLen <= 255) {
		var talkLink = ' ([[User talk:' + userName + wgULS('|讨论]])', '|討論]])');
		if (resultLen + contribsLen + unescape(encodeURIComponent(talkLink)).length <= 255) {
			result = Morebits.string.safeReplace(result, '$USER', contribsLink + talkLink);
		} else {
			result = Morebits.string.safeReplace(result, '$USER', contribsLink);
		}
	} else {
		result = Morebits.string.safeReplace(result, '$USER', userName);
	}

	return result;
};
})(jQuery);


// </nowiki>
