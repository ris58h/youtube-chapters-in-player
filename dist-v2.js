import fs from 'fs'
import archiver from 'archiver'

if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist")
}

const name = process.env.npm_package_name
const manifest = readJsonSync("./extension/manifest.json")
const version = manifest.version
const output = fs.createWriteStream(`./dist/${name}-${version}-v2.zip`)
const archive = archiver("zip")
archive.pipe(output)
archive.glob("**/*", {
    cwd: "./extension",
    ignore: ["_metadata/**", "manifest.json", "rules.json"],
})
archive.append(JSON.stringify(patchManifest(manifest), null, 2), { name: "manifest.json" })
archive.append(backgroundPageContent(), { name: "background/background.html" })
archive.on("error", err => { throw err })
archive.finalize()

function readJsonSync(path) {
    const content = fs.readFileSync(path, "utf8")
    return JSON.parse(content)
}

function patchManifest(manifest) {
    return {
        ...manifest,
        "manifest_version": 2,
        "applications": {
            "gecko": {
                "id": "youtube-chapters-in-player@ris58h"
            }
        },
        "permissions": [
            "https://www.youtube.com/*",
            "webRequest",
            "webRequestBlocking"
        ],
        "host_permissions": undefined,
        "declarative_net_request": undefined,
        "background": {
            "page": "background/background.html"
        },
        "web_accessible_resources": [
            "background/youtubei.js"
        ],
    }
}

function backgroundPageContent() {
    return `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <script type="module" src="background.js"></script>
        </head>
        </html>`
}
