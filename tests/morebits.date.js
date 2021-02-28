QUnit.module('Morebits.date');
// Allow off-by-one values in milliseconds for not-quite-simultaneous date contructions
QUnit.assert.pmOne = function(actual, expected, message) {
	this.pushResult({
		result: actual === expected || actual === expected+1 || actual === expected-1,
		actual: actual,
		expected: expected,
		message: message
	});
};

var now = Date.now();
var ts_mw = '2020年11月7日 (六) 16:26 (UTC)', ts_iso = '2020-11-07T16:26:00.000Z', naive = 20201107162600;
QUnit.test('Construction', assert => {
	// getTime and toISOString imply testing of inherited methods
	assert.pmOne(new Morebits.date().getTime(), new Date().getTime(), 'Basic constructor');

	assert.strictEqual(new Morebits.date(now).getTime(), new Date(now).getTime(), 'Constructor from timestring');
	assert.strictEqual(new Morebits.date(2020, 11, 7, 16, 26).getTime(), new Date(2020, 11, 7, 16, 26).getTime(), 'Constructor from parts');
	assert.strictEqual(new Morebits.date(ts_mw).toISOString(), ts_iso, 'zhWiki timestamp format');
	assert.strictEqual(new Morebits.date(naive).toISOString(), ts_iso, 'MediaWiki 14-digit number');
	assert.strictEqual(new Morebits.date(naive.toString()).toISOString(), ts_iso, 'MediaWiki 14-digit string');
	assert.strictEqual(new Morebits.date(parseInt(naive / 10, 10)).toISOString(), new Date(parseInt(naive / 10, 10)).toISOString(), 'native 13 digit');
	assert.strictEqual(new Morebits.date(naive * 10).toISOString(), new Date(naive * 10).toISOString(), 'native 15 digit');
});
var date = new Morebits.date(ts_mw);
QUnit.test('Methods', assert => {
	assert.true(date.isValid(), 'Valid');
	// Logs a message; not a failure, but annoying
	assert.false(new Morebits.date('no').isValid(), 'Invalid');

	// Ideally we would test the differences between UTC and non-UTC dates
	assert.strictEqual(date.getUTCDayName(), '星期六', 'getUTCDayName');
	assert.strictEqual(date.getUTCDayNameAbbrev(), '星期六', 'getUTCDayNameAbbrev');
	assert.strictEqual(date.getUTCMonthName(), '11月', 'getUTCMonthName');
	assert.strictEqual(date.getUTCMonthNameAbbrev(), '11月', 'getUTCMonthNameAbbrev');

	assert.true(new Morebits.date(now).isAfter(date), 'isAfter');
	assert.true(date.isBefore(new Date(now)), 'isBefore');
});
QUnit.test('RegEx headers', assert => {
	assert.strictEqual(date.monthHeader(), '== 2020年11月 ==', 'Month header default');
	assert.strictEqual(date.monthHeader(3), '=== 2020年11月 ===', 'Month header 3');
	assert.strictEqual(date.monthHeader(0), '2020年11月', 'Month header text');

	assert.true(date.monthHeaderRegex().test('==2020年11月=='), 'Header RegEx');
	assert.true(date.monthHeaderRegex().test('====2020年11月===='), 'Deeper');
	assert.true(date.monthHeaderRegex().test('== 2020年11月 =='), 'Shortened month');
	assert.false(date.monthHeaderRegex().test('=== 2020年11月 =='), 'Mismatched level');
	assert.false(date.monthHeaderRegex().test('==2020年12月=='), 'Wrong month');
});
QUnit.test('add/subtract', assert => {
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'day').toISOString(), '2020-11-08T16:26:00.000Z', 'Add 1 day');
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'DaY').toISOString(), '2020-11-08T16:26:00.000Z', 'Loudly add 1 day');
	assert.strictEqual(new Morebits.date(ts_mw).add('1', 'day').toISOString(), '2020-11-08T16:26:00.000Z', "Add 1 day but it's a string");
	assert.strictEqual(new Morebits.date(ts_mw).subtract(1, 'day').toISOString(), '2020-11-06T16:26:00.000Z', 'Subtract 1 day');
	assert.strictEqual(new Morebits.date(ts_mw).add(2, 'weeks').toISOString(), '2020-11-21T16:26:00.000Z', 'Add 2 weeks');
	assert.strictEqual(new Morebits.date(ts_mw).add(2, 'weeks').subtract(2, 'weeks').toISOString(), ts_iso, '2 weeks roundtrip'); // Note, this intentionally twice-crosses a US DST

	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'second').toISOString(), '2020-11-07T16:26:01.000Z', 'Add 1 second');
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'minute').toISOString(), '2020-11-07T16:27:00.000Z', 'Add 1 minute');
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'hour').toISOString(), '2020-11-07T17:26:00.000Z', 'Add 1 hour');
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'month').toISOString(), '2020-12-07T16:26:00.000Z', 'Add 1 month');
	assert.strictEqual(new Morebits.date(ts_mw).add(1, 'year').toISOString(), '2021-11-07T16:26:00.000Z', 'Add 1 year');

	assert.throws(() => new Morebits.date(ts_mw).add('forty-two'), 'throws: non-number provided');
	assert.throws(() => new Morebits.date(ts_mw).add(1), 'throws: no unit');
	assert.throws(() => new Morebits.date(ts_mw).subtract(1, 'dayo'), 'throws: bad unit');
});
QUnit.test('Formats', assert => {
	assert.strictEqual(new Morebits.date(now).format('YYYY-MM-DDTHH:mm:ss.SSSZ', 'utc'), new Date(now).toISOString(), 'ISO format');
	assert.strictEqual(date.format('dddd D MMMM YY h:mA', 'utc'), '星期六 7 11月 20 4:26下午', 'Some weirder stuff');
	assert.strictEqual(date.format('MMt[h month], [d]a[y] D, h [o\'clock] A', 'utc'), '11th month, day 7, 4 o\'clock 下午', 'Format escapes');
	assert.strictEqual(date.format('dddd D MMMM YY h:mA', 600), '星期日 8 11月 20 2:26上午', 'non-UTC formatting');
	assert.strictEqual(date.format('MMt[h month], [d]a[y] D, h [o\'clock] A', 600), '11th month, day 8, 2 o\'clock 上午', 'non-UTC escapes');
});
QUnit.test('Calendar', assert => {
	assert.strictEqual(date.calendar('utc'), '2020-11-07', 'Old calendar');
	assert.strictEqual(date.calendar(600), '2020-11-08', 'Old non-UTC');
	assert.strictEqual(new Morebits.date(now).calendar('utc'), '今天' + new Morebits.date(now).format('A hh:mm', 'utc'), 'New calendar');
	assert.strictEqual(new Morebits.date(now).subtract(1, 'day').calendar('utc'), '昨天' + new Morebits.date(now).format('A hh:mm', 'utc'), 'Close calendar');
});
