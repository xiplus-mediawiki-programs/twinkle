/* eslint-disable no-console */
/**
 * +-------------------------------------------------------------------------+
 * |                              === 警告 ===                               |
 * |      本工具有一些新穎的修改，雖本人會經過測試，但不能保證不會出錯            |
 * |               強烈建議在使用後複查編輯，特別是那些新功能                    |
 * |                    詳情請見[[User:Xiplus/Twinkle]]                       |
 * +-------------------------------------------------------------------------+
 */

// 複製並修改自 https://zh.wikipedia.org/w/index.php?oldid=45972864 作者為 User:逆襲的天邪鬼

// 載入自己修改的Twinkle

(function() {

var VERSION = '{{subst:#time:Y-m-d H:i:s}}';
var PREFIX = 'User:Xiplus/Twinkle/';
var rebuildcache = localStorage.A64Twinkle_version !== VERSION;
var tests = [];

var ajax = function(title) {
	return $.ajax({
		url: 'https://zh.wikipedia.org/w/index.php?title=' + title + '&action=raw&ctype=text/javascript',
		dataType: 'text'
	});
};

var load = function(p) {
	var done = function(data) {
		if (rebuildcache || !localStorage['A64Twinkle_' + p.name]) {
			localStorage['A64Twinkle_' + p.name] = data;
		}
	};
	if (localStorage['A64Twinkle_' + p.name] && !rebuildcache) {
		return $.Deferred().resolve(localStorage['A64Twinkle_' + p.name]);
	}
	if (p.test) {
		return ajax(PREFIX + p.name).done(done);
	}
	return ajax('MediaWiki:Gadget-' + p.name).done(done);
};

var message = function(text) {
	console.log('[A64Twinkle]', text);
	//    $('#simpleSearch input[type="search"]').attr('placeHolder', text);
};

tests.push({ name: 'morebits.js', test: true });
tests.push({ name: 'twinkle.js', test: true });
tests.push({ name: 'select2.min.js', test: true });
tests.push({ name: 'modules/twinklearv.js', test: true });
tests.push({ name: 'modules/twinklewarn.js', test: true });
tests.push({ name: 'modules/friendlyshared.js', test: true });
tests.push({ name: 'modules/friendlytag.js', test: true });
tests.push({ name: 'modules/friendlytalkback.js', test: true });
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

mw.loader.using(['mediawiki.user', 'mediawiki.util', 'mediawiki.Title', 'jquery.ui', 'jquery.tipsy', 'jquery.chosen']).done(function() {
	mw.loader.load('https://zh.wikipedia.org/w/index.php?title=User:Xiplus/Twinkle/morebits.css&action=raw&ctype=text/css', 'text/css');
	mw.loader.load('https://zh.wikipedia.org/w/index.php?title=User:Xiplus/Twinkle/select2.min.css&action=raw&ctype=text/css', 'text/css');
	mw.loader.load('https://zh.wikipedia.org/w/index.php?title=User:Xiplus/Twinkle/twinkle.css&action=raw&ctype=text/css', 'text/css');

	var i = 0;
	// var finished = 0;
	var code = [];

	// all
	message('Loading A64TW...');
	var promises = [];
	var done = function(x) {
		return function(data) {
			// finished++;
			// message('Loading A64TW... (' + finished + '/' + tests.length + ')');
			code[x] = data;
		};
	};
	for (i = 0; i < tests.length; i++) {
		promises.push(load(tests[i]).done(done(i)));
	}
	$.when.apply($, promises).done(function() {
		localStorage.A64Twinkle_version = VERSION;
		eval(code.join('\n;\n'));
		message('Twinkle Done');
		if ($('#twinkle-config-titlebar').length) {
			$('#twinkle-config-titlebar').append('--版本：Xiplus ' + localStorage.A64Twinkle_version);
			$('#twinkle-config-titlebar').append('<button onclick="localStorage.A64Twinkle_version = \'\';location.reload();">清除快取</button>');
		}
	});
});

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
		}).fail(function(e) {
			mw.notify('啟用小工具內的 Twinkle 失敗：' + e, { type: 'error' });
		});

	}).fail(function(e) {
		if (e === 'nocreate-missing') {
			console.error('替換Twinkle失敗：找不到您的 common.js');
		} else {
			console.error('替換Twinkle失敗：' + e);
		}
	});

});

})();
