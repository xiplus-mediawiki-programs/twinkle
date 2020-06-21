// <nowiki>


(function($) {


/*
 ****************************************
 *** twinklebatchdelete.js: Batch delete module (sysops only)
 ****************************************
 * Mode of invocation:     Tab ("D-batch")
 * Active on:              Existing non-articles, and Special:PrefixIndex
 */

Twinkle.batchdelete = function twinklebatchdelete() {
	if (
		Morebits.userIsSysop && (
			(mw.config.get('wgCurRevisionId') && mw.config.get('wgNamespaceNumber') > 0) ||
			mw.config.get('wgCanonicalSpecialPageName') === 'Prefixindex' ||
			mw.config.get('wgCanonicalSpecialPageName') === 'BrokenRedirects'
		)
	) {
		Twinkle.addPortletLink(Twinkle.batchdelete.callback, wgULS('批删', '批刪'), 'tw-batch', wgULS('删除此分类或页面中的所有链接', '刪除此分類或頁面中的所有連結'));
	}
};

Twinkle.batchdelete.unlinkCache = {};

// Has the subpages list been loaded?
var subpagesLoaded;

Twinkle.batchdelete.callback = function twinklebatchdeleteCallback() {
	subpagesLoaded = false;
	var Window = new Morebits.simpleWindow(600, 400);
	Window.setTitle(wgULS('批量删除', '批次刪除'));
	Window.setScriptName('Twinkle');
	Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'WP:TW/DOC#batchdelete');

	var form = new Morebits.quickForm(Twinkle.batchdelete.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: wgULS('删除页面', '刪除頁面'),
				name: 'delete_page',
				value: 'delete',
				checked: true,
				subgroup: {
					type: 'checkbox',
					list: [
						{
							label: wgULS('删除关联的讨论页（用户讨论页除外）', '刪除關聯的討論頁（使用者討論頁除外）'),
							name: 'delete_talk',
							value: 'delete_talk',
							checked: true
						},
						{
							label: wgULS('删除到已删页面的重定向页', '刪除到已刪頁面的重新導向頁面'),
							name: 'delete_redirects',
							value: 'delete_redirects',
							checked: true
						},
						{
							label: wgULS('删除已删页面的子页面', '刪除已刪頁面的子頁面'),
							name: 'delete_subpages',
							value: 'delete_subpages',
							checked: false,
							event: Twinkle.batchdelete.callback.toggleSubpages,
							subgroup: {
								type: 'checkbox',
								list: [
									{
										label: wgULS('删除已删子页面的讨论页', '刪除已刪子頁面的討論頁'),
										name: 'delete_subpage_talks',
										value: 'delete_subpage_talks'
									},
									{
										label: wgULS('删除到已删子页面的重定向页', '刪除到已刪子頁面的重新導向頁面'),
										name: 'delete_subpage_redirects',
										value: 'delete_subpage_redirects'
									},
									{
										label: wgULS('取消所有已删页面的链入（仅处理条目及Portal名字空间）', '取消所有已刪頁面的連入（僅處理條目及Portal命名空間）'),
										name: 'unlink_subpages',
										value: 'unlink_subpages'
									}
								]
							}
						}
					]
				}
			},
			{
				label: wgULS('取消链入（仅处理条目及Portal名字空间）', '取消連入（僅處理條目及Portal命名空間）'),
				name: 'unlink_page',
				value: 'unlink',
				checked: false
			},
			{
				label: wgULS('移除文件使用（所有名字空间）', '移除檔案使用（所有命名空間）'),
				name: 'unlink_file',
				value: 'unlink_file',
				checked: true
			}
		]
	});
	form.append({
		type: 'select',
		name: 'reason',
		label: '理由：',
		style: 'width: 85%;',
		list: Twinkle.batchdelete.deletereasonlist,
		event: Twinkle.batchdelete.callback.change_custom_reason
	});
	form.append({
		name: 'custom_reason',
		type: 'input',
		label: wgULS('自定义理由：', '自訂理由：'),
		size: 60
	});
	var query = {
		'action': 'query',
		'prop': 'revisions|info|imageinfo',
		'inprop': 'protection',
		'rvprop': 'size|user'
	};

	// On categories
	if (mw.config.get('wgNamespaceNumber') === 14) {
		query.generator = 'categorymembers';
		query.gcmtitle = mw.config.get('wgPageName');
		query.gcmlimit = Twinkle.getPref('batchMax');

	// On Special:PrefixIndex
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'Prefixindex') {

		query.generator = 'allpages';
		query.gaplimit = Twinkle.getPref('batchMax');
		if (mw.util.getParamValue('prefix')) {
			query.gapnamespace = mw.util.getParamValue('namespace');
			query.gapprefix = mw.util.getParamValue('prefix');
		} else {
			var pathSplit = decodeURIComponent(location.pathname).split('/');
			if (pathSplit.length < 3 || pathSplit[2] !== 'Special:前缀索引') {
				return;
			}
			var titleSplit = pathSplit[3].split(':');
			query.gapnamespace = mw.config.get('wgNamespaceIds')[titleSplit[0].toLowerCase()];
			if (titleSplit.length < 2 || typeof query.gapnamespace === 'undefined') {
				query.gapnamespace = 0;  // article namespace
				query.gapprefix = pathSplit.splice(3).join('/');
			} else {
				pathSplit = pathSplit.splice(4);
				pathSplit.splice(0, 0, titleSplit.splice(1).join(':'));
				query.gapprefix = pathSplit.join('/');
			}
		}

	// On Special:BrokenRedirects
	} else if (mw.config.get('wgCanonicalSpecialPageName') === 'BrokenRedirects') {
		query.generator = 'querypage';
		query.gqppage = 'BrokenRedirects';
		query.gqplimit = Twinkle.getPref('batchMax');

	// On normal pages
	} else {
		query.generator = 'links';
		query.titles = mw.config.get('wgPageName');
		query.gpllimit = Twinkle.getPref('batchMax');
	}

	var statusdiv = document.createElement('div');
	statusdiv.style.padding = '15px';  // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.status.init(statusdiv);
	Window.display();

	Twinkle.batchdelete.pages = {};

	var statelem = new Morebits.status(wgULS('抓取页面列表', '抓取頁面列表'));
	var wikipedia_api = new Morebits.wiki.api(wgULS('加载中…', '載入中…'), query, function(apiobj) {
		var xml = apiobj.responseXML;
		var $pages = $(xml).find('page').filter(':not([missing])');  // :not([imagerepository="shared"])
		$pages.each(function(index, page) {
			var $page = $(page);
			var ns = $page.attr('ns');
			var title = $page.attr('title');
			var isRedir = $page.attr('redirect') === '';
			var $editprot = $page.find('pr[type="edit"][level="sysop"]');
			var isProtected = $editprot.length > 0;
			var size = $page.find('rev').attr('size');

			var metadata = [];
			if (isRedir) {
				metadata.push(wgULS('重定向', '重新導向'));
			}
			if (isProtected) {
				metadata.push(wgULS('全保护，', '全保護，') +
					($editprot.attr('expiry') === 'infinity' ? wgULS('无限期', '無限期') : new Morebits.date($editprot.attr('expiry')).calendar('utc') + ' (UTC)') + wgULS('过期', '過期'));
			}
			if (ns === '6') {  // mimic what delimages used to show for files
				metadata.push(wgULS('上传者：', '上傳者：') + $page.find('ii').attr('user'));
				metadata.push(wgULS('最后编辑：', '最後編輯：') + $page.find('rev').attr('user'));
			} else {
				metadata.push(size + wgULS('字节', '位元組'));
			}
			Twinkle.batchdelete.pages[title] = {
				label: title + (metadata.length ? '（' + metadata.join('，') + '）' : ''),
				value: title,
				checked: true,
				style: isProtected ? 'color:red' : ''
			};
		});

		var form = apiobj.params.form;
		form.append({ type: 'header', label: wgULS('待删除页面', '待刪除頁面') });
		form.append({
			type: 'button',
			label: wgULS('全选', '全選'),
			event: function dBatchSelectAll() {
				$(result).find('input[name=pages]:not(:checked)').each(function(_, e) {
					e.click(); // check it, and invoke click event so that subgroup can be shown
				});

				// Check any unchecked subpages too
				$('input[name="pages.subpages"]').prop('checked', true);
			}
		});
		form.append({
			type: 'button',
			label: wgULS('全不选', '全不選'),
			event: function dBatchDeselectAll() {
				$(result).find('input[name=pages]:checked').each(function(_, e) {
					e.click(); // uncheck it, and invoke click event so that subgroup can be hidden
				});
			}
		});
		form.append({
			type: 'checkbox',
			name: 'pages',
			id: 'tw-dbatch-pages',
			list: $.map(Twinkle.batchdelete.pages, function (e) {
				return e;
			})
		});
		form.append({ type: 'submit' });

		var result = form.render();
		apiobj.params.Window.setContent(result);

		var pageCheckboxes = Morebits.quickForm.getElements(result, 'pages') || [];
		pageCheckboxes.forEach(generateArrowLinks);
		Morebits.checkboxShiftClickSupport(pageCheckboxes);

	}, statelem);

	wikipedia_api.params = { form: form, Window: Window };
	wikipedia_api.post();
};

function generateArrowLinks (checkbox) {
	var link = Morebits.htmlNode('a', ' >');
	link.setAttribute('class', 'tw-dbatch-page-link');
	link.setAttribute('href', mw.util.getUrl(checkbox.value));
	link.setAttribute('target', '_blank');
	checkbox.nextElementSibling.append(link);
}

Twinkle.batchdelete.generateNewPageList = function(form) {

	// Update the list of checked pages in Twinkle.batchdelete.pages object
	var elements = form.elements.pages;
	if (elements instanceof NodeList) { // if there are multiple pages
		for (var i = 0; i < elements.length; ++i) {
			Twinkle.batchdelete.pages[elements[i].value].checked = elements[i].checked;
		}
	} else if (elements instanceof HTMLInputElement) { // if there is just one page
		Twinkle.batchdelete.pages[elements.value].checked = elements.checked;
	}

	return new Morebits.quickForm.element({
		type: 'checkbox',
		name: 'pages',
		id: 'tw-dbatch-pages',
		list: $.map(Twinkle.batchdelete.pages, function (e) {
			return e;
		})
	}).render();
};

Twinkle.batchdelete.deletereasonlist = [
	{
		label: wgULS('自定义', '自訂'),
		value: 'custom'
	},
	{
		label: wgULS('G1: 没有实际内容的页面', 'G1: 沒有實際內容的頁面'),
		value: wgULS('G1: 没有实际内容的页面', 'G1: 沒有實際內容的頁面')
	},
	{
		label: wgULS('G2: 测试页面', 'G2: 測試頁面'),
		value: wgULS('G2: 测试页面', 'G2: 測試頁面')
	},
	{
		label: wgULS('G3: 纯粹破坏，包括但不限于明显的恶作剧、错误信息、人身攻击等', 'G3: 純粹破壞，包括但不限於明顯的惡作劇、錯誤資訊、人身攻擊等'),
		value: wgULS('G3: 纯粹破坏，包括但不限于明显的恶作剧、错误信息、人身攻击等', 'G3: 純粹破壞，包括但不限於明顯的惡作劇、錯誤資訊、人身攻擊等')
	},
	{
		label: wgULS('G5: 曾经根据页面存废讨论、侵权审核或文件存废讨论结果删除后又重新创建的内容，而有关内容与已删除版本相同或非常相似，无论标题是否相同', 'G5: 曾經根據頁面存廢討論、侵權審核或檔案存廢討論結果刪除後又重新建立的內容，而有關內容與已刪除版本相同或非常相似，無論標題是否相同'),
		value: wgULS('G5: 曾经根据页面存废讨论、侵权审核或文件存废讨论结果删除后又重新创建的内容，而有关内容与已删除版本相同或非常相似，无论标题是否相同', 'G5: 曾經根據頁面存廢討論、侵權審核或檔案存廢討論結果刪除後又重新建立的內容，而有關內容與已刪除版本相同或非常相似，無論標題是否相同')
	},
	{
		label: wgULS('G8: 因技术原因删除页面', 'G8: 因技術原因刪除頁面'),
		value: wgULS('G8: 因技术原因删除页面', 'G8: 因技術原因刪除頁面')
	},
	{
		label: wgULS('G10: 原作者清空页面或提出删除，且实际贡献者只有一人', 'G10: 原作者清空頁面或提出刪除，且實際貢獻者只有一人'),
		value: wgULS('G10: 原作者清空页面或提出删除，且实际贡献者只有一人', 'G10: 原作者清空頁面或提出刪除，且實際貢獻者只有一人')
	},
	{
		label: wgULS('G11: 明显的广告宣传页面，或只有相关人物或团体的联系方法的页面', 'G11: 明顯的廣告宣傳頁面，或只有相關人物或團體的聯絡方法的頁面'),
		value: wgULS('G11: 明显的广告宣传页面，或只有相关人物或团体的联系方法的页面', 'G11: 明顯的廣告宣傳頁面，或只有相關人物或團體的聯絡方法的頁面')
	},
	{
		label: wgULS('G12: 未列明来源且语调负面的生者传记', 'G12: 未列明來源且語調負面的生者傳記'),
		value: wgULS('G12: 未列明来源且语调负面的生者传记', 'G12: 未列明來源且語調負面的生者傳記')
	},
	{
		label: wgULS('G13: 翻译拙劣', 'G13: 翻譯拙劣'),
		value: wgULS('G13: 翻译拙劣', 'G13: 翻譯拙劣')
	},
	{
		label: wgULS('G14: 超过两周没有进行任何翻译的非现代标准汉语页面', 'G14: 超過兩週沒有進行任何翻譯的非現代標準漢語頁面'),
		value: wgULS('G14: 超过两周没有进行任何翻译的非现代标准汉语页面', 'G14: 超過兩週沒有進行任何翻譯的非現代標準漢語頁面')
	},
	{
		label: wgULS('G15: 孤立页面，比如没有主页面的讨论页、指向空页面的重定向等', 'G15: 孤立頁面，比如沒有主頁面的討論頁、指向空頁面的重新導向等'),
		value: wgULS('G15: 孤立页面，比如没有主页面的讨论页、指向空页面的重定向等', 'G15: 孤立頁面，比如沒有主頁面的討論頁、指向空頁面的重新導向等')
	},
	{
		label: wgULS('G16: 页面与介绍相同事物的原页面同样侵权', 'G16: 頁面與介紹相同事物的原頁面同樣侵權'),
		value: wgULS('G16: 页面与介绍相同事物的原页面同样侵权', 'G16: 頁面與介紹相同事物的原頁面同樣侵權')
	},
	{
		label: wgULS('A1: 内容空泛（包括但不限于没有定义）。', 'A1: 內容空泛（包括但不限於沒有定義）。'),
		value: wgULS('A1: 内容空泛（包括但不限于没有定义）。', 'A1: 內容空泛（包括但不限於沒有定義）。')
	},
	{
		label: wgULS('A2: 内容只包括外部链接、参见、图书参考、分类、模板、跨语言链接的条目', 'A2: 內容只包括外部連結、參見、圖書參考、分類、模板、跨語言連結的條目'),
		value: wgULS('A2: 内容只包括外部链接、参见、图书参考、分类、模板、跨语言链接的条目', 'A2: 內容只包括外部連結、參見、圖書參考、分類、模板、跨語言連結的條目')
	},
	{
		label: wgULS('A3: 复制自其他中文维基计划，或是与其他中文维基计划内容相同的文章。', 'A3: 複製自其他中文維基計劃，或是與其他中文維基計劃內容相同的文章。'),
		value: wgULS('A3: 复制自其他中文维基计划，或是与其他中文维基计划内容相同的文章。', 'A3: 複製自其他中文維基計劃，或是與其他中文維基計劃內容相同的文章。')
	},
	{
		label: wgULS('A5: 条目创建时之内容即与其他现有条目内容完全相同或非常相似，且名称不适合作为其他条目之重定向。', 'A5: 條目建立時之內容即與其他現有條目內容完全相同或非常相似，且名稱不適合作為其他條目之重新導向。'),
		value: wgULS('A5: 条目创建时之内容即与其他现有条目内容完全相同或非常相似，且名称不适合作为其他条目之重定向。', 'A5: 條目建立時之內容即與其他現有條目內容完全相同或非常相似，且名稱不適合作為其他條目之重新導向。')
	},
	{
		label: wgULS('A6: 复制自其他维基百科语言版本，且完全没有翻译。', 'A6: 複製自其他維基百科語言版本，且完全沒有翻譯。'),
		value: wgULS('A6: 复制自其他维基百科语言版本，且完全没有翻译。', 'A6: 複製自其他維基百科語言版本，且完全沒有翻譯。')
	},
	{
		label: wgULS('R2: 跨名字空间重定向。', 'R2: 跨命名空間重新導向。'),
		value: wgULS('R2: 跨名字空间重定向。', 'R2: 跨命名空間重新導向。')
	},
	{
		label: wgULS('R3: 格式错误，或明显笔误的重定向。', 'R3: 格式錯誤，或明顯筆誤的重新導向。'),
		value: wgULS('R3: 格式错误，或明显笔误的重定向。', 'R3: 格式錯誤，或明顯筆誤的重新導向。')
	},
	{
		label: wgULS('R5: 指向本身或循环的重定向。', 'R5: 指向本身或循環的重新導向。'),
		value: wgULS('R5: 指向本身或循环的重定向。', 'R5: 指向本身或循環的重新導向。')
	},
	{
		label: wgULS('R6: 移动文件而产生的重定向，且页面标题不符合文件名称指引。', 'R6: 移動檔案而產生的重新導向，且頁面標題不符合檔案名稱指引。'),
		value: wgULS('R6: 移动文件而产生的重定向，且页面标题不符合文件名称指引。', 'R6: 移動檔案而產生的重新導向，且頁面標題不符合檔案名稱指引。')
	},
	{
		label: wgULS('R7: 明显与导向目标所涵盖的主题无关或比导向目标所涵盖的主题更广泛的重定向。', 'R7: 明顯與導向目標所涵蓋的主題無關或比導向目標所涵蓋的主題更廣泛的重新導向。'),
		value: wgULS('R7: 明显与导向目标所涵盖的主题无关或比导向目标所涵盖的主题更广泛的重定向。', 'R7: 明顯與導向目標所涵蓋的主題無關或比導向目標所涵蓋的主題更廣泛的重新導向。')
	},
	{
		label: wgULS('F1: 重复的文件（完全相同或缩小），而且不再被条目使用', 'F1: 重複的檔案（完全相同或縮小），而且不再被條目使用'),
		value: wgULS('F1: 重复的文件（完全相同或缩小），而且不再被条目使用', 'F1: 重複的檔案（完全相同或縮小），而且不再被條目使用')
	},
	{
		label: wgULS('F3: 来源不明的文件', 'F3: 來源不明的檔案'),
		value: wgULS('F3: 来源不明的文件', 'F3: 來源不明的檔案')
	},
	{
		label: wgULS('F4: 未知著作权或著作权无法被查证的文件', 'F4: 未知著作權或著作權無法被查證的檔案'),
		value: wgULS('F4: 未知著作权或著作权无法被查证的文件', 'F4: 未知著作權或著作權無法被查證的檔案')
	},
	{
		label: wgULS('F5: 被高清晰度或SVG文件取代的图片', 'F5: 被高解析度或SVG檔案取代的圖片'),
		value: wgULS('F5: 被高清晰度或SVG文件取代的图片', 'F5: 被高解析度或SVG檔案取代的圖片')
	},
	{
		label: wgULS('F6: 没有被条目使用的非自由著作权文件', 'F6: 沒有被條目使用的非自由著作權檔案'),
		value: wgULS('F6: 没有被条目使用的非自由著作权文件', 'F6: 沒有被條目使用的非自由著作權檔案')
	},
	{
		label: wgULS('F7: 与维基共享资源文件重复的文件', 'F7: 與維基共享資源檔案重複的檔案'),
		value: wgULS('F7: 与维基共享资源文件重复的文件', 'F7: 與維基共享資源檔案重複的檔案')
	},
	{
		label: wgULS('F8: 明显侵权之文件', 'F8: 明顯侵權之檔案'),
		value: wgULS('F8: 明显侵权之文件', 'F8: 明顯侵權之檔案')
	},
	{
		label: wgULS('F9: 没有填写任何合理使用依据的非自由著作权文件', 'F9: 沒有填寫任何合理使用依據的非自由著作權檔案'),
		value: wgULS('F9: 没有填写任何合理使用依据的非自由著作权文件', 'F9: 沒有填寫任何合理使用依據的非自由著作權檔案')
	},
	{
		label: wgULS('F10: 可被替代的非自由著作权文件', 'F10: 可被替代的非自由著作權檔案'),
		value: wgULS('F10: 可被替代的非自由著作权文件', 'F10: 可被替代的非自由著作權檔案')
	},
	{
		label: wgULS('O1: 用户请求删除自己的用户页或其子页面。', 'O1: 使用者請求刪除自己的使用者頁面或其子頁面。'),
		value: wgULS('O1: 用户请求删除自己的用户页或其子页面。', 'O1: 使用者請求刪除自己的使用者頁面或其子頁面。')
	},
	{
		label: wgULS('O3: 已超过一个月未有编辑动作的匿名（IP）用户的用户讨论页', 'O3: 已超過一個月未有編輯動作的匿名（IP）使用者的使用者討論頁'),
		value: wgULS('O3: 已超过一个月未有编辑动作的匿名（IP）用户的用户讨论页', 'O3: 已超過一個月未有編輯動作的匿名（IP）使用者的使用者討論頁')
	},
	{
		label: wgULS('O4: 空的分类（没有条目也没有子分类）。', 'O4: 空的分類（沒有條目也沒有子分類）。'),
		value: wgULS('O4: 空的分类（没有条目也没有子分类）。', 'O4: 空的分類（沒有條目也沒有子分類）。')
	},
	{
		label: wgULS('O7: 废弃草稿。', 'O7: 廢棄草稿。'),
		value: wgULS('O7: 废弃草稿。', 'O7: 廢棄草稿。')
	}
];

Twinkle.batchdelete.callback.change_custom_reason = function twinklebatchdeleteCallbackChangeCustomReason(e) {
	var customReason = e.target.form.custom_reason;
	if (e.target.value === 'custom') {
		Morebits.quickForm.setElementVisibility(customReason.parentNode, true);
	} else {
		Morebits.quickForm.setElementVisibility(customReason.parentNode, false);
	}
	// do not clear text here to avoid losing reason from accidental switch
};

Twinkle.batchdelete.callback.toggleSubpages = function twDbatchToggleSubpages(e) {

	var form = e.target.form;
	var newPageList, pageCheckboxes, subpageCheckboxes;

	if (e.target.checked) {

		form.delete_subpage_redirects.checked = form.delete_redirects.checked;
		form.delete_subpage_talks.checked = form.delete_talk.checked;
		form.unlink_subpages.checked = form.unlink_page.checked;

		// If lists of subpages were already loaded once, they are
		// available without use of any API calls
		if (subpagesLoaded) {

			$.each(Twinkle.batchdelete.pages, function(i, el) {
				// Get back the subgroup from subgroup_, where we saved it
				if (el.subgroup === null && el.subgroup_) {
					el.subgroup = el.subgroup_;
				}
			});

			newPageList = Twinkle.batchdelete.generateNewPageList(form);
			$('#tw-dbatch-pages').replaceWith(newPageList);

			pageCheckboxes = Morebits.quickForm.getElements(newPageList, 'pages') || [];
			pageCheckboxes.forEach(generateArrowLinks);
			Morebits.checkboxShiftClickSupport(pageCheckboxes);

			subpageCheckboxes = Morebits.quickForm.getElements(newPageList, 'pages.subpages') || [];
			subpageCheckboxes.forEach(generateArrowLinks);
			Morebits.checkboxShiftClickSupport(subpageCheckboxes);

			return;
		}

		// Proceed with API calls to get list of subpages
		var loadingText = '<strong id="dbatch-subpage-loading">' + wgULS('加载中...', '載入中...') + '</strong>';
		$(e.target).after(loadingText);

		var pages = $(form.pages).map(function(i, el) {
			return el.value;
		}).get();

		var subpageLister = new Morebits.batchOperation();
		subpageLister.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
		subpageLister.setPageList(pages);
		subpageLister.run(function worker (pageName) {
			var pageTitle = mw.Title.newFromText(pageName);

			// No need to look for subpages in main/file/mediawiki space
			if ([0, 6, 8].indexOf(pageTitle.namespace) > -1) {
				subpageLister.workerSuccess();
				return;
			}

			var wikipedia_api = new Morebits.wiki.api(wgULS('正在获取 ', '正在取得 ') + pageName + wgULS(' 的子页面', ' 的子頁面'), {
				action: 'query',
				prop: 'revisions|info|imageinfo',
				generator: 'allpages',
				rvprop: 'size',
				inprop: 'protection',
				gapprefix: pageTitle.title + '/',
				gapnamespace: pageTitle.namespace,
				gaplimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				pageNameFull: pageName // Not used by API, but added for access in onSuccess()
			}, function onSuccess(apiobj) {
				var xml = apiobj.responseXML;
				var $pages = $(xml).find('page');
				var subpageList = [];
				$pages.each(function(index, page) {
					var $page = $(page);
					var ns = $page.attr('ns');
					var title = $page.attr('title');
					var isRedir = $page.attr('redirect') === '';
					var $editprot = $page.find('pr[type="edit"][level="sysop"]');

					var isProtected = $editprot.length > 0;
					var size = $page.find('rev').attr('size');

					var metadata = [];
					if (isRedir) {
						metadata.push('redirect');
					}
					if (isProtected) {
						metadata.push(wgULS('全保护，', '全保護，') +
							($editprot.attr('expiry') === 'infinity' ? wgULS('无限期', '無限期') : new Morebits.date($editprot.attr('expiry')).calendar('utc') + ' (UTC)') + wgULS('过期', '過期'));
					}
					if (ns === '6') {  // mimic what delimages used to show for files
						metadata.push(wgULS('上传者：', '上傳者：') + $page.find('ii').attr('user'));
						metadata.push(wgULS('最后编辑：', '最後編輯：') + $page.find('rev').attr('user'));
					} else {
						metadata.push(size + wgULS('字节', '位元組'));
					}
					subpageList.push({
						label: title + (metadata.length ? ' (' + metadata.join('; ') + ')' : ''),
						value: title,
						checked: true,
						style: isProtected ? 'color:red' : ''
					});
				});
				if (subpageList.length) {
					var pageName = apiobj.query.pageNameFull;
					Twinkle.batchdelete.pages[pageName].subgroup = {
						type: 'checkbox',
						name: 'subpages',
						className: 'dbatch-subpages',
						list: subpageList
					};
				}
				subpageLister.workerSuccess();
			}, null /* statusElement */, function onFailure() {
				subpageLister.workerFailure();
			});
			wikipedia_api.post();

		}, function postFinish () {
			// List 'em on the interface

			newPageList = Twinkle.batchdelete.generateNewPageList(form);
			$('#tw-dbatch-pages').replaceWith(newPageList);

			pageCheckboxes = Morebits.quickForm.getElements(newPageList, 'pages') || [];
			pageCheckboxes.forEach(generateArrowLinks);
			Morebits.checkboxShiftClickSupport(pageCheckboxes);

			subpageCheckboxes = Morebits.quickForm.getElements(newPageList, 'pages.subpages') || [];
			subpageCheckboxes.forEach(generateArrowLinks);
			Morebits.checkboxShiftClickSupport(subpageCheckboxes);

			subpagesLoaded = true;

			// Remove "Loading... " text
			$('#dbatch-subpage-loading').remove();

		});

	} else if (!e.target.checked) {

		$.each(Twinkle.batchdelete.pages, function(i, el) {
			if (el.subgroup) {
				// Remove subgroup after saving its contents in subgroup_
				// so that it can be retrieved easily if user decides to
				// delete the subpages again
				el.subgroup_ = el.subgroup;
				el.subgroup = null;
			}
		});

		newPageList = Twinkle.batchdelete.generateNewPageList(form);
		$('#tw-dbatch-pages').replaceWith(newPageList);

		pageCheckboxes = Morebits.quickForm.getElements(newPageList, 'pages') || [];
		pageCheckboxes.forEach(generateArrowLinks);
		Morebits.checkboxShiftClickSupport(pageCheckboxes);

	}
};

Twinkle.batchdelete.callback.evaluate = function twinklebatchdeleteCallbackEvaluate(event) {
	Morebits.wiki.actionCompleted.notice = wgULS('批量删除已完成', '批次刪除已完成');

	var form = event.target;

	var numProtected = $(Morebits.quickForm.getElements(form, 'pages')).filter(function(index, element) {
		return element.checked && element.nextElementSibling.style.color === 'red';
	}).length;
	if (numProtected > 0 && !confirm(wgULS('您正要删除 ', '您正要刪除 ') + numProtected + wgULS(' 个全保护页面，您确定吗？', ' 個全保護頁面，您確定嗎？'))) {
		return;
	}

	var pages = form.getChecked('pages');
	var subpages = form.getChecked('pages.subpages');
	var reason = form.reason.value;
	if (reason === 'custom') {
		reason = form.custom_reason.value;
	}
	var delete_page = form.delete_page.checked;
	var delete_talk, delete_redirects, delete_subpages;
	var delete_subpage_redirects, delete_subpage_talks, unlink_subpages;
	if (delete_page) {
		delete_talk = form.delete_talk.checked;
		delete_redirects = form.delete_redirects.checked;
		delete_subpages = form.delete_subpages.checked;
		if (delete_subpages) {
			delete_subpage_redirects = form.delete_subpage_redirects.checked;
			delete_subpage_talks = form.delete_subpage_talks.checked;
			unlink_subpages = form.unlink_subpages.checked;
		}
	}
	var unlink_page = form.unlink_page.checked;
	var unlink_file = form.unlink_file.checked;
	if (!reason) {
		alert(wgULS('您需要给出一个理由', '您需要給出一個理由'));
		return;
	}
	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(form);
	if (!pages) {
		Morebits.status.error(wgULS('错误', '錯誤'), wgULS('没有要删除的内容，中止', '沒有要刪除的內容，中止'));
		return;
	}

	var pageDeleter = new Morebits.batchOperation(delete_page ? wgULS('正在删除页面', '正在刪除頁面') : wgULS('正在启动要求的任务', '正在啟動要求的任務'));
	pageDeleter.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
	// we only need the initial status lines if we're deleting the pages in the pages array
	pageDeleter.setOption('preserveIndividualStatusLines', delete_page);
	pageDeleter.setPageList(pages);
	pageDeleter.run(function worker(pageName) {
		var params = {
			page: pageName,
			delete_page: delete_page,
			delete_talk: delete_talk,
			delete_redirects: delete_redirects,
			unlink_page: unlink_page,
			unlink_file: unlink_file && /^(File|Image):/i.test(pageName),
			reason: reason,
			pageDeleter: pageDeleter
		};

		var wikipedia_page = new Morebits.wiki.page(pageName, wgULS('正在删除页面 ', '正在刪除頁面 ') + pageName);
		wikipedia_page.setCallbackParameters(params);
		if (delete_page) {
			wikipedia_page.setEditSummary(reason + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.setTags(Twinkle.getPref('revisionTags'));
			wikipedia_page.suppressProtectWarning();
			wikipedia_page.deletePage(Twinkle.batchdelete.callbacks.doExtras, pageDeleter.workerFailure);
		} else {
			Twinkle.batchdelete.callbacks.doExtras(wikipedia_page);
		}
	}, function postFinish() {
		if (delete_subpages) {
			var subpageDeleter = new Morebits.batchOperation(wgULS('正在删除子页面', '正在刪除子頁面'));
			subpageDeleter.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
			subpageDeleter.setOption('preserveIndividualStatusLines', true);
			subpageDeleter.setPageList(subpages);
			subpageDeleter.run(function(pageName) {
				var params = {
					page: pageName,
					delete_page: true,
					delete_talk: delete_subpage_talks,
					delete_redirects: delete_subpage_redirects,
					unlink_page: unlink_subpages,
					unlink_file: false,
					reason: reason,
					pageDeleter: subpageDeleter
				};

				var wikipedia_page = new Morebits.wiki.page(pageName, wgULS('正在删除子页面 ', '正在刪除子頁面 ') + pageName);
				wikipedia_page.setCallbackParameters(params);
				wikipedia_page.setEditSummary(reason + Twinkle.getPref('deletionSummaryAd'));
				wikipedia_page.setTags(Twinkle.getPref('revisionTags'));
				wikipedia_page.suppressProtectWarning();
				wikipedia_page.deletePage(Twinkle.batchdelete.callbacks.doExtras, pageDeleter.workerFailure);
			});
		}
	});
};

Twinkle.batchdelete.callbacks = {
	// this stupid parameter name is a temporary thing until I implement an overhaul
	// of Morebits.wiki.* callback parameters
	doExtras: function(thingWithParameters) {
		var params = thingWithParameters.parent ? thingWithParameters.parent.getCallbackParameters() :
			thingWithParameters.getCallbackParameters();
		// the initial batch operation's job is to delete the page, and that has
		// succeeded by now
		params.pageDeleter.workerSuccess(thingWithParameters);

		var query, wikipedia_api;

		if (params.unlink_page) {
			Twinkle.batchdelete.unlinkCache = {};
			query = {
				'action': 'query',
				'list': 'backlinks',
				'blfilterredir': 'nonredirects',
				'blnamespace': [0, 100], // main space and portal space only
				'bltitle': params.page,
				'bllimit': 'max' // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api(wgULS('正在获取链入', '正在取得連入'), query, Twinkle.batchdelete.callbacks.unlinkBacklinksMain);
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if (params.unlink_file) {
			query = {
				'action': 'query',
				'list': 'imageusage',
				'iutitle': params.page,
				'iulimit': 'max' // 500 is max for normal users, 5000 for bots and sysops
			};
			wikipedia_api = new Morebits.wiki.api(wgULS('正在获取文件链入', '正在取得檔案連入'), query, Twinkle.batchdelete.callbacks.unlinkImageInstancesMain);
			wikipedia_api.params = params;
			wikipedia_api.post();
		}

		if (params.delete_page) {
			if (params.delete_redirects) {
				query = {
					'action': 'query',
					'titles': params.page,
					'prop': 'redirects',
					'rdlimit': 'max' // 500 is max for normal users, 5000 for bots and sysops
				};
				wikipedia_api = new Morebits.wiki.api(wgULS('正在获取重定向', '正在取得重新導向'), query, Twinkle.batchdelete.callbacks.deleteRedirectsMain);
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
			if (params.delete_talk) {
				var pageTitle = mw.Title.newFromText(params.page);
				if (pageTitle && pageTitle.namespace % 2 === 0 && pageTitle.namespace !== 2) {
					pageTitle.namespace++;  // now pageTitle is the talk page title!
					query = {
						'action': 'query',
						'titles': pageTitle.toText()
					};
					wikipedia_api = new Morebits.wiki.api(wgULS('正在检查讨论页面是否存在', '正在檢查討論頁面是否存在'), query, Twinkle.batchdelete.callbacks.deleteTalk);
					wikipedia_api.params = params;
					wikipedia_api.params.talkPage = pageTitle.toText();
					wikipedia_api.post();
				}
			}
		}
	},
	deleteRedirectsMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('rd').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var redirectDeleter = new Morebits.batchOperation(wgULS('正在删除到 ', '正在刪除到 ') + apiobj.params.page + wgULS(' 的重定向', ' 的重新導向'));
		redirectDeleter.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
		redirectDeleter.setPageList(pages);
		redirectDeleter.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, wgULS('正在删除 ', '正在刪除 ') + pageName);
			wikipedia_page.setEditSummary('[[WP:CSD#G15|G15]]: ' + wgULS('指向已删页面“', '指向已刪頁面「') + apiobj.params.page + wgULS('”的重定向', '」的重新導向') + Twinkle.getPref('deletionSummaryAd'));
			wikipedia_page.setTags(Twinkle.getPref('revisionTags'));
			wikipedia_page.deletePage(redirectDeleter.workerSuccess, redirectDeleter.workerFailure);
		});
	},
	deleteTalk: function(apiobj) {
		var xml = apiobj.responseXML;
		var exists = $(xml).find('page:not([missing])').length > 0;

		if (!exists) {
			// no talk page; forget about it
			return;
		}

		var page = new Morebits.wiki.page(apiobj.params.talkPage, wgULS('正在删除页面 ', '正在刪除頁面 ') + apiobj.params.page + wgULS(' 的讨论页', ' 的討論頁'));
		page.setEditSummary('[[WP:CSD#G15|G15]]: ' + wgULS('已删页面“', '已刪頁面「') + apiobj.params.page + wgULS('”的[[Wikipedia:讨论页|讨论页]]', '」的[[Wikipedia:討論頁|討論頁]]') + Twinkle.getPref('deletionSummaryAd'));
		page.setTags(Twinkle.getPref('revisionTags'));
		page.deletePage();
	},
	unlinkBacklinksMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('bl').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.batchOperation(wgULS('正在取消到 ', '正在取消到 ') + apiobj.params.page + wgULS(' 的链入', ' 的連入'));
		unlinker.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, wgULS('正在取消 ', '正在取消 ') + pageName + wgULS(' 上的链入', ' 上的連入'));
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkBacklinks);
		});
	},
	unlinkBacklinks: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		if (!pageobj.exists()) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var text;
		if (params.title in Twinkle.batchdelete.unlinkCache) {
			text = Twinkle.batchdelete.unlinkCache[params.title];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.page(text);
		wikiPage.removeLink(params.page);

		text = wikiPage.getText();
		Twinkle.batchdelete.unlinkCache[params.title] = text;
		if (text === old_text) {
			// Nothing to do, return
			params.unlinker.workerSuccess(pageobj);
			return;
		}
		pageobj.setEditSummary(wgULS('取消到已删页面', '取消到已刪頁面') + params.page + wgULS('的链入', '的連入') + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	},
	unlinkImageInstancesMain: function(apiobj) {
		var xml = apiobj.responseXML;
		var pages = $(xml).find('iu').map(function() {
			return $(this).attr('title');
		}).get();
		if (!pages.length) {
			return;
		}

		var unlinker = new Morebits.batchOperation(wgULS('正在取消到 ', '正在取消到 ') + apiobj.params.page + wgULS(' 的链入', ' 的連入'));
		unlinker.setOption('chunkSize', Twinkle.getPref('batchdeleteChunks'));
		unlinker.setPageList(pages);
		unlinker.run(function(pageName) {
			var wikipedia_page = new Morebits.wiki.page(pageName, '取消 ' + pageName + wgULS(' 的文件使用', ' 的檔案使用'));
			var params = $.extend({}, apiobj.params);
			params.title = pageName;
			params.unlinker = unlinker;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.batchdelete.callbacks.unlinkImageInstances);
		});
	},
	unlinkImageInstances: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		if (!pageobj.exists()) {
			// we probably just deleted it, as a recursive backlink
			params.unlinker.workerSuccess(pageobj);
			return;
		}

		var image = params.page.replace(/^(?:Image|File):/, '');
		var text;
		if (params.title in Twinkle.batchdelete.unlinkCache) {
			text = Twinkle.batchdelete.unlinkCache[params.title];
		} else {
			text = pageobj.getPageText();
		}
		var old_text = text;
		var wikiPage = new Morebits.wikitext.page(text);
		wikiPage.commentOutImage(image, wgULS('因文件已删，故注解', '因檔案已刪，故註解'));

		text = wikiPage.getText();
		Twinkle.batchdelete.unlinkCache[params.title] = text;
		if (text === old_text) {
			pageobj.getStatusElement().error(wgULS('在 ', '在 ') + pageobj.getPageName() + wgULS(' 上取消文件 ', ' 上取消檔案 ') + image + wgULS(' 链接失败', ' 連結失敗'));
			params.unlinker.workerFailure(pageobj);
			return;
		}
		pageobj.setEditSummary(wgULS('移除已被删除文件', '移除已被刪除檔案') + image + wgULS('使用，因为：', '使用，因為：') + params.reason + Twinkle.getPref('deletionSummaryAd'));
		pageobj.setTags(Twinkle.getPref('revisionTags'));
		pageobj.setPageText(text);
		pageobj.setCreateOption('nocreate');
		pageobj.setMaxConflictRetries(10);
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	}
};
})(jQuery);


// </nowiki>
