// @vitest-environment node

import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

describe('TipWidget exports', () => {
  it('declares the default component used by checkout and creator pages', () => {
    const source = readFileSync(new URL('./TipWidget.jsx', import.meta.url), 'utf8');
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });

    const hasDefaultExport = ast.program.body.some(
      (node) => node.type === 'ExportDefaultDeclaration'
    );

    expect(hasDefaultExport).toBe(true);
  });
});
