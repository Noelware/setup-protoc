/*
 * 🐻‍❄️🔥 setup-protoc: GitHub action for setting up the Protocol Buffers compiler
 * Copyright (c) 2023-2024 Noelware, LLC. <team@noelware.org>
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

import { mkdir, writeFile } from 'node:fs/promises';
import * as log from './util/logging';
import { resolve } from 'node:path';
import { rimraf } from 'rimraf';
import ncc from '@vercel/ncc';

const top = [
    '/* eslint-ignore */',
    '//prettier-ignore',
    '',
    '/*',
    ' * 🐻‍❄️🔥 setup-protoc: GitHub action for setting up the Protocol Buffers compiler',
    ' * Copyright (c) 2023-2024 Noelware, LLC. <team@noelware.org>',
    ' *',
    ' * Permission is hereby granted, free of charge, to any person obtaining a copy',
    ' * of this software and associated documentation files (the "Software"), to deal',
    ' * in the Software without restriction, including without limitation the rights',
    ' * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
    ' * copies of the Software, and to permit persons to whom the Software is',
    ' * furnished to do so, subject to the following conditions:',
    ' *',
    ' * The above copyright notice and this permission notice shall be included in all',
    ' * copies or substantial portions of the Software.',
    ' *',
    ' * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    ' * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
    ' * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
    ' * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
    ' * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
    ' * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
    ' * SOFTWARE.',
    ' */',
    ''
].join('\n');

async function main() {
    log.startGroup('building `@noelware/setup-protoc`...');
    await rimraf(resolve(process.cwd(), 'build'));

    log.info('Building...');
    const result = await ncc(resolve(process.cwd(), 'src/index.ts'), {
        license: 'LICENSE',
        minify: true,
        cache: false
    });

    const took = result.stats.compilation.endTime - result.stats.compilation.startTime;
    log.info(`--> Build took ~${took}ms to complete`);

    await mkdir(resolve(process.cwd(), 'build'));
    await writeFile(resolve(process.cwd(), 'build/action.js'), top + result.code);

    for (const [file, { source }] of Object.entries(result.assets)) {
        await writeFile(resolve(process.cwd(), 'build', file), source);
    }

    log.endGroup();
}

main().catch((ex) => {
    log.error(ex);
    process.exit(1);
});
