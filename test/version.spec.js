const { expect } = require('chai');
const { fromDescribe } = require('../version');

describe('version: fromDescribe', () => {
  it('bare version on a clean tagged commit', () => {
    expect(fromDescribe('1.0.0-0-gfae9867\n')).to.equal('1.0.0');
  });

  it('dev version past the tag', () => {
    expect(fromDescribe('0.9.6-113-gfae9867')).to.equal('0.9.6+dev.113.fae9867');
  });

  it('dirty tree past the tag', () => {
    expect(fromDescribe('0.9.6-113-gfae9867-dirty')).to.equal('0.9.6+dev.113.fae9867.dirty');
  });

  it('dirty tagged commit is not the release', () => {
    expect(fromDescribe('1.0.0-0-gfae9867-dirty')).to.equal('1.0.0+dev.0.fae9867.dirty');
  });

  it('release candidate tags', () => {
    expect(fromDescribe('1.0.0-rc.1-0-gfae9867')).to.equal('1.0.0-rc.1');
    expect(fromDescribe('1.0.0-rc.1-4-gfae9867')).to.equal('1.0.0-rc.1+dev.4.fae9867');
  });

  it('hyphenated tags and hashes of any length', () => {
    expect(fromDescribe('1.0.0-beta-2-7-g0123456789ab')).to.equal('1.0.0-beta-2+dev.7.0123456789ab');
  });

  it('unparseable output', () => {
    expect(fromDescribe('')).to.equal(undefined);
    expect(fromDescribe('fae9867')).to.equal(undefined);
  });
});
