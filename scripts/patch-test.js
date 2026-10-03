/* eslint-env node, es6 */

/**
 * Creates a file patch-test-loader.js with the necessary import statements
 * to test the changes made in a pull request or in the current working state
 *
 * How to use:
 * - Run `npm run patchtest` which generates patch-test-loader.js
 * - Set up a localhost server (such as by using server.js or by running
 *   php -S 127.0.0.1:5500) and load patch-test-loader.js in the wiki environment,
 *   using the browser console or the common.js page.
 * - You can provide a different port by running `npm run patchtest -- 1234`
 */

const fs = require('fs');
const {execSync} = require('child_process');

const port = isNaN(Number(process.argv[2])) ? '5500' : process.argv[2];
const server = 'http://127.0.0.1:' + port;

// find the last common commit between this branch and master, and get the list
// of files changed since that commit
try {
	let lastCommonCommit = execSync('git merge-base HEAD master').toString().trim();
	let changedFiles = execSync(`git diff ${lastCommonCommit} --name-only`).toString().split(/\r?\n/);
	createTestLoader(changedFiles);
} catch (err) {
	console.log(err.toString());
}

/** @param {string[]} changedFiles */
function createTestLoader(changedFiles) {

	let importsCount = 0; // for the message written to the console in the ends
	let importLine = function(file) {
		if (!changedFiles.includes(file)) {
			return '';
		}
		if (file.endsWith('.js')) {
			importsCount++;
			if (file.startsWith('src/modules/')) {
				return `mw.loader.getScript('${server}/${file}');`;
			}
			return `return mw.loader.getScript('${server}/${file}');`;
		} else if (file.endsWith('.css')) {
			importsCount++;
			return `mw.loader.load('${server}/${file}', 'text/css');`;
		}
		return '';
	};

	let jsLoaderSource = `// Wait for Twinkle gadget to load, so that we can then overwrite it
	mw.loader.using('ext.gadget.Twinkle').then(function() {
		${importLine('morebits.css')}
		${importLine('morebits.js')}

	}).then(function() {
		${importLine('twinkle.css')}
		${importLine('twinkle.js')}

	}).then(function() {
		${importLine('src/modules/twinkletag.js')}
		${importLine('src/modules/twinkletalkback.js')}
		${importLine('src/modules/twinklewelcome.js')}
		${importLine('src/modules/twinklearv.js')}
		${importLine('src/modules/twinklebatchdelete.js')}
		${importLine('src/modules/twinklebatchundelete.js')}
		${importLine('src/modules/twinkleblock.js')}
		${importLine('src/modules/twinkleclose.js')}
		${importLine('src/modules/twinkleconfig.js')}
		${importLine('src/modules/twinklecopyvio.js')}
		${importLine('src/modules/twinklediff.js')}
		${importLine('src/modules/twinklefluff.js')}
		${importLine('src/modules/twinkleimage.js')}
		${importLine('src/modules/twinkleprotect.js')}
		${importLine('src/modules/twinklespeedy.js')}
		${importLine('src/modules/twinklestub.js')}
		${importLine('src/modules/twinkleunlink.js')}
		${importLine('src/modules/twinklewarn.js')}
		${importLine('src/modules/twinklexfd.js')}
	});`.replace(/^\t/mg, '').replace(/^\s*$/mg, '');

	fs.writeFileSync('./scripts/patch-test-loader.js', jsLoaderSource, console.log);

	console.log(`Wrote import statements for ${importsCount} modified file${importsCount > 1 ? 's' : ''} to scripts/patch-test-loader.js`);
}
