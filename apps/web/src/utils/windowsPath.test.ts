import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { explorerConnectorUrl, isWindowsPath } from './windowsPath';

describe('Windows shared paths', () => {
  for (const path of [
    String.raw`\\server\share`,
    String.raw`\\192.168.0.22\AI-Vault\Projects\Plan.pdf`,
    String.raw`\\nas\shared folder\Project A`,
    String.raw`C:\Projects\Project A`,
    String.raw`d:\Documents\brief.docx`,
  ]) {
    it(`accepts ${path}`, () => {
      assert.equal(isWindowsPath(path), true);
    });
  }

  for (const path of [
    String.raw`C:relative\file.txt`,
    String.raw`\\server`,
    String.raw`\\?\C:\Windows`,
    'https://server/share',
    '../shared',
    `${String.raw`\\server\share\file`}\n.exe`,
  ]) {
    it(`rejects ${path}`, () => {
      assert.equal(isWindowsPath(path), false);
    });
  }

  it('encodes the path as one protocol query value', () => {
    assert.equal(
      explorerConnectorUrl(String.raw`\\nas\Shared Folder\A&B`),
      'itsaplan-open://open?path=%5C%5Cnas%5CShared%20Folder%5CA%26B',
    );
  });
});
