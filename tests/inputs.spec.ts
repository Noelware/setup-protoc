/*
 * 🐻‍❄️🔥 setup-protoc: GitHub action for setting up the Protocol Buffers compiler
 * Copyright (c) 2023 Noelware, LLC. <team@noelware.org>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { beforeEach, describe, expect, test } from 'vitest';

// @ts-ignore
import { getInputs } from '../src/input';

describe('Inputs', () => {
    beforeEach(() => {
        process.env = Object.keys(process.env).reduce((acc, curr) => {
            if (!curr.startsWith('INPUT_')) {
                acc[curr] = process.env[curr];
            }

            return acc;
        }, {});
    });

    test('resolve default inputs', () => {
        const inputs = getInputs();

        expect(inputs.includePrereleases).toBeFalsy();
        expect(inputs.token).toBeUndefined();
        expect(inputs.version).toBe('latest');
    });

    test('resolve custom inputs', () => {
        setInput('include-pre-releases', 'true');
        setInput('version', '3.x');
        setInput('repo-token', 'some random token');

        const inputs = getInputs();
        expect(inputs.includePrereleases).toBeTruthy();
        expect(inputs.token).not.toBeUndefined();
        expect(inputs.version).toBe('3.x');
    });
});

// See: https://github.com/actions/toolkit/blob/a1b068ec31a042ff1e10a522d8fdf0b8869d53ca/packages/core/src/core.ts#L89
function getInputName(name: string) {
    return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string) {
    process.env[getInputName(name)] = value;
}
