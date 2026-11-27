/**
 * Dose-response row highlight: bucket mapping, marker placement, and the note text.
 * Run: node scripts/test-dose-response-highlight.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

function loadScript(relativePath, context) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
}

const context = vm.createContext({
    console,
    document: {
        addEventListener() {},
        getElementById() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    },
    Chart: function Chart() {
        throw new Error('Chart should not be constructed in this test');
    }
});

loadScript('reviewers/assets/js/charts.js', context);
loadScript('reviewers/assets/js/analytics.js', context);

assert.strictEqual(context.doseResponseBucketIndex(2), 0);
assert.strictEqual(context.doseResponseBucketIndex(5), 3);
assert.strictEqual(context.doseResponseBucketIndex(11), 9);
assert.strictEqual(context.doseResponseBucketIndex(12), 10);
assert.strictEqual(context.doseResponseBucketIndex(15), 10);
assert.strictEqual(context.doseResponseBucketIndex(1), -1);
assert.strictEqual(context.doseResponseBucketIndex(0), -1);
assert.strictEqual(context.doseResponseBucketIndex(null), -1);
assert.strictEqual(context.doseResponseBucketIndex('nope'), -1);

const dataset = {};
const plotted = context.applyDoseResponseHighlight(dataset, 11, {
    bucketIndex: 3,
    severity: 2.4,
    color: '#3b82f6',
    label: 'Selected: Mar 1, 2026, AAAA1111, severity 2.4'
});
assert.strictEqual(plotted, true);
assert.strictEqual(dataset.data[3], 2.4);
assert.strictEqual(dataset.data.filter(value => value !== null).length, 1);
assert.strictEqual(dataset.pointRadius[3], 12);
assert.strictEqual(dataset.pointRadius[0], 0);
assert.strictEqual(dataset.pointBackgroundColor, '#3b82f6');
assert.strictEqual(dataset.label, 'Selected: Mar 1, 2026, AAAA1111, severity 2.4');

const cleared = context.applyDoseResponseHighlight(dataset, 11, null);
assert.strictEqual(cleared, false);
assert.ok(dataset.data.every(value => value === null));
assert.strictEqual(dataset.label, 'Selected trip');

assert.strictEqual(context.applyDoseResponseHighlight(dataset, 11, {
    bucketIndex: -1,
    severity: 2,
    color: '#111',
    label: 'nope'
}), false);
assert.strictEqual(context.applyDoseResponseHighlight(dataset, 11, {
    bucketIndex: 3,
    severity: null,
    color: '#111',
    label: 'nope'
}), false);

const onChart = context.describeDoseResponseSelection({
    dateStr: 'Mar 1, 2026',
    device: 'AAAA1111',
    points: 6,
    effectiveTz: 8,
    postLanding: false,
    bucketIndex: 6,
    severity: 1.5
});
assert.strictEqual(onChart.plottable, true);
assert.ok(onChart.note.includes('8 time zones'));
assert.ok(onChart.note.includes('1.5'));
assert.ok(onChart.note.includes('group averages'));
assert.strictEqual(onChart.summary, 'Selected: Mar 1, 2026, AAAA1111, severity 1.5');

const lowPoints = context.describeDoseResponseSelection({
    dateStr: 'Mar 2, 2026',
    device: 'CCCC3333',
    points: 0,
    effectiveTz: 4,
    postLanding: false,
    bucketIndex: 2,
    severity: 3.2
});
assert.strictEqual(lowPoints.plottable, true);
assert.ok(lowPoints.note.includes('not included in the average lines'));

const postLanding = context.describeDoseResponseSelection({
    dateStr: 'Mar 3, 2026',
    device: '4A473DF4',
    points: 9,
    effectiveTz: 5,
    postLanding: true,
    bucketIndex: 3,
    severity: 1.8
});
assert.ok(postLanding.note.includes('post-landing trips are grouped there'));

const offChart = context.describeDoseResponseSelection({
    dateStr: 'Mar 4, 2026',
    device: 'DDDD4444',
    points: 6,
    effectiveTz: 1,
    postLanding: false,
    bucketIndex: -1,
    severity: 3
});
assert.strictEqual(offChart.plottable, false);
assert.ok(offChart.note.startsWith('Not on the chart'));
assert.ok(offChart.note.includes('device DDDD4444 (6 points) has 1 time zone'));

const twelvePlus = context.describeDoseResponseSelection({
    dateStr: 'Mar 5, 2026',
    device: 'EEEE5555',
    points: 10,
    effectiveTz: 13,
    postLanding: false,
    bucketIndex: 10,
    severity: 2
});
assert.ok(twelvePlus.note.includes('12 or more time zones'));

console.log('dose-response highlight tests passed');
