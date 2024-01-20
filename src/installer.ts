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

import { HttpClient } from '@actions/http-client';
import { getInputs } from './input';
import { rcompare } from 'semver';
import { debug } from '@actions/core';
import { lazy } from '@noelware/utils';

const resolveDownloadUri = ({ version, os, arch }: Record<'version' | 'os' | 'arch', string>) =>
    `https://github.com/protocolbuffers/protobuf/releases/download/${version}/protoc-${version}-${os}${arch}.zip`;

const client = lazy(() => {
    const inputs = getInputs();
    return new HttpClient('Noelware/setup-protoc (https://github.com/Noelware/setup-protoc)', undefined, {
        headers: inputs.token !== undefined ? { Authorization: `Bearer ${inputs.token}` } : undefined
    });
});

export async function getVersion() {
    const { version } = getInputs();

    let versionToUse: string | undefined;
    if (version === 'latest') {
        const page1 = await queryProtocReleases();
        versionToUse = page1.at(0);
    } else if (version.endsWith('.x')) {
        let cursor = 0;
        let pages: any[];

        while ((pages = await queryProtocReleases(cursor))) {
            if (pages.find((s) => s.version === normalizeVersion(version))) {
                versionToUse = pages.find((s) => s.version === normalizeVersion(version));
                break;
            }

            cursor++;
        }
    } else {
        versionToUse = version;
    }

    return versionToUse;
}

export async function resolveDownloadUrl() {
    const version = await getVersion();
    if (version === undefined) {
        throw new Error('Was unable to resolve version from `version` action input');
    }

    let os: string | undefined = undefined,
        arch: string | undefined = undefined;

    const currentOs = process.platform;
    const currentArch = process.arch;

    switch (currentArch) {
        case 'arm64':
            arch = 'aarch_64';
            break;
        case 'ppc64':
            arch = 'ppcle_64';
            break;
        case 's390':
        case 's390x':
            arch = 's390_64';
            break;
        case 'x64':
            arch = 'x86_64';
            break;
        case 'ia32':
            arch = 'x86_32';
            break;
    }

    if (arch === undefined) throw new Error(`Architecture [${currentArch}] is not supported`);
    switch (currentOs) {
        case 'linux':
            os = 'linux';
            break;
        case 'darwin':
            os = 'osx';
            break;
        case 'win32':
            os = arch === 'x86_32' ? 'win32' : 'win64';
            break;
    }

    if (os === undefined) throw new Error(`Operating system [${currentOs}] is not supported`);
    return resolveDownloadUri({ version, os, arch: !os.startsWith('win') ? `-${arch}` : '' });
}

async function queryProtocReleases(page = 0) {
    debug(`resolving versions from [protocolbuffers/protoc]      {page=${page}}`);
    const inputs = getInputs();

    const http = client.get();
    const result = await http
        .getJson<
            any[]
        >(`https://api.github.com/repos/protocolbuffers/protobuf/releases?page=${page === 0 ? 1 : page++}`)
        .then((r) => r.result ?? []);

    return result
        .filter((tag) => tag.tag_name.match(/v\d+\.[\w\.]+/g))
        .filter((tag) => (inputs.includePrereleases ? true : tag.prerelease === false))
        .map((tag) => tag.tag_name)
        .sort((a, b) => rcompare(normalizeVersion(a), normalizeVersion(b)));
}

function normalizeVersion(v1: string) {
    const parts = v1.split('.');
    if (parts.length === 1) return `${parts[0]}.0.0`;
    if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;

    const inputs = getInputs();
    if (inputs.includePrereleases && ['beta', 'preview', 'rc'].some((i) => parts[2] === i)) {
        parts[2] = parts[2].replace('beta', '-beta').replace('rc', '-rc').replace('preview', '-preview');
        return parts.join('.');
    }

    return v1;
}
