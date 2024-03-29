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

import { addPath, endGroup, info, startGroup, setOutput } from '@actions/core';
import { downloadTool, find, extractZip, cacheDir } from '@actions/tool-cache';
import { getExecOutput } from '@actions/exec';
import * as installer from './installer';
import { getInputs } from './input';

async function main() {
    const inputs = getInputs();
    const version = await installer.getVersion();
    const downloadUrl = await installer.resolveDownloadUrl();

    let toolPath = find('protoc', version!);
    if (!toolPath) {
        startGroup('installing protoc...');
        {
            info(`Using download URL ${downloadUrl}`);
            const path = await downloadTool(downloadUrl, undefined, inputs.token).then((path) => extractZip(path));

            toolPath = await cacheDir(path, 'protoc', version!);
        }

        endGroup();
    } else {
        info(`Found cached protoc toolchain in directory [${toolPath}]`);
    }

    setOutput('binary', `${toolPath}/bin/protoc`);
    addPath(`${toolPath}/bin`);

    startGroup('Environment');
    {
        const { stdout } = await getExecOutput('protoc', ['--version']);
        info(stdout);
    }

    endGroup();
}

main().catch((ex) => {
    console.error(ex);
    process.exit(1);
});
