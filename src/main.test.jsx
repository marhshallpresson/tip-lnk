// @vitest-environment node

import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

describe('application router boot', () => {
  it('does not use the API origin as the BrowserRouter basename', () => {
    const source = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });

    let browserRouterElement = null;
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (
        node.type === 'JSXElement' &&
        node.openingElement.name?.type === 'JSXIdentifier' &&
        node.openingElement.name.name === 'BrowserRouter'
      ) {
        browserRouterElement = node;
        return;
      }

      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
      }
    };

    visit(ast);

    const basenameAttribute = browserRouterElement?.openingElement.attributes.find(
      (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'basename'
    );

    expect(basenameAttribute).toBeUndefined();
  });
});
