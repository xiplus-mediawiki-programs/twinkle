/* eslint-disable no-console */
// 複製並修改自 https://zh.wikipedia.org/w/index.php?oldid=45972864 作者為 User:逆襲的天邪鬼
// Adopted from https://zh.wikipedia.org/w/index.php?oldid=60075303 User:Xiplus
// 載入自己修改的Twinkle

(function () {
if (mw.config.get('wgUserName') !== 'Hamish') {
	return;
}
var VERSION = 'dev';
var PREFIX = 'User:Hamish/Twinkle/';
var rebuildcache = true;
var tests = [];
var siteBase = mw.config.get('wgServer') + mw.util.wikiScript('index') + '?title=';
var ajax = function (title) {
	return $.ajax({
		url: siteBase + title + '&action=raw&ctype=text/javascript',
		dataType: 'text'
	});
};

var load = function (p) {
	var done = function (data) {
		if (rebuildcache || !localStorage['HamishTestTwinkle_' + p.name]) {
			localStorage['HamishTestTwinkle_' + p.name] = data;
		}
	};
	if (localStorage['HamishTestTwinkle_' + p.name] && !rebuildcache) {
		return $.Deferred().resolve(localStorage['HamishTestTwinkle_' + p.name]);
	}
	if (p.test) {
		return ajax(PREFIX + p.name).done(done);
	}
	return ajax('MediaWiki:Gadget-' + p.name).done(done);
};

var message = function (text) {
	console.log('[HamishTestTwinkle]', text);
//    $('#simpleSearch input[type="search"]').attr('placeHolder', text);
};

tests.push({ name: 'twinkle.js', test: true });
tests.push({ name: 'morebits.js', test: true });
tests.push({ name: 'modules/twinklearv.js', test: true });
tests.push({ name: 'modules/twinklewarn.js', test: true });
tests.push({ name: 'modules/friendlyshared.js', test: true });
tests.push({ name: 'modules/friendlytag.js', test: true });
tests.push({ name: 'modules/friendlytalkback.js', test: true });
tests.push({ name: 'modules/friendlywelcome.js', test: true });
tests.push({ name: 'modules/twinklebatchdelete.js', test: true });
tests.push({ name: 'modules/twinklebatchundelete.js', test: true });
tests.push({ name: 'modules/twinkleblock.js', test: true });
tests.push({ name: 'modules/twinkleclose.js', test: true });
tests.push({ name: 'modules/twinkleconfig.js', test: true });
tests.push({ name: 'modules/twinklecopyvio.js', test: true });
tests.push({ name: 'modules/twinkledelimages.js', test: true });
tests.push({ name: 'modules/twinklediff.js', test: true });
tests.push({ name: 'modules/twinklefluff.js', test: true });
tests.push({ name: 'modules/twinkleimage.js', test: true });
tests.push({ name: 'modules/twinkleprotect.js', test: true });
tests.push({ name: 'modules/twinklespeedy.js', test: true });
tests.push({ name: 'modules/twinklestub.js', test: true });
tests.push({ name: 'modules/twinkleunlink.js', test: true });
tests.push({ name: 'modules/twinklexfd.js', test: true });
tests.push({ name: 'modules/twinklehandleemail.js', test: true });

// eslint-disable-next-line no-unused-vars
mw.loader.using(['mediawiki.user', 'mediawiki.util', 'mediawiki.api', 'ext.gadget.morebits', 'jquery.ui', 'mediawiki.language', 'ext.gadget.HanAssist', 'ext.gadget.select2']).then((require) => {
	if (mw.config.get('wgUserGroups').indexOf('sysop') === -1) {
		mw.config.get('wgUserGroups').push('sysop');
	}
	mw.loader.load(siteBase + 'User:Hamish/Twinkle/twinkle.css&action=raw&ctype=text/css', 'text/css');
	mw.loader.load(siteBase + 'User:Hamish/Twinkle/twinkle-pagestyles.css&action=raw&ctype=text/css', 'text/css');
	mw.loader.load(siteBase + 'User:Hamish/Twinkle/morebits.css&action=raw&ctype=text/css', 'text/css');

	var i;
	var finished = 0;
	var code = [];

	// all
	message('Loading HamishTestTW...');
	var promises = [];
	var done = function (x) {
		return function (data) {
			finished++;
			message('Loading HamishTestTW... (' + finished + '/' + tests.length + ')');
			code[x] = data;
		};
	};
	for (i = 0; i < tests.length; i++) {
		promises.push(load(tests[i]).done(done(i)));
	}
	$.when.apply($, promises).done(function () {
		localStorage.HamishTestTwinkle_version = VERSION;
		eval(code.join('\n;\n'));
		message('Twinkle Done');
		var configTitle = $('#twinkle-config-titlebar');
		if (configTitle.length) {
			configTitle.append('--版本：HamishTest ' + localStorage.HamishTestTwinkle_version);
			configTitle.append('<button onclick="localStorage.HamishTestTwinkle_version = \'\';location.reload();">清除快取</button>');
		}
	});
});
})();

/*
mw.loader.using(['mediawiki.api']).done(function() {
	var api = new mw.Api();

	var commonjs = 'User:' + mw.config.get('wgUserName') + '/common.js';
	api.edit(commonjs, function(revision) {
		var oldtext = revision.content;
		var newtext = oldtext.replace(
			/(importScript\(\s*['"]User:Xiplus\/Twinkle\.js['"]\s*\);?|mw\.loader\.load\(\s*['"]\/\/zh\.wikipedia\.org\/w\/index\.php\?title=User:Xiplus\/Twinkle\.js&action=raw&ctype=text\/javascript['"]\s*\);?)/,
			''
		);

		if (oldtext === newtext) {
			return $.Deferred().reject('找不到 importScript').promise();
		}

		return {
			text: newtext,
			summary: '已自動為您啟用小工具內的Twinkle，[[User:Xiplus/Twinkle.js]]自動作出的編輯',
			tags: 'Twinkle'
		};
	}).done(function(data) {
		mw.notify(['成功從您的 common.js 移除 Twinkle，<a href="' + mw.util.getUrl('Special:Diff/' + data.newrevid) + '">檢查修改</a>'], { autoHide: false });

		api.saveOption(
			'gadget-Twinkle', '1'
		).done(function(data) {
			if (data.warnings) {
				mw.notify('啟用小工具內的 Twinkle 失敗：' + data.warnings.options.warnings, { type: 'error' });
			} else {
				mw.notify('成功為您啟用小工具內的 Twinkle');
			}
		});
	});

})();
*/
