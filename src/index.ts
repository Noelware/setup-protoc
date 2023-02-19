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

import { addPath, endGroup, error, info, startGroup, warning } from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { downloadTool, find, extractZip, cacheDir } from '@actions/tool-cache';
import { getInputs } from './input';
import { Installer } from './installer';

async function main() {
    const inputs = getInputs();
    const installer = new Installer(inputs);
    const version = await installer.getVersion();
    const downloadUrl = await installer.resolveDownloadUrl();

    let toolPath = find('protoc', version);
    if (!toolPath) {
        startGroup('installing protoc...');
        {
            info(`Using download URL ${downloadUrl}`);
            toolPath = await downloadTool(downloadUrl, undefined, inputs.token).then((path) => extractZip(path));

            await cacheDir(toolPath, 'protoc', version);
        }
        endGroup();
    } else {
        info(`Found cached protoc toolchain in directory [${toolPath}]`);
    }

    await getExecOutput(`${toolPath}/protoc`, ['--version']);

    // Add it to the PATH
    addPath(toolPath);

    startGroup('Environment');
    {
        const { stdout, stderr } = await getExecOutput('protoc', ['--version']);
        startGroup('stdout');
        {
            info(stdout);
        }
        endGroup();

        if (stderr.length) {
            startGroup('stderr');
            {
                warning(stderr);
            }
            endGroup();
        }
    }
    endGroup();
}

main().catch((ex) => {
    console.error(ex);
    process.exit(1);
});
