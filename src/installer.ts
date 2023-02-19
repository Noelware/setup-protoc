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

import { debug, info } from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { rcompare } from 'semver';
import { Inputs } from './input';

export class Installer {
    #downloadUrl =
        'https://github.com/protocolbuffers/protobuf/releases/download/{{VERSION}}/protoc-{{OS}}-{{ARCH}}.zip';

    #includePrereleases?: boolean;
    #version: string;
    httpClient: HttpClient;

    constructor({ version, token, includePrereleases }: Inputs) {
        this.httpClient = new HttpClient(
            'Noelware/setup-protoc (+https://github.com/Noelware/setup-protoc)',
            undefined,
            {
                headers: token !== undefined ? { Authorization: `Bearer ${token}` } : {}
            }
        );

        this.#includePrereleases = includePrereleases;
        this.#version = version;
    }

    async getVersion() {
        info(`Resolving version ${this.#version}...`);

        let versionToUse: string | undefined;
        if (this.#version === 'latest') {
            versionToUse = (await this._resolveReleasesOfFirstPage()).at(0);
        } else if (this.#version.endsWith('.x')) {
            versionToUse = (await this._resolveAllVersions()).find((i) => i === this._normalize(this.#version));
        } else {
            versionToUse = this.#version;
        }

        if (versionToUse === undefined) {
            throw new Error(`Unable to resolve ${this.#version} into a valid version!`);
        }

        return versionToUse;
    }

    async resolveDownloadUrl() {
        info('Resolving download URL...');

        const versionToUse = await this.getVersion();
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
        return this.#downloadUrl.replace('{{VERSION}}', versionToUse).replace('{{OS}}', os).replace('{{ARCH}}', arch);
    }

    private async _resolveReleasesOfFirstPage() {
        debug("Resolving versions of protocolbuffers/protoc's first page of releases...");

        // We are only going to iterate over the results on the first page,
        // since the latest release will be always be the first one
        const result = await this.httpClient
            .getJson<Record<string, any>[]>(`https://api.github.com/repos/protocolbuffers/protobuf/releases`)
            .then((r) => r.result);

        return (result ?? [])
            .filter((tag) => tag.tag_name.match(/v\d+\.[\w\.]+/g))
            .filter((tag) =>
                this.#includePrereleases === true
                    ? this.#includePrereleases && tag.prerelease
                    : tag.prerelease === false
            )
            .map((tag) => tag.tag_name);
    }

    private async _resolveAllVersions() {
        debug('Resolving all versions of protocolbuffers/protoc');

        let more = true;
        let idx = 1;
        let releases: string[] = [];

        while (more) {
            const result = await this.httpClient
                .getJson<Record<string, any>[]>(
                    `https://api.github.com/repos/protocolbuffers/protobuf/releases?page=${idx}`
                )
                .then((r) => r.result || []);

            if (!result.length) {
                more = false;
                break;
            }

            releases = releases.concat(
                ...result
                    .filter((tag) => tag.tag_name.match(/v\d+\.[\w\.]+/g))
                    .filter((tag) =>
                        this.#includePrereleases === true
                            ? this.#includePrereleases && tag.prerelease
                            : tag.prerelease === false
                    )
                    .map((tag) => tag.tag_name)
            );
        }

        return releases.sort(rcompare);
    }

    private _normalize(version: string) {
        const parts = version.split('.');

        // resolve 2 -> 2.0.0
        if (parts.length === 1) return `${parts[0]}.0.0`;

        // resolve 2.1 -> 2.1.0
        if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;

        // Resolve pre-releases
        if (this.#includePrereleases === true && ['beta', 'preview', 'rc'].some((i) => parts[2] === i)) {
            parts[2] = parts[2].replace('beta', '-beta').replace('rc', '-rc').replace('preview', '-preview');
            return parts.join('.');
        }

        return version;
    }
}
